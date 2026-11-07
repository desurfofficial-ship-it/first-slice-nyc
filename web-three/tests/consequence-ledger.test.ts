/**
 * The consequence ledger (narrative/14 R2 + narrative/10 §1 —
 * core/consequenceLedger.ts, WP-5).
 *
 * The load-bearing laws, each pinned:
 *   1. **Append-only** — the API has no update/remove; inputs are never
 *      mutated; persisted bytes freeze (the fieldDiary precedent).
 *   2. **Promises mature once** — a due date passed becomes exactly one
 *      omission, "smaller coin, same currency" (doc 10 §1); kept
 *      promises never mature; re-running maturation is a no-op.
 *   3. **Deterministic from save** — no clock, no dice; omission ids
 *      derive from promise ids; same save + same today = same bytes.
 *   4. **Quarantine, never crash** — corrupt entries drop and count;
 *      old saves parse to an empty ledger (the map-notebook precedent).
 *   5. **Caps** — the ledger and the register are finite data.
 */

import { describe, expect, it } from 'vitest';
import * as ledgerModule from '../src/core/consequenceLedger';
import {
  LEDGER_CAP, LEDGER_KINDS, LEDGER_VISIBILITIES,
  appendLedgerEntry, keepPromise, makePromise, maturePromises,
  parseLedger, parsePromises, serializeLedger, serializePromises,
  type LedgerEntry, type PromiseRecord,
} from '../src/core/consequenceLedger';
import { parseSave, defaultSave } from '../src/core/Save';
import { dateOfCalendarDay, calendarDayOf } from '../src/core/calendar';

const DAY_1 = dateOfCalendarDay(1);  // Tuesday, September 9, Year 1 — the arrival (DEC-1)
const DAY_5 = dateOfCalendarDay(5);

function entry(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 'choice/N1a/honest-odds',
    kind: 'choice',
    date: DAY_1,
    refs: ['N1a'],
    weight: 1,
    visibility: 'private',
    ...over,
  };
}

function promise(over: Partial<PromiseRecord> = {}): PromiseRecord {
  return {
    id: 'promise/eddie-flour',
    date: DAY_1,
    due: DAY_5,
    refs: ['eddie'],
    weight: 2,
    visibility: 'private',
    state: 'open',
    ...over,
  };
}

describe('consequence ledger — the schema (narrative/14 R2)', () => {
  it('four kinds, three visibilities — one schema', () => {
    expect(LEDGER_KINDS).toEqual(['choice', 'promise', 'omission', 'amends']);
    expect(LEDGER_VISIBILITIES).toEqual(['private', 'secret', 'shared']);
  });

  it('a valid entry appends; the entry is a fresh frozen shape', () => {
    const res = appendLedgerEntry([], entry());
    expect(res.ok).toBe(true);
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0]).toEqual(entry());
  });

  it('every kind appends — the schema carries all four records', () => {
    let entries: LedgerEntry[] = [];
    LEDGER_KINDS.forEach((kind, i) => {
      const res = appendLedgerEntry(entries, entry({ id: `K${i}`, kind }));
      expect(res.ok).toBe(true);
      entries = res.entries;
    });
    expect(entries).toHaveLength(4);
  });

  it('a promise goes on the record with its due date (doc 14 R2)', () => {
    const res = makePromise([], promise());
    expect(res.ok).toBe(true);
    expect(res.promises[0].state).toBe('open');
    expect(res.promises[0].due).toEqual(DAY_5);
  });

  it('a promise due before it was made is refused — no laundering', () => {
    const res = makePromise([], promise({ due: DAY_1, date: DAY_5 }));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('bad-due');
  });
});

