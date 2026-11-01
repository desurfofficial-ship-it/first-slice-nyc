/**
 * Save v1 rules — mirror of greybox-godot/scripts/save.gd semantics.
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
  it('clamps day to [1, MAX_DAY]', () => {
    expect(parseSave(JSON.stringify({ day: 99 })).day).toBe(MAX_DAY);
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
    // optional trailing fields, the spec's own roundtrip shape)
    expect(loaded).toEqual({
      ...data, day_start_money: 111,
      shelf_buys: 0, dog_buys: 0, trims: 0, washes: 0, hoop_makes: 0,
    });
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
