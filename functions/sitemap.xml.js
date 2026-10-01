import { siteOrigin } from './_lib/http.js';
import { ensureSchema, hasDb } from './_lib/db.js';

export async function onRequestGet({ env, request }) {
  const origin = siteOrigin(env, request);
  const urls = ['/', '/polityka-prywatnosci'];
  if (hasDb(env)) {
    try {
      await ensureSchema(env);
      const r = await env.DB.prepare(`SELECT slug FROM portfolio_projects WHERE status = 'published' AND card_ver IS NOT NULL AND slug IS NOT NULL ORDER BY sort_order`).all();
      for (const row of r.results || []) urls.push(`/portfolio/${row.slug}/`);
    } catch (e) {
      console.error(e);
    }
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${origin}${u}</loc></url>`).join('\n') +
    '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
