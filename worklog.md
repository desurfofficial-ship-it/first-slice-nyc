
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
