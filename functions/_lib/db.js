// Baza danych Cloudflare D1 (powiązanie o nazwie DB).
// Schemat i treści początkowe tworzą się AUTOMATYCZNIE przy pierwszym użyciu —
// nie trzeba uruchamiać żadnych plików SQL ręcznie.

import { SEED } from './seed.js';

export const SCHEMA_VERSION = '3';

// Każda instrukcja w osobnym elemencie (D1 wykonuje je w jednej transakcji przez batch()).
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    recruitment_open INTEGER NOT NULL DEFAULT 1,
    contact_email TEXT NOT NULL DEFAULT 'stronywroclawai@gmail.com',
    updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY, section TEXT NOT NULL, label TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','long','lines')),
    value TEXT NOT NULL DEFAULT '' CHECK (length(value) <= 5000),
    sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS industries (
    id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
    description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 600),
    sort_order INTEGER NOT NULL DEFAULT 0, is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS capabilities (
    id TEXT PRIMARY KEY, title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
    description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 800),
    size TEXT NOT NULL DEFAULT 'normal' CHECK (size IN ('normal','wide')),
    sort_order INTEGER NOT NULL DEFAULT 0, is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS faq_items (
    id TEXT PRIMARY KEY, question TEXT NOT NULL CHECK (length(question) BETWEEN 1 AND 300),
    answer TEXT NOT NULL CHECK (length(answer) BETWEEN 1 AND 5000),
    sort_order INTEGER NOT NULL DEFAULT 0, is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY, kv_key TEXT NOT NULL UNIQUE, content_type TEXT NOT NULL,
    alt TEXT NOT NULL DEFAULT '' CHECK (length(alt) <= 300),
    width INTEGER, height INTEGER, size_bytes INTEGER, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS portfolio_projects (
    id TEXT PRIMARY KEY, title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 150),
    industry TEXT NOT NULL DEFAULT '' CHECK (length(industry) <= 100),
    description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
    site_url TEXT CHECK (site_url IS NULL OR (length(site_url) <= 500 AND (site_url LIKE 'http://%' OR site_url LIKE 'https://%'))),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS portfolio_images (
    project_id TEXT NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (project_id, media_id))`,
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY, submission_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    company_name TEXT NOT NULL CHECK (length(company_name) BETWEEN 1 AND 150),
    industry TEXT NOT NULL CHECK (length(industry) BETWEEN 1 AND 100),
    contact_name TEXT NOT NULL CHECK (length(contact_name) BETWEEN 1 AND 100),
    email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
    phone TEXT CHECK (phone IS NULL OR length(phone) <= 30),
    website_url TEXT CHECK (website_url IS NULL OR length(website_url) <= 500),
    facebook_url TEXT CHECK (facebook_url IS NULL OR length(facebook_url) <= 500),
    instagram_url TEXT CHECK (instagram_url IS NULL OR length(instagram_url) <= 500),
    message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 5000),
    status TEXT NOT NULL DEFAULT 'nowe' CHECK (status IN ('nowe','kontakt','w_realizacji','zakonczone','odrzucone')),
    notification_status TEXT NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending','sent','failed','skipped')),
    notification_error TEXT, notified_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS lead_notes (
    id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000), created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS lead_notes_lead_idx ON lead_notes (lead_id)`,
  `CREATE TABLE IF NOT EXISTS submission_log (ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS submission_log_idx ON submission_log (ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS login_attempts_idx ON login_attempts (ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS briefs (
    id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL CHECK (length(company_name) BETWEEN 1 AND 150),
    contact_email TEXT CHECK (contact_email IS NULL OR length(contact_email) <= 254),
    status TEXT NOT NULL DEFAULT 'nowy' CHECK (status IN ('nowy','w_trakcie','wyslany')),
    answers TEXT NOT NULL DEFAULT '{}' CHECK (length(answers) <= 200000),
    admin_note TEXT NOT NULL DEFAULT '' CHECK (length(admin_note) <= 5000),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, opened_at TEXT, submitted_at TEXT,
    notification_status TEXT)`,
  `CREATE INDEX IF NOT EXISTS briefs_created_idx ON briefs (created_at DESC)`,
];

