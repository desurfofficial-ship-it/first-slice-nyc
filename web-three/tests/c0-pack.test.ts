/**
 * The C0 content pack (narrative/14 §7 step 6 — core/c0Pack.ts + the
 * GameState seam + the interaction defs).
 *
 * Doc 11's narrative layer over the shipped opening. The load-bearing
 * laws, each pinned:
 *   1. **Doc quotes are verbatim.** Every line doc 11 quotes lands
 *      byte-for-byte — the covenant, the lease notice, the surveyor, the
 *      listing, Deshaun's sit line, the Sam exchange, Rosa's mango line,
 *      the nod, the mishear, the wobble, the cold-open prompts.
 *   2. **The diary ladder rides the one seam** — five entries, stable ids,
 *      the schema's own guards (append-only, capped, dated from the
 *      calendar).
 *   3. **The tag system's one authored break is Entry 3** — the mishear
 *      ships tagged FACT on purpose; C1's strike has its target.
 *   4. **Every beat lands once** — the latches are idempotent; a repeat
 *      call is an echo, never a second page.
 *   5. **The save survives** — round-trip restores the latches; a save
 *      that never met the pack serializes undefined; an old save parses
 *      fresh. Corrupt shapes quarantine, never crash.
 *   6. **Doc 11 §6's bans hold** — no Corvus, no crime/conspiracy words
 *      anywhere in the pack's player-facing strings.
 *   7. **The gates are honest** — Eddie from Day 2, Odessa from Day 5,
 *      Deshaun on Day 2 midday, the surveyor at dawn (clock-backed),
 *      the cold open on Day 1, the wobble on/after Day 7 near the
 *      laundromat.
 */

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/core/GameState';
import {
  COLD_OPEN_PROMPTS, COLD_OPEN_SYSTEM_LINE, DESHAUN_SIT_LINE,
  EDDIE_COVENANT, EDDIE_LEASE_LINE, EDDIE_LISTING, ENTRY2_OPTIONS,
  ENTRY2_PROMPT, ENTRY4_OPTIONS, ENTRY5_WOBBLE,
  ODESSA_NOD, ROSA_MANGO_LINE, ROSA_REGULAR_LINE, SAM_LAW_LINE,
  SAM_STILL_DOING_LINE, SURVEYOR_DIARY_GUESS, SURVEYOR_LINE,
  coldOpenBody, freshC0Latches, parseC0Latches, questionBody,
  serializeC0Latches,
} from '../src/core/c0Pack';
import { parseSave } from '../src/core/Save';
import { dateOfCalendarDay } from '../src/core/calendar';
import { freeRoamInteractions } from '../src/game/interactionDefs';
import type { Interaction } from '../src/game/interactions';

function byId(defs: Interaction[], id: string): Interaction {
  const d = defs.find((x) => x.id === id);
  if (!d) throw new Error(`missing interaction: ${id}`);
  return d;
}

const NO_SOURCES = {
  rosa: () => ({ x: 0, y: 0, z: 0 }),
  idris: () => ({ x: 0, y: 0, z: 0 }),
  kid: () => ({ x: 0, y: 0, z: 0 }),
  stranger: () => ({ x: 0, y: 0, z: 0 }),
  cart: () => ({ x: 0, y: 0, z: 0 }),
  shelfItem: () => ({ x: 999, y: 0, z: 999 }),
} as const;

/** A ctx stub — the C0 defs only read `state` and (for the clock gates)
 *  `game.worldSim`, so a cast-stub carries the tests. */
function ctxOf(state: GameState, phase?: string) {
  return {
    state,
    game: {
      worldSim: phase === undefined
        ? undefined
        : { brain: { clock: { phase } } },
    },
  } as unknown as Parameters<Interaction['perform']>[0];
}

