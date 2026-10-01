// Powiadomienia e-mail przez Resend (https://resend.com).
// Bez własnej domeny Resend pozwala wysyłać z adresu onboarding@resend.dev
// WYŁĄCZNIE na adres e-mail właściciela konta Resend — dlatego konto Resend
// załóż na stronywroclawai@gmail.com.

import { esc } from './render.js';
import { contactEmail } from './http.js';

export function emailConfigured(env) {
  return Boolean(env.RESEND_API_KEY);
}

function fromAddress(env) {
  return (env.NOTIFY_FROM || 'Strony AI Wrocław <onboarding@resend.dev>').trim();
}

/** Wysyła wiadomość przez API Resend. Zwraca { ok, error }. */
export async function sendEmail(env, { subject, text, html, replyTo, idempotencyKey }) {
  if (!emailConfigured(env)) return { ok: false, skipped: true, error: 'Brak zmiennej RESEND_API_KEY — powiadomienia e-mail są wyłączone.' };
  try {
    const headers = {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: fromAddress(env),
        to: [contactEmail(env)],
        subject: subject.replace(/[\r\n]+/g, ' ').slice(0, 200),
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { ok: true };
    const body = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 400)}` };
  } catch (e) {
    return { ok: false, error: `Błąd połączenia z Resend: ${String(e && e.message ? e.message : e).slice(0, 300)}` };
  }
}

export function leadEmail(lead, origin) {
  const rows = [
    ['Firma', lead.company_name],
    ['Branża', lead.industry],
    ['Osoba kontaktowa', lead.contact_name],
    ['E-mail', lead.email],
    ['Telefon', lead.phone],
    ['Obecna strona', lead.website_url],
    ['Facebook', lead.facebook_url],
    ['Instagram', lead.instagram_url],
  ].filter(([, v]) => v);
  const panel = `${origin}/admin/#zgloszenie/${lead.id}`;
  const text =
    `Nowe zgłoszenie ze strony Strony AI Wrocław\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n\nOczekiwania:\n${lead.message}\n\nZgłoszenie w panelu: ${panel}\n` +
    `Możesz odpowiedzieć bezpośrednio na tę wiadomość — odpowiedź trafi do zgłaszającego.`;
  const html = `<!doctype html><html lang="pl"><body style="margin:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#14213a">
<div style="max-width:620px;margin:0 auto;padding:24px">
<div style="background:#0f2544;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
<div style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#c9d6ea">Strony AI Wrocław</div>
<div style="font-size:20px;font-weight:bold;margin-top:4px">Nowe zgłoszenie: ${esc(lead.company_name)}</div></div>
<div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #dde3ec;border-top:0">
<table style="width:100%;border-collapse:collapse;font-size:15px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#4d5a70;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;word-break:break-word">${esc(v)}</td></tr>`
    )
    .join('')}</table>
<div style="margin-top:18px;font-size:13px;color:#4d5a70;text-transform:uppercase;letter-spacing:.08em">Oczekiwania</div>
<div style="margin-top:6px;white-space:pre-wrap;font-size:15px;line-height:1.55;background:#f5f7fa;padding:14px;border-radius:8px">${esc(lead.message)}</div>
<p style="margin:22px 0 0"><a href="${esc(panel)}" style="display:inline-block;background:#142e50;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold">Otwórz w panelu</a></p>
<p style="font-size:13px;color:#4d5a70;margin-top:18px">Odpowiedź na tę wiadomość trafi bezpośrednio do zgłaszającego (${esc(lead.email)}).</p>
</div></div></body></html>`;
  return { subject: `Nowe zgłoszenie: ${lead.company_name}`, text, html };
}

/**
 * Wysyła powiadomienie o zgłoszeniu i zapisuje wynik w bazie.
 * Zgłoszenie jest już zapisane — błąd wysyłki NIE usuwa zgłoszenia.
 */
export async function notifyAboutLead(env, lead, origin) {
  const msg = leadEmail(lead, origin);
  const result = await sendEmail(env, { ...msg, replyTo: lead.email, idempotencyKey: `lead-${lead.id}-${Math.floor(Date.now() / 60000)}` });
  const patch = result.ok
    ? { notification_status: 'sent', notification_error: null, notified_at: new Date().toISOString() }
    : { notification_status: result.skipped ? 'skipped' : 'failed', notification_error: String(result.error || 'Nieznany błąd').slice(0, 1000) };
  try {
    await env.DB.prepare(`UPDATE leads SET notification_status = ?, notification_error = ?, notified_at = COALESCE(?, notified_at), updated_at = ? WHERE id = ?`)
      .bind(patch.notification_status, patch.notification_error ?? null, patch.notified_at ?? null, new Date().toISOString(), lead.id)
      .run();
  } catch (e) {
    console.error('Nie udało się zapisać statusu powiadomienia', e);
  }
  if (!result.ok) console.error('Powiadomienie e-mail nie zostało wysłane:', result.error);
  return result;
}

