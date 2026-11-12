# Doc 57 — Engineering References: study before building

> **Deliverable of the 2026-11-05 directive.** FIRST SLICE has two permanent
> engineering references. Before any agent builds or significantly upgrades a
> system one of them already has, they inspect the reference's actual source
> first — then build the version FIRST SLICE needs. This doc records what was
> learned so the next agent doesn't re-study the same ground.

> **2026-11-06, the reboot note.** The legacy docs tree (docs/01–56) was
> cleared for the narrative reboot — [docs/narrative/](docs/narrative/) is
> the story canon now. Doc numbers cited below (docs/44, docs/45, docs/51,
> docs/architecture/*, …) are pre-reboot pointers: read them as history; the
> files live in git. This ledger stays the engineering memory and the home
> of the study-before-build findings (AGENTS.md §1e).

---

## 0. The law (the directive, kept short)

1. Identify the equivalent system in a reference repo.
2. Inspect its **source**, not its README.
3. Understand the architecture, dependencies, interfaces, algorithms.
4. Decide: reuse conceptually, adapt, improve, or build independently.
5. Implement inside FIRST SLICE's existing architecture — TypeScript,
   Three.js, Vite, the registry, the Laws. **Never** adopt a reference's
   WebGPU/TSL renderer as an engine swap (docs/architecture/03 §4 non-goal).
6. Test; verify the shipped game did not regress.
7. Record findings **here**, under the system's heading.

**Proportional study.** Study only the system the task touches. A pedestrian
upgrade reads pedestrian code, not the whole repo. If a reference has no
equivalent, say so plainly (§4) and build independently.

**Never copy blind.** Compatibility, dependencies, licensing, mobile budget
(§1c.6) are checked before any code or data is adopted. Stolen-with-credit is
house style; stolen-silently is not (AGENTS.md §5.6).

## 1. The two references

| | **Gen City Auto** | **Slop New York** |
|---|---|---|
| Repo | https://github.com/greggman/gen-city-auto | https://github.com/mrdoob/slop-newyork/ |
| Author / license | greggman · **MIT** (package.json `license: MIT`) | mrdoob · **MIT** (LICENSE, 2026) |
| Stack | TypeScript, zero-lib WebGPU renderer, WGSL, workers | three.js + WebGPURenderer + TSL (renderer **not** for us) |
| What it is best at | **Runtime simulation**: streaming, procedural generation, peds, traffic (IDM), vehicles, spatial queries, workers, GPU perf | **Real New York**: genuine geography from open data, the Manhattan grid, buildings/landmarks on real lots, one map drawn from the same data as the city |
| Local clone | `/home/z/my-project/refs/gen-city-auto` (shallow) | `/home/z/my-project/refs/slop-newyork` (shallow) |

> **A third reference studied 2026-11-12 (interiors directive): Blueprint3D** —
> https://github.com/furnishup/blueprint3d (original, MIT © 2015, last commit 2016-07-10) and
> https://github.com/charmlinn/blueprint3d-modern (2026 TS/r181 rewrite, MIT, unlicensed CDN demo
> assets). It is a **system-scoped** reference (floorplan data models, interiors, placement,
> serialization), not a whole-world one, so it keeps its own ledger:
> [docs/research/](docs/research/) — five dated audit docs (original audit, modern audit,
> applications, integration blueprint, performance & risk). The §3 summary below (3.8) is the
> short form; the research docs are the full form. Local clones:
> `/home/z/my-project/repos/blueprint3d` and `/home/z/my-project/repos/blueprint3d-modern`.

## 2. Where the systems live (the no-re-study map)

Studied areas carry a ✅ with findings below; the rest is a file index so the
next agent starts at the right door.

| System | Gen City Auto | Slop New York | FIRST SLICE owner |
|---|---|---|---|
| World management / streaming | ✅ `src/world/city.ts` (+ `src/world/nearest.ts`) | — | `world/World.ts` district ring (docs/45 W0) |
| City generation | ✅ `src/city/layout.ts`, `src/city/gen-tile.ts` (11k lines), `src/city/graph.ts` | ✅ `js/city-grid.js`, `js/boroughs.js` | `docs/data/world-registry.json` (authored, docs/44) |
| Map / atlas | `src/ui/minimap.ts` | ✅ `js/nyc-map.js` | `ui/sketch.ts` + `core/content.ts` MAP_PLACES |
| Pedestrians | ✅ `src/game/pedestrians.ts` | ✅ `js/pedestrian-system.js`, `js/pedestrian-routes.js` | `world/peds.ts` (band law, docs/51 B17; shift schedule, docs/57 §3.5) |
| Traffic | ✅ `src/game/traffic.ts` (IDM car-following), `src/game/roadnet.ts` | ✅ `js/traffic.js`, `js/road-network.js` | `engine/traffic.ts`, `engine/busRoute.ts` |
| Vehicles | `src/nurbs/`, `src/vehicles/`, `src/game/trains.ts` | `js/vehicle-physics.js`, `js/cars.js`, `js/bus.js` | `world/arrivalBus.ts`, `world/subway/trainKit.ts` |
| Scene culling / perf | `src/render/shadow-cull.ts`, `src/city/lod.ts` | `js/scene-culling.js` | district ring + bake (`World.ts`), `probe-scene-census.mjs` |
| Workers | `src/workers/city-worker.ts` | — | none (nothing needs one yet) |
| Building geometry from open data | — | `js/buildings.js`, `building-geodata.bin.gz`, `js/landmarks.js` | `world/props.ts` builders (authored lowpoly) |
| Interiors / floorplan data / placement | — | — | hand builders (`World.ts` wallRun/roomBox) + ✅ Blueprint3D study (`docs/research/`, §3.8) |

## 3. Findings so far (2026-11-05 — studied for M2/M3 context, recorded for everyone)

### 3.1 Gen City Auto — tile streaming (`src/world/city.ts`, 745 lines)

The whole metropolis is tiles: workers generate geometry off-thread; the main
thread keeps **a shell resident for every tile** (LOD1 near, LOD2 far) and
streams LOD0 detail nearest the camera. The discipline worth copying:

- **Residency hysteresis.** A tile asks for the shell it is about to need
  `SHELL_PREFETCH = 100` (m) before the LOD switch and frees the old one
  `SHELL_KEEP = 150` past it — a moving camera always has the next shell
  ready; nothing thrashes at the boundary.
- **`nearestFirst`** (`src/world/nearest.ts`, 56 lines): pending work is
  ordered by distance to the camera, every frame. Simple, testable, hot-path
  clean.
- **Backoff on a full pool**: an upload that finds the pool full is not
  retried until a timestamp (`retry0`) — no spin.
- **Loading is a first-class UI** (`LoadListener.step/preview/tiles`): the
  loading screen is fed by the same events that build the world.

**FIRST SLICE mapping:** our district ring (World.ts, docs/45 W0) already does
the authored-world cousin — everything is built at boot, tagged
`c<col>r<row>`, and lit by a RING around the player's district; zero visible
pop. Doc 03 §4 rules out km² streaming, so we adopt the *patterns*, not the
machinery: if FIRST SLICE ever adds lazily-built content, it gets a
prefetch/keep band, nearest-first ordering, and a retry timestamp — in that
order.

### 3.2 Gen City Auto — procedural generation (`src/city/`, read at map level)

`layout.ts` (3.3k lines) separates **street graph** from **parcel fill**;
`gen-tile.ts` (11k lines) turns a seed + tile id into geometry. Not directly
usable — our block is authored and registry-driven (docs/44: "agents build
from world-registry.json, they do not invent positions") — but it *validates*
our registry's shape: streets/blocks as a graph, buildings as parcels keyed
off it. If the registry ever grows a fifth street, the graph→parcel order is
the build order.

### 3.3 Slop New York — one geography, every view (`js/nyc-map.js`, 47k)

The header says it: *"Minimap and full-screen map drawn from the same
geography and building footprints as the 3D city."* One data set, three
renderings (radar, atlas, world). The habits worth stealing:

- **The world frame is documented in the file**: `1 unit = 1 m, x = grid
  east, z = grid south; both maps face grid north, ~29° east of true north`.
  Our cousin: `SKETCH_BOUNDS` is the sketch's frame — now documented in
  `sketch.ts`'s header the same way.
- **One shared palette object** for radar + atlas, kept in step with the CSS.
  Ours: the sketch's stroke classes come from one stylesheet — same law.
- **Label tiers** (`AREA_LABELS`: borough / waterway / neighbourhood at real
  coordinates). Ours: docs/39's naming canon — if the Map ever grows district
  labels, they land as tiers, not one flat list.

### 3.4 Slop New York — the grid and the data (`js/city-grid.js`, `boroughs.js`)

Real Manhattan grid + coastline + borough polygons from NYC Open Data and
©OpenStreetMap. **The data is reference-only for us** — doc 45 §5's verdict
stands: ODbL share-alike on derivative *databases* is exactly the weight this
project doesn't want. Drawing inspiration from the real grammar (which the
GDD already did) is not database use. License ledger:

| Resource | License | Verdict |
|---|---|---|
| Gen City Auto code | MIT | usable with notice in the bundle; adapt approaches, check hot-path law (§1c.3) per file |
| Slop New York code | MIT | same; its TSL/WebGPU pipeline stays out (non-goal) |
| SNY's NYC Open Data / OSM geodata | NYC terms / ODbL | **reference-only** — never ingest; never ship a derivative database |

### 3.5 Gen City Auto + Slop New York — ambient density (studied for M4, 2026-11-05)

The question: how do the references key pedestrian/traffic density to time
of day? **They don't.** Read in source:

- **Gen City Auto** (`src/game/pedestrians.ts`, 147 lines; `src/game/traffic.ts`,
  850 lines): density is **spatial, not temporal**. Pedestrians keep a fixed
  `target = 420` and a per-frame spawn budget (12 attempts) around the
  camera; a pure `density(x,z) = max(0.15, exp(−d²/700²) per hub)` DISCARDS
  spawns probabilistically, so crowds pool near hubs. Traffic keeps
  `target = 240` in a 360 m ring with weighted kind pools (car 6, taxi 3,
  van 1.4, truck 1.0, bus 0.7) and a spawn min-distance that shrinks while
  the street is under-filled (30 m below half target, else 120 m). No clock
  anywhere; the `time` param in `update()` is animation, not scheduling.
- **Slop New York** (`js/lighting.js` TIME_PRESETS, `js/pedestrian-system.js`):
  the named day presets (Midday 0.24 → Golden Hour 0.48 → Dusk 1.25 →
  Night 1.55) drive fog, sky and **headlight fades only**; the pedestrian
  system is a spatial spawn ring (150 m, view protection, player proximity)
  with no temporal keying.

**FIRST SLICE mapping (M4):** the schedule is our own design — the honest
shape of this game's clock is the day's two street phases (`dressing.ts
STREET_PLAN`), because the block runs on your clock and a minute grid would
invent pressure the No-FOMO law forbids. What was borrowed is the SHAPE of
the ideas, not the machinery: GCA's pure density read (our table is pure
data, pinned by tests) and SNY's named presets (our two named phases).
GCA's hot-path discipline — fixed targets, per-frame spawn budgets, no
per-frame garbage — matches §1c.3 and was checked per file. `engine/`
`traffic.ts` and `engine/busRoute.ts` needed no change for M4 (the math is
stateless; the M121's night park shipped with W4 p2) — the roadmap's touch
list was a plan, and the deviation is recorded in the roadmap.

### 3.6 Scene culling & perf (studied for B13, 2026-11-06)

The question: how do the references keep a whole city inside a draw-call
budget? Read in source: Slop New York `js/scene-culling.js` (362 lines),
Gen City Auto `src/render/shadow-cull.ts` (35) + `src/city/lod.ts` (256).

- **Slop New York** runs *one setup pass after the city is built*, then a
  per-frame list walk. (1) Every island-wide `InstancedMesh` of small props
  (bounding spheres ~7 km across — three.js can never frustum-cull them) is
  split into spatial chunks (`chunkInstancedMesh`, 250–600 m cells, same
  geometry + material so the pipeline is shared); each chunk gets a
  **distance cull by apparent size** — `instanceSize × 1100 px` (the
  90th-percentile instance width vs a 1300 px viewport), clamped
  `CULL_MIN 300` (the shadow cascades reach that far at street level) to
  `CULL_MAX 2000`; per frame that is one squared-distance write of
  `visible` per chunk, zero allocations. (2) Big static casters are
  replaced in the shadow pass by **position-only stand-ins**: black
  `MeshBasicNodeMaterial`, position attribute only, cut into 500 m cells on
  a `SHADOW_PROXY_LAYER` only the shadow cameras render; originals stop
  casting; a material qualifies only if nothing displaces or cuts its
  vertices. (3) Everything else large is split into 1000 m cells for plain
  frustum culling.
- **Gen City Auto** culls the shadow pass by **receiver planes**
  (`receiverPlanes`): a caster is drawn only if it sits inside the camera
  frustum slice between view near/far *swept toward the light* — planes
  pointing away from the light are dropped, keeping the test conservative,
  each plane pushed out by a margin. So off-screen geometry never pays the
  shadow pass even when the light's own frustum contains it. And
  `lod.ts` classifies every triangle of the far city by material class and
  **narrowest width** (`2·area / longest edge`): a 5 cm rail is sub-pixel at
  1.5 km however long it is — wires die at 700 m, lane paint 900–1400 m,
  kerbs 1200 m; leaf cards and bark vanish entirely in LOD2 and each tree
  crown becomes one 24-triangle opaque blob. Lit signs and lamp fittings
  are explicitly kept at any distance (night readability).

**FIRST SLICE mapping (B13):** our world is a 170 m authored block, not a
7 km island — the regime these tools solve (island-wide instance batches
nothing can cull, 2-cascade shadows, 1.5 km views) does not exist here.
What we already have independently: the district-tile static bake IS the
SNY chunk pattern at the visibility grain the game needs (28×32 m tiles,
and the 2026-10-30 playtest measured that going bigger trades rasterized
triangles for draw calls at a net loss on software GL); the figure
shadow-proxy IS the stand-in idea for people (one shadow draw per person
instead of six); the sun box is a single cascade already tightened to the
street (35) and to the underground economy (18, measured 166 → 130). What
does NOT translate, with reasons: SNY's apparent-size distance culling has
nothing to bite on at our ranges (nothing is far enough to be sub-pixel —
and the 1-Second Law sells the far row's lit windows); GCA's
receiver-plane shadow cull needs to hook the renderer's shadow-cull loop,
which three.js does not expose (per-frame `castShadow` toggling of
hundreds of meshes would be the §1c.3 sin it exists to prevent, and
golden-hour shadows legally stretch casters behind the camera into view);
GCA's per-triangle LOD presumes generated far-city geometry we do not have
— ours is authored and finite. The B13 ledger row (docs/51) prices the
remaining composition per class with this study attached; the references'
answer to our plaza-rig regime is their WebGPU instancing/cascade pipeline,
which docs/architecture/03 §4 rules out as an engine swap.

### 3.8 Blueprint3D — interiors as data (studied 2026-11-12, for the interiors/floorplan directive)

Studied both repos' actual source (original: 33 files / 5,716 LOC, three r69 + jQuery, frozen
2016; modern: 44 files / 9,529 LOC, three r181, MIT code + unlicensed CDN demo assets). Full
findings in `docs/research/blueprint3d-{original,modern}-audit.md`; applications, the phased
integration blueprint, and the risk assessment in the sibling docs. The short form:

- **Worth adapting — the data shape.** Corner/wall graph with self-healing merges and T-splits
  (`model/corner.ts` `mergeWithIntersected`), rooms **derived** from topology via half-edge rings
  (`Floorplan.findRooms` + `Room.updateWalls`) and never serialized, a six-way item placement
  taxonomy (floor/wall/in-wall/… variants, `items/factory.ts`), openings as rectangular holes cut
  in wall `Shape`s driven by the descriptor (`three/edge.ts`), and a corner-dict save format that
  re-hydrates IDs by reference. All MIT, all portable as *patterns*.
- **Worth adapting — the placement math.** Wall-glue via drag-proxy planes + `boundMove` clamping,
  the modern repo's sticky wall-snap with release threshold and half-depth gating
  (`FloorItem.moveToPosition`), `CornerItem` corner docking. Pure math, no physics, vitest-able.
- **Not portable.** The code itself (r69/jQuery/ES5 or `animejs`-coupled src), the 2D editing
  floorplanner (the player is not the architect), their loaders/lighting/controls (ours are
  better), their serialization as-is (no version field — a non-starter under our save law),
  their demo assets (unlicensed), and their implementation habits: rebuild-everything-on-edit,
  zero `dispose()`, per-placement network fetches, ~9 dead event buses, item-item collision
  commented out in BOTH repos.
- **FIRST SLICE mapping:** a `src/world/interiors/` plan layer (pure data + build-time derivation
  + placement math), registry-owned plans, Effect-mediated gameplay — the five-phase plan with
  sizes, test requirements, and a complete files-touched map lives in
  `docs/research/blueprint3d-integration-blueprint.md`; the risk/pricing in
  `docs/research/blueprint3d-performance-and-risk-assessment.md`. Research wave only —
  no implementation in this pass, per the directive.

## 4. What neither reference has (build independently, say so)

- **A story spine.** Four days, beats, the objective line — neither repo has
  anything like it; their worlds are purpose-free by design.
- **The No-FOMO law.** No reference system is pressure-aware; our roam
  contract (freeroam.ts) has no cousin.
- **The block remembers.** Regulars, memory lines, the diary drain — FIRST
  SLICE's M3 is our own design. Their peds walk; ours know you.
- **A paper companion.** The Map is handwriting with a save schema; SNY's
  atlas is a survey instrument. Different jobs.
- **Save-schema migration discipline.** Optional-trailing v1-safe fields,
  byte-identical old parses — no reference carries a save forward like ours.
- **The player identity round (2026-11-06, checked before building).** The
  wardrobe (3D fitting room), the pick-is-for-keeps lock law, ladder-climb
  feel and interior furniture dressing are player/UI/interior systems —
  neither reference covers them (GCA drives a vehicle rig with no on-foot
  character or pick flow; SNY is geography and view optimization, no
  interiors, no furniture). Stated per §0 and built independently: the
  wardrobe ports the First-slice-player update's React modal into the
  vanilla UI law; the climb cadence reads the rig's own measured velocity;
  the furniture wears the already-attributed ABO pack (docs/57's own seam).
- **The shops interior pass (2026-11-06, same system, same check).** Every
  building interior — not only the player home — now wears its own
  corresponding ABO furniture: waiting chairs + a framed print in the
  laundromat, the waiting bench + two mirrors in the barbershop, drop-leaf
  tables in the pizza and diner booths, cafe two-tops in the bakery, and
  the listening corner (armchair, counter cabinet, rug) in the record
  store. Still a player/interior system — no reference coverage (SNY has
  no interiors at all; GCA's city lots are shells) — built on docs/57's
  own seam, 23 → 40 slots, all nine new ASINs already credited in the
  pack's ATTRIBUTION.md. The pass's headless probe also caught two real
  regressions: the player-merge cherry-pick had silently dropped the
  Game's `configureGltfDecoders` call (every furniture swap was dead —
  the unit gates never boot a renderer), and updateInteriors' hysteresis
  was inverted (enter 1.6 / exit 0.8 flickered the 0.8–1.6 m sidewalk
  annulus every frame; exit now holds to 2.4).

### 3.7 Gen City Auto — navigation & spatial services (studied for Phase 3 A-1/A-2, 2026-11-06)

Full source study of the systems A-1 needs (repo @ `f049f54`). Headline:
**gen-city-auto has no pathfinding at all** — no A*, no Dijkstra, no route
storage (verified by exhaustive grep). Cars pick greedy seeded exits at each
junction (`src/game/traffic.ts` `LaneFollower.pickExit`); pedestrians
ping-pong along one road chain (`src/game/pedestrians.ts`) and never cross a
street; buildings have no doors or interiors. It is NOT a
pedestrian-navigation reference. What IS worth taking:

- **The planar-graph toolkit** (`src/city/graph.ts`, 581 lines, MIT): plain
  object nodes/edges, adjacency-by-index, `dead` flags + `compact()`,
  stable-index-under-mutation discipline (`stableOrder` keeps street-furniture
  hashes invariant across edits). Our nav graph keeps the shape (id-keyed
  nodes, adjacency lists, validation) but adds what they never needed:
  per-edge cost/kind/surface and stable string ids.
- **The query-layer pattern** (`src/game/roadnet.ts`): all spatial indices
  built ONCE in the constructor — a flat uniform grid of `Map<number,
  number[]>` buckets keyed by packed integer cell coords (32 m cells),
  expanding-ring nearest queries with early exit, no quadtrees anywhere.
  Pattern adopted for `sim/nav/spatial.ts`; the key packing is resized for
  our ±84 m neighborhood (theirs assumes 6 km² — `+1000…4096` offsets
  would collide at our scale).
- **The arc-length follower + Bézier portal transition** (`traffic.ts`
  232–540): entities parameterized by distance-along (`LaneRef` + scalar
  `s`), region-to-region transitions as cubic Béziers sampled into
  arc-length tables with curvature-derived speed caps, overshoot carried
  across seams, heading rate-limited (5 rad/s). Template for
  sidewalk→crosswalk→sidewalk movement — adapted into `sim/nav/follower.ts`
  as a polyline + rate-limited-heading follower (an authored, finite
  neighborhood does not need per-crossing Bézier sampling; memoizing it
  would be allocation churn at zero visual gain for two bodies).
- **Determinism toolkit** (`src/math/random.ts`): sfc32 `Rng`, standalone
  integer hashes, per-consumer seeds, position-hashed seeding
  (`hash2(round(x·10), round(z·10)) ^ seed`) — same discipline as our
  `sim/rng.ts`; nothing to import, everything to imitate.
- **Allocation discipline**: preallocated typed-array scratch + quickselect
  top-N (`src/world/nearest.ts`, 57 lines), lazy per-chain caches
  (`Map<id, Float64Array>`), buffer detach on release.
- **Traps flagged**: frame-loop `dt` integration everywhere (our sim is
  fixed-tick; their motion code must never set our timing); world-size
  constants baked into grid keys; per-crossing allocations in `planTurn`;
  ~70% of the repo is WebGPU/WGSL/workers, irrelevant to us. License:
  `package.json` declares MIT but **no LICENSE file exists** — patterns and
  small adaptations are fine; carry an attribution note if any code is ever
  lifted verbatim (none was: the graph, A*, access and follower are our own).

Verdict for A-1's design: graph + A* + access are OURS (the reference has
none); grid-index construction, one-time index building, arc-length
following, and the determinism/allocation discipline are adapted. No new
dependencies (they have zero runtime deps; we add none).

## 5. Working rule for every agent

Before you build, check §2's table. If your system has a ✅, read the finding;
if it needs more depth, open the listed files in the local clone. When done,
append what you learned under §3 (dated, sourced, short). The clone lives at
`/home/z/my-project/refs/` — re-clone if a session lost it:

```bash
git clone --depth 1 https://github.com/greggman/gen-city-auto /home/z/my-project/refs/gen-city-auto
git clone --depth 1 https://github.com/mrdoob/slop-newyork      /home/z/my-project/refs/slop-newyork
# the interiors reference (system-scoped — see docs/research/):
git clone https://github.com/furnishup/blueprint3d        /home/z/my-project/repos/blueprint3d
git clone https://github.com/charmlinn/blueprint3d-modern /home/z/my-project/repos/blueprint3d-modern
```

### 3.7.1 WP-3v addendum — what the ambient commute took from the reference (2026-11-06)

Re-read with the WP-3v design in hand; nothing new was adopted beyond the
patterns already credited above. What the living pedestrian runtime uses:

- **Deterministic per-agent generation** (the reference's seeded-junction
  discipline, `traffic.ts` `pickExit`): each walker's destination stream is
  its own `seededRng(seed + i·7919)` — stable per-agent seeds, no global
  randomness, re-derived identically per boot. (MIT, © the gen-city-auto
  authors — pattern attribution per this file's header.)
- **Allocation discipline** (their stable-index/`compact()` habit): the pin
  pass and the commute step allocate nothing per frame; the only per-route
  allocation is the swapped Yuka `Path` (rare, budgeted 2/frame).
- **Parameterize-by-position, not waypoint-teleport** (their car spacing):
  walkers keep Yuka's continuous steering on graph-derived polylines — the
  graph provides the geometry, Yuka provides the motion. **The reference's
  decorative pedestrian ping-pong remains explicitly NOT a navigation
  solution** — destination movement here is our Phase 3 A* over the one
  registry-seeded graph, under the STREET gate (door edges never
  traversable) and the gap law (no mid-block road bridges).
