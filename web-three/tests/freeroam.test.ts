/**
 * The Roam layer — docs/architecture/03's open-block contract, pinned.
 *
 * The law under test: entering Roam never advances, rewinds, or blocks
 * the story. The module is pure state + text (no THREE, no DOM), so these
 * tests run it directly — the probe (scripts/probe-roam.mjs) drives the
 * real game loop on top.
 */

import { describe, expect, it } from 'vitest';
import { FreeRoam, roamDiscoveryLine, ROAM_OBJECTIVE, ROAM_ENTER_NOTE, ROAM_EXIT_NOTE } from '../src/game/freeroam';
import { parseSave, defaultSave } from '../src/core/Save';

describe('the Roam layer — the open-block contract (docs/architecture/03)', () => {
  it('enter flips active and returns the roam objective + note', () => {
    const roam = new FreeRoam();
    expect(roam.active).toBe(false);
    const applied = roam.enter();
    expect(roam.active).toBe(true);
    expect(applied.objective).toBe(ROAM_OBJECTIVE);
    expect(applied.note).toBe(ROAM_ENTER_NOTE);
  });

  it('exit restores: objective null means "the caller restores the story line"', () => {
    const roam = new FreeRoam();
    roam.enter();
    const applied = roam.exit();
    expect(roam.active).toBe(false);
    expect(applied.objective).toBeNull();
    expect(applied.note).toBe(ROAM_EXIT_NOTE);
  });

  it('enter/exit are idempotent — the mode is a state, not a counter', () => {
    const roam = new FreeRoam();
    roam.enter();
    roam.enter();
    expect(roam.active).toBe(true);
    roam.exit();
    roam.exit();
    expect(roam.active).toBe(false);
  });

  it('the module holds no story state — a roam session cannot advance or rewind anything', () => {
    // The contract's teeth: FreeRoam's public surface is active/enter/exit
    // only. No step counter, no day, no money — GameState stays the one
    // author of story progression.
    const roam = new FreeRoam() as unknown as Record<string, unknown>;
    const keys = Object.keys(roam);
    expect(keys).toEqual(['active']);
  });

  it('the discovery line counts corners left, then celebrates the full sketchbook', () => {
    expect(roamDiscoveryLine(9, 9)).toBe('Roam. Every corner is on the Map — the block is yours.');
    expect(roamDiscoveryLine(8, 9)).toBe('Roam. 1 corner left to sketch — the Map keeps them.');
    expect(roamDiscoveryLine(5, 9)).toBe('Roam. 4 corners left to sketch — the Map keeps them.');
    // out-of-range inputs degrade politely, never crash the HUD line
    expect(roamDiscoveryLine(12, 9)).toBe('Roam. Every corner is on the Map — the block is yours.');
    // seen clamps at 0: nine places total, so nine can be left — never ten
    expect(roamDiscoveryLine(-1, 9)).toBe('Roam. 9 corners left to sketch — the Map keeps them.');
  });

  it('the mode rides the save: roam=true persists, absence reads as story mode', () => {
    // a post-roam Day-2 save carries the mode
    const withRoam = parseSave(JSON.stringify({
      day: 2, day_complete: true, replay: false, cart_name: '', money: 90,
      awning: false, kid_kept: false, idris_served: false, lunch_served: 0,
      roam: true,
    }));
    expect(withRoam.roam).toBe(true);
    // a pre-roam v1 save (no key) parses unchanged — story mode
    const preRoam = parseSave(JSON.stringify({
      day: 2, day_complete: true, replay: false, cart_name: '', money: 90,
      awning: false, kid_kept: false, idris_served: false, lunch_served: 0,
    }));
    expect(preRoam.roam).toBeUndefined();
    // anything but literal true reads as absent (corrupt = story, never a crash)
    expect(parseSave(JSON.stringify({
      day: 2, day_complete: true, replay: false, cart_name: '', money: 90,
      awning: false, kid_kept: false, idris_served: false, lunch_served: 0,
      roam: 'yes',
    })).roam).toBeUndefined();
    expect(defaultSave().roam).toBeUndefined();
  });
});
