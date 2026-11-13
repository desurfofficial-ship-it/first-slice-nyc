/**
 * sim/missable — the missable-event scheduler (narrative/14 R6, §7
 * step 5; doc 10 §4's specimen list).
 *
 * The laws as tests (doc 14 §6's testing law): THE R6 ACCEPTANCE — no
 * window ever re-opens (the terminal states are flag-backed); the miss
 * is CONTENT — one world change (flag + one WorldEventRecord carrying
 * doc 10 §4's verbatim "If missed" cell), never a nag; the flags are
 * the truth (a save that loses the state cache cannot resurrect a
 * missed window); the specimen table is doc 10 §4's 8 rows, resolved
 * through the canon calendar (pinned against dayOfCanonDate and
 * chapterAtDay, never hand math); determinism from save (the same
 * save booted twice writes the identical single record); the
 * independent floor untouched; the v1-safe world-save ride.
 */
import { describe, it, expect } from 'vitest';
import {
  MISSABLE_SPECS, resolveMissableSpecs, freshMissableWindows, tickMissables,
  parseMissableWindows, validateMissableSpecs, missedFlagOf, enteredFlagOf,
  dayEndTickOf, type MissableWindowEntry,
} from '../src/sim/missable';
import { dayOfCanonDate } from '../src/sim/clock';
import { CHAPTER_ORDER, chapterAtDay, chapterSpan, type ChapterId } from '../src/core/chapters';
import { createWorldState, snapshotWorld, parseWorldSave, OWNERSHIP } from '../src/sim/state';

/** The resolver binding the world binding uses (core/chapters → days). */
const spanOf = (ch: number) => chapterSpan(CHAPTER_ORDER[ch] as ChapterId);
const resolved = () => resolveMissableSpecs(MISSABLE_SPECS, spanOf);
const seeded = () => freshMissableWindows(resolved());

/** Tick with a plain flag map (flag id → tick). */
function tick(windows: MissableWindowEntry[], toDay: number, flags: Map<string, number> = new Map()) {
  return tickMissables(windows, { toDay, readFlag: (id) => flags.get(id) });
}

const byId = (windows: MissableWindowEntry[], id: string) => windows.find((w) => w.id === id)!;

describe('missable · the authored data (doc 10 §4 as the frozen table)', () => {
  it('the 8 specimen windows, ids unique, every row cited', () => {
    expect(MISSABLE_SPECS.length).toBe(8);
    expect(validateMissableSpecs()).toEqual([]);
    expect(new Set(MISSABLE_SPECS.map((s) => s.id)).size).toBe(8);
  });

  it('the "If missed" cells are doc 10 §4\u2019s verbatim rows', () => {
    const cells = new Map(MISSABLE_SPECS.map((s) => [s.id, s.missDetail]));
    expect(cells.get('warming_station_nights')).toContain('the new kid slept through the dark week');
    expect(cells.get('yoli_strategy_session')).toContain('N2\u2019s Form C is no longer available');
    expect(cells.get('garden_water_fix')).toContain('loses its beds\u2019 south row for the year');
    expect(cells.get('gallery_night_rachel')).toContain('the 1 a.m. call finds him regardless');
    expect(cells.get('pinning_ceremony')).toContain('his C5 booth scene loses one line of warmth');
    expect(cells.get('pledge_video_slot')).toContain('Kev is spared and never knows');
    expect(cells.get('garden_reckoning')).toContain('the block\u2019s verdicts in C6 arrive cold and unannounced');
    expect(cells.get('miss_odessas_lights')).toContain('not every miss is a wound');
  });

  it('every spec cites its row and carries an evt: onMiss id', () => {
    for (const s of MISSABLE_SPECS) {
      expect(s.cite).toContain('doc 10 \u00a74');
      expect(s.onMissEvt.startsWith('evt:missed_')).toBe(true);
    }
  });
});

