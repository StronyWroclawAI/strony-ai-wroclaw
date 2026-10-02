// /logo/<token>            — strona wyboru logo i hasła dla klienta (nasza ramka + formularz)
// /logo/<token>/propozycje — plik HTML z propozycjami wgrany w panelu (wyświetlany w piaskownicy)
import { withSecurityHeaders } from '../_lib/http.js';
import { ensureSchema, hasDb, nowIso } from '../_lib/db.js';
import { TOKEN_RE } from '../_lib/brief.js';

const gone = () => new Response('Nie znaleziono propozycji. Link mógł zostać zastąpiony nowym — napisz na stronywroclawai@gmail.com.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const seg = Array.isArray(params.path) ? params.path : [];
  const token = seg[0] || '';
  if (!TOKEN_RE.test(token) || seg.length > 2) return gone();

  if (seg[1] === 'propozycje') {
    if (!hasDb(env) || !env.MEDIA) return gone();
    await ensureSchema(env);
    const p = await env.DB.prepare(`SELECT id, kv_key FROM logo_proposals WHERE token = ?`).bind(token).first();
    if (!p) return gone();
    const obj = await env.MEDIA.get(p.kv_key, { type: 'stream' });
    if (!obj) return gone();
    await env.DB.prepare(`UPDATE logo_proposals SET opened_at = COALESCE(opened_at, ?) WHERE id = ?`).bind(nowIso(), p.id).run();
    return new Response(obj, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Piaskownica: skrypty z pliku działają, ale bez dostępu do ciasteczek i API strony.
        'Content-Security-Policy': [
          'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads',
          "default-src 'self' https: data: blob:",
          "script-src 'unsafe-inline' https:",
          "style-src 'unsafe-inline' https:",
          "img-src https: data: blob:",
          "font-src https: data:",
          "connect-src https:",
          "object-src 'none'",
          "base-uri 'none'",
          "form-action 'none'",
          "frame-ancestors 'self'",
        ].join('; '),
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store',
      },
    });
  }
  if (seg[1]) return gone();

  const url = new URL(request.url);
  url.pathname = '/wybor-logo/';
  url.search = '';
  const asset = env.ASSETS ? await env.ASSETS.fetch(new Request(url.toString())) : await context.next();
  const headers = withSecurityHeaders(asset.headers);
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
  headers.delete('ETag');
  headers.delete('Last-Modified');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Referrer-Policy', 'no-referrer');
  return new Response(asset.body, { status: asset.status === 304 ? 200 : asset.status, headers });
}
