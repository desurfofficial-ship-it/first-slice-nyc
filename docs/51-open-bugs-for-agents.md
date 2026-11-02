# Open bugs for agents — 2026-11-02

Point-in-time ledger after the first-session-world + half-court merges and the
camera/joystick pass. **Fixed in this session are marked FIXED.** Everything
else is open for a follow-up agent.

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

### B3. Court ball re-pickup after miss (probe-court)
- **Symptom:** `FAIL re-pickup works wherever the ball came down`. Make /
  rebound / mobile paths pass; reclaim after a short miss is flaky.
- **Likely cause:** Interact range vs ball rest position after rebound;
  `CourtGame` phase not returning to `idle`/`loose` cleanly; or the ball’s
  world position drifts outside the court’s interact AABB.
- **Where:** `web-three/src/court/CourtGame.ts`, `ballSim.ts`,
  `interactionDefs.ts` court interaction, `scripts/probe-court.mjs`.
- **Owner hint:** Half-court agent / Agent 2.

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

### B6. Camera canopy list length vs occlusion buffer
- `GameCamera` builds `occlusion: Float32Array(canopies?.length ?? 0)` at
  construct time. If World adds trees after camera construction without
  resizing the buffer, fade-on-occlude silently no-ops for new canopies.
- **Where:** `GameCamera` constructor, `Game.ts` boot wiring,
  `World.canopySpheres()`.

### B7. Touch UI hidden logic vs order card / map
- `#touch-ui` uses `hidden` and `hidden-when-panel`. Confirm order-card and
  map-notebook open states still hide the joystick (otherwise the stick
  steals taps from paper UI on phones).
- **Where:** `ui/UI.ts`, `style.css`, `Game.ts` mapOpen / orderCard.

### B8. KeyQ is camera-left only; some players expect strafe
- Q is camera turn (with Z). No keyboard strafe other than A/D relative to
  camera. Document in controls blurb if a help sheet ships.

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
