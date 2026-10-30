# 34 — Open-Source Integration Research and Implementation

**Date:** 2026-10-30 · **Scope:** `web-three/` · **Mandate:** selectively integrate
useful open-source technology (Yuka, Rapier, Ink, three.js examples, City Tour)
without replacing the engine, redesigning the UI, or rewriting working systems.

---

## 1. Audit before changing anything

The audit (2026-10-30, this session) established the following ground truth
before any dependency decision:

| System | State | Evidence |
|---|---|---|
| Engine | three r186 + TypeScript + Vite, single dependency (`three`) | `package.json` |
| Collision | Hand-rolled AABB sweep (substeps, 1 mm skin, depenetration, ground snap) tuned 1:1 to the Godot greybox oracle | `engine/collide.ts`, `player/Player.ts` |
| Camera | 3/4 follow cam with street-side auto-yaw + frozen movement reference | `camera/GameCamera.ts` |
| Movement feel bugs from playtests | Already fixed by the parallel session (camera yaw confusion, stair-descent fall, cart/NPC/Rosa pass-throughs) | dated fix comments + `tests/collide.test.ts` (125 tests, all green) |
| NPC behaviour | Named cast = authored tween choreography (story beats); ambient life = pigeons/squirrel, hand-rolled and seeded | `game/Game.ts`, `world/ambient.ts` |
| Dialogue | Typed 32-step `Effect` state machine, linear authored missions | `core/GameState.ts`, `core/content.ts` |
| Rendering | **408–789 draw calls for only ~23k triangles** — draw-call-bound, not geometry-bound | `scripts/probe-perf.mjs`, `scripts/probe-scene-census.mjs` |
| World pacing | Days are step-driven authored sequences (≈5–8 min each); economy growth gated behind permits/many days | `core/GameState.ts` |

The perf census (`probe-scene-census.mjs`, kept in the repo) showed no single
villain: 710 meshes spread across ~40 materials — a classic long tail that
merging static geometry fixes and physics engines do not.

## 2. Verdict per candidate library

### Yuka — **INTEGRATED (scoped to ambient pedestrians)**

