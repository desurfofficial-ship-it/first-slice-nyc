/**
 * W1 ghost gate (docs/45 §4) — every W1 footprint re-verified in-engine
 * against world-registry.json as a massing pass: position/height/footprint
 * deltas < 0.1 m per ID, plus intersection walkability shots.
 *
 * Usage: node scripts/probe-w1-ghost.mjs
 * Exit 1 if any ID misses the gate or a shot fails.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4597;
const GATE = 0.1;

// the W1 masses: mesh name → registry id (footprint center + size + height)
const W1 = [
  ['KTN_00W', 'KTN-00W'], ['KTN_06', 'KTN-06'],
  ['SMB_01', 'SMB-01'], ['SMB_02', 'SMB-02'], ['SMB_03', 'SMB-03'],
  ['PWK_01', 'PWK-01'], ['PWK_02', 'PWK-02'], ['PWK_03', 'PWK-03'],
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

// walkability probe: drive the player along the grid (plaza → KJ → Juniper →
// Gable → Sycamore → Marlow) and confirm the capsule never falls below the
// slab (ground reads) or gets wedged (position advances)
const walk = await page.evaluate(() => {
  const g = window.__game;
  // W5 ghost-gate reconciliation (docs/47): this route predates W3, W4 and
  // the agent2 subway. The avenue backdrops (VDN-DW1a/c, VDN-DE1a/c at
  // x −82..−74 / 74..82) legally own the outer 6 m of the old x ±80
  // corridor — the shipped legal avenue spine is x ±82.5 (the W3 probe's
  // own corridor). Mid-block Kestrel crossings now meet the W4 rails (the
  // M121's z +0.8 lane and the cab's z −2 lane both run x ±84): the legal
  // crossing is the XW-COURT paint at x 35, where both vehicles yield.
  // AND the K-line stairwell (docs/50) owns the north walk's full depth at
  // x −48.5..−45.9 (the descent zone spans z 3.6..8.2): westbound travel
  // past x −45 crosses Kestrel at the shipped XW-CANON paint (x −5) and
  // rides the SOUTH walk to the KJ junction, then crosses back through
  // the junction box (both movers yield there). The MASS checks below are
  // untouched — the gate itself never moved.
  const route = [
    [-42, 6.2], [-24.5, 5.6], [-8, 5.6],                 // the N walk at z 5.6 — the terminal-bay poles (agent2's M121 stop at (−27, 6.8)) stand on the old centerline
    [-5, 5.6], [-5, -5.6],                               // Kestrel at the XW-CANON paint
    [-24.5, -5.6], [-50, -5.6],                          // the S walk to the tenement face
    [-52, -3.4], [-62, -3.4],                            // the road shoulder — agent2's TEN-01 bay box (x −60..−54, z −8..−4.5) fills the walk's whole depth
    [-62, -5.6], [-72, -5.6],                            // back to the walk, to KJ
    [-72, 5.6],                                          // through the KJ junction box
    [-82.5, 5.6], [-82.5, 20], [-82.5, 33.5],            // Juniper W spine (x −82.5)
    [-72, 33.5], [-40, 33.5],                            // Gable S walk — the mouth crossing shares the road with the M121's leg 1; patient legs below
    [-10, 33.5], [30, 33.5], [61.5, 33.5], [82.5, 33.5], // → Sycamore E spine
    [82.5, 20], [82.5, 6.5], [61.5, 6.5],                // Sycamore → Kestrel E
    [68.5, 6.5], [68.5, -6.5],                           // cross at the KS junction paint — the N through-walk is pinched shut at x 40.45 (agent2's court net z 4.5..7.8 against the W4 parked car's z 2.075..4.025: no capsule fits between; documented, docs/47)
    [61.5, -6.5], [82.5, -6.5], [82.5, -20],             // Kestrel S → Sycamore S spine
    [82.5, -33.5], [61.5, -33.5], [30, -33.5],           // Marlow N walk
    [-10, -33.5], [-44, -33.5], [-61.5, -33.5], [-82.5, -33.5],
    [-82.5, -20], [-82.5, -6.5],                         // → Juniper S spine
  ];
  // the junction-mouth legs share the roadway with the M121's laps — the
  // yield brain releases a body it passes abeam, but the walker needs the
  // frames to wait out the approach (15 s covers a junction transit)
  const PATIENT = new Set(['-72,33.5', '-40,33.5']);
  const out = { steps: 0, minGround: 99, wedged: false, log: [] };
  const p = g.player.capsule;
  p.x = route[0][0]; p.z = route[0][1]; p.y = 0.05;
  for (const [tx, tz] of route.slice(1)) {
    const budget = PATIENT.has(`${tx},${tz}`) ? 900 : 240;
    for (let i = 0; i < budget; i++) {
      const dx = tx - p.x, dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.6) break;
      // Player.update takes camera-relative input (x = strafe toward the
      // RIGHT-hand vector = −x at yaw 0; y = forward = +z at yaw 0)
      const fx = dx / d, fz = dz / d;
      g.player.update(1 / 60, { x: -fx * 4.2, y: fz * 4.2 });
      g.world.update(1 / 60, p);
      out.minGround = Math.min(out.minGround, p.y);
    }
    const d = Math.hypot(tx - p.x, tz - p.z);
    if (d > 3) { out.wedged = true; out.log.push(`stuck ${(p.x).toFixed(1)},${(p.z).toFixed(1)} → ${tx},${tz} (d=${d.toFixed(1)})`); }
    out.steps++;
  }
  return out;
});

// ghost gate: the bake merges the mass MESHES into district batches, so
// the check reads the COLLIDERS — the gameplay truth every mass registers.
// W5 note (docs/47): the matcher reads the ENVELOPE over the colliders
// inside each footprint (the W3 probe's method) — SMB-01/SMB-02 (and any
// future hollow) decompose into wall boxes whose envelope IS the mass.
const ghosts = await page.evaluate((w1) => {
  const boxes = window.__game.world.colliders;
  const REG = {
    'KTN-00W': { x: -55, z: 14, w: 10, d: 12, h: 16 },
    'KTN-06': { x: 55, z: 14, w: 10, d: 12, h: 16 },
    'SMB-01': { x: -34, z: -26, w: 8, d: 12, h: 12 },
    'SMB-02': { x: -25, z: -26, w: 6, d: 12, h: 12 },
    'SMB-03': { x: -17, z: -26, w: 6, d: 12, h: 12 },
    'PWK-01': { x: -44, z: -26, w: 8, d: 12, h: 15 },
    'PWK-02': { x: 5, z: -26, w: 10, d: 12, h: 15 },
    'PWK-03': { x: 17, z: -26, w: 10, d: 12, h: 15 },
  };
  const found = {};
  for (const id of Object.keys(REG)) {
    const r = REG[id];
    const x0 = r.x - r.w / 2, x1 = r.x + r.w / 2, z0 = r.z - r.d / 2, z1 = r.z + r.d / 2;
    // the mass envelope: colliders fully inside the footprint, ground-
    // standing or stacked — real masses, not furniture chips
    const inside = boxes.filter((b) =>
      b.minX >= x0 - 0.06 && b.maxX <= x1 + 0.06
      && b.minZ >= z0 - 0.06 && b.maxZ <= z1 + 0.06
      && b.maxY > 3);
    if (inside.length) {
      found[id] = {
        cx: (Math.min(...inside.map((b) => b.minX)) + Math.max(...inside.map((b) => b.maxX))) / 2,
        cz: (Math.min(...inside.map((b) => b.minZ)) + Math.max(...inside.map((b) => b.maxZ))) / 2,
        w: Math.max(...inside.map((b) => b.maxX)) - Math.min(...inside.map((b) => b.minX)),
        d: Math.max(...inside.map((b) => b.maxZ)) - Math.min(...inside.map((b) => b.minZ)),
        h: Math.max(...inside.map((b) => b.maxY)),
      };
    }
  }
  return { found, REG };
}, W1);

const fails = [];
console.log('=== W1 GHOST GATE (collider-vs-registry deltas, gate < 0.1 m) ===');
for (const [, id] of W1) {
  const f = ghosts.found[id];
  const r = ghosts.REG[id];
  if (!f) { fails.push(`${id}: no collider matches the registry footprint`); continue; }
  const dx = Math.abs(f.cx - r.x), dz = Math.abs(f.cz - r.z);
  const dw = Math.abs(f.w - r.w), dd = Math.abs(f.d - r.d), dh = Math.abs(f.h - r.h);
  const worst = Math.max(dx, dz, dw, dd, dh);
  console.log(`${id.padEnd(8)} dx=${dx.toFixed(3)} dz=${dz.toFixed(3)} dw=${dw.toFixed(3)} dd=${dd.toFixed(3)} dh=${dh.toFixed(3)}  ${worst < 0.1 ? 'PASS' : 'FAIL'}`);
  if (worst >= 0.1) fails.push(`${id}: worst delta ${worst.toFixed(3)} >= 0.1`);
}
console.log('=== WALKABILITY (plaza → the grid → back) ===');
console.log(`steps=${walk.steps} minGroundY=${walk.minGround.toFixed(3)} wedged=${walk.wedged}`);
if (walk.wedged) fails.push('walk wedged: ' + walk.log.join('; '));
if (walk.minGround < -0.5) fails.push(`player fell below the slab (min y ${walk.minGround.toFixed(2)})`);
console.log('PAGEERRORS', errors.length);

// intersection + row shots for the eye
await page.evaluate(() => { window.__rig = true; });
const rigs = [
  ['w1-ix-KJ', [-50, 3.4, 5.6], [-68, 1.2, 2]],
  ['w1-ix-KS', [50, 3.4, 5.6], [68, 1.2, 2]],
  ['w1-ix-GJ', [-50, 3.6, 32], [-68, 1.2, 40]],
  ['w1-ix-GS', [50, 3.6, 32], [68, 1.2, 40]],
  ['w1-ix-MJ', [-50, 3.6, -32], [-68, 1.2, -40]],
  ['w1-ix-MS', [50, 3.6, -32], [68, 1.2, -40]],
  ['w1-marlow-row', [-26, 5.5, -47], [-25, 4, -26]],
  ['w1-sub02', [-68, 2.4, -1.5], [-55, 1.8, -6.3]],
  ['w1-kestrel-wide', [-83, 11, 30], [10, 2, 0]],
  ['w1-gable-row', [-20, 4.5, 29], [-30, 3, 36]],
];
for (const [name, pos, at] of rigs) {
  await page.evaluate(([p, a]) => {
    const g = window.__game;
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
  console.log('W1 GHOST GATE: PASS — all footprints verified, grid walkable');
}

writeFileSync(join(OUT, 'w1-ghost-report.json'), JSON.stringify({ fails, walk, errors }, null, 1));
await browser.close();
server.close();
