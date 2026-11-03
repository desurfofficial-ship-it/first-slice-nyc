/** Diag — the card as the PLAYER sees it: production rig untouched, title
 *  overlay stripped, frames at card+0.6/1.2/2.0 s in both orientations. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4598;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const phase = (page) => page.evaluate(() => window.__game?.arrival?.machine.phase ?? 'none');
const sleep = (page, ms) => page.waitForTimeout(ms);
async function runSession(w, h, tag) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`http://localhost:${PORT}/?film=1`, { waitUntil: 'load' });
  const tap = () => page.evaluate(() => document.getElementById('cine').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await sleep(page, 2500);
  for (let i = 0; i < 40; i++) {
    if (await phase(page) === 'card') break;
    await tap();
    await sleep(page, 900);
  }
  if (await phase(page) !== 'card') throw new Error('no card');
  await page.evaluate(() => {
    for (const id of ['cine-title', 'cine-top', 'cine-bottom', 'cine-skip']) {
      const e = document.getElementById(id);
      if (e) e.style.display = 'none';
    }
  });
  await sleep(page, 600);
  await page.screenshot({ path: `shots/gate-prod-${tag}-a.png` });
  await sleep(page, 700);
  await page.screenshot({ path: `shots/gate-prod-${tag}-b.png` });
  await sleep(page, 800);
  await page.screenshot({ path: `shots/gate-prod-${tag}-c.png` });
  await page.close();
}
await runSession(1280, 720, 'land');
await runSession(390, 844, 'port');
await browser.close();
server.close();
console.log('prod diag ok');
