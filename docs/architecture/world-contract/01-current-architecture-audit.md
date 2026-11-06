# 01 — Current Architecture Audit

| | |
|---|---|
| Status | Complete (audited against actual code at `main` @ 447b0e1, 2026-11-06) |
| Auditor | Technical Architecture Agent (the World Contract assignment) |
| Companion | [02-target-world-architecture.md](02-target-world-architecture.md) |

Every claim below was verified by reading the source. File references are exact. The status vocabulary: **Implemented** (usable today), **Mod** (implemented, requires modification), **Partial** (partially implemented), **Missing**, **N/A now** (not currently necessary).

---

## 1. Application entry points & initialization

- `web-three/index.html` → `src/main.ts` → `new Game(container)` — 17 lines, one error banner. **Implemented.**
- `src/game/Game.ts` (2,637 lines) is the orchestrator: constructs state, world, camera, UI, input, court, arrival; owns the frame loop (`Game.frame`, line 432) with a fixed order: tweens → arrival → input → world dynamics → far-world drain → player → zones → notes → camera → ambient → story timers. **Implemented.**
- Risk: `Game` is a god-object. Story choreography, effect application, actor walking, postcards, and the familiarity system all live here. It works, it is tested, and this contract does NOT rewrite it (directive rule 5) — the workstreams extend it through the seams defined in [14](14-agent-development-framework.md).

## 2. World & environment architecture

- `src/world/World.ts` (6,547 lines) builds the entire district in code: Kestrel Street block (W1), Juniper/Sycamore faces (W2–W3), district props and interiors (W4–W5), laundromat, barber, pizza, bakery, records, hall, diner, Cecil room, court, park, subway, Times Square, backdrops. **Implemented.**
- District visibility: baked meshes bucketed into a `c{col}r{row}` grid (24 cols × 12 rows), ring-lit around the player (`updateDistricts`, line 411). **Implemented.**
- Shadow economy: sun box follows the player on a light-space texel lattice (`updateSunFollow`, line 434); underground shrink on the dollhouse flip. **Implemented.**
- Risk: World.ts is a monolith. Geometry is hardcoded to the registry's numbers (comment-provenance: "every footprint from world-registry.json"), which is correct today but unenforced at build time beyond `scripts/design/validate-registry.mjs`'s fidelity table. The registry→code linkage is by discipline, not by loader. **Partial** — see [07](07-spatial-semantic-registry.md).

## 3. Rendering & scene management

- One `THREE.Scene`; baked statics merged via `bakeStatics`/`fuseFlatParts`; `MeshLambertMaterial` palette bank; sign atlas (`world/signAtlas.ts`); furniture GLB upgrades behind the costume law (`world/furniture.ts`, `World.upgradeFurnitureWithGLB`). **Implemented.**
- Perf posture: measured baselines in the registry (`performance.measuredBaseline`), 321 drawables at rest (probe-census), `?fx=off` test affordance, `shadowLaw.ts` half-widths. **Implemented.**

## 4. Player movement & collision

- `src/player/Player.ts` (173 lines): capsule walker, camera-relative steering, ladders, sit. `src/engine/collide.ts` (347 lines): AABB axis-resolve (X→Z→Y), 1 mm skin gap, substepped sweeps, capsule-vs-box and circle-vs-rect primitives. **Implemented, tested** (wall-slide, stairs, solidity tests).
- Status classification for the sim layer: the capsule is the spatial truth for the player's body; the world state stores a *logical* location separately (a bench is `PRK-CORNER`, not `x=…`) — the mapping between them is a Workstream A/D integration item.

## 5. Roads, sidewalks & navigation

- Streets are authored geometry per the registry (5 streets: Kestrel/Juniper/Sycamore/Gable/Marlow). Walkers follow **authored loops** (arrays of XZ points) with Yuka steering on top (`world/peds.ts`); the taxi is a rail mover at lane z=−2 (`engine/traffic.ts` pure math); the M121 bus has authored legs (`engine/busRoute.ts` buildM121). Ground-Y discipline: road rects vs walk slabs (`groundY`, peds.ts line 65). **Implemented for the shipped block.**
- Missing for the open world: a queryable pedestrian/vehicle graph (intersections as nodes, lanes as edges). The registry records routes as prose strings (`routes.pedestrian[0].way`), not geometry. **Partial** — Workstream A owns the graph; [03](03-world-topology-contract.md) defines its contract.

