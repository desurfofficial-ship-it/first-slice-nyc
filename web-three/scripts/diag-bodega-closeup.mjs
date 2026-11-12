/** Targeted bodega close-ups: ceiling rails, fridge wall, produce corner. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4601;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png' };
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
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load', timeout: 30000 });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(4500);

await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -16; g.player.capsule.z = 12; g.player.capsule.y = 0.11;
  const r = g.renderer;
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
  // census: name every non-trivial mesh near the ceiling band and the east wall
  const found = [];
  g.world.scene.traverse((o) => {
    if (!o.isMesh || !o.name) return;
    const wp = o.getWorldPosition(new (Object.getPrototypeOf(o.position).constructor)());
    if (o.name.startsWith('Bodega_') || o.name.startsWith('Fridge') || o.name.includes('Chip')) {
      found.push(`${o.name} wp=(${wp.x.toFixed(2)},${wp.y.toFixed(2)},${wp.z.toFixed(2)}) vis=${o.visible}`);
    }
  });
  window.__census = found;
});
const census = await page.evaluate(() => window.__census);
console.log(census.filter((s) => !s.includes('_Band') && !s.includes('_Trim')).join('\n'));

const shot = async (name, pos, at) => {
  await page.evaluate(([p, a]) => { window.__rigCam = { pos: p, at: a }; }, [pos, at]);
  await page.waitForTimeout(220);
  await page.screenshot({ path: `shots/bq-${name}.png` });
};
await shot('ceiling-east', [-14.5, 1.6, 13.0], [-12.5, 3.4, 15.5]);   // ceiling + east wall upper
await shot('fridge-close', [-13.6, 1.5, 16.5], [-11.7, 1.2, 16.5]);   // the fridge head-on
await shot('chipbags', [-13.2, 1.6, 10.0], [-11.46, 1.6, 9.9]);       // chip bag strip
await shot('topdown-store', [-16, 11.0, 8.0], [-16, 0.5, 14.0]);      // roof lifted top-down
await browser.close(); server.close();
console.log('DONE');
