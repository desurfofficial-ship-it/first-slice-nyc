/**
 * Day 4 — "Say Hi" (docs/29): the state machine, the money math, the brew
 * gate on its second day, the Map handoff, and the save round-trip.
 * The stranger's walk itself is measured in the E2E driver (real movement);
 * here we pin the pure logic. The chapter's law: hospitality — the light stays.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { D4_ORDERS, D3_ORDERS, composeCaption } from '../src/core/content';
import { parseSave, defaultSave, SAVE_KEY, MAX_DAY } from '../src/core/Save';
import { authoredRegistry, relevant } from './registryHarness';
const reg = authoredRegistry();

/** A Day-3-completed state, ready to begin Day 4 (the autotest's end state). */
function day3Done(money = 120): GameState {
  const s = new GameState();
  s.day = 3;
  s.money = money;
  s.dayStartMoney = money;
  s.cartName = "Wade's Spot";
  s.kidKept = true;
  s.idrisServed = true;
  s.awningUp = true;
  s.stoolUp = true;
  s.kidDown = true;
  s.kidAtCorner = true;
  s.setStep(Step.D3_POSTCARD);
  return s;
}

function day4ToRush(money = 120): GameState {
  const s = day3Done(money);
  s.day = 4;
  s.setStep(Step.D4_WAKE);
  s.rosaD4Wake();             // → D4_STRANGER + the stranger arrives
  s.setStep(Step.D4_STRANGER);
  s.greetStranger();          // → D4_RUSH (+$2, Idris queued by the Game)
  s.money = money;            // callers control the wallet for their math
  s.dayStartMoney = money;
  return s;
}

describe('Day 4 — wake', () => {
  it('Rosa\u2019s news points at the terminal and the stranger arrives', () => {
    const s = day3Done();
    s.day = 4;
    s.setStep(Step.D4_WAKE);
    const effects = s.rosaD4Wake();
    expect(s.step).toBe(Step.D4_STRANGER);
    expect(effects.some((e) => e.kind === 'stranger-arrive')).toBe(true);
    expect(effects.some((e) => e.kind === 'note')).toBe(true);
    // no rush yet — the terminal beat comes first
    expect(effects.some((e) => e.kind === 'spawn-customer')).toBe(false);
  });

  it('the wake talk is a no-op on any other step (no double news)', () => {
    const s = day4ToRush();
    expect(s.rosaD4Wake()).toEqual([]);
  });
});

describe('Day 4 — the terminal: the Day-1 mirror', () => {
  it('greeting her is a no-op on any other step', () => {
    const s = day4ToRush();
    expect(s.greetStranger()).toEqual([]);
  });

  it('the greeting pays Rosa\u2019s two dollars and opens the rush behind you', () => {
    const s = day3Done();
    s.day = 4;
    s.setStep(Step.D4_WAKE);
    s.rosaD4Wake();
    const effects = s.greetStranger();
    expect(s.strangerMet).toBe(true);
    expect(s.money).toBe(122); // 120 + Rosa's on-the-house rule
    expect(effects.some((e) => e.kind === 'money')).toBe(true);
    expect(effects.some((e) => e.kind === 'stranger-to-cart')).toBe(true);
    expect(effects.some((e) => e.kind === 'spawn-customer' && e.who === 'idris')).toBe(true);
    expect(s.step).toBe(Step.D4_RUSH);
  });

  it('the greeting fires exactly once (repeated input is dead)', () => {
    const s = day3Done();
    s.day = 4;
    s.setStep(Step.D4_WAKE);
    s.rosaD4Wake();
    s.greetStranger();           // once: → D4_RUSH, $122
    s.setStep(Step.D4_STRANGER); // even if something walked the step back
    expect(s.greetStranger()).toEqual([]);
    expect(s.money).toBe(122);
  });
});

describe('Day 4 — the rush: brewing on its second day', () => {
  it('three orders pay $11 total (Idris first, the queue is D4\u2019s)', () => {
    const s = day4ToRush();
    const total = D4_ORDERS.reduce((a, o) => a + o.pay, 0);
    expect(total).toBe(11);
    for (let i = 0; i < D4_ORDERS.length; i++) {
      expect(s.startBrew().length).toBeGreaterThan(0);
      s.completeBrew();
    }
    expect(s.money).toBe(120 + 11); // no greeting yet — the rush alone
    expect(s.step).toBe(Step.D4_MAP);
  });

  it('the Day 3 queue is untouched by Day 4 (four orders there, three here)', () => {
    expect(D3_ORDERS.length).toBe(4);
    expect(D4_ORDERS.length).toBe(3);
  });

  it('repeated input while brewing never double-serves (day 4 too)', () => {
    const s = day4ToRush();
    s.startBrew();
    expect(s.brewing).toBe(true);
    expect(s.startBrew()).toEqual([]);
    expect(s.completeBrew().length).toBeGreaterThan(0); // the ONE completion pays
    expect(s.brewing).toBe(false);
  });

  it('a serve press with an empty queue does nothing', () => {
    const s = day4ToRush();
    s.rushIndex = D4_ORDERS.length; // the queue is empty
    expect(s.startBrew()).toEqual([]);
  });
});

