// Wspólne funkcje briefu projektowego (walidacja odpowiedzi, tokeny, powiadomienie).
import { esc } from './render.js';
import { sendEmail } from './email.js';

export const TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/;
const KEY_RE = /^[a-z_]{2,40}(__other)?$/;
const MAX_JSON = 150000;

export function newToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Sprawdza i oczyszcza odpowiedzi. Zwraca { ok, answers } albo { ok:false, message }. */
export function cleanAnswers(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, message: 'Nieprawidłowe dane briefu.' };
  const out = {};
  const keys = Object.keys(input);
  if (keys.length > 300) return { ok: false, message: 'Zbyt wiele pól.' };
  for (const k of keys) {
    if (!KEY_RE.test(k)) continue;
    const v = input[k];
    if (typeof v === 'string') {
      const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, 5000);
      if (s.trim()) out[k] = s;
    } else if (Array.isArray(v)) {
      const arr = v.filter((x) => typeof x === 'string' && x.length <= 100).slice(0, 80);
      if (arr.length) out[k] = arr;
    }
  }
  if (JSON.stringify(out).length > MAX_JSON) return { ok: false, message: 'Brief jest zbyt obszerny.' };
  return { ok: true, answers: out };
}

export function requiredCoreErrors(a) {
  const errors = [];
  if (!a.company_name || !a.company_name.trim()) errors.push('Nazwa firmy');
  if (!a.contact_name || !a.contact_name.trim()) errors.push('Osoba do kontaktu');
  if (!a.contact_email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.contact_email.trim())) errors.push('E-mail do kontaktu');
  return errors;
}

export async function notifyBriefSubmitted(env, brief, answers, origin) {
  const panel = brief.lead_id ? `${origin}/admin/#zgloszenie/${brief.lead_id}` : `${origin}/admin/#brief/${brief.id}`;
  const company = answers.company_name || brief.company_name;
  const rows = [
    ['Firma', company],
    ['Osoba do kontaktu', answers.contact_name],
    ['E-mail', answers.contact_email],
    ['Telefon', answers.contact_phone],
    ['Branża', answers.industry_label || answers.industry],
  ].filter(([, v]) => v);
  const text =
    `Klient wypełnił brief projektowy.\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n\nPełne odpowiedzi, wydruk i tekst dla AI: ${panel}\n`;
  const html = `<!doctype html><html lang="pl"><body style="font-family:Arial,sans-serif;color:#14213a;background:#f5f7fa;margin:0">
<div style="max-width:620px;margin:0 auto;padding:24px"><div style="background:#0f2544;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
<div style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#c9d6ea">Strony AI Wrocław</div>
<div style="font-size:20px;font-weight:bold;margin-top:4px">Brief wypełniony: ${esc(company)}</div></div>
<div style="background:#fff;padding:24px;border:1px solid #dde3ec;border-top:0;border-radius:0 0 12px 12px">
<table style="font-size:15px;border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:5px 14px 5px 0;color:#4d5a70">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
<p style="margin-top:20px"><a href="${esc(panel)}" style="background:#142e50;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Otwórz brief w panelu</a></p>
</div></div></body></html>`;
  const r = await sendEmail(env, { subject: `Brief wypełniony: ${company}`, text, html, replyTo: answers.contact_email, idempotencyKey: `brief-${brief.id}-${Math.floor(Date.now() / 60000)}` });
  try {
    await env.DB.prepare(`UPDATE briefs SET notification_status = ? WHERE id = ?`).bind(r.ok ? 'sent' : r.skipped ? 'skipped' : 'failed', brief.id).run();
  } catch (e) {
    console.error(e);
  }
  if (!r.ok) console.error('Powiadomienie o briefie nie zostało wysłane:', r.error);
}
