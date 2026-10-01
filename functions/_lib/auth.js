// Logowanie jednego administratora — bez zewnętrznych usług.
//
//  - Hasło NIE jest zapisane w kodzie. W Cloudflare zapisany jest tylko jego skrót
//    (zmienna tajna ADMIN_PASSWORD_HASH, format: pbkdf2-sha256$100000$sól$skrót),
//    wygenerowany narzędziem /admin/generator-hasla.html.
//  - Po zalogowaniu przeglądarka dostaje podpisane ciasteczko sesji (HttpOnly, Secure,
//    SameSite=Strict), ważne 12 godzin. Podpis: HMAC-SHA256 z tajnym SESSION_SECRET.
//  - Zmiana hasła (nowy ADMIN_PASSWORD_HASH) automatycznie unieważnia stare sesje.
//  - Limit: 5 nieudanych prób logowania na 15 minut z jednego adresu IP.

import { json } from './http.js';
import { ensureSchema, ipHash, sha256Hex, hasDb } from './db.js';

const COOKIE = 'sa_session';
const SESSION_HOURS = 12;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
export const PBKDF2_ITERATIONS = 100000; // maksimum obsługiwane przez Cloudflare Workers

const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (s) => {
  const str = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(str, (c) => c.charCodeAt(0));
};

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function authConfigured(env) {
  return Boolean(env.ADMIN_PASSWORD_HASH && /^pbkdf2-sha256\$\d+\$[^$]+\$[^$]+$/.test(String(env.ADMIN_PASSWORD_HASH).trim()) && env.SESSION_SECRET && String(env.SESSION_SECRET).length >= 32);
}

export async function verifyPassword(password, stored) {
  const [alg, iterStr, saltB64, hashB64] = String(stored).trim().split('$');
  const iterations = Number(iterStr);
  if (alg !== 'pbkdf2-sha256' || !iterations || iterations > PBKDF2_ITERATIONS) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations }, key, 256);
  return safeEqual(new Uint8Array(bits), fromB64(hashB64));
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

async function sessionVersion(env) {
  return (await sha256Hex(String(env.ADMIN_PASSWORD_HASH).trim())).slice(0, 16);
}

export async function createSessionCookie(env) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000, v: await sessionVersion(env) })));
  const sig = await hmac(env.SESSION_SECRET, payload);
  return `${COOKIE}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readCookie(request) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return '';
}

export async function hasValidSession(env, request) {
  if (!authConfigured(env)) return false;
  const token = readCookie(request);
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = await hmac(env.SESSION_SECRET, payload);
  if (!safeEqual(enc.encode(sig), enc.encode(expected))) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64(payload)));
    return data.exp > Date.now() && data.v === (await sessionVersion(env));
  } catch {
    return false;
  }
}

/** Sprawdza sesję administratora oraz (dla zmian) ochronę przed CSRF. Zwraca null albo odpowiedź z błędem. */
export async function guardAdmin(context) {
  const { request, env } = context;
  if (!hasDb(env)) return json({ ok: false, code: 'no_db', message: 'Brak powiązania bazy D1 o nazwie DB (Cloudflare → projekt → Settings → Bindings).' }, 503);
  if (!authConfigured(env)) return json({ ok: false, code: 'no_auth', message: 'Brak zmiennych ADMIN_PASSWORD_HASH i SESSION_SECRET w ustawieniach Cloudflare.' }, 503);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('Origin');
    if (request.headers.get('X-Panel') !== '1' || (origin && origin !== new URL(request.url).origin)) {
      return json({ ok: false, message: 'Niedozwolone żądanie.' }, 403);
    }
  }
  if (!(await hasValidSession(env, request))) return json({ ok: false, code: 'unauthorized', message: 'Sesja wygasła. Zaloguj się ponownie.' }, 401);
  await ensureSchema(env);
  return null;
}

/** Logowanie z limitem nieudanych prób. */
export async function login(context, password) {
  const { env, request } = context;
  await ensureSchema(env);
  const ip = await ipHash(env, request);
  const since = Date.now() - FAIL_WINDOW_MS;
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM login_attempts WHERE ip_hash = ? AND created_at > ?`).bind(ip, since).first();
  if (row && row.n >= MAX_FAILS) {
    return json({ ok: false, message: 'Zbyt wiele nieudanych prób. Odczekaj 15 minut i spróbuj ponownie.' }, 429);
  }
  const ok = typeof password === 'string' && password.length > 0 && password.length <= 200 && (await verifyPassword(password, env.ADMIN_PASSWORD_HASH));
  if (!ok) {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO login_attempts (ip_hash, created_at) VALUES (?, ?)`).bind(ip, Date.now()),
      env.DB.prepare(`DELETE FROM login_attempts WHERE created_at < ?`).bind(Date.now() - 24 * 3600 * 1000),
    ]);
    const left = MAX_FAILS - ((row ? row.n : 0) + 1);
    return json({ ok: false, message: left > 0 ? `Nieprawidłowe hasło. Pozostałe próby: ${left}.` : 'Nieprawidłowe hasło. Logowanie zablokowane na 15 minut.' }, 401);
  }
  await env.DB.prepare(`DELETE FROM login_attempts WHERE ip_hash = ?`).bind(ip).run();
  return json({ ok: true }, 200, { 'Set-Cookie': await createSessionCookie(env) });
}
