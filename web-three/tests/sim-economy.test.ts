/**
 * sim/economy — the money contract: integer cents, append-only ledger,
 * explicit faucets & sinks (world-contract/12).
 */
import { describe, it, expect } from 'vitest';
import {
  EconomyLedger, dollars, centsOf, isAccount,
  LEDGER_ACCOUNT_PLAYER, LEDGER_ACCOUNT_WORLD,
} from '../src/sim/economy';
import { REFERENCE_LEDGER_SCRIPT } from '../src/sim/reference';

function ledger(): EconomyLedger {
  const l = new EconomyLedger();
  l.openAccount(LEDGER_ACCOUNT_PLAYER, 8700);           // $87.00, the shipped start
  l.openAccount(LEDGER_ACCOUNT_WORLD, 0, { overdraftAllowed: true });
  return l;
}

describe('sim/economy — the ledger laws', () => {
  it('money is integer cents; floats never touch a balance', () => {
    const l = ledger();
    expect(() => l.openAccount('npc:x', 100.5)).toThrow();
    expect(l.post({
      id: 'txn:x', tick: 0, day: 1, kind: 'transfer', category: 'test',
      from: LEDGER_ACCOUNT_PLAYER, to: 'npc:x', amountCents: 12.5, reason: '',
    })).toBeNull();
    expect(l.issues.at(-1)?.code).toBe('BAD_AMOUNT');
  });

  it('transfers move money without growing the economy; both sides equal', () => {
    const l = ledger();
    const t = l.post({
      id: 'txn:cup', tick: 500, day: 1, kind: 'transfer', category: 'business_revenue',
      from: LEDGER_ACCOUNT_PLAYER, to: 'biz:rosas_deli', amountCents: 500,
      reason: 'the usual',
    });
    expect(t).not.toBeNull();
    expect(l.balance(LEDGER_ACCOUNT_PLAYER)).toBe(8200);
    expect(l.balance('biz:rosas_deli')).toBe(500);
    expect(l.totalInCirculation()).toBe(8700); // moved, not created
  });

  it('faucets must draw from the world; sinks must pay into it (flow classes are honest)', () => {
    const l = ledger();
    expect(l.post({
      id: 'txn:f1', tick: 0, day: 1, kind: 'faucet', category: 'reward',
      from: 'npc:rosa_delgado', to: LEDGER_ACCOUNT_PLAYER, amountCents: 200, reason: '',
    })).toBeNull();
    expect(l.post({
      id: 'txn:f2', tick: 0, day: 1, kind: 'sink', category: 'rent',
      from: LEDGER_ACCOUNT_PLAYER, to: 'npc:rosa_delgado', amountCents: 200, reason: '',
    })).toBeNull();
    expect(l.issues.every((i) => i.code === 'BAD_FLOW')).toBe(true);
  });

  it('overdraft is refused by default and allowed only where the policy says so', () => {
    const l = ledger();
    expect(l.post({
      id: 'txn:too_much', tick: 0, day: 1, kind: 'sink', category: 'rent',
      from: LEDGER_ACCOUNT_PLAYER, to: LEDGER_ACCOUNT_WORLD, amountCents: 8701, reason: '',
    })).toBeNull();
    expect(l.balance(LEDGER_ACCOUNT_PLAYER)).toBe(8700); // untouched
    expect(l.issues.at(-1)?.code).toBe('OVERDRAFT');
  });

  it('duplicate transaction ids are refused (idempotent money)', () => {
    const l = ledger();
    const args = {
      id: 'txn:dup', tick: 0, day: 1, kind: 'transfer', category: 'c',
      from: LEDGER_ACCOUNT_PLAYER, to: 'biz:rosas_deli', amountCents: 100, reason: '',
    } as const;
    expect(l.post(args)).not.toBeNull();
    expect(l.post(args)).toBeNull();
    expect(l.issues.at(-1)?.code).toBe('DUPLICATE_ID');
  });

  it('the audit law: balance === genesis + Σ transactions, always', () => {
    const l = ledger();
    for (const s of REFERENCE_LEDGER_SCRIPT) {
      expect(l.post({ ...s, tick: 500, day: 1 })).not.toBeNull();
    }
    expect(l.audit()).toEqual([]);
    // $87.00 − $5.00 − $10.00 + $2.00 = $74.00
    expect(l.balance(LEDGER_ACCOUNT_PLAYER)).toBe(7400);
    expect(dollars(l.balance(LEDGER_ACCOUNT_PLAYER))).toBe('$74');
  });

  it('the flow report separates faucets from sinks and skips transfers', () => {
    const l = ledger();
    for (const s of REFERENCE_LEDGER_SCRIPT) {
      l.post({ ...s, tick: 500, day: 1 });
    }
    const rows = l.flowReport();
    const sink = rows.find((r) => r.kind === 'sink');
    const faucet = rows.find((r) => r.kind === 'faucet');
    const transfer = rows.find((r) => r.kind === 'transfer');
    expect(sink).toMatchObject({ category: 'service', cents: -1000 });
    expect(faucet).toMatchObject({ category: 'reward', cents: 200 });
    expect(transfer).toBeUndefined(); // transfers never appear in flow
  });

  it('determinism: the same script always produces the same ledger order', () => {
    const run = () => {
      const l = ledger();
      for (const s of REFERENCE_LEDGER_SCRIPT) l.post({ ...s, tick: 500, day: 1 });
      return l.toData().txns.map((t) => `${t.seq}:${t.id}`);
    };
    expect(run()).toEqual(run());
  });

  it('account ids are constrained (no arbitrary strings in the money graph)', () => {
    expect(isAccount('npc:rosa_delgado')).toBe(true);
    expect(isAccount('biz:rosas_deli')).toBe(true);
    expect(isAccount('acct:player')).toBe(true);
    expect(isAccount('Rosa')).toBe(false);
    expect(isAccount('evt:party')).toBe(false);
  });

  it('centsOf rounds honestly', () => {
    expect(centsOf(3.5)).toBe(350);
    expect(centsOf(87)).toBe(8700);
    expect(dollars(500)).toBe('$5');
    expect(dollars(1525)).toBe('$15.25');
  });
});
