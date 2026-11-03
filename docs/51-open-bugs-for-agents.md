# Open bugs for agents — 2026-11-03

Point-in-time ledger after the first-session-world + half-court merges, the
camera/joystick pass, and the 2026-11-03 full-docs audit.

**Rule for every agent:** When you fix an item, **update this file in the same
PR/commit**. Move it under a FIXED section, mark it FIXED, add the date,
commit SHA (or branch), and a one-line note of what changed. Do not leave
resolved items open — other agents will re-do the work.

Everything still listed under OPEN is live work for a follow-up agent.
**Parallel agents:** claim an OPEN item by marking it IN PROGRESS with your
name/date before coding; mark FIXED in the same PR when done.

---

## FIXED this session (camera + joystick) — 2026-11-02

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

### B2. M121 arrival bus not enterable (probe-subway)
- **Symptom:** `FAIL the M121 floor holds` / `FAIL the bus interior is enterable`
  (`inBus: false`, floor y 0.3).
- **Likely cause:** Collision between **W4p2 transit M121** (`engine/busRoute`,
  `buildM121`) and **docs/50 arrivalBus** (`world/arrivalBus.ts`). Two bus
  systems, one bay; interact / floor collider / enter prompt not fully wired
  to the arrival experience the probe expects.
- **Where:** `web-three/src/world/arrivalBus.ts`, `interactionDefs.ts`,
  `World.ts` bus bay, `engine/busRoute.ts`.
- **Owner hint:** Single owner for “the bus the player boards at the terminal”
  — merge or clearly separate. Do not re-introduce a second body.
- **Status:** OPEN — 2026-11-03 audit confirmed still live.

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
- Note: the 2026-11-03 audit that marked this OPEN ran on a tree cut
  before the fix landed — its reproduction agrees with this diagnosis.

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
- **Status:** OPEN — 2026-11-03 audit confirmed still live.

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

### B7. Touch UI hidden logic vs order card / map — FIXED 2026-11-02
- The `hidden-when-panel` CSS hook existed since day one; NOTHING ever set
  the class. `UI.syncPanelOverTouch()` now wires it to all four paper
  surfaces (name box, postcard, order card, Map) — the stick cannot steal
  taps from paper UI on phones. Verified on an emulated phone: Map open →
  `#touch-ui` display none.
- **Where:** `ui/UI.ts`, `style.css`, `Game.ts` mapOpen / orderCard.
- **Status:** OPEN.

### B8. KeyQ is camera-left only; some players expect strafe
- Q is camera turn (with Z). No keyboard strafe other than A/D relative to
  camera. Document in controls blurb if a help sheet ships.
- **Status:** OPEN (low priority / docs).

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

### B10. Times Square / Wow Walk beat is a note, not a postcard
- **Symptom:** The sync beat fires `tsBeats` (Game drains it) but does not yet
  call the real postcard capture pipeline. Doc 02 / Doc 07 expect a shareable
  postcard at the wonder moment.
- **Needed:** One-line (or small) swap to `composePostcard()` once the square
  vista is authored; keep the existing capture → caption → album path.
- **Where:** Times Square beat handler, postcard pipeline (already spiked).
- **Status:** OPEN — high priority for UGC / retention flywheel.

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
