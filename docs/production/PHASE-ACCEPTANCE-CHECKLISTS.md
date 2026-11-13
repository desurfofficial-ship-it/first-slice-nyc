# PHASE-ACCEPTANCE-CHECKLISTS — FIRST SLICE

| | |
|---|---|
| Status | Active — the entry/exit law for every phase in [MASTER-GAME-ROADMAP.md](MASTER-GAME-ROADMAP.md) §3 |
| Owner | Production Director (keeper) · the owner of the phase signs the exit |
| Law | A phase is never "complete" because its document is written. A phase is complete when every exit box carries **evidence** — a command run, a probe exit-0 line, a test name, a screenshot, a worklog entry. |
| Vocabulary | NOT STARTED / PLANNED / IN PROGRESS / IMPLEMENTED / INTEGRATED / VERIFIED / BLOCKED (docs/production/README.md) |

Standing gates for **every** phase, before any phase-specific box is checked (the "floor"):

- [ ] `npx tsc --noEmit` clean in `web-three/`
- [ ] `npx vitest run` green — full suite, no skips added
- [ ] `npm run build` OK
- [ ] `node scripts/e2e.mjs` — 4-day E2E, exit 0 (zero failures, console clean)
- [ ] Probe fleet relevant to the touched systems exit 0
- [ ] Perf ledger: no rig above its previous recorded row (probe-perf / probe-w0-census)
- [ ] No new dependency without owner approval (AGENTS.md §1c, wc-14 §2)
- [ ] `worklog.md` entry appended (template) in the same commit
- [ ] [PRODUCTION-STATUS-REGISTER.md](PRODUCTION-STATUS-REGISTER.md) rows updated in the same commit
- [ ] Anti-Slop Gate §1b: the change inspected in the running game

---

## Phase 0 — Production control and project baseline

**Entry requirements.** Repository access; the audit completed; the owner's directive (this assignment).

**Exit checklist.**
- [ ] The seven production documents exist under `docs/production/` and cross-reference each other correctly (README index links resolve)
- [ ] `MASTER-GAME-ROADMAP.md` states the one-roadmap law and the reconciliation of the legacy `docs/06` roadmap (history) and wc-17 (contract sequencing)
- [ ] [SYSTEM-COMPLETION-CHECKLISTS.md](SYSTEM-COMPLETION-CHECKLISTS.md) covers every system family with a current status + evidence pointer
- [ ] [PRODUCTION-STATUS-REGISTER.md](PRODUCTION-STATUS-REGISTER.md) v1.0 populated — every row has status, owner, evidence
- [ ] [AGENT-DEVELOPMENT-GOVERNANCE.md](AGENT-DEVELOPMENT-GOVERNANCE.md) defines workstreams, assignment template, branch/integration rules
- [ ] [PRODUCTION-RISKS-AND-DEPENDENCIES.md](PRODUCTION-RISKS-AND-DEPENDENCIES.md) lists every open decision with an owner (DEC-1…DEC-n)
- [ ] [NEXT-PHASE-EXECUTION-PLAN.md](NEXT-PHASE-EXECUTION-PLAN.md) specifies work packages with owners, file scopes, acceptance criteria
- [ ] `AGENTS.md` points new agents at `docs/production/` (additive edit; hygiene test green)
- [ ] Baseline evidence recorded in the register: main gates (`tsc` clean · vitest 660/660 · build OK), branch states, ledger rows
- [ ] **Owner ratification** — the owner has reviewed and accepted the baseline (the one human box this phase cannot pass without)

**Sign-off.** Production Director prepares; owner ratifies.

## Phase 1 — Architecture and simulation foundation *(acceptance = the merge)*

**Entry requirements.** The branch exists and is green (it is: 718/718 on `feat/world-contract-foundation`); the narrative spine of state on main (R0/R4/R3 — done); no conflicting contract changes pending.

