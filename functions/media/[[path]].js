// GET /media/<plik> — zdjęcia z magazynu Cloudflare KV (powiązanie MEDIA).
const NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/;

export async function onRequestGet({ params, env }) {
  const name = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (!NAME_RE.test(name) || !env.MEDIA) return new Response('Nie znaleziono', { status: 404 });
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
