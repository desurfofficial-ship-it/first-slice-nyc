/**
 * sim/narrative — the narrative contract & state validation (world-contract/10).
 * The seam the Narrative Director's content plugs into — proven here with
 * the reference world's TECHNICAL EXAMPLE events.
 */
import { describe, it, expect } from 'vitest';
import { loadRegistry } from '../src/sim/registry';
import { buildReferenceWorld, referencePlaceExists } from '../src/sim/reference';
import {
  validateEvent, planFallback, newFlags, AvailabilityRegistry,
  type StoryEvent, type ValidateWorld, type NarrativeViolation,
} from '../src/sim/narrative';
import { GameClock } from '../src/sim/clock';

function baseWorld(): { w: ValidateWorld; refs: ReturnType<typeof buildReferenceWorld>; inEvent: Map<string, string>; relationships: Map<string, import('../src/sim/entities').RelationshipState> } {
  const registry = loadRegistry();
  const refs = buildReferenceWorld(referencePlaceExists((id) => registry.placePoint(id) !== null));
  const clock = new GameClock({ day: 1, minuteOfDay: 8 * 60 + 5 }); // Tue, 08:05
  const inEvent = new Map<string, string>();
  const relationships = new Map(refs.world.relationships);
  const w: ValidateWorld = {
    registry,
    npcs: new Map(refs.world.npcs.map((n) => [n.id, n])),
    businesses: new Map(refs.world.businesses.map((b) => [b.id, b])),
    relationships,
    playerNpcId: 'npc:leo_marsh',
    flags: refs.world.flags,
    availability: refs.world.availability,
    activityPriority: new Map(),
    inEvent,
    clock,
    chapter: 0,
  };
  return { w, refs, inEvent, relationships };
}

/** Narrowing helper: a fail result's violations, or a loud test failure. */
function violationsOf(r: ReturnType<typeof validateEvent>): NarrativeViolation[] {
  expect(r.ok).toBe(false);
  return r.ok ? [] : r.violations;
}

describe('sim/narrative — impossible states refuse politely', () => {
  it('a valid event passes: the morning regular at the open deli', () => {
    const { w, refs } = baseWorld();
    const evt = refs.events.find((e) => e.id === 'evt:example_morning_regular')!;
    expect(validateEvent(evt, w)).toEqual({ ok: true });
  });

  it('NPC_MISSING: a story event cannot cast a person the world does not have', () => {
    const { w } = baseWorld();
    const evt: StoryEvent = {
      id: 'evt:bad_cast', title: 'ghost write', npcIds: ['npc:nobody_here'], prereqs: [],
    };
    expect(violationsOf(validateEvent(evt, w))[0].code).toBe('NPC_MISSING');
  });

  it('PLACE_MISSING: no scene in a building the registry has never heard of', () => {
    const { w } = baseWorld();
    const evt: StoryEvent = {
      id: 'evt:bad_place', title: 'nowhere', npcIds: ['npc:rosa_delgado'],
      placeId: 'VOID-99', prereqs: [],
    };
    expect(violationsOf(validateEvent(evt, w)).map((v) => v.code)).toContain('PLACE_MISSING');
  });

  it('NPC_DOUBLE_BOOKED: no character attends two scenes at once', () => {
    const { w, refs, inEvent } = baseWorld();
    inEvent.set('npc:idris_warsame', 'evt:other_scene_now');
    const evt = refs.events.find((e) => e.id === 'evt:example_platform_edition')!;
    expect(violationsOf(validateEvent(evt, w)).map((v) => v.code)).toContain('NPC_DOUBLE_BOOKED');
  });

  it('BUSINESS_MISSING / BUSINESS_CLOSED: scenes obey operating reality', () => {
    const { w, refs } = baseWorld();
    // the example references biz:alder_heights_diner, which the manifest
    // deliberately does NOT register → BUSINESS_MISSING (authored-data bug path)
    const dark = refs.events.find((e) => e.id === 'evt:example_closed_shop')!;
    expect(violationsOf(validateEvent(dark, w)).map((v) => v.code)).toContain('BUSINESS_MISSING');
    // and the CLOSED path: hold the deli past its hours
    const { w: w2, refs: refs2 } = baseWorld();
    w2.clock.setMinuteOfDay(23 * 60); // 23:00 — Rosa's closed at 22:00
    const openEvt = refs2.events.find((e) => e.id === 'evt:example_morning_regular')!;
    expect(violationsOf(validateEvent({ ...openEvt, window: undefined }, w2)).map((v) => v.code))
      .toContain('BUSINESS_CLOSED');
  });

  it('WINDOW_NOT_OPEN / WINDOW_MISSED: the calendar gates, never real time', () => {
    const { w } = baseWorld();
    const evt: StoryEvent = {
      id: 'evt:windowed', title: 'windowed', npcIds: ['npc:rosa_delgado'],
      prereqs: [],
      window: { opensAtDay: 10, closesAtDay: 12 },
    };
    expect(violationsOf(validateEvent(evt, w))[0].code).toBe('WINDOW_NOT_OPEN');
    w.clock.advance(19 * 1440); // day 20
    expect(violationsOf(validateEvent(evt, w))[0].code).toBe('WINDOW_MISSED');
  });

  it('PREREQ_UNSATISFIED: warmth gates the scene until the relationship earns it', () => {
    const { w, refs, relationships } = baseWorld();
    relationships.delete('rel:idris_warsame__leo_marsh'); // the Regular edge is gone
    const evt = refs.events.find((e) => e.id === 'evt:example_morning_regular')!;
    expect(violationsOf(validateEvent(evt, w)).map((v) => v.code)).toContain('PREREQ_UNSATISFIED');
  });

  it('NPC_UNAVAILABLE: a held character is not pulled into a scene', () => {
    const { w, refs } = baseWorld();
    w.availability.hold({ npcId: 'npc:idris_warsame', reason: 'story_hidden', reviewTick: 0 });
    const evt = refs.events.find((e) => e.id === 'evt:example_platform_edition')!;
    expect(violationsOf(validateEvent(evt, w)).map((v) => v.code)).toContain('NPC_UNAVAILABLE');
  });
});