// Kolumny dodane w kolejnych wersjach (ALTER TABLE nie ma „IF NOT EXISTS” w SQLite).
export const MIGRATIONS = [
  `ALTER TABLE briefs ADD COLUMN lead_id TEXT`,
  `ALTER TABLE leads ADD COLUMN source TEXT NOT NULL DEFAULT 'formularz'`,
  `CREATE INDEX IF NOT EXISTS briefs_lead_idx ON briefs (lead_id)`,
];

export const uuid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

let ready = null;

export function hasDb(env) {
  return Boolean(env && env.DB && typeof env.DB.prepare === 'function');
}

/** Tworzy tabele i treści początkowe, jeśli jeszcze nie istnieją (raz na instancję). */
export function ensureSchema(env) {
  if (!hasDb(env)) return Promise.reject(new Error('Brak powiązania bazy D1 o nazwie DB.'));
  if (!ready) {
    ready = init(env).catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

async function init(env) {
  const db = env.DB;
  try {
    const row = await db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).first();
    if (row && row.value === SCHEMA_VERSION) return;
  } catch {
    /* tabela meta jeszcze nie istnieje */
  }
  await db.batch(SCHEMA.map((s) => db.prepare(s)));

  // Uzupełnienia kolumn w istniejących tabelach (bezpieczne przy ponownym uruchomieniu)
  for (const sql of MIGRATIONS) {
    try {
      await db.prepare(sql).run();
    } catch (e) {
      if (!/duplicate column|already exists/i.test(String(e && e.message))) throw e;
    }
  }

  const t = nowIso();
  const stmts = [db.prepare(`INSERT OR IGNORE INTO settings (id, recruitment_open, contact_email, updated_at) VALUES (1, 1, 'stronywroclawai@gmail.com', ?)`).bind(t)];
  for (const c of SEED.content) {
    stmts.push(
      db
        .prepare(`INSERT OR IGNORE INTO site_content (key, section, label, kind, value, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(c.key, c.section, c.label, c.kind, c.value, c.sort_order, t)
    );
  }
  // Listy wstawiane tylko do pustych tabel (jedna instrukcja na listę — bezpieczne przy równoległym starcie)
  const lists = [
    ['industries', ['name', 'description'], SEED.industries],
    ['capabilities', ['title', 'description', 'size'], SEED.capabilities],
    ['faq_items', ['question', 'answer'], SEED.faq],
  ];
  for (const [table, cols, rows] of lists) {
    const all = ['id', ...cols, 'sort_order', 'is_published', 'created_at', 'updated_at'];
    const ph = `(${all.map(() => '?').join(', ')})`;
    const params = [];
    rows.forEach((r, i) => params.push(uuid(), ...cols.map((c) => r[c] ?? ''), (i + 1) * 10, 1, t, t));
    stmts.push(
      db
        .prepare(
          `INSERT INTO ${table} (${all.join(', ')}) SELECT * FROM (VALUES ${rows.map(() => ph).join(', ')}) WHERE NOT EXISTS (SELECT 1 FROM ${table})`
        )
        .bind(...params)
    );
  }
  stmts.push(db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)`).bind(SCHEMA_VERSION));
  await db.batch(stmts);
}

/** Pomocnik: wszystkie wiersze zapytania. */
export async function all(env, sql, ...params) {
  const r = await env.DB.prepare(sql).bind(...params).all();
  return r.results || [];
}
export async function first(env, sql, ...params) {
  return env.DB.prepare(sql).bind(...params).first();
}
export async function run(env, sql, ...params) {
  return env.DB.prepare(sql).bind(...params).run();
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function ipHash(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'brak';
  return (await sha256Hex(`${env.IP_HASH_SALT || 'strony-ai-wroclaw'}|${ip}`)).slice(0, 40);
}

export function mediaUrl(kvKey) {
  return `/media/${String(kvKey).replace(/^m\//, '')}`;
}
