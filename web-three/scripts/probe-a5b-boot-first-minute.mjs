/** A5b — first-minute audit: what does a BRAND-NEW player see in the first
 *  60 seconds? Captures timed frames from page load, plus the boot UI state
 *  (note text, objective, money). No save = fresh Day 1 boot. */
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });

const frame = (ms, name) => page.waitForTimeout(ms).then(() =>
  page.screenshot({ path: `shots/a5b-${name}.png` }));

await page.waitForTimeout(3000);
await frame(0, 't3-boot');
await frame(3000, 't6');
await frame(3000, 't9');

// boot state dump
const state = await page.evaluate(() => {
  const g = window.__game;
  if (!g) return { booted: false };
  const note = document.getElementById('note')?.textContent ?? '';
  const obj = document.getElementById('objective')?.textContent ?? '';
  const money = document.getElementById('money')?.textContent ?? '';
  const prompt = document.getElementById('prompt')?.textContent ?? '';
  const p = g.player.position ?? g.playerVisual.position;
  return { booted: true, note, obj, money, prompt, player: { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) }, day: g.state.day, step: g.state.step };
});
console.log('STATE:', JSON.stringify(state, null, 1));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
server.close();
