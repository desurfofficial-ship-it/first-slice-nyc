/**
 * The narrative contract & state validation — Foundation E
 * (docs/architecture/world-contract/10).
 *
 * This module is the TECHNICAL seam between the simulation and the story.
 * The storyline itself belongs to the Narrative Director (docs/narrative/
 * 00–15, canon — this module never touches it). What lives here:
 *
 *   1. The state model narrative content may rely on: story flags,
 *      character availability, event records, chapter state, the
 *      consequence ledger, missable windows — typed to the narrative
 *      implementation spec (docs/narrative/14, R1–R8) so the narrative
 *      workstream plugs in without inventing new world plumbing.
 *
 *   2. VALIDATION of authored events against the actual world: a story
 *      event cannot reference an NPC who does not exist, require a
 *      building that is not in the registry, double-book a character,
 *      fire inside a closed business, or run before its prerequisites —
 *      the "no impossible narrative states" guardrail (directive PART 4
 *      Foundation E). Nothing here edits the story; invalid execution is
 *      refused loudly and resolved by explicit fallback policy.
 *
 *   3. Fallback resolution: unavailable NPC / location / business,
 *      unsatisfied prerequisite, interrupted event → DEFER, RESCHEDULE,
 *      RELOCATE or CANCEL — deliberately, never silently.
 *
 * Status note (honesty law): the schemas below are the CONTRACT; the
 * full ledger/rails MACHINES are Workstream C's build (docs/narrative/14
 * §7 order). What is implemented here and tested: flag store, character
 * availability registry, event validation, double-booking detection,
 * business-hours checks, prerequisite gating, and the fallback planner.
 */

import type { GameClock } from './clock';
import { businessIsOpen, type BusinessState, type NpcState, type RelationshipState } from './entities';
import type { WorldRegistry } from './registry';
import { relId, simId } from './ids';

// ---------------------------------------------------------------- flags ----

/** Persistent story/world flags — `flag:<local>` sim ids, set-once or
 *  overwritten by explicit rule. The single source: state.flags. */
export interface FlagStore {
  /** flag id → the tick when it was set (ordering without a list). */
  readonly map: Map<string, number>;
  set(flagId: string, tick: number): void;
  has(flagId: string): boolean;
  setAt(flagId: string): number | undefined;
}

export function newFlags(): FlagStore {
  const map = new Map<string, number>();
  return {
    map,
    set(flagId, tick) {
      if (!flagId.startsWith('flag:') && !flagId.startsWith('evt:')) {
        throw new Error(`sim/narrative: flags must be flag:/evt: ids, got "${flagId}"`);
      }
      map.set(flagId, tick);
    },
    has: (f) => map.has(f),
    setAt: (f) => map.get(f),
  };
}

// ---------------------------------------------------------- availability ----

/** Why a character is (or is not) available to the story right now. */
export type AvailabilityReason =
  | 'free' | 'working' | 'sleeping' | 'away' | 'in_event'
  | 'story_hidden';

export interface CharacterAvailability {
  npcId: string;
  reason: AvailabilityReason;
  /** The event id currently holding them (reason 'in_event'). */
  heldBy?: string;
  /** When 'away' — where they are, for the diary's honesty. */
  awayPlaceId?: string;
  /** Tick when the availability re-evaluates (0 = no schedule). */
  reviewTick: number;
}

/**
 * The availability registry. The default rule is SCHEDULE-DRIVEN: an NPC
 * is reachable when their arbitrated activity allows interruption
 * (anything at NORMAL/LOW) and not 'story_hidden'. Explicit holds
 * (cutscenes, ceremonies) outrank schedules until released.
 */
export class AvailabilityRegistry {
  private holds = new Map<string, CharacterAvailability>();

  /** The current tick, injected once per read context (keeps this class
   *  free of clock imports; a hold read without a tick set simply never
   *  auto-expires — tests inject, the world injects). */
  private _now = 0;
  now(tick: number): void { this._now = tick; }

  hold(a: CharacterAvailability): void {
    this.holds.set(a.npcId, a);
  }

  release(npcId: string): void {
    this.holds.delete(npcId);
  }

  /** Can a story event currently pull this character? */
  canAttend(npc: NpcState, currentActivityPriority: number | undefined, clock: GameClock): boolean {
    const hold = this.holds.get(npc.id);
    if (hold) {
      if (hold.reviewTick && clock.tick > hold.reviewTick) this.holds.delete(npc.id);
      else return false;
    }
    // sleeping NPCs are not pulled by ordinary events (EMERGENCY events may
    // be — the caller decides by event urgency)
    if (currentActivityPriority !== undefined && currentActivityPriority <= 1) return false;
    return true;
  }

