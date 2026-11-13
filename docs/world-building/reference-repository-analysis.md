# Reference Repository Analysis — the five references, and what each gave Catalpa Junction

> **Status:** M1 deliverable of the 2026-11-14 master build assignment.
> Consolidates the in-repo studies that already exist —
> `docs/world-map/09-engineering-reference-study.md` (the five-repo study),
> `docs/57-engineering-references.md` (the standing ledger),
> `docs/research/` (the Blueprint3D audits), `docs/slop-integration/`
> (the slop-newyork provenance) — records **this session's verification**
> of those studies against the actual sources, and names exactly **what was
> extracted, what was adapted, what was rejected, and where each
> integration lives** in the Catalpa Junction build (M3–M8).

**The law this serves** (AGENTS.md §1e + `docs/57-engineering-references.md`
§0): inspect the source, not the README; reuse the technique, not the
renderer; never adopt a reference's engine; record findings so the next
agent never re-studies the same ground.

---

## 1. The comparison table

| | gen-city-auto | slop-newyork | Metropolis | HongKongThreejs | Blueprint3D |
|---|---|---|---|---|---|
| Repo | greggman/gen-city-auto | mrdoob/slop-newyork | metaspace/Metropolis | imsarah/HongKongThreejs | furnishup/blueprint3d |
| License | MIT | MIT (© 2026) | MIT (© 2015) | MIT (© 2026 Prasenjit / StarKnightt; builds on Ocean Drive MIT) | MIT (© 2015) |
| Stack | TS, zero-lib WebGPU/WGSL, workers | three.js + WebGPU/TSL | three.js r- era procedural city | three.js r186 + Vite | three.js r- era, DOM 2D plan editor |
| Best at | runtime simulation: tile streaming, LOD hysteresis, peds/traffic sim | **real New York craft**: grid truth from open data, building massing, roofscape, street furniture | parametric block/lot generation, city-scale variety | **walkable street-level world**: shader windows, chunked LOD culling register, dense frontage | floor-plan data model, interiors, placement, serialization |
| Rejected | WebGPU/WGSL renderer; worker streaming machinery | TSL/WebGPU materials; geodata ingestion | its renderer era + generic identity | the HK scene, tong-lau identity, Mixamo people (license), its renderer | its editor UI, its renderer; its unlicensed demo assets |

## 2. What each contributed to this build (extracted / adapted / rejected / where)

### 2.1 gen-city-auto — the residency discipline

- **Extracted (concept):** residency hysteresis (`SHELL_PREFETCH`/`SHELL_KEEP`),
  nearest-first work ordering, and the law that *loading and culling are
  first-class systems, not afterthoughts*. Also the tile-as-unit-of-work shape.
- **Adapted into:** the **fog-law district ring** (`World.updateDistricts`,
  W-C1). The shipped ring lit all six columns always — true when the world
  was 200 m wide, unscalable past it. The adapted law: a column lights when
  its center is within `SIGHT_M` of the player, exactly the hysteresis idea
  (a tile is lit *before* you can see it — fog covers the switch), with the
  skyline fabric carrying the horizon so nothing pops. The census stays
  bounded as the map grows: the streamed-metropolis law, on an authored
  budget.
- **Rejected:** the WebGPU renderer (the compliance red line —
  `docs/architecture/03` §4), the worker pipeline (nothing in an authored
  world generates off-thread), the procedural street graph (our streets are
  registry truth, not generated).

### 2.2 slop-newyork — the New York craft (the dominant donor)

- **Already integrated (prior waves, verified this session):** the city
  fabric pass (`world/cityFabric.ts` — roof fabric, skyline fabric, street
  fabric), the neighborhood fabric (`world/neighborhoodFabric.ts` — fire
  escapes incl. the W12 instanced filigree, terrace faces, street props),
  and the NYC kit (`world/nycKit.ts` — HVAC, cornices, awnings, steam vents,
  subway stairs, mailboxes, scaffold sheds). Provenance:
  `docs/slop-integration/`.
- **Extracted this session:** the *industrial-loft massing grammar* — low
  rooflines, big factory-window grids, cornice-less parapets, rooftop
  bulkheads — as the massing vocabulary for Catalpa's loft conversions;
  the ghost-sign read (painted brick) as the district's identity layer.
- **Adapted into:** `world/larchYardsKit.ts` (W-C2) — loft masses, industrial
  shells, ghost signs, loading docks; and the **Catalpa silhouette row**
  added to the skyline fabric (W-C3): a low-industrial roofline reads over
  the district's fog line, the same far-world technique as the existing
  card rows.
- **Rejected:** geodata ingestion (the no-invention law — our world is
  authored), TSL materials, its traffic/ped sims (§9 of the assignment:
  simulation does not expand this phase).

### 2.3 Metropolis — the parametric row discipline

- **Extracted:** lot-band composition — a street face is a *rhythm* of
  bays (widths, heights, door positions) generated from a seeded grammar,
  never one mesh stamped twice; height falloff as identity (a district
  reads by its roofline).
