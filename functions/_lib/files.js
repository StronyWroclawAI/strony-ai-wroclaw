// Pliki od klienta: logo i zdjęcia (z briefu albo dodane przez administratora w zgłoszeniu).
// Przechowywane w Cloudflare KV (powiązanie MEDIA) pod kluczami f/<id> oraz f/<id>/t (miniatura zdjęcia).
// Zdjęcia są zmniejszane w przeglądarce przed wysłaniem (do 2560 px), logo zapisujemy w oryginale.

import { uuid, nowIso } from './db.js';

export const FILE_LIMITS = {
  logo: { maxBytes: 20 * 1024 * 1024, maxCount: 6, types: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'application/pdf'] },
  photo: { maxBytes: 8 * 1024 * 1024, maxCount: 40, types: ['image/jpeg', 'image/png', 'image/webp'] },
};
export const MAX_TOTAL = 160 * 1024 * 1024; // na jedno zgłoszenie / brief
const THUMB_MAX = 400 * 1024;
const EXT = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' };

/** Rozpoznaje typ po zawartości (nie ufamy rozszerzeniu ani nagłówkom). */
export function sniffFile(bytes) {
  const s = (a, b) => String.fromCharCode(...bytes.slice(a, b));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && s(1, 4) === 'PNG') return 'image/png';
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WEBP') return 'image/webp';
  if (s(0, 5) === '%PDF-') return 'application/pdf';
  // SVG: tekst zaczynający się od <svg albo deklaracji XML / komentarza, z elementem <svg
  const head = new TextDecoder().decode(bytes.slice(0, 2048)).replace(/^﻿/, '').trimStart().toLowerCase();
  if ((head.startsWith('<svg') || head.startsWith('<?xml') || head.startsWith('<!--') || head.startsWith('<!doctype svg')) && head.includes('<svg')) return 'image/svg+xml';
  return null;
}

export function safeName(name, type) {
  const base = String(name || 'plik')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\.[A-Za-z0-9]{1,5}$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || 'plik';
  return `${base}.${EXT[type] || 'bin'}`;
}

