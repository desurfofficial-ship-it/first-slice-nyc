/**
 * The money→ledger bridge — Workstream D (WP-4; world-contract/12 §4,
 * world-contract/05 §2's sanctioned dual view).
 *
 * What it does: every shipped money movement — GameState's honest-math
 * `earn`/`spend`, untouched, still behind their confirm-gates — becomes a
 * Transaction on the world's ledger. The game's existing math is now
 * traceable, not replaced: the bridge observes the ACTUAL delta (post-clamp,
 * post-replay) and records it. The sanctioned mirror holds:
 * `world.player.moneyCents` follows the story's head after every movement,
 * and `auditWorld` fails the world if it ever disagrees with
 * `ledger.balance('acct:player')`.
 *
 * What it does NOT do:
 *   - It does not move money and does not own story math (wc-05 §2's
 *     one-way bridge: story beats write world facts, never the reverse).
 *   - It invents nothing: categories come from the shipped-moments table
 *     below — wc-12 §4's worked examples are rows in it, and every
 *     category is from the contract's closed sets. Amounts come from the
 *     story. An unmapped movement routes via `acct:world` with a loud
 *     reason (`external_transfer` / `external_loss`) — honest, auditable,
 *     impossible to mistake for a designed category.
 *   - It has no clock of its own and reads nothing wall-clock: ticks,
 *     days and steps arrive from the host (Game) at call time.
 *
 * Determinism: transaction ids derive from the in-game tick plus the
 * ledger's own contents (`txn:story_<tick>_<n>`) — stable across
 * save/load, unique forever, no random, no Date.now. Two runs from the
 * same inputs produce byte-identical ledgers (tested).
 *
 * Zero-discipline: money moves on EVENTS (purchases, wages, story beats) —
 * never per-tick; the id scan is over a ledger that holds dozens of rows,
 * not thousands. No caches, nothing to invalidate.
 */

import {
  EconomyLedger, dollars,
  LEDGER_ACCOUNT_PLAYER, LEDGER_ACCOUNT_WORLD,
  type FlowKind, type Transaction,
} from './economy';
import type { BusinessState } from './entities';

/**
 * GameState.Step values the shipped money beats run under. Kept HERE as
 * plain numbers (the sim layer does not import the narrative layer);
 * tests/sim-money-bridge.test.ts pins every one against core/GameState's
 * enum — the mapping cannot rot silently.
 */
export const STEP_RUSH = 3;         // Day 1, the five rush cups at Rosa's counter
export const STEP_D2_IDRIS = 11;    // Idris's usual (with or without the awning)
export const STEP_D2_DELIVER = 13;  // the kid's exact change
export const STEP_D2_LUNCH = 14;    // the lunch crowd (and the awning purchase)
export const STEP_D3_RUSH = 18;     // Day 3 counter orders
export const STEP_D3_STOOL = 20;    // the stool (Day 3)
export const STEP_D4_STRANGER = 25; // Rosa's rule — the terminal beat
export const STEP_D4_RUSH = 26;     // Day 4 counter orders
export const STEP_D4_PERMIT = 29;   // the vending-permit filing (Day 4)

/** Where an observed movement goes in the ledger. */
export interface Movement {
  kind: FlowKind;
  /** A FaucetKind/SinkKind name from wc-12 §3's closed sets. */
  category: string;
  /** The other side of a transfer (a `biz:*` account). Null → `acct:world`
   *  (faucet source / sink destination). */
  counterparty: string | null;
  /** The human audit line the probe prints. */
  reason: string;
}

export interface MovementContext {
  /** The interaction id Game was dispatching ('cart', 'permit', 'mango'…),
   *  or null for chained story beats without one. */
  intent: string | null;
  step: number;
  day: number;
}

/**
 * The shipped-moments table (wc-12 §4: "each Effect('money') becomes a
 * post() with these categories"). Every row cites the shipped beat it
 * records. Incoming story money resolves by step (the story's own
 * sequencing); outgoing roam purchases resolve by interaction intent.
 * Defaults are loud, honest catch-alls — never silent guesses.
 */
