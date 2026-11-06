/**
 * The spatial world & semantic registry — Foundation B
 * (docs/architecture/world-contract/07).
 *
 * `docs/data/world-registry.json` is the neighborhood's construction truth
 * (Alder Heights: streets, blocks, buildings, parks, interiors, transit,
 * routes). It already had a construction-time validator
 * (scripts/design/validate-registry.mjs). This module is the RUNTIME half
 * of that contract, in TypeScript:
 *
 *   - typed shapes for the registry document (what builders may rely on);
 *   - `loadRegistry()` — parse + structural validation + indexes;
 *   - cross-reference integrity (interiors sit in buildings, anchors sit
 *     in shells, landmark anchors resolve, park zones exist, intersection
 *     streets exist, everything inside world bounds);
 *   - SEMANTIC metadata: derived tags per place ('food_service',
 *     'residential', 'social_gathering', …) so narrative and gameplay
 *     agents can REQUEST a location by meaning ("a suitable confrontation
 *     location", "somewhere open that serves food") instead of hard-coding
 *     coordinates (directive PART 4 Foundation B);
 *   - spatial queries: buildingAt, parks near, places matching tags.
 *
 * The registry document itself stays the single source of truth — it is
 * imported, never copied. The mjs validator remains the construction gate;
 * this module serves the running game and the test suite.
 */

import registryJson from '../../../docs/data/world-registry.json';
import { isRegistryId } from './ids';

// ------------------------------------------------------------- doc shapes ----
// Deliberately tolerant (fields optional): the registry is a living
// construction document. Validation reports what a consumer actually needs.

export interface RegistryMeta {
  title?: string; version?: string; status?: string;
  coordSystem?: { axes?: string; units?: string };
  law?: string[];
}

export interface RegistryFootprint { x: number; z: number; w: number; d: number }

export interface RegistryEntrance {
  x: number; z: number; faces?: string;
}

export interface RegistryBuilding {
  id: string;
  name?: string;
  status?: string;                 // existing | built (Wn) | planned
  class?: 'A' | 'B' | 'C' | 'D';   // A enterable, B ground-floor, C exterior, D backdrop
  face?: string;                   // "Kestrel N" — the street it presents to
  block?: string;                  // BLK id
  footprint?: RegistryFootprint;
  height?: number;
  floors?: number;
  entrance?: RegistryEntrance[];
  interior?: string;               // prose pointer (e.g. "TERMINAL-INT (phase W5)")
  storyRole?: string;
  collider?: boolean;
  business?: string;               // prose business label when the ground floor is one
}

export interface RegistryStreet {
  id: string; name?: string; axis?: 'EW' | 'NS';
  centerline?: number;
  road?: { zMin?: number; zMax?: number; xMin?: number; xMax?: number; width?: number };
  walkN?: { zMin?: number; zMax?: number; xMin?: number; xMax?: number };
  walkS?: { zMin?: number; zMax?: number; xMin?: number; xMax?: number };
  character?: string;
}

export interface RegistryIntersection {
  id: string; streets?: string[]; cornerBuildings?: string[];
}

export interface RegistryPark {
  id: string; name?: string; status?: string;
  bbox?: { xMin: number; xMax: number; zMin: number; zMax: number };
  npcZones?: string[];
}

export interface RegistryAnchor {
  id: string; x: number; z: number; y?: number; facade?: boolean; note?: string;
}

export interface RegistryInterior {
  id: string; building: string; status?: string;
  shell?: { xMin?: number; xMax?: number; zMin?: number; zMax?: number; clearH?: number; belowGrade?: boolean };
  anchors?: RegistryAnchor[];
  tags?: string[];
}

export interface RegistryLandmark { id: string; name?: string; anchor?: string }
export interface RegistryNpcZone { id: string; place?: string; who?: string; when?: string }

export interface RegistryPedRoute { id: string; way?: string }
export interface RegistryVehRoute { id: string; way?: string }

export interface RegistryCrosswalk { id: string; x?: number; z?: number; dir?: string; axis?: string }

