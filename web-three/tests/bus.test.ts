/**
 * The M121's route law — the pure half of the bus (engine/busRoute). Every
 * test pins a law the W4 p2 construction depends on: the loop closes, the
 * lanes legally clear the parked cars, the stop marks land where the
 * registry pins them, and the bus's courtesy zones are the same paint the
 * cab's extended rail yields at.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  buildM121, travelYaw, worldToLeg, legToWorld, aabbToLeg,
  PARKED_CAR_RECTS, parkedCarRect, KESTREL_COURTESY_ZONES, BUS_BODY, BUS_BAY_ID,
  LANE_X_KESTREL_WEST_END,
  type BusZone,
} from '../src/engine/busRoute';
import { buildArrivalBus, BUS04_STEP, playerOccupiesBus04 } from '../src/world/arrivalBus';
import { TRUCK_SPOTS } from '../src/world/larchYardsKit';
import { mulberry32 } from '../src/world/dressing';

const legs = buildM121();
// The registry streets' own road rects (STR-KESTREL/STR-GABLE spanX grew east
// in W-C0; STR-LARCH is the W-C0 row) — the grown loop's lanes live in these.
const KESTREL = { xMin: -100, xMax: 252, zMin: -4, zMax: 4 };
const GABLE = { xMin: -100, xMax: 252, zMin: 36, zMax: 44 };
const JUNIPER = { xMin: -76, xMax: -68, zMin: -64, zMax: 64 };
const SYCAMORE = { xMin: 68, xMax: 76, zMin: -64, zMax: 64 };
const LARCH = { xMin: 224, xMax: 232, zMin: -64, zMax: 64 };
const ROADWAYS = [KESTREL, GABLE, JUNIPER, SYCAMORE, LARCH];

/** The kit's truck PRNG, re-run: which spots render (the sleep is dressing
 *  variance; a sleeping spot must have NO yield rect — no ghost braking). */
function renderedTruckSpots() {
  const rng = mulberry32(0x1E7C1);
  return TRUCK_SPOTS.filter(() => rng() >= 0.2);
}

/** The bus's world AABB when its center sits at (x,z) facing yaw — the
 *  OBB→AABB superset the collider uses (|cos|·hl + |sin|·hw per axis). */
function bodyRectAt(x: number, z: number, yaw: number) {
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  const ex = c * BUS_BODY.halfLen + s * BUS_BODY.halfWid;
  const ez = s * BUS_BODY.halfLen + c * BUS_BODY.halfWid;
  return { minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez };
}

function overlap(a: { minX: number; maxX: number; minZ: number; maxZ: number },
                 b: { minX: number; maxX: number; minZ: number; maxZ: number }): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

describe('the loop closes (registry: terminal → Gable → Larch → Kestrel East → Kestrel → Juniper → terminal)', () => {
  it("each leg ends exactly where the next begins, and leg 3 wraps to leg 0", () => {
    const p = { x: 0, z: 0 };
    for (let i = 0; i < legs.length; i++) {
      const f = legs[i].frame, n = legs[(i + 1) % legs.length].frame;
      legToWorld(f.len, 0, f, p);
      expect(p.x).toBeCloseTo(n.ox, 6);
      expect(p.z).toBeCloseTo(n.oz, 6);
    }
  });

  it("runs the four authored legs in the registry order", () => {
    expect(legs.map((l) => l.name)).toEqual([
      'Kestrel west', 'Juniper north', 'Gable east', 'Larch south',
    ]);
  });

  it("the full lap is the two-district north half — about 674 m (the W-C7 east leg)", () => {
    const total = legs.reduce((s, l) => s + l.frame.len, 0);
    expect(total).toBeGreaterThan(660);
    expect(total).toBeLessThan(685);
  });

  it("the east leg reaches the Larch Yards: leg 0 starts at the Larch corner, leg 2 ends there", () => {
    expect(legs[0].frame.ox).toBeCloseTo(LANE_X_KESTREL_WEST_END, 6);
    expect(LANE_X_KESTREL_WEST_END).toBeGreaterThan(224); // inside Larch's road band
    const p = { x: 0, z: 0 };
    legToWorld(legs[2].frame.len, 0, legs[2].frame, p);
    expect(p.x).toBeCloseTo((LARCH.xMin + LARCH.xMax) / 2, 6); // the centerline 228
  });
});

