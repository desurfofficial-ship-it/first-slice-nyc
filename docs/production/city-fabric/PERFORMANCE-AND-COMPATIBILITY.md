# PERFORMANCE AND COMPATIBILITY REPORT — the city-fabric pass

Wave: v1.40.0 · all gates executed on the integrated tree, this sandbox,
sequential, against a fresh `npm run build` (`dist/`, 654 ms).

## 1. Draw-call accounting (the honest before/after)

Measured with `probe-w0-census.mjs` (real `renderer.info.render.calls`, last
frame, three fixed street rigs), fabric stashed vs fabric live:

| Rig | pre-fabric | post-fabric | Δ | note |
|---|---|---|---|---|
| PLAZA | 652 | 662 | **+10** | skyline pair (2) + sign-atlas batch growth (4 blades) + tile-batch growth |
| CART_CORNER | 299 | 303 | **+4** | |
| SYCAMORE_GABLE | 97 | 102 | **+5** | |

The first implementation cost **+75** draws: `GeoPush` emitted non-indexed
geometry and the district bake only fuses indexed geometry
(`World.bakeStatics`'s own law) — every roof item and meter survived the bake
as its own draw, plus its shadow-pass draw. Re-emitting indexed (4 verts +
6 indices per quad) folded the entire in-tile fabric into the district
batches: the in-tile pass now costs ~zero draws, exactly like the W1–W3
statics. The remaining +10 is the always-visible skyline pair (2 draws, fog-
exempt, frustum-culled by three.js) and the blades' growth of the shared
sign-atlas batch.

**The pre-existing gate state, recorded honestly:** the census gate
(Kestrel ≤ 150, intersection ≤ 250) was **already failing on main before this
wave** (652 > 150) — the fleet's recent waves (W5 interiors, the C-waves'
zone content) pushed the absolute count past the Doc 07 budget, and the gate
had quietly dropped out of the battery. This wave does not fix that debt (it
is B13-adjacent, the owner's call, and the dominant costs are
`SUB_Root` 191 / `TSS_Group` 105 / `Pedestrians` 84 / the W5 interiors — not
street statics), but the wave's own delta is +10, and the gate failure is now
visible in the register instead of silent.

## 2. Geometry budget

- `SkylineFabric`: one merged indexed mesh, 20,874 verts, ~9.6 k tris,
  fog-exempt, `cast/receive = false` (beyond the shadow camera's reach — no
  shadow-pass cost), outside every district tile (NAMED_SKIP).
- `SkylineFabricWindows`: one InstancedMesh, 142 panes, shared material —
  zero additional material compiles.
- In-tile fabric (34 roof items + 10 meters + 6 baskets): fused into the
  district tiles they live in; vertex additions ~3.1 k per affected tile.
- No new dependencies; no new textures; no new materials beyond the two
  shared vc materials that already existed.

## 3. Compatibility results (all green on the integrated tree)

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `vitest run` | **1384/1384 (86 files)** — includes the new `city-fabric.test.ts` (7 pins) |
| `npm run build` | OK (654 ms) |
| `probe-city-fabric.mjs` (new) | OK — census (skyline pair visible + fog-exempt + NAMED_SKIP-held, 142 panes sharing `skylineWinMat`, ledger: 34 roof items / 10 meters / 6 baskets / 4 blades), 6 evidence shots, dusk warmth 1.3 on the fabric's panes |
| `probe-world-sim.mjs` | **15/15** (91.2 s) |
| `probe-a3-flip.mjs city-fabric` | complete — the census pre/post pair byte-identical (determinism holds with the fabric in every band) |
| `probe-nav.mjs` | **9/9** (60.1 s) — the graph is untouched (no registry rows, no colliders added) |
| `scripts/design/validate-registry.mjs` | OK — 129 IDs; SUB-01's validator pin re-homed to the shipped −47.2 truth (was red on main before this wave) |

## 4. Gameplay-compatibility notes

- **Player collision**: zero colliders added; the playable walls, the step
  law, and every interactable anchor are untouched.
- **Pedestrian navigation**: the nav graph derives from the registry — the
  registry is unchanged, so the graph is byte-identical (pinned). Meters and
  baskets sit at z ±7.62 / x ±60.6, off the walking lanes (z ±6.5 spines) and
  ≥ 3.4 m clear of every registry door.
- **Traffic / bus**: no collider or lane change; the M121's bay and stops are
  untouched.
- **Day/night**: the fabric's lit panes share `skylineWinMat`, so dusk warms
  them with the towers (probe-verified: emissiveIntensity 1.3 at dusk); the
  in-tile fabric is non-emissive and rides the district bake's dusk exactly
  like the shipped statics.
- **Determinism**: two builds produce byte-identical placement ledgers (unit-
  pinned); `Math.random` appears nowhere in the module.
- **Loading/popping**: the skyline pair is visible from boot (never district-
  gated); the in-tile fabric fuses at construction, before the first frame.
