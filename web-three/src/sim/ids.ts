/**
 * Stable identity — the World Contract's ID law (docs/architecture/world-contract/04).
 *
 * Two ID spaces live side by side, on purpose:
 *
 *   1. REGISTRY ids — the construction truth (docs/data/world-registry.json),
 *      already shipped and load-bearing: `KTN-01`, `STR-KESTREL`, `BLK-N`,
 *      `TERMINAL-INT`, `IX-KJ`, `PRK-CORNER`, `SUB-01`, `R-KESTREL-N`,
 *      `LMK-06`, `NZ-PLAZA`. They are UPPERCASE, dash-separated, often
 *      carry a numeric tail. They are permanent: the registry's own law
 *      says "IDs are permanent. New entries append; never renumber."
 *
 *   2. SIMULATION ids — namespaced lowercase ids for runtime entities the
 *      registry does not know: people, businesses, possessions, world
 *      events, relationships, story flags. Shape `kind:local_id`, e.g.
 *      `npc:rosa_delgado`, `biz:rosas_deli`, `obj:newsbox_01`,
 *      `evt:example_morning_regular`, `flag:map_in_hand`.
 *
 * Why two spaces: registry ids identify PLACES the world builds; sim ids
 * identify ENTITIES that live through time and into saves. Collapsing them
 * would make the registry own people, or saves own streetspace — both
 * wrong (the ownership table, docs/architecture/world-contract/05 §2).
 *
 * Every cross-system reference is validated against these patterns before
 * it is accepted — the "no unvalidated cross-system references" law
 * (directive PART 11 #13). A malformed id never enters a save.
 */

// ---------------------------------------------------------------- registry ----

/**
 * A registry-style id: uppercase alphanumerics joined by single dashes,
 * at least one character per part. Matches every id the registry ships
 * today (`KTN-01`, `STR-KESTREL`, `VDN-DW1a`, `R-KESTREL-N`, `BLK-N`).
 */
export const REGISTRY_ID_RE = /^[A-Z][A-Z0-9]*(-[A-Za-z0-9]+)*$/;

/** Registry entity families — what a registry id can point at. */
export type RegistryFamily =
  | 'street' | 'intersection' | 'crosswalk' | 'block' | 'building'
  | 'park' | 'landmark' | 'npcZone' | 'interior' | 'pedRoute'
  | 'vehRoute' | 'busStop';

export function isRegistryId(id: string): boolean {
  return id.length > 0 && id.length <= 40 && REGISTRY_ID_RE.test(id);
}

// -------------------------------------------------------------- simulation ----

/** Sim entity kinds — the closed set of runtime namespaces. */
export type SimKind =
  | 'npc'        // a person who persists (cast or resident)
  | 'biz'        // a business operating from premises
  | 'obj'        // an interactive object
  | 'item'       // an inventory possession
  | 'evt'        // a world/story event instance
  | 'flag'       // a persistent story/world flag
  | 'rel'        // a relationship edge (rel:<a>__<b>, sorted locals)
  | 'grp'        // a social group / organization
  | 'loc';       // a purely semantic location alias (loc:leo_home)

/**
 * Sim id grammar: `kind:local` where the local part is lowercase words
 * joined by single underscores — with ONE sanctioned exception: the rel
 * namespace joins two npc locals with `__` (rel:a__b), so `_` runs of
 * exactly two are legal between words. Anything else (uppercase, dashes,
 * triple underscores, trailing separators) is rejected at the door.
 */
export const SIM_ID_RE = /^[a-z][a-z0-9]*(:[a-z0-9]+(_{1,2}[a-z0-9]+)*)+$/;

/** `npc:rosa_delgado` → `npc`. Null when the id is not a valid sim id. */
export function simKindOf(id: string): SimKind | null {
  if (!isSimId(id)) return null;
  return id.slice(0, id.indexOf(':')) as SimKind;
}

export function isSimId(id: string): boolean {
  return id.length > 0 && id.length <= 80 && SIM_ID_RE.test(id);
}

/** Build a sim id, asserting the result is well-formed (throw on a bad
 *  local part — a typo must be loud, not a silent corrupt save). */
export function simId(kind: SimKind, local: string): string {
  const id = `${kind}:${local}`;
  if (!SIM_ID_RE.test(id)) {
    throw new Error(`sim/ids: malformed sim id "${id}" (kind "${kind}", local "${local}")`);
  }
  return id;
}

/**
 * A reference to either space. Validation functions accept both; the
 * resolver (sim/registry) is what turns a place reference into geometry.
 */
export type AnyId = string;

/** True when the id is well-formed in EITHER space. */
export function isAnyId(id: string): boolean {
  return isRegistryId(id) || isSimId(id);
}

// -------------------------------------------------------------- relations ----

/**
 * Relationship edges are stored once per unordered pair: the local part is
 * the two npc local ids sorted and joined with `__` (single `:` is taken
 * by the namespace). `rel:idris_warsame__rosa_delgado`.
 */
export function relId(npcA: string, npcB: string): string {
  const local = (id: string): string => {
    const kind = simKindOf(id);
    if (kind !== 'npc') throw new Error(`sim/ids: relId expects npc ids, got "${id}"`);
    return id.slice('npc:'.length);
  };
  const [a, b] = [local(npcA), local(npcB)].sort();
  if (a === b) throw new Error('sim/ids: relId needs two different npcs');
  return simId('rel', `${a}__${b}`);
}

/** Split a relationship id back into its two npc sim ids (sorted order). */
export function relParts(id: string): [string, string] | null {
  const kind = simKindOf(id);
  if (kind !== 'rel') return null;
  const pair = id.slice('rel:'.length);
  const i = pair.indexOf('__');
  if (i <= 0 || pair.indexOf('__', i + 1) !== -1) return null;
  const a = simId('npc', pair.slice(0, i));
  const b = simId('npc', pair.slice(i + 2));
  return [a, b];
}
