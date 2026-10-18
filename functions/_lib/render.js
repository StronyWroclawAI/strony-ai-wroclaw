// Wspólne funkcje generujące fragmenty HTML dla list edytowanych w panelu.
// Te same funkcje posłużyły do wygenerowania treści domyślnych w public/index.html,
// dzięki czemu wygląd strony jest identyczny niezależnie od źródła danych.
import { industryIcon, capabilityIcon, tone } from './icons.js';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Lista branż (sekcja „Branże”). */
export function renderIndustries(items) {
  return items
    .map(
      (it, i) => `
<li class="industry reveal ${tone(i)}">
  <span class="industry__icon" aria-hidden="true">${industryIcon(it.name)}</span>
  <h3 class="industry__name">${esc(it.name)}</h3>
  <p class="industry__desc">${esc(it.description)}</p>
</li>`
    )
    .join('');
}

/** Opcje pola „Branża” w formularzu. Ostatnia opcja „Inna” jest zawsze dostępna. */
export function renderIndustryOptions(items) {
  const opts = items
    .filter((it) => it.name && it.name.trim().toLowerCase() !== 'inna')
    .map((it) => `<option value="${esc(it.name)}">${esc(it.name)}</option>`)
    .join('');
  return `<option value="">Wybierz branżę…</option>${opts}<option value="Inna">Inna</option>`;
}

/** Możliwości (sekcja „Co mogę stworzyć”). Pole size: normal | wide. */
export function renderCapabilities(items) {
  return items
    .map(
      (it, i) => `
<li class="cap reveal ${tone(i)}${it.size === 'wide' ? ' cap--wide' : ''}" data-tilt>
  <span class="cap__icon" aria-hidden="true">${capabilityIcon(it.title)}</span>
  <h3 class="cap__title">${esc(it.title)}</h3>
  <p class="cap__desc">${esc(it.description)}</p>
</li>`
    )
    .join('');
}

/** FAQ jako natywne elementy <details> — działają z klawiatury i bez JavaScriptu. */
export function renderFaq(items) {
  return items
    .map(
      (it) => `
<details class="faq__item">
  <summary class="faq__q"><span>${esc(it.question)}</span><span class="faq__icon" aria-hidden="true"></span></summary>
  <div class="faq__a">${String(it.answer ?? '')
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')}</div>
</details>`
    )
    .join('');
}

