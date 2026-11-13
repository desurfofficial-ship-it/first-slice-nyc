/**
 * The shipped content catalogue — Workstream E's first product (E-1,
 * wc-17 Phase-2 item 3; wc-14 workstream E).
 *
 * The law (wc-11 §7): this is CATALOGUING, not an asset library — every
 * entry describes what already ships; nothing new is added. Two packs:
 *
 *   1. THE ANCHOR SET — the contract's named interactive anchors
 *      (newsbox, hoop, board, shelves — wc-08 §47, wc-13) under the
 *      RESERVED `obj:` sim ids (wc-04's grammar; `obj:newsbox_01` is the
 *      contract's own worked example). Kind `interactive_object`;
 *      procedural sources (code-built — always exist, no license duty).
 *      The shelf goods are NOT hardcoded here: the caller passes the
 *      shipped SHELF_GOODS (core/content.ts owns them; sim never imports
 *      core). Each entry tags its interaction id, and the test greps
 *      game/interactionDefs.ts so the mapping cannot rot away from what
 *      actually ships.
 *
 *   2. THE FIRST BUILDING-VARIANT PACK — every registry building the
 *      world actually ships (status `existing`, or `built (Wn)` for the
 *      phase that raised it), carried under its REGISTRY id (wc-11 §1:
 *      "a registry-style id for built-in canon props"). Kind
 *      `building_variant`; tags carry the block + classification; the
 *      builder names the authored construction honestly — code-ref
 *      masses name their `World.solid('…')` token (the registry's own
 *      style notes), the rest name the module that builds them.
 *      BUILDING_EVIDENCE pins the non-code-ref cases to greppable tokens
 *      (the test enforces it). The status column was repaired 2026-11-08
 *      (A-3 unit 1's bookkeeping): 31 rows built in phases W1–W3 had
 *      stayed 'planned' — the truth now reads from the registry's own
 *      constructionPhases lists, and the shipped-law is semantic
 *      (isShippedBuildingStatus), never a hand-list of phase strings
 *      again. New buildings append as they are built (the id law);
 *      nothing is renamed.
 *
 * The whole catalogue passes `validateManifest` (wc-11 §3, wc-15 row 17)
 * — the test proves it, so a future content agent inherits a VALID,
 * queryable manifest, not a promise.
 */

import { type ContentEntry } from './content';
import registryJson from '../../../docs/data/world-registry.json';

// ------------------------------------------------------- the anchor set ----

/** A shipped shelf good, as far as this module needs to know it
 *  (structural — the real type lives in core/content.ts). */
export interface ShelfGoodRef {
  id: string;
  label: string;
}

/**
 * The contract's named anchor set as `obj:` content entries. The id
 * grammar is wc-04's (`obj:newsbox_01` — the contract's own example);
 * the `interaction:` tag names the interaction-registry id that
 * realizes the anchor (game/interactionDefs.ts), which the test
 * cross-checks against the source so the mapping stays true.
 */
export function shippedAnchorEntries(shelfGoods: readonly ShelfGoodRef[]): ContentEntry[] {
  return [
    {
      id: 'obj:newsbox_01',
      kind: 'interactive_object',
      label: 'The newsbox — the free paper, day-keyed',
      tags: ['anchor', 'interaction:newsbox', 'street'],
      source: { type: 'procedural', builder: "game/interactionDefs 'newsbox'" },
    },
    {
      id: 'obj:court_hoop_01',
      kind: 'interactive_object',
      label: 'The half-court hoop — free, repeatable, deterministic',
      tags: ['anchor', 'interaction:court', 'court'],
      source: { type: 'procedural', builder: "game/interactionDefs 'court' (CourtGame)" },
    },
    {
      id: 'obj:board_01',
      kind: 'interactive_object',
      label: 'The bulletin board by the subway stairs — the slip rotates by day',
      tags: ['anchor', 'interaction:board', 'street'],
      source: { type: 'procedural', builder: "game/interactionDefs 'board'" },
    },
    ...shelfGoods.map((g) => ({
      id: `obj:shelf_${g.id}_01`,
      kind: 'interactive_object' as const,
      label: `Bodega shelf: ${g.label}`,
      tags: ['anchor', `interaction:shelf_${g.id}`, 'bodega'],
      source: {
        type: 'procedural' as const,
        builder: `game/interactionDefs shelfInteractions (shelf_${g.id})`,
      },
    })),
  ];
}

