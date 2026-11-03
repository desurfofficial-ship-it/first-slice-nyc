/**
 * Train + tunnel kit — the K train (two cars, parked) and the tunnel that
 * carries it between the two stations.
 *
 * The train never moves (see ride.ts for the law). What moves is the
 * TUNNEL: during a ride the tunnel scenery group slides past the windows,
 * the car sways, and the player stands in a car that is honest about being
 * a set — right up until the doors open on a different district.
 *
 * Clearances (pinned): car roof -1.0 · tunnel ceiling underside -0.9 ·
 * portal lintels -0.9 · car floor -3.2 = platform floor (level boarding) ·
 * car body z 14.7..17.2 inside the trench 14.45..17.45.
 */

import * as THREE from 'three';
import { STATION, type KitCtx } from './stationKit';

const CAR = {
  len: 12.4,
  halfW: 1.25,       // z 14.7..17.2
  floorTop: STATION.floorTop,   // -3.2, level boarding
  floorBottom: -3.35,
  roofTop: -1.0,
  roofBottom: -1.2,
  doorW: 1.3,
  doorH: 2.0,
  doorRel: 3.1,      // door centers at cx ∓ 3.1
} as const;

export interface TrainDoors {
  /** The sliding leaves of the interactive door (world animates these). */
  leaves: [THREE.Mesh, THREE.Mesh];
  /** Closed position x for each leaf (the open offset is ±0.68). */
  closedX: [number, number];
  /** The collider spec while the door is shut (world adds/removes it). */
  collider: { x: number; y: number; z: number; w: number; h: number; d: number };
}

function box(
  ctx: KitCtx, name: string,
  cx: number, cy: number, cz: number, sx: number, sy: number, sz: number,
  color: number, opts: { collide?: boolean; emissive?: number; ei?: number } = {},
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), ctx.M(color, opts.emissive !== undefined ? { emissive: opts.emissive, emissiveIntensity: opts.ei } : undefined));
  m.name = name;
  m.position.set(cx, cy, cz);
  ctx.g.add(m);
  if (opts.collide !== false) ctx.col({ x: cx, y: cy, z: cz, w: sx, h: sy, d: sz });
  return m;
}

/** One parked car. `interactiveDoorRel` (±3.1 or null): the one opening
 *  whose leaves the world animates; every other opening ships shuttered. */
