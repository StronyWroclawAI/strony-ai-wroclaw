/* Strony AI Wrocław — skrypt strony publicznej (bez zewnętrznych bibliotek). */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');

  /* Wstecz / Dalej: przeglądarka przywraca pozycję przewinięcia, zanim podmieni się font. Podmiana zmienia wysokość
     tekstów powyżej, a „scroll anchoring” przesuwał wtedy widok o ok. 35 px. Na czas wczytywania fontu (tylko przy
     powrocie z historii) kotwiczenie jest wyłączone — strona wraca dokładnie w to samo miejsce. */
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'back_forward') {
      doc.style.overflowAnchor = 'none';
      var restore = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { doc.style.overflowAnchor = ''; }); }); };
      window.addEventListener('load', function () {
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(restore); else restore();
      });
      setTimeout(restore, 3000);
    }
  } catch (e) { /* starsze przeglądarki: zwykłe zachowanie */ }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initNav();
    initReveal();
    initYear();
    initForm();
    initProgress();
    initRotator();
    initSteps();
    initParallax();
    initTilt();
    initPortfolioTabs();
    initContactJump();
    initPosts();
  });

  /* ---------- Aktualności: „Czytaj dalej” dla długich postów i osadzenie oryginału
     z Facebooka / Instagrama — ładowane DOPIERO po kliknięciu (wcześniej strona nie łączy się z Meta) ---------- */
  function initPosts() {
    var section = document.getElementById('aktualnosci');
    if (!section) return;
    Array.prototype.forEach.call(section.querySelectorAll('[data-post-text]'), function (t) {
      t.classList.add('post__text--clamp');
      if (t.scrollHeight <= t.clientHeight + 4) { t.classList.remove('post__text--clamp'); return; }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'post__more';
      b.setAttribute('aria-expanded', 'false');
      b.textContent = 'Czytaj dalej';
      b.addEventListener('click', function () {
        var open = t.classList.toggle('post__text--clamp') === false;
        b.setAttribute('aria-expanded', String(open));
        b.textContent = open ? 'Zwiń' : 'Czytaj dalej';
      });
      t.parentNode.insertBefore(b, t.nextSibling);
    });
    var ALLOWED = /^https:\/\/www\.(facebook\.com\/plugins\/(post|video)\.php\?|instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/embed\/)/;
    Array.prototype.forEach.call(section.querySelectorAll('[data-embed-src]'), function (btn) {
      var box = document.getElementById(btn.getAttribute('aria-controls'));
      var src = btn.getAttribute('data-embed-src');
      if (!box || !ALLOWED.test(src)) { btn.closest('[data-embed]').remove(); return; }
      var label = btn.textContent;
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        if (!box.hidden) {
          box.replaceChildren();
          box.hidden = true;
          btn.textContent = label;
          btn.setAttribute('aria-expanded', 'false');
          return;
        }
        var f = document.createElement('iframe');
        f.src = src;
        f.title = 'Oryginalny post — ' + (btn.getAttribute('data-embed-kind') === 'instagram' ? 'Instagram' : 'Facebook');
        f.loading = 'lazy';
        f.className = 'post__frame post__frame--' + (btn.getAttribute('data-embed-ratio') === 'video' ? 'video' : 'tall');
        f.setAttribute('allow', 'encrypted-media; picture-in-picture; clipboard-write; web-share');
        f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
        f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        box.appendChild(f);
        box.hidden = false;
        btn.textContent = 'Ukryj oryginalny post';
        btn.setAttribute('aria-expanded', 'true');
      });
    });
  }

  /* ---------- Formularz: na komputerze linki opcjonalne od razu rozwinięte;
     na telefonie i tablecie przycisk „Zgłoś swoją firmę” przewija prosto do formularza ---------- */
  function initContactJump() {
    var wide = window.matchMedia ? window.matchMedia('(min-width: 981px)') : { matches: true };
    var card = document.querySelector('#kontakt .form-card:not([hidden])');
    if (!card) return;
    function jump(smooth) {
      var header = document.querySelector('.site-header');
      var hh = header ? header.offsetHeight : 64;
      var r = card.getBoundingClientRect();
      var y = r.top + window.scrollY - hh - 8;
      // jeśli zmieści się też nagłówek sekcji (np. tablet) — pokazujemy go razem z całym formularzem
      var eb = document.querySelector('#kontakt .eyebrow');
      if (eb) {
        var ebTop = eb.getBoundingClientRect().top + window.scrollY;
        if (r.bottom + window.scrollY - ebTop + hh + 16 <= window.innerHeight) y = ebTop - hh - 16;
      }
      window.scrollTo({ top: Math.max(0, y), behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href="#kontakt"]');
      if (!a || wide.matches) return;
      e.preventDefault();
      if (history.replaceState) history.replaceState(null, '', '#kontakt');
      jump(true);
    });
    if (location.hash === '#kontakt' && !wide.matches) setTimeout(function () { jump(false); }, 60);
  }

  /* ---------- Portfolio: zakładki „Projekty zrealizowane” / „Projekty demonstracyjne” ---------- */
  function initPortfolioTabs() {
    var list = document.querySelector('[data-pf-tabs]');
    if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role=tab]'));
    var wrap = list.parentNode;
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    list.hidden = false;
    wrap.classList.add('pf-tabs-on');
    select(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0], false);
  }

  /* ---------- Pasek postępu przewijania ---------- */
  function initProgress() {
    var bar = document.querySelector('[data-progress]');
    if (!bar) return;
    var ticking = false;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max) : 0);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Zmieniające się zakończenie nagłówka ---------- */
  function initRotator() {
    var title = document.querySelector('.hero__title');
    var box = document.querySelector('.rotator');
    if (!title || !box || reduceMotion) return;
    var items = box.querySelectorAll('li');
    if (items.length < 2) return;
    title.classList.add('has-rotator');
    var i = 0;
    // Wysokość = najwyższa z fraz (np. gdy któraś łamie się na dwie linie na telefonie),
    // dzięki temu tekst pod nagłówkiem nie przesuwa się przy każdej zmianie słowa.
    var lastW = 0;
    function measure(force) {
      var w = box.offsetWidth;
      if (!force && w === lastW) return;
      lastW = w;
      var max = 0;
      for (var k = 0; k < items.length; k++) max = Math.max(max, items[k].offsetHeight);
      if (max) box.style.setProperty('--rot-h', max + 'px');
    }
    items[0].classList.add('is-active');
    measure(true);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(true); });
    window.addEventListener('resize', function () { measure(false); });
    setInterval(function () {
      if (document.hidden) return;
      var prev = items[i];
      i = (i + 1) % items.length;
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      items[i].classList.remove('is-leaving');
      items[i].classList.add('is-active');
      setTimeout(function () { prev.classList.remove('is-leaving'); }, 600);
    }, 2600);
  }

  /* ---------- Linia osi czasu rysowana podczas przewijania ---------- */
  function initSteps() {
    var list = document.querySelector('[data-steps]');
    if (!list) return;
    if (reduceMotion) { list.style.setProperty('--p', 1); return; }
    var steps = list.querySelectorAll('.step');
    function update() {
      var r = list.getBoundingClientRect();
      var mid = window.innerHeight * 0.65;
      var p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
      list.style.setProperty('--p', p.toFixed(3));
      steps.forEach(function (s) {
        var sr = s.getBoundingClientRect();
        if (sr.top < mid) s.classList.add('is-visible');
      });
    }
    window.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    update();
  }

  /* ---------- Delikatna paralaksa ilustracji w pierwszym ekranie ---------- */
  function initParallax() {
    var hero = document.querySelector('.hero');
    var els = document.querySelectorAll('[data-parallax]');
    if (!hero || !els.length || reduceMotion || !window.matchMedia('(pointer: fine)').matches) return;
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      els.forEach(function (el) {
        var f = parseFloat(el.getAttribute('data-parallax')) || 0;
        el.style.translate = (x * f).toFixed(1) + 'px ' + (y * f).toFixed(1) + 'px';
      });
    });
    hero.addEventListener('mouseleave', function () {
      els.forEach(function (el) { el.style.translate = '0 0'; });
    });
  }

  /* ---------- Przechylanie kart pod kursorem ---------- */
  function initTilt() {
    if (reduceMotion || !window.matchMedia('(pointer: fine)').matches) return;
    document.addEventListener('mousemove', function (e) {
      var card = e.target.closest && e.target.closest('[data-tilt]');
      document.querySelectorAll('[data-tilt].is-tilting').forEach(function (c) {
        if (c !== card) { c.classList.remove('is-tilting'); c.style.transform = ''; }
      });
      if (!card) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add('is-tilting');
      card.style.transform = 'perspective(900px) rotateX(' + (-y * 6).toFixed(2) + 'deg) rotateY(' + (x * 8).toFixed(2) + 'deg) translateY(-4px)';
    });
  }

  /* ---------- Nagłówek: tło po przewinięciu ---------- */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;
    var forceSolid = header.hasAttribute('data-solid');
    function update() {
      header.classList.toggle('is-solid', forceSolid || window.scrollY > 24);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---------- Menu mobilne ---------- */
  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.getElementById('menu');
    var header = document.querySelector('[data-header]');
    if (!toggle || !nav) return;
    // Menu bez JS otwiera się przez #menu — po załadowaniu skryptu sterowanie przejmuje przycisk (adres bez #menu).
    if (location.hash === '#menu' && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    var mobile = window.matchMedia ? window.matchMedia('(max-width: 1023px)') : { matches: window.innerWidth <= 1023 };

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
      if (header) header.classList.toggle('menu-open', open);
    }
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (!mobile.matches) setOpen(false);
    });
  }

  /* ---------- Delikatne animacje wejścia ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el, i) {
      el.style.transitionDelay = Math.min((i % 4) * 60, 180) + 'ms';
      io.observe(el);
    });
  }

  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ---------- Formularz zgłoszeniowy ---------- */
  var MSG = {
    required: 'To pole jest wymagane.',
    email: 'Podaj poprawny adres e-mail, np. jan@firma.pl.',
    url: 'Podaj poprawny adres, np. https://twojafirma.pl.',
    phone: 'Podaj poprawny numer telefonu (cyfry, spacje, +, -, nawiasy).',
    tooLong: 'Tekst jest za długi.',
    messageShort: 'Napisz trochę więcej — minimum 20 znaków.',
    turnstile: 'Potwierdź, że nie jesteś robotem (pole weryfikacji powyżej).'
  };

  function initForm() {
    var form = document.getElementById('lead-form');
    if (!form) return;
    var alertBox = form.querySelector('[data-form-alert]');
    var success = document.querySelector('[data-form-success]');
    var submitBtn = form.querySelector('[data-submit]');
    var industry = form.elements.industry;
    var otherWrap = form.querySelector('[data-other-industry]');
    // Szkic wiadomości jest wpisany w pole; pole ma wysokość dopasowaną do treści (bez suwaka)
    // i rośnie, gdy klient dopisuje kolejne linie.
    var msgEl = form.elements.message;
    var tplText = msgEl ? msgEl.value.replace(/^\n+|\s+$/g, '') : '';
    function fitMessage() {
      if (!msgEl) return;
      msgEl.style.height = 'auto';
      msgEl.style.height = msgEl.scrollHeight + 2 + 'px';
    }
    if (msgEl) {
      msgEl.addEventListener('input', fitMessage);
      window.addEventListener('resize', fitMessage);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMessage);
      fitMessage();
    }
    // Rodzaj strony: firma / wizerunkowa (klub, szkoła, akademia) — zmienia etykiety i szkic wiadomości
    var tplFirm = tplText;
    var orgTplEl = document.querySelector('[data-tpl-org]');
    var tplOrg = orgTplEl ? orgTplEl.value.replace(/^\n+|\s+$/g, '') : '';
    var norm = function (t) { return String(t || '').replace(/\s+/g, ' ').trim(); };
    function applyPurpose() {
      var org = Boolean(form.querySelector('input[name="site_purpose"]:checked'));
      var cl = form.querySelector('[data-company-label]');
      if (cl) cl.textContent = org ? 'Nazwa organizacji' : 'Nazwa firmy';
      var il = form.querySelector('[data-industry-label]');
      if (il) il.textContent = org ? 'Rodzaj organizacji' : 'Branża';
      var ci = form.querySelector('.ic__input');
      if (ci) ci.placeholder = org ? 'Wpisz, np. klub sportowy, szkoła…' : 'Wpisz, np. fryzjer…';
      // szkic podmieniamy tylko wtedy, gdy klient nic w nim jeszcze nie zmienił
      if (msgEl && tplOrg) {
        var cur = norm(msgEl.value);
        if (!cur || cur === norm(tplFirm) || cur === norm(tplOrg)) msgEl.value = org ? tplOrg : tplFirm;
        tplText = org ? tplOrg : tplFirm;
        fitMessage();
      }
    }
    Array.prototype.forEach.call(form.querySelectorAll('input[name="site_purpose"]'), function (r) { r.addEventListener('change', applyPurpose); });

    // wyszukiwarka branży (wpisz pierwsze litery)
    if (industry && window.IndustryCombo) window.IndustryCombo.enhance(industry, { other: form.elements.industry_other });
    applyPurpose();
    var submissionId = newId();
    var sending = false;

    function toggleOther() {
      var show = industry && industry.value === 'Inna';
      if (otherWrap) otherWrap.hidden = !show;
      if (form.elements.industry_other) form.elements.industry_other.required = !!show;
    }
    if (industry) {
      industry.addEventListener('change', toggleOther);
      toggleOther();
    }

    // Czyść błąd pola, gdy użytkownik je poprawia
    form.addEventListener('input', function (e) {
      if (e.target.name && e.target.getAttribute('aria-invalid') === 'true') setError(e.target.name, '');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return; // blokada wielokrotnego wysłania

      clearErrors();
      var data = collect();
      var errors = validate(data);
      if (Object.keys(errors).length) {
        showErrors(errors);
        return;
      }

      sending = true;
      setLoading(true);

      fetch('/api/zgloszenie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            return { status: res.status, body: body };
          });
        })
        .then(function (r) {
          if (r.body && r.body.ok) {
            // Potwierdzenie pokazujemy dopiero, gdy serwer potwierdził zapis w bazie.
            form.hidden = true;
            if (success) {
              success.hidden = false;
              success.focus();
            }
            return;
          }
          if (r.body && r.body.errors) showErrors(r.body.errors);
          showAlert((r.body && r.body.message) || 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie za chwilę.');
          resetTurnstile();
        })
        .catch(function () {
          showAlert('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie — Twoje dane nadal są w formularzu.');
          resetTurnstile();
        })
        .then(function () {
          sending = false;
          setLoading(false);
        });
    });

    function collect() {
      var f = form.elements;
      var tokenInput = form.querySelector('[name="cf-turnstile-response"]');
      return {
        submission_id: submissionId,
        site_purpose: form.querySelector('input[name="site_purpose"]:checked') ? 'wizerunkowa' : 'firma',
        company_name: val(f.company_name),
        industry: val(f.industry),
        industry_other: val(f.industry_other),
        contact_name: val(f.contact_name),
        email: val(f.email),
        phone: val(f.phone),
        website_url: val(f.website_url),
        facebook_url: val(f.facebook_url),
        instagram_url: val(f.instagram_url),
        message: val(f.message),
        company_fax: f.company_fax ? f.company_fax.value : '',
        turnstile_token: (tokenInput && tokenInput.value) || (window.turnstile && window.turnstile.getResponse ? window.turnstile.getResponse() || null : null),
        turnstile_present: !!form.querySelector('[data-turnstile] .cf-turnstile, [data-turnstile][data-sitekey]')
      };
    }

    function validate(d) {
      var e = {};
      if (!d.company_name) e.company_name = MSG.required;
      else if (d.company_name.length > 150) e.company_name = MSG.tooLong;
      if (!d.industry) e.industry = 'Wybierz branżę z listy.';
      if (d.industry === 'Inna' && !d.industry_other) e.industry_other = 'Wpisz, czym zajmuje się firma.';
      if (!d.contact_name) e.contact_name = MSG.required;
      else if (d.contact_name.length > 100) e.contact_name = MSG.tooLong;
      if (!d.email) e.email = MSG.required;
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email) || d.email.length > 254) e.email = MSG.email;
      if (d.phone && !/^[0-9+()\-\s]{7,30}$/.test(d.phone)) e.phone = MSG.phone;
      ['website_url', 'facebook_url', 'instagram_url'].forEach(function (k) {
        if (d[k] && !looksLikeUrl(d[k])) e[k] = MSG.url;
      });
      var tpl = tplText;
      if (d.message && tpl && d.message.replace(/\s+/g, ' ').trim() === tpl.replace(/\s+/g, ' ').trim()) e.message = 'Uzupełnij szkic wiadomości — dopisz choć kilka słów o swojej firmie.';
      else if (!d.message) e.message = MSG.required;
      else if (d.message.length < 20) e.message = MSG.messageShort;
      else if (d.message.length > 5000) e.message = MSG.tooLong;
      if (d.turnstile_present && !d.turnstile_token) e.turnstile = MSG.turnstile;
      return e;
    }

    function showErrors(errors) {
      var first = null;
      Object.keys(errors).forEach(function (name) {
        setError(name, errors[name]);
        var el = form.elements[name];
        if (!first && el && typeof el.focus === 'function') first = el;
      });
      var count = Object.keys(errors).length;
      showAlert(count === 1 ? 'Popraw 1 pole zaznaczone poniżej.' : 'Popraw pola zaznaczone poniżej (' + count + ').', !first);
      if (first) first.focus();
    }

    function setError(name, msg) {
      var p = form.querySelector('[data-error-for="' + name + '"]');
      if (p) p.textContent = msg || '';
      var el = form.elements[name];
      // pole w zwiniętej części formularza — rozwijamy ją, żeby błąd był widoczny
      if (msg && el && el.closest) { var more = el.closest('details'); if (more) more.open = true; }
      if (el && el.setAttribute) {
        if (msg) el.setAttribute('aria-invalid', 'true');
        else el.removeAttribute('aria-invalid');
      }
    }

    function clearErrors() {
      form.querySelectorAll('[data-error-for]').forEach(function (p) { p.textContent = ''; });
      form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
      if (alertBox) { alertBox.hidden = true; alertBox.textContent = ''; }
    }

    function showAlert(text, focus) {
      if (!alertBox) return;
      alertBox.textContent = text;
      alertBox.hidden = false;
      if (focus !== false) alertBox.focus();
    }

    function setLoading(on) {
      submitBtn.disabled = on;
      submitBtn.classList.toggle('is-loading', on);
      submitBtn.querySelector('.btn__label').textContent = on ? 'Wysyłam…' : 'Wyślij zgłoszenie';
      form.setAttribute('aria-busy', on ? 'true' : 'false');
    }
  }

  function resetTurnstile() {
    try { if (window.turnstile) window.turnstile.reset(); } catch (e) { /* brak widżetu */ }
  }

  function val(el) {
    return el ? String(el.value || '').trim() : '';
  }

  function looksLikeUrl(v) {
    var s = /^https?:\/\//i.test(v) ? v : 'https://' + v;
    try {
      var u = new URL(s);
      return /\./.test(u.hostname) && v.length <= 500;
    } catch (e) {
      return false;
    }
  }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
})();
