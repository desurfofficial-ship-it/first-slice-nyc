/**
 * The living-neighborhood machines (wc-17 Phase 4, the machine tranche —
 * register v1.58.0): businesses operate, relationships drift with events,
 * the block remembers across months. The acceptance laws, pinned:
 *
 *   1. THE WORLD OPENS WITH ITS BUSINESSES — fresh boot and restored
 *      saves alike carry the reference manifest's hours (a save that
 *      predates the wave heals forward; one that carries businesses is
 *      byte-identical).
 *   2. THE TRANSITIONS ARE THE HOURS' OWN CROSSINGS — the brain observes
 *      opened/closed exactly at the authored minutes, the open state is
 *      still `businessIsOpen` (one law, no double truth), and midnight
 *      crosses without a phantom.
 *   3. THE P&L IS LEDGER EVIDENCE ONLY (wc-12's directive rule 17) — a
 *      report never invents a cent; an untraded day reports zeros; the
 *      sums equal the ledger's own rows touching the account; the
 *      ledger is untouched (the report is a view).
 *   4. THE DRIFT IS B-3'S DOCUMENTED SHAPE — the player's edges follow
 *      the majors' moods in small bounded steps; a greeting holds the
 *      line; trust is story-earned (untouched); the tick is pure,
 *      idempotent per day, never rewinds; events are decile-crossing
 *      moments, not per-day spam.
 *   5. THE BLOCK REMEMBERS — the month roll derives from ledger
 *      evidence; the drifted state and the cursor survive the save
 *      round-trip (v1-safe: the environment section, no schema change).
 */
import { describe, it, expect } from 'vitest';
import { bootWorldBrain } from '../src/sim/runtime';
import type { BusinessTransition } from '../src/sim/businessOps';
import { createWorldState, snapshotWorld, parseWorldSave } from '../src/sim/state';
import { REFERENCE_BUSINESSES, PLAYER_NPC_ID } from '../src/sim/reference';
import { makeRelationship } from '../src/sim/entities';
import { EconomyLedger } from '../src/sim/economy';
import {
  businessDayReport, businessMonthReport, businessTransitionsBetween,
  monthRollDetail, MONTH_ROLL_KIND,
} from '../src/sim/businessOps';
import { tickDrift, DRIFT_CURSOR_KEY, DRIFT_PLAYER_ID } from '../src/sim/drift';

const BOOT_OPTS = {
  raw: null,
  resolve: (id: string) =>
    (id.startsWith('loc:') ? { placeId: 'KTS-02', x: 0, z: 0, onMap: true, label: 'the test room' } : null),
  placeExists: () => true,
} as const;

describe('living neighborhood — the world opens with its businesses', () => {
  it('a fresh boot carries the reference businesses (the manifest hours)', () => {
    const { brain } = bootWorldBrain(BOOT_OPTS);
    expect(brain.world.businesses.length).toBe(REFERENCE_BUSINESSES.length);
    for (let i = 0; i < REFERENCE_BUSINESSES.length; i++) {
      const b = brain.world.businesses[i];
      const ref = REFERENCE_BUSINESSES[i];
      expect(b.id).toBe(ref.id);
      expect(b.opensAtMin).toBe(ref.opensAtMin);
      expect(b.closesAtMin).toBe(ref.closesAtMin);
      expect(b.days).toEqual(ref.days);
      expect(b.premisesBuildingId).toBe(ref.premisesBuildingId);
    }
  });

  it('a save predating the wave heals forward; a save with businesses is untouched', () => {
    // heal: a document whose businesses array is empty (the pre-wave
    // shape) boots with the seeded hours
    const { brain } = bootWorldBrain(BOOT_OPTS);
    const doc = JSON.parse(JSON.stringify(snapshotWorld(brain.world)));
    doc.businesses = [];
    const healed = bootWorldBrain({ ...BOOT_OPTS, raw: JSON.stringify(doc) });
    expect(healed.brain.world.businesses.length).toBe(REFERENCE_BUSINESSES.length);
    expect(healed.brain.world.businesses[0].opensAtMin).toBe(360);
    // untouched: a save that already carries businesses keeps its own
    const { brain: b2 } = bootWorldBrain(BOOT_OPTS);
    b2.world.businesses[0].opensAtMin = 1;
    const doc2 = JSON.parse(JSON.stringify(snapshotWorld(b2.world)));
    const again = bootWorldBrain({ ...BOOT_OPTS, raw: JSON.stringify(doc2) });
    expect(again.brain.world.businesses[0].opensAtMin).toBe(1);
  });
});

