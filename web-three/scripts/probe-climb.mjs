/**
 * Climb probe — replays the e2e driver's ladder-1 dismount beat in isolation
 * and logs per-frame physics around the step-off, so bake vs no-bake
 * differences are attributable. Loads dist/, teleports to the ladder,
 * climbs W past y=3.6, steps east off the ladder, records the fall.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4582;
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

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

const report = await page.evaluate(() => new Promise((resolve) => {
  const g = window.__game;
  const p = g.player.capsule;
  const frames = [];
  let phase = 'teleport';
  let exitY = -1;
  const t0 = performance.now();

  // teleport in front of ladder 1; the grab trigger fires on the next frame
  p.x = 9.4; p.y = 0.05; p.z = -7.2;
  g.player.vy = 0;

  const sample = () => {
    frames.push({
      t: Math.round(performance.now() - t0),
      ph: phase,
      x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3),
      ladder: g.player.ladder !== null, ground: g.player.onGround, vy: +g.player.vy.toFixed(2),
    });
  };

  const tick = () => {
    sample();
    if (phase === 'teleport' && g.player.ladder !== null) {
      phase = 'climb';
      g.input.injectKey('KeyW', true);
    } else if (phase === 'climb' && p.y > 3.6) {
      phase = 'hold';
      exitY = p.y;
      g.input.injectKey('KeyW', false);
      setTimeout(() => {
        phase = 'stepoff';
        g.input.injectKey('KeyD', true);
        setTimeout(() => {
          g.input.injectKey('KeyD', false);
          phase = 'settle';
          setTimeout(() => {
            phase = 'done';
            const finalY = p.y;
            resolve({ exitY: +exitY.toFixed(3), finalY: +finalY.toFixed(2),
              onGround: g.player.onGround, ladder: g.player.ladder !== null,
              frames: frames.filter((f, i) => i > frames.length - 26 || f.ph === 'hold') });
          }, 2500);
        }, 1200);
      }, 80);
      setTimeout(tick, 40);
      return;
    }
    if (phase !== 'done') setTimeout(tick, 40); // ~25 Hz sampling, above sim rate
    else resolve({ exitY, finalY: p.y, onGround: g.player.onGround, frames: [] });
  };
  setTimeout(tick, 300);
}));

console.log(`exitY=${report.exitY} finalY=${report.finalY} onGround=${report.onGround} ladder=${report.ladder}`);
for (const f of report.frames) {
  console.log(`  t=${String(f.t).padStart(5)} ${f.ph.padEnd(8)} x=${String(f.x).padStart(6)} y=${String(f.y).padStart(6)} vy=${String(f.vy).padStart(6)} ladder=${f.ladder ? 1 : 0} ground=${f.ground ? 1 : 0}`);
}
console.log(errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'ZERO page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
