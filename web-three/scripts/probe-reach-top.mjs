/**
 * Reach-top probe — replays the e2e driver's full Day-1 climb (ladder 1 →
 * landing 1 → ladder 2 → cap → step west) and reports per-frame position
 * around the landing-2 step-off plus whether the reach-top trigger fired.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4584;
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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 424, height: 300 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1200);

const report = await page.evaluate(() => new Promise((resolve) => {
  const g = window.__game;
  const p = g.player.capsule;
  // fast-forward the state machine to the climb step like a played session
  g.state.setStep(8); // Step.CLIMB
  const frames = [];
  const t0 = performance.now();
  const rec = (ph) => frames.push({
    t: Math.round(performance.now() - t0), ph,
    x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2),
    l: g.player.ladder !== null, g: g.player.onGround,
  });

  const teleport = { x: 9.4, y: 0.05, z: -7.2 };
  p.x = teleport.x; p.y = teleport.y; p.z = teleport.z; g.player.vy = 0;

  const key = (k, d) => g.input.injectKey(k, d);
  const until = (pred, cap, ph) => new Promise((done) => {
    const iv = setInterval(() => {
      rec(ph);
      if (pred() || performance.now() - t0 > cap) { clearInterval(iv); done(); }
    }, 60);
  });

  (async () => {
    await until(() => g.player.ladder !== null, 8000, 'grab');
    // the driver reaches the ladder after a long south-side walk: the chase
    // camera has settled to yaw≈π. Wait for the same orientation here or the
    // injected KeyD/A move the wrong way (camYaw 0 → KeyD = west).
    await until(() => Math.abs(((g.player.camYaw % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < 0.25, 12000, 'yaw');
    key('KeyW', true);
    await until(() => p.y > 4.2, 12000, 'ride1');
    key('KeyW', false);
    key('KeyD', true);
    await until(() => g.player.ladder === null, 6000, 'off1');
    key('KeyD', false);
    await until(() => p.y > 3.9 && p.x > 15.0, 15000, 'walkL2');
    key('KeyW', false); key('KeyD', false);
    // walk east along landing 1 to ladder 2 (like walkTo(16.2,-7.2))
    key('KeyD', true);
    await until(() => g.player.ladder !== null, 12000, 'grab2');
    key('KeyD', false);
    key('KeyW', true);
    await until(() => p.y >= 8.34, 15000, 'ride2');
    key('KeyW', false);
    key('KeyA', true);
    await until(() => g.player.ladder === null, 6000, 'off2');
    key('KeyA', false);
    const exitX = p.x; const exitY = p.y;
    await until(() => g.state.step !== 8 || performance.now() - t0 > 40000, 40000, 'settle');
    key('KeyA', false); key('KeyD', false); key('KeyW', false);
    resolve({
      exitX: +exitX.toFixed(3), exitY: +exitY.toFixed(3),
      reachedTop: g.state.step !== 8, step: g.state.step,
      final: { x: +p.x.toFixed(2), y: +p.y.toFixed(2) },
      frames: frames.slice(-40),
    });
  })();
}));

console.log(`exitX=${report.exitX} exitY=${report.exitY} reachedTop=${report.reachedTop} step=${report.step} final=(${report.final.x},${report.final.y})`);
for (const f of report.frames) {
  console.log(`  t=${String(f.t).padStart(6)} ${f.ph.padEnd(6)} x=${String(f.x).padStart(6)} y=${String(f.y).padStart(6)} z=${String(f.z).padStart(6)} L=${f.l ? 1 : 0} G=${f.g ? 1 : 0}`);
}
console.log(errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'ZERO page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
