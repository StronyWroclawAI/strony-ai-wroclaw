// Media społecznościowe: adresy profili (Facebook, Instagram) i osadzanie oryginalnych postów.
// Treści NIE są pobierane automatycznie z Facebooka ani Instagrama — posty pisze się w panelu,
// a osadzenie oryginału ładuje się w przeglądarce dopiero po kliknięciu odwiedzającego.

const HOSTS = {
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.com', 'www.fb.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
};

function parse(value) {
  const v = String(value || '').trim();
  if (!v) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (u.username || u.password) return null;
    u.protocol = 'https:';
    u.hash = '';
    return u;
  } catch {
    return null;
  }
}

/** Rodzaj serwisu dla adresu (facebook / instagram) albo null. */
export function socialKind(value) {
  const u = parse(value);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  for (const [k, hosts] of Object.entries(HOSTS)) if (hosts.includes(host)) return k;
  return null;
}

/**
 * Adres profilu: { ok, value } — pusty = brak profilu.
 * Przyjmuje też samą nazwę profilu (np. „stronyaiwroclaw” albo „@stronyaiwroclaw”).
 */
export function profileUrl(kind, value) {
  let v = String(value || '').trim();
  if (!v) return { ok: true, value: null };
  if (v.length > 300) return { ok: false };
  if (/^@?[A-Za-z0-9._-]{2,60}$/.test(v) && !v.includes('.com')) {
    v = `https://www.${kind}.com/${v.replace(/^@/, '')}`;
  }
  const u = parse(v);
  if (!u || socialKind(u.href) !== kind) return { ok: false };
  if (u.pathname === '/' && !u.search) return { ok: false };
  if (kind === 'instagram') u.hostname = 'www.instagram.com';
  if (kind === 'facebook' && ['m.facebook.com', 'web.facebook.com', 'facebook.com'].includes(u.hostname)) u.hostname = 'www.facebook.com';
  return { ok: true, value: u.href };
}

/**
 * Adres ramki do osadzenia oryginalnego posta albo null, gdy adres nie wskazuje posta.
 * Facebook: oficjalna wtyczka posta / wideo. Instagram: oficjalna strona osadzenia /p/…/embed/.
 */
export function embedInfo(value) {
  const u = parse(value);
  if (!u) return null;
  const kind = socialKind(u.href);
  if (kind === 'instagram') {
    const m = u.pathname.match(/^\/(?:[A-Za-z0-9._]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]{5,40})\/?/);
    if (!m) return null;
    return { kind, src: `https://www.instagram.com/${m[1] === 'tv' ? 'p' : m[1]}/${m[2]}/embed/captioned/`, ratio: 'tall' };
  }
  if (kind === 'facebook') {
    const p = u.pathname;
    const isVideo = /\/videos\/|\/reel\/|^\/watch\/?$/.test(p);
    const isPost = isVideo || /\/posts\/|\/photos\/|^\/permalink\.php$|^\/story\.php$|^\/photo(\.php)?\/?$|^\/share\/[pvr]\//.test(p);
    if (!isPost) return null;
    u.hostname = 'www.facebook.com';
    const href = encodeURIComponent(u.href);
    return isVideo
      ? { kind, src: `https://www.facebook.com/plugins/video.php?href=${href}&show_text=true&width=500`, ratio: 'video' }
      : { kind, src: `https://www.facebook.com/plugins/post.php?href=${href}&show_text=true&width=500`, ratio: 'tall' };
  }
  return null;
}

export const SOCIAL_NAMES = { facebook: 'Facebook', instagram: 'Instagram' };
