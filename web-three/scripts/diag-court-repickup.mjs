/**
 * DIAGNOSTIC for docs/51 B3 — court ball re-pickup after a miss (flaky).
 * NOT a gate — a microscope. Mirrors probe-court's exact re-pickup pattern
 * (standByBall → press → held, on BOTH sides of a real keyboard shot) and
 * sweeps the charge hold so different rebound outcomes happen. Every press
 * is snapshotted: court.phase, ball pos, player capsule, nearestInteraction().
 * Usage: node scripts/diag-court-repickup.mjs   (against a fresh `bun run build`)
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = process.env.COURT_DIST
  ? (process.env.COURT_DIST.startsWith('/') ? process.env.COURT_DIST : join(process.cwd(), process.env.COURT_DIST))
  : new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
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
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
await page.waitForTimeout(1200);

const N = Number(process.env.DIAG_N ?? 14);

/** Snapshot of everything the interact press depends on. */
const snapshot = () => page.evaluate(() => {
  const g = window.__game;
  const b = g.world.ball.position;
  return {
    phase: g.court.phase,
    ball: { x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2) },
    player: { x: +g.player.capsule.x.toFixed(2), z: +g.player.capsule.z.toFixed(2) },
    nearest: g.nearestInteraction()?.id ?? null,
  };
});

/** Move the player right next to wherever the ball is, face the rim
 *  (byte-for-byte the probe-court standByBall). */
async function standByBall() {
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
    g.playerVisual.rotation.y = g.player.rotationY;
    g.cam.snapBehind({ x: px, y: 0.1, z: pz });
  });
  await page.waitForTimeout(300);
}

async function tryPickup(label, i, tag) {
  const before = await snapshot();
  await page.keyboard.press('Space');
  const gotHeld = await page.waitForFunction(() => window.__game.court.phase === 'held', null, { timeout: 4000 })
    .then(() => true).catch(() => false);
  const ok = gotHeld;
  if (!ok) console.log(`  [${String(i).padStart(2)}] ${tag} ${label} <<<< FAIL\n    before: phase=${before.phase} ball=(${before.ball.x},${before.ball.y},${before.ball.z}) player=(${before.player.x},${before.player.z}) nearest=${before.nearest}`);
  return ok;
}

let fails = 0;
for (let i = 0; i < N; i++) {
  const holdMs = 40 + i * 28;

  // pickup #1 — next to the ball wherever it rests now
  await standByBall();
  const p1 = await tryPickup('pickup#1', i, 'pre-shot ');
  if (!p1) { fails++; await page.waitForTimeout(900); continue; }

  // the REAL keyboard shot: hold → charge → release after holdMs
  await page.keyboard.down('Space');
  await page.waitForFunction(() => window.__game.court.phase === 'charging', null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(holdMs);
  await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__game.court.phase === 'flight', null, { timeout: 3000 }).catch(() => {});

  // wait for rest OR return — exactly what probe-court does
  const settledPhase = await page.waitForFunction(() => {
    const p = window.__game.court.phase;
    return p === 'rest' || p === 'return';
  }, null, { timeout: 16000 }).then((h) => h.evaluate(() => window.__game.court.phase)).catch(() => 'TIMEOUT');

  const atSettle = await snapshot();
  await standByBall();
  const atPress = await snapshot();
  const p2 = await tryPickup('pickup#2 (the B3 check)', i, 'post-shot');
  if (!p2) fails++;
  console.log(`[${String(i).padStart(2)}] hold=${String(holdMs).padStart(3)}ms settle=${settledPhase.padEnd(7)}`
    + ` ball@settle=(${atSettle.ball.x},${atSettle.ball.z})`
    + ` @press phase=${atPress.phase.padEnd(7)} ball=(${atPress.ball.x},${atPress.ball.z}) nearest=${atPress.nearest}`
    + ` p1=${p1 ? 'y' : 'N'} p2=${p2 ? 'y' : 'N'}`);
}

console.log(`\nDIAG: ${fails} failures across ${N} rounds`);
if (consoleErrors.length) console.log('console errors:', consoleErrors.slice(0, 5));
await browser.close();
server.close();
process.exit(0);
