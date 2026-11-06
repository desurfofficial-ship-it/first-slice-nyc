# PRODUCTION-RECONCILIATION-REPORT — R1

| | |
|---|---|
| Report | Production state reconciliation & phase-readiness audit, revision R1 |
| Author | Production Director (audit executed 2026-11-06) |
| Baseline inspected | `main` @ `96bc4eb` · `feat/world-contract-foundation` @ `407cc0e` (fetched live during this audit) |
| Method | Every claim below was verified against the actual commits, files, diffs and executed commands — no agent report is treated as proof. Executed evidence is marked **[executed]**; ledger-reported evidence is marked **[reported]**. |
| Verdict | **B — CONDITIONALLY READY** (§10) |

---

## 1. Repository baseline & commit comparison

### 1.1 Remote state (verified live)

| Ref | Tip | Contains | CI |
|---|---|---|---|
| `main` | `96bc4eb` | the production documentation commit ✅ | deploy-pages: **success** (push run 2026-11-06T02:54Z) **[executed via API]** |
| `feat/world-contract-foundation` | `407cc0e` | `407cc0e` is the tip ✅ | **no CI lane** — the repo's single workflow (`.github/workflows/deploy-pages.yml`) triggers on `push` to `main` only; branch gates run locally by policy |
| `feat/player-upgrade` | `0530ebc` | 3 unique commits (sprint/drag/zoom); equivalent content landed on main via `a9718e9`/`69f8327`; its permanent guard (`tests/player-upgrades.test.ts`) exists on main | superseded — retire per WP-0 |

### 1.2 Divergence math **[executed]**

- Merge base: `447b0e1` (narrative bible).
- `main` is **9 commits ahead** of the base; the branch is **3 commits ahead**. The branch is **diverged**, not simply behind — a merge is required, not a fast-forward.

### 1.3 The branch's three commits

| Commit | Content | Verified |
|---|---|---|
| `3d83f0b` | wc-Phase-0 foundations: 12 sim modules (`ids, rng, clock, registry, entities, schedule, arbitration, narrative, economy, content, state, reference`), 10 sim test files, docs-hygiene re-point; suite 605→718 | gates re-executed below |
| `627e87d` | the 17 world-contract documents + AGENTS.md contract pointer | files present on branch |
| `407cc0e` | wc-Phase-1 runtime integration: `sim/runtime.ts` (D-1 valve, 683 lines), `game/worldRuntime.ts` (executor body, 401), `game/scenario.ts` (playable proof, 268), `Game.ts` wiring (+71), `interactionDefs.ts` (+30), `probe-world-sim.mjs`, `sim-runtime.test.ts` (+26 tests, suite 718→744) | gates re-executed below |

### 1.4 Numbering reconciliation (one-roadmap law)

The world-contract ladder and the master production roadmap number phases differently. The binding mapping (MASTER-GAME-ROADMAP.md is the one authority):

| World contract (wc-17) | Production roadmap | State |
|---|---|---|
| Phase 0 — foundations | **Phase 1** — architecture & sim foundation | implemented on branch (`3d83f0b`, `627e87d`) |
| Phase 1 — time valve & living street | **Phase 2** — runtime integration | **implemented on branch** (`407cc0e`); D-3 explicitly open |
| Phase 2 — places that mean things | **Phase 3** — navigation & physical world | not started (queued next) |

The mission's premise "the Architecture Agent implemented Phase 1 and Phase 2 … with Phase 2 commit 407cc0e" is therefore **confirmed in production numbering**: both phases exist on the branch tip; `407cc0e` is the wc-Phase-1 / production-Phase-2 integration.

---

## 2. Actual architecture implementation status

The twelve systems requested, with the strict vocabulary. Nothing is VERIFIED below without executed runtime evidence; unit tests alone never upgrade a row.

