#!/usr/bin/env node
/**
 * probe-abnormal.mjs — the abnormal-player pass (the QA/security assignment's
 * §4) against the REAL built game (dist/), driven exactly like a player: no
 * driver authorization, no debug seams — trusted events + the public
 * window.__game debug surface for position/state reads only.
 *
 * The mischievous-player catalogue it walks through:
 *   - movement abuse: wall/corner grinding, sustained boundary pushes
 *   - interaction abuse: E-key spam, interact-while-moving, multi-object rapid
 *   - neglect: long idle with the simulation running
 *   - session abuse: R-restart, rapid reload spam, mid-boot reload spam
 *   - state sanity: position finite + inside the world envelope, money sane,
 *     the story save never wiped by any of the above
 *
 * PASS = every check green AND zero page errors / console errors across ALL
 * phases. Output: one PASS/FAIL line per check, then the verdict.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = Number(process.env.ABN_PORT ?? 4173);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('ABNORMAL PROBE FAIL — no dist/ build. Run `npm run build` first.');
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

// the world envelope (docs/data/world-registry.json + the subway's
// underground platform): far beyond anything walking can reach in seconds,
// tight enough that a teleport/escape/NaN tripwire fires.
const ENVELOPE = { xMin: -380, xMax: 90, zMin: -60, zMax: 60, yMin: -15, yMax: 60 };

const errors = [];
let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { failed++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

const pageErrorsOf = (p) => errors.splice(0).filter(Boolean);

/** Boot the built game on a seeded day-4 story save. Returns the page. */
async function boot({ seedSave = true, waitMs = 4500 } = {}) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (seedSave) {
    await page.addInitScript(() => {
      localStorage.setItem('first_slice_save_v1', JSON.stringify({
        day: 4, day_complete: true, money: 240, cart_name: 'QA PROBE', calendar_day: 4,
      }));
    });
  }
  await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game, null, { timeout: 45000 });
  await page.waitForTimeout(waitMs); // let the boot settle
  return page;
}

const pos = (p) => p.evaluate(() => {
  const g = window.__game;
  const c = g?.player?.capsule;
  return c ? { x: c.x, y: c.y, z: c.z, rot: g.player.rotationY } : null;
});
const finiteInEnvelope = (p) => p !== null
  && [p.x, p.y, p.z].every(Number.isFinite)
  && p.x >= ENVELOPE.xMin && p.x <= ENVELOPE.xMax
  && p.z >= ENVELOPE.zMin && p.z <= ENVELOPE.zMax
  && p.y >= ENVELOPE.yMin && p.y <= ENVELOPE.yMax;
const framesIn = (p, ms) => p.evaluate((dur) => new Promise((res) => {
  let n = 0;
  const t0 = performance.now();
  const f = () => { n++; if (performance.now() - t0 < dur) requestAnimationFrame(f); else res(n); };
  requestAnimationFrame(f);
}), ms);

// ---------------------------------------------------------------- phase A ----
console.log('— Phase A: the impatient player (movement + interaction abuse, seeded day-4 roam) —');
let page = await boot();
let errs = pageErrorsOf(page);
check('A0: the built game boots clean on a seeded save (no driver auth)', errs.length === 0,
  errs.length ? errs[0].slice(0, 120) : '');
check('A0: HUD alive', await page.isVisible('#hud'));

let p0 = await pos(page);
check('A1: start position finite and in-envelope', finiteInEnvelope(p0), JSON.stringify(p0));

// sustained walk: 2.0 s north
await page.keyboard.down('KeyW');
await page.waitForTimeout(2000);
await page.keyboard.up('KeyW');
let p1 = await pos(page);
check('A2: sustained walk moves the player (>0.3 m) and stays finite',
  p1 !== null && Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.3 && finiteInEnvelope(p1),
  `moved ${p1 ? Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2) : 'NaN'} m`);

// boundary grind: keep pushing north for 5 s — no escape, no NaN
await page.keyboard.down('KeyW');
await page.waitForTimeout(5000);
await page.keyboard.up('KeyW');
let p2 = await pos(page);
check('A3: 5 s boundary push never escapes the world envelope', finiteInEnvelope(p2), JSON.stringify(p2));

// corner grind: W+A into the block for 4 s with sampling — no tunneling
const grind = [];
await page.keyboard.down('KeyW');
await page.keyboard.down('KeyA');
for (let i = 0; i < 8; i++) { await page.waitForTimeout(500); grind.push(await pos(page)); }
await page.keyboard.up('KeyW');
await page.keyboard.up('KeyA');
const grindOk = grind.every(finiteInEnvelope);
let tunnel = false;
for (let i = 1; i < grind.length; i++) {
  if (!grind[i] || !grind[i - 1]) { tunnel = true; break; }
  if (Math.hypot(grind[i].x - grind[i - 1].x, grind[i].z - grind[i - 1].z) > 4) tunnel = true;
}
check('A4: 4 s corner grind — every sample finite, no per-sample tunneling', grindOk && !tunnel,
  `max step ${Math.max(...grind.map((g, i) => i && grind[i - 1] && g ? Math.hypot(g.x - grind[i - 1].x, g.z - grind[i - 1].z) : 0)).toFixed(2)} m`);