/** Zapis pliku (i miniatury) z danych formularza. Zwraca { ok, file } albo { ok:false, status, message }. */
export async function saveUpload(env, { leadId, briefId, source, form }) {
  if (!env.MEDIA) return { ok: false, status: 503, message: 'Magazyn plików (KV, powiązanie MEDIA) nie jest skonfigurowany.' };
  const kind = form.get('kind') === 'photo' ? 'photo' : form.get('kind') === 'logo' ? 'logo' : null;
  if (!kind) return { ok: false, status: 400, message: 'Nieznany rodzaj pliku.' };
  const file = form.get('file');
  if (!file || typeof file === 'string') return { ok: false, status: 400, message: 'Nie wybrano pliku.' };
  const L = FILE_LIMITS[kind];
  if (file.size > L.maxBytes) return { ok: false, status: 413, message: `Plik jest za duży (maks. ${Math.round(L.maxBytes / 1048576)} MB).` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffFile(bytes);
  if (!type || !L.types.includes(type)) {
    return { ok: false, status: 415, message: kind === 'logo' ? 'Logo wgraj jako SVG, PDF, PNG, JPG lub WebP.' : 'Zdjęcia wgraj jako JPG, PNG lub WebP.' };
  }
  const where = leadId ? ['lead_id = ?', leadId] : ['brief_id = ?', briefId];
  const stats = await env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(size_bytes), 0) AS total, SUM(kind = ?) AS nk FROM lead_files WHERE ${where[0]}`).bind(kind, where[1]).first();
  if ((stats.nk || 0) >= L.maxCount) return { ok: false, status: 409, message: kind === 'logo' ? `Można dodać najwyżej ${L.maxCount} plików logo.` : `Można dodać najwyżej ${L.maxCount} zdjęć. Więcej zdjęć prześlij linkiem do folderu (np. Google Drive).` };
  if ((stats.total || 0) + bytes.length > MAX_TOTAL) return { ok: false, status: 409, message: 'Przekroczono łączny rozmiar plików dla tego zgłoszenia. Resztę prześlij linkiem do folderu (np. Google Drive).' };

  let thumb = null;
  const t = form.get('thumb');
  if (kind === 'photo' && t && typeof t !== 'string' && t.size <= THUMB_MAX) {
    const tb = new Uint8Array(await t.arrayBuffer());
    const tt = sniffFile(tb);
    if (tt === 'image/jpeg' || tt === 'image/webp' || tt === 'image/png') thumb = { bytes: tb, type: tt };
  }
  const id = uuid();
  const key = `f/${id}`;
  const width = Math.min(20000, Math.max(0, parseInt(form.get('width'), 10) || 0)) || null;
  const height = Math.min(20000, Math.max(0, parseInt(form.get('height'), 10) || 0)) || null;
  const name = safeName(form.get('name') || file.name, type);
  await env.MEDIA.put(key, bytes, { metadata: { contentType: type } });
  if (thumb) await env.MEDIA.put(`${key}/t`, thumb.bytes, { metadata: { contentType: thumb.type } });
  const row = { id, lead_id: leadId || null, brief_id: briefId || null, kind, source, name, content_type: type, size_bytes: bytes.length, width, height, kv_key: key, has_thumb: thumb ? 1 : 0, created_at: nowIso() };
  await env.DB.prepare(
    `INSERT INTO lead_files (id, lead_id, brief_id, kind, source, name, content_type, size_bytes, width, height, kv_key, has_thumb, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(row.id, row.lead_id, row.brief_id, row.kind, row.source, row.name, row.content_type, row.size_bytes, row.width, row.height, row.kv_key, row.has_thumb, row.created_at).run();
  return { ok: true, file: publicFile(row) };
}

export const publicFile = (r) => ({ id: r.id, kind: r.kind, source: r.source, name: r.name, content_type: r.content_type, size_bytes: r.size_bytes, width: r.width, height: r.height, has_thumb: Boolean(r.has_thumb), created_at: r.created_at });

/** Odpowiedź z plikiem. SVG i PDF z zabezpieczeniami (bez wykonywania skryptów). */
export async function serveFile(env, row, { thumb = false, download = false } = {}) {
  const key = thumb && row.has_thumb ? `${row.kv_key}/t` : row.kv_key;
  const { value, metadata } = await env.MEDIA.getWithMetadata(key, { type: 'stream' });
  if (!value) return new Response('Nie znaleziono pliku.', { status: 404 });
  const type = (metadata && metadata.contentType) || row.content_type || 'application/octet-stream';
  const h = new Headers({
    'Content-Type': type,
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  if (download || type === 'application/pdf') {
    const n = String(row.name || 'plik').replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
    h.set('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${n}"; filename*=UTF-8''${encodeURIComponent(row.name || 'plik')}`);
  }
  return new Response(value, { headers: h });
}

export async function deleteFileRow(env, row) {
  if (env.MEDIA) {
    try {
      await env.MEDIA.delete(row.kv_key);
      if (row.has_thumb) await env.MEDIA.delete(`${row.kv_key}/t`);
    } catch (e) {
      console.error('Nie usunięto pliku z KV', row.kv_key, e);
    }
  }
  await env.DB.prepare(`DELETE FROM lead_files WHERE id = ?`).bind(row.id).run();
}

/** Liczba plików w briefie — zapisywana w odpowiedziach (do podsumowania i tekstu dla AI). */
export async function fileCounts(env, { leadId, briefId }) {
  const rows = (await env.DB.prepare(`SELECT kind, COUNT(*) AS n FROM lead_files WHERE ${leadId ? 'lead_id' : 'brief_id'} = ? GROUP BY kind`).bind(leadId || briefId).all()).results || [];
  const out = { logo: 0, photo: 0 };
  rows.forEach((r) => (out[r.kind] = r.n));
  return out;
}

// ---------- Dokumenty projektu: inspiracje (zdjęcia, PDF) i wymagania klienta (PDF, DOCX, TXT, zdjęcia) ----------
// Dodaje wyłącznie administrator w zgłoszeniu. KV: d/<id> (+ d/<id>/t — miniatura zdjęcia).
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const DOC_LIMITS = {
  inspiration: { maxBytes: 20 * 1024 * 1024, maxCount: 40, types: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'], label: 'Inspiracje dodaj jako JPG, PNG, WebP, SVG lub PDF.' },
  requirement: { maxBytes: 20 * 1024 * 1024, maxCount: 15, types: ['application/pdf', DOCX, 'text/plain', 'image/jpeg', 'image/png', 'image/webp'], label: 'Wymagania dodaj jako PDF, DOCX, TXT albo zdjęcie (JPG, PNG, WebP).' },
};
export const DOCS_TOTAL = 200 * 1024 * 1024;
const DOC_EXT = { ...EXT, [DOCX]: 'docx', 'text/plain': 'txt' };

/** Typ dokumentu po zawartości; DOCX (archiwum ZIP z word/document.xml) i TXT (poprawny UTF-8) dodatkowo po nazwie. */
export function sniffDoc(bytes, name) {
  const t = sniffFile(bytes);
  if (t) return t;
  const n = String(name || '').toLowerCase();
  if (n.endsWith('.docx') && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const head = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 65536)));
    if (head.includes('word/') || head.includes('[Content_Types].xml')) return DOCX;
  }
  if (n.endsWith('.txt') && bytes.length <= 2 * 1024 * 1024) {
    try {
      const s = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!/[\u0000-\u0008\u000E-\u001F]/.test(s)) return 'text/plain';
    } catch {
      /* nie UTF-8 */
    }
  }
  return null;
}

export async function saveDoc(env, { leadId, form }) {
  if (!env.MEDIA) return { ok: false, status: 503, message: 'Magazyn plików (KV, powiązanie MEDIA) nie jest skonfigurowany.' };
  const kind = form.get('kind');
  const L = DOC_LIMITS[kind];
  if (!L) return { ok: false, status: 400, message: 'Nieznany rodzaj pliku.' };
  const file = form.get('file');
  if (!file || typeof file === 'string') return { ok: false, status: 400, message: 'Nie wybrano pliku.' };
  if (file.size > L.maxBytes) return { ok: false, status: 413, message: `Plik jest za duży (maks. ${Math.round(L.maxBytes / 1048576)} MB).` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const rawName = form.get('name') || file.name;
  const type = sniffDoc(bytes, rawName);
  if (!type || !L.types.includes(type)) return { ok: false, status: 415, message: L.label };
  const stats = await env.DB.prepare(`SELECT COALESCE(SUM(size_bytes), 0) AS total, SUM(kind = ?) AS nk FROM lead_docs WHERE lead_id = ?`).bind(kind, leadId).first();
  if ((stats.nk || 0) >= L.maxCount) return { ok: false, status: 409, message: `Można dodać najwyżej ${L.maxCount} plików w tej grupie.` };
  if ((stats.total || 0) + bytes.length > DOCS_TOTAL) return { ok: false, status: 409, message: 'Przekroczono łączny rozmiar plików projektu (200 MB).' };
  let thumb = null;
  const tf = form.get('thumb');
  if (/^image\/(jpeg|png|webp)$/.test(type) && tf && typeof tf !== 'string' && tf.size <= THUMB_MAX) {
    const tb = new Uint8Array(await tf.arrayBuffer());
    const tt = sniffFile(tb);
    if (tt === 'image/jpeg' || tt === 'image/webp' || tt === 'image/png') thumb = { bytes: tb, type: tt };
  }
  const id = uuid();
  const key = `d/${id}`;
  const width = Math.min(20000, Math.max(0, parseInt(form.get('width'), 10) || 0)) || null;
  const height = Math.min(20000, Math.max(0, parseInt(form.get('height'), 10) || 0)) || null;
  const base = safeName(rawName, 'x').replace(/\.bin$/, '');
  const name = `${base}.${DOC_EXT[type] || 'bin'}`;
  await env.MEDIA.put(key, bytes, { metadata: { contentType: type === 'text/plain' ? 'text/plain; charset=utf-8' : type } });
  if (thumb) await env.MEDIA.put(`${key}/t`, thumb.bytes, { metadata: { contentType: thumb.type } });
  const row = { id, lead_id: leadId, kind, name, content_type: type, size_bytes: bytes.length, width, height, kv_key: key, has_thumb: thumb ? 1 : 0, created_at: nowIso() };
  await env.DB.prepare(`INSERT INTO lead_docs (id, lead_id, kind, name, content_type, size_bytes, width, height, kv_key, has_thumb, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(row.id, row.lead_id, row.kind, row.name, row.content_type, row.size_bytes, row.width, row.height, row.kv_key, row.has_thumb, row.created_at)
    .run();
  return { ok: true, doc: publicDoc(row) };
}

export const publicDoc = (r) => ({ id: r.id, kind: r.kind, name: r.name, content_type: r.content_type, size_bytes: r.size_bytes, width: r.width, height: r.height, has_thumb: Boolean(r.has_thumb), created_at: r.created_at });

export async function deleteDocRow(env, row) {
  if (env.MEDIA) {
    try {
      await env.MEDIA.delete(row.kv_key);
      if (row.has_thumb) await env.MEDIA.delete(`${row.kv_key}/t`);
    } catch (e) {
      console.error('Nie usunięto dokumentu z KV', row.kv_key, e);
    }
  }
  await env.DB.prepare(`DELETE FROM lead_docs WHERE id = ?`).bind(row.id).run();
}
