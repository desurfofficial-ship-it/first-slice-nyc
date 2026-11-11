# SI — licensing and attribution report

**Wave:** SI-1 (2026-11-11) · Companion to
[`01-SOURCE-REUSE-REPORT.md`](01-SOURCE-REUSE-REPORT.md).

## 1. The source project and its license

**mrdoob/slop-newyork** is MIT-licensed. The complete license text
(© 2026 Mr.doob) is reproduced in
[`THIRD-PARTY-NOTICES.md (repo root)`](../../THIRD-PARTY-NOTICES.md (repo root)),
which ships with the repository. The adapted modules carry provenance
headers naming the source and pointing at that file
(`web-three/src/world/nycKit.ts`, `web-three/src/world/skylineLandmarks.ts`),
and the SI pass in `World.ts` cites the same reports. The MIT license
requires the copyright + permission notice to accompany substantial
portions of the software — that requirement is met by the notices file plus
the module headers; nothing was removed or replaced.

The reuse is **adaptation, not verbatim redistribution**: every ported part
was rebuilt in FIRST SLICE's conventions (Lambert materials, shared unit
geometries, the MatBank palette law, bake-safe statics). The MIT license
permits both forms; both are documented.

## 2. Datasets checked — and deliberately NOT ingested

| Dataset in the source repo | Origin | License | Decision |
|---|---|---|---|
| `js/building-geodata.bin.gz` (37,353 Manhattan footprints, NYB1) | NYC Open Data — NYC OTI Building Footprints (`5zhs-2jue`), per `tools/build-buildings.py` | NYC Open Data terms (not MIT); derived-from-City data carries City attribution terms | **Not ingested.** Standing governance prohibition (AGENT-DEVELOPMENT-GOVERNANCE §2: no NYC-Open-Data/OSM geodata ingestion) and the DEC-4 single-truth law (the registry is the geometry authority) |
| `js/subway-geodata.js` (MTA subway entrance sites) | MTA Subway entrances dataset (`tools/data/mta_subway_entrances.json`) | MTA terms (not MIT) | **Not ingested** — same prohibition; the world's stations are registry rows |
| `js/tree-geodata.bin.gz` (70,680 street trees, NYT1) | NYC Parks Forestry GIS ("TreesCount") | NYC Open Data terms | **Not ingested** — the world's trees are procedural, seeded in-repo |
| `tools/data/osm_*.json`, `q_*.overpassql` (streets, blocks, coastline, landmarks, piers, Central Park) | OpenStreetMap via Overpass + NYC CSCL/Borough boundaries | **ODbL 1.0** for OSM-derived layers (attribution + share-alike obligations on derived databases); City data for CSCL/DCP | **Not ingested.** ODbL share-alike would attach to any derived database this repo ships; docs/57 already classifies the geodata as reference-only. No OSM-derived geometry ships here |
| `js/boroughs.js` data tables | NYC DCP borough boundaries (`tools/data/dcp_boroughs.json`) + OSM coastline | City terms / ODbL | **Not ingested** |

**Conclusion:** no third-party dataset of any kind entered this repository
in this wave. The only third-party content is source-code *technique*
(mitigated by the MIT notice above). The existing repo license and notices
are untouched.

## 3. First-party assets used by the SI wave

- `web-three/src/world/props.ts` `makeBrownstoneStoop`, `makeStorefront`,
  `makeRoofClutter`, `makeACUnit` — in-repo, first-party.
- `web-three/src/world/streetAssets.ts` `makeTrafficSignal`,
  `makePoleSign` — in-repo, first-party.
- `web-three/src/world/facadeKit.ts` `makeCornice`, `makeLintel`,
  `WEAR` row — in-repo, first-party.
- The sign atlas / sign factories (`signAtlas.ts`, `World.signMaterials`) —
  canvas-generated in-repo.
- Palette anchors — `src/core/palette.ts` (Doc 04). Every new tone the wave
  introduced is a documented darkening of a Doc-04 anchor; the table is in
  `nycKit.ts`'s header and pinned by test.

## 4. Attribution in-repo (the audit trail)

1. `THIRD-PARTY-NOTICES.md (repo root)` — the MIT text + scope statement.
2. `web-three/src/world/nycKit.ts` header — per-part source line mapping.
3. `web-three/src/world/skylineLandmarks.ts` header — landmark techniques.
4. `web-three/src/world/World.ts` — the SI pass comment block citing the
   reports and the notices file.
4b. The root `THIRD-PARTY-NOTICES.md` names BOTH slop-newyork-adapting
   modules (cityFabric.ts + nycKit.ts/skylineLandmarks.ts) after the union.
5. `docs/slop-integration/01-SOURCE-REUSE-REPORT.md` — the part-by-part
   provenance table (source file + line ranges).
6. `docs/production/PRODUCTION-STATUS-REGISTER.md` — the SI-1 register row.

## 5. Obligations going forward

- If a future wave ever ingests City/MTA/Parks datasets, the City/M etree
  attribution terms must be added here and to the notices file FIRST, and
  the governance prohibition must be lifted by its owner — the default
  remains: build it procedurally, seeded, in-repo.
- If OSM-derived data is ever wanted, ODbL obligations (attribution to
  OpenStreetMap contributors, share-alike on the derived database) apply to
  the derived database — document before shipping, not after.
- The MIT notice file must ride any redistribution of `web-three/`
  (it sits inside the shipped directory for exactly that reason).
