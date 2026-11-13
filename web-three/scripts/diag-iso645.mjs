import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('file:///home/z/my-project/first-slice-nyc/web-three/dist/').pathname;
const PORT = 4633;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const entry = (id, y, m, d, body, kind = 'OBSERVATION', epistemic = 'FACT') => ({ id, kind, date: { y, m, d }, epistemic, body, links: [], visibility: 'private', corrections: [] });
const CARRIED_DIARY = [
  entry('c0-k1-mishear', 1, 9, 11, 'Rosa gave me the cart.'),
  entry('c3-cut-newyear', 3, 1, 6, 'The season\u2019s books, closed.', 'EVENT'),
  entry('c4-test-season-entry', 3, 1, 6, 'The profile is pinned inside the bodega\u2019s window.', 'OBSERVATION'),
];
const save = JSON.stringify({ v: 1, day: 645, day_complete: false, replay: false, cart_name: 'YOUR CORNER', money: 214, awning: true, kid_kept: true, idris_served: true, lunch_served: 1, day_start_money: 214, stool: true, map_given: true, permit: true, calendar_day: 645, field_diary: CARRIED_DIARY, chapter: { chapter: 'C4', openedOnDay: 485, calendarDay: 645 }, rails: { R1: { fired: true, firedOnDay: 1 }, R2: { fired: true, firedOnDay: 130 }, R3: { fired: true, firedOnDay: 457 }, R4: { fired: false, firedOnDay: null }, R5: { fired: false, firedOnDay: null }, R6: { fired: false, firedOnDay: null } } });
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });
page.on('crash', () => errors.push('CRASH'));
await page.addInitScript((s) => localStorage.setItem('first_slice_save_v1', s), save);
try {
  await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => { const s = window.__game.state; return { day: s.day, chapter: s.chapter.chapter, diary: s.fieldDiary.length }; });
  console.log('BOOT OK', JSON.stringify(state));
} catch (e) { console.log('BOOT FAIL', e.message); }
console.log('errors:', errors.slice(0, 5));
await browser.close(); server.close();
