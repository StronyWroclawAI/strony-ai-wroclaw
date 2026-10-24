# Portfolio i karty projektów

Każda realizacja w portfolio może mieć **kartę projektu**, czyli osobną podstronę ze studium przypadku (np. `twojastrona.pl/portfolio/szalone-auto/`). Kartę wgrywasz w panelu jako jedną paczkę ZIP. Strona główna sama pokaże ładny kafelek ze zrzutem w ramce przeglądarki, tagami i przyciskiem **„Zobacz projekt”**.

---

## 1. Jak dodać projekt do portfolio (krok po kroku)

1. Panel → **Portfolio** → **Dodaj realizację**.
2. W sekcji **Karta projektu** kliknij **Wybierz paczkę ZIP…** i wskaż plik ZIP.
   - Panel rozpakuje go w przeglądarce i sprawdzi zawartość.
   - Jeśli w paczce jest `opis-do-portfolio.txt`, panel sam wpisze nazwę, podtytuł, opis, tagi, link, adres karty, okładkę i oznaczenie „demonstracyjny”. **Sprawdź te pola.**
   - Zobaczysz ostrzeżenia, jeśli czegoś brakuje (np. obrazka, do którego odwołuje się `index.html`).
3. Wybierz **okładkę kafelka**, czyli jeden ze zrzutów. Najlepiej poziomy, np. `img/d-start.webp`.
4. **Rodzaj projektu** (wymagany): **Projekt zrealizowany** (prawdziwa firma, za jej zgodą) albo **Projekt demonstracyjny** (firma fikcyjna / koncepcja — na kafelku pojawi się etykieta „Projekt demonstracyjny”).
   Na stronie portfolio ma dwie zakładki: **Projekty zrealizowane** i **Projekty demonstracyjne**. Dopóki nie opublikujesz żadnego zrealizowanego projektu, zakładek nie ma — widać tylko projekty demonstracyjne. Nazwy i opisy zakładek zmienisz w **Treści strony → Portfolio**.
5. Status: **Szkic** (widzisz go tylko Ty, także kartę — przycisk „Podgląd karty”) albo **Opublikowana**.
6. Kliknij **Zapisz realizację**. Pliki się wgrają (pasek postępu), a kafelek od razu pojawi się na stronie.

Żeby **podmienić kartę**, wybierz nową paczkę ZIP i zapisz. Stara wersja zostanie usunięta dopiero po udanym wgraniu nowej.
**Kolejność** kafelków zmieniasz strzałkami na liście Portfolio. Pierwsza realizacja jest wyróżniona dużym kafelkiem.

---

## 2. Jak przygotować paczkę ZIP

```
szalone-auto.zip
└── szalone-auto/                 ← folder (może go nie być — liczy się miejsce index.html)
    ├── index.html                ← karta projektu (wymagany)
    ├── opis-do-portfolio.txt     ← dane do kafelka (zalecany, nie jest publikowany)
    └── img/
        ├── d-start.webp          ← zrzuty komputera 1600×1000
        ├── m-start.webp          ← zrzuty telefonu 780×1688
        └── p-pulpit.webp         ← zrzuty panelu 1600×1000
```

**Zasady techniczne (ważne):**
- `index.html` to **jeden samodzielny plik**: CSS i JS w środku. Fonty mogą być z Google Fonts.
- **Ścieżki względne:** `img/d-start.webp`, a nie `/img/d-start.webp` ani `C:\…`.
- **Nazwy plików:** bez polskich znaków i spacji (`d-start.webp`, nie `Start strony.webp`).
- **Obrazy w WebP:** jeden plik maks. 10 MB, cała karta maks. 40 MB i 200 plików. W praktyce karta ma ok. 1 MB.
- **Dozwolone typy:** html, css, js, json, svg, png, jpg, webp, avif, gif, ico, woff/woff2/ttf/otf, mp4, webm, pdf.
- Karta działa w **bezpiecznej piaskownicy**. Skrypty (np. powiększanie zdjęć, slider) działają, ale karta **nie może używać localStorage/IndexedDB** ani nie ma dostępu do panelu i ciasteczek strony. To celowa ochrona Twojej strony.
- Link powrotny do portfolio: `<a href="/#portfolio">`.

