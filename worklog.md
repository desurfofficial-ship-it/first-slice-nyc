
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

## 2026-11-03 — agent5: the arrival rebuilds its world (portrait-first pass 3)

The field report said "the shitty building is still there." The probe agreed:
portrait frames at t=1–5 showed the skyline as a flat lavender slab wall
filling the window from second one, two cloud planes parked 26 m from the
lens as giant white smears, and three ceiling lamps magnified into bright
trapezoids. Fixes, all in arrival.ts:

- Skyline moved 40 m → 110 m out (SKYLINE_Z −10): a 24 m tower now tops out
  ~10° above the lens — a distant dusk band with sky above it, not a wall.
  Far haze row 130 m, lowrise shopfront band IN FRONT of the towers at 98 m
  (20 buildings, wide enough to own the horizon), city apron widened/deepened
  to own the ground from 86 m out.
- One wide far-ground slab (200×200, dusk olive) under everything from the
  strip's far edge past the skyline + three flat-shaded horizon mounds —
  no seam of naked sky can open between countryside and city floor.
- Every ride material now fog:false — the world's amber Fog(40,170) would
  wash a 110 m skyline to soup; the painted haze rows do that job instead.
- Tower faces: darker charcoal-plum bases, edge-shading columns so
  neighbours never fuse into one slab; haze mix unchanged.
- Clouds re-staged 138–165 m out behind the towers; sun glow 150 m out,
  34 m plane, towers silhouette against it.
- Interior lamps: smaller, warmer, recessed under a dark valance.
- Staging moved −150 → −190: the map's west row (x ≈ −60) leaked into the
  ride cone's right edge at 146 m as a fog-washed sliver; cone math + sky
  dome far-plane math documented at RIDE_POS.
- Birds now actually ride the staging (they were staged at group x −19 from
  an older origin and had never been visible).

Gates: tsc clean; vitest 428/428 (24 files); build clean; probe
probe-arrival-portrait.mjs (720×1280) frames t1/t3/t4.8/t6.5/t8.2/t9.6 +
driver/reply/card all judged clean — no leaks, no slabs, no smears;
a5c landscape probe handover state unchanged, console clean.

---
Task ID: 3
Agent: Z.ai (GLM)
Task: Fix bugs and keep polishing (the Map unreachable by thumb); upgrade the Map; work the GDD-audit thin-places list; keep main green through four concurrent-agent merge waves.

Work Log:
- Found the real "still not seeing the map": #hud is click-through and the buttons never opted back in — every keyboard test passed, the thumb path was dead (no M key on phones). Fixed with #hud button pointer-events + a labeled Map chip; the E2E harness gained a pointer-path guard that clicks the real buttons.
- Upgraded the Map per the audit: page 1 now carries Map's own pencil sketch of the neighborhood — streets from the first fold, nine places revealed only by walking to them (5 m, throttled), the gold star at your feet; map_places rides the save v1-safe. Untangled duplicate map-panel/order-card blocks the merge churn had left in index.html.
- Audit list: zero-fail sweep (every card x every reply + clamp cases, money law), two orphan slang cards wired (bodega, on line — the margins can now hold all four), a save fuzz wall (fields x wrong shapes + truncation + byte flips), and the day-kept jingle from the existing synth.
- Closed the dusk-rail flake family driver-side: the reach-top trigger re-parks the capsule east, so the day-3 goodnight pad was out of range — walk back in + pressUntil + a dismount camera snap (its yaw had drifted until KeyA walked east).
- Surfaced and repaired a bad foreign commit (GameCamera gutted to a one-word placeholder; stationKit to PLACEHOLDER_WILL_FAIL), kept the known-good files, and merged four concurrent-agent waves (bus B2, first-session world, Wow Walk postcard, vertex bakes) with every gate green at each step.

Stage Summary:
- main = ed1e24d, deployed and live-verified: the labeled Map chip opens the notebook with the sketch on production. tsc clean; vitest 430/430; E2E AUTOTEST OK 0 failures / 351 s / console clean; probe-court, probe-subway, probe-doc12 all pass.
- The audit's open tail (needs design/owners, recorded in docs/51): postcard share sheet + album, Regulars arcs beyond Day 4, audio stems.

---
Task ID: 4
Agent: Z.ai (GLM)
Task: Work the GDD gap list (postcard album + share sheet; the skyline of lit windows); verify the merged tree end-to-end; keep the protocol logs.

Work Log:
- Confirmed the prior session's push had landed (origin/main == local; the "ahead 9" was a stale ref) and that ed1e24d carried its recorded E2E green — no backlog to push.
- Closed the postcard gap: Keep now files the card on an album shelf (quarter-size print, capped at 24, quota-degrading, v1-safe localStorage beside the save) and the platform share sheet takes the card as a file where the Web Share API can — the Share button exists only there, honestly hidden elsewhere. Album panel in the Map's paper language; the HUD gains the mirrored folded-corner chip "Album (n)".
- Closed the skyline gap: ~200 seeded lit panes on the far towers via one InstancedMesh (one draw call, fog off) + a day-keyed far diary (dark until Day 3, warm from Day 3), deterministic by unit tests.
- Found and fixed a real bake predator: bakeStatics treated the InstancedMesh as a plain Mesh — one phantom pane at the origin replaced the whole instanced draw (the canopy had only dodged it by build order). The bake now never touches instanced draws.
- Both probes added and green (album thumb-path 4/4; skyline materials + evidence frame); curated frames into assets/web-three/frames/.

Stage Summary:
- tsc clean; vitest 457/457 after the agent5 merge; build clean; E2E AUTOTEST OK 0 failures / 432 s / console clean on the merged final tree (3c3b7f4).
- Gap list after this pass: Regulars arcs beyond Day 4 (needs design), audio partner outreach (business, not code), touch panel hardening on real devices (the B7 contract now covers the album too).
- Push needs a fresh token (none on disk; the repo is public, so fetch works anonymously).

---
Task ID: 5
Agent: Z.ai (GLM)
Task: Push the docs/54 album pass through the arriving agent5 waves; keep every gate green at each merge.

Work Log:
- Fetched into two fresh waves (canopies/landing stairs 4356ba7, then the shopfront that grows a shop 339141c); both merges clean, neither touches album/bake/skyline.
- Re-gated at each merge: tsc clean, vitest 457/457, E2E AUTOTEST OK 0 failures (353 s, then 356 s), console clean both times.
- The sandbox had recycled the playwright browser cache — the first E2E launch died with a silently empty log. Diagnosed (backgrounded stdout does not survive the tool-call boundary; a pty wrapper is policy-blocked), reinstalled chromium, and adopted launch-and-poll inside a single call.
- Pushed main through both waves: 339141c..42a112a; the token was never written to config, verified clean after.

Stage Summary:
- main = 42a112a, all seven docs/54 commits live on origin. Gap list unchanged: Regulars arcs beyond Day 4 (needs design), audio partner outreach (business, not code), touch panel hardening on real devices.

---
Task ID: 2
Agent: Z.ai (GLM)
Task: docs/55 — the Phase 1 exit checklist (Doc 07 §9 gate mapped to real probes). Checklist + evidence paths only; no new features.