describe('Day 4 — the Map changes hands', () => {
  it('giveMap is dead until she has actually walked to the cart', () => {
    const s = day4ToRush();
    for (let i = 0; i < D4_ORDERS.length; i++) { s.startBrew(); s.completeBrew(); }
    expect(s.step).toBe(Step.D4_MAP);
    expect(s.strangerAtCart).toBe(false);
    expect(s.giveMap()).toEqual([]); // still walking your first walk
    s.strangerAtCart = true;
    const effects = s.giveMap();
    expect(s.mapGiven).toBe(true);
    expect(effects.some((e) => e.kind === 'stranger-departs')).toBe(true);
    expect(effects.some((e) => e.kind === 'persist')).toBe(true);
    // the afternoon opens — the kid flags the apron (docs/30)
    expect(s.step).toBe(Step.D4_LAUNDRY);
  });

  it('the Map is given exactly once (repeat presses are dead)', () => {
    const s = day4ToRush();
    for (let i = 0; i < D4_ORDERS.length; i++) { s.startBrew(); s.completeBrew(); }
    s.strangerAtCart = true;
    s.giveMap();
    expect(s.giveMap()).toEqual([]);
  });
});

describe('Day 4 afternoon — the block opens up (docs/30)', () => {
  /** $122 at the handoff (Rosa's $2 in) → the rush pays $11 → $133. */
  function day4MapGiven(): GameState {
    const s = day4ToRush(122);
    for (let i = 0; i < D4_ORDERS.length; i++) { s.startBrew(); s.completeBrew(); }
    s.strangerAtCart = true;
    s.giveMap(); // → D4_LAUNDRY
    expect(s.money).toBe(133);
    return s;
  }

  it('Sal takes the apron once: the wash starts and the permit beat opens', () => {
    const s = day4MapGiven();
    const effects = s.handApron();
    expect(s.apronWashing).toBe(true);
    expect(effects.some((e) => e.kind === 'wash-start')).toBe(true);
    expect(effects.some((e) => e.kind === 'note')).toBe(true);
    expect(s.step).toBe(Step.D4_PERMIT);
  });

  it('a second press at the counter hands nothing (repeat input is dead)', () => {
    const s = day4MapGiven();
    s.handApron();
    s.setStep(Step.D4_LAUNDRY); // even if something walked the step back
    expect(s.handApron()).toEqual([]);
    expect(s.apronWashing).toBe(true);
  });

  it('the wash completes exactly once on the Game\u2019s clock', () => {
    const s = day4MapGiven();
    s.handApron();
    const effects = s.completeWash();
    expect(s.apronClean).toBe(true);
    expect(effects.some((e) => e.kind === 'apron-clean')).toBe(true);
    expect(s.completeWash()).toEqual([]);
  });

  it('the A-frame reads first, files second — the confirm gate holds', () => {
    const s = day4MapGiven();
    s.handApron();
    const read = s.readPermit();
    expect(s.permitConfirm).toBe(true);
    expect(read.some((e) => e.kind === 'note')).toBe(true);
    expect(s.money).toBe(133); // reading is free
    const file = s.readPermit();
    expect(s.permitFiled).toBe(true);
    expect(file.some((e) => e.kind === 'money')).toBe(true); // the wallet moved
    expect(file.some((e) => e.kind === 'persist')).toBe(true);
    expect(s.money).toBe(123);
    expect(s.step).toBe(Step.D4_CLIMB4);
  });

  it('a third press at the A-frame is dead input \u2014 no double spend, ever', () => {
    const s = day4MapGiven();
    s.handApron();
    s.readPermit();
    s.readPermit();
    expect(s.readPermit()).toEqual([]);
    expect(s.money).toBe(123);
  });

  it('a replay of a kept day never pays twice \u2014 the permit carries forward', () => {
    const s = day4MapGiven();
    s.permitFiled = true; // a save where Day 4 was already lived
    s.handApron();
    s.readPermit();
    const file = s.readPermit();
    expect(file.some((e) => e.kind === 'spend')).toBe(false);
    expect(s.money).toBe(133);
    expect(s.step).toBe(Step.D4_CLIMB4);
  });

  it('relevance: Sal answers in his two steps, the A-frame only while filing', () => {
    const s = day4MapGiven();
    expect(relevant(reg, s, 'laundry')).toBe(true);
    expect(relevant(reg, s, 'permit')).toBe(false); // not until the wash starts
    s.handApron();
    expect(relevant(reg, s, 'permit')).toBe(true);
    s.readPermit();
    s.readPermit();
    expect(relevant(reg, s, 'permit')).toBe(false);
    expect(relevant(reg, s, 'laundry')).toBe(false);
  });

  it('snapshot carries permit; parse reads it back; old saves parse clean', () => {
    const s = day4MapGiven();
    s.permitFiled = true;
    const snap = s.snapshotForSave();
    expect(snap?.permit).toBe(true);
    const parsed = parseSave(JSON.stringify(snap));
    expect(parsed.permit).toBe(true);
    const pre = parseSave(JSON.stringify({ day: 3, day_complete: true, money: 120 }));
    expect(pre.permit).toBe(false);
    expect(pre.map_given).toBe(false);
  });

  it('the Day 4 caption now carries the permit line and the honest math', () => {
    const cap = composeCaption({ day: 4, replay: false, dayStartMoney: 120, money: 123, cartName: "Wade's Spot" });
    expect(cap).toContain('Day 4. $120 \u2192 $123.');
    expect(cap).toContain('The Map changed hands.');
    expect(cap).toContain('Filed: the permit.');
    expect(cap).toContain('The light stays.');
  });

  it('the replay caption keeps its warmth and gains the receipt', () => {
    const cap = composeCaption({ day: 4, replay: true, dayStartMoney: 120, money: 123, cartName: "Wade's Spot" });
    expect(cap).toContain('Day 4, again.');
    expect(cap).toContain('upside down');
    expect(cap).toContain('The receipt is still on the cart.');
  });
});

