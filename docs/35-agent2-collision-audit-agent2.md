# Doc 35 — Agent 2: Collision, Physics & World Solidity — AUDIT (before any change)

Branch: `agent2/collision-solidity` (isolated worktree, base `eed8e64`).
Scope rule honored: audit first, no code changed yet. Every claim below was
read out of the current source, not out of docs.

## 1. The existing systems (what actually runs)

### Player — `src/player/Player.ts` + `src/engine/collide.ts`
- Capsule (r 0.35, h 1.75) vs a flat list of AABBs (`World.colliders`).
- Axis-separated resolution (X, then Z, then gravity/ground), substepped so no
  probe sweeps more than 0.2 m — tunnelling through thin geometry is already
  handled for the player.
- `depenetrate()` shoves the capsule out of embedment after every move; a
  1 mm SKIN air gap keeps wall slides from welding. Curbs ≤ 0.35 are steppable.
- Ground snap 0.45 + descent dismount fixes for the fire-escape ladders
  (playtest 2026-10-30) are in and tested (`collide.test.ts`,
  `wall-slide.test.ts`, `descend.test.ts`).
- **Verdict: solid. Do not rewrite.**

### Collider registry — `World.colliders: AABB[]`
One shared flat array, no layers/masks. Consumers: player movement, camera
sight-line guard, autotest stuck forensics. At ~60 boxes a linear scan is
negligible; a broadphase would be overhead, not architecture.

Currently in the array (player-blocking): road/sidewalk slabs, 7 building
boxes, bodega shell + counter + shelf, 4 invisible bounds, fire-escape
landings + stoop, taxi (moving), parked sedan, parked van, coffee cart, cast
colliders (Rosa/Idris/kid/customer — parked underground while hidden), subway
stair, 3 utility poles, traffic-signal pole, laundromat piers/washers/counter,
shirt rack, permit notice.

### Ambient pedestrians — `src/world/peds.ts` (Yuka, MIT, already integrated)
- `FollowPathBehavior` on three authored sidewalk loops + `ObstacleAvoidanceBehavior`
  over a circle list + `SeparationBehavior`. Crosswalk-only crossing and the
  taxi-yield contract live here and in `World.update` — **preserve both**.
