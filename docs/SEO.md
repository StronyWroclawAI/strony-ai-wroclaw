# SEO — struktura strony (etapy 1–2)

## Adresy i ich zadania
| Adres | Główny temat | Uwagi |
|---|---|---|
| `/` | tworzenie stron internetowych Wrocław (strony WWW Wrocław, strona internetowa dla firmy Wrocław) | jedyny adres pod frazy lokalne; TITLE i H1 bez zmian |
| `/realizacje/` | realizacje, portfolio, przykłady wykonanych stron | lista z panelu; realizacje i projekty demonstracyjne osobno |
| `/portfolio/<adres>/` | karta konkretnego projektu | `/portfolio/` → 301 → `/realizacje/` |
| `/poradnik/` | poradnik dla małych firm | lista artykułów |
| `/poradnik/ile-kosztuje-strona-internetowa/` | koszt strony internetowej (stworzenie i utrzymanie) | bez cen rynkowych |
| `/poradnik/strona-internetowa-czy-facebook/` | strona internetowa a Facebook / Instagram | |
| `/poradnik/domena-i-hosting/` | domena, hosting, kto jest właścicielem | |
| `/poradnik/ile-trwa-stworzenie-strony-internetowej/` | czas powstawania strony | bez gwarantowanych terminów |
| `/poradnik/co-powinna-zawierac-strona-firmowa/` | elementy strony firmowej | linkuje do stron branżowych |
| `/poradnik/czy-mala-firma-potrzebuje-strony-internetowej/` | czy strona jest potrzebna | decyzja „czy w ogóle”, nie porównanie z Facebookiem |
| `/dla-branz/` | strony dla branż | lista stron branżowych |
| `/dla-branz/salon-kosmetyczny/` | strona internetowa dla salonu kosmetycznego | priorytet: cennik, rezerwacja, galeria |
| `/dla-branz/fryzjer/` | strona internetowa dla fryzjera | priorytet: cennik zależny od włosów, zespół, zapisy |
| `/dla-branz/warsztat-samochodowy/` | strona internetowa dla warsztatu samochodowego | priorytet: telefon, dojazd, zapytanie o wycenę |

Nie tworzymy osobnej strony `/tworzenie-stron-internetowych-wroclaw/` ani stron pod kolejne miasta.
`/strony-internetowe-dla-firm/` — ODROCZONE (etap 2): intencja zbyt bliska stronie głównej (oferta dla firm, praca zdalnie w całej Polsce)
i nowym artykułom poradnika. Wrócić do decyzji po danych z Search Console (zapytania bez „Wrocław”, na które pokazuje się strona główna).

Poradnik ma trzy grupy (pole `group` w `pages.mjs`, lista `ARTICLE_GROUPS`): Koszty i utrzymanie, Planowanie strony, Obecność firmy w internecie.
Nowa strona branżowa: dodaj wpis `kind: 'branch'` w `pages.mjs` i plik w `content/` — karta pojawi się sama na `/dla-branz/`.
Podpis w stopce stron klientów: patrz `docs/STOPKA-KLIENTA.md`.

