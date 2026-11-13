/**
 * WP-1v pause-set probe — the wardrobe/postcard pause correction, proven
 * in the real built game (dist/), the way the assignment's runtime
 * verification asks: the clock freezes while a wardrobe fitting or a
 * postcard is held, resumes on close, never bursts, and the Map —
 * deliberately — does NOT stop the block. Console must stay clean.
 *
 * Exit 0 = every step passed. (Playwright + the built dist, root URL —
 * the driver boot path, no film.)
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/?probe=1&fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });

// settle: let the boot frame loop run, then read the sim tick
await page.waitForTimeout(1500);

const steps = [];
const check = (name, ok, detail = '') => {
  steps.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const tick = () => page.evaluate(() => window.__game.worldSim.brain.world.clock.tick);

// ---- 1. baseline: the clock runs during plain gameplay ----
const t0 = await tick();
await page.waitForTimeout(3000);
const t1 = await tick();
check('gameplay advances the sim clock', t1 > t0, `+${t1 - t0} ticks in 3 s (default pace: ~3)`);

// ---- 2. wardrobe open → frozen; close → resumes ----
await page.evaluate(() => window.__game.toggleWardrobe());
const openOk = await page.evaluate(() => window.__game.wardrobe.isOpen === true);
check('wardrobe opens (fitting room up)', openOk);
const t2 = await tick();
await page.waitForTimeout(3000);
const t3 = await tick();
check('WARDROBE HELD — the clock is frozen', t3 === t2, `Δ=${t3 - t2} ticks across a 3 s fitting (law: 0)`);
await page.evaluate(() => window.__game.toggleWardrobe());
const closedOk = await page.evaluate(() => window.__game.wardrobe.isOpen === false);
check('wardrobe closes', closedOk);
await page.waitForTimeout(3000);
const t4 = await tick();
check('closing the wardrobe resumes time — no burst', t4 > t3 && t4 - t3 <= 5, `+${t4 - t3} ticks in 3 s after close`);

// ---- 3. postcard shown → frozen; dismissed → resumes ----
await page.evaluate(() => window.__game.ui.showPostcard('', 'WP-1v probe card — a held beat'));
const panelOk = await page.evaluate(() => window.__game.ui.postcardPanel.hidden === false);
check('postcard panel is up', panelOk);
const t5 = await tick();
await page.waitForTimeout(3000);
const t6 = await tick();
check('POSTCARD HELD — the clock is frozen', t6 === t5, `Δ=${t6 - t5} ticks across a 3 s viewing (law: 0)`);
await page.evaluate(() => document.getElementById('postcard-stay')?.click());
const panelDown = await page.evaluate(() => window.__game.ui.postcardPanel.hidden === true);
check('postcard dismissed (Stay)', panelDown);
await page.waitForTimeout(3000);
const t7 = await tick();
check('closing the postcard resumes time — no burst', t7 > t6 && t7 - t6 <= 5, `+${t7 - t6} ticks in 3 s after dismiss`);

// ---- 4. the Map deliberately does NOT pause the world ----
await page.evaluate(() => window.__game.toggleMap());
const mapOk = await page.evaluate(() => window.__game.mapOpen === true);
const t8 = await tick();
await page.waitForTimeout(3000);
const t9 = await tick();
check('the map is open AND the block keeps breathing (by design)', mapOk && t9 > t8, `Δ=+${t9 - t8} ticks with the map up`);
await page.evaluate(() => window.__game.toggleMap());

// ---- 5. rapid open/close churn adds no phantom time ----
const tA = await tick();
await page.evaluate(() => {
  const g = window.__game;
  for (let i = 0; i < 30; i++) { g.toggleWardrobe(); g.toggleWardrobe(); }
});
const tB = await tick();
check('60 rapid wardrobe toggles add no phantom ticks', tB - tA <= 1, `Δ=${tB - tA} (churn is sub-minute by construction)`);

await browser.close();
server.close();

const ok = steps.every((s) => s.ok) && errors.length === 0;
if (errors.length) {
  console.log('CONSOLE/PAGE ERRORS:');
  for (const e of errors) console.log('  ' + e);
}
console.log(`\nsteps ${steps.filter((s) => s.ok).length}/${steps.length} — ${ok ? 'PAUSE-SET PROBE OK' : 'PAUSE-SET PROBE FAIL'}`);
process.exit(ok ? 0 : 1);