// --------------------------------------------- the building-variant pack ----

/** The registry building fields this catalogue reads. */
export interface RegistryBuildingJson {
  id: string;
  name?: string;
  class?: string;
  block?: string;
  status?: string;
  style?: string;
}

/** The shipped-law, semantic: the registry's own status vocabulary is
 *  `existing | built (Wn) | planned` (sim/registry.ts) — a building SHIPS
 *  when it is `existing` or when a construction phase has BUILT it.
 *  (Before 2026-11-08 this was a hand-list `['existing', 'built (W2)']`
 *  that aged the moment another phase's statuses were repaired; the
 *  semantic form cannot.) */
export function isShippedBuildingStatus(status: string | undefined): boolean {
  // 'built (Wn)' — the W-phase bands; 'built (SI-1)' — the borough-character
  // wave's Mallow-row rows (the SI union, 2026-11-11); 'built (WC1)' — the
  // Catalpa Junction construction line (W-C1, 2026-11-13, DEC-13);
  // 'existing' — the shipped originals. Never 'planned' (the no-render law).
  return status === 'existing' || /^built \((WC\d+|W\d+|SI-\d+)\)$/.test(status ?? '');
}

const REGISTRY = registryJson as unknown as { buildings?: RegistryBuildingJson[] };

/**
 * The honest builder line for a shipped building: the registry's own
 * `code ref` token where the style note carries one, the building
 * module for the authored districts, the construction token for the
 * block cuts and the cart. Every claim here is grepped by the test.
 */
function builderOf(b: RegistryBuildingJson): string {
  const ref = (b.style ?? '').match(/code refs? ([A-Za-z0-9_]+)/);
  if (ref) {
    const token = ref[1];
    return `World.solid('${token}${token.endsWith('_') ? '*' : ''}')`;
  }
  switch (b.id) {
    case 'SUB-01':
      return 'world/subway/stationKit (the SUB-01 headhouse)';
    case 'SUB-TS':
      return 'world/timesSquare (the Orpheum block + station gap)';
    case 'ALY-01':
      return 'World.ts (the slot cut between the split halves of Bldg_N_East_B)';
    case 'ALY-02':
      return 'World.ts (the party-wall slot between Bldg_N_East_A and the ginkgo Bldg_N_GoldWindow)';
    case 'VND-01':
      return 'World.ts (the DIRTY WATER DOGS cart)';
    default:
      if (b.id?.startsWith('TSS')) return 'world/timesSquare (authored block)';
      if (b.id?.startsWith('CDK')) return 'world/catalpaJunction (authored block)';
      if (b.id?.startsWith('LRY')) return 'world/larchYardsKit (authored block)';
      return 'World.ts (authored mass)';
  }
}

/**
 * The non-code-ref buildings' evidence: the tokens the TEST greps in the
 * named source to prove the builder line is not a polite fiction. A
 * building without an entry here must carry a `code ref` in its registry
 * style note (the builderOf path) — anything else fails the test.
 */