- **No physical collision at all.** Yuka forces ask; nothing resolves. Concretely:
  - ped vs ped: SeparationBehavior is force-only — overlapping route corners
    (commuter's crosswalk leg meets the south local at ≈(−6.5, −6.1)) can
    interpenetrate; nothing hard-separates.
  - ped vs player: the player is one avoidance circle. Walk *into* a walker and
    you overlap — ambient peds are NOT in `World.colliders`; the player ghosts
    through them.
  - ped vs world: no wall/furniture guarantee. The obstacle-circle list is
    stale and incomplete (see §3).
- After `manager.update` there is no clamp to the walkable band — a separation
  or avoidance surge can push a walker off-sidewalk.

### Cast (Rosa, Idris, kid, stranger, Sal) — authored tweens
- Each carries a synced AABB in `World.colliders` (`syncPersonCollider`, parked
  at y −999 while hidden) — the player is blocked by them and `depenetrate`
  recovers when a tween moves a body into the player. **Works; keep.**
- They are invisible to the ambient peds' avoidance: Rosa stands at (−27, 6.8),
  ON the window-shopper's return lane (z 6.75) — walkers ghost straight
  through her.
- The Day-3 kid follow (`Game.updateKidFollow`) walks him in a straight line at
  your hip ignoring all world geometry (benches, trees, the cart) — his own
  collider blocks *you*, nothing blocks *him*.

### Vehicles — `World.update` (the taxi) + parked sedan/van
- The cab is a rail mover: `road.x += dt*speed`, wrap at ±46, lane z = −2.
  Collider AABB synced every frame. Parked sedan (24, 3.05) and van (−14, 3.05)
  sit on the north curb, outside the lane — car-vs-car is safe **by geometry
  only**; there is no detection (nothing would catch a future car in the lane).
- Yield logic exists (crosswalk occupancy hold at nose x ≈ −8.5; bodies in the
  road ahead brake to a stop) but has three defects:
  1. **No lateral discrimination.** Any body with |z| < 4.2 and x-gap in
     (−2.3, 10) stops the cab — a pedestrian on the far south curb edge
     (z 4.1) freezes the cab from 10 m away even though the lane is 3+ m clear.
  2. **Hard speed cut.** 9 → 0 (or 9 → 3) in one frame; no progressive
     braking curve, visible snap.
  3. **No recovery / over-caution behind the tail.** A body at gap ∈ (−2.3, 0)
     — already passed, beside the trunk — keeps the cab stopped forever.
- **Tunnelling:** cab max step = 9 m/s × dt-clamp 0.1 = 0.9 m/frame, yield
  margin 4.5 m — a body can't appear inside the margin between frames, so no
  tunnel today, but there is no final overlap guard either ("resolve before
  committing movement" is not enforced).

### Update-order defect (stale dynamic colliders)
`Game.frame` order: tweens → input → **player.update** (resolves vs colliders)
→ … → **world.update** (moves the taxi, re-syncs taxi + Rosa/Idris/kid colliders).
The player therefore resolves against the *previous* frame's taxi box. At
60 fps that is 0.15 m of visual sink into a passing cab; at the dt clamp
(0.1 s, software GL) it is 0.9 m — the player can be halfway inside the cab
before anything stops them.

## 2. Which objects have visual meshes but no collision (player-side)

| Object | Where | Visual size | Collider today |
| --- | --- | --- | --- |
| 12 street/park trees (trunks) | both sidewalks + plaza | trunk r≈0.1 | **none** |
| 2 benches (bus stop, plaza) | (−24.5, 6.85), (−40.5, 4.55) | 1.8×0.5 seat | **none** |
| 3 trashcans + 1 recycle bin | (−19, 7.45), (2, −7.45), (10.5, −5.6), (2.85, −7.45) | 0.6–0.7 wide | **none** |
| Mailbox | (−3.2, −5.7) | 0.55×0.62 | **none** |
| 2 hydrants | (−0.6, −4.6), (34, −4.75) | r 0.18 | **none** |
| 5 streetlight poles | (13.5, −5.9) + 4 bank lamps | r 0.055–0.075 | **none** |
| Bus stop sign pole | (−24.5, 7.35) | r 0.045 | **none** |
| 2 newspaper boxes | (−44.6, 6.6) | 1.17×0.45 | **none** |
| Construction barrier | (−9.7, 7.5) | 1.6×0.42 (yaw 0.35) | **none** |
| 2 planters | (37, 7.45), (−46.6, 4.4) | ~1×0.4 | **none** |
| Day-3 stool | (5.25, −5.7) (appears mid-game) | r 0.26 | **none** |

(The same objects exist only as *avoidance circles* for the peds, and even that
list is wrong where it matters — see §3.)

## 3. Stale/missing data found during the audit

1. **Ghost sedan obstacle.** The peds' static circle list says the parked sedan
   is at **(24, −3.05)** — in the road. The actual sedan was moved to the north
   curb at **(24, 3.05)** (commit "the sedan owns the curb") and the list never
   followed: walkers bow around a ghost car in the taxi lane and have no circle
   for the real one.
2. **Missing obstacle circles** for the peds: 12 trees, 2 hydrants, 2 planters,
   the shirt rack and permit notice, and Rosa (who stands on their path).
3. **No obstacle for the taxi** in the peds' world (crossing rules keep the
   lanes apart by design; a circle is cheap insurance and covers the stopped-
   cab-mid-road case).
4. Peds have **no clamp** to the block's walkable band.

## 4. Answers to the mandated audit questions

1. *Objects with collision detection:* buildings, bodega, cars (incl. moving
   cab), cart, cast bodies, poles, landings, laundromat set, bounds — see §1.
2. *Visual-only:* the table in §2 (~30 objects) + wires/awnings/signs (correct
   to leave non-solid) + pigeons/leaves/steam (correctly non-solid).
3. *Movement that bypasses collision checks:* ambient peds (steering only), the
   taxi (rail move, yield gate only), the Day-3 kid follow, all tweens (by
   design — authored choreography).
4. *Different collision systems?* Yes: AABB-capsule (player), Yuka circles
   (peds), synced AABBs + rails (vehicles). They do not share resolution.
5. *Before or after movement?* Player: before commit (clamped). Taxi: gate
   before the rail move, but no overlap guard after. Peds: never.
6. *Tunnelling?* Player substeps ✓. Cab margin 4.5 m vs 0.9 m max step ✓ but
   unguarded. Peds ≤ 1.3 m/s ✓. No swept checks anywhere else.
7. *Shapes match visuals?* Cars/cart/cast yes; §2 objects have nothing; the
   barrier is rotated 0.35 rad and would need an AABB approx; trunks are thin —
   boxes must stay small so invisible walls don't balloon sidewalks.
8. *Existing fixes being bypassed?* The crosswalk-only crossing and taxi-yield
   logic are intact; the SKIN/depenetrate fixes are intact. The sedan curb move
   (1bc2dac) is the one that was never propagated into the ped obstacle list.

## 5. Constraint check
- **No new dependency.** Rapier is explicitly forbidden without approval and
  the audit gives no necessity: 3 dynamic bodies + ~100 static boxes vs a
  capsule is fully served by the existing math. Yuka stays as the only library.
- **Camera presentation untouched** — all work is world-space XZ.
- **Parallel-work safety:** all changes on `agent2/collision-solidity`; shared
  files touched (World.ts, Game.ts, peds.ts, collide.ts) are documented in the
  final integration notes with exact hunks.
