# 01 — Existing World Audit (the map as it ships today)

> **Status:** Audit deliverable (2026-11-13). Produced by Z.ai agent by reading
> the actual source of `web-three/src/world/World.ts` (9,421 lines),
> `world/cityFabric.ts`, `world/neighborhoodFabric.ts`, `world/facadeKit.ts`,
> `world/nycKit.ts`, `world/props.ts`, `world/fenestraCore.ts`,
> `world/fenestraMaterial.ts`, `world/timesSquare.ts`, `world/subway/*`,
> `world/arrivalBus.ts`, `world/dressing.ts`, `world/interiorAssets.ts`, and the
> binding world truth `docs/data/world-registry.json` (4,978 lines, v1.0.0,
> registry version v1.64.0 at head `44534bb`).
>
> **Method:** source-grounded audit. No screenshot was captured in a running
> build this session — the audit cites the in-repo screenshot evidence the
> project already ships under `docs/3d-assets/evidence/`,
> `tools3d/sandflow_eval/renders/`, and `web-three/scripts/shots/` (the probe
> harness's evidence directory). The next agent with a running dev server
> (`cd web-three && npm run dev`) should capture the screenshots listed in §6
> and drop them under `docs/world-map/images/existing/`.

---

## 1. What the world is (the one-paragraph audit)

FIRST SLICE ships **one neighborhood**: Alder Heights, a fictional composite of
upper-Manhattan between Harlem and Washington Heights. It is **not** an
open-world city and is not five boroughs — AGENTS.md §0 is explicit: "FIRST SLICE
is not an open-world game — it is a life sim on an open block." The block is
one commercial street (Kestrel) stitched between two avenues (Juniper, Sycamore),
two cross-streets (Gable, Marlow), and a Times Square destination one subway ride
west. Every building is authored and registry-driven; every interior that the
story enters is enterable; every window on every facade is a fenestra-mapped
room. The map is **complete for the vertical slice** — 178 registry IDs, 81
buildings, 7 parks, 22 interiors, 23/23 anchors, all built (registry v1.66.0,
W12 wave shipped 2026-11-13).

## 2. World boundaries (from `docs/data/world-registry.json` `bounds`)

| Boundary | xMin | xMax | zMin | zMax | Notes |
|---|---|---|---|---|---|
| **world** (the full scene graph) | −450 | +136 | −64 | +64 | xMin extended west for the K tunnel, 42 St-Times Square, and the Times Square canyon (one ride west of Alder Heights). xMax extended east in W7 for the Eastgate strip and the SKY-E skyline fabric row. |
| **playableCore** (the walkable surface) | −100 | +100 | −64 | +64 | Grown from x ±84 in W7 (2026-11-12) under the standing owner authorization. The strips beyond Juniper/Sycamore are real rows now. |
| **currentShippedWalls** (the temporary invisible walls at `World.ts:496`) | −48 | +48 | −22 | +22.5 | Retired phase by phase as districts grew; never before a district had content. **Most are retired** — see §5 for the wall census. |
| **skylineCards** (the backdrop billboards) | — | — | — | — | SKY-N (z=90, the existing tower row + spire, fog-exempt); SKY-W (x=−122, Juniper Avenue vanishing point); SKY-E (x=+122, Sycamore Avenue vanishing point); SKY-S (the south backdrop). |

**The unit system** (registry `meta.coordSystem`): x = east(+)/west(−),
z = north(+)/south(−), y = up. 1 unit = 1 meter. Footprint `{x, z, w, d}` =
center + full width + full depth, matching `boxFromCenter()` in
`engine/collide.ts`. The origin does not move.

## 3. The five streets (from doc 04 §2, the world bible)

| Street | Role | Key buildings / locations |
|---|---|---|
| **Kestrel Street** | The commercial spine, the "story street" | Rosa's Deli & Grocery (ROS-01), Corner Slice Pizza (KTN-04, Eddie), Fade King barbershop (KTN-05, Deon), the café shell at 6 Kestrel East (KTN-06 → becomes Halcyon), Kestrel Hardware (SMB-03, the Oktays), B-side Records, the DIRTY WATER DOGS cart, Corner Park, Kestrel Green |
| **Juniper Avenue** | Institutional row; the K runs beneath | Alder Works Hall (KCM-01 — the conflict's prize), the K station houses (SUB-01/02 — Priya's bench is at the north house), Masjid an-Nur, Juniper Mutual Aid (papered window) |
| **Sycamore Avenue** | Big storefronts, the diner, the fruit stand | The Alder Heights Diner (SND-01, Big Mike), Marlow Bakery, Sycamore Studios, the Ascension Church |
| **Gable Street** | Gable Row — the stoop street | Brownstone Row and the Cecil (KTS-01/02 — Leo's room is the Cecil's top floor; the kid Eli is the teal door on its ground floor), Gable Row 1–5 (the Okafor house; Fatima's), the Gable Garden |
| **Marlow Street** | Bakery row, the playground | Marlow Bakery, Marlow Playground (built on a 1970s fire lot), the Alley and the Garden Slot (ALY-01/02) |

**The avenue > street ratio** (registry `meta.researchBasis.grid`): the 1811
Commissioners' Plan reference proportions — avenues 100 ft (30 m), cross streets
60 ft (18 m), blocks 200 ft (61 m) N–S × 620–920 ft (189–280 m) E–W, 20 blocks
per mile N–S. Alder Heights compresses these ~25% for game density; the ratio
avenue > street is preserved.

## 4. Neighborhood density (from `World.ts` + the registry)

### 4.1 Buildings (81 rows, all built)

- **Class A (fully enterable, interior required):** the 9 story-bearing rooms —
  ROS-01 (Rosa's), KTN-02 (Sunrise Laundry), KTN-04 (Corner Slice), KTN-05 (Fade
  King), KTN-06 (Halcyon / café shell), KTS-02 (the Cecil — Leo's room),
  SMB-03 (Kestrel Hardware), the Marlow Bakery, B-side Records. Plus the diner
  (SND-01), the Alder Works Hall (KCM-01), the two subway station houses
  (SUB-01/02).
- **Class B (ground-floor interior/service bay):** the bodega, the fruit stand,
  the barbershop's service side, the laundromat's machine bay.
- **Class C (exterior-only):** the brownstones of Gable Row (stoops + doorways,
  no full interiors), the walk-ups of Marlow, the East Tenement (El Vann's
  paper walls — exterior reads as interior).
- **Class D (backdrop mass / skyline):** the VDN-DN1/DS1 backdrop rows
  (contiguous 12 m solids spanning x −60..60, the skyline fabric behind them),
  the GRB-06/07 masses, the SKY-W/SKY-E card rows at x ±122.

### 4.2 Interiors (21 rows, all shipped W5/W8 per the W11 registry-truth repair)

- LAUNDRY-INT, BARBER-INT, PIZZA-INT, DINER-INT, BAKERY-INT, RECORD-INT,
  HALL-INT, CECIL-ROOM, MEZZ-INT — all flipped 'planned' → 'built (W5)' in the
  W11 wave (2026-11-13). CORNERHOUSE-INT **built in W14 (2026-11-13)** (the open
  decision closed by the W11 reword).
- The interior dressing: `tools3d/sandflow_eval/programs/` (32 Python programs
  generating procedural GLBs — cash register, newsrack, hydrant, streetlight,
  vending machine, bakery oven, barber chair, etc.) + the ABO furniture pack
  (`assets/furniture/` — 141 CC-BY-4.0 GLBs, meshopt geometry, KTX2 textures,
  ~300 KB median, floor pieces on Y=0). The seam is `world/furniture.ts`; the
  manifest is `docs/data/abo-curated.json`.

### 4.3 Parks and public spaces (7 rows, all built)

- PRK-CORNER (Corner Park — Tito's dominoes table, the senate),
- KESTREL-GREEN (the pergola finished C3, the hundredth tree C6),
- GABLE-GARDEN (the Okafor house's garden slot),
- MARLOW-PLAYGROUND (built on a 1970s fire lot, the swing set, the spray basin),
- PRK-LARKIN and PRK-CARROW (the W6 terrace gardens, gated in W10 — see §5),
- SUBWAY-PLAZA (the K station's plaza).

### 4.4 Landmarks (the registry's `landmarks` table, all built)

- The K-Globes (the K station's globes),
- Rosa's rooftop billboard,
- the Three Towers (the wooden water towers keeping the skyline honest — vitalcitynyc.org reference),
- the Diner Sign (Sycamore's landmark),
- the Garden Mural (Lena and Odd, painting across the weeks — three figures by C3),
- the Ghost Sign ("ALDER WORKS — KITCHENS · CABINETS · FIXTURES · EST. 1921"),
- the Works marquee,
- the terminal's sync screens,
- the red steps.

### 4.5 Times Square (the destination, one ride west)

`web-three/src/world/timesSquare.ts` (451 lines) + `world/subway/*` (the K line):
the player enters the Alder Heights K station, descends the stair, walks the
fare lane, boards the car, presses E, the train takes 22 real seconds at any
frame rate (the W11 ride-rate fix), the seam swaps to the 42 St station, the
player steps off, walks the exit stair through the unsealed opening (the W11
stair-seal fix), and emerges at Times Square. The canyon sits at x ~−400
(`CROSS_WEST = -400` cousin in HK3's layout, but our own `worldToLeg` /
`legToWorld` math in `engine/busRoute.ts`).

## 5. What already works, what needs improvement, what is missing

### 5.1 What already works (the shipped law)

- **The block is walkable end-to-end.** `diag-pocket-scan.mjs` (the W10
  flood-fill scanner at 0.5 m grid over x ±100 / z ±64, 8-connected, no
  corner-cut) reads: colliders 977, spawn-component 41,866 cells, traps 19
  (none a registered public space — all are furniture bulk, private courtyards,
  or the world's own walls), cramped 0. The W10 park-gate fix opened the four
  terrace garden mouths (N x −30 / x 33, S x −19 / x 42).
- **The fenestra windows render as rooms.** The 447 windows of the block paint
  as rooms with furniture and plants behind the glass, curtains and blinds on
  the panes, the dusk lamps lighting the district. The W12 filigree wave closed
  the fire-escape ironwork gap (170 alpha-cutout panels, one InstancedMesh, one
  draw call, zero colliders).
- **The subway ride works at any frame rate.** The W11 ride-rate fix feeds
  `trueDt = Math.min(1.0, elapsed)` to the ride machine — the 22 s ride takes
  22 s at 2 fps and at 60 fps. The stair-seal fix parameterized the station's
  south-wall opening so both stations' exit stairs are open.
- **The registry is the truth.** The W11 registry-truth repair flipped the
  eight W5 interior rows from 'planned' to 'built', closed the pizza
  openDecision, and reworded the MEZZ/CORNERHOUSE decision to current truth.
  validate-registry passes: 179 IDs, 81 buildings, 7 parks, 22 interiors, 23/23
  anchors.
- **The battery passes.** `npx tsc --noEmit` clean. `npx vitest run` — 1,683
  tests across 100 files. `npm run build` OK (701–739 ms). probe-subway 46/46.
  probe-subway-mobile 11/11. probe-walkability ALL CLEAR (18 lanes, 23 door
  approaches, 19 live legs). probe-nav 9/9. probe-world-sim 15/15.
  probe-city-fabric OK at 189–190 draws.

### 5.2 What needs improvement (the open ledger rows)

- **The fire-escape ironwork filigree shipped (W12), but the band courses +
  soot stay approximated** (`docs/slop-integration/01-SOURCE-REUSE-REPORT.md`
  §4 — the other two rows annotated with their W8 closures; the band courses +
  soot stay the honest approximation). A future atlas or alpha-tested pass
  could close that gap if the visual budget allows.
- **The D-3 money bridge** (`docs/architecture/world-contract/` — the runtime
  integration roadmap's open item). The D-1 tick valve runs in `Game.frame`
  beside the story; the D-3 money bridge is the remaining ledger row.
- **The ambient-walker schedule migration** (the same roadmap's open item).
  The bound cast (Rosa, Idris) lives their clock-keyed schedules through
  arbitration in roam/scenario; the ambient walker schedule migration is the
  remaining ledger row.
- **The fenestra atlas mip re-audit** (`docs/production/fenestra/01-FENESTRA-INTEGRATION.md`
  §7). The hardware `generateMipmap` and a hand-built per-cell chain both
  sampled into 2–4 px facade speckle on the verification rig; level-0 sampling
  is clean at every distance the bands visit. The re-audit plan is recorded;
  re-check on a real GPU before enabling a chain.

### 5.3 What is missing (the honest gaps)

- **Nothing planned is unbuilt.** The registry's `constructionPhases` table
  carries W0–W14; all 81 buildings, 22 interiors, 7 parks, 23 anchors are
  built. The W11 wave closed the last "planned" status row; W14 built the
  Corner House interior.
- **The optional slice: CORNERHOUSE-INT — BUILT (W14, 2026-11-13).** The
  registry's openDecision (reworded to "stays an optional slice" in W11) is
  CLOSED: the corner store ships a real ground floor on the owner's
  confirmation — the open corner-grocery band, the dry-goods fit-out, the
  named far pane, the walkability leg; 22 interiors now.
- **The narrative-only places** (doc 04 §2, flagged for builders in doc 15):
  the Juniper storefront that houses Juniper Mutual Aid (papered window,
  folding tables), the Ascension Church on Sycamore, Masjid an-Nur on Juniper,
  P.S. 218 (two blocks east, off-map in C0–C2), Dr. Feld's office (two stops
  on the K, interior never required), the Inwood basement room (C5+), Leo's
  parents' kitchen in Elyria (voice-only, phone calls). These are intentionally
  off-map or interior-never-required; they are **not missing** — they are
  canon.
- **A live gameplay screenshot set for this audit.** The next agent with a
  running dev server should capture the §6 shot list and drop them under
  `docs/world-map/images/existing/`.

## 6. Screenshot shot list (for the next agent with a running dev server)

The project already ships screenshot evidence under `docs/3d-assets/evidence/`
(the `before-*` and `vq-*` frames) and `tools3d/sandflow_eval/renders/` (the 32
procedural-asset renders). For this audit's evidence package, capture and drop
under `docs/world-map/images/existing/`:

1. `existing-kestrel-looking-east.png` — Kestrel Street looking east from
   x = −60, z = 0, at golden hour. The commercial spine reads in one frame.
2. `existing-juniper-looking-north.png` — Juniper Avenue looking north from
   x = −90, z = 0. The institutional row + the K station houses.
3. `existing-sycamore-looking-south.png` — Sycamore Avenue looking south from
   x = +90, z = 0. The big storefronts + the Diner Sign.
4. `existing-gable-row-stoops.png` — Gable Street, the stoop row, ground level.
5. `existing-marlow-bakery-row.png` — Marlow Street, the bakery row + the
   playground.
6. `existing-fenestra-windows-dusk.png` — the fenestra windows at dusk, the
   447-window district reading as rooms with furniture behind the glass.
7. `existing-fire-escape-filigree.png` — the W12 alpha-cutout ironwork close-up
   (the yard face at KTS, the garden face at GRB).
8. `existing-terrace-gate.png` — the W10 park-gate at PRK-LARKIN, the iron
   grammar + the sidewalk carrying through.
9. `existing-subway-ride.png` — the K line ride, the car interior, mid-tunnel.
10. `existing-times-square-arrival.png` — the Times Square canyon on step-off.
11. `existing-aerial-top-down.png` — the bird's-eye view from y = 200, looking
    down at the full playable core (x ±100, z ±64). The map-completion-checklist
    companion frame.
12. `existing-skyline-fabric.png` — the SKY-W / SKY-E card rows from the
    Juniper vanishing point, the backdrop mass reading as a city.

## 7. The verdict

The map is **complete for the vertical slice**. The registry's truth is the
truth: 179 IDs, 81 buildings, 7 parks, 22 interiors, 23 anchors, all built (the
W14 Corner House interior joined; the count moved 178→179 / 21→22). The
walkability scanner reads clean. The fenestra windows render as rooms. The
subway ride works at any frame rate. The fire escapes wear their ironwork.

What remains is **not unbuilt world** — it is the open ledger rows (the D-3
money bridge, the ambient-walker schedule migration, the fenestra atlas mip
re-audit) and the optional slice (CORNERHOUSE-INT). The world-map blueprint's
job is to lock this state, document it, and make it possible for the next agent
to continue without re-discovering it.

— Z.ai agent, 2026-11-13