/** Lista „jedna linia = jeden punkt”. */
export function renderLines(value) {
  return String(value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<li>${esc(l)}</li>`)
    .join('');
}

/**
 * Realizacje w portfolio. images: [{url, alt, width, height}]
 * Jeśli realizacja ma kartę projektu (ZIP wgrany w panelu), kafelek prowadzi do /portfolio/<adres>/,
 * a okładką jest wybrany obraz z karty.
 */
const PF_DEFAULTS = {
  'portfolio.real_label': 'Projekty zrealizowane',
  'portfolio.real_intro': 'Strony przygotowane dla prawdziwych firm, które zgodziły się na ich prezentację.',
  'portfolio.demo_label': 'Projekty demonstracyjne',
  'portfolio.demo_intro': 'Koncepcje na przykładzie fikcyjnych firm — pokazują, jak może wyglądać strona dla danej branży.',
};

/**
 * Portfolio w dwóch grupach: projekty zrealizowane i demonstracyjne.
 * Gdy są obie — zakładki (przełącza je main.js; bez JavaScriptu obie grupy są widoczne jedna pod drugą).
 * Gdy jest tylko jedna — bez zakładek, z etykietą grupy. Grupa bez projektów nie jest pokazywana.
 */
export function renderPortfolio(projects, content = {}) {
  const t = (k) => {
    const v = content[k];
    return v && String(v).trim() && String(v).trim() !== '-' ? String(v).trim() : PF_DEFAULTS[k];
  };
  const groups = [
    { key: 'real', items: projects.filter((p) => !p.is_demo) },
    { key: 'demo', items: projects.filter((p) => p.is_demo) },
  ].filter((g) => g.items.length);
  if (!groups.length) return '';
  const tabs = groups.length > 1;
  const tablist = tabs
    ? `<div class="pf-tabs" role="tablist" aria-label="Rodzaj projektów" data-pf-tabs hidden>${groups
        .map(
          (g, i) =>
            `<button class="pf-tab" type="button" role="tab" id="pf-tab-${g.key}" aria-controls="pf-${g.key}" aria-selected="${i === 0}"${i === 0 ? '' : ' tabindex="-1"'}>${esc(t(`portfolio.${g.key}_label`))}<span class="pf-tab__count" aria-label="${g.items.length} ${g.items.length === 1 ? 'projekt' : g.items.length < 5 ? 'projekty' : 'projektów'}">${g.items.length}</span></button>`
        )
        .join('')}</div>`
    : '';
  const panels = groups
    .map(
      (g) =>
        `<div class="pf-panel" id="pf-${g.key}"${tabs ? ` role="tabpanel" aria-labelledby="pf-tab-${g.key}" tabindex="0"` : ''} data-pf-panel>
  <div class="pf-panel__head"><p class="pf-panel__label${tabs ? ' pf-panel__label--tabs' : ''}">${esc(t(`portfolio.${g.key}_label`))}</p><p class="pf-panel__intro">${esc(t(`portfolio.${g.key}_intro`))}</p></div>
  <div class="work-list">${renderWorks(g.items)}</div>
</div>`
    )
    .join('');
  return tablist + panels;
}

function renderWorks(projects) {
  return projects
    .map((p, i) => {
      const imgs = (p.images || []).filter((im) => im.url);
      const hasCard = Boolean(p.card_ver && p.slug);
      const forWhom = String(p.seo_for || '').trim();
      // Opis dla czytników ekranu i Google: „projekt strony internetowej dla warsztatu samochodowego”
      const about = forWhom ? `projekt strony internetowej dla ${forWhom}` : `projekt strony internetowej — ${p.title}`;
      const cardHref = hasCard ? `/portfolio/${encodeURIComponent(p.slug)}/` : null;
      const cover = hasCard && p.card_cover
        ? { url: `/portfolio/${encodeURIComponent(p.slug)}/${p.card_cover.split('/').map(encodeURIComponent).join('/')}`, alt: `Zrzut ekranu: ${about}${forWhom ? ` (${p.title})` : ''}` }
        : imgs[0];
      const rest = (hasCard && p.card_cover ? imgs : imgs.slice(1)).slice(0, 4);
      const link = safeUrl(p.site_url);
      const tags = String(p.tags || '')
        .split(/\s*[·•|,\n]\s*/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8);
      const coverImg = cover
        ? `<img src="${esc(cover.url)}" alt="${esc(cover.alt)}" loading="lazy" decoding="async"${cover.width ? ` width="${Number(cover.width)}" height="${Number(cover.height)}"` : ''}>`
        : '';
      const frame = coverImg
        ? `<div class="work__frame"><span class="work__dots" aria-hidden="true"><i></i><i></i><i></i></span>${coverImg}</div>`
        : '';
      return `
<article class="work reveal${i === 0 ? ' work--featured' : ''}${hasCard ? ' work--card' : ''}">
  ${
    frame
      ? cardHref
        ? `<a class="work__cover" href="${esc(cardHref)}" tabindex="-1" aria-hidden="true">${frame}</a>`
        : `<figure class="work__cover">${frame}</figure>`
      : ''
  }
  <div class="work__body">
    <p class="work__meta">${p.industry ? esc(p.industry) : ''}${p.is_demo ? `<span class="work__demo" title="Koncepcja na przykładzie fikcyjnej firmy">Projekt demonstracyjny</span>` : ''}</p>
    <h3 class="work__title">${cardHref ? `<a href="${esc(cardHref)}">${esc(p.title)}</a>` : esc(p.title)}</h3>
    ${p.description ? `<p class="work__desc">${esc(p.description)}</p>` : ''}
    ${tags.length ? `<ul class="work__tags" aria-label="Zakres projektu">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${
      rest.length
        ? `<ul class="work__thumbs">${rest
            .map(
              (im) =>
                `<li><img src="${esc(im.url)}" alt="${esc(im.alt)}" loading="lazy" decoding="async"${
                  im.width ? ` width="${Number(im.width)}" height="${Number(im.height)}"` : ''
                }></li>`
            )
            .join('')}</ul>`
        : ''
    }
    ${
      cardHref || link
        ? `<div class="work__actions">${
            cardHref ? `<a class="btn btn--primary btn--sm" href="${esc(cardHref)}">Zobacz projekt<span class="visually-hidden">: ${esc(about)}${forWhom ? ` (${esc(p.title)})` : ''}</span> →</a>` : ''
          }${
            link
              ? `<a class="link-arrow" href="${esc(link)}" target="_blank" rel="noopener">${p.is_demo ? 'Wersja demonstracyjna' : 'Strona na żywo'}<span class="visually-hidden"> ${esc(p.title)} (otwiera się w nowej karcie)</span></a>`
              : ''
          }</div>`
        : ''
    }
  </div>
</article>`;
    })
    .join('');
}

