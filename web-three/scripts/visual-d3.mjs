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

// Day-3 staging for the WHOLE chapter, not just the shots where the wallet
// contrast bites (docs/51 B12): the first cut staged the day only for the
// kid-on-stool and dusk shots, so the plaza and brownstone frames still
// wore Day 1's $87 and the Day-1 "waving at you" objective. Evidence
// dresses like the day it depicts — header, wallet, and the boot toast
// (Day-1's "You are here" paper has no business on a Day-3 frame).
await page.evaluate(() => {
  const g = window.__game;
  const s = g.state;
  s.day = 3;
  s.cartName = "Wade's Spot";
  s.money = 111; s.dayStartMoney = 111;
  s.setStep(21 /* the morning flyer beat's own objective */);
  g.applyCartIdentity(s.cartName);
  g.ui.setMoneyQuiet(111);
  g.ui.setObjective(s.objectiveText());
  const note = document.getElementById('note');
  if (note) { note.classList.add('gone'); note.hidden = true; }
});

const shot = async (name, settleMs = 700) => {
  await page.waitForTimeout(settleMs);
  await page.screenshot({ path: join(OUT, name) });
  console.log('saved', name);
};

// 1 — the subway plaza: entrance, bulletin board flyer, benches, pigeons, park
// trees. The M121's shell parks at the terminal curb bay (BUS04_RECT), and the
// follow boom read it as the frame's subject (docs/51 B12: the bus ate the
// plaza). The authored beat owns the camera: from the south-west the stair,
// benches, pigeons and the player own the frame; the bus holds the right edge.
await teleport(-38.5, 0.05, 5.2, Math.PI * 0.75);
await page.evaluate(() => {
  const g = window.__game;
  g.cam.update = () => {};
  g.cam.camera.position.set(-43.0, 2.6, 1.6);
  g.cam.camera.lookAt(-38.4, 0.8, 5.6);
});
await shot('d3_plaza_pigeons_portrait.png', 900);
await page.evaluate(() => { delete window.__game.cam.update; });

// 2 — the brownstone row (stoops, doors, parlor windows, AC units).
// (Docs/31's "empty lower half" was tried against a closer stand at the
// row itself — the sidewalk trees eat the doors from there; the curb
// stand keeps the row clean and the asphalt strip is the honest cost.)
await teleport(-32, 0.05, -3.6, Math.PI);
await shot('d3_brownstones_portrait.png');

// 3 — Day 3 morning at the cart: Rosa visiting, stool bought, kid seated
// The HUD is staged too (docs/51 B12): the first cut of these frames wore
// Day-1's $87 and Day-1's objective while depicting Day 3. The wallet law
// is the tests' own: Day 3 opens at $111 (state-day3's day2Done), the
// day closes at $120 (state-day4's day3Done).
await page.evaluate(() => {
  const g = window.__game;
  const s = g.state;
  s.day = 3;
  s.cartName = "Wade's Spot";
  s.money = 111; s.dayStartMoney = 111;
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
  g.ui.setMoneyQuiet(111);
  g.ui.setObjective(s.objectiveText());
});
await page.evaluate(() => {
  const g = window.__game;
  // directly seat him (deterministic framing for the shot)
  g.world.kidGround.visible = true;
  g.world.kidGround.position.set(7.15, 0.05, -6.25);
  g.world.kidGround.rotation.y = -1.25;
  const rig = g.world.kidGround.userData.rig;
  if (rig) rig.mode = 'sit';
  g.player.capsule.x = 1.2; g.player.capsule.y = 0.05; g.player.capsule.z = -2.4;
  g.player.rotationY = 0.4;
  // the frame's SUBJECT is the kid on the stool at the cart corner — the
  // follow cam framed the empty street instead (docs/51 B12: evidence
  // frames show their subject). Park the boom and aim at the corner:
  // the player watches from the foreground, kid + stool + cart own the
  // middle third.
  g.cam.update = () => {};
  g.cam.camera.position.set(0.4, 2.7, -0.1);
  g.cam.camera.lookAt(7.0, 0.85, -6.1);
});
await shot('d3_kid_on_stool_portrait.png');

// 4 — dusk: three windows lit, framed from the real postcard-rig pose.
// The frame loop owns the camera, so park it: no-op cam.update, then pose.
// The wallet dresses like the day's close: the rush's take has landed
// ($120, the tests' day3Done law) on the morning's $111 bank.
await page.evaluate(() => {
  const g = window.__game;
  g.state.setStep(23 /* D3_POSTCARD */);
  g.state.money = 120;
  g.ui.setMoneyQuiet(120);
  g.ui.setObjective(g.state.objectiveText());
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
