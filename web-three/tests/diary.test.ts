/**
 * M3 — the city keeps a diary of you (docs/architecture/05), pinned.
 *
 * The law under test: the roam counters surface as ONE morning note the
 * day after they earn it — a full threshold past the last note (the
 * watermark), said once ever, biggest overshoot first, ties in the
 * table's fixed order. The diary also stays one step BEHIND the
 * in-person memory (MEMORY_LINES): the block remembers to your face
 * before it remembers behind your back. Save side: `diary_noted` is an
 * optional-trailing field — an old v1 save parses byte-identically and
 * owes no notes.
 */

import { describe, expect, it } from 'vitest';
import {
  DIARY_FAMILIES,
  DIARY_THRESHOLDS,
  diaryNote,
  type DiaryCounters,
} from '../src/core/diary';
import { DIARY_NOTE_TEXT, MEMORY_LINES } from '../src/core/content';
import { parseSave } from '../src/core/Save';
import { GameState } from '../src/core/GameState';

const C = (over: Partial<DiaryCounters> = {}): DiaryCounters => ({
  shelf: 0, dog: 0, trim: 0, wash: 0, hoop: 0, ...over,
});

describe('M3 — the diary machine (core/diary.ts)', () => {
  it('a quiet morning says nothing — no counters, no note', () => {
    expect(diaryNote(C(), undefined)).toBeNull();
  });

  it('each family fires at its threshold and not one below — the block is not eager', () => {
    for (const family of DIARY_FAMILIES) {
      const at = DIARY_THRESHOLDS[family];
      const below = C({ [family]: at - 1 } as Partial<DiaryCounters>);
      expect(diaryNote(below, undefined), `${family} at ${at - 1} stays quiet`).toBeNull();
      const due = C({ [family]: at } as Partial<DiaryCounters>);
      const fire = diaryNote(due, undefined);
      expect(fire?.family, `${family} at ${at} speaks`).toBe(family);
    }
  });

  it('a note is said once, ever — the watermark moves to the current count', () => {
    const first = diaryNote(C({ shelf: 4 }), undefined);
    expect(first?.noted.shelf).toBe(4);
    // the same counts the next morning: silence — it was said
    expect(diaryNote(C({ shelf: 4 }), first?.noted)).toBeNull();
    // climbing partway stays quiet too
    expect(diaryNote(C({ shelf: 6 }), first?.noted)).toBeNull();
    // a full threshold past the note speaks again, from the new base
    const second = diaryNote(C({ shelf: 8 }), first?.noted);
    expect(second?.family).toBe('shelf');
    expect(second?.noted.shelf).toBe(8);
  });

  it('the biggest overshoot wins — the family furthest past its due speaks', () => {
    // shelf is due at 4 (overshoot 2), dog due at 3 (overshoot 0)
    const fire = diaryNote(C({ shelf: 6, dog: 3 }), undefined);
    expect(fire?.family).toBe('shelf');
  });

  it('ties break in the table\u2019s fixed order — deterministic, no dice', () => {
    // trim and wash are both due at 3: one past each, same overshoot
    const fire = diaryNote(C({ trim: 4, wash: 4 }), undefined);
    expect(fire?.family).toBe('trim'); // first in DIARY_FAMILIES order
  });

  it('an old save owes no notes — an absent watermark reads base 0', () => {
    // counters well past threshold, no diary_noted in the save: it speaks
    // (the block finally says what it always knew)
    expect(diaryNote(C({ wash: 3 }), undefined)?.family).toBe('wash');
  });

  it('the diary stays one step behind the in-person memory (MEMORY_LINES)', () => {
    for (const family of DIARY_FAMILIES) {
      // the counter line comes before the morning-after note
      expect(DIARY_THRESHOLDS[family]).toBeGreaterThan(MEMORY_LINES[family].at);
    }
  });

  it('every family has prose, and no diary line asks you for another round', () => {
    for (const family of DIARY_FAMILIES) {
      const text = DIARY_NOTE_TEXT[family];
      expect(text.length).toBeGreaterThan(0);
      // the No-FOMO law: a note that begs is a nudge, not a memory
      expect(text.toLowerCase()).not.toMatch(/you should|don't forget|come back and/);
    }
  });
});

describe('M3 — the watermark rides the save (diary_noted, optional-trailing)', () => {
  it('an old v1 save parses byte-identically — no diary_noted key appears', () => {
    const s = parseSave(JSON.stringify({ day: 2, money: 112 }));
    expect('diary_noted' in s).toBe(false);
  });

  it('a saved watermark parses per family, clamped; garbage is dropped, never a crash', () => {
    const s = parseSave(JSON.stringify({
      day: 3,
      diary_noted: { shelf: 5000, dog: 2.7, trim: '4', wash: -1, hoop: 0, bike: 9 },
    }));
    expect(s.diary_noted).toEqual({ shelf: 999, dog: 2 });
  });

  it('a corrupt watermark (string/array) reads as absent', () => {
    expect(parseSave(JSON.stringify({ diary_noted: 'shelf' })).diary_noted).toBeUndefined();
    expect(parseSave(JSON.stringify({ diary_noted: [4] })).diary_noted).toBeUndefined();
  });

  it('GameState maps the counters and carries the watermark into the snapshot', () => {
    const state = new GameState();
    for (let i = 0; i < 4; i++) state.recordChoice('shelf');
    expect(state.diaryCounters().shelf).toBe(4);
    const fire = diaryNote(state.diaryCounters(), state.diaryNoted);
    expect(fire?.family).toBe('shelf');
    if (fire) state.diaryNoted = fire.noted;

    state.day = 2;
    const snap = state.snapshotForSave();
    expect(snap?.diary_noted).toEqual({ shelf: 4 });

    // an un-noted state writes no diary key (the byte-identical law)
    const fresh = new GameState();
    fresh.day = 2;
    expect('diary_noted' in (fresh.snapshotForSave() ?? {})).toBe(false);
  });
});
