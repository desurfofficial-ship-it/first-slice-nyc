// Close-ups of the relocated ported stair (−326.5, 11.2) — does it read as a subway entrance?
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4593;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(5500);
await page.evaluate(() => { window.dismissPostcard?.(); const nb = document.querySelector('[data-name-box], .namebox, #namebox'); if (nb) nb.hidden = true; });
mkdirSync('shots/tss-road-clear', { recursive: true });
const shot = async (name, pos, look) => {
  await page.evaluate(({ pos, look }) => {
    const g = window.__game;
    const c = g.player.capsule;
    c.x = pos[0]; c.y = pos[1]; c.z = pos[2];
    const feet = { x: c.x, y: c.y, z: c.z };
    g.world.update(0.016, feet, false); g.world.update(0.016, feet, false);
    g.cam.update = () => {};
    g.cam.camera.position.set(pos[0], pos[1], pos[2]);
    g.cam.camera.lookAt(look[0], look[1], look[2]);
  }, { pos, look });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `shots/tss-road-clear/${name}.png` });
  console.log('SHOT', name);
};
// eye level from the south walk, looking NE at the stair
await shot('stair-eyelevel', [-329, 1.7, 2.0], [-326.5, 1.2, 11.2]);
// 3/4 aerial from SE
await shot('stair-aerial-se', [-320, 5.5, 3.0], [-327, 0.3, 12.5]);
// straight-on from the road
await shot('stair-road-on', [-326.5, 1.7, -6.0], [-326.5, 1.0, 11.2]);
await browser.close();
process.exit(0);
