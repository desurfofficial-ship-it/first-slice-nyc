# Doc 35 — AGENT 2: Collision, Physics & World Solidity — Pre-Implementation Audit

*Task: "COLLISION, PHYSICS & WORLD SOLIDITY" · Audit date: 2026-10-31 · Scope: `web-three/src` as of commit `1959b66` (includes the Yuka integration pass, `1bc2dac`).*

Method: read the actual code, not the docs. Files inspected end-to-end: `engine/collide.ts` (193 L), `player/Player.ts` (137 L), `world/peds.ts` (149 L), `world/props.ts` (397 L), `world/World.ts` (1,927 L — construction, `solid()`/`deco()`, GLB seam, taxi update, person-collider sync, static bake), `game/Game.ts` (1,431 L — frame order, zones, cast movement), plus `tests/collide.test.ts`, `tests/wall-slide.test.ts`, `tests/descend.test.ts` and the `scripts/probe-*.mjs` harnesses.

---

## 1. How the world actually works today

There is **one collision list and one consumer**. `World.colliders: AABB[]` holds every solid box (built by `solid()`, which pushes a box unless `collide: false`, plus hand-pushed boxes for cars, the cart, cast members, poles and world bounds). The **only** thing that resolves against it is the **player capsule** (`Player` → `moveAxisX`/`moveAxisZ`/`depenetrate`/`groundHeight`). Everything else moves by its own rules:

| Mover | Motion model | Consults `colliders[]`? | Hard collision? |
| --- | --- | --- | --- |
| Player | per-axis clamped move, 0.2 m substeps, depenetration, ground snap | yes | yes |
| Ambient pedestrians (3, Yuka) | steering: FollowPath + ObstacleAvoidance + Separation | no | no — avoidance circles only |
| Taxi | kinematic loop `x += 9·dt`, yield-brake to speed 0 | no (only its own collider is *written*) | no — predictive braking only |
| Parked sedan / delivery van | static | n/a | their AABBs block the player only |
| Named cast (Rosa, Idris, kid, stranger, Sal, customer) | authored tweens / follow logic | no (their boxes are *written* each frame) | no — they are obstacles for the player only |
| Pigeons / squirrel / leaves / steam | ambient | no | none by design (decor) |

Frame order (Game.ts): sync customer collider → `player.update` → zones → camera → `world.update` (syncs Rosa/Idris/kid colliders, moves taxi, updates Yuka peds). So the player resolves against cast colliders that are one frame stale — negligible at walking speeds, but it means cast-vs-player is a *player-side* constraint, never a cast-side one.

## 2. The eight audit questions

**Q1 — Which objects currently have collision?**
Buildings, bodega (walls/counter/shelf/roof), laundry walls/counter, road/sidewalks, landings + ladder volumes, subway stairs box, plaza planter, world-bound walls, the taxi (moving AABB), parked sedan, delivery van, the coffee cart, Rosa, Idris, the kid, the cart customer, one streetlamp pole, the utility poles, mailbox, washer, hydrant. Trigger zones (`crosswalkZone`, `insideBodegaZone`, ladder areas, reach-top) are separate AABBs tested against the capsule — untouched by this task.

