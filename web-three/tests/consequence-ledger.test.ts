/**
 * The consequence ledger (narrative/14 R2 + narrative/10 §1 —
 * core/consequenceLedger.ts).
 *
 * The load-bearing laws, each pinned:
 *   1. **Append-only** — entries are written once; the input array is
 *      never mutated; the API surface has no update/remove (doc 15 §5.3's
 *      no-retcon rule for player history).
 *   2. **Maturation is automatic and idempotent** — an unmet promise past
 *      its due date gains exactly one omission ("smaller coin, same
 *      currency", doc 10 §1); walking the clock again appends nothing.
 *   3. **Deterministic from save** — same ledger + same in-game day →
 *      byte-identical matured ledger, through the save round-trip.
 *   4. **No real-world dates** — in-game GameDate through core/calendar
 *      only; the source holds no clock read (R4).
 *   5. **Quarantine, never crash** — corrupt persisted entries are
 *      dropped and counted; old saves read as an empty ledger (the
 *      Save v1 law).
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ledgerModule from '../src/core/consequenceLedger';
import {
  LEDGER_CAP, LEDGER_KINDS, LEDGER_VISIBILITIES,
  appendLedgerEntry, isPromiseMet, maturePromises, omissionIdOf, openPromises,
  parseLedger, serializeLedger,
  type LedgerEntry,
} from '../src/core/consequenceLedger';
import { parseSave } from '../src/core/Save';
import { dateOfCalendarDay } from '../src/core/calendar';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// the canon anchors (DEC-1): day 1 = Tuesday, September 9, Year 1 — the
// arrival; day 8 = September 16 (the C1 season cut, calendar.ts §notes)
const D1 = dateOfCalendarDay(1);
const D7 = dateOfCalendarDay(7);
const D8 = dateOfCalendarDay(8);
const D9 = dateOfCalendarDay(9);

function promise(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 'P-eddie-flour-01',
    kind: 'promise',
    date: D1,
    refs: ['eddie'],
    weight: 2,
    visibility: 'private',
    due: D7,
    ...over,
  };
}

function choiceOn(promiseId: string, over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: `C-kept-${promiseId}`,
    kind: 'choice',
    date: D9,
    refs: [promiseId],
    weight: 0,
    visibility: 'private',
    ...over,
  };
}

describe('consequence ledger — the schema (narrative/14 R2)', () => {
  it('four kinds, three visibilities — one schema', () => {
    expect(LEDGER_KINDS).toEqual(['choice', 'promise', 'omission', 'amends']);
    expect(LEDGER_VISIBILITIES).toEqual(['private', 'secret', 'shared']);
  });

  it('a valid entry appends', () => {
    const res = appendLedgerEntry([], promise());
    expect(res.ok).toBe(true);
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0].due).toEqual(D7);
  });

  it('every kind can be appended — the schema carries all four records', () => {
    let entries: LedgerEntry[] = [];
    const kinds: LedgerEntry['kind'][] = ['choice', 'promise', 'omission', 'amends'];
    kinds.forEach((kind, i) => {
      const res = appendLedgerEntry(entries, promise({
        id: `K${i}`,
        kind,
        // doc 10 §1: every promise carries a due date — only the promise
        // needs one here
        ...(kind === 'promise' ? {} : { due: undefined }),
      }));
      expect(res.ok, `${kind} should append`).toBe(true);
      entries = res.entries;
    });
    expect(entries).toHaveLength(4);
  });
});

describe('consequence ledger — append-only (doc 15 §5.3)', () => {
  it('the input array is never mutated — append returns new arrays', () => {
    const res = appendLedgerEntry([], promise());
    const snapshot = JSON.stringify(res.entries);

    appendLedgerEntry(res.entries, promise({ id: 'second' }));
    maturePromises(res.entries, D9);

    expect(JSON.stringify(res.entries)).toBe(snapshot); // the original is untouched
  });

  it('duplicate ids are rejected — an entry is written once', () => {
    const res = appendLedgerEntry([], promise());
    const again = appendLedgerEntry(res.entries, promise());
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('duplicate-id');
    expect(again.entries).toHaveLength(1);
  });

  it('the module exposes no time-based mutation — the API surface is the guard', () => {
    // the whole function list of the module: append, maturation, reads,
    // serialize, parse. No tick, no advance, no rewrite — the ledger
    // cannot be edited after the fact.
    const fns = Object.keys(ledgerModule)
      .filter((k) => typeof (ledgerModule as Record<string, unknown>)[k] === 'function')
      .sort();
    expect(fns).toEqual([
      'appendLedgerEntry', 'isPromiseMet', 'maturePromises', 'omissionIdOf',
      'openPromises', 'parseLedger', 'serializeLedger',
    ]);
  });
});

describe('consequence ledger — the omission tracker (doc 10 §1)', () => {
  it('an unmet promise past its due date matures into exactly one omission', () => {
    const res = appendLedgerEntry([], promise({ due: D7 }));
    const walk = maturePromises(res.entries, D8); // Sept 16 — due Sept 15 has passed
    expect(walk.ok).toBe(true);
    expect(walk.matured).toEqual(['P-eddie-flour-01']);
    expect(walk.entries).toHaveLength(2);
    const om = walk.entries[1];
    expect(om.id).toBe(omissionIdOf('P-eddie-flour-01'));
    expect(om.kind).toBe('omission');
    expect(om.refs[0]).toBe('P-eddie-flour-01');  // references its promise
    expect(om.weight).toBe(2);                    // inherits the coin
    expect(om.visibility).toBe('private');        // inherits the sight
    expect(om.date).toEqual(D8);                  // lands on the walk day
  });

  it('maturation is idempotent — a second walk appends nothing', () => {
    const res = appendLedgerEntry([], promise({ due: D7 }));
    const first = maturePromises(res.entries, D8);
    const second = maturePromises(first.entries, D8);
    const third = maturePromises(second.entries, dateOfCalendarDay(40));
    expect(second.matured).toEqual([]);
    expect(second.entries).toHaveLength(first.entries.length);
    expect(third.matured).toEqual([]);
    expect(JSON.stringify(third.entries)).toBe(JSON.stringify(first.entries));
  });

  it('a met promise never matures — a later act referencing it counts', () => {
    const made = appendLedgerEntry([], promise({ due: D7 }));
    const kept = appendLedgerEntry(made.entries, choiceOn('P-eddie-flour-01', { date: D7 }));
    const walk = maturePromises(kept.entries, D9);
    expect(walk.matured).toEqual([]);
    expect(walk.entries).toHaveLength(2);
    expect(isPromiseMet(kept.entries, 'P-eddie-flour-01')).toBe(true);
  });

  it('a promise not yet due does not mature — the walk is the clock', () => {
    const res = appendLedgerEntry([], promise({ due: D7 }));
    const walk = maturePromises(res.entries, D1);
    expect(walk.matured).toEqual([]);
    expect(walk.entries).toHaveLength(1);
  });

  it('an authored omission blocks a duplicate derived one (idempotency by id)', () => {
    const made = appendLedgerEntry([], promise({ due: D7 }));
    const authored = appendLedgerEntry(made.entries, {
      id: omissionIdOf('P-eddie-flour-01'),
      kind: 'omission', date: D7, refs: ['P-eddie-flour-01'], weight: 2,
      visibility: 'private',
    });
    const walk = maturePromises(authored.entries, D9);
    expect(walk.matured).toEqual([]);
    expect(walk.entries).toHaveLength(2);
  });

  it('openPromises lists made, unmet, unmatured promises — and drops matured ones', () => {
    const a = appendLedgerEntry([], promise({ id: 'P-a', due: D7 }));
    const b = appendLedgerEntry(a.entries, promise({ id: 'P-b', due: dateOfCalendarDay(30) }));
    const c = appendLedgerEntry(b.entries, promise({ id: 'P-c', due: D7 }));
    const kept = appendLedgerEntry(c.entries, choiceOn('P-c', { id: 'C-kept-P-c' }));
    // before the walk: P-a (due, unmet) and P-b (not yet due) are open
    expect(openPromises(kept.entries, D8).map((e) => e.id)).toEqual(['P-a', 'P-b']);
    // after the walk: P-a matured and drops out; P-b still open
    const walked = maturePromises(kept.entries, D8);
    expect(openPromises(walked.entries, D8).map((e) => e.id)).toEqual(['P-b']);
  });

  it('maturation never throws on a bad `now` — and never mutates on failure', () => {
    const res = appendLedgerEntry([], promise());
    const snapshot = JSON.stringify(res.entries);
    const walk = maturePromises(res.entries, { y: 0, m: 13, d: 0 });
    expect(walk.ok).toBe(false);
    expect(walk.reason).toBe('bad-now');
    expect(JSON.stringify(res.entries)).toBe(snapshot);
  });
});

describe('consequence ledger — validation never throws (AGENTS.md §1c.4)', () => {
  it('rejects junk drafts with a reason and keeps the ledger untouched', () => {
    const base = appendLedgerEntry([], promise()).entries;
    const cases: Array<[LedgerEntry, string]> = [
      [promise({ id: 'j1', kind: 'betrayal' as LedgerEntry['kind'] }), 'bad-kind'],
      [promise({ id: 'j2', visibility: 'public' as LedgerEntry['visibility'] }), 'bad-visibility'],
      [promise({ id: 'j3', date: { y: 0, m: 10, d: 1 } }), 'bad-date'],
      [promise({ id: 'j4', date: { y: 500, m: 10, d: 1 } }), 'bad-date'], // beyond the year bound
      [promise({ id: 'j5', refs: [] }), 'bad-refs'],
      [promise({ id: 'j6', refs: [''] }), 'bad-refs'],
      [promise({ id: 'j7', weight: -1 }), 'bad-weight'],
      [promise({ id: 'j8', weight: 1.5 }), 'bad-weight'],
      [promise({ id: 'j9', weight: 101 }), 'bad-weight'],
      [promise({ id: 'j10', due: undefined }), 'bad-due'],          // a promise without a due date
      [promise({ id: 'j11', due: { y: 1, m: 13, d: 1 } }), 'bad-due'],
      [{ ...choiceOn('x'), id: 'j12', due: D7 }, 'bad-due'],        // a due date on a choice
      [promise({ id: '' }), 'bad-id'],
      [promise({ id: 'x'.repeat(65) }), 'bad-id'],
    ];
    for (const [draft, reason] of cases) {
      const res = appendLedgerEntry(base, draft);
      expect(res.ok, `${reason} expected`).toBe(false);
      expect(res.reason).toBe(reason);
      expect(res.entries).toEqual(base);
    }
  });

  it('the ledger caps at LEDGER_CAP entries', () => {
    let entries: LedgerEntry[] = [];
    for (let i = 0; i < LEDGER_CAP; i++) {
      const res = appendLedgerEntry(entries, promise({ id: `P${i}`, due: D7 }));
      entries = res.entries;
    }
    const over = appendLedgerEntry(entries, promise({ id: 'over', due: D7 }));
    expect(over.ok).toBe(false);
    expect(over.reason).toBe('cap');
    expect(over.entries).toHaveLength(LEDGER_CAP);
  });
});

describe('consequence ledger — the save seam (quarantine, never crash)', () => {
  it('a corrupt container is an empty ledger', () => {
    expect(parseLedger(42)).toEqual({ entries: [], quarantined: 0 });
    expect(parseLedger('nope')).toEqual({ entries: [], quarantined: 0 });
    expect(parseLedger(null)).toEqual({ entries: [], quarantined: 0 });
  });

  it('corrupt entries are quarantined and counted; valid ones survive', () => {
    const good = serializeLedger([promise()]);
    const raw = [
      good[0],                        // valid
      42,                             // not an object
      { id: '', kind: 'choice' },     // no id
      { id: 'k2', kind: 'MAYBE' },    // bad kind
      { id: 'k3', kind: 'choice', visibility: 'PUBLIC' }, // bad visibility
      { id: 'k4', kind: 'choice', visibility: 'private', date: 5 }, // bad date
      { id: 'k5', kind: 'promise', visibility: 'private', date: D1, refs: ['eddie'], weight: 2 }, // no due
      { id: 'k6', kind: 'choice', visibility: 'private', date: D1, refs: ['x'], weight: 2, due: D7 }, // due on a choice
      { id: 'k7', kind: 'promise', visibility: 'private', date: D1, refs: ['eddie'], weight: 2, due: 'soon' }, // bad due
      { id: 'k8', kind: 'choice', visibility: 'private', date: D1, refs: 3, weight: 2 }, // bad refs
    ];
    const parsed = parseLedger(raw);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].id).toBe('P-eddie-flour-01');
    expect(parsed.quarantined).toBe(9);
  });

  it('serialize → parse round-trips an entry byte-for-byte', () => {
    let entries = appendLedgerEntry([], promise({ node: 'N1a' })).entries;
    entries = maturePromises(entries, D8).entries;
    const round = parseLedger(serializeLedger(entries));
    expect(round.quarantined).toBe(0);
    expect(JSON.stringify(round.entries)).toBe(JSON.stringify(entries));
  });

  it('old saves parse with an empty new layer — the Save v1 law', () => {
    // the shipped Day-4 save shape (no ledger key at all)
    const old = parseSave(JSON.stringify({ day: 4, money: 123, day_complete: true }));
    expect(old.ledger).toEqual([]);
    // a null/empty store
    expect(parseSave(null).ledger).toEqual([]);
    // a corrupt ledger container never crashes the parse
    const junk = parseSave(JSON.stringify({ day: 2, ledger: 42 }));
    expect(junk.ledger).toEqual([]);
  });

  it('a ledger in the save round-trips through parseSave', () => {
    const entries = maturePromises(appendLedgerEntry([], promise({ node: 'N1a' })).entries, D8).entries;
    const saved = JSON.stringify({ day: 4, money: 123, ledger: serializeLedger(entries) });
    const parsed = parseSave(saved);
    expect(JSON.stringify(parsed.ledger)).toBe(JSON.stringify(entries));
  });
});

describe('consequence ledger — determinism from save (narrative/14 §6)', () => {
  it('same save + same in-game day → byte-identical matured ledger, twice', () => {
    const base = appendLedgerEntry([], promise({ id: 'P-a', due: D7, weight: 3 }));
    const b2 = appendLedgerEntry(base.entries, promise({ id: 'P-b', due: D9, weight: 1 }));

    const fromSave = parseLedger(serializeLedger(b2.entries)).entries;
    const runA = maturePromises(fromSave, D9);
    const runB = maturePromises(parseLedger(serializeLedger(b2.entries)).entries, D9);

    expect(runA.matured).toEqual(['P-a', 'P-b']);
    expect(JSON.stringify(runA.entries)).toBe(JSON.stringify(runB.entries));
    // ...and identical to maturing the in-memory ledger
    expect(JSON.stringify(runA.entries))
      .toBe(JSON.stringify(maturePromises(b2.entries, D9).entries));
  });

  it('omission ids are derived, never rolled — stable across boots', () => {
    expect(omissionIdOf('P-eddie-flour-01')).toBe('omit-P-eddie-flour-01');
    expect(omissionIdOf('P-eddie-flour-01')).toBe(omissionIdOf('P-eddie-flour-01'));
  });
});

describe('consequence ledger — no real-world dates (narrative/14 R4)', () => {
  it('the source holds the law: no Date object, no clock read, in consequenceLedger.ts', () => {
    const src = readFileSync(join(REPO_ROOT, 'web-three', 'src', 'core', 'consequenceLedger.ts'), 'utf8');
    // the class of mistake — reaching for the real clock — cannot return
    // quietly: any of these in the source fails this test (AGENTS.md §1c.1)
    expect(src).not.toMatch(/new\s+Date|Date\.now|Date\.parse|toLocaleDateString|toISOString|performance\.now/);
  });
});