**Format `opis-do-portfolio.txt`** (panel czyta te linie):
```
Tytuł: Szalone auto
Podtytuł: Warsztat samochodowy · Wrocław
Opis (1–2 zdania): Logo, hasło i strona warsztatu z panelem…
Tagi: Identyfikacja wizualna · Strona 5 podstron · Panel CMS · Wersja na telefon
Miniatura: img/d-start.webp
Link do strony: https://szalone-auto.pages.dev
Link do karty: /portfolio/szalone-auto/
Dla kogo: warsztatu samochodowego
```
Linia **„Dla kogo”** dokańcza zdanie „Projekt strony internetowej dla …”. Na jej podstawie strona sama ustawia kartom tytuł i opis dla Google, np. „Projekt strony internetowej dla warsztatu samochodowego | Strony AI Wrocław”. Dzięki temu karta demonstracyjna nie udaje w wynikach wyszukiwania prawdziwej firmy, a wygląd karty się nie zmienia. To samo pole jest w panelu: **Dla kogo jest ten projekt (do opisu w Google)**.
Słowo „demonstracyjny” albo „fikcyjny” w opisie zaznacza automatycznie „Projekt demonstracyjny”.

---

## 3. Jak sprawić, żeby wyglądało świetnie
- **Okładka:** poziomy zrzut strony głównej 1600×1000 (16:10), z wyraźnym nagłówkiem u góry. Na kafelku pokazuje się w ramce przeglądarki, przycięty od góry.
- **Opis na kafelek:** 1–2 zdania o efekcie dla firmy, a nie o technice.
- **Tagi:** 3–5 krótkich, np. „Logo · Strona 5 podstron · Panel CMS · Wersja na telefon”.
- **Pierwsza realizacja** na liście dostaje duży, wyróżniony kafelek. Ustaw tam najlepszy projekt.
- **Uczciwość:** nie dodawaj zmyślonych opinii ani wyników. Projekty koncepcyjne oznaczaj jako demonstracyjne. Prawdziwe realizacje publikuj tylko za zgodą firmy.
- Tekst nad kafelkami zmienisz w **Treści strony → Portfolio – nagłówek**.

---

## 4. Polecenie dla AI — jak przygotować kartę projektu

Skopiuj poniższy tekst do narzędzia AI (np. Claude), uzupełnij nawiasy kwadratowe i dołącz zrzuty ekranu albo pliki projektu.

```
Przygotuj KARTĘ PROJEKTU do mojego portfolio „Strony AI Wrocław” (Grzegorz, Wrocław, stronyaiwroclaw@gmail.com).
Karta to studium przypadku jednej strony, którą wykonałem. Zostanie wgrana jako ZIP do panelu mojej strony
i wyświetlona pod adresem /portfolio/[adres-karty]/.

PROJEKT
- Nazwa: [nazwa firmy / projektu]
- Branża i miasto: [np. warsztat samochodowy, Wrocław]
- Prawdziwy klient czy projekt demonstracyjny: [prawdziwy, za zgodą firmy / demonstracyjny — firma fikcyjna]
- Co zrobiłem: [np. logo, hasło, strona 5 podstron, panel do edycji, wersja na telefon]
- Najważniejsze funkcje: [lista]
- Technika: [np. jeden plik HTML, Cloudflare Pages, panel CMS]
- Link do strony: [https://…]
- Zrzuty ekranu: [dołączam / zrób je z załączonego projektu]

WYMAGANIA DLA PACZKI
1. Struktura: folder [adres-karty]/ z plikami index.html, opis-do-portfolio.txt i img/.
2. index.html: jeden samodzielny plik HTML (CSS i JS w środku, bez frameworków), po polsku,
   fonty mogą być z Google Fonts. Tylko ścieżki względne (img/…). Nazwy plików bez polskich znaków i spacji.
3. NIE używaj localStorage, sessionStorage, IndexedDB, cookies ani zewnętrznych skryptów analitycznych
   (karta działa w piaskownicy bezpieczeństwa).
4. Zrzuty w WebP: komputer 1600×1000 (img/d-*.webp), telefon 780×1688 (img/m-*.webp),
   panel administracyjny 1600×1000 (img/p-*.webp). Łącznie najlepiej poniżej 2 MB.
5. Układ karty (studium przypadku):
   - okładka: nazwa projektu, jedno zdanie efektu, etykiety zakresu, przyciski „Zobacz stronę na żywo”
     i „Jak działa panel”, zrzut w ramce przeglądarki i telefonu;
   - zadanie: dla kogo, problem, cel;
   - marka (jeśli była): logo, kolory z HEX, kroje pisma;
   - strona: najważniejsze funkcje ze zrzutami;
   - panel administracyjny: co właściciel może zmieniać sam;
   - wersja na telefon;
   - technika i jakość: dostępność (WCAG 2.1 AA), szybkość, bezpieczeństwo;
   - zakończenie: „Chcesz taką stronę dla swojej firmy?” + przycisk mailto:stronyaiwroclaw@gmail.com
     i link powrotny do listy realizacji: <a href="/realizacje/">.
6. Powiększanie zrzutów po kliknięciu (lightbox) dostępne z klawiatury (Esc, strzałki).
7. Dostępność: kontrast WCAG AA, teksty alternatywne opisujące każdy zrzut, widoczny fokus,
   prefers-reduced-motion wyłącza animacje, wygląd bez przewijania poziomego na 390 px.
8. Uczciwość: żadnych wymyślonych opinii, liczb klientów ani wyników sprzedaży.
   Jeśli projekt jest demonstracyjny — napisz to wyraźnie na karcie (np. etykieta „Projekt demonstracyjny”
   i adnotacja „firma i dane są fikcyjne”).
9. opis-do-portfolio.txt dokładnie w tym formacie:
   Tytuł: …
   Podtytuł: [branża] · [miasto]
   Opis (1–2 zdania): …
   Tagi: [3–5 tagów oddzielonych „ · ”]
   Miniatura: img/d-start.webp
   Link do strony: https://…
   Link do karty: /portfolio/[adres-karty]/
   Dla kogo: [branża w dopełniaczu, np. warsztatu samochodowego]
10. Na końcu spakuj folder do ZIP i podaj listę plików z rozmiarami.
```

