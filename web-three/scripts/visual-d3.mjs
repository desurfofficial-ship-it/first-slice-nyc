/**
 * Day 3 + neighborhood visual evidence. Boots the real game, walks the world
 * to the new places, and saves frames for docs/28.
 * Usage: node scripts/visual-d3.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../assets/web-three/frames/', import.meta.url).pathname;
const PORT = 4581;
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
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
await page.waitForTimeout(1500);

const teleport = (x, y, z, yaw = 0) => page.evaluate(([x, y, z, yaw]) => {
  const g = window.__game;
  g.player.capsule.x = x; g.player.capsule.y = y; g.player.capsule.z = z;
  g.player.rotationY = yaw;
  g.cam.snapBehind({ x, y, z });
}, [x, y, z, yaw]);

const shot = async (name, settleMs = 700) => {
  await page.waitForTimeout(settleMs);
  await page.screenshot({ path: join(OUT, name) });
  console.log('saved', name);
};

// 1 — the subway plaza: entrance, bulletin board flyer, benches, pigeons, park trees
await teleport(-38.5, 0.05, 5.2, Math.PI * 0.75);
await shot('d3_plaza_pigeons_portrait.png');

// 2 — the brownstone row (stoops, doors, parlor windows, AC units)
await teleport(-32, 0.05, -3.6, Math.PI);
await shot('d3_brownstones_portrait.png');

// 3 — Day 3 morning at the cart: Rosa visiting, stool bought, kid seated
await page.evaluate(() => {
  const g = window.__game;
  const s = g.state;
  s.day = 3;
  s.cartName = "Wade's Spot";
  s.kidKept = true;
  s.awningUp = true;
  s.stoolUp = true;
  s.setStep(22 /* D3_CLIMB3 */);
  g.applyCartIdentity(s.cartName);
  g.world.cartAwning.visible = true;
  g.world.stool.visible = true;
  g.world.kidSil.visible = true;
  g.state.kidDown = true; g.state.kidAtCorner = true;
  // seat the kid via the same path the game uses
  s.setStep(21);
  for (const e of s.kidReachesCorner()) g.applyEffect(e); // no-op (stool already up? no: step D3_POSTER branch)
});
await page.evaluate(() => {
  const g = window.__game;
  // directly seat him (deterministic framing for the shot)
  g.world.kidGround.visible = true;
  g.world.kidGround.position.set(5.62, 0.05, -5.42);
  g.world.kidGround.rotation.y = Math.PI + 0.5;
  const rig = g.world.kidGround.userData.rig;
  if (rig) rig.mode = 'sit';
  g.player.capsule.x = 1.2; g.player.capsule.y = 0.05; g.player.capsule.z = -2.4;
  g.player.rotationY = 0.4;
  g.cam.snapBehind({ x: 1.2, y: 0.05, z: -2.4 });
});
await shot('d3_kid_on_stool_portrait.png');

// 4 — dusk: three windows lit, framed from the real postcard-rig pose.
// The frame loop owns the camera, so park it: no-op cam.update, then pose.
await page.evaluate(() => {
  const g = window.__game;
  g.state.setStep(23 /* D3_POSTCARD */);
  const sky = g.world.skyUniforms;
  sky.topColor.setHex(0x3e2f5b); sky.horizonColor.setHex(0x6d4c7d); sky.groundColor.setHex(0x6d4c7d);
  g.world.sun.intensity = 0.35 * Math.PI;
  g.world.hemi.intensity = 0.45 * Math.PI;
  g.world.fog.color.setHex(0x6d4c7d);
  g.world.goldWindowMat.emissiveIntensity = 4.0;
  g.world.secondWindowMat.emissiveIntensity = 3.2;
  g.world.thirdWindowMat.emissiveIntensity = 3.2;
  g.cam.update = () => {}; // the authored beat owns the camera, not the follow
  g.cam.camera.position.set(13.5, 9.5, -5.5);
  g.cam.camera.lookAt(13.5, 12, 7.94);
});
await shot('d3_three_windows_dusk_portrait.png', 900);
await page.evaluate(() => { delete window.__game.cam.update; });

// 5 — landscape street view: trees, streetlights, storefronts, the taxi
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -6; g.player.capsule.y = 0.05; g.player.capsule.z = -2.2;
  g.player.rotationY = 0;
  g.cam.snapBehind({ x: -6, y: 0.05, z: -2.2 });
});
await page.setViewportSize({ width: 1280, height: 720 });
await page.evaluate(() => window.__game.cam.updateFov(1280 / 720));
await shot('d3_street_landscape.png', 900);

await browser.close();
server.close();
console.log('done');
