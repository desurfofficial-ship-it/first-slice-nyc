# 09 — Engineering Reference Study: the five mandated repositories

> **Status:** Reference-study deliverable (2026-11-13). Produced by Z.ai agent for
> the world-map design lock directive. This document is the consolidated five-repo
> study the directive names. It **complements** the project's standing engineering
> ledger [docs/57-engineering-references.md](../57-engineering-references.md)
> (which already covers gen-city-auto, slop-newyork, Blueprint3D and three-fenestra
> in depth) and the [docs/research/](../research/) Blueprint3D audit wave. The two
> repos the directive adds that docs/57 does **not** yet cover — Metropolis and
> HongKongThreejs — get their first full source-grounded study here (§3.3, §3.4).
> Nothing in this document re-litigates a study already settled in docs/57; it
> points to the existing finding and adds the cross-reference the world-map
> package needs.
>
> **Method:** every repo was cloned shallow into `/home/z/my-project/refs/` and
> read at the source level — file trees, package metadata, READMEs, and the
> specific implementation files cited per repo. License files were opened and
> recorded. No repo was scored from its GitHub page alone.
>
> **The canon this study serves:** FIRST SLICE is a cozy lowpoly NYC life-sim on
> **one open block** (Alder Heights) — not an open-world city (AGENTS.md §0).
> The five references inform how that block is built and dressed, not how to
> grow it into a borough. Every "adapt" verdict below is checked against that
> scope law.

---

## 1. The five references at a glance

