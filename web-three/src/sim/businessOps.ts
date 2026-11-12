/**
 * sim/businessOps — the living-neighborhood machines (wc-17 Phase 4, the
 * machine tranche; register v1.58.0): businesses OPERATE. Three honest
 * pieces, all PURE:
 *
 *   1. TRANSITIONS — the open/closed crossings of the authored hours.
 *      The open state itself is `entities.businessIsOpen` (the narrative
 *      guardrail law, already live); this module derives the crossings
 *      between two consecutive clock samples so the brain can observe a
 *      business actually opening and closing.
 *
 *   2. THE P&L — derived from the ledger's evidence ONLY (wc-12 §3's
 *      law: "prices beyond shipped evidence, wages, rent cycles … no
 *      gameplay loops exist to calibrate them" — directive rule 17).
 *      The report reads what the ledger RECORDED, never invents a cent:
 *      revenue is money the ledger saw arrive at the business's account,
 *      costs are money the ledger saw it pay. An untraded day reports
 *      zeros — a quiet day is data too, not a gap to fill.
 *
 *   3. THE MONTH ROLL — "the block remembers across in-game months"
 *      (wc-17 Phase 4): one derived summary per story-month, built by
 *      the same evidence law, for the world runtime to journal at the
 *      calendar crossing. The ledger is the truth; the roll is a view.
 */

import { businessIsOpen, type BusinessState, type WeekdayName } from './entities';
import type { EconomyLedger, Transaction } from './economy';

// ------------------------------------------------------- the transitions ----

export type BusinessTransitionKind = 'opened' | 'closed';

export interface BusinessTransition {
  bizId: string;
  kind: BusinessTransitionKind;
  minuteOfDay: number;
}

/** The open/closed crossings between two consecutive clock samples
 *  (the brain's per-minute tick; the samples may straddle midnight —
 *  the weekday is sampled with the minute, per the clock's own law).
 *  Pure; returns [] when the state did not change. */
export function businessTransitionsBetween(
  biz: BusinessState,
  prevMinute: number,
  prevWeekday: WeekdayName,
  minuteOfDay: number,
  weekday: WeekdayName,
): BusinessTransition[] {
  const before = businessIsOpen(biz, prevMinute, prevWeekday);
  const after = businessIsOpen(biz, minuteOfDay, weekday);
  if (before === after) return [];
  return [{
    bizId: biz.id,
    kind: after ? 'opened' : 'closed',
    minuteOfDay,
  }];
}

/** The transitions of every business across one clock step (the brain's
 *  per-tick view; order follows the businesses array — deterministic). */
export function businessTransitionsForTick(
  bizs: readonly BusinessState[],
  prevMinute: number,
  prevWeekday: WeekdayName,
  minuteOfDay: number,
  weekday: WeekdayName,
): BusinessTransition[] {
  const out: BusinessTransition[] = [];
  for (const b of bizs) {
    out.push(...businessTransitionsBetween(b, prevMinute, prevWeekday, minuteOfDay, weekday));
  }
  return out;
}

// ------------------------------------------------------------- the P&L ------

/** The evidence cap: a report cites at most this many ledger rows (the
 *  first by sequence — the ledger's own order); the SUMS always cover
 *  every row. The citation is the audit trail, not the arithmetic. */
export const PNL_EVIDENCE_CAP = 12;

export interface BusinessDayReport {
  bizId: string;
  day: number;
  /** Money the ledger saw ARRIVE at the business (transfers in). */
  revenueCents: number;
  /** External money the ledger saw the business receive (faucets into
   *  the account — funding, not sales; wc-12 §3's distinction). */
  fundingCents: number;
  /** Money the ledger saw the business PAY (transfers out). */
  costCents: number;
  /** Money the ledger saw leave the business to the world (sinks). */
  drawsCents: number;
  netCents: number;
  salesCount: number;
  costCount: number;
  /** Cited rows (txn ids, ledger order, ≤ PNL_EVIDENCE_CAP). */
  evidence: string[];
}

