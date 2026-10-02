/* Brief projektowy — formularz dla klienta (kreator krok po kroku z autozapisem). */
(function () {
  'use strict';

  var S, H;
  var DEMO = Boolean(window.BRIEF_DEMO);
  var ADMIN = null; // { id } — administrator poprawia odpowiedzi klienta
  var token = '';
  var answers = {};
  var visited = {};
  var current = 0;
  var locked = false;
  var saveTimer = null;
  var pending = false;
  var saving = false;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, '');
      else e.setAttribute(k, String(v));
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) e.appendChild(x instanceof Node ? x : document.createTextNode(String(x))); });
      else e.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return e;
  }

  function show(view) {
    $$('[data-view]').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view; });
    window.scrollTo(0, 0);
  }

  function setSaveStatus(text, isError) {
    var s = $('[data-save-status]');
    s.textContent = text;
    s.classList.toggle('is-error', Boolean(isError));
  }

  function time() {
    return new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  }

  /* ---------- Start ---------- */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    S = window.BRIEF_SCHEMA;
    if (!S) return fail('Nie udało się wczytać formularza. Odśwież stronę.');
    H = S.helpers;
    bindStatic();
    var sc = $('[data-steps-count]');
    if (sc) sc.textContent = S.steps.length + ' krótkich kroków';

    var parts = location.pathname.split('/').filter(Boolean);
    token = parts[0] === 'brief' ? parts[1] || '' : '';
    if (token === 'podglad') DEMO = true;

    if (DEMO) {
      document.body.insertBefore(el('div', { class: 'bf-demo-bar', role: 'note', text: 'Tryb podglądu — tak wygląda brief dla klienta. Odpowiedzi nie są nigdzie wysyłane ani zapisywane.' }), document.body.firstChild);
      setSaveStatus('Tryb podglądu');
      applyDefaults();
      $('[data-company]').textContent = 'Twojej firmy';
      show('welcome');
      return;
    }

    if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return fail('Ten adres wymaga indywidualnego linku do briefu.');

    var qs = new URLSearchParams(location.search);
    if (qs.get('edycja') !== null && /^[0-9a-f-]{36}$/i.test(qs.get('id') || '')) return initAdmin(qs.get('id'), Number(qs.get('edycja')) || 0);

    fetch('/api/brief/' + token, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) return fail(d.message || 'Nie udało się wczytać briefu.');
        answers = d.answers || {};
        applyDefaults();
        guessIndustry();
        var name = answers.company_name || d.company_name;
        if (!answers.company_name && d.company_name) answers.company_name = d.company_name;
        $('[data-company]').textContent = name || 'Twojej firmy';
        document.title = 'Brief projektowy — ' + (name || 'Strony AI Wrocław');
        if (d.status === 'wyslany') {
          locked = true;
          setSaveStatus('Brief wysłany ' + formatDate(d.submitted_at));
          showSummary();
          return;
        }
        if (Object.keys(d.answers || {}).length > 1) {
          $('[data-start]').textContent = 'Kontynuuj wypełnianie';
          setSaveStatus('Wczytano zapisane odpowiedzi');
        }
        show('welcome');
      })
      .catch(function () { fail('Brak połączenia z serwerem. Sprawdź internet i odśwież stronę.'); });
  }

  /** Tryb administratora: te same pytania, zapis przez API panelu, bez blokady i bez zmiany statusu. */
  function initAdmin(id, step) {
    ADMIN = { id: id };
    fetch('/api/admin/briefs/' + id, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
      .then(function (x) {
        if (x.status === 401) return fail('Zaloguj się do panelu administratora, a potem otwórz ten link ponownie.');
        if (!x.d.ok || !x.d.brief || x.d.brief.token !== token) return fail('Nie znaleziono briefu do edycji.');
        answers = x.d.brief.answers || {};
        applyDefaults();
        var name = answers.company_name || x.d.brief.company_name || '';
        document.title = 'Edycja briefu — ' + name;
        document.body.insertBefore(el('div', { class: 'bf-demo-bar bf-admin-bar', role: 'note' },
          'Tryb administratora — poprawiasz odpowiedzi klienta' + (name ? ' (' + name + ')' : '') + '. Zmiany zapisują się automatycznie, klient nie dostaje powiadomienia. ',
          el('a', { href: '/admin/#brief/' + id, text: 'Wróć do panelu' })), document.body.firstChild);
        setSaveStatus('Tryb administratora');
        S.steps.forEach(function (_, i) { visited[i] = true; });
        buildStepsNav();
        goTo(Math.max(0, Math.min(S.steps.length - 1, step)));
      })
      .catch(function () { fail('Brak połączenia z serwerem. Sprawdź internet i odśwież stronę.'); });
  }

  function fail(msg) {
    $('[data-error-text]').textContent = msg;
    show('error');
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return '';
    }
  }

  /** Branża ze zgłoszenia (pole tekstowe) → wstępny wybór z listy. Klient może go zmienić. */
  function guessIndustry() {
    if (answers.industry_type || !answers.industry || !H.guessIndustry) return;
    var g = H.guessIndustry(answers.industry);
    if (g) { answers.industry_type = g; syncIndustryLabel(); }
  }

  /** Czytelna nazwa branży — używana w powiadomieniu e-mail. */
  function syncIndustryLabel() {
    var l = H.industryLabel ? H.industryLabel(answers) : '';
    if (l) answers.industry_label = l.slice(0, 150);
    else delete answers.industry_label;
  }

  function applyDefaults() {
    S.steps.forEach(function (st) {
      st.fields.forEach(function (f) {
        if (f.default && answers[f.id] === undefined) answers[f.id] = f.default.slice ? f.default.slice() : f.default;
      });
    });
  }

  function bindStatic() {
    $('[data-start]').addEventListener('click', function () {
      buildStepsNav();
      goTo(firstIncompleteStep());
    });
    $('[data-prev]').addEventListener('click', function () { goTo(current - 1); });
    $('[data-next]').addEventListener('click', next);
    $('[data-back-edit]').addEventListener('click', function () { buildStepsNav(); goTo(current); });
    $('[data-submit]').addEventListener('click', submit);
    $('[data-print]').addEventListener('click', function () { window.print(); });
    $('[data-show-copy]').addEventListener('click', function () { showSummary(); });
    window.addEventListener('beforeunload', function (e) {
      if (pending && !DEMO) {
        flushSave(true);
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  function firstIncompleteStep() {
    var miss = H.missingRequired(answers);
    if (!miss.length) return 0;
    return miss[0].step;
  }

  /* ---------- Nawigacja ---------- */
  function buildStepsNav() {
    var list = $('[data-steps-list]');
    list.replaceChildren();
    S.steps.forEach(function (st, i) {
      list.appendChild(
        el('li', null,
          el('button', { type: 'button', 'data-step': i, onclick: function () { goTo(i); } },
            el('span', { class: 'n', 'aria-hidden': 'true', text: String(i + 1) }),
            el('span', { class: 't', text: st.title })
          )
        )
      );
    });
  }

  function refreshStepsNav() {
    var miss = H.missingRequired(answers);
    $$('[data-step]').forEach(function (b) {
      var i = Number(b.getAttribute('data-step'));
      var hasMissing = miss.some(function (m) { return m.step === i; });
      b.parentNode.classList.toggle('is-done', Boolean(visited[i]) && !hasMissing);
      b.parentNode.classList.toggle('is-incomplete', Boolean(visited[i]) && hasMissing);
      if (i === current) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      var label = S.steps[i].title + (visited[i] ? (hasMissing ? ' — brakuje wymaganych odpowiedzi' : ' — uzupełniony') : '');
      b.setAttribute('aria-label', 'Krok ' + (i + 1) + ': ' + label);
    });
    var done = Object.keys(visited).length;
    $('[data-progress-bar]').style.width = Math.round((done / (S.steps.length + 1)) * 100) + '%';
  }

  function goTo(i) {
    if (i < 0) { show('welcome'); return; }
    if (i >= S.steps.length) { showSummary(); return; }
    if (visited[current] !== undefined || current !== i) visited[current] = true;
    current = i;
    renderStep();
    show('wizard');
    refreshStepsNav();
    var t = $('[data-step-title]');
    t.focus({ preventScroll: true });
  }

  function next() {
    var errs = validateStep(current);
    visited[current] = true;
    if (errs.length) {
      showStepAlert(errs);
      return;
    }
    flushSave();
    goTo(current + 1);
  }

  /* ---------- Renderowanie kroku ---------- */
  function renderStep() {
    var st = S.steps[current];
    $('[data-step-no]').textContent = 'Krok ' + (current + 1) + ' z ' + S.steps.length;
    $('[data-step-title]').textContent = st.title;
    $('[data-step-intro]').textContent = H.stepIntro ? H.stepIntro(st, answers) : st.intro || '';
    $('[data-step-alert]').hidden = true;
    var form = $('[data-step-form]');
    form.replaceChildren();
    st.fields.forEach(function (f) { if (!f.legacy) form.appendChild(renderField(f)); });
    updateVisibility();
    $('[data-prev]').textContent = current === 0 ? '← Wprowadzenie' : '← Wstecz';
    $('[data-next]').textContent = current === S.steps.length - 1 ? 'Podsumowanie →' : 'Dalej →';
  }

  function fieldLabelText(f) {
    return f.label + (f.required ? ' *' : '');
  }

  function renderField(f) {
    var id = 'f_' + f.id;
    var errId = 'e_' + f.id;
    var hintId = f.hint ? 'h_' + f.id : null;
    var describedBy = [hintId, errId].filter(Boolean).join(' ');
    var wrap;

    if (f.type === 'info') {
      return el('div', { class: 'bf-field bf-info', 'data-field': f.id, role: 'note' }, el('span', { class: 'bf-info__i', 'aria-hidden': 'true', text: 'i' }), el('p', { text: f.text }));
    }

    if (f.type === 'select') {
      wrap = el('div', { class: 'bf-field', 'data-field': f.id });
      wrap.appendChild(el('label', { class: 'bf-label', for: id }, f.label, f.required ? el('span', { class: 'req', 'aria-hidden': 'true', text: ' *' }) : null));
      if (f.hint) wrap.appendChild(el('p', { class: 'bf-hint', id: hintId, text: f.hint }));
      var sel = el('select', { id: id, class: 'bf-select', 'aria-describedby': describedBy, required: Boolean(f.required) }, el('option', { value: '', text: f.placeholder || '— wybierz —' }));
      f.groups.forEach(function (g) {
        sel.appendChild(el('optgroup', { label: g.l }, g.items.map(function (o) { return el('option', { value: o.v, text: o.l }); })));
      });
      sel.value = answers[f.id] || '';
      var chosen = el('p', { class: 'bf-chosen', 'aria-live': 'polite' });
      var updChosen = function () {
        var i = H.industryOf && f.id === 'industry_type' ? H.industryOf(answers) : null;
        chosen.textContent = i && i.v !== 'inna' ? 'Krok 2 dopasuję do branży: ' + i.l + '.' : '';
        chosen.hidden = !chosen.textContent;
      };
      sel.addEventListener('change', function () {
        setAnswer(f.id, sel.value);
        updChosen();
        if (sel.getAttribute('aria-invalid')) { sel.removeAttribute('aria-invalid'); $('#' + errId).textContent = ''; }
      });
      wrap.appendChild(sel);
      updChosen();
      wrap.appendChild(chosen);
      wrap.appendChild(el('p', { class: 'bf-err', id: errId, 'aria-live': 'polite' }));
      return wrap;
    }

    if (f.type === 'radio' || f.type === 'checkbox') {
      wrap = el('fieldset', { class: 'bf-field', 'data-field': f.id, 'aria-describedby': describedBy });
      wrap.appendChild(el('legend', null, f.label, f.required ? el('span', { class: 'req', 'aria-hidden': 'true', text: ' *' }) : null, f.required ? el('span', { class: 'visually-hidden', text: ' (wymagane)' }) : null));
      if (f.hint) wrap.appendChild(el('p', { class: 'bf-hint', id: hintId, text: f.hint }));
      var box = el('div', { class: 'bf-options' });
      var groups = f.groups || [{ items: f.options }];
      groups.forEach(function (g) {
        var items = g.items.filter(function (o) { return !H.optionVisible || H.optionVisible(o, answers); });
        if (!items.length) return;
        if (g.l) box.appendChild(el('p', { class: 'bf-group-title', text: g.l }));
        items.forEach(function (o) { box.appendChild(f.layouts ? renderLayoutOption(f, o) : renderOption(f, o)); });
      });
      if (f.layouts) {
        box.classList.add('bf-options--layouts');
        var recs = H.recommendedLayouts(answers).map(function (v) { var l = H.layoutById(v); return l ? l.l : ''; }).filter(Boolean);
        if (recs.length) wrap.appendChild(el('p', { class: 'bf-layout-rec' }, el('strong', { text: 'Dla branży „' + H.industryLabel(answers) + '” polecam: ' }), recs.join(' lub ') + '.'));
      }
      if (f.other) {
        if (f.type === 'radio') {
          box.appendChild(renderOption(f, { v: '__other', l: 'Inne' }));
          var oin = el('input', { type: 'text', id: id + '__other', maxlength: '500', 'aria-label': f.label + ' — inne (opisz)', placeholder: 'Opisz…' });
          oin.value = answers[f.id + '__other'] || '';
          oin.addEventListener('input', function () { setAnswer(f.id + '__other', oin.value); });
          box.appendChild(el('div', { class: 'bf-other', 'data-other-for': f.id, hidden: answers[f.id] !== '__other' }, oin));
        } else {
          var oin2 = el('input', { type: 'text', id: id + '__other', maxlength: '500', placeholder: 'np. coś, czego nie ma na liście' });
          oin2.value = answers[f.id + '__other'] || '';
          oin2.addEventListener('input', function () { setAnswer(f.id + '__other', oin2.value); });
          box.appendChild(el('div', { class: 'bf-other' }, el('label', { for: id + '__other', text: 'Inne / dopisz własne:' }), oin2));
        }
      }
      wrap.appendChild(box);
      wrap.appendChild(el('p', { class: 'bf-err', id: errId, 'aria-live': 'polite' }));
      return wrap;
    }

    wrap = el('div', { class: 'bf-field', 'data-field': f.id });
    wrap.appendChild(el('label', { class: 'bf-label', for: id }, f.label, f.required ? el('span', { class: 'req', 'aria-hidden': 'true', text: ' *' }) : null));
    if (f.hint) wrap.appendChild(el('p', { class: 'bf-hint', id: hintId, text: f.hint }));
    var input;
    if (f.type === 'textarea') {
      input = el('textarea', { id: id, rows: '4', maxlength: String(f.max || 3000), placeholder: f.placeholder || null, 'aria-describedby': describedBy, required: Boolean(f.required) });
    } else {
      var t = { email: 'email', tel: 'tel', url: 'url' }[f.type] || 'text';
      input = el('input', {
        type: t, id: id, maxlength: String(f.max || 300), placeholder: f.placeholder || (t === 'url' ? 'https://' : null), 'aria-describedby': describedBy, required: Boolean(f.required),
        autocomplete: { contact_name: 'name', contact_email: 'email', contact_phone: 'tel', company_name: 'organization' }[f.id] || null,
        inputmode: t === 'email' ? 'email' : t === 'tel' ? 'tel' : t === 'url' ? 'url' : null,
      });
    }
    input.value = answers[f.id] || '';
    input.addEventListener('input', function () {
      setAnswer(f.id, input.value);
      if (input.getAttribute('aria-invalid')) { input.removeAttribute('aria-invalid'); $('#' + errId).textContent = ''; }
    });
    wrap.appendChild(input);
    if (f.type === 'textarea' && f.max) {
      var counter = el('div', { class: 'bf-counter', 'aria-hidden': 'true' });
      var upd = function () { counter.textContent = input.value.length + ' / ' + f.max; };
      input.addEventListener('input', upd);
      upd();
      wrap.appendChild(counter);
    }
    wrap.appendChild(el('p', { class: 'bf-err', id: errId, 'aria-live': 'polite' }));
    return wrap;
  }

  function renderOption(f, o) {
    var type = f.type;
    var val = answers[f.id];
    var checked = type === 'checkbox' ? Array.isArray(val) && val.indexOf(o.v) !== -1 : val === o.v;
    var input = el('input', { type: type, name: f.id, value: o.v, checked: checked });
    input.checked = checked;
    input.addEventListener('change', function () {
      if (type === 'checkbox') {
        var arr = Array.isArray(answers[f.id]) ? answers[f.id].slice() : [];
        if (input.checked) { if (arr.indexOf(o.v) === -1) arr.push(o.v); }
        else arr = arr.filter(function (x) { return x !== o.v; });
        setAnswer(f.id, arr);
      } else {
        setAnswer(f.id, o.v);
        var other = $('[data-other-for="' + f.id + '"]');
        if (other) {
          other.hidden = o.v !== '__other';
          if (o.v === '__other') other.querySelector('input').focus();
        }
      }
      var fs = input.closest('.bf-field');
      if (fs) { fs.classList.remove('is-invalid'); var e = fs.querySelector('.bf-err'); if (e) e.textContent = ''; }
    });
    return el('label', { class: 'bf-opt bf-opt--' + type },
      input,
      el('span', { class: 'bf-mark', 'aria-hidden': 'true' }),
      el('span', { class: 'bf-opt__text' },
        el('span', { class: 'bf-opt__l', text: o.l }, H.isRecommended && H.isRecommended(f, o, answers) ? el('span', { class: 'bf-rec', text: 'Polecane' }) : null),
        o.h ? el('span', { class: 'bf-opt__h', text: o.h }) : null)
    );
  }

  /* ---------- Układy strony: miniatury i okienko z opisem ---------- */
  var WIRES = {
    // [x, y, szer., wys., rodzaj] — rodzaj: n=pasek menu, i=zdjęcie, b=blok, t=linia tekstu, c=przycisk
    grid: [[8, 8, 144, 10, 'n'], [8, 26, 44, 34, 'i'], [58, 26, 44, 34, 'i'], [108, 26, 44, 34, 'i'], [8, 66, 44, 34, 'i'], [58, 66, 44, 34, 'i'], [108, 66, 44, 34, 'i']],
    f: [[8, 8, 144, 10, 'n'], [8, 26, 144, 9, 'b'], [8, 42, 96, 5, 't'], [8, 51, 84, 5, 't'], [8, 64, 70, 7, 'b'], [8, 76, 64, 5, 't'], [8, 85, 52, 5, 't'], [8, 94, 40, 5, 't'], [116, 42, 36, 58, 'i']],
    z: [[8, 8, 30, 10, 'b'], [122, 8, 30, 10, 'c'], [8, 28, 62, 6, 't'], [8, 38, 50, 5, 't'], [84, 26, 68, 30, 'i'], [8, 64, 68, 30, 'i'], [90, 66, 62, 6, 't'], [90, 76, 48, 5, 't'], [118, 88, 34, 10, 'c']],
    onepage: [[52, 4, 56, 102, 'p'], [56, 8, 48, 6, 'n'], [56, 18, 48, 20, 'i'], [56, 42, 48, 14, 'b'], [56, 60, 48, 14, 'b'], [56, 78, 48, 12, 'i'], [56, 94, 48, 8, 'b'], [116, 20, 4, 70, 's']],
    immersive: [[8, 8, 144, 94, 'i'], [14, 14, 132, 7, 'n'], [38, 46, 84, 9, 'w'], [50, 60, 60, 5, 'w'], [62, 74, 36, 11, 'c']],
    split: [[8, 8, 70, 94, 'p'], [82, 8, 70, 94, 'i'], [16, 30, 50, 8, 'b'], [16, 44, 54, 5, 't'], [16, 53, 44, 5, 't'], [16, 68, 32, 11, 'c']],
    bento: [[8, 8, 84, 56, 'i'], [98, 8, 54, 25, 'b'], [98, 39, 54, 25, 'c2'], [8, 70, 40, 32, 'b'], [54, 70, 98, 32, 'i2']],
    auto: [[8, 8, 44, 30, 'i'], [58, 8, 44, 30, 'b'], [108, 8, 44, 30, 'i2'], [8, 72, 44, 30, 'b'], [58, 72, 44, 30, 'i'], [108, 72, 44, 30, 'b']],
  };
  var WIRE_FILL = { n: '#142e50', i: '#8fb3e8', i2: '#c9bdfb', b: '#dfe6f0', t: '#c5cedb', c: '#ff6b5a', c2: '#ffd98a', p: '#ffffff', w: '#ffffff', s: '#c5cedb' };

  function wire(v, label) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 160 110');
    svg.setAttribute('class', 'bf-wire');
    if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
    var bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('width', '160'); bg.setAttribute('height', '110'); bg.setAttribute('rx', '8'); bg.setAttribute('fill', '#f2f5fa');
    svg.appendChild(bg);
    (WIRES[v] || []).forEach(function (r) {
      var e = document.createElementNS(NS, 'rect');
      e.setAttribute('x', r[0]); e.setAttribute('y', r[1]); e.setAttribute('width', r[2]); e.setAttribute('height', r[3]);
      e.setAttribute('rx', r[4] === 't' || r[4] === 'w' || r[4] === 's' ? 2.5 : 3.5);
      e.setAttribute('fill', WIRE_FILL[r[4]] || '#dfe6f0');
      if (r[4] === 'p') { e.setAttribute('stroke', '#c5cedb'); e.setAttribute('stroke-width', '1'); }
      svg.appendChild(e);
    });
    if (v === 'auto') {
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', '80'); t.setAttribute('y', '63'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '22'); t.setAttribute('font-weight', '800'); t.setAttribute('fill', '#142e50');
      t.textContent = '✓ dobiorę';
      svg.appendChild(t);
    }
    if (v === 'z') {
      var pth = document.createElementNS(NS, 'path');
      pth.setAttribute('d', 'M24 22 H136 L24 60 H136'); pth.setAttribute('fill', 'none'); pth.setAttribute('stroke', '#ff6b5a'); pth.setAttribute('stroke-width', '1.6'); pth.setAttribute('stroke-dasharray', '4 3'); pth.setAttribute('opacity', '.8');
      svg.appendChild(pth);
    }
    return svg;
  }

  function renderLayoutOption(f, o) {
    var opt = renderOption(f, o);
    opt.classList.add('bf-opt--layout');
    opt.insertBefore(wire(o.v), opt.querySelector('.bf-opt__text'));
    var box = el('div', { class: 'bf-layout' }, opt);
    if (o.how) box.appendChild(el('button', { type: 'button', class: 'bf-info-btn', 'aria-label': 'Jak wygląda: ' + o.l, title: 'Zobacz, jak wygląda ten układ', text: 'i', onclick: function (e) { openLayoutInfo(f, o, e.currentTarget); } }));
    return box;
  }

  function openLayoutInfo(f, o, opener) {
    var old = document.querySelector('.bf-dialog');
    if (old) old.remove();
    var rec = H.isRecommended(f, o, answers);
    var d = el('dialog', { class: 'bf-dialog', 'aria-labelledby': 'bf-dialog-title' },
      el('button', { type: 'button', class: 'bf-dialog__x', 'aria-label': 'Zamknij', text: '×', onclick: function () { d.close(); } }),
      wire(o.v, 'Schemat układu: ' + o.l),
      el('h2', { id: 'bf-dialog-title', text: o.l }),
      rec ? el('p', { class: 'bf-dialog__rec', text: 'Polecany dla branży: ' + H.industryLabel(answers) }) : null,
      el('h3', { text: 'Jak wygląda i działa?' }),
      el('p', { text: o.how }),
      el('h3', { text: 'Dla jakich firm sprawdzi się najlepiej?' }),
      el('p', { text: o.best }),
      el('div', { class: 'bf-dialog__actions' },
        el('button', { type: 'button', class: 'btn bf-btn-ghost', text: 'Zamknij', onclick: function () { d.close(); } }),
        locked ? null : el('button', { type: 'button', class: 'btn btn--primary', text: 'Wybieram ten układ', onclick: function () {
          var inp = document.querySelector('input[name="' + f.id + '"][value="' + o.v + '"]');
          if (inp) { inp.checked = true; inp.dispatchEvent(new Event('change', { bubbles: true })); }
          d.close();
        } })
      )
    );
    d.addEventListener('close', function () { d.remove(); if (opener) opener.focus(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    document.body.appendChild(d);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }

  function updateVisibility() {
    S.steps[current].fields.forEach(function (f) {
      var w = $('[data-field="' + f.id + '"]');
      if (w) w.hidden = !H.isVisible(f, answers);
    });
  }

  function setAnswer(key, value) {
    if (value === '' || (Array.isArray(value) && !value.length)) delete answers[key];
    else answers[key] = value;
    if (key === 'industry_type' || key === 'industry') syncIndustryLabel();
    updateVisibility();
    scheduleSave();
  }

  /* ---------- Walidacja ---------- */
  function validateStep(i) {
    var errs = [];
    S.steps[i].fields.forEach(function (f) {
      if (f.type === 'info' || f.legacy || !H.isVisible(f, answers)) return;
      var msg = '';
      var v = answers[f.id];
      if (H.isRequired(f, answers) && H.isEmpty(f, answers)) msg = f.type === 'checkbox' ? 'Zaznacz przynajmniej jedną odpowiedź.' : f.type === 'radio' ? 'Wybierz jedną odpowiedź.' : f.type === 'select' ? 'Wybierz pozycję z listy.' : 'To pole jest wymagane.';
      else if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())) msg = 'Podaj poprawny adres e-mail.';
      else if (v && f.type === 'url' && !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}/i.test(String(v).trim())) msg = 'Podaj poprawny adres strony, np. https://booksy.com/…';
      if (v === '__other' && !answers[f.id + '__other'] && H.isRequired(f, answers)) msg = 'Opisz swoją odpowiedź w polu „Inne”.';
      if (msg) errs.push({ field: f, msg: msg });
      var w = $('[data-field="' + f.id + '"]');
      if (w) {
        var e = w.querySelector('.bf-err');
        if (e) e.textContent = msg;
        if (f.type === 'radio' || f.type === 'checkbox') w.classList.toggle('is-invalid', Boolean(msg));
        else {
          var inp = w.querySelector('input, textarea, select');
          if (inp) { if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
        }
      }
    });
    return errs;
  }

  function showStepAlert(errs) {
    var a = $('[data-step-alert]');
    a.replaceChildren(
      el('span', { text: errs.length === 1 ? 'Uzupełnij 1 pole:' : 'Uzupełnij ' + errs.length + ' pola:' }),
      el('ul', null, errs.map(function (x) {
        return el('li', null, el('a', { href: '#f_' + x.field.id, onclick: function (e) {
          e.preventDefault();
          var t = document.getElementById('f_' + x.field.id) || $('[data-field="' + x.field.id + '"] input');
          if (t) { t.focus(); t.scrollIntoView({ block: 'center' }); }
        }, text: x.field.label }));
      }))
    );
    a.hidden = false;
    a.setAttribute('tabindex', '-1');
    a.focus();
    refreshStepsNav();
  }

  /* ---------- Zapis ---------- */
  function scheduleSave() {
    if (DEMO || locked) return;
    pending = true;
    setSaveStatus('Zapisuję…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 1200);
  }

  function flushSave(keepalive) {
    if (DEMO || locked || !pending || (saving && !keepalive)) return Promise.resolve();
    clearTimeout(saveTimer);
    saving = true;
    pending = false;
    return fetch(ADMIN ? '/api/admin/briefs/' + ADMIN.id : '/api/brief/' + token, {
      method: ADMIN ? 'PATCH' : 'PUT',
      keepalive: Boolean(keepalive),
      credentials: 'same-origin',
      headers: ADMIN ? { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Panel': '1' } : { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Brief': '1' },
      body: JSON.stringify({ answers: answers }),
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
      .then(function (x) {
        saving = false;
        if (x.d.ok) setSaveStatus('Zapisano automatycznie ' + time());
        else if (x.status === 401 && ADMIN) { pending = true; setSaveStatus('Sesja panelu wygasła — zaloguj się w panelu i wróć tutaj', true); }
        else if (x.status === 409) { locked = true; setSaveStatus(x.d.message, true); }
        else { pending = true; setSaveStatus('Nie zapisano — ' + (x.d.message || 'spróbuję ponownie'), true); saveTimer = setTimeout(flushSave, 5000); }
        if (pending && x.d.ok) scheduleSave();
      })
      .catch(function () {
        saving = false;
        pending = true;
        setSaveStatus('Brak połączenia — zapiszę, gdy internet wróci', true);
        saveTimer = setTimeout(flushSave, 5000);
      });
  }

  /* ---------- Podsumowanie i wysłanie ---------- */
  function showSummary() {
    flushSave();
    S.steps.forEach(function (_, i) { visited[i] = true; });
    var missing = H.missingRequired(answers);
    var body = $('[data-summary-body]');
    body.replaceChildren();
    S.steps.forEach(function (st, i) {
      var rows = [];
      st.fields.forEach(function (f) {
        if (!H.isVisible(f, answers)) return;
        var val = H.formatValue(f, answers);
        var isMissing = f.type !== 'info' && H.isRequired(f, answers) && H.isEmpty(f, answers);
        if (!val && !isMissing) return;
        rows.push(el('dt', { text: f.label }));
        rows.push(el('dd', { class: isMissing ? 'is-missing' : null, text: isMissing ? 'Brak odpowiedzi (wymagane)' : val }));
      });
      body.appendChild(
        el('section', { class: 'bf-sum-step' },
          el('div', { class: 'bf-sum-step__head' },
            el('h2', { text: (i + 1) + '. ' + st.title }),
            locked ? null : el('button', { class: 'bf-link-btn', type: 'button', text: 'Edytuj', 'aria-label': 'Edytuj krok: ' + st.title, onclick: function () { buildStepsNav(); goTo(i); } })
          ),
          rows.length ? el('dl', null, rows) : el('p', { class: 'bf-sum-empty', text: 'Brak odpowiedzi w tym kroku.' })
        )
      );
    });
    var alert = $('[data-summary-alert]');
    if (missing.length && !locked) {
      alert.textContent = 'Uzupełnij wymagane odpowiedzi (' + missing.length + ') — są oznaczone na czerwono poniżej.';
      alert.hidden = false;
    } else alert.hidden = true;
    $('[data-send-box]').hidden = locked || Boolean(ADMIN);
    if (ADMIN) {
      body.appendChild(el('div', { class: 'bf-nav' },
        el('button', { class: 'btn bf-btn-ghost', type: 'button', text: '← Wróć do edycji', onclick: function () { goTo(current); } }),
        el('a', { class: 'btn btn--primary', href: '/admin/#brief/' + ADMIN.id, text: 'Gotowe — wróć do panelu' })));
    }
    $('[data-summary-title]').textContent = locked ? 'Twoje odpowiedzi' : 'Sprawdź i wyślij';
    $('[data-summary-lead]').textContent = locked ? 'Brief został wysłany. Jeśli chcesz coś zmienić, napisz do mnie — odblokuję formularz.' : 'Przejrzyj odpowiedzi. Każdą sekcję możesz jeszcze poprawić.';
    if (DEMO) addDemoExport(body);
    $('[data-progress-bar]').style.width = locked ? '100%' : Math.round((S.steps.length / (S.steps.length + 1)) * 100) + '%';
    show('summary');
    $('[data-summary-title]').focus({ preventScroll: true });
  }

  function submit() {
    var missing = H.missingRequired(answers);
    if (missing.length) {
      var a = $('[data-summary-alert]');
      a.textContent = 'Nie można jeszcze wysłać — uzupełnij wymagane odpowiedzi (' + missing.length + '). Kliknij „Edytuj” przy oznaczonej sekcji.';
      a.hidden = false;
      a.setAttribute('tabindex', '-1');
      a.focus();
      return;
    }
    var btn = $('[data-submit]');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.querySelector('.btn__label').textContent = 'Wysyłam…';
    var done = function () {
      locked = true;
      pending = false;
      setSaveStatus('Brief wysłany ' + time());
      $('[data-progress-bar]').style.width = '100%';
      show('done');
      $('[data-view="done"] h1').focus();
    };
    var reset = function () {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.querySelector('.btn__label').textContent = 'Wyślij brief';
    };
    if (DEMO) { setTimeout(function () { reset(); done(); }, 900); return; }
    clearTimeout(saveTimer);
    fetch('/api/brief/' + token + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Brief': '1' },
      body: JSON.stringify({ answers: answers }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        reset();
        if (d.ok) return done();
        var a = $('[data-summary-alert]');
        a.textContent = d.message || 'Nie udało się wysłać briefu. Spróbuj ponownie.';
        a.hidden = false;
        a.focus();
      })
      .catch(function () {
        reset();
        var a = $('[data-summary-alert]');
        a.textContent = 'Brak połączenia z serwerem. Twoje odpowiedzi są zapisane — spróbuj wysłać ponownie za chwilę.';
        a.hidden = false;
      });
  }

  /* ---------- Podgląd: eksport tekstu (tylko w trybie demo) ---------- */
  function addDemoExport(body) {
    var ta = el('textarea', { rows: '10', readonly: true, 'aria-label': 'Odpowiedzi jako tekst', style: 'width:100%;font:13px/1.5 ui-monospace,monospace;border:1.5px solid #c5cedb;border-radius:10px;padding:12px' });
    ta.value = H.toMarkdown(answers, {});
    body.appendChild(
      el('section', { class: 'bf-sum-step' },
        el('div', { class: 'bf-sum-step__head' }, el('h2', { text: 'Podgląd: odpowiedzi jako tekst' })),
        el('p', { class: 'bf-muted', text: 'W panelu administratora z tych odpowiedzi powstają gotowe polecenia dla AI: strona z panelem, strona wyboru logo i hasła, karta do portfolio.' }),
        ta
      )
    );
  }
})();
