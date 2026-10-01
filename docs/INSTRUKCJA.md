# Instrukcja uruchomienia krok po kroku (tylko darmowe usługi)

Cała strona działa na **Cloudflare**: strona, formularz, baza danych, zdjęcia i ochrona przed spamem. Powiadomienia e-mail wysyła **Resend**. Pliki przechowuje **GitHub**. Wszystko na darmowych planach, bez karty płatniczej i bez usypiania.

Wykonuj kroki po kolei. Przy każdym opisuję, **po czym poznasz, że się udało**.

> 🔒 **Zasada bezpieczeństwa:** hasło, klucze i sekrety wpisujesz **tylko** w panelu Cloudflare (albo w lokalnym pliku `.dev.vars`). Nigdy nie wklejaj ich do czatu, e-maila ani plików w GitHubie.

Wygląd paneli Cloudflare i Resend czasem się zmienia. Jeśli przycisk nazywa się trochę inaczej, szukaj podobnej nazwy w tym samym miejscu.

**Kroki**
1. GitHub — wgranie plików (5 min)
2. Cloudflare — baza D1 i magazyn zdjęć KV (3 min)
3. Cloudflare Turnstile — ochrona formularza (3 min)
4. Resend — powiadomienia e-mail (5 min)
5. Hasło do panelu (2 min)
6. Cloudflare Pages — publikacja i ustawienia (10 min)
7. Pierwsze sprawdzenie (5 min)
8. Domena (później)
9. (Opcjonalnie) Uruchomienie na własnym komputerze

---

## Krok 1. GitHub — wgranie plików

Cloudflare uruchamia funkcje serwerowe (formularz, panel) tylko wtedy, gdy projekt pochodzi z GitHuba albo z narzędzia Wrangler. Zwykłe przeciągnięcie plików w panelu Cloudflare **nie zadziała**.

1. Załóż konto na https://github.com.
2. Kliknij **+** (prawy górny róg) → **New repository**.
3. *Repository name:* `strony-ai-wroclaw`, zaznacz **Private**, kliknij **Create repository**.
4. Kliknij link **uploading an existing file**.
5. Rozpakuj ZIP. Otwórz folder `strony-ai-wroclaw`, **zaznacz całą jego zawartość** (foldery `public`, `functions`, `docs`, `podglad`, `logo-zrodla` oraz pliki `README.md` i `package.json`) i przeciągnij do okna przeglądarki.
   - Przeciągasz **zawartość** folderu, nie sam folder.
   - Pliki zaczynające się od kropki (np. `.gitignore`) mogą się nie przenieść. Nie są potrzebne.
6. Kliknij **Commit changes**.

✅ **Poprawny wynik:** na liście w repozytorium widzisz od razu foldery `functions` i `public` (a nie jeden folder `strony-ai-wroclaw`).

---

## Krok 2. Cloudflare — baza D1 i magazyn zdjęć KV

Zaloguj się na https://dash.cloudflare.com (lub załóż darmowe konto).

### 2.1. Baza danych D1
1. W menu po lewej: **Storage & Databases → D1 SQL Database** (czasem: **Workers & Pages → D1**).
2. Kliknij **Create Database** (lub **Create**).
3. *Name:* `strony-ai-wroclaw-db`.
4. Jeśli widzisz opcję lokalizacji (*Location* / *Data location* / *Jurisdiction*), wybierz **Europe / EU** (np. *Western Europe*). Zapamiętaj wybór, bo wpiszesz go w politykę prywatności.
5. Kliknij **Create**.

✅ Widzisz pustą bazę `strony-ai-wroclaw-db`. **Nie musisz uruchamiać żadnego SQL**: tabele i teksty strony utworzą się same przy pierwszym otwarciu strony.

### 2.2. Magazyn zdjęć KV
1. Menu: **Storage & Databases → KV** (czasem: **Workers & Pages → KV**).
2. Kliknij **Create** (lub **Create namespace / Create instance**).
3. *Name:* `strony-ai-wroclaw-media` → **Add / Create**.

✅ Na liście KV widzisz `strony-ai-wroclaw-media`.

---

## Krok 3. Cloudflare Turnstile — ochrona formularza

1. Menu: **Turnstile** (bywa w sekcji *Application security* / *Protect & Connect*) → **Add widget**.
2. *Widget name:* `Formularz Strony AI`.
3. *Hostnames:* `strony-ai-wroclaw.pages.dev` (po podłączeniu domeny dodasz też ją).
4. *Widget mode:* **Managed**. Na pytanie o *pre-clearance* odpowiedz **No**. Kliknij **Create**.
5. Zostaw tę kartę otwartą: **Site Key** i **Secret Key** wkleisz w kroku 6.

---

## Krok 4. Resend — powiadomienia e-mail

Cloudflare ani Gmail nie wysyłają takich powiadomień same z siebie. Do tego służy **Resend** (darmowy plan).

