# Current World Audit — MASTER BUILD ASSIGNMENT, M0

> **Status:** Audit deliverable (2026-11-14). Produced by the Lead Open-World
> Engineer agent from the actual source tree at commit `de9777c` (registry
> v1.75.0 era, main), **plus a live browser inspection** — the evidence
> screenshots were captured from the built game by
> `web-three/scripts/probe-world-map-evidence.mjs` this session and read
> back (12 frames, zero page errors, boot draws 193).
>
> This document is the M0 deliverable of the 2026-11-14 master build
> assignment ("complete the open world"). It supersedes nothing; it
> consolidates `docs/world-map/01-existing-world-audit.md` (the 2026-11-13
> source-grounded audit) with this session's **visual verification** and the
> **construction-relevant facts** the build waves need.

---

## 1. Verification result — the shipped world is real

The audit's first duty was to verify the previous sessions' claims by
*looking at the game*, not the docs. Result: **confirmed**.

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **1,733 / 1,733 across 104 files** (the tree has grown
  past the 1,709 recorded in the handover).
- `npm run build` — OK.
- The evidence probe booted the built page headlessly and captured all 12
  world-map evidence frames (`docs/world-map/images/existing/` set): the
  five streets, the fenestra dusk district, the W12 filigree, the terrace
  gate, the K-line ride mid-tunnel, the Times Square arrival, the isometric
  overview, the y=200 top-down. **Zero page errors.** Boot census: **193
  draw calls** (the probe budget is < 200; the recorded baseline was 190–193
  across waves — the number moves ±3 with dressing waves and is re-read
  every wave).
- Visual read of the two overview frames: a dense, coherent lowpoly
  neighborhood — brownstone rows with stoops, water towers, fire escapes,
  HVAC clutter, the Kestrel commercial row, parks with pergola and court,
  avenues with vanishing-point skyline fabric. Nothing floats; nothing
  reads as placeholder.

## 2. What the world is (the construction-relevant summary)

**Alder Heights** — one walkable neighborhood, x −100..+100, z −64..+64
(200 m × 128 m), plus the far world one subway ride west (the K tunnel,
42 St–Times Square, the canyon at x ~−400).

| System | Where it lives | What the build must reuse |
|---|---|---|
| Registry (world truth) | `docs/data/world-registry.json` (4,978 lines, v1.75.0) | Every new row appends; ids `CJN-*`; the validator (`tests/sim-registry.test.ts`, `validateCrossRefsStatic`) gates cross-refs |
| World builder | `web-three/src/world/World.ts` (9,979 lines) | `solid()` / `deco()` / `regShell()` / `groundSolid()`; `bakeStatics()` fuses statics per district tile |
| District culling | `World.ts` district system | 6×3 tile lattice (28×32 m), `STREET_RING = all columns`, `ROW_RING = 1`; ring visibility from the player's tile |
| Bake | `World.bakeStatics()` | Non-emissive flat-color meshes fuse into `VC|fog|cast|receive` batches **per tile**; mapped (groundTex) and emissive and instanced meshes stay individual |
| Ground | `world/groundTex.ts` | `asphalt` / `concrete` kinds, metric UVs; mapped ⇒ each piece is its own draw |
| Facades | `world/facadeKit.ts` (`WEAR`), `world/props.ts` makers | storefronts, stoops, window rhythm, cornices |
| Roof fabric | `world/cityFabric.ts` `roofFabric()` | iterates **all** registry buildings h ≥ 7 not in `ROOF_SKIP` — new rows gain tanks/chimneys free |
| Fire escapes | `world/neighborhoodFabric.ts` `ESCAPE_JOBS` | explicit per-row job list; new jobs are one-line entries |
| Skyline fabric | `world/cityFabric.ts` | merged fog-exempt silhouette mesh + instanced panes; card rows at x ±122, z ±88/104 |
| Subway | `world/subway/` (index/stationKit/trainKit/ride) | two-station line (A −44 ⇄ B −332); kit-parameterized stations; pure ride state machine |
| Nav | `src/sim/nav/build.ts` | graph **derived from registry rows**; `LANES` per street id; `NAV_BOUNDS` x ±100, z ±48 |
| Walkability gate | `scripts/diag-pocket-scan.mjs` | flood fill at 0.5 m over the colliders; standing gate for any map growth |
| Draw budget | `scripts/probe-city-fabric.mjs` | < 200 census from the spawn rig; 193 today |
| Boundaries | `World.ts` x ±100 / z ±64 collider walls | the east wall is the build's first mover |

## 3. What is missing (the honest gap the assignment answers)

The shipped world is **complete for the vertical slice** and **complete as
"one district"** — but the owner's master build assignment (2026-11-14) changes
the development priority: the open world itself is the deliverable now. The
gaps, honestly named:

1. **One district is not an open world.** Alder Heights is 200 m wide; the
   east edge is an invisible wall at x +100 with skyline fabric pretending
   to be a city behind it. DEC-12 (2026-11-13) ruled the growth direction:
   **one additional chapter-structured district**; the borough design
   package (`docs/production/BOROUGH-DESIGN-PACKAGE-DRAFT.md`) names it —
   **Catalpa Junction** — and prices it. The master assignment is the
   owner's fresh construction authorization that package's gate asked for.
2. **No second neighborhood identity.** No industrial grammar, no freight
   heritage, no loft conversions — the stock the design package assigns.
3. **No walking connection east.** Kestrel ends at a wall.
4. **The K line has no eastbound destination** (design package: the
   Catalpa-side platform stub, the ride a later priced wave).
5. **The nav graph stops at x ±100** — walkers cannot ever reach a second
   district until lanes and bounds grow.
6. **The pocket scan scans x ±100** — the standing gate must grow with the
   map or it silently stops gating.

## 4. Constraints carried into construction

- **The draw budget is the binding constraint.** 193 of < 200 draws are
  spent. The design package's finding stands: a second district at block
  density does not fit by addition. The build therefore:
  (a) grows the district lattice east and switches the column ring from
  "all columns" to a **fog-law distance window** (light columns within
  sight of the player; fog covers the boundary — the skyline fabric keeps
  the horizon), so the standing census stays bounded as the map grows;
  (b) bakes all Catalpa statics into district tiles (the VC law);
  (c) merges the new paving into **two** mapped meshes (one asphalt, one
  concrete) so ground does not cost a draw per slab;
  (d) re-reads the census every wave.
- **Alder Heights is untouchable.** No canon row is edited, renamed, or
  renumbered; the Day 1–4 story, the cast, the cart corner, the probe
  expectations ride unchanged. The only edits to existing rows are the
  registry's own `spanX`/bounds growth fields, documented in their notes.
- **The five engineering references are the toolkit** — see
  `reference-repository-analysis.md` for what each contributes.
- **Simulation does not expand this phase** (assignment §9): no new NPC
  intelligence, no economy wiring. Catalpa's businesses ship as places,
  not ledgers; the Phase-6 machinery opens their books in a later phase.

## 5. Verdict

The foundation is excellent and verified. The construction task is not a
repair — it is **growth**: one new district, connected, at the shipped
quality bar, inside the shipped budget, documented so the next agent can
continue. The master plan (`complete-world-master-plan.md`) is the target;
`BUILD_STATUS.md` is the truth of how far it got.

— Lead Open-World Engineer agent, 2026-11-14