describe('living neighborhood — the businesses operate (the transitions)', () => {
  it('the brain observes the opening and the closing at the authored minutes', () => {
    const { brain } = bootWorldBrain({ ...BOOT_OPTS, startMinute: 5 * 60 });
    // 05:00 → 06:00: Rosa's deli opens (the only 06:00 opener; Tuesday)
    const toSix = brain.advanceMinutes(60);
    const opened = toSix.filter((e) => e.kind === 'business');
    expect(opened.length).toBe(1);
    if (opened[0].kind !== 'business') return;
    expect(opened[0].transitions).toEqual([
      { bizId: 'biz:rosas_deli', kind: 'opened', minuteOfDay: 360 },
    ]);
    // the open state itself is still the one law (no double truth)
    const rosa = brain.world.businesses.find((b) => b.id === 'biz:rosas_deli')!;
    expect(rosa.opensAtMin).toBe(360);
    // 06:00 → 22:00: the day's other openers fire too (Fade King 09:00,
    // Corner Slice 11:00 — Tuesday), and Rosa's close crossing fires
    // exactly once, at 22:00
    const toClose = brain.advanceMinutes(16 * 60);
    const closeEvents = toClose.filter((e): e is { kind: 'business'; transitions: readonly BusinessTransition[] } =>
      e.kind === 'business' && e.transitions.some((t) => t.bizId === 'biz:rosas_deli' && t.kind === 'closed'));
    expect(closeEvents.length).toBe(1);
    expect(closeEvents[0].transitions).toEqual([
      { bizId: 'biz:rosas_deli', kind: 'closed', minuteOfDay: 1320 },
    ]);
  });

  it('midnight crosses without a phantom (the wrap is honest)', () => {
    // the pure derivation: a same-day business (06:00–22:00) sees no
    // crossing at the wrap — closed on both sides of midnight
    const t = businessTransitionsBetween(REFERENCE_BUSINESSES[0], 1439, 'Mon', 0, 'Tue');
    expect(t).toEqual([]);
    // the brain agrees: from 23:00 through midnight to 05:00 (before the
    // 06:00 opener), no business event fires at all
    const { brain } = bootWorldBrain({ ...BOOT_OPTS, startMinute: 23 * 60 });
    const events = brain.advanceMinutes(6 * 60); // 23:00 → 05:00 next day
    expect(events.filter((e) => e.kind === 'business').length).toBe(0);
  });

  it('a dark day has no transitions (the authored days are the law)', () => {
    // Fade King is dark on Mondays — day 7 is the first Monday
    const { brain } = bootWorldBrain({ ...BOOT_OPTS, startDay: 7, startMinute: 8 * 60 });
    const events = brain.advanceMinutes(60); // 08:00 → 09:00 on a Monday
    const biz = events.filter((e) => e.kind === 'business');
    // Rosa's opened at 06:00 (already open), Corner Slice opens at 11:00,
    // Fade King stays dark: nothing crosses in this window
    expect(biz.length).toBe(0);
  });
});

