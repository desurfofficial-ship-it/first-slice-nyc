# AGENT-DEVELOPMENT-GOVERNANCE — FIRST SLICE

| | |
|---|---|
| Status | Active — the professional multi-agent development framework |
| Owner | Production Director (keeper) · the project owner (appeals and gates) |
| Precedence | [AGENTS.md](../../AGENTS.md) is the operating contract and wins wherever it speaks. The world-contract framework (wc-14, merges with Phase 1) is adopted as the workstream baseline. This document extends both; where they conflict, AGENTS.md > wc-14 > this document, and the conflict is a defect to file. |
| Purpose | Genuine parallel development — several agents building *compatible* pieces, never several versions of the same system. |

---

## 1. Roles

| Role | Held by | Decides |
|---|---|---|
| **Project owner** | the human | Scope gates (§8 of AGENTS.md), phase acceptance ratification, budget calls (B13/DEC-2), expansion approval, canon appeals |
| **Production Director** | this assignment's holder | The roadmap, the register, phase open/close proposals, assignment issuance, integration scheduling, conflict rulings (escalable to owner) |
| **Narrative Director (ND)** | canon holder | Canon rulings (docs/narrative/15 §7 protocol), content voice review, DEC-1 co-owner |
| **Workstream leads** | WS-A…F leads | Their workstream's internal tasking, review sign-off, register rows |
| **Agents** | every coding agent | Nothing unilateral — they claim assignments, follow the deal, report evidence |

## 2. The workstreams (adopted from wc-14; deals are binding)

| WS | Scope | Owns (files) | May not touch | Lead duties |
|---|---|---|---|---|
| **A — Spatial World** | districts, streets, blocks, buildings, interiors, nav, placement, spatial indexing | `web-three/src/world/` build paths, registry geometry flips, future `sim/nav` | `sim/*` contract shapes (read-only), `core/GameState.ts`, `game/Game.ts` frame order | nav graph; registry→runtime flip; door/stair resources |
| **B — NPC Simulation** | identity, schedules→lives, needs/priorities, relationships, social behavior, fidelity, persistence | consumers of `sim/entities.ts`, future `sim/life`, walker/cast bindings (`world/peds.ts`, cast binding code) | `sim/arbitration.ts` internals (read-only), story steps | B-1 schedule binding; tiers; relationship events |
| **C — Narrative** | storylines, characters, dialogue, events, choices, consequences, diary/map | `core/` narrative content, narrative machines, `docs/narrative/` (content, per bible) | `Game.frame` order, `sim/state.ts` ownership table | R-machines per §7; content waves |
| **D — World Simulation** | the time valve, businesses, employment, economy bridge, world events, neighborhood evolution | `game/Game.ts` frame wiring (the one bridge), `sim/state` boot/bridge, `sim/clock` consumers, `sim/economy` consumers | narrative content tables, `world/` geometry | valve; day boundary; ledger bridge; the single seam |
| **E — Content & Assets** | buildings, props, vehicles, clothing, interiors, interactive objects, manifests, validation | content drops, `sim/content.ts` entries, `tools3d/`, `assets/` | any runtime system code outside seams | manifests; building variants; furniture pack |
| **F — System Integration & Quality** | cross-ref validation, state integrity, regression, integration tests, perf, reproducibility | `web-three/tests/`, `web-three/scripts/` harnesses, CI, probes | product code (files outside tests/scripts/CI) | gates; world audit; determinism replay; perf ledger |

**Shared contracts are READ-ONLY** unless changed through governance (§6): `sim/*` exports, `docs/data/world-registry.json`, `core/Save.ts` (v1 law), the interaction-registry pattern, `sim/clock` (write via its API only).

**Standing prohibitions (per WC-14 §2 + AGENTS.md):** no new dependencies without owner approval; no touching `docs/narrative/` content except WS-C per the bible; no rewriting working systems (the paved-path law); **no second clock, no second ledger, no second save, no second arbitration**; no engine swap; no OSM/NYC-Open-Data geodata ingestion.

## 3. The assignment template (every assignment, every time)

Every agent assignment is issued in this exact shape — no assignment exists without all twelve fields:

