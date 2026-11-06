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

## Phase 2 — Runtime integration (the time valve) — THE NEXT PHASE

**Entry requirements.** Phase 1 accepted; DEC-1 ruling available for WP-2; work packages claimed per the governance doc (one owner each, disjoint file scopes).

**Exit checklist.**
- [ ] **WP-0** branch hygiene: `feat/player-upgrade` guard-checked and retired (or explicitly kept with a reason in the register); `feat/world-contract-foundation` deleted after merge
- [ ] **WP-1 (D-1)** the tick valve lives in `Game.frame`: dt→ticks (1 tick = 1 in-game minute), pause rules (menus/paper surfaces/arrival cinematic), the listening beat respected — with tick-determinism and pause tests
- [ ] **WP-2 (D-2)** the day-boundary machine runs the shipped morning rituals from the clock (diary note, restock, street shifts) — M3/M4 patterns re-keyed from story phase to clock day, tests re-pinned, **DEC-1's epoch mapping implemented behind one mapping function + a pinned test**
- [ ] **WP-3 (B-1)** walkers + cast read clock-keyed schedules via arbitration claims; Yuka steers to the claim's destination — with a clock-day probe asserting occupancy at pinned times (07:40 platform, 22:00 deli close)
- [ ] **WP-4 (D-3)** `Effect('money')` posts to the ledger behind the shipped confirm-gates; the sanctioned mirror holds (`player.moneyCents` ↔ `ledger.balance`); the E2E's $87→$112→$123 assertions pass **unchanged** — now traceable as transactions
- [ ] **WP-5 (WS-C, parallel)** R2 consequence ledger + R7 choice nodes implemented per doc 14 §7 step 2 with their guards (append-only; promises mature into omissions; structural options' flag signatures unique)
- [ ] **WP-6** UI: the calendar date and field-diary entries visible (the diary ink layer — two draw calls of UI per narrative/14 §4); dyslexia-friendly toggle may follow in Phase 5 but the diary must be *readable* by a player
- [ ] New bridge guards landed: no second clock, no second ledger, no second save (wc-14 §2 prohibition — asserted by test)
- [ ] Hot-path law: the valve and per-frame sim reads allocate nothing in the steady loop (§1c.3) — a code-review checkbox + a soak probe pass
- [ ] E2E green on the integrated tree; probe-perf delta 0/0/0; ledger rows unchanged
- [ ] The wc-17 Phase-1 exit sentence demonstrated in a browser: a roam afternoon where Idris appears at the platform at 07:40 and the deli closes at 22:00 — in-game time, zero story rewiring
- [ ] Save round-trip: a world save from any tick resumes at that exact tick (determinism law) and the story save still parses old saves unchanged

**Sign-off.** WS-D lead + WS-B lead (B-1) + Production Director. The register records MS-1.

**Must NOT begin before acceptance:** nav-graph migration (Phase 3), needs/mood dials (Phase 4), C0+ content (Phase 7 waves), any new location work.

## Phase 3 — Navigation and physical world integration

**Entry requirements.** Phase 2 accepted; DEC-2 (B13) closed or explicitly priced per wave; WS-A assignment claimed per governance (single writer on `World.ts`).

**Exit checklist.**
- [x] A-1: nav graph (nodes/edges/chokepoints) seeded from registry entrances/crosswalks; unit tests for connectivity + capacity — **LANDED 2026-11-06 on `feat/phase-3-navigation-building-access`: `sim/nav/` 401 nodes/444 edges/1 component; byte-identical determinism pin; validation clean (no edge through a footprint, no orphans); all 26 crosswalk legs; A* + grid index + bounded cache; the bound cast WALKS ROUTES (`?scenario=nav` 9/9 executed; routed-commute integration tests)** — *walkers migrated off hardcoded loops remains open (WP-3v owns the ambient migration; crowd/solidity/shuffle guards green throughout)*
- [x] A-2: door/stair resources mapped — **LANDED: `door:<buildingId>` on every nav door edge (the contract's arbitration-resource shape); 4-state door model; hours gating; enter/exit transitions recorded; the `PLACE_INACCESSIBLE` reachability function** — *arbitration CAPACITY claims at chokepoints remain open (WP-3v+; the `resourceRef` wiring is in place)*
- [ ] E-1: shipped anchors catalogued as `obj:` content entries; first building-variant pack through `validateManifest` green
- [ ] A-3: the registry→runtime geometry flip landed for at least the W0/W1 districts, one district per PR, each with a perf-ledger row and the ±0.1 m ghost gate green *(DEC-4 — the nav layer reads the registry read-side; the geometry flip stays deliberate)*
- [ ] Fidelity gate (registry-vs-engine agreement) re-pinned as the load test
- [x] No interaction regression: the full interaction set still enabled where it was (interactions.test.ts + probes) — **R6 hello interruption re-proven on the routed runtime (`probe-world-sim` steps 3–4, executed); E2E 0 failures (545 s)**
- [x] E2E + probe fleet green; perf ledger — **all executed on the branch: probe-world-sim 15/15 (76.9 s), probe-pause-set 11/11, probe-nav 9/9 (46.7 s), 4-day E2E 0 failures (545 s, console clean); perf re-baseline drawCalls 119/184/256 (zero drift) + nav-specific measurements recorded (`scripts/perf-nav.ts`, register SYS-WORLD-05)**

**Sign-off.** WS-A lead + WS-F (gates) + Production Director. Register records MS-2. *(Phase 3 exit remains OPEN on E-1, A-3 and the WP-3v walker migration — the A-1/A-2 foundation is landed and evidenced, not the whole phase.)*

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

**Entry requirements.** Phases 2 and 4 accepted; DEC-6 (seasonal pass scope) ruled; seasonal art dependency budgeted as its own wave (narrative/14 §4).

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

**Entry requirements.** Phases 3/4/6 accepted; **DEC-2 closed**; **DEC-8 (owner approval for expansion scope) granted**; per-wave draw-call pricing exists before any geometry lands.

**Exit checklist (per construction wave).**
- [ ] Wave priced: expected draw-call/tri delta in the ledger *before* the PR
- [ ] Ghost gates ±0.1 m green for every new mass; registry validator green (append-only ID grammar respected)
- [ ] Every new place has: purpose, interaction(s), probe evidence, Anti-Slop inspection
- [ ] Business records open with the place (Phase 6 machinery)
- [ ] E2E extended for any story-relevant place; perf ledger green after the wave
- [ ] The borough scoping study exists **as a document** and no borough geometry has been built without the owner gate

**Sign-off.** WS-A lead + WS-E lead + Production Director + **owner** (the gate). Register records MS-6.

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
