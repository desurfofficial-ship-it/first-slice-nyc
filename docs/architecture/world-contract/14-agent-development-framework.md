# 14 — Agent Development Framework

| | |
|---|---|
| Status | Adopted — the workstream map for everything this contract began |
| Law | Genuine parallel development — not several agents building incompatible versions of the same system. |

## 1. The workstreams

| WS | Scope | Owns (files) | Depends on | First tasks |
|---|---|---|---|---|
| **A — Spatial World** | districts, streets, blocks, buildings, interiors, public spaces, navigation, placement, spatial indexing | `world/` build paths, registry GEOMETRY flips, future `sim/nav` | [03] | nav graph (nodes/edges/chokepoints); runtime geometry from registry (deliberate flip behind the fidelity gate); door/stair resource mapping |
| **B — NPC Simulation** | identity, schedules→lives, needs/priorities, relationships, social behavior, fidelity, persistence | `sim/entities.ts` consumers, future `sim/life`, walker/cast bindings | [04][08][09] | B-1: wire shipped walkers + cast to clock-keyed schedules via arbitration; B-2: tier up/down without impossibilities; B-3: relationship mutations as world events |
| **C — Narrative** | storylines, characters, dialogue, events, choices, consequences, diary/map | `core/` narrative content, docs/narrative machines | [10] + docs/narrative/14 (R0–R15 order) | R1/R3/R4 spine on the declared types; replace reference-world EXAMPLE events with bible content |
| **D — World Simulation** | in-game time valve, businesses, employment, economy bridge, world events, neighborhood evolution, long-term sim | `Game.frame` wiring, `sim/state` boot/bridge | [05][06][12] | dt→tick valve; day-boundary machine (diary/restock pattern); Effect('money')→ledger bridge; businesses open/close transitions |
| **E — Content** | buildings, props, vehicles, clothing, interiors, interactive objects, manifests, validation | content drops + `sim/content.ts` entries | [11] | catalogue shipped anchors as `obj:`/content entries; first building-variant pack through the manifest |
| **F — System Integration & Quality** | cross-ref validation, state integrity, regression, integration tests, perf, reproducibility | `tests/`, probes, CI gates | everything | world-audit step into E2E; arbitration event log probe; determinism replay harness |

## 2. Every workstream's deal

For each WS, the six-row deal (the same rows, per stream):

- **Ownership** — the files above; shared contracts are READ-ONLY ([§4]).
- **Permitted changes** — your files + additive growth of contract SHAPES through governance ([§4]). No edits to another WS's owned modules.
- **Shared interfaces** — `sim/*` exports; the registry JSON; the story save (`core/Save.ts`, v1 law); the interaction registry pattern.
- **Prohibited** — new dependencies without approval; touching docs/narrative content (WS-C excepted, per the bible); rewriting working systems ([02] D-laws); a second clock, a second ledger, a second save, a second arbitration.
- **Required tests** — every law you land lands WITH a test (AGENTS.md §1c.1); contract tests extend `tests/sim-*.test.ts`; the world audit (`auditWorld`) must pass on any world your feature touches.
- **Definition of done** — `tsc --noEmit` clean · `vitest run` green (718+ and counting) · `npm run build` OK · your claim inspected in the running game per the Anti-Slop Gate · worklog entry.

## 3. Dependencies & integration points (the seams that make parallel safe)

```
WS-A (places/nav) ──?registry──▶ sim/registry ◀──read── WS-C (location requests)
WS-B (lives) ──claims──▶ sim/arbitration ◀──proposals── story beats (C/D)
WS-D (time/economy) ──tick/ledger──▶ everything reads
WS-E (content) ──entries──▶ sim/content ◀──validates── A/B/C/D
WS-F (quality) ──runs──▶ auditWorld + gates over ALL
```

No workstream imports another's internals — only contracts. The one bridge into the SHIPPED game (Game.frame order, GameState effects) belongs to WS-D, executed once, documented in the worklog.

## 4. Shared contract governance

- **Who owns shared contracts:** `sim/*` modules are owned by the pass that introduced them (this pass) until a WS inherits ownership by explicit handoff in the worklog. The registry JSON's owner is the lead.
- **Proposing changes:** a change to a shared shape/rule ships as (patch + tests + a one-paragraph note in the touched contract doc's status table). No silent edits — the docs and code must never disagree (directive PART 9).
- **Breaking changes:** require bumping the contract doc row to "Mod", a migration note in [05] §4 (save impact), and a green run of the full suite INCLUDING the affected WS's tests. Saves obey the v1-additive law: old parses, new fields optional.
- **Notifying dependents:** the worklog entry names every WS that reads the changed contract; the touched doc's status table is the notification record.
- **Compatibility:** additive first (new optional fields, new condition kinds, new tags — always with tests); renames are forbidden (ids are permanent, [04]); removals only after a documented deprecation window.
- **Integration verification:** WS-F runs the gates; any WS may run them locally — they are cheap and headless by design.

## 5. Conflict rules between workstreams

1. Two WS touch the same contract doc → the later PR rebases on the earlier's tests; both docs' status rows updated.
2. A WS needs what another WS owns → file the need in the worklog + the owner's first task; DO NOT fork the capability.
3. A WS finds a contract BUG → fix + test + worklog note (AGENTS.md §1c.1's permanent guard); the fix cannot wait for the owner if the suite stays green.

## 6. The promise

Another agent can start any workstream TODAY from the repo alone: read AGENTS.md → this folder → the sim module headers → run the tests. Nothing requires inventing an interface; everything requires following one.
