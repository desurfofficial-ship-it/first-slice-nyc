/**
 * The street schedule (M4, docs/architecture/05) — ambient density keyed to
 * time-of-day. Two layers, both pinned:
 *
 *   the table (world/dressing) — two phases, pure data, and the roster's
 *   shifts checked against it: the floor law (no phase parks a 'street'
 *   walker), day equals the shipped street exactly, dusk reads busier;
 *
 *   the mechanism (world/peds) — a home walker is hidden, parked (collider
 *   at y −999, the barrier's trick), excluded from the cab's yield pool and
 *   the interaction registry's y-band, frozen through Yuka's integration,
 *   and resumes their loop exactly where they left it.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { STREET_PLAN, PEDESTRIAN_ROLES, type StreetPlan, type StreetPhase } from '../src/world/dressing';
import { Pedestrians } from '../src/world/peds';

const PHASES: StreetPhase[] = ['day', 'dusk'];

/** A walker's on-stage state, read through the shipped internals (the same
 *  cast crowd.test.ts uses — the class keeps its roster private). */
interface PedsInternals {
  peds: Array<{
    role: string; home: boolean; duskIdx: number;
    group: THREE.Group;
    box: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    vehicle: { position: { x: number; z: number } };
    dwellLeft: number; bubbleT: number; bubble: { visible: boolean };
  }>;
}
const internals = (peds: Pedestrians): PedsInternals['peds'] =>
  (peds as unknown as PedsInternals).peds;

// ---------------------------------------------------------------- the table --

describe('the schedule table (world/dressing)', () => {
  it('day is the shipped street: no rush, the park tended, the cab at cruise', () => {
    expect(STREET_PLAN.day).toEqual({ duskShift: 0, parkOut: true, cabPace: 1 });
  });

  it('dusk is the rush: the subway draw out, the park settled, traffic crawling', () => {
    expect(STREET_PLAN.dusk).toEqual({ duskShift: 3, parkOut: false, cabPace: 0.7 });
  });

  it('the roster wears the documented shifts, in build order', () => {
    expect(PEDESTRIAN_ROLES).toEqual([
      'street', 'street', 'street',             // the trio
      'street', 'street', 'street', 'street',   // the Shuffle crowd
      'park',                                   // the garden tender
      'street',                                 // the avenue shopper
      'dusk', 'dusk', 'dusk',                   // the evening rush
      'street', 'street',                       // WP-EAST — the east pair
    ]);
  });

  it('the floor law: no phase parks a street walker — the street never empties', () => {
    for (const phase of PHASES) {
      const plan = STREET_PLAN[phase];
      const out = (role: string, duskIdx: number): boolean =>
        role === 'street' ? true : role === 'park' ? plan.parkOut : duskIdx < plan.duskShift;
      for (let i = 0; i < PEDESTRIAN_ROLES.length; i++) {
        if (PEDESTRIAN_ROLES[i] === 'street') {
          expect(out('street', -1), `phase ${phase}, walker ${i}`).toBe(true);
        }
      }
    }
  });

  it('day puts exactly the shipped nine on the street; dusk reads busier', () => {
    const count = (phase: StreetPhase): number => {
      const plan = STREET_PLAN[phase];
      let duskSeen = 0, n = 0;
      for (const role of PEDESTRIAN_ROLES) {
        const duskIdx = role === 'dusk' ? duskSeen++ : -1;
        if (role === 'street' || (role === 'park' && plan.parkOut) || (role === 'dusk' && duskIdx < plan.duskShift)) n++;
      }
      return n;
    };
    expect(count('day')).toBe(11);  // the shipped nine + the east pair (WP-EAST)
    expect(count('dusk')).toBe(13); // the rush: +3 on the Shuffle stretch, −1 park
    expect(count('dusk')).toBeGreaterThan(count('day'));
  });
});

// ------------------------------------------------------------- the mechanism --

/** Four walkers on one straight loop: the floor, the park shift, and two
 *  dusk-shift neighbors (enough to pin roster-order without a crowd). */
function scheduledCrowd(): Pedestrians {
  const scene = new THREE.Scene();
  return new Pedestrians(
    scene,
    [
      { jacket: 0x4a5568, pants: 0x3b3f4a, skin: 0xc98e5a, hair: 0x2b2730, style: 'cap' },
      { jacket: 0x7d5a62, pants: 0x47404b, skin: 0xe8b08e, hair: 0x6e3b2a, style: 'bun' },
      { jacket: 0x5d6b4a, pants: 0x39423a, skin: 0x8a5a3b, hair: 0x1f1b23, style: 'flat' },
      { jacket: 0x6e4f3a, pants: 0x32363e, skin: 0xd9a06b, hair: 0x2b2730, style: 'cap' },
    ],
    42,
    [[[2, 6], [10, 6]]],
    [],
    [],
    [],
    ['street', 'park', 'dusk', 'dusk'],
  );
}

