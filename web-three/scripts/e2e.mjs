/**
 * Browser E2E harness: loads the built game with ?autotest=1 in headless
 * Chromium, waits for the driver to finish, and prints the PASS/FAIL log.
 * The in-page driver (src/game/autotest.ts) plays the real Day 1 + Day 2.
 *
 * Usage: node scripts/e2e.mjs
 * Exit 0 only when the driver reports 0 failures AND the console is clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4573;
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

const browser = await chromium.launch({
  // --disable-dev-shm-usage: this container's /dev/shm is 64 MB — the
  // 4-day run's shared-memory surfaces outgrow it and Chromium dies
  // silently mid-sim (caught 2026-11-08, unit 7's gate; harness-only).
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'],
});
// Viewport override for slow/software-GL machines: at ~5 fps the loop's dt
// clamp (0.1 s) makes game-time run at half wall speed and the four-day
// driver outlives every timeout. A small viewport raises fps until dt stops
// clamping; the driver is viewport-agnostic. Defaults unchanged (900x700).
const VW = Number.parseInt(process.env.E2E_W ?? '900', 10);
const VH = Number.parseInt(process.env.E2E_H ?? '700', 10);
const page = await browser.newPage({ viewport: { width: VW, height: VH } });

// R1 (FS-AUDIT-001): the production build gates the debug drivers behind a
// session-storage handshake a URL can never carry. The harness authorizes
// ITSELF here, before any page script runs — the documented, non-URL path
// (game/driverGate.ts). The driver's destructive steps also ride the
// driver sandbox keys, so the player-save keys are unreachable either way.
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));

const consoleErrors = [];
page.on('console', (msg) => {
  const text = msg.text();
  if (text.includes('PASS ') || text.includes('FAIL ') || text.includes('AUTOTEST')) {
    console.log('DRIVER:', text); // stream the driver log live
  } else if (text.includes('[walk]') || text.includes('[beat]') || text.includes('[press]') || text.includes('[crawl]')
    || text.includes('[aim]') || text.includes('[basis]') || text.includes('[drag]') || text.includes('[stuck]')
    || text.includes('[pace]')) {
    console.log('TRACE :', text); // timeline traces for slow-machine forensics
  } else if (msg.type() === 'error') {
    consoleErrors.push(text);
  }
});
page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

// E2E_WALKLOG=1 turns on the driver's [walk]/[stuck] timeline traces
// (slow-machine forensics; off by default — a quiet log is a readable log).
const WALKLOG = process.env.E2E_WALKLOG === '1' ? '&walklog=1' : '';
await page.goto(`http://localhost:${PORT}/?autotest=1&fx=off${WALKLOG}`, { waitUntil: 'load' });

// ---- The pointer-path guard (runs on its own page, before the driver) ----
// The driver rides the KEYBOARD path (M opens the Map). This guard rides
// the THUMB path: it clicks the real HUD buttons on a plain page. Playwright
// refuses to fire a click when another element covers the button — which is
// exactly how the Map sat click-dead behind the click-through HUD (#hud has
// pointer-events: none) while every keyboard test stayed green. Phones had
// no M key, so on mobile the Map was unreachable, period.
{
  const p = await browser.newPage({ viewport: { width: VW, height: VH } });
  const pointerFails = [];
  const ok = (cond, what) => {
    console.log(`${cond ? 'POINTER: PASS' : 'POINTER: FAIL'} ${what}`);
    if (!cond) pointerFails.push(what);
  };
  const attempt = async (what, fn) => {
    try { await fn(); return true; } catch (e) { pointerFails.push(`${what}: ${e.message}`); console.log(`POINTER: FAIL ${what}`); return false; }
  };
  p.on('pageerror', (err) => pointerFails.push(`PAGEERROR: ${err.message}`));
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await p.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  // ---- the guard's own slow-machine law (docs/56) ----
  // The driver scales its event budgets by the measured dt-clamp dilation;
  // the guard's playwright clicks are wall-clock too. Measure the same
  // factor here (30 rAF frames ÷ the game's 100 ms clamp) and stretch the
  // click timeouts and settle waits with it — a busy machine is not a
  // broken thumb.
  const pace = await p.evaluate(() => new Promise((resolve) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => {
      n++;
      if (n >= 30) resolve(Math.min(4, Math.max(1, (performance.now() - t0) / n / 100)));
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })).catch(() => 1);
  console.log(`PACE: guard budgets ×${Number(pace).toFixed(2)}`);
  const T = (ms) => Math.round(ms * pace);
  const settle = (ms = 400) => p.waitForTimeout(T(ms));
  // The pocket wave (docs: one button opens Map / Album / Sound) moved the
  // HUD buttons into a dropdown. The real thumb path now opens the pocket
  // first — so the guard does too, and pins the pocket's own click law.
  const openPocket = async () => {
    if ((await p.getAttribute('#pocket-menu', 'hidden')) !== null) {
      await p.click('#btn-pocket', { timeout: T(5000) });
      await settle();
    }
  };
  await attempt('click the Pocket', openPocket);
  ok(await p.isVisible('#pocket-menu'), 'the pocket opens by CLICK and shows the tools');
  await attempt('click the Map button', async () => {
    await openPocket();
    await p.click('#btn-map', { timeout: T(5000) });
    await settle();
  });
  ok(await p.isVisible('#map-sheet'), 'the Map opens by CLICK on the HUD button');
  await attempt('click fold-it', async () => { await p.click('#map-close', { timeout: T(5000) }); await settle(); });
  ok(!(await p.isVisible('#map-sheet')), 'the Map folds again by click');
  await attempt('click the audio button', async () => {
    await openPocket();
    await p.click('#btn-audio', { timeout: T(5000) });
    await settle();
  });
  ok((await p.getAttribute('#btn-audio', 'aria-pressed')) === 'true', 'the audio button toggles by click');
  // the album is the HUD's other paper: same thumb-path law as the Map —
  // it must open by CLICK, not only by keyboard, or phones never see the shelf
  await attempt('click the album button', async () => {
    await openPocket();
    await p.click('#btn-album', { timeout: T(5000) });
    await settle();
  });
  ok(await p.isVisible('#album-panel'), 'the album opens by CLICK on the HUD button');
  await attempt('click put-it-back', async () => { await p.click('#album-close', { timeout: T(5000) }); await settle(); });
  ok(!(await p.isVisible('#album-panel')), 'the album folds again by click');
  await p.close();
  if (pointerFails.length > 0) {
    console.error('POINTER GUARD FAILED:\n' + pointerFails.join('\n'));
    console.log('=== SUMMARY ===');
    console.log('AUTOTEST NOT RUN — the thumb path is broken');
    await browser.close();
    server.close();
    process.exit(1);
  }
}

try {
  // The four-day journey is longer now (Day 4 afternoon included) and this
  // suite must survive a LOADED machine — the 340 s ceiling once cut Day 4
  // off mid-walk while Days 1-3 were still being honest. 600 s held until
  // the walks grew progress-extended deadlines (a walk still moving is not
  // a failed walk, 3x cap): slow sandboxes now spend the cap on the long
  // legs, so 900 s with a condition-based driver.
  await page.waitForFunction(() => window.__AUTOTEST__?.done === true, null, { timeout: 900000 });
} catch {
  console.error('TIMEOUT waiting for the autotest driver');
}

const result = await page.evaluate(() => ({
  summary: window.__AUTOTEST_SUMMARY__ ?? 'NO SUMMARY',
  failures: window.__AUTOTEST__?.failures ?? ['driver never reported'],
  lines: window.__AUTOTEST__?.lines ?? [],
}));

console.log('=== SUMMARY ===');
console.log(result.summary);
console.log('=== CONSOLE ERRORS ===');
console.log(consoleErrors.length === 0 ? '(none)' : consoleErrors.join('\n'));

await page.screenshot({ path: 'e2e-final-state.png' });

await browser.close();
server.close();
process.exit(result.failures.length === 0 && consoleErrors.length === 0 ? 0 : 1);
