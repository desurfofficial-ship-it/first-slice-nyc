# 05 — Migration Roadmap: from rails-first to roam-first (life sim intact)

*The rule of the whole roadmap: **the game is playable after every milestone.** No branch lives long; no milestone deletes a working system.*

## M0 — The Roam layer ✅ SHIPPED (this restructure)

- **Goal:** free roam as a first-class mode without touching the story.
- **Shipped:** `game/freeroam.ts` (contract, pure) · `Game.toggleRoam` + guards (objective law, idle-nudge rest) · `World.setBarrierOpen` (whole block walkable from minute one) · pocket Roam chip (`ui/UI.ts`, `index.html`, `style.css`) · optional `Save.roam` (Day-2+ persistence) · handover invitation note.
- **Proof:** 559/559 vitest (553 legacy + 6 new) · `scripts/probe-roam.mjs` 28/28 in real Chromium (barrier physics, story-stays-live mid-roam, save round-trip, silent boot restore) · 4-day E2E `scripts/e2e.mjs` 0 failures (535 s) · `tsc` clean · console clean.
- **Risk retired:** "free roam means deleting the sim" — it did not; the E2E still plays all four days.

## M1 — Beats as places, not pressure ✅ SHIPPED

- **Goal:** the Map's page 1 grows optional story markers (the current beat's spot as a doodle + a "whenever you're ready" Rosa line on defer).
- **Shipped:** `GameState.beatPlaceId()` (the data-only beat→place table — the objective line and the marker both read it, so the HUD can't lie) · the beat marker in `ui/sketch.ts` (Rosa's dashed ink ring + her handwritten caption, opacity-flip only — the sketch's no-rebuild law) · `UI.setBeatMarker` (id waits if the sketch isn't built yet, the `priyaRevealed` law) · wired at boot, `applyEffect('step')` (both modes — mid-roam the ring shows where the story waits), and every day-begin.
- **Proof:** `tests/beats.test.ts` (4 pins: every marked id is a real `MAP_PLACES` id; a marked beat always has an objective line; the named beats mark their spots; the unnamed beats — fire escape, teal door, stairs, notice, rail, DONE — park the ring) · `scripts/probe-m1-beats.mjs` 10/10 in real Chromium (boot ring on the terminal, the ring rides the story, roam holds the marker, the teal door parks it, console clean) · 4-day E2E `scripts/e2e.mjs` AUTOTEST OK 0 failures (534 s) · `tsc` clean · vitest 569/569.

## M2 — The district map (the block grows)

- **Goal:** docs/45's future plots become walkable strips; the subway ride becomes a real edge between districts.
- **Touch:** `world/World.ts` construction (new strips behind the same collider law), `dressing.ts` (new diaries), `world/subway/` (ride → district transition), `MAP_PLACES` + `SKETCH_BOUNDS`.
- **Risk:** draw calls and colliders grow with area. Mitigation: the M0 lesson repeated — visibility-gated groups, the existing district system (`updateDistricts`), and a scene-census probe gate (probe-scene-census.mjs) with hard budgets.
- **Accept:** census probe within budgets on SwiftShader; new probes per district; all story E2Es green; mobile portrait probe for each new strip.

## M3 — The city keeps a diary of you

- **Goal:** roam choices resurface as later-day notes (the Save v1 counters `shelf_buys/dog_buys/trims/washes/hoop_makes` already exist and are persisted but under-used in prose).
- **Touch:** `dressing.ts`-style pure functions (counters→notes), `content.ts` lines, one drain in `Game`.
- **Risk:** sentimentality spam. Mitigation: the note queue law (2.4 s min-hold, ≤4 queued) and one note per day per counter family.
- **Accept:** unit tests on the counter→note functions; a probe that buys/hoops/washes and receives exactly one note the next day.

## M4 — Ambient schedules

- **Goal:** peds/traffic density keyed to time-of-day (promote `ambientWindowPlan`'s instinct to a schedule table the street reads).
- **Touch:** `world/peds.ts`, `engine/traffic.ts`, `engine/busRoute.ts` (read a shared `world/dressing.ts` schedule), no gameplay deps.
- **Risk:** a schedule bug empties the street. Mitigation: pure schedule function + table tests + the probe-peds/probe-cars harnesses as gates.
- **Accept:** dusk rush reads visibly busier in probes; zero `step ===` dependencies in ambient files.

## Standing gates for every milestone

`npx tsc --noEmit` · `npx vitest run` · the feature's probe · `scripts/e2e.mjs` · scene census (when world changed) · docs + worklog updated in the same commit (docs-hygiene test enforces the manual's honesty).
