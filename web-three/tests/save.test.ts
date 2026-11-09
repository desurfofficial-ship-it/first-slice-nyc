/**
 * Save v1 rules — mirror of the original greybox save semantics.
 * Memory-backed Storage doubles keep these tests hermetic.
 */

import { describe, it, expect } from 'vitest';
import {
  parseSave, loadSave, writeSave, wipeSave, defaultSave, SAVE_KEY, MAX_DAY,
} from '../src/core/Save';

function memoryStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe('save v1 — corrupt save is a fresh start, never a crash', () => {
  it('garbage JSON boots defaults', () => {
    const s = parseSave('{not json at all{{{');
    expect(s).toEqual(defaultSave());
  });

  it('missing file boots defaults', () => {
    expect(parseSave(null)).toEqual(defaultSave());
  });

  it('non-object JSON boots defaults', () => {
    expect(parseSave('[1,2,3]')).toEqual(defaultSave());
    expect(parseSave('42')).toEqual(defaultSave());
    expect(parseSave('"day"')).toEqual(defaultSave());
  });
});

describe('save v1 — field clamping (resume exact, nothing out of range)', () => {
  it('clamps day to [1, MAX_DAY] (the C1 wave moved the ceiling to the season\u2019s end — the clamp moves with it)', () => {
    expect(parseSave(JSON.stringify({ day: 999 })).day).toBe(MAX_DAY);
    // a day inside the C1 season now parses EXACTLY (the stations are
    // sparse — day 29 is October 7, and a save standing there is legal)
    expect(parseSave(JSON.stringify({ day: 29 })).day).toBe(29);
    expect(parseSave(JSON.stringify({ day: 0 })).day).toBe(1);
    expect(parseSave(JSON.stringify({ day: -4 })).day).toBe(1);
  });

  it('clamps lunch_served to [0,3] and floors negative money', () => {
    const s = parseSave(JSON.stringify({ lunch_served: 12, money: -40 }));
    expect(s.lunch_served).toBe(3);
    expect(s.money).toBe(0);
  });

  it('coerces stringly-typed values (defensive)', () => {
    const s = parseSave(JSON.stringify({ day: '2', money: '112', awning: 'true' }));
    expect(s.day).toBe(2);
    expect(s.money).toBe(112);
    expect(s.awning).toBe(true);
  });
});

