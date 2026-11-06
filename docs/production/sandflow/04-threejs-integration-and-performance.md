# Sandflow / Sand3D — 04 Three.js Integration & Performance

**Test environment:** the existing FIRST SLICE app, unchanged except for (a) a URL-param hatch in
`web-three/src/main.ts` and (b) one new dev-only module `web-three/src/showcase/sandflowShowcase.ts`.
No parallel rendering architecture, no new dependencies, no production assets touched. The
showcase follows the repo's own conventions: `?showcase=sandflow` gate + lazy dynamic import
(the `?scenario` pattern), Wardrobe-style isolated renderer, Doc-04 palette, `NeutralToneMapping`,
PCFSoft 2048 shadows, amber fog, and the GLB seam law (missing file → one `console.info`, no retry).

**Gates:** `npx tsc --noEmit` clean; `npx vitest run` **61 files / 889 tests, all passing** — the
experiment is provably invisible to the game.

## 1. What the showcase measures (real loaded scene, no estimates)

Open `http://localhost:5173/?showcase=sandflow`. The panel lists per-asset live measurements;
`renderer.info` reports the actual draw calls and triangles of the loaded scene. A probe
(`web-three/scripts/probe-sandflow.mjs`, the repo's Playwright pattern with SwiftShader)
automates it and writes `tools3d/sandflow_eval/validation/browser-measurements.json`.

**Per-asset, as loaded in-engine** (see also `validation/glb-validation.json`):

| asset | tris | meshes | materials | textures | GLB KB | size (m, W×D×H) | joints |
|---|---|---|---|---|---|---|---|
| hydrant | 5,168 | 7 | 4 | 0 | 134 | 0.42×0.37×0.78 | 0 |
| dsny_basket | 15,828 | 23 | 2 | 0 | 259 | 0.49×0.49×0.97 | 0 |
| recycling_bin | 688 | 7 | 4 | 0 | 27 | 0.64×0.62×1.01 | 0 |
| park_bench | 9,064 | 14 | 3 | 0 | 160 | 1.71×0.59×0.79 | 0 |
| streetlight | 10,948 | 12 | 4 | 0 | 231 | 2.92×0.34×8.52 | 0 |
| newsrack | 2,500 | 10 | 8 | 0 | 57 | 0.67×0.65×1.20 | 0 |
| apartment_door | 6,872 | 15 | 5 | 0 | 132 | 1.06×0.21×2.21 | 1 |
| security_gate | 7,964 | 31 | 2 | 0 | 150 | 2.70×0.20×2.36 | 2 |
| storefront | 9,460 | 20 | 12 | 0 | 204 | 4.85×0.85×3.17 | 1 |
| washing_machine | 2,002 | 9 | 8 | 0 | 69 | 0.71×0.86×1.13 | 1 |
| refrigerator | 2,356 | 15 | 6 | 0 | 78 | 0.76×0.83×2.04 | 1 |
| bodega_shelf | 9,120 | 56 | 14 | 0 | 258 | 1.22×0.56×1.86 | 0 |
| **pack total** | **82,462** | 219 | — | **0** | **1,795** | — | 5 |

**Whole showcase scene** (13 roots incl. the baseline hydrant, shadows on):
**701 draw calls / 247,702 rendered triangles / 232 geometries / 4 textures.** The draw-call
count is the honest weak point: sand3d emits one mesh per named part (219 meshes for 12
assets), and three.js draws each mesh per material. The game's own `mergeGltfParts` seam (one
mesh per material) exists for exactly this and would cut it roughly to the material count
(~80); the showcase deliberately did **not** merge, so the raw numbers are visible.

## 2. The measured performance facts

* **Triangles are a non-issue.** 247k tris for the whole evaluation scene is well inside the
  game's budget class (the shipped block world renders similar magnitudes). Heaviest single
  asset is the wire basket at 15.8k.
* **Draw calls are the real cost** — 219 meshes / 12 assets ≈ 18 meshes per asset average.
  Fix is known and already in-repo (`mergeGltfParts`): expect ~4–8 calls per asset after
  merging by material. For assets placed dozens of times, use instancing (below).
