# PRODUCTION-RISKS-AND-DEPENDENCIES — FIRST SLICE

| | |
|---|---|
| Status | Active — the risk, blocker, dependency and open-decision ledger |
| Owner | Production Director (keeper) · each risk and decision names its own owner |
| Law | Every risk has an owner, a mitigation and a trigger to watch. Every open decision has an owner, a deadline touchpoint and a default if nobody rules. Unowned risks are escalated to the project owner at phase open/close. |
| Inheritance | Legacy risk register (docs/16, 2026-10-28 — history in git) is inherited where still live; its R-numbers are preserved below. |

---

## 1. Open decisions (DEC) — unresolved, with owners

| ID | Decision | Why it blocks | Owner | Touchpoint | Default if unrulable |
|---|---|---|---|---|---|
| **DEC-1** | **The two epochs.** `core/calendar.ts` (main, R4): Day 1 = October 1, Y1 (the C0 mood-lock, doc 12 §5). `sim/clock.ts` (branch): Day 1 = Tuesday, September 9, Y1 (the arrival, doc 12 §1). Both cite doc 12; no mapping exists. | Phase 2 WP-2 (day-boundary machine) cannot land without one time authority; a wrong mapping corrupts schedules and diary dates silently | Narrative Director + lead engineering; ruling recorded in docs/narrative/15 §2 | Phase 2 WP-2 kickoff | **RULED 2026-11-06 (owner-approved, Option A): Day 1 = Tuesday, September 9, Y1.** The October mood-lock is presentation-only; `CAL_EPOCH` corrected on main; the sim clock was already canon-true. Adjudication of record: docs/production/DEC-1-CALENDAR-CANON-DECISION.md. Remaining: the one epoch mapping + pinned test (WP-2v) |
| **DEC-2** | **B13 — the draw-call budget.** Full-street rigs exceed the 150-call budget (PLAZA 302 / CART_CORNER 236). Six priced optimization rounds were declined; the census gate and the "no rig above its previous ledger" rule govern instead. | Phase 8's expansion waves need a ruled budget: fund the culling wave (docs/57 §3.6 study) or accept the ledger rule as the standing budget | Project owner | Phase 3 kickoff (before geometry additions) | The ledger rule stands; the 150 number remains an aspiration, not a gate |
| **DEC-3** | **Day 5+.** `MAX_DAY = 4` by design; the rail's goodnight holds the light. When does Day 5 exist, and as what (C0 continuation vs chapter machinery)? | Blocks employment/daily-life expansion (SYS-PLAY-05) and any content past the goodnight | Project owner + Narrative Director | Phase 5 kickoff | The goodnight holds until chapters (R8) arrive; no Day-5 content until then |
| **DEC-4** | **Registry as runtime geometry source.** The A-3 flip (Phase 3) makes the registry load at runtime. Confirm scope: which districts flip, in what order, with what fallback. | `World.ts` (6,556 lines) is the highest-risk file; the flip is deliberate, not incidental | WS-A lead + Production Director | Phase 3 kickoff | Flip district-by-district behind the fidelity gate, starting W0/W1 |
| **DEC-5** | **Economic figures.** Narrative open question: business economics pending tuning (prices must stay shipped prices in tests). | Phase 6 P&L design | Narrative Director + WS-D | Phase 6 kickoff | Ledger records shipped prices only; no invented prices anywhere |
| **DEC-6** | **Seasonal pass scope.** narrative/14 §4 budgets it as its own phase (W6 candidate); narrative/00 §3 leaves scope/phasing open. | Phase 6's largest visual dependency | Project owner (with WS-E) | Phase 6 entry | Minimal: season cuts run the existing dressing/leaf systems first; snow/rain only after a priced wave |
| **DEC-7** | **Rating / profanity pass + health-and-safety copy.** Narrative open question; F7's guardrails are canon-critical. | Before Phase 11 external testers | Project owner + ND | Phase 5 (guardrails land), verified at Phase 11 | Ship the guardrails exactly as doc 02/09 specify; no softening |
| **DEC-8** | **Expansion approval.** AGENTS.md §8 reserves new boroughs/scope growth for a human. | Phase 8's gate | Project owner | Phase 3 exit (with the scoping study) | Alder Heights completion only; no borough geometry |
| **DEC-9** | **Telemetry & privacy.** Nothing emits funnel events today (doc 56 §3). Design the minimal, honest, No-FOMO-compliant telemetry — or none. | Phase 10's funnel evidence; Phase 11's targets | Project owner | Phase 9 (needs to exist before alpha) | No telemetry until designed; playtest evidence gathered manually instead |
| **DEC-10** | **Localization / VO strategy.** Narrative open question (code-switched dialogue). | Phase 11 | Project owner + ND | Phase 11 entry | Text-first; no VO for v1 (narrative/14 §5) |
| **DEC-11** | **Distribution.** Web (GitHub Pages, shipped) vs store packaging. | Phase 12 | Project owner | Phase 9 exit | Web-first remains the release channel |

