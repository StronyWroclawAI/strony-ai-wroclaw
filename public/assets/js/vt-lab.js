/* =========================================================
   LABORATORIUM PRZEJŚĆ A/B/C — kod tymczasowy (do usunięcia po wyborze wariantu)
   ---------------------------------------------------------
   Włączanie:  dowolny adres + ?transition=a | b | c   (np. /oferta/?transition=b)
   Wyłączanie: ?transition=off  albo przycisk „×” w okienku testowym.
   Wybór trzymany w sessionStorage (tylko ta karta, do jej zamknięcia). Bez wyboru serwis działa
   dokładnie jak dotąd (obecne przejście z style.css).

   Zasada: to NIE jest router. Nawigacja zostaje zwykła (dokumentowa), przejście robi przeglądarka
   (View Transitions między dokumentami, @view-transition w style.css). Ten plik:
   1) ustawia <html data-vt="a|b|c"> — CSS wariantu,
   2) w zdarzeniu „pagereveal” (nowa strona, przed pierwszym malowaniem) dla B/C dokłada dekoracyjną
      warstwę (kurtyna / dwa skrzydła) i typ przejścia „lab-b” / „lab-c”. Bez obsługi API nic się nie dzieje.
   Musi być wczytany w <head> BEZ defer — „pagereveal” przychodzi przed skryptami z defer.
   ========================================================= */
(function () {
  'use strict';
  var KEY = 'vtLab';
  var VALID = { '0': 1, a: 1, b: 1, c: 1 };
  var root = document.documentElement;
  var store = null;
  try { store = window.sessionStorage; } catch (e) { /* tryb prywatny / zablokowane — laboratorium po prostu nieaktywne */ }

  function get() { try { return store && store.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { if (!store) return; if (v) store.setItem(KEY, v); else store.removeItem(KEY); } catch (e) { /* bez zapisu */ } }

  // 1) Parametr ?transition=… → zapis na czas sesji i usunięcie parametru z paska adresu (adres zostaje kanoniczny).
  try {
    var url = new URL(location.href);
    if (url.searchParams.has('transition')) {
      var q = String(url.searchParams.get('transition') || '').toLowerCase();
      set(VALID[q] ? q : null);
      url.searchParams.delete('transition');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
  } catch (e) { /* stara przeglądarka — bez laboratorium */ }

  var variant = get();
  if (!VALID[variant]) return;
  root.setAttribute('data-vt', variant);

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var canType = !!(window.CSS && CSS.supports && CSS.supports('selector(:active-view-transition-type(x))'));

  // Nazwa strony docelowej do kurtyny: deklaracja w <html data-transition-label> (z buildu); bez niej — krótki tytuł.
  function label() {
    var l = root.getAttribute('data-transition-label');
    if (!l) l = (document.title || '').split(/\s+[|—–-]\s+/)[0];
    l = (l || 'Strony AI Wrocław').trim();
    return l.length > 42 ? l.slice(0, 40).replace(/\s+\S*$/, '') + '…' : l;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  // 2) Warstwa dekoracyjna nowej strony (B: kurtyna z nazwą, C: dwa skrzydła). aria-hidden + inert — czytnik
  //    ekranu i klawiatura jej nie widzą; fokus się nie przenosi. Widoczna wyłącznie w trakcie przejścia
  //    (CSS: :active-view-transition-type), po zakończeniu zostaje usunięta.
  function buildVeil(v) {
    var old = document.getElementById('vt-lab-veil');
    if (old) old.remove();
    var box = el('div', 'vt-veil vt-veil--' + v);
    box.id = 'vt-lab-veil';
    box.setAttribute('aria-hidden', 'true');
    box.setAttribute('inert', '');
    if (v === 'b') {
      var inner = el('div', 'vt-veil__inner');
      var parent = root.getAttribute('data-transition-parent');
      if (parent) inner.appendChild(el('span', 'vt-veil__eyebrow', parent));
      inner.appendChild(el('span', 'vt-veil__label', label()));
      box.appendChild(inner);
    } else {
      box.appendChild(el('div', 'vt-door vt-door--l'));
      box.appendChild(el('div', 'vt-door vt-door--r'));
    }
    (document.body || root).appendChild(box);
    return box;
  }

  window.addEventListener('pagereveal', function (e) {
    var vt = e.viewTransition;
    if (!vt || (reduce && reduce.matches)) return;
    if (variant !== 'b' && variant !== 'c') return; // A i „obecne” — sam CSS
    if (!canType || !vt.types) return;              // bez typów przejść: zostaje obecne przenikanie
    var veil = buildVeil(variant);
    vt.types.add('lab-' + variant);
    var done = function () { if (veil.parentNode) veil.remove(); };
    vt.finished.then(done, done);
  });

  // Link do tej samej strony (np. „Oferta” kliknięte na /oferta/) to dla przeglądarki zwykła nawigacja — bez kurtyny
  // z nazwą strony, na której użytkownik już jest. Kotwice (#…) w ogóle nie wywołują przejścia dokumentowego.
  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition || variant === '0' || !e.activation || !e.activation.entry) return;
    try {
      var to = new URL(e.activation.entry.url);
      if (e.activation.navigationType !== 'traverse' && to.pathname === location.pathname && to.search === location.search) e.viewTransition.skipTransition();
    } catch (err) { /* bez zmian */ }
  });

  // 3) Okienko testowe (tylko w trybie laboratorium). Nie jest częścią panelu CMS.
  function panel() {
    if (document.getElementById('vt-lab-panel') || !document.body) return;
    var box = el('aside', 'vt-lab'); // osobny punkt orientacyjny — nie miesza się z treścią strony
    box.id = 'vt-lab-panel';
    box.setAttribute('aria-label', 'Laboratorium przejść (tryb testowy)');
    box.appendChild(el('span', 'vt-lab__title', 'Przejście'));
    [['0', 'Obecne', 'Obecne przejście (bez zmian)'], ['a', 'A', 'A — Premium Fade'], ['b', 'B', 'B — Navy Curtain'], ['c', 'C', 'C — Split Reveal']].forEach(function (o) {
      var b = el('button', 'vt-lab__btn', o[1]);
      b.type = 'button';
      b.title = o[2];
      b.setAttribute('aria-label', o[2]);
      b.setAttribute('aria-pressed', String(o[0] === variant));
      b.addEventListener('click', function () {
        variant = o[0];
        set(variant);
        root.setAttribute('data-vt', variant);
        box.querySelectorAll('.vt-lab__btn').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
      box.appendChild(b);
    });
    var x = el('button', 'vt-lab__close', '×');
    x.type = 'button';
    x.title = 'Wyłącz laboratorium';
    x.setAttribute('aria-label', 'Wyłącz laboratorium przejść');
    x.addEventListener('click', function () { set(null); root.removeAttribute('data-vt'); box.remove(); });
    box.appendChild(x);
    var hint = el('span', 'vt-lab__hint', reduce && reduce.matches ? 'ograniczony ruch: przejścia wyłączone' : 'kliknij dowolny link w serwisie');
    box.appendChild(hint);
    document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', panel);
  else panel();
})();
