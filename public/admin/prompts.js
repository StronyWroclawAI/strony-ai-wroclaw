/* Teksty dla AI generowane z briefu klienta (tylko panel administratora).
   Korzysta z definicji briefu: /brief/schema.js (window.BRIEF_SCHEMA). */
(function () {
  'use strict';
  const S = window.BRIEF_SCHEMA;
  if (!S) return;
  const H = S.helpers;

  const AUTHOR = 'Strony AI Wrocław (Grzegorz, Wrocław, kontakt: stronyaiwroclaw@gmail.com)';
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

  /* ---------- Efekty wizualne i animacje (okno „Efekty i animacje” w zgłoszeniu) ----------
     Każda opcja ma krótką nazwę (l), opis dla mnie (d) i tekst do polecenia (p).
     Wybór zapisuje się przy zgłoszeniu (leads.effects) i dopisuje do polecenia na stronę. */
  const EFFECTS = [
    {
      id: 'page', t: 'Przejścia między podstronami', preview: 'page', scope: 'multi',
      note: 'Działa, gdy strona ma podstrony (przy one-page dotyczy tylko przejść do polityki prywatności itp.). Chrome, Edge i Safari pokazują animację; Firefox otwiera podstrony zwyczajnie. Kliknij opcję, aby zobaczyć podgląd.',
      options: [
        { v: 'none', l: 'Bez animacji', p: 'Podstrony otwierają się zwyczajnie, bez animacji przejścia.' },
        { v: 'ai', l: 'Dobierz sam (AI)', d: 'AI wybierze przejście pasujące do marki', p: 'Rodzaj przejścia między podstronami dobierz do charakteru marki (spokojna branża — przenikanie lub wejście od dołu; nowoczesna/kreatywna — zasłona, kurtyna albo okrągłe odsłonięcie) i napisz w notatce, co wybrałeś i dlaczego.' },
        // --- Subtelne
        { c: 'Subtelne przejścia', v: 'fade', l: '1. Przenikanie (fade / crossfade)', d: 'stara podstrona znika, nowa pojawia się w tym samym miejscu — dyskretne, pasuje prawie wszędzie', p: 'PRZENIKANIE (crossfade): stara podstrona płynnie gaśnie, nowa pojawia się w tym samym miejscu (::view-transition-old/new(root): opacity, 300–350 ms, ease-out, obie animacje jednocześnie). Bez przesunięć.' },
        { v: 'fadeshift', l: '2. Przenikanie z lekkim przesunięciem', d: 'stara treść odpływa w bok, nowa wchodzi z przeciwnej strony', p: 'PRZENIKANIE Z PRZESUNIĘCIEM: stara treść przesuwa się o 20–30 px w lewo i gaśnie (ok. 250 ms), nowa wchodzi z przeciwnej strony (z +20–30 px) i staje się widoczna (ok. 400 ms, miękkie wyhamowanie). Przy „Wstecz” kierunki odwrócone (typ przejścia z navigation.activation.navigationType === "traverse" / kolejności w menu).' },
        { v: 'rise', l: '3. Zanikanie i pojawianie od dołu', d: 'nowa podstrona unosi się o kilka pikseli i staje się widoczna', p: 'ZANIKANIE I POJAWIANIE OD DOŁU: stara podstrona gaśnie (ok. 200 ms), nowa unosi się z 12–16 px w dół do pozycji wyjściowej i jednocześnie staje się widoczna (ok. 400 ms, start po 60 ms, krzywa cubic-bezier(.16,1,.3,1)).' },
        { v: 'blur', l: '4. Rozmycie i wyostrzenie (blur / focus)', d: 'stara strona miękko się rozmywa, nowa wyostrza — filmowo, elegancko', p: 'ROZMYCIE I WYOSTRZENIE: stara podstrona rozmywa się (filter: blur 0 → 6 px) i gaśnie, nowa zaczyna lekko nieostra (blur 6 px → 0) i staje się wyraźna; całość 400–450 ms. Rozmycie tylko na komputerze (hover: hover) — na telefonie zwykłe przenikanie (blur na pełnym ekranie obciąża słabsze telefony).' },
        // --- Przesuwające treść
        { c: 'Przejścia przesuwające treść', v: 'slide', l: '5. Wjazd z boku (slide)', d: 'nowa podstrona wjeżdża z prawej (przy „Wstecz” z lewej), stara lekko się cofa', p: 'WJAZD Z BOKU (slide): nowa podstrona wjeżdża nad starą z prawej krawędzi (translateX 100% → 0, ok. 450 ms), stara przesuwa się o 30% w lewo i lekko ciemnieje (opacity .6). Kierunek według kolejności pozycji w menu (dalej w menu = z prawej) i odwrotny przy „Wstecz” — ustaw typ przejścia (viewTransition.types: "forward"/"backward") w zdarzeniu pagereveal.' },
        { v: 'push', l: '6. Wypychanie poprzedniej strony (push)', d: 'nowa strona przesuwa poprzednią poza ekran jak panel', p: 'WYPYCHANIE (push): nowa podstrona wypycha poprzednią poza ekran — obie przesuwają się razem w poziomie (stara 0 → -100%, nowa 100% → 0), 450–500 ms, krzywa cubic-bezier(.65,0,.35,1); kierunek według kolejności w menu, odwrotny przy „Wstecz”.' },
        { v: 'split', l: '7. Podział ekranu na panele (split)', d: 'stara strona rozcina się na dwie połowy, które rozsuwają się na boki', p: 'PODZIAŁ EKRANU (split): stara podstrona „rozcina się” pionowo na dwie połowy, które rozsuwają się na boki (lewa w lewo, prawa w prawo), odsłaniając nową — zrzut starej strony pokazany dwa razy: ::view-transition-old(root) z clip-path: inset(0 50% 0 0) i drugi element-warstwa z prawą połową (albo dwa panele dekoracyjne z nazwą marki), 550–600 ms. Efekt widowiskowy — tylko przy przejściach z menu.' },
        { v: 'gallery', l: '8. Przejście poziome jak w galerii', d: 'podstrony przesuwają się jak slajdy w prezentacji', p: 'PRZEJŚCIE JAK W GALERII: obie podstrony najpierw lekko się zmniejszają (skala 0,92, zaokrąglone rogi), przesuwają w poziomie jak slajdy (stara w lewo, nowa z prawej) i nowa wraca do pełnego rozmiaru; ok. 700 ms. Kierunek według kolejności w menu, odwrotny przy „Wstecz”.' },
        // --- Odsłanianie
        { c: 'Odsłanianie nowej podstrony', v: 'wipe', l: '9. Zasłona przesuwająca się po ekranie (wipe)', d: 'kolorowy panel przejeżdża przez ekran, zasłania starą stronę i odsłania nową', p: 'ZASŁONA (wipe): panel w kolorze marki (z małym logo na środku) przejeżdża przez ekran od lewej do prawej — najpierw zasłania starą podstronę (ok. 250 ms), potem odjeżdża dalej, odsłaniając nową (ok. 300 ms). Panel jako dekoracyjna warstwa dodawana w zdarzeniu pagereveal (aria-hidden, inert, usuwana po zakończeniu).' },
        { v: 'curtain', l: '10. Kurtyna (curtain reveal)', d: 'dwie części zasłony zamykają się na środku i rozsuwają', p: 'KURTYNA: dwie części zasłony w kolorze marki zamykają się na środku ekranu (cienka jasna linia na styku, ok. 230 ms), na chwilę (ok. 50 ms) pozostają zamknięte i rozsuwają się na boki, odsłaniając nową podstronę z lekkim przybliżeniem (skala 1,03 → 1); 560 ms na telefonie, 620 ms na komputerze; łagodna krzywa przy zamykaniu, długie wyhamowanie przy otwieraniu.' },
        { v: 'reveal', l: '11. Odsłanianie od krawędzi (reveal)', d: 'nowa strona wysuwa się spod krawędzi jak karta', p: 'ODSŁANIANIE OD KRAWĘDZI: nowa podstrona odsłania się od dołu ekranu w górę (::view-transition-new(root): clip-path inset(100% 0 0 0) → inset(0), ok. 500 ms) z lekkim cieniem na krawędzi, stara pozostaje pod spodem i lekko ciemnieje.' },
        { v: 'circle', l: '12. Okrągłe odsłonięcie (circular reveal)', d: 'nowa podstrona rośnie jak koło od klikniętego linku', p: 'OKRĄGŁE ODSŁONIĘCIE: nowa podstrona rozchodzi się kołem od miejsca kliknięcia do pełnego ekranu (clip-path: circle(0 at X Y) → circle(150% at X Y), ok. 550 ms). Współrzędne kliknięcia zapisz przy pointerdown w sessionStorage i w pagereveal ustaw jako zmienne CSS (przy wejściu z klawiatury lub „Wstecz” — środek ekranu).' },
        { v: 'shape', l: '13. Maska o niestandardowym kształcie', d: 'odsłanianie przez ukośne cięcie lub łuk — w duchu marki', p: 'MASKA O KSZTAŁCIE MARKI: nowa podstrona odsłania się przez ukośne cięcie przesuwające się po ekranie (clip-path: polygon z czterema punktami, od lewej do prawej pod kątem ok. 20°, ok. 550 ms); kształt możesz dopasować do znaku logo (łuk, zaokrąglenie) — opisz w notatce, co wybrałeś.' },
        // --- Powiększenie / przemiana
        { c: 'Powiększenie lub przemiana elementu', v: 'zoomin', l: '14. Powiększenie nowej strony (zoom in)', d: 'nowa podstrona zaczyna odrobinę mniejsza i płynnie rośnie', p: 'POWIĘKSZENIE (zoom in): nowa podstrona zaczyna lekko pomniejszona (skala 0,94) i przezroczysta, płynnie rośnie do normalnego rozmiaru (ok. 450 ms), stara gaśnie (ok. 250 ms) — wrażenie wejścia głębiej.' },
        { v: 'zoomout', l: '15. Oddalenie starej strony (zoom out)', d: 'poprzednia podstrona odsuwa się w głąb, nowa zajmuje ekran', p: 'ODDALENIE (zoom out): stara podstrona delikatnie się zmniejsza (skala 1 → 0,92, zaokrąglone rogi) i gaśnie, jakby odsuwała się w głąb, a nowa pojawia się nad nią (opacity 0 → 1); ok. 450 ms, efekt subtelny.' },
        { v: 'morph', l: '16. Przemiana wspólnego elementu (morph)', d: 'karta, logo lub nagłówek płynnie „przechodzi” na kolejną stronę', p: 'PRZEMIANA WSPÓLNEGO ELEMENTU (shared element): elementy obecne na obu podstronach (np. karta usługi → nagłówek strony usługi, logo, tytuł) dostają tę samą unikalną nazwę view-transition-name (np. "usluga-strzyzenie") i płynnie zmieniają położenie i rozmiar (::view-transition-group, ok. 450 ms); reszta strony — krótkie przenikanie. Nazwy nadawaj tylko klikniętemu elementowi (zdarzenia pageswap/pagereveal), żeby nie powtórzyły się na liście.' },
        { v: 'imagezoom', l: '17. Zdjęcie z karty rośnie do dużej grafiki', d: 'miniatura płynnie przechodzi w duże zdjęcie na kolejnej stronie — portfolio, galeria, sklep', p: 'ZDJĘCIE Z KARTY DO DUŻEJ GRAFIKI: miniatura zdjęcia na liście (realizacje, galeria, produkty) płynnie rośnie i przechodzi w duże zdjęcie na podstronie szczegółów (wspólna view-transition-name nadana klikniętej miniaturze w pageswap i dużemu zdjęciu w pagereveal; object-fit dopasowany, ok. 500 ms); przy „Wstecz” zdjęcie wraca na swoje miejsce na liście.' },
        { v: 'flip3d', l: '18. Efekt 3D — obrót karty', d: 'stara i nowa strona obracają się jak dwie strony karty — mocny efekt', p: 'EFEKT 3D (obrót karty): stara i nowa podstrona obracają się w przestrzeni jak dwie strony karty (perspective ok. 1200 px; stara rotateY 0 → -90°, potem nowa 90° → 0), ok. 650 ms; na telefonie zamiast obrotu zwykłe przenikanie. Mocny efekt — tylko dla kreatywnych marek.' },
        // --- Uzupełniające
        { c: 'Efekty uzupełniające', v: 'wash', l: '19. Kolorowa fala (color wash)', d: 'przez ekran przechodzi fala w kolorze marki', p: 'KOLOROWA FALA: przez ekran po skosie przechodzi szeroka fala w kolorach marki (gradient), która na moment zasłania starą podstronę i odsłania nową; ok. 600 ms, szybko ustępuje treści. Dekoracyjna warstwa z pagereveal.' },
        { v: 'logo', l: '22. Logo lub nazwa jako krótki ekran przejściowy', d: 'na moment logo / nazwa marki na kolorowym tle — krótko, nie jak ekran ładowania', p: 'KRÓTKI EKRAN Z LOGO: na moment pojawia się kolorowy ekran marki z logo lub nazwą (wejście ok. 200 ms, pozostaje ok. 150 ms, znika ok. 250 ms, odsłaniając nową podstronę) — maksymalnie 600 ms, nigdy jak ekran ładowania; bez sztucznego opóźniania nawigacji (animacja startuje dopiero, gdy nowa strona jest gotowa).' },
      ],
    },
    {
      id: 'pagex', t: 'Uzupełnienia przejścia', multi: true, preview: 'page', scope: 'multi',
      note: 'Można połączyć z wybranym przejściem powyżej.',
      options: [
        { v: 'stagger', l: '20. Sekwencyjne pojawianie się treści (stagger)', d: 'po zmianie podstrony: najpierw nagłówek, potem tekst, zdjęcie i przyciski', p: 'SEKWENCYJNE WEJŚCIE TREŚCI (stagger): po przejściu na nową podstronę elementy pierwszego ekranu pojawiają się kolejno — nagłówek, tekst, zdjęcie, przyciski (każdy: opacity + 10–14 px w górę, odstęp 60–80 ms, maks. 5 kroków). H1 nie może startować z opacity: 0 przy pierwszym wejściu na stronę (LCP) — sekwencja tylko po przejściu z innej podstrony (klasa ustawiana w pagereveal).' },
        { v: 'pinheader', l: '21. Nagłówek pozostaje, zmienia się tylko treść', d: 'logo i menu stoją w miejscu — nic nie „skacze”', p: 'NAGŁÓWEK STOI W MIEJSCU: nagłówek z logo i menu ma własną nazwę view-transition-name (np. site-header) i pozostaje nieruchomy podczas przejścia — animuje się tylko główna treść. Przy przejściach zasłaniających cały ekran (zasłona, kurtyna, fala, ekran z logo) nagłówek może zostać nad warstwą, jeśli to wygląda spójniej — sprawdź oba warianty i wybierz lepszy.' },
      ],
    },
    {
      id: 'scroll', t: 'Styl przewijania strony', preview: 'scroll', scope: 'scroll',
      note: 'Najważniejsze przy stronie one page — cała strona to przewijane sekcje. Kliknij opcję, aby zobaczyć podgląd.',
      options: [
        { v: 'normal', l: 'Zwykłe, naturalne przewijanie', d: 'sekcje jedna pod drugą — najspokojniej i najbezpieczniej', p: 'ZWYKŁE PRZEWIJANIE: naturalne przewijanie strony w tempie użytkownika, sekcje jedna pod drugą, bez przechwytywania kółka myszy.' },
        { v: 'ai', l: 'Dobierz sam (AI)', d: 'AI wybierze styl pasujący do marki i ilości treści', p: 'Styl przewijania dobierz do marki i ilości treści (dużo tekstu — zwykłe przewijanie; mało treści i mocne zdjęcia — sekcje nachodzące na siebie lub przyciąganie do sekcji) i napisz w notatce, co wybrałeś.' },
        { v: 'stack', l: 'Sekcje nachodzące na siebie (karty)', d: 'kolejna sekcja wjeżdża na poprzednią, która lekko się cofa i przyciemnia', p: 'SEKCJE NACHODZĄCE NA SIEBIE: główne sekcje są przyklejane (position: sticky; top: 0), a kolejna przewija się NAD poprzednią, która lekko się zmniejsza (skala 0,96) i przyciemnia — CSS scroll-driven animations (animation-timeline: view()), bez efektu w przeglądarkach bez obsługi. Tylko dla sekcji, które mieszczą się na ekranie — dłuższe przewijają się zwyczajnie; na telefonie efekt łagodniejszy. Nigdy nie ukrywaj treści, której nie da się przewinąć.' },
        { v: 'snap', l: 'Przyciąganie do sekcji', d: 'strona miękko „zatrzymuje się” na początku każdej sekcji', p: 'PRZYCIĄGANIE DO SEKCJI: scroll-snap-type: y proximity (NIE mandatory — nie blokuje czytania dłuższych sekcji), scroll-snap-align: start na sekcjach i scroll-padding-top równe wysokości nagłówka. Najlepiej przy sekcjach pełnoekranowych; wyłączone przy ograniczonym ruchu.' },
        { v: 'curtain', l: 'Odsłanianie sekcji spod poprzedniej', d: 'sekcja odjeżdża w górę jak kurtyna, a następna czeka pod nią', p: 'ODSŁANIANIE SPOD POPRZEDNIEJ: w 1–2 miejscach strony (np. pierwszy ekran → kolejna sekcja, ostatnia sekcja → stopka) następna sekcja jest przyklejona pod spodem (position: sticky), a poprzednia odjeżdża w górę jak kurtyna z miękkim cieniem na dolnej krawędzi. Nie przy każdej sekcji.' },
        { v: 'zoomsec', l: 'Sekcje rosną przy wejściu', d: 'sekcja wjeżdża lekko pomniejszona z zaokrąglonymi rogami i rośnie do pełnej szerokości', p: 'SEKCJE ROSNĄ PRZY WEJŚCIU: sekcje z wyraźnym tłem (ciemne, ze zdjęciem) wchodzą w widok lekko pomniejszone (skala 0,92, zaokrąglone rogi ok. 24 px) i rosną do pełnej szerokości, gdy dochodzą do środka ekranu (animation-timeline: view(), animation-range: entry 0% cover 40%); tylko transform i border-radius na warstwie tła, bez zmiany wymiarów układu.' },
        { v: 'splitsticky', l: 'Zdjęcie stoi, tekst się przewija', d: 'w wybranych sekcjach połowa ze zdjęciem jest przyklejona, zdjęcie zmienia się z treścią', p: 'PRZYKLEJONA POŁOWA: w wybranych sekcjach (np. O nas, oferta, etapy współpracy) połowa ze zdjęciem jest przyklejona (position: sticky), a obok przewija się tekst; zdjęcie płynnie zmienia się wraz z kolejnymi akapitami (przenikanie). Na telefonie zdjęcie nad tekstem, bez przyklejania.' },
      ],
    },
    {
      id: 'scrollx', t: 'Dodatki przewijania', multi: true, preview: 'scroll', scope: 'scroll',
      options: [
        { v: 'scrollspy', l: 'Aktywna pozycja menu + pasek postępu', d: 'menu pokazuje, w której sekcji jesteś; cienki pasek postępu', p: 'AKTYWNA POZYCJA MENU: menu podświetla sekcję, w której jest odwiedzający (IntersectionObserver, aria-current="true"), a podkreślenie płynnie przesuwa się między pozycjami; pod nagłówkiem cienki pasek postępu przewijania.' },
        { v: 'parallax', l: 'Paralaksa warstw', d: 'tła i dekoracje przesuwają się wolniej niż treść', p: 'PARALAKSA: tła i dekoracje wybranych sekcji przesuwają się wolniej niż treść (transform sterowany przez animation-timeline: scroll()/view(), maks. 10–15% przesunięcia); wyłączona na telefonie i przy ograniczonym ruchu.' },
        { v: 'dots', l: 'Kropki nawigacji z boku', d: 'pionowe kropki — po jednej na sekcję', p: 'KROPKI NAWIGACJI: z prawej strony pionowe kropki (po jednej na sekcję, z podpisem po najechaniu i aria-label), aktywna wyróżniona; kliknięcie przewija do sekcji; ukryte na telefonie.' },
        { v: 'horizontal', l: 'Poziomy pas przy przewijaniu w dół', d: 'np. realizacje lub galeria przesuwają się w bok, gdy przewijasz w dół', p: 'POZIOMY PAS: jedna sekcja (realizacje / galeria / etapy współpracy) zostaje na chwilę przypięta, a jej zawartość przesuwa się poziomo w rytm przewijania w dół (sticky + animation-timeline: view()); na telefonie, przy ograniczonym ruchu i bez obsługi — zwykły poziomy pas przewijany palcem, z przyciskami „wstecz/dalej”.' },
        { v: 'textreveal', l: 'Tekst rozjaśniany przewijaniem', d: 'słowa dużego hasła lub cytatu „zapalają się” jedno po drugim', p: 'TEKST ROZJAŚNIANY PRZEWIJANIEM: w jednej sekcji z dużym hasłem lub cytatem słowa przechodzą z przygaszonego na pełny kolor w rytm przewijania (animation-timeline: view()); tekst jest w HTML i czytelny także w stanie początkowym (kontrast min. 3:1).' },
      ],
    },
    {
      id: 'anchor', t: 'Kliknięcie w menu — przejście do sekcji', preview: 'scroll', scope: 'scroll',
      options: [
        { v: 'smooth', l: 'Płynne przewijanie', d: 'strona płynnie przewija się do sekcji', p: 'Kliknięcie w menu płynnie przewija do sekcji (scroll-behavior: smooth, wyłączane przy ograniczonym ruchu).' },
        { v: 'highlight', l: 'Płynne + wyróżnienie sekcji', d: 'po dojściu tytuł sekcji na moment się wyróżnia', p: 'Kliknięcie w menu płynnie przewija do sekcji, a jej tytuł po dojściu na chwilę (ok. 1 s) delikatnie się wyróżnia (podkreślenie rysowane od lewej).' },
        { v: 'instant', l: 'Natychmiastowy skok', p: 'Kliknięcie w menu przenosi do sekcji natychmiast, bez animacji przewijania.' },
        { v: 'fadejump', l: 'Przygaszenie i skok', d: 'przy dalekiej sekcji strona na moment przygasa zamiast długo przewijać', p: 'SKOK Z PRZYGASZENIEM: gdy sekcja jest daleko (ponad 2 ekrany), zamiast długiego przewijania — krótkie przenikanie przez View Transition w obrębie strony: document.startViewTransition(() => sekcja.scrollIntoView({ behavior: "instant" })), ok. 300 ms; bliskie sekcje — płynne przewijanie. Bez obsługi API — zwykłe płynne przewijanie.' },
        { v: 'curtainjump', l: 'Kurtyna z nazwą sekcji', d: 'panel w kolorze marki przechodzi przez ekran, pod nim strona przeskakuje', p: 'KURTYNA PRZY SKOKU: po kliknięciu pozycji menu przez ekran przechodzi panel w kolorze marki z nazwą sekcji (View Transition w obrębie strony, ok. 450 ms), a pod nim strona przeskakuje do sekcji; tylko dla pozycji menu, nie dla linków w treści; bez obsługi API — płynne przewijanie.' },
      ],
    },
    {
      id: 'reveal', t: 'Pojawianie się treści przy przewijaniu',
      options: [
        { v: 'none', l: 'Bez animacji', p: 'Treść sekcji jest widoczna od razu, bez animacji przy przewijaniu.' },
        { v: 'fadeup', l: 'Delikatne wyłanianie', d: 'elementy wyłaniają się z dołu, ok. 16 px', p: 'Elementy sekcji (nagłówki, karty, zdjęcia) wyłaniają się przy przewijaniu: przezroczystość 0 → 1 i przesunięcie 16 px w górę, ok. 500 ms, z małym opóźnieniem między kolejnymi elementami.' },
        { v: 'sides', l: 'Wysuwanie z boków', d: 'w układzie naprzemiennym tekst i zdjęcie z przeciwnych stron', p: 'Bloki wysuwają się z boków (tekst z jednej, zdjęcie z drugiej strony, 24–40 px), ok. 600 ms; na telefonie tylko delikatne wyłanianie z dołu.' },
        { v: 'mask', l: 'Odsłanianie zdjęć maską', d: 'zdjęcia odsłaniane „kurtyną” (clip-path)', p: 'Zdjęcia i duże grafiki są odsłaniane maską (clip-path: inset od dołu lub z boku) z lekkim przybliżeniem zdjęcia w środku (1,08 → 1), ok. 800 ms; teksty tylko delikatnie się wyłaniają.' },
        { v: 'stagger', l: 'Kaskada kart', d: 'karty w siatce pojawiają się jedna po drugiej', p: 'Karty w siatkach (oferta, zespół, galeria) pojawiają się kaskadowo jedna po drugiej (opóźnienie 60–80 ms, maks. 6 kroków), pozostałe elementy — delikatne wyłanianie.' },
      ],
    },
    {
      id: 'hero', t: 'Pierwszy ekran (hero)',
      options: [
        { v: 'static', l: 'Statyczny', p: 'Pierwszy ekran bez animacji wejścia.' },
        { v: 'words', l: 'Nagłówek słowo po słowie', d: 'słowa nagłówka wjeżdżają po kolei', p: 'Nagłówek pierwszego ekranu pojawia się słowo po słowie (każde słowo wysuwa się z maski od dołu, opóźnienie 60–80 ms) — tekst jest w HTML od początku i jest widoczny dla Google i czytników; animacja nie może opóźnić LCP (zacznij ją od razu po wyrenderowaniu, bez czekania na skrypty, albo pomiń dla elementu LCP).' },
        { v: 'typewriter', l: 'Zmieniające się słowo', d: 'np. „Strony dla salonów / warsztatów / kawiarni”', p: 'W nagłówku pierwszego ekranu jedno słowo zmienia się co ok. 2,5 s (efekt pisania lub przewijania w pionie) — lista słów z briefu (np. usługi, grupy klientów); pierwsze słowo jest w HTML, dla czytników ekranu cały zestaw w ukrytym tekście, aria-live wyłączone.' },
        { v: 'parallax', l: 'Paralaksa zdjęcia', d: 'zdjęcie w tle przesuwa się wolniej niż treść', p: 'Zdjęcie w tle pierwszego ekranu przesuwa się wolniej niż treść (paralaksa: animation-timeline: scroll() w CSS z prostym zapasem w JS; tylko transform; wyłączona na telefonie i przy ograniczonym ruchu).' },
        { v: 'kenburns', l: 'Powolne przybliżanie zdjęcia', d: 'efekt „Ken Burns”', p: 'Zdjęcie pierwszego ekranu bardzo powoli się przybliża (skala 1 → 1,06 przez 12–16 s, tylko transform), co daje „żywy” kadr bez rozpraszania.' },
        { v: 'video', l: 'Krótkie wideo w tle', d: 'tylko gdy klient ma materiał', p: 'Pierwszy ekran z krótkim, wyciszonym, zapętlonym wideo w tle (materiał od klienta; MP4/WebM do ok. 3 MB, poster jako obraz LCP, przycisk pauzy, na telefonie i przy wolnym łączu tylko zdjęcie). Jeśli klient nie ma wideo — zdjęcie z powolnym przybliżaniem.' },
      ],
    },
    {
      id: 'bg', t: 'Tło strony',
      options: [
        { v: 'plain', l: 'Spokojne, jednolite', p: 'Tło strony jednolite (kolory marki), bez animacji.' },
        { v: 'gradient', l: 'Płynnie zmieniający się gradient', d: 'kolory marki powoli „płyną” w tle', p: 'W tle pierwszego ekranu (i ewentualnie sekcji wyróżnionych) gradient z kolorów marki, który bardzo powoli się przemieszcza (animacja background-position 20–30 s, nieskończona; wyłączona przy ograniczonym ruchu).' },
        { v: 'aurora', l: 'Miękkie plamy światła („aurora”)', d: 'rozmyte kolorowe plamy dryfujące w tle', p: 'W tle 2–3 rozmyte, półprzezroczyste plamy w kolorach marki, które powoli dryfują (transform, 18–25 s); jedna warstwa position: fixed z pointer-events: none; kontrast tekstu musi zostać min. 4,5:1.' },
        { v: 'grid', l: 'Siatka lub kropki z paralaksą', d: 'delikatny wzór, który przesuwa się przy przewijaniu', p: 'Delikatny wzór (siatka linii lub kropek, 4–6% krycia) w tle wybranych sekcji, przesuwający się wolniej przy przewijaniu; wzór w CSS (bez obrazków).' },
        { v: 'scrollcolor', l: 'Tło zmienia kolor między sekcjami', d: 'płynna zmiana koloru tła przy przewijaniu', p: 'Kolor tła strony płynnie zmienia się między sekcjami (każda sekcja ma swój odcień z palety marki, zmiana ok. 600 ms przy wejściu sekcji w widok — IntersectionObserver albo animation-timeline: view()); tekst zawsze z kontrastem min. 4,5:1.' },
        { v: 'grain', l: 'Subtelne „ziarno” jak na fotografii', d: 'nadaje tłu fakturę premium', p: 'Na tle subtelna faktura „ziarna” (szum SVG feTurbulence jako jedna stała warstwa, 3–5% krycia, bez animacji) — daje wrażenie druku premium.' },
      ],
    },
    {
      id: 'cursor', t: 'Kursor (tylko komputer z myszą)', note: 'Na telefonach i tabletach kursora nie ma — tam zostaje zwykłe działanie.',
      options: [
        { v: 'default', l: 'Zwykły kursor', p: 'Zwykły kursor systemowy.' },
        { v: 'follower', l: 'Kropka z obwódką', d: 'mała kropka + pierścień, który miękko za nią podąża', p: 'Własny kursor: mała kropka w kolorze akcentu i pierścień, który miękko za nią podąża (interpolacja w requestAnimationFrame, tylko transform); nad linkami i przyciskami pierścień się powiększa. Kursor systemowy zostaje widoczny (nie ukrywaj go — dostępność); tylko przy (hover: hover) and (pointer: fine), wyłączony przy ograniczonym ruchu.' },
        { v: 'label', l: 'Kursor z podpisem nad zdjęciami', d: 'np. „Zobacz” nad galerią i realizacjami', p: 'Nad zdjęciami galerii i realizacji obok kursora pojawia się okrągła etykieta z czynnością („Zobacz”, „Powiększ”, „Przeciągnij” przy sliderze); tylko na komputerze z myszą, element dekoracyjny aria-hidden.' },
        { v: 'spotlight', l: 'Światło za kursorem', d: 'delikatna poświata podąża za kursorem na ciemnych sekcjach', p: 'Na ciemnych sekcjach (np. pierwszy ekran) za kursorem podąża delikatna, rozmyta poświata w kolorze akcentu (radial-gradient sterowany zmiennymi CSS, aktualizowany w requestAnimationFrame); tylko komputer z myszą.' },
      ],
    },
    {
      id: 'extras', t: 'Dodatki wizerunkowe', multi: true,
      options: [
        { v: 'progress', l: 'Pasek postępu czytania', p: 'Cienki pasek postępu przewijania pod nagłówkiem (animation-timeline: scroll() z zapasem w JS).' },
        { v: 'counters', l: 'Animowane liczniki', d: 'tylko prawdziwe liczby z briefu', p: 'Animowane liczniki (np. lata doświadczenia, zrealizowane projekty) liczące od zera, gdy sekcja wejdzie w widok — WYŁĄCZNIE prawdziwe liczby z briefu; bez danych pomiń liczniki.' },
        { v: 'tilt', l: 'Karty pochylające się 3D', d: 'karta lekko obraca się za kursorem', p: 'Karty oferty/realizacji lekko pochylają się w 3D za kursorem (maks. 6°, perspective, tylko transform), z delikatnym połyskiem; tylko komputer z myszą.' },
        { v: 'magnetic', l: 'Przyciski „magnetyczne”', d: 'główne przyciski lekko przyciągają się do kursora', p: 'Główne przyciski (CTA) lekko „przyciągają się” do kursora (przesunięcie maks. 6–8 px, powrót sprężysty); tylko komputer z myszą.' },
        { v: 'cardglow', l: 'Podświetlenie karty za kursorem', d: 'poświata wewnątrz karty podąża za myszą', p: 'Wewnątrz kart po najechaniu pojawia się miękka poświata podążająca za kursorem (radial-gradient ze zmiennymi CSS) i podświetlona krawędź.' },
        { v: 'marquee', l: 'Przewijany pas logotypów lub haseł', d: 'np. partnerzy, marki, z którymi pracuje firma', p: 'Płynnie przewijany w poziomie pas (logotypy partnerów/marek albo krótkie hasła marki), zatrzymywany po najechaniu i przy ograniczonym ruchu; tylko prawdziwe logotypy z materiałów klienta.' },
        { v: 'beforeafter', l: 'Suwak „przed / po”', d: 'metamorfozy, remonty, renowacje', p: 'Suwak porównania „przed / po” (dwa zdjęcia, przeciągany uchwyt, obsługa klawiaturą strzałkami, etykiety „Przed” i „Po”) — w panelu możliwość dodawania par zdjęć.' },
        { v: 'zoomgallery', l: 'Galeria z płynnym powiększeniem', d: 'miniatura „rośnie” do pełnego ekranu', p: 'Galeria: kliknięta miniatura płynnie „rośnie” do widoku pełnoekranowego (View Transitions w obrębie strony albo animacja FLIP), z obsługą klawiatury i gestów przesuwania.' },
        { v: 'blurup', l: 'Zdjęcia ładowane z rozmyciem', d: 'najpierw rozmyty podgląd, potem ostre zdjęcie', p: 'Zdjęcia poniżej pierwszego ekranu ładują się z małym rozmytym podglądem (kolor dominujący lub miniatura ~20 px), który płynnie zamienia się w ostre zdjęcie.' },
        { v: 'underline', l: 'Animowane podkreślenia linków', p: 'Linki w treści i menu mają podkreślenie rysowane od lewej przy najechaniu i fokusie.' },
        { v: 'menuanim', l: 'Efektowne menu mobilne', d: 'pełnoekranowe, pozycje pojawiają się kaskadowo', p: 'Menu mobilne otwiera się na cały ekran (tło w kolorze marki), a pozycje pojawiają się kaskadowo; zamykanie Escape, pułapka fokusu, blokada przewijania strony pod menu.' },
        { v: 'stickycta', l: 'Pływający przycisk kontaktu (telefon)', p: 'Na telefonie przy dolnej krawędzi pływający przycisk głównej akcji (Zadzwoń / Rezerwuj / Napisz), chowany przy przewijaniu w dół i pokazywany przy przewijaniu w górę; nie zasłania stopki ani formularza.' },
        { v: 'totop', l: 'Przycisk „do góry” z postępem', p: 'Przycisk „do góry” z kółkiem pokazującym postęp przewijania; pojawia się po przewinięciu jednego ekranu.' },
        { v: 'darkmode', l: 'Tryb ciemny', p: 'Przełącznik trybu jasnego/ciemnego (domyślnie według ustawień systemu, wybór zapamiętany), z kolorami ciemnej wersji dobranymi do marki i kontrastem AA w obu trybach.' },
        { v: 'sound', l: 'Dźwięki interfejsu', d: 'tylko po włączeniu przez odwiedzającego — rzadko potrzebne', p: 'Bardzo ciche dźwięki interfejsu (kliknięcia, otwarcie menu) — DOMYŚLNIE WYŁĄCZONE, włączane ikonką głośnika; nigdy autoodtwarzanie.' },
        { v: 'paneltoggle', l: 'Włącz/wyłącz animacje w panelu', d: 'klient sam zdecyduje, czy animacje mają działać', p: 'W panelu administracyjnym (Ustawienia → Wygląd) przełączniki: animacje przewijania, efekty kursora, tło animowane, przejścia między podstronami — każdy włącz/wyłącz, z podglądem na żywo.' },
      ],
    },
    {
      id: 'intensity', t: 'Ogólny charakter animacji',
      options: [
        { v: 'subtle', l: 'Subtelny', d: 'elegancko, prawie niezauważalnie', p: 'Charakter animacji: SUBTELNY — krótkie (200–500 ms), małe przesunięcia (8–16 px), nic nie odciąga od treści.' },
        { v: 'medium', l: 'Wyraźny', d: 'nowocześnie, ale bez przesady', p: 'Charakter animacji: WYRAŹNY — animacje zauważalne i dopracowane (400–700 ms), ale nigdy nie opóźniają korzystania ze strony.' },
        { v: 'bold', l: 'Efektowny', d: 'strona ma „wow”, dla marek kreatywnych', p: 'Charakter animacji: EFEKTOWNY — strona ma robić wrażenie (dłuższe sekwencje do ok. 900 ms na pierwszym ekranie, warstwy, paralaksa), ale każda akcja użytkownika (klik, przewijanie) działa natychmiast.' },
      ],
    },
  ];
  const effectOpt = (g, v) => (g.options || []).find((o) => o.v === v);
  /** Czy zapisano jakikolwiek wybór efektów. */
  const hasEffects = (fx) => !!fx && EFFECTS.some((g) => (g.multi ? Array.isArray(fx[g.id]) && fx[g.id].length : fx[g.id])) || !!(fx && (fx.notes || fx.sitetype));
  /** Rodzaj strony z briefu: 'onepage' | 'multi' | '' (nieustalony). */
  const briefSiteType = (a) => (!a ? '' : a.layout === 'onepage' || a.site_type === 'onepage' ? 'onepage' : a.site_type === 'podstrony' ? 'multi' : '');
  /** Krótkie podsumowanie wyboru (do panelu). */
  function effectsSummary(fx) {
    if (!hasEffects(fx)) return '';
    const parts = [];
    const type = fx.sitetype === 'onepage' || fx.sitetype === 'multi' ? fx.sitetype : '';
    if (type) parts.push(type === 'onepage' ? 'Strona: one page' : 'Strona: podstrony');
    EFFECTS.forEach((g) => {
      if (!groupFits(g, type)) return;
      if (g.multi) {
        const l = (fx[g.id] || []).map((v) => (effectOpt(g, v) || {}).l).filter(Boolean);
        if (l.length) parts.push(`${g.t}: ${l.join(', ')}`);
      } else if (fx[g.id] && effectOpt(g, fx[g.id])) parts.push(`${g.t}: ${effectOpt(g, fx[g.id]).l}`);
    });
    if (fx.notes) parts.push(`Uwagi: ${fx.notes}`);
    return parts.join(' · ');
  }
  /** Blok polecenia „Efekty wizualne i animacje”. */
  const SITE_TYPE_TXT = {
    onepage: 'ONE PAGE — wszystkie sekcje na jednej przewijanej stronie, menu przewija do sekcji (przejścia między podstronami nie dotyczą; pojedyncze podstrony jak polityka prywatności — krótkie przenikanie).',
    multi: 'PODSTRONY — każda pozycja menu otwiera osobną stronę (osobny adres URL); przejścia między podstronami są kluczowe, efekty przewijania dotyczą treści w obrębie podstron.',
  };
  /** Czy grupa efektów dotyczy wybranego rodzaju strony. */
  const groupFits = (g, type) => !type || !g.scope || (type === 'onepage' ? g.scope !== 'multi' : true);
  function effectsTask(fx) {
    if (!hasEffects(fx)) return '';
    const lines = [];
    const type = fx.sitetype === 'onepage' || fx.sitetype === 'multi' ? fx.sitetype : '';
    if (type) lines.push(`RODZAJ STRONY: ${SITE_TYPE_TXT[type]}`);
    EFFECTS.forEach((g) => {
      if (!groupFits(g, type)) return;
      if (g.multi) {
        const chosen = (fx[g.id] || []).map((v) => effectOpt(g, v)).filter(Boolean);
        if (chosen.length) lines.push(`${g.t.toUpperCase()}:\n${chosen.map((o) => `- ${o.p}`).join('\n')}`);
      } else {
        const o = fx[g.id] && effectOpt(g, fx[g.id]);
        if (o) lines.push(`${g.t.toUpperCase()}:\n- ${o.p}`);
      }
    });
    const page = type !== 'onepage' && ((fx.page && fx.page !== 'none') || (Array.isArray(fx.pagex) && fx.pagex.length > 0));
    const scrolling = ['scroll', 'scrollx', 'anchor'].some((k) => (Array.isArray(fx[k]) ? fx[k].length : fx[k] && fx[k] !== 'normal' && fx[k] !== 'smooth' && fx[k] !== 'instant'));
    return `EFEKTY WIZUALNE I ANIMACJE (wybrane przeze mnie po briefie — wdróż dokładnie te)
${lines.join('\n\n')}${fx.notes ? `\n\nMOJE UWAGI DO EFEKTÓW:\n${fx.notes}` : ''}

ZASADY TECHNICZNE ANIMACJI (obowiązkowe)
- Animuj wyłącznie transform i opacity (ew. clip-path, filter tylko na małych elementach); żadnych animacji width/height/top/left/margin — zero przesunięć układu (CLS < 0,1).
- Treść jest w HTML i widoczna od razu: nigdy nie ukrywaj nagłówka H1 ani obrazu pierwszego ekranu (opacity: 0) w oczekiwaniu na skrypt — animacje nie mogą pogorszyć LCP. Animacje „przy przewijaniu” dotyczą tylko elementów poniżej pierwszego ekranu, a bez JavaScriptu wszystko jest widoczne (klasa włączająca animacje dodawana przez skrypt).
- Wszystko wyłączone przy @media (prefers-reduced-motion: reduce): zostaje zwykła nawigacja, bez kurtyn, przesunięć, paralaksy i efektów kursora.
- Efekty kursora, pochylenia i „magnetyczne” przyciski tylko przy (hover: hover) and (pointer: fine); na telefonach ich nie ma.
- Jeden lekki skrypt (bez bibliotek typu GSAP, jeśli nie są konieczne), IntersectionObserver zamiast nasłuchu scroll, requestAnimationFrame dla ruchu za kursorem.${scrolling ? `
- Efekty przewijania: NIE przechwytuj kółka myszy ani gestów (żadnego „scroll-jackingu”) — strona zawsze przewija się w tempie użytkownika. Efekty zależne od przewijania przez CSS scroll-driven animations (animation-timeline: scroll()/view()) w @supports, a w przeglądarkach bez obsługi — strona bez efektu (wszystko widoczne). Przyklejone (sticky) elementy nie mogą zasłaniać treści ani fokusu klawiatury; kotwice i przycisk „Wstecz” działają normalnie.` : ''}${page ? `
- Przejścia między podstronami: View Transitions między dokumentami (CSS @view-transition { navigation: auto; } w media (prefers-reduced-motion: no-preference)) — zwykłe linki i zwykła nawigacja, BEZ routera SPA i bez AJAX. Warstwy dekoracyjne (kurtyna, skrzydła) dokładaj w zdarzeniu „pagereveal” ze skryptu wczytanego w <head> BEZ defer, z typem przejścia (viewTransition.types) i aria-hidden + inert; po zakończeniu usuwaj warstwę. Link do tej samej strony i kotwice na tej samej stronie nie uruchamiają przejścia. Przeglądarki bez obsługi (Firefox) otwierają podstrony zwyczajnie — bez błędów. „Wstecz/Dalej” i pozycja przewinięcia działają jak w zwykłej stronie.` : ''}
- Na końcu odpowiedzi wypisz, które efekty wdrożyłeś i gdzie można je wyłączyć.`;
  }

  /* ---------- Układ strony: reguły dla każdego układu ---------- */
  const SEP = '────────────────────────────────────────';
  const LAYOUT_RULES = {
    grid: {
      n: 1, t: 'UKŁAD SIATKI (GRID)', d: 'uporządkowane kolumny i wiersze, rozbudowana oferta',
      site: [
        'Sekcje oparte na równej siatce 2–4 kolumn, karty tej samej wysokości.',
        'Oferta/usługi/zespoły/produkty jako karty: zdjęcie lub ikona, tytuł, 2 linie opisu, przycisk.',
        'Filtry kategorii nad siatką (zamiast zakładek), z licznikiem wyników.',
        'Szczegóły elementu w popupie (dialog) lub na podstronie (przy WIELE_STRON).',
        'Galeria jako równa siatka miniatur + lightbox.',
        'Aktualności jako siatka kart z datą; sponsorzy/partnerzy jako siatka logotypów.',
        'Historia: kafelki z rokiem w siatce, „czytaj więcej” w dialogu.',
        'Formularz: 2 kolumny pól na desktopie.',
      ],
      panel: ['Liczba kolumn siatki (2/3/4) dla każdej sekcji.', 'Kategoria każdego elementu + włącz/wyłącz filtry.', 'Wybór: szczegóły w popupie / na podstronie.', 'Kolejność przeciąganiem.'],
    },
    f: {
      n: 2, t: 'UKŁAD W KSZTAŁCIE LITERY F', d: 'nagłówki i tekst do lewej, dużo treści',
      site: [
        'Treść wyrównana do lewej, mocne śródtytuły, krótkie akapity, listy punktowane.',
        'Spis treści / skróty na górze dłuższych sekcji (kotwice).',
        'Elementy listowe (aktualności, oferta, zespoły) jako lista: miniatura po lewej, tekst po prawej.',
        'Historia jako pionowa oś czasu po lewej stronie z przyklejoną nawigacją lat.',
        'Długie teksty z „czytaj więcej” (zwijanie).',
        'FAQ jako akordeon; tabele (cennik, terminarz) czytelne, przewijane poziomo na telefonie.',
        'Formularz w jednej kolumnie, etykiety nad polami.',
        'Obrazy mniejsze, nie przerywają ciągu czytania.',
      ],
      panel: ['Włącz/wyłącz spis treści w sekcji.', 'Limit znaków zajawki i próg zwijania tekstu.', 'Pozycja miniatury (lewo/brak).', 'Edytor z nagłówkami H2/H3 i listami.'],
    },
    z: {
      n: 3, t: 'UKŁAD ZYGZAKOWY (Z-PATTERN)', d: 'tekst i zdjęcie na przemian, wyraźny przycisk',
      site: [
        'Hero: logo/nazwa lewa góra → menu/CTA prawa góra → po przekątnej treść → mocny przycisk prawy dół.',
        'Sekcje naprzemiennie: tekst lewo/obraz prawo, potem odwrotnie.',
        'Każdy blok kończy się przyciskiem CTA w miejscu, gdzie kończy się „Z”.',
        'Historia jako oś czasu zygzakiem (zdjęcia na zmianę stron), z przyklejoną nawigacją lat.',
        'Zespoły/grupy/oferta jako zakładki + karty w 2 kolumnach.',
        'Kontakt w 2 kolumnach (dane | formularz), obie tej samej wysokości.',
        'Osiągnięcia/liczby jako pas kafelków między blokami Z.',
      ],
      panel: ['Przy każdej sekcji i każdym elemencie historii: strona obrazu lewo / prawo / auto-naprzemiennie.', 'Tekst i cel przycisku CTA dla każdego bloku.', 'Kolejność sekcji (z zachowaniem naprzemienności).'],
    },
    onepage: {
      n: 4, t: 'ONE PAGE', d: 'wszystko na jednej stronie, menu przewija do sekcji',
      site: [
        'Wszystkie sekcje na jednej stronie z kotwicami; menu przewija płynnie do sekcji.',
        'Menu przyklejone, podświetla aktywną sekcję podczas przewijania.',
        'Odświeżenie (F5) i przycisk „wstecz” wracają do tej samej sekcji.',
        'Przycisk „do góry”; na telefonie pływający przycisk kontaktu/telefonu.',
        'Długie listy skracane (zakładki, akordeony, karuzele), by strona nie była za długa.',
        'Szczegóły (bio, polityka prywatności, opisy) w popupach zamiast podstron.',
        'SEO: jedna mocna strona, JSON-LD z wszystkimi danymi, nagłówki H2 dla każdej sekcji.',
      ],
      panel: ['Kolejność sekcji w menu i na stronie (przeciąganie).', 'Widoczność sekcji, osobno widoczność pozycji w menu.', 'Etykieta sekcji w menu.'],
      note: 'UWAGA: jeśli PODZIAŁ = WIELE_STRON, a wybrano One Page – wygrywa One Page; dopisz to w notatce.',
    },
    immersive: {
      n: 5, t: 'UKŁAD PEŁNOEKRANOWY (IMMERSIVE)', d: 'duże zdjęcie lub film, liczy się klimat',
      site: [
        'Hero na cały ekran: zdjęcie lub wideo w tle, przyciemnienie, krótki slogan, 1 przycisk.',
        'Kolejne sekcje także pełnoekranowe (100vh) z dużym tłem; kropki nawigacji z boku.',
        'Mało tekstu na ekranie; dłuższe opisy w popupie „czytaj więcej”.',
        'Historia jako pełnoekranowe rozdziały (rok + tytuł + zdjęcie w tle).',
        'Galeria jako pełnoekranowy slider.',
        'Wideo: wyciszone, z pauzą, zastępowane zdjęciem na telefonie i przy wolnym łączu.',
        'Animacje wyłączane przy prefers-reduced-motion; kontrast tekstu na tle min. 4.5:1.',
      ],
      panel: ['Tło sekcji: zdjęcie / wideo / kolor + suwak przyciemnienia.', 'Kolor tekstu (jasny/ciemny).', 'Plakat (poster) dla wideo.', 'Włącz/wyłącz kropki nawigacji i animacje.'],
    },
    split: {
      n: 6, t: 'PODZIAŁ EKRANU (SPLIT SCREEN)', d: 'połowa tekst i przyciski, połowa zdjęcie',
      site: [
        'Hero: dwie połowy – tekst i przyciski | zdjęcie; opcjonalnie dwie ścieżki (np. „Dla dzieci | Dla dorosłych”, „Kup | Wynajmij”).',
        'W sekcjach jedna połowa przyklejona (zdjęcie/tytuł), druga przewija treść.',
        'Zespoły/oferta/grupy rozdzielone na dwie kolumny wyboru.',
        'Historia: zdjęcie przyklejone po jednej stronie zmienia się wraz z przewijanym tekstem.',
        'Kontakt: mapa lub zdjęcie w jednej połowie, formularz w drugiej.',
        'Na telefonie: zdjęcie nad tekstem (nie obok).',
      ],
      panel: ['Strona zdjęcia (lewo/prawo) dla każdej sekcji.', 'Przypisanie treści do lewej/prawej ścieżki.', 'Proporcja podziału (50/50, 40/60).', 'Włącz/wyłącz przyklejanie połowy.'],
    },
    bento: {
      n: 7, t: 'UKŁAD BENTO', d: 'kafelki o różnych rozmiarach, większe bloki wyróżniają najważniejsze',
      site: [
        'Sekcje jako mozaika kafelków różnej wielkości (1×1, 2×1, 1×2, 2×2).',
        'Najważniejsze elementy (główna oferta, najbliższy mecz/wydarzenie, nabór, najnowsza aktualność) w dużych kafelkach.',
        'Kafelki mogą zawierać: liczby/osiągnięcia, zdjęcie, cytat/opinię, mini-galerię, social, CTA.',
        'Szczegóły w popupie.',
        'Historia i osiągnięcia jako kafelki z rokiem/ikoną.',
        'Na telefonie kafelki w jednej kolumnie, duże zostają wyżej.',
      ],
      panel: ['Rozmiar kafelka dla każdego elementu (1×1 / 2×1 / 1×2 / 2×2).', 'Flaga „wyróżnij”.', 'Kolor/tło kafelka.', 'Kolejność przeciąganiem.', 'Podgląd mozaiki na żywo.'],
    },
  };
  const AUTO_RULES = [
    'Dużo treści/tekstów (kancelaria, instytucja, szkoła, poradnik) → Układ F.',
    'Rozbudowana oferta / wiele produktów lub usług (sklep, hurtownia, salon) → Siatka (Grid).',
    'Mało treści, mocne zdjęcia lub wideo (hotel, restauracja, fotograf, event) → Pełnoekranowy.',
    'Dwie grupy odbiorców lub dwie ścieżki (dzieci/dorośli, kupno/wynajem) → Split Screen.',
    'Wiele różnych krótkich informacji do wyróżnienia (studio, agencja, startup) → Bento.',
    'Mała firma lokalna, klub sportowy, usługi, prosty przekaz → Z-pattern (domyślnie) lub One Page, gdy sekcji jest mniej niż 6.',
    'Jeśli branża ma oznaczenie „Polecane” w briefie – wybierz polecany układ.',
  ];
  const ruleBlock = (id) => {
    const R = LAYOUT_RULES[id];
    return `${R.n}) ${R.t} – „${R.d}”
STRONA:
${R.site.map((x) => `- ${x}`).join('\n')}
PANEL:
${R.panel.map((x) => `- ${x}`).join('\n')}${R.note ? `\n${R.note}` : ''}`;
  };
  /** Podział na strony: ONE_PAGE / WIELE_STRON (z briefu). */
  function splitOf(a) {
    if (a.layout === 'onepage' || a.site_type === 'onepage') return 'ONE_PAGE';
    if (a.site_type === 'podstrony') return 'WIELE_STRON';
    return 'DO USTALENIA — wybierz ONE_PAGE, gdy sekcji jest mniej niż 6, w przeciwnym razie WIELE_STRON (i napisz to w notatce)';
  }
  /** Własne sekcje dopisane przez klienta w briefie (pole custom_sections: wiersze „Nazwa — opis”). */
  function customSections(a) {
    return String(a.custom_sections || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf(' — ');
        return i === -1 ? { name: l, desc: '' } : { name: l.slice(0, i).trim(), desc: l.slice(i + 3).trim() };
      })
      .filter((s) => s.name);
  }
  function customSectionsTask(a) {
    const list = customSections(a);
    if (!list.length) return '';
    return `WŁASNE SEKCJE KLIENTA (dopisane w briefie — zrealizuj każdą jako osobną sekcję z tytułem H2, w menu i w panelu do edycji)
${list.map((s, i) => `${i + 1}. ${s.name}${s.desc ? ` — ${s.desc}` : ''}`).join('\n')}
Umieść je w logicznym miejscu kolejności sekcji; jeśli opis jest krótki, zaproponuj treść i oznacz [DO POTWIERDZENIA PRZEZ KLIENTA].

`;
  }
  /** Moduły wybrane w briefie (sekcje + funkcje). */
  function modulesOf(a) {
    const list = [];
    const sec = isOrg(a) ? val('org_sections', a) : val('sections', a);
    if (sec) list.push(sec);
    const custom = customSections(a);
    if (custom.length) list.push(`własne sekcje klienta: ${custom.map((s) => s.name).join(', ')}`);
    const booking = val('booking', a);
    if (booking && !/^Nie/i.test(booking)) list.push(`rezerwacje: ${booking}`);
    const integ = val('integrations', a);
    if (integ) list.push(`dodatki: ${integ}`);
    return list.join('; ') || 'wg briefu';
  }

  /* ---------- Układ strony (sekcja polecenia) ---------- */
  function layoutTask(a) {
    const id = LAYOUT_RULES[a.layout] ? a.layout : 'auto';
    const L = id === 'auto' ? null : H.layoutById(id);
    const recs = H.recommendedLayouts(a).map((v) => H.layoutById(v)).filter(Boolean);
    const split = id === 'onepage' ? 'ONE_PAGE' : splitOf(a);
    const head = `UKŁAD STRONY: ${L ? L.l : 'Nie mam preferencji — dobierz układ (reguła 8)'}
PODZIAŁ NA STRONY: ${split}${id === 'onepage' && a.site_type === 'podstrony' ? ' (klient zaznaczył też podstrony — wygrywa One Page, dopisz to w notatce)' : ''}

ZASADA NADRZĘDNA
Funkcje strony i panelu są stałe – układ decyduje tylko o tym, JAK je pokazać.
Nigdy nie usuwaj funkcji z powodu układu; zmień jej formę zgodnie z regułami poniżej.
Zawsze wdrażasz rdzeń: menu, kontakt + formularz z walidacją i antyspamem, polityka
prywatności, SEO (title/description/OG/JSON-LD/sitemap/robots), WCAG AA, wersje językowe,
panel z podglądem na żywo, zapis na serwerze, zmiana hasła, kopia zapasowa.
Moduły branżowe (${modulesOf(a)}) dodajesz tylko te wybrane.

W panelu pokazuj WYŁĄCZNIE ustawienia wybranego układu (opcje innych układów ukryj).
Podgląd na żywo w panelu renderuje sekcję dokładnie w wybranym układzie.
Na telefonie każdy układ przechodzi w jedną kolumnę w naturalnej kolejności czytania,
menu hamburger, przyciski min. 44 px.`;
    let body;
    if (id === 'auto') {
      body = `8) NIE MAM PREFERENCJI – „dobierz układ do branży, ilości treści i materiałów”
Wybierz układ sam, według kolejności reguł:
${AUTO_RULES.map((x) => `- ${x}`).join('\n')}
${recs.length ? `Polecane w briefie dla tej branży: ${recs.map((l) => l.l).join(' lub ')}.\n` : ''}Na początku odpowiedzi napisz jednym zdaniem, jaki układ wybrałeś i dlaczego,
a potem stosuj reguły tego układu (poniżej reguły wszystkich układów — zastosuj TYLKO wybrany).

${Object.keys(LAYOUT_RULES).map(ruleBlock).join(`\n\n${SEP}\n`)}`;
    } else {
      body = ruleBlock(id);
      if (recs.length && !recs.some((l) => l.v === id)) body += `\nUwaga dla mnie: dla tej branży zwykle polecam ${recs.map((l) => l.l).join(' lub ')}. Stronę wykonaj w układzie wybranym przez klienta; jeśli wyraźnie utrudni on pokazanie treści z briefu, dopisz to w notatce na końcu.`;
    }
    return `${head}

${SEP}
${body}

${SEP}
KONFLIKTY I UWAGI
- Jeśli moduł nie pasuje do układu, wybierz najbliższą działającą formę
  (np. terminarz w Bento = kafelek „najbliższy mecz” + popup z pełną tabelą)
  i dopisz na końcu krótką notatkę, co zmieniłeś i dlaczego.
- Układ nie może łamać dostępności: kontrast, kolejność fokusu, alt dla zdjęć, etykiety pól.
- Nie zmyślaj faktów – brakujące dane oznacz [DO UZUPEŁNIENIA].`;
  }
  /** Ustawienia panelu dla wybranego układu (do polecenia „Sam panel”). */
  function layoutPanel(a) {
    const R = LAYOUT_RULES[a.layout];
    if (!R) return '';
    return `\nUSTAWIENIA UKŁADU W PANELU (strona ma układ: ${R.t}) — pokazuj WYŁĄCZNIE te opcje układu, a podgląd na żywo renderuj w tym układzie:\n${R.panel.map((x) => `- ${x}`).join('\n')}\n`;
  }

  /* ---------- Zasady techniczne dla każdej strony ---------- */
  /** Przewijanie do sekcji pod przyklejonym nagłówkiem — bez dużego odstępu między nagłówkiem strony a treścią. */
  const ANCHOR_SPEC = `PRZEWIJANIE DO SEKCJI POD PRZYKLEJONYM NAGŁÓWKIEM (obowiązkowo)
- Po kliknięciu pozycji menu (i po wejściu z adresem #sekcja) tytuł sekcji ma stanąć tuż pod nagłówkiem strony — bez dużej pustej przerwy między nagłówkiem a treścią i bez chowania tytułu pod nagłówkiem.
- Zmienne CSS: --hdr = rzeczywista wysokość przyklejonego nagłówka (aktualizowana w JS przy zmianie rozmiaru okna, np. ResizeObserver na nagłówku — na telefonie nagłówek bywa niższy), --pad = górny odstęp wewnętrzny sekcji (padding-top).
- Reguła dla sekcji z kotwicą: section[id] { scroll-margin-top: calc(var(--hdr) - var(--pad) + 1.75rem); }
  (odejmujemy padding sekcji, bo inaczej nad tytułem zostaje pusty pas o wysokości paddingu).
- Jeśli przewijasz z JavaScriptu, używaj element.scrollIntoView() albo licz przesunięcie tą samą formułą — nigdy dwóch różnych odstępów.
- Sprawdź każdą pozycję menu na 390 px i 1366 px: tytuł sekcji ok. 1,75rem pod dolną krawędzią nagłówka.`;

  /** Formularze zgodne z RODO. */
  const RODO_SPEC = (a) => `FORMULARZE ZGODNE Z RODO (obowiązkowo dla każdego formularza: kontakt, zapytanie, rezerwacja, zapisy)
- Pod formularzem krótka klauzula informacyjna (art. 13 RODO): kto jest administratorem danych (pełna nazwa firmy/organizacji, adres, NIP/KRS — z briefu, a gdy ich brak: [DANE ADMINISTRATORA DO UZUPEŁNIENIA]), cel (odpowiedź na zapytanie / obsługa rezerwacji), podstawa prawna (art. 6 ust. 1 lit. b RODO — działania przed zawarciem umowy, lub lit. f — prawnie uzasadniony interes: odpowiedź na wiadomość), jak długo dane są przechowywane (np. do zakończenia korespondencji, najdłużej 12 miesięcy), komu są powierzane (hosting, dostawca poczty), prawa osoby (dostęp, sprostowanie, usunięcie, ograniczenie, sprzeciw, przenoszenie, skarga do Prezesa UODO) i link do pełnej polityki prywatności.
- Minimalizacja danych: tylko pola potrzebne do odpowiedzi (imię, e-mail lub telefon, wiadomość); pozostałe opcjonalne i oznaczone „(opcjonalnie)”.
- Wysłanie zwykłego zapytania NIE wymaga zgody — nie dodawaj obowiązkowego checkboxa „wyrażam zgodę na przetwarzanie danych”. Jeśli klient chce checkbox, może to być tylko potwierdzenie „Zapoznałem(-am) się z informacją o przetwarzaniu danych”.
- Zgody dodatkowe (newsletter, informacje handlowe e-mailem/SMS — RODO i Prawo komunikacji elektronicznej) tylko jako osobne, NIEZAZNACZONE domyślnie i NIEOBOWIĄZKOWE pola, każde z jasnym opisem celu i informacją o możliwości wycofania zgody.${isOrg(a) ? '\n- Zapisy dzieci i młodzieży: dane podaje rodzic/opiekun (pole „Imię i nazwisko rodzica/opiekuna”), osobne pole zgody na publikację wizerunku dziecka (niezaznaczone, nieobowiązkowe).' : ''}
- Danych szczególnych (np. o zdrowiu) nie zbieraj w formularzu, chyba że to konieczne (np. gabinet) — wtedy wyraźna zgoda (art. 9 ust. 2 lit. a) i informacja, po co.
- Polityka prywatności (podstrona lub okno) z pełną informacją: administrator, cele i podstawy, odbiorcy (Cloudflare — hosting, dostawca poczty), przekazywanie poza EOG (standardowe klauzule umowne / Data Privacy Framework), okresy przechowywania, prawa, pliki cookies (tylko niezbędne; analityka i piksele wyłącznie po zgodzie z banera, z równie widocznym przyciskiem „Odrzuć”).
- Bezpieczeństwo: tylko HTTPS, walidacja również po stronie serwera, antyspam bez śledzenia (pole-pułapka honeypot, limit wysyłek; Cloudflare Turnstile zamiast reCAPTCHA), dane formularza nie trafiają do logów ani do localStorage, komunikat po wysłaniu bez powtarzania danych osobowych w adresie URL.
- Dane administratora i treść klauzuli edytowalne w panelu (Ustawienia → Dane firmy / RODO).`;

  /** Niezawodność funkcji serwera (wnioski z błędu 524 na mojej stronie). */
  const SERVER_RELIABILITY = `=== 1b. NIEZAWODNOŚĆ SERWERA (obowiązkowo — zapobiega „wiszeniu” strony i błędowi Cloudflare 524) ===
- NIE trzymaj w zmiennej modułu obietnicy (Promise) wspólnej dla wielu żądań (np. „raz na instancję sprawdź/utwórz dane w KV/D1”). Gdy żądanie, które ją zaczęło, zostanie przerwane (np. odwiedzający odświeży stronę w trakcie ładowania), Cloudflare anuluje jego operacje, obietnica nigdy się nie kończy, a WSZYSTKIE kolejne żądania tej kopii serwera czekają do błędu 524 (po ok. 100 s). Zamiast tego: każde żądanie czeka tylko na własne zapytania, a „pamięć” instancji to zwykła wartość logiczna ustawiana dopiero PO udanym zakończeniu (np. let schemaOk = false; … schemaOk = true). Inicjalizacja musi być bezpieczna przy równoległym uruchomieniu.
- Każdy odczyt z KV/D1 na ścieżce wyświetlania strony ma limit czasu (np. 5–6 s: Promise.race z setTimeout). Po przekroczeniu strona pokazuje treść zapisaną w HTML (wartości początkowe) zamiast wisieć.
- Zadania w tle (statystyki, powiadomienia e-mail) tylko przez context.waitUntil i też z limitem czasu — nigdy nie blokują odpowiedzi.
- API panelu przy przekroczeniu czasu zwraca czytelny błąd (503, komunikat po polsku), a panel pokazuje „Serwer chwilowo nie odpowiada — spróbuj ponownie” z przyciskiem ponowienia; żadnych nieskończonych „Ładowanie…”.
- W przeglądarce każde zapytanie (fetch) ma limit czasu (AbortController, ok. 8–10 s).`;

  /* ---------- Panel administracyjny (specyfikacja) ---------- */
  function panelSpec(a, standalone) {
    const scope = val('panel_scope', a);
    return `${standalone ? 'Dodaj do mojej strony panel administracyjny (CMS) według poniższej specyfikacji.' : 'Dodaj do tej strony panel administracyjny (CMS) według poniższej specyfikacji.'} Strona to statyczne pliki HTML (czysty HTML/CSS/JS, bez frameworków) hostowane na Cloudflare Pages, a zapis danych panelu odbywa się na serwerze przez Cloudflare Pages Functions. Panel ma być wbudowany w stronę (w pliku index.html), cały interfejs po polsku, treści strony w językach: ${langs(a)}. Ma być w nim również możliwość zmiany hasła do logowania się do panelu administracyjnego.
${isOrg(a) ? 'TO STRONA WIZERUNKOWA (bez sprzedaży): w panelu pomiń cennik, promocje, usługi, rezerwacje i opinie klientów. Zamiast nich: Aktualności, Kalendarz wydarzeń, Terminarz i wyniki (mecz/zawody: data, godzina, przeciwnik/opis, miejsce, wynik), Drużyny/grupy (z kadrą zawodników lub uczestników, jeśli klient chce), Kadra (trenerzy, nauczyciele, zarząd), Osiągnięcia, Sponsorzy i partnerzy (logo, link, kategoria), Dokumenty do pobrania (PDF), Nabór (włącz/wyłącz, terminy, opis), Galeria. Na pulpicie pokaż najbliższe wydarzenia i mecze zamiast promocji. ' : ''}Dopasuj panel do branży klienta i do sekcji, które faktycznie są na stronie: pomiń podstrony panelu dla elementów, których strona nie ma, a nazwy grup i list dostosuj do branży (np. „Menu” zamiast „Oferta” w restauracji, „Pokoje” w hotelu).${scope ? ` Klient chce samodzielnie zmieniać przede wszystkim: ${scope}.` : ''}

=== 1. ZASADA DZIAŁANIA ===
- Wszystkie treści strony, które ma edytować klient (teksty, listy, zdjęcia, cennik, godziny), są przechowywane w jednym obiekcie danych (state) z wartościami początkowymi wpisanymi w kodzie.
- Strona renderuje te sekcje z danych. Zmiany w formularzu edycji widać od razu w podglądzie sekcji (patrz punkt 3a); po kliknięciu „Zapisz” trafiają na stronę i zapisują się automatycznie.
- ZAPIS NA SERWERZE (obowiązkowo): przygotuj folder functions/ dla Cloudflare Pages Functions z API:
  · GET /api/tresci — publiczny odczyt danych strony (JSON),
  · PUT /api/tresci — zapis (tylko po zalogowaniu), dane w Cloudflare KV (powiązanie o nazwie TRESCI),
  · POST /api/login, POST /api/logout, POST /api/haslo — logowanie, wylogowanie, zmiana hasła,
  · POST /api/zdjecia — wgrywanie zdjęć z panelu (zmniejszanych w przeglądarce do ok. 1600 px, zapis w KV),
  · GET /api/kopie i POST /api/kopie/przywroc — automatyczna kopia 10 ostatnich zapisów z możliwością przywrócenia.
- Bezpieczeństwo: hasło przechowywane wyłącznie jako hash (PBKDF2 z solą) po stronie serwera — nigdy w kodzie przeglądarki; sesja w ciasteczku HttpOnly, Secure, SameSite=Strict; limit nieudanych prób logowania; zapis tylko z nagłówkiem chroniącym przed CSRF.
- Przy starcie strona pokazuje treść zapisaną w HTML (ważne dla SEO), a następnie wczytuje dane z /api/tresci i scala je z danymi początkowymi, żeby nowe pola dodane w kodzie nie znikały.
- Tryb awaryjny: gdy API nie odpowiada (np. plik otwarty z dysku), panel działa w trybie demonstracyjnym z zapisem w przeglądarce (IndexedDB) i wyraźnym paskiem „Tryb demonstracyjny — zmiany zapisują się tylko na tym komputerze”.
- Dołącz krótką instrukcję wdrożenia: utworzenie KV, dodanie powiązania TRESCI, wygenerowanie hasha pierwszego hasła (mały skrypt) i ustawienie go jako zmiennej ADMIN_PASSWORD_HASH oraz SESSION_SECRET.
- Panel ma własne style z unikalnym prefiksem klas (np. .cmsp-), żeby nie kolidował ze stylami strony. Kolory panelu dopasuj do marki: ${colors(a)}.

${SERVER_RELIABILITY}

=== 2. LOGOWANIE ===
- Mała ikonka kłódki przyklejona w lewym dolnym rogu strony (na telefonie nad dolnym paskiem przycisków) oraz link „Panel administratora” w stopce.
- Kliknięcie otwiera okno logowania: hasło, przyciski „Zaloguj” i „Anuluj”, komunikat przy złym haśle i przy zbyt wielu próbach. Logowanie sprawdza serwer (POST /api/login).
- Po zalogowaniu sesja trwa 8 godzin (ciasteczko serwera). Kłódka zmienia się w przycisk „Panel”, który otwiera panel bez ponownego logowania.
- Zmiana hasła: w Ustawieniach panelu formularz „obecne hasło / nowe hasło / powtórz” (min. 10 znaków, wskaźnik siły); serwer zapisuje nowy hash i od tej chwili obowiązuje nowe hasło.
- Escape zamyka okno, focus wraca do przycisku.

=== 3a. PODGLĄD SEKCJI PRZED ZMIANĄ TREŚCI (obowiązkowo) ===
Klient zawsze ma wiedzieć, KTÓREJ części strony dotyczy zmiana, zanim cokolwiek zmieni:
- Każda podstrona panelu i każde pole tekstowe/zdjęcie ma przypisaną sekcję strony (np. „Pierwszy ekran”, „O nas”, „Cennik”, „Stopka”).
- Na początku każdej podstrony panelu jest karta „Ta zmiana dotyczy sekcji: [nazwa]” z miniaturą tej sekcji (podgląd na żywo: zmniejszony fragment strony w ramce, z podświetleniem pola, które jest właśnie edytowane) oraz przycisk „Pokaż na stronie”, który zamyka panel, przewija stronę do sekcji i na 2–3 sekundy ją podświetla.
- Okno edycji elementu listy (modal) ma dwie kolumny: po lewej formularz, po prawej podgląd na żywo tej sekcji z wprowadzanymi zmianami (na telefonie podgląd nad formularzem, zwijany). Zmiany trafiają na stronę dopiero po kliknięciu „Zapisz”; „Anuluj” przywraca poprzednią wersję.
- Najechanie myszą lub fokus na polu formularza podświetla odpowiadający mu element w podglądzie.
- Na pulpicie i w liście „Sekcje strony” każda sekcja ma miniaturę i przycisk „Edytuj tę sekcję”.

=== 3b. WERSJE JĘZYKOWE — WŁĄCZANIE I WYŁĄCZANIE (obowiązkowo, także gdy dziś strona ma tylko PL) ===
- W Ustawieniach panelu lista wersji językowych z przełącznikiem „włączona / wyłączona” dla każdego języka poza polskim (polski jest zawsze włączony) oraz możliwością dodania kolejnego języka.
- Wyłączona wersja znika ze strony: z przełącznika języka w nagłówku, z menu, z linków hreflang i z sitemap.xml; przełącznik języka chowa się całkowicie, gdy włączony jest tylko jeden język.
- Treści w wyłączonym języku NIE są kasowane — zostają w panelu i wracają po ponownym włączeniu. Pola wyłączonego języka w formularzach są zwinięte z adnotacją „wersja wyłączona”.
- Osoba, która ma zapamiętany wyłączony język, widzi stronę po polsku.

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

  const isOrg = (a) => a && a.site_purpose === 'wizerunkowa';
  /** Logo i zdjęcia wgrane przez klienta w briefie (pliki są w panelu, w zgłoszeniu). */
  const clientMaterials = (a, extras) => {
    const lines = [];
    const insp = (extras && extras.inspirations) || [];
    const logo = a.logo_files || a.logo_files_current;
    if (logo) lines.push(`- Własne logo klienta (${logo}) — dołączam pliki. Użyj go bez przerysowywania, dobierz do niego kolory i przygotuj z niego favicon.`);
    if (a.photo_files) lines.push(`- ${a.photo_files} od klienta — dołączam je. Użyj ich w pierwszej kolejności (WebP, opisowe nazwy plików i atrybuty alt).`);
    if (insp.length) lines.push(`- Inspiracje od klienta (${insp.length} ${insp.length === 1 ? 'plik' : insp.length < 5 ? 'pliki' : 'plików'}: ${insp.join(', ')}) — dołączam je. To przykłady stylu, który mu się podoba: przejmij nastrój, kolorystykę, typografię i rozmieszczenie elementów, ale NIE kopiuj cudzych stron, logo, tekstów ani zdjęć 1:1. Na początku odpowiedzi napisz w 3–5 punktach, co bierzesz z inspiracji.`);
    return lines.length ? `MATERIAŁY OD KLIENTA
${lines.join('\n')}

` : '';
  };

  /* ---------- Strona wizerunkowa (klub, szkoła, akademia, organizacja) ---------- */
  function orgSpec(a) {
    const type = val('org_type', a);
    const sections = val('org_sections', a);
    const goals = val('org_goals', a);
    const aud = val('org_audience', a);
    return `CHARAKTER STRONY: WIZERUNKOWA (${type || 'organizacja'}) — to NIE jest strona sprzedażowa
- Cel: budować wizerunek, zaufanie i dumę, informować i angażować społeczność. Bez cennika, koszyka, promocji i języka sprzedaży.
- Odbiorcy: ${aud || 'z briefu'}. Cele strony: ${goals || 'z briefu'}.
- Sekcje wybrane w briefie (zrealizuj je wszystkie, w logicznej kolejności): ${sections || 'z briefu'}.
- Pierwszy ekran: nazwa i herb/logo, krótkie hasło lub misja, mocne zdjęcie (drużyna, uczniowie, obiekt — tylko z materiałów klienta), 1–2 przyciski dopasowane do celów (np. „Zapisz dziecko”, „Najbliższe wydarzenia”, „Zostań partnerem”).
- Wezwania do działania zamiast „kup/zarezerwuj”: zapisy/nabór, kontakt, kalendarz, wsparcie (darowizny, 1,5% podatku), współpraca dla sponsorów.
- Sekcje dynamiczne (aktualności, wydarzenia, terminarz i wyniki, drużyny, kadra, sponsorzy, dokumenty) muszą dać się łatwo aktualizować w panelu — to one sprawiają, że strona żyje.
- Wiarygodność: historia, osiągnięcia i kadra wyłącznie z briefu (bez dopisywania wyników i nagród), dane rejestrowe (KRS/NIP) i dokumenty w stopce lub w sekcji „Dokumenty”.
- Dzieci i młodzież: zdjęcia z wizerunkiem dzieci tylko za zgodą rodziców — przygotuj miejsca na zdjęcia tak, by dało się użyć ujęć bez twarzy.
- Jeśli organizacja jest jednostką publiczną: deklaracja dostępności i pełna zgodność z WCAG 2.1 AA (obowiązek prawny).`;
  }

  /* ---------- SEO (wymagania dla każdej strony) ---------- */
  function seoSpec(a, meta) {
    const n = name(a, meta);
    const city = (a.location ? String(a.location).split(',')[0].trim() : '') || '';
    const branch = H.industryLabel(a) || 'branża z briefu';
    const multi = a.site_type === 'podstrony' || (a.layout && a.layout !== 'onepage' && a.site_type !== 'onepage' && a.site_type);
    const otherLangs = Array.isArray(a.languages) ? a.languages.filter((x) => x !== 'pl') : [];
    const area = val('area', a);
    return `ZADANIE: PROFESJONALNE SEO (strona ma być od razu gotowa do pozycjonowania w Google)
Zanim zaczniesz kodować, przygotuj krótki PLAN SEO i pokaż go na początku odpowiedzi:
- 1 główna fraza i 3–6 fraz pobocznych dla ${multi ? 'każdej podstrony' : 'strony'} — naturalne zapytania ${isOrg(a) ? 'osób szukających tej organizacji (np. „klub piłkarski [miasto]”, „nabór do akademii [miasto]”, „[nazwa] terminarz”)' : 'klientów tej branży'} (${branch}${city ? `, ${city}` : ''}${area ? `, obszar: ${area}` : ''}), np. „[usługa] ${city || '[miasto]'}”, „[usługa] cennik”. Bez upychania słów kluczowych.
- Mapa stron/sekcji z przypisanymi frazami i proponowanymi adresami URL.

Wymagania techniczne i treściowe (wykonaj wszystkie):
1. <html lang="pl">, poprawny, semantyczny HTML5: header, nav, main, section, article, footer; menu jako lista linków.
2. Na każdej stronie unikalny <title> (do ok. 60 znaków, fraza główna + „${n}”) i <meta name="description"> (ok. 140–160 znaków, z korzyścią i wezwaniem do działania).
3. Dokładnie jeden <h1> na stronę (z frazą główną), pod nim logiczna hierarchia <h2>/<h3> — bez przeskakiwania poziomów i bez nagłówków użytych tylko dla wyglądu.
4. <link rel="canonical"> z pełnym adresem (adres domeny z briefu; jeśli go nie ma — https://[DOMENA] do podmiany w jednym miejscu w kodzie).
5. Open Graph i Twitter Card: og:title, og:description, og:url, og:image (1200×630, przygotuj plik og-image lub oznacz [OG-IMAGE DO PODMIANY]), og:type, og:locale pl_PL, twitter:card summary_large_image.
6. Dane strukturalne JSON-LD: ${isOrg(a) ? 'typ organizacji w najlepiej pasującym podtypie schema.org (np. SportsClub / SportsTeam / SportsOrganization, School / EducationalOrganization / CollegeOrUniversity, NGO, GovernmentOrganization, PerformingGroup), a dla wydarzeń z kalendarza — Event / SportsEvent, dla aktualności — NewsArticle' : 'LocalBusiness w najlepiej pasującym podtypie schema.org dla branży (np. HairSalon, AutoRepair, Restaurant, Dentist)'}, z WYŁĄCZNIE prawdziwymi danymi z briefu: nazwa, adres (tylko jeśli ma być widoczny), telefon, e-mail, ${isOrg(a) ? 'dane rejestrowe, ' : 'godziny otwarcia, '}obszar działania, link do map i profili społecznościowych (sameAs), logo. Do tego WebSite oraz — jeśli są — FAQPage (z pytań FAQ widocznych na stronie)${multi ? ' i BreadcrumbList na podstronach' : ''}. NIE dodawaj ocen, liczby opinii ani recenzji, których nie ma na stronie. Dane w JSON-LD muszą być identyczne z widocznymi (NAP: nazwa, adres, telefon — wszędzie tak samo).
7. Treść początkowa ma być w HTML w momencie wczytania strony (widoczna dla Google bez wykonywania JavaScriptu). Panel administracyjny może ją nadpisywać zapisanymi zmianami, ale nie może być jedynym źródłem treści. Przy zmianach z panelu aktualizuj też <title>, opis i JSON-LD, jeśli dotyczą zmienionych danych.
8. Obrazy: opisowe atrybuty alt (co przedstawia zdjęcie, naturalnie z kontekstem branży — bez upychania fraz), width i height (zero przeskakiwania układu), loading="lazy" poza pierwszym ekranem, główny obraz pierwszego ekranu z fetchpriority="high"; format WebP/AVIF; opisowe nazwy plików (np. strzyzenie-damskie-wroclaw.webp).
9. Szybkość (Core Web Vitals): LCP < 2,5 s, CLS < 0,1, INP < 200 ms. Krytyczny CSS w <head>, skrypty z defer, czcionki z preload i font-display: swap (maksymalnie 2 kroje), brak ciężkich bibliotek, mapa Google ładowana dopiero po kliknięciu lub przewinięciu (z obrazkiem zastępczym).
10. Wersja mobilna jako podstawowa (mobile-first), meta viewport, przyciski i linki min. 44×44 px, czytelny tekst min. 16 px.
11. Linkowanie wewnętrzne z opisowymi tekstami linków (np. „cennik strzyżenia”, a nie „kliknij tutaj”); przyciski kontaktu: tel:, mailto:, link do map.
12. SEO lokalne: miasto i obszar działania naturalnie w treści, nagłówkach i stopce; pełne dane kontaktowe w stopce (jeśli mają być widoczne); osadzona mapa lub link do Map Google; miejsce na link do Profilu Firmy w Google [LINK DO UZUPEŁNIENIA].
13. Treści: unikalne, konkretne i pomocne (co, dla kogo, gdzie, za ile, jak się umówić), sekcja FAQ odpowiadająca na pytania klientów (jeśli wybrana w briefie), budowanie zaufania (o firmie, doświadczenie, zespół — tylko prawdziwe informacje).
${multi ? '14. Podstrony jako osobne pliki HTML z przyjaznymi adresami (np. /oferta/, /cennik/, /kontakt/ albo oferta.html), każda z własnym title, description, canonical i H1; wspólne menu i stopka.\n' : '14. Strona jednostronicowa: sekcje z czytelnymi kotwicami (id po polsku bez znaków diakrytycznych, np. #oferta, #cennik, #kontakt).\n'}15. Pliki dodatkowe: robots.txt (z adresem mapy strony), sitemap.xml (wszystkie publiczne adresy), 404.html (z linkiem do strony głównej), favicon (SVG + PNG 32 px + apple-touch-icon 180 px), site.webmanifest, theme-color.
${otherLangs.length ? `16. Wersje językowe (${otherLangs.map((x) => x.toUpperCase()).join(', ')}): osobne adresy dla każdego języka (np. /en/), atrybuty hreflang (w tym x-default), przetłumaczone title, description i alt.\n` : ''}${otherLangs.length ? '17' : '16'}. Analityka i ciasteczka: nie dodawaj śledzenia bez zgody; zostaw w kodzie zakomentowane miejsce na Google Analytics 4 / Google Search Console (meta weryfikacyjna) z instrukcją.
Na końcu odpowiedzi dodaj LISTĘ KONTROLNĄ SEO (spełnione / do uzupełnienia przez klienta, np. adres domeny, zdjęcia, link do Profilu Firmy w Google) i krótką instrukcję: jak dodać stronę do Google Search Console i wysłać sitemap.xml.`;
  }

  /** Wybrane przez klienta logo i hasło (ze strony wyboru) — do polecenia na stronę. */
  function chosenBrand(choice) {
    if (!choice || !choice.option) return '';
    const svg = choice.svg && choice.svg.length <= 40000 ? `\nKod SVG wybranego logo (wersja pozioma) — użyj go w nagłówku i stopce, przygotuj z niego favicon i wersję na ciemne tło:\n${choice.svg}\n` : '\nPliki wybranego logo dołączam osobno (z paczki ZIP z propozycjami: folder opcja-' + choice.option + ').\n';
    return `
LOGO I HASŁO — WYBRANE PRZEZ KLIENTA (gotowe, nie projektuj nowych)
- Logo: opcja ${choice.option}${choice.name ? ` — „${choice.name}”` : ''}${choice.accepted ? ' (zaakceptowana przez klienta)' : ''}.
- Hasło firmowe: ${choice.tagline ? `„${choice.tagline}”` : 'bez hasła'}.${choice.notes ? `\n- Uwagi klienta do logo: ${choice.notes}` : ''}
- Kolory i typografię strony dopasuj do wybranego logo (podaj kody HEX).${svg}`;
  }

  /* ---------- 1. Strona + panel (+ SEO, + wybrane logo) ---------- */
  /** Dodatkowe wymagania klienta (tekst + pliki dodane w panelu). */
  function requirementsTask(extras) {
    const r = extras && extras.requirements;
    if (!r || (!r.text && !(r.files || []).length)) return '';
    return `DODATKOWE WYMAGANIA KLIENTA (najwyższy priorytet — zrealizuj wszystkie; jeśli któreś jest sprzeczne z briefem, wymagania mają pierwszeństwo, a konflikt opisz w notatce)
${r.text ? `${r.text.trim()}\n` : ''}${(r.files || []).length ? `Dołączam pliki z wymaganiami: ${r.files.join(', ')} — przeczytaj je przed rozpoczęciem pracy.\n` : ''}
`;
  }

  function site(a, meta, choice, extras) {
    extras = extras || {};
    const fx = effectsTask(extras.effects);
    // Rodzaj strony ustalony w oknie „Efekty i animacje” — gdy klient w briefie nie zdecydował (albo ustalono inaczej z klientem)
    const st = extras.effects && extras.effects.sitetype;
    if (st === 'onepage' || st === 'multi') {
      const b = briefSiteType(a);
      if (b !== st && !(st === 'multi' && a.layout === 'onepage')) a = { ...a, site_type: st === 'onepage' ? 'onepage' : 'podstrony' };
      if (st === 'multi' && a.layout === 'onepage') extras = { ...extras, fxConflict: 'UWAGA: klient wybrał w briefie układ One Page, a efekty dobrałem dla strony z podstronami — zastosuj układ zgodnie z regułą One Page, a przejścia między podstronami tylko tam, gdzie są osobne strony (np. polityka prywatności); konflikt opisz w notatce.' };
    }
    const needsBrand = H.needsLogo(a) || H.needsTagline(a);
    const what = [H.needsLogo(a) ? 'logo' : '', H.needsTagline(a) ? 'hasło' : ''].filter(Boolean).join(' i ');
    const brand = chosenBrand(choice);
    return `Jesteś doświadczonym projektantem stron internetowych, specjalistą SEO, UX/UI designerem, copywriterem i programistą front-end.
Na podstawie briefu klienta (na końcu tej wiadomości) przygotuj kompletną ${isOrg(a) ? 'stronę wizerunkową organizacji' : 'stronę internetową firmy'} „${name(a, meta)}” z wbudowanym panelem administracyjnym, od razu przygotowaną pod profesjonalne SEO.

ZASADY OGÓLNE
- Nie wymyślaj faktów, opinii klientów, liczb, nagród ani certyfikatów, których nie ma w briefie — brakujące informacje oznacz jako [DO UZUPEŁNIENIA].
- Dopasuj strukturę, słownictwo, zdjęcia i wezwania do działania do branży klienta oraz tego, czego szukają jego klienci.
- Treści pisz po polsku, zgodnie z myślą przewodnią, wartościami i sposobem zwracania się do klientów z briefu.
- Uwzględnij wszystkie sekcje i funkcje wybrane w briefie; propozycje dodatkowe wypisz osobno na końcu, nie dodawaj ich samowolnie.
- Dostępność WCAG 2.1 AA, wygląd na telefonie (390 px) bez przewijania poziomego, szybkie ładowanie, prefers-reduced-motion.

${requirementsTask(extras)}${brand || (needsBrand ? `
LOGO I HASŁO
Klient prosi o: ${what}. Powstają w osobnym kroku (strona wyboru z 4 opcjami, którą klient akceptuje).
- Jeśli do tej wiadomości dołączam wybrane ${what} — użyj ich i dopasuj do nich kolory oraz typografię strony.
- Jeśli nie dołączam — użyj tymczasowego logotypu z nazwy firmy i oznacz miejsca [LOGO DO PODMIANY] / [HASŁO DO PODMIANY].
` : '')}
${clientMaterials(a, extras)}${isOrg(a) ? `${orgSpec(a)}

` : ''}${customSectionsTask(a)}${layoutTask(a)}

ZADANIE 1: STRONA
- Czysty HTML/CSS/JS (bez frameworków i bez serwera), gotowy do wgrania na hosting statyczny (np. Cloudflare Pages). Strona główna w index.html${a.site_type === 'podstrony' ? ', podstrony jako osobne pliki HTML' : ''}; wszystkie pliki spakuj do ZIP.
- Zanim zaczniesz kodować, wypisz krótko: mapę sekcji, główny przekaz pierwszego ekranu, kolory z kodami HEX i plan SEO (zadanie 2).
- Zdjęcia: użyj wyłącznie materiałów wskazanych w briefie; tam, gdzie ich brakuje, wstaw neutralne tła zastępcze opisane [ZDJĘCIE: co ma przedstawiać].

${ANCHOR_SPEC}

${RODO_SPEC(a)}
${fx ? `\n${extras.fxConflict ? `${extras.fxConflict}\n` : ''}${fx}\n` : ''}
${seoSpec(a, meta)}

ZADANIE 3: PANEL ADMINISTRACYJNY
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
${layoutPanel(a)}

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
    const sections = isOrg(a) ? val('org_sections', a) : val('sections', a);
    const features = [sections ? `sekcje: ${sections}` : '', val('booking', a) ? `rezerwacje: ${val('booking', a)}` : '', val('integrations', a) ? `dodatki: ${val('integrations', a)}` : ''].filter(Boolean).join('; ') || '[lista]';
    const live = a.domain_name ? `[https://${String(a.domain_name).split(/[\s—-]+/)[0].replace(/^https?:\/\//, '')}] (sprawdź adres)` : '[https://…] (jeśli brak — pomiń przycisk)';
    return `Przygotuj mi KOMPLETNY PLIK ZIP z kartą projektu do portfolio na mojej stronie „Strony AI Wrocław”
(autor: Grzegorz, Wrocław, kontakt: stronyaiwroclaw@gmail.com). ZIP wgram w panelu administratora
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
4. Link powrotny do portfolio: <a href="/#portfolio">, kontakt: mailto:stronyaiwroclaw@gmail.com.
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
Dla kogo: [branża w dopełniaczu, np. warsztatu samochodowego — dokończenie zdania „Projekt strony internetowej dla …”]
(Jeśli projekt jest demonstracyjny, dopisz w opisie słowo „demonstracyjny”.)

NA KONIEC
* Otwórz index.html i sprawdź, czy wszystkie obrazy się wczytują i nie ma błędów w konsoli.
* Spakuj folder do ZIP (${sl}.zip) i daj mi go do pobrania.
* Podaj listę plików z rozmiarami.`;
  }

  window.BRIEF_PROMPTS = { site, logoPage, panel, portfolio, seoSpec, EFFECTS, effectsSummary, hasEffects, briefSiteType, groupFits };
})();