  heldBy(npcId: string): CharacterAvailability | undefined {
    const hold = this.holds.get(npcId);
    if (hold && hold.reviewTick && this._now >= hold.reviewTick) {
      this.holds.delete(npcId);
      return undefined;
    }
    return hold;
  }
}

// ------------------------------------------------------------- the events ----

/** A prerequisite condition on a story event. Closed set; the narrative
 *  workstream extends it WITH tests, never by silent injection. */
export type NarrativeCondition =
  | { kind: 'flag'; flagId: string }
  | { kind: 'notFlag'; flagId: string }
  | { kind: 'dayAtLeast'; day: number }
  | { kind: 'chapterAtLeast'; chapter: number }
  | { kind: 'relationshipAtLeast'; npcId: string; warmth: number }
  | { kind: 'businessOpen'; bizId: string }
  | { kind: 'npcKnown'; npcId: string; knowledgeId: string };

/** When the event may run (in-game calendar only — narrative R4/R8). */
export interface EventWindow {
  /** First in-game day the event may fire. */
  opensAtDay: number;
  /** Last in-game day (inclusive). Beyond it the event is missed — the
   *  missable-window law (R6): onMiss writes a world change, never a nag. */
  closesAtDay?: number;
  /** Optional time-of-day band, minutes-of-day. */
  bandStartMin?: number;
  bandEndMin?: number;
}

/**
 * An authored story event, as the sim sees it. The narrative bible's
 * scenes/choices/consequences hang off this spine; the sim validates the
 * spine, not the prose.
 */
export interface StoryEvent {
  id: string;                     // evt:<local>
  title: string;
  /** Characters who must attend. */
  npcIds: string[];
  /** Where it must happen — a registry place/interior or semantic alias. */
  placeId?: string;
  /** A business that must be OPEN for the scene (a diner scene needs the
   *  diner operating). */
  requiresBusinessId?: string;
  window?: EventWindow;
  prereqs: NarrativeCondition[];
  /** Event priority — EMERGENCY events may wake sleepers; the matrix applies. */
  priority?: number;
  /** What happens if it cannot run (explicit, never silent). */
  onFail?: 'defer' | 'reschedule' | 'cancel';
}

// --------------------------------------------------------------- chapters ----

/** Chapter state — the rails engine's container (docs/narrative/14 R1/R8),
 *  declared here so world state has a home for it from day one. */
export interface ChapterState {
  chapter: number;                 // 0..6 then open-endgame (7 = OPEN)
  rails: Record<string, { fired: boolean; tick?: number }>;
  calendarDay: number;             // the chapter system's own day watermark
}

// ---------------------------------------------------------------- ledger ----

/** The consequence ledger entry (docs/narrative/14 R2). Append-only. */
export interface LedgerEntry {
  id: string;
  kind: 'choice' | 'promise' | 'omission' | 'amends';
  day: number;
  refs: string[];
  weight: number;
  visibility: 'public' | 'private' | 'hidden';
}

/** A missable-content window (docs/narrative/14 R6). */
export interface MissableWindow {
  id: string;
  opensAtDay: number;
  closesAtDay: number;
  onMiss: string;   // the world-change event id written on expiry
}

// ------------------------------------------------------------- validation ----

export type NarrativeViolationCode =
  | 'NPC_MISSING' | 'NPC_DOUBLE_BOOKED' | 'NPC_UNAVAILABLE'
  | 'PLACE_MISSING' | 'PLACE_INACCESSIBLE'
  | 'BUSINESS_MISSING' | 'BUSINESS_CLOSED'
  | 'PREREQ_UNSATISFIED' | 'WINDOW_NOT_OPEN' | 'WINDOW_MISSED';

export interface NarrativeViolation {
  code: NarrativeViolationCode;
  detail: string;
}

export interface NarrativeValidationOk { ok: true }
export interface NarrativeValidationFail { ok: false; violations: NarrativeViolation[] }

export interface ValidateWorld {
  registry: WorldRegistry;
  npcs: ReadonlyMap<string, NpcState>;
  businesses: ReadonlyMap<string, BusinessState>;
  /** Relationship edges by rel id (see sim/ids relId). */
  relationships: ReadonlyMap<string, RelationshipState>;
  /** The player's npc id — relationship conditions are against the player
   *  unless the condition names both parties explicitly. */
  playerNpcId: string;
  flags: FlagStore;
  availability: AvailabilityRegistry;
  /** npc id → the priority of their current arbitrated activity. */
  activityPriority: ReadonlyMap<string, number>;
  /** npc id → event id currently holding them in-scene. */
  inEvent: ReadonlyMap<string, string>;
  clock: GameClock;
  chapter: number;
}

