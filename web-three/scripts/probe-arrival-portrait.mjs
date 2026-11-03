/** The arrival ride, judged on a PHONE: 9:16 portrait, frames through the
 *  whole ride + the driver beat + the arrival card. Machine time runs slow
 *  under software GL, so every frame waits on `machine.elapsed` instead of
 *  wall clock. Shots land in shots/arrival-portrait/. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
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
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${PORT}/?film=1`, { waitUntil: 'load' });

const OUT = new URL('../shots/arrival-portrait', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const state = () => page.evaluate(() => ({
  phase: window.__game?.arrival?.machine.phase ?? 'none',
  elapsed: window.__game?.arrival?.machine.elapsed ?? -1,
}));
const tap = () => page.evaluate(() => document.getElementById('cine').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
const sleep = (ms) => page.waitForTimeout(ms);

/** Poll until machine.elapsed >= t while in `phase` (or any phase if null). */
async function waitRideTime(t, budgetMs = 120000) {
  const t0 = Date.now();
  for (;;) {
    const s = await state();
    if (s.phase === 'ride' && s.elapsed >= t) return true;
    if (s.phase !== 'off' && s.phase !== 'ride' && Date.now() - t0 > 2000) return s.phase;
    if (Date.now() - t0 > budgetMs) return false;
    await sleep(350);
  }
}

await page.waitForTimeout(2500);
// ride frames — countryside, light-up, city arrival
for (const t of [1.0, 3.0, 4.8, 6.5, 8.2, 9.6]) {
  const ok = await waitRideTime(t);
  console.log(`ride t=${t}:`, ok, JSON.stringify(await state()));
  await shot(`p-ride-${String(t).replace('.', '_')}`);
}
// tap through to the driver line
await tap();
const t0 = Date.now();
for (;;) {
  const s = await state();
  if (s.phase === 'choice') break;
  if (Date.now() - t0 > 20000) break;
  await sleep(400);
}
await sleep(800);
await shot('p-driver-line');
// pick chip 1 → reply
await page.evaluate(() => {
  const chips = document.querySelectorAll('#cine-chips button');
  chips[1]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
});
await sleep(1500);
await shot('p-reply');
// tap to the card (reply gate 3.2 machine-s)
for (;;) {
  const s = await state();
  if (s.phase === 'reply' && s.elapsed >= 3.3) { await tap(); break; }
  if (s.phase === 'card') break;
  if (Date.now() - t0 > 90000) break;
  await sleep(400);
}
const c0 = Date.now();
for (;;) {
  const s = await state();
  if (s.phase === 'card') break;
  if (Date.now() - c0 > 30000) break;
  await sleep(400);
}
await sleep(2500);
await shot('p-card-title');
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
server.close();
