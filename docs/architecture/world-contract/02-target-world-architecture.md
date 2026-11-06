# 02 — Target World Architecture

| | |
|---|---|
| Status | Adopted (this pass implements the Foundations; the workstreams build on them) |
| Depends on | [01-current-architecture-audit.md](01-current-architecture-audit.md) |

## 1. The one-paragraph shape

FIRST SLICE becomes a coherent, persistent world by adding a **simulation layer** (`web-three/src/sim/`) beneath the existing game — the same way `core/GameState.ts` already sits beneath the scene graph. The sim layer owns time, people, businesses, money movements, story-state seams, and spatial semantics as pure, testable data. The shipped systems keep doing what they do: Yuka steers bodies, the registry JSON stays the construction truth, GameState keeps the four-day story, the interaction registry stays the one way to press the world. Nothing is rewritten; the new layer is the thing every workstream plugs into.

```
┌────────────────────────────────────────────────────────────┐
│ PRESENTATION  Game.ts · World.ts · UI · camera · peds(Yuka)│  reads, renders
├────────────────────────────────────────────────────────────┤
│ STORY LAYER   core/GameState (steps, flags, money-as-      │  the 4-day spine
│               shipped) · narrative bible content            │
├────────────────────────────────────────────────────────────┤
│ SIM LAYER     sim/clock · sim/schedule · sim/arbitration · │  THE CONTRACTS
│               sim/entities · sim/economy · sim/narrative · │  (this pass)
│               sim/registry · sim/content · sim/state ·     │
│               sim/rng · sim/ids · sim/reference            │
├────────────────────────────────────────────────────────────┤
│ DATA          docs/data/world-registry.json (geometry) ·   │  single sources
│               docs/narrative/ (story canon) · ABO manifest  │  of truth
└────────────────────────────────────────────────────────────┘
```

## 2. The six foundations, and where each lives

| Foundation | Contract doc | Implementation | Status |
|---|---|---|---|
| A — Global simulation state & determinism | [05](05-global-simulation-state-contract.md), [06](06-determinism-and-time-progression.md) | `sim/state.ts`, `sim/clock.ts`, `sim/rng.ts`, `sim/ids.ts` | **Implemented** (contracts + tests); Game-loop wiring = Workstream D |
| B — Spatial world & semantic registry | [03](03-world-topology-contract.md), [07](07-spatial-semantic-registry.md) | `sim/registry.ts` over `world-registry.json` | **Implemented** (typed load, queries, validation); nav graph = Workstream A |
| C — Simulation & entity contract | [08](08-simulation-and-npc-contract.md) | `sim/entities.ts`, `sim/schedule.ts` | **Implemented** (data + validation + resolution); lives/routines = Workstream B |
| D — NPC behavior arbitration | [09](09-npc-behavior-arbitration.md) | `sim/arbitration.ts` | **Implemented** (engine + 7 scenarios tested); Yuka binding = Workstream B |
| E — Narrative contract & validation | [10](10-narrative-integration-and-validation.md) | `sim/narrative.ts` | **Implemented** (validation + fallbacks); rails/ledger machines = Workstream C per docs/narrative/14 |
| F — Content, asset & resource contracts | [11](11-content-and-asset-contract.md) | `sim/content.ts` | **Implemented** (manifest schema + ABO validated); library = Workstream E |
| — Economy guardrails (PART 5) | [12](12-economy-and-resource-contract.md) | `sim/economy.ts` | **Implemented** (ledger, flow classes, audit); pricing = evidence-driven, later |

## 3. The decisions, and why

**D1 — A sim layer beside GameState, not a replacement.** GameState is the story's state machine and it is tested to death (the E2E plays it). A second "authoritative world state" that competed with it would violate directive rule 6. Instead: two layers, one ownership table ([05] §2), one bridge rule (story effects may write world facts; the world never writes story steps). Workstream D wires the bridge.

