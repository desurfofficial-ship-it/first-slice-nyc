/**
 * sim/content — the content & asset contract (world-contract/11), proven
 * against the REAL ABO furniture manifest (docs/data/abo-curated.json).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateManifest, furniturePackToEntries, isSafeContentPath, isContentKind,
  type ContentEntry, type CuratedFurnitureRow,
} from '../src/sim/content';

const ROOT = join(import.meta.dirname, '..', '..');

describe('sim/content — manifest laws', () => {
  it('rejects bad ids, unknown kinds, unsafe paths, duplicates', () => {
    const issues = validateManifest([
      { id: 'content:good', kind: 'furniture', label: 'ok', tags: [], source: { type: 'procedural', builder: 'props.makeBench' } },
      { id: 'bad id with spaces', kind: 'furniture', label: 'x', tags: [], source: { type: 'procedural', builder: 'x' } },
      { id: 'content:kindless', kind: 'alien_kin' as never, label: 'x', tags: [], source: { type: 'procedural', builder: 'x' } },
      { id: 'content:escaper', kind: 'furniture', label: 'x', tags: [], source: { type: 'glb', path: '../secrets/key.glb' } },
      { id: 'content:dup', kind: 'furniture', label: 'x', tags: [], source: { type: 'procedural', builder: 'x' } },
      { id: 'content:dup', kind: 'furniture', label: 'x2', tags: [], source: { type: 'procedural', builder: 'x' } },
      { id: 'content:nolicense', kind: 'furniture', label: 'x', tags: [], source: { type: 'glb', path: 'assets/furniture/sofas/a.glb' } },
    ]);
    expect(issues.map((i) => i.code)).toEqual([
      'BAD_ID', 'BAD_KIND', 'BAD_PATH', 'MISSING_LICENSE', 'DUPLICATE', 'MISSING_LICENSE',
    ]);
    // (the path-escape entry ALSO reports its missing license — two aspects,
    // two findings; the duplicate entry short-circuits at the id gate)
  });

  it('path safety is exact (no escape, no absolute, known suffix)', () => {
    expect(isSafeContentPath('assets/furniture/sofas/B07.glb')).toBe(true);
    expect(isSafeContentPath('web-three/public/models/hydrant.glb')).toBe(true);
    expect(isSafeContentPath('/absolute/path.glb')).toBe(false);
    expect(isSafeContentPath('a/../b.glb')).toBe(false);
    expect(isSafeContentPath('a\\b.glb')).toBe(false);
    expect(isSafeContentPath('a.exe')).toBe(false);
  });

  it('content kinds are a closed set', () => {
    expect(isContentKind('vehicle')).toBe(true);
    expect(isContentKind('cutscene')).toBe(false);
  });
});

describe('sim/content — the ABO furniture pack speaks the contract', () => {
  const raw = JSON.parse(readFileSync(join(ROOT, 'docs', 'data', 'abo-curated.json'), 'utf8')) as
    { models?: CuratedFurnitureRow[] } | CuratedFurnitureRow[];
  const rows: CuratedFurnitureRow[] = Array.isArray(raw) ? raw : (raw.models ?? []);

  it('the curated manifest parses and every row carries repo_path (the discoverability law)', () => {
    expect(rows.length).toBeGreaterThanOrEqual(141);
    const missing = rows.filter((r) => !r.repo_path);
    expect(missing).toEqual([]);
  });

  it('converting the pack yields a VALID ContentManifest (schema + license duty)', () => {
    const entries = furniturePackToEntries(rows);
    expect(entries.length).toBe(rows.length);
    const issues = validateManifest(entries);
    expect(issues).toEqual([]);
  });

  it('converted ids are unique and paths are safe', () => {
    const entries = furniturePackToEntries(rows);
    const ids = new Set(entries.map((e) => e.id));
    expect(ids.size).toBe(entries.length);
    for (const e of entries) {
      if (e.source.type === 'glb') {
        expect(e.source.path.startsWith('assets/furniture/'), e.source.path).toBe(true);
      }
      expect(e.license).toBe('CC-BY-4.0');
      expect(e.attribution).toContain('ABO');
    }
  });

  it('a sample manifest entry survives a JSON round-trip (save-safe shapes)', () => {
    const entries: ContentEntry[] = furniturePackToEntries(rows.slice(0, 3));
    const back = JSON.parse(JSON.stringify(entries)) as ContentEntry[];
    expect(back).toEqual(entries);
  });
});
