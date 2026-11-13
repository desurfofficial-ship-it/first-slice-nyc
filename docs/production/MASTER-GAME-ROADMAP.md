# MASTER-GAME-ROADMAP — FIRST SLICE: A New York Story

| | |
|---|---|
| Status | **Authoritative** — the one production roadmap (docs/production/README.md, "the one-roadmap law") |
| Owner | Production Director · ratified changes only |
| Baseline | v1.0, 2026-11-06, audited at git `69f8327` (main) + `feat/world-contract-foundation` + `feat/player-upgrade` |
| Operating law | [AGENTS.md](../../AGENTS.md) wins wherever it speaks; this roadmap sequences the work, it does not override the Laws |
| Story canon | [docs/narrative/](../narrative/) 00–15, baseline v1.0 · Build order: [docs/narrative/14 §7](../narrative/14-narrative-implementation-spec.md) |
| World geometry | [docs/data/world-registry.json](../data/world-registry.json) (construction truth) · Contract docs: [docs/architecture/world-contract/](../../docs/architecture/world-contract/) — on `feat/world-contract-foundation` until merged |

---

## 0. How to read this roadmap

- **§1** says what the game is becoming — the reconciled vision, including how the "open-world life simulation" intent and the shipped "life sim on an open block" direction fit each other.
- **§2** is the honest baseline: what exists, what is verified, what is open. Every status claim carries evidence.
- **§3** is the phase ladder, Phase 0–12. Each phase block carries the same fourteen fields: purpose, player-facing outcome, technical objectives, gameplay objectives, world and content objectives, required systems, dependencies, deliverables, testing requirements, performance requirements, risks, definition of done, exit criteria, and what must NOT begin before acceptance.
- **§4** separates sequential dependencies from parallel work (the six-workstream overlay).
- **§5** defines the playable milestones — including the vertical-slice evaluation target — because a technical milestone is not automatically a playable one.
- **§6** is the integration narrative: how the pieces become one game rather than a pile of subsystems.
- **§7** is the change law for this document.

Numbers below are never invented: they come from the repository (code, tests, probes, worklog, legacy docs), and where a budget is inherited from legacy docs it is marked "inherited — re-ratify at Phase 10".

---

## 1. What the complete game is intended to become

**The sentence:** a cozy, lowpoly, mobile-first New York life simulation where a newcomer (Leo Marsh, name customizable) arrives on one block of fictional upper Manhattan — Alder Heights — with $87 and holes in his memory; the player follows a six-chapter story spine (C0–C6, roughly 27 in-game months) about belonging, borrowed trust, betrayal, amends and hospitality, **or** taps Roam and lives on the block while the city runs on the in-game clock; every session ends with a Postcard; the game does not end at the fall — the amends economy and the continuation paths carry the life afterward.

**The reconciliation the whole team must hold onto.** The project brief speaks of an "open-world life simulation with a freely explorable New York." The repo's corrected direction (AGENTS.md, 2026-11) is sharper: **FIRST SLICE is not an open-world game — it is a life sim on an open block.** Both are true at different scopes, and the roadmap honors both in this order:

1. **The block is the heart.** Alder Heights (192 × 120 m design bounds; 5 streets, 2 blocks, the K line, the M121) is simulated deeply — time, people, businesses, memory — until it feels like a city.
2. **Free roam is a capability, never a genre swap.** The Roam law binds every agent: the story waits where you left it; ambient life carries no `step ===` dependencies; the city runs on your clock.
3. **Expansion grows outward from the block, gated by the owner.** Completing Alder Heights (Phase 8) precedes any Passport/borough conversation. AGENTS.md §8 reserves boroughs and scope growth for a human decision — this roadmap does not schedule what it is not authorized to schedule.
4. **The story is law.** C0–C6, the betrayal architecture, the amends economy and the Narrative Director's canon ([docs/narrative/](../narrative/)) are the spine; the sim exists so the story's consequences are real state, not prose.

**The complete game, concretely:** the shipped Day 1–4 opening, recontextualized as C0; chapters that advance on triggers plus in-game days (never real time); a population of named and background residents with schedules, work, money and memories simulated as pure state and embodied on the street; businesses that open, close and keep books; relationships that drift when ignored and mend when tended; seasons that change the block; choices whose consequences live in an append-only ledger the save can replay; the betrayal, the downfall, the $47,300 of amends, the self-portrait, and the light left on for the next stranger. One in-game day ≈ 5–8 minutes of play. The vertical slice philosophy survives all the way up: every milestone must be a coherent, enjoyable, independently testable slice — never a scaffold.

---

## 2. Where the project stands — the honest baseline (2026-11-06)

**Main (`69f8327`) — the shipped slice.** A playable Three.js + TypeScript + Vite vertical slice: 4 authored story days (33 story steps, MEET_ROSA → D4_POSTCARD), free roam over the open block, the M121 arrival bus and the Arrival cinematic, the K-line subway with two stations, Times Square, the half-court ball game, money math ($87 → $112 Day-1 rush → $123 Day-4, asserted by the E2E), save v1 with a corrupt-save→fresh law, postcard capture + album + Web Share, the Map notebook, wardrobe with the pick-is-for-keeps lock law, synthesized audio, a full DOM HUD. ~27,900 lines of TS across `web-three/src/`; **45 test files / 660 vitest tests green**; **122 Playwright harnesses** (78 probes, 37 diagnostics, 5 visual, plus the 4-day E2E driver `?autotest=1` — ~131 in-page checks, exit 0 = zero failures + clean console). CI (`.github/workflows/deploy-pages.yml`): typecheck + unit tests + build + GitHub Pages deploy on push to main. The 2026-11-06 narrative reboot is canon on main: docs/narrative/00–15 plus the spine of state implemented — R0 (hygiene guard re-pointed), R4 (`core/calendar.ts`, the in-game calendar, epoch Day 1 = October 1, Year 1), R3 (`core/fieldDiary.ts`, the append-only field diary engine) — state only, **no diary/calendar UI yet**.

