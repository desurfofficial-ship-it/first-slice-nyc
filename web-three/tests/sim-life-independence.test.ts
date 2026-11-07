/**
 * sim/life — the majors' off-screen lives (narrative/14 R5, §7 step 4;
 * doc 07 §7's tick spec + §2's binding "without Leo" defaults).
 *
 * The laws as tests (doc 14 §6's testing law — every narrative rule is a
 * test): the R5 acceptance (ignoring the protagonist for a chapter
 * changes majors' states in DOCUMENTED directions), the binding-default
 * law, the no-transplant law, determinism from save, the one-decision-
 * per-chapter law, the never-rewinds law, the recovery path, and the
 * v1-safe save ride (the chapter+rails law at world scale).
 */
import { describe, it, expect } from 'vitest';
import {
  MAJORS, MAJOR_IDS, freshLifeState, parseLifeState, tickLife,
  validateMajors, MOOD_TRANSITIONS,
  type LifeState,
} from '../src/sim/life';
import { calendarOf, dayOfCanonDate } from '../src/sim/clock';
import { CHAPTER_ORDER, chapterAtDay } from '../src/core/chapters';
import { createWorldState, snapshotWorld, parseWorldSave, OWNERSHIP } from '../src/sim/state';

/** The chapter mapper the world binding uses (core/chapters → number). */
const chapterForDay = (day: number): number => CHAPTER_ORDER.indexOf(chapterAtDay(day));

/** Tick a fresh life from the canon epoch to the given canon date. */
function tickToDate(life: LifeState, date: { y: number; m: number; d: number }, greetedTicks: Record<string, number | undefined> = {}) {
  return tickLife(life, { toDay: dayOfCanonDate(date), chapterForDay, greetedTicks });
}

describe('life · the authored data (doc 07 as frozen tables)', () => {
  it('the 16 majors, ids unique, every entry cited', () => {
    expect(MAJORS.length).toBe(16);
    expect(validateMajors()).toEqual([]);
    expect(new Set(MAJOR_IDS).size).toBe(16);
  });

  it('dayOfCanonDate is the exact inverse of calendarOf (one month table)', () => {
    for (let day = 1; day <= 1500; day += 7) {
      const c = calendarOf(day);
      expect(dayOfCanonDate({ y: c.year, m: c.month, d: c.dayOfMonth })).toBe(day);
    }
    // the canon anchors: the epoch and Doris's Sept 14
    expect(dayOfCanonDate({ y: 1, m: 9, d: 9 })).toBe(1);
    expect(calendarOf(dayOfCanonDate({ y: 3, m: 9, d: 14 }))).toMatchObject({ year: 3, month: 9, dayOfMonth: 14 });
  });

  it('the recovery law: bitter is not absorbing — the graph walks back', () => {
    expect(MOOD_TRANSITIONS.bitter).toContain('steady');
    expect(MOOD_TRANSITIONS.strained).toContain('steady');
    // and the authored data DEMONSTRATES recovery (Eddie C4, Deshaun C4)
    const eddie = MAJORS.find((m) => m.id === 'eddie_carrasco')!;
    expect(eddie.moodRules.some((r) => r.chapter === 4 && r.mood === 'steady')).toBe(true);
    const deshaun = MAJORS.find((m) => m.id === 'deshaun_carter')!;
    expect(deshaun.moodRules.some((r) => r.chapter === 4 && r.mood === 'steady')).toBe(true);
  });
});