* **Problem it solves:** the block had zero sidewalk pedestrians — pigeons and
  one squirrel, but no people. For a slice-of-life New York game that is a
  believability gap (Doc 33's "living neighborhood"), and steering is exactly
  the problem Yuka's vehicle model exists for.
* **License / maintenance:** MIT; by Mugen87 (three.js examples maintainer);
  zero dependencies; engine-agnostic. **Honest yellow flag:** last npm
  publish 2022 (v0.7.8, pinned exact). Mitigation: the API surface used is
  small, stable, and wrapped by `src/world/peds.ts` + a local type shim
  (`src/types/yuka.d.ts`) — replacing the steering stack later is a one-file
  change.
* **Integration scope:** ambient walkers ONLY. Rosa, Idris, the kid, Sal and
  the stranger keep their authored tween choreography — their movement is
  story, not emergence. The walkers are built from the same articulated
  person rig as the cast with bank-shared palette materials (no new assets,
  nothing procedurally generated, no visual slop).
* **Behaviours:** FollowPathBehavior on three sidewalk loops (a crosswalk
  commuter, a north-side window shopper, a south-side local);
  ObstacleAvoidanceBehavior around the cart, parked cars, furniture and the
  player; SeparationBehavior between walkers. Sidewalk discipline matches the
  pigeons' rule (cross only at the crosswalk), and the walkers feed World's
  existing taxi-yield list — a crossing pedestrian holds the cab at the stop
  line, reusing a system that already worked instead of adding a new one.
* **Determinism:** seeded placement (`seededRng`), same convention as the
  flocks; `?walklog`-style probes can reproduce every run.
* **Cost:** +71 kB raw / +20 kB gzip on the bundle (measured).
* **Verified:** `scripts/probe-peds.mjs` — movement, sidewalk discipline,
  crosswalk-only crossing, cart clearance, screenshot; 125/125 unit tests;
  visual-check green; zero page errors.

### three.js examples (mergeGeometries) — **INTEGRATED (static tile bake)**

* **Problem it solves (measured):** the scene was draw-call-bound — 710 draws
  / ~23k tris; a census attributed them to a long tail of hand-built static
  decoration.
* **What was built:** `World.bakeStatics()` — after construction, never-
  animated decoration merges into one mesh per (material signature, shadow
  flags, **25 m street tile**) using three's own
  `BufferGeometryUtils.mergeGeometries`. **No new dependency.**
* **Why tiles:** the first cut merged per material across the whole block and
  defeated frustum culling — the e2e driver lost real time to software
  rasterization and its timed beats started missing. Region-splitting
  restored culling exactly (probe: whole-block bake rendered 30.4k tris at
  the plaza view; tile bake 29.1k with more draws saved at spawn).
* **Safety:** explicit exclusion set — cart + wearables, the cast, the bodega
  roof (visibility toggle), GLB-upgradable props (children swapped at boot),
  trees (canopy sway), birds, leaves, steam, shelf items (removed on pickup),
  and the five story windows whose emissive materials are tweened (they share
  a signature with the plain dim windows; a merge there would light the whole
  row on one window's beat). Signs auto-exclude (canvas-textured materials).
  Geometry disposal is guarded so shared geometries survive.
* **Result (draw calls):**

| View | Before | Whole-block bake | **Tile bake (final)** |
|---|---|---|---|
| boot-spawn | 408 | 287 | **365** |
| mid-street-east | 554 | 350 | **442** |
| plaza-life | 789 | 492 | **628** |

  Final = tile bake **plus three new walkers** (+3 rigs ≈ +42 draws) — still
  −11% to −20% net vs baseline, with frustum culling intact.

### Rapier — **NOT integrated (documented decision)**

* The user-reported collision bugs (falling through cart/NPC/Rosa, stair
  descent) were already fixed in the current build — per-frame person
  colliders, cab yield logic, ladder descent dismount — and are pinned by
  tests. Rapier would add a ~1.5 MB WASM payload, an init/async seam, and a
  rewrite of the walker whose feel is tuned to the Godot oracle — replacing a
  working, tested system with a heavier one. Re-evaluate only if the game
  needs dynamic rigid bodies (knockable props etc.), which its design does
  not call for.

### Ink / inkjs — **DEFERRED (seam documented, not added)**

* Current conversations are deterministic notes and confirm prompts inside a
  typed state machine, covered by unit tests. inkjs is a runtime for compiled
  branching scripts — adding it now buys tooling for content that does not
  exist, against the "don't add a library just because it's available" rule.
* **The seam, when branching dialogue is authored:** compile `.ink` to JSON at
  build time (inkjs runtime, MIT), drive it from a new `Effect` variant
  (`{ kind: 'conversation'; lines: string[]; choice?: number }`), keep
  authoritative progress in GameState exactly as today. `core/content.ts` is
  the single file that would hand its strings over.

### City Tour — **NOT integrated (reference only)**

* A procedural whole-city generator (terrain → roads → lots → buildings).
  Direct conflict with two mandate rules: preserve handcrafted neighborhood
  layouts, no generic procedural city assets. Its value here is
  methodological only (level-of-detail discipline for far background
  geometry), which the skyline card already implements.

## 3. Architectural changes

1. `src/world/peds.ts` (new) — Yuka-driven ambient pedestrians; the only
   consumer of the `yuka` dependency.
2. `src/types/yuka.d.ts` (new) — minimal ambient types for the unpdated
   dependency; keeps the used API surface explicit.
3. `World.bakeStatics()` (new private method, called at constructor end) —
   static tile batching; no gameplay-bearing geometry is touched.
4. `World.update()` — walks join the existing taxi-yield body list (reuses
   the crosswalk/road yield logic; no new systems).
5. Diagnostics kept in the repo's probe convention: `probe-scene-census.mjs`,
   `probe-peds.mjs`, `probe-climb.mjs`, `probe-reach-top.mjs`,
   `probe-shadow-cost.mjs`.

## 4. Test-harness changes (found while verifying)

* `scripts/e2e.mjs` — optional `E2E_W`/`E2E_H` viewport env (defaults
  unchanged 900×700) and `?fx=off` in its URL. Rationale measured by
  `probe-shadow-cost.mjs`: the shadow pass is >55% of frame cost under
  SwiftShader (21 → 46 fps), and a clamped dt (0.1 s cap in the game loop)
  stretches the four-day driver past every timeout on slow machines. The
  game's gameplay asserts never read shadow state; visual fidelity stays
  covered by `visual-check.mjs`, which runs with full effects.
* `src/game/autotest.ts` — the Day-1/2/3/4 climb beats now ride the ladder to
  the rail (y > 4.2) before the lateral step-off, as the "ride to the rail"
  comment always said. The old threshold (3.6) exited mid-ladder 0.45–0.47 m
  below the landing top (4.075) — exactly the ground-snap window — so the
  dismount was a frame-timing coin flip that different machines flip
  differently. From the cap, the fall is 0.275 m: inside the snap window at
  any dt the loop can produce. This is a driver determinism fix; the game's
  physics was not touched.
* **Known environment bound:** the full four-day driver remains sensitive to
  machine load (pre-bake and post-bake runs fail identically on a loaded
  software-GL sandbox: 55 vs 59–66 failures; on a quiet machine it finishes
  in ~4 minutes). CI gates remain typecheck + unit tests + build, unchanged.

## 5. World-progression constraint compliance

* Days remain authored step sequences (~5–8 minutes each); nothing in this
  pass touches `GameState`, pacing, money, or the permit/awning/stool gates.
* Pedestrians are ambient only — they carry no progression, spend nothing,
  and never block the player's missions (no colliders; they steer around
  you).
* No business-growth or economy logic was added; the long-arc constraint
  (major change requires many in-game days) is untouched.

## 6. Dependency manifest

| Package | Version | License | Why | Cost |
|---|---|---|---|---|
| `yuka` | 0.7.8 (pinned) | MIT | Steering for ambient pedestrians | +20 kB gzip |

`three` (r186) remains the only other runtime dependency; the bake uses
`three/examples/jsm/utils/BufferGeometryUtils.js` from the existing package.

## 7. Verification trail (per integration)

1. **Bake:** typecheck ✓ · 125/125 tests ✓ · build ✓ · perf probe (numbers
   above) ✓ · scene census ✓ · visual-check (postcard signature + touch UI) ✓
   · zero page errors ✓ · e2e failure profile unchanged vs pre-bake on the
   same loaded machine (55 vs 59–66; both machine-bound) ✓
2. **Yuka peds:** typecheck ✓ · 125/125 tests ✓ · build ✓ · probe-peds
   (movement ≥15 m/18 s, sidewalk discipline, crosswalk-only crossing, cart
   clearance) ✓ · perf probe (net −11…−20% draws with peds included) ✓ ·
   visual-check ✓ · zero page errors ✓
