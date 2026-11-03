/**
 * Visual probe — the paper-prototype surfaces (docs/11 + docs/12):
 * the order card (serving conversation), the Map notebook, and the
 * Day-1 dusk payoff. Screenshots land in probe-shots/ for the
 * Anti-Slop Quality Gate review (AGENTS.md §1b: inspected in the
 * running game, at desktop AND phone width — the Vertical-First Law).
 *
 * Usage: node scripts/probe-doc12.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../probe-shots', import.meta.url).pathname;
const PORT = 4593;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });

async function run(width, height, tag) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const g = window.__game; g.input.injectKey('Space', false); });

  const pos = () => page.evaluate(() => {
    const p = window.__game.player.capsule;
    return `${p.x.toFixed(1)},${p.z.toFixed(1)}`;
  });

  const walkTo = async (x, z, timeout = 25000) => {
    const t0 = Date.now();
    for (;;) {
      const done = await page.evaluate(([tx, tz]) => {
        const g = window.__game;
        const p = g.player.capsule;
        const dx = tx - p.x, dz = tz - p.z;
        if (Math.hypot(dx, dz) < 0.45) {
          for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) g.input.injectKey(k, false);
          return true;
        }
        const yaw = g.player.camYaw ?? 0;
        const fx = Math.sin(yaw), fz = Math.cos(yaw);
        const rx = -Math.cos(yaw), rz = Math.sin(yaw);
        const fwd = dx * fx + dz * fz;
        const right = dx * rx + dz * rz;
        g.input.injectKey('KeyW', fwd > 0.2); g.input.injectKey('KeyS', fwd < -0.2);
        g.input.injectKey('KeyD', right > 0.2); g.input.injectKey('KeyA', right < -0.2);
        return false;
      }, [x, z]);
      if (done) return true;
      if (Date.now() - t0 > timeout) { console.log(`  walk timeout at ${await pos()}`); return false; }
      await page.waitForTimeout(220);
    }
  };

  const press = async () => {
    await page.evaluate(() => {
      const g = window.__game;
      g.input.injectKey('Space', true);
      setTimeout(() => g.input.injectKey('Space', false), 120);
    });
    await page.waitForTimeout(500);
  };

  const shot = (name) => page.screenshot({ path: join(OUT, `${name}-${tag}.png`) });

  console.log(`[${tag}] to Rosa`);
  await walkTo(-27.8, 6.6);
  await press(); // Rosa greeting
  // the bench detour (diag-bodega's lesson: the direct line meets a bench)
  await walkTo(-25.9, 5.95);
  await walkTo(-22.8, 5.95);
  await walkTo(-16, 7.0);
  await walkTo(-16, 12.0); // inside the bodega
  console.log(`[${tag}] collecting the errand`);
  for (const x of [-18.0, -16.0, -14.0]) {
    await walkTo(x, 18.3);
    await press();
  }
  await walkTo(-18.0, 13.0);
  await page.waitForTimeout(600);

  console.log(`[${tag}] the first order card`);
  await press(); // opens the conversation
  await page.waitForFunction(() => !window.__game.ui.orderCard.hidden, null, { timeout: 8000 });
  await shot('order-card');
  // the ask path — the teach moment, in the same paper
  await page.evaluate(() => window.__game.advanceOrder(2));
  await page.waitForTimeout(400);
  await shot('order-ask');
  await page.evaluate(() => window.__game.advanceOrder(null));
  await page.waitForTimeout(400);

  console.log(`[${tag}] the Map, open`);
  await page.evaluate(() => window.__game.toggleMap());
  await page.waitForTimeout(500);
  await shot('map-open');
  await page.evaluate(() => window.__game.toggleMap());
  await page.waitForTimeout(300);

  await page.close();
}

await run(900, 700, 'desktop');
await run(390, 844, 'phone');

// the dusk payoff — desktop only; the G debug key forces dusk + gold window
{
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const g = window.__game;
    // the authored dusk view: standing at the top landing, the rail behind
    // us, the street below — the same pose the postcard rig glides to
    g.player.capsule.x = 13.5;
    g.player.capsule.y = 8.05;
    g.player.capsule.z = -6.8;
    g.cam.snapBehind({ x: 13.5, y: 8.05, z: -6.8 });
    g.input.injectKey('KeyG', true);
    setTimeout(() => g.input.injectKey('KeyG', false), 150);
  });
  await page.waitForTimeout(6000); // flicker + hold
  const note = await page.evaluate(() => document.getElementById('note')?.textContent ?? '');
  console.log(`dusk note: ${note.slice(0, 80)}`);
  await page.screenshot({ path: join(OUT, 'gold-window-desktop.png') });
  await page.close();
}

await browser.close();
server.close();
console.log('probe-doc12 done → probe-shots/');
