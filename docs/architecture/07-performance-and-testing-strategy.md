# 07 — Performance & Testing Strategy

## 1. Performance law (what exists, keep it true)

- **The frame budget is mobile-first.** 720×1280 portrait is "the mobile must-test" — every probe runs it. The shadow pass is half the frame cost under SwiftShader (`probe-shadow-cost`: 21→46 fps with `?fx=off`), so `?fx=off` stays a first-class test affordance, and dt is clamped to 0.1 s so slow machines stay deterministic.
- **Dressing never churns.** `World.dressDay` is material/visibility writes only — no spawn, no teardown, no draw-call spikes at day transitions. The barrier's open/closed state follows the same law (visibility is the collider's source of truth; the body parks at y −999).
- **Per-frame costs stay O(small):** the interaction registry's `nearest()` is one allocation-free squared-distance pass; `checkSketchReveals` throttles to ~0.5 s; far-world beats drain through queues (`drainFarWorld`); walkers/traffic are budgeted ambient systems with district updates (`updateDistricts`).
- **Draw-call discipline** is enforced by evidence: `probe-scene-census.mjs` counts, `probe-perf.mjs`/`probe-shadow-buckets.mjs` attribute, and past merges cite numbers in the worklog (the +290-call Times Square leak fix is the precedent).
- **Zero binary assets:** the world is procedural (street kits, person rigs, canvas textures). Budgets live in code, not downloads.

## 2. Testing pyramid (who proves what)

| Level | Tool | Counts (2026-11-05) | Owns |
|---|---|---|---|
| Pure logic | `vitest` (`tests/*.test.ts`) | 36 files / 559 assertions | GameState law, save migration, dressing plans, registry gates, the Roam contract |
| Feature probes | Playwright on `dist/` (`scripts/probe-*.mjs`) | ~80 harnesses | One real-browser behavior each; mobile portrait; console-clean required |
| Full story E2E | `game/autotest.ts` via `scripts/e2e.mjs` | 4 days, ~535 s | The life sim's spine — no change ships that breaks it |
| Visual evidence | `visual-check.mjs` family | shots per feature | The 1-Second Law (readable, beautiful, NY) |

**Rule:** a feature without its probe is unfinished (the anti-slop gate's "verification method" requirement).

## 3. How the Roam layer is tested (the worked example to copy)

1. **Unit** (`tests/freeroam.test.ts`): the contract's text law, the single-field purity (a roam session cannot advance/rewind anything), discovery-line degradation, save schema compat (old v1 saves parse byte-identically; corrupt reads as story mode, never a crash).
2. **Probe** (`scripts/probe-roam.mjs`, 28 checks): barrier visible Day 1 → hidden + collider parked after toggle (physics proof at the barrier's own coordinates); story-mode reveals don't move the objective; mid-roam ambient answers AND pressing Rosa advances the story with roam held; toggle-back restores diary + story line; Day 1 never writes; a `roam:true` Day-2 save boots silently mid-roam; the key clears on exit; console clean.
3. **Regression:** the 4-day E2E (story untouched) + the full vitest suite (553 legacy assertions green).

## 4. Budgets that gate future milestones

| Milestone (see 05) | New gate |
|---|---|
| M1 map markers | map open ≤ N DOM nodes; probe: marker matches objective's place |
| M2 districts | scene-census draw calls within current ×1.5 on SwiftShader; new strip probe; 60 s soak probe |
| M3 city diary | ≤1 note per counter family per day (unit-tested) |
| M4 schedules | street never empties (probe-peds min-count at any hour); density table pure + table-tested |

When a budget breaks, the response is engineering (instancing, visibility groups, LOD via the district system) — never turning off the check.