describe('lane discipline — the drive lanes never touch a parked car', () => {
  it("every leg lane keeps the body inside its roadway", () => {
    for (const l of legs) {
      const p = { x: 0, z: 0 };
      legToWorld(l.frame.len / 2, 0, l.frame, p); // mid-leg, on the lane line
      const yaw = travelYaw(l.frame.ax, l.frame.az);
      const body = bodyRectAt(p.x, p.z, yaw);
      const road = ROADWAYS.find((r) =>
        body.minX >= r.xMin - 0.01 && body.maxX <= r.xMax + 0.01
          && body.minZ >= r.zMin - 0.01 && body.maxZ <= r.zMax + 0.01);
      expect(road, `${l.name}: body ${JSON.stringify(body)} must sit in a roadway`).toBeDefined();
    }
  });

  it("the Kestrel drive lane passes the parked cars with air to spare", () => {
    const l0 = legs[0];
    const p = { x: 0, z: 0 };
    for (const cx of [51, -44]) { // the two Kestrel N curb cars (east past the court, docs/49 reconciliation)
      const noseA = LANE_X_KESTREL_WEST_END - cx; // the advance where the nose reaches the car
      const centerA = noseA + BUS_BODY.halfLen; // the car is then under the body
      legToWorld(centerA, 0, l0.frame, p);
      const body = bodyRectAt(p.x, p.z, Math.PI);
      expect(overlap(body, parkedCarRect(PARKED_CAR_RECTS[2])), `car at x ${cx}`)
        .toBe(false);
    }
  });

  it("the avenue lanes clear the curb-hugging parked cars (the Juniper law)", () => {
    const l1 = legs[1]; // Juniper north, the car at (−68.98, 14)
    const p = { x: 0, z: 0 };
    legToWorld(14 - l1.frame.oz, 0, l1.frame, p); // center abreast the car
    const body = bodyRectAt(p.x, p.z, travelYaw(0, 1));
    expect(overlap(body, parkedCarRect(PARKED_CAR_RECTS[6]))).toBe(false);
  });

  it("the grown east lanes clear every declared box truck (the W-C7 debt the kit's own comment named)", () => {
    const trucks = PARKED_CAR_RECTS.filter((c) => c.truck);
    expect(trucks.length).toBe(8); // the kit renders 8 of its 10 spots (two sleep)
    const p = { x: 0, z: 0 };
    for (const t of trucks) {
      // the Gable north-curb trucks (z 42.7) ride legs[2]; the Kestrel
      // north-curb trucks (z 3.4) ride legs[0]; the Marlow trucks have no
      // mover on their street — no lane law to test (they stay declared for
      // the pool's honesty, the one-list law).
      const onGable = t.z > 20 && t.z < 50;
      const onKestrel = t.z > -10 && t.z < 10;
      if (!onGable && !onKestrel) continue;
      const leg = onGable ? legs[2] : legs[0];
      const noseA = onGable
        ? (t.x - leg.frame.ox)                  // Gable east: a = x + 71.6
        : LANE_X_KESTREL_WEST_END - t.x;        // Kestrel west: a = 228 − x
      const centerA = noseA + BUS_BODY.halfLen; // the truck then sits under the body
      legToWorld(centerA, 0, leg.frame, p);
      const yaw = travelYaw(leg.frame.ax, leg.frame.az);
      const body = bodyRectAt(p.x, p.z, yaw);
      const rect = parkedCarRect(t);
      expect(overlap(body, rect), `truck at (${t.x}, ${t.z}) under the ${leg.name} lane`)
        .toBe(false);
    }
  });

  it("every rendered kit truck has a declared yield rect; no sleeping spot carries one (no ghost braking)", () => {
    const rendered = renderedTruckSpots();
    expect(rendered.length).toBe(8);
    const rects = PARKED_CAR_RECTS.filter((c) => c.truck);
    for (const s of rendered) {
      const hit = rects.find((r) => r.x === s.x && r.z === s.z);
      expect(hit, `truck spot (${s.x}, ${s.z}) must be declared`).toBeDefined();
    }
    for (const s of TRUCK_SPOTS) {
      if (rendered.includes(s)) continue;
      expect(rects.find((r) => r.x === s.x && r.z === s.z),
        `sleeping spot (${s.x}, ${s.z}) must NOT be declared`)
        .toBeUndefined();
    }
  });

  it("the cab's eastbound lane (z −2) clears the moved trucks — every Kestrel truck parks on the NORTH curb", () => {
    for (const r of PARKED_CAR_RECTS.filter((c) => c.truck && c.z > -10 && c.z < 20)) {
      expect(r.z).toBeGreaterThan(0); // the south curb is the cab's road (the Marlow trucks are off the cab's street)
    }
  });
});

