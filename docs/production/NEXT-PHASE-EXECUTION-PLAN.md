# NEXT-PHASE-EXECUTION-PLAN — FIRST SLICE

| | |
|---|---|
| Status | **The approved next development milestone** — work packages WP-0…WP-7 for Phases 1-close → 2-open |
| Owner | Production Director (issuer) · one accountable owner per work package (to be claimed) |
| Baseline | 2026-11-06, git `69f8327` · gates: `tsc` clean · vitest 660/660 (44 files) · build OK · 4-day E2E green |
| Reconciled | **R1, 2026-11-06**: the valve (WP-1), the bound-cast half of WP-3 and the world save are **already implemented on `feat/world-contract-foundation` @ `407cc0e` and verified** (tsc · vitest 744/744 · build · probe 15/15 — all executed by audit R1). This plan is re-scoped to the true remainder; do **not** rebuild what exists. See [PRODUCTION-RECONCILIATION-REPORT.md](PRODUCTION-RECONCILIATION-REPORT.md). |
| Law | Do not start implementation against an unratified baseline: WP-0a (owner ratification) gates everything. Every WP follows the assignment template (AGENT-DEVELOPMENT-GOVERNANCE.md §3) and the floor gates (PHASE-ACCEPTANCE-CHECKLISTS.md). |

---

## 0. What this milestone accomplishes

**Close Phases 1–2, open Phase 3.** Audit R1 found the tick valve (WP-1), the bound-cast half of clock-keyed lives (WP-3) and the world-save layer already **implemented on the branch and verified** — they are inherited, not rebuilt. What remains: merge the verified branch to main (WP-0), close the pause-set gap (WP-1v), rule DEC-1 and pin the epoch mapping (WP-2v), migrate the ambient walkers (WP-3v), land the money→ledger bridge (WP-4) — while WS-C builds the next narrative machines in parallel (WP-5: R2 + R7), the diary and calendar become visible (WP-6), and the whole thing is proven in a browser against the contract's exit sentence (WP-7).

**The player-facing bar (MS-1, "The Clock Street"):** a roam afternoon where Idris appears at the platform at 07:40 and the deli closes at 22:00 — in-game time, zero story rewiring; the date and the field diary readable on screen; every dollar traceable to the ledger; the E2E's money assertions ($87→$112→$123) passing unchanged.

**The 15–20-minute evaluation target** applies to this milestone's browser playtest (MASTER-GAME-ROADMAP.md §5): fresh save, no instructions, and the player can follow/refuse the story beat, roam on the clock, spend recorded money, discover a place, and keep a Postcard that reads the day.

## 1. Work packages

