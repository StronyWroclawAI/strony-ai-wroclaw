/* Generator skrótu hasła (PBKDF2-SHA256, 100 000 iteracji) — działa lokalnie w przeglądarce. */
(function () {
  'use strict';
  var ITER = 100000;
  function b64url(bytes) {
    var s = '';
    bytes.forEach(function (b) { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function random(n) {
    var b = new Uint8Array(n);
    crypto.getRandomValues(b);
    return b;
  }
  async function hash(password) {
    var salt = random(16);
    var key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    var bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: ITER }, key, 256);
    return 'pbkdf2-sha256$' + ITER + '$' + b64url(salt) + '$' + b64url(new Uint8Array(bits));
  }
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('[data-gen]');
    var err = document.querySelector('[data-err]');
    var out = document.querySelector('[data-out]');
    if (!window.crypto || !crypto.subtle) {
      err.textContent = 'Ta przeglądarka nie obsługuje potrzebnych funkcji kryptograficznych. Użyj aktualnego Chrome, Edge, Firefox lub Safari.';
      err.hidden = false;
      return;
    }
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      err.hidden = true;
      var p1 = document.getElementById('g1').value;
      var p2 = document.getElementById('g2').value;
      if (p1.length < 12) { err.textContent = 'Hasło musi mieć co najmniej 12 znaków.'; err.hidden = false; return; }
      if (p1.length > 200) { err.textContent = 'Hasło może mieć maksymalnie 200 znaków.'; err.hidden = false; return; }
      if (p1 !== p2) { err.textContent = 'Hasła nie są takie same.'; err.hidden = false; return; }
      document.getElementById('o1').value = await hash(p1);
      document.getElementById('o2').value = b64url(random(48));
      document.getElementById('o3').value = b64url(random(32));
      form.reset();
      out.hidden = false;
      document.getElementById('o1').focus();
    });
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = document.getElementById(btn.getAttribute('data-copy'));
        el.select();
        (navigator.clipboard ? navigator.clipboard.writeText(el.value) : Promise.reject()).then(
          function () { btn.textContent = 'Skopiowano ✓'; },
          function () { document.execCommand('copy'); btn.textContent = 'Skopiowano ✓'; }
        );
        setTimeout(function () { btn.textContent = 'Kopiuj'; }, 2000);
      });
    });
  });
})();