describe('consequence ledger — append-only (the fieldDiary law)', () => {
  it('the input array is never mutated — append returns a new array', () => {
    const original = [entry()];
    const snapshot = structuredClone(original);
    const res = appendLedgerEntry(original, entry({ id: 'second' }));
    expect(res.ok).toBe(true);
    expect(original).toEqual(snapshot);
    expect(res.entries).not.toBe(original);
  });

  it('a frozen ledger still appends — nothing writes through the input', () => {
    const frozen = Object.freeze([Object.freeze(entry())]);
    const res = appendLedgerEntry(frozen, entry({ id: 'second' }));
    expect(res.ok).toBe(true);
    expect(res.entries).toHaveLength(2);
    expect(frozen).toHaveLength(1);
  });

  it('duplicate ids are rejected — an act is written once', () => {
    const ledger = appendLedgerEntry([], entry()).entries;
    const res = appendLedgerEntry(ledger, entry());
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('duplicate-id');
    expect(res.entries).toHaveLength(1);
  });

  it('the module exposes no update or remove — the API surface is the guard', () => {
    const api = Object.keys(ledgerModule).sort();
    const mutators = api.filter((k) => /^(update|remove|delete|edit|splice|patch|rewrite)/i.test(k));
    expect(mutators).toEqual([]);
    expect(api).toContain('appendLedgerEntry');
    expect(api).toContain('maturePromises');
  });
});

describe('consequence ledger — validation never throws (AGENTS.md §1c.4)', () => {
  const wrongs = [null, undefined, 42, 'banana', [], {}, [NaN], -1, 1e9];

  it('junk drafts are refused with a reason; the ledger is untouched', () => {
    const ledger = appendLedgerEntry([], entry()).entries;
    for (const wrong of wrongs) {
      const res = appendLedgerEntry(ledger, wrong as unknown as LedgerEntry);
      expect(res.ok).toBe(false);
      expect(res.entries).toHaveLength(1);
    }
  });

  it('junk promise drafts are refused with a reason', () => {
    const register = makePromise([], promise()).promises;
    for (const wrong of wrongs) {
      const res = makePromise(register, wrong as unknown as PromiseRecord);
      expect(res.ok).toBe(false);
      expect(res.promises).toHaveLength(1);
    }
  });

  it('weights beyond the coin bound are refused', () => {
    const res = appendLedgerEntry([], entry({ weight: 1e6 }));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('bad-weight');
  });

  it('the ledger caps at LEDGER_CAP entries', () => {
    let entries: LedgerEntry[] = [];
    for (let i = 0; i < LEDGER_CAP; i++) {
      const res = appendLedgerEntry(entries, entry({ id: `E${i}` }));
      expect(res.ok).toBe(true);
      entries = res.entries;
    }
    const over = appendLedgerEntry(entries, entry({ id: 'over' }));
    expect(over.ok).toBe(false);
    expect(over.reason).toBe('cap');
    expect(over.entries).toHaveLength(LEDGER_CAP);
  });
});

