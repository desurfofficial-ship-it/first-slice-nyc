# 35 — Character-Quality Pass (Agent 2: player & character polish)

**Date:** 2026-10-30 · **Branch:** `agent2-character-polish` (based on `eed8e64`, camera round eight)
**Scope:** visual quality, movement, animation, personality and presentation of the player and existing NPCs. Parallel-work safe: no story, economy, calendar, UI, controls or quest logic changed.

---

## 1. Audit (written before any change)

### Architecture

| Concern | File | Notes |
| --- | --- | --- |
| One articulated low-poly person (boots→legs→torso→arms→hands→head+hair) | `web-three/src/world/personRig.ts` | ~1.72 m, facing +Z; named pivots in `group.userData.rig`; DOM-free, unit-tested |
| The ONLY animation writer | `updatePersonAnim()` in the same file | Measures each body's own per-frame position delta → any mover (player capsule, Rosa tweens, kid follow, Yuka walkers) gets a walk cycle for free |
| Modes | `auto` / `climb` / `sweep` / `wave` / `sit` | Story beats keep authored control; auto covers everyone else |
| Player visual | `Game.ts` `playerVisual` | Built via `World.buildPerson`; capsule (`Player.ts`) is authoritative; visual synced per frame |
| Named cast | `World.ts` `spawnActor` | Rosa (coral, silver bun), Idris (plum, cap), kid (0.78 scale, window silhouette + ground twin), Sal (teal, laundry), stranger (green, duffel) |
| Ambient walkers | `world/peds.ts` | Yuka `FollowPathBehavior` + obstacle avoidance + separation; 3 seeded loops; bank-shared materials |
| Materials | `World.mat()` → `MeshLambertMaterial` | Already matte — no "shiny plastic" problem to fix; peds use the shared `MatBank` |
| Lighting | `HemisphereLight` + amber `DirectionalLight` | Consistent; PCFSoft shadows; characters cast into the scene correctly |
| Camera | `GameCamera.ts` (round eight, HEAD) | Not touched in this pass — main agent's active lane |

### Defects found (evidence first)

1. **Foot slide, all walkers.** The auto walk cycle used a fixed cadence (`WALK_RATE 11`) and fixed max swing. Measured with a live probe (`probe-characters.mjs`: real displacement vs steps × stride `2·0.78·sin(peak hip swing)`):
   - Player at speed: **27.8 % of travel is skating** (real 5.46 m vs feet-coverage 3.94 m over the same 2 s window).
   - Analytically worse for slower walkers: Rosa's 2.0 m/s tween covered ≈ 60 % of her travel; Yuka pedestrians at ~1.1 m/s ≈ 47 %. Everyone glided; the fastest mover skated least.
2. **Turning had no body language.** `playerVisual.rotation.y` tracks the (already lerped) capsule yaw, but the body itself never leaned — corners looked like a sprite rotating.
3. **Interactions faced the wrong way.** `spawnCustomer` never set a heading; every Day-3/4 customer spawned at (4, −4.6) staring north at the street while ordering from a cart that sits **south** of them at (4, −6.6). Screenshot `before-E` shows the back-of-head order.
4. **The kid froze on his last walking heading** when he reached your hip (`updateKidFollow` only wrote rotation while walking).
5. **Silhouettes were one rectangle.** Player = bare gold box (no accessories), Rosa = coral box (identity lived only in color+bun), Idris was hidden until Day 2 with no face detail, Sal unreadable behind his counter, pedestrians were clones (same height, same boots).
6. **Idle was a metronome.** Single-sine head scan (`sin(t·0.6)·0.3`) looped audibly; no weight shift.

### What was deliberately NOT rebuilt

The rig, the modes, the tween choreography, the dialogue/quest systems, the Yuka integration, controls, camera — the assignment is polish within the established architecture, and the architecture is sound (one animation choke-point is exactly why the fixes below were cheap).

---

## 2. Changes

### `personRig.ts` — the walk now belongs to the feet

- **Speed-matched stride & cadence.** `stride(v) = 0.24·min(v,4.6) + 0.42` m per step; hip swing = the angle that geometrically covers that stride on a 0.78 m leg (clamped 0.74 rad); cadence = `v·π / strideEff` (clamped 13 rad/s). Result: feet plant where the body is at every speed — player, Rosa, kid and walkers inherit the fix from the one function they all move through. The cycle eases in/out (`gate = min(1, s·6)`) instead of popping between parked and striding.
- **Bank into turns.** Measured yaw rate (wrapped, per-frame) → clamped ±0.12 rad body roll on `root.rotation.z`, filtered at `dt·8`. A story-tween reface reads as a wheel-around, not a glitch. Bank is zeroed in climb/sweep/wave/sit so no mode leaks a stale roll.
- **Idle life.** Slow weight shift (`body.rotation.z = sin(t·0.4)·0.016`), keep the breathe, and a layered head scan (`sin(t·0.6)·0.26 + sin(t·1.57)·0.07`) that never visibly loops.
- **Arms** counter the legs at ¾ of hip swing (was a separate fixed constant that no longer matched the new stride).

### `personRig.ts` — optional look fields (same boxes, zero new geometry families)

`PersonLook` gains `shoe?`, `strap?`, `shawl?`, `glasses?`, `scale?` — all default to today's behavior (`shoe` defaults to `PAL.ink`, `scale` to 1), so existing unit tests and callers are untouched.

### Cast identities (call sites only add fields to existing literals)

