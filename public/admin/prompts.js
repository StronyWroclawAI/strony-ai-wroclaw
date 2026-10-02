/* Teksty dla AI generowane z briefu klienta (tylko panel administratora).
   Korzysta z definicji briefu: /brief/schema.js (window.BRIEF_SCHEMA). */
(function () {
  'use strict';
  const S = window.BRIEF_SCHEMA;
  if (!S) return;
  const H = S.helpers;

  const AUTHOR = 'Strony AI Wrocław (Grzegorz, Wrocław, kontakt: stronywroclawai@gmail.com)';
  const name = (a, meta) => a.company_name || (meta && meta.company_name) || 'firma';
  const slug = (t) =>
    String(t || '')
      .toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'projekt';
  const val = (id, a) => {
    const f = H.fieldById(id);
    return f && H.isVisible(f, a) ? H.formatValue(f, a) : '';
  };
  const langs = (a) => {
    const l = Array.isArray(a.languages) ? a.languages.filter((x) => x !== 'pl').map((x) => x.toUpperCase()) : [];
    if (a.languages__other) l.push(String(a.languages__other).trim());
    return l.length ? `[PL i ${l.join(', ')}]` : '[PL]';
  };
  const colors = (a) => (a.colors === 'mam' && a.colors_list ? `kolory firmowe klienta: ${a.colors_list}` : 'kolory dobrane w projekcie strony (kolor główny, kolor akcentu, tło — podaj ich kody HEX w komentarzu w kodzie)');

  /* ---------- Układ strony ---------- */
  function layoutTask(a) {
    const recs = H.recommendedLayouts(a).map((v) => H.layoutById(v)).filter(Boolean);
    const recText = recs.length ? `Dla tej branży zwykle polecam: ${recs.map((l) => l.l).join(' lub ')}.` : '';
    const L = a.layout && a.layout !== 'auto' ? H.layoutById(a.layout) : null;
    if (L) {
      return `UKŁAD STRONY (wybór klienta): ${L.l}
- Jak ma wyglądać: ${L.how}
- Zastosuj ten układ konsekwentnie na komputerze; na telefonie elementy układają się jedna pod drugą w logicznej kolejności.${a.layout !== 'onepage' && a.site_type ? `\n- Podział na strony: ${val('site_type', a)}.` : ''}${recs.length && !recs.some((l) => l.v === L.v) ? `\n- Uwaga dla mnie: ${recText} Jeśli wybrany układ wyraźnie utrudni pokazanie treści z briefu, napisz to na końcu i zaproponuj poprawkę — ale stronę wykonaj w układzie wybranym przez klienta.` : ''}`;
    }
    return `UKŁAD STRONY: klient nie ma preferencji — dobierz układ najlepiej pasujący do branży, ilości treści i dostępnych materiałów.
- Do wyboru: ${S.layouts.filter((l) => l.how).map((l) => l.l).join('; ')}.
- ${recText || 'Wybierz na podstawie briefu.'}
- Zanim zaczniesz kodować, napisz w 2–3 zdaniach, który układ wybierasz i dlaczego (to uzasadnienie przekażę klientowi).${a.site_type ? `\n- Podział na strony: ${val('site_type', a)}.` : ''}`;
  }

  /* ---------- Panel administracyjny (specyfikacja) ---------- */
  function panelSpec(a, standalone) {
    const scope = val('panel_scope', a);
    return `${standalone ? 'Dodaj do mojej strony panel administracyjny (CMS) według poniższej specyfikacji.' : 'Dodaj do tej strony panel administracyjny (CMS) według poniższej specyfikacji.'} Strona jest pojedynczym plikiem HTML (czysty HTML/CSS/JS, bez frameworków i bez serwera). Panel ma być wbudowany w ten sam plik, cały interfejs po polsku, treści strony w językach: ${langs(a)}. Ma być w nim również możliwość zmiany hasła do logowania się do panelu administracyjnego.
Dopasuj panel do branży klienta i do sekcji, które faktycznie są na stronie: pomiń podstrony panelu dla elementów, których strona nie ma, a nazwy grup i list dostosuj do branży (np. „Menu” zamiast „Oferta” w restauracji, „Pokoje” w hotelu).${scope ? ` Klient chce samodzielnie zmieniać przede wszystkim: ${scope}.` : ''}

=== 1. ZASADA DZIAŁANIA ===
- Wszystkie treści strony, które ma edytować klient (teksty, listy, zdjęcia, cennik, godziny), są przechowywane w jednym obiekcie danych (state) z wartościami początkowymi wpisanymi w kodzie.
- Strona renderuje te sekcje z danych. Każda zmiana w panelu od razu odświeża stronę (podgląd na żywo) i zapisuje się automatycznie.
- Zapis: IndexedDB w przeglądarce, z awaryjnym localStorage. Przy starcie strona wczytuje zapisane dane i scala je z danymi początkowymi, żeby nowe pola dodane w kodzie nie znikały.
- To wersja demonstracyjna/portfolio: dane zapisują się tylko w przeglądarce osoby edytującej, a login i hasło są w kodzie. Zaznacz to w komentarzu w kodzie.
- Panel ma własne style z unikalnym prefiksem klas (np. .cmsp-), żeby nie kolidował ze stylami strony. Kolory panelu dopasuj do marki: ${colors(a)}.

=== 2. LOGOWANIE ===
- Mała ikonka kłódki przyklejona w lewym dolnym rogu strony (na telefonie nad dolnym paskiem przycisków) oraz link „Panel administratora” w stopce.
- Kliknięcie otwiera okno logowania: login, hasło, przyciski „Zaloguj” i „Anuluj”, komunikat przy złych danych. Pod formularzem podpowiedź „Wersja demonstracyjna · login admin, hasło [krótkie hasło związane z branżą — wpisz je w podpowiedzi]”.
- Po zalogowaniu sesja trwa do zamknięcia karty (sessionStorage). Kłódka zmienia się w przycisk „Panel”, który otwiera panel bez ponownego logowania.
- Zmiana hasła: w Ustawieniach panelu formularz „obecne hasło / nowe hasło / powtórz”; nowe hasło zapisuje się razem z danymi w przeglądarce i od tej chwili obowiązuje przy logowaniu.
- Escape zamyka okno, focus wraca do przycisku.

=== 3. WYGLĄD PANELU ===
- Pełnoekranowa nakładka nad stroną.
- Górny pasek: logo i nazwa firmy z podpisem „Panel administratora”, wskaźnik zapisu („Zapisywanie…” / „Zapisano 18:42” z kolorową kropką), przyciski „Zobacz stronę” (zamyka panel) i „Wyloguj”.
- Lewe menu podzielone na grupy z nagłówkami (Przegląd, Treści czasowe, Oferta, Wizerunek, Zaufanie, Salon/Firma, Ustawienia). Przy pozycjach list licznik elementów, a przy promocjach i aktualnościach zielony licznik aktywnych.
- Na telefonie menu zamienia się w poziomy, przewijany pasek zakładek, a formularze układają się w jednej kolumnie.
- Każda podstrona ma tytuł, krótki opis i przycisk „Zobacz na stronie”, który zamyka panel i przewija do danej sekcji.
- Komunikaty (toast) na dole ekranu: „Dodano. Zmiana jest już na stronie.”, „Zapisano zmiany.”, „Usunięto.” itp.

=== 4. PULPIT (strona startowa panelu) ===
- Powitanie „Dzień dobry!” i szybkie przyciski: „+ Promocja”, „+ Aktualność”, „Godziny”.
- Kafelki z liczbami (klikalne, prowadzą do danej podstrony): stan firmy teraz (Otwarte/Zamknięte + „otwieramy jutro o 9:00”), aktywne promocje (+ ile zaplanowanych), aktualności na stronie, liczba usług, zdjęcia w galerii, opinie.
- Harmonogram (wykres Gantta) promocji i aktualności z terminem: 30 dni wstecz i 90 dni naprzód, pionowa linia „dzisiaj”, paski w kolorach statusu (zielony aktywne, żółty zaplanowane, szary zakończone/wstrzymane) i legenda.
- Lista „Najbliższe 45 dni”: daty, kiedy coś pojawi się na stronie, kiedy zniknie, oraz nadchodzące dni specjalne (np. „1.11 – salon nieczynny”).

=== 5. LISTY (KOLEKCJE) – wspólne funkcje ===
Każda sekcja listowa (usługi, cennik, galeria, zespół, opinie, FAQ, porady, pakiety, punkty voucherów, certyfikaty, nagrody, wyróżniki firmy, zdjęcia slidera, atuty w nagłówku, dni specjalne) ma w panelu:
- listę wierszy: strzałki ▲▼ do zmiany kolejności, miniaturę zdjęcia (lub numer), tytuł i podsumowanie (np. czas · cena), plakietkę statusu oraz przyciski: Ukryj/Pokaż, Duplikuj, Edytuj, Usuń;
- usuwanie z potwierdzeniem (pierwsze kliknięcie zmienia przycisk na „Na pewno?”, drugie usuwa; po 3,5 s wraca do stanu wyjściowego);
- przycisk „+ Dodaj [element]”, który otwiera okno edycji;
- okno edycji (modal) z formularzem pól, przyciskami „Dodaj/Zapisz zmiany”, „Anuluj” i (przy edycji) „Usuń”, zamykane klawiszem Escape;
- walidację: wymagany tytuł/nazwa, data końca nie wcześniejsza niż startu, zdjęcie wymagane w galerii i sliderze, godziny wymagane dla dnia specjalnego, jeśli nie jest „nieczynny”; komunikat błędu w oknie;
- ukryte elementy nie pokazują się na stronie, ale zostają w panelu (wiersz wyszarzony, plakietka „Ukryta”);
- pusta lista pokazuje komunikat „Brak pozycji. Kliknij + Dodaj…”.

Typy pól w formularzach:
- tekst i tekst wielowierszowy – przy wielu językach pola PL i EN obok siebie z małą etykietą języka;
- zdjęcie: podgląd, „Wgraj z dysku” (automatyczne zmniejszenie do ok. 1100–1600 px i zapis jako JPEG), „Usuń zdjęcie”, pole na adres URL;
- data, godzina, pole „tak/nie” (checkbox), lista wyboru (np. powiązana usługa, typ przycisku), liczba.
W tekstach działa proste formatowanie: *kursywa* (w kolorze akcentu), **pogrubienie**, pusta linia = nowy akapit.

=== 6. TREŚCI CZASOWE: PROMOCJE I AKTUALNOŚCI ===
- Każdy wpis ma daty „Pokazuj od” i „Pokazuj do” (puste = bez końca) oraz opcję „Wstrzymaj”.
- Status liczony automatycznie: Aktywna / Zaplanowana (przed startem) / Zakończona (po dacie końca) / Wstrzymana. Plakietki w kolorach: zielona, żółta, szara.
- Na stronie pokazują się tylko aktywne; po terminie znikają same, a w panelu zostają jako archiwum.
- Filtry nad listą: Wszystkie / Aktywne / Zaplanowane / Zakończone / Wstrzymane, z licznikami.
- Nowe wpisy dodają się na górę listy; domyślnie start = dziś, koniec = dziś + 14 dni.
- Promocja: tytuł, opis, plakietka (np. „−15%”), zdjęcie, powiązana usługa (na karcie tej usługi pojawia się plakietka promocji), opcja „pokaż też na górnym pasku”.
- Aktualność: tytuł, treść, data wpisu, zdjęcie, opcja „pokaż na górnym pasku”.
- Sekcje „Promocje” i „Aktualności” na stronie (oraz ich pozycje w menu strony) chowają się automatycznie, gdy nie ma w nich nic aktywnego.

=== 7. GODZINY OTWARCIA ===
- Siedem wierszy (poniedziałek–niedziela): przełącznik otwarte/nieczynne, godzina od, godzina do. Pola godzin są nieaktywne, gdy dzień jest nieczynny.
- Przyciski „Kopiuj poniedziałek na wt–pt” i „Kopiuj poniedziałek na cały tydzień”.
- Ostrzeżenie, gdy godzina zamknięcia nie jest późniejsza niż otwarcia.
- Dni specjalne (osobna lista): data, „nieczynne” albo inne godziny, opis (np. „Wigilia”). Mają pierwszeństwo przed godzinami tygodniowymi, sortują się po dacie i pokazują się na stronie 60 dni wcześniej jako „Zmiany w godzinach”.
- Na podglądzie w panelu i na stronie: status na żywo „Otwarte teraz · do 20:00” (zielony, pulsująca kropka), „żółty” na ostatnią godzinę, „Zamknięte · otwieramy jutro o 9:00 / w środę o 10:00” (czerwonawy). Status odświeża się co minutę.
- W tabeli godzin na stronie dzisiejszy dzień jest wyróżniony.

=== 8. POZOSTAŁE PODSTRONY PANELU ===
- Strona główna: nadtytuł, tytuł główny, wprowadzenie, hasło w stopce; zdjęcia slidera w nagłówku; atuty pod przyciskami.
- O firmie: tekst z akapitami, 2 zdjęcia, wyróżniki (tytuł + opis).
- Oferta: usługi (nazwa, opis, czas, cena, zdjęcie, własna plakietka, „nowość”, przycisk „Rezerwuję” lub „Zapytanie o termin”).
- Cennik: pozycje z kategorią (każda kategoria to osobna tabela na stronie), nazwą, dopiskiem, czasem i ceną; uwaga pod cennikiem. Cena zaczynająca się od „od” w wersji EN zmienia się na „from”.
- Pakiety/karnety (nazwa, opis, cena) i warunki voucherów (punkty listy).
- Galeria: zdjęcie, podpis, kategoria (kategorie tworzą filtry nad galerią na stronie).
- Zespół: imię, rola, opis, zdjęcie.
- Opinie: autor, ocena 3–5 gwiazdek, usługa, treść; podsumowanie ocen (średnia, liczba opinii, link do Google). Lista opinii startuje PUSTA — nie wymyślaj opinii; klient wpisze prawdziwe.
- Certyfikaty, nagrody, FAQ (pytanie/odpowiedź), porady.
- Dane kontaktowe: telefon, e-mail, WhatsApp, Messenger, adres, kod, miasto, dzielnica, link do rezerwacji (np. Booksy), Facebook, Instagram. Zmiany od razu aktualizują wszystkie przyciski „Zadzwoń”, „Rezerwacja”, stopkę i link do Map Google.
- Informacje praktyczne: parking, płatności, dostępność, regulamin.
- Sekcje strony: lista sekcji z przełącznikami (widoczna/ukryta + plakietka), a po rozwinięciu pola na tytuł i wprowadzenie sekcji.
- Ustawienia: zmiana hasła do panelu.
- Kopia zapasowa: eksport (pole z danymi JSON, „Kopiuj do schowka”, „Pobierz plik .json”), import (wklejenie tekstu lub wybór pliku, z walidacją, że to kopia z tego panelu), „Przywróć treści początkowe” (z podwójnym potwierdzeniem).

=== 9. ELEMENTY DYNAMICZNE NA STRONIE (sterowane z panelu) ===
- Górny pasek komunikatów, który co 5 s przewija aktywne promocje i aktualności oznaczone „na pasku”; z licznikiem i linkiem do sekcji.
- Slider zdjęć w nagłówku: płynne przejście co 6 s, lekkie zbliżenie zdjęcia, kropki nawigacji.
- Karty promocji: plakietka, „Ważne do 25 października”, odliczanie „Zostało 12 dni 4 h” i pasek postępu trwania promocji, przycisk rezerwacji powiązanej usługi.
- Galeria z filtrami kategorii i powiększeniem zdjęcia (lightbox: strzałki, klawiatura, Escape, licznik 3/6).
- Status otwarcia na żywo w nagłówku i przy godzinach.
- Plakietki na kartach usług: promocja, nowość, własna.
- Wszystkie animacje wyłączone przy ustawieniu „ogranicz ruch” (prefers-reduced-motion).

=== 10. JAKOŚĆ ===
- Pełna obsługa klawiatury, widoczny focus, etykiety pól, role dialog/aria-modal dla okien.
- Strona i panel działają na telefonie (szerokość 390 px) bez poziomego przewijania.
- Zdjęcia, które się nie wczytają, nie psują układu (zostaje kolorowe tło zastępcze).
- Kod uporządkowany: najpierw dane początkowe, potem renderowanie strony, na końcu panel.

Na koniec przetestuj: logowanie (złe i dobre hasło), zmianę hasła (stare przestaje działać, nowe działa po odświeżeniu), dodanie promocji zaplanowanej (nie ma jej na stronie) i aktywnej (jest na stronie i na pasku), usunięcie, zmianę kolejności, ukrycie, zmianę godzin w niedzielę, dodanie dnia specjalnego, wyłączenie sekcji, zmianę tekstu nagłówka oraz to, czy wszystko zostaje po odświeżeniu strony.`;
  }

  /* ---------- 1. Strona + panel ---------- */
  function site(a, meta) {
    const needsBrand = H.needsLogo(a) || H.needsTagline(a);
    const what = [H.needsLogo(a) ? 'logo' : '', H.needsTagline(a) ? 'hasło' : ''].filter(Boolean).join(' i ');
    return `Jesteś doświadczonym projektantem stron internetowych, UX/UI designerem, copywriterem i programistą front-end.
Na podstawie briefu klienta (na końcu tej wiadomości) przygotuj kompletną stronę internetową firmy „${name(a, meta)}” z wbudowanym panelem administracyjnym.

ZASADY OGÓLNE
- Nie wymyślaj faktów, opinii klientów, liczb, nagród ani certyfikatów, których nie ma w briefie — brakujące informacje oznacz jako [DO UZUPEŁNIENIA].
- Dopasuj strukturę, słownictwo, zdjęcia i wezwania do działania do branży klienta oraz tego, czego szukają jego klienci.
- Treści pisz po polsku, zgodnie z myślą przewodnią, wartościami i sposobem zwracania się do klientów z briefu.
- Uwzględnij tylko sekcje i funkcje wybrane w briefie; propozycje dodatkowe wypisz osobno na końcu, nie dodawaj ich samowolnie.
- Dostępność WCAG 2.1 AA, wygląd na telefonie (390 px) bez przewijania poziomego, szybkie ładowanie, prefers-reduced-motion.
${needsBrand ? `
LOGO I HASŁO
Klient prosi o: ${what}. Powstają w osobnym kroku (strona wyboru z 4 opcjami, którą klient akceptuje).
- Jeśli do tej wiadomości dołączam wybrane ${what} — użyj ich i dopasuj do nich kolory oraz typografię strony.
- Jeśli nie dołączam — użyj tymczasowego logotypu z nazwy firmy i oznacz miejsca [LOGO DO PODMIANY] / [HASŁO DO PODMIANY].
` : ''}
${layoutTask(a)}

ZADANIE 1: STRONA
- Jeden plik HTML (czysty HTML/CSS/JS, bez frameworków i bez serwera), gotowy do wgrania na hosting statyczny (np. Cloudflare Pages).
- Zanim zaczniesz kodować, wypisz krótko: mapę sekcji, główny przekaz pierwszego ekranu i kolory z kodami HEX.
- Zdjęcia: użyj wyłącznie materiałów wskazanych w briefie; tam, gdzie ich brakuje, wstaw neutralne tła zastępcze opisane [ZDJĘCIE: co ma przedstawiać].

ZADANIE 2: PANEL ADMINISTRACYJNY
${panelSpec(a, false)}

=== BRIEF KLIENTA ===

${H.toMarkdown(a, meta)}`;
  }

  /* ---------- 2. Strona wyboru logo i haseł (4 opcje) + ZIP ---------- */
  function logoPage(a, meta) {
    const n = name(a, meta);
    const sl = slug(n);
    const logo = H.needsLogo(a);
    const tag = H.needsTagline(a);
    const text = a.logo_text ? String(a.logo_text).trim() : n;
    const haveTag = !tag && a.tagline_text ? String(a.tagline_text).trim() : '';
    const intro = logo
      ? `Klient ${a.logo === 'odswiezenie' ? 'ma logo i chce je odświeżyć (zachowaj to, co wskazał w briefie)' : 'nie ma logo'}${tag ? ' i prosi o propozycje hasła firmowego' : haveTag ? ` i ma hasło: „${haveTag}” (użyj go w wersjach logo z hasłem)` : ''}.`
      : 'Klient ma logo i prosi tylko o propozycje hasła firmowego.';
    const options = logo
      ? `A. CZTERY OPCJE
Przygotuj 4 wyraźnie różne kierunki (nie warianty jednego pomysłu). Każda opcja zawiera:
1. Nazwę kierunku i 2–3 zdania uzasadnienia powiązane z briefem (branża, myśl przewodnia, wartości, klienci, czego unikać).
2. Logo dla napisu „${text}”: wersja pozioma (podstawowa), pionowa i sam znak.
${tag ? '3. Dwie propozycje hasła firmowego dopasowane do tego kierunku (po polsku, do ok. 6 słów), plus wersja logo z hasłem.' : haveTag ? '3. Wersję logo z hasłem klienta.' : '3. (Klient nie potrzebuje hasła — pomiń hasła.)'}
4. Paletę 2–4 kolorów z kodami HEX i 1–2 kroje pisma z licencją do użytku komercyjnego (np. Google Fonts).
5. Podgląd zastosowań: na jasnym i ciemnym tle, jako ikona 64 px / zdjęcie profilowe oraz w prostej makiecie (np. szyld lub wizytówka narysowane w CSS/SVG).
Zasady: logo oryginalne — nie kopiuj i nie naśladuj znanych logo ani znaków towarowych; proste kształty czytelne w małym rozmiarze i w jednym kolorze; unikaj skojarzeń, których klient nie chce.`
      : `A. PROPOZYCJE HASEŁ
Przygotuj 4 kierunki (np. rzeczowy, emocjonalny, z humorem, elegancki), w każdym po 2 hasła po polsku (do ok. 6 słów) z jednym zdaniem uzasadnienia powiązanym z briefem. Nie powielaj znanych sloganów innych marek. Pokaż każde hasło obok nazwy firmy, tak jak wyglądałoby na stronie.`;
    const files = logo
      ? `C. PACZKA ZIP — ${sl}-logo.zip (dokładnie ta struktura)
${sl}-logo/
  wybor-logo.html
  hasla.txt                 (wszystkie hasła z numerami opcji)
  README.txt                (lista plików, kolory HEX, kroje pisma i ich licencje)
  opcja-1/
    logo-poziome.svg
    logo-pionowe.svg
    znak.svg
    logo-czarne.svg         (jednokolorowe)
    logo-biale.svg          (na ciemne tło)
    logo-poziome.png        (2000 px szerokości, przezroczyste tło)
    znak.png                (1024×1024, przezroczyste tło)
    ikona-512.png           (znak na tle, do zdjęcia profilowego / favicon)
  opcja-2/ … opcja-3/ … opcja-4/   (te same pliki)
Każde logo ma być OSOBNYM plikiem graficznym. W plikach SVG zamień napisy na krzywe (albo osadź font), żeby wyglądały tak samo na każdym komputerze. Nazwy plików: małe litery, cyfry, myślniki.`
      : `C. PACZKA ZIP — ${sl}-hasla.zip
${sl}-hasla/
  wybor-hasla.html
  hasla.txt   (wszystkie hasła z numerami)`;
    const page = logo ? 'wybor-logo.html' : 'wybor-hasla.html';
    return `Jesteś doświadczonym projektantem identyfikacji wizualnej i copywriterem marek.
Na podstawie briefu klienta (na końcu) przygotuj STRONĘ WYBORU ${logo ? 'LOGO' : 'HASŁA'}${logo && tag ? ' I HASŁA' : ''} dla firmy „${n}”, którą pokażę klientowi do wyboru i akceptacji, oraz PACZKĘ ZIP z plikami.
Przygotowuje: ${AUTHOR}.
${intro}
Nie wymyślaj faktów o firmie, których nie ma w briefie.

${options}

B. STRONA Z PROPOZYCJAMI — ${page}
Tę stronę wgram do panelu mojej strony; klient zobaczy ją w ramce, a POD NIĄ będzie mój formularz wyboru (opcja, hasło, uwagi, akceptacja). Dlatego:
- Jeden samodzielny plik HTML (CSS i JS w środku, ${logo ? 'logo jako inline SVG, ' : ''}bez zewnętrznych skryptów i bez plików obok). Fonty mogą być z Google Fonts (z zapasowym krojem systemowym). Rozmiar najlepiej poniżej 2 MB.
- NIE dodawaj własnego formularza, przycisków „wybieram”, mailto ani wysyłki — wybór odbywa się w moim formularzu pod ramką. Na końcu strony dodaj tylko zdanie: „Wybór zaznacz w formularzu poniżej propozycji.”
- Po polsku, w tonie z briefu. Nagłówek: „Propozycje ${logo ? 'logo' : 'hasła'}${logo && tag ? ' i hasła' : ''} dla ${n}”, podpis „Przygotował: Strony AI Wrocław — Grzegorz”.
- Krótkie wprowadzenie: jak czytać propozycje i co stanie się po wyborze (dopracuję wybraną opcję i przygotuję komplet plików).
- 4 opcje jedna pod drugą, każda z dużym podglądem i opisem z części A, WYRAŹNIE ponumerowane dużym nagłówkiem „Opcja 1” … „Opcja 4” (klient wybiera po numerze).
- Adnotacja: „Propozycje są wstępne. Ostateczną wersję dopracuję po Twoim wyborze.”
- Dostępność: kontrast WCAG AA, teksty alternatywne opisujące każde logo, wygląd bez przewijania poziomego na 390 px, czytelny wydruk.
- Nie używaj localStorage, cookies, analityki ani odnośników do innych plików.
- OBOWIĄZKOWO umieść w <head> ten blok danych (mój panel czyta z niego nazwy opcji i hasła do formularza wyboru) — uzupełnij prawdziwymi nazwami i hasłami z części A:
<script type="application/json" id="logo-options">
{"options":[
  {"name":"[nazwa kierunku 1]","taglines":["[hasło 1a]","[hasło 1b]"],"svg":"[kompletny kod SVG logo poziomego opcji 1]"},
  {"name":"[nazwa kierunku 2]","taglines":["[hasło 2a]","[hasło 2b]"],"svg":"[…opcji 2]"},
  {"name":"[nazwa kierunku 3]","taglines":["[hasło 3a]","[hasło 3b]"],"svg":"[…opcji 3]"},
  {"name":"[nazwa kierunku 4]","taglines":["[hasło 4a]","[hasło 4b]"],"svg":"[…opcji 4]"}
]}
</script>
  Pole "svg": samodzielne logo poziome danej opcji jako jeden tekst — z atrybutami xmlns i viewBox, kolory i style wpisane w SVG (bez klas CSS ze strony), napis zamieniony na krzywe, cudzysłowy zapisane jako \\" (poprawny JSON), do ok. 60 KB. Dzięki temu w moim panelu i w formularzu wyboru widać miniaturę każdej opcji.
  Sekcja każdej opcji na stronie ma mieć id="opcja-1" … id="opcja-4".
  (jeśli klient nie potrzebuje haseł — zostaw "taglines":[]).

${files}

D. NA KONIEC
- Otwórz ${page} i sprawdź, czy wszystko się wyświetla i czy blok <script id="logo-options"> jest poprawnym JSON-em z 4 opcjami.
- Daj mi do pobrania: osobno plik ${page} (wgram go do panelu) oraz ZIP. Podaj listę plików z rozmiarami.

=== BRIEF KLIENTA ===

${H.toMarkdown(a, meta)}`;
  }

  /* ---------- 3. Sam panel administracyjny ---------- */
  function panel(a, meta) {
    return `${panelSpec(a, true)}

Załączam plik strony (index.html), do którego ma zostać dodany panel.

=== KONTEKST: BRIEF KLIENTA ===

${H.toMarkdown(a, meta)}`;
  }

  /* ---------- 4. Karta do portfolio ---------- */
  function portfolio(a, meta) {
    const n = name(a, meta);
    const sl = slug(n);
    const city = (a.location ? String(a.location).split(',')[0].trim() : '') || '[miasto]';
    const done = [
      H.needsLogo(a) ? 'logo' : '',
      H.needsTagline(a) ? 'hasło' : '',
      a.layout === 'onepage' || a.site_type === 'onepage' ? 'strona one-page' : a.site_type === 'podstrony' ? 'strona z podstronami' : 'strona internetowa',
      'panel do edycji',
      'wersja na telefon',
      Array.isArray(a.languages) && a.languages.length > 1 ? 'wersje językowe' : '',
    ].filter(Boolean).join(', ');
    const sections = val('sections', a);
    const features = [sections ? `sekcje: ${sections}` : '', val('booking', a) ? `rezerwacje: ${val('booking', a)}` : '', val('integrations', a) ? `dodatki: ${val('integrations', a)}` : ''].filter(Boolean).join('; ') || '[lista]';
    const live = a.domain_name ? `[https://${String(a.domain_name).split(/[\s—-]+/)[0].replace(/^https?:\/\//, '')}] (sprawdź adres)` : '[https://…] (jeśli brak — pomiń przycisk)';
    return `Przygotuj mi KOMPLETNY PLIK ZIP z kartą projektu do portfolio na mojej stronie „Strony AI Wrocław”
(autor: Grzegorz, Wrocław, kontakt: stronywroclawai@gmail.com). ZIP wgram w panelu administratora
(Portfolio → Karta projektu), a karta pojawi się pod adresem /portfolio/${sl}/.

DANE PROJEKTU
* Nazwa: ${n}
* Branża i miasto: ${H.industryLabel(a) || '[branża]'}, ${city}
* Rodzaj: [prawdziwy klient — mam zgodę firmy na prezentację] ALBO [projekt demonstracyjny — firma fikcyjna]  ← zostaw właściwe
* Co wykonałem: ${done}
* Najważniejsze funkcje: ${features}
* Technika: jeden plik HTML, panel administracyjny (CMS), hosting statyczny (np. Cloudflare Pages)
* Link do strony na żywo: ${live}
* Adres karty: ${sl} (małe litery, cyfry, myślniki)
* Załączam: [pliki strony / zrzuty ekranu]

CO MA BYĆ W ZIP (dokładnie ta struktura):
${sl}/
  index.html
  opis-do-portfolio.txt
  img/ (zrzuty ekranu w WebP)

ZRZUTY EKRANU
* Zrób je sam z załączonej strony (jeśli możesz uruchomić przeglądarkę); jeśli nie — użyj moich zrzutów.
* Komputer 1600×1000: img/d-start.webp (strona główna — będzie okładką kafelka), img/d-[nazwa].webp dla 3–5 kluczowych widoków.
* Telefon 780×1688: img/m-start.webp + 1–3 widoki.
* Panel administracyjny (jeśli jest) 1600×1000: img/p-[nazwa].webp.
* Format WebP, razem najlepiej poniżej 2 MB. Nazwy plików tylko: małe litery, cyfry, myślniki — bez polskich znaków i spacji.

INDEX.HTML — WYMAGANIA TECHNICZNE (inaczej karta nie zadziała):
1. Jeden samodzielny plik: cały CSS i JS w środku, bez frameworków i bez zewnętrznych skryptów. Fonty mogą być z Google Fonts.
2. Wyłącznie ścieżki względne: img/d-start.webp (NIE /img/… i NIE pełne ścieżki z dysku).
3. NIE używaj localStorage, sessionStorage, IndexedDB ani cookies — karta działa w piaskownicy bezpieczeństwa.
4. Link powrotny do portfolio: <a href="/#portfolio">, kontakt: mailto:stronywroclawai@gmail.com.
5. Po polsku, wygląd bez przewijania poziomego na 390 px, kontrast WCAG AA, widoczny fokus,
   teksty alternatywne opisujące każdy zrzut, prefers-reduced-motion wyłącza animacje.

INDEX.HTML — UKŁAD (studium przypadku):
1. Okładka: nazwa, jedno zdanie efektu, etykiety zakresu, przyciski „Zobacz stronę na żywo” i „Jak działa panel”,
   zrzut w ramce przeglądarki + telefon.
2. Zadanie: dla kogo, problem, cel.
3. Marka (jeśli była): logo, kolory z kodami HEX, kroje pisma.
4. Strona: najważniejsze funkcje ze zrzutami.
5. Panel administracyjny: co właściciel zmienia sam.
6. Wersja na telefon.
7. Technika i jakość: dostępność, szybkość, bezpieczeństwo.
8. Zakończenie: „Chcesz taką stronę dla swojej firmy?” + przycisk mailto + link do portfolio.
Zrzuty powiększane po kliknięciu (lightbox obsługiwany klawiaturą: Esc, strzałki).
Styl karty dopasuj do kolorów i charakteru projektu.

UCZCIWOŚĆ
* Żadnych wymyślonych opinii, liczb klientów, wyników ani nagród.
* Jeśli to projekt demonstracyjny: etykieta „Projekt demonstracyjny” na okładce i adnotacja
  „Firma i dane są fikcyjne” na końcu.

OPIS-DO-PORTFOLIO.TXT — dokładnie w tym formacie (panel czyta te linie automatycznie):
Tytuł: ${n}
Podtytuł: ${H.industryLabel(a) || '[branża]'} · ${city}
Opis (1–2 zdania): [efekt dla firmy, nie technika]
Tagi: [3–5 tagów oddzielonych „ · ”]
Miniatura: img/d-start.webp
Link do strony: [https://…]
Link do karty: /portfolio/${sl}/
(Jeśli projekt jest demonstracyjny, dopisz w opisie słowo „demonstracyjny”.)

NA KONIEC
* Otwórz index.html i sprawdź, czy wszystkie obrazy się wczytują i nie ma błędów w konsoli.
* Spakuj folder do ZIP (${sl}.zip) i daj mi go do pobrania.
* Podaj listę plików z rozmiarami.`;
  }

  window.BRIEF_PROMPTS = { site, logoPage, panel, portfolio };
})();
