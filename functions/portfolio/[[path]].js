// GET /portfolio/<adres>/… — karty projektów wgrane w panelu (Portfolio → Karta projektu).
// Opublikowane karty widzi każdy; szkice tylko zalogowany administrator (podgląd).
import { ensureSchema, hasDb } from '../_lib/db.js';
import { hasValidSession } from '../_lib/auth.js';
import { SLUG_RE, PATH_RE, cardHeaders, rewriteCardHead } from '../_lib/card.js';
import { siteOrigin, notFoundPage } from '../_lib/http.js';
import { recordVisit } from '../_lib/stats.js';


export async function onRequestGet({ request, env, params, waitUntil }) {
  const url = new URL(request.url);
  const notFound = () => notFoundPage(env, url);
  const seg = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  // Lista wszystkich projektów jest pod /realizacje/ (stałe przekierowanie, parametry zachowane)
  if (!seg.length) return Response.redirect(`${url.origin}/realizacje/${url.search}`, 301);
  const slug = seg[0];
  if (!SLUG_RE.test(slug)) return notFound();
  // Bez ukośnika na końcu względne ścieżki obrazów (img/…) by nie działały.
  if (seg.length === 1 && !url.pathname.endsWith('/')) return Response.redirect(`${url.origin}/portfolio/${slug}/${url.search}`, 301);
  let path = seg.slice(1).join('/');
  if (!path || url.pathname.endsWith('/')) path = path ? `${path}/index.html` : 'index.html';
  if (!PATH_RE.test(path)) return notFound();
  if (!hasDb(env) || !env.MEDIA) return notFound();

  await ensureSchema(env);
  const p = await env.DB.prepare(`SELECT id, status, card_ver, title, industry, description, is_demo, seo_for, slug, card_cover FROM portfolio_projects WHERE slug = ?`).bind(slug).first();
  if (!p || !p.card_ver) return notFound();
  let preview = false;
  if (p.status !== 'published') {
    if (!(await hasValidSession(env, request))) return notFound();
    preview = true;
  }
  const f = await env.DB.prepare(`SELECT kv_key, content_type FROM portfolio_files WHERE project_id = ? AND ver = ? AND path = ?`).bind(p.id, p.card_ver, path).first();
  if (!f) return notFound();
  const obj = await env.MEDIA.get(f.kv_key, { type: 'stream' });
  if (!obj) return notFound();
  const isHtml = f.content_type.startsWith('text/html');
  if (isHtml && !preview) waitUntil(recordVisit(env, request, `/portfolio/${slug}`));
  const res = new Response(obj, { headers: cardHeaders(f.content_type, { html: isHtml, preview }) });
  // Główna strona karty: tytuł, opis i canonical „projekt strony internetowej dla …” (treść karty bez zmian)
  if (isHtml && path === 'index.html') return rewriteCardHead(res, p, siteOrigin(env, request));
  return res;
}
