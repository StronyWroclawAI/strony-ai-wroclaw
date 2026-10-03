// Własne statystyki odwiedzin — bez plików cookies i bez zewnętrznych usług.
// Zapisujemy wyłącznie liczby: ile wejść na daną podstronę danego dnia, skąd (domena odsyłająca) i z jakiego urządzenia.
// „Unikalnych odwiedzających” liczymy skrótem (adres IP + przeglądarka + data + sól), który zmienia się codziennie
// i jest usuwany po dwóch dniach. Nie da się z niego odtworzyć adresu IP ani śledzić nikogo między dniami.
import { hasDb, ensureSchema, sha256Hex } from './db.js';
import { hasValidSession } from './auth.js';

const BOT_RE = /bot|crawl|spider|slurp|preview|monitor|uptime|headless|lighthouse|pagespeed|curl|wget|python|go-http|java\/|scrapy|facebookexternalhit|whatsapp|telegram|discord|feed|fetch|axios|node|postman|insomnia|scan|check/i;

export function warsawDay(d = new Date()) {
  // RRRR-MM-DD w czasie polskim
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(d);
}

function device(ua) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'telefon';
  return 'komputer';
}

/** Zlicza wejście. Wywoływane przez waitUntil — nie spowalnia strony i nigdy nie psuje odpowiedzi. */
export async function recordVisit(env, request, path) {
  try {
    if (!hasDb(env) || request.method !== 'GET') return;
    const ua = request.headers.get('User-Agent') || '';
    if (!ua || ua.length < 20 || BOT_RE.test(ua)) return;
    if (/prefetch|prerender/i.test(request.headers.get('Sec-Purpose') || request.headers.get('Purpose') || '')) return;
    if (await hasValidSession(env, request)) return; // własne wejścia administratora
    await ensureSchema(env);
    const day = warsawDay();
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const vh = (await sha256Hex(`${env.IP_HASH_SALT || 'strony-ai-wroclaw'}|${day}|${ip}|${ua}`)).slice(0, 24);
    const db = env.DB;
    const seenPath = await db.prepare(`INSERT OR IGNORE INTO visit_seen (day, vh, path) VALUES (?, ?, ?)`).bind(day, vh, path).run();
    const seenSite = await db.prepare(`INSERT OR IGNORE INTO visit_seen (day, vh, path) VALUES (?, ?, '*')`).bind(day, vh).run();
    const up = (uniq) => (uniq ? 1 : 0);
    const stmts = [
      db.prepare(`INSERT INTO visit_days (day, path, views, uniques) VALUES (?, ?, 1, ?) ON CONFLICT (day, path) DO UPDATE SET views = views + 1, uniques = uniques + excluded.uniques`).bind(day, path, up(seenPath.meta.changes)),
      db.prepare(`INSERT INTO visit_days (day, path, views, uniques) VALUES (?, '*', 1, ?) ON CONFLICT (day, path) DO UPDATE SET views = views + 1, uniques = uniques + excluded.uniques`).bind(day, up(seenSite.meta.changes)),
    ];
    const meta = (kind, key) => stmts.push(db.prepare(`INSERT INTO visit_meta (day, kind, key, n) VALUES (?, ?, ?, 1) ON CONFLICT (day, kind, key) DO UPDATE SET n = n + 1`).bind(day, kind, key));
    if (seenSite.meta.changes) {
      // źródło i urządzenie liczymy raz na odwiedzającego dziennie
      meta('dev', device(ua));
      let ref = 'wejście bezpośrednie';
      try {
        const r = request.headers.get('Referer');
        if (r) {
          const h = new URL(r).hostname.replace(/^www\./, '');
          if (h && h !== new URL(request.url).hostname.replace(/^www\./, '')) ref = h.slice(0, 80);
        }
      } catch {
        /* brak / nieprawidłowy nagłówek */
      }
      meta('ref', ref);
    }
    if (Math.random() < 0.03) {
      const old = warsawDay(new Date(Date.now() - 2 * 86400000));
      stmts.push(db.prepare(`DELETE FROM visit_seen WHERE day < ?`).bind(old));
    }
    await db.batch(stmts);
  } catch (e) {
    console.error('Statystyki: nie zapisano wejścia', e);
  }
}

/** Dane do panelu: ostatnie `days` dni. */
export async function readStats(env, days = 30) {
  const n = Math.max(7, Math.min(365, Number(days) || 30));
  const today = warsawDay();
  const from = warsawDay(new Date(Date.now() - (n - 1) * 86400000));
  const db = env.DB;
  const [series, pages, meta, total] = await db.batch([
    db.prepare(`SELECT day, views, uniques FROM visit_days WHERE path = '*' AND day >= ? ORDER BY day`).bind(from),
    db.prepare(`SELECT path, SUM(views) AS views, SUM(uniques) AS uniques FROM visit_days WHERE path != '*' AND day >= ? GROUP BY path ORDER BY views DESC LIMIT 20`).bind(from),
    db.prepare(`SELECT kind, key, SUM(n) AS n FROM visit_meta WHERE day >= ? GROUP BY kind, key ORDER BY n DESC LIMIT 60`).bind(from),
    db.prepare(`SELECT COALESCE(SUM(views), 0) AS views, COALESCE(SUM(uniques), 0) AS uniques, MIN(day) AS since FROM visit_days WHERE path = '*'`),
  ]);
  const byDay = {};
  for (const r of series.results) byDay[r.day] = r;
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = warsawDay(new Date(Date.now() - i * 86400000));
    out.push({ day: d, views: byDay[d] ? byDay[d].views : 0, uniques: byDay[d] ? byDay[d].uniques : 0 });
  }
  const sum = (arr) => arr.reduce((a, r) => ({ views: a.views + r.views, uniques: a.uniques + r.uniques }), { views: 0, uniques: 0 });
  return {
    today: out[out.length - 1],
    yesterday: out[out.length - 2] || { views: 0, uniques: 0 },
    last7: sum(out.slice(-7)),
    period: sum(out),
    days: n,
    total: total.results[0] || { views: 0, uniques: 0, since: null },
    series: out,
    pages: pages.results,
    refs: meta.results.filter((r) => r.kind === 'ref').slice(0, 12),
    devices: meta.results.filter((r) => r.kind === 'dev'),
    day: today,
  };
}
