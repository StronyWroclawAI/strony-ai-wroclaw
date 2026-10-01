// Walidacja zgłoszenia po stronie serwera. Zwraca oczyszczone dane albo błędy pól.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const PHONE_RE = /^[0-9+()\-\s]{7,30}$/;

function clean(value, max) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // znaki sterujące (zostają \n i \t)
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, max + 1); // +1, aby wykryć przekroczenie limitu
}

function oneLine(value, max) {
  return clean(value, max).replace(/\s+/g, ' ');
}

export function normalizeUrl(value) {
  const v = oneLine(value, 500);
  if (!v) return { ok: true, value: null };
  if (v.length > 500) return { ok: false };
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.') || u.username || u.password) {
      return { ok: false };
    }
    return { ok: true, value: u.href };
  } catch {
    return { ok: false };
  }
}

export function validateLead(body) {
  const errors = {};
  const b = body && typeof body === 'object' ? body : {};

  const submission_id = String(b.submission_id || '');
  if (!UUID_RE.test(submission_id)) errors.form = 'Nieprawidłowe dane formularza. Odśwież stronę i spróbuj ponownie.';

  const company_name = oneLine(b.company_name, 150);
  if (!company_name) errors.company_name = 'Podaj nazwę firmy.';
  else if (company_name.length > 150) errors.company_name = 'Nazwa firmy może mieć maksymalnie 150 znaków.';

  let industry = oneLine(b.industry, 100);
  const industryOther = oneLine(b.industry_other, 100);
  if (!industry) errors.industry = 'Wybierz branżę.';
  else if (industry.length > 100) errors.industry = 'Nieprawidłowa branża.';
  else if (industry === 'Inna') {
    if (!industryOther) errors.industry_other = 'Wpisz, czym zajmuje się firma.';
    else if (industryOther.length > 90) errors.industry_other = 'Opis branży może mieć maksymalnie 90 znaków.';
    else industry = `Inna: ${industryOther}`;
  }

  const contact_name = oneLine(b.contact_name, 100);
  if (!contact_name) errors.contact_name = 'Podaj imię osoby kontaktowej.';
  else if (contact_name.length > 100) errors.contact_name = 'Imię może mieć maksymalnie 100 znaków.';

  const email = oneLine(b.email, 254).toLowerCase();
  if (!email) errors.email = 'Podaj adres e-mail.';
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = 'Podaj poprawny adres e-mail, np. jan@firma.pl.';

  const phoneRaw = oneLine(b.phone, 30);
  let phone = null;
  if (phoneRaw) {
    if (!PHONE_RE.test(phoneRaw) || phoneRaw.replace(/\D/g, '').length < 7) {
      errors.phone = 'Podaj poprawny numer telefonu.';
    } else phone = phoneRaw;
  }

  const urls = {};
  for (const k of ['website_url', 'facebook_url', 'instagram_url']) {
    const r = normalizeUrl(b[k]);
    if (!r.ok) errors[k] = 'Podaj poprawny adres, np. https://twojafirma.pl.';
    else urls[k] = r.value;
  }

  const message = clean(b.message, 5000);
  if (!message) errors.message = 'Opisz, czego oczekujesz od strony.';
  else if (message.length < 20) errors.message = 'Napisz trochę więcej — minimum 20 znaków.';
  else if (message.length > 5000) errors.message = 'Wiadomość może mieć maksymalnie 5000 znaków.';

  return {
    errors,
    data: {
      submission_id,
      company_name,
      industry,
      contact_name,
      email,
      phone,
      website_url: urls.website_url ?? null,
      facebook_url: urls.facebook_url ?? null,
      instagram_url: urls.instagram_url ?? null,
      message,
    },
  };
}
