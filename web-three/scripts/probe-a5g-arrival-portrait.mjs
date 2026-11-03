/** A5g — the rebuilt arrival ride, evidenced in BOTH orientations: the
 *  9:16 law says the phone frame composes first, so this probe captures
 *  the ride + card at 390x844 (portrait) and 1280x720 (landscape) and
 *  asserts no page errors. Polls machine phases (software GL runs slow). */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
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

const errors = [];
const phase = (page) => page.evaluate(() => window.__game?.arrival?.machine.phase ?? 'none');
const elapsed = (page) => page.evaluate(() => window.__game ? window.__game.arrival.machine.elapsed : -1);
const sleep = (page, ms) => page.waitForTimeout(ms);

async function waitElapsed(page, target, budgetMs) {
  const t0 = Date.now();
  for (;;) {
    const e = await elapsed(page);
    if (e >= target) return true;
    if (Date.now() - t0 > budgetMs) return false;
    await sleep(page, 300);
  }
}

async function runSession(w, h, tag) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(`[${tag}] ` + String(e.stack ?? e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] console: ` + m.text()); });
  await page.goto(`http://localhost:${PORT}/?film=1`, { waitUntil: 'load' });
  const shot = (name) => page.screenshot({ path: `shots/a5g-${tag}-${name}.png` });
  await sleep(page, 2500);
  await shot('t2-ride-early');
  // the skyline light-up lands at game-time ~4.5 s; capture before and after
  await waitElapsed(page, 3.2, 120000);
  await shot('t3-pre-lightup');
  await waitElapsed(page, 6.5, 120000);
  await shot('t6-lit-city');
  // ride into the blocks
  await waitElapsed(page, 9.0, 120000);
  await shot('t9-city-close');
  // advance to the card (tap through choice/reply with the gates)
  const tap = () => page.evaluate(() => document.getElementById('cine').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await sleep(page, 2500);
  await tap();
  await sleep(page, 4500);
  await tap();
  await sleep(page, 4200);
  await tap();
  await sleep(page, 1500);
  const cardShot = async () => {
    for (let i = 0; i < 20; i++) {
      if (await phase(page) === 'card') break;
      await sleep(page, 500);
    }
    await sleep(page, 2500);
    await shot('tcard-coach');
  };
  await cardShot();
  await page.close();
}

await runSession(390, 844, 'portrait');
await runSession(1280, 720, 'landscape');
await browser.close();
server.close();
if (errors.length) {
  console.error('ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('a5g ok — both orientations captured, no page errors');