describe('C0 pack — doc 11 verbatim lines (law 1)', () => {
  it('the covenant is six words, verbatim', () => {
    expect(EDDIE_COVENANT).toBe('Eat standing up. That\u2019s the job.');
  });

  it('the lease notice is verbatim', () => {
    expect(EDDIE_LEASE_LINE).toBe('Paper\u2019s just paper till it isn\u2019t.');
  });

  it('the surveyor\u2019s line is verbatim', () => {
    expect(SURVEYOR_LINE).toBe(
      'Surveyor: \u201CLight studies. Sunlight\u2019s a legal requirement. Square feet before feelings.\u201D',
    );
  });

  it('the surveyor\u2019s GUESS is the doc\u2019s seed', () => {
    expect(SURVEYOR_DIARY_GUESS).toBe('He\u2019s watching someone.');
  });

  it('the listing is verbatim', () => {
    expect(EDDIE_LISTING).toBe(
      'CORNER SLICE \u2014 counter help, will train. Room to let upstairs. Ask for Eddie.',
    );
  });

  it('Deshaun\u2019s sit line is verbatim', () => {
    expect(DESHAUN_SIT_LINE).toBe(
      'Deshaun: \u201CYou\u2019re not dying. You\u2019re new. Same symptoms. Sit. Five things with edges. Go.\u201D',
    );
  });

  it('the Sam exchange is verbatim', () => {
    expect(SAM_STILL_DOING_LINE).toBe('Sam: \u201CPeople here just\u2026 do that?\u201D');
    expect(SAM_LAW_LINE).toBe('Apparently it\u2019s a law.');
  });

  it('Rosa\u2019s mango line and the regular\u2019s line are verbatim', () => {
    expect(ROSA_MANGO_LINE).toBe(
      'Rosa: \u201CHe\u2019s not mine yet. He\u2019s Eddie\u2019s listing. Somebody\u2019s always Eddie\u2019s.\u201D',
    );
    expect(ROSA_REGULAR_LINE).toBe(
      'Regular at the counter, nodding at Leo: \u201CYou\u2019re new. Rosa trains \u2018em right though. You\u2019ll do fine.\u201D',
    );
  });

  it('the nod is one word', () => {
    expect(ODESSA_NOD).toBe('Odessa: \u201CMorning.\u201D');
  });

  it('the cold open\u2019s prompts and system line are verbatim', () => {
    expect(COLD_OPEN_SYSTEM_LINE).toBe('Day 1. Facts only.');
    expect(COLD_OPEN_PROMPTS).toEqual(['New York, day one.', 'I\u2019m the smart one.']);
  });

  it('Entry 2\u2019s prompt is verbatim; three Leo-voice options follow it', () => {
    expect(ENTRY2_PROMPT).toBe('What kind of place gives away the first slice?');
    expect(ENTRY2_OPTIONS).toHaveLength(3);
    for (const o of ENTRY2_OPTIONS) expect(o.length).toBeGreaterThan(0);
  });

  it('Entry 4 offers three authored curiosities (the doc\u2019s three seeds)', () => {
    expect(ENTRY4_OPTIONS).toHaveLength(3);
    expect(ENTRY4_OPTIONS[1]).toContain('The Works has a new lock');
    expect(ENTRY4_OPTIONS[2]).toContain('Odessa');
    expect(ENTRY4_OPTIONS[2]).toContain('two jobs');
  });
});

