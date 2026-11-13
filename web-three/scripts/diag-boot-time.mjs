import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('/home/z/my-project/repo/web-three/dist', import.meta.url).pathname;
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, {'content-type': '.js'===extname(f)?'text/javascript':'text/html'}); res.end(readFileSync(f)); }
  else { res.writeHead(200, {'content-type': 'text/html'}); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(4663, r));
const t0 = Date.now();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 480, height: 320 } });
await page.goto('http://localhost:4663/?probe=1', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 300000 });
console.log('BOOT_MS', Date.now() - t0);
const c = await page.evaluate(() => window.__game.world.colliders.length);
console.log('COLLIDERS', c);
await browser.close();
process.exit(0);
