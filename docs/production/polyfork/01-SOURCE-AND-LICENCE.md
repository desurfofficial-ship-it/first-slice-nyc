# The Polyfork Streets Wave — 01: source, licence, provenance

> **Status: IMPLEMENTED + VERIFIED** (2026-11-14, register v1.80.0).
> The owner's 2026-11-14 directive authorized Polyfork
> (https://polyfork.dev/) as an additional 3D-asset source for FIRST
> SLICE, with the NYC City Kit (82 parts) named for study and selective
> integration. This is the wave's record: what was selected, why, how it
> was integrated, and what it measured.

## 1. The source and its licence

Polyfork is a generated low-poly catalogue with a public API. The facts
this wave built on (from the developer instructions,
https://polyfork.dev/prompt.txt, and the kit API):

- **The kit**: `nyc-city-kit-fbca88` — 82 parts, status `published`,
  one shared palette and one scale, a 4 m-grid assembly contract for the
  tiles. Every part carries `triangles`, `size_m` (real-world meters),
  `palette`, `has_night`, `credit`, and a thumbnail.
- **The licence**: the free kit's **mesh files (GLB) are CC BY 4.0** —
  use to build games and products, modify freely, attribution required
  via the part's `credit` field ("… by Polyfork (https://polyfork.dev/)").
  The `.mjs` modules and HD editions carry separate terms — **none are
  used and none are redistributed here**. Hosting free mesh files with
  their CC BY credit is allowed; this repo hosts exactly that.
- **The files**: GLBs are plain glTF 2.0 — indexed primitives, no
  Draco/meshopt, per-vertex `COLOR_0`, zero textures (verified across
  all 16 candidates inspected).

## 2. What ships where

- `assets/packs/polyfork/glb/` — the ten placed parts' GLBs (the
  extraction's source of truth), with `meta/` carrying the kit API's own
  metadata JSONs (title, triangles, size_m, credit) — provenance pinned
  next to the bytes, the `assets/furniture/` precedent.
- `assets/packs/polyfork/ATTRIBUTION.md` — the pack's own credit table.
- `THIRD-PARTY-NOTICES.md` — the repo-level notice (the attribution law).
- `web-three/src/world/polyforkData.ts` — GENERATED (do not edit): the
  per-tri flat-color vertex data, quantized (positions uint16 at a
  per-asset scale ≈ 0.1 mm, colors uint8), 277 KB committed for
  9,978 tris — the rebuild is byte-identical (verified by SHA-256).
- `tools3d/polyfork/extract_polyfork.py` — the deterministic extractor
  (see 03 for its laws).

## 3. The rules the wave set for itself (and kept)

1. **No blind import.** 82 parts audited; 16 inspected at the GLB level;
   10 placed; 6 rejected with reasons (02); 66 never candidates (02).
2. **Reuse first.** Where the shipped world already owns a prop class —
   trees, benches, hydrants, lamps, traffic signals, trash, bus stops,
   the subway entrance, manholes, the taxi — the kit's version was
   REJECTED, not placed (the anti-slop gate's "do not replace working
   assets" clause).
3. **The kit must not dictate the look.** The kit's flat-shaded,
   muted-NYC palette (slate #45525f, MTA green #3d6b52, brick #b83833,
   cab yellow #e8a825, concrete #9f9890) sits inside the Doc-04 world
   palette's neighborhood — the placed assets read as the same city.
   No whole kit BUILDINGS were imported (the world's facades are
   registry-driven canvas craft; a GLB mass would bypass the A-3 law
   and the palette law at once).
4. **Licence honesty.** Every placed part's credit travels in the data
   module, the pack's ATTRIBUTION.md, and the repo notices.
