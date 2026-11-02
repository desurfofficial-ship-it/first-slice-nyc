/**
 * Wonder beat #1 — the Times Square sync (Doc 02: "the screens all turn
 * at once — a designed moment where every billboard syncs to warm light,
 * just for you"). The envelope is pure; these tests pin its shape so a
 * future edit can't quietly turn the moment into a flicker.
 */
import { describe, it, expect } from 'vitest';
import {
  syncEnvelope, SYNC_RAMP_IN, SYNC_HOLD, SYNC_RELEASE, SYNC_TRIGGER_Z,
} from '../src/world/firstSession';

describe('the sync envelope', () => {
  it('rises to full warm within the ramp', () => {
    expect(syncEnvelope(0)).toBe(0);
    expect(syncEnvelope(SYNC_RAMP_IN / 2)).toBeCloseTo(0.5);
    expect(syncEnvelope(SYNC_RAMP_IN)).toBe(1);
  });

  it('holds the beat before releasing', () => {
    const mid = SYNC_RAMP_IN + SYNC_HOLD / 2;
    expect(syncEnvelope(mid)).toBe(1);
  });

  it('releases to zero and stays there', () => {
    const end = SYNC_RAMP_IN + SYNC_HOLD + SYNC_RELEASE;
    expect(syncEnvelope(end)).toBe(0);
    expect(syncEnvelope(end + 60)).toBe(0);
  });

  it('never leaves 0..1', () => {
    for (let t = -5; t < 20; t += 0.25) {
      const k = syncEnvelope(t);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
    }
  });

  it('the trigger sits inside the plaza, past the headhouse door', () => {
    // the plaza band is z −79..−49 (firstSession layout notes); the door
    // mouth is near z −57 — the beat fires a step inside, not on the sill
    expect(SYNC_TRIGGER_Z).toBeLessThan(-60.5);
    expect(SYNC_TRIGGER_Z).toBeGreaterThan(-79);
  });
});