```markdown
## ASSIGNMENT <ID> — <title>
- Phase / milestone: PH-<n> / MS-<n>
- Workstream: WS-<X>
- Single accountable owner: <agent name/handle>  (exactly one)
- Task scope: <what is in; one paragraph max>
- Out of scope: <what this assignment must NOT do>
- Required references: <AGENTS.md §, docs/narrative/14 §, wc-doc §, docs/57 §, reference-repo files>
- Dependencies: <assignments/phases that must land first; DEC numbers if any>
- Files it owns: <explicit paths>
- Files it must NOT modify: <explicit paths>
- Acceptance criteria: <checkable statements, quoted from SYSTEM-COMPLETION-CHECKLISTS where possible>
- Required tests: <new guards + existing suites that must stay green>
- Integration requirements: <how it meets the running game; E2E/probe expectations>
- Reporting format: <worklog entry + register rows + PR description fields>
```

**Reporting format (every completed assignment):** (1) `worklog.md` entry per the template; (2) register rows updated in the same commit; (3) a PR description carrying: what changed, which law/gate it serves, gate output (`tsc`/`vitest`/`build`), probe/E2E evidence, screenshots for anything visual, open questions. **"It compiles" is never evidence.**

## 4. Parallel development rules

1. **One owner per file per unit time.** The register's workstream table owns directories; `Game.ts` and `World.ts` are **single-writer** files — one assignment at a time, coordinated by the Production Director (these are the two files every other file depends on).
2. **Disjoint file scopes or no parallelism.** Two assignments with overlapping owned files run sequentially, or one is re-scoped. Check before claiming, not after colliding.
3. **Contracts before consumers.** An assignment that needs a new `sim/*` shape first proposes the shape (§6), gets it landed with tests, then builds on it. Never fork a capability ("a WS needs what another WS owns → file the need, do not fork" — wc-14 §5).
4. **Content waits for machines.** Narrative content waves follow docs/narrative/14 §7 order. No dialogue is written against an unbuilt machine.
5. **The known-good parallel set today** (post Phase-1 merge): WS-D valve (WP-1/2/4) ∥ WS-C R2+R7 (WP-5) ∥ WS-E content cataloguing ∥ WS-F CI lane. All four touch disjoint files and are pre-cleared in NEXT-PHASE-EXECUTION-PLAN.md.

## 5. Branch ownership & integration