describe('the stops land where the registry pins them', () => {
  it("BUS-05 / BUS-03 / BUS-01 / BUS-02 ride leg 0 in order, bay last and longest", () => {
    const stops = legs[0].stops;
    expect(stops.map((s) => s.id)).toEqual(['BUS-05', 'BUS-03', 'BUS-01', BUS_BAY_ID]);
    for (let i = 1; i < stops.length; i++) expect(stops[i].a).toBeGreaterThan(stops[i - 1].a);
    expect(stops[3].dwell).toBeGreaterThan(stops[0].dwell);
    expect(stops[3].dwell).toBeGreaterThanOrEqual(8); // a real lay-over
    expect(stops[0].dwell).toBeGreaterThanOrEqual(3); // a real stop, not a ghost
  });

  it("the bay halt parks the body inside the terminal bay paint (x -36..-24)", () => {
    const bay = legs[0].stops[3];
    const p = { x: 0, z: 0 };
    // at the halt the nose sits at the mark on the pulled-out line
    legToWorld(bay.a, bay.lateral, legs[0].frame, p);
    const body = bodyRectAt(p.x + BUS_BODY.halfLen, p.z, Math.PI); // center is halfLen east
    expect(body.minX).toBeGreaterThanOrEqual(-36);
    expect(body.maxX).toBeLessThanOrEqual(-24);
  });

  it("the Junction Plaza bay parks the body inside its paint (the BUS-04 pattern, lateral 1.2)", () => {
    const plaza = legs[0].stops[0]; // BUS-05, the W-C7 bay
    expect(plaza.lateral).toBeCloseTo(1.2, 6); // the park-in-the-paint line
    const p = { x: 0, z: 0 };
    legToWorld(plaza.a, plaza.lateral, legs[0].frame, p);
    const body = bodyRectAt(p.x + BUS_BODY.halfLen, p.z, Math.PI);
    expect(body.minX).toBeGreaterThanOrEqual(154.5); // the paint's west edge
    expect(body.maxX).toBeLessThanOrEqual(166.5);    // the paint's east edge
  });

  it("the Junction Plaza bay's tail never stands in the Spur zebra (x 150.3..153.7) or its zone (x 150..154)", () => {
    const plaza = legs[0].stops[0];
    const p = { x: 0, z: 0 };
    legToWorld(plaza.a, plaza.lateral, legs[0].frame, p);
    const body = bodyRectAt(p.x + BUS_BODY.halfLen, p.z, Math.PI);
    expect(body.minX).toBeGreaterThan(154); // the whole body east of the zone's west edge
  });

  it("every mark has a hold line on its own leg and a pull-out toward the curb", () => {
    for (const l of legs) {
      for (const s of l.stops) {
        expect(s.a).toBeGreaterThan(0);
        expect(s.a - BUS_BODY.halfLen).toBeLessThan(l.frame.len);
        expect(s.lateral).toBeGreaterThan(0); // the curb is right of travel here
      }
    }
  });
});

