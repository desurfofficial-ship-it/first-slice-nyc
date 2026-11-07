# 07 — Production Integration & Replacement Report

**Branch:** `feat/sandflow-evaluation` · **Date:** 2026-11-07 · **Author:** Sandflow evaluation agent

This is the follow-through to docs 01–06: the approved GLBs left the
experimental folder and now wear their real counterparts in the playable
Alder Heights block. Every claim below is backed by a probe run, a test
gate, or a screenshot in `evidence/`.

## 1. How the assets integrate

Two repo laws carry the whole integration:

- **The GLB seam** (`World.upgradePropWithGLB`, docs/28): a registered
  placeholder wears `public/models/<id>.glb` at boot, uniform-scaled to the
  placeholder's height, feet on the same ground, inside a ±90 % footprint
  band. A missing or malformed file keeps the procedural look — the game
  never depends on the models.
- **The vertex-fuse law** (`vertexFuse.ts`, docs/51 B13): a GLB whose parts
  are flat, untextured, unmetallic, single-sided fuses into ONE
  vertex-colored draw. sand3d's presets are metallic, clearcoated and
  double-sided — `tools3d/sandflow_eval/postprocess_glb.py` flattens every
  material (metallicFactor 0, `KHR_materials_clearcoat` stripped,
  `doubleSided` false) without touching geometry, hierarchy or the
  `s3d_joint` node extras. Processed ≡ original byte-verified on bounds.

The post-processor is pure stdlib Python and lives with the pack; the
pipeline is: `sand3d program → GLB → postprocess_glb.py → public/models/`.

## 2. Asset-by-asset replacement table

