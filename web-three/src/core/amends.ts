/**
 * core/amends.ts — narrative/14 R14, the amends economy (Phase 7 stage 9).
 *
 * Doc 09 §4's table AS DATA: nineteen rows, each a face — "a long quest
 * chain with a face on every line". The machine carries the table, the
 * per-row payment verbs, the row states, and the sums the prose quotes —
 * DERIVED from the rows, never hard-coded (the register's own law:
 * "restitution total derived from the table — $61,500/$47,300 pinned by
 * test").
 *
 * The law, pinned by tests/r13-r14-stage9.test.ts:
 *   1. **The table is doc 09 §4's own rows, verbatim.** Nineteen rows,
 *      the investors' names and the state column's own words carried as
 *      data; the note field quotes the doc, the cite names the table.
 *   2. **The sums derive.** Σ(amounts) = $61,500 (the raise, nineteen
 *      investors); the Corvus-released rows' Σ = $14,200; the agreement
 *      rows' Σ = $47,300 (the restitution doc 06 §C5 event 6 and doc 09
 *      §4 quote). The C5 pack's pinned constants and this table AGREE —
 *      two machines, one arithmetic, proved by test.
 *   3. **The release partition is a staging judgment the sums pin.** The
 *      prose's numbers never name the nine, and arithmetic alone does
 *      not force the split (thirty-nine 9-row subsets of the nineteen
 *      sum to $14,200); the authored reading is the one that keeps every
 *      named-arc door — boiler-watch, booth, routed-letter, quarters,
 *      bursar, produce, scorekeeping — INSIDE the chain instead of
 *      erased by a release (a legal release never cancelled the moral
 *      debt; that is the game's own thesis, Ada's note is a moral
 *      instruction). The sums, not the taste, are what the test pins.
 *   4. **A legal release never cancelled the moral debt.** The chain
 *      straddles both buckets by design: Father Mike's boiler-watch is
 *      penance, Odessa's envelope is the schedule's last — the amends
 *      economy is the quest chain (all nineteen), the restitution
 *      schedule is the agreement's legal principal (the ten).
 *   5. **Pay through the row's own door, or not at all.** Each payable
 *      row prices its canon verb(s) (quarters, bursar, labor,
 *      cash-unopened — doc 14 R14's own exemplars plus the doc's other
 *      doors); paying through any other door refuses. Overpay refuses.
 *      Terminal rows refuse. Ada accepts exactly one event — the
 *      schedule's first dollar, via Bea — and then refuses (her
 *      refused-twice precedent is the row's own law).
 *   6. **Pure and deterministic.** payAmends never mutates; the same
 *      progress + the same event → the same answer; there are no dice
 *      and no real-world dates anywhere near this module (R4).
 *   7. **Derived, not persisted.** Row progress derives from the ledger's
 *      amends acts (the C6 wave's own refs) at read time — no new save
 *      bytes, the v1 law untouched; old saves answer amendsProgress()
 *      from the acts they already carry.
 *
 * Staging judgments this machine owns (documented per the §6.4 law):
 *   - The release partition (judgment 3's authored split): released =
 *     Father Mike, Verna, Fatima, Grace, Nilda, Sal, Deon, Odessa,
 *     Darnell; agreement = Leo's own stake, Ada, Sycamore, Big Mike,
 *     Fitz, the Uzun cousins, the Oktays, Marcus, Idris, Chino. The
 *     doc's states column stays verbatim in each row's note — where the
 *     column speaks the arc's disposition ("Paid; the whistle nod")
 *     rather than the C6-open state, the machine speaks the open (owed)
 *     and the note keeps the doc's words.
 *   - Ada's first dollar: the envelope's amount is the schedule's own
 *     business — the machine carries her row's STATE, not the envelope's
 *     arithmetic. Her terminal IS `partial`: the first dollar closes her
 *     row (her resolution is refusing everything after it), so the
 *     verdict counts her closed and prices the schedule's remainder by
 *     the rows still payable — the rows that stay open stay open
 *     honestly, faces, not numbers.
 *   - Idris: the bursar arrangement is established at the first dollar's
 *     morning, but his row closes through the bursar verb itself — no C6
 *     act closes it, so the open schedule keeps him.
 */