Work Log:
- Fresh clone (sandbox had recycled); tip 4b385b2. Read Doc 07 §8–§9, Doc 06 Phase 1 + §7 DoD + §9 fridge test, docs/51 (B12–B14 are the only OPEN items), AGENTS.md.
- Inventoried every evidence path cited: 26 test files, ~86 probe/diag/visual scripts, world/game/ui sources. Baseline on the tip: tsc clean, vitest 457/457 (suite grew 419→457 from parallel agents' guards).
- Wrote docs/55-phase1-exit-checklist.md: one checkbox per Doc 07 §9 criterion (5), each with exact commands, pass/fail rule, evidence path, owner blank; VS-F01–F10 mapped to current-main files + existing probes; B12–B14 under "must clear before exit"; honest gaps named (device farm, 10-tester panel, fridge print, 1-Second Law audit — all manual, tooling listed).
- False-alarm worth the ink: the Pages deploy trigger read as `branches: ain]` in command output and nearly shipped as a "fix". Blob-hash proof (`git hash-object` == `HEAD:` blob) + `od -c` showed the file was always `branches: [main]` — this sandbox's command OUTPUT strips `[m` sequences (ANSI-escape detection). A `printf 'x [main] y'` experiment confirms. Lesson recorded in docs/55 §3 B14: when command output and the file API disagree, trust `git hash-object` + `od -c`; never ship a fix whose only evidence is pasted output (the docs/51 lesson, met in the wild).
- docs/51 untouched this session: B14's conditional was "update if you touch stale links" — no stale link existed to touch. B12–B14 stay OPEN, now visible from docs/55.

Stage Summary:
- docs/55 on main: the exit gate is now runnable — every criterion has a command, a pass rule, an evidence path, and a blank owner. Zero production code touched; tsc clean, vitest 457/457.
Task ID: 6
Agent: Z.ai (GLM)
Task: Close the dialogue-robustness gap — verify VS-F03's "8 order types + chef's welcome v0" with tests that cannot rot.

Work Log:
- Audited the serving conversation against docs/07 VS-F03: the eight cards exist (five counter + three cart), zero-fail was already swept, but the count, the chef's-welcome-on-every-card law, margin-slang safety, and any live press of the chef's welcome were all unguarded.
- Added tests/content-order.test.ts (5 pins: the exact eight, chef's welcome on every card, well-formed paper, docs/12 teach lines verbatim, margin-slang safety).
- Added the payoff-not-a-branch pin to the zero-fail describe: card 5's nine-years note lands on every reply.
- The E2E now presses the chef's welcome on card 5 — the kit's four always-available gestures each have a live beat; Rosa's quiet line proven to ride every choice, live.
- First E2E of the round ran 555 s under load and failed 31 timing-gated day-2+ checks in a cascade; clean re-run at 356 s. Recorded as a known flake shape (dusk beats starve under load), not fixed this round.

Stage Summary:
- tsc clean; vitest 463/463; build clean; E2E AUTOTEST OK 0 failures / 356 s / console clean.
- Gap list: Regulars arcs beyond Day 4 (needs design), audio partner outreach (business), touch panel hardening on real devices, the dusk-beat flake shape under load.

---
Task ID: 7
Agent: Z.ai (GLM)
Task: Repair the pocket wave (undeclared UI properties; thumb path moved under a dropdown) and land the eight-orders audit through three merge waves.

Work Log:
- Merged three incoming waves (phase-1 exit checklist docs/55, mobile note-overlap fix, the Pocket menu). Renumbered my audit to docs/56 — docs/55 was claimed concurrently; both worklog entries kept in the merge.
- Found origin/main did not typecheck: the pocket commits used pocketBtn / pocketMenu / audioPeek without declaring them. Declared all three in UI.ts following the existing el() field pattern.
- The pocket also broke the E2E pointer guard (Map/Album/Sound now live in a hidden dropdown). The guard now rides the real thumb path — open pocket, press tool — and pins the pocket's own click law (6/6 PASS).
- Gates on the final tree: tsc clean, vitest 463/463, E2E AUTOTEST OK 0 failures / 378 s, console clean.

Stage Summary:
- The eight-orders audit + pocket repair are on main. Gap list: Regulars arcs beyond Day 4 (needs design), audio partner outreach (business), touch hardening on real devices, the dusk-beat flake shape under load.

---
Task ID: 2
Agent: Z.ai (GLM)
Task: docs/51 B13 — measure the top-3 costs on a full Kestrel + Times Square view; apply ONE construction-law perf fix; re-measure before/after. No new features.

Work Log:
- Baseline on 9f91778 (pulled 7 incoming commits first; 463/463 green before touching anything): diag-perf-breakdown PLAZA 470 / CART_CORNER 408 / SYCAMORE 134 / TIMES_SQ 222 / PLATFORM_A 179. probe-perf: boot 236, mid-street 302, plaza-life 432.
- Top-3 identified with a new per-family shadow census (diag-shadow-census.mjs): (1) the shadow pass re-renders every person's 9-13 body-part meshes — characters+peds were 69 of PLAZA's 132 shadow calls for ~1.2k tris; TIMES_SQ's shadow gap was 161 on a 61-mesh view; (2) named-world props 56 shadow calls; (3) every person allocated a fresh material per part per body (World.buildPerson's factory was per-call).
- The ONE fix (material share + merge, the statics' own law): personRig now bakes every part's color into vertex attributes on ONE shared MeshLambertMaterial({vertexColors}) — white × vertex color is bit-for-bit the same shade (the W0 bake law) — and merges each rigid same-pivot part group into one mesh (the W4p2 dusk-pair method). 6 meshes per person, down from 9-13, in BOTH passes. Pivots/animation/updatePersonAnim untouched; rig factory param retired through all 6 call sites (World, peds, timesSquare, arrivalBus) — one paved path.
- After (same rigs, same method): PLAZA 406 (−64) / CART_CORNER 337 (−71) / SYCAMORE 115 (−19) / TIMES_SQ 130 (−92, −41% — the square is UNDER 150) / PLATFORM_A 146 (−33). probe-perf: 186 / 257 / 362. Tris bit-stable ±0.04%. Materials per person bucket 12-33 → 1. No rig regressed.
- Gates: vitest 463/463 (rig.test.ts gained the permanent guard: 6 meshes, one shared material instance, vertex colors ride, uv dropped, both passes cast); tsc clean; probe-characters after (slide 2.7% — feet still plant; identity shots kept shots/characters/after-*.png); probe-subway ALL PASS; probe-court ALL PASS; probe-doc12 green; full E2E AUTOTEST OK 0 failures 354 s.
- docs/51 B13 updated in the same commit with the numbers + evidence paths. B13 stays OPEN (Kestrel plaza rigs still over 150 — sign boards + prop cast-shadow discipline are the next levers, still held for an art call per docs/47).
- THE PARALLEL LANDING, told honestly: origin advanced mid-task with agent5's cb1e880 — the IDENTICAL person material law, built independently (six-draw figures, shared vertex-color material, same rigs measured). Per the one-paved-path rule the merge (27d1803) kept main's implementation wholesale: my duplicate personRig change and my two near-duplicate diagnostics (diag-shadow-census, diag-identify-unnamed — main already carries diag-shadow-price/frontier/rig-xray/unnamed-xray) were dropped in the merge resolution. What survives of this task: the verification record for the two rigs agent5's ledger never published (TIMES_SQ 222 -> 130, PLATFORM_A 179 -> 146, re-measured on the merged tree) and the session's full five-rig before/after trail. Two agents reaching the same law from the same measurement is the strongest signal the law is the law.

Stage Summary:
- One construction-law fix, measured honestly, every rig improved, zero gameplay or look change. Person material law is now a test-guarded rule.
## 2026-11-03 — agent5: the gate grows a terminal (arrival pass 4)

The probe saw it and so did the studio frames: the arrival card's backdrop
was one dim slab and a floating GATE 12 sign — the push-in spent its whole
two seconds staring at a void, and the portrait card read as signs hanging
in nothing. Fixes, all in arrival.ts buildCoach():

- The terminal face is built: precast bays with panel reveals and pilasters,
  a head house with a coping and a rooftop water tower, a lit centre
  entrance under a glowing hood (panes, stile, push bars, kick), a ticket
  window, a departure board (amber rows over ink, unreadable on purpose),
  light pools under the poles and the door, a bench and a bin in the lane,
  and past the parapet the lit skyline you watched from the bus window —
  six dark towers, seeded amber windows, the ride's last promise kept.
- Apron widened 26 → 32 so the dusk grass no longer peeks past the
  facade's east end.
- Two rasterizer lessons banked the hard way (documented in the code):
  lit signage flies as a bare plane 0.06 north of the wall with NO backing
  board — a casing's face lands a depth-tie away and the software GL hands
  the tie to the dark box; and every lit face keeps ≥0.03 of real air in
  front of what backs it. Diags that proved it: scripts/diag-gate-prod.mjs
  (production frames, both orientations) and scripts/diag-gate-set.mjs
  (scene census + standalone-camera studio frames).

Stage Summary:
- tsc clean; vitest 469/469 on the merged tree (with the curb-bake wave);
  build clean; probe-a5g both orientations ok; probe-a5c + arrival-portrait
  ERRORS: none. Pushed main 3f4a61a..1220c72, merge clean, Pages CI success.
- Next gaps: the card's title-dim could drop a touch darker so the new
  lights punch harder; the door-slide moment could carry a warm interior
  spill through the open doorway.

## 2026-11-04 — agent2: B12 closes — the visual-audit follow-ups, fix or accepted risk (docs/51 B12 + docs/31)

Doc 31's CLEAR prop pass was still OPEN on main, gated on "one in-engine
look". The look happened, twice over: all 14 published evidence frames were
re-captured fresh on main, read frame-by-frame here, and every vision-CLI
reading was cross-checked against the code before anyone touched anything —
the code won several times (the antenna is attached by construction; the
streetlights carry base collars; the AC units are seated; the white sphere
cluster is the designed manhole steam). The audit's own instrument rules
held: never ship a fix whose only evidence is a model's misread.

What the look surfaced beyond Doc 31's list:
- B12 items 1–2 had not fully landed: the plaza + brownstone frames still
  wore Day 1's $87 on main (the day was staged only where the wallet
  contrast bites), and every frame committed before the Pocket HUD carried
  the retired music-toggle chrome.
- The visual-d4b follow-cam poses stopped landing as the street grew: on
  main the sal-counter boom parked INSIDE the laundry awning and the
  committed frame was unreproducible. Evidence-pipeline rot, not art rot.

The closes (probe-only, zero src/ changes — no gameplay surface):
- visual-d3: chapter-wide Day-3 staging ($111 + step 21's flyer objective),
  boot toast retired, plaza parked pose (flyer board + pigeons + BUS
  TERMINAL sign own the frame; the M121 shell holds the right edge).
- visual-d4: stranger_terminal parked east of the pair (the west side was
  tried and rejected — plaza trees eat every sight-line); she_walks stages
  the beat's own choreography (the cab at World.CAB.holdCenterX, loop
  frozen for the frame); the dusk four-windows wears its own objective.
- visual-d4b: park/unpark helpers for all five shots, per-shot objectives
  (D4_CLIMB4 on the receipt frames), toast hygiene, and poses that put Sal's
  counter, the laundry bay, the A-frame's notice face, and the cart sign
  where the beats say they are.

Accepted risks written where fixing would be art: teal door child-scale,
brownstones' empty lower half (a closer stand was tried — the trees eat the
doors), frame-edge crops, the collarless procedural streetlamp fallback.

Stage Summary:
- 14/14 frames re-captured on main @ fe257c0 world; tsc clean; vitest
  469/469; build 447 ms; all three visual probes run with zero pageerror.
- docs/51 B12 → FIXED with the per-item verdict table; docs/31 header now
  points at the close-out. No probe assertions touched (frames are evidence,
  not gates); no docs/51 links changed.

## agent5 — first-session Doc 02 alignment pass (the walkthrough audit)

The user pinned docs/02-first-session-walkthrough.md as the first session's
contract. Audited every beat against the build: the driver exchange, Map's
note, the upside-down Map line, the delivery tutorial, the starter trinity,
Mr. Idris, the Shuffle note, Priya's window lines + Map's crooked copy, the
usher's promise line, the busker coin, B-Side Records, cart naming, $87 →
$112, the gold window payoff, "Lights out, rookie!", the key jingle and the
"regulars are waiting" postcards — all shipped. Three beats were missing;
this pass builds them:

