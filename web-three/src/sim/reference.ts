/**
 * The reference world manifest — PART 6 proof
 * (docs/architecture/world-contract/13).
 *
 * A small, fully-validated slice of Alder Heights that proves the four
 * contracts work TOGETHER: real registry places, canon characters with
 * schedules, businesses with hours, an arbitration scenario, a ledger
 * with honest money, and sample narrative events that pass — and FAIL —
 * validation in exactly the contracted ways.
 *
 * CANON vs TECHNICAL EXAMPLE (the directive's separation law):
 *   - Places: registry ids (docs/data/world-registry.json) — canon.
 *   - Characters: from the character bible (docs/narrative/05) — canon.
 *     Names, workplaces, and habits follow the bible's profiles.
 *   - Schedules, business hours, relationship seeds, and the sample
 *     events: TECHNICAL EXAMPLES. They exercise the contracts; they are
 *     NOT storyline canon. The Narrative Director's timeline
 *     (docs/narrative/12) governs what actually happens and when; when
 *     Workstream C authors real content, it replaces these examples
 *     through this same manifest shape.
 */

import type { GameClock } from './clock';
import {
  makeRelationship, validateBusinesses, validateNpcs,
  type BusinessState, type NpcState, type RelationshipState,
} from './entities';
import type { NpcSchedule } from './schedule';
import { activityAt } from './schedule';
import type { StoryEvent } from './narrative';
import { createWorldState, type WorldState } from './state';
import { simId } from './ids';
import type { PlaceTag } from './registry';

// ------------------------------------------------------------- the people ----
// Character bible (docs/narrative/05 §2): canon identity, example schedules.

export const REFERENCE_NPCS: readonly NpcState[] = [
  {
    id: 'npc:leo_marsh', displayName: 'Leo Marsh',
    archetype: 'the protagonist (docs/narrative/02) — the Cecil\'s top floor',
    homePlaceId: 'KTS-02',                    // the Cecil, south row (canon)
    workPlaceId: 'loc:the_cart',              // the cart corner, Kestrel
    jobTitle: 'vendor',
    location: { placeId: 'loc:the_cart' },
    moneyCents: 0,                            // the ledger owns truth (acct:player)
    inventory: [],
    relationships: [],
    knowledge: [],
    fidelity: 'full',
  },
  {
    id: 'npc:rosa_delgado', displayName: 'Rosa Delgado',
    archetype: '2.2 — Rosa Delgado\'s corner deli; the court of appeals',
    homePlaceId: 'ROS-01',                    // lives over the store (bible)
    workPlaceId: 'ROS-01',
    employerBizId: 'biz:rosas_deli', jobTitle: 'owner',
    location: { placeId: 'ROS-01', interiorId: 'BODEGA-INT' },
    moneyCents: 0,                            // example value — ledger owns truth
    inventory: [],
    relationships: [],
    knowledge: [],
    fidelity: 'full',
  },
  {
    id: 'npc:eddie_carrasco', displayName: 'Eddie Carrasco',
    archetype: '2.1 — "Big Eddie," Corner Slice Pizza',
    homePlaceId: 'GRB-01',                    // Gable Row 1, the Okafor house next door is family
    workPlaceId: 'KTN-04',
    employerBizId: 'biz:corner_slice', jobTitle: 'owner',
    location: { placeId: 'KTN-04' },
    moneyCents: 0,
    inventory: [],
    relationships: [],
    knowledge: [],
    fidelity: 'full',
  },
  {
    id: 'npc:idris_warsame', displayName: 'Mr. Idris Warsame',
    archetype: '2.13 — night orderly, Harlem Hospital; nine years of the usual',
    // off-map job (Harlem Hospital) + on-map haunts: Masjid an-Nur at dawn,
    // the platform at 7:40, the usual at the cart
    homePlaceId: 'loc:idris_apartment',       // technical example: off-map home
    workPlaceId: 'loc:harlem_hospital',       // technical example: off-map work
    location: { placeId: 'loc:harlem_hospital' },
    moneyCents: 0,
    inventory: [],
    relationships: [],
    knowledge: [],
    fidelity: 'background',
  },
  {
    id: 'npc:priya_nair', displayName: 'Priya Nair',
    archetype: '2.11 — K-line conductor; the only museum that runs every four minutes',
    homePlaceId: 'TEN-01',                    // Juniper tenements (planned — alias while shells stand)
    workPlaceId: 'SUB-01',
    jobTitle: 'conductor',                    // the K is the MTA's, not a local business — no employerBizId
    location: { placeId: 'SUB-01' },
    moneyCents: 0,
    inventory: [],
    relationships: [],
    knowledge: [],
    fidelity: 'background',
  },
  {
    id: 'npc:kevin_okafor', displayName: 'Kevin "Kev" Okafor',
    archetype: '2.4 — counter at Corner Slice, then protégé',
    homePlaceId: 'GRB-01',
    workPlaceId: 'KTN-04',
    employerBizId: 'biz:corner_slice', jobTitle: 'counter',
    location: { placeId: 'KTN-04' },
    moneyCents: 0,
    inventory: [],
    knowledge: [],
    relationships: [],
    fidelity: 'background',
  },
  {
    id: 'npc:deon', displayName: 'Deon',
    archetype: 'supporting — Fade King barbershop (docs/narrative/04 §2)',
    homePlaceId: 'PWK-01',
    workPlaceId: 'KTN-05',
    employerBizId: 'biz:fade_king', jobTitle: 'barber',
    location: { placeId: 'KTN-05', interiorId: 'BARBER-INT' },
    moneyCents: 0,
    inventory: [],
    relationships: [],
    knowledge: [],
    fidelity: 'abstract',
  },
];