import { C5_RAISE_TOTAL, C5_CORVUS_RELEASES, C5_RESTITUTION_SETTLE } from './c5pack';

export const AMENDS_SOURCE = 'doc 09 §4 (the amends economy — "The Debts")';

/** The row states. Doc 14 R14's six (`signed`/`owed`/`partial`/`paid`/
 *  `refused`/`converted`) plus the table's own two — `forgone` (row 1,
 *  the agreement's first cost) and `settled` (the civil and Corvus
 *  settlements) — the starter schema grown the data's own vocabulary
 *  (doc 14 §2: "subject to engineering taste within the contract"). */
export type AmendsState =
  | 'forgone'
  | 'signed'
  | 'settled'
  | 'owed'
  | 'partial'
  | 'paid'
  | 'refused'
  | 'converted';

/** The per-row payment verbs — each row's canon door, from doc 09 §4's
 *  own words (doc 14 R14's four exemplars — quarters, bursar, labor,
 *  cash-unopened — plus the doc's other doors). */
export type AmendsVerb =
  | 'first-dollar-via-bea'   // Ada — the schedule's first dollar, through Bea
  | 'boiler-watch'           // Father Mike — four months + the forum apology
  | 'booth-envelope'         // Verna — the crossing-guard's booth
  | 'catering-labor'         // Fatima — converted to the hours
  | 'routed-letter'          // Grace — through Kev's reference letter, not cash
  | 'cash'                   // Nilda, Deon, Marcus
  | 'quarters'               // Sal — literally
  | 'cash-unopened'          // Miss Odessa — the winter tree lights
  | 'bursar'                 // Mr. Idris — Amina's textbooks, never through his hands
  | 'produce-installments'   // "Chino" Herrera — produce-grade installments
  | 'scorekeeping';          // Darnell — one summer of court scorekeeping

/** Which bucket the row's legal claim sits in: `released` (Corvus's
 *  settlement bought the release — nine investors, $14,200 of principal)
 *  or `agreement` (Leo's agreement covers it — the restitution's $47,300).
 *  The CHAIN is all nineteen rows regardless of bucket: a legal release
 *  never cancelled the moral debt. */
export type AmendsBucket = 'released' | 'agreement';

/** One row of doc 09 §4's table — the face, the amount, the open state,
 *  the door(s) it pays through, the bucket, the doc's own words. */
export interface AmendsRow {
  id: string;
  investor: string;
  amount: number;
  /** The row's state at C6 open (doc 09 §4's column, machine-read). */
  openState: AmendsState;
  /** The doors the row pays through — empty for rows already terminal
   *  at open (forgone, signed, settled) and for Ada after her one event. */
  verbs: readonly AmendsVerb[];
  bucket: AmendsBucket;
  /** The state at which the row is done — Ada's is `partial` (she
   *  accepts only the first dollar); everyone else's is `paid` or the
   *  open-time terminal they already carry. */
  terminal: AmendsState;
  /** Doc 09 §4's state column, verbatim. */
  note: string;
}

/** Doc 09 §4's table, all nineteen rows, in the doc's own order. The
 *  amounts and notes are the doc's own — touch neither without the doc. */
