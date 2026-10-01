// API panelu administratora: /api/admin/...
// Każde żądanie (poza logowaniem) wymaga ważnej sesji — sprawdzanej TUTAJ, po stronie serwera.

import { json, contactEmail, siteOrigin } from '../../_lib/http.js';
import { guardAdmin, login, clearSessionCookie, hasValidSession, authConfigured } from '../../_lib/auth.js';
import { ensureSchema, hasDb, uuid, nowIso, all, first, run, mediaUrl } from '../../_lib/db.js';
import { sendEmail, notifyAboutLead, emailConfigured } from '../../_lib/email.js';
import { normalizeUrl } from '../../_lib/validate.js';

const STATUSES = ['nowe', 'kontakt', 'w_realizacji', 'zakonczone', 'odrzucone'];
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_UPLOAD = 5 * 1024 * 1024;
const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

const LISTS = {
  faq: { table: 'faq_items', fields: { question: [1, 300], answer: [1, 5000] } },
  industries: { table: 'industries', fields: { name: [1, 80], description: [0, 600] } },
  capabilities: { table: 'capabilities', fields: { title: [1, 120], description: [0, 800], size: [1, 10, ['normal', 'wide']] } },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (msg) => new HttpError(400, msg);
const notFound = (msg = 'Nie znaleziono.') => new HttpError(404, msg);

const LABELS = { question: 'Pytanie', answer: 'Odpowiedź', name: 'Nazwa branży', description: 'Opis', title: 'Tytuł', size: 'Szerokość kafelka' };

function str(v, [min, max, allowed], label) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min) throw bad(`Pole „${label}” jest wymagane.`);
  if (s.length > max) throw bad(`Pole „${label}” może mieć maksymalnie ${max} znaków.`);
  if (allowed && !allowed.includes(s)) throw bad(`Nieprawidłowa wartość pola „${label}”.`);
  return s;
}
const bool = (v) => (v === true || v === 1 || v === '1' ? 1 : 0);
const checkId = (id) => {
  if (!ID_RE.test(String(id || ''))) throw notFound();
  return id;
};
async function body(request) {
  try {
    return await request.json();
  } catch {
    throw bad('Nieprawidłowe dane.');
  }
}

