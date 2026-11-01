/**
 * Day 1 + Day 2 state machine — mirrors the Godot autotest's assertions
 * (greybox-godot/scripts/main.gd `_run_autotest`) at the logic level.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { composeCaption, rosaChatLine } from '../src/core/content';

function day1ThroughRush(): GameState {
  const s = new GameState();
  s.tryRosa();               // MEET_ROSA → ENTER_BODEGA
  s.enterBodega();           // → COLLECT
  s.collect('mango');
  s.collect('coffee');
  s.collect('bread');        // → RUSH + first customer
  return s;
}

function day1Served(): GameState {
  const s = day1ThroughRush();
  for (let i = 0; i < 5; i++) s.serveCounter(); // → CROSS, $112
  return s;
}

function day1Crossed(): GameState {
  const s = day1Served();
  s.cross(true);                                  // → CLAIM_CART
  return s;
}

function day1ThroughNaming(): GameState {
  const s = day1Crossed();
  s.claimCart();                                  // → NAME_CART
  return s;
}

function day1ToClimb(): GameState {
  const s = day1ThroughNaming();
  s.confirmName("Wade's Spot");                 // → SOLO + first solo customer
  s.serveCart();                                 // 1
  s.serveCart();                                 // 2 → Idris spawns next
  s.spawnSoloCustomer();
  s.serveCart();                                 // 3 → CLIMB
  return s;
}

describe('Day 1 — the exact journey (Doc 02 / Doc 10 contract)', () => {
  it('Rosa greeting advances the flow and moves her behind the counter', () => {
    const s = new GameState();
    const effects = s.tryRosa();
    expect(s.step).toBe(Step.ENTER_BODEGA);
    expect(effects.some((e) => e.kind === 'rosa-moved-behind-counter')).toBe(true);
  });

  it('entering the bodega opens the collect step', () => {
    const s = new GameState();
    s.tryRosa();
    expect(s.enterBodega().map((e) => e.kind)).toContain('step');
    expect(s.step).toBe(Step.COLLECT);
    // entering again does nothing
    expect(s.enterBodega()).toEqual([]);
  });

  it('3 shelf items collected → rush begins with a customer', () => {
    const s = day1ThroughRush();
    expect(s.step).toBe(Step.RUSH);
    expect(s.itemsLeft.size).toBe(0);
  });

  it('collecting an item twice is refused', () => {
    const s = day1ThroughRush();
    expect(s.collect('mango')).toEqual([]);
  });

  it('5-order rush pays $87 → $112 (Doc 08), then CROSS', () => {
    const s = day1ThroughRush();
    for (let i = 0; i < 4; i++) {
      expect(s.serveCounter().length).toBeGreaterThan(0);
      expect(s.step).toBe(Step.RUSH);
    }
    s.serveCounter();
    expect(s.step).toBe(Step.CROSS);
    expect(s.money).toBe(112);
  });

  it('serving past 5 does nothing (no duplicate rewards)', () => {
    const s = day1ThroughRush();
    for (let i = 0; i < 7; i++) s.serveCounter();
    expect(s.money).toBe(112);
    expect(s.rushServed).toBe(5);
  });

  it('crossing at the stripes teaches the Shuffle; crossing anywhere counts (Seam 1)', () => {
    const a = day1Served();
    a.cross(true);
    expect(a.step).toBe(Step.CLAIM_CART);
    const b = day1Served();
    b.cross(false);
    expect(b.step).toBe(Step.CLAIM_CART);
    // double-cross is refused
    expect(b.cross(true)).toEqual([]);
  });

  it('cart claim → name box; empty name falls back to First Slice', () => {
    const s = day1Served();
    expect(s.step).toBe(Step.CROSS);
    s.cross(true);
    expect(s.claimCart().length).toBeGreaterThan(0);
    expect(s.step).toBe(Step.NAME_CART);
    s.confirmName('   ');
    expect(s.cartName).toBe('First Slice');
    expect(s.step).toBe(Step.SOLO);
  });

  it('third solo customer is Mr. Idris; three serves reach CLIMB', () => {
    const s = day1ThroughNaming();
    s.confirmName("Wade's Spot");
    expect(s.step).toBe(Step.SOLO);
    s.serveCart();
    s.serveCart();
    const spawn = s.spawnSoloCustomer();
    expect(spawn.some((e) => e.kind === 'spawn-customer' && e.who === 'idris')).toBe(true);
    s.serveCart();
    expect(s.step).toBe(Step.CLIMB);
    expect(s.soloServed).toBe(3);
    // money unchanged by solo serves on day 1 (reference: no earn at the cart)
    expect(s.money).toBe(112);
  });
});

describe('interaction relevance (main.gd `_is_relevant`)', () => {
  it('counter only relevant during RUSH', () => {
    const s = day1ThroughRush();
    expect(relevant(reg, s, 'counter')).toBe(true);
    const after = day1Served();
    expect(relevant(reg, after, 'counter')).toBe(false);
  });

  it('cart relevant at CLAIM_CART and SOLO, items only at COLLECT', () => {
    const s = day1Crossed();
    expect(relevant(reg, s, 'cart')).toBe(true);
    expect(relevant(reg, s, 'item_mango')).toBe(false);
    const c = new GameState();
    c.tryRosa();
    c.enterBodega();
    expect(relevant(reg, c, 'item_mango')).toBe(true);
    expect(relevant(reg, c, 'cart')).toBe(false);
  });

  it('rail relevant at POSTCARD and DONE-with-linger', () => {
    const s = day1ToClimb();
    expect(relevant(reg, s, 'rail')).toBe(false);
    s.setStep(Step.POSTCARD);
    expect(relevant(reg, s, 'rail')).toBe(true);
    s.setStep(Step.DONE);
    expect(relevant(reg, s, 'rail')).toBe(false);
    s.lingerStage = 1;
    expect(relevant(reg, s, 'rail')).toBe(true);
  });

  it('Day 2 idris only relevant once arrived', () => {
    const s = day1ToClimb();
    s.day = 2;
    s.setStep(Step.D2_IDRIS);
    expect(relevant(reg, s, 'idris')).toBe(false);
    s.idrisArrived = true;
    expect(relevant(reg, s, 'idris')).toBe(true);
  });
});

describe('Day 2 — the neighborhood comes alive (Doc 22)', () => {
  function day2Start(): GameState {
    const s = day1ToClimb();
    s.day = 2;
    s.dayStartMoney = 112;
    s.setStep(Step.D2_WAKE);
    return s;
  }

  it('advance routes: Idris first, then Rosa, then awning/lunch, then climb', () => {
    const s = day2Start();
    s.advanceDay2();
    expect(s.step).toBe(Step.D2_IDRIS);
    s.idrisArrived = true;
    s.serveIdris();
    expect(s.money).toBe(114);
    expect(s.step).toBe(Step.D2_TASK);
    const { effects } = s.rosaTask();
    expect(effects.some((e) => e.kind === 'cup-given')).toBe(true);
    expect(s.step).toBe(Step.D2_DELIVER);
    s.deliverToKid();
    expect(s.money).toBe(117);
    // awning not yet up → climb offered next (awning is bought at the cart)
    expect(s.step).toBe(Step.D2_CLIMB2);
  });

  it('awning costs $15 and unlocks the lunch rush; tips land at $111', () => {
    const s = day2Start();
    s.advanceDay2();
    s.idrisArrived = true;
    s.serveIdris();          // 114
    s.rosaTask();
    s.deliverToKid();        // 117, D2_CLIMB2
    const effects = s.cartAwningInteraction();
    expect(effects.some((e) => e.kind === 'awning-offer')).toBe(true);
    expect(s.awningUp).toBe(false); // first press only offers
    s.cartAwningInteraction();
    expect(s.awningUp).toBe(true);
    expect(s.money).toBe(102);
    expect(s.step).toBe(Step.D2_LUNCH);
    s.serveCart();
    s.serveCart();
    s.serveCart();
    expect(s.lunchServed).toBe(3);
    expect(s.money).toBe(111);
    expect(s.step).toBe(Step.D2_CLIMB2);
  });

  it('replay day: rewards rest, warmth does not', () => {
    const s = day2Start();
    s.replayDay = true;
    const effects = s.serveCounter; // not in replay flow, use earn directly
    void effects;
    const before = s.money;
    const out = s.earn(5);
    expect(s.money).toBe(before);
    expect(out[0].kind).toBe('note');
    const again = s.earn(5);
    expect(again).toEqual([]); // note shown once
  });

  it('rail goodnight then tomorrow; a kept final day answers "still being written"', () => {
    const s = day1ToClimb(); // day 1
    s.lingerStage = 1;
    s.rail();
    expect(s.lingerStage).toBe(2);
    const out = s.rail();
    expect(out.some((e) => e.kind === 'next-day')).toBe(true);
    s.day = MAX_DAY_NUMBER;
    const beyond = s.rail();
    expect(beyond.some((e) => e.kind === 'day-beyond')).toBe(true);
  });
});

import { MAX_DAY } from '../src/core/Save';
import { authoredRegistry, relevant } from './registryHarness';
const reg = authoredRegistry();
const MAX_DAY_NUMBER = MAX_DAY;

describe('save snapshot rules (main.gd `_persist`)', () => {
  it('day 1 never writes', () => {
    const s = day1ToClimb();
    expect(s.snapshotForSave()).toBeNull();
  });

  it('day 2 snapshots the full corner', () => {
    const s = day1ToClimb();
    s.day = 2;
    s.dayComplete = true;
    s.money = 111;
    s.dayStartMoney = 112;
    const snap = s.snapshotForSave();
    expect(snap).not.toBeNull();
    expect(snap!.day).toBe(2);
    expect(snap!.money).toBe(111);
    expect(snap!.day_start_money).toBe(112);
  });
});

describe('postcard captions (main.gd `_compose_postcard`, Doc 08)', () => {
  it('Day 1 caption carries the arc and the open loop', () => {
    const text = composeCaption({ day: 1, replay: false, dayStartMoney: 87, money: 112, cartName: "Wade's Spot" });
    expect(text).toContain('Day 1. $87 \u2192 $112.');
    expect(text).toContain('Met: Rosa. Idris.');
    expect(text).toContain('The regulars are waiting.');
    expect(text).toContain('\u2014 Wade\'s Spot, Day 1');
  });

  it('Day 2 caption uses the day-start snapshot ($112 → $111)', () => {
    const text = composeCaption({ day: 2, replay: false, dayStartMoney: 112, money: 111, cartName: 'First Slice' });
    expect(text).toContain('Day 2. $112 \u2192 $111.');
    expect(text).toContain('Met: the kid.');
  });

  it('replay caption never quotes money', () => {
    const text = composeCaption({ day: 2, replay: true, dayStartMoney: 112, money: 111, cartName: 'X' });
    expect(text).toContain('Day 2, again');
    expect(text).not.toContain('$');
  });
});

describe('Rosa\u2019s stateful Day 2 lines (main.gd `_rosa_chat`)', () => {
  it('lines follow the player\u2019s state', () => {
    const base = { step: 10, idrisServed: false, kidKept: false, awningUp: false, cartName: 'Corner Comet', chatIndex: 0 };
    expect(rosaChatLine(base).text).toContain('Corner Comet');
    expect(rosaChatLine({ ...base, idrisServed: true }).text).toContain('shy before noon');
    expect(rosaChatLine({ ...base, idrisServed: true, kidKept: true }).text).toContain('awning');
    const both = rosaChatLine({ ...base, idrisServed: true, kidKept: true, awningUp: true });
    expect(both.text).toContain('tomatoes');
    expect(rosaChatLine({ ...base, idrisServed: true, kidKept: true, awningUp: true, chatIndex: both.nextChatIndex }).text)
      .toContain('Two windows');
  });
});