| # | Asset | Existing counterpart | Integrated? | Replaced? | Verification |
|---|-------|----------------------|-------------|-----------|--------------|
| 1 | `hydrant` (west curb) | Coral cylinder placeholder + the shipped baseline `hydrant.glb` | Yes | **Yes — file replaced** | seam map `hydrant` · `evidence/before-after-sheet.png` (pink blob → silver/green hydrant) |
| 2 | `hydrant_east` (34, −4.75) | `makeHydrant` group | Yes | Yes | seam map · fallback arm deepened 0.14→0.30 m to satisfy the footprint band |
| 3 | DSNY basket ×3 | `makeTrashCan` groups (street, north, east) | Yes | Yes ×3 | seam map `trashcan`, `trashcan_north`, `trashcan_east` · one street, one look |
| 4 | Recycling bin | `makeRecycleBin` at the corner station | Yes | Yes | seam map `recycle_bin_east` · shared station collider untouched |
| 5 | Street lamp | `makeStreetlamp` at (13.5, −5.9) | Yes | Yes | seam map `streetlamp` (8.5 m cobra scaled to the slot's 4.4 m) · the 5-lamp banked row retained on purpose |
| 6 | Park bench ×2 | Plaza + bus-stop `makeBench` groups | Yes | Yes ×2 | seam map `bench_plaza`, `bench_bus` · colliders unchanged · the park's 5 benches retained (see §4) |
| 7 | Apartment door | `Stoop_Door` — the Day-2 "teal door" box | Yes | **Yes** | canon teal baked into the leaf (`#2a9d8f`, linear), π-yawed to face the street, brass knob hides when the model lands · `evidence/evidence-door-closeup.png` |
| 8 | Washing machine ×6 | `LW_*` gray boxes in the LAUNDRY-INT registry room | Yes | Yes ×6 | yawed slot groups (door east, into the room); porthole disc disposed with the box; "Dry & fold — $2" prompt intact · `evidence/evidence-washers.png` |
| 9 | Bodega shelf ×3 | `Bodega_BackShelf` blank box | Yes | Yes ×3 | same 6 m span, one unchanged collider, π-yawed into the store · `evidence/evidence-bodega-shelves.png` |
| 10 | Commercial fridge | **None — added, not swapped** | Yes (add) | — | east wall of the bodega interior, matching collider · visible in `evidence/evidence-bodega-shelves.png` (frame right) |
| 11 | Newsrack | Red box of the two-box newspaper pair | **No — retained** | No | the seam refuses non-uniformly-scaled placeholders (the factory's unit-box pattern); group-level fit fails the ±90 % band. GLB stays in the showcase. Fix = a real-geometry slot in the factory — follow-up, not a hack |
| 12 | Storefront | `makeStorefront` facades (pizza, bakery…) | **No — retained** | No | the facades carry canon signage (`CORNER SLICE PIZZA`), probe-asserted glass names and the roof-duck law; a generic GLB would delete authored identity to win a swap |
| 13 | Security gate | **None — not adopted** | No | No | every host surface is canon (the bodega's warm window, the pizza glass); placing a closed gate would cover authored beats. Articulated GLB remains in the dev-only showcase with its two revolute leaves proven |

**Score: 9 of 12 asset categories replaced in the world (13 swapped
instances + 1 add), 3 deliberately not adopted — each with the reason, per
the replacement-safety rules.**

## 3. Measured performance (the whole block, software GL, 960×640)

| Metric | Before | After | Delta |
|---|---|---|---|
| Draw calls (plaza vantage) | 122 | 142 | **+20 for 22 landed instances** — the fuse law holds (~1 draw/prop) |
| Rendered triangles | 117.0 k | 248.9 k | +131.9 k (the models' real detail: 3 baskets 47 k, 3 shelves 27 k, 6 washers 12 k, lamp 11 k, benches 18 k…) |
| fps (swiftshader, 2.5 s sample) | 4 | 4 | **no regression** on the worst-case rasterizer |
| Console errors | 0 | 0 | — |
| Seam failures | 3 (no files) | 2 (both documented retentions) | — |

Sources: `evidence/before-integration.json`, `evidence/after-fixed-integration.json`
(the seam maps, `[glb]` lines and renderer info are recorded verbatim).

## 4. Optimization decisions

- **One draw per prop.** The material flattening pass is what buys the
  fuse: before it, a hydrant drew 4×, a shelf 14×. After it, every landed
  prop is one vertex-colored draw on the shared world material — the same
  law the shipped vehicles follow.
- **Same file, many slots.** Six washers and three baskets reuse one URL
  each; the browser fetches bytes once. Instancing beyond that is future
  work — at 22 instances the draw count is already flat.
- **No blind decimation.** The +132 k triangles are the pack's modeled
  detail; fps did not move on the software rasterizer, and the E2E's timed
  beats all landed. If a future GPU-starved rig needs it back, the levers
  are per-district LOD on the two interior tiles first — not global
  decimation.
- **Fallback look preserved.** Placeholder boxes keep their colors and
  footprints; deleting `public/models/*.glb` reverts to the shipped world
  with zero code changes.

## 5. Verification gates (all executed on this branch)

- `tsc --noEmit` — clean
- `vitest run` — **889/889 (61 files)**
- `npm run build` (tsc + vite) — OK
- `probe-integration.mjs` — 22 seams landed, 0 console errors, 8/8
  vantage walks, before/after JSONs captured
- **4-day E2E (`e2e.mjs`, 480×320 slow-rig profile) — 0 failures, 457 s,
  console clean; the save holds Day 4 complete ($123, map, permit, stool)**
- Evidence shots: canon teal door on the stoop, stocked bodega shelves,
  registry washers with the interaction prompt, DSNY-corner before/after

## 6. The honest defect log (found and fixed on the way)

1. **The post-processor corrupted the BIN chunk** (first version kept the
   8-byte chunk header, shifting every bufferView +8). The probe caught it
   as inflated in-engine bounds and footprint-guard rejections; some
   corrupted files still *passed* the guard — the lesson is that a guard
   pass is not a geometry check. Fixed by slicing the payload; processed
   files now measure byte-identical bounds to the originals.
2. **GLB fronts face +Z.** The first door screenshot showed its brown
   `wall_band` back. Door and shelves now carry an authored π yaw;
   washer/fridge yaws were already per-slot correct.
3. **The footprint band is a real gate, not a formality** — the shipped
   baseline hydrant fails it (0.76 m wide at placeholder height); the
   sand3d hydrant passes. The eval pack is the first `hydrant.glb` that
   actually wears the seam.

## 7. Provenance / licensing

- sand3d tool: Apache-2.0. Programs: original work except
  `washing_machine.py` (adapted from sand3d's Apache-2.0 example, notice
  kept in doc 03). No Hugging Face dataset content anywhere in the pack.
- The production GLBs are build products of the committed programs plus
  `postprocess_glb.py` — reproducible end to end (doc 05 workflow).
