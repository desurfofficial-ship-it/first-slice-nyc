/**
 * Probe: M3 — the city keeps a diary of you (docs/architecture/05).
 * Runs the real game in real Chromium at 720x1280 (the mobile must-test);
 * the save is seeded, the boot flow is untouched.
 *
 * Covered:
 *   1. a Day-2 morning after a run of regular rounds opens with exactly
 *      ONE diary note — the family furthest past its due (shelf, seeded
 *      one overshoot ahead of the hot-dog cart) — and no other family's
 *      line ever appears;
 *   2. the DAY note gets its two seconds first (the diary line parks
 *      behind it in the note queue);
 *   3. said once, ever: reload the same save — the diary line never
 *      repeats (the watermark rode the day-start snapshot).
 *
 * Machine-level laws (thresholds, tie order, escalation, save parse) are
 * pinned in tests/diary.test.ts; this probe pins the real-game drain.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The diary's prose keys (mirrors content.ts DIARY_NOTE_TEXT — the probe
// reads the screen, not the bundle; substrings are the stable part).
const DIARY = {
  shelf: 'front-stocked',
  dog: 'started your order',
  trim: 'turned to face the door',
  wash: 'kept the first machine open',
  hoop: 'chalked a small tally',
};
const DAY2_NOTE = 'The cart is still yours';

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });

/** Collect (t, text) for every visible note from now until `ms`. */
async function watchNotes(page, ms) {
  const seen = [];
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const t = await page.evaluate(() => {
      const n = document.querySelector('#note');
      if (!n || n.classList.contains('gone') || n.hidden) return null;
      const text = (n.textContent ?? '').trim();
      return text.length > 0 ? text : null;
    });
    if (t !== null && (seen.length === 0 || seen[seen.length - 1].text !== t)) {
      seen.push({ at: Date.now(), text: t });
    }
    await sleep(150);
  }
  return seen;
}

// One shared context: both pages must see the SAME origin storage — page 1
// seeds the save, page 2 boots what the morning persisted.
const context = await browser.newContext({ viewport: { width: 720, height: 1280 } });

// ---- 1 + 2 + one-family-per-morning: a Day-2 morning with two families
// over their due points (shelf overshoot 2, the hot-dog cart just at its
// due) — shelf speaks, alone.
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.addInitScript(() => {
  localStorage.setItem('first_slice_save_v1', JSON.stringify({
    day: 2, day_complete: false, replay: false,
    cart_name: 'Probe', money: 112,
    shelf_buys: 6, dog_buys: 4, trims: 0, washes: 0, hoop_makes: 0,
  }));
});
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });

const notes = await watchNotes(page, 12000);
const texts = notes.map((n) => n.text);
check(texts.some((t) => t.includes(DAY2_NOTE)), `the DAY 2 note showed first (${texts[0] ?? 'nothing'})`);
check(texts.some((t) => t.includes(DIARY.shelf)), 'the diary spoke: the shelf line, the day after the rounds');
check(!texts.some((t) => t.includes(DIARY.dog)), 'the hot-dog line stayed quiet — the biggest overshoot wins, one per morning');
check(!texts.some((t) => t.includes(DIARY.trim) || t.includes(DIARY.wash) || t.includes(DIARY.hoop)),
  'no other family spoke — exactly one diary note this morning');
const dayIdx = texts.findIndex((t) => t.includes(DAY2_NOTE));
const diaryIdx = texts.findIndex((t) => t.includes(DIARY.shelf));
check(dayIdx >= 0 && diaryIdx > dayIdx, 'the diary line parked behind the DAY note (the morning note got its two seconds)');

// ---- 3. said once, ever: the morning persist wrote the watermark (assert
// it in localStorage), then a SECOND page — same browser context, so the
// same origin storage, and NO init-script re-seed — boots the persisted
// save and must stay quiet.
const stored = await page.evaluate(() => localStorage.getItem('first_slice_save_v1') ?? '');
check(stored.includes('diary_noted'), `the watermark rode the day-start snapshot (${stored.includes('diary_noted') ? 'diary_noted present' : 'MISSING'})`);
await page.close();

const page2 = await context.newPage();
page2.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page2.on('pageerror', (e) => consoleErrors.push(String(e)));
await page2.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page2.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
const again = await watchNotes(page2, 9000);
const againTexts = again.map((n) => n.text);
check(againTexts.some((t) => t.includes(DAY2_NOTE)), 'the reload reached the morning (the DAY note showed)');
check(!againTexts.some((t) => t.includes(DIARY.shelf)), 'the diary did not repeat itself — the watermark rode the save');
await page2.close();

check(consoleErrors.length === 0, `console clean (${consoleErrors.length} errors${consoleErrors.length ? ': ' + consoleErrors[0] : ''})`);

await browser.close();
server.close();
console.log(failures.length === 0 ? 'M3 PROBE OK: 0 failures' : `M3 PROBE: ${failures.length} failures`);
process.exit(failures.length === 0 ? 0 : 1);
