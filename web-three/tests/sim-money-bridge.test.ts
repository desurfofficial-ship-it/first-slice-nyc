/**
 * sim/moneyBridge — WP-4, the money→ledger bridge: the shipped-moments
 * table, the post paths, the sanctioned mirror, the audit failure mode,
 * save round-trips (ids never collide), boot reconciliation, and
 * byte-identical determinism.
 */
import { describe, it, expect } from 'vitest';
import { LEDGER_ACCOUNT_PLAYER, LEDGER_ACCOUNT_WORLD } from '../src/sim/economy';
import {
  MoneyBridge, resolveMovement,
  STEP_RUSH, STEP_D2_IDRIS, STEP_D2_DELIVER, STEP_D2_LUNCH,
  STEP_D3_RUSH, STEP_D3_STOOL, STEP_D4_STRANGER, STEP_D4_RUSH, STEP_D4_PERMIT,
} from '../src/sim/moneyBridge';
import { Step } from '../src/core/GameState';
import { auditWorld, createWorldState, parseWorldSave, snapshotWorld } from '../src/sim/state';
import { REFERENCE_BUSINESSES, REFERENCE_NPCS, referenceRelationships } from '../src/sim/reference';

function makeWorld() {
  const world = createWorldState();
  world.businesses = REFERENCE_BUSINESSES.map((b) => ({ ...b }));
  // the reference cast — auditWorld validates businesses against real owners
  world.npcs = REFERENCE_NPCS.map((n) => ({
    ...n, inventory: [...n.inventory], relationships: [],
    knowledge: [...n.knowledge], location: { ...n.location },
  }));
  for (const rel of referenceRelationships()) {
    world.relationships.set(rel.id, rel);
    for (const n of world.npcs) {
      if (n.id === rel.a || n.id === rel.b) n.relationships.push(rel.id);
    }
  }
  return world;
}

function makeBridge(world = makeWorld(), now = { tick: 1000, day: 1, step: STEP_RUSH }) {
  const bridge = new MoneyBridge(world.ledger, world, () => now);
  return { bridge, world, now };
}

describe('the shipped step pins — the bridge cannot drift from the story', () => {
  it('every STEP_* the bridge knows matches core/GameState’s enum', () => {
    expect(STEP_RUSH).toBe(Step.RUSH);
    expect(STEP_D2_IDRIS).toBe(Step.D2_IDRIS);
    expect(STEP_D2_DELIVER).toBe(Step.D2_DELIVER);
    expect(STEP_D2_LUNCH).toBe(Step.D2_LUNCH);
    expect(STEP_D3_RUSH).toBe(Step.D3_RUSH);
    expect(STEP_D3_STOOL).toBe(Step.D3_STOOL);
    expect(STEP_D4_STRANGER).toBe(Step.D4_STRANGER);
    expect(STEP_D4_RUSH).toBe(Step.D4_RUSH);
    expect(STEP_D4_PERMIT).toBe(Step.D4_PERMIT);
  });
});

