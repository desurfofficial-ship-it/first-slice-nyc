/**
 * Day 3 — "A Place at the Corner" (docs/28): the state machine, the money
 * math, the brew gate, the stool purchase, and the save round-trip.
 * The kid's walk itself is measured in the E2E driver (real movement);
 * here we pin the pure logic.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { D3_ORDERS, composeCaption } from '../src/core/content';
import { parseSave, defaultSave, SAVE_KEY } from '../src/core/Save';

/** A Day-2-completed state, ready to begin Day 3 (the autotest's end state). */
function day2Done(money = 111): GameState {
  const s = new GameState();
  s.day = 2;
  s.money = money;
  s.dayStartMoney = money;
  s.cartName = "Wade's Spot";
  s.kidKept = true;
  s.idrisServed = true;
  s.awningUp = true;
  s.setStep(Step.D2_POSTCARD);
  return s;
}

function day3ToRush(money = 111): GameState {
  const s = day2Done(money);
  s.day = 3;
  s.setStep(Step.D3_WAKE);
  s.rosaD3Wake();             // → D3_RUSH + Idris spawned by the Game
  return s;
}

describe('Day 3 — wake', () => {
  it('Rosa\u2019s news opens the rush and Idris is queued first', () => {
    const s = day2Done();
    s.day = 3;
    s.setStep(Step.D3_WAKE);
    const effects = s.rosaD3Wake();
    expect(s.step).toBe(Step.D3_RUSH);
    expect(effects.some((e) => e.kind === 'spawn-customer' && e.who === 'idris')).toBe(true);
    expect(effects.some((e) => e.kind === 'note')).toBe(true);
  });

  it('the wake talk is a no-op on any other step (no double news)', () => {
    const s = day3ToRush();
    expect(s.rosaD3Wake()).toEqual([]);
  });
});

describe('Day 3 — the rush: brewing, order states, money', () => {
  it('a serve press starts a brew, not an instant cup', () => {
    const s = day3ToRush();
    const effects = s.startBrew();
    expect(effects).toEqual([{ kind: 'brew-start' }]);
    expect(s.brewing).toBe(true);
  });

  it('repeated input while brewing does nothing (no double-serve)', () => {
    const s = day3ToRush();
    s.startBrew();
    expect(s.startBrew()).toEqual([]);
    expect(s.completeBrew().length).toBeGreaterThan(0); // the ONE completion pays
    expect(s.brewing).toBe(false);
    expect(s.money).toBe(111 + D3_ORDERS[0].pay);
  });

  it('a second completeBrew after the brew ended pays nothing', () => {
    const s = day3ToRush();
    s.startBrew();
    s.completeBrew();
    expect(s.completeBrew()).toEqual([]);
    expect(s.money).toBe(111 + D3_ORDERS[0].pay);
  });

  it('serving with nobody at the cart does nothing', () => {
    const s = day3ToRush();
    s.rushIndex = D3_ORDERS.length; // the queue is empty
    expect(s.startBrew()).toEqual([]);
  });

  it('four orders pay $19 total, then the kid is sent down', () => {
    const s = day3ToRush();
    const total = D3_ORDERS.reduce((a, o) => a + o.pay, 0);
    expect(total).toBe(19);
    for (let i = 0; i < D3_ORDERS.length; i++) {
      s.startBrew();
      s.completeBrew();
    }
    expect(s.money).toBe(111 + 19);
    expect(s.step).toBe(Step.D3_KIDDOWN);
    expect(s.brewing).toBe(false);
  });

  it('every order has a readable bubble and a reaction line', () => {
    for (const o of D3_ORDERS) {
      expect(o.bubble.length).toBeGreaterThan(0);
      expect(o.bubble.length).toBeLessThanOrEqual(18); // must fit the sprite
      expect(o.reaction.length).toBeGreaterThan(0);
      expect(o.pay).toBeGreaterThan(0);
    }
  });
});

describe('Day 3 — the kid comes down', () => {
  function rushDone(): GameState {
    const s = day3ToRush();
    for (let i = 0; i < D3_ORDERS.length; i++) { s.startBrew(); s.completeBrew(); }
    return s;
  }

  it('talking to the kid joins him to you, exactly once', () => {
    const s = rushDone();
    const effects = s.kidJoins();
    expect(s.kidDown).toBe(true);
    expect(effects.some((e) => e.kind === 'kid-follow')).toBe(true);
    expect(s.kidJoins()).toEqual([]); // no double join
  });

  it('reaching the corner with no stool opens the purchase', () => {
    const s = rushDone();
    s.kidJoins();
    const effects = s.kidReachesCorner();
    expect(s.step).toBe(Step.D3_STOOL);
    expect(s.kidAtCorner).toBe(true);
    expect(effects.some((e) => e.kind === 'note')).toBe(true);
  });

  it('reaching the corner with a stool already up sits him down', () => {
    const s = rushDone();
    s.kidJoins();
    s.stoolUp = true;
    const effects = s.kidReachesCorner();
    expect(s.step).toBe(Step.D3_POSTER);
    expect(effects.some((e) => e.kind === 'kid-sits')).toBe(true);
  });
});

