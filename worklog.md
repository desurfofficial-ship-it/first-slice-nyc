
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
  carried from 2026-11-05): word-boundary grep `godot|unity` over
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

---

## 2026-11-06 — Production Director: reconciliation audit R1 — the runtime integration is real; the register now says so with executed evidence

Task ID: PROD-RECONCILE-R1
Agent: Production Director (Z.ai)
Task: Reconcile conflicting production reports after the Architecture Agent's runtime-integration commit (407cc0e on feat/world-contract-foundation): verify the repository baseline, the twelve sim systems, the DEC-1 calendar conflict, and every production doc; correct the register only where evidence demanded; recommend the next phase. Audit only — no gameplay code touched, nothing merged, nothing pushed.

Work Log:
- Baseline verified live: main = 96bc4eb (CI **success**, deploy-pages push run 02:54Z); feat/world-contract-foundation = 407cc0e, **3 ahead / 9 behind** base 447b0e1 (diverged); feat/player-upgrade still superseded (guard on main, unique commits unmerged).
- Numbering reconciled (one-roadmap law): wc-Phase-0/1 = production-Phase-1/2. 407cc0e IS production-Phase-2 (the runtime integration); wc-17's own ledger marks its exit sentence met except **D-3** (money bridge).
- Gates **executed** on a clean worktree at 407cc0e: tsc clean · **vitest 744/744** (52 files, 8.41 s) · build OK · **probe-world-sim 15/15 PASS** (1,424 simulated minutes in 64.5 s real, exit 0, zero page errors) — scheduled activities, clock transitions, the R6 HIGH interruption with LIFO resume, corruption-degrading world saves, idempotent loads, clock-keyed dusk, multi-day continuity, all in the real built game.
- The older audit's "no tick valve / no schedule integration" finding was a **snapshot mismatch**, not an error: it captured the branch at 627e87d ("2 ahead/7 behind" matches), before 407cc0e existed. Nothing to rebuild; the register needed the correction.
- DEC-1 decision brief issued (report §4): `CAL_EPOCH` Oct 1 (mood-lock, doc 12 §5) vs `EPOCH` Sept 9 Tue (timeline, doc 12 §1) — the same canon cited both ways; day counters already aligned 1:1 by `onStoryDayBegin`; the defect is latent (sim dates not yet player-visible). **UNRESOLVED — owner gate; Option A default documented, NOT applied.**
- Read-only merge scan: exactly **3 conflicts** (AGENTS.md, docs-hygiene.test.ts, worklog.md); Game.ts auto-merges. New **DEF-3**: the branch carries a second, divergent R0 re-point of the hygiene test — a naive merge lands 2 failing assertions (docs/50+51 pointers main removed); union resolution verified (main's file + branch's README banner assertions; main's README already satisfies all three).
- Production docs updated, structure preserved: **PRODUCTION-RECONCILIATION-REPORT.md** (new: baseline, 12-system verdict table, executed-evidence log, DEC-1 brief, corrections audit trail, risks, next phase, work packages, assignment plan, verdict); register **v1.1** (PH-2/MS-1 → IMPLEMENTED-branch; SYS-POP-02/03, SYS-POP-11, SYS-NAR-10 → INTEGRATED; SYS-WORLD-01 read-side note; SYS-ECO-09 sharpened; SYS-QA-09 both test counts; BR-1/2/5; DEF-3; change log); **NEXT-PHASE-EXECUTION-PLAN re-scoped** (WP-0 conflict list + E2E re-run; WP-1v pause-set gap; WP-2v = DEC-1 ruling + epoch mapping; WP-3v = ambient walker migration; parallelism map); README index row + v1.1 note.
- 4-day E2E **not** re-executed here (≈10 min beat-driven, no pace knob) — recorded as reported-only; its re-run is a WP-0 gate. **Nothing pushed to main** (owner approval required by the mission rules).

Stage Summary:
- Verdict: **B — CONDITIONALLY READY.** Both production Phases 1–2 exist on the branch with executed proof and the story is untouched; three conditions gate the next assignment wave: the owner rules DEC-1; WP-0 lands (DEF-3 union, E2E re-run, post-merge perf re-baseline); Phase-2 remainders close (D-3, WP-1v, MS-1 closeout). Then production-Phase-3 (A-1 registry-seeded nav graph — the seed schema already exists in the registry — A-2 doors/stairs, A-3 registry flip) builds ON TOP of the verified runtime.
- Gates at close: docs-only change; zero source files modified; no dependencies added; main 660/660 and branch 744/744 both recorded in the register.

---

## 2026-11-06 — Narrative Director: DEC-1 ruled (owner-approved Option A) — the calendar epoch is September 9, Year 1, and the records now say so

Task ID: DEC-1-RULE
Agent: Lead Narrative Director (Z.ai)
Task: Execute the owner's approved sequence for DEC-1: record the ruling in the canon register and the production decision records, correct `core/calendar.ts` to the September 9 epoch, re-pin the calendar tests, re-run the architecture branch's simulation tests, then proceed to WP-0 only behind the green gate. The adjudication itself is `docs/production/DEC-1-CALENDAR-CANON-DECISION.md` (pushed as fe07719).

Work Log:
- **Ruling recorded (this commit):** docs/narrative/15 §2 (DEC-1 row in Resolved decisions) + §7 (dated ruling entry) — **Day 1 = Tuesday, September 9, Y1**; the October mood-lock is presentation-only (doc 12 §5's own scoping); weekdays/weekends derive from the Tuesday anchor; the first post-cut Monday is Sept 22, Y1 (story day 14, inside the compressed C1 interstitial); years are 365 days, February fixed 28 (canon-silent on leap; deterministic rule stands). Production records updated: register v1.2 (SYS-ECO-09, R4, open-decisions header, change log — v1.1 row preserved), risks doc (DEC-1 → RULED; R-NEW-1 residual narrowed to the untested mapping), execution plan (WP-2v scope marked ruled; WP-6 example dateline corrected to "September 14 · Year 1").
- Correction, verification, branch-test re-run, and WP-0 integration follow in the sequenced commits of this same assignment; results logged in the entries below.

Stage Summary:
- The one time authority is now canon: **Day 1 = Tuesday, September 9, Year 1 — the arrival.** Seven canon documents said so; zero said October 1; the calendar now agrees with the story.
- Gates at this commit: docs-only change (canon register + production records + worklog); no source files modified yet; no dependencies added.

---

## 2026-11-06 — Narrative Director: the epoch correction lands — CAL_EPOCH is September 9, Year 1, and the suite is green on it

Task ID: DEC-1-EPOCH-FIX
Agent: Lead Narrative Director (Z.ai)
Task: Apply the owner-approved DEC-1 ruling to the code: `CAL_EPOCH` → Sept 9, re-pin the calendar tests, correct the epoch claims in Save/GameState comments, verify weekday math and every calendar-dependent test (owner sequence steps 3–4).

Work Log:
- `core/calendar.ts`: `CAL_EPOCH` → `{ y: 1, m: 9, d: 9 }`; header rewritten — the epoch cites doc 12 §1 + the DEC-1 ruling, the mood-lock is restated as presentation-only per doc 12 §5's own scoping, the §6 citation for "the calendar never negotiates" and the spine length is corrected (was §5). No-`Date` law untouched; February stays fixed 28.
- `tests/calendar.test.ts` re-pinned: Day 1 = Sept 9 (Tue); shipped Day 1–4 = Sept 9–12; Dec 31 Y1 = day 114; **new canon-chronology pin** — C0 closes day 7, C1 opens day 8 (the Sept 16 cut), first post-cut Monday day 14 (Sept 22), nor'easter days 51–54, the terminal day 809 (Nov 26, Y3).
- `core/Save.ts` + `core/GameState.ts`: epoch comments corrected (no schema change — `calendar_day` remains the additive counter; old saves re-render correctly under the new epoch; no date has ever rendered to a player).
- Weekday verification: calendar.ts intentionally has no weekday function — weekdays belong to the sim clock (world-contract 06 §2); the branch's `sim-clock.test.ts` pins day 1 = Tue / day 8 = Tue and is re-run green on the branch worktree (next entry). Independent arithmetic check (chronology script): Sept 9 = Tue ✓, Sept 15 = Mon ✓ (doc 06 §C0), Sept 16 = Tue, Oct 1 = Wed.
- Gates on main: `tsc --noEmit` clean; **vitest 661/661 (44 files, 7.1 s)** — the audit's 660 + the new canon pin; docs-hygiene green (R0 was re-pointed on main by WS-C).

Stage Summary:
- The playable game's calendar and the story bible now agree end to end: Day 1 = Tuesday, September 9, Year 1; C0 = days 1–7; every doc 12 §2 date maps to a positive story day and renders as authored.
- Gates at close: tsc clean · vitest 661/661 · no dependencies added · the mood-lock and all shipped beats untouched.

## 2026-11-06 — agent (Technical Architecture): the world contract — sim foundations, 17 docs, 113 new tests (R0 rides along)

The decree: establish the technical foundations that let FIRST SLICE become a
coherent, persistent, expandable open-world life simulation — audit first,
contracts second, implementation third, proof always. No rewrites, no new
dependencies, Yuka untouched, the narrative bible untouched, the 4-day story
untouched.

Work Log:
- Audited the actual codebase (25.4k lines TS): entry/init, World.ts monolith
  (6.5k lines, district culling, shadow economy), Game.ts orchestrator,
  GameState step machine, Save v1 laws, InteractionRegistry, Yuka peds +
  ROUTINE_STOP + M4 street schedule, traffic pure math, registry JSON + mjs
  gate, furniture costume law. Studied both reference repos under §1e
  (gen-city-auto: per-entity seeds + fork(salt) streams, ring lifecycle,
  stateless time-functions; slop-newyork: 1u=1m grid frame, blocks-first
  world model, derive-networks-from-built-ground). Findings in
  docs/architecture/world-contract/01.
- Implemented `web-three/src/sim/` (11 modules, all headless, zero new deps):
  ids.ts (two id spaces: registry UPPERCASE permanence + namespaced sim
  ids; rel pairs sorted `__`), rng.ts (mulberry32 family the world already
  uses + WorldRandom named streams + stable fork(salt)), clock.ts (tick =
  in-game minute; day 1 = Tue Sept 9 Y1 canon; no wall clocks anywhere),
  registry.ts (typed load of the REAL world-registry.json, cross-ref
  validation incl. the below-grade exemption, derived semantic tags,
  findPlaces/nearest-first, placePoint prefers doors), entities.ts
  (NpcState/RelationshipState/BusinessState/ItemState/WorldEventRecord +
  validators + businessIsOpen), schedule.ts (pure activityAt: weekday,
  overnight wrap, late-flags, fallback), arbitration.ts (priority matrix
  0-4, one-claim-per-NPC, resume stacks, capacity resources, R1-R8, the
  directive's S1-S7 contracted in-code), narrative.ts (flag store,
  availability registry with tick expiry, StoryEvent validation —
  NPC_MISSING/DOUBLE_BOOKED/UNAVAILABLE/PLACE_MISSING/BUSINESS_CLOSED/
  PREREQ/WINDOW — and the deliberate fallback planner:
  defer/reschedule/relocate/cancel, never silent), economy.ts (integer
  cents, append-only ledger, faucet/sink/transfer flow classes, overdraft
  policy, audit = genesis+Σ, flow reports), content.ts (manifest schema,
  license duty, ABO pack bridge), state.ts (WorldState + the OWNERSHIP
  table — a test walks every field — versioned save document, polite
  refusal for corrupt/foreign/unknown-version, ledger rehydration),
  reference.ts (the PART-6 world: canon places + bible characters with
  example schedules/hours/warmth + validation-exercise events + the
  shipped-prices ledger script).
- Tests: 11 new files, 113 tests (suite 605 → 718, all green). Fixed R0
  (the narrative spec's PRIORITY-0): docs-hygiene now guards
  docs/narrative/00-README.md's existence + dated canon banner instead of
  reading the rebooted-away docs — suite went from 2 known failures to 0.
- Docs: docs/architecture/world-contract/01–17 (audit → target → topology
  → identity → state → determinism → registry → sim/npc → arbitration →
  narrative → content → economy → reference world → workstreams →
  validation → perf/testing → roadmap). Status ledgers in every doc
  distinguish Implemented / Partial / Declared / Deferred / Unresolved.
- AGENTS.md §3 repo map + a WORLD CONTRACT pointer (the next agent reads
  14-agent-development-framework before starting a workstream).

Stage Summary:
- The four real gaps for an open world (no clock, no persistent people,
  no arbitration, no world-scale save) are now contracts + code + tests,
  beside (never instead of) the shipped systems. The reference world
  proves the stack end-to-end on the real registry: schedule resolution,
  a worked arbitration scenario, narrative validation pass AND fail
  paths, $87→$74 in audited ledger math, and a populated-world save
  round-trip.
- Gates at close: tsc --noEmit clean · vitest 718/718 (51 files) ·
  npm run build OK (bundle unchanged — sim is contract+tests until WS-D
  wires the valve) · registry mjs gate OK (129 ids, 12/12 masses, 18/18
  anchors) · game code untouched (Game/World/GameState/Save/peds/
  interactions all byte-identical).
- Known leftovers, named honestly in doc 01 §17 + 17: AGENTS.md prose
  still cites rebooted-away docs (06/50/51) — lead's call; below-grade
  interiors keep their compound SUB-01/SUB-02 reference (the shipped
  gate's own exemption, now documented in the contract); sim↔Game wiring
  (the time valve) is Phase 1 / Workstream D by design.

---
Task ID: WS-D-PHASE1-RUNTIME-INTEGRATION
Agent: World Architect (Phase 2 — runtime integration)
Task: The first functioning connection between the sim layer and the
shipped game, on feat/world-contract-foundation — in-game clock
integration, NPC schedule execution, behavior arbitration, persistent
simulation state, save/load (roadmap doc 17 Phase 1: D-1/D-2/B-1).

Work Log:
- Inspected before touching: Game.frame's order (dt clamped 0.1 s, the
  0.45× listen beat, dynamics-before-player), peds.ts (Yuka ambient only,
  band law, applyStreetPlan), the named-cast choreography, Save.ts
  (`first_slice_save_v1`, day-1-never-writes), beginDay's morning set.
- New `web-three/src/sim/runtime.ts` (PURE, keeps sim/'s no-THREE/no-DOM
  law): the D-1 valve (dt→whole in-game minutes through one accumulator;
  fractional carry; one-day burst cap — late time, never wrong time);
  geography-honest schedule bindings (canon anchors kept, windows re-timed
  to the shipped block: SUB-01→cart is a ~30-minute walk at 1.6 m/s);
  the schedule→arbitration policy (propose on plan change, R7 lateness
  escalation, fallback claims that never expire — no expire/introduce
  flap); the R6 hello door; NpcState.location sync per tick (Workstream
  B's first occupant); recordGreeting (warmth +4 once, one flag, one
  event — no invented prices); bootWorldBrain (restore-or-fresh, the
  polite-refusal law, reference cast + seeded edges on fresh worlds).
- New `web-three/src/game/worldRuntime.ts` (the BODY): per-frame hook
  before updateDynamics (same-frame collider syncs); directive executor
  (arrivals-from-off-map appear at their place, enroute-to-off-map walks
  to the station stair and vanishes — never against the invisible walls);
  clock-keyed dusk + M4 street plan flips in roam/scenario ONLY (story
  days keep their authored triggers — zero story rewiring); the world
  save rides `first_slice_world_v1` beside the story save (roam autosave
  30 s, day boundaries, roam exit, story persist beats); reloadFromSave
  for the in-browser save/load torture; a debug() surface.
- Game.ts surgical (~30 lines): construct, one frame hook, toggleRoam/
  persist/beginDay taps, applySimPhase + worldSimHello + worldDuskStarted
  (all additive; authored beats byte-identical). interactionDefs: the two
  hello interactions (pos parks at NEVER_NEAR when the person is away —
  the registry's own pattern; optional `worldSimBody` src keeps the
  harnesses stub-clean). ?scenario=schedules → new scenario.ts: the
  playable proof, auto-driven on the real street at accelerated time.
- loc:rosa_rooms joins REFERENCE_ALIASES (her rooms over the store are
  honestly off-map); doc 06/17 status ledgers flipped to what is now
  true (D-1 implemented; D-2 partial by design; B-1 bound-cast scope;
  D-3 open); AGENTS.md WORLD CONTRACT pointer updated.
- Tests: tests/sim-runtime.test.ts, 26 tests (valve math, Idris's and
  Rosa's full days, off-map despawn law, resolve-only + weekday windows,
  R1/R2/R3/R6/R7 through the brain, greeting weight, save round-trip,
  interrupted/wrong-magic/version/world/garbage → fresh each time,
  repeated-load idempotence, story-reconcile forward-only, 48 h audit
  green, 3 sim-days < 1 s). Suite 718 → 744.
- New probe scripts/probe-world-sim.mjs: the scenario in the real dist/
  build under Playwright — 15/15 PASS (1,424 sim-minutes in 66 s real):
  platform stand, walked transition to the cart, registry-fired hello
  interrupt, LIFO resume, persistent warmth/flag, save doc shape,
  truncated save → fresh + notes, exact restore, 3 invalid-data cases,
  repeated loads, clock-keyed dusk, multi-day continuity after load.

Stage Summary:
- The world now runs beside the story: one world, one clock, one ledger,
  one arbitration, ticked by the frame itself. Rosa works the deli
  06:00–22:00; Idris stands the 7:40 platform, walks to the cart for the
  usual, and goes home under the block; a hello stops them (HIGH) and
  the day resumes where they left it; the street plan and the dusk law
  read the clock in roam. Everything persists under its own key and
  refuses corrupt input politely.
- Gates at close: tsc --noEmit clean · vitest 744/744 (52 files) ·
  build OK · registry gate OK (129 IDs) · 4-day E2E 0 failures,
  no console errors · probe-perf zero page errors (draw calls in the
  shipped at-rest band) · world-sim probe 15/15.
- Known limitations, honestly: bodies walk straight lines (no nav graph
  yet — Phase 2 A-1); schedule-driven body control is roam/scenario-gated
  (story days keep authored choreography by contract); Eddie/Kev/Priya
  resolve in state but have no shipped bodies; ambient Yuka walkers keep
  the M4 shift system; D-3 (money → ledger behind confirm-gates) is
  deliberately open; the hello lines are mechanics prose for the
  Narrative Director to replace.

---

## 2026-11-06 — Narrative Director: WP-0 landed — the world contract is on main, green end to end at the ruled epoch

Task ID: DEC-1-WP0
Agent: Lead Narrative Director (Z.ai)
Task: Owner sequence step 6 — proceed to WP-0 integration only after the calendar correction passed. It passed (see DEC-1-EPOCH-FIX); the merge was executed behind the green gate, with the branch's simulation suite re-run first (owner step 5).

Work Log:
- **Branch suite re-run (step 5):** worktree at `407cc0e`, clean install — `tsc` clean · **vitest 744/744 (52 files, 7.8 s)**; `sim-clock` verbose re-run 10/10 (the Sept 9 Tuesday canon pins, the 365-day no-leap year walk, the save/load tick law). The architecture branch's simulation tests are green against the ruled epoch's canon.
- **The merge:** `git merge --no-ff origin/feat/world-contract-foundation` — exactly the audit's three predicted conflicts, resolved per the DEF-3 union: `AGENTS.md` (main's current-truth pointers kept; the branch's World Contract paragraph adopted, now ending with the DEC-1 sentence; the repo tree gains `docs/architecture/`), `worklog.md` (both sides' entries kept), `docs-hygiene.test.ts` (both sides' guards kept: main's AGENTS-pointers case + the branch's dated-banner case — main's README satisfies all three, as DEF-3 verified). `Game.ts` auto-merged; zero calendar-file conflicts (the correction and the branch never touched the same file).
- **Post-merge gates (all executed):** `tsc --noEmit` clean · **vitest 801/801 (56 files, 8.3 s)** · `probe-world-sim` **15/15 PASS** (1,424 simulated minutes, 67.7 s real, zero page errors) · **4-day E2E: 0 failures, 592 s, console clean** ("the wall holds, honestly"; save holds day 4 complete: $123, map, permit, stool) · perf re-baseline: drawCalls 119 (boot) / 184 (mid-street) / 256 (plaza-life), zero page errors — consistent with the B13 ledger, no regression signature.

Stage Summary:
- Main now carries the complete Phase 1+2 runtime (the sim kernel, the clock at the canon epoch, schedules, arbitration, the world save) **beside** the untouched shipped story and the narrative bible. The one time authority is real in code: Day 1 = Tuesday, September 9, Year 1, pinned by both `core/calendar.ts` and `sim/clock.ts` tests.
- Next: WP-2v's remainder (the one epoch-mapping function + pinned test), WP-1v, then Phase 3 per the plan.
- Gates at close: merge commit 1bb3152; tsc clean; vitest 801/801; probe 15/15; E2E 0 failures; perf re-baseline recorded; no dependencies added beyond the branch's own (playwright browser binary installed locally for the E2E/probes).

---

## 2026-11-06 — Production Director / WS-D: WP-2v implemented — the one epoch mapping, pinned, on `feat/wp-2v-epoch-map`

Task ID: WP-2V
Agent: Technical Integration Lead / Production Director (Z.ai)
Task: The plan's WP-2 remainder (NEXT-PHASE-EXECUTION-PLAN.md, WP-2 re-scope): "one mapping function + pinned test reconciling story day ↔ sim day ↔ displayed date." Assignment named branch `feat/wp-2v-epoch-map` @ `d7529d7` for review-and-integrate; **reconciliation finding: that branch and commit do not exist on the remote** (`git cat-file` — not a valid object; `git branch -r` — no such ref), and the register (SYS-ECO-09) already recorded the mapping as the *remaining* work. Reconciled per the governance law by implementing WP-2v exactly to the plan's spec on the intended branch name, then integrating. Nothing was assumed about `d7529d7`'s content; no fabricated review.

Work Log:
- **`web-three/src/sim/epochMap.ts` (new, the one mapping):** story day ↔ sim day ↔ calendar day, 1:1 by law; `simTickOfStoryDay` states the bridge's morning anchor (`(N−1)·1440 + 07:40`, `SIM_MORNING_MINUTE`) once; the canonical dateline (`datelineOfStoryDay`/`datelineOfSimDay` → "September 9 · Year 1", full months per DEC-1 §4.1 convergence) is the single render path WP-6 will consume; `calendarDayForStoryDay` states the save-read law (`calendar_day` absent → story day); **`epochAgreement()`** proves the two layers' epoch constants agree AND that the two independently written date derivations (core's month walk vs the sim clock's month walk) agree across a four-year horizon — a tampered constant or drifting algorithm surfaces as a NAMED issue, `assertEpochAgreement()` throws. **Invalid input throws** (NaN/fractions/zero/negatives/past the 36,500-day ceiling): garbage can never render as a plausible date. The one `sim/ → core/` import edge is deliberate and documented (the module's job is holding the two layers' time in agreement; core/calendar.ts is pure, zero imports).
- **`web-three/tests/sim-epoch-map.test.ts` (new, 25 pinned cases):** the 1:1 law round-trips; the 07:40 anchor; the doc 12 §2 chronology through the mapping (arrival, C0's Monday close day 7, day-8 season cut, **day-14 first post-cut Monday** — DEC-1 §4.1's pin, days 5–6 first weekend, nor'easter 51–54, day-114 year end, day-120 C2 open, **day-809 terminal = Nov 26, Y3**); one dateline from both sides across 1,000 days, never a real year; the junk-input battery; epoch-agreement tamper tests (the old October misread is caught by name); the four-year derivation walk in full; save round-trips (world save + clock) render identical datelines; the no-wall-clock source law extended across the new layer.
- **`web-three/src/game/worldRuntime.ts` (wiring only, behavior-identical):** `onStoryDayBegin` now reads its morning target from `simTickOfStoryDay` — the exact arithmetic it always applied, now stated in one place (the "no unnecessary duplication of calendar logic" review criterion). Booked Game.ts-adjacent single-writer window: this file only.
- **`web-three/tests/calendar.test.ts` (the required calendar-side extension):** the calendar suite now reaches across the new layer — `epochAgreement()` agreed, and the mapping renders this calendar's dates with zero forks.
- **Pre-merge saves and the date re-render (WP-2v acceptance, no silent data loss):** saves carry day *counters* (`day`, `calendar_day`), never rendered date strings; `formatGameDate` had zero callers before this WP and no UI renders a date yet (WP-6 unlanded), so no player-visible date changes. Any future render under the ruled epoch shows Sept 9–12 for the shipped Days 1–4; the mapping's save-read law keeps old saves parsing unchanged (pinned).

Stage Summary:
- The calendar architecture is now closed under DEC-1: one epoch, one mapping, one dateline format, agreement enforced by name, garbage refused loudly. WP-6 (diary/HUD visibility) has its sanctioned render path.
- Next: integration into main behind the full post-merge gate battery (tsc · vitest · build · probe-world-sim · 4-day E2E), register evidence, then WP-1v (the pause-set gap).
- Gates at close (branch `feat/wp-2v-epoch-map`, pre-merge): tsc clean · **vitest 829/829 (57 files, 8.6 s)** · build OK (chunk-size warning pre-existing) · targeted calendar/epoch/runtime/state battery **94/94**. Probe + E2E are owed POST-merge per the assignment's evidence law — not claimed from the branch.

---

## 2026-11-06 — Technical Integration Lead: WP-2v INTEGRATED + VERIFIED on main — the calendar closes under one law

Task ID: WP-2V-INTEGRATION
Agent: Technical Integration Lead / Production Director (Z.ai)
Task: Part 1 of the assignment — integrate `feat/wp-2v-epoch-map` into the latest main, never force-push, never overwrite unrelated changes, and mark VERIFIED only on post-merge evidence.

Work Log:
- **Integration:** `git merge --no-ff feat/wp-2v-epoch-map` at main `7995e6e` → merge commit **`eab767c`** (impl `991a236`; 6 files, +553/−3). Zero conflicts — main had not moved since the branch (remote fetched and re-verified immediately before branching; no other agent's work in scope, nothing overwritten).
- **Post-integration gates (all executed on the integrated tree — no pre-merge result is claimed as evidence):**
  - `npx tsc --noEmit` — clean.
  - `npx vitest run` — **829/829, 57 files, 8.5 s** (WP-0's 801 + 28: epoch-map 26 + calendar extensions 2).
  - `npm run build` — OK (pre-existing chunk-size warning only).
  - Calendar + epoch-map + clock + runtime + save/load targeted battery — **94/94** (epoch-map 26 · calendar 19 · sim-runtime 26 · sim-state 13 · sim-clock 10).
  - `probe-world-sim` (built dist, `?scenario=schedules&worldclock=120`) — **15/15 PASS**, 1,424 simulated minutes in 69.1 s real, zero page errors. (Playwright's chromium binary was re-installed in the recycled sandbox first — an environment step, not a repo change.)
  - Four-day story E2E (`scripts/e2e.mjs`, `?autotest=1`) — **0 failures, 543 s, console clean**; the wall holds ("day 5 does not begin"); save holds day 4 complete: $123, map, permit, stool.
- **Review findings recorded for the report:** mapping is 1:1 by law and by test; Sept 9 epoch consistent across both layers (`epochAgreement()` — constants, echoes, weekday anchor, four-year derivation walk); midnight transitions pinned (dayBoundary); date formatting converged on "September 9 · Year 1"; agreement detection catches tampering BY NAME (the October misread test); save/load compatible (counters only; dateline-stable round trips pinned); no runtime side effects (pure module; the one wiring change is behavior-identical); no duplicated calendar logic (the bridge now consumes `simTickOfStoryDay`).

Stage Summary:
- **WP-2v status: INTEGRATED + VERIFIED.** The calendar is closed: one epoch (DEC-1), one mapping (`sim/epochMap.ts`), one dateline format, agreement enforced by name, garbage refused loudly, saves untouched.
- Next per the assignment's sequencing: **WP-1v** (the wardrobe/postcard pause-set gap) — implementation may now begin.
- Gates at close: merge `eab767c` on main; tsc clean; vitest 829/829; build OK; targeted 94/94; probe 15/15; E2E 0 failures (543 s, console clean).

---

## 2026-11-06 — Technical Integration Lead: WP-1v implemented — wardrobe and postcard join the host pause set, on `feat/wp-1v-pause-set`

Task ID: WP-1V
Agent: Technical Integration Lead / Production Director (Z.ai)
Task: Part 2 of the assignment (begun only after WP-2v was INTEGRATED + VERIFIED at `b0277ad`). The plan's WP-1 remainder: "the wardrobe and postcard surfaces are not in the pause set. Close the gap or justify its absence with a test."

Work Log:
- **The defect, identified precisely:** `Game.frame` fed the valve `arrival.active || dayFading || nameBox || orderCard || starterCard`. A held wardrobe fitting or a held postcard (day-end, D2–D4, or the Wow moment — player frozen, rig up) was NOT in the set, so the sim clock kept ticking behind the overlay: Idris could leave the platform, dusk could fall, midnight could cross mid-fitting/mid-reading. A tick boundary could truncate a held beat — exactly the class WP-1v exists to close.
- **Intended behavior, determined from the shipped design (not assumed):** the wardrobe is "the fitting room, not a switchboard" — a held beat (movement already freezes behind it). A postcard is read, not lived through. **The Map is deliberately NOT a member:** the notebook is "always available, never forced," and the city keeps breathing while you read it (the Roam law) — the pause set must not grow over the map. No second clock, no second authority: the host's decision, written once; the valve (`sim/runtime.ts`) untouched.
- **Implementation:** `web-three/src/game/pauseSet.ts` (new, pure): `WorldPauseHost` (the seven host facts) + `worldPaused()` — the pause expression as one testable statement. `Game.frame` now feeds `worldPaused({…wardrobeOpen: this.wardrobe.isOpen, postcardOpen: !this.ui.postcardPanel.hidden…})` to the same `worldSim.update(dt, paused)` door. The valve internals, `sim/clock.ts`, `core/GameState.ts`, `world/*`, `core/content.ts`: untouched (the WP's must-not-modify list held).
- **Regression tests (11 pinned cases, exact tick counts — in `tests/sim-runtime.test.ts`, the owned file):** the host loop is driven exactly as `Game.frame` drives it (`if (!worldPaused(host)) brain.advanceReal(dt)`) with dt = 1/64 s — binary-exact, so 64 played frames ARE one in-game minute: (1) gameplay advances — +2 ticks over 128 frames, exact; (2) wardrobe open/held/interacted — zero ticks across a minute boundary; (3) held postcard — zero ticks, dusk cannot fall mid-view; (4) closing resumes from exactly the held tick (+1 after one earned minute); (5) no accumulation-and-release — two earned halves complete exactly ONE tick after a 32-minute hold, and eight more minutes yield exactly +8 (no delayed burst); (6) rapid open/close churn — interrupted run reads exactly like the same number of honest earning frames, never more than uninterrupted play; (7) all five story pauses remain members, each alone; (7b) the Map is NOT a member (the interface has no map field — pinned); (8) paused frames never move NPC schedules or arbitration — Idris's platform claim and a held hello freeze with the clock, resume honestly (and the 07:31 platform claim is authored HIGH, so a HIGH hello queues behind it by R1 — correct, and now documented in-test); (9) save/load with a held overlay round-trips to the exact tick. Plus a permanent source guard: Game.ts must feed `worldPaused` naming wardrobe + postcard; pauseSet.ts must never grow a map field or a wall clock (AGENTS §1c.1 — the class of mistake cannot return quietly).
- **Browser verification:** `scripts/probe-pause-set.mjs` (new) on the built dist — 11 steps: gameplay +2 ticks/3 s; **wardrobe held: Δ=0 ticks across 3 s** (≈3 unpatched); close → resumes +2, no burst; **postcard held: Δ=0 ticks across 3 s**; dismiss → +3, no burst; **map open: the block keeps breathing (+2 ticks — by design)**; 60 rapid wardrobe toggles → no phantom time. Console clean.
- **Story regression:** the 4-day E2E replays every postcard beat (day-end, D2–D4, the Wow card) under the new pause set — **0 failures, 532 s, console clean**; save holds day 4 complete ($123, map, permit, stool). Choreography untouched.

Stage Summary:
- The host pause set is now one pure statement with the wardrobe and postcard inside it and the map deliberately outside it — pinned at three layers (pure predicate, source guard, browser probe). Held beats can no longer be truncated by a tick boundary.
- Files changed: `src/game/pauseSet.ts` (new) · `src/game/Game.ts` (the call site + import, ~15 lines) · `tests/sim-runtime.test.ts` (+11 cases) · `scripts/probe-pause-set.mjs` (new) · register/plan/risks rows.
- Next: integration to main behind the full post-merge battery, then the Part 4 recommendation (WP-4 vs Phase 3 navigation).
- Gates at close (branch `feat/wp-1v-pause-set`, pre-merge): tsc clean · **vitest 840/840 (57 files)** · build OK · sim-runtime 37/37 · **probe-pause-set 11/11, console clean** · 4-day E2E **0 failures** (532 s, console clean).

---

## 2026-11-06 — Technical Integration Lead: WP-1v INTEGRATED + VERIFIED on main — the pause set closes, both WPs green end to end

Task ID: WP-1V-INTEGRATION
Agent: Technical Integration Lead / Production Director (Z.ai)
Task: Part 2 integration + runtime verification — merge `feat/wp-1v-pause-set` to main, never force-push, mark VERIFIED only on post-merge evidence; then the Part 4 recommendation.

Work Log:
- **Integration:** `git merge --no-ff feat/wp-1v-pause-set` at main `b0277ad` → merge commit **`0e22ff5`** (impl `91687e3`). Zero conflicts; nothing overwritten.
- **Post-merge battery (all executed on the integrated tree):** tsc clean · vitest **840/840 (57 files, +11)** · build OK · targeted calendar/epoch/runtime/state **105/105** (sim-runtime 37 · epoch-map 26 · calendar 19 · sim-state 13 · sim-clock 10) · `probe-world-sim` **15/15** (1,424 sim-min, 71.5 s real, zero page errors) · `probe-pause-set` **11/11, console clean** (wardrobe/postcard hold the clock at exactly 0 ticks; resume without burst; the map keeps the block breathing; 60 rapid toggles, no phantom time) · 4-day E2E **0 failures (601 s, console clean)** — every postcard beat and day transition replayed under the new pause set; the money wall holds ($87→$112→$123).
- **Environment note:** Playwright's chromium binary was re-installed after the sandbox recycle (environmental, not a repo change).
- **Part 4 recommendation (no implementation — separate authorization required):** see the FINAL REPORT accompanying this entry — **A-1 (the navigation graph) first, WP-4 (D-3 money bridge) second**; details below.

Stage Summary:
- **WP-2v: INTEGRATED + VERIFIED. WP-1v: INTEGRATED + VERIFIED.** The clock now has one mapping, one dateline, an enforced epoch agreement, and a host pause set that holds still for held beats while the block keeps breathing under the map.
- Open next per the plan: WP-3v (ambient walkers), WP-4 (money bridge), WP-5 (R2+R7), WP-6 (diary/date UI — consumes the mapping), WP-7 (evidence).
- Gates at close: main `0e22ff5`; tsc clean; vitest 840/840; build OK; targeted 105/105; probe-world-sim 15/15; probe-pause-set 11/11; E2E 0 failures (601 s, console clean).

---

## 2026-11-06 — Technical Architecture / World Systems Agent: PHASE 3 A-1 + A-2 implemented — the registry-seeded navigation graph, building access, and the routed bound cast, on `feat/phase-3-navigation-building-access`

Task ID: PHASE-3-A1A2
Agent: Technical Architecture / World Systems (Z.ai)
Task: The Phase-3 assignment — A-1 (navigation foundation) + A-2 (building entrances/access) + runtime NPC integration, per the plan §2b order ("A-1 first") and the owner's Phase-3 directive. Gen-city-auto studied first (actual source, not README); findings recorded in docs/57 §3.7.

Work Log:
- **Reconnaissance (recorded for comparison):** main was at `62a6244` (WP-0/1v/2v merged); baseline gates executed on main before any change — tsc clean · vitest 840/840 (57 files) · build OK. The known Phase-3 defect found at `worldRuntime.applyOne`: bodies lerp STRAIGHT at the directive target, across active lanes and through nothing — because the executor is position-blind by design (the brain sends a place point; the body ignores the world getting there).
- **The gen-city-auto verdict (docs/57 §3.7):** it has NO pathfinding at all — its pedestrians are chain-pong set dressing and its cars pick greedy seeded exits. What transfers: the uniform-grid spatial-index pattern (one-time build, expanding-ring nearest, packed integer keys — resized for our ±84 m world), the arc-length follower discipline (adapted to a polyline + rate-limited heading; per-crossing Bézier sampling would be allocation churn at body scale 2), and the determinism/allocation discipline. The graph, A*, access model and follower are OURS. No new dependencies (it has zero; we add zero). Its license is declared MIT in package.json with no LICENSE file — nothing was copied verbatim; patterns only.
- **A-1 — the movement graph (`sim/nav/graph.ts`, `build.ts`, `spatial.ts`, `pathfind.ts`, `index.ts`):** the wc-03 §3 shapes verbatim, plus two recorded contract extensions (the `path` node kind; the `door` edge kind carrying `door:<id>`). DERIVED from the registry — streets' walk bands + the routes.pedestrian lane law (validated in-band at build: throws, never walks through a moved band), all 26 crosswalk legs (10 concrete + the 16 pattern legs the registry describes as "XW-GJ-*", matching World.ts's zebra layout exactly), building entrances as door nodes, interiors as lobbies joined by ONE door edge, the SUB-01 stair as the mezzanine's landing, park centers + the two registry alley shortcuts. Footprint sweep: blocked lanes get curb-cut bypass bends (SUB-02's control house on the Kestrel south lane); the SUB-01 headhouse stays WALKABLE per the shipped no-blocker law (World.ts's reconciliation comment — the placeholder stair-cut boxes were retired because they pinched the north walk shut; pinned by test). Walled-in doors (KTN-07 south behind KTN-06, TEN-01[0] behind SUB-02) are removed from the graph and REPORTED as notes — honest gaps, not fake access; KTN-07 falls back to its connected east door. Graph: 401 nodes / 444 edges / 1 component; two builds serialize byte-identically (determinism pin). A*: admissible Euclidean heuristic, cost = length × kind multiplier (walk 1 / cross 1.35 / door 1.5), ties break on node id, unreachable → null + reason, 4000-expansion budget, LRU cache (256) invalidated as one unit on door changes (the access epoch). Spatial: one 8 m uniform grid, expanding-ring nearest (1.8 µs measured).
- **A-2 — building access (`sim/nav/access.ts`):** `door:<buildingId>` records seeded from the registry's entrances × interiors; four-state machine (open/closed/locked/unavailable) with `setDoorState` the single mutation; public/restricted (the Cecil's room locked by canon — Leo's room is Leo's); published-hours gating seeded ONLY from the cast's own schedule windows (Rosa's deli 06:00–14:00/17:00–22:00 — zero invented numbers; SYS-ECO-01 replaces this with business-hours data later); enter/exit transitions recorded (bounded 512) when a body walks a door edge; `reachability()` answers REACHABLE / PLACE_MISSING / PLACE_INACCESSIBLE / NO_ROUTE — [07] §7's wired-and-waiting code has its function. The pathfinder's gate asks THIS module: a locked/closed door is not an edge, so no route can ever walk through one.
- **Runtime integration (`game/worldRuntime.ts` + `sim/runtime.ts` + `game/scenario.ts`):** `applyOne` now walks ROUTES — `RouteFollower` (polyline arc-length stepping, overshoot carried across corners, heading rate-limited 0.85 rad/m so nobody pivots on a coin), rebuilt ONLY when the destination key or the access epoch changes (per-frame cost = one polyline step, same shape as the shipped lerp). Dialogue freeze, away-hide, spawn-snap (the "nobody walks in from nowhere" cast law) and the walk-home despawn leg: byte-for-byte the shipped behavior. Rosa's stand point stays the resolver's door point (the shipped stand law); routed interior entry is A-2's model, pinned headlessly, landing with WP-3v/WP-4's customer interiors. Door crossings record enter/exit exactly when the follower's traveled counter passes the corridor (enter at the facade plane, exit at the corridor end — the seg-clamp blind spot for last-edge doors was caught by the alignment test and replaced with arc-distance triggers). `sim.debug()` exposes nav stats + per-body routed/routeLeft/routesWalked. `Game.ts`: ZERO changes (single-writer law held).
- **The honest walk-window re-timing (`sim/runtime.ts`):** the routed block is longer than the straight line — the platform→cart leg measures 59.0 m through XW-CANON = 36.9 honest minutes at the authored 1.6 m/s sim pace (the pace law "arrival times in sim minutes never depend on how fast the clock runs" holds; measured, not assumed). The travel windows carry the routed distance with the same margin style as the file's own "48 m ≈ 30 honest minutes" precedent: walk-cart 07:52→**08:32**, usual →**09:14**, walk-home →**09:55**. Canon minutes untouched: 07:22 walk-in, the 07:40 platform, 06:00 deli open, 22:00 close. One pinned test minute moved with it (sim-runtime.test.ts), plus a new pin at 08:31 that the walk is STILL WALKING (the routed distance is load-bearing, not decorative).
- **Browser proof:** `?scenario=nav` (additive branch in scenario.ts; the schedules path byte-identical) + `scripts/probe-nav.mjs`: 9/9 executed in the real dist build — graph boots clean (issues 0, 1 component), Rosa at her shipped door post, Idris's commute ROUTED (follower on, routesWalked > 0) crossing at the canon zebra, the Cecil room refusing routes (PLACE_INACCESSIBLE), the deli door hour-gated in-browser (open route exists; the 15:00 ask refused), exit reading the same door in reverse, facade sampled clean at 0.5 m except the door corridor, and no recalculation storm (routes derive on destination change only; frame time REPORTED — SwiftShader software GL is not the perf gate). Screenshot: `web-three/shots/probe-nav-street.png`.
- **Performance (all measured, node v24, dev machine — `scripts/perf-nav.ts`):** graph + indices build 16.6 ms ONCE at boot; A* 866 µs uncached / 10 µs cached per query; nearest-node 1.8 µs; follower step 0.18 µs; 50 concurrent followers = 5.1 µs per frame against a 16,000 µs budget (0.03%); steady-state heap +697 KB over 100k cached queries (LRU-capped, bounded). Render cost: ZERO (drawCalls 119/184/256, byte-identical to the shipped ledger).
- **Defects found and fixed during the build (each now a permanent guard):** the bend-weave sort ordered the far mouth's lane point before its skirt point, weaving a diagonal straight through SUB-02 (caught by validate → rebuilt as atomic runs with explicit weave order); routeTo's exact-endpoint splice cut through buildings when the destination was inside a footprint (now clear-leg-checked with graceful fallback to the snapped node); door-edge transitions never fired for routes whose LAST edge is the door (the follower's seg clamp — replaced with arc-distance triggers + an alignment test); unconnectable doors left orphan nodes (removed + noted); the route-length→window desync (re-timed honestly, pinned by the 08:31 still-walking test).

Stage Summary:
- **A-1: DONE. A-2: DONE. Runtime NPC integration: DONE for the bound cast** (the only destination-moving NPC path in the shipped runtime; ambient walkers keep their authored loops by design until WP-3v — the contract's own sequencing, crowd/solidity/shuffle guards green throughout).
- Files: `src/sim/nav/` (graph/build/spatial/pathfind/access/follower/index — 7 modules, ~1,300 lines, pure, source-guarded) · `src/sim/registry.ts` (+axis field) · `src/sim/runtime.ts` (window re-timing + comment) · `src/game/worldRuntime.ts` (routed executor + door bookkeeping) · `src/game/scenario.ts` (nav scenario branch) · tests `sim-nav.test.ts` (25) / `sim-nav-runtime.test.ts` (5) / `sim-nav-source-law.test.ts` (3) / `sim-runtime.test.ts` (re-pinned minutes) · scripts `probe-nav.mjs` + `perf-nav.ts` · docs (register v1.5.0, checklists, plan §2c, risks R-NEW-15/16, wc-03/wc-07 ledgers, docs/57 §3.7).
- Gates at close (ALL executed on this branch): tsc clean · **vitest 873/873 (60 files, +33)** · build OK · **probe-world-sim 15/15** (76.9 s — the shipped proof green on the routed runtime, R6 hello interruption included) · **probe-nav 9/9** (46.7 s, console clean) · **probe-pause-set 11/11** · **4-day E2E 0 failures** (545 s, console clean; save holds day 4 complete: $123, map, permit, stool) · registry mjs OK (129 IDs, fidelity 12/12 + 18/18) · perf re-baseline **119/184/256 drawCalls, zero drift**.
- Honest scope notes: A-3 (registry geometry flip, DEC-4) NOT started — the nav layer reads the registry READ-side only; E-1 content catalogue not started; chokepoint capacity claims not started (the resourceRef wiring is in); ambient-walker migration is WP-3v's booked file (peds.ts untouched here); the door/access model supports player-facing doors but no new player door UI was invented (none ships today).
- Branch `feat/phase-3-navigation-building-access` — commits kept clear (foundation / access / integration+tests+perf / docs). Not pushed, not merged: awaiting the owner's workflow authorization per governance.

## 2026-11-06 — Phase 3 INTEGRATED to main + the integration review (register v1.6.0)

- **Recon:** origin/main had moved to `62a6244` (WP-2v + WP-1v merged, docs); the Phase 3 branch
  `feat/phase-3-navigation-building-access` @ `12eed7a` is a clean fast-forward on it (merge-base =
  `62a6244`), `follower.ts` present in the tree, all six reported commits verified one by one.
- **Source review (every nav module + the runtime seam, not the report):** graph laws, builder
  determinism, door/access model, follower seam math, save/load, perf discipline — sound. Two genuine
  defects found and fixed (`ad81c3b`):
  1. **A* suboptimal** — the no-repush improvement (update g/cameFrom, never reorder an open node)
     was fuzz-proven suboptimal on the shipped graph's own cost class (length × multiplier ≥ length):
     65/4800 queries up to 5.4% long vs a Dijkstra reference. Fixed with the lazy-deletion law
     (every strict improvement pushes; the sorted open list pops the freshest first; stale siblings
     skip on the closed check). Same fuzz after the fix: 0 mismatches, 0 nondeterminism. Pinned by a
     seeded Dijkstra-oracle test.
  2. **Clock-blind caches** — route caches keyed on coordinates only, but hour-gated doors (ROS-01:
     06–14, 17–22) change traversability as the clock advances with NO setDoorState call. Routes now
     key on `availabilityKey(minute)` (which doors are traversable right now); `worldRuntime.navEpoch`
     folds the minute-driven `availabilityGen`, so a walk crossing an hour boundary re-derives exactly
     once. Latent today; exactly the trap WP-3v/WP-4 customers would spring.
- **Merge:** local main fast-forwarded `7995e6e`→`62a6244`, then `git merge --no-ff` → `b1df252`.
  Zero conflicts. No force-push, no history rewrite. **NOT PUSHED — awaiting owner authorization.**
- **Post-merge gates on the integrated tree (all executed):** tsc clean · vitest 876/876 (60 files,
  +3 pins) · build OK · probe-nav 9/9 (47.9 s) · probe-world-sim 15/15 (78.6 s) · probe-pause-set
  11/11 · 4-day E2E 0 failures (555 s, console clean) · perf-nav: build 18.9 ms once, A* 866 µs
  uncached / 7.8 µs cached, nearest 2.3 µs, follower 0.155 µs, 50 followers 4.0 µs/frame (0.03% of
  the 16 ms budget) · drawCalls 119/184/256 — zero drift.
- **Environment note:** the sandbox Playwright Chromium was missing; `npx playwright install chromium`
  repaired it. The probe failures before that were environment failures, not product failures.

## 2026-11-06 — WP-3v: the living pedestrian runtime (register v1.7.0)

- **Design:** ambient walkers keep Yuka (steering/avoidance/separation) and
  every shipped hard guarantee; they gain destination movement over the ONE
  Phase 3 graph. `pedCommute.ts` owns the pure laws; `peds.stepCommutes`
  builds routes under a 2/frame budget (round-robin), detects arrival
  (path finished + arrive radius, or 3 stuck windows — nobody grinds),
  arms dwells via the SHIPPED machinery (dwellLeft/faceTo/pin — one code
  path for loop beats AND destination dwells), re-derives routes once per
  availability epoch, and tier detail deterministically (near full / mid
  anim-every-other-frame / far steering+body only). The pin pass now
  allocates nothing per frame. Game.ts untouched; the sim runtime never
  sees the ambients (no schedules, no arbitration — the populations stay
  separate by law). No second clock: the epoch reads the sim minute;
  dwell runs on the ambient dt (the shipped "map keeps the block
  breathing" law, unchanged).
- **The gap law — a genuine Phase 3 builder defect, caught by the new
  tests:** sidewalk spines ran straight through Kestrel mid-block (x
  ±61.5/±82.5) and the EW lanes through the avenues — jaywalk edges the
  authored loops never had. Closed: perpendicular roads are no-bridge
  spans; through-traffic crosses only at zebras + intersection corners
  (landing curb aprons excepted); `EDGE_THROUGH_ROAD` pinned in
  graph.validate on the shipped world. Graph now 377 nodes / 396 edges /
  still ONE component (zebras + corners reconnect it).
- **Files:** `src/world/pedCommute.ts` (new, pure) · `src/world/peds.ts`
  (setCommute/stepCommutes/LOD/pin-buffers) · `src/sim/nav/index.ts`
  (routeToStreet, streetDestinations, crosswalkBands) ·
  `src/sim/nav/build.ts` + `graph.ts` (the gap law + EDGE_THROUGH_ROAD) ·
  `src/game/worldRuntime.ts` (armAmbientCommute, seed 20261106) ·
  `src/world/World.ts` (pass-throughs) · tests `ped-commute.test.ts`
  (+13) · scripts `probe-ped-nav.mjs` (new) + `perf-peds.mjs` (new) ·
  probe-peds discipline generalized to the district law.
- **Gates at close (all executed):** tsc clean · vitest 889/889 (61
  files) · build OK · probe-ped-nav 7/7 (75 s live street: 116 samples,
  zero footprint/jaywalk hits, 5 routes completed, no persistent overlap,
  console clean, 2 screenshots) · probe-peds green · probe-nav 9/9 ·
  probe-world-sim 15/15 · probe-pause-set 11/11 · 4-day E2E 0 failures
  (606 s, console clean).
- **Performance (measured, perf-peds.mjs, node v24):** peds.update 26.4
  µs/frame armed vs 18.1 µs loop walkers — the commute adds 8.3 µs
  (0.16% of the 16.6 ms budget); 38 routes walked in 300 s of street
  time; steady-state heap flat; drawCalls unchanged (zero new materials).
- **Merge:** `git merge --no-ff feat/wp-3v-living-pedestrians` → main
  `e3f1b02`; post-merge gates re-executed (tsc clean, 889/889, build OK,
  probe-ped-nav 7/7, probe-nav 9/9). NOT PUSHED — awaiting owner
  authorization.
- **Honest scope notes:** ambient walkers never claim interiors (the
  STREET gate is the law — customer interiors ride WP-4); chokepoint
  capacity claims (A-2 remainder) still open; the far LOD tier (>90 m)
  is unexercised at the shipped 12-walker roster (all within tiers);
  gen-city-auto re-read recorded in docs/57 §3.7.1 with MIT attribution
  — its decorative pedestrian movement is NOT a navigation solution and
  none of it is used.

## 2026-11-06 — Technical Architecture / World Systems Agent: WP-4, the money→ledger bridge (register v1.8.0)

**Directed by the owner's "Continue working"** after the Phase 3 + WP-3v work was pushed
(`main` `dcff32c` verified on origin). The plan's §2b order put A-3 first, but A-3 is the
registry geometry flip — DEC-4, explicitly the owner's call — so the next sequenced,
non-owner-gated item was **WP-4 (the money→ledger bridge, D-3)**. WP-6 remains unblocked
and disjoint for a parallel window.

- **What landed (branch `feat/wp-4-money-bridge` @ `2203f05`, from main `dcff32c`, not yet
  merged):** `src/sim/moneyBridge.ts` (new) + the Game.ts wiring (boot wrapper install, the
  interaction id as the trace's intent column, reconcile at the load seam, syncMirror at
  fresh genesis) + `worldRuntime.debug()`'s read-only ledger trace +
  `tests/sim-money-bridge.test.ts` (23 cases) + `scripts/probe-money-trace.mjs` (the browser
  proof). **Zero GameState edits; zero economy.ts/state.ts edits** — the bridge observes.
- **The design laws:** GameState keeps owning story math (wc-05 §2's one-way bridge); the
  bridge posts the ACTUAL delta (post-clamp, post-replay — a replay day posts nothing, a
  clamped spend posts what actually left); categories come ONLY from wc-12 §3's closed sets
  via the shipped-moments table (the wc-12 §4 worked examples are rows: the $5 rush cup is a
  business_revenue FAUCET — the customer is not a simulated account, Rosa's deli is not
  debited; the $10 permit is a service sink; Rosa's rule $2 is a reward faucet; shelf buys
  transfer to `biz:rosas_deli`, pizza/barber to theirs); unmapped movements route via
  `acct:world` with loud reasons — honest, never a silent guess; ids are
  `txn:story_<tick>_<n>` (tick + the ledger's own contents — deterministic, unique forever,
  no Date.now, no random); boot reconciliation repairs a lagging world save as a traceable
  transaction (the storage-full drift case self-heals with the audit holding from genesis);
  the declared business mirror (`BusinessState.balanceCents`) follows transfers.
- **Gates on the branch tree (all executed):** tsc clean · vitest **912/912** (62 files,
  +23 money-bridge) · build OK · **probe-money-trace ALL PASSED** (genesis $87.00 on BOTH
  mirror sides / 0 txns → five +$5.00 business_revenue faucets → $112.00; the sanctioned
  mirror holds; audit clean; ids deterministic) · probe-world-sim 15/15 · probe-pause-set
  11/11 · probe-nav 9/9 (46.9 s) · probe-peds green · **4-day E2E 0 failures** (610 s,
  console clean — the day-4 save holds **$123**: the E2E's money math is UNCHANGED, now
  transactional) · perf-peds **25.0 µs/frame armed** (0.15% of the 16.6 ms budget), heap
  flat, 38 routes in 300 s — no per-frame cost added (the bridge is event-driven).
- **DEF-14 filed (R-NEW-17):** probe-ped-nav step 4 ("walkers keep separation") flaked —
  walkers 5|7 at 0.59 m for 3 consecutive samples. Reproduced 1-of-3 on CLEAN main
  `dcff32c` BEFORE any bridge code ran, and again on the branch tree — a pre-existing
  WP-3v verification flake, not a WP-4 regression. WS-B owns the fix (corner-case
  separation term or a principled probe hysteresis); not tuned blind here.
- **Tooling note:** `perf-peds.mjs` (and any node-side script importing `src/sim/*`) must
  run via `npx vite-node` — plain node ESM cannot resolve the src tree's extensionless
  imports (an ERR_MODULE_NOT_FOUND pre-existing on main; the JSON-import-attribute variant
  of the same class also pre-exists). No product source was touched for this.
- **Not pushed** — awaiting owner authorization. Next per §2b: WP-6 (diary/date visible,
  disjoint files); A-3 (DEC-4) remains owner-gated.

## 2026-11-06 — WP-4 INTEGRATED to main (register v1.8.1)

`git merge --no-ff feat/wp-4-money-bridge` → main **`3a9984d`** (zero conflicts, full
history preserved). Post-merge battery re-executed on the integrated tree: tsc clean ·
vitest **912/912** (62 files) · build OK · **probe-money-trace ALL PASSED** — and the
Day-1 trace came back **byte-identical across two independent boots**
(txn:story_494_0…497_0): determinism proven in the live game, not just the unit suite.
The four-day story's $87 → $112 → $123 math passes unchanged — it is now traceable from
genesis on every save. NOT PUSHED — awaiting owner authorization.

## 2026-11-07 — WP-6 LANDED + INTEGRATED to main (register v1.9.0)

`git merge --no-ff feat/wp-6-diary-date-visible` → main **`5ba16a3`** (impl `16c3e73`,
zero conflicts, full history preserved). The diary and the date become visible — the
next sequenced item per §2b, under the owner's "Continue working" (A-3 skipped as
owner-gated, DEC-4).

- **The ink (`ui/diary.ts`, new — 202 lines):** the Map renders the field diary as
  ink (narrative/14 R3). A folded leaf of the same paper behind a `my diary` tab on
  the Map sheet — build-once DOM, then text/class flips only (the sketch's law).
  Entries render with the mechanical epistemic tag + the per-entry calendar dateline
  (through `formatGameDate` — the ONE date door; no `Date` anywhere in the module,
  pinned by test). The contradiction strike is a TEXT style: the offending words stay
  readable under the line, the margin note renders in current-tense Leo, and stripping
  the spans returns the body byte for byte (append-only survives rendering). The
  RECALL wobble is deterministic: fixed tilt + soft ink, no animation (a notebook that
  redraws itself between reads would feel haunted).
- **The dateline:** the calendar date the block is living joins the HUD (under the
  clock) and the leaf, rendered through `datelineOfStoryDay` ONLY (the one mapping,
  sim/epochMap — day 1 = "September 9 · Year 1"). `beginDay` re-renders it each
  morning. The UI never derives a date; Game passes the mapped text.
- **The touch law held:** the diary rides the Map's own paper surface (`mapPanel`) —
  it adds no door, so `touchPanelUp` is untouched and the pinned wiring counts stand
  (one toggle, 16 `syncTouchUI` calls — touch-law.test.ts green untouched).
- **Wiring footprint:** Game.ts = 1 import + 3 call sites (boot, toggleMap, beginDay);
  UI.ts = two display seams (`refreshDiary`/`setDateline`) — wired entry points only,
  no structure moved; `core/fieldDiary.ts` consumed, never modified. VARIANCE vs the
  plan's file list: `ui/sketch.ts` needed NO extension — the ink layer proved
  self-contained in diary.ts + style.css (the two shipped pages keep their exact
  layout; the leaf overlays the sheet, clipped by its own fold).
- **Tests (+15, `tests/ui-diary-ink.test.ts`):** strike mechanics (one strike per
  correction, first plain occurrence; missing quote → margin still renders), the
  bytes-survive law, escaping (the diary cannot be injected), determinism (same entry
  → byte-identical ink), the dateline pins (day 1 = Sept 9 · Year 1; day 6 = Sept 14 ·
  Year 1 — the plan's own example), and the source laws (no clock reads in diary.ts,
  no image in the strike, no animation in the wobble, no ad-hoc date formatting in
  Game.ts, no second touch toggle).
- **Gates:** tsc clean · vitest **927/927** (63 files) · build OK · **probe-diary-ink
  28/28 at 390×844** (post-merge, console clean — empty page in voice, three seeded
  entries as ink, the strike + margin from doc 03 §5.1's own example, RECALL wobble
  rendered, fold-back; screenshots `shots/diary-ink-390.png`, `diary-ink-empty-390.png`,
  `diary-dateline-390.png`) · 4-day E2E **0 failures** (569 s, console clean, day-4
  save holds $123 — the money math unchanged). Playwright chromium reinstalled in the
  sandbox first (environment, not product).
- **Not pushed** — awaiting owner authorization. Unpushed on main: WP-4's four commits
  (`2203f05`…`96490d2`) + WP-6's two (`16c3e73`, `5ba16a3`). Next per §2b: A-3
  (DEC-4, owner call) → WP-7 (evidence assembly, last); WP-5 (R2+R7) fully parallel.

## 2026-11-07 — WP-5 LANDED + INTEGRATED to main (register v1.10.0)

`git merge --no-ff feat/wp-5-consequence-choice` → main **`b99c01f`** (impl `94088ca`,
zero conflicts, full history preserved). The consequence ledger and the choice nodes
(R2+R7, doc 14 §7 step 2) — the parallel WS-C track, landed under the owner's
"Continue working" BEFORE WP-7 so the milestone evidence consumes the whole milestone.
State ahead of its content per §7 order: the scenes consume at R1/R8; nothing in
Game.ts, world/, or the sim ownership table was touched (the WP's own law).

- **The ledger (`core/consequenceLedger.ts`, new — 329 lines):** the world's memory of
  significant acts, append-only like the field diary (the input array is never mutated;
  the API surface has no update/remove — pinned by a function-list test). Promises carry
  in-game due dates (doc 10 §1: "every promise is a flag with a due date" — a promise
  without one is schema-invalid: append rejects, parse quarantines). Maturation is the
  omission tracker made mechanical: an unmet promise past its due date gains exactly one
  omission with a DERIVED id (`omit-<promiseId>` — never rolled), inheriting weight and
  visibility ("smaller coin, same currency"); a met promise (a later choice/amends
  referencing it) never matures; walks are idempotent; `openPromises` reads clean for
  the C5 cascade. Determinism-from-save pinned (same save + same in-game day →
  byte-identical matured ledger, through the serialize→parse round-trip). Quarantine
  parsing per the map-notebook precedent; LEDGER_CAP 256; dates year-bounded so a
  crafted save cannot hang `calendarDayOf`.
- **The register (`core/choiceNodes.ts`, new — 537 lines):** doc 10 §3's table
  transcribed as frozen canon data — 17 structural nodes N0…N7, authored options,
  per-option flag/ledger writes (mechanical `<dimension>=<option>` keys, act-refs
  `<nodeId>:<optionId>` so the cascade traces a consequence to its node), N3b's
  nineteen slots (doc 09 §4's face-by-face fall), N2's Form C locked behind
  `yoli-strategy-session` (doc 10 §4's expiry law — pinned). **The no-fake-choices
  rule is a test**: `validateRegister` demands pairwise-unique flag signatures AND
  pairwise-unique ledger signatures per node — a converging register fails the suite
  (the doc's own canon-bug law). `resolveChoice` is pure; the pivot flag
  `node:<id>=<option>` rides first (how the save remembers the pick, doc 15 §5.3).
- **The save seam:** `ledger` as an optional trailing v1-safe field (absent reads as
  [] — the field_diary law; the old-save roundtrip case extended). VARIANCE vs doc 14
  §3's field list, documented: the `promises` layer is realized INSIDE the ledger (a
  promise IS a LedgerEntry — R2's own schema carries the due date); a second duplicated
  array would create a mirror to keep honest, the WP-4 lesson.
- **Tests (+47):** consequence-ledger (23: append-only, maturation idempotence, the
  met-promise law, validation reasons, caps, quarantine incl. the no-due promise,
  save round-trip, determinism-from-save, the no-clock source law) and choice-nodes
  (24: doc-10-§3 coverage, chapters, register frozen, converging registers fail,
  locks, resolution purity, act-ref traceability, public acts post shared, source
  laws — no clock, no runtime imports beyond the type seam).
- **Gates:** tsc clean · vitest **974/974** (65 files) · build OK · 4-day E2E **0
  failures** (595 s, console clean, day-4 save holds $123 — the money math unchanged;
  run on the branch tree, content-identical to the merged tree). Post-merge battery on
  the INTEGRATED TREE: tsc clean · vitest 974/974 · build OK · **probe-money-trace ALL
  PASSED** ($112.00, mirror holds, audit clean).
- **Not pushed** — awaiting owner authorization. Unpushed on main: WP-4's four
  (`2203f05`…`96490d2`) + WP-6's two (`16c3e73`, `5ba16a3`) + WP-5's two (`94088ca`,
  `b99c01f`) + this docs commit. Next per §2b: **WP-7 (evidence assembly — the
  milestone's last item)**; A-3 (DEC-4) remains the owner's call.

## 2026-11-07 — WP-7 EXECUTED: the MS-1 Clock Street evidence + the PH-2 exit checklist (register v1.11.0)

The milestone's last work package, under the owner's "Continue working". The WS-F law
held: the probe adds a script, zero product code.

- **The demo (`scripts/probe-ms1-clock-street.mjs`, new):** the clock-day demonstration
  and the money-trace reconciliation joined into ONE run of the real built game. The
  probe toggles the REAL roam switch, cranks the REAL valve (300 sim-min/real-s), and
  an in-page rAF watcher (a probe fixture writing marks to `window.__MS1__`) samples
  the block the first in-game minute each clause goes live — accelerated time cannot
  skip a clause. NO scenario param: the probe drives its own controlled afternoon, so
  the demo stands alone (and the scenario suite remains independently green).
- **The exit sentence, clause by clause:** (1) 07:40 platform occupancy — Idris stands
  his window (claim `se-idris-platform`, visible, the fresh world boots at 07:40 inside
  the 07:22–07:52 band); (2) 22:00 deli close — the deli is a routed corridor at 21:58
  (ROS-01's canon 06:00–22:00 hours) and refuses routes at 22:00 with
  `PLACE_INACCESSIBLE` (a closed door is not an edge — A-2's model in the browser);
  (3) the date and the diary readable — the HUD dateline "September 9 · Year 1"
  through `datelineOfStoryDay` ONLY, the Map's "my diary" tab folds the leaf, the leaf
  shares the dateline; (4) every dollar traceable — genesis $87.00 on both sides of
  the sanctioned mirror, audit clean at boot and STILL clean after the whole afternoon
  (roam invents no money, txns 0), the story day/wallet never moved (zero story
  rewiring). **ALL 16 CHECKS PASSED, console clean.** Screenshots:
  `shots/ms1-platform-0740.png`, `shots/ms1-deli-close-2200.png`, `shots/ms1-dateline-diary.png`.
- **The floor gates re-ran green on the merged tree in the same battery:** 4-day E2E
  0 failures (595 s, console clean, day-4 save holds $123 — the $87→$112→$123 math
  unchanged, now transactional via probe-money-trace: $112.00, mirror holds, ids
  byte-identical) · probe-world-sim 15/15 · probe-pause-set 11/11 · probe-nav 9/9 ·
  perf-peds re-baseline: peds.update 27.1 µs/frame (0.16% of budget), heap FLAT
  (−17 MB GC reclaim), 38 routes in 300 s.
- **PH-2's exit checklist EXECUTED** (PHASE-ACCEPTANCE-CHECKLISTS §Phase 2): all
  twelve items checked with evidence — WP-0…WP-6, the bridge guards (no second clock/
  ledger/save, asserted by test), the hot-path law (review + soak numbers), E2E on the
  integrated tree, the wc-17 exit sentence demonstrated in a browser, the save
  round-trip (exact tick restore, old saves parse). **Variances filed:** V-PH2-1 the
  three-lead sign-off (owner-side), V-PH2-2 the 15–20-minute human evaluation session
  (owner-side — fresh save, no instructions, 15–20 min, logged with who/when; every
  automated substitute is green), V-PH2-3 `feat/world-contract-foundation`'s local
  branch copy deletion (push wave).
- **Not pushed** — awaiting owner authorization. Unpushed on main: eleven commits
  (WP-4 ×4, WP-6 ×2, WP-5 ×2, WP-7 docs ×3 incl. this one). **What remains is the
  owner's: the sign-off, the human playtest, the DEC-4 (A-3) call, the push.**

## 2026-11-07 — Sandflow Evaluation Agent: PRODUCTION INTEGRATION on `feat/sandflow-evaluation` — 9 of 12 sand3d asset categories wear their Alder Heights counterparts, all gates green, branch pushed

The owner authorized the push and the world integration (the earlier
"evaluation only, nothing shipped" fence is lifted by that authorization —
`main` still untouched). The approved GLBs moved out of
`public/models-experimental/` and onto their real counterparts through the
existing `upgradePropWithGLB` seam, plus one new material pass that makes
the pack fuse like the world's own statics.

- **Landed (13 swaps + 1 add):** hydrant west+east (the shipped baseline
  `hydrant.glb` replaced — it was failing the seam's footprint band at
  0.76 m wide; the sand3d hydrant fits) · 3 DSNY baskets on the three cans ·
  recycle bin · streetlamp (8.5 m cobra scaled to the 4.4 m slot) · plaza +
  bus benches · the Day-2 teal door (canon `#2a9d8f` baked linear into the
  leaf, π-yawed to the street, brass knob hides when the model lands) ·
  6 registry washers in the LAUNDRY-INT room on yawed slots (door east;
  the porthole disc is a slot child, so it leaves with the box; the shipped
  bay stays byte-identical) · 3 bodega gondolas on the old blank box's span
  (same collider, goods facing south) · the commercial fridge as an add on
  the bodega's east wall with a matching collider.
- **Deliberately not adopted (documented, not forced):** newsrack (the seam
  refuses the factory's unit-scaled placeholder; a real-geometry slot is
  follow-up work) · storefront (canon signage + probe-asserted glass names
  would be deleted to win a swap) · security gate (every host surface is
  canon — the warm window, the pizza glass). All three stay in the
  dev-only showcase with their articulation proven.
- **The material pass** (`tools3d/sandflow_eval/postprocess_glb.py`, stdlib
  only): metallicFactor → 0, `KHR_materials_clearcoat` stripped,
  `doubleSided` false, geometry/hierarchy/`s3d_joint` extras untouched —
  which is exactly the fuse law's admission ticket, so every landed prop is
  ONE vertex-colored draw. Defect found and fixed on the way: the first
  version kept the BIN chunk's 8-byte header and shifted every bufferView;
  the probe caught it as inflated bounds, and processed ≡ original is now
  byte-verified. Second lesson: GLB fronts face +Z — the door's first
  screenshot was its brown wall_band back; door and shelves carry an
  authored π yaw now.
- **Measured (probe-integration.mjs, before/after JSONs in
  docs/production/sandflow/evidence/):** draw calls 122 → 142 at the plaza
  vantage (+20 for 22 landed instances), rendered tris 117 k → 249 k (the
  models' real detail), fps 4 → 4 on the swiftshader rasterizer, console
  errors 0 before and after.
- **Files:** `web-three/src/world/World.ts` (seam registrations, yawed
  slots, shelf run + fridge, stoop-door hook) · `web-three/src/world/props.ts`
  (hydrant fallback arm 0.14→0.30) · `web-three/public/models/` (+9 GLBs,
  hydrant.glb replaced) · `tools3d/sandflow_eval/postprocess_glb.py` (new) ·
  `web-three/scripts/probe-integration.mjs` + `shot-vantages.mjs` (new) ·
  `docs/production/sandflow/07-production-integration.md` (the replacement
  table) + `evidence/` (before/after JSONs, 6 screenshots) · doc 06 status
  update.
- **Gates at close (all executed):** tsc clean · vitest 889/889 (61 files) ·
  build OK · probe-integration 22 seams landed / 0 errors / 8 walks ·
  4-day E2E 0 failures (457 s at the 480×320 slow-rig profile, console
  clean, Day 4 save holds: $123, map, permit, stool).
- **Git:** one branch, two commits, pushed to `origin/feat/sandflow-evaluation`
  with the owner-supplied token used inline only (never printed, never
  committed); remote SHA verified against local; no force-push; no merge.
- **Honest scope notes:** the E2E ran at the small-viewport profile the
  harness ships for software-GL boxes (the default viewport times out the
  tool window here, not the game) · the two hydrant slots share one file
  but are two parsed copies — instancing beyond the URL cache is future
  work · the washers' visual pokes ≤0.1 m past their colliders (machine
  depth vs authored box), inside the seam's own ±90 % law.

## 2026-11-07 — Technical Architecture / World Systems Agent: the push wave executed — the Sandflow pack joined the line, V-PH2-3 closed, the next order queued for ratification

**Directed by the owner's "Push" + "And continue working"** (the second push
authorization this session; the first delivered Phase 3 + WP-3v at `dcff32c`).

- **The divergence found and integrated honestly:** origin/main had advanced to
  `c950162` — the Sandflow Evaluation Agent's Alder Heights asset pack (13 prop
  swaps + 1 add via `upgradePropWithGLB`, evaluation docs + evidence, its own
  worklog entry) — while our eleven commits (WP-4 ×4, WP-6 ×2, WP-5 ×2,
  WP-7 docs ×3) sat unpushed; merge-base `dcff32c`. **Integration merge
  `b2eb53b`** (no-ff, both histories preserved); the single conflict `worklog.md`
  resolved with BOTH sides verbatim (append-append, zero content lost).
- **The integrated tree re-gated — all green:** tsc clean · vitest **974/974**
  (65 files) · build OK · probe-money-trace ALL PASSED ($112.00, mirror holds,
  audit clean) · probe-diary-ink ALL PASSED · probe-ms1-clock-street ALL CHECKS
  PASSED · probe-world-sim 15/15 · probe-pause-set 11/11 · probe-integration
  PASS (22 seams registered, 0 errors, 8/8 street walks incl. stoop-door and
  bodega-interior) · probe-sandflow soft-pass on this box (every measurement
  step + the instancing numbers collected: 100 clones 757 calls → instanced
  376 calls; the final screenshot timed out on swiftshader — the environment
  variance the pack's own worklog already files; the load-bearing sandflow
  gate, probe-integration, is green).
- **The push, one invocation, non-force:** `main` `c950162..b2eb53b`
  (fast-forward — the merge commit carries `c950162` as a parent) + three NEW
  remote branches (`feat/wp-4-money-bridge`, `feat/wp-5-consequence-choice`,
  `feat/wp-6-diary-date-visible`). **All four refs verified MATCH by ls-remote**;
  tracking synced; working tree clean.
- **V-PH2-3 CLOSED:** the `feat/world-contract-foundation` local branch copy
  deleted during the push wave as the variance prescribed (remote copy intact at
  `407cc0e`; `git log main..feat/world-contract-foundation` empty — nothing
  unmerged). PHASE-ACCEPTANCE-CHECKLISTS §Phase 2 updated.
- **"Continue working" continued honestly:** the milestone's machine-side queue
  is EMPTY (WP-0…WP-7 done; A-3 is DEC-4, the owner's call; V-PH2-1/2 are
  owner-side). So the run delivered the plan's own §6 "Done means" remainder:
  **the next order drafted and queued for ratification** (NEXT-PHASE-EXECUTION-PLAN
  §2b update, register v1.11.1) — E-1 anchor catalogue → chokepoint capacity
  claims → R1/R8 rails engine (parallel WS-C) → A-3 upon the owner's DEC-4
  ruling. **Nothing begins without the owner's authorization.**

---
Task ID: DEF14-PED-NAV-HYSTERESIS
Agent: Production continuation (WS-B/WS-F window)
Task: DEF-14 / R-NEW-17 — the probe-ped-nav separation flake, the only
open non-owner-gated item after v1.11.0's milestone-complete verdict;
plus the stale defect rows the register carried and HYG-1.

Work Log:
- Reproduced the flake verbatim on main b2eb53b: FAIL 4 … {"t":63,
  "key":"5|7","run":3,"d":0.59} — the exact R-NEW-17 signature, 1-of-3.
- Built the capture the risk row demanded (diag-ped-overlap.mjs, the
  diag- pattern): 300 ms dense sampling of every <1.0 m pair with both
  walkers' dwell/arrive state and finite-difference speeds. Three runs
  + the register's own flake capture agree: every under-0.6 m event is
  a MOVING shallow crossing (v 0.55–0.69 m/s both, nobody dwelling,
  CHAT_RANGE pairs never involved) at ≤ ~1 cm penetration, exiting
  within one dense sample. The pairwise half-push (∝ penetration,
  capped 0.125 m/frame) CONTAINS the crossing; at probe fps the
  contained ride can hold ~1.8 s of flat ≤1 cm contact.
- Verdict per the risk row's two options: the steering needs nothing —
  the guarantee's never-deepens property held in every capture — and
  the probe's persistence law needed the principled hysteresis:
  SINKING (run ≥3 AND deepening >4 cm) fast-fails a broken guarantee;
  STUCK (run ≥7 ≈ 4.2 s, 2× the longest captured honest ride)
  patient-fails any grind. No product code touched.
- Probe fix verified 3/3 green on the same seeded street (the
  deterministic 5|7 crossing still grazes — now correctly contained).
- Closed the register's stale rows with citations (DEF-2 → WP-6's
  v1.9.0 evidence; DEF-3 → WP-0's v1.2.1 evidence) and fixed HYG-1
  (README header + Documentation table re-pointed to the live canon:
  narrative bible / world contract / production system / doc 57).

Stage Summary:
- Gates: tsc clean · vitest 974/974 (65 files) · build OK (docs +
  scripts only; the suite re-run anyway) · probe-ped-nav 3/3.
- Evidence: scripts/diag-ped-overlap.mjs (committed), the ×3 dumps
  summarized in the register (shots/ is gitignored — numbers cited).
- Honest note: the flat ≤1 cm ride is real street behavior (brushing
  commuters at low fps); if the owner ever wants it tighter, the lever
  is the shipped MAX_PUSH authority at low fps, not the probe.

## 2026-11-07 — Technical Architecture / World Systems Agent: "Push and continue working" — the second divergence integrated, E-1 landed

**Directed by the owner's "Push and continue working."** Two halves, both closed.

- **The push, second wave:** origin/main had advanced AGAIN between the waves —
  `fix/def14-ped-nav-hysteresis` (register v1.12.0, the WS-B/WS-F continuation's
  capture-derived fix for the ped-nav separation flake, R-NEW-17) landed at
  `bf1d767`. Integration merge `aedc27d` (no-ff; register + worklog conflicts
  resolved with BOTH sides verbatim). The DEF-14 fix re-proven on THIS box — the
  one where the flake was first evidenced 1-of-3: **probe-ped-nav 3/3 green**
  (after repairing the environment: the sandbox recycle had dropped the
  Playwright headless-shell binary — an environment failure, not a product one).
  Suite 974/974 on the integrated tree pre-E-1. **Pushed `bf1d767..aedc27d`
  (fast-forward), ls-remote MATCH, tracking synced.**
- **E-1 — the shipped content catalogue** (the first item of the queued order
  the owner's message ratified; branch `feat/e1-anchor-catalogue` @ `4502ebb`,
  merged `3d72d9b`, no-ff): `sim/contentCatalogue.ts` (new) — (1) the anchor
  set: the contract-named anchors (newsbox, hoop/court, board, shelves —
  wc-08 §47) under the reserved `obj:` sim ids, interaction ids carried as
  tags, shelf goods flowing through from `SHELF_GOODS` (no second copy); (2)
  the first building-variant pack: all 19 shipped registry buildings under
  their registry ids, every builder line honest — code-ref tokens from the
  registry's own style notes, `BUILDING_EVIDENCE` for the rest. The test
  (9 cases) greps the world + interaction sources so the catalogue cannot
  rot: `validateManifest` zero-issues, pack = the shipped set exactly,
  mapping vs `interactionDefs.ts` literal. **Zero new assets, zero runtime
  code touched** (wc-11 §7) — no E2E re-run per the v1.12.0 precedent.
  Gates: tsc · vitest **983/983** (66 files, +9) · build, branch AND
  integrated tree; docs-hygiene 5/5. SYS-WORLD-01 + SYS-WORLD-03 rows ticked.
- **Honest scope notes:** the building pack is the SHIPPED 19, not the full
  50-building registry — planned buildings append as they are built (the id
  law), a pack is a promise about what exists; the anchor set is the
  contract's NAMED four families, not every interaction (41+ exist —
  widening the catalogue is future Workstream E scope, new entries append);
  the catalogue is not yet wired into any runtime consumer (E-1 is
  cataloguing; consumers arrive with the content waves and A-3's flip).
- **Not pushed** — the E-1 commits (branch tip + merge + this docs commit)
  await the owner's next push wave. Remaining order (§2b): chokepoint
  capacity claims → R1/R8 rails engine (parallel WS-C); A-3 (DEC-4) unblocked.

## 2026-11-07 — Technical Architecture / World Systems Agent: PRODUCTION COMPLETION DRIVE — the queued order executed to the owner-gated frontier

**Directed by the owner's "PRODUCTION COMPLETION DRIVE" (audit everything remaining, execute the work, close every actionable item — no push authorized; all work stays local).** The audit first: local main `fd83f1d` (ahead 3: E-1 + merge + docs), remote main `aedc27d`, working tree clean, no new agent branches on origin (no active WS-C branch to coordinate with — the rails engine was unowned and unstarted), register/checklists/plan read in full against the codebase. The verified agent-actionable frontier was exactly two items — the queued order's 2 and 3 — plus the V-PH2-2 preparation the directive asked for. A-3/DEC-4 left untouched (owner's call); Phase 4+ (R5), Phase 6 (R6), R9–R14 all correctly blocked by the ladder + §7's binding order; B13 declined six times (owner); WP-3v scale-out + needs/mood dials parked on owner population calls.

- **Chokepoint capacity claims — the A-2 remainder CLOSED** (branch `feat/chokepoint-capacity-claims` @ `4ddfb95`, merged `91a288e`, no-ff): `sim/nav/capacity.ts` (new) is the arbitration resources' PHYSICAL mapping (wc-03 §2's deferred half — Foundation D's R4 queuing was already shipped in `sim/arbitration.ts`; nobody populated the physical side). Capacity law: doors = 1 (the contract's own number), zebras = one 0.6 m pedestrian lane per body (peds.ts's own separation band — the model reuses the steering's number so they cannot disagree; the 3.4 m zebra floors to 5). Queue law mirrors arbitration R4: FIFO by (arrival tick, npcId), the head's reservation unstealable, `releaseAll` the no-starvation teardown, a body holds at most one slot and never waits while holding — deadlock impossible by construction. The executor (worldRuntime) acquires the door slot before the passage begins, releases exactly when the body clears the corridor, and STANDS OFF (`waiting-door`) at a full doorway — the queue, not a shoving match; every route-death path (away, arrival, dialogue freeze, re-derive, roam-off) pays its obligations. Two real bugs caught by my own tests before they shipped: the FIFO check blocked the queue head on its own reservation (a deadlock the gate-law tests exposed immediately), and the harness's final-step release order (the product code was right; the test harness learned from it).
- **The measurement evidence the register owed** (the directive: "measured under realistic population loads"): STAGED — 24 walkers through door:ROS-01: service 27 f (0.9 s at walk pace), max queue wait 483 f (≈ 16 s), drain 649 f, throughput ≈ 1.11 bodies/s — orderly, bounded, zero starvation. LIVE — `scripts/probe-chokepoints.mjs` (new): a full scripted day at 300× (230 samples): the gate law-abiding at EVERY sampled instant across all 36 resources, door crossings booked in the transition log, peak visible ambient 11/12, peak crosswalk occupancy 3 against derived 5 at the canon zebra (−5,0), zero legality hits, zero unresolved contacts, zero page errors. The scope law extended honestly: ambient walkers get the full street law (footprint + jaywalk); the CAST gets the jaywalk law only — standing inside an interior is their legal workplace (Rosa in the deli is the schedule, not a violation).
- **R1+R8 — the rails engine and the chapter gate** (branch `feat/r1r8-rails-chapter-gating` @ `b6ac941`, merged `40d925e`, no-ff; doc 14 §7 step 3, the machine the R2/R7 state has been waiting for): `core/chapters.ts` (R8) — the canon windows (doc 12 §2 verbatim) derived once through `calendarDayOf` (no hand arithmetic anywhere near the spine), the window law (gap days stay in the previous chapter — the holidays are C1's), the advance law pure (immediate successor only; at/after the window start; the chapter lived its minimum days — C0's arrival week is fixed, MIN_CHAPTER_DAYS is authored data; the authored trigger held; the day never rewinds; OPEN = the terminal continuation from C6). **The R8 acceptance is a TEST**: every C1 day from Sept 16 to Jan 5 reads C1 (the hundredth roam day included), Jan 6 reads C2. `core/chapterRails.ts` (R1) — the six load-bearing rails as frozen data, each with its canon minimum date (N2's break Mar 11 Y2, the offer Dec 9 Y2, the villain-question mid-June Y3, the receipts Sept 21 Y3, C6's open), its trigger (the calendar itself, or the register's OWN mechanical shape flags — `compact-form=*` from N2, `r3-depth=*` from N3a), and its city-diary line QUOTED VERBATIM from doc 06 §0's transaction sentences (no invented prose — the bible speaks, the engine quotes). `evaluateRails` is pure — rails fire while the player is mid-roam (no scene input exists in the signature), the spine is never skipped only waited for (a fast-forwarded calendar still meets the fall), flag-triggered rails fire late ("fires anyway... later in different clothes"), fire-once by construction; a firing yields `RailFire { id, day, cityDiary }` — data a diary surface whispers, never a banner (no DOM in the module; `validateRails` fails a rail without its line). `villainQuestionInputs` assembles R4's content from the player's ledger through consequenceLedger's own API (actors, omissions, open promises, the weight sum R5's extent reads). **Machine-level R2/R7 integration landed here** (the queued order's sentence made real at the machine level): the no-dead-rails test proves every rail trigger is writable by some register option (resolved through `resolveChoice` with its locks granted); scene-level wiring rides the C0+ content waves per §7's binding order — machines first, content after (the WP-5 precedent, honestly scoped in the register rows). `core/Save.ts`: `chapter` + `rails` as optional trailing v1-safe fields (doc 14 §3's law; absent = a fresh arrival with an unfired spine; corrupt quarantines; a fired rail with an unreadable day re-seeds — a rail that cannot say when it fired cannot claim it fired).
- **V-PH2-2 prepared, not performed** (the directive's phase-acceptance clause): `docs/production/PLAYTEST-CHECKLIST-V-PH2-2.md` (new) — the six meaningful-play capabilities as observer ticks, the log-don't-interpret law, the honesty law (the variance stays open until a human meets it; no agent may tick it). The register/checklists point at it.
- **Gates, both branch trees and the integrated tree (main `40d925e`):** tsc clean · vitest **1014/1014** (68 files, +31) · build OK · probe-nav 9/9 · probe-world-sim 15/15 · probe-ped-nav 7/7 · probe-chokepoints 5/5 · probe-integration PASS (8/8 walks) · probe-ms1-clock-street ALL CHECKS PASSED · 4-day E2E 0 failures (662 s branch / 679 s integrated, console clean, day-4 save holds $123 — the money math untouched). Register v1.14.0 + v1.15.0; SYS-WORLD-04/05, SYS-PLAY-09, SYS-NAR-06/07 checklist rows updated; PH-3's open list shortened to A-3 alone.
- **Honest scope notes:** the capacity gate binds DOORS in the executor (the contract's named capacity-1 case); crosswalks carry derived capacity as MODEL + measurement (gating ambient walkers mid-crossing would touch the WP-3v steering for no measured need — the peak observed occupancy is 3 of 5 lanes); the rails' city-diary lines are quoted canon, and the city-diary SURFACE that will render them is a content-wave build; the shipped game does not yet CALL `evaluateRails` (the caller is the C0 content pack's persist-path wiring — the machine is content-ready, not content-complete, exactly as R2/R7 shipped before their scenes).
- **Not pushed** — the directive carried NO push authorization; the tree now stands at main `40d925e` + this docs commit, ahead of origin by eight commits (3 E-1 + 2 work + 2 merges + 1 docs). The remaining sequenced work is A-3 (DEC-4, the owner's call); everything beyond it is owner-gated or content-wave.

## 2026-11-07 — interiors batch: the nine rooms get dressed (feat/interior-production)

The owner's interiors directive landed as a production batch, not a proposal:
audit → build → integrate → verify, room by room, until every existing
interior was covered.

- **Audit** (`docs/production/interiors/00-INVENTORY.md`): the codebase holds
  nine enterable furnished interiors — the bodega (always-open storefront) and
  the eight W5 rooms (LAUNDRY/BARBER/PIZZA/BAKERY/RECORDS/HALL/DINER/CECIL).
  Their shared deficiency: equipment was colored boxes — dryers, oven, cook
  line, cooler, toilet, kitchenettes, shelves, chair stacks.
- **Build**: 32 sand3d programs in `tools3d/sandflow_eval/programs/`
  (`run_interiors.py` batch-builds + QA-manifests them; postprocess strips
  metallic for the fuse law; files land in `public/models/`). Two studio
  passes were needed: the first taught me `s3d.at(z=…)` anchors a part's
  BASE (everything I had stacked as centers floated — the renders showed it),
  and `rz` does not lay a cylinder down. All programs rewritten base-anchored.
- **Integrate**: `web-three/src/world/interiorAssets.ts` (INTERIOR_SLOTS +
  INTERIOR_PROVENANCE) + `World.upgradeInteriorPropsWithGLB()` fired after
  `buildAlderHeightsW5()`. Composite placeholders collapsed to full-height
  bodies (tables, barber chairs — the shipped booth pattern); long wall units
  authored in final world orientation so the ±90 % footprint guard passes 1:1;
  machines wear the washer-slot pattern. New colliders wall-hugging only.
- **Verify**: tsc clean; vitest 980/980; build OK; probe-interior-dressing
  PASS (69 props + 40 ABO furniture, 0 page errors); probe-w5-interiors PASS;
  9 parked-camera screenshots per interior (the visual-d4b park law — the
  chase boom collapses on a stationary player). Two mirror-axis bugs found by
  the screenshots themselves (microwave door, Cecil kitchenette fronts faced
  their walls) — mirrored, rebuilt, re-probed. Evidence in
  `docs/production/interiors/evidence/`.
- **Honest**: the 4-day E2E stalls at the same early beat on pristine main
  and on this branch in this sandbox (software GL; the register's green 606 s
  run had faster iron) — rerun before the next release cut. SUB-01 platform
  and the terminal keep their kit identity for a later pass.

## 2026-11-07 — Technical Architecture / World Systems Agent: "Push and merge to main" — the interiors batch integrated, the wave pushed

**Directed by the owner's "Push and merge to main."** Three halves, all closed.

- **The audit before the merge:** local main `760016c` (ahead 10: E-1 ×3, chokepoint ×2, R1/R8 ×2, docs ×3), remote main `aedc27d` (verified ancestor — pure fast-forward, no concurrent remote drift), working tree clean. One local branch unmerged: `feat/wp-2v-epoch-map` — **audited as SUPERSEDED, not merged**: main's `sim/epochMap.ts` (232 lines vs the branch's 151) is the superset — `datelineOfStoryDay`/`datelineOfSimDay` cover the branch's `datelineOfDay`, `epochAgreement` both sides, plus `simTickOfStoryDay`/`calendarDayForStoryDay`/`assertEpochAgreement`; main's worldRuntime/Game/UI/diary already consume it and the 430-line `sim-epoch-map.test.ts` rides main (26 references to the same APIs, worldRuntime comments credit WP-2v). Merging would have created a duplicate implementation — the branch stays as history (remote `feat/wp-2v-epoch-map` intact).
- **The merge — `origin/feat/interior-production` @ `8cc6d88` no-ff into main as `607610d`:** the other workflow's COMPLETE interiors batch (32 sand3d programs → 32 GLBs → 46 placements, nine rooms dressed, based exactly on `aedc27d`) joined the line under the owner's explicit "merge to main". Two conflicts, both resolved with both sides verbatim: worklog.md (the drive's entries + the interiors batch entry, sequential); register (SYS-WORLD-03 takes the branch's dressed row, SYS-WORLD-04 keeps HEAD's capacity-claims row; the version table keeps v1.13.0/v1.14.0/v1.15.0 and the branch's parallel v1.13.0 is renumbered **v1.16.0** — the ledger stays monotonic, the note says so). One stray conflict marker caught and amended out of the merge commit itself (`607610d` is the amended tree).
- **Gates on the INTEGRATED tree (`607610d`), all green:** tsc clean · vitest **1020/1020** (69 files — main's 68 + `interior-assets.test.ts`) · build OK · **probe-w5-interiors PASS** (rooms toggle, hollows walk, towers duck, glass law intact, 0 page errors) · **probe-interior-dressing PASS** (69 GLB props + 40 ABO furniture slots landed, 0 page errors) · **probe-integration PASS** (0 errors, 8/8 street walks incl. stoop-door/bodega-interior/laundry-room, 71 GLB upgrades registered, 146 calls / 255,648 tris parked portrait). The two known honest GLB log lines (mailbox/newsrack keep their procedural look) unchanged.
- **Pushed** under the same directive (one invocation, URL-embedded Basic auth, non-force); refs verified by ls-remote. Remaining sequenced work: **A-3 (DEC-4, the owner's call)** — everything else on the machine-executable frontier is landed or owner-gated.

## 2026-11-07 — FULL-GAME 3D ASSET AUDIT, REBUILD & MAIN INTEGRATION (v1.17.0 — the register row; the branch predates the parallel drive's v1.14.0/v1.15.0/v1.16.0 and integrates ON TOP of all three)

Branch `feat/asset-audit-rebuild` (main `aedc27d` + interior-production
`8cc6d88` fast-forward-merged first — it sat one commit directly on main).
The owner's full-game directive: audit the whole world's 3D assets, rebuild
what is below standard, integrate, verify, merge to main.

- **Audit** (`docs/production/asset-audit/00-FULL-GAME-ASSET-AUDIT.md`):
  in-engine census (341 draw-visible meshes / 202k tris) + a 19-stop parked
  camera tour + close-ups. Every family classed. Streets/interiors/court/
  playground/transit shell: KEEP. The offenders: zone figures rendering
  WHITE (a bake bug, not an asset gap), the arrival bus's flat slab rear,
  the primitive car GLBs, the bare orange barrier.
- **The world-scale defect**: `bakeStatics()` deleted each source's per-vertex
  `color` attribute and refilled it from the shared WHITE person material —
  every baked zone figure (kid, caregiver, gossip pairs, readers, stoop
  sitters, busker) was a blank. The same bake also swallowed the figures'
  layer-1-only shadow proxies into visible batches (a white silhouette
  standing inside each figure). Fixed both: the bake now preserves source
  palettes and skips meshes the eye layer cannot see. Playground figure
  band: 1836 white vertices → 192 (cream trim).
- **Cars rebuilt** via the repo's own CPU pipeline (`tools3d/rebuild_cars.py`,
  trimesh — bpy/sand3d unreachable in this sandbox; documented): 3-box
  silhouette, glass band + pillars, wheel arches, bumpers, grille, plates,
  lights, mirrors; taxi checker belt + roof light. 904/1228 tris, ONE fused
  draw each, same seam + footprint guards pass. Probe evidence per shot.
- **Arrival bus exterior**: the audit found the original window insets buried
  INSIDE the wall slabs (never rendered — the flat-slab root cause). Windows
  proud both faces now, stripe split around the door gap, cylinder wheels +
  hubs, bumpers, grille, lights, mirrors, roof AC. Visual-only; colliders +
  the one-bay law untouched. M121 route bus gained its light pair.
- **Small polish**: barrier hazard stripes (one merged mesh), laundromat
  towels (3 laid towels replace the cube).
- **Verify**: tsc clean; vitest 980/980; build OK; probe-interior-dressing
  PASS; probe-w5-interiors PASS; probe-ped-nav PASS; probe-nav 9/9;
  probe-court ALL PASS; probe-doorway PASS; probe-world-sim 15/15. Perf A/B
  vs a pristine `8cc6d88` worktree: +1…+22 draws per room (the intentional
  additions; cars net-negative), triangles < 0.5%. Evidence: 18 screenshots
  in `docs/production/asset-audit/evidence/`.
- **Honest**: E2E story driver stalls at the same early beat on pristine
  main AND this branch here (software-GL pace; pre-existing, not a delta);
  bpy wheels unreachable from this environment's pip index (the cars used
  the repo's trimesh pipeline instead); the gold taxi's in-motion close-up
  eluded the parked probes (family evidenced via the same-builder sedan).
---

## 2026-11-07 — Production Director: audit R2 — the baseline re-certified, DEC-4 briefed, the branch ledger closed

Task ID: PROD-R2
Agent: Production Director (Z.ai)
Task: "Continue building (use the road map)" — with the machine-executable frontier at A-3 (DEC-4, owner-gated), execute the Production Director's remaining roadmap work: re-certify the baseline on the fleet's integrated tree, file the DEC-4 decision brief, and execute the register's mandated branch retirements (BR-3/BR-5). Audit + docs + branch ops only — no source file touched, nothing flipped, DEC-4 not applied.

Work Log:
- Local sandbox re-synced: origin/main had advanced 31ea3e0 → ec4dc6f (59 commits — WP-0, the DEC-1 ruling, WP-1v/2v/3v/4/5/6/7, Phase-3 A-1/A-2 + chokepoint capacity, E-1, R1/R8, Sandflow, interiors; register v1.16.0); the ~450-file "dirty tree" was diagnosed as file-mode noise from the sandbox restore (`core.filemode false` → clean, nothing lost), then fast-forwarded.
- Baseline re-certified on `ec4dc6f` [executed]: tsc clean · vitest **1020/1020** (69 files) · build OK (625 ms) — the register's v1.16.0 gates reproduce on this box.
- **DEC-4 decision brief filed**: `docs/production/DEC-4-REGISTRY-GEOMETRY-FLIP-DECISION.md` (the DEC-1 brief's law: it recommends, it does not decide). 50 registry buildings re-read; `World.ts` re-measured (**6,754 lines** — risks doc refreshed); the district builders mapped (W1–W5 + W0's district system); the flip's blockers confirmed cleared (A-1/A-2, the perf re-baseline 119/184/256, E-1's pack); three options adjudicated (A the district-order default / **B class-ordered backdrop-first — recommended** / C defer); the fidelity gate re-specified per unit (validate + skyline + screenshot pairs + draw-call ledger + probe battery); **UNRESOLVED, owner gate**.
- **BR-3 executed per its own row**: guard-by-guard check on `feat/player-upgrade` — all 5 `player-upgrades.test.ts` guard names byte-identical branch↔main (test-file diff 0 lines; guards green in the 1020/1020 suite; source content landed via `a9718e9`/`69f8327`) — then the remote branch deleted. BR-5's deletable local copy deleted. BR-2 re-statused MERGED (`1bb3152`); BR-1 tip refreshed to `ec4dc6f`.
- Register v1.18.0 (dashboard DEC-4 pointer, BR rows, change log — renumbered past the asset-audit's parallel v1.17.0, the monotonic-ledger law); risks doc DEC-4/R-NEW-3 refreshed; plan §2b item 4 points at the brief.
- Not done, by law: the A-3 flip itself (DEC-4 is the owner's call — the v1.9.0 precedent stands: a generic "continue" does not rule a DEC); the owner-side variances (V-PH2-1 sign-off, V-PH2-2 playtest); B13; the content waves until their plan is ratified.

Stage Summary:
- The machine-executable frontier is now exactly one item: **A-3, fully briefed for a one-word owner ruling** ("Option B approved" turns the wave on per the brief's §6). Everything else on the roadmap is owner-side or content-wave work. Gates at close: docs-only commit; zero source files modified; no dependencies added; the branch deletions are register-mandated hygiene with the guard evidence recorded above.