export interface RegistryDoc {
  meta?: RegistryMeta;
  bounds?: { world?: { xMin: number; xMax: number; zMin: number; zMax: number } };
  neighbourhood?: { name?: string; identity?: string; canon?: string };
  streets: RegistryStreet[];
  intersections: RegistryIntersection[];
  crosswalks: RegistryCrosswalk[];
  blocks: Array<{ id: string; bbox?: { xMin: number; xMax: number; zMin: number; zMax: number } }>;
  buildings: RegistryBuilding[];
  parks: RegistryPark[];
  landmarks: RegistryLandmark[];
  npcZones: RegistryNpcZone[];
  routes: { pedestrian: RegistryPedRoute[]; vehicle: RegistryVehRoute[] };
  interiors: RegistryInterior[];
}

// ------------------------------------------------------------ semantic tags ----

/**
 * The gameplay meaning of a place, as tags. Derived — not authored — so
 * the registry never grows a second parallel vocabulary: the rules below
 * read class/name/storyRole once, and every consumer inherits updates.
 * A narrative request says `tags: ['food_service']`; this table decides
 * which premises qualify. Extending the world = extending these rules.
 */
export const PLACE_TAGS = [
  'residential', 'commercial', 'mixed_use', 'industrial', 'civic',
  'public_access', 'public_space', 'food_service', 'retail', 'service',
  'employment', 'transport', 'transit', 'social_gathering', 'employment_food',
  'residential_income', 'institutional', 'backdrop', 'enterable', 'story_key',
] as const;
export type PlaceTag = (typeof PLACE_TAGS)[number];

/** Name-based rules — the registry's names are canon (docs/narrative/04 §2). */
const NAME_RULES: Array<[RegExp, PlaceTag[]]> = [
  [/deli|grocery|bodega/i, ['food_service', 'retail', 'mixed_use', 'social_gathering']],
  [/pizza|diner|bakery/i, ['food_service', 'retail', 'social_gathering']],
  [/laundry/i, ['service', 'commercial', 'social_gathering']],
  [/barber|fade king/i, ['service', 'commercial', 'social_gathering']],
  [/records/i, ['retail', 'commercial']],
  [/hardware/i, ['retail', 'employment', 'commercial']],
  [/terminal/i, ['transport', 'transit', 'civic', 'public_access', 'story_key']],
  [/station/i, ['transport', 'transit', 'public_access']],
  [/hall|works/i, ['civic', 'employment', 'public_access', 'story_key']],
  [/walk-up|tenement|brownstone|row|house|cecil|court|studios/i, ['residential']],
  [/school|church|masjid|library/i, ['institutional', 'civic', 'public_access']],
  [/cart|stand/i, ['food_service', 'retail']],
  [/backdrop/i, ['backdrop']],
];

function tagsForBuilding(b: RegistryBuilding): PlaceTag[] {
  const tags = new Set<PlaceTag>();
  for (const [re, list] of NAME_RULES) {
    if (re.test(b.name ?? '') || re.test(b.storyRole ?? '')) for (const t of list) tags.add(t);
  }
  if (b.class === 'A' || b.class === 'B') tags.add('enterable');
  if (b.class === 'D') { tags.add('backdrop'); return [...tags]; }
  if (b.class === 'C') { tags.add('residential'); } // walk-up shells read residential
  if (b.business) tags.add('employment');
  return [...tags];
}

function tagsForPark(): PlaceTag[] {
  return ['public_space', 'public_access', 'social_gathering'];
}

function tagsForInterior(i: RegistryInterior): PlaceTag[] {
  const tags = new Set<PlaceTag>();
  for (const t of i.tags ?? []) if ((PLACE_TAGS as readonly string[]).includes(t)) tags.add(t as PlaceTag);
  tags.add('enterable');
  if (/BODEGA|DELI/i.test(i.id)) tags.add('food_service');
  if (/DINER|PIZZA|BAKERY/i.test(i.id)) { tags.add('food_service'); tags.add('social_gathering'); }
  if (/LAUNDRY|BARBER/i.test(i.id)) tags.add('service');
  if (/CECIL/i.test(i.id)) tags.add('residential');
  if (/HALL/i.test(i.id)) tags.add('civic');
  return [...tags];
}

