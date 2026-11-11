/**
 * Diag: boot with a forced composer tier under SwiftShader and surface the
 * first pageerror with its stack (the graphics-wave pipeline check).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4593;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message, '\n', (e.stack ?? '').split('\n').slice(0, 6).join('\n')));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 300)); });
await page.goto(`http://localhost:${PORT}/?gfx=high`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(4000);
const state = await page.evaluate(() => {
  const g = window.__game;
  return { tier: g.gfx.tier, composer: g.gfx.composer, info: g.renderer.info.render.calls };
});
console.log('STATE:', JSON.stringify(state));
await browser.close();
server.close();
process.exit(0);