**Q2 — Which are visual-only meshes?**
The three ambient Yuka walkers (no colliders at all — the player ghosts straight through them, and they through the player), all trees, both benches, bus-stop pole, both trash cans, recycle bin, the north hydrant, newspaper boxes, the construction barrier (also missing from the peds' circle list? no — present there, absent for the player), bulletin board, brownstone stoop railings, storefronts, most streetlamps, pigeons/squirrel/leaves/steam. The stranger and Sal have no colliders either (they are short-lived story actors, but the player can stand inside them).

**Q3 — Which movement paths bypass collision entirely?**
(1) Yuka walkers — steering only; nothing stops a walker from ending a frame inside the cart, a bench or a tree (trees are not even in their obstacle-circle list). (2) The taxi — its yield logic brakes for bodies ahead, but there is no post-commit check; anything the yield list misses is driven through, and V2V safety relies purely on authored lane placement (the sedan was moved to the south curb precisely so the lane never overlaps — documented in source after probe-sweep7). (3) Cast tweens and `updateKidFollow` — positions are set directly; the kid following the player can end up inside a wall or bench with no resolution. (4) Ladder vertical motion — vertical, has its own guards + depenetration (post-fix).

**Q4 — Are NPCs and vehicles heterogeneous collision systems?**
Yes — four of them: the player's swept AABB resolver; Yuka steering for ambient walkers; a hand-authored kinematic loop for the taxi; tween choreography for the cast. They share only the *data* (AABBs) and one yield-list convention (bodies the taxi brakes for). There are no collision layers/masks; classification is implicit in "who reads which array".

**Q5 — Is collision detected before or after movement is committed?**
Player: **before commit**, per-axis with ≤0.2 m substeps — correct. Taxi: predictive only (brake ~4.5 m short, hold at the crosswalk stop line); the move itself is never validated, and the wrap `x > 46 → -46` is a teleport by design. Yuka walkers and cast tweens: **commit first, never resolved**.

**Q6 — Can fast objects tunnel?**
Player horizontal: no (0.2 m substeps). Player vertical fall: **yes, at low fps** — fall speed reaches 18 m/s; with dt clamped to 0.1 s that is 1.8 m per frame, and `groundHeight` only sees tops at/below the *new* feet position (+0.45 snap), so a 0.15 m landing slab can be skipped between frames at ~10 fps. This is the same family as the reported "got down from the stairs and he fell" bug (partially fixed for ladder descent only). Taxi: 0.9 m/frame at 10 fps is covered by the 4.5 m brake distance, not by any swept check. Walkers: max ~1.3 m/s — no tunneling risk.

**Q7 — Do collision shapes match visible geometry?**
Mostly yes — buildings and the bodega are literally boxes. Cars: 4.4×1.5×1.95 vs visible body — good. People: 0.56 wide × 1.7 — good. Two mismatches: the one streetlamp collider is a 0.3 m box around a ~0.11 m pole (≈3× oversized); the barrier is rotated 0.35 rad but has no collider at all (an AABB would have to be oversized to cover the rotation — one of the few legit OBB-ish cases; simplest correct fix is a small circle-equivalent square or two AABBs). Trees need a trunk-radius box, not a canopy box.

**Q8 — Are existing fixes bypassed or disabled?**
No — all previous fixes are live: the 1 mm SKIN anti-weld in `collide.ts`, the ladder descent dismount, the sedan-to-south-curb lane separation, person colliders under the cast, the taxi yield list. The gaps are not regressions; they are the systems that never consult the collider list (Q3).

## 3. Gap list → planned changes (in task order)

1. **Ambient pedestrians have no bodies** — add per-walker AABBs to `colliders[]` (synced each frame like the cast's), so the player cannot walk through them; keep Yuka behaviors/routes untouched (their avoidance list already includes the player and the cart).
2. **Street furniture is ghost for the player** — add tight AABBs: benches, trash cans, recycle bin, newspaper boxes, bus-stop pole, barrier, hydrants, trees (trunk-only), remaining streetlamp/utility poles. Sizes matched to visible geometry; nothing oversized.
3. **Stranger / Sal get bodies** while visible (same `syncPersonCollider` pattern, parked underground when hidden).
4. **Taxi solidity**: keep the yield logic (it works) but add a hard post-commit clamp — the cab's collider must never interpenetrate a body/prop AABB it can yield for, and the cab must never overlap the parked sedan/van volumes (defense-in-depth for lane edits; no new cars, no traffic redesign).
5. **Walker-vs-world resolve**: after `manager.update`, a cheap push-out of each walker from the static furniture circles/boxes they steer around (depenetrate-style, XZ only) — steering stays authoritative, resolve is a safety net; no behavior change when steering succeeds.
6. **Vertical tunneling**: clamp per-frame fall distance to below the thinnest slab (sub-step the gravity integration in `Player.update`), fixing the low-fps fall-through family.
7. **Frame-order**: sync all person colliders *before* `player.update` so the player never resolves against last frame's bodies (kills the residual 1-frame staleness; the reported "passed through the npc" while dismounting).
8. **No layers/masks yet**: the world is small enough that a single list + "who reads it" is honest; introducing a layer bitmask is justified only when a second dynamic resolver (vehicles) lands — that is change (4), which will tag AABBs with a light `kind` field (static / car / person / player-only) rather than a full engine.

Rapier stays out (per task constraint): the player resolver already does swept per-axis clamps, and everything above is incremental on the existing architecture. Yuka behaviors, authored routes, crosswalk-only crossing and taxi-yield logic are preserved verbatim.

## 4. Tests that will prove it

Existing: `tests/collide.test.ts`, `tests/wall-slide.test.ts`, `tests/descend.test.ts` (12+3+5 cases) cover the player resolver; `scripts/probe-peds.mjs`, `probe-cars.mjs`, `probe-sweep7.mjs`, `e2e.mjs`, `visual-check.mjs` cover world behavior. Planned additions: walker-vs-player block test, walker-vs-furniture resolve test, taxi-vs-body hard-stop test, low-fps fall test (dt = 0.1), plus visual before/after frames from `visual-check.mjs` runs.