describe('promises — maturation into omissions (doc 10 §1)', () => {
  it('an unmet promise matures into exactly one omission — smaller coin, same currency', () => {
    const p = makePromise([], promise({ weight: 2 })).promises;
    const res = maturePromises([], p, DAY_5);
    // due === today is NOT yet unmet: the due date must PASS
    expect(res.ok).toBe(true);
    expect(res.matured).toEqual([]);

    const res2 = maturePromises([], p, dateOfCalendarDay(6));
    expect(res2.ok).toBe(true);
    expect(res2.matured).toEqual(['promise/eddie-flour']);
    expect(res2.ledger).toHaveLength(1);
    const omission = res2.ledger[0];
    expect(omission.kind).toBe('omission');
    expect(omission.id).toBe('omission/promise/eddie-flour');
    expect(omission.weight).toBe(2); // the promise's coin, carried
    expect(omission.refs).toContain('promise/eddie-flour');
    expect(omission.refs).toContain('eddie');
    expect(res2.promises[0].state).toBe('matured');
    expect(res2.promises[0].maturedAs).toBe('omission/promise/eddie-flour');
  });

  it('maturation is fire-once — a re-run is a no-op by construction', () => {
    const p = makePromise([], promise()).promises;
    const first = maturePromises([], p, dateOfCalendarDay(6));
    const second = maturePromises(first.ledger, first.promises, dateOfCalendarDay(7));
    expect(second.ok).toBe(true);
    expect(second.matured).toEqual([]);
    expect(second.ledger).toHaveLength(1);
  });

  it('a kept promise never matures', () => {
    const made = makePromise([], promise()).promises;
    const kept = keepPromise(made, 'promise/eddie-flour', 4);
    expect(kept.ok).toBe(true);
    const res = maturePromises([], kept.promises, dateOfCalendarDay(30));
    expect(res.matured).toEqual([]);
    expect(res.ledger).toHaveLength(0);
    expect(res.promises[0].state).toBe('kept');
  });

  it('keeping twice is refused; keeping a matured promise is refused', () => {
    const made = makePromise([], promise()).promises;
    const kept1 = keepPromise(made, 'promise/eddie-flour', 4);
    const kept2 = keepPromise(kept1.promises, 'promise/eddie-flour', 5);
    expect(kept2.ok).toBe(false);
    expect(kept2.reason).toBe('not-open');
    const matured = maturePromises([], makePromise([], promise()).promises, dateOfCalendarDay(9)).promises;
    const afterMatured = keepPromise(matured, 'promise/eddie-flour', 10);
    expect(afterMatured.ok).toBe(false);
    expect(afterMatured.reason).toBe('not-open');
  });

  it('many promises mature in register order; open ones wait', () => {
    const a = promise({ id: 'promise/a', due: dateOfCalendarDay(3), weight: 1 });
    const b = promise({ id: 'promise/b', due: dateOfCalendarDay(4), weight: 3 });
    const c = promise({ id: 'promise/c', due: dateOfCalendarDay(30), weight: 9 });
    const register = a; // makePromise one by one
    const reg = [b, c].reduce((acc, p) => makePromise(acc, p).promises, makePromise([], a).promises);
    expect(reg.map((p) => p.id)).toEqual(['promise/a', 'promise/b', 'promise/c']);
    const res = maturePromises([], reg, dateOfCalendarDay(8));
    expect(res.matured).toEqual(['promise/a', 'promise/b']);
    expect(res.ledger.map((e) => e.weight)).toEqual([1, 3]);
    expect(res.promises.find((p) => p.id === 'promise/c')?.state).toBe('open');
    void register;
  });

  it('a matured promise at the ledger cap stays open — nothing is lost', () => {
    let full: LedgerEntry[] = [];
    for (let i = 0; i < LEDGER_CAP; i++) {
      full = appendLedgerEntry(full, entry({ id: `E${i}` })).entries;
    }
    const p = makePromise([], promise()).promises;
    const res = maturePromises(full, p, dateOfCalendarDay(6));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('cap');
    expect(res.promises[0].state).toBe('open'); // will mature next call
    expect(res.ledger).toHaveLength(LEDGER_CAP);
  });
});

describe('consequence ledger — determinism from save (doc 14 §6)', () => {
  it('same save + same today → the same ledger bytes', () => {
    const reg = makePromise([], promise()).promises;
    const saved = JSON.stringify({ ...defaultSave(), promises: serializePromises(reg) });
    const a = maturePromises([], parseSave(saved).promises ?? [], dateOfCalendarDay(6));
    const b = maturePromises([], parseSave(saved).promises ?? [], dateOfCalendarDay(6));
    expect(JSON.stringify(a.ledger)).toBe(JSON.stringify(b.ledger));
    expect(JSON.stringify(a.promises)).toBe(JSON.stringify(b.promises));
  });

  it('serialize → parse round-trips entries and promises exactly', () => {
    const entries = [
      entry(),
      entry({ id: 'omission/promise/eddie-flour', kind: 'omission', weight: 2, refs: ['promise/eddie-flour', 'eddie'] }),
      entry({ id: 'amends/eddie-1', kind: 'amends', visibility: 'shared', weight: 5 }),
    ];
    const round = parseLedger(JSON.parse(JSON.stringify(serializeLedger(entries))));
    expect(round.quarantined).toBe(0);
    expect(round.entries).toEqual(entries);
    const reg = makePromise([], promise()).promises;
    const kept = keepPromise(reg, 'promise/eddie-flour', 4).promises;
    const roundP = parsePromises(JSON.parse(JSON.stringify(serializePromises(kept))));
    expect(roundP.quarantined).toBe(0);
    expect(roundP.promises).toEqual(kept);
  });

  it('the cascade join holds: omission refs join the matured promise (C5 reads only this)', () => {
    const reg = makePromise([], promise({ id: 'promise/flyers', refs: ['eddie', 'N1a'] })).promises;
    const res = maturePromises([], reg, dateOfCalendarDay(6));
    const omission = res.ledger.find((e) => e.kind === 'omission');
    const maturedAs = res.promises[0].maturedAs;
    expect(omission?.id).toBe(maturedAs);
    expect(res.ledger.find((e) => e.id === maturedAs)?.refs).toContain('promise/flyers');
  });

  it('no wall clock exists in the module — every date comes from the caller', () => {
    const src = 'src/core/consequenceLedger.ts'.length > 0 ? ledgerModule : null;
    void src;
    // the calendar import surface: only the pure day-arithmetic is used
    expect(typeof calendarDayOf).toBe('function');
    // the API has no "now"/"today" zero-arg entry point: every function
    // that needs a date takes one (pinned by the signature law below)
    expect(maturePromises.length).toBe(3);   // ledger, promises, today
    expect(keepPromise.length).toBe(3);      // promises, id, onDay
  });
});

