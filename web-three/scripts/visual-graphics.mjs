/**
 * Graphics-wave evidence rig — captures the mission's 8 validation views and
 * samples draw calls / triangles / fps per rig. Runs against dist/ (the
 * production build) with the game's own window.__game handle.
 *
 * Usage:
 *   node scripts/visual-graphics.mjs            # after-shots: full day cycle
 *   BEFORE=1 node scripts/visual-graphics.mjs   # before-shots: shipped day+dusk
 *
 * Before-mode reproduces only the two states the shipped game has (golden
 * hour + dusk). After-mode drives the day cycle through dawn/midday/evening/
 * dusk/night via the ?tod probe affordance (Game.setClockTime).
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL(process.env.OUT_DIR ?? (process.env.BEFORE ? '../shots/before' : '../shots/after'), import.meta.url).pathname;
const PORT = Number(process.env.PORT ?? 4590);
const URL_PARAMS = process.env.PAGE_PARAMS ?? (process.env.BEFORE ? '' : '?gfx=high');
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.wasm': 'application/wasm' };
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

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/${URL_PARAMS}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

// The arrival film owns the camera until handed over — skip it for the rigs.
await page.evaluate(() => { try { window.__game.arrival.skip(); } catch {} });
await page.waitForTimeout(1800);
await page.evaluate(() => { try { window.__game.arrival.finish(); } catch {} });
await page.waitForTimeout(800);

// --- camera rigs (mission §8 validation views) -----------------------------
const RIGS = {
  '1-residential-day': { pos: [-4, 4.2, 10.5], look: [14, 5, -6] },   // north row, fire escape
  '2-commercial-day': { pos: [-14, 4.6, 1.5], look: [6, 2.4, -7] },   // storefront rows east
  '3-street-sunset': { pos: [-14, 4.6, 1.5], look: [6, 2.4, -7] },    // same lens, dusk state
  '4-street-night': { pos: [-14, 4.6, 1.5], look: [6, 2.4, -7] },
  '5-windows-dusk': { pos: [2.5, 3.2, -3.4], look: [13.5, 9, 7.9] },  // the gold window block
  '6-vehicles-peds': { pos: [-24, 3.4, -0.6], look: [-12, 1.1, -3] }, // cab + cart + walkers
  '7-distant-city': { pos: [-60, 26, 30], look: [0, 8, -40] },        // skyline fabric + landmarks
  '8-plaza-life': { pos: [-45, 4, 9], look: [-38, 1.5, 4.5] },        // trees + flock + court
};

const poseBody = ([px, py, pz], [lx, ly, lz]) => `
  (() => {
    const g = window.__game;
    g.player.capsule.x = ${px}; g.player.capsule.y = ${Math.max(0.1, py - 4)}; g.player.capsule.z = ${pz};
    g.cam.update = () => {};
    g.cam.camera.position.set(${px}, ${py}, ${pz});
    g.cam.camera.lookAt(${lx}, ${ly}, ${lz});
  })()`;
const pose = async (r) => { await page.evaluate(poseBody(r.pos, r.look)); };

const shot = async (name) => { await page.screenshot({ path: join(OUT, `${name}.png`) }); console.log(`shot ${name}`); };

const sample = async (label) => {
  const s = await page.evaluate(() => new Promise((resolve) => {
    const g = window.__game;
    const info = g.renderer.info.render;
    const t0 = performance.now();
    let frames = 0;
    const tick = () => {
      frames++;
      if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
      else resolve({ calls: info.calls, triangles: info.triangles, fps: Math.round(frames / 2) });
    };
    requestAnimationFrame(tick);
  }));
  console.log(`PERF ${label}: draws=${s.calls} tris=${s.triangles} fps=${s.fps} (software GL)`);
};

// --- before-mode: the shipped two-state law --------------------------------
if (process.env.BEFORE) {
  // golden hour (SKY.day, boot state)
  await page.evaluate(() => window.__game.applySimPhase(false));
  await page.waitForTimeout(600);
  for (const key of ['1-residential-day', '2-commercial-day', '6-vehicles-peds', '8-plaza-life', '7-distant-city']) {
    const r = RIGS[key];
    await pose(r);
    await page.waitForTimeout(500);
    await shot(`before-${key}`);
    await sample(`before-${key}`);
  }
  // dusk (the shipped startDusk tween — let it settle)
  await page.evaluate(() => window.__game.applySimPhase(true));
  await page.waitForTimeout(6500);
  for (const key of ['1-residential-day', '2-commercial-day', '5-windows-dusk']) {
    const r = RIGS[key];
    await pose(r);
    await page.waitForTimeout(500);
    await shot(`before-${key.replace(/-day$/, '-sunset')}`);
    await sample(`before-${key}`);
  }
} else {
  // --- after-mode: the full clock-driven cycle ------------------------------
  const STATES = [
    ['dawn', 6 * 60 + 30],
    ['midday', 13 * 60],
    ['evening', 17 * 60],
    ['dusk', 19 * 60 + 30],
    ['night', 22 * 60 + 30],
  ];
  for (const [name, minute] of STATES) {
    await page.evaluate((m) => window.__game.setClockTime(m), minute);
    await page.waitForTimeout(3500); // let the state lerp settle
    const keys = name === 'midday'
      ? ['1-residential-day', '2-commercial-day', '6-vehicles-peds', '8-plaza-life', '7-distant-city']
      : name === 'dusk'
        ? ['1-residential-day', '2-commercial-day', '3-street-sunset', '5-windows-dusk']
        : name === 'night'
          ? ['4-street-night', '5-windows-dusk', '7-distant-city']
          : ['1-residential-day', '2-commercial-day'];
    for (const key of keys) {
      const r = RIGS[key];
      await pose(r);
      await page.waitForTimeout(500);
      await shot(`after-${name}-${key.replace(/-(day|sunset)$/, '')}`);
      if (key === '2-commercial-day') await sample(`after-${name}`);
    }
  }
  // quality tiers on the same lens (perf matrix)
  await page.evaluate(() => window.__game.setClockTime(13 * 60));
  for (const tier of ['low', 'medium', 'high']) {
    await page.evaluate((t) => window.__game.applyGfxTier(t), tier);
    await page.waitForTimeout(1200);
    const r = RIGS['2-commercial-day'];
    await pose(r);
    await page.waitForTimeout(600);
    await sample(`tier-${tier}`);
  }
}

console.log(errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'ZERO page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