* **Texture memory: zero.** Flat PBR factors only (`KHR_materials_*` extensions on glass).
* **Instancing** (measured in-engine, 100 hydrants added to the scene):
  * clones (`Object3D.clone`): 360 → **762** draw calls (+402; frustum culling trims some of
    the nominal 700),
  * `THREE.InstancedMesh` per geometry (7 draw calls): 360 → **381** draw calls — **~20×
    fewer calls than clones**, at the price of losing per-instance frustum culling (reported
    triangles rise 0.45 M → 1.70 M; the GPU still only rasterizes visible pixels).
  Verdict: for repeated street furniture (the common case in Alder Heights), `InstancedMesh`
  per part-geometry is the right reuse strategy and works out of the box with sand3d output.
* **FPS: 1** — measured under **SwiftShader software rendering** in headless Chromium on 2
  CPU cores. This number says nothing about real devices; it is recorded because we promised
  not to inflate. The meaningful hardware numbers above (tris/calls/textures/MB) are
  renderer- and device-independent.

## 3. Integration checkpoints (from the assignment list)

| checkpoint | result |
|---|---|
| GLB loading via existing `GLTFLoader` patterns | ✅ plain loader; no meshopt/KTX2 needed (and none used) |
| Texture/material preservation | ✅ base/metallic/roughness/alpha + KHR transmission on glass; textures none by design |
| Orientation | ✅ fronts face glTF +Z (program convention: Blender −Y); up = +Y; no rotation fixes needed in-engine |
| Scale | ✅ metres, real-world dims verified in-engine against spec dimensions |
| Hierarchy | ✅ named parts preserved (`s3d_name` law holds — no `.001` drift on program names) |
| Pivots | ✅ joint nodes at hinge edges, verified by posed rotation |
| Articulation | ✅ `userData.s3d_joint` read in three.js; runtime pose driver ~15 lines; no AnimationClips exist (expected, see 03 §4) |
| Shadows | ✅ PCFSoft, no bias artifacts at `normalBias 0.03` |
| Lighting response | ✅ matches the game's Lambert/flat look; `NeutralToneMapping` treats the PBR factors fine |
| Frustum culling | ✅ per-mesh; visible in clone-vs-instanced triangle counts |
| Memory | 232 geometries / 4 textures for 13 roots; GLB bytes 1.8 MB total — trivial |
| Draw-call cost | ⚠️ the one real finding — 18 meshes/asset; use `mergeGltfParts` and/or instancing |
| Collision proxy compatibility | ✅ trivially: the collision system is custom AABB (`engine/collide.ts`); per-asset proxy boxes derive from the measured footprint (the seam's `0.5×–1.9×` footprint guard applies unchanged). Not wired in this experiment — placeholder-driven swap (`upgradePropWithGLB`) is the production path and was not modified |
| Reuse/instancing | ✅ measured above |

## 4. Comparison with an existing FIRST SLICE asset

The game's own production `public/models/hydrant.glb` (baseline loaded beside ours in the
showcase):

| | game baseline hydrant | sand3d hydrant |
|---|---|---|
| tris | **492** | 5,168 |
| meshes | 12 | 7 |
| materials | 2 | 4 |
| UVs / textures | UVs present / 0 images | none / none |
| height | 0.84 m (stylized, chunky) | 0.78 m (spec-realistic) |
| file | 38 KB | 134 KB |
| articulation | none | none (none required) |

Honest read: the baseline is a *cheaper, stylized* asset that fits the shipped look; the sand3d
version is *more realistic* (correct three-way nozzle layout, pentagon caps, tapered barrel) at
~10× the triangles. For FIRST SLICE's cozy-lowpoly identity, the winner is contextual: sand3d's
value here is **proportion-accurate variation on demand** (a dozen hydrant variants from one
program by changing three numbers), not replacing the shipped placeholder.

## 5. What we did NOT do (on purpose)

* No production placeholder was replaced; no `public/models/` file touched.
* No runtime code path depends on the showcase: deleting `src/showcase/`, the `main.ts` hatch,
  and `public/models-experimental/` reverts to the exact prior game (and `tsc`/`vitest` stay green).
* No collision/nav wiring — the experiment stops at "compatible", as scoped.
