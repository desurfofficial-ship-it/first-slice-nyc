# 09 — NPC Behavior Arbitration

| | |
|---|---|
| Status | Adopted — implemented (`sim/arbitration.ts`), all seven contracted scenarios tested |
| Integration law | Yuka is NOT replaced (directive rule 2). Arbitration decides what a body is FOR; Yuka decides how it moves. |

## 1. The priority matrix

| Value | Band | Examples | Interrupts |
|---|---|---|---|
| 0 | CRITICAL | survival, immediate life-threatening event | everything |
| 1 | EMERGENCY | fire, serious danger, urgent evacuation | everything below EMERGENCY |
| 2 | HIGH | urgent obligation, **player dialogue**, **late punctual plan (R7)** | NORMAL/LOW |
| 3 | NORMAL | work, commute, appointment, meal, worship, sleep | LOW |
| 4 | LOW | leisure, socializing, errands, idle | nothing (queues) |

(These are the contract's working values — the directive's example table, tightened with the two discovered invariants: dialogue lives at HIGH, and lateness escalates ONE band, capped at HIGH — "walking to work eventually beats idle chat, but lateness is not a fire".)

## 2. The model

One **claim** per NPC = what they are actually doing. Everything else is a **proposal**. Claims carry: npcId, activityId, kind, priority, placeId?, `resources[]` (capacity-bearing chokepoints), `expiresAtTick?`, `resumable?` (default true), `ephemeral?`. The engine keeps per-NPC: `current`, a LIFO resume `stack`, a `queue` (resource waits), a `blocked` list (path failures).

**Rules (each pinned by a test):**
- **R1** Strictly-higher priority interrupts; equal+ durable queues; equal/weaker+ephemeral refuses quietly.
- **R2** Interrupted claims suspend to the stack unless `resumable: false` (a missed stroll is not owed).
- **R3** Resume when the stack clears — revalidated every tick; expired/invalid entries are swept (no zombie resumes).
- **R4** Resources have capacity; over-capacity claims queue in `(priority, npcId)` order — deterministic, no flicker, no starvation.
- **R5** Path failure / invalid destination → `blocked` or fall-through to the best valid alternative; **an NPC never freezes mid-world** — worst case is their fallback.
- **R6** Player dialogue = HIGH: interrupts NORMAL work instantly, suspends it (it resumes), and is itself interruptible by EMERGENCY — the fire does not wait for small talk.
- **R7** Deadline pressure: a late punctual plan escalates one band (`escalateForLateness`, capped at HIGH).
- **R8** Every decision is a pure function of (record, proposal, world callbacks: `tick()`, `valid()`, `resourceUse()`) — replayable, allocation-light.

## 3. The seven required scenarios (directive-mandated, all tested)

| # | Situation | Contracted outcome | Test |
|---|---|---|---|
| S1 | Commuting when an emergency occurs | EMERGENCY interrupts; commute suspends; resumes after | "S1 — commuting when an emergency occurs" |
| S2 | Socializing when it begins raining | Validity drop (world marks outdoor LOW invalid in rain) → fall-through; NO priority inflation | "S2 — socializing when it begins raining" |
| S3 | Player dialogue mid-commute | Interrupts + suspends; a second chat QUEUES once the commute escalates; commute resumes | "S3 — player dialogue while walking to work" |
| S4 | Blocked doorway | → blocked list, fall-through, retry on clear | "S4 — blocked doorway" |
| S5 | Two NPCs, one narrow access point | Capacity 1: first holds (priority, then stable npcId), other queues deterministically; completion releases | "S5 — two NPCs, one narrow stair" |
| S6 | Destination becomes unavailable | Validity fails → fall-through → fallback idle, never frozen | "S6 — destination becomes unavailable" |
| S7 | Interrupted activity valid again | Stack re-validates per tick; resumed when clear; swept while invalid | "S7 — an interrupted activity becomes valid again" |

The machine-readable table ships in code (`CONFLICT_SCENARIOS`) so future workstreams cannot drift from it silently.

## 4. Binding to the shipped world (Workstream B, contracted)

1. **Ambient walkers (Yuka):** each walker's FollowPath target becomes a function of their current claim. The existing solidity, anti-stuck, and brush laws remain the body's physics — they sit BELOW arbitration and never see priorities.
2. **Named cast:** authored tween choreography stays. When a story beat must OWN a body, it proposes a claim (EMERGENCY/HIGH) through the same door — one mechanism, no side channels.
3. **Player interactions:** `InteractionRegistry.perform` outcomes may propose claims (dialogue = HIGH). The registry's authored-gates law is untouched.
4. **Resources:** `door:<registryId>` / `stair:<registryId>` map to physical chokepoints (Workstream A); the SUB-01 stair is the worked example in tests.
5. **Street schedule (M4):** the shipped shifts (street/park/dusk) become claim SOURCES — the roster chooses proposals; arbitration keeps ownership coherent across transitions.

## 5. Anti-rigidity guard (the directive's warning)

The matrix has exactly two escalators (dialogue, lateness) and one de-escalator (validity). Emergencies are proposed by world systems, not invented by the arbitrator; LOW claims queue rather than starve; `ephemeral` marks the noise that should never queue. If a workstream needs a new priority band or rule, it changes the TABLE + THE TESTS together ([14] governance) — never a local special case.
