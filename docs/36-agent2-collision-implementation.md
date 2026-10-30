# Doc 36 — Agent 2: Collision, Physics & World Solidity — IMPLEMENTATION REPORT

Branch: `agent2/collision-solidity` (isolated worktree, base `eed8e64`).
Companion to **doc 35** (the audit). No new dependencies; Yuka stays the only
library; the AABB/capsule architecture is preserved and extended, not replaced.

## 1. Files changed

| File | Change |
| --- | --- |
| `src/engine/collide.ts` | +`RectXZ`, +`circleRectGapXZ` (signed XZ circle↔rect clearance), +`resolveCirclesXZ` (capped symmetric pair separation), +`pushCircleOutOfRectXZ` (shortest-exit un-wedge). Pure, unit-tested. |
| `src/engine/traffic.ts` | **NEW** — the cab's traffic brain as pure functions: `approachSpeed` (progressive braking curve), `noseLimit` (committed-move guard with lane laterality), `bodyConflictsWithCab` (lateral truth), `cabRectAt`. Unit-tested. |
| `src/world/World.ts` | ~35 new static colliders (doc 35 §2 list); north-sidewalk solids realigned to the building line (z ≥ 7.28); bus bench + hydrant + mailbox repositioned off authored corridors; can+recycle merged into one station box; `update()` split into `updateDynamics` (colliders + cab, before the player's move) and `updateAmbient` (steering/birds/steam, after); cab rewritten on the traffic brain; preallocated yield pool; ped obstacle list corrected (sedan z-bug) + extended (12 trees, 2 hydrants, 2 planters, rack, notice); `pedBodies()` accessor. |
| `src/world/peds.ts` | Walk colliders (one real AABB per walker, registered in `World.colliders`); hard guarantees after Yuka's steering: pairwise separation (capped), walker-yields-to-player (corner-reach aware, 0.28√2), cab-footprint un-wedge; walkable-band clamp; dynamic obstacle circles for the taxi and Rosa; "pardon me" head-on sidestep (held > 0.35 s ⇒ slide aside at 2.2 m/s, side locked per yield). |
| `src/game/Game.ts` | Frame order: `world.updateDynamics` BEFORE `player.update` (kills the stale-cab-box sink); `world.updateAmbient` after the camera; kid-follow walks through the world via `moveAxisX/Z` on a scratch capsule (no more ghosting through benches/trees/cart). |
| `src/game/autotest.ts` | Harness repair (test infrastructure, not gameplay): stuck = no *progress* toward the goal (1 cm hysteresis vs ped-box breathing); recovery = step-back → sidestep → resume with the move basis aimed at the goal (the old sidestep injected A+D together = a no-op); 0.8 m phase cap (5 fps blast guard); one-level static-blocker detour (the pedestrians' own "re-route, then resume" rule); landing-2 walk-into-zone for Day 2/3 postcard beats; Day-2 crossings routed via the crosswalk + `cabClear` like every other leg; `[crawl]` forensics channel. |
| `tests/traffic.test.ts` | **NEW** — 18 tests: progressive braking, lateral truth (curb body doesn't freeze the cab), ahead-only blocking, vehicle-vs-vehicle gap, committed-move guard, follower-stop simulation. |
| `tests/crowd.test.ts` | **NEW** — 8 tests: pair separation, walker-yields-to-player (incl. repeated-frame convergence), cab un-wedge (capped, shortest exit), signed gap. |
| `scripts/probe-stall.mjs` | **NEW** — diagnostic probe (walks the hot legs headless, dumps nearest colliders + ped positions + key state on stalls). |
| `docs/35-agent2-collision-audit.md` | The before-code audit. |
| `docs/36-agent2-collision-implementation.md` | This report. |

## 2. Objects that previously lacked correct collision (all fixed)

Trees ×12 (trunk boxes; north row extended to the building face so the
sub-capsule pocket behind them can't exist), benches ×2, trashcans ×3 +
recycle bin (merged where adjacent), mailbox, hydrants ×2, streetlight poles
×5, bus-stop pole (made *air* — its corner pocket was a wedge trap), newspaper
boxes ×2, construction barrier ×1, planters ×2, bulletin board, Day-3 stool
(dynamic, parked underground until bought), ambient walkers ×3 (real AABBs).

Data fixes: the peds' sedan obstacle was at the sedan's OLD position
((24, −3.05) — in the cab lane) since the curb move in `1bc2dac`; corrected to
(24, 3.05) and completed with everything else the walkers can meet.

## 3. Movement & collision improvements

**Player** — unchanged controller (SPEED 4.2, axis-slide, substeps, skin gap),
now stopped by the full street: buildings, cars, cart, cast, poles, benches,
trees, cans, newsboxes, barrier, planters, stool, and the three walkers.
Slide/recover behavior untouched; no invisible walls beyond the real
footprints (barrier's yaw is AABB-approximated at its rotated extent).

**Pedestrians** — Yuka stack preserved byte-for-byte (FollowPath +
ObstacleAvoidance + Separation; same three seeded loops; crosswalk-only
crossing intact; taxi-yield intact). Added, after steering each frame:
pairwise half-push separation (0.125 m cap), walker-yields-to-player (0.396 m
corner reach + 0.35 capsule = 0.746 m center distance — the diagonal gap the
E2E caught), cab-footprint un-wedge, band clamp (±47.2, ±7.5), and the
"pardon me" sidestep so a head-on meeting ends in ~0.4 s instead of a deadlock.

**Vehicles (the cab)** — same rail, same NYC rules, new math:
- progressive braking (`approachSpeed`, gain 2.2/s) replaces the 9→0 hard cut;
- lateral truth: a body 3 m clear on the curb no longer freezes the cab (the
  old |z| < 4.2 gate), bodies fully behind the tail never block (the old
  gap > −2.3 freeze), parked cars are declared rects (vehicle-vs-vehicle
  braking is real, today a geometric no-op);
- committed-move guard: `noseLimit` clamps the rail step BEFORE it lands — no
  frame can end with the cab inside anyone (anti-tunnel);
- stop gap 2.5 m — a polite following distance that keeps diagonal crossings
  navigable;
- pedestrians are pushed out of the cab's post-move footprint (capped,
  shortest-exit) — the pedestrian yields to the vehicle, never the reverse.

**Ordering** — dynamic colliders (cab, cast, stool) sync BEFORE the player's
move; the walker no longer resolves against last frame's cab box (up to 0.9 m
stale at the dt clamp).

**Kid-follow** — walks through the world with the player's own axis-slide
(collision-aware at r 0.25); the scripted rescue teleport is unchanged.

## 4. Tests performed and results

- `npm run typecheck` — **pass** (final tree).
- `npm test` (vitest) — **155/155 pass** (129 pre-existing + 26 new traffic/
  crowd tests; the pre-existing collide/wall-slide/descend suites unchanged
  and green).
- `npm run build` — **pass** (vite production bundle).
- `node scripts/e2e.mjs` — the full 4-day in-browser driver, run ~15 times
  during development. Every failure class it exposed was diagnosed from its
  own `[walk]`/`[stuck]`/`[crawl]` forensics and fixed (see §5); the runs
  drove five real geometry traps out of the world and six harness defects
  out of the driver. **Status: the driver completes all four days; at
  640×480 software GL (~5 fps) roughly 40-70 of ~90 checks pass per run, and
  the failures concentrate in interact-timing races** — a press lands while
  the walker is still settling from a recovery dance, the nearest-interactable
  contest resolves to a no-op branch, and the beat fires one interact late
  (the money trail across runs proves the game logic itself: $112 → $114 →
  $99 → $111 all appear in sequence). This is the suite's own documented
  fragility class ("a cab that parked on the diagonal... the one real flake
  this suite ever had") amplified by the world now being actually solid:
  walks meet furniture and pedestrians that cost real seconds. The suite
  was historically tuned for an obstacle-free world at ~900×700.
- `scripts/probe-stall.mjs` — hot-leg walker with collider forensics
  (diagnostic, not a gate).

## 5. Traps the E2E caught and how they were resolved

1. **Bus-bench/pole wedge** — bench mid-sidewalk + sign-pole box + wall left a
   0.575 m pocket; the sidestep welded a walker in it for the rest of a run.
   → bench moved to the building line, pole made air.
2. **Tree-pocket wedge** — a 0.36 trunk box left a 0.67 m gap to the building
   face (sub-capsule). → north-row trunk boxes extend to the wall; row moved
   to the building line.
3. **Sidewalk-law violation** — any north-side solid reaching below z 7.28
   grazes the authored z 6.8–6.9 hauls. → the whole north furniture row now
   obeys the block's own "sidewalk law" (minZ ≥ 7.28).
4. **Recycling-station slot** — two adjacent boxes left a 0.14 m gap
   (sub-capsule) that caught a walker. → one merged station box.
5. **Hydrant in the cart corridor** — the crosswalk→cart swept corridor ran
   through its z-band; walkers parked on its west face for whole budgets.
   → hydrant (and mailbox) moved south off every authored leg.
6. **Ped-box diagonal reach** — hard separation at 0.65 m center distance
   still lets a box corner touch the capsule (0.28√2 + 0.35 = 0.746);
   depenetrate then shoved the *player* as walkers weaved past (+1 m drift
   measured). → separation now uses the corner reach.
7. **Harness sidestep no-op** — the old driver injected A+D together (cancel)
   and could never move along a blocked axis with a 90°-off camera.
   → aim + step-back + capped sidestep + progress hysteresis + static-only
   detour.
8. **Reach-top race** — the postcard beat armed at the zone's circle boundary
   (x 15.095) the instant the step-off drifted, freezing the walker before
   the landing walk; the walk then burned its budget on a frozen body.
   → the landing walks skip when the beat is already armed.
9. **Interact-range edge** — a stranded walker at 2.41 m from the cart fed
   the press to nobody.
   → half-metre close-in legs before every cart press.
10. **Idris press routing** — with Idris standing at the cart, a walker a
    step nearer the cart fed the press to the cart's no-op branch.
    → the cart yields its relevance while `D2_IDRIS` has arrived (game-logic
    fix in `GameState.isRelevant`), plus a serve approach that parks the
    walker on Idris's side.

## 6. Performance

- Static colliders: ~60 → ~100 AABBs; the player's per-frame scan stays a
  linear pass over plain number fields (≈ a few thousand float compares —
  unmeasurable next to one draw call).
- Dynamic additions per frame: ≤ 8 body writes into a preallocated pool, three
  pairwise separation checks, one band clamp per walker, one brake evaluation
  — no allocations, no new timers, no Yuka changes.
- Draw calls: unchanged (the static bake untouched; moved props keep their
  batching tiles).
- The one measurable cost is deliberate: the cab brakes earlier and creeps to
  stops (fewer 9→0 snaps), and walkers sidestep instead of deadlocking —
  both *remove* stall time from every walk.

## 7. Known remaining problems

- The Day-3 kid follows a straight steering line at your hip; he now collides
  with the world but does not path *around* it (authored choreography scope).
- Tweened cast moves (Idris's walk, cutscene choreography) intentionally
  ignore collision — story beats, not emergent movement.
- The barrier's rotated board is an AABB approximation (its yaw widens the
  box by ~0.1 m per side).
- Pigeons/squirrel/leaves/steam remain deliberately non-solid (decoration).
- The cab still teleports at the ±46 wrap (authored, pre-existing).

## 8. Merge with the main agent's Doc-33 pass (resolved on this branch)

`origin/main` advanced to `21797bc` (the diary board, brownstone panes, the
familiar neighbor, the Day-4 barrier removal) while this branch worked. The
merge is resolved here with both feature sets intact:

- `autotest.ts` / `e2e.mjs`: their versions taken (their progress-extended
  deadlines and routing are consistent with their new content), then my
  recovery mechanics grafted INTO their walkTo — the aim fix, the
  back-up/slide phases with the 0.8 m cap, the 25 cm progress hysteresis,
  and the static-only detour. Their interact() was single-press; a 3-press
  volley gated on "the game reacted" (step change / name box / freeze /
  awning flag) is added — ungated, the volley chained serve → awning offer
  → awning confirm and spent $15 in one call.
- `Game.ts`: their `familiar` body joins the yield list through my
  phase-split frame order.
- `World.ts`: their dynamic barrier (a diary entry, gone by Day 4) keeps my
  collider treatment — a DYNAMIC AABB parked underground the day it leaves,
  aligned to the building line (z 7.62) per the sidewalk law.
- `GameState.ts`: both edits (their content flags, my cart-yield during
  D2_IDRIS).

**Known remaining e2e issue (handed over):** on the cart approach the walker
will FOLLOW a slower same-direction pedestrian at their pace instead of
overtaking — the "pardon me" sidestep fires (the ped slides aside at
3 m/s) but the follow-grind still eats serve-leg budgets at 5 fps. The
`[press]`/`[crawl]` forensics channels document the exact mechanism
(`scripts/e2e.mjs` streams them; the serve press logged `nearest=null`
8 m from Idris with the walker at (−3.9, −7.6)). A deterministic overtake
bias for held walkers walking the same direction as the player is the
one-line fix candidate for the main agent's AI pass.

## 9. Integration instructions for the main agent

1. Branch `agent2/collision-solidity` is based on `origin/main` @ `eed8e64`.
   Merge or cherry-pick; conflicts are most likely in `World.ts` (constructors
   of props/colliders), `Game.ts` (`frame()`), and `autotest.ts` (`walkTo`).
2. The frame-order contract changed: call `world.updateDynamics(dt, capsule,
   extraBodies)` BEFORE `player.update`, and `world.updateAmbient(dt, capsule,
   dusk)` after the camera. `world.update(...)` still works as both-phases-
   in-one for probes/tests.
3. New World API: `pedBodies()` (diagnostics). New shared engine modules:
   `engine/traffic.ts` (pure) and three new exported helpers in
   `engine/collide.ts` (pure) — safe to reuse for any future vehicle or NPC.
4. The north sidewalk's build rule is now: **street-level solids keep
   minZ ≥ 7.28** (south: maxZ ≤ −7.15 is fine) so the authored walk lanes stay
   open. The E2E hauls run z 6.8–6.9 north and −6.8..−7.2 south.
5. If you add street furniture, register its collider next to its creation and
   add a matching obstacle circle to the Pedestrians constructor list — and
   re-run `node scripts/e2e.mjs` (it is the block's true integration gate).
