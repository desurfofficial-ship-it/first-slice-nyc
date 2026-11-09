/**
 * The C0 content pack — the first session's narrative layer (doc 11) —
 * narrative/14 §7 step 6. This file pins the pack's LAWS:
 *
 *   1. fire-once (a beat never fires twice; the cold open writes once);
 *   2. the save round-trip (v1-safe trailing field, quarantine parsing,
 *      old saves read as defaults, never a rewind);
 *   3. the entries' schemas (doc 03 §2 kinds/tags through doc 11 §3 —
 *      the mishear lands FACT-tagged and nothing here corrects it);
 *   4. the beat order (doc 11 §2's table, riding the shipped spine);
 *   5. the opening law (doc 11 §6) as a validator over every string the
 *      pack can put on screen;
 *   6. the interaction gates (the surveyor's dawn, the lease's wall, the
 *      trial shift's and Deshaun's Day-2 windows).
 */

import { describe, expect, it } from 'vitest';
import {
  defaultFirstSession, writeColdOpen, markBeat, setFlag, noteOdessaNight,
  buildEntry2, buildEntry3, buildEntry4, buildEntry5,
  parseFirstSession, serializeFirstSession, validateOpeningLaw,
  COLD_OPEN_PROMPTS, COLD_OPEN_FACTS_LINE, THE_LISTING, PRIYA_WRONG_TRAIN,
  ROSA_MANGO_LINE, EDDIE_COVENANT, TRIAL_SHIFT_LINES, DESHAUN_LINES,
  GROUNDING_USE_LINE, ENTRY2_PROMPT, ENTRY2_OPTIONS, ENTRY4_PROMPT,
  QUESTION_PROMPTS, MOTEL_HUM_BODY, MISHEAR_BODY, LEASE_NOTICE_TEXT,
  LEASE_ASK_LINE, SURVEYOR_NOTE, SURVEYOR_ASK_LINE, ODESSA_OBSERVATION,
} from '../src/core/firstSession';
import { GameState, Step } from '../src/core/GameState';
import { dateOfCalendarDay } from '../src/core/calendar';
import { authoredInteractions, freeRoamInteractions } from '../src/game/interactionDefs';
import type { InteractionCtx } from '../src/game/interactions';

const D1 = dateOfCalendarDay(1); // Tuesday, Sept 9, Year 1 — the arrival

// ---------------------------------------------------------------- fire-once ----

describe('C0 pack — fire-once (the chapterRails law)', () => {
  it('the cold open writes exactly once; the second call is a no-op', () => {
    let s = defaultFirstSession();
    const first = writeColdOpen(s, 0, '', D1);
    expect(first.fired).toBe(true);
    expect(first.entry).not.toBeNull();
    s = first.state;
    const second = writeColdOpen(s, 1, '', D1);
    expect(second.fired).toBe(false);
    expect(second.entry).toBeNull();
    expect(second.state).toBe(s); // the same object — nothing happened
  });

  it('the free line is honored, capped, and never blank — the game\u2019s first line exists', () => {
    const r = writeColdOpen(defaultFirstSession(), -1, '   ', D1);
    expect(r.entry?.body).toBe(COLD_OPEN_PROMPTS[0].body); // an empty line isn't a line
    const r2 = writeColdOpen(defaultFirstSession(), -1, 'x'.repeat(500), D1);
    expect(r2.entry?.body.length).toBeLessThanOrEqual(120);
    expect(r2.entry?.body).toBe('x'.repeat(120));
  });

  it('markBeat fires once per id, and the ids are the pack\u2019s own four', () => {
    let s = defaultFirstSession();
    const r1 = markBeat(s, 'entry2_first_slice');
    expect(r1.fired).toBe(true);
    s = r1.state;
    expect(markBeat(s, 'entry2_first_slice').fired).toBe(false);
    const again = markBeat(s, 'entry3_the_cart');
    expect(again.fired).toBe(true);
    s = again.state;
    expect(Object.keys(s.fired).sort()).toEqual(['entry2_first_slice', 'entry3_the_cart']);
  });

  it('the scalar flags set once and never clear (never-rewinds)', () => {
    let s = setFlag(defaultFirstSession(), 'groundingLearned');
    s = setFlag(s, 'groundingLearned');
    expect(s.groundingLearned).toBe(true);
    // no API surface can unset it: the module exports no unset/clear
  });

  it('Odessa\u2019s nights cap at eight, oldest falling off — bookkeeping, not forgetting', () => {
    let s = defaultFirstSession();
    for (let d = 1; d <= 10; d++) s = noteOdessaNight(s, `d${d}`);
    expect(s.odessaNights).toEqual(['d3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10']);
    s = noteOdessaNight(s, 'd3'); // a repeated night is a no-op
    expect(s.odessaNights[s.odessaNights.length - 1]).toBe('d10');
  });
});

