/**
 * The C0 content pack — the BLOCK layer (narrative/14 §7 step 6, tranche 2
 * — core/c0Pack.ts + the GameState seam + the interaction defs).
 *
 * The spine tranche (core/c0pack.ts, tests/c0-spine.test.ts) owns the
 * beats that ride the shipped flow. This suite pins the block around
 * them. The load-bearing laws, each pinned:
 *   1. **Doc quotes are verbatim** — the covenant, the lease notice, the
 *      surveyor, the listing, Deshaun's sit line, the Sam exchange, Rosa's
 *      mango line, the nod, the wobble.
 *   2. **The diary is the only latch** — a hook fires once; the entry's
 *      id IS the latch (no new save shape); a repeat press is an echo.
 *   3. **The wobble is RECALL/RECALL**, gated to Day 7+ at the laundromat.
 *   4. **The gates are honest** — Eddie from Day 2 (covenant once per
 *      session), Odessa from Day 5, Deshaun on Day 2 midday, the surveyor
 *      at dawn (clock-backed).
 *   5. **Doc 11 §6's bans hold** — no Corvus, no crime, no conspiracy in
 *      the block layer's code lines.
 *   6. **The shipped beats carry their new lines** — the mango read on the
 *      mango pick, the Sam exchange at the handover.
 */

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/core/GameState';
import {
  C0_BLOCK_IDS, DESHAUN_SIT_LINE, EDDIE_COVENANT, EDDIE_LEASE_LINE,
  EDDIE_LISTING, ENTRY5_WOBBLE, ODESSA_NOD, ROSA_MANGO_LINE, ROSA_REGULAR_LINE,
  SAM_LAW_LINE, SAM_STILL_DOING_LINE, SURVEYOR_DIARY_GUESS, SURVEYOR_LINE,
} from '../src/core/c0pack';
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

/** A ctx stub — the block-layer defs only read `state` and (for the clock
 *  gates) `game.worldSim`, so a cast-stub carries the tests. */
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

describe('C0 block layer — doc 11 verbatim lines (law 1)', () => {
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
});

describe('C0 block layer — the diary is the only latch (law 2)', () => {
  it('the lease notice: one line from Eddie, then the echo', () => {
    const s = new GameState();
    s.calendarDay = 3;
    const first = s.c0Lease();
    expect(first[0]).toEqual({
      kind: 'note',
      text: 'Eddie: \u201CPaper\u2019s just paper till it isn\u2019t.\u201D',
    });
    expect(s.fieldDiary.some((e) => e.id === C0_BLOCK_IDS.lease)).toBe(true);
    const again = s.c0Lease();
    expect((again[0] as { text: string }).text).not.toContain('till it isn\u2019t');
  });

  it('the surveyor: the line + the GUESS written once (C2\u2019s strike target)', () => {
    const s = new GameState();
    s.calendarDay = 2;
    s.c0Surveyor();
    const guess = s.fieldDiary.filter((e) => e.id === C0_BLOCK_IDS.surveyor);
    expect(guess).toHaveLength(1);
    expect(guess[0].epistemic).toBe('GUESS');
    expect(guess[0].date).toEqual(dateOfCalendarDay(2));
    const echo = s.c0Surveyor();
    expect(echo.some((e) => e.kind === 'diary-ink')).toBe(false);
  });

  it('Odessa: the nod twice, the entry once', () => {
    const s = new GameState();
    s.calendarDay = 5;
    s.c0Odessa();
    s.c0Odessa();
    expect(s.fieldDiary.filter((e) => e.id === C0_BLOCK_IDS.odessa)).toHaveLength(1);
  });

  it('Deshaun: the kit once (sit + three counts), then the echo', () => {
    const s = new GameState();
    s.calendarDay = 2;
    const kit = s.c0Deshaun();
    expect(kit.filter((e) => e.kind === 'note')).toHaveLength(4);
    const talk = s.fieldDiary.find((e) => e.id === C0_BLOCK_IDS.deshaun);
    expect(talk?.kind).toBe('TALK');
    s.c0Deshaun();
    expect(s.fieldDiary.filter((e) => e.id === C0_BLOCK_IDS.deshaun)).toHaveLength(1);
  });
});

describe('C0 block layer — the wobble (law 3)', () => {
  it('RECALL/RECALL, gated to Day 7+, once only', () => {
    const s = new GameState();
    s.calendarDay = 5;
    expect(s.c0Wobble()).toEqual([]); // too early — the fuse waits
    s.calendarDay = 7;
    s.c0Wobble();
    const e = s.fieldDiary.find((x) => x.id === C0_BLOCK_IDS.wobble);
    expect(e?.kind).toBe('RECALL');
    expect(e?.epistemic).toBe('RECALL');
    expect(ENTRY5_WOBBLE.split('\n').length).toBeLessThanOrEqual(3);
    expect(ENTRY5_WOBBLE).toContain('motel hum');
    s.c0Wobble();
    expect(s.fieldDiary.filter((x) => x.id === C0_BLOCK_IDS.wobble)).toHaveLength(1);
  });
});