/**
 * Validate a story event against the world. Pure. Every "cannot happen"
 * from the directive's Foundation E list maps to a violation code here.
 */
export function validateEvent(
  event: StoryEvent,
  w: ValidateWorld,
): NarrativeValidationOk | NarrativeValidationFail {
  const v: NarrativeViolation[] = [];
  const push = (code: NarrativeViolationCode, detail: string) => v.push({ code, detail });
  w.availability.now(w.clock.tick); // hold expiry runs on every validation pass

  // characters exist
  for (const id of event.npcIds) {
    if (!w.npcs.has(id)) { push('NPC_MISSING', `${event.id} → ${id}`); continue; }
    // not already in another scene (double-booking)
    const holding = w.inEvent.get(id);
    if (holding && holding !== event.id) push('NPC_DOUBLE_BOOKED', `${id} held by ${holding}`);
    // reachable now?
    const npc = w.npcs.get(id)!;
    if (!w.availability.canAttend(npc, w.activityPriority.get(id), w.clock)) {
      push('NPC_UNAVAILABLE', `${id} (${w.availability.heldBy(id)?.reason ?? 'occupied'})`);
    }
  }

  // place exists and is accessible to every attendee
  if (event.placeId) {
    const point = w.registry.placePoint(event.placeId);
    if (!point && !event.placeId.startsWith('loc:')) {
      push('PLACE_MISSING', `${event.id} → ${event.placeId}`);
    } else {
      // every named character can physically reach a registry place
      // (semantic aliases are the author's promise; registry ids are checked)
      for (const id of event.npcIds) {
        const npc = w.npcs.get(id);
        if (!npc) continue;
        if (!canReach(npc, event.placeId, w.registry)) {
          push('PLACE_INACCESSIBLE', `${id} cannot reach ${event.placeId}`);
        }
      }
    }
  }

  // business open
  if (event.requiresBusinessId) {
    const biz = w.businesses.get(event.requiresBusinessId);
    if (!biz) push('BUSINESS_MISSING', `${event.id} → ${event.requiresBusinessId}`);
    else if (!businessIsOpen(biz, w.clock.minuteOfDay, w.clock.weekday)) {
      push('BUSINESS_CLOSED', `${biz.id} at ${w.clock.time} on ${w.clock.weekday}`);
    }
  }

  // prerequisites
  for (const c of event.prereqs) {
    if (!conditionMet(c, w)) {
      push('PREREQ_UNSATISFIED', describeCondition(c));
    }
  }

  // window
  if (event.window) {
    const day = w.clock.day;
    if (day < event.window.opensAtDay) push('WINDOW_NOT_OPEN', `${event.id} opens day ${event.window.opensAtDay}, now day ${day}`);
    else if (event.window.closesAtDay !== undefined && day > event.window.closesAtDay) {
      push('WINDOW_MISSED', `${event.id} closed day ${event.window.closesAtDay}, now day ${day}`);
    } else if (event.window.bandStartMin !== undefined && event.window.bandEndMin !== undefined) {
      const m = w.clock.minuteOfDay;
      const inBand = event.window.bandStartMin <= m && m < event.window.bandEndMin;
      if (!inBand) push('WINDOW_NOT_OPEN', `${event.id} band ${event.window.bandStartMin}..${event.window.bandEndMin}, now ${m}`);
    }
  }

  return v.length === 0 ? { ok: true } : { ok: false, violations: v };
}

function canReach(npc: NpcState, placeId: string, registry: WorldRegistry): boolean {
  // Accessibility rule, v1: a place is reachable when it RESOLVES — a
  // registry place (the neighborhood is walkable by construction) or a
  // declared semantic alias. Off-map NPCs reach on-map places the same
  // way everyone does: they walk in. Door/key access control (a locked
  // room, a members-only floor) lands with the spatial workstream and
  // will tighten THIS function — its violation code is already wired.
  void npc;
  return registry.placePoint(placeId) !== null || placeId.startsWith('loc:');
}

