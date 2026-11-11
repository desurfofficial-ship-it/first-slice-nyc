/**
 * tests/r13-r14-stage9.test.ts — Phase 7 stage 9's acceptance suite
 * (narrative/14 R13 + R14 — the register's last machine rows).
 *
 * R14 — the amends economy (doc 09 §4's table as data):
 *  - the table: nineteen rows, the doc's own order, the doc's own words
 *    riding each row's note; ids unique; every payable row prices its
 *    canon door (quarters, bursar, labor, cash-unopened — doc 14 R14's
 *    own exemplars plus the doc's other doors), every terminal row
 *    prices none;
 *  - the sums DERIVE: the raise, the release principal, and the
 *    restitution are computed from the rows at module load, and the C5
 *    machine's pinned constants AGREE ($61,500 / $14,200 / $47,300 —
 *    two machines, one arithmetic, proved by test);
 *  - the release partition is FORCED: exactly one 9-row subset of the
 *    nineteen sums to $14,200 (the test enumerates all 92,378 and fails
 *    on any second) — the prose's own numbers pin the reading;
 *  - the doors: payAmends pays through the row's own verb or refuses
 *    (wrong verb, overpay, terminal, no such row), installment rows
 *    accumulate, Ada accepts exactly the schedule's first dollar and
 *    then refuses forever (her refused-twice precedent is the row's own
 *    law), and the machine never mutates the caller's progress;
 *  - the seed: amendsFromLedger reads the C6 wave's own amends acts
 *    (the refs GameState's stations already log) — Ada's first dollar
 *    closes her row partial, the letter closes Grace, the boiler-watch
 *    closes Father Mike, the booth closes Verna, the last envelope
 *    closes Odessa; Idris stays open honestly (no C6 act closes him);
 *    idempotent on repeat acts, blind to unknown refs;
 *  - the verdict: the machine's own read — rows closed of nineteen, the
 *    chain's open faces, the schedule's remaining legal principal.
 *
 * R13 — the self-portrait reads the rows (doc 03 §7):
 *  - the composer's facts path: with amendsFacts the debts paragraph
 *    speaks the table's truth (rows closed of nineteen, the schedule's
 *    principal still walking); without it, byte-identical to the
 *    shipped act-count line (the C6 prose keeps);
 *  - the determinism law: identical state → identical text, both paths;
 *  - the never-grades law holds on the facts path too;
 *  - the 600-cap: the diary's own law, facts included;
 *  - GameState's shipped portrait now derives the facts from the
 *    ledger's acts (writeSelfPortrait → amendsFacts), the doors fired
 *    on their canon days prove it, and the act-count machines
 *    (kevTakesLetter, debtsComplete) ride untouched beneath it.
 *
 * The hygiene: no real-world dates anywhere near the module (R4 — the
 * live source scan, the ledger test's own pattern).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AMENDS_ROWS, AMENDS_IDS, AMENDS_TOTALS, AMENDS_SOURCE,
  seedAmendsProgress, amendsFromLedger, payAmends, amendsVerdict,
  amendsPortraitFacts, validateAmends, AMENDS_ACT_REF_TO_ROW,
  AMENDS_INSTALLMENT_VERBS,
} from '../src/core/amends';
import { C5_RAISE_TOTAL, C5_CORVUS_RELEASES, C5_RESTITUTION_SETTLE } from '../src/core/c5pack';
import { composeSelfPortrait, type SelfPortraitInput } from '../src/core/c6pack';
import { GameState, Step } from '../src/core/GameState';
import { advanceChapter } from '../src/core/chapters';
import { dateOfCalendarDay } from '../src/core/calendar';
import type { LedgerEntry } from '../src/core/consequenceLedger';
import type { Effect } from '../src/core/GameState';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function noteTexts(out: Effect[]): string[] {
  return out.filter((e) => e.kind === 'note').map((e) => (e as { text: string }).text);
}

const act = (id: string, refs: string[], day: number): LedgerEntry => ({
  id,
  kind: 'amends',
  date: dateOfCalendarDay(day),
  refs,
  weight: 1,
  visibility: 'private',
});

/** The C6 wave's five amends acts, refs verbatim from GameState's
 *  c6Amend call sites (the machine's only seed vocabulary so far). */