export const AMENDS_ROWS: readonly AmendsRow[] = [
  {
    id: 'leo-own', investor: 'Leo Marsh (own stake)', amount: 10000,
    openState: 'forgone', verbs: [], bucket: 'agreement', terminal: 'forgone',
    note: 'Forgone — the agreement\u2019s first cost',
  },
  {
    id: 'ada', investor: 'Ada Marsh', amount: 8000,
    openState: 'refused', verbs: ['first-dollar-via-bea'], bucket: 'agreement', terminal: 'partial',
    note: 'Refused settlement; refused payment twice; accepts only the restitution schedule\u2019s first dollar, via Bea, with a note: \u201CPay your debts in order.\u201D',
  },
  {
    id: 'sycamore', investor: 'Sycamore Studios co-op (6 artists, pooled)', amount: 9000,
    openState: 'signed', verbs: [], bucket: 'agreement', terminal: 'signed',
    note: 'Signed release (they needed it; nobody\u2019s art got funded by pride)',
  },
  {
    id: 'big-mike', investor: 'Big Mike', amount: 5000,
    openState: 'signed', verbs: [], bucket: 'agreement', terminal: 'signed',
    note: 'Signed release; hires him anyway in C6; the cookbook chapter',
  },
  {
    id: 'fitz', investor: 'Fitz', amount: 4000,
    openState: 'signed', verbs: [], bucket: 'agreement', terminal: 'signed',
    note: 'Signed; the money was never the conversation',
  },
  {
    id: 'uzun-cousins', investor: 'The Uzun cousins', amount: 6000,
    openState: 'settled', verbs: [], bucket: 'agreement', terminal: 'settled',
    note: 'Pressed civil — businesspeople; settled; the coldest room in the arc',
  },
  {
    id: 'oktay', investor: 'Mehmet & Ay\u015Fe Oktay', amount: 3000,
    openState: 'settled', verbs: [], bucket: 'agreement', terminal: 'settled',
    note: 'In the Corvus settlement; the deposition remains owed (doc 08 \u00A77)',
  },
  {
    id: 'father-mike', investor: 'Father Mike', amount: 2500,
    openState: 'owed', verbs: ['boiler-watch'], bucket: 'released', terminal: 'paid',
    note: 'The hardest restitution: repaid via four months of volunteer boiler-watch and a public apology read at the Ascension\u2019s forum — his penance design',
  },
  {
    id: 'verna', investor: 'Verna Carter', amount: 2300,
    openState: 'owed', verbs: ['booth-envelope'], bucket: 'released', terminal: 'paid',
    note: 'Never once makes him feel it (which is worse); paid mid-arc, in the crossing-guard\u2019s booth',
  },
  {
    id: 'fatima', investor: 'Fatima Rahal', amount: 2000,
    openState: 'converted', verbs: ['catering-labor'], bucket: 'released', terminal: 'paid',
    note: 'Converted to catering labor — she\u2019d rather have the hours',
  },
  {
    id: 'grace', investor: 'Grace Okafor', amount: 1500,
    openState: 'owed', verbs: ['routed-letter'], bucket: 'released', terminal: 'paid',
    note: 'Payment routed through Kev\u2019s reference-letter amends, not cash',
  },
  {
    id: 'nilda', investor: 'Nilda Col\u00F3n', amount: 1500,
    openState: 'owed', verbs: ['cash'], bucket: 'released', terminal: 'paid',
    note: 'Paid; her day-care kids learn a man can come back',
  },
  {
    id: 'sal', investor: 'Sal (Sunrise Laundry)', amount: 1200,
    openState: 'owed', verbs: ['quarters'], bucket: 'released', terminal: 'paid',
    note: 'Paid in quarters, literally; the aprons joke returned kindly',
  },
  {
    id: 'deon', investor: 'Deon King', amount: 1200,
    openState: 'owed', verbs: ['cash'], bucket: 'released', terminal: 'paid',
    note: 'Paid; the haircut after is the arc\u2019s best cut',
  },
  {
    id: 'odessa', investor: 'Miss Odessa Wynn', amount: 800,
    openState: 'owed', verbs: ['cash-unopened'], bucket: 'released', terminal: 'paid',
    note: 'Repaid last, in cash, unopened — she uses it for the block\u2019s winter tree lights; the city\u2019s diary notes the lights, not the debt',
  },
  {
    id: 'marcus', investor: 'Marcus Bell', amount: 700,
    openState: 'owed', verbs: ['cash'], bucket: 'agreement', terminal: 'paid',
    note: 'Paid; the whistle nod',
  },
  {
    id: 'idris', investor: 'Mr. Idris', amount: 600,
    openState: 'owed', verbs: ['bursar'], bucket: 'agreement', terminal: 'paid',
    note: 'The bursar route only (Amina\u2019s textbooks, never through his hands)',
  },
  {
    id: 'chino', investor: '\u201CChino\u201D Herrera', amount: 1000,
    openState: 'owed', verbs: ['produce-installments'], bucket: 'agreement', terminal: 'paid',
    note: 'Paid in produce-grade installments; the block\u2019s smallest smile',
  },
  {
    id: 'darnell', investor: 'Darnell', amount: 1200,
    openState: 'owed', verbs: ['scorekeeping'], bucket: 'released', terminal: 'paid',
    note: 'Worked off in one summer of court scorekeeping; the easiest and the most fun',
  },
];

