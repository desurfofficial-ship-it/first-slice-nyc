# Blueprint3D → FIRST SLICE applications

> Where the Blueprint3D architecture could actually earn its keep in FIRST SLICE. Companion docs:
> [blueprint3d-original-audit.md](blueprint3d-original-audit.md) · [blueprint3d-modern-audit.md](blueprint3d-modern-audit.md) ·
> [blueprint3d-integration-blueprint.md](blueprint3d-integration-blueprint.md) (the concrete plan) ·
> [blueprint3d-performance-and-risk-assessment.md](blueprint3d-performance-and-risk-assessment.md) (what it costs).
> House law up front (AGENTS.md §1c.6, §2): interiors are not decoration — they are where the game's
> money, cast and story beats live. Any proposal must keep the hot path cold, the registry sovereign,
> and the saves byte-compatible.

## 0. The gap, stated honestly

FIRST SLICE already builds interiors. Nine are walkable: the bodega plus eight W5 rooms
(`buildW5Laundry/Barber/Pizza/Bakery/Records/Hall/Diner/CecilRoom`, `World.ts:2925`), each hand-coded
against `regShell('…')` numbers with `retireMass()`/`roomBox()`/`wallRun()` decomposing a building mass
around a cavity. Walls are real colliding AABBs; openings are decomposed into `_pier_/_sill_/_lintel_`
pieces. It works, and the recent bodega quality pass (register v1.49.0) shows the pipeline produces
production-ready rooms.

What it does **not** have — and what Blueprint3D spent ten years solving:

| FS today | Blueprint3D's answer | Worth adopting? |
|---|---|---|
| Interior walls are **imperative calls** (`wallRun` in a 8,433-line constructor) — walls are geometry, never data | Walls as a **graph**: Corner/Wall objects with identity, adjacency, and events | Yes — as data first, geometry second (§1) |
| Room "identity" is a builder function name; nothing derives rooms from topology | Rooms **derived** from the wall graph (half-edge rings), floors/ceilings generated | Yes — for multi-room floors (§1.3) |
| Openings are hand-decomposed (`wallRun(..., openings[])`) | Openings **cut as holes** in wall faces, driven by embedded items (doors/windows as items) | Adapt, carefully (§2) |
| Furniture is **authored manifests** (`FURNITURE_SLOTS`, `INTERIOR_SLOTS`) — placement is boot-time, static | An **item model**: typed placement semantics (floor/wall/in-wall/…), bounds, constraints, events | Yes — the item taxonomy is the single best idea (§3) |
| Placement constraints = footprint guard (0.5×–1.9×) at GLB upgrade time | Wall-glue math, corner docking, sticky snap, boundMove clamping | Yes — pure math, zero physics (§3) |
| **No persisted interior state** (no prop placement, no arrangement survives a session) | Plan **serialization** (corners dict + walls + items), versioned save/rebuild | Adapt to our save law (§6) |
| No pub/sub — `Effect[]` + `Game.applyEffect` | Per-object event emitters wiring model→views | Partial (§5) |

Everything else Blueprint3D ships — the 2D editing floorplanner, orbit/pan controls, skybox, HUD
gizmo, its loaders, its lighting — is either already better in FS (controls, lighting, asset pipeline)
or out of scope for a game where *the player is not the architect* (the 2D editor). This doc keeps
repeating one verdict: **take the data model, take the placement math, skip the editor.**

## 1. Interior domains, one by one

### 1.1 Shops and restaurants (bodega, pizza, bakery, diner, laundry, barber)

What the domain needs today: a counter, fixtures with real shelf levels, stocked goods the player
buys (`SHELF_STOCK` + `World.addItem` + `shelf_*` interactions + daily `restockShelf()`), dressing
bands (`dressRoom`), signage. All hand-placed against one shell.

What Blueprint3D contributes:

- **Walls-as-data** would let the bodega's hand-built box become a plan: 4 corners, 4 walls, the
  front wall carrying an `InWallFloorItem`-style opening where the door gap is. The payoff is not
  visual — it is that the **plan can carry the game data**: a wall "knows" which items are embedded
  in it, a room "knows" its floor area, and fixtures can validate against room bounds instead of
  against hand-tuned constants. Concretely: `SHELF_STOCK` y-heights currently derive from GLB
  millimetre levels (`shelfTop(mm) = 0.11 + mm/1000·gondolaS`) — correct, but every new fixture
  re-derives its own numbers by hand. A room model that reports "floor top = 0.11, clearance = 4.0"
  makes fixture seating a constraint solve, not a measuring exercise.
- **The item taxonomy maps directly onto deli fixtures**: gondola = `OnFloorItem` semantics
  (floor-bound, blocking), fridge = `WallFloorItem` (glued to east wall, floor-bound), wall clock and
  chip-bag rail = `WallItem` (y-constrained, facing the room), menu board = `WallItem`. The bodega
  already *behaves* like these classes; giving them names makes the fourth gondola or the second
  fridge a data row instead of 30 lines of `World.ts`.
- **Stock-on-shelves as item placement**: `World.addItem` hand-modeled SKUs seated at computed board
  tops is our own invention and it's good — but the *validation* ("is this facing inside its bay,
  inside its shelf, inside the room?") is exactly Blueprint3D's `isValidPosition` shape
  (footprint polygon vs container polygon), which ours currently checks by eye and probe.