describe('sim/narrative — the fallback planner is deliberate, never silent', () => {
  it('a missed window cancels and writes the miss as content (R6: the miss is the world)', () => {
    const { w } = baseWorld();
    const evt: StoryEvent = {
      id: 'evt:windowed', title: 'windowed', npcIds: [], prereqs: [],
      window: { opensAtDay: 1, closesAtDay: 2 },
    };
    w.clock.advance(5 * 1440);
    const plan = planFallback(evt, violationsOf(validateEvent(evt, w)), w);
    expect(plan).toEqual({ action: 'cancel', writeFlag: 'flag:evt:windowed_missed', reason: 'WINDOW_MISSED' });
  });

  it('an unavailable NPC defers by an hour; unsatisfied prereqs defer by a day', () => {
    const { w } = baseWorld();
    const busy: StoryEvent = { id: 'evt:a', title: '', npcIds: ['npc:rosa_delgado'], prereqs: [] };
    w.availability.hold({ npcId: 'npc:rosa_delgado', reason: 'in_event', reviewTick: 0 });
    expect(planFallback(busy, violationsOf(validateEvent(busy, w)), w))
      .toMatchObject({ action: 'defer', retryAtTick: w.clock.tick + 60, reason: 'NPC_UNAVAILABLE' });
    w.availability.release('npc:rosa_delgado');

    const gated: StoryEvent = {
      id: 'evt:b', title: '', npcIds: ['npc:rosa_delgado'],
      prereqs: [{ kind: 'flag', flagId: 'flag:not_yet_set' }],
    };
    expect(planFallback(gated, violationsOf(validateEvent(gated, w)), w))
      .toMatchObject({ action: 'defer', retryAtTick: w.clock.tick + 1440, reason: 'PREREQ_UNSATISFIED' });
  });

  it('missing authored data cancels loudly (a bug, not a story state)', () => {
    const { w } = baseWorld();
    const broken: StoryEvent = {
      id: 'evt:broken', title: '', npcIds: ['npc:ghost'], prereqs: [],
    };
    const plan = planFallback(broken, violationsOf(validateEvent(broken, w)), w);
    expect(plan.action).toBe('cancel');
    if (plan.action === 'cancel') expect(plan.writeFlag).toContain('authored_bad');
  });
});

describe('sim/narrative — flag store and availability plumbing', () => {
  it('flags accept flag:/evt:/node: and dimension=value keys; reject bare names', () => {
    const flags = newFlags();
    flags.set('flag:map_in_hand', 1234);
    expect(flags.has('flag:map_in_hand')).toBe(true);
    expect(flags.setAt('flag:map_in_hand')).toBe(1234);
    // choice selection pivots + downstream machine keys (N0 cold-open, N1a…)
    flags.set('node:N0=prompt-1', 50);
    flags.set('diary-voice-bias=prompt-1', 50);
    expect(flags.has('node:N0=prompt-1')).toBe(true);
    expect(flags.has('diary-voice-bias=prompt-1')).toBe(true);
    // bare / garbage still loud
    expect(() => flags.set('rosa_flag', 1)).toThrow(/flag:\/evt:\/node:/);
  });

  it('availability holds expire at their review tick', () => {
    const clock = new GameClock({ day: 1, minuteOfDay: 9 * 60 });
    const reg = new AvailabilityRegistry();
    reg.hold({ npcId: 'npc:x', reason: 'away', awayPlaceId: 'loc:away', reviewTick: clock.tick + 10 });
    expect(reg.heldBy('npc:x')).toBeTruthy();
    clock.advance(11);
    reg.now(clock.tick); // the world injects the tick before reading
    expect(reg.heldBy('npc:x')).toBeUndefined(); // auto-released on the read
  });
});