/** The row ids, for O(1) membership and the tests' order pin. */
export const AMENDS_IDS: readonly string[] = AMENDS_ROWS.map((r) => r.id);

/** The verbs that price INSTALLMENTS (partial payments accumulate); every
 *  other verb is one full event that closes its row. */
export const AMENDS_INSTALLMENT_VERBS: readonly AmendsVerb[] = ['produce-installments'];

/** The derived sums — computed from the rows at module load (the law:
 *  derived from the table, not hard-coded). */
export interface AmendsTotals {
  raised: number;            // Σ(all nineteen) — the raise
  releasedPrincipal: number; // Σ(released rows) — Corvus's buyout
  restitution: number;       // Σ(agreement rows) — the restitution schedule
  releasedCount: number;
  agreementCount: number;
}

function deriveTotals(): AmendsTotals {
  let raised = 0;
  let releasedPrincipal = 0;
  let restitution = 0;
  let releasedCount = 0;
  let agreementCount = 0;
  for (const r of AMENDS_ROWS) {
    raised += r.amount;
    if (r.bucket === 'released') {
      releasedPrincipal += r.amount;
      releasedCount += 1;
    } else {
      restitution += r.amount;
      agreementCount += 1;
    }
  }
  return { raised, releasedPrincipal, restitution, releasedCount, agreementCount };
}

export const AMENDS_TOTALS: AmendsTotals = deriveTotals();

/** One row's live progress. `paid` carries the accumulated installment
 *  total for installment rows; `null` where the canon doesn't price the
 *  envelope's arithmetic (Ada's first dollar). `day` is the in-game day
 *  the row's latest event landed (R4 — never a real-world date). */
export interface AmendsRowProgress {
  state: AmendsState;
  paid: number | null;
  verb: AmendsVerb | null;
  day: number | null;
}

export type AmendsProgress = Record<string, AmendsRowProgress>;

/** The seed: every row at its C6-open state (doc 09 §4's column). */
export function seedAmendsProgress(): AmendsProgress {
  const p: AmendsProgress = {};
  for (const r of AMENDS_ROWS) {
    p[r.id] = { state: r.openState, paid: null, verb: null, day: null };
  }
  return p;
}

/** The act-ref vocabulary the C6 wave's amends acts already carry
 *  (GameState's c6Amend refs). A ref naming a row closes that row
 *  through its canon door: Ada's act is the first dollar (partial,
 *  terminal); every other act pays its row in full. Unknown refs are
 *  ignored — forward-compatible for the content waves' own doors. */
export const AMENDS_ACT_REF_TO_ROW: Readonly<Record<string, AmendsVerb>> = {
  'ada': 'first-dollar-via-bea',
  'grace': 'routed-letter',
  'father-mike': 'boiler-watch',
  'verna': 'booth-envelope',
  'odessa': 'cash-unopened',
};

/** Derive the rows' progress from the ledger's amends acts (pure — the
 *  same acts → the same progress; no new save bytes, the v1 law keeps). */