describe('life · THE R5 ACCEPTANCE — the ignore-spine world', () => {
  /** No greetings at all: the player never engaged anyone. */
  const nobody: Record<string, number | undefined> = {};

  it('ignoring the protagonist changes majors in DOCUMENTED directions (doc 07 §2)', () => {
    const { life } = tickToDate(freshLifeState(), { y: 3, m: 11, d: 26 }, nobody); // C5's end
    const decOf = (id: string, chapter: number) =>
      life.majors[id].decisions.find((d) => d.chapter === chapter);

    // Yoli C2 — "The Compact dies in C2 of Craig's refusal" (§2.3)
    expect(decOf('yolanda_ferreira', 2)?.via).toBe('default');
    expect(decOf('yolanda_ferreira', 2)?.variant).toContain('Compact dies');
    // Craig C2 — "sells the row in C2, faster and sloppier" (§2.9)
    expect(decOf('craig_hollis', 2)?.via).toBe('default');
    expect(decOf('craig_hollis', 2)?.variant).toContain('sells the row in C2');
    // Eddie C3 — "loses the shop in C3, sells the name" (§2.1)
    expect(decOf('eddie_carrasco', 3)?.via).toBe('default');
    expect(decOf('eddie_carrasco', 3)?.variant).toContain('loses the shop');
    // Deshaun C3 — "passes the exam the first time" (§2.12)
    expect(decOf('deshaun_carter', 3)?.via).toBe('default');
    expect(decOf('deshaun_carter', 3)?.variant).toContain('passes the paramedic exam the first time');
    // Deniz C5 — "publishes Craig's paper trail instead" (§2.14)
    expect(decOf('deniz_oktay', 5)?.via).toBe('default');
    expect(decOf('deniz_oktay', 5)?.variant).toContain('Craig');
    // Rachel C4 — "never appears" (§2.15)
    expect(decOf('rachel_voss', 4)?.via).toBe('default');
    // Kev C5 — "gets the certified course on his own, and is fine" (§2.4)
    expect(decOf('kevin_okafor', 5)?.via).toBe('default');

    // Doris's passing — on her own clock, unrelated to Leo (§2.10, the
    // City-Moves Law's heaviest demonstration): a calendar note at
    // Sept 14 Y3 + withdrawn, on BOTH paths.
    const dorisDay = dayOfCanonDate({ y: 3, m: 9, d: 14 });
    const note = life.majors['doris_hollis'].notes.find((n) => n.day === dorisDay);
    expect(note?.detail).toContain('dies Sept 14');
    expect(life.majors['doris_hollis'].availability).toBe('withdrawn');
  });

  it('the engagement flip: greetings select the documented with-Leo variants', () => {
    // Leo greets Eddie on day 2, Yoli/Kev/Deshaun in C1 — before their
    // branch chapters begin.
    const greeted: Record<string, number | undefined> = {
      eddie_carrasco: dayEndTick(2),
      yolanda_ferreira: dayEndTick(dayOfCanonDate({ y: 1, m: 10, d: 1 })),
      kevin_okafor: dayEndTick(dayOfCanonDate({ y: 1, m: 10, d: 1 })),
      deshaun_carter: dayEndTick(dayOfCanonDate({ y: 1, m: 10, d: 1 })),
    };
    const { life } = tickToDate(freshLifeState(), { y: 3, m: 11, d: 26 }, greeted);
    const decOf = (id: string, chapter: number) =>
      life.majors[id].decisions.find((d) => d.chapter === chapter);

    // Eddie C3 — the heart attack path, not the shop loss (§2.1)
    expect(decOf('eddie_carrasco', 3)?.via).toBe('engaged');
    expect(decOf('eddie_carrasco', 3)?.variant).toContain('heart attack');
    // Yoli C2 — builds the Compact, broken with Leo's hand (§2.3)
    expect(decOf('yolanda_ferreira', 2)?.via).toBe('engaged');
    // Deshaun C3 — fails the exam (the one Leo-shaped dent, §2.12)
    expect(decOf('deshaun_carter', 3)?.variant).toContain('fails the paramedic exam');
    // Kev C5 — the receipts handover, not the certification (§2.4)
    expect(decOf('kevin_okafor', 5)?.variant).toContain('receipts handover');

    // The mood machine ran the authored rules: Eddie strained at C3,
    // RECOVERED to steady at C4 (the counter rhythm); Deshaun strained
    // at C3, recovered at C4 (the pinning).
    expect(life.majors['eddie_carrasco'].mood).toBe('steady');
    expect(life.majors['eddie_carrasco'].notes.some((n) => n.kind === 'mood' && n.detail.startsWith('strained'))).toBe(true);
    expect(life.majors['deshaun_carter'].mood).toBe('steady');
    // Eddie's heart attack calendar event fired at Jul 6 Y2 and HELD him.
    const haDay = dayOfCanonDate({ y: 2, m: 7, d: 6 });
    expect(life.majors['eddie_carrasco'].notes.some((n) => n.day === haDay && n.detail === 'the heart attack')).toBe(true);
  });

  it('the branch keys on engagement at the chapter\u2019s first simulated day', () => {
    // Greet Yoli the day AFTER C2 opens: C2's decision already fired on
    // the default path — the machine is honest about its granularity
    // (the content waves' scenes carry the mid-chapter beats).
    const c2First = dayOfCanonDate({ y: 2, m: 1, d: 6 });
    const late = tickToDate(freshLifeState(), { y: 2, m: 6, d: 30 }, { yolanda_ferreira: dayEndTick(c2First + 1) });
    expect(late.life.majors['yolanda_ferreira'].decisions.find((d) => d.chapter === 2)?.via).toBe('default');
    // Greet her ON C2's first day: the engaged branch fires.
    const early = tickToDate(freshLifeState(), { y: 2, m: 6, d: 30 }, { yolanda_ferreira: dayEndTick(c2First) });
    expect(early.life.majors['yolanda_ferreira'].decisions.find((d) => d.chapter === 2)?.via).toBe('engaged');
  });
});

