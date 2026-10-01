// /brief/<token> — strona briefu dla klienta (ten sam plik HTML dla każdego linku).
import { withSecurityHeaders } from '../_lib/http.js';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const seg = Array.isArray(params.path) ? params.path : [];
  // Pliki strony briefu (schema.js, brief.js, brief.css) serwuje zwykły serwer plików.
  if (seg.some((s) => s.includes('.'))) return context.next();
  const url = new URL(request.url);
  url.pathname = '/brief/';
  url.search = '';
  const asset = env.ASSETS ? await env.ASSETS.fetch(new Request(url.toString())) : await context.next();
  const headers = withSecurityHeaders(asset.headers);
  headers.delete('ETag');
  headers.delete('Last-Modified');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Referrer-Policy', 'no-referrer');
  return new Response(asset.body, { status: asset.status === 304 ? 200 : asset.status, headers });
}