export function amendsFromLedger(acts: ReadonlyArray<{ refs: readonly string[] }>): AmendsProgress {
  const p = seedAmendsProgress();
  for (const act of acts) {
    for (const ref of act.refs) {
      const verb = AMENDS_ACT_REF_TO_ROW[ref];
      if (!verb) continue;
      const row = AMENDS_ROWS.find((r) => r.id === ref);
      if (!row) continue;
      const cur = p[row.id];
      if (cur.state === row.terminal) continue; // idempotent — the act already counted
      p[row.id] = {
        state: row.terminal,
        paid: row.terminal === 'paid' ? row.amount : null,
        verb,
        day: null, // the act's date is the ledger's own; the row keeps the verb
      };
    }
  }
  return p;
}

/** One payment attempt through one row's door — PURE (returns a new
 *  progress, never mutates; the refusal carries the reason). The laws:
 *  the row must exist; the row must be payable (its state still short of
 *  terminal); the verb must be one the row prices; the amount must not
 *  overpay; installment verbs may pay partial, every other verb is one
 *  full event; Ada accepts exactly one event and then refuses forever. */
export type AmendsPayResult =
  | { ok: true; progress: AmendsProgress }
  | { ok: false; reason: string; progress: AmendsProgress };

export function payAmends(
  progress: AmendsProgress,
  rowId: string,
  verb: AmendsVerb,
  opts?: { amount?: number; day?: number },
): AmendsPayResult {
  const row = AMENDS_ROWS.find((r) => r.id === rowId);
  if (!row) return { ok: false, reason: `no such amends row: ${rowId}`, progress };
  const cur = progress[rowId];
  if (!cur) return { ok: false, reason: `no progress seeded for ${rowId}`, progress };
  // Ada's law speaks first: after the first dollar her row is closed,
  // and the refusal carries her own words, not a generic terminal line.
  if (row.id === 'ada' && cur.verb === 'first-dollar-via-bea') {
    return {
      ok: false,
      reason: 'Ada accepts only the schedule\u2019s first dollar — she refused the rest twice, and the row\u2019s law keeps',
      progress,
    };
  }
  if (cur.state === row.terminal) {
    return { ok: false, reason: `${rowId} is already ${row.terminal} — the row is closed`, progress };
  }
  if (!row.verbs.includes(verb)) {
    return {
      ok: false,
      reason: `${rowId} pays through ${row.verbs.join(' / ') || 'no door'} — not through ${verb}`,
      progress,
    };
  }
  const installment = AMENDS_INSTALLMENT_VERBS.includes(verb);
  const paid = cur.paid ?? 0;
  const remaining = row.amount - paid;
  if (!installment) {
    if (opts?.amount !== undefined && opts.amount !== remaining) {
      return {
        ok: false,
        reason: `${rowId}'s door pays ${remaining} in one event — not ${opts.amount}`,
        progress,
      };
    }
    return {
      ok: true,
      progress: {
        ...progress,
        [rowId]: { state: row.terminal, paid: row.terminal === 'paid' ? row.amount : paid, verb, day: opts?.day ?? null },
      },
    };
  }
  const amount = opts?.amount;
  if (amount === undefined || !Number.isInteger(amount) || amount <= 0 || amount > remaining) {
    return {
      ok: false,
      reason: `${rowId} pays in installments — an amount between 1 and ${remaining}`,
      progress,
    };
  }
  const newPaid = paid + amount;
  const done = newPaid >= row.amount;
  return {
    ok: true,
    progress: {
      ...progress,
      [rowId]: { state: done ? row.terminal : 'partial', paid: newPaid, verb, day: opts?.day ?? null },
    },
  };
}

/** The machine's own verdict on the chain — the portrait's and the open
 *  endgame's honest read. `rowsClosed` counts rows AT their terminal
 *  state (the deal's signed/settled rows close with the deal; Ada's
 *  closes partial — her terminal); `scheduleRemaining` is the agreement
 *  rows' unpaid legal principal (Ada counts in full while partial — the
 *  envelope's arithmetic is her business); `chainOpen` is the rows still
 *  owing something. */