**D2 — Time is ticks, the tick is a minute, the calendar is canon.** `GameClock` (day, minuteOfDay) with day 1 = Tuesday, September 9, Y1 per docs/narrative/12. Deriving month/season/weekday is pure integer math — no `Date` anywhere (narrative R4). Presentation keeps its own moods; the sim only says what time it is.

**D3 — The registry JSON is the semantic source; code stays the geometry source (for now).** The mjs fidelity gate already pins 12 masses/18 anchors; `sim/registry.ts` adds the runtime half: typed shapes, cross-ref validation, derived semantic tags, spatial queries. Flipping geometry to load from the registry is Workstream A's call, made deliberately, behind the same tests.

**D4 — NPC state is data; bodies stay free.** An `NpcState` is a plain record (identity, home, work, schedule, location, money, inventory, relationships, knowledge, fidelity tier). Yuka vehicles and authored rigs remain presentation. A save can rebuild a life; a renderer borrows it. Fidelity tiers (full/background/abstract) are scheduling decisions, never state differences — stepping an NPC down and back up cannot lose or invent a fact ([08] §5).

**D5 — Arbitration owns "what is this body doing".** One claim per NPC, five priority bands, strictly-higher interrupts, resume stacks, capacity resources, validity callbacks. Yuka keeps steering; arbitration chooses destinations. The seven contracted scenarios (S1–S7) are test teeth, not prose ([09]).

**D6 — Narrative is a guest with a contract.** The bible (docs/narrative/00–15) is canon and untouchable. `sim/narrative.ts` gives its content a doorway: flags, availability holds, `StoryEvent` validation (existence, double-booking, business hours, prerequisites, windows), and a deliberate fallback planner (defer / reschedule / relocate / cancel — never silent). The spec-14 machines (rails, ledger, diary) are Workstream C's build on the declared types.

**D7 — Money moves only through the ledger.** Integer cents; append-only transactions; faucets/sinks named; balances derived (genesis + Σ). The shipped money math is untouched — it becomes a *producer* of transactions when Workstream D bridges it. No price is invented anywhere in the contract; tests use shipped prices only.

**D8 — Saves are versioned documents with polite refusal.** `first_slice_world_v1` sits beside (never inside) `first_slice_save_v1`. Magic + version + world id checked; anything else degrades to a fresh world with notes — the save.gd law at world scale. The ownership table is data, and a test refuses to let a WorldState section exist without an owner.

## 4. What is deliberately NOT in this pass

- No nav graph, no traffic lanes, no worker streaming (Workstream A).
- No needs/mood/ambition simulation, no knowledge diffusion (Workstream B).
- No rails engine, diary, amends economy MACHINES — types declared, build order fixed by docs/narrative/14 §7 (Workstream C).
- No business P&L, rent cycles, price curves (Workstream D, after real loops exist — directive rule 17).
- No new assets beyond what ships (Workstream E).
- No full-city construction (directive rule 9). Alder Heights first; five boroughs are a passport away, not a milestone here.

## 5. Success criteria (from the directive's Definition of Done)

Each is pinned by a test that runs today:
- World integrity audit green on a populated world → `sim-state.test.ts`, `sim-reference-world.test.ts`.
- Clock determinism + canon calendar → `sim-clock.test.ts`.
- Semantic queries find canon places → `sim-registry.test.ts`.
- The seven conflict scenarios behave as contracted → `sim-arbitration.test.ts`.
- Impossible narrative states refused with named violation codes → `sim-narrative.test.ts`.
- Ledger balance = genesis + Σ transactions, always → `sim-economy.test.ts`.
- Save round-trip preserves a populated world; foreign/corrupt/old refuses politely → `sim-state.test.ts`.
- The manifest validates against the real registry → `sim-reference-world.test.ts`.
- All of it headless: `npx vitest run` → 718/718; `npx tsc --noEmit` → clean; `npm run build` → OK.
