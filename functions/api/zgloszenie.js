// POST /api/zgloszenie — przyjmuje zgłoszenie z formularza.
//
// Kolejność:
//  1. podstawowe zabezpieczenia (rozmiar, typ treści, pochodzenie, pole-pułapka),
//  2. walidacja pól,
//  3. sprawdzenie, czy nabór jest włączony,
//  4. weryfikacja Cloudflare Turnstile (jeśli skonfigurowano),
//  5. limit zgłoszeń z jednego adresu IP (przechowywany tylko skrót IP, 7 dni),
//  6. ZAPIS w bazie D1 — dopiero wtedy odpowiadamy „ok”,
//  7. powiadomienie e-mail w tle; jego błąd nie usuwa zgłoszenia.

import { json, siteOrigin, contactEmail } from '../_lib/http.js';
import { ensureSchema, hasDb, ipHash, uuid, nowIso } from '../_lib/db.js';
import { validateLead } from '../_lib/validate.js';
import { notifyAboutLead } from '../_lib/email.js';

const MAX_BODY = 20000;
const PER_IP_PER_HOUR = 5;
const GLOBAL_PER_HOUR = 60;

function failMessage(email) {
  return `Nie udało się zapisać zgłoszenia. Spróbuj ponownie za chwilę albo napisz bezpośrednio na ${email}.`;
}

async function verifyTurnstile(env, token, ip) {
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(8000),
  });
  const out = await res.json().catch(() => ({}));
  return Boolean(out.success);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const fallbackEmail = contactEmail(env);

  // --- 1. Podstawowe zabezpieczenia ---
  const type = request.headers.get('Content-Type') || '';
  if (!type.includes('application/json')) return json({ ok: false, message: 'Nieobsługiwany format danych.' }, 415);
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin && origin !== siteOrigin(env, request)) {
    return json({ ok: false, message: 'Niedozwolone źródło żądania.' }, 403);
  }
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) return json({ ok: false, message: 'Zgłoszenie jest zbyt duże.' }, 413);

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json({ ok: false, message: 'Nie udało się odczytać danych.' }, 400);
  }
  if (raw.length > MAX_BODY) return json({ ok: false, message: 'Zgłoszenie jest zbyt duże.' }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, message: 'Nieprawidłowe dane formularza.' }, 400);
  }

  // Pole-pułapka: wypełniają je tylko automaty. Udajemy sukces, niczego nie zapisując.
  if (body && typeof body.company_fax === 'string' && body.company_fax.trim() !== '') return json({ ok: true }, 200);

  // --- 2. Walidacja ---
  const { errors, data } = validateLead(body);
  if (Object.keys(errors).length) return json({ ok: false, message: errors.form || 'Popraw zaznaczone pola.', errors }, 422);

  if (!hasDb(env)) {
    console.error('Brak powiązania bazy D1 (DB) — nie można zapisać zgłoszenia.');
    return json({ ok: false, message: failMessage(fallbackEmail) }, 503);
  }

  let settings;
  try {
    await ensureSchema(env);
    settings = await env.DB.prepare(`SELECT recruitment_open, contact_email FROM settings WHERE id = 1`).first();
  } catch (e) {
    console.error(e);
    return json({ ok: false, message: failMessage(fallbackEmail) }, 502);
  }
  const publicEmail = (settings && settings.contact_email) || fallbackEmail;

  // --- 3. Czy nabór jest włączony? ---
  if (settings && settings.recruitment_open === 0) {
    return json({ ok: false, closed: true, message: `Obecnie realizuję przyjęte projekty. Możesz napisać do mnie (${publicEmail}), aby zapytać o kolejny termin.` }, 409);
  }

  // --- 4. Turnstile ---
  const ip = request.headers.get('CF-Connecting-IP') || '';
  // Turnstile wymagany tylko, gdy ustawiono OBA klucze (inaczej formularz byłby zablokowany).
  if (env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY) {
    const token = typeof body.turnstile_token === 'string' ? body.turnstile_token : '';
    let passed = false;
    if (token && token.length < 4096) {
      try {
        passed = await verifyTurnstile(env, token, ip);
      } catch (e) {
        console.error('Błąd weryfikacji Turnstile', e);
      }
    }
    if (!passed) {
      return json(
        {
          ok: false,
          message: 'Nie udało się potwierdzić, że nie jesteś robotem. Zaznacz pole weryfikacji i wyślij ponownie.',
          errors: { turnstile: 'Weryfikacja nie powiodła się — spróbuj jeszcze raz.' },
        },
        400
      );
    }
  } else {
    console.warn('Brak TURNSTILE_SITE_KEY lub TURNSTILE_SECRET_KEY — formularz chronią tylko pole-pułapka i limity.');
  }

  // --- 5. Limity ---
  try {
    const hash = await ipHash(env, request);
    const hourAgo = Date.now() - 3600_000;
    const [mine, all] = await env.DB.batch([
      env.DB.prepare(`SELECT COUNT(*) AS n FROM submission_log WHERE ip_hash = ? AND created_at > ?`).bind(hash, hourAgo),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM submission_log WHERE created_at > ?`).bind(hourAgo),
    ]);
    if (mine.results[0].n >= PER_IP_PER_HOUR || all.results[0].n >= GLOBAL_PER_HOUR) {
      return json({ ok: false, message: `Wysłano zbyt wiele zgłoszeń w krótkim czasie. Spróbuj ponownie później albo napisz na ${publicEmail}.` }, 429);
    }
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO submission_log (ip_hash, created_at) VALUES (?, ?)`).bind(hash, Date.now()),
      env.DB.prepare(`DELETE FROM submission_log WHERE created_at < ?`).bind(Date.now() - 7 * 86400_000),
    ]);
  } catch (e) {
    console.error('Błąd limitu zgłoszeń', e);
    return json({ ok: false, message: failMessage(publicEmail) }, 502);
  }

  // --- 6. Zapis zgłoszenia (ten sam submission_id zapisuje się tylko raz) ---
  const t = nowIso();
  const lead = { id: uuid(), created_at: t, updated_at: t, status: 'nowe', ...data };
  try {
    const res = await env.DB.prepare(
      `INSERT OR IGNORE INTO leads (id, submission_id, created_at, updated_at, company_name, industry, contact_name, email, phone, website_url, facebook_url, instagram_url, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(lead.id, data.submission_id, t, t, data.company_name, data.industry, data.contact_name, data.email, data.phone, data.website_url, data.facebook_url, data.instagram_url, data.message)
      .run();
    if (!res.meta || res.meta.changes === 0) {
      // To samo zgłoszenie zostało już zapisane (np. ponowne kliknięcie po zerwanym połączeniu).
      return json({ ok: true, duplicate: true }, 200);
    }
  } catch (e) {
    console.error('Błąd zapisu zgłoszenia', e);
    return json({ ok: false, message: failMessage(publicEmail) }, 502);
  }

  // --- 7. Powiadomienie e-mail (w tle) ---
  context.waitUntil(notifyAboutLead(env, lead, siteOrigin(env, request)));
  return json({ ok: true }, 201);
}
