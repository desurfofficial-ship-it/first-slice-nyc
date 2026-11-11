# PERFORMANCE & COMPATIBILITY — the terrace build-out (W6, register v1.41.0)

## Method

- All new geometry rides the established economy: **indexed** `GeoPush`
  vertex-color meshes + Lambert statics that the district bake fuses into
  the 28 m × 32 m tiles (the strips clamp to the edge rows — the same law
  the backdrop masses have always lived under). No new materials beyond
  the two shared white vc lamberts + the shipped `skylineWinMat`.
- The canopy stays the shipped 4-draw instanced system; the terrace trees
  joined it (no per-tree draws).
- `npm run build` first; probes boot the dist page headless
  (SwiftShader — the low-end-hardware floor by construction).

## Measured (probe-neighborhood, this wave's own instrument)

| Rig | Draw calls (probe methodology: snap + district update + one render) |
|---|---|
| PLAZA | 156 |
| LARKIN_TERRACE (−64, 46) | 104 |
| GARDEN (0, 60) | 100 |

Note the methodology: the certified B13 instrument is `probe-w0-census`
(its own settle+zone-lit measurement, PLAZA budget 150, recorded red
pre-wave at 652→662). The numbers above are this probe's own honest
read under its lighter methodology and are recorded for DELTA tracking,
not gate substitution. The wave's structural claim stands: **the fabric
fuses into tiles**, so the marginal cost is batch growth inside existing
tiles, not per-piece draws.

## Geometry budget (approx, this wave)

- Fire-escape ironwork: ~30 bays × ~380 tris ≈ 11.4k tris, merged per building.
- Terrace faces: ~2 × ~2.2k tris.
- Props (mailboxes/bikes/hydrants/stacks/horses/payphone): ~27 pieces, ≤ 350 tris each, merged per piece.
- Terrace masses + stoops + storefronts: Lambert statics, bake-fused.
- Terrace panes: ONE InstancedMesh (70 instances, 2 tris each).
- Trees: the shipped instanced canopy (12 new instances across 2 draws).

## Compatibility

- **Determinism**: two builds byte-identical (unit-pinned); two probe runs
  produce identical ledgers.
- **Zero shader changes** — every material is a shipped Lambert path; the
  dusk tween dresses the terrace panes through the existing
  `skylineWinMat.emissiveIntensity` (probe-verified 1.3).
- **Low-end floor**: SwiftShader (software GL) boots and renders the grown
  world; all probes ran on it.
- **Nav/physics**: `probe-nav 9/9`, `probe-world-sim 15/15`,
  `probe-chokepoints 5/5` on the grown walls; the nav graph's shipped
  nodes are byte-identical (no lane/bounds surgery; new door nodes only).
- **Saves**: no schema fields touched (the wave adds geometry + three
  latch-free one-day-slot interactions; `MAX_DAY` untouched).