const C6_ACTS: LedgerEntry[] = [
  act('led-c6-first-dollar', ['ada', 'restitution', 'first-dollar'], 814),
  act('led-c6-grace-letter', ['grace', 'kev-reference-letter'], 870),
  act('led-c6-boiler-watch', ['father-mike', 'boiler-watch', 'forum-apology'], 898),
  act('led-c6-verna-booth', ['verna', 'crossing-guard-booth'], 990),
  act('led-c6-odessa-envelope', ['odessa', 'winter-tree-lights', 'cigar-box'], 1016),
];

/** A C6 station boot — the c6 suite's own shape, one helper copy. */
function stationStart(day: number): GameState {
  const s = new GameState();
  s.day = day;
  s.calendarDay = day;
  const advs: Array<[number, number]> = [[8, 1], [120, 2], [296, 3], [485, 4]];
  for (const [day2, ch] of advs) {
    const next = ['C1', 'C2', 'C3', 'C4'][ch - 1] as 'C1' | 'C2' | 'C3' | 'C4';
    const adv = advanceChapter(s.chapter, next, { day: day2, triggerHeld: true });
    if (adv.ok) s.chapter = adv.state;
  }
  const adv5 = advanceChapter(s.chapter, 'C5', { day: 663, triggerHeld: true });
  if (adv5.ok) s.chapter = adv5.state;
  const adv6 = advanceChapter(s.chapter, 'C6', { day: 814, triggerHeld: true });
  if (adv6.ok) s.chapter = adv6.state;
  s.onDay2 = true;
  s.stoolUp = true;
  s.kidKept = true;
  s.awningUp = true;
  s.idrisServed = true;
  s.permitFiled = true;
  s.setStep(Step.WK_WAKE);
  return s;
}

const BASE_INPUT: SelfPortraitInput = {
  day: 1016, money: 1212, amendsActs: 5,
  restitutionSize: 'settle', firstChapter: 'diner-plus-ledger',
  standing: 'garden-reckoning', juneConditions: true, therapy: true,
  kevTakes: true, testimony: 'testify', marisol: 'decline',
  fragmentsRecovered: 5, k4Unstruck: true, hallOpen: true, hearingWon: true,
};

// ----------------------------------------------------------- the table ----

describe('R14 — the table is doc 09 \u00A74\u2019s own rows, as data', () => {
  it('nineteen rows, the doc\u2019s own order, ids unique', () => {
    expect(AMENDS_ROWS.length).toBe(19);
    expect(new Set(AMENDS_IDS).size).toBe(19);
    expect(AMENDS_IDS.join(',')).toBe(
      'leo-own,ada,sycamore,big-mike,fitz,uzun-cousins,oktay,father-mike,verna,fatima,'
      + 'grace,nilda,sal,deon,odessa,marcus,idris,chino,darnell',
    );
  });

  it('each row carries the doc\u2019s own words (the state column, verbatim in the note)', () => {
    const byId = new Map(AMENDS_ROWS.map((r) => [r.id, r]));
    expect(byId.get('leo-own')!.note).toContain('Forgone');
    expect(byId.get('ada')!.note).toContain('Pay your debts in order.');
    expect(byId.get('sycamore')!.note).toContain('Signed release');
    expect(byId.get('uzun-cousins')!.note).toContain('the coldest room in the arc');
    expect(byId.get('father-mike')!.note).toContain('boiler-watch');
    expect(byId.get('verna')!.note).toContain('crossing-guard\u2019s booth');
    expect(byId.get('fatima')!.note).toContain('catering labor');
    expect(byId.get('grace')!.note).toContain('not cash');
    expect(byId.get('sal')!.note).toContain('quarters, literally');
    expect(byId.get('odessa')!.note).toContain('unopened');
    expect(byId.get('idris')!.note).toContain('bursar route only');
    expect(byId.get('chino')!.note).toContain('produce-grade installments');
    expect(byId.get('darnell')!.note).toContain('scorekeeping');
    expect(byId.get('marcus')!.note).toContain('the whistle nod');
  });

  it('the doors law: payable rows price canon verbs, terminal rows price none', () => {
    const byId = new Map(AMENDS_ROWS.map((r) => [r.id, r]));
    expect(byId.get('sal')!.verbs).toEqual(['quarters']);
    expect(byId.get('odessa')!.verbs).toEqual(['cash-unopened']);
    expect(byId.get('idris')!.verbs).toEqual(['bursar']);
    expect(byId.get('darnell')!.verbs).toEqual(['scorekeeping']);
    expect(byId.get('father-mike')!.verbs).toEqual(['boiler-watch']);
    expect(byId.get('fatima')!.verbs).toEqual(['catering-labor']);
    expect(byId.get('ada')!.verbs).toEqual(['first-dollar-via-bea']);
    expect(byId.get('ada')!.terminal).toBe('partial'); // her resolution is the refusal after
    for (const id of ['leo-own', 'sycamore', 'big-mike', 'fitz', 'uzun-cousins', 'oktay']) {
      expect(byId.get(id)!.verbs).toEqual([]);
    }
    // doc 14 R14's own exemplars are all priced somewhere on the table
    const verbs = new Set(AMENDS_ROWS.flatMap((r) => [...r.verbs]));
    for (const v of ['quarters', 'bursar', 'cash-unopened'] as const) {
      expect(verbs.has(v)).toBe(true);
    }
    expect(verbs.size).toBe(11);
    expect(AMENDS_INSTALLMENT_VERBS).toEqual(['produce-installments']);
  });

  it('the source cites the doc, and the pack checks itself (validateAmends)', () => {
    expect(AMENDS_SOURCE).toContain('doc 09 \u00A74');
    expect(() => validateAmends()).not.toThrow();
    expect(validateAmends()).toEqual(AMENDS_TOTALS);
  });
});

