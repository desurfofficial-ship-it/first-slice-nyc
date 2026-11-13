/**
 * The field diary (narrative/14 R3 + narrative/03 §2 — core/fieldDiary.ts).
 *
 * The load-bearing laws, each pinned:
 *   1. **Append-only** — a correction freezes the body bytes; nothing
 *      removes an entry; the input array is never mutated.
 *   2. **Tags never age** — no elapsed-time path can upgrade a RECALL
 *      (R12c); the module has no clock and the test proves the shape.
 *   3. **Quarantine, never crash** — corrupt persisted entries are dropped
 *      and counted; old saves read as an empty diary (the map-notebook
 *      precedent).
 *   4. **Deterministic** — same input, same output; validation never throws.
 */

import { describe, expect, it } from 'vitest';
import * as fieldDiaryModule from '../src/core/fieldDiary';
import {
  ENTRY_KINDS, EPISTEMICS, FIELD_DIARY_CAP, VISIBILITIES,
  appendEntry, correctEntry, parseFieldDiary, serializeFieldDiary,
  type FieldDiaryEntry,
} from '../src/core/fieldDiary';
import { GameState } from '../src/core/GameState';
import { parseSave } from '../src/core/Save';
import { dateOfCalendarDay } from '../src/core/calendar';

const ENTRY_DAY_1 = dateOfCalendarDay(1); // October 1, Year 1

function entry(over: Partial<FieldDiaryEntry> = {}): FieldDiaryEntry {
  return {
    id: 'E-Y1-1001-01',
    kind: 'PLACE',
    date: ENTRY_DAY_1,
    epistemic: 'FACT',
    body: 'Corner Slice. 14 seats, one hero oven, a radio that only likes the Mets.',
    links: ['corner-slice'],
    visibility: 'private',
    corrections: [],
    ...over,
  };
}

describe('field diary — the schema (narrative/03 §2)', () => {
  it('ten kinds, three epistemics, three visibilities — one schema', () => {
    expect(ENTRY_KINDS).toHaveLength(10);
    expect(EPISTEMICS).toEqual(['FACT', 'RECALL', 'GUESS']);
    expect(VISIBILITIES).toEqual(['private', 'secret', 'shared']);
  });

  it('a valid entry appends', () => {
    const res = appendEntry([], entry());
    expect(res.ok).toBe(true);
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0].corrections).toEqual([]);
  });

  it('every kind can be appended — the schema carries all ten records', () => {
    let entries: FieldDiaryEntry[] = [];
    ENTRY_KINDS.forEach((kind, i) => {
      const res = appendEntry(entries, entry({ id: `K${i}`, kind }));
      expect(res.ok).toBe(true);
      entries = res.entries;
    });
    expect(entries).toHaveLength(10);
  });
});

describe('field diary — append-only (doc 03 §5.1)', () => {
  it('a correction freezes the body bytes and grows only the corrections', () => {
    const res = appendEntry([], entry());
    const before = res.entries[0];
    const bodyBefore = before.body;

    const struck = correctEntry(res.entries, before.id, {
      day: 40,
      strike: 'gave',
      margin: 'Loaned. She never said give. I heard what I needed. — L',
    });
    expect(struck.ok).toBe(true);

    const after = struck.entries[0];
    expect(after.body).toBe(bodyBefore); // byte-for-byte
    expect(after.kind).toBe(before.kind);
    expect(after.epistemic).toBe(before.epistemic);
    expect(after.date).toEqual(before.date);
    expect(after.corrections).toEqual([{
      day: 40,
      strike: 'gave',
      margin: 'Loaned. She never said give. I heard what I needed. — L',
    }]);
    expect(struck.entries).toHaveLength(1); // nothing was removed or added
  });

  it('the input array is never mutated — append and correct return new arrays', () => {
    const res = appendEntry([], entry());
    const frozen = res.entries;
    const snapshot = JSON.stringify(frozen);

    appendEntry(res.entries, entry({ id: 'second' }));
    correctEntry(res.entries, 'E-Y1-1001-01', { day: 2, strike: 'x', margin: 'y' });

    expect(JSON.stringify(frozen)).toBe(snapshot); // the original is untouched
  });

  it('correcting a missing entry fails without touching the diary', () => {
    const res = appendEntry([], entry());
    const struck = correctEntry(res.entries, 'no-such-entry', { day: 2, strike: 'a', margin: 'b' });
    expect(struck.ok).toBe(false);
    expect(struck.reason).toBe('missing-entry');
    expect(struck.entries).toEqual(res.entries);
  });

  it('duplicate ids are rejected — an entry is written once', () => {
    const res = appendEntry([], entry());
    const again = appendEntry(res.entries, entry());
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('duplicate-id');
    expect(again.entries).toHaveLength(1);
  });
});

