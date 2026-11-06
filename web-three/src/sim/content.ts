/**
 * The content, asset & resource contract — Foundation F
 * (docs/architecture/world-contract/11).
 *
 * How content is identified, referenced, and verified. The law: an
 * entity's referenced assets must be checkable to EXIST, and a missing
 * asset degrades deliberately (the shipped costume law — a missing GLB
 * keeps the procedural room, one console.info, no retries), never
 * breaks a scene.
 *
 * This module defines:
 *   - ContentRef — how any entity points at an asset;
 *   - ContentManifest — a validated set of assets (id/kind/tags/path);
 *   - validateManifest — structural checks (id laws, safe paths, known
 *     kinds, duplicate detection);
 *   - the FURNITURE pack bridge: the ABO curated manifest
 *     (docs/data/abo-curated.json) validated as a ContentManifest, so
 *     future content agents share one vocabulary (tests pin it).
 *
 * Deliberately NOT here: an asset library. The architecture is the
 * deliverable; the library is Workstream E's product.
 */

import { isRegistryId, isSimId } from './ids';

/** What kind of thing an asset is. Closed set — extend WITH a test. */
export const CONTENT_KINDS = [
  'building_variant', 'interior_kit', 'furniture', 'street_prop',
  'vehicle', 'clothing', 'character_look', 'interactive_object',
  'audio', 'texture_atlas',
] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export function isContentKind(k: string): k is ContentKind {
  return (CONTENT_KINDS as readonly string[]).includes(k);
}

/** How a content entry resolves to files. */
export type ContentSource =
  | { type: 'glb'; /** repo-relative path (assets/… or web-three/public/…). */ path: string }
  | { type: 'procedural'; /** built in code — always exists. */ builder: string }
  | { type: 'atlas'; path: string };

export interface ContentEntry {
  /** Content id: `content:<local>` or a registry-style id for built-in
   *  canon props. The id is stable and permanent (the furniture slots'
   *  ids are the precedent). */
  id: string;
  kind: ContentKind;
  label: string;
  tags: string[];                 // semantic tags for selection
  source: ContentSource;
  /** License note when the asset is not original (CC-BY-4.0 duty). */
  license?: string;
  attribution?: string;
}

export interface ContentIssue {
  code: 'BAD_ID' | 'BAD_KIND' | 'BAD_PATH' | 'DUPLICATE' | 'MISSING_LICENSE';
  detail: string;
}

/** Repo-relative path safety: no escaping, no absolute, sane suffix. */
export function isSafeContentPath(p: string): boolean {
  if (p.length === 0 || p.length > 200) return false;
  if (p.startsWith('/') || p.includes('\\')) return false;
  if (p.split('/').includes('..')) return false;
  return /\.(glb|gltf|png|jpg|webp|ktx2|mp3|ogg|wav|json)$/.test(p);
}

export function validateManifest(entries: readonly ContentEntry[]): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (!isSimId(e.id) && !isRegistryId(e.id)) {
      issues.push({ code: 'BAD_ID', detail: e.id });
      continue;
    }
    if (seen.has(e.id)) { issues.push({ code: 'DUPLICATE', detail: e.id }); continue; }
    seen.add(e.id);
    if (!isContentKind(e.kind)) { issues.push({ code: 'BAD_KIND', detail: `${e.id}: ${e.kind}` }); }
    if (e.source.type !== 'procedural' && !isSafeContentPath(e.source.path)) {
      issues.push({ code: 'BAD_PATH', detail: `${e.id}: ${e.source.path}` });
    }
    // CC-BY-4.0 duty: anything non-original carries its license line
    if (e.source.type === 'glb' && !e.license) {
      issues.push({ code: 'MISSING_LICENSE', detail: e.id });
    }
  }
  return issues;
}

// ------------------------------------------------- the ABO furniture bridge ----

/** One row of docs/data/abo-curated.json (the fields this contract reads). */
export interface CuratedFurnitureRow {
  id?: string;
  name?: string;
  bucket?: string;
  product_type?: string;
  repo_path?: string;
  license?: string;
  triangles?: number;
  size_metres?: [number, number, number];
  score?: number;
}

/**
 * Convert curated furniture rows into ContentEntry list (the pack becomes
 * a manifest — discoverable and validatable by the same rules as every
 * other content). Rows without a repo_path are skipped (the manifest's
 * own law: repo_path on every curated entry).
 */
export function furniturePackToEntries(rows: readonly CuratedFurnitureRow[]): ContentEntry[] {
  const out: ContentEntry[] = [];
  for (const r of rows) {
    if (!r.id || !r.repo_path) continue;
    out.push({
      id: `content:furn_${r.id.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
      kind: 'furniture',
      label: r.name ?? r.id,
      tags: [r.bucket ?? 'furniture', r.product_type ?? 'object'],
      source: { type: 'glb', path: r.repo_path },
      license: r.license ?? 'CC-BY-4.0',
      attribution: 'Amazon Berkeley Objects (ABO), via HF codepawl/abo-glb — see assets/furniture/ATTRIBUTION.md',
    });
  }
  return out;
}
