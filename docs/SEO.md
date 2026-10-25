# SEO — struktura strony (wersja 1.0, etapy 1–5)

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
| `/dla-branz/fotograf/` | strona internetowa dla fotografa | portfolio, szybkość galerii; bez celowania w miasto |
| `/portfolio/anna-niedobitek-fotografia/` | realizacja: strona fotografki (prawdziwy klient, za zgodą) | opis realizacji, nie poradnik |
| `/oferta/` | co oferuje Strony AI Wrocław: zakres, przebieg współpracy, zasady i koszty, własność strony | intencja „oferta / zasady”, NIE fraza „tworzenie stron Wrocław” (ta zostaje na `/`) |
| `/o-mnie/` | kim jest autor (Grzegorz Rejszel), podejście, rola AI | marka i zaufanie; Person w danych strukturalnych |
| `/kontakt/` | formularz zgłoszenia i e-mail | strona użytkowa, bez pozycjonowania |

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

## Etap 5 — wersja 1.0: nawigacja wielostronicowa
- **Menu główne:** Start (`/`), Oferta (`/oferta/`), Realizacje (`/realizacje/`), Dla branż (`/dla-branz/`), Poradnik (`/poradnik/`), O mnie (`/o-mnie/`), Kontakt (`/kontakt/`, wyróżniony przycisk).
  Każda pozycja to zwykły link `<a href>` do osobnego adresu — działa bez JavaScriptu, przejście robi przeglądarka (View Transitions).
  Menu nie zawiera kotwic (`#…`) ani pozycji pojedynczych branż. Strony funkcjonalne (`/brief/`, `/wybor-logo/`) są poza menu.
- **Aktywna pozycja:** `aria-current="page"` (bieżąca strona) albo `aria-current="true"` (dział: artykuł → Poradnik, branża → Dla branż, realizacja → Realizacje); podkreślenie, nie tylko kolor. Ustawia build (`markNav` w `build.mjs`).
- **Menu mobilne:** do 1023 px (pełne menu potrzebuje ok. 945 px). Bez JS: link `#menu` otwiera panel (`:target`), link `#` zamyka.
- **Kotwice strony głównej** (`/#kontakt`, `/#zasady`, `/#faq`, `/#o-mnie`) nadal działają dla starych linków; nowe linki w CTA prowadzą do `/kontakt/` i `/oferta/#zasady`.
- **Formularz:** jeden formularz i jeden backend (`/api/zgloszenie`). Ta sama sekcja jest na stronie głównej i na `/kontakt/` (build kopiuje ją z `index.src.html`), treści edytuje się w panelu w jednym miejscu.
  Na stronie głównej formularz zostaje — tam trafiają osoby z wiadomości e-mail i stare linki `/#kontakt`.
- **Treści z panelu na podstronach:** sekcje „Zasady i koszty”, „Materiały firmy” i „Własność strony” są na `/oferta/`, wartości współpracy na `/o-mnie/` — z tymi samymi kluczami, więc edycja w panelu działa jak wcześniej.
  Na stronie głównej: krótki skrót oferty (nowe pola „Oferta – skrót na stronie głównej”), skrót „O mnie” z linkiem i trzy artykuły poradnika.
- **Daty (hash v2):** zmiana adresu linku wewnętrznego (`href="/…"`) nie zmienia daty strony — to zmiana nawigacji, nie treści. Zmiana tekstu nadal wymaga nowej daty `modified`.
- **Dane strukturalne:** `/o-mnie/` — AboutPage + Person (`@id …/o-mnie/#osoba`, bez sameAs i jobTitle); autor artykułów i `founder` na stronie głównej wskazują tę samą osobę. `/kontakt/` — ContactPage. `/oferta/` — tylko BreadcrumbList (usługa jest opisana na stronie głównej).
- **Turnstile:** skrypt tylko na stronach z formularzem (`/`, `/kontakt/`).
- **Karty projektów:** HTML karty z `Cache-Control: no-store` (nagłówek `<head>` powstaje z bazy — zmiany z panelu widać od razu).
- **Font (CLS przy podmianie):** artykuł o domenie i hostingu przy 390 px ma CLS ≈ 0,04 (długi H1 na granicy liczby wierszy: krój zastępczy 5 wierszy, Jakarta 4). Sprawdzone poprawki: `text-wrap` (bez efektu), preload fontów (CLS 0, ale FCP/LCP na telefonie +≈280 ms; na stronie głównej +≈150 ms). Zostawione świadomie — wynik mieści się w progu „dobry” (< 0,1).

