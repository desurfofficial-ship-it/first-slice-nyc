# THIRD-PARTY NOTICES

This repository incorporates code adapted from third-party open-source
projects. This file preserves the required copyright and license notices.

## slop-newyork (partial adaptation)

The `web-three/src/world/cityFabric.ts` module (the city-fabric pass,
docs/production/city-fabric/), the `web-three/src/world/neighborhoodFabric.ts`
module (the terrace build-out, docs/production/terrace-buildout/), and the
`web-three/src/world/nycKit.ts` + `web-three/src/world/skylineLandmarks.ts`
modules (the SI borough-character pass, docs/slop-integration/) adapt
techniques, procedural-construction patterns, and deterministic-seeding
approaches from
[slop-newyork](https://github.com/mrdoob/slop-newyork) by mrdoob.

slop-newyork is licensed under the MIT License:

```
MIT License

Copyright (c) 2026 Mr.doob

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Scope of the adaptation: **techniques only** (merged indexed chunk geometry,
`mulberry32` + spatial-hash deterministic seeding, reserve/inset placement,
rooftop water-tank / bulkhead / cornice massing, per-band skyline rows). No
source file is copied verbatim; no TSL/WebGPU shader code is used; no
geographic datasets from that project (NYC Open Data building footprints, tree
points, MTA subway entrances, OpenStreetMap-derived geometry) are included in
this repository. The full provenance analysis lives in
[docs/production/city-fabric/LICENSES-AND-ATTRIBUTION.md](docs/production/city-fabric/LICENSES-AND-ATTRIBUTION.md)
and [docs/production/city-fabric/SOURCE-REUSE-REPORT.md](docs/production/city-fabric/SOURCE-REUSE-REPORT.md).

slop-newyork's own README additionally documents its geographic data sources
(NYC Open Data; © OpenStreetMap contributors, ODbL). Because FIRST SLICE
incorporates **none** of that data, no ODbL share-alike obligation attaches to
this repository from the adaptation.

## three-fenestra (partial adaptation)

The `web-three/src/world/fenestraMaterial.ts` module (the interior-mapping
window material) and `web-three/src/world/fenestraCore.ts` (the pure
placement/occupancy laws) adapt the interior-mapping technique from
[three-fenestra](https://github.com/codedgar/three-fenestra) v0.3.0 by
Edgar Pérez (codedgar), which itself credits Joost van Dongen's 2008
interior-mapping paper.

three-fenestra is licensed under the MIT License:

```
MIT License

Copyright (c) 2026 Edgar Perez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Scope of the adaptation: the GLSL hash / atlas-cell / room-box ray-march
core (`glslFenCore`, adapted from that repo's `glslCore` with its documented
hash-seed contract — lit 3.71, tone 9.27, brightness 5.43, atlas 0.0, front
7.13 — preserved verbatim), the instanced-attribute schema
(`instanceWindowId` / `instanceLod`; the reference's `instanceFade` is
repurposed as a glass-cue weight), and the front-albedo+alpha compositing
model. Adapted for this game's architecture: MeshLambertMaterial (not
MeshStandardMaterial), a family RANGE on the cell pick, the in-game-clock
occupancy law (`fenestraCore.windowLightOf`, onset seed 6.42 and grime seed
11.31 are this system's additions), and per-instance plane scaling on one
shared unit geometry. **No asset from that repository ships here**: the
room/curtain atlases in `web-three/public/textures/fenestra_*.png` are
generated originals (`tools3d/fenestra_atlas.py`) painted in the Doc 04
palette. The full analysis lives in
[docs/production/fenestra/01-FENESTRA-INTEGRATION.md](docs/production/fenestra/01-FENESTRA-INTEGRATION.md)
and the study ledger [docs/57-engineering-references.md](docs/57-engineering-references.md)
(§3.8).