describe('missable · resolution (the canon calendar, never hand math)', () => {
  it('the blackout window is doc 04 \u00a77\u2019s four days, Oct 29\u2013Nov 1, Y1', () => {
    const w = byId(seeded(), 'warming_station_nights');
    expect(w.opensAtDay).toBe(dayOfCanonDate({ y: 1, m: 10, d: 29 }));
    expect(w.closesAtDay).toBe(dayOfCanonDate({ y: 1, m: 11, d: 1 }));
    expect(w.closesAtDay - w.opensAtDay + 1).toBe(4); // "the four blackout days"
  });

  it('the canon-pinned closes: the gallery\u2019s May and the jobs-fair\u2019s Mar 8', () => {
    const gallery = byId(seeded(), 'gallery_night_rachel');
    expect(dayOfCanonDate({ y: 3, m: 5, d: 1 })).toBe(gallery.opensAtDay);
    expect(dayOfCanonDate({ y: 3, m: 5, d: 31 })).toBe(gallery.closesAtDay);
    const pledge = byId(seeded(), 'pledge_video_slot');
    expect(pledge.opensAtDay).toBe(dayOfCanonDate({ y: 3, m: 1, d: 6 })); // C4's first day
    expect(pledge.closesAtDay).toBe(dayOfCanonDate({ y: 3, m: 3, d: 8 })); // the op (doc 06 §C4)
  });

  it('the convention-anchored rows resolve to the documented positions', () => {
    const yoli = byId(seeded(), 'yoli_strategy_session');
    expect(yoli.opensAtDay).toBe(dayOfCanonDate({ y: 2, m: 1, d: 6 })); // C2 start
    expect(yoli.closesAtDay - yoli.opensAtDay + 1).toBe(2); // "two evenings"
    const water = byId(seeded(), 'garden_water_fix');
    expect(water.closesAtDay - water.opensAtDay + 1).toBe(11); // "eleven days"
    const pinning = byId(seeded(), 'pinning_ceremony');
    expect(pinning.closesAtDay - pinning.opensAtDay + 1).toBe(1); // "one evening"
    const reckoning = byId(seeded(), 'garden_reckoning');
    expect(reckoning.closesAtDay).toBe(dayOfCanonDate({ y: 3, m: 11, d: 30 })); // C5's last LIVED day (the window law: the gap days stay C5's — C6 opens Dec 1)
    expect(reckoning.closesAtDay - reckoning.opensAtDay + 1).toBe(10); // "C5 late"
    const lights = byId(seeded(), 'miss_odessas_lights');
    expect(lights.opensAtDay).toBe(dayOfCanonDate({ y: 3, m: 12, d: 1 })); // C6 opens, winter begins
    expect(lights.closesAtDay).toBe(dayOfCanonDate({ y: 4, m: 2, d: 28 })); // winter's end
  });

  it('EVERY resolved window lives inside its own chapter (the R8 window-law harmony)', () => {
    for (const w of seeded()) {
      const spec = MISSABLE_SPECS.find((s) => s.id === w.id)!;
      expect(chapterAtDay(w.opensAtDay)).toBe(CHAPTER_ORDER[spec.chapter]);
      expect(chapterAtDay(w.closesAtDay)).toBe(CHAPTER_ORDER[spec.chapter]);
    }
  });

  it('resolution is deterministic and the seed never pre-judges a miss', () => {
    expect(JSON.stringify(resolved())).toBe(JSON.stringify(resolved()));
    for (const w of seeded()) expect(w.state).toBeUndefined();
  });

  it('garbage throws (the input law): chapter-end in an open chapter, canon anchor without a date', () => {
    const spec = MISSABLE_SPECS.find((s) => s.id === 'garden_reckoning')!;
    expect(() => resolveMissableSpecs(
      [spec], (ch) => (ch === 5 ? { from: 100, to: null } : spanOf(ch)),
    )).toThrow(/open-ended chapter/);
    const gallery = MISSABLE_SPECS.find((s) => s.id === 'gallery_night_rachel')!;
    expect(() => resolveMissableSpecs([{ ...gallery, canonOpen: undefined }], spanOf)).toThrow(/canonOpen/);
  });
});

