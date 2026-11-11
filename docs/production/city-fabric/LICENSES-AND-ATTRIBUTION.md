# LICENSES AND ATTRIBUTION — the city-fabric pass

## 1. Source project: slop-newyork

- Repository: https://github.com/mrdoob/slop-newyork (checkout `536a907`, studied 2026-11-11)
- License: **MIT** — `Copyright (c) 2026 Mr.doob`. The full notice text is
  preserved verbatim in the repository root
  [`THIRD-PARTY-NOTICES.md`](../../../THIRD-PARTY-NOTICES.md), as the license
  requires for copied/adapted portions.
- The project's README invites reuse explicitly ("Fork it, remix it,
  improve it…").

## 2. What was adapted vs copied

The adaptation is **technique-level**: deterministic seeding, merged indexed
chunk geometry, reserve-guarded placement, rooftop massing patterns. No source
file from slop-newyork is copied into this repository, and no TSL/WebGPU
shader code is used (FIRST SLICE renders with `WebGLRenderer` +
`MeshLambertMaterial`). The MIT notice is preserved anyway, per the license's
"substantial portions" clause and the assignment's attribution requirement.

## 3. Datasets — deliberately NOT incorporated

slop-newyork's README documents its geographic data sources:

- NYC Open Data: building footprints & heights (`5zhs-2jue`), forestry tree
  points (`hn5i-inap`), MTA subway entrances (`i9wp-a4ja`), DCP borough
  boundaries, street centerline (CSCL), Parks properties.
- © OpenStreetMap contributors (ODbL): Central Park features, piers, landmark
  footprints, the New Jersey shore.

**None of this data is included in FIRST SLICE.** The city-fabric pass renders
FIRST SLICE's own authored, registry-governed world
(`docs/data/world-registry.json`); the skyline rows and rooftop fabric are
procedural code output, not geographic data. Consequently no NYC Open Data
terms and **no ODbL share-alike obligation** attaches to this repository from
the adaptation. This determination is recorded here so the next agent does not
re-litigate it.

## 4. This repository's own assets

- All geometry, palette colors, and placement in `cityFabric.ts` are original
  to FIRST SLICE except where §2 of [SOURCE-REUSE-REPORT.md](SOURCE-REUSE-REPORT.md)
  credits a technique.
- The skyline rows re-use the game's existing `PAL` palette plus the declared
  `FABRIC`/`WEAR` signature colors (the palette law); no external textures,
  models, or fonts were added. `package.json` dependencies are unchanged.