describe('courtesy zones — the bus and the cab yield at the same paint', () => {
  it("each zone stop line sits on its leg and the span is sane", () => {
    for (const l of legs) {
      for (const z of l.zones) {
        expect(z.a0).toBeGreaterThanOrEqual(0);
        expect(z.a0).toBeLessThan(l.frame.len);
        expect(z.a1).toBeGreaterThan(z.a0);
        expect(z.l0).toBeLessThan(z.l1);
      }
    }
  });

  it("leg 0 zones are the cab's Kestrel zones the bus actually approaches", () => {
    // westbound: a = 228 − x, so a zone's east edge is its hold line a0.
    // The grown loop rides Kestrel STRAIGHT through the Sycamore junction now
    // (the W-C7 east leg — Sycamore Ave leaves the loop), so the Sycamore box
    // is PRESENT; the LARCH box is the absent one — the bus turns south INSIDE
    // that junction (its hold line would sit behind the leg; the shipped
    // Sycamore-corner law, east edition).
    const zones = legs[0].zones;
    expect(zones).toHaveLength(5);
    const mapped = KESTREL_COURTESY_ZONES
      .filter((k) => LANE_X_KESTREL_WEST_END - k.xMax > 0)
      .sort((k1, k2) => (LANE_X_KESTREL_WEST_END - k1.xMax) - (LANE_X_KESTREL_WEST_END - k2.xMax));
    expect(mapped).toHaveLength(5);
    zones.forEach((z, i) => {
      expect(z.a0).toBeCloseTo(LANE_X_KESTREL_WEST_END - mapped[i].xMax, 6);
      expect(z.a1).toBeCloseTo(LANE_X_KESTREL_WEST_END - mapped[i].xMin, 6);
    });
  });

  it("the cab's courtesy list grew the east junctions (the Spur + Larch boxes)", () => {
    expect(KESTREL_COURTESY_ZONES.some((k) => k.xMin === 150 && k.xMax === 154)).toBe(true);
    expect(KESTREL_COURTESY_ZONES.some((k) => k.xMin === 222.5 && k.xMax === 233.5)).toBe(true);
  });

  it("leg 2 grew the Gable×Spur box and the GL-W straight-through leg (the shipped pre-corner law)", () => {
    const zones = legs[2].zones;
    expect(zones).toHaveLength(4);
    // a = x + 71.6 eastbound: the box's WEST edge is its hold line a0
    expect(zones[2].a0).toBeCloseTo(150 + 71.6, 6);   // the Spur box
    expect(zones[2].a1).toBeCloseTo(154 + 71.6, 6);
    expect(zones[3].a0).toBeCloseTo(222.5 + 71.6, 6); // the GL-W crosswalk
    expect(zones[3].a1).toBeCloseTo(226.5 + 71.6, 6);
  });

  it("the Larch leg rides the avenue-centerline law with no stops and no zones (both ends are turn corners)", () => {
    const l3 = legs[3];
    expect(l3.frame.ox).toBeCloseTo(228, 6);
    expect(l3.frame.oz).toBeCloseTo(38, 6);
    expect(l3.frame.ax).toBe(0);
    expect(l3.frame.az).toBe(-1);
    expect(l3.stops).toHaveLength(0);
    expect(l3.zones).toHaveLength(0);
    expect(l3.frame.len).toBeCloseTo(37.2, 6);
  });
});