// ------------------------------------------------------------ entry schemas ----

describe('C0 pack — the entries\u2019 schemas (doc 03 §2 through doc 11 §3)', () => {
  it('entry 1 carries the chosen prompt as a private FACT observation', () => {
    const r = writeColdOpen(defaultFirstSession(), 1, '', D1);
    expect(r.entry).toMatchObject({
      id: 'c0-e1-opening-line', kind: 'OBSERVATION', epistemic: 'FACT',
      body: 'I\u2019m the smart one.', visibility: 'private', corrections: [], links: [],
    });
  });

  it('entry 2 is the first running theory — honestly tagged GUESS', () => {
    const e = buildEntry2(2, '', D1);
    expect(e).toMatchObject({ id: 'c0-e2-first-slice', kind: 'OBSERVATION', epistemic: 'GUESS' });
    expect(e.body).toBe(ENTRY2_OPTIONS[2].body);
    expect(e.date).toEqual(D1);
  });

  it('entry 3 — the mishear — lands FACT-tagged and nothing here corrects it', () => {
    const e = buildEntry3(D1);
    expect(e).toMatchObject({
      id: 'c0-e3-the-cart', kind: 'EVENT', epistemic: 'FACT',
      body: 'Rosa gave me the cart.', corrections: [],
    });
    expect(e.corrections).toHaveLength(0); // the strike is C1's; the diary is append-only
  });

  it('entry 4 is a QUESTION, authored or free', () => {
    const picked = buildEntry4(1, '', D1);
    expect(picked).toMatchObject({ id: 'c0-e4-first-question', kind: 'QUESTION', epistemic: 'GUESS' });
    expect(picked.body).toContain('Works');
    const free = buildEntry4(-1, 'Why is the sky doing that here?', D1);
    expect(free.body).toBe('Why is the sky doing that here?');
  });

  it('entry 5 — the wobble — is RECALL, faint, three lines max, unexplained', () => {
    const e = buildEntry5(D1);
    expect(e).toMatchObject({ id: 'c0-e5-motel-hum', kind: 'RECALL', epistemic: 'RECALL' });
    expect(e.body.split('\n').length).toBeLessThanOrEqual(3);
    expect(e.body).toBe(MOTEL_HUM_BODY);
  });

  it('all five ids are unique — the diary\u2019s one door never sees a duplicate', () => {
    const ids = ['c0-e1-opening-line', 'c0-e2-first-slice', 'c0-e3-the-cart', 'c0-e4-first-question', 'c0-e5-motel-hum'];
    expect(new Set(ids).size).toBe(5);
  });
});

// ------------------------------------------------------------ save round-trip ----

describe('C0 pack — the save layer (optional trailing, v1-safe)', () => {
  it('serialize → parse round-trips exactly', () => {
    let s = defaultFirstSession();
    s = writeColdOpen(s, -1, 'The bus was late. I was ready.', D1).state;
    s = markBeat(s, 'entry3_the_cart').state;
    s = setFlag(s, 'trialShiftDone');
    s = noteOdessaNight(s, 'd7');
    const parsed = parseFirstSession(JSON.parse(JSON.stringify(serializeFirstSession(s))));
    expect(parsed.quarantined).toBe(0);
    expect(parsed.state).toEqual(s);
  });

  it('an old save (field absent) reads as the default state, quarantine 0', () => {
    const parsed = parseFirstSession(undefined);
    expect(parsed.state).toEqual(defaultFirstSession());
    expect(parsed.quarantined).toBe(0);
  });

  it('corrupt values drop field-by-field to defaults, never crash', () => {
    const parsed = parseFirstSession({
      coldOpenDone: 'yes', coldOpenChoice: 7, coldOpenFree: 42,
      fired: { entry2_first_slice: true, made_up_beat: true, entry4_first_question: 'no' },
      odessaNights: ['d3', 99, 'd5'], groundingLearned: null,
    });
    expect(parsed.state.coldOpenDone).toBe(false);
    expect(parsed.state.coldOpenChoice).toBe(-1);
    expect(parsed.state.fired).toEqual({ entry2_first_slice: true });
    expect(parsed.state.odessaNights).toEqual(['d3', 'd5']);
    expect(parsed.quarantined).toBeGreaterThan(0);
  });

  it('a non-object field quarantines whole', () => {
    expect(parseFirstSession('junk').quarantined).toBe(1);
    expect(parseFirstSession(null).state).toEqual(defaultFirstSession());
  });

  it('the state never aliases live arrays/records (the save copies)', () => {
    const s = noteOdessaNight(defaultFirstSession(), 'd2');
    const copy = serializeFirstSession(s);
    copy.odessaNights.push('d9');
    copy.fired.entry2_first_slice = true;
    expect(s.odessaNights).toEqual(['d2']);
    expect(s.fired).toEqual({});
  });
});