| # | System | Status (on branch) | Evidence |
|---|---|---|---|
| 1 | Simulation clock & in-game time progression | **VERIFIED** | `sim/clock.ts` `GameClock` (tick = (day−1)·1440+minute; 07:40 default; never rewinds). Probe ran **1,424 simulated minutes across day boundaries**; sim-clock unit tests green in my run. Epoch = DEC-1 (§4). |
| 2 | Runtime tick valve & fractional carry | **VERIFIED** | `sim/runtime.ts` `advanceReal`: one accumulator, whole-minute flush, fractional carry, host-owned pause set. Fed from `Game.frame` (diff verified). Probe step 7 + all steps ran at accelerated time through it. |
| 3 | NPC schedules & schedule transitions | **INTEGRATED** (bound cast) | Rosa + Idris live clock-keyed schedules through the arbitrator inside the real game; Eddie/Kev/Priya resolve in state with no bodies; Deon abstract. Probe steps 1–2 PASS (follows activity; transition fires on the clock). Ambient Yuka walkers keep the M4 shift system — their migration is open (§7). |
| 4 | Behavior arbitration & interruption | **INTEGRATED** (bound cast) | `sim/arbitration.ts` (priority matrix, S1–S7 conflict scenarios). The R6 "hello" is a HIGH claim through the **real interaction registry** (`interactionDefs.ts` `simHellos`); walking away releases the claim and resumes the interrupted activity off the LIFO stack. Probe steps 3–4 PASS. |
| 5 | NPC state ↔ physical-world location sync | **INTEGRATED** (2 bodies) | `NpcState.location` live writes; `worldSimBody` position provider feeds the shipped proximity/interaction system; executor lerps rigs toward directive targets with spawn-snap/away laws. Probe step 5 PASS (relationship + world-state change persists). **Limitation:** motion is straight-line goal-lerp — no obstacle avoidance. A-1 (nav graph) is load-bearing before the bound cast grows (§6, §7). |
| 6 | Narrative event infrastructure | **IMPLEMENTED** (state layer) | `sim/narrative.ts`: `validateEvent`, `EventWindow`, `MissableWindow`, `AvailabilityRegistry`, fallback actions; sim-narrative tests green. Not yet driven by live story beats (R6 scheduler is a later milestone) — correct per the §7 build order. |
| 7 | Economy ledger foundations | **IMPLEMENTED** | `sim/economy.ts`: append-only ledger, integer cents, faucet/sink flow classes, audit; reference ledger script. **D-3** (`Effect('money')` → ledger) is deliberately **OPEN** — recorded in wc-17's own ledger. |
| 8 | World state persistence & save/load recovery | **VERIFIED** | `first_slice_world_v1` rides beside the story save (never inside it); roam autosave (30 s) + day boundaries + story persist beats. Probe 6a–6e + 6g PASS: truncated/wrong-magic/future-version/foreign/garbage inputs each degrade to a fresh world with notes; repeated loads idempotent; multi-day continuity after load. |
| 9 | Semantic registry & content registration | **INTEGRATED** (read side) | `sim/registry.ts` typed `WorldRegistry` over `docs/data/world-registry.json` (129 IDs cross-ref validated); **consumed by the live runtime** — `worldRuntime` boots the place resolver from it. `sim/content.ts` manifest schema + ABO bridge. The write-side flip (geometry loads from registry at runtime, A-3) is Phase 3. |
| 10 | Runtime bridge into the actual game | **VERIFIED** | `WorldRuntime` constructed once in `Game`'s constructor; `Game.frame` feeds the valve (full dt; presentation's 0.45× listen beat excluded by design); `applySimPhase` re-keys dusk + the M4 street plan to the clock in roam/scenario only; `persist()`/`onStoryDayBegin()` hooks verified in diff. Story mode: the sim computes but never owns a body a story beat holds. |
| 11 | Scenario / playable proof | **VERIFIED** | `?scenario=schedules` auto-drives all six required demonstrations on the real street. **My executed run: 15/15 PASS, 1,424 sim-minutes in 64.5 s real, exit 0, zero page errors** against the built `dist/`. |
| 12 | Existing story choreography compatibility | **VERIFIED** (probe scope) | Probe setup "the story is untouched" PASS; roam gate returns bodies to authored choreography on exit; story days keep every authored trigger. The 4-day E2E is **[reported]** green by the branch ledger (534–591 s) and was **not re-executed in this audit** — it is a required gate of WP-0 before merge. |