## Mapa słów kluczowych (wersja 1.0)
| Adres | Główna intencja | Tematy wspierające | Linkują tu m.in. |
|---|---|---|---|
| `/` | tworzenie stron internetowych Wrocław | korzyści, branże, możliwości, przebieg współpracy, FAQ | wszystkie strony (logo, „Start”, okruszki) |
| `/oferta/` | oferta i zasady współpracy Strony AI Wrocław | zakres, koszty, materiały, własność domeny | menu, strona główna (skrót oferty), /o-mnie/, /kontakt/, artykuł o czasie |
| `/realizacje/` | przykłady wykonanych stron | realne vs demonstracyjne | menu, strona główna, /oferta/, /o-mnie/, /dla-branz/fotograf/ |
| `/portfolio/anna-niedobitek-fotografia/` | realizacja strony fotografki | zrzuty, funkcje | /realizacje/, /dla-branz/fotograf/, /oferta/, /o-mnie/, artykuł „czy Facebook” |
| `/dla-branz/` + 4 branże | strona internetowa dla [branży] | priorytety branży | menu, strona główna, poradnik |
| `/poradnik/` + 6 artykułów | pytania przed zamówieniem strony | koszty, domena, czas, zawartość | menu, strona główna (3 artykuły), /oferta/, /o-mnie/ |
| `/o-mnie/` | kim jest autor | podejście, AI, współpraca | menu, strona główna (skrót), podpis autora w artykułach |
| `/kontakt/` | kontakt (użytkowa) | — | menu, CTA na podstronach, stopka |

Kanibalizacja: `/` i `/oferta/` mają różne TITLE/H1 i intencje (fraza lokalna vs „oferta i zasady”); `/oferta/` nie używa frazy „tworzenie stron internetowych Wrocław”.
`/realizacje/` (lista) vs karta Anny (jeden projekt); `/o-mnie/` vs skrót na stronie głównej (inne teksty); `/kontakt/` bez treści sprzedażowych.

## SEO — dalsze utrzymanie po wersji 1.0
Wersja 1.0 jest kompletna technicznie i treściowo. Dalszy rozwój wynika z danych i prawdziwych realizacji, nie z chęci posiadania większej liczby adresów.
- **Search Console (co tydzień przez pierwsze 8–12 tygodni, potem co miesiąc):** wyświetlenia, kliknięcia, CTR, średnia pozycja — osobno dla `/`, `/oferta/`, poradnika, stron branżowych i realizacji.
- **Indeksowanie:** raport „Strony” — czy nowe adresy (`/oferta/`, `/o-mnie/`, `/kontakt/`) są zaindeksowane; czy nie pojawiają się `/portfolio/` bez ukośnika, adresy z parametrami ani `*.pages.dev`.
- **Zapytania:** które frazy pokazują stronę główną, a które podstrony. Jeśli strona główna pokazuje się często na zapytania bez „Wrocław” (np. „strony internetowe dla firm”) — wtedy wrócić do decyzji o `/strony-internetowe-dla-firm/`.
- **CTR:** strony z dużą liczbą wyświetleń i niskim CTR — poprawić TITLE/opis (bez zmiany H1 strony głównej bez potrzeby).
- **Pozycje:** obserwować trend, nie pojedyncze dni. Nie obiecywać klientom pozycji.
- **Nowe realizacje:** każda prawdziwa realizacja (za zgodą) = karta w panelu, a przy mocnym materiale — opis jak dla Anny (`kind: 'case'`), z prawdziwymi zrzutami.
- **Nowe branże:** dopiero gdy są realizacja, zapytania w Search Console albo realne pytania klientów (kolejność wstępna: masaż/fizjoterapia, restauracja, szkoła; kancelaria — z ostrożnością ze względu na zasady reklamy zawodów prawniczych).
- **Nowe artykuły:** tylko na pytania, które realnie się pojawiają (od klientów albo w zapytaniach Search Console).
- **Po każdej zmianie treści:** `node build.mjs` (pilnuje dat), sprawdzenie sitemapy, ponowne zgłoszenie zmienionego adresu w Search Console tylko przy większych zmianach.
