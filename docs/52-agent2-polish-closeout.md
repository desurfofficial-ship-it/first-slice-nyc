# Doc 52 — Agent 2: the polish close-out (bugs paid, debts paid)

> **Status: built, probed, and green.** A continue-and-polish pass over the
> merged tip (`06d8c9a`): every remaining open bug in docs/51 that belongs
> to this agent's file territory is FIXED with a permanent guard, and three
> of docs/50 §4's honest limitations are PAID in content. Branch
> `agent2/session-polish`, off main `06d8c9a`.

---

## 1. What the audit found (docs/51 on the merged tip)

| Ledger item | State at tip `06d8c9a` | This pass |
|---|---|---|
| B1 subway stair y / B2 M121 not enterable / B5 two buses, one bay | already fixed on main (`06d8c9a`, one bay one bus) | verified: probe-subway ALL PASS on this branch |
| **B3** court re-pickup after miss (flaky) | open | **FIXED — root cause found** |
| B4 full E2E not re-run on post-W5 tip | open | **RE-RUN GREEN on this branch** (0 failures, 388 s, console clean) |
| **B6** camera canopy buffer vs live canopy list | open (latent) | **FIXED with permanent guard** |
| **B7** `hidden-when-panel` never wired | open (dead CSS) | **FIXED** |
| **B8** Q/E binding undocumented | open | **FIXED (README blurb)** |

Also verified already-done by others since the stale agent-3 audit: the
joystick `setPointerCapture` guard, the greeting ladder, walker routines,
and the Map notebook — those ledger debts were paid by Main Agent; this
pass didn't rebuild them.

## 2. The bug fixes (each with its permanent guard — §1c)

