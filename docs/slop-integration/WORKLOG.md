# SI — worklog: the slop-newyork integration

**Wave:** SI-1 · **Date:** 2026-11-11 · **Executor:** the Technical
Architecture / World Systems Agent, working directly on `main` under the
owner's implementation authorization.

## The assignment

Study [mrdoob/slop-newyork](https://github.com/mrdoob/slop-newyork) in its
actual source, extract and adapt its useful building systems, architectural
details, street assets, and landmark techniques into FIRST SLICE's existing
TypeScript + Three.js + Vite architecture — an implementation, not a study
document. Preserve the game's registry-driven world truth (DEC-4), its
Lambert/vertex-bake rendering, its nav/collision contracts, its palette law,
and its determinism. License the reuse honestly (MIT).

## Session log

1. **Cloned and studied both trees.** slop-newyork @ `536a907` (34 k lines
   of plain-JS three.js + WebGPU/TSL): buildings.js's streamed detail pools,
   building-footprints.js's polygon massing, building-details.js's
   placement rules, fire-escapes.js's template, street-details/props.js's
   asset builds, city-grid/config.js's grid model, landmarks.js's 11 custom
   builds, tsl-materials.js's facade shaders, the NYB1 geodata pipeline, and
   the building test suite. FIRST SLICE: World.ts's registry-flip masses,
   facadeKit/props conventions, bakeStatics + district tiles, collide.ts's
   AABB law, the sim/nav registry derivation, the vitest suite, the probe
   harness, and the governance docs (DEC-4, the §2 prohibitions, docs/57's
   own slop-newyork study findings).
2. **Set the integration contract** before writing code: registry rows are
   the only geometry truth; new statics must be pre-bake Lambert (they fuse
   free); decoration never collides; furniture colliders seat off the walk
   lanes like the shipped bulletin board; variation is seeded; palette law
   = Doc-04 anchors and their documented darkenings; no new dependencies;
   no geodata; no renderer migration.
3. **Ported the kit** (`nycKit.ts`, `skylineLandmarks.ts`) with per-part
   provenance headers, then wired the pass (`buildAlderHeightsSI` +
   `dressFarWorldSI`) into the World constructor pre-bake.
4. **Grew the registry** with the three Mallow-row buildings after mapping
   the blocks for genuinely free frontage (BLK-S Marlow row, x 22..50 — the
   only open stretch; SRC-01 owns 50..60).
5. **Let the gates teach:** the first full-suite run failed
   ped-commute's road law — my entrance[] rows had shifted the nav graph's
   spine-sample destination set, routing a roster walker over the SUB-02
   curb skirt where shipped jitter could sample the road band. Rather than
   touching the shipped nav law, the rows ship class C with entrance[]
   retired (doors are a W5-interiors concern); the shipped node set
   restored byte-for-byte. The test did exactly its job.
6. **Probes and evidence:** wrote `probe-nyc-integration.mjs` (30 checks,
   7 shots), re-ran the shipped VQ probe (all pins survive), world-sim
   (15/15), and the full gate battery; iterated the evidence shots until
   they actually show the work.
7. **Documented:** the reuse report (18 mapped parts with source line
   ranges), the licensing analysis (datasets analyzed and declined), the
   asset/performance/compatibility report, this worklog, the register row
   (v1.39.0), and the MIT notices file.

## Gate ledger (executed, sequential, same sandbox)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx vitest run` | **1395/1395** (86 files; +18 SI guards over the 1377 baseline) |
| `npm run build` | OK (611 ms) |
| `scripts/probe-nyc-integration.mjs` | **OK** — 30 checks, console clean, 7 shots |
| `scripts/probe-world-visual-quality.mjs` | **OK** — all shipped pins survive, calls 158 < 200 |
| `scripts/probe-world-sim.mjs` | **15/15** (1,426 sim-min) |
| 4-day E2E (`scripts/e2e.mjs`) | **0 failures**, console clean |

## Deliberate non-goals (documented, not forgotten)

- Food-cart kit — the shipped VND-01 vendor cart already owns the slot.
- Tree system — the shipped instanced canopy + surveyed placements stand.
- Mallow-row interiors/doors — the W5 pattern's next wave; the registry
  rows are ready for them.
- The far-world subway stair rides TSS_Group unbaked (4 draws in a
  zone-managed far group) — the zone bake's own law, not an oversight.

## File manifest

- `web-three/src/world/nycKit.ts` (new) — the ported detail kit.
- `web-three/src/world/skylineLandmarks.ts` (new) — the skyline silhouettes.
- `web-three/src/world/World.ts` — SI imports, the two pass methods, the
  constructor hooks.
- `docs/data/world-registry.json` — LMS-01 / IND-01 / GLS-01 rows.
- `web-three/tests/nyc-integration.test.ts` (new) — 18 guards.
- `web-three/scripts/probe-nyc-integration.mjs` (new) — the boot probe.
- `web-three/shots/nyc-integration/` (new) — evidence shots.
- `THIRD-PARTY-NOTICES.md (repo root)` (new) — the MIT notice.
- `docs/slop-integration/01/02/03` + this worklog (new).
- `docs/production/PRODUCTION-STATUS-REGISTER.md` — the v1.39.0 row.
