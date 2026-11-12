/**
 * diag-subway-cam-repro — reproduce the player report:
 * "when entering the subway and entered the subway I can't see inside."
 *
 * Walks the golden path the way the player does — no teleports on the way
 * down: the street approach → the stair mouth → mid-stair → the platform —
 * and shoots the framed moment at each stage, logging camera vs player.
 * The screenshots are the evidence; the state log names the mover.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

mkdirSync(new URL('../shots', import.meta.url).pathname, { recursive: true });

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4613;
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

const VIEW = process.env.CAM_VIEW === 'portrait'
  ? { width: 390, height: 844 }
  : { width: 1280, height: 800 };
const TAG = process.env.CAM_VIEW === 'portrait' ? 'portrait' : 'landscape';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: VIEW });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text()); });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const sleep = (ms) => page.waitForTimeout(ms);

const state = () => page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  const c = g.cam.camera.position;
  const look = g.cam['focusTarget'] ?? null;
  const yardN = { v: null, p: null };
  g.world.scene.traverse((o) => {
    if (o.name === 'Yard_N') yardN.v = o.visible;
    if (o.name === 'Bldg_N_West') yardN.terminal = o.visible;
  });
  const st = g.world.subway;
  return {
    player: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
    cam: { x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2) },
    camYaw: +g.cam.camYaw.toFixed(2),
    interiorMode: g.cam.interiorMode,
    underground: st.underground,
    ceilingA: st.groups.stationA.children.length ? st.groups.stationA.getObjectByName('SUB_Ceiling_A')?.visible : null,
    stationAVisible: st.groups.stationA.visible,
    yardN: yardN.v,
    terminal: yardN.terminal,
  };
});

const shoot = (name) => page.screenshot({ path: `shots/camrepro-${TAG}-${name}.png` });
const log = async (label) => { const s = await state(); console.log(label, JSON.stringify(s)); };

/** press a movement key until pred() or timeout; returns elapsed ms */
const walkUntil = async (code, pred, timeoutMs = 20000) => {
  await page.evaluate((c) => window.__game.input.injectKey(c, true), code);
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await page.evaluate(pred)) break;
    await sleep(120);
  }
  await page.evaluate((c) => window.__game.input.injectKey(c, false), code);
  await sleep(300);
  return Date.now() - t0;
};

// face north (yaw PI = camera south of player, looking north into the stair)
console.log('--- staged approach: stand on Kestrel, aligned with the stair slot');
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -47.2; g.player.capsule.y = 0.1; g.player.capsule.z = 3.9;
  g.cam.camYaw = Math.PI; g.cam.moveYaw = Math.PI;
  g.cam.snapBehind(g.player.capsule);
});
await sleep(700);
await log('approach:');
await shoot('1-approach');

// walk north across the sidewalk into the stair mouth (z 4.2 -> 5.6)
console.log('--- walking north into the stair mouth');
await walkUntil('KeyW', () => {
  const p = window.__game.player.capsule;
  return p.z > 5.4 || p.y < 0.05;
}, 12000);
await log('stair-mouth:');
await shoot('2-stair-mouth');

// keep walking until the player lands mid-stair
console.log('--- descending');
await walkUntil('KeyW', () => {
  const p = window.__game.player.capsule;
  return p.y < -1.2;
}, 15000);
await log('mid-stair:');
await shoot('3-mid-stair');

// keep walking until the platform
await walkUntil('KeyW', () => {
  const p = window.__game.player.capsule;
  return p.y < -3.0 && p.z > 7.6;
}, 15000);
await sleep(500);
await log('platform-entry:');
await shoot('4-platform-entry');

// walk north onto the platform proper, stop, let the boom settle
await walkUntil('KeyW', () => {
  const p = window.__game.player.capsule;
  return p.z > 9.6;
}, 12000);
await sleep(2500);
await log('platform-settled:');
await shoot('5-platform-settled');

// the fare-bank pocket, where a player turns west toward the open lane
await page.evaluate(() => {
  const g = window.__game;
  g.cam.camYaw = Math.PI * 0.75; g.cam.moveYaw = Math.PI * 0.75;
});
await sleep(1200);
await shoot('6-platform-turned');

await browser.close();
server.close();
console.log('DONE');
