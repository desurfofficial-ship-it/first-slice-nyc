# 08 — Simulation & NPC Contract

| | |
|---|---|
| Status | Adopted — data + schedules + validation implemented and tested; living routines = Workstream B |
| Files | `sim/entities.ts`, `sim/schedule.ts`, `sim/state.ts` |

## 1. What an NPC is (and is not)

An NPC is a **persistent record** ([04] §2) — a life that survives saves — plus, at presentation time, a body. The record is the truth; the body borrows it. The shipped split stays exactly as shipped: **Yuka steers ambient bodies; the named cast keeps authored tween choreography** for story beats. Neither owns identity. `NpcState` does.

## 2. Schedules: propose, never dispose

`NpcSchedule` = ordered `ScheduleEntry[]` (kind, placeId, `startMin..endMin` with overnight wrap, weekdays, priority, `punctual`) + a `fallback`. `activityAt(schedule, clock)` is PURE and deterministic:

- day + time window match (weekday-aware; overnight entries wrap past midnight — tested);
- the **latest-starting** active entry wins (stable id tie-break);
- uncovered minutes yield the fallback — **no invented busywork**;
- `late` flags a punctual entry whose start has passed (feeds arbitration R7's deadline pressure);
- `minutesLeft` gives the arbitrator a horizon.

Priorities by kind default to the matrix's NORMAL band (`priorityForKind`: appointment 2 — a promise; work/commute/meal/sleep/worship 3; shop/social/leisure/routine 4). **Status: implemented + tested. Wiring the shipped walkers to clock-keyed schedules = Workstream B task B-1.**

## 3. Simulation update responsibilities

| Concern | Owner | Update model |
|---|---|---|
| Time | sim/clock | tick advance at frame end (Workstream D wires the valve) |
| NPC schedules | WS-B | per-tick `activityAt` for full/background npcs; lazy for abstract |
| Activities/claims | sim/arbitration | event-driven `propose` + per-tick `tickArbitration` |
| Relationships | WS-B | edge mutations with world events; warmth/trust clamped |
| Economy | sim/economy | transaction posts (event-driven; no idle churn) |
| Businesses | WS-D | per-day open/close transitions; balance via ledger |
| World events | WS-D | recorder appends tick-ordered records |
| Environment | WS-D | epoch fields (rain etc.) read by arbitration validity |
| Persistence | sim/state | snapshot at day boundaries + story `persist` beats |
| Distant NPC simulation | WS-B | fidelity tiers ([04] §5) — abstract npcs get schedule deltas, not bodies |

**Coordination rule:** systems never update the same state independently; they go through the owner ([05] §2). The frame order lives in ONE place when Workstream D wires it (Game.frame's documented order, extended, not duplicated).

## 4. Other entities

- **Player** — an `NpcState`-shaped presence (`npc:leo_marsh`, home = the Cecil) whose ledger account is `acct:player`; story facts stay in GameState. The reference world carries him as a first-class record (tested: the Leo↔Idris Regular edge is the Day-1 canon, docs/narrative bible).
- **Buildings/interiors** — registry records; occupancy is derived (who is AT a place), never stored on the building.
- **Businesses** — `BusinessState` ([04]); hours are contract law, and narrative events that need an open business CHECK it ([10]).
- **Vehicles** — reserved shape only (`VehicleState` deferred): the taxi/bus remain world props with pure math until Workstream A's traffic phase. **N/A now, by directive rule 8.**
- **Interactive objects** — `obj:` ids reserved; the shipped anchors (newsbox, hoop, board, shelves) map to them when Workstream E catalogues content.
- **World events** — `WorldEventRecord` ring, tick-ordered (audit-enforced).

## 5. Simulation fidelity (Foundation C's performance law)

`full` (near player: bodies, steering, detailed beats) → `background` (off-screen: schedule deltas + story-relevant events) → `abstract` (irrelevant: day-resolution only). Laws:

1. **Tier changes never touch state** — only attention. Stepping Idris from background to full cannot teleport him, spawn a duplicate, or invent money (the reference world ships all three tiers as evidence).
2. **Abstraction cannot create impossibilities:** an abstract npc's day resolves through the SAME schedule/validator machinery; when they become relevant, the last resolved activity and location re-validate against the clock before a body appears (Workstream B's B-2 task, contract here).
3. **Budget:** full-fidelity population is a perf dial (the registry's `performance` section is the ceiling); the 4 GB Windows floor is the constraint (directive PART 2).

## 6. What this contract deliberately does NOT do

No needs/mood/opinion matrices, no daily knowledge diffusion, no procedural life events — Workstream B builds those ON these records, with tests, without changing the shapes' meaning. The shapes are the pavement; their fields may grow additively (the v1 save rule), their owners may not change.
