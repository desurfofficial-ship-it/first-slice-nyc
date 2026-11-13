/**
 * Diag 7: raycast through the blob — from the top-down camera, cast rays
 * through blob-center pixels and through neighboring ground pixels; report
 * what each ray hits (name + point). This names the hole precisely.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4629;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => { if (/^(KITBAKE|CATALEM)/.test(m.text())) console.log('CONSOLE:', m.text()); });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const tele = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule; p.x = 150; p.z = 2;
  return { x: p.x, y: p.y, z: p.z };
});
console.log('teleported:', JSON.stringify(tele));
await new Promise((r) => setTimeout(r, 1500)); // real frames run
const report = await page.evaluate(() => {
  const g = window.__game;
  const out = [];
  const w = g.world;
  const p2 = g.player.capsule; p2.x = 150; p2.z = 2;
  let kitAlive = 0; const kitNames = [];
  w.scene.traverse((o) => { if (o.name && o.name.startsWith('Catalpa_')) { kitAlive++; kitNames.push(o.name); } });
  out.push(`kit alive: ${kitAlive} — ${kitNames.join(', ')}`);
  const v = (m) => m.geometry.getAttribute('position').count;
  const rows = [];
  for (const key of ['c3r1','c7r0','c7r1','c7r2','c8r0','c8r1','c8r2','c9r0','c9r1','c9r2','c10r0','c10r1','c10r2','c11r0','c11r1','c11r2']) {
    const arr = w.districtBatches?.get(key) ?? [];
    rows.push(`${key}:${arr.map((m) => v(m)).join('+') || '0'}`);
  }
  out.push('batches — ' + rows.join(' '));
  return out;
});
for (const r of report) console.log(r);
await browser.close();
server.close();
