# Doc 57 — Engineering References: study before building

> **Deliverable of the 2026-11-05 directive.** FIRST SLICE has two permanent
> engineering references. Before any agent builds or significantly upgrades a
> system one of them already has, they inspect the reference's actual source
> first — then build the version FIRST SLICE needs. This doc records what was
> learned so the next agent doesn't re-study the same ground.

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

## 5. Working rule for every agent

Before you build, check §2's table. If your system has a ✅, read the finding;
if it needs more depth, open the listed files in the local clone. When done,
append what you learned under §3 (dated, sourced, short). The clone lives at
`/home/z/my-project/refs/` — re-clone if a session lost it:

```bash
git clone --depth 1 https://github.com/greggman/gen-city-auto /home/z/my-project/refs/gen-city-auto
git clone --depth 1 https://github.com/mrdoob/slop-newyork      /home/z/my-project/refs/slop-newyork
```