### WP-0 — Baseline ratification, merge & hygiene *(Phase 1 acceptance)*
- **Workstream / owner:** WS-D + Production Director · *owner: Production Director until claimed otherwise*
- **Task scope:** (a) owner ratifies the Phase-0 baseline (the one human gate); (b) merge `feat/world-contract-foundation` into main: resolve the **three** conflicted files per audit R1 — `AGENTS.md` (keep main's reboot text + append the branch's WORLD-CONTRACT block and repo-map lines), `tests/docs-hygiene.test.ts` (**DEF-3 union:** main's file + the branch's README banner assertions — main's README already satisfies them), `worklog.md` (append both ledgers' rows; `Game.ts` auto-merges per the merge-tree scan) — land the 17 contract docs; update wc-17's status table ("Phase 0 — shipped" gains its merge record); **re-run the 4-day E2E at this gate** (audit R1 marks it reported-only); (c) guard-check and retire `feat/player-upgrade` (BR-3): diff its 3 commits against the cherry-picked main content row by row — every permanent guard in `player-upgrades.test.ts` must exist on main (it does per audit: player-upgrades.test.ts, 5 cases) — then delete the branch with a register note; (d) record baseline gate evidence in the register.
- **Files owned:** git branch operations; `web-three/tests/docs-hygiene.test.ts` (conflict resolution); `docs/architecture/world-contract/17-implementation-roadmap.md` (status row); register/worklog.
- **Must NOT modify:** any `src/` file other than the named test; any narrative doc.
- **Acceptance:** merged tree green — `tsc` · vitest (**expect 744/744**) · build · **4-day E2E re-run** · docs-hygiene (union) · probe-world-sim re-run green; `web-three/src/sim/` on main; contract docs reachable; BR-2/BR-3/BR-5 closed in the register.
- **Integration requirements:** probe-perf rows byte-identical (the branch touches no game code — verify, don't assume); `first_slice_world_v1` key present in sim-state tests.
- **Reporting:** worklog entry naming every inheriting workstream; register rows PH-1 → VERIFIED, PH-2 → INTEGRATED (merged), BR-2/BR-3/BR-5 closed.
- **Parallelism:** none (everything waits for this).

### WP-1 — The tick valve (D-1) *(WS-D)* — **IMPLEMENTED on branch (`407cc0e`, `sim/runtime.ts`); verified by audit R1 — do NOT rebuild. WP-1v CLOSED 2026-11-06 (main `eab767c`+): the pause-set gap is closed**
- **Task scope (remainder = WP-1v — CLOSED):** the valve, its fractional carry and the host pause set (arrival film, day fade, held conversations) are live in `Game.frame`. The one verified gap vs this package's original list: the **wardrobe and postcard surfaces are not in the pause set** — **closed**: the pause set now lives in `game/pauseSet.ts` (pure, one statement), `Game.frame` feeds it, and wardrobe/postcard are members; the Map is deliberately NOT (pinned by test — the notebook never stops the block).
- **Files owned (WP-1v):** the pause expression in `Game.frame`; `web-three/tests/sim-runtime.test.ts` additions. *(Landed as: `game/pauseSet.ts` new — the expression itself, one pure statement Game.frame delegates to; `Game.frame` call site; 11 pinned cases in sim-runtime.test.ts incl. the permanent source guard; `scripts/probe-pause-set.mjs` — the browser verification probe.)*
- **Must NOT modify:** valve internals (`sim/runtime.ts`), `core/GameState.ts`, `world/*`, `sim/clock.ts` internals, `sim/economy.ts`, `core/content.ts`.
- **Acceptance (WP-1v):** a held wardrobe/postcard beat is never truncated by a tick boundary in test; the deterministic tick counts and zero-allocation loop remain as landed.
- **Required tests:** valve pause cases; full suite + E2E green.
- **Integration:** none visible; the frame-order law (colliders sync before the player moves) is untouched.
- **Reporting:** worklog + register (SYS-ECO-09) + PR with gate output.

### WP-2 — DEC-1 ruling & the epoch mapping (D-2 remainder) *(WS-D + Narrative Director + OWNER)* — **re-scoped by R1: the roam half of D-2 (dusk law + M4 street plan on the clock) ships on the branch; story-day mornings stay story-keyed by design (wc-17)**
- **Task scope:** ~~rule DEC-1 first — **the owner's gate**~~ **RULED 2026-11-06 (owner-approved Option A: Day 1 = Tuesday, Sept 9, Y1; ruling in docs/narrative/15 §2/§7; adjudication in DEC-1-CALENDAR-CANON-DECISION.md; `CAL_EPOCH` corrected on main).** Remaining: one mapping function + pinned test reconciling story day ↔ sim day ↔ displayed date (the 1:1 day-counter alignment already lives in `WorldRuntime.onStoryDayBegin`); make the displayed date consistent across the field diary/HUD under the ruled epoch; document the pre-merge saves' date re-rendering (no silent data loss).
- **Files owned:** `web-three/src/sim/epochMap.ts` (new, the one mapping), `web-three/tests/sim-epoch-map.test.ts` (new); `docs/narrative/15-continuity-and-canon-register.md` (the ruling §2 entry, by the Narrative Director); `web-three/src/core/calendar.ts` epoch **only per the ruling**.
- **Must NOT modify:** `core/Save.ts` schema, `world/dressing.ts` (consume its tables), narrative content beyond the ruling entry in doc 15.
- **Required references:** docs/narrative/12 §1/§5 (both epochs' canon sources), wc-06, `core/calendar.ts` + tests (the mood-lock byte-for-byte law), `core/diary.ts` (the morning-note pattern).
- **Acceptance:** DEC-1 ruled and recorded by the owner; one mapping function with a pinned test; every displayed date (diary, HUD, debug) consistent under the ruled epoch; the change in rendered dates for pre-merge saves documented in the worklog (no silent data loss); no real-world dates anywhere (calendar tests extend across the new layer).
- **Required tests:** sim-epoch-map.test.ts (the one mapping, pinned days); calendar test extensions; suite + E2E green.
- **Integration:** beginDay resume lands on the saved calendar as today; a replayed day never double-advances (the existing max() law).
- **Reporting:** worklog (canon ruling quoted) + register (DEC-1 closed, SYS-ECO-09 progress) + PR.

### WP-3 — Clock-keyed lives (B-1) *(WS-B)* — **bound cast DONE on branch (`407cc0e`; probe steps 1–4 executed); re-scoped to the ambient migration**
- **Task scope:** migrate the ambient Yuka pedestrians and the street shifts off story-phase keys onto clock-keyed schedules through arbitration (wc-17's declared "next B milestone"), with `world/peds.ts` destination plumbing; the bound cast (Rosa, Idris) and the R6 hello door stay as landed. Scale-out is recommended **after A-1** (the nav graph): sim bodies currently goal-lerp in straight lines with no obstacle avoidance — safe at two bodies, a defect at ten.
- **Files owned:** `web-three/src/sim/lifeBindings.ts` (new), `web-three/src/world/peds.ts` (destination plumbing only), cast binding sections of `game/Game.ts` (coordinated — single-writer window booked with the Production Director), `web-three/tests/sim-clockday.test.ts` (new).
- **Must NOT modify:** `sim/arbitration.ts` internals, `sim/schedule.ts` internals, story steps in `core/GameState.ts`, `world/dressing.ts` table contents.
- **Required references:** wc-08 §5 (fidelity tiers), wc-09 (arbitration contract + S1–S7), wc-17 Phase-1 items 3, `world/peds.ts` solidity header (the guarantees that must survive).
- **Acceptance:** ambient walkers occupy clock-pinned places at pinned times in a browser run (the bound cast's 07:40-platform/22:00-deli proof is already banked); zero `step ===` dependencies added to ambient life (the Roam law); crowd/solidity/shuffle guards green; schedules resumable from a world save.
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

### WP-5 — R2 consequence ledger + R7 choice nodes *(WS-C — parallel with WP-1…4)* — **CLOSED 2026-11-07 (main `b99c01f`): landed under the owner's "Continue working" as the parallel WS-C track, before WP-7 so the milestone evidence consumes the whole milestone**
- **Task scope:** docs/narrative/14 §7 step 2, on the declared sim types: the append-only consequence ledger (`LedgerEntry`, promises with due dates, unmet promises maturing into omissions) and the ChoiceNode register (doc 10 §3; structural options' downstream flag signatures unique — the no-fake-choices rule as a test). Pure state behind the `core/content.ts` seam; Save-v1-safe.
- **Files owned:** `web-three/src/core/consequenceLedger.ts` (new), `web-three/src/core/choiceNodes.ts` (new), their test files (new), save-seam additions (optional trailing fields only).
- **Must NOT modify:** `game/Game.ts`, `world/*`, `sim/state.ts` ownership table (coordinate via governance if a flag-bridge shape is needed).
- **Required references:** docs/narrative/10 §1/§3, docs/narrative/14 §1 (R2/R7), §2 (schemas), §6 (testing law), `core/fieldDiary.ts` (the append-only + quarantine precedent).
- **Acceptance:** append-only invariant tested (mutation fails); promise→omission maturation tested; flag-signature uniqueness tested; ledger determinism from save tested; old saves parse with empty new layers.
- **Required tests:** per §6 minimum set; suite + E2E green.
- **Integration:** none yet (state machines ahead of their content, per §7 order) — integration lands with R1/R8.
- **Reporting:** worklog + register (R2/R7 rows) + PR.

### WP-6 — The diary and the date become visible *(WS-C + WS-E)* — **CLOSED 2026-11-07 (main `5ba16a3`): landed under the owner's "Continue working" as the next sequenced item**
- **Task scope:** the field-diary ink layer on the Map (font atlas + wobble RECALL style — two draw calls of UI per narrative/14 §4) and the calendar date on the HUD/Map ("September 14 · Year 1" via `formatGameDate` — the ruled Sept 9 epoch, DEC-1 2026-11-06). Touch law and paper-surface law respected; dyslexia-friendly toggle may follow in Phase 5 but entries must be readable at this milestone.
- **Files owned:** `web-three/src/ui/diary.ts` (new), `web-three/src/ui/sketch.ts` (extensions), `web-three/src/style.css` (additions), tests (new).
- **Must NOT modify:** `core/fieldDiary.ts` (consume only), `ui/UI.ts` structure beyond wired entry points, any sim layer.
- **Required references:** docs/narrative/03 (schema + strike styles), docs/narrative/14 §4, AGENTS.md §2 (voice), `ui/touchLaw.ts` + test.
- **Acceptance:** entries render as ink with corrections struck through; the date renders from the calendar (never real time); a 390×844 probe pass; touch-law test green; no page errors.
- **Reporting:** worklog + register (SYS-POP-06/SYS-NAR-02 → INTEGRATED) + PR + screenshots.

### WP-7 — Evidence: the Clock Street demo *(WS-F)* — **EXECUTED 2026-11-07: probe-ms1-clock-street 16/16 + the PH-2 exit checklist; the human session + sign-off are owner variances (V-PH2-1/2)**
- **Task scope:** assemble the milestone evidence: the clock-day probe + money-trace probe joined into a single MS-1 demonstration run (build → serve dist → drive a roam afternoon → assert 07:40 platform occupancy → assert 22:00 deli close → assert ledger reconciliation → screenshots); run the full floor gates; run the 15–20-minute evaluation session in a browser (human box, logged with who/when); update the register and close Phase 2 or list variances.
- **Files owned:** `web-three/scripts/probe-ms1-clock-street.mjs` (new), register/worklog.
- **Must NOT modify:** product code (WS-F law).
- **Acceptance:** probe exit 0 with screenshot evidence; E2E + full suite green; the exit sentence demonstrated; register rows re-statused; PH-2 exit checklist signed or variances filed.
- **Reporting:** worklog + register + the demo artifacts (screenshots to `web-three/shots/` per house convention).

## 2. Parallelism map for this milestone

```
WP-0 (merge & ratify)          ── DONE 2026-11-06 (1bb3152)
WP-1v (pause-set gap)          ── DONE 2026-11-06 (0e22ff5) — pauseSet.ts + 11 cases + probe
WP-2v (DEC-1 + epoch mapping)  ── DONE 2026-11-06 (eab767c) — epochMap.ts + epochAgreement + probe
WP-4 (money bridge, Game.ts*)  ── DONE 2026-11-07 (3a9984d) — probe-money-trace byte-identical boots
WP-3v (ambient walkers, peds)  ── DONE 2026-11-06 (e3f1b02) — single-writer booking held
WP-5 (R2+R7, core seam)        ── DONE 2026-11-07 (b99c01f) — landed before WP-7 so the evidence consumes all
WP-6 (diary UI)                ── DONE 2026-11-07 (5ba16a3) — ink live, dateline through the one mapping
WP-7 (evidence assembly)       ── DONE 2026-11-07 (probe-ms1-clock-street 16/16 + PH-2 exit checklist)
```
*Game.ts is single-writer: WP-1v, WP-2v (wiring only) and WP-4 book successive windows with the Production Director; WP-3v books `peds.ts` separately. No two WPs hold the same file simultaneously — the governance law, not a preference.*

### 2b. Interim integration note — the next order (2026-11-06, Technical Integration Lead)

**Recommendation: A-1 (the navigation graph) first, WP-4 (D-3 money→ledger bridge) second; WP-6 may start immediately in parallel.** Reasoning, dependency-aware:

1. **WP-6 is unblocked NOW** and touches disjoint files (`ui/`, `style.css`) — it consumes the mapping this milestone just landed and delivers the player-facing date/diary. No conflict with either item below.
2. **A-1 before WP-4 for the critical path.** The ledger bridge is a bookkeeping integrity upgrade over money that already reconciles ($87→$112→$123, E2E-asserted) — nothing downstream is blocked on it today. The navigation graph, by contrast, gates THREE load-bearing successors: A-2 (doors/entrances consume the nav graph), WP-3v scale-out (ambient walkers are safe at two bodies, a defect at ten — the plan already says "recommended after A-1"), and physically believable NPC movement (straight-line goal-lerp is the known Phase-3 defect). The longer the block waits, the more walk-code lands against the wrong foundation.
3. **WP-4 remains small, bounded, and independent** (its own `moneyBridge.ts` + a booked Game.ts window) — it can slot into any WS-D gap or run in a parallel window; it does NOT need to preempt A-1. If a short, low-risk win is needed while A-1 is drafted (per the reconciliation report's §8 preview), WP-4 is that win.
4. **File-overlap check:** A-1 lives in the nav/registry layer (`sim/`, world-contract docs); WP-4 in `sim/moneyBridge.ts` + Game.ts's money-effect section; WP-6 in `ui/` — no shared files, so A-1 drafting and WP-4 may proceed in parallel windows with the usual single-writer bookings.
5. **Order to propose for the next milestone:** WP-6 (start now) → A-1 draft → A-1 land → WP-4 → WP-3v scale-out on the nav graph. **Nothing here begins without the owner's separate authorization** (the plan's own law, §3).

   *UPDATE 2026-11-06 (register v1.7.0): the nav critical path closed ahead of schedule — A-1 + A-2 landed and INTEGRATED (`b1df252`), and WP-3v's ambient migration landed the same day (`e3f1b02`), so the proposed order collapses to: **A-3 (registry geometry flip, DEC-4 — owner call) → WP-4 (money→ledger bridge) → WP-6** as the remaining sequenced work; WP-3v scale-out beyond the 12-walker roster (population growth, chokepoint capacity claims) rides WP-4's customer interiors. Nothing began without the owner's authorization: the integration + WP-3v were directed assignments (Phase 3 + WP-3v briefs).*

   *UPDATE 2026-11-06 (register v1.8.0): **WP-4 LANDED** on `feat/wp-4-money-bridge` @ `2203f05` (from main `dcff32c`, not yet merged) under the owner's "Continue working" — the next sequenced item; A-3 was skipped as owner-gated (DEC-4). The bridge is additive: zero GameState edits, the E2E's $87→$112→$123 math unchanged and green (probe-money-trace ALL PASSED — genesis → five faucets → $112, audit clean). Remaining order: **WP-6 (diary/date visible — unblocked, disjoint files) → A-3 (DEC-4, owner call)**. WP-3v scale-out beyond the 12-walker roster stays parked behind customer interiors + the owner's population call.*

   *UPDATE 2026-11-07 (register v1.9.0): **WP-6 LANDED + INTEGRATED** — `feat/wp-6-diary-date-visible` @ `16c3e73`, merged `5ba16a3` (same "Continue working" authorization class; A-3 still owner-gated). The Map renders the field diary as ink (folded leaf + tab, no new paper door — touch law untouched); the dateline renders through `datelineOfStoryDay` only ("September 9 · Year 1"); gates: tsc · vitest 927/927 (63 files) · build · probe-diary-ink 28/28 at 390×844 (console clean, shots) · 4-day E2E 0 failures (569 s). **Remaining order: A-3 (DEC-4, owner call) → WP-7 (evidence assembly — last, consumes the milestone); WP-5 (R2+R7) stays fully parallel (disjoint files).** Sketch.ts required no extension — the ink layer proved self-contained in `ui/diary.ts` + `style.css` (fewer touched files than the plan guessed; no structural change to the shipped two-page sheet).*
   *UPDATE 2026-11-07 (register v1.10.0): **WP-5 LANDED + INTEGRATED** — `feat/wp-5-consequence-choice` @ `94088ca`, merged `b99c01f` (same "Continue working" authorization class; the parallel WS-C track — disjoint files, landed BEFORE WP-7 so the milestone evidence consumes the whole milestone). `core/consequenceLedger.ts` (R2: append-only, promises with in-game due dates, omission maturation automatic + idempotent, determinism-from-save pinned) and `core/choiceNodes.ts` (R7: doc 10 §3's 17 nodes transcribed as frozen data, the no-fake-choices rule a validator, N2-FormC lock pinned); the save carries `ledger` as an optional trailing v1-safe field (doc 14 §3's `promises` layer realized INSIDE the ledger — a promise IS a LedgerEntry; variance documented). Gates: tsc · vitest **974/974** (65 files, +47) · build · 4-day E2E 0 failures (595 s) · probe-money-trace ALL PASSED post-merge. **Remaining order: A-3 (DEC-4, owner call) → WP-7 (evidence assembly — the milestone's last item); nothing else in the milestone remains.***

   *UPDATE 2026-11-07 (register v1.11.0): **WP-7 EXECUTED — the milestone's machine-side work is COMPLETE.** `scripts/probe-ms1-clock-street.mjs` (new, the WS-F law held: zero product code) joins the clock-day demonstration and the ledger reconciliation into ONE browser run of dist/ — the roam afternoon 07:40→22:05 at 300×: Idris stands the platform at 07:40 (claim `se-idris-platform`), the deli is routed at 21:58 and refuses routes at 22:00 (`PLACE_INACCESSIBLE`, the canon 06:00–22:00 hours), the dateline + diary leaf are readable on screen, genesis $87.00 audits clean before AND after, the story never moved — **ALL 16 CHECKS PASSED**, screenshots in `web-three/shots/ms1-*.png`. The floor gates re-ran green in the same battery (4-day E2E 0 failures 595 s · probe-money-trace · probe-world-sim 15/15 · probe-pause-set 11/11 · probe-nav 9/9 · perf-peds 27.1 µs/frame heap flat). **PH-2's exit checklist executed** — all twelve items checked with evidence; three variances filed: V-PH2-1 the three-lead sign-off (owner), V-PH2-2 the 15–20-minute human evaluation session (owner; every automated substitute green), V-PH2-3 branch-copy hygiene (push wave). **What remains is the owner's: the sign-off, the human playtest, the DEC-4 (A-3) call, the push.**

   *UPDATE 2026-11-07 (register v1.11.1): **THE PUSH WAVE EXECUTED — the milestone fully closed machine-side.** The owner's "Push" + "continue working" found origin/main advanced to `c950162` (the Sandflow/sand3D Alder Heights asset pack — 13 prop swaps + 1 add, evaluation docs + evidence) while the eleven WP-4/5/6/7 commits awaited the wave. **Integration merge `b2eb53b`** (no-ff, both histories preserved; the single conflict `worklog.md` resolved with BOTH sides verbatim); the integrated tree re-gated ALL GREEN (tsc · vitest **974/974** · build · probe-money-trace · probe-diary-ink · probe-ms1-clock-street · probe-world-sim 15/15 · probe-pause-set 11/11 · probe-integration 22 seams/0 errors/8 walks; probe-sandflow soft-pass with the swiftshader screenshot variance the pack's own worklog files). **Pushed non-force, per-ref MATCH:** `main` `c950162..b2eb53b` + three NEW remote branches (`feat/wp-4-money-bridge`, `feat/wp-5-consequence-choice`, `feat/wp-6-diary-date-visible`). **V-PH2-3 CLOSED** — the `feat/world-contract-foundation` local copy deleted during the wave (remote intact `407cc0e`, nothing unmerged). **The drafted next order — QUEUED FOR RATIFICATION, nothing begins without the owner's authorization:**
   1. **E-1 — the anchor catalogue** (wc-17 Phase-2 item 3; MS-2's content-catalogue half; non-owner-gated, unblocked): shipped anchors catalogued as `obj:` content entries; the first building-variant pack through `validateManifest` (`sim/content.ts` schema; the registry's 129-ID read side is live on main).
   2. **Chokepoint capacity claims** (A-2 remainder; measurement on the live graph): convert the register's honest "still open" notes into measured numbers at the shipped chokepoints (probe evidence + register rows).
   3. **R1/R8 — the rails engine** (WS-C, docs/narrative/14 §7 order — the machine the R2/R7 state has been waiting for; the ledger + choice nodes' scene integration lands here).
   4. **A-3 — the registry geometry flip (DEC-4, THE OWNER'S CALL)**: spec ready (building geometry loads from the registry at runtime, the fidelity gate re-pinned as the load test; the owner-gated visual bar: "identical skyline at the ledger budget"); blocked-by A-1/A-2 (DONE) + perf re-baseline (DONE) — unblocked pending the ruling.
   5. Parked behind owner calls: WP-3v scale-out beyond the 12-walker roster (the owner's population call, Phase 4), needs/mood dials (Phase 4), building-variant PACK expansion beyond the first pack (content waves).*

### 2c. A-1/A-2 status note (2026-11-06, Technical Architecture agent)

**A-1 (the navigation graph) and A-2 (building access) are LANDED on `feat/phase-3-navigation-building-access`** under the owner's Phase-3 assignment — see register v1.5.0 for the full gate evidence. What this changes in the order above: WP-3v's blocker ("the nav graph") is GONE — the ambient-walker migration can now route over `sim/nav` — and its single-writer booking on `peds.ts` stands. WP-4 (the money bridge) is untouched and still next-in-line for its WS-D window. **Not started here (unchanged scope): A-3 registry geometry flip (DEC-4, owner's call), E-1 content catalogue, chokepoint capacity claims.**

## 3. What must NOT begin during this milestone

- Nav-graph migration, registry geometry flip (Phase 3) — the merge (WP-0) first; A-1 drafts now (see the reconciliation report §8 preview), executes after Phase-2 close.
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
