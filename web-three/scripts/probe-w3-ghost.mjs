/**
 * W3 ghost gate (docs/45 §4) — the avenue faces, the landmark signs, and
 * the class-D backdrop walls, re-verified in-engine against
 * world-registry.json: collider envelopes < 0.1 m per ID, avenue walks in
 * the registry's own spines, and eye shots. docs/47 W3 records the two
 * entrance flips and the ghost-sign anchor correction.
 *
 * Usage: node scripts/probe-w3-ghost.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4609;
const GATE = 0.1;

// registry envelope per W3 ID: the min/max over the colliders that belong
// to it (multi-mass entries check the ENVELOPE — TEN-01's pair, KCM-01's
// base+upper, SND-01's band+upper, the VDN segments)
const REG = [
  ['TEN-01', -60, -50, -20, -8, 17],
  ['SRC-02', -60, -50, -32, -20, 15],
  ['KCM-01', -60, -48, 20, 32, 15],
  ['KTN-07', 48, 60, 20, 32, 15],
  ['SND-01', 50, 60, -20, -8, 13],
  ['SRC-01', 50, 60, -32, -20, 17],
  ['VDN-DW1a', -82, -74, 8, 32, 19],   // envelope: tallest slab 19
  ['VDN-DW1c', -82, -74, -32, -8, 21],
  ['VDN-DE1c', 74, 82, -32, -8, 22],   // x 78 built (the registry's own mirror law, docs/47)
  ['VDN-DN1', -60, 60, 48.5, 58.5, 15],
  ['VDN-DS1', -60, 60, -58.5, -48.5, 15],
];

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
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

const ghosts = await page.evaluate((REG) => {
  const boxes = window.__game.world.colliders;
  const out = {};
  for (const [id, x0, x1, z0, z1, hMax] of REG) {
    // the mass envelope: colliders fully inside the registry footprint —
    // ground-standing OR stacked (KCM-01/SND-01 are base+upper pairs)
    const inside = boxes.filter((b) =>
      b.minX >= x0 - 0.06 && b.maxX <= x1 + 0.06
      && b.minZ >= z0 - 0.06 && b.maxZ <= z1 + 0.06
      && b.maxY > 3); // real masses, not furniture chips
    const env = inside.length ? {
      x0: Math.min(...inside.map((b) => b.minX)), x1: Math.max(...inside.map((b) => b.maxX)),
      z0: Math.min(...inside.map((b) => b.minZ)), z1: Math.max(...inside.map((b) => b.maxZ)),
      h: Math.max(...inside.map((b) => b.maxY)), n: inside.length,
    } : null;
    out[id] = { env, want: { x0, x1, z0, z1, hMax } };
  }
  return out;
}, REG);

const fails = [];
console.log('=== W3 GHOST GATE (envelope-vs-registry, gate < 0.1 m) ===');
for (const [id] of REG) {
  const { env, want } = ghosts[id];
  if (!env) { fails.push(`${id}: no mass colliders inside the registry footprint`); continue; }
  const dx0 = Math.abs(env.x0 - want.x0), dx1 = Math.abs(env.x1 - want.x1);
  const dz0 = Math.abs(env.z0 - want.z0), dz1 = Math.abs(env.z1 - want.z1);
  const dh = Math.abs(env.h - want.hMax);
  const worst = Math.max(dx0, dx1, dz0, dz1, dh);
  console.log(`${id.padEnd(10)} n=${String(env.n).padStart(2)} dx=${Math.max(dx0, dx1).toFixed(3)} dz=${Math.max(dz0, dz1).toFixed(3)} dh=${dh.toFixed(3)}  ${worst < GATE ? 'PASS' : 'FAIL'}`);
  if (worst >= GATE) fails.push(`${id}: worst envelope delta ${worst.toFixed(3)}`);
}

// the landmark spot checks: the painted signs and the marquee exist
const marks = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const wanted = ['LMK05_Mural', 'LMK06_GhostSign', 'LMK07_Marquee', 'LMK04_Neon', 'LMK04_Roof', 'VND02_Sign'];
  const found = {};
  scene.traverse((o) => { if (wanted.includes(o.name)) found[o.name] = o.visible; });
  return { found, wanted };
});
console.log('=== LANDMARKS PRESENT ===');
for (const w of marks.wanted) {
  console.log(`${w.padEnd(16)} ${marks.found[w] ? 'PASS' : 'FAIL'}`);
  if (!marks.found[w]) fails.push(`landmark missing: ${w}`);
}

// the avenue walks: the registry spines x ±82.5, both directions, plus the
// Marlow walk past the corrected SRC doors
const walks = await page.evaluate(() => {
  const g = window.__game;
  const routes = {
    'Juniper W walk (x −82.5, full spine)': [
      [-82.5, -40], [-82.5, -20], [-82.5, 0], [-82.5, 20], [-82.5, 40], [-82.5, 46],
    ],
    'Sycamore E walk (x 82.5, full spine)': [
      [82.5, -40], [82.5, -20], [82.5, 0], [82.5, 20], [82.5, 40], [82.5, 46],
    ],
    'Sycamore W walk past the diner + stand (x 61.5)': [
      [61.5, -34], [61.5, -26], [61.5, -18], [61.5, -8], [61.5, 2],
    ],
    'Marlow N walk past the corrected doors (z −34.6)': [
      [-60, -34.6], [-55, -34.6], [-44, -34.6], [-20, -34.6], [0, -34.6], [20, -34.6],
    ],
  };
  const out = {};
  for (const [name, route] of Object.entries(routes)) {
    const p = g.player.capsule;
    p.x = route[0][0]; p.z = route[0][1]; p.y = 0.05;
    let minGround = 99; const log = [];
    for (const [tx, tz] of route.slice(1)) {
      for (let i = 0; i < 360; i++) {
        const dx = tx - p.x, dz = tz - p.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.5) break;
        const fx = dx / d, fz = dz / d;
        g.player.update(1 / 60, { x: -fx * 4.2, y: fz * 4.2 });
        g.world.update(1 / 60, p);
        minGround = Math.min(minGround, p.y);
      }
      const d = Math.hypot(tx - p.x, tz - p.z);
      if (d > 2.5) log.push(`stuck at (${p.x.toFixed(1)},${p.z.toFixed(1)}) → ${tx},${tz} (d=${d.toFixed(1)})`);
    }
    out[name] = { minGround, wedged: log.length > 0, log };
  }
  return out;
});
console.log('=== THE AVENUE WALKS ===');
for (const [name, w] of Object.entries(walks)) {
  console.log(`${name}\n    minGroundY=${w.minGround.toFixed(3)} wedged=${w.wedged}`);
  if (w.wedged) fails.push(`${name} wedged: ${w.log.join('; ')}`);
  if (w.minGround < -0.5) fails.push(`${name}: fell below the slab`);
}
console.log('PAGEERRORS', errors.length);

await page.evaluate(() => { window.__rig = true; });
const rigs = [
  ['w3-diner-corner', [40, 2.6, -2], [58, 2.2, -9]],
  ['w3-diner-neon', [64.5, 2.6, -4], [60.1, 2.4, -9.5]],
  ['w3-hall-marquee', [-64.5, 2.4, 22.5], [-59.9, 3.8, 26]],
  ['w3-tenement-slot', [-55, 2.2, -4.6], [-55, 4.5, -14]],
  ['w3-mural', [38, 2.2, -34], [38, 10, -20.2]],
  ['w3-ghost-sign', [4, 2.2, -2.5], [4, 5.6, -7.9]],
  ['w3-avenue-juniper', [-61.5, 4.6, 34], [-79, 1.4, 12]],
  ['w3-fruit-stand', [61.5, 1.7, -14.5], [63.3, 1, -18.2]],
  ['w3-ave-backdrop', [-70, 3.4, 2], [-80, 6, 20]],
];
for (const [name, pos, at] of rigs) {
  await page.evaluate(([p, a]) => {
    const g = window.__game;
    const c = g.player.capsule;
    c.x = a[0]; c.z = a[2]; c.y = 0.15;
    g.world.update(1 / 60, c);
    const r = g['renderer'];
    if (!window.__origRender) {
      window.__origRender = r.render.bind(r);
      r.render = (scene, camera) => {
        if (window.__rigCam) {
          camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
          camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
        }
        return window.__origRender(scene, camera);
      };
    }
    window.__rigCam = { pos: p, at: a };
  }, [pos, at]);
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log('SHOT', name);
}

if (fails.length) {
  console.log('GATE FAILS:');
  for (const f of fails) console.log(' -', f);
  process.exitCode = 1;
} else {
  console.log('W3 GHOST GATE: PASS — the avenues are places, the landmarks read');
}
writeFileSync(join(OUT, 'w3-ghost-report.json'), JSON.stringify({ fails, walks, landmarks: marks.found, errors }, null, 1));
await browser.close();
server.close();
