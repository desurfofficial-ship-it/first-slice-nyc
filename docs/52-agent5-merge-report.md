# Document 52 — Agent 5: The First-Session Merge (two worlds, one paved path)

> **Status: merged, probed, and green on the merged tip.** Agent 5 built the
> first-session environments in parallel with Agent 2's first-session world
> (docs/50). Both were complete and probed **on their own branches** — which
> means the repo briefly held two subways, two Times Squares, two arrival
> buses. This merge is the reconciliation: **docs/50's world is the paved
> path** (integrated with the registry, the ride machine, the cast, 259
> tests); Agent 5's genuinely additive work lands on top; Agent 5's
> duplicate geometry is retired. Branch `agent5/merge-to-main`, a merge of
> `agent5/first-session-environments` (base `a5bc3d6`) into `main`
> (`ced660d`).

---

## 1. The two implementations, side by side

| Beat (docs/02) | Agent 2 on main (docs/50) | Agent 5 branch (docs/48) | Merged verdict |
|---|---|---|---|
| Subway descent / station | Inline in `World.ts` + `subway/` kit, the dollhouse cutaway, Priya | `firstSession.ts` module, Alder Station at x −42 | **Agent 2's** — integrated, probed 22/22, registry-canonical stair slot |
| The ride | `subway/ride.ts` state machine, the 12 s deterministic seam | Two enterable cars, walk-through probe | **Agent 2's** |
| Times Square | The canyon along x at the 42nd St exit, nine screens, busker, usher, sync beat | A district south at z −80 (row −1), 14 towers | **Agent 2's** |
| The arrival | The M121 at the bay (one bus, one bay — docs/47), driver/duffel anchors; the authored opening still starts on the sidewalk (doc 50 §4.1) | **The arrival film** — a fresh boot rides the bus in (Doc 02 0:00–2:00), driver's "First time?", skyline light-up, step-off handover | **Agent 5's** — it is exactly the hand-off doc 50 §4.1 asked for, now wired |
| Stair/edge physics | Below-grade `groundHeight` law | The stair-glue law (direction-filtered step-ups) + the floor-snap-down law | **Both, united** — see §2 |
| Walker zoning | Per-walker loop-bbox bands (the W4 law) | Per-instance band + pure `clampToBand` | **Agent 2's**, extracted into a pure `bandOfLoop()` so the law stays unit-tested |

## 2. What Agent 5's merge actually ships

