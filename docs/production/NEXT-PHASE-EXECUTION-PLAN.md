# NEXT-PHASE-EXECUTION-PLAN — FIRST SLICE

| | |
|---|---|
| Status | **The approved next development milestone** — work packages WP-0…WP-7 for Phases 1-close → 2-open |
| Owner | Production Director (issuer) · one accountable owner per work package (to be claimed) |
| Baseline | 2026-11-06, git `69f8327` · gates: `tsc` clean · vitest 660/660 (44 files) · build OK · 4-day E2E green |
| Law | Do not start implementation against an unratified baseline: WP-0a (owner ratification) gates everything. Every WP follows the assignment template (AGENT-DEVELOPMENT-GOVERNANCE.md §3) and the floor gates (PHASE-ACCEPTANCE-CHECKLISTS.md). |

---

## 0. What this milestone accomplishes

**Close Phase 1, open Phase 2.** Concretely: merge the world-contract foundation to main (WP-0), then make the running game answer to in-game time — the tick valve (WP-1), the day-boundary machine with the epoch ruling (WP-2), clock-keyed lives (WP-3), the money→ledger bridge (WP-4) — while WS-C builds the next narrative machines in parallel (WP-5: R2 + R7), the diary and calendar become visible (WP-6), and the whole thing is proven in a browser against the contract's exit sentence (WP-7).

**The player-facing bar (MS-1, "The Clock Street"):** a roam afternoon where Idris appears at the platform at 07:40 and the deli closes at 22:00 — in-game time, zero story rewiring; the date and the field diary readable on screen; every dollar traceable to the ledger; the E2E's money assertions ($87→$112→$123) passing unchanged.

**The 15–20-minute evaluation target** applies to this milestone's browser playtest (MASTER-GAME-ROADMAP.md §5): fresh save, no instructions, and the player can follow/refuse the story beat, roam on the clock, spend recorded money, discover a place, and keep a Postcard that reads the day.

## 1. Work packages

