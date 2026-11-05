# 01 — Current Architecture Audit (web-three)

*Audit date: 2026-11-05 · scope: `web-three/src` (~24.4k lines TS) · verdict first: the codebase is healthy; its rails are healthy too — they are just rails.*

## 1. Layer map (what actually exists)

| Layer | Files | Law it follows |
|---|---|---|
| **Pure state** | `core/GameState.ts` (922 ln), `core/Save.ts`, `core/content.ts` (1223 ln), `core/starters.ts`, `core/palette.ts` | "No rendering, no DOM: the scene graph and the UI only ever *reflect* this state." GameState is the 1:1 port of the original greybox state machine (the migration record lives in docs/23–24; the behavior oracle's job now belongs to the vitest suite + the 4-day E2E). |
| **Orchestrator** | `game/Game.ts` (2549 ln) | Owns the render loop, applies `Effect` union to world/UI, runs authored sequences (dusk, gold window, postcards). |
| **Story staging** | `game/arrival.ts` (2036 ln) | The bus-ride opening as a self-contained diorama state machine; `?film=1` explicit opt-in for drivers. |
| **Interactions** | `game/interactions.ts` (registry) + `game/interactionDefs.ts` (796 ln) | Doc 37 §3B: one declarative record per interaction (`id/pos/enabled/prompt/perform`). Replaced the old four-place wiring. |
| **World** | `world/World.ts` (6290 ln), `world/peds.ts`, `world/ambient.ts`, `world/props.ts`, `world/timesSquare.ts`, `world/subway/`, dressing modules | Procedural, zero binary assets; day dressing = material/visibility writes only ("no spawn, no teardown, no draw-call churn"). |
| **Engine** | `engine/collide.ts`, `engine/Input.ts`, `engine/traffic.ts`, `engine/busRoute.ts`, `engine/tweens.ts` | Capsule/AABB physics, input abstraction, ambient traffic. |
| **Player/Camera** | `player/Player.ts` (173 ln), `camera/GameCamera.ts` (436 ln) | The oracle's constants (SPEED 4.2, GRAVITY 18, CLIMB 2.6); camera-relative movement. |
| **Modes** | `court/CourtGame.ts` + `court/`, `postcard/` | The half-court loop; the postcard/album keepsake system. |

## 2. What the audit found (strengths)

1. **State/render separation is real, not aspirational.** Every gameplay fact lives in `GameState`; `Game.applyEffect` is the one pipe into the world. This is what made the Roam change safe.
2. **The interaction registry killed the four-place sync problem** (`game/interactions.ts` header documents the trap it replaced). Adding ambient interactions is one `register()`.
3. **Testing is a pyramid, not a garnish:** 559 vitest assertions on pure modules, Playwright probes per feature (`scripts/probe-*.mjs`), and a 4-day in-page E2E driver (`game/autotest.ts` via `scripts/e2e.mjs`, 535 s, 0 failures at audit time).
4. **Save discipline:** v1 schema with optional trailing fields and a written migration law (`core/Save.ts` header) — additive change is a solved problem here.
5. **The world already breathes:** walkers (Phase 4), traffic, bus route, subway rides, the familiar face, ambient window plans — the "city is alive" requirement predates this audit.

## 3. What the audit found (the rails — where free roam was blocked)

1. **The story is a 33-step linear machine** (`core/GameState.ts` `Step`: `MEET_ROSA` … `D4_*` → `DONE`, days 1–4). Every beat is gated by `step ===` checks — correct for a story, restrictive as a *world*.
2. **A physical gate days 1–3:** the water-main barrier (`world/World.ts` `barrierCollider` at −9.7, 7.62; `dressing.ts barrierDiary` — visible until Day 4). Roaming into the east end before Day 4 meant arguing with a prop.
3. **The objective line is a leash by default:** `applyEffect('step')` rewrote the HUD to the story's line unconditionally; nothing told the player the block was theirs to wander.
4. **The idle nudge belongs to the story's pacing** (`cityWillWaitFires`, 20 s): comfort in story mode, nagging mid-roam.
5. **No mode that means "roam":** the free-roam *interaction set* existed (benches, newsbox, subway, court, shops — Doc 37 §3C), but there was no mode where the *world* opens and the *pressure* rests.

## 4. Verdict

Nothing needs deleting. The 553-test baseline was green before this audit; the life sim is the product. What was missing is **a mode contract** that turns the existing ambient systems into a first-class way to play — which is what [03-target-architecture.md](03-target-architecture.md) specifies and what this repo now ships (M0).