describe('save v1 — write/read roundtrip', () => {
  it('writes and reads the same fields', () => {
    const store = memoryStore();
    const data = { day: 2, day_complete: true, replay: false, cart_name: "Wade's Spot", money: 111, awning: true, kid_kept: true, idris_served: true, lunch_served: 3, stool: false, map_given: false, permit: false };
    expect(writeSave(data, store)).toBe(true);
    const loaded = loadSave(store);
    // day_start_money defaults to the saved money when absent (web v1 extension);
    // the memory counters default to 0 when absent (Doc 37 §3F migration —
    // optional trailing fields, the spec's own roundtrip shape); the Map's
    // pages default to empty (docs/12 — same optional-trailing law)
    expect(loaded).toEqual({
      ...data, day_start_money: 111,
      shelf_buys: 0, dog_buys: 0, trims: 0, washes: 0, hoop_makes: 0,
      map_notes: [], map_slang: [], map_places: [], map_priya_lines: false,
      // the in-game calendar + the field diary (narrative/14 R3+R4) — the
      // same optional-trailing law one row later: calendar absent reads as
      // the story day (the C0 mood-lock), the diary absent reads as empty
      calendar_day: 2, field_diary: [],
      // the consequence ledger (narrative/14 R2 — WP-5): absent reads as
      // an empty ledger, the same optional-trailing law one row later
      ledger: [],
      // the chapter gate + rails (narrative/14 R1+R8): absent reads as a
      // fresh arrival with an unfired spine, the same law two rows later
      chapter: { chapter: 'C0', openedOnDay: 1, calendarDay: 1 },
      rails: {
        R1: { fired: false, firedOnDay: null }, R2: { fired: false, firedOnDay: null },
        R3: { fired: false, firedOnDay: null }, R4: { fired: false, firedOnDay: null },
        R5: { fired: false, firedOnDay: null }, R6: { fired: false, firedOnDay: null },
      },
      // the §7-step-7 machines (narrative/14 R9–R12) — the same
      // optional-trailing law: identity/fluency/send absent read as their
      // canon defaults (Leo Marsh, the bottom rung, never-sent); the
      // resource note's latch materializes false (a boolean default)
      resource_note_offered: false,
    });
  });

  it('the sketch places round-trip (docs/12 upgrade — Map only draws what it has seen)', () => {
    const store = memoryStore();
    writeSave({ ...defaultSave(), day: 3, map_places: ['terminal', 'bodega', 'cart', 'court'] }, store);
    expect(loadSave(store).map_places).toEqual(['terminal', 'bodega', 'cart', 'court']);
  });

  it('a corrupt map_places is an empty page, never a crash', () => {
    const store = memoryStore({ [SAVE_KEY]: '{"day":2,"map_places":42}' });
    expect(loadSave(store).map_places).toEqual([]);
  });

  it('the permit field round-trips (Day 4 afternoon \u2014 docs/30)', () => {
    const store = memoryStore();
    writeSave({ ...defaultSave(), day: 4, permit: true, money: 123 }, store);
    expect(loadSave(store).permit).toBe(true);
  });

  it('the stool field round-trips (Day 3 purchase)', () => {
    const store = memoryStore();
    writeSave({ ...defaultSave(), day: 3, stool: true, money: 101 }, store);
    expect(loadSave(store).stool).toBe(true);
  });

  it('wipe removes the save', () => {
    const store = memoryStore({ [SAVE_KEY]: '{"day":2}' });
    wipeSave(store);
    expect(loadSave(store)).toEqual(defaultSave());
  });

  it('storage failure returns false instead of throwing', () => {
    const failing = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => undefined };
    expect(writeSave(defaultSave(), failing)).toBe(false);
    expect(loadSave(failing)).toEqual(defaultSave());
  });
});

