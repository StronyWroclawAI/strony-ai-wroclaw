// Wstawia do statycznego HTML treści z bazy D1 (po stronie serwera, przez HTMLRewriter).
// Gdy baza jest niedostępna lub nieskonfigurowana, strona pokazuje treści domyślne z pliku HTML.

import { ensureSchema, hasDb, mediaUrl } from './db.js';
import { withSecurityHeaders, siteOrigin, contactEmail } from './http.js';
import {
  renderIndustries,
  renderIndustryOptions,
  renderCapabilities,
  renderFaq,
  renderLines,
  renderPortfolio,
  renderPosts,
  renderSocial,
} from './render.js';
import { embedInfo, socialKind } from './social.js';
import { parseVariants } from './media.js';

const POSTS_LIMIT = 6;
import { recordVisit } from './stats.js';

/**
 * Dane strukturalne (schema.org) — wyłącznie informacje widoczne na stronie:
 * nazwa, adres strony, e-mail, obszar działania, autor. Bez adresu, telefonu, NIP-u i ocen.
 */
export function structuredData(origin, email, sameAs = []) {
  const org = `${origin}/#organizacja`;
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${origin}/#strona`,
      url: `${origin}/`,
      name: 'Strony AI Wrocław',
      alternateName: 'Strony, które budują wizerunek',
      inLanguage: 'pl-PL',
      publisher: { '@id': org },
    },
    {
      '@type': 'ProfessionalService',
      '@id': org,
      name: 'Strony AI Wrocław',
      url: `${origin}/`,
      logo: `${origin}/assets/img/icon-512.png`,
      image: `${origin}/assets/img/og-image.png`,
      description:
        'Tworzenie nowoczesnych stron internetowych dla firm z Wrocławia i całej Polski: indywidualny projekt, wersja mobilna, formularz kontaktowy, mapa, galeria i pomoc przy wdrożeniu.',
      ...(email ? { email } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      founder: { '@type': 'Person', name: 'Grzegorz' },
      areaServed: [
        { '@type': 'City', name: 'Wrocław' },
        { '@type': 'Country', name: 'Polska' },
      ],
      knowsAbout: ['Tworzenie stron internetowych', 'Projektowanie stron WWW', 'Strony internetowe dla firm'],
    },
    {
      '@type': 'Service',
      '@id': `${origin}/#usluga`,
      serviceType: 'Tworzenie stron internetowych',
      name: 'Tworzenie stron internetowych dla firm',
      provider: { '@id': org },
      areaServed: [
        { '@type': 'City', name: 'Wrocław' },
        { '@type': 'Country', name: 'Polska' },
      ],
      url: `${origin}/`,
    },
  ];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

const PRIVACY_REQUIRED = ['privacy.controller_name', 'privacy.db_region', 'privacy.retention', 'privacy.updated', 'privacy.transfer_check'];

export async function loadContent(context) {
  const { env } = context;
  if (!hasDb(env)) return null;
  try {
    await ensureSchema(env);
    const db = env.DB;
    const [content, settings, industries, capabilities, faq, projects, images, posts] = await db.batch([
      db.prepare(`SELECT key, value FROM site_content`),
      db.prepare(`SELECT recruitment_open, contact_email, posts_enabled, facebook_url, instagram_url FROM settings WHERE id = 1`),
      db.prepare(`SELECT name, description FROM industries WHERE is_published = 1 ORDER BY sort_order, created_at`),
      db.prepare(`SELECT title, description, size FROM capabilities WHERE is_published = 1 ORDER BY sort_order, created_at`),
      db.prepare(`SELECT question, answer FROM faq_items WHERE is_published = 1 ORDER BY sort_order, created_at`),
      db.prepare(`SELECT id, title, industry, description, site_url, slug, tags, is_demo, card_ver, card_cover, seo_for FROM portfolio_projects WHERE status = 'published' ORDER BY sort_order, created_at DESC`),
      db.prepare(`SELECT pi.project_id, m.id AS media_id, m.kv_key, m.alt, m.width, m.height, m.variants FROM portfolio_images pi
                  JOIN media m ON m.id = pi.media_id
                  JOIN portfolio_projects p ON p.id = pi.project_id AND p.status = 'published'
                  ORDER BY pi.sort_order`),
      db.prepare(`SELECT p.title, p.body, p.published_on, p.link_url, p.embed, m.id AS media_id, m.kv_key, m.alt, m.width, m.height, m.variants FROM posts p
                  LEFT JOIN media m ON m.id = p.media_id
                  WHERE p.status = 'published' ORDER BY p.published_on DESC, p.created_at DESC LIMIT ${POSTS_LIMIT}`),
    ]);
    const map = {};
    for (const row of content.results) map[row.key] = row.value;
    const s = settings.results[0] || {};
    const imgs = images.results;
    return {
      content: map,
      recruitmentOpen: s.recruitment_open !== 0,
      contactEmail: s.contact_email || null,
      postsEnabled: s.posts_enabled === 1,
      social: { facebook: s.facebook_url || null, instagram: s.instagram_url || null },
      posts: posts.results.map((p) => ({
        title: p.title,
        body: p.body,
        published_on: p.published_on,
        link_url: p.link_url,
        link_kind: socialKind(p.link_url),
        embed: p.embed ? embedInfo(p.link_url) : null,
        image: p.kv_key ? { id: p.media_id, url: mediaUrl(p.kv_key), alt: p.alt || '', width: p.width, height: p.height, variants: parseVariants(p.variants) } : null,
      })),
      industries: industries.results,
      capabilities: capabilities.results,
      faq: faq.results,
      projects: projects.results.map((p) => ({
        ...p,
        images: imgs.filter((i) => i.project_id === p.id).map((i) => ({ id: i.media_id, url: mediaUrl(i.kv_key), alt: i.alt, width: i.width, height: i.height, variants: parseVariants(i.variants) })),
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
        // widżet pojawia się tylko wtedy, gdy Cloudflare potrzebuje dodatkowego potwierdzenia (formularz jest krótszy)
        el.setAttribute('data-appearance', 'interaction-only');
      },
    })
    // Teksty zakładek portfolio są tylko w bazie/panelu — kontener z nimi nie trafia na stronę
    .on('[data-pf-texts]', {
      element(el) {
        el.remove();
      },
    })
    // Dane strukturalne dla Google (tylko strona główna ma ten element)
    .on('script#ld-json', {
      element(el) {
        const sameAs = data ? Object.values(data.social).filter(Boolean) : [];
        el.setInnerContent(structuredData(origin, (data && data.contactEmail) || contactEmail(env), sameAs), { html: true });
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
    const showPosts = data.postsEnabled && data.posts.length > 0;
    const lists = {
      industries: () => (data.industries.length ? renderIndustries(data.industries) : null),
      'industry-options': () => renderIndustryOptions(data.industries),
      capabilities: () => (data.capabilities.length ? renderCapabilities(data.capabilities) : null),
      faq: () => (data.faq.length ? renderFaq(data.faq) : null),
      portfolio: () => renderPortfolio(data.projects, c),
      posts: () => (showPosts ? renderPosts(data.posts) : null),
    };
    const socialHtml = renderSocial(data.social);

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
          else if (name === 'posts' || name === 'nav-posts') show(showPosts);
          else if (name === 'social') show(Boolean(socialHtml));
        },
      })
      .on('[data-social-list]', {
        element(el) {
          el.setInnerContent(socialHtml, { html: true });
          el.removeAttribute('data-social-list');
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
