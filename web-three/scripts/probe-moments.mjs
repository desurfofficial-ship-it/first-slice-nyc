/** Doc 08 §2 moment cards — poses verified on the shelf (thumbs). */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4599;
mkdirSync(OUT, { recursive: true });
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
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);
for (const kind of ['rush', 'fold', 'towers', 'corner']) {
  await page.evaluate((k) => { window.__game.composeMomentCard(k); }, kind);
  await page.waitForTimeout(900);
}
const count = await page.waitForFunction(() => window.__game.ui.albumCount, null, { timeout: 15000 });
console.log('album count:', count.jsonValue ? await count.jsonValue() : count);
await page.evaluate(() => window.__game.ui.albumBtn.click());
await page.waitForTimeout(700);
await page.screenshot({ path: join(OUT, 'moments-shelf.png') });
console.log('screenshot: shots/moments-shelf.png');
await browser.close(); server.close();
