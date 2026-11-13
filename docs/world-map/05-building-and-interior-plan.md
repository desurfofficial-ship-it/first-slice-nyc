# 05 — Building and Interior Plan (the 81 buildings + 21 interiors)

> **Status:** Design-lock deliverable (2026-11-13). The building and interior
> plan is the registry's `buildings` + `interiors` tables, locked at registry
> v1.64.0. All 81 buildings and 21 interiors are built (the W11 registry-truth
> repair flipped the last 'planned' rows to 'built (W5)', 2026-11-13).

---

## 1. Building class system (the registry's `meta.law`)

The registry carries four classes:

| Class | Definition | Count | Interior required? |
|---|---|---|---|
| **A** | Fully enterable (interior required) — the story-bearing rooms | 9+ | Yes |
| **B** | Ground-floor interior / service bay | ~6 | Ground floor only |
| **C** | Exterior-only (stoops + doorways, no full interiors) | ~30 | No |
| **D** | Backdrop mass / skyline fabric | ~36 | No |

**Total:** 81 buildings, all built.

## 2. The Class A buildings (the story-bearing rooms, fully enterable)

| ID | Name | Street | Interior | Built in |
|---|---|---|---|---|
| ROS-01 | Rosa's Deli & Grocery | Kestrel | ROS-INT (the bodega shelves, the counter, the back room) | W5 |
| KTN-02 | Sunrise Laundry (Sal) | Kestrel | LAUNDRY-INT (the machines, the folding tables, the detergent shelf) | W5 |
| KTN-04 | Corner Slice Pizza (Eddie) | Kestrel | PIZZA-INT (the oven, the prep counter, the booth tables) | W5 |
| KTN-05 | Fade King barbershop (Deon) | Kestrel | BARBER-INT (the chair, the counter, the mirror, the waiting bench) | W5 |
| KTN-06 | Halcyon / the café shell | Kestrel | The C3 build-out (the espresso machine, the café two-tops) | W5 + C3 |
| KTS-02 | The Cecil (Leo's room) | Gable | CECIL-ROOM (Leo's top-floor room — the radiator, the bed, the kitchenette) | W5 |
| SMB-03 | Kestrel Hardware (the Oktays) | Kestrel | HARDWARE-INT (the shelves, the counter, the stock) | W5 |
| SND-01 | The Alder Heights Diner (Big Mike) | Sycamore | DINER-INT (the register, the kitchen line, the counter stools, the booth tables) | W5 |
| KCM-01 | The Alder Works Hall | Juniper | HALL-INT (the hall, the kitchenette, the storage shelf) | W5 |
| — | The Marlow Bakery | Marlow / Sycamore | BAKERY-INT (the oven, the display case, the back shelf, the bread rack) | W5 |
| — | B-side Records | Kestrel | RECORD-INT (the listening corner — the armchair, the counter cabinet, the rug, the speaker, the wall shelf, the bin) | W5 |
| SUB-01 | The K north station house | Juniper | The station house interior (Priya's bench, the fare lane) | W5 |
| SUB-02 | The K south station house | Juniper | The station house interior | W5 |

## 3. The Class B buildings (ground-floor interior / service bay)

- The bodega's service side (the back room, the stock),
- The fruit stand's crates and produce,
- The barbershop's service side,
- The laundromat's machine bay (the washing machines, the dryers, the carts),
- The diner's kitchen line,
- The bakery's back shelf.

## 4. The Class C buildings (exterior-only)

- The brownstones of Gable Row (stoops + doorways, no full interiors) — the
  high-stoop law (0.12 riser),
- The walk-ups of Marlow (the Old Law tenements on 25 ft lots),
- The East Tenement (El Vann's paper walls — the exterior reads as an interior,
  the fenestra system paints the rooms behind the glass),
- The Ginkgo Walk-up (the proud windows; the fenestra law),
- Sycamore Studios' upper floors (the market-rate newcomers),
- The café shell at 6 Kestrel East (the C3 build-out is the interior; the shell
  is the exterior).

## 5. The Class D buildings (backdrop mass / skyline fabric)

- The VDN-DN1/DS1 backdrop rows (contiguous 12 m solids spanning x −60..60,
  the skyline fabric behind them),
- The GRB-06/07 masses (the W6 terrace build-out, east of the avenues),
- The TEN-02/KTS-04 masses (the W6 terrace, east),
- The SKY-W card row (x = −122, the Juniper vanishing point),
- The SKY-E card row (x = +122, the Sycamore vanishing point),
- The SKY-N tower row (z = 90, the existing tower row + spire, fog-exempt),
- The SKY-S backdrop (the south backdrop).

## 6. The interior plan (21 interiors, all shipped)

### 6.1 The interior dressing system

- **The seam:** `web-three/src/world/furniture.ts` (the load seam — the GLB is a
  costume, never a dependency; a missing or malformed file keeps the procedural
  room, one `console.info`, no retries).
- **The dressing manifest:** `world/interiorAssets.ts` (32 sand3d programs +
  GLBs — the procedural asset pipeline in `tools3d/sandflow_eval/programs/`).
- **The plan layer:** `world/interiors/plan.ts` (the pure-data plan; the
  Blueprint3D integration blueprint in `docs/research/blueprint3d-integration-blueprint.md`
  is the next step if the interiors ever grow a floorplan-data layer).
- **The fenestra seam:** `world/fenestraCore.ts` + `world/fenestraMaterial.ts`
  (the windows render as rooms — the interior-mapping technique adapted from
  codedgar/three-fenestra, MIT).
- **The ABO furniture pack:** 141 CC-BY-4.0 GLBs in `assets/furniture/`
  (meshopt geometry, KTX2 textures, ~300 KB median, floor pieces on Y=0). The
  manifest is `docs/data/abo-curated.json` — per model: id / name /
  product_type / bucket / repo_path / triangles / size_metres / score.
  Byte-identical copies in `web-three/public/models/furniture/`, pinned by test.

### 6.2 The 21 interiors

| ID | Interior | Dressing | Built in |
|---|---|---|---|
| LAUNDRY-INT | Sunrise Laundry | washing machines, dryers, folding tables, detergent shelf, laundry cart, linen bin, waiting bench | W5 |
| BARBER-INT | Fade King | barber chair, counter unit, mirror, waiting bench, shop mirror | W5 |
| PIZZA-INT | Corner Slice | pizza oven, prep counter, booth tables, menu board, cash register | W5 |
| DINER-INT | Alder Heights Diner | diner register, kitchen line, counter stools, booth tables, coffee machine | W5 |
| BAKERY-INT | Marlow Bakery | bakery oven, display case, back shelf, bread rack, coffee machine | W5 |
| RECORD-INT | B-side Records | listening chair (armchair), counter cabinet, rug, record speaker, wall shelf, record bin | W5 |
| HALL-INT | Alder Works Hall | hall kitchenette, storage shelf, folding chairs stack | W5 |
| CECIL-ROOM | Leo's room (the Cecil top floor) | apartment door, sink, toilet, radiator, kitchenette, bed, dresser, side table, table lamp, floor lamp, bookcase, sofa, coffee table, dining table, dining chair, ottoman, sideboard, counter stool, corner rug, mirror | W5 |
| MEZZ-INT | The mezzanine | the mezzanine dressing | W5 |
| ROS-INT | Rosa's Deli & Grocery | bodega shelves, counter, back room, refrigerator, drink cooler, cash register, newsrack, produce crate, recycling bin, security gate | W5 |
| HARDWARE-INT | Kestrel Hardware | shelves, counter, stock | W5 |
| FRUIT-INT | The fruit stand | produce crates, drink cooler | W8 |
| NEWS-INT | The news rack | newsrack | W8 |
| HYDRANT-* | (prop, not interior) | — | — |
| STREETLIGHT-* | (prop, not interior) | — | — |
| ... | (the W8 strip-row interiors — the bodega, the fruit stand, the news rack, the storefront GLBs) | storefront GLB + the strip-row dressing | W8 |
| CORNERHOUSE-INT | (optional slice) | — | optional (registry openDecision reworded in W11) |

## 7. The building generation strategy (what the references taught)

The 81 buildings are **authored and registry-driven** — no agent invents
positions (registry `meta.law`). The generation strategy is:

1. **The registry is the truth.** `docs/data/world-registry.json` carries every
   building's id, footprint `{x, z, w, d}`, height, class, and status. The
   registry is append-only — IDs are permanent; new entries append; never
   renumber.
2. **The build order is the registry's `constructionPhases` table** (W0–W12).
   Each phase has a ledger row in `docs/47-construction-log.md` (the legacy
   doc) and the worklog.
3. **The typology vocabulary** (from the Metropolis study, `09-engineering-reference-study.md`
   §3.3) maps onto the Alder Heights classes: brownstone (house / rowhouse),
   walk-up (rowhouse / midrise), tenement (rowhouse), commercial-tenant
   (midrise / retail), civic-hall (civic). **The vocabulary is for backdrop
   fill, not for named buildings.** Named buildings (Rosa's, the Cecil, the
   Works Hall) are individually authored.
4. **The facade composition** is `world/facadeKit.ts` (sills, lintels, cornices,
   downspouts, roof clutter, brickover, gooseneck, wear) + `world/nycKit.ts`
   (the slop-newyork port — HVAC, awnings, fire-escape stacks, steam vents,
   subway stairs + globe posts, mailboxes, scaffold sheds) + the fenestra seam
   (the windows render as rooms).
5. **The skyline fabric** (Class D) is `world/cityFabric.ts` (488 lines) — the
   backdrop mass + the skyline fabric rows + the SKY-W/SKY-E/SKY-N/SKY-S card
   rows. The Metropolis typology vocabulary applies here if the skyline fabric
   ever grows a seeded rowhouse/midrise/tower mix behind the named buildings.

## 8. The interior construction law (what the references taught)

1. **The Blueprint3D data shape** (from the study, `09-engineering-reference-study.md`
   §3.5 and docs/57 §3.8): corner/wall graph with self-healing merges, rooms
   derived from topology, six-way item placement taxonomy, openings as holes
   cut in wall shapes. The shipped cousin is `world/interiors/plan.ts` + the
   hand builders in `World.ts` (`wallRun`/`roomBox`).
2. **The placement math** (from the Blueprint3D study): wall-glue via drag-proxy
   planes, sticky wall-snap with release threshold, corner-item docking. Pure
   math, no physics, vitest-able. The shipped cousin is the
   `world/furniture.ts` seam's placement.
3. **The fenestra law** (from the three-fenestra study, docs/57 §3.8): the
   windows render as rooms — the interior-mapping march paints one atlas cell
   per window, with per-window hashed onset thresholds (never synchronized,
   deterministic). The 447 windows of the block ship this law.
4. **The ABO furniture pack** (141 CC-BY-4.0 GLBs) is the interior dressing
   seam. The GLB is a costume, never a dependency; colliders are authored in
   the builder, never imported.

— Z.ai agent, 2026-11-13