describe('life · the machine laws', () => {
  it('the no-transplant law: no authored rule, no mood move (Rosa, the whole span)', () => {
    const greeted: Record<string, number | undefined> = {};
    for (const id of MAJOR_IDS) greeted[id] = 100; // everyone greeted early
    const { life } = tickToDate(freshLifeState(), { y: 3, m: 11, d: 26 }, greeted);
    expect(life.majors['rosa_delgado'].mood).toBe('steady');
    expect(life.majors['rosa_delgado'].notes.filter((n) => n.kind === 'mood')).toEqual([]);
    // her decisions still fired (she is nearly Leo-independent by design)
    expect(life.majors['rosa_delgado'].decisions.length).toBeGreaterThan(0);
  });

  it('one independent decision per chapter — a re-tick adds nothing (idempotent)', () => {
    const first = tickToDate(freshLifeState(), { y: 2, m: 6, d: 30 });
    const again = tickLife(first.life, { toDay: dayOfCanonDate({ y: 2, m: 6, d: 30 }), chapterForDay, greetedTicks: {} });
    expect(again.events).toEqual([]);
    expect(again.life.majors['yolanda_ferreira'].decisions.length)
      .toBe(first.life.majors['yolanda_ferreira'].decisions.length);
  });

  it('never rewinds: a smaller toDay is a no-op (the calendar never negotiates)', () => {
    const t = tickToDate(freshLifeState(), { y: 1, m: 12, d: 23 });
    const back = tickLife(t.life, { toDay: 5, chapterForDay, greetedTicks: {} });
    expect(back.life).toBe(t.life);
    expect(back.events).toEqual([]);
  });

  it('a one-shot span equals day-by-day ticks (catch-up ≡ step)', () => {
    const to = dayOfCanonDate({ y: 1, m: 12, d: 23 });
    const once = tickLife(freshLifeState(), { toDay: to, chapterForDay, greetedTicks: {} });
    let stepwise = freshLifeState();
    for (let day = 1; day <= to; day++) {
      stepwise = tickLife(stepwise, { toDay: day, chapterForDay, greetedTicks: {} }).life;
    }
    expect(JSON.stringify(once.life)).toBe(JSON.stringify(stepwise));
  });

  it('determinism from save: same inputs, byte-identical state', () => {
    const a = tickToDate(freshLifeState(), { y: 3, m: 11, d: 26 }, { eddie_carrasco: 2000 });
    const b = tickToDate(freshLifeState(), { y: 3, m: 11, d: 26 }, { eddie_carrasco: 2000 });
    expect(JSON.stringify(a.life)).toBe(JSON.stringify(b.life));
  });
});

describe('life · the world-save ride (v1-safe, the chapter+rails law at world scale)', () => {
  it('the world carries life; OWNERSHIP covers the section', () => {
    const w = createWorldState();
    expect(w.life.lastTickDay).toBe(0);
    expect(OWNERSHIP.some((o) => o.section === 'life')).toBe(true);
  });

  it('snapshot → parse preserves a ticked life; absent parses fresh; corrupt quarantines', () => {
    const w = createWorldState();
    w.life = tickToDate(w.life, { y: 2, m: 1, d: 6 }).life;
    const doc = snapshotWorld(w);
    const round = parseWorldSave(JSON.stringify(doc));
    expect(round.source).toBe('restored');
    expect(JSON.stringify(round.world.life)).toBe(JSON.stringify(w.life));

    // an OLD save (pre-R5) has no life field: fresh, heals forward
    const old = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
    delete old.life;
    const healed = parseWorldSave(JSON.stringify(old));
    expect(healed.world.life.lastTickDay).toBe(0);

    // corrupt: quarantines to fresh, never crashes
    const bad = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
    bad.life = { lastTickDay: 'not-a-number', majors: 42 };
    const quarantined = parseWorldSave(JSON.stringify(bad));
    expect(quarantined.world.life.lastTickDay).toBe(0);
  });

  it('parseLifeState shape-checks entries instead of trusting them', () => {
    const { life } = parseLifeState({
      lastTickDay: 400,
      majors: {
        eddie_carrasco: {
          mood: 'bogus', availability: 'sentinel', lastDay: 'x',
          decisions: [{ chapter: 2, variant: 'kept', via: 'engaged', day: 100 }, 'garbage'],
          notes: [{ day: 5, kind: 'mood', detail: 'kept' }, { day: 'x' }],
        },
        unknown_major: { mood: 'bitter' },
      },
    });
    const eddie = life.majors['eddie_carrasco'];
    expect(eddie.mood).toBe('steady');            // bogus → default
    expect(eddie.availability).toBe('available'); // bogus → default
    expect(eddie.lastDay).toBe(0);                // non-number → default
    expect(eddie.decisions).toEqual([{ chapter: 2, variant: 'kept', via: 'engaged', day: 100 }]);
    expect(eddie.notes).toEqual([{ day: 5, kind: 'mood', detail: 'kept' }]);
    expect(life.majors['unknown_major']).toBeUndefined(); // majors are the 16, nothing else
    expect(life.lastTickDay).toBe(400);           // the watermark survives
  });
});

/** Day → its tick-exclusive end (the clock's law: day D covers
 *  [(D-1)*1440, D*1440); a flag set during day D counts from D). */
function dayEndTick(day: number): number { return day * 1440 - 1; }
