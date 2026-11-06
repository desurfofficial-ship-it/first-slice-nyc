# PRODUCTION-STATUS-REGISTER — FIRST SLICE

| | |
|---|---|
| Status | **Live document** — the single source of day-to-day truth |
| Owner | Production Director (keeper) · every workstream updates its own rows |
| Update law | Update the register **in the same commit** as the work it describes. An unrecorded change is a change the next agent must rediscover the hard way. |
| Vocabulary | NOT STARTED / PLANNED / IN PROGRESS / IMPLEMENTED / INTEGRATED / VERIFIED / BLOCKED ([README.md](README.md)) |
| Baseline | v1.0, 2026-11-06 — full repository audit at git `69f8327` (main), `feat/world-contract-foundation`, `feat/player-upgrade` |
| Reconciled | **v1.1, 2026-11-06** — reconciliation audit R1 at git `96bc4eb` (main) / `407cc0e` (branch); every correction evidenced in [PRODUCTION-RECONCILIATION-REPORT.md](PRODUCTION-RECONCILIATION-REPORT.md) |

**A completed document is not proof of implementation. Passing unit tests alone is not proof of playable integration.** Statuses here say which one they mean, and the Evidence column is the proof.

---

## 0. Dashboard (2026-11-06)

| Count | Value |
|---|---|
| Phases | 0 (closing) · 1+2 (**MERGED to main, WP-0, 2026-11-06** — gates executed) · 3 (next, planned) · 4–12 (planned) |
| Systems tracked | 48 — VERIFIED 17 · IMPLEMENTED 5 · INTEGRATED/partial 13 · PLANNED 9 · NOT STARTED 4 |
| Narrative requirements | R0/R3/R4 done (state only) · R2/R7 next · R1/R5/R6/R8–R15 not started |
| Open decisions | DEC-2…DEC-11 (**DEC-1 RULED 2026-11-06** — see [PRODUCTION-RISKS-AND-DEPENDENCIES.md](PRODUCTION-RISKS-AND-DEPENDENCIES.md)) |
| Open defects | B13 (draw calls, owner's call) + hygiene item HYG-1 |
| Gates | main `1bb3152` (WP-0): `tsc` clean · **vitest 801/801 (56 files)** · **probe-world-sim 15/15 [executed]** · **4-day E2E 0 failures [executed, 592 s]** · perf re-baseline recorded (drawCalls 119/184/256) · branch `407cc0e`: 744/744 [re-executed 2026-11-06] · branch `feat/wp-2v-epoch-map` (WP-2v): `tsc` clean · **vitest 830/830 (57 files)** · probe-world-sim **15/15 [executed]** · **4-day E2E 0 failures [executed, 531 s]** |

---

## A. Phases & milestones

| ID | Item | Phase | Status | Evidence / notes |
|---|---|---|---|---|
| PH-0 | Production control & baseline | 0 | IN PROGRESS | The seven docs + this register (this commit); owner ratification open |
| PH-1 | Architecture & sim foundation | 1 | IMPLEMENTED | Branch `feat/world-contract-foundation`: foundations `3d83f0b` (718/718 at its pass); whole-branch suite **744/744 [executed]**; acceptance = merge |
| PH-2 | Runtime integration (time valve) | 2 | IMPLEMENTED (branch) — VERIFIED | `407cc0e`: D-1 valve in `Game.frame`, bound-cast schedules, world save, `?scenario=schedules` **15/15 [executed]**; D-3 open; acceptance = merge (WP-0) |
| PH-3 | Navigation & physical world | 3 | PLANNED | wc-17 Phase 2 |
| PH-4 | Living population | 4 | PLANNED | wc-17 Phase 4 + R5 |
| PH-5 | Player freedom completion | 5 | PLANNED | R10–R12; much already shipped (see SYS-PLAY-*) |
| PH-6 | Living neighborhood | 6 | PLANNED | wc-17 Phase 4 (business/season) + R6 |
| PH-7 | Narrative integration | 7 | PLANNED | machines from PH-2; waves per narrative/14 §7 |
| PH-8 | City production & expansion | 8 | PLANNED (owner-gated) | DEC-8 |
| PH-9 | Content & feature complete | 9 | NOT STARTED | — |
| PH-10 | Alpha | 10 | NOT STARTED | device access = owner dependency |
| PH-11 | Beta & RC | 11 | NOT STARTED | — |
| PH-12 | Launch & post-launch | 12 | NOT STARTED | — |
| MS-0 | The Shipped Slice | — | VERIFIED (repo evidence) | E2E ~131 checks; probes; 660 tests; Pages deploy. Human/device halves owed at PH-10 |
| MS-1 | The Clock Street | 2 | IMPLEMENTED (branch) | wc-17 exit met on branch except the D-3 ledger trace + the human playtest (closeout = WP-4/WP-7) |
| MS-2 | The World Reads the Registry | 3 | PLANNED | — |
| MS-3 | The Block Has People | 4 | PLANNED | — |
| MS-4 | C0 Fires | 7 | PLANNED | — |
| MS-5 | The Spine Playable | 7 | PLANNED | — |
| MS-6 | Alder Heights Complete | 8 | PLANNED | — |
| MS-7 | Content & Feature Complete | 9 | NOT STARTED | — |
| MS-8 | Alpha | 10 | NOT STARTED | — |
| MS-9 | Beta / RC | 11 | NOT STARTED | — |
| MS-10 | Launch | 12 | NOT STARTED | — |

## B. Branches & repositories

| ID | Item | Status | Evidence / notes |
|---|---|---|---|
| BR-1 | `main` | ACTIVE | `96bc4eb`, 2026-11-06; production docs landed; CI **success** (push run 02:54Z) |
| BR-2 | `feat/world-contract-foundation` | READY TO MERGE | **3 ahead / 9 behind** (base `447b0e1`); sim layer + runtime integration; suite **744/744 [executed]**; probe 15/15 [executed]; conflicts: `AGENTS.md`, `tests/docs-hygiene.test.ts` (DEF-3 union), `worklog.md`; Game.ts auto-merges [merge-tree] |
| BR-3 | `feat/player-upgrade` | SUPERSEDED — RETIRE | 3 commits ahead; content landed on main via player-repo cherry-pick (`a9718e9`, wardrobe merge `69f8327`); WP-0 = guard-by-guard check, then delete branch |
| BR-4 | `desurfofficial-ship-it/First-slice-player` (separate repo) | MERGED UPSTREAM | its `feat/player-visual-kinematics-polish` was cherry-picked to main; keep as history |
| BR-5 | `docs/production-roadmap` | MERGED — RETIRE | landed on main as `96bc4eb`; local branch deletable |

## C. Systems (owners are workstream leads; "—" = unassigned pending governance kickoff)

| ID | System | Phase | Owner | Status | Depends on | Priority | Evidence / outstanding |
|---|---|---|---|---|---|---|---|
| SYS-WORLD-01 | World topology & spatial registry | 1/3 | WS-A | IMPLEMENTED (sim on branch); registry data VERIFIED; **read-side INTEGRATED** | PH-1 merge | P0 | validator OK (129 IDs); registry consumed by the live runtime (place resolver); write-side flip = A-3, Phase 3 |
| SYS-WORLD-02 | Streets, sidewalks & intersections | — | WS-A | VERIFIED (shipped set) | — | P1 | probes + E2E; 5 streets designed |
| SYS-WORLD-03 | Buildings & interiors | 8 | WS-A | VERIFIED (shipped set); remainder PLANNED | DEC-8 | P1 | 12 masses shipped / 43 designed; interiors.test |
| SYS-WORLD-04 | Doors, stairs & elevators | 3 | WS-A | PARTIAL (VERIFIED cases) | PH-2 | P1 | stair law tests; no generic door entity |
| SYS-WORLD-05 | Navigation & pathfinding | 3 | WS-A | PLANNED (nav graph) | PH-2 | P0 | Yuka loops today; wc-17 A-1 |
| SYS-WORLD-06 | Landmarks & POIs | — | WS-E | VERIFIED (shipped set) | — | P2 | Map places + sketches |
| SYS-WORLD-07 | Environmental detail & NY identity | — | WS-E | VERIFIED | — | P2 | 1-Second probe frames |
| SYS-WORLD-08 | Streaming, spatial index & LOD | 4+ | WS-F | PARTIAL (sufficient at scale) | measure first | P2 | district tiles + bakes; no index; B13 open |
| SYS-POP-01 | NPC identities & records | 4 | WS-B | IMPLEMENTED (branch) | PH-1 | P0 | sim/entities + ids tests |
| SYS-POP-02 | Schedules & routines | 2 | WS-B | **INTEGRATED (branch, bound cast)** | PH-1 merge | P0 | Rosa/Idris clock-keyed schedules live in-game; probe steps 1–2 [executed]; ambient migration = WP-3v |
| SYS-POP-03 | Behavior arbitration | 2 | WS-B | **INTEGRATED (branch, bound cast; R6 door live)** | PH-1 merge | P0 | S1–S7 tested; hello = HIGH claim via the real interaction registry; LIFO resume; probe steps 3–4 [executed] |
| SYS-POP-04 | NPC navigation & movement | — | WS-B | VERIFIED | — | P1 | crowd/solidity tests; soak probe |
| SYS-POP-05 | Relationships & social | 4/6 | WS-B | PARTIAL | PH-2 | P1 | living-memory tests; edges declared |
| SYS-POP-06 | Memory & personal stories | 2/7 | WS-C | PARTIAL (state VERIFIED, UI missing) | PH-2 WP-6 | P0 | field-diary tests; no ink UI |
| SYS-POP-07 | Needs, activities, reactions | 4 | WS-B | PLANNED (deliberate deferral) | loops exist | P2 | wc-17 deferral |
| SYS-POP-08 | Pedestrian population | — | WS-B | VERIFIED | — | P1 | probe-w4-soak |
| SYS-POP-09 | Traffic & vehicles | — | WS-A | VERIFIED (designed scale) | — | P1 | traffic/bus tests |
| SYS-POP-10 | Dynamic events | 6 | WS-B | PARTIAL | PH-2 | P1 | Shuffle guards; R6 not built |
| SYS-POP-11 | Persistent sim state | 1/2 | WS-D | **INTEGRATED + VERIFIED (branch)**; story save VERIFIED | PH-1 merge | P0 | `first_slice_world_v1` rides story persist beats + roam autosave; corruption/idempotency probe 6a–6g [executed] |
| SYS-PLAY-01 | Movement & controls | — | — | VERIFIED | — | P0 | player-upgrades/stairs/descend guards |
| SYS-PLAY-02 | Interaction framework | — | — | VERIFIED | — | P0 | interactions.test 422 lines |
| SYS-PLAY-03 | Dialogue & choices | 2/5 | WS-C | PARTIAL | R7 | P0 | content-order tests; R7 not built |
| SYS-PLAY-04 | Activities & minigames | — | — | VERIFIED (shipped) | — | P1 | court determinism tests |
| SYS-PLAY-05 | Employment & daily life | 5+ | WS-C | PARTIAL | DEC-3 | P1 | rush math E2E-asserted |
| SYS-PLAY-06 | Social systems | 4/7 | WS-B/C | PARTIAL | PH-2/4 | P1 | familiar-face/kid guards |
| SYS-PLAY-07 | Inventory & resources | 5 | WS-C | PARTIAL | spine needs | P2 | light item model |
| SYS-PLAY-08 | Money & transactions | 2 | WS-D | VERIFIED (story) / IMPLEMENTED (ledger) | PH-1/2 | P0 | $87→$112→$123 E2E; economy tests |
| SYS-PLAY-09 | Player progression | 7 | WS-C | PARTIAL | R8 | P1 | roam/permit beats; R8 not built |
| SYS-PLAY-10 | Freedom of exploration | — | — | VERIFIED | — | P0 | freeroam/touch-law guards |
| SYS-ECO-01 | Independent businesses | 2/6 | WS-D | PARTIAL | PH-2/6 | P1 | hours data on branch |
| SYS-ECO-02 | Customers & workers | 4/6 | WS-B | PARTIAL | PH-4 | P2 | role tables |
| SYS-ECO-03 | Business operations | 6 | WS-D | PLANNED | PH-2/4 | P1 | wc-17 Phase 4 |
| SYS-ECO-04 | Goods & resource flows | 6 | WS-D | PLANNED | PH-1 | P2 | flow classes declared |
| SYS-ECO-05 | Public services | — | — | NOT STARTED (by design) | spine need | P3 | — |
| SYS-ECO-06 | Transportation | 2 | WS-B | VERIFIED; clock-keying PLANNED | PH-2 | P1 | subway/bus suites |
| SYS-ECO-07 | Neighborhood identity | — | WS-C | VERIFIED (canon + dressing) | — | P2 | naming registry |
| SYS-ECO-08 | Persistent neighborhood change | 2/6 | WS-D | PARTIAL | PH-2/6 | P1 | dressing.ts day-keyed |
| SYS-ECO-09 | In-game time progression | 2 | WS-D + ND | **VERIFIED — WP-2v closed (2026-11-06).** DEC-1 ruled (Day 1 = Tuesday, Sept 9, Y1); `CAL_EPOCH` corrected on main; the one epoch mapping landed: `sim/epochMap.ts` (story day ↔ sim day ↔ displayed date ↔ weekday through ONE door; `datelineOfDay` format convergence; midnight-exact `dateOfTick`; `epochAgreement()` tripwire) + `tests/sim-epoch-map.test.ts` (29 pinned tests incl. the 900-day two-authority sweep); `worldRuntime.debug()` reads dates through the mapping. Mood-lock = presentation, untouched | DEC-1 (closed) | P0 | valve live (D-1); epochs reconciled per `docs/production/DEC-1-CALENDAR-CANON-DECISION.md`; day counters aligned 1:1 by `onStoryDayBegin` + pinned forward-only reconcile; story/world save round-trips date-true; WP-6 renders through the same door |
| SYS-NAR-01 | Protagonist & character systems | 5 | WS-C | VERIFIED (identity); R11 PLANNED | PH-2 | P0 | wardrobe/lock law guards |
| SYS-NAR-02 | Diary-map | 2 | WS-C | PARTIAL | PH-2 WP-6 | P0 | map-notebook guards; ink UI missing |
| SYS-NAR-03 | Character arcs | 4/7 | WS-C | PLANNED | R5 | P1 | canon complete |
| SYS-NAR-04 | Story events | 7 | WS-C | VERIFIED (Days 1–4); validation layer IMPLEMENTED | PH-1 | P0 | state tests; sim-narrative tests |
| SYS-NAR-05 | Dialogue | 5 | WS-C | PARTIAL | R10 | P1 | voice table (doc 13) |
| SYS-NAR-06 | Relationships & consequences | 2 | WS-C | PLANNED (R2) | PH-2 WP-5 | P0 | doc 10 §1 law |
| SYS-NAR-07 | Player choices | 2 | WS-C | PLANNED (R7) | PH-2 WP-5 | P0 | doc 10 §3 register |
| SYS-NAR-08 | Betrayal & aftermath | 7 | WS-C | NOT STARTED (build); canon done | machines | P1 | docs/narrative/08–09 |
| SYS-NAR-09 | Story continuity | — | ND | VERIFIED (practice) | — | P1 | doc 15 + hygiene test |
| SYS-NAR-10 | Integration with sim state | 2 | WS-D | **INTEGRATED (branch)** | PH-2 close (D-3) | P0 | one-way bridge live: story persist → world save; `onStoryDayBegin` one-way fast-forward; probe 6c/6g [executed] |
| SYS-QA-01 | UI & UX | — | — | VERIFIED | — | P0 | touch-law guard |
| SYS-QA-02 | Audio & music | 10 | WS-F | INTEGRATED; ears-pass owed | human box | P2 | audio.ts; doc 32 note |
| SYS-QA-03 | Animation | — | — | VERIFIED | — | P1 | rig guards |
| SYS-QA-04 | Visual quality | 2+ | WS-F | VERIFIED by process; **B13 open** | DEC-2 | P1 | ledger rows |
| SYS-QA-05 | Accessibility | 5 | WS-C/E | PARTIAL | — | P2 | toggle planned |
| SYS-QA-06 | Performance | all | WS-F | GOVERNED (ledger rule) | DEC-2 | P0 | probe fleet; census gate |
| SYS-QA-07 | Save/load | 1 | WS-D | VERIFIED (story); world save IMPLEMENTED | PH-1 | P0 | fuzz wall; sim-state tests |
| SYS-QA-08 | Error recovery | — | — | VERIFIED (patterns) | — | P1 | quarantine laws |
| SYS-QA-09 | Testing | all | WS-F | VERIFIED; CI gap open | — | P0 | main 660/660 · branch 744/744 [executed]; 122+ harnesses (+probe-world-sim); no PR lane |
| SYS-QA-10 | Compatibility | 10 | WS-F | PARTIAL | hardware access | P1 | SwiftShader proxy; no devices |
| SYS-QA-11 | Release preparation | 9–12 | WS-F | PARTIAL | DEC-9/11 | P2 | Pages deploy only |

## D. Narrative requirements (docs/narrative/14 — build order §7 is binding)

| ID | Requirement | Status | Owner | Evidence / notes |
|---|---|---|---|---|
| R0 | Hygiene guard re-point | VERIFIED | WS-C | `tests/docs-hygiene.test.ts` re-pointed 2026-11-06; green |
| R1 | Rails engine | NOT STARTED | WS-C | after R2/R7 (§7 step 3) |
| R2 | Consequence ledger | PLANNED (next) | WS-C | Phase 2 WP-5, parallel with the valve |
| R3 | Field diary | VERIFIED (state only) | WS-C | `core/fieldDiary.ts` + 22 tests; UI = WP-6 |
| R4 | Time model (calendar) | VERIFIED (state only) | WS-D/ND | `core/calendar.ts` + tests re-pinned to the ruled epoch (Sept 9, Y1 — DEC-1, 2026-11-06) |
| R5 | Independence simulation | NOT STARTED | WS-B/C | Phase 4 |
| R6 | Missable-event scheduler | NOT STARTED | WS-C | Phase 6 |
| R7 | Choice nodes | PLANNED (next) | WS-C | Phase 2 WP-5 with R2 |
| R8 | Chapter gating | NOT STARTED | WS-C | after R1 |
| R9 | Postcards as unsent letters | NOT STARTED | WS-C | Phase 7 stage 7 |
| R10 | Fluency & voice states | NOT STARTED | WS-C | Phase 5 |
| R11 | Name/look propagation | NOT STARTED | WS-C | Phase 5 |
| R12 | Sensitive-content guardrails | NOT STARTED | WS-C + ND | Phase 5; canon-critical |
| R13 | Self-portrait generator | NOT STARTED | WS-C | Phase 7 stage 9 |
| R14 | Amends economy | NOT STARTED | WS-C | Phase 7 stage 9; sums test $61,500/$47,300 |
| R15 | What NOT to build | ACTIVE (law) | all | audited as absences at Phase 9 |

## E. Defects & hygiene

| ID | Item | Status | Owner | Notes |
|---|---|---|---|---|
| DEF-1 (B13) | Draw calls above the 150 budget on full-street rigs (PLAZA 302 / CART_CORNER 236; SYCAMORE 84→78; TIMES_SQ 52; PLATFORM_A 108) | OPEN — owner's call | Owner | Six priced optimization rounds declined; governing rule: no rig above its previous ledger; study lives in docs/57 §3.6 (in git history) |
| DEF-2 | Field diary / calendar have no UI | OPEN — scheduled | WS-C | Phase 2 WP-6 (not a defect of the state layer, which is verified) |
| DEF-3 | Divergent docs-hygiene re-points: branch case 2 pins docs/50+docs/51 pointers that main's reboot removed — a naive merge lands 2 failing assertions | OPEN — resolve at WP-0 | Production Director | Union verified: main's file + branch's README banner assertions (Baseline/Owner/registry — main's README already satisfies all three) |
| HYG-1 | README.md still links to deleted legacy docs (docs/01, docs/07, docs/architecture/) | OPEN | WS-E/lead | Cosmetic but misleads newcomers; one-line fixes; do NOT restore the files |
| HYG-2 | Duplicate doc numbers in legacy history (28/29/34/35/38/48/52/56/57) | ACCEPTED (history) | — | File names are the stable keys; the wipe is recorded; no action |

