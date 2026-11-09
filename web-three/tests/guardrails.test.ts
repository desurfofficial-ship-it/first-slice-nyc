/**
 * R12 — Sensitive-content guardrails (narrative/14 R12; doc 02 §6).
 *
 * The pins:
 *  (a) the resource note: opt-in, ONCE, at the first firing of F7 / the
 *      therapy thread's first session / the C5 investigation scenes —
 *      whichever comes first; the latch never spends twice;
 *  (b) the flashback ban: no flashback cinematic machinery exists in the
 *      source tree — the field diary's RECALL entries are the only
 *      vehicle (scanned live, so the class of mistake cannot return);
 *  (c) the amnesia rules: the fragment register is data with the render
 *      law attached (≤3 sensory lines, at most five full recoveries, no
 *      Lost-Year restoration), and TIME moves no epistemic tag — RECALL
 *      is never upgraded to FACT by elapsed time alone.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  RESOURCE_NOTE_TRIGGERS, shouldOfferResourceNote, RESOURCE_NOTE_TEXT,
  NO_FLASHBACK_LAW, FRAGMENTS, MAX_FULL_RECOVERIES,
  assertFragmentRenderLaw, assertNoFullRestoration, epistemicMayChange,
} from '../src/core/guardrails';
import { GameState } from '../src/core/GameState';

const SRC = new URL('../src', import.meta.url).pathname;

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsFiles(p));
    else if (/\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe('R12a — the resource note (opt-in, once, first trigger wins)', () => {
  it('the three triggers are the spec\u2019s ids', () => {
    expect(RESOURCE_NOTE_TRIGGERS).toEqual([
      'F7-railing', 'therapy-first-session', 'C5-investigation',
    ]);
  });

  it('the first trigger spends the latch; nothing else does', () => {
    expect(shouldOfferResourceNote(false, 'F7-railing')).toBe(true);
    expect(shouldOfferResourceNote(false, 'rosa-chat')).toBe(false);
    expect(shouldOfferResourceNote(false, 'random-scene')).toBe(false);
  });

  it('an already-spent latch never spends twice (whichever came first)', () => {
    expect(shouldOfferResourceNote(true, 'therapy-first-session')).toBe(false);
    expect(shouldOfferResourceNote(true, 'C5-investigation')).toBe(false);
  });

  it('the state\u2019s door: the note is offered once and the latch rides with it', () => {
    const s = new GameState();
    const first = s.resourceNoteFor('C5-investigation');
    expect(first).toBe(RESOURCE_NOTE_TEXT);
    expect(s.resourceNoteOffered).toBe(true);
    expect(s.resourceNoteFor('F7-railing')).toBeNull();
    // the latch persists in the snapshot
    s.day = 2;
    expect(s.snapshotForSave()?.resource_note_offered).toBe(true);
  });

  it('the note offers, never lectures (the register\u2019s own voice law)', () => {
    expect(RESOURCE_NOTE_TEXT).toContain('okay');
    expect(RESOURCE_NOTE_TEXT).toContain('only ever shows once');
  });
});

describe('R12b — the flashback ban (scanned live)', () => {
  it('the law is stated where the scanner reads it', () => {
    expect(NO_FLASHBACK_LAW).toContain('no flashback machinery');
    expect(NO_FLASHBACK_LAW).toContain('RECALL');
  });

  it('no flashback cinematic machinery exists in src (the class of mistake cannot return)', () => {
    const offenders: string[] = [];
    for (const f of tsFiles(SRC)) {
      const text = readFileSync(f, 'utf8');
      if (/class\s+Flashback|FlashbackCinematic|flashbackCinematic|runFlashback\(/.test(text)) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the fragments\u2019 vehicle is the field diary (the wobble rides RECALL, and nothing else renders a scene)', () => {
    // doc 02 §6.2: "≤3 sensory lines, never cinematic" — the render law
    // is data-checked below, and the only RECALL content shipped so far
    // is the pack's wobble (doc 11 §3), text in the notebook.
    const pack = readFileSync(join(SRC, 'core', 'c0pack.ts'), 'utf8');
    expect(pack).toContain("RECALL', day, 'RECALL'");
  });
});

describe('R12c — the fragment register (doc 02 §6\u2019s amnesia rules)', () => {
  it('the register is doc 02 §6.2\u2019s eight fragments', () => {
    expect(FRAGMENTS.length).toBe(8);
    expect(FRAGMENTS.map((f) => f.id)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8']);
    expect(FRAGMENTS.map((f) => f.name)).toContain('The ice machine');
    expect(FRAGMENTS.map((f) => f.name)).toContain('The railing');
  });

  it('the render law: ≤3 sensory lines per fragment, data-checked', () => {
    expect(assertFragmentRenderLaw()).toEqual([]);
  });

  it('recovery is partial and permanent: at most five full recoveries, no restoration', () => {
    expect(MAX_FULL_RECOVERIES).toBe(5);
    expect(assertNoFullRestoration(5)).toEqual([]);
    expect(assertNoFullRestoration(6).length).toBe(1);
    expect(assertNoFullRestoration(9).length).toBe(1);
  });

  it('no fragment claims the Lost Year back (doc 02 §6.3\u2019s canon violation)', () => {
    expect(assertNoFullRestoration(0)).toEqual([]);
  });
});

describe('R12c — the epistemic guard (tags never age)', () => {
  it('TIME moves nothing: RECALL is never upgraded to FACT by elapsed time alone', () => {
    expect(epistemicMayChange('RECALL', 'FACT', 'elapsed-time')).toBe(false);
    expect(epistemicMayChange('GUESS', 'FACT', 'elapsed-time')).toBe(false);
    expect(epistemicMayChange('FACT', 'GUESS', 'elapsed-time')).toBe(false);
  });

  it('the authored strike is the diary\u2019s only correction channel', () => {
    // the C1 mishear: an over-tag struck honestly (FACT → GUESS)
    expect(epistemicMayChange('FACT', 'GUESS', 'authored-strike')).toBe(true);
    // the city answers a guess (the surveyor, C2: GUESS → FACT)
    expect(epistemicMayChange('GUESS', 'FACT', 'authored-strike')).toBe(true);
    // a scene that EARNED the difference may confirm a memory — the
    // strike's own record is the evidence trail the register audits
    expect(epistemicMayChange('RECALL', 'FACT', 'authored-strike')).toBe(true);
    expect(epistemicMayChange('FACT', 'FACT', 'elapsed-time')).toBe(true); // no-op
  });
});
