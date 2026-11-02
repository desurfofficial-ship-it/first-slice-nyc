/** A5e — wonder beat #1, evidenced: fire the sync by walking into the
 *  plaza, then capture the SAME composed canyon sightline three times —
 *  ramp, full warm, after release. (Follow-camera framing can't hold a
 *  designed frame; the render hook rigs the lens like probe-a5 does.) */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4594;
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
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2000);

// hook the render with the canyon rig (probe-a5's checked sightline)
await page.evaluate(() => {
  const r = window.__game.renderer;
  window.__origRender = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return window.__origRender(scene, camera);
  };
  window.__rigCam = { pos: [-67, 1.6, -64], at: [-71, 17, -56] };
});

// walk in from the headhouse mouth — the trigger is a step past z −61
await page.evaluate(() => {
  const g = window.__game;
  const c = g.player.capsule;
  c.x = -70; c.z = -62.5; c.y = 0.05; c.vy = 0;
  g.world.update(1 / 60, c);
});
await page.waitForTimeout(600); // ramp (~t 0.6 under wall-clock drift)
await page.screenshot({ path: 'shots/a5e-sync-ramp.png' });
await page.waitForTimeout(1800); // hold (~t 2.4)
await page.screenshot({ path: 'shots/a5e-sync-full.png' });
const mid = await page.evaluate(() => {
  const fs = window.__game.world.firstSession;
  return { fired: fs.syncFired, t: +fs.syncT.toFixed(2), faces: fs.syncFaces.length };
});
await page.waitForTimeout(1500); // release underway
await page.waitForFunction(() => {
  const fs = window.__game.world.firstSession;
  return fs.syncT < 0; // fully released — machine time, not wall time
}, null, { timeout: 30000 });
await page.screenshot({ path: 'shots/a5e-sync-after.png' });
const after = await page.evaluate(() => {
  const fs = window.__game.world.firstSession;
  return { t: +fs.syncT.toFixed(2), sample: fs.syncFaces[0].color.getHexString() };
});
console.log('MID:', JSON.stringify(mid), 'AFTER:', JSON.stringify(after));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
server.close();
