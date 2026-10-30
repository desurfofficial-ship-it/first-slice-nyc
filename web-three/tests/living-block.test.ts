/**
 * The living block (Doc 33 review → selective integration, docs/34):
 * the day-keyed diary — flyer slips, ambient windows, the barrier — the
 * remembered favor, Rosa's shorthand rung, the familiar face's ladder, and
 * the postcard's two new memories (the awning line, the season stamp).
 *
 * Everything here is PURE data or state-machine logic: no renderer, no DOM.
 * The E2E driver walks the beats in the real world; this file pins the
 * decisions so a refactor can't quietly rewrite the block's diary.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { composeCaption, IDRIS_D3_FAVOR_REACTION, D3_ORDERS, D4_ORDERS,
  ROSA_FOUR_MORNINGS_NOTE } from '../src/core/content';
import { FLYER_SLIPS, flyerSlipForDay, ambientWindowPlan, AMBIENT_WARMTH,
  barrierDiary, familiarBeatForDay, FAMILIAR_SPEED } from '../src/world/dressing';

// ------------------------------------------------------------- flyer board ----

describe('the flyer board keeps a diary (Doc 33 §2.3)', () => {
  it('each of the first five days has its own authored slip', () => {
    const titles = [1, 2, 3, 4, 5].map((d) => flyerSlipForDay(d).title);
    expect(titles).toEqual(['LOST CAT', 'STOOP SALE', 'GUITAR', 'STREET FAIR', 'FOUND KEY']);
  });

  it('the slips are deterministic — the same day, the same paper', () => {
    for (const day of [1, 2, 3, 4, 5, 6, 9]) {
      expect(flyerSlipForDay(day)).toBe(flyerSlipForDay(day));
    }
  });

  it('beyond the authored set the board cycles, never invents', () => {
    const pool = Object.keys(FLYER_SLIPS).map(Number);
    const day6 = flyerSlipForDay(6);
    expect(pool).toContain(Number(Object.keys(FLYER_SLIPS).find((k) => FLYER_SLIPS[Number(k)] === day6)));
    expect(day6.title.length).toBeGreaterThan(0);
  });

  it('every slip is short enough to read at a glance (the 1-Second Law)', () => {
    for (const slip of Object.values(FLYER_SLIPS)) {
      expect(slip.title.length).toBeLessThanOrEqual(12);
      expect(slip.lines.length).toBeLessThanOrEqual(3);
      for (const line of slip.lines) expect(line.length).toBeLessThanOrEqual(22);
    }
  });
});

// ------------------------------------------------------------ window diary ----

describe('the window lights vary by day, never by whim (Doc 33 §2.3)', () => {
  it('Day 1: the block is dark except the story windows', () => {
    const p = ambientWindowPlan(1);
    expect(p.lateHome).toBe(0);
    expect(p.newFace).toBe(0);
    expect(p.earlyRiser).toBe(0);
  });

  it('Day 2: someone got home late and never turned the light off', () => {
    const p = ambientWindowPlan(2);
    expect(p.lateHome).toBe(AMBIENT_WARMTH.lateHome);
    expect(p.newFace).toBe(0);
    expect(p.earlyRiser).toBe(0);
  });

  it('Day 3: the late one is gone to work; someone new moved in', () => {
    const p = ambientWindowPlan(3);
    expect(p.lateHome).toBe(0);
    expect(p.newFace).toBe(AMBIENT_WARMTH.newFace);
    expect(p.earlyRiser).toBe(0);
  });

  it('Day 4: the early riser is up before the rush; the new flat stays lit', () => {
    const p = ambientWindowPlan(4);
    expect(p.lateHome).toBe(0); // away — the window keeps its own counsel
    expect(p.newFace).toBe(AMBIENT_WARMTH.newFace);
    expect(p.earlyRiser).toBe(AMBIENT_WARMTH.earlyRiser);
  });

  it('the plan is deterministic and total for any day', () => {
    for (const day of [-1, 0, 1, 2, 3, 4, 5, 99]) {
      const p = ambientWindowPlan(day);
      expect(Number.isFinite(p.lateHome)).toBe(true);
      expect(Number.isFinite(p.newFace)).toBe(true);
      expect(Number.isFinite(p.earlyRiser)).toBe(true);
    }
  });
});

// ----------------------------------------------------------- barrier diary ----

describe('the barrier repairs itself the way blocks do (Doc 33 §2.3)', () => {
  it('Days 1–3: the barrier guards its water main; no patch yet', () => {
    for (const day of [1, 2, 3]) {
      const d = barrierDiary(day);
      expect(d.barrierVisible).toBe(true);
      expect(d.patchVisible).toBe(false);
    }
  });

  it('Day 4: gone — leaving fresh asphalt', () => {
    const d = barrierDiary(4);
    expect(d.barrierVisible).toBe(false);
    expect(d.patchVisible).toBe(true);
  });

  it('a Day-5 future keeps the repair (nothing un-repairs)', () => {
    expect(barrierDiary(5).patchVisible).toBe(true);
    expect(barrierDiary(5).barrierVisible).toBe(false);
  });
});

// --------------------------------------------------------- the familiar face ----

describe('the familiar face (Doc 33 §2.2): pass → nod → word', () => {
  it('Day 1: absent — the street hasn\u2019t met her yet', () => {
    expect(familiarBeatForDay(1)).toBe('absent');
  });

  it('Day 2: a pass, no note — you may not even notice her', () => {
    expect(familiarBeatForDay(2)).toBe('pass');
  });

  it('Day 3: the nod passing the cart, then the bench', () => {
    expect(familiarBeatForDay(3)).toBe('nod');
  });

  it('Day 4: she crosses back during the wash and spends one word', () => {
    expect(familiarBeatForDay(4)).toBe('word');
  });

  it('she never hurries — a walk, not a system', () => {
    expect(FAMILIAR_SPEED).toBeLessThanOrEqual(1.8);
  });
});

// ------------------------------------------------------- the remembered favor ----

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

function brewAll(s: GameState, count: number): void {
  for (let i = 0; i < count; i++) {
    s.startBrew();
    s.completeBrew();
  }
}

describe('the remembered favor (Doc 33 §4.2): Day 3\u2019s first cup', () => {
  it('Day 3, the kid kept: Idris speaks the favor instead of the stock line', () => {
    const s = day2Done();
    s.day = 3;
    s.setStep(Step.D3_WAKE);
    s.rosaD3Wake(); // → D3_RUSH, Idris first
    const fx = (() => { s.startBrew(); return s.completeBrew(); })();
    const note = fx.find((e) => e.kind === 'note');
    expect(note && 'text' in note && note.text).toBe(IDRIS_D3_FAVOR_REACTION);
    expect(IDRIS_D3_FAVOR_REACTION).toContain('You did right by the kid');
  });

  it('Day 3, the kid NOT kept (an honest save): the stock line stands', () => {
    const s = day2Done();
    s.kidKept = false;
    s.day = 3;
    s.setStep(Step.D3_WAKE);
    s.rosaD3Wake();
    s.startBrew();
    const fx = s.completeBrew();
    const note = fx.find((e) => e.kind === 'note');
    expect(note && 'text' in note && note.text).toBe(D3_ORDERS[0].reaction);
  });

  it('Day 4\u2019s morning rush keeps its own line — the favor lands once', () => {
    const s = day2Done(123);
    s.day = 4;
    s.setStep(Step.D4_WAKE);
    s.rosaD4Wake();       // → D4_STRANGER
    s.greetStranger();    // → D4_RUSH
    s.startBrew();
    const fx = s.completeBrew();
    const note = fx.find((e) => e.kind === 'note');
    expect(note && 'text' in note && note.text).toBe(D4_ORDERS[0].reaction);
    expect(note && 'text' in note && note.text).toContain('Fourth day');
  });

  it('the favor buys nothing and costs nothing — money math untouched', () => {
    const s = day2Done(111);
    s.day = 3;
    s.setStep(Step.D3_WAKE);
    s.rosaD3Wake();
    brewAll(s, 4);
    // $111 + 3 + 8 + 4 + 4 = $130 — the Day-3 canon
    expect(s.money).toBe(130);
    expect(s.step).toBe(Step.D3_KIDDOWN);
  });
});

// ---------------------------------------------------- Rosa\u2019s shorthand rung ----

describe('Rosa\u2019s four-mornings line (Doc 33 §4.1): the ladder\u2019s top rung', () => {
  function day4PostMap(): GameState {
    const s = day2Done(123);
    s.day = 4;
    s.mapGiven = true;
    s.strangerMet = true;
    s.rosaChatI = 0;
    s.setStep(Step.D4_MAP); // the handoff moment — Rosa still within reach
    return s;
  }

  function chat(s: GameState): string {
    const { effects } = s.rosaTask();
    const note = effects.find((e) => e.kind === 'note');
    return note && 'text' in note ? note.text : '';
  }

  it('the FIRST chat after the Map changed hands is the shorthand', () => {
    const s = day4PostMap();
    expect(chat(s)).toBe(ROSA_FOUR_MORNINGS_NOTE);
  });

  it('it lands once, ever — then the authored rotation holds', () => {
    const s = day4PostMap();
    expect(chat(s)).toBe(ROSA_FOUR_MORNINGS_NOTE);     // shorthand first
    expect(chat(s)).toContain('Four windows');         // the rotation, unshuffled
    expect(chat(s)).toContain('She\u2019ll be back Tuesday');
    expect(chat(s)).toContain('Sal washed your apron');
    expect(chat(s)).not.toBe(ROSA_FOUR_MORNINGS_NOTE); // never again
  });

  it('the marker is transient session state — never written to a save', () => {
    const s = day4PostMap();
    chat(s);
    const snap = s.snapshotForSave();
    expect(snap && 'fourMorningsSaid' in snap).toBe(false);
    expect(snap && 'rosaChatI' in snap).toBe(false);
  });

  it('before the Map changes hands, the morning has its own priorities', () => {
    const s = day4PostMap();
    s.mapGiven = false;
    s.strangerMet = false;
    expect(chat(s)).toContain('Terminal');
  });
});

// --------------------------------------------------------- postcard memory ----

describe('the caption learns the day\u2019s small truths (Doc 33 §5.1)', () => {
  const base = { day: 2, replay: false, dayStartMoney: 112, money: 111, cartName: 'First Slice' };

  it('calls that omit the awning compose byte-identically to the classic text', () => {
    const classic =
      `Day 2. $112 \u2192 $111.\n` +
      'Met: the kid. The corner knows you back now.\n' +
      'The regulars are waiting.\n\n' +
      '\u2014 First Slice, Day 2';
    expect(composeCaption(base)).toBe(classic);
  });

  it('Day 2 without an awning: one kind line — no guilt', () => {
    const text = composeCaption({ ...base, awningUp: false });
    expect(text).toContain('No awning yet. The corner didn\u2019t mind.');
    expect(text).toContain('The regulars are waiting.');
  });

  it('Day 2 with the awning: no line — shade needs no footnote', () => {
    expect(composeCaption({ ...base, awningUp: true })).toBe(composeCaption(base));
  });

  it('other days don\u2019t read the flag (Day 1 stays Day 1)', () => {
    const d1 = { day: 1, replay: false, dayStartMoney: 87, money: 112, cartName: 'X' };
    expect(composeCaption({ ...d1, awningUp: false })).toBe(composeCaption(d1));
  });
});