### B3 — the court's intercept anchor lied
`CourtGame.pickUp()` promises a mid-return intercept ("a real pickup-game
move"), but the `court` interaction's anchor — `COURT_BALL_REST` — did not
follow the ball during the escape `return`: it sat on the stale pre-return
spot. A rebound that left through the open gate left the press dead by the
fence. That is the flaky re-pickup, found.

- **Fix:** `updateReturn` keeps the anchor on the rolling ball every frame
  (the law `updateRest` already obeyed); `RETURN_HOME` made public (it is
  the court's law, the tests pin against it).
- **Guard:** new `tests/court-game.test.ts` — §A the anchor rides the roll
  (60 frames) + `pickUp()` fires mid-return; §B the handoff lands anchor
  and ball on home together; §C at rest the anchor IS the ball.

### B6 — the canopy fade's silent no-op class
`GameCamera` sized the fade array once at construct; the world's canopy
list is a live array. Any post-boot push would leave new trees unfadeable
(silent — the fade pass length-guards). Latent today, impossible tomorrow.

- **Fix:** `updateOcclusion` resizes when the live list outgrows the array;
  `Game.update` re-wires `world.canopyOcclusion` every frame (pointer
  copy, no allocation — the hot path stays cold).
- **Guard:** three laws appended to `tests/camera.test.ts` (late push gets
  a slot · values clamp 0..1 · the resized array is the reference read).

### B7 — dead CSS, wired
`#touch-ui.hidden-when-panel { display: none; }` existed; no code ever
toggled the class. On phones the stick and buttons stayed up over the
order card, the Map, and the postcard.

- **Fix:** `UI.syncTouchPanels()` — one helper, the six panel open/close
  sites. Keyboard play never notices.
- **Guard:** the wiring lives at the UI choke points; a new panel that
  skips it fails visibly on the first phone.

### B8 — the controls blurb
README now states the real bindings (Space/E interact, E never turns the
camera; Z/C or Q turn; M opens the Map). No strafe implied.

## 3. The polish debts paid (docs/50 §4)

### §4.3 — the square's crowd is alive (zone-contained)
- The seven static figures got the idle tick — breathe, weight shift, the
  layered head scan (the auto mode's whole show at speed 0). No more
  mannequins on the red steps.
- **A crosser** (`TSS_Mover_C`) takes the east crosswalk straight across
  the canyon, facing travel.
- **A gawker** (`TSS_Mover_D`) walks the west stretch and STOPS for 2–4 s
  to let the screens work — the stop-and-stare the square is for.
- **Bug found and fixed on the way:** the two shipped movers walked
  SIDEWAYS — yaw 0/π for x-axis travel, but the rig's forward is +z (the
  `atan2(dx, dz)` heading law). Now yaw ±π/2.
- All inside `timesSquare.ts`; the home block's walker indices never hear
  about it (the W4 part-2 hand-off stays intact).

### §4.5 — the car ends read as a cab
Both ends of every car now carry an operator's door + dark tinted glass
(married pairs drive from both ends). The ride's honesty never has to
survive a stare down a blank wall; the cab is the operator's office.

### §4.6 — the turnstiles spin
A pass through a gate's z-line (`FARE_Z = 10.2`, hub gate ±0.55) spins that
hub a third-turn over 0.5 s and fires the turnstile voice — which was
synthesized in docs/50 and never once called (dead voice, now earned). The
open lane still crosses free.

- **Guard:** pure detector `turnstileHubAt` + six laws in
  `tests/subway.test.ts` (direction both ways, open lane free, no-cross
  quiet, off-gate quiet, station B translation).

## 4. The proof (all re-runnable, all run on this branch)

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `vitest run` | **380/380** (367 shipped + 13 new: 3 court-game files' worth of anchor laws, 3 camera occlusion laws, 6 turnstile pass laws + the B6 set) |
| `bun run build` | clean (1,030.3 kB, +2.2 kB — all procedural) |
| `scripts/probe-subway.mjs` | **ALL PASS**, console clean |
| `scripts/probe-court.mjs` | **ALL PASS**, console clean |
| `scripts/probe-w4-bus.mjs` | OK (the bay never holds two bodies) |
| `scripts/probe-solid.mjs` / `probe-peds.mjs` | ALL CLEAN / OK |
| Registry validator | OK — 129 IDs, 12/12 masses, 18/18 anchors |
| **Full 4-day E2E** (`?autotest=1`, 256×192) | **AUTOTEST OK: 0 failures, 388 s, console clean** |
| `scripts/probe-polish-shots.mjs` (new) | console clean; turnstile arms measured spun (2.094 / 4.189 rad off base); shots in `web-three/shots/polish-*.png` |

## 5. Honest limitations (what this pass did NOT do)

1. **The authored opening still starts on the sidewalk** (docs/50 §4.1) —
   the step machine is Main Agent's sacred state machine; the hand-off
   pieces remain exported and waiting.
2. **The sync beat is still a note, not a Postcard** (§4.2) — the capture
   pipeline is Main Agent's system.
3. **The TS crosser/gawker are zone-local actors**, not Yuka pedestrians —
   they pace fixed stretches with honest idle life, they do not yet yield
   to the player (they're visual-only, no colliders, so no shoving either).
4. **No physical device touched this build** — every number above is
   SwiftShader software-GL + the harness's documented 256×192 mitigation.
5. **Agent 5's `agent5/first-session-environments` branch** (4 commits,
   unmerged) builds parallel versions of the same first-session rooms.
   Merging or rejecting it is a Main Agent decision — this pass deliberately
   did not touch it, and notes that its content overlaps docs/50's merged
   world (subway, square, arrival) and would need a real reconciliation,
   not a fast-forward.

## 6. Files

**New:** `tests/court-game.test.ts`, `scripts/probe-polish-shots.mjs`,
`docs/52-agent2-polish-closeout.md`.

**Modified:** `src/court/CourtGame.ts` (the return anchor + public
RETURN_HOME), `src/camera/GameCamera.ts` (occlusion resize),
`src/game/Game.ts` (per-frame occlusion re-wire + the turnstile beat),
`src/ui/UI.ts` (syncTouchPanels + 6 call sites),
`src/world/subway/stationKit.ts` (FARE_Z/TURNSTILE_DX/turnstileHubAt +
hub arms out), `src/world/subway/index.ts` (pass detection + spin),
`src/world/subway/trainKit.ts` (the cab dressing),
`src/world/timesSquare.ts` (crowd life + the sideways-walk fix),
`tests/subway.test.ts` (+6), `tests/camera.test.ts` (+3),
`README.md` (controls blurb), `docs/51` (B3/B6/B7/B8 closed),
`docs/50` (§4 paid annotations).

## 7. For Main Agent

1. The four docs/51 items this branch fixes are closed with guards — take
   the branch whole or cherry-pick; nothing in it touches the step
   machine, Save v1, or the interaction registry's public shape.
2. The turnstile beat key (`'turnstile'`) is audio-only and handled inside
   `Game.drainFarWorld` — no content.ts entry, no note.
3. docs/51's remaining OPEN set after this pass: nothing owned by Agent 2.
   B4's next re-run belongs to whoever merges next.
