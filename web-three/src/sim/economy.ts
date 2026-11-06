/**
 * The economy & resource contract — Part 5 guardrails
 * (docs/architecture/world-contract/12).
 *
 * What exists TODAY in the shipped game: player money with honest math
 * ($87 start; the E2E pins $87 → $112 → …), confirm-gated spends, no
 * ledger. What this module adds: the CONTRACT that makes future economic
 * simulation analyzable — traceable transactions, explicit faucets and
 * sinks, solvency rules — without inventing prices or complexity the
 * gameplay loops have not earned (directive PART 5's honesty law; the
 * shipped prices cited in tests are EVIDENCE, not design).
 *
 * Laws encoded here:
 *   1. Money is INTEGER CENTS. Floats never touch a balance.
 *   2. Every balance change is a Transaction on an append-only ledger.
 *      A balance is always derivable as genesis + Σ(transactions) — the
 *      audit law. No direct balance mutation anywhere in the sim.
 *   3. Every transaction names its flow class: faucet (money enters the
 *     simulated economy), sink (money leaves it), or transfer (moves
 *     between simulated accounts — the economy neither grows nor shrinks).
 *   4. A transfer may not overdraw an account unless the account opts in
 *     (nobody but the ledger's overdraft policy bends this).
 *   5. Determinism: ledger order is total (tick, then sequence) — two runs
 *      from the same inputs read the same ledger.
 *   6. No invented prices in this module: amounts arrive from callers;
 *      the reference world's amounts are the shipped game's own.
 */

/** Where money comes from. Closed set; extension requires a test. */
export type FaucetKind =
  | 'employment_wage'      // pay for hours (NPC or player)
  | 'business_revenue'     // customers paying a business
  | 'reward'               // legitimate authored reward
  | 'external_transfer';   // family remittance, settlement, inheritance

/** Where money goes. Closed set. */
export type SinkKind =
  | 'rent' | 'food' | 'transport' | 'goods' | 'service'
  | 'business_expense' | 'investment' | 'debt_payment'
  | 'external_loss';       // money that leaves the simulated economy

/** Faucets + sinks, tagged on every transaction. */
export type FlowKind = 'faucet' | 'sink' | 'transfer';

/** Accounts are sim ids: `npc:*`, `biz:*`, or the two system accounts. */
export const LEDGER_ACCOUNT_PLAYER = 'acct:player';
export const LEDGER_ACCOUNT_WORLD = 'acct:world'; // sinks' endpoint / faucets' source

/** One immutable money movement. `amountCents` is always POSITIVE; the
 *  direction is from → to. A `transfer` names two real accounts; a
 *  `faucet` draws from `acct:world`; a `sink` pays into `acct:world`. */
export interface Transaction {
  id: string;                 // txn:<local> — unique, stable
  seq: number;                // ledger sequence (total order with tick)
  tick: number;               // in-game tick (day-1)*1440+minute
  day: number;                // denormalized for cheap reports
  kind: FlowKind;
  /** faucet/sink category (FaucetKind/SinkKind); 'none' for transfers. */
  category: string;
  from: string;
  to: string;
  amountCents: number;
  reason: string;             // human-readable audit line
  refs?: string[];            // related entity ids (evt:, obj:, …)
}

export interface AccountPolicy {
  /** May this account go negative? Default: no. */
  overdraftAllowed?: boolean;
  /** Hard floor (e.g. a business must keep operating cash). */
  floorCents?: number;
}

export interface LedgerIssue {
  code: 'OVERDRAFT' | 'BELOW_FLOOR' | 'BAD_AMOUNT' | 'BAD_FLOW' | 'BAD_ACCOUNT' | 'DUPLICATE_ID';
  detail: string;
}

const SIM_ACCOUNT_RE = /^(acct:[a-z0-9_]+|npc:[a-z0-9_]+|biz:[a-z0-9_]+)$/;

export function isAccount(id: string): boolean {
  return SIM_ACCOUNT_RE.test(id);
}

/**
 * The append-only ledger + derived balances. The ONLY way money changes
 * in the simulation. Not yet wired into the shipped GameState (whose
 * honest-math money law keeps working untouched — that is Workstream D's
 * integration job); this is the contract everything future money flows
 * through.
 */
export class EconomyLedger {
  private txns: Transaction[] = [];
  private balances = new Map<string, number>();
  private genesis = new Map<string, number>();
  private seq = 0;
  private seenIds = new Set<string>();
  private policies = new Map<string, AccountPolicy>();
  readonly issues: LedgerIssue[] = [];

  /** Register an account's opening balance + policy (genesis, not a
   *  transaction — the ledger is empty at genesis by definition). */
  openAccount(id: string, openingCents: number, policy?: AccountPolicy): void {
    if (!isAccount(id)) throw new Error(`sim/economy: bad account id "${id}"`);
    if (!Number.isSafeInteger(openingCents) || openingCents < 0) {
      throw new Error(`sim/economy: opening balance must be a non-negative integer (${id})`);
    }
    this.balances.set(id, openingCents);
    this.genesis.set(id, openingCents);
    if (policy) this.policies.set(id, policy);
  }

  balance(account: string): number {
    return this.balances.get(account) ?? 0;
  }

  /** All transactions, in total order. Callers must not mutate. */
  all(): readonly Transaction[] { return this.txns; }

