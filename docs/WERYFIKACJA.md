# Weryfikacja

## Co zostało przetestowane podczas przygotowania projektu

Testy uruchomiłem lokalnie w oficjalnym środowisku Cloudflare (`wrangler pages dev`). Lokalne D1 i KV działają tak samo jak w chmurze, tylko na plikach. **Nie było to Twoje konto Cloudflare ani Resend. Projekt nie został jeszcze nigdzie opublikowany.**

Wynik automatycznych testów przeglądarkowych (Chromium): **36/36**.

| Obszar | Sprawdzone |
|---|---|
| Baza | Tabele i teksty tworzą się same przy pierwszym uruchomieniu, bez ręcznego SQL. |
| Logowanie | Złe hasło: komunikat i licznik prób. Po 5 próbach blokada (429). Brak sesji → 401. Podrobione ciasteczko → 401. Zmiany bez nagłówka panelu (CSRF) → 403. Skrót z generatora hasła jest akceptowany przez serwer, a inne hasło odrzucane. |
| Zdjęcia | Plik SVG przemianowany na .webp odrzucony (sprawdzanie zawartości). Plik 6 MB odrzucony. Wgrywanie bez sesji i bez tekstu alternatywnego odrzucone. Próby wyjścia poza katalog w `/media/` → 404. Wgrane zdjęcie jest zmniejszane do 1920 px, zapisywane jako WebP i wyświetlane w portfolio. |
| Formularz | Walidacja (422), odrzucenie złego formatu (415) i obcego pochodzenia (403), pole-pułapka, duplikat zapisany raz, limit 5 zgłoszeń na godzinę z IP (429), zamknięty nabór (409). |
| Brak e-maila | Przy niedziałającej wysyłce zgłoszenie **zostaje zapisane** ze statusem „Powiadomienie nieudane”. |
| XSS | Kod HTML wpisany w treść w panelu wyświetla się na stronie jako zwykły tekst. |
| Panel | Lista i szczegóły zgłoszeń, statusy, notatki, treści, dodawanie i usuwanie FAQ z potwierdzeniem, zdjęcia, portfolio z pytaniem o zgodę, przełącznik naboru (zgłoszenia nie znikają). |
| Strona po zmianach | Nowy tekst, komunikat zamkniętego naboru i sekcja Portfolio ze zdjęciem są widoczne od razu. |
| Widoki | Brak przewijania poziomego przy 320, 390, 768, 1024 i 1440 px. Menu mobilne. Tryb ograniczonego ruchu. Strona 404. Kotwice menu. Brak błędów JavaScript. Podgląd `podglad/` działa z dysku bez internetu. |

## Czego nie dało się sprawdzić tutaj (sprawdź po wdrożeniu)
- Prawdziwa weryfikacja Cloudflare Turnstile i prawdziwa wysyłka przez Resend (środowisko testowe nie miało do nich dostępu).
- Działanie na Twoim koncie Cloudflare: powiązania, zmienne, nagłówki.

## Lista kontrolna po wdrożeniu (ok. 15 minut)

**Strona**
- [ ] Strona główna otwiera się pod adresem `*.pages.dev`, a pierwszy ekran pokazuje „0 zł” i informację o kosztach zewnętrznych.
- [ ] Na telefonie strona nie przesuwa się na boki, a menu (☰) otwiera się i zamyka.
- [ ] Klawisz Tab przechodzi po linkach i polach; fokus jest wyraźnie widoczny.
- [ ] `/polityka-prywatnosci` otwiera się. Po uzupełnieniu danych w panelu znika żółty baner.
- [ ] `/cokolwiek` pokazuje stronę 404.
- [ ] Udostępnienie linku (np. w Messengerze) pokazuje obrazek z logo.

**Formularz**
- [ ] Wysłanie pustego formularza pokazuje błędy przy polach.
- [ ] Bez zaznaczenia Turnstile wysyłka jest blokowana.
- [ ] Poprawne zgłoszenie → komunikat „Dziękuję — zgłoszenie zostało zapisane”.
- [ ] Zgłoszenie jest w panelu, a e-mail przyszedł na stronywroclawai@gmail.com.
- [ ] Odpowiedź na e-mail z powiadomieniem trafia do zgłaszającego (pole „Odpowiedz do”).

**Uprawnienia** (w oknie prywatnym przeglądarki, bez logowania)
- [ ] Otwórz `https://<twój-adres>/api/admin/leads`. Oczekiwany wynik: „Sesja wygasła. Zaloguj się ponownie.” — **nigdy dane zgłoszeń**.
- [ ] `/admin/` bez logowania pokazuje tylko ekran logowania.
- [ ] Pięć błędnych haseł z rzędu blokuje logowanie na 15 minut.

**Panel**
- [ ] Ustawienia → Stan konfiguracji: wszystko na zielono, a e-mail testowy dochodzi.
- [ ] Zmiana tekstu w Treściach jest od razu widoczna na stronie.
- [ ] Wyłączenie naboru zastępuje formularz komunikatem z e-mailem. Ponowne włączenie przywraca formularz.
- [ ] Wgranie zdjęcia działa. Próba wgrania pliku innego niż JPG/PNG/WebP jest odrzucana.
- [ ] Testowe zgłoszenie usunięte po teście.
