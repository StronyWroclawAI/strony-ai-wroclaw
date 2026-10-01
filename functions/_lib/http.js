// Pomocnicze funkcje HTTP używane przez funkcje serwerowe.

export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
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

/** Adres strony: zmienna SITE_URL albo adres, pod który przyszło żądanie. */
export function siteOrigin(env, request) {
  const fromEnv = (env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//.test(fromEnv)) return fromEnv;
  return new URL(request.url).origin;
}

export function contactEmail(env) {
  return (env.NOTIFY_TO || 'stronywroclawai@gmail.com').trim();
}