export function resolveMovement(sign: 'in' | 'out', cents: number, ctx: MovementContext): Movement {
  if (sign === 'in') {
    switch (ctx.step) {
      case STEP_RUSH:
        // The customer at Rosa's counter is not a simulated account —
        // the five enters the economy from outside (wc-12 §3's faucet
        // definition). Rosa's deli is not debited: Leo worked the counter.
        return {
          kind: 'faucet', category: 'business_revenue', counterparty: null,
          reason: `counter shift — the rush cup, ${dollars(cents)} from the counter's side of the day`,
        };
      case STEP_D2_IDRIS:
        return {
          kind: 'faucet', category: 'business_revenue', counterparty: null,
          reason: `Idris's usual — cart revenue, ${dollars(cents)} (a dollar extra under the cup when the awning is up)`,
        };
      case STEP_D2_DELIVER:
        return {
          kind: 'faucet', category: 'business_revenue', counterparty: null,
          reason: `the kid's exact change — cart revenue, ${dollars(cents)}`,
        };
      case STEP_D2_LUNCH:
        return {
          kind: 'faucet', category: 'business_revenue', counterparty: null,
          reason: `the lunch crowd — cart revenue, ${dollars(cents)}`,
        };
      case STEP_D3_RUSH:
      case STEP_D4_RUSH:
        return {
          kind: 'faucet', category: 'business_revenue', counterparty: null,
          reason: `counter orders — cart revenue, ${dollars(cents)}`,
        };
      case STEP_D4_STRANGER:
        return {
          kind: 'faucet', category: 'reward', counterparty: null,
          reason: `Rosa's rule — on the house for HER is not free, ${dollars(cents)}`,
        };
      default:
        return {
          kind: 'faucet', category: 'external_transfer', counterparty: null,
          reason: `unattributed gain of ${dollars(cents)} (intent "${ctx.intent ?? 'none'}", step ${ctx.step}) — needs a shipped category`,
        };
    }
  }

  const intent = ctx.intent ?? '';
  switch (intent) {
    case 'mango':
    case 'coffee':
    case 'bread':
      // A customer's purchase is a transfer player→business (wc-12 §3),
      // tagged with what the sale was.
      return {
        kind: 'transfer', category: 'business_revenue', counterparty: 'biz:rosas_deli',
        reason: `the bodega shelf — ${intent}, ${dollars(cents)} to Rosa's register`,
      };
    case 'pizza':
      return {
        kind: 'transfer', category: 'business_revenue', counterparty: 'biz:corner_slice',
        reason: `a slice at Corner Slice, ${dollars(cents)}`,
      };
    case 'barber':
      return {
        kind: 'transfer', category: 'business_revenue', counterparty: 'biz:fade_king',
        reason: `a trim at the Fade King, ${dollars(cents)}`,
      };
    case 'washer_free':
    case 'dryer':
      // Sunrise Laundry has no sim account yet — an outside service.
      return {
        kind: 'sink', category: 'service', counterparty: null,
        reason: `Sunrise Laundry — ${intent === 'dryer' ? 'the dryer' : 'a load'}, ${dollars(cents)}`,
      };
    case 'hotdog':
      return {
        kind: 'sink', category: 'food', counterparty: null,
        reason: `a hot dog from the grill cart, ${dollars(cents)}`,
      };
    case 'diner_coffee':
      return {
        kind: 'sink', category: 'food', counterparty: null,
        reason: `coffee at the Alder Heights diner, ${dollars(cents)}`,
      };
    case 'busker_coin':
      return {
        kind: 'sink', category: 'service', counterparty: null,
        reason: `a dollar in the busker's cup, ${dollars(cents)}`,
      };
    default:
      break;
  }
  // The confirm-gated story spends, keyed by their shipped amounts.
  if (cents === 1500) {
    return {
      kind: 'sink', category: 'business_expense', counterparty: null,
      reason: `the awning — the cart shades the corner, ${dollars(cents)}`,
    };
  }
  if (cents === 1000 && ctx.day === 3) {
    return {
      kind: 'sink', category: 'goods', counterparty: null,
      reason: `the stool — a seat at the corner, ${dollars(cents)}`,
    };
  }
  if (cents === 1000 && ctx.day === 4) {
    return {
      kind: 'sink', category: 'service', counterparty: null,
      reason: `the vending-permit filing, ${dollars(cents)}`,
    };
  }
  return {
    kind: 'sink', category: 'external_loss', counterparty: null,
    reason: `unmapped spend of ${dollars(cents)} (intent "${intent || 'none'}", day ${ctx.day}) — needs a shipped category`,
  };
}

