import { siteOrigin } from './_lib/http.js';

export function onRequestGet({ env, request }) {
  const origin = siteOrigin(env, request);
  // Wersje robocze pod adresem *.pages.dev nie powinny trafiać do wyszukiwarek, gdy jest już domena docelowa.
  const host = new URL(request.url).hostname;
  const isPreview = host.endsWith('.pages.dev') && env.SITE_URL && !String(env.SITE_URL).includes(host);
  const body = isPreview
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nDisallow: /admin/\nDisallow: /api/\nDisallow: /brief/\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
