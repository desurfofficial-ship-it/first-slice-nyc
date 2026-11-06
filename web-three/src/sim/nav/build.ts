/**
 * The registry-seeded nav builder — A-1 §4.1–4.3.
 *
 * The graph is DERIVED from `docs/data/world-registry.json` — the world's
 * construction truth — never authored beside it. Every node and edge
 * traces back to a registry record:
 *
 *   sidewalk spines   ← streets[] walk bands + routes.pedestrian lane law
 *                       (Kestrel z ±6.5, Gable 35/46.5, Marlow −34.6/−46.5,
 *                       Juniper/Sycamore x ∓82.5/∓61.5), validated to sit
 *                       INSIDE their registry bands at build time;
 *   bypass bends      ← building footprints that block a lane (the SUB-01
 *                       and SUB-02 control houses sit in the Kestrel walk
 *                       bands — the graph skirts them on the curb-cut line,
 *                       exactly what a real pedestrian does);
 *   crossings         ← crosswalks[] with coordinates + the sixteen GJ/GS/
 *                       MJ/MS legs the registry describes by pattern
 *                       ("XW-GJ-*": ix ± 3.5 across the street, iz ± 4.5
 *                       across the avenue — the shipped zebra layout);
 *   door nodes        ← buildings[] entrance[] (the contract's seed set);
 *   lobby nodes       ← interiors[] shells, joined by ONE door edge (the
 *                       contract's `door:<id>` arbitration resource);
 *   landings          ← the SUB-01 stair (the mezzanine's street door);
 *   paths             ← parks[] bbox centers + the two registry pedestrian
 *                       shortcuts (R-ALLEY, R-GARDEN) through the ALY slots.
 *
 * Determinism: every position is arithmetic over registry numbers — no
 * RNG, no wall clock, no Math.random, no module state. Two builds over
 * the same document serialize byte-identically (pinned by test).
 *
 * Honest gaps are REPORTED, not papered over: an entrance walled in by
 * the shipped geometry (KTN-07's south door behind KTN-06, TEN-01's first
 * door behind the SUB-02 house, the Times Square row beyond the walked
 * extent) is skipped with a note — a reported content dependency, not
 * invented access.
 */

import type { WorldRegistry, RegistryFootprint } from '../registry';
import { NavGraph, footprintsOf, type NavNode, type NavSurface, type NavNodeKind } from './graph';

// ------------------------------------------------------------- lane law ----

/** The walking lane offsets per street, cited from routes.pedestrian (the
 *  registry's own lane law). Validated against the walk bands at build
 *  time — if the registry moves a band, the builder throws instead of
 *  walking a body through a wall. */
const LANES: Record<string, Array<{ side: 'N' | 'S' | 'W' | 'E'; off: number }>> = {
  'STR-KESTREL': [{ side: 'N', off: 6.5 }, { side: 'S', off: -6.5 }],    // R-KESTREL-N/S: z 6.1–6.9 / −6.85..−6.15
  'STR-GABLE': [{ side: 'S', off: 35 }, { side: 'N', off: 46.5 }],       // R-GABLE-MARLOW: 35/46.5 (the stoops own 32..34.4)
  'STR-MARLOW': [{ side: 'N', off: -34.6 }, { side: 'S', off: -46.5 }],  // R-GABLE-MARLOW: −34.6/−46.5 (stoops own −33.5..−31.6)
  'STR-JUNIPER': [{ side: 'W', off: -82.5 }, { side: 'E', off: -61.5 }], // R-AVENUES
  'STR-SYCAMORE': [{ side: 'W', off: 61.5 }, { side: 'E', off: 82.5 }],  // R-AVENUES
};

const X_SPAN: [number, number] = [-84, 84];  // EW lanes' extent (registry spanX)
const Z_SPAN: [number, number] = [-48, 48];  // NS spines' extent (the district's content extent)
const GRID_STEP = 6;          // spine node spacing (m)
const WALKER_CLEAR = 0.55;    // lane-vs-footprint clearance (m)
const WALK_WIDTH = 2.5;       // sidewalk corridor width
const CROSS_WIDTH = 3.4;      // the registry zebra width
const DOOR_WIDTH = 1.4;       // a door corridor
const CONNECT_RADIUS = 10;    // door/park approach reach (m)