export const BUILDING_EVIDENCE: Record<string, { file: 'World.ts' | 'timesSquare.ts' | 'subway/stationKit.ts' | 'catalpaJunction.ts'; tokens: string[] }> = {
  'ALY-01': { file: 'World.ts', tokens: ['Bldg_N_East_B'] },
  'ALY-02': { file: 'World.ts', tokens: ['Bldg_N_East_A', 'Bldg_N_GoldWindow'] },
  'VND-01': { file: 'World.ts', tokens: ['DIRTY WATER DOGS'] },
  'SUB-01': { file: 'subway/stationKit.ts', tokens: ['SUB-01'] },
  'SUB-TS': { file: 'timesSquare.ts', tokens: ['station gap'] },
  'TSS-01': { file: 'timesSquare.ts', tokens: ['Orpheum'] },
  'TSS-02': { file: 'timesSquare.ts', tokens: ['south row'] },
  'TSS-03': { file: 'timesSquare.ts', tokens: ['east tower'] },
  'TSS-04': { file: 'timesSquare.ts', tokens: ['south row'] },
  'TSS-05': { file: 'timesSquare.ts', tokens: ['south row'] },
  // ---- A-3 unit 1's status repair (2026-11-08) grew the shipped slice —
  // the W1–W3 rows below were always built; the evidence tokens are their
  // construction names in World.ts (the flip's own band: the registry id
  // itself, keyed by regBox).
  'KTN-00W': { file: 'World.ts', tokens: ['KTN_00W'] },
  'KTN-06': { file: 'World.ts', tokens: ['KTN_06'] },
  'SMB-01': { file: 'World.ts', tokens: ['SMB-01'] },
  'SMB-02': { file: 'World.ts', tokens: ['SMB_02'] },
  'SMB-03': { file: 'World.ts', tokens: ['SMB_03'] },
  'PWK-01': { file: 'World.ts', tokens: ['PWK-01'] },
  'PWK-02': { file: 'World.ts', tokens: ['PWK-02'] },
  'PWK-03': { file: 'World.ts', tokens: ['PWK-03'] },
  'SUB-02': { file: 'World.ts', tokens: ['makeControlHouse'] },
  'GRB-01': { file: 'World.ts', tokens: ['GRB_01'] },
  'GRB-02': { file: 'World.ts', tokens: ['GRB_02'] },
  'GRB-03': { file: 'World.ts', tokens: ['GRB_03'] },
  'GRB-04': { file: 'World.ts', tokens: ['GRB_04'] },
  'GRB-05': { file: 'World.ts', tokens: ['GRB_05'] },
  'TEN-01': { file: 'World.ts', tokens: ['TEN_01a'] },
  'SRC-01': { file: 'World.ts', tokens: ['SRC_01'] },
  'SRC-02': { file: 'World.ts', tokens: ['SRC_02'] },
  'KTN-07': { file: 'World.ts', tokens: ['KTN_07'] },
  'KCM-01': { file: 'World.ts', tokens: ['KCM_01_base'] },
  'SND-01': { file: 'World.ts', tokens: ['SND_01_band'] },
  'VND-02': { file: 'World.ts', tokens: ['VND02_Sign'] },
  'VDN-DW1a': { file: 'World.ts', tokens: ['VDN-DW1a'] },
  'VDN-DW1b': { file: 'World.ts', tokens: ['VDN-DW1b'] },
  'VDN-DW1c': { file: 'World.ts', tokens: ['VDN-DW1c'] },
  'VDN-DW1d': { file: 'World.ts', tokens: ['VDN-DW1d'] },
  'VDN-DE1a': { file: 'World.ts', tokens: ['VDN-DE1a'] },
  'VDN-DE1b': { file: 'World.ts', tokens: ['VDN-DE1b'] },
  'VDN-DE1c': { file: 'World.ts', tokens: ['VDN-DE1c'] },
  'VDN-DE1d': { file: 'World.ts', tokens: ['VDN-DE1d'] },
  'VDN-DN1': { file: 'World.ts', tokens: ['VDN-DN1'] },
  'VDN-DS1': { file: 'World.ts', tokens: ['VDN-DS1'] },
  // ---- the W6 terrace build-out (docs/production/terrace-buildout): the
  // strips behind Gable and Marlow are real rows; the tokens are the
  // terrace builder's own construction names
  'GRB-06': { file: 'World.ts', tokens: ['GRB_06'] },
  'GRB-07': { file: 'World.ts', tokens: ['GRB_07'] },
  'TEN-02': { file: 'World.ts', tokens: ['TEN_02'] },
  'KTS-04': { file: 'World.ts', tokens: ['KTS_04'] },
  // ---- the W7 gate rows (docs/production/westgate-eastgate): the map's
  // last two sides — the tokens are the gate builder's construction names
  'GRB-08': { file: 'World.ts', tokens: ['GRB_08'] },
  'GRB-09': { file: 'World.ts', tokens: ['GRB_09'] },
  'GRB-10': { file: 'World.ts', tokens: ['GRB_10'] },
  'GRB-11': { file: 'World.ts', tokens: ['GRB_11'] },
  'GRB-12': { file: 'World.ts', tokens: ['GRB_12'] },
  'GRB-13': { file: 'World.ts', tokens: ['GRB_13'] },
  'GRB-14': { file: 'World.ts', tokens: ['GRB_14'] },
  'GRB-15': { file: 'World.ts', tokens: ['GRB_15'] },
  'KTN-08': { file: 'World.ts', tokens: ['KTN_08'] },
  'KTN-09': { file: 'World.ts', tokens: ['KTN_09'] },
  'KTN-10': { file: 'World.ts', tokens: ['KTN_10'] },
  'KTN-11': { file: 'World.ts', tokens: ['KTN_11'] },
  'KTS-05': { file: 'World.ts', tokens: ['KTS_05'] },
  'KTS-06': { file: 'World.ts', tokens: ['KTS_06'] },
  'KTS-07': { file: 'World.ts', tokens: ['KTS_07'] },
  'KTS-08': { file: 'World.ts', tokens: ['KTS_08'] },
  'KTS-09': { file: 'World.ts', tokens: ['KTS_09'] },
  'KTS-10': { file: 'World.ts', tokens: ['KTS_10'] },
  'TEN-03': { file: 'World.ts', tokens: ['TEN_03'] },
  'TEN-04': { file: 'World.ts', tokens: ['TEN_04'] },
  'MRW-01': { file: 'World.ts', tokens: ['MRW_01'] },
  'MRW-02': { file: 'World.ts', tokens: ['MRW_02'] },
  'MRW-03': { file: 'World.ts', tokens: ['MRW_03'] },
  'MRW-04': { file: 'World.ts', tokens: ['MRW_04'] },
  // the SI borough-character wave's Mallow-row rows (their construction
  // names in World.ts's buildAlderHeightsSI)
  'LMS-01': { file: 'World.ts', tokens: ['LMS_01_base'] },
  'IND-01': { file: 'World.ts', tokens: ['IND_01'] },
  'GLS-01': { file: 'World.ts', tokens: ['GLS_01'] },
  // ---- the W-C1 Catalpa Junction band (DEC-13, 2026-11-13): the second
  // district's first priced slice — the construction names in
  // world/catalpaJunction.ts (the zone-owned far band; the A-3 law holds —
  // every mass reads its registry row via World.ts's regShell)
  'CDK-01': { file: 'catalpaJunction.ts', tokens: ['CDK_01'] },
  'CDK-02': { file: 'catalpaJunction.ts', tokens: ['CDK_02'] },
  'CDK-03': { file: 'catalpaJunction.ts', tokens: ['CDK_03'] },
  'CDK-04': { file: 'catalpaJunction.ts', tokens: ['CDK_04'] },
  'CDK-05': { file: 'catalpaJunction.ts', tokens: ['CDK_05'] },
  'CDK-06': { file: 'catalpaJunction.ts', tokens: ['CDK_06'] },
  'CDK-07': { file: 'catalpaJunction.ts', tokens: ['CDK_07'] },
  'CDK-08': { file: 'catalpaJunction.ts', tokens: ['CDK_08'] },
  'CDK-09': { file: 'catalpaJunction.ts', tokens: ['CDK_09'] },
  'CDK-SUB': { file: 'catalpaJunction.ts', tokens: ['CDK_Station_Slab'] },
};

/**
 * The first building-variant pack: every registry building whose status
 * says the world ships it. Ids are the registry's own (canon props ride
 * registry-style ids per wc-11 §1); new buildings append as they are
 * built, never renumbered.
 */
export function shippedBuildingVariantEntries(): ContentEntry[] {
  const out: ContentEntry[] = [];
  for (const b of REGISTRY.buildings ?? []) {
    if (!isShippedBuildingStatus(b.status)) continue;
    out.push({
      id: b.id,
      kind: 'building_variant',
      label: b.name ?? b.id,
      tags: [`class-${b.class ?? '?'}`, b.block ?? 'unassigned', 'shipped'],
      source: { type: 'procedural', builder: builderOf(b) },
    });
  }
  return out;
}

// ------------------------------------------------------- the catalogue ----

/**
 * The whole shipped catalogue: the anchor set + the building pack —
 * one valid manifest for Workstream E's successors. The two id spaces
 * cannot collide by grammar (`obj:*` sim ids vs registry ids), and the
 * test asserts uniqueness anyway.
 */
export function shippedContentCatalogue(shelfGoods: readonly ShelfGoodRef[]): ContentEntry[] {
  return [...shippedAnchorEntries(shelfGoods), ...shippedBuildingVariantEntries()];
}