describe('the shipped-moments table (wc-12 §4)', () => {
  it('the rush cup is a faucet: the customer is not a simulated account', () => {
    const m = resolveMovement('in', 500, { intent: 'cart', step: STEP_RUSH, day: 1 });
    expect(m.kind).toBe('faucet');
    expect(m.category).toBe('business_revenue');
    expect(m.counterparty).toBeNull(); // Rosa's deli is NOT debited — Leo worked the counter
  });

  it('cart revenue beats: Idris, the kid, the lunch crowd, the counter orders', () => {
    for (const [step, cents] of [
      [STEP_D2_IDRIS, 300], [STEP_D2_IDRIS, 200], [STEP_D2_DELIVER, 300],
      [STEP_D2_LUNCH, 300], [STEP_D3_RUSH, 800], [STEP_D4_RUSH, 400],
    ] as const) {
      const m = resolveMovement('in', cents, { intent: 'cart', step, day: 2 });
      expect(m.kind).toBe('faucet');
      expect(m.category).toBe('business_revenue');
    }
  });

  it('Rosa’s rule is a reward faucet — the terminal beat’s honest two dollars', () => {
    const m = resolveMovement('in', 200, { intent: 'terminal', step: STEP_D4_STRANGER, day: 4 });
    expect(m.kind).toBe('faucet');
    expect(m.category).toBe('reward');
  });

  it('bodega shelf purchases transfer to Rosa’s register', () => {
    for (const intent of ['mango', 'coffee', 'bread']) {
      const m = resolveMovement('out', 200, { intent, step: 15, day: 2 });
      expect(m.kind).toBe('transfer');
      expect(m.category).toBe('business_revenue');
      expect(m.counterparty).toBe('biz:rosas_deli');
    }
  });

  it('pizza and trims transfer to their businesses', () => {
    expect(resolveMovement('out', 200, { intent: 'pizza', step: 15, day: 2 }).counterparty).toBe('biz:corner_slice');
    expect(resolveMovement('out', 1200, { intent: 'barber', step: 15, day: 2 }).counterparty).toBe('biz:fade_king');
  });

  it('laundry, hot dogs, diner coffee and the busker’s cup are outside sinks', () => {
    expect(resolveMovement('out', 300, { intent: 'washer_free', step: 15, day: 2 }).category).toBe('service');
    expect(resolveMovement('out', 200, { intent: 'dryer', step: 15, day: 2 }).category).toBe('service');
    expect(resolveMovement('out', 200, { intent: 'hotdog', step: 15, day: 2 }).category).toBe('food');
    expect(resolveMovement('out', 200, { intent: 'diner_coffee', step: 15, day: 2 }).category).toBe('food');
    expect(resolveMovement('out', 100, { intent: 'busker_coin', step: 15, day: 2 }).category).toBe('service');
  });

  it('the awning, the stool and the permit file as their shipped categories', () => {
    expect(resolveMovement('out', 1500, { intent: 'cart', step: STEP_D2_LUNCH, day: 2 }).category).toBe('business_expense');
    expect(resolveMovement('out', 1000, { intent: 'cart', step: STEP_D3_STOOL, day: 3 }).category).toBe('goods');
    expect(resolveMovement('out', 1000, { intent: 'permit', step: STEP_D4_PERMIT, day: 4 }).category).toBe('service');
  });

  it('unmapped movements route via acct:world with loud, honest reasons', () => {
    const gain = resolveMovement('in', 100, { intent: null, step: 99, day: 1 });
    expect(gain.category).toBe('external_transfer');
    expect(gain.reason).toContain('needs a shipped category');
    const loss = resolveMovement('out', 100, { intent: 'mystery', step: 15, day: 1 });
    expect(loss.category).toBe('external_loss');
    expect(loss.reason).toContain('mystery');
  });
});