**Answer to the critical instruction:** the older audit's finding ("no runtime tick valve, no schedule integration") was captured at the branch's earlier tip `627e87d` — the snapshot matching its recorded "2 ahead / 7 behind". At that moment the finding was **true**: `sim/runtime.ts`, `worldRuntime.ts` and the `Game.ts` wiring did not exist. `407cc0e` (01:24Z) landed afterwards. The audit was a snapshot mismatch, not an error; the register, not the audit, needed correcting — and §5 corrects it. **No agent is authorized to rebuild any of the twelve systems above.**

---

## 3. Phase 1 & Phase 2 verification results (executed in this audit)

Worktree at `407cc0e`, dependencies hard-linked, all commands run fresh:

| Gate | Command | Result **[executed]** |
|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | **clean** |
| Unit suite | `npm test` (vitest) | **744/744 passed, 52 files, 8.41 s** |
| Production build | `npm run build` | **OK** (dist emitted) |
| Playable runtime proof | `node scripts/probe-world-sim.mjs` (boots `dist/`, chromium, `?scenario=schedules&worldclock=120`) | **15/15 PASS, exit 0, no page errors** — steps: fresh world · scenario mode · story untouched · scheduled activity · clock transition · HIGH interruption (R1/R6) · post-interruption behavior · persistent relationship/world change · save on own key · truncated save → fresh + notes · restore after load · invalid data → fresh, never crash · idempotent reload · clock-keyed dusk (visuals + street plan) · multi-day continuity |
| 4-day story E2E | — | **[reported]** green on branch; **not re-executed here** (≈10 min beat-driven run; no pace knob exists). Required again at the WP-0 merge gate. |
| Merge conflict scan | `git merge-tree --write-tree` (read-only) **[executed]** | exactly **3 conflicted files**: `AGENTS.md`, `web-three/tests/docs-hygiene.test.ts`, `worklog.md`. `Game.ts` auto-merges cleanly against the shops-pass changes. |

**Merge detail that matters (new finding):** the branch's `docs-hygiene.test.ts` is a second, independent R0 re-point of the same test main already re-pointed. Its case 2 still asserts `AGENTS.md` contains `51-open-bugs-for-agents.md` and `50-agent2-first-session-world.md` — pointers main's reboot removed. A naive merge would land **2 failing assertions**. Resolution (mechanical, both intents preserved): take main's version of the file and add the branch's stronger README assertions (`/Baseline v\d+\.\d+, 2026-\d\d-\d\d/`, `/Lead Narrative Director/`, `docs/data/world-registry.json`) — main's `docs/narrative/00-README.md` already satisfies all three **[verified]**, and main's AGENTS.md satisfies main's cases **[CI-green on `96bc4eb`]**. Recorded as DEF-3 in the register.

---

## 4. DEC-1 — the calendar-epoch conflict (decision brief, UNRESOLVED)

### 4.1 The facts (code and canon, both read in this audit)

| Source | Epoch | Authority it cites |
|---|---|---|
| `web-three/src/core/calendar.ts` (main, **playable game**) | `CAL_EPOCH = { y:1, m:10, d:1 }` — Day 1 = **October 1, Y1** | narrative/12 §5 — C0's mood-lock "October, golden hour, forever" |
| `web-three/src/sim/clock.ts` (branch, **sim runtime**) | `EPOCH = { year:1, month:9, dayOfMonth:9, weekday:'Tue' }` — Day 1 = **Tuesday, September 9, Y1** | narrative/12 §1 — the timeline table |
| Narrative canon (main) | **"Y1, Sept 9 (Tuesday) — Arrival. Chapter 0 begins"** (doc 12 L34); C0 = **Sept 9–15, Y1** (docs 12 L40, 06 L17/33); Day 1 = "Tuesday, Sept 9, Y1" (doc 11 L21); protagonist arrives Sept 9 (docs 02, 15) | the timeline table |

