# Brief projektowy dla klientów

Brief to szczegółowy kwestionariusz, który klient wypełnia online przed rozpoczęciem projektu. Na jego podstawie przygotowujesz stronę.

**Każdy brief jest przypięty do zgłoszenia.** Najpierw jest kontakt (formularz na stronie albo Twój e-mail), a gdy klient zgodzi się na współpracę — tworzysz brief w jego zgłoszeniu i tam widzisz pełne odpowiedzi.

## Co zawiera (14 kroków)
1. **O firmie:** nazwa, kontakt, **branża wybierana z listy 130 branż w 17 grupach**, opis, wyróżniki, klienci, obszar działania, adres.
2. **Pytania branżowe:** zestaw pytań dopasowany do wybranej branży (szczegóły niżej).
3. **Cel strony:** do czego ma służyć i co odwiedzający ma zrobić.
4. **Wersje językowe:** polski, angielski, niemiecki, ukraiński i inne; zakres tłumaczeń i kto je przygotuje.
5. **Sekcje strony:** układ (one-page lub podstrony) i ponad 30 sekcji do zaznaczenia w 5 grupach, plus własne propozycje.
6. **Oferta i cennik:**
   - cennik: z cenami, „od…”, przedziały, bez cen, „wycena indywidualna” albo brak;
   - co pokazać przy usługach i skąd wziąć cennik.
7. **Kontakt i rezerwacje:**
   - Booksy, inny system (Versum, Moment, ZnanyLekarz, Fresha, Calendly…), własny system, formularz, tylko telefon;
   - przycisk czy osadzone okienko;
   - formy kontaktu, godziny otwarcia, social media.
8. **Logo i hasło firmy:** myśl przewodnia, wartości marki, sposób zwracania się do klientów, hasło (mam / chcę nowe / proszę o propozycje), logo (mam / odświeżyć / **proszę o zaprojektowanie** / nie potrzebuję). Przy projekcie logo dodatkowe pytania: napis, rodzaj logo, charakter, symbole, czego unikać, gdzie będzie używane, inspiracje.
9. **Wygląd i styl:** kolory, charakter, jasna lub ciemna kolorystyka, inspiracje, czego unikać.
10. **Treści i materiały:** kto pisze teksty, jakie materiały są dostępne, zdjęcia, źródła, materiały wyłączone, potwierdzenie praw.
11. **Funkcje i integracje:** panel edycji i jego zakres, mapa, Instagram, WhatsApp, newsletter, statystyki, płatności, hasła do wyszukiwarki.
12. **Domena i technika:** domena, e-mail w domenie, obecna strona.
13. **Organizacja:** termin, kto akceptuje projekt, preferowany kontakt.
14. **Twoje pomysły i uwagi:** 3 najważniejsze rzeczy, które strona musi mieć, co jeszcze klient chciałby na stronie (poza pytaniami z formularza), wskazówki dla Ciebie, obawy, pytania do Ciebie i inne uwagi.

Przy pytaniach wyboru klient może zaznaczyć „Inne” i dopisać własną odpowiedź. Niektóre pytania pojawiają się tylko wtedy, gdy mają sens: np. link do Booksy po wybraniu Booksy, a pytania o tłumaczenia po wybraniu innego języka.

Treść pytań jest w jednym pliku: `public/brief/schema.js`. Możesz w nim dodawać i zmieniać pytania. Formularz i panel dostosują się same.

## Branże i pytania branżowe
Klient wybiera branżę z listy, a krok 2 pokazuje pytania właściwe dla niej. Jeśli zmieni branżę, pytania zmieniają się od razu.

