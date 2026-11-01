# Doc 36 — AGENT 2: Collision, Physics & World Solidity — Implementation Report

*Companion to Doc 35 (pre-implementation audit). Branch: `agent2-collision`, merged to `main`. All numbers below are from real runs — command lines included so the main agent can reproduce any of them.*

---

## 1. Audit

`docs/35-agent2-collision-audit.md` — the eight questions answered against the actual code, with the gap list this pass implements. Nothing in the audit was invalidated by the main agent's parallel work (re-verified after fast-forwarding to `21797bc`: the diary pass added zero colliders; `collide.ts`/`Player.ts`/`peds.ts` were untouched).

## 2. Objects that previously had NO correct collision (the fix list)

| Object | Before | After |
| --- | --- | --- |
| 3 ambient Yuka walkers | no bodies at all — player ghosted through them, they through the player | one person AABB each, synced every frame; capped push-out resolve as the net under the steering |
| Both benches (plaza, bus stop) | visual-only | seat+back matched boxes (1.8 × 0.8 × 0.55) |
| Bus stop pole, 4 streetlights, 3 utility poles, signal pole, streetlamp | visual-only (one pre-existing lamp box was ~3× the visible pole) | pole-matched boxes (0.12–0.2 wide) |
| 3 trash cans, recycle bin | visual-only | cylinder-matched boxes |
| Newspaper boxes, bulletin board, 2 planters | visual-only | footprint-matched boxes |
| 2 hydrants, mailbox | visual-only | body-matched boxes |
| All 12 street trees | walk-through trunks (ambient walkers' lanes grazed them) | trunk boxes 0.3 × 2.4 × 0.3 + trunk circles in the walkers' avoidance list |
| Construction barrier | visual-only (rotated 0.35 rad) | rotated-footprint box, toggles OFF with the prop on Day 4 (`dressDay`) |
| The stool | visual-only until bought | body appears with the purchase, parked underground before |
| Stranger, Sal, the familiar face | ghosts | person colliders on the cast sync contract |
| Fast falls | could skip a 0.15 m landing slab at dt 0.1 | sub-stepped descent (≤ 0.12 m per probe) |
| Taxi vs anything | predictive yield only, no post-commit check | post-commit interpenetration guard (revert, never shove) |

Untouched on purpose: pigeons/squirrel/leaves/steam (decor by design), the fire-escape silhouette (authored decorative), trigger zones (`crosswalkZone`, `insideBodegaZone`, ladder areas — separate AABBs, still work).

## 3. Files changed

- `web-three/src/engine/collide.ts` — optional `kind` tag on AABBs (`'static' | 'car' | 'person'`); untagged = static world.
- `web-three/src/player/Player.ts` — sub-stepped gravity integration.
- `web-three/src/world/peds.ts` — walker bodies + `resolveCircles` safety net (capped 0.12 m/frame) + pairwise separation; Yuka behaviors/paths/speeds untouched.
- `web-three/src/world/World.ts` — furniture collider block, tree trunk boxes, `kind` tags, stranger/Sal/familiar bodies, `syncCastColliders()`, taxi post-commit guard, barrier/stool body toggles, trunk circles for the walkers.
- `web-three/src/game/Game.ts` — one line: `syncCastColliders()` before `player.update` (frame-order fix).
- `web-three/src/game/autotest.ts` — driver routes walk around the now-real furniture (bus bench, trashcan, mailbox, hydrant, cart corner, stool, street tree); no assertions weakened — two beats now step into the crosswalk zone deliberately.
- `web-three/tests/solidity.test.ts` — new, 8 cases.
- `web-three/scripts/probe-solid.mjs` — new real-game evidence probe; `web-three/scripts/diag-bodega.mjs` — forensic walk tracer (kept, matches the probe-* convention).

## 4. What was implemented (mapped to the task)

1. **Consistent collision classification** — light `kind` tags instead of a full layer/mask engine (audit §3.8): the cab filters on `car`/`person`; the player reads everything; triggers unchanged.
2. **NPC solidity & crowd behavior** — walkers are bodies; SeparationBehavior still handles steering, plus a hard pairwise floor; furniture never gets shoved by a pedestrian; the net is capped so nothing snaps. Yuka behaviors, authored routes, crosswalk-only crossing, taxi-yield: preserved verbatim (e2e 4-day journey proves it).
3. **Vehicle solidity** — the existing yield logic kept; new post-commit guard refuses any move that would interpenetrate a tagged car/person (defense-in-depth for future lane edits; on today's lanes it never fires). No new cars, no traffic redesign.
4. **Player solidity** — furniture bodies everywhere, wall-slide/depenetrate untouched; frame-order fix kills the residual one-frame staleness behind "passed through the npc" while dismounting.
5. **Tunneling** — horizontal was already sub-stepped (0.2 m); vertical now too (0.12 m < thinnest slab 0.15 m).
6. **Response & recovery** — resolve-before-commit everywhere the player moves; walker net capped; taxi reverts instead of shoving; no new springs, pops, or teleports (e2e clean, zero page errors).

## 5. Tests actually run (real results)

| Gate | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm test` (vitest) | **162/162 pass** (11 files; includes 8 new solidity cases: fall substep ×4, walker bodies ×4) |
| `npm run build` | clean (tsc + vite, 367 ms) |
| `node scripts/e2e.mjs` (full 4-day journey, real game, headless) | **104 checks, 0 failures, 495 s** — after rerouting the driver around the now-real furniture |
| `node scripts/visual-check.mjs` | pass (postcard PNG valid, mobile UI intact) |
| `node scripts/probe-solid.mjs` | 4/4 PASS (bench block at the exact clamp point −39.25; walker contact gap 0.63 m; trunk closest approach 0.48 m; cab held at the stop line) |
| Low-fps behavior | covered by `solidity.test.ts` at dt = 0.1 (the loop's clamp) — falls land on slabs they used to skip |

Honest notes: two probe scenarios are weaker as *contrasts* than as *guarantees* — the walker-body and trunk checks also pass pre-fix within their sampling windows because Yuka's avoidance usually prevents contact (0.56–0.61 m closest approach before). The colliders are the hard floor when steering loses; the unit tests prove the contract. The bench ghost is the unambiguous before/after pair.

## 6. Before/after evidence (from the real running game)

- `web-three/shots/solidity-before-bench-block.png` vs `shots/solidity-bench-block.png` — BEFORE: the walker stands **inside** the bench seat (probe FAIL, capsule at x −40.35); AFTER: pressed against the east face at the exact clamp point (x −39.25). Copies in `assets/web-three/frames/solidity_before_bench_ghost.png` / `solidity_after_bench_blocked.png`.
- `shots/solidity-{before-,}{ped-body,trunk-clear,taxi-yield}.png` — the other scenarios' frames.

## 7. Measurable performance impact

`scripts/probe-perf.mjs`, same machine, same seeds:

| View | Before | After |
| --- | --- | --- |
| boot-spawn | 364 calls / 18,136 tris / 6 fps (software GL) | **identical** |
| mid-street-east | 443 / 25,064 / 6 fps | **identical** |
| plaza-life | 625 / 30,098 / 5 fps | 629 / 30,254 / 5 fps (+0.6 % calls, +0.5 % tris — sampling noise at frustum edges; colliders are invisible math) |

CPU: the collider list grew ~140 → ~170 AABBs for the player's linear scans, plus the cab's 170-iteration guard — negligible per frame. Zero per-frame allocations added (resolve and guard reuse scalars/fields; no `new` in any hot path).

## 8. Known remaining collision issues (honest list)

1. **The familiar face can visually clip a tree trunk** on her plaza walk — she is tween-choreographed (no resolve net; her *body* blocks the player correctly). Fixing means touching her authored path — main agent's call.
2. **Camera-relative driver drift**: under software rendering the chase camera's flip can arc a long southbound crossing; with everything solid, arcs now end *against* furniture instead of ghosting through it (the e2e reroutes avoid this; a human player just walks around — furniture is visible).
3. **No OBBs**: the rotated barrier uses an honest-ish AABB (1.55 × 0.85 × 0.9); corners are ~7 cm generous. The only rotated solid on the block.
4. **The cab's post-commit guard is untested in-game** (it never fires on authored lanes — by design). Covered only by the tag contract; it exists to protect future edits.
5. Player-vs-walker "bulldozing": a walker in the player's path is *not* shoved by the player (the player stops); the walker's own resolve yields them out of the player circle at ≤ 0.12 m/frame — deliberate, so crowd feel stays soft.

## 9. Integration notes for the main agent

- **`World.colliders` is still the one list.** New props: either use `solid()` (auto-collider) or push a `boxFromCenter` matched to the visible geometry — and tag it (`kind: 'car' | 'person'`) if it moves or should filter for the cab. Untagged boxes are static world and read by everyone.
- **Moving/conditional props**: park the box underground when hidden (`minY = -999; maxY = -998`) — the same contract the cast uses; see `barrierCollider` in `dressDay` and `stoolCollider` in `syncCastColliders()`.
- **New cast members**: add a collider field, push it, and include it in `syncCastColliders()` — Game syncs before the player moves, World.update after everything moves.
- **New furniture on a walker lane**: add a tight circle to BOTH the `Pedestrians` steering list and the resolve list (they are separate arrays on purpose — steering is generous, resolve is tight).
- **The e2e routes assume the furniture layout**: moving the cart, benches, mailbox, hydrant, stool or street trees will need `autotest.ts` waypoint nudges (every reroute is commented with the reason).
- Camera work is untouched in this branch; `GameCamera.ts` has zero diffs here.

## 10. Shared-file conflicts / coordination

- **`web-three/src/world/World.ts`** — the main agent added the diary pass (lines ~854, ~1924) and planters while this branch was open. This branch was rebased on `21797bc` before starting; the furniture-collider block is one contiguous insertion after the planters, and the `dressDay` edit wraps the existing barrier toggle. If the main agent adds new street props in `dressing.ts`/`streetAssets.ts`, they should land colliders per §9 — merge conflicts in `World.ts` are most likely at: the planters block, `dressDay`, and the `Pedestrians(...)` call.
- **`web-three/src/game/autotest.ts`** — main agent owns beats, this branch owns routes; both touch `walkTo` calls. Route edits are all comment-marked `Agent-2` / "solidity" for conflict triage.
- **`web-three/src/game/Game.ts`** — one inserted call (line ~271). Low conflict risk.
- No file was reset, reverted, or overwritten; origin/main was fast-forwarded, never force-pushed.
