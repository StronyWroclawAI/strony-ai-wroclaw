/* =========================================================
   Panel administratora — Strony AI Wrocław
   Uprawnienia sprawdzają funkcje serwerowe (/api/admin/...).
   Sesja jest w ciasteczku HttpOnly — ten skrypt nie zna hasła ani kluczy.
   ========================================================= */
(function () {
  'use strict';

  // ---------- Pomocnicze ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /** Tworzy element DOM. Tekst zawsze trafia przez textContent — bez ryzyka wstrzyknięcia HTML. */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const STATUSES = [
    ['nowe', 'Nowe'],
    ['kontakt', 'Kontakt'],
    ['w_realizacji', 'W realizacji'],
    ['zakonczone', 'Zakończone'],
    ['odrzucone', 'Odrzucone'],
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES);
  const NOTIF_LABEL = {
    pending: 'Powiadomienie w toku',
    sent: 'Powiadomienie wysłane',
    failed: 'Powiadomienie nieudane',
    skipped: 'Powiadomienia wyłączone',
  };

  const fmtDate = (iso) => {
    try {
      return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  function errMsg(e) {
    if (!e) return 'Nieznany błąd.';
    const m = String(e.message || e.error_description || e);
    if (e.code === '42501' || /row-level security|permission denied/i.test(m)) return 'Brak uprawnień do tej operacji.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.';
    if (/Invalid login credentials/i.test(m)) return 'Nieprawidłowy e-mail lub hasło.';
    if (/check constraint/i.test(m)) return 'Wartość nie spełnia wymagań (np. jest za długa lub ma zły format).';
    if (/JWT expired|session/i.test(m)) return 'Sesja wygasła. Zaloguj się ponownie.';
    if (/exceeded the maximum allowed size|Payload too large/i.test(m)) return 'Plik jest za duży (maksymalnie 5 MB).';
    if (/mime type|invalid_mime_type/i.test(m)) return 'Niedozwolony typ pliku. Dozwolone: JPG, PNG, WebP.';
    return m;
  }

  function toast(msg, type = 'ok') {
    const box = $('[data-toasts]');
    const t = h('div', { class: `toast${type === 'error' ? ' toast--error' : ''}`, role: type === 'error' ? 'alert' : 'status', text: msg });
    box.append(t);
    setTimeout(() => t.remove(), type === 'error' ? 8000 : 3500);
  }

  function confirmDialog({ title = 'Potwierdź', text = '', ok = 'Usuń', danger = true }) {
    const dlg = $('[data-confirm]');
    $('[data-confirm-title]', dlg).textContent = title;
    $('[data-confirm-text]', dlg).textContent = text;
    const okBtn = $('[data-confirm-ok]', dlg);
    okBtn.textContent = ok;
    okBtn.className = `btn ${danger ? 'btn--danger' : 'btn--primary'}`;
    return new Promise((resolve) => {
      dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
      dlg.returnValue = 'cancel';
      dlg.showModal();
    });
  }

  /**
   * Podgląd polecenia dla AI przed skopiowaniem: spis sekcji (skoki), czytelny widok,
   * możliwość poprawienia treści, licznik znaków, „Kopiuj” i „Pobierz .txt”.
   */
  function promptPreview(title, text, okMsg) {
    let current = String(text || '');
    const isHead = (l) => /^={3}.*={3}$/.test(l.trim()) || /^\d\)\s+[A-ZĄĆĘŁŃÓŚŹŻ]/.test(l.trim()) || (/^[A-ZĄĆĘŁŃÓŚŹŻ0-9][A-ZĄĆĘŁŃÓŚŹŻ0-9 ():\-—–,.\/+'„”"]{5,}$/.test(l.trim()) && l.trim() === l.trim().toUpperCase() && /[A-ZĄĆĘŁŃÓŚŹŻ]{4}/.test(l));
    const view = h('div', { class: 'prompt-view', tabindex: '0', 'aria-label': 'Treść polecenia' });
    const toc = h('nav', { class: 'prompt-toc', 'aria-label': 'Sekcje polecenia' });
    const edit = h('textarea', { class: 'prompt-edit', spellcheck: 'false', 'aria-label': 'Edycja treści polecenia', hidden: true });
    const stats = h('span', { class: 'prompt-stats small muted' });
    const note = h('p', { class: 'small muted prompt-note', text: 'To jest dokładnie ten tekst, który zostanie skopiowany. Możesz go poprawić przed skopiowaniem (zmiany nie zapisują się w briefie).' });
    const render = () => {
      view.replaceChildren();
      toc.replaceChildren();
      const pre = h('pre', { class: 'prompt-pre' });
      let n = 0;
      current.split('\n').forEach((line) => {
        if (isHead(line)) {
          const id = `pp-${++n}`;
          pre.append(h('strong', { class: 'prompt-h', id, text: line }), '\n');
          const label = line.replace(/^=+\s*|\s*=+$/g, '').replace(/^\d\)\s*/, '').trim();
          if (!/:$/.test(label)) toc.append(h('button', { type: 'button', class: 'prompt-chip', text: label.length > 42 ? `${label.slice(0, 40)}…` : label, title: label, onclick: () => { const t = pre.querySelector(`#${id}`); if (t) { view.scrollTop = t.offsetTop - view.offsetTop - 8; t.classList.add('is-flash'); setTimeout(() => t.classList.remove('is-flash'), 900); } } }));
        } else if (/^[─=]{10,}$/.test(line.trim())) {
          pre.append(h('span', { class: 'prompt-sep', 'aria-hidden': 'true', text: line }), '\n');
        } else pre.append(line, '\n');
      });
      view.append(pre);
      const words = current.trim() ? current.trim().split(/\s+/).length : 0;
      stats.textContent = `${current.length.toLocaleString('pl-PL')} znaków · ${words.toLocaleString('pl-PL')} słów · ok. ${Math.round(current.length / 3.6).toLocaleString('pl-PL')} tokenów`;
    };
    render();
    const editBtn = h('button', { class: 'btn btn--sm', type: 'button', text: 'Edytuj treść', 'data-prompt-edit': '' });
    editBtn.addEventListener('click', () => {
      const editing = !edit.hidden;
      if (editing) {
        current = edit.value;
        edit.hidden = true;
        view.hidden = false;
        toc.hidden = false;
        editBtn.textContent = 'Edytuj treść';
        render();
      } else {
        edit.value = current;
        edit.hidden = false;
        view.hidden = true;
        toc.hidden = true;
        editBtn.textContent = 'Gotowe — pokaż podgląd';
        edit.focus();
      }
    });
    edit.addEventListener('input', () => { current = edit.value; stats.textContent = `${current.length.toLocaleString('pl-PL')} znaków (edycja)`; });
    const dlg = h('dialog', { class: 'dialog prompt-dialog', 'aria-labelledby': 'prompt-dlg-title', 'data-prompt-dialog': '' });
    const close = () => dlg.close();
    dlg.append(
      h('div', { class: 'prompt-dialog__head' },
        h('div', null, h('h2', { class: 'dialog__title', id: 'prompt-dlg-title', text: title }), stats),
        h('button', { class: 'prompt-dialog__x', type: 'button', 'aria-label': 'Zamknij podgląd', text: '×', onclick: close })
      ),
      note,
      toc,
      view,
      edit,
      h('div', { class: 'dialog__actions prompt-dialog__actions' },
        editBtn,
        h('button', { class: 'btn btn--sm', type: 'button', text: 'Pobierz .txt', onclick: () => saveBlob(new Blob([current], { type: 'text/plain;charset=utf-8' }), `${slugName(title)}.txt`) }),
        h('button', { class: 'btn', type: 'button', text: 'Zamknij', onclick: close }),
        h('button', { class: 'btn btn--primary', type: 'button', 'data-prompt-copy': '', text: 'Kopiuj polecenie', onclick: async () => { if (!edit.hidden) current = edit.value; await copyText(current, okMsg || 'Polecenie skopiowane.'); close(); } })
      )
    );
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    view.focus();
  }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) {
      btn.dataset.label = btn.textContent;
      btn.textContent = label || 'Zapisuję…';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.label || btn.textContent;
      btn.disabled = false;
    }
  }

  function field(label, input, hint) {
    const id = input.id || `f-${Math.random().toString(36).slice(2, 9)}`;
    input.id = id;
    return h('div', { class: 'field' }, h('label', { for: id, text: label }), input, hint ? h('p', { class: 'hint', text: hint }) : null);
  }

  /** Rodzaj strony: firma (oferta, cennik) albo wizerunkowa (klub, szkoła, organizacja — bez sprzedaży). */
  function purposePicker(initial) {
    const name = `purpose-${Math.random().toString(36).slice(2, 8)}`;
    const firm = h('input', { type: 'radio', name, value: 'firma', checked: initial !== 'wizerunkowa' });
    const org = h('input', { type: 'radio', name, value: 'wizerunkowa', checked: initial === 'wizerunkowa' });
    const el = h(
      'fieldset',
      { class: 'kind-pick purpose-pick', 'data-purpose-pick': '' },
      h('legend', { text: 'Rodzaj strony' }),
      h('label', { class: 'check' }, firm, h('span', null, h('strong', { text: 'Strona firmy' }), ' — oferta, usługi, cennik, rezerwacje')),
      h('label', { class: 'check' }, org, h('span', null, h('strong', { text: 'Strona wizerunkowa' }), ' — klub, szkoła, akademia, stowarzyszenie, instytucja (bez sprzedaży usług)'))
    );
    // etykiety pól dopasowane do rodzaju strony (firma / organizacja)
    const labels = { company: null, industry: null };
    const sync = () => {
      const form = el.closest('form');
      if (!form) return;
      const isOrg = org.checked;
      if (labels.company) { const l = form.querySelector(`label[for="${labels.company.id}"]`); if (l) l.textContent = isOrg ? 'Nazwa organizacji (klubu, szkoły, akademii) *' : 'Nazwa firmy *'; }
      if (labels.industry) {
        const l = form.querySelector(`label[for="${labels.industry.id}-szukaj"], label[for="${labels.industry.id}"]`);
        if (l) l.textContent = isOrg ? 'Rodzaj organizacji' : 'Branża';
        const ci = form.querySelector('.ic__input');
        if (ci) ci.placeholder = isOrg ? 'Wpisz, np. klub sportowy, szkoła…' : 'Wpisz, np. fryzjer…';
      }
    };
    [firm, org].forEach((i) => i.addEventListener('change', sync));
    return {
      el,
      get: () => (org.checked ? 'wizerunkowa' : 'firma'),
      inputs: [firm, org],
      bind(company, industry) { labels.company = company; labels.industry = industry; setTimeout(sync, 30); },
    };
  }

  /** Wybór branży — ta sama lista co w formularzu zgłoszeniowym na stronie (z „Inna branża” i polem do wpisania). */
  function industryPicker(initial) {
    const S = window.BRIEF_SCHEMA;
    const select = h('select', { 'data-industry-select': '' }, h('option', { value: '', text: '— wybierz branżę —' }));
    (S ? S.industries : []).forEach((g) => {
      if (g.items[0] && g.items[0].v === 'inna') select.append(h('option', { value: 'Inna', text: 'Inna branża (wpiszę poniżej)' }));
      else select.append(h('optgroup', { label: g.l }, ...g.items.map((i) => h('option', { value: i.l, text: i.l, 'data-k': (i.k || []).join(' ') }))));
    });
    const other = h('input', { type: 'text', maxlength: '90', placeholder: 'np. pracownia ceramiki', 'data-industry-other': '' });
    const otherBox = field('Jaka to branża?', other);
    const init = String(initial || '').trim();
    const known = [...select.options].some((o) => o.value === init);
    if (/^Inna:\s*/.test(init)) { select.value = 'Inna'; other.value = init.replace(/^Inna:\s*/, ''); }
    else if (known) select.value = init;
    else if (init && init !== 'Nie podano') { select.value = 'Inna'; other.value = init; }
    const sync = () => (otherBox.hidden = select.value !== 'Inna');
    select.addEventListener('change', sync);
    sync();
    // wyszukiwarka (wpisz pierwsze litery) — po wstawieniu formularza na stronę
    setTimeout(() => { if (window.IndustryCombo) window.IndustryCombo.enhance(select, { other }); }, 0);
    return {
      select,
      otherBox,
      get: () => (select.value === 'Inna' ? (other.value.trim() ? `Inna: ${other.value.trim()}` : 'Inna') : select.value),
    };
  }

  function withCounter(input, max) {
    const c = h('div', { class: 'counter', 'aria-live': 'off' });
    const upd = () => (c.textContent = `${input.value.length} / ${max}`);
    input.addEventListener('input', upd);
    upd();
    return [input, c];
  }

  // ---------- Stan ----------
  let dirty = false;
  let routerBound = false;
  const screens = ['loading', 'config-error', 'login', 'app'];

  function showScreen(name) {
    for (const s of screens) {
      const el = $(`[data-screen="${s}"]`);
      if (el) el.hidden = s !== name;
    }
  }

  window.addEventListener('beforeunload', (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /** Wywołanie API panelu. Sesja jest w ciasteczku HttpOnly — skrypt nie ma do niej dostępu. */
  async function api(path, opts = {}) {
    const isForm = opts.body instanceof FormData;
    const headers = { Accept: 'application/json', 'X-Panel': '1' };
    if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch(`/api/admin/${path}`, {
        method: opts.method || 'GET',
        headers,
        credentials: 'same-origin',
        body: opts.body === undefined ? undefined : isForm ? opts.body : JSON.stringify(opts.body),
      });
    } catch {
      throw new Error('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.');
    }
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== 'login') {
      dirty = false;
      showScreen('login');
      throw new Error(body.message || 'Sesja wygasła. Zaloguj się ponownie.');
    }
    if (!res.ok || body.ok === false) throw new Error(body.message || `Błąd serwera (${res.status}).`);
    return body;
  }

  // ---------- Start ----------
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    bindAuthForms();
    let s;
    try {
      s = await api('session');
    } catch (e) {
      $('[data-config-error]').textContent = e.message;
      showScreen('config-error');
      return;
    }
    const c = s.configured || {};
    if (!c.db || !c.auth) {
      $('[data-config-error]').textContent = 'Brakuje części ustawień w Cloudflare:';
      $('[data-config-list]').replaceChildren(
        h('li', null, h('span', { text: 'Baza D1 (powiązanie DB)' }), h('strong', { text: c.db ? '✓' : '✗ brak' })),
        h('li', null, h('span', { text: 'Magazyn zdjęć KV (powiązanie MEDIA)' }), h('strong', { text: c.media ? '✓' : '✗ brak' })),
        h('li', null, h('span', { text: 'Hasło i klucz sesji (ADMIN_PASSWORD_HASH, SESSION_SECRET)' }), h('strong', { text: c.auth ? '✓' : '✗ brak' }))
      );
      showScreen('config-error');
      return;
    }
    if (s.loggedIn) enterApp();
    else showScreen('login');
  }

  function bindAuthForms() {
    const form = $('[data-login-form]');
    const err = $('[data-login-error]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      const password = form.password.value;
      if (!password) {
        err.textContent = 'Wpisz hasło.';
        err.hidden = false;
        return;
      }
      const btn = form.querySelector('button[type=submit]');
      busy(btn, true, 'Loguję…');
      try {
        await api('login', { method: 'POST', body: { password } });
        form.password.value = '';
        enterApp();
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
        form.password.value = '';
        form.password.focus();
      }
      busy(btn, false);
    });

    $$('[data-logout]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (dirty && !(await confirmDialog({ title: 'Niezapisane zmiany', text: 'Masz niezapisane zmiany. Czy na pewno chcesz się wylogować?', ok: 'Wyloguj', danger: false }))) return;
        dirty = false;
        await api('logout', { method: 'POST' }).catch(() => {});
        showScreen('login');
        $('#l-pass').focus();
      })
    );
  }

  function enterApp() {
    $('[data-user-email]').textContent = 'Zalogowano jako administrator';
    showScreen('app');
    if (!routerBound) {
      window.addEventListener('hashchange', route);
      routerBound = true;
    }
    route();
    refreshVisitsBadge();
  }

  /** Zamienia wywołanie API na { data, error } — ułatwia obsługę błędów w widokach. */
  async function q(promise) {
    try {
      return { data: await promise, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }

  function refreshNewCount(leads) {
    const count = (leads || []).filter((l) => l.status === 'nowe').length;
    const b = $('[data-new-count]');
    if (count) {
      b.textContent = String(count);
      b.hidden = false;
      b.setAttribute('aria-label', `${count} nowych`);
    } else b.hidden = true;
  }

  // ---------- Routing ----------
  const VIEWS = {
    zgloszenia: viewLeads,
    zgloszenie: viewLead,
    briefy: viewBriefs,
    statystyki: viewStats,
    brief: viewBrief,
    tresci: viewContent,
    faq: () => viewList(LISTS.faq),
    branze: () => viewList(LISTS.branze),
    mozliwosci: () => viewList(LISTS.mozliwosci),
    portfolio: viewPortfolio,
    aktualnosci: viewPosts,
    zdjecia: viewMedia,
    ustawienia: viewSettings,
  };
  let lastHash = '';

  async function route() {
    const raw = location.hash.replace(/^#/, '');
    const [name, param] = raw.split('/');
    const key = VIEWS[name] ? name : 'zgloszenia';
    if (dirty && raw !== lastHash) {
      const go = await confirmDialog({ title: 'Niezapisane zmiany', text: 'Masz niezapisane zmiany. Jeśli przejdziesz dalej, zostaną utracone.', ok: 'Przejdź bez zapisu', danger: true });
      if (!go) {
        history.replaceState(null, '', `#${lastHash}`);
        return;
      }
    }
    dirty = false;
    lastHash = raw;
    const navKey = key === 'zgloszenie' ? 'zgloszenia' : key === 'brief' ? 'briefy' : key;
    $$('[data-nav]').forEach((a) => (a.getAttribute('data-nav') === navKey ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    const main = $('[data-view]');
    main.replaceChildren(h('p', { class: 'muted', text: 'Ładowanie…' }));
    try {
      await VIEWS[key](main, param);
    } catch (e) {
      console.error(e);
      main.replaceChildren(
        h('div', { class: 'alert alert--error', role: 'alert', text: `Nie udało się wczytać danych: ${errMsg(e)}` }),
        h('button', { class: 'btn', type: 'button', text: 'Spróbuj ponownie', onclick: route })
      );
    }
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function head(title, desc, ...actions) {
    return h('div', { class: 'view-head' }, h('div', null, h('h1', { text: title }), desc ? h('p', { text: desc }) : null), actions.length ? h('div', { class: 'actions' }, actions) : null);
  }

  // =========================================================
  // ZGŁOSZENIA
  // =========================================================
  const leadFilter = { status: 'all', q: '', failed: false };

  async function viewLeads(main, param) {
    const leads = (await api('leads')).items;
    const manualForm = leadManualForm(param === 'nowe');

    const listBox = h('div');
    const counts = Object.fromEntries(STATUSES.map(([k]) => [k, leads.filter((l) => l.status === k).length]));

    const chips = h(
      'div',
      { class: 'chips', role: 'group', 'aria-label': 'Filtruj według statusu' },
      [['all', `Wszystkie (${leads.length})`], ...STATUSES.map(([k, l]) => [k, `${l} (${counts[k]})`])].map(([k, l]) =>
        h('button', {
          class: 'chip',
          type: 'button',
          'aria-pressed': leadFilter.status === k ? 'true' : 'false',
          text: l,
          onclick: (e) => {
            leadFilter.status = k;
            $$('.chip', chips).forEach((c) => c.setAttribute('aria-pressed', 'false'));
            e.currentTarget.setAttribute('aria-pressed', 'true');
            draw();
          },
        })
      )
    );
    const search = h('input', { type: 'search', class: 'input', placeholder: 'Firma, imię lub e-mail', value: leadFilter.q, oninput: (e) => { leadFilter.q = e.target.value; draw(); } });
    const failed = h('input', { type: 'checkbox', checked: leadFilter.failed, onchange: (e) => { leadFilter.failed = e.target.checked; draw(); } });
    const failedCount = leads.filter((l) => l.notification_status === 'failed' && l.source !== 'reczne').length;

    function draw() {
      const q = leadFilter.q.trim().toLowerCase();
      const rows = leads.filter(
        (l) =>
          (leadFilter.status === 'all' || l.status === leadFilter.status) &&
          (!leadFilter.failed || (l.source !== 'reczne' && (l.notification_status === 'failed' || l.notification_status === 'skipped'))) &&
          (!q || [l.company_name, l.contact_name, l.email, l.industry].some((v) => String(v || '').toLowerCase().includes(q)))
      );
      if (!rows.length) {
        listBox.replaceChildren(h('div', { class: 'empty', text: leads.length ? 'Brak zgłoszeń spełniających filtry.' : 'Nie ma jeszcze żadnych zgłoszeń. Pojawią się tutaj po wysłaniu formularza na stronie.' }));
        return;
      }
      listBox.replaceChildren(
        h(
          'ul',
          { class: 'lead-list' },
          rows.map((l) =>
            h(
              'li',
              null,
              h(
                'a',
                { class: 'lead-row', href: `#zgloszenie/${l.id}` },
                h('div', null, h('div', { class: 'lead-row__title', text: l.company_name }), h('div', { class: 'lead-row__meta', text: `${fmtDate(l.created_at)} · ${l.industry} · ${l.contact_name} · ${l.email}` })),
                h(
                  'div',
                  { class: 'lead-row__badges' },
                  l.site_purpose === 'wizerunkowa' ? h('span', { class: 'status status--w_realizacji', text: 'Wizerunkowa' }) : null,
                  l.source === 'reczne' ? h('span', { class: 'status status--odrzucone', text: 'Dodane ręcznie' }) : null,
                  l.source !== 'reczne' && ['failed', 'skipped'].includes(l.notification_status) ? h('span', { class: `status status--${l.notification_status}`, text: NOTIF_LABEL[l.notification_status] }) : null,
                  l.logo_status ? h('span', { class: `status status--${l.logo_status === 'wybrana' ? 'zakonczone' : 'kontakt'}`, text: l.logo_status === 'wybrana' ? 'Logo: wybrane' : 'Logo: czeka na wybór' }) : null,
                  l.brief_status ? h('span', { class: `status status--${BRIEF_CLASS[l.brief_status]}`, text: `Brief: ${BRIEF_STATUS[l.brief_status].toLowerCase()}` }) : null,
                  h('span', { class: `status status--${l.status}`, text: STATUS_LABEL[l.status] })
                )
              )
            )
          )
        )
      );
    }

    main.replaceChildren(
      head(
        'Zgłoszenia',
        'Zgłoszenia z formularza na stronie i kontakty dodane ręcznie. W każdym zgłoszeniu możesz utworzyć brief projektowy dla klienta.',
        h('button', { class: 'btn btn--primary', type: 'button', text: '+ Dodaj zgłoszenie ręcznie', onclick: () => { manualForm.hidden = false; manualForm.querySelector('input').focus(); } })
      ),
      manualForm,
      failedCount
        ? h('div', { class: 'alert alert--warn', text: `${failedCount} zgłoszeń nie ma wysłanego powiadomienia e-mail. Zgłoszenia są bezpiecznie zapisane — otwórz je, aby wysłać powiadomienie ponownie, albo sprawdź konfigurację w Ustawieniach.` })
        : null,
      h('div', { class: 'toolbar' }, chips),
      h('div', { class: 'toolbar' }, field('Szukaj', search), h('label', { class: 'check' }, failed, 'Tylko bez wysłanego powiadomienia')),
      listBox
    );
    draw();
    refreshNewCount(leads);
  }

  function leadManualForm(open) {
    const f = {
      company_name: h('input', { type: 'text', maxlength: '150', required: true }),
      contact_name: h('input', { type: 'text', maxlength: '100', required: true }),
      email: h('input', { type: 'email', maxlength: '254', required: true }),
      phone: h('input', { type: 'tel', maxlength: '30' }),
      website_url: h('input', { type: 'url', maxlength: '500', placeholder: 'https://' }),
      message: h('textarea', { rows: '3', maxlength: '5000', placeholder: 'np. „Napisałem 3.10, odpowiedziała, że jest zainteresowana”' }),
    };
    const ind = industryPicker('');
    const pur = purposePicker('firma');
    const logoIn = h('input', { type: 'file', multiple: true, accept: '.svg,.pdf,.png,.jpg,.jpeg,.webp', 'data-manual-logo': '' });
    const btn = h('button', { class: 'btn btn--primary', type: 'submit', text: 'Zapisz zgłoszenie' });
    const form = h(
      'form',
      {
        class: 'panel',
        hidden: !open,
        onsubmit: async (e) => {
          e.preventDefault();
          for (const k of ['company_name', 'contact_name', 'email']) {
            if (!f[k].value.trim()) {
              f[k].focus();
              return toast('Uzupełnij nazwę firmy, osobę kontaktową i e-mail.', 'error');
            }
          }
          const payload = {};
          Object.keys(f).forEach((k) => (payload[k] = f[k].value.trim()));
          payload.industry = ind.get();
          payload.site_purpose = pur.get();
          busy(btn, true);
          const { data, error } = await q(api('leads', { method: 'POST', body: payload }));
          if (error) { busy(btn, false); return toast(errMsg(error), 'error'); }
          if (logoIn.files.length) {
            busy(btn, true, 'Wgrywam logo…');
            const up = await uploadLeadFiles(data.id, 'logo', logoIn.files);
            if (up.errors.length) toast(`Zgłoszenie zapisane, ale logo nie zostało wgrane: ${up.errors.join('; ')}`, 'error');
          }
          busy(btn, false);
          toast('Zgłoszenie dodane. Możesz teraz utworzyć brief.');
          location.hash = `#zgloszenie/${data.id}`;
        },
      },
      h('h2', { text: 'Dodaj zgłoszenie ręcznie' }),
      h('p', { class: 'small muted', text: 'Dla firm, z którymi kontakt nawiązałeś mailowo lub telefonicznie, a nie przez formularz na stronie. Dzięki temu wszyscy klienci i ich briefy są w jednym miejscu.' }),
      pur.el,
      h('div', { class: 'grid-2' }, field('Nazwa firmy *', f.company_name), field('Osoba kontaktowa *', f.contact_name), field('E-mail *', f.email), field('Telefon', f.phone), field('Branża', ind.select), ind.otherBox, field('Obecna strona', f.website_url)),
      field('Opis / jak nawiązano kontakt', f.message),
      field('Logo klienta (opcjonalnie)', logoIn, 'Jeśli klient przysłał swoje logo (np. e-mailem): SVG, PDF, PNG, JPG lub WebP, do 20 MB. Możesz wybrać kilka wersji. Później pobierzesz je w zgłoszeniu.'),
      h('div', { class: 'actions' }, btn, h('button', { class: 'btn', type: 'button', text: 'Anuluj', onclick: () => { form.reset(); form.hidden = true; } }))
    );
    pur.bind(f.company_name, ind.select);
    return form;
  }

  async function viewLead(main, id) {
    const res = await q(api(`leads/${encodeURIComponent(id || '')}`));
    const lead = res.data && res.data.lead;
    const notes = res.data ? res.data.notes : [];
    const leadBriefs = res.data ? res.data.briefs || (res.data.brief ? [res.data.brief] : []) : [];
    const leadBrief = leadBriefs.length ? leadBriefs[leadBriefs.length - 1] : null;
    // Do strony wyboru logo: połączony brief, potem brief logo, potem pełny, na końcu brief strony
    const logoSource = ['merged', 'logo', 'pelny', 'strona'].map((k) => leadBriefs.filter((x) => (k === 'merged' ? x.merged_at : !x.merged_at && x.kind === k)).pop()).find(Boolean) || null;
    const leadLogo = res.data ? res.data.logo : null;
    const leadEmails = res.data ? res.data.emails || [] : [];
    const leadFiles = res.data ? res.data.files || [] : [];
    const mail = (res.data && res.data.mail) || { gmail: false, from: null };
    const mailer = leadMailer(lead, leadEmails, mail);
    if (!lead) {
      main.replaceChildren(h('a', { class: 'back', href: '#zgloszenia', text: '← Wszystkie zgłoszenia' }), h('div', { class: 'empty', text: 'Nie znaleziono zgłoszenia — mogło zostać usunięte.' }));
      return;
    }

    const link = (url) => (url ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer nofollow', text: url }) : '—');
    const dl = h(
      'dl',
      { class: 'dl' },
      [
        ['Data', fmtDate(lead.created_at)],
        ['Firma', lead.company_name],
        ['Rodzaj strony', lead.site_purpose === 'wizerunkowa' ? h('span', { class: 'status status--w_realizacji', text: 'Strona wizerunkowa (bez sprzedaży)' }) : 'Strona firmy'],
        ['Branża', lead.industry],
        ['Osoba kontaktowa', lead.contact_name],
        ['E-mail', h('a', { href: `mailto:${lead.email}`, text: lead.email })],
        ['Telefon', lead.phone ? h('a', { href: `tel:${lead.phone.replace(/[^\d+]/g, '')}`, text: lead.phone }) : '—'],
        ['Obecna strona', link(lead.website_url)],
        ['Facebook', link(lead.facebook_url)],
        ['Instagram', link(lead.instagram_url)],
      ].map(([k, v]) => [h('dt', { text: k }), h('dd', null, v)])
    );

    // Dane zgłoszenia + edycja (np. poprawienie błędnego adresu e-mail)
    const dataPanel = h('section', { class: 'panel' });
    function drawData(editing) {
      if (!editing) {
        dataPanel.replaceChildren(
          h('div', { class: 'brief-sec__head' }, h('h2', { text: 'Dane zgłoszenia' }), h('button', { class: 'btn btn--sm no-print', type: 'button', 'data-edit-lead': '', text: 'Edytuj dane', onclick: () => drawData(true) })),
          dl
        );
        return;
      }
      const f = {
        company_name: h('input', { type: 'text', maxlength: '150', value: lead.company_name, required: true }),
        contact_name: h('input', { type: 'text', maxlength: '100', value: lead.contact_name, required: true }),
        email: h('input', { type: 'email', maxlength: '254', value: lead.email, required: true }),
        phone: h('input', { type: 'tel', maxlength: '30', value: lead.phone || '' }),
        website_url: h('input', { type: 'url', maxlength: '500', value: lead.website_url || '', placeholder: 'https://' }),
        facebook_url: h('input', { type: 'url', maxlength: '500', value: lead.facebook_url || '', placeholder: 'https://' }),
        instagram_url: h('input', { type: 'url', maxlength: '500', value: lead.instagram_url || '', placeholder: 'https://' }),
        message: h('textarea', { rows: '6', maxlength: '5000' }),
      };
      f.message.value = lead.message || '';
      const ind = industryPicker(lead.industry);
      ind.select.addEventListener('change', () => (dirty = true));
      const pur = purposePicker(lead.site_purpose);
      pur.inputs.forEach((i) => i.addEventListener('change', () => (dirty = true)));
      Object.values(f).forEach((i) => i.addEventListener('input', () => (dirty = true)));
      const emsg = h('div', { 'aria-live': 'polite' });
      const save = h('button', { class: 'btn btn--primary', type: 'submit', text: 'Zapisz dane' });
      dataPanel.replaceChildren(
        h('h2', { text: 'Edycja danych zgłoszenia' }),
        h(
          'form',
          {
            novalidate: true,
            'data-lead-form': '',
            onsubmit: async (e) => {
              e.preventDefault();
              const payload = {};
              Object.keys(f).forEach((k) => (payload[k] = f[k].value.trim()));
              payload.industry = ind.get();
              payload.site_purpose = pur.get();
              if (!payload.company_name || !payload.contact_name || !payload.email) return emsg.replaceChildren(h('div', { class: 'alert alert--error', text: 'Nazwa firmy, osoba kontaktowa i e-mail są wymagane.' }));
              busy(save, true);
              const { error } = await q(api(`leads/${lead.id}`, { method: 'PATCH', body: payload }));
              busy(save, false);
              if (error) return emsg.replaceChildren(h('div', { class: 'alert alert--error', text: errMsg(error) }));
              dirty = false;
              toast(payload.email.toLowerCase() !== lead.email ? 'Dane zapisane. Kolejne wiadomości pójdą na nowy adres e-mail.' : 'Dane zgłoszenia zapisane.');
              route();
            },
          },
          pur.el,
          h('div', { class: 'grid-2' }, field('Nazwa firmy *', f.company_name), field('Branża', ind.select), ind.otherBox, field('Osoba kontaktowa *', f.contact_name), field('E-mail *', f.email), field('Telefon', f.phone), field('Obecna strona', f.website_url), field('Facebook', f.facebook_url), field('Instagram', f.instagram_url)),
          field('Oczekiwania / opis', f.message),
          h('p', { class: 'small muted', text: 'Zmieniasz dane zapisane w zgłoszeniu. Odpowiedzi klienta w briefie zostają bez zmian (popraw je przyciskiem „Popraw” przy briefie).' }),
          emsg,
          h('div', { class: 'actions' }, save, h('button', { class: 'btn', type: 'button', text: 'Anuluj', onclick: () => { dirty = false; drawData(false); } }))
        )
      );
      pur.bind(f.company_name, ind.select);
      f.email.focus();
    }
    drawData(false);

    // Status
    const statusSel = h('select', { class: 'input' }, STATUSES.map(([k, l]) => h('option', { value: k, text: l })));
    statusSel.value = lead.status;
    statusSel.addEventListener('change', async () => {
      statusSel.disabled = true;
      const { error: e } = await q(api(`leads/${lead.id}`, { method: 'PATCH', body: { status: statusSel.value } }));
      statusSel.disabled = false;
      if (e) {
        toast(`Nie zapisano statusu: ${errMsg(e)}`, 'error');
        statusSel.value = lead.status;
      } else {
        lead.status = statusSel.value;
        toast(`Status zmieniony na „${STATUS_LABEL[lead.status]}”.`);
      }
    });

    // Powiadomienie
    const notifBox = h('div', null);
    function drawNotif() {
      const ok = lead.notification_status === 'sent';
      notifBox.replaceChildren(
        h('p', null, h('span', { class: `status status--${ok ? 'zakonczone' : lead.notification_status === 'pending' ? 'kontakt' : 'failed'}`, text: NOTIF_LABEL[lead.notification_status] || lead.notification_status })),
        lead.notification_error ? h('p', { class: 'small muted', text: lead.notification_error }) : null,
        !ok
          ? h('button', {
              class: 'btn btn--sm',
              type: 'button',
              text: 'Wyślij powiadomienie ponownie',
              onclick: async (e) => {
                const b = e.currentTarget;
                busy(b, true, 'Wysyłam…');
                try {
                  const r = await api(`leads/${lead.id}/resend`, { method: 'POST' });
                  toast(r.message);
                  lead.notification_status = 'sent';
                  lead.notification_error = null;
                } catch (err) {
                  toast(err.message, 'error');
                  const fresh = await q(api(`leads/${lead.id}`));
                  if (fresh.data) Object.assign(lead, fresh.data.lead);
                }
                drawNotif();
              },
            })
          : null
      );
    }
    drawNotif();

    // Notatki
    const notesList = h('ul', { class: 'notes' });
    const noteItems = notes || [];
    function drawNotes() {
      notesList.replaceChildren(
        ...(noteItems.length
          ? noteItems.map((n) =>
              h(
                'li',
                { class: 'note' },
                h(
                  'div',
                  { class: 'note__meta' },
                  h('span', { text: fmtDate(n.created_at) }),
                  h('button', {
                    class: 'btn-link small',
                    type: 'button',
                    text: 'Usuń',
                    'aria-label': `Usuń notatkę z ${fmtDate(n.created_at)}`,
                    onclick: async () => {
                      if (!(await confirmDialog({ title: 'Usunąć notatkę?', text: 'Notatka zostanie trwale usunięta.' }))) return;
                      const { error: e } = await q(api(`notes/${n.id}`, { method: 'DELETE' }));
                      if (e) return toast(errMsg(e), 'error');
                      noteItems.splice(noteItems.indexOf(n), 1);
                      drawNotes();
                      toast('Notatka usunięta.');
                    },
                  })
                ),
                h('div', { class: 'note__body', text: n.body })
              )
            )
          : [h('li', { class: 'muted small', text: 'Brak notatek. Notatki są prywatne — widzisz je tylko Ty.' })])
      );
    }
    drawNotes();
    const noteInput = h('textarea', { rows: '3', maxlength: '5000', placeholder: 'Np. „Zadzwoniłem 12.10, czekam na zdjęcia”' });
    const noteForm = h(
      'form',
      {
        onsubmit: async (e) => {
          e.preventDefault();
          const body = noteInput.value.trim();
          if (!body) return toast('Notatka jest pusta.', 'error');
          const b = noteForm.querySelector('button');
          busy(b, true);
          const { data: nd, error: err } = await q(api(`leads/${lead.id}/notes`, { method: 'POST', body: { body } }));
          const n = nd && nd.note;
          busy(b, false);
          if (err) return toast(`Nie zapisano notatki: ${errMsg(err)}`, 'error');
          noteItems.push(n);
          noteInput.value = '';
          drawNotes();
          toast('Notatka zapisana.');
        },
      },
      field('Nowa notatka', noteInput),
      h('button', { class: 'btn btn--primary btn--sm', type: 'submit', text: 'Dodaj notatkę' })
    );

    const subject = encodeURIComponent(`Strona internetowa dla ${lead.company_name}`);
    main.replaceChildren(
      h('a', { class: 'back', href: '#zgloszenia', text: '← Wszystkie zgłoszenia' }),
      head(
        lead.company_name,
        `${lead.source === 'reczne' ? 'Dodane ręcznie' : 'Zgłoszenie'} z ${fmtDate(lead.created_at)}`,
        h('button', { class: 'btn btn--primary', type: 'button', text: 'Napisz e-mail', onclick: () => mailer.compose('wlasna', `Strona internetowa dla ${lead.company_name}`, `Dzień dobry,\n\n\n\n${SIGN}`) })
      ),
      leadBriefHub(lead, leadBriefs, leadLogo, mailer),
      leadFilesSection(lead, leadFiles, leadBriefs),
      h(
        'div',
        { class: 'detail-grid' },
        h('div', null, dataPanel, h('section', { class: 'panel' }, h('h2', { text: 'Oczekiwania' }), h('div', { class: 'message-box', text: lead.message }))),
        h(
          'div',
          null,
          h('section', { class: 'panel' }, h('h2', { text: 'Status' }), field('Status zgłoszenia', statusSel, 'Zmiana zapisuje się od razu.')),
          lead.source === 'reczne'
            ? h('section', { class: 'panel' }, h('h2', { text: 'Źródło' }), h('p', { class: 'small muted', text: 'Zgłoszenie dodane ręcznie w panelu (kontakt mailowy lub telefoniczny).' }))
            : h('section', { class: 'panel' }, h('h2', { text: 'Powiadomienie e-mail' }), notifBox),
          h('section', { class: 'panel' }, h('h2', { text: 'Prywatne notatki' }), notesList, noteForm),
          h(
            'section',
            { class: 'panel' },
            h('h2', { text: 'Usuwanie danych' }),
            h('p', { class: 'small muted', text: 'Usunięcie zgłoszenia trwale kasuje dane kontaktowe, notatki i przypięty brief. Użyj tego np. na prośbę zgłaszającego. To co innego niż wyłączenie naboru w Ustawieniach.' }),
            h('button', {
              class: 'btn btn--danger-outline',
              type: 'button',
              text: 'Usuń zgłoszenie',
              onclick: async () => {
                const ok = await confirmDialog({ title: 'Usunąć zgłoszenie?', text: `Zgłoszenie firmy „${lead.company_name}”, jego notatki${leadBrief ? (leadBriefs.length > 1 ? ' i przypięte briefy' : ' i przypięty brief') : ''} zostaną trwale usunięte. Tej operacji nie można cofnąć.`, ok: 'Usuń na stałe' });
                if (!ok) return;
                const { error: e } = await q(api(`leads/${lead.id}`, { method: 'DELETE' }));
                if (e) return toast(errMsg(e), 'error');
                toast('Zgłoszenie usunięte.');
                location.hash = '#zgloszenia';
              },
            })
          )
        )
      ),
      leadBriefSection(lead, leadBriefs, mailer, leadLogo),
      leadLogoSection(lead, leadLogo, logoSource, mailer),
      mailer.el
    );
  }

  /** Sekcja „Brief projektowy” w szczegółach zgłoszenia. */
  const SIGN = 'Pozdrawiam\nGrzegorz\nStrony AI Wrocław';

  /** Sekcja „E-mail do klienta”: pisanie i wysyłka z konta Gmail + historia wysłanych wiadomości. */
  function leadMailer(lead, emails, mail) {
    const subject = h('input', { type: 'text', maxlength: '200' });
    const bodyIn = h('textarea', { rows: '11', maxlength: '10000' });
    let kind = 'wlasna';
    const msg = h('div', { 'aria-live': 'polite' });
    const history = h('div');
    const KIND = { brief: 'Brief', logo: 'Wybór logo', wlasna: 'Wiadomość' };
    function drawHistory() {
      history.replaceChildren(
        h('h3', { text: `Wysłane wiadomości (${emails.length})` }),
        emails.length
          ? h('ul', { class: 'notes' }, emails.map((m) =>
              h('li', { class: 'note' },
                h('div', { class: 'note__meta' }, h('span', { text: `${fmtDate(m.created_at)} · ${KIND[m.kind] || 'Wiadomość'} · do ${m.to_email}` }), h('span', { class: `status status--${m.status === 'sent' ? 'zakonczone' : 'failed'}`, text: m.status === 'sent' ? 'Wysłana' : 'Niewysłana' })),
                h('details', null, h('summary', { text: m.subject }), h('div', { class: 'note__body', text: m.body }), m.error ? h('p', { class: 'small muted', text: m.error }) : null)
              )))
          : h('p', { class: 'small muted', text: 'Nie wysłano jeszcze żadnej wiadomości z panelu.' })
      );
    }
    drawHistory();
    const gmailUrl = () => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(subject.value)}&body=${encodeURIComponent(bodyIn.value)}`;
    const sendBtn = h('button', { class: 'btn btn--primary', type: 'submit', 'data-send-email': '', text: mail.gmail ? `Wyślij z ${mail.from}` : 'Wyślij' });
    const form = h(
      'form',
      {
        novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          msg.replaceChildren();
          if (subject.value.trim().length < 3) { subject.focus(); return msg.replaceChildren(h('div', { class: 'alert alert--error', text: 'Wpisz temat wiadomości.' })); }
          if (bodyIn.value.trim().length < 10) { bodyIn.focus(); return msg.replaceChildren(h('div', { class: 'alert alert--error', text: 'Wpisz treść wiadomości.' })); }
          busy(sendBtn, true, 'Wysyłam…');
          let res;
          try {
            res = await fetch(`/api/admin/leads/${lead.id}/email`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Panel': '1' }, body: JSON.stringify({ kind, subject: subject.value.trim(), body: bodyIn.value }) });
          } catch {
            busy(sendBtn, false);
            return msg.replaceChildren(h('div', { class: 'alert alert--error', text: 'Brak połączenia z serwerem.' }));
          }
          const d = await res.json().catch(() => ({}));
          busy(sendBtn, false);
          if (d.item) { emails.unshift(d.item); drawHistory(); }
          if (!res.ok || !d.ok) return msg.replaceChildren(h('div', { class: 'alert alert--error', text: d.message || `Nie wysłano (${res.status}).` }));
          msg.replaceChildren(h('div', { class: 'alert alert--ok', text: `${d.message} Kopia jest w folderze „Wysłane” w Gmailu.` }));
          toast('Wiadomość wysłana.');
          subject.value = '';
          bodyIn.value = '';
          kind = 'wlasna';
        },
      },
      h('p', { class: 'small' }, 'Do: ', h('strong', { text: `${lead.contact_name} <${lead.email}>` })),
      field('Temat', subject),
      field('Treść', bodyIn),
      msg,
      mail.gmail
        ? h('div', { class: 'actions' }, sendBtn, h('button', { class: 'btn', type: 'button', text: 'Otwórz w Gmailu', onclick: () => window.open(gmailUrl(), '_blank', 'noopener') }))
        : h('div', null,
            h('div', { class: 'alert alert--info' }, 'Wysyłka prosto z panelu nie jest jeszcze włączona. Dodaj w Cloudflare zmienne GMAIL_USER i GMAIL_APP_PASSWORD (instrukcja: docs/EMAIL.md). Do tego czasu wiadomość otworzysz w Gmailu jednym kliknięciem.'),
            h('div', { class: 'actions' },
              h('button', { class: 'btn btn--primary', type: 'button', 'data-open-gmail': '', text: 'Otwórz w Gmailu', onclick: () => window.open(gmailUrl(), '_blank', 'noopener') }),
              h('button', { class: 'btn', type: 'button', text: 'Otwórz w programie pocztowym', onclick: () => { location.href = `mailto:${lead.email}?subject=${encodeURIComponent(subject.value)}&body=${encodeURIComponent(bodyIn.value)}`; } })))
    );
    const el = h('section', { class: 'panel no-print', id: 'email-klienta' }, h('h2', { text: 'E-mail do klienta' }), form, history);
    return {
      el,
      compose(k, subj, text) {
        kind = k;
        subject.value = subj;
        bodyIn.value = text;
        msg.replaceChildren();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => bodyIn.focus({ preventScroll: true }), 300);
      },
    };
  }

  const svgUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  /**
   * Czyta z pliku z propozycjami nazwy opcji, hasła i wygląd każdego logo (SVG).
   * 1) blok <script id="logo-options"> (nazwa, hasła, opcjonalnie svg), 2) pierwsze logo SVG pod nagłówkiem „Opcja N”.
   */
  function extractLogoOptions(html) {
    let meta = [];
    const m = /<script[^>]*id=["']logo-options["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
    if (m) {
      try {
        const j = JSON.parse(m[1]);
        if (j && Array.isArray(j.options)) meta = j.options;
      } catch {
        meta = [];
      }
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const css = Array.from(doc.querySelectorAll('style')).map((x) => x.textContent).join('\n');
    const NS = 'http://www.w3.org/2000/svg';
    const prep = (svgText) => {
      // samodzielny plik SVG: przestrzeń nazw, style strony (żeby klasy działały), rozmiar
      const d = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      const root = d.documentElement;
      if (!root || root.nodeName.toLowerCase() !== 'svg' || d.querySelector('parsererror')) return '';
      if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', NS);
      root.querySelectorAll('script, foreignObject').forEach((x) => x.remove());
      if (!root.getAttribute('viewBox') && root.getAttribute('width') && root.getAttribute('height')) root.setAttribute('viewBox', `0 0 ${parseFloat(root.getAttribute('width'))} ${parseFloat(root.getAttribute('height'))}`);
      if (css && css.length < 40000 && root.querySelector('[class]')) {
        const st = d.createElementNS(NS, 'style');
        st.textContent = css;
        root.insertBefore(st, root.firstChild);
      }
      const out = new XMLSerializer().serializeToString(root);
      return out.length <= 120000 ? out : '';
    };
    // logo pod nagłówkami „Opcja N”
    const found = {};
    const marks = [];
    const walker = doc.createTreeWalker(doc.body || doc, NodeFilter.SHOW_ELEMENT);
    let node;
    let cur = 0;
    while ((node = walker.nextNode())) {
      const tag = node.nodeName.toLowerCase();
      if (/^h[1-6]$/.test(tag) || node.id) {
        const mm = /^\s*opcja\s*(\d)\b/i.exec(node.textContent || '') || /^opcja-?(\d)$/i.exec(node.id || '');
        if (mm && Number(mm[1]) !== cur && /^h[1-6]$|^section$|^article$|^div$/.test(tag)) { cur = Number(mm[1]); marks.push(cur); }
      }
      if (tag === 'svg' && cur && !found[cur]) {
        const w = parseFloat(node.getAttribute('width')) || 0;
        const big = node.querySelectorAll('*').length >= 2 && (w === 0 || w >= 48);
        if (big) found[cur] = prep(node.outerHTML);
      }
    }
    const count = Math.min(8, Math.max(meta.length, marks.length ? Math.max(...marks) : 0));
    const options = [];
    for (let i = 0; i < count; i++) {
      const o = meta[i] || {};
      const own = typeof o.svg === 'string' && /^\s*<svg[\s>]/i.test(o.svg) ? prep(o.svg) : '';
      options.push({ name: String(o.name || ''), taglines: Array.isArray(o.taglines) ? o.taglines.map(String) : [], svg: own || found[i + 1] || '' });
    }
    return options;
  }

  /** Sekcja „Logo i hasło — propozycje dla klienta”. */
  function leadLogoSection(lead, logo, brief, mailer) {
    const box = h('section', { class: 'panel no-print', id: 'logo-zgloszenia' }, h('h2', { text: 'Logo i hasło — propozycje dla klienta' }));
    const link = logo ? `${location.origin}/logo/${logo.token}` : '';
    const input = h('input', { type: 'file', accept: '.html,.htm,text/html', hidden: true, id: 'logo-html', 'aria-label': 'Plik HTML z propozycjami logo' });
    const progress = h('div', { 'aria-live': 'polite' });
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      progress.replaceChildren(h('p', { class: 'small muted', text: 'Wgrywam…' }));
      try {
        if (f.size > 8 * 1024 * 1024) throw new Error('Plik jest za duży (maksymalnie 8 MB).');
        const text = await f.text();
        const options = extractLogoOptions(text);
        const light = options.map((o) => ({ name: o.name, taglines: o.taglines }));
        const res = await fetch(`/api/admin/leads/${lead.id}/logo?name=${encodeURIComponent(f.name)}&options=${encodeURIComponent(JSON.stringify(light))}`, { method: 'PUT', credentials: 'same-origin', headers: { 'X-Panel': '1', 'Content-Type': 'application/octet-stream', Accept: 'application/json' }, body: await f.arrayBuffer() });
        const d = await res.json().catch(() => ({}));
        if (!res.ok || !d.ok) throw new Error(d.message || `Nie wgrano pliku (${res.status}).`);
        if (options.some((o) => o.svg)) await q(api(`leads/${lead.id}/logo`, { method: 'PATCH', body: { options } }));
        else await q(api(`leads/${lead.id}/logo`, { method: 'PATCH', body: { options: [] } }));
        toast(options.length ? `Wgrano propozycje (${options.length} opcje z nazwami i hasłami).` : 'Wgrano propozycje. W pliku nie było bloku z nazwami opcji — klient wybierze „Opcja 1–4”.');
        await route();
        const t = $('#logo-zgloszenia');
        if (t) t.scrollIntoView({ behavior: 'smooth' });
      } catch (e) {
        input.value = '';
        progress.replaceChildren(h('div', { class: 'alert alert--error', text: errMsg(e) }));
      }
    });
    const pick = h('button', { class: `btn btn--sm${logo ? '' : ' btn--primary'}`, type: 'button', 'data-logo-pick': '', text: logo ? 'Wgraj nową wersję (zastąpi obecną)' : 'Wgraj plik HTML z propozycjami…', onclick: () => input.click() });
    const P = window.BRIEF_PROMPTS;
    const a = brief && brief.answers;
    const promptBtn = P && a
      ? h('button', { class: 'btn btn--sm', type: 'button', text: 'Kopiuj polecenie dla AI (4 opcje + ZIP)', onclick: () => {
          const S = window.BRIEF_SCHEMA;
          if (S && S.setKind) S.setKind(brief && !brief.merged_at ? brief.kind : 'pelny', a || {});
          try {
            promptPreview('Polecenie: propozycje logo i hasła', P.logoPage(a, { company_name: lead.company_name }), 'Skopiowano polecenie: strona z propozycjami logo i hasła.');
          } finally {
            if (S && S.setKind) S.setKind('pelny');
          }
        } })
      : null;

    if (!logo) {
      box.append(
        h('ol', { class: 'steps-list small' },
          h('li', { text: a ? 'Skopiuj polecenie dla AI (przycisk poniżej) — AI przygotuje plik wybor-logo.html z 4 opcjami oraz ZIP z plikami logo.' : 'Gdy klient wypełni brief, pojawi się tu przycisk z gotowym poleceniem dla AI. Możesz też wgrać własny plik HTML z propozycjami.' }),
          h('li', { text: 'Wgraj tutaj plik wybor-logo.html.' }),
          h('li', { text: 'Wyślij klientowi link. Klient ogląda propozycje, zaznacza opcję i hasło, dopisuje uwagi — a jego wybór zapisuje się w tym zgłoszeniu.' })
        ),
        h('div', { class: 'actions' }, promptBtn, pick),
        input,
        progress
      );
      return box;
    }

    const opt = (logo.options || []).find((o) => o.nr === logo.choice_option);
    const hasPreviews = (logo.options || []).some((o) => o.svg);
    const gallery = h('div', { class: 'logo-gallery', 'data-logo-gallery': '' },
      (logo.options || []).map((o) =>
        h('figure', { class: `logo-thumb${o.nr === logo.choice_option ? ' is-chosen' : ''}` },
          o.svg ? h('img', { src: svgUri(o.svg), alt: `Logo — opcja ${o.nr}${o.name ? `: ${o.name}` : ''}` }) : h('div', { class: 'logo-thumb__none', text: 'brak podglądu' }),
          h('figcaption', null, h('strong', { text: `Opcja ${o.nr}` }), o.name ? ` · ${o.name}` : '', o.nr === logo.choice_option ? h('span', { class: 'status status--zakonczone', text: 'Wybrana' }) : null))));
    // Starsze propozycje (wgrane przed tą funkcją): jednorazowo odczytaj wygląd opcji z zapisanego pliku
    if (!hasPreviews && !logo.scanned) {
      (async () => {
        try {
          const r = await fetch(`/logo/${logo.token}/propozycje`, { credentials: 'same-origin' });
          if (!r.ok) return;
          const options = extractLogoOptions(await r.text());
          const { data } = await q(api(`leads/${lead.id}/logo`, { method: 'PATCH', body: { options } }));
          if (data && data.options.some((o) => o.svg) && location.hash === `#zgloszenie/${lead.id}`) route();
        } catch (e) {
          console.error(e);
        }
      })();
    }
    box.append(
      logo.chosen_at
        ? h('div', { class: 'logo-choice' },
            h('p', { class: 'logo-choice__head' }, h('span', { class: 'status status--zakonczone', text: 'Klient wybrał' }), ` ${fmtDate(logo.chosen_at)}`),
            h('p', { class: 'logo-choice__main', text: `Opcja ${logo.choice_option}${logo.choice_name || (opt && opt.name) ? ` — ${logo.choice_name || opt.name}` : ''}` }),
            opt && opt.svg
              ? h('div', { class: 'logo-chosen', 'data-logo-chosen': '' }, h('img', { src: svgUri(opt.svg), alt: `Wybrane logo — opcja ${logo.choice_option}` }), h('div', { class: 'logo-chosen__dark' }, h('img', { src: svgUri(opt.svg), alt: '' })))
              : h('p', { class: 'small' }, h('a', { href: `/logo/${logo.token}/propozycje#opcja-${logo.choice_option}`, target: '_blank', rel: 'noopener noreferrer', text: 'Zobacz wybraną opcję w pliku z propozycjami ↗' })),
            h('dl', { class: 'dl' },
              h('dt', { text: 'Hasło' }), h('dd', { text: logo.choice_tagline || '—' }),
              h('dt', { text: 'Akceptacja kierunku' }), h('dd', { text: logo.choice_accepted ? 'Tak — zaakceptowano' : 'Nie zaznaczono' }),
              h('dt', { text: 'Uwagi i poprawki' }), h('dd', { style: 'white-space:pre-wrap', text: logo.choice_notes || '—' })))
        : h('p', { class: 'alert alert--info', text: logo.opened_at ? `Klient otworzył propozycje ${fmtDate(logo.opened_at)}, ale jeszcze nie zapisał wyboru.` : 'Klient jeszcze nie otworzył linku z propozycjami.' }),
      hasPreviews ? h('div', null, h('h3', { class: 'logo-gallery__title', text: 'Wszystkie opcje' }), gallery) : null,
      h('p', { class: 'small muted', text: `Plik: ${logo.file_name} · ${fmtSize(logo.size_bytes || 0)} · wgrany ${fmtDate(logo.created_at)} · opcje: ${(logo.options || []).map((o) => o.name || `Opcja ${o.nr}`).join(', ')}` }),
      h('p', { class: 'brief-link' }, h('span', { class: 'small muted', text: 'Link dla klienta: ' }), h('code', { text: link })),
      h('div', { class: 'actions' },
        h('button', { class: `btn${logo.chosen_at ? '' : ' btn--primary'}`, type: 'button', 'data-logo-mail': '', text: 'Wyślij link e-mailem', onclick: () => mailer.compose('logo', `Propozycje logo — ${lead.company_name}`, `Dzień dobry,\n\nprzygotowałem propozycje logo i hasła dla ${lead.company_name}. Proszę obejrzeć je pod poniższym linkiem i zaznaczyć opcję, która podoba się najbardziej — można też dopisać uwagi i poprawki:\n\n${link}\n\nWybór zapisze się u mnie automatycznie. Propozycje są wstępne: wybraną opcję dopracuję i przygotuję komplet plików.\n\n${SIGN}`) }),
        h('button', { class: 'btn', type: 'button', text: 'Kopiuj link', onclick: () => copyText(link, 'Link skopiowany.') }),
        h('a', { class: 'btn', href: `/logo/${logo.token}`, target: '_blank', rel: 'noopener noreferrer', text: 'Otwórz jak klient ↗' })),
      h('div', { class: 'actions' }, promptBtn, pick,
        h('button', { class: 'btn btn--sm btn--danger-outline', type: 'button', text: 'Usuń propozycje', onclick: async () => {
          if (!(await confirmDialog({ title: 'Usunąć propozycje logo?', text: 'Plik z propozycjami i zapisany wybór klienta zostaną usunięte, a link przestanie działać.' }))) return;
          const { error } = await q(api(`leads/${lead.id}/logo`, { method: 'DELETE' }));
          if (error) return toast(errMsg(error), 'error');
          toast('Propozycje usunięte.');
          route();
        } })),
      input,
      progress
    );
    return box;
  }

  const KIND_NAME = { pelny: 'Kompleksowy (logo + hasło + strona)', strona: 'Strona internetowa', logo: 'Logo i hasło' };
  const KIND_DESC = {
    pelny: 'Jeden pełny formularz: firma, strona, logo i hasło (ok. 15–20 min).',
    strona: 'Tylko strona internetowa — o logo i haśle pyta krótko (ok. 15 min).',
    logo: 'Krótki formularz tylko o logo, haśle i kolorach (ok. 5–8 min).',
  };
  const briefName = (b) => (b.merged_at ? 'Brief połączony (strona + logo i hasło)' : `Brief: ${KIND_NAME[b.kind] || KIND_NAME.pelny}`);

  // =========================================================
  // PLIKI OD KLIENTA (logo, zdjęcia)
  // =========================================================
  const fileUrl = (f, opts = '') => `/api/admin/files/${f.id}${opts}`;
  const fmtBytes = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  /** Prosty ZIP (bez kompresji — zdjęcia i tak są skompresowane). */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function makeZip(entries) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    entries.forEach(({ name, data }) => {
      const nb = enc.encode(name);
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(lh.buffer), nb, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nb);
      offset += 30 + nb.length + data.length;
    });
    const csize = central.reduce((n, p) => n + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const slugName = (t) => String(t || 'klient').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'klient';

  /** Zdjęcie przed wysłaniem: do 2560 px (JPEG) + miniatura 480 px. Logo — bez zmian. */
  async function prepUpload(kind, file) {
    if (kind !== 'photo' || !window.createImageBitmap) return { main: file };
    const bmp = await createImageBitmap(file);
    const draw = (max, q) => {
      const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * sc);
      c.height = Math.round(bmp.height * sc);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise((res) => c.toBlob((b) => res({ b, w: c.width, h: c.height }), 'image/jpeg', q));
    };
    const m = await draw(2560, 0.85);
    const t = await draw(480, 0.75);
    return { main: m.b, thumb: t.b, w: m.w, h: m.h };
  }
  /** Wysyła pliki do zgłoszenia. Zwraca { done, errors }. */
  async function uploadLeadFiles(leadId, kind, list, onProgress) {
    let done = 0;
    const errors = [];
    const arr = [...list];
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      if (onProgress) onProgress(i + 1, arr.length);
      try {
        const p = await prepUpload(kind, file);
        const fd = new FormData();
        fd.append('kind', kind);
        fd.append('name', file.name);
        fd.append('file', p.main, file.name);
        if (p.thumb) fd.append('thumb', p.thumb, 'thumb.jpg');
        if (p.w) { fd.append('width', String(p.w)); fd.append('height', String(p.h)); }
        const r = await fetch(`/api/admin/leads/${leadId}/files`, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Panel': '1', Accept: 'application/json' } });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.ok) throw new Error(d.message || `błąd ${r.status}`);
        done++;
      } catch (e) {
        errors.push(`${file.name}: ${/decode|source|bitmap/i.test(String(e.message)) ? 'nie mogę odczytać tego formatu (zapisz jako JPG)' : e.message}`);
      }
    }
    return { done, errors };
  }

  function leadFilesSection(lead, files, briefs) {
    const logos = files.filter((f) => f.kind === 'logo');
    const photos = files.filter((f) => f.kind === 'photo');
    const hasLogoAnswer = briefs.some((b) => b.answers && ['tak_wektor', 'tak_obraz', 'odswiezenie'].includes(b.answers.logo));
    const status = h('p', { class: 'small', 'aria-live': 'polite' });
    const picker = (kind, label) => {
      const inp = h('input', { type: 'file', multiple: true, hidden: true, accept: kind === 'logo' ? '.svg,.pdf,.png,.jpg,.jpeg,.webp' : 'image/jpeg,image/png,image/webp', 'data-admin-upload': kind });
      const btn = h('button', { class: 'btn btn--sm', type: 'button', text: label, onclick: () => inp.click() });
      inp.addEventListener('change', async () => {
        if (!inp.files.length) return;
        busy(btn, true, 'Wgrywam…');
        const r = await uploadLeadFiles(lead.id, kind, inp.files, (i, n) => (status.textContent = `Wgrywam ${i} z ${n}…`));
        busy(btn, false);
        inp.value = '';
        status.textContent = r.errors.length ? `Nie wgrano: ${r.errors.join('; ')}` : '';
        if (r.done) { toast(kind === 'logo' ? 'Logo dodane do zgłoszenia.' : `Dodano zdjęcia: ${r.done}.`); route(); }
      });
      return [inp, btn];
    };
    const del = (f) =>
      h('button', {
        class: 'btn btn--sm btn--danger-outline', type: 'button', text: 'Usuń', 'aria-label': `Usuń plik ${f.name}`,
        onclick: async () => {
          if (!(await confirmDialog({ title: 'Usunąć plik?', text: `Plik „${f.name}” zostanie trwale usunięty.`, ok: 'Usuń' }))) return;
          const { error } = await q(api(`files/${f.id}`, { method: 'DELETE' }));
          if (error) return toast(errMsg(error), 'error');
          toast('Plik usunięty.');
          route();
        },
      });
    const src = (f) => (f.source === 'admin' ? 'dodane w panelu' : 'od klienta (brief)');
    const logoCards = logos.map((f) =>
      h(
        'figure',
        { class: 'file-logo', 'data-file': f.id },
        /^image\//.test(f.content_type)
          ? h('div', { class: 'file-logo__previews' }, h('div', { class: 'file-logo__light' }, h('img', { src: fileUrl(f), alt: `Logo klienta: ${f.name}` })), h('div', { class: 'file-logo__dark' }, h('img', { src: fileUrl(f), alt: '' })))
          : h('div', { class: 'file-logo__pdf', text: 'PDF' }),
        h('figcaption', null, h('strong', { text: f.name }), h('span', { class: 'small muted', text: ` ${fmtBytes(f.size_bytes)} · ${src(f)} · ${fmtDate(f.created_at)}` })),
        h('div', { class: 'actions' }, h('a', { class: 'btn btn--sm btn--primary', href: fileUrl(f, '?download=1'), download: f.name, 'data-download': f.id, text: 'Pobierz plik' }), del(f))
      )
    );
    const zipBtn = h('button', {
      class: 'btn btn--sm btn--primary', type: 'button', text: `Pobierz wszystkie zdjęcia (ZIP, ${photos.length})`, 'data-photos-zip': '',
      onclick: async () => {
        busy(zipBtn, true, 'Przygotowuję ZIP…');
        try {
          const used = new Set();
          const entries = [];
          for (const f of photos) {
            const r = await fetch(fileUrl(f, '?download=1'), { credentials: 'same-origin' });
            if (!r.ok) throw new Error(`Nie pobrano ${f.name}`);
            let n = f.name;
            for (let i = 2; used.has(n); i++) n = f.name.replace(/(\.[a-z0-9]+)$/i, `-${i}$1`);
            used.add(n);
            entries.push({ name: n, data: new Uint8Array(await r.arrayBuffer()) });
          }
          saveBlob(makeZip(entries), `zdjecia-${slugName(lead.company_name)}.zip`);
        } catch (e) {
          toast(e.message, 'error');
        }
        busy(zipBtn, false);
      },
    });
    return h(
      'section',
      { class: 'panel files-panel', id: 'pliki-zgloszenia', 'aria-labelledby': 'files-title' },
      h('div', { class: 'brief-sec__head' }, h('h2', { id: 'files-title', text: 'Logo i zdjęcia od klienta' }), h('span', { class: 'small muted', text: `${logos.length} logo · ${photos.length} zdjęć` })),
      h('h3', { text: 'Logo' }),
      logos.length
        ? h('div', { class: 'file-logos' }, logoCards)
        : h('p', { class: 'small muted', text: hasLogoAnswer ? 'Klient zaznaczył w briefie, że ma logo, ale jeszcze go nie wgrał. Jeśli przysłał je e-mailem — dodaj je tutaj.' : 'Brak logo. Klient może je wgrać w briefie, a Ty możesz dodać je tutaj (np. gdy przyśle je e-mailem).' }),
      h('div', { class: 'actions' }, ...picker('logo', logos.length ? '+ Dodaj kolejny plik logo' : '+ Dodaj logo')),
      h('h3', { text: 'Zdjęcia' }),
      photos.length
        ? h(
            'ul',
            { class: 'file-photos' },
            photos.map((f) =>
              h('li', { 'data-file': f.id },
                h('a', { href: fileUrl(f), target: '_blank', rel: 'noopener', 'aria-label': `Otwórz zdjęcie ${f.name}` }, h('img', { src: fileUrl(f, f.has_thumb ? '?thumb=1' : ''), alt: `Zdjęcie od klienta: ${f.name}`, loading: 'lazy', decoding: 'async' })),
                h('div', { class: 'file-photos__bar' },
                  h('span', { class: 'small', text: `${fmtBytes(f.size_bytes)}${f.width ? ` · ${f.width}×${f.height}` : ''}` }),
                  h('a', { class: 'link-btn', href: fileUrl(f, '?download=1'), download: f.name, text: 'Pobierz' }),
                  h('button', { class: 'link-btn link-btn--danger', type: 'button', text: 'Usuń', onclick: () => del(f).click() })
                )
              )
            )
          )
        : h('p', { class: 'small muted', text: 'Brak zdjęć. Klient może je wgrać w briefie (do 40 zdjęć). Większe paczki i filmy — przez link do folderu (Google Drive, Dropbox, WeTransfer) w briefie.' }),
      h('div', { class: 'actions' }, photos.length ? zipBtn : null, ...picker('photo', '+ Dodaj zdjęcia')),
      status
    );
  }

  /** Wybór logo klienta (strona wyboru) jako dane do polecenia dla AI. */
  function logoChoice(logo) {
    if (!logo || !logo.choice_option) return null;
    const opt = (logo.options || []).find((o) => o.nr === logo.choice_option) || {};
    return { option: logo.choice_option, name: logo.choice_name || opt.name || '', tagline: logo.choice_tagline || '', notes: logo.choice_notes || '', accepted: Boolean(logo.choice_accepted), svg: opt.svg || '' };
  }

  /** Uruchamia funkcję z ustawionym rodzajem briefu (pytania zależą od rodzaju). */
  function withKind(b, fn) {
    const S = window.BRIEF_SCHEMA;
    if (S && S.setKind) S.setKind(b && !b.merged_at ? b.kind || 'pelny' : 'pelny', (b && b.answers) || {});
    try {
      return fn();
    } finally {
      if (S && S.setKind) S.setKind('pelny');
    }
  }

  /** Centrum briefów na górze zgłoszenia: briefy w dwóch kolumnach, łączenie i polecenia dla AI. */
  function leadBriefHub(lead, briefs, logo, mailer) {
    const hub = h('section', { class: 'panel brief-hub no-print', id: 'briefy-zgloszenia', 'aria-labelledby': 'brief-hub-title' });
    const own = briefs.filter((x) => !x.merged_at);
    const last = (k) => own.filter((x) => x.kind === k).pop();
    const full = last('pelny');
    const logoB = last('logo');
    const siteB = last('strona');
    const merged = briefs.find((x) => x.merged_at);
    const choice = logoChoice(logo);
    const jump = (b) => () => {
      const t = document.getElementById(`brief-${b.id}`);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const create = (kind, btn) => async () => {
      busy(btn, true, 'Tworzę…');
      const { error } = await q(api(`leads/${lead.id}/brief`, { method: 'POST', body: { kind } }));
      busy(btn, false);
      if (error) return toast(errMsg(error), 'error');
      toast('Brief utworzony — wyślij klientowi link e-mailem albo go skopiuj.');
      await route();
      const t = $('#briefy-zgloszenia');
      if (t) t.scrollIntoView({ behavior: 'smooth' });
    };
    const newBtn = (kind, label, primary) => {
      const btn = h('button', { class: `btn${primary ? ' btn--primary' : ''}`, type: 'button', 'data-new-brief': kind, text: label });
      btn.addEventListener('click', create(kind, btn));
      return btn;
    };
    const sendBtn = (b) => {
      const company = b.company_name || lead.company_name;
      const isLogo = b.kind === 'logo';
      const subj = `${isLogo ? 'Brief logo i hasła' : 'Brief strony internetowej'} — ${company}`;
      const body = `Dzień dobry,\n\nzgodnie z rozmową przesyłam krótki formularz (brief), który pomoże mi ${isLogo ? 'przygotować logo i hasło' : b.kind === 'pelny' ? 'przygotować logo, hasło i stronę internetową' : 'przygotować stronę internetową'} dla ${company}:\n\n${briefLink(b.token)}\n\nWypełnienie zajmuje ${isLogo ? 'ok. 5–8 minut' : b.kind === 'strona' ? 'ok. 15 minut' : 'ok. 15–20 minut'}. Odpowiedzi zapisują się automatycznie, więc można przerwać i wrócić przez ten sam link. Jeśli czegoś nie wiesz — pomiń pytanie, omówimy to razem.\n\n${SIGN}`;
      return h('button', { class: `btn btn--sm${b.status === 'nowy' ? ' btn--primary' : ''}`, type: 'button', 'data-hub-mail': b.kind, text: 'Wyślij link', onclick: () => mailer.compose('brief', subj, body) });
    };
    const card = (title, desc, b, kind) =>
      h(
        'div',
        { class: `hub-card${b ? ' hub-card--on' : ''}`, 'data-hub-card': kind },
        h('div', { class: 'hub-card__head' }, h('h3', { text: title }), b ? h('span', { class: `status status--${BRIEF_CLASS[b.status]}`, text: BRIEF_STATUS[b.status] }) : null),
        h('p', { class: 'small muted', text: b ? `Utworzony ${fmtDate(b.created_at)}${b.submitted_at ? ` · wypełniony ${fmtDate(b.submitted_at)}` : b.opened_at ? ` · otwarty ${fmtDate(b.opened_at)}` : ''}` : desc }),
        h(
          'div',
          { class: 'actions' },
          b
            ? [
                h('button', { class: 'btn btn--sm', type: 'button', 'data-hub-open': kind, text: b.status === 'nowy' ? 'Szczegóły ↓' : 'Pokaż odpowiedzi ↓', onclick: jump(b) }),
                sendBtn(b),
                h('button', { class: 'btn btn--sm', type: 'button', text: 'Kopiuj link', onclick: () => copyText(briefLink(b.token), 'Link skopiowany.') }),
              ]
            : newBtn(kind, '+ Utwórz brief', false)
        )
      );

    const parts = [h('div', { class: 'brief-hub__head' }, h('h2', { id: 'brief-hub-title', text: 'Briefy i polecenia dla AI' }), h('a', { class: 'small', href: '/brief/podglad', target: '_blank', rel: 'noopener', text: 'Jak to widzi klient? ↗' }))];

    // 1) kompleksowy brief albo dwie kolumny
    if (full) {
      parts.push(h('div', { class: 'hub-grid hub-grid--one' }, card('Kompleksowy brief: logo + hasło + strona', '', full, 'pelny')));
    } else {
      if (!logoB && !siteB) {
        parts.push(
          h(
            'div',
            { class: 'hub-full' },
            h('div', null, h('strong', { text: 'Klient chce wszystko od podstaw?' }), h('p', { class: 'small muted', text: 'Jeden formularz: firma, logo, hasło i strona (ok. 15–20 min).' })),
            newBtn('pelny', 'Kompleksowy brief: logo + hasło + strona', true)
          ),
          h('p', { class: 'hub-or small muted', text: 'albo osobno — np. najpierw logo, potem strona:' })
        );
      }
      parts.push(
        h(
          'div',
          { class: 'hub-grid' },
          card('1. Logo i hasło', 'Krótki brief tylko o logo, haśle i kolorach (ok. 5–8 min).', logoB, 'logo'),
          card('2. Strona internetowa', 'Brief o stronie: sekcje, oferta, kontakt, funkcje (ok. 15 min).', siteB, 'strona')
        )
      );
    }

    // 2) łączenie
    if (logoB && siteB) {
      const ready = logoB.status === 'wyslany' && siteB.status === 'wyslany';
      const btn = h('button', { class: `btn btn--sm${merged ? '' : ' btn--primary'}`, type: 'button', 'data-merge-briefs': '', text: merged ? 'Połącz ponownie' : 'Połącz briefy w jeden' });
      btn.addEventListener('click', async () => {
        const S = window.BRIEF_SCHEMA;
        if (!S || !S.helpers.mergeAnswers) return toast('Nie wczytano definicji briefu.', 'error');
        if (!ready && !(await confirmDialog({ title: 'Połączyć niewypełnione briefy?', text: 'Co najmniej jeden brief nie został jeszcze wysłany przez klienta. Połączę odpowiedzi zapisane do tej pory — później możesz połączyć ponownie.', ok: 'Połącz', danger: false }))) return;
        busy(btn, true, 'Łączę…');
        const answers = S.helpers.mergeAnswers(siteB.answers || {}, logoB.answers || {});
        const { error } = await q(api(`leads/${lead.id}/brief/merge`, { method: 'POST', body: { answers } }));
        busy(btn, false);
        if (error) return toast(errMsg(error), 'error');
        toast(merged ? 'Połączony brief zaktualizowany.' : 'Briefy połączone w jeden.');
        await route();
        const t = $('#briefy-zgloszenia');
        if (t) t.scrollIntoView({ behavior: 'smooth' });
      });
      parts.push(
        h(
          'div',
          { class: 'hub-merge' },
          h('div', null,
            h('h3', { text: merged ? '3. Brief połączony' : '3. Połącz w jeden brief' }),
            h('p', { class: 'small muted', text: merged ? `Połączony ${fmtDate(merged.merged_at)}.${choice ? ` Wybrane logo: opcja ${choice.option}${choice.name ? ` „${choice.name}”` : ''}${choice.tagline ? `, hasło „${choice.tagline}”` : ''} — zostanie dołączone do polecenia na stronę.` : ''}` : 'Z obu briefów powstanie jeden pełny brief. Przy logo, haśle i kolorach liczą się odpowiedzi z briefu logo.' }),
            ready ? null : h('p', { class: 'small', text: 'Najlepiej połączyć, gdy klient wyśle oba briefy.' })
          ),
          h('div', { class: 'actions' }, merged ? h('button', { class: 'btn btn--sm', type: 'button', text: 'Pokaż połączony ↓', onclick: jump(merged) }) : null, btn)
        )
      );
    }

    // 3) polecenia dla AI
    const P = window.BRIEF_PROMPTS;
    const S = window.BRIEF_SCHEMA;
    const filled = (b) => b && (b.status === 'wyslany' || b.status === 'w_trakcie' || b.merged_at);
    const brandSrc = [merged, full, logoB].find(filled);
    const siteSrc = [merged, full].find(filled) || (filled(siteB) && !logoB ? siteB : null);
    if (P && S && (brandSrc || siteSrc)) {
      const metaOf = (b) => ({ company_name: (b.answers && b.answers.company_name) || lead.company_name });
      const needsBrand = brandSrc && withKind(brandSrc, () => S.helpers.needsLogo(brandSrc.answers || {}) || S.helpers.needsTagline(brandSrc.answers || {}));
      const aiLogo = h('button', {
        class: 'btn btn--primary', type: 'button', 'data-hub-ai': 'logo', disabled: !needsBrand,
        text: 'Prompt: zaprojektuj logo i hasło',
        onclick: () => withKind(brandSrc, () => promptPreview('Polecenie: zaprojektuj logo i hasło', P.logoPage(brandSrc.answers || {}, metaOf(brandSrc)), 'Skopiowano polecenie: projekt logo i hasła (4 opcje do wyboru + ZIP).')),
      });
      const aiSite = h('button', {
        class: 'btn btn--primary', type: 'button', 'data-hub-ai': 'site', disabled: !siteSrc,
        text: choice ? 'Prompt: cała strona z wybranym logo + SEO' : 'Prompt: cała strona + SEO',
        onclick: () => withKind(siteSrc, () => promptPreview('Polecenie: cała strona z panelem i SEO', P.site(siteSrc.answers || {}, metaOf(siteSrc), choice), 'Skopiowano polecenie: cała strona z panelem i SEO.')),
      });
      const note = [];
      if (!needsBrand) note.push('Projekt logo i hasła: klient nie prosi o logo ani hasło albo brief nie jest jeszcze wypełniony.');
      if (!siteSrc) note.push(logoB && siteB ? 'Polecenie na stronę będzie dostępne po połączeniu briefów.' : 'Polecenie na stronę będzie dostępne, gdy klient wypełni brief strony.');
      else if (needsBrand && !choice) note.push('Klient jeszcze nie wybrał logo — polecenie na stronę użyje tymczasowego logotypu (po wyborze kliknij przycisk ponownie, a wybrane logo i hasło dopiszą się same).');
      parts.push(
        h(
          'div',
          { class: 'hub-ai' },
          h('h3', { text: 'Polecenia dla AI (ChatGPT, Claude)' }),
          h('p', { class: 'small muted', text: 'Przycisk otwiera podgląd gotowego polecenia z odpowiedziami klienta — przejrzyj je, w razie potrzeby popraw i skopiuj do czatu.' }),
          h(
            'div',
            { class: 'hub-ai__grid' },
            h('div', { class: 'hub-ai__item' }, h('strong', { text: 'A. Logo i hasło' }), h('p', { class: 'small muted', text: '4 różne propozycje logo i haseł na stronie wyboru dla klienta + ZIP z plikami.' }), aiLogo),
            h('div', { class: 'hub-ai__item' }, h('strong', { text: 'B. Strona internetowa' }), h('p', { class: 'small muted', text: `Cała strona ze wszystkimi funkcjami z briefu, panelem do edycji i kompletnym SEO${choice ? ` — z wybranym logo (opcja ${choice.option})` : ''}.` }), aiSite)
          ),
          note.length ? h('ul', { class: 'small muted hub-ai__notes' }, ...note.map((t) => h('li', { text: t }))) : null
        )
      );
    }
    hub.append(...parts);
    return hub;
  }

  function leadBriefSection(lead, briefs, mailer, logo) {
    const box = h('section', { class: 'brief-attached', id: 'brief-zgloszenia' });
    if (!briefs.length) return box;
    const choice = logoChoice(logo);
    briefs.forEach((b) => {
      const wrap = h('div', { class: 'brief-item', id: `brief-${b.id}` });
      if (b.merged_at) wrap.setAttribute('data-brief-merged', '');
      wrap.append(
        h('p', { class: 'no-print brief-item__top' }, h('a', { href: '#briefy-zgloszenia', onclick: (e) => { e.preventDefault(); const t = $('#briefy-zgloszenia'); if (t) t.scrollIntoView({ behavior: 'smooth' }); }, text: '↑ Wróć do briefów' })),
        ...briefBlocks({ ...b, company_name: b.company_name || lead.company_name, contact_email: b.contact_email || lead.email }, { inLead: true, mailer, choice })
      );
      box.append(wrap);
    });
    return box;
  }

  // =========================================================
  // BRIEFY KLIENTÓW
  // =========================================================
  const BRIEF_STATUS = { nowy: 'Czeka na klienta', w_trakcie: 'Klient wypełnia', wyslany: 'Wypełniony' };
  const BRIEF_CLASS = { nowy: 'kontakt', w_trakcie: 'w_realizacji', wyslany: 'zakonczone' };
  const briefLink = (token) => `${location.origin}/brief/${token}`;

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg || 'Skopiowano do schowka.');
    } catch {
      const ta = h('textarea', { style: 'position:fixed;left:-9999px' });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast(okMsg || 'Skopiowano do schowka.');
    }
  }

  function briefMailto(b) {
    const logoKind = b.kind === 'logo';
    const subject = encodeURIComponent(`${logoKind ? 'Brief logo i hasła' : 'Brief strony internetowej'} — ${b.company_name}`);
    const text = encodeURIComponent(
      `Dzień dobry,\n\nzgodnie z rozmową przesyłam krótki formularz (brief), który pomoże mi ${logoKind ? 'przygotować logo i hasło' : 'przygotować stronę internetową'} dla ${b.company_name}:\n\n${briefLink(b.token)}\n\n` +
        `Wypełnienie zajmuje ${logoKind ? 'ok. 5–8 minut' : 'ok. 15 minut'}. Odpowiedzi zapisują się automatycznie, więc można przerwać i wrócić przez ten sam link. Jeśli czegoś nie wiesz — pomiń pytanie, omówimy to razem.\n\n` +
        `Pozdrawiam\nGrzegorz\nStrony AI Wrocław`
    );
    return `mailto:${b.contact_email || ''}?subject=${subject}&body=${text}`;
  }

  /** Panel działań + pełny podgląd odpowiedzi briefu. Używane w zgłoszeniu i w osobnym widoku briefu. */
  function briefBlocks(b, opts = {}) {
    const S = window.BRIEF_SCHEMA;
    const H = S && S.helpers;
    const P = window.BRIEF_PROMPTS;
    const kind = b.merged_at ? 'pelny' : b.kind || 'pelny';
    // Pytania i kroki zależą od rodzaju briefu — każde użycie schematu przełącza go na ten rodzaj
    const K = (fn) => (...args) => {
      if (S && S.setKind) S.setKind(kind, b.answers || {});
      try {
        return fn(...args);
      } finally {
        if (S && S.setKind) S.setKind('pelny');
      }
    };
    if (S && S.setKind) S.setKind(kind, b.answers || {});
    const kindLabel = b.merged_at ? 'połączony' : { pelny: 'strona + logo', strona: 'strona', logo: 'logo i hasło' }[kind];
    const isLogo = kind === 'logo';
    const mailWhat = isLogo ? 'przygotować logo i hasło' : 'przygotować stronę internetową';
    const mailTime = isLogo ? 'ok. 5–8 minut' : kind === 'strona' ? 'ok. 15 minut' : 'ok. 15–20 minut';
    const mailSubject = isLogo ? 'Brief logo i hasła' : 'Brief strony internetowej';
    const a = b.answers || {};
    const company = a.company_name || b.company_name || 'firma';
    const meta = { company_name: company, submitted_at: b.submitted_at ? fmtDate(b.submitted_at) : '' };

    let stateText;
    if (b.status === 'wyslany') stateText = null;
    else if (b.status === 'w_trakcie') stateText = 'Klient jest w trakcie wypełniania — poniżej widzisz zapisane dotąd odpowiedzi.';
    else if (b.opened_at) stateText = `Klient otworzył link ${fmtDate(b.opened_at)}, ale jeszcze nic nie zapisał.`;
    else stateText = 'Klient jeszcze nie otworzył linku. Wyślij mu go e-mailem (przycisk poniżej) albo skopiuj i wklej do własnej wiadomości.';

    const sections = H
      ? S.steps.map((st, i) => {
          const rowsEl = [];
          st.fields.forEach((f) => {
            if (!H.isVisible(f, a)) return;
            const val = H.formatValue(f, a);
            if (!val) return;
            rowsEl.push(h('dt', { text: f.label }), h('dd', { style: 'white-space:pre-wrap', text: val }));
          });
          return h(
            'section',
            { class: `panel brief-sec${st.id === 'pomysly' ? ' brief-sec--ideas' : ''}` },
            h('div', { class: 'brief-sec__head' },
              h('h3', { text: `${i + 1}. ${st.title}` }),
              h('a', { class: 'btn btn--sm no-print', href: `/brief/${b.token}?edycja=${i}&id=${b.id}`, text: 'Popraw', 'aria-label': `Popraw odpowiedzi w kroku: ${st.title}` })
            ),
            rowsEl.length ? h('dl', { class: 'dl' }, rowsEl) : h('p', { class: 'muted small', text: 'Brak odpowiedzi.' })
          );
        })
      : [h('div', { class: 'alert alert--error', text: 'Nie wczytano definicji briefu (schema.js).' })];
    if (S && S.setKind) S.setKind('pelny');

    const note = h('textarea', { rows: '3', maxlength: '5000', placeholder: 'Twoje prywatne notatki do tego briefu' });
    note.value = b.admin_note || '';
    const download = K(() => {
      const blob = new Blob([H.toMarkdown(a, meta)], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = h('a', { href: url, download: `brief-${company.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi, '-')}.md` });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const filled = b.status === 'wyslany' || b.status === 'w_trakcie';

    const actions = h(
      'section',
      { class: 'panel no-print brief-actions' },
      h(
        'div',
        { class: 'brief-actions__head' },
        h('h2', { text: opts.inLead ? briefName({ kind, merged_at: b.merged_at }) : 'Działania' }),
        h('span', { class: `status status--${BRIEF_CLASS[b.status]}`, text: BRIEF_STATUS[b.status] })
      ),
      h(
        'p',
        { class: 'small muted' },
        `Utworzono ${fmtDate(b.created_at)}`,
        b.opened_at ? ` · otwarty przez klienta ${fmtDate(b.opened_at)}` : '',
        b.admin_edited_at ? ` · poprawiony przez Ciebie ${fmtDate(b.admin_edited_at)}` : '',
        b.submitted_at ? ` · wypełniony ${fmtDate(b.submitted_at)}` : ''
      ),
      b.merged_at ? h('p', { class: 'alert alert--info', text: `Połączony ${fmtDate(b.merged_at)} z briefu strony i briefu logo. Jeśli klient coś zmieni w którymś z nich, kliknij „Połącz ponownie” u góry.` }) : stateText ? h('p', { class: 'alert alert--info', text: stateText }) : null,
      H && filled && (H.needsLogo(a) || H.needsTagline(a))
        ? h('p', { class: 'alert alert--warn', text: `Klient prosi o: ${[H.needsLogo(a) ? (a.logo === 'odswiezenie' ? 'odświeżenie logo' : 'projekt logo') : '', H.needsTagline(a) ? 'propozycje hasła' : ''].filter(Boolean).join(' i ')}. Zacznij od przycisku „Strona wyboru…” — AI przygotuje stronę z 4 opcjami do wysłania klientowi i ZIP z plikami.` })
        : null,
      b.merged_at ? null : h('p', { class: 'brief-link' }, h('span', { class: 'small muted', text: 'Link dla klienta: ' }), h('code', { text: briefLink(b.token) })),
      b.merged_at ? null : h(
        'div',
        { class: 'actions' },
        opts.mailer
          ? h('button', { class: `btn${filled ? '' : ' btn--primary'}`, type: 'button', 'data-brief-mail': '', text: 'Wyślij link e-mailem', onclick: () => opts.mailer.compose('brief', `${mailSubject} — ${company}`, `Dzień dobry,\n\nzgodnie z rozmową przesyłam krótki formularz (brief), który pomoże mi ${mailWhat} dla ${company}:\n\n${briefLink(b.token)}\n\nWypełnienie zajmuje ${mailTime}. Odpowiedzi zapisują się automatycznie, więc można przerwać i wrócić przez ten sam link. Jeśli czegoś nie wiesz — pomiń pytanie, omówimy to razem.\n\n${SIGN}`) })
          : h('a', { class: `btn${filled ? '' : ' btn--primary'}`, href: briefMailto({ ...b, kind }), text: 'Wyślij link e-mailem' }),
        h('button', { class: 'btn', type: 'button', text: 'Kopiuj link', onclick: () => copyText(briefLink(b.token), 'Link skopiowany.') }),
        h('a', { class: 'btn', href: `/brief/${b.token}`, target: '_blank', rel: 'noopener noreferrer', text: 'Otwórz jak klient ↗' })
      ),
      filled && H && P
        ? h(
            'div',
            { class: 'ai-box' },
            h('h3', { text: 'Teksty dla AI' }),
            h('p', { class: 'small muted', text: 'Każdy przycisk otwiera podgląd gotowego polecenia (z możliwością poprawek) i kopiuje je do schowka — wklej je do narzędzia AI (np. ChatGPT, Claude). Zalecana kolejność od lewej.' }),
            h(
              'div',
              { class: 'actions' },
              H.needsLogo(a) || H.needsTagline(a)
                ? h('button', { class: 'btn btn--primary', type: 'button', 'data-ai': 'logo', text: `1. Strona wyboru ${H.needsLogo(a) ? 'logo' : 'hasła'}${H.needsLogo(a) && H.needsTagline(a) ? ' i hasła' : ''} (4 opcje + ZIP)`, onclick: K(() => promptPreview('Polecenie: strona wyboru logo i hasła', P.logoPage(a, meta), 'Skopiowano polecenie: strona wyboru dla klienta i ZIP z plikami.')) })
                : null,
              isLogo ? null : h('button', { class: 'btn btn--primary', type: 'button', 'data-ai': 'site', text: `${H.needsLogo(a) || H.needsTagline(a) ? '2. ' : '1. '}Strona z panelem administracyjnym`, onclick: K(() => promptPreview('Polecenie: strona z panelem i SEO', P.site(a, meta, opts.choice), 'Skopiowano polecenie: strona z panelem i SEO.')) }),
              isLogo ? null : h('button', { class: 'btn', type: 'button', 'data-ai': 'panel', text: 'Sam panel (do gotowej strony)', onclick: K(() => promptPreview('Polecenie: sam panel administracyjny', P.panel(a, meta), 'Skopiowano polecenie: panel administracyjny.')) }),
              isLogo ? null : h('button', { class: 'btn', type: 'button', 'data-ai': 'portfolio', text: 'Karta do portfolio (ZIP)', onclick: K(() => promptPreview('Polecenie: karta do portfolio', P.portfolio(a, meta), 'Skopiowano polecenie: karta do portfolio.')) }),
              isLogo && !(H.needsLogo(a) || H.needsTagline(a)) ? h('p', { class: 'small muted', text: 'Klient ma logo i hasło — w tym briefie nie ma czego projektować.' }) : null
            )
          )
        : null,
      filled && H
        ? h(
            'div',
            { class: 'actions' },
            h('button', { class: 'btn', type: 'button', text: 'Kopiuj odpowiedzi', onclick: K(() => copyText(H.toMarkdown(a, meta), 'Odpowiedzi skopiowane.')) }),
            h('button', { class: 'btn', type: 'button', text: 'Pobierz plik .md', onclick: download }),
            h('button', {
              class: 'btn',
              type: 'button',
              text: 'Drukuj / PDF',
              onclick: () => {
                document.body.classList.add('print-brief');
                window.addEventListener('afterprint', () => document.body.classList.remove('print-brief'), { once: true });
                window.print();
              },
            })
          )
        : null,
      h(
        'div',
        { class: 'actions' },
        b.status === 'wyslany' && !b.merged_at
          ? h('button', {
              class: 'btn btn--sm',
              type: 'button',
              text: 'Odblokuj do edycji',
              onclick: async () => {
                const ok = await confirmDialog({ title: 'Odblokować brief?', text: 'Klient będzie mógł ponownie edytować odpowiedzi przez ten sam link i wysłać je jeszcze raz.', ok: 'Odblokuj', danger: false });
                if (!ok) return;
                const { error: e } = await q(api(`briefs/${b.id}`, { method: 'PATCH', body: { reopen: true } }));
                if (e) return toast(errMsg(e), 'error');
                toast('Brief odblokowany.');
                route();
              },
            })
          : null,
        h('button', {
          class: 'btn btn--sm btn--danger-outline',
          type: 'button',
          text: 'Usuń brief',
          onclick: async () => {
            const ok = await confirmDialog({
              title: 'Usunąć brief?',
              text: `Brief „${company}” i wszystkie odpowiedzi zostaną trwale usunięte, a link przestanie działać.${opts.inLead ? ' Samo zgłoszenie zostaje — możesz potem utworzyć nowy brief.' : ''}`,
            });
            if (!ok) return;
            const { error: e } = await q(api(`briefs/${b.id}`, { method: 'DELETE' }));
            if (e) return toast(errMsg(e), 'error');
            toast('Brief usunięty.');
            if (opts.inLead) route();
            else location.hash = '#briefy';
          },
        })
      ),
      field('Notatki do briefu (prywatne)', note),
      h('button', {
        class: 'btn btn--sm',
        type: 'button',
        text: 'Zapisz notatki',
        onclick: async () => {
          const { error: e } = await q(api(`briefs/${b.id}`, { method: 'PATCH', body: { admin_note: note.value } }));
          if (e) toast(errMsg(e), 'error');
          else toast('Notatki zapisane.');
        },
      })
    );

    const answersHead = h(
      'div',
      { class: 'brief-answers-head' },
      h('h2', { text: `${b.merged_at ? 'Połączone odpowiedzi' : 'Odpowiedzi klienta'} — ${company}${opts.inLead ? ` (${kindLabel})` : ''}` }),
      H && H.industryLabel(a) ? h('p', null, h('span', { class: 'status status--kontakt', text: `Branża: ${H.industryLabel(a)}` })) : null,
      h('p', { class: 'small muted', text: b.merged_at ? `Połączony ${fmtDate(b.merged_at)}.` : b.status === 'wyslany' ? `Wypełniony ${fmtDate(b.submitted_at)}.` : 'Wersja robocza — klient może jeszcze zmieniać odpowiedzi.' })
    );
    if (!filled) return [actions, h('p', { class: 'muted small brief-answers-head', text: 'Odpowiedzi klienta pojawią się tutaj, gdy zacznie wypełniać brief (zapisują się automatycznie w trakcie).' })];
    return [actions, answersHead, ...sections];
  }

  async function viewBriefs(main) {
    const items = (await api('briefs')).items;
    const rows = items.length
      ? items.map((b) =>
          h(
            'li',
            null,
            h(
              'a',
              { class: 'lead-row', href: b.lead_id ? `#zgloszenie/${b.lead_id}` : `#brief/${b.id}` },
              h(
                'div',
                null,
                h('div', { class: 'lead-row__title', text: b.company_name }),
                h('div', { class: 'lead-row__meta', text: `Utworzono ${fmtDate(b.created_at)}${b.opened_at ? ' · otwarty ' + fmtDate(b.opened_at) : ' · jeszcze nieotwarty'}${b.submitted_at ? ' · wypełniony ' + fmtDate(b.submitted_at) : ''}` })
              ),
              h(
                'div',
                { class: 'lead-row__badges' },
                b.lead_id ? null : h('span', { class: 'status status--odrzucone', text: 'Bez zgłoszenia' }),
                h('span', { class: 'status status--kontakt', text: b.merged_at ? 'Połączony' : KIND_NAME[b.kind] || KIND_NAME.pelny }),
                h('span', { class: `status status--${BRIEF_CLASS[b.status]}`, text: BRIEF_STATUS[b.status] })
              )
            )
          )
        )
      : [h('li', { class: 'empty', text: 'Nie utworzono jeszcze żadnego briefu. Otwórz zgłoszenie i wybierz rodzaj briefu.' })];

    main.replaceChildren(
      head(
        'Briefy klientów',
        'Zestawienie wszystkich briefów. Każdy brief jest przypięty do zgłoszenia — kliknij, aby otworzyć zgłoszenie z pełnym podglądem odpowiedzi.',
        h('a', { class: 'btn', href: '/brief/podglad', target: '_blank', rel: 'noopener', text: 'Podgląd: pełny ↗' }),
        h('a', { class: 'btn', href: '/brief/podglad?rodzaj=strona', target: '_blank', rel: 'noopener', text: 'Podgląd: strona ↗' }),
        h('a', { class: 'btn', href: '/brief/podglad?rodzaj=logo', target: '_blank', rel: 'noopener', text: 'Podgląd: logo i hasło ↗' })
      ),
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Jak wysłać brief klientowi' }),
        h(
          'ol',
          { class: 'steps-list' },
          h('li', null, 'Klient pisze przez formularz na stronie — zgłoszenie pojawia się w zakładce ', h('a', { href: '#zgloszenia', text: 'Zgłoszenia' }), '. Jeśli to Ty napisałeś pierwszy (np. mailowo), ', h('a', { href: '#zgloszenia/nowe', text: 'dodaj zgłoszenie ręcznie' }), '.'),
          h('li', { text: 'Gdy klient zgodzi się na współpracę, otwórz jego zgłoszenie i wybierz rodzaj briefu: pełny (strona + logo i hasło), sama strona albo samo logo i hasło. Dane firmy wpiszą się same.' }),
          h('li', { text: 'Osobne briefy strony i logo możesz potem połączyć w zgłoszeniu przyciskiem „Połącz briefy w jeden” — powstanie pełny brief z poleceniami dla AI.' }),
          h('li', { text: 'Kliknij „Wyślij link e-mailem” — otworzy się gotowa wiadomość do klienta z linkiem.' }),
          h('li', { text: 'Po wypełnieniu dostaniesz e-mail, a pełne odpowiedzi zobaczysz w tym zgłoszeniu.' })
        ),
        h('div', { class: 'actions' }, h('a', { class: 'btn btn--primary', href: '#zgloszenia/nowe', text: '+ Dodaj zgłoszenie ręcznie' }), h('a', { class: 'btn', href: '#zgloszenia', text: 'Przejdź do zgłoszeń' }))
      ),
      h('ul', { class: 'lead-list' }, rows)
    );
  }

  async function viewBrief(main, id) {
    const { data, error } = await q(api(`briefs/${encodeURIComponent(id || '')}`));
    if (error || !data) {
      main.replaceChildren(h('a', { class: 'back', href: '#briefy', text: '← Briefy' }), h('div', { class: 'empty', text: error ? errMsg(error) : 'Nie znaleziono briefu.' }));
      return;
    }
    const b = data.brief;
    if (b.lead_id) {
      location.replace(`#zgloszenie/${b.lead_id}`);
      return;
    }
    main.replaceChildren(
      h('a', { class: 'back no-print', href: '#briefy', text: '← Briefy' }),
      head(`Brief: ${(b.answers && b.answers.company_name) || b.company_name}`, 'Brief utworzony bez zgłoszenia (starsza wersja panelu).'),
      ...briefBlocks(b)
    );
  }

  // =========================================================
  // STATYSTYKI ODWIEDZIN
  // =========================================================
  async function refreshVisitsBadge() {
    const { data } = await q(api('stats?days=7'));
    const b = $('[data-visits-today]');
    if (!b || !data) return;
    b.textContent = String(data.stats.today.views);
    b.title = `Wejścia dzisiaj: ${data.stats.today.views}`;
    b.hidden = false;
  }

  let statsDays = 30;
  async function viewStats(main) {
    const st = (await api(`stats?days=${statsDays}`)).stats;
    const nf = (n) => Number(n || 0).toLocaleString('pl-PL');
    const dfmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    const wd = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('pl-PL', { weekday: 'short' });
    const tile = (label, value, sub) => h('div', { class: 'stat-tile' }, h('div', { class: 'stat-tile__label', text: label }), h('div', { class: 'stat-tile__value', text: nf(value) }), sub ? h('div', { class: 'stat-tile__sub', text: sub }) : null);
    const diff = st.today.views - st.yesterday.views;

    // Wykres: jedna seria (wejścia dziennie), jedna oś, słupki z dymkiem po najechaniu / fokusie
    const max = Math.max(1, ...st.series.map((r) => r.views));
    const step = st.series.length > 120 ? 30 : st.series.length > 45 ? 14 : st.series.length > 14 ? 5 : 1;
    const tip = h('div', { class: 'chart-tip', role: 'status', 'aria-live': 'polite', text: 'Najedź na słupek, aby zobaczyć dzień.' });
    const show = (r) => (tip.textContent = `${wd(r.day)}, ${dfmt(r.day)} — wejścia: ${nf(r.views)}, odwiedzający: ${nf(r.uniques)}`);
    const bars = h(
      'div',
      { class: 'chart-bars', role: 'img', 'aria-label': `Wejścia na stronę dziennie, ostatnie ${st.days} dni. Najwięcej jednego dnia: ${nf(max)}.` },
      st.series.map((r, i) =>
        h('div', { class: `chart-col${i === st.series.length - 1 ? ' is-today' : ''}`, tabindex: '0', 'aria-label': `${dfmt(r.day)}: ${r.views} wejść, ${r.uniques} odwiedzających`, onmouseenter: () => show(r), onfocus: () => show(r) },
          h('div', { class: 'chart-bar', style: `height:${r.views ? Math.max(3, Math.round((r.views / max) * 100)) : 0}%` }),
          h('div', { class: 'chart-x', text: i % step === 0 || i === st.series.length - 1 ? dfmt(r.day) : '' }))
      )
    );
    const range = h('div', { class: 'chips', role: 'group', 'aria-label': 'Zakres dni' },
      [[7, '7 dni'], [30, '30 dni'], [90, '90 dni'], [365, 'Rok']].map(([n, l]) =>
        h('button', { class: 'chip', type: 'button', 'aria-pressed': statsDays === n ? 'true' : 'false', text: l, onclick: () => { statsDays = n; route(); } })));
    const list = (title, rows, key, val, empty) =>
      h('section', { class: 'panel' }, h('h2', { text: title }),
        rows.length
          ? h('ol', { class: 'stat-list' }, rows.map((r) => {
              const top = Math.max(1, ...rows.map((x) => x[val]));
              return h('li', null, h('span', { class: 'stat-list__name', text: key(r) }), h('span', { class: 'stat-list__bar' }, h('i', { style: `width:${Math.round((r[val] / top) * 100)}%` })), h('strong', { text: nf(r[val]) }));
            }))
          : h('p', { class: 'small muted', text: empty }));
    const pageName = (p) => (p === '/' ? 'Strona główna' : p === '/polityka-prywatnosci' ? 'Polityka prywatności' : p.startsWith('/portfolio/') ? `Portfolio: ${p.slice(11)}` : p);
    const DEV = { komputer: 'Komputer', telefon: 'Telefon', tablet: 'Tablet' };

    main.replaceChildren(
      head('Statystyki odwiedzin', 'Własny licznik bez plików cookies. Nie liczy Twoich wejść (gdy jesteś zalogowany do panelu) ani robotów wyszukiwarek.'),
      h('div', { class: 'stat-tiles' },
        tile('Wejścia dzisiaj', st.today.views, diff === 0 ? 'tyle samo co wczoraj' : `${diff > 0 ? '+' : '−'}${nf(Math.abs(diff))} względem wczoraj`),
        tile('Odwiedzający dzisiaj', st.today.uniques, 'unikalne osoby'),
        tile('Ostatnie 7 dni', st.last7.views, `${nf(st.last7.uniques)} odwiedzających`),
        tile(`Ostatnie ${st.days} dni`, st.period.views, `${nf(st.period.uniques)} odwiedzających`),
        tile('Od początku', st.total.views, st.total.since ? `od ${dfmt(st.total.since)}` : 'brak danych')),
      h('section', { class: 'panel' },
        h('div', { class: 'brief-sec__head' }, h('h2', { text: 'Wejścia dziennie' }), range),
        h('div', { class: 'chart' }, h('div', { class: 'chart-y', 'aria-hidden': 'true' }, h('span', { text: nf(max) }), h('span', { text: '0' })), bars),
        tip,
        h('details', { class: 'small' }, h('summary', { text: 'Pokaż dane w tabeli' }),
          h('table', { class: 'stat-table' }, h('thead', null, h('tr', null, h('th', { text: 'Dzień' }), h('th', { text: 'Wejścia' }), h('th', { text: 'Odwiedzający' }))),
            h('tbody', null, st.series.slice().reverse().map((r) => h('tr', null, h('td', { text: `${wd(r.day)}, ${dfmt(r.day)}` }), h('td', { text: nf(r.views) }), h('td', { text: nf(r.uniques) }))))))),
      h('div', { class: 'detail-grid' },
        list(`Najczęściej oglądane (${st.days} dni)`, st.pages, (r) => pageName(r.path), 'views', 'Brak wejść w tym okresie.'),
        h('div', null,
          list('Skąd przychodzą odwiedzający', st.refs, (r) => r.key, 'n', 'Brak danych w tym okresie.'),
          list('Urządzenia', st.devices, (r) => DEV[r.key] || r.key, 'n', 'Brak danych w tym okresie.'))),
      h('p', { class: 'small muted', text: '„Odwiedzający” to przybliżona liczba unikalnych osób w danym dniu. Ta sama osoba w kolejnym dniu jest liczona ponownie — licznik celowo nie śledzi nikogo między dniami.' })
    );
    refreshVisitsBadge();
  }

  // =========================================================
  // TREŚCI STRONY
  // =========================================================
  async function viewContent(main) {
    const data = (await api('content')).items;
    const groups = [];
    for (const row of data || []) {
      let g = groups.find((x) => x.name === row.section);
      if (!g) groups.push((g = { name: row.section, rows: [] }));
      g.rows.push(row);
    }

    const boxes = groups.map((g, gi) => {
      const inputs = g.rows.map((row) => {
        const max = 5000;
        const input =
          row.kind === 'text'
            ? h('input', { type: 'text', maxlength: String(max), value: row.value })
            : h('textarea', { rows: row.kind === 'lines' ? '6' : String(row.value || '').includes('\n') ? '12' : '3', maxlength: String(max) }, row.value);
        if (input.tagName === 'TEXTAREA') input.value = row.value;
        input.dataset.key = row.key;
        input.addEventListener('input', () => {
          dirty = true;
          status.textContent = 'Niezapisane zmiany';
        });
        const hint = row.kind === 'lines' ? 'Jedna linia = jeden punkt listy.' : null;
        return { row, input, el: field(row.label, input, hint) };
      });
      const status = h('span', { class: 'small muted', 'aria-live': 'polite' });
      const save = h('button', {
        class: 'btn btn--primary',
        type: 'button',
        text: 'Zapisz sekcję',
        onclick: async () => {
          const changed = inputs.filter((i) => i.input.value !== i.row.value);
          if (!changed.length) {
            status.textContent = 'Brak zmian do zapisania.';
            return;
          }
          busy(save, true);
          const failed = [];
          const { error: e } = await q(api('content', { method: 'PUT', body: { items: changed.map((i) => ({ key: i.row.key, value: i.input.value })) } }));
          if (e) failed.push(errMsg(e));
          else changed.forEach((i) => (i.row.value = i.input.value));
          busy(save, false);
          if (failed.length) {
            status.textContent = 'Część zmian nie została zapisana.';
            toast(`Nie zapisano: ${failed.join('; ')}`, 'error');
          } else {
            status.textContent = `Zapisano ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}. Zmiany są już na stronie.`;
            toast('Zapisano zmiany.');
          }
          dirty = $$('[data-key]', main).some((el) => {
            const r = (data || []).find((x) => x.key === el.dataset.key);
            return r && r.value !== el.value;
          });
        },
      });
      return h('details', { class: 'section-box', open: gi === 0 }, h('summary', { text: g.name }), h('div', { class: 'section-box__body' }, inputs.map((i) => i.el), h('div', { class: 'save-bar' }, save, status)));
    });

    main.replaceChildren(
      head('Treści strony', 'Teksty na stronie głównej i w polityce prywatności. Każdą sekcję zapisujesz osobno.'),
      h(
        'div',
        { class: 'alert alert--info' },
        'Wskazówki: puste pole = na stronie zostaje tekst domyślny. Pojedynczy myślnik „-” ukrywa dany element. Pola polityki prywatności oznaczone na stronie „DO UZUPEŁNIENIA” wypełnij przed publikacją. Listy FAQ, branż i możliwości edytujesz w osobnych zakładkach.'
      ),
      ...boxes
    );
  }

  // =========================================================
  // LISTY: FAQ, BRANŻE, MOŻLIWOŚCI
  // =========================================================
  const LISTS = {
    faq: {
      table: 'faq',
      title: 'FAQ — najczęstsze pytania',
      desc: 'Pytania i odpowiedzi w sekcji FAQ. Pusta linia w odpowiedzi tworzy nowy akapit.',
      noun: 'pytanie',
      label: (it) => it.question || 'Nowe pytanie',
      fields: [
        { name: 'question', label: 'Pytanie', type: 'text', max: 300, required: true },
        { name: 'answer', label: 'Odpowiedź', type: 'textarea', max: 5000, required: true },
      ],
    },
    branze: {
      table: 'industries',
      title: 'Branże',
      desc: 'Lista branż w sekcji „Dla kogo”. Opublikowane branże pojawiają się też na liście wyboru w formularzu (opcja „Inna” jest dodawana automatycznie).',
      noun: 'branżę',
      label: (it) => it.name || 'Nowa branża',
      fields: [
        { name: 'name', label: 'Nazwa branży', type: 'text', max: 80, required: true },
        { name: 'description', label: 'Opis', type: 'textarea', max: 600 },
      ],
    },
    mozliwosci: {
      table: 'capabilities',
      title: 'Możliwości',
      desc: 'Kafelki w sekcji „Co mogę stworzyć dla Twojej firmy”. Pierwszy element jest wyróżniony granatowym tłem.',
      noun: 'możliwość',
      label: (it) => it.title || 'Nowa możliwość',
      fields: [
        { name: 'title', label: 'Tytuł', type: 'text', max: 120, required: true },
        { name: 'description', label: 'Opis', type: 'textarea', max: 800 },
        { name: 'size', label: 'Szerokość kafelka', type: 'select', options: [['normal', 'Zwykła'], ['wide', 'Szeroka (2 kolumny)']] },
      ],
    },
  };

  async function viewList(cfg) {
    const main = $('[data-view]');
    const items = (await api(`list/${cfg.table}`)).items.map((x) => ({ ...x }));
    const listBox = h('div');

    async function persistOrder() {
      const { error: e } = await q(api(`list/${cfg.table}/order`, { method: 'PUT', body: { ids: items.filter((it) => it.id).map((it) => it.id) } }));
      if (e) {
        toast(`Nie zapisano kolejności: ${errMsg(e)}`, 'error');
        return false;
      }
      return true;
    }

    function draw() {
      if (!items.length) {
        listBox.replaceChildren(h('div', { class: 'empty', text: 'Lista jest pusta. Na stronie wyświetlą się treści domyślne.' }));
        return;
      }
      listBox.replaceChildren(
        ...items.map((it, idx) => {
          const inputs = {};
          const fieldEls = cfg.fields.map((f) => {
            let input;
            if (f.type === 'textarea') {
              input = h('textarea', { rows: f.name === 'answer' ? '5' : '3', maxlength: String(f.max) });
              input.value = it[f.name] || '';
            } else if (f.type === 'select') {
              input = h('select', null, f.options.map(([v, l]) => h('option', { value: v, text: l })));
              input.value = it[f.name] || f.options[0][0];
            } else {
              input = h('input', { type: 'text', maxlength: String(f.max), value: it[f.name] || '' });
            }
            if (f.required) input.required = true;
            input.addEventListener('input', () => (dirty = true));
            inputs[f.name] = input;
            return f.max ? h('div', null, field(f.label + (f.required ? ' *' : ''), input), h('div', null, withCounter(input, f.max)[1])) : field(f.label, input);
          });
          const pub = h('input', { type: 'checkbox', checked: it.id ? it.is_published : true });
          pub.addEventListener('change', () => (dirty = true));

          const save = h('button', {
            class: 'btn btn--primary btn--sm',
            type: 'button',
            text: it.id ? 'Zapisz' : 'Dodaj',
            onclick: async () => {
              const payload = { is_published: pub.checked };
              for (const f of cfg.fields) {
                const v = inputs[f.name].value.trim();
                if (f.required && !v) {
                  toast(`Pole „${f.label}” jest wymagane.`, 'error');
                  inputs[f.name].focus();
                  return;
                }
                payload[f.name] = v;
              }
              busy(save, true);
              let res;
              if (it.id) res = await q(api(`list/${cfg.table}/${it.id}`, { method: 'PUT', body: payload }));
              else res = await q(api(`list/${cfg.table}`, { method: 'POST', body: payload }));
              if (res.data) res.data = res.data.item;
              busy(save, false);
              if (res.error) return toast(`Nie zapisano: ${errMsg(res.error)}`, 'error');
              Object.assign(it, res.data);
              dirty = false;
              toast('Zapisano. Zmiana jest już na stronie.');
              draw();
            },
          });
          const del = h('button', {
            class: 'btn btn--danger-outline btn--sm',
            type: 'button',
            text: 'Usuń',
            onclick: async () => {
              if (it.id) {
                const ok = await confirmDialog({ title: 'Usunąć element?', text: `„${cfg.label(it)}” zostanie trwale usunięty. Jeśli chcesz go tylko ukryć, odznacz „Widoczne na stronie”.` });
                if (!ok) return;
                const { error: e } = await q(api(`list/${cfg.table}/${it.id}`, { method: 'DELETE' }));
                if (e) return toast(errMsg(e), 'error');
                toast('Usunięto.');
              }
              items.splice(items.indexOf(it), 1);
              dirty = false;
              draw();
            },
          });
          const move = (dir) => async () => {
            const j = idx + dir;
            if (j < 0 || j >= items.length) return;
            if (!it.id || !items[j].id) return toast('Najpierw zapisz nowy element.', 'error');
            [items[idx], items[j]] = [items[j], items[idx]];
            if (await persistOrder()) toast('Zmieniono kolejność.');
            draw();
          };
          return h(
            'div',
            { class: `item${!it.is_published && it.id ? ' item--draft' : ''}` },
            h(
              'div',
              { class: 'item__head' },
              h('span', { class: 'item__num', text: `#${idx + 1}${it.id ? '' : ' · niezapisane'}${it.id && !it.is_published ? ' · ukryte' : ''}` }),
              h(
                'div',
                { class: 'actions' },
                h('button', { class: 'btn btn--sm icon-btn', type: 'button', 'aria-label': 'Przesuń wyżej', text: '↑', disabled: idx === 0, onclick: move(-1) }),
                h('button', { class: 'btn btn--sm icon-btn', type: 'button', 'aria-label': 'Przesuń niżej', text: '↓', disabled: idx === items.length - 1, onclick: move(1) })
              )
            ),
            fieldEls,
            h('div', { class: 'item__foot' }, h('label', { class: 'check' }, pub, 'Widoczne na stronie'), h('div', { class: 'actions' }, del, save))
          );
        })
      );
    }

    const add = h('button', {
      class: 'btn btn--primary',
      type: 'button',
      text: `Dodaj ${cfg.noun}`,
      onclick: () => {
        items.push({ is_published: true });
        draw();
        const last = listBox.lastElementChild;
        if (last) {
          last.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const first = last.querySelector('input, textarea');
          if (first) first.focus({ preventScroll: true });
        }
      },
    });

    main.replaceChildren(head(cfg.title, cfg.desc, add), listBox);
    draw();
  }

  // =========================================================
  // ZDJĘCIA (biblioteka mediów)
  // =========================================================
  const MAX_SOURCE = 20 * 1024 * 1024;
  const MAX_UPLOAD = 5 * 1024 * 1024;
  const MAX_DIM = 1920;


  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  }

  /** Zmniejsza zdjęcie i zapisuje jako WebP (lub JPEG, jeśli przeglądarka nie obsługuje WebP). */
  async function optimizeImage(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Niedozwolony typ pliku. Dozwolone: JPG, PNG, WebP.');
    if (file.size > MAX_SOURCE) throw new Error('Plik jest za duży (maksymalnie 20 MB przed optymalizacją).');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error('Nie udało się odczytać zdjęcia.'));
        i.src = url;
      });
      const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const hgt = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = hgt;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, hgt);
      let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.82));
      let ext = 'webp';
      if (!blob || blob.type !== 'image/webp') {
        blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
        ext = 'jpg';
      }
      if (!blob) throw new Error('Nie udało się przetworzyć zdjęcia.');
      if (blob.size > MAX_UPLOAD) throw new Error('Po optymalizacji zdjęcie nadal przekracza 5 MB.');
      // canvas zostaje do przygotowania wariantów (z niezakodowanych pikseli — bez podwójnej kompresji)
      return { blob, ext, width: w, height: hgt, canvas };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // ---------- Warianty responsywne (w480–w1280) ----------
  // Najpierw zawsze zapisuje się oryginał (jak dotychczas). Warianty to osobny, późniejszy krok:
  // jego niepowodzenie nie usuwa ani nie zmienia oryginału — zdjęcie działa wtedy tak jak przed zmianą.
  const VARIANT_WIDTHS = [480, 640, 960, 1280];
  const VARIANT_MAX = 1024 * 1024;

  /** Zmniejsza canvas do zadanej szerokości w kilku krokach (o połowę), żeby małe wersje nie były postrzępione. */
  function downscale(src, w, hgt) {
    let cur = src;
    while (cur.width / 2 >= w * 1.0001 && cur.width > 2) {
      const c = document.createElement('canvas');
      c.width = Math.max(w, Math.round(cur.width / 2));
      c.height = Math.max(hgt, Math.round(cur.height / 2));
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = 'high';
      x.drawImage(cur, 0, 0, c.width, c.height);
      cur = c;
    }
    const out = document.createElement('canvas');
    out.width = w;
    out.height = hgt;
    const x = out.getContext('2d');
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, w, hgt);
    return out;
  }

  /** Przygotowuje brakujące warianty z canvasu o wymiarach oryginału. Zwraca { files:[{name, blob}], errors:{name: tekst} }. */
  async function makeVariants(canvas, width, height, only) {
    const files = [];
    const errors = {};
    for (const w of VARIANT_WIDTHS) {
      const name = `w${w}`;
      if (w >= width || (only && !only.includes(name))) continue;
      try {
        const hgt = Math.round((w * height) / width);
        const c = downscale(canvas, w, hgt);
        let blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.8));
        if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
        if (!blob) throw new Error('nie udało się zapisać');
        if (blob.size > VARIANT_MAX) throw new Error('za duży plik');
        files.push({ name, blob });
      } catch (e) {
        errors[name] = (e && e.message) || 'błąd';
      }
    }
    return { files, errors };
  }

  /** Wysyła warianty do serwera (każdy jest sprawdzany i zapisywany osobno). Nigdy nie rzuca wyjątku. */
  async function sendVariants(mediaId, files, errors) {
    const failed = Object.keys(errors);
    if (!files.length) return { ok: !failed.length, failed, status: null };
    const fd = new FormData();
    for (const f of files) fd.append(f.name, f.blob, `${f.name}.${f.blob.type === 'image/webp' ? 'webp' : 'jpg'}`);
    try {
      const r = await api(`media/${mediaId}/variants`, { method: 'POST', body: fd });
      for (const [k, v] of Object.entries(r.results || {})) if (!v.ok) failed.push(k);
      return { ok: !failed.length, failed, status: r.variant_status };
    } catch (e) {
      return { ok: false, failed: failed.concat(files.map((f) => f.name)), status: null, message: errMsg(e) };
    }
  }

  async function uploadImage(file, alt) {
    const { blob, ext, width, height, canvas } = await optimizeImage(file);
    const fd = new FormData();
    fd.append('file', blob, `zdjecie.${ext}`);
    fd.append('alt', alt);
    fd.append('width', String(width));
    fd.append('height', String(height));
    // 1) oryginał — dokładnie jak dotychczas; błąd tutaj = zdjęcie nie zostało wgrane
    const item = (await api('media', { method: 'POST', body: fd })).item;
    // 2) warianty — osobno; żaden błąd nie cofa zapisu oryginału
    try {
      const { files, errors } = await makeVariants(canvas, item.width, item.height);
      const r = await sendVariants(item.id, files, errors);
      item.variantsOk = r.ok;
      if (r.status) item.variant_status = r.status;
    } catch {
      item.variantsOk = false;
    }
    return item;
  }

  /** Warianty dla zdjęcia, które już jest w bibliotece (ręczne „Przygotuj wersje”). */
  async function prepareVariantsFor(m) {
    const res = await fetch(m.url, { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw new Error('Nie udało się pobrać zdjęcia.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((ok, fail) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => fail(new Error('Nie udało się odczytać zdjęcia.'));
        i.src = url;
      });
      if (img.naturalWidth !== Number(m.width) || img.naturalHeight !== Number(m.height)) throw new Error('Wymiary pliku nie zgadzają się z zapisanymi w bibliotece.');
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      const have = new Set((m.variants || []).map((v) => v.k));
      const missing = VARIANT_WIDTHS.filter((w) => w < m.width).map((w) => `w${w}`).filter((k) => !have.has(k));
      const { files, errors } = await makeVariants(c, m.width, m.height, missing);
      return await sendVariants(m.id, files, errors);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function uploaderForm(onDone) {
    const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp' });
    const alt = h('input', { type: 'text', maxlength: '300', placeholder: 'Np. Strona główna salonu Ola na telefonie' });
    const msg = h('div', { 'aria-live': 'polite' });
    const btn = h('button', { class: 'btn btn--primary', type: 'submit', text: 'Wgraj zdjęcie' });
    const form = h(
      'form',
      {
        class: 'panel',
        onsubmit: async (e) => {
          e.preventDefault();
          msg.replaceChildren();
          const f = file.files && file.files[0];
          if (!f) return msg.replaceChildren(h('div', { class: 'alert alert--error', text: 'Wybierz plik zdjęcia.' }));
          if (!alt.value.trim()) {
            alt.focus();
            return msg.replaceChildren(h('div', { class: 'alert alert--error', text: 'Opisz zdjęcie (tekst alternatywny) — jest potrzebny osobom korzystającym z czytników ekranu.' }));
          }
          busy(btn, true, 'Optymalizuję i wysyłam…');
          try {
            const m = await uploadImage(f, alt.value.trim());
            form.reset();
            if (m.variantsOk === false) toast('Zdjęcie wgrane. Nie udało się przygotować wszystkich wersji dla telefonów — możesz to powtórzyć w zakładce Zdjęcia („Przygotuj wersje”). Zdjęcie działa normalnie.', 'error');
            else toast('Zdjęcie wgrane.');
            onDone && onDone(m);
          } catch (err) {
            msg.replaceChildren(h('div', { class: 'alert alert--error', text: errMsg(err) }));
          }
          busy(btn, false);
        },
      },
      h('h2', { text: 'Wgraj nowe zdjęcie' }),
      h('div', { class: 'grid-2' }, field('Plik (JPG, PNG lub WebP)', file, 'Zdjęcie zostanie automatycznie zmniejszone (maks. 1920 px) i zapisane jako WebP. Limit po optymalizacji: 5 MB.'), field('Tekst alternatywny (opis zdjęcia) *', alt, 'Krótko opisz, co widać na zdjęciu.')),
      msg,
      btn
    );
    return form;
  }

  const VARIANT_LABEL = {
    gotowe: 'Wersje dla telefonów: gotowe',
    czesciowe: 'Wersje dla telefonów: częściowe — użyj „Przygotuj wersje”',
    brak: 'Wersje dla telefonów: brak (zdjęcie działa jak dotychczas)',
    'nie-dotyczy': 'Wersje dla telefonów: niepotrzebne (zdjęcie ma do 480 px)',
  };

  /**
   * Ręczne przygotowanie wariantów dla zdjęć, które ich nie mają (np. wgranych przed wprowadzeniem wariantów).
   * Uruchamiane wyłącznie przyciskiem. Można przerwać i wznowić — lista brakujących zdjęć jest liczona od nowa przy każdym starcie.
   */
  function variantsPanel(media) {
    const todo = media.filter((m) => m.variant_status === 'brak' || m.variant_status === 'czesciowe');
    const counter = h('p', { 'data-variants-count': String(todo.length) });
    const bar = h('progress', { max: String(Math.max(1, todo.length)), value: '0', style: 'width:100%', hidden: true, 'data-variants-progress': '' });
    const log = h('p', { class: 'small muted', 'aria-live': 'polite', 'data-variants-log': '' });
    let stop = false;
    let running = false;
    const startBtn = h('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Przygotuj wersje', 'data-variants-start': '', disabled: !todo.length });
    const stopBtn = h('button', { class: 'btn btn--sm', type: 'button', text: 'Przerwij', 'data-variants-stop': '', hidden: true, onclick: () => { stop = true; stopBtn.disabled = true; log.textContent = 'Przerywam po bieżącym zdjęciu…'; } });
    const drawCount = (n) => {
      counter.dataset.variantsCount = String(n);
      counter.textContent = n ? `Zdjęcia bez wersji dla telefonów: ${n}. Na stronie działają normalnie — wersje tylko zmniejszą ilość danych pobieranych na telefonach.` : 'Wszystkie zdjęcia mają wersje dla telefonów (albo ich nie potrzebują).';
    };
    drawCount(todo.length);
    startBtn.addEventListener('click', async () => {
      if (running) return;
      running = true;
      stop = false;
      startBtn.disabled = true;
      stopBtn.hidden = false;
      stopBtn.disabled = false;
      // lista liczona od nowa — wznowienie pomija zdjęcia przygotowane wcześniej
      let list = [];
      try {
        list = ((await api('media')).items || []).filter((m) => m.variant_status === 'brak' || m.variant_status === 'czesciowe');
      } catch (e) {
        log.textContent = `Nie udało się pobrać listy zdjęć: ${errMsg(e)}`;
      }
      bar.hidden = false;
      bar.max = String(Math.max(1, list.length));
      bar.value = 0;
      let done = 0;
      let failed = 0;
      for (const m of list) {
        if (stop || !document.body.contains(bar)) break;
        log.textContent = `Przygotowuję ${done + 1} z ${list.length}: ${m.alt || 'zdjęcie'}…`;
        try {
          const r = await prepareVariantsFor(m);
          if (!r.ok) failed++;
        } catch {
          failed++;
        }
        done++;
        bar.value = done;
      }
      running = false;
      stopBtn.hidden = true;
      startBtn.disabled = false;
      let left = list.length - done;
      try {
        left = ((await api('media')).items || []).filter((m) => m.variant_status === 'brak' || m.variant_status === 'czesciowe').length;
      } catch {
        /* zostaje przybliżenie */
      }
      drawCount(left);
      startBtn.disabled = !left;
      log.textContent = stop
        ? `Przerwano. Przygotowano: ${done - failed} z ${list.length}. Kliknij „Przygotuj wersje”, aby dokończyć.`
        : failed
          ? `Gotowe, ale ${failed} zdjęć nie udało się przygotować — te zdjęcia działają jak dotychczas. Możesz spróbować ponownie.`
          : `Gotowe: przygotowano wersje dla ${done} zdjęć.`;
      if (done && !stop && !failed && document.body.contains(bar)) setTimeout(() => { if (!running && document.body.contains(bar)) route(); }, 1500);
    });
    return h(
      'section',
      { class: 'panel', 'data-variants-panel': '' },
      h('h2', { text: 'Wersje zdjęć dla telefonów' }),
      h('p', { class: 'small muted', text: 'Nowe zdjęcia dostają je automatycznie (480, 640, 960 i 1280 px). Dla zdjęć wgranych wcześniej możesz je przygotować tutaj — oryginały, adresy i opisy zdjęć się nie zmieniają.' }),
      counter,
      bar,
      log,
      h('div', { class: 'actions' }, startBtn, stopBtn)
    );
  }

  async function viewMedia(main) {
    const media = (await api('media')).items;
    const used = {};
    for (const m of media) used[m.id] = m.used;

    const grid = h(
      'div',
      { class: 'media-grid' },
      (media || []).map((m) => {
        const alt = h('textarea', { rows: '2', maxlength: '300', 'aria-label': 'Tekst alternatywny' });
        alt.value = m.alt;
        return h(
          'div',
          { class: 'media-card' },
          h('img', { src: m.url, alt: m.alt, loading: 'lazy', width: m.width || 400, height: m.height || 300 }),
          h(
            'div',
            { class: 'media-card__body' },
            field('Tekst alternatywny', alt),
            h('p', { class: 'small muted', text: `${m.width || '?'}×${m.height || '?'} px · ${m.size_bytes ? Math.round(m.size_bytes / 1024) + ' KB' : ''}${used[m.id] ? ` · używane (realizacje/posty: ${used[m.id]})` : ' · nieużywane'}` }),
            h('p', { class: 'small muted', 'data-variant-status': m.variant_status, text: VARIANT_LABEL[m.variant_status] || '' }),
            h(
              'div',
              { class: 'actions' },
              h('button', {
                class: 'btn btn--sm',
                type: 'button',
                text: 'Zapisz opis',
                onclick: async (e) => {
                  const b = e.currentTarget;
                  busy(b, true);
                  const { error: err } = await q(api(`media/${m.id}`, { method: 'PATCH', body: { alt: alt.value.trim() } }));
                  busy(b, false);
                  if (err) toast(errMsg(err), 'error');
                  else toast('Zapisano opis zdjęcia.');
                },
              }),
              h('button', {
                class: 'btn btn--danger-outline btn--sm',
                type: 'button',
                text: 'Usuń',
                onclick: async () => {
                  const ok = await confirmDialog({
                    title: 'Usunąć zdjęcie?',
                    text: used[m.id] ? `To zdjęcie jest używane w ${used[m.id]} realizacji — zniknie z nich. Usunięcia nie można cofnąć.` : 'Zdjęcie zostanie trwale usunięte.',
                  });
                  if (!ok) return;
                  const { error: err } = await q(api(`media/${m.id}`, { method: 'DELETE' }));
                  if (err) return toast(errMsg(err), 'error');
                  toast('Zdjęcie usunięte.');
                  route();
                },
              })
            )
          )
        );
      })
    );

    main.replaceChildren(
      head('Zdjęcia', 'Biblioteka zdjęć do realizacji w portfolio. Wgrywaj tylko zdjęcia, na których użycie masz zgodę.'),
      uploaderForm(() => route()),
      variantsPanel(media || []),
      media && media.length ? grid : h('div', { class: 'empty', text: 'Brak zdjęć w bibliotece.' })
    );
  }

  // =========================================================
  // PORTFOLIO
  // =========================================================
  // =========================================================
  // KARTA PROJEKTU (paczka ZIP: index.html + obrazy)
  // =========================================================
  const CARD_EXT = ['html', 'htm', 'css', 'js', 'mjs', 'json', 'txt', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'otf', 'mp4', 'webm', 'pdf'];
  const CARD_PATH_RE = /^(?!.*(?:^|\/)\.)[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}){0,5}$/;
  const CARD_MAX_FILE = 10 * 1024 * 1024;
  const CARD_MAX_TOTAL = 40 * 1024 * 1024;
  const IMG_EXT = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'];
  const extOf = (p) => ((/\.([A-Za-z0-9]+)$/.exec(p) || [])[1] || '').toLowerCase();
  const fmtSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

  /** Czyta archiwum ZIP w przeglądarce (bez bibliotek). Zwraca [{name, data: Uint8Array}]. */
  async function readZip(file) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Ta przeglądarka nie obsługuje rozpakowywania ZIP. Użyj aktualnego Chrome, Edge, Firefox lub Safari.');
    const buf = new Uint8Array(await file.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('To nie jest prawidłowy plik ZIP.');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const dec = new TextDecoder();
    const out = [];
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Uszkodzony plik ZIP.');
      const flags = dv.getUint16(p + 8, true);
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true);
      const elen = dv.getUint16(p + 30, true);
      const clen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + elen + clen;
      if (name.endsWith('/')) continue;
      if (flags & 1) throw new Error('Plik ZIP jest zaszyfrowany hasłem — spakuj go bez hasła.');
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      const raw = buf.subarray(start, start + csize);
      let data;
      if (method === 0) data = raw.slice();
      else if (method === 8) data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else throw new Error(`Nieobsługiwana metoda kompresji w pliku ${name}. Spakuj folder zwykłym ZIP-em.`);
      out.push({ name, data });
    }
    return out;
  }

  /** Wybiera pliki karty: folder z index.html staje się katalogiem głównym karty. */
  function prepareCard(entries) {
    const visible = entries.filter((e) => !/(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)/i.test(e.name) && !/(^|\/)\./.test(e.name));
    const indexes = visible.filter((e) => /(^|\/)index\.html$/i.test(e.name)).sort((a, b) => a.name.split('/').length - b.name.split('/').length);
    if (!indexes.length) throw new Error('W paczce nie ma pliku index.html.');
    const prefix = indexes[0].name.slice(0, indexes[0].name.length - 'index.html'.length);
    const files = [];
    const skipped = [];
    let opis = null;
    for (const e of visible) {
      if (!e.name.startsWith(prefix)) { skipped.push(`${e.name} (poza folderem z index.html)`); continue; }
      const path = e.name.slice(prefix.length).replace(/^index\.HTML$/i, 'index.html');
      if (/^opis[-_ ]?do[-_ ]?portfolio\.txt$/i.test(path) || /(^|\/)opis.*\.txt$/i.test(path)) { opis = new TextDecoder().decode(e.data); continue; }
      const ext = extOf(path);
      if (!CARD_EXT.includes(ext)) { skipped.push(`${path} (typ pliku niedozwolony)`); continue; }
      if (!CARD_PATH_RE.test(path)) { skipped.push(`${path} (niedozwolone znaki w nazwie — użyj liter bez polskich znaków, cyfr i myślników)`); continue; }
      if (e.data.byteLength > CARD_MAX_FILE) { skipped.push(`${path} (ponad 10 MB)`); continue; }
      files.push({ path, data: e.data, ext });
    }
    const total = files.reduce((a, f) => a + f.data.byteLength, 0);
    if (total > CARD_MAX_TOTAL) throw new Error(`Karta ma ${fmtSize(total)} — maksymalnie 40 MB. Zmniejsz zdjęcia (np. WebP, szerokość 1600 px).`);
    if (files.length > 200) throw new Error('Karta może mieć maksymalnie 200 plików.');
    const html = new TextDecoder().decode(files.find((f) => f.path === 'index.html').data);
    const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    const warnings = [];
    if (/\b(localStorage|sessionStorage|indexedDB)\b/.test(scripts)) warnings.push('index.html używa pamięci przeglądarki (localStorage / IndexedDB). Na karcie ta funkcja nie zadziała — karta działa w bezpiecznej „piaskownicy”.');
    const missing = [...markup.matchAll(/(?:src|href)="(?!https?:|mailto:|tel:|sms:|#|data:|\/|javascript:)([^"?#'+]+)"/g)].map((m) => decodeURI(m[1])).filter((ref) => !files.some((f) => f.path === ref.replace(/^\.\//, '')));
    if (missing.length) warnings.push(`index.html odwołuje się do plików, których nie ma w paczce: ${[...new Set(missing)].slice(0, 6).join(', ')}`);
    if (/(?:src|href)="\/(?!\/)/.test(markup)) warnings.push('index.html ma ścieżki zaczynające się od „/” — na karcie wskazywałyby na Twoją stronę główną. Używaj ścieżek względnych, np. img/zdjecie.webp.');
    return { files, skipped, opis, total, warnings };
  }

  /** Odczytuje plik opis-do-portfolio.txt. */
  function parseOpis(text) {
    const get = (re) => {
      const m = re.exec(text);
      return m ? m[1].trim() : '';
    };
    const r = {
      title: get(/^\s*Tytuł\s*:\s*(.+)$/im),
      industry: get(/^\s*Podtytuł\s*:\s*(.+)$/im),
      description: get(/^\s*Opis[^:\n]*:\s*(.+)$/im),
      tags: get(/^\s*Tagi\s*:\s*(.+)$/im),
      cover: (get(/^\s*Miniatura\s*:\s*(.+)$/im).match(/[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g|avif|gif|svg)/i) || [''])[0],
      site_url: (get(/^\s*Link do strony\s*:\s*(.+)$/im).match(/https?:\/\/[^\s←]+/) || [''])[0],
      slug: (get(/^\s*Link do karty\s*:\s*(.+)$/im).match(/\/portfolio\/([a-z0-9-]+)/) || ['', ''])[1],
      seo_for: get(/^\s*Dla kogo\s*:\s*(.+)$/im).replace(/^(projekt strony internetowej\s+)?dla\s+/i, ''),
      is_demo: /demonstracyjn|fikcyjn/i.test(text),
    };
    return r;
  }

  async function uploadCard(projectId, card, cover, onProgress) {
    const ver = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');
    let done = 0;
    const queue = card.files.slice();
    async function worker() {
      while (queue.length) {
        const f = queue.shift();
        let res;
        try {
          res = await fetch(`/api/admin/portfolio/${projectId}/card-file?ver=${ver}&path=${encodeURIComponent(f.path)}`, {
            method: 'PUT',
            headers: { 'X-Panel': '1', 'Content-Type': 'application/octet-stream', Accept: 'application/json' },
            credentials: 'same-origin',
            body: f.data,
          });
        } catch {
          throw new Error('Brak połączenia z serwerem podczas wgrywania karty.');
        }
        const b = await res.json().catch(() => ({}));
        if (!res.ok || b.ok === false) throw new Error(b.message || `Nie wgrano pliku ${f.path} (${res.status}).`);
        done++;
        onProgress(done, card.files.length);
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    return api(`portfolio/${projectId}/card`, { method: 'POST', body: { ver, cover, expected: card.files.length } });
  }

  async function viewPortfolio(main, param) {
    if (param) return viewProject(main, param);
    const items = (await api('portfolio')).items;
    const published = items.filter((p) => p.status === 'published').length;

    async function move(idx, dir) {
      const j = idx + dir;
      if (j < 0 || j >= items.length) return;
      [items[idx], items[j]] = [items[j], items[idx]];
      const { error: e } = await q(api('portfolio/order', { method: 'PUT', body: { ids: items.map((p) => p.id) } }));
      if (e) return toast(errMsg(e), 'error');
      toast('Zmieniono kolejność.');
      route();
    }

    main.replaceChildren(
      head('Portfolio', 'Realizacje i projekty demonstracyjne. Do każdej możesz wgrać kartę projektu (paczkę ZIP z index.html i zrzutami). Sekcja „Portfolio” pojawi się na stronie automatycznie, gdy opublikujesz pierwszą realizację, i zniknie, gdy żadna nie będzie opublikowana.', h('a', { class: 'btn btn--primary', href: '#portfolio/nowa', text: 'Dodaj realizację' })),
      h('div', { class: `alert ${published ? 'alert--ok' : 'alert--info'}`, text: published ? `Opublikowane realizacje: ${published}. Sekcja Portfolio jest widoczna na stronie.` : 'Brak opublikowanych realizacji — sekcja Portfolio jest ukryta na stronie.' }),
      items.length
        ? h(
            'ul',
            { class: 'lead-list' },
            items.map((p, idx) =>
              h(
                'li',
                { class: 'lead-row' },
                h('div', null, h('a', { class: 'lead-row__title', href: `#portfolio/${p.id}`, text: p.title }), h('div', { class: 'lead-row__meta', text: `${p.industry || 'bez branży'} · ${p.card_files ? `karta projektu (${p.card_files} plików)` : 'bez karty'} · zdjęć: ${p.images}` })),
                h(
                  'div',
                  { class: 'lead-row__badges' },
                  p.is_demo ? h('span', { class: 'status status--odrzucone', text: 'Demonstracyjny' }) : h('span', { class: 'status status--zakonczone', text: 'Zrealizowany' }),
                  p.card_files && p.slug ? h('a', { class: 'btn btn--sm', href: `/portfolio/${p.slug}/`, target: '_blank', rel: 'noopener', text: 'Karta ↗' }) : null,
                  h('span', { class: `status status--${p.status}`, text: p.status === 'published' ? 'Opublikowana' : 'Szkic' }),
                  h('button', { class: 'btn btn--sm icon-btn', type: 'button', 'aria-label': `Przesuń „${p.title}” wyżej`, text: '↑', disabled: idx === 0, onclick: () => move(idx, -1) }),
                  h('button', { class: 'btn btn--sm icon-btn', type: 'button', 'aria-label': `Przesuń „${p.title}” niżej`, text: '↓', disabled: idx === items.length - 1, onclick: () => move(idx, 1) }),
                  h('a', { class: 'btn btn--sm', href: `#portfolio/${p.id}`, text: 'Edytuj' })
                )
              )
            )
          )
        : h('div', { class: 'empty', text: 'Nie masz jeszcze realizacji. Gdy skończysz pierwszy projekt i firma zgodzi się na prezentację, dodaj go tutaj.' })
    );
  }

  async function viewProject(main, id) {
    const isNew = id === 'nowa';
    let project = { title: '', industry: '', description: '', site_url: '', status: 'draft', slug: '', tags: '', is_demo: 0, seo_for: '' };
    let images = [];
    let card = null;
    if (!isNew) {
      const { data, error } = await q(api(`portfolio/${encodeURIComponent(id)}`));
      if (error && !/Nie znaleziono/.test(error.message)) throw error;
      if (!data) {
        main.replaceChildren(h('a', { class: 'back', href: '#portfolio', text: '← Portfolio' }), h('div', { class: 'empty', text: 'Nie znaleziono realizacji.' }));
        return;
      }
      project = data.project;
      images = data.images;
      card = data.card;
    }
    const originalStatus = project.status;
    const originalImageIds = images.map((m) => m.id);

    const title = h('input', { type: 'text', maxlength: '150', value: project.title, required: true });
    const industry = h('input', { type: 'text', maxlength: '100', value: project.industry || '' });
    const desc = h('textarea', { rows: '5', maxlength: '5000' });
    desc.value = project.description || '';
    const url = h('input', { type: 'url', maxlength: '500', value: project.site_url || '', placeholder: 'https://' });
    const statusSel = h('select', null, h('option', { value: 'draft', text: 'Szkic (niewidoczna na stronie)' }), h('option', { value: 'published', text: 'Opublikowana (widoczna na stronie)' }));
    statusSel.value = project.status;
    const slugIn = h('input', { type: 'text', maxlength: '60', value: project.slug || '', placeholder: 'np. szalone-auto', pattern: '[a-z0-9-]+' });
    const tagsIn = h('input', { type: 'text', maxlength: '300', value: project.tags || '', placeholder: 'np. Logo · Strona 5 podstron · Panel CMS · Wersja na telefon' });
    // Rodzaj projektu: zrealizowany (prawdziwa firma) albo demonstracyjny — na stronie trafiają do osobnych zakładek
    const demoCb = h('input', { type: 'radio', name: 'pf-kind', value: 'demo', checked: !isNew && Boolean(project.is_demo) });
    const realRb = h('input', { type: 'radio', name: 'pf-kind', value: 'real', checked: !isNew && !project.is_demo });
    const seoFor = h('input', { type: 'text', maxlength: '80', value: project.seo_for || '', placeholder: 'np. warsztatu samochodowego' });
    [title, industry, desc, url, statusSel, slugIn, tagsIn, demoCb, seoFor].forEach((el) => el.addEventListener('input', () => (dirty = true)));
    demoCb.addEventListener('change', () => (dirty = true));
    realRb.addEventListener('change', () => (dirty = true));

    // ----- Karta projektu -----
    let pending = null; // { files, skipped, opis, total, warnings, urls }
    let coverChoice = (card && project.card_cover) || '';
    const cardBox = h('div');
    const zipInput = h('input', { type: 'file', accept: '.zip,application/zip', hidden: true, id: 'card-zip', 'aria-label': 'Paczka ZIP z kartą projektu' });
    const progress = h('div', { 'aria-live': 'polite' });
    function fillFromOpis(o) {
      if (o.title) title.value = o.title;
      if (o.industry) industry.value = o.industry.slice(0, 100);
      if (o.description) desc.value = o.description;
      if (o.tags) tagsIn.value = o.tags.slice(0, 300);
      if (o.site_url) url.value = o.site_url;
      if (o.slug) slugIn.value = o.slug;
      if (o.seo_for) seoFor.value = o.seo_for.slice(0, 80);
      demoCb.checked = Boolean(o.is_demo);
      realRb.checked = !o.is_demo;
      if (o.cover && pending && pending.files.some((f) => f.path === o.cover)) coverChoice = o.cover;
      dirty = true;
      drawCard();
      toast('Uzupełniłem pola z pliku z opisem — sprawdź je przed zapisaniem.');
    }
    function coverPicker(list) {
      if (!list.length) return h('p', { class: 'small muted', text: 'W karcie nie ma obrazów — kafelek na stronie pokaże pierwsze zdjęcie realizacji (jeśli je dodasz).' });
      if (!list.some((x) => x.path === coverChoice)) coverChoice = (list.find((x) => /start|cover|okladka|hero/i.test(x.path) && !/(^|\/)m-/.test(x.path)) || list[0]).path;
      const grid = h(
        'div',
        { class: 'cover-grid', role: 'radiogroup', 'aria-label': 'Okładka kafelka na stronie' },
        list.map((x) =>
          h(
            'label',
            { class: 'cover-opt' },
            h('input', { type: 'radio', name: 'card-cover', value: x.path, checked: x.path === coverChoice, onchange: async () => {
              coverChoice = x.path;
              if (!pending && card) {
                const { error } = await q(api(`portfolio/${project.id}/card`, { method: 'PATCH', body: { cover: x.path } }));
                if (error) return toast(errMsg(error), 'error');
                toast('Okładka zmieniona. Zmiana jest już na stronie.');
              } else dirty = true;
            } }),
            h('img', { src: x.url, alt: '', loading: 'lazy' }),
            h('span', { class: 'small', text: x.path })
          )
        )
      );
      return h('div', null, h('p', { class: 'small', text: 'Okładka kafelka na stronie głównej (najlepiej poziomy zrzut, np. 1600×1000):' }), grid);
    }
    function drawCard() {
      const parts = [];
      if (pending) {
        parts.push(
          h('div', { class: 'alert alert--info' },
            h('strong', { text: `Wybrana paczka: ${pending.files.length} plików, ${fmtSize(pending.total)}. ` }),
            'Zostanie wgrana po kliknięciu „Zapisz”.',
            card ? ' Zastąpi obecną kartę.' : ''
          )
        );
        if (pending.opis) parts.push(h('div', { class: 'alert alert--ok' }, 'W paczce jest plik z opisem do portfolio. ', h('button', { class: 'btn btn--sm', type: 'button', text: 'Wstaw dane z opisu do formularza', onclick: () => fillFromOpis(parseOpis(pending.opis)) })));
        pending.warnings.forEach((w) => parts.push(h('div', { class: 'alert alert--warn', text: w })));
        if (pending.skipped.length) parts.push(h('details', { class: 'small' }, h('summary', { text: `Pominięte pliki (${pending.skipped.length})` }), h('ul', null, pending.skipped.map((x) => h('li', { text: x })))));
        parts.push(coverPicker(pending.files.filter((f) => IMG_EXT.includes(f.ext)).map((f) => ({ path: f.path, url: pending.urls[f.path] }))));
        parts.push(h('button', { class: 'btn btn--sm', type: 'button', text: 'Anuluj wybór paczki', onclick: () => { Object.values(pending.urls).forEach(URL.revokeObjectURL); pending = null; zipInput.value = ''; drawCard(); } }));
      } else if (card) {
        parts.push(
          h('div', { class: 'card-status' },
            h('div', null,
              h('strong', { text: 'Karta jest wgrana' }),
              h('p', { class: 'small muted', text: `${card.files.length} plików · ${fmtSize(project.card_size || 0)} · ${project.card_at ? fmtDate(project.card_at) : ''}` }),
              h('p', { class: 'small' }, 'Adres: ', h('code', { text: `${location.origin}${card.url}` }))
            ),
            h('div', { class: 'actions' },
              h('a', { class: 'btn btn--primary btn--sm', href: card.url, target: '_blank', rel: 'noopener', text: project.status === 'published' ? 'Otwórz kartę ↗' : 'Podgląd karty ↗' }),
              h('button', { class: 'btn btn--sm btn--danger-outline', type: 'button', text: 'Usuń kartę', onclick: async () => {
                if (!(await confirmDialog({ title: 'Usunąć kartę projektu?', text: 'Pliki karty zostaną usunięte, a kafelek na stronie przestanie do niej prowadzić. Sama realizacja zostaje.' }))) return;
                const { error } = await q(api(`portfolio/${project.id}/card`, { method: 'DELETE' }));
                if (error) return toast(errMsg(error), 'error');
                toast('Karta usunięta.');
                route();
              } })
            )
          ),
          coverPicker(card.images)
        );
      } else {
        parts.push(h('p', { class: 'small muted', text: 'Brak karty. Kafelek na stronie pokaże opis i zdjęcia realizacji.' }));
      }
      parts.push(
        h('div', { class: 'actions' },
          h('button', { class: 'btn btn--sm', type: 'button', 'data-card-pick': '', text: card || pending ? 'Wybierz inną paczkę ZIP…' : 'Wybierz paczkę ZIP…', onclick: () => zipInput.click() }),
          h('span', { class: 'small muted', text: 'index.html + folder img/ (+ opcjonalnie opis-do-portfolio.txt)' })
        ),
        progress
      );
      cardBox.replaceChildren(...parts);
    }
    zipInput.addEventListener('change', async () => {
      const f = zipInput.files && zipInput.files[0];
      if (!f) return;
      progress.replaceChildren(h('p', { class: 'small muted', text: 'Rozpakowuję…' }));
      try {
        if (f.size > 60 * 1024 * 1024) throw new Error('Plik ZIP jest za duży (maksymalnie 60 MB).');
        const prepared = prepareCard(await readZip(f));
        if (pending) Object.values(pending.urls).forEach(URL.revokeObjectURL);
        prepared.urls = {};
        prepared.files.filter((x) => IMG_EXT.includes(x.ext)).forEach((x) => (prepared.urls[x.path] = URL.createObjectURL(new Blob([x.data], { type: x.ext === 'svg' ? 'image/svg+xml' : `image/${x.ext === 'jpg' ? 'jpeg' : x.ext}` }))));
        pending = prepared;
        dirty = true;
        progress.replaceChildren();
        if (pending.opis && !title.value.trim()) fillFromOpis(parseOpis(pending.opis));
        else drawCard();
      } catch (e) {
        zipInput.value = '';
        progress.replaceChildren(h('div', { class: 'alert alert--error', text: errMsg(e) }));
      }
    });
    drawCard();

    const imgList = h('ul', { class: 'thumbs' });
    function drawImages() {
      imgList.replaceChildren(
        ...(images.length
          ? images.map((m, i) =>
              h(
                'li',
                null,
                h('img', { src: m.url, alt: '' }),
                h('div', null, h('div', { class: 'small', text: m.alt || '(brak opisu)' }), i === 0 ? h('span', { class: 'small muted', text: 'Zdjęcie główne' }) : null),
                h(
                  'div',
                  { class: 'actions' },
                  h('button', { class: 'btn btn--sm icon-btn', type: 'button', 'aria-label': 'Wyżej', text: '↑', disabled: i === 0, onclick: () => { [images[i - 1], images[i]] = [images[i], images[i - 1]]; dirty = true; drawImages(); } }),
                  h('button', { class: 'btn btn--sm icon-btn', type: 'button', 'aria-label': 'Niżej', text: '↓', disabled: i === images.length - 1, onclick: () => { [images[i + 1], images[i]] = [images[i], images[i + 1]]; dirty = true; drawImages(); } }),
                  h('button', { class: 'btn btn--sm btn--danger-outline', type: 'button', text: 'Odepnij', onclick: () => { images.splice(i, 1); dirty = true; drawImages(); } })
                )
              )
            )
          : [h('li', { class: 'muted small', style: 'display:block', text: 'Brak zdjęć. Pierwsze zdjęcie będzie zdjęciem głównym.' })])
      );
    }
    drawImages();

    // Wybór z biblioteki
    const picker = h('div');
    async function openPicker() {
      const { data: libRes, error } = await q(api('media'));
      if (error) return toast(errMsg(error), 'error');
      const lib = libRes.items;
      const available = (lib || []).filter((m) => !images.some((x) => x.id === m.id));
      if (!available.length) {
        picker.replaceChildren(h('p', { class: 'muted small', text: 'Brak innych zdjęć w bibliotece. Wgraj nowe poniżej.' }));
        return;
      }
      const checks = [];
      picker.replaceChildren(
        h(
          'div',
          { class: 'media-grid' },
          available.map((m) => {
            const cb = h('input', { type: 'checkbox', 'aria-label': `Wybierz: ${m.alt || 'zdjęcie'}` });
            checks.push([cb, m]);
            return h('label', { class: 'media-card pick' }, cb, h('img', { src: m.url, alt: '' }), h('div', { class: 'media-card__body small', text: m.alt || '(brak opisu)' }));
          })
        ),
        h('p', null),
        h('button', {
          class: 'btn btn--primary btn--sm',
          type: 'button',
          text: 'Dodaj zaznaczone',
          onclick: () => {
            checks.filter(([cb]) => cb.checked).forEach(([, m]) => images.push(m));
            dirty = true;
            picker.replaceChildren();
            drawImages();
          },
        })
      );
    }

    const msg = h('div', { 'aria-live': 'polite' });
    const saveBtn = h('button', { class: 'btn btn--primary', type: 'submit', text: isNew ? 'Zapisz realizację' : 'Zapisz zmiany' });

    const form = h(
      'form',
      {
        novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          msg.replaceChildren();
          const t = title.value.trim();
          if (!t) {
            title.focus();
            return msg.replaceChildren(h('div', { class: 'alert alert--error', text: 'Podaj nazwę realizacji.' }));
          }
          let site = url.value.trim();
          if (site && !/^https?:\/\//i.test(site)) site = `https://${site}`;
          if (site) {
            try {
              new URL(site);
            } catch {
              url.focus();
              return msg.replaceChildren(h('div', { class: 'alert alert--error', text: 'Adres strony ma niepoprawny format.' }));
            }
          }
          if (!demoCb.checked && !realRb.checked) {
            realRb.focus();
            return msg.replaceChildren(h('div', { class: 'alert alert--error', text: 'Wybierz rodzaj projektu: zrealizowany albo demonstracyjny.' }));
          }
          if (statusSel.value === 'published' && originalStatus !== 'published') {
            const ok = await confirmDialog({
              title: 'Opublikować realizację?',
              text: demoCb.checked
                ? 'Projekt zostanie oznaczony na stronie jako „Projekt demonstracyjny”. Upewnij się, że firma i dane w projekcie są fikcyjne (albo masz zgodę prawdziwej firmy).'
                : 'Upewnij się, że firma wyraziła zgodę na pokazanie nazwy, zrzutów ekranu i linku do strony w Twoim portfolio. Realizacja będzie widoczna publicznie.',
              ok: demoCb.checked ? 'Publikuję' : 'Mam zgodę — publikuję',
              danger: false,
            });
            if (!ok) return;
          }
          const slugVal = slugIn.value.trim().toLowerCase();
          if (slugVal && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slugVal)) {
            slugIn.focus();
            return msg.replaceChildren(h('div', { class: 'alert alert--error', text: 'Adres karty: tylko małe litery bez polskich znaków, cyfry i pojedyncze myślniki, np. salon-ola.' }));
          }
          busy(saveBtn, true);
          const payload = { title: t, industry: industry.value.trim(), description: desc.value.trim(), site_url: site || null, status: statusSel.value, slug: slugVal, tags: tagsIn.value.trim(), is_demo: demoCb.checked, seo_for: seoFor.value.trim() };
          const res = await q(api(isNew ? 'portfolio' : `portfolio/${project.id}`, { method: isNew ? 'POST' : 'PUT', body: { ...payload, image_ids: images.map((m) => m.id) } }));
          if (res.error) {
            busy(saveBtn, false);
            return msg.replaceChildren(h('div', { class: 'alert alert--error', text: `Nie zapisano: ${errMsg(res.error)}` }));
          }
          const pid = res.data.id;
          if (pending) {
            const bar = h('progress', { max: String(pending.files.length), value: '0', style: 'width:100%' });
            const lbl = h('p', { class: 'small', text: 'Wgrywam kartę projektu…' });
            progress.replaceChildren(lbl, bar);
            try {
              await uploadCard(pid, pending, coverChoice, (d, n) => { bar.value = d; lbl.textContent = `Wgrywam kartę projektu… ${d} / ${n}`; });
              Object.values(pending.urls).forEach(URL.revokeObjectURL);
              pending = null;
            } catch (err) {
              busy(saveBtn, false);
              dirty = false;
              progress.replaceChildren(h('div', { class: 'alert alert--error', text: `Realizacja zapisana, ale karty nie wgrano: ${errMsg(err)} Spróbuj ponownie.` }));
              if (isNew) location.hash = `#portfolio/${pid}`;
              return;
            }
          }
          busy(saveBtn, false);
          dirty = false;
          toast('Realizacja zapisana. Zmiana jest już na stronie.');
          if (isNew) location.hash = `#portfolio/${pid}`;
          else route();
        },
      },
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Informacje' }),
        h('div', { class: 'grid-2' }, field('Nazwa realizacji / firmy *', title), field('Branża / podtytuł', industry, 'np. Warsztat samochodowy · Wrocław')),
        field('Opis (1–2 zdania na kafelek)', desc, 'Co przygotowałeś i co było ważne dla firmy.'),
        field('Tagi (zakres projektu)', tagsIn, 'Oddziel kropką „·” albo przecinkiem. Pokażą się jako etykiety na kafelku.'),
        field('Dla kogo jest ten projekt (do opisu w Google)', seoFor, 'Dokończ zdanie „Projekt strony internetowej dla …”, np. warsztatu samochodowego, salonu fryzjerskiego, gabinetu fizjoterapii. Google zobaczy kartę jako przykładowy projekt dla tej branży, a nie jako stronę prawdziwej firmy. Na stronie nic się nie zmieni.'),
        h('div', { class: 'grid-2' }, field('Adres strony (na żywo)', url), field('Status', statusSel, 'Szkic jest widoczny tylko w panelu.')),
        h(
          'fieldset',
          { class: 'kind-pick' },
          h('legend', { text: 'Rodzaj projektu *' }),
          h('label', { class: 'check' }, realRb, h('span', null, h('strong', { text: 'Projekt zrealizowany' }), ' — strona dla prawdziwej firmy, pokazywana za jej zgodą')),
          h('label', { class: 'check' }, demoCb, h('span', null, h('strong', { text: 'Projekt demonstracyjny' }), ' — fikcyjna firma / koncepcja; na stronie pojawi się oznaczenie „Projekt demonstracyjny”')),
          h('p', { class: 'small muted', text: 'Na stronie projekty są w dwóch zakładkach: „Projekty zrealizowane” i „Projekty demonstracyjne”. Dopóki nie opublikujesz żadnego zrealizowanego projektu, zakładka zrealizowanych jest ukryta.' })
        )
      ),
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Karta projektu' }),
        h('p', { class: 'small muted', text: 'Osobna podstrona ze studium przypadku, np. /portfolio/szalone-auto/. Wgraj paczkę ZIP przygotowaną według instrukcji (docs/PORTFOLIO.md). Kafelek na stronie głównej dostanie przycisk „Zobacz projekt”.' }),
        field('Adres karty', slugIn, `Twoja strona/portfolio/${'<adres>'}/ — zostaw puste, a utworzę go z nazwy.`),
        zipInput,
        cardBox
      ),
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Zdjęcia realizacji' }),
        imgList,
        h('button', { class: 'btn btn--sm', type: 'button', text: 'Wybierz z biblioteki', onclick: openPicker }),
        picker
      ),
      msg,
      h('div', { class: 'actions' }, saveBtn)
    );

    const uploader = uploaderForm((m) => {
      images.push(m);
      dirty = true;
      drawImages();
    });

    const delBtn = isNew
      ? null
      : h('button', {
          class: 'btn btn--danger-outline',
          type: 'button',
          text: 'Usuń realizację',
          onclick: async () => {
            const ok = await confirmDialog({ title: 'Usunąć realizację?', text: `„${project.title}” zostanie usunięta z portfolio. Zdjęcia pozostaną w bibliotece.` });
            if (!ok) return;
            const { error } = await q(api(`portfolio/${project.id}`, { method: 'DELETE' }));
            if (error) return toast(errMsg(error), 'error');
            dirty = false;
            toast('Realizacja usunięta.');
            location.hash = '#portfolio';
          },
        });

    main.replaceChildren(h('a', { class: 'back', href: '#portfolio', text: '← Portfolio' }), head(isNew ? 'Nowa realizacja' : project.title, null, delBtn), form, h('p'), uploader);
  }

  // =========================================================
  // USTAWIENIA
  // =========================================================
  function passwordPanel() {
    const cur = h('input', { type: 'password', autocomplete: 'current-password', maxlength: '200', required: true });
    const next = h('input', { type: 'password', autocomplete: 'new-password', maxlength: '200', minlength: '10', required: true });
    const rep = h('input', { type: 'password', autocomplete: 'new-password', maxlength: '200', required: true });
    const msg = h('div', { 'aria-live': 'polite' });
    const btn = h('button', { class: 'btn btn--primary', type: 'submit', text: 'Zmień hasło' });
    const show = h('input', { type: 'checkbox', onchange: () => [cur, next, rep].forEach((i) => (i.type = show.checked ? 'text' : 'password')) });
    return h(
      'section',
      { class: 'panel' },
      h('h2', { text: 'Zmiana hasła' }),
      h(
        'form',
        {
          'data-password-form': '',
          novalidate: true,
          onsubmit: async (e) => {
            e.preventDefault();
            msg.replaceChildren();
            const err = (t, el) => { msg.replaceChildren(h('div', { class: 'alert alert--error', text: t })); if (el) el.focus(); };
            if (!cur.value) return err('Wpisz obecne hasło.', cur);
            if (next.value.length < 10) return err('Nowe hasło musi mieć co najmniej 10 znaków.', next);
            if (next.value !== rep.value) return err('Nowe hasła nie są takie same.', rep);
            busy(btn, true, 'Zmieniam…');
            const { error } = await q(api('password', { method: 'POST', body: { current: cur.value, next: next.value } }));
            busy(btn, false);
            if (error) return err(errMsg(error), cur);
            [cur, next, rep].forEach((i) => (i.value = ''));
            msg.replaceChildren(h('div', { class: 'alert alert--ok', text: 'Hasło zmienione. Na innych urządzeniach trzeba zalogować się ponownie nowym hasłem.' }));
            toast('Hasło zostało zmienione.');
          },
        },
        h('div', { class: 'grid-2' }, field('Obecne hasło', cur), h('div')),
        h('div', { class: 'grid-2' }, field('Nowe hasło', next, 'Co najmniej 10 znaków. Najlepiej kilka słów albo hasło z menedżera haseł.'), field('Powtórz nowe hasło', rep)),
        h('label', { class: 'check' }, show, 'Pokaż hasła'),
        msg,
        h('div', { class: 'actions' }, btn)
      ),
      h(
        'details',
        { class: 'small', style: 'margin-top:14px' },
        h('summary', { text: 'Nie pamiętasz obecnego hasła?' }),
        h('ol', null,
          h('li', null, 'Otwórz ', h('a', { href: '/admin/generator-hasla.html', target: '_blank', rel: 'noopener', text: 'generator hasła' }), ', wpisz nowe hasło i skopiuj wynik.'),
          h('li', { text: 'W Cloudflare: projekt → Settings → Variables and Secrets → ADMIN_PASSWORD_HASH → Edit → wklej → Save.' }),
          h('li', { text: 'Deployments → przy najnowszym wdrożeniu „⋯” → Retry deployment. Nowa wartość w Cloudflare zastępuje hasło ustawione w panelu.' })
        )
      )
    );
  }


  // =========================================================
  // AKTUALNOŚCI (posty na stronie) i profile w mediach społecznościowych
  // =========================================================
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const plDay = (day) => {
    const m = String(day || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${Number(m[3])}.${m[2]}.${m[1]}` : '';
  };
  /** Czy link wskazuje konkretny post z Facebooka / Instagrama (taki da się osadzić)? Serwer sprawdza to samo. */
  function embedKind(url) {
    let u;
    try {
      u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    } catch {
      return null;
    }
    const host = u.hostname.toLowerCase();
    if (host === 'instagram.com' || host === 'www.instagram.com') return /^\/(?:[A-Za-z0-9._]+\/)?(p|reel|tv)\/[A-Za-z0-9_-]{5,40}\/?/.test(u.pathname) ? 'instagram' : null;
    if (['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.com', 'www.fb.com'].includes(host)) {
      return /\/videos\/|\/reel\/|^\/watch\/?$|\/posts\/|\/photos\/|^\/permalink\.php$|^\/story\.php$|^\/photo(\.php)?\/?$|^\/share\/[pvr]\//.test(u.pathname) ? 'facebook' : null;
    }
    return null;
  }

  function socialPanel(settings) {
    const fb = h('input', { type: 'url', maxlength: '300', inputmode: 'url', placeholder: 'https://www.facebook.com/twojprofil', value: settings.facebook_url || '', 'data-social-input': 'facebook' });
    const ig = h('input', { type: 'url', maxlength: '300', inputmode: 'url', placeholder: 'https://www.instagram.com/twojprofil/', value: settings.instagram_url || '', 'data-social-input': 'instagram' });
    const btn = h('button', {
      class: 'btn btn--primary btn--sm',
      type: 'button',
      text: 'Zapisz profile',
      'data-social-save': '',
      onclick: async () => {
        busy(btn, true);
        const { data, error: e } = await q(api('settings', { method: 'PUT', body: { facebook_url: fb.value.trim(), instagram_url: ig.value.trim() } }));
        busy(btn, false);
        if (e) return toast(errMsg(e), 'error');
        const st = (await q(api('settings'))).data;
        if (st && st.settings) {
          fb.value = st.settings.facebook_url || '';
          ig.value = st.settings.instagram_url || '';
        }
        toast(fb.value || ig.value ? 'Zapisano. Linki do profili są już na stronie.' : 'Zapisano. Linki do profili zostały usunięte ze strony.');
        return data;
      },
    });
    return h(
      'section',
      { class: 'panel' },
      h('h2', { text: 'Profile na Facebooku i Instagramie' }),
      h('p', { class: 'small muted', text: 'Linki pojawią się przy formularzu kontaktowym, w stopce i pod aktualnościami. Zostaw pole puste, aby ukryć dany link. Możesz wpisać pełny adres albo samą nazwę profilu.' }),
      h('div', { class: 'grid-2' }, field('Facebook', fb), field('Instagram', ig)),
      btn
    );
  }

  async function viewPosts(main, param) {
    if (param) return viewPost(main, param);
    const [{ items }, { settings }] = await Promise.all([api('posts'), api('settings')]);
    const published = items.filter((p) => p.status === 'published').length;

    const toggle = h('input', { type: 'checkbox', role: 'switch', checked: !!settings.posts_enabled, 'data-posts-toggle': '' });
    const toggleText = h('span');
    const info = h('div');
    function draw() {
      toggleText.textContent = toggle.checked ? 'Sekcja „Aktualności” włączona' : 'Sekcja „Aktualności” wyłączona';
      const visible = toggle.checked && published > 0;
      info.replaceChildren(
        h('div', {
          class: `alert ${visible ? 'alert--ok' : 'alert--info'}`,
          'data-posts-state': visible ? 'visible' : 'hidden',
          text: visible
            ? `Sekcja jest widoczna na stronie (opublikowane posty: ${published}, na stronie pokazuję 6 najnowszych).`
            : toggle.checked
              ? 'Sekcja jest włączona, ale pojawi się na stronie dopiero po opublikowaniu pierwszego posta.'
              : 'Sekcja jest ukryta na stronie. Posty zostają zapisane w panelu — możesz je przygotować i włączyć sekcję później.',
        })
      );
    }
    draw();
    toggle.addEventListener('change', async () => {
      toggle.disabled = true;
      const { error: e } = await q(api('settings', { method: 'PUT', body: { posts_enabled: toggle.checked } }));
      toggle.disabled = false;
      if (e) {
        toggle.checked = !toggle.checked;
        toast(`Nie zapisano: ${errMsg(e)}`, 'error');
      } else toast(toggle.checked ? 'Sekcja „Aktualności” włączona.' : 'Sekcja „Aktualności” wyłączona — zniknęła ze strony.');
      draw();
    });

    main.replaceChildren(
      head('Aktualności', 'Krótkie posty na stronie głównej: nowe projekty, wolne terminy, ogłoszenia. Piszesz je tutaj — strona nie pobiera niczego automatycznie z Facebooka ani Instagrama. Do posta możesz dodać link do oryginału i (opcjonalnie) jego osadzenie, które wczyta się dopiero po kliknięciu odwiedzającego.', h('a', { class: 'btn btn--primary', href: '#aktualnosci/nowy', text: 'Dodaj post' })),
      h('section', { class: 'panel' }, h('h2', { text: 'Sekcja na stronie' }), h('label', { class: 'switch' }, toggle, h('span', { class: 'switch__track', 'aria-hidden': 'true' }), toggleText), h('p'), info),
      items.length
        ? h(
            'ul',
            { class: 'lead-list', 'data-post-list': '' },
            items.map((p) =>
              h(
                'li',
                { class: 'lead-row' },
                h(
                  'div',
                  null,
                  h('a', { class: 'lead-row__title', href: `#aktualnosci/${p.id}`, text: p.title }),
                  h('div', { class: 'lead-row__meta', text: [plDay(p.published_on), p.image ? 'ze zdjęciem' : 'bez zdjęcia', p.link_kind ? `link: ${p.link_kind === 'instagram' ? 'Instagram' : 'Facebook'}` : p.link_url ? 'z linkiem' : '', p.embed ? 'osadzenie po kliknięciu' : ''].filter(Boolean).join(' · ') })
                ),
                h(
                  'div',
                  { class: 'lead-row__badges' },
                  h('span', { class: `status status--${p.status}`, text: p.status === 'published' ? 'Opublikowany' : 'Szkic' }),
                  h('a', { class: 'btn btn--sm', href: `#aktualnosci/${p.id}`, text: 'Edytuj' })
                )
              )
            )
          )
        : h('div', { class: 'empty', text: 'Nie masz jeszcze postów. Dodaj pierwszy — np. o nowym projekcie w portfolio albo wolnym terminie.' }),
      socialPanel(settings)
    );
  }

  async function viewPost(main, id) {
    const isNew = id === 'nowy';
    let post = { title: '', body: '', published_on: today(), image: null, media_id: null, link_url: '', embed: false, status: 'draft' };
    if (!isNew) {
      const found = ((await api('posts')).items || []).find((p) => p.id === id);
      if (!found) {
        main.replaceChildren(h('a', { class: 'back', href: '#aktualnosci', text: '← Aktualności' }), h('div', { class: 'empty', text: 'Nie znaleziono posta.' }));
        return;
      }
      post = found;
    }
    let image = post.image ? { id: post.media_id, url: post.image.url, alt: post.image.alt } : null;

    const title = h('input', { type: 'text', maxlength: '150', value: post.title, required: true, 'data-post-title': '' });
    const date = h('input', { type: 'date', value: post.published_on, required: true, 'data-post-date': '' });
    const text = h('textarea', { rows: '7', maxlength: '3000', 'data-post-body': '' });
    text.value = post.body || '';
    const counter = h('p', { class: 'hint' });
    const count = () => (counter.textContent = `${text.value.length} / 3000 znaków. Pusta linia = nowy akapit. Długie posty na stronie są skracane z przyciskiem „Czytaj dalej”.`);
    count();
    const link = h('input', { type: 'url', maxlength: '500', inputmode: 'url', value: post.link_url || '', placeholder: 'https://www.instagram.com/p/… albo https://www.facebook.com/…/posts/…', 'data-post-link': '' });
    const embed = h('input', { type: 'checkbox', checked: !!post.embed, 'data-post-embed': '' });
    const embedHint = h('p', { class: 'small muted' });
    const status = h('select', { 'data-post-status': '' }, h('option', { value: 'draft', text: 'Szkic (tylko w panelu)' }), h('option', { value: 'published', text: 'Opublikowany' }));
    status.value = post.status;
    function syncEmbed() {
      const k = link.value.trim() ? embedKind(link.value.trim()) : null;
      embed.disabled = !k;
      if (!k) embed.checked = false;
      embedHint.textContent = k
        ? `Rozpoznano post z ${k === 'instagram' ? 'Instagrama' : 'Facebooka'}. Po zaznaczeniu pod postem pojawi się przycisk „Pokaż oryginalny post” — treść z Meta wczyta się dopiero po jego kliknięciu (zgodnie z polityką prywatności).`
        : link.value.trim()
          ? 'Ten link nie wskazuje konkretnego posta z Facebooka lub Instagrama — będzie zwykłym linkiem „Czytaj więcej”. Osadzić można np. https://www.instagram.com/p/ABC123/ albo https://www.facebook.com/twojprofil/posts/…'
          : 'Wklej link do posta, aby dodać przycisk „Zobacz na Facebooku / Instagramie” i (opcjonalnie) osadzenie oryginału.';
    }
    syncEmbed();
    [title, date, text, link, embed, status].forEach((el) => el.addEventListener('input', () => (dirty = true)));
    text.addEventListener('input', count);
    link.addEventListener('input', syncEmbed);
    status.addEventListener('change', () => (dirty = true));

    const imgBox = h('div', { 'data-post-image': '' });
    const picker = h('div');
    function drawImage() {
      imgBox.replaceChildren(
        image
          ? h(
              'div',
              { class: 'post-img-pick' },
              h('img', { src: image.url, alt: '' }),
              h('div', null, h('p', { class: 'small', text: image.alt || '(brak opisu)' }), h('button', { class: 'btn btn--sm btn--danger-outline', type: 'button', text: 'Usuń zdjęcie z posta', onclick: () => { image = null; dirty = true; drawImage(); } }))
            )
          : h('p', { class: 'small muted', text: 'Bez zdjęcia — post będzie samym tekstem.' })
      );
    }
    drawImage();
    async function openPicker() {
      const { data: libRes, error } = await q(api('media'));
      if (error) return toast(errMsg(error), 'error');
      const lib = (libRes.items || []).filter((m) => !image || m.id !== image.id);
      if (!lib.length) return picker.replaceChildren(h('p', { class: 'muted small', text: 'Biblioteka jest pusta. Wgraj zdjęcie poniżej.' }));
      picker.replaceChildren(
        h(
          'div',
          { class: 'media-grid' },
          lib.map((m) =>
            h(
              'button',
              { class: 'media-card pick', type: 'button', 'aria-label': `Wybierz: ${m.alt || 'zdjęcie'}`, onclick: () => { image = m; dirty = true; picker.replaceChildren(); drawImage(); } },
              h('img', { src: m.url, alt: '' }),
              h('div', { class: 'media-card__body small', text: m.alt || '(brak opisu)' })
            )
          )
        )
      );
    }

    const msg = h('div', { 'aria-live': 'polite' });
    const saveBtn = h('button', { class: 'btn btn--primary', type: 'submit', text: isNew ? 'Zapisz post' : 'Zapisz zmiany', 'data-post-save': '' });
    const form = h(
      'form',
      {
        novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          msg.replaceChildren();
          const err = (t, el) => {
            if (el) el.focus();
            msg.replaceChildren(h('div', { class: 'alert alert--error', text: t }));
          };
          if (!title.value.trim()) return err('Podaj tytuł posta.', title);
          if (!date.value) return err('Podaj datę posta.', date);
          if (!text.value.trim() && !image && !embed.checked) return err('Dodaj treść, zdjęcie albo osadzenie oryginalnego posta.', text);
          busy(saveBtn, true);
          const body = { title: title.value.trim(), published_on: date.value, body: text.value, media_id: image ? image.id : null, link_url: link.value.trim() || null, embed: embed.checked, status: status.value };
          const res = await q(api(isNew ? 'posts' : `posts/${post.id}`, { method: isNew ? 'POST' : 'PUT', body }));
          busy(saveBtn, false);
          if (res.error) return err(`Nie zapisano: ${errMsg(res.error)}`);
          dirty = false;
          toast(status.value === 'published' ? 'Post zapisany i opublikowany.' : 'Post zapisany jako szkic.');
          location.hash = '#aktualnosci';
        },
      },
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Treść' }),
        h('div', { class: 'grid-2' }, field('Tytuł *', title), field('Data posta *', date, 'Posty są ułożone od najnowszego.')),
        h('div', { class: 'field' }, h('label', { for: (text.id = `f-${Math.random().toString(36).slice(2, 9)}`), text: 'Treść' }), text, counter),
        field('Status', status, 'Szkic jest widoczny tylko w panelu.'),
        h('p', { class: 'small muted', text: 'Publikuj tylko własne teksty i zdjęcia, do których masz prawa (np. zrzuty swoich projektów). Nie kopiuj cudzych postów.' })
      ),
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Zdjęcie' }),
        imgBox,
        h('button', { class: 'btn btn--sm', type: 'button', text: 'Wybierz z biblioteki', onclick: openPicker, 'data-post-pick': '' }),
        picker
      ),
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Link do oryginału (opcjonalnie)' }),
        field('Adres posta na Facebooku / Instagramie albo innej strony', link),
        h('label', { class: 'check' }, embed, h('span', null, h('strong', { text: 'Pokaż też oryginalny post' }), ' — wczytywany z Facebooka / Instagrama dopiero po kliknięciu odwiedzającego')),
        embedHint
      ),
      msg,
      h('div', { class: 'actions' }, saveBtn)
    );
    const uploader = uploaderForm((m) => {
      image = m;
      dirty = true;
      drawImage();
    });
    const delBtn = isNew
      ? null
      : h('button', {
          class: 'btn btn--danger-outline',
          type: 'button',
          text: 'Usuń post',
          'data-post-delete': '',
          onclick: async () => {
            if (!(await confirmDialog({ title: 'Usunąć post?', text: `Post „${post.title}” zniknie ze strony i z panelu. Zdjęcie zostaje w bibliotece.` }))) return;
            const { error: e } = await q(api(`posts/${post.id}`, { method: 'DELETE' }));
            if (e) return toast(errMsg(e), 'error');
            dirty = false;
            toast('Post usunięty.');
            location.hash = '#aktualnosci';
          },
        });
    main.replaceChildren(
      h('a', { class: 'back', href: '#aktualnosci', text: '← Aktualności' }),
      head(isNew ? 'Nowy post' : 'Edycja posta'),
      form,
      h('details', { class: 'panel' }, h('summary', { text: 'Wgraj nowe zdjęcie do biblioteki i dodaj do posta' }), uploader),
      delBtn ? h('div', { class: 'actions', style: 'margin-top:24px' }, delBtn) : null
    );
  }

  async function viewSettings(main) {
    const settings = (await api('settings')).settings || { recruitment_open: 1, contact_email: 'stronyaiwroclaw@gmail.com' };

    // Nabór
    const toggle = h('input', { type: 'checkbox', role: 'switch', checked: settings.recruitment_open });
    const toggleText = h('span');
    const toggleInfo = h('p', { class: 'small muted' });
    function drawToggle() {
      toggleText.textContent = toggle.checked ? 'Nabór włączony — przyjmuję nowe zgłoszenia' : 'Nabór wyłączony — formularz jest ukryty';
      toggleInfo.textContent = toggle.checked
        ? 'Na stronie widoczny jest formularz zgłoszeniowy.'
        : 'Zamiast formularza odwiedzający widzą komunikat: „Obecnie realizuję przyjęte projekty. Możesz napisać do mnie, aby zapytać o kolejny termin”, razem z adresem e-mail.';
    }
    drawToggle();
    toggle.addEventListener('change', async () => {
      toggle.disabled = true;
      const { error: e } = await q(api('settings', { method: 'PUT', body: { recruitment_open: toggle.checked } }));
      toggle.disabled = false;
      if (e) {
        toggle.checked = !toggle.checked;
        toast(`Nie zapisano: ${errMsg(e)}`, 'error');
      } else toast(toggle.checked ? 'Nabór włączony. Formularz jest już widoczny na stronie.' : 'Nabór wyłączony. Formularz jest już ukryty na stronie.');
      drawToggle();
    });

    // E-mail kontaktowy
    const email = h('input', { type: 'email', maxlength: '254', value: settings.contact_email });
    const emailBtn = h('button', {
      class: 'btn btn--primary btn--sm',
      type: 'button',
      text: 'Zapisz adres',
      onclick: async () => {
        const v = email.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toast('Podaj poprawny adres e-mail.', 'error');
        busy(emailBtn, true);
        const { error: e } = await q(api('settings', { method: 'PUT', body: { contact_email: v } }));
        busy(emailBtn, false);
        if (e) toast(errMsg(e), 'error');
        else toast('Zapisano adres kontaktowy.');
      },
    });

    // Stan konfiguracji
    const cfgBox = h('div', null, h('p', { class: 'muted small', text: 'Sprawdzam konfigurację…' }));
    api('status')
      .then((st) => {
        const row = (label, ok, extra) => h('li', null, h('span', { text: label }), h('strong', { style: `color:${ok ? 'var(--ok)' : 'var(--danger)'}`, text: ok ? `✓ ${extra || 'skonfigurowano'}` : `✗ ${extra || 'brak'}` }));
        const testBtn = h('button', {
          class: 'btn btn--sm',
          type: 'button',
          text: 'Wyślij e-mail testowy',
          onclick: async () => {
            busy(testBtn, true, 'Wysyłam…');
            try {
              const r = await api('test-email', { method: 'POST' });
              toast(r.message);
            } catch (e) {
              toast(e.message, 'error');
            }
            busy(testBtn, false);
          },
        });
        cfgBox.replaceChildren(
          h(
            'ul',
            { class: 'status-list' },
            row('Baza danych Cloudflare D1 (DB)', st.db),
            row('Magazyn zdjęć Cloudflare KV (MEDIA)', st.media, st.media ? 'skonfigurowano' : 'brak — wgrywanie zdjęć nie zadziała'),
            row('Ochrona formularza Cloudflare Turnstile', st.turnstile, st.turnstile ? 'włączona' : 'wyłączona — ustaw klucze TURNSTILE_*'),
            row('Wysyłka z Gmaila (e-maile do klientów)', st.gmail, st.gmail ? `z ${st.gmailUser}` : 'brak GMAIL_USER / GMAIL_APP_PASSWORD — instrukcja w docs/EMAIL.md'),
            row('Powiadomienia do Ciebie', st.email, st.email ? `na ${st.notifyTo} (${st.gmail ? 'przez Gmail' : 'przez Resend'})` : 'brak konfiguracji Gmaila i RESEND_API_KEY'),
            row('Sól do skracania adresów IP', st.ipSalt, st.ipSalt ? 'ustawiona' : 'brak IP_HASH_SALT'),
            row('Adres docelowy strony (SITE_URL)', !!st.siteUrl, st.siteUrl || 'nieustawiony — używany jest bieżący adres')
          ),
          h('p', { class: 'small muted', text: `Nadawca powiadomień: ${st.notifyFrom}` }),
          testBtn
        );
      })
      .catch((e) => cfgBox.replaceChildren(h('div', { class: 'alert alert--error', text: `Nie udało się sprawdzić konfiguracji: ${e.message}` })));

    main.replaceChildren(
      head('Ustawienia'),
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Przyjmowanie nowych projektów' }),
        h('label', { class: 'switch' }, toggle, h('span', { class: 'switch__track', 'aria-hidden': 'true' }), toggleText),
        h('p'),
        toggleInfo,
        h('p', { class: 'small muted', text: 'Wyłączenie naboru nie usuwa żadnych zgłoszeń ani kontaktów. Aby usunąć dane konkretnej osoby, otwórz jej zgłoszenie i użyj przycisku „Usuń zgłoszenie”.' })
      ),
      h('section', { class: 'panel' }, h('h2', { text: 'Adres e-mail na stronie' }), field('Adres kontaktowy wyświetlany na stronie', email, 'Adres, na który przychodzą powiadomienia, ustawiasz w Cloudflare (zmienna NOTIFY_TO).'), emailBtn),
      socialPanel(settings),
      h('section', { class: 'panel' }, h('h2', { text: 'Stan konfiguracji' }), cfgBox),
      passwordPanel()
    );
  }
})();
