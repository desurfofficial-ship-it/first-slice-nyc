# Open bugs for agents — 2026-11-02

Point-in-time ledger after the first-session-world + half-court merges and the
camera/joystick pass. **Fixed in this session are marked FIXED.** Everything
else is open for a follow-up agent.

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

---

## OPEN — probe failures (merged features)

### B1. Subway stair y-level (probe-subway)
- **Symptom:** `FAIL the stair descends to the platform` — measured y ≈ −2.87
  vs expected −3.2. Intermittent companion: mid-stair tread sometimes off.
- **Likely cause:** W5 interiors `groundHeight` / below-grade law shifted
  relative to the docs/50 authored platform y. Dollhouse + terminal collider
  lift may also be racing the first-frame sample.
- **Where:** `web-three/src/world/subway/stationKit.ts`, `World.ts` groundHeight
  below grade, `scripts/probe-subway.mjs` expectations.
- **Owner hint:** Agent that owns W5 interiors or subway.

### B2. M121 arrival bus not enterable (probe-subway)
- **Symptom:** `FAIL the M121 floor holds` / `FAIL the bus interior is enterable`
  (`inBus: false`, floor y 0.3).
- **Likely cause:** Collision between **W4p2 transit M121** (`engine/busRoute`,
  `buildM121`) and **docs/50 arrivalBus** (`world/arrivalBus.ts`). Two bus
  systems, one bay; interact / floor collider / enter prompt not wired to
  the arrival bus the probe expects.
- **Where:** `web-three/src/world/arrivalBus.ts`, `interactionDefs.ts`,
  `World.ts` bus bay, `engine/busRoute.ts`.
- **Owner hint:** Needs a single owner for “the bus the player boards at the
  terminal” — merge or clearly separate the two.

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

### B4. Full E2E not re-run on post-W5 tip
- Last green full E2E cited in docs was pre-W5 / pre-merge tip. After
  first-session + half-court + W5 interiors, the 4-day autotest needs a
  clean machine pass at the harness default viewport.
- **Where:** `scripts/e2e.mjs`, `?autotest=1`.

### B5. Two bus implementations coexist
- W4p2 district bus (route brain, yield, dusk) and docs/50 arrival bus
  (boardable first-session prop) are separate. Risk of double mesh at the
  bay, double colliders, or interact targeting the wrong one.
- **Action:** One design decision + one code path for “player-enterable bus.”

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

## Verification after the camera/joystick fix

Expected local gates:
- `npx tsc --noEmit` clean
- `npx vitest run` — existing `tests/camera.test.ts` must still pass
  (street-crossing contract unchanged on the Kestrel band)
- Manual: phone or emulated touch — joystick dead-zone, no stuck stick,
  E interacts without spinning camera, walk an avenue without boom pinned
  to world origin

## Provenance
- Camera corridor / street-band: this session, against expanded registry
  `playableCore` z ±48.
- Joystick: playtest notes in `style.css` touch section + field reports.
- Probe fails: recorded 2026-11-02 against tip after merges `e5d4567` +
  `87599e4` (+ later W5).