// ------------------------------------------------------------ the opening law ----

describe('C0 pack — the opening law (doc 11 §6), validated not hoped for', () => {
  /** Every string the pack can put on screen, collected by hand so the
   *  test FAILS LOUDLY when a new one is added and unscanned. */
  const ALL_PACK_TEXTS: readonly string[] = [
    ...COLD_OPEN_PROMPTS.map((p) => p.body),
    COLD_OPEN_FACTS_LINE, THE_LISTING, PRIYA_WRONG_TRAIN, ROSA_MANGO_LINE,
    EDDIE_COVENANT, ...TRIAL_SHIFT_LINES, ...DESHAUN_LINES, GROUNDING_USE_LINE,
    ENTRY2_PROMPT, ...ENTRY2_OPTIONS.map((o) => o.body),
    ENTRY4_PROMPT, ...QUESTION_PROMPTS.map((o) => o.body),
    MOTEL_HUM_BODY, MISHEAR_BODY, LEASE_NOTICE_TEXT, LEASE_ASK_LINE,
    SURVEYOR_NOTE, SURVEYOR_ASK_LINE, ODESSA_OBSERVATION,
  ];

  it('no crime, no conspiracy, no Corvus, no diagnosis dump, no lecture — ever', () => {
    expect(validateOpeningLaw(ALL_PACK_TEXTS)).toEqual([]);
  });

  it('the validator catches what it exists to catch', () => {
    expect(validateOpeningLaw(['Corvus was behind it all along']))
      .toEqual([{ text: 'Corvus was behind it all along', word: 'corvus' }]);
    expect(validateOpeningLaw(['a tutorial: press X']).length).toBe(1);
  });

  it('the Deshaun scene says symptoms, not diagnoses — the disclosure stays light', () => {
    const joined = DESHAUN_LINES.join(' ');
    expect(joined).toContain('Same symptoms');
    expect(validateOpeningLaw([joined])).toEqual([]);
  });
});

// ------------------------------------------------------------ the beat order ----

