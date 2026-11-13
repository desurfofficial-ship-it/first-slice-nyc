/**
 * Entity & identity contracts — Foundation C
 * (docs/architecture/world-contract/04 + 08).
 *
 * These are DATA shapes, not classes: the simulation's persistent state is
 * plain, serializable records owned by the systems that create them (the
 * ownership law, docs/architecture/world-contract/05 §2). Rendering reads
 * them; nothing in the scene graph owns gameplay state (the shipped
 * GameState law, extended to the whole world).
 *
 * What exists here now: the shapes + their construction/validation rules —
 * the "prevent invalid states at the door" layer. What deliberately does
 * NOT exist yet: needs/mood/ambition scaling, opinion matrices, daily
 * knowledge diffusion. Those belong to Workstream B (NPC simulation) once
 * these foundations are load-bearing.
 */

import { isSimId, relId, simKindOf } from './ids';
import type { PlaceTag } from './registry';

// ------------------------------------------------------------------ npc ----

/** Fidelity tiers — the simulation-cost law (directive PART 4 Foundation C).
 *  An NPC's tier is a presentation/scheduling decision; STATE is identical
 *  at every tier, so stepping up or down never invents or loses a life. */
export type SimFidelity = 'full' | 'background' | 'abstract';

/** Where an NPC is, in sim terms — never a THREE.Vector3. A place reference
 *  (registry or semantic id) plus an optional interior id. */
export interface NpcLocation {
  /** Registry place id (building/park/station), interior id, or a semantic
   *  alias id (`loc:off_map`). Off-map lives (Harlem Hospital) are aliases —
   *  the registry cannot point there, the story can. */
  placeId: string;
  /** When the NPC is inside, the interior (TERMINAL-INT …). */
  interiorId?: string;
  /** World XZ when the NPC is at an exact spot (a bench, a corner). Sim
   *  state; the renderer may use it, but it is not authoritative for it. */
  x?: number;
  z?: number;
}

/** One person's persistent life. Everything a save needs to rebuild them. */
export interface NpcState {
  id: string;                    // npc:<local>, stable forever
  displayName: string;           // "Rosa Delgado"
  /** Canon archetype from the character bible (docs/narrative/05) — free
   *  text; the narrative workstream owns richer profiles. */
  archetype?: string;
  /** Residence, workplace, and the usual haunts — place references. */
  homePlaceId: string;
  workPlaceId?: string;
  /** Employment, in contract terms: employer business id + a role label. */
  employerBizId?: string;
  jobTitle?: string;
  /** The day's plan (see sim/schedule). Owned by the schedule system. */
  scheduleId?: string;
  /** Current location — owned by the SPATIAL system; every other system
   *  reads it through the world state's location index. */
  location: NpcLocation;
  /** Money in CENTS. Personal finance is real; amounts are integers. */
  moneyCents: number;
  /** Inventory by item sim id (item:*). */
  inventory: string[];
  /** Relationship edges this NPC participates in (rel:* ids). Edges live
   *  once, in the world's relationship map, never duplicated here. */
  relationships: string[];
  /** Things this NPC knows (event/flag sim ids). Knowledge gates dialogue
   *  and narrative (a character cannot reference what they never learned). */
  knowledge: string[];
  /** Simulation detail level — set by the fidelity manager, not the story. */
  fidelity: SimFidelity;
}

/** Relationship edge, once per unordered pair (rel:a__b). */
export interface RelationshipState {
  id: string;                    // rel:<a>__<b>
  a: string;                     // npc id, sorted first
  b: string;
  /** Warmth in [-100, 100]: hostility → devotion. Integer. */
  warmth: number;
  /** Trust in [0, 100]: how much of themselves they will show. */
  trust: number;
  /** History that must not be lost: event sim ids both remember. */
  sharedEvents: string[];
}

// ------------------------------------------------------------- business ----

/** Operating state of a business. Money lives in the economy ledger; this
 *  record owns identity, premises, hours, and solvency policy. */
export interface BusinessState {
  id: string;                    // biz:<local>
  name: string;
  /** The premises — a registry building id (ROS-01, KTN-04 …). */
  premisesBuildingId: string;
  /** Interior id when customers go inside (BODEGA-INT …). */
  interiorId?: string;
  /** Operating hours in minutes-of-day. A business "open" outside these
   *  hours is a validation violation (the narrative guardrail law). */
  opensAtMin: number;
  closesAtMin: number;
  /** Days of the week it operates (Mon..Sun, canon weekday names). */
  days: WeekdayName[];
  /** Owner npc. */
  ownerNpcId: string;
  /** Staff npc ids (owner excluded). */
  staffNpcIds: string[];
  /** Account balance in cents (mirrors the ledger head; see sim/economy). */
  balanceCents: number;
  /** A business may run at a loss only this many ticks before it must
   *  react (close, cut hours) — the solvency guardrail. 0 = must stay
   *  solvent every tick (default for now; Workstream D owns tuning). */
  graceTicks: number;
  /** Tags inherited by the premises for semantic queries. */
  tags: PlaceTag[];
}

export type WeekdayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

// ----------------------------------------------------------------- items ----

/** An inventory possession. Identity + metadata; quantities live in the
 *  owner's list (stackable items may repeat the id). */
export interface ItemState {
  id: string;                    // item:<local>
  name: string;
  /** Where it physically is, if anywhere. */
  holderNpcId?: string;
  holderBizId?: string;
  holderPlaceId?: string;
  /** Value in cents (what the economy believes, not what sentiment does). */
  valueCents?: number;
}

// ----------------------------------------------------------------- events ----

