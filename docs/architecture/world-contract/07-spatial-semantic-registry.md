# 07 — Spatial-Semantic Registry

| | |
|---|---|
| Status | Adopted — implemented (`sim/registry.ts` over the real JSON), tested |
| Source | `docs/data/world-registry.json` v1.0 — imported, never copied |

## 1. What the registry IS to the runtime

Until now the registry served builders (mjs gate at construction time). It is now ALSO the runtime's spatial-semantic service: one `loadRegistry()` parses, indexes, validates, and answers queries. The document stays the single source; nothing in `src/sim` duplicates its data.

**Indexes built at load:** buildings, interiors, parks, streets by id; interiors by building (first = main); `PlaceRecord[]` for every building/park/interior/station with center, radius, and derived tags.

## 2. Typed shapes (consumers may rely on these)

`RegistryDoc` → `meta, bounds.world, neighbourhood, streets[], intersections[], crosswalks[], blocks[], buildings[], parks[], landmarks[], npcZones[], routes{pedestrian[],vehicle[]}, interiors[]` — see `sim/registry.ts` for the exact interfaces (`RegistryBuilding`, `RegistryInterior`, `RegistryAnchor`, …). Fields are deliberately optional: the registry is a living construction document, and validation reports what a consumer actually NEEDS.

## 3. Semantic tags (derived, not authored)

`PLACE_TAGS` is the closed vocabulary:
`residential · commercial · mixed_use · industrial · civic · public_access · public_space · food_service · retail · service · employment · transport · transit · social_gathering · institutional · backdrop · enterable · story_key (+residential_income reserved)`.

Derivation rules (`NAME_RULES`) read canon names/story roles once — deli/grocery/bodega ⇒ `food_service, retail, mixed_use, social_gathering`; pizza/diner/bakery ⇒ `food_service, retail, social_gathering`; terminal/station ⇒ `transport/transit/civic/public_access`; class A/B ⇒ `enterable`; class D ⇒ `backdrop`. Parks ⇒ `public_space, public_access, social_gathering`. Interiors inherit + specialize by id family. **Extending the world = extending the rule table with a test** — the registry never grows a second parallel vocabulary.

## 4. Queries (implemented, tested against real data)

| Ask | Answer |
|---|---|
| `building(id) / interior(id) / park(id) / street(id)` | typed record or null |
| `interiorOfBuilding(bldgId)` | its main interior |
| `placePoint(id)` | entrance if declared, else footprint/bbox/shell center (tested: `KTN-01` resolves to its x −30 door) |
| `buildingAt(x,z) / parkAt(x,z)` | containment (footprint-exact) |
| `findPlaces({tags, nearX, nearZ, maxRadius, limit})` | nearest-first, stable ties — "somewhere that serves food" finds ROS-01 + BODEGA-INT from the cart corner |
| `validateCrossRefs()` / `issues` | integrity report (below) |

## 5. Cross-reference integrity (the runtime half of the mjs gate)

Checks enforced at load — and pinned green in tests:
1. id grammar on buildings/interiors/parks (`BAD_ID`);
2. interiors → buildings exist; **below-grade interiors exempt** (MEZZ-INT's compound `SUB-01/SUB-02` reference is legal by the same rule the shipped gate uses — station mezzanines span structures);
3. anchors inside their shells (`facade` anchors exempt — the documented bay-mouth exception);
4. intersection streets + corner buildings resolve;
5. parks' npcZones resolve;
6. everything inside `bounds.world`.

The construction-only geometry checks (building-vs-building overlap, road clearance, shipped-fidelity values) REMAIN in `scripts/design/validate-registry.mjs` — different depth, same document, both gates run in CI. Division of labor: **mjs guards construction; TS guards runtime.**

## 6. How narrative & gameplay consume places (the no-coordinates law)

1. A requester (story beat, NPC plan, diary entry) states REQUIREMENTS: tags, proximity, operating hours ([12]), accessibility (future).
2. `findPlaces` resolves candidates deterministically.
3. `placePoint` turns the choice into a door to walk to.
4. The narrative validator ([10]) confirms attendance feasibility; the fallback planner ([10]) relocates/cancels on failure.

Authors never write coordinates, never invent ids: an unknown id is `PLACE_MISSING` at validation, and the reference world's alias table ([13]) is the sanctioned way to name what the registry cannot point at yet (off-map homes, pending shells).

## 7. Deferred to Workstream A (contracted in [03] §3)

Movement graph — **IMPLEMENTED 2026-11-06 (Phase 3 A-1: `sim/nav/`, status ledger in [03] §6)**. Runtime geometry loading from the registry (the A-3 flip, DEC-4) and multi-district topology remain deferred. Access control — **IMPLEMENTED 2026-11-06 (Phase 3 A-2: `sim/nav/access.ts`)**: the `PLACE_INACCESSIBLE` code has its real reachability function (`REACHABLE / PLACE_MISSING / PLACE_INACCESSIBLE / NO_ROUTE`), doors are the `door:<id>` arbitration resources with a four-state model, and a locked door is not an edge in the movement graph.
