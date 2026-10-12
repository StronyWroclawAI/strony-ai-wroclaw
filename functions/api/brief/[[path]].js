// API briefu dla klienta: /api/brief/<token> (odczyt, zapis wersji roboczej) i /api/brief/<token>/submit (wysłanie).
// Dostęp wyłącznie z losowym, niemożliwym do odgadnięcia tokenem z linku wygenerowanego w panelu.

import { json, siteOrigin } from '../../_lib/http.js';
import { ensureSchema, hasDb, nowIso } from '../../_lib/db.js';
import { TOKEN_RE, cleanAnswers, requiredCoreErrors, notifyBriefSubmitted } from '../../_lib/brief.js';
import { saveUpload, serveFile, deleteFileRow, publicFile } from '../../_lib/files.js';

const FILE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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

  if (!TOKEN_RE.test(token) || seg.length > 3 || (seg.length === 3 && action !== 'files')) return json({ ok: false, message: 'Nieprawidłowy link do briefu.' }, 404, extraHeaders);
  if (!hasDb(env)) return json({ ok: false, message: 'Usługa chwilowo niedostępna.' }, 503, extraHeaders);

  try {
    await ensureSchema(env);
    const brief = await env.DB.prepare(`SELECT id, company_name, status, answers, submitted_at, lead_id, kind FROM briefs WHERE token = ?`).bind(token).first();
    if (!brief) return json({ ok: false, message: 'Ten link do briefu jest nieaktywny. Skontaktuj się ze mną, a wyślę nowy.' }, 404, extraHeaders);

    // --- Pliki od klienta (logo, zdjęcia) ---
    if (action === 'files') {
      const fid = seg[2] || '';
      const scope = brief.lead_id ? ['lead_id = ?', brief.lead_id] : ['brief_id = ?', brief.id];
      if (request.method === 'GET' && !fid) {
        const rows = (await env.DB.prepare(`SELECT * FROM lead_files WHERE ${scope[0]} ORDER BY created_at`).bind(scope[1]).all()).results || [];
        return json({ ok: true, files: rows.map(publicFile) }, 200, extraHeaders);
      }
      if (fid && !FILE_ID_RE.test(fid)) return json({ ok: false, message: 'Nie znaleziono pliku.' }, 404, extraHeaders);
      if (request.method === 'GET' && fid) {
        const row = await env.DB.prepare(`SELECT * FROM lead_files WHERE id = ? AND ${scope[0]}`).bind(fid, scope[1]).first();
        if (!row) return new Response('Nie znaleziono pliku.', { status: 404 });
        return serveFile(env, row, { thumb: new URL(request.url).searchParams.get('thumb') === '1' });
      }
      // zmiany tylko z tej strony (ochrona przed CSRF) i tylko przed wysłaniem briefu
      const origin = request.headers.get('Origin');
      if (request.headers.get('X-Brief') !== '1' || (origin && origin !== new URL(request.url).origin)) return json({ ok: false, message: 'Niedozwolone żądanie.' }, 403, extraHeaders);
      if (brief.status === 'wyslany') return json({ ok: false, locked: true, message: 'Brief został już wysłany — pliki możesz dosłać e-mailem.' }, 409, extraHeaders);
      if (request.method === 'POST' && !fid) {
        if (Number(request.headers.get('Content-Length') || 0) > 22 * 1024 * 1024) return json({ ok: false, message: 'Plik jest za duży.' }, 413, extraHeaders);
        let form;
        try {
          form = await request.formData();
        } catch {
          return json({ ok: false, message: 'Nieprawidłowe dane pliku.' }, 400, extraHeaders);
        }
        const r = await saveUpload(env, { leadId: brief.lead_id, briefId: brief.id, source: 'klient', form });
        return r.ok ? json({ ok: true, file: r.file }, 201, extraHeaders) : json({ ok: false, message: r.message }, r.status, extraHeaders);
      }
      if (request.method === 'DELETE' && fid) {
        // klient usuwa tylko pliki dodane przez siebie
        const row = await env.DB.prepare(`SELECT * FROM lead_files WHERE id = ? AND ${scope[0]} AND source = 'klient'`).bind(fid, scope[1]).first();
        if (!row) return json({ ok: false, message: 'Nie znaleziono pliku.' }, 404, extraHeaders);
        await deleteFileRow(env, row);
        return json({ ok: true }, 200, extraHeaders);
      }
      return json({ ok: false, message: 'Nieznana operacja.' }, 405, extraHeaders);
    }

    // --- Odczyt ---
    if (request.method === 'GET' && !action) {
      await env.DB.prepare(`UPDATE briefs SET opened_at = COALESCE(opened_at, ?) WHERE id = ?`).bind(nowIso(), brief.id).run();
      let answers = {};
      try {
        answers = JSON.parse(brief.answers || '{}');
      } catch {
        answers = {};
      }
      return json({ ok: true, kind: brief.kind || 'pelny', company_name: brief.company_name, status: brief.status, submitted_at: brief.submitted_at, answers }, 200, extraHeaders);
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