| Who | Change | Why |
| --- | --- | --- |
| **Player** (`Game.ts`) | cream sneakers `0xece5d8` + messenger strap & side satchel `0x6e4a2f` (strap wraps front AND back — the camera lives behind him) | "Everyday NY courier" silhouette; recognizable from any angle, not just the front |
| **Rosa** (`World.ts`) | dusty-mauve shawl `0x7a5c68` over the coral jacket | The block's abuela reads instantly, even mid-block |
| **Idris** (`World.ts` + his Day-3 customer twin in `Game.ts`) | dark glasses bar `0x1c1a20` | Cap + plum + glasses = deliberate identity; works at iso distance |
| **Sal** (`World.ts`) | glasses | Grey-haired shopkeeper behind the laundry counter |
| **The kid** (`World.ts`) | red sneakers `0xc0392b` | Age-appropriate, and his feet read against grey pavement |
| **Pedestrians** (`World.ts`) | heights 1.05 / 0.95 / 1.09, commuter gets brown shoes | Variation without randomness — three deliberate neighbors, still bank-shared materials |

### Interactions

- **Customers face the cart** (`g.rotation.y = Math.PI` in `spawnCustomer`); Idris's walk-in tween re-faces him along his route, so nothing fights the choreography.
- **The kid eases around to face you** when parked at your hip (`lerpAngle`, `dt·4`) instead of freezing mid-heading.
- Rig bank makes *every* walker lean into corners — Rosa's route, the kid's follow and the Yuka loops all gain the same body language for free.

---

## 3. Evidence

### Foot-slide metric (probe-characters.mjs, same window, same motion)

| | real travel | steps taken | peak hip swing | feet coverage | **slide** |
| --- | --- | --- | --- | --- | --- |
| before | 5.46 m | 4.6 | 0.588 rad | 3.94 m | **27.8 %** |
| after | 5.46 m | 5.2 | 0.715 rad | 5.31 m | **2.7 %** |

The residual 2.7 % is the ramp-in frames where stride is still lengthening from a standstill — correct behavior, not a defect.

### Performance (renderer.info, identical boot state)

| | draw calls | triangles | scene meshes |
| --- | --- | --- | --- |
| before | 358 | 17,632 | 488 |
| after | 367 | 17,740 | 494 |

+9 draw calls / +108 triangles for the entire cast-dressing pass (accessory boxes; materials all come from the existing `mat()` factory and the pedestrians' shared bank — no per-pedestrian materials). Unit price of identity: ~0.6 % draw calls.

### Before/after screenshots

`web-three/shots/characters/{before,after}-*.png` (A player idle + Rosa, B mid-stride, C Rosa close, D pedestrian, E cart service, F Idris close) — captured at the mobile-portrait viewport (720×1280) the game actually ships in. The E pair shows the customer-facing fix; the F pair shows Idris's glasses; the A/B pairs show strap, sneakers, shawl and the longer planted stride.

---

## 4. Files modified

- `web-three/src/world/personRig.ts` — stride/cadence math, turn bank, idle life, optional look fields (core of the pass)
- `web-three/src/world/peds.ts` — `PedLook extends PersonLook`, look passed through whole (schema only)
- `web-three/src/world/World.ts` — four cast look literals + pedestrian looks (fields only, no logic)
- `web-three/src/game/Game.ts` — player look fields; customer facing (1 line + comment); kid face-when-idle (3 lines); `lerpAngle` import
- `web-three/scripts/probe-characters.mjs` — NEW probe (before/after evidence + slide metric + perf snapshot)
- `web-three/tests/rig.test.ts` — **unchanged** (all 125 existing tests pass untouched)

## 5. Tests executed

- `tsc --noEmit` — clean
- `vitest run` — **125/125 pass** (rig behavior tests intact without edits: counter-swing, counter-arms, bob/lean, no-snap build-up, parked pose, teleport guard, climb/sweep/wave modes)
- `vite build` — clean
- `probe-characters.mjs` — 0 page errors; slide metric above; screenshots captured
- Full `e2e.mjs` battery, twice — once with this pass, once on a **pristine `eed8e64`** (changes stashed, rebuilt): **identical failure sets** (59 checks fail in both; the only name-level differences are positional jitter inside the log strings, e.g. ladder grabs pass in both with ±0.1 m snapshots). Zero console errors in both runs. The 59-fail state is the environment amplifying the day-4 cluster + two timing races already documented in docs/29 round eight under a newer Playwright chromium (156 vs the browser used for the 16-fail baseline) — it exists WITHOUT this pass, so the pass ships with **zero new failures**. Live confirmation of the new stride in the driver log: `walk cycle swings the hips while moving (max |hipL|=0.738)` — the check passes and the amplitude lands exactly on the new 0.74 rad clamp.

## 6. Integration notes for the main agent

- Everything is additive/optional: `PersonLook`'s new fields default to previous behavior; `buildArticulatedPerson` callers that don't opt in see nothing but the new walk math (which is strictly closer to feet-on-ground).
- Shared-file touches are minimal and listed in §4; if the lead is mid-refactor of `Game.ts` customers or `updateKidFollow`, the only lines to preserve are: `g.rotation.y = Math.PI` (customer faces cart), the `else if (dist > 0.5)` face-player branch, and the player look fields.
- **Proposed, not implemented (needs coordination):** ① head/eye tracking toward the conversation partner while talking (needs a `lookTarget` setter called from the dialogue funnel); ② a 150 ms scale-pop when the cup changes hands; ③ customers walking in from the crosswalk instead of spawning at the cart. All three are small; none block anything.
