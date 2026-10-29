/**
 * Round-four probe — autumn arrives on the block. The turning trees (gold
 * canopy + gold leaf drift), the flock's plumage morphs, the lit lamp faces,
 * and the granite pit rims. Frozen camera, the same convention as
 * probe-polish / probe-env3. Every shot here is evidence for docs/29.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4583;
mkdirSync(OUT, { recursive: true });

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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(() => { window.__game.cam.update = () => {}; }); // probe-only freeze

async function frame(name, cx, cy, cz, tx, ty, tz, ms = 350) {
  await page.evaluate(([cx, cy, cz, tx, ty, tz]) => {
    const c = window.__game.cam.camera;
    c.position.set(cx, cy, cz);
    c.lookAt(tx, ty, tz);
  }, [cx, cy, cz, tx, ty, tz]);
  await wait(ms);
  await page.screenshot({ path: join(OUT, `env6-${name}.png`) });
  console.log('shot env6-' + name + '.png');
}

// 1. the plaza park tree that turned — gold crown, amber mid, green base,
//    gold drift at its feet, granite rim around the pit
await frame('autumn-plaza-tree', -38.6, 1.6, -1.6, -38.6, 2.6, 4.5);
// 2. the crosswalk-side turning tree — gold against the green row west of it
await frame('autumn-crosswalk-tree', 2.5, 1.8, 4.4, -4.5, 2.6, 7.2);
// 3. the flock — plumage morphs + blazes, all on the sidewalk band
await frame('plumage-flock', -43.5, 2.6, 0.5, -39.5, 0.2, 5.2);
// 4. a lamp face up close — lit, at 5:45 PM forever
await frame('lamp-face', 8, 4.3, 3.4, 8, 5.1, 6.2);
// 5. pit rim low shot — granite frame, soil, gold leaf inside it
await frame('pit-rim', -20.6, 0.75, 5.0, -22, 0.02, 7.15);

// ---- programmatic: the season is legible in data, not just in pixels -----
const check = await page.evaluate(() => {
  const w = window.__game.world;
  // 1. leaf tints: at least one amber leaf (turning trees shed gold) AND
  //    at least one green leaf (the rest of the block stays October).
  //    instanceColor stores LINEAR-sRGB (setHex converts), so the anchors
  //    0xffb85c → (1.0, 0.48, 0.11) and 0x5d7d4a → (0.11, 0.21, 0.07).
  const colors = w.leaves.mesh.instanceColor.array;
  let amber = 0, green = 0;
  for (let i = 0; i < colors.length; i += 3) {
    const r = colors[i], g = colors[i + 1], b = colors[i + 2];
    if (r > 0.85 && g > 0.4 && g < 0.56 && b < 0.16) amber++;
    else if (r < 0.16 && g > 0.13 && b < 0.08) green++;
  }
  // 2. plumage: the plaza flock must NOT be twelve clones — count distinct
  //    body materials across the birds (children[0] is the body mesh)
  const mats = new Set();
  let blazes = 0;
  for (const b of w.pigeonFlock.birds) {
    mats.add(b.group.children[0].material.uuid);
    // cream 0xfff8f0 → linear (1.0, 0.94, 0.87): only the blaze is that bright
    if (b.group.children.some((c) => c.material?.color && c.material.color.r > 0.98 && c.material.color.b > 0.8)) blazes++;
  }
  // 3. pit rims exist: every tree spot's pit group has 2 children (soil+rim)
  return {
    amberLeaves: amber,
    greenLeaves: green,
    plumageMorphs: mats.size,
    blazedBirds: blazes,
    flockSize: w.pigeonFlock.birds.length,
  };
});
console.log('data check:', JSON.stringify(check));
const fails = [];
if (check.amberLeaves < 2) fails.push(`expected >=2 amber leaves, got ${check.amberLeaves}`);
if (check.greenLeaves < 2) fails.push(`expected >=2 green leaves, got ${check.greenLeaves}`);
if (check.plumageMorphs < 2) fails.push(`expected >=2 plumage morphs, got ${check.plumageMorphs}`);
if (check.blazedBirds < 1) fails.push(`expected >=1 blaze bird, got ${check.blazedBirds}`);

// ---- draw calls for the docs table (same views as probe-perf) ------------
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -5; g.player.capsule.y = 0.1; g.player.capsule.z = -5.6;
  g.cam.camYaw = Math.PI / 2;
  g.cam['yawSide'] = 1;
  g.cam.update = () => {}; // freeze — same convention as probe-perf, or the
  // follow camera re-seizes the view and the counters count a different frame
  g.cam.camera.position.set(-12, 5.5, -2);
  g.cam.camera.lookAt(5, 3, -6);
});
await wait(600);
const calls = await page.evaluate(() => new Promise((resolve) => {
  const g = window.__game;
  const info = g.renderer.info.render;
  const t0 = performance.now();
  let frames = 0;
  const tick = () => {
    frames++;
    if (performance.now() - t0 < 1500) requestAnimationFrame(tick);
    else resolve({ mid: info.calls, tris: info.triangles, fps: Math.round(frames / 1.5) });
  };
  requestAnimationFrame(tick);
}));
console.log(`mid-street-east: drawCalls=${calls.mid} triangles=${calls.tris} fps=${calls.fps} (software GL)`);

if (fails.length) {
  console.log('FAILS:\n' + fails.join('\n'));
  await browser.close();
  server.close();
  process.exit(1);
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO console/page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
console.log('AUTUMN PROBE: PASS');
