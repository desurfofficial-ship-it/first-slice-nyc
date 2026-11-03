
---
Task ID: AGENT2-FIRST-SESSION-WORLD
Agent: Agent 2 (first-session world)
Task: Build the first-session world's missing rooms — the Times Square–42nd
Street subway station (priority), the ride, the square above, the arrival
bus — per docs/02/06/07/12, on the docs/39–45 construction law.

Work Log:
- Audited docs/02/06/07/12 + AGENTS.md against the shipped world; the gaps
  were the station, the square, the ride, the busker/usher, and the bus.
- Built src/world/subway/ (zone visibility, the pure ride machine, the
  station kit, the train kit, the system index), timesSquare.ts, and
  arrivalBus.ts — all procedural, zero new dependencies, zero assets.
- Engine seams: the below-grade groundHeight law, the camera's
  interiorMode, the dollhouse (terminal + yard lift when underground).
- 8 free-roam interactions, 5 synthesized voices, far-world Map text.
- Found and fixed on the way: a tree pit over the stair mouth (walker
  shove), TSS_Group unlit-by-default leaking draw calls into the home
  rigs (+290 at CART_CORNER), the yard slab shortening the underground
  boom, and the parked train's doors never reopening after a ride.
- Probes: probe-subway 22/22 (desktop) + 10/10 (mobile portrait), E2E
  104/104, probe-solid/peds/env6 clean, registry validator OK (129 IDs).

Stage Summary:
- Branch agent2/first-session-world; the proof table and the honest
  limitations live in docs/50 (§3, §4); integration hand-offs for Main
  Agent in docs/50 §7. Full gates green: tsc, vitest 259/259, build,
  both probes, E2E 104/104, census ledger +66/+67/+14 (the M121 and the
  stair mouth only).

---
Task ID: AGENT2-SESSION-POLISH
Agent: Agent 2 (polish close-out)
Task: "Continue building and polishing. Fix bugs too." — the docs/51 open-bug
ledger plus docs/50 §4's polish debt, on the merged tip (06d8c9a).

Work Log:
- Re-based on the merged tip: B1/B2/B5 were already fixed on main (one bay,
  one bus); the stale agent-3 audit's asks (pointer-capture guard, greeting
  ladder, walker routines, Map notebook) were verified done by Main Agent.
- B3 found and fixed: the court's intercept anchor sat on the stale
  pre-return spot during the escape return — the press died whenever a
  rebound left through the gate. The anchor now rides the rolling ball;
  tests/court-game.test.ts pins the law (4 tests).
- B6 fixed: the camera's occlusion array resizes when the live canopy list
  outgrows it, and Game re-wires the reference every frame; 3 guard laws in
  tests/camera.test.ts.
- B7 fixed: #touch-ui.hidden-when-panel was dead CSS; UI.syncTouchPanels()
  now toggles it from all six panel sites.
- B8 fixed: the README controls blurb states the real bindings.
- Docs/50 §4 paid: the turnstiles spin (pure detector turnstileHubAt + 6
  laws; the previously dead turnstile voice now fires on a gate pass), the
  car ends read as an operator's cab (door + tinted glass, both ends), and
  the square's crowd came alive (statics breathe; a crosser, a gawker;
  the two shipped movers were caught walking SIDEWAYS and now face travel).
- New probe-polish-shots.mjs: in-engine evidence, console clean, arms
  measured spun; shots in web-three/shots/polish-*.png.

Stage Summary:
- Branch agent2/session-polish; full report in docs/52. Gates: tsc clean,
  vitest 380/380, build clean (1,030.3 kB), probe-subway ALL PASS,
  probe-court ALL PASS, probe-w4-bus OK, probe-solid ALL CLEAN,
  probe-peds OK, registry validator OK (129 IDs), full E2E AUTOTEST OK:
  0 failures, 388 s, console clean. docs/51's Agent-2-owned set is closed.

---
Task ID: AGENT5-FIRST-SESSION-MERGE
Agent: Agent 5 (first-session environments → the merge)
Task: Merge the parallel first-session branch (docs/48, base a5bc3d6) onto
the first-session-world tip (ced660d) — no conflicts, all gates green,
first-session content above everything.

Work Log:
- Audited both implementations (docs/48 vs docs/50): two subways, two
  Times Squares, two arrival buses existed across the branches. Reconciled:
  docs/50's world is the paved path; the duplicate geometry
  (firstSession.ts, the z −80 district row, the street coach) is retired.
