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
    brief: viewBrief,
    tresci: viewContent,
    faq: () => viewList(LISTS.faq),
    branze: () => viewList(LISTS.branze),
    mozliwosci: () => viewList(LISTS.mozliwosci),
    portfolio: viewPortfolio,
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
                  l.source === 'reczne' ? h('span', { class: 'status status--odrzucone', text: 'Dodane ręcznie' }) : null,
                  l.source !== 'reczne' && ['failed', 'skipped'].includes(l.notification_status) ? h('span', { class: `status status--${l.notification_status}`, text: NOTIF_LABEL[l.notification_status] }) : null,
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
      industry: h('input', { type: 'text', maxlength: '100', placeholder: 'np. salon kosmetyczny' }),
      website_url: h('input', { type: 'url', maxlength: '500', placeholder: 'https://' }),
      message: h('textarea', { rows: '3', maxlength: '5000', placeholder: 'np. „Napisałem 3.10, odpowiedziała, że jest zainteresowana”' }),
    };
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
          busy(btn, true);
          const { data, error } = await q(api('leads', { method: 'POST', body: payload }));
          busy(btn, false);
          if (error) return toast(errMsg(error), 'error');
          toast('Zgłoszenie dodane. Możesz teraz utworzyć brief.');
          location.hash = `#zgloszenie/${data.id}`;
        },
      },
      h('h2', { text: 'Dodaj zgłoszenie ręcznie' }),
      h('p', { class: 'small muted', text: 'Dla firm, z którymi kontakt nawiązałeś mailowo lub telefonicznie, a nie przez formularz na stronie. Dzięki temu wszyscy klienci i ich briefy są w jednym miejscu.' }),
      h('div', { class: 'grid-2' }, field('Nazwa firmy *', f.company_name), field('Osoba kontaktowa *', f.contact_name), field('E-mail *', f.email), field('Telefon', f.phone), field('Branża', f.industry), field('Obecna strona', f.website_url)),
      field('Opis / jak nawiązano kontakt', f.message),
      h('div', { class: 'actions' }, btn, h('button', { class: 'btn', type: 'button', text: 'Anuluj', onclick: () => { form.reset(); form.hidden = true; } }))
    );
    return form;
  }

  async function viewLead(main, id) {
    const res = await q(api(`leads/${encodeURIComponent(id || '')}`));
    const lead = res.data && res.data.lead;
    const notes = res.data ? res.data.notes : [];
    const leadBrief = res.data ? res.data.brief : null;
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
        ['Branża', lead.industry],
        ['Osoba kontaktowa', lead.contact_name],
        ['E-mail', h('a', { href: `mailto:${lead.email}`, text: lead.email })],
        ['Telefon', lead.phone ? h('a', { href: `tel:${lead.phone.replace(/[^\d+]/g, '')}`, text: lead.phone }) : '—'],
        ['Obecna strona', link(lead.website_url)],
        ['Facebook', link(lead.facebook_url)],
        ['Instagram', link(lead.instagram_url)],
      ].map(([k, v]) => [h('dt', { text: k }), h('dd', null, v)])
    );

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
        h('a', { class: 'btn', href: '#brief-zgloszenia', onclick: (e) => { e.preventDefault(); const t = $('#brief-zgloszenia'); if (t) t.scrollIntoView({ behavior: 'smooth' }); }, text: leadBrief ? 'Brief ↓' : 'Utwórz brief ↓' }),
        h('a', { class: 'btn btn--primary', href: `mailto:${lead.email}?subject=${subject}`, text: 'Odpowiedz e-mailem' })
      ),
      h(
        'div',
        { class: 'detail-grid' },
        h('div', null, h('section', { class: 'panel' }, h('h2', { text: 'Dane zgłoszenia' }), dl), h('section', { class: 'panel' }, h('h2', { text: 'Oczekiwania' }), h('div', { class: 'message-box', text: lead.message }))),
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
                const ok = await confirmDialog({ title: 'Usunąć zgłoszenie?', text: `Zgłoszenie firmy „${lead.company_name}”, jego notatki${leadBrief ? ' i przypięty brief' : ''} zostaną trwale usunięte. Tej operacji nie można cofnąć.`, ok: 'Usuń na stałe' });
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
      leadBriefSection(lead, leadBrief)
    );
  }

  /** Sekcja „Brief projektowy” w szczegółach zgłoszenia. */
  function leadBriefSection(lead, b) {
    const box = h('section', { class: 'brief-attached', id: 'brief-zgloszenia' });
    if (!b) {
      const btn = h('button', {
        class: 'btn btn--primary',
        type: 'button',
        text: 'Utwórz brief dla tego zgłoszenia',
        onclick: async () => {
          busy(btn, true, 'Tworzę…');
          const { error } = await q(api(`leads/${lead.id}/brief`, { method: 'POST' }));
          busy(btn, false);
          if (error) return toast(errMsg(error), 'error');
          toast('Brief utworzony — skopiuj link albo przygotuj e-mail do klienta.');
          await route();
          const t = $('#brief-zgloszenia');
          if (t) t.scrollIntoView({ behavior: 'smooth' });
        },
      });
      box.append(
        h(
          'div',
          { class: 'panel brief-empty' },
          h('h2', { text: 'Brief projektowy' }),
          h('p', { text: 'Gdy klient zgodzi się na współpracę, utwórz brief — szczegółowy formularz o oczekiwaniach (języki, sekcje, cennik, rezerwacje, wygląd, materiały, pomysły). Dane ze zgłoszenia wpiszą się do niego automatycznie, a odpowiedzi zobaczysz tutaj, w tym zgłoszeniu.' }),
          h('div', { class: 'actions' }, btn, h('a', { class: 'btn', href: '/brief/podglad', target: '_blank', rel: 'noopener', text: 'Jak to widzi klient? ↗' }))
        )
      );
      return box;
    }
    box.append(...briefBlocks({ ...b, company_name: b.company_name || lead.company_name, contact_email: b.contact_email || lead.email }, { inLead: true }));
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
    const subject = encodeURIComponent(`Brief strony internetowej — ${b.company_name}`);
    const text = encodeURIComponent(
      `Dzień dobry,\n\nzgodnie z rozmową przesyłam krótki formularz (brief), który pomoże mi przygotować stronę internetową dla ${b.company_name}:\n\n${briefLink(b.token)}\n\n` +
        `Wypełnienie zajmuje ok. 15 minut. Odpowiedzi zapisują się automatycznie, więc można przerwać i wrócić przez ten sam link. Jeśli czegoś nie wiesz — pomiń pytanie, omówimy to razem.\n\n` +
        `Pozdrawiam\nGrzegorz\nStrony AI Wrocław`
    );
    return `mailto:${b.contact_email || ''}?subject=${subject}&body=${text}`;
  }

  /** Panel działań + pełny podgląd odpowiedzi briefu. Używane w zgłoszeniu i w osobnym widoku briefu. */
  function briefBlocks(b, opts = {}) {
    const S = window.BRIEF_SCHEMA;
    const H = S && S.helpers;
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
            h('h3', { text: `${i + 1}. ${st.title}` }),
            rowsEl.length ? h('dl', { class: 'dl' }, rowsEl) : h('p', { class: 'muted small', text: 'Brak odpowiedzi.' })
          );
        })
      : [h('div', { class: 'alert alert--error', text: 'Nie wczytano definicji briefu (schema.js).' })];

    const note = h('textarea', { rows: '3', maxlength: '5000', placeholder: 'Twoje prywatne notatki do tego briefu' });
    note.value = b.admin_note || '';
    const download = () => {
      const blob = new Blob([H.toMarkdown(a, meta)], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = h('a', { href: url, download: `brief-${company.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi, '-')}.md` });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const filled = b.status === 'wyslany' || b.status === 'w_trakcie';

    const actions = h(
      'section',
      { class: 'panel no-print brief-actions' },
      h(
        'div',
        { class: 'brief-actions__head' },
        h('h2', { text: opts.inLead ? 'Brief projektowy' : 'Działania' }),
        h('span', { class: `status status--${BRIEF_CLASS[b.status]}`, text: BRIEF_STATUS[b.status] })
      ),
      h(
        'p',
        { class: 'small muted' },
        `Utworzono ${fmtDate(b.created_at)}`,
        b.opened_at ? ` · otwarty przez klienta ${fmtDate(b.opened_at)}` : '',
        b.submitted_at ? ` · wypełniony ${fmtDate(b.submitted_at)}` : ''
      ),
      stateText ? h('p', { class: 'alert alert--info', text: stateText }) : null,
      H && filled && (H.needsLogo(a) || H.needsTagline(a))
        ? h('p', { class: 'alert alert--warn', text: `Klient prosi o: ${[H.needsLogo(a) ? (a.logo === 'odswiezenie' ? 'odświeżenie logo' : 'projekt logo') : '', H.needsTagline(a) ? 'propozycje hasła' : ''].filter(Boolean).join(' i ')}. Tekst dla AI zawiera to zadanie, a „Kopiuj tekst dla AI: logo” daje osobne polecenie tylko do logo.` })
        : null,
      h('p', { class: 'brief-link' }, h('span', { class: 'small muted', text: 'Link dla klienta: ' }), h('code', { text: briefLink(b.token) })),
      h(
        'div',
        { class: 'actions' },
        h('a', { class: `btn${filled ? '' : ' btn--primary'}`, href: briefMailto(b), text: 'Wyślij link e-mailem' }),
        h('button', { class: 'btn', type: 'button', text: 'Kopiuj link', onclick: () => copyText(briefLink(b.token), 'Link skopiowany.') }),
        h('a', { class: 'btn', href: `/brief/${b.token}`, target: '_blank', rel: 'noopener noreferrer', text: 'Otwórz jak klient ↗' })
      ),
      filled && H
        ? h(
            'div',
            { class: 'actions' },
            h('button', { class: 'btn btn--primary', type: 'button', text: 'Kopiuj tekst dla AI', onclick: () => copyText(H.toAiPrompt(a, meta), 'Skopiowano — wklej do narzędzia AI.') }),
            H.needsLogo && H.needsLogo(a) ? h('button', { class: 'btn btn--primary', type: 'button', text: 'Kopiuj tekst dla AI: logo', onclick: () => copyText(H.toLogoPrompt(a, meta), 'Skopiowano polecenie do projektu logo.') }) : null,
            h('button', { class: 'btn', type: 'button', text: 'Kopiuj odpowiedzi', onclick: () => copyText(H.toMarkdown(a, meta), 'Odpowiedzi skopiowane.') }),
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
        b.status === 'wyslany'
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
      h('h2', { text: `Odpowiedzi klienta — ${company}` }),
      H && H.industryLabel(a) ? h('p', null, h('span', { class: 'status status--kontakt', text: `Branża: ${H.industryLabel(a)}` })) : null,
      h('p', { class: 'small muted', text: b.status === 'wyslany' ? `Wypełniony ${fmtDate(b.submitted_at)}.` : 'Wersja robocza — klient może jeszcze zmieniać odpowiedzi.' })
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
                h('span', { class: `status status--${BRIEF_CLASS[b.status]}`, text: BRIEF_STATUS[b.status] })
              )
            )
          )
        )
      : [h('li', { class: 'empty', text: 'Nie utworzono jeszcze żadnego briefu. Otwórz zgłoszenie i kliknij „Utwórz brief dla tego zgłoszenia”.' })];

    main.replaceChildren(
      head(
        'Briefy klientów',
        'Zestawienie wszystkich briefów. Każdy brief jest przypięty do zgłoszenia — kliknij, aby otworzyć zgłoszenie z pełnym podglądem odpowiedzi.',
        h('a', { class: 'btn', href: '/brief/podglad', target: '_blank', rel: 'noopener', text: 'Jak to widzi klient? ↗' })
      ),
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Jak wysłać brief klientowi' }),
        h(
          'ol',
          { class: 'steps-list' },
          h('li', null, 'Klient pisze przez formularz na stronie — zgłoszenie pojawia się w zakładce ', h('a', { href: '#zgloszenia', text: 'Zgłoszenia' }), '. Jeśli to Ty napisałeś pierwszy (np. mailowo), ', h('a', { href: '#zgloszenia/nowe', text: 'dodaj zgłoszenie ręcznie' }), '.'),
          h('li', { text: 'Gdy klient zgodzi się na współpracę, otwórz jego zgłoszenie i kliknij „Utwórz brief dla tego zgłoszenia”. Dane firmy wpiszą się same.' }),
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
            : h('textarea', { rows: row.kind === 'lines' ? '6' : '3', maxlength: String(max) }, row.value);
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
      return { blob, ext, width: w, height: hgt };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function uploadImage(file, alt) {
    const { blob, ext, width, height } = await optimizeImage(file);
    const fd = new FormData();
    fd.append('file', blob, `zdjecie.${ext}`);
    fd.append('alt', alt);
    fd.append('width', String(width));
    fd.append('height', String(height));
    return (await api('media', { method: 'POST', body: fd })).item;
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
            toast('Zdjęcie wgrane.');
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
            h('p', { class: 'small muted', text: `${m.width || '?'}×${m.height || '?'} px · ${m.size_bytes ? Math.round(m.size_bytes / 1024) + ' KB' : ''}${used[m.id] ? ` · w ${used[m.id]} realizacji` : ' · nieużywane'}` }),
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
                  p.is_demo ? h('span', { class: 'status status--odrzucone', text: 'Demo' }) : null,
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
    let project = { title: '', industry: '', description: '', site_url: '', status: 'draft', slug: '', tags: '', is_demo: 0 };
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
    const demoCb = h('input', { type: 'checkbox', checked: Boolean(project.is_demo) });
    [title, industry, desc, url, statusSel, slugIn, tagsIn, demoCb].forEach((el) => el.addEventListener('input', () => (dirty = true)));
    demoCb.addEventListener('change', () => (dirty = true));

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
      demoCb.checked = o.is_demo;
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
          const payload = { title: t, industry: industry.value.trim(), description: desc.value.trim(), site_url: site || null, status: statusSel.value, slug: slugVal, tags: tagsIn.value.trim(), is_demo: demoCb.checked };
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
        h('div', { class: 'grid-2' }, field('Adres strony (na żywo)', url), field('Status', statusSel, 'Szkic jest widoczny tylko w panelu.')),
        h('label', { class: 'check' }, demoCb, 'Projekt demonstracyjny (fikcyjna firma / koncepcja) — na stronie pojawi się oznaczenie „Projekt demonstracyjny”')
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
  async function viewSettings(main) {
    const settings = (await api('settings')).settings || { recruitment_open: 1, contact_email: 'stronywroclawai@gmail.com' };

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
            row('Powiadomienia e-mail (Resend)', st.email, st.email ? `na ${st.notifyTo}` : 'brak RESEND_API_KEY'),
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
      h('section', { class: 'panel' }, h('h2', { text: 'Stan konfiguracji' }), cfgBox),
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Zmiana hasła' }),
        h('ol', { class: 'small' },
          h('li', null, 'Otwórz ', h('a', { href: '/admin/generator-hasla.html', target: '_blank', rel: 'noopener', text: 'generator hasła' }), ', wpisz nowe hasło i skopiuj wynik.'),
          h('li', { text: 'W Cloudflare: projekt → Settings → Variables and Secrets → ADMIN_PASSWORD_HASH → Edit → wklej → Save.' }),
          h('li', { text: 'Deployments → przy najnowszym wdrożeniu „⋯” → Retry deployment.' })
        ),
        h('p', { class: 'small muted', text: 'Po zmianie hasła wszystkie dotychczasowe sesje wygasają — zalogujesz się nowym hasłem.' })
      )
    );
  }
})();