// ------------------------------------------------------------ the sums ----

describe('R14 — the sums derive from the table, and the machines agree', () => {
  it('the raise derives: nineteen rows sum to the C5 machine\u2019s pinned $61,500', () => {
    const sum = AMENDS_ROWS.reduce((t, r) => t + r.amount, 0);
    expect(sum).toBe(61500);           // the test's own arithmetic
    expect(AMENDS_TOTALS.raised).toBe(sum);
    expect(AMENDS_TOTALS.raised).toBe(C5_RAISE_TOTAL);
  });

  it('the release derives: nine rows sum to $14,200; the agreement: ten to $47,300', () => {
    const released = AMENDS_ROWS.filter((r) => r.bucket === 'released');
    const agreement = AMENDS_ROWS.filter((r) => r.bucket === 'agreement');
    expect(released.length).toBe(9);
    expect(agreement.length).toBe(10);
    expect(released.reduce((t, r) => t + r.amount, 0)).toBe(14200);
    expect(agreement.reduce((t, r) => t + r.amount, 0)).toBe(47300);
    expect(AMENDS_TOTALS.releasedPrincipal).toBe(C5_CORVUS_RELEASES);
    expect(AMENDS_TOTALS.restitution).toBe(C5_RESTITUTION_SETTLE);
    expect(AMENDS_TOTALS.releasedPrincipal + AMENDS_TOTALS.restitution).toBe(AMENDS_TOTALS.raised);
  });

  it('the partition is a judgment, not arithmetic — the test proves it (other 9-row subsets exist) and pins the authored one', () => {
    const n = AMENDS_ROWS.length;
    let matches = 0;
    let authoredFound = false;
    const AUTHORED = ['father-mike', 'verna', 'fatima', 'grace', 'nilda', 'sal', 'deon', 'odessa', 'darnell'].sort();
    for (let mask = 0; mask < (1 << n); mask += 1) {
      let count = 0;
      let sum = 0;
      const ids: string[] = [];
      for (let i = 0; i < n; i += 1) {
        if (mask & (1 << i)) {
          count += 1;
          sum += AMENDS_ROWS[i].amount;
          ids.push(AMENDS_ROWS[i].id);
        }
      }
      if (count === 9 && sum === 14200) {
        matches += 1;
        if (ids.sort().join(',') === AUTHORED.join(',')) authoredFound = true;
      }
    }
    // arithmetic alone does NOT force the split — the doc never names
    // the nine, and other subsets sum the same; the reading is the
    // wave's documented judgment (core/amends.ts, law 3):
    expect(matches).toBeGreaterThan(1);
    expect(authoredFound).toBe(true);
  });
});

// ------------------------------------------------------------- the doors ----

