# 06 — Agent Development Framework

*How AI agents work on this repo without grinding its soul off. This formalizes what docs/50–53 already practiced: named agents, permanent guards, judged evidence.*

## 1. Agent roles and their fences

| Role | Owns | May touch | Must not touch |
|---|---|---|---|
| **Story agent** | beats, dialogue, day diaries | `core/GameState.ts` (methods+Effects), `core/content.ts`, `game/interactionDefs.ts` authored records | `world/` visuals, `freeroam.ts` text |
| **Living-city agent** | peds, traffic, bus, ambient dressing | `world/peds.ts`, `engine/traffic.ts`, `engine/busRoute.ts`, `world/dressing.ts`, `world/ambient.ts` | any `step ===` dependency; `core/` |
| **World-construction agent** | new strips/districts/interiors | `world/World.ts` regions, new `world/<name>.ts`, `MAP_PLACES` | deleting shipped geometry; runtime spawn/teardown |
| **Roam/systems agent** | the mode contract, HUD law | `game/freeroam.ts`, `Game.toggleRoam` + guards, `ui/UI.ts` chips | GameState story logic |
| **Guard/test agent** | probes, unit tests, census budgets | `tests/`, `scripts/probe-*.mjs` | weakening an assertion to pass |

Two agents may not own the same file in one round. Conflicts resolve through Main Agent merges (the docs/38 precedent).

## 2. Every task's contract (the paved path)

1. **Read** [AGENTS.md](../AGENTS.md) + the relevant `docs/architecture/` page + the active ledger (`docs/51-open-bugs-for-agents.md`).
2. **Claim** in the ledger with a Task ID; log in `worklog.md` in the same commit.
3. **Implement small**: one concern per task; a story beat is a GameState method + content text + one def record; a world feature is a module + a dressing function.
4. **Guard permanently** (§1c.1 of the ledger): every bug fix ships with the test/probe that would have caught it.
5. **Gates (all green, in order):** `npx tsc --noEmit` → `npx vitest run` → the feature's probe → `node scripts/e2e.mjs` for anything touching gameplay flow → `probe-scene-census.mjs` for anything touching the world.
6. **Evidence, not vibes:** probes print PASS/FAIL lines; paste the tail in the worklog entry. The "AAA judge" habit (from gen-city-auto's `agents/` briefs): a second agent reviews the diff against the laws and the anti-slop gate before merge.

## 3. The Roam law (new, binding on every role)

- The story may always assume story mode; **roam may never assume the story will wait politely in code** — it waits by design (no advance, no rewind), and tests pin that (`tests/freeroam.test.ts`, `scripts/probe-roam.mjs`).
- New HUD pressure (objectives, nudges, timers) must be **mode-aware**: if it would nag in roam, gate it like `cityWillWaitFires` is gated in `Game.drainFarWorld`.
- New world gates (barriers, locked doors) must be **roam-aware**: either open in roam or carry a diary reason; use `World.setBarrierOpen`'s visibility-is-collider pattern, never a second physics truth.
- Ambient life gets **no story dependencies**; if you need one, you are writing a story beat, not ambient life — switch roles.

## 4. What "done" means

Compiles is not done ([AGENTS.md §1b](../AGENTS.md)). Done = laws respected + gates green + probes' evidence in the worklog + the ledger row closed + docs that state the new truth (the docs-hygiene test fails a manual that lies about the phase).