- WHO GOT OFF THE BUS (Doc 02 §0:00–2:00): six starter characters
  (core/starters.ts — Dee/Marisol/Ms. Ada/Booker/Sixto + The Regular, the
  shipped courier look byte-kept for drivers, probes and old saves). The
  pick card opens at the film handover, humans only (?pickcard=1 is the
  harness hatch, ?starter=<id> dresses directly); a pick rebuilds the rig
  (same boxes — personRig's law), carries the cup, gives Dee her board
  (Starter_Board), persists as a v1-safe save field that old blobs parse
  byte-identically (the schema-freeze test caught the first draft).
- THE SLEEPING NEIGHBOR (Doc 02's opening line): the ride interior now has
  the passenger in the netted trucker hat asleep against the glass — the
  real person rig (personRig sit mode) at the shell's dollhouse scale under
  the 36° cine lens, cap + mesh back + teal patch riding the head pivot,
  head bowed, a ±6 mm breath in frame(). Half-cropped by the mullion, the
  way a neighbor is; portrait's narrow cone keeps its clean window.
- B-SIDE RECORDS' HAND-WRITTEN SIGN (Doc 02 §15:00–20:00): "Back soon. /
  The city knows when." taped inside the door glass on the SOUTH facade
  (the first draft taped itself to the building's rear — wallRun's `at`
  is the wall plane, not the room's near face), hand-drawn underline and
  two tape strips on the canvas.

Stage Summary:
- tsc clean; vitest 477/477 (starters.test.ts +8: the pick-card contract,
  the classic look byte-kept, the save round-trip); build 4xx ms.
- probe-a5h-first-session.mjs: ?starter=dee wears the pick (board assert),
  the film handover shows the six-tile card, tapping Dee folds the card and
  mounts the board, B-Side's sign framed on its facade. a5g re-shot both
  orientations — the neighbor reads in landscape, portrait stays clean.

## 2026-11-04 — agent2: the playtest gate gets its plan (docs/56 — Doc 07 §9 device + playtest evidence)

Doc 55 boxes 1 (device layer) and 2 (playtest targets) needed evidence no
probe can produce: a person, on a phone, staying for the whole first session.
Docs only this session — zero src/ changes. New
[docs/56-phase1-playtest-plan.md](docs/56-phase1-playtest-plan.md):

- The 30-min first-session script as an observer table — minute markers taken
  ONLY from Doc 02's own section clocks (0:00 arrival … 26:00 first postcard),
  each row saying what to record, never what to do. Beat divergence on main
  is a docs/51 finding, not a plan edit.
- Funnel metrics copied verbatim from Doc 07 §8 (reach postcard ≥ 85%,
  share intent ≥ 70%, looked-after ≥ 4/5, learned-repeatable ≥ 80%,
  25–35 min with no drop before minute 12, residents ≥ 2/3) plus the VS-F05
  bar (10/10 keep, ≥ 6 send) — each with its manual capture proxy.
- Device matrix: iPhone 11-class + Galaxy A14 (the §9-1 named pair) + desktop
  control; ≥ 3 full human sessions per mobile column; desktop replays any
  mobile failure once to classify device debt vs design debt.
- Per-session captures: crash log (console export even when clean), session
  length (three numbers), postcard Y/N unaided, share intent (touched +
  stated, never prompted), and exactly three interview questions with
  scoring rules (Q1 looked-after/where, Q2 repeat-a-fact verbatim, Q3
  resident true/off detail).
- The single results ledger — empty on purpose, 12 rows — plus a logging
  protocol with teeth: append-only, no evidence dir = no row, corrections
  are new rows, tallies compute over Type=human only, agents may log
  Type=pilot rows (docs/21 honesty rules inherited) and must never write a
  human row. Box 2 of docs/55 turns green only when row 10 lands.

The honesty finding of the pass: Doc 07 §6's instrumented funnel
(`session_start → … → session_end`) is design-only — nothing in
`web-three/src/` emits it (grep at baseline `b257ff3`; no telemetry module).
Every metric in docs/56 runs on a manual proxy instead; wiring the funnel is
feature work, declared out of scope, and marked unfinished per house style.

docs/55 updated in the same commit: boxes 1 and 2 now carry "Operational
plan: Doc 56" pointers, and the stale forward-reference to a
`docs/56-playtest-01-results.md` was corrected — results analysis lands at
`docs/57-` or later; `docs/56-` is the plan.

## 2026-11-04 — agent2: The Shuffle verdict — the user was right (docs/51 B16)

Asked to read the docs and find out whether the Shuffle mini-game was built —
no guessing. Read every mention (docs/01, 02, 07, 08, 10, 22, 55, 56,
agent3-living-world-audit), then read the code on main @ `5f973e1`.

**Verdict: NOT built. VS-F04 is a stub.** The docs demand a crowd-walk
mini-game: Doc 07 §3 "Crowd walk mini-game, forgiveness rules"; Doc 02
§10:00–15:00 "drift toward gaps; brushing someone just makes them say
'scuse me,' which is a correct interaction, not a failure"; Doc 07 TBD-3's
soft skip ("The city will wait"). What main has: `GameState.ts:444
cross(atStrip)` fires ONE note (the Doc 08 #4 text at the stripes, an
own-way line elsewhere) + checkpoint + step advance — the forgiveness half
only (the docs/22 Seam-1 fix, `Game.ts:650` z < −4.1). "Scuse me" exists
nowhere outside the two note-text constants (grep across src/ + tests/):
no brush handler, no bubble, no reaction. The TBD-3 soft skip: zero hits.
The peds system is real bodies + collision courtesy (`tests/crowd.test.ts`
proves walkers yield) — physics, not a mini-game.

Corroborations: docs/agent3-living-world-audit's F04 row already said
"Missing — one flavor note when crossing; no crowd mini-game" (still true;
its other stale rows — Map UI, album, subway — have since landed). And
docs/55's F04 status note had been quoting the note text as if the brush
existed — overclaim now corrected in the same commit.

Landed (docs only, zero src/ changes): docs/51 B16 filed with the full
doc-sourced spec, current-main evidence, and a close rule (crowd on the
subway walk, brush → "scuse me" correct-interaction, TBD-3 prompt, crosswalk
forgiveness untouched; probe + unit test required). docs/55 F04 row now
reads "Stub — not the spec". The build itself is a feature-sized decree and
stays un-smuggled.
---
Task ID: 8
Agent: Z.ai (GLM)
Task: Close the dusk-beat flake shape — make the E2E's wall-clock budgets honest on a slow machine.

Work Log:
- Reproduced the 555 s cascade on purpose (two CPU burners): root cause is the game's 100 ms dt clamp — under load, game time dilates and every blind wall-clock poll starves. The guard failed first ("click fold-it"), proving the whole harness needed the same law.
- Added one measured factor, pace (60 frames ÷ clamp, cap 4×, printed as [pace]): every blind event poll rides budget() — dusk/window/postcard, day-wake, album, noteSays, cabClear, holdUntil. walkTo keeps its own progress law. The pointer guard measures the same factor in-page and stretches click timeouts + settle waits.
- Verified under sustained load: guard 6/6 PASS at ×4.00, driver 605 ms frames ×4.00, AUTOTEST OK 0 failures — the run that cascaded now passes. Idle runs unchanged (×1.00).
- Also: merged 15 incoming commits (sign atlas, phase-1 playtest plan, B12 closeout) — clean, gates re-run.

Stage Summary:
- tsc clean; vitest 476/476; E2E AUTOTEST OK 0 failures idle (380 s) and under load (553 s, ×4.00 budgets). The flake is closed, not recorded. Gap list: Regulars arcs beyond Day 4 (design), audio outreach (business), touch hardening on real devices.

## 2026-11-04 — agent2: the Shuffle builds — the walk to the stairs carries a crowd (docs/51 B16)

The decree: "build it." Docs 01/02/07/08/10/22 had already defined the spec
(B16's audit pass); the build follows it literally and adds nothing.

The shape of it (zero GameState changes, zero save fields, zero new steps —
the day machine untouched, the crosswalk untouched):
- `world/shuffle.ts` — the laws, pure and unit-owned: `brushScan` (a walker
  whose circle you cross within 1.0 m, cooldown spent, comes back as a hit —
  the return carries ONLY indices: no fail flag, no score, no counters),
  `stillTick` (movement resets, standing piles), the zone (x −49..−14,
  surface-only: descending the stairs leaves the beat), and the
  `SpeechWisp` — one shared canvas sprite, invisible at rest, so the perf
  ledger never moves for this.
- `Game.updateShuffle` renders what the laws return: the wisp hops to
  whoever just said "Scuse me."; twenty honest game-seconds of standing
  still mid-stretch surface TBD-3's "The city will wait." once per visit.
- `World.ts` — the south-side local's loop extends west −34 → −43.5 (their
  own lane, the walk to the Alder Heights stairs) + a west-end routine beat
  (pauses to look across at the terminal). ZERO new bodies: bank-shared
  rigs stay three, the census never moves.

The evidence (all logs in /tmp/fsnyc-shuffle/, screenshots in
web-three/probe-shots/ — gitignored, the probe regenerates them):
- tsc clean; vitest 487/487 (29 files — shuffle.test.ts pins 11 laws);
  build 485 ms.
- probe-shuffle.mjs SHUFFLE OK, six checks: the stretch walks west end to
  end down the local's lane (x −43.7); a walker lives on it; a forced brush
  fires the wisp at opacity 1 (shuffle-wisp.png — the player and a walker
  by the M121, "Scuse me." clean above them); no fresh show while the
  contact cools; TBD-3 surfaces the note (shuffle-wait.png).
- probe-peds PEDS OK (the west lane rides clean); probe-subway ALL PASS;
  probe-perf before→after IDENTICAL: 165/245/300 draws, same triangles —
  the B13 ledger law holds.
- e2e full 4-day: AUTOTEST OK, 0 failures, 533 s, console clean.

Two machine-honesty lessons went into docs/51 B16 for the next probe
author: software GL runs the game clock at ~0.15–0.3× wall at 900×700 (a
"20-second" wait is a 60–90-second wall wait — poll with caps, never
nap-and-assume; probe-subway's batch-tick trick doesn't apply to beats that
live in the frame loop), and westward walks must track progress as x
DECREASING (my first guard was an east-walking copy-paste and false-stalled
the run at −31.5).

## 2026-11-04 — agent5: B16 closed — the Shuffle is built; Day 1 rewritten to Doc 08's final voice

The user's decree was two-fold: finish the first session, then rewrite Day 1
like docs/08 (the Day-1 content pack). Reading docs/51's books first (the
house law) put one feature-sized build in the way: B16 — the Shuffle (VS-F04)
was a stub. So the session built it, then ran the content pass.

**B16, the Shuffle (docs/51 B16 CLOSED):**
- The crowd: six Shuffle walkers join the block (9 total) — loops on the
  bodega→plaza stretch of the north walk (lanes z 6.08–6.76, west ends at
  x −41), seeded deterministic, no street crossings, so the crosswalk law is
  untouched. Plaza pauses (the bulletin board, the bench, the bodega window)
  sit off the lanes.
- The brush law (`brushFires`, pure): contact with a WALKING player (measured
  pace ≥ 0.45 m/s) is the Shuffle's correct interaction — the walker's paper
  "'Scuse me." bubble comes up over their head (2.2 s hold, fade), one brush
  per meeting (4 s cooldown). The event payload is who/where — no fail state
  exists to lose to. The orchestrator drains the queue every frame; nothing
  counts, nothing accumulates.
- TBD-3 (Doc 07): 20 s standing still INSIDE the Shuffle stretch
  (`SHUFFLE_STRETCH` + `cityWillWaitFires`, pure) offers "The city will
  wait." — once per standstill episode, moving re-arms; sightseeing outside
  the stretch is a right. Times Square needs no gate (it never had one).
- Evidence: tests/shuffle.test.ts (17 — brush law, no-fail payload law,
  one-brush-per-meeting against a REAL Pedestrians, soft-skip, stretch
  bounds); probe-shuffle.mjs walks the stretch, presses through the crowd,
  captures the bubble mid-hold (SHUFFLE OK — money/step unchanged, TBD-3
  lands, no gate west). probe-peds re-run green.

**Day 1 rewritten to Doc 08 (the content pack):**
- Map notes: #5 (the crooked copy) now written into the notebook at the
  map-copies beat; #6 ("Trains are stubborn in a loyal way…") rides the
  first ride-end. #1–4, #7–11 were already in the book verbatim.
- Postcard 1 (Times Square) and the Day-1 close card now carry Doc 08's
  exact lines (the wow card drops its own ledger-voice; the paper still
  signs itself in the stamp block).
- NEW — the four moment cards (P2 THE RUSH, P3 THE HATS, P4 THE FOLD,
  P5 YOUR CORNER): real captures at their moments (rush end; the fire-escape
  look-up where note #7 lives; the bagel serve; the naming), filed straight
  to the album — no panel, no freeze, no story move; the first postcard
  stays the one that simply happens to you. AlbumEntry grew an optional
  shelf `tag` (v1-safe: absent reads as the kind's default; wrong shapes
  fall out, never reject the card). Poses verified on the shelf by
  probe-moments.mjs (the storefront, the doorway frame-in-frame, the tank
  against the dusk sky, the named cart across the corner).
- The e2e's album rails now count the day honestly: day 1's shelf holds
  five (4 moment cards + the kept day card), day 2's join makes six.
  probe-album.mjs had gone stale with the pocket wave (it clicked
  #btn-album without opening the Pocket) — it failed on CLEAN main too;
  fixed to its own openPocket law and green again.

Stage Summary:
- tsc clean; vitest 511/511 (+17 shuffle, +5 moment/tag laws); build clean;
  full 4-day E2E AUTOTEST OK 0 failures (554 s); probe-shuffle SHUFFLE OK;
  probe-peds PEDS OK; probe-subway ALL PASS; probe-a5h ok; probe-album
  PASS ×4; probe-moments shelf verified.

## 2026-11-04 — agent5: B13's ledger row published + the underground shadow economy landed; B14 closed

The ledger said the Shuffle phase had to publish its perf row ("never silent
regression") and named two program items for the 150 line. This session
published the row, took the first program item, and closed B14.

**The phase row, measured and published (docs/51 B13):** the six-walker
Shuffle crowd rides the six-draw person law — PLAZA 370 → 400, CART_CORNER
301 → 333, SYCAMORE×GABLE 115 → 128, TIMES_SQ 130 → 130 on the tip. The
lever (per-figure instancing) is priced and rejected: the rig bakes colors
per figure, so instancing needs shared vertex colors — the floor stays 6
draws per person. The row is published, not silent.

**The PLATFORM_A rig was staging-broken — its published numbers are void.**
The census feet (x −40, z −3.2, y −3.2) teleport UNDER the world; physics
ejects the capsule to the surface within a frame (measured: y 0, half 35,
170 calls 700 ms later). Every PLATFORM_A number to date measured a surface
player through an underground camera. The rig now stands on the fare pocket
(probe-subway's own staging) with the converged interiorMode lens.

**The underground economy (the "SUB_Root depth" program item):** below
grade the station is an open-top cutaway whose own casters live within
~15 m — so the dollhouse flip now shrinks the sun's shadow box to
SHADOW_HALF_UNDERGROUND = 18 (shadowLaw.ts, applied by
World.setUndergroundShadow: extents + texel lattice recompute + snap reset).
Same-pose A/B on the corrected dwell rig: 231 → 186 (−45, −19%). Evidence
frames (diag-underground-shots, the real lens after an honest stair
descent): the platform's own shading is unchanged — only the street beyond
the box edge stops paying. Priced and rejected on the way: sun.castShadow
kills the dollhouse look by construction; mapSize 1024 saves zero calls.
Street rigs are untouched (the economy exists only below grade).

**Wired contracts:** tests/shadow-law.test.ts (the numbers +
never-widen-below-grade); probe-subway now asserts the descent shrinks the
box (half 18, symmetric on its lattice).

**B14 closed:** AGENTS.md's header reads "Production — Phase 1 build-out on
main" (was "Pre-Production … code pending"); docs/18 carries a dated status
note (its "Still Open" list described the exit moment — all shipped) and
redirects to docs/55 + the ledger for live state.

Stage Summary:
- tsc clean; vitest 514/514 (+3 shadow-law); build clean; probe-subway
  ALL PASS ×2 (with the two new descent checks); ledger rows published in
  docs/51 B13 + docs/55 §3; rig correction recorded with the eject proof.

---

## 2026-11-04 — agent2 — the last named program: interiors' window visibility (B13)

Continued from the B16 verdict session (the Shuffle build landed by the
parallel merge; this session took the one remaining named B13 program).
The user's pointer was docs/55; its §3 names B13 the only open docs/51
item, and B13's remaining named program was "interiors' window visibility".

**The find, before any code.** diag-flat-dump at PLAZA / CART_CORNER shows
ZERO `INT_*` groups visible: the W5 far state already zeroed the interiors
at street scale — the named program was never going to move the street
rigs. Its real defect was behavioral: the shipped W5 toggle keyed the
fit-out on player proximity ALONE, so within the shell ± 1.6 m the room
conjured on whichever side you stood — behind the hall's blind east yard
it drew through masonry no window can show (measured: hall=true, 197
calls). That is the program: make the room's own windows the visibility
authority — an art feature (windows show the room exactly when a window
can show it), not a cut.

**The glass-side law.** src/world/interiorGlass.ts (pure, headless — the
shadowLaw.ts pattern): the near band shows the fit-out only on the outward
side of one of the room's registered window runs, within the run's extent
widened by the band's own hysteresis margin (enter 1.6 / exit 0.8 — band
and glass breathe together, window-edge loitering never flickers). Inside
the shell short-circuits first (the inside test's business). World
registers the runs per room, verbatim from the openings each builder cut
(laundry's shipped bay; barber/pizza/bakery/records south storefronts;
the hall's two west windows; the diner's Kestrel + avenue corner glass;
the Cecil sight-line window). Rooms that ever skip registration fall back
to the shipped band-only law.

**The numbers, honestly** (diag-glass-stance.mjs, committed; identical
stances, before = stash-rebuild of the shipped World.ts):
hall east yard 197 → 167 calls (−30, −15%) with the fit-out honestly
hidden; controls call-identical — diner north band window 165 = 165, hall
west window 169 = 169, laundry bay mouth 322 = 322; the five ledger rigs
bit-identical (PLAZA 400, CART_CORNER 333, SYCAMORE×GABLE 128, TIMES_SQ
130, PLATFORM_A 186). The 150/250 lines stay published FAIL; with this
program the named frontier is exhausted (atlas, SUB_Root depth, window
visibility) — what remains is the priced composition itself. Closing B13
against the 150 line is the owner's call; docs/51 B13 carries the row.

**Wired contracts:** tests/interior-glass.test.ts (11 law checks — glass
sides show, blind walls hide, the through-floor Cecil case, the fallback,
the hysteresis); probe-w5-interiors gained check 6 (wrong side hidden,
window sides show, in-engine).

**Probe notes for the next agent:** the diner's and barber's blind faces
have no standable floor (contiguous blocks — the capsule ejects onto the
shell, which the inside test reads); the hall's east yard is the one clean
wrong-side floor. The live feed oscillates a hair — a stance parked ON a
band edge flickers the fit-out (pre-existing, both laws); park ≥ 0.9 m in.

Stage Summary:
- tsc clean; vitest 534/534 (+11 interior-glass); build clean;
  probe-w5-interiors PASS (6 checks); probe-subway ALL PASS; probe-perf
  identical (207/281/354, zero page errors); five ledger rigs
  bit-identical; E2E AUTOTEST OK 0 failures 531 s console clean.

## 2026-11-05 — agent5: B13 — the vertex fuse: the wrappers and the never-upgraded fallbacks join the color-ride law

Synced on origin/main's 13 (touch-law B7, doc hygiene B14, the glass-side
law B13) and took the ledger's only open item. The composition note priced
the shadow pass, the cast law, the felt crowd, the tiles — but
`diag-prop-bake-audit.mjs` (new, committed) showed two families nobody had
priced: the vehicle GLB wrappers (cab 7 draws, sedan 6 — one mesh per glTF
material, excluded from the bake forever by the glbProps law) and the
fallback props whose GLB upgrade can never land (mailbox 4, trashcan 3 —
no such .glb ships, yet the placeholders stay bake-excluded for a swap
that is never coming).

The cut lives one level below the bake: `src/world/vertexFuse.ts` (pure,
the shadowLaw.ts pattern) fuses a prop's OWN parts into one vertex-colored
mesh on the shared vc material — inside the wrapper (the cab drives and
hides as a body; the bake law untouched) or in the builder pre-position.
Bail law: any mapped/transparent/emissive/metallic/double-sided/skinned/
unindexed/flag-mixed part bails the WHOLE prop. 14 pins in
`tests/vertex-fuse.test.ts`.

One honest look change, documented with A/B frames
(`b13_vcfuse_{sedan,mailbox,trashcan}-{before,after}.png`): the vehicle
GLBs ship position-only parts, so the shipped cars were ambient-only flat
(un-lit); the fuse computes per-face normals — the fused cars are lit like
every other Lambert prop in the world. Mailbox/trashcan A/B bit-identical.
In-engine: cab 7→1, sedan 6→1, mailbox 4→1, trashcan 3→1.

Ledger (diag-perf-breakdown, before → after): PLAZA 400 → 368 (−32),
CART_CORNER 333 → 308 (−25), SYCAMORE×GABLE 128 → 118 (−10), TIMES_SQ
130 → 130, PLATFORM_A 186 → 180 (−6) — every rig at-or-under its previous
ledger; 150/250 stay published FAIL (the close remains the owner's call).

Gates: tsc clean · vitest 548/548 (+14) · build clean · probe-cars clean
(taxiWrapper meshes=1, sedanWrapper meshes=1) · probe-solid ALL CLEAN ·
probe-peds OK · probe-a5c-arrival errors none · full 4-day E2E AUTOTEST
OK 0 failures (540 s), console clean. Housekeeping: reconciled the stale
package-lock (main's `@types/node` had never reached it — a fresh
checkout's entry-gate tsc failed until `npm install` pinned it).

## 2026-11-05 — agent2: the tip re-proven in a clean checkout + the 1-Second audit gets its randomizer (docs/55 item 4 prep)

The session opened on a recycled sandbox (fresh clone @ 76ca204) and the
books saying the Shuffle decree was answered in the merge — my own earlier
build (0115e9b, the proximity-scan cut) was superseded by the contact law
that survived (docs/55 F04's two-builds note). So the work became the two
things left that an agent can honestly do: re-prove the tip from zero, and
build the piece of the exit checklist nobody had built yet.

**The clean-checkout proof (every gate, this sandbox):** npm ci + a fresh
Playwright chromium; then tsc clean · vitest **551/551** (35 files) · build
clean (444 ms) · `probe-shuffle.mjs` **SHUFFLE OK** — all six close-rule
checks (9 walkers, 5 on the stretch, the forced brush fires "'Scuse me."
with the bubble at opacity 1 — `shots/shuffle-bubble.png` re-captured and
eyeballed — money and step untouched, TBD-3 lands, no gate west) ·
`probe-peds.mjs` PEDS OK · full 4-day E2E **AUTOTEST OK, 0 failures
(572 s), console clean**. B16's evidence holds on a machine that has never
seen the tree — the strongest form of "e2e rails untouched".

**The 1-Second Law audit's missing tool (docs/55 item 4):** the checklist
names existing probes as the frame source, but every one of them curates —
and the audit says "randomize, don't curate". `probe-one-second.mjs` is the
randomizer: a seeded draw (mulberry32, `--seed`, default 20261105) of 10
paused frames stratified across the item's own axes — 10 distinct
districts, every day 2–3 frames, noon/dusk 5–5. The laws it keeps:
- **no invented coordinates** (docs/45): 13 anchors, each harvested from a
  shipped probe or a World.ts W2 builder list, `minDay`-constrained so no
  frame shows a place before its day opens it (Times Square and the
  platform are Day 4's; the wider grid is Day 2's);
- **the standable proof**: after teleport, the frame's staging walks real
  key-driven steps (the probe-court pattern) — an anchor that cannot move
  fails the run (the fire-escape anchor taught this one: it faces its own
  ladder, so the proof accepts either direction);
- **the staging never leaks between beats** (the B12 law): day, wallet,
  cart name, objective and world flags set explicitly per frame, the note
  cleared AFTER setStep (the wake toast re-fires otherwise — found by the
  platform frame wearing Day 4's "Rosa is at your cart" 350 m from the
  cart), and each day stages its widest-range step so the objective header
  never names a beat the player couldn't be mid-way through;
- **the camera is never parked** — the audit pauses a real session, so the
  frame is the follow cam's own framing; portrait 720×1280; any page error
  fails the run.

First draw committed to the checklist's named path: `assets/one-second-law/`
(10 frames + `manifest.json` + README status note), docs/55 §4 carries the
prep line. **The box stays unchecked** — the never-visitor pass is the
human half and has not run. Two frames in the honest set carry real
camera-occlusion moments (a boom wedged behind the laundry container, a
canopy filling half a frame) — that is what un-curated pauses look like,
and the audit's human is the judge; if either fails the 1-second read, the
checklist's own rule applies (a docs/51 entry with the frame attached).

Gates this session: tsc clean · vitest 551/551 · build clean ·
probe-shuffle SHUFFLE OK · probe-peds PEDS OK · E2E AUTOTEST OK 0 failures
(572 s) · probe-one-second ONE-SECOND PREP OK ×3 (final at the evidence
path; same-seed re-run reproduces the same 10 frames bit-for-bit).

---
Task ID: OPEN-WORLD-ROAM-M0
Agent: Main Agent (architecture audit + open-world restructure)
Task: Restructure the repo to the settled direction — a life sim on an open
block. The four-day story stays the spine; the player gets free roam on
their own clock. Blueprint in docs/architecture/01–07, shipped as M0.

Work Log:
- Audited web-three/src (~24.4k lines): the rails were the 33-step linear
  GameState machine, the Day 1–3 water-main barrier, the story-owned
  objective line, and the story-paced idle nudge — not the code, which
  was already layered correctly (pure state → effects → one orchestrator).
- Shipped the Roam layer: src/game/freeroam.ts (pure contract — one
  field, zero imports), Game.toggleRoam + guards (objective law in
  applyEffect, idle-nudge rest in drainFarWorld, sketch-book discovery
  line in checkSketchReveals, handover invitation), World.setBarrierOpen
  (visibility-is-collider law; dressDay respects the override), the
  pocket Roam chip (index.html + UI.ts + style.css, Roam ↔ Story), and
  the optional Save.roam field (starter-precedent conditional spread;
  Day 2+ only — Day 1 never writes).
- Evidence: tests/freeroam.test.ts (6), scripts/probe-roam.mjs (28
  checks in real Chromium, 0 failures): barrier physics at its own
  coordinates, story-stays-live mid-roam (pressing Rosa advances
  MEET_ROSA with roam held), save round-trip both directions, silent
  boot restore, console clean.
- Docs: docs/architecture/01–07 (audit, gen-city-auto comparison, target
  architecture, module map, M0–M4 roadmap, agent framework, perf/testing);
  README.md pitch + pillar; AGENTS.md direction block + Roam law pointer.

Stage Summary:
- Gates at close: tsc clean · vitest 559/559 (553 legacy + 6 new) ·
  probe-roam 28/28 · 4-day E2E AUTOTEST OK 0 failures (535 s) · build OK.
- The story path is byte-for-byte the shipped behavior; roam adds a mode,
  never removes a beat. Next up (docs/architecture/05): M1 beats-as-places.

---
Task ID: OPEN-WORLD-ROAM-M0.1 (direction correction + push)
Agent: Main Agent (continuation)
Task: The director corrected the vocabulary: "it is no more an open world,
it's a sim, and the player will be able to free roam going forward — still
a life sim." Put the correction in the permanent places, verify the repo
stays green, and push the unpushed M0 commit with the director's PAT.

Work Log:
- Re-ran the baseline first (safety): tsc clean · vitest 559/559 (36
  files) — the M0 commit's recorded gates reproduce from a cold clone.
- Grepped every open-world/open-world-adjacent phrase in *.md and src
  comments. The rejection contexts (docs/33, docs/37, AGENTS §0 — "not a
  generic open-world city") are left as-is: they already state this
  correction's negative form. worklog history stays untouched (append-only).
- Re-toned the contract's own words to one voice — a life sim, not an
  open-world game; free roam is a capability, not a genre: AGENTS.md
  (direction block + phase-line parenthetical), docs/architecture/03
  (product law, backlog heading, non-goals), 05 (retired risk), 01
  (audit line), freeroam.ts + freeroam.test.ts headers. No strings or
  behavior changed — comments, docs, and one test title only.
- Gates after the edits: tsc clean · vitest 559/559 · build OK.

Stage Summary:
- The direction now lives where the next agent will read it: AGENTS.md's
  DIRECTION block and Doc 03's product law both say it outright. The Roam
  law, module fences, and the M1–M4 roadmap are unchanged.
- origin/main was still at ee815fb; pushed c6a088c (M0) plus this
  correction commit to main. Reminder recorded for the director: rotate
  the PAT after the push (it traveled through chat).

## 2026-11-05 — agent2: the ABO furniture pack, curated and wired in (docs/57)

The decree: the curated ABO furniture is not a standalone scene — "I want it
wired in the game." Phase 1 read all 7,953 metadata records (chair 1184 /
sofa 859 / rug 817 / table 584 / …), scored every floor piece against the
first-slice priorities, and selected 141 models (35.9 MB, the dataset's
meshopt+KTX2 lod1 GLBs, y-on-floor law, tri/byte caps, brand diversity).
Phase 2 fetched them with huggingface_hub into assets/furniture/<category>/
with the CC-BY-4.0 license + per-model ATTRIBUTION.md. Phase 3 wired the
game: World.configureGltfDecoders(renderer) arms GLTFLoader with
MeshoptDecoder + KTX2Loader (vendored basis transcoder), and a new
furniture seam (src/world/furniture.ts manifest + upgradeFurnitureWithGLB)
dresses 19 authored slots across Cecil's room, the hall, and the diner —
costume law intact (missing file keeps the procedural room; colliders
authored in builders; toggles/anchors/day machine untouched). The probe
caught a shipped W5 quirk — the diner's cook line buried its own stool
slots — fixed by re-laying the counter line (positions only).
- Gates: tsc clean · vitest 571/571 (37 files, 6 new furniture-law tests)
  · build 472 ms · probe-furniture FURNITURE OK (19/19 slots, textured
  meshes, rooms hidden at rest, 8 shots + review grid in docs/assets/
  furniture/) · probe-perf zero at-rest regression (119/184/260→256)
  · probe-w5-interiors PASS · probe-peds OK · probe-shuffle OK ·
  e2e AUTOTEST OK 0 failures, 558 s, console clean.

---
Task ID: OPEN-WORLD-ROAM-M1 (beats as places) + repo cleanup
Agent: Main Agent (continuation)
Task: "Continue building — and delete any unimportant thing from the repo
to keep it clean, including anything about godot; quality over quantity."
Two fronts: (1) the cleanup, (2) M1 from docs/architecture/05.

Work Log (cleanup — cee6527, 98 files, −4,629 lines):
- Deleted greybox-godot/ (the oracle's job now belongs to the vitest
  suite + the 4-day E2E — a stronger guard than a second codebase),
  site/ (superseded by the Actions workflow that publishes
  web-three/dist), tools/gen3d (thin duplicate of tools3d/ Track C),
  the massing one-shot tools, the applied one-shot registry fixer, the
  Godot-era capture frames, three orphaned pitch PNGs.
- Kept: tools3d/ (the working pipeline), render-world.mjs +
  validate-registry.mjs (the world-registry's guards), the two composed
  postcards (moved to assets/postcards/), the dated build-log docs —
  each banner-statused (2026-11-05) per the docs-hygiene pattern so
  their greybox paths read as history.
- Live surfaces updated: README (one build, current counts), AGENTS.md
  repo map, package.json, and the web-three file headers (dead
  greybox-godot/ paths → docs/23–24 provenance). Gates: tsc clean ·
  vitest 565/565 · build OK.

Work Log (M1 — beats as places, not pressure):
- GameState.beatPlaceId(): the data-only beat→place table (21 named
  beats; the fire escape, the teal door, the subway stairs, the notice,
  the rail, and DONE stay null on purpose — a marker never points where
  the objective doesn't).
- The marker: a dashed ink ring + "whenever you're ready" caption on the
  sketch (sketch.ts beatMarkerSvg, opacity-flip only; UI.setBeatMarker
  with the priyaRevealed wait-for-build law), wired at boot,
  applyEffect('step') (both modes — mid-roam it shows where the story
  waits), and all three day-begins.
- Evidence: tests/beats.test.ts (4 pins incl. the marker⇄objective
  agreement law) · scripts/probe-m1-beats.mjs 10/10 in real Chromium ·
  4-day E2E AUTOTEST OK 0 failures (534 s) · tsc clean · vitest 569/569.

Stage Summary:
- The repo is one build, one pipeline, one site — and the Map now tells
  the player, in Rosa's hand, that the story waits for them. Next up
  (docs/architecture/05): M2, the district map.

---
Task ID: OPEN-WORLD-REFS-M3 (engineering references + the diary)
Agent: Main Agent (Z.ai)
Task: Two directives at once — (1) two permanent engineering references
(Gen City Auto, Slop New York) with a study-before-building rule recorded
so every future agent inherits it; (2) continue the roadmap
(docs/architecture/05), keeping the repo clean.

Work Log (references — docs/57):
- Shallow-cloned both repos to /home/z/my-project/refs/ (gen-city-auto:
  MIT, TypeScript/WebGPU/workers; slop-newyork: MIT, three.js/TSL with
  NYC-Open-Data geodata). Read the actual source, proportionally to the
  roadmap: GCA's world manager (src/world/city.ts — tile streaming,
  SHELL_PREFETCH/KEEP hysteresis bands, nearestFirst ordering, retry-on-
  full backoff), GCA's gen split (src/city layout.ts street graph vs
  gen-tile.ts parcel fill), SNY's nyc-map.js (one geography drives the
  radar AND the atlas; world-frame documented in-file; shared palette;
  AREA_LABELS tiers).
- docs/57-engineering-references.md: the law (study sequence,
  proportional study, no blind copies), the two-repo table with licenses,
  the system→file map (peds/traffic/vehicles/culling indexed so the next
  agent starts at the right door), today's findings, the license ledger
  (SNY's OSM/NYC geodata = reference-only, per docs/45 §5), and §4: what
  NEITHER reference has (a story spine, No-FOMO, the block remembers, a
  paper companion) — build independently and say so.
- AGENTS.md §1e carries the rule to every agent; docs-hygiene.test.ts
  pins the manual to both repo names + the ledger doc (the correction
  lives in the most permanent place that fits).
- Cleanliness second pass: docs/06 + docs/19 (the two Unity-era docs
  still presenting a retired engine as current) got the dated
  status-update banner (2026-11-05), matching the docs-hygiene pattern.
  The remaining godot/unity mentions in docs/ are all bannered history or
  HF-Space pipeline ids — no live surface points at a dead engine.

Work Log (M3 — the city keeps a diary of you):
- Read the frontier first: W0–W5 of docs/45 are all shipped (World.ts
  carries the district ring, the ±84 grid, Gable/Marlow, the avenues, the
  M121, buildAlderHeightsW5) — so M2's substance was already built by the
  construction arc; docs/03 §3 and docs/05 now say so honestly, and M3
  was the actual next milestone.
- core/diary.ts (pure, zero imports, the ride-machine seam law): a
  family speaks when it climbs a full threshold past the watermark
  (shelf 4 / dog 4 / trim 3 / wash 3 / hoop 6 — each one step ABOVE its
  MEMORY_LINES in-person threshold, pinned); biggest overshoot wins,
  ties in table order; the fired family's watermark moves to the current
  count — a note is said once, ever.
- Save v1: diary_noted (optional-trailing, byte-identical old parses,
  clamped, unknown keys dropped); GameState.diaryNoted + diaryCounters()
  + the snapshot spread; Game.beginDay drain — one note per morning,
  queued BEHIND the DAY note (noteAge rests at 999 after the beginDay
  reset; the drain parks the line, it doesn't stomp the morning), skipped
  on Day 1, re-resume-safe (the watermark restores before the drain and
  persists with the day-start snapshot).
- content.ts DIARY_NOTE_TEXT: five morning-after lines; the No-FOMO
  check ("no line asks for another round") is a unit test, not a promise.
- Evidence: tests/diary.test.ts 13 pins · scripts/probe-m3-diary.mjs
  9/9 in real Chromium at 720x1280 (exactly one diary note on a seeded
  Day-2 morning with two families over due, parked behind the DAY note,
  watermark visible in localStorage, no repeat on a second boot of the
  persisted save — probe lesson: Playwright's browser.newPage() makes a
  FRESH context per page; the shared-context page is the honest reload)
  · 4-day E2E AUTOTEST OK 0 failures (569 s, console clean).

Stage Summary:
- The references are load-bearing now: AGENTS.md §1e + docs/57 mean the
  next agent that touches peds/traffic/world-gen checks Gen City Auto's
  source first, and the next agent that touches the Map/world frame
  checks Slop New York's. Findings accumulate in docs/57 §3.
- The block remembers: yesterday's regular rounds surface as one quiet
  morning line, said once. M0 (roam contract) → M1 (beats as places) →
  M2 (district map, by the construction arc) → M3 (the diary) are all
  shipped; M4 (ambient schedules) is the next milestone on docs/05.

Gates at close: tsc clean · vitest 582/582 (38 files, incl. the new
docs-hygiene reference pin + 13 diary pins) · build OK ·
probe-m3-diary 9/9 · 4-day E2E AUTOTEST OK 0 failures (569 s).

---
Task ID: OPEN-WORLD-ROAM-M4.1
Agent: main (Claude)
Task: Continue building — roadmap M4, ambient schedules (peds/traffic density
  keyed to time-of-day), under the study-before-build law (AGENTS.md §1e).

Work Log:
- Reference study FIRST (docs/57 §3.5 has the record): Gen City Auto's
  pedestrians.ts/traffic.ts read in source — density there is SPATIAL, not
  temporal (a hub-falloff probability discarding spawns, fixed target
  counts 420/240, per-frame spawn budgets, weighted kind pools, despawn
  rings). Slop New York's TIME_PRESETS drive atmosphere only (fog/sky/
  headlight fades), never crowds; its pedestrian system is a spatial spawn
  ring. Verdict: neither reference schedules density by time of day — M4
  is FIRST SLICE's own design; borrowed is only the shape (a pure density
  read; named presets), and the hot-path discipline (spawn budgets, no
  per-frame garbage) was checked against §1c.3.
- The honest clock: this game has no sim-time (the block runs on your
  clock, the No-FOMO law) — the schedule is a TWO-ROW TABLE keyed on the
  day's street phases, not a minute grid. Game keeps the lever (the dusk
  flag); World applies one row on the phase edge; the table is pure data.
- world/dressing.ts: StreetPhase ('day' | 'dusk') + StreetPlan {duskShift,
  parkOut, cabPace} + STREET_PLAN + PEDESTRIAN_ROLES (the roster's shifts,
  documented in build order; an untagged new walker defaults 'street' —
  the safe side of the floor law).
- world/peds.ts: StreetRole tags + applyStreetPlan — a 'dusk' walker comes
  on in roster order (plan.duskShift of them), the 'park' walker follows
  plan.parkOut, and a 'street' walker ignores the table entirely (the
  floor: a schedule bug cannot empty the street). Home = group hidden +
  collider parked at y −999 (the barrier's own trick) + excluded from
  bodies()/resolveAgainstCab/bodyAt (the cab never brakes for the
  underground; the registry's y-band never offers them a chat) + frozen
  through Yuka's integration by the shipped pin (they resume their loop
  exactly where they left it, body re-synced the frame they return).
- world/World.ts: the roster grows three dusk-shift neighbors (the evening
  rush — the subway draw on the shipped bodega→plaza stretch, same
  articulated rigs, bank-shared materials, loops on the proven north-walk
  band so no new lanes/colliders exist); updateDynamics applies the plan on
  the dusk-flag edge (boot = day, so the shipped street is unchanged until
  the first flip); updateTaxi reads plan.cabPace (rush crawls 9 → 6.3 m/s —
  the one-honest-car version of a heavier avenue). engine/traffic.ts and
  engine/busRoute.ts needed NO change (the roadmap's touch list was a
  plan): traffic's math is stateless and the M121's night park already
  shipped with W4 p2 — recorded, not forced.
- probe-scene-census.mjs now tells render truth: scene.traverse counted
  meshes under invisible parents (the court's dusk pair, and now the home
  rigs) that the renderer never draws; replaced with a pruned walk.
- Evidence: tests/street-schedule.test.ts (12 pins: both table rows, the
  roster shape, the floor law in table AND mechanism, boot-home state,
  idempotency, roster-order rush, mid-beat ghosts cleared, frozen-through-
  Yuka, body re-synced on return, home walkers never yield to or block the
  cab) · scripts/probe-peds.mjs extended with the dusk section in real
  Chromium (G = the shipped debug lever: plan wiring 0.7/3, 12 roster,
  11 visible, the tender home, all three rush walkers walking the band,
  the floor trio still walking at dusk, plus a rush screenshot at the
  terminal stretch).

Stage Summary:
- M4 shipped: the street now has a schedule. Day is byte-for-byte the
  shipped street (9 out, cruise 9, census-identical 321 drawables); dusk
  reads visibly busier — 11 out, the crowd thickens by the subway entrance,
  the park settles, the cab crawls. M0 roam → M1 beats-as-places → M2
  district map → M3 diary → M4 ambient schedules: the whole roadmap of
  docs/architecture/05 is now shipped.
- The census fix is a permanent guard: future probes report what renders,
  not what is parented. The reference study is recorded in docs/57 §3.5
  (and §2's pedestrians/traffic rows marked studied) — the next agent that
  touches ambient life starts from findings, not from zero.

Gates at close: tsc clean · vitest 600/600 (40 files, incl. the 12 new
schedule pins) · build OK · probe-peds PEDS OK (day + dusk sections) ·
probe-cars exit 0 · scene census 321 drawables at rest, IDENTICAL to the
pre-M4 baseline (the pruned-walk fix included) · 4-day E2E AUTOTEST OK
0 failures (543 s, console clean).

## 2026-11-05 — agent2: the furniture pack made discoverable — repo_path in
the curated manifest + an AGENTS.md repo-map pointer (assets task)

The decree for this pass: "Push the assets (models) to the repo so other
agents can use them when they are also building." The pack itself was
already on main (01abc1e — 141 GLBs, 35 MB); what a fresh checkout could
not do was *find* it: the curated manifest pointed at the HuggingFace
dataset layout (lods/<ASIN>/…), and the AGENTS.md §3 repo map did not
name the pack at all. Two quiet fixes, no game code touched:
- docs/data/abo-curated.json — every one of the 141 entries now carries
  repo_path (assets/furniture/<bucket>/<ASIN>.glb), verified resolving
  on disk (141/141); the dataset-relative lod1/lod2 paths stay for
  re-fetch. Also proven: a clean re-clone carries all 141 GLBs + the
  manifest + ATTRIBUTION.md + license + tools3d scripts + the 12
  byte-identical slot copies + the vendored basis transcoder.
- AGENTS.md §3 — the repo map now lists assets/furniture/ and carries a
  "furniture pack — reusable by any agent" paragraph: where the files
  live, the manifest's fields, the loader (src/world/furniture.ts), the
  costume law (docs/57), the idempotent re-fetch scripts, and the
  CC-BY-4.0 credit duty. The docs/ range comment caught up while there
  (01–52 → 01–57).
- Gates: manifest parses (141 entries) · all repo_paths resolve ·
  AGENTS.md tree alignment kept · no game source touched, so the
  standing suite's verdict stands.

---
Task ID: B13-LEDGER-POST-M4
Agent: main (Claude)
Task: Continue working — the last open ledger item (docs/51 B13) on the
  roadmap-complete tree: re-measure the ledger, run the study-before-build
  reference check for the perf/culling system, and publish the honest row.
  Plus a hygiene catch: the B18 merge had left a stray conflict marker in
  this worklog.

Work Log:
- Hygiene first: worklog.md carried a literal `<<<<<<< HEAD` at the M3/M4
  seam (the 14be680 merge resolved the collision but one marker survived).
  Dropped it (commit f0c5d08). Also sandboxed this session's filemode noise
  (571 files showed mode-only changes — core.filemode false locally, no
  commit touched).
- Reference study FIRST (docs/57 §3.6 has the record): Slop New York's
  js/scene-culling.js (362 lines — island-wide instanced props split into
  250–600 m chunks with apparent-size distance culls, position-only shadow
  stand-ins on a proxy layer, 1000 m frustum cells) and Gen City Auto's
  src/render/shadow-cull.ts (receiver-plane shadow culling: casters culled
  by the camera frustum slice swept toward the light) + src/city/lod.ts
  (per-triangle material-class + narrowest-width distance culls, crown
  blobs). Verdict: their regime is a 7 km instanced island with two shadow
  cascades and 1.5 km views; FIRST SLICE is a 170 m authored block on
  three.js. Nothing translates wholesale; the transferable ideas are
  already shipped and measured here (district bake = chunking at the
  visibility grain; figure shadow-proxy = the stand-in pattern; sun box
  35/18 = the tightened cascade). Bigger bake chunks were already measured
  a net loss on software GL (2026-10-30); receiver-plane shadow culling
  needs a renderer hook three.js does not expose; per-frame castShadow
  toggling would be the §1c.3 sin; apparent-size culls have no sub-pixel
  range to bite at our scale. Recorded in docs/57 §3.6.
- Measured the post-M4 row (diag-perf-breakdown + probe-perf + x-ray +
  the new diag-unnamed-parents.mjs one-shot): PLAZA 302, CART_CORNER 236,
  SYCAMORE×GABLE 84 → 78, TIMES_SQ 52, PLATFORM_A 108; probe-perf story
  rigs 119/184/256 — every rig at-or-under its previous ledger. The
  x-ray's unnamed bucket was run to ground (diag-unnamed-parents +
  diag-unnamed-xray): it is the day-keyed flyer/notice/sign dressing
  (FLYER_SLIPS, hall notices — 4-vertex canvas quads that swap by day),
  the sky dome and the steam points — behavioral assets the bake's rules
  correctly leave alone.
- The owner-call arithmetic published: PLAZA ~302 = people ~86 + baked
  tiles ~41 + named behavioral tail ~40 + wildlife ~21 + vehicles/signs/
  one-draw statics ~114. Under 150 means erasing identity the Laws name.
  docs/51 B13 + docs/55 (F10 row + B13 section) updated; docs/architecture/07
  pyramid counts refreshed (40 files / 605).

Stage Summary:
- B13's standing gate re-verified on the roadmap-complete tree: no rig
  above its previous ledger; SYCAMORE six calls lighter. The honest row is
  published with the reference study attached — closing B13 against the
  150 line is the owner's call, with the full priced composition in
  docs/51. docs/57 §3.6 is the next agent's starting point for any
  culling/perf work.
- No game source changed (measurements + docs + two read-only diagnostics);
  the shipped game is byte-identical.

Gates at close: tsc clean · vitest 605/605 (40 files) · build OK ·
probe-perf 119/184/256 · diag-perf-breakdown 302/236/78/52/108 ·
diag-rig-xray + diag-unnamed-parents + diag-unnamed-xray clean runs ·
zero page errors. Push deferred: the PAT from the previous session was
rejected (Invalid username or token — likely rotated); commits are on
local main awaiting a fresh token.

---
Task ID: NARR-REBOOT-R0-R4-R3
Agent: First Slice Agent (Z.ai)
Task: "Continue working" — reconcile the incoming narrative reboot, finish
the repo clean-up sweep (nothing unimportant left, nothing Godot/Unity),
then build the narrative spec's spine of state (narrative/14 §7 step 1)
under the study-before-build rule (AGENTS.md §1e).

Work Log:
- Synced with origin/main: two new commits had landed remotely — the
  legacy docs wipe (a6e0541, docs/01–56 + docs/architecture/) and the
  narrative bible (447b0e1, docs/narrative/00–15, canon v1.0). Local main
  carried two unpushed commits from the prior session (the worklog
  conflict-marker fix + the B13 post-M4 ledger row / culling study) whose
  docs/51, docs/55, docs/57, docs/architecture/07 edits collided with the
  wipe. Merged; resolved delete/modify conflicts:
  * Accepted the reboot's deletions (docs/51, docs/55, docs/architecture/07)
    — the B13 verdict and post-M4 ledger row are already recorded verbatim
    in this worklog's previous entry.
  * KEPT docs/57-engineering-references.md — it IS the study-before-build
    ledger the 2026-11-05 directive mandates (AGENTS.md §1e); added a dated
    reboot note (pre-reboot doc numbers read as history; files live in git).
- R0 (narrative/14, PRIORITY-0): re-pointed tests/docs-hygiene.test.ts at
  the new canon — the narrative bible exists + is canon; AGENTS.md points
  building agents at narrative/14 + worklog.md; the engineering-law case
  (gen-city-auto / slop-newyork / docs/57) kept verbatim.
- AGENTS.md coherence pass: phase line (still "Vertical Slice production"),
  DIRECTION (C0–C6 spine; Day 1–4 is its first movement), ACTIVE WORK
  (narrative/14 §7 build order), §0 (the story is law; the pillars carry
  over), §1d memory list, §1e pointer, §3 repo map, §5/§6 skills, §8/§9 —
  every pointer now lands on a file that exists. No law changed; only the
  addresses did.
- Clean-up sweep verdict (the "delete godot/unity and shit" directive,
  carried from 2026-11-05): word-boundary grep `\bgodot\b|\bunity\b` over
  the tree — ZERO engine leftovers. greybox-godot/ was already deleted
  (recorded 2026-11-05); the two Unity-era docs died in the remote wipe.
  The only remaining mentions are the 6 append-only history lines in this
  worklog (kept: this file's law is append-only; editing history would be
  the one violation we can't undo) and substring false positives
  ("comm-UNITY" in tools3d dressing, registry identity text, narrative
  prose). Repo root inventories 10 entries, all owned; gitignored artifacts
  (dist/, shots/, node_modules/) untracked; no *.log/*.tmp/*.bak anywhere.
- R4+R3 (narrative/14 §7 step 1's remainder) — reference check first, per
  AGENTS.md §1e: docs/57 §3.5 already records that neither reference has
  an in-game clock (GCA's update() time param is animation; SNY's
  TIME_PRESETS drive lighting only), and §4 records that neither has any
  journal/diary/epistemic system (their worlds are purpose-free). Verdict:
  no equivalent exists in either reference → stated, and built
  independently — the schemas are narrative/03's own.
  * core/calendar.ts (R4): GameDate; the fixed month table; the epoch
    (Day 1 = October 1, Year 1 — the shipped Day 1–4 land on October 1–4,
    Year 1 byte-for-byte, so C0's mood-lock survives the spine); pure
    month/year rollover; seasonOf; the named seasonCut detector (a cut
    detected is a cut owed — the montage is later machinery);
    formatGameDate ("October 14 · Year 1"). No Date object; a source-grep
    test pins the no-clock law forever (§1c.1).
  * core/fieldDiary.ts (R3): narrative/03 §2's schema — 10 kinds, 3
    epistemics (FACT/RECALL/GUESS), 3 visibilities, corrections
    (strike + margin, doc 03 §5.1). Append-only by construction: the
    module exports no update/remove; correctEntry freezes body bytes;
    input arrays never mutate; parseFieldDiary quarantines corrupt
    entries (the map-notebook precedent), caps 512/600/16/8.
  * Save v1 stays v1: calendar_day + field_diary are optional trailing
    fields; an old save parses with the calendar on the story day and an
    empty diary; the roundtrip test gained the two new defaults (the
    map_notes precedent).
  * GameState: calendarDay + fieldDiary fields, the two write seams
    (logDiaryEntry / correctDiaryEntry — the one door content will write
    through at §7 step 6), snapshotForSave carries both; Game.beginDay:
    resume lands on the saved calendar, the rail's Tomorrow advances with
    the story day, a replayed day never double-advances (max()).
  * No UI yet by design — the Map's ink layer is a later milestone
    (narrative/14 §4); this slice is the spine of state, pinned by tests.

Stage Summary:
- main is now: merge 1e54a58 (reboot + coherence) → feat 5c488e1 (R4+R3).
  The narrative bible is the canon; the operating manual points at it; the
  engineering ledger survived the wipe and keeps its findings; the tree
  carries zero Godot/Unity and zero unowned files.
- The narrative spine of state is in: calendar + field diary, append-only,
  quarantine-safe, deterministic, Save-v1-safe — 40 new permanent guards.
- Next per narrative/14 §7: R2 + R7 (the consequence ledger + choice
  nodes), then R1 + R8 (chapters/rails), then the C0 content pack against
  the shipped opening.

Gates at close: tsc clean · vitest 645/645 (42 files; +40 new guards:
calendar 16, field-diary 22, save +2) · build OK.
Task ID: player-visual-kinematics-polish
Agent: agent-player-upgrade
Task: Visually polish and upgrade player character rig, kinematics, and intuitive camera controls

Work Log:
- Implemented kinematic acceleration, friction deceleration, sprint mode (Shift / extended drag), and vertical step smoothing (visualY) in Player.ts
- Polished character rig in personRig.ts with handcrafted low-poly sneaker details (toe bumper, tongue, ankle collar, rolled pant cuff), structured jacket architecture (stand-up collar, folded lapels, storm placket, welt pockets, hem band, sleeve cuffs), expressive facial features (eyes with catchlights, blush cheeks, eyebrows, neck, ears), and distinct hairstyle silhouettes
- Upgraded starter accessories: corrugated kraft sleeve on bodega coffee cup, metallic truck axles on skateboard
- Added intuitive mouse-drag camera orbit & vertical pitch tilt, wheel zoom (4.5m - 12m), and frame-rate independent exponential damping in GameCamera.ts and Input.ts
- Created permanent guard test suite in tests/player-upgrades.test.ts verifying acceleration, friction cutoff, sprint speed, visualY smoothing, and zoom distance clamping

Stage Summary:
- 100% test coverage maintained across rig.test.ts, camera.test.ts, and player-upgrades.test.ts (38 test files, 574 tests passing)
- Zero new draw calls: every rigid limb remains fused to 1 mesh with single-material vertex-color baking

Task ID: PLAYER-MERGE-WARDROBE-LOCK
Agent: main (Claude)
Task: Add the First-slice-player update to the main repo (merge the
  kinematics/camera polish commit), port the React wardrobe into the
  vanilla UI law with the pick-is-for-keeps lock law, polish the ladder
  climb feel, and dress the player home with more of the ABO furniture
  pack.

Work Log:
- Fetched the player repo's git bundle (feat/player-visual-kinematics-polish
  — its prerequisite 14be680 is in our history) and cherry-picked 087b114
  "feat(player): visual polish, fluid kinematics, intuitive camera controls"
  onto main: fluid accel/decel friction (ACCEL 18 / FRICTION 16), sprint
  (Shift or joystick >0.88 → 6.4 m/s), adaptive turn rate with 180° boost,
  visualY smoothing, pointer-drag camera orbit + pitch tilt + wheel zoom,
  frame-rate-independent exponential damping. Resolved Game.ts + worklog
  conflicts against the narrative reboot; restored the condensed descend/
  stair/floor-snap decision comments the patch had stripped; dropped the
  patch's dead smoothFocus/initializedFocus fields (tsc TS6133).
- Ladder climb feel: the rig's climb pose is now driven by the body's own
  measured vertical velocity (PersonRig.prevY/smoothClimb, normalized to
  CLIMB_SPEED 2.6) — hands-over-hand cadence while you climb, a held reach
  when you hang; the old fixed 3.4 rad/s pedaled in mid-air. Pinned in
  rig.test.ts (mover vs hanger cadence).
- The wardrobe: ported the player update's React App.tsx + WardrobeModal
  (826 lines, React 19/Tailwind/lucide) into web-three's vanilla UI law —
  src/ui/Wardrobe.ts (no React): 3D turntable (buildArticulatedPerson +
  updatePersonAnim idle, pedestal + warm rig, drag-to-spin, Front/¾/Back,
  spin toggle), six-starter lineup with jacket swatches + roles, lazy
  renderer created once and rAF only while open (at-rest-perf law), poster
  mode when WebGL is absent (the seam law). Pocket chip btn-wardrobe + O
  key (edge-detected like M); touch law knows the panel; Input ignores
  pointer-downs on it; movement/interact pause while it is open.
- THE LOCK LAW: the pick is for keeps. wardrobeDecision() (pure, pinned):
  the same look closes the question; a different look is only wearable
  through a confirmed new game — Save.newGameSave() writes a factory-fresh
  schema with the chosen starter pinned and the page reboots on the new
  face (the pick card never re-asks). The save still rides starter (the
  boot law unchanged); ?starter= and driver boots keep their harness
  exceptions. Tests: wardrobe.test.ts (decision law, lineup law, new-game
  law, touch union) — 9 new guards.
- The player home wears more of the ABO pack (docs/57's seam, 19 → 22
  slots): mirror above Cecil's dresser (B073WGGXFT), floor lamp at the
  hall sofa's shoulder (B073751DMK), ottoman off the hall coffee table
  (B07D4FS7GY, solid). Manifest + provenance + byte-identical lod1 files;
  ATTRIBUTION already carries all three ASINs.
- Reference check recorded (docs/57 §4): wardrobe/lock/ladder/interiors
  are player/UI/interior systems — neither Gen City Auto nor Slop New
  York has any of them; built independently, as the law requires.
- Live proof (headless chromium against the dev server, throwaway probe,
  not committed): pocket → wardrobe opens with the 3D turntable (6 tiles,
  "You" on the save's face), a different tile raises the confirm strip
  ("Start over as The Regular? …"), Keep folds it, the same tile says
  "That's already you.", close works, the save still carries the face;
  screenshots confirm the mirror/lamp/ottoman sit on their fixtures.

Stage Summary:
- main is now: 3d3b71a (reboot spine) → a9718e9 (player kinematics merge)
  → PLAYER-MERGE-WARDROBE-LOCK. The player update is IN — without React,
  with the lock law, and the home is furnished.
- Gates: tsc clean · vitest 660/660 (44 files; +15: wardrobe 9, rig climb
  cadence 1, player-upgrades 5 riding the merge) · build OK · headless
  probe green (wardrobe flow + interior renders).

Gates at close: tsc clean · vitest 660/660 (44 files) · build OK.

## 2026-11-06 — agent2: every interior wears its own furniture — the shops pass, and the probe that caught two dead regressions

Task ID: SHOPS-FURNITURE-PASS
Agent: main (Claude)
Task: The user's scope raise — "not only the player's home interior,
  other building interiors, only be using its corresponding furniture."
  Every one of the eight interiors dresses from the ABO pack, each room
  with the furniture that corresponds to what the room is.

Work Log:
- Reference check recorded (docs/57 §4, dated): interior furnishing is a
  player/interior system — neither Gen City Auto nor Slop New York covers
  it (SNY has no interiors; GCA's lots are shells) — built independently
  on docs/57's own seam, as the law asks.
- THE SHOPS PASS (manifest 23 → 40 slots, 15 → 24 files, all
  byte-identical lod1 GLBs, provenance pinned, ATTRIBUTION already
  carried every ASIN):
  - LAUNDRY: two waiting chairs by the cart (B075ZZYH4B) + a framed
    print over the washers (B073NZGLLS). The washers, dryers and the
    2.4 m folding tables stay procedural — equipment, not furniture.
  - BARBER: the waiting bench wears a storage bench (B07C8DHX43) + two
    framed mirrors over the counter, one per chair (B073WHZKBF). The
    cutting chairs stay procedural (barber equipment).
  - PIZZA: the two booth tables wear the drop-leaf table (B07B82PXCW) —
    0.80 m wide, fits the 0.8 m gap between the coral benches exactly.
    The benches, slice counter, deck oven, fridge stay procedural.
  - BAKERY: the two cafe two-tops wear the mid-century table
    (B075YQXRJM). Oven, racks, counter stay procedural.
  - DINER: all four booth tables wear the same drop-leaf (one file, four
    slots) — the wooden tops read between the coral benches from the
    counter. Stools were already ABO.
  - RECORDS: the listening corner gets the Sloane armchair (B0714QGLSD,
    facing the speaker stacks), the shop counter wears the Loue sideboard
    (B0154WJZH2), and a sunburst rug (B0719FLQP3) warms the spot. The
    record crates stay procedural — they are the bins.
  - Fixture law: the booth/bakery tables and the laundry chairs were
    thin tops + separate legs (a real model stood on its tabletop, feet
    floating 0.7 m up) — re-authored as full-height bodies, the
    Hall_Chair_A pattern; colliders unchanged everywhere.
- REGRESSION 1 (caught by the new probe, fixed): the player-merge
  cherry-pick (a9718e9) silently dropped Game's
  `world.configureGltfDecoders(renderer)` call — furnitureUpgrades was
  EMPTY at boot, every ABO swap in the shipped game was dead, including
  the 23 slots from the previous round. The unit gates could not see it
  (they never boot a renderer). Call restored + comment.
- REGRESSION 2 (caught by the same probe's sidewalk shots, fixed):
  updateInteriors' hysteresis was inverted — enter 1.6 m / exit 0.8 m
  meant the shown state hid at >0.8 while the hidden state showed at
  ≤1.6, so the 0.8–1.6 m sidewalk annulus toggled the room EVERY FRAME
  (30 Hz flicker for anyone window-shopping). Exit now holds to 2.4 m
  (0.8 past the enter line); comment + test header updated.
- New permanent guard: scripts/probe-furniture-shops.mjs — boots the
  built game, pins all 17 new slots landed (40 total), the six new
  wrappers carry textured (KTX2-decoded) meshes, a numeric placement
  audit (feet/top/size per wrapper: chairs 0→0.9, print hangs 1.925→2.475,
  mirrors 0.959→1.739 over the 0.9 counter, tables 0→0.72, rug flat at
  0.16), and seven walk-in screenshots (inside for laundry/diner/records,
  through-the-storefront for barber/pizza/bakery) + the review grid.

Stage Summary:
- Every interior now dresses its own furniture: 40 ABO slots across the
  eight rooms, the machines and shipped identities (coral booth benches,
  record crates, folding tables) deliberately procedural — equipment is
  not furniture.
- Two shipped regressions found and fixed by the pass's own probe; the
  furniture seam is verified end to end for the first time since the
  player merge.
- Gates: tsc clean · vitest 660/660 (44 files) · build OK · probe
  SHOPS OK (40/40 slots, textured, audit clean) · probe FURNITURE OK
  (the original 23-slot guard still green).

Gates at close: tsc clean · vitest 660/660 (44 files) · build OK.

---
Task ID: PROD-DIRECTOR-ROADMAP-V1
Agent: Production Director (Z.ai)
Task: Establish the complete, professional, production-ready development roadmap for FIRST SLICE — audit the repository, create the central production documentation system (master roadmap, phase acceptance, system checklists, status register, agent governance, risks, next-phase plan), reconcile it with the existing docs, modify no gameplay source code.

Work Log:
- Audited the full repository at main 69f8327 + branches feat/world-contract-foundation (2 ahead / 7 behind; sim layer, 113 tests, 718/718 on branch, 17 contract docs) and feat/player-upgrade (3 commits; content already cherry-picked to main via a9718e9/69f8327 — superseded).
- Source audit: web-three/src = 27,858 lines TS across 10 dirs (World.ts 6,556; Game.ts 2,697; autotest.ts 1,107; interactionDefs 796…); boot sequence and frame order traced; system-by-system wiring verified (every shipped system confirmed wired — no assumptions from roadmaps).
- Test/tooling audit: 45 test files / 660 vitest tests / 597 static it(); 122 Playwright harnesses (78 probe, 37 diag, 5 visual, e2e.mjs 4-day with ~131 checks); ?autotest=1 mechanism traced; CI = typecheck + unit + build + Pages deploy on main only (no PR lane, probes local-only by policy); perf = probe-perf 119/184/256 + census gate (Kestrel ≤150 / intersection ≤250) + ledger rows (PLAZA 302 / CART_CORNER 236 / SYCAMORE 84→78 / TIMES_SQ 52 / PLATFORM_A 108); B13 open (owner's call).
- Docs audit: narrative bible 00–15 (canon v1.0; R0–R15 build order §7; R0/R3/R4 landed on main as state only); world-contract docs 01–17 (phase ladder: foundations shipped → time valve next); legacy docs 01–56 read from git history (old roadmap 06 = history; vertical-slice design 07 budgets inherited and marked for re-ratification; phase-1 exit checklist 55 = 0/5 human/device boxes ever run).
- Found and registered a real contract conflict: core/calendar.ts (main, R4) epoch Day 1 = October 1, Y1 vs sim/clock.ts (branch) epoch Day 1 = Tuesday, September 9, Y1 — both citing narrative/12. Registered as DEC-1 with a default ruling proposal (sim clock = world truth; story calendar becomes a derived view; mood-lock survives as presentation), owner: Narrative Director + lead engineering.
- Created docs/production/ (8 files): README.md (authority order + status vocabulary), MASTER-GAME-ROADMAP.md (13 phases × 14 required fields + workstream overlay + 11 playable milestones + integration narrative), PHASE-ACCEPTANCE-CHECKLISTS.md (floor gates + per-phase entry/exit with evidence law), SYSTEM-COMPLETION-CHECKLISTS.md (48 systems across 6 families, every row measurable with evidence), PRODUCTION-STATUS-REGISTER.md (phases, milestones, branches, 48 system rows, R0–R15, defects, change log), AGENT-DEVELOPMENT-GOVERNANCE.md (WS-A…F deals, 12-field assignment template, parallel/branch/integration/conflict/handoff/acceptance rules, worked example), PRODUCTION-RISKS-AND-DEPENDENCIES.md (DEC-1…DEC-11 with owners and defaults, 14 risks with mitigations, dependency map), NEXT-PHASE-EXECUTION-PLAN.md (WP-0…WP-7 for the time-valve milestone, parallelism map, single-writer booking, rollback posture).
- Reconciled roadmaps: one-roadmap law established (MASTER wins; legacy docs/06 = history; wc-17 = contract-level sequencing); no existing doc deleted, renamed, or reorganized.
- AGENTS.md: two additive pointer edits (§1d memory list + §3 repo map → docs/production/). No law changed; the pinned phase line untouched (hygiene test must stay green — verified below).
- No gameplay source code modified. Shipped systems preserved. No new dependencies.

Stage Summary:
- The repo now has one authoritative production roadmap grounded in the audited state, a register where every status carries evidence, governance compatible with AGENTS.md and the world-contract workstreams, and a concrete next milestone (Phase 1-close → Phase 2 time valve, WP-0…WP-7).
- Baseline captured: main gates green (tsc clean · vitest 660/660 · build OK · 4-day E2E green); branches classified (world-contract = ready to merge with a known docs-hygiene conflict; player-upgrade = superseded, retire after guard check).
- Open decisions surfaced with owners: DEC-1 epochs, DEC-2 B13, DEC-3 Day 5+, DEC-4 registry flip, DEC-5 economics, DEC-6 seasonal pass, DEC-7 rating, DEC-8 expansion gate, DEC-9 telemetry, DEC-10 localization/VO, DEC-11 distribution.
- Gates at close: docs-only change; tsc/vitest/build re-run on the branch (docs-hygiene green after the AGENTS.md edit); no game source touched.
