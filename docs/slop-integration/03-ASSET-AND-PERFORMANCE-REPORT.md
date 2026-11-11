# SI — asset, performance and compatibility report

**Wave:** SI-1 (2026-11-11) · Companion to
[`01-SOURCE-REUSE-REPORT.md`](01-SOURCE-REUSE-REPORT.md).

## 1. New and upgraded building assets

### New buildings (the Mallow Row — registry rows LMS-01 / IND-01 / GLS-01)

The Marlow row's open east stretch (x 22..50, between PWK-03's flank and
SRC-01's flank — the one place the block could grow) gained three buildings,
flush party walls, filling the typology gaps the mission named:

| Row | Name | Footprint | Height | Typology | Style grammar |
|---|---|---|---|---|---|
| `LMS-01` | The Mallow Court | 12 × 12 m (x 22..34) | 20 m, 7 floors | **Pre-war limestone apartment court** | stone base + ashlar upper (the shipped tan), tall parlor openings, four upper rows at the 2.9 m pitch, band-course cornices S+N, crown cornice, high six-riser stoop with plum door, ported 3-part water tank, chimneys, roof bulkhead |
| `IND-01` | The Mallow Works | 6 × 12 m (x 34..40) | 12 m, 3 floors | **Industrial / warehouse loft** | brick shell, crown cornice, steppable freight dock (0.3 m ≤ the walker's 0.35 step), freight + side doors with stone lintels, small industrials on walk and yard faces, rooftop chiller + bulkhead |
| `GLS-01` | The Glass Infill | 10 × 12 m (x 40..50) | 16 m, 6 floors | **Modern glass infill over ground-floor business** | stone base, ink curtain body with proud mullion/slab grid (the ported curtain-wall read in bakeable geometry), ink parapet cap, MERIDIAN GALLERY storefront with plum canvas, yard construction shed, twin rooftop chillers + bulkhead |

The row reads from Marlow as one street wall with SRC-01 —
`web-three/shots/nyc-integration/si-mallow-row.png`,
`si-mallow-court.png`, `si-roofline-marlow.png`.

### Upgraded existing buildings (the ported roofline systems)

All changes are seeded (`seededRng(20261111)`) — deterministic across builds:

- **Water tanks (ported 3-part trestle construction)** on 5 roofs that the
  canon set doesn't carry: KTS-03, TEN-01, SRC-01, KTN-02, LMS-01. The five
  canon tanks (terminal, brownstone row, Fade King, corner houses) are
  untouched — pinned by test.
- **Rooftop chillers** on 6 of 10 eligible flat roofs (the source's 35%
  seeded rule) + the glass infill's roof line: KTN-03/04, KTS-02, SMB-02,
  PWK-01, KCM-01, KTN-07 (seeded picks), IND-01, GLS-01 ×2, LMS-01.
- **Chimney stacks** (13 total) on the pre-war roofs: GRB-01..05, TEN-01,
  PWK-02/03, LMS-01, KTN-03 — seated clear of tanks/chillers by the ported
  roof-spot occupancy rule.
- **Roof bulkheads** on the 3 new roofs (`makeRoofClutter`, the shipped
  builder).
- **Band-course cornices** on LMS-01 (S+N), KTN-02, KTS-03, KTN-05 (the
  ported projecting band, hung 0.33 under the roofline).
- **Multi-landing fire escapes** (the ported escape template) on 5
  yard/flank faces: KTS-03 S (5 decks), LMS-01 N (6 decks + gooseneck),
  IND-01 N (3 decks), SRC-01 E (5 decks), PWK-02 N (4 decks). Silhouette
  deco only — the Cecil's climbable escape stays the only gameplay one.
- **Ground floor:** the Mallow Court lobby canvas awning; the gallery
  storefront (shipped `makeStorefront` grammar).

## 2. New street details

| Asset | Source grammar | Placement | Interactivity |
|---|---|---|---|
| **USPS relay box** | slop street-details mailbox | Kestrel N at the bodega corner (−12.3, 7.55), wall-side | collider (0.65 × 1.3 × 0.6), off the walk lane; solid, interactable-by-proximity like the shipped newsboxes |
| **ConEd steam vent + sawhorses** | slop steam stacks | against the laundry wall (−2.0, 7.55) | collider; the world's own seeded steam system supplies the vapor |
| **'KESTREL ST' DOT blade** | slop signal blades | bolted to the shipped signal mast (−1.45, −7.55) | deco on an existing pole |
| **'JUNIPER AV' blade + full signal mast** | slop cantilever-mast grammar | the Juniper × Kestrel corner (−65.3, −7.55) — the intersection reads as one now | pole collider, arm/lamps deco |
| **Subway globe pair** | slop entrance globes | flanking the SUB-01 headhouse (±x of the stair slot) | two post colliders off the walk lane |
| **Ported subway stair (full kit)** | slop `createSubwayEntranceParts` | Times Square surface plaza, south of the SUB-TS slot (−332, 3.2) | railing-line collider; zone-owned with the TS group |
| **Yard construction shed** | slop scaffold-shed slab | the GLS-01 yard (45.5, −18.4), per the registry's exterior line | overhead deco — no collider; the deck joins the camera's canopy-sphere sidestep set |

## 3. Performance

Measured on the probe rig (Playwright Chromium, SwiftShader software GL —
the worst-case renderer):

| Metric | Before (baseline `9ee4bf7`) | After (SI-1) | Budget |
|---|---|---|---|
| Boot draw calls | 157 (VQ probe baseline) | **158** | < 200 (the VQ gate) |
| Boot triangles | ~281 k | **284 k** | — |
| Statics added by the pass | — | ~350 pieces | all PRE-BAKE → fused into district tiles |
| Draw-call cost of the pass | — | **+1 call** | the lobby-awning + gallery emissive glass keys |
| Colliders added | — | 8 (mailbox, vent, 2 globes, Juniper mast, freight dock, TS stair; stoop/window shells ride the masses) | all off the walked lanes |
| Nav graph | 1 component, byte-stable | **1 component, byte-stable** | sim-nav pins unchanged |
| Frame boot time | — | unchanged at probe tolerance | — |

The pass adds no per-frame work: everything is static, pre-bake, and merged
into the district tiles by `bakeStatics()` — the ported systems were chosen
partly because their geometry-first form (vs the source's instanced pools
and TSL shaders) survives that pipeline.

## 4. Compatibility results

| System | Result | Evidence |
|---|---|---|
| TypeScript | clean | `npx tsc --noEmit` — 0 errors |
| Unit suite | **1395/1395** (86 files) — was 1377/1377; +18 = the SI guards | `npx vitest run` |
| Production build | OK (611 ms) | `npm run build` |
| 4-day E2E | **0 failures** (the full playthrough, console clean) | `node scripts/e2e.mjs` |
| World-sim probe | **15/15** (1,426 sim-min) | `scripts/probe-world-sim.mjs` |
| VQ probe | **OK** — every shipped pin survives (crowns 17, sills 104, ghosts 5, budget < 200) | `scripts/probe-world-visual-quality.mjs` |
| SI probe | **OK** — 30 checks, all SI rows pinned by name + position | `scripts/probe-nyc-integration.mjs` |
| Player movement / collision | masses are `solid()` AABBs on registry shells; the dock is steppable (0.3 m ≤ the 0.35 step law); furniture off the lanes | probe lane-clearance check |
| Pedestrian navigation | footprints block nav where they stand (correctly), lanes stay clear, graph stays 1 component, byte-identical | `tests/nyc-integration.test.ts`, `tests/ped-commute.test.ts` |
| Vehicles / traffic | no new geometry enters the Kestrel rail or bus legs (parked-car rects untouched) | `tests/traffic.test.ts` |
| Camera | the shed deck registered as a canopy sphere → the shipped sidestep/fade law handles it like tree crowns | `dressStorefrontRow` |
| World loading/unloading | zone-owned TS stair rides `TSS_Group` visibility; district tiles own the rest | probe |
| Determinism | one pass seed; the same city every boot | seeded `20261111`, byte-identical nav pin |

## 5. Known trade-offs (deliberate, documented)

- The three new buildings are **class C exterior shells** (no interiors):
  their registry rows carry no `entrance[]` this wave — the shipped
  spine-sample destination set stays byte-identical (an ambient-commute
  guard caught the roster shift a door set would cause; doors arrive with
  interiors per the W5 pattern).
- The ported water tanks stand at silhouette LOD: no stave texture — the
  hoop bands and stave tone carry the read at street distance, per the
  "no textures on buildings" house law.
- The skyline landmark silhouettes are **squared prisms**, not the source's
  full landmark models — they are backdrop art on the fog band, and the
  card's silhouette scale is the design.

## 6. Evidence shots

`web-three/shots/nyc-integration/` — `si-mallow-row.png` (the street wall),
`si-mallow-court.png` (stoop + awning), `si-roofline-marlow.png` (tanks,
grid, cornice bands, shed), `si-kestrel-life.png` (mailbox row),
`si-avenue-signal.png` (the JUNIPER AV mast), `si-skyline.png` (the
landmark band), `si-subway-stair-ts.png` (the ported stair on the TS
surface).
