# 16 — Performance & Testing Strategy

| | |
|---|---|
| Status | Adopted — current numbers measured in this pass; budget law unchanged (the 4 GB Windows floor) |
| Baseline | shipped world: 321 drawables at rest (probe-census), shadow-follow + district rings shipped, suite 718 tests ≈ 7.5 s |

## 1. The budget law (unchanged by this contract)

Low-end hardware and mobile are the floor (directive PART 2). The shipped levers stay: merged statics, district visibility rings, shadow-box follow with texel snapping, atlas signs, instanced props, `?fx=off`, KTX2/meshopt furniture at ~300 KB median. **This contract adds zero render cost** — `sim/` runs headless, imports no THREE, and is not in the bundle until wired (measured: build output unchanged; suite +~2 s).

## 2. Simulation performance model (Foundation C, contracted)

| Tier | Who | Per-tick cost | When |
|---|---|---|---|
| full | NPCs near the player | schedule resolve + arbitration + body | every tick |
| background | district-relevant NPCs | schedule deltas + story-relevant events | every tick, cheap |
| abstract | everyone else | day-resolution only | on day boundaries |

State is tier-invariant ([04] §5), so tier churn cannot leak correctness bugs — only clock-time. **Cost gates (WS-F, once WS-D's valve exists):** per-tick sim budget ≤ 1 ms at 200 full NPCs on the reference laptop; arbitration events are pooled strings, no per-frame allocations in steady state (the hot-path law, AGENTS.md §1c.3).

## 3. Testing strategy — the four layers

1. **Contract tests (headless, this pass):** `tests/sim-*.test.ts` — 113 tests over ids, rng, clock, registry, entities, schedules, arbitration (S1–S7), narrative validation + fallbacks, economy audit, save/versioning, content manifest, and the reference world end-to-end. All node-pure: no DOM, no WebGL, no timers. This is the layer that makes "the architecture must be usable" checkable in CI.
2. **The shipped suite (untouched, all green):** 40 pre-existing files — state machines, save v1 compat, crowd/shuffle laws, interiors/anchors vs registry, street schedule, docs hygiene (R0 re-pointed). The E2E 4-day driver and probe harnesses remain the behavioral proof for the shipped game.
3. **The construction gate:** `validate-registry.mjs` — geometry truth (fidelity 12/12, 18/18 anchors). TS guards runtime; mjs guards construction; both read the same document.
4. **Integration gates:** `tsc --noEmit` → `vitest run` → `npm run build` → registry mjs → (WS-F adds) `auditWorld` step in the E2E.

## 4. Determinism testing (the reproducibility kit)

- Clock: exact restore across midnight; canon calendar pins (Sept 9 Y1 = Tuesday); no-timer purity (suite runs without any clock injection).
- RNG: stream independence, fork stability under interleaving (the ordering-independence regression), zero/one chance honesty.
- Economy: ledger total order; `audit()` after every scenario; identical script → identical ledger.
- Arbitration: pure functions + event trails; tie-breaks pinned by npcId order.
- **Replay recipe (WS-F product):** (worldSeed, save, input list) → re-run → diff arbitration/ledger event trails. The trail formats already exist (event lists with ticks; ledger seq).

## 5. Performance testing (what exists, what lands when)

| Check | Status |
|---|---|
| Suite duration budget (< 30 s) | **Measured**: ~7.5 s total |
| Registry load + validate cost | **Measured**: negligible (parse+index in tens of ms; part of the 2 s sim addition) |
| Drawables/draw-call census | **Shipped** (probe-census; M4 proved census-neutral changes) |
| Sim tick cost gate | **Deferred** — needs WS-D's valve; the 1 ms/200-NPC budget above is the target |
| Memory ceiling on 4 GB laptop | **Shipped posture** (budget docs + fx=off); sim adds KB-scale state (a save's npcs are small records) |

## 6. Bug-reproduction discipline

A sim bug report carries: world seed, save (or the ledger tail + flag snapshot), tick, and the arbitration/ledger trail slice. The module headers document the reproduction recipe ([06] §5). Tests are written as incident stories where a regression class earns a permanent guard — the repo's existing law, extended to the sim layer.