// --------------------------------------------------------- the businesses ----

export const REFERENCE_BUSINESSES: readonly BusinessState[] = [
  {
    id: 'biz:rosas_deli', name: "Rosa's Deli & Grocery",
    premisesBuildingId: 'ROS-01', interiorId: 'BODEGA-INT',
    opensAtMin: 6 * 60, closesAtMin: 22 * 60,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    ownerNpcId: 'npc:rosa_delgado', staffNpcIds: [],
    balanceCents: 0,                          // example — ledger owns truth
    graceTicks: 0,
    tags: ['food_service', 'retail', 'mixed_use', 'social_gathering'],
  },
  {
    id: 'biz:corner_slice', name: 'Corner Slice Pizza',
    premisesBuildingId: 'KTN-04', interiorId: 'PIZZA-INT',
    opensAtMin: 11 * 60, closesAtMin: 23 * 60,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    ownerNpcId: 'npc:eddie_carrasco', staffNpcIds: ['npc:kevin_okafor'],
    balanceCents: 0,
    graceTicks: 0,
    tags: ['food_service', 'retail', 'social_gathering'],
  },
  {
    id: 'biz:fade_king', name: 'Fade King barbershop',
    premisesBuildingId: 'KTN-05', interiorId: 'BARBER-INT',
    opensAtMin: 9 * 60, closesAtMin: 19 * 60,
    days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],  // Mondays dark (bible habit)
    ownerNpcId: 'npc:deon',                    // supporting cast (docs/narrative/04 §2)
    staffNpcIds: [],
    balanceCents: 0,
    graceTicks: 0,
    tags: ['service', 'commercial', 'social_gathering'],
  },
];

// ----------------------------------------------------------- the schedules ----
// TECHNICAL EXAMPLES — habit-shaped, bible-flavored, not canon beats.

