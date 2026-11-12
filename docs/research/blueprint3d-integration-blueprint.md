# Blueprint3D → FIRST SLICE integration blueprint

> The concrete plan a future implementation wave can execute. Companion docs:
> [blueprint3d-original-audit.md](blueprint3d-original-audit.md) · [blueprint3d-modern-audit.md](blueprint3d-modern-audit.md) ·
> [blueprint3d-first-slice-applications.md](blueprint3d-first-slice-applications.md) (the "what/why") ·
> [blueprint3d-performance-and-risk-assessment.md](blueprint3d-performance-and-risk-assessment.md) (the price).
> **Status: research only — no code in this wave** (mission rule 6: do not start implementation
> before documenting findings). Every section below is a proposal sized against the existing tree.

## 0. Ground rules (the mission's restrictions, made checkable)

1. **No architecture replacement.** The plan layer is additive: a new `src/world/interiors/` module
   and registry shapes. `Game.applyEffect`, `engine/collide.ts`, `sim/`, `world/peds.ts` are
   read-mostly (touch list in §7 is exhaustive).
2. **No unnecessary dependencies.** Zero new npm packages. The only Blueprint3D-only dep
   (`animejs`, in the modern core's `three/main.ts:2`) maps to our existing `engine/tweens.ts`.
   Everything else in the plan is plain TypeScript + three, both already present.
3. **No duplication.** Anything FS already has keeps its owner (the "no-re-study map" law):
   collision stays `engine/collide.ts`, asset fitting stays the GLB upgrade seam, units stay
   meters (we do NOT adopt Blueprint3D's centimeter convention — the conversion is one constant
   at the plan boundary, and our registry is meters).
4. **Nothing behavioral breaks.** NPC/traffic/interaction laws (nav doors-as-edges, band clamps,
   `crowd.test.ts`, the E2E) are pinned; any phase that could touch them carries its own guards.
5. **No wholesale import.** Not the original (r69/jQuery), not the modern app (Next.js). Patterns
   only, reimplemented under our license ledger (both repos MIT; their demo assets are NOT — see
   the risk doc §4).
6. **Registry sovereign.** "A building's numbers are copied from the registry, never invented"
   extends to plans: plans live IN the registry (`docs/data/world-registry.json`), validated by
   `sim/registry.ts`.

## 1. Where the layer sits

```
docs/data/world-registry.json          (TRUTH: buildings, interiors, anchors, + NEW: plans)
        │  loadRegistry() — sim/registry.ts (validation grows plan checks)
        ▼
┌───────────────────────────────────────────────────────────────────┐
│ src/world/interiors/plan.ts        (NEW — pure data + derivation)  │
│   Plan { roomId, corners[], walls[], openings[], height }          │
│   deriveRooms(plan) → RoomPolygon[]        ← ported algorithm      │
│   (pure functions; no THREE; vitest-only)                          │
└───────────────┬───────────────────────────────────────────────────┘
                │ derived polygons (build-time or boot, ONCE)
                ▼
┌───────────────────────────────────────────────────────────────────┐
│ src/world/interiors/build.ts      (NEW — geometry, consumes plan)  │
│   buildWallsFromPlan(): roomBox/wallRun-equivalent AABB emission,  │
│   hole-cut faces (ShapeGeometry), MatBank materials, colliders     │
│   registered to World.colliders, meshes into the interior group    │
└───────────────┬───────────────────────────────────────────────────┘
                │ meshes + AABBs — same shapes as today's hand builders
                ▼
   World.ts (existing): registerInterior / InteriorHandle visibility,
   bakeStatics(), GLB upgrade seam, registerGlbProp — ALL UNCHANGED
                ▲
┌───────────────┴───────────────────────────────────────────────────┐
│ src/world/interiors/placement.ts  (NEW — item semantics, phase 3)  │
│   PlacementSemantics union, footprint metadata, wall-glue/sticky   │
│   snap math, validity checks (container + items), reject feedback  │
│   (pure math over plain data; meshes attached by caller)           │
└───────────────────────────────────────────────────────────────────┘
Persistence (phase 4): story save `SaveData.interiors?` (optional-trailing,
whitelist-parsed — core/Save.ts law) and/or a plan section in the world save
(sim/state.ts `WORLD_SCHEMA_VERSION`-gated). Emitters: a module-local typed
EventEmitter, NOT a global bus (no pub/sub exists in FS by design).
```

The shape of the whole thing: **one pure data module, one geometry consumer, one math module,
one save field** — and everything runtime (visibility, collision, streaming, GLB seams) keeps its
current owner.

## 2. Module design

### 2.1 `src/world/interiors/plan.ts` — the data model (port of `model/{corner,wall,floorplan,room}.ts`, reduced)

We keep Blueprint3D's *shape* and drop what we don't need (no runtime editing, no GUID-by-Math.random,
no cm):

```ts
export interface PlanCorner { readonly id: string; readonly x: number; readonly z: number }      // meters, registry coords
export interface PlanOpening  { readonly id: string; readonly wall: string; readonly kind: 'door'|'window'|'arch';
                                readonly center: number;   // position along the wall, meters from wall start
                                readonly width: number; readonly height: number; readonly sill?: number }
export interface PlanWall     { readonly id: string; readonly a: string; readonly b: string;     // corner ids
                                readonly thickness: number; readonly height: number }
export interface InteriorPlan { readonly id: string;          // = registry interior id (stable, persisted)
                                readonly corners: readonly PlanCorner[];
                                readonly walls: readonly PlanWall[];
                                readonly openings: readonly PlanOpening[] }
export interface PlanRoom     { readonly id: string; readonly corners: readonly PlanCorner[];   // CCW ring
                              readonly area: number; readonly center: {x,z} }                    // DERIVED, never persisted
export function deriveRooms(plan: InteriorPlan): PlanRoom[]                                   // §3.1
export function wallSegmentsWithOpenings(wall, openings): Segment[]                           // §3.2 — feeds build.ts
```

Design decisions inherited (with the reason):

- **Rooms derived, never stored** (original `Floorplan.update()` doctrine) — one `deriveRooms()` at
  build time; the registry never records rooms, only corners/walls/openings.
- **Stable IDs** — corners and walls carry registry-owned string ids; this kills the original's
  positional room-UUID problem (texture/save keys that reshuffle on any edit) and matches our
  registry id law.
- **Openings as first-class data** — Blueprint3D models openings as *items embedded in walls*; we
  promote them to wall properties (a door is not furniture), and the SAME descriptor later feeds the
  nav-graph door edges (§1.4 of the applications doc).

### 2.2 `src/world/interiors/build.ts` — geometry (port of `three/{edge,floor}.ts`, reduced)

- Wall faces: `THREE.Shape` in wall-local space with **one rectangular hole per opening**
  (the `edge.ts:259–277` modern pattern), triangulated via `ShapeGeometry`, UVs hand-rolled
  (`u = dist/length`, `v = y/height`), materials from `MatBank` — NOT Blueprint3D's per-wall
  `TextureLoader` (our statics bake and draw-call budget rule).
- Walls emit **AABB colliders piecewise** (pier/sill/lintel), reusing `wallRun`'s decomposition
  logic — same shapes `World.colliders` already consumes; `retireCollider` bookkeeping unchanged.
- Floors: the divide-then-rescale ShapeGeometry trick (`three/floor.ts:55–69` modern) with our
  materials.
- Everything lands in the existing `registerInterior(...)` flow so `InteriorHandle` hysteresis,
  glass law, duck towers, and `bakeStatics()` treat plan-built rooms exactly like hand-built ones.

### 2.3 `src/world/interiors/placement.ts` — item semantics (port of `items/*.ts`, reduced)

```ts
export type PlacementSemantics = 'floor' | 'floor-blocking' | 'wall' | 'wall-floor' | 'in-wall' | 'in-wall-floor';
export interface PlacementDef  { readonly id: string; readonly semantics: PlacementSemantics;
                                 readonly footprint: { w: number; d: number; h: number };  // meters, from GLB AABB
                                 readonly anchored?: { wall: string; at: number; y: number; face: 1|-1 } } // authored placement
export function validatePlacement(plan, def, p: Placement): PlacementVerdict                   // pure
export function projectOntoWall(plan, wallId, x, z, def): Placement                            // the boundMove math, §3.3
export function snapToWall/Corner(...)                                                         // the modern sticky math, §3.4
```

No meshes, no THREE (pure math → cheap vitest pins). Meshes attach through the existing GLB upgrade
seam; colliders (for `floor-blocking`) register like any static. Authored interiors use `anchored`
placements (data rows in the registry); live placement (a future purchase beat) uses the same
functions with the sticky-snap path.

### 2.4 Events — deliberately minimal

No global bus (the FS has none; adding one is architecture replacement). The interior module gets a
module-local typed emitter (the one pattern both reference repos agree on), with an exhaustiveness-
pinned inventory to avoid the dead-emitter rot both repos suffer:

```ts
export type InteriorEvent =
  | { kind: 'plan-built';   id: string }
  | { kind: 'placement-added'; interior: string; item: string }
  | { kind: 'placement-removed'; interior: string; item: string }
  | { kind: 'placement-rejected'; interior: string; item: string; reason: 'outside-room'|'overlaps'|'in-wall' };
export const interiorEvents = new Emitter<InteriorEvent>();   // module-local; Game subscribes, wraps into Effects
```

Game-side, nothing new: if gameplay ever reacts (a purchase Effect placing furniture), it flows
through `Game.applyEffect` as a new Effect kind — the established orchestrator law.

## 3. Algorithms to port (exact source, with the adaptation noted)

### 3.1 Room derivation — replace the exponential DFS with a face walk
- **Source:** `Floorplan.findRooms` + `_findTightestCycle` + `_removeDuplicateRooms` (original
  floorplan.ts:375–494; identical in modern floorplan.ts:388–516). Tightest-turn-first DFS from
  every corner pair, dedupe by cyclic rotation hash, keep CCW loops.
- **Adaptation:** keep the *turning-angle ordering* idea and the CCW filter, but walk **DCEL faces**
  (`HalfEdge.next` rings — the structure is already there in both repos) instead of DFS from every
  corner pair: O(walls) face enumeration, no dedupe pass, no exponential worst case. Both repos'
  own TODO (`optimize this, only check corners with > 2 adjacents`, floorplan.ts:479/501) points at
  the same conclusion. Unit-test against the original algorithm's outputs on shared fixtures
  (rectangle, L-shape, T-junction, courtyard-with-hole) — the original becomes the oracle.
- Also ported: **miter insets** (`HalfEdge.halfAngleVector`, both repos, with the 180° ÷0 case
  *fixed*: clamp `|theta − π| < ε` to a straight butt joint) — wall faces must meet correctly at
  convex/concave corners.

### 3.2 Wall openings — pier/sill/lintel + hole faces
- **Source:** `wallRun(..., openings[])` (ours, `World.ts:2754`) already decomposes; Blueprint3D's
  `Edge.makeWall` (original edge.ts:181–259) cuts `Shape` holes from embedded items.
- **Adaptation:** one function `wallSegmentsWithOpenings(wall, openings)` returns the solid spans
  (piers, sill/lintel bands per opening) for colliders AND the hole contours for faces. Doors
  (`sill=0`, floor-bound) vs windows (`sill>0`) vs arches come from `PlanOpening.kind`. Rotated or
  non-rectangular holes stay out of scope (both reference implementations are AABB-accurate only;
  say so in the registry docs).

### 3.3 Wall projection & clamping — `WallItem.boundMove`
- **Source:** original wall_item.ts:195–219 (modern wall_item.ts:232–258): transform into
  `interiorTransform` space, clamp x within `[sizeX/2, interiorDistance − sizeX/2]`, clamp y to
  wall height or floor, force `z = getWallOffset()`, inverse-transform.
- **Adaptation:** rewrite with plain vector math (no THREE.Matrix4 on the data path — the plan is
  2D; the wall-local frame is origin + unit direction + normal). Port the **stored-edge staleness
  fix** (`updateWallEdgeReference`, modern wall_item.ts:212–223) and the **stored-bound-handler
  unsubscribe** pattern (`boundRemoveFromScene`) for anything that subscribes to plan events.

### 3.4 Sticky wall snap + corner docking — the modern repo's best upgrade
- **Source:** `FloorItem.moveToPosition` snap-state machine (modern floor_item.ts:44–104):
  `snappedWallEdge` held across frames, `releaseThreshold = 30` cm-equivalent, surface-distance
  gating by the item's own half-depth, `snapToWall` (project + clamp + offset by half-depth + face
  away), `findPerpendicularWall` (`|dot| < 0.3`), `snapToCorner`/`CornerItem.positionAtCorner`
  (modern corner_item.ts:170–222; corner validity `minCornerAngle = π/6`).
