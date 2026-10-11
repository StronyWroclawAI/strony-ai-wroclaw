/* Wyszukiwarka branży (combobox) — zamienia zwykłą listę <select> na pole, w którym wystarczy wpisać
   pierwsze litery, np. „fryz” → „Salon fryzjerski”. Oryginalny <select> zostaje w formularzu (ukryty)
   i to on jest wysyłany, więc bez JavaScriptu formularz działa jak dawniej.
   Używane na stronie (formularz zgłoszeniowy) i w panelu (ręczne dodawanie i edycja zgłoszenia). */
(function () {
  'use strict';
  var uid = 0;
  var CSS =
    '.ic{position:relative}' +
    '.ic__input{width:100%;padding-right:40px!important}' +
    '.ic__toggle{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;background:transparent;cursor:pointer;color:inherit;border-radius:8px;display:grid;place-items:center}' +
    '.ic__toggle::before{content:"";width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-2px) rotate(45deg)}' +
    '.ic__list{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 4px);max-height:min(300px,45vh);overflow:auto;margin:0;padding:6px;list-style:none;background:#fff;color:#14213a;border:1.5px solid #c5cedb;border-radius:12px;box-shadow:0 18px 40px -18px rgba(15,37,68,.45);text-align:left}' +
    '.ic__list[hidden]{display:none}' +
    '.ic__group{padding:8px 10px 4px;font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5b6b82}' +
    '.ic__opt{padding:9px 10px;border-radius:8px;cursor:pointer;font-size:.9375rem;line-height:1.35}' +
    '.ic__opt[aria-selected="true"]{font-weight:700}' +
    '.ic__opt.is-active{background:#e8f0fc}' +
    '.ic__opt mark{background:#ffe7b3;color:inherit;border-radius:3px;padding:0 1px}' +
    '.ic__empty{padding:10px;font-size:.875rem;color:#5b6b82}' +
    '.ic__sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}';

  function injectCss() {
    if (document.getElementById('ic-css')) return;
    var st = document.createElement('style');
    st.id = 'ic-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function norm(t) {
    return String(t || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /**
   * select — lista <select> z branżami (z grupami optgroup), opts.other — pole „Jaka to branża?” (opcjonalnie):
   * gdy wpisanej branży nie ma na liście, wybieramy „Inna” i przenosimy wpisany tekst do tego pola.
   */
  function enhance(select, opts) {
    if (!select || select.dataset.icReady || !select.parentNode) return null;
    opts = opts || {};
    injectCss();
    select.dataset.icReady = '1';
    var id = 'ic' + ++uid;
    var items = [];
    var group = '';
    Array.prototype.forEach.call(select.querySelectorAll('option, optgroup'), function (n) {
      if (n.tagName === 'OPTGROUP') { group = n.label; return; }
      if (!n.value) return;
      var inGroup = n.parentNode.tagName === 'OPTGROUP';
      var label = n.value === 'Inna' ? 'Inna branża (wpiszę ją sama/sam)' : n.textContent;
      items.push({ v: n.value, l: label, g: inGroup ? n.parentNode.label : '', s: norm(label + ' ' + (n.getAttribute('data-k') || '') + ' ' + (inGroup ? n.parentNode.label : '')) });
    });

    var wrap = document.createElement('div');
    wrap.className = 'ic';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'ic__input ' + (opts.inputClass || '');
    input.id = select.id ? select.id + '-szukaj' : id + '-input';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', id + '-list');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.placeholder = opts.placeholder || 'Wpisz, np. fryzjer…';
    if (select.required) input.setAttribute('aria-required', 'true');
    var desc = select.getAttribute('aria-describedby');
    if (desc) input.setAttribute('aria-describedby', desc);
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ic__toggle';
    toggle.tabIndex = -1;
    toggle.setAttribute('aria-label', 'Pokaż listę branż');
    var list = document.createElement('ul');
    list.className = 'ic__list';
    list.id = id + '-list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    var live = document.createElement('div');
    live.className = 'ic__sr';
    live.setAttribute('aria-live', 'polite');

    // etykieta wskazuje teraz pole wyszukiwania
    if (select.id) {
      var lab = document.querySelector('label[for="' + select.id + '"]');
      if (lab) { lab.setAttribute('for', input.id); lab.id = lab.id || input.id + '-label'; list.setAttribute('aria-labelledby', lab.id); }
    }
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(input);
    wrap.appendChild(toggle);
    wrap.appendChild(list);
    wrap.appendChild(live);
    wrap.appendChild(select);
    select.hidden = true;
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    // błędy walidacji ustawiane na <select> pokazujemy na polu wyszukiwania
    select.focus = function () { input.focus(); };
    new MutationObserver(function () {
      var inv = select.getAttribute('aria-invalid');
      if (inv) input.setAttribute('aria-invalid', inv); else input.removeAttribute('aria-invalid');
    }).observe(select, { attributes: true, attributeFilter: ['aria-invalid'] });

    var shown = [];
    var active = -1;
    function labelOf(v) {
      for (var i = 0; i < items.length; i++) if (items[i].v === v) return v === 'Inna' ? 'Inna branża' : items[i].l;
      return '';
    }
    function syncFromSelect() { input.value = labelOf(select.value); }
    function highlight(label, q) {
      if (!q) return esc(label);
      var n = norm(label);
      var i = n.indexOf(q);
      if (i < 0) return esc(label);
      return esc(label.slice(0, i)) + '<mark>' + esc(label.slice(i, i + q.length)) + '</mark>' + esc(label.slice(i + q.length));
    }
    function render(query) {
      var q = norm(query).trim();
      var words = q.split(/\s+/).filter(Boolean);
      shown = items.filter(function (it) {
        if (!words.length) return true;
        if (it.v === 'Inna') return true;
        return words.every(function (w) { return it.s.indexOf(w) !== -1; });
      });
      // dopasowania od początku słowa wyżej
      if (words.length) {
        var first = words[0];
        shown.sort(function (a, b) {
          var sa = a.v === 'Inna' ? 3 : norm(a.l).indexOf(first) === 0 ? 0 : new RegExp('(^|\\s)' + first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(norm(a.l)) ? 1 : 2;
          var sb = b.v === 'Inna' ? 3 : norm(b.l).indexOf(first) === 0 ? 0 : new RegExp('(^|\\s)' + first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(norm(b.l)) ? 1 : 2;
          return sa - sb;
        });
      }
      active = words.length && shown.length && (shown[0].v !== 'Inna' || norm(shown[0].l).indexOf(q) === 0) ? 0 : -1;
      var html = '';
      var lastG = null;
      shown.forEach(function (it, i) {
        if (!words.length && it.g !== lastG && it.g) { html += '<li class="ic__group" role="presentation">' + esc(it.g) + '</li>'; }
        lastG = it.g;
        html += '<li class="ic__opt" role="option" id="' + id + '-o' + i + '" data-i="' + i + '" aria-selected="' + (it.v === select.value) + '">' + highlight(it.l, words[0] || '') + '</li>';
      });
      if (shown.length === 1 && words.length && active < 0) html = '<li class="ic__empty" role="presentation">Nie ma takiej branży na liście — wybierz „Inna branża” i wpisz ją.</li>' + html;
      list.innerHTML = html;
      paintActive();
      live.textContent = words.length ? (shown.length - 1 > 0 ? 'Pasujące branże: ' + (shown.length - 1) + '. Strzałki w dół i w górę, Enter wybiera.' : 'Brak pasujących branż.') : '';
    }
    function paintActive() {
      Array.prototype.forEach.call(list.querySelectorAll('.ic__opt'), function (li) {
        var on = Number(li.getAttribute('data-i')) === active;
        li.classList.toggle('is-active', on);
        if (on) li.scrollIntoView({ block: 'nearest' });
      });
      if (active >= 0) input.setAttribute('aria-activedescendant', id + '-o' + active);
      else input.removeAttribute('aria-activedescendant');
    }
    function open(query) {
      render(query);
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
    function choose(it) {
      var changed = select.value !== it.v;
      select.value = it.v;
      input.value = labelOf(it.v);
      close();
      if (changed) {
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (it.v === 'Inna' && opts.other) setTimeout(function () { opts.other.focus(); }, 0);
    }
    /** Po wyjściu z pola: dokładne dopasowanie → wybór; nieznana branża → „Inna” + wpisany tekst. */
    function commit() {
      var t = input.value.trim();
      if (!t) {
        if (select.value) { select.value = ''; select.dispatchEvent(new Event('change', { bubbles: true })); }
        return;
      }
      if (t === labelOf(select.value)) return;
      var n = norm(t);
      var exact = items.filter(function (it) { return norm(it.l) === n; })[0];
      var matches = items.filter(function (it) { return it.v !== 'Inna' && it.s.indexOf(n) !== -1; });
      if (exact) return choose(exact);
      if (matches.length === 1) return choose(matches[0]);
      var inna = items.filter(function (it) { return it.v === 'Inna'; })[0];
      if (inna && opts.other && !matches.length) {
        if (!opts.other.value.trim()) opts.other.value = t.slice(0, 90);
        choose(inna);
        return;
      }
      syncFromSelect();
    }

    input.addEventListener('focus', function () { open(input.value === labelOf(select.value) ? '' : input.value); });
    input.addEventListener('click', function () { if (list.hidden) open(''); });
    input.addEventListener('input', function () { open(input.value); if (input.getAttribute('aria-invalid')) select.dispatchEvent(new Event('input', { bubbles: true })); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (list.hidden) open('');
        var max = shown.length - 1;
        active = e.key === 'ArrowDown' ? (active >= max ? 0 : active + 1) : active <= 0 ? max : active - 1;
        paintActive();
      } else if (e.key === 'Enter') {
        if (!list.hidden && active >= 0 && shown[active]) { e.preventDefault(); choose(shown[active]); }
      } else if (e.key === 'Escape') {
        if (!list.hidden) { e.preventDefault(); close(); syncFromSelect(); }
      } else if (e.key === 'Tab') {
        if (!list.hidden && active >= 0 && shown[active] && input.value.trim() && input.value !== labelOf(select.value)) choose(shown[active]);
        close();
      }
    });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) {
      var li = e.target.closest('.ic__opt');
      if (li) choose(shown[Number(li.getAttribute('data-i'))]);
    });
    toggle.addEventListener('mousedown', function (e) { e.preventDefault(); });
    toggle.addEventListener('click', function () {
      if (list.hidden) { input.focus(); open(''); } else close();
    });
    input.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== input) { close(); commit(); } }, 120); });
    select.addEventListener('change', function () { if (document.activeElement !== input) syncFromSelect(); });
    if (select.form) select.form.addEventListener('reset', function () { setTimeout(syncFromSelect, 0); });
    syncFromSelect();
    return { input: input, wrap: wrap, refresh: syncFromSelect };
  }

  window.IndustryCombo = { enhance: enhance };
})();
