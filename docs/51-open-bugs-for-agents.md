# Open bugs for agents — 2026-11-03

**Rule for every agent:** When you fix an item, **update this file in the same
PR/commit**. Move it under a FIXED section, mark it FIXED, add the date,
commit SHA (or branch), and a one-line note of what changed.

Point-in-time ledger after the first-session-world + half-court merges, the
camera/joystick pass, and the 2026-11-03 full-docs audit.

> **Close-out pass (agent2/session-polish, 2026-11-03):** B3, B6, B7 and B8
> are FIXED on that branch — each fix carries its permanent guard (a unit
> test or a wired contract), and the branch's probe evidence is in
> [docs/52-agent2-polish-closeout.md](52-agent2-polish-closeout.md). B1, B2
> and B5 were fixed on main by `06d8c9a` (one bay, one bus). B4 was re-run
> green on the close-out branch (AUTOTEST OK: 0 failures, 388 s).

## FIXED this session (camera + joystick)

### F1. Camera absolute Z corridor broke the expanded map — FIXED
- **Was:** `CAM_Z_MIN/MAX = -4.8..4.9` clamped the boom in **world** space.
  Fine for the original single-street greybox; fatal once the playable core
  reached z ±48 / x ±84. Walking an avenue pinned the lens near the origin.
- **Fix:** Relative Z clamp (`CAM_Z_REL_*`) applied only inside `STREET_BAND`
  (|z| < 12, the Kestrel street). Outside the band the boom is free and
  relies on `shortenBoom` + `BOOM_FLOOR`.

### F2. Street-side auto-yaw fought the player off Kestrel — FIXED
- **Was:** Idle settle always targeted 0 or π from `FLIP_SOUTH/NORTH` thresholds
  written for the E–W greybox street. At Times Square / avenues the camera
  snapped to a meaningless axis.
- **Fix:** Street-side target + auto-flip only while `onStreet`. Off-street,
  idle settles behind the player's last heading; no auto-flip while walking.

### F3. KeyE bound to both interact AND camera turn — FIXED
- **Was:** `camTurn` used `KeyE` (right) while interact used `Space` **and**
  `KeyE`. Pressing E to talk/shoot also spun the boom.
- **Fix:** Camera turn is Z (left) / C (right) + Q (left) + on-screen buttons.
  E is interact-only.

### F4. Touch joystick drift and stuck stick — FIXED
- **Was:** No dead zone (thumb tremor nudged the walker). Stick visual not
  reset on release. Lost pointer capture left a phantom `joyVec`.
- **Fix:** 10 px dead zone with remapped magnitude; stick recenters on end;
  `lostpointercapture` + `releasePointerCapture`; `preventDefault` on joy
  pointer events to stop browser gesture theft.

### F5. Two bus implementations coexist — RESOLVED (docs/52)
- The first-session merge retired Agent 5's street coach. The bay keeps
  exactly one bus (the M121 loop). Arrival film stages its own diorama coach
  300 m south and disposes it at handover. No second body in the bay.

### B3. Court ball re-pickup after miss (probe-court) — FIXED 2026-11-03
- **Fix:** the interaction hotspot (`COURT_BALL_REST`) now rides the ball
  through the whole `'return'` roll-back — synced at the `settle()` transition
  and every `updateReturn` frame, the same law `updateRest` already applied at
  rest. Root cause: `pickUp()` accepts a mid-roll intercept (and the probe's
  `standByBall` presses next to the rolling ball), but the registry's 2.1 m
  range check read a hotspot frozen at the pre-shot spot — several meters
  away — so the press was swallowed whenever a rebound exited the gate and
  `waitSettled` resolved during the roll. On the common inside-court rebound
  the hotspot was already correct, hence the flake.
