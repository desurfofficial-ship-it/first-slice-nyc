#!/usr/bin/env node
/**
 * probe-qa-r3.mjs — the QA wave-3 fresh-attack pass (the assignment's §2
 * "exploitation mindset" + §4 "invent additional tests"), against the REAL
 * built game (dist/), driven like a player: no driver authorization, no
 * debug seams — trusted events + the public window.__game surface for
 * state reads only.
 *
 * What it proves (the gaps the earlier waves' probes do not already walk):
 *   Phase U — URL fuzz on the production build: hostile/garbage query
 *             params never corrupt the boot, reflect a payload, or touch
 *             the story save.
 *   Phase S — story-save tamper matrix: a hand-edited save carrying
 *             negative/absurd money, an absurd day, and XSS payloads in
 *             cart_name / player_name / field_diary / ledger boots safely,
 *             renders as TEXT (never executes), and stays inside the
 *             parser's documented clamps.
 *   Phase P — human-mode boot (navigator.webdriver hidden): E-spam during
 *             the arrival film, rapid Map/pocket/sound toggling, and the
 *             money mirror stays honest after the abuse.
 *
 * PASS = every check green AND zero page errors / console errors across ALL
 * phases. Exit 0 only when everything passes.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = Number(process.env.R3_PORT ?? 4193);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('QA-R3 PROBE FAIL — no dist/ build. Run `npm run build` first.');
  process.exit(1);
}

const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(DIST, p === '/' ? 'index.html' : p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'],
});

const errors = [];
let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { failed++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};
const drainErrors = () => errors.splice(0).filter(Boolean);

/** A hostile day-4 seed — every payload is a real attack string. */
const HOSTILE_SAVE = {
  day: 99999,                       // beyond MAX_DAY (814)
  day_complete: true,
  money: -5000,                     // negative
  cart_name: '<img src=x onerror="window.__xss=1">',      // XSS payload
  calendar_day: 99999999,           // absurd calendar day
  awning: true, kid_kept: true, idris_served: true, lunch_served: 2,
  day_start_money: 1e15,            // absurd money snapshot
  starter: 'classic',
  player_name: { first: '"><svg onload=window.__xss=2>', nick: '', last: 'Marsh' },
  field_diary: [{
    id: 'xss-probe-entry', kind: 'OBSERVATION', epistemic: 'FACT',
    date: { y: 1, m: 9, d: 12 },
    body: '<img src=x onerror="window.__xss=3">',
    links: [], visibility: 'private',
    corrections: [{ day: 4, strike: '<svg onload=window.__xss=4>', margin: '<img src=x onerror="window.__xss=5">' }],
  }],
  ledger: [{ id: 'junk-entry', kind: 'weird-kind', day: -3, text: '<img src=x onerror="window.__xss=6">' }],
};

/** Seed a save before any page script runs. */
function seedStory(page, obj) {
  void page.addInitScript((s) => {
    localStorage.setItem('first_slice_save_v1', JSON.stringify(s));
  }, obj);
}

/** Boot the built game and wait past first paint. */
async function boot({ url = '/', hideWebdriver = false, waitMs = 5200 } = {}) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (hideWebdriver) {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => undefined, configurable: true });
    });
  }
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(waitMs);
  return page;
}

const storySaveOf = (page) => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('first_slice_save_v1') ?? 'null'); } catch { return undefined; }
});
const hudMoney = (page) => page.evaluate(() => {
  const t = document.querySelector('#money')?.textContent ?? '';
  return Number(t.replace(/[^0-9.-]/g, ''));
});

console.log('— Phase U: URL fuzz on the production build (day-4 seeded save) —');
{
  const seed = {
    day: 4, day_complete: true, money: 240, cart_name: 'QA PROBE',
    calendar_day: 4, awning: true, kid_kept: true, idris_served: true,
    lunch_served: 2, day_start_money: 240, starter: 'classic',
  };
  const urls = [
    ['?worldclock=garbage', 'garbage worldclock'],
    ['?worldclock=-999', 'negative worldclock'],
    ['?worldclock=1e999', 'infinite worldclock'],
    ['?fx=off&walklog=1&film=1&probe=1&pickcard=1', 'every harmless param at once'],
    ['?hostile=%3Cscript%3Ewindow.__xss=7%3C/script%3E', 'script payload in a param'],
  ];
  for (const [qs, what] of urls) {
    const page = await boot({ url: `/${qs}` });
    seedStory(page, seed);
    await page.reload({ waitUntil: 'domcontentloaded' });
    // the boot writes the day-4 save when the day opens — poll for it
    // instead of trusting a fixed wait (software-GL boots vary in speed)
    let save = null;
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(500);
      save = await storySaveOf(page);
      if (save?.day === 4) break;
    }
    const errNow = drainErrors();
    const xss = await page.evaluate(() => window.__xss);
    const reflected = await page.evaluate(() =>
      document.documentElement.innerHTML.includes('<script>window.__xss=7'));
    check(`U: ${what} boots without errors`, errNow.length === 0, errNow[0] ?? '');
    check(`U: ${what} executes nothing`, xss === undefined && !reflected);
    check(`U: ${what} leaves the story save intact`, save?.day === 4 && save?.money === 240,
      `day ${save?.day} money ${save?.money}`);
    await page.close();
  }
}

