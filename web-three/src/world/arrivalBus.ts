/**
 * The M121 — the arrival bus, parked at the terminal curb bay.
 *
 * The shipped Day 1 starts on the sidewalk outside the terminal; the bus
 * that delivered you is part of that story but was never built. This is
 * the honest version: a real, enterable bus body at the BUS-02 bay —
 * board via the curb-side steps, stand where the driver's radio murmurs
 * a ball game, look west through the windshield down the avenue (the
 * skyline card at x −110 is already there — the reveal costs nothing).
 *
 * The body stands at cx −32.15 (the registry's BUS-04 bay, moved 2.15 m
 * west of its first pin): its TAIL must clear the loop M121's BUS-01 halt
 * nose (−26.5, forced east by the door-at-the-pole law and the van) and
 * its DOOR must sit west of that halt body — see docs/47 "the terminal
 * bay, made honest". One bay, one bus: while the loop M121 occupies the
 * bay this shell yields (World swaps visibility by BUS04_RECT); the tail
 * gap 0.15 m is what keeps the two rects disjoint through every halt.
 *
 * Names live under the BUS_M121 group; the DISTRICT bake skips that exact
 * name (the zone bake, though, now runs INSIDE the group — docs/51 B13
 * "the curb bake": the shell fuses per signature, the driver rig rides
 * the animated exclusion, and the group-level one-bay visibility swap is
 * untouched). The rig and the route sign are the only non-fusible parts:
 * the driver breathes; the sign carries its canvas map.
 */

import * as THREE from 'three';
import { PAL } from '../core/palette';
import { buildArticulatedPerson, updatePersonAnim } from './personRig';
import type { ColliderSpec } from './subway/stationKit';

const BUS = { cx: -32.15, z: 2.0, len: 11, halfW: 1.25, floorTop: 0.55, roof: 2.75 } as const;

/** The body's world footprint (the registry's BUS-04 interior bounds):
 *  the one bay's occupancy test — World hides this shell exactly while
 *  the loop M121's collider rect intersects it and the player is not
 *  standing inside. */
export const BUS04_RECT = { minX: -37.65, maxX: -26.65, minZ: 0.75, maxZ: 3.25 } as const;

/** The curb-side boarding step's footprint + top (BUS_Step_1). The builder
 *  places the box from these numbers and the occupancy law below reads
 *  them, so the mesh and the law can never drift apart. */
export const BUS04_STEP = {
  minX: -28.15, maxX: -27.15, // center x −27.65, width 1.0 — the door gap's line
  minZ: 3.3, maxZ: 3.9,       // center z zN + 0.35 = 3.6, depth 0.6
  top: 0.3,                   // one 0.2 rise off the sidewalk, 0.25 to the floor
} as const;

/** The one-bay occupancy law's player half (docs/51 B2): does this body
 *  hold the bay? True when the player stands inside BUS-04's registry
 *  interior — feet on the 0.55 floor, the y band keeping the street out —
 *  or MID-BOARD on the curb-side step: the one place a boarding player
 *  stands on the shell's own geometry OUTSIDE BUS04_RECT. Without the step
 *  branch the loop M121 could park on the bay while the player was boarding
 *  and retire the shell — step, floor and all — out from under their feet
 *  (and its own body then walled the door shut: docs/47's "one bay, one
 *  bus" fused-bus failure, back through the boarding window). */
export function playerOccupiesBus04(x: number, y: number, z: number): boolean {
  const insideRect = x > BUS04_RECT.minX && x < BUS04_RECT.maxX
    && z > BUS04_RECT.minZ && z < BUS04_RECT.maxZ;
  if (insideRect && y > 0.4) return true;
  // Mid-board: the capsule's center may hang a radius (0.35) off the step
  // while the feet stay on it; y 0.2..0.65 covers the step top (0.3) and
  // the first frame of the floor snap (0.55) without counting the sidewalk
  // (0.1) or the street inside the retired rect.
  return x > BUS04_STEP.minX - 0.4 && x < BUS04_STEP.maxX + 0.4
    && z > BUS04_STEP.minZ - 0.05 && z < BUS04_STEP.maxZ + 0.4
    && y > 0.2 && y < 0.65;
}

export interface ArrivalBus {
  group: THREE.Group;
  colliders: ColliderSpec[];
  anchors: {
    driver: { x: number; y: number; z: number };
    duffel: { x: number; y: number; z: number };
    door: { x: number; y: number; z: number };
  };
  update(dt: number): void;
}