| # | Repo | License | Stack | Best at | Local clone |
|---|---|---|---|---|---|
| 1 | [greggman/gen-city-auto](https://github.com/greggman/gen-city-auto) | MIT (package.json; **no LICENSE file** — attribution note required if any code is lifted verbatim; none was) | TypeScript, zero-lib WebGPU/WGSL, workers | Runtime simulation: streaming, procedural gen, peds, IDM traffic, spatial queries, GPU perf | `/home/z/my-project/refs/gen-city-auto` |
| 2 | [mrdoob/slop-newyork](https://github.com/mrdoob/slop-newyork/) | MIT (LICENSE, 2026) | three.js + WebGPURenderer + TSL (renderer **not** for us) | Real NYC geography from open data, the Manhattan grid, real lots/landmarks, one map drawn from the same data as the 3D city | `/home/z/my-project/refs/slop-newyork` |
| 3 | [rebollo507/Metropolis](https://github.com/rebollo507/Metropolis) | **ISC** (`citysim/package.json` `license: ISC`; no top-level LICENSE file — ISC is MIT-equivalent for our purposes; carry attribution if code is lifted) | Three.js r185 + Vite 8, plain ES modules, no engine | **Procedural building generation**: typology → seeded spec → triangle-soup; modular facades, roofs, fire escapes, lit-window occupancy | `/home/z/my-project/refs/Metropolis` |
| 4 | [imsarah/HongKongThreejs](https://github.com/imsarah/HongKongThreejs) | MIT (LICENSE, © 2026 Prasenjit / StarKnightt; built on [Ocean Drive](https://github.com/StarKnightt/ocean-drive) MIT) | Three.js r186 + Vite, single dependency: `three` | **Walkable street-level world**: first-person walker + third-person runner + drivable cars; dense HK frontage; shader-drawn windows; LOD-registered chunked cull | `/home/z/my-project/refs/HongKongThreejs` |
| 5 | [furnishup/blueprint3d](https://github.com/furnishup/blueprint3d) | MIT (© 2015, last commit 2016-07-10; the [charmlinn/blueprint3d-modern](https://github.com/charmlinn/blueprint3d-modern) 2026 TS/r181 rewrite is also MIT, **but its CDN demo assets are unlicensed**) | three r69 + jQuery (original); three r181 + TS (modern rewrite) | **Floorplan data shape**: corner/wall graph with self-healing merges, rooms **derived** from topology, six-way item placement taxonomy, openings as holes cut in wall shapes | `/home/z/my-project/refs/blueprint3d` |

### 1.1 How this maps onto docs/57

docs/57 is the project's permanent engineering-reference ledger and the home of
the "study-before-build" findings (AGENTS.md §1e). Its coverage as of 2026-11-13:

- **§3.1, 3.2, 3.5, 3.6, 3.7** — gen-city-auto: tile streaming, procedural gen,
  ambient density, scene culling, navigation/spatial services, WP-3v addendum.
- **§3.3, 3.4, 3.5, 3.6** — slop-newyork: the map/atlas, the grid and the open
  data, ambient density, scene culling.
- **§3.8** — Blueprint3D: the full interiors-as-data study, with the five
  sibling research docs in `docs/research/`.
- **§3.8 (three-fenestra)** — the interior-mapping windows study, the technique
  the shipped `web-three/src/world/fenestraCore.ts` + `fenestraMaterial.ts` adapt.

**The two new studies this document adds** (because the directive names them and
docs/57 does not yet cover them):

- **§3.3 below — Metropolis** (procedural building generation, modular facades).
- **§3.4 below — HongKongThreejs** (walkable street-level world, shader-drawn
  windows, LOD-registered chunked cull, first-person walker).

The five-repo mandate is therefore satisfied by: docs/57 (3 repos) + this
document's §3.3 and §3.4 (2 repos). The license and reuse verdicts for all five
are consolidated in §4 below so a building agent has one table to check.

---

## 2. Where each reference's systems live (the no-re-study map)

| System | gen-city-auto | slop-newyork | Metropolis | HongKongThreejs | Blueprint3D | FIRST SLICE owner |
|---|---|---|---|---|---|---|
| World management / streaming | ✅ docs/57 §3.1 | — | — | — | — | `world/World.ts` district ring |
| City generation | ✅ docs/57 §3.2 | ✅ docs/57 §3.4 | ✅ §3.3 below | — | — | `docs/data/world-registry.json` (authored) |
| Map / atlas | `src/ui/minimap.ts` | ✅ docs/57 §3.3 | — | `src/ui/minimap.js` | — | `ui/sketch.ts` + `core/content.ts` MAP_PLACES |
| Pedestrians | ✅ docs/57 §3.5 | ✅ docs/57 §3.5 | — | ✅ §3.4 below (crowd.js, people.js) | — | `world/peds.ts` |
| Traffic | ✅ docs/57 §3.5 | ✅ docs/57 §3.5 | `src/traffic/` | ✅ §3.4 below (traffic-sim.js, traffic.js, car.js) | — | `engine/traffic.ts`, `engine/busRoute.ts` |
| Vehicles | `src/nurbs/`, `src/vehicles/` | `js/vehicle-physics.js`, `js/cars.js`, `js/bus.js` | — | ✅ §3.4 below (vehicles/, cars-glb.js) | — | `world/arrivalBus.ts`, `world/subway/trainKit.ts` |
| Scene culling / perf | ✅ docs/57 §3.6 | ✅ docs/57 §3.6 | `src/buildings/Chunks.js` | ✅ §3.4 below (`src/renderer/batched-cull.js`, `src/world/lod.js`) | — | district ring + bake (`World.ts`) |
| Building geometry | — | `js/buildings.js` (open data) | ✅ §3.3 below (the headline) | ✅ §3.4 below (`hk-buildings.js`) | — | `world/props.ts` + `world/facadeKit.ts` + `world/nycKit.ts` (authored lowpoly) |
| Facade composition | — | — | ✅ §3.3 below (`Facade.js`, `Generate.js`) | ✅ §3.4 below (shader-drawn windows) | — | `world/facadeKit.ts` + `world/fenestraCore.ts` |
| Roofs | — | — | ✅ §3.3 below (`Roofs.js`) | — | — | `world/facadeKit.ts` roof clutter + `world/cityFabric.ts` skyline fabric |
| Interiors / floorplan | — | — | — | `src/textures/shop-interiors.js` (atlas) | ✅ docs/57 §3.8 + `docs/research/` | `world/interiors/plan.ts` + hand builders + the fenestra seam |
| Walkable player rig | — | — | — | ✅ §3.4 below (`src/player/walker.js`, `avatar.js`, `fasttravel.js`) | — | `player/Player.ts` |
| Day cycle / lighting | — | `js/lighting.js` TIME_PRESETS | `src/environment/`, `src/effects/` | `src/sky.js` | — | `render/daycycle.ts`, `render/envsky.ts` |

A ✅ means the system was studied in source. The dash means the reference does
not own that system (so there is nothing to study there) — that is the honest
answer, not a gap.

---

## 3. Findings — what each reference teaches FIRST SLICE

### 3.1 gen-city-auto — runtime simulation discipline

**Already studied in docs/57 §3.1, 3.2, 3.5, 3.6, 3.7 and §3.7.1.** The short
form for the world-map package:

- **Tile streaming with residency hysteresis** (`src/world/city.ts`, 745 lines,
  MIT): a moving camera always has the next LOD shell ready; prefetch 100 m
  ahead, keep 150 m past the switch. FIRST SLICE's authored block does not
  stream (everything is built at boot), but the *pattern* is the design law for
  any future lazily-built content.
- **`nearestFirst`** (`src/world/nearest.ts`, 56 lines): pending work ordered by
  distance to the camera every frame. Hot-path clean, testable.
- **Procedural generation separates street graph from parcel fill**
  (`src/city/layout.ts`, 3.3k lines; `src/city/gen-tile.ts`, 11k lines). Our
  block is authored and registry-driven, so the machinery is not portable — but
  it *validates* the registry's shape: streets/blocks as a graph, buildings as
  parcels keyed off it.
- **Ambient density is spatial, not temporal** (`src/game/pedestrians.ts`,
  `src/game/traffic.ts`): density is `max(0.15, exp(−d²/700²) per hub)` — crowds
  pool near hubs, no clock anywhere. FIRST SLICE's schedule is its own design
  (the day's two street phases), but the pure density read and the per-frame
  spawn budget discipline are borrowed.
- **Scene cull by receiver planes** (`src/render/shadow-cull.ts`, 35 lines) and
  per-triangle LOD by narrowest width (`src/city/lod.ts`, 256 lines). At our
  170 m authored block, the regime these tools solve (7 km island, 1.5 km views)
  does not exist; the *ideas* (shadow proxy per person, apparent-size cull) are
  already in our world independently.
- **Navigation: NO pathfinding at all** (verified by exhaustive grep, docs/57
  §3.7). Cars pick greedy seeded exits; peds ping-pong one road chain. The
  planar-graph toolkit (`src/city/graph.ts`, 581 lines) and the query-layer
  pattern (`src/game/roadnet.ts`) ARE worth taking — and were taken for
  `sim/nav/spatial.ts` and `sim/nav/graph.ts`.

**What we adapt:** the patterns (hysteresis, nearest-first, seeded determinism,
the graph→parcel order). **What we do not adopt:** the WebGPU/WGSL renderer, the
workers, the streaming machinery, the frame-loop dt integration (our sim is
fixed-tick). **What we built independently:** A* pathfinding, the schedule, the
registry itself.

**Influence on the world-map blueprint:** the blueprint preserves the
registry-driven authored block; it does not propose streaming. If the map ever
grows a fifth street, the graph→parcel order documented in docs/57 §3.2 is the
build order.

### 3.2 slop-newyork — real NYC geography as reference (not data)

**Already studied in docs/57 §3.3, 3.4, 3.5, 3.6 and the `docs/slop-integration/`
report wave.** The short form:

- **One geography, every view** (`js/nyc-map.js`, 47k lines): minimap, atlas and
  3D city all draw from one data set. The habit worth stealing: the world frame
  is documented in the file (`1 unit = 1 m, x = grid east, z = grid south`),
  one shared palette object, label tiers (borough / waterway / neighbourhood).
  Our cousin: `SKETCH_BOUNDS` is documented in `sketch.ts`'s header the same
  way.
- **Real Manhattan grid + coastline + boroughs from NYC Open Data and OSM.**
  **The data is reference-only for us** — docs/45 §5's verdict stands: ODbL
  share-alike on derivative databases is exactly the weight this project does
  not want. Drawing inspiration from the real grammar (which the GDD already
  did) is not database use.
- **The NYC architectural details that DID port** (`web-three/src/world/nycKit.ts`):
  HVAC units, cornice bands, awnings, fire-escape stacks, steam vents, subway
  stairs + globe posts, mailboxes, scaffold sheds. Provenance:
  `docs/slop-integration/01-SOURCE-REUSE-REPORT.md`; licensing:
  `THIRD-PARTY-NOTICES.md` at the repo root.
- **Scene cull** (`js/scene-culling.js`, 362 lines): chunked InstancedMesh
  (250–600 m cells) with apparent-size distance cull; shadow-proxy stand-ins for
  big static casters. Our regime (28×32 m tiles, single-cascade sun box) does
  not need the apparent-size math — nothing is far enough to be sub-pixel, and
  the 1-Second Law sells the far row's lit windows.

**What we adapt:** the architectural detail kit (already ported), the documented
world frame, the label-tier concept. **What we do not adopt:** the TSL/WebGPU
renderer, the OSM/NYC-Open-Data geodata, the island-wide instance chunking.

**Influence on the world-map blueprint:** the blueprint's neighbourhood identity
(Kestrel commercial spine, Juniper institutional row, Sycamore big storefronts,
Gable stoop street, Marlow bakery row) is the real-NYC grammar the bible (doc 04)
already wrote — slop-newyork is the visual confirmation that grammar reads as
"New York" in one second.

### 3.3 Metropolis — procedural building generation (NEW STUDY)

**Repo:** https://github.com/rebollo507/Metropolis · **License:** ISC
(`citysim/package.json`; ISC is MIT-equivalent — carry attribution if any code
is lifted verbatim; none was). **Stack:** Three.js r185 + Vite 8, plain ES
modules, **no engine**. Every texture, mesh, heightfield and sound is generated
procedurally in code — no binary art assets in the repo, nothing downloaded at
runtime. The README reports ~1,300 draw calls per frame at city scale.

**Files studied (in `citysim/src/buildings/`):**

| File | Lines | What it owns |
|---|---|---|
| `Generate.js` | 1,108 | Typology → parameter set → geometry. `spec(kind, lot, rng)` turns a lot + seeded rng into a full parameter set; nothing here picks from a library of prefab shapes. |
| `Facade.js` | 872 | The facade primitives: `makeFrames`, `Wall`, `punchedFacade`, `curtainWall`, `band`, `fireEscape`, `paneLit`. |
| `Textures.js` | 689 | Procedural texture synthesis (brick, stucco, concrete, etc.) — all canvas/data driven. |
| `Lots.js` | 425 | Lot subdivision and frontage assignment. |
| `BuildingMaterials.js` | 380 | Material classes (TILE_M, OCC, GLS), `interiorCell`, `roomCell`, `CELL_CLEAR`. |
| `Roofs.js` | 388 | `flatRoof`, `gableRoof`, `hipRoof`, `dormer`, `chimney`, `roofClutter`, `mast`, `crownPlant`. |
| `Builder.js` | 281 | The triangle-soup builder — growable typed-array buffers, no per-triangle allocation. |
| `Chunks.js` | 323 | Per-block merging for culling. |
| `Facade.js` `paneLit` | — | The lit-window occupancy model (see below). |

**The technique worth adapting — typology → seeded spec → geometry:**

`Generate.js` `spec(kind, lot, rng)` is the discipline to study. `kind` is one
of `house | rowhouse | midrise | tower | warehouse | civic | retail`. The
function turns the kind + the lot's `{ w, d, urban }` + a seeded rng into a full
parameter object: `levels`, `floorH`, `groundH`, `wallSlot` (brickRed / brickBuff
/ brickDark / stucco), `wallTint` (a multiplicative tint with warm bias), `roof`
(type / h / slot / color / axis / over), `bayW`, `winFrac`, `sillH`, `winTop`,
`reveal`, `occ` (occupancy class), `trimColor`, `cillSlot`, `clutter`,
`visible[4]` (which facades face the street), and a `seed` for downstream
determinism. Nothing picks from a library of five prefab shapes — every mass,
floor count, bay rhythm, material, colour and piece of roof plant comes out of
the seeded parameters.

The lit-window model (`litPlan`, lines 68–77) is the second technique worth
taking: one phase per storey plus a vacancy rate, so whole floors go dark
together and no two buildings on a street share a pattern. `Facade.paneLit`
mixes this with the pane's own die; `BuildingMaterials` turns phase into light.
This is the cousin of our fenestra system's per-window hashed onset thresholds
(docs/57 §3.8 three-fenestra) — Metropolis does it per-storey, we do it
per-window. Both are deterministic; both avoid the synchronized-block look.

**The discipline worth adapting — the Builder (`Builder.js`, 281 lines):**

A tiny growable triangle-soup builder. Buildings generate in local space (x =
along the street frontage, z = depth, y = up, origin at footprint centre on the
ground floor) and transform once when appended into a merged per-block chunk.
Nothing allocates per triangle: `Buf` is a `Float32Array` that grows by doubling;
`p1/p2/p3/p4` push; `view()` returns a subarray. The builder carries the current
vertex colour, window attributes (phase, occupancy class, warmth, special), glass
attributes (reflectance, roughness), and a per-quad normal tilt. This is the
§1c.3 (hot-path stays cold) discipline, in a form a building generator can use.

**What we will adapt (for the world-map blueprint):**

1. **The typology vocabulary** — `house | rowhouse | midrise | tower | warehouse |
   civic | retail` maps cleanly onto the Alder Heights building classes
   (brownstone / walk-up / tenement / commercial-tenant / civic-hall). The
   registry already carries Class A/B/C/D; Metropolis's typology is the
   procedural vocabulary for filling a Class-D backdrop row without inventing a
   new massing language each time.
2. **The seeded-spec discipline** — if the map ever grows a backdrop strip that
   is not individually authored (the SKY-W / SKY-E skyline fabric rows, or a
   future Eastgate extension), the spec → build order is the design law:
   `spec(kind, lot, rng)` first, geometry second, merge third.
3. **The per-storey lit-window model** — as a reference check against our own
   fenestra per-window onset thresholds. The two are not in conflict; the
   comparison keeps our own law honest.
4. **The Builder pattern** — the growable typed-array soup with no per-triangle
   allocation is the §1c.3 discipline our own `props.ts` and `facadeKit.ts`
   already follow independently; the comparison is a confirmation, not a port.

**What we will NOT adopt:**

- **Their typology set as a replacement for the registry.** The registry is
  authored and story-bearing (Rosa's is Rosa's; the Cecil is the Cecil). The
  typology is a vocabulary for backdrop, not a generator for the named buildings.
- **Their code.** `Generate.js` is 1,108 lines of parameterized generation that
  assumes a different block structure, a different material pipeline, and a
  different cull regime. Porting it would be a §1c.8 (small coherent PRs) sin.
- **Their texture synthesis.** `Textures.js` is 689 lines of canvas-driven
  procedural textures. Our textures are authored lowpoly + the fenestra atlases;
  the regimes are not compatible.
- **Their renderer.** Metropolis uses Three.js r185 with a clustered forward
  pass (the README reports 607 lights at night). Our renderer is MeshLambert +
  the bake + the fenestra seam; the lighting regimes are different.

**Influence on the final map:** the SKY-W and SKY-E skyline fabric rows
(x ±122 card rows, the Juniper/Sycamore vanishing points) are the place
Metropolis's typology vocabulary applies — a seeded rowhouse/midrise/tower mix
behind the named buildings, deterministic, registry-keyed, lit by the fenestra
per-window law. The named buildings stay authored.

### 3.4 HongKongThreejs — walkable street-level world (NEW STUDY)

**Repo:** https://github.com/imsarah/HongKongThreejs · **License:** MIT (LICENSE,
© 2026 Prasenjit / StarKnightt). **Built on** [Ocean Drive](https://github.com/StarKnightt/ocean-drive)
by StarKnightt (MIT) — the Miami Beach first-person walk that HK3 overwrote: the
engine underneath (renderer + post, sky + shadow, walker, vehicle + traffic,
Blender cars, Mixamo crowd, synthesized audio) was kept; the scene on top is new.
**Stack:** Three.js r186 + Vite, single runtime dependency: `three`. Total source
~24,800 lines across `src/`.

**Files studied:**

| File | Lines | What it owns |
|---|---|---|
| `src/world/street.js` | 1,332 | The street: cambered asphalt with worn paint, concrete curbs and gutter pans, pale slab sidewalks with paver sections, ADA ramps at the crosswalk, storm drains, manholes, street furniture (merged, vertex-coloured). |
| `src/world/hk-buildings.js` | 886 | Causeway Bay frontage: tong lau walk-ups with balconies and burglar grilles, slim residential towers with bay windows, older ribbon-window commercial blocks, glass office towers. Ground-floor shops under concrete canopies, lit fascia signs, vertical neon signs. |
| `src/world/people.js` | 1,384 | Mixamo people + animations, LOD'd (the `_512` variants), placed into the crowd system. |
| `src/world/crowd.js` | 1,065 | The crowd: both sidewalks, walk cycles, spacing, collision avoidance. |
| `src/world/cars-glb.js` | 1,544 | Blender-built GLB cars, right-hand-drive adaptation, the fleet. |
| `src/world/traffic-sim.js` | 391 | Traffic simulation (the spawn / lane / overtake law). |
| `src/world/traffic.js` | 274 | Per-car update (the IDM cousin). |
| `src/world/car.js` | 743 | The drivable car rig (cockpit, camera, controls). |
| `src/player/walker.js` | 333 | First-person walker (the on-foot rig). |
| `src/player/avatar.js` | — | Third-person avatar + run. |
| `src/player/fasttravel.js` | 341 | Fast-travel (the "skip the walk" seam). |
| `src/renderer/batched-cull.js` | — | The chunked cull (the cousin of our district ring). |
| `src/world/lod.js` | — | The LOD register (`registerLod`) — small parts register, the chunk owns the draw. |
| `src/textures/shop-interiors.js` | — | The shop-interior atlas (the cousin of our fenestra atlases). |
| `src/sky.js` | 601 | The sky + haze + day treatment. |

**The technique worth adapting — shader-drawn windows (`hk-buildings.js` lines 7–9):**

> "The windows are drawn in the facade shader (within each face, per style), so a
> 100 m tower costs a box. Everything is merged per block (chunk) for culling;
> the small parts register with `lod.js`."

This is the same law our fenestra system follows (docs/57 §3.8 three-fenestra):
a window is a shader effect on a plane, not a mesh. HK3 does it per-style in GLSL
(within the facade shader); we do it via `MeshLambertMaterial` + `onBeforeCompile`
+ the interior-mapping march. The law is the same; the implementations differ
because the rendering regimes differ (HK3 is PBR + cluster lights; ours is
Lambert + bake). The cross-check: a 100 m tower costing a box is the budget
discipline our own skyline fabric rows already follow.

**The technique worth adapting — the LOD register (`src/world/lod.js`):**

Small parts (balconies, AC units, neon signs, water tanks) call `registerLod`
with their mesh + a distance threshold; the chunk owns the draw call and the
register owns the toggle. This is the cousin of our district-ring + bake, but at
the per-prop grain. Our 170 m block does not need per-prop LOD (everything is in
the bake), but the *pattern* — a single register that owns visibility, no
per-frame `castShadow` toggling — is the §1c.3 discipline our own `shadowLaw.ts`
already follows independently.

**The technique worth adapting — the street layer (`src/world/street.js`):**

The street is one merged, vertex-coloured mesh: cambered asphalt with worn paint,
concrete curbs and gutter pans, pale slab sidewalks with paver sections, ADA
ramps at the crosswalk, storm drains, manholes, street furniture. The
`segments(a, b, excl)` helper (line 34) computes `[a, b]` minus sorted exclusion
intervals — the math that lets the sidewalk carry through a cross-street opening
without the curb stone. Our own `groundTex.ts` + `World.ts` ground builders are
the cousin; the comparison is the discipline check, not a port.

**The technique worth adapting — the walker (`src/player/walker.js`, 333 lines):**

First-person walker with on-foot movement, collision, and the camera law. Our
`player/Player.ts` is the cousin (third-person + first-person hybrid, the
wardrobe seam, the climb cadence). HK3's walker is simpler (no wardrobe, no
climb, no story steps); the comparison keeps our own rig honest about what is
gameplay-load-bearing vs what is locomotion.

**The technique worth adapting — the shop-interior atlas
(`src/textures/shop-interiors.js`):**

A pre-baked atlas of shop interior renders (one cell per shop type), sampled in
the facade shader behind the glazing. This is the cousin of our fenestra
atlases (`fenestraCore.ts` + `fenestraMaterial.ts`) and our own
`shop-interiors` is the system that dressed the W5 rooms. HK3's atlas is a
flat texture; ours is an interior-mapping march — but the atlas-as-budget law
is the same.

**What we will adapt:**

1. **The shader-drawn-window discipline** as a confirmation of our own fenestra
   law (already shipped). No code port.
2. **The LOD register pattern** as a confirmation of our own `shadowLaw.ts` +
   district-ring discipline. No code port.
3. **The street-layer "one merged mesh" discipline** as a confirmation of our
   own ground builders. No code port.
4. **The walkable-first framing** — HK3 is the reference that proves a dense
   urban frontage reads as walkable at 60 fps on a laptop GPU. The framing
   (first-person + third-person + drivable) is the cousin of our own
   `player/Player.ts` + `engine/traffic.ts` + `world/arrivalBus.ts`. The
   comparison keeps our own rig honest.

**What we will NOT adopt:**

- **Their scene.** Hong Kong is not New York. The tong lau / bay window / ribbon
  glass / vertical neon grammar is the wrong identity for Alder Heights.
  AGENTS.md §0 is explicit: "cozy, colorful, readable low-poly New York
  presentation." HK3's grammar is a reference for *density and walkability*,
  not for *visual identity*.
- **Their Mixamo people.** Our `personRig.ts` is articulated procedural rigs;
  HK3's Mixamo GLBs are a different pipeline with a different license+credit
  load (Adobe Mixamo's terms are not CC0). The rigs are not portable.
- **Their Blender cars.** Our `tools3d/rebuild_cars.py` + the
  `public/models-experimental/cars-v2/` GLBs are our own pipeline; HK3's
  Blender-built cars are a different asset class.
- **Their Poly Haven textures.** Our textures are authored lowpoly + the fenestra
  atlases; the regimes are different. (Poly Haven is CC0, so the license is not
  the blocker — the regime is.)
- **Their renderer + post chain.** HK3 inherits Ocean Drive's PBR + cluster
  lights + post chain. Our renderer is MeshLambert + bake + fenestra; docs/
  architecture/03 §4 rules out the engine swap.

**Influence on the final map:** HK3 is the reference that confirms a dense
walkable street reads at 60 fps without a PBR cluster-light pipeline. The
world-map blueprint's walkable-street law (the sidewalk carries through every
cross-street opening; the lit-window row sells the far block at one second) is
the law HK3's street.js already follows in source — our own ground builders and
fenestra system follow it independently, and the cross-check is the discipline
gate.

### 3.5 Blueprint3D — interiors as data

**Already studied in docs/57 §3.8 with five sibling research docs in
`docs/research/`.** The short form for the world-map package:

- **Worth adapting — the data shape:** corner/wall graph with self-healing merges
  and T-splits; rooms **derived** from topology via half-edge rings, never
  serialized; a six-way item placement taxonomy (floor / wall / in-wall / …
  variants); openings as rectangular holes cut in wall `Shape`s driven by the
  descriptor; a corner-dict save format that re-hydrates IDs by reference.
- **Worth adapting — the placement math:** wall-glue via drag-proxy planes +
  `boundMove` clamping; sticky wall-snap with release threshold and half-depth
  gating; corner-item docking. Pure math, no physics, vitest-able.
- **Not portable:** the code itself (r69/jQuery/ES5 or `animejs`-coupled src);
  the 2D editing floorplanner (the player is not the architect); their
  loaders/lighting/controls; their serialization as-is (no version field — a
  non-starter under our save law); their demo assets (unlicensed).
- **FIRST SLICE mapping:** a `src/world/interiors/` plan layer (pure data +
  build-time derivation + placement math), registry-owned plans, Effect-mediated
  gameplay — the five-phase plan lives in
  `docs/research/blueprint3d-integration-blueprint.md`.

**Influence on the final map:** the 21 interiors the registry names (LAUNDRY-INT,
BARBER-INT, PIZZA-INT, DINER-INT, BAKERY-INT, RECORD-INT, HALL-INT, CECIL-ROOM,
etc. — all shipped W5/W8 per docs/57 §3.8 and the W11 registry-truth repair) are
the place the Blueprint3D data shape applies. The hand builders in `World.ts`
(`wallRun`/`roomBox`) + `interiorAssets.ts` (32 sand3d programs + GLBs) are the
shipped cousin; the Blueprint3D integration blueprint is the next step if the
interiors ever grow a floorplan-data layer.

### 3.6 three-fenestra — interior-mapping windows (the bonus reference)

**Already studied in docs/57 §3.8 (three-fenestra).** Included here because the
directive names "five reference repositories" and the project's standing
engineering ledger counts fenestra as the third permanent-style reference. The
short form:

- **Repo:** https://github.com/codedgar/three-fenestra v0.3.0, MIT, © 2026 Edgar
  Pérez. The technique's origin the repo credits: Joost van Dongen, *Interior
  Mapping* (2008).
- **What it is:** a drop-in `InteriorMappingMaterial` that ray-marches a virtual
  room box behind each window plane and paints one atlas cell — one-point-
  perspective interiors with per-window GPU variation from hash seeds.
- **What FIRST SLICE took:** the GLSL core (hash / atlas pick / room-box march),
  the instanced-attribute schema (`instanceFade` repurposed as a glass-cue
  weight), the compositing model (pre-lit room added after lighting, before tone
  mapping).
- **What we adapted rather than adopted:** MeshStandard → MeshLambert (the house
  family); static `litRatio` → the in-game-clock occupancy law with per-window
  hashed onset thresholds; full atlas pick → family RANGE halves; per-material
  plane size → one shared unit plane scaled per instance; the transparent LOD
  crossfade → band attributes.

**Influence on the final map:** the 447 windows of the Alder Heights block
render as rooms with furniture and plants behind the glass — the technique is
the shipped law, pinned by tests and by the probe that measures the pixels. The
world-map blueprint's lit-window law is fenestra's law.

---

## 4. License and reuse verdict — one table to check

| Reference | Code license | Data / asset license | Verdict for FIRST SLICE |
|---|---|---|---|
| **gen-city-auto** | MIT (package.json); **no LICENSE file** — attribution note required if any code is lifted verbatim (none was) | n/a (procedural) | **Adapt patterns, not code.** Carry an attribution note in `THIRD-PARTY-NOTICES.md` if any snippet is ever lifted. The graph, A*, access and follower are our own. |
| **slop-newyork** | MIT (LICENSE, 2026) | NYC Open Data terms / ODbL (the geodata) — **reference-only, never ingest** | **Code: reuse with notice** (the architectural detail kit already ported into `nycKit.ts`; provenance in `docs/slop-integration/`). **Data: never ingest, never ship a derivative database.** Its TSL/WebGPU pipeline stays out (non-goal). |
| **Metropolis** | ISC (`citysim/package.json`; ISC ≈ MIT) | n/a (all procedural) | **Adapt the typology vocabulary and the seeded-spec discipline; do not port the code.** Carry attribution if any code is ever lifted (none was). The typology is a vocabulary, not a generator for named buildings. |
| **HongKongThreejs** | MIT (LICENSE, © 2026 Prasenjit / StarKnightt; built on Ocean Drive MIT) | Poly Haven textures CC0; Mixamo people Adobe terms (NOT CC0); Blender cars own | **Adapt the laws (shader-drawn windows, LOD register, walkable-first framing); do not port the scene, the people, the cars, or the renderer.** The HK grammar is the wrong identity for Alder Heights. |
| **Blueprint3D** | MIT (© 2015 original; MIT 2026 modern rewrite) | Original demo assets MIT-equivalent; **modern CDN demo assets unlicensed** | **Adapt the data shape and the placement math; do not port the code, the 2D editor, the serialization, or the demo assets.** The five-phase integration plan lives in `docs/research/`. |

---

## 5. How the five references inform the world-map blueprint

The directive names the mapping explicitly. The implemented/locked version:

- **gen-city-auto + Metropolis → city layout and building-generation strategy.**
  gen-city-auto's graph→parcel order is the build order if the map ever grows
  a fifth street (docs/57 §3.2). Metropolis's typology → seeded spec → geometry
  is the vocabulary for the SKY-W / SKY-E skyline fabric rows (§3.3 above) — the
  backdrop behind the named buildings, deterministic, registry-keyed, lit by the
  fenestra per-window law.

- **slop-newyork → New York visual identity and urban composition.**
  The architectural detail kit (HVAC, cornice bands, awnings, fire-escape
  stacks, steam vents, subway stairs + globe posts, mailboxes, scaffold sheds)
  is already ported into `web-three/src/world/nycKit.ts` (provenance in
  `docs/slop-integration/`). The neighbourhood identity (Kestrel commercial
  spine, Juniper institutional row, Sycamore big storefronts, Gable stoop
  street, Marlow bakery row) is the real-NYC grammar the bible (doc 04) wrote
  and slop-newyork confirms reads as "New York" in one second.

- **HongKongThreejs → walkable street-level environment.**
  The walkable-first framing (first-person + third-person + drivable) is the
  cousin of our own `player/Player.ts` + `engine/traffic.ts` +
  `world/arrivalBus.ts`. The shader-drawn-window discipline is the confirmation
  of our fenestra law. The LOD register pattern is the confirmation of our own
  `shadowLaw.ts` + district-ring. The street-layer "one merged mesh" discipline
  is the confirmation of our own ground builders. HK3 is the reference that
  proves a dense walkable street reads at 60 fps without a PBR cluster-light
  pipeline — the regime our own Lambert + bake + fenestra renderer follows.

- **Blueprint3D → building interiors and floor-plan construction.**
  The 21 interiors the registry names (all shipped W5/W8 per the W11
  registry-truth repair) are the place the Blueprint3D data shape applies. The
  hand builders in `World.ts` (`wallRun`/`roomBox`) + `interiorAssets.ts` (32
  sand3d programs + GLBs) are the shipped cousin; the Blueprint3D integration
  blueprint (`docs/research/blueprint3d-integration-blueprint.md`) is the next
  step if the interiors ever grow a floorplan-data layer.

- **three-fenestra (the bonus reference, the technique the directive's "visual
  target" implicitly depends on) → the lit-window row that sells the far block
  at one second.** The 447 windows of the Alder Heights block render as rooms
  with furniture and plants behind the glass; the technique is the shipped law,
  pinned by tests and by the probe that measures the pixels.

The five references do not "add up to a city." They add up to **one block that
reads as New York in one second, is walkable at 60 fps, has interiors that are
rooms (not boxes), and has a lit-window row that sells the far block.** That is
the world-map blueprint's destination, and it is the destination the shipped
code already reaches.

---

## 6. What none of the five references has (build independently, say so)

Carried over from docs/57 §4, with the two new repos checked:

- **A story spine.** Four days, beats, the objective line — neither repo has
  anything like it; their worlds are purpose-free by design. (Metropolis is a
  city builder with no narrative; HK3 is a walkable scene with no story.)
- **The No-FOMO law.** No reference system is pressure-aware; our roam contract
  (`freeroam.ts`) has no cousin. (Metropolis has a sim with stats; HK3 has none
  at all.)
- **The block remembers.** Regulars, memory lines, the diary drain — FIRST
  SLICE's M3 is our own design. Their peds walk; ours know you. (HK3's crowd is
  decorative; Metropolis's peds are commuters, not characters.)
- **A paper companion.** The Map is handwriting with a save schema; SNY's atlas
  is a survey instrument; Metropolis has a minimap; HK3 has a minimap. Different
  jobs.
- **Save-schema migration discipline.** Optional-trailing v1-safe fields,
  byte-identical old parses — no reference carries a save forward like ours.
  (Blueprint3D's save has no version field — a non-starter; Metropolis and HK3
  have no save at all.)
- **The NYC architectural identity at the cozy-lowpoly grain.** SNY is real-NYC
  at survey granularity; HK3 is Hong Kong; Metropolis is a generic city. The
  cozy-lowpoly NYC identity is the bible's (doc 01) and the shipped code's own.
- **A subway ride that works.** HK3 has drivable cars; Metropolis has roads;
  none has a scripted transit ride with a station-to-station seam. The K line
  ride (`world/subway/`) is our own design.

---

## 7. Provenance and re-clone commands

This document was produced 2026-11-13 by Z.ai. The five repositories were
cloned shallow into `/home/z/my-project/refs/` and read at the source level.
Re-clone commands (the clone convention AGENTS.md §1e names):

```bash
git clone --depth 1 https://github.com/greggman/gen-city-auto    /home/z/my-project/refs/gen-city-auto
git clone --depth 1 https://github.com/mrdoob/slop-newyork       /home/z/my-project/refs/slop-newyork
git clone --depth 1 https://github.com/rebollo507/Metropolis     /home/z/my-project/refs/Metropolis
git clone --depth 1 https://github.com/imsarah/HongKongThreejs   /home/z/my-project/refs/HongKongThreejs
git clone --depth 1 https://github.com/furnishup/blueprint3d     /home/z/my-project/refs/blueprint3d
# the modern rewrite (studied in docs/57 §3.8 + docs/research/):
git clone --depth 1 https://github.com/charmlinn/blueprint3d-modern  /home/z/my-project/refs/blueprint3d-modern
# the interiors-windows reference (studied in docs/57 §3.8 three-fenestra):
git clone --depth 1 https://github.com/codedgar/three-fenestra    /home/z/my-project/refs/three-fenestra
# the project itself (the consumer of all of the above):
git clone --depth 1 https://github.com/desurfofficial-ship-it/first-slice-nyc  /home/z/my-project/refs/first-slice-nyc
```

**The standing rule (AGENTS.md §1e):** whenever a task builds, upgrades,
replaces, or improves a system that exists in any of these references, inspect
that reference's actual source first. Record new findings in docs/57 §3 (the
permanent ledger) and cross-reference from this document's §2 table.

— Z.ai agent, 2026-11-13