1. Załóż konto na https://resend.com **na adres stronywroclawai@gmail.com**. To ważne: bez własnej domeny Resend wysyła tylko na adres właściciela konta.
2. Potwierdź adres (link w skrzynce).
3. **API Keys → Create API Key** → *Name:* `strony-ai-wroclaw`, *Permission:* **Sending access** → **Add**.
4. Skopiuj klucz (`re_…`). Pokaże się tylko raz, więc wklej go od razu w kroku 6 albo trzymaj w menedżerze haseł.

> Zgłoszenia zapisują się w bazie **niezależnie od e-maili**. Gdy Resend zawiedzie, nic nie zginie: panel pokaże „Powiadomienie nieudane” i przycisk ponownej wysyłki.

---

## Krok 5. Hasło do panelu

Panel ma jedno konto administratora i logujesz się samym hasłem. Samo hasło nigdzie nie jest zapisane. Cloudflare przechowuje tylko jego zaszyfrowany skrót.

1. W rozpakowanym ZIP-ie otwórz dwuklikiem plik `public/admin/generator-hasla.html`.
2. Wpisz dwa razy nowe hasło: co najmniej 12 znaków, np. kilka losowych słów. Zapisz je w menedżerze haseł.
3. Kliknij **Wygeneruj**. Dostaniesz trzy wartości: `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `IP_HASH_SALT`. Zostaw kartę otwartą, wkleisz je w kroku 6.

Generator działa w Twojej przeglądarce, nawet bez internetu, i niczego nie wysyła.

---

## Krok 6. Cloudflare Pages — publikacja i ustawienia

### 6.1. Utworzenie projektu
1. **Workers & Pages → Create** (lub **Create application**).
2. Wybierz zakładkę **Pages**. Jeśli widzisz tylko Workers, kliknij link w stylu *„Looking to deploy Pages? Get started”*. Potem **Import an existing Git repository** / **Connect to Git**.
3. Połącz konto GitHub, wybierz repozytorium `strony-ai-wroclaw` → **Begin setup**.
4. Ustawienia:
   - *Project name:* `strony-ai-wroclaw`;
   - *Production branch:* `main`;
   - *Framework preset:* **None**;
   - *Build command:* **puste**;
   - *Build output directory:* `public`.
5. **Save and Deploy** → poczekaj na „Success”.

### 6.2. Powiązania: baza i zdjęcia
Projekt → **Settings → Bindings** → **Add**:
- **D1 database** → *Variable name:* `DB` → *D1 database:* `strony-ai-wroclaw-db` → **Save**;
- **KV namespace** → *Variable name:* `MEDIA` → *KV namespace:* `strony-ai-wroclaw-media` → **Save**.

Nazwy `DB` i `MEDIA` wpisz dokładnie tak, wielkimi literami.

### 6.3. Zmienne i sekrety
Projekt → **Settings → Variables and Secrets** → **Add**. Dodaj dla środowiska **Production**:

| Nazwa | Wartość | Typ |
|---|---|---|
| `ADMIN_PASSWORD_HASH` | z generatora (krok 5) | **Secret** |
| `SESSION_SECRET` | z generatora (krok 5) | **Secret** |
| `IP_HASH_SALT` | z generatora (krok 5) | **Secret** |
| `TURNSTILE_SITE_KEY` | Site Key (krok 3) | Text |
| `TURNSTILE_SECRET_KEY` | Secret Key (krok 3) | **Secret** |
| `RESEND_API_KEY` | `re_…` (krok 4) | **Secret** |
| `NOTIFY_TO` | `stronywroclawai@gmail.com` | Text |
| `NOTIFY_FROM` | `Strony AI Wrocław <onboarding@resend.dev>` | Text |

`SITE_URL` dodasz dopiero po podłączeniu domeny (krok 8).

### 6.4. Ponowna publikacja (ważne!)
Powiązania i zmienne zaczynają działać dopiero po ponownym wdrożeniu: **Deployments** → przy najnowszym wdrożeniu **⋯** → **Retry deployment**.

✅ Na górze projektu widzisz adres, np. `https://strony-ai-wroclaw.pages.dev`. Jeśli adres jest inny, popraw go w Turnstile (*Hostnames*).

---

## Krok 7. Pierwsze sprawdzenie

1. Otwórz `https://<twój-adres>.pages.dev`.
   ✅ Widzisz stronę, a w sekcji Kontakt formularz z polem weryfikacji Turnstile.
2. Otwórz `https://<twój-adres>.pages.dev/admin/` i zaloguj się hasłem z kroku 5.
   ✅ Widzisz panel z zakładką „Zgłoszenia”.
3. Panel → **Ustawienia → Stan konfiguracji**.
   ✅ Wszystko na zielono poza „SITE_URL”. Kliknij **Wyślij e-mail testowy**.
   ✅ Wiadomość przychodzi na stronywroclawai@gmail.com (sprawdź też folder Spam).