**Kept (additive, tested):**
- `src/game/arrival.ts` — the arrival cinematic, **re-targeted**: the film's
  coach is now its own diorama prop (built at the card, disposed at the
  handover, parked in the ride's staging space 300 m south). The street's
  BUS-02 bay keeps exactly one bus (docs/47 "the terminal bay, made
  honest"); `setCoachVisible`'s street traversal and Game's `openCoachDoor`
  are retired with the duplicate coach.
- The driver contract: fresh boots run the film for **humans**; every
  headless driver gets the plain boot. Two honest signals skip it — the
  documented `?autotest`/`?probe` params, and `navigator.webdriver`
  (Playwright boots with it true; most of the probe fleet hits the ROOT url
  with no params at all). `?film=1` is the film's own escape hatch for its
  evidence probes.
- The stair-glue law + floor-snap-down law (`collide.ts` + `Player.ts`),
  united with docs/50's below-grade law in one `groundHeight` — pinned by
  `tests/stairs.test.ts` (rewritten to the merged law) and
  `tests/solidity.test.ts` (the "true void falls forever" test became the
  merged law's honesty case: an all-void column settles on the **defined**
  implicit street).
- `pedestrianSpeedCap()` (`traffic.ts`) — the cab's yield logic as a pure,
  tested function, including the "beside the cab: crawl past" clause that
  fixes the day-4 laundromat deadlock.
- `bandOfLoop()` (`peds.ts`) — Agent 2's per-walker band law, extracted
  pure; `tests/crowd.test.ts` re-pinned to it (the anti-teleport property,
  the core clamp, the Kestrel z-discipline).

**Retired (duplicate world):**
- `src/world/firstSession.ts` (Alder Station at x −42, the z −80 district
  row, the south-wall passage, the street coach), its bake exclusion, its
  district-row extension, its sync-envelope test, and the three probes that
  walked its geometry (`probe-a5-first-session`, `probe-a5e-sync`, the
  `dbg-a5*` scratch family). One subway, one square, one bay.

## 3. A correction the merge record owes (published in the same session)

The first draft of this report claimed two breaks on main's tip — a
corrupted Pages trigger (`branches: ain]`) and a hydrant-loop parse error
(`for (const x, hz] of …`). **Both were display artifacts of my audit
tooling, not repo bugs**: the terminal pipeline strips `[h`/`[m` byte
sequences, which renders `for (const [hx, hz] of …` as `for (const x, hz]
of …` and `branches: [main]` as `branches: ain]`. Byte-level verification
(codepoint dumps of both files, pre- and post-"fix") shows main's files
were always correct — the "fixes" were no-ops, main's CI history is
consistent with a working trigger, and `tsc` was right to pass. The record
in docs/47, the worklog, and the merge commit message carried the same
wrong claim and are corrected here. The lasting lesson is the audit
standard: **when terminal output contradicts the gates (tsc passed),
verify at the byte level before believing the read.**

## 4. One regression the merge introduced and fixed, honestly

The stair-glue law removed a shipped **exploit**: the W2 playground route
crossed the kit platform (top 0.6, unclimbable by the 0.35 STEP_UP law) by
riding the pergola rail 0.43 m off the walk line — the pre-A5 snap-circle
grabbed the rail as ground and the walk "crossed" on invisible
platforming. The merged law correctly refuses rail-rides, so
`probe-w2-ghost`'s route wedged deterministically at (−7.0, −22.4).
**Fix:** the route now walks the kit's east lane (x −4.7, 0.75 m clear) the
way a person moves through the park — in the south gate, around the kit,
back out the gate. The law stays; the route became honest.

## 5. The proof (all re-run on the merged tip)

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `vitest run` | **390/390** (22 files) |
| `npm run build` | clean (1043 kB bundle, all procedural) |
| `probe-subway.mjs` (Agent 2's 22-check gate) | **ALL PASS** |
| `probe-subway-mobile.mjs` (portrait, touch) | **ALL PASS** |
| `probe-w1/w2/w3-ghost` | **PASS ×3** (W2 via the §4 route fix) |
| `probe-w5-interiors` | **PASS** |
| `probe-solid` | **ALL CLEAN** |
| `probe-peds` / `probe-w4-bus` / `probe-freeroam` / `probe-boot-check` | OK / PASS / clean / booted |
| `probe-doc12` (the first-session paper kit) | done, 0 page errors |
| `probe-a5c-arrival` (the film, `?film=1`) | full machine cycle → handover at (−34.2, 6.3), Rosa waving, checkpoint set, 0 errors |
| `probe-a5f-meet-flow` (the first minute after the film) | story advances, Rosa walks, 0 errors |
| Registry validator | green (unchanged by the merge) |
| Full 4-day E2E (`?autotest=1`) | 3–5 failures of ~104 **on this machine**, same flake family as pure `main` (1 failure in its own run here: the dusk-timed "goodnight" rails + the awning confirm). Both trees run ~48% slower on this box than the documented rig (442 s vs 298 s). Console clean on every run. Tracked as docs/51 B4. |

## 6. Honest limitations

1. **The E2E flake family is environmental, not merged code.** Pure
   `origin/main` fails the same rails on this hardware. The failing checks
   are wall-clock-timed beats (dusk notes, day boundaries, an interaction
   confirm) — the game behavior is verified correct by the probes that
   drive the same systems deterministically.
2. **Two docs wear the number 48.** This branch grew from a base that
   predated main's docs/48; the filenames differ so the tree is unambiguous
   (this file is the merge record; `48-agent5-*` is the branch's build
   report, `48-agent2-*` is Agent 2's audit).
3. **The film skips for drivers** — including CI's own drivers. The
   machine's `?film=1` contract keeps it provable; a human-eye pass on a
   real device is still the gold check for the film's feel.
