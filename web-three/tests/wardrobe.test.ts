/**
 * The wardrobe laws, pinned (ui/Wardrobe.ts — the 3D fitting room ported
 * from the First-slice-player update).
 *
 * 1. THE LOCK LAW: the pick is for keeps. wardrobeDecision() is the whole
 *    verdict — the same look closes the question; a different one can only
 *    be worn through a confirmed new game. No UI path re-dresses a live
 *    save underneath the player.
 * 2. THE LINEUP LAW: every starter carries its card facts (role, tag,
 *    vibe, jacket swatch) and exactly one "you" mark — the save's face.
 * 3. THE NEW-GAME LAW: newGameSave() writes a factory-fresh schema with the
 *    chosen starter pinned — the reboot dresses the new face and the pick
 *    card never re-asks (the save.starter boot law).
 */

import { describe, it, expect } from 'vitest';
import { wardrobeDecision, wardrobeLineup, STARTER_METADATA } from '../src/ui/Wardrobe';
import { STARTERS, DEFAULT_STARTER } from '../src/core/starters';
import { defaultSave, newGameSave } from '../src/core/Save';
import { touchPanelUp } from '../src/ui/touchLaw';

describe('the lock law (wardrobeDecision)', () => {
  it('the same look closes the question — no confirm, no switch', () => {
    expect(wardrobeDecision('dee', 'dee')).toEqual({ action: 'close' });
    expect(wardrobeDecision(DEFAULT_STARTER, DEFAULT_STARTER)).toEqual({ action: 'close' });
  });

  it('a different look can only be worn through a confirmed new game', () => {
    const d = wardrobeDecision('classic', 'dee');
    expect(d).toEqual({ action: 'confirm-new-game', starterId: 'dee' });
    // the verdict names the requested face — the confirm strip reads it
    expect((d as { starterId?: string }).starterId).toBe('dee');
  });

  it('the law is symmetric: any swap asks, from any current face', () => {
    for (const a of STARTERS) {
      for (const b of STARTERS) {
        const d = wardrobeDecision(a.id, b.id);
        if (a.id === b.id) expect(d.action).toBe('close');
        else {
          expect(d.action).toBe('confirm-new-game');
          expect((d as { starterId: string }).starterId).toBe(b.id);
        }
      }
    }
  });
});

describe('the lineup law (wardrobeLineup)', () => {
  it('every starter gets a card, and the metadata never runs dry', () => {
    const rows = wardrobeLineup('dee');
    expect(rows.map((r) => r.id)).toEqual(STARTERS.map((s) => s.id));
    for (const r of rows) {
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.role.length).toBeGreaterThan(0);
      expect(r.tag.length).toBeGreaterThan(0);
      expect(r.vibe.length).toBeGreaterThan(0);
      expect(r.swatch).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('exactly one "you" mark — the face the save is wearing', () => {
    const rows = wardrobeLineup('ada');
    expect(rows.filter((r) => r.isCurrent).map((r) => r.id)).toEqual(['ada']);
    expect(wardrobeLineup('classic').filter((r) => r.isCurrent).map((r) => r.id))
      .toEqual(['classic']);
  });

  it('the six introductions exist for all six starters', () => {
    for (const s of STARTERS) expect(STARTER_METADATA[s.id]).toBeDefined();
  });
});

describe('the new-game law (newGameSave)', () => {
  it('a factory-fresh schema with the chosen face pinned', () => {
    const s = newGameSave('booker');
    expect(s.starter).toBe('booker');
    expect(s.day).toBe(1);
    expect(s.money).toBe(defaultSave().money);
    expect(s.map_notes).toEqual([]);
    expect(s.field_diary).toEqual([]);
  });

  it('the fresh save parses back byte-honest (the starter rides the schema)', () => {
    // defaultSave + starter keeps the plain-JSON shape: no functions, no Dates
    const s = newGameSave('sixto');
    expect(() => JSON.stringify(s)).not.toThrow();
    expect(Object.keys(s).sort()).toEqual(
      [...Object.keys(defaultSave()), 'starter'].sort(),
    );
  });
});

describe('the touch law knows the fitting room', () => {
  it('an open wardrobe panel stands the touch UI down, like every paper', () => {
    const base = {
      nameBox: false, orderCard: false, mapPanel: false,
      postcardPanel: false, albumPanel: false,
    };
    expect(touchPanelUp(base)).toBe(false);
    expect(touchPanelUp({ ...base, wardrobePanel: true })).toBe(true);
    // the union still holds with every surface up
    expect(touchPanelUp({
      ...base, nameBox: true, orderCard: true, mapPanel: true,
      postcardPanel: true, albumPanel: true, starterCard: true, wardrobePanel: true,
    })).toBe(true);
  });
});
