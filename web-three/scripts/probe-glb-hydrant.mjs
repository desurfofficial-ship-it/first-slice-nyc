/**
 * GLB seam probe — verifies the Blender-generated hydrant.glb is picked up
 * by the World's upgrade seam (docs/28): glbUpgrades records it, a wrapper
 * group appears in the scene, and the mesh is actually visible where the
 * placeholder stood. Serves dist/, so run npm run build first.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4581;
mkdirSync(OUT, { recursive: true });

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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3500); // boot + glb load + swap

const report = await page.evaluate(() => {
  const w = window.__game.world;
  const upgrades = Object.fromEntries(w.glbUpgrades);
  let wrapper = null;
  w.scene.traverse((o) => { if (o.name === 'hydrant_glb') wrapper = o; });
  return { upgrades, hasWrapper: !!wrapper, wrapperPos: wrapper ? wrapper.position.toArray().map((v) => +v.toFixed(2)) : null };
});
console.log('glbUpgrades:', JSON.stringify(report.upgrades));
console.log('hydrant_glb wrapper:', report.hasWrapper, 'at', report.wrapperPos);

// frame the hydrant: camera low, looking at (-0.6, 0.5, -4.6)
await page.evaluate(() => {
  window.__game.cam.update = () => {};
  const c = window.__game.cam.camera;
  c.position.set(-3.2, 1.4, -1.4);
  c.lookAt(-0.6, 0.5, -4.6);
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, 'env-hydrant-glb.png') });
console.log('shot env-hydrant-glb.png');

const ok = report.hasWrapper && report.upgrades.hydrant === 'models/hydrant.glb';
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO console/page errors');
console.log(ok ? 'SEAM OK' : 'SEAM FAILED');
await browser.close();
server.close();
process.exit(ok && !errors.length ? 0 : 1);
