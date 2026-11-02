import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) { res.writeHead(200, {'content-type': MIME[extname(file)] ?? 'application/octet-stream'}); res.end(readFileSync(file)); }
  else { res.writeHead(200, {'content-type':'text/html'}); res.end(readFileSync(join(DIST,'index.html'))); }
});
await new Promise(r => server.listen(4717, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4717/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const g = window.__game;
  const r = g['renderer'];
  if (!window.__origRender) {
    window.__origRender = r.render.bind(r);
    r.render = (scene, camera) => {
      window.__cam = camera;
      return window.__origRender(scene, camera);
    };
  }
  const p = g.player.capsule;
  p.x = -41.5; p.z = 4.6; p.y = 0.1;
  for (let i = 0; i < 30; i++) g.world.update(1 / 60, p); // let the taxi drive a bit
  window.__cam.position.set(-47.5, 5.2, 0.0);
  window.__cam.lookAt(-42, -2.2, 6.4);
  window.__cam.updateMatrixWorld(true);
  const cam = window.__cam;
  const V3 = cam.position.constructor;
  const proj = (x, y, z) => {
    const v = new V3(x, y, z).project(cam);
    return [ +v.x.toFixed(2), +v.y.toFixed(2) ];
  };
  const t = g.world['taxi'] ?? g.world['cab'];
  const tp = t ? t.position : null;
  return {
    taxiPos: tp ? [+tp.x.toFixed(1), +tp.y.toFixed(1), +tp.z.toFixed(1)] : null,
    taxiNDC: tp ? proj(tp.x, 0.6, tp.z) : null,
    step3NDC: proj(-42, -0.7, 6.0),
    step8NDC: proj(-42, -2.7, 7.25),
    openingCenterNDC: proj(-42, -1.5, 6.5),
    treeCrownNDC: proj(-45, 3.6, 4.7),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