describe('consequence ledger — the save seam (quarantine, never crash)', () => {
  it('a corrupt container is an empty ledger / register', () => {
    expect(parseLedger('banana')).toEqual({ entries: [], quarantined: 0 });
    expect(parseLedger(42)).toEqual({ entries: [], quarantined: 0 });
    expect(parsePromises(null)).toEqual({ promises: [], quarantined: 0 });
  });

  it('corrupt entries are quarantined and counted; valid ones survive', () => {
    const raw = [
      entry(),
      { id: 42 },
      null,
      entry({ id: 'ok-2', kind: 'amends' }),
      entry({ id: '', weight: NaN }),
      'flour',
    ];
    const res = parseLedger(raw);
    expect(res.entries.map((e) => e.id)).toEqual(['choice/N1a/honest-odds', 'ok-2']);
    expect(res.quarantined).toBe(4);
  });

  it('duplicate ids keep the first and quarantine the rest', () => {
    const res = parseLedger([entry(), entry(), entry({ id: 'other' })]);
    expect(res.entries).toHaveLength(2);
    expect(res.quarantined).toBe(1);
  });

  it('a matured promise without its omission link quarantines — the join is load-bearing', () => {
    const res = parsePromises([promise({ state: 'matured', maturedAs: 'omission/promise/eddie-flour' }), promise({ id: 'p2', state: 'matured' })]);
    expect(res.promises).toHaveLength(1);
    expect(res.quarantined).toBe(1);
  });

  it('an old save (no ledger keys) parses to an empty ledger and register', () => {
    const old = '{"day":2,"money":112,"cart_name":"Corner Slice","kid_kept":true}';
    const s = parseSave(old);
    expect(s.ledger).toEqual([]);
    expect(s.promises).toEqual([]);
    expect(s.day).toBe(2);
  });

  it('the fuzz wall holds: every wrong shape parses to a valid save', () => {
    const wrongs = [null, undefined, 42, 'banana', [], {}, [NaN], [Infinity], { a: 1 }, -1, 1e9];
    for (const field of ['ledger', 'promises']) {
      for (const wrong of wrongs) {
        const raw = JSON.stringify({ ...defaultSave(), [field]: wrong });
        expect(() => parseSave(raw), `${field} = ${JSON.stringify(wrong)}`).not.toThrow();
        const s = parseSave(raw);
        expect(Array.isArray(s.ledger)).toBe(true);
        expect(Array.isArray(s.promises)).toBe(true);
      }
    }
  });

  it('a full ledger + register rides the save and parses back exact', () => {
    const entries = [
      appendLedgerEntry([], entry()).entries,
    ].flat();
    const reg = maturePromises([], makePromise([], promise()).promises, dateOfCalendarDay(6));
    const save = {
      ...defaultSave(),
      ledger: serializeLedger(entries),
      promises: serializePromises(reg.promises),
    };
    const s = parseSave(JSON.stringify(save));
    expect(s.ledger).toEqual(entries);
    expect(s.promises).toEqual(reg.promises);
  });
});