- **Adaptation:** direct port, meters instead of cm, tolerances become module constants with
  doc comments (the repos scatter five unrelated literals; ours get names and one home).

### 3.5 Validity checks — container + items
- **Source:** `FloorItem.isValidPosition` (point-in-polygon + polygon-polygon-intersect) — with the
  original's two bugs **not** ported: per-room `isInARoom = true` misclassification
  (original floor_item.ts:44–78) and the `pointInPolygon` (0,0)-origin fallback (original
  utils.ts:214–250). Item-vs-item overlap: **both repos have it disabled**; we implement it as
  footprint-rect vs footprint-rect via existing `RectXZ`/`AABB` helpers in `engine/collide.ts`
  (pure reuse — rule 3).

## 4. Serialization design (save-law compliance)

- **Authored plans** live in the registry — versioned by the registry itself, not by saves.
- **Player-mutated interior state** (phase 4 only, when a beat needs it): one optional-trailing
  story-save field per the migration law (`absence reads as default at the read site`):

```ts
export interface SavedInteriorState {                       // SaveData.interiors?: SavedInteriorState[]
  interior: string;                                         // registry interior id (stable)
  placements: Array<{ item: string; wall?: string; at?: number; y?: number; x?: number; z?: number; rot?: number }>;
}
```

- Parse = whitelist rebuild with clamps (coordinates finite, ids known to the registry, count
  capped), corrupt pieces quarantine to defaults — the exact shape of `parseSave`/R2
  (`core/Save.ts`, `sim/state.ts BANNED_KEYS`). If it rides the world save instead, it goes in as a
  new optional `WORLD_SCHEMA_VERSION`-gated section with the same tamper battery the world save
  already has (`tests/world-save-validation.test.ts` is the template to mirror).
