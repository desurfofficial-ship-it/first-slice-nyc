# 06 — Determinism & Time Progression

| | |
|---|---|
| Status | Adopted — implemented (`sim/clock.ts`, `sim/rng.ts`), tested |
| The law | In-game time is the ONLY progression driver. |

## 1. The two clocks, stated precisely

| Clock | Units | Owner | Drives |
|---|---|---|---|
| **In-game clock** | ticks = minutes; days = 1440 ticks | `sim/clock` (sole writer) | schedules, business hours, seasons, chapter windows, ledger stamps, narrative windows |
| **Real time** | seconds per frame (`dt`) | Game.frame | movement integration, tweens, audio — PRESENTATION ONLY |

`GameClock.advance()` converts real dt to ticks upstream (a `timeScale`, e.g. the shipped ≈1 game-day per 5–8 real minutes). Presentation may slow the world for a listening beat (Game's 0.45× street-performer rule); the sim hears only ticks. **No sim module reads `Date.now()`/`performance.now()`** — the clock is pure integer math, and the suite runs it in node without any timer at all.

## 2. The canon calendar (narrative-aligned)

- Day 1 = **Tuesday, September 9, Y1** — the arrival (docs/narrative/12 §1). Tests pin it.
- 365-day years, real month lengths, **no leap time**; year names are diegetic (`Y1, Y2…`) — **no real-world dates anywhere in save or prose** (narrative R4).
- Weekdays derive (`day+1 mod 7` from Tuesday); weekends gate schedules (Kev's Sunday dominoes is a pinned test).
- Seasons are meteorological: arrival is autumn; December is winter. Season cuts are Workstream C's `seasonCut` transition (narrative doc 12 §5); the clock only reports.
- Day phases (`night/dawn/morning/midday/evening/dusk`) are fixed bands for arbitration and narration. The shipped dusk choreography keeps its own trigger; the phase is available when something needs one.

## 3. Time-progression principle (directive PART 1)

- Small developments: in-game **days** (a flyer rotates, a window warms).
- Major developments: in-game **months** (a business grows, a relationship turns, the neighborhood shifts — the narrative spine is ≈27 in-game months, docs/narrative/12 §6).
- **Nothing major keys to real-world days.** There is no daily-real-bonus, no server-date gate, no "come back tomorrow" machine anywhere in the contract, and the flag store stamps in-game ticks only.

## 4. Deterministic simulation, nondeterministic presentation

The honest split (directive PART 4 Foundation A):

**Deterministic (this layer):** tick advancement; schedule resolution; arbitration decisions; ledger application; narrative validation; flag state; entity validation; save parse. All pure or state-owned, all replayable: same (save, inputs) → same world.

**Nondeterministic (never promoted):** render timing, animation blending, audio scheduling, Yuka's steering micro-forces, GC pauses. These may VARY; they may not WRITE sim state except through the clock's tick (dt → ticks is the one narrow door, and it is allowed to jitter — a missed tick is late time, never wrong time).

## 5. Seeded randomness (adapted from Gen City Auto, AGENTS.md §1e)

- `WorldRandom(seed)` mints **named streams** (`stream('npcs')`); streams are independent — system A's consumption can never shift system B's rolls (tested).
- `stream.fork(salt)` derives sub-streams stable regardless of WHEN they are taken (tested: early-fork vs late-fork sequences are identical).
- Stateless helpers (`fnv1a`, `hash2`, `hashf`) for positional flavor — "does THIS window light" never consumes a stream.
- Generator: mulberry32 — the same family the shipped world already uses (`dressing.ts`), so one RNG vocabulary serves the whole project. API shaped like the reference's (`int/range/chance/pick/weighted`).
- **Reproduction recipe:** (worldSeed, stream name, tick, input list) ⇒ re-run. The ledger's `seq`/`tick` and arbitration events give bug reports their coordinates.

## 6. Replay & debugging foundations

- `GameClock` serializes to two integers and restores exactly (tested, incl. midnight-boundary cases).
- Ledger = append-only; `audit()` proves balance ≡ genesis + Σ at any moment (tested).
- Arbitration outcomes are event lists (`introduced/suspended/queued/…` with tick stamps) — a conflict scenario leaves a readable trail in tests today and a debug log hook for Workstream F.
- A scripted future (`clock.clone()` + advance) lets tests and tools speculate without moving the world now.

## 7. Status

| Item | Status |
|---|---|
| GameClock (tick, calendar, phases, serialization) | **Implemented + tested** |
| WorldRandom streams/forks | **Implemented + tested** |
| No-wall-clock discipline | **Implemented** (pure node tests; code review: zero timer imports in `sim/`) |
| dt → tick scaling at the Game loop | **Implemented 2026-11-06** (`sim/runtime.ts` valve + `Game.frame` hook: dt→whole minutes, one accumulator, pauses host-owned; the shipped day-paced story keeps its authored rhythm — the clock runs beside it, presentation flips key to the clock only in roam/scenario) |
| Season-cut transitions | **Declared** (types in [10]) — Workstream C builds per docs/narrative/14 |
