/** FILM BUILDINGS — baseline/verification shot sweep for the arrival film.
 *  Boots ?film=1 fresh, polls the machine clock, and captures the film's
 *  natural frames (the frames consumers actually see): the ride at several
 *  machine times, the dialogue freeze (the tenement close-up), the card
 *  establishing + title, plus an early/late portrait ride frame.
 *  Usage: node scripts/diag-film-buildings.mjs [outPrefix]
 *  Shots land in shots/filmb-<prefix>-*.png */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const PREFIX = process.argv[2] ?? 'base';
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${PORT}/?film=1`, { waitUntil: 'load' });

const shot = (name) => page.screenshot({ path: `shots/filmb-${PREFIX}-${name}.png` });
const phase = () => page.evaluate(() => window.__game?.arrival?.machine.phase ?? 'none');
const elapsed = () => page.evaluate(() => window.__game ? window.__game.arrival.machine.elapsed : -1);
const sleep = (ms) => page.waitForTimeout(ms);

/** Poll until machine elapsed >= t (within phase) or the budget dies. */
async function waitElapsed(t, budgetMs, wantPhase) {
  const t0 = Date.now();
  for (;;) {
    const [p, e] = [await phase(), await elapsed()];
    if (wantPhase ? (p === wantPhase && e >= t) : e >= t) return true;
    if (Date.now() - t0 > budgetMs) return false;
    await sleep(250);
  }
}
const tap = () => page.evaluate(() => document.getElementById('cine').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));

await page.waitForTimeout(3500);
// ride: sample the machine clock as it crawls (software GL ≈ 1/3 speed)
for (const t of [1.5, 3.0, 4.5, 6.0, 7.5, 9.0]) {
  await waitElapsed(t, 40000, 'ride');
  await shot(`ride-${String(t).replace('.', '_')}`);
  console.log(`shot ride t=${t} phase=${await phase()} elapsed=${await elapsed()}`);
}
// the dialogue freeze — the tenement close-up consumers stare at
await tap();
for (let i = 0; i < 60 && (await phase()) !== 'choice'; i++) await sleep(400);
await waitElapsed(0.5, 15000, 'choice');
await sleep(1500);
await shot('freeze-driver-line');
console.log('freeze phase:', await phase(), 'elapsed:', await elapsed());
await tap(); // pick the default (shy) — straight to reply
for (let i = 0; i < 60 && (await phase()) !== 'reply'; i++) await sleep(400);
await sleep(6500);
await shot('freeze-driver-reply');
// the reply gate needs 3.2 machine-s before the next tap lands
await waitElapsed(3.3, 15000, 'reply');
await tap(); // reply → card
// the card: establishing (right after fade-in) + the pushed-in title
for (let i = 0; i < 80 && (await phase()) !== 'card'; i++) await sleep(400);
await sleep(1200);
await shot('card-establishing');
await sleep(9000); // the push-in finishes while this sleeps (machine time)
await shot('card-title');
console.log('card phase:', await phase());
// handover
for (let i = 0; i < 60 && (await phase()) !== 'handover'; i++) await sleep(400);
await sleep(1500);
await shot('handover-bay');
console.log('handover phase:', await phase());
console.log('page errors:', errors.length ? errors.slice(0, 6) : 'none');
await browser.close();
server.close();
process.exit(0);