describe('living neighborhood — the P&L is ledger evidence only', () => {
  it('a report reads what the ledger recorded, never invents a cent', () => {
    const w = createWorldState();
    const ledger = w.ledger; // acct:player opened at 8700 by the world
    // Day 2: a customer's cup at Rosa's counter (the wc-12 §4 specimen:
    // a $5 transfer player → the deli's register)
    const t1 = ledger.post({
      id: 'txn:ln_test_cup', tick: 1440 + 480, day: 2, kind: 'transfer',
      category: 'business_revenue', from: 'acct:player', to: 'biz:rosas_deli',
      amountCents: 500, reason: 'the test cup — a regular coffee',
    });
    expect(t1).not.toBeNull();
    // Day 3: an unrelated row (the deli pays nothing; another account)
    ledger.post({
      id: 'txn:ln_test_other', tick: 2880 + 600, day: 3, kind: 'transfer',
      category: 'goods', from: 'acct:player', to: 'biz:corner_slice',
      amountCents: 250, reason: 'a slice elsewhere',
    });
    const r2 = businessDayReport(ledger, 'biz:rosas_deli', 2);
    expect(r2.revenueCents).toBe(500);
    expect(r2.salesCount).toBe(1);
    expect(r2.costCents).toBe(0);
    expect(r2.netCents).toBe(500);
    expect(r2.evidence).toEqual(['txn:ln_test_cup']);
    // day 2 for ANOTHER business: zeros — a quiet day is data, not a gap
    const slice2 = businessDayReport(ledger, 'biz:corner_slice', 2);
    expect(slice2.revenueCents).toBe(0);
    expect(slice2.salesCount).toBe(0);
    expect(slice2.evidence).toEqual([]);
    // the month view sums the span, still evidence-only
    const month = businessMonthReport(ledger, 'biz:rosas_deli', 1, 3);
    expect(month.revenueCents).toBe(500);
    expect(month.salesCount).toBe(1);
    // THE NO-INVENTION LAW: the report totals equal the ledger's own
    // rows touching the account, to the cent
    let sumIn = 0, sumOut = 0;
    for (const t of ledger.all()) {
      if (t.to === 'biz:rosas_deli') sumIn += t.amountCents;
      if (t.from === 'biz:rosas_deli') sumOut += t.amountCents;
    }
    expect(month.revenueCents).toBe(sumIn);
    expect(month.costCents).toBe(sumOut);
    // the ledger is untouched (a view, not a writer)
    expect(ledger.balance('acct:player')).toBe(8700 - 500 - 250);
  });

  it('the month roll detail is honest on both the traded and the quiet month', () => {
    const ledger = new EconomyLedger();
    ledger.openAccount('acct:player', 8700);
    ledger.post({
      id: 'txn:ln_roll_1', tick: 100, day: 1, kind: 'transfer',
      category: 'business_revenue', from: 'acct:player', to: 'biz:rosas_deli',
      amountCents: 1200, reason: 'the counter shift',
    });
    const detail = monthRollDetail(ledger, REFERENCE_BUSINESSES, 1, 30, 'September Y1');
    expect(detail.startsWith('September Y1 closes')).toBe(true);
    expect(detail).toContain("Rosa's Deli & Grocery: $12.00 across 1 sale");
    expect(detail).toContain('Corner Slice Pizza: a quiet month, nothing on the ledger');
    // the record kind is the stable one the runtime journals
    expect(MONTH_ROLL_KIND).toBe('month_rolled');
  });
});

