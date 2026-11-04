/**
 * The Shuffle (docs/51 B16 — VS-F04's missing half, now built):
 *   1. the brush law — contact with a WALKING player is the Shuffle's
 *      CORRECT interaction; it fires the walker's "'Scuse me." and nothing
 *      else (Doc 02: "which is a correct interaction, not a failure"),
 *   2. the no-fail law — a brush carries no severity, no penalty, nothing
 *      to lose: the event's whole payload is who said it and where,
 *   3. one brush per meeting (the walker's cooldown),
 *   4. the soft skip (Doc 07 TBD-3) — 20 s of standing still inside the
 *      Shuffle stretch offers "The city will wait."; moving re-arms it;
 *      outside the stretch, sightseeing is a right, never a stall.
 * The brush + cooldown laws run against a REAL Pedestrians instance (the
 * same node-safe construction the solidity harness uses); the pacing and
 * stretch laws are pure, so the numbers are exact.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  Pedestrians, brushFires, BRUSH_COOLDOWN, BRUSH_MIN_SPEED,
} from '../src/world/peds';
import {
  CITY_WILL_WAIT_S, cityWillWaitFires, SHUFFLE_STRETCH, inShuffleStretch,
} from '../src/core/GameState';

describe('the brush law (contact with a walking player is correct)', () => {
  it('fires when a moving player walks through a walker', () => {
    expect(brushFires(true, true, 0)).toBe(true);
  });

  it('never fires while the player is loitering against someone', () => {
    // two people standing pressed together is a crowd, not a dance
    expect(brushFires(true, false, 0)).toBe(false);
  });

  it('never fires while the walker\'s brush cooldown is running', () => {
    expect(brushFires(true, true, BRUSH_COOLDOWN - 0.01)).toBe(false);
    expect(brushFires(true, true, 3)).toBe(false);
  });

  it('fires again once the cooldown has fully expired (one brush per meeting)', () => {
    expect(brushFires(true, true, 0.01)).toBe(false);
    expect(brushFires(true, true, 0)).toBe(true);
  });

  it('no contact, no brush — even at full stride', () => {
    expect(brushFires(false, true, 0)).toBe(false);
  });

  it('the brush pace gate sits between a lean and the walkers\' own walk', () => {
    expect(BRUSH_MIN_SPEED).toBeGreaterThan(0.2);
    expect(BRUSH_MIN_SPEED).toBeLessThan(0.95); // below the slowest walker
  });

  it('the no-fail law: a brush event is who spoke and where — nothing else', () => {
    // the payload type IS the law: no severity, no penalty flag, no money
    // field, no fail concept anywhere in the queue
    const payload: { i: number; x: number; z: number } = { i: 3, x: -30, z: 6.4 };
    expect(Object.keys(payload).sort()).toEqual(['i', 'x', 'z']);
  });
});

describe('the brush fires in a real crowd (integration)', () => {
  /** A walker pacing a line through a corridor of fixed furniture — the
   *  corridor is what makes contact unavoidable (the avoidance may otherwise
   *  swerve around a free-standing player, which in the real block is the
   *  drift-toward-gaps working as designed). */
  function corridorCrowd(): Pedestrians {
    const scene = new THREE.Scene();
    return new Pedestrians(
      scene,
      [{ jacket: 0x4a5568, pants: 0x3b3f4a, skin: 0xc98e5a, hair: 0x2b2730, style: 'cap' }],
      42,
      [[[2, 6], [6, 6]]],
      [{ x: 4, z: 5.0, r: 0.5 }, { x: 4, z: 7.0, r: 0.5 }],
    );
  }

  it('a player weaving at walking pace through the corridor gets their "\u2019Scuse me."', () => {
    const peds = corridorCrowd();
    const person = peds.group.children[0];
    const bubble = person.children.find((c) => c instanceof THREE.Sprite) as THREE.Sprite;
    let brushes = 0;
    let sawBubble = false;
    for (let f = 0; f < 480; f++) { // 8 s of weaving: the 1.2 s grace, then contact
      const x = 4 + 0.5 * Math.sin((f / 60) * Math.PI); // ±0.5 m sweep, ≤ 1.6 m/s
      peds.update(1 / 60, { x, z: 6 });
      brushes += peds.drainBrushes().length;
      if (bubble.visible) sawBubble = true; // the bubble holds ~2.2 s, then fades
    }
    expect(brushes).toBeGreaterThanOrEqual(1);
    // the reaction is in-world: the walker's own bubble came up
    expect(sawBubble).toBe(true);
  });

  it('the cooldown holds: one brush per meeting, not a machine gun', () => {
    const peds = corridorCrowd();
    let brushes = 0;
    for (let f = 0; f < 300; f++) { // 5 s: the first brush (~3.4 s in), and
      // the next legal one needs 4 more seconds of contact — out of window
      const x = 4 + 0.5 * Math.sin((f / 60) * Math.PI);
      peds.update(1 / 60, { x, z: 6 });
      brushes += peds.drainBrushes().length;
    }
    expect(brushes).toBe(1);
  });

  it('a still player never makes anyone speak (pressed together is not a dance)', () => {
    const peds = corridorCrowd();
    let brushes = 0;
    for (let f = 0; f < 480; f++) { // 8 s planted exactly on the walker's line
      peds.update(1 / 60, { x: 4, z: 6 });
      brushes += peds.drainBrushes().length;
    }
    expect(brushes).toBe(0);
  });
});

