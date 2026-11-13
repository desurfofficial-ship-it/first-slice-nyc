/** TSS draw-call census: calls while only the TS zone is visible. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4674;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?tod=10:00`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 180000 });
await page.waitForTimeout(2500);
const out = await page.evaluate(async () => {
  const g = window.__game;
  if (typeof g.dismissPostcard === 'function') g.dismissPostcard();
  const p = g.player.capsule;
  p.x = -330; p.z = 0; p.y = 0.05;
  g.world.update(1 / 60, p);
  await new Promise((r) => setTimeout(r, 400));
  g.world.update(1 / 60, p);
  await new Promise((r) => setTimeout(r, 400));
  let tssMeshes = 0, tssTextured = 0;
  g.world.timesSquare.group.traverse((o) => {
    if (o.isMesh && o.visible) { tssMeshes++; const m = o.material; if (m.map || m.transparent) tssTextured++; }
  });
  return { calls: g.renderer.info.render.calls, tssMeshes, tssTextured };
});
console.log('CENSUS', JSON.stringify(out));
await browser.close(); server.close(); process.exit(0);
