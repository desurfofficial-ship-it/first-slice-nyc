/**
 * Live-camera diagnostic — NO frozen cameras this time. Every frame below is
 * what the real GameCamera shows a player who is actually playing (real key
 * events through the real InputManager), because "fix the camera view and
 * angle" must be judged from the player's chair, not from a tripod.
 *
 * Frames:
 *   1  spawn, just settled (landscape)          — the first impression
 *   2  mid-walk east along north sidewalk       — the 90% view
 *   3  crossing south through the crosswalk     — the flip view
 *   4  south sidewalk, settled                  — the other side
 *   5  mid-walk west along south sidewalk
 *   6-9 the same four beats in PORTRAIT 390x844 — the phone-first view
 * Plus a numeric readout (yaw/pitch/dist) for each beat on both aspects.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4597;
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

// Read the camera geometry the game itself computed (no probe overrides).
const readout = () => page.evaluate(() => {
  const g = window.__game;
  const c = g.cam.camera;
  const p = g.player.capsule;
  const dx = c.position.x - p.x, dy = c.position.y - (p.y + 1.2), dz = c.position.z - p.z;
  const horiz = Math.hypot(dx, dz);
  return {
    player: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
    cam: { x: +c.position.x.toFixed(2), y: +c.position.y.toFixed(2), z: +c.position.z.toFixed(2) },
    fov: +c.fov.toFixed(1), aspect: +c.aspect.toFixed(3),
    boomDist: +horiz.toFixed(2),
    pitchDeg: +(Math.atan2(dy, horiz) * 180 / Math.PI).toFixed(1),
    sideStep: +(g.cam.sideStep ?? 0).toFixed(2),
  };
});

const shot = async (name) => {
  const r = await readout();
  console.log(name, JSON.stringify(r));
  await page.screenshot({ path: join(OUT, `cam-${name}.png`) });
  await wait(250);
};

// ---- beat 1: spawn, untouched for a while so the idle settle finishes ----
await wait(3000);
await shot('L1-spawn-idle');

// ---- beat 2: walk east along the north sidewalk (hold D) ----
await page.keyboard.down('KeyD');
await wait(2600);
await shot('L2-walk-east');
await page.keyboard.up('KeyD');
await wait(1200);

// ---- beat 3: cross to the south side (hold S) ----
await page.keyboard.down('KeyS');
await wait(3400);
await page.keyboard.up('KeyS');
await wait(1600);
await shot('L3-south-settled');

// ---- beat 4: walk west along the south sidewalk (hold A) ----
await page.keyboard.down('KeyA');
await wait(2600);
await shot('L4-walk-west-south');
await page.keyboard.up('KeyA');
await wait(800);

// ---- portrait: fresh page at phone size, same beats ----
const portrait = await browser.newPage({ viewport: { width: 390, height: 844 } });
portrait.on('pageerror', (e) => errors.push('P-PAGEERROR: ' + e.message));
portrait.on('console', (m) => { if (m.type() === 'error') errors.push('P-CONSOLE: ' + m.text()); });
// rebind helpers to the portrait page
const readoutP = () => portrait.evaluate(() => { const g = window.__game; const c = g.cam.camera; const p = g.player.capsule; const dx = c.position.x - p.x, dy = c.position.y - (p.y + 1.2), dz = c.position.z - p.z; const horiz = Math.hypot(dx, dz); return { player: { x: +p.x.toFixed(2), z: +p.z.toFixed(2) }, cam: { x: +c.position.x.toFixed(2), y: +c.position.y.toFixed(2), z: +c.position.z.toFixed(2) }, fov: +c.fov.toFixed(1), boomDist: +horiz.toFixed(2), pitchDeg: +(Math.atan2(dy, horiz) * 180 / Math.PI).toFixed(1), sideStep: +(g.cam.sideStep ?? 0).toFixed(2) }; });
const shotP = async (name) => {
  const r = await readoutP();
  console.log(name, JSON.stringify(r));
  await portrait.screenshot({ path: join(OUT, `cam-${name}.png`) });
  await wait(250);
};
const readoutSrc = () => {
  const g = window.__game;
  const c = g.cam.camera;
  const p = g.player.capsule;
  const dx = c.position.x - p.x, dy = c.position.y - (p.y + 1.2), dz = c.position.z - p.z;
  const horiz = Math.hypot(dx, dz);
  return {
    player: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
    cam: { x: +c.position.x.toFixed(2), y: +c.position.y.toFixed(2), z: +c.position.z.toFixed(2) },
    fov: +c.fov.toFixed(1), aspect: +c.aspect.toFixed(3),
    boomDist: +horiz.toFixed(2),
    pitchDeg: +(Math.atan2(dy, horiz) * 180 / Math.PI).toFixed(1),
  };
};

await portrait.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await portrait.waitForTimeout(2500);
await wait(3000);
await shotP('P1-spawn-idle');
await portrait.keyboard.down('KeyD');
await wait(2600);
await shotP('P2-walk-east');
await portrait.keyboard.up('KeyD');
await wait(1200);
await portrait.keyboard.down('KeyS');
await wait(3400);
await portrait.keyboard.up('KeyS');
await wait(1600);
await shotP('P3-south-settled');
await portrait.keyboard.down('KeyA');
await wait(2600);
await shotP('P4-walk-west-south');
await portrait.keyboard.up('KeyA');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'zero console/page errors');
await browser.close();
server.close();
