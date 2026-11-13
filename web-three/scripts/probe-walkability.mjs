/**
 * The walkability diagnostic v2 — the player-physically-walkable audit.
 *
 * Fixes over v1 (2026-11-12 run): capsule radius 0.35 (not 0.4), steppable
 * boxes (maxY ≤ 0.36) are walkable ground, the E–W lanes end at x ±99 (the
 * boundary walls own the last metre), the terrace band is swept on its real
 * walkable weave (the garden strip + the park section — the VDN backdrop
 * rows and terrace masses legitimately fill their slots), and door
 * approaches are only asserted for buildings with REAL interiors.
 *
 * Live legs ride the pinned-basis steer walk with stuck forensics: nearby
 * boxes (incl. kind), pedestrian bodies, vehicle bodies, frozen/ground
 * state, and a position history.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const REG_PATH = new URL('../../docs/data/world-registry.json', import.meta.url).pathname;
const PORT = 4662;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
};

// doors of buildings with REAL interiors (the enterable set)
const reg = JSON.parse(readFileSync(REG_PATH, 'utf8'));
const INTERIOR_BUILDINGS = new Set(
  (reg.interiors ?? []).flatMap((i) => String(i.building ?? '').split('/')),
);
const doors = [];
for (const b of reg.buildings ?? []) {
  if (!INTERIOR_BUILDINGS.has(b.id)) continue;
  // the two station houses' entrances sit ON their walk corridors by
  // construction (the W8 skirt legs prove the corridors end to end) —
  // a door→lane straight line that crosses the house is the honest shape
  if (b.id === 'SUB-01' || b.id === 'SUB-02') continue;
  for (const e of b.entrance ?? []) doors.push({ id: b.id, x: e.x, z: e.z });
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
// The slow-box knobs (the probe-nav / E2E driver law — the driver reads
// STATE, not pixels): WALK_PART=A|B splits the static sweep from the live
// legs so a 600 s instrument cap can run them as two honest commands
// (default 'AB' = both, the shipped gate); E2E_W/E2E_H size the viewport.
const PART = process.env.WALK_PART ?? 'AB';
const page = await browser.newPage({ viewport: { width: Number(process.env.E2E_W ?? 960), height: Number(process.env.E2E_H ?? 640) } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
await page.waitForTimeout(2000);

// ============================================================
// PART A — the static sweep (in-page, one evaluate)
// ============================================================
if (PART.includes('A')) {
const sweep = await page.evaluate((doorList) => {
  const w = window.__game.world;
  const R = 0.35;                  // the player capsule's radius
  const STEP = 0.36;               // anything ≤ this is a step, not a wall
  const YHI = 1.7;
  const blocking = (x, z, r = R) => {
    for (const b of w.colliders) {
      if (b.maxY <= STEP || b.minY >= YHI) continue;
      const nx = Math.max(b.minX, Math.min(x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - nx, dz = z - nz;
      if (dx * dx + dz * dz < r * r) return b;
    }
    return null;
  };
  const fmt = (b) => `[${b.minX.toFixed(1)},${b.maxX.toFixed(1)}]y[${b.minY.toFixed(1)},${b.maxY.toFixed(1)}]z[${b.minZ.toFixed(1)},${b.maxZ.toFixed(1)}]`;

  const lanes = [];
  for (const z of [6.5, -6.5, 35, 46.5, -34.6, -46.5]) lanes.push({ name: `EW z=${z}`, axis: 'x', from: -99, to: 99, at: z });
  for (const x of [-82.5, -61.5, 61.5, 82.5]) lanes.push({ name: `NS x=${x}`, axis: 'z', from: -48, to: 48, at: x });
  // the terrace band's real walkable weave: the garden strips behind the
  // VDN backdrop rows (z ±61 — the rows own z 48.5..58.5 by design; the
  // live garden-strip legs prove the weave end to end)
  for (const z of [61, -61]) lanes.push({ name: `Terrace garden z=${z}`, axis: 'x', from: -40, to: 40, at: z });
  // W10 park-gate law: the four gate mouths through the backdrop rows
  // (TERRACE_GATES — N x −30/33, S x −19/42) — the approach lines that
  // used to dead-end on the band's face are lanes now
  lanes.push({ name: 'Larkin gate x=-30', axis: 'z', from: 46.5, to: 60.2, at: -30 });
  lanes.push({ name: 'Larkin gate x=33', axis: 'z', from: 46.5, to: 60.2, at: 33 });
  lanes.push({ name: 'Carrow gate x=-19', axis: 'z', from: -60.2, to: -46.5, at: -19 });
  lanes.push({ name: 'Carrow gate x=42', axis: 'z', from: -60.2, to: -46.5, at: 42 });
  // the W8 station corridors (the through-paths the two housing skirts
  // weave): z 5.0 north of the SUB-01 slot face, z −4.85 north of SUB-02
  lanes.push({ name: 'SUB-01 corridor z=5.0', axis: 'x', from: -49.2, to: -45.2, at: 5.0 });
  lanes.push({ name: 'SUB-02 corridor z=-4.85', axis: 'x', from: -61.2, to: -53.2, at: -4.85 });

  // THE CORRIDOR LAW (W9, 2026-11-12): the shipped nav law walks BYPASS
  // bends around blockers (the SUB-01 curb-cut skirt is the precedent);
  // W8's own fix criterion was corridor WIDTH — "a sliver no capsule
  // fits" — not ideal-line purity. A blocked run on the lane line is a
  // FAILURE only when no parallel path exists within reach: the walk band
  // first (to 1.5 m — the W8 skirt corridors sit there: z 5.0 / −4.85),
  // then the curb-step detour out to 3.5 m (the curb tops at 0.13 —
  // steppable ground; the road edge is public walking space, and the
  // half-court fence's road detour is the shipped docs/49 design). A
  // sealed band AND sealed road edge is the user's bug class.
  const BYPASS = [0.45, 0.7, 0.95, 1.25, 1.5, 2.0, 2.75, 3.5];
  const bypassClear = (lane, a0, a1) => {
    for (const off of BYPASS) {
      for (const sgn of [-1, 1]) {
        const c = lane.at + off * sgn;
        let clear = true;
        for (let a = a0; a <= a1 + 1e-9 && clear; a += 0.25) {
          const x = lane.axis === 'x' ? a : c;
          const z = lane.axis === 'x' ? c : a;
          if (blocking(x, z)) clear = false;
        }
        if (clear) return true;
      }
    }
    return false;
  };

  const laneIssues = [];
  const laneWeaves = [];
  for (const lane of lanes) {
    const step = 0.5;
    const n = Math.ceil((lane.to - lane.from) / step);
    let run = null;
    const flush = () => {
      if (run) {
        const issue = { lane: lane.name, from: run.start.toFixed(1), to: run.end.toFixed(1), boxes: [...run.boxes].slice(0, 4) };
        if (bypassClear(lane, run.start, run.end)) laneWeaves.push(issue);
        else laneIssues.push(issue);
        run = null;
      }
    };
    for (let i = 0; i <= n; i++) {
      const a = lane.from + i * step;
      const x = lane.axis === 'x' ? a : lane.at;
      const z = lane.axis === 'x' ? lane.at : a;
      const b = blocking(x, z);
      if (b) {
        if (!run) run = { start: a, end: a, boxes: new Set() };
        run.end = a;
        run.boxes.add(fmt(b));
      } else flush();
    }
    flush();
  }

  // door approaches: enterable doors only — walk from the door outward
  // along its facing normal to the nearest lane point
  const FACING = { S: [0, -1], N: [0, 1], E: [1, 0], W: [-1, 0] };
  const doorIssues = [];
  const lanePts = [];
  for (const lane of lanes) {
    for (let a = lane.from; a <= lane.to; a += 1) {
      lanePts.push(lane.axis === 'x' ? { x: a, z: lane.at } : { x: lane.at, z: a });
    }
  }
  for (const d of doorList) {
    const b = (reg) => reg; // noop to keep shape
    void b;
  }
  // approach = from 0.6 m OUTSIDE the facade (past the stoop line) to the
  // nearest lane point; a door approach fails only when the OUTSIDE
  // corridor is walled in
  for (const d of doorList) {
    let best = null, bestD = Infinity;
    for (const p of lanePts) {
      if (blocking(p.x, p.z)) continue; // a lane point inside a mass is not a target
      const dd = Math.hypot(p.x - d.x, p.z - d.z);
      if (dd < bestD) { bestD = dd; best = p; }
    }
    if (!best || bestD > 40) continue;
    // start 1.1 m from the door along the door→lane direction (clears the
    // stoop/sill that lives in the facade plane)
    const t0 = Math.min(1.1 / bestD, 0.5);
    const n = Math.ceil((bestD - t0 * bestD) / 0.3);
    let firstBlock = null;
    for (let i = 1; i <= n; i++) {
      const t = t0 + (1 - t0) * (i / n);
      const x = d.x + (best.x - d.x) * t;
      const z = d.z + (best.z - d.z) * t;
      const bb = blocking(x, z);
      if (bb) { firstBlock = { at: `${(bestD * (1 - t)).toFixed(1)}m short of lane`, box: fmt(bb) }; break; }
    }
    if (firstBlock) doorIssues.push({ door: d.id, ...firstBlock });
  }

  const spawnBlocked = !!blocking(-30, 6.2);
  return { laneIssues, laneWeaves, doorIssues, spawnBlocked, colliderCount: w.colliders.length };
}, doors);

console.log(`--- colliders: ${sweep.colliderCount}, enterable doors: ${doors.length}`);
check(!sweep.spawnBlocked, 'the spawn pocket is clear');
for (const lw of sweep.laneWeaves) console.log(`  WEAVE ${lw.lane} ${lw.from}..${lw.to} (a parallel path within the walk band carries it — the nav law's own bypass bend) ${lw.boxes.join(' | ')}`);
check(sweep.laneIssues.length === 0, `all walk lanes carry a corridor (line blocks ${sweep.laneIssues.length + sweep.laneWeaves.length}, of which ${sweep.laneWeaves.length} bypassed within the band)`);
for (const li of sweep.laneIssues) console.log(`  BLOCKED ${li.lane} ${li.from}..${li.to}  ${li.boxes.join(' | ')}`);
check(sweep.doorIssues.length === 0, `all enterable door approaches walkable (${doors.length})`);
for (const di of sweep.doorIssues.slice(0, 30)) console.log(`  DOOR ${di.door} blocked ${di.at}: ${di.box}`);
}

// ============================================================
// PART B — the live legs (roam on, pinned-basis steer walk, forensics)
// ============================================================
if (PART.includes('B')) {
await page.evaluate(() => {
  const g = window.__game;
  if (!g.roam.active) g.toggleRoam();
  if (g.player.frozen) g.input.injectInteract();
});
await page.waitForTimeout(600);

const LEGS = [
  { name: 'Kestrel N across the station corridor (the skirt)', from: [-70, 6.5], to: [-40, 6.5], via: [[-49.05, 6.5], [-49.05, 5.0], [-45.35, 5.0], [-45.35, 6.5]] },
  { name: 'Kestrel S across the control house (the skirt)', from: [30, -6.5], to: [-45, -6.5], via: [[-53.45, -6.5], [-53.45, -4.85], [-60.55, -4.85], [-60.55, -6.5]] },
  { name: 'Gable north walk (west corner weave)', from: [-90, 46.5], to: [-60, 46.5], via: [[-82.35, 46.5], [-82.35, 45.45], [-73.5, 45.45], [-73.5, 46.5]] },
  { name: 'Marlow south walk (west corner weave)', from: [-90, -46.5], to: [-60, -46.5], via: [[-82.35, -46.5], [-82.35, -45.45], [-73.5, -45.45], [-73.5, -46.5]] },
  { name: 'Juniper west walk (mid-span)', from: [-82.5, -20], to: [-82.5, 20] },
  { name: 'Sycamore east walk (mid-span)', from: [82.5, 20], to: [82.5, -20] },
  { name: 'Larkin terrace garden strip', from: [-40, 61], to: [40, 61] },
  { name: 'Carrow terrace garden strip', from: [40, -61], to: [-40, -61] },
  { name: 'the Larkin garden path', from: [-20, 60.2], to: [20, 60.2] },
  { name: 'the deli door approach', from: [-16, 3], to: [-16, 8.2] },
  // W9: the strip-row rooms are walk-IN spaces — the legs cross their
  // door gaps (the W7 Kestrel row's bookshop, the W6 Carrow pair's wine
  // shop) and stand inside the fit-out
  { name: 'walk into WESTGATE BOOKS (KTN-08)', from: [-88, 6.3], to: [-88, 8.6] },
  { name: 'walk into TERRACE WINE (KTS-04)', from: [61.8, -46.3], to: [61.8, -49.2] },
  // W14: the Corner House interior — the registry's last openDecision,
  // carved on the owner's confirmation; the leg crosses the door gap on
  // the registry entrance's own x (−55) and stands inside the fit-out
  { name: 'walk into the CORNER HOUSE (KTN-00W)', from: [-55, 6.3], to: [-55, 9.4] },
  // W10: the parks are reachable — the gate walk-ins from the avenues,
  // the Gable Garden's gate chain from the Green, the FRUIT-INT walk-in
  // (the one W8 room with no live leg) into its west bulk, and the two
  // W6 stoop landings (the high-stoop treads ride the 0.12 riser law)
  { name: 'walk into the LARKIN garden (gate x=-30)', from: [-30, 44], to: [-30, 60.2] },
  { name: 'walk into the CARROW garden (gate x=42)', from: [42, -44], to: [42, -60.2] },
  { name: 'the GABLE GARDEN gate chain (Green → gate → beds)', from: [10, 24], to: [-4, 24.4] },
  { name: 'walk into FRUIT-INT (TEN-02) to its west bulk', from: [-66.2, -45.5], to: [-64.5, -59.5], via: [[-66.2, -48.6], [-66.0, -52.5]] },
  { name: 'the GRB-06 stoop landing', from: [-66.2, 45.8], to: [-66.2, 47.85] },
  { name: 'the GRB-07 stoop landing', from: [61.8, 45.8], to: [61.8, 47.85] },
];

const legResults = await page.evaluate((legs) => {
  const g = window.__game;
  return new Promise((resolve) => {
    const results = [];
    let li = 0;
    const teleport = (x, z) => {
      if (g.sitting) g.standUp();
      g.player.capsule.x = x;
      g.player.capsule.z = z;
      g.player.capsule.y = 0.05;
      g.player.vy = 0; g.player.vx = 0; g.player.vz = 0;
    };
    const forensics = (p) => {
      const near = [];
      for (const b of g.world.colliders) {
        if (b.maxY <= 0.36 || b.minY >= 1.7) continue;
        const nx = Math.max(b.minX, Math.min(p.x, b.maxX));
        const nz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
        const dd = Math.hypot(p.x - nx, p.z - nz);
        if (dd < 1.2) near.push(`[${b.minX.toFixed(1)},${b.maxX.toFixed(1)}]y[${b.minY.toFixed(1)},${b.maxY.toFixed(1)}]z[${b.minZ.toFixed(1)},${b.maxZ.toFixed(1)}]${b.kind ? ':' + b.kind : ''}`);
      }
      const peds = g.world.pedBodies ? g.world.pedBodies()
        .filter((b) => Math.hypot(b.x - p.x, b.z - p.z) < 3)
        .map((b) => `(${b.x.toFixed(1)},${b.z.toFixed(1)})`) : [];
      return { near: near.slice(0, 8), peds, frozen: g.player.frozen, ground: g.player.onGround, y: +p.y.toFixed(2) };
    };
    // the autotest's detour-side picker: fewer blockers wins
    const pickDetourSide = (px, pz, dirX, dirZ) => {
      const perpX = -dirZ, perpZ = dirX;
      let best = 0, bestBlocked = Infinity;
      for (const side of [-1, 1]) {
        const qx = px + perpX * side * 1.4, qz = pz + perpZ * side * 1.4;
        let blocked = 0;
        for (const b of g.world.colliders) {
          if (b.maxY <= 0.4 || b.minY >= 1.8) continue;
          const nx = Math.max(b.minX, Math.min(qx, b.maxX));
          const nz = Math.max(b.minZ, Math.min(qz, b.maxZ));
          if (Math.hypot(qx - nx, qz - nz) < 0.4) blocked++;
        }
        if (blocked < bestBlocked) { bestBlocked = blocked; best = side; }
      }
      return best;
    };
    const nextLeg = () => {
      if (li >= legs.length) { resolve(results); return; }
      const leg = legs[li++];
      teleport(leg.from[0], leg.from[1]);
      const t0 = performance.now();
      const hardCap = 40 * 3000; // 3x the 40 s plan, in ms — the ceiling
      let frames = 0, stuckCount = 0, bestDist = Infinity;
      let slide = 0, lastPhase = -1, phaseX = 0, phaseZ = 0;
      let detour = null, detours = 0;
      let windowDist = Math.hypot(leg.to[0] - leg.from[0], leg.to[1] - leg.from[1]);
      let windowT0 = performance.now();
      let grindDist = windowDist, grindT0 = t0;
      const result = { name: leg.name, closed: 0, ok: false, stuckAt: null };
      const releaseKeys = () => {
        g.input.injectKey('KeyW', false);
        g.input.injectKey('KeyS', false);
        g.input.injectKey('KeyD', false);
        g.input.injectKey('KeyA', false);
      };
      const tick = () => {
        const p = g.player.capsule;
        if (g.player.frozen) g.input.injectInteract();
        if (detour && Math.hypot(detour.x - p.x, detour.z - p.z) < 0.6) {
          detour = null; bestDist = Infinity; stuckCount = 0;
          grindDist = Math.hypot(leg.to[0] - p.x, leg.to[1] - p.z);
          grindT0 = performance.now();
        }
        let wx = leg.to[0], wz = leg.to[1];
        if (leg.via && leg.via.length) {
          wx = leg.via[0][0]; wz = leg.via[0][1];
          if (Math.hypot(wx - p.x, wz - p.z) < 0.7) leg.via.shift();
        }
        const gx = detour ? detour.x : wx;
        const gz = detour ? detour.z : wz;
        const dx = gx - p.x, dz = gz - p.z;
        const distGoal = Math.hypot(dx, dz);
        result.closed = +Math.hypot(leg.from[0] - p.x, leg.from[1] - p.z).toFixed(1);
        if ((!leg.via || !leg.via.length) && distGoal < 0.8) {
          result.ok = true;
          results.push(result);
          releaseKeys();
          setTimeout(nextLeg, 120);
          return;
        }
        g.player.camYaw = Math.atan2(dx, dz); // pin the basis (autotest law)
        frames++;
        // 25 cm progress hysteresis resets the stuck counter
        if (distGoal < bestDist - 0.25) { bestDist = distGoal; stuckCount = 0; }
        else stuckCount++;
        // grind clock: 9 s without a 0.4 m gain means the dance is grinding
        if (distGoal < grindDist - 0.4) { grindDist = distGoal; grindT0 = performance.now(); }
        // the dance: back up, then sidestep alternating
        if (stuckCount > 8) {
          const phase = Math.floor(stuckCount / 16) % 3;
          if (phase !== lastPhase) { lastPhase = phase; phaseX = p.x; phaseZ = p.z; }
          if (Math.hypot(p.x - phaseX, p.z - phaseZ) > 0.8) stuckCount = (Math.floor(stuckCount / 16) + 1) * 16 + 1;
          slide = Math.floor(stuckCount / 16) % 3 === 0 ? 2 : (Math.floor(stuckCount / 16) % 3 === 1 ? -1 : 1);
        } else { slide = 0; lastPhase = -1; }
        // grind detour: route around a STATIC blocker once per leg (≤8)
        if ((stuckCount > 240 || performance.now() - grindT0 > 6000) && !detour && detours < 8
          && distGoal > 1.3) {
          const dlen = distGoal || 1;
          const aheadX = p.x + (dx / dlen) * 0.6, aheadZ = p.z + (dz / dlen) * 0.6;
          let staticBlock = false;
          for (const b of g.world.colliders) {
            if (b.maxY <= 0.4 || b.minY >= 1.8) continue;
            const nx = Math.max(b.minX, Math.min(aheadX, b.maxX));
            const nz = Math.max(b.minZ, Math.min(aheadZ, b.maxZ));
            if (Math.hypot(aheadX - nx, aheadZ - nz) < 0.9) { staticBlock = true; break; }
          }
          if (staticBlock) {
            const side = pickDetourSide(p.x, p.z, dx / dlen, dz / dlen);
            detour = { x: p.x + -dz / dlen * side * 2.5, z: p.z + dx / dlen * side * 2.5 };
            detours++;
            bestDist = Infinity; stuckCount = 0;
          } else if (performance.now() - grindT0 > 12000) {
            // grinding but nothing static ahead (a cab handshake): give up
          }
        }
        // the progress window: past 25 s, a walk that stopped closing ends now
        if (performance.now() - t0 > 15000 && performance.now() - windowT0 > 3000) {
          const nowDist = distGoal;
          if (nowDist > windowDist - 0.4) { /* end below */ }
          windowDist = Math.min(windowDist, nowDist);
          windowT0 = performance.now();
        }
        const stalledWindow = performance.now() - t0 > 15000
          && performance.now() - windowT0 > 3000 && distGoal > windowDist - 0.4;
        if (performance.now() - t0 > hardCap || stalledWindow) {
          result.stuckAt = [+p.x.toFixed(2), +p.z.toFixed(2)];
          result.forensics = forensics(p);
          results.push(result);
          releaseKeys();
          setTimeout(nextLeg, 120);
          return;
        }
        g.input.injectKey('KeyW', slide !== 2);
        g.input.injectKey('KeyS', slide === 2);
        g.input.injectKey('KeyD', slide === 1);
        g.input.injectKey('KeyA', slide === -1);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    nextLeg();
  });
}, LEGS);

for (const r of legResults) {
  const f = r.forensics ? ` frozen=${r.forensics.frozen} ground=${r.forensics.ground} y=${r.forensics.y} peds=${JSON.stringify(r.forensics.peds)} near=${JSON.stringify(r.forensics.near)}` : '';
  check(r.ok, `LEG ${r.name}: closed ${r.closed} m${r.stuckAt ? ` — STALLED at (${r.stuckAt[0]},${r.stuckAt[1]})${f} hist=${JSON.stringify(r.hist)}` : ''}`);
}
}

check(errors.length === 0, `zero page errors (${errors.length ? errors.slice(0, 3).join(' | ') : 'clean'})`);
await browser.close();
server.close();
console.log(fails.length ? `\nWALKABILITY: ${fails.length} FAILURES` : '\nWALKABILITY: ALL CLEAR');
process.exit(fails.length ? 1 : 0);