---

## 5. Bezpieczeństwo (jak to działa)
- Wgrywać karty może tylko zalogowany administrator. Serwer sprawdza nazwę, typ i rozmiar każdego pliku, a przy obrazach także ich zawartość.
- Karta jest wyświetlana z nagłówkiem `Content-Security-Policy: sandbox`. Jej skrypty działają w odizolowanym środowisku, bez dostępu do ciasteczek, panelu i API strony.
- Szkice kart widzi tylko zalogowany administrator, a wyszukiwarki ich nie indeksują. Opublikowane karty trafiają do `sitemap.xml`.
- Pliki kart są w tym samym magazynie KV co zdjęcia. Darmowy plan KV pozwala na 1000 zapisów dziennie, a jedna karta to zwykle 15–30 plików.

---

## 6. Strona /realizacje/ i opis prawdziwej realizacji (case study)
- `/realizacje/` pokazuje wszystkie opublikowane projekty w dwóch osobnych sekcjach: **Realizacje dla firm** (projekty bez zaznaczenia „Projekt demonstracyjny”) i **Projekty demonstracyjne**. O sekcji decyduje wyłącznie to pole w panelu.
- Stary adres `/portfolio/` przekierowuje na stałe (301) na `/realizacje/`. Adresy kart `/portfolio/<adres>/` się nie zmieniają.
- Kartę prawdziwej realizacji przygotuj według tego układu. Punkty, dla których nie masz potwierdzonych informacji, **pomiń** — nie uzupełniaj ich szacunkami:
  1. klient i branża (nazwa tylko za zgodą klienta),
  2. potrzeba — z czym klient przyszedł,
  3. cel strony,
  4. rozwiązanie — co przygotowałem,
  5. funkcje strony,
  6. wersja na komputer i na telefon (zrzuty),
  7. zastosowane rozwiązania (technika, dostępność, szybkość),
  8. panel administracyjny — jeśli strona go ma,
  9. rezultat — tylko fakty (np. „strona działa pod adresem…”, „właścicielka sama zmienia cennik”); bez wymyślonych liczb, konwersji i statystyk,
  10. link do strony — jeśli jest publiczna,
  11. zachęta do kontaktu.
- Opinię klienta dodawaj wyłącznie prawdziwą, dosłowną i za jego zgodą (najlepiej pisemną).

## 7. Opis realizacji bez karty ZIP
Prawdziwą realizację można opisać także jako podstronę serwisu (przygotowaną w buildzie, patrz `docs/SEO.md`, „Etap 3”).
Taki opis ma wygląd, menu, okruszki i przejścia całej strony. Zdjęcia do niego dodajesz w panelu — w realizacji (biblioteka zdjęć);
pokażą się w sekcji „Podgląd projektu”. Gdyby w panelu pojawiła się karta ZIP o tym samym adresie, pierwszeństwo ma karta.
