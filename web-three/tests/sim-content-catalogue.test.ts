/**
 * sim/contentCatalogue — E-1's two packs proven against what actually
 * ships (wc-17 Phase-2 item 3; wc-08 §47's anchor mapping; wc-11's
 * validators; wc-15 row 17).
 *
 * The sync laws under test:
 *   1. the catalogue is a VALID manifest (validateManifest — zero issues);
 *   2. the anchor set is EXACTLY the contract's named families
 *      (newsbox, hoop, board, shelves — wc-08 §47), the shelf goods
 *      flowing through from core (no second copy to drift);
 *   3. every `interaction:` tag names an interaction that really ships
 *      (game/interactionDefs.ts, grepped — the mapping cannot rot);
 *   4. the building pack is EXACTLY the registry's shipped buildings
 *      (semantic shipped-law: existing / built (Wn) — the status column
 *      was repaired 2026-11-08 with A-3 unit 1's bookkeeping), ids =
 *      registry ids;
 *   5. no builder line is a polite fiction (BUILDING_EVIDENCE tokens +
 *      code-ref tokens grepped in the world sources).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateManifest } from '../src/sim/content';
import {
  shippedAnchorEntries, shippedBuildingVariantEntries, shippedContentCatalogue,
  BUILDING_EVIDENCE, isShippedBuildingStatus,
} from '../src/sim/contentCatalogue';
import { isSimId, isRegistryId } from '../src/sim/ids';
import { SHELF_GOODS } from '../src/core/content';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf8');
const INTERACTION_DEFS = read('web-three/src/game/interactionDefs.ts');
const WORLD_TS = read('web-three/src/world/World.ts');
const TIMES_SQUARE = read('web-three/src/world/timesSquare.ts');
const STATION_KIT = read('web-three/src/world/subway/stationKit.ts');
const EVIDENCE_FILE: Record<string, string> = {
  'World.ts': WORLD_TS,
  'timesSquare.ts': TIMES_SQUARE,
  'subway/stationKit.ts': STATION_KIT,
};
const REGISTRY = JSON.parse(read('docs/data/world-registry.json')) as {
  buildings: { id: string; name?: string; class?: string; block?: string; status?: string; style?: string }[];
};

/** Every catalogue source is procedural — narrow the union honestly. */
const builderOf = (e: { source: { type: string; builder?: string } }): string => {
  if (e.source.type !== 'procedural' || typeof e.source.builder !== 'string') {
    throw new Error(`non-procedural source in the catalogue: ${JSON.stringify(e.source)}`);
  }
  return e.source.builder;
};

describe('sim/contentCatalogue — the anchor set (wc-08 §47)', () => {
  const anchors = shippedAnchorEntries(SHELF_GOODS);

  it('is exactly the contract-named families: newsbox, hoop, board, shelves', () => {
    // 3 static anchors + one per shipped shelf good
    expect(anchors.length).toBe(3 + SHELF_GOODS.length);
    const tags = anchors.flatMap((a) => a.tags).filter((t) => t.startsWith('interaction:'));
    expect(tags).toContain('interaction:newsbox');
    expect(tags).toContain('interaction:court'); // the hoop's interaction id
    expect(tags).toContain('interaction:board');
    for (const g of SHELF_GOODS) expect(tags).toContain(`interaction:shelf_${g.id}`);
  });

  it('rides the reserved obj: namespace with valid sim ids', () => {
    for (const a of anchors) {
      expect(a.id.startsWith('obj:')).toBe(true);
      expect(isSimId(a.id)).toBe(true);
      expect(a.kind).toBe('interactive_object');
    }
    // the contract's own worked example id exists verbatim (wc-04)
    expect(anchors.some((a) => a.id === 'obj:newsbox_01')).toBe(true);
  });

  it('is a valid manifest — zero issues', () => {
    expect(validateManifest(anchors)).toEqual([]);
  });

  it('every interaction: tag names an interaction that really ships (grepped)', () => {
    for (const tag of anchors.flatMap((a) => a.tags).filter((t) => t.startsWith('interaction:'))) {
      const id = tag.slice('interaction:'.length);
      if (id.startsWith('shelf_')) {
        // the shelf interactions are built from the shipped goods
        expect(INTERACTION_DEFS).toContain('id: `shelf_${good.id}`');
        expect(SHELF_GOODS.some((g) => id === `shelf_${g.id}`)).toBe(true);
      } else {
        expect(INTERACTION_DEFS).toContain(`id: '${id}'`);
      }
    }
  });
});

describe('sim/contentCatalogue — the first building-variant pack', () => {
  const pack = shippedBuildingVariantEntries();
  const shipped = REGISTRY.buildings.filter((b) => isShippedBuildingStatus(b.status));

  it('is exactly the registry\'s shipped buildings, under their registry ids', () => {
    expect(pack.length).toBe(shipped.length);
    expect(pack.length).toBe(81); // ALL 81 ship — grows only as buildings are built (53 fleet + 4 W6 terrace rows + 24 W7 gate rows)
    const shippedIds = new Set(shipped.map((b) => b.id));
    for (const e of pack) {
      expect(shippedIds.has(e.id)).toBe(true);
      expect(isRegistryId(e.id)).toBe(true); // wc-11 §1: canon props ride registry-style ids
      expect(e.kind).toBe('building_variant');
    }
  });

  it('is a valid manifest — zero issues, no duplicates', () => {
    expect(validateManifest(pack)).toEqual([]);
    expect(new Set(pack.map((e) => e.id)).size).toBe(pack.length);
  });

  it('every builder line is honest (the evidence is grepped in the world sources)', () => {
    for (const e of pack) {
      const builder = builderOf(e);
      const solid = builder.match(/World\.solid\('([A-Za-z0-9_]+)\*?'\)/);
      if (solid) {
        // the registry's own code-ref token must exist in the world source
        expect(WORLD_TS).toContain(solid[1]);
        continue;
      }
      const ev = BUILDING_EVIDENCE[e.id];
      expect(ev, `builder "${builder}" (${e.id}) carries neither a code ref nor evidence`).toBeTruthy();
      const src = EVIDENCE_FILE[ev.file];
      for (const token of ev.tokens) expect(src).toContain(token);
    }
    // every non-code-ref building is covered by the evidence table
    const uncovered = pack
      .filter((e) => !/World\.solid\('/.test(builderOf(e)))
      .filter((e) => !BUILDING_EVIDENCE[e.id]);
    expect(uncovered).toEqual([]);
  });
});

describe('sim/contentCatalogue — the whole catalogue', () => {
  const all = shippedContentCatalogue(SHELF_GOODS);

  it('is one valid manifest — anchors + buildings, globally unique ids', () => {
    expect(all.length).toBe(3 + SHELF_GOODS.length + 81); // 53 fleet + 4 W6 terrace rows + 24 W7 gate rows
    expect(validateManifest(all)).toEqual([]);
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
  });

  it('the two id spaces cannot collide by grammar, checked anyway', () => {
    const obj = all.filter((e) => e.id.startsWith('obj:'));
    const canon = all.filter((e) => !e.id.startsWith('obj:'));
    expect(obj.every((e) => isSimId(e.id))).toBe(true);
    expect(canon.every((e) => isRegistryId(e.id))).toBe(true);
    expect(obj.length + canon.length).toBe(all.length);
  });
});