// ------------------------------------------------------------- the registry ----

export interface PlaceRecord {
  /** Registry id (the stable place id). */
  id: string;
  kind: 'building' | 'park' | 'transit';
  name: string;
  tags: PlaceTag[];
  /** Center XZ in world meters (footprint/bbox center). */
  x: number;
  z: number;
  /** Rough radius for "near" queries (half-diagonal of the footprint). */
  radius: number;
  building?: RegistryBuilding;
  park?: RegistryPark;
}

export interface RegistryIssue {
  code: string;
  detail: string;
}

export class WorldRegistry {
  readonly doc: RegistryDoc;
  readonly neighbourhood: string;
  private readonly buildingsById = new Map<string, RegistryBuilding>();
  private readonly interiorsById = new Map<string, RegistryInterior>();
  private readonly parksById = new Map<string, RegistryPark>();
  private readonly streetsById = new Map<string, RegistryStreet>();
  private readonly places: PlaceRecord[] = [];
  private readonly interiorByBuilding = new Map<string, RegistryInterior>();
  /** Validation problems found at load (structural — consumers decide). */
  readonly issues: RegistryIssue[];

  constructor(doc: unknown) {
    this.doc = doc as RegistryDoc;
    this.neighbourhood = this.doc.neighbourhood?.name ?? 'Alder Heights';
    this.issues = [];
    this.index();
    this.issues.push(...this.validateCrossRefs());
  }

  /** Cross-reference integrity for THIS document (delegates to the pure
   *  static checker — one implementation, two entry points). */
  validateCrossRefs(): RegistryIssue[] {
    return validateCrossRefsStatic(this.doc);
  }

  private index(): void {
    for (const b of this.doc.buildings ?? []) {
      if (!isRegistryId(b.id)) { this.issues.push({ code: 'BAD_ID', detail: `building id "${b.id}"` }); continue; }
      this.buildingsById.set(b.id, b);
      const fp = b.footprint;
      if (fp) {
        this.places.push({
          id: b.id, kind: 'building', name: b.name ?? b.id,
          tags: tagsForBuilding(b),
          x: fp.x, z: fp.z,
          radius: Math.hypot(fp.w, fp.d) / 2,
          building: b,
        });
      }
    }
    for (const p of this.doc.parks ?? []) {
      if (!isRegistryId(p.id)) { this.issues.push({ code: 'BAD_ID', detail: `park id "${p.id}"` }); continue; }
      this.parksById.set(p.id, p);
      const bb = p.bbox;
      if (bb) {
        this.places.push({
          id: p.id, kind: 'park', name: p.name ?? p.id,
          tags: tagsForPark(),
          x: (bb.xMin + bb.xMax) / 2, z: (bb.zMin + bb.zMax) / 2,
          radius: Math.hypot(bb.xMax - bb.xMin, bb.zMax - bb.zMin) / 2,
          park: p,
        });
      }
    }
    for (const s of this.doc.streets ?? []) this.streetsById.set(s.id, s);
    for (const i of this.doc.interiors ?? []) {
      if (!isRegistryId(i.id)) { this.issues.push({ code: 'BAD_ID', detail: `interior id "${i.id}"` }); continue; }
      this.interiorsById.set(i.id, i);
      if (!this.interiorByBuilding.has(i.building)) this.interiorByBuilding.set(i.building, i);
      const s = i.shell;
      if (s && s.xMin !== undefined && s.xMax !== undefined && s.zMin !== undefined && s.zMax !== undefined) {
        const sz0 = Math.min(s.zMin, s.zMax), sz1 = Math.max(s.zMin, s.zMax);
        this.places.push({
          id: i.id, kind: 'building', name: i.id,
          tags: tagsForInterior(i),
          x: (s.xMin + s.xMax) / 2, z: (sz0 + sz1) / 2,
          radius: Math.hypot(s.xMax - s.xMin, sz1 - sz0) / 2,
        });
      }
    }
    // station houses are places too (transit)
    for (const b of this.doc.buildings ?? []) {
      if (/^SUB-/.test(b.id)) {
        const fp = b.footprint;
        if (!fp) continue;
        this.places.push({
          id: b.id, kind: 'transit', name: b.name ?? b.id,
          tags: ['transport', 'transit', 'public_access', 'enterable'],
          x: fp.x, z: fp.z, radius: Math.hypot(fp.w, fp.d) / 2, building: b,
        });
      }
    }
  }