/** A world event occurrence (not narrative-authored content — the
 *  narrative contract in sim/narrative.ts layers on top of this). */
export interface WorldEventRecord {
  id: string;                    // evt:<local>
  /** The tick it happened (clock ordering, deterministic). */
  tick: number;
  /** What happened — a stable kind + free-text detail for the diary. */
  kind: string;
  detail?: string;
  placeId?: string;
  npcIds?: string[];
}

// ------------------------------------------------------------- validation ----

export type EntityIssueCode =
  | 'BAD_ID' | 'BAD_REF' | 'BAD_MONEY' | 'BAD_RELATION'
  | 'BAD_HOURS' | 'BAD_OWNER' | 'DUPLICATE';

export interface EntityIssue {
  code: EntityIssueCode;
  detail: string;
}

const WEEKDAYS: readonly WeekdayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Validate NPC records against the id/ref laws. `placeExists` decides
 *  place references (the registry decides what exists). */
export function validateNpcs(
  npcs: readonly NpcState[],
  placeExists: (id: string) => boolean,
): EntityIssue[] {
  const issues: EntityIssue[] = [];
  const seen = new Set<string>();
  for (const n of npcs) {
    if (simKindOf(n.id) !== 'npc') { issues.push({ code: 'BAD_ID', detail: n.id }); continue; }
    if (seen.has(n.id)) issues.push({ code: 'DUPLICATE', detail: n.id });
    seen.add(n.id);
    if (!placeExists(n.homePlaceId)) {
      issues.push({ code: 'BAD_REF', detail: `${n.id} home → ${n.homePlaceId}` });
    }
    if (n.workPlaceId && !placeExists(n.workPlaceId)) {
      issues.push({ code: 'BAD_REF', detail: `${n.id} work → ${n.workPlaceId}` });
    }
    if (!Number.isSafeInteger(n.moneyCents) || n.moneyCents < 0) {
      issues.push({ code: 'BAD_MONEY', detail: `${n.id} money ${n.moneyCents}` });
    }
    for (const it of n.inventory) {
      if (simKindOf(it) !== 'item') issues.push({ code: 'BAD_REF', detail: `${n.id} inventory → ${it}` });
    }
    for (const r of n.relationships) {
      if (simKindOf(r) !== 'rel') issues.push({ code: 'BAD_RELATION', detail: `${n.id} → ${r}` });
    }
    for (const k of n.knowledge) {
      if (!isSimId(k)) issues.push({ code: 'BAD_REF', detail: `${n.id} knowledge → ${k}` });
    }
    if (n.location.placeId && !placeExists(n.location.placeId) && simKindOf(n.location.placeId) !== 'loc') {
      issues.push({ code: 'BAD_REF', detail: `${n.id} location → ${n.location.placeId}` });
    }
  }
  return issues;
}

export function validateBusinesses(
  bizs: readonly BusinessState[],
  npcs: readonly NpcState[],
  placeExists: (id: string) => boolean,
): EntityIssue[] {
  const issues: EntityIssue[] = [];
  const npcIds = new Set(npcs.map((n) => n.id));
  const seen = new Set<string>();
  for (const b of bizs) {
    if (simKindOf(b.id) !== 'biz') { issues.push({ code: 'BAD_ID', detail: b.id }); continue; }
    if (seen.has(b.id)) issues.push({ code: 'DUPLICATE', detail: b.id });
    seen.add(b.id);
    if (!placeExists(b.premisesBuildingId)) {
      issues.push({ code: 'BAD_REF', detail: `${b.id} premises → ${b.premisesBuildingId}` });
    }
    if (!npcIds.has(b.ownerNpcId)) {
      issues.push({ code: 'BAD_OWNER', detail: `${b.id} owner → ${b.ownerNpcId}` });
    }
    for (const s of b.staffNpcIds) {
      if (!npcIds.has(s)) issues.push({ code: 'BAD_REF', detail: `${b.id} staff → ${s}` });
    }
    if (!(b.opensAtMin >= 0 && b.opensAtMin <= 1440 && b.closesAtMin >= 0 && b.closesAtMin <= 1440)
      || b.opensAtMin === b.closesAtMin) {
      issues.push({ code: 'BAD_HOURS', detail: `${b.id} ${b.opensAtMin}..${b.closesAtMin}` });
    }
    for (const d of b.days) {
      if (!WEEKDAYS.includes(d)) issues.push({ code: 'BAD_HOURS', detail: `${b.id} day ${d}` });
    }
    if (!Number.isSafeInteger(b.balanceCents)) {
      issues.push({ code: 'BAD_MONEY', detail: `${b.id} balance ${b.balanceCents}` });
    }
  }
  return issues;
}

/** Build a relationship edge record (validating the pair). */
export function makeRelationship(a: string, b: string, warmth = 0, trust = 25): RelationshipState {
  return { id: relId(a, b), a: a < b ? a : b, b: a < b ? b : a, warmth, trust, sharedEvents: [] };
}

/** Is the business operating at (minuteOfDay, weekday)? Pure. */
export function businessIsOpen(b: BusinessState, minuteOfDay: number, weekday: WeekdayName): boolean {
  if (!b.days.includes(weekday)) return false;
  const m = Math.floor(minuteOfDay);
  if (b.opensAtMin <= b.closesAtMin) {
    return m >= b.opensAtMin && m < b.closesAtMin;
  }
  // overnight business (e.g. 18:00–02:00): open past midnight into the
  // SAME weekday record only — overnight spans are modeled with two records
  return m >= b.opensAtMin || m < b.closesAtMin;
}