const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
export function plDate(day) {
  const m = String(day || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] || ''} ${m[1]}` : '';
}

const SOCIAL_LABEL = { facebook: 'Facebook', instagram: 'Instagram' };
const SOCIAL_ICON = {
  facebook:
    '<svg class="social-link__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21h3z"/></svg>',
  instagram:
    '<svg class="social-link__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.9" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>',
};

/** Linki do profili (formularz, stopka, sekcja aktualności). */
export function renderSocial(links) {
  return ['facebook', 'instagram']
    .filter((k) => safeUrl(links[k]))
    .map(
      (k) =>
        `<li><a class="social-link social-link--${k}" href="${esc(safeUrl(links[k]))}" target="_blank" rel="noopener me">${SOCIAL_ICON[k]}<span>${SOCIAL_LABEL[k]}</span><span class="visually-hidden"> (otwiera się w nowej karcie)</span></a></li>`
    )
    .join('');
}

function paragraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Aktualności: posty napisane w panelu. Osadzenie oryginału z Facebooka/Instagrama
 * NIE ładuje się od razu — dopiero po kliknięciu przycisku (main.js), bo wczytuje treści i cookies Meta.
 * `embed` = { kind, src } wyliczone po stronie serwera (functions/_lib/social.js).
 */
export function renderPosts(posts) {
  return posts
    .map((p, i) => {
      const link = safeUrl(p.link_url);
      const kind = p.link_kind;
      const img = p.image && p.image.url
        ? `<figure class="post__img"><img src="${esc(p.image.url)}" alt="${esc(p.image.alt)}" loading="lazy" decoding="async"${p.image.width ? ` width="${Number(p.image.width)}" height="${Number(p.image.height)}"` : ''}></figure>`
        : '';
      const name = kind ? SOCIAL_LABEL[kind] : '';
      const embed = p.embed
        ? `<div class="post__embed" data-embed>
      <button class="btn btn--ghost btn--sm post__embed-btn" type="button" data-embed-src="${esc(p.embed.src)}" data-embed-kind="${esc(p.embed.kind)}" data-embed-ratio="${esc(p.embed.ratio || 'tall')}" aria-controls="post-embed-${i}">Pokaż oryginalny post z ${p.embed.kind === 'instagram' ? 'Instagrama' : 'Facebooka'}</button>
      <p class="post__embed-note">Po kliknięciu wczytam post z serwisu ${SOCIAL_LABEL[p.embed.kind]} (Meta), który może zapisać w Twojej przeglądarce pliki cookie. <a href="/polityka-prywatnosci#osadzenia">Więcej</a></p>
      <div class="post__embed-box" id="post-embed-${i}" hidden></div>
    </div>`
        : '';
      return `
<article class="post reveal${img ? '' : ' post--text'}">
  ${img}
  <div class="post__body">
    <p class="post__meta"><time datetime="${esc(p.published_on)}">${esc(plDate(p.published_on))}</time>${name ? `<span class="post__src post__src--${kind}">${name}</span>` : ''}</p>
    <h3 class="post__title">${esc(p.title)}</h3>
    ${p.body ? `<div class="post__text" data-post-text>${paragraphs(p.body)}</div>` : ''}
    ${embed}
    ${link ? `<p class="post__actions"><a class="link-arrow" href="${esc(link)}" target="_blank" rel="noopener nofollow">${name ? `Zobacz na ${kind === 'instagram' ? 'Instagramie' : 'Facebooku'}` : 'Czytaj więcej'}<span class="visually-hidden">: ${esc(p.title)} (otwiera się w nowej karcie)</span></a></p>` : ''}
  </div>
</article>`;
    })
    .join('');
}
