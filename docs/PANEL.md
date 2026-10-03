# Obsługa panelu administratora

Adres: `https://twoja-strona/admin/`. Zaloguj się hasłem administratora (jedno konto, bez adresu e-mail).
Zmiany są widoczne na stronie **od razu** po zapisaniu. Sesja wygasa po 12 godzinach. Po 5 błędnych próbach logowanie blokuje się na 15 minut.

## Zgłoszenia
- Lista pokazuje zgłoszenia od najnowszych. Liczba przy zakładce to zgłoszenia o statusie „Nowe”.
- **Filtry:** status (przyciski u góry), wyszukiwarka (firma, imię, e-mail), „Tylko bez wysłanego powiadomienia”.
- **+ Dodaj zgłoszenie ręcznie:** dla firm, z którymi kontakt zacząłeś sam (mailowo, telefonicznie). Takie zgłoszenie ma odznakę „Dodane ręcznie”.
- Kliknij zgłoszenie, aby zobaczyć szczegóły.
  - **Edytuj dane:** poprawiasz firmę, osobę, e-mail, telefon, linki i opis (np. gdy klient pomylił adres e-mail). Kolejne wiadomości z panelu idą na nowy adres.
  - **Status:** Nowe → Kontakt → W realizacji → Zakończone, albo Odrzucone. Zmiana zapisuje się od razu.
  - **Odpowiedz e-mailem:** otwiera Twój program pocztowy z gotowym adresem.
  - **Prywatne notatki** widzisz tylko Ty. Nie trafiają na stronę ani do zgłaszającego.
  - **Powiadomienie e-mail:** jeśli się nie udało, kliknij **Wyślij powiadomienie ponownie**. Zgłoszenie jest bezpieczne w bazie niezależnie od tego.
  - **Brief projektowy** (na dole zgłoszenia): gdy klient zgodzi się na współpracę, kliknij **Utwórz brief dla tego zgłoszenia**, a potem **Wyślij link e-mailem**. Po wypełnieniu pełne odpowiedzi zobaczysz w tym samym miejscu.
  - **Usuń zgłoszenie** trwale kasuje dane, notatki i przypięty brief, np. na prośbę zgłaszającego. Panel zawsze prosi o potwierdzenie.

## E-mail do klienta (w zgłoszeniu)
- **Napisz e-mail** u góry zgłoszenia albo **Wyślij link e-mailem** przy briefie i przy propozycjach logo otwiera gotową wiadomość, którą możesz poprawić przed wysłaniem.
- Po skonfigurowaniu Gmaila ([`EMAIL.md`](EMAIL.md)) przycisk **Wyślij z stronywroclawai@gmail.com** wysyła wiadomość prosto z Twojej skrzynki. Kopia jest w „Wysłanych”, a historia — w zgłoszeniu.
- Bez konfiguracji działa przycisk **Otwórz w Gmailu** (gotowa wiadomość, klikasz „Wyślij”).

## Logo i hasło — propozycje dla klienta (w zgłoszeniu)
1. **Kopiuj polecenie dla AI (4 opcje + ZIP)** — wklej do AI. Dostaniesz plik `wybor-logo.html` i ZIP z plikami logo.
2. **Wgraj plik HTML z propozycjami** — panel odczyta z niego nazwy opcji i hasła.
3. **Wyślij link e-mailem** — klient otwiera stronę `twojastrona/logo/…`, ogląda propozycje i w formularzu pod nimi zaznacza opcję i hasło, dopisuje uwagi i akceptuje kierunek.
4. Wybór zapisuje się w zgłoszeniu („Klient wybrał: Opcja 2 — …”), na liście zgłoszeń pojawia się odznaka „Logo: wybrane”, a Ty dostajesz e-mail.

W zgłoszeniu widzisz też **wygląd wybranego logo** (na jasnym i ciemnym tle) oraz miniatury wszystkich opcji. Panel odczytuje je z wgranego pliku: z bloku danych przygotowanego przez AI albo z pierwszej grafiki SVG pod nagłówkiem „Opcja N”. Jeśli opcja jest obrazkiem PNG/JPG zamiast SVG, zobaczysz „brak podglądu” i link do pliku.

Klient może zmienić wybór, wysyłając formularz ponownie — w panelu widzisz ostatnią wersję. Wgranie nowego pliku zastępuje poprzedni i tworzy nowy link.

## Statystyki
- Licznik odwiedzin bez plików cookies i bez usług zewnętrznych. W menu obok „Statystyki” widać liczbę dzisiejszych wejść.
- Kafelki: dzisiaj, odwiedzający dzisiaj, 7 dni, wybrany okres, od początku. Wykres wejść dziennie (7 / 30 / 90 dni / rok) z tabelą danych.
- Listy: najczęściej oglądane podstrony (w tym karty portfolio), skąd przychodzą odwiedzający, urządzenia.
- Nie są liczone: Twoje wejścia, gdy jesteś zalogowany do panelu, oraz roboty wyszukiwarek.
- „Odwiedzający” to przybliżona liczba unikalnych osób w danym dniu (skrót zmieniany codziennie, usuwany po dwóch dniach). Opis jest w polityce prywatności, punkt 8.

