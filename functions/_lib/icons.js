// Ikony liniowe (własne, SVG 24×24) dobierane do branż i możliwości po słowach kluczowych.
// Dzięki temu nowe pozycje dodane w panelu też dostają pasującą ikonę.

const svg = (body) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  sparkles: svg('<path d="M12 3l1.8 4.6L18.5 9.4l-4.7 1.8L12 16l-1.8-4.8L5.5 9.4l4.7-1.8z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/><path d="M5 16l.6 1.4 1.4.6-1.4.6L5 20l-.6-1.4L3 18l1.4-.6z"/>'),
  scissors: svg('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1L20 20"/><path d="M8.1 15.9L20 4"/>'),
  lotus: svg('<path d="M12 20c-4.5 0-8-2.5-9-6 3 0 5.5 1 7 3"/><path d="M12 20c4.5 0 8-2.5 9-6-3 0-5.5 1-7 3"/><path d="M12 20c-2-2-3-4.5-3-7.5S10.5 6 12 4c1.5 2 3 5.5 3 8.5S14 18 12 20z"/>'),
  wrench: svg('<path d="M14.7 6.3a4 4 0 0 0-5.3 5.3L3.5 17.5a1.8 1.8 0 0 0 2.5 2.5l5.9-5.9a4 4 0 0 0 5.3-5.3l-2.4 2.4-2.2-.3-.3-2.2z"/>'),
  school: svg('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>'),
  scale: svg('<path d="M12 3v18"/><path d="M7 21h10"/><path d="M4 7h16"/><path d="M6 7l-3 7a3.5 3.5 0 0 0 6 0z"/><path d="M18 7l-3 7a3.5 3.5 0 0 0 6 0z"/>'),
  store: svg('<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 11v9h14v-9"/><path d="M10 20v-5h4v5"/>'),
  devices: svg('<rect x="2" y="4" width="14" height="10" rx="1.5"/><path d="M6 18h6"/><path d="M9 14v4"/><rect x="17" y="8" width="5" height="12" rx="1.2"/>'),
  sliders: svg('<path d="M4 6h10"/><path d="M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h4"/><path d="M12 12h8"/><circle cx="10" cy="12" r="2"/><path d="M4 18h12"/><path d="M20 18h0"/><circle cx="18" cy="18" r="2"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M8 15l2.5 2.5L16 13"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>'),
  star: svg('<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>'),
  list: svg('<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>'),
  shield: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
};

const INDUSTRY_RULES = [
  [/kosmet|beauty|urod|paznok|makijaż|makijaz/i, 'sparkles'],
  [/fryzj|barber|włos|wlos/i, 'scissors'],
  [/masaż|masaz|spa|fizjo|relaks/i, 'lotus'],
  [/warszt|samoch|auto|mechan|wulkan/i, 'wrench'],
  [/szkoł|szkol|eduk|przedszk|kurs|języ|jezy/i, 'school'],
  [/notar|kancel|prawn|adwok|radc/i, 'scale'],
];

const CAPABILITY_RULES = [
  [/telefon|tablet|komputer|responsyw|ekran/i, 'devices'],
  [/panel|edycj|samodziel/i, 'sliders'],
  [/galer|zdjęć|zdjec|zespół|zespol/i, 'image'],
  [/formularz|kontakt|wiadomo/i, 'mail'],
  [/mapa|dojazd|lokaliz/i, 'pin'],
  [/rezerwac|booksy|termin/i, 'calendar'],
  [/domen|uruchom|adres/i, 'globe'],
];

function pick(rules, text, fallback) {
  for (const [re, name] of rules) if (re.test(text || '')) return ICONS[name];
  return ICONS[fallback];
}

export const industryIcon = (name) => pick(INDUSTRY_RULES, name, 'store');
export const capabilityIcon = (title) => pick(CAPABILITY_RULES, title, 'star');

/** Kolejne kolory akcentów (klasy CSS tone-1 … tone-5). */
export const tone = (i) => `tone-${(i % 5) + 1}`;
