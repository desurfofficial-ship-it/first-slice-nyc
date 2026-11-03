/**
 * The Map, as a notebook (docs/11 + docs/12 prototype 2) — the state side:
 * pages collect, dedupe, cap, and ride the v1-safe save fields. The paper
 * rules from the prototype are the assertions:
 *   · the Map never writes the same lesson twice
 *   · the pages never crash a parse (corrupt list = empty page)
 *   · an old save (no map_notes field) parses unchanged
 */

import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/GameState';
import { parseSave, defaultSave, type SaveData } from '../src/core/Save';
import { MAP_NOTE_BOOT, RUSH_CARDS, SOLO_CARDS, USUAL_NOTE, GOLD_WINDOW_NOTE,
  IDRIS_NINE_YEARS_NOTE, MAP_PLACES } from '../src/core/content';

/** One conversation beat pair: choose + fold. */
function serveCard(s: GameState, reply?: number): void {
  if (!s.pendingCard) throw new Error('no order card open');
  s.chooseReply(reply ?? s.pendingCard.defaultReply);
  s.chooseReply(-1);
}

function day1ServedWithAsks(): GameState {
  const s = new GameState();
  s.tryRosa();
  s.enterBodega();
  s.collect('mango');
  s.collect('coffee');
  s.collect('bread');
  // ask on card 1 (the regular) — the teach path writes to the Map
  s.openCounterOrder();
  serveCard(s, 2);
  for (let i = 1; i < RUSH_CARDS.length; i++) {
    s.openCounterOrder();
    serveCard(s);
  }
  return s;
}

describe('the Map collects what the city teaches (docs/12 prototype 2)', () => {
  it('page 1 belongs to the Map itself; page 2 starts empty', () => {
    const s = new GameState();
    expect(MAP_NOTE_BOOT).toBe('You are here. That\u2019s enough.');
    expect(s.mapNotes).toEqual([]);
    expect(s.mapSlang).toEqual([]);
  });

  it('the rush writes the lessons down, deduped, in order earned', () => {
    const s = day1ServedWithAsks();
    // the ask on card 1 wrote the regular-coffee note once
    expect(s.mapNotes.filter((n) => n === RUSH_CARDS[0].replies[2].note)).toHaveLength(1);
    // card 5's quiet line is the notebook's newest page
    expect(s.mapNotes.at(-1)).toBe(IDRIS_NINE_YEARS_NOTE);
  });

  it('the usual is a tiny love letter — Idris\u2019s solo visit writes it', () => {
    const s = day1ServedWithAsks();
    s.cross(true);
    s.claimCart();
    s.confirmName('Corner Comet');
    for (let i = 0; i < SOLO_CARDS.length; i++) {
      s.openCartOrder();
      serveCard(s);
    }
    expect(s.mapNotes).toContain(USUAL_NOTE);
  });

  it('a repeat lesson is silence, not a second page', () => {
    const s = new GameState();
    expect(s.collectNote('a note')).toBe(true);
    expect(s.collectNote('a note')).toBe(false);
    expect(s.mapNotes).toHaveLength(1);
    expect(s.collectSlang('hero')).toBe(true);
    expect(s.collectSlang('hero')).toBe(false);
    expect(s.mapSlang).toHaveLength(1);
  });

  it('the notebook caps at 24 pages — the oldest lesson slides off', () => {
    const s = new GameState();
    for (let i = 0; i < 30; i++) s.collectNote(`note ${i}`);
    expect(s.mapNotes).toHaveLength(24);
    expect(s.mapNotes[0]).toBe('note 6');
  });
});

describe('the Map\u2019s pages ride the save (v1-safe, Save.ts migration law)', () => {
  it('snapshotForSave carries the pages from day 2 on', () => {
    const s = day1ServedWithAsks();
    s.day = 2;
    s.dayComplete = true;
    const snap = s.snapshotForSave();
    expect(snap?.map_notes).toContain(RUSH_CARDS[0].replies[2].note);
    expect(snap?.map_slang).toContain('regular');
  });

  it('day 1 never writes (the whole snapshot is null)', () => {
    const s = day1ServedWithAsks();
    expect(s.snapshotForSave()).toBeNull();
  });

  it('a pre-Map v1 save (no map fields) parses unchanged, pages empty', () => {
    const old = JSON.stringify({
      day: 2, day_complete: true, replay: false, cart_name: 'Old Cart', money: 100,
      awning: false, kid_kept: true, idris_served: true, lunch_served: 0,
    });
    const p = parseSave(old);
    expect(p.day).toBe(2);
    expect(p.cart_name).toBe('Old Cart');
    expect(p.map_notes).toEqual([]);
    expect(p.map_slang).toEqual([]);
  });

  it('a corrupted map_notes list is an empty page, never a crash', () => {
    const broken = JSON.stringify({ day: 2, map_notes: 'not a list', map_slang: 42, money: 90 });
    const p = parseSave(broken);
    expect(p.map_notes).toEqual([]);
    expect(p.map_slang).toEqual([]);
    const junk = JSON.stringify({ day: 2, map_notes: [1, null, 'a real note', ''] });
    const p2 = parseSave(junk);
    expect(p2.map_notes).toEqual(['a real note']);
  });

  it('defaultSave ships empty pages', () => {
    const d: SaveData = defaultSave();
    expect(d.map_notes).toEqual([]);
    expect(d.map_slang).toEqual([]);
  });
});