/** The world sections the bridge mirrors into (wc-05 §2's ownership rows:
 *  `player` — "story effects → posted transactions"; `businesses` — the
 *  declared mirror for accounts the ledger transfers touch). */
export interface MoneyBridgeHost {
  player: { moneyCents: number };
  businesses: BusinessState[];
}

/**
 * The bridge itself. One instance per boot (Game owns it); its methods
 * are event-driven — never called per-frame.
 */
export class MoneyBridge {
  /** The interaction id Game is currently applying, or null. Set/cleared
   *  around the dispatch site — the trace's intent column. */
  intent: string | null = null;

  constructor(
    private readonly ledger: EconomyLedger,
    private readonly host: MoneyBridgeHost,
    private readonly now: () => { tick: number; day: number; step: number },
  ) {}

  /** The sanctioned mirror follows the story's head (dollars → cents;
   *  story money is whole dollars, so this is exact). */
  syncMirror(storyCents: number): void {
    this.host.player.moneyCents = storyCents;
  }

  /**
   * Record one actual movement. `beforeCents`/`afterCents` are the story's
   * money head (×100) around the wrapped earn/spend. A zero delta (replay
   * day, no-op) syncs the mirror and posts nothing; a clamped spend posts
   * what actually left — the ledger records reality, not intent.
   */
  observe(beforeCents: number, afterCents: number): Transaction | null {
    this.syncMirror(afterCents);
    const delta = afterCents - beforeCents;
    if (delta === 0) return null;
    const sign = delta > 0 ? 'in' : 'out';
    const cents = Math.abs(delta);
    const { tick, day, step } = this.now();
    const move = resolveMovement(sign, cents, { intent: this.intent, step, day });
    const txn = this.ledger.post({
      id: this.nextId(tick),
      tick, day,
      kind: move.kind,
      category: move.category,
      from: sign === 'in' ? (move.counterparty ?? LEDGER_ACCOUNT_WORLD) : LEDGER_ACCOUNT_PLAYER,
      to: sign === 'in' ? LEDGER_ACCOUNT_PLAYER : (move.counterparty ?? LEDGER_ACCOUNT_WORLD),
      amountCents: cents,
      reason: move.reason,
      refs: ['acct:player'],
    });
    if (txn && move.counterparty) {
      // The declared business mirror: BusinessState.balanceCents follows
      // the ledger for accounts a transfer touched (wc-12 §1).
      const biz = this.host.businesses.find((b) => b.id === move.counterparty);
      if (biz) biz.balanceCents += txn.to === move.counterparty ? cents : -cents;
    }
    return txn;
  }

  /**
   * Boot reconciliation. The story save owns the player's money (the
   * number the player feels); the world save's ledger may lag it when the
   * world write failed (storage full) while the story write succeeded.
   * The correction is itself a transaction — every dollar, including a
   * repair, stays traceable, and the audit law holds from genesis. No
   * drift → no post, no noise.
   */
  reconcile(storyCents: number): Transaction | null {
    this.syncMirror(storyCents);
    const ledgerCents = this.ledger.balance(LEDGER_ACCOUNT_PLAYER);
    const delta = storyCents - ledgerCents;
    if (delta === 0) return null;
    const { tick, day } = this.now();
    return this.ledger.post({
      id: this.nextId(tick),
      tick, day,
      kind: delta > 0 ? 'faucet' : 'sink',
      category: delta > 0 ? 'external_transfer' : 'external_loss',
      from: delta > 0 ? LEDGER_ACCOUNT_WORLD : LEDGER_ACCOUNT_PLAYER,
      to: delta > 0 ? LEDGER_ACCOUNT_PLAYER : LEDGER_ACCOUNT_WORLD,
      amountCents: Math.abs(delta),
      reason: `save reconciliation — story save ${dollars(storyCents)} vs world snapshot ${dollars(ledgerCents)}`,
      refs: ['acct:player'],
    });
  }

  /** Deterministic, collision-free forever: the in-game tick plus how many
   *  bridge transactions it already carries at that tick (a restored
   *  ledger's rows are in `all()`, so ids never repeat across a save). */
  private nextId(tick: number): string {
    const prefix = `txn:story_${tick}_`;
    let n = 0;
    for (const t of this.ledger.all()) {
      if (t.id.startsWith(prefix)) n += 1;
    }
    return `${prefix}${n}`;
  }
}