describe('leg-space transforms', () => {
  it('round-trips world → leg → world on every leg', () => {
    const out = { x: 0, z: 0 };
    const c = { a: 0, l: 0 };
    for (const l of legs) {
      worldToLeg(l.frame.ox + 7 * l.frame.ax - 2 * l.frame.lx,
                 l.frame.oz + 7 * l.frame.az - 2 * l.frame.lz, l.frame, c);
      expect(c.a).toBeCloseTo(7, 6);
      expect(c.l).toBeCloseTo(-2, 6);
      legToWorld(c.a, c.l, l.frame, out);
      expect(out.x).toBeCloseTo(l.frame.ox + 7 * l.frame.ax - 2 * l.frame.lx, 6);
      expect(out.z).toBeCloseTo(l.frame.oz + 7 * l.frame.az - 2 * l.frame.lz, 6);
    }
  });

  it("aabbToLeg maps the Juniper parked car to its known advance/lateral span", () => {
    const z: BusZone = { a0: 0, a1: 0, l0: 0, l1: 0 };
    const r = parkedCarRect(PARKED_CAR_RECTS[6]); // (−68.98, 14) alongZ
    aabbToLeg(r.minX, r.maxX, r.minZ, r.maxZ, legs[1].frame, z);
    expect(z.a0).toBeCloseTo(11.0, 6);   // z 11.8 − 0.8
    expect(z.a1).toBeCloseTo(15.4, 6);   // z 16.2 − 0.8
    expect(z.l0).toBeCloseTo(1.645, 6);  // x −69.955 + 71.6
    expect(z.l1).toBeCloseTo(3.595, 6);  // x −68.005 + 71.6
  });

  it('travelYaw faces the mesh (+x geometry) along each leg — ±π are one facing', () => {
    const facing = (ax: number, az: number) => {
      const y = travelYaw(ax, az);
      return [Math.cos(y), -Math.sin(y)] as const; // what the mesh's +x becomes
    };
    const close = (v: readonly number[], ax: number, az: number) => {
      expect(v[0]).toBeCloseTo(ax, 6);
      expect(v[1]).toBeCloseTo(az, 6);
    };
    close(facing(1, 0), 1, 0);   // east
    close(facing(-1, 0), -1, 0); // west (atan2 may return −π; same rotation)
    close(facing(0, 1), 0, 1);   // north
    close(facing(0, -1), 0, -1); // south
  });
});

describe('the bay occupancy law — playerOccupiesBus04 (docs/51 B2)', () => {
  // The one-bay-one-bus swap (World.syncBayOccupancy + the arriving bus's
  // bay hold) reads this law: TRUE means the shell must stay under the
  // player. Every case here is a physical spot a real player occupies.

  it('feet on the 0.55 floor inside the rect hold the bay', () => {
    expect(playerOccupiesBus04(-32, 0.55, 2)).toBe(true);   // mid-aisle
    expect(playerOccupiesBus04(-37, 0.55, 2)).toBe(true);   // by the windshield
    expect(playerOccupiesBus04(-27.2, 0.55, 1.2)).toBe(true); // rear door corner
  });

  it('THE B2 HOLE: feet on the boarding step (y 0.3, outside the rect) hold the bay', () => {
    // Before the step branch, the loop M121 could park on the bay exactly
    // here and retire the shell — step, floor and all — out from under a
    // boarding player, its own body then walling the door shut.
    expect(playerOccupiesBus04(-27.65, 0.3, 3.6)).toBe(true); // step center
    expect(playerOccupiesBus04(-28.4, 0.3, 3.6)).toBe(true);  // center hung off the step's west edge (capsule radius)
    expect(playerOccupiesBus04(-27.3, 0.3, 4.0)).toBe(true);  // a stride north, still stepping up
    expect(playerOccupiesBus04(-27.65, 0.55, 3.5)).toBe(true); // the first floor-snap frame at the door line
  });

  it('the street never holds the bay — the y band keeps its truth', () => {
    expect(playerOccupiesBus04(-27.65, 0.1, 4.2)).toBe(false); // sidewalk north of the step
    expect(playerOccupiesBus04(-32, 0.1, 2)).toBe(false);      // inside the rect footprint, at street level
    expect(playerOccupiesBus04(-27.65, 0.19, 3.6)).toBe(false); // step zone but street-height feet (no step under them)
  });

  it('the law and the mesh share one set of numbers (BUS04_STEP ↔ BUS_Step_1)', () => {
    // The builder places BUS_Step_1 from BUS04_STEP; the door gap it serves
    // is x −28.2..−27.1. If these drift, the step stops serving the door.
    expect((BUS04_STEP.minX + BUS04_STEP.maxX) / 2).toBeCloseTo(-27.65, 6);
    expect(BUS04_STEP.maxX - BUS04_STEP.minX).toBeCloseTo(1.0, 6);
    expect((BUS04_STEP.minZ + BUS04_STEP.maxZ) / 2).toBeCloseTo(3.6, 6);
    expect(BUS04_STEP.top).toBeCloseTo(0.3, 6);
  });
});

