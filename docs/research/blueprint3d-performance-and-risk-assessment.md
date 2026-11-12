# Blueprint3D — performance & risk assessment

> The price list for [blueprint3d-integration-blueprint.md](blueprint3d-integration-blueprint.md).
> Companion docs: [blueprint3d-original-audit.md](blueprint3d-original-audit.md) ·
> [blueprint3d-modern-audit.md](blueprint3d-modern-audit.md) ·
> [blueprint3d-first-slice-applications.md](blueprint3d-first-slice-applications.md).
> Method: every number below is either read from the reference source with a file/line citation, or
> read from our own gates (probe budgets, test counts). No vibes were harmed in the making of this doc.

## 0. Why the reference repos' performance profile is a warning, not a benchmark

Blueprint3D runs one apartment in an editor at a deliberately throttled framerate. FIRST SLICE runs
a city. The same code that is invisible at their scale is fatal at ours — so the assessment starts
by cataloging what their architecture costs, then checks each proposed adaptation against our
actual budgets.

## 1. The reference repos' performance profile (from source)

| # | Property | Evidence | Why they survive | Would it hurt us? |
|---|---|---|---|---|
| 1 | **Rebuild-not-diff**: every plan edit destroys and recreates ALL floors/edges | `Three.Floorplan.redraw` (original three/floorplan.ts:19–44; modern, 49 LOC) — subscribed to `updated_rooms` | A floor plan edits rarely; a room has ~10 walls | **Yes** — but our integration derives rooms at *build time*, never per frame (§3, P2) |
| 2 | **Zero GPU disposal**: `dispose()` exists once (modern GLBLoader, never called) | grep across both trees; original has zero matches | Editor sessions are short; leaks hide until reload | **Yes** — any port that rebuilds geometry must dispose (§3, mitigation M1) |
| 3 | **Per-drag re-triangulation**: moving an in-wall item re-cuts its wall face's `ShapeGeometry` every frame | `WallItem.moveToPosition → redrawWall` (original wall_item.ts:138–143) | Editor-only; one wall at a time | Avoided — we have no live wall editing (§8 of the blueprint) |
| 4 | **~20 fps render throttle with dirty flags** | `setTimeout(50)` + `shouldRender()` OR of 4 flags (original three/main.ts:184–190, 280–296) | It's a planner, not a game | The *dirty-flag idea* is fine; we keep our rAF loop — nothing to adopt |
| 5 | **Exponential room-finding** (DFS from every corner pair, dedupe by all rotations) | original floorplan.ts:375–494; modern floorplan.ts:388–516; both carry the same `TODO: optimize this` | A dozen corners | **Yes at P5 scale** — mitigated by the DCEL face-walk port (§3, M2) |
| 6 | **O(n) scans everywhere**: walls/corners as arrays, linear lookups; 5 meshes per half-edge | original floorplan.ts:19–25, three/edge.ts (5 planes per edge) | ~dozens of walls | Mostly irrelevant post-adaptation (build-time), but the mesh-per-half-edge cost informs the collider/geometry census (§3, P2) |
| 7 | **Network-per-placement**: no model cache; per-Edge texture fetches (incl. one unused lightmap CDN fetch per wall rebuild) | modern scene.ts:173–192, three/edge.ts:37 | Tiny catalog, CDN kindness | **Yes** — our GLB upgrade seam already caches at boot; the plan layer must not add per-object fetches (§3, M3) |
| 8 | **Merge drops attributes** (vertex colors/tangents) in the modern GLB path | modern GLBLoader.ts:188–267 | Their catalog doesn't use vertex colors | Ours does (`vertexFuse.ts` flat-part fusing) — one more reason the port is patterns-only |
| 9 | **Listener accumulation** (`bind()` unsubscribe no-ops; ~9 dead event buses) | original wall_item.ts:162–165; modern controls.ts:398–407 | Long-lived single page, low churn | The pattern fix (stored bound handlers, inventory-checked emitters) is adopted; the disease is not |