describe('missable · THE R6 ACCEPTANCE — no window ever re-opens', () => {
  it('an expiry fires ONCE; the flag makes the second tick silent', () => {
    const flags = new Map<string, number>();
    let windows = seeded();
    // through the whole of C1 the blackout window is live, then it closes
    const r1 = tick(windows, dayOfCanonDate({ y: 1, m: 11, d: 2 }), flags);
    expect(r1.fired).toHaveLength(1);
    expect(r1.fired[0]!.id).toBe('warming_station_nights');
    expect(r1.fired[0]!.day).toBe(byId(windows, 'warming_station_nights').closesAtDay);
    // the runtime applies the flag; the tick never fires the same window twice
    flags.set(missedFlagOf('warming_station_nights'), dayEndTickOf(r1.fired[0]!.day));
    windows = r1.windows;
    const r2 = tick(windows, dayOfCanonDate({ y: 1, m: 12, d: 31 }), flags);
    expect(r2.fired).toHaveLength(0);
    expect(byId(r2.windows, 'warming_station_nights').state).toBe('missed');
  });

  it('a missed window stays missed at ANY day — before, inside, or after its span', () => {
    const flags = new Map<string, number>([[missedFlagOf('yoli_strategy_session'), 500]]);
    const windows = seeded();
    for (const day of [1, dayOfCanonDate({ y: 2, m: 1, d: 6 }), dayOfCanonDate({ y: 4, m: 6, d: 1 })]) {
      const r = tick(windows, day, flags);
      // whatever else expires that day is fine — the flagged one never re-fires
      expect(r.fired.some((f) => f.id === 'yoli_strategy_session')).toBe(false);
      expect(byId(r.windows, 'yoli_strategy_session').state).toBe('missed');
    }
  });

  it('an entry inside the window is terminal: no miss, ever', () => {
    const flags = new Map<string, number>();
    const windows = seeded();
    const inside = dayOfCanonDate({ y: 1, m: 10, d: 30 }); // night two of the blackout
    flags.set(enteredFlagOf('warming_station_nights'), dayEndTickOf(inside) - 60);
    const r = tick(windows, dayOfCanonDate({ y: 3, m: 6, d: 1 }), flags);
    // other windows may expire by then — the ENTERED one never does
    expect(r.fired.some((f) => f.id === 'warming_station_nights')).toBe(false);
    const w = byId(r.windows, 'warming_station_nights');
    expect(w.state).toBe('entered');
    expect(w.missedAtDay).toBeUndefined();
  });

  it('a LATE entered flag does not resurrect the window — the miss is content', () => {
    const flags = new Map<string, number>();
    const windows = seeded();
    const closes = byId(windows, 'yoli_strategy_session').closesAtDay;
    // the content wave wrote the flag after the close — too late
    flags.set(enteredFlagOf('yoli_strategy_session'), dayEndTickOf(closes) + 1440);
    const r = tick(windows, closes + 5, flags);
    expect(r.fired.some((f) => f.id === 'yoli_strategy_session')).toBe(true);
    expect(byId(r.windows, 'yoli_strategy_session').state).toBe('missed');
  });

  it('the state cache losing a miss cannot resurrect it (the flags are the truth)', () => {
    // a save whose entries dropped their state cache entirely: the flags
    // alone re-derive the terminal dispositions, without re-firing
    const flags = new Map<string, number>([
      [missedFlagOf('pinning_ceremony'), dayEndTickOf(dayOfCanonDate({ y: 3, m: 1, d: 6 }))],
    ]);
    const bare = seeded().map((w) => ({ ...w, state: undefined, missedAtDay: undefined }));
    const r = tick(bare, dayOfCanonDate({ y: 3, m: 6, d: 1 }), flags);
    // the flagged window re-derives missed WITHOUT re-firing; others may expire
    expect(r.fired.some((f) => f.id === 'pinning_ceremony')).toBe(false);
    expect(byId(r.windows, 'pinning_ceremony').state).toBe('missed');
  });
});

