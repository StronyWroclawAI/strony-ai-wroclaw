# Wysyłanie e-maili z panelu z adresu stronywroclawai@gmail.com

Po tej konfiguracji panel wysyła wiadomości do klientów **prosto z Twojej skrzynki Gmail**:
- klient widzi nadawcę `Strony AI Wrocław <stronywroclawai@gmail.com>` i odpowiada na ten adres;
- kopia każdej wiadomości jest w Gmailu w folderze **Wysłane**;
- w zgłoszeniu w panelu masz historię wysłanych wiadomości;
- powiadomienia do Ciebie (nowe zgłoszenie, wypełniony brief, wybór logo) też idą przez Gmail, więc Resend przestaje być potrzebny.

Bez tej konfiguracji panel nadal działa: przycisk **Otwórz w Gmailu** otwiera gotową wiadomość, a Ty klikasz „Wyślij”.

> **Bezpieczeństwo.** „Hasło aplikacji” daje dostęp do całej skrzynki. Wklejasz je **tylko** w Cloudflare jako sekret. Nie wpisuj go w kodzie, na GitHubie ani na żadnym czacie. Jeśli podejrzewasz wyciek — usuń je w koncie Google (krok 2) i utwórz nowe.

## Krok 1. Włącz weryfikację dwuetapową w Google
1. Wejdź na <https://myaccount.google.com/security> (zalogowany jako stronywroclawai@gmail.com).
2. W sekcji „Sposób logowania się w Google” włącz **Weryfikację dwuetapową** (telefon). Bez tego Google nie pozwala tworzyć haseł aplikacji.

## Krok 2. Utwórz hasło aplikacji
1. Wejdź na <https://myaccount.google.com/apppasswords>.
2. Nazwa aplikacji: np. `Panel Strony AI Wrocław` → **Utwórz**.
3. Google pokaże 16 znaków (np. `abcd efgh ijkl mnop`). Skopiuj je — zobaczysz je tylko raz.

## Krok 3. Dodaj zmienne w Cloudflare
Cloudflare → **Workers & Pages** → Twój projekt → **Settings → Variables and Secrets** → **Add**:

| Nazwa | Typ | Wartość |
|---|---|---|
| `GMAIL_USER` | Text | `stronywroclawai@gmail.com` |
| `GMAIL_APP_PASSWORD` | **Secret** | 16 znaków z kroku 2 (spacje nie przeszkadzają) |

Zapisz, potem **Deployments → ⋯ → Retry deployment**.

## Krok 4. Sprawdź
1. Panel → **Ustawienia → Stan konfiguracji**: „Wysyłka z Gmaila” powinna być zielona.
2. Kliknij **Wyślij e-mail testowy** — wiadomość przyjdzie na Twój adres.
3. Otwórz dowolne zgłoszenie → **E-mail do klienta** → napisz i wyślij wiadomość (na próbę do zgłoszenia z własnym adresem).

## Jak wysyłać z panelu
- **Brief:** w zgłoszeniu → „Wyślij link e-mailem” → treść z linkiem wpisuje się sama → możesz ją poprawić → **Wyślij**.
- **Propozycje logo:** sekcja „Logo i hasło” → „Wyślij link e-mailem”.
- **Dowolna wiadomość:** przycisk „Napisz e-mail” u góry zgłoszenia.

## Ograniczenia
- Gmail pozwala na ok. 500 wiadomości dziennie; panel dodatkowo ogranicza wysyłkę do 40 na godzinę.
- Wysyłka działa tylko do adresu e-mail zapisanego w zgłoszeniu.
- Jeśli Google odrzuci logowanie (błąd 535), utwórz nowe hasło aplikacji i podmień sekret.
- Projekt Pages musi mieć aktualną datę zgodności (Settings → Runtime → Compatibility date — ustaw dzisiejszą, jeśli wysyłka zgłasza błąd połączenia).