- **Never** persist derived rooms (the original's one great serialization decision — keep it).

## 5. Phased plan with complexity estimates

Estimates are for one agent, excluding gates; "S" ≤ a day, "M" = a few days, "H" = a week+.

| Phase | Deliverable | Sources ported | Files touched | Tests | Size |
|---|---|---|---|---|---|
| **P1** | `interiors/plan.ts`: types + `deriveRooms` (face-walk) + miter insets + opening segmentation; **no THREE, no wiring** | §3.1–3.2 (algorithm only) | new module + registry types (`sim/registry.ts` optional `plan?`) | pure-function pins: rectangle/L/T/courtyard vs the original-as-oracle; ÷0 case; CCW filter; opening segmentation | **M** |
| **P2** | Registry carries the bodega plan (ROS-01) and one W5 room as data; `interiors/build.ts` builds walls+floors from plan with pier/sill/lintel colliders; bodega/w5 builders consume it | §3.2 | `World.ts` bodega + one `buildW5*` (consume, don't rewrite), `docs/data/world-registry.json`, `sim/registry.ts` validation | `interiors.test.ts` anchors unchanged-and-green; new plan-vs-shell cross-check; collider census equality (piece count + bounds) vs hand-built baseline | **M** |
| **P3** | `interiors/placement.ts`: semantics union + footprints + `validatePlacement` + wall projection/sticky snap; wire **authored** placements as data rows (bodega fridge, wall clock, dressing rails move to data) | §3.3–3.5 | new module, `world/furniture.ts`/`interiorAssets.ts` metadata (additive), `World.ts` consumers | pure math pins (glue, clamp, snap, corner dock, rejection reasons); placement rows pinned; interaction reach re-verified (E2E spot) | **M** |
| **P4** | Item-item overlap as AABB checks + rejection feedback on an interactive placement beat (first live placement, e.g. C1+ furniture purchase) | §3.5 (ours) | `placement.ts`, one Effect kind in `core/GameState.ts` + `Game.applyEffect`, save field per §4 | overlap pins; save round-trip + tamper battery; E2E beat | **M** |
| **P5** | Multi-room derivation powers a genuinely multi-room floor (records back-office or hall wings) | §3.1 at scale | registry plans ×2, `build.ts`, nav build consumes plan door descriptors (`sim/nav/build.ts`) | nav doors-as-edges pins; chokepoint probes; interiors tests | **H** |

P1–P2 are the load-bearing pair (data + build); P3 makes placement data-driven; P4 adds
persistence and live placement; P5 is the payoff that justifies the graph. Each phase ships
independently and leaves the game green — no phase needs the next one.

## 6. Testing requirements (the house pattern: the acceptance is a test)

- **Oracle tests** (P1): the ported `deriveRooms` must agree with the original algorithm's output
  on shared fixtures — the 2016 code becomes a test oracle, which is the cleanest possible use for it.
- **Anchor continuity** (P2): `tests/interiors.test.ts` (shells/anchors) and the interaction-reach
  assumptions stay green unchanged; a collider-census test pins that plan-built walls produce the
  same AABB set as the hand-built baseline (piece counts + bounds), so `wall-slide.test.ts` and
  `collide.test.ts` need no edits at all.
- **Pure-math pins** (P3): glue/clamp/snap/dock/rejection — every constant named and pinned.
- **Save law** (P4): old-v1 parses byte-identical (existing pins), absent-field-fresh,
  corrupt-quarantine, tamper battery mirrored from `world-save-validation.test.ts`.
- **Visual law** (P2/P5): probe screenshots of the plan-built rooms at the same vantages as the
  hand-built baseline (the bodega-pass evidence pattern, `docs/production/interiors/`) — the
  Anti-Slop gate is a look, not a build log.

## 7. Files-touched map (complete list for the whole plan)

New: `web-three/src/world/interiors/plan.ts`, `build.ts`, `placement.ts`, `events.ts`,
`web-three/tests/interiors-plan.test.ts`, `interiors-placement.test.ts` (+ registry fixtures).
Modified (additive only): `docs/data/world-registry.json` (plan rows), `web-three/src/sim/registry.ts`
(types + validation), `web-three/src/world/World.ts` (bodega + one W5 builder *consume* the module;
registration calls), `web-three/src/world/furniture.ts` / `interiorAssets.ts` (footprint metadata),
`web-three/src/core/Save.ts` (one optional field, P4), `web-three/src/core/GameState.ts` +
`game/Game.ts` (one Effect kind, P4), `web-three/src/sim/nav/build.ts` (P5 only).
Never touched: `engine/collide.ts`, `world/peds.ts`, `sim/nav/*` internals (P5 consumes, doesn't
modify), `render/*`, `camera/*`, `engine/traffic.ts`.

## 8. Explicitly out of scope (permanently, unless the owner changes the game)

- The 2D editing floorplanner, drag-rotate HUD gizmo, orbit/pan controls, skybox, its lighting rig —
  the player is not the architect, and ours are better.
- `animejs`, any event-bus package, any CSG library (rectangular holes are all we need).
- Blueprint3D's centimeter unit system, GUID-by-`Math.random`, positional room UUIDs.
- Its loaders (r69-JSON reviver, GLB→Phong downgrade — our GLB seam is strictly better), its
  demo assets (unlicensed CDN content — see the risk doc §4), its save format as-is (no version
  field is a non-starter under our save law).
- Runtime wall editing, live room derivation per frame, per-drag re-triangulation.

## 9. Open questions for the owner (none block P1)

1. **Registry vs separate plan files** — plans inline in `world-registry.json` (sovereign truth) or
   side files (`docs/data/plans/*.json`) referenced from it? Recommendation: inline; the registry's
   cross-validation already guards it, and `validate-registry` becomes the single gate.
2. **Save home for P4** — story save (`SaveData.interiors?`) vs world save (a gated section)?
   Recommendation: world save, per the "world save rides its own key" precedent, if placement is
   sim-visible; story save if it is purely narrative dressing.
3. **P5 timing** — is a multi-room floor actually scheduled (C1+ content), or does P5 stay
   speculative until it is? The honest answer determines whether the face-walk port is M or must
   wait.