### WP-0 — Baseline ratification, merge & hygiene *(Phase 1 acceptance)*
- **Workstream / owner:** WS-D + Production Director · *owner: Production Director until claimed otherwise*
- **Task scope:** (a) owner ratifies the Phase-0 baseline (the one human gate); (b) merge `feat/world-contract-foundation` into main: resolve the `tests/docs-hygiene.test.ts` collision (both sides re-pointed R0 — keep one re-point that satisfies both intents: canon existence + phase line + engineering law); land the 17 contract docs; update wc-17's status table ("Phase 0 — shipped" gains its merge record); (c) guard-check and retire `feat/player-upgrade` (BR-3): diff its 3 commits against the cherry-picked main content row by row — every permanent guard in `player-upgrades.test.ts` must exist on main (it does per audit: player-upgrades.test.ts, 5 cases) — then delete the branch with a register note; (d) record baseline gate evidence in the register.
- **Files owned:** git branch operations; `web-three/tests/docs-hygiene.test.ts` (conflict resolution); `docs/architecture/world-contract/17-implementation-roadmap.md` (status row); register/worklog.
- **Must NOT modify:** any `src/` file other than the named test; any narrative doc.
- **Acceptance:** merged tree green — `tsc` · vitest (660 + 113 sim, dedup noted) · build · 4-day E2E · docs-hygiene; `web-three/src/sim/` on main; contract docs reachable; BR-2/BR-3 closed in the register.
- **Integration requirements:** probe-perf rows byte-identical (the branch touches no game code — verify, don't assume); `first_slice_world_v1` key present in sim-state tests.
- **Reporting:** worklog entry naming every inheriting workstream; register rows PH-1 → VERIFIED, BR-2/BR-3 closed.
- **Parallelism:** none (everything waits for this).

### WP-1 — The tick valve (D-1) *(WS-D)*
- **Task scope:** `dt→tick` valve in `Game.frame` — one tick = one in-game minute; pause rules (menus, paper surfaces, the arrival cinematic, wardrobe, postcard); the listening beat respected (a beat in progress must not be truncated by a day boundary); the valve writes through `sim/clock`'s API only.
- **Files owned:** `web-three/src/game/Game.ts` (frame wiring only), `web-three/src/sim/valve.ts` (new), `web-three/tests/valve.test.ts` (new).
- **Must NOT modify:** `core/GameState.ts`, `world/*`, `sim/clock.ts` internals, `sim/economy.ts`, `core/content.ts`.
- **Required references:** wc-06 (determinism), wc-17 Phase-1 item 1, AGENTS.md §1c.3 (hot path), `sim/clock.ts` header (the five clock laws), `Game.frame` order comments.
- **Acceptance:** deterministic tick counts from identical input traces; pause rules tested; zero allocations in the steady loop; frame order law respected (colliders sync before the player moves — the cab-stale-frame fix survives).
- **Required tests:** valve.test.ts (tick math, pause, determinism); full suite + E2E green.
- **Integration:** boot with `?probe` runs a 60-second tick trace, console clean; no visible behavior change yet.
- **Reporting:** worklog + register (SYS-ECO-09) + PR with gate output.

### WP-2 — The day-boundary machine & the epoch ruling (D-2 + DEC-1) *(WS-D + Narrative Director)*
- **Task scope:** rule DEC-1 first (PRODUCTION-RISKS-AND-DEPENDENCIES.md §1: default = sim clock is world truth at the Sept-9 epoch; the story calendar becomes a derived view; C0's October mood-lock survives as presentation; ruling recorded in docs/narrative/15 §2). Then: the day-boundary machine runs the shipped morning rituals from the clock — diary note, restock, street shifts — re-keying the M3/M4 patterns from story phase to clock day, with one mapping function + pinned test reconciling story-day counter and world clock.
- **Files owned:** `web-three/src/sim/dayBoundary.ts` (new), `web-three/src/sim/epochMap.ts` (new, the one mapping), `web-three/tests/sim-day-boundary.test.ts` (new); `docs/narrative/15-continuity-and-canon-register.md` (the ruling §2 entry); `web-three/src/game/Game.ts` (wiring only).
- **Must NOT modify:** `core/calendar.ts` (derive from it; do not change its epoch), `core/Save.ts` schema, `world/dressing.ts` (consume its tables).
- **Required references:** docs/narrative/12 §1/§5 (both epochs' canon sources), wc-06, `core/calendar.ts` + tests (the mood-lock byte-for-byte law), `core/diary.ts` (the morning-note pattern).
- **Acceptance:** DEC-1 ruled and recorded; one mapping function with a pinned test; morning rituals fire from the clock; the shipped Day 1–4 calendar dates render unchanged for existing saves (back-compat proof); no real-world dates anywhere (calendar tests extend across the new layer).
- **Required tests:** sim-day-boundary.test.ts (boundary math, ritual order, listening-beat interaction with WP-1); mapping test; suite + E2E green.
- **Integration:** beginDay resume lands on the saved calendar as today; a replayed day never double-advances (the existing max() law).
- **Reporting:** worklog (canon ruling quoted) + register (DEC-1 closed, SYS-ECO-09 progress) + PR.

### WP-3 — Clock-keyed lives (B-1) *(WS-B)*
- **Task scope:** walkers + cast read clock-keyed schedules via arbitration claims; arbitration owns activity ownership; Yuka steers to the claim's destination. Start with the contract's proof cast: Idris (platform 07:40) and the deli (closes 22:00); migrate the familiar-face and street shifts off story-phase keys onto clock keys.
- **Files owned:** `web-three/src/sim/lifeBindings.ts` (new), `web-three/src/world/peds.ts` (destination plumbing only), cast binding sections of `game/Game.ts` (coordinated — single-writer window booked with the Production Director), `web-three/tests/sim-clockday.test.ts` (new).
- **Must NOT modify:** `sim/arbitration.ts` internals, `sim/schedule.ts` internals, story steps in `core/GameState.ts`, `world/dressing.ts` table contents.
- **Required references:** wc-08 §5 (fidelity tiers), wc-09 (arbitration contract + S1–S7), wc-17 Phase-1 items 3, `world/peds.ts` solidity header (the guarantees that must survive).
- **Acceptance:** Idris at the platform at 07:40 and the deli closed at 22:00 in a browser run; zero `step ===` dependencies added to ambient life (the Roam law); crowd/solidity/shuffle guards green; schedules resumable from a world save.
- **Required tests:** sim-clockday.test.ts (occupancy at pinned times); all crowd/solidity/shuffle/traffic guards; soak probe green.
- **Integration:** a new clock-day probe in `web-three/scripts/probe-clock-day.mjs` (new) asserting occupancy; E2E green.
- **Reporting:** worklog + register (SYS-POP-02/03 → INTEGRATED) + PR + probe screenshot evidence.

### WP-4 — The money→ledger bridge (D-3) *(WS-D)*
- **Task scope:** `Effect('money')` posts to the ledger behind the shipped confirm-gates; the sanctioned mirror holds (`player.moneyCents` ↔ `ledger.balance('acct:player')`, audited by `auditWorld`); genesis seeds from the shipped start; the E2E's $87→$112→$123 math becomes traceable transactions with **no behavioral change**.
- **Files owned:** `web-three/src/sim/moneyBridge.ts` (new), `web-three/tests/sim-money-bridge.test.ts` (new), the money-effect application section of `game/Game.ts` (single-writer window), `web-three/scripts/probe-money-trace.mjs` (new).
- **Must NOT modify:** `core/GameState.ts` money methods (they keep owning story math), `sim/economy.ts` internals, prices anywhere, save schema.
- **Required references:** wc-12 (economy contract), wc-02 D7, wc-05 §2 (the sanctioned dual view), AGENTS.md §1c.4 (determinism).
- **Acceptance:** every dollar reconciles from genesis + Σ on every save; the mirror audit fails the world on any disagreement (tested); E2E assertions unchanged and green; zero prices invented.
- **Required tests:** money-bridge tests (post paths, mirror, audit failure modes); save round-trips; suite + E2E.
- **Integration:** probe-money-trace prints a Day-1 transaction trace ending at $112; console clean.
- **Reporting:** worklog + register (SYS-PLAY-08 → INTEGRATED) + PR.

### WP-5 — R2 consequence ledger + R7 choice nodes *(WS-C — parallel with WP-1…4)*
- **Task scope:** docs/narrative/14 §7 step 2, on the declared sim types: the append-only consequence ledger (`LedgerEntry`, promises with due dates, unmet promises maturing into omissions) and the ChoiceNode register (doc 10 §3; structural options' downstream flag signatures unique — the no-fake-choices rule as a test). Pure state behind the `core/content.ts` seam; Save-v1-safe.
- **Files owned:** `web-three/src/core/consequenceLedger.ts` (new), `web-three/src/core/choiceNodes.ts` (new), their test files (new), save-seam additions (optional trailing fields only).
- **Must NOT modify:** `game/Game.ts`, `world/*`, `sim/state.ts` ownership table (coordinate via governance if a flag-bridge shape is needed).
- **Required references:** docs/narrative/10 §1/§3, docs/narrative/14 §1 (R2/R7), §2 (schemas), §6 (testing law), `core/fieldDiary.ts` (the append-only + quarantine precedent).
- **Acceptance:** append-only invariant tested (mutation fails); promise→omission maturation tested; flag-signature uniqueness tested; ledger determinism from save tested; old saves parse with empty new layers.
- **Required tests:** per §6 minimum set; suite + E2E green.
- **Integration:** none yet (state machines ahead of their content, per §7 order) — integration lands with R1/R8.
- **Reporting:** worklog + register (R2/R7 rows) + PR.

### WP-6 — The diary and the date become visible *(WS-C + WS-E)*
- **Task scope:** the field-diary ink layer on the Map (font atlas + wobble RECALL style — two draw calls of UI per narrative/14 §4) and the calendar date on the HUD/Map ("October 14 · Year 1" via `formatGameDate`). Touch law and paper-surface law respected; dyslexia-friendly toggle may follow in Phase 5 but entries must be readable at this milestone.
- **Files owned:** `web-three/src/ui/diary.ts` (new), `web-three/src/ui/sketch.ts` (extensions), `web-three/src/style.css` (additions), tests (new).
- **Must NOT modify:** `core/fieldDiary.ts` (consume only), `ui/UI.ts` structure beyond wired entry points, any sim layer.
- **Required references:** docs/narrative/03 (schema + strike styles), docs/narrative/14 §4, AGENTS.md §2 (voice), `ui/touchLaw.ts` + test.
- **Acceptance:** entries render as ink with corrections struck through; the date renders from the calendar (never real time); a 390×844 probe pass; touch-law test green; no page errors.
- **Reporting:** worklog + register (SYS-POP-06/SYS-NAR-02 → INTEGRATED) + PR + screenshots.

### WP-7 — Evidence: the Clock Street demo *(WS-F)*
- **Task scope:** assemble the milestone evidence: the clock-day probe + money-trace probe joined into a single MS-1 demonstration run (build → serve dist → drive a roam afternoon → assert 07:40 platform occupancy → assert 22:00 deli close → assert ledger reconciliation → screenshots); run the full floor gates; run the 15–20-minute evaluation session in a browser (human box, logged with who/when); update the register and close Phase 2 or list variances.
- **Files owned:** `web-three/scripts/probe-ms1-clock-street.mjs` (new), register/worklog.
- **Must NOT modify:** product code (WS-F law).
- **Acceptance:** probe exit 0 with screenshot evidence; E2E + full suite green; the exit sentence demonstrated; register rows re-statused; PH-2 exit checklist signed or variances filed.
- **Reporting:** worklog + register + the demo artifacts (screenshots to `web-three/shots/` per house convention).

## 2. Parallelism map for this milestone

```
WP-0 (merge & ratify)          ── everything waits
WP-1 (valve, Game.frame)       ──┐
WP-4 (money bridge, Game.ts*)  ──┤  WS-D sequential inside Game.ts
WP-2 (day boundary + DEC-1)    ──┘  (single-writer windows, booked)
WP-3 (clock-keyed lives)       ── after WP-1's valve exists; booking needed for cast sections
WP-5 (R2+R7, core seam)        ── fully parallel with WP-1…4 (disjoint files)
WP-6 (diary UI)                ── parallel after WP-2 (needs the mapping for dates)
WP-7 (evidence assembly)       ── last; consumes all
```
*Game.ts is single-writer: WP-1, WP-2, WP-4 book successive windows with the Production Director; WP-3's cast sections book separately. No two WPs hold Game.ts simultaneously — the governance law, not a preference.*

## 3. What must NOT begin during this milestone

- Nav-graph migration, registry geometry flip (Phase 3) — the valve first.
- Needs/mood dials, population growth (Phase 4).
- Any C0+ content, rails, or chapters (Phase 7 waves) — machines first, §7 order.
- Business P&L, seasons, missable windows (Phase 6).
- Any new dependency, any engine/library swap, any borough geometry (owner gates).
- Editing `docs/narrative/` content beyond the DEC-1 ruling entry (WS-C per the bible only).

## 4. Risks specific to this milestone (see the risks doc for the full register)

- **DEC-1 unrulable** → WP-2 defaults to the documented default (sim clock = world truth); the ruling can be revisited, the mapping function cannot be skipped.
- **Frame-order regressions** → the cab-stale-frame class; WP-1's tests + E2E cover; the frame-order law stays in comments and guards.
- **Double-writes between story money and ledger** → the sanctioned mirror + `auditWorld` fail-fast; WP-4 tests the disagreement path explicitly.
- **`Game.ts` merge pressure** → single-writer windows are booked; each WP's Game.ts diff stays under ~100 lines.
- **E2E fragility to timing** → the autotest's pace-factor law (docs/56-eight-orders) — any new assertion uses the existing budget patterns.

## 5. Rollback posture

Every WP lands as an independent, revertible commit series behind green gates; the E2E + probe fleet re-run per merge. If the valve destabilizes the shipped slice, the rollback is: revert the valve commit series (the sim layer beneath is inert by construction — that is what Phase 1's zero-runtime-change design bought). No WP may leave main red overnight; a red main is an all-hands for the owning workstream + WS-F.

## 6. Done means

Phase 2's exit checklist (PHASE-ACCEPTANCE-CHECKLISTS.md) fully checked with evidence, signed by WS-D lead + WS-B lead + Production Director; MS-1 recorded in the register; the next-phase plan (Phase 3: nav & registry) drafted and queued for ratification.

— Production Director, 2026-11-06
