/**
 * Probe: M1 — beats as places, not pressure (docs/architecture/05).
 * Runs the real game with the real Map; positions are teleported capsule
 * moves, the same concession every probe here makes.
 *
 * Covered, at 720x1280 portrait (the mobile must-test):
 *   1. fresh Day 1 (MEET_ROSA): opening the Map shows Rosa's ink circle
 *      on the terminal — the beat's spot — with her patient caption
 *   2. the marker rides the story: pressing Rosa (story mode) moves the
 *      ring to the bodega (ENTER_BODEGA)
 *   3. roam holds: toggling roam does NOT hide the marker (it is map
 *      information, not HUD pressure) and the objective stays the roam line
 *      (input-level mid-roam story advance is probe-roam's §4, 28/28)
 *   4. beats with no named place park the ring (D2_DELIVER via a scripted
 *      step) — a marker never points where the objective doesn't
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4598;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

const openMap = async () => {
  await page.evaluate(() => window.__game.toggleMap());
  await sleep(400);
};
const closeMap = async () => {
  await page.evaluate(() => window.__game.toggleMap());
  await sleep(250);
};

/** The marker's on-sketch state: active?, transform, caption text. */
const beatMarker = () => page.evaluate(() => {
  const g = document.querySelector('#sketch-beat');
  if (!g) return null;
  return {
    active: g.classList.contains('active'),
    transform: g.getAttribute('transform') ?? '',
    caption: g.querySelector('.sketch-beat-note')?.textContent ?? '',
  };
});

const terminalAt = 'translate(-24.5,-7.4)';
const bodegaAt = 'translate(-16,-9.4)';

// 1 — fresh boot: the ring is on the terminal, with Rosa's line
await openMap();
let m = await beatMarker();
check(m !== null, 'the sketch carries a beat marker');
check(m.active === true, `the marker is active at boot (active=${m?.active})`);
check(m.transform === terminalAt, `the ring circles the terminal (got ${m?.transform})`);
check(m.caption.includes('ready') === true, `the caption is the patient line (got ${JSON.stringify(m?.caption)})`);
await closeMap();

// 2 — the marker rides the story: press Rosa → ENTER_BODEGA
await page.evaluate(() => { window.__game.player.capsule.x = -29; window.__game.player.capsule.z = 6.9; });
await sleep(450);
await page.evaluate(() => window.__game.input.injectInteract());
await sleep(500);
await openMap();
m = await beatMarker();
check(m.transform === bodegaAt, `after Rosa, the ring moved to the bodega (got ${m?.transform})`);
await closeMap();

// 3 — roam holds: the marker stays (map information, not HUD pressure)
await page.evaluate(() => window.__game.toggleRoam());
await sleep(350);
const roamObjective = await page.evaluate(() => document.getElementById('objective')?.textContent ?? '');
check(roamObjective.includes('Roam') === true, `the objective relaxed to the roam line (got ${JSON.stringify(roamObjective)})`);
await openMap();
m = await beatMarker();
check(m.active === true, 'mid-roam the ring still shows — the map tells you where the story waits');
check(m.transform === bodegaAt, `and it still marks the bodega (got ${m?.transform})`);
await closeMap();

// 4 — a beat with no named place parks the ring
await page.evaluate(() => {
  const g = window.__game;
  const effects = g.state.setStep(13); // D2_DELIVER — the kid's teal door
  for (const e of effects) g.applyEffect(e);
});
await sleep(300);
await openMap();
m = await beatMarker();
check(m.active === false, `the teal door has no marker — the ring parks (active=${m?.active})`);
await closeMap();

check(consoleErrors.length === 0, `console clean (${consoleErrors.length} errors${consoleErrors.length ? ': ' + consoleErrors[0] : ''})`);

await browser.close();
server.close();
console.log(failures.length === 0 ? 'M1 PROBE OK: 0 failures' : `M1 PROBE: ${failures.length} failures`);
process.exit(failures.length === 0 ? 0 : 1);
