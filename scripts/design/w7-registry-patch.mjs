#!/usr/bin/env node
/**
 * W7 — the Westgate & Eastgate rows: the registry patch (append-only).
 *
 * The map grows its last two sides: bounds.playableCore x ±84 → ±100 (the
 * owner's 2026-11-11 expansion authorization — DEC-8, in-register), the
 * three E–W streets extend spanX to ±100, four new block rows file the
 * strips, 24 new class-C masses continue the Gable / Kestrel / Marlow rows
 * and both terrace bands west and east, and the W7 phase lands. The sky
 * cards SKY-W/E move ∓110 → ∓122 so the new walls keep ≥ 10 m of clearance
 * from the skyline fabric's nearest faces (the rows are deco fabric, not
 * registry masses — only the bounds note moves).
 *
 * Append-only law: no existing row is renumbered, moved, resized, or
 * re-classed. BLK-N2/BLK-S2 grow their bbox to the new wall line and note
 * the continuation — the identity note is the ONLY edit those rows take.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = new URL('../../docs/data/world-registry.json', import.meta.url).pathname;
const R = JSON.parse(readFileSync(PATH, 'utf8'));

// ---- 1. bounds ------------------------------------------------------------
R.bounds.world.xMax = 136; // the Eastgate strip + the SKY-E fabric row's far faces (x 122+4+7.5 ≈ 133.5)
R.bounds.world.note = 'xMin extended for the far world (docs/50): the K tunnel, 42 St-Times Square, and the Times Square canyon sit one ride west of Alder Heights. xMax extended in W7: the Eastgate strip and the SKY-E skyline fabric row live east of the old ±96 edge.';
R.bounds.playableCore = {
  xMin: -100, xMax: 100, zMin: -64, zMax: 64,
  note: 'W7 (2026-11-12): grown from x ±84 under the standing owner authorization ("expand the game map is not a problem here", 2026-11-11 — DEC-8, in-register). The strips beyond the Juniper/Sycamore avenues are real rows now — the E–W streets grow their west and east ends and the terrace bands continue to the wall line. Sky cards SKY-W/E move ∓110 → ∓122 so the new walls keep ≥ 10 m from the skyline fabric.',
};
const skyW = R.bounds.skylineCards.find((c) => c.id === 'SKY-W');
const skyE = R.bounds.skylineCards.find((c) => c.id === 'SKY-E');
skyW.line = 'x = −122 card row';
skyE.line = 'x = +122 card row';
skyW.role = 'Juniper Avenue vanishing point (moved ∓110 → ∓122 in W7 — the Westgate rows took the old ground, the skyline fabric keeps its clearance)';
skyE.role = 'Sycamore Avenue vanishing point (moved ±110 → ±122 in W7 — the Eastgate rows took the old ground, the skyline fabric keeps its clearance)';

// ---- 2. streets: the E–W rows grow their ends ------------------------------
for (const [id, note] of [
  ['STR-KESTREL', 'W7: spanX ±84 → ±100 — the street continues into the Westgate/Eastgate strips (butt-jointed slabs, same levels).'],
  ['STR-GABLE', 'W7: spanX ±84 → ±100 — the street continues into the Westgate/Eastgate strips; the terrace bands ride its north walk to the wall line.'],
  ['STR-MARLOW', 'W7: spanX ±84 → ±100 — the street continues into the Westgate/Eastgate strips; the Carrow band rides its south walk to the wall line.'],
]) {
  const s = R.streets.find((x) => x.id === id);
  s.spanX = [-100, 100];
  s.notes = s.notes ? `${s.notes} ${note}` : note;
}

// ---- 3. blocks -------------------------------------------------------------
const N2 = R.blocks.find((b) => b.id === 'BLK-N2');
N2.bbox = { xMin: -100, xMax: 100, zMin: 48, zMax: 64 };
N2.identity = "Gable's brownstone row continues north (GRB-06..11) with the Larkin garden behind the VDN-DN1 mass — W7 took the band west and east to the wall line";
const S2 = R.blocks.find((b) => b.id === 'BLK-S2');
S2.bbox = { xMin: -100, xMax: 100, zMin: -64, zMax: -48 };
S2.identity = "Marlow's shop-and-walk-up row continues south (TEN-02..04, KTS-04..06) with the Carrow garden behind the VDN-DS1 mass — W7 took the band west and east to the wall line";
R.blocks.push(
  {
    id: 'BLK-W1', name: 'Westgate block (Gable–Kestrel)',
    bbox: { xMin: -100, xMax: -84, zMin: 8, zMax: 32 },
    identity: "Gable's brownstone row and Kestrel's walk-up row continue west (GRB-12/13, KTN-08/09) — party walls meet at z 20 like the core block's edges",
  },
  {
    id: 'BLK-W2', name: 'Westgate block (Kestrel–Marlow)',
    bbox: { xMin: -100, xMax: -84, zMin: -32, zMax: -8 },
    identity: "Kestrel's tenement row and Marlow's shop-and-walk-up row continue west (KTS-07/08, MRW-01/02) — the strip reads edge to edge, no yard",
  },
  {
    id: 'BLK-E1', name: 'Eastgate block (Gable–Kestrel)',
    bbox: { xMin: 84, xMax: 100, zMin: 8, zMax: 32 },
    identity: "Gable's brownstone row and Kestrel's walk-up row continue east (GRB-14/15, KTN-10/11) — the Eastgate mirror",
  },
  {
    id: 'BLK-E2', name: 'Eastgate block (Kestrel–Marlow)',
    bbox: { xMin: 84, xMax: 100, zMin: -32, zMax: -8 },
    identity: "Kestrel's tenement row and Marlow's shop-and-walk-up row continue east (KTS-09/10, MRW-03/04) — the Eastgate mirror",
  },
);

// ---- 4. the 24 new masses ---------------------------------------------------
const terr = (id, name, x, z, faces) => ({
  id, name, status: 'built (W7)', class: 'C', face: faces.face, block: faces.block,
  footprint: { x, z, w: 8, d: 15.4 }, height: faces.h, floors: faces.h >= 16 ? 5 : 3,
  style: 'terrace brownstone pair reading as one band: high stoops, tall parlor windows, cornice (W7 — the terrace band continues to the wall line)',
  entrance: [{ x: x - 2.2, z: faces.entZ, faces: faces.entFaces, type: 'stoop' }],
  interior: null,
  storyRole: faces.role,
  collider: true,
});
const brown = (id, name, x, z) => ({
  id, name, status: 'built (W7)', class: 'C', face: 'Gable S (row)', block: x < 0 ? 'BLK-W1' : 'BLK-E1',
  footprint: { x, z, w: 8, d: 12 }, height: 12.5, floors: 3,
  style: 'brownstone: high stoop, tall parlor windows, cornice (W7 — the Gable row continues to the wall line)',
  entrance: [{ x, z: 32, faces: 'N', type: 'stoop' }],
  interior: null,
  storyRole: 'A quiet brownstone house; its stoop faces Gable’s south walk.',
  collider: true,
});
const ktn = (id, name, x, h, shop) => ({
  id, name, status: 'built (W7)', class: 'C', face: 'Kestrel N (row)', block: x < 0 ? 'BLK-W1' : 'BLK-E1',
  footprint: { x, z: 14, w: 8, d: 12 }, height: h, floors: Math.round(h / 3.2),
  style: 'mixed-use walk-up: shopfront band under a brick walk-up (W7 — the Kestrel row continues to the wall line)',
  entrance: [{ x, z: 8, faces: 'S' }],
  interior: null,
  storyRole: shop ? `Corner-shop walk-up; the ground floor reads ${shop} behind a striped awning.` : 'Walk-up over a shopfront band; its door faces Kestrel’s north walk.',
  collider: true,
});
const kts = (id, name, x, h) => ({
  id, name, status: 'built (W7)', class: 'C', face: 'Kestrel S (row)', block: x < 0 ? 'BLK-W2' : 'BLK-E2',
  footprint: { x, z: -14, w: 8, d: 12 }, height: h, floors: Math.round(h / 3.2),
  style: 'tenement mass (W7 — the Kestrel south row continues to the wall line)',
  entrance: [{ x, z: -8, faces: 'N' }],
  interior: null,
  storyRole: 'A working tenement; its door faces Kestrel’s south walk.',
  collider: true,
});
const mrw = (id, name, x, h, shop) => ({
  id, name, status: 'built (W7)', class: 'C', face: 'Marlow N (row)', block: x < 0 ? 'BLK-W2' : 'BLK-E2',
  footprint: { x, z: -26, w: 8, d: 12 }, height: h, floors: Math.round(h / 3.2),
  style: 'shop-and-walk-up: awning shopfront under pre-war brick (W7 — the Marlow row continues to the wall line)',
  entrance: [{ x, z: -32, faces: 'S' }],
  interior: null,
  storyRole: shop ? `Shop-and-walk-up; the ground floor reads ${shop} behind a striped awning.` : 'Shop-and-walk-up; its door faces Marlow’s north walk.',
  collider: true,
});
const carrow = (id, name, x, h, shop) => ({
  id, name, status: 'built (W7)', class: 'C', face: 'Marlow S (terrace)', block: 'BLK-S2',
  footprint: { x, z: -56.2, w: 8, d: 15.4 }, height: h, floors: h >= 16 ? 5 : 4,
  style: shop
    ? 'terrace walk-up over shopfront: awning band, stoop, cornice (W7 — the Carrow band continues to the wall line)'
    : 'terrace tenement: shopfront + stoop pair reading as one band (W7 — the Carrow band continues to the wall line)',
  entrance: [{ x: x - 2.2, z: -47.7, faces: 'N', type: 'stoop' }],
  interior: null,
  storyRole: shop ? `The Carrow band’s west/east anchor shop (${shop}); its stoop faces Marlow’s south walk.` : 'The Carrow band’s west/east house; its stoop faces Marlow’s south walk.',
  collider: true,
});

const rows = [
  // the Larkin terrace band continues WEST then EAST (Gable N, z 56.2)
  terr('GRB-08', 'Westgate Terrace 1', -88, 56.2, { h: 12.5, face: 'Gable N (terrace)', block: 'BLK-N2', entZ: 47.7, entFaces: 'S', role: 'The terrace band’s west house; its stoop faces Gable’s north walk.' }),
  terr('GRB-09', 'Westgate Terrace 2', -96, 56.2, { h: 12.5, face: 'Gable N (terrace)', block: 'BLK-N2', entZ: 47.7, entFaces: 'S', role: 'The terrace band’s end house — its west face IS the wall line’s masonry.' }),
  terr('GRB-10', 'Eastgate Terrace 1', 88, 56.2, { h: 12.5, face: 'Gable N (terrace)', block: 'BLK-N2', entZ: 47.7, entFaces: 'S', role: 'The terrace band’s east house; its stoop faces Gable’s north walk.' }),
  terr('GRB-11', 'Eastgate Terrace 2', 96, 56.2, { h: 12.5, face: 'Gable N (terrace)', block: 'BLK-N2', entZ: 47.7, entFaces: 'S', role: 'The terrace band’s end house — its east face IS the wall line’s masonry.' }),
  // Gable's south brownstone row continues WEST then EAST (z 26)
  brown('GRB-12', 'Westgate Brownstone 1', -88, 26),
  brown('GRB-13', 'Westgate Brownstone 2', -96, 26),
  brown('GRB-14', 'Eastgate Brownstone 1', 88, 26),
  brown('GRB-15', 'Eastgate Brownstone 2', 96, 26),
  // Kestrel's walk-up row continues WEST then EAST (z 14, faces S)
  ktn('KTN-08', 'Westgate Walk-Up 1', -88, 15, 'WESTGATE BOOKS'),
  ktn('KTN-09', 'Westgate Walk-Up 2', -96, 16, 'GATE HARDWARE'),
  ktn('KTN-10', 'Eastgate Walk-Up 1', 88, 15, 'EASTGATE NEWS'),
  ktn('KTN-11', 'Eastgate Walk-Up 2', 96, 16, 'VERBENA BOOKS'),
  // Kestrel's tenement row continues WEST then EAST (z −14, faces N)
  kts('KTS-07', 'Westgate Tenement 1', -88, 16),
  kts('KTS-08', 'Westgate Tenement 2', -96, 14),
  kts('KTS-09', 'Eastgate Tenement 1', 88, 14),
  kts('KTS-10', 'Eastgate Tenement 2', 96, 16),
  // Marlow's shop-and-walk-up row continues WEST then EAST (z −26, faces S)
  mrw('MRW-01', 'Marlow West Shop 1', -88, 15, 'CORNELIUS & CO.'),
  mrw('MRW-02', 'Marlow West Shop 2', -96, 17, 'WESTGATE NEWS'),
  mrw('MRW-03', 'Marlow East Shop 1', 88, 17, 'LARKIN PROVISIONS'),
  mrw('MRW-04', 'Marlow East Shop 2', 96, 15, 'CARROW CHEESE'),
  // the Carrow terrace band continues WEST then EAST (Marlow S, z −56.2)
  carrow('TEN-03', 'Carrow Terrace West', -88, 16.5, null),
  carrow('KTS-05', 'Carrow Walk-Up West', -96, 18, null),
  carrow('TEN-04', 'Carrow Terrace East', 88, 16.5, null),
  carrow('KTS-06', 'Carrow Walk-Up East', 96, 18, null),
];
const known = new Set(R.buildings.map((b) => b.id));
for (const row of rows) {
  if (known.has(row.id)) throw new Error(`append-only violation: ${row.id} already exists`);
  R.buildings.push(row);
}

// ---- 5. the W7 phase --------------------------------------------------------
R.constructionPhases.push({
  id: 'W7',
  name: 'The Westgate & Eastgate rows',
  content: '24 class-C masses (GRB-08..15, KTN-08..11, KTS-05..10, TEN-03/04, MRW-01..04) — the Gable/Kestrel/Marlow rows and both terrace bands continue west and east to the wall line; the E–W street slabs/walks/curbs extend x ±84 → ±100 (butt-jointed, same levels); the terrace walk slabs follow; the sidewalk-shed port (three green construction canopies over the new walks), fire-escape ironwork and street props ride the neighborhood fabric',
  unlocks: 'the map grows its LAST two sides (walls x ±84 → ±100, owner authorization standing) — the core is a full four-sided neighborhood; the sky cards move ∓110 → ∓122 to keep their clearance',
});

writeFileSync(PATH, JSON.stringify(R, null, 1) + '\n');
console.log(`W7 registry patch OK — ${rows.length} rows appended (${R.buildings.length} total), blocks ${R.blocks.length}, phases ${R.constructionPhases.length}`);
