import { siteOrigin } from './_lib/http.js';
import { ensureSchema, hasDb } from './_lib/db.js';
import { SITE_PAGES } from './_lib/pages.js';

// <lastmod> tylko tam, gdzie znamy prawdziwą datę zmiany treści:
// - podstrony z buildu: data „modified” z work/pages/pages.mjs (build pilnuje, by zmieniała się razem z treścią),
// - karty projektów: data wgrania aktualnej karty (card_at).
// Strona główna, polityka prywatności i /realizacje/ (treści z panelu) — bez lastmod.
const day = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : null);

export async function onRequestGet({ env, request }) {
  const origin = siteOrigin(env, request);
  const urls = [{ loc: '/' }, ...SITE_PAGES.map((p) => ({ loc: p.path, lastmod: day(p.lastmod) })), { loc: '/polityka-prywatnosci' }];
  if (hasDb(env)) {
    try {
      await ensureSchema(env);
      const r = await env.DB.prepare(`SELECT slug, card_at FROM portfolio_projects WHERE status = 'published' AND card_ver IS NOT NULL AND slug IS NOT NULL ORDER BY sort_order`).all();
      for (const row of r.results || []) urls.push({ loc: `/portfolio/${row.slug}/`, lastmod: day(row.card_at) });
    } catch (e) {
      console.error(e);
    }
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${origin}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') +
    '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