- Landed additively: the arrival film re-targeted onto its own diorama
  coach (the bay keeps one bus; Game's openCoachDoor retired), the
  stair-glue + floor-snap-down laws united with the below-grade law in one
  groundHeight, pedestrianSpeedCap (the cab-yield deadlock fix),
  bandOfLoop (the W4 band law extracted pure, crowd tests re-pinned).
- New driver contract: the film runs for humans; drivers skip it via
  ?autotest/?probe/navigator.webdriver; ?film=1 opts the film's probes in.
- Correction (same session): the "two main-tip breaks" I logged here
  first (the Pages trigger, the hydrant loop) were display artifacts of my
  audit tooling — it strips `[h`/`[m` sequences from output. Byte-level
  verification shows both files were always correct; nothing was fixed
  because nothing was broken (docs/52 §3).
- Found and fixed my own regression: the W2 playground route rode the
  pergola rail by the old snap-circle; the honest stair law refused it.
  The route now walks the kit's east lane like a person.
- Probes: probe-subway 22/22 + mobile ALL PASS, W1/W2/W3 ghosts PASS,
  W5 PASS, solid CLEAN, peds/w4-bus/freeroam/boot OK, doc12 clean, the
  film's probes (a5c/a5f) clean. tsc clean, vitest 390/390, build clean.

Stage Summary:
- Merge commit on agent5/merge-to-main → pushed to main. The
  reconciliation record is docs/52; docs/47 got the log entry; docs/51's
  B4 (E2E re-run, the environmental flake family named) and B5 (one bus,
  resolved) are updated. Known open: the e2e dusk rails flake on slow
  machines on BOTH trees — driver-side wait windows, not the day clock.

---
Task ID: AGENT5-E2E-FLAKE-FIX
Agent: Agent 5
Task: Close docs/51 B4 — the 4-day autotest flaked 1–5 of ~104 checks on
slow machines (both the merge tip and pure main).

Work Log:
- Instrumented the failing rails with per-second state traces; the traces
  plus the volley code showed the race: the interact volley's break list
  lacked lingerStage (one volley = goodnight + day roll), and three beats
  checked once immediately after one volley (the awning's nearest body can
  be Idris — the press serves instead of offering).
- Driver-only fixes in src/game/autotest.ts: lingerStage joined the volley
  breaks; pressUntil(cond, budget) presses the real input path until the
  beat reacts; the day-roll checks poll s.day instead of sleeping.
- Evidence: two consecutive full runs 0 failures (476 s / 477 s, 127
  checks each), console clean, on the box that used to flake.

Stage Summary:
- docs/51 B4 closed; docs/47 entry appended. Game code untouched — the
  deterministic probes were already green throughout.
Task ID: AGENT2-DOCS51-B3-COURT-REPICKUP
Agent: Agent 2
Task: Pick a bug from docs/51-open-bugs-for-agents.md and fix it; push to
main (working in parallel with other agents).

Work Log:
- Picked B3 (owner hint: half-court agent / Agent 2): probe-court's
  "re-pickup works wherever the ball came down" flaked.
- Reproduced the pass state (probe-court 4/4 clean on this box — flake,
  not constant), then built diagnostics instead of guessing:
  diag-court-repickup.mjs (charge-hold sweep, state snapshot at every
  press) and diag-find-gate-exit.ts (deterministic gate-exit shot pairs
  from the real release path — stand (45.0, 5.6), charge 0.30).
- diag-court-return.mjs proved the mechanism in-engine: when a rebound
  exits the gate, settle() puts the court in 'return'; pickUp() accepts a
  mid-roll intercept, but the registry's 2.1 m range check reads
  COURT_BALL_REST — frozen at the pre-shot spot for the whole 1.15 s roll —
  so a player standing next to the rolling ball gets NOTHING from the
  press. Exactly the probe's flake (waitSettled resolves during 'return',
  standByBall presses beside the ball).
- Fix (15 lines, CourtGame.ts): the hotspot rides the ball — synced at the
  settle()→'return' transition and every updateReturn frame, the same law
  updateRest already applies at rest.
- Guard (AGENTS.md §1c): tests/court-game.test.ts — 5 tests pinning the
  law (rest pickup, hotspot-rides-the-roll, mid-roll intercept, honest
  homecoming, pinned gate-exit arrival). Red-green proven: the two
  intercept tests fail on the pre-fix code, pass with the fix.
- Gates: tsc --noEmit clean; vitest 395/395 (23 files); probe-court ALL
  PASS ×2 post-fix; diag-court-return flips to "intercept press WORKS".
- docs/51 updated in the same commit: B3 moved under FIXED with the
  mechanism, verification, and the kept diagnostics.

Stage Summary:
- B3 closed on main. The court's intercept promise ("a real pickup-game
  move") is now reachable, not just declared. Remaining OPEN in docs/51:
  B1 (subway stair y), B2 (M121 enterable), B4 (dusk-rail flake, needs a
  clean machine), B6-B14.
---
Task ID: AGENT2-DOCS51-B10-WOW-CARD
Agent: Agent 2
Task: Pick a bug from docs/51-open-bugs-for-agents.md and fix it; push to
main (working in parallel with other agents).

