/**
 * Interior dressing manifest laws (docs/production/interiors/).
 *
 * The interiors seam swaps room placeholder fixtures for sand3d-built
 * equipment at boot (World.upgradeInteriorPropsWithGLB). The swap is
 * visual-only and must never become a dependency — these tests pin the
 * manifest's own consistency and its provenance chain so the seam cannot
 * silently drift:
 *
 *   1. MANIFEST — every slot is well-formed; ids unique; fixture names
 *      unique; rooms are the nine shipped interiors.
 *   2. DRIFT — every manifest fixture name is built by the World builders
 *      (a rename in a room breaks the slot → caught here, not at runtime).
 *   3. FILES — every worn file ships in public/models/, and the build
 *      manifest (tools3d/sandflow_eval/validation/interiors-manifest.json)
 *      records it as a QA-gated sand3d build.
 *   4. PROVENANCE — every file's program exists in
 *      tools3d/sandflow_eval/programs/ and is named in INTERIOR_PROVENANCE.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INTERIOR_SLOTS, INTERIOR_FILES, INTERIOR_PROVENANCE } from '../src/world/interiorAssets';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const GAME_DIR = join(HERE, '..', 'public', 'models');
const BUILD_MANIFEST = JSON.parse(readFileSync(
  join(ROOT, 'tools3d', 'sandflow_eval', 'validation', 'interiors-manifest.json'), 'utf8')) as
  { assets: Array<{ name: string; tris: number; bytes: number }> };

const worldTs = readFileSync(join(HERE, '..', 'src', 'world', 'World.ts'), 'utf8');

describe('interior dressing manifest (docs/production/interiors/)', () => {
  it('every slot is well-formed and names a shipped interior', () => {
    for (const s of INTERIOR_SLOTS) {
      expect(
        ['BODEGA', 'LAUNDRY', 'BARBER', 'PIZZA', 'BAKERY', 'RECORDS', 'HALL', 'DINER', 'CECIL', 'CORNERHOUSE'],
        s.id,
      ).toContain(s.room);
      expect(s.fixture.length, `${s.id} fixture name`).toBeGreaterThan(0);
    }
  });

  it('slot ids are unique and fixture names are unique', () => {
    const ids = INTERIOR_SLOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const fixtures = INTERIOR_SLOTS.map((s) => s.fixture);
    expect(new Set(fixtures).size).toBe(fixtures.length);
  });

  it('every manifest fixture is built by the World builders (drift pin)', () => {
    for (const s of INTERIOR_SLOTS) {
      const found = worldTs.includes(`'${s.fixture}'`)
        || worldTs.includes(`\`${s.fixture}\``)
        // named loops (the dryers, the barber chairs, the record bins): the
        // stem appears in a template literal
        || (s.fixture.split('_').length > 1
          && worldTs.includes(`\`${s.fixture.split('_').slice(0, -1).join('_')}_\${`));
      expect(found, `fixture ${s.fixture} not found in World.ts`).toBe(true);
    }
  });

  it('every worn file ships in public/models/ and passes the QA gate', () => {
    const built = new Map(BUILD_MANIFEST.assets.map((a) => [a.name, a]));
    for (const file of INTERIOR_FILES) {
      const stem = basename(file, '.glb');
      expect(existsSync(join(GAME_DIR, file.replace(/^models\//, ''))), `${file} missing`).toBe(true);
      expect(built.get(stem), `${stem} is in the interiors build manifest`).toBeTruthy();
      expect(built.get(stem)!.bytes, `${stem} nonempty`).toBeGreaterThan(0);
    }
  });

  it('every file has sand3d program provenance that exists on disk', () => {
    for (const file of INTERIOR_FILES) {
      const stem = basename(file, '.glb');
      const program = INTERIOR_PROVENANCE[stem];
      expect(program, `${stem} has a program`).toBeTruthy();
      expect(
        existsSync(join(ROOT, 'tools3d', 'sandflow_eval', 'programs', `${program}.py`)),
        `programs/${program}.py exists`,
      ).toBe(true);
    }
  });

  it('every interior wears at least one sand3d asset (the batch is total)', () => {
    const rooms = new Set(INTERIOR_SLOTS.map((s) => s.room));
    type Room = typeof INTERIOR_SLOTS[number]['room'];
    const expected: readonly Room[] =
      ['BODEGA', 'LAUNDRY', 'BARBER', 'PIZZA', 'BAKERY', 'RECORDS', 'HALL', 'DINER', 'CECIL', 'CORNERHOUSE'];
    for (const room of expected) {
      expect(rooms.has(room), `${room} wears sand3d dressing`).toBe(true);
    }
  });
});
