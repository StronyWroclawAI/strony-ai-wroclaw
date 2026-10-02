// Wysyłka e-maili przez konto Gmail (SMTP) — bez zewnętrznych bibliotek.
//
// Zmienne w Cloudflare (Settings → Variables and Secrets):
//   GMAIL_USER          adres konta, np. stronywroclawai@gmail.com (zwykła zmienna)
//   GMAIL_APP_PASSWORD  „hasło aplikacji” Google (SEKRET — nigdy w kodzie ani na czacie)
// Opcjonalnie do testów lokalnych: SMTP_HOST, SMTP_PORT, SMTP_SECURE (on / off).
//
// Wiadomości wychodzą z prawdziwej skrzynki Gmail: odbiorca widzi nadawcę GMAIL_USER,
// a kopia trafia do folderu „Wysłane”.

import { connect } from 'cloudflare:sockets';

const enc = new TextEncoder();
const dec = new TextDecoder();

export function gmailConfigured(env) {
  return Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(env.GMAIL_USER).trim()));
}

export function gmailAddress(env) {
  return String(env.GMAIL_USER || '').trim().toLowerCase();
}

const b64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const b64utf8 = (text) => b64(enc.encode(text));
const wrap76 = (s) => s.replace(/.{1,76}/g, '$&\r\n');
/** Nagłówek z polskimi znakami (RFC 2047). */
const encWord = (text) => (/^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${b64utf8(text)}?=`);
const oneLine = (s) => String(s || '').replace(/[\r\n]+/g, ' ').trim();
const addrOnly = (s) => {
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(s) || /([^\s<>]+@[^\s<>]+)/.exec(s);
  return m ? m[1] : '';
};

function buildMessage({ fromName, from, to, subject, text, html, replyTo }) {
  const boundary = `b_${crypto.randomUUID().replace(/-/g, '')}`;
  const domain = from.split('@')[1] || 'localhost';
  const headers = [
    `From: ${encWord(fromName)} <${from}>`,
    `To: <${to}>`,
    `Subject: ${encWord(oneLine(subject).slice(0, 200))}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
  ];
  if (replyTo && addrOnly(replyTo)) headers.push(`Reply-To: <${addrOnly(replyTo)}>`);
  const part = (type, body) => `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(b64utf8(body))}`;
  if (html) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    return `${headers.join('\r\n')}\r\n\r\n${part('text/plain', text || '')}${part('text/html', html)}--${boundary}--\r\n`;
  }
  headers.push('Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64');
  return `${headers.join('\r\n')}\r\n\r\n${wrap76(b64utf8(text || ''))}`;
}

/** Wysyła jedną wiadomość. Zwraca { ok } albo { ok:false, error }. */
export async function sendViaGmail(env, { to, subject, text, html, replyTo, fromName }) {
  if (!gmailConfigured(env)) return { ok: false, skipped: true, error: 'Wysyłka z Gmaila nie jest skonfigurowana (GMAIL_USER i GMAIL_APP_PASSWORD).' };
  const from = gmailAddress(env);
  const rcpt = addrOnly(String(to || ''));
  if (!rcpt || /[\r\n\s<>]/.test(rcpt)) return { ok: false, error: 'Nieprawidłowy adres odbiorcy.' };
  const pass = String(env.GMAIL_APP_PASSWORD).replace(/\s+/g, '');
  const host = (env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(env.SMTP_PORT || 465);
  const secure = (env.SMTP_SECURE || 'on').trim() === 'off' ? 'off' : 'on';

  let socket;
  try {
    socket = connect({ hostname: host, port }, { secureTransport: secure, allowHalfOpen: false });
    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    let buf = '';
    const deadline = Date.now() + 20000;

    // Odpowiedź serwera: linie „250-…” (ciąg dalszy) i ostatnia „250 …”
    const read = async () => {
      for (;;) {
        const lines = buf.split('\r\n');
        for (let i = 0; i < lines.length - 1; i++) {
          if (/^\d{3} /.test(lines[i])) {
            const reply = lines.slice(0, i + 1).join('\n');
            buf = lines.slice(i + 1).join('\r\n');
            return { code: Number(lines[i].slice(0, 3)), text: reply };
          }
        }
        if (Date.now() > deadline) throw new Error('Serwer poczty nie odpowiada (przekroczono czas).');
        const { value, done } = await reader.read();
        if (done) throw new Error('Serwer poczty zamknął połączenie.');
        buf += dec.decode(value, { stream: true });
      }
    };
    const cmd = async (line, expect, label) => {
      if (line !== null) await writer.write(enc.encode(`${line}\r\n`));
      const r = await read();
      if (!expect.includes(r.code)) {
        const hint =
          r.code === 535 || r.code === 534
            ? ' Google odrzucił logowanie — sprawdź GMAIL_USER i hasło aplikacji (GMAIL_APP_PASSWORD), a w koncie Google włączoną weryfikację dwuetapową.'
            : '';
        throw new Error(`${label}: ${r.text.replace(/\s+/g, ' ').slice(0, 220)}.${hint}`);
      }
      return r;
    };

    await cmd(null, [220], 'Powitanie serwera');
    await cmd('EHLO strony-ai-wroclaw', [250], 'EHLO');
    await cmd('AUTH LOGIN', [334], 'Logowanie');
    await cmd(b64utf8(from), [334], 'Logowanie (użytkownik)');
    await cmd(b64utf8(pass), [235], 'Logowanie (hasło)');
    await cmd(`MAIL FROM:<${from}>`, [250], 'Nadawca');
    await cmd(`RCPT TO:<${rcpt}>`, [250, 251], 'Odbiorca');
    await cmd('DATA', [354], 'DATA');
    const msg = buildMessage({ fromName: fromName || 'Strony AI Wrocław', from, to: rcpt, subject, text, html, replyTo });
    await writer.write(enc.encode(`${msg.replace(/\r\n\./g, '\r\n..')}\r\n.\r\n`));
    await cmd(null, [250], 'Wysłanie treści');
    try {
      await writer.write(enc.encode('QUIT\r\n'));
    } catch {
      /* bez znaczenia */
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Gmail: ${String(e && e.message ? e.message : e).slice(0, 400)}` };
  } finally {
    try {
      if (socket) await socket.close();
    } catch {
      /* bez znaczenia */
    }
  }
}
