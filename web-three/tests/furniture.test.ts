/**
 * ABO furniture manifest laws (docs/57).
 *
 * The furniture seam swaps interior placeholder fixtures for real curated
 * ABO models at boot. The swap is visual-only and must never become a
 * dependency — these tests pin the manifest's own consistency and its
 * provenance chain so the seam cannot silently drift:
 *
 *   1. MANIFEST — every slot is well-formed; fixture names are unique;
 *      hide targets never include the slot's own fixture.
 *   2. DRIFT — every manifest fixture name exists in the World builders
 *      (a rename in a room breaks the slot → caught here, not at runtime).
 *   3. FILES — every slot id ships its file (public/models/furniture/),
 *      byte-identical to the dataset's lod1 GLB it was fetched from.
 *   4. PROVENANCE — every file's ASIN is in the curated pack
 *      (docs/data/abo-curated.json) and credited in ATTRIBUTION.md
 *      (CC-BY-4.0's attribution term).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FURNITURE_SLOTS, FURNITURE_FILES, FURNITURE_PROVENANCE, GIFTED_PACK_PROVENANCE } from '../src/world/furniture';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const GAME_DIR = join(HERE, '..', 'public', 'models', 'furniture');
const PACK_DIR = join(ROOT, 'assets', 'furniture');
const GIFTED_DIR = join(ROOT, 'assets', 'packs');

const worldTs = readFileSync(join(HERE, '..', 'src', 'world', 'World.ts'), 'utf8');
const curated = JSON.parse(readFileSync(join(ROOT, 'docs', 'data', 'abo-curated.json'), 'utf8')) as
  Array<{ id: string; bucket: string; lod1_bytes: number; lod1: string }>;

describe('ABO furniture manifest (docs/57)', () => {
  it('every slot is well-formed', () => {
    for (const s of FURNITURE_SLOTS) {
      expect(['CECIL', 'HALL', 'DINER', 'LAUNDRY', 'BARBER', 'PIZZA', 'BAKERY', 'RECORDS'], s.fixture).toContain(s.room);
      expect(s.height, `${s.fixture} height`).toBeGreaterThan(0);
      expect(Number.isFinite(s.height), `${s.fixture} finite height`).toBe(true);
      for (const h of s.hide ?? []) expect(h, s.fixture).not.toBe(s.fixture);
    }
  });

  it('fixture names are unique — one placeholder, one slot', () => {
    const names = FURNITURE_SLOTS.map((s) => s.fixture);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every manifest fixture exists in the World builders (drift pin)', () => {
    for (const s of FURNITURE_SLOTS) {
      const found = worldTs.includes(`'${s.fixture}'`)
        || worldTs.includes(`\`${s.fixture}\``)
        // named loops (the diner stools): the stem appears in a template literal
        || (s.fixture.split('_').length > 1 && worldTs.includes(`\`${s.fixture.split('_').slice(0, -1).join('_')}_\${`));
      expect(found, `fixture ${s.fixture} not found in World.ts`).toBe(true);
      if (s.hide) for (const h of s.hide) {
        expect(worldTs.includes(`'${h}'`), `hide target ${h} not found in World.ts`).toBe(true);
      }
    }
  });

  it('every slot id ships its file in public/models/furniture/', () => {
    for (const id of FURNITURE_FILES) {
      expect(existsSync(join(GAME_DIR, `${id}.glb`)), `${id}.glb missing`).toBe(true);
    }
    // provenance is total: every file the game ships has a known source —
    // an ABO ASIN or a gifted-pack reference
    const shipped = readdirSync(GAME_DIR).filter((f) => f.endsWith('.glb')).map((f) => f.replace('.glb', ''));
    for (const id of shipped) {
      const sourced = FURNITURE_PROVENANCE[id] || GIFTED_PACK_PROVENANCE[id];
      expect(sourced, `${id} has no provenance`).toBeTruthy();
    }
  });

  it('the two manifest sources partition cleanly (no id in both)', () => {
    for (const id of Object.keys(GIFTED_PACK_PROVENANCE)) {
      expect(FURNITURE_PROVENANCE[id], `${id} claimed by both sources`).toBeUndefined();
    }
    for (const s of FURNITURE_SLOTS) {
      const known = FURNITURE_PROVENANCE[s.id] || GIFTED_PACK_PROVENANCE[s.id];
      expect(known, `slot ${s.id} has no provenance`).toBeTruthy();
    }
  });

  it('game files are the dataset lod1 GLBs, byte-identical to the pack', () => {
    for (const id of Object.keys(FURNITURE_PROVENANCE)) {
      const asin = FURNITURE_PROVENANCE[id];
      const rec = curated.find((c) => c.id === asin);
      expect(rec, `${asin} (${id}) is in the curated pack`).toBeTruthy();
      const game = readFileSync(join(GAME_DIR, `${id}.glb`));
      const pack = readFileSync(join(PACK_DIR, rec!.bucket, `${asin}.glb`));
      expect(game.equals(pack), `${id}.glb == pack copy`).toBe(true);
      expect(game.length, `${id}.glb matches the recorded lod1_bytes`).toBe(rec!.lod1_bytes);
    }
  });

  it('gifted-pack files are byte-identical to their pack references', () => {
    for (const [id, prov] of Object.entries(GIFTED_PACK_PROVENANCE)) {
      const game = readFileSync(join(GAME_DIR, `${id}.glb`));
      const refPath = prov.pack === 'scandi'
        ? join(GIFTED_DIR, 'lowpoly-furniture', 'models', `${prov.ref}.glb`)
        : join(GIFTED_DIR, 'modern-interior', 'exports', 'glb', `${prov.ref}.glb`);
      expect(existsSync(refPath), `reference copy ${refPath} missing`).toBe(true);
      const ref = readFileSync(refPath);
      expect(game.equals(ref), `${id}.glb == ${prov.pack}/${prov.ref}.glb`).toBe(true);
    }
  });

  it('the gifted packs carry their license/provenance files', () => {
    // pack one — first-party (owner-generated): manifest + README + sources
    expect(existsSync(join(GIFTED_DIR, 'lowpoly-furniture', 'manifest.json'))).toBe(true);
    expect(existsSync(join(GIFTED_DIR, 'lowpoly-furniture', 'README.md'))).toBe(true);
    // pack two — LM Scenova Studios, embed-in-project license
    expect(existsSync(join(GIFTED_DIR, 'modern-interior', 'LICENSE.txt'))).toBe(true);
    const notices = readFileSync(join(ROOT, 'THIRD-PARTY-NOTICES.md'), 'utf8');
    expect(notices).toContain('LM Scenova Studios');
  });

  it('the curated pack is credited (CC-BY-4.0 attribution)', () => {
    const attr = readFileSync(join(PACK_DIR, 'ATTRIBUTION.md'), 'utf8');
    expect(attr).toContain('CC-BY-4.0');
    for (const rec of curated) {
      expect(attr.includes(rec.id), `attribution mentions ${rec.id}`).toBe(true);
    }
    expect(existsSync(join(PACK_DIR, 'LICENSE-CC-BY-4.0.txt'))).toBe(true);
  });
});
