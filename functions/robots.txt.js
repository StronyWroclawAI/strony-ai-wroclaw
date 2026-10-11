import { siteOrigin, isPagesDev } from './_lib/http.js';

export function onRequestGet({ env, request }) {
  const origin = siteOrigin(env, request);
  // Adresy robocze *.pages.dev nie trafiają do wyszukiwarek — indeksowana jest tylko domena docelowa.
  const host = new URL(request.url).hostname;
  const isPreview = isPagesDev(request) && !String(env.SITE_URL || '').includes(host);
  const body = isPreview
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nDisallow: /admin/\nDisallow: /api/\nDisallow: /brief/\nDisallow: /logo/\nDisallow: /wybor-logo/\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
