// Karty projektów w portfolio — pliki z paczki ZIP (index.html + obrazy itp.),
// przechowywane w KV pod kluczami pf/<id projektu>/<wersja>/<ścieżka>.

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const VER_RE = /^[a-f0-9]{8,16}$/;
// Ścieżka względna: litery, cyfry, kropka, myślnik, podkreślnik; bez „..” i ukrytych plików.
export const PATH_RE = /^(?!.*(?:^|\/)\.)[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}){0,5}$/;

export const MAX_FILE = 10 * 1024 * 1024;
export const MAX_TOTAL = 40 * 1024 * 1024;
export const MAX_FILES = 200;

export const CARD_TYPES = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
};

export function extOf(path) {
  const m = /\.([A-Za-z0-9]+)$/.exec(path);
  return m ? m[1].toLowerCase() : '';
}

export function isImagePath(path) {
  return ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'].includes(extOf(path));
}

/** Sprawdza „magiczne bajty” obrazów, żeby rozszerzenie nie kłamało. */
export function sniffOk(ext, b) {
  const s = (a, z) => String.fromCharCode(...b.slice(a, z));
  switch (ext) {
    case 'png':
      return b[0] === 0x89 && s(1, 4) === 'PNG';
    case 'jpg':
    case 'jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'webp':
      return s(0, 4) === 'RIFF' && s(8, 12) === 'WEBP';
    case 'gif':
      return s(0, 4) === 'GIF8';
    case 'avif':
      return s(4, 8) === 'ftyp';
    case 'pdf':
      return s(0, 5) === '%PDF-';
    case 'woff2':
      return s(0, 4) === 'wOF2';
    case 'woff':
      return s(0, 4) === 'wOFF';
    default:
      return true;
  }
}

export function slugify(text) {
  return (
    String(text || '')
      .toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'projekt'
  );
}

/**
 * Nagłówki dla plików karty. Karta działa w piaskownicy (CSP sandbox bez allow-same-origin):
 * jej skrypty działają, ale nie mają dostępu do ciasteczek, panelu ani API strony.
 */
export function cardHeaders(contentType, { html = false, preview = false } = {}) {
  const h = new Headers({
    'Content-Type': contentType,
    'Content-Security-Policy': [
      'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads allow-top-navigation-to-custom-protocols',
      "default-src 'self' https: data: blob:",
      "script-src 'self' 'unsafe-inline' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' https: data: blob:",
      "font-src 'self' https: data:",
      "media-src 'self' https: blob:",
      "connect-src 'self' https:",
      "frame-src https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action https: mailto:",
      "frame-ancestors 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'X-Frame-Options': 'DENY',
    'Cache-Control': preview ? 'no-store' : html ? 'public, max-age=0, must-revalidate' : 'public, max-age=600',
  });
  if (preview) h.set('X-Robots-Tag', 'noindex, nofollow');
  return h;
}

/** Usuwa pliki karty projektu (wszystkie albo wszystkie poza wersją keepVer). */
export async function deleteCardFiles(env, projectId, keepVer = null) {
  const rows = (
    await env.DB.prepare(`SELECT ver, path, kv_key FROM portfolio_files WHERE project_id = ?${keepVer ? ' AND ver != ?' : ''}`)
      .bind(...(keepVer ? [projectId, keepVer] : [projectId]))
      .all()
  ).results || [];
  if (env.MEDIA) {
    for (const r of rows) {
      try {
        await env.MEDIA.delete(r.kv_key);
      } catch (e) {
        console.error('Nie usunięto pliku karty z KV', r.kv_key, e);
      }
    }
  }
  if (keepVer) await env.DB.prepare(`DELETE FROM portfolio_files WHERE project_id = ? AND ver != ?`).bind(projectId, keepVer).run();
  else await env.DB.prepare(`DELETE FROM portfolio_files WHERE project_id = ?`).bind(projectId).run();
  return rows.length;
}

export const cardUrl = (slug, path = '') => `/portfolio/${slug}/${path}`;
