# 15 — Validation & Integration Rules

| | |
|---|---|
| Status | Adopted — every rule below is enforced by code that runs in CI today |
| Principle | A validation that lives only in a doc is a wish. These live in `src/sim` and `tests/`. |

## 1. The validation inventory

| # | Rule | Enforced by | Test |
|---|---|---|---|
| 1 | Id grammar, both spaces | `ids.ts` regexes; `simId()` throws | `sim-entities.test.ts` "the two id spaces" |
| 2 | Entity refs resolve (home/work/premises/owner/staff/location) | `validateNpcs`, `validateBusinesses` | `sim-entities.test.ts` gates |
| 3 | Money is integer, non-negative | validators + ledger `BAD_AMOUNT` | entities + economy tests |
| 4 | Duplicate npcs/businesses refused | validators `DUPLICATE` | entities tests |
| 5 | Business hours sane + open/close honored | hour checks; `businessIsOpen` | entities tests |
| 6 | Relationship edges: sorted pair, once, no dangling, no double-listing | `relId`; `auditWorld` | ids tests + state audit tests |
| 7 | Ledger: positive ints, flow classes, overdraft, dup ids, total order | `EconomyLedger.post` | `sim-economy.test.ts` |
| 8 | Balance ≡ genesis + Σ transactions | `audit()` | economy + reference tests |
| 9 | Registry cross-refs (interiors→buildings, anchors in shells, intersections, park zones, bounds) | `validateCrossRefsStatic` at load | `sim-registry.test.ts` (zero issues pinned) |
| 10 | Semantic queries deterministic (nearest-first, stable ties) | `findPlaces` sort | registry tests |
| 11 | Clock: no rewind, exact restore, canon calendar | `GameClock` | `sim-clock.test.ts` |
| 12 | Schedules: pure resolution, weekday/overnight/fallback/late | `activityAt` | `sim-schedule.test.ts` |
| 13 | Arbitration: R1–R8 + scenarios S1–S7 | engine + `CONFLICT_SCENARIOS` | `sim-arbitration.test.ts` |
| 14 | Narrative: NPC_MISSING / DOUBLE_BOOKED / UNAVAILABLE / PLACE_MISSING / BUSINESS_CLOSED / prereqs / windows | `validateEvent` | `sim-narrative.test.ts` |
| 15 | Fallbacks deliberate (cancel/reschedule/relocate/defer) | `planFallback` | narrative + reference tests |
| 16 | Flags well-formed, tick-stamped | `FlagStore.set` | narrative tests |
| 17 | Content manifest: ids, kinds, safe paths, dupes, license duty | `validateManifest` | `sim-content.test.ts` |
| 18 | World save: magic/version/world gates, polite refusal, corrupt→fresh | `parseWorldSave` | `sim-state.test.ts` |
| 19 | Save round-trip preserves a populated world | snapshot/parse | state + reference tests |
| 20 | Ownership: every WorldState section has an owner | OWNERSHIP table walk | `sim-state.test.ts` |
| 21 | Player money mirror agrees with ledger head | `auditWorld` | state tests |
| 22 | World events tick-ordered | `auditWorld` | state tests |
| 23 | Reference manifest self-validates at construction | `buildReferenceWorld` throws | reference tests |
| 24 | Docs hygiene: phase line, bible existence + dated canon banner | `docs-hygiene.test.ts` (R0 re-point) | runs in suite |
| 25 | Registry construction fidelity (12 masses, 18 anchors) + geometry rules | `scripts/design/validate-registry.mjs` | repo gate (runs green) |

## 2. Integration rules (how pieces combine without surprises)

1. **One world, one clock, one ledger, one arbitration.** A second instance of any of these is a defect by definition; the ownership table names the single home of each.
2. **Validation happens at the doors** — construction, mutation (owners), save boundaries, and narrative submission. Inside the walls, code may move fast.
3. **A failed validation never mutates.** Validators return issues; posters return null; the world they describe is unchanged. (The ledger refuses the WHOLE transaction — no half-moves.)
4. **Corrupt input degrades to a valid state with notes** — saves, flag stores, lists (the strList pattern): never a crash, never a silent half-accept.
5. **Determinism proof is cheap:** every module in `sim/` runs in node without THREE/DOM; WS-F can replay any scenario from (save, inputs).
6. **Contract changes carry their tests** — a rule without a failing-test demonstration of what it prevents does not land (AGENTS.md §1c.1).
7. **The shipped game stays green** — any contract change that breaks `Game`/`World`/E2E is a breaking change ([14] §4) and follows that path, not a quiet patch.

## 3. CI shape (current, no new infra)

```
npx tsc --noEmit        # types are the first validator
npx vitest run          # 718 tests incl. the 25 rules above
npm run build           # production bundle
node scripts/design/validate-registry.mjs   # construction gate (unchanged)
node scripts/e2e.mjs    # the 4-day driver (unchanged; ~9 min)
```

The sim layer adds ~2 s to the suite and nothing to the bundle (it is contract+tests until WS-D wires it) — measured, not assumed.

## 4. What validation does NOT cover yet (honest ledger)

- Runtime occupancy queries (who is at a place) — needs WS-B's location updates.
- `PLACE_INACCESSIBLE` real reachability (doors/keys) — needs WS-A's access control.
- Narrative rails/windows MACHINES (types + validation only) — WS-C per docs/narrative/14.
- Perf regression gates for sim tick cost — WS-F once the valve exists (the layer is allocation-light by construction; the hot-path law still applies to future wiring).