Verdict: **adapt** — model the *next* interior (or the bodega's refactor) as a plan first, keep
every existing visual, gate with `interiors.test.ts` anchors.

### 1.2 Apartment interiors (Cecil's room, future homes)

Cecil's room is a single hand-built room. The moment apartments become *characters* — furniture you
notice across chapters, a bed that matters, the C1+ domestic beats — two Blueprint3D ideas matter:

- **Persistent arrangement**: a room's furniture placement serialized alongside the save (§6) means
  Leo's apartment can accumulate state across the story — the stool he bought, the postcard on the
  wall — without a 200-line `SaveData` field per prop. One optional-trailing
  `interiors?: InteriorPlans` field, whitelist-parsed, absence-reads-as-default: exactly the
  established migration law.
- **Wall-attached items with y-constraints and facing** (`WallItem.boundMove` + normal-facing):
  posters, shelves, AC units, wall clocks. The math is 40 lines and needs no editor.

Verdict: **adapt**, low urgency, high story payoff. This is the domain where persistence (§6) starts.

### 1.3 Offices and other commercial interiors (records, hall) & multi-room buildings

This is where the half-edge machinery becomes load-bearing. The W5 builders handle *single* rooms;
the moment a floor needs two rooms and a hallway (records back-office, hall stage + wings, a
multi-tenant floor in Alder Heights), hand-decomposing masses around two cavities gets error-prone
fast — and each new room re-derives its own walls from constants.

Blueprint3D's contribution is the **derived-room pipeline**: corners + walls in, room polygons out
(`findRooms` → `Room.updateWalls` → `interiorCorners`), with floors generated per room and walls
mitered automatically (`halfAngleVector`). For our scale the correct adaptation is:

- rooms are derived **at build time** (author the graph in the registry, run the derivation once at
  world build — not per frame, not even per interior-enter; we have no live editing),
- the derived polygons feed the *existing* builders (`roomBox`/`wallRun` consume derived numbers),
- room identity is a **stable persisted ID** (registry-owned), not Blueprint3D's positional
  corner-list UUID — textures, gameplay anchors, and sim place-points all key off the stable ID.

Verdict: **adapt the derivation as an authoring tool** (registry → validated plan → builders), not
as runtime machinery. Complexity: the highest of any application here, and only worth it when the
second multi-room floor is actually scheduled.

### 1.4 Doors, windows and wall structures

Today: `wallRun(..., openings[])` decomposes walls into pier/sill/lintel AABBs — solid, colliding,
correct, and hand-listed per opening. Blueprint3D cuts **real holes** in wall faces
(`shape.holes` per embedded item, `three/edge.ts:259–277` modern / 181–259 original) with the
opening geometry driven by the *item* placed in the wall.

The interesting inversion: in Blueprint3D, a door is an item that happens to cut a hole. In FS, a
door is a **nav-graph edge** (`resourceRef: 'door:<buildingId>'`, capacity 1, hours) and an
interaction point. The adaptation that respects both: keep openings as registry data
(the current `openings[]`), but let a plan model *generate* the decomposition and the hole geometry
from typed opening descriptors (`{kind:'door', width, height, sill}`, `{kind:'window', …}`), and
attach the sim semantics (nav edge, interaction anchor) to the same descriptor. One source of truth
instead of three hand-synced lists (wallRun openings, nav graph door edges, interaction anchors).

Verdict: **adapt** — highest leverage per line of code of anything in this audit. Also the safest:
it changes how walls are *built*, not how anything *behaves*.

### 1.5 Furniture and decorative objects — the item model

`FURNITURE_SLOTS` (40 slots, room-keyed, GLB-per-slot, provenance table) and `INTERIOR_SLOTS`
(~45 equipment slots) are boot-time manifests with a strict placement law ("uniform-scale to the
slot's authored height, feet on the AABB min-Y, XZ-centered, inherit yaw — nothing gameplay-bearing
changes"). They are excellent at *fitting* assets into *authored* slots. They do not answer
runtime questions: can this couch face the window? does this shelf block this interaction? what
happens when the player buys a chair?

Blueprint3D's item model answers the runtime questions with one pattern: **an item is data
(metadata: type, size, constraints) + a mesh (ours: the GLB seam) + placement behavior keyed by
type**. Concretely reusable, in adoption order:

1. **Bounds from geometry** — `Item` recenters geometry into its bounding box and derives
   `halfSize`; every constraint is center-based math after that. Our GLB upgrade path computes AABBs
   already; persisting the footprint (w×d×h per slot) makes constraint checks testable without
   loading meshes (pure functions → vitest pins, the house pattern).
2. **The six placement semantics** as a TypeScript union, not magic integers:
   `type PlacementSemantics = 'floor' | 'floor-blocking' | 'wall' | 'wall-floor' | 'in-wall' | 'in-wall-floor'`.
3. **Wall-glue + facing** — sticky snap (modern repo's best upgrade), `boundMove` clamping,
   normal-facing rotation. For authored interiors most furniture is placed at authoring time, but
   the *next* furniture purchase beat (C1+: an apartment chair?) is live placement.
4. **Rejection feedback** — the red-glow `showError` pattern, or our equivalent (label flash), for
   any interactive placement.

Verdict: **adapt 1–2 immediately** (they're metadata, not machinery), 3 when live placement is
scheduled, 4 with the first placement UI.

### 1.6 Interactive environmental objects

FS interactions are proximity-based (`InteractionRegistry.nearest(capsule)`, ~76 defs, `Effect[]`
back). Blueprint3D's raycast/selection layer (proxy planes, FSM drag states, hover events) is for
*editors*, not for our E-to-interact grammar — **skip it wholesale**. The one transferable piece is
the **proxy-target pattern**: interaction or placement raycasts should hit invisible, stable planes
(room floor planes, wall planes) rather than prop triangles. We already do the cousin of this for
camera occlusion; a `roomPlane(id)` helper would make future "place on this wall" interactions
robust to GLB detail changes.

### 1.7 Building-specific layouts & the registry

The registry law stands: **"a building's numbers are copied from the registry, never invented."**
A Blueprint3D-style plan layer does not override that — it *sits underneath it*: `RegistryInterior`
grows an optional `plan?: InteriorPlan` (corners, walls, openings — all in registry coordinates,
validated by `sim/registry.ts` cross-checks against `shell`), and the W5/bodega builders consume the
derived geometry instead of hand constants. The registry remains the truth; the plan makes the truth
expressive. Anything that cannot be expressed as a plan stays hand-built — the bodega's dressing
bands and signage are craft, not topology, and stay exactly where they are.

## 2. Connection to the existing world

**Building interaction & entry.** Entry stays what it is: walk through a gap, AABB trigger zones
(`insideBodegaZone`), roof hysteresis for the dollhouse, no teleports (the nav law: doors are edges,
never nodes). A plan layer changes nothing here — it *informs* the builders that make the gap. The
dollhouse visibility trick (`Edge.updateVisibility`, interior-normal · camera dot ≥ 0) is the same
family as our `InteriorHandle` near/far + roof hysteresis; ours already handles the cases we have.
Do not port theirs.

**Player movement & collision.** `engine/collide.ts` is axis-aligned boxes vs capsule, allocation-free,
wall-slide-pinned by tests. A plan layer's only obligation: every derived wall piece registers into
`World.colliders` exactly as `roomBox`/`wallRun` do today — same AABB shapes, same `retireCollider`
bookkeeping. No new collision code, no new subsystem, the pinned tests stay green. This is a hard
constraint, not a preference (integration rule 5).

**NPC & traffic.** Walkers never enter interiors (customers are sim bookkeeping, `interiorId`), the
nav graph is registry-built, doors are edges with capacity. A plan layer must **provide** door
descriptors to the nav build (§1.4's single source of truth) and must never mutate the graph at
runtime. The `bandOfLoop`/`crowd.test.ts` laws are untouched by anything in this audit.

**Streaming & visibility.** There is no streaming — district tiles + `InteriorHandle` hysteresis +
zone groups. Plans change nothing at runtime: derivation happens at build/boot, geometry lands in
the same groups, visibility keeps its existing hysteresis. The one perf note (see the risk doc §2):
derived interiors must participate in `bakeStatics()` and the GLB upgrade seam like everything else,
or the draw-call budget (boot probe < 200) pays for them twice.

## 3. Verdict matrix

| # | Application | Borrow | Verdict | Complexity |
|---|---|---|---|---|
| 1 | Wall/opening data model feeding existing builders | corner/wall graph + opening descriptors (§1.4) | **adapt** | M |
| 2 | Derived rooms for multi-room floors | half-edge derivation, run at build time | **adapt later** | H |
| 3 | Item placement semantics + bounds metadata | six-type taxonomy, center-based bounds | **adapt now** (data only) | S |
| 4 | Wall-glue / sticky-snap / facing math | `boundMove`, `snapToWall`, `CornerItem` docking | **adapt when live placement exists** | S–M |
| 5 | Persistent interior state in saves | plan serialization (corners dict + items) | **adapt to our save law** | M |
| 6 | Stock/fixture validation | footprint-vs-container polygon checks | **adapt** | S |
| 7 | 2D floorplan editor | — | **skip** (player is not the architect) | — |
| 8 | Blueprint3D loaders/controls/lighting/editor chrome | — | **skip** (ours are better) | — |
| 9 | Item-item collision | theirs is disabled; write our own as AABB vs AABB via `engine/collide.ts` | **build** (small) | S |
| 10 | Dollhouse visibility trick | already covered by `InteriorHandle` | **skip** | — |

The through-line: FIRST SLICE does not need a floor planner. It needs **interiors that are data** —
and Blueprint3D is the cleanest available proof that walls-as-graph, rooms-as-derivation, and
items-as-typed-placement is a stable, serializable, event-drivable shape for that data, survived a
decade of use, and tells us exactly which corners not to cut. The concrete module-and-phase plan
lives in [blueprint3d-integration-blueprint.md](blueprint3d-integration-blueprint.md); the price
list lives in [blueprint3d-performance-and-risk-assessment.md](blueprint3d-performance-and-risk-assessment.md).
