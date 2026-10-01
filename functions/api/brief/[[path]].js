// API briefu dla klienta: /api/brief/<token> (odczyt, zapis wersji roboczej) i /api/brief/<token>/submit (wysłanie).
// Dostęp wyłącznie z losowym, niemożliwym do odgadnięcia tokenem z linku wygenerowanego w panelu.

import { json, siteOrigin } from '../../_lib/http.js';
import { ensureSchema, hasDb, nowIso } from '../../_lib/db.js';
import { TOKEN_RE, cleanAnswers, requiredCoreErrors, notifyBriefSubmitted } from '../../_lib/brief.js';

const MAX_BODY = 200000;

async function readBody(request) {
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return { error: json({ ok: false, message: 'Nieobsługiwany format danych.' }, 415) };
  if (request.headers.get('X-Brief') !== '1') return { error: json({ ok: false, message: 'Niedozwolone żądanie.' }, 403) };
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return { error: json({ ok: false, message: 'Niedozwolone źródło żądania.' }, 403) };
  const raw = await request.text();
  if (raw.length > MAX_BODY) return { error: json({ ok: false, message: 'Brief jest zbyt obszerny.' }, 413) };
  try {
    return { body: JSON.parse(raw) };
  } catch {
    return { error: json({ ok: false, message: 'Nieprawidłowe dane.' }, 400) };
  }
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const seg = Array.isArray(params.path) ? params.path : [];
  const token = seg[0] || '';
  const action = seg[1] || '';
  const extraHeaders = { 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' };

  if (!TOKEN_RE.test(token) || seg.length > 2) return json({ ok: false, message: 'Nieprawidłowy link do briefu.' }, 404, extraHeaders);
  if (!hasDb(env)) return json({ ok: false, message: 'Usługa chwilowo niedostępna.' }, 503, extraHeaders);

  try {
    await ensureSchema(env);
    const brief = await env.DB.prepare(`SELECT id, company_name, status, answers, submitted_at, lead_id FROM briefs WHERE token = ?`).bind(token).first();
    if (!brief) return json({ ok: false, message: 'Ten link do briefu jest nieaktywny. Skontaktuj się ze mną, a wyślę nowy.' }, 404, extraHeaders);

    // --- Odczyt ---
    if (request.method === 'GET' && !action) {
      await env.DB.prepare(`UPDATE briefs SET opened_at = COALESCE(opened_at, ?) WHERE id = ?`).bind(nowIso(), brief.id).run();
      let answers = {};
      try {
        answers = JSON.parse(brief.answers || '{}');
      } catch {
        answers = {};
      }
      return json({ ok: true, company_name: brief.company_name, status: brief.status, submitted_at: brief.submitted_at, answers }, 200, extraHeaders);
    }

    if (brief.status === 'wyslany') {
      return json({ ok: false, locked: true, message: 'Brief został już wysłany. Jeśli chcesz coś zmienić, napisz do mnie — odblokuję go.' }, 409, extraHeaders);
    }

    // --- Zapis wersji roboczej ---
    if (request.method === 'PUT' && !action) {
      const { body, error } = await readBody(request);
      if (error) return error;
      const c = cleanAnswers(body.answers);
      if (!c.ok) return json({ ok: false, message: c.message }, 400, extraHeaders);
      const t = nowIso();
      await env.DB.prepare(`UPDATE briefs SET answers = ?, status = 'w_trakcie', updated_at = ? WHERE id = ?`).bind(JSON.stringify(c.answers), t, brief.id).run();
      return json({ ok: true, saved_at: t }, 200, extraHeaders);
    }

    // --- Wysłanie ---
    if (request.method === 'POST' && action === 'submit') {
      const { body, error } = await readBody(request);
      if (error) return error;
      const c = cleanAnswers(body.answers);
      if (!c.ok) return json({ ok: false, message: c.message }, 400, extraHeaders);
      const missing = requiredCoreErrors(c.answers);
      if (missing.length) return json({ ok: false, message: `Uzupełnij wymagane pola: ${missing.join(', ')}.` }, 422, extraHeaders);
      const t = nowIso();
      const r = await env.DB.prepare(`UPDATE briefs SET answers = ?, status = 'wyslany', updated_at = ?, submitted_at = ? WHERE id = ? AND status != 'wyslany'`)
        .bind(JSON.stringify(c.answers), t, t, brief.id)
        .run();
      if (r.meta && r.meta.changes) context.waitUntil(notifyBriefSubmitted(env, brief, c.answers, siteOrigin(env, request)));
      return json({ ok: true, submitted_at: t }, 200, extraHeaders);
    }

    return json({ ok: false, message: 'Nieznana operacja.' }, 405, extraHeaders);
  } catch (e) {
    console.error('Błąd API briefu', e);
    return json({ ok: false, message: 'Nie udało się zapisać. Spróbuj ponownie za chwilę.' }, 500, extraHeaders);
  }
}
