# 10 — Reused Assets and Attribution (the asset-reuse ledger)

> **Status:** Asset-reuse deliverable (2026-11-13). Produced by Z.ai agent in
> response to the production-authorization directive's §2 "Authorization to
> Reuse Reference-Repository Assets." This document is the permanent ledger
> the directive's §2 mandates.
>
> **Method:** every binary asset directory in the five reference repos was
> enumerated with `find` and read against its license file + README. The
> shipped FIRST SLICE codebase was cross-checked for existing reuse
> (`web-three/src/world/nycKit.ts`, `world/facadeKit.ts`, `world/fenestraCore.ts`,
> `world/fenestraMaterial.ts`) and the existing attribution records
> (`docs/slop-integration/`, `THIRD-PARTY-NOTICES.md` at the repo root,
> `docs/57-engineering-references.md` §3 + §4).
>
> **The headline (the honest answer):** the reusable IP across the five
> reference repos is **code patterns and techniques**, not binary assets.
> Three of the five repos (gen-city-auto, slop-newyork, Metropolis) ship
> **zero binary assets** — everything is procedural or external. The fourth
> (HongKongThreejs) uses Poly Haven CC0 textures that are legally reusable
> but in the wrong rendering regime for FIRST SLICE's authored-lowpoly +
> fenestra-atlas pipeline. The fifth (Blueprint3D) ships demo assets that
> docs/57 §3.8 flagged as unlicensed in the modern rewrite and not portable
> in the original. The one shipped binary-asset reuse is the slop-newyork
> architectural detail kit, already ported into `nycKit.ts` with full
> attribution in `docs/slop-integration/`.

---

## 1. The binary-asset census across the five repos