console.log('— Phase S: hostile story-save matrix (parser trust boundary) —');
{
  const page = await boot({});
  seedStory(page, HOSTILE_SAVE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6500);
  const errNow = drainErrors();
  check('S: hostile save boots without errors', errNow.length === 0, errNow[0] ?? '');
  const xss = await page.evaluate(() => window.__xss);
  check('S: no payload executed (cart name, player name, diary, ledger)', xss === undefined);
  const money = await hudMoney(page);
  check('S: negative money clamps into range', Number.isFinite(money) && money >= 0 && money <= 999999,
    `HUD money ${money}`);
  const save = await storySaveOf(page);
  // the security property: the absurd day (99999) was CLAMPED by the
  // parser, never echoed back, and lands inside the calendar's hard
  // 1..36500 boundary — the story ceiling itself moves with the waves
  // (814 at the C5 wave, 1179 at C6), so the invariant is asserted, not
  // a pinned constant
  check('S: absurd day clamps inside the calendar boundary',
    typeof save?.day === 'number' && Number.isInteger(save.day) && save.day >= 1
      && save.day <= 36500 && save.day < 99999,
    `day ${save?.day}`);
  check('S: diary payload did not execute through the Map', xss === undefined);
  // open the Map and the diary leaf — the payload must render as text
  await page.keyboard.press('m');
  await page.waitForTimeout(900);
  const tab = page.locator('#diary-tab');
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(700); }
  const xssAfterDiary = await page.evaluate(() => window.__xss);
  const errAfterDiary = drainErrors();
  check('S: diary renders hostile entries as ink, not markup',
    xssAfterDiary === undefined && errAfterDiary.length === 0, errAfterDiary[0] ?? '');
  // the leaf builds on the Map's first open and the render is async under
  // software GL — poll for the ink instead of trusting a fixed wait
  let bodyHasInk = false;
  for (let i = 0; i < 12; i++) {
    bodyHasInk = await page.evaluate(() => {
      const el = document.querySelector('.diary-entry .diary-body');
      return el ? el.textContent.length > 0 : false;
    });
    if (bodyHasInk) break;
    await page.waitForTimeout(500);
  }
  check('S: the hostile diary body still renders (as text)', bodyHasInk);
  await page.close();
}

console.log('— Phase P: human-mode boot (webdriver hidden) — film + panel abuse —');
{
  const page = await boot({ hideWebdriver: true, waitMs: 2500 });
  const filmVisible = await page.evaluate(() => !document.getElementById('cine')?.hidden);
  check('P: the arrival film plays for a human boot', filmVisible === true);
  // E-spam during the film
  for (let i = 0; i < 15; i++) { await page.keyboard.press('e'); await page.waitForTimeout(60); }
  const errDuringFilm = drainErrors();
  check('P: E-spam during the film produces no errors', errDuringFilm.length === 0, errDuringFilm[0] ?? '');
  // skip the film like a player would
  const skip = page.locator('#cine-skip');
  if (await skip.count() && await skip.isVisible()) {
    await skip.click();
    await page.waitForTimeout(2500);
  }
  const errAfterSkip = drainErrors();
  check('P: skipping the film after abuse lands the handover', errAfterSkip.length === 0, errAfterSkip[0] ?? '');
  // a fresh boot hands the starter pick card to a human (modal) — take the
  // default look like an impatient player would (name fields stay empty →
  // the canon default Leo Marsh applies)
  const wear = page.locator('#wardrobe-wear');
  if (await wear.count() && await wear.isVisible().catch(() => false)) {
    await wear.click();
    await page.waitForTimeout(2500);
  }
  const errAfterPick = drainErrors();
  check('P: taking the default look after the film produces no errors', errAfterPick.length === 0, errAfterPick[0] ?? '');
  // rapid Map open/close × 20
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('m');
    await page.waitForTimeout(90);
  }
  const errMap = drainErrors();
  check('P: 20× rapid Map toggling produces no errors', errMap.length === 0, errMap[0] ?? '');
  await page.keyboard.press('m'); // close it
  await page.waitForTimeout(400);
  // pocket menu + sound toggle spam
  const pocket = page.locator('#btn-pocket');
  for (let i = 0; i < 8; i++) {
    if (await pocket.isVisible()) await pocket.click();
    await page.waitForTimeout(80);
  }
  const sound = page.locator('#btn-audio');
  for (let i = 0; i < 5; i++) {
    if (await sound.isVisible()) { await sound.click(); await page.waitForTimeout(60); }
  }
  const errPocket = drainErrors();
  check('P: pocket/sound toggle spam produces no errors', errPocket.length === 0, errPocket[0] ?? '');
  const money = await hudMoney(page);
  check('P: the wallet stays finite after the abuse', Number.isFinite(money) && money >= 0 && money <= 999999,
    `HUD money ${money}`);
  await page.close();
}

await browser.close();
server.close();

console.log(`QA-R3 PROBE: ${passed}/${passed + failed} checks passed`);
if (failed === 0) {
  console.log('QA-R3 PROBE OK — URL fuzz, save tampering, XSS payloads and panel abuse all stay inside the trust boundaries');
  process.exit(0);
} else {
  console.log('QA-R3 PROBE FAILED — see the FAIL lines above');
  process.exit(1);
}
