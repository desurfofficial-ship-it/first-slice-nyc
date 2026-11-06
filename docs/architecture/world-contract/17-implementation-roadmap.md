# 17 — Implementation Roadmap

| | |
|---|---|
| Status | Adopted — this pass = Phase 0 of the world contract; phases map 1:1 to the workstreams ([14]) |
| Sequencing law | Each phase ships green (`tsc` / `vitest` / `build` / E2E) and ends with a worklog entry. |

## Phase 0 — Foundations (THIS PASS — shipped)

| Item | Where | Status |
|---|---|---|
| Id laws (both spaces) + relationship pairs | `sim/ids.ts` | ✅ Implemented, tested |
| Seeded streams (WorldRandom/fork) | `sim/rng.ts` | ✅ |
| In-game clock + canon calendar | `sim/clock.ts` | ✅ |
| Typed registry + queries + cross-ref validation | `sim/registry.ts` | ✅ |
| Entity records + validators + business hours | `sim/entities.ts` | ✅ |
| Schedules (pure resolution, overnight, weekday) | `sim/schedule.ts` | ✅ |
| Arbitration engine + priority matrix + S1–S7 | `sim/arbitration.ts` | ✅ |
| Narrative validation + availability + fallbacks | `sim/narrative.ts` | ✅ |
| Economy ledger + flow accounting + audit | `sim/economy.ts` | ✅ |
| Content manifest schema + ABO bridge | `sim/content.ts` | ✅ |
| WorldState + ownership table + versioned save | `sim/state.ts` | ✅ |
| Reference world manifest (PART 6) | `sim/reference.ts` | ✅ |
| 113 contract tests; suite 605→718, R0 fixed | `tests/sim-*.test.ts`, `tests/docs-hygiene.test.ts` | ✅ 718/718 |
| 17 contract documents | `docs/architecture/world-contract/` | ✅ |

**Exit proof:** `tsc --noEmit` clean · 718/718 · build OK · registry gate OK · E2E untouched and green by construction (no game-code changes).

## Phase 1 — The time valve & the living street (WS-D + WS-B)

1. **D-1:** tick valve in `Game.frame` (dt→ticks, pause rules, the listening beat respected).
2. **D-2:** day-boundary machine runs the shipped morning rituals from the clock (diary, restock, street schedule) — the M3/M4 patterns re-keyed from story phase to clock day, tests re-pinned.
3. **B-1:** walkers + cast read clock-keyed schedules; arbitration owns activity ownership (Yuka steers to the claim's destination).
4. **D-3:** `Effect('money')` posts to the ledger behind the shipped confirm-gates; the E2E's $87→$112 math becomes traceable transactions.
**Exit:** a roam afternoon where Idris appears at the platform at 07:40 and the deli closes at 22:00 — in-game time, zero story rewiring.

## Phase 2 — Places that mean things (WS-A + WS-E)

1. **A-1:** nav graph (nodes/edges/chokepoints) seeded from registry entrances/crosswalks; walkers migrate off hardcoded loops (crowd tests stay green).
2. **A-2:** door/stair resources mapped (`door:KTN-05`…); arbitration capacity live at the shipped chokepoints.
3. **E-1:** shipped anchors catalogued as `obj:` content entries; first building-variant pack through `validateManifest`.
4. **A-3 (deliberate flip):** building geometry loads from the registry at runtime, fidelity gate re-pinned as the load test.
**Exit:** the reference world's people physically occupy their manifest places.

## Phase 3 — The narrative spine plugs in (WS-C)

Per docs/narrative/14 §7 order: R0 done (this pass) → R4/R3 (clock+diary state) → R2/R7 (ledger+choices on the declared types) → R1/R8 (rails engine) → R5 (independence sim) → R6 (missable windows) → C0 content pack over the shipped opening → R9–R12.
**Exit:** the bible's C0 fires through `validateEvent` on the live world; the missable-window fallback writes its first world change.

## Phase 4 — The neighborhood lives (WS-B/D long-term)

Businesses operate (hours→open/close transitions→P&L from ledger evidence), relationships drift with events, the block remembers across months, season cuts run the calendar montage (narrative doc 12 §5). In-game months carry real change; nothing keys to real-world days.

## Deferred / open (with owners)

| Item | Owner | Why deferred |
|---|---|---|
| Needs/mood/ambition models | WS-B | shapes first, dials after loops exist |
| Vehicle traffic lanes | WS-A | one lane ships; multi-lane needs the graph first |
| Full-city / borough topology | lead | Passport-scale; directive rule 9 |
| Sim perf gates at scale | WS-F | needs the valve to measure |
| AGENTS.md stale doc pointers (docs/06/50/51…) | lead | prose cleanup outside this assignment |