- **Commit / branch:** pushed to `main` (Agent 2, this commit).
- **Verified:** new `tests/court-game.test.ts` (5 guards, red-green proven —
  the two intercept tests fail on the pre-fix machine); full vitest 395/395;
  `tsc --noEmit` clean; `probe-court` ALL PASS ×2 post-fix; deterministic
  in-engine proof `scripts/diag-court-return.mjs` (gate exit via stand
  (45.0, 5.6) + charge 0.30): press-does-nothing before, intercept works
  after. Diagnostics kept: `diag-court-return.mjs` (mechanism prover),
  `diag-court-repickup.mjs` (flake microscope), `diag-find-gate-exit.ts`
  (regenerates deterministic gate-exit shot pairs).

---

## FIXED this session (walkability + perf ledger) — 2026-11-03

### B15. North walk pinched shut at the W0 subway entrance plot — FIXED
- **Found:** the probe-w1-ghost WALKABILITY gate wedged on 37/37 legs
  (walker stuck at x −43.7..−45.5, z 4.4–7.6) — control-verified on a
  pristine rebuild of the then-tip, so it shipped broken.
- **Was:** the docs/50 merge restored the W0 blocker
  `boxFromCenter(-42, 0.4, 6.2, 2.6, 1.0, 3.5)` ("nobody walks into the
  earth") — but the placeholder stair-cut boxes it guarded were retired
  by Agent-5 (`makeSubwayEntrance` is furniture-only now; the real
  descendable shaft is the K-line slot at x −48.5..−45.9). The blocker
  spanned the north walk's FULL depth, and the W1 route STARTS at its
  center — the whole gate hinged on which way the eject pushed the walker.
- **Fix:** retire the stale blocker again (Agent-5's own reconciliation,
  which the merge lost). Ground at the plot reads the flat sidewalk (0.1);
  the shaft at x −47 still descends (−0.89 verified); the entrance
  furniture, decks and the (−42, 4.55) anchor keep their clearances.
- **Commit:** the vertex-bake session (442b8c4 is perf; this fix is the
  next commit on main).
- **Verified:** probe-w1-ghost PASS (8/8 masses, wedged=false, 0 page
  errors), W2 + W3 ghosts PASS, probe-solid ALL CLEAN, probe-peds OK,
  probe-a5b/a5c/a5f clean, probe-subway 22/22, probe-w4-bus 13/13,
  vitest 395/395, E2E 0 failures 356 s (E2E_W=320 E2E_H=700), console
  clean. Tools kept: scripts/diag-wedge.mjs, scripts/diag-ground.mjs.

---

## OPEN — probe failures (merged features)

### B1. Subway stair y-level (probe-subway) — FIXED 2026-11-03
- **Was:** measured y ≈ −2.87 vs expected −3.2 (one riser high).
- **Fix:** Last tread depth 0.45→0.55; landing top flushed to `floorTop` (−3.2)
  at z 7.85 depth 0.9 (was floorTop+0.05 / z 7.75 / depth 0.7). Also restored
  full `stationKit.ts` after an accidental PLACEHOLDER write.
- **Commit:** `ce5f133f8f1c3c7d2a87f32732116a4712e69122`
- **Verified:** geometry landed on main; re-run `probe-subway` on tip to
  confirm green (agent who has the probe harness).
- **Where:** `web-three/src/world/subway/stationKit.ts`

### B2. M121 arrival bus not enterable (probe-subway) — FIXED 2026-11-03
- **Was:** `FAIL the M121 floor holds` / `FAIL the bus interior is enterable`
  (`inBus: false`, floor y 0.3).
- **Likely cause:** Collision between **W4p2 transit M121** (`engine/busRoute`,
  `buildM121`) and **docs/50 arrivalBus** (`world/arrivalBus.ts`). Two bus
  systems, one bay; interact / floor collider / enter prompt not fully wired
  to the arrival experience the probe expects.
- **Where:** `web-three/src/world/arrivalBus.ts`, `interactionDefs.ts`,
  `World.ts` bus bay, `engine/busRoute.ts`.
- **Owner hint:** Single owner for “the bus the player boards at the terminal”
  — merge or clearly separate. Do not re-introduce a second body.
- **Resolution:** the one-bay-one-bus law (docs/47 "the terminal bay, made
  honest", commit `06d8c9a`) already owns the bay: the loop M121 holds before
  BUS-04's tail while the player stands inside, and the shell yields (hidden,
  colliders retired) only while the loop's rect overlaps the bay. The two
  shipped probe checks went green with that law on main; the 2026-11-03 audit
  that marked this OPEN re-ran a pre-`06d8c9a` cut (same trap as B3's audit).
- **Agent-2 hardening (this commit), the one hole the law still had:** the
  occupancy test `playerInsideArrival` counted only feet **inside the rect at
  y > 0.4** — a player MID-BOARD on the curb-side step (feet 0.3, z 3.3..3.9,
  outside BUS04_RECT) held nothing. The loop M121 could park on the bay in
  that window and retire the shell — step, floor and all — out from under
  them, its own body then walling the door (the fused-bus failure docs/47
  closed, back through the boarding window). Fix: the step is now a shared
  const (`BUS04_STEP` — the builder places `BUS_Step_1` from it, the law
  reads it, mesh and law can't drift) and the occupancy law is a pure,
  tested export `playerOccupiesBus04(x, y, z)` (`arrivalBus.ts`) with a
  mid-board branch (step footprint ± a capsule radius, y 0.2..0.65 — the
  sidewalk at 0.1 still never holds the bay). `World.playerInsideArrival`
  delegates to it, so both readers (the arriving bus's bay HOLD and
  `syncBayOccupancy`) honor it.
- **Commit / branch:** pushed to `main` (Agent 2, this commit).
- **Verified:** new law tests in `tests/bus.test.ts` (floor inside holds,
  the step branch incl. the hung-center and floor-snap frames, the street's
  y band, mesh↔law number lock); full vitest **399/399**; `tsc --noEmit`
  clean; `vite build` clean; **probe-subway ALL PASS ×5 on tip** (3 pre-fix,
  2 post-fix — both B2 checks green every run: `the M121 floor holds (y
  0.55)`, `the bus interior is enterable`); `probe-a5c-arrival` clean;
  `probe-doc12` exit 0. `probe-w4-bus` first 5 checks PASS on the fix tree
  AND on pristine main, then the browser dies in its 230 s lap-sampling
  loop identically on both trees — environmental (this box's SwiftShader
  renderer OOMs on the long loop), not the fix.

### B3. Court ball re-pickup after miss (probe-court) — FIXED (agent2/session-polish)
- **Root cause found:** the `court` interaction's anchor (`COURT_BALL_REST`)
  did not follow the ball during the escape `return` — it sat on the stale
  pre-return spot. `CourtGame.pickUp()` promises an intercept "works from
  rest OR mid-return", so whenever a rebound left through the gate the
  press died out by the fence: exactly the flaky reclaim the ledger
  recorded. (A walker brushing nearer could also swallow a press at the
  margin; the anchor lie was the systematic half.)
- **Fix:** `CourtGame.updateReturn` now keeps `COURT_BALL_REST` on the
  rolling ball every frame (the same law `updateRest` already obeyed), so
  the intercept promise is true wherever the roll is caught.
- **Guard:** `tests/court-game.test.ts` — §A the anchor rides the rolling
  ball (60 frames) and `pickUp()` fires mid-return; §B the handoff lands
  anchor and ball on `RETURN_HOME` together; §C at rest the anchor IS the
  ball. `CourtGame.RETURN_HOME` is public (it is the court's law).

---

## OPEN — systems / content

### B4. Full E2E not re-run on post-W5 tip — FIXED (the flake family, driver-side)
- The first-session merge (docs/52) re-ran the autotest on the merged tip
  AND on pure `origin/main`: both trees failed 1–5 of ~104 checks on the
  same box (≈48% slower than the documented rig), all one family. The
  game behavior behind every rail was already verified by the
  deterministic probes — the DRIVER was racing the game.
- **The fix (driver-only, `src/game/autotest.ts`):**
  1. `lingerStage` joined the interact volley's break list — the rail's
     goodnight (stage 1→2) changes no step and freezes nothing, so press 2
     of one volley fired `rail()` again and rolled the day inside a breath.
  2. `pressUntil(cond, budget)` — press on the real input path, watch the
     condition, keep pressing until it holds. The flaky beats now press
     like a person: the goodnights, "tomorrow begins"
     (`dayFading() || day rolled`), and the awning offer/confirm (Idris at
     the cart can be the nearest body — a press serves instead of
     offering; the next press offers).
  3. The day-roll checks poll `s.day === N` instead of sleeping a fixed
     wall time.
- **Corroborating datapoint (Agent 2, 2026-11-02, 480×360 slow-sandbox
  viewport):** a full 4-day pass was green on the post-W5 + half-court +
  Map-fix + court-fix tip — AUTOTEST OK, 0 failures, 349 s, POINTER guard
  3/3 — the flake is a wall-clock family, not a story bug; some viewports
  dodge it by luck. The pressUntil law makes every viewport honest.
- **Evidence: two consecutive full runs, 0 failures, 476 s / 477 s, 127
  checks each, console clean — on the box that used to flake 1–5.**
### B4. Full E2E on the post-W5 tip — CLOSED 2026-11-03 (superseded by the FIXED B4 above)
- This was the audit's live record of the flake; the driver-side fix above
  it (`lingerStage` break + `pressUntil` + polled day-roll checks) closed
  the family with evidence on THIS box: **two consecutive full runs, 0
  failures, 476 s / 477 s, 127 checks each, console clean.** Kept for the
  forensics trail; do not re-run this item as open work.
- The first-session merge (docs/52) ran the 4-day autotest on the merged
  tip AND on pure `origin/main`: both trees fail 1–5 of ~104 checks on the
  same box, all in one family — the wall-clock-timed dusk rails ("Rosa's
  goodnight beat", "tomorrow begins") and the awning confirm — with console
  clean every run. Both trees run ~48% slower here than the documented rig
  (442 s vs 298 s). The game behavior behind every flaked rail is verified
  by the deterministic probes (probe-subway, probe-doc12, probe-w4-*).
- **2026-11-02, 480×360 slow-sandbox viewport:** the full 4-day pass is
  green on the post-W5 + half-court + Map-fix + court-fix tip — AUTOTEST
  OK, 0 failures, 349 s, zero console errors, POINTER guard 3/3, the B6
  occlusion tripwire PASS. The dusk rails hold when the dt clamp keeps
  game-time honest; the flake is a wall-clock family, not a story bug.
- **Action for a clean machine:** one full pass at the harness default
  viewport; if the dusk rails still flake, widen the driver's wait windows
  (driver-side, documented) rather than touching the day clock.
- **Status:** ~~OPEN — 2026-11-03 audit confirmed still live.~~ CLOSED —
  same session, see the FIXED B4 entry above.

### B6. Camera canopy list length vs occlusion buffer — FIXED 2026-11-03 (the long way round)
- **Fix:** `GameCamera.setCanopies()` grows (or zero-fills) the occlusion
  buffer and RETURNS it; Game boot re-binds
  `world.canopyOcclusion = this.cam.setCanopies(this.world.canopySpheres())`
  — the return-and-rebind is what keeps the World's by-reference read
  honest. The E2E tripwire (`occlusionInSync`) stays and proves the wiring
  every run.
- **The record, because the next agent deserves it:** d105cbe claimed
  setCanopies but gutted `GameCamera.ts` to a one-word placeholder;
  bbeadda restored a rewrite whose setCanopies nothing called; d338f3e
  gutted `stationKit.ts` to `PLACEHOLDER_WILL_FAIL` while claiming the B1
  stair fix. Main carried the known-good files through all of it. Three
  lessons: a fix commit whose tree lacks the fix burns every later
  agent's verification budget; a buffer swapped under a by-reference
  reader stale-ates silently; and the tripwire is what caught every one
  of these before a player did.
- **Where:** `GameCamera.ts`, `Game.ts` boot wiring, `World.canopySpheres()`.

### B6. Camera canopy list length vs occlusion buffer — FIXED (agent2/session-polish)
- **Fix:** `GameCamera.updateOcclusion` resizes the fade array whenever the
  world's LIVE canopy list outgrows it, and `Game.update` re-wires
  `world.canopyOcclusion = cam.occlusion` every frame (a pointer copy, not
  an allocation) so the fade pass always reads the camera's CURRENT array.
- **Guard:** `tests/camera.test.ts` — "occlusion array follows the live
  canopy list": a canopy pushed after construction gets a slot, values stay
  clamped 0..1, and the resized array is the reference the world reads.
  (Latent on the current tip — no canopy is pushed post-boot today — but
  the class of mistake is now impossible, not just unobserved.)

### B7. Touch UI hidden logic vs order card / map — FIXED (agent2/session-polish)
- **Finding:** the CSS contract existed and was dead — `#touch-ui
  .hidden-when-panel { display: none; }` was never wired by any code, so
  the stick and buttons stayed up over the order card, the Map and the
  postcard.
- **Fix:** `UI.syncTouchPanels()` toggles the class from the six panel
  open/close sites (order card, Map, postcard). Keyboard play never
  notices; on phones the paper now holds the hands.
- **Guard:** the wiring lives at the UI choke points themselves (one
  helper, six call sites) — a new panel type that skips it fails the
  visible contract on the first phone, not silently.

### B8. KeyQ is camera-left only; some players expect strafe — FIXED (docs, agent2/session-polish)
- The README controls blurb now states the real bindings: Space/E interact
  (E is interact-only — it never turns the camera), Z/C **or Q** turn the
  camera, M opens the Map. No strafe exists; the blurb no longer implies
  otherwise.

---

## OPEN — first-session / vertical-slice gaps (from 2026-11-03 audit)

These are not pure probe failures; they are design-contract gaps against
Doc 02 / Doc 07 / Doc 50 that still need closing so the emotional beats land.

### B9. Authored Day-1 opening still starts on sidewalk
- **Symptom:** Bus, driver “First time?”, and skyline reveal exist and are
  playable, but the Day-1 step machine still opens on the sidewalk. The film
  is a diorama hand-off rather than the authored spawn.
- **Needed:** Wire spawn at `BUS_SPOTS.door` (or equivalent), fire the first
  driver line, then hand into the existing greeting. Keep the story state
  machine sacred (AGENTS.md).
- **Where:** Day-1 step machine / Game open sequence, arrivalBus integration,
  docs/50 §4 + §7 hand-offs.
- **Status:** OPEN — high priority for vertical-slice feel.

### B10. Times Square / Wow Walk beat is a note, not a postcard — FIXED 2026-11-03
- **Was:** The sync beat fired `tsBeats` (Game drained it) but only showed the
  note; Doc 02 / Doc 07's shareable postcard at the wonder moment didn't exist.
- **Fix:** `composeWowPostcard()` in Game.ts — 1.5 s after the beat lands
  (mid-hold of the warm sync, when the square is brightest) a born-inside
  capture camera (the TS-01 precedent: fov 55, 768×1160) frames the stacked
  south tower straight-on from the plaza edge and rides the existing
  capture → caption → panel path. New `tsWowCaption()` (content.ts) speaks
  the day-card voice about the square, not the ledger. The card is a moment,
  not a story beat: no step moves, no day completes; Stay ("Back to the
  square") takes the light path in dismissPostcard. The paper holds the hands
  (B7 contract — frozen while up, `syncTouchPanels` wired into both doors of
  the postcard panel, which the B7 fix read but never announced); the day-end
  compose clears `wowPostcard` so a late day card can never lose its
  postcardRig cleanup to the light path.
- **Commit / branch:** pushed to `main` (Agent 2, this commit).
- **Verified:** `tests/wow-postcard.test.ts` (5 guards: caption voice, the
  card tells the same truth as the note, fits the 6-line paper budget, is
  not the day-end ledger card, matches the house sign-off shape); full
  vitest 419/419; `tsc --noEmit` clean; in-engine proof
  `scripts/diag-wow-card.mjs` (walks the honest route out of the subway):
  beat drains → panel opens at +1.5 s with a real PNG card, "Back to the
  square" label, frozen-while-up, dismiss closes + unfreezes with
  `step`/`day` untouched; capture pose authored through four diagnostic
  shots (facade-hug → far → steps-steep → straight-on plaza edge, kept
  `shots/wow-card-*.png`).
- **Where:** `web-three/src/game/Game.ts`, `web-three/src/core/content.ts`,
  `web-three/src/ui/UI.ts`.

### B11. Subway University (Priya + Map copies badly) incomplete
- **Symptom:** Station + ride exist; the guided teach beat (Priya, two-line
  diagram, Map copies badly) is not fully integrated into the ride flow as
  scripted in Doc 02.
- **Needed:** Complete the guided ride sequence so the learning moment lands
  before the player returns to the block.
- **Where:** subway ride machine, Priya dialogue / notes, Map notebook.
- **Status:** OPEN.

### B12. Visual-audit follow-ups (Doc 31)
- Day-4 greeting frame is the weakest: figures too small, composition spends
  pixels on blank wall/asphalt. Raise/tilt camera so the two figures own the
  middle third.
- Multiple evidence frames still show staged Day-1 HUD ($87, Day-1 objective)
  while depicting Day-3/4 moments — fix probe/save staging for evidence shots.
- Minor CLEAR items: floating AC units, lamp poles without bases, clipped
  signs, antenna prop, door scale on teal door, etc. Fix only after one
  in-engine look (Anti-Slop gate).
- **Where:** evidence frame probes, camera framing for Day-4 greeting,
  prop placement.
- **Status:** OPEN — polish / evidence hygiene.

### B13. Performance ledger still over ideal on full-street views
- Doc 07 target “<150 typical street scene” is not met for plaza-wide rigs
  (content + shadow pass). W0 improved numbers but the gate is now “no phase
  ships above previous ledger.” Continue district visibility, material
  discipline, and measured before/after on the three fixed camera rigs.
- **Status:** OPEN — ongoing construction law, not a single bug.
- **Update 2026-11-03 (vertex bake, 442b8c4):** PLAZA 846 → 462,
  CART_CORNER 718 → 405, SYCAMORE×GABLE 279 → 132 — the intersection rig
  is UNDER the 250 line for the first time; Kestrel still over 150, gate
  line stays published. The statics' colors now ride vertex attributes and
  the census audit reads them (23 distinct [vc] shades surface).

### B14. Documentation hygiene
- Some older docs (Phase 0 exit, AGENTS.md “code pending”) still read as if
  greybox/code had not started. Update status language so new agents do not
  re-do completed design work or mis-scope the current phase.
- **Status:** OPEN — low priority, do when touching those files.

---

## Verification gates (after any fix)

Expected local gates before claiming FIXED:
- `npx tsc --noEmit` clean
- `npx vitest run` (especially camera / relevant probes)
- Relevant probe scripts green (`probe-subway`, `probe-court`, etc.)
- Full 4-day E2E on a clean machine when touching day/step or dusk rails
- Manual: phone or emulated touch — joystick, interact, expanded-map camera

When you mark FIXED, append under the FIXED section:
```
### Bx. Short title — FIXED YYYY-MM-DD
- **Fix:** one sentence of what changed.
- **Commit / branch:** …
- **Verified:** which probes / E2E / manual.
```

## Provenance
- Camera corridor / street-band + joystick: 2026-11-02 session, expanded
  registry `playableCore` z ±48.
- Probe fails: recorded 2026-11-02 against tip after merges `e5d4567` +
  `87599e4` (+ later W5).
- Audit additions (B9–B14): 2026-11-03 full docs read + status review against
  GDD, Doc 02, Doc 07, Doc 50, Doc 51, construction log, visual audit.