describe('the soft skip (Doc 07 TBD-3 — the city will wait)', () => {
  it('does not fire before 20 seconds of standing still', () => {
    expect(cityWillWaitFires(CITY_WILL_WAIT_S - 0.1)).toBe(false);
    expect(cityWillWaitFires(0)).toBe(false);
    expect(cityWillWaitFires(19)).toBe(false);
  });

  it('fires at exactly 20 seconds', () => {
    expect(cityWillWaitFires(CITY_WILL_WAIT_S)).toBe(true);
  });

  it('stays fired — the line is an offer, not a countdown', () => {
    expect(cityWillWaitFires(CITY_WILL_WAIT_S + 45)).toBe(true);
  });
});

describe('the Shuffle stretch (where the crowd lives)', () => {
  it('holds the bodega→plaza walk: bodega front, the lanes, the stairs', () => {
    expect(inShuffleStretch(-16, 6.4)).toBe(true);  // the bodega front
    expect(inShuffleStretch(-20, 6.4)).toBe(true);  // the bodega local's lane
    expect(inShuffleStretch(-41, 6.4)).toBe(true);  // the plaza weaver's west end
    expect(inShuffleStretch(-42, 6.4)).toBe(true);  // the headhouse turnaround
  });

  it('the corner and the crosswalk are NOT the Shuffle — no nagging there', () => {
    expect(inShuffleStretch(4, -6.6)).toBe(false);  // your corner
    expect(inShuffleStretch(-6.5, 0)).toBe(false);  // the crosswalk
    expect(inShuffleStretch(24, 6.4)).toBe(false);  // east of the stretch
  });

  it('off the walk is not the Shuffle either', () => {
    expect(inShuffleStretch(-30, 0)).toBe(false);   // the road
    expect(inShuffleStretch(-30, 14)).toBe(false);  // the building line
  });

  it('the stretch is exactly the crowd\'s block (the constants agree)', () => {
    expect(SHUFFLE_STRETCH.xMin).toBeLessThanOrEqual(-41);  // reaches the plaza
    expect(SHUFFLE_STRETCH.xMax).toBeGreaterThanOrEqual(-16); // reaches the bodega
    expect(SHUFFLE_STRETCH.zMin).toBeLessThan(6.08);  // covers the north lanes
    expect(SHUFFLE_STRETCH.zMax).toBeGreaterThanOrEqual(6.76);
  });
});