describe('C0 pack — the beat order rides the shipped spine (doc 11 §2)', () => {
  it('beat 5 — Rosa\u2019s mango line rides the errand\u2019s last pick, before the rush', () => {
    const s = new GameState();
    s.setStep(Step.MEET_ROSA);
    s.setStep(Step.ENTER_BODEGA);
    s.setStep(Step.COLLECT);
    const out = [...s.collect('mango'), ...s.collect('coffee'), ...s.collect('bread')];
    const notes = out.filter((e) => e.kind === 'note').map((e) => (e as { text: string }).text);
    expect(notes.some((t) => t === ROSA_MANGO_LINE)).toBe(true);
    expect(s.step).toBe(Step.RUSH);
  });

  it('beat 8 — the mishear fires once at the Day-1 night cap (POSTCARD), FACT into the diary', () => {
    const s = new GameState();
    s.setStep(Step.POSTCARD);
    const diaryIds = s.fieldDiary.map((e) => e.id);
    expect(diaryIds).toContain('c0-e3-the-cart');
    const e3 = s.fieldDiary.find((e) => e.id === 'c0-e3-the-cart');
    expect(e3?.epistemic).toBe('FACT');
    expect(e3?.date).toEqual(dateOfCalendarDay(s.calendarDay));
    // fire-once: a second pass (a replayed step) appends nothing
    s.setStep(Step.SOLO);
    s.setStep(Step.POSTCARD);
    expect(s.fieldDiary.filter((e) => e.id === 'c0-e3-the-cart')).toHaveLength(1);
  });

  it('beat 6 — the trial shift is two presses: the work, then 6:55, the covenant, Entry 2\u2019s sheet', () => {
    const s = new GameState();
    s.day = 2;
    s.setStep(Step.D2_WAKE);
    const first = s.c0TrialShift();
    expect(first.some((e) => e.kind === 'note' && e.text === TRIAL_SHIFT_LINES[0])).toBe(true);
    expect(s.firstSession.trialShiftDone).toBe(false);
    const second = s.c0TrialShift();
    expect(second.some((e) => e.kind === 'note' && e.text.includes('Eat standing up'))).toBe(true);
    expect(second.some((e) => e.kind === 'c0-write-sheet' && e.sheet === 'entry2')).toBe(true);
    expect(s.firstSession.trialShiftDone).toBe(true);
    expect(s.firstSession.fired.entry2_first_slice).toBe(true);
    // a third press after done is silence — the shift doesn't repeat
    expect(s.c0TrialShift()).toEqual([]);
  });

  it('beat 6\u2019s write lands through the one door as the picked theory', () => {
    const s = new GameState();
    s.day = 2;
    const out = s.c0WriteEntry('entry2', 0, '');
    expect(out.some((e) => e.kind === 'note')).toBe(true);
    expect(s.fieldDiary.map((e) => e.id)).toContain('c0-e2-first-slice');
    // a duplicate write is refused by the diary itself (duplicate-id)
    const again = s.c0WriteEntry('entry2', 1, '');
    expect(again.some((e) => e.kind === 'note' && e.text.includes('already'))).toBe(true);
    expect(s.fieldDiary.filter((e) => e.id === 'c0-e2-first-slice')).toHaveLength(1);
  });

  it('beat 7 — Deshaun\u2019s scene runs its five lines, then the kit is learned', () => {
    const s = new GameState();
    s.day = 2;
    const lines: string[] = [];
    for (let i = 0; i < DESHAUN_LINES.length; i++) {
      for (const e of s.c0Deshaun()) if (e.kind === 'note') lines.push(e.text);
    }
    expect(lines[0]).toBe(DESHAUN_LINES[0]);
    expect(lines.some((t) => t.includes('Five things with edges'))).toBe(true);
    expect(lines[lines.length - 1]).toBe(GROUNDING_USE_LINE);
    expect(s.firstSession.groundingLearned).toBe(true);
    expect(s.c0Deshaun()).toEqual([]); // taught once
  });

  it('entry 4 opens with Day 3\u2019s fire escape (D3_CLIMB3), once', () => {
    const s = new GameState();
    const out = s.setStep(Step.D3_CLIMB3);
    expect(out.some((e) => e.kind === 'c0-write-sheet' && e.sheet === 'entry4')).toBe(true);
    s.setStep(Step.D3_POSTCARD);
    s.setStep(Step.D3_CLIMB3);
    expect(out.filter((e) => e.kind === 'c0-write-sheet')).toHaveLength(1);
  });

  it('entry 5 — the wobble needs the laundromat AND Day 7+, fires once ever', () => {
    const s = new GameState();
    expect(s.c0TryWobble(true)).toEqual([]); // Day 1: too early, silence
    s.calendarDay = 7;
    expect(s.c0TryWobble(false)).toEqual([]); // not near: silence
    const out = s.c0TryWobble(true);
    expect(out.length).toBe(1);
    expect(s.firstSession.fired.entry5_motel_hum).toBe(true);
    expect(s.fieldDiary.map((e) => e.id)).toContain('c0-e5-motel-hum');
    expect(s.c0TryWobble(true)).toEqual([]); // once ever
  });

  it('hook 3 — Odessa\u2019s night: Mon/Wed/Fri at/after 9 p.m. near the gold window, once per night', () => {
    const s = new GameState();
    expect(s.c0TryOdessa(2, true, true)).toEqual([]); // Tuesday: not her night
    expect(s.c0TryOdessa(1, false, true)).toEqual([]); // Monday but 8:40 p.m.: not yet
    expect(s.c0TryOdessa(1, true, false)).toEqual([]); // Monday 9 p.m., wrong corner: not seen
    const out = s.c0TryOdessa(1, true, true);
    expect(out).toHaveLength(1);
    expect(s.firstSession.odessaNights).toEqual(['d1']);
    expect(s.c0TryOdessa(1, true, true)).toEqual([]); // the same night says nothing more
  });
});