describe('Day 3 — the stool purchase', () => {
  it('offer \u2192 confirm, $10, once; repeat presses after are dead', () => {
    const s = day3ToRush();
    s.setStep(Step.D3_STOOL);
    expect(s.stoolInteraction().map((e) => e.kind)).toEqual(['stool-offer']);
    const buy = s.stoolInteraction();
    expect(s.stoolUp).toBe(true);
    expect(s.money).toBe(101);
    expect(s.step).toBe(Step.D3_POSTER);
    expect(buy.some((e) => e.kind === 'stool-up')).toBe(true);
    // the step has moved on \u2014 more presses buy nothing
    expect(s.stoolInteraction()).toEqual([]);
    expect(s.money).toBe(101);
  });

  it('a broke cart can still set the stool up \u2014 money floors at 0', () => {
    const s = day3ToRush(4);
    s.setStep(Step.D3_STOOL);
    s.stoolInteraction();
    s.stoolInteraction();
    expect(s.money).toBe(0);
    expect(s.stoolUp).toBe(true);
  });
});

describe('Day 3 — poster, climb, postcard', () => {
  it('the flyer is read once and points at the fire escape', () => {
    const s = day3ToRush();
    s.setStep(Step.D3_POSTER);
    s.seePoster();
    expect(s.step).toBe(Step.D3_CLIMB3);
    expect(s.posterSeen).toBe(true);
    expect(s.seePoster()).toEqual([]);
  });

  it('relevance: kid and poster answer only when the story is there', () => {
    const s = day3ToRush();
    expect(s.isRelevant('kid')).toBe(false);
    s.setStep(Step.D3_KIDDOWN);
    expect(s.isRelevant('kid')).toBe(true);
    s.kidJoins();
    expect(s.isRelevant('kid')).toBe(false);
    expect(s.isRelevant('poster')).toBe(false);
    s.setStep(Step.D3_POSTER);
    expect(s.isRelevant('poster')).toBe(true);
  });

  it('the Day 3 caption carries the money math and the belonging beat', () => {
    const cap = composeCaption({ day: 3, replay: false, dayStartMoney: 111, money: 120, cartName: "Wade's Spot" });
    expect(cap).toContain('Day 3. $111 \u2192 $120.');
    expect(cap).toContain('The kid came down from the window.');
    expect(cap).toContain("Wade's Spot, Day 3");
  });

  it('the replay caption is its own, warmer thing', () => {
    const cap = composeCaption({ day: 3, replay: true, dayStartMoney: 120, money: 120, cartName: 'X' });
    expect(cap).toContain('Day 3, again');
    expect(cap).toContain('stool');
  });
});

describe('Day 3 — the save round-trip', () => {
  it('snapshot carries stool; parse reads it back', () => {
    const s = day3ToRush();
    s.stoolUp = true;
    const snap = s.snapshotForSave();
    expect(snap?.stool).toBe(true);
    const parsed = parseSave(JSON.stringify(snap));
    expect(parsed.stool).toBe(true);
    expect(parsed.day).toBe(3);
  });

  it('a pre-Day-3 save without the stool field parses clean (back-compat)', () => {
    const parsed = parseSave(JSON.stringify({
      day: 2, day_complete: true, replay: false, cart_name: 'Old Spot',
      money: 111, awning: true, kid_kept: true, idris_served: true, lunch_served: 3,
    }));
    expect(parsed.stool).toBe(false);
    expect(parsed.day).toBe(2);
    expect(parsed.cart_name).toBe('Old Spot');
  });

  it('corrupt saves still fall back to defaults (never a crash)', () => {
    expect(parseSave('{nope')).toEqual(defaultSave());
    expect(parseSave(null)).toEqual(defaultSave());
  });

  it('day is clamped to MAX_DAY = 4 (day 5 does not exist yet)', () => {
    const parsed = parseSave(JSON.stringify({ day: 9, money: 5 }));
    expect(parsed.day).toBe(4);
  });

  it('the key is unchanged \u2014 existing players keep their corner', () => {
    expect(SAVE_KEY).toBe('first_slice_save_v1');
  });
});
