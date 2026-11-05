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

## M2 — The district map (the block grows) ✅ SHIPPED (by the docs/45–47 construction arc)

- **Goal:** docs/45's future plots become walkable strips; the subway ride becomes a real edge between districts.
- **Shipped:** the four streets, both avenues, the two interior parks and the eight interiors opened as walkable, district-tagged content (W0 culling rings → W1 grid + Marlow row → W2 Gable Row + parks + shortcuts → W3 avenue walls + landmarks → W4 life + traffic + the M121 → W5 interiors, each with its phase exit in docs/45/47); the K ride has been the edge between districts since Times Square shipped — board at Alder Heights (station A), step off at 42 St (station B), `tsSurface` lights its own zone.
- **Risk retired:** "draw calls and colliders grow with area" — the W0 district ring + the census probe hold the budget; the E2E stayed green through every phase.

## M3 — The city keeps a diary of you ✅ SHIPPED

- **Goal:** roam choices resurface as later-day notes (the Save v1 counters `shelf_buys/dog_buys/trims/washes/hoop_makes` already existed and were persisted but under-used in prose).
- **Shipped:** `core/diary.ts` (pure machine — a family speaks when it climbs a full threshold past the watermark; biggest overshoot wins; ties in fixed order; the diary stays one step behind the in-person `MEMORY_LINES`) · the day-begin drain in `Game.beginDay` (one note per morning, queued behind the DAY note; skipped on Day 1) · the `diary_noted` watermark in Save v1 (optional-trailing, byte-identical old parses, clamped per family) · `content.ts DIARY_NOTE_TEXT` (five lines, none of which ask for another round — the No-FOMO check is a unit test).
- **Proof:** `tests/diary.test.ts` (13 pins: thresholds, said-once-ever, overshoot priority, tie order, old-save silence, watermark round-trip, No-FOMO prose) · `scripts/probe-m3-diary.mjs` 9/9 in real Chromium (exactly one diary note on a Day-2 morning, parked behind the DAY note, the other families quiet, the watermark in localStorage, no repeat after reload) · 4-day E2E AUTOTEST OK 0 failures · `tsc` clean · vitest 582/582.

## M4 — Ambient schedules ✅ SHIPPED

- **Goal:** peds/traffic density keyed to time-of-day (promote `ambientWindowPlan`'s instinct to a schedule table the street reads).
- **Shipped:** `dressing.ts STREET_PLAN` (the two-row table the whole street reads — the game's honest clock is the day's two street phases: the block runs on your clock, so no minute grid, no new save fields) + `PEDESTRIAN_ROLES` (the roster's shifts: seven 'street' walkers are the floor no phase may park, the garden tender is the 'park' shift, three new dusk-shift neighbors are the evening rush) · `peds.ts applyStreetPlan` (a home walker is hidden, collider parked at y −999 — the barrier's trick — excluded from the cab's yield pool and the registry's y-band, frozen through Yuka by the shipped pin, resumed exactly where they left their loop) · `World.updateDynamics` applies the row on the dusk-flag edge (boot = day, so the shipped street is unchanged until the first flip) · `updateTaxi` reads `cabPace` (rush crawls 9 → 6.3 m/s) · the roster's three rush neighbors walk the shipped north-walk band — zero new lanes, colliders, or materials.
- **Reference check (docs/57 §3.5):** neither Gen City Auto nor Slop New York schedules density by time of day (GCA: spatial hub density + fixed targets; SNY: atmosphere-only presets) — the table is FIRST SLICE's own, the borrowed part is the shape (a pure density read; named presets) with the hot-path discipline checked per §1c.3.
- **Risk retired:** "a schedule bug empties the street" — the floor law is a unit test (no phase parks a 'street' walker; day equals the shipped street exactly, census-identical), and the census now tells render truth (a pruned walk — meshes under invisible parents were counted that the renderer never drew).
- **Proof:** `tests/street-schedule.test.ts` (12 pins) · `scripts/probe-peds.mjs` day + dusk sections in real Chromium (plan wiring 0.7/3, 12 roster, 11 visible at dusk, the tender home, all three rush walkers walking the band, the floor trio still walking, rush screenshot at the terminal stretch) · `probe-cars` exit 0 · census 321 drawables at rest, identical to the pre-M4 baseline · 4-day E2E AUTOTEST OK 0 failures (543 s) · `tsc` clean · vitest 600/600.

## Standing gates for every milestone

`npx tsc --noEmit` · `npx vitest run` · the feature's probe · `scripts/e2e.mjs` · scene census (when world changed) · docs + worklog updated in the same commit (docs-hygiene test enforces the manual's honesty).
