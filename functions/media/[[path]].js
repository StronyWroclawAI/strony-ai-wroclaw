// GET /media/<plik> — zdjęcia z magazynu Cloudflare KV (powiązanie MEDIA): oryginały i ich warianty responsywne.
const NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/;
// Warianty responsywne: <uuid>-w480|w640|w960|w1280.webp|jpg (functions/_lib/media.js)
const VARIANT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-w(480|640|960|1280)\.(webp|jpg)$/;

export async function onRequestGet({ params, env }) {
  const name = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (!(NAME_RE.test(name) || VARIANT_RE.test(name)) || !env.MEDIA) return new Response('Nie znaleziono', { status: 404 });
  const { value, metadata } = await env.MEDIA.getWithMetadata(`m/${name}`, { type: 'stream' });
  if (!value) return new Response('Nie znaleziono', { status: 404 });
  return new Response(value, {
    headers: {
      'Content-Type': (metadata && metadata.contentType) || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}