**Exit checklist.**
- [ ] `feat/world-contract-foundation` merged to main (or rebased and merged — 7 commits behind at baseline)
- [ ] The `tests/docs-hygiene.test.ts` collision resolved: one R0 re-point survives, both intents honored (canon existence + phase line + engineering law)
- [ ] The 17 contract documents land at `docs/architecture/world-contract/` on main
- [ ] wc-17's status table updated: "Phase 0 — Foundations (THIS PASS — shipped)" gains its merge record
- [ ] Merged-tree suite green: `tsc` · vitest (660 + 113 sim tests, any dedup noted) · build · 4-day E2E · docs-hygiene
- [ ] `web-three/src/sim/` present on main; `first_slice_world_v1` save key verified beside (never inside) `first_slice_save_v1` (the sim-state test proves it)
- [ ] Byte-identity of the shipped game path: probe-perf rows unchanged from baseline (the branch touches no game code — verify, don't assume)
- [ ] Worklog entry naming every workstream that inherits from `sim/`
- [ ] Register rows for WORLD-9 (registry), SIM-* modules upgraded: IMPLEMENTED → (still not INTEGRATED — integration is Phase 2's job)

**Sign-off.** WS-D lead (contract owner) + Production Director.

**Must NOT open Phase 2 until:** the merge commit's full gates are green and DEC-1 (epoch reconciliation) is *scheduled* (ruling may land inside Phase 2's WP-2, but the decision meeting must exist).

## Phase 2 — Runtime integration (the time valve) — **EXIT CHECKLIST EXECUTED 2026-11-07 (register v1.11.0, main `b99c01f`+) — sign-off + the human evaluation session are the two owner-side variances (V-PH2-1/2 below)**

**Entry requirements.** Phase 1 accepted; DEC-1 ruling available for WP-2; work packages claimed per the governance doc (one owner each, disjoint file scopes). — **met 2026-11-06** (WP-0 merge `1bb3152`; DEC-1 ruled inside WP-2v as scheduled).

**Exit checklist.**
- [x] **WP-0** branch hygiene — DONE 2026-11-06 (`1bb3152`): `feat/player-upgrade` guard-checked and retired (no branch remains); `feat/world-contract-foundation` merged. *Hygiene variance V-PH2-3: ~~deletion pending the push wave~~ **CLOSED 2026-11-07 (register v1.11.1)** — the local branch copy deleted during the push wave (remote copy intact at `407cc0e`; `git log main..feat/world-contract-foundation` empty — nothing unmerged).*
- [x] **WP-1 (D-1)** the tick valve lives in `Game.frame` — DONE (WP-1v CLOSED `0e22ff5`): `game/pauseSet.ts` (one pure statement), wardrobe/postcard in the pause set, the Map deliberately not (pinned); 11 pinned cases + probe-pause-set **11/11 re-executed on the integrated tree 2026-11-07**
- [x] **WP-2 (D-2)** day-boundary machine on the clock + **DEC-1's epoch mapping behind one mapping function + a pinned test** — DONE (WP-2v `eab767c`): `sim/epochMap.ts`, `epochAgreement()`, DEC-1 RULED (owner-approved Option A, Sept 9 Y1); calendar tests re-pinned
- [x] **WP-3 (B-1)** clock-keyed schedules via arbitration claims — DONE (bound cast on the branch tree, probe steps 1–4; ambient migration WP-3v `e3f1b02` — navigation-aware commutes, `EDGE_THROUGH_ROAD` closed); the pinned-times probe is **probe-ms1-clock-street.mjs (WP-7, 2026-11-07): 07:40 platform occupancy + 22:00 deli close demonstrated with screenshots** (probe-world-sim 15/15 and probe-ped-nav 7/7 bank the rest)
- [x] **WP-4 (D-3)** the money→ledger bridge — DONE (`3a9984d`): every `Effect('money')` posts behind the same confirm-gates; the sanctioned mirror audited by `auditWorld`; probe-money-trace ALL PASSED, **ids byte-identical across two independent boots**; the E2E's $87→$112→$123 pass **unchanged** (day-4 save holds $123, re-proven 2026-11-07)
- [x] **WP-5 (WS-C, parallel)** R2 consequence ledger + R7 choice nodes — DONE (`b99c01f`): `core/consequenceLedger.ts` (append-only; promises with due dates mature into omissions, idempotent, deterministic derived ids) + `core/choiceNodes.ts` (doc 10 §3's 17 nodes; the no-fake-choices validator green — flag AND ledger signatures pairwise unique); 47 tests; the save carries `ledger` v1-safe
- [x] **WP-6** the date and the diary visible — DONE (`5ba16a3`): the ink layer live (`ui/diary.ts`), probe-diary-ink **28/28 at 390×844**, the HUD dateline through `datelineOfStoryDay` only; *dyslexia-friendly toggle rides Phase 5 per the plan's own allowance*
- [x] New bridge guards: no second clock, no second ledger, no second save — asserted by test: sim-runtime pins (the ONE valve), sim-money-bridge failure-mode tests (the mirror disagrees → the world fails fast), save.test.ts (the ONE story key + the world's own key, old saves parse unchanged, the ledger round-trips)
- [x] Hot-path law — code review (WP-3v's allocation-free pin pass; WP-1v's zero-allocation loop) + the soak evidence: perf-peds on the integrated tree **27.1 µs/frame (0.16% of budget), heap FLAT (−17 MB GC reclaim, no growth), 38 routes in 300 s** (2026-11-07)
- [x] E2E green on the integrated tree — 4-day E2E **0 failures (595 s, console clean)**; ledger rows unchanged (probe-money-trace re-executed post-merge: $112.00, audit clean); probe-perf standing rows zero drift
- [x] **The wc-17 Phase-1 exit sentence demonstrated in a browser** — **probe-ms1-clock-street.mjs ALL 16 CHECKS PASSED (2026-11-07)**: a roam afternoon 07:40→22:05 at accelerated in-game time — Idris stands the platform at 07:40, the deli is a routed corridor at 21:58 and refuses routes at 22:00 (`PLACE_INACCESSIBLE`), the dateline reads "September 9 · Year 1" on screen with the diary leaf folded open, the ledger genesis-audits clean before AND after, the story never moved (day 1, $87); screenshots `web-three/shots/ms1-*.png`
- [x] Save round-trip — probe-world-sim 6c (exact tick restore) + 6e (idempotent loads) re-executed **15/15 on the integrated tree 2026-11-07**; the story save parses old saves unchanged (save.test.ts's old-v1 cases + the ledger's empty-layer law)

**Sign-off.** WS-D lead + WS-B lead (B-1) + Production Director. The register records MS-1. — **V-PH2-1 (owner-side): the three-lead sign-off line is unexecuted — the workstreams' evidence is banked above; the owners sign.**

**Evaluation variances.**
- **V-PH2-2 (owner-side):** the 15–20-minute human evaluation session (MASTER-GAME-ROADMAP §5: fresh save, no instructions, follow/refuse the beat, roam on the clock, spend recorded money, discover a place, keep a Postcard) requires a human box and is unexecuted — every automated substitute is green (the 4-day E2E plays the story; probe-ms1-clock-street plays the roam afternoon; probe-diary-ink proves readability at 390×844). The session remains the exit's human half, logged with who/when by the owner. **The observer checklist is PREPARED (2026-11-07): [`PLAYTEST-CHECKLIST-V-PH2-2.md`](PLAYTEST-CHECKLIST-V-PH2-2.md) — the six meaningful-play capabilities as observed ticks, the log-don't-interpret law, and the honesty law (agents never perform or close this variance).**
- **V-PH2-3 (hygiene) — CLOSED 2026-11-07:** the local branch copy was deleted during the push wave (register v1.11.1); the remote copy stands at `407cc0e`, history preserved on main (merged `1bb3152`).

**Must NOT begin before acceptance:** nav-graph migration (Phase 3), needs/mood dials (Phase 4), C0+ content (Phase 7 waves), any new location work. — *note: the Phase-3 nav work (A-1/A-2/WP-3v) already landed under separate owner assignments ahead of this acceptance; nothing here re-opens it.*

## Phase 3 — Navigation and physical world integration

**Entry requirements.** Phase 2 accepted; DEC-2 (B13) closed or explicitly priced per wave; WS-A assignment claimed per governance (single writer on `World.ts`).

**Exit checklist.**
- [x] A-1: nav graph (nodes/edges/chokepoints) seeded from registry entrances/crosswalks; unit tests for connectivity + capacity — **LANDED 2026-11-06 on `feat/phase-3-navigation-building-access`: `sim/nav/` 401 nodes/444 edges/1 component; byte-identical determinism pin; validation clean (no edge through a footprint, no orphans); all 26 crosswalk legs; A* + grid index + bounded cache; the bound cast WALKS ROUTES (`?scenario=nav` 9/9 executed; routed-commute integration tests)** — *walkers migrated off hardcoded loops: **DONE (WP-3v, main `e3f1b02`, 2026-11-06)** — ambients commute over the graph, street-level only, crowd/solidity/shuffle guards green throughout (889/889)*
- [x] A-2: door/stair resources mapped — **LANDED: `door:<buildingId>` on every nav door edge (the contract's arbitration-resource shape); 4-state door model; hours gating; enter/exit transitions recorded; the `PLACE_INACCESSIBLE` reachability function** — *arbitration CAPACITY claims at chokepoints remain open (WP-3v+; the `resourceRef` wiring is in place)*
- [ ] E-1: shipped anchors catalogued as `obj:` content entries; first building-variant pack through `validateManifest` green
- [ ] A-3: the registry→runtime geometry flip landed for at least the W0/W1 districts, one district per PR, each with a perf-ledger row and the ±0.1 m ghost gate green *(DEC-4 — the nav layer reads the registry read-side; the geometry flip stays deliberate)*
- [ ] Fidelity gate (registry-vs-engine agreement) re-pinned as the load test
- [x] No interaction regression: the full interaction set still enabled where it was (interactions.test.ts + probes) — **R6 hello interruption re-proven on the routed runtime (`probe-world-sim` steps 3–4, executed); E2E 0 failures (545 s)**
- [x] E2E + probe fleet green; perf ledger — **all executed on the branch: probe-world-sim 15/15 (76.9 s), probe-pause-set 11/11, probe-nav 9/9 (46.7 s), 4-day E2E 0 failures (545 s, console clean); perf re-baseline drawCalls 119/184/256 (zero drift) + nav-specific measurements recorded (`scripts/perf-nav.ts`, register SYS-WORLD-05)**

**Sign-off.** WS-A lead + WS-F (gates) + Production Director. Register records MS-2. *(Phase 3 exit remains OPEN on E-1 and A-3 — the A-1/A-2 foundation AND the WP-3v walker migration are landed and evidenced.)*

**Must NOT begin before acceptance:** population growth beyond current counts (Phase 4); any new building wave (Phase 8).

## Phase 4 — Living population and NPC simulation

**Entry requirements.** Phases 2–3 accepted; doc 05/07 content canon available; `sim/life` design note approved by WS-B + WS-C (relationships are shared shape).

**Exit checklist.**
- [ ] B-2: fidelity tiers (full/background/abstract) live — tier up/down round-trips lose and invent no fact (tested); tier changes are scheduling decisions only
- [ ] R5 independence sim live: per-major availability, mood (steady/strained/bitter + recovery), calendar events, one independent decision per chapter — **the documented-directions test passes: ignoring the protagonist for a chapter changes ≥3 majors in doc 07's directions**
- [ ] B-3: relationship mutations travel as world events (event-log auditable)
- [ ] Needs/mood/ambition *shapes* exist (dials deliberately absent — the wc-17 deferral stands until loops exist)
- [ ] Soak gates green at the increased population (probe-w4-soak law: ≥1800 sim-s, zero failures, no NaN, no stuck walkers)
- [ ] Perf ledger green at the new population; sim step inside the measured frame budget (the Phase-2 valve provides the measurement)
- [ ] No fake interactions (Anti-Slop): recurring faces greet with data-backed recognition, not scripts alone
- [ ] Multi-day unattended sim: `auditWorld` green; majors' availability/mood moves match doc 07 defaults (the exit sentence demonstrated)

**Sign-off.** WS-B lead + WS-C lead (relationship shapes) + Production Director. Register records MS-3.

**Must NOT begin before acceptance:** business P&L (Phase 6); C1+ content (Phase 7).

## Phase 5 — Player freedom and core gameplay systems (completion pass)

**Entry requirements.** Phase 2 accepted (clock + ledger live); R2/R7 in place; doc 13's voice table and doc 10's node register to hand.

**Exit checklist.**
- [ ] R10: fluency ladder persisted; dialogue tables select by tier; the C4 payoff data exists (data-only until C4 content ships)
- [ ] R11: the chosen name flows through every diary entry, spoken line, text message, and (later) the self-portrait — the propagation test fails on any un-named surface; surname-gating implemented as the `surnameKnown` content convention
- [ ] R12: the one-time opt-in resource note fires at first of F7 / first therapy session / first C5-investigation scene; no flashback machinery exists for the Lost Year; the amnesia-rule tests pass (RECALL never upgrades to FACT by elapsed time alone)
- [ ] Inventory/transactions read cleanly against the ledger (the sanctioned mirror; `auditWorld` green)
- [ ] Dyslexia-friendly plain-type toggle shipped (one flag, one font)
- [ ] Determinism: same state → same dialogue selection (tested)
- [ ] Browser verification: rename the protagonist, change fluency tier, see every affected surface update
- [ ] Full suite + E2E green

**Sign-off.** WS-C lead + Production Director.

**Must NOT begin before acceptance:** C2+ dialogue-heavy content waves.

## Phase 6 — Living neighborhood and world simulation

**Entry requirements.** Phases 2 and 4 accepted; ~~DEC-6 (seasonal pass scope) ruled~~ **DEC-6 RULED 2026-11-13 (owner sign-off — MET: [DEC-6-SEASONAL-PASS-SCOPE-DECISION.md](DEC-6-SEASONAL-PASS-SCOPE-DECISION.md), the minimal scope rules)**; seasonal art dependency budgeted as its own wave (narrative/14 §4 — **the wave is executable under the ruling's terms**).

**Exit checklist.**
- [ ] Businesses operate: hours → open/close transitions → P&L **derived from ledger evidence** (never hard-coded; the sums test proves derivation)
- [ ] Goods/resource flows on the economy contract; flow accounting audit green
- [ ] Relationship drift with events (the drift dials are data; doc 07's defaults are the seed values)
- [ ] R6 missable windows live: no window re-opens (tested); `onMiss` writes a world change the city diary may mention once — the No-FOMO compliance test passes (a miss is content, never a nag)
- [ ] Season cuts: the named `seasonCut` transition consumes calendar days and runs the diary montage + postcard + city-diary whisper; the built-and-unused `crossedSeasonCut` detector is wired and pinned
- [ ] The block remembers across in-game months: an unattended multi-month sim produces documented change; `auditWorld` green across month boundaries
- [ ] Environment section of WorldState earns its keep (weather epoch minimal; no real-time keys anywhere — the no-clock test extends to environment)
- [ ] Seasonal dressing wave priced into the perf ledger before landing; ledger green after
- [ ] E2E + probe fleet + full suite green

**Sign-off.** WS-D lead + WS-B lead + Production Director.

**Must NOT begin before acceptance:** C5/C6 downfall content.

## Phase 7 — Narrative and story integration

**Entry requirements.** Machines from Phases 2/4/6 as they arrive; docs/narrative/14 §7 order enforced; each wave's content passes the voice laws (doc 13) before merge.

**Exit checklist (per wave — C0, C1–C2, C3–C6; the register tracks each).**
- [ ] The wave's R-requirements implemented with their permanent guards (doc 14 §6 minimum set, all green: diary append-only · tag integrity · rails fire-once · ledger determinism from save · windows never reopen · no real-world dates · name propagation · self-portrait determinism · amends sums $61,500/$47,300)
- [ ] R1 rails: six rails as data; a rail can fire mid-roam; firing is observable in the city diary, never a banner
- [ ] R8 chapter gating: trigger + minimum in-game days; the hundred-roam-days-in-C1 test passes
- [ ] R9: postcards gain `kept`; the C5 `sent` event is the only send; no postcard UI promises mailing
- [ ] R13 self-portrait: identical state → identical text; versions append-only
- [ ] R14 amends: 19 rows as data; per-row payment verbs; restitution derived from the table
- [ ] C0 fires through `validateEvent` on the live world (MS-4)
- [ ] Content passes the voice self-check (content-pipeline skill) and the No-Quiz Law
- [ ] Story-spine E2E lane green (added this phase)
- [ ] The fridge-test ritual run on the spine's six postcards (human box — logged, like all human gates, with who ran it and when)

**Sign-off.** WS-C lead + Narrative Director (canon) + Production Director. Register records MS-4 and MS-5.

**Must NOT begin before acceptance:** Phase 9 completeness claims; Phase 11 external tests.

## Phase 8 — City production and expansion *(owner-gated)*

**Entry requirements.** Phases 3/4/6 accepted; **DEC-2 closed**; **DEC-8 (owner approval for expansion scope) granted — RULED 2026-11-13 (owner sign-off; [DEC-8-EXPANSION-APPROVAL-DECISION.md](DEC-8-EXPANSION-APPROVAL-DECISION.md), within the row's standing terms: Alder Heights completion only, no borough geometry)**; per-wave draw-call pricing exists before any geometry lands.

**Exit checklist (per construction wave) — EXECUTED 2026-11-13 (register v1.66.0).**
- [x] Wave priced: expected draw-call/tri delta in the ledger *before* the PR — **every construction wave W1–W7 and craft wave W8–W13 recorded its pricing in the change log under the DEC-2 ledger rule** (the B13 lesson enforced: price first, build second; the fleet's own catches — e.g. probe-a3-flip refusing a 6 m defect, probe-w12's ring-rhythm shot — are the priced-gate working)
- [x] Ghost gates ±0.1 m green for every new mass; registry validator green (append-only ID grammar respected) — **validate-registry OK at every wave's battery; the final tree reads 178 IDs / 81 buildings / 21 interiors / 7 parks / 23/23 anchors, append-only throughout (no id renamed, no row renumbered — the W11 audit's explicit discipline)**
- [x] Every new place has: purpose, interaction(s), probe evidence, Anti-Slop inspection — **every built interior opens with books and staffing (the Phase-6 machinery, v1.58.0); walk-in probes prove the approach (the FRUIT-INT live leg, the W10 gate legs); the slop-integration wave and the terrace report §4 ledger carried the Anti-Slop rows to closure**
- [x] Business records open with the place (Phase 6 machinery) — **the world opens with its businesses on the reference manifest's hours; the P&L derives from ledger evidence only (wc-12 rule 17)**
- [x] E2E extended for any story-relevant place; perf ledger green after the wave — **the 4-day E2E ran 0 failures across the waves; the standing battery at the current tip `2cba191` (W13): probe-city-fabric DRAWS 190 (budget < 200), probe-integration 0 errors 8/8 walks (189 draws), probe-nav 9/9, probe-world-sim 15/15**
- [x] The borough scoping study exists **as a document** and no borough geometry has been built without the owner gate — **[BOROUGH-SCOPING-STUDY.md](BOROUGH-SCOPING-STUDY.md) filed 2026-11-13 (reference-world manifest pattern, Slop New York reference-only, no OSM/NYC-Open-Data geodata); zero borough geometry, zero borough registry rows, zero borough code exists**

**Sign-off.** WS-A lead + WS-E lead + Production Director + **owner** (the gate). Register records MS-6. — **The owner's gate is SIGNED (DEC-8, 2026-11-13); the workstream evidence stands in the register (PH-8/MS-6, v1.66.0) and in the per-wave change-log rows.**

## Phase 9 — Content complete and feature complete

**Entry requirements.** Phases 2–8 accepted; the cut list drafted.

**Exit checklist.**
- [ ] SYSTEM-COMPLETION-CHECKLISTS.md: every row VERIFIED or consciously deferred with an owner note (zero rows in progress, zero undecided)
- [ ] R15's exclusions audited as *absences* (no karma meter; no quest-journal takeover; no real-world clock; no mission-gated streets; no memory-recovery cutscene system; no forgiveness ceremony; no ending screen after C6's window; no world state that forgets the ledger)
- [ ] The cut list signed by the owner
- [ ] Full gate stack green: tsc · vitest · build · 4-day E2E · story-spine lane · probe fleet · determinism replay · `auditWorld` on populated worlds
- [ ] Save-migration posture settled (v1-additive or v2-with-reader — never a silent transform)
- [ ] Error-recovery audit: every parse path total (the save.gd law at every layer)
- [ ] Freeze tagged; `AGENTS.md` phase line consciously updated with the hygiene test

**Sign-off.** Production Director + owner.

## Phase 10 — Alpha

**Entry requirements.** Phase 9 freeze; device access secured (owner dependency); DEC-9 (telemetry) decided.

**Exit checklist.**
- [ ] Device matrix executed: iPhone 11 / SE 3 / Galaxy A14 / desktop control — results rows in the register ("no evidence dir, no row")
- [ ] 60 fps iPhone 11/SE 3 · 30 fps floor Galaxy A14 (inherited budgets, re-ratified at alpha start — the re-ratification recorded)
- [ ] <120k tris · draw calls at/under ledger · <1.2 GB · boot <15 s · 25-minute thermal session passes
- [ ] 50 consecutive full playthroughs, zero crashes (the browser loop ≈ 4.2 h + the 30-minute soak)
- [ ] Funnel telemetry streaming honestly (sample size and unknowns stated; no invented numbers)
- [ ] All five doc-55 exit boxes' human/device halves executed and evidenced (device walk; 10-tester prep; fridge test if not yet; never-visitor 1-Second Law pass; crash loop)
- [ ] Zero BLOCKED defects; the register's defect section clean or owner-accepted

**Sign-off.** WS-F lead + Production Director + owner.

## Phase 11 — Beta and release candidate

**Entry requirements.** Phase 10 accepted; DEC-7 (rating) and DEC-10 (localization/VO) decided.

**Exit checklist.**
- [ ] 10-tester external playtest run per doc 07 §8 (5 never-NYC / 3 cozy / 2 residents); results ledger filled with observation/interpretation/recommendation separated
- [ ] §6 targets evidenced or variances owner-accepted: ≥85% reach postcard unaided · ≥70% share intent · ≥4/5 "looked after" · 25–35 min session · no drop before minute 12
- [ ] Closed-beta scale decided (legacy 500-tester gate re-ratified) and executed if approved
- [ ] Share pipeline end-to-end on device (Web Share + download fallback)
- [ ] Fridge test ritual: six postcards printed and kept (human box, logged)
- [ ] 1-Second Law never-visitor pass on 10 random paused frames (human box, logged)
- [ ] RC builds: all gates green per RC; performance re-verified

**Sign-off.** Production Director + owner.

## Phase 12 — Launch and post-launch

**Entry requirements.** Phase 11 RC; owner's launch decision; DEC-11 (distribution) decided.

**Exit checklist (launch).**
- [ ] Release live on the chosen channel; monitoring live
- [ ] Post-launch register cadence agreed (defect section active; worklog ongoing)
- [ ] KPI dashboards honest (the re-ratified targets; sample sizes stated)
- [ ] The No-FOMO Law audit on the live config (no energy systems, no live-service pressure, no paywalled lessons)

**Exit is ongoing; the register stays alive.**

---

## Rules that govern every checklist

1. **Human boxes are logged, not assumed.** Every manual ritual (fridge test, never-visitor pass, device walk) is recorded in the register with who ran it and when.
2. **A red gate is a red gate.** Report failure plainly (AGENTS.md §9). No phase closes with a known-red gate and no owner-accepted variance.
3. **Evidence beats intention.** A box without a pointer to evidence is an open box.
4. **Exit criteria are conjunctive.** All boxes, or an owner-signed variance note in the register — never a quiet skip.
5. **The floor gates re-run at exit.** The standing gates at the top of this document re-run on the exit commit, not just the entry commit.