// Sprawdza „magiczne bajty” pliku — nie ufamy samemu rozszerzeniu ani nagłówkowi.
function sniff(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const seg = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const method = request.method;
  const route = `${method} /${seg.map((s) => (ID_RE.test(s) ? ':id' : s)).join('/')}`;

  try {
    // ---------- Bez sesji ----------
    if (route === 'POST /login') {
      if (!hasDb(env)) return json({ ok: false, message: 'Brak powiązania bazy D1 o nazwie DB.' }, 503);
      if (!authConfigured(env)) return json({ ok: false, message: 'Panel nie jest skonfigurowany: brak ADMIN_PASSWORD_HASH lub SESSION_SECRET.' }, 503);
      if (request.headers.get('X-Panel') !== '1') return json({ ok: false, message: 'Niedozwolone żądanie.' }, 403);
      const b = await body(request);
      return await login(context, b.password);
    }
    if (route === 'POST /logout') return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
    if (route === 'GET /session') {
      return json({
        ok: true,
        configured: { db: hasDb(env), media: Boolean(env.MEDIA), auth: authConfigured(env) },
        loggedIn: await hasValidSession(env, request),
      });
    }

    // ---------- Wymagana sesja administratora ----------
    const denied = await guardAdmin(context);
    if (denied) return denied;

    switch (route) {
      // ===== Stan konfiguracji =====
      case 'GET /status':
        return json({
          ok: true,
          db: hasDb(env),
          media: Boolean(env.MEDIA),
          turnstile: Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY),
          email: emailConfigured(env),
          notifyTo: contactEmail(env),
          notifyFrom: (env.NOTIFY_FROM || 'Strony AI Wrocław <onboarding@resend.dev>').trim(),
          siteUrl: (env.SITE_URL || '').trim() || null,
          ipSalt: Boolean(env.IP_HASH_SALT),
        });
      case 'POST /test-email': {
        const r = await sendEmail(env, {
          subject: 'Test powiadomień — Strony AI Wrocław',
          text: 'To jest wiadomość testowa z panelu administratora. Jeśli ją widzisz, powiadomienia o nowych zgłoszeniach działają.',
          html: '<p>To jest wiadomość testowa z panelu administratora.</p><p>Jeśli ją widzisz, powiadomienia o nowych zgłoszeniach działają.</p>',
        });
        return r.ok
          ? json({ ok: true, message: `Wysłano wiadomość testową na ${contactEmail(env)}. Sprawdź skrzynkę (także folder Spam).` })
          : json({ ok: false, message: r.error || 'Nie udało się wysłać wiadomości.' }, r.skipped ? 503 : 502);
      }

      // ===== Zgłoszenia =====
      case 'GET /leads':
        return json({
          ok: true,
          items: await all(env, `SELECT id, created_at, company_name, industry, contact_name, email, status, notification_status FROM leads ORDER BY created_at DESC LIMIT 1000`),
        });
      case 'GET /leads/:id': {
        const lead = await first(env, `SELECT * FROM leads WHERE id = ?`, checkId(seg[1]));
        if (!lead) throw notFound('Nie znaleziono zgłoszenia — mogło zostać usunięte.');
        const notes = await all(env, `SELECT id, body, created_at FROM lead_notes WHERE lead_id = ? ORDER BY created_at`, lead.id);
        return json({ ok: true, lead, notes });
      }
      case 'PATCH /leads/:id': {
        const b = await body(request);
        if (!STATUSES.includes(b.status)) throw bad('Nieprawidłowy status.');
        const r = await run(env, `UPDATE leads SET status = ?, updated_at = ? WHERE id = ?`, b.status, nowIso(), checkId(seg[1]));
        if (!r.meta.changes) throw notFound();
        return json({ ok: true });
      }
      case 'DELETE /leads/:id': {
        const id = checkId(seg[1]);
        await env.DB.batch([env.DB.prepare(`DELETE FROM lead_notes WHERE lead_id = ?`).bind(id), env.DB.prepare(`DELETE FROM leads WHERE id = ?`).bind(id)]);
        return json({ ok: true });
      }
      case 'POST /leads/:id/notes': {
        const b = await body(request);
        const text = str(b.body, [1, 5000], 'Notatka');
        const lead = await first(env, `SELECT id FROM leads WHERE id = ?`, checkId(seg[1]));
        if (!lead) throw notFound();
        const note = { id: uuid(), lead_id: lead.id, body: text, created_at: nowIso() };
        await run(env, `INSERT INTO lead_notes (id, lead_id, body, created_at) VALUES (?, ?, ?, ?)`, note.id, note.lead_id, note.body, note.created_at);
        return json({ ok: true, note });
      }
      case 'DELETE /notes/:id':
        await run(env, `DELETE FROM lead_notes WHERE id = ?`, checkId(seg[1]));
        return json({ ok: true });
      case 'POST /leads/:id/resend': {
        const lead = await first(env, `SELECT * FROM leads WHERE id = ?`, checkId(seg[1]));
        if (!lead) throw notFound();
        const r = await notifyAboutLead(env, lead, siteOrigin(env, request));
        return r.ok ? json({ ok: true, message: 'Powiadomienie zostało wysłane.' }) : json({ ok: false, message: r.error || 'Wysyłka nie powiodła się.' }, 502);
      }

      // ===== Treści strony =====
      case 'GET /content':
        return json({ ok: true, items: await all(env, `SELECT key, section, label, kind, value FROM site_content ORDER BY sort_order`) });
      case 'PUT /content': {
        const b = await body(request);
        if (!Array.isArray(b.items) || b.items.length > 200) throw bad('Nieprawidłowe dane.');
        const t = nowIso();
        const stmts = b.items.map((it) => {
          if (typeof it.key !== 'string' || typeof it.value !== 'string') throw bad('Nieprawidłowe dane.');
          if (it.value.length > 5000) throw bad('Tekst może mieć maksymalnie 5000 znaków.');
          return env.DB.prepare(`UPDATE site_content SET value = ?, updated_at = ? WHERE key = ?`).bind(it.value, t, it.key);
        });
        if (stmts.length) await env.DB.batch(stmts);
        return json({ ok: true });
      }

      // ===== Ustawienia =====
      case 'GET /settings':
        return json({ ok: true, settings: await first(env, `SELECT recruitment_open, contact_email FROM settings WHERE id = 1`) });
      case 'PUT /settings': {
        const b = await body(request);
        const sets = [];
        const vals = [];
        if ('recruitment_open' in b) {
          sets.push('recruitment_open = ?');
          vals.push(bool(b.recruitment_open));
        }
        if ('contact_email' in b) {
          const e = str(b.contact_email, [3, 254], 'E-mail');
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw bad('Podaj poprawny adres e-mail.');
          sets.push('contact_email = ?');
          vals.push(e);
        }
        if (!sets.length) throw bad('Brak zmian.');
        await run(env, `UPDATE settings SET ${sets.join(', ')}, updated_at = ? WHERE id = 1`, ...vals, nowIso());
        return json({ ok: true });
      }

      // ===== Zdjęcia =====
      case 'GET /media': {
        const items = await all(
          env,
          `SELECT m.*, (SELECT COUNT(*) FROM portfolio_images pi WHERE pi.media_id = m.id) AS used FROM media m ORDER BY created_at DESC`
        );
        return json({ ok: true, items: items.map((m) => ({ ...m, url: mediaUrl(m.kv_key) })) });
      }
      case 'POST /media': {
        if (!env.MEDIA) throw new HttpError(503, 'Brak powiązania magazynu KV o nazwie MEDIA (Settings → Bindings).');
        const form = await request.formData().catch(() => null);
        const file = form && form.get('file');
        if (!file || typeof file === 'string') throw bad('Wybierz plik zdjęcia.');
        if (file.size > MAX_UPLOAD) throw bad('Plik jest za duży (maksymalnie 5 MB).');
        const buf = await file.arrayBuffer();
        const type = sniff(new Uint8Array(buf.slice(0, 16)));
        if (!type || !TYPES[type]) throw bad('Niedozwolony typ pliku. Dozwolone: JPG, PNG, WebP.');
        const alt = str(form.get('alt'), [1, 300], 'Tekst alternatywny');
        const dim = (v) => {
          const n = parseInt(v, 10);
          return Number.isFinite(n) && n > 0 && n < 20000 ? n : null;
        };
        const id = uuid();
        const kvKey = `m/${id}.${TYPES[type]}`;
        await env.MEDIA.put(kvKey, buf, { metadata: { contentType: type } });
        const row = { id, kv_key: kvKey, content_type: type, alt, width: dim(form.get('width')), height: dim(form.get('height')), size_bytes: buf.byteLength, created_at: nowIso() };
        try {
          await run(env, `INSERT INTO media (id, kv_key, content_type, alt, width, height, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, row.id, row.kv_key, row.content_type, row.alt, row.width, row.height, row.size_bytes, row.created_at);
        } catch (e) {
          await env.MEDIA.delete(kvKey);
          throw e;
        }
        return json({ ok: true, item: { ...row, url: mediaUrl(kvKey), used: 0 } });
      }
      case 'PATCH /media/:id': {
        const b = await body(request);
        const r = await run(env, `UPDATE media SET alt = ? WHERE id = ?`, str(b.alt, [0, 300], 'Tekst alternatywny'), checkId(seg[1]));
        if (!r.meta.changes) throw notFound();
        return json({ ok: true });
      }
      case 'DELETE /media/:id': {
        const m = await first(env, `SELECT id, kv_key FROM media WHERE id = ?`, checkId(seg[1]));
        if (!m) throw notFound();
        await env.DB.batch([env.DB.prepare(`DELETE FROM portfolio_images WHERE media_id = ?`).bind(m.id), env.DB.prepare(`DELETE FROM media WHERE id = ?`).bind(m.id)]);
        if (env.MEDIA) await env.MEDIA.delete(m.kv_key);
        return json({ ok: true });
      }

      // ===== Portfolio =====
      case 'GET /portfolio':
        return json({
          ok: true,
          items: await all(env, `SELECT p.id, p.title, p.industry, p.status, p.sort_order, (SELECT COUNT(*) FROM portfolio_images pi WHERE pi.project_id = p.id) AS images FROM portfolio_projects p ORDER BY sort_order, created_at DESC`),
        });
      case 'GET /portfolio/:id': {
        const p = await first(env, `SELECT * FROM portfolio_projects WHERE id = ?`, checkId(seg[1]));
        if (!p) throw notFound('Nie znaleziono realizacji.');
        const images = await all(env, `SELECT m.* FROM portfolio_images pi JOIN media m ON m.id = pi.media_id WHERE pi.project_id = ? ORDER BY pi.sort_order`, p.id);
        return json({ ok: true, project: p, images: images.map((m) => ({ ...m, url: mediaUrl(m.kv_key) })) });
      }
      case 'POST /portfolio':
      case 'PUT /portfolio/:id': {
        const b = await body(request);
        const title = str(b.title, [1, 150], 'Nazwa realizacji');
        const industry = str(b.industry ?? '', [0, 100], 'Branża');
        const description = str(b.description ?? '', [0, 5000], 'Opis');
        const u = normalizeUrl(b.site_url || '');
        if (!u.ok) throw bad('Adres strony ma niepoprawny format.');
        const status = b.status === 'published' ? 'published' : 'draft';
        const imageIds = Array.isArray(b.image_ids) ? b.image_ids.slice(0, 30) : [];
        imageIds.forEach(checkId);
        const t = nowIso();
        const isNew = method === 'POST';
        const id = isNew ? uuid() : checkId(seg[1]);
        if (!isNew && !(await first(env, `SELECT id FROM portfolio_projects WHERE id = ?`, id))) throw notFound();
        if (imageIds.length) {
          const found = await all(env, `SELECT id FROM media WHERE id IN (${imageIds.map(() => '?').join(',')})`, ...imageIds);
          if (found.length !== new Set(imageIds).size) throw bad('Część wybranych zdjęć już nie istnieje. Odśwież stronę.');
        }
        const stmts = [
          isNew
            ? env.DB.prepare(`INSERT INTO portfolio_projects (id, title, industry, description, site_url, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`).bind(id, title, industry, description, u.value, status, t, t)
            : env.DB.prepare(`UPDATE portfolio_projects SET title = ?, industry = ?, description = ?, site_url = ?, status = ?, updated_at = ? WHERE id = ?`).bind(title, industry, description, u.value, status, t, id),
          env.DB.prepare(`DELETE FROM portfolio_images WHERE project_id = ?`).bind(id),
          ...[...new Set(imageIds)].map((mid, i) => env.DB.prepare(`INSERT INTO portfolio_images (project_id, media_id, sort_order) VALUES (?, ?, ?)`).bind(id, mid, (i + 1) * 10)),
        ];
        await env.DB.batch(stmts);
        return json({ ok: true, id });
      }
      case 'DELETE /portfolio/:id': {
        const id = checkId(seg[1]);
        await env.DB.batch([env.DB.prepare(`DELETE FROM portfolio_images WHERE project_id = ?`).bind(id), env.DB.prepare(`DELETE FROM portfolio_projects WHERE id = ?`).bind(id)]);
        return json({ ok: true });
      }
      case 'PUT /portfolio/order':
        return await saveOrder(env, 'portfolio_projects', await body(request));
    }

    // ===== Listy: FAQ, branże, możliwości =====
    if (seg[0] === 'list' && LISTS[seg[1]]) {
      const cfg = LISTS[seg[1]];
      const sub = seg.slice(2);
      const cols = Object.keys(cfg.fields);
      if (method === 'GET' && sub.length === 0) {
        return json({ ok: true, items: await all(env, `SELECT * FROM ${cfg.table} ORDER BY sort_order, created_at`) });
      }
      if (method === 'PUT' && sub[0] === 'order') return await saveOrder(env, cfg.table, await body(request));
      const readFields = (b) => cols.map((c) => str(b[c] ?? (cfg.fields[c][2] ? cfg.fields[c][2][0] : ''), cfg.fields[c], LABELS[c] || c));
      if (method === 'POST' && sub.length === 0) {
        const b = await body(request);
        const vals = readFields(b);
        const t = nowIso();
        const id = uuid();
        const max = await first(env, `SELECT COALESCE(MAX(sort_order), 0) AS m FROM ${cfg.table}`);
        await run(env, `INSERT INTO ${cfg.table} (id, ${cols.join(', ')}, sort_order, is_published, created_at, updated_at) VALUES (?, ${cols.map(() => '?').join(', ')}, ?, ?, ?, ?)`, id, ...vals, max.m + 10, bool(b.is_published ?? 1), t, t);
        return json({ ok: true, item: await first(env, `SELECT * FROM ${cfg.table} WHERE id = ?`, id) });
      }
      if (method === 'PUT' && sub.length === 1) {
        const b = await body(request);
        const vals = readFields(b);
        const id = checkId(sub[0]);
        const r = await run(env, `UPDATE ${cfg.table} SET ${cols.map((c) => `${c} = ?`).join(', ')}, is_published = ?, updated_at = ? WHERE id = ?`, ...vals, bool(b.is_published), nowIso(), id);
        if (!r.meta.changes) throw notFound();
        return json({ ok: true, item: await first(env, `SELECT * FROM ${cfg.table} WHERE id = ?`, id) });
      }
      if (method === 'DELETE' && sub.length === 1) {
        await run(env, `DELETE FROM ${cfg.table} WHERE id = ?`, checkId(sub[0]));
        return json({ ok: true });
      }
    }

    return json({ ok: false, message: 'Nieznana operacja.' }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ ok: false, message: e.message }, e.status);
    console.error('Błąd API panelu', e);
    const msg = String(e && e.message || '');
    if (/CHECK constraint|constraint failed/i.test(msg)) return json({ ok: false, message: 'Wartość nie spełnia wymagań (np. jest za długa).' }, 400);
    return json({ ok: false, message: 'Wystąpił błąd serwera. Spróbuj ponownie.' }, 500);
  }
}

async function saveOrder(env, table, b) {
  if (!Array.isArray(b.ids) || b.ids.length > 500) throw bad('Nieprawidłowe dane.');
  b.ids.forEach(checkId);
  if (b.ids.length) await env.DB.batch(b.ids.map((id, i) => env.DB.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).bind((i + 1) * 10, id)));
  return json({ ok: true });
}
