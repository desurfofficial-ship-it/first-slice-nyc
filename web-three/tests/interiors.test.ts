/**
 * W5 — the rooms (docs/41 loops, docs/45 W5 exit criteria).
 *
 * Every loop is exercised through the REAL registry: the gated buys'
 * confirm-then-spend money math, the note loops' day-keyed picks, the
 * anchors' agreement with world-registry.json interiors[].anchors (the
 * build contract), and the y-band isolation that keeps the second-floor
 * room out of the street's reach. The authored 4-day chain is untouched —
 * these live entirely in the free-roam set.
 */

import { describe, it, expect } from 'vitest';
import { GameState, START_MONEY } from '../src/core/GameState';
import { InteractionRegistry, NEVER_NEAR, type Interaction } from '../src/game/interactions';
import { buildInteractions } from '../src/game/interactionDefs';
import registryJson from '../../docs/data/world-registry.json';
import type { Game } from '../src/game/Game';

// ---- the registry's interior anchors, read at test time --------------------
interface Anchor { id: string; x: number; z: number; y?: number; facade?: boolean }
interface Interior {
  id: string;
  shell?: { xMin?: number; xMax?: number; zMin?: number; zMax?: number };
  anchors?: Anchor[];
}
const REG = registryJson as unknown as { interiors: Interior[] };
const anchorOf = (interior: string, anchor: string): { x: number; y: number; z: number } => {
  const it = REG.interiors.find((i) => i.id === interior);
  const a = it?.anchors?.find((x) => x.id === anchor);
  if (!a) throw new Error(`registry anchor missing: ${interior}.${anchor}`);
  return { x: a.x, y: a.y ?? 0, z: a.z };
};

function fullRegistry(): { registry: InteractionRegistry; state: GameState } {
  const registry = new InteractionRegistry();
  registry.register(...buildInteractions({
    rosa: () => NEVER_NEAR,
    idris: () => NEVER_NEAR,
    kid: () => NEVER_NEAR,
    stranger: () => NEVER_NEAR,
    cart: () => NEVER_NEAR,
    shelfItem: () => NEVER_NEAR,
  }));
  const state = new GameState();
  return { registry, state };
}

const STUB_GAME = {
  sitting: false,
  sitOnBench: () => {},
  sitInPark: () => {},
  standUp: () => {},
  shootHoop: () => {},
  hoopInFlight: false,
  freeWashRunning: false,
  customer: null,
} as unknown as Game;
const ctxOf = (s: GameState) => ({ state: s, game: STUB_GAME });

function probe(id: string, registry: InteractionRegistry): Interaction {
  const it = registry.byId(id);
  if (!it) throw new Error(`no interaction ${id}`);
  return it;
}

/** The player capsule parked AT an anchor (registry truth, not a copy). */
const at = (a: { x: number; y: number; z: number }) => ({ ...a, radius: 0.35, height: 1.75 });

describe('every W5 loop answers through the registry', () => {
  // the note loops: one press, one day-keyed note
  const noteLoops: Array<[string, string, string]> = [
    ['diner_booth', 'DINER-INT', 'booth'],
    ['pie_case', 'DINER-INT', 'pie_case'],
    ['hall_notice', 'HALL-INT', 'notice_wall'],
    ['hall_workshop', 'HALL-INT', 'workshop'],
    ['record_listen', 'RECORD-INT', 'listening'],
    ['cecil_gaze', 'CECIL-ROOM', 'window_gaze'],
    ['cecil_corkboard', 'CECIL-ROOM', 'corkboard'],
  ];
  for (const [id, interior, anchor] of noteLoops) {
    it(`${id} fires at its registry anchor (${interior}.${anchor})`, () => {
      const { registry, state } = fullRegistry();
      const p = probe(id, registry);
      expect(p.enabled(state, ctxOf(state))).toBe(true);
      const near = registry.nearest(at(anchorOf(interior, anchor)), state, ctxOf(state));
      expect(near?.id).toBe(id);
      const out = p.perform(ctxOf(state));
      expect(out).toHaveLength(1);
      expect(out[0]).toEqual({ kind: 'note', text: expect.any(String) });
    });
  }

  // the gated buys: confirm → spend → the money actually moves
  const buyLoops: Array<[string, string, string, number]> = [
    ['dryer', 'LAUNDRY-INT', 'dryer', 2],
    ['pizza', 'PIZZA-INT', 'slice_counter', 2],
    ['diner_coffee', 'DINER-INT', 'counter_seat', 2],
    ['bakery', 'BAKERY-INT', 'bakery_counter', 4],
    ['record_bin', 'RECORD-INT', 'record_counter', 3],
  ];
  for (const [id, interior, anchor, price] of buyLoops) {
    it(`${id} confirms, then spends $${price} at its registry anchor`, () => {
      const { registry, state } = fullRegistry();
      const p = probe(id, registry);
      const spot = anchorOf(interior, anchor);
      // press 1: the offer, no money moves
      const first = p.perform(ctxOf(state));
      expect(first).toHaveLength(1);
      expect(first[0]).toEqual({ kind: 'note', text: expect.stringContaining('[Space]') });
      expect(state.money).toBe(START_MONEY);
      expect(state.buyConfirm).toBe(id);
      // press 2: the buy
      const second = p.perform(ctxOf(state));
      expect(state.money).toBe(START_MONEY - price);
      expect(state.buyConfirm).toBeNull();
      const note = second.find((e) => e.kind === 'note');
      expect(note).toBeTruthy();
      void spot; // the anchor reach itself is asserted by the nearest pass below
    });

    it(`${id} is reachable from its registry anchor`, () => {
      const { registry, state } = fullRegistry();
      const near = registry.nearest(at(anchorOf(interior, anchor)), state, ctxOf(state));
      expect(near?.id).toBe(id);
    });

    it(`${id} declines broke with the wallet empty`, () => {
      const { registry, state } = fullRegistry();
      const p = probe(id, registry);
      state.buyConfirm = id; // past the confirm gate
      state.money = price - 1; // the wallet says no
      const broke = p.perform(ctxOf(state));
      expect(state.money).toBe(price - 1); // nothing moved
      const note = broke.find((e) => e.kind === 'note');
      expect(note).toBeTruthy();
    });
  }
});