describe('missable · the miss is a world change, not a nag', () => {
  it('the record carries the verbatim detail and the deterministic day', () => {
    const flags = new Map<string, number>();
    const windows = seeded();
    const closes = byId(windows, 'garden_water_fix').closesAtDay;
    const r = tick(windows, closes + 1, flags);
    const f = r.fired.find((x) => x.id === 'garden_water_fix')!;
    expect(f).toBeDefined();
    expect(f.day).toBe(closes);
    expect(f.evtId).toBe('evt:missed_garden_water_fix');
    expect(f.detail).toBe(MISSABLE_SPECS.find((s) => s.id === 'garden_water_fix')!.missDetail);
    expect(f.title).toBe('The garden\u2019s water-fix week');
  });

  it('the same save booted twice at the SAME day writes the identical single record', () => {
    const closes = byId(seeded(), 'pledge_video_slot').closesAtDay;
    const day = closes + 30;
    const boot1 = tick(seeded(), day, new Map());
    const fired1 = boot1.fired.filter((f) => f.id === 'pledge_video_slot');
    expect(fired1).toHaveLength(1);
    // boot 2: the same world re-evaluated the SAME day, flags applied —
    // byte-identical windows, zero new records
    const flags2 = new Map<string, number>(
      boot1.fired.map((f) => [missedFlagOf(f.id), dayEndTickOf(f.day)]),
    );
    const boot2 = tick(boot1.windows, day, flags2);
    expect(boot2.fired).toHaveLength(0); // the flags stand; no second record
    expect(JSON.stringify(boot2.windows)).toBe(JSON.stringify(boot1.windows));
  });

  it('the machine\u2019s output is bounded by its own specimen table (the independent floor)', () => {
    // run the whole canon span fast: only ever the 8 windows' changes
    const flags = new Map<string, number>();
    let windows = seeded();
    let all = [] as string[];
    for (let day = 1; day <= dayOfCanonDate({ y: 4, m: 6, d: 1 }); day += 13) {
      const r = tick(windows, day, flags);
      for (const f of r.fired) {
        all.push(f.id);
        flags.set(missedFlagOf(f.id), dayEndTickOf(f.day));
      }
      windows = r.windows;
    }
    const specIds = new Set(MISSABLE_SPECS.map((s) => s.id));
    expect(new Set(all).size).toBe(8); // every specimen window can miss exactly once
    for (const id of all) expect(specIds.has(id)).toBe(true); // nothing else ever fires
    // the terminal map: every window missed, and none twice
    for (const w of windows) expect(w.state).toBe('missed');
  });
});

describe('missable · dispositions and purity', () => {
  it('pending → open at the opensAtDay boundary; open → missed the day after close', () => {
    const windows = seeded();
    const w = byId(windows, 'warming_station_nights');
    expect(tick(windows, w.opensAtDay - 1).windows.find((x) => x.id === w.id)!.state).toBe('pending');
    expect(tick(windows, w.opensAtDay).windows.find((x) => x.id === w.id)!.state).toBe('open');
    expect(tick(windows, w.closesAtDay).windows.find((x) => x.id === w.id)!.state).toBe('open');
    expect(tick(windows, w.closesAtDay + 1).fired.some((f) => f.id === w.id)).toBe(true);
  });

  it('terminal states hold when the day decreases (never rewinds)', () => {
    const flags = new Map<string, number>();
    let windows = seeded();
    const closes = byId(windows, 'warming_station_nights').closesAtDay;
    windows = tick(windows, closes + 1, flags).windows;
    flags.set(missedFlagOf('warming_station_nights'), dayEndTickOf(closes));
    const back = tick(windows, 1, flags);
    expect(byId(back.windows, 'warming_station_nights').state).toBe('missed');
    expect(back.fired).toHaveLength(0);
  });

  it('the tick is pure — the input array is never mutated', () => {
    const windows = seeded();
    const before = JSON.stringify(windows);
    tick(windows, dayOfCanonDate({ y: 4, m: 6, d: 1 }), new Map());
    expect(JSON.stringify(windows)).toBe(before);
  });

  it('dayEndTickOf is the clock\u2019s own law (day D ends at D*1440, exclusive)', () => {
    expect(dayEndTickOf(1)).toBe(1440);
    expect(dayEndTickOf(0)).toBe(0);
  });
});