## Jak powstają podstrony
- Szablon i treści: `work/pages/` (layout.html, pages.mjs, content/*.html); `node build.mjs` generuje `public/<adres>/index.html` oraz `functions/_lib/pages.js` (lista do sitemap.xml).
- Funkcje `functions/realizacje/index.js`, `functions/poradnik/[[path]].js`, `functions/dla-branz/[[path]].js` uzupełniają strony danymi z panelu (e-mail, linki do profili, menu, lista realizacji).
- Adresy bez ukośnika na końcu (np. `/poradnik`) przekierowują 301 na wersję z ukośnikiem.

## Daty i lastmod
- Każda podstrona ma w `pages.mjs` pola `published` i `modified` (RRRR-MM-DD).
- Build zatrzyma się, jeśli treść strony się zmieniła, a `modified` nie (plik `pages.lock.json`) — dzięki temu `<lastmod>` w sitemapie i `dateModified` w danych strukturalnych są prawdziwe. Wyjątek: zmiana tego samego dnia, gdy `modified` jest już dzisiejszą datą. Daty z przyszłości są odrzucane.
- Bez `lastmod`: strona główna, polityka prywatności, `/realizacje/` (treści z panelu). Karty projektów: data wgrania karty.

## Dane strukturalne
- Strona główna: bez zmian (WebSite + ProfessionalService + Service).
- Podstrony: BreadcrumbList zgodny z widocznymi okruszkami; artykuły dodatkowo Article (autor: Grzegorz).
- Nie używamy Review, AggregateRating ani LocalBusiness dla projektów demonstracyjnych.

## Open Graph
Podstrony mają og:title, og:description i og:url. Nie mają og:image — do przygotowania dedykowana grafika (1200×630) dla poradnika i stron branżowych.

## Przejścia między stronami (etap 2.1)
- Płynne przejścia między podstronami robi przeglądarka (View Transitions między dokumentami) — wyłącznie CSS w `style.css`
  (`@view-transition { navigation: auto; }`), bez JavaScriptu, bez zmian w HTML i adresach.
- Działa w przeglądarkach z obsługą (Chrome/Edge 126+, Safari 18.2+). Pozostałe (np. Firefox) przechodzą zwyczajnie.
- Przy włączonym „ograniczeniu ruchu” w systemie przejścia są wyłączone, a przewijanie do sekcji jest natychmiastowe.
- Karty projektów (`/portfolio/…`) i panel nie mają tej reguły — przejścia do nich są zwykłe.

## Etap 3
- **Opisy prawdziwych realizacji** powstają jak pozostałe podstrony (wpis `kind: 'case'` w `pages.mjs`, pole `site` = adres strony klienta).
  Adres: `/portfolio/<adres>/` — jeśli w panelu nie ma karty ZIP o tym adresie, serwer pokazuje stronę z buildu.
  Kafelek realizacji w portfolio (dopasowany po adresie strony klienta) sam linkuje do opisu. Zdjęcia w sekcji „Podgląd projektu”
  pochodzą z biblioteki panelu (zdjęcia przypisane do realizacji, z wariantami w480–w1280).
  Pierwszy opis: `/portfolio/anna-niedobitek-fotografia/` (schema: CreativeWork + BreadcrumbList; bez LocalBusiness i ocen).
- **Grafiki OG** (1200×630 JPEG, ok. 65 KB): jeden szablon — granat, biel, niebieski, logo marki, font strony.
  Kategoria i krótki tytuł z pola `og` w `pages.mjs`; generowanie: `python3 work/og/generate.py` → `public/assets/img/og/`.
  Bez preloadu (tylko znaczniki meta), więc nie wpływają na ładowanie strony.
- **Autor artykułów**: Grzegorz Rejszel (podpis i Article.author: Person z nazwą i odnośnikiem do sekcji „O mnie”) — bez stanowiska, certyfikatów itp.
- **Przejścia między stronami a karty ZIP**: karty z paczek ZIP działają w piaskownicy bezpieczeństwa (CSP `sandbox` bez `allow-same-origin`),
  więc przeglądarka traktuje je jak inną domenę i nie animuje przejść do nich ani z nich. To celowe — zdjęcie piaskownicy dałoby skryptom
  z karty dostęp do strony i panelu. Opisy realizacji z buildu (np. Anna) mają przejścia jak reszta serwisu.

## Etap 4
- **Zrzuty realizacji**: oryginały (dostarczone przez właściciela) → warianty WebP w `public/assets/img/realizacje/<adres>/<plik>-w<szer>.webp`
  (tylko skalowanie i kompresja, bez zmiany treści). W treści strony: `@@SHOT:<adres>/<plik>|tekst alternatywny|desktop|mobile@@` —
  build wstawia `<img>` z `srcset`, `sizes`, wymiarami i `loading="lazy"`. Zrzut komputera w prostej ramce, telefon obok opisu.
- Opis Anny: sekcje „Projekt na komputerze” (2 zrzuty) i „Wersja mobilna” (zrzut z telefonu + tylko widoczne na nim cechy).
  Zdjęcia z biblioteki panelu nie są już pokazywane na tej stronie (kafelek w portfolio dalej używa okładki z panelu).
- `/dla-branz/fotograf/`: strona branżowa (intencja „strona internetowa dla fotografa”), przykład: realizacja Anny.
  Nie celuje w zapytania klientów fotografów („fotograf + miasto”). Schema: tylko BreadcrumbList.

## Search Console — co obserwować
- Indeksowanie: czy wszystkie adresy z sitemapy są „Zindeksowane”; przyczyny wykluczeń.
- Na stronę: wyświetlenia, kliknięcia, CTR, średnia pozycja — osobno dla strony głównej, realizacji, opisu Anny, 7 stron poradnika/branż.
- Zapytania: na które strona główna pokazuje się bez słowa „Wrocław” (sygnał dla ewentualnej `/strony-internetowe-dla-firm/`);
  czy zapytania branżowe trafiają na właściwe strony branżowe, a nie na stronę główną.
- Decyzje o nowych stronach dopiero przy powtarzalnych zapytaniach z wyświetleniami (nie pojedynczych), z kilku tygodni danych.