  /** Attempt a transaction. Returns null when rejected (with the reason
   *  recorded in `issues`), the transaction when applied. */
  post(params: {
    id: string;
    tick: number;
    day: number;
    kind: FlowKind;
    category: string;
    from: string;
    to: string;
    amountCents: number;
    reason: string;
    refs?: string[];
  }): Transaction | null {
    const { id, tick, day, kind, category, from, to, amountCents } = params;
    const reject = (code: LedgerIssue['code'], detail: string): null => {
      this.issues.push({ code, detail });
      return null;
    };
    if (this.seenIds.has(id)) return reject('DUPLICATE_ID', id);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return reject('BAD_AMOUNT', `${id}: ${amountCents}`);
    if (!isAccount(from) || !isAccount(to)) return reject('BAD_ACCOUNT', `${id}: ${from} → ${to}`);
    if (from === to) return reject('BAD_FLOW', `${id}: self-transfer`);
    if (kind === 'faucet' && from !== LEDGER_ACCOUNT_WORLD) return reject('BAD_FLOW', `${id}: faucet must draw from ${LEDGER_ACCOUNT_WORLD}`);
    if (kind === 'sink' && to !== LEDGER_ACCOUNT_WORLD) return reject('BAD_FLOW', `${id}: sink must pay into ${LEDGER_ACCOUNT_WORLD}`);
    if (kind === 'transfer' && (from === LEDGER_ACCOUNT_WORLD || to === LEDGER_ACCOUNT_WORLD)) {
      return reject('BAD_FLOW', `${id}: transfer touches no system account`);
    }

    const fromBalance = this.balances.get(from) ?? 0;
    const policy = this.policies.get(from);
    const floor = policy?.floorCents ?? 0;
    const next = fromBalance - amountCents;
    if (next < floor && !(floor === 0 && policy?.overdraftAllowed)) {
      return reject(policy?.overdraftAllowed ? 'BELOW_FLOOR' : 'OVERDRAFT',
        `${id}: ${from} ${fromBalance} - ${amountCents} < floor ${floor}`);
    }

    const txn: Transaction = {
      id, seq: this.seq++, tick, day, kind, category, from, to,
      amountCents, reason: params.reason, refs: params.refs,
    };
    this.txns.push(txn);
    this.seenIds.add(id);
    this.balances.set(from, next);
    this.balances.set(to, (this.balances.get(to) ?? 0) + amountCents);
    return txn;
  }

  // ------------------------------------------------------------- reports ----

  /** Net flow by category over the ledger: faucets positive, sinks
   *  negative, transfers excluded (they move, they do not create). */
  flowReport(): Array<{ category: string; kind: FlowKind; cents: number; count: number }> {
    const acc = new Map<string, { category: string; kind: FlowKind; cents: number; count: number }>();
    for (const t of this.txns) {
      if (t.kind === 'transfer') continue;
      const key = `${t.kind}:${t.category}`;
      const row = acc.get(key) ?? { category: t.category, kind: t.kind, cents: 0, count: 0 };
      row.cents += t.kind === 'faucet' ? t.amountCents : -t.amountCents;
      row.count += 1;
      acc.set(key, row);
    }
    return [...acc.values()].sort((a, b) =>
      a.kind === b.kind ? b.cents - a.cents : a.kind < b.kind ? -1 : 1);
  }

  /** Total simulated money in play (all real accounts; excludes the world
   *  system account) — the inflation monitor's numerator. */
  totalInCirculation(): number {
    let sum = 0;
    for (const [id, bal] of this.balances) {
      if (id === LEDGER_ACCOUNT_WORLD) continue;
      sum += bal;
    }
    return sum;
  }

  /** The audit law, as a check: for every account,
   *  genesis + Σ(transactions touching it) === current balance, and no
   *  balance violates its policy. Cheap enough to run after any batch. */
  audit(): LedgerIssue[] {
    const issues: LedgerIssue[] = [];
    const derived = new Map<string, number>();
    for (const [id, genesis] of this.genesis) derived.set(id, genesis);
    for (const t of this.txns) {
      derived.set(t.from, (derived.get(t.from) ?? 0) - t.amountCents);
      derived.set(t.to, (derived.get(t.to) ?? 0) + t.amountCents);
    }
    for (const [id, expect] of derived) {
      const actual = this.balances.get(id) ?? 0;
      if (actual !== expect) {
        issues.push({ code: 'BAD_AMOUNT', detail: `${id} balance ${actual} ≠ genesis+Σtxn ${expect}` });
      }
      if (!Number.isSafeInteger(actual)) {
        issues.push({ code: 'BAD_AMOUNT', detail: `${id} balance ${actual}` });
      }
      const p = this.policies.get(id);
      if (p && !p.overdraftAllowed && actual < (p.floorCents ?? 0)) {
        issues.push({ code: 'BELOW_FLOOR', detail: `${id} at ${actual}` });
      }
    }
    return issues;
  }

  /** Serialize (the tail of the ledger is what a save carries). */
  toData(): { txns: Transaction[]; seq: number } {
    return { txns: this.txns, seq: this.seq };
  }
}

/** Money helpers — the only arithmetic money gets. */
export function dollars(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const s = `$${Math.floor(abs / 100)}${abs % 100 ? `.${String(abs % 100).padStart(2, '0')}` : ''}`;
  return neg ? `-${s}` : s;
}

export function centsOf(dollars: number): number {
  return Math.round(dollars * 100);
}