/** Passable footprints — the registry declares them as footprints, but
 *  pedestrians legitimately cross them: ALY-01/ALY-02 are the alley slots
 *  (R-ALLEY/R-GARDEN are real shortcuts), and SUB-01's footprint is the
 *  globe-stair housing whose south face IS the public entrance. */
export const PASSABLE_FOOTPRINTS = new Set(['ALY-01', 'ALY-02', 'SUB-01']);

export interface NavBuildResult {
  graph: NavGraph;
  /** Destinations: place id → the node a route ends at. */
  placeNode: Map<string, string>;
  /** `door:<buildingId>` → the door edge's sidewalk-side node. */
  doorNode: Map<string, string>;
  /** Entrances/paths that could not be connected (content deps). */
  notes: string[];
}

interface LaneWork {
  streetId: string;
  side: string;
  axis: 'EW' | 'NS';
  lane: number;                 // the fixed coordinate (z for EW, x for NS)
  bandLo: number; bandHi: number; // the walk band (skirt search bounds)
}

type Pt = { along: number; across: number; id?: string; kind: NavNodeKind; surface: NavSurface; places?: string[] };

export function buildNavGraph(registry: WorldRegistry): NavBuildResult {
  const doc = registry.doc;
  const graph = new NavGraph();
  const placeNode = new Map<string, string>();
  const doorNode = new Map<string, string>();
  const notes: string[] = [];
  const footprints = footprintsOf(doc);

  // ---- 1. the lanes (validated against the registry bands) ---------------
  const lanes: LaneWork[] = [];
  for (const street of doc.streets ?? []) {
    const laneDefs = LANES[street.id];
    if (!laneDefs) { notes.push(`street ${street.id}: no lane law — not walked`); continue; }
    const axis = street.axis === 'NS' ? 'NS' : 'EW';
    for (const def of laneDefs) {
      let bandLo: number, bandHi: number;
      if (axis === 'EW') {
        const band = def.side === 'N' ? street.walkN : street.walkS;
        if (!band || band.zMin === undefined || band.zMax === undefined) {
          throw new Error(`nav lane ${street.id}/${def.side}: registry has no walk band`);
        }
        bandLo = band.zMin; bandHi = band.zMax;
        if (def.off < bandLo + 0.05 || def.off > bandHi - 0.05) {
          throw new Error(`nav lane ${street.id}/${def.side} z ${def.off} outside registry band ${bandLo}..${bandHi}`);
        }
        const road = street.road;
        if (road?.zMin !== undefined && road?.zMax !== undefined
          && def.off > road.zMin - 0.05 && def.off < road.zMax + 0.05) {
          throw new Error(`nav lane ${street.id}/${def.side} z ${def.off} inside the road band`);
        }
      } else {
        bandLo = Z_SPAN[0]; bandHi = Z_SPAN[1];
        const road = street.road;
        if (road?.xMin !== undefined && road?.xMax !== undefined
          && def.off > road.xMin - 0.05 && def.off < road.xMax + 0.05) {
          throw new Error(`nav lane ${street.id}/${def.side} x ${def.off} inside the road band`);
        }
      }
      lanes.push({ streetId: street.id, side: def.side, axis, lane: def.off, bandLo, bandHi });
    }
  }

  // ---- 2. crossings (concrete + the four pattern intersections) ----------
  interface Crossing { id: string; x: number; z: number; ns: boolean }
  const crossings: Crossing[] = [];
  for (const xw of doc.crosswalks ?? []) {
    if (typeof xw.x !== 'number' || typeof xw.z !== 'number') continue; // pattern entries
    crossings.push({ id: xw.id, x: xw.x, z: xw.z, ns: xw.axis === 'NS' });
  }
  for (const [cx, cz, tag] of [[-72, 40, 'GJ'], [72, 40, 'GS'], [-72, -40, 'MJ'], [72, -40, 'MS']] as const) {
    crossings.push({ id: `XW-${tag}-E`, x: cx + 3.5, z: cz, ns: false });
    crossings.push({ id: `XW-${tag}-W`, x: cx - 3.5, z: cz, ns: false });
    crossings.push({ id: `XW-${tag}-N`, x: cx, z: cz + 4.5, ns: true });
    crossings.push({ id: `XW-${tag}-S`, x: cx, z: cz - 4.5, ns: true });
  }

  // ---- 3. splices per lane (crossing endpoints, alley mouths, junctions) --
  const splices = new Map<LaneWork, Pt[]>();
  const pushSplice = (lane: LaneWork, p: Pt): void => {
    const arr = splices.get(lane) ?? [];
    arr.push(p);
    splices.set(lane, arr);
  };
  const laneFor = (streetId: string, side: string): LaneWork | null =>
    lanes.find((l) => l.streetId === streetId && l.side === side) ?? null;

  for (const xw of crossings) {
    if (xw.x < X_SPAN[0] - 1 || xw.x > X_SPAN[1] + 1 || xw.z < Z_SPAN[0] - 1 || xw.z > Z_SPAN[1] + 1) continue;
    graph.addNode({ id: `nav:xw:${xw.id}`, x: xw.x, z: xw.z, kind: 'crossing', surface: 'crosswalk', places: [] });
    const hitStreet = xw.ns ? nsStreetAt(doc, xw.x) : ewStreetAt(doc, xw.z);
    if (!hitStreet) { notes.push(`crosswalk ${xw.id}: no street found — skipped`); continue; }
    const sides: Array<'N' | 'S' | 'W' | 'E'> = xw.ns ? ['W', 'E'] : ['N', 'S'];
    for (const side of sides) {
      const lane = laneFor(hitStreet, side);
      if (!lane) { notes.push(`crosswalk ${xw.id}: street ${hitStreet} has no ${side} lane`); continue; }
      pushSplice(lane, {
        along: xw.ns ? xw.z : xw.x, across: lane.lane,
        id: `nav:xw:${xw.id}:${side.toLowerCase()}`, kind: 'sidewalk', surface: 'sidewalk',
      });
    }
  }

  // junctions where EW lanes cross NS spines (shared sidewalk corner)
  for (const ew of lanes.filter((l) => l.axis === 'EW')) {
    for (const ns of lanes.filter((l) => l.axis === 'NS')) {
      const jx = ns.lane, jz = ew.lane;
      if (!pointClear(jx, jz, footprints, 0.3)) continue;
      const jid = `nav:jx:${ns.streetId}:${ns.side}:${ew.streetId}:${ew.side}`;
      pushSplice(ew, { along: jx, across: jz, id: jid, kind: 'sidewalk', surface: 'sidewalk' });
      pushSplice(ns, { along: jz, across: jx, id: jid, kind: 'sidewalk', surface: 'sidewalk' });
    }
  }

  // the alley mouths splice into the Kestrel north lane BEFORE assembly
  // (R-ALLEY / R-GARDEN — the registry's own pedestrian shortcuts)
  const kestrelN = laneFor('STR-KESTREL', 'N');
  if (kestrelN) {
    pushSplice(kestrelN, { along: 32.1, across: 6.5, id: 'nav:path:R-ALLEY:mouth', kind: 'sidewalk', surface: 'sidewalk' });
    pushSplice(kestrelN, { along: 7.75, across: 6.5, id: 'nav:path:R-GARDEN:mouth', kind: 'sidewalk', surface: 'sidewalk' });
  }

  // ---- 4. assemble the lane chains ----------------------------------------
  for (const lane of lanes) assembleLane(lane, splices.get(lane) ?? [], footprints, graph, notes);

  // crossing edges: crossing node ↔ its two endpoints
  for (const xw of crossings) {
    if (!graph.hasNode(`nav:xw:${xw.id}`)) continue;
    for (const side of ['n', 's', 'w', 'e'] as const) {
      const endId = `nav:xw:${xw.id}:${side}`;
      if (graph.hasNode(endId)) {
        graph.addEdge(`nav:xw:${xw.id}`, endId, 'cross', CROSS_WIDTH, `xw:${xw.id}`);
      }
    }
  }

  // ---- 5. parks, plazas, and the two registry shortcuts -------------------
  const link = (a: NavNode, b: NavNode, kind: 'walk' | 'lane'): boolean => {
    if (!graph.hasNode(a.id)) graph.addNode(a);
    if (!graph.hasNode(b.id)) graph.addNode(b);
    if (!segmentClear(a.x, a.z, b.x, b.z, footprints, PASSABLE_FOOTPRINTS)) return false;
    graph.addEdge(a.id, b.id, kind, WALK_WIDTH);
    return true;
  };

  const mouthOf = (id: string, x: number, z: number): NavNode =>
    (graph.node(id) as NavNode) ?? { id, x, z, kind: 'sidewalk', surface: 'sidewalk', places: [] };

  // the alley chains: registry geometry (ALY footprints + R-ALLEY/R-GARDEN)
  const alleyMouth = mouthOf('nav:path:R-ALLEY:mouth', 32.1, 6.5);
  const gardenMouth = mouthOf('nav:path:R-GARDEN:mouth', 7.75, 6.5);
  const alleyA: NavNode = { id: 'nav:path:R-ALLEY:a', x: 32.1, z: 10.6, kind: 'path', surface: 'path', places: [] };
  const alleyB: NavNode = { id: 'nav:path:R-ALLEY:b', x: 32.1, z: 20, kind: 'path', surface: 'path', places: [] };
  const gardenA: NavNode = { id: 'nav:path:R-GARDEN:a', x: 7.75, z: 20, kind: 'path', surface: 'path', places: [] };
  const gardenGate: NavNode = { id: 'nav:path:R-GARDEN:gate', x: 4, z: 24, kind: 'path', surface: 'path', places: ['GRD-GABLE'] };
  const green: NavNode = { id: 'nav:path:PRK-GREEN', x: 18.5, z: 25.5, kind: 'path', surface: 'path', places: ['PRK-GREEN'] };
  const garden: NavNode = { id: 'nav:path:GRD-GABLE', x: -2.2, z: 25, kind: 'path', surface: 'path', places: ['GRD-GABLE'] };

  const attach = (node: NavNode, chain: Array<[NavNode, 'walk' | 'lane']>): void => {
    if (!graph.hasNode(node.id)) graph.addNode(node);
    for (const [to, kind] of chain) {
      if (!link(node, to, kind)) notes.push(`path ${node.id}→${to.id}: segment blocked — skipped`);
    }
  };

  attach(alleyA, [[alleyMouth, 'lane']]);
  attach(alleyB, [[alleyA, 'lane']]);
  attach(green, [[alleyB, 'lane']]);
  placeNode.set('PRK-GREEN', green.id);
  attach(gardenA, [[gardenMouth, 'lane']]);
  attach(gardenGate, [[gardenA, 'lane'], [green, 'lane']]);
  attach(garden, [[gardenGate, 'lane']]);
  placeNode.set('GRD-GABLE', garden.id);

  for (const p of doc.parks ?? []) {
    const bb = p.bbox;
    if (!bb) continue;
    if (p.id === 'PRK-GREEN' || p.id === 'GRD-GABLE') continue; // served by the chains above
    const cx = (bb.xMin + bb.xMax) / 2, cz = (bb.zMin + bb.zMax) / 2;
    const surface: NavSurface = p.id === 'PRK-PLAZA' ? 'plaza' : 'path';
    const node: NavNode = { id: `nav:path:${p.id}`, x: round2(cx), z: round2(cz), kind: 'path', surface, places: [p.id] };
    if (!connectToLanes(graph, node, footprints, notes, 2)) {
      notes.push(`park ${p.id}: no clear approach — isolated path`);
    }
    placeNode.set(p.id, node.id);
  }

  // ---- 6. building doors (the contract's seed set) ------------------------
  const landing: NavNode = { id: 'nav:landing:SUB-01', x: -42, z: 6.2, kind: 'landing', surface: 'grade', places: ['SUB-01'] };
  graph.addNode(landing);
  placeNode.set('SUB-01', landing.id);
  doorNode.set('door:SUB-01', landing.id);
  if (!connectToLanes(graph, landing, footprints, notes, 3)) {
    notes.push('landing SUB-01: no clear approach — the stair is stranded');
  }

  for (const b of doc.buildings ?? []) {
    const ents = b.entrance ?? [];
    if (!ents.length || b.id === 'SUB-01') continue;
    let firstConnected: string | null = null;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (e.x < X_SPAN[0] || e.x > X_SPAN[1] || e.z < Z_SPAN[0] || e.z > Z_SPAN[1]) {
        notes.push(`door ${b.id}[${i}]: outside the walked extent (${e.x}, ${e.z}) — skipped`);
        continue;
      }
      const doorId = i === 0 ? `nav:door:${b.id}` : `nav:door:${b.id}:${i}`;
      const doorN: NavNode = { id: doorId, x: e.x, z: e.z, kind: 'sidewalk', surface: 'sidewalk', places: [b.id] };
      graph.addNode(doorN);
      if (!connectToLanes(graph, doorN, footprints, notes, 1)) {
        // a walled-in door leaves the graph cleaner absent than orphaned
        graph.removeNode(doorId);
        notes.push(`door ${b.id}[${i}]: no clear approach — walled in by shipped geometry`);
        continue;
      }
      if (firstConnected === null) firstConnected = doorId;
    }
    if (firstConnected !== null) {
      placeNode.set(b.id, firstConnected);
      doorNode.set(`door:${b.id}`, firstConnected);
    }
  }

  // ---- 7. interiors: lobby nodes + the one door edge ----------------------
  for (const it of doc.interiors ?? []) {
    const s = it.shell;
    if (!s || s.xMin === undefined || s.xMax === undefined || s.zMin === undefined || s.zMax === undefined) continue;
    const sz0 = Math.min(s.zMin, s.zMax), sz1 = Math.max(s.zMin, s.zMax);
    const cx = (s.xMin + s.xMax) / 2, cz = (sz0 + sz1) / 2;
    if (cx < X_SPAN[0] || cx > X_SPAN[1] || cz < Z_SPAN[0] || cz > Z_SPAN[1]) {
      notes.push(`interior ${it.id}: outside the walked extent — no lobby (a transit ride, not pedestrian space)`);
      continue;
    }
    const lobbyId = `nav:lobby:${it.id}`;
    graph.addNode({ id: lobbyId, x: round2(cx), z: round2(cz), kind: 'lobby', surface: 'interior', places: [it.id] });
    placeNode.set(it.id, lobbyId);
    if (it.id === 'MEZZ-INT') {
      graph.addEdge('nav:landing:SUB-01', lobbyId, 'door', DOOR_WIDTH, 'door:SUB-01');
    } else {
      const doorId = doorNode.get(`door:${it.building}`);
      if (doorId) graph.addEdge(doorId, lobbyId, 'door', DOOR_WIDTH, `door:${it.building}`);
      else notes.push(`interior ${it.id}: building ${it.building} has no connected door — lobby isolated`);
    }
  }

  return { graph, placeNode, doorNode, notes };
}

