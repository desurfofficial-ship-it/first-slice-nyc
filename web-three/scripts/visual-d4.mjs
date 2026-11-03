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
// The HUD is staged too — the first cut of these frames wore Day-1's $87 and
// Day-1's objective (the visual audit's top finding). Evidence should dress
// like the day it depicts.
await page.evaluate(() => {
  const g = window.__game;
  const s = g.state;
  s.day = 4;
  s.cartName = "Wade's Spot";
  s.money = 133;
  s.dayStartMoney = 120;
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
  g.world.kidGround.position.set(7.15, 0.05, -6.25);
  g.world.kidGround.rotation.y = -1.25;
  const rig = g.world.kidGround.userData.rig;
  if (rig) rig.mode = 'sit';
  g.ui.setMoneyQuiet(133);
  g.ui.setObjective(s.objectiveText());
  g.ui.showNote('Morning four. You know the way from here.');
});

// 1 — the stranger at the terminal: the Day-1 mirror (portrait). The
// follow boom read the audit's thin-strip census (docs/31: figures squeezed
// between blank wall and asphalt, BUS TERMINAL sign clipped) — and since the
// M121's shell parked at the terminal curb bay (BUS04_RECT x -37.65..-26.65,
// z 0.75..3.25) the boom's strip got WORSE: the shell fills the middle band.
// The authored beat owns the camera: parked west of the shell's tail, on the
// north sidewalk, looking east along it — the pair owns the middle third,
// the shell holds the terminal context behind them, the sign peeks past.
await page.evaluate(() => {
  const g = window.__game;
  g.world.stranger.visible = true;
  g.world.stranger.position.set(-36.4, 0.05, 4.8);
  g.world.stranger.rotation.y = Math.PI;
  // the greeting beat's money: Rosa's $2 has landed by the second frame
  g.state.money = 122;
  g.state.setStep(26 /* D4_RUSH */);
  g.ui.setMoneyQuiet(122);
  g.ui.setObjective(g.state.objectiveText());
});
await teleport(-34.6, 0.05, 4.2, Math.PI * 0.9);
await page.evaluate(() => {
  const g = window.__game;
  g.cam.update = () => {}; // the authored beat owns the camera, not the follow
  // east of the pair, on the sidewalk between the shell's tail and the
  // building line: the pair owns the middle third with the shell wall
  // holding the terminal context behind them. (West of the pair every
  // sight-line rides into a plaza tree's trunk or canopy — the block's
  // own trees own that side; the canopy edge above the pair is the
  // honest cost of the sidewalk's shade.)
  g.cam.camera.position.set(-31.2, 1.75, 3.9);
  g.cam.camera.lookAt(-36.6, 1.1, 4.8);
});
await shot('d4_stranger_terminal_portrait.png', 900);
await page.evaluate(() => { delete window.__game.cam.update; });

// 2 — the greeting: you, her, the terminal behind her (portrait). The
// audit's weakest frame: the follow boom read as a top-down census — two
// small figures on blank planes. Parked pose now: a low three-quarter
// from off the player's shoulder, the pair owning the middle third and
// the terminal housing behind her (docs/51 B12).
await teleport(-34.9, 0.05, 4.5, Math.PI - 0.62);
await page.evaluate(() => {
  const g = window.__game;
  // she meets his eye — the greeting beat's whole point. Yaw from her
  // post (-36.4, 4.8) toward the player (-34.9, 4.5).
  g.world.stranger.rotation.y = Math.atan2(1.5, -0.3);
  g.cam.update = () => {}; // the authored beat owns the camera, not the follow
  // north of the M121's body (z 0.75..3.25 — a pose south of the sidewalk
  // stands inside the parked shell), low, off the player's shoulder;
  // ~4.5 m back so the pair owns the middle third with head-room and the
  // stranger's profile reads
  g.cam.camera.position.set(-32.5, 2.35, 7.7);
  g.cam.camera.lookAt(-35.9, 0.85, 4.6);
});
await shot('d4_the_greeting_portrait.png', 900);
await page.evaluate(() => { delete window.__game.cam.update; });

// 3 — she walks your first walk: mid-crosswalk, the cab waiting (landscape).
// The beat's own choreography says the cab WAITS — stage the engine's
// courtesy hold (World.CAB.holdCenterX: nose at the crosswalk's west edge,
// lane z −2, facing east) and freeze the loop so the evidence frame holds
// it; the follow boom also read a bare-asphalt census (no buildings, no
// cab, the player off the stripes), so the beat owns a parked camera.
await page.evaluate(() => {
  const g = window.__game;
  g.world.updateTaxi = () => {}; // hold the courtesy stop for the frame
  g.world.taxi.position.set(-12.9, 0, -2); // nose at x −10.7, the coded hold
});
await teleport(-4.3, 0.05, -0.9, -Math.PI / 2);
await page.evaluate(() => {
  const g = window.__game;
  g.cam.update = () => {};
  g.cam.camera.position.set(-1.1, 3.1, 2.6);
  g.cam.camera.lookAt(-8.6, 0.5, -2.1);
});
await page.setViewportSize({ width: 1280, height: 720 });
await page.evaluate(() => window.__game.cam.updateFov(1280 / 720));
await shot('d4_she_walks_your_first_walk.png', 900);
await page.evaluate(() => { delete window.__game.cam.update; delete window.__game.world.updateTaxi; });
await page.setViewportSize({ width: 720, height: 1280 });
await page.evaluate(() => window.__game.cam.updateFov(720 / 1280));

// 4 — dusk from the rail: FOUR windows lit (the lamp next door keeps its
// promise). The staged step also stages its own objective — the first cut
// wore the morning-rush header on a dusk frame (docs/51 B12 evidence
// hygiene: the HUD dresses like the beat it depicts).
await page.evaluate(() => {
  const g = window.__game;
  g.state.setStep(31 /* D4_POSTCARD */);
  g.ui.setObjective(g.state.objectiveText());
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