## 6. Traffic & vehicles

- One taxi (pure-function yield/brake/nose-limit math, `engine/traffic.ts` — unit-tested), one bus with zone courtesy, parked cars as colliders. **Implemented for one lane.**
- Missing: multi-vehicle lanes, parking state, car ownership. **N/A now** beyond the contract ([08](08-simulation-and-npc-contract.md) reserves VehicleState).

## 7. Pedestrian AI & Yuka integration

- Yuka 0.7.8 supplies `FollowPathBehavior` + `ObstacleAvoidanceBehavior` + `SeparationBehavior` for ambient walkers; the named cast (Rosa, Idris, the kid, Sal, the stranger, the familiar face) is authored tween choreography — deliberately NOT Yuka ("their moves are story beats, not emergent behaviour", peds.ts header). **Implemented, do not replace (directive rule 2).**
- Solids: pairwise pedestrian resolution, player-king rule, cab-footprint push-out, per-walker loop-bbox clamp bands, anti-stuck law (B17), brush law with cooldown (B16). **Implemented, heavily tested** (crowd, shuffle tests).
- Routines: `RoutineStop` beats (dwell/faceTo) round-robin per lap; street schedule shifts (street/park/dusk roles, `dressing.ts STREET_PLAN`) with home/park mechanism. **Implemented (M4 shipped).**
- Missing: schedules keyed to the in-game clock (they are keyed to story phase today), cross-block routes, and an arbitration layer above steering. That is Foundation D — [09](09-npc-behavior-arbitration.md).

## 8. NPC identity & state

- **The gap.** Named cast exist as scene-graph groups + ad-hoc Game fields (`this.kid`, `strangerAtCart` booleans…). Ambient walkers are ephemeral (seeded, untracked). There is no persistent NpcState anywhere; nothing can answer "where is Idris at 15:00 on a Tuesday in March." **Missing** — implemented by this contract in `sim/entities.ts` (data) without touching the cast code.

## 9. NPC routines & schedules

- As above: mechanism exists (RoutineStop + STREET_PLAN), clock-keyed schedule model does not. **Partial** → `sim/schedule.ts` provides the resolution contract; wiring the shipped walkers to it is Workstream B's first task.

## 10. Interaction & dialogue systems

- `game/interactions.ts` (105 lines): the InteractionRegistry — declarative records (`id/pos/enabled/prompt/perform`), one nearest() pass per frame, allocation-free. `game/interactionDefs.ts` (797 lines): authored set (ported 1:1) + free-roam set. Order conversations are `OrderCard` state machines in GameState. Memory lines, day-keyed rotation (`byDay`), confirm-gate pattern. **Implemented, exemplary — this is the paved path the contracts extend.**

## 11. In-game time & world events

- Time is a **day counter** (GameState.day, MAX_DAY 4) plus a dusk flag and Game-owned timers (brew, wash, fade). There is NO hour-of-day, NO calendar, NO tick. Skyline windows and street schedules key off story phase. **Partial** — the 4-day story needs exactly this; the open world needs the clock. → `sim/clock.ts` (implemented here), integration by Workstream D.
- World events: none as records (the diary/flyer/window systems are day-keyed content tables). → `WorldEventRecord` implemented here; recorder wiring deferred.

## 12. Buildings & interiors

- W5 interiors: `InteriorHandle` (near/far glass, duck towers, y-band isolation) with 11 registry interiors; Cecil room on the second floor; interior glass law (B13). **Implemented.**
- Registry shells ↔ code numbers match (mjs gate pins 12 masses, 18 anchors). **Implemented.**
- Missing: interior REGISTRY as runtime data (shells are re-hardcoded in World.ts). The TS registry loader (`sim/registry.ts`) now makes them queryable; geometry still loads from code. **Partial.**

## 13. Businesses & economic systems

- Money exists with honest math: START_MONEY 87, `earn/spend` Effects, confirm-gated purchases ($15 awning, $10 stool, $10 permit, $3.50 slice, $5 cup, barber/hot-dog/records prices in content.ts), shelf stock, replay protection ("a replay never pays twice"). **Implemented as story state.**
- Missing: businesses as entities (hours, premises, staff), transactions as records, faucet/sink accounting. The E2E pins the money math ($87 → $112), which is exactly the evidence the economy contract needs — **no invented prices** (directive rule 17). → `sim/economy.ts` (implemented), integration deferred to Workstream D.