export const REFERENCE_SCHEDULES: readonly NpcSchedule[] = [
  {
    id: 'sched:rosa_delgado', npcId: 'npc:rosa_delgado',
    entries: [
      { id: 'se-rosa-open', kind: 'work', placeId: 'BODEGA-INT', startMin: 6 * 60, endMin: 14 * 60, days: [], priority: 3, punctual: true },
      { id: 'se-rosa-counter', kind: 'work', placeId: 'BODEGA-INT', startMin: 17 * 60, endMin: 22 * 60, days: [] },
    ],
    fallback: { kind: 'routine', placeId: 'ROS-01' },
  },
  {
    id: 'sched:eddie_carrasco', npcId: 'npc:eddie_carrasco',
    entries: [
      { id: 'se-eddie-prep', kind: 'work', placeId: 'PIZZA-INT', startMin: 10 * 60, endMin: 11 * 60, days: [] },
      { id: 'se-eddie-slice', kind: 'work', placeId: 'PIZZA-INT', startMin: 11 * 60, endMin: 23 * 60, days: [] },
    ],
    fallback: { kind: 'routine', placeId: 'KTN-04' },
  },
  {
    id: 'sched:idris_warsame', npcId: 'npc:idris_warsame',
    entries: [
      // the night shift ends; dawn prayer; the 7:40 platform; the usual
      { id: 'se-idris-shift', kind: 'work', placeId: 'loc:harlem_hospital', startMin: 22 * 60, endMin: 6 * 60, days: [], priority: 3 },
      { id: 'se-idris-prayer', kind: 'worship', placeId: 'loc:masjid_an_nur', startMin: 5 * 60 + 30, endMin: 6 * 60 + 30, days: [] },
      { id: 'se-idris-platform', kind: 'commute', placeId: 'SUB-01', startMin: 7 * 60 + 30, endMin: 7 * 60 + 55, days: [], punctual: true },
      { id: 'se-idris-usual', kind: 'meal', placeId: 'loc:the_cart', startMin: 8 * 60, endMin: 8 * 60 + 20, days: [] },
      { id: 'se-idris-sleep', kind: 'sleep', placeId: 'loc:idris_apartment', startMin: 9 * 60, endMin: 19 * 60, days: [] },
    ],
    fallback: { kind: 'routine', placeId: 'loc:idris_apartment' },
  },
  {
    id: 'sched:priya_nair', npcId: 'npc:priya_nair',
    entries: [
      { id: 'se-priya-run', kind: 'work', placeId: 'SUB-01', startMin: 6 * 60 + 45, endMin: 9 * 60 + 30, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], punctual: true },
      { id: 'se-priya-run2', kind: 'work', placeId: 'SUB-01', startMin: 16 * 60, endMin: 19 * 60, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    ],
    fallback: { kind: 'routine', placeId: 'TEN-01' },
  },
  {
    id: 'sched:kevin_okafor', npcId: 'npc:kevin_okafor',
    entries: [
      { id: 'se-kev-counter', kind: 'work', placeId: 'PIZZA-INT', startMin: 11 * 60, endMin: 19 * 60, days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
      // Sundays: the dominoes table's youngest chair (docs/narrative/04 §4)
      { id: 'se-kev-dominoes', kind: 'social', placeId: 'PRK-CORNER', startMin: 14 * 60, endMin: 18 * 60, days: ['Sun'] },
    ],
    fallback: { kind: 'routine', placeId: 'GRB-01' },
  },
];

// ------------------------------------------------------- the relationships ----

/** Seeded edges (example warmth/trust — Workstream B owns the real dials). */
export function referenceRelationships(): RelationshipState[] {
  return [
    makeRelationship('npc:rosa_delgado', 'npc:idris_warsame', 42, 70),   // nine years of the usual
    makeRelationship('npc:eddie_carrasco', 'npc:kevin_okafor', 55, 60),  // owner and protégé
    makeRelationship('npc:priya_nair', 'npc:idris_warsame', 20, 40),     // the 7:40 platform edition
    makeRelationship('npc:rosa_delgado', 'npc:priya_nair', 25, 45),
    makeRelationship('npc:leo_marsh', 'npc:idris_warsame', 30, 50),      // Day 1 made him a Regular
  ];
}

// --------------------------------------------------------- sample events ----
// TECHNICAL EXAMPLES — validation exercises, replaced by Workstream C.

export const REFERENCE_EVENTS: readonly StoryEvent[] = [
  {
    id: 'evt:example_morning_regular',
    title: 'EXAMPLE — the usual, said at the counter',
    npcIds: ['npc:idris_warsame', 'npc:rosa_delgado'],
    placeId: 'BODEGA-INT',
    requiresBusinessId: 'biz:rosas_deli',
    window: { opensAtDay: 1, closesAtDay: 365, bandStartMin: 8 * 60, bandEndMin: 12 * 60 },
    prereqs: [{ kind: 'relationshipAtLeast', npcId: 'npc:idris_warsame', warmth: 10 }],
    priority: 3,
    onFail: 'reschedule',
  },
  {
    id: 'evt:example_platform_edition',
    title: 'EXAMPLE — all editions meet at 7:40',
    npcIds: ['npc:idris_warsame', 'npc:priya_nair'],
    placeId: 'SUB-01',
    window: { opensAtDay: 1, bandStartMin: 7 * 60 + 30, bandEndMin: 8 * 60 },
    prereqs: [],
    priority: 3,
    onFail: 'defer',
  },
  {
    id: 'evt:example_closed_shop',
    title: 'EXAMPLE — a scene the diner cannot host while dark (validation exercise)',
    npcIds: ['npc:eddie_carrasco'],
    placeId: 'SND-01',
    requiresBusinessId: 'biz:alder_heights_diner',
    window: { opensAtDay: 1 },
    prereqs: [],
    priority: 3,
    onFail: 'reschedule',
  },
];

// ------------------------------------------------------------- assembly ----

export interface ReferenceWorld {
  world: WorldState;
  schedules: ReadonlyMap<string, NpcSchedule>;
  events: readonly StoryEvent[];
}

/**
 * Build the reference world: a valid WorldState + schedules + events that
 * pass auditWorld end to end. `placeExists` is the registry's answer —
 * the builder validates its own entities against it and THROWS on a bad
 * reference, so a typo is loud at construction, not silent in a save.
 */
export function buildReferenceWorld(placeExists: (id: string) => boolean): ReferenceWorld {
  const world = createWorldState();
  world.npcs = REFERENCE_NPCS.map((n) => ({
    ...n,
    inventory: [...n.inventory],
    relationships: [],
    knowledge: [...n.knowledge],
    location: { ...n.location },
  }));
  // wire relationship membership onto the npcs (edges live in the map)
  const rels = referenceRelationships();
  for (const rel of rels) {
    world.relationships.set(rel.id, rel);
    for (const n of world.npcs) {
      if (n.id === rel.a || n.id === rel.b) n.relationships.push(rel.id);
    }
  }
  world.businesses = REFERENCE_BUSINESSES.map((b) => ({
    ...b, days: [...b.days], staffNpcIds: [...b.staffNpcIds], tags: [...b.tags],
  }));
  // The ledger needs NO per-entity opens: accounts touched by transactions
  // auto-exist at 0; nonzero genesis lives in acct:player (the shipped
  // $87.00) and the world system account. The player's ledger account is
  // acct:player — npc:<id> accounts are for people other than the player.

  const schedules = new Map<string, NpcSchedule>(
    REFERENCE_SCHEDULES.map((s) => [s.npcId, s]),
  );

  // self-check: the manifest must validate against its own place answer
  const npcIssues = validateNpcs(world.npcs, placeExists);
  const bizIssues = validateBusinesses(world.businesses, world.npcs, placeExists);
  if (npcIssues.length || bizIssues.length) {
    const lines = [...npcIssues, ...bizIssues].map((i) => `${i.code}: ${i.detail}`);
    throw new Error(`sim/reference: manifest fails validation\n  ${lines.join('\n  ')}`);
  }
  return { world, schedules, events: REFERENCE_EVENTS };
}

// ------------------------------------------------------- semantic helpers ----

/** The semantic aliases the reference world promises (loc:* ids) — the
 *  registry cannot point at off-map or pending-construction places; the
 *  manifest declares them so validation accepts what it should and
 *  rejects what it should not. */
export const REFERENCE_ALIASES: ReadonlyArray<{ id: string; label: string; tags: PlaceTag[] }> = [
  { id: 'loc:idris_apartment', label: "Idris's apartment (off-map)", tags: ['residential'] },
  { id: 'loc:harlem_hospital', label: 'Harlem Hospital (off-map)', tags: ['employment'] },
  { id: 'loc:masjid_an_nur', label: 'Masjid an-Nur (Juniper Ave)', tags: ['institutional', 'civic'] },
  { id: 'loc:the_cart', label: 'The player cart corner (Kestrel)', tags: ['food_service', 'social_gathering'] },
  { id: 'loc:rosa_rooms', label: "Rosa's rooms over the store (off-map)", tags: ['residential'] },
];

export function aliasExists(id: string): boolean {
  return REFERENCE_ALIASES.some((a) => a.id === id);
}

/** The manifest's one placeExists: registry id OR declared alias. */
export function referencePlaceExists(registryHas: (id: string) => boolean): (id: string) => boolean {
  return (id: string) => registryHas(id) || aliasExists(id);
}

// ----------------------------------------------------- a worked arbitration ----

/**
 * The worked scenario (tests drive the real engine; this is the data):
 * Idris at the platform (commute, NORMAL) when the player starts dialogue
 * (HIGH). Used by tests/sim-reference-world.test.ts to prove R1/R2/R3 of
 * the arbitration matrix with reference-world records.
 */
export function referenceDialogueScenario(clock: GameClock): {
  commute: ReturnType<typeof activityAt>;
  dialogueTick: number;
} {
  const idris = REFERENCE_SCHEDULES.find((s) => s.npcId === 'npc:idris_warsame')!;
  return {
    commute: activityAt(idris, clock),
    dialogueTick: clock.tick,
  };
}

/** The example economy story: the player's first week, in transactions —
 *  shipped amounts only ($87 start; $5 cups at Rosa's counter; the $15
 *  awning; the $10 stool; the $10 permit). Evidence-based by construction. */
export const REFERENCE_LEDGER_SCRIPT: ReadonlyArray<{
  id: string; category: string; kind: 'faucet' | 'sink' | 'transfer';
  from: string; to: string; amountCents: number; reason: string;
}> = [
  { id: 'txn:example_cup_1', kind: 'transfer', category: 'business_revenue', from: 'acct:player', to: 'biz:rosas_deli', amountCents: 500, reason: 'a regular coffee at Rosa\'s counter (shipped $5 cup)' },
  { id: 'txn:example_permit', kind: 'sink', category: 'service', from: 'acct:player', to: 'acct:world', amountCents: 1000, reason: 'mobile food vending permit, filed (shipped $10)' },
  { id: 'txn:example_tip', kind: 'faucet', category: 'reward', from: 'acct:world', to: 'acct:player', amountCents: 200, reason: 'Rosa\'s two dollars — on the house for her is not free (shipped $2)' },
];

export const PLAYER_NPC_ID = 'npc:leo_marsh';
export const theCartAlias = simId('loc', 'the_cart');