describe('the second-floor room keeps its y-band', () => {
  it('cecil_gaze is unreachable from the street below the room', () => {
    const { registry, state } = fullRegistry();
    const a = anchorOf('CECIL-ROOM', 'window_gaze');
    const street = { x: a.x, y: 0.05, z: a.z + 3.0, radius: 0.35, height: 1.75 }; // on the landing's shadow
    expect(registry.nearest(street, state, ctxOf(state))?.id).not.toBe('cecil_gaze');
  });

  it('cecil_gaze answers at the landing level (y 8.35)', () => {
    const { registry, state } = fullRegistry();
    const near = registry.nearest(at(anchorOf('CECIL-ROOM', 'window_gaze')), state, ctxOf(state));
    expect(near?.id).toBe('cecil_gaze');
  });
});

describe('the trim moved from the facade into the chair (docs/41 §2.3)', () => {
  it('the old facade press no longer offers the chair', () => {
    const { registry, state } = fullRegistry();
    const facade = { x: 36.6, y: 0.05, z: 7.9, radius: 0.35, height: 1.75 };
    expect(registry.nearest(facade, state, ctxOf(state))?.id).not.toBe('barber');
  });

  it('the chair inside the room does (BARBER-INT.chair)', () => {
    const { registry, state } = fullRegistry();
    const near = registry.nearest(at(anchorOf('BARBER-INT', 'chair')), state, ctxOf(state));
    expect(near?.id).toBe('barber');
    const p = probe('barber', registry);
    const first = p.perform(ctxOf(state));
    expect(state.buyConfirm).toBe('barber');
    const second = p.perform(ctxOf(state));
    expect(state.money).toBe(START_MONEY - 12);
    expect(state.trimToday).toBe(true);
    void first; void second;
  });
});

describe('the anchors and the shells agree (the registry is the contract)', () => {
  it('every interior with anchors has them inside its shell', () => {
    for (const it of REG.interiors) {
      const sh = it.shell;
      if (!sh || sh.xMin === undefined || sh.xMax === undefined || sh.zMin === undefined || sh.zMax === undefined) continue;
      const z0 = Math.min(sh.zMin, sh.zMax);
      const z1 = Math.max(sh.zMin, sh.zMax);
      for (const a of it.anchors ?? []) {
        if (a.facade) continue; // the documented bay-mouth exception
        expect(a.x, `${it.id}.${a.id} x`).toBeGreaterThanOrEqual(sh.xMin - 0.01);
        expect(a.x, `${it.id}.${a.id} x`).toBeLessThanOrEqual(sh.xMax + 0.01);
        expect(a.z, `${it.id}.${a.id} z`).toBeGreaterThanOrEqual(z0 - 0.01);
        expect(a.z, `${it.id}.${a.id} z`).toBeLessThanOrEqual(z1 + 0.01);
      }
    }
  });

  it('the W5 interaction positions read the registry verbatim', () => {
    const pairs: Array<[string, string, string]> = [
      ['dryer', 'LAUNDRY-INT', 'dryer'],
      ['pizza', 'PIZZA-INT', 'slice_counter'],
      ['diner_coffee', 'DINER-INT', 'counter_seat'],
      ['diner_booth', 'DINER-INT', 'booth'],
      ['pie_case', 'DINER-INT', 'pie_case'],
      ['hall_notice', 'HALL-INT', 'notice_wall'],
      ['hall_workshop', 'HALL-INT', 'workshop'],
      ['bakery', 'BAKERY-INT', 'bakery_counter'],
      ['record_bin', 'RECORD-INT', 'record_counter'],
      ['record_listen', 'RECORD-INT', 'listening'],
      ['cecil_gaze', 'CECIL-ROOM', 'window_gaze'],
      ['cecil_corkboard', 'CECIL-ROOM', 'corkboard'],
      ['barber', 'BARBER-INT', 'chair'],
    ];
    const { registry } = fullRegistry();
    for (const [id, interior, anchor] of pairs) {
      const a = anchorOf(interior, anchor);
      const p = probe(id, registry).pos();
      expect(p.x, `${id}.x vs ${interior}.${anchor}`).toBeCloseTo(a.x, 6);
      expect(p.z, `${id}.z vs ${interior}.${anchor}`).toBeCloseTo(a.z, 6);
      expect(p.y, `${id}.y vs ${interior}.${anchor}`).toBeCloseTo(a.y, 6);
    }
  });
});