describe('living neighborhood — B-3, the drift with events', () => {
  const rel = () => makeRelationship(DRIFT_PLAYER_ID, 'npc:idris_warsame', 30, 50);
  const relLow = () => makeRelationship(DRIFT_PLAYER_ID, 'npc:idris_warsame', 8, 50);
  const ctxBase = (over: Partial<Parameters<typeof tickDrift>[1]> = {}) => ({
    environment: {} as Record<string, number | string | boolean>,
    toDay: 3,
    moodOf: (local: string) => (local === 'idris_warsame' ? ('bitter' as const) : undefined),
    greetedTickOf: () => undefined,
    ...over,
  });

  it('the player edges follow the majors moods in bounded steps; trust untouched', () => {
    const map = new Map([[rel().id, rel()]]);
    const res = tickDrift(map, ctxBase());
    const drifted = res.relationships.get(rel().id)!;
    // bitter: −2/day × 3 days, clamped bounds respected
    expect(drifted.warmth).toBe(24);
    expect(drifted.trust).toBe(50); // TRUST IS STORY-EARNED
    // the canon edge between NPCs is not ours — a non-player edge skips
    const canon = makeRelationship('npc:rosa_delgado', 'npc:idris_warsame', 42, 70);
    const map2 = new Map([[canon.id, canon]]);
    const res2 = tickDrift(map2, ctxBase());
    expect(res2.relationships.get(canon.id)!.warmth).toBe(42);
    expect(res2.events.length).toBe(0);
  });

  it('the tick is pure, idempotent, and never rewinds (the R5 law)', () => {
    const map = new Map([[rel().id, rel()]]);
    const before = map.get(rel().id)!.warmth;
    const res = tickDrift(map, ctxBase());
    // purity: the input map was never mutated
    expect(map.get(rel().id)!.warmth).toBe(before);
    // idempotence: re-running to the same day changes nothing
    const again = tickDrift(res.relationships, ctxBase({ environment: res.environment }));
    expect(again.relationships.get(rel().id)!.warmth).toBe(24);
    expect(again.events.length).toBe(0);
    // rewind: an earlier day is a no-op
    const back = tickDrift(res.relationships, ctxBase({ environment: res.environment, toDay: 2 }));
    expect(back.relationships.get(rel().id)!.warmth).toBe(24);
    expect(back.events.length).toBe(0);
  });

  it('a greeting holds the line (and never double-pays the hello)', () => {
    // day 2's hello (its tick inside day 2) → that day's delta is 0
    const greeted = (local: string) =>
      local === 'idris_warsame' ? (2 - 1) * 1440 + 600 : undefined;
    const res = tickDrift(new Map([[rel().id, rel()]]), ctxBase({ greetedTickOf: greeted }));
    // day 1: −2, day 2: held (0), day 3: −2 → 30 − 4
    expect(res.relationships.get(rel().id)!.warmth).toBe(26);
  });

  it('events are decile-crossing moments, not per-day spam', () => {
    const res = tickDrift(new Map([[rel().id, rel()]]), ctxBase());
    // 30 → 24: only the 30→28 crossing leaves the floor-3 band
    expect(res.events.length).toBe(1);
    expect(res.events[0].before).toBe(30);
    expect(res.events[0].after).toBe(28);
    expect(res.events[0].detail).toContain('bitter');
    // the steady stretch warms, and the event is the band crossing
    const up = tickDrift(new Map([[relLow().id, relLow()]]), ctxBase({
      moodOf: () => ('steady' as const), toDay: 3,
    }));
    // warmth 8 → 11: the 9→10 step leaves the floor-0 band — one moment
    expect(up.relationships.get(relLow().id)!.warmth).toBe(11);
    expect(up.events.length).toBe(1);
    expect(up.events[0].before).toBe(9);
    expect(up.events[0].after).toBe(10);
  });

  it('the cursor rides the environment section and survives the save round-trip', () => {
    // a REAL booted world (the save validator enforces referential
    // integrity: the edge's endpoints must exist in the manifest)
    const { brain } = bootWorldBrain(BOOT_OPTS);
    const w = brain.world;
    const res = tickDrift(w.relationships, {
      environment: w.environment, toDay: 3,
      moodOf: () => ('strained' as const), greetedTickOf: () => undefined,
    });
    w.relationships = res.relationships;
    w.environment = res.environment;
    expect(w.environment[DRIFT_CURSOR_KEY]).toBe(3);
    // the v1-safe round trip: snapshot → parse → the drifted warmth and
    // the cursor both survive (no schema change — the environment
    // section already validated the keys)
    const doc = JSON.parse(JSON.stringify(snapshotWorld(w)));
    const parsed = parseWorldSave(JSON.stringify(doc));
    expect(parsed.source).toBe('restored');
    expect(parsed.world.environment[DRIFT_CURSOR_KEY]).toBe(3);
    const edge = [...parsed.world.relationships.values()]
      .find((r) => r.a === DRIFT_PLAYER_ID || r.b === DRIFT_PLAYER_ID);
    expect(edge?.warmth).toBe(27); // 30 − 1/day × 3 strained days
  });

  it('the drift pole is the manifest player (the single-source pin)', () => {
    expect(DRIFT_PLAYER_ID).toBe(PLAYER_NPC_ID);
  });
});
