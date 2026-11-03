/** Diag — the arrival-card SET, stripped of the title dim. The a5g probe
 *  only sees the card under cineTitle's overlay, so the backdrop behind
 *  the coach (gate facade, poles, apron) is never judged raw. This drives
 *  to the card, hides the overlay, frames the facade straight-on, and
 *  dumps every scene object within 25 m of the coach set. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4598;
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

const phase = (page) => page.evaluate(() => window.__game?.arrival?.machine.phase ?? 'none');
const sleep = (page, ms) => page.waitForTimeout(ms);

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:${PORT}/?film=1`, { waitUntil: 'load' });
const shot = (name) => page.screenshot({ path: `shots/gate-${name}.png` });
const tap = () => page.evaluate(() => document.getElementById('cine').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
await sleep(page, 2500);
// tap through: taps below the machine's gates are ignored, so keep
// tapping on a wall-clock cadence until the card phase actually lands
for (let i = 0; i < 40; i++) {
  if (await phase(page) === 'card') break;
  await tap();
  await sleep(page, 900);
}
if (await phase(page) !== 'card') throw new Error('never reached the card phase');
// strip the dim overlays so the raw set is judged, and stop the push-in
// tweens from fighting the studio frame (they are done by now anyway)
await page.evaluate(() => {
  for (const id of ['cine-title', 'cine-top', 'cine-bottom', 'cine-skip']) {
    const e = document.getElementById(id);
    if (e) e.style.display = 'none';
  }
});
await sleep(page, 2600); // let the push-in + door tween finish

// scene census: everything within 25 m of the coach set
const census = await page.evaluate(() => {
  const cx = -190, cz = 100;
  const out = [];
  window.__game.world.scene.traverse((o) => {
    if (!o.isMesh) return;
    const wp = o.getWorldPosition(new o.position.constructor());
    const d = Math.hypot(wp.x - cx, wp.z - cz);
    if (d < 25 && Math.abs(wp.y) < 30) {
      out.push(`${o.name || '<anon>'} @ (${wp.x.toFixed(1)}, ${wp.y.toFixed(1)}, ${wp.z.toFixed(1)}) d=${d.toFixed(1)}`);
    }
  });
  return out;
});
console.log('--- census (d<25 of -190,100) ---');
for (const line of census) console.log(line);

// studio frames via a STANDALONE camera (the probe-skyline pattern): render
// one honest frame and pull it off the canvas in the SAME evaluate — no race
// with the game's own loop, no rig smoothing to wait for
const studio = async (px, py, pz, lx, ly, lz, name) => {
  const url = await page.evaluate(([px, py, pz, lx, ly, lz]) => {
    const g = window.__game;
    const cam = g.__diagCam ?? (g.__diagCam = new (g.cam.camera.constructor)(55, 16 / 9, 0.1, 500));
    cam.position.set(px, py, pz);
    cam.lookAt(lx, ly, lz);
    cam.updateMatrixWorld();
    g.renderer.render(g.world.scene, cam); // one honest frame through the live scene
    return g.renderer.domElement.toDataURL('image/png');
  }, [px, py, pz, lx, ly, lz]);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`shots/gate-${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
};
await studio(-190, 3.0, 92.5, -190, 3.4, 101, 'studio-facade');
await studio(-188.2, 2.55, 96.9, -185.35, 2.55, 100, 'studio-pushend');

await browser.close();
server.close();
console.log('gate diag ok');
