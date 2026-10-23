// Biblioteka zdjęć: warianty responsywne (mniejsze kopie zdjęcia do srcset).
//
// Oryginał zostaje bez zmian:   KV m/<uuid>.<ext>        →  /media/<uuid>.<ext>
// Warianty (nowe, opcjonalne):  KV m/<uuid>-w480.<ext>   →  /media/<uuid>-w480.<ext>   (w480, w640, w960, w1280)
//
// Warianty przygotowuje panel w przeglądarce (canvas). Serwer NIE ufa danym z przeglądarki:
// sam odczytuje format i wymiary z nagłówka pliku, sprawdza dozwoloną szerokość, proporcje i rozmiar.
// Klucze KV wariantów są zawsze wyliczane z UUID zdjęcia i zamkniętej listy nazw — nigdy nie są przyjmowane z zewnątrz.
// Zdjęcie bez wariantów (variants = '[]') jest wyświetlane dokładnie tak jak przed wprowadzeniem wariantów.

export const VARIANT_WIDTHS = [480, 640, 960, 1280];
export const VARIANT_NAMES = VARIANT_WIDTHS.map((w) => `w${w}`);
export const VARIANT_MAX_BYTES = 1024 * 1024;
const VARIANT_EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg' };
const EXTS = ['webp', 'jpg'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isUuid = (id) => UUID_RE.test(String(id || ''));

/** Klucz KV wariantu — tylko dla poprawnego UUID i nazwy z zamkniętej listy. */
export function variantKey(id, name, ext) {
  if (!isUuid(id) || !VARIANT_NAMES.includes(name) || !EXTS.includes(ext)) throw new Error('Nieprawidłowy klucz wariantu.');
  return `m/${id}-${name}.${ext}`;
}

/** Wszystkie możliwe klucze wariantów danego zdjęcia (do usuwania): 4 nazwy × 2 formaty, bez listowania KV. */
export function allVariantKeys(id) {
  if (!isUuid(id)) return [];
  const out = [];
  for (const n of VARIANT_NAMES) for (const e of EXTS) out.push(variantKey(id, n, e));
  return out;
}

/** Szerokości wariantów, które mają sens dla zdjęcia o danej szerokości (tylko mniejsze od oryginału). */
export const expectedVariants = (width) => VARIANT_WIDTHS.filter((w) => Number(width) > w).map((w) => `w${w}`);

// ---------- Odczyt formatu i wymiarów z nagłówka pliku (bez bibliotek) ----------
const u16le = (b, o) => b[o] | (b[o + 1] << 8);
const u24le = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u32le = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const u16be = (b, o) => (b[o] << 8) | b[o + 1];
const u32be = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const str = (b, o, n) => String.fromCharCode(...b.slice(o, o + n));

/** { type, width, height } albo null. Obsługuje WebP (VP8, VP8L, VP8X), JPEG (znaczniki SOF) i PNG (IHDR). */
export function imageInfo(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 30) return null;
  // WebP: RIFF....WEBP + pierwszy fragment
  if (str(b, 0, 4) === 'RIFF' && str(b, 8, 4) === 'WEBP') {
    const chunk = str(b, 12, 4);
    if (chunk === 'VP8 ' && b.length >= 30) {
      // ramka kluczowa: 3 bajty nagłówka + kod startowy 9d 01 2a
      if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
      return { type: 'image/webp', width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    }
    if (chunk === 'VP8L' && b.length >= 25) {
      if (b[20] !== 0x2f) return null;
      const bits = u32le(b, 21);
      return { type: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X' && b.length >= 30) {
      return { type: 'image/webp', width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
    }
    return null;
  }
  // PNG: IHDR zaraz po sygnaturze
  if (b[0] === 0x89 && str(b, 1, 3) === 'PNG' && str(b, 12, 4) === 'IHDR') {
    return { type: 'image/png', width: u32be(b, 16), height: u32be(b, 20) };
  }
  // JPEG: szukamy znacznika SOF (C0–CF bez C4, C8, CC)
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) return null;
      const m = b[o + 1];
      if (m === 0xff) { o++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue; }
      const len = u16be(b, o + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { type: 'image/jpeg', width: u16be(b, o + 7), height: u16be(b, o + 5) };
      }
      if (len < 2) return null;
      o += 2 + len;
    }
    return null;
  }
  return null;
}

/**
 * Sprawdzenie jednego wariantu względem RZECZYWISTYCH wymiarów oryginału.
 * Zwraca { ok:true, entry:{k,w,h,t,b}, ext } albo { ok:false, message }.
 */
export function checkVariant(name, bytes, original) {
  if (!VARIANT_NAMES.includes(name)) return { ok: false, message: 'Nieznana nazwa wariantu.' };
  if (!bytes || !bytes.length) return { ok: false, message: 'Pusty plik.' };
  if (bytes.length > VARIANT_MAX_BYTES) return { ok: false, message: 'Wariant jest za duży (maks. 1 MB).' };
  const info = imageInfo(bytes);
  if (!info || !VARIANT_EXT[info.type]) return { ok: false, message: 'Wariant musi być plikiem WebP lub JPG.' };
  const want = Number(name.slice(1));
  if (info.width !== want) return { ok: false, message: `Wariant ${name} ma szerokość ${info.width} px zamiast ${want} px.` };
  if (!(original && original.width > want && original.height > 0)) return { ok: false, message: 'Wariant musi być mniejszy od oryginału.' };
  const expectH = (want * original.height) / original.width;
  if (Math.abs(info.height - expectH) > Math.max(2, expectH * 0.01)) {
    return { ok: false, message: `Wariant ${name} ma inne proporcje niż oryginał (${info.width}×${info.height}).` };
  }
  return { ok: true, ext: VARIANT_EXT[info.type], entry: { k: name, w: info.width, h: info.height, t: VARIANT_EXT[info.type], b: bytes.length } };
}

