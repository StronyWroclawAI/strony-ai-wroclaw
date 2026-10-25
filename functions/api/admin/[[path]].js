// API panelu administratora: /api/admin/...
// Każde żądanie (poza logowaniem) wymaga ważnej sesji — sprawdzanej TUTAJ, po stronie serwera.

import { json, contactEmail, siteOrigin } from '../../_lib/http.js';
import { guardAdmin, login, clearSessionCookie, hasValidSession, authConfigured, changePassword } from '../../_lib/auth.js';
import { ensureSchema, hasDb, uuid, nowIso, all, first, run, mediaUrl } from '../../_lib/db.js';
import { sendEmail, notifyAboutLead, emailConfigured, sendClientEmail } from '../../_lib/email.js';
import { gmailConfigured, gmailAddress } from '../../_lib/smtp.js';
import { normalizeUrl } from '../../_lib/validate.js';
import { newToken, cleanAnswers, BRIEF_KINDS } from '../../_lib/brief.js';
import { saveUpload, serveFile, deleteFileRow, publicFile } from '../../_lib/files.js';
import { readStats } from '../../_lib/stats.js';
import { profileUrl, embedInfo, socialKind } from '../../_lib/social.js';
import { VARIANT_NAMES, VARIANT_MAX_BYTES, variantKey, allVariantKeys, imageInfo, checkVariant, parseVariants, variantStatus, expectedVariants } from '../../_lib/media.js';
import { SLUG_RE, VER_RE, PATH_RE, MAX_FILE, MAX_TOTAL, MAX_FILES, CARD_TYPES, extOf, isImagePath, sniffOk, slugify, deleteCardFiles, cardUrl } from '../../_lib/card.js';

const STATUSES = ['nowe', 'kontakt', 'w_realizacji', 'zakonczone', 'odrzucone'];
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_UPLOAD = 5 * 1024 * 1024;
const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

