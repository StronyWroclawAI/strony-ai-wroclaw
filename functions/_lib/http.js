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
  return (env.NOTIFY_TO || 'stronyaiwroclaw@gmail.com').trim();
}

/**
 * Strona „Nie znaleziono” (public/404.html) z kodem 404 i noindex.
 * Serwer plików podaje ten plik pod adresem /404 z kodem 200 — tu zawsze ustawiamy 404.
 */
export async function notFoundPage(env, url) {
  let body = '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Nie znaleziono strony</title><p><a href="/">Strona główna</a></p>';
  try {
    if (env && env.ASSETS) {
      const r = await env.ASSETS.fetch(new Request(new URL('/404', url).toString()));
      if (r.status === 200 && (r.headers.get('Content-Type') || '').includes('text/html')) body = await r.text();
    }
  } catch (e) {
    console.error('Nie udało się wczytać strony 404', e);
  }
  const h = withSecurityHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
  return new Response(body, { status: 404, headers: h });
}
