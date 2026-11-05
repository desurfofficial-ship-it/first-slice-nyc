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

### B9. Authored Day-1 opening still starts on sidewalk — FIXED 2026-11-03
- **Was:** The bus, the driver's "First time?", and the skyline reveal were
  playable, but the Day-1 boot still opened on the sidewalk — the film was a
  diorama hand-off rather than the authored spawn.
- **Fix:** the arrival rebuild (`7b6b680` "arrival: the opening, rebuilt for
  the phone in your hand", landed on main via the session-polish merge):
  fresh boots ride the bus in — Game boots the `ArrivalCinematic` (Game.ts:
  "The Doc 02 opening — fresh boots ride the bus in"), the machine stages
  ride → driver line → choice → terminal card → step-off, and the handover
  carries the step-off checkpoint into the existing greeting. Autotest/probe
  boots skip the film; saves resume without it (the story machine untouched).
- **Verified:** probe-a5c-arrival + probe-a5g-arrival-portrait (the film's
  own probes); the full 4-day E2E green on the rebuilt opening; the bug-hunt
  sweep (docs/53) drives the terminal bay and the step-off on the shipped
  boot. Ledger note: docs/50 §4.1's hand-off is PAID by the same work.
- **Where:** `web-three/src/game/arrival.ts`, `web-three/src/game/Game.ts`.

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

### B11. Subway University (Priya + Map copies badly) incomplete — FIXED 2026-11-03
- **Was:** The ride's teach beats existed as notes (priya-uptown, priya-lines,
  map-copies, announce — content.ts), but Doc 02's beat was VISUAL: Priya
  draws two lines on the window, and Map copies them badly onto its own page.
  Nothing on screen ever drew.
- **Fix:** the teach draws itself, twice, honestly:
  1. **The window diagram** (trainKit.ts + subway/index.ts): four chalk
     strokes on the middle window's inside face of each ALIGNED car — the
     gold line "stays with the lights" (the K stripe's color), the teal line
     dips "under the river". Hidden until the ride's `priya-lines` beat
     (t 8.5, before the swap at t 12), hidden again when the machine rests —
     the next train on the loop is a fresh car. Both twins carry identical
     copies so the seam never shows the trick. `SUB_Diagram_*` joins
     ZONE_KEEP_RE (the bake would detach the toggle — the docs/53 class).
  2. **Map's crooked copy** (sketch.ts + UI.ts + GameState + Save): page 1's
     bottom-left margin gains the badly-copied doodle — the river line dips
     too deep, the lights line sags, the pencil labels hedge ("the lights??")
     — latched by the `map-copies` beat via `copyPriyaLines()`, riding the
     v1-safe save field `map_priya_lines`, revealed on Map's next open (the
     fold never opens itself; the wiggle is the honest kind).
- **Commit / branch:** pushed to `main` (Agent 2, this commit).
- **Verified:** `tests/subway.test.ts` — the diagram beat lands before the
  seam, the copy beat after, `SUB_Diagram_*` rides ZONE_KEEP_RE;
  `tests/map-notebook.test.ts` — the latch is a keepsake not a counter,
  independent of the place sketch, rides the save roundtrip, an old save
  reads untaught, a corrupt field degrades to false; full vitest 437/437;
  `tsc --noEmit` clean; probe-subway ALL PASS (30 laws) including three new
  diagram laws (8 strokes built in both cars · the teach beat draws it ·
  the chalk rides only its ride) — driven through the real machine.
- **Where:** `web-three/src/world/subway/trainKit.ts`,
  `web-three/src/world/subway/index.ts`, `web-three/src/world/subway/stationKit.ts`,
  `web-three/src/ui/sketch.ts`, `web-three/src/ui/UI.ts`,
  `web-three/src/core/GameState.ts`, `web-three/src/core/Save.ts`,
  `web-three/src/game/Game.ts`.

### B12. Visual-audit follow-ups (Doc 31)
- Day-4 greeting frame is the weakest: figures too small, composition spends
  pixels on blank wall/asphalt. Raise/tilt camera so the two figures own the
  middle third. — **FIXED 2026-11-04** (visual-d4 shot 2: parked low
  three-quarter north of the M121 shell — the first parked pose stood inside
  it; the pair owns the middle third, she meets his eye, the bus + tree +
  newsbox carry the rest).
- Multiple evidence frames still show staged Day-1 HUD ($87, Day-1 objective)
  while depicting Day-3/4 moments — fix probe/save staging for evidence shots.
  — **FIXED 2026-11-04** (visual-d3 was the last offender: the Day-3 morning
  block stages $111/$111 and the dusk postcard $120 — the tests' own
  day2Done/day3Done law — with objectiveText() riding each staged step;
  re-shot and eyeballed: $111 on the kid-on-stool chip, $120 on the
  three-windows dusk).