const LISTS = {
  faq: { table: 'faq_items', fields: { question: [1, 300], answer: [1, 5000], mode: [1, 10, ['all', 'free', 'paid']] } },
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

const LABELS = { mode: 'Widoczne w trybie', question: 'Pytanie', answer: 'Odpowiedź', name: 'Nazwa branży', description: 'Opis', title: 'Tytuł', size: 'Szerokość kafelka' };

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const postOut = (p) => ({
  id: p.id, title: p.title, body: p.body, published_on: p.published_on, media_id: p.media_id || null,
  image: p.media_id && p.kv_key ? { url: mediaUrl(p.kv_key), alt: p.alt || '' } : null,
  link_url: p.link_url || null, embed: Boolean(p.embed), status: p.status, created_at: p.created_at, updated_at: p.updated_at,
  link_kind: socialKind(p.link_url), embeddable: Boolean(embedInfo(p.link_url)),
});
/** Walidacja posta z panelu. */
async function postInput(env, b) {
  const title = str(b.title, [1, 150], 'Tytuł');
  const text = typeof b.body === 'string' ? b.body.replace(/\r\n?/g, '\n').trim() : '';
  if (text.length > 3000) throw bad('Treść posta może mieć maksymalnie 3000 znaków.');
  const day = String(b.published_on || '').trim();
  if (!DATE_RE.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) throw bad('Podaj datę posta.');
  let media_id = b.media_id ? String(b.media_id) : null;
  if (media_id) {
    if (!ID_RE.test(media_id) || !(await first(env, `SELECT id FROM media WHERE id = ?`, media_id))) throw bad('Wybrane zdjęcie nie istnieje w bibliotece.');
  }
  let link_url = null;
  if (b.link_url && String(b.link_url).trim()) {
    const r = normalizeUrl(b.link_url);
    if (!r.ok) throw bad('Podaj poprawny adres linku, np. https://www.facebook.com/…');
    link_url = r.value.replace(/^http:/, 'https:');
  }
  const embed = bool(b.embed) && link_url && embedInfo(link_url) ? 1 : 0;
  if (bool(b.embed) && !embed) throw bad('Osadzić można tylko link do konkretnego posta z Facebooka lub Instagrama (np. https://www.instagram.com/p/…).');
  const status = b.status === 'published' ? 'published' : 'draft';
  if (!text && !media_id && !embed) throw bad('Dodaj treść, zdjęcie albo osadzenie oryginalnego posta.');
  return { title, body: text, published_on: day, media_id, link_url, embed, status };
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
          gmail: gmailConfigured(env),
          gmailUser: gmailConfigured(env) ? gmailAddress(env) : null,
          resend: Boolean(env.RESEND_API_KEY),
          notifyTo: contactEmail(env),
          notifyFrom: (env.NOTIFY_FROM || 'Strony AI Wrocław <onboarding@resend.dev>').trim(),
          siteUrl: (env.SITE_URL || '').trim() || null,
          ipSalt: Boolean(env.IP_HASH_SALT),
        });
      case 'GET /stats':
        return json({ ok: true, stats: await readStats(env, new URL(request.url).searchParams.get('days')) });
      case 'POST /password': {
        const b = await body(request);
        const r = await changePassword(env, b.current, b.next);
        if (!r.ok) return json({ ok: false, message: r.message }, r.status);
        return json({ ok: true, message: 'Hasło zostało zmienione.' }, 200, { 'Set-Cookie': r.cookie });
      }
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
          items: await all(
            env,
            `SELECT l.id, l.created_at, l.company_name, l.industry, l.contact_name, l.email, l.status, l.notification_status, l.source, l.site_purpose,
                    (SELECT b.status FROM briefs b WHERE b.lead_id = l.id ORDER BY b.created_at DESC LIMIT 1) AS brief_status,
                    (SELECT lp.status FROM logo_proposals lp WHERE lp.lead_id = l.id) AS logo_status
             FROM leads l ORDER BY l.created_at DESC LIMIT 1000`
          ),
        });
      case 'GET /leads/:id': {
        const lead = await first(env, `SELECT * FROM leads WHERE id = ?`, checkId(seg[1]));
        if (!lead) throw notFound('Nie znaleziono zgłoszenia — mogło zostać usunięte.');
        const notes = await all(env, `SELECT id, body, created_at FROM lead_notes WHERE lead_id = ? ORDER BY created_at`, lead.id);
        const briefs = await all(env, `SELECT * FROM briefs WHERE lead_id = ? ORDER BY created_at`, lead.id);
        for (const br of briefs) {
          try {
            br.answers = JSON.parse(br.answers || '{}');
          } catch {
            br.answers = {};
          }
        }
        const brief = briefs.length ? briefs[briefs.length - 1] : null;
        const logo = await first(env, `SELECT * FROM logo_proposals WHERE lead_id = ?`, lead.id);
        if (logo) {
          try {
            logo.options = JSON.parse(logo.options || '[]');
          } catch {
            logo.options = [];
          }
        }
        const emails = await all(env, `SELECT id, kind, to_email, subject, body, status, error, created_at FROM lead_emails WHERE lead_id = ? ORDER BY created_at DESC LIMIT 100`, lead.id);
        const files = (await all(env, `SELECT * FROM lead_files WHERE lead_id = ? ORDER BY kind, created_at`, lead.id)).map(publicFile);
        return json({ ok: true, lead, notes, brief: brief || null, briefs, files, logo: logo || null, emails, mail: { gmail: gmailConfigured(env), from: gmailConfigured(env) ? gmailAddress(env) : null } });
      }
      case 'PATCH /leads/:id': {
        const b = await body(request);
        const id = checkId(seg[1]);
        if (b.status !== undefined && b.company_name === undefined) {
          if (!STATUSES.includes(b.status)) throw bad('Nieprawidłowy status.');
          const r = await run(env, `UPDATE leads SET status = ?, updated_at = ? WHERE id = ?`, b.status, nowIso(), id);
          if (!r.meta.changes) throw notFound();
          return json({ ok: true });
        }
        // Poprawienie danych zgłoszenia (np. błędny adres e-mail)
        const old = await first(env, `SELECT email FROM leads WHERE id = ?`, id);
        if (!old) throw notFound();
        const company = str(b.company_name, [1, 150], 'Nazwa firmy');
        const contact = str(b.contact_name, [1, 100], 'Osoba kontaktowa');
        const email = str(b.email, [3, 254], 'E-mail').toLowerCase();
        if (!/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(email)) throw bad('Podaj poprawny adres e-mail, np. jan@firma.pl.');
        const industry = str(b.industry || 'Nie podano', [1, 100], 'Branża');
        const phone = str(b.phone || '', [0, 30], 'Telefon') || null;
        if (phone && (!/^[0-9+()\-\s]{7,30}$/.test(phone) || phone.replace(/\D/g, '').length < 7)) throw bad('Podaj poprawny numer telefonu.');
        const urls = {};
        for (const [k, label] of [['website_url', 'Obecna strona'], ['facebook_url', 'Facebook'], ['instagram_url', 'Instagram']]) {
          const u = normalizeUrl(b[k] || '');
          if (!u.ok) throw bad(`Pole „${label}” ma niepoprawny adres.`);
          urls[k] = u.value;
        }
        const message = str(b.message, [1, 5000], 'Opis / oczekiwania');
        const purpose = b.site_purpose === 'wizerunkowa' ? 'wizerunkowa' : 'firma';
        const t = nowIso();
        await env.DB.batch([
          env.DB.prepare(`UPDATE leads SET company_name = ?, industry = ?, contact_name = ?, email = ?, phone = ?, website_url = ?, facebook_url = ?, instagram_url = ?, message = ?, site_purpose = ?, updated_at = ? WHERE id = ?`).bind(company, industry, contact, email, phone, urls.website_url, urls.facebook_url, urls.instagram_url, message, purpose, t, id),
          // adres do wysyłki briefu idzie za zgłoszeniem (odpowiedzi klienta w briefie zostają bez zmian)
          env.DB.prepare(`UPDATE briefs SET contact_email = ?, updated_at = ? WHERE lead_id = ? AND (contact_email IS NULL OR contact_email = ?)`).bind(email, t, id, old.email),
        ]);
        return json({ ok: true });
      }
      case 'DELETE /leads/:id': {
        const id = checkId(seg[1]);
        const oldLogo = await first(env, `SELECT kv_key FROM logo_proposals WHERE lead_id = ?`, id);
        if (oldLogo && env.MEDIA) await env.MEDIA.delete(oldLogo.kv_key);
        for (const f of await all(env, `SELECT * FROM lead_files WHERE lead_id = ?`, id)) await deleteFileRow(env, f);
        await env.DB.batch([
          env.DB.prepare(`DELETE FROM lead_notes WHERE lead_id = ?`).bind(id),
          env.DB.prepare(`DELETE FROM briefs WHERE lead_id = ?`).bind(id),
          env.DB.prepare(`DELETE FROM lead_emails WHERE lead_id = ?`).bind(id),
          env.DB.prepare(`DELETE FROM logo_proposals WHERE lead_id = ?`).bind(id),
          env.DB.prepare(`DELETE FROM leads WHERE id = ?`).bind(id),
        ]);
        return json({ ok: true });
      }
      // ----- Pliki od klienta (logo, zdjęcia) -----
      case 'POST /leads/:id/files': {
        const lead = await first(env, `SELECT id FROM leads WHERE id = ?`, checkId(seg[1]));
        if (!lead) throw notFound();
        let form;
        try {
          form = await request.formData();
        } catch {
          throw bad('Nieprawidłowe dane pliku.');
        }
        const r = await saveUpload(env, { leadId: lead.id, briefId: null, source: 'admin', form });
        if (!r.ok) throw new HttpError(r.status, r.message);
        return json({ ok: true, file: r.file }, 201);
      }
      case 'GET /files/:id': {
        const row = await first(env, `SELECT * FROM lead_files WHERE id = ?`, checkId(seg[1]));
        if (!row) throw notFound('Nie znaleziono pliku.');
        const sp = new URL(request.url).searchParams;
        return serveFile(env, row, { thumb: sp.get('thumb') === '1', download: sp.get('download') === '1' });
      }
      case 'DELETE /files/:id': {
        const row = await first(env, `SELECT * FROM lead_files WHERE id = ?`, checkId(seg[1]));
        if (!row) throw notFound('Nie znaleziono pliku.');
        await deleteFileRow(env, row);
        return json({ ok: true });
      }
      // ----- E-mail do klienta (z konta Gmail) -----
      case 'POST /leads/:id/email': {
        if (!gmailConfigured(env)) throw new HttpError(503, 'Wysyłka z Gmaila nie jest skonfigurowana. Dodaj w Cloudflare zmienne GMAIL_USER i GMAIL_APP_PASSWORD (instrukcja: docs/EMAIL.md).');
        const lead = await first(env, `SELECT id, email, company_name FROM leads WHERE id = ?`, checkId(seg[1]));
        if (!lead) throw notFound();
        const b = await body(request);
        const subject = str(b.subject, [3, 200], 'Temat');
        const text = typeof b.body === 'string' ? b.body.replace(/\r\n?/g, '\n').trim() : '';
        if (text.length < 10) throw bad('Treść wiadomości jest za krótka.');
        if (text.length > 10000) throw bad('Treść wiadomości może mieć maksymalnie 10 000 znaków.');
        const kind = ['brief', 'logo', 'wlasna'].includes(b.kind) ? b.kind : 'wlasna';
        const recent = await first(env, `SELECT COUNT(*) AS n FROM lead_emails WHERE created_at > ?`, new Date(Date.now() - 3600 * 1000).toISOString());
        if (recent.n >= 40) throw new HttpError(429, 'Limit 40 wiadomości na godzinę (ochrona konta Gmail). Spróbuj później.');
        const r = await sendClientEmail(env, { to: lead.email, subject, text });
        const row = { id: uuid(), lead_id: lead.id, kind, to_email: lead.email, subject, body: text, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : String(r.error || '').slice(0, 500), created_at: nowIso() };
        await run(env, `INSERT INTO lead_emails (id, lead_id, kind, to_email, subject, body, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, row.id, row.lead_id, row.kind, row.to_email, row.subject, row.body, row.status, row.error, row.created_at);
        if (!r.ok) return json({ ok: false, message: `Nie wysłano: ${r.error}`, item: row }, 502);
        return json({ ok: true, item: row, message: `Wysłano do ${lead.email}.` });
      }

      // ----- Propozycje logo i hasła (strona wyboru dla klienta) -----
      case 'PUT /leads/:id/logo': {
        if (!env.MEDIA) throw new HttpError(503, 'Brak powiązania magazynu KV o nazwie MEDIA (Settings → Bindings).');
        const lead = await first(env, `SELECT id FROM leads WHERE id = ?`, checkId(seg[1]));
        if (!lead) throw notFound();
        const qs = new URL(request.url).searchParams;
        const fileName = String(qs.get('name') || 'wybor-logo.html').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100);
        if (!/\.html?$/i.test(fileName)) throw bad('Wgraj plik HTML (np. wybor-logo.html).');
        const buf = await request.arrayBuffer();
        if (buf.byteLength < 200) throw bad('Plik jest pusty albo za krótki.');
        if (buf.byteLength > 8 * 1024 * 1024) throw bad('Plik jest za duży (maksymalnie 8 MB). Zmniejsz osadzone grafiki.');
        const head = new TextDecoder().decode(buf.slice(0, 2000)).toLowerCase();
        if (!head.includes('<html') && !head.includes('<!doctype html')) throw bad('To nie wygląda na plik HTML.');
        // Opcje do formularza wyboru (odczytane z pliku w panelu) — maks. 8 opcji, po 6 haseł
        let options = [];
        try {
          const raw = JSON.parse(qs.get('options') || '[]');
          if (Array.isArray(raw)) {
            options = raw.slice(0, 8).map((o, i) => ({
              nr: i + 1,
              name: String((o && o.name) || '').replace(/\s+/g, ' ').trim().slice(0, 80),
              taglines: Array.isArray(o && o.taglines) ? o.taglines.slice(0, 6).map((t) => String(t).replace(/\s+/g, ' ').trim().slice(0, 120)).filter(Boolean) : [],
            }));
          }
        } catch {
          options = [];
        }
        if (!options.length) options = [1, 2, 3, 4].map((nr) => ({ nr, name: '', taglines: [] }));
        const old = await first(env, `SELECT id, kv_key FROM logo_proposals WHERE lead_id = ?`, lead.id);
        const kvKey = `lp/${lead.id}/${newToken().slice(0, 16)}.html`;
        await env.MEDIA.put(kvKey, buf, { metadata: { contentType: 'text/html; charset=utf-8' } });
        const t = nowIso();
        const token = newToken();
        await env.DB.batch([
          env.DB.prepare(`DELETE FROM logo_proposals WHERE lead_id = ?`).bind(lead.id),
          env.DB.prepare(`INSERT INTO logo_proposals (id, lead_id, token, kv_key, file_name, size_bytes, options, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'nowa', ?, ?)`).bind(uuid(), lead.id, token, kvKey, fileName, buf.byteLength, JSON.stringify(options), t, t),
        ]);
        if (old) await env.MEDIA.delete(old.kv_key);
        return json({ ok: true, token, options });
      }
      case 'PATCH /leads/:id/logo': {
        // Podglądy opcji (SVG) i nazwy — odczytane z pliku w panelu. Link i wybór klienta zostają bez zmian.
        const id = checkId(seg[1]);
        const lp = await first(env, `SELECT id, options FROM logo_proposals WHERE lead_id = ?`, id);
        if (!lp) throw notFound('To zgłoszenie nie ma propozycji logo.');
        const raw = await request.text();
        if (raw.length > 700000) throw bad('Podglądy opcji są za duże.');
        let b;
        try {
          b = JSON.parse(raw);
        } catch {
          throw bad('Nieprawidłowe dane.');
        }
        let cur = [];
        try {
          cur = JSON.parse(lp.options || '[]');
        } catch {
          cur = [];
        }
        const incoming = Array.isArray(b.options) ? b.options.slice(0, 8) : [];
        const count = Math.max(cur.length, incoming.length);
        const options = [];
        for (let i = 0; i < count; i++) {
          const c = cur[i] || {};
          const n = incoming[i] || {};
          const svg = typeof n.svg === 'string' && /^<svg[\s>]/i.test(n.svg.trim()) && n.svg.length <= 120000 ? n.svg.trim() : '';
          options.push({
            nr: i + 1,
            name: String(c.name || n.name || '').replace(/\s+/g, ' ').trim().slice(0, 80),
            taglines: Array.isArray(c.taglines) && c.taglines.length ? c.taglines : Array.isArray(n.taglines) ? n.taglines.slice(0, 6).map((x) => String(x).replace(/\s+/g, ' ').trim().slice(0, 120)).filter(Boolean) : [],
            ...(svg ? { svg } : c.svg ? { svg: c.svg } : {}),
          });
        }
        await run(env, `UPDATE logo_proposals SET options = ?, scanned = 1, updated_at = ? WHERE id = ?`, JSON.stringify(options), nowIso(), lp.id);
        return json({ ok: true, options });
      }
      case 'DELETE /leads/:id/logo': {
        const id = checkId(seg[1]);
        const old = await first(env, `SELECT kv_key FROM logo_proposals WHERE lead_id = ?`, id);
        if (old && env.MEDIA) await env.MEDIA.delete(old.kv_key);
        await run(env, `DELETE FROM logo_proposals WHERE lead_id = ?`, id);
        return json({ ok: true });
      }
      case 'POST /leads': {
        // Ręczne dodanie zgłoszenia (np. kontakt nawiązany mailowo, poza formularzem)
        const b = await body(request);
        const company = str(b.company_name, [1, 150], 'Nazwa firmy');
        const contact = str(b.contact_name, [1, 100], 'Osoba kontaktowa');
        const email = str(b.email, [3, 254], 'E-mail').toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw bad('Podaj poprawny adres e-mail.');
        const industry = str(b.industry || 'Nie podano', [1, 100], 'Branża');
        const phone = str(b.phone || '', [0, 30], 'Telefon') || null;
        const site = normalizeUrl(b.website_url || '');
        if (!site.ok) throw bad('Adres strony ma niepoprawny format.');
        const message = str(b.message || 'Kontakt nawiązany mailowo.', [1, 5000], 'Opis');
        const t = nowIso();
        const id = uuid();
        await run(
          env,
          `INSERT INTO leads (id, submission_id, created_at, updated_at, company_name, industry, contact_name, email, phone, website_url, message, status, notification_status, source, site_purpose)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'kontakt', 'skipped', 'reczne', ?)`,
          id, uuid(), t, t, company, industry, contact, email, phone, site.value, message, b.site_purpose === 'wizerunkowa' ? 'wizerunkowa' : 'firma'
        );
        return json({ ok: true, id });
      }
      case 'POST /leads/:id/brief': {
        // Brief przypięty do zgłoszenia — wstępnie wypełniony danymi ze zgłoszenia
        const lead = await first(env, `SELECT * FROM leads WHERE id = ?`, checkId(seg[1]));
        if (!lead) throw notFound();
        const rb = await body(request).catch(() => ({}));
        const kind = BRIEF_KINDS.includes(rb && rb.kind) ? rb.kind : 'pelny';
        // Jeden brief danego rodzaju na zgłoszenie (połączony brief to osobna pozycja)
        const existing = await first(env, `SELECT id, token, status, kind FROM briefs WHERE lead_id = ? AND kind = ? AND merged_at IS NULL ORDER BY created_at DESC LIMIT 1`, lead.id, kind);
        if (existing) return json({ ok: true, item: existing, existed: true });
        const pre = {
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          contact_email: lead.email,
          industry: String(lead.industry || '').replace(/^Inna:\s*/, ''),
          site_purpose: lead.site_purpose === 'wizerunkowa' ? 'wizerunkowa' : 'firma',
          languages: ['pl'],
        };
        if (lead.phone) pre.contact_phone = lead.phone;
        if (lead.website_url) {
          pre.current_site = 'tak_zastapic';
          pre.current_site_url = lead.website_url;
        }
        const social = [];
        const links = [];
        if (lead.facebook_url) { social.push('facebook'); links.push(lead.facebook_url); }
        if (lead.instagram_url) { social.push('instagram'); links.push(lead.instagram_url); }
        if (social.length) { pre.social = social; pre.social_links = links.join('\n'); }
        if (pre.industry === 'Nie podano') delete pre.industry;
        if (kind === 'logo') {
          // brief logo: tylko dane firmy i kontaktu
          for (const k of ['languages', 'current_site', 'current_site_url', 'social', 'social_links']) delete pre[k];
          // brief „Logo i hasło” = klient prosi o projekt logo i hasła (bez dodatkowego pytania)
          pre.logo = 'zrobic';
          pre.tagline = 'propozycja';
        }
        const t = nowIso();
        const item = { id: uuid(), token: newToken(), status: 'nowy', kind };
        await run(
          env,
          `INSERT INTO briefs (id, token, company_name, contact_email, status, answers, created_at, updated_at, lead_id, kind) VALUES (?, ?, ?, ?, 'nowy', ?, ?, ?, ?, ?)`,
          item.id, item.token, lead.company_name, lead.email, JSON.stringify(pre), t, t, lead.id, kind
        );
        return json({ ok: true, item });
      }
      case 'POST /leads/:id/brief/merge': {
        // Połączony brief (strona + logo) — odpowiedzi łączy panel, tu tylko zapis jako pełny, wypełniony brief
        const lead = await first(env, `SELECT * FROM leads WHERE id = ?`, checkId(seg[1]));
        if (!lead) throw notFound();
        const b = await body(request);
        const c = cleanAnswers(b.answers);
        if (!c.ok) throw bad(c.message);
        if (!Object.keys(c.answers).length) throw bad('Brak odpowiedzi do połączenia.');
        const sources = await all(env, `SELECT id, kind FROM briefs WHERE lead_id = ? AND merged_at IS NULL AND kind IN ('strona', 'logo')`, lead.id);
        if (!sources.some((x) => x.kind === 'strona') || !sources.some((x) => x.kind === 'logo')) throw bad('Do połączenia potrzebne są dwa briefy: strony i logo.');
        const t = nowIso();
        const company = String(c.answers.company_name || lead.company_name).slice(0, 150);
        const merged = await first(env, `SELECT id, token FROM briefs WHERE lead_id = ? AND merged_at IS NOT NULL`, lead.id);
        if (merged) {
          await run(env, `UPDATE briefs SET answers = ?, company_name = ?, merged_at = ?, submitted_at = ?, updated_at = ?, status = 'wyslany' WHERE id = ?`, JSON.stringify(c.answers), company, t, t, t, merged.id);
          return json({ ok: true, id: merged.id, updated: true });
        }
        const id = uuid();
        await run(
          env,
          `INSERT INTO briefs (id, token, company_name, contact_email, status, answers, created_at, updated_at, submitted_at, lead_id, kind, merged_at, admin_note) VALUES (?, ?, ?, ?, 'wyslany', ?, ?, ?, ?, ?, 'pelny', ?, ?)`,
          id, newToken(), company, lead.email, JSON.stringify(c.answers), t, t, t, lead.id, t, 'Brief połączony z briefu strony i briefu logo.'
        );
        return json({ ok: true, id });
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
        return json({ ok: true, settings: await first(env, `SELECT recruitment_open, contact_email, posts_enabled, facebook_url, instagram_url, offer_mode, offer_mode_at FROM settings WHERE id = 1`) });
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
        if ('offer_mode' in b) {
          // Tryb oferty: „free” — portfolio (bezpłatne wykonanie), „paid” — cennik. Data przełączenia trafia do sitemap.xml (lastmod).
          if (!['free', 'paid'].includes(b.offer_mode)) throw bad('Nieznany tryb oferty.');
          sets.push('offer_mode = ?', 'offer_mode_at = CASE WHEN offer_mode = ? THEN offer_mode_at ELSE ? END');
          vals.push(b.offer_mode, b.offer_mode, nowIso());
        }
        if ('posts_enabled' in b) {
          sets.push('posts_enabled = ?');
          vals.push(bool(b.posts_enabled));
        }
        for (const k of ['facebook', 'instagram']) {
          if (!(`${k}_url` in b)) continue;
          const r = profileUrl(k, b[`${k}_url`]);
          if (!r.ok) throw bad(k === 'facebook' ? 'Podaj adres profilu na Facebooku, np. https://www.facebook.com/twojprofil.' : 'Podaj adres profilu na Instagramie, np. https://www.instagram.com/twojprofil/.');
          sets.push(`${k}_url = ?`);
          vals.push(r.value);
        }
        if (!sets.length) throw bad('Brak zmian.');
        await run(env, `UPDATE settings SET ${sets.join(', ')}, updated_at = ? WHERE id = 1`, ...vals, nowIso());
        return json({ ok: true });
      }

      // ===== Aktualności (posty) =====
      case 'GET /posts': {
        const items = await all(env, `SELECT p.*, m.kv_key, m.alt FROM posts p LEFT JOIN media m ON m.id = p.media_id ORDER BY p.published_on DESC, p.created_at DESC`);
        return json({ ok: true, items: items.map(postOut) });
      }
      case 'POST /posts': {
        const v = await postInput(env, await body(request));
        const t = nowIso();
        const id = uuid();
        await run(env, `INSERT INTO posts (id, title, body, published_on, media_id, link_url, embed, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, v.title, v.body, v.published_on, v.media_id, v.link_url, v.embed, v.status, t, t);
        return json({ ok: true, id });
      }
      case 'PUT /posts/:id': {
        const v = await postInput(env, await body(request));
        const r = await run(env, `UPDATE posts SET title = ?, body = ?, published_on = ?, media_id = ?, link_url = ?, embed = ?, status = ?, updated_at = ? WHERE id = ?`, v.title, v.body, v.published_on, v.media_id, v.link_url, v.embed, v.status, nowIso(), checkId(seg[1]));
        if (!r.meta.changes) throw notFound();
        return json({ ok: true });
      }
      case 'DELETE /posts/:id':
        await run(env, `DELETE FROM posts WHERE id = ?`, checkId(seg[1]));
        return json({ ok: true });

      // ===== Zdjęcia =====
      case 'GET /media': {
        const items = await all(
          env,
          `SELECT m.*, (SELECT COUNT(*) FROM portfolio_images pi WHERE pi.media_id = m.id) + (SELECT COUNT(*) FROM posts po WHERE po.media_id = m.id) AS used FROM media m ORDER BY created_at DESC`
        );
        return json({
          ok: true,
          items: items.map((m) => {
            const variants = parseVariants(m.variants);
            return { ...m, variants, variant_status: variantStatus(m.width, variants), url: mediaUrl(m.kv_key) };
          }),
        });
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
        // Wymiary odczytane z pliku (gdy nagłówek jest czytelny) mają pierwszeństwo przed danymi z przeglądarki.
        const info = imageInfo(new Uint8Array(buf.slice(0, 65536)));
        const real = info && info.width > 0 && info.height > 0 && info.width < 20000 && info.height < 20000;
        const row = { id, kv_key: kvKey, content_type: type, alt, width: real ? info.width : dim(form.get('width')), height: real ? info.height : dim(form.get('height')), size_bytes: buf.byteLength, created_at: nowIso() };
        try {
          await run(env, `INSERT INTO media (id, kv_key, content_type, alt, width, height, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, row.id, row.kv_key, row.content_type, row.alt, row.width, row.height, row.size_bytes, row.created_at);
        } catch (e) {
          await env.MEDIA.delete(kvKey);
          throw e;
        }
        return json({ ok: true, item: { ...row, url: mediaUrl(kvKey), used: 0, variants: [], variant_status: variantStatus(row.width, []) } });
      }
      case 'POST /media/:id/variants': {
        // Warianty responsywne (w480–w1280) dla ISTNIEJĄCEGO zdjęcia. Oryginał i rekord zdjęcia nie są tu zmieniane
        // (poza dopisaniem udanych wariantów do kolumny variants). Każdy wariant jest sprawdzany i zapisywany osobno.
        if (!env.MEDIA) throw new HttpError(503, 'Brak powiązania magazynu KV o nazwie MEDIA (Settings → Bindings).');
        const m = await first(env, `SELECT id, kv_key, width, height, variants FROM media WHERE id = ?`, checkId(seg[1]));
        if (!m) throw notFound('Nie znaleziono zdjęcia.');
        const form = await request.formData().catch(() => null);
        if (!form) throw bad('Nieprawidłowe dane.');
        // Rzeczywiste wymiary oryginału — z pliku w KV, nie z bazy ani z przeglądarki
        const orig = await env.MEDIA.get(m.kv_key, { type: 'arrayBuffer' });
        const info = orig ? imageInfo(new Uint8Array(orig.slice(0, 65536))) : null;
        if (!info) throw bad('Nie udało się odczytać wymiarów oryginału — wersje nie zostały przygotowane. Zdjęcie działa bez zmian.');
        if (Number(m.width) !== info.width || Number(m.height) !== info.height) {
          throw bad(`Wymiary zapisane w bazie (${m.width}×${m.height}) różnią się od pliku (${info.width}×${info.height}) — wersje nie zostały przygotowane. Zdjęcie działa bez zmian.`);
        }
        const allowed = expectedVariants(info.width);
        const results = {};
        const stored = [];
        for (const name of VARIANT_NAMES) {
          const f = form.get(name);
          if (!f || typeof f === 'string') continue;
          if (!allowed.includes(name)) { results[name] = { ok: false, message: 'Zdjęcie jest za małe na ten wariant.' }; continue; }
          if (f.size > VARIANT_MAX_BYTES) { results[name] = { ok: false, message: 'Wariant jest za duży (maks. 1 MB).' }; continue; }
          try {
            const bytes = new Uint8Array(await f.arrayBuffer());
            const c = checkVariant(name, bytes, info);
            if (!c.ok) { results[name] = { ok: false, message: c.message }; continue; }
            const key = variantKey(m.id, name, c.ext);
            await env.MEDIA.put(key, bytes, { metadata: { contentType: c.ext === 'webp' ? 'image/webp' : 'image/jpeg' } });
            // ten sam wariant w drugim formacie (np. wcześniej JPG, teraz WebP) jest już niepotrzebny
            const other = variantKey(m.id, name, c.ext === 'webp' ? 'jpg' : 'webp');
            try { await env.MEDIA.delete(other); } catch { /* brak pliku — nic nie szkodzi */ }
            stored.push(c.entry);
            results[name] = { ok: true, width: c.entry.w, height: c.entry.h };
          } catch (e) {
            console.error('Wariant nie zapisany', m.id, name, e);
            results[name] = { ok: false, message: 'Nie udało się zapisać wariantu.' };
          }
        }
        let variants = parseVariants(m.variants);
        if (stored.length) {
          // zapis „porównaj i zamień” — dwie próby, żeby równoległe wgrywanie nie nadpisało cudzych zmian
          let current = m.variants;
          for (let attempt = 0; attempt < 3; attempt++) {
            const merged = parseVariants(current).filter((v) => !stored.some((x) => x.k === v.k)).concat(stored).sort((a, b) => a.w - b.w);
            const r = await run(env, `UPDATE media SET variants = ? WHERE id = ? AND variants = ?`, JSON.stringify(merged), m.id, current);
            if (r.meta.changes) { variants = merged; break; }
            const fresh = await first(env, `SELECT variants FROM media WHERE id = ?`, m.id);
            if (!fresh) throw notFound('Zdjęcie zostało usunięte.');
            current = fresh.variants;
            if (attempt === 2) throw new HttpError(409, 'Nie udało się zapisać listy wersji — spróbuj ponownie.');
          }
        }
        return json({ ok: true, results, variants, variant_status: variantStatus(info.width, variants) });
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
        await env.DB.batch([env.DB.prepare(`DELETE FROM portfolio_images WHERE media_id = ?`).bind(m.id), env.DB.prepare(`UPDATE posts SET media_id = NULL WHERE media_id = ?`).bind(m.id), env.DB.prepare(`DELETE FROM media WHERE id = ?`).bind(m.id)]);
        if (env.MEDIA) {
          await env.MEDIA.delete(m.kv_key);
          // warianty: tylko zamknięta lista kluczy wyliczonych z UUID tego zdjęcia (bez usuwania po prefiksie)
          for (const key of allVariantKeys(m.id)) {
            try { await env.MEDIA.delete(key); } catch (e) { console.error('Nie usunięto wariantu', key, e); }
          }
        }
        return json({ ok: true });
      }

      // ===== Briefy projektowe =====
      case 'GET /briefs':
        return json({
          ok: true,
          items: await all(env, `SELECT id, token, company_name, contact_email, status, created_at, updated_at, opened_at, submitted_at, lead_id, kind, merged_at FROM briefs ORDER BY created_at DESC LIMIT 500`),
        });
      case 'POST /briefs': {
        const b = await body(request);
        const company = str(b.company_name, [1, 150], 'Nazwa firmy');
        let email = typeof b.contact_email === 'string' ? b.contact_email.trim() : '';
        if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw bad('Podaj poprawny adres e-mail albo zostaw pole puste.');
        const t = nowIso();
        const kind = BRIEF_KINDS.includes(b.kind) ? b.kind : 'pelny';
        const item = { id: uuid(), token: newToken(), company_name: company, contact_email: email || null, status: 'nowy', created_at: t, updated_at: t, kind };
        await run(env, `INSERT INTO briefs (id, token, company_name, contact_email, status, answers, created_at, updated_at, kind) VALUES (?, ?, ?, ?, 'nowy', ?, ?, ?, ?)`, item.id, item.token, item.company_name, item.contact_email, JSON.stringify({ company_name: company }), t, t, kind);
        return json({ ok: true, item });
      }
      case 'GET /briefs/:id': {
        const r = await first(env, `SELECT * FROM briefs WHERE id = ?`, checkId(seg[1]));
        if (!r) throw notFound('Nie znaleziono briefu.');
        let answers = {};
        try {
          answers = JSON.parse(r.answers || '{}');
        } catch {
          answers = {};
        }
        return json({ ok: true, brief: { ...r, answers } });
      }
      case 'PATCH /briefs/:id': {
        const b = await body(request);
        const id = checkId(seg[1]);
        const sets = [];
        const vals = [];
        if (b.reopen === true) {
          sets.push(`status = 'w_trakcie'`, 'submitted_at = NULL');
        }
        if (typeof b.admin_note === 'string') {
          sets.push('admin_note = ?');
          vals.push(str(b.admin_note, [0, 5000], 'Notatka'));
        }
        if (b.answers !== undefined) {
          // Poprawki administratora w odpowiedziach klienta (status briefu się nie zmienia)
          const c = cleanAnswers(b.answers);
          if (!c.ok) throw bad(c.message);
          sets.push('answers = ?', 'admin_edited_at = ?');
          vals.push(JSON.stringify(c.answers), nowIso());
          if (c.answers.company_name) {
            sets.push('company_name = ?');
            vals.push(String(c.answers.company_name).slice(0, 150));
          }
        }
        if (!sets.length) throw bad('Brak zmian.');
        const r = await run(env, `UPDATE briefs SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, ...vals, nowIso(), id);
        if (!r.meta.changes) throw notFound();
        return json({ ok: true });
      }
      case 'DELETE /briefs/:id':
        await run(env, `DELETE FROM briefs WHERE id = ?`, checkId(seg[1]));
        return json({ ok: true });

      // ===== Portfolio =====
      case 'GET /portfolio':
        return json({
          ok: true,
          items: await all(env, `SELECT p.id, p.title, p.industry, p.status, p.sort_order, p.slug, p.is_demo, p.card_files, (SELECT COUNT(*) FROM portfolio_images pi WHERE pi.project_id = p.id) AS images FROM portfolio_projects p ORDER BY sort_order, created_at DESC`),
        });
      case 'GET /portfolio/:id': {
        const p = await first(env, `SELECT * FROM portfolio_projects WHERE id = ?`, checkId(seg[1]));
        if (!p) throw notFound('Nie znaleziono realizacji.');
        const images = await all(env, `SELECT m.* FROM portfolio_images pi JOIN media m ON m.id = pi.media_id WHERE pi.project_id = ? ORDER BY pi.sort_order`, p.id);
        const cardFiles = p.card_ver
          ? await all(env, `SELECT path, content_type, size_bytes FROM portfolio_files WHERE project_id = ? AND ver = ? ORDER BY path`, p.id, p.card_ver)
          : [];
        return json({
          ok: true,
          project: p,
          images: images.map((m) => ({ ...m, url: mediaUrl(m.kv_key) })),
          card: p.card_ver && p.slug ? { url: cardUrl(p.slug), files: cardFiles, images: cardFiles.filter((f) => isImagePath(f.path)).map((f) => ({ path: f.path, url: cardUrl(p.slug, f.path) })) } : null,
        });
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
        const tags = str(b.tags ?? '', [0, 300], 'Tagi');
        const isDemo = bool(b.is_demo);
        const seoFor = str(b.seo_for ?? '', [0, 80], 'Dla kogo jest ten projekt').replace(/^dla\s+/i, '');
        const imageIds = Array.isArray(b.image_ids) ? b.image_ids.slice(0, 30) : [];
        imageIds.forEach(checkId);
        const t = nowIso();
        const isNew = method === 'POST';
        const id = isNew ? uuid() : checkId(seg[1]);
        if (!isNew && !(await first(env, `SELECT id FROM portfolio_projects WHERE id = ?`, id))) throw notFound();
        // Adres karty (/portfolio/<slug>/)
        let slug = typeof b.slug === 'string' ? b.slug.trim().toLowerCase() : '';
        const auto = !slug;
        if (auto) slug = slugify(title);
        if (!SLUG_RE.test(slug) || slug.length > 60) throw bad('Adres karty może zawierać tylko małe litery, cyfry i myślniki (np. salon-ola).');
        for (let n = 2; ; n++) {
          const taken = await first(env, `SELECT id FROM portfolio_projects WHERE slug = ? AND id != ?`, slug, id);
          if (!taken) break;
          if (!auto) throw bad(`Adres karty „${slug}” jest już zajęty przez inną realizację.`);
          slug = `${slugify(title).slice(0, 55)}-${n}`;
        }
        if (imageIds.length) {
          const found = await all(env, `SELECT id FROM media WHERE id IN (${imageIds.map(() => '?').join(',')})`, ...imageIds);
          if (found.length !== new Set(imageIds).size) throw bad('Część wybranych zdjęć już nie istnieje. Odśwież stronę.');
        }
        const stmts = [
          isNew
            ? env.DB.prepare(`INSERT INTO portfolio_projects (id, title, industry, description, site_url, status, sort_order, created_at, updated_at, slug, tags, is_demo, seo_for) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`).bind(id, title, industry, description, u.value, status, t, t, slug, tags, isDemo, seoFor)
            : env.DB.prepare(`UPDATE portfolio_projects SET title = ?, industry = ?, description = ?, site_url = ?, status = ?, updated_at = ?, slug = ?, tags = ?, is_demo = ?, seo_for = ? WHERE id = ?`).bind(title, industry, description, u.value, status, t, slug, tags, isDemo, seoFor, id),
          env.DB.prepare(`DELETE FROM portfolio_images WHERE project_id = ?`).bind(id),
          ...[...new Set(imageIds)].map((mid, i) => env.DB.prepare(`INSERT INTO portfolio_images (project_id, media_id, sort_order) VALUES (?, ?, ?)`).bind(id, mid, (i + 1) * 10)),
        ];
        await env.DB.batch(stmts);
        return json({ ok: true, id, slug });
      }
      case 'DELETE /portfolio/:id': {
        const id = checkId(seg[1]);
        await deleteCardFiles(env, id);
        await env.DB.batch([env.DB.prepare(`DELETE FROM portfolio_images WHERE project_id = ?`).bind(id), env.DB.prepare(`DELETE FROM portfolio_projects WHERE id = ?`).bind(id)]);
        return json({ ok: true });
      }
      // ----- Karta projektu (pliki z ZIP-a) -----
      case 'PUT /portfolio/:id/card-file': {
        if (!env.MEDIA) throw new HttpError(503, 'Brak powiązania magazynu KV o nazwie MEDIA (Settings → Bindings).');
        const id = checkId(seg[1]);
        const qs = new URL(request.url).searchParams;
        const ver = qs.get('ver') || '';
        const path = qs.get('path') || '';
        if (!VER_RE.test(ver)) throw bad('Nieprawidłowa wersja karty.');
        if (!PATH_RE.test(path)) throw bad(`Niedozwolona nazwa pliku: ${path.slice(0, 120)}`);
        const ext = extOf(path);
        const type = CARD_TYPES[ext];
        if (!type) throw bad(`Niedozwolony typ pliku: ${path}`);
        if (!(await first(env, `SELECT id FROM portfolio_projects WHERE id = ?`, id))) throw notFound();
        const len = Number(request.headers.get('Content-Length') || 0);
        if (len > MAX_FILE) throw bad(`Plik ${path} jest za duży (maksymalnie 10 MB).`);
        const buf = await request.arrayBuffer();
        if (buf.byteLength > MAX_FILE) throw bad(`Plik ${path} jest za duży (maksymalnie 10 MB).`);
        if (!sniffOk(ext, new Uint8Array(buf.slice(0, 16)))) throw bad(`Plik ${path} nie jest prawidłowym plikiem ${ext.toUpperCase()}.`);
        const stats = await first(env, `SELECT COUNT(*) AS n, COALESCE(SUM(size_bytes), 0) AS total FROM portfolio_files WHERE project_id = ? AND ver = ? AND path != ?`, id, ver, path);
        if (stats.n >= MAX_FILES) throw bad(`Karta może mieć maksymalnie ${MAX_FILES} plików.`);
        if (stats.total + buf.byteLength > MAX_TOTAL) throw bad('Karta jest za duża (maksymalnie 40 MB razem). Zmniejsz zdjęcia, np. zapisz je jako WebP.');
        const kvKey = `pf/${id}/${ver}/${path}`;
        await env.MEDIA.put(kvKey, buf, { metadata: { contentType: type } });
        await run(env, `INSERT OR REPLACE INTO portfolio_files (project_id, ver, path, kv_key, content_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, id, ver, path, kvKey, type, buf.byteLength, nowIso());
        return json({ ok: true });
      }
      case 'POST /portfolio/:id/card': {
        const id = checkId(seg[1]);
        const b = await body(request);
        const ver = String(b.ver || '');
        if (!VER_RE.test(ver)) throw bad('Nieprawidłowa wersja karty.');
        const p = await first(env, `SELECT id, title, slug FROM portfolio_projects WHERE id = ?`, id);
        if (!p) throw notFound();
        const files = await all(env, `SELECT path, size_bytes FROM portfolio_files WHERE project_id = ? AND ver = ?`, id, ver);
        if (!files.some((f) => f.path === 'index.html')) throw bad('W paczce brakuje pliku index.html w głównym folderze.');
        if (Number.isInteger(b.expected) && b.expected !== files.length) throw bad('Nie wszystkie pliki zostały wgrane. Spróbuj ponownie.');
        const images = files.map((f) => f.path).filter(isImagePath);
        let cover = typeof b.cover === 'string' && images.includes(b.cover) ? b.cover : null;
        if (!cover) cover = images.find((x) => /start|cover|okladka|miniatura|hero/i.test(x) && !/(^|\/)m-/.test(x)) || images[0] || null;
        let slug = p.slug;
        if (!slug) {
          slug = slugify(p.title);
          for (let n = 2; await first(env, `SELECT id FROM portfolio_projects WHERE slug = ? AND id != ?`, slug, id); n++) slug = `${slugify(p.title).slice(0, 55)}-${n}`;
        }
        const total = files.reduce((a, f) => a + (f.size_bytes || 0), 0);
        await run(env, `UPDATE portfolio_projects SET slug = ?, card_ver = ?, card_cover = ?, card_files = ?, card_size = ?, card_at = ?, updated_at = ? WHERE id = ?`, slug, ver, cover, files.length, total, nowIso(), nowIso(), id);
        await deleteCardFiles(env, id, ver);
        return json({ ok: true, url: cardUrl(slug), cover, files: files.length });
      }
      case 'PATCH /portfolio/:id/card': {
        const id = checkId(seg[1]);
        const b = await body(request);
        const p = await first(env, `SELECT card_ver FROM portfolio_projects WHERE id = ?`, id);
        if (!p || !p.card_ver) throw notFound('Ta realizacja nie ma karty.');
        const cover = typeof b.cover === 'string' ? b.cover : '';
        if (cover && !(isImagePath(cover) && (await first(env, `SELECT path FROM portfolio_files WHERE project_id = ? AND ver = ? AND path = ?`, id, p.card_ver, cover)))) throw bad('Nie ma takiego obrazu w karcie.');
        await run(env, `UPDATE portfolio_projects SET card_cover = ?, updated_at = ? WHERE id = ?`, cover || null, nowIso(), id);
        return json({ ok: true });
      }
      case 'DELETE /portfolio/:id/card': {
        const id = checkId(seg[1]);
        await deleteCardFiles(env, id);
        await run(env, `UPDATE portfolio_projects SET card_ver = NULL, card_cover = NULL, card_files = 0, card_size = 0, card_at = NULL, updated_at = ? WHERE id = ?`, nowIso(), id);
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