export interface AmendsVerdict {
  rowsClosed: number;
  rowsTotal: number;
  scheduleRemaining: number;
  chainOpen: number;
}

export function amendsVerdict(progress: AmendsProgress): AmendsVerdict {
  let rowsClosed = 0;
  let scheduleRemaining = 0;
  let chainOpen = 0;
  for (const r of AMENDS_ROWS) {
    const cur = progress[r.id];
    if (!cur) continue;
    if (cur.state === r.terminal) {
      rowsClosed += 1;
      continue;
    }
    chainOpen += 1;
    // The schedule's remaining legal principal: every open agreement row
    // counts (Ada counts in full while she still refuses — her
    // resolution, the first dollar, is what CLOSES her row).
    if (r.bucket === 'agreement') {
      scheduleRemaining += r.amount - (cur.paid ?? 0);
    }
  }
  return { rowsClosed, rowsTotal: AMENDS_ROWS.length, scheduleRemaining, chainOpen };
}

/** The self-portrait's row-level facts (R13's additive input — doc 03 §7
 *  reads the amends LEDGER; the rows are the ledger's own faces). */
export type AmendsPortraitFacts = Pick<AmendsVerdict, 'rowsClosed' | 'rowsTotal' | 'scheduleRemaining'>;

export function amendsPortraitFacts(progress: AmendsProgress): AmendsPortraitFacts {
  const v = amendsVerdict(progress);
  return { rowsClosed: v.rowsClosed, rowsTotal: v.rowsTotal, scheduleRemaining: v.scheduleRemaining };
}

/** The machine checks itself — the no-dead-content law, the table's own
 *  edition. Throws on the first violation; returns the totals it proved. */
export function validateAmends(): AmendsTotals {
  const ids = new Set<string>();
  for (const r of AMENDS_ROWS) {
    if (ids.has(r.id)) throw new Error(`duplicate amends row id: ${r.id}`);
    ids.add(r.id);
    if (!Number.isInteger(r.amount) || r.amount <= 0) {
      throw new Error(`amends row ${r.id}: amount must be a positive integer`);
    }
    if (!r.note || r.note.length < 8) throw new Error(`amends row ${r.id}: the doc's own words must ride the row`);
    const payable = r.terminal === 'paid' || r.terminal === 'partial';
    if (payable && r.verbs.length === 0) throw new Error(`amends row ${r.id}: a payable row prices a door`);
    if (!payable && r.verbs.length > 0) throw new Error(`amends row ${r.id}: a terminal row prices no door`);
    if (payable && r.openState === r.terminal) {
      throw new Error(`amends row ${r.id}: born terminal but priced a door`);
    }
  }
  if (AMENDS_ROWS.length !== 19) throw new Error(`the table carries nineteen rows — got ${AMENDS_ROWS.length}`);
  const t = AMENDS_TOTALS;
  if (t.raised !== C5_RAISE_TOTAL) {
    throw new Error(`the table's raise (\u0024${t.raised}) must equal the C5 machine's pinned $61,500`);
  }
  if (t.releasedCount !== 9) throw new Error(`Corvus's settlement released nine investors — got ${t.releasedCount}`);
  if (t.releasedPrincipal !== C5_CORVUS_RELEASES) {
    throw new Error(`the released rows' principal (\u0024${t.releasedPrincipal}) must equal the C5 machine's pinned $14,200`);
  }
  if (t.agreementCount !== 10) throw new Error(`Leo's agreement covers ten rows — got ${t.agreementCount}`);
  if (t.restitution !== C5_RESTITUTION_SETTLE) {
    throw new Error(`the agreement rows' principal (\u0024${t.restitution}) must equal the C5 machine's pinned $47,300`);
  }
  if (t.releasedPrincipal + t.restitution !== t.raised) {
    throw new Error('the two buckets must sum to the raise');
  }
  // The partition itself is the wave's documented judgment (law 3) —
  // arithmetic alone does not force it; the sums above are what the
  // machine pins, and the test proves the judgment is a judgment.
  return t;
}
