# Strony AI Wrocław — strona marki z panelem administratora

Strona „Strony AI Wrocław — Strony, które budują wizerunek” z formularzem zgłoszeń i panelem administratora.
Całość działa na **Cloudflare** (strona, funkcje serwerowe, baza D1, magazyn zdjęć KV, Turnstile) na darmowym planie, **bez karty płatniczej i bez usypiania**. Powiadomienia e-mail wysyła **Resend**.

> **Chcesz najpierw tylko obejrzeć stronę?** Otwórz dwuklikiem plik [`podglad/podglad-strony.html`](podglad/podglad-strony.html). Nie potrzebujesz serwera, internetu ani kont. Formularz w podglądzie niczego nie wysyła, a dolny pasek pozwala przełączyć widok „nabór wyłączony”.
>
> **Brief dla klientów:** szczegółowy kwestionariusz online o oczekiwaniach firmy, tworzony i przeglądany w zgłoszeniu klienta. Opis w [`docs/BRIEF.md`](docs/BRIEF.md), podgląd w `podglad/podglad-brief.html`.
>
> **Publikacja:** [`docs/INSTRUKCJA.md`](docs/INSTRUKCJA.md) — 9 kroków. **Obsługa panelu:** [`docs/PANEL.md`](docs/PANEL.md). **Lista kontrolna:** [`docs/WERYFIKACJA.md`](docs/WERYFIKACJA.md).

---

## Wybrane technologie (i dlaczego)

| Element | Rozwiązanie | Dlaczego |
|---|---|---|
| Strona publiczna | Zwykły HTML + CSS + JS, **bez kroku budowania** | Nie wymaga narzędzi, łatwo ją poprawić, działa szybko. |
| Treści z panelu | Funkcja Cloudflare wstawia treści z bazy do HTML po stronie serwera | Google widzi gotowy tekst. Zmiany z panelu są widoczne od razu, a gdy baza nie odpowiada, strona pokazuje treści domyślne. |
| Baza danych | **Cloudflare D1** (SQLite) | Darmowa, bez usypiania. Tabele i teksty tworzą się same przy pierwszym uruchomieniu, bez ręcznego SQL. |
| Zdjęcia | **Cloudflare KV** | Darmowe, bez karty płatniczej. Zdjęcia są serwowane pod adresem `/media/…`. |
| Logowanie do panelu | Własne logowanie jednego administratora: skrót hasła PBKDF2, podpisana sesja w ciasteczku HttpOnly, limit prób | Bez zewnętrznych usług i bez haseł w kodzie. |
| Formularz | Funkcja `functions/api/zgloszenie.js` | Walidacja na serwerze, Turnstile, pole-pułapka, limity, blokada podwójnej wysyłki. |
| Powiadomienia e-mail | Resend (API HTTP) | Cloudflare ani Gmail nie wysyłają takich powiadomień same z siebie. |

Zgodność sprawdzona w dokumentacji (październik 2026):
- funkcje Pages nie działają przy wgrywaniu plików przeciągnięciem w panelu Cloudflare, dlatego publikacja idzie przez GitHub;
- D1 na darmowym planie: 5 GB, 5 mln odczytów i 100 tys. zapisów dziennie, bez usypiania;
- R2 (magazyn plików) i Cloudflare Access (gotowe logowanie) mogą wymagać podania karty płatniczej, dlatego ich nie używam;
- Resend bez własnej domeny wysyła tylko na adres właściciela konta.

---

## Co jest gotowe, a co wymaga Twojej konfiguracji

### ✅ Gotowe (w kodzie)
- **Strona:** pierwszy ekran z ofertą 0 zł i informacją o kosztach, korzyści, branże, możliwości, przebieg współpracy, zasady i koszty, materiały firmy, O mnie, FAQ (11 pytań), kontakt, stopka. Do tego kolory, ilustracje i animacje.
- **Formularz:**
  - walidacja w przeglądarce i na serwerze, stan „Wysyłam…”, blokada wielokrotnego wysłania;
  - potwierdzenie pokazuje się dopiero po zapisie w bazie;
  - gdy e-mail się nie wyśle, zgłoszenie zostaje w bazie, a panel pozwala ponowić wysyłkę.
- **Nabór:** wyłączenie ukrywa formularz i pokazuje komunikat „Obecnie realizuję przyjęte projekty…”, a adres e-mail zostaje widoczny.
- **Portfolio:** sekcja pojawia się automatycznie po opublikowaniu pierwszej realizacji.
- **Panel:**
  - logowanie z blokadą po 5 błędnych próbach;
  - zgłoszenia: filtry, szczegóły, statusy, prywatne notatki, usuwanie, ręczne dodawanie kontaktów;
  - brief projektowy przypięty do zgłoszenia, z pełnym podglądem odpowiedzi;
  - edycja treści, FAQ, branż i możliwości;
  - zdjęcia z tekstem alternatywnym, automatycznie zmniejszane do WebP;
  - portfolio: szkic i publikacja, kolejność, zdjęcia;
  - ustawienia i test powiadomień;
  - generator hasła.
- **Bezpieczeństwo:**
  - uprawnienia sprawdzane po stronie serwera, ochrona przed CSRF (sesja SameSite=Strict, nagłówek panelu, kontrola pochodzenia);
  - zdjęcia sprawdzane po typie pliku i rozmiarze (maks. 5 MB);
  - zapytania SQL z parametrami, tekst wstawiany na stronę zawsze escapowany;
  - nagłówki bezpieczeństwa (CSP), brak sekretów w kodzie.