| Grupa | Przykładowe branże | O co pytam |
|---|---|---|
| Gastronomia (10) | restauracja, pizzeria, kawiarnia, cukiernia, bar/pub, food truck, catering | forma menu, alergeny i oznaczenia, dowóz (Pyszne, Glovo, Uber Eats/Wolt, własny), rezerwacja stolików, imprezy; torty na zamówienie, rodzaje cateringu, lokalizacje food trucka, wydarzenia w pubie |
| Noclegi (7) | hotel, hostel, pensjonat, apartamenty, agroturystyka, domki/glamping, ośrodek | liczba i rodzaje pokoi, silnik rezerwacji / Booking / Airbnb, rezerwacje bezpośrednie, goście, udogodnienia, zameldowanie, anulacja, opłata miejscowa, ceny sezonowe, okolica; dla hostelu sale wieloosobowe, lockery, wspólna kuchnia |
| Uroda (9) | fryzjer, barber, kosmetyczka, kosmetologia, paznokcie, rzęsy i brwi, SPA | kategorie zabiegów, wybór specjalisty, marki kosmetyków, zdjęcia „przed i po” (za zgodą), vouchery i karnety, przeciwwskazania, zadatki, wizyty bez zapisów |
| Tatuaż i piercing (3) | studio tatuażu, piercing, makijaż permanentny | style, artyści i ich galerie, formularz zapytania o projekt, sposób wyceny, wiek 18+, gojenie, wolne wzory (flash) |
| Zdrowie (8) | stomatolog, lekarz, fizjoterapia, psycholog, dietetyk, logopeda, podolog, optyk | kwalifikacje specjalistów, NFZ/prywatnie, konsultacje online, informacje dla pacjentów, zakres leczenia; uwaga o zasadach etyki zawodowej |
| Sport (7), Edukacja (7) | siłownia, trener, joga, sztuki walki, taniec; szkoła językowa, korepetycje, przedszkole, szkoła jazdy | grafik zajęć, karnety i karty sportowe, poziomy; forma zajęć, zapisy, kategorie prawa jazdy, informacje dla rodziców |
| Motoryzacja (9) | warsztat, wulkanizacja, myjnia, lakiernik, komis, wypożyczalnia, pomoc drogowa | zakres usług, marki, dane auta w zapytaniu, auto zastępcze, likwidacja szkód, ogłoszenia aut, flota |
| Budownictwo i dom (12), Usługi (9) | budowlanka, remonty, elektryk, hydraulik, dekarz, stolarz, OZE, ogrody, architekt; sprzątanie, przeprowadzki, ślusarz, DDD | obszar działania, sposób wyceny, realizacje, uprawnienia i gwarancje, zlecenia awaryjne, abonamenty |
| Usługi profesjonalne (10) | księgowość, kancelaria prawna, nieruchomości, ubezpieczenia, IT, marketing | klienci, specjalizacje, pierwszy kontakt, zaufanie, poradniki, oferty nieruchomości |
| Kreatywne (7), Wydarzenia i rozrywka (7) | fotograf, filmowiec, DJ, drukarnia; sala weselna, wedding planner, escape room, sala zabaw | portfolio, pakiety, wolne terminy, galerie dla klientów; pojemność, menu weselne, atrakcje, regulamin |
| Handel (9), Zwierzęta (7), Turystyka i transport (6), Organizacje (2) | sklep, kwiaciarnia, jubiler, producent; weterynarz, groomer, hodowla, stajnia; biuro podróży, przewóz osób, transport; fundacja, dom kultury | prezentacja produktów i dostawa; gatunki, szczepienia, dyżury; terminy, program, flota; darowizny, 1,5%, sprawozdania, wydarzenia |

Do tego dla każdej branży wspólne pytania: co klient musi wiedzieć przed kontaktem, najczęstsze pytania (FAQ), sezonowość i konkurencja. Przy „Inna branża” klient opisuje specyfikę swojej działalności.

Branża dopasowuje też inne kroki:
- w kroku **Sekcje strony** pojawiają się sekcje typowe dla branży (np. „Menu”, „Pokoje”, „Grafik zajęć”, „Wolne wzory”) i oznaczenie **Polecane**;
- w kroku **Kontakt i rezerwacje** pytanie o Booksy znika tam, gdzie nie ma sensu (gastronomia, noclegi, tatuaż, handel), bo te branże mają własne pytania o rezerwacje.

**Branża ze zgłoszenia rozpoznaje się automatycznie** (np. „Salon fryzjerski” → Salon fryzjerski, „Hostel Mleczarnia” → Hostel). Klient widzi ją już zaznaczoną i może ją zmienić.

Listę branż i pytań możesz rozbudować w pliku `public/brief/schema.js` (sekcje `INDUSTRY_GROUPS` i `INDUSTRY_FIELDS`).

## Jak używać
1. **Kontakt.** Klient pisze przez formularz na stronie — zgłoszenie pojawia się w **Panel → Zgłoszenia**. Jeśli to Ty napisałeś pierwszy (mailowo, telefonicznie), kliknij **Zgłoszenia → + Dodaj zgłoszenie ręcznie** i wpisz firmę, osobę i e-mail.
2. **Klient się zgadza?** Otwórz jego zgłoszenie i na dole kliknij **Utwórz brief dla tego zgłoszenia**. Nazwa firmy, osoba, e-mail, telefon, branża i linki ze zgłoszenia wpiszą się do briefu same (klient może je poprawić).
3. **Wyślij link:** przycisk **Wyślij link e-mailem** otwiera gotową wiadomość do klienta w Twoim programie pocztowym. Możesz też **Kopiuj link** i wkleić go do własnej wiadomości.
4. **Klient wypełnia brief:**
   - odpowiedzi zapisują się automatycznie, więc można przerwać i wrócić przez ten sam link;
   - w zgłoszeniu widzisz stan: „Czeka na klienta” → „Klient wypełnia” → „Wypełniony”, a także datę otwarcia linku;
   - na końcu klient widzi podsumowanie i klika **Wyślij brief**.
