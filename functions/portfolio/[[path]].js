// GET /portfolio/<adres>/… — karty projektów wgrane w panelu (Portfolio → Karta projektu).
// Opublikowane karty widzi każdy; szkice tylko zalogowany administrator (podgląd).
import { ensureSchema, hasDb } from '../_lib/db.js';
import { hasValidSession } from '../_lib/auth.js';
import { SLUG_RE, PATH_RE, cardHeaders } from '../_lib/card.js';

const notFound = () =>
  new Response('<!doctype html><meta charset="utf-8"><title>Nie znaleziono</title><p style="font-family:sans-serif">Nie znaleziono tej karty projektu. <a href="/#portfolio">Wróć do portfolio</a></p>', {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url);
  const seg = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  if (!seg.length) return Response.redirect(`${url.origin}/#portfolio`, 302);
  const slug = seg[0];
  if (!SLUG_RE.test(slug)) return notFound();
  // Bez ukośnika na końcu względne ścieżki obrazów (img/…) by nie działały.
  if (seg.length === 1 && !url.pathname.endsWith('/')) return Response.redirect(`${url.origin}/portfolio/${slug}/${url.search}`, 301);
  let path = seg.slice(1).join('/');
  if (!path || url.pathname.endsWith('/')) path = path ? `${path}/index.html` : 'index.html';
  if (!PATH_RE.test(path)) return notFound();
  if (!hasDb(env) || !env.MEDIA) return notFound();

  await ensureSchema(env);
  const p = await env.DB.prepare(`SELECT id, status, card_ver FROM portfolio_projects WHERE slug = ?`).bind(slug).first();
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
  return new Response(obj, { headers: cardHeaders(f.content_type, { html: f.content_type.startsWith('text/html'), preview }) });
}
