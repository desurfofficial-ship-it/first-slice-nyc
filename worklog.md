
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