5. **Dostajesz e-mail** „Brief wypełniony: …” z przyciskiem prowadzącym prosto do zgłoszenia. Na liście zgłoszeń pojawia się odznaka „Brief: wypełniony”.
6. **W zgłoszeniu, pod danymi klienta, masz pełny podgląd briefu:**
   - wszystkie odpowiedzi pogrupowane w 14 sekcji, z nazwą branży u góry;
   - **Popraw** (przy każdej sekcji): otwiera ten krok briefu w trybie administratora. Poprawiasz odpowiedzi klienta tak samo, jak on je wypełniał. Zmiany zapisują się automatycznie, status briefu się nie zmienia, klient nie dostaje powiadomienia, a w zgłoszeniu pojawia się adnotacja „poprawiony przez Ciebie”;
   - **Teksty dla AI** — cztery przyciski, każdy kopiuje gotowe polecenie:
     1. **Strona wyboru logo i hasła (4 opcje + ZIP)** — widoczny, gdy klient prosi o logo lub hasło. AI przygotuje stronę `wybor-logo.html` z 4 opcjami, którą wysyłasz klientowi (klient wybiera opcję i hasło, akceptuje i odsyła wybór e-mailem), oraz ZIP, w którym każde logo jest osobnym plikiem (SVG i PNG, wersje pozioma, pionowa, znak, czarna, biała, ikona);
     2. **Strona z panelem administracyjnym** — pełny brief + specyfikacja panelu (logowanie, zmiana hasła, pulpit, listy, promocje i aktualności z terminami, godziny otwarcia, kopia zapasowa). Jeśli klient wybrał już logo, dołącz je do wiadomości;
     3. **Sam panel (do gotowej strony)** — sama specyfikacja panelu, gdy strona już istnieje;
     4. **Karta do portfolio (ZIP)** — polecenie przygotowania karty projektu, wypełnione nazwą, branżą, miastem i zakresem z briefu (wgrywasz ją potem w Portfolio);
   - **Kopiuj odpowiedzi**, **Pobierz plik .md**, **Drukuj / PDF** (drukuje sam brief);
   - **Odblokuj do edycji:** klient może sam poprawić i wysłać brief ponownie;
   - **Notatki do briefu (prywatne)** i **Usuń brief** (zgłoszenie zostaje).

Zakładka **Briefy klientów** to zestawienie wszystkich briefów — kliknięcie otwiera zgłoszenie, do którego brief jest przypięty. Usunięcie zgłoszenia usuwa też jego brief.

Podgląd tego, co widzi klient: **Panel → Briefy klientów → „Jak to widzi klient?”** albo plik `podglad/podglad-brief.html` (dwuklik). W trybie podglądu nic nie jest wysyłane ani zapisywane.

## Co zmieniło się w pytaniach (wersja 5)
Pytania nie powtarzają się między krokami:
- „Kim są Twoi klienci” pojawia się raz: w kroku 1 albo w pytaniach branżowych (tam, gdzie branża ma dokładniejszą listę).
- Obszar działania jest tylko w kroku 1 (z polem na doprecyzowanie).
- Sposób pokazania cen jest tylko w kroku „Oferta i cennik” (z nowymi opcjami „pakiety” i „stawka”). Gastronomia i noclegi mają zamiast tego własne pytania o menu i ceny pokoi.
- Rezerwacje: branże z własnym pytaniem (gastronomia, noclegi, tatuaż, handel, turystyka) nie widzą ogólnego pytania o Booksy.
- Mapa jest tylko w „Sekcjach strony”; informacje praktyczne (parking, płatności, dostępność) nie dublują się z listami branżowymi.
- Logo i cennik zniknęły z listy materiałów (są osobne pytania).
- Krok „Twoje pomysły i uwagi” ma 4 pola zamiast 6.
- Nowe pole „Wypisz najważniejsze usługi / produkty” dla branż, które nie miały takiego pytania.

Odpowiedzi z wcześniej wypełnionych briefów na usunięte pytania nadal są widoczne w panelu.

## Bezpieczeństwo i prywatność
- Każdy link zawiera losowy, niemożliwy do odgadnięcia klucz. Bez linku nie da się otworzyć briefu.
- Strona briefu nie jest indeksowana przez wyszukiwarki.
- Klient widzi tylko swój brief. Listę briefów i odpowiedzi widzi tylko zalogowany administrator.
- Po wysłaniu brief jest zablokowany do edycji, dopóki go nie odblokujesz.
- Usunięcie briefu w panelu kasuje odpowiedzi i unieważnia link.
- Wysłanie briefu nie jest zamówieniem. Zakres, terminy i zgody ustalacie przed rozpoczęciem projektu (taka informacja jest w formularzu).