// ------------------------------------------------------------- helpers ----

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function ewStreetAt(doc: { streets?: Array<{ id: string; axis?: string; road?: { zMin?: number; zMax?: number } }> }, z: number): string | null {
  for (const s of doc.streets ?? []) {
    if (s.axis === 'NS') continue;
    const r = s.road;
    if (r?.zMin !== undefined && r?.zMax !== undefined && z >= r.zMin - 4 && z <= r.zMax + 4) return s.id;
  }
  return null;
}

function nsStreetAt(doc: { streets?: Array<{ id: string; axis?: string; road?: { xMin?: number; xMax?: number } }> }, x: number): string | null {
  for (const s of doc.streets ?? []) {
    if (s.axis !== 'NS') continue;
    const r = s.road;
    if (r?.xMin !== undefined && r?.xMax !== undefined && x >= r.xMin - 4 && x <= r.xMax + 4) return s.id;
  }
  return null;
}

function pointClear(x: number, z: number, footprints: Array<{ id: string; fp: RegistryFootprint }>, clear: number): boolean {
  for (const { id, fp } of footprints) {
    if (clear > 0 && (fp.x - fp.w / 2 - clear < x && x < fp.x + fp.w / 2 + clear)
      && (fp.z - fp.d / 2 - clear < z && z < fp.z + fp.d / 2 + clear)) {
      if (!PASSABLE_FOOTPRINTS.has(id)) return false;
    }
  }
  return true;
}