describe('C0 pack — the diary ladder (law 2)', () => {
  it('Entry 1: the cold open writes the player\u2019s line on Day 1 only', () => {
    const s = new GameState();
    const out = s.c0ColdOpen(0);
    expect(s.c0.coldOpen).toBe(true);
    expect(s.fieldDiary).toHaveLength(1);
    expect(s.fieldDiary[0].body).toBe('New York, day one.');
    expect(s.fieldDiary[0].epistemic).toBe('FACT');
    expect(s.fieldDiary[0].date).toEqual(dateOfCalendarDay(1));
    expect(out.some((e) => e.kind === 'diary-ink')).toBe(true);
    // the day gate: a Day-2 state cannot write Entry 1
    const late = new GameState();
    late.day = 2;
    expect(late.c0ColdOpen(0)).toEqual([]);
    expect(late.fieldDiary).toHaveLength(0);
  });

  it('Entry 2: the covenant opens the theory card; the reply becomes the running theory', () => {
    const s = new GameState();
    s.day = 2;
    const out = s.c0Covenant();
    expect(s.pendingCard?.id).toBe('c0_theory');
    expect(s.c0.covenant).toBe(true);
    expect(out[0]).toEqual({
      kind: 'note',
      text: 'Eddie: \u201CEat standing up. That\u2019s the job.\u201D',
    });
    // the reply routes through chooseReply — the pack's one router: the
    // chosen line shows as the card's response, the ink lands, the fold
    // waits for the next press (the shipped order-card UX, one law)
    const effects = s.chooseReply(1);
    expect(s.c0.theory).toBe(ENTRY2_OPTIONS[1]);
    expect(s.fieldDiary.some((e) => e.id === 'c0-e2' && e.body === ENTRY2_OPTIONS[1])).toBe(true);
    expect(effects[0]).toEqual({ kind: 'order-respond', text: ENTRY2_OPTIONS[1] });
    expect(effects.some((e) => e.kind === 'diary-ink')).toBe(true);
    expect(s.orderResponded).toBe(true);
    // the next press folds (the conversation's one law)
    expect(s.chooseReply(-1)).toEqual([{ kind: 'order-close' }]);
    expect(s.pendingCard).toBeNull();
  });

  it('Entry 3: the handover mishear ships tagged FACT — the tutorial\u2019s last lesson (law 3)', () => {
    const s = new GameState();
    s.day = 1;
    s.c0HandoverFact();
    const e = s.fieldDiary.find((x) => x.id === 'c0-e3');
    expect(e).toBeDefined();
    expect(e!.epistemic).toBe('FACT');
    expect(e!.body).toBe('Rosa gave me the cart.');
    // the strike target C1 will claim: the body's bytes are frozen
    expect(e!.corrections).toEqual([]);
  });

  it('Entry 4: the night question card writes the chosen curiosity', () => {
    const s = new GameState();
    s.day = 3;
    s.c0OpenQuestionCard();
    expect(s.pendingCard?.id).toBe('c0_question');
    s.chooseReply(2);
    expect(s.c0.question).toBe(ENTRY4_OPTIONS[2]);
    const e = s.fieldDiary.find((x) => x.id === 'c0-e4');
    expect(e?.kind).toBe('QUESTION');
    expect(e?.epistemic).toBe('GUESS');
  });

  it('Entry 4: the free write lands the player\u2019s own line; empty falls back (law 2)', () => {
    expect(questionBody(3, '  Why is the plaza clock two minutes slow?  '))
      .toBe('Why is the plaza clock two minutes slow?');
    expect(questionBody(3, '   ')).toBe(ENTRY4_OPTIONS[0]);
    expect(coldOpenBody(2, '  Dear New York: you\u2019re loud.  '))
      .toBe('Dear New York: you\u2019re loud.');
    expect(coldOpenBody(2, '')).toBe(COLD_OPEN_PROMPTS[0]);
  });

  it('Entry 5: the wobble is RECALL/RECALL, gated to Day 7+', () => {
    const s = new GameState();
    s.day = 5;
    expect(s.c0Wobble()).toEqual([]); // too early — the fuse waits
    s.day = 7;
    s.c0Wobble();
    const e = s.fieldDiary.find((x) => x.id === 'c0-e5');
    expect(e?.kind).toBe('RECALL');
    expect(e?.epistemic).toBe('RECALL');
    // three lines max (doc 11 §3)
    expect(ENTRY5_WOBBLE.split('\n').length).toBeLessThanOrEqual(3);
    expect(ENTRY5_WOBBLE).toContain('motel hum');
  });
});