function buildCar(
  ctx: KitCtx, cx: number, interactiveDoorRel: number | null,
): TrainDoors | null {
  const C = CAR;
  const shell = 0x9aa0a6;
  const stripe = 0xF7B32B;
  const floorY = (C.floorTop + C.floorBottom) / 2;
  const wallY = (C.floorTop + C.roofBottom) / 2;   // -2.2
  const wallH = C.roofBottom - C.floorTop;         // 2.0

  // floor, roof
  box(ctx, `SUB_CarFloor_${cx}`, cx, floorY, STATION.trackZ, C.len, 0.15, C.halfW * 2, 0x4a4550, { collide: false });
  box(ctx, `SUB_CarRoof_${cx}`, cx, (C.roofTop + C.roofBottom) / 2, STATION.trackZ, C.len, C.roofTop - C.roofBottom, C.halfW * 2, shell, { collide: false });
  // the yellow stripe that says K line
  box(ctx, `SUB_CarStripe_${cx}`, cx, -1.35, STATION.trackZ, C.len, 0.16, C.halfW * 2 + 0.04, stripe, { collide: false });

  // body segments along the south face (platform side, z -), north face (+z)
  const zS = STATION.trackZ - C.halfW;
  const zN = STATION.trackZ + C.halfW;

  // south face: two door openings at ∓3.1, windows between and beyond.
  // Segments (rel): [-6.2..-3.75] wall · [-3.75..-2.45] DOOR · [-2.45..2.45]
  // wall-with-2-windows · [2.45..3.75] DOOR · [3.75..6.2] wall.
  const segs: Array<[number, number]> = [[-6.2, -3.75], [-2.45, 2.45], [3.75, 6.2]];
  segs.forEach(([a, b], i) => {
    box(ctx, `SUB_CarBodyS_${cx}_${i}`, cx + (a + b) / 2, wallY, zS, b - a, wallH, 0.12, shell);
  });
  // north face: solid wall with 3 window insets (dark glass reads fine)
  box(ctx, `SUB_CarBodyN_${cx}`, cx, wallY, zN, C.len, wallH, 0.12, shell);
  for (const wx of [-3.6, 0, 3.6]) {
    box(ctx, `SUB_CarWin_${cx}_${wx}`, cx + wx, -2.0, zN + 0.02, 1.5, 0.9, 0.03, 0x2c3440, { collide: false });
  }
  // Priya's window diagram (docs/02 Subway University, docs/51 B11): two
  // chalk strokes on the middle window's inside face — one dips "under the
  // river", one "stays with the lights". Hidden until the ride's
  // 'priya-lines' beat flips it on (subway/index owns the toggle); built
  // only in the ALIGNED car of each station so the swap seam never shows
  // the trick (the cars are twins — the diagram rides both). Box segments
  // with small kinks: hand-drawn in the house lowpoly voice, chalk-gold
  // (the stripe's color) and river-teal, no new palette entries.
  if (interactiveDoorRel !== null) {
    const wz = zN - 0.07; // the car side of the middle window's glass
    const chalk = (name: string, mx: number, my: number, len: number, rot: number, color: number) => {
      const m = box(ctx, name, cx + mx, my, wz, len, 0.05, 0.02, color, { collide: false, emissive: color, ei: 0.4 });
      m.rotation.z = rot;
      m.visible = false;
      return m;
    };
    // "stays with the lights" — level with a tiny sag (gold, the K stripe)
    chalk(`SUB_Diagram_${cx}_lights_a`, -0.31, -1.76, 0.64, -0.05, 0xF7B32B);
    chalk(`SUB_Diagram_${cx}_lights_b`, 0.31, -1.78, 0.64, 0.05, 0xF7B32B);
    // "under the river" — the dip (teal, the house river color)
    chalk(`SUB_Diagram_${cx}_river_a`, -0.3, -2.02, 0.7, 0.36, 0x2A9D8F);
    chalk(`SUB_Diagram_${cx}_river_b`, 0.3, -2.02, 0.7, -0.36, 0x2A9D8F);
  }
  // end walls — dressed as the operator's cab (docs/50 §4.5): a door and a
  // tinted glass inset on EVERY end (married pairs drive from both ends).
  // The glass is dark on purpose: the cab is the operator's office, and the
  // ride's honesty ("the tunnel moves, the train doesn't") never has to
  // survive a stare down the front of the car.
  for (const [ex, tag] of [[cx - C.len / 2, 'w'], [cx + C.len / 2, 'e']] as const) {
    box(ctx, `SUB_CarEnd_${cx}_${tag}`, ex, wallY, STATION.trackZ, 0.14, wallH, C.halfW * 2, shell);
    box(ctx, `SUB_CabGlass_${cx}_${tag}`, ex + (tag === 'w' ? 0.09 : -0.09), C.floorTop + 1.42, STATION.trackZ, 0.03, 0.62, 1.05, 0x2c3440, { collide: false });
    box(ctx, `SUB_CabDoor_${cx}_${tag}`, ex + (tag === 'w' ? 0.1 : -0.1), C.floorTop + 0.95, STATION.trackZ - C.halfW + 0.5, 0.02, 1.75, 0.75, 0x3a3a42, { collide: false });
  }

  // interior: lengthwise benches both sides (solid — the aisle is the walk),
  // poles, handrail
  for (const bz of [zS + 0.42, zN - 0.42]) {
    box(ctx, `SUB_CarBench_${cx}_${bz < STATION.trackZ ? 's' : 'n'}`, cx, C.floorTop + 0.25, bz, 8.8, 0.5, 0.55, 0x8a5a3a);
  }
  for (const px of [cx - 3.9, cx - 1.9, cx + 1.9, cx + 3.9]) {
    box(ctx, `SUB_CarPole_${cx}_${px.toFixed(1)}`, px, C.floorTop + 1.0, STATION.trackZ, 0.06, 2.0, 0.06, 0x9aa0a6, { collide: false });
  }
  box(ctx, `SUB_CarRail_${cx}`, cx, C.roofBottom - 0.18, STATION.trackZ, 10.5, 0.05, 0.05, 0xd8d8d8, { collide: false });

  // door openings: leaves for the interactive one, shutters for the rest
  let doors: TrainDoors | null = null;
  for (const rel2 of [-C.doorRel, C.doorRel]) {
    const dx = cx + rel2;
    const interactive = interactiveDoorRel !== null && Math.abs(rel2 - interactiveDoorRel) < 0.01;
    if (interactive) {
      const leafY = C.floorTop + C.doorH / 2;
      const l1 = box(ctx, `SUB_DoorLeaf_${cx}_a`, dx - C.doorW / 4, leafY, zS + 0.02, C.doorW / 2, C.doorH, 0.08, 0xB23A48, { collide: false });
      const l2 = box(ctx, `SUB_DoorLeaf_${cx}_b`, dx + C.doorW / 4, leafY, zS + 0.02, C.doorW / 2, C.doorH, 0.08, 0xB23A48, { collide: false });
      doors = {
        leaves: [l1, l2],
        closedX: [dx - C.doorW / 4, dx + C.doorW / 4],
        collider: { x: dx, y: leafY, z: zS + 0.02, w: C.doorW, h: C.doorH, d: 0.1 },
      };
    } else {
      box(ctx, `SUB_DoorShut_${cx}_${rel2 > 0 ? 'e' : 'w'}`, dx, C.floorTop + C.doorH / 2, zS + 0.02, C.doorW, C.doorH, 0.08, 0xB23A48);
    }
  }

  // bogies + wheels hinted
  for (const bx of [cx - 4.2, cx + 4.2]) {
    box(ctx, `SUB_CarBogie_${cx}_${bx.toFixed(1)}`, bx, -3.75, STATION.trackZ, 2.4, 0.55, 1.8, 0x3a3a42, { collide: false });
  }
  return doors;
}

