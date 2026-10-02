/* Strony AI Wrocław — skrypt strony publicznej (bez zewnętrznych bibliotek). */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');

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
  });

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
    function measure() {
      var h = items[i].offsetHeight;
      if (h) box.style.setProperty('--rot-h', h + 'px');
    }
    items[0].classList.add('is-active');
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    setInterval(function () {
      if (document.hidden) return;
      var prev = items[i];
      i = (i + 1) % items.length;
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      items[i].classList.remove('is-leaving');
      items[i].classList.add('is-active');
      measure();
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
      if (window.innerWidth > 980) setOpen(false);
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
      var tpl = form.elements.message && form.elements.message.defaultValue;
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
