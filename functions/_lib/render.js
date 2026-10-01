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
 */
export function renderPortfolio(projects) {
  return projects
    .map((p, i) => {
      const imgs = (p.images || []).filter((im) => im.url);
      const cover = imgs[0];
      const rest = imgs.slice(1, 5);
      const link = safeUrl(p.site_url);
      return `
<article class="work reveal${i === 0 ? ' work--featured' : ''}">
  ${
    cover
      ? `<figure class="work__cover"><img src="${esc(cover.url)}" alt="${esc(cover.alt)}" loading="lazy" decoding="async"${
          cover.width ? ` width="${Number(cover.width)}" height="${Number(cover.height)}"` : ''
        }></figure>`
      : ''
  }
  <div class="work__body">
    ${p.industry ? `<p class="work__meta">${esc(p.industry)}</p>` : ''}
    <h3 class="work__title">${esc(p.title)}</h3>
    ${p.description ? `<p class="work__desc">${esc(p.description)}</p>` : ''}
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
      link
        ? `<a class="link-arrow" href="${esc(link)}" target="_blank" rel="noopener">Zobacz stronę<span class="visually-hidden"> ${esc(
            p.title
          )} (otwiera się w nowej karcie)</span></a>`
        : ''
    }
  </div>
</article>`;
    })
    .join('');
}