describe('the gold window\u2019s referent exists (docs/12 requirement 6)', () => {
  it('the kid is served his cold cup before the window can quote him', () => {
    const s = day1ServedWithAsks();
    s.cross(true);
    s.claimCart();
    s.confirmName('X');
    s.openCartOrder(); serveCard(s);       // stroller
    expect(s.kidDay1Served).toBe(false);   // not yet
    s.openCartOrder(); serveCard(s, 0);    // the kid — just make something cold
    expect(s.kidDay1Served).toBe(true);
    // the ending line names the order he actually made
    expect(GOLD_WINDOW_NOTE).toContain('whatever\u2019s cold');
  });
});

describe('the sketch — Map draws only what it has seen (docs/12 upgrade)', () => {
  it('revealPlace is deduped and order-earned', () => {
    const s = new GameState();
    expect(s.revealPlace('terminal')).toBe(true);
    expect(s.revealPlace('terminal')).toBe(false); // never written twice
    expect(s.revealPlace('court')).toBe(true);
    expect(s.visitedPlaces).toEqual(['terminal', 'court']);
    expect(s.hasSeenPlace('court')).toBe(true);
    expect(s.hasSeenPlace('park')).toBe(false);
  });

  it('the born places exist and are first-session-guaranteed', () => {
    const born = MAP_PLACES.filter((p) => p.born).map((p) => p.id);
    expect(born).toContain('terminal');
    expect(born).toContain('bodega');
    expect(born).toContain('cart');
    // every place has the fields the sketch needs
    for (const p of MAP_PLACES) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
  });

  it('the visited list rides the save (roundtrip through the parse)', () => {
    const s = new GameState();
    s.day = 3; // snapshotForSave is honest: day 1 never writes
    s.revealPlace('terminal');
    s.revealPlace('court');
    const snap = s.snapshotForSave();
    expect(snap).not.toBeNull();
    const parsed = parseSave(JSON.stringify(snap));
    expect(parsed.map_places).toEqual(['terminal', 'court']);
  });
});

describe('the crooked copy (docs/51 B11 — Map copies Priya\u2019s lines badly)', () => {
  it('latches once: the doodle is a keepsake, not a counter', () => {
    const s = new GameState();
    expect(s.priyaLinesCopied).toBe(false);
    expect(s.copyPriyaLines()).toBe(true);
    expect(s.copyPriyaLines()).toBe(false); // one teach, one doodle
    expect(s.priyaLinesCopied).toBe(true);
  });

  it('is independent of the place sketch (a ride beat, not a walk)', () => {
    const s = new GameState();
    s.copyPriyaLines();
    expect(s.visitedPlaces).toEqual([]); // no place was walked
    expect(s.hasSeenPlace('terminal')).toBe(false);
  });

  it('rides the save (roundtrip through the parse)', () => {
    const s = new GameState();
    s.day = 2; // snapshotForSave is honest: day 1 never writes
    s.copyPriyaLines();
    const snap = s.snapshotForSave();
    expect(snap).not.toBeNull();
    const parsed = parseSave(JSON.stringify(snap));
    expect(parsed.map_priya_lines).toBe(true);
  });

  it('an old save (no map_priya_lines field) reads as an untaught page', () => {
    const old = parseSave(JSON.stringify({ day: 2, money: 90 }));
    expect(old.map_priya_lines ?? false).toBe(false);
    // and a corrupted field degrades to false, never a crash (save.gd law)
    const junk = parseSave(JSON.stringify({ day: 2, map_priya_lines: 'yes' }));
    expect(junk.map_priya_lines).toBe(false);
  });
});
