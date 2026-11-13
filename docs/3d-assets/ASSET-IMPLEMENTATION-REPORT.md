# ASSET IMPLEMENTATION REPORT — the world-visual-quality wave

Issued: 2026-11-10 · Wave: `feat/world-visual-quality` → main (register v1.36.0)
Base: main @ `ebfb08a` · Docs: `FULL-GAME-ASSET-AUDIT.md` (the audit),
`ASSET-QUALITY-STANDARDS.md` (the rules this work follows)

---

## 1. What was built (and where it is integrated)

One new module + one World pass. **Every piece is static Lambert,
non-transparent, non-mapped (or atlas), added before `bakeStatics()`, and
fused into its district tile at boot. Nothing adds a collider, moves a
registry row, or touches the nav graph.** All pieces carry the `VQ_` name
prefix and record themselves in `World.vqLedger` before the bake merges the
bare meshes away — the ledger is the probe's ground truth
(`probe-world-visual-quality.mjs`, ALL CHECKS PASSED).

| # | Addition | Count | Where | File |
| --- | --- | --- | --- | --- |
| 1 | **Crown bands** (stone cornice, KTN00W crown grammar: h − 0.25, footprint + 0.2) | 17 | KTN-01..05, KTS-01/02/03, KTN-06, PWK-01..03, SMB-01..03, KCM-01, SND-01 | `src/world/facadeKit.ts` → `makeCornice`; `World.buildWorldVisualQualityPass` §1 |
| 2 | **Bricked-over windows** on every blank end/slot/backdrop wall | 51 | alley walls (KTN-04/05), garden slot walls (KTN-02/03), Cecil east gable, corner-house end walls, TEN west end, KTS-01/03 ends, Marlow slot, all 8 VDN avenue-facing walls | `makeBrickover` (per-wall tone: brickDark/bldg2Dark/bldgDark) |
| 3 | **Downspouts** with brackets + shoe | 6 | terminal SW, KTN-03 corner, KTS-01 west, Cecil SE, diner east, Corner House west | `makeDownspout` |
| 4 | **Ghost signs** (atlas faces on painted panels, cream on bldg2) | 5 | FADE KING BARBER SUPPLY, STAR BAKERY CO., MEADOWBROOK DAIRY CO., CAPITAL COFFEE & SPICE, ZIMMERMAN & SONS | `World.signBoard` faces 'x' |
| 5 | **Window sills + lintels** on every proud-window row | 104 + 104 | GRB row (30 windows), TEN pair (20), corner houses (18), Marlow walk-ups (36) | `makeSill` / `makeLintel`, formulas mirroring the owning builders |
| 6 | **Window AC units** (props.makeACUnit, shared geometry) | 26 | GRB upper floors, TEN avenue face, corner houses, walk-ups — hung under verified sills | §5 |
| 7 | **Roof clutter** (bulkhead + 2 vents + antenna, wall-toned) | 19 groups | every unreachable roof; the bodega roof keeps its billboard, the Cecil's climb keeps its top clean, the terminal keeps its canon water tower | `makeRoofClutter` |
| 8 | **Manholes** (0.95 m, PAL.manhole) | 13 | Kestrel ×5, Juniper ×2, Sycamore ×2, Gable ×2, Marlow ×2 | `makeManhole` |
| 9 | **Storm drains** at the curb line | 8 | Kestrel ×4, Juniper ×2, Sycamore ×2 | `makeStormDrain` |
| 10 | **Asphalt patches + oil stains** | 6 + 4 | the five roads | `makePatch` (WEAR.patchDark / WEAR.stain) |
| 11 | **Stop lines** before every avenue junction crosswalk | 12 | both avenues × 3 streets × 2 directions | `makeStopLine` |
| 12 | **Grass tufts** in every tree pit | 96 groups | `World.treePits` (recorded at placement — core, W1 fills, green, rows) | `makeGrassTufts` |
| 13 | **Curb leaf piles** | 10 | the five streets, gold + green mix (October law) | `makeLeafPile` |
| 14 | **Gooseneck door lamps** (warm emissive heads) | 5 | three Marlow shopfronts, the vacant café, the terminal | `makeGooseneck` |