**`feat/world-contract-foundation` (unmerged, 2 commits, 7 behind main) — Phase 1 foundations, implemented and green on the branch, not integrated.** The complete deterministic sim layer `web-three/src/sim/` (12 modules, ~3,300 lines): ids, rng, clock (epoch Day 1 = Tuesday, September 9, Y1 — the arrival), typed registry over `world-registry.json`, entities + business hours, schedule resolution, the arbitration engine (priority bands, capacity, S1–S7 scenarios), narrative validation + fallbacks, the economy ledger (integer cents, append-only), the content manifest + ABO bridge, WorldState with an ownership table and its own versioned save (`first_slice_world_v1`), and the reference-world manifest. **113 sim tests; the branch suite is 718/718.** Plus the 17 contract documents under `docs/architecture/world-contract/`. Known merge conflict: both main (R0) and the branch edited `tests/docs-hygiene.test.ts`.

**`feat/player-upgrade` (unmerged, 3 commits, 9 behind main) — superseded work.** Sprint/drag/zoom + permanent guards, cherry-picked to main via the player repo merge (`a9718e9`, `69f8327`: kinematics, wardrobe, ladder cadence, furnished home — vitest 660/660). The branch's remaining delta needs a guard-by-guard check, then retirement. Its content is functionally on main.