/** Bezpieczne odczytanie kolumny media.variants — błędne lub obce wpisy są pomijane. */
export function parseVariants(text) {
  let arr;
  try {
    arr = JSON.parse(text || '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  return arr
    .filter((v) => v && VARIANT_NAMES.includes(v.k) && EXTS.includes(v.t) && Number.isInteger(v.w) && Number.isInteger(v.h) && v.w === Number(v.k.slice(1)) && v.h > 0)
    .filter((v) => (seen.has(v.k) ? false : seen.add(v.k)))
    .map((v) => ({ k: v.k, w: v.w, h: v.h, t: v.t, b: Number(v.b) || 0 }))
    .sort((a, b) => a.w - b.w);
}

/** Stan wariantów zdjęcia: 'nie-dotyczy' (zdjęcie ≤ 480 px), 'gotowe', 'czesciowe', 'brak'. */
export function variantStatus(width, variants) {
  const exp = expectedVariants(width);
  if (!exp.length) return 'nie-dotyczy';
  const have = new Set(variants.map((v) => v.k));
  const n = exp.filter((k) => have.has(k)).length;
  return n === exp.length ? 'gotowe' : n ? 'czesciowe' : 'brak';
}

export const variantUrl = (id, v) => `/media/${id}-${v.k}.${v.t}`;

// ---------- srcset / sizes (wartości wyliczone z reguł CSS: style.css, sekcje Portfolio v3 i Aktualności) ----------
export const SIZES = {
  // okładka pierwszego (wyróżnionego) projektu w grupie
  featured:
    '(max-width: 399px) calc(100vw - 74px), (max-width: 799px) calc(92vw - 42px), (max-width: 900px) calc(100vw - 106px), (max-width: 1179px) calc(56.52vw - 93px), 574px',
  // okładka kolejnych projektów
  normal:
    '(max-width: 399px) calc(100vw - 78px), (max-width: 700px) calc(92vw - 46px), (max-width: 799px) calc(46vw - 58px), (max-width: 1179px) calc(50vw - 90px), 500px',
  // zdjęcie w Aktualnościach
  post:
    '(max-width: 399px) calc(100vw - 34px), (max-width: 640px) calc(92vw - 2px), (max-width: 799px) calc(46vw - 14px), (max-width: 980px) calc(50vw - 46px), (max-width: 1179px) calc(33.34vw - 39px), 354px',
};
// Miniatury: szerokość kwadratu [max-width, vw, px] + szerokość stała powyżej 1179 px.
const THUMB = {
  featured: { steps: [[640, 30.67, 22], [900, 23, 18], [1179, 9.17, 13]], max: 95 },
  normal: { steps: [[640, 30.67, 23], [700, 23, 19.5], [799, 11.5, 22.5], [1179, 12.5, 30.5]], max: 117 },
};
const num = (x) => String(Math.round(x * 100) / 100);

/**
 * sizes miniatury z uwzględnieniem proporcji pliku: kwadrat z object-fit: cover wypełnia się WYSOKOŚCIĄ
 * zdjęcia poziomego, więc potrzebna szerokość pliku = bok kwadratu × (szerokość / wysokość).
 */
export function thumbSizes(kind, width, height) {
  const t = THUMB[kind] || THUMB.normal;
  const k = width > 0 && height > 0 ? Math.max(1, width / height) : 1;
  const parts = t.steps.map(([mq, vw, px]) => `(max-width: ${mq}px) calc(${num(vw * k)}vw - ${num(px * k)}px)`);
  parts.push(`${Math.ceil(t.max * k)}px`);
  return parts.join(', ');
}

const escAttr = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Znacznik <img> zdjęcia z biblioteki.
 * use: 'featured' | 'normal' | 'post' | 'thumb-featured' | 'thumb-normal'
 * Zdjęcie bez wariantów (albo bez znanych wymiarów) → DOKŁADNIE ten sam znacznik co przed zmianą.
 */
export function mediaImg(img, use) {
  const legacy = `<img src="${escAttr(img.url)}" alt="${escAttr(img.alt)}" loading="lazy" decoding="async"${
    img.width ? ` width="${Number(img.width)}" height="${Number(img.height)}"` : ''
  }>`;
  const vs = Array.isArray(img.variants) ? img.variants : [];
  const W = Number(img.width);
  const H = Number(img.height);
  if (!vs.length || !isUuid(img.id) || !(W > 0 && H > 0)) return legacy;
  const usable = vs.filter((v) => v.w < W);
  if (!usable.length) return legacy;
  const isThumb = use === 'thumb-featured' || use === 'thumb-normal';
  const list = isThumb ? usable.filter((v) => v.w <= 960) : usable;
  if (!list.length) return legacy;
  const cand = list.map((v) => `${variantUrl(img.id, v)} ${v.w}w`);
  // oryginał też jest źródłem (dla miniatur tylko, gdy nie jest większy niż 960 px)
  if (!isThumb || W <= 960) cand.push(`${img.url} ${W}w`);
  const pick = isThumb ? list[0] : list.find((v) => v.k === 'w960') || list[list.length - 1];
  const sizes = isThumb ? thumbSizes(use === 'thumb-featured' ? 'featured' : 'normal', W, H) : SIZES[use] || SIZES.normal;
  return `<img src="${escAttr(variantUrl(img.id, pick))}" srcset="${escAttr(cand.join(', '))}" sizes="${escAttr(sizes)}" alt="${escAttr(img.alt)}" loading="lazy" decoding="async" width="${W}" height="${H}">`;
}
