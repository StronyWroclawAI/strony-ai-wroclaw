/* Strona wyboru logo i hasła — formularz zapisuje wybór klienta w panelu. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var token = (location.pathname.split('/').filter(Boolean)[1] || '');
  var options = [];
  var sending = false;

  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined || attrs[k] === false) return;
      if (k === 'text') e.textContent = attrs[k]; else if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) e.appendChild(arguments[i]);
    return e;
  }
  function show(view) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (v) { v.hidden = v.getAttribute('data-view') !== view; });
  }
  function fail(msg) { $('[data-error-text]').textContent = msg; show('error'); }
  function fmt(iso) { try { return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return ''; } }
  function label(o) { return 'Opcja ' + o.nr + (o.name ? ' — ' + o.name : ''); }

  document.addEventListener('DOMContentLoaded', function () {
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return fail('Ten adres wymaga indywidualnego linku.');
    fetch('/api/logo/' + token, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) return fail(d.message || 'Nie udało się wczytać propozycji.');
        options = d.options || [];
        $('[data-company]').textContent = d.company_name || 'Twojej firmy';
        document.title = 'Wybór logo — ' + (d.company_name || 'Strony AI Wrocław');
        $('[data-frame]').src = '/logo/' + token + '/propozycje';
        $('[data-open]').href = '/logo/' + token + '/propozycje';
        $('[data-jump]').hidden = false;
        var box = $('[data-options]');
        options.forEach(function (o) {
          var inp = el('input', { type: 'radio', name: 'option', value: String(o.nr) });
          inp.addEventListener('change', drawTaglines);
          var txt = el('span');
          txt.appendChild(el('strong', { text: 'Opcja ' + o.nr }));
          if (o.name) txt.appendChild(el('small', { text: o.name }));
          // miniatura logo (obrazek SVG — bez możliwości uruchamiania skryptów)
          if (o.svg) txt.appendChild(el('img', { class: 'wl-thumb', alt: 'Logo — opcja ' + o.nr, src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(o.svg) }));
          box.appendChild(el('label', { class: 'wl-choice' }, inp, txt));
        });
        if (d.choice) {
          var c = d.choice;
          var r = document.querySelector('input[name=option][value="' + c.option + '"]');
          if (r) r.checked = true;
          drawTaglines(null, c.tagline);
          $('[data-notes]').value = c.notes || '';
          $('[data-accept]').checked = Boolean(c.accepted);
          saved(c);
        } else drawTaglines();
        show('ready');
      })
      .catch(function () { fail('Brak połączenia z serwerem. Sprawdź internet i odśwież stronę.'); });
    $('[data-form]').addEventListener('submit', submit);
  });

  function current() {
    var r = document.querySelector('input[name=option]:checked');
    var nr = r ? Number(r.value) : 0;
    return options.filter(function (o) { return o.nr === nr; })[0] || null;
  }

  /** Hasła zaproponowane dla wybranej opcji (jeśli plik z propozycjami je podał). */
  function drawTaglines(_, preset) {
    var o = current();
    var box = $('[data-taglines]');
    var wrap = $('[data-taglines-box]');
    box.replaceChildren();
    var list = o && o.taglines ? o.taglines : [];
    wrap.hidden = !list.length;
    var matched = false;
    list.forEach(function (t) {
      var inp = el('input', { type: 'radio', name: 'tagline', value: t });
      if (preset && preset === t) { inp.checked = true; matched = true; }
      box.appendChild(el('label', { class: 'wl-choice' }, inp, el('span', { text: '„' + t + '”' })));
    });
    if (typeof preset === 'string') $('[data-tagline-own]').value = matched ? '' : preset;
  }

  function saved(c) {
    var o = options.filter(function (x) { return x.nr === c.option; })[0];
    var box = $('[data-saved]');
    box.replaceChildren();
    box.appendChild(document.createTextNode('Twój wybór jest zapisany (' + fmt(c.chosen_at) + '): ' + (o ? label(o) : 'opcja ' + c.option) + (c.tagline ? ', hasło: „' + c.tagline + '”' : '') + '. Dziękuję!'));
    box.appendChild(el('p', { text: 'Odezwę się z dopracowaną wersją. Jeśli chcesz coś zmienić, popraw formularz i zapisz ponownie.' }));
    box.hidden = false;
  }

  function submit(e) {
    e.preventDefault();
    if (sending) return;
    var alertBox = $('[data-alert]');
    alertBox.hidden = true;
    var o = current();
    $('[data-err-option]').textContent = o ? '' : 'Zaznacz jedną z opcji.';
    if (!o) { var first = document.querySelector('input[name=option]'); if (first) first.focus(); return; }
    var own = $('[data-tagline-own]').value.trim();
    var picked = document.querySelector('input[name=tagline]:checked');
    var payload = { option: o.nr, tagline: own || (picked ? picked.value : ''), notes: $('[data-notes]').value.trim(), accepted: $('[data-accept]').checked };
    var btn = $('[data-submit]');
    sending = true; btn.disabled = true; btn.textContent = 'Zapisuję…';
    var done = function () { sending = false; btn.disabled = false; btn.textContent = 'Zapisz mój wybór'; };
    fetch('/api/logo/' + token, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Logo': '1' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        done();
        if (!d.ok) { alertBox.textContent = d.message || 'Nie udało się zapisać wyboru.'; alertBox.hidden = false; return; }
        payload.chosen_at = d.chosen_at;
        saved(payload);
        $('[data-saved]').scrollIntoView({ block: 'center' });
        $('[data-saved]').setAttribute('tabindex', '-1');
        $('[data-saved]').focus();
      })
      .catch(function () { done(); alertBox.textContent = 'Brak połączenia z serwerem. Spróbuj ponownie za chwilę.'; alertBox.hidden = false; });
  }
})();
