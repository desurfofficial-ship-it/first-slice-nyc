/**
 * THE POCKET SCAN — exhaustive player-connectivity forensics (the user's
 * "why can't I go those sides" bug, 2026-11-13).
 *
 * The shipped probe-walkability checks LANES and door approaches, and its
 * live legs TELEPORT into the terrace garden strips — the APPROACH from the
 * road is never swept. This scan floods the ENTIRE playable floor with the
 * real capsule clearance (r 0.35, steppable ≤ 0.36, head < 1.7) and reports:
 *   1. every free-space component NOT reachable from spawn (traps), and
 *   2. cramped cells — free but walled in ≥ 14/16 directions within 0.9 m
 *      (the "I'm blocked" feel) — clustered, with the sealing boxes named,
 *   3. component membership for named POIs (garden strips, road ends,
 *      corners, stoops) — any POI off the spawn component is the bug.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4667;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 480, height: 320 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1200);

const out = await page.evaluate(() => {
  const w = window.__game.world;
  const R = 0.35, STEP = 0.36, YHI = 1.7;
  const H = 0.5;                       // grid step
  const X0 = -99.75, Z0 = -63.75;
  const NX = Math.round((99.75 - X0) / H) + 1;   // 400
  const NZ = Math.round((63.75 - Z0) / H) + 1;   // 256
  const idx = (cx, cz) => cz * NX + cx;
  const cellX = (cx) => X0 + cx * H;
  const cellZ = (cz) => Z0 + cz * H;

  // -- mark blocked cells: dilate every blocking box by the capsule radius
  // (2026-11-13, the W13 finding: the census must measure the MAP, not the
  // living world's moment. The movers' own boxes — the M121's busCollider,
  // the street cab's taxiCollider, and the seven cast bodies (Rosa, Idris,
  // the kid, the cart customer, the stranger, Sal, the familiar face) —
  // walk the floor at sample time: the bus at the stop pinch stranded the
  // ~9 cells beyond it, the cast moved other cells, and the scan
  // flip-flopped 41,857 / 41,866 run-to-run with the SAME box count, traps
  // and POIs. The movers are excluded BY IDENTITY from here on — they are
  // traffic and people, the map's connectivity is the map. The stateful
  // statics (stool, barrier) stay: they are parked underground until their
  // day makes them real, so a fresh boot reads them absent, deterministically.)
  const MOVERS = [w.busCollider, w.taxiCollider, w.rosaCollider, w.idrisCollider, w.kidCollider,
    w.customerCollider, w.strangerCollider, w.salCollider, w.familiarCollider,
    ...((w.peds && w.peds.walkColliders) || [])].filter(Boolean);
  const blocked = new Uint8Array(NX * NZ);
  const boxName = new Map();           // cell -> first sealing box tag
  let nb = 0;
  for (const b of w.colliders) {
    if (MOVERS.includes(b)) continue;
    if (b.maxY <= STEP || b.minY >= YHI) continue;
    nb++;
    const cx0 = Math.max(0, Math.floor((b.minX - R - X0) / H));
    const cx1 = Math.min(NX - 1, Math.ceil((b.maxX + R - X0) / H));
    const cz0 = Math.max(0, Math.floor((b.minZ - R - Z0) / H));
    const cz1 = Math.min(NZ - 1, Math.ceil((b.maxZ + R - Z0) / H));
    const tag = `[${b.minX.toFixed(1)},${b.maxX.toFixed(1)}]y[${b.minY.toFixed(1)},${b.maxY.toFixed(1)}]z[${b.minZ.toFixed(1)},${b.maxZ.toFixed(1)}]${b.kind ? ':' + b.kind : ''}`;
    for (let cz = cz0; cz <= cz1; cz++)
      for (let cx = cx0; cx <= cx1; cx++) {
        const i = idx(cx, cz);
        blocked[i] = 1;
        if (!boxName.has(i)) boxName.set(i, tag);
      }
  }

  // -- flood fill from spawn, 8-connected, no corner cutting
  const comp = new Int32Array(NX * NZ).fill(-1);
  const spawnCell = { cx: Math.round((-30 - X0) / H), cz: Math.round((6.2 - Z0) / H) };
  const si = idx(spawnCell.cx, spawnCell.cz);
  const freeAt = (cx, cz) => cx >= 0 && cz >= 0 && cx < NX && cz < NZ && !blocked[idx(cx, cz)];
  let comps = [];
  if (!blocked[si]) {
    const id = 0;
    comp[si] = id;
    const q = [si];
    let size = 0;
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    while (q.length) {
      const i = q.pop();
      size++;
      const cx = i % NX, cz = (i / NX) | 0;
      if (cellX(cx) < minX) minX = cellX(cx); if (cellX(cx) > maxX) maxX = cellX(cx);
      if (cellZ(cz) < minZ) minZ = cellZ(cz); if (cellZ(cz) > maxZ) maxZ = cellZ(cz);
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx2 = cx + dx, nz2 = cz + dz;
          if (nx2 < 0 || nz2 < 0 || nx2 >= NX || nz2 >= NZ) continue;
          const j = idx(nx2, nz2);
          if (blocked[j] || comp[j] >= 0) continue;
          if (dx && dz && (!freeAt(cx + dx, cz) || !freeAt(cx, cz + dz))) continue; // no corner cut
          comp[j] = id; q.push(j);
        }
    }
    comps.push({ id: 0, size, minX, maxX, minZ, maxZ });
  }
  // other components (traps) — a cell the player can occupy only by teleport
  const traps = [];
  {
    let id = 1;
    const seen = new Uint8Array(NX * NZ);
    for (let i = 0; i < blocked.length; i++) {
      if (blocked[i] || comp[i] >= 0 || seen[i]) continue;
      const q = [i]; comp[i] = id; seen[i] = 1;
      let size = 0, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, cxSum = 0, czSum = 0;
      while (q.length) {
        const j = q.pop(); size++;
        const cx = j % NX, cz = (j / NX) | 0;
        cxSum += cellX(cx); czSum += cellZ(cz);
        if (cellX(cx) < minX) minX = cellX(cx); if (cellX(cx) > maxX) maxX = cellX(cx);
        if (cellZ(cz) < minZ) minZ = cellZ(cz); if (cellZ(cz) > maxZ) maxZ = cellZ(cz);
        for (let dz = -1; dz <= 1; dz++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dz) continue;
            const ax = cx + dx, az = cz + dz;
            if (ax < 0 || az < 0 || ax >= NX || az >= NZ) continue;
            const k = idx(ax, az);
            if (blocked[k] || comp[k] >= 0 || seen[k]) continue;
            if (dx && dz && (!freeAt(cx + dx, cz) || !freeAt(cx, cz + dz))) continue;
            comp[k] = id; seen[k] = 1; q.push(k);
          }
      }
      if (size >= 12) traps.push({ id, size, cx: +(cxSum / size).toFixed(1), cz: +(czSum / size).toFixed(1), minX: +minX.toFixed(1), maxX: +maxX.toFixed(1), minZ: +minZ.toFixed(1), maxZ: +maxZ.toFixed(1) });
      id++;
    }
  }
  // representative sealing box per trap (a cell on the trap's rim)
  for (const t of traps) {
    const i = idx(Math.round((t.cx - X0) / H), Math.round((t.cz - Z0) / H));
    // walk outward until a blocked cell, name it
    let best = null;
    for (let r = 1; r < 8 && !best; r++) {
      for (let dz = -r; dz <= r && !best; dz++)
        for (let dx = -r; dx <= r && !best; dx++) {
          const cx = Math.round((t.cx - X0) / H) + dx, cz = Math.round((t.cz - Z0) / H) + dz;
          if (cx < 0 || cz < 0 || cx >= NX || cz >= NZ) continue;
          const j = idx(cx, cz);
          if (blocked[j]) best = boxName.get(j);
        }
    }
    t.seal = best;
  }

  // -- POIs: is each inside the spawn component?
  const pois = {};
  const poiList = {
    spawn: [-30, 6.2],
    center_road_EW: [0, 6.5], center_road_EW_s: [0, -6.5],
    Larkin_road_z35: [0, 35], Larkin_road_z465: [0, 46.5],
    Carrow_road_zm346: [0, -34.6], Carrow_road_zm465: [0, -46.5],
    Juniper_walk_xm825_z20: [-82.5, 20], Juniper_z45: [-82.5, 45],
    Sycamore_walk_x825_z20: [82.5, 20], Sycamore_z45: [82.5, 45],
    terrace_garden_N_mid: [0, 61], terrace_garden_N_w: [-40, 61], terrace_garden_N_e: [40, 61],
    terrace_garden_S_mid: [0, -61], terrace_garden_S_w: [-40, -61], terrace_garden_S_e: [40, -61],
    terrace_walk_top_N: [0, 56], terrace_walk_top_S: [0, -56],
    GRB06_stoop: [-64, 47.5], GRB07_stoop: [64, 47.5],
    TEN02_stoop: [-64, -48.5], KTS04_stoop: [64, -48.5],
    corner_NW: [-99, 63], corner_NE: [99, 63], corner_SW: [-99, -63], corner_SE: [99, -63],
    west_end_road_465: [-97, 46.5], east_end_road_465: [97, 46.5],
    west_end_road_zm465: [-97, -46.5], east_end_road_zm465: [97, -46.5],
    westgate_strip_z6: [-92, 6.5], eastgate_strip_z6: [92, 6.5],
    westgate_strip_zm6: [-92, -6.5], eastgate_strip_zm6: [92, -6.5],
    westgate_terr_zm465: [-92, -46.5], eastgate_terr_465: [92, 46.5],
    subway_N_door: [-47.2, 6.5], subway_S_door: [-57.2, -6.5],
    plaza_center: [0, 0],
    KTN08_books_door: [-88, 8.6], KTS04_wine_door: [61.8, -49.2],
  };
  for (const [name, [x, z]] of Object.entries(poiList)) {
    const cx = Math.round((x - X0) / H), cz = Math.round((z - Z0) / H);
    const i = idx(cx, cz);
    pois[name] = blocked[i] ? 'BLOCKED' : (comp[i] === 0 ? 'spawn-comp' : (comp[i] >= 0 ? 'TRAP:' + comp[i] : 'BLOCKED'));
  }

  // -- cramped cells: free but walled in ≥14/16 directions within 0.9 m
  const DIRS = [];
  for (let k = 0; k < 16; k++) DIRS.push([Math.cos((k / 16) * Math.PI * 2), Math.sin((k / 16) * Math.PI * 2)]);
  const cramped = [];
  const probeBlocked = (x, z) => {
    for (const b of w.colliders) {
      if (b.maxY <= STEP || b.minY >= YHI) continue;
      const nx = Math.max(b.minX, Math.min(x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - nx, dz = z - nz;
      if (dx * dx + dz * dz < R * R) return true;
    }
    return false;
  };
  for (let cz = 2; cz < NZ - 2; cz += 2)
    for (let cx = 2; cx < NX - 2; cx += 2) {
      const i = idx(cx, cz);
      if (blocked[i] || comp[i] !== 0) continue;
      const x = cellX(cx), z = cellZ(cz);
      let sealed = 0;
      for (const [dx, dz] of DIRS) {
        let wall = true;
        for (let t = 0.25; t <= 0.9; t += 0.25) if (!probeBlocked(x + dx * t, z + dz * t)) { wall = false; break; }
        if (wall) sealed++;
      }
      if (sealed >= 14) cramped.push({ x: +x.toFixed(2), z: +z.toFixed(2), sealed });
    }
  // cluster cramped cells (greedy 2 m linkage)
  const clusters = [];
  for (const c of cramped) {
    let cl = clusters.find((k) => Math.hypot(k.cx - c.x, k.cz - c.z) < 2.5);
    if (!cl) { cl = { cx: c.x, cz: c.z, n: 0, maxSealed: 0 }; clusters.push(cl); }
    cl.cx = (cl.cx * cl.n + c.x) / (cl.n + 1);
    cl.cz = (cl.cz * cl.n + c.z) / (cl.n + 1);
    cl.n++; cl.maxSealed = Math.max(cl.maxSealed, c.sealed);
  }
  clusters.sort((a, b) => b.n - a.n);

  return {
    colliders: w.colliders.length, blockingBoxes: nb,
    gridCells: NX * NZ,
    spawnComp: comps[0],
    trapCount: traps.length,
    traps: traps.sort((a, b) => b.size - a.size).slice(0, 24),
    pois,
    crampedCount: cramped.length,
    crampedClusters: clusters.slice(0, 24).map((c) => ({ ...c, cx: +c.cx.toFixed(1), cz: +c.cz.toFixed(1) })),
  };
});

console.log(JSON.stringify(out, null, 1));
if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 3).join(' | '));
await browser.close();
server.close();
process.exit(0);
