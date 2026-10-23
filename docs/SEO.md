# SEO — struktura strony (etap 1)

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
| `/dla-branz/` | strony dla branż | lista stron branżowych |
| `/dla-branz/salon-kosmetyczny/` | strona internetowa dla salonu kosmetycznego | wzorzec dla kolejnych branż |

Nie tworzymy osobnej strony `/tworzenie-stron-internetowych-wroclaw/` ani stron pod kolejne miasta.
Miejsce na przyszłą stronę `/strony-internetowe-dla-firm/` jest przewidziane (ten sam szablon), ale decyzja zapadnie po danych z Search Console.

## Jak powstają podstrony
- Szablon i treści: `work/pages/` (layout.html, pages.mjs, content/*.html); `node build.mjs` generuje `public/<adres>/index.html` oraz `functions/_lib/pages.js` (lista do sitemap.xml).
- Funkcje `functions/realizacje/index.js`, `functions/poradnik/[[path]].js`, `functions/dla-branz/[[path]].js` uzupełniają strony danymi z panelu (e-mail, linki do profili, menu, lista realizacji).
- Adresy bez ukośnika na końcu (np. `/poradnik`) przekierowują 301 na wersję z ukośnikiem.

## Daty i lastmod
- Każda podstrona ma w `pages.mjs` pola `published` i `modified` (RRRR-MM-DD).
- Build zatrzyma się, jeśli treść strony się zmieniła, a `modified` nie (plik `pages.lock.json`) — dzięki temu `<lastmod>` w sitemapie i `dateModified` w danych strukturalnych są prawdziwe.
- Bez `lastmod`: strona główna, polityka prywatności, `/realizacje/` (treści z panelu). Karty projektów: data wgrania karty.

## Dane strukturalne
- Strona główna: bez zmian (WebSite + ProfessionalService + Service).
- Podstrony: BreadcrumbList zgodny z widocznymi okruszkami; artykuły dodatkowo Article (autor: Grzegorz).
- Nie używamy Review, AggregateRating ani LocalBusiness dla projektów demonstracyjnych.

## Open Graph
Podstrony mają og:title, og:description i og:url. Nie mają og:image — do przygotowania dedykowana grafika (1200×630) dla poradnika i stron branżowych.