New geometry lives in `src/world/facadeKit.ts` (pure builders, props.ts
conventions: MatBank materials, shared unit geoms, seeded variation left to the
caller). The pass method is `World.buildWorldVisualQualityPass`, called between
`dressW5Rooms()` and `bakeStatics()` — the same pre-bake law every phase obeys.

## 2. What was replaced / improved

Nothing was replaced — this is an additive pass by design (§5 of the audit).
The improvements ride existing faces:

- **Rooflines finished**: every uncapped mass now ends in a stone cornice.
  The VDN backdrop rows deliberately get none — their masses are per-segment
  heights that exceed the registry row, so a footprint band would slice
  through them (the varied silhouettes are the look).
- **Blank walls given life**: 51 sealed openings + 5 ghost signs turn the
  district's end/slot/backdrop walls from flat colour into party-wall history.
- **Windows given reveals**: 208 stone pieces make the proud-window rows read
  as openings instead of stickers.
- **Streets given wear**: manholes, drains, patches, stains and stop lines —
  the street floor now has the repair history a real block carries.

## 3. Honest repairs outside the pass (pre-existing, named)

The boot found **two stale test expectations pre-existing on pristine main**
(reproduced on `ebfb08a` clean tree before touching anything): the SUB-01
relocation commit (`ebfb08a`, "put the SUBWAY entrance on the real stair
shaft") updated the registry to x −47.2 but left two pins at the retired hand
row −42. Both re-homed to the registry truth with the reason in a comment —
assertions grew STRONGER, none weakened:

- `tests/a3-registry-flip.test.ts` `HAND_TRUIT['SUB-01'].x`: −42 → **−47.2**
- `tests/sim-runtime.test.ts` the Idris walk-target pin: −42 → **−47.2**

## 4. Files changed

- `web-three/src/world/facadeKit.ts` (new, ~200 lines)
- `web-three/src/world/World.ts` (import; `treePits` recording at the four
  pit sites; `vqLedger` field; `buildWorldVisualQualityPass()` + its call site)
- `web-three/tests/sim-runtime.test.ts`, `tests/a3-registry-flip.test.ts` (the two honest repairs)
- `web-three/scripts/probe-world-visual-audit.mjs` (new — the 22-vantage sweep)
- `web-three/scripts/probe-world-visual-quality.mjs` (new — the wave's 26-check contract)
- `docs/3d-assets/*` (the three deliverables + evidence)

## 5. Verification (executed, not claimed)

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | **1246/1246** (81 files) |
| `npx vite build` | OK (chunk-size warning pre-existing) |
| `probe-world-visual-quality` (new, 26 checks + 4 evidence shots) | **ALL CHECKS PASSED** |
| `probe-world-sim` | OK (15/15) |
| `probe-nav` | OK (9/9 — zero colliders added, graph untouched) |
| `probe-climb` | PASS — the Cecil's fire-escape climb intact under its new crown |
| `probe-integration` | 0 errors, walks true |
| `probe-money-trace` | ALL PASSED |
| `probe-polish-pass` / `probe-interior-dressing` / `probe-w5-interiors` / `probe-furniture` / `probe-furniture-shops` / `probe-verify-rebuilds` | ALL PASS (the previous wave's laws intact) |
| `probe-a5h-first-session` (the film→wardrobe pick flow) | PASS |
| `probe-c0-week` / `probe-c1-warm-line` / `probe-c2-compact` | ALL PASSED (the three playable seasons unaffected) |
| `probe-audit-followups` / `probe-a3-flip` (validate-registry) | PASS |
| Draw-call budget | 154 → **155** at spawn for ~600 new pieces (the bake fused them); new probe gate caps the boot at < 200 |
| Console | clean on every probe boot |

## 6. Remaining work (honest list)

- **Sycamore/Juniper mid-block storefront upper walls** (SRC/PWK/TEN faces
  away from the avenues) carry sills now but could take awnings and blade
  signs in a future wave.
- **Marlow/Gable crosswalk mid-block legs**: the registry plans none — fine.
- **Interior props** continue on the GLB seam (bpy venv unavailable in this
  sandbox; the trimesh CPU pipeline precedent stands).
- The three canon water towers stay at three; a future owner call could
  extend the canon (B13-style decision), not this pass.
