# Doc 38 — Agent 2: Solidity MERGE REPORT (this branch vs the parallel implementation)

*The collision task was executed twice in parallel from the same audit (doc 35): the main agent shipped their implementation on `main` (doc 36-implementation, commit `fe4a9b1`), and this branch carried an independent one. This report records the merge outcome, what survived from this branch, and the re-verified evidence. Supersedes this branch's pre-merge report (was `docs/36-agent2-collision-solidity.md`).*

## 1. Merge outcome

Conflicts in `World.ts`, `peds.ts`, `autotest.ts` were resolved **in favor of `origin/main`** — the main agent's architecture is the mainline:

- their `engine/traffic.ts` (progressive braking curve, lateral truth, V2V gap, committed-move guard) supersedes this branch's taxi post-commit guard — it implements the same deliverable more completely;
- their `Pedestrians` (walk colliders, pairwise separation, walker-yields-to-player with corner-reach math, cab un-wedge, band clamp, "pardon me" sidestep, routine beats) supersedes this branch's resolve net;
- their `updateDynamics`-before-`player.update` frame order supersedes this branch's `syncCastColliders()` (same fix, better placed);
- their autotest harness repair (progress-based stuck detection, one-level detour) supersedes this branch's manual route waypoints.

## 2. What this branch contributes on top (the surviving delta)

| Contribution | Why it survives the merge |
| --- | --- |
| **Stranger / Sal / familiar-face colliders** — three transient cast bodies the main agent's pass did not cover; parked underground until visible, synced in `updateDynamics` with the cast | The audit's Q2 list named them; a ghost is a ghost whether the beat is transient or not |
| `tests/solidity.test.ts` — 8 cases: fall substep at the dt clamp (×4), walker bodies + player-yield + pairwise separation + band clamp (×4, ported to the merged API) | Independent regression net; exercises the merged code, not either side's assumptions |
| `scripts/probe-solid.mjs` + `scripts/diag-bodega.mjs` — real-game evidence probes (before/after capable via `SOLID_DIST`) | The repo's probe-* convention; the only scripted before/after visual evidence harness |
| Evidence frames — `shots/solidity-before-bench-block.png` (walker ghosting INSIDE the bench seat, pre-fix build) vs `shots/solidity-bench-block.png` (clamped at the exact face −39.22) | From the actual running game, both builds |
| Perf isolation measurement (below) | Zero-delta proof |

## 3. Gates re-run on the merged branch (real results)

| Gate | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm test` | **243/243 pass** (15 files — includes the main agent's traffic(18)+crowd(8) suites and this branch's solidity(8)) |
| `npm run build` | clean |
| `node scripts/e2e.mjs` | **104 checks, 0 failures, 582 s** (full four-day journey on the merged world) |
| `node scripts/visual-check.mjs` | pass |
| `node scripts/probe-solid.mjs` | 4/4 PASS: bench clamp −39.22; walker contact gap 0.93 m; trunk closest approach 0.95 m; cab held off the occupied crosswalk |

## 4. Performance — marginal cost of this branch's delta, isolated

`probe-perf.mjs` against two builds differing ONLY by this branch's post-merge delta (mainline `fe4a9b1` vs merged branch):

| View | `fe4a9b1` (mainline) | merged branch | delta |
| --- | --- | --- | --- |
| boot-spawn | 484 calls / 86,136 tris | 484 / 86,136 | **0 / 0** |
| mid-street-east | 589 / 98,404 | 589 / 98,404 | **0 / 0** |
| plaza-life | 745 / 107,690 | 745 / 107,690 | **0 / 0** |

Colliders are invisible math: zero draw calls, zero triangles, zero new allocations. (The large absolute numbers vs doc 35's era are the main agent's world expansion — Gable row, interior parks — not collision work.)

## 5. Known remaining issues (honest, post-merge)

1. The **familiar face can still tween through a tree trunk** on her plaza walk — she has a *body* now (blocks the player) but her authored path has no resolve net; rerouting her beats is the main agent's call (Doc 37 territory).
2. The cab's committed-move guard and V2V rect logic are covered by `tests/traffic.test.ts` but are designed never to fire on today's authored lanes — in-game they are defense-in-depth only.
3. `solidity-before-*` probe frames were captured on `be0cb93` (pre-both-implementations); the *after* frames are from the merged build. The contrast is real but the two builds differ by both implementations.
4. Bus-stop pole is deliberately AIR (the main agent found its corner pocket was a wedge trap) — the audit's "pole" is satisfied by the mast + signal + lamps instead.

## 6. For the main agent

- New named cast members need a collider + `syncPersonCollider` line in `updateDynamics` (three examples now in place: stranger, Sal, familiar).
- `tests/solidity.test.ts` pins the walker body contract (bodies track rigs, player-yield distance, pair separation, band clamp) — keep it green when touching `peds.ts`.
- `probe-solid.mjs` is the before/after harness for any future solidity change: `SOLID_DIST=/path/to/other/build SOLID_TAG=before node scripts/probe-solid.mjs`.
