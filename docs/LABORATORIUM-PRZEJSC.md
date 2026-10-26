# Laboratorium przejść A/B/C (tymczasowe)

Kod do porównania trzech wariantów przejścia między podstronami na prawdziwym serwisie.
Bez wyboru wariantu serwis działa dokładnie jak wcześniej (obecne przenikanie z ETAPU 2.1).

## Jak włączyć

Dopisz do dowolnego adresu parametr:

| Wariant | Przykład |
|---|---|
| A — Premium Fade | `https://stronyaiwroclaw.pl/?transition=a` |
| B — Navy Curtain | `https://stronyaiwroclaw.pl/?transition=b` |
| C — Split Reveal | `https://stronyaiwroclaw.pl/?transition=c` |
| obecne przejście (do porównania) | `https://stronyaiwroclaw.pl/?transition=0` |
| wyłączenie | `https://stronyaiwroclaw.pl/?transition=off` |

- Parametr znika z paska adresu od razu po wejściu; wybór jest pamiętany tylko w tej karcie przeglądarki (sessionStorage) — po jej zamknięciu laboratorium się wyłącza.
- W lewym dolnym rogu pojawia się małe okienko „Przejście: Obecne / A / B / C / ×”. Zmiana działa od następnego kliknięcia linku.
- Okienko widzi wyłącznie osoba, która weszła z parametrem. Zwykli odwiedzający go nie widzą.
- Canonical, sitemap, robots, TITLE, H1 i treść nie zależą od parametru.

## Gdzie jest kod

| Plik | Co zawiera |
|---|---|
| `public/assets/js/vt-lab.js` | cały JavaScript laboratorium (wybór wariantu, warstwa kurtyny/skrzydeł w `pagereveal`, okienko testowe) |
| `public/assets/css/style.css` | jeden blok między `LABORATORIUM PRZEJŚĆ A/B/C — START` a `— KONIEC` (na końcu pliku) |
| `work/pages/layout.html`, `index.src.html`, `polityka.src.html`, `404.src.html` | jedna linia `<script src="/assets/js/vt-lab.js?v=1"></script>` w `<head>` |
| `work/build.mjs` | `@@VT_ATTRS@@` → `data-transition-label` / `data-transition-parent` na `<html>` (krótka nazwa strony do kurtyny B) |

## Po wyborze wariantu (kolejny krok)

1. Usunąć okienko testowe, obsługę `?transition=` i sessionStorage z `vt-lab.js` (lub cały plik przy wariancie A).
2. Z bloku CSS zostawić tylko wybrany wariant; selektory `html[data-vt="…"]` zamienić na bezwarunkowe (A) albo zostawić warunek typu przejścia (B/C).
3. Wariant A: nie potrzebuje JavaScriptu — wystarczy CSS; usuwamy skrypt z `<head>` i atrybuty `data-transition-*`.
4. Wariant B/C: zostaje mały skrypt (`pagereveal` + warstwa), atrybuty `data-transition-label` zostają tylko dla B.
5. Podbić wersję `style.css?v=…`.