function routeTexture(): THREE.Texture {
  // The node side (vitest) has no DOM: the curb-bake contract test builds
  // the shell headless. A 1×1 flat stand-in keeps the shape — it still
  // carries a map, so the zone bake skips it exactly like the real sign.
  if (typeof document === 'undefined') {
    const data = new Uint8Array([0x2b, 0x24, 0x30, 0xff]);
    const tex = new THREE.DataTexture(data, 1, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#2b2430';
  c.fillRect(0, 0, 256, 64);
  c.fillStyle = '#FFB85C';
  c.font = 'bold 34px Georgia, serif';
  c.textAlign = 'center';
  c.fillText('M121  TERMINAL', 128, 44);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildArrivalBus(
  M: (c: number, opts?: { emissive?: number; emissiveIntensity?: number }) => THREE.MeshLambertMaterial,
): ArrivalBus {
  const group = new THREE.Group();
  group.name = 'BUS_M121';
  const colliders: ColliderSpec[] = [];
  const col = (x: number, y: number, z: number, w: number, h: number, d: number) => colliders.push({ x, y, z, w, h, d });

  const box = (
    name: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number,
    color: number, opts: { collide?: boolean; map?: THREE.Texture } = {},
  ): THREE.Mesh => {
    const mat = opts.map ? new THREE.MeshLambertMaterial({ map: opts.map }) : M(color);
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.name = name;
    m.position.set(cx, cy, cz);
    group.add(m);
    if (opts.collide !== false) col(cx, cy, cz, sx, sy, sz);
    return m;
  };

  const { cx, z, len, halfW, floorTop, roof } = BUS;
  const xW = cx - len / 2; // the nose (faces west, down the avenue)
  const xE = cx + len / 2;
  const zN = z + halfW;    // curbside
  const zS = z - halfW;
  const bodyY = (floorTop + roof) / 2;
  const bodyH = roof - floorTop;

  // shell: floor, roof, stripe, ends
  box('BUS_Floor', cx, floorTop - 0.075, z, len, 0.15, halfW * 2, 0x4a4550);
  box('BUS_Roof', cx, roof + 0.1, z, len, 0.2, halfW * 2, 0xd8d8d8);
  box('BUS_Nose', xW, bodyY, z, 0.15, bodyH, halfW * 2, PAL.taxi);
  box('BUS_Tail', xE, bodyY, z, 0.15, bodyH, halfW * 2, PAL.taxi);
  box('BUS_Stripe', cx, 1.1, z, len, 0.18, halfW * 2 + 0.06, PAL.ink, { collide: false });

  // north (curbside) face: the door opening at x −27.65 + windows
  box('BUS_WallN_W', (xW + -28.2) / 2, bodyY, zN, (-28.2) - xW, bodyH, 0.12, PAL.taxi);
  box('BUS_WallN_E', (-27.1 + xE) / 2, bodyY, zN, xE - (-27.1), bodyH, 0.12, PAL.taxi);
  box('BUS_DoorHeader', -27.65, 2.55, zN, 1.1, 0.4, 0.12, PAL.taxi, { collide: false });
  // south face: wall with window insets (dark glass reads fine outside)
  box('BUS_WallS', cx, bodyY, zS, len, bodyH, 0.12, PAL.taxi);
  for (const wx of [-35.15, -33.15, -31.15, -29.15]) {
    box(`BUS_WinS_${wx}`, wx, 1.55, zS - 0.02, 1.2, 0.85, 0.04, 0x2c3440, { collide: false });
  }
  // west end: the windshield (an OPENING — the reveal looks through it)
  box('BUS_WindshieldSill', xW - 0.02, 0.72, z, 0.12, 0.35, halfW * 2 - 0.5, PAL.ink, { collide: false });
  box('BUS_WindshieldHeader', xW - 0.02, 2.5, z, 0.12, 0.5, halfW * 2 - 0.5, PAL.ink, { collide: false });
  box('BUS_WindshieldPillar', xW - 0.02, 1.6, z, 0.12, 1.45, 0.12, PAL.ink, { collide: false });
  box('BUS_Route', xW - 0.04, 2.62, z, 0.06, 0.32, 1.7, 0x2b2430, { map: routeTexture(), collide: false });

  // wheels (visual), parked on the bay
  for (const [wx, wz] of [[xW + 1.6, zN - 0.1], [xW + 1.6, zS + 0.1], [xE - 1.6, zN - 0.1], [xE - 1.6, zS + 0.1]] as const) {
    box(`BUS_Wheel_${wx}_${wz > z ? 'n' : 's'}`, wx, 0.32, wz, 0.65, 0.64, 0.24, 0x2b2430, { collide: false });
  }

  // curb-side entry steps (the law: every rise ≤ 0.35) — the box comes
  // from BUS04_STEP so the occupancy law and the mesh are the same numbers
  const stepX = (BUS04_STEP.minX + BUS04_STEP.maxX) / 2;
  const stepZ = (BUS04_STEP.minZ + BUS04_STEP.maxZ) / 2;
  const stepW = BUS04_STEP.maxX - BUS04_STEP.minX;
  const stepD = BUS04_STEP.maxZ - BUS04_STEP.minZ;
  box('BUS_Step_1', stepX, 0.15, stepZ, stepW, 0.3, stepD, 0x8f8a82);
  col(stepX, 0.15, stepZ, stepW, 0.3, stepD);

  // interior: driver cab bulkhead, seat benches, pole, rail
  box('BUS_CabWall', -35.75, bodyY, z, 0.12, bodyH, halfW * 2 - 0.3, 0xd8d8d8);
  box('BUS_CabGap', -35.75, bodyY, zN - 0.55, 0.12, bodyH, 0.8, 0xd8d8d8, { collide: false });
  const seats: Array<[number, number]> = [[-34.35, z + 0.72], [-32.75, z - 0.72], [-31.15, z + 0.72], [-29.55, z - 0.72], [-28.05, z + 0.72]];
  seats.forEach(([sx, sz], i) => {
    box(`BUS_Seat_${i}`, sx, floorTop + 0.5, sz, 0.95, 0.1, 0.45, 0x2A9D8F);
    box(`BUS_SeatBack_${i}`, sx + (sz > z ? 0.45 : -0.45), floorTop + 0.85, sz, 0.1, 0.75, 0.45, 0x2A9D8F, { collide: false });
    col(sx, floorTop + 0.3, sz, 0.95, 0.6, 0.45);
  });
  box('BUS_Pole', -27.15, floorTop + 0.95, zN - 0.35, 0.06, 1.9, 0.06, 0x9aa0a6, { collide: false });
  box('BUS_Rail', cx, roof - 0.15, z, len - 1.2, 0.05, 0.05, 0xd8d8d8, { collide: false });

  // the duffel — somebody's whole biography on a seat (the player's Day-1
  // mirror, the way the stranger carries hers)
  box('BUS_Duffel', -29.55, floorTop + 0.72, z - 0.72, 0.75, 0.35, 0.4, 0x6a4a3a, { collide: false });
  box('BUS_DuffelStrap', -29.55, floorTop + 0.9, z - 0.72, 0.77, 0.06, 0.42, 0x3a2a20, { collide: false });

  // the driver, behind the cab wall gap, radio murmuring somewhere off-map
  const { group: driver, rig: driverRig } = buildArticulatedPerson(
    { jacket: 0x2A9D8F, pants: 0x3a3a42, skin: 0xd9a06b, hair: 0x2b2730, style: 'cap' },
  );
  driver.name = 'BUS_Driver';
  driver.position.set(-36.5, floorTop, z - 0.1);
  driver.rotation.y = Math.PI / 2; // faces west, down the avenue
  group.add(driver);
  col(-36.5, floorTop + 0.9, z - 0.1, 0.9, 1.8, 0.9);

  const api: ArrivalBus = {
    group,
    colliders,
    anchors: {
      driver: { x: -35.35, y: floorTop, z: z - 0.1 },
      duffel: { x: -29.55, y: floorTop + 0.72, z: z - 0.72 },
      door: { x: -27.65, y: 0.1, z: zN + 0.7 },
    },
    update(dt) {
      updatePersonAnim(driver, dt); // the idle breathe; the rig does the rest
      void driverRig;
    },
  };
  return api;
}

/** Static anchors for the registry (driver chat + the duffel). */
export const BUS_SPOTS = {
  driver: { x: -35.35, y: 0.55, z: 1.9 },
  duffel: { x: -29.55, y: 1.0, z: 1.28 },
} as const;
