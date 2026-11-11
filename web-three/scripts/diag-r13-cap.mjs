/**
 * scripts/diag-r13-cap.mjs — the stage-9 diagnostic: boot the probe's own
 * DAY1002 save in the built dist and measure the composed portrait's
 * body length (the diary's 600-cap law), with and without the row facts.
 * Harness-only; nothing in the game changes.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4642;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const entry = (id, y, m, d, body, kind = 'OBSERVATION', epistemic = 'FACT') => ({
  id, kind, date: { y, m, d }, epistemic, body, links: [], visibility: 'private', corrections: [],
});
const CARRIED_DIARY = [
  entry('c0-k1-mishear', 1, 9, 11, 'Rosa gave me the cart.'),
  entry('c1-cut-newyear', 1, 12, 23, 'this is the year I fix it', 'EVENT'),
  entry('c2-cut-summer', 2, 7, 1, 'July heat, the Fourth, Eddie\u2019s hand on the counter.', 'EVENT'),
  entry('c3-cut-newyear', 3, 1, 6, 'The season\u2019s books, closed: nineteen debts, one signature pending.', 'EVENT'),
  entry('c4-cut-julyheat', 3, 7, 3, 'The face\u2019s books, closed: the fall is not an event; it is a season.', 'EVENT'),
  entry('c5-cut-snowhoarding', 3, 12, 1, 'The year\u2019s books, closed. The soup was good, though. October, remember? Day 1 again.', 'EVENT'),
  entry('c2-k2-net-good', 2, 6, 20, 'The Compact was going to fail anyway. I saved the shop. Net good.', 'EVENT'),
  entry('c4-k4-corvus-partner', 3, 1, 14, 'Corvus is a partner. Marisol is straight with me, for a developer. \u2014 GUESS, labeled honestly, kept.', 'EVENT', 'GUESS'),
  entry('c6-test-season-entry', 3, 11, 26, 'The terminal\u2019s duffel bag learns its strap.', 'OBSERVATION'),
];
const row = (id, y, m, d, refs) => ({ id, kind: 'amends', date: { y, m, d }, refs, weight: 1, visibility: 'private' });
const seasonSave = (day, diary, ledger) => JSON.stringify({
  v: 1, day, day_complete: false, replay: false,
  cart_name: 'YOUR CORNER', money: 214, awning: true, kid_kept: true,
  idris_served: true, lunch_served: 1, day_start_money: 214,
  stool: true, map_given: true, permit: true,
  calendar_day: day, field_diary: diary, ledger: ledger ?? [],
  chapter: { chapter: 'C6', openedOnDay: 814, calendarDay: day },
  rails: {
    R1: { fired: true, firedOnDay: 1 }, R2: { fired: true, firedOnDay: 130 },
    R3: { fired: true, firedOnDay: 457 }, R4: { fired: true, firedOnDay: 645 },
    R5: { fired: true, firedOnDay: 743 }, R6: { fired: false, firedOnDay: null },
  },
});
const DAY1002_SAVE = seasonSave(1002, CARRIED_DIARY, [
  row('led-c6-first-dollar', 3, 12, 1, ['ada', 'restitution', 'first-dollar']),
  row('led-c6-grace-letter', 4, 1, 26, ['grace', 'kev-reference-letter']),
  row('led-c6-boiler-watch', 4, 2, 23, ['father-mike', 'boiler-watch', 'forum-apology']),
  row('led-c6-verna-booth', 4, 5, 26, ['verna', 'crossing-guard-booth']),
]);

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
await page.addInitScript((s) => localStorage.setItem('first_slice_save_v1', s), DAY1002_SAVE);
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const out = await page.evaluate(() => {
  const s = window.__game.state;
  // the probe's own picks before the portrait (Pass E's exact flow):
  s.applyChoicePick('N4b', 'full-disclosure');
  s.applyChoicePick('N4d', 'therapy');
  const flags = [...s.storyFlagMemo].filter((f) =>
    f.includes('restitution') || f.includes('c6-first-chapter') || f.includes('c6-standing')
    || f.includes('june-conditions') || f.includes('c6-condition') || f.includes('epilogue-taste')
    || f.includes('self-portrait-raw-material'));
  // the shipped write path — its notes ARE the composed paragraphs
  const outEffects = s.writeSelfPortrait();
  const notes = outEffects.filter((e) => e.kind === 'note').map((e) => e.text);
  const body = notes.slice(1).join('\n\n'); // the lead note, then the paragraphs
  const prog = s.amendsProgress();
  const closed = Object.values(prog).filter((r) =>
    r.state === 'paid' || r.state === 'forgone' || r.state === 'signed' || r.state === 'settled' || r.state === 'partial').length;
  const remaining = 10300 - (prog.ada && prog.ada.state === 'partial' ? 8000 : 0)
    - (prog.marcus?.paid ?? 0) - (prog.idris?.paid ?? 0) - (prog.chino?.paid ?? 0);
  const landed = s.fieldDiary.some((e) => e.id === 'c6-self-portrait-1');
  return {
    flags, closed, remaining, landed,
    bodyLength: body.length,
    paras: body.split('\n\n').map((p) => p.length),
    debtsPara: body.split('\n\n')[2] ?? null,
    diaryCap: s.fieldDiary.length,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
