// API strony wyboru logo: GET /api/logo/<token> (dane do formularza), POST /api/logo/<token> (zapis wyboru klienta).
import { json, siteOrigin } from '../../_lib/http.js';
import { ensureSchema, hasDb, nowIso } from '../../_lib/db.js';
import { TOKEN_RE } from '../../_lib/brief.js';
import { sendEmail } from '../../_lib/email.js';
import { esc } from '../../_lib/render.js';

const H = { 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' };
const clean = (v, max) => String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').trim().slice(0, max);

export async function onRequest(context) {
  const { request, env, params } = context;
  const seg = Array.isArray(params.path) ? params.path : [];
  const token = seg[0] || '';
  if (!TOKEN_RE.test(token) || seg.length !== 1) return json({ ok: false, message: 'Nieprawidłowy link.' }, 404, H);
  if (!hasDb(env)) return json({ ok: false, message: 'Usługa chwilowo niedostępna.' }, 503, H);
  try {
    await ensureSchema(env);
    const p = await env.DB.prepare(
      `SELECT lp.*, l.company_name, l.email AS lead_email FROM logo_proposals lp JOIN leads l ON l.id = lp.lead_id WHERE lp.token = ?`
    ).bind(token).first();
    if (!p) return json({ ok: false, message: 'Ten link jest nieaktywny. Napisz do mnie, a wyślę nowy.' }, 404, H);
    let options = [];
    try {
      options = JSON.parse(p.options || '[]');
    } catch {
      options = [];
    }
    const choice = p.chosen_at ? { option: p.choice_option, tagline: p.choice_tagline || '', notes: p.choice_notes || '', accepted: Boolean(p.choice_accepted), chosen_at: p.chosen_at } : null;

    if (request.method === 'GET') return json({ ok: true, company_name: p.company_name, options, choice }, 200, H);

    if (request.method === 'POST') {
      if (!(request.headers.get('Content-Type') || '').includes('application/json') || request.headers.get('X-Logo') !== '1') return json({ ok: false, message: 'Niedozwolone żądanie.' }, 403, H);
      const origin = request.headers.get('Origin');
      if (origin && origin !== new URL(request.url).origin) return json({ ok: false, message: 'Niedozwolone źródło żądania.' }, 403, H);
      const raw = await request.text();
      if (raw.length > 20000) return json({ ok: false, message: 'Wiadomość jest za długa.' }, 413, H);
      let b;
      try {
        b = JSON.parse(raw);
      } catch {
        return json({ ok: false, message: 'Nieprawidłowe dane.' }, 400, H);
      }
      const nr = Number(b.option);
      const opt = options.find((o) => o.nr === nr);
      if (!opt) return json({ ok: false, message: 'Wybierz jedną z opcji.' }, 422, H);
      const tagline = clean(b.tagline, 200);
      const notes = clean(b.notes, 4000);
      const accepted = b.accepted === true ? 1 : 0;
      // prosty limit: najwyżej jedna zmiana wyboru na 20 sekund
      if (p.chosen_at && Date.now() - Date.parse(p.chosen_at) < 20000) return json({ ok: false, message: 'Wybór został przed chwilą zapisany. Odczekaj moment i spróbuj ponownie.' }, 429, H);
      const t = nowIso();
      await env.DB.prepare(
        `UPDATE logo_proposals SET status = 'wybrana', choice_option = ?, choice_name = ?, choice_tagline = ?, choice_notes = ?, choice_accepted = ?, chosen_at = ?, updated_at = ? WHERE id = ?`
      ).bind(nr, opt.name || '', tagline, notes, accepted, t, t, p.id).run();

      const panel = `${siteOrigin(env, request)}/admin/#zgloszenie/${p.lead_id}`;
      const label = `Opcja ${nr}${opt.name ? ` — ${opt.name}` : ''}`;
      const text = `Klient wybrał logo.\n\nFirma: ${p.company_name}\nWybór: ${label}\nHasło: ${tagline || '—'}\nAkceptacja kierunku: ${accepted ? 'tak' : 'nie zaznaczono'}\n\nUwagi i poprawki:\n${notes || '—'}\n\nZgłoszenie w panelu: ${panel}\n`;
      const html = `<!doctype html><html lang="pl"><body style="font-family:Arial,sans-serif;color:#14213a;background:#f5f7fa;margin:0"><div style="max-width:620px;margin:0 auto;padding:24px">
<div style="background:#0f2544;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0"><div style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#c9d6ea">Strony AI Wrocław</div><div style="font-size:20px;font-weight:bold;margin-top:4px">Wybór logo: ${esc(p.company_name)}</div></div>
<div style="background:#fff;padding:24px;border:1px solid #dde3ec;border-top:0;border-radius:0 0 12px 12px;font-size:15px;line-height:1.6">
<p><strong>${esc(label)}</strong></p><p>Hasło: ${esc(tagline || '—')}<br>Akceptacja kierunku: ${accepted ? 'tak' : 'nie zaznaczono'}</p>
<p style="white-space:pre-wrap;background:#f5f7fa;padding:12px;border-radius:8px">${esc(notes || 'Bez uwag.')}</p>
<p><a href="${esc(panel)}" style="background:#142e50;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Otwórz zgłoszenie</a></p></div></div></body></html>`;
      context.waitUntil(
        sendEmail(env, { subject: `Wybór logo: ${p.company_name} — opcja ${nr}`, text, html, replyTo: p.lead_email }).then((r) => {
          if (!r.ok) console.error('Powiadomienie o wyborze logo nie zostało wysłane:', r.error);
        })
      );
      return json({ ok: true, chosen_at: t }, 200, H);
    }
    return json({ ok: false, message: 'Nieznana operacja.' }, 405, H);
  } catch (e) {
    console.error('Błąd API wyboru logo', e);
    return json({ ok: false, message: 'Nie udało się zapisać. Spróbuj ponownie za chwilę.' }, 500, H);
  }
}