describe('the schedule mechanism (world/peds — a home walker is off stage)', () => {
  it('dusk-shift walkers boot home: hidden, collider parked, registry-blind', () => {
    const peds = scheduledCrowd();
    const [floor, , duskA] = internals(peds);
    expect(duskA.home).toBe(true);
    expect(duskA.group.visible).toBe(false);
    expect(duskA.box.minY).toBe(-999); // the barrier's trick — can't overlap anything
    expect(peds.bodyAt(2).y).toBe(-100); // the y-band excludes them (no chats)
    expect(peds.bodies()).toHaveLength(2); // the cab brakes for nobody underground
    expect(floor.home).toBe(false);
  });

  it('the day plan changes nothing at boot; it is idempotent', () => {
    const peds = scheduledCrowd();
    peds.applyStreetPlan(STREET_PLAN.day);
    peds.applyStreetPlan(STREET_PLAN.day);
    const [floor, park, duskA] = internals(peds);
    expect(floor.home).toBe(false);
    expect(park.home).toBe(false);
    expect(duskA.home).toBe(true);
    expect(peds.bodies()).toHaveLength(2);
  });

  it('the dusk plan brings the rush on in roster order and sends the park home', () => {
    const peds = scheduledCrowd();
    peds.applyStreetPlan(STREET_PLAN.dusk);
    const [floor, park, duskA, duskB] = internals(peds);
    expect(duskA.home).toBe(false);
    expect(duskB.home).toBe(false);
    expect(park.home).toBe(true);
    expect(park.group.visible).toBe(false);
    expect(park.box.minY).toBe(-999);
    expect(floor.home).toBe(false); // the floor law holds in the mechanism too
    expect(peds.bodies()).toHaveLength(3);
    // a partial rush still respects roster order
    peds.applyStreetPlan(STREET_PLAN.day);
    const partial: StreetPlan = { duskShift: 1, parkOut: true, cabPace: 1 };
    peds.applyStreetPlan(partial);
    const [, , a2, b2] = internals(peds);
    expect(a2.home).toBe(false);  // the first dusk walker is out
    expect(b2.home).toBe(true);   // the second is still home
  });

  it('a walker sent home mid-beat leaves the beat and the bubble behind', () => {
    const peds = scheduledCrowd();
    const park = internals(peds)[1];
    park.dwellLeft = 2.5;
    park.bubbleT = 1.5;
    park.bubble.visible = true;
    peds.applyStreetPlan(STREET_PLAN.dusk);
    expect(park.dwellLeft).toBe(0);
    expect(park.bubbleT).toBe(0);
    expect(park.bubble.visible).toBe(false);
    expect(park.box.minY).toBe(-999);
  });

  it('a home walker is frozen through Yuka — no drift, no clock, no anim', () => {
    const peds = scheduledCrowd(); // boot: the dusk shift is home
    const duskA = internals(peds)[2];
    const x = duskA.vehicle.position.x;
    const z = duskA.vehicle.position.z;
    for (let f = 0; f < 60; f++) peds.update(0.05, { x: 0, z: 0 });
    expect(duskA.vehicle.position.x).toBe(x);
    expect(duskA.vehicle.position.z).toBe(z);
    expect(duskA.box.minY).toBe(-999);
  });

  it('coming back resumes the loop with the body re-synced — no underground box', () => {
    const peds = scheduledCrowd();
    peds.applyStreetPlan(STREET_PLAN.dusk);
    const park = internals(peds)[1];
    const x = park.vehicle.position.x;
    const z = park.vehicle.position.z;
    peds.applyStreetPlan(STREET_PLAN.day);
    expect(park.group.visible).toBe(true);
    expect(park.box.minY).toBe(0);       // the box is the truth again, same frame
    expect(park.box.maxY).toBe(1.7);
    expect(park.box.minX).toBeCloseTo(x - 0.28, 6);
    expect(park.box.minZ).toBeCloseTo(z - 0.28, 6);
    for (let f = 0; f < 30; f++) peds.update(0.05, { x: 100, z: 100 });
    const moved = Math.hypot(park.vehicle.position.x - x, park.vehicle.position.z - z);
    expect(moved).toBeGreaterThan(0.2); // the loop resumed
  });

  it('the sight law: a walker beyond SIGHT_M hides (render only), and returns with the player', () => {
    const peds = scheduledCrowd(); // one loop at (2..10, 6)
    const floor = internals(peds)[0];
    // far: the walker is 190+ m from the player — beyond the fog, hidden
    for (let f = 0; f < 10; f++) peds.update(0.05, { x: 200, z: 6 });
    expect(floor.home).toBe(false); // the schedule still owns them — out
    expect(floor.group.visible).toBe(false); // the render gates
    expect(floor.box.minY).toBe(0); // the body stays the truth (no ghost pocket)
    // near: the player walks up — the walker renders again
    for (let f = 0; f < 10; f++) peds.update(0.05, { x: 6, z: 6 });
    expect(floor.group.visible).toBe(true);
  });

  it('a home walker never yields to (or blocks) the cab', () => {
    const peds = scheduledCrowd(); // boot: the dusk shift is home
    const duskA = internals(peds)[2];
    // park a home walker's center inside a cab-sized rect: no push, no move
    duskA.vehicle.position.x = 0;
    duskA.vehicle.position.z = -2;
    const cabRect = { minX: -2.2, maxX: 2.2, minY: 0, maxY: 1.7, minZ: -2.975, maxZ: -1.025 };
    peds.resolveAgainstCab(cabRect);
    expect(duskA.vehicle.position.x).toBe(0);
    expect(duskA.vehicle.position.z).toBe(-2);
    // and the yield pool never saw them
    expect(peds.bodies().some((b) => b.x === 0 && b.z === -2)).toBe(false);
  });
});
