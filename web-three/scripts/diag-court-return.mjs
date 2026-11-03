/**
 * DIAGNOSTIC for docs/51 B3 — proves the 'return'-phase intercept break.
 * Drives a DETERMINISTIC gate exit through the real release path
 * (stand (45.0,5.6), testRelease q=0.30 → ball rests at (45.69, 3.72),
 * outside the fence), then does exactly what a player chasing the rolling
 * ball does: stands next to it and presses interact.
 * Expected pre-fix: press does nothing (hotspot stuck at the pre-shot spot).
 * Usage: node scripts/diag-court-return.mjs   (against a fresh `bun run build`)
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = process.env.COURT_DIST
  ? (process.env.COURT_DIST.startsWith('/') ? process.env.COURT_DIST : join(process.cwd(), process.env.COURT_DIST))
  : new URL('../dist', import.meta.url).pathname;
const PORT = 4601;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
await page.waitForTimeout(1200);

const snap = (label) => page.evaluate((l) => {
  const g = window.__game;
  const b = g.world.ball.position;
  console.log(`[snap:${l}] phase=${g.court.phase} ball=(${b.x.toFixed(2)},${b.y.toFixed(2)},${b.z.toFixed(2)})`
    + ` player=(${g.player.capsule.x.toFixed(2)},${g.player.capsule.z.toFixed(2)})`
    + ` nearest=${g.nearestInteraction()?.id ?? null}`);
}, label);

// 1. stand at the gate-exit spot, pick the ball up via the real press
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 45.0; g.player.capsule.y = 0.1; g.player.capsule.z = 5.6;
  g.player.vy = 0;
  g.playerVisual.position.set(45.0, 0.1, 5.6);
  g.cam.snapBehind({ x: 45.0, y: 0.1, z: 5.6 });
});
await page.waitForTimeout(300);
await snap('before pickup');
await page.keyboard.press('Space');
const picked = await page.waitForFunction(() => window.__game.court.phase === 'held', null, { timeout: 4000 })
  .then(() => true).catch(() => false);
console.log('picked up:', picked);
if (!picked) { console.log('PICKUP FAILED — aborting'); process.exit(1); }

// 2. the deterministic gate-exit release through the real machine
await page.evaluate(() => { window.__game.court.testRelease(45.0, 5.6, 0.30); });
await page.waitForFunction(() => window.__game.court.phase === 'flight', null, { timeout: 3000 }).catch(() => {});
await snap('in flight');

// 3. wait for rest|return — the ball should roll out the gate → 'return'
const settled = await page.waitForFunction(() => {
  const p = window.__game.court.phase;
  return p === 'rest' || p === 'return';
}, null, { timeout: 16000 }).then((h) => h.evaluate(() => window.__game.court.phase)).catch(() => 'TIMEOUT');
console.log('settled phase:', settled, '(expected: return — the ball is outside the fence)');
await snap('at settle');

// 4. chase the rolling ball: stand next to it, press interact
await page.evaluate(() => {
  const g = window.__game;
  const b = g.world.ball.position;
  const dx = 44.25 - b.x, dz = 7.0 - b.z;
  const d = Math.hypot(dx, dz) || 1;
  const px = b.x - (dx / d) * 0.6, pz = b.z - (dz / d) * 0.6;
  g.player.capsule.x = px; g.player.capsule.y = 0.1; g.player.capsule.z = pz;
  g.player.vy = 0;
  g.player.rotationY = Math.atan2(44.25 - px, 7.64 - pz);
  g.playerVisual.position.set(px, 0.1, pz);
  g.cam.snapBehind({ x: px, y: 0.1, z: pz });
});
await page.waitForTimeout(250);
await snap('standing by the rolling ball');

// 5. the press a player makes — and the verdict
await page.keyboard.press('Space');
const gotHeld = await page.waitForFunction(() => window.__game.court.phase === 'held', null, { timeout: 4000 })
  .then(() => true).catch(() => false);
await snap('after press');
console.log(gotHeld
  ? '\nRESULT: intercept press WORKS (ball can be picked up mid-return)'
  : '\nRESULT: intercept press DOES NOTHING — docs/51 B3 mechanism confirmed');
await browser.close();
server.close();
process.exit(0);
