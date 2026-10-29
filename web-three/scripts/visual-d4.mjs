/**
 * Day 4 "Say Hi" visual evidence (docs/29). Boots the real game, stages the
 * chapter's beats the honest way (the same state the game itself sets), and
 * saves frames.
 * Usage: node scripts/visual-d4.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../assets/web-three/frames/', import.meta.url).pathname;
const PORT = 4583;
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

// Stage a kept Day-3 evening → Day-4 morning: kid lives on the stool now.
await page.evaluate(() => {
  const g = window.__game;
  const s = g.state;
  s.day = 4;
  s.cartName = "Wade's Spot";
  s.kidKept = true;
  s.awningUp = true;
  s.stoolUp = true;
  s.kidDown = true;
  s.kidAtCorner = true;
  s.setStep(24 /* D4_WAKE */);
  g.applyCartIdentity(s.cartName);
  g.world.cartAwning.visible = true;
  g.world.stool.visible = true;
  g.world.kidGround.visible = true;
  g.world.kidGround.position.set(5.62, 0.05, -5.42);
  g.world.kidGround.rotation.y = Math.PI + 0.5;
  const rig = g.world.kidGround.userData.rig;
  if (rig) rig.mode = 'sit';
});

// 1 — the stranger at the terminal: the Day-1 mirror (portrait)
await page.evaluate(() => {
  const g = window.__game;
  g.world.stranger.visible = true;
  g.world.stranger.position.set(-36.4, 0.05, 4.8);
  g.world.stranger.rotation.y = Math.PI;
});
await teleport(-34.6, 0.05, 4.2, Math.PI * 0.9);
await shot('d4_stranger_terminal_portrait.png');

// 2 — the greeting: you, her, the terminal behind her (portrait)
await teleport(-35.4, 0.05, 4.9, Math.PI - 0.5);
await shot('d4_the_greeting_portrait.png');

// 3 — she walks your first walk: mid-crosswalk, the cab waiting (landscape)
await page.evaluate(() => {
  const g = window.__game;
  g.world.stranger.position.set(-5, 0.05, -1.2);
  g.world.stranger.rotation.y = Math.PI; // heading south
});
await teleport(-1.2, 0.05, -1.6, -Math.PI / 2);
await page.setViewportSize({ width: 1280, height: 720 });
await page.evaluate(() => window.__game.cam.updateFov(1280 / 720));
await shot('d4_she_walks_your_first_walk.png', 900);
await page.setViewportSize({ width: 720, height: 1280 });
await page.evaluate(() => window.__game.cam.updateFov(720 / 1280));

// 4 — dusk from the rail: FOUR windows lit (the lamp next door keeps its promise)
await page.evaluate(() => {
  const g = window.__game;
  g.state.setStep(29 /* D4_POSTCARD */);
  const sky = g.world.skyUniforms;
  sky.topColor.setHex(0x3e2f5b); sky.horizonColor.setHex(0x6d4c7d); sky.groundColor.setHex(0x6d4c7d);
  g.world.sun.intensity = 0.35 * Math.PI;
  g.world.hemi.intensity = 0.45 * Math.PI;
  g.world.fog.color.setHex(0x6d4c7d);
  g.world.goldWindowMat.emissiveIntensity = 4.0;
  g.world.secondWindowMat.emissiveIntensity = 3.2;
  g.world.thirdWindowMat.emissiveIntensity = 3.2;
  g.world.fourthWindowMat.emissiveIntensity = 2.8;
  g.cam.update = () => {}; // the authored beat owns the camera, not the follow
  g.cam.camera.position.set(13.5, 9.5, -5.5);
  g.cam.camera.lookAt(13.5, 12, 7.94);
});
await shot('d4_four_windows_dusk_portrait.png', 900);
await page.evaluate(() => { delete window.__game.cam.update; });

await browser.close();
server.close();
console.log('done');