describe('C0 block layer — the shipped beats carry their new lines (law 6)', () => {
  it('the mango pick lands Rosa\u2019s read (beat 5)', () => {
    const s = new GameState();
    s.step = 2; // COLLECT
    const out = s.collect('mango');
    expect(out.some((e) => e.kind === 'note' && (e as { text: string }).text === ROSA_MANGO_LINE)).toBe(true);
    // the other items carry no such line
    const s2 = new GameState();
    s2.step = 2;
    const out2 = s2.collect('coffee');
    expect(out2.some((e) => e.kind === 'note' && (e as { text: string }).text === ROSA_MANGO_LINE)).toBe(false);
  });

  it('the Map handover lands the Sam exchange (beat 10)', () => {
    const s = new GameState();
    s.day = 4;
    s.step = 27; // D4_MAP
    s.strangerAtCart = true;
    const out = s.giveMap();
    const texts = out.filter((e) => e.kind === 'note').map((e) => (e as { text: string }).text);
    expect(texts).toContain(SAM_STILL_DOING_LINE);
    expect(texts).toContain(SAM_LAW_LINE);
  });
});

describe('C0 block layer — the bans hold (law 5)', () => {
  it('no Corvus, no crime, no conspiracy in the block layer\u2019s code lines', () => {
    const fs = require('fs') as typeof import('fs');
    const pack = fs.readFileSync('src/core/c0pack.ts', 'utf8');
    // the block layer is the section below its spine marker — grep the
    // whole module's code lines (the spine's own bans live in c0-spine)
    const blockStart = pack.indexOf('THE BLOCK LAYER');
    const code = pack.slice(blockStart >= 0 ? blockStart : 0)
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*'))
      .join('\n');
    for (const word of ['Corvus', 'corvus', 'conspir', 'crime', 'criminal', 'ominous', 'flashback']) {
      expect(code).not.toContain(word);
    }
  });
});

describe('C0 block layer — the gates are honest (law 4)', () => {
  const defs = () => freeRoamInteractions(NO_SOURCES as never);

  it('Eddie opens at Day 2; the covenant lands once per session', () => {
    const s = new GameState();
    const eddie = byId(defs(), 'eddie');
    expect(eddie.enabled!(s, ctxOf(s))).toBe(false);
    s.day = 2;
    expect(eddie.enabled!(s, ctxOf(s))).toBe(true);
    expect(eddie.prompt(s, ctxOf(s))).toBe('Take the first slice');
    const first = eddie.perform!(ctxOf(s));
    expect(first[0]).toEqual({
      kind: 'note',
      text: 'Eddie: \u201CEat standing up. That\u2019s the job.\u201D',
    });
    expect(eddie.prompt(s, ctxOf(s))).toBe('Say hi to Eddie');
    const again = eddie.perform!(ctxOf(s));
    expect((again[0] as { text: string }).text).not.toContain('Eat standing up');
  });

  it('Miss Odessa waits for Day 5 — the block opens up first', () => {
    const s = new GameState();
    const odessa = byId(defs(), 'odessa');
    s.day = 4;
    expect(odessa.enabled!(s, ctxOf(s))).toBe(false);
    s.day = 5;
    expect(odessa.enabled!(s, ctxOf(s))).toBe(true);
    expect(odessa.perform!(ctxOf(s))[0]).toEqual({ kind: 'note', text: ODESSA_NOD });
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
  });

  it('the surveyor stands at dawn only, with a clock behind him', () => {
    const s = new GameState();
    const surveyor = byId(defs(), 'surveyor');
    expect(surveyor.enabled!(s, ctxOf(s, 'morning'))).toBe(false);
    expect(surveyor.enabled!(s, ctxOf(s, 'dawn'))).toBe(true);
    // no clock (authored-only harness): the gate yields
    expect(surveyor.enabled!(s, ctxOf(s))).toBe(true);
  });

  it('the C0 defs never gate the story\u2019s steps', () => {
    // the notebook never blocks the block: none of the five read `step`
    const s = new GameState();
    for (const id of ['eddie', 'lease_notice', 'surveyor', 'odessa', 'deshaun']) {
      const d = byId(defs(), id);
      expect(() => d.perform!(ctxOf(s))).not.toThrow();
    }
  });
});