- **Jakość:**
  - dostępność z klawiatury, widoczny fokus, etykiety pól, ograniczenie ruchu;
  - wygląd na telefonie bez przewijania poziomego;
  - SEO, Open Graph, `sitemap.xml`, `robots.txt`, strona 404;
  - brak analityki i cookies marketingowych.

### 🔌 Do zrobienia przez Ciebie (instrukcja krok po kroku)
GitHub → baza D1 i KV → Turnstile → Resend → hasło z generatora → Cloudflare Pages z powiązaniami i zmiennymi → test.

### ✏️ Do uzupełnienia przed publikacją
W panelu: **Treści strony → Polityka prywatności**. Do czasu uzupełnienia strona pokazuje żółty baner.
- imię i nazwisko administratora danych;
- lokalizacja bazy D1 (wybrana przy jej tworzeniu, np. „Unia Europejska”);
- okres przechowywania zgłoszeń (podpowiedź jest w tekście);
- data publikacji;
- weryfikacja podstaw transferu danych poza EOG (umowy DPA). Po sprawdzeniu wpisz „-”, aby usunąć uwagę;
- adres do korespondencji: opcjonalny, wpisz „-”, jeśli go nie podajesz.

> Polityka prywatności to **wersja robocza** zgodna z tym, jak strona faktycznie działa. Nie jest opinią prawną.

---

## Struktura katalogów

```
strony-ai-wroclaw/
├── README.md
├── package.json                  ← npm run dev (lokalnie z bazą D1 i KV)
├── .dev.vars.example             ← wzór zmiennych (bez sekretów)
├── docs/                         ← INSTRUKCJA, PANEL, WERYFIKACJA
├── functions/                    ← kod serwerowy (Cloudflare Pages Functions)
│   ├── index.js, polityka-prywatnosci.js   ← strony z treściami z bazy
│   ├── robots.txt.js, sitemap.xml.js
│   ├── media/[[path]].js         ← zdjęcia z KV
│   ├── api/zgloszenie.js         ← formularz
│   ├── api/admin/[[path]].js     ← API panelu (logowanie, zgłoszenia, treści, zdjęcia, portfolio)
│   └── _lib/                     ← baza (db.js), logowanie (auth.js), e-mail, walidacja, HTML, ikony, dane początkowe
├── public/                       ← pliki strony (katalog publikowany)
│   ├── index.html, polityka-prywatnosci.html, 404.html, _headers
│   ├── assets/ (css, js, fonts, img)
│   └── admin/                    ← panel + generator-hasla.html
├── podglad/                      ← samodzielne pliki do obejrzenia dwuklikiem (nie publikuj ich)
└── logo-zrodla/                  ← plansza i wycięte pliki rastrowe logo
```

## Kolory, grafiki i animacje (wersja 2)
- **Kolory:** granat i biel pozostają bazą. Akcenty to koral `#ff6b5a`, bursztyn `#ffb547`, morski `#19c2b0`, fiolet `#8b7cf6` i błękit `#4da3ff`. Tekst zawsze ma kontrast zgodny z WCAG AA; jasne akcenty służą tłom i ikonom.
- **Grafiki:** wyłącznie własne ilustracje SVG, bez zdjęć stockowych i bez robotów. W pierwszym ekranie jest kolorowa makieta strony z telefonem i etykietami. Branże i możliwości mają ikony, a sekcja „O mnie” — ilustrację stanowiska pracy. Obraz do udostępniania (`og-image.png`) też jest kolorowy.
- **Ikony dobierają się same** po słowach kluczowych, także dla branż i możliwości dodanych w panelu (np. „fryzjer” → nożyczki, „rezerwacja” → kalendarz).
- **Animacje:**
  - zmieniające się zakończenie nagłówka („…Twojego salonu / warsztatu / kancelarii…”; listę edytujesz w panelu: Treści → Pierwszy ekran),
  - ruchome kolorowe plamy w tle, unoszące się etykiety,
  - przesuwający się pasek branż,
  - pasek postępu przewijania na górze,
  - linia osi czasu rysowana podczas przewijania,
  - połysk na przyciskach, przechylanie kart pod kursorem, delikatna paralaksa w pierwszym ekranie.
- **Ograniczenie ruchu:** przy ustawieniu systemowym „ogranicz ruch” animacje się wyłączają, a nagłówek pokazuje stały tekst.

## Logo — ważna uwaga
Dostarczony plik był planszą koncepcyjną (raster PNG) z numerem wariantu. Zrobiłem z niego tak:
- **znak SA** (`public/assets/img/logo-znak*.svg`) i **pełne logo** (`logo-pelne*.svg`) to **robocza automatyczna wektoryzacja** pliku rastrowego (program potrace). Wygląda dobrze, ale **nie jest oryginalnym plikiem wektorowym**. Jeśli masz źródłowy SVG, podmień te pliki pod tymi samymi nazwami;
- w nagłówku strony obok znaku nazwa „Strony AI Wrocław” jest zwykłym tekstem, więc jest ostra i czytelna dla wyszukiwarek;
- numer wariantu „3” i tło planszy nie są nigdzie użyte;
- w `logo-zrodla/` są: oryginalna plansza oraz wycięte znak i pełne logo w PNG z przezroczystym tłem.
