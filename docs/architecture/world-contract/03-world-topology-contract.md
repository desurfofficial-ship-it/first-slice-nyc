# 03 — World Topology Contract

| | |
|---|---|
| Status | Adopted — data implemented (`sim/registry.ts`); **nav graph IMPLEMENTED + INTEGRATED (`sim/nav/`, 2026-11-06 — Phase 3 A-1/A-2)** |
| Source of truth | `docs/data/world-registry.json` (construction geometry, canon) |

## 1. The topology stack

The world is FOUR layers, each with its own shape and owner. Nothing may skip a layer (a story beat never eats coordinates; a renderer never invents semantics).

| Layer | Shape | Owner | Lives in |
|---|---|---|---|
| 1. Geography | districts, streets, blocks, parks, water | Registry (Workstream A extends) | `world-registry.json` |
| 2. Structures | buildings, entrances, interiors, anchors | Registry | `world-registry.json` |
| 3. Movement | sidewalks, crosswalks, lanes, routes, chokepoints | Workstream A (contract below) | registry `routes` + future nav module |
| 4. Meaning | tags, story roles, business hours, occupancy | This contract | `sim/registry.ts`, `sim/entities.ts` |

**Districts.** Alder Heights is the first district (`neighbourhood.name`). District ids are sim ids: `district:alder_heights`. The registry's `neighbourhood` section is the canon anchor; a district record MUST carry: id, name, bounds, tags. **Status: Partial** — one district, implied bounds (`bounds.world`); the district record type is declared in [07] §4.

**Streets.** Registry ids (`STR-KESTREL`…), axis (EW/NS), centerline, road band, walk bands. Five shipped. Streets are permanent; new streets append (registry law).

**Blocks.** `BLK-N`/`BLK-S` with bboxes; buildings declare membership; the validator enforces containment (mjs §3 + TS `OUT_OF_BOUNDS`/block checks).

**Buildings.** Registry ids (`KTN-01`), class A–D (A enterable / B ground-floor / C exterior / D backdrop), footprint `{x,z,w,d}` matching `engine/collide.ts boxFromCenter`, height, entrances with facing. **The law: a building's numbers are copied from the registry, never invented.** Status today: code literals + mjs fidelity gate (**Mod** — Workstream A may flip to loader-driven, keeping the gate).

**Interiors.** Registry ids (`BODEGA-INT`), shell (bounds + clearH + belowGrade), anchors (interaction build contract — `interiors.test.ts` already pins them). Below-grade rooms (MEZZ-INT) are exempt from building containment **by contract**, matching the shipped gate — station mezzanines span structures.

## 2. Entrance & access contract

- Every enterable building (class A/B) SHOULD declare ≥1 entrance; the registry's `entrance[]` carries `{x, z, faces}`.
- `sim/registry.ts placePoint(id)` resolves a place to its first entrance when one exists (a door, not a centroid — tested on `KTN-01` at x −30).
- Doors/narrow passages are **arbitration resources** (`door:<id>`, capacity 1) — Foundation D owns queuing; Workstream A owns the physical mapping. **Status: contract implemented (`resources` on claims), physical mapping deferred.**

## 3. Movement graph (Workstream A's build, contracted here)

```
NavNode   { id: registry or synthetic id; x; z; kind: 'sidewalk'|'crossing'|'lobby'|'landing'|'path' }
NavEdge   { a; b; kind: 'walk'|'cross'|'door'|'lane'; widthM; oneWay?; resourceRef? }
```
The two deliberate contract extensions (2026-11-06, recorded here by A-1's implementation): the **`path` node kind** (park lawns, alley slots, plaza aprons — outdoor walkable surfaces that are neither a street sidewalk nor a crossing) and the **`door` edge kind** (the facade passage, carrying `resourceRef: 'door:<buildingId>'` — §2's arbitration resource made navigable; doors are EDGES, never nodes, never teleports).
Laws:
1. Edges respect the shipped sidewalk law (Kestrel walk lanes z 4–7.2 / −7.2…−4.3 stay clear of solids).
2. Every interior entrance connects to a sidewalk node (the registry's entrances are the seed set — the mjs gate already proves 18 anchors sit on/near masses).
3. Crossings map to the registry's 11 crosswalks; a crossing edge carries its `resourceRef` for signal/capacity arbitration.
4. The Yuka walkers' authored loops remain valid until Workstream A migrates them onto edges — one paved path, migrated deliberately, `tests/crowd.test.ts` green throughout.
**Status: Implemented (2026-11-06, Phase 3 A-1) — `sim/nav/`: 401 nodes / 444 edges / 1 component over the real registry; byte-identical determinism pin; validation clean (no edge through a footprint — the SUB-01 headhouse passable by the shipped no-blocker law, the ALY slots by the R-ALLEY/R-GARDEN shortcut law); all 26 crosswalk legs incl. the four pattern intersections; curb-cut bypass around the SUB-02 control house; A* with deterministic tie-breaks and a bounded cache; one uniform-grid spatial index; the bound cast walks routes in the live runtime (`worldRuntime.applyOne` → `RouteFollower`); access gating per §2 (a locked door is not an edge).**

## 4. Semantic resolution (implemented)

Narrative and gameplay agents ask for MEANING, never coordinates:

```ts
registry.findPlaces({ tags: ['food_service'], nearX, nearZ, maxRadius, limit })
// → PlaceRecord[] nearest-first, stable ties — tested against the real registry
```

Tag derivation is RULE-BASED over canon names/classes ([07] §3): a deli/grocery/bodega carries `food_service, retail, mixed_use, social_gathering`; a station carries `transport, transit, public_access`; parks carry `public_space, public_access, social_gathering`. Extending the world = extending the rule table WITH a test.

**Location request protocol** (what Workstream C calls):
1. Requester names requirements: `{ tags, near?, openNow? (via [12]), accessibility? }`.
2. Registry resolves candidates (deterministic order).
3. The narrative validator ([10]) checks the chosen candidate against availability.
4. On failure: the fallback planner relocates to the nearest `social_gathering, public_access` place — or cancels loudly. **No author ever hardcodes a coordinate.**

## 5. Cross-reference integrity (implemented, tested)

`validateCrossRefsStatic` + the constructor gate, mirroring the mjs construction checks that RUNNING systems depend on:
- interiors → buildings exist (below-grade exempt, identical to the mjs gate);
- anchors inside their shells (facade anchors exempt);
- intersection streets and corner buildings resolve;
- park npcZones resolve;
- everything inside `bounds.world`;
- id grammar (`isRegistryId`) on every id-bearing entity.

The registry loads with **zero issues today** (`tests/sim-registry.test.ts` pins it). A registry PR that breaks a reference breaks the suite — the gate is now double (mjs for construction, TS for runtime).

## 6. Status ledger for this contract

| Item | Status |
|---|---|
| Typed registry load + validation + queries | **Implemented** (`sim/registry.ts`) |
| Semantic tags + location requests | **Implemented** |
| Place/entrance/interior resolution | **Implemented** |
| District records (explicit type) | **Partial** (one district; record type in [07]) |
| Movement graph (nodes/edges/chokepoints) | **Implemented + INTEGRATED** (2026-11-06, A-1: `sim/nav/` + the routed bound cast; ambient-walker migration = WP-3v) |
| Geometry loaded from registry at runtime | **Deferred** — Workstream A's deliberate flip; fidelity gate keeps both honest until then |
| Multi-district / borough topology | **Deferred** — Passport-scale, not this pass |
