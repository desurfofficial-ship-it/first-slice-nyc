/**
 * Registry validator — docs/data/world-registry.json is the master world's
 * single source of truth, so it must be structurally sound AND it must
 * faithfully mirror the shipped world. Run: node scripts/design/validate-registry.mjs
 * Exit 0 = green; any finding prints and exits 1.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = JSON.parse(readFileSync(join(ROOT, 'docs/data/world-registry.json'), 'utf8'));

const problems = [];
const ok = (cond, msg) => { if (!cond) problems.push(msg); };

// ---------- 1. ID uniqueness across every id-bearing entity ----------
const ids = new Map();
const claim = (id, what) => {
  if (ids.has(id)) problems.push(`DUPLICATE ID ${id} (${what} vs ${ids.get(id)})`);
  ids.set(id, what);
};
for (const s of R.streets) claim(s.id, 'street');
for (const i of R.intersections) claim(i.id, 'intersection');
for (const c of R.crosswalks) claim(c.id, 'crosswalk');
for (const b of R.blocks) claim(b.id, 'block');
for (const b of R.buildings) claim(b.id, 'building');
for (const p of R.parks) claim(p.id, 'park');
for (const l of R.landmarks) claim(l.id, 'landmark');
for (const z of R.npcZones) claim(z.id, 'npcZone');
for (const [k] of Object.entries(R.routes.pedestrian)) claim('R-' + k, 'pedRoute');
for (const [k] of Object.entries(R.routes.vehicle)) claim('V-' + k, 'vehRoute');
for (const i of R.interiors) claim(i.id, 'interior');
for (const t of R.transit.bus.stops) claim(t.id, 'busStop');

// ---------- 2. Bounds containment ----------
const W = R.bounds.world;
const fp = (f) => ({ x0: f.x - f.w / 2, x1: f.x + f.w / 2, z0: f.z - f.d / 2, z1: f.z + f.d / 2 });
for (const b of R.buildings) {
  const f = fp(b.footprint);
  ok(f.x0 >= W.xMin && f.x1 <= W.xMax && f.z0 >= W.zMin && f.z1 <= W.zMax,
    `OUT OF BOUNDS ${b.id}: [${f.x0},${f.x1}]x[${f.z0},${f.z1}]`);
}

// ---------- 3. Block membership ----------
for (const b of R.buildings) {
  if (!b.block) continue;
  const blk = R.blocks.find((k) => k.id === b.block);
  const f = fp(b.footprint);
  ok(f.x0 >= blk.bbox.xMin - 0.01 && f.x1 <= blk.bbox.xMax + 0.01 && f.z0 >= blk.bbox.zMin - 0.01 && f.z1 <= blk.bbox.zMax + 0.01,
    `WRONG BLOCK ${b.id} claims ${b.block}: [${f.x0},${f.x1}]x[${f.z0},${f.z1}] not inside ${JSON.stringify(blk.bbox)}`);
}

// ---------- 4. Building-vs-building overlap (touching allowed) ----------
const bs = R.buildings.filter((b) => b.footprint && b.class !== 'D');
for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
  const a = fp(bs[i].footprint), c = fp(bs[j].footprint);
  const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0);
  const oz = Math.min(a.z1, c.z1) - Math.max(a.z0, c.z0);
  if (ox > 0.01 && oz > 0.01) problems.push(`OVERLAP ${bs[i].id} <-> ${bs[j].id} (${ox.toFixed(2)} x ${oz.toFixed(2)} m)`);
}

// ---------- 5. Buildings stay off the roadways (control house exempt) ----------
const roads = [];
for (const s of R.streets) {
  if (s.axis === 'EW') roads.push({ x0: -84, x1: 84, z0: s.road.zMin, z1: s.road.zMax, name: s.name });
  else roads.push({ x0: s.road.xMin, x1: s.road.xMax, z0: -64, z1: 64, name: s.name });
}
for (const b of bs) {
  const f = fp(b.footprint);
  for (const rd of roads) {
    const ox = Math.min(f.x1, rd.x1) - Math.max(f.x0, rd.x0);
    const oz = Math.min(f.z1, rd.z1) - Math.max(f.z0, rd.z0);
    if (ox > 0.01 && oz > 0.01) problems.push(`BUILDING ON ROAD ${b.id} (${rd.name}) overlap ${ox.toFixed(2)}x${oz.toFixed(2)}`);
  }
}

// ---------- 6. Interiors sit inside their buildings ----------
for (const it of R.interiors) {
  if (!it.shell || it.shell.xMin === undefined) continue;
  if (it.shell.belowGrade) continue; // below-grade rooms extend past their entry building (station mezzanine)
  const b = R.buildings.find((x) => x.id === it.building);
  if (!b) { problems.push(`INTERIOR ${it.id} references unknown building ${it.building}`); continue; }
  const f = fp(b.footprint);
  const s = it.shell;
  // CECIL-ROOM's shell is z-negative (south face): normalize
  const sz0 = Math.min(s.zMin, s.zMax), sz1 = Math.max(s.zMin, s.zMax);
  ok(s.xMin >= f.x0 - 0.01 && s.xMax <= f.x1 + 0.01 && sz0 >= f.z0 - 0.01 && sz1 <= f.z1 + 0.01,
    `INTERIOR ${it.id} outside its building ${b.id}: shell [${s.xMin},${s.xMax}]x[${sz0},${sz1}] vs bldg [${f.x0},${f.x1}]x[${f.z0},${f.z1}]`);
}

// ---------- 7. THE LOAD-BEARING CHECK: shipped world fidelity ----------
// Exact values transcribed from web-three/src/world/World.ts (and docs/38 §1).
// If one of these fails, someone edited the shipped world or mistyped the
// registry — either way the master plan no longer describes the real game.
const shipped = [
  ['KTN-01', -35.5, 14, 29, 12, 14],   // Bldg_N_West
  ['ROS-01', -16, 14, 10, 11.6, 4.5],  // bodega volume
  ['KTN-02', -1, 14, 20, 12, 18],      // Bldg_N_East_A
  ['KTN-03', 15, 14, 12, 12, 11],      // Bldg_N_GoldWindow
  ['KTN-04', 25.85, 14, 9.7, 12, 16],  // Bldg_N_East_B_W
  ['ALY-01', 32.1, 9.3, 2.8, 2.6, 3],  // alley slot
  ['KTN-05', 41.25, 14, 15.5, 12, 16], // Bldg_N_East_B_E
  ['KTS-01', -25, -14, 50, 12, 16],    // Bldg_S_West
  ['KTS-02', 13, -14, 26, 12, 14],     // Bldg_S_FireEscape
  ['KTS-03', 38, -14, 24, 12, 18],     // Bldg_S_East
  ['SUB-01', -42, 6.2, 2.6, 3.5, 3.2], // subway entrance + collider
  ['VND-01', 29.8, -4.55, 1.7, 0.9, 2.2] // dog cart
];
for (const [id, x, z, w, d, h] of shipped) {
  const b = R.buildings.find((y) => y.id === id);
  ok(b, `MISSING EXISTING ${id} — the registry must carry every shipped mass`);
  if (b) {
    const f = b.footprint;
    ok(f.x === x && f.z === z && f.w === w && f.d === d && b.height === h,
      `SHIPPED DRIFT ${id}: registry (${f.x},${f.z},${f.w},${f.d},h${b.height}) != code (${x},${z},${w},${d},h${h})`);
    ok(b.status === 'existing', `${id} must be status 'existing'`);
  }
}

// shipped interactable anchors — every live interaction point must survive
const anchors = [
  ['cart corner', 4, -6.6], ['bus bench', -23.3, 7.62], ['park bench', 41.5, -5.05],
  ['hoop', 44.25, 7.9], ['ball rest', 43.2, 5.2], ['hotdog', 29.8, -4.55],
  ['barber', 36.6, 7.9], ['alley peek', 32.1, 8.4], ['washer bay', -5.9, 7.6],
  ['bulletin board', -37.6, 7.5], ['newsbox', -44.6, 6.6], ['subway read', -42, 4.55],
  ['bodega shelf', -18.5, 13.5], ['sal counter', -7.0, 7.3], ['permit A-frame', -4.0, 5.8],
  ['teal door', 15, 6.9], ['roof vantage', 12.5, -6.8], ['terminal door', -30, 8]
];
const near = (ax, az) => R.buildings.some((b) => {
  const f = fp(b.footprint);
  const ex = Math.max(f.x0, Math.min(ax, f.x1)), ez = Math.max(f.z0, Math.min(az, f.z1));
  return Math.hypot(ax - ex, az - ez) < 4.5; // on or within 4.5 m of a registry mass/park
});
const parksFlat = R.parks.flatMap((p) => [p]);
for (const [name, ax, az] of anchors) {
  const hitBuilding = near(ax, az);
  const hitPark = parksFlat.some((p) => ax >= p.bbox.xMin - 3 && ax <= p.bbox.xMax + 3 && az >= p.bbox.zMin - 3 && az <= p.bbox.zMax + 3);
  ok(hitBuilding || hitPark, `ORPHANED ANCHOR "${name}" (${ax}, ${az}) — no registry entity covers the shipped interaction point`);
}

// ---------- 8. Park bboxes inside blocks / off roads ----------
for (const p of R.parks) {
  for (const rd of roads) {
    const ox = Math.min(p.bbox.xMax, rd.x1) - Math.max(p.bbox.xMin, rd.x0);
    const oz = Math.min(p.bbox.zMax, rd.z1) - Math.max(p.bbox.zMin, rd.z0);
    if (ox > 0.01 && oz > 0.01) problems.push(`PARK ON ROAD ${p.id} (${rd.name})`);
  }
}

// ---------- 9. Landmark/zone/transit references resolve ----------
for (const ix of R.intersections) for (const cb of (ix.cornerBuildings ?? []))
  ok(R.buildings.some((b) => b.id === cb), `INTERSECTION ${ix.id} references unknown building ${cb}`);
for (const l of R.landmarks) {
  const m = l.anchor.match(/[A-Z]+-[0-9A-Za-z]+/);
  if (m && !['EST'].includes(m[0])) {
    const found = R.buildings.some((b) => b.id === m[0]) || R.parks.some((p) => p.id === m[0]) || /water towers|SUB-/.test(l.anchor);
    if (!found && !/water tower/.test(l.anchor)) problems.push(`LANDMARK ${l.id} anchor ${m[0]} unresolved`);
  }
}
for (const p of R.parks) for (const zid of (p.npcZones ?? []))
  ok(R.npcZones.some((z) => z.id === zid), `PARK ${p.id} references unknown npcZone ${zid}`);

// ---------- report ----------
if (problems.length) {
  console.log(`REGISTRY VALIDATION — ${problems.length} PROBLEM(S):`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exit(1);
}
console.log(`REGISTRY VALIDATION OK — ${ids.size} IDs, ${R.buildings.length} buildings (${R.buildings.filter(b => b.status === 'existing').length} existing), ${R.streets.length} streets, ${R.parks.length} parks, ${R.interiors.length} interiors. Shipped-world fidelity: 12/12 masses, ${anchors.length}/${anchors.length} anchors.`);