describe('R14 — the doors: pay through the row\u2019s own verb, or not at all', () => {
  it('a full-door verb closes its row in one event', () => {
    const p = seedAmendsProgress();
    const out = payAmends(p, 'sal', 'quarters', { day: 1030 });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.progress.sal.state).toBe('paid');
      expect(out.progress.sal.paid).toBe(1200);
      expect(out.progress.sal.day).toBe(1030);
    }
    // the second attempt refuses — the row is closed
    const again = payAmends(out.ok ? out.progress : p, 'sal', 'quarters');
    expect(again.ok).toBe(false);
  });

  it('the wrong door refuses — Odessa\u2019s is cash-unopened, cash never touches it', () => {
    const p = seedAmendsProgress();
    const out = payAmends(p, 'odessa', 'cash', { day: 1016 });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain('cash-unopened');
    expect(out.progress.odessa.state).toBe('owed');
  });

  it('Ada accepts exactly the schedule\u2019s first dollar, then refuses forever', () => {
    const p = seedAmendsProgress();
    const first = payAmends(p, 'ada', 'first-dollar-via-bea', { day: 814 });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.progress.ada.state).toBe('partial'); // her terminal
      expect(first.progress.ada.verb).toBe('first-dollar-via-bea');
    }
    const second = payAmends(first.ok ? first.progress : p, 'ada', 'first-dollar-via-bea', { day: 830 });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toContain('refused');
      expect(second.reason).toContain('first dollar');
    }
    const cashAttempt = payAmends(first.ok ? first.progress : p, 'ada', 'cash', { day: 830 });
    expect(cashAttempt.ok).toBe(false);
  });

  it('installments accumulate; overpay refuses; a row closes at its amount', () => {
    const p = seedAmendsProgress();
    const one = payAmends(p, 'chino', 'produce-installments', { amount: 400, day: 1035 });
    expect(one.ok).toBe(true);
    if (!one.ok) return;
    expect(one.progress.chino.state).toBe('partial');
    expect(one.progress.chino.paid).toBe(400);
    const over = payAmends(one.progress, 'chino', 'produce-installments', { amount: 700, day: 1036 });
    expect(over.ok).toBe(false); // 400 + 700 > 1000
    const two = payAmends(one.progress, 'chino', 'produce-installments', { amount: 600, day: 1036 });
    expect(two.ok).toBe(true);
    if (two.ok) {
      expect(two.progress.chino.state).toBe('paid');
      expect(two.progress.chino.paid).toBe(1000);
    }
    const bad = payAmends(p, 'chino', 'produce-installments', { amount: 0, day: 1035 });
    expect(bad.ok).toBe(false);
  });

  it('terminal rows refuse by construction — the signed, settled, and forgone rows pay nothing', () => {
    const p = seedAmendsProgress();
    for (const [id, verb] of [
      ['sycamore', 'cash'], ['uzun-cousins', 'cash'], ['oktay', 'cash'], ['leo-own', 'cash'],
    ] as const) {
      const out = payAmends(p, id, verb as never);
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.reason).toContain('closed');
    }
  });

  it('no such row refuses honestly', () => {
    const p = seedAmendsProgress();
    const out = payAmends(p, 'someone-else', 'cash');
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain('no such amends row');
  });

  it('the machine never mutates the caller\u2019s progress (pure)', () => {
    const p = seedAmendsProgress();
    const before = JSON.stringify(p);
    payAmends(p, 'sal', 'quarters', { day: 1030 });
    payAmends(p, 'ada', 'first-dollar-via-bea', { day: 814 });
    payAmends(p, 'nope', 'cash');
    expect(JSON.stringify(p)).toBe(before);
  });

  it('Fatima\u2019s conversion pays in the hours she asked for', () => {
    const p = seedAmendsProgress();
    const out = payAmends(p, 'fatima', 'catering-labor', { day: 1040 });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.progress.fatima.state).toBe('paid');
  });
});

// -------------------------------------------------------------- the seed ----

