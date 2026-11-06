# 04 — Entity & Identity Contract

| | |
|---|---|
| Status | Adopted — implemented (`sim/ids.ts`, `sim/entities.ts`), tested |
| Consumers | every workstream; the registry; the save system |

## 1. Two id spaces, one law each

**Registry ids** (places): `KTN-01`, `STR-KESTREL`, `BLK-N`, `TERMINAL-INT`, `IX-KJ`, `PRK-CORNER`, `SUB-01`, `R-KESTREL-N`, `LMK-06`, `NZ-PLAZA`. UPPERCASE, dash-separated. Grammar: `/^[A-Z][A-Z0-9]*(-[A-Za-z0-9]+)*$/`. Law: **permanent, append-only** (the registry's own rule). These identify places the world builds.

**Simulation ids** (entities): `kind:local` — lowercase words, single underscores; the `rel` namespace joins two npc locals with `__` (sorted). Grammar: `/^[a-z][a-z0-9]*(:[a-z0-9]+(_{1,2}[a-z0-9]+)*)+$/`. Kinds (closed set):

| Kind | Meaning | Example |
|---|---|---|
| `npc` | a persistent person | `npc:rosa_delgado` |
| `biz` | a business at premises | `biz:rosas_deli` |
| `obj` | an interactive object | `obj:newsbox_01` |
| `item` | an inventory possession | `item:mango` |
| `evt` | a world/story event instance | `evt:example_morning_regular` |
| `flag` | a persistent story/world flag | `flag:map_in_hand` |
| `rel` | a relationship edge (once per pair) | `rel:idris_warsame__rosa_delgado` |
| `grp` | a social group / organization | `grp:juniper_mutual_aid` |
| `loc` | a semantic location alias | `loc:the_cart` |
| `district` | a named district | `district:alder_heights` |
| `sched` | a schedule | `sched:rosa_delgado` |
| `txn` | a ledger transaction | `txn:example_cup_1` |
| `content` | a content asset | `content:furn_b07…` |

Law: **an id is validated at every door.** `simId()` throws on a malformed local; validators (`validateNpcs`, `validateBusinesses`, flag store, manifest) reject foreign ids; a malformed id never reaches a save. Tests pin the grammar (`tests/sim-entities.test.ts`).

Why two spaces: registry ids are construction truth shared with geometry; sim ids live through time and into saves. Collapsing them would make the registry own people or saves own streetspace (rejected in [05] §2).

## 2. Entity records (implemented shapes)

**NpcState** — `sim/entities.ts`:
`id, displayName, archetype?, homePlaceId, workPlaceId?, employerBizId?, jobTitle?, scheduleId?, location {placeId, interiorId?, x?, z?}, moneyCents, inventory[], relationships[], knowledge[], fidelity`.

Laws: home MUST resolve; work MUST resolve when present; money is a non-negative safe integer; inventory holds only `item:` ids; relationships lists only edge ids that exist once in the world map; `location` is spatial truth (owned by the spatial side — [05] §2), and `loc:` aliases are legal for off-map lives (Harlem Hospital) but must be DECLARED ([13] alias table, tested).

**RelationshipState** — once per unordered pair: `id = rel:a__b (a<b)`, `a, b, warmth [-100..100], trust [0..100], sharedEvents[]`. Edges live in `WorldState.relationships`; each member lists the edge id — never a copy of the record. A dangling edge or a double-listed edge fails the world audit.

**BusinessState** — `id, name, premisesBuildingId, interiorId?, opensAtMin, closesAtMin, days[WeekdayName], ownerNpcId, staffNpcIds[], balanceCents, graceTicks, tags[]`. Laws: premises resolve; owner and staff exist as npcs; hours are minutes-of-day with `opensAt ≠ closesAt`; `businessIsOpen()` is pure and closing-minute-exclusive (tested).

**ItemState** — `id, name, holderNpcId? | holderBizId? | holderPlaceId?, valueCents?`. Items are records in saves; quantities are list membership (stackables repeat the id).

**WorldEventRecord** — `id, tick, kind, detail?, placeId?, npcIds?[]`. History is tick-ordered; the audit refuses out-of-order events.

## 3. Cross-reference law (the "no unvalidated references" rule)

Every reference field names its resolver:

| Field | Resolves via | Failure code |
|---|---|---|
| `homePlaceId`, `workPlaceId`, `location.placeId` | registry `placePoint` or declared alias | `BAD_REF` |
| `interiorId` | registry `interiors` | `BAD_REF` |
| `premisesBuildingId` | registry buildings | `BAD_REF` |
| `ownerNpcId`, `staffNpcIds` | world npcs | `BAD_OWNER` / `BAD_REF` |
| `relationships[]` | `WorldState.relationships` keys | `BAD_RELATION` / audit |
| `knowledge[]` | sim id grammar (content ids land with Workstream C) | `BAD_REF` |
| `employerBizId` | world businesses | `BAD_REF` |

`auditWorld()` runs all of it plus ledger and ordering checks; the reference world and every test scenario pass it clean.

## 4. Entity lifecycle

- **Create:** by the owning workstream's factory, through validation, with a stable id minted ONCE (`simId()`); ids are never renumbered (registry law, extended to sim ids).
- **Mutate:** only through the owner ([05] §2). NPCs mutate through the NPC system; balances only through `EconomyLedger.post`.
- **Freeze:** a save snapshots; a load rehydrates Maps and classes (`snapshotWorld` / `hydrate` — round-trip tested).
- **Retire:** NPCs do not die silently in v1 — a retired person keeps their record with `fidelity: 'abstract'` and an availability hold (`reason: 'story_hidden'`); death/removal is a Workstream C/B decision with a world event, never garbage collection.

## 5. Fidelity tiers (Foundation C's performance law)

`full | background | abstract` — how much PRESENTATION an npc earns, chosen by the fidelity manager (Workstream B, near the player = full). **State is identical at every tier**; tier changes may not create, destroy, or move facts — only the simulation's attention differs. The reference world ships examples of all three (Rosa full, Idris background, Deon abstract).
