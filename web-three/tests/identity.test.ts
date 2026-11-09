/**
 * R11 — Name/look propagation (narrative/14 R11; doc 02 §1; doc 11 §5).
 *
 * The pins:
 *  - the default identity is the canon one (Leo Marsh), and all canon
 *    attaches to LM-PROTAGONIST, never to a spelled name;
 *  - the surname gate is a flag: `full` degrades to the first name until
 *    the block EARNED the surname — neighbors call him by first name;
 *  - the content-table convention (variants keyed to `surnameKnown`)
 *    picks honestly and falls back to the ungated row;
 *  - the propagation seam substitutes tokens; the audit refuses a
 *    hardcoded default name in a table of addressing lines;
 *  - the identity rides the save v1-safe (absent reads as Leo Marsh) and
 *    the pick card's name entry lands through sanitize (caps, fallbacks).
 */

import { describe, it, expect } from 'vitest';
import {
  LM_PROTAGONIST, DEFAULT_IDENTITY, NAME_CAPS,
  sanitizeIdentity, resolveName, pickVariant, withName, auditHardcodedNames,
} from '../src/core/identity';
import { GameState } from '../src/core/GameState';

const id = { first: 'Jo', nick: 'JJ', last: 'Villanueva' };

describe('R11 — the canon identity (doc 02 §1)', () => {
  it('the default is Leo Marsh; the constant is LM-PROTAGONIST', () => {
    expect(DEFAULT_IDENTITY).toEqual({ first: 'Leo', nick: '', last: 'Marsh' });
    expect(LM_PROTAGONIST).toBe('LM-PROTAGONIST');
  });

  it('sanitize caps the fields and falls back per-field (the lease still says Marsh)', () => {
    const id = sanitizeIdentity({ first: 'Jo', nick: '  Jo   Jo  ', last: 'Villanueva-Marsh-Longname' });
    expect(id.first).toBe('Jo');
    expect(id.nick).toBe('Jo Jo'); // whitespace collapses, cap holds
    expect(id.last.length).toBe(NAME_CAPS.last);
    // a cleared surname is still Marsh to the paperwork
    expect(sanitizeIdentity({ first: 'Jo', last: '' }).last).toBe('Marsh');
    // a cleared first name is still Leo to the block
    expect(sanitizeIdentity({ first: '   ', last: 'Marsh' }).first).toBe('Leo');
    // garbage input is the canon default, never a crash
    expect(sanitizeIdentity(null)).toEqual(DEFAULT_IDENTITY);
    expect(sanitizeIdentity(42)).toEqual(DEFAULT_IDENTITY);
  });
});

describe('R11 — the surname gate (earned intimacy, doc 02 §1)', () => {

  it('the block calls him by first name until the surname is earned', () => {
    expect(resolveName(id, 'first', false)).toBe('Jo');
    expect(resolveName(id, 'full', false)).toBe('Jo'); // the gate degrades
    expect(resolveName(id, 'full', true)).toBe('Jo Villanueva');
  });

  it('nicknames resolve only when authored', () => {
    expect(resolveName(id, 'nick', false)).toBe('JJ');
    expect(resolveName({ ...id, nick: '' }, 'nick', false)).toBe('Jo');
  });
});

describe('R11 — the content-table convention (variants keyed to the gate)', () => {
  const VARIANTS = [
    { surnameKnown: false, text: '{name}, you\u2019re up.' },
    { surnameKnown: true, text: '{full} \u2014 the permit\u2019s under that name.' },
  ];

  it('picks the gated row honestly, falls back to the ungated one', () => {
    expect(pickVariant(VARIANTS, false)).toContain('{name}');
    expect(pickVariant(VARIANTS, true)).toContain('{full}');
    const ungatedOnly = [{ surnameKnown: false, text: 'same row for everyone' }];
    expect(pickVariant(ungatedOnly, true)).toContain('same row');
    expect(() => pickVariant([], true)).toThrow();
    // a gated-only table is a content bug (no ungated fallback to offer)
    expect(() => pickVariant([{ surnameKnown: true, text: 'x' }], false)).toThrow();
  });

  it('the tokens substitute through the gate', () => {
    expect(withName('{name} vs {nick} vs {full}', id, { surnameKnown: false }))
      .toBe('Jo vs JJ vs Jo');
    expect(withName('{full}', id, { surnameKnown: true })).toBe('Jo Villanueva');
    // unknown tokens pass through (a template bug is visible, not eaten)
    expect(withName('{unknown}', id, { surnameKnown: false })).toBe('{unknown}');
  });
});

describe('R11 — the block learns the name (doc 11 §5)', () => {
  it('the pick card\u2019s name entry lands through sanitize', () => {
    const s = new GameState();
    s.applyIdentity({ first: 'Rae', nick: '', last: 'Okafor' });
    expect(s.playerIdentity).toEqual({ first: 'Rae', nick: '', last: 'Okafor' });
  });

  it('the default save is Leo, exactly as it always was', () => {
    const s = new GameState();
    expect(s.playerIdentity).toEqual(DEFAULT_IDENTITY);
  });

  it('the identity rides the snapshot (v1-safe) and parses back', () => {
    const s = new GameState();
    s.day = 2;
    s.applyIdentity({ first: 'Rae', nick: 'Ray', last: 'Okafor' });
    const snap = s.snapshotForSave();
    expect(snap?.player_name).toEqual({ first: 'Rae', nick: 'Ray', last: 'Okafor' });
  });

  it('the audit refuses a hardcoded default name in addressing lines', () => {
    expect(auditHardcodedNames(['{name}, you\u2019re up.'])).toEqual([]);
    expect(auditHardcodedNames(['Leo, you\u2019re up.']).length).toBeGreaterThan(0);
    expect(auditHardcodedNames(['Nobody puts Marsh on the stool.']).length).toBeGreaterThan(0);
  });
});
