# 05 — Global Simulation State Contract

| | |
|---|---|
| Status | Adopted — implemented (`sim/state.ts`), tested; bridge wiring = Workstream D |
| The question | *What is the actual state of the world at this exact simulation moment?* |

## 1. The answer, concretely

A `WorldState` — plain data, serializable, owned section by section:

```
worldId · seed                    identity (alder_heights · 19940909)
clock                             in-game time (sim/clock, the ONLY writer)
player { npcId, homePlaceId, moneyCents }
npcs[]                            every persistent person
relationships Map<relId, edge>    once per pair
businesses[]                      premises, hours, staff, balances
ledger                            every money movement (append-only)
flags                             story/world flags with set-ticks
availability                      narrative holds on characters
chapter { n, rails, calendarDay } the rails engine's container
missable[]                        authored windows + disposition
consequences[]                    the consequence ledger (append-only)
events[]                          world event history (tick-ordered)
environment {}                    weather epoch etc. (starts honestly empty)
```

## 2. The ownership table (data, not prose)

`OWNERSHIP` in `sim/state.ts` is a const table — **and a test walks every field of a live WorldState and refuses any section without a row** (`tests/sim-state.test.ts`, "the ownership table covers every WorldState section"). The table cannot rot silently. The rows:

| Section | Owner | Writes | Reads |
|---|---|---|---|
| worldId / seed | world boot | boot only | save, diagnostics |
| clock | **sim/clock** | `advance`/`setMinuteOfDay` only | everything, read-only |
| player | story bridge (WS-D) | story effects → posted transactions | HUD, economy reports |
| npcs | **WS-B** | npc system + arbitration | validation, renderer, schedules |
| relationships | **WS-B** | npc system via relId edges | narrative conditions, dialogue |
| businesses | **WS-D** | world sim | narrative validation, interactions |
| ledger | **sim/economy** | `post()` only | reports, audits, saves |
| flags / availability | narrative contract | story effects | conditions, diary, world reactivity |
| chapter / missable / consequences | **WS-C** | rails / windows / append-only ledger | gating, diary, self-portrait |
| events / environment | **WS-D** | recorder / environment systems | arbitration validity (rain), rendering |

**The conflicting-copy rule:** no system keeps a second authoritative copy of another's truth. The one sanctioned dual view — `player.moneyCents` mirroring `ledger.balance('acct:player')` — is a declared mirror, and `auditWorld()` fails the world the moment they disagree (tested). Story state (GameState's steps, map notebook, money-as-shipped) is NOT duplicated here: the story layer owns it; the bridge writes world facts at beats, one-way ([02] D1).

## 3. World identity

`worldId` ('alder_heights') + `seed` (u32). A save from another world id **never loads here** (parse refuses politely — tested). The seed feeds `WorldRandom`, which mints named streams; derived flavor is a pure function of (seed, stream, salt) and is never serialized — save the cause, not the effect.

## 4. Serialization rules

- `snapshotWorld(world) → WorldSaveDocument` — deep-copies arrays, serializes Maps as arrays, keeps only live data.
- `parseWorldSave(raw) → { world, source: 'fresh'|'restored', notes[] }`:
  - no/bad JSON → fresh world, noted;
  - wrong magic / foreign worldId → fresh, noted (a different city must not leak in);
  - wrong version → fresh + a note naming the migration TODO;
  - restored worlds re-derive ledger genesis (final − Σdelta) and run the full integrity audit, surfacing anything odd in `notes`.
- **v1 additive-evolution rule** (the story save's proven pattern): new fields are OPTIONAL and trailing; old saves parse; readers name their fields. v2 changes version and writes a reader — never a silent transform.
- Save key: `first_slice_world_v1` — beside `first_slice_save_v1`, never inside it (tested).

## 5. Save/load failure discipline (the save.gd law, world-scale)

A corrupt save is a fresh start, never a crash: every parse path returns a VALID world plus notes. Silently-impossible outcomes are specifically guarded by tests: duplicate npcs (validation), missing buildings (`BAD_REF`), invalid ownership (`BAD_OWNER`), broken relationships (dangling-edge audit), impossible balances (non-integer/negative refuse; mirrors disagree fail the audit), invalid narrative progression (flags validate their ids at the door).

## 6. Determinism hooks owned here

- `worldRandom(world)` — the seeded stream source ([06]).
- `clock.tick` — the total-order integer every record stamps.
- Update ORDER is a Workstream D contract at integration time; this layer guarantees every record carries the stamp that makes order provable (events[] ordering is audited today).