describe('C0 pack — every beat lands once (law 4)', () => {
  it('the cold open never re-writes', () => {
    const s = new GameState();
    s.c0ColdOpen(0);
    s.c0ColdOpen(1);
    expect(s.fieldDiary).toHaveLength(1);
    expect(s.fieldDiary[0].body).toBe('New York, day one.');
  });

  it('the hooks echo after their first line', () => {
    const s = new GameState();
    const first = s.c0Lease();
    expect(first[0]).toEqual({ kind: 'note', text: 'Eddie: \u201CPaper\u2019s just paper till it isn\u2019t.\u201D' });
    const again = s.c0Lease();
    expect(again[0].kind).toBe('note');
    expect((again[0] as { text: string }).text).not.toContain('till it isn\u2019t');
    // the surveyor writes the GUESS once
    s.day = 1;
    s.c0Surveyor();
    const guess = s.fieldDiary.filter((x) => x.id === 'c0-h2');
    expect(guess).toHaveLength(1);
    expect(guess[0].epistemic).toBe('GUESS');
    const echo = s.c0Surveyor();
    expect(echo.some((e) => e.kind === 'diary-ink')).toBe(false);
    // Odessa: the nod twice, the entry once
    s.c0Odessa();
    s.c0Odessa();
    expect(s.fieldDiary.filter((x) => x.id === 'c0-h3')).toHaveLength(1);
    // Deshaun: the kit once, the echo after
    const kit = s.c0Deshaun();
    expect(kit.filter((e) => e.kind === 'note')).toHaveLength(4); // sit + 3 kit lines
    s.c0Deshaun();
    expect(s.fieldDiary.filter((x) => x.id === 'c0-g1')).toHaveLength(1);
  });

  it('the handover FACT writes once even across two calls', () => {
    const s = new GameState();
    s.c0HandoverFact();
    s.c0HandoverFact();
    expect(s.fieldDiary.filter((x) => x.id === 'c0-e3')).toHaveLength(1);
  });
});

describe('C0 pack — the save survives (law 5)', () => {
  it('a fresh state serializes undefined — the byte-identical old save', () => {
    expect(serializeC0Latches(freshC0Latches())).toBeUndefined();
    const s = new GameState();
    s.day = 2; // day 1 never writes (the save.gd law)
    expect(s.snapshotForSave()!['c0']).toBeUndefined();
  });

  it('the latches round-trip: serialize → parse → materialized', () => {
    const s = new GameState();
    s.day = 1; // the beats are Day-1 gates — write them in season
    s.c0ColdOpen(1);
    s.c0HandoverFact();
    s.c0.theory = ENTRY2_OPTIONS[0];
    s.c0.question = ENTRY4_OPTIONS[2];
    s.day = 2; // day 1 never writes (the save.gd law) — the snapshot is Day-2
    const blob = s.snapshotForSave()!['c0'];
    const restored = parseC0Latches(JSON.parse(JSON.stringify(blob)));
    expect(restored.coldOpen).toBe(true);
    expect(restored.handover).toBe(true);
    expect(restored.theory).toBe(ENTRY2_OPTIONS[0]);
    expect(restored.question).toBe(ENTRY4_OPTIONS[2]);
    expect(restored.wobble).toBe(false);
  });

  it('an old save (no c0 key) parses fresh; corrupt shapes quarantine', () => {
    const old = parseSave(JSON.stringify({ day: 2, money: 97 }));
    expect(old.c0?.coldOpen ?? false).toBe(false);
    expect(old.c0?.theory ?? null).toBeNull();
    expect(parseC0Latches('garbage')).toEqual(freshC0Latches());
    expect(parseC0Latches(42)).toEqual(freshC0Latches());
    expect(parseC0Latches(null)).toEqual(freshC0Latches());
    // an over-long theory string quarantines to null
    expect(parseC0Latches({ theory: 'x'.repeat(500) }).theory).toBeNull();
  });
});