describe('the block remembers — optional counters, Save v1 stays v1 (Doc 37 §3F)', () => {
  it('a pre-milestone v1 save (no counter fields) parses cleanly — counters read as 0', () => {
    // the exact JSON shape the game wrote BEFORE the living-neighborhood
    // milestone — the automated compat proof the migration note promises
    const old = JSON.stringify({
      day: 3, day_complete: true, replay: false, cart_name: 'La Esquina',
      money: 104, awning: true, kid_kept: true, idris_served: true,
      lunch_served: 3, stool: true, map_given: false, permit: false,
    });
    const s = parseSave(old);
    expect(s.day).toBe(3);
    expect(s.money).toBe(104);
    expect(s.stool).toBe(true);
    expect(s.shelf_buys).toBe(0);
    expect(s.dog_buys).toBe(0);
    expect(s.trims).toBe(0);
    expect(s.washes).toBe(0);
    expect(s.hoop_makes).toBe(0);
  });

  it('a v1 save written by even older code (pre-stool/pre-permit) still loads', () => {
    const ancient = JSON.stringify({ day: 2, day_complete: true, money: 111 });
    const s = parseSave(ancient);
    expect(s.day).toBe(2);
    expect(s.stool).toBe(false);
    expect(s.permit).toBe(false);
    expect(s.shelf_buys).toBe(0);
  });

  it('an ancient save parses with the calendar + the field diary as defaults (narrative/14 R3+R4)', () => {
    // the reboot-era compat proof: the exact JSON shape the game wrote
    // BEFORE the narrative spine — the calendar reads as the story day
    // (Day 3 = October 3, Year 1 — the mood-lock), the diary reads as empty
    const ancient = JSON.stringify({ day: 3, day_complete: true, money: 120 });
    const s = parseSave(ancient);
    expect(s.calendar_day).toBe(3);
    expect(s.field_diary).toEqual([]);
  });

  it('field_diary round-trips through the save (a corrupt page is an empty one, never a crash)', () => {
    const store = memoryStore();
    writeSave({ ...defaultSave(), day: 2, field_diary: [{ id: 'E1', kind: 'PLACE' }] as never }, store);
    expect(loadSave(store).field_diary).toEqual([]); // the malformed entry quarantined
    const corrupt = memoryStore({ [SAVE_KEY]: '{"day":2,"field_diary":42}' });
    expect(loadSave(corrupt).field_diary).toEqual([]);
  });

  it('counters round-trip', () => {
    const store = memoryStore();
    writeSave({ ...defaultSave(), day: 4, shelf_buys: 4, dog_buys: 3, trims: 2, washes: 1, hoop_makes: 7 }, store);
    const loaded = loadSave(store);
    expect(loaded.shelf_buys).toBe(4);
    expect(loaded.dog_buys).toBe(3);
    expect(loaded.trims).toBe(2);
    expect(loaded.washes).toBe(1);
    expect(loaded.hoop_makes).toBe(7);
  });

  it('counters clamp to [0, 999] and coerce stringly values', () => {
    const s = parseSave(JSON.stringify({ shelf_buys: 5000, dog_buys: -3, trims: '2', washes: 'x' }));
    expect(s.shelf_buys).toBe(999);
    expect(s.dog_buys).toBe(0);
    expect(s.trims).toBe(2);
    expect(s.washes).toBe(0);
  });

  it('a post-milestone save still loads in the old reader shape (field-wise ignore)', () => {
    // older code reads named fields and drops the rest — simulate by
    // parsing a NEW save through the same parser minus expectations
    const fresh = JSON.stringify({ ...defaultSave(), shelf_buys: 3, hoop_makes: 5, day: 4 });
    const s = parseSave(fresh);
    expect(s.day).toBe(4);
    expect(s.shelf_buys).toBe(3);
    expect(s.hoop_makes).toBe(5);
  });
});

describe('save v1 — the fuzz wall: no garbage anywhere can crash the day', () => {
  /** Every field, every wrong shape: the parser returns a SAVE, never an
   *  exception. The expanded districts made this file load-bearing — a
   *  resume that throws strands the player on a black screen. */
  const wrongs = [null, undefined, 42, 'banana', [], {}, [NaN], [Infinity], { a: 1 }, -1, 1e9];

  it('every field swallowed by every wrong shape parses to a valid save', () => {
    const base = defaultSave();
    for (const field of Object.keys(base)) {
      for (const wrong of wrongs) {
        const raw = JSON.stringify({ ...base, [field]: wrong });
        expect(() => parseSave(raw), `${field} = ${JSON.stringify(wrong)}`).not.toThrow();
        const s = parseSave(raw);
        expect(s.day).toBeGreaterThanOrEqual(1);
        expect(Number.isFinite(s.money)).toBe(true);
        expect(Array.isArray(s.map_notes)).toBe(true);
        expect(Array.isArray(s.map_places)).toBe(true);
      }
    }
  });

  it('truncated and mutated JSON never throws — the half-written save is a fresh day', () => {
    const full = JSON.stringify({ ...defaultSave(), day: 4, money: 123, map_places: ['court'] });
    for (let cut = 1; cut < full.length; cut += Math.max(1, Math.floor(full.length / 60))) {
      expect(() => parseSave(full.slice(0, cut))).not.toThrow();
    }
    // byte flips: any single-character corruption parses (maybe to defaults)
    for (let i = 0; i < full.length; i += Math.max(1, Math.floor(full.length / 40))) {
      const mutated = full.slice(0, i) + '"' + full.slice(i + 1);
      expect(() => parseSave(mutated)).not.toThrow();
    }
  });
});