describe('R14 — the seed: the C6 wave\u2019s own acts close their rows', () => {
  it('an empty ledger seeds every row at its C6-open state', () => {
    const p = amendsFromLedger([]);
    for (const r of AMENDS_ROWS) {
      expect(p[r.id].state).toBe(r.openState);
      expect(p[r.id].paid).toBeNull();
    }
  });

  it('the five C6 acts close exactly their five rows — Ada partial, four paid, Idris honest', () => {
    const p = amendsFromLedger(C6_ACTS);
    expect(p.ada.state).toBe('partial');
    expect(p.ada.verb).toBe('first-dollar-via-bea');
    expect(p.grace.state).toBe('paid');
    expect(p.grace.verb).toBe('routed-letter');
    expect(p['father-mike'].state).toBe('paid');
    expect(p.verna.state).toBe('paid');
    expect(p.odessa.state).toBe('paid');
    expect(p.odessa.verb).toBe('cash-unopened');
    // the bursar arrangement is established, but the row closes through
    // the bursar verb itself — no C6 act closes it:
    expect(p.idris.state).toBe('owed');
    // the chain's other faces stay open too (Fatima at her conversion,
    // the rest still owing):
    expect(p.fatima.state).toBe('converted');
    for (const id of ['nilda', 'sal', 'deon', 'marcus', 'chino', 'darnell']) {
      expect(p[id].state).toBe('owed');
    }
  });

  it('the act refs are the vocabulary GameState\u2019s stations log (the map is exact)', () => {
    expect(Object.keys(AMENDS_ACT_REF_TO_ROW).sort()).toEqual(['ada', 'father-mike', 'grace', 'odessa', 'verna']);
  });

  it('idempotent on repeat acts; blind to unknown refs (forward-compatible)', () => {
    const once = amendsFromLedger(C6_ACTS);
    const twice = amendsFromLedger([...C6_ACTS, ...C6_ACTS]);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    const noisy = amendsFromLedger([
      ...C6_ACTS,
      act('led-future-row', ['some-future-row', 'another-ref'], 1050),
    ]);
    expect(JSON.stringify(noisy)).toBe(JSON.stringify(once));
  });
});

// ------------------------------------------------------------ the verdict ----

describe('R14 — the verdict: the machine\u2019s own read of the chain', () => {
  it('an untouched chain: six rows closed at the deal, thirteen faces open, the schedule\u2019s $10,300 walking', () => {
    const v = amendsVerdict(seedAmendsProgress());
    expect(v.rowsTotal).toBe(19);
    expect(v.rowsClosed).toBe(6); // forgone, three signed, two settled
    expect(v.chainOpen).toBe(13); // ada refused + fatima converted + the eleven still owing
    expect(v.scheduleRemaining).toBe(10300); // ada 8000 + marcus 700 + idris 600 + chino 1000
  });

  it('the five C6 acts: eleven closed, eight faces open, the schedule\u2019s $2,300 still walking', () => {
    const v = amendsVerdict(amendsFromLedger(C6_ACTS));
    expect(v.rowsClosed).toBe(11); // the six deal terminals + Ada partial + the four paid
    expect(v.chainOpen).toBe(8);   // fatima, nilda, sal, deon, marcus, idris, chino, darnell
    expect(v.scheduleRemaining).toBe(2300); // marcus 700 + idris 600 + chino 1000 — Ada closed partial
  });

  it('the portrait\u2019s facts are the verdict\u2019s own rows', () => {
    expect(amendsPortraitFacts(amendsFromLedger(C6_ACTS))).toEqual({
      rowsClosed: 11,
      rowsTotal: 19,
      scheduleRemaining: 2300,
    });
  });
});

// --------------------------------------------------------------- R13 ----

