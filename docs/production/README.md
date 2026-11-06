# FIRST SLICE — Production Documentation

**The central production system for FIRST SLICE: A New York Story.**
Owner: Production Director · Baseline v1.0, 2026-11-06 · Status: adopted pending owner ratification.

This directory governs the development of the whole game, from the current implementation to a complete, polished, releasable build. It is written for the project owner and for every coding agent that touches the repo.

---

## The documents, in authority order

| # | File | What it is | Read when |
|---|------|------------|-----------|
| 1 | [MASTER-GAME-ROADMAP.md](MASTER-GAME-ROADMAP.md) | The authoritative master roadmap: the whole game, phase by phase. **This is the one roadmap.** | Before any work |
| 2 | [PHASE-ACCEPTANCE-CHECKLISTS.md](PHASE-ACCEPTANCE-CHECKLISTS.md) | Entry and exit requirements per phase, with the evidence each box needs | Starting or closing a phase |
| 3 | [SYSTEM-COMPLETION-CHECKLISTS.md](SYSTEM-COMPLETION-CHECKLISTS.md) | Per-system implementation checklists and measurable completion criteria | Building or reviewing a system |
| 4 | [PRODUCTION-STATUS-REGISTER.md](PRODUCTION-STATUS-REGISTER.md) | The central status register: every system and milestone, with status, owner, evidence | Every handoff; update it, always |
| 5 | [AGENT-DEVELOPMENT-GOVERNANCE.md](AGENT-DEVELOPMENT-GOVERNANCE.md) | Workstreams, assignments, branch ownership, integration and conflict rules | Before claiming or delegating work |
| 6 | [PRODUCTION-RISKS-AND-DEPENDENCIES.md](PRODUCTION-RISKS-AND-DEPENDENCIES.md) | Risks, blockers, dependencies, unresolved decisions with owners | Planning; when something smells wrong |
| 7 | [NEXT-PHASE-EXECUTION-PLAN.md](NEXT-PHASE-EXECUTION-PLAN.md) | The precise next approved milestone and its work packages | **Before writing any code today** |

## The one-roadmap law

`MASTER-GAME-ROADMAP.md` is the single authoritative production roadmap. The legacy `docs/06-production-roadmap.md` (deleted from the tree 2026-11-06, recoverable from git) is **history** — its phase list informed this one, and its release/KPI numbers are inherited only where re-ratified. `docs/architecture/world-contract/17-implementation-roadmap.md` remains valid as the *contract-level* sequencing of the simulation workstreams; where the two differ, the master roadmap wins and the contract doc's status table gets a note. No other roadmap file may be created. Competing roadmaps are a defect — report them, do not extend them.

## The status vocabulary

One vocabulary, used everywhere — in this directory, in the register, in worklog entries and PR descriptions:

| Status | Means | Proof required |
|--------|-------|----------------|
| **NOT STARTED** | Nothing exists | — |
| **PLANNED** | Specified in an adopted contract or spec; no code | A pointer to the spec section |
| **IN PROGRESS** | Code exists on a branch, work continuing | Branch name + last gate result |
| **IMPLEMENTED** | Code + tests exist and pass — possibly on a branch, possibly not wired into the game | `tsc` clean, `vitest` green on the branch |
| **INTEGRATED** | Wired into the running game on `main` (booted, in the frame loop, reachable by a player) | The wiring point named (file + call site) |
| **VERIFIED** | Integrated AND acceptance criteria evidenced (unit + probe/E2E + in-game inspection per the Anti-Slop Gate) | Evidence links: test names, probe exit-0 lines, screenshots |
| **BLOCKED** | Cannot proceed | The named blocker and its owner |

The three distinctions this vocabulary exists to enforce (they are project laws):

1. **A completed document is not proof of implementation.** A spec, a checklist, or a merged design doc changes nothing by itself.
2. **Implementation is not integration.** A module with green unit tests that `Game.frame` never calls is IMPLEMENTED, not INTEGRATED.
3. **Integration is not verified completion.** Green `tsc` alone has never finished anything here; acceptance criteria, probes, and the Anti-Slop Gate (AGENTS.md §1b) decide.

## How the pieces fit

- The **roadmap** says what happens in what order and why.
- The **phase checklists** say when a phase may open and when it may close.
- The **system checklists** say what "done" means inside a phase, per system.
- The **register** says where every system actually stands right now, with evidence.
- The **governance** says who may touch what, in parallel, without collisions.
- The **risks doc** carries the open decisions and landmines with owners.
- The **next-phase plan** turns all of the above into today's work packages.

Agents: read `AGENTS.md` first (the operating contract wins over everything), then `NEXT-PHASE-EXECUTION-PLAN.md`, then the workstream deal in `AGENT-DEVELOPMENT-GOVERNANCE.md` for your assignment. Update the register and `worklog.md` in the same commit as your work — an unrecorded change is a change the next agent must rediscover the hard way.

*Baseline v1.0 authored by the Production Director, 2026-11-06, from a full repository audit (git `69f8327`, branches `feat/world-contract-foundation` + `feat/player-upgrade`, main gates: `tsc` clean · vitest 660/660 · build OK).*