describe('observe — the post paths', () => {
  it('the Day-1 rush: five cups post five faucets, $87 → $112, audit clean', () => {
    const { bridge, world } = makeBridge();
    let money = 8700;
    for (let i = 0; i < 5; i++) {
      bridge.observe(money, money + 500);
      money += 500;
    }
    expect(money).toBe(11200);
    expect(world.ledger.balance(LEDGER_ACCOUNT_PLAYER)).toBe(11200);
    expect(world.player.moneyCents).toBe(11200); // the sanctioned mirror
    expect(world.ledger.all()).toHaveLength(5);
    expect(world.ledger.audit()).toHaveLength(0);
    const txns = world.ledger.all();
    expect(txns.every((t) => t.kind === 'faucet' && t.category === 'business_revenue' && t.amountCents === 500)).toBe(true);
    expect(txns.map((t) => t.id)).toEqual([
      'txn:story_1000_0', 'txn:story_1000_1', 'txn:story_1000_2', 'txn:story_1000_3', 'txn:story_1000_4',
    ]);
  });

  it('a clamped spend posts what actually left — the ledger records reality', () => {
    const { bridge, world } = makeBridge();
    bridge.observe(8700, 1000); // the story got here through recorded movement
    const txn = bridge.observe(1000, 0); // a $15 ask with $10 in the wallet: $10 left
    expect(txn).not.toBeNull();
    expect(txn!.amountCents).toBe(1000); // the actual delta, not the asked 1500
    expect(world.ledger.balance(LEDGER_ACCOUNT_PLAYER)).toBe(0);
    expect(world.player.moneyCents).toBe(0);
    expect(world.ledger.audit()).toHaveLength(0);
  });

  it('a zero delta (replay day) posts nothing but keeps the mirror true', () => {
    const { bridge, world } = makeBridge();
    expect(bridge.observe(8700, 8700)).toBeNull();
    expect(world.ledger.all()).toHaveLength(0);
    expect(world.player.moneyCents).toBe(8700);
  });

  it('a shelf buy transfers to Rosa’s register AND syncs the business mirror', () => {
    const { bridge, world } = makeBridge();
    bridge.intent = 'bread';
    const txn = bridge.observe(11200, 10900);
    expect(txn).not.toBeNull();
    expect(txn!.kind).toBe('transfer');
    expect(txn!.from).toBe(LEDGER_ACCOUNT_PLAYER);
    expect(txn!.to).toBe('biz:rosas_deli');
    expect(txn!.amountCents).toBe(300);
    const rosa = world.businesses.find((b) => b.id === 'biz:rosas_deli')!;
    expect(rosa.balanceCents).toBe(300); // the declared business mirror
    expect(world.ledger.audit()).toHaveLength(0);
  });

  it('ids stay unique across many movements at the same tick', () => {
    const { bridge, world } = makeBridge();
    bridge.intent = 'busker_coin';
    for (let i = 0; i < 4; i++) bridge.observe(8700 - i * 100, 8700 - (i + 1) * 100);
    const ids = world.ledger.all().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the sanctioned mirror and the audit law', () => {
  it('a story-shaped afternoon reconciles end to end — auditWorld passes', () => {
    const { bridge, world } = makeBridge();
    let money = 8700;
    for (let i = 0; i < 5; i++) { bridge.observe(money, money + 500); money += 500; } // the rush
    bridge.intent = 'cart';
    bridge.observe(money, money - 1500); money -= 1500; // the awning (day 2's shape)
    bridge.observe(money, money + 200); money += 200;   // Idris, no awning yet… wait — the awning is up
    bridge.intent = 'mango';
    bridge.observe(money, money - 200); money -= 200;   // a mango for the road
    expect(world.ledger.balance(LEDGER_ACCOUNT_PLAYER)).toBe(money);
    expect(world.player.moneyCents).toBe(money);
    const report = auditWorld(world, () => true);
    expect(report.ok).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it('auditWorld fails the world the moment the mirror disagrees (the failure mode)', () => {
    const { bridge, world } = makeBridge();
    bridge.observe(8700, 9200);
    expect(auditWorld(world, () => true).ok).toBe(true);
    world.player.moneyCents = 999; // a story edit that bypassed the bridge
    const report = auditWorld(world, () => true);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.includes('player money'))).toBe(true);
    bridge.syncMirror(world.ledger.balance(LEDGER_ACCOUNT_PLAYER)); // the bridge repairs it
    expect(auditWorld(world, () => true).ok).toBe(true);
  });

  it('acct:world may overdraft by policy — faucets draw from it cleanly', () => {
    const { bridge, world } = makeBridge();
    bridge.observe(8700, 11200); // one big rush day
    expect(world.ledger.balance(LEDGER_ACCOUNT_WORLD)).toBe(-2500); // the faucet's source
    expect(world.ledger.audit()).toHaveLength(0);
  });
});

describe('save round-trips — ids never collide', () => {
  it('the ledger rides the world save; the bridge continues without a DUPLICATE_ID', () => {
    const { bridge, world, now } = makeBridge();
    bridge.intent = 'mango';
    bridge.observe(8700, 8500); // $2 mango at tick 1000
    const doc = snapshotWorld(world);
    const restored = parseWorldSave(JSON.stringify(doc));
    expect(restored.source).toBe('restored');
    expect(restored.notes).toHaveLength(0);
    const w2 = restored.world;
    expect(w2.ledger.balance(LEDGER_ACCOUNT_PLAYER)).toBe(8500);
    const bridge2 = new MoneyBridge(w2.ledger, w2, () => ({ tick: now.tick, day: 1, step: STEP_RUSH }));
    bridge2.intent = 'coffee';
    const txn = bridge2.observe(8500, 8000); // another buy at the SAME tick
    expect(txn).not.toBeNull(); // a duplicate id would have been refused
    expect(txn!.id).toBe('txn:story_1000_1');
    expect(w2.ledger.all().filter((t) => t.id === 'txn:story_1000_0')).toHaveLength(1);
    expect(w2.ledger.audit()).toHaveLength(0);
    expect(auditWorld(w2, () => true).ok).toBe(true);
  });

  it('genesis re-derivation keeps every dollar countable from the restore', () => {
    const { bridge, world } = makeBridge();
    let money = 8700;
    for (let i = 0; i < 5; i++) { bridge.observe(money, money + 500); money += 500; }
    const restored = parseWorldSave(JSON.stringify(snapshotWorld(world)));
    expect(restored.world.ledger.balance(LEDGER_ACCOUNT_PLAYER)).toBe(11200);
    expect(restored.world.ledger.audit()).toHaveLength(0);
  });
});

describe('boot reconciliation', () => {
  it('a lagging world ledger catches up as a traceable transaction', () => {
    const { bridge, world } = makeBridge();
    const txn = bridge.reconcile(11200); // story save $112, world snapshot $87
    expect(txn).not.toBeNull();
    expect(txn!.kind).toBe('faucet');
    expect(txn!.category).toBe('external_transfer');
    expect(txn!.amountCents).toBe(2500);
    expect(txn!.reason).toContain('save reconciliation');
    expect(world.ledger.balance(LEDGER_ACCOUNT_PLAYER)).toBe(11200);
    expect(world.player.moneyCents).toBe(11200);
    expect(world.ledger.audit()).toHaveLength(0);
  });

  it('a world ahead of the story sinks the surplus honestly', () => {
    const { bridge, world } = makeBridge();
    bridge.observe(8700, 9200); // the ledger moves ahead
    const txn = bridge.reconcile(8700); // …but the story save (older) says $87
    expect(txn).not.toBeNull();
    expect(txn!.kind).toBe('sink');
    expect(txn!.category).toBe('external_loss');
    expect(world.ledger.balance(LEDGER_ACCOUNT_PLAYER)).toBe(8700);
    expect(world.ledger.audit()).toHaveLength(0);
  });

  it('no drift → no post, no noise', () => {
    const { bridge, world } = makeBridge();
    expect(bridge.reconcile(8700)).toBeNull();
    expect(world.ledger.all()).toHaveLength(0);
  });
});

describe('determinism', () => {
  it('two runs from the same inputs produce byte-identical ledgers', () => {
    const run = () => {
      const world = makeWorld();
      const bridge = new MoneyBridge(world.ledger, world, () => ({ tick: 1000, day: 1, step: STEP_RUSH }));
      let money = 8700;
      for (let i = 0; i < 5; i++) { bridge.observe(money, money + 500); money += 500; }
      bridge.intent = 'bread';
      bridge.observe(money, money - 300);
      bridge.intent = null;
      bridge.observe(money - 300, money - 100); // an unmapped gain, same shape every run
      return JSON.stringify({
        ledger: world.ledger.toData(),
        mirror: world.player.moneyCents,
        rosa: world.businesses.find((b) => b.id === 'biz:rosas_deli')!.balanceCents,
      });
    };
    expect(run()).toBe(run());
  });
});