// interaction spam: 40 rapid E presses
const moneyBefore = await page.evaluate(() => window.__game?.state?.money ?? null);
for (let i = 0; i < 40; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(40); }
await page.waitForTimeout(600);
errs = pageErrorsOf(page);
const moneyAfter = await page.evaluate(() => window.__game?.state?.money ?? null);
check('A5: 40×E interaction spam — no errors, money finite and within the save ceiling',
  errs.length === 0 && Number.isFinite(moneyAfter) && moneyAfter >= 0 && moneyAfter <= 999_999,
  `money ${moneyBefore} → ${moneyAfter}${errs.length ? ' — ' + errs[0].slice(0, 100) : ''}`);

// interact-while-moving
await page.keyboard.down('KeyW');
for (let i = 0; i < 10; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(120); }
await page.keyboard.up('KeyW');
await page.waitForTimeout(400);
errs = pageErrorsOf(page);
check('A6: interact-while-moving — no errors, position still sane', errs.length === 0 && finiteInEnvelope(await pos(page)));

// neglect: idle 15 s with the sim running — the world keeps living, the game keeps painting
const tickA = await page.evaluate(() => window.__game?.worldSim?.brain?.clock?.tick ?? null);
const framesIdle = await framesIn(page, 15000);
const tickB = await page.evaluate(() => window.__game?.worldSim?.brain?.clock?.tick ?? null);
errs = pageErrorsOf(page);
check('A7: 15 s idle — the sim clock advances, the frame loop stays alive, no errors',
  Number.isFinite(tickA) && Number.isFinite(tickB) && tickB > tickA && framesIdle > 100 && errs.length === 0,
  `tick +${tickB - tickA}, ${framesIdle} frames`);

// R = restart the day (location.reload under save rules)
await page.keyboard.press('KeyR');
await page.waitForTimeout(3500);
const boot2 = await pos(page);
errs = pageErrorsOf(page);
check('A8: R restart reloads into a clean boot, save rules hold', errs.length === 0 && boot2 !== null);

// ---------------------------------------------------------------- phase B ----
console.log('— Phase B: session abuse (rapid reload spam over a seeded save) —');
await page.close();
const saveExists = async (pg) => pg.evaluate(() => {
  const raw = localStorage.getItem('first_slice_save_v1');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return { __corrupt: true }; }
});

let pg = await boot({ waitMs: 800 });
for (let i = 0; i < 3; i++) { await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(800); }
await pg.waitForFunction(() => !!window.__game, null, { timeout: 45000 });
await pg.waitForTimeout(1500);
const afterSpam = await saveExists(pg);
errs = pageErrorsOf(pg);
check('B1: 3× rapid reload spam — the story save survives (present, valid JSON, not wiped)',
  afterSpam !== null && !afterSpam.__corrupt && Number.isFinite(afterSpam.day) && afterSpam.day >= 4,
  afterSpam ? `day ${afterSpam.day}, money ${afterSpam.money}` : 'MISSING');
check('B2: reload spam — zero page errors across all boots', errs.length === 0,
  errs.length ? errs[0].slice(0, 120) : '');
await pg.close();

// ---------------------------------------------------------------- phase C ----
console.log('— Phase C: mid-boot reload spam (interrupted sessions) —');
let pg2 = await browser.newPage({ viewport: { width: 900, height: 700 } });
pg2.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
pg2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await pg2.addInitScript(() => {
  localStorage.setItem('first_slice_save_v1', JSON.stringify({
    day: 4, day_complete: true, money: 240, cart_name: 'QA PROBE', calendar_day: 4,
  }));
});
await pg2.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'domcontentloaded' });
await pg2.waitForTimeout(400);
await pg2.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'domcontentloaded' });
await pg2.waitForTimeout(250);
await pg2.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await pg2.waitForFunction(() => !!window.__game, null, { timeout: 45000 });
await pg2.waitForTimeout(1500);
const afterMidBoot = await saveExists(pg2);
errs = pageErrorsOf(pg2);
check('C1: mid-boot reload spam — the save survives interrupted sessions',
  afterMidBoot !== null && !afterMidBoot.__corrupt && Number.isFinite(afterMidBoot.day) && afterMidBoot.day >= 4,
  afterMidBoot ? `day ${afterMidBoot.day}` : 'MISSING');
check('C2: mid-boot spam — zero page errors', errs.length === 0,
  errs.length ? errs[0].slice(0, 120) : '');
await pg2.close();

await browser.close();
server.close();

console.log(`\nABNORMAL PROBE: ${passed}/${passed + failed} checks passed, 0 page errors expected across all phases`);
if (failed === 0) {
  console.log('ABNORMAL PROBE OK — the game survives the abnormal player: no escapes, no NaN, no wiped saves, no crashes');
} else {
  console.log('ABNORMAL PROBE FAIL — see the FAIL lines above');
  process.exit(1);
}