- **Branch naming:** `fix/<bug-id>-<topic>`, `feat/<topic>`, `docs/<topic>`, `ws/<workstream>-<topic>` (extends AGENTS.md §4).
- **Bulk changes get a branch; doc fixes may touch main** (AGENTS.md §5 workflow).
- **A branch has exactly one accountable owner** (the assignment's owner). Others may review, not commit.
- **Rebase discipline:** a branch more than ~5 commits behind main rebases before review; the later PR rebases on the earlier's tests when two touch the same contract doc (wc-14 §5.1).
- **Integration windows:** risky merges (anything touching `Game.frame`, `World.ts`, or a contract shape) are scheduled by the Production Director and land with the full gate stack on the merge commit — `tsc` · `vitest` · `build` · 4-day E2E · affected probes.
- **Merge conflicts on guards are resolved in favor of the stronger guard** (keep both intents; dedupe only identical assertions).
- **Branch retirement:** a superseded branch is guard-checked row by row, then deleted, with a register note (BR-3 is the current example).

## 6. Shared-contract governance (extends wc-14 §4)

- A contract change ships as **patch + tests + a one-paragraph note in the touched contract doc's status table**. No silent edits — docs and code must never disagree.
- **Breaking changes** require: the contract doc's row bumped to "Mod", a migration note (save impact), and a green full suite including the affected workstream's tests. Saves obey the v1-additive law: old parses, new fields optional, renames forbidden (IDs are permanent — wc-04).
- **Dependents are notified by the worklog entry**, which names every workstream that reads the changed contract; the doc's status table is the notification record.
- Removals only after a documented deprecation window; ids are permanent.

## 7. Code review & regression law

- **Review is evidence-based:** the reviewer re-runs the floor gates, not just reads the diff. For visual changes the reviewer runs or inspects the probe screenshots (the visual-qa skill's law: browser-verified is done).
- **Issue → permanent guard:** every real bug found in review lands with a test, assertion, or lint-style rule so the class of mistake cannot return (AGENTS.md §1c.1). A review comment without a guard proposal is a suggestion; a merged fix without a guard is an incomplete fix.
- **Regression suites are sacred:** deleting, skipping, or weakening an existing test requires the Production Director's explicit sign-off recorded in the register. There are currently zero acceptable skips.
- **State machines are sacred:** story steps, roam, serve/confirm gates, day transitions, save flags, ride machines, rails, chapter gates — changed only with explicit inputs/outputs written down first (AGENTS.md §1c.2).

## 8. Documentation duties

- **Same-commit law:** worklog entry + register rows + (if the claim touches a checklist) the checklist row's evidence pointer — all in the same commit as the code.
- **Docs-hygiene guard:** `AGENTS.md`'s phase line, canon pointers, and engineering-reference law are test-pinned; when the phase truth changes, update the line consciously and update the pinned string in the same commit (docs-hygiene.test.ts documents this ritual).
- **Provenance:** cite sources for ideas/snippets (stolen-with-credit is house style — AGENTS.md §5.6).
- **Honesty:** no fabricated metrics, playtest results, or player reactions; unfinished work is marked unfinished; `[TBD]` carries an owner and a date (AGENTS.md §9).

## 9. Conflict resolution ladder

1. **Two agents, same file** → the second re-scopes or queues; the Production Director arbitrates within a day.
2. **Two workstreams, same contract** → the later PR rebases on the earlier's tests; both docs' status rows update (wc-14 §5.1).
3. **Contract bug found** → fix + test + worklog note immediately if the suite stays green; the fix cannot wait for the owner (wc-14 §5.3).
4. **Design vs. law conflict** → stop and ask a human (AGENTS.md §8 list): monetization, scope growth, pillar-abandoning expansion, naming/IP, credentials, law contradictions.
5. **Evidence dispute** ("is it really verified?") → the Evidence column decides; missing evidence downgrades the row one level automatically.

## 10. Agent handoffs

A handoff is a transfer of an assignment or a workstream lead role. Required: (1) the register rows current; (2) the worklog's last entry states the true state (what is green, what is red, what is unfinished); (3) any local-only state (uncommitted experiments) either committed to the branch or explicitly declared dead; (4) the new owner re-reads AGENTS.md + the assignment template before the first commit. A handoff without (2) is a handoff to an archaeologist.

## 11. Phase acceptance authority

- A phase's **exit checklist** (PHASE-ACCEPTANCE-CHECKLISTS.md) is signed by the phase's named sign-offs; the **owner ratifies** phases 0, 8 (expansion gate), 9 (freeze), and 12 (launch), plus any owner-variance.
- **No agent may declare a phase or milestone complete.** Only the sign-off chain does, on evidence. The register's status for a phase mirrors the checklist, never anyone's optimism.
- A phase may close with owner-signed variances (a red box accepted in writing, recorded in §E of the register); quiet skips are not variances.

## 12. Worked example — a properly issued assignment (from the next-phase plan)

```markdown
## ASSIGNMENT WP-1 — The tick valve (D-1)
- Phase / milestone: PH-2 / MS-1
- Workstream: WS-D
- Single accountable owner: <claimed agent>
- Task scope: dt→tick valve in Game.frame; pause rules; the listening beat respected.
- Out of scope: schedules (WP-3), ledger bridge (WP-4), any narrative content.
- Required references: wc-06 (determinism), wc-17 Phase 1 item 1, AGENTS.md §1c.3 (hot path),
  sim/clock.ts header (the five clock laws), Game.ts frame() comments (frame order law).
- Dependencies: PH-1 merged; DEC-1 scheduled.
- Files it owns: web-three/src/game/Game.ts (frame wiring section), web-three/src/sim/valve.ts (new),
  web-three/tests/valve.test.ts (new).
- Files it must NOT modify: web-three/src/core/GameState.ts, web-three/src/world/*, sim/clock.ts,
  sim/economy.ts, core/content.ts.
- Acceptance criteria: 1 tick = 1 in-game minute; pause during paper surfaces + arrival;
  deterministic tick counts from identical input traces; zero allocations in the steady loop.
- Required tests: valve.test.ts (tick math, pause rules, determinism); full suite green;
  E2E green with money assertions unchanged.
- Integration requirements: the valve drives only what WP-2/3/4 wire; boot with ?probe runs a
  60-second tick trace without console errors.
- Reporting format: worklog entry + register rows (SYS-ECO-09, PH-2) + PR with gate output.
```

*Governance v1.0 — Production Director, 2026-11-06.*