## F. Change log

| Date | Change | By |
|---|---|---|
| 2026-11-06 | Register v1.0 created from the full repository audit | Production Director |
| 2026-11-06 | **v1.1 reconciliation** — branch advanced to `407cc0e` (runtime integration verified: gates + probe executed); PH-2/MS-1 → IMPLEMENTED (branch); 4 system rows → INTEGRATED; BR-1/2/5 updated; DEF-3 filed; DEC-1 brief sharpened — [PRODUCTION-RECONCILIATION-REPORT.md](PRODUCTION-RECONCILIATION-REPORT.md) §5 | Production Director |
| 2026-11-06 | **v1.2 — DEC-1 ruled** (owner-approved Option A): Day 1 = Tuesday, September 9, Y1; the October mood-lock is presentation-only; `CAL_EPOCH` corrected on main; calendar tests re-pinned (661/661); ruling recorded in docs/narrative/15 §2/§7 — adjudication of record: [DEC-1-CALENDAR-CANON-DECISION.md](DEC-1-CALENDAR-CANON-DECISION.md) | Narrative Director + owner |
| 2026-11-06 | **v1.2.1 — WP-0 landed** (owner sequence, behind the green gate): `feat/world-contract-foundation` merged to main at `1bb3152`; the audit's 3 conflicts resolved per DEF-3's verified union; gates executed post-merge — tsc clean · vitest **801/801** (56 files) · probe-world-sim **15/15** · 4-day E2E **0 failures** (592 s, console clean) · perf re-baseline (drawCalls 119/184/256, zero page errors). Branch suite re-run first: 744/744. DEF-3 → RESOLVED; R-NEW-2 (branch drift) → closed by the merge | Narrative Director + owner |

*Update rows in the same commit as the work. Add decisions to the risks doc, defects to §E, systems through a PR that touches both this register and SYSTEM-COMPLETION-CHECKLISTS.md.*