// ---------------------------------------------------- the curb bake (B13)

/** The zone bake's eligibility law, pinned on the bus shell. The bake
 *  merges Lambert + map-free + opaque + indexed meshes within a zone
 *  group; anything else must stay a singleton (the route sign carries its
 *  canvas map) or ride the animated exclusion by name (the driver
 *  breathes). If a future part breaks one of these, the bake will either
 *  absorb it (wrongly fusing a dynamic mesh) or leave draw calls on the
 *  table — this guard makes both failures loud. */
describe('the curb bake contract — the M121 shell is bake-eligible (docs/51 B13)', () => {
  const M = (c: number, opts?: { emissive?: number; emissiveIntensity?: number }) => {
    const m = new THREE.MeshLambertMaterial({ color: c });
    if (opts?.emissive) {
      m.emissive = new THREE.Color(opts.emissive);
      m.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    return m;
  };
  const { group } = buildArrivalBus(M);
  const meshes: THREE.Mesh[] = [];
  group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });

  const underDriver = (m: THREE.Mesh): boolean => {
    for (let p: THREE.Object3D | null = m; p && p !== group; p = p.parent) {
      if (p.name === 'BUS_Driver') return true;
    }
    return false;
  };

  it('the shell is bake-eligible: Lambert, opaque, indexed — with exactly one map-carrying singleton (the route sign)', () => {
    let shell = 0, mapped = 0;
    for (const m of meshes) {
      if (underDriver(m)) continue;
      const mat = m.material as THREE.MeshLambertMaterial;
      expect(mat.isMeshLambertMaterial, `${m.name}: Lambert only`).toBe(true);
      expect(mat.transparent, `${m.name}: opaque only`).toBe(false);
      expect(m.geometry.index, `${m.name}: indexed`).not.toBeNull();
      if (mat.map) mapped++;
      else shell++;
    }
    expect(mapped).toBe(1); // BUS_Route — the bake skips it by design
    expect(shell).toBeGreaterThanOrEqual(20); // the fusible body
  });

  it('the driver rig rides the animated exclusion — six merged meshes + the shadow proxy, never fused into the shell', () => {
    const driver = meshes.filter(underDriver);
    expect(driver.length).toBe(7); // the cast-bake law: one figure, six draws, + 1 shadow proxy (docs/51 B13)
    for (const m of driver) {
      expect(m.name === 'BUS_Driver' || m.parent?.name !== null).toBe(true);
    }
  });

  it('the group stays the one-bay swap\'s handle — the bake re-parents INTO it, never out', () => {
    expect(group.name).toBe('BUS_M121');
    for (const m of meshes) {
      let p: THREE.Object3D | null = m;
      while (p && p !== group) p = p.parent;
      expect(p).toBe(group);
    }
  });
});
