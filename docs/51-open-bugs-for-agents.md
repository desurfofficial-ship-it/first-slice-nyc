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

### B3. Court ball re-pickup after miss (probe-court) — FIXED 2026-11-02
- **Was:** `FAIL re-pickup works wherever the ball came down`. Make /
  rebound / mobile paths pass; reclaim after a short miss is flaky.
- **Root cause (probe forensics):** NOT the interact range. The sim's rest
  detector could never fire for a ball rolling into the chain-link: wall
  contacts reflected at any speed (endless micro-bounce above the calm
  threshold), and the `age > 7` escape still demanded `speed < 0.8`. The
  court sat in `flight` for the full 7.5 **game**-second referee window
  ≈ 20+ wall-seconds on a dt-clamped machine — interaction disabled,
  ball unpickable, prompt frozen. The probe's one press landed mid-stuck.
- **Fix (three honest layers):** `ballSim.ts` — wall contacts below
  0.5 m/s die instead of reflecting; the grounded `age > 7` rest escape is
  unconditional. `CourtGame.updateFlight` — the referee drops 7.5 → 4
  game-seconds (a real flight resolves in ≤3; 7.5 held the court hostage
  on low-fps machines). `updateReturn` — the interaction's live spot now
  follows the ROLL, so the promised mid-return intercept actually works.
  `probe-court.mjs` — pickup retries like a thumb would + failure
  forensics (phase walk + registry dump). **probe-court: ALL PASS.**

---

## OPEN — systems / content

### B4. Full E2E on the post-W5 tip — re-run twice; one flake family named, one viewport green
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

### B4. Full E2E not re-run on post-W5 tip — re-run at the merge; the flake family is named
- The first-session merge (docs/52) ran the 4-day autotest on the merged
  tip AND on pure `origin/main`: both trees fail 1–5 of ~104 checks on the
  same box, all in one family — the wall-clock-timed dusk rails ("Rosa's
  goodnight beat", "tomorrow begins") and the awning confirm — with console
  clean every run. Both trees run ~48% slower here than the documented rig
  (442 s vs 298 s). The game behavior behind every flaked rail is verified
  by the deterministic probes (probe-subway, probe-doc12, probe-w4-*).
- **Action for a clean machine:** one full pass at the harness default
  viewport; if the dusk rails still flake, widen the driver's wait windows
  (driver-side, documented) rather than touching the day clock.

### B5. Two bus implementations coexist — RESOLVED by the first-session merge (docs/52)
- The merge retired Agent 5's street coach: the bay keeps exactly one bus
  (the M121 loop, docs/47). The arrival film now stages its own diorama
  coach 300 m south in the ride's staging space and disposes it at the
  handover — no bay mesh, no bay collider, no double interact target.
- Remaining (small): the player-enterable experience is the M121's
  BUS-04 stop; the film implies the step-off ride. If a future agent wants
  the *authored* bus interior from the film on the street, extend the M121's
  bay stop — do not add a second body.

### B6. Camera canopy list length vs occlusion buffer — TRIPWIRED 2026-11-02
- Verified structurally safe today: every canopy push happens inside the
  World constructor (`buildAlderHeightsW2` → `buildKestrelGreen` included),
  BEFORE the camera exists at `Game` field-init. The E2E driver now carries
  a `occlusionInSync()` tripwire (“the camera occlusion buffer covers every
  canopy”) so a late-growing canopy path fails the suite instead of
  silently never fading.
- Original note: `GameCamera` builds `occlusion: Float32Array(canopies?.length ?? 0)` at
  construct time. If World adds trees after camera construction without
  resizing the buffer, fade-on-occlude silently no-ops for new canopies.
- **Where:** `GameCamera` constructor, `Game.ts` boot wiring,
  `World.canopySpheres()`.

### B7. Touch UI hidden logic vs order card / map — FIXED 2026-11-02
- The `hidden-when-panel` CSS hook existed since day one; NOTHING ever set
  the class. `UI.syncPanelOverTouch()` now wires it to all four paper
  surfaces (name box, postcard, order card, Map) — the stick cannot steal
  taps from paper UI on phones. Verified on an emulated phone: Map open →
  `#touch-ui` display none.
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