Both code modules cite the **same document** for opposite epochs: calendar.ts anchored to the mood-lock's month, clock.ts anchored to the timeline's date. The two epochs are **22 days apart** with a weekday divergence (Sept 9 = Tuesday; Oct 1 = Wednesday by the sim's own weekday math).

### 4.2 What actually runs where today

- The **playable game on main** renders dates from `core/calendar.ts` (field-diary datelines via `fieldDiary.ts`; `calendar_day` rides Save v1 tracking the story day). Days 1–4 render as October 1–4.
- The **sim on the branch** runs the Sept-9 epoch and drives schedules/dusk/phases by minutes-of-day.
- The bridge already aligns the **day counters 1:1**: `WorldRuntime.onStoryDayBegin(n)` maps story day N → sim day N at 07:40, one-way, never rewinding. So the conflict is **not** two clocks fighting over time — it is **one day counter rendered through two different calendars**.
- Consequence if merged as-is: no crash and no schedule breakage (schedules speak minutes), but the moment any sim date reaches the player (or season logic crosses epochs) the world shows two contradictory dates. Today the sim's `dateString` is debug/scenario-only, so the defect is **latent**, not live.

### 4.3 Dependency map

| Consumer | Reads | Breaks if epoch flips? |
|---|---|---|
| `core/Save.ts` (story save v1, `calendar_day`) | calendar epoch | yes — semantic shift of an existing field; shipped saves re-render dates |
| `core/fieldDiary.ts`, diary/calendar tests | calendar epoch + format law | yes — datelines and pinned date assertions |
| Sim schedules, arbitration, dusk phases | minutes-of-day only | **no** (epoch-agnostic) |
| Economy ledger ordering | sim tick (monotone minutes) | **no** |
| Seasons (calendar.ts `seasonOf` vs clock.ts `seasonOf`) | month of the epoch | both return autumn at C0; divergence only matters in later months |
| Story events / chapters | narrative dates (canon: Sept 9–15) | canon-compliant only under the Sept-9 rendering |

### 4.4 Options

- **A (recommended default): sim clock is world truth at the Sept-9 epoch; the story calendar becomes a derived view; the October golden-hour mood-lock survives as presentation, not as a date.** Change `CAL_EPOCH` to Sept 9; extend the calendar tests; accept that pre-merge saves re-render their datelines (acceptable pre-1.0; record a save-migration note); pin one mapping test (story day ↔ sim day ↔ displayed date). Canon (docs 06/11/12/15) needs **zero edits**.
- **B: calendar is truth (Oct 1).** Requires re-canonicalizing the arrival week in narrative/06/11/12/15 — a canon rewrite, explicitly out of bounds for this audit and expensive for the bible's owners. Rejected unless the owner re-canonicalizes deliberately.
- **C: dual calendar (editorial "October light on September dates").** Two sources of truth; violates the one-clock ownership law; rejected.

### 4.5 Ruling status

**UNRESOLVED — owner gate.** Per the mission and the risks doc, nothing in this audit changed either epoch, and no ruling is recorded as made. DEC-1 keeps its owner (Narrative Director + lead engineering, per the register) and its default (Option A) for the day the owner ratifies. WP-2 cannot close before the ruling.

---

## 5. Corrected production status register (audit trail)

The register (v1.0 → **v1.1**, same commit law) was corrected only where executed evidence demanded it. Full row edits live in `PRODUCTION-STATUS-REGISTER.md`; the changes:

| Row | Was | Now | Evidence | Why |
|---|---|---|---|---|
| PH-2 Runtime integration (time valve) | PLANNED | **IMPLEMENTED (branch) — verified; acceptance = merge** | §2 rows 1–2, §3 probe | the D-1 valve exists, is wired, and passed the executed probe |
| MS-1 The Clock Street | PLANNED | **IMPLEMENTED (branch)** — MS-1 closeout (human playtest + ledger/money trace) still owed | §3 | the wc-17 exit sentence is demonstrably met on the branch except the D-3 money trace |
| BR-1 main | pinned `69f8327` | **`96bc4eb`**, CI success | API check | production docs landed and are green |
| BR-2 world-contract branch | "2 ahead / 7 behind; 1 known conflict" | **3 ahead / 9 behind; suite 744/744; three conflicts (AGENTS.md, docs-hygiene.test.ts, worklog.md)** | merge-tree scan | branch advanced; second R0 re-point discovered |
| BR-5 docs/production-roadmap | ACTIVE | **MERGED** (as `96bc4eb`); local branch deletable | remote heads | the docs branch's content is on main |
| SYS-POP-02 Schedules | IMPLEMENTED (branch) | **INTEGRATED (branch, bound cast)** | probe steps 1–2 | schedules now run inside the real game |
| SYS-POP-03 Arbitration | IMPLEMENTED (branch) | **INTEGRATED (branch, bound cast; R6 door live)** | probe steps 3–4 | the one door + LIFO resume work in the shipped interaction registry |
| SYS-POP-11 Persistent sim state | IMPLEMENTED (world save, branch) | **INTEGRATED + VERIFIED (branch)** | probe 6a–6g | save rides real persist beats; corruption paths proven in-browser |
| SYS-NAR-10 Sim↔story integration | IMPLEMENTED (contract layer) | **INTEGRATED (branch)** | wiring diff + probe | one-way bridge operates in the live frame |
| SYS-WORLD-01 Spatial registry | "runtime flip not started" | evidence updated: **read-side consumed by the live runtime**; flip (A-3) still Phase 3 | `worldRuntime` boot path | registry is no longer a headless module |
| SYS-ECO-09 Time progression | PARTIAL — DEC-1 | unchanged status; **evidence sharpened** (both epochs quoted; counters aligned; defect latent) | §4 | precision for the owner's ruling |
| SYS-QA-09 Testing | "660 tests" | **main 660/660 · branch 744/744** | executed runs | both numbers true, both recorded |
| NEW DEF-3 | — | **hygiene-test divergence** (2 assertions would fail on a naive merge) | §3 | prevents a broken merge |
| §F Change log | v1.0 | **v1.1 reconciliation row** | this report | the same-commit law |

Nothing was re-statused without evidence; no VERIFIED was granted on unit tests alone anywhere.

---

## 6. Outstanding risks & dependencies (delta from the risks doc)

1. **DEC-1 unresolved (owner gate)** — blocks WP-2 close and any player-visible sim date surface. Default documented; not applied.
2. **The merge is mechanical but not zero-risk** — three conflicted files; the hygiene test needs the union resolution (DEF-3); Game.ts auto-merges **[verified]**. The 4-day E2E must re-run at the gate **[reported-only here]**.
3. **D-3 money→ledger bridge open** — the last wc-Phase-1 item; until it lands, "every dollar traceable" (MS-1's bar) is unmet.
4. **Bound-cast locomotion is goal-lerp** — straight-line walks with no obstacle avoidance. Safe at two bodies on the shipped street; a scaling defect. **A-1 (nav graph) must land before the bound cast grows.**
5. **Pause-set gap (new, small):** `Game.frame`'s pause set covers arrival, day-fade, name box, order card, starter card — the wardrobe and postcard surfaces named in the original WP-1 are not in the set. Verify and close at merge (WP-1v); cosmetic at today's time scales, but it is the class of bug that truncates a beat silently.
6. **No CI lane on branches** — policy risk, unchanged; the branch's gates ran locally (and here). A PR-lane workflow is a Phase-3+ governance improvement (DEC-9-adjacent), not a blocker.
7. **`feat/player-upgrade` retirement owed** — guard test confirmed on main; branch deletion with a register note remains WP-0 work.
8. **Performance re-baseline owed post-merge** — the valve now exists, so the wc-deferred "sim perf gates at scale" become measurable; probe-perf + census gate must re-run on the merged tree before Phase-3 WPs touch the frame.

---

## 7. Recommended next phase

**"Phase 2-close → Phase 3-open": land the verified runtime, close the epoch and money decisions, then make places physically meaningful.**

- **Objective.** (a) Merge `feat/world-contract-foundation` into main with green gates (WP-0); (b) close production-Phase-2's remainders — DEC-1 ruling + pinned epoch mapping (WP-2v), the D-3 money bridge (WP-4), the pause-set gap (WP-1v); (c) draft and start production-Phase-3 — **A-1 registry-seeded navigation graph**, **A-2 door/entrance/stair resources**, **E-1 anchor cataloguing**, **A-3 registry geometry flip**, plus the **ambient-walker schedule migration** (the declared "next B milestone").
- **Why next.** The twelve systems are verified on the branch; everything now compounds on an unmerged tree (re-work risk grows daily). The two open decisions (DEC-1, D-3) are the only blockers to calling the runtime integration done. And the verified limitation (goal-lerp bodies) plus wc-17's own ladder both point at A-1 as the highest-leverage next build: it converts the sim's *state* movement into *physical* movement, unlocks arbitration capacity at chokepoints (A-2), and is the prerequisite for growing the population beyond two bound bodies.
- **Systems included:** merge & ratification; epoch ruling + mapping; money bridge; pause-set; nav graph; door/stair resources; anchor content entries; registry flip (behind a fidelity gate); ambient walker migration; evidence assembly (MS-1 closeout).
- **Systems explicitly excluded:** needs/mood dials and population growth (Phase 4); C0+ content, rails, chapters (Phase 7 waves); business P&L, seasons, missable windows (Phase 6); borough/city expansion (**owner-gated** — Alder Heights remains the only authorized environment); any new dependency; any engine swap.
- **Dependencies:** owner ruling on DEC-1 (before WP-2v close); merge before all Phase-3 WPs; A-1 before A-3's flip is player-visible; D-3 before MS-1 closeout.
- **Acceptance (phase level):** merged main green (`tsc` · vitest ≥744 · build · 4-day E2E · docs-hygiene); the MS-1 Clock Street demo recorded (Idris at the platform at 07:40, deli closed 22:00, dusk by clock, **ledger reconciliation of $87→$112→$123**); DEC-1 recorded in narrative/15 §2 by its owner; a bound NPC walks A-1's graph around an obstacle (no clip) to a schedule destination through an A-2 door; probe-perf + census re-baselined with no rig above its ledger row; world save round-trips through all of it.
- **Playable demonstration:** MS-1 closeout session (the 15–20-minute evaluation bar already written into the plan) + a new clock-day probe asserting graph-walks and door transitions.
- **Save/load:** `first_slice_world_v1` + story save dual-key round-trip; corrupted/foreign inputs degrade fresh (already proven — keep the guards green).
- **Visual verification:** probe screenshots (house convention `web-three/shots/`) for the dusk flip, graph-walk paths, door/stair use.

---

## 8. Next-phase work packages (revised set)

Unchanged packages keep their full definitions in NEXT-PHASE-EXECUTION-PLAN.md (WP-4, WP-5, WP-6, WP-7). Revised or new packages, with the ten required fields:

### WP-0 (revised) — Baseline ratification, merge & hygiene
1. **ID:** WP-0 · **2. Objective:** ratify the baseline; merge the verified branch; close BR-2/BR-3/BR-5.
2. **Files/systems:** git branch ops; `AGENTS.md` (keep main's reboot text + append the branch's WORLD-CONTRACT block and repo-map lines); `web-three/tests/docs-hygiene.test.ts` (union resolution per §3); `worklog.md` (append both ledgers' rows); wc-17 status table; register/worklog.
3. **Dependencies:** none (everything waits). 4. **Exclusions:** any `src/` file other than the named test; any narrative doc; any gameplay behavior change at merge.
5. **Deliverables:** merged main; contract docs reachable; branch retired; register v1.1 rows closed.
6. **Acceptance:** `tsc` clean · vitest (main 660 + sim additions, dedup noted — expect 744) · build · **4-day E2E re-run** · docs-hygiene green on the merged tree; probe-world-sim re-run green.
7. **Tests:** the full suite; the hygiene union must pass both sides' assertions.
8. **Integration:** probe-perf rows byte-identical (branch touches no game code — verify, don't assume); `first_slice_world_v1` present in sim-state tests.
9. **Evidence:** gate output attached to the merge commit; worklog entry naming every inheriting workstream.
10. **Owner:** Production Director (integration owner) — single-writer.

### WP-1v (new, small) — Pause-set gap close *(WS-D)*
1. **ID:** WP-1v · 2. **Objective:** wardrobe + postcard surfaces join the valve's host pause set (or are proven safe to omit with a test).
3. **Files:** the pause expression in `Game.frame`; `tests/sim-runtime.test.ts` additions. 4. **Depends:** WP-0. 5. **Excludes:** valve internals, any other Game.ts section. 6. **Deliverable:** pause rules complete vs the original WP-1 list.
7. **Acceptance:** a held beat is never truncated by a tick boundary in test. 8. **Tests:** valve pause cases. 9. **Integration:** none visible. 10. **Evidence:** test output + worklog row.

### WP-2v (revised) — DEC-1 ruling & the epoch mapping *(WS-D + Narrative Director + owner)*
1. **ID:** WP-2v · 2. **Objective:** owner rules DEC-1; the ruling is recorded; one mapping function + pinned test reconcile story day ↔ sim day ↔ displayed date; calendar renders the ruled epoch.
3. **Files:** `docs/narrative/15` §2 (the ruling entry, by the Narrative Director); `core/calendar.ts` epoch (only per the ruling); `sim/epochMap.ts` (new); `tests/` for both. 4. **Depends:** owner ruling; WP-0. 5. **Excludes:** sim/clock internals, narrative content beyond the ruling entry, Save schema. 6. **Deliverables:** ruling recorded; mapping pinned; back-compat note for pre-merge saves.
7. **Acceptance:** no real-world dates anywhere; displayed dates consistent across diary/HUD/debug at every pinned test day; old saves parse (re-rendered dates documented). 8. **Tests:** mapping test; calendar tests extended; suite green. 9. **Integration:** fieldDiary + worldRuntime debug read through the one mapping. 10. **Evidence:** worklog quotes the ruling; register DEC-1 → CLOSED.

### WP-3v (revised) — Ambient walker schedule migration *(WS-B)*
1. **ID:** WP-3v · 2. **Objective:** migrate ambient Yuka pedestrians off the M4 story-phase shift system onto clock-keyed schedules through arbitration (the wc-17 "next B milestone"), destination plumbing via `peds.ts`.
3. **Files:** `sim/lifeBindings.ts` (new), `world/peds.ts` (destination plumbing only), `tests/sim-clockday.test.ts` (new). 4. **Depends:** WP-0; A-1 recommended before scale-out (booking: single-writer on peds.ts). 5. **Excludes:** arbitration/schedule internals; story steps in GameState; dressing tables. 6. **Deliverables:** clock-keyed street life in roam; `probe-clock-day.mjs`.
7. **Acceptance:** occupancy assertions at pinned times; crowd/solidity/shuffle guards green; zero new `step ===` dependencies. 8. **Tests:** sim-clockday + all movement guards + soak probe. 9. **Integration:** peds.ts single-writer window booked with the Production Director. 10. **Evidence:** probe screenshots + register rows.

### WP-4 (unchanged) — D-3 money→ledger bridge *(WS-D)* — see the plan; now the **last open wc-Phase-1 item**.
### WP-5 (unchanged) — R2 + R7 state machines *(WS-C, fully parallel)*.
### WP-6 (unchanged) — diary/date visibility *(WS-C + WS-E; consumes WP-2v's mapping)*.
### WP-7 (revised) — MS-1 evidence closeout *(WS-F)*: as written, plus the D-3 ledger trace and the post-merge probe-perf/census re-baseline.

### Phase-3 preview (draft now, ratified at Phase-2 close — do not start before WP-0)
- **WP-A1 — Registry-seeded navigation graph (A-1)** *(WS-A; consumer WS-B)*: nodes/edges/chokepoints seeded from `RegistryEntrance`/`RegistryCrosswalk`/`RegistryPedRoute` (the schema already exists); sim bodies walk the graph (no goal-lerp); crowd tests stay green. Acceptance: a bound NPC reaches a schedule destination around an obstacle without clipping; graph build is deterministic from the registry; perf within the ledger. **Blocked by:** WP-0. **Blocks:** WP-A3, bound-cast growth, WP-3v scale-out.
- **WP-A2 — Door/entrance/stair resources (A-2)** *(WS-A)*: `door:KTN-05`-style resources mapped; arbitration capacity live at shipped chokepoints; the stair law tests extended. **Blocked by:** WP-A1 (graph topology).
- **WP-A3 — Registry geometry flip (A-3)** *(WS-A + WS-F)*: building geometry loads from the registry at runtime behind the fidelity gate re-pinned as the load test. **Blocked by:** WP-A1/A2 + perf re-baseline. **Owner-gated visual bar:** identical skyline at the ledger budget.

---

## 9. Agent assignment & integration plan

- **Single-writer law (unchanged):** `Game.ts` is booked in windows — WP-1v and WP-4 hold successive windows; nobody else touches it. `sim/` internals: `runtime.ts`/`state.ts` WS-D-only; `peds.ts` WS-B-only during WP-3v; `sim/arbitration.ts`/`schedule.ts` frozen (consumed, not modified).
- **Integration owner:** Production Director (merge, booking, register); WS-F owns gates and evidence.
- **Parallelism:** after WP-0 — WP-2v ∥ WP-4 ∥ WP-5 (disjoint files); WP-6 after WP-2v; WP-3v after WP-0 (booking peds.ts), scale-out after WP-A1; Phase-3 WPs draft in parallel, execute after Phase-2 close.
- **Dependency discipline:** no agent starts WP-6 before the ruling lands; no bound-cast growth before WP-A1; no Phase-3 build before the Phase-2 exit checklist closes.
- **Conflict avoidance:** the branch's docs-hygiene divergence (DEF-3) is the cautionary tale — two agents re-pointed the same guard independently. All future doc-law edits route through the register first.

---

## 10. Final readiness recommendation

**B — CONDITIONALLY READY.**

The foundations are real, verified, and impressively disciplined: both production Phases 1–2 exist on the branch with executed proof (**744/744 · tsc clean · build OK · 15/15 playable probe**), the story is untouched, and the older audit's discrepancy is fully explained as a snapshot mismatch — no rebuild is authorized or needed. But three conditions hold before work packages can be assigned at scale:

1. **The owner rules DEC-1** (the decision brief in §4 is ready; the default is documented; the audit changed nothing unilaterally).
2. **WP-0 lands**: the merge with the three mechanical conflicts resolved (incl. the hygiene-test union — DEF-3), the 4-day E2E re-executed at the gate, and the perf re-baseline on the merged tree.
3. **Phase-2's remainders close**: D-3 (money bridge), WP-1v (pause gap), and the MS-1 closeout session.

The moment those three land, the project is **A — READY** for production-Phase-3 (A-1 nav graph and friends) with the work packages above.

---

### Appendix — evidence log (executed during this audit)

| # | Command / source | Result |
|---|---|---|
| E1 | `git fetch origin --prune` + `git ls-remote --heads` | main `96bc4eb`; wcf `407cc0e`; player-upgrade `0530ebc` |
| E2 | `git rev-list --left-right --count` + `merge-base` | 9/3 diverged, base `447b0e1` |
| E3 | `git show --stat` ×3 | commit inventories as §1.3 |
| E4 | GitHub Actions API (authenticated) | 161 runs; `96bc4eb` push → **success**; no branch runs |
| E5 | worktree @ `407cc0e` + hard-linked `node_modules` (package-lock identical **[diff empty]**) | clean basis |
| E6 | `npm run typecheck` | clean |
| E7 | `npm test` | **744/744, 52 files, 8.41 s** |
| E8 | `npm run build` | OK (507 ms) |
| E9 | `node scripts/probe-world-sim.mjs` | **15/15 PASS, 1,424 sim-min / 64.5 s, exit 0** |
| E10 | `git merge-tree --write-tree` (read-only) | 3 conflicts; Game.ts auto-merges |
| E11 | diff of `Game.ts` / `interactionDefs.ts` @ `407cc0e` | wiring as §2 rows 2/4/5/10 |
| E12 | reads: `sim/clock.ts`, `game/worldRuntime.ts`, `core/calendar.ts`, hygiene tests, narrative canon greps | §2/§3/§4 content |
| E13 | `git merge-base --is-ancestor` player-upgrade | not contained; superseded classification upheld (guard test on main) |

*Not executed here, recorded as reported: the 4-day story E2E on the branch (≈10 min; re-run is a WP-0 gate) and any device/low-end hardware pass (Phase-10 human box, unchanged).*