function conditionMet(c: NarrativeCondition, w: ValidateWorld): boolean {
  switch (c.kind) {
    case 'flag': return w.flags.has(c.flagId);
    case 'notFlag': return !w.flags.has(c.flagId);
    case 'dayAtLeast': return w.clock.day >= c.day;
    case 'chapterAtLeast': return w.chapter >= c.chapter;
    case 'relationshipAtLeast': {
      const rel = w.relationships.get(relId(w.playerNpcId, c.npcId));
      return !!rel && rel.warmth >= c.warmth;
    }
    case 'businessOpen': {
      const biz = w.businesses.get(c.bizId);
      return !!biz && businessIsOpen(biz, w.clock.minuteOfDay, w.clock.weekday);
    }
    case 'npcKnown': {
      const npc = w.npcs.get(c.npcId);
      return !!npc && npc.knowledge.includes(c.knowledgeId);
    }
  }
}

function describeCondition(c: NarrativeCondition): string {
  switch (c.kind) {
    case 'flag': return `flag ${c.flagId}`;
    case 'notFlag': return `!flag ${c.flagId}`;
    case 'dayAtLeast': return `day ≥ ${c.day}`;
    case 'chapterAtLeast': return `chapter ≥ ${c.chapter}`;
    case 'relationshipAtLeast': return `${c.npcId} warmth ≥ ${c.warmth}`;
    case 'businessOpen': return `${c.bizId} open`;
    case 'npcKnown': return `${c.npcId} knows ${c.knowledgeId}`;
  }
}

// --------------------------------------------------------------- fallback ----

export type FallbackAction =
  | { action: 'defer'; retryAtTick: number; reason: NarrativeViolationCode }
  | { action: 'reschedule'; toDay: number; reason: NarrativeViolationCode }
  | { action: 'relocate'; toPlaceId: string; reason: NarrativeViolationCode }
  | { action: 'cancel'; writeFlag: string; reason: NarrativeViolationCode };

/**
 * The deliberate fallback planner. Given the violations, produce ONE
 * action the world can take — the "never silently force an invalid event"
 * law. Policy, in order:
 *   - WINDOW_MISSED            → cancel (write evt:<id>_missed — the miss
 *                                is content; R6's no-nag rule)
 *   - BUSINESS_CLOSED          → reschedule to the next opening day at the
 *                                business's opensAtMin
 *   - PLACE_MISSING/INACCESSIBLE → relocate to the nearest place carrying
 *                                  the 'social_gathering' tag (a
 *                                  confrontation needs people, not a room)
 *   - NPC_UNAVAILABLE/DOUBLE_BOOKED → defer one in-game hour
 *   - PREREQ_UNSATISFIED       → defer one in-game day
 *   - NPC_MISSING/BUSINESS_MISSING → cancel loudly (authored data bug)
 */
export function planFallback(
  event: StoryEvent,
  violations: NarrativeViolation[],
  w: ValidateWorld,
): FallbackAction {
  const first = violations[0];
  const code = first?.code ?? 'PREREQ_UNSATISFIED';
  switch (code) {
    case 'WINDOW_MISSED':
      return { action: 'cancel', writeFlag: simId('flag', `${event.id}_missed`), reason: code };
    case 'BUSINESS_CLOSED': {
      const biz = event.requiresBusinessId ? w.businesses.get(event.requiresBusinessId) : undefined;
      const toDay = biz && w.clock.minuteOfDay >= biz.closesAtMin ? w.clock.day + 1 : w.clock.day;
      return { action: 'reschedule', toDay, reason: code };
    }
    case 'PLACE_MISSING':
    case 'PLACE_INACCESSIBLE': {
      const alt = w.registry.findPlaces({
        tags: ['social_gathering', 'public_access'],
        nearX: w.registry.placePoint(event.placeId ?? 'PRK-PLAZA')?.x,
        nearZ: w.registry.placePoint(event.placeId ?? 'PRK-PLAZA')?.z,
        limit: 1,
      })[0];
      return { action: 'relocate', toPlaceId: alt?.id ?? 'PRK-PLAZA', reason: code };
    }
    case 'NPC_UNAVAILABLE':
    case 'NPC_DOUBLE_BOOKED':
      return { action: 'defer', retryAtTick: w.clock.tick + 60, reason: code };
    case 'PREREQ_UNSATISFIED':
    case 'WINDOW_NOT_OPEN':
      return { action: 'defer', retryAtTick: w.clock.tick + 1440, reason: code };
    case 'NPC_MISSING':
    case 'BUSINESS_MISSING':
      return { action: 'cancel', writeFlag: simId('flag', `${event.id}_authored_bad`), reason: code };
  }
}