describe('C0 pack — doc 11 §6\u2019s bans hold (law 6)', () => {
  it('no Corvus, no crime, no conspiracy in the pack\u2019s player-facing strings', () => {
    const pack = require('fs').readFileSync('src/core/c0Pack.ts', 'utf8');
    // every string literal the pack carries — the crude but honest net:
    // grep the whole module for the banned words OUTSIDE comments
    const code = pack
      .split('\n')
      .filter((l: string) => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*'))
      .join('\n');
    for (const word of ['Corvus', 'corvus', 'conspir', 'crime', 'criminal', 'ominous', 'flashback']) {
      expect(code).not.toContain(word);
    }
  });
});

describe('C0 pack — the gates are honest (law 7)', () => {
  const defs = () => freeRoamInteractions(NO_SOURCES as never);

  it('Eddie opens at Day 2; the lease notice with him', () => {
    const s = new GameState();
    const eddie = byId(defs(), 'eddie');
    const lease = byId(defs(), 'lease_notice');
    expect(eddie.enabled!(s, ctxOf(s))).toBe(false);
    s.day = 2;
    expect(eddie.enabled!(s, ctxOf(s))).toBe(true);
    expect(lease.enabled!(s, ctxOf(s))).toBe(true);
    expect(eddie.prompt(s, ctxOf(s))).toBe('Take the first slice');
    // the covenant flows through the interaction
    eddie.perform!(ctxOf(s));
    expect(s.c0.covenant).toBe(true);
    expect(eddie.prompt(s, ctxOf(s))).toBe('Say hi to Eddie');
  });

  it('Miss Odessa waits for Day 5 — the block opens up first', () => {
    const s = new GameState();
    const odessa = byId(defs(), 'odessa');
    s.day = 4;
    expect(odessa.enabled!(s, ctxOf(s))).toBe(false);
    s.day = 5;
    expect(odessa.enabled!(s, ctxOf(s))).toBe(true);
    const out = odessa.perform!(ctxOf(s));
    expect(out[0]).toEqual({ kind: 'note', text: ODESSA_NOD });
  });

  it('Deshaun sits on Day 2 midday only — the clock gates him', () => {
    const s = new GameState();
    const deshaun = byId(defs(), 'deshaun');
    s.day = 2;
    // no clock in the harness: the gate yields (testability law)
    expect(deshaun.enabled!(s, ctxOf(s))).toBe(true);
    // a real clock: only midday sits
    expect(deshaun.enabled!(s, ctxOf(s, 'morning'))).toBe(false);
    expect(deshaun.enabled!(s, ctxOf(s, 'midday'))).toBe(true);
    s.day = 3;
    expect(deshaun.enabled!(s, ctxOf(s, 'midday'))).toBe(false);
    // the scene: the sit line + the kit, then the TALK entry
    s.day = 2;
    deshaun.perform!(ctxOf(s));
    const talk = s.fieldDiary.find((e) => e.id === 'c0-g1');
    expect(talk?.kind).toBe('TALK');
  });

  it('the surveyor stands at dawn only, with a clock behind him', () => {
    const s = new GameState();
    const surveyor = byId(defs(), 'surveyor');
    expect(surveyor.enabled!(s, ctxOf(s, 'morning'))).toBe(false);
    expect(surveyor.enabled!(s, ctxOf(s, 'dawn'))).toBe(true);
    // no clock (authored-only harness): the gate yields
    expect(surveyor.enabled!(s, ctxOf(s))).toBe(true);
    surveyor.perform!(ctxOf(s, 'dawn'));
    expect(s.fieldDiary.some((e) => e.body === SURVEYOR_DIARY_GUESS)).toBe(true);
  });

  it('the C0 defs never gate the story\u2019s steps', () => {
    // the notebook never blocks the block: none of the five read `step`
    const s = new GameState();
    for (const id of ['eddie', 'lease_notice', 'surveyor', 'odessa', 'deshaun']) {
      const d = byId(defs(), id);
      expect(d.enabled!.length).toBeLessThanOrEqual(2);
      // a fresh story state (MEET_ROSA) cannot crash any of them
      expect(() => d.perform!(ctxOf(s))).not.toThrow();
    }
  });
});