- Minor CLEAR items: floating AC units, lamp poles without bases, clipped
  signs, antenna prop, door scale on teal door, etc. Fix only after one
  in-engine look (Anti-Slop gate).
- **Where:** evidence frame probes, camera framing for Day-4 greeting,
  prop placement.
- **Status:** OPEN — item 3 (the CLEAR prop pass) remains; items 1–2 fixed.
- **CLOSED 2026-11-04 (item 3 — the CLEAR prop pass, one in-engine look per
  the Anti-Slop gate, then fix-or-accept):** all 14 published frames
  re-captured on main and read frame-by-frame (fresh captures + the vision
  CLI pass, then every reading cross-checked against the code — the code
  won several times, per Doc 31's own method). Two systemic evidence-rot
  finds came out of the pass before the per-item verdicts:
  (a) items 1–2's fix had staged the day only where the wallet contrast
  bites — `d3_plaza_pigeons` + `d3_brownstones` still wore Day 1's $87 and
  the "waving at you" objective on main; and every frame committed before
  the Pocket HUD carried the retired music-toggle chrome. visual-d3 now
  stages Day-3 state ($111, step 21's own flyer objective) for the whole
  chapter and retires the boot toast;
  (b) the visual-d4b follow-cam poses stopped landing when the street grew —
  on main the sal-counter boom parked INSIDE the laundry awning (the
  committed frame was unreproducible). All five d4b shots now park the
  camera (the house law the d3/d4 probes already use), stage their own
  step's objective (the receipt frames wore "the washers are going" on a
  filed-receipt beat; the dusk four-windows wore the morning-rush line), and
  `d4b` clears the Day-1 boot toast.
  Per-item verdicts (Doc 31 CLEAR list vs main):
  - `d4_sal_counter_wash` grey prism ("clearest floating-prop read"): **not
    reproducible on main** — the A-frame is grounded, the washers sit in the
    bay, the counter is dressed; closed with the re-shot frame as evidence.
  - Fire-escape landings floating (`d4_receipt_on_cart_portrait`): **not
    true of the current staging** — the ladder is in frame against the red
    wall in both receipt frames; closed with the re-shot frames.
  - Antenna prop "reads detached" (`d4_four_windows_dusk`): **attached by
    construction** — `RideTowerMast` (arrival.ts) spans the tower roofline
    to +2.4 with a beacon cap, and the current dusk frames read it rooted;
    closed, no code change.
  - Lamp poles without bases: **already fixed on main by construction** —
    `makeStreetlight` (props.ts) carries the base collar from the
    poles/wires pass ("a small base collar so the pole meets the sidewalk
    with weight"); the one collarless procedural fallback is
    `World.makeStreetlamp` (cart corner), which GLB-upgrades and never shows
    its base in a published frame — accepted risk.
  - Floating AC units: **by design, seated** — `makeACUnit` boxes sit in
    their window recesses at the sill line (World.ts placement + the dusk
    frames); accepted as the theatrical window-unit read Doc 31 described.
  - Teal door child-scale: **accepted risk, deliberate** — Doc 31 itself
    calls the scale defensible ("tiny person, big city") and the door is the
    Day-2 emotional anchor; it stays exactly as dressed.
  - Clipped signs / frame-edge crops (taxi noses, far-right props, tree at
    frame edge, street sign "AY"): **accepted risk** — frame edges crop a
    continuous world; every published frame passes the 1-Second Law, and
    the one sign whose occlusion was a real defect is fixed below.
  - `d4_receipt_on_cart` cart sign behind the dialogue box: **FIXED** — the
    landscape pose aims high so "Wade's Spot" sits mid-frame clear of the
    banners, receipt chip and grounded ladder both read.
  - `d4_stranger_terminal` thin-strip census (Doc 31 fix #4's second
    target): **FIXED** — parked east of the pair between the M121 shell's
    tail and the building line; the pair owns the middle third, the shell
    wall names the terminal. (West of the pair every sight-line rides into
    a plaza tree's trunk or canopy — tried, measured, rejected; the canopy
    edge over the pair is the block's own shade. The BUS TERMINAL sign is
    out of frame by composition; the shell is the terminal's name in this
    shot.)
  - `d4_she_walks_your_first_walk` bare-asphalt census, no cab: **FIXED** —
    the beat's own choreography staged honestly: the cab at the engine's
    coded courtesy hold (`World.CAB.holdCenterX`, nose at the crosswalk's
    west edge, loop frozen for the frame), the pair on the stripes, the
    signal + storefront context in frame.
  - `d3_plaza_pigeons` M121 shell eating the plaza: **FIXED** — parked
    south-west: the flyer board ("Read the flyer" prompt), benches,
    pigeons, BUS TERMINAL sign and the stair railings own the frame; the
    shell holds the right edge.
  - `d4_laundry_bay` bay cut at the frame edge + Day-1 boot toast:
    **FIXED** — parked across the street: SUNRISE LAUNDRY sign, teal
    awning, both washers and the shirt rack own the frame; toast retired.
  - `d4_permit_notice` dead-center against empty wall, notice face away:
    **FIXED** — parked on the street side: the notice face reads, the
    player reads it, Sal's counter and Rosa's awnings hold the context.
  - `d3_brownstones` empty lower half: **accepted risk** — a closer stand
    at the row was tried and rejected (the sidewalk trees eat the doors
    from there); the curb stand keeps the row clean.
  - Street-lamp pole crossing the `d3_street_landscape` frame and the
    manhole steam cluster ("unfinished effect"): **not defects** — the
    steam is the designed Rule-of-Steam manhole vent (World.ts), the pole
    is the street's own wiring at head height; accepted.
  - Observed once, not shipped: the broken sal-counter boom angle showed a
    sawtooth shadow pattern on the red facade at grazing incidence — not
    visible in any published frame; noted for the B13 shadow frontier if a
    rig ever grazes that wall again.
- **Where (item 3):** `web-three/scripts/visual-d3.mjs` (chapter-wide Day-3
  staging, plaza parked pose), `visual-d4.mjs` (terminal + she-walks parked
  poses, staged courtesy-hold cab, dusk objective),
  `visual-d4b.mjs` (park/unpark helpers, per-shot objectives, toast
  hygiene, all five poses), 14 re-captured frames in
  `web-three/assets/web-three/frames/`; no src/ changes — zero gameplay
  surface touched; vitest 469/469, tsc clean, build 447 ms.
- **Status:** FIXED 2026-11-04 — items 1–3 closed; every Doc 31 CLEAR item
  now ends in a code fix + re-shot evidence or a written accepted-risk
  above. Residual accepted risks are listed per item and need no owner.

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
- **Update 2026-11-03 (cast bake, same day):** every figure merged to 6
  draws (was 11–12) — colors ride vertex attributes, one shared material
  for the whole cast, rigid pivots fused (leg+boot, arm+hand,
  torso+shawl+strap, skull+hair+glasses). PLAZA 468 → 404,
  CART_CORNER 406 → 335, SYCAMORE×GABLE 132 → 113 — every rig under its
  previous ledger. Measured and rejected: small-prop shadow-caster
  discipline (−12/−16 for visible contact shadows — bad trade); the
  remaining frustum tail is canvas-texture sign faces (atlas = a program).
  Next honest frontier per diag-shadow-price: the shadow pass itself
  (~108–125 calls).
- **Update 2026-11-04 (curb bake, e7dcc7d+1):** the zone-bake law extended
  one group later — the M121's shell (the arrivalBus header itself ceded
  "the shell could bake") and the named dressing groups fuse within their
  own groups; the driver rig rides the animated exclusion, the route sign
  stays a map singleton. PLAZA 404 → 370, CART_CORNER 335 → 301,
  SYCAMORE×GABLE 115 → 115 — every rig under its previous ledger; the
  150 ideal line stays published FAIL. The shadow frontier priced and
  closed for now (diag-shadow-frontier.mjs): SHADOW_HALF 35→30 is −5/−1,
  35→26 is −11/−5, far 160→120 is ±0, ALL figure casts are −37 — every
  lever an art regression for almost nothing; the ~113–124 shadow calls
  are the dusk look itself (74 figure casts + the buildings that cast
  it). Frontier back to the main pass: sign atlas (a program), interiors'
  window visibility, SUB_Root depth.
- **Update 2026-11-04 (sign atlas, same day):** the named frontier taken.
  One 2048×1024 shelf (signAtlas.ts, 8 px bleed guards, background-prefilled
  slots) carries every static sign face; uv rects ride the geometry, the
  bake keys an ATLAS batch on the shared map and fuses the block's faces
  world-wide (54 static + 6 van-livery draws → 2). PLAZA 370 → 340,
  CART_CORNER 301 → 279, SYCAMORE×GABLE 117 → 110 — every rig under its
  previous ledger; the 150/250 lines stay published FAIL (340 / 279).
  Law holds: Terminal_Sign and Bodega_RoofSign keep their own meshes
  (dollhouse lift / roof duck), the notice face and rollsign keep their
  canvases. Remaining at the rigs is priced: the dusk shadow pass, the
  six-draw cast law, instanced wildlife, baked tiles. The 150 line needs
  a program (interiors' window visibility, SUB_Root depth), not a lever.

- **Update 2026-11-04 (interiors' window visibility — the last named
  program, agent2):** the glass-side law. The shipped W5 toggle keyed the
  fit-out on player proximity alone: within the shell ± 1.6 m the room
  showed, whichever side you stood on — behind the hall's blind east yard
  the fit-out conjured through masonry no window can show (measured:
  hall=true, 197 calls at the stance). The law makes the room's own
  windows the visibility authority: near shows the fit-out only on the
  outward side of one of the room's registered window runs (or inside —
  the inside test short-circuits first). Pure law in
  `src/world/interiorGlass.ts` (the shadowLaw.ts pattern), per-room runs
  registered verbatim from the openings each builder cut, hysteresis
  margins (enter 1.6 / exit 0.8) driving band and glass alike so
  window-edge loitering never flickers. **The numbers, honestly:**
  identical-stance before/after (`diag-glass-stance.mjs`, committed) —
  the hall east yard 197 → **167 calls (−30, −15%)** with the fit-out
  honestly hidden; all three glass-side controls call-identical (diner
  north band window 165 = 165, hall west window 169 = 169, laundry bay
  mouth 322 = 322); the five ledger rigs **bit-identical** (PLAZA 400,
  CART_CORNER 333, SYCAMORE×GABLE 128, TIMES_SQ 130, PLATFORM_A 186 —
  the W5 far state already had the rooms hidden at street scale; the
  flat-dump proof is in the probe notes below). The 150/250 lines stay
  published FAIL — and the priced note that goes with it: with this
  program the named frontier is exhausted (sign atlas, SUB_Root depth,
  interiors' window visibility all landed); what remains at the rigs is
  the priced composition itself (the dusk shadow pass, the six-draw cast
  law, the felt crowd, the baked tiles), every lever already rejected
  with numbers. Closing B13 against the 150 line is the owner's call;
  the row above is the evidence either way.
- **Probe notes for the next agent:** (1) the flat-dump at PLAZA /
  CART_CORNER shows zero `INT_*` groups visible — the W5 far state
  already zeroed interiors at street scale, so "interiors' window
  visibility" was never going to move the street rigs; its win is the
  wrong-side stance and honest windows, now measured. (2) The diner's
  and barber's blind faces have no standable floor (contiguous blocks —
  the capsule ejects onto the shell, which the inside test reads); the
  hall's east yard is the one clean wrong-side floor. (3) The live feed
  oscillates a hair — a stance parked ON a band edge (0.1–0.2 m) flickers
  the fit-out (pre-existing band-edge behavior, both laws); stances sit
  ≥ 0.9 m inside their zone. (4) probe-w5-interiors gained check 6 (the
  glass law: wrong side hidden, window sides show); tests/interior-glass
  .test.ts pins the pure law (11 checks).

- **Update 2026-11-04 (parallel verification, this merge):** the two rigs the
  ledger above never published, measured on the merged tree with the same
  `diag-perf-breakdown.mjs`: **TIMES_SQ 222 → 130 (−41% — the square is
  UNDER the 150 line)** and **PLATFORM_A 179 → 146**. Session baseline →
  merged main across all five rigs: PLAZA 470 → 370, CART_CORNER 408 → 301,
  SYCAMORE×GABLE 134 → 115, TIMES_SQ 222 → 130, PLATFORM_A 179 → 146 — no
  rig regressed at any step (the cast bake alone was worth −92 on the
  square: its shadow pass carried a 161-call gap on a 61-mesh view, most of
  it figures). A parallel agent landed the same person material law
  independently; the merge kept main's implementation and dropped the
  duplicate (one paved path). Verified on the merged tree: tsc clean, vitest
  469/469, build clean, probe-subway ALL PASS, probe-a5c-arrival green.

- **Update 2026-11-04 (the Shuffle phase row + the underground economy, this
  commit):** two things landed together — the honest publication of the B16
  phase's cost, and the first program item off the named frontier.
  **The phase row (published, not silent):** the six-walker Shuffle crowd
  rides the six-draw person law, and the merged main's World.ts additions
  came in with it — measured on the tip with `diag-perf-breakdown.mjs`:
  PLAZA 370 → 400, CART_CORNER 301 → 333, SYCAMORE×GABLE 115 → 128 (the
  crowd's east loop end grazes this rig's shadow-box edge: +6..12 figure
  casts), TIMES_SQ 130 → 130. Above the previous ledger on three rigs; the
  cause is the felt crowd itself (the B16 build), the lever priced and
  rejected (per-figure instancing needs shared vertex colors; the rig bakes
  colors per figure — the floor stays 6 draws per person).
  **The PLATFORM_A rig was staging-broken — its numbers are void:** the
  census feet (x −40, z −3.2, y −3.2) teleport UNDER the world and physics
  ejects the capsule to the surface within a frame — every published
  PLATFORM_A number (179, 146, 166) measured a surface player through an
  underground camera. The rig now stands on a real platform floor (the fare
  pocket, probe-subway's own staging) with the converged interiorMode lens.
  **The underground economy (the "SUB_Root depth" program item):** below
  grade the station is an open-top cutaway whose own casters live within
  ~15 m of the player, so the dollhouse flip now shrinks the sun's shadow
  box to SHADOW_HALF_UNDERGROUND = 18 (`src/world/shadowLaw.ts`, applied by
  `World.setUndergroundShadow`, texel lattice recomputed + re-snapped).
  Same-pose A/B on the corrected rig: **231 → 186 (−45, −19%)**; the
  parked-census camera priced 166 → 130. The platform's own shadows are
  bit-identical on the evidence frames (diag-underground-shots: pillar,
  railing, and player shading unchanged; the street beyond the box edge
  stops paying). Wired contract: `tests/shadow-law.test.ts` (the numbers +
  never-widen-below-grade) and probe-subway now asserts the shrunk box on
  the descent (half 18, symmetric). Street rigs are untouched (the economy
  only exists below grade). Verified: tsc clean, vitest 514/514, build
  clean, probe-subway ALL PASS ×2 (with the two new checks).

- **Update 2026-11-05 (the shadow economy, second half — the figure proxy,
  4346d10+this):** the upgraded x-ray (`diag-rig-xray.mjs`, real frustum
  attribution now — main and sun planes separately) showed the gate rigs'
  real composition: the census's scary TOP owners (SUB_Root 186, TSS_Group
  93, INT_* ~149) are fully frustum-culled at the rigs; PLAZA's 400 was
  main ~241 + **shadow 155**, and the shadow pass was drawing every
  figure's six meshes even when the rig was behind the eye. The move: one
  merged standing-silhouette proxy per figure (~50 tris, shared geometry)
  on `PERSON_SHADOW_LAYER` (layer 1) — `castShadow` on, the six articulated
  meshes stop casting, World's boot enables the layer on the sun's shadow
  camera (the whole contract; WebGLShadowMap tests casters against the
  shadow camera's layers). The eye keeps the full walk; postcards never see
  the proxy. **The row: PLAZA 400 → 334, CART_CORNER 333 → 261,
  SYCAMORE×GABLE 129 → 94, TIMES_SQ 130 → 52, PLATFORM_A 146 → 114** —
  every rig under its previous ledger; the square and the platform are
  now UNDER the 150 line; Kestrel's street rigs stay published FAIL
  (334 / 261). Shadow pass at PLAZA 155 → 96 (every figure exactly 1
  draw). Evidence: `shots/b13-shadow-proxy-plaza.png` (crowd shadows
  readable at the plaza rig, golden-hour length). The remainder is priced
  per class in docs/47's entry (crowd law 45–54, named cast ~21, GLB
  vehicles ~31, wildlife ~21, shadow-pass statics ~60, the named-tail
  programs ~150); the 150 line still needs those programs, not a lever.
  Verified: tsc clean, vitest 526/526, build clean, probe-subway ALL
  PASS, probe-solid ALL CLEAN, E2E 0 failures (413 s, 320×700).

- **Update 2026-11-05 (the GLB-wrapper + fallback-prop cut — the last
  unpriced composition item, agent5):** the composition note priced "the
  shadow pass, the six-draw cast law, the felt crowd, the baked tiles" —
  but the census still carried two families nobody had priced:
  **(a) the two shipped vehicle wrappers** (`car_taxi_glb` 7 draws,
  `car_sedan_glb` 6 — one mesh per glTF material) and **(b) the procedural
  fallback props whose GLB upgrade can never land** (no
  `models/mailbox.glb` / `models/trashcan.glb` ships; the placeholders sit
  in `glbProps`, so the district bake excludes them forever — Mailbox 4
  draws, Trashcan 3, on every rig that sees them). The bake's own law is
  correct in both cases (a baked batch can't be swapped by the async
  upgrade, and a glbProps member can't join a tile) — so the cut happens
  ONE LEVEL DOWN: `src/world/vertexFuse.ts` (the shadowLaw.ts pattern, pure)
  fuses a prop's OWN parts into one vertex-colored mesh on the shared
  `vcMaterial` — inside the wrapper (the cab still drives as a body, the
  district seat still hides it as one) or in the builder (mailbox, trashcan,
  fused pre-position). The bail law is mergeGltfParts' law, stricter: any
  mapped / transparent / emissive / metallic / double-sided / skinned /
  unindexed / flag-mixed part bails the WHOLE prop untouched
  (`tests/vertex-fuse.test.ts`, 14 pins).
  **The honest look note:** the vehicle GLBs ship position-only parts (no
  normals — the same reason the bake's guard refuses them), so the shipped
  car look was ambient-only flat color; the fuse computes per-face normals
  so the fused draw is lit like every other Lambert prop in the world (the
  procedural placeholder cars always were). A/B frames:
  `web-three/assets/web-three/frames/b13_vcfuse_{sedan,mailbox,trashcan}-{before,after}.png`
  — mailbox bit-identical, trashcan bit-identical, sedan flat → shaded
  (the world's own lighting law; the taxi wears the same law —
  `probe-cars` reads taxiWrapper meshes=1, sedanWrapper meshes=1).
  **The numbers (diag-perf-breakdown, before → after on the same tip):**
  PLAZA 400 → **368** (−32, main + the shadow pass that rides the fused
  casters), CART_CORNER 333 → **308** (−25), SYCAMORE×GABLE 128 → **118**
  (−10), TIMES_SQ 130 → 130 (±0), PLATFORM_A 186 → **180** (−6) — every
  rig at-or-under its previous ledger; the 150/250 lines stay published
  FAIL. Verified: tsc clean, vitest **548/548** (+14), build clean,
  probe-cars clean, probe-solid ALL CLEAN, probe-peds OK, probe-a5c-arrival
  errors none, full 4-day E2E **AUTOTEST OK 0 failures (540 s)** console
  clean. Also reconciled: main's `@types/node` addition had never reached
  package-lock.json — `npm install` pinned it (the entry-gate tsc failed
  on a fresh checkout until it did).
- **The composed row (the merge of the two same-day levers, agent5 on the
  merged tree):** the figure shadow-proxy (above) and the vertex fuse
  (below) landed in parallel and compose. Measured on the merged tree
  (diag-perf-breakdown, 2026-11-05): **PLAZA 302, CART_CORNER 236 (under
  its 250 line), SYCAMORE×GABLE 84, TIMES_SQ 52, PLATFORM_A 108** — the
  session's two cuts together moved the plaza rig 400 → 302 (−98) and the
  corner 333 → 236 (−97). Only PLAZA stays published FAIL (> 150), against
  the x-ray's priced remainder. Gates on the merged tree: tsc clean,
  vitest **551/551** (both agents' pins), build clean, probe-cars clean,
  probe-solid ALL CLEAN, probe-subway ALL PASS, full 4-day E2E **AUTOTEST
  OK 0 failures (527 s)** console clean; composed evidence frame
  `web-three/shots/b13-composed-plaza.png` (committed:
  `assets/web-three/frames/b13-composed-plaza.png`).

### B14. Documentation hygiene — FIXED 2026-11-03
- **Was:** AGENTS.md read "Pre-Production, docs-complete, code pending — do
  not scaffold game code before Phase 0 exit is signed" weeks after
  `web-three/` shipped; docs/09 + docs/18 read as if the greybox and spikes
  had not started; docs/07's banner still said "Advanced in Phase 0". New
  agents were being pointed away from the real front.
- **Fix:** AGENTS.md now states the real phase (Vertical Slice production,
  Phase 1 of docs/06; Phase 0 exit signed 2026-10-28) and points the ACTIVE
  WORK pointer at this ledger + the docs/50 paved path; its §3 repo map
  shows the real tree (`web-three/` game + tests + probes) and §4 the
  observed branch/commit practice. docs/09 and docs/18 carry dated
  status-update banners (Doc 07 banner style) so their historical bodies
  are read as history — bodies untouched, no history rewritten.
- **Guard:** `tests/docs-hygiene.test.ts` — 3 checks: the `**Current phase:**`
  line exists, never claims "code pending" again, and names the real phase;
  AGENTS.md links the ledger + paved path; both Phase-0 history docs keep
  their dated banner and ledger pointer. A future phase change must update
  the line consciously (the test fails loudly until it does).
- **Commit / branch:** `docs/b14-status-hygiene`
- **Verified:** full vitest on the rebased tree (count recorded in the
  commit message + worklog), `tsc --noEmit` clean.
- **Where:** `AGENTS.md`, `docs/09`, `docs/18`, `docs/07` (banner),
  `web-three/tests/docs-hygiene.test.ts`.

---

### B16. The Shuffle (VS-F04) is a stub — one flavor note; the crowd-walk mini-game is not built — FIXED 2026-11-04
- **The docs' spec (read these, do not re-derive):** Doc 07 §3 IN —
  "Crowd walk mini-game, forgiveness rules". Doc 02 §10:00–15:00 (the Wow
  Wonk, wonder beat #1's approach): "a gentle mini-game about walking
  through people without stopping (drift toward gaps; brushing someone just
  makes them say 'scuse me,' which is a *correct* interaction, not a
  failure)" — taught on the guided walk toward the subway. Doc 01 §412:
  learned on the Wow Walk, "a tiny movement mini-game, forgiving by
  design". Doc 10: the crosswalk is the Shuffle teaching moment (greybox
  stand-in). Doc 08 note #4: the Map-note text. Doc 07 TBD-3: soft skip —
  after 20 s standing still, "The city will wait" prompt; skipping still
  grants the Times Square postcard.
- **What main @ `5f973e1` actually has — the forgiveness half + the note,
  nothing else.** `GameState.ts:444` `cross(atStrip)`: ONE note effect (at
  the stripes: the Doc 08 #4 text; anywhere else: "You found your own way
  across. The crosswalk still likes you.") + a checkpoint + advance to
  CLAIM_CART. The world trigger is `Game.ts:650` (`z < -4.1` — the docs/22
  Seam-1 fix). The note text is the only place "scuse me" exists
  (`content.ts:156`, `GameState.ts:448`) — no code can make anyone say it.
  Ambient peds are real bodies with collision courtesy
  (`tests/crowd.test.ts`: walkers yield, pair separation, cab push) —
  physics and decoration, not a mini-game.
- **What's missing, per the spec:** (1) the crowd-dense walk segment itself —
  Doc 02 places the Shuffle on the guided walk to the subway, where the
  player moves THROUGH people; the Day-1 crosswalk note is the greybox
  stand-in (docs/10, docs/22), not the slice's beat; (2) drift-toward-gaps
  as a felt mechanic; (3) brush → "scuse me" from the brushed ped as a
  correct interaction, never a fail (zero reaction code: no bubble, no
  speech, no brush-proximity handler); (4) the TBD-3 soft skip ("The city
  will wait" — zero hits in src/ and tests/).
- **Provenance note:** docs/agent3-living-world-audit.md already called this
  row "Missing — one flavor note when crossing; no crowd mini-game". That
  audit is stale on other rows (Map UI, album, subway have since landed),
  but on F04 it is still TRUE. docs/55's F04 status note quoted the note
  text as if the brush existed — corrected in the same commit that files
  this entry.
- **Close rule:** the walk to the subway carries a crowd the player weaves
  through; brushing a ped fires their "scuse me" (correct interaction, no
  fail state); standing still 20 s mid-walk offers "The city will wait"
  (TBD-3) and skipping still reaches Times Square; the crosswalk's
  forgiveness and own-way line stay as-is. Evidence: a probe that walks the
  segment, forces a brush, and captures the ped reaction; a unit test for
  the brush-counts-as-correct law; e2e rails untouched.
- **Status:** CLOSED — built the same day (see "B16 — FIXED 2026-11-04" below).
  needs its own decree and must not be smuggled into a docs pass.
- **FIXED 2026-11-04 (agent2, decree granted — "build it") — SUPERSEDED SAME DAY by the second build below (the merge kept the contact law + the felt crowd; the 1 m proximity scan fired "’Scuse me." at walkers passing a STANDING player, and one extended loop is not Doc 02’s "walking through people"):** the beat is
  built on the docs' own terms, and the day machine stays sacred (no step,
  no money, no save, no GameState change at all):
  - **The crowd.** The south-side local's loop extends west from −34 to
    −43.5 (`World.ts`) — the walk to the Alder Heights stairs now carries a
    walker on the local's own lane, plus a west-end routine beat (they pause
    to look across at the terminal). ZERO new bodies: bank-shared rigs stay
    three, the census never moves, the perf ledger never regresses.
  - **The brush law.** `world/shuffle.ts`, pure: a walker whose circle you
    cross within 1.0 m says “Scuse me.” once per 4 game-seconds. No fail
    flag, no score, no counters (the Map hard rules hold) — brushing is
    correct by construction. The yield sidestep is the body language; the
    wisp is the voice.
  - **The speech wisp.** One shared canvas sprite (`SpeechWisp`),
    invisible at rest — zero draw calls when nobody speaks.
  - **TBD-3 landed with it.** Twenty honest game-seconds of standing still
    mid-stretch surfaces “The city will wait.” once per visit.
  - **The crosswalk untouched.** `cross()` never changed; the Day-1 corner
    keeps teaching Doc 08 note #4; the commuter's crossing keeps its own
    beat outside the zone (x −49..−14, surface-only).
- **Verified:** `tsc --noEmit` clean; vitest **487/487** (29 files;
  `tests/shuffle.test.ts` pins 11 laws — the brush returns only speech, the
  per-walker cooldown, the chorus, cross-street no-op, contact distance,
  the 20-second threshold, the surface-only zone, the authored copy);
  build 485 ms; **probe-shuffle.mjs SHUFFLE OK** — six checks: the stretch
  walks west end to end down the local's lane (reached x −43.7), a walker
  lives on it, a forced brush fires the wisp
  (`probe-shots/shuffle-wisp.png`), no fresh show while the contact cools,
  TBD-3 surfaces the note (`probe-shots/shuffle-wait.png`); probe-peds
  PEDS OK (the west lane rides clean); probe-subway ALL PASS;
  **probe-perf before→after identical: 165/245/300 draws** — zero at-rest
  regression, the B13 ledger law holds; e2e full 4-day **AUTOTEST OK:
  0 failures, 533 s, console clean** — rails untouched.
- **Machine-honesty note for the next probe author:** software GL runs the
  game clock at a fraction of wall time (~0.15–0.3× at 900×700) — every
  time-based check must poll with a wall-time cap, never nap-and-assume,
  and westward walks must track progress as x DECREASING.

### B16. The Shuffle (VS-F04) — FIXED 2026-11-04
- **Fix:** the crowd-walk mini-game is built world-side: six Shuffle walkers
  loop the bodega→plaza stretch (lanes z 6.08–6.76, west ends at x −41 —
  9 walkers total, seeded deterministic, no street crossings so the crosswalk
  law is untouched); brushing a walker while WALKING (measured player pace
  ≥ 0.45 m/s, `brushFires` pure law) fires their reaction — a paper
  "’Scuse me." bubble above their head (2.2 s hold, fade; one brush per
  meeting, 4 s cooldown) — a correct interaction with NO fail state: the
  brush event's payload is who/where, nothing to lose, nothing counted; and
  the TBD-3 soft skip: 20 s of standing still INSIDE the Shuffle stretch
  (`SHUFFLE_STRETCH`, `cityWillWaitFires` pure law) offers "The city will
  wait." once per standstill episode — comfort, not a checkpoint; Times
  Square stays reachable with no gate (free-roam world). The crosswalk's
  forgiveness + own-way line stay as shipped.
- **Commit / branch:** agent5/merge-to-main → main (push of 2026-11-04).
- **Verified:** tests/shuffle.test.ts (17 tests: the brush law, the no-fail
  payload law, one-brush-per-meeting against a REAL Pedestrians instance,
  the soft-skip law, the stretch bounds); scripts/probe-shuffle.mjs
  (SHUFFLE OK — crowd on the stretch, brush fires with the bubble captured
  on screen, money/step unchanged, TBD-3 note lands, no gate west);
  vitest 511/511; tsc clean; full 4-day E2E AUTOTEST OK 0 failures (554 s).

---

### B17. The garden tender stands frozen at the garden's south edge for 21 sim-minutes — FIXED 2026-11-05
- **Found:** `probe-w4-soak` (the doc 55 item-5 soak complement) failed 41
  stillness windows — walker 3 pinned at (−0.5, 23.45) from ~sample 11 to
  the 1800 sim-s gate. `dbg-a5o-garden-pin.mjs` caught it in the act: the
  vehicle's velocity read full cruise north (0.963 m/s at its waypoint)
  while the position never moved.
- **Root cause (two bugs, one birth):** `bandOfLoop`'s z discipline —
  `minZ: Math.max(-7.5, minZ - 0.65), maxZ: Math.min(7.5, maxZ + 0.65)` —
  INVERTS for any loop living entirely outside the home street band. The
  garden tender (z 24.1..26.8) read minZ 23.45 > maxZ 7.5, and the clamp
  `max(minZ, min(maxZ, z))` resolved to exactly 23.45 for EVERY z — a
  band that is a single point. Born in W4 p1 (`b80760c`) with the loop;
  the W4 soak had passed only by sampling luck (frame interleaving
  decides whether the active waypoint sits due-north of the clamp edge
  when the walker first reaches it). The same bug silently shrank the
  avenue shopper's reach to its middle 15 m — waypoints at z ±18
  unreachable, but the walker kept pacing, so no stillness ever fired.
- **Fix:** (1) `bandOfLoop` is now the loop's OWN bbox, inflated (1.6 x /
  0.65 z) with a ±64 typo net — for every street lane the result is
  tighter-or-equal to the old band (lanes top at |z| 6.85; the commuter's
  lands exactly at ±7.5), the garden loop gets 23.45..27.45. (2) The
  anti-stuck law: a non-dwelling walker whose position moves < 5 cm over
  8 consecutive one-second windows gets its waypoint advanced — the
  position delta is the signal, never the velocity (the pin's velocity
  lied at full cruise). No walker can now freeze longer than 8 sim-s.
- **Fallout fixed with it:** the freed avenue loop exposed its authored
  mid-block jaywalk (crossing Kestrel Street at x 61.8, outside the
  Kestrel×Sycamore paint) and an in-roadway bus-stop beat (z 2.2). The
  loop is re-authored onto the south walk (diner + fruit-stand beats
  unchanged; the M121 stop watched from across the street at z −6.9 —
  BUS-03 serves the north curb; nobody waits for it standing in the road).
- **Commit / branch:** agent5/merge-to-main (2026-11-05).
- **Verified:** `probe-w4-soak` **OK** — 1838 sim-s, 44 samples, 9 walkers,
  0 failures, page clean (the gate that found it) · `probe-w4-bus` OK ·
  `probe-peds` OK · `probe-shuffle` OK · `probe-solid` ALL CLEAN ·
  `tests/crowd.test.ts` 26/26 (band law pins + the anti-stuck law against
  the historical pin reproduced) · vitest 559/559 · tsc clean.

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