**The one-sentence read:** both repos spend GPU memory and CPU like an editor because they are an
editor; the *architecture* (derive-don't-store, dirty flags, proxy raycast planes) is cheap —
the *implementation habits* (rebuild everything, dispose nothing, fetch everything) are exactly
what our hot-path law forbids.

## 2. The budgets our integration must respect (ours, measured)

- **Draw calls**: boot probe budget < 200 (`probe-perf`, cited in register v1.47/v1.48 rows; the
  subway fix's "+1 for the standalone yard roof" was worth a sentence). A plan-built room must not
  raise static draw counts: walls/floors land in `bakeStatics()` district tiles and the interior
  groups like every hand-built surface.
- **Hot path**: collision and per-frame updates are allocation-free pure functions over flat arrays
  (`engine/collide.ts` MAX_SUBSTEP/SKIN discipline; `World.updateDynamics` syncs existing AABBs).
  The plan layer adds **zero per-frame work**: derivation is build-time, placements are data,
  placement *validation* runs on interaction (not per frame).
- **Mobile tier**: `render/quality.ts` tiers + auto-degrade watchdog; 4 GB tablet budget cited in
  `worldRuntime`. Geometry added by the plan layer is modest (a room's walls ≈ what `wallRun`
  already emits — the census test in the blueprint's P2 pins equality, not just "similar").
- **Boot**: GLB upgrades are async at boot; plans add only JSON parsing of registry rows
  (kilobytes) and one `deriveRooms()` pass per interior at world build — microseconds, once.
- **Gates**: `tsc --noEmit`, vitest (1,532 tests / 95 files at v1.48), build, the 4-day E2E,
  the probe fleet. Every phase in the blueprint lands only with these green — that is the existing
  law, not a new one.

## 3. Phase-by-phase cost analysis (of the proposed integration)

**P1 — `plan.ts` pure data + derivation.** Runtime cost: **zero** (no THREE, no wiring; the module
ships un-consumed except by tests). Build-time cost: one face-walk per interior. Complexity: the
only real risk is algorithmic correctness — mitigated by oracle tests against the original
(blueprint §6). *The cheapest possible first move.*

**P2 — plan-built walls/floors for the bodega + one W5 room.** Runtime cost: **none beyond today**
if — and only if — the collider census and geometry census match the hand-built baseline (pinned by
test). Mitigations that are part of the phase, not afterthoughts:
- **M1 — dispose discipline**: the port's geometry builder disposes old geometries/materials on any
  rebuild and registers nothing global; materials come from `MatBank` (shared, never per-wall).
  The reference repos' leak habit is explicitly *not* ported.
- **M2 — face-walk, not DFS**: `deriveRooms` is the DCEL face walk (O(walls)), fixing the
  exponential worst case both references carry.
- **M3 — no new fetches**: textures/materials via `MatBank`/atlas only; GLBs via the existing
  upgrade seam (boot-cached). The modern repo's per-Edge CDN fetch (including the unused lightmap)
  is the anti-pattern to name in review.

**P3 — placement data rows + validation math.** Runtime cost: interaction-time only
(`validatePlacement` on placement/rejection — microseconds). Data cost: footprint metadata per
furniture slot (a few hundred bytes each). **M4 — no per-frame validation**: authored placements
are validated at build/boot; live placements at the moment of placement. Nothing polls.

**P4 — persistence.** Cost: save-size growth (one compact row per placement; clamped count), parse
cost at load (whitelist rebuild — the established pattern's cost, already paid for flags/ledger).
Save-law risk is §4's R2, not a perf risk.

**P5 — multi-room floors.** The first phase with real geometric scale (two+ rooms, shared walls,
courtyards). Mitigations: derivation stays build-time; the face-walk handles shared walls by
construction (each wall carries front/back half-edges — the DCEL's whole point); the registry
cross-check grows a plan-vs-shell containment validation so a plan can't silently exceed its
building. This is also the phase where the **nav build** consumes plan door descriptors — the
phase's risk is sim-coupling (R3), not perf.

## 4. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **License/asset contamination** — reference *code* is MIT (both repos; original's `package.json` claims "(MIT OR Apache-2.0)" with no Apache text present — treat as MIT). But their **demo assets** are unlicensed CDN content (modern `src/constants.ts`, `wall.ts:10`, `edge.ts:37` hardcode `archybase`/`lumenfeng` CDNs; original ships retailer-catalog furniture). | Low (we copy no assets) | High (license ledger violation) | Patterns-only port (house law, Doc 57 §0.5); zero asset URLs copied; provenance noted in `THIRD-PARTY-NOTICES.md` when a wave lands; this audit documents the asset boundary explicitly |
| R2 | **Save-law breach** — interior state persisted sloppily (breaking byte-compat or opening the tamper surface) | Medium | High (world-save quarantine, lost progress) | Optional-trailing field + whitelist parse + clamps + the mirrored tamper battery; the R2 precedent (`world-save-validation.test.ts`, 482 lines) is the template |
| R3 | **Sim/nav coupling** — plan door descriptors drift from the nav graph's door edges, or a plan-built wall breaks a walker band | Low | High (crowd/traffic laws) | P5 consumes `sim/nav/build.ts`; never mutates it; `sim-nav*`/`crowd`/chokepoint probes gate the phase; doors remain registry-owned data with one descriptor feeding both build and nav |
| R4 | **World.ts god-file gravity** — new code creeps into the 8,433-line constructor instead of the module | Medium | Medium (maintainability; review cost) | The blueprint's files-touched map is exhaustive; `World.ts` changes are *consume-only*; the A-3 "registry geometry flip" precedent is the pattern to cite in review |
| R5 | **Derivation correctness** — face-walk mis-derives a degenerate plan (T-junctions, collinear walls, courtyard holes) | Medium | Medium (broken rooms, wasted wave) | Oracle tests vs the original algorithm; explicit fix of the inherited `halfAngleVector` ÷0; registry validation rejects degenerate plans at load ("corrupt is a fresh start" applied to plans) |
| R6 | **Dead-emitter rot** — the module-local event surface grows unused kinds (both references ship ~9 dead buses) | Medium | Low | Exhaustiveness-pinned `InteriorEvent` union (a test walks every kind); inventory review at each phase |
| R7 | **Scope creep into an editor** — "while we're here" 2D planning UI | Medium | High (weeks of work, zero gameplay) | §8 of the blueprint is explicit and permanent: the player is not the architect; any editor talk is a new directive |
| R8 | **Perf regression on mobile** — plan-built rooms heavier than hand-built | Low | Medium | P2 census test pins equality; probe fleet + auto-degrade watchdog catch the rest; failure mode is a revert, not a hotfix |
| R9 | **Estimation error on P5** — multi-room floors are the H-complexity item and depend on C1+ scheduling | Medium | Low (defer, don't fail) | P5 stays unscheduled until the content wave exists; P1–P4 are independent of it |

## 5. Complexity summary

| Phase | Size | New code (est.) | Risk focus | Independent? |
|---|---|---|---|---|
| P1 plan model + face-walk derivation | **M** | ~500 LOC + tests | R5 | yes (pure) |
| P2 plan-built walls/floors (bodega + 1 W5) | **M** | ~400 LOC + registry rows | R4, R8 | yes |
| P3 placement semantics + authored rows | **M** | ~450 LOC | R6 | yes |
| P4 overlap checks + persistence + live placement | **M** | ~400 LOC | R2 | needs P3 |
| P5 multi-room floor + nav descriptors | **H** | ~600 LOC + 2 registry plans | R3, R9 | needs P1–P2 |

Total for P1–P4: roughly 1,700–1,800 lines of new, test-covered, registry-fed code — comparable to
one W5 interior wave. Nothing in it touches the hot path; nothing in it requires a dependency;
nothing in it replaces an existing system.

## 6. Recommendation

**Proceed with P1–P3 when an interiors wave is scheduled; treat P4 as content-gated (a placement
beat must want it); treat P5 as content-gated (a multi-room floor must exist).** The reference
study is done and recorded; the architecture is proven at both references' scale; the adapted plan
keeps every FS law intact. The honest caveat, per the Anti-Slop gate: none of this is "ready"
until it is *looked at* in the running game — the probe-screenshot vantages from the bodega pass
are the evidence pattern to reuse.

The residual cost of *not* doing this is worth stating once: every new interior re-derives its own
walls, openings, and shelf heights by hand, and every persistence need re-invents a placement
save format. Blueprint3D's decade of prior art exists precisely so we stop paying that tax.
