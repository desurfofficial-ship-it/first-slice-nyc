/**
 * M1 — beats as places, not pressure (docs/architecture/05), pinned.
 *
 * The law under test: the Map's story marker and the HUD's objective line
 * both read GameState.beatPlaceId() — one helper, so they can never
 * disagree (doc 05's M1 risk: "the HUD lies"). A beat with a named place
 * marks that place; a beat with none (the fire escape, the teal door, the
 * subway stairs, the crosswalk notice, the postcard rail) carries no
 * marker at all — a marker never points where the objective doesn't.
 */

import { describe, expect, it } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { MAP_PLACES, OBJECTIVES } from '../src/core/content';

describe('M1 — the beat→place helper (docs/architecture/05)', () => {
  it('every beat place id is a real MAP_PLACES id — the marker can never point off the sketch', () => {
    const ids = new Set(MAP_PLACES.map((p) => p.id));
    const state = new GameState();
    for (const step of Object.values(Step)) {
      state.step = step;
      const place = state.beatPlaceId();
      if (place !== null) {
        expect(ids.has(place), `step ${step} marks unknown place "${place}"`).toBe(true);
      }
    }
  });

  it('a marked beat always has an objective line — the map never marks silence', () => {
    const state = new GameState();
    for (const step of Object.values(Step)) {
      state.step = step;
      if (state.beatPlaceId() !== null) {
        expect(OBJECTIVES[step]?.length ?? 0, `step ${step} is marked but has no objective`).toBeGreaterThan(0);
      }
    }
  });

  it('the named beats mark their spots', () => {
    const state = new GameState();
    const expectPlace = (step: Step, place: string | null) => {
      state.step = step;
      expect(state.beatPlaceId(), `step ${step}`).toBe(place);
    };
    expectPlace(Step.MEET_ROSA, 'terminal');
    expectPlace(Step.ENTER_BODEGA, 'bodega');
    expectPlace(Step.COLLECT, 'bodega');
    expectPlace(Step.RUSH, 'bodega');
    expectPlace(Step.CROSS, 'cart');
    expectPlace(Step.CLAIM_CART, 'cart');
    expectPlace(Step.NAME_CART, 'cart');
    expectPlace(Step.SOLO, 'cart');
    expectPlace(Step.D2_TASK, 'bodega');
    expectPlace(Step.D4_STRANGER, 'terminal');
    expectPlace(Step.D4_LAUNDRY, 'laundry');
  });

  it('beats with no named place carry no marker — the fire escape, the teal door, the stairs, the notice, the rail, DONE', () => {
    const state = new GameState();
    const expectNone = (step: Step) => {
      state.step = step;
      expect(state.beatPlaceId(), `step ${step}`).toBeNull();
    };
    expectNone(Step.CLIMB);          // the fire escape
    expectNone(Step.D2_DELIVER);     // the kid's teal door
    expectNone(Step.D2_CLIMB2);      // awning + fire escape
    expectNone(Step.D3_POSTER);      // the flyer by the subway stairs
    expectNone(Step.D4_PERMIT);      // the notice by the crosswalk
    expectNone(Step.POSTCARD);       // the rail
    expectNone(Step.D2_POSTCARD);
    expectNone(Step.D3_POSTCARD);
    expectNone(Step.D4_POSTCARD);
    expectNone(Step.D3_CLIMB3);
    expectNone(Step.D4_CLIMB4);
    expectNone(Step.DONE);           // the day is done — nothing waits
  });
});
