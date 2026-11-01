/**
 * W2 ghost gate (docs/45 §4) — the Gable row, both interior parks, and the
 * two shortcuts, re-verified in-engine against world-registry.json:
 * position/height/footprint deltas < 0.1 m per ID, the shortcut walks
 * end-to-end (R-ALLEY, R-GARDEN, the playground gate, the stoop lane), and
 * eye shots. docs/47 W2 records the three registry corrections this phase
 * made (garden slot x 6.5..9, garden gate east, playground gate south).
 *
 * Usage: node scripts/probe-w2-ghost.mjs
 * Exit 1 if any ID misses the gate or a walk wedges.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4599;
const GATE = 0.1;

// the W2 masses: registry id → footprint (center + size + height)
const REG = {
  'GRB-01': { x: -42.6, z: 26, w: 7.6, d: 12, h: 12.5 },
  'GRB-02': { x: -35, z: 26, w: 7.6, d: 12, h: 12.5 },
  'GRB-03': { x: -27.4, z: 26, w: 7.6, d: 12, h: 12.5 },
  'GRB-04': { x: -19.8, z: 26, w: 7.6, d: 12, h: 12.5 },
  'GRB-05': { x: -12.2, z: 26, w: 7.6, d: 12, h: 12.5 },
  'ALY-02': { x: 7.75, z: 14, w: 2.5, d: 12, h: null }, // a slot — checked as a NEGATIVE (no collider inside)
  'KTN-02': { x: -2.25, z: 14, w: 17.5, d: 12, h: 18 }, // the cut mass (validator carries the same truth)
};

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

// ---------- ghost gate: collider-vs-registry deltas (< 0.1 m) ----------
const ghosts = await page.evaluate((REG) => {
  const boxes = window.__game.world.colliders;
  const found = {};
  for (const id of Object.keys(REG)) {
    const r = REG[id];
    if (r.h === null) continue; // the slot is verified by walking it, below
    const hit = boxes.find((b) =>
      Math.abs((b.minX + b.maxX) / 2 - r.x) < 0.05
      && Math.abs((b.minZ + b.maxZ) / 2 - r.z) < 0.05
      && Math.abs(b.maxX - b.minX - r.w) < 0.05
      && Math.abs(b.maxZ - b.minZ - r.d) < 0.05
      && Math.abs(b.maxY - r.h) < 0.05);
    if (hit) found[id] = { cx: (hit.minX + hit.maxX) / 2, cz: (hit.minZ + hit.maxZ) / 2, w: hit.maxX - hit.minX, d: hit.maxZ - hit.minZ, h: hit.maxY };
  }
  // furniture spot checks: [label, minX, maxX, minZ, maxZ] — the parks must
  // be furnished AND colliding (the doc 35 lesson: furniture collides)
  const wants = [
    ['garden N fence', -8.4, 4, 29.925, 30.075],
    ['garden bed', -8.2, -7, 22.2, 23.8],
    ['garden shed', 1, 3, 27.3, 29.7],
    ['green pergola post', 21.33, 21.57, 26.18, 26.42],
    ['green bench', 11.075, 12.925, 22.19, 22.81],
    ['playground W fence', -12.075, -11.925, -31, -21],
    ['playground E fence', -2.075, -1.925, -31, -21],
    ['sandbox rim', -6.5, -2.5, -29.07, -28.93],
    ['spray basin', -8.55, -5.45, -25.85, -22.75],
    ['swing leg', -11.45, -10.75, -28.75, -28.25],
    ['GRB03 scaffold pole', -29.29, -29.11, 32.21, 32.39],
  ];
  const furniture = {};
  for (const [label, x0, x1, z0, z1] of wants) {
    furniture[label] = boxes.some((b) =>
      Math.abs(b.minX - x0) < 0.06 && Math.abs(b.maxX - x1) < 0.06
      && Math.abs(b.minZ - z0) < 0.06 && Math.abs(b.maxZ - z1) < 0.06);
  }
  return { found, furniture };
}, REG);

const fails = [];
console.log('=== W2 GHOST GATE (collider-vs-registry deltas, gate < 0.1 m) ===');
for (const id of Object.keys(REG)) {
  const r = REG[id];
  if (r.h === null) { console.log(`${id.padEnd(8)} (slot — walk-verified below)`); continue; }
  const f = ghosts.found[id];
  if (!f) { fails.push(`${id}: no collider matches the registry footprint`); continue; }
  const dx = Math.abs(f.cx - r.x), dz = Math.abs(f.cz - r.z);
  const dw = Math.abs(f.w - r.w), dd = Math.abs(f.d - r.d), dh = Math.abs(f.h - r.h);
  const worst = Math.max(dx, dz, dw, dd, dh);
  console.log(`${id.padEnd(8)} dx=${dx.toFixed(3)} dz=${dz.toFixed(3)} dw=${dw.toFixed(3)} dd=${dd.toFixed(3)} dh=${dh.toFixed(3)}  ${worst < GATE ? 'PASS' : 'FAIL'}`);
  if (worst >= GATE) fails.push(`${id}: worst delta ${worst.toFixed(3)} >= ${GATE}`);
}
console.log('=== FURNITURE COLLIDERS (parks are furnished, not painted) ===');
for (const [label, ok2] of Object.entries(ghosts.furniture)) {
  console.log(`${label.padEnd(20)} ${ok2 ? 'PASS' : 'FAIL'}`);
  if (!ok2) fails.push(`furniture missing: ${label}`);
}

// ---------- the shortcut walks ----------
const walks = await page.evaluate(() => {
  const g = window.__game;
  const routes = {
    'R-ALLEY (Kestrel → lane → green → Gable gate)': [
      [32.1, 6.5], [32.6, 7.9], [32.1, 10], [32.1, 16], [32.1, 19],
      [30, 24], [24, 27], [18, 29], [18, 31], [18, 33.5],
    ],
    'R-GARDEN (Kestrel → slot → green → garden gate → beds)': [
      [7.75, 6.5], [7.75, 10], [7.75, 15], [7.75, 19], [9, 21.5],
      [7, 23.5], [5.5, 24], [3, 24], [-1, 24], [-5.5, 24.6],
    ],
    'playground (Marlow → gate → kit → back)': [
      [-7, -33.5], [-7, -31], [-7, -28], [-3.9, -24], [-7, -22.2], [-7, -28], [-7, -33.5],
    ],
    'the stoop lane (Gable walk past all five stoops)': [
      [-50, 35], [-42.6, 35], [-35, 35], [-27.4, 35], [-19.8, 35], [-12.2, 35], [-8, 35],
    ],
  };
  const out = {};
  for (const [name, route] of Object.entries(routes)) {
    const p = g.player.capsule;
    p.x = route[0][0]; p.z = route[0][1]; p.y = 0.05;
    let minGround = 99; const log = [];
    let steps = 0;
    for (const [tx, tz] of route.slice(1)) {
      for (let i = 0; i < 300; i++) {
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
      steps++;
    }
    out[name] = { steps, minGround, wedged: log.length > 0, log };
  }
  return out;
});
console.log('=== THE SHORTCUTS, WALKED END-TO-END ===');
for (const [name, w] of Object.entries(walks)) {
  console.log(`${name}\n    steps=${w.steps} minGroundY=${w.minGround.toFixed(3)} wedged=${w.wedged}`);
  if (w.wedged) fails.push(`${name} wedged: ${w.log.join('; ')}`);
  if (w.minGround < -0.5) fails.push(`${name}: fell below the slab (min y ${w.minGround.toFixed(2)})`);
}
console.log('PAGEERRORS', errors.length);

// ---------- eye shots ----------
await page.evaluate(() => { window.__rig = true; });
const rigs = [
  ['w2-gable-row', [-18, 3.2, 47], [-33, 5.5, 30]],
  ['w2-kestrel-green', [26, 8.5, 17.5], [15, 1.5, 27]],
  ['w2-garden-slot', [7.75, 1.6, 5.6], [7.75, 1.2, 14]],
  ['w2-garden', [5.5, 4, 21.5], [-4, 1, 26]],
  ['w2-playground', [-7, 1.7, -32.5], [-9.5, 0.9, -27.5]],
  ['w2-alley-lane', [32.1, 1.6, 8.2], [32.1, 1.2, 16]],
  ['w2-parking-strip', [34, 4.5, 18], [43, 0.5, 25]],
];
for (const [name, pos, at] of rigs) {
  await page.evaluate(([p, a]) => {
    const g = window.__game;
    // stand the player at the rig's own ground so the district ring lights
    // the tiles the shot needs (the walks above end far away, and the ring
    // honestly culls what the player left behind)
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
  console.log('W2 GHOST GATE: PASS — the row stands, the parks are furnished, the shortcuts walk');
}
writeFileSync(join(OUT, 'w2-ghost-report.json'), JSON.stringify({ fails, walks, furniture: ghosts.furniture, errors }, null, 1));
await browser.close();
server.close();