describe('field diary — tags never age (narrative/14 R12c)', () => {
  it('a RECALL stays a RECALL no matter how far the calendar walks', () => {
    const res = appendEntry([], entry({ kind: 'RECALL', epistemic: 'RECALL' }));
    let entries = res.entries;
    // walk a thousand days; correct the entry on the way; the tag holds
    for (let day = 2; day <= 1000; day += 99) {
      const struck = correctEntry(entries, 'E-Y1-1001-01', {
        day, strike: 'the railing', margin: 'still not memory.',
      });
      if (struck.ok) entries = struck.entries;
    }
    expect(entries[0].epistemic).toBe('RECALL');
  });

  it('the module exposes no time-based mutation — the API surface is the guard', () => {
    // the whole function list of the module: append, correct, serialize,
    // parse. No tick, no advance, no upgrade — the tag system cannot age.
    const fns = Object.keys(fieldDiaryModule)
      .filter((k) => typeof (fieldDiaryModule as Record<string, unknown>)[k] === 'function')
      .sort();
    expect(fns).toEqual(['appendEntry', 'correctEntry', 'parseFieldDiary', 'serializeFieldDiary']);
  });
});

describe('field diary — validation never throws (AGENTS.md §1c.4)', () => {
  it('rejects junk drafts with a reason and keeps the diary untouched', () => {
    const base = appendEntry([], entry()).entries;
    const cases: Array<[FieldDiaryEntry, string]> = [
      // each junk draft carries its own id — the ONLY thing under test is
      // the field's validation, not the duplicate-id rule (which has its
      // own case below)
      [entry({ id: 'j1', kind: 'DIARY' as FieldDiaryEntry['kind'] }), 'bad-kind'],
      [entry({ id: 'j2', epistemic: 'TRUE' as FieldDiaryEntry['epistemic'] }), 'bad-epistemic'],
      [entry({ id: 'j3', visibility: 'public' as FieldDiaryEntry['visibility'] }), 'bad-visibility'],
      [entry({ id: 'j4', body: '' }), 'bad-body'],
      [entry({ id: 'j5', body: 'x'.repeat(601) }), 'bad-body'],
      [entry({ id: 'j6', date: { y: 0, m: 10, d: 1 } }), 'bad-date'],
      [entry({ id: 'j7', date: { y: 1, m: 13, d: 1 } }), 'bad-date'],
      [entry({ id: 'j8', links: [''] }), 'bad-links'],
      [entry({ id: 'j9', links: [42 as unknown as string] }), 'bad-links'],
      [entry({ id: '' }), 'bad-id'],
      [entry({ id: 'x'.repeat(65) }), 'bad-id'],
    ];
    for (const [draft, reason] of cases) {
      const res = appendEntry(base, draft);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe(reason);
      expect(res.entries).toEqual(base);
    }
  });

  it('rejects junk corrections with a reason', () => {
    const entries = appendEntry([], entry()).entries;
    const cases: Array<[{ day: number; strike: string; margin: string }, string]> = [
      [{ day: 0, strike: 'a', margin: 'b' }, 'bad-correction'],
      [{ day: 2, strike: '', margin: 'b' }, 'bad-correction'],
      [{ day: 2, strike: 'a', margin: '' }, 'bad-correction'],
      [{ day: 2, strike: 'x'.repeat(201), margin: 'b' }, 'bad-correction'],
      [{ day: NaN, strike: 'a', margin: 'b' }, 'bad-correction'],
    ];
    for (const [c, reason] of cases) {
      const res = correctEntry(entries, 'E-Y1-1001-01', c);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe(reason);
    }
  });

  it('the diary caps at FIELD_DIARY_CAP entries', () => {
    let entries: FieldDiaryEntry[] = [];
    for (let i = 0; i < FIELD_DIARY_CAP; i++) {
      const res = appendEntry(entries, entry({ id: `E${i}` }));
      entries = res.entries;
    }
    const over = appendEntry(entries, entry({ id: 'over' }));
    expect(over.ok).toBe(false);
    expect(over.reason).toBe('cap');
    expect(over.entries).toHaveLength(FIELD_DIARY_CAP);
  });

  it('corrections cap per entry', () => {
    let entries = appendEntry([], entry()).entries;
    for (let i = 0; i < 8; i++) {
      const res = correctEntry(entries, 'E-Y1-1001-01', { day: i + 2, strike: 'a', margin: `m${i}` });
      expect(res.ok).toBe(true);
      entries = res.entries;
    }
    const over = correctEntry(entries, 'E-Y1-1001-01', { day: 99, strike: 'a', margin: 'm' });
    expect(over.ok).toBe(false);
    expect(over.reason).toBe('cap');
  });
});