4. Wyślij testowe zgłoszenie z formularza na stronie.
   ✅ Pojawia się komunikat „Dziękuję — zgłoszenie zostało zapisane”, zgłoszenie jest w panelu, a e-mail w skrzynce.
5. Usuń testowe zgłoszenie (otwórz je → **Usuń zgłoszenie**).
6. Uzupełnij politykę prywatności: Panel → **Treści strony → Polityka prywatności** (dane administratora, lokalizacja bazy, okres przechowywania, data).
   ✅ Na stronie `/polityka-prywatnosci` znika żółty baner.

### Gdy coś nie działa
| Objaw | Rozwiązanie |
|---|---|
| Panel pokazuje „Brakuje części ustawień” | Sprawdź **Bindings** (`DB`, `MEDIA`) i sekrety `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, a potem zrób **Retry deployment**. |
| „Nieprawidłowe hasło”, choć jest dobre | Wygeneruj skrót ponownie i wklej `ADMIN_PASSWORD_HASH` bez spacji na początku i końcu, potem **Retry deployment**. |
| „Logowanie zablokowane na 15 minut” | Po 5 błędnych próbach panel blokuje się na 15 minut. Odczekaj. |
| Formularz: „Nie udało się zapisać zgłoszenia” | Brak powiązania `DB` albo nie było **Retry deployment**. |
| Formularz: „…że nie jesteś robotem” | Adres strony nie jest dodany w Turnstile → *Hostnames*, albo klucze są zamienione miejscami. |
| Powiadomienie nieudane, „403 … testing emails” | Konto Resend jest założone na inny adres niż `NOTIFY_TO`. |
| Formularz lub panel zwraca błąd 404/405 | Projekt wgrano przeciągnięciem w panelu Cloudflare zamiast przez GitHub. Wykonaj krok 6.1. |

Szczegóły błędów: projekt → **Deployments** → wdrożenie → **Functions** → **Real-time logs** (*Begin log stream*).

---

## Krok 8. Domena (później)

1. Kup domenę (np. `stronyaiwroclaw.pl`) u dowolnego rejestratora albo w Cloudflare (**Domain Registration**).
2. Projekt Pages → **Custom domains → Set up a custom domain** → wpisz domenę → **Continue**.
   - Domena w Cloudflare: rekordy DNS dodadzą się same.
   - Domena u innego rejestratora: dodaj ją w Cloudflare (darmowy plan) i u rejestratora zmień serwery nazw (*nameservers*) na te podane przez Cloudflare. Dla samej subdomeny wystarczy rekord CNAME.
3. ✅ Po kilku minutach do kilku godzin status zmieni się na **Active**, a strona otworzy się z kłódką (HTTPS).
4. Uzupełnij:
   - Pages → **Variables and Secrets** → `SITE_URL` = `https://twojadomena.pl` (bez ukośnika na końcu) → **Retry deployment**;
   - Turnstile → widżet → **Hostnames** → dodaj domenę.
5. Po ustawieniu `SITE_URL` adres `*.pages.dev` prosi wyszukiwarki o nieindeksowanie.

---

## Krok 9. (Opcjonalnie) Uruchomienie na własnym komputerze

**Sam wygląd strony** obejrzysz bez instalowania czegokolwiek: otwórz dwuklikiem `podglad/podglad-strony.html`.

**Pełna wersja z panelem i bazą:**
1. Zainstaluj **Node.js LTS** z https://nodejs.org (domyślne opcje).
2. Otwórz folder projektu w terminalu.
   - Windows: kliknij pasek adresu folderu, wpisz `cmd`, Enter.
   - macOS: prawy przycisk na folderze → *Nowy terminal w folderze*.
3. Skopiuj `.dev.vars.example` jako `.dev.vars` i wpisz wartości z generatora hasła. Klucze testowe Turnstile, które zawsze przechodzą, są już wpisane.
4. Wpisz `npm run dev`, a na pytanie o instalację `wrangler` odpowiedz `y`.
5. ✅ Pojawi się `Ready on http://localhost:8788`. Strona: http://localhost:8788, panel: http://localhost:8788/admin/. Lokalna baza i zdjęcia zapisują się w ukrytym folderze `.wrangler` na Twoim komputerze.
6. Zatrzymanie: Ctrl+C.

---

## Zmiany w przyszłości
- Teksty, FAQ, branże, portfolio, zdjęcia i nabór zmieniasz w panelu. Zmiany są widoczne od razu.
- Zmiany w kodzie: na GitHubie otwórz plik → ikona ołówka → **Commit changes**. Cloudflare opublikuje nową wersję w ok. minutę.
- **Kopia zapasowa bazy:** Cloudflare D1 pozwala cofnąć bazę do dowolnego momentu z ostatnich dni (funkcja *Time Travel*, na darmowym planie 7 dni). Dodatkowo możesz pobrać pełną kopię do pliku poleceniem `npx wrangler@4 d1 export strony-ai-wroclaw-db --remote --output kopia.sql` (wymaga Node.js i jednorazowego `npx wrangler@4 login`).