## Briefy klientów
Zestawienie wszystkich briefów. Brief tworzysz w konkretnym zgłoszeniu i tam przeglądasz odpowiedzi, drukujesz je i kopiujesz jako tekst dla AI. Szczegóły w [`BRIEF.md`](BRIEF.md).

## Treści strony
- Teksty są pogrupowane według sekcji strony. Każdą sekcję zapisujesz przyciskiem **Zapisz sekcję**.
- **Puste pole** = na stronie zostaje tekst domyślny. **Pojedynczy myślnik „-”** ukrywa dany element.
- Pola „punkty (jedna linia = jeden punkt)” tworzą listy: każda linia to osobny punkt.
- Grupa **Polityka prywatności** zawiera dane do uzupełnienia przed publikacją.
- Grupa **Kontakt i formularz** zawiera m.in. **Formularz: szkic wiadomości** — tekst, który odwiedzający widzi wpisany w polu wiadomości — oraz podpowiedź nad tym polem. Wpisz „-”, jeśli pole wiadomości ma być puste.

## FAQ, Branże, Możliwości
- **Dodaj…** tworzy nowy element na końcu listy. Wypełnij pola i kliknij **Dodaj**.
- Strzałki **↑ ↓** zmieniają kolejność.
- Odznacz **Widoczne na stronie**, aby ukryć element bez usuwania.
- **Usuń** kasuje element na stałe, po potwierdzeniu.
- Lista „Branże” w panelu steruje kafelkami w sekcji „Dla kogo” na stronie. Pole „Branża” w formularzu ma stałą listę 130 branż — tę samą co brief, więc brief sam rozpoznaje branżę ze zgłoszenia.
- Pierwsza możliwość na liście jest wyróżniona granatowym tłem. „Szeroka” zajmuje dwie kolumny.

## Zdjęcia
- Wybierz plik JPG, PNG lub WebP i **koniecznie opisz zdjęcie** (tekst alternatywny dla osób niewidomych i dla wyszukiwarek).
- Panel sam zmniejszy zdjęcie (maksymalnie 1920 px) i zapisze je jako WebP. Po optymalizacji plik musi mieć mniej niż 5 MB.
- Wgrywaj tylko zdjęcia, na których użycie masz zgodę.
- Pliki zdjęć mają losowe, trudne do odgadnięcia adresy. Na stronie pojawiają się wyłącznie zdjęcia przypięte do opublikowanych realizacji.

## Portfolio
- **Dodaj realizację:** nazwa, branża/podtytuł, opis, tagi, adres strony, status, oznaczenie „Projekt demonstracyjny”, zdjęcia.
- **Karta projektu:** wgraj paczkę ZIP (`index.html` + `img/` + `opis-do-portfolio.txt`). Panel sam uzupełni pola z opisu i pozwoli wybrać okładkę kafelka. Pełna instrukcja i gotowe polecenie dla AI: [`PORTFOLIO.md`](PORTFOLIO.md).
- **Szkic** widzisz tylko Ty (także podgląd karty). **Opublikowana** jest widoczna na stronie. Przed publikacją panel przypomni o zgodzie firmy, a przy projekcie demonstracyjnym — o fikcyjnych danych.
- Pierwsza realizacja na liście (domyślnie najnowsza) jest pokazana dużym kafelkiem na górze, a kolejne w mniejszych kafelkach po dwie obok siebie. Kolejność zmieniasz strzałkami.
- Sekcja „Portfolio” i link w menu pojawiają się automatycznie po opublikowaniu pierwszej realizacji.

## Ustawienia
- **Przyjmowanie nowych projektów:** wyłączenie ukrywa formularz i pokazuje komunikat „Obecnie realizuję przyjęte projekty. Możesz napisać do mnie, aby zapytać o kolejny termin”, razem z adresem e-mail. **Nie usuwa** żadnych zgłoszeń ani kontaktów.
- **Adres e-mail na stronie:** adres wyświetlany odwiedzającym. Adres powiadomień ustawiasz w Cloudflare (`NOTIFY_TO`).
- **Stan konfiguracji:** pokazuje, czy działają baza D1, magazyn zdjęć KV, Turnstile i Resend. Przycisk **Wyślij e-mail testowy** sprawdza powiadomienia.
- **Zmiana hasła:** opis kroków poniżej.

## Zmiana hasła
**Ustawienia → Zmiana hasła:** wpisz obecne hasło i dwa razy nowe (co najmniej 10 znaków). Zmiana działa od razu, a na innych urządzeniach trzeba zalogować się ponownie.
W bazie zapisuje się tylko skrót hasła.

**Nie pamiętasz hasła?**
1. Otwórz `/admin/generator-hasla.html` (na stronie albo z dysku: `public/admin/generator-hasla.html`), wpisz nowe hasło i skopiuj wartość **ADMIN_PASSWORD_HASH**.
2. Cloudflare → projekt Pages → **Settings → Variables and Secrets** → `ADMIN_PASSWORD_HASH` → **Edit** → wklej → **Save**.
3. **Deployments** → **⋯** → **Retry deployment**.

Nowa wartość w Cloudflare zastępuje hasło ustawione w panelu. `SESSION_SECRET` i `IP_HASH_SALT` zostaw bez zmian.