describe('field diary — the save seam (quarantine, never crash)', () => {
  it('a corrupt container is an empty diary', () => {
    expect(parseFieldDiary(42)).toEqual({ entries: [], quarantined: 0 });
    expect(parseFieldDiary('nope')).toEqual({ entries: [], quarantined: 0 });
    expect(parseFieldDiary(null)).toEqual({ entries: [], quarantined: 0 });
  });

  it('corrupt entries are quarantined and counted; valid ones survive', () => {
    const good = serializeFieldDiary([entry()]);
    const raw = [
      good[0],                    // valid
      42,                         // not an object
      { id: '', kind: 'PLACE' },  // no id
      { id: 'k2', kind: 'MAYBE' },// bad kind
      { id: 'k3', kind: 'PLACE', epistemic: 'SOLID' }, // bad tag
      { id: 'k4', kind: 'PLACE', epistemic: 'FACT', body: 123 }, // bad body
    ];
    const parsed = parseFieldDiary(raw);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].id).toBe('E-Y1-1001-01');
    expect(parsed.quarantined).toBe(5);
  });

  it('serialize → parse round-trips an entry byte-for-byte', () => {
    let entries = appendEntry([], entry({ node: 'corner-slice' })).entries;
    entries = correctEntry(entries, 'E-Y1-1001-01', {
      day: 40, strike: 'gave', margin: 'Loaned. She never said give. — L',
    }).entries;
    const parsed = parseFieldDiary(JSON.parse(JSON.stringify(serializeFieldDiary(entries))));
    expect(parsed.entries).toEqual(entries);
    expect(parsed.quarantined).toBe(0);
  });

  it('an old save parses to an empty diary and a calendar on the story day', () => {
    const pre = parseSave(JSON.stringify({ day: 3, day_complete: true, money: 120 }));
    expect(pre.field_diary).toEqual([]);
    expect(pre.calendar_day).toBe(3); // absence reads as the story day — the mood-lock law
    expect(pre.calendar_day).toBe(parseSave(JSON.stringify({ day: 3 })).calendar_day);
  });

  it('calendar_day clamps: junk floors at 1, the story day wins when absent', () => {
    expect(parseSave(JSON.stringify({ day: 2, calendar_day: 0 })).calendar_day).toBe(1);
    expect(parseSave(JSON.stringify({ day: 2, calendar_day: -9 })).calendar_day).toBe(1);
    expect(parseSave(JSON.stringify({ day: 2, calendar_day: 999999 })).calendar_day).toBe(36500);
    expect(parseSave(JSON.stringify({ day: 2, calendar_day: '7' })).calendar_day).toBe(1);
  });
});

describe('field diary — the GameState seam', () => {
  it('logDiaryEntry appends through the state; rejects leave it untouched', () => {
    const s = new GameState();
    expect(s.logDiaryEntry(entry())).toBe(true);
    expect(s.fieldDiary).toHaveLength(1);
    expect(s.logDiaryEntry(entry())).toBe(false); // duplicate id
    expect(s.fieldDiary).toHaveLength(1);
    expect(s.logDiaryEntry(entry({ body: '' }))).toBe(false);
    expect(s.fieldDiary).toHaveLength(1);
  });

  it('correctDiaryEntry strikes through the state seam; the body freezes', () => {
    const s = new GameState();
    s.logDiaryEntry(entry());
    const bodyBefore = s.fieldDiary[0].body;
    expect(s.correctDiaryEntry('E-Y1-1001-01', 40, 'gave', 'Loaned.')).toBe(true);
    expect(s.fieldDiary[0].body).toBe(bodyBefore);
    expect(s.fieldDiary[0].corrections).toHaveLength(1);
    expect(s.correctDiaryEntry('ghost', 2, 'a', 'b')).toBe(false);
  });

  it('the snapshot carries calendar_day + field_diary and parses back exact', () => {
    const s = new GameState();
    s.day = 2; // day 1 never writes (save.gd law)
    s.dayComplete = true;
    s.logDiaryEntry(entry({ id: 'E-Y1-1002-01', date: dateOfCalendarDay(2) }));
    const snap = s.snapshotForSave();
    expect(snap?.calendar_day).toBe(1);
    expect(snap?.field_diary).toHaveLength(1);
    const parsed = parseSave(JSON.stringify(snap));
    expect(parsed.calendar_day).toBe(1);
    expect(parsed.field_diary).toEqual(snap!.field_diary);
  });

  it('an entry survives serialize → parse → the next state exactly', () => {
    const s = new GameState();
    s.day = 2;
    s.dayComplete = true;
    s.logDiaryEntry(entry({ kind: 'QUESTION', epistemic: 'GUESS', visibility: 'secret' }));
    const snap = s.snapshotForSave();
    const revived = parseSave(JSON.stringify(snap)).field_diary ?? [];
    const s2 = new GameState();
    s2.fieldDiary = revived;
    expect(s2.fieldDiary[0].kind).toBe('QUESTION');
    expect(s2.fieldDiary[0].epistemic).toBe('GUESS');
    expect(s2.fieldDiary[0].visibility).toBe('secret');
    expect(s2.fieldDiary[0].body).toBe(s.fieldDiary[0].body);
  });
});
