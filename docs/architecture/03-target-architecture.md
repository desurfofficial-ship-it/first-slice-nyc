# 03 — Target Architecture: a life sim on an open block

**The product law (settled with the director, 2026-11):** FIRST SLICE **is a life sim, not an open-world game** — the four-day story is the spine. The change going forward is that **the player can free roam the city on their own clock**. Free roam ≠ genre swap; it means the rails become a choice.

## 1. The Roam contract (shipped as Milestone M0)

Implemented in `web-three/src/game/freeroam.ts` (pure), `game/Game.ts` (`toggleRoam`, roam guards), `world/World.ts` (`barrierOpen` + `setBarrierOpen`), `ui/UI.ts` (the pocket's Roam chip), `core/Save.ts` (optional `roam` field).

1. **The story is never touched by roam.** Roam holds zero story state (its only field is `active` — pinned by `tests/freeroam.test.ts`). Story beats stay live mid-roam: pressing Rosa advances `GameState` exactly as in story mode. The sim continues at the player's pace.
2. **The objective line belongs to the mode.** Story mode: the day machine's line (`GameState.objectiveText()`). Roam: the calm line (`ROAM_OBJECTIVE`), and while walking, the sketchbook (`roamDiscoveryLine` counts `MAP_PLACES` against `state.visitedPlaces`). `applyEffect('step')` stops rewriting the HUD while roaming.
3. **The whole built block is walkable from minute one.** `World.setBarrierOpen(true)` stands the water-main barrier down (visibility is the collider's source of truth — the body parks at y −999, the same law `dressDay`/`updateDynamics` already use). Leaving roam restores the authored day diary.
4. **The idle nudge rests.** `cityWillWaitFires` is story pacing, not roam pacing (`Game.drainFarWorld` guard).
5. **The mode rides the save** from Day 2 on (Day 1 never writes — save.gd law): optional `roam?: true`, conditional-spread per the `starter` schema-freeze precedent; absence reads as story mode.
6. **One switch, everywhere.** The pocket chip (`#btn-roam`, label flips Roam ↔ Story, `aria-pressed`), callable from the debug handle (`__game.toggleRoam()`), guarded during the arrival film.

## 2. Module ownership after M0

| Concern | Owner | May be changed by | Must not |
|---|---|---|---|
| Story progression, money, beats | `core/GameState.ts` | Story agents only, effect-by-effect | ever read DOM/THREE |
| Roam contract, objective text law | `game/freeroam.ts` | Anyone; tests pin the text | import GameState/THREE/DOM |
| Mode levers (barrier, HUD, save) | `Game.toggleRoam` | World/UI agents via this one method | duplicate barrier logic elsewhere |
| Ambient life | `world/peds.ts`, `engine/traffic.ts`, `engine/busRoute.ts`, `world/ambient.ts` | Living-city agents | depend on `step ===` gates |
| Interactions | `game/interactionDefs.ts` registry records | One record per addition | re-introduce scattered switches |
| Day dressing | `world/dressing.ts` + `World.dressDay` | Diary-driven only | spawn/teardown at runtime |

## 3. What the city gains next (the free-roam backlog, in order)

1. **M1 — beats as places, not pressure — ✅ SHIPPED:** the Map's page 1 carries Rosa's dashed ink circle on the current beat's spot, captioned *"whenever you're ready"* in her hand. Both the objective line and the marker read the one data-only helper (`GameState.beatPlaceId()`), so they can never disagree; beats with no named place (the fire escape, the teal door, the subway stairs, the notice) park the ring. Guarded by `tests/beats.test.ts` + `scripts/probe-m1-beats.mjs` (10/10).
2. **M2 — the block becomes a district map:** docs/45's future plots open as new walkable strips; dressing stays diary-driven; the subway ride becomes a real edge between districts (the ride machine in `world/subway/` is already its own state machine).
3. **M3 — the city keeps a diary of you:** roam choices (shelf buys, hoop makes, bench sits — already persisted counters in Save v1) resurface as later-day notes; the familiar-face system generalizes to "the block remembers".
4. **M4 — ambient schedules:** peds/traffic density keyed to time-of-day already exists in seed form (`ambientWindowPlan`); promote it to a schedule table the whole street reads.

## 4. Non-goals (standing)

No WebGPU/engine swap, no procedural km² streaming, no business-tycoon loop, no energy/wait timers (the No-FOMO law), no deleting the story to "finish" the roam layer. The cozy postcard look is the brand; performance work serves it, never replaces it ([07](07-performance-and-testing-strategy.md)).
