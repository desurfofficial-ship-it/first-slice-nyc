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
    // day_start_money defaults to the saved money when absent (web v1 extension)
    expect(loaded).toEqual({ ...data, day_start_money: 111 });
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