**What is NOT done (the honest columns):** no runtime integration of the sim layer (the time valve does not exist; `Game.frame` answers to no clock); no nav graph (walkers run authored Yuka loops); no per-NPC schedules beyond the day-keyed street-shift tables; no narrative machines R1/R2/R5–R14 (rails, ledger, choice nodes, independence sim, missable windows, chapter gating, postcard-kept, fluency, name propagation, guardrails, self-portrait, amends); no diary ink UI and no on-screen calendar; Day 5+ does not exist by design (`MAX_DAY = 4`, the rail's goodnight holds the light); no weather system; no spatial index (flat AABB list — fine at current scale); registry geometry is hand-transcribed into `World.ts` with tests guarding drift (the deliberate registry→runtime flip is unexecuted); **B13 open by owner's call** (Kestrel-rig draw calls 302 vs the 150 budget — six priced optimization rounds declined; governing rule: no rig above its previous ledger); the Phase-1 exit checklist's five human/device gates (device walk, 10 external playtesters, fridge test, never-visitor 1-Second Law pass, 50× crash loop) **have never run**; no funnel telemetry; no PR CI lane; probes and E2E run locally, not in CI.

---

## 3. The phase ladder

Sequencing summary: 0 → 1 → **2 (the time valve — next)** → 3 → 4 → 6, with 5 threaded from Phase 2 onward, 7's content waves threaded from Phase 3 (machines first, content per narrative/14 §7), 8 gated on owner approval, 9 → 10 → 11 → 12 strictly sequential at the end. The six workstreams (§4) map onto the phases; nothing in a later phase may key off real-world time, ever.

### Phase 0 — Production control and project baseline

- **Purpose.** Establish the one roadmap, the register, the governance, the risk ledger, and the next-phase plan — and capture the baseline evidence so "progress" is measurable from here on.
- **Player-facing outcome.** None directly; it protects every player-facing outcome after it.
- **Technical objectives.** One authoritative roadmap reconciled with the legacy tree; status register populated with evidence for every system; agent governance compatible with AGENTS.md and the world-contract workstream model (WS-A…F).
- **Gameplay / world objectives.** None (control phase).
- **Required systems.** Documentation system under `docs/production/`; the existing gates (`tsc --noEmit`, `vitest run`, `npm run build`, E2E + probes) as the evidence machinery.
- **Dependencies.** The repository audit (done, 2026-11-06).
- **Deliverables.** The seven production docs + this README index; AGENTS.md pointers to `docs/production/`; a worklog entry; baseline gate run recorded in the register.
- **Testing requirements.** `tsc` clean · vitest 660/660 (44 files) · build OK on the docs commit; `docs-hygiene` green after the AGENTS.md edit.
- **Performance requirements.** None new; record the standing ledger (probe-perf 119/184/256; ledger rigs PLAZA 302 / CART_CORNER 236 / SYCAMORE 84→78 / TIMES_SQ 52 / PLATFORM_A 108; census gate: Kestrel ≤150, intersection ≤250).
- **Risks.** Docs drift (mitigated: hygiene test + register-update law); two-roadmap confusion (mitigated: one-roadmap law above).
- **Definition of done.** All seven docs merged on a branch and pushed; AGENTS.md points at them; register carries a status + evidence for every system in SYSTEM-COMPLETION-CHECKLISTS.md.
- **Exit criteria.** Owner ratifies the baseline (one review); gates green on the merge commit; register v1.0 shipped.
- **Must NOT begin before acceptance.** Any Phase 2 work package (WP-1…WP-5) — agents must not start the time valve against an unratified roadmap.

### Phase 1 — Architecture and simulation foundation *(implemented on a branch — acceptance = the merge)*

- **Purpose.** Give the game its simulation contracts: deterministic time, typed world registry, entity/schedule/arbitration/narrative/economy/content state machines, and a versioned world save — as pure, testable data beneath the shipped game.
- **Player-facing outcome.** None yet by design (zero game-code changes; the E2E is green by construction).
- **Technical objectives.** `web-three/src/sim/` (12 modules) + 113 contract tests + 17 contract docs; WorldState ownership table; `first_slice_world_v1` beside (never inside) `first_slice_save_v1`.
- **Gameplay / world objectives.** None (foundation).
- **Required systems.** All of `sim/`; the registry JSON as semantic source.
- **Dependencies.** Narrative canon (done); registry data (done).
- **Deliverables.** The branch `feat/world-contract-foundation` — code exists; **acceptance is its merge to main**: resolve the `docs-hygiene.test.ts` collision (both sides re-pointed R0; keep one re-point, both intents), reconcile the duplicate R0, land the 17 contract docs at `docs/architecture/world-contract/`, update wc-17's status table (Phase 0 → merged).
- **Testing requirements.** Merged tree: `tsc` clean · vitest ≈ 773/773 (660 + 113, minus any dedup) · build OK · 4-day E2E green on the merge commit · docs-hygiene green.
- **Performance requirements.** Byte-identical game code path (the branch touches no shipped systems) — probe-perf unchanged.
- **Risks.** Merge drift as main moves; two R0 patches colliding; the two-epoch landmine (see RISKS: `core/calendar.ts` Oct 1 vs `sim/clock.ts` Sept 9) — merging does NOT resolve the epochs, Phase 2 WP-2 does.
- **Definition of done.** Branch merged or deliberately rebased; suite green including sim tests; worklog entry naming every inheriting workstream.
- **Exit criteria.** All gates green on main with `sim/` present; contract docs reachable from the tree; register rows PROMPT-1…8 and WORLD-9/19 upgraded to IMPLEMENTED→INTEGRATED as appropriate.
- **Must NOT begin before acceptance.** WS-D bridge work (the time valve), WS-B bindings, WS-C machine builds — all assume `sim/` on main.

### Phase 2 — Runtime integration (the time valve) — **the next approved phase**

- **Purpose.** Make the running game answer to in-game time: one tick valve in `Game.frame`, the day-boundary machine, clock-keyed lives, and money that leaves a traceable ledger trail — with zero story rewiring.
- **Player-facing outcome.** The block visibly runs on the clock: Idris appears at the platform at 07:40; the deli closes at 22:00; a roam afternoon feels like an afternoon; the money HUD is backed by ledger transactions; the calendar date and the field diary are finally visible in the UI.
- **Technical objectives.** D-1: dt→tick valve (one tick = one in-game minute; pause rules; the listening beat respected). D-2: day-boundary machine running the shipped morning rituals (diary note, restock, street shifts) from the clock — M3/M4 patterns re-keyed from story phase to clock day, tests re-pinned. B-1: walkers + cast read clock-keyed schedules; arbitration owns activity ownership (Yuka steers to the claim's destination). D-3: `Effect('money')` posts to the ledger behind the shipped confirm-gates; the E2E's $87→$112 math becomes traceable transactions.
- **Gameplay objectives.** Nothing already shipped may change behavior (the story machine, roam, purchases keep their shapes); the world simply starts keeping time. The 15–20-minute roam evaluation session (§5, MS-1) becomes possible.
- **World and content objectives.** The reference world manifest's people occupy their scheduled places at their scheduled times; business hours become live open/close transitions.
- **Required systems.** sim/clock, sim/schedule, sim/arbitration, sim/economy, sim/state (all from Phase 1) + Game.frame wiring + UI surfaces for calendar/field diary.
- **Dependencies.** Phase 1 merged; **DEC-1 (epoch reconciliation) ruled before WP-2 lands** (owners: Narrative Director + lead engineering — see PRODUCTION-RISKS-AND-DEPENDENCIES.md).
- **Deliverables.** Work packages WP-0…WP-6 in [NEXT-PHASE-EXECUTION-PLAN.md](NEXT-PHASE-EXECUTION-PLAN.md); permanent guards per AGENTS.md §1c.1; worklog + register updates.
- **Testing requirements.** New sim↔runtime bridge tests (tick determinism, pause, day boundary, money-post traceability); full existing suite green (no regression in state/interactions/save guards); E2E green **including its exact money assertions**; new probe: a clock-day probe asserting schedule occupancy at pinned times (07:40 platform; 22:00 deli close).
- **Performance requirements.** The valve must be allocation-free in the steady loop (AGENTS.md §1c.3 hot-path law); no rig above its previous ledger row; probe-perf delta 0/0/0 accepted as the budget.
- **Risks.** Frame-order regressions (the cab-stale-frame class); double-writes between story money and ledger (the sanctioned mirror + `auditWorld` must hold); epoch confusion shipping as subtle schedule bugs (DEC-1 first).
- **Definition of done.** All WPs landed with guards; E2E + probes green; worklog entry; register rows re-statused (SIM-TIME → INTEGRATED; etc.).
- **Exit criteria.** The wc-17 Phase-1 exit sentence, demonstrated: a roam afternoon where Idris appears at the platform at 07:40 and the deli closes at 22:00 — in-game time, zero story rewiring — plus calendar + field diary visible on screen and the ledger reconciling to the penny.
- **Must NOT begin before acceptance.** Nav-graph migration (Phase 3), needs/mood dials (Phase 4), any C0+ content (Phase 7 waves) — all consume the valve.

### Phase 3 — Navigation and physical world integration

- **Purpose.** Give bodies a real map and the world its semantic skeleton: nav graph from the registry, door/stair resources with capacity, shipped anchors catalogued as content, and the deliberate flip to registry-driven geometry.
- **Player-facing outcome.** Walkers stop teleporting between authored loops and walk plausible routes; interiors and doors behave like resources (open/close, occupancy); the world stops depending on hand-transcribed coordinates.
- **Technical objectives.** A-1: nav graph (nodes/edges/chokepoints) seeded from registry entrances/crosswalks; walkers migrate off hardcoded loops with crowd tests green. A-2: door/stair resources mapped (`door:KTN-05`…); arbitration capacity live at the shipped chokepoints. E-1: shipped anchors catalogued as `obj:` content entries; first building-variant pack through `validateManifest`. A-3 (deliberate flip): building geometry loads from the registry at runtime, the fidelity gate re-pinned as the load test.
- **Gameplay objectives.** No player-visible regression; interactions stay on the shipped registry pattern.
- **World and content objectives.** Registry becomes the runtime semantic + geometric source (construction truth and running truth converge).
- **Required systems.** sim/registry consumers, new `sim/nav`, arbitration capacity, content manifest.
- **Dependencies.** Phase 2 (arbitration live in the frame); DEC-4 (registry-as-runtime-source, already adopted by wc-02 D3 — confirm at WP kickoff).
- **Deliverables.** `sim/nav` + world bindings; ghost gates re-pinned; building-variant pack; register updates.
- **Testing requirements.** Crowd/solidity/shuffle guards green; registry validator + ghost probes (±0.1 m) green; new nav-graph unit tests (connectivity, chokepoint capacity); E2E green.
- **Performance requirements.** No rig above its previous ledger; path queries allocation-free; B13 decision (DEC-2) should be closed before adding geometry (see risks).
- **Risks.** The registry→runtime flip touches `World.ts` (6,556 lines — the most dangerous file in the repo); mitigate behind the fidelity gate, flip one district at a time, ledger row per flip.
- **Definition of done.** Walkers on the graph; capacity live; one building-variant pack validated; geometry flip landed for at least the W0/W1 districts with the fidelity gate green.
- **Exit criteria.** The reference world's people physically occupy their manifest places (wc-17 Phase-2 exit).
- **Must NOT begin before acceptance.** Needs/mood dials and large population growth (Phase 4) — they multiply path queries.

### Phase 4 — Living population and NPC simulation

- **Purpose.** Turn scheduled bodies into residents: persistent records, fidelity tiers that breathe, independence, relationships, and the first needs-shapes.
- **Player-facing outcome.** The same faces recur on plausible schedules; ignoring people has visible consequences (R5); the street feels inhabited rather than populated; background walkers carry stable identities without costing the frame.
- **Technical objectives.** B-2: tier up/down without impossibilities (full/background/abstract are scheduling decisions, never state differences). R5 independence sim: per-major availability, mood (steady/strained/bitter + recovery), calendars, one independent decision per chapter; ignoring Leo for a chapter changes ≥3 majors in documented directions (doc 07's "without the protagonist" lines are the spec). B-3: relationship mutations as world events. Needs/mood/ambition **shapes** first, dials later (wc-17 deferral stands).
- **Gameplay objectives.** Greeting/recognition behaviors (the familiar-face pattern, generalized); social interactions that leave memory traces.
- **World and content objectives.** The 16 majors (doc 05) + supporting roster have records, homes, workplaces, calendars.
- **Required systems.** sim/entities + sim/life (new), arbitration, relationships, memory.
- **Dependencies.** Phase 2 (schedules live), Phase 3 (nav for plausible routes); doc 05/07 as content canon.
- **Deliverables.** `sim/life` module + bindings; independence tests per doc 14 R5 acceptance; register updates.
- **Testing requirements.** Tier round-trip tests (down-up loses/invents no fact); independence-direction tests; soak gates (probe-w4-soak law: ≥1800 sim-s, zero failures) at increased population; crowd guards green.
- **Performance requirements.** Population growth must hold the draw-call ledger (instancing/fidelity-tier rules); sim step stays inside the frame budget measured by the valve (Phase 2 gives the measurement).
- **Risks.** Sim cost at scale (measure before growing); uncanny behavior (the Anti-Slop Gate: no fake NPC interactions); scope creep toward full social-network sim (out of scope — the bible's dials only).
- **Definition of done.** Majors live on schedules with independence ticks; background tier working; guards landed.
- **Exit criteria.** A multi-day unattended run produces majors whose availability/mood moves match doc 07 defaults; soak + gates green at the new population.
- **Must NOT begin before acceptance.** Business P&L (Phase 6) and C1+ content (Phase 7) that assume living residents.

### Phase 5 — Player freedom and core gameplay systems (completion pass)

- **Purpose.** Finish the player-facing verb set the spine needs: identity, voice, fluency, guardrails, and the transactions/inventory polish that the chapters assume — **preserving every shipped system** (roam, interactions, court, subway, purchases already work; this phase completes, never replaces).
- **Player-facing outcome.** The chosen name reaches every line and diary entry (R11); dialogue tables select by fluency tier with the "look at you" payoff available in C4 (R10); the sensitive-content guardrails exist before any heavy scene ships (R12); inventory and transactions read cleanly against the ledger.
- **Technical objectives.** R10 fluency & voice states (Tourist→Local ladder persisted; tables select by tier); R11 name/look propagation (surname-gating as content-table convention; `surnameKnown` flag); R12 guardrails (one-time opt-in resource note at first firing of F7/therapy/C5-investigation; no flashback machinery for the Lost Year; amnesia rules asserted in tests — RECALL never upgrades to FACT by elapsed time alone); inventory/resource plumbing on the ledger mirror; dyslexia-friendly plain-type toggle (narrative/14 §4 accessibility note).
- **Gameplay objectives.** The free-roam verb set covers: greet, buy, eat, drink, play, ride, sit, read, photograph (postcard), roam; each leaves a ledger/state trace the sim can use later.
- **World and content objectives.** Dialogue tables for shipped interactions gain fluency/name variants; no new locations required.
- **Required systems.** core/content tables, GameState flags, sim/state flags bridge, UI (diary ink + calendar land in Phase 2's WP; this phase consumes them).
- **Dependencies.** Phase 2 (clock + ledger live); narrative/14 §7 steps 6–7 sequencing (C0 pack first if it lands concurrently).
- **Deliverables.** R10/R11/R12 implementations + guards; UI accessibility toggle; register updates.
- **Testing requirements.** R11 propagation test (no un-named line in diary/spoken/text-message surfaces); R12 amnesia-rule tests; determinism test (same state → same dialogue selection); full suite + E2E green.
- **Performance requirements.** Dialogue-table lookups are data reads; no hot-path changes; ledger rule stands.
- **Risks.** Content volume (voice variants multiply — doc 13's voice table is the constraint); guardrail softening is a canon violation (doc 00 §6: any build that softens F7's rules is a violation — the tests make that unshippable).
- **Definition of done.** All three R-requirements implemented with their permanent guards; accessibility toggle shipped.
- **Exit criteria.** A tester can rename the protagonist, change fluency tier, and see every affected surface update — verified in a browser run, not by unit tests alone.
- **Must NOT begin before acceptance.** C2+ dialogue-heavy content (Phase 7 waves) that assumes fluency/name machinery.

### Phase 6 — Living neighborhood and world simulation

- **Purpose.** Make the block economy and memory real: businesses that operate, goods that flow, relationships that drift, windows that miss you, months that change the street.
- **Player-facing outcome.** Shops open and close for real reasons; a bodega you neglect cools toward you; missed moments become changed worlds, never nags (R6's No-FOMO compliance); seasons change the block (doc 12 §5: from C1 the calendar drives the nor'easter, first snow, summer, the hot late summer of the fall, snow on the hoarding).
- **Technical objectives.** Businesses: hours → open/close transitions → P&L from ledger evidence (wc-17 Phase 4); goods/resource flows on the economy contract; relationship drift with events; the block remembers across in-game months; R6 missable-event scheduler (`MissableWindow{opensAt,closesAt,onMiss}`; no window re-opens; onMiss writes a world change the city diary may mention once); season cuts as the named `seasonCut` transition consuming calendar days and running the diary montage + postcard + city-diary whisper (calendar.ts's detector is already built and unused — wire it); environment section of WorldState begins earning its keep (weather epoch, minimal).
- **Gameplay objectives.** Neighborhood routines the player can join or miss; the block's reaction to the player's patterns (the morning-after diary pattern, generalized and clock-driven).
- **World and content objectives.** Business records for the shipped shops; seasonal dressing as its own art/tech phase (narrative/14 §4: "budget it as its own phase (W6 candidate), gated behind chapter states, reusing existing weather/leaf systems" — the leaf system exists; snow/rain do not).
- **Required systems.** sim/economy, sim/entities (businesses), R6 windows, environment, seasonal dressing.
- **Dependencies.** Phases 2 (valve/ledger), 4 (residents as customers/staff); DEC-6 (seasonal pass scope, narrative open question — owner).
- **Deliverables.** Business ops + P&L reports; R6 + guards; season-cut montage machinery; register updates.
- **Testing requirements.** P&L derived from ledger (never hard-coded); window-never-reopens test; season-cut determinism; multi-month unattended sim audit (`auditWorld` green across month boundaries).
- **Performance requirements.** Seasonal dressing changes are batched/instanced; the B13 lesson applies — every new dressing wave prices its draw calls into the ledger before landing.
- **Risks.** The largest visual dependency of the roadmap (the seasonal pass); scope creep toward full economic simulation (the contract says: evidence-driven pricing later, shipped prices only in tests).
- **Definition of done.** One in-game month of unattended sim produces documented, auditable change (businesses, relationships, a season cut) with zero real-time keys.
- **Exit criteria.** wc-17 Phase-4 exit satisfied: businesses operate, relationships drift, the block remembers across months, and nothing keys to real-world days.
- **Must NOT begin before acceptance.** C5/C6 downfall content (Phase 7 late waves) whose cascade reads business and relationship state.

### Phase 7 — Narrative and story integration (machines from Phase 2; content waves to here)

- **Purpose.** Build the C0–C6 spine as real state: rails, ledger, choices, chapters, postcards-as-letters, self-portrait, amends — following docs/narrative/14 §7's order exactly. This phase *starts* as early as Phase 2 (R2+R7 are pure state and run in parallel there) and *completes* here with the content waves.
- **Player-facing outcome.** The story the Narrative Director wrote, playable: the arrival week (C0) firing through the live world; the appetite ladder; Betrayal I (the Compact break) and Betrayal II (Kev and the jobs number); the five-trigger cascade; the shop lost; $47,300 of amends with per-row payment verbs; the self-portrait that never lies twice the same way twice; "Day 1 again" at the terminal — and the game continues.
- **Technical objectives.** R1 rails engine (six rails as data; fire-while-roaming; observable in the city diary, never a banner); R2 consequence ledger (append-only; promises mature into omissions; C5 cascade reads only ledger + relationships, deterministic from save); R7 choice nodes (structural options' downstream flag signatures unique — the no-fake-choices rule is a test); R8 chapter gating (trigger + minimum in-game days; a hundred in-game roam days in C1 yield every C1 event and no C2 content early); R9 postcards gain `kept` + the single C5 `sent` event; R13 self-portrait (pure function of saved state; append-only versions); R14 amends economy (doc 09 §4's 19 rows as data; restitution total derived from the table — $61,500/$47,300 pinned by test).
- **Gameplay objectives.** C0 against the shipped opening (the cart handover keeps its deliberate mishear K1; the Day-4 stranger beat becomes the hospitality thesis); then C1–C2, then C3–C6 waves per §7's build order.
- **World and content objectives.** ~120–160 diary entries, ~40 person cards, K1–K8 contradictions, ~60 spine scenes, first-session pack, ~10 therapy sessions, ~19 amends beats (narrative/14 §5 scheduling estimate — for planning, not a promise).
- **Required systems.** Everything Phases 2–6 built (the machines ride the valve, ledger, residents, businesses).
- **Dependencies.** narrative/14 §7 order is binding: R0/R4/R3 (done) → R2+R7 → R1+R8 → R5 → R6 → C0 → R9–R12 → C1–C2 → R13–R14 → C3–C6, seasonal pass parallel after C2.
- **Deliverables.** Narrative machine modules + content packs + guards; register updates per wave.
- **Testing requirements.** narrative/14 §6's minimum set: diary append-only; tag integrity (no silent RECALL→FACT); rails fire-once; ledger determinism from save; windows never reopen; no real-world dates in save or prose; name propagation; self-portrait determinism; amends sums. Every wave ships with its laws pinned.
- **Performance requirements.** The diary is data (two draw calls of UI); no scene cost from narrative state; content waves re-run the perf ledger.
- **Risks.** Content volume vs. quality (the voice laws are the filter); the C5 cascade's dependence on ledger+relationship integrity (Phases 4/6 exit criteria exist for this reason); emotional-content review (rating/profanity pass is narrative open question — DEC-7).
- **Definition of done.** C0–C6 playable end-to-end; all narrative tests green; the E2E extended with a story-spine lane.
- **Exit criteria.** The full spine plays in a browser from a fresh save: arrival → C6's window → continuation content reachable; no content reads as a quiz; the fridge-test ritual run on the spine's six postcards.
- **Must NOT begin before acceptance.** Phase 9's completeness claim; Phase 11's external playtests (unstable content wastes testers).

### Phase 8 — City production and expansion (owner-gated)

- **Purpose.** Finish Alder Heights as a place, then — only with the owner's explicit approval (AGENTS.md §8) — open the Passport conversation.
- **Player-facing outcome.** The neighborhood's remaining designed buildings and interiors become purposeful places; the five-borough progression becomes *scopable* (not yet built).
- **Technical objectives.** Complete the registry's designed-but-unbuilt set (43 buildings designed / 12 shipped masses at baseline; 10 interiors designed / the shipped subset) in construction waves W2/W3-pattern with per-wave draw-call pricing; every new place needs a purpose and an interaction (AGENTS.md working rules); only after owner sign-off: borough scoping study (reference-world manifest pattern, Slop New York as reference-only, never ingesting OSM/NYC-Open-Data geodata).
- **Gameplay objectives.** New loops for new places, each with a meaningful experience or consequence.
- **World and content objectives.** Alder Heights complete per its design package; identity guide (doc 43 legacy: "forever 5:45 PM", first week of October) holds.
- **Required systems.** Phase 3's registry-driven construction; Phase 6's business ops (new places open with books).
- **Dependencies.** Phases 3, 4, 6; **DEC-2 (B13) closed** — no wave may ship above its priced ledger row; **DEC-8 (expansion approval)** — the owner gate.
- **Deliverables.** Construction waves with probes; building-variant packs through the manifest; the borough scoping study (document only, if approved).
- **Testing requirements.** Ghost gates ±0.1 m; interaction probes per new place; E2E extended for any story-relevant new place; perf ledger per wave.
- **Performance requirements.** The registry flip + instancing laws make expansion affordable; B13's lesson is the standing rule: price first, build second.
- **Risks.** The historical 2.7× draw-call overshoot (baseline 402 → budget 150) is the reason this phase is gated on perf decisions; scope failure ("expansion without the bible is scope failure" — AGENTS.md §0).
- **Definition of done.** Every designed place exists, is reachable, has purpose, and carries its probe evidence.
- **Exit criteria.** Alder Heights complete; owner decides the borough question with the scoping study in hand.
- **Must NOT begin before acceptance.** Any borough geometry or "Manhattan content-complete" claims (legacy doc 06's Phase 2 wording) without the owner gate.

### Phase 9 — Content complete and feature complete

- **Purpose.** Freeze the game's shape: all systems verified, all content in, the cut list executed, the save story settled.
- **Player-facing outcome.** The complete game exists on `main`, playable start to continuation content, at slice quality.
- **Technical objectives.** Every row of SYSTEM-COMPLETION-CHECKLISTS.md is VERIFIED or consciously deferred with an owner note; save schema v2 (if the world save needs promotion) done behind the v1-additive law; error-recovery paths audited end to end.
- **Gameplay objectives.** Feature complete per docs/narrative/14 R15's "what NOT to build" list — the exclusions are as binding as the inclusions (no karma meter, no quest-journal takeover, no real-world clock, no mission-gated streets, no memory-recovery cutscenes, no forgiveness ceremony, no ending screen after C6's window, no world state that forgets the ledger).
- **World and content objectives.** Content complete: C0–C6 + continuation; every shipped place purposeful; the Map complete.
- **Required systems.** All of the above.
- **Dependencies.** Phases 2–8 accepted.
- **Deliverables.** Completeness audit against the checklists; the cut list (what was consciously not built, with owner sign-off); freeze tags.
- **Testing requirements.** Full gate stack: tsc · vitest (projected 900+ tests) · build · 4-day E2E · story-spine E2E lane · probe fleet · determinism replay harness (WS-F) · `auditWorld` on populated worlds.
- **Performance requirements.** All ledger rows at or under budget; boot < 15 s (inherited — re-ratify); the repo-runnable halves of doc 55's five exit boxes demonstrably green.
- **Risks.** The temptation to keep building (the slice-guardian skill exists for this); unfrozen content blocking Alpha.
- **Definition of done.** Zero systems IN PROGRESS; zero UNDECIDED scope items; the register shows a coherent VERIFIED world.
- **Exit criteria.** Owner declares content+feature complete against the checklists; the freeze is tagged.
- **Must NOT begin before acceptance.** Alpha's device-matrix spend (Phase 10) on an unfrozen build.

### Phase 10 — Alpha

- **Purpose.** Prove the game on real hardware and real sessions: stability, performance, telemetry, the human/device halves that have never run.
- **Player-facing outcome.** The game runs beautifully on the phones it was designed for (cozy lowpoly, vertical-first, touch law).
- **Technical objectives.** Device matrix executed (iPhone 11 / iPhone SE 3 / Galaxy A14 / desktop control — the doc 07 §8 matrix); 50-consecutive-playthrough crash loop (doc 55's browser loop ≈ 4.2 h + the 30-min soak); funnel telemetry implemented and honest (the doc 56 §3 gap: nothing emits funnel events today — DEC-9 owns design + privacy); performance on the floor device (30 fps Galaxy A14 — inherited, re-ratify); boot < 15 s; < 1.2 GB memory; 25-minute thermal session.
- **Gameplay objectives.** Session shape holds on device: one in-game day ≈ 5–8 minutes; the 15–20-minute evaluation session and the 25–35-minute authored path both comfortable.
- **World and content objectives.** None new; alpha tests what exists.
- **Required systems.** Telemetry (minimal, privacy-respecting, No-FOMO-compliant — never paywalled pressure); crash reporting; device probe harness.
- **Dependencies.** Phase 9 freeze.
- **Deliverables.** Device matrix results; telemetry spec + implementation; alpha bug ledger (the docs/51 pattern, reborn as the production register's defect section).
- **Testing requirements.** Everything repo-runnable re-run on every release candidate; device evidence rows in the register ("no evidence dir, no row" — doc 56's law).
- **Performance requirements.** The doc 07 §8 budgets are the acceptance numbers, re-ratified once at alpha start: 60 fps iPhone 11/SE 3 · 30 fps floor Galaxy A14 · <120k tris · draw calls per the ledger (the 150 aspiration stays an aspiration until B13's owner call closes it) · <1.2 GB · <15 s boot · 25-min thermal.
- **Risks.** No device farm exists in the repo (doc 55's honest gap) — hardware access is an owner dependency; telemetry privacy decisions (DEC-9).
- **Definition of done.** All five doc-55 exit boxes have their human/device halves executed and evidenced.
- **Exit criteria.** Zero red gates on device; crash-free sessions over the loop; telemetry streaming; owner accepts alpha.
- **Must NOT begin before acceptance.** External beta recruitment (Phase 11) on an unstable build.

### Phase 11 — Beta and release candidate

- **Purpose.** Put the game in front of strangers and prove the design promise: never-visitors fall for the block, and they share it.
- **Player-facing outcome.** The beta cohort plays the real game; their postcards are real.
- **Technical objectives.** External playtest with 10 testers (doc 07 §8: 5 never-NYC / 3 cozy / 2 NYC residents) against the §6 targets — ≥85% reach the postcard unaided, ≥70% share intent, ≥4/5 "looked after", 25–35 min session, no drop before minute 12; then the 500-tester closed beta (legacy doc 06's gate — re-ratify scale); share pipeline end-to-end on device (Web Share + download fallback); localization/VO decision (DEC-10); rating/profanity pass (DEC-7).
- **Gameplay objectives.** The playtest-analysis skill's law: observation vs interpretation vs recommendation; never invent numbers beyond the data.
- **World and content objectives.** Beta-feedback content fixes only (no new systems in beta).
- **Required systems.** Distribution build; feedback capture; the playtest script (doc 02, 30 minutes, hard stop 35).
- **Dependencies.** Phase 10.
- **Deliverables.** Playtest results ledger (the empty doc 56 §6 ledger, finally filled); prioritized changelists; RC builds.
- **Testing requirements.** The fridge test (six postcards, printed, kept); the 1-Second Law never-visitor pass (10 random paused frames — `probe-one-second.mjs` frames exist; the human pass has not run).
- **Performance requirements.** Device targets re-verified per RC.
- **Risks.** Share rate is a design quality, not a marketing dial ("if share rate is low, the postcards aren't good enough yet — fix the postcards").
- **Definition of done.** Targets met or owner-accepted variances recorded; RC stable for release.
- **Exit criteria.** Beta gates green or explicitly accepted; the owner declares RC.
- **Must NOT begin before acceptance.** Launch marketing/soft-launch spend (Phase 12).

### Phase 12 — Launch and post-launch

- **Purpose.** Ship it, keep the light on, and grow honestly.
- **Player-facing outcome.** Strangers who have never been to New York fall in love with a block of it, one postcard at a time.
- **Technical objectives.** Release distribution (web-first GitHub Pages is shipped reality; store packaging is an owner decision — DEC-11); crash monitoring; live-ops discipline that honors the No-FOMO Law (monetization is string lights and chair styles — never a borough, never knowledge; any monetization proposal stops and asks a human, AGENTS.md §8).
- **Gameplay objectives.** Post-launch content follows the hospitality law (the endgame is keeping the light on for the next stranger).
- **World and content objectives.** Continuation content, seasonal life, and — only per the owner's Phase-8 decision — the boroughs (Queens/Bronx/Staten Island trains were legacy doc 06's Phase-6 sketch; nothing here schedules them).
- **Required systems.** Distribution, monitoring, update pipeline.
- **Dependencies.** Phase 11 RC + owner's launch decision.
- **Deliverables.** Release; post-launch register cadence; live-ops worklog.
- **Testing requirements.** Release-candidate gates on every update; the guard suite is permanent — the city forgives, the roadmap doesn't need spin.
- **Performance requirements.** Device budgets re-verified on every content update.
- **Risks.** Live-service creep against the No-FOMO Law (a stop-and-ask-a-human trigger by definition).
- **Definition of done.** The game is out and healthy by its own KPIs (re-ratified at alpha: legacy doc 06's D1 ≥45% / D7 ≥18% / D30 ≥8% / share ≥25% DAU / crash-free ≥99.6% are *inherited targets to re-ratify*, not commitments).
- **Exit criteria.** Ongoing — the roadmap ends where the neighborhood begins.

---

## 4. Parallel versus sequential — the workstream overlay

Six workstreams (adopted from the world-contract framework, wc-14) carry the phases. The phase ladder is the *what and when*; the workstreams are the *who and how in parallel*. Full deals, ownership tables and conflict rules live in [AGENT-DEVELOPMENT-GOVERNANCE.md](AGENT-DEVELOPMENT-GOVERNANCE.md).

| WS | Scope | Active phases | Hard sequential deps |
|----|-------|---------------|----------------------|
| **A — Spatial World** | nav graph, registry→runtime geometry, doors/stairs/capacity, districts, interiors | 3, 8 | after Phase 2 (arbitration live) |
| **B — NPC Simulation** | lives on schedules, fidelity tiers, independence, relationships, memory | 2 (B-1), 4 | after Phase 2; nav (A) before growth |
| **C — Narrative** | R-machines per doc 14 §7, content waves C0–C6, diary/map | 2 (R2+R7), 5, 7 | machines after Phase 1; content after its machines |
| **D — World Simulation** | the time valve, day boundaries, ledger bridge, businesses, world events | 2, 6 | Phase 1 merged; DEC-1 ruled |
| **E — Content & Assets** | manifests, building variants, furniture packs, seasonal dressing | 3, 6, 8 | after the systems that consume entries |
| **F — System Integration & Quality** | gates, world audit, determinism replay, probes, CI, perf ledger | all phases | runs continuously; owns no product code |

**Genuinely parallel today** (once Phase 1 merges and Phase 2 opens): WS-D's valve work and WS-C's R2+R7 state machines touch disjoint files (`Game.frame`/`sim/state` wiring vs `core/`-seam narrative state) and may proceed simultaneously; WS-E's content cataloguing runs any time after Phase 1; WS-F's CI lane work is independent of all of them.

**Never parallel:** two workstreams editing the same contract shape without governance (wc-14 §4); WS-B population growth before WS-A's nav graph; any two agents in `Game.ts`/`World.ts` (single-writer law — see governance); story content ahead of its machine (narrative/14 §7 order is binding).

---

## 5. Playable milestones and the vertical slice

A technical milestone is not automatically a playable milestone. Each milestone below is a *demonstrable in a browser by a human* bar, and each carries the vertical-slice philosophy forward: coherent, enjoyable, independently testable.

**The evaluation target (standing law):** every milestone is evaluated with **15–20 minutes of meaningful play** — a fresh save, a browser, no instructions beyond the game's own. "Meaningful play" means the player can: follow or refuse the current story beat; roam freely while the clock runs; spend money that the world records; discover a place the Map remembers; and end the session with a Postcard that reads the day. (The fully authored first session remains 25–35 minutes — the evaluation target is the minimum honest path, not the whole script.)

| MS | Name | At the end of | The player can… | Demonstrated by |
|----|------|---------------|-----------------|-----------------|
| MS-0 | **The Shipped Slice** | main today (shipped) | Play Days 1–4, roam the open block, ride the K line, shoot half-court, buy things, keep and share a postcard; a save survives | 4-day E2E green (e2e.mjs, ~131 checks); probe fleet; 660 vitest; GitHub Pages deploy. *Human/device halves still owed (Phase 10).* |
| MS-1 | **The Clock Street** | Phase 2 | Spend a roam afternoon where the street keeps time — Idris at the platform at 07:40, the deli closing at 22:00 — see the date and the field diary in the UI, and trace every dollar | WC-17 Phase-1 exit sentence demonstrated + clock-day probe + ledger reconciliation + E2E green |
| MS-2 | **The World Reads the Registry** | Phase 3 | Watch walkers take real routes through doors and chokepoints; the world's geometry answers to the registry | Ghost gates + crowd guards green; manifest-place occupancy demo |
| MS-3 | **The Block Has People** | Phase 4 | Meet the same faces on their schedules; feel the cost of ignoring someone; a multi-day unattended sim leaves documented, plausible lives | Independence-direction tests + soak at scale + browser walkthrough |
| MS-4 | **C0 Fires** | Phase 7 stage 1 | Play the arrival week (C0) over the shipped opening with rails and ledger live; choices leave unique flag signatures | `validateEvent` on the live world; first missable-window world change |
| MS-5 | **The Spine Playable** | Phase 7 complete | Play C0→C6 with the betrayal, the fall, the amends, the self-portrait — and continue afterward | Story-spine E2E lane + fridge-test ritual on the spine's postcards |
| MS-6 | **Alder Heights Complete** | Phase 8 | Visit every designed place and find purpose in each | Construction-wave probes + perf ledger green |
| MS-7 | **Content & Feature Complete** | Phase 9 | Play the whole game; nothing is a stub | Completeness audit + determinism replay + full gate stack |
| MS-8 | **Alpha** | Phase 10 | Play it on an iPhone 11 and a Galaxy A14 for 25 minutes without it wobbling | Device matrix evidence + 50× crash loop + telemetry |
| MS-9 | **Beta / RC** | Phase 11 | A stranger reaches the postcard unaided and wants to share it | Doc 07 §8 targets evidenced; fridge test; never-visitor frame pass |
| MS-10 | **Launch** | Phase 12 | The world plays it | Release + monitoring live |

**What "alive" means at every milestone** (the Anti-Slop Gate applied to milestones): no filler, no floating assets, no fake interactions, no placeholder buttons — every new feature carries owner, behavior, style, verification (AGENTS.md §1b), and every milestone's browser playtest is an actual browser playtest.

---

## 6. How it all comes together — the integration narrative

The game is one layered machine, and the phases exist to wire the layers in an order that never breaks the shipped slice:

1. **Today**, the presentation layer (Game/World/UI) and the story layer (GameState's 33 steps) run the whole show, gated by tests. It works; it is finite; it cannot remember.
2. **Phase 1** inserts the **sim layer** beneath, unpowered: contracts, pure state, 113 tests, zero runtime effect. Nothing the player can see changes — that is the point.
3. **Phase 2** powers it with **time** (the valve) and **money** (the ledger bridge) and **schedules** (arbitration claims steer Yuka bodies). From this moment the world keeps time; the story still waits where you left it; the save can replay a day tick-for-tick. The narrative machines (R2+R7) grow on the same soil in parallel.
4. **Phase 3** gives bodies a **map** and the world its **semantic skeleton** (registry as runtime truth). Now "where" is data too.
5. **Phase 4** multiplies **people** on that map with memory and independence; **Phase 6** adds **commerce and memory at street scale** (businesses, drift, seasons, missed moments). The block becomes a place that persists.
6. **Phase 7** tells the **story through all of it**: the rails fire on the live world, the cascade reads real business and relationship state, the amends are paid against a ledger that never lies to the save.
7. **Phases 8–12** widen the world (owner-gated), then freeze, harden, test with strangers, and ship.

Through every step: the paved path stays paved (one registry, one money path, one save law, one clock), the guards accumulate (every bug becomes a test), the perf ledger never regresses silently, and no layer ever reaches up into the one above it — story effects may write world facts; the world never writes story steps (wc-02 D1).

---

## 7. Change control for this document

- Changes require a Production Director proposal; phase *scope* changes require owner ratification; workstream *sequencing* changes require the affected workstream owners' sign-off plus a register note.
- The register (`PRODUCTION-STATUS-REGISTER.md`) — not this document — is where day-to-day status lives; update it in the same commit as the work.
- When a phase formally opens or closes, update: the register, `AGENTS.md`'s `**Current phase:**` line (consciously, with the hygiene test — it must keep matching /Vertical Slice production/i until the owner changes the truth it states), and this document's phase blocks only if scope changed.
- Legacy doc numbers (docs/01–56) are history; this roadmap is the only living plan. If a future doc contradicts the one-roadmap law, the contradiction is a defect — file it, do not propagate it.

*— Production Director, 2026-11-06*