- **Adapted into:** the Catalpa row builder (`buildLarchYards`,
  W-C2): every mass reads its registry footprint (`regShell` — the A-3
  law), then the kit varies bays, cornices, window grids, and dock doors
  from a per-row seeded PRNG (`mulberry32`, the house determinism law).
  Heights follow the district's identity curve: lofts 12–17 m, industrial
  shells 8–9 m, **wider sky** than Alder Heights' row houses.
- **Rejected:** whole-city procedural generation (contradicts the authored
  registry), its identity (a generic city — Catalpa is New York).

### 2.4 HongKongThreejs — the walkable-world laws

- **Extracted (the laws, per the study's own verdict):** shader-drawn
  window discipline (one instanced draw owns every window); the
  **LOD-registered chunked cull register** (every object registers to the
  chunk that owns its visibility); walkable-first framing (the street is
  composed at eye height first, aerials second).
- **Adapted into:** (a) the fog-law ring is HK3's chunk register in our
  grammar — tiles, not chunks, and the register is the existing
  `districtBatches` map; (b) the **elevated spur** (W-C3) composes
  street-first: the iron columns and deck are placed to read from the
  sidewalk (overhead rhythm, cast-iron grammar), the aerial read is
  secondary; (c) window discipline rides the shipped instanced panes law
  (the skyline fabric's InstancedMesh pattern) for Catalpa's lit panes.
- **Rejected:** the ported scene, the tong-lau/bay-window grammar (the
  study's own ruling: "the HK grammar is the wrong identity for FIRST
  SLICE"), the Mixamo people (Adobe terms — not redistributable under the
  house CC-BY-4.0 law), the r186 renderer (our pinned three version).

### 2.5 Blueprint3D — the interior plan discipline

- **Extracted:** the floor-plan-as-data model — a room is walls, openings,
  and placed items with explicit coordinates; serialization makes the plan
  the truth, not the render.
- **Already integrated (prior wave):** the registry interior rows carry
  `plan` item lists (`docs/research/` — the five Blueprint3D audit docs).
- **Adapted into:** the **Freight Market hall** (W-C4): CJN-01's ground
  floor carves by the shipped W5 pattern (the FRUIT-INT full-cavity
  precedent), and the fit-out rides the registry row's own `plan` list —
  market stalls, the counter band, the far pane — the Blueprint3D data
  discipline on the house carve law. The plan is written so the C6
  winter-lights beat can dress the same room without re-carving.
- **Rejected:** the editor UI, the wall-move runtime, the demo assets
  (unlicensed CDN content — never shipped).

## 3. Licensing and attribution

| Reference | License | Ship law |
|---|---|---|
| gen-city-auto | MIT | ideas only; no code copied; credit in this doc |
| slop-newyork | MIT © 2026 | technique ports carry provenance in `docs/slop-integration/` (existing) + this doc |
| Metropolis | MIT | ideas only; no code copied |
| HongKongThreejs | MIT; Poly Haven CC0 assets; Mixamo people NOT CC0 | laws only; no people, no scene, no textures shipped from it |
| Blueprint3D | MIT © 2015 | data-model ideas only; no demo assets |

No incompatible or unlicensed asset enters the tree. The house asset law
(palette + shared geometry + `MeshLambertMaterial` + district bake) governs
every piece this build adds. `THIRD-PARTY-NOTICES.md` already covers the
MIT technique ports; the new kit (`larchYardsKit.ts`) carries the same
header-style provenance notes.

## 4. The integration map (where each system lives after this build)

| System | File | Waves |
|---|---|---|
| Fog-law district ring | `web-three/src/world/World.ts` (`updateDistricts`, `SIGHT_M`) | W-C1 |
| Extended lattice + bounds | `World.ts` district constants; `docs/data/world-registry.json` `bounds` | W-C1 |
| Catalpa paving (2 merged draws) | `World.ts` `groundMerged()` helper | W-C1 |
| The Spur bed + rails + crossings | `world/larchYardsKit.ts` + `buildLarchYards` | W-C1 |
| Loft/industrial masses + ghost signs | `world/larchYardsKit.ts` | W-C2 |
| Registry rows (CJN-*, SUB-03, parks, landmarks, streets) | `docs/data/world-registry.json` | W-C0 |
| Roof fabric on CJN rows | `world/cityFabric.ts` (automatic — no change needed) | W-C2 |
| Fire-escape jobs | `world/neighborhoodFabric.ts` `ESCAPE_JOBS` (+3 rows) | W-C2 |
| Elevated spur + Junction Plaza + Spur Gardens | `catalpaKit.ts` + World parks pass | W-C3 |
| Catalpa skyline silhouette | `world/cityFabric.ts` skyline pass (+1 row) | W-C3 |
| Freight Market interior | `World.ts` carve + `world/interiorAssets.ts` + registry `plan` | W-C4 |
| Nav lanes + walked extent | `src/sim/nav/build.ts` `LANES`/`NAV_BOUNDS` + registry routes | W-C5 |
| Pocket-scan growth | `scripts/diag-pocket-scan.mjs` scan bounds | W-C5 |

— Lead Open-World Engineer agent, 2026-11-14