| Repo | Binary assets in the repo | License | Verdict for FIRST SLICE |
|---|---|---|---|
| **gen-city-auto** | **0** (verified: `find` for png/glb/webp/hdr returns nothing) | MIT (code) | No binary assets to reuse. The reusable IP is the code patterns (docs/57 §3.1, 3.2, 3.5, 3.6, 3.7). |
| **slop-newyork** | **0** in the repo (the NYC Open Data / OSM geodata is loaded at runtime from external sources) | MIT (code); NYC Open Data terms / ODbL (the geodata — **reference-only, never ingest**) | No binary assets to reuse. The geodata is reference-only. The reusable IP is the architectural detail code (already ported, see §2 below). |
| **Metropolis** | **0** (README: "Every texture, mesh, heightfield and sound in this project is generated procedurally in code. There are no binary art assets in the repository and nothing is downloaded at runtime.") | ISC (code; ISC ≈ MIT) | No binary assets to reuse. The reusable IP is the procedural building generation vocabulary (doc 09 §3.3). |
| **HongKongThreejs** | Poly Haven CC0 textures (asphalt, brick, concrete, plaster, tiles, wood floor, terrazzo — 8 sets, albedo + normal + ARM, 1024 px + 512 px) + Poly Haven CC0 HDRI (Modern Evening Street, 4K/2K/1K) + Mixamo people GLBs (Adobe terms, **NOT CC0**) + Blender-built car GLBs (own) + the Ocean Drive engine (MIT) | MIT (code); CC0 (Poly Haven textures + HDRI); Adobe Mixamo terms (people — **not redistributable under CC0**); own (Blender cars) | Poly Haven textures are CC0 (legally reusable) but in the **wrong rendering regime** — PBR texture scans vs FIRST SLICE's authored-lowpoly + fenestra-atlas pipeline. Reuse would be a regime change, not an asset swap. Mixamo people are not redistributable under the project's CC-BY-4.0 furniture pack law. |
| **Blueprint3D** | 54 binary thumbnails in `example/models/thumbnails/` (the demo furniture catalog) | MIT (code, © 2015 original; MIT 2026 modern rewrite); **modern CDN demo assets unlicensed** (docs/57 §3.8) | Demo assets are not portable (unlicensed in the modern rewrite; the original's demo assets are MIT-equivalent but the audit found them not portable — docs/57 §3.8 + `docs/research/blueprint3d-original-audit.md`). The reusable IP is the floorplan data shape (docs/57 §3.8 + doc 09 §3.5). |

**The census is the answer:** there are no binary 3D models, textures, or
materials in the five repos that should be copied into FIRST SLICE's
`assets/` or `web-three/public/` directories. The reusable IP is the code
patterns, the techniques, and the architectural vocabulary — and those are
already documented in docs/57 and doc 09, and (for the slop-newyork detail
kit) already shipped with attribution.

## 2. The one shipped binary-asset reuse: slop-newyork → nycKit.ts

This is the only case where a reference repo's code was ported into FIRST SLICE
as shipped code. The attribution is already on record; this section is the
consolidated ledger entry.

| | |
|---|---|
| **Asset / code component** | The NYC architectural detail kit: HVAC rooftop units, cornice bands, storefront awnings, fire-escape stacks, steam vents, subway stairs + globe posts, mailboxes, scaffold sheds (the `NYC` object + the `makeHVACUnitNYC` / `makeCorniceBand` / `makeAwningNYC` / `makeFireEscapeStack` / `makeSteamVentNYC` / `makeSubwayStairNYC` / `makeSubwayGlobePost` / `makeMailboxNYC` / `makeScaffoldShedNYC` makers) |
| **Original repository** | https://github.com/mrdoob/slop-newyork/ |
| **Original file path** | `js/buildings.js`, `js/landmarks.js`, `js/props.js` (the architectural detail builders) — read at the source level; the SI (2026-11-11) pass ported the geometry into FIRST SLICE's `facadeKit` convention |
| **License** | MIT (LICENSE, 2026, © mrdoob) |
| **Attribution requirements** | MIT requires preservation of the copyright notice + permission notice. FIRST SLICE's `THIRD-PARTY-NOTICES.md` (repo root) carries the merged tree's notice file. |
| **Modifications made** | Rebuilt in the `facadeKit` convention (FIRST SLICE's `Buf` triangle-soup builder, vertex-coloured, merged per district tile). The World SI pass is the only consumer; the city-fabric pass (main's own slop-newyork roofscape cousin) owns tanks / chimneys / bulkheads — this kit keeps the chillers, escapes and street pieces. |
| **Where it is used in FIRST SLICE** | `web-three/src/world/nycKit.ts` (470 lines) — imported by `World.ts`; the architectural details appear on every shipped facade in Alder Heights. |
| **Provenance doc** | `docs/slop-integration/01-SOURCE-REUSE-REPORT.md` (the part-by-part mapping), `docs/slop-integration/02-LICENSING-AND-ATTRIBUTION.md` (the license ledger), `docs/slop-integration/03-ASSET-AND-PERFORMANCE-REPORT.md` (the asset + perf report) |
| **Verified** | `npx tsc --noEmit` clean; `npx vitest run` passes; the SI pass shipped with the W8 wave (2026-11-11) and the W12 filigree wave (2026-11-13) extended the fire-escape ironwork grammar from the same source lineage. |

## 3. The technique reuses (code patterns, not binary assets)

These are the cases where a reference repo's **technique** was adapted into
FIRST SLICE's own code, without any binary asset or verbatim code port. The
attribution is "stolen-with-credit is our house style; stolen-silently is not"
(AGENTS.md §5.6).

| Technique | Source repo | Source file | FIRST SLICE implementation | Attribution |
|---|---|---|---|---|
| **Interior-mapping windows** (ray-march a virtual room box behind each window plane, paint one atlas cell per window) | codedgar/three-fenestra (the bonus reference, docs/57 §3.8) | `src/InteriorMappingMaterial.ts`, the GLSL core | `web-three/src/world/fenestraCore.ts` (378 lines) + `fenestraMaterial.ts` (541 lines) | `docs/57-engineering-references.md` §3.8 (three-fenestra); `docs/production/fenestra/01-FENESTRA-INTEGRATION.md`; the technique's origin credited to Joost van Dongen, *Interior Mapping* (2008) |
| **Per-window hashed onset thresholds** (lit windows never synchronized, deterministic) | three-fenestra's hash seeds (constants: lit 3.71, tone 9.27, bright 5.43, atlas 0.0, front 7.13) | `src/InteriorMappingMaterial.ts` | `fenestraCore.ts` `ambientWindowPlan` + the in-game-clock occupancy law (new seeds 6.42 onset / 11.31 grime documented beside the contract) | docs/57 §3.8 (three-fenestra); the seed contract preserved verbatim so the impostor and the near material agree |
| **Tile streaming with residency hysteresis** (prefetch 100 m, keep 150 m, nearest-first ordering) | gen-city-auto | `src/world/city.ts` (745 lines), `src/world/nearest.ts` (56 lines) | The district ring in `World.ts` (the authored-world cousin — everything built at boot, tagged `c<col>r<row>`, lit by a RING around the player's district) | docs/57 §3.1; the patterns adopted, not the machinery (FIRST SLICE does not stream) |
| **Planar-graph toolkit** (plain object nodes/edges, adjacency-by-index, `dead` flags + `compact()`, stable-index-under-mutation) | gen-city-auto | `src/city/graph.ts` (581 lines) | `web-three/src/sim/nav/graph.ts` (the nav graph keeps the shape — id-keyed nodes, adjacency lists, validation — but adds per-edge cost/kind/surface and stable string ids) | docs/57 §3.7; the graph, A*, access and follower are FIRST SLICE's own (gen-city-auto has no pathfinding) |
| **Query-layer pattern** (spatial indices built ONCE in the constructor, flat uniform grid of `Map<number, number[]>` buckets, expanding-ring nearest queries) | gen-city-auto | `src/game/roadnet.ts` | `web-three/src/sim/nav/spatial.ts` (the key packing resized for FIRST SLICE's ±84 m neighborhood — theirs assumes 6 km²) | docs/57 §3.7 |
| **Arc-length follower + rate-limited heading** | gen-city-auto | `src/game/traffic.ts` (lines 232–540) | `web-three/src/sim/nav/follower.ts` (a polyline + rate-limited-heading follower — an authored, finite neighborhood does not need per-crossing Bézier sampling) | docs/57 §3.7 |
| **Deterministic per-agent generation** (seeded-junction discipline, `seededRng(seed + i·7919)`) | gen-city-auto | `src/game/traffic.ts` `pickExit` | `web-three/src/world/peds.ts` + `sim/nav/follower.ts` (each walker's destination stream is its own `seededRng(seed + i·7919)` — stable per-agent seeds, no global randomness, re-derived identically per boot) | docs/57 §3.7.1 (WP-3v addendum); pattern attribution per the file's header |
| **Shadow-proxy stand-ins for big static casters** (position-only meshes on a shadow-only layer) | slop-newyork | `js/scene-culling.js` (362 lines) | `web-three/src/world/shadowLaw.ts` (the figure shadow-proxy — one shadow draw per person instead of six) + the district-tile static bake | docs/57 §3.6; the regime differs (FIRST SLICE's 170 m authored block vs slop-newyork's 7 km island) |
| **Shader-drawn windows** (a window is a shader effect on a plane, not a mesh; a 100 m tower costs a box) | HongKongThreejs | `src/world/hk-buildings.js` (lines 7–9: "The windows are drawn in the facade shader (within each face, per style)") | `fenestraCore.ts` + `fenestraMaterial.ts` (MeshLambertMaterial + `onBeforeCompile` + the interior-mapping march — the law is the same, the implementations differ because the rendering regimes differ) | doc 09 §3.4; the law confirmed, no code port |
| **LOD register pattern** (small parts register with a distance threshold; the chunk owns the draw call) | HongKongThreejs | `src/world/lod.js` (`registerLod`) | `web-three/src/world/shadowLaw.ts` + the district ring (FIRST SLICE's 170 m block does not need per-prop LOD — everything is in the bake — but the single-register discipline is the same) | doc 09 §3.4 |
| **One merged street mesh** (cambered asphalt + worn paint + curbs + gutters + sidewalks + furniture, vertex-coloured, merged) | HongKongThreejs | `src/world/street.js` (1,332 lines) | `web-three/src/world/groundTex.ts` + the `World.ts` ground builders (the cousin; the `segments(a, b, excl)` helper's math is the sidewalk-carries-through-cross-street-opening law) | doc 09 §3.4 |
| **Floorplan data shape** (corner/wall graph with self-healing merges, rooms derived from topology via half-edge rings, six-way item placement taxonomy, openings as holes cut in wall shapes) | Blueprint3D (original + modern) | `model/corner.ts` `mergeWithIntersected`, `Floorplan.findRooms` + `Room.updateWalls`, `items/factory.ts`, `three/edge.ts` | `web-three/src/world/interiors/plan.ts` (the plan layer — pure data + build-time derivation + placement math) + the hand builders in `World.ts` (`wallRun`/`roomBox`) | docs/57 §3.8 + `docs/research/blueprint3d-{original,modern}-audit.md` + `docs/research/blueprint3d-integration-blueprint.md`; the five-phase integration plan is the next step if the interiors ever grow a floorplan-data layer |
| **Typology → seeded spec → geometry** (house / rowhouse / midrise / tower / warehouse / civic / retail → parameter set → triangle-soup) | Metropolis | `citysim/src/buildings/Generate.js` (1,108 lines), `Builder.js` (281 lines), `Facade.js` (872 lines), `Roofs.js` (388 lines) | **Not yet ported** — the typology vocabulary is the design law for the SKY-W / SKY-E skyline fabric rows if they ever grow a seeded rowhouse/midrise/tower mix behind the named buildings. The named buildings (Rosa's, the Cecil, the Works Hall) stay authored. | doc 09 §3.3; the vocabulary is for backdrop fill, not for named buildings |
| **Per-storey lit-window occupancy** (one phase per storey + vacancy rate, whole floors go dark together) | Metropolis | `Generate.js` `litPlan` (lines 68–77) | `fenestraCore.ts` `ambientWindowPlan` (the cousin — FIRST SLICE does it per-window, Metropolis does it per-storey; both deterministic, both avoid the synchronized-block look) | doc 09 §3.3; the comparison keeps FIRST SLICE's own law honest |

## 4. The asset-reuse candidates that were evaluated and rejected

These are the assets the directive's §2 "investigate and reuse" mandate could
be read to cover. Each was evaluated against the four-rule gate (license,
regime, mobile budget, canon) and rejected. Recording the rejection is the
honest ledger entry — the next agent does not re-evaluate the same ground.

| Asset | Source repo | License | Rejection reason |
|---|---|---|---|
| **Poly Haven CC0 texture scans** (asphalt_02, herringbone_brick_03, concrete_pavement, painted_plaster_wall, long_white_tiles, concrete_wall_006, wood_floor, terrazzo_tiles) | HongKongThreejs (`public/textures/city/`) | CC0 (legally reusable) | **Regime mismatch.** FIRST SLICE's facades are authored lowpoly + the fenestra atlases (`fenestra_fronts.png`, `fenestra_rooms.png`); the ground is `groundTex.ts`'s procedural material. PBR texture scans are a different rendering regime (MeshStandard + ARM maps vs MeshLambert + bake). Adopting them would be a regime change, not an asset swap — and the 1-Second Law sells the far row's lit windows, not its texture detail. **Re-evaluate only if the project decides to move to a PBR-scan regime** (a canon decision, not an asset decision). |
| **Poly Haven CC0 HDRI** (Modern Evening Street, 4K/2K/1K) | HongKongThreejs (`public/environments/`) | CC0 (legally reusable) | **Regime mismatch.** FIRST SLICE's sky + env lighting is `render/envsky.ts` + `render/daycycle.ts` (the procedural cousin). The HDRI is a different lighting regime. Re-evaluate only if the project moves to an HDRI-driven lighting pipeline. |
| **Mixamo people GLBs** (the `lewis.glb`, `megan.glb`, `sophie.glb`, etc. + the `_512` LOD variants + `clips.glb` animation set) | HongKongThreejs (`public/models/people/`) | **Adobe Mixamo terms — NOT CC0, NOT CC-BY-4.0** | **License blocker.** Adobe Mixamo's terms are not compatible with the project's CC-BY-4.0 furniture pack law (`assets/furniture/LICENSE-CC-BY-4.0.txt`). FIRST SLICE's people are articulated procedural rigs (`world/personRig.ts`, 612 lines) — a different pipeline with no license load. **Do not ingest.** |
| **Blender-built car GLBs** (the convertible, the parked row) | HongKongThreejs (`public/models/`, `blender/cars.blend`) | Own (the HongKongThreejs author's Blender source) | **Regime + identity mismatch.** FIRST SLICE's cars are `tools3d/rebuild_cars.py` + `public/models-experimental/cars-v2/` (the sedan + the taxi, meshopt + KTX2). HK3's cars are right-hand-drive Hong Kong-spec; ours are NYC-spec. Different asset class. |
| **Blueprint3D demo furniture GLBs** (the 54 thumbnails in `example/models/thumbnails/`) | Blueprint3D (original + modern) | **Modern CDN demo assets unlicensed** (docs/57 §3.8); original demo assets MIT-equivalent but not portable | **License + portability blocker.** The demo assets are not portable (the audit found them not portable in both repos — docs/57 §3.8 + `docs/research/blueprint3d-{original,modern}-audit.md`). FIRST SLICE's furniture is the ABO pack (141 CC-BY-4.0 GLBs, `assets/furniture/`) + the 32 sand3d procedural programs (`tools3d/sandflow_eval/programs/`). **Do not ingest.** |
| **Metropolis procedural texture synthesis** (`Textures.js`, 689 lines of canvas/data-driven procedural textures) | Metropolis | ISC (code) | **Regime mismatch.** FIRST SLICE's textures are authored lowpoly + the fenestra atlases; Metropolis's textures are a different synthesis pipeline. Adopting them would be a regime change. |
| **Metropolis building generator** (`Generate.js`, 1,108 lines) | Metropolis | ISC (code) | **Scope blocker.** The named buildings (Rosa's, the Cecil, the Works Hall) are authored and story-bearing. The generator is for backdrop fill only — and FIRST SLICE's backdrop is the shipped `cityFabric.ts` skyline fabric rows. **Re-evaluate only if the SKY-W / SKY-E card rows ever grow a seeded typology mix** (doc 09 §3.3). |
| **gen-city-auto WebGPU/WGSL renderer + workers** | gen-city-auto | MIT (code) | **Non-goal.** docs/architecture/03 §4 rules out the engine swap. FIRST SLICE's renderer is MeshLambert + bake + fenestra; the WebGPU/WGSL pipeline stays out. |
| **slop-newyork WebGPU/TSL renderer** | slop-newyork | MIT (code) | **Non-goal.** Same as above. |
| **slop-newyork NYC Open Data / OSM geodata** (the `building-geodata.bin.gz`, the coastline, the borough polygons) | slop-newyork (loaded at runtime) | NYC Open Data terms / ODbL | **License blocker — reference-only, never ingest.** docs/45 §5's verdict stands: ODbL share-alike on derivative databases is exactly the weight this project does not want. Drawing inspiration from the real grammar (which the GDD already did) is not database use. |

## 5. The attribution files already on record

The project's attribution infrastructure is already in place. The next agent
extending the asset reuse should add to these, not create new ones:

| File | What it carries |
|---|---|
| `THIRD-PARTY-NOTICES.md` (repo root) | The merged tree's notice file — the MIT notices for slop-newyork, gen-city-auto (if any code is ever lifted verbatim), and the other reference-code attributions. |
| `docs/slop-integration/01-SOURCE-REUSE-REPORT.md` | The part-by-part mapping for the slop-newyork → nycKit.ts port. |
| `docs/slop-integration/02-LICENSING-AND-ATTRIBUTION.md` | The license ledger for the slop-newyork port. |
| `docs/slop-integration/03-ASSET-AND-PERFORMANCE-REPORT.md` | The asset + performance report for the slop-newyork port. |
| `assets/furniture/LICENSE-CC-BY-4.0.txt` | The CC-BY-4.0 license for the ABO furniture pack (141 GLBs). |
| `assets/furniture/ATTRIBUTION.md` | The per-model credit for the ABO furniture pack. |
| `docs/57-engineering-references.md` §3 + §4 | The study-before-build ledger: the findings + the license verdicts for every reference repo studied. |
| `docs/production/fenestra/01-FENESTRA-INTEGRATION.md` | The three-fenestra integration doc (the interior-mapping windows technique attribution). |
| `docs/research/blueprint3d-*-audit.md` (5 docs) | The Blueprint3D audit wave: original audit, modern audit, applications, integration blueprint, performance + risk. |

## 6. The rule for any future asset reuse

The directive's §2 "Asset reuse rules" gate (7 steps) is already the project's
standing law (AGENTS.md §1e + docs/57 §0 + §4). For any future asset reuse:

1. **Inspect the repository licence.** (The license column in §1 above is the
   starting point.)
2. **Inspect asset-specific licences and attribution requirements.** (The
   Poly Haven CC0 textures are CC0; the Mixamo people are Adobe terms; the
   Blueprint3D demo assets are unlicensed in the modern rewrite.)
3. **Identify third-party dependencies and restrictions.** (e.g. the HongKongThreejs
   cars depend on the Blender source; the Blueprint3D modern demo depends on
   CDN assets that are not in the repo.)
4. **Verify compatibility with our project.** (The regime check — PBR vs
   Lambert+bake; the mobile-budget check — payload size, draw calls; the canon
   check — NYC identity, cozy-lowpoly grain, the §0 pillars.)
5. **Preserve required attribution.** (Add to `THIRD-PARTY-NOTICES.md` + the
   relevant `docs/<source>-integration/` directory; carry the license file
   into `assets/<source>/LICENSE-*`.)
6. **Record the original repository and asset location.** (The §2 ledger entry
   above is the template.)
7. **Document modifications.** (The `Modifications made` field in the §2 ledger
   entry.)

**The standing rule (AGENTS.md §1e + docs/57 §0):** "Never copy blind.
Compatibility, dependencies, licensing, mobile budget (§1c.6) are checked
before any code or data is adopted. Stolen-with-credit is house style;
stolen-silently is not."

## 7. The verdict

The directive's §2 authorization to "investigate and reuse suitable existing
assets from the five approved engineering reference repositories" has been
evaluated against the actual asset landscape. The honest answer:

- **No new binary assets should be ingested from the five repos.** Three repos
  have no binary assets; the fourth's (HongKongThreejs) are CC0 but in the
  wrong regime; the fifth's (Blueprint3D) are unlicensed or not portable.
- **The one shipped binary-asset reuse** (slop-newyork → `nycKit.ts`) is
  already attributed and verified.
- **The technique reuses** (15 patterns, §3 above) are already documented in
  docs/57 and doc 09, and shipped in the code with attribution.
- **The rejected candidates** (10, §4 above) are recorded so the next agent
  does not re-evaluate them.

The reusable IP across the five reference repos is the **code patterns and
techniques**, not the binary assets. The patterns are already shipped; the
techniques are already attributed; the rejected candidates are already
recorded. This document is the consolidated ledger the directive's §2 mandates.

— Z.ai agent, 2026-11-13
