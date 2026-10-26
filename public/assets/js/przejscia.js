/* =========================================================
   Przejście między podstronami „Split Reveal” — dwa granatowe skrzydła (wybrany wariant C z laboratorium).
   ---------------------------------------------------------
   To NIE jest router: nawigacja jest zwykła (dokumentowa), przejście robi przeglądarka
   (View Transitions między dokumentami — @view-transition w style.css). Ten plik tylko:
   - w zdarzeniu „pagereveal” (nowa strona, przed pierwszym malowaniem) dokłada dekoracyjną warstwę
     z dwoma skrzydłami i typ przejścia „split” — animację opisuje style.css,
   - pomija przejście przy linku do tej samej strony (np. „Oferta” kliknięte na /oferta/).
   Bez obsługi API, przy ograniczonym ruchu albo bez JavaScriptu strony otwierają się zwyczajnie
   (lub z dotychczasowym krótkim przenikaniem, gdy przeglądarka nie zna typów przejść).
   Musi być wczytany w <head> BEZ defer — „pagereveal” przychodzi przed skryptami z defer.
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var canType = !!(window.CSS && CSS.supports && CSS.supports('selector(:active-view-transition-type(x))'));

  window.addEventListener('pagereveal', function (e) {
    var vt = e.viewTransition;
    if (!vt || !canType || !vt.types || (reduce && reduce.matches)) return;
    var old = document.getElementById('vt-split');
    if (old) old.remove();
    // Warstwa wyłącznie dekoracyjna: aria-hidden + inert (czytnik ekranu i klawiatura jej nie widzą, fokus się nie przenosi).
    // Widoczna tylko w trakcie przejścia (CSS: :active-view-transition-type(split)), po zakończeniu usuwana.
    var box = document.createElement('div');
    box.id = 'vt-split';
    box.className = 'vt-split';
    box.setAttribute('aria-hidden', 'true');
    box.setAttribute('inert', '');
    box.innerHTML = '<div class="vt-door vt-door--l"></div><div class="vt-door vt-door--r"></div>';
    (document.body || root).appendChild(box);
    vt.types.add('split');
    var done = function () { if (box.parentNode) box.remove(); };
    vt.finished.then(done, done);
  });

  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition) return;
    // Typ także na starej stronie — wtedy nagłówek jest zrzucany razem ze stroną (skrzydła przykrywają cały ekran).
    if (canType && e.viewTransition.types && !(reduce && reduce.matches)) e.viewTransition.types.add('split');
    if (!e.activation || !e.activation.entry) return;
    try {
      var to = new URL(e.activation.entry.url);
      if (e.activation.navigationType !== 'traverse' && to.pathname === location.pathname && to.search === location.search) e.viewTransition.skipTransition();
    } catch (err) { /* bez zmian */ }
  });
})();