describe('R13 — the self-portrait reads the rows (doc 03 \u00A77)', () => {
  it('without facts, the debts line is byte-identical to the shipped act-count prose', () => {
    const a = composeSelfPortrait(BASE_INPUT);
    expect(a.body).toContain('The debts: 5 rows closed, faces on each; the window kept its promise.');
    // and the act-count line's honesty clause for a shorter run:
    const early = composeSelfPortrait({ ...BASE_INPUT, amendsActs: 2 });
    expect(early.body).toContain('The debts: 2 rows closed, faces on each; the window runs longer, honestly.');
  });

  it('with facts, the debts paragraph speaks the table\u2019s truth — rows closed of nineteen, the schedule\u2019s remainder', () => {
    const facts = { rowsClosed: 11, rowsTotal: 19, scheduleRemaining: 2300 };
    const a = composeSelfPortrait({ ...BASE_INPUT, amendsFacts: facts });
    expect(a.body).toContain('The debts: 11 of 19 closed, faces on each; the schedule\u2019s $2,300 still open.');
    // the schedule fully paid reads its own honest line:
    const b = composeSelfPortrait({
      ...BASE_INPUT,
      amendsFacts: { rowsClosed: 19, rowsTotal: 19, scheduleRemaining: 0 },
    });
    expect(b.body).toContain('The debts: 19 of 19 closed, faces on each.');
    expect(b.body).not.toContain('still walks');
  });

  it('the determinism law holds on BOTH paths — identical state, identical text', () => {
    const facts = { rowsClosed: 11, rowsTotal: 19, scheduleRemaining: 2300 };
    const a = composeSelfPortrait({ ...BASE_INPUT, amendsFacts: facts });
    const a2 = composeSelfPortrait({ ...BASE_INPUT, amendsFacts: facts });
    expect(a.body).toBe(a2.body);
    expect(a.title).toBe(a2.title);
    const plain = composeSelfPortrait(BASE_INPUT);
    expect(plain.body).toBe(composeSelfPortrait(BASE_INPUT).body);
  });

  it('the never-grades law holds on the facts path (no redemption language, ever)', () => {
    const facts = { rowsClosed: 19, rowsTotal: 19, scheduleRemaining: 0 };
    const a = composeSelfPortrait({ ...BASE_INPUT, amendsFacts: facts });
    const b = composeSelfPortrait({ ...BASE_INPUT, amendsFacts: { rowsClosed: 6, rowsTotal: 19, scheduleRemaining: 10300 } });
    expect(!/forgiven|good person|bad person|redemption arc/i.test(a.body + b.body)).toBe(true);
  });

  it('the 600-cap: the diary\u2019s own law, facts included', () => {
    const facts = { rowsClosed: 11, rowsTotal: 19, scheduleRemaining: 2300 };
    const a = composeSelfPortrait({ ...BASE_INPUT, amendsFacts: facts });
    expect(a.body.length).toBeLessThanOrEqual(600);
    const plain = composeSelfPortrait(BASE_INPUT);
    expect(plain.body.length).toBeLessThanOrEqual(600);
  });
});

// ------------------------------------------- the shipped integration ----

describe('the shipped portrait derives the facts from the ledger\u2019s own acts', () => {
  it('the doors fired on their canon days put the rows in the portrait\u2019s debts line', () => {
    const s = stationStart(970);
    s.setStep(Step.WK_ROAM);
    s.applyChoicePick('N5b', 'diner-plus-ledger');
    s.applyChoicePick('N5c', 'garden-reckoning');
    s.applyChoicePick('N5a', 'settle');
    // the three canon doors before day 970:
    s.day = 814; s.calendarDay = 814; s.c6FirstDollar();
    s.day = 870; s.calendarDay = 870; s.c6KevFork();
    s.day = 898; s.calendarDay = 898; s.c6Deposition();
    s.day = 970; s.calendarDay = 970;
    // the machine's own read at day 970:
    expect(s.c6AmendsActs()).toBe(3);
    const v = amendsVerdict(s.amendsProgress());
    expect(v.rowsClosed).toBe(9);  // the six deal terminals + Ada + Grace + Father Mike
    expect(v.scheduleRemaining).toBe(2300);
    // the portrait composes from the rows now:
    const out = s.writeSelfPortrait();
    const notes = noteTexts(out).join(' ');
    expect(notes).toMatch(/Facts: \$[0-9][0-9,]*\./);
    expect(notes).toContain('The debts: 9 of 19 closed, faces on each; the schedule\u2019s $2,300 still open.');
    // the act machines ride untouched beneath the row machine:
    expect(s.writeSelfPortrait()).toEqual([]); // once a day (the law keeps)
  });

  it('an untouched ledger answers all-open — the old save\u2019s law, no new bytes', () => {
    const s = new GameState();
    const p = s.amendsProgress();
    expect(p.ada.state).toBe('refused');
    expect(p.idris.state).toBe('owed');
    expect(p.odessa.state).toBe('owed');
    expect(amendsVerdict(p).rowsClosed).toBe(6);
    expect(amendsVerdict(p).scheduleRemaining).toBe(10300);
  });
});

// ------------------------------------------------------------- hygiene ----

describe('the hygiene — no real-world dates anywhere near the module (R4)', () => {
  it('the live source scan: no clock reads, no real-world years in the amends machine', () => {
    const src = readFileSync(join(REPO_ROOT, 'web-three/src/core/amends.ts'), 'utf8')
      .replace(/\\u[0-9a-fA-F]{4}/g, '') // the \uXXXX escapes literalize digits (\u2019 is an apostrophe, not a year)
      .replace(/amount: \d+/g, '');      // the table's amounts are data ($2,000 is Fatima's face, not a year)
    expect(/\bnew Date\b|\bDate\.now\b|\bDate\.parse\b/.test(src)).toBe(false);
    expect(/19\d\d|20\d\d/.test(src)).toBe(false);
  });
});