// ------------------------------------------------------------ the interaction gates ----

describe('C0 pack — the interactions\u2019 gates (the registry\u2019s own law)', () => {
  const src = {
    rosa: () => ({ x: 0, y: 0, z: 0 }), idris: () => ({ x: 0, y: 0, z: 0 }),
    kid: () => ({ x: 0, y: 0, z: 0 }), stranger: () => ({ x: 0, y: 0, z: 0 }),
    cart: () => ({ x: 0, y: 0, z: 0 }), shelfItem: () => ({ x: 0, y: -100, z: 0 }),
  };
  const ctx = (clockMin?: number): InteractionCtx => ({
    state: new GameState(),
    game: { worldSim: clockMin === undefined ? undefined : { brain: { world: { clock: { minuteOfDay: clockMin } } } } } as unknown as InteractionCtx['game'],
  });

  it('the surveyor exists only at dawn (5\u20137 a.m.) — and tolerates stub worlds', () => {
    const all = freeRoamInteractions(src);
    const surveyor = all.find((i) => i.id === 'c0_surveyor');
    expect(surveyor).toBeDefined();
    expect(surveyor!.enabled(new GameState(), ctx(6 * 60))).toBe(true);
    expect(surveyor!.enabled(new GameState(), ctx(12 * 60))).toBe(false); // noon
    expect(surveyor!.enabled(new GameState(), ctx(22 * 60))).toBe(false); // night
    expect(surveyor!.enabled(new GameState(), ctx(undefined))).toBe(false); // stub: no clock
  });

  it('the lease notice exists only once the shift has been worked', () => {
    const lease = freeRoamInteractions(src).find((i) => i.id === 'c0_eddie_lease');
    expect(lease).toBeDefined();
    const s = new GameState();
    expect(lease!.enabled(s, ctx())).toBe(false);
    s.firstSession = setFlag(s.firstSession, 'trialShiftDone');
    expect(lease!.enabled(s, ctx())).toBe(true);
    const out = lease!.perform({ state: s } as InteractionCtx);
    expect(out.length).toBe(2);
    expect(s.firstSession.leaseAsked).toBe(true);
  });

  it('the trial shift and Deshaun open only inside their Day-2 windows', () => {
    const all = authoredInteractions(src);
    const trial = all.find((i) => i.id === 'c0_trial_shift');
    const deshaun = all.find((i) => i.id === 'c0_deshaun');
    expect(trial).toBeDefined();
    expect(deshaun).toBeDefined();
    const s = new GameState();
    s.day = 2; s.setStep(Step.D2_WAKE);
    expect(trial!.enabled(s, ctx())).toBe(true);
    s.setStep(Step.D2_CLIMB2);
    expect(trial!.enabled(s, ctx())).toBe(false); // the morning is over
    s.day = 3;
    expect(trial!.enabled(s, ctx())).toBe(false); // and it was a Day-2 thing
    const s2 = new GameState();
    s2.day = 2; s2.setStep(Step.D2_IDRIS);
    expect(deshaun!.enabled(s2, ctx())).toBe(true);
    s2.setStep(Step.D2_CLIMB2);
    expect(deshaun!.enabled(s2, ctx())).toBe(false); // the midday window closed
    s2.firstSession = setFlag(s2.firstSession, 'groundingLearned');
    s2.setStep(Step.D2_IDRIS);
    expect(deshaun!.enabled(s2, ctx())).toBe(false); // taught is taught
  });

  it('the listing is always at the terminal, and the first read flags it', () => {
    const listing = freeRoamInteractions(src).find((i) => i.id === 'c0_phone_listing');
    expect(listing).toBeDefined();
    expect(listing!.enabled(new GameState(), ctx())).toBe(true);
    const s = new GameState();
    const out = listing!.perform({ state: s } as InteractionCtx);
    expect(out[0]).toMatchObject({ kind: 'note', text: THE_LISTING });
    expect(s.firstSession.listingRead).toBe(true);
  });
});