Work Log:
- Rebased the uncommitted B10 work-in-progress (a previous session's
  composeWowPostcard) onto the 11 commits that landed on main meanwhile
  (B3/B6/B7/B8 fixes, the bug-hunt pass, the arrival rebuild); stash →
  pull → pop applied clean, upstream's timesSquare changes were crowd
  behavior only, the beat drain site and capture pipeline untouched.
- Authored the capture pose through four diagnostic shots
  (diag-wow-card.mjs): facade-hug (screens peeking at the frame top) →
  far straight-on (screens small, bare wall) → red-steps steep (black
  void, falling-over tilt) → SHIPPED: straight-on from the plaza edge
  (-326, 1.9, 10.5 → -326, 13.5, -7.9) — the stacked south tower warm
  and centered, sky band above, storefront rhythm below.
- Closed two race/contract gaps on the way:
  1. freeze while the card is up (the B7 paper-holds-hands contract;
     also closes the walk-away race — the moment cannot be half-lived),
  2. the day-end compose now clears wowPostcard, so a late day card can
     never lose its postcardRig cleanup to the Wow card's light-path Stay.
- Completed the B7 wiring the fix implied: syncTouchPanels() now rides
  showPostcard/hidePostcard (the panelUp check already read
  postcardPanel; the calls were never wired).
- Gates: tsc --noEmit clean; vitest 419/419 (24 files, 5 new
  wow-postcard guards); bun build clean; diag-wow-card.mjs in-engine:
  beat drains → panel at +1.5 s with a real PNG card, "Back to the
  square", frozenWhileUp=true, dismiss closes + unfreezes with
  step/day untouched; console clean (pre-existing GL warnings only).
- docs/51 updated in the same commit: B10 moved under its own FIXED
  entry with mechanism, verification, and kept diagnostics.

Stage Summary:
- B10 closed on main. The wonder moment now keeps its paper: the sync's
  shareable postcard rides the existing capture → caption → panel path,
  the story machine stays sacred. Remaining OPEN in docs/51: B4 (needs a
  clean machine), B5-recheck, B9, B11-B14, plus docs/53's follow-ups.
---
Task ID: AGENT2-DOCS51-B11-SUBWAY-UNIVERSITY
Agent: Agent 2
Task: First-session world completion (mission two) — audit the shipped world
against docs/02 and close the real remaining gaps; push to main (parallel
agents on the same repo).

Work Log:
- Fresh clone (the sandbox reset). Audited docs/50's honest limitations
  against main: §4.1 opening hand-off PAID (7b6b680), §4.2 postcard hook
  PAID (my B10), §4.3 crowd PAID, §4.5/§4.6 PAID. Audited docs/02 beat by
  beat: arrival, Rosa's hand, the rush, the square, the cart, Idris, the
  fire escape, the postcard — all proven by the E2E driver; the record shop
  (B-side Records, SMB-02) exists with bin interactions; the busker coin
  exists. The one real content gap left: B11's VISUAL layer — Doc 02's
  Subway University draws two lines on the window and Map copies them
  badly, and nothing on screen ever drew.
- Built the window diagram (trainKit): four chalk strokes on the middle
  window's inside face of each ALIGNED car — gold "stays with the lights"
  (the K stripe's color), teal dipping "under the river". Hidden until the
  ride's priya-lines beat (t 8.5 < swap t 12), hidden again at rest; both
  twins carry identical copies so the seam never shows the trick.
  SUB_Diagram_* joined ZONE_KEEP_RE (the bake-detach class from docs/53).
- Built Map's crooked copy (sketch/UI/GameState/Save): page 1's bottom-left
  margin doodle, badly drawn by law, latched by the map-copies beat, riding
  the v1-safe save field map_priya_lines; revealed on Map's next open —
  the fold never opens itself.
- Probe work the fix earned (probe-subway, now ALL PASS / 30 laws):
  walkUntil() polls instead of napping (software-GL boxes cover less ground
  per wall-clock second — the exit-stair law failed them uselessly); the
  sync check reads the new machine latch timesSquare.syncedToday instead of
  racing the 2.6 s breath window; the M121 board waits for BUS-04's shell
  (the one-bay law retires it while the loop M121 parks — the probe raced
  the circuit); and the probe now LIVES the B10 flow — the Wow card froze
  the walker at the sync ON PURPOSE, the probe puts the paper down like a
  player (Stay) and the walk resumes. Two new B10 laws pinned there.
- docs/51 updated in the same commit: B11 → FIXED (mechanism + evidence),
  B9 → FIXED (verified paid by 7b6b680; docs/50 §4.1 hand-off closed).

Stage Summary:
- B11 closed on main; Subway University now draws — the window chalk and
  Map's crooked copy are the teach's pictures, deterministic and probed.
  B9's ledger entry caught up with the shipped boot. Gates: tsc clean,
  vitest 437/437, build clean, probe-subway ALL PASS (30), E2E 0 failures
  / 344 s / console clean. Remaining OPEN in docs/51: B4 (clean machine),
  B12 (evidence hygiene), B13 (perf ledger), B14 (docs hygiene).