## 14. Persistence & save/load

- Save v1 (`core/Save.ts`, 243 lines): localStorage, day-boundary snapshots, day 1 never writes, corrupt → fresh (never a crash), OPTIONAL trailing fields for v1-compat evolution, clamped/cleaned parsing. **Implemented, tested — the house save law.**
- Missing: world-scale persistence (people, businesses, ledger, clock). → `sim/state.ts` WorldSaveDocument v1 (implemented), key-namespaced beside the story save, additive migration rules documented in [05](05-global-simulation-state-contract.md).

## 15. Content & asset management

- Props are procedural factory functions (`world/props.ts` streetAssets); 141-model ABO furniture pack with curated manifest (`docs/data/abo-curated.json`, repo_path on every entry) + byte-identical slot copies pinned by test; GLB costume law (missing file keeps the procedural look, one console.info, no retries); signAtlas canvas textures. **Implemented.**
- Missing: a unified content manifest contract. → `sim/content.ts` (implemented), ContentEntry/validateManifest, ABO pack validated through it in tests.

## 16. Existing tests & performance constraints

- 51 test files / **718 tests, all green** (was 605 + 2 failing before this contract — see §17). Vitest, node environment, no THREE needed for the state/registry layers (the seams are pure). E2E: 4-day driver (`scripts/e2e.mjs`, ~535 s, real input). Probes: 60+ `probe-*.mjs` in-engine harnesses. Perf budget: registry `performance` section + docs/07 (the 4 GB Windows laptop is the floor). **Implemented.**
- Constraint honored: the entire sim layer added here runs headless (no THREE, no DOM) and adds ~40 KB of source; nothing in the render loop changes.

## 17. Current architecture migration work

- The registry (`docs/data/world-registry.json` + mjs validator) IS the master world plan (W0–W5 phases, docs/39–45 lineage, now docs/narrative/04). **Implemented.**
- The narrative reboot (commit 447b0e1) cleared legacy design docs and shipped the canon bible `docs/narrative/00–15`. Its R0 (PRIORITY-0 — re-point the hygiene guard) was **assigned to building agents and is done in this pass** (`tests/docs-hygiene.test.ts` now guards the bible's existence instead of reading deleted docs).
- Pre-existing failures at audit time: exactly 2 (`docs-hygiene.test.ts` cases 3–4, ENOENT on `docs/09…`/`docs/57…`). Root cause: the doc cleanup did not update its own guard. Disposition: fixed via the narrative spec's own prescription. **Now 718/718.**
- Stale references remaining (documented, not fixed here — outside this assignment's scope): AGENTS.md still cites `docs/06-production-roadmap.md`, `docs/50…`, `docs/51…` in prose while those files no longer exist; the two passing hygiene cases still assert AGENTS.md names them. **Unresolved** — flagged for the human lead: either restore pointer docs or re-point AGENTS.md §0/§3.

## 18. Duplicated responsibilities & fragile interfaces found

1. **Positions in two places** — registry JSON numbers and World.ts literals (mitigated by the fidelity gate; still a manual sync). Risk: medium. Contract answer: [07] makes the registry runtime-queryable; code remains the geometry source until Workstream A flips it deliberately.
2. **Story state scattered across Game fields** (`strangerAtCart`, `familiar` stage…). These are story-choreography state, not sim state; the ownership table ([05] §2) assigns them to the narrative layer explicitly so they never masquerade as world truth.
3. **Day-keyed content tables** (`FLYER_SLIPS`, `HALL_NOTICES`, `byDay`) — deterministic and fine for the block; the open world replaces `day` with `clock.day` through the same seam.
4. **No circular imports found** — Game→World→props flow is one-way; interactions type-import Game only ("no runtime cycle", interactions.ts line 34). The sim layer preserves this: `sim/*` imports nothing from `game/` or `world/` except the registry JSON.

---

## Verdict

The shipped slice is coherent, tested, and honest about its limits. The four real gaps for an open-world life sim are: **no clock, no persistent people, no arbitration, no world-scale save**. Each is implemented as a contract + tests in this pass, each without touching a working system, and each with a named workstream to carry it forward.