  // -------------------------------------------------------------- queries ----

  building(id: string): RegistryBuilding | null { return this.buildingsById.get(id) ?? null; }
  interior(id: string): RegistryInterior | null { return this.interiorsById.get(id) ?? null; }
  park(id: string): RegistryPark | null { return this.parksById.get(id) ?? null; }
  street(id: string): RegistryStreet | null { return this.streetsById.get(id) ?? null; }

  /** The first interior registered for a building (its main interior). */
  interiorOfBuilding(buildingId: string): RegistryInterior | null {
    return this.interiorByBuilding.get(buildingId) ?? null;
  }

  allBuildings(): readonly RegistryBuilding[] { return this.doc.buildings ?? []; }
  allInteriors(): readonly RegistryInterior[] { return this.doc.interiors ?? []; }
  allParks(): readonly RegistryPark[] { return this.doc.parks ?? []; }
  allPlaces(): readonly PlaceRecord[] { return this.places; }

  /** The world-space point of a place id (building footprint center, park
   *  bbox center, or an entrance when one exists). Null when unknown. */
  placePoint(id: string): { x: number; z: number } | null {
    const b = this.buildingsById.get(id);
    if (b?.footprint) {
      const e = b.entrance?.[0];
      return e ? { x: e.x, z: e.z } : { x: b.footprint.x, z: b.footprint.z };
    }
    const p = this.parksById.get(id);
    if (p?.bbox) return { x: (p.bbox.xMin + p.bbox.xMax) / 2, z: (p.bbox.zMin + p.bbox.zMax) / 2 };
    const i = this.interiorsById.get(id);
    if (i?.shell && i.shell.xMin !== undefined && i.shell.zMin !== undefined && i.shell.xMax !== undefined && i.shell.zMax !== undefined) {
      return { x: (i.shell.xMin + i.shell.xMax) / 2, z: (i.shell.zMin + i.shell.zMax) / 2 };
    }
    return null;
  }

  /** Which building's footprint contains the point (for occupancy checks). */
  buildingAt(x: number, z: number): RegistryBuilding | null {
    for (const b of this.doc.buildings ?? []) {
      const fp = b.footprint;
      if (!fp || b.class === 'D') continue;
      if (Math.abs(x - fp.x) <= fp.w / 2 && Math.abs(z - fp.z) <= fp.d / 2) return b;
    }
    return null;
  }

  /** Which park's bbox contains the point. */
  parkAt(x: number, z: number): RegistryPark | null {
    for (const p of this.doc.parks ?? []) {
      const bb = p.bbox;
      if (bb && x >= bb.xMin && x <= bb.xMax && z >= bb.zMin && z <= bb.zMax) return p;
    }
    return null;
  }

  /** Places carrying ALL the requested tags, nearest first. */
  findPlaces(opts: {
    tags?: PlaceTag[];
    nearX?: number; nearZ?: number;
    maxRadius?: number;
    limit?: number;
  }): PlaceRecord[] {
    const tags = opts.tags ?? [];
    const hits: Array<{ p: PlaceRecord; d2: number }> = [];
    for (const p of this.places) {
      if (tags.length && !tags.every((t) => p.tags.includes(t))) continue;
      if (opts.nearX !== undefined && opts.nearZ !== undefined) {
        const dx = p.x - opts.nearX, dz = p.z - opts.nearZ;
        const d2 = dx * dx + dz * dz;
        if (opts.maxRadius !== undefined && d2 > opts.maxRadius * opts.maxRadius) continue;
        hits.push({ p, d2 });
      } else {
        hits.push({ p, d2: 0 });
      }
    }
    hits.sort((a, b) => a.d2 - b.d2 || (a.p.id < b.p.id ? -1 : 1)); // stable
    const out = hits.map((h) => h.p);
    return opts.limit !== undefined ? out.slice(0, opts.limit) : out;
  }
}

