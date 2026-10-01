import { siteOrigin } from './_lib/http.js';

export function onRequestGet({ env, request }) {
  const origin = siteOrigin(env, request);
  const urls = ['/', '/polityka-prywatnosci'];
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${origin}${u}</loc></url>`).join('\n') +
    '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