/**
 * One station's parked pair: the west car aligns to the platform (its
 * interactive door faces it), the east car sits shuttered in the tunnel.
 * Station B's pair is built with the same call at the translated center —
 * pixel-identical around the player by law (the swap seam depends on it).
 */
export function buildTrainPair(
  ctx: KitCtx, alignedCarCx: number, interactiveDoorRel: number,
): TrainDoors {
  const doors = buildCar(ctx, alignedCarCx, interactiveDoorRel);
  buildCar(ctx, alignedCarCx + 13, null); // the east car — shuttered
  if (!doors) throw new Error('train: interactive door missing');
  return doors;
}

// ------------------------------------------------------------------ tunnel

/** The tunnel between (and beyond) the stations: continuous north wall,
 *  ceiling and rails; the south wall is interrupted by the two platform
 *  openings. Light strips ride the north wall — the scenery the ride
 *  scrolls past the windows. */
export function buildTunnel(ctx: KitCtx, scenery: THREE.Group): void {
  const S = STATION;
  const xFrom = -350;
  const xTo = -20;
  const cy = (S.trenchTop + -0.8) / 2;            // -2.65
  const h = -0.8 - S.trenchTop;                   // 3.7

  // north wall (continuous) + ceiling + rails
  box(ctx, 'SUB_TunnelN', (xFrom + xTo) / 2, cy, S.zTrenchN + 0.15, xTo - xFrom, h, 0.3, 0x4a4550);
  box(ctx, 'SUB_TunnelCeiling', (xFrom + xTo) / 2, -0.85, S.trackZ, xTo - xFrom, 0.1, S.zTrenchN - S.zPlatformEdge, 0x3e3a46, { collide: false });
  for (const rz of [S.trackZ - 0.6, S.trackZ + 0.6]) {
    box(ctx, `SUB_Rail_${rz.toFixed(2)}`, (xFrom + xTo) / 2, -4.375, rz, xTo - xFrom, 0.15, 0.12, 0x6a6a72, { collide: false });
  }

  // south wall segments (platform openings at A: -52.15..-35.85, B: -340.15..-323.85)
  for (const [a, b] of [[xFrom, -340.15], [-323.85, -52.15], [-35.85, xTo]] as const) {
    if (b - a <= 0.01) continue;
    box(ctx, `SUB_TunnelS_${a.toFixed(0)}`, (a + b) / 2, cy, S.zPlatformEdge + 0.125, b - a, h, 0.25, 0x4a4550);
  }
  // floor segments (the stations own their trench floors)
  for (const [a, b] of [[xFrom, -340.15], [-323.85, -52.15], [-35.85, xTo]] as const) {
    if (b - a <= 0.01) continue;
    box(ctx, `SUB_TunnelFloor_${a.toFixed(0)}`, (a + b) / 2, S.trenchTop - 0.05, S.trackZ, b - a, 0.1, S.zTrenchN - S.zPlatformEdge, 0x3e3a46, { collide: false });
  }

  // ---- scenery (the ride scrolls this group +x past the windows) ----
  scenery.name = 'SUB_TunnelScenery';
  ctx.g.add(scenery);
  const sctx: KitCtx = { g: scenery, M: ctx.M, col: () => { /* scenery never collides */ } };
  // light strips every 7 m — the flicker Priya's window lesson rides on
  const stripGeo = new THREE.BoxGeometry(0.4, 0.08, 0.18);
  const stripMat = ctx.M(0xFFF8F0, { emissive: 0xFFF2CC, emissiveIntensity: 1.4 });
  const count = Math.floor((xTo - xFrom) / 7);
  const strips = new THREE.InstancedMesh(stripGeo, stripMat, count);
  strips.name = 'SUB_TunnelLights';
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    m4.setPosition(xFrom + 4 + i * 7, -1.05, S.zTrenchN - 0.1);
    strips.setMatrixAt(i, m4);
  }
  scenery.add(strips);
  // cable conduits along the north wall
  box(sctx, 'SUB_TunnelCable_1', (xFrom + xTo) / 2, -1.35, S.zTrenchN - 0.02, xTo - xFrom, 0.07, 0.07, 0x2c3440, { collide: false });
  box(sctx, 'SUB_TunnelCable_2', (xFrom + xTo) / 2, -1.55, S.zTrenchN - 0.02, xTo - xFrom, 0.05, 0.05, 0x2c3440, { collide: false });
  // wall panel ribs every 14 m — a rhythm to scroll past
  const ribGeo = new THREE.BoxGeometry(0.18, 2.6, 0.1);
  const ribMat = ctx.M(0x5a5460);
  const ribCount = Math.floor((xTo - xFrom) / 14);
  const ribs = new THREE.InstancedMesh(ribGeo, ribMat, ribCount);
  ribs.name = 'SUB_TunnelRibs';
  for (let i = 0; i < ribCount; i++) {
    m4.setPosition(xFrom + 8 + i * 14, -2.9, S.zTrenchN + 0.02);
    ribs.setMatrixAt(i, m4);
  }
  scenery.add(ribs);
}