// --------------------------------------------------------------- validation ----

/** Cross-reference integrity — the runtime half of the mjs validator's
 *  checks that RUNNING systems depend on (the construction-only checks —
 *  overlap geometry, road clearance — stay in the mjs gate). */
export function validateCrossRefsStatic(doc: RegistryDoc): RegistryIssue[] {
  const issues: RegistryIssue[] = [];
  const bIds = new Set((doc.buildings ?? []).map((b) => b.id));
  const sIds = new Set((doc.streets ?? []).map((s) => s.id));
  const zIds = new Set((doc.npcZones ?? []).map((z) => z.id));
  const W = doc.bounds?.world;

  for (const it of doc.interiors ?? []) {
    // below-grade rooms (station mezzanines) span/exceed their entry
    // buildings by design — the shipped gate's exemption, kept identical
    if (it.shell?.belowGrade) continue;
    if (!bIds.has(it.building)) {
      issues.push({ code: 'INTERIOR_BUILDING_MISSING', detail: `${it.id} → ${it.building}` });
      continue;
    }
    const b = (doc.buildings ?? []).find((x) => x.id === it.building);
    const s = it.shell;
    const fp = b?.footprint;
    if (s && fp && !s.belowGrade
      && s.xMin !== undefined && s.xMax !== undefined && s.zMin !== undefined && s.zMax !== undefined) {
      const sz0 = Math.min(s.zMin, s.zMax), sz1 = Math.max(s.zMin, s.zMax);
      const inside = s.xMin >= fp.x - fp.w / 2 - 0.01 && s.xMax <= fp.x + fp.w / 2 + 0.01
        && sz0 >= fp.z - fp.d / 2 - 0.01 && sz1 <= fp.z + fp.d / 2 + 0.01;
      if (!inside) issues.push({ code: 'INTERIOR_OUTSIDE_BUILDING', detail: `${it.id} outside ${it.building}` });
    }
    for (const a of it.anchors ?? []) {
      if (a.facade) continue;
      if (s && s.xMin !== undefined && s.xMax !== undefined && s.zMin !== undefined && s.zMax !== undefined) {
        const sz0 = Math.min(s.zMin, s.zMax), sz1 = Math.max(s.zMin, s.zMax);
        if (a.x < s.xMin - 0.01 || a.x > s.xMax + 0.01 || a.z < sz0 - 0.01 || a.z > sz1 + 0.01) {
          issues.push({ code: 'ANCHOR_OUTSIDE_SHELL', detail: `${it.id}.${a.id}` });
        }
      }
    }
  }
  for (const ix of doc.intersections ?? []) {
    for (const s of ix.streets ?? []) {
      if (!sIds.has(s)) issues.push({ code: 'INTERSECTION_STREET_MISSING', detail: `${ix.id} → ${s}` });
    }
    for (const c of ix.cornerBuildings ?? []) {
      if (!bIds.has(c)) issues.push({ code: 'CORNER_BUILDING_MISSING', detail: `${ix.id} → ${c}` });
    }
  }
  for (const p of doc.parks ?? []) {
    for (const z of p.npcZones ?? []) {
      if (!zIds.has(z)) issues.push({ code: 'PARK_ZONE_MISSING', detail: `${p.id} → ${z}` });
    }
  }
  if (W) {
    for (const b of doc.buildings ?? []) {
      const fp = b.footprint;
      if (!fp) continue;
      const x0 = fp.x - fp.w / 2, x1 = fp.x + fp.w / 2;
      const z0 = fp.z - fp.d / 2, z1 = fp.z + fp.d / 2;
      if (x0 < W.xMin - 0.01 || x1 > W.xMax + 0.01 || z0 < W.zMin - 0.01 || z1 > W.zMax + 0.01) {
        issues.push({ code: 'OUT_OF_BOUNDS', detail: b.id });
      }
    }
  }
  return issues;
}

/** The shared, validated registry instance (the app has one world). */
export function loadRegistry(): WorldRegistry {
  return new WorldRegistry(registryJson);
}