## 2. Risks (living register)

| ID | Risk | L×I (likelihood × impact) | Mitigation | Watch trigger / owner |
|---|---|---|---|---|
| R1 *(inherited)* | Postcard quality misses the share promise | M × Critical | The fridge test is a standing ritual; playtest-analysis law: fix the postcards, not the nagging | Any beta share intent < 70% → Phase 11 · WS-E/ND |
| R2 *(inherited)* | Map tone drifts (wiki, not paper) | M × Critical | Voice laws (doc 13) + content-pipeline skill + canon review per wave | Any Map copy that quizzes or sighs → all phases · WS-C |
| R4 *(inherited)* | **Scope creep** — agents build open-world city instead of the life sim on an open block | H × High | The slice-guardian skill; AGENTS.md §8 owner gates; the one-roadmap law; "expansion without the bible is scope failure" | Any PR adding boroughs, unlimited streets, or generic-city systems · all |
| R-NEW-1 | **Epoch mismatch ships silently** (DEC-1 ruled 2026-11-06; mapping still untested) | M × Critical | ~~DEC-1 before WP-2~~ **ruled** — remaining: one mapping function + pinned test (WP-2v); the no-real-date tests extended across both layers | Any schedule/date test failing oddly in Phase 2 · WS-D + ND |
| R-NEW-2 | **Branch drift** — `feat/world-contract-foundation` ages behind main; merge cost grows | H × M | Merge promptly (WP-0 of the next phase); rebase if delayed more than a few days | main advancing past +5 commits on top of the branch base · Production Director |
| R-NEW-3 | **`World.ts` concentration risk** — 6,556 lines, every feature wants it, single-writer law slows everything | H × M | Single-writer enforcement; the registry flip (DEC-4) shrinks it; district extraction only with tests green per step | Any assignment queue forming around World.ts · WS-A |
| R-NEW-4 | **Sim perf at scale** — schedules/arbitration/ledger step cost grows with population | M × M | Measure with the valve (Phase 2) before growing (Phase 4); soak probes; fidelity tiers; hot-path law | Sim step > its measured frame budget at 2× population · WS-B/F |
| R-NEW-5 | **Save-layer duplication** — story save and world save drifting into competing truths | M × Critical | The ownership table + one-way bridge rule (tested); `auditWorld` on the money mirror | Any feature writing the same fact in both saves · WS-D |
| R-NEW-6 | **Device farm absence** — the five Phase-1 exit boxes' human/device halves can never close | Certain (today) × M (for schedule) | Owner dependency: secure hardware access by Phase 10; browser-loop + SwiftShader proxies until then | Phase 10 entry without a device plan · owner |
| R-NEW-7 | **CI gap** — probes/E2E run only locally; a red push can reach main | M × M | WS-F adds the PR unit/typecheck lane + nightly curated probe lane (cheap, headless) | Any main breakage that a probe would have caught · WS-F |
| R-NEW-8 | **Agent collisions** — parallel agents editing shared files without governance | M × M | This governance doc: disjoint scopes, single-writer files, contract governance, conflict ladder | Any merge conflict on a contract shape · Production Director |
| R-NEW-9 | **Content volume vs voice quality** — 120–160 diary entries, ~60 scenes, 40 person cards | H × M | doc 13 voice table as the filter; content-pipeline skill; waves sized to review capacity | Any wave merging without voice review · WS-C/ND |
| R-NEW-10 | **Sensitive content handling** (F7, therapy, downfall) | L × Critical | R12 guardrails as tests; canon rules unsoftened (a softening build is a canon violation); opt-in resource note | Any content touching fragments/therapy · ND |
| R-NEW-11 | **Credential hygiene** — a PAT was rotated in a prior session after chat exposure; tokens can leak again | M × High | Secrets law (AGENTS.md §4): never hardcode; ask the human operator; rotate after any exposure; use least-privilege, short-lived tokens | Any token appearing in chat/files · owner |
| R-NEW-12 | **Sim/story time semantics** — players confuse roam clock vs story day ("the city runs on your clock") | M × M | DEC-1 mapping + UI copy per doc 03/12 voice; the diary narrates time, never a clock widget | Any playtest confusion about time · WS-C |
| R-NEW-13 | **Single-repo docs debt** — README links to wiped legacy docs (HYG-1) mislead newcomers | C × L | One-line link fixes (owned); the production README as the entry point | New-agent questions about missing docs · WS-E |
| R-NEW-14 | **Probes as single points of truth** — 122 local harnesses with no scheduled runs can rot | M × M | Nightly curated probe lane (R-NEW-7's fix); probe ownership in WS-F | Any probe failing for 2 consecutive runs · WS-F |

## 3. Dependency map (what depends on what)

```
narrative canon (docs/narrative) ──────────────┐
registry JSON (geometry+semantics) ──┐          │
                                     ▼          ▼
Phase 1: sim/ contracts  ◀── merge (WP-0)      │
        │                                       │
        ├──▶ Phase 2: TIME VALVE (D-1/D-2) ──▶ clock-keyed lives (B-1) ──▶ Phase 4 residents ──┐
        ├──▶ Phase 2: LEDGER BRIDGE (D-3) ────▶ traceable money ──▶ Phase 6 business P&L ──────┤
        └──▶ Phase 2∥: R2 ledger + R7 choices (WS-C) ──▶ R1/R8 ──▶ C0 ──▶ C1–C6 (Phase 7)      │
                                                                                               │
Phase 3: nav graph + registry flip ◀── needs arbitration live (Phase 2)                        │
        │                                                                                      │
        └──▶ Phase 4 (population growth needs routes) ──▶ Phase 6 (customers/staff) ───────────┤
                                                                                               ▼
Phase 5: R10/R11/R12 (player freedom completion) ◀── needs Phase 2 UI/ledger
Phase 7 content waves ◀── need machines (Phases 2/4/6) in §7 order
Phase 8 expansion ◀── needs Phases 3/4/6 + DEC-2 + DEC-8 (owner gate)
Phase 9 freeze ◀── needs 2–8
Phase 10 alpha ◀── needs freeze + devices (owner) + DEC-9
Phase 11 beta ◀── needs alpha + DEC-7/DEC-10
Phase 12 launch ◀── needs RC + DEC-11
```

**Hard sequential facts** (from the audit, not preference): the time valve precedes clock-keyed lives; clock-keyed lives precede population growth; arbitration precedes chokepoint capacity; the nav graph precedes multi-vehicle traffic; the ledger bridge precedes any P&L; R2/R7 precede R1/R8; R8 precedes any C1+ content; DEC-1 precedes the day-boundary machine; the owner gates precede expansion, telemetry, rating, distribution.

**The one sanctioned seam:** WS-D owns the single bridge into `Game.frame`; story effects write world facts one-way; the world never writes story steps (wc-02 D1, tested).

## 4. Blockers (current — everything else is scheduled work)

| Blocker | Unblocks | Owner |
|---|---|---|
| Owner ratification of this baseline (Phase 0 exit) | Phase 2 work packages | Project owner |
| DEC-1 ruling | Phase 2 WP-2 | ND + lead |
| Phase-1 merge (branch readiness exists) | All sim consumption | Production Director + WS-D |

*Nothing else is blocked; everything else is sequenced. Report a new blocker by adding it here with an owner — a blocker without an owner is a decision pretending to be a wall.*

— Production Director, 2026-11-06
