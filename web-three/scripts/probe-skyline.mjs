/**
 * Probe: the skyline of lit windows (the GDD ask — "beyond the single gold
 * window"). Boots the plain page, walks the capsule to the middle of the
 * street, snaps the follow cam north, and screenshots the far towers: the
 * seeded warm panes should read as a lit city over the brownstone's roof.
 * Visual evidence only — the pattern's determinism is unit-tested.
 * ~25 s. Uses dist/ — run `npm run build` first.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4592;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const fails = [];
page.on('pageerror', (e) => fails.push(`PAGEERROR: ${e.message}`));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
await page.waitForTimeout(2500); // the world settles, dressDay(1) runs
// a material readback: the two skyline meshes must exist and be warm
const mats = await page.evaluate(() => {
  const g = window.__game;
  return {
    steady: g.world.skylineWinMat.emissiveIntensity,
    diary: g.world.skylineWinDiaryMat.emissiveIntensity,
  };
}).catch((e) => ({ error: String(e) }));
console.log('MATS:', JSON.stringify(mats));
// stand on the north sidewalk (the checkpoint's own ground) and look north:
// brownstone below, the far city above its roofline
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -30;
  g.player.capsule.z = 6.2;
  g.cam.snapBehind({ x: -30, y: 0.1, z: 6.2 });
});
await page.waitForTimeout(1600);
await page.screenshot({ path: 'probe-shots/probe-skyline.png' });
// and a second frame mid-street by the cart block, wider: the whole card
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 10;
  g.player.capsule.z = 2;
  g.cam.snapBehind({ x: 10, y: 0.1, z: 2 });
});
await page.waitForTimeout(1600);
await page.screenshot({ path: 'probe-shots/probe-skyline-wide.png' });
// the follow cam's pitch keeps the towers out of frame — the day-end
// postcard's camera looks up-street instead. Aim the game's LIVE camera
// north-and-up for ONE composed frame through the live scene (restored
// right after; the next follow frame re-syncs), and keep the print.
const shot = await page.evaluate(() => {
  const g = window.__game;
  const cam = g.cam.camera;
  // diagnostics first: do the InstancedMeshes exist, and is a pane in frame?
  const inst = [];
  g.world.scene.traverse((o) => {
    if (o.isInstancedMesh) inst.push({ count: o.count, warm: o.material.emissiveIntensity, visible: o.visible, fog: o.material.fog });
  });
  const V = cam.position.constructor;
  const pane = new V(4, 20, 86.94).project(cam); // a would-be pane on tower 2
  const p0 = cam.position.clone();
  const q0 = cam.quaternion.clone();
  cam.position.set(12.5, 8.6, -7.0);
  cam.lookAt(13.5, 26, 90);
  const pane2 = new V(4, 20, 86.94).project(cam);
  g.renderer.render(g.world.scene, cam); // one honest frame through the live scene
  const calls = g.renderer.info.render.calls;
  const tris = g.renderer.info.render.triangles;
  const url = g.renderer.domElement.toDataURL('image/png');
  cam.position.copy(p0);
  cam.quaternion.copy(q0);
  return { url, inst, paneAim: `${pane2.x.toFixed(2)},${pane2.y.toFixed(2)}`, tris, calls };
});
console.log('DBG:', JSON.stringify({ inst: shot.inst, paneNDC: shot.paneAim, tris: shot.tris, calls: shot.calls }));
const b64 = shot.url.split(',')[1];
if (!b64 || b64.length < 10_000) { console.error('FAIL the composed frame came back empty'); process.exit(1); }
const { writeFileSync } = await import('node:fs');
writeFileSync(new URL('../probe-shots/probe-skyline-postcard.png', import.meta.url), Buffer.from(b64, 'base64'));
console.log('POSTCARD: composed', Math.round(b64.length / 1024), 'KB');
await browser.close();
server.close();
if (mats.error || mats.steady === undefined) { console.error('FAIL skyline materials unreadable'); process.exit(1); }
if (mats.steady <= 0) { console.error('FAIL the far city is dark'); process.exit(1); }
if (fails.length > 0) { console.error(fails.join('\n')); process.exit(1); }
console.log('PASS the far city keeps its lamps on');
process.exit(0);
