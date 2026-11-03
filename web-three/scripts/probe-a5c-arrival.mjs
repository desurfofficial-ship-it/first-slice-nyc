/** A5c — the arrival cinematic, evidenced: capture every phase of the
 *  Doc 02 opening (ride → driver → reply → title → handover) with real
 *  taps, then assert the handover state. Fresh boot, no params.
 *
 *  Timing note: the sandbox's software GL runs the loop at a fraction of
 *  real speed and Game.frame clamps dt at 0.1 s, so machine time runs
 *  slower than wall time here. Every wait POLLS the machine phase instead
 *  of assuming wall-clock durations — real 60 fps players get the design
 *  timings; this probe gets the same sequences, however long they take. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4596;
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
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${PORT}/?film=1`, { waitUntil: 'load' });

const shot = (name) => page.screenshot({ path: `shots/a5c-${name}.png` });
const phase = () => page.evaluate(() => window.__game?.arrival?.machine.phase ?? 'none');
const elapsed = () => page.evaluate(() => window.__game ? window.__game.arrival.machine.elapsed : -1);
const tap = () => page.evaluate(() => document.getElementById('cine').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
const sleep = (ms) => page.waitForTimeout(ms);

/** Poll until the machine reaches `target` (or the budget dies). */
async function waitPhase(target, budgetMs) {
  const t0 = Date.now();
  for (;;) {
    const p = await phase();
    if (p === target) return true;
    if (Date.now() - t0 > budgetMs) return false;
    await sleep(400);
  }
}

await page.waitForTimeout(3000);
await shot('t3-ride-early');
await sleep(3500);
await shot('t7-ride-mid');       // countryside passing
await sleep(6000);
await shot('t13-ride-city');     // skyline lit, city arriving
console.log('ride phase:', await phase());

// advance to the driver line (the tap gate lives on machine time)
await tap();
console.log('waitPhase choice:', await waitPhase('choice', 15000));
await sleep(1200);
await shot('t15-driver-line');

// reply via a chip pick ("Is it that obvious?")
await page.evaluate(() => {
  const chips = document.querySelectorAll('#cine-chips button');
  chips[1]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
});
await sleep(900);
await shot('t16-you-line');
console.log('waitPhase driver reply:', await waitPhase('reply', 10000), 'elapsed:', await elapsed());
// give the driver's line its reading time (3.2 machine-s ≈ 7 real-s here)
await sleep(6500);
await shot('t23-driver-reply');
console.log('elapsed before final tap:', await elapsed());

// advance to the arrival card
await tap();
console.log('waitPhase card:', await waitPhase('card', 15000));
await sleep(500);
await shot('t25-dip');
console.log('waitPhase handover:', await waitPhase('handover', 20000));
await sleep(1500);
await shot('t28-title');
// let the card run to the handover
console.log('waitPhase off:', await waitPhase('off', 20000));
await sleep(600);
await shot('t30-handover');
const state = await page.evaluate(() => {
  const g = window.__game;
  const c = g.player.capsule;
  return {
    phase: g.arrival.machine.phase,
    hudVisible: !document.getElementById('hud').hidden,
    note: document.getElementById('note')?.textContent ?? '',
    objective: document.getElementById('objective')?.textContent ?? '',
    money: document.getElementById('money')?.textContent ?? '',
    player: { x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2) },
    rosaMode: g.world.rosa.userData.rig?.mode ?? 'none',
    playerVisualVisible: g.playerVisual.visible,
    checkpoint: g.checkpoint ? { x: g.checkpoint.x, z: g.checkpoint.z } : null,
    cam: {
      pos: g.cam.camera.position.toArray().map((v) => +v.toFixed(2)),
      yaw: +g.cam.camYaw.toFixed(3),
      moveYaw: +g.cam.moveYaw.toFixed(3),
      pose: g.cam.pose,
    },
    playerHeading: +g.player.rotationY.toFixed(3),
  };
});
console.log('HANDOVER:', JSON.stringify(state, null, 1));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
server.close();