function segmentClear(
  x0: number, z0: number, x1: number, z1: number,
  footprints: Array<{ id: string; fp: RegistryFootprint }>,
  exempt?: ReadonlySet<string>,
): boolean {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const steps = Math.max(2, Math.ceil(len / 0.4));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    for (const { id, fp } of footprints) {
      if (exempt?.has(id)) continue;
      if (x > fp.x - fp.w / 2 + 0.05 && x < fp.x + fp.w / 2 - 0.05
        && z > fp.z - fp.d / 2 + 0.05 && z < fp.z + fp.d / 2 - 0.05) return false;
    }
  }
  return true;
}

/** One lane chain: base grid + splices, with curb-cut bypass bends around
 *  every footprint that blocks the lane. Deterministic; pure. */
function assembleLane(
  work: LaneWork,
  splicePts: Pt[],
  footprints: Array<{ id: string; fp: RegistryFootprint }>,
  graph: NavGraph,
  notes: string[],
): void {
  // collect blocked spans along this lane
  const blocked: Array<{ a0: number; a1: number; z0: number; z1: number }> = [];
  for (const { id: bId, fp } of footprints) {
    if (PASSABLE_FOOTPRINTS.has(bId)) continue;
    const fx0 = fp.x - fp.w / 2, fx1 = fp.x + fp.w / 2;
    const fz0 = fp.z - fp.d / 2, fz1 = fp.z + fp.d / 2;
    if (work.axis === 'EW') {
      if (work.lane > fz0 - WALKER_CLEAR && work.lane < fz1 + WALKER_CLEAR
        && fx1 > X_SPAN[0] && fx0 < X_SPAN[1]) {
        blocked.push({ a0: fx0, a1: fx1, z0: fz0, z1: fz1 });
      }
    } else {
      if (work.lane > fx0 - WALKER_CLEAR && work.lane < fx1 + WALKER_CLEAR
        && fz1 > Z_SPAN[0] && fz0 < Z_SPAN[1]) {
        blocked.push({ a0: fz0, a1: fz1, z0: fx0, z1: fx1 });
      }
    }
  }

  // ordered construction: every point belongs to an atomic RUN (a base
  // point, a splice, or a 4-point bend weave) — runs sort by along-lane
  // position, and a bend weave's internal order is explicit (out, skirt
  // run, back). Sorting bare points would put the far mouth's lane point
  // before its skirt point and weave a diagonal straight through the
  // blocked footprint — the bug this structure exists to prevent.
  type Run = { at: number; pts: Pt[] };
  const runs: Run[] = [];
  const [lo, hi] = work.axis === 'EW' ? X_SPAN : Z_SPAN;
  for (let c = lo; c <= hi + 1e-9; c += GRID_STEP) {
    const cc = round2(c);
    if (!blocked.some((b) => cc > b.a0 - WALKER_CLEAR && cc < b.a1 + WALKER_CLEAR)) {
      runs.push({ at: cc, pts: [{ along: cc, across: work.lane, kind: 'sidewalk', surface: 'sidewalk' }] });
    }
  }
  for (const b of blocked) {
    const skirt = skirtFor(work, b, footprints);
    if (skirt === null) {
      notes.push(`lane ${work.streetId}/${work.side}: blocked span ${round2(b.a0)}..${round2(b.a1)} has no passable skirt`);
      continue;
    }
    runs.push({
      at: round2(b.a0 - WALKER_CLEAR),
      pts: [
        { along: round2(b.a0 - WALKER_CLEAR), across: work.lane, kind: 'sidewalk', surface: 'sidewalk' },
        { along: round2(b.a0 - WALKER_CLEAR), across: skirt, kind: 'sidewalk', surface: 'sidewalk' },
        { along: round2(b.a1 + WALKER_CLEAR), across: skirt, kind: 'sidewalk', surface: 'sidewalk' },
        { along: round2(b.a1 + WALKER_CLEAR), across: work.lane, kind: 'sidewalk', surface: 'sidewalk' },
      ],
    });
  }
  for (const s of splicePts) runs.push({ at: s.along, pts: [s] });

  runs.sort((a, b) => a.at - b.at);
  const chain: Pt[] = [];
  for (const run of runs) {
    for (const p of run.pts) {
      const last = chain[chain.length - 1];
      if (last && Math.abs(last.along - p.along) < 0.05 && Math.abs(last.across - p.across) < 0.05) continue;
      chain.push(p);
    }
  }

  let prevId: string | null = null;
  for (const p of chain) {
    const x = work.axis === 'EW' ? p.along : p.across;
    const z = work.axis === 'EW' ? p.across : p.along;
    const id = p.id ?? nodeIdFor(work, p);
    if (!graph.hasNode(id)) {
      graph.addNode({ id, x, z, kind: p.kind, surface: p.surface, places: p.places ?? [] });
    }
    if (prevId !== null && prevId !== id) graph.addEdge(prevId, id, edgeKindFor(work), WALK_WIDTH);
    prevId = id;
  }
}

