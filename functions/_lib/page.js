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
  renderPortfolioHub,
  renderCaseImages,
  renderPosts,
  renderSocial,
  renderPricing,
  pricingFrom,
  warsawDay,
} from './render.js';
import { embedInfo, socialKind } from './social.js';
import { parseVariants } from './media.js';
import { SITE_PAGES } from './pages.js';

// Realizacje opisane na stronach z buildu (np. /portfolio/anna-niedobitek-fotografia/) — dopasowanie po adresie strony klienta.
const siteKey = (u) => {
  try {
    const x = new URL(String(u));
    return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '')).toLowerCase();
  } catch {
    return '';
  }
};
const CASES = new Map(SITE_PAGES.filter((p) => p.kind === 'case' && p.site).map((p) => [siteKey(p.site), p.path]));

const POSTS_LIMIT = 6;
import { recordVisit } from './stats.js';
import { hasValidSession } from './auth.js';

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
      founder: { '@type': 'Person', '@id': `${origin}/o-mnie/#osoba`, name: 'Grzegorz Rejszel', url: `${origin}/o-mnie/` },
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
    const [content, settings, industries, capabilities, faq, projects, images, posts, pricing] = await db.batch([
      db.prepare(`SELECT key, value FROM site_content`),
      db.prepare(`SELECT recruitment_open, contact_email, posts_enabled, facebook_url, instagram_url, offer_mode, offer_mode_at FROM settings WHERE id = 1`),
      db.prepare(`SELECT name, description FROM industries WHERE is_published = 1 ORDER BY sort_order, created_at`),
      db.prepare(`SELECT title, description, size FROM capabilities WHERE is_published = 1 ORDER BY sort_order, created_at`),
      db.prepare(`SELECT question, answer, mode FROM faq_items WHERE is_published = 1 ORDER BY sort_order, created_at`),
      db.prepare(`SELECT id, title, industry, description, site_url, slug, tags, is_demo, card_ver, card_cover, seo_for FROM portfolio_projects WHERE status = 'published' ORDER BY sort_order, created_at DESC`),
      db.prepare(`SELECT pi.project_id, m.id AS media_id, m.kv_key, m.alt, m.width, m.height, m.variants FROM portfolio_images pi
                  JOIN media m ON m.id = pi.media_id
                  JOIN portfolio_projects p ON p.id = pi.project_id AND p.status = 'published'
                  ORDER BY pi.sort_order`),
      db.prepare(`SELECT p.title, p.body, p.published_on, p.link_url, p.embed, m.id AS media_id, m.kv_key, m.alt, m.width, m.height, m.variants FROM posts p
                  LEFT JOIN media m ON m.id = p.media_id
                  WHERE p.status = 'published' ORDER BY p.published_on DESC, p.created_at DESC LIMIT ${POSTS_LIMIT}`),
      db.prepare(`SELECT name, price, promo_price, promo_label, promo_until, description, items, badge, featured FROM pricing_packages WHERE is_published = 1 ORDER BY sort_order, created_at`),
    ]);
    const map = {};
    for (const row of content.results) map[row.key] = row.value;
    const s = settings.results[0] || {};
    const imgs = images.results;
    return {
      content: map,
      recruitmentOpen: s.recruitment_open !== 0,
      offerMode: s.offer_mode === 'paid' ? 'paid' : 'free',
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
      pricing: pricing.results,
      projects: projects.results.map((p) => ({
        ...p,
        case_path: !p.is_demo && !(p.card_ver && p.slug) ? CASES.get(siteKey(p.site_url)) || null : null,
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
  // Tryb oferty: „free” (portfolio, wykonanie bezpłatne) albo „paid” (cennik) — przełącznik w panelu (Ustawienia).
  // Podgląd drugiego trybu tylko dla zalogowanego administratora: ?podglad=cennik / ?podglad=portfolio (z noindex).
  const reqUrl = new URL(request.url);
  const previewParam = reqUrl.searchParams.get('podglad');
  const preview = (previewParam === 'cennik' || previewParam === 'portfolio') && (await hasValidSession(env, request)) ? (previewParam === 'cennik' ? 'paid' : 'free') : null;
  const offerMode = preview || (data ? data.offerMode : 'free');
  if (data) data.faq = data.faq.filter((f) => !f.mode || f.mode === 'all' || f.mode === offerMode);
  const turnstileKey = (env.TURNSTILE_SITE_KEY || '').trim();
  // Skrypt Turnstile tylko na stronach z formularzem zgłoszenia (strona główna i /kontakt/) — pozostałe strony nie łączą się z Cloudflare Challenges.
  const pathname = new URL(request.url).pathname;
  const hasForm = pathname === '/' || pathname === '/kontakt/';

  let rw = new HTMLRewriter()
    // Treści zależne od trybu oferty: zostaje tylko wersja aktywnego trybu (druga nie trafia do HTML — także dla Google)
    .on('[data-offer]', {
      element(el) {
        if (el.getAttribute('data-offer') === offerMode) el.removeAttribute('data-offer');
        else el.remove();
      },
    })
    // Adresy bezwzględne dla canonical i Open Graph
    .on('[data-abs]', {
      element(el) {
        if (el.removed) return; // element innego trybu oferty — usunięty wyżej
        const attr = el.getAttribute('data-abs');
        const v = el.getAttribute(attr) || '';
        if (v.startsWith('/')) el.setAttribute(attr, origin + v);
        el.removeAttribute('data-abs');
      },
    })
    // Cloudflare Turnstile — tylko gdy skonfigurowano klucz
    .on('[data-turnstile]', {
      element(el) {
        if (el.removed) return; // element innego trybu oferty — usunięty wyżej
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
        if (turnstileKey && hasForm) {
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
      // lista już przefiltrowana według trybu oferty — bez atrybutu data-offer (wstawiony HTML nie jest ponownie przetwarzany)
      faq: () => (data.faq.length ? renderFaq(data.faq.map((f) => ({ ...f, mode: 'all' }))) : null),
      portfolio: () => renderPortfolio(data.projects, c),
      realizacje: () => renderPortfolioHub(data.projects),
      'case-images': (el) => renderCaseImages(data.projects, el.getAttribute('data-case-site')),
      posts: () => (showPosts ? renderPosts(data.posts) : null),
      // Cennik z zakładki „Cennik” w panelu (promocje z datą „do” wygasają same — liczone na dzień w Polsce)
      pricing: () =>
        data.pricing.length
          ? renderPricing(data.pricing, warsawDay(), (c['pricing.cta'] || '').trim() || undefined)
          : '<li class="price-card price-card--empty"><h3 class="price-card__name">Wycena indywidualna</h3><p class="price-card__desc">Napisz kilka zdań o swojej firmie — przygotuję wycenę dopasowaną do zakresu strony.</p><a class="btn btn--primary price-card__cta" href="/kontakt/">Zapytaj o wycenę</a></li>',
      'pricing-from': () => (data.pricing.length ? pricingFrom(data.pricing) : 'Wycena indywidualna'),
    };
    const socialHtml = renderSocial(data.social);

    rw = rw
      .on('[data-cms]', {
        element(el) {
          if (el.removed) return; // element innego trybu oferty — usunięty wyżej
          const v = c[el.getAttribute('data-cms')];
          if (v === undefined || v === null) return;
          const t = String(v).trim();
          if (t === '-') {
            // pole formularza zostaje, tylko bez treści (np. pusty szkic wiadomości)
            if (el.tagName === 'textarea') el.setInnerContent('');
            else el.remove();
          }
          else if (t) {
            el.setInnerContent(el.tagName === 'textarea' ? String(v).replace(/^\n+|\s+$/g, '') : t);
            if (el.hasAttribute('data-cms-show')) el.removeAttribute('hidden');
          }
        },
      })
      .on('[data-cms-lines]', {
        element(el) {
          if (el.removed) return; // element innego trybu oferty — usunięty wyżej
          const v = c[el.getAttribute('data-cms-lines')];
          if (v && v.trim()) el.setInnerContent(renderLines(v), { html: true });
        },
      })
      .on('[data-cms-email]', {
        element(el) {
          if (el.removed) return; // element innego trybu oferty — usunięty wyżej
          if (!email) return;
          el.setAttribute('href', `mailto:${email}`);
          el.setInnerContent(email);
        },
      })
      .on('[data-cms-list]', {
        element(el) {
          if (el.removed) return; // element innego trybu oferty — usunięty wyżej
          const fn = lists[el.getAttribute('data-cms-list')];
          const html = fn ? fn(el) : null;
          if (html !== null && html !== undefined) el.setInnerContent(html, { html: true });
        },
      })
      .on('[data-cms-block]', {
        element(el) {
          if (el.removed) return; // element innego trybu oferty — usunięty wyżej
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
          if (el.removed) return; // element innego trybu oferty — usunięty wyżej
          el.setInnerContent(socialHtml, { html: true });
          el.removeAttribute('data-social-list');
        },
      });
  }

  if (preview) {
    const label = preview === 'paid' ? 'Cennik (strony płatne)' : 'Portfolio (wykonanie bezpłatne)';
    rw = rw.on('body', {
      element(el) {
        el.prepend(`<div class="preview-bar" role="status">Podgląd trybu oferty: <strong>${label}</strong> — widzisz go tylko Ty (zalogowany w panelu). Przełączasz w panelu: Ustawienia → Tryb oferty.</div>`, { html: true });
      },
    });
  }
  const res = rw.transform(asset);
  const headers = withSecurityHeaders(res.headers);
  // Treść zależy od bazy, więc nie podajemy ETag/Last-Modified pliku i nie pozwalamy na pamięć podręczną.
  headers.delete('ETag');
  headers.delete('Last-Modified');
  headers.set('Cache-Control', 'no-store');
  if (preview) headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(res.body, { status: res.status, headers });
}
