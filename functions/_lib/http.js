// Pomocnicze funkcje HTTP używane przez funkcje serwerowe.

export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com https://www.facebook.com https://www.instagram.com",
    "connect-src 'self'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-Frame-Options': 'DENY',
};

export function withSecurityHeaders(headers) {
  const h = new Headers(headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) h.set(k, v);
  return h;
}

export function json(data, status = 200, extraHeaders = {}) {
  const h = withSecurityHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  return new Response(JSON.stringify(data), { status, headers: h });
}

/** Docelowy (kanoniczny) adres strony — bez „www”. Można go nadpisać zmienną SITE_URL. */
export const CANONICAL_ORIGIN = 'https://stronyaiwroclaw.pl';

/** Czy żądanie przyszło na adres roboczy Cloudflare (*.pages.dev)? */
export const isPagesDev = (request) => new URL(request.url).hostname.endsWith('.pages.dev');

/**
 * Adres strony: zmienna SITE_URL; na adresach *.pages.dev i „www.” — domena docelowa;
 * w pozostałych przypadkach (np. podgląd lokalny) — adres, pod który przyszło żądanie.
 */
export function siteOrigin(env, request) {
  const fromEnv = (env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//.test(fromEnv)) return fromEnv;
  const url = new URL(request.url);
  if (url.hostname.endsWith('.pages.dev') || url.hostname.startsWith('www.')) return CANONICAL_ORIGIN;
  return url.origin;
}

export function contactEmail(env) {
  return (env.NOTIFY_TO || 'stronywroclawai@gmail.com').trim();
}