/** Stable node id for a chain point (base grid / bend points). */
function nodeIdFor(work: LaneWork, p: Pt): string {
  const skirt = Math.abs(p.across - work.lane) > 0.01;
  return `nav:sp:${work.streetId}:${work.side}:${p.along}${skirt ? `s${round2(p.across)}` : ''}`;
}

function edgeKindFor(work: LaneWork): 'walk' | 'lane' {
  return work.axis === 'NS' ? 'lane' : 'walk';
}

/** The skirt line around a blocked span: an outside skirt on either side
 *  if it stays in the band and runs clear; otherwise the curb cut — the
 *  sliver between the footprint face and the band edge (the real
 *  pedestrian answer around a control house). Null = impassable. */
function skirtFor(
  work: LaneWork,
  b: { a0: number; a1: number; z0: number; z1: number },
  footprints: Array<{ id: string; fp: RegistryFootprint }>,
): number | null {
  const outLo = b.z0 - WALKER_CLEAR;
  const outHi = b.z1 + WALKER_CLEAR;
  const curbLo = b.z0 - (b.z0 - work.bandLo) / 2;
  const curbHi = b.z1 + (work.bandHi - b.z1) / 2;
  const cands = [outLo, outHi, curbLo, curbHi].sort(
    (x, y) => Math.abs(x - work.lane) - Math.abs(y - work.lane),
  );
  for (const s of cands) {
    if (s < work.bandLo + 0.05 || s > work.bandHi - 0.05) continue;
    // the full bypass must run clear: two steps + the skirt run
    const stepsClear = segmentClear(b.a0 - WALKER_CLEAR, work.lane, b.a0 - WALKER_CLEAR, s, footprints, PASSABLE_FOOTPRINTS)
      && segmentClear(b.a1 + WALKER_CLEAR, work.lane, b.a1 + WALKER_CLEAR, s, footprints, PASSABLE_FOOTPRINTS);
    const runClear = segmentClear(b.a0 - WALKER_CLEAR, s, b.a1 + WALKER_CLEAR, s, footprints, PASSABLE_FOOTPRINTS);
    if (stepsClear && runClear) return round2(s);
  }
  return null;
}

/** Connect a leaf node (door, landing, park) to the nearest lane nodes
 *  whose straight approach is clear. Returns true when ≥1 edge landed. */
function connectToLanes(
  graph: NavGraph,
  leaf: NavNode,
  footprints: Array<{ id: string; fp: RegistryFootprint }>,
  notes: string[],
  maxLinks: number,
): boolean {
  const cands: Array<{ id: string; d: number }> = [];
  for (const [id, n] of graph.nodes) {
    if (n.kind !== 'sidewalk') continue;
    const d = Math.hypot(n.x - leaf.x, n.z - leaf.z);
    if (d > CONNECT_RADIUS || d < 0.05) continue;
    cands.push({ id, d });
  }
  cands.sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
  let linked = 0;
  for (const c of cands) {
    if (linked >= maxLinks) break;
    const n = graph.node(c.id)!;
    if (!segmentClear(leaf.x, leaf.z, n.x, n.z, footprints, PASSABLE_FOOTPRINTS)) continue;
    graph.addEdge(leaf.id, c.id, 'walk', WALK_WIDTH);
    linked++;
  }
  void notes;
  return linked > 0;
}