describe('Day 4 — the wall and the relevance map', () => {
  it('day 3\u2019s rail now says tomorrow (MAX_DAY = 4); day 4 is the wall', () => {
    expect(MAX_DAY).toBe(4);
    const s3 = day3Done();
    s3.lingerStage = 2;
    expect(s3.rail().some((e) => e.kind === 'next-day')).toBe(true);
    const s4 = day3Done();
    s4.day = 4;
    s4.setStep(Step.D4_POSTCARD);
    s4.lingerStage = 2;
    expect(s4.rail().some((e) => e.kind === 'day-beyond')).toBe(true);
  });

  it('relevance: the stranger answers in her two steps and only then', () => {
    const s = day4ToRush();
    s.setStep(Step.D4_STRANGER);
    expect(relevant(reg, s, 'stranger')).toBe(true);
    s.setStep(Step.D4_RUSH);
    expect(relevant(reg, s, 'stranger')).toBe(false);
    s.setStep(Step.D4_MAP);
    expect(relevant(reg, s, 'stranger')).toBe(false); // she has to arrive first
    s.strangerAtCart = true;
    expect(relevant(reg, s, 'stranger')).toBe(true);
    s.setStep(Step.D4_CLIMB4);
    expect(relevant(reg, s, 'stranger')).toBe(false);
  });

  it('relevance: rosa and cart answer through the Day 4 morning', () => {
    const s = day4ToRush();
    expect(relevant(reg, s, 'rosa')).toBe(true);
    expect(relevant(reg, s, 'cart')).toBe(true);
    s.setStep(Step.D4_CLIMB4);
    expect(relevant(reg, s, 'rosa')).toBe(false);
  });

  it('relevance: the rail answers on D4_POSTCARD', () => {
    const s = day3Done();
    s.day = 4;
    s.setStep(Step.D4_POSTCARD);
    expect(relevant(reg, s, 'rail')).toBe(true);
  });
});

describe('Day 4 — captions and saves', () => {
  it('the Day 4 caption carries the money math and the hospitality beat', () => {
    const cap = composeCaption({ day: 4, replay: false, dayStartMoney: 120, money: 133, cartName: "Wade's Spot" });
    expect(cap).toContain('Day 4. $120 \u2192 $133.');
    expect(cap).toContain('The Map changed hands.');
    expect(cap).toContain('The light stays.');
    expect(cap).toContain("Wade's Spot, Day 4");
  });

  it('the replay caption is its own, warmer thing', () => {
    const cap = composeCaption({ day: 4, replay: true, dayStartMoney: 120, money: 120, cartName: "Wade's Spot" });
    expect(cap).toContain('Day 4, again.');
    expect(cap).toContain('upside down');
  });

  it('the earlier captions did not move (day 3 stays day 3)', () => {
    const cap = composeCaption({ day: 3, replay: false, dayStartMoney: 111, money: 130, cartName: 'X' });
    expect(cap).toContain('Day 3. $111 \u2192 $130.');
  });

  it('snapshot carries map_given; parse reads it back', () => {
    const s = day3Done();
    s.day = 4;
    s.mapGiven = true;
    const snap = s.snapshotForSave();
    expect(snap?.map_given).toBe(true);
    const parsed = parseSave(JSON.stringify(snap));
    expect(parsed.map_given).toBe(true);
  });

  it('a pre-Day-4 save without the map field parses clean (back-compat)', () => {
    const parsed = parseSave(JSON.stringify({ day: 3, day_complete: true, stool: true, money: 120 }));
    expect(parsed.map_given).toBe(false);
    expect(parsed.stool).toBe(true);
  });

  it('corrupt saves still fall back to defaults (never a crash)', () => {
    const parsed = parseSave('{not json');
    expect(parsed).toEqual(defaultSave());
  });

  it('the key is unchanged \u2014 existing players keep their corner', () => {
    expect(SAVE_KEY).toBe('first_slice_save_v1');
  });
});
