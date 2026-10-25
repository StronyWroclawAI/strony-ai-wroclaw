// Wspólne reguły dla wszystkich adresów obsługiwanych przez funkcje:
// 1) www.stronyaiwroclaw.pl → stronyaiwroclaw.pl (przekierowanie stałe 301, ta sama ścieżka i parametry),
// 2) adresy robocze *.pages.dev dostają nagłówek „noindex” (w Google ma być tylko domena docelowa).
// 3) strona błędu wywołana bezpośrednio (/404, /404.html) zwraca kod 404 — nie 200.
// Pliki z /assets/* nie przechodzą przez funkcje (public/_routes.json) — nie zużywają limitu wywołań.
import { notFoundPage } from './_lib/http.js';

const ERROR_PATHS = new Set(['/404', '/404/', '/404.html']);
// Podstrony z buildu mają jeden adres — z ukośnikiem na końcu (/poradnik/…/). Wersja bez ukośnika → 301.
const SLASH_RE = /^\/(?:realizacje|poradnik|dla-branz|oferta|o-mnie|kontakt)(?:\/[a-z0-9-]+)?$/;

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname.startsWith('www.')) {
    url.hostname = url.hostname.slice(4);
    url.protocol = 'https:';
    url.port = '';
    const method = context.request.method;
    // 301 dla zwykłych wejść; 308 zachowuje metodę (np. POST formularza wysłany ze starej karty www)
    return new Response(null, { status: method === 'GET' || method === 'HEAD' ? 301 : 308, headers: { Location: url.toString(), 'Cache-Control': 'public, max-age=3600' } });
  }
  if (SLASH_RE.test(url.pathname) && (context.request.method === 'GET' || context.request.method === 'HEAD')) {
    return new Response(null, { status: 301, headers: { Location: `${url.pathname}/${url.search}`, 'Cache-Control': 'public, max-age=3600' } });
  }
  const res = ERROR_PATHS.has(url.pathname) ? await notFoundPage(context.env, url) : await context.next();
  if (url.hostname.endsWith('.pages.dev')) {
    const out = new Response(res.body, res);
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  }
  return res;
}
