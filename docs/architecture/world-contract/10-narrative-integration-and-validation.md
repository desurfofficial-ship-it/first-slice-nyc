# 10 — Narrative Integration & Validation

| | |
|---|---|
| Status | Adopted — validation seam implemented (`sim/narrative.ts`), tested; machines = Workstream C per docs/narrative/14 |
| Boundary | The storyline is the Narrative Director's (docs/narrative/00–15, canon). This contract touches NOTHING creative. |

## 1. The seam

The bible's implementation spec (docs/narrative/14, R0–R15) defines WHAT the narrative layer will build. This contract defines the DOORWAY it builds through — the world-side state and validation its content can rely on:

| Spec-14 need | Contract answer | Status |
|---|---|---|
| R1 rails | `ChapterState.rails` declared in world state | Type **declared**; engine = WS-C |
| R2 consequence ledger | `LedgerEntry` + `WorldState.consequences` (append-only) | Type **declared**; machine = WS-C |
| R3 diary | diary entries are narrative-layer data; the world supplies `WorldEventRecord` history + flags | **Seam defined** |
| R4 time model | `GameClock` — calendar-only, no real dates ([06]) | **Implemented** |
| R5 independence | `NpcState` + schedules + availability (majors tick off-screen through the SAME machinery) | **Foundation implemented** |
| R6 missable windows | `MissableWindow` in world state; cancel-writes-a-flag fallback | Type **declared** + fallback policy implemented |
| R7 choice nodes | flags + ledger are the writes a node performs | **Seam defined** |
| R8 chapter gating | `chapterAtLeast` condition + calendar windows | **Implemented** (validation side) |

## 2. Narrative state model (implemented)

- **`FlagStore`** — `flag:`/`evt:` ids with set-ticks; malformed ids throw at the door (tested). Story flags and world flags share one store because the diary and the world read the same truth.
- **`AvailabilityRegistry`** — explicit holds (`working/sleeping/away/in_event/story_hidden`) with review-ticks; default rule is schedule-driven reachability (EMERGENCY-priority activities cannot be pulled into scenes; holds outrank schedules until released). `validateEvent` injects the tick so expiry runs on every pass (tested).
- **`StoryEvent`** — `id, title, npcIds[], placeId?, requiresBusinessId?, window{opensAtDay, closesAtDay?, band}, prereqs[], priority?, onFail?`.

## 3. Validation: the impossible-state refusals (all tested)

| Rule | Violation code |
|---|---|
| An event cannot cast a person who does not exist | `NPC_MISSING` |
| A character cannot attend two scenes at once | `NPC_DOUBLE_BOOKED` |
| A held/hidden character cannot be pulled in | `NPC_UNAVAILABLE` |
| A scene cannot require a building the registry never heard of | `PLACE_MISSING` |
| A business must be OPEN for its scene (hours + weekday) | `BUSINESS_CLOSED` / `BUSINESS_MISSING` |
| An event cannot run before its prerequisites | `PREREQ_UNSATISFIED` |
| The calendar gates: opens / band / closes | `WINDOW_NOT_OPEN` / `WINDOW_MISSED` |
| Relationships gate warmth-gated scenes | `PREREQ_UNSATISFIED` (via the relationship read) |

Conditions are a closed set: `flag, notFlag, dayAtLeast, chapterAtLeast, relationshipAtLeast (vs the player), businessOpen, npcKnown`. Extending the set = a test, never a silent injection ([14] governance).

## 4. Semantic location requests (the author never writes coordinates)

An author states: a home, a workplace, a restaurant, a public gathering place, a transport station, a suitable confrontation location — as **tags + requirements** ([07] §4). The registry resolves; the validator confirms; the fallback planner repairs. Worked example in the reference world: `evt:example_morning_regular` needs `food_service`-tagged premises with an open business and two available characters — it validates at Tue 08:05 and refuses at 23:00 with `BUSINESS_CLOSED` (both tested).

## 5. Failure handling: the fallback planner (never silent)

`planFallback(event, violations, world)` — exactly ONE deliberate action:

| First violation | Action |
|---|---|
| `WINDOW_MISSED` | **cancel** + write `flag:<id>_missed` — the miss is CONTENT (R6: a changed world, never a nag) |
| `BUSINESS_CLOSED` | **reschedule** to the next opening day at the business's opensAtMin |
| `PLACE_MISSING` / `PLACE_INACCESSIBLE` | **relocate** to the nearest `social_gathering, public_access` place (a confrontation needs people, not a room) |
| `NPC_UNAVAILABLE` / `NPC_DOUBLE_BOOKED` | **defer** one in-game hour |
| `PREREQ_UNSATISFIED` / `WINDOW_NOT_OPEN` | **defer** one in-game day |
| `NPC_MISSING` / `BUSINESS_MISSING` | **cancel loudly** — authored-data BUG, flagged `authored_bad`, never a story state |

Pause/resume is the defer path with an availability hold; alternate locations are the relocate path; alternative outcomes are the cancel path writing its flag. **Nothing ever force-executes an invalid event.**

## 6. Relationship to the four-day story

Untouched. GameState keeps its steps, map notebook, and money law. When Workstream C bridges the bible's C0 opening onto the shipped Days 1–4, story effects write world facts (flags, ledger entries) at beats — one-way — per [02] D1. The `docs-hygiene` guard now protects the bible's existence (R0, done in this pass).

## 7. Status ledger

| Item | Status |
|---|---|
| Flag store, availability registry, event validation, fallback planner | **Implemented + tested** |
| Rails engine, diary, choice nodes, amends economy machines | **Declared** — WS-C builds in docs/narrative/14 §7 order |
| Door/key accessibility (`PLACE_INACCESSIBLE`) | **Wired, unenforced** — spatial workstream tightens `canReach` |
| Real-time anywhere in narrative | **Forbidden** (R4) — clock tests + code review enforce |