const ZERO_REPORT = (bizId: string, day: number): BusinessDayReport => ({
  bizId, day,
  revenueCents: 0, fundingCents: 0, costCents: 0, drawsCents: 0,
  netCents: 0, salesCount: 0, costCount: 0, evidence: [],
});

/** The day's P&L for one business, from the ledger's evidence only.
 *  Pure: the ledger is never touched. `day` matches the ledger's own
 *  denormalized day column (1-based in-game days). */
export function businessDayReport(
  ledger: Pick<EconomyLedger, 'all'>,
  bizId: string,
  day: number,
): BusinessDayReport {
  const report = ZERO_REPORT(bizId, day);
  for (const t of ledger.all()) {
    if (t.day !== day) continue;
    if (t.to === bizId) {
      if (t.kind === 'transfer') {
        report.revenueCents += t.amountCents;
        report.salesCount += 1;
        cite(report, t);
      } else if (t.kind === 'faucet') {
        report.fundingCents += t.amountCents;
        cite(report, t);
      }
    } else if (t.from === bizId) {
      if (t.kind === 'transfer') {
        report.costCents += t.amountCents;
        report.costCount += 1;
        cite(report, t);
      } else if (t.kind === 'sink') {
        report.drawsCents += t.amountCents;
        cite(report, t);
      }
    }
  }
  report.netCents = report.revenueCents + report.fundingCents
    - report.costCents - report.drawsCents;
  return report;
}

function cite(report: BusinessDayReport, t: Transaction): void {
  if (report.evidence.length < PNL_EVIDENCE_CAP) report.evidence.push(t.id);
}

/** The span P&L (the month view): the same evidence law over an
 *  inclusive day range. Pure. */
export function businessMonthReport(
  ledger: Pick<EconomyLedger, 'all'>,
  bizId: string,
  fromDay: number,
  toDay: number,
): BusinessDayReport {
  const report = ZERO_REPORT(bizId, fromDay);
  for (let day = fromDay; day <= toDay; day++) {
    const d = businessDayReport(ledger, bizId, day);
    report.revenueCents += d.revenueCents;
    report.fundingCents += d.fundingCents;
    report.costCents += d.costCents;
    report.drawsCents += d.drawsCents;
    report.salesCount += d.salesCount;
    report.costCount += d.costCount;
  }
  report.day = toDay;
  report.netCents = report.revenueCents + report.fundingCents
    - report.costCents - report.drawsCents;
  return report;
}

// --------------------------------------------------------- the month roll ---

/** Dollars, the ledger's own way (sim/economy's formatter, re-declared
 *  here to keep this module import-light for the pure tests). */
function dollars(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const a = Math.abs(cents);
  return `${sign}$${Math.floor(a / 100)}.${String(a % 100).padStart(2, '0')}`;
}

export const MONTH_ROLL_KIND = 'month_rolled';

/** The month-crossing record's detail, derived from the ledger's
 *  evidence only (the block remembers what HAPPENED, honestly): one
 *  line per operating business with ledger activity in the month, and
 *  the quiet months named quietly. The runtime journals this at the
 *  story-month crossing — one record, not a report dump. */
export function monthRollDetail(
  ledger: Pick<EconomyLedger, 'all'>,
  bizs: readonly (Pick<BusinessState, 'id' | 'name'>)[],
  fromDay: number,
  toDay: number,
  monthLabel: string,
): string {
  const lines: string[] = [`${monthLabel} closes`];
  for (const b of bizs) {
    const r = businessMonthReport(ledger, b.id, fromDay, toDay);
    if (r.salesCount > 0) {
      lines.push(`${b.name}: ${dollars(r.revenueCents)} across ${r.salesCount} sale${r.salesCount === 1 ? '' : 's'}`);
    } else if (r.revenueCents === 0 && r.costCents === 0 && r.fundingCents === 0 && r.drawsCents === 0) {
      lines.push(`${b.name}: a quiet month, nothing on the ledger`);
    }
  }
  return lines.join(' — ');
}
