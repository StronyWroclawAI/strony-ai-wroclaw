// Baza danych Cloudflare D1 (powiązanie o nazwie DB).
// Schemat i treści początkowe tworzą się AUTOMATYCZNIE przy pierwszym użyciu —
// nie trzeba uruchamiać żadnych plików SQL ręcznie.

import { SEED } from './seed.js';

export const SCHEMA_VERSION = '20';

// Każda instrukcja w osobnym elemencie (D1 wykonuje je w jednej transakcji przez batch()).
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    recruitment_open INTEGER NOT NULL DEFAULT 1,
    contact_email TEXT NOT NULL DEFAULT 'stronyaiwroclaw@gmail.com',
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
  `CREATE TABLE IF NOT EXISTS portfolio_files (
    project_id TEXT NOT NULL, ver TEXT NOT NULL, path TEXT NOT NULL,
    kv_key TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, PRIMARY KEY (project_id, ver, path))`,
  `CREATE TABLE IF NOT EXISTS visit_days (day TEXT NOT NULL, path TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 0, uniques INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, path))`,
  `CREATE TABLE IF NOT EXISTS visit_seen (day TEXT NOT NULL, vh TEXT NOT NULL, path TEXT NOT NULL, PRIMARY KEY (day, vh, path))`,
  `CREATE TABLE IF NOT EXISTS visit_meta (day TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, kind, key))`,
  `CREATE TABLE IF NOT EXISTS lead_emails (
    id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'wlasna',
    to_email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent', error TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS lead_emails_lead_idx ON lead_emails (lead_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS logo_proposals (
    id TEXT PRIMARY KEY, lead_id TEXT NOT NULL UNIQUE, token TEXT NOT NULL UNIQUE,
    kv_key TEXT NOT NULL, file_name TEXT NOT NULL DEFAULT '', size_bytes INTEGER NOT NULL DEFAULT 0,
    options TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'nowa',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, opened_at TEXT, chosen_at TEXT,
    choice_option INTEGER, choice_name TEXT, choice_tagline TEXT, choice_notes TEXT, choice_accepted INTEGER NOT NULL DEFAULT 0)`,
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
  // v4: karty projektów w portfolio (pliki z ZIP-a)
  `ALTER TABLE portfolio_projects ADD COLUMN slug TEXT`,
  `ALTER TABLE portfolio_projects ADD COLUMN tags TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE portfolio_projects ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE portfolio_projects ADD COLUMN card_ver TEXT`,
  `ALTER TABLE portfolio_projects ADD COLUMN card_cover TEXT`,
  `ALTER TABLE portfolio_projects ADD COLUMN card_files INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE portfolio_projects ADD COLUMN card_size INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE portfolio_projects ADD COLUMN card_at TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS portfolio_slug_idx ON portfolio_projects (slug)`,
  // v5: poprawki administratora w briefie
  `ALTER TABLE briefs ADD COLUMN admin_edited_at TEXT`,
  // v8: podglądy opcji logo
  `ALTER TABLE logo_proposals ADD COLUMN scanned INTEGER NOT NULL DEFAULT 0`,
  // v10: SEO kart projektów — „dla kogo” (np. „warsztatu samochodowego”) do tytułu dla Google
  `ALTER TABLE portfolio_projects ADD COLUMN seo_for TEXT NOT NULL DEFAULT ''`,
  // v11: rodzaje briefu (pelny / strona / logo) i brief połączony z dwóch
  `ALTER TABLE briefs ADD COLUMN kind TEXT NOT NULL DEFAULT 'pelny'`,
  `ALTER TABLE briefs ADD COLUMN merged_at TEXT`,
  // v15: rodzaj strony w zgłoszeniu: firma (oferta) / wizerunkowa (klub, szkoła, organizacja)
  `ALTER TABLE leads ADD COLUMN site_purpose TEXT NOT NULL DEFAULT 'firma'`,
  // v16: pliki od klienta (logo, zdjęcia) — z briefu albo dodane w panelu
  `CREATE TABLE IF NOT EXISTS lead_files (
    id TEXT PRIMARY KEY, lead_id TEXT, brief_id TEXT, kind TEXT NOT NULL CHECK (kind IN ('logo','photo')),
    source TEXT NOT NULL DEFAULT 'klient', name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL DEFAULT 0,
    width INTEGER, height INTEGER, kv_key TEXT NOT NULL, has_thumb INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS lead_files_lead_idx ON lead_files (lead_id, kind, created_at)`,
  `CREATE INDEX IF NOT EXISTS lead_files_brief_idx ON lead_files (brief_id)`,
  // v17: aktualności (posty pisane w panelu, opcjonalnie z osadzeniem oryginału z Facebooka / Instagrama)
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY, title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 150),
    body TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 3000),
    published_on TEXT NOT NULL, media_id TEXT,
    link_url TEXT CHECK (link_url IS NULL OR (length(link_url) <= 500 AND link_url LIKE 'https://%')),
    embed INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS posts_pub_idx ON posts (status, published_on DESC)`,
  `ALTER TABLE settings ADD COLUMN posts_enabled INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE settings ADD COLUMN facebook_url TEXT`,
  `ALTER TABLE settings ADD COLUMN instagram_url TEXT`,
  // v19: warianty responsywne zdjęć z biblioteki (JSON: [{k,w,h,t,b}]). '[]' = zdjęcie wyświetlane jak dotychczas.
  `ALTER TABLE media ADD COLUMN variants TEXT NOT NULL DEFAULT '[]'`,
];

// v10 (SEO): stare teksty domyślne zamieniane na nowe — TYLKO gdy nie były zmieniane w panelu.
const CONTENT_UPDATES = [
  ['hero.lead', 'Projektuję i tworzę nowoczesne strony internetowe dla małych firm usługowych. Buduję portfolio, dlatego wybranym firmom wykonuję stronę bezpłatnie.'],
  ['benefits.title', 'Co zyskuje firma dzięki dobrej stronie'],
  ['process.title', 'Od pierwszej rozmowy do działającej strony'],
  ['portfolio.title', 'Realizacje'],
  // v11: portfolio w dwóch zakładkach — wstęp obejmuje też projekty demonstracyjne
  ['portfolio.intro', 'Strony przygotowane dla firm, które zgodziły się na ich prezentację.'],
  ['portfolio.intro', 'Strony przygotowane dla firm (za ich zgodą) oraz projekty demonstracyjne — kliknij, aby zobaczyć szczegóły.'],
  // v14: szkic znów wpisany w pole (bez przycisku „Wstaw gotowy szkic”)
  ['contact.message_hint', 'Napisz kilka zdań o firmie i stronie — możesz też wstawić gotowy szkic.'],
  // v13: szkic wiadomości jako podpowiedź
  ['contact.message_hint', 'Uzupełnij szkic albo napisz po swojemu — wystarczy kilka zdań.'],
  // v12: krótszy formularz zgłoszeniowy
  ['contact.message_hint', 'Poniżej jest gotowy szkic — uzupełnij go lub napisz po swojemu. Wystarczy kilka zdań: resztę ustalimy w krótkim briefie, który wyślę po pierwszym kontakcie.'],
];
// v18: adres e-mail marki zmieniony ze stronywroclawai@ na stronyaiwroclaw@ (gmail.com)
const EMAIL_CHANGES = [['stronywroclawai' + '@gmail.com', 'stronyaiwroclaw@gmail.com']];
// v20 (SEO, etap 1): nowe pytania FAQ dla istniejących baz. Dodawane JEDEN raz (znacznik faq_v20 w tabeli meta)
// i tylko wtedy, gdy pytania o tej treści jeszcze nie ma — pytań usuniętych później w panelu nie przywracamy.
// Liczba = pozycja na liście (domyślne pytania mają pozycje 10, 20, …, 110).
const FAQ_ADDED_V20 = [
  ['Ile kosztuje utrzymanie strony po uruchomieniu?', 35],
  ['Kto ma dostęp do strony i kont po uruchomieniu?', 36],
  ['Czy strona będzie przygotowana pod Google?', 75],
  ['Co dzieje się po 3 miesiącach bezpłatnych aktualizacji?', 85],
  ['Czy robisz strony tylko dla firm z Wrocławia?', 105],
];
// Pola usunięte ze strony (nadtytuł nad hasłem zastąpił nagłówek H1).
const CONTENT_REMOVED = ['hero.eyebrow'];

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
  const stmts = [db.prepare(`INSERT OR IGNORE INTO settings (id, recruitment_open, contact_email, updated_at) VALUES (1, 1, 'stronyaiwroclaw@gmail.com', ?)`).bind(t)];
  for (const c of SEED.content) {
    stmts.push(
      db
        .prepare(`INSERT OR IGNORE INTO site_content (key, section, label, kind, value, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(c.key, c.section, c.label, c.kind, c.value, c.sort_order, t)
    );
  }
  // Listy wstawiane tylko do pustych tabel. Jedna instrukcja na wiersz (D1 przyjmuje najwyżej 100 parametrów
  // w jednym zapytaniu). Warunek „w tabeli nie ma wierszy z innym created_at niż t” znaczy: tabela była pusta
  // przed tym uruchomieniem — kolejne wiersze tej samej listy (z tym samym t) nie blokują następnych.
  // Cała paczka wykonuje się w jednej transakcji, więc równoległy start drugiej instancji niczego nie zdubluje.
  const lists = [
    ['industries', ['name', 'description'], SEED.industries],
    ['capabilities', ['title', 'description', 'size'], SEED.capabilities],
    ['faq_items', ['question', 'answer'], SEED.faq],
  ];
  for (const [table, cols, rows] of lists) {
    const all = ['id', ...cols, 'sort_order', 'is_published', 'created_at', 'updated_at'];
    rows.forEach((r, i) => {
      stmts.push(
        db
          .prepare(
            `INSERT INTO ${table} (${all.join(', ')}) SELECT ${all.map(() => '?').join(', ')} WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE created_at <> ?)`
          )
          .bind(uuid(), ...cols.map((c) => r[c] ?? ''), (i + 1) * 10, 1, t, t, t)
      );
    });
  }
  for (const [question, sort] of FAQ_ADDED_V20) {
    const item = SEED.faq.find((f) => f.question === question);
    if (!item) continue;
    stmts.push(
      db
        .prepare(
          `INSERT INTO faq_items (id, question, answer, sort_order, is_published, created_at, updated_at)
           SELECT ?, ?, ?, ?, 1, ?, ? WHERE NOT EXISTS (SELECT 1 FROM faq_items WHERE question = ?) AND NOT EXISTS (SELECT 1 FROM meta WHERE key = 'faq_v20')`
        )
        .bind(uuid(), item.question, item.answer, sort, t, t, item.question)
    );
  }
  stmts.push(db.prepare(`INSERT OR IGNORE INTO meta (key, value) VALUES ('faq_v20', ?)`).bind(t));
  for (const [key, oldValue] of CONTENT_UPDATES) {
    const seed = SEED.content.find((c) => c.key === key);
    if (seed && seed.value !== oldValue) {
      stmts.push(db.prepare(`UPDATE site_content SET value = ?, updated_at = ? WHERE key = ? AND value = ?`).bind(seed.value, t, key, oldValue));
    }
  }
  for (const key of CONTENT_REMOVED) {
    if (!SEED.content.some((c) => c.key === key)) stmts.push(db.prepare(`DELETE FROM site_content WHERE key = ?`).bind(key));
  }
  // v18: zmiana adresu e-mail marki — stary adres zamieniany w ustawieniach i we wszystkich tekstach strony
  // (także w tekstach zmienionych w panelu). Inne adresy wpisane w panelu zostają bez zmian.
  for (const [oldEmail, newEmail] of EMAIL_CHANGES) {
    stmts.push(db.prepare(`UPDATE settings SET contact_email = ?, updated_at = ? WHERE lower(contact_email) = ?`).bind(newEmail, t, oldEmail));
    stmts.push(db.prepare(`UPDATE site_content SET value = REPLACE(value, ?, ?), updated_at = ? WHERE instr(value, ?) > 0`).bind(oldEmail, newEmail, t, oldEmail));
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
