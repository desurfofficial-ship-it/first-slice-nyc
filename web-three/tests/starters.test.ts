/**
 * starters — Doc 02 §0:00–2:00: "Six starter characters to pick from."
 * The data contract: six picks, all distinct, every look complete, the
 * classic look byte-identical to the shipped courier, and the resolver
 * never able to break a boot.
 */
import { describe, expect, it } from 'vitest';
import { STARTERS, DEFAULT_STARTER, starterById, isStarterId } from '../src/core/starters';
import { parseSave } from '../src/core/Save';

describe('Doc 02 six starters — the pick card contract', () => {
  it('offers exactly six, with the ids the card and save agree on', () => {
    expect(STARTERS).toHaveLength(6);
    const ids = STARTERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(6);
    expect(ids).toContain(DEFAULT_STARTER);
  });

  it('every starter names itself and says one line — no blank tiles', () => {
    for (const s of STARTERS) {
      expect(s.id.length).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.blurb.length).toBeGreaterThan(0);
    }
  });

  it('every look is a complete PersonLook (the required four colors)', () => {
    for (const s of STARTERS) {
      expect(Number.isFinite(s.look.jacket)).toBe(true);
      expect(Number.isFinite(s.look.pants)).toBe(true);
      expect(Number.isFinite(s.look.skin)).toBe(true);
      expect(Number.isFinite(s.look.hair)).toBe(true);
    }
  });

  it('no two starters wear the same jacket — the tiles read apart', () => {
    const jackets = STARTERS.map((s) => s.look.jacket);
    expect(new Set(jackets).size).toBe(STARTERS.length);
  });

  it("'classic' is the shipped courier look — drivers and old saves keep the face", () => {
    const c = starterById('classic');
    // PAL.gold jacket, cream sneakers, the messenger strap — the constructor's
    // buildPerson call, mirrored (docs/51: the classic keeps the shipped face)
    expect(c.look.jacket).toBe(0xf7b32b); // PAL.gold
    expect(c.look.shoe).toBe(0xece5d8);
    expect(c.look.strap).toBe(0x6e4a2f);
  });

  it('starterById falls back to classic — a corrupt save can never break the boot', () => {
    expect(starterById(null).id).toBe(DEFAULT_STARTER);
    expect(starterById(undefined).id).toBe(DEFAULT_STARTER);
    expect(starterById('').id).toBe(DEFAULT_STARTER);
    expect(starterById('nonsense').id).toBe(DEFAULT_STARTER);
    expect(starterById('dee').id).toBe('dee');
  });

  it('isStarterId accepts exactly the STARTERS ids', () => {
    for (const s of STARTERS) expect(isStarterId(s.id)).toBe(true);
    expect(isStarterId('nonsense')).toBe(false);
    expect(isStarterId(null)).toBe(false);
    expect(isStarterId(undefined)).toBe(false);
  });

  it('the save carries the pick only once made — old blobs parse byte-identically', () => {
    // no pick made: the key does not exist on the parsed save (schema-freeze law)
    const plain = parseSave(JSON.stringify({ day: 1, cart_name: '' }));
    expect(Object.prototype.hasOwnProperty.call(plain, 'starter')).toBe(false);
    // a pick made: the key rides along, untouched
    const picked = parseSave(JSON.stringify({ day: 2, cart_name: 'First Slice', starter: 'dee' }));
    expect(picked.starter).toBe('dee');
    // a corrupt pick: dropped, and the resolver falls back at the read site
    const corrupt = parseSave(JSON.stringify({ day: 2, cart_name: '', starter: 42 }));
    expect(Object.prototype.hasOwnProperty.call(corrupt, 'starter')).toBe(false);
    expect(starterById(corrupt.starter).id).toBe(DEFAULT_STARTER);
  });
});
