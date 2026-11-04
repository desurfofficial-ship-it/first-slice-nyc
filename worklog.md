
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
