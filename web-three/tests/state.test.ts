/**
 * Day 1 + Day 2 state machine — mirrors the original autotest's assertions
 * (the greybox's `_run_autotest`) at the logic level.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { composeCaption, rosaChatLine, RUSH_CARDS, SOLO_CARDS, IDRIS_NINE_YEARS_NOTE,
  USUAL_NOTE, ROSA_CART_HANDOVER_NOTE, ROSA_REGISTER_NOTES, ITEM_STICKERS } from '../src/core/content';

function day1ThroughRush(): GameState {
  const s = new GameState();
  s.tryRosa();               // MEET_ROSA → ENTER_BODEGA
  s.enterBodega();           // → COLLECT
  s.collect('mango');
  s.collect('coffee');
  s.collect('bread');        // → RUSH + first customer
  return s;
}

/** One conversation at the counter: open, choose, read, fold. The reply is
 *  the card's default unless a test picks one — money never cares. */
function serveCard(s: GameState, reply?: number): void {
  if (!s.pendingCard) throw new Error('no order card open');
  s.chooseReply(reply ?? s.pendingCard.defaultReply);
  s.chooseReply(-1); // the response read, the card folds
}

function day1Served(): GameState {
  const s = day1ThroughRush();
  for (let i = 0; i < RUSH_CARDS.length; i++) {
    expect(s.openCounterOrder().length).toBeGreaterThan(0);
    serveCard(s);
  }
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
  for (let i = 0; i < SOLO_CARDS.length; i++) {
    expect(s.openCartOrder().length).toBeGreaterThan(0);
    serveCard(s);
  }
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

  it('each pickup reads its fun-fact sticker (Doc 02 §2:00–5:00)', () => {
    const s = new GameState();
    s.tryRosa();
    s.enterBodega();
    for (const id of ['mango', 'coffee', 'bread'] as const) {
      const effects = s.collect(id);
      const notes = effects.filter((e) => e.kind === 'note');
      const texts = notes.map((e) => (e.kind === 'note' ? e.text : ''));
      expect(texts.some((t) => t.startsWith('The '))).toBe(true); // the pick line
      expect(texts).toContain(ITEM_STICKERS[id]);                  // the sticker, queued after
    }
    // a wrong id never claims a sticker it does not carry
    const bare = new GameState();
    bare.tryRosa();
    bare.enterBodega();
    expect(bare.collect('nothing')).toEqual([]);
  });

  it('collecting an item twice is refused', () => {
    const s = day1ThroughRush();
    expect(s.collect('mango')).toEqual([]);
  });

  it('5-order rush pays $87 → $112 (Doc 08), then CROSS — any replies', () => {
    const s = day1ThroughRush();
    for (let i = 0; i < 4; i++) {
      expect(s.openCounterOrder().length).toBeGreaterThan(0);
      serveCard(s, i % 4); // every path serves the same honest cup
      expect(s.step).toBe(Step.RUSH);
    }
    s.openCounterOrder();
    serveCard(s);
    expect(s.step).toBe(Step.CROSS);
    expect(s.money).toBe(112);
  });

  it('the rush is a conversation: cards open in order and refuse double-open', () => {
    const s = day1ThroughRush();
    expect(s.openCounterOrder().some((e) => e.kind === 'order-open')).toBe(true);
    expect(s.pendingCard?.id).toBe('regular');
    expect(s.openCounterOrder()).toEqual([]); // already open
    serveCard(s);
    expect(s.pendingCard).toBeNull();
    // the second card is the bacon-egg-and-cheese (Doc 12 card 2)
    s.openCounterOrder();
    expect(s.pendingCard?.id).toBe('bec');
    serveCard(s);
  });

  it('asking is the teach path: the regular-coffee note lands in the Map', () => {
    const s = day1ThroughRush();
    s.openCounterOrder();
    s.chooseReply(2); // "Ask what regular means"
    expect(s.mapNotes).toContain(RUSH_CARDS[0].replies[2].note);
    expect(s.mapSlang).toContain('regular');
    s.chooseReply(-1);
  });

  it('card 5 keeps the continuity beat: Rosa\u2019s nine-years line always lands', () => {
    const s = day1ThroughRush();
    for (let i = 0; i < 4; i++) { s.openCounterOrder(); serveCard(s, i % 4); }
    s.openCounterOrder();
    expect(s.pendingCard?.id).toBe('idris');
    s.chooseReply(2); // ask what the usual is
    expect(s.mapNotes).toContain(IDRIS_NINE_YEARS_NOTE);
    s.chooseReply(-1);
    expect(s.step).toBe(Step.CROSS);
    // the same line lands whichever way you answer the usual
    const t = day1ThroughRush();
    for (let i = 0; i < 4; i++) { t.openCounterOrder(); serveCard(t); }
    t.openCounterOrder();
    t.chooseReply(0); // just make it
    expect(t.mapNotes).toContain(IDRIS_NINE_YEARS_NOTE);
    t.chooseReply(-1);
  });

  it('serving past 5 does nothing (no duplicate rewards)', () => {
    const s = day1Served();
    for (let i = 0; i < 3; i++) {
      expect(s.openCounterOrder()).toEqual([]); // the counter is done for the morning
      expect(s.chooseReply(0)).toEqual([]);
    }
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
    const effects = s.claimCart();
    expect(effects.length).toBeGreaterThan(0);
    // Doc 02 §20:00–26:00 — Rosa's handover line lands as the box opens
    expect(effects.some((e) => e.kind === 'note' && e.text === ROSA_CART_HANDOVER_NOTE)).toBe(true);
    expect(effects.some((e) => e.kind === 'name-cart-open')).toBe(true);
    expect(s.step).toBe(Step.NAME_CART);
    s.confirmName('   ');
    expect(s.cartName).toBe('First Slice');
    expect(s.step).toBe(Step.SOLO);
  });

  it('the kid\u2019s card has no wrong answer, and Idris converts to a Regular', () => {
    const s = day1ThroughNaming();
    s.confirmName("Wade's Spot");
    expect(s.step).toBe(Step.SOLO);
    // stroller woman — the second regular coffee teaches the "small" note
    s.openCartOrder();
    expect(s.pendingCard?.id).toBe('stroller');
    serveCard(s);
    expect(s.mapNotes).toContain(SOLO_CARDS[0].replies[0].note);
    // the kid — "whatever's cold" — every choice serves the cup
    s.openCartOrder();
    expect(s.pendingCard?.id).toBe('kid');
    s.chooseReply(1); // ask what he usually likes → "I don't know either!"
    expect(s.kidDay1Served).toBe(true);
    s.chooseReply(-1);
    // the kid's serve spawns Idris next (the visual conversion, cap + glasses)
    s.openCartOrder();
    expect(s.pendingCard?.id).toBe('idris_solo');
    serveCard(s);
    expect(s.kidDay1Served).toBe(true);
    expect(s.step).toBe(Step.CLIMB);
    expect(s.soloServed).toBe(3);
    // the Map keeps the love-letter note; the unlock line is the toast
    expect(s.mapNotes).toContain(USUAL_NOTE);
    // money unchanged by solo serves on day 1 (Rosa counts $112 exactly)
    expect(s.money).toBe(112);
  });

  it('the solo rush ends on Rosa\u2019s register count (Doc 02 §20:00–26:00)', () => {
    const s = day1ThroughNaming();
    s.confirmName("Wade's Spot");
    let effects: ReturnType<GameState['chooseReply']> = [];
    for (let i = 0; i < SOLO_CARDS.length; i++) {
      s.openCartOrder();
      effects = s.chooseReply(s.pendingCard?.defaultReply ?? 0);
      s.chooseReply(-1);
    }
    const texts = effects.filter((e) => e.kind === 'note').map((e) => (e.kind === 'note' ? e.text : ''));
    for (const line of ROSA_REGISTER_NOTES) expect(texts).toContain(line);
    // the count says the day's real math, and the climb is offered after
    expect(texts.some((t) => t.includes('$87 → $112'))).toBe(true);
    expect(s.step).toBe(Step.CLIMB);
  });

  it('the kid answers \u201CI don\u2019t know either!\u201D on the ask path (VS-F03)', () => {
    const s = day1ThroughNaming();
    s.confirmName('X');
    s.openCartOrder(); serveCard(s);
    s.openCartOrder();
    const effects = s.chooseReply(1);
    const respond = effects.find((e) => e.kind === 'order-respond');
    expect(respond && 'text' in respond ? respond.text : '').toContain('I don\u2019t know either');
    s.chooseReply(-1);
    s.openCartOrder(); serveCard(s);
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

describe('serving is zero-fail — every card, every reply (docs/12 law)', () => {
  it('every rush card serves through ALL its replies; money is always +$5', () => {
    for (let i = 0; i < RUSH_CARDS.length; i++) {
      const card = RUSH_CARDS[i];
      for (let r = 0; r < card.replies.length; r++) {
        const s = new GameState();
        s.step = Step.RUSH;
        s.rushServed = i;
        s.openCounterOrder();
        expect(s.pendingCard?.id).toBe(card.id);
        const effects = s.chooseReply(r);
        const kinds = effects.map((e) => e.kind);
        expect(kinds, `${card.id} reply ${r} responds`).toContain('order-respond');
        expect(kinds, `${card.id} reply ${r} serves`).toContain('serve-customer');
        expect(s.money).toBe(87 + 5);
        expect(s.orderResponded).toBe(true);
        s.chooseReply(-1); // the fold
        expect(s.pendingCard).toBeNull();
      }
    }
  });

  it('every solo card serves through ALL its replies; money never moves', () => {
    for (let i = 0; i < SOLO_CARDS.length; i++) {
      const card = SOLO_CARDS[i];
      for (let r = 0; r < card.replies.length; r++) {
        const s = new GameState();
        s.step = Step.SOLO;
        s.soloServed = i;
        s.openCartOrder();
        expect(s.pendingCard?.id).toBe(card.id);
        const effects = s.chooseReply(r);
        const kinds = effects.map((e) => e.kind);
        expect(kinds, `${card.id} reply ${r} responds`).toContain('order-respond');
        expect(kinds, `${card.id} reply ${r} serves`).toContain('serve-customer');
        expect(s.money).toBe(87); // the corner gives; it does not charge
        s.chooseReply(-1);
        expect(s.pendingCard).toBeNull();
      }
    }
  });

  it('out-of-range replies clamp and still serve — no dead press anywhere', () => {
    for (const bad of [-9, 99]) {
      const s = new GameState();
      s.step = Step.RUSH;
      s.rushServed = 0;
      s.openCounterOrder();
      const effects = s.chooseReply(bad);
      expect(effects.map((e) => e.kind)).toContain('serve-customer');
      expect(s.money).toBe(87 + 5);
    }
  });

  it('every card offers the kit\u2019s four replies — ask, repeat, chef\u2019s welcome among them', () => {
    for (const card of [...RUSH_CARDS, ...SOLO_CARDS]) {
      expect(card.replies.length, `${card.id} reply count`).toBeGreaterThanOrEqual(3);
      expect(card.replies.length, `${card.id} reply count cap`).toBeLessThanOrEqual(4);
    }
  });

  it('card 5\u2019s nine-years payoff lands on EVERY choice — the payoff, not a branch', () => {
    const card = RUSH_CARDS[4];
    expect(card.id).toBe('idris');
    for (let r = 0; r < card.replies.length; r++) {
      const s = new GameState();
      s.step = Step.RUSH;
      s.rushServed = 4;
      s.openCounterOrder();
      expect(s.pendingCard?.id).toBe('idris');
      const effects = s.chooseReply(r);
      const quietLine = effects.some(
        (e) => e.kind === 'map-note' && e.text === IDRIS_NINE_YEARS_NOTE,
      );
      expect(quietLine, `idris reply ${r} still carries Rosa\u2019s quiet line`).toBe(true);
    }
  });
});