describe('missable · the world-save ride (v1-safe, the life law again)', () => {
  it('the world carries missable; OWNERSHIP covers the section', () => {
    const w = createWorldState();
    expect(w.missable).toEqual([]);
    expect(OWNERSHIP.some((o) => o.section === 'missable')).toBe(true);
  });

  it('snapshot → parse preserves windows; a dropped cache re-derives; corrupt drops with a note', () => {
    const w = createWorldState();
    const windows = seeded();
    // a save from past two expiries, flags applied the way the runtime does
    const flags = new Map<string, number>();
    const ticked = tick(windows, dayOfCanonDate({ y: 2, m: 2, d: 1 }), flags);
    for (const f of ticked.fired) flags.set(missedFlagOf(f.id), dayEndTickOf(f.day));
    w.missable = ticked.windows;
    const doc = snapshotWorld(w) as unknown as Record<string, unknown>;
    // the flags ride the snapshot too — the truth the re-derivation reads
    doc.flags = [...flags.entries()];
    const round = parseWorldSave(JSON.stringify(doc));
    expect(round.source).toBe('restored');
    expect(JSON.stringify(round.world.missable)).toBe(JSON.stringify(w.missable));

    // a save whose missable entries are malformed: they drop, with a note,
    // and the flags re-derive their truth at the next tick
    const bad = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
    bad.missable = [...(bad.missable as unknown[]), { id: 'garbage', opensAtDay: 'x' }];
    const quarantined = parseWorldSave(JSON.stringify(bad));
    expect(quarantined.world.missable.some((m) => m.id === 'garbage')).toBe(false);
    expect(quarantined.notes.some((n) => n.includes('malformed window'))).toBe(true);
    // the flags are the truth: the dropped-and-reseeded windows re-derive
    // their misses from the flags alone, firing nothing new
    const rederived = tick(quarantined.world.missable, dayOfCanonDate({ y: 2, m: 2, d: 1 }), quarantined.world.flags.map);
    expect(rederived.fired).toHaveLength(0);
    for (const f of ticked.fired) {
      expect(rederived.windows.find((m) => m.id === f.id)!.state).toBe('missed');
    }
  });

  it('parseMissableWindows shape-checks entries instead of trusting them', () => {
    const { windows, note } = parseMissableWindows([
      {
        id: 'warming_station_nights', opensAtDay: 50, closesAtDay: 53,
        onMiss: 'evt:missed_warming_station_nights', title: 'The warming-station nights',
        missDetail: 'detail', cite: 'cite', state: 'open', enteredAtDay: 51,
      },
      { id: 'bad', opensAtDay: 'x', closesAtDay: 3, onMiss: 'evt:x', title: '', missDetail: '', cite: '' },
      { id: 'backwards', opensAtDay: 10, closesAtDay: 5, onMiss: 'evt:x', title: '', missDetail: '', cite: '' },
      { id: 'no-evt-prefix', opensAtDay: 1, closesAtDay: 2, onMiss: 'flag:x', title: '', missDetail: '', cite: '' },
      null,
    ]);
    expect(windows).toHaveLength(1);
    expect(windows[0]!.state).toBe('open');
    expect(windows[0]!.enteredAtDay).toBe(51);
    expect(note).toContain('4 malformed windows');
  });

  it('an old save (missable: []) parses clean and the boot seed starts all-pending', () => {
    const w = createWorldState();
    const doc = snapshotWorld(w);
    const round = parseWorldSave(JSON.stringify(doc));
    expect(round.world.missable).toEqual([]);
    const seededWindows = seeded();
    expect(seededWindows).toHaveLength(8);
    const atArrival = tick(seededWindows, 1);
    expect(atArrival.fired).toHaveLength(0);
    for (const win of atArrival.windows) expect(win.state).toBe('pending');
  });
});
