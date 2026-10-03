// Wstawia do statycznego HTML treści z bazy D1 (po stronie serwera, przez HTMLRewriter).
// Gdy baza jest niedostępna lub nieskonfigurowana, strona pokazuje treści domyślne z pliku HTML.

import { ensureSchema, hasDb, mediaUrl } from './db.js';
import { withSecurityHeaders, siteOrigin } from './http.js';
import {
  renderIndustries,
  renderIndustryOptions,
  renderCapabilities,
  renderFaq,
  renderLines,
  renderPortfolio,
} from './render.js';
import { recordVisit } from './stats.js';

const PRIVACY_REQUIRED = ['privacy.controller_name', 'privacy.db_region', 'privacy.retention', 'privacy.updated', 'privacy.transfer_check'];

export async function loadContent(context) {
  const { env } = context;
  if (!hasDb(env)) return null;
  try {
    await ensureSchema(env);
    const db = env.DB;
    const [content, settings, industries, capabilities, faq, projects, images] = await db.batch([
      db.prepare(`SELECT key, value FROM site_content`),
      db.prepare(`SELECT recruitment_open, contact_email FROM settings WHERE id = 1`),
      db.prepare(`SELECT name, description FROM industries WHERE is_published = 1 ORDER BY sort_order, created_at`),
      db.prepare(`SELECT title, description, size FROM capabilities WHERE is_published = 1 ORDER BY sort_order, created_at`),
      db.prepare(`SELECT question, answer FROM faq_items WHERE is_published = 1 ORDER BY sort_order, created_at`),
      db.prepare(`SELECT id, title, industry, description, site_url, slug, tags, is_demo, card_ver, card_cover FROM portfolio_projects WHERE status = 'published' ORDER BY sort_order, created_at DESC`),
      db.prepare(`SELECT pi.project_id, m.kv_key, m.alt, m.width, m.height FROM portfolio_images pi
                  JOIN media m ON m.id = pi.media_id
                  JOIN portfolio_projects p ON p.id = pi.project_id AND p.status = 'published'
                  ORDER BY pi.sort_order`),
    ]);
    const map = {};
    for (const row of content.results) map[row.key] = row.value;
    const s = settings.results[0] || {};
    const imgs = images.results;
    return {
      content: map,
      recruitmentOpen: s.recruitment_open !== 0,
      contactEmail: s.contact_email || null,
      industries: industries.results,
      capabilities: capabilities.results,
      faq: faq.results,
      projects: projects.results.map((p) => ({
        ...p,
        images: imgs.filter((i) => i.project_id === p.id).map((i) => ({ url: mediaUrl(i.kv_key), alt: i.alt, width: i.width, height: i.height })),
      })),
    };
  } catch (e) {
    console.error('Nie udało się pobrać treści z bazy — używam treści domyślnych.', e);
    return null;
  }
}

export async function renderPage(context) {
  const { request, env } = context;
  // Licznik odwiedzin (bez cookies) — w tle, nie spowalnia strony.
  context.waitUntil(recordVisit(env, request, new URL(request.url).pathname.replace(/\/+$/, '') || '/'));
  // Pobieramy plik HTML BEZ nagłówków warunkowych (If-None-Match / If-Modified-Since).
  // Inaczej serwer plików odpowiadałby „304 — bez zmian” (plik się nie zmienił),
  // a przeglądarka pokazywałaby starą wersję mimo zmian zapisanych w panelu.
  const assetUrl = new URL(request.url);
  assetUrl.search = '';
  const asset = env.ASSETS ? await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: 'GET' })) : await context.next();
  const type = asset.headers.get('Content-Type') || '';
  if (!asset.ok || !type.includes('text/html')) return asset;

  const origin = siteOrigin(env, request);
  const data = await loadContent(context);
  const c = data ? data.content : {};
  const turnstileKey = (env.TURNSTILE_SITE_KEY || '').trim();

  let rw = new HTMLRewriter()
    // Adresy bezwzględne dla canonical i Open Graph
    .on('[data-abs]', {
      element(el) {
        const attr = el.getAttribute('data-abs');
        const v = el.getAttribute(attr) || '';
        if (v.startsWith('/')) el.setAttribute(attr, origin + v);
        el.removeAttribute('data-abs');
      },
    })
    // Cloudflare Turnstile — tylko gdy skonfigurowano klucz
    .on('[data-turnstile]', {
      element(el) {
        if (!turnstileKey) return;
        el.setAttribute('class', 'turnstile-box cf-turnstile');
        el.setAttribute('data-sitekey', turnstileKey);
        el.setAttribute('data-language', 'pl');
        el.setAttribute('data-theme', 'light');
        el.setAttribute('data-size', 'flexible');
      },
    })
    .on('head', {
      element(el) {
        if (turnstileKey) {
          el.append('<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>', { html: true });
        }
      },
    });

  if (data) {
    const email = data.contactEmail;
    const privacyComplete = PRIVACY_REQUIRED.every((k) => (c[k] || '').trim());
    const lists = {
      industries: () => (data.industries.length ? renderIndustries(data.industries) : null),
      'industry-options': () => renderIndustryOptions(data.industries),
      capabilities: () => (data.capabilities.length ? renderCapabilities(data.capabilities) : null),
      faq: () => (data.faq.length ? renderFaq(data.faq) : null),
      portfolio: () => renderPortfolio(data.projects),
    };

    rw = rw
      .on('[data-cms]', {
        element(el) {
          const v = c[el.getAttribute('data-cms')];
          if (v === undefined || v === null) return;
          const t = String(v).trim();
          if (t === '-') {
            // pole formularza zostaje, tylko bez treści (np. pusty szkic wiadomości)
            if (el.tagName === 'textarea') el.setInnerContent('');
            else el.remove();
          }
          else if (t) el.setInnerContent(el.tagName === 'textarea' ? String(v).replace(/^\n+|\s+$/g, '') : t);
        },
      })
      .on('[data-cms-lines]', {
        element(el) {
          const v = c[el.getAttribute('data-cms-lines')];
          if (v && v.trim()) el.setInnerContent(renderLines(v), { html: true });
        },
      })
      .on('[data-cms-email]', {
        element(el) {
          if (!email) return;
          el.setAttribute('href', `mailto:${email}`);
          el.setInnerContent(email);
        },
      })
      .on('[data-cms-list]', {
        element(el) {
          const fn = lists[el.getAttribute('data-cms-list')];
          const html = fn ? fn() : null;
          if (html !== null && html !== undefined) el.setInnerContent(html, { html: true });
        },
      })
      .on('[data-cms-block]', {
        element(el) {
          const name = el.getAttribute('data-cms-block');
          const show = (cond) => {
            if (cond) el.removeAttribute('hidden');
            else el.remove();
          };
          if (name === 'form-open') show(data.recruitmentOpen);
          else if (name === 'form-closed') show(!data.recruitmentOpen);
          else if (name === 'portfolio' || name === 'nav-portfolio') show(data.projects.length > 0);
          else if (name === 'privacy-draft') show(!privacyComplete);
        },
      });
  }

  const res = rw.transform(asset);
  const headers = withSecurityHeaders(res.headers);
  // Treść zależy od bazy, więc nie podajemy ETag/Last-Modified pliku i nie pozwalamy na pamięć podręczną.
  headers.delete('ETag');
  headers.delete('Last-Modified');
  headers.set('Cache-Control', 'no-store');
  return new Response(res.body, { status: res.status, headers });
}
