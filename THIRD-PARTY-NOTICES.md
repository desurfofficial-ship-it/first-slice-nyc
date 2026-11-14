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

## Modern Interior — Low-Poly 3D Pack (embedded assets)

The gifted-packs furniture wave (2026-11-14) wears five models from the
**Modern Interior — Low-Poly 3D Pack · FREE SAMPLE v1.0** by **LM Scenova
Studios** inside the game's interiors (`web-three/public/models/furniture/
mi_*.glb`, slots `mi_armchair`, `mi_coffee_table`, `mi_floor_lamp`,
`mi_plant_pot`, `mi_chair` in `web-three/src/world/furniture.ts`).

The pack's license permits shipping the assets embedded in a finished
project but **does not permit redistribution of the assets themselves**.
Accordingly this repository carries only the five GLB files the game loads
(plus their reference copies under `assets/packs/modern-interior/`, which are
the same embedded game files pinned by the byte-identity test) and the
pack's own LICENSE.txt. The pack's FBX/OBJ exports, previews and source
files are **not** included. Credit per the license's optional term:
"Modern Interior Low-Poly Pack by LM Scenova Studios".

The companion warm-pastel Scandinavian furniture set
(`assets/packs/lowpoly-furniture/`, `sc_*` slots) is first-party,
owner-supplied content generated with headless Blender — no third-party
license applies.

## Polyfork — NYC City Kit (selected parts)

The Polyfork streets wave (docs/production/polyfork/, register v1.80.0)
wears ten parts of Polyfork's NYC City Kit
(https://polyfork.dev/kit/nyc-city-kit-fbca88) as build-time vertex data
extracted from the kit's GLBs by tools3d/polyfork/extract_polyfork.py.
The free kit's mesh files are **CC BY 4.0**; the reference GLBs and their
API metadata travel in `assets/packs/polyfork/` and the per-part credit
fields travel in the generated data module
(`web-three/src/world/polyforkData.ts`). The `.mjs` modules and any HD
editions are **not** used and **not** redistributed.

Placed parts and their credits (all "… by Polyfork (https://polyfork.dev/)",
CC BY 4.0):

- Bike Rack · Delivery Truck · Fire Alarm Call Box · Food Truck ·
  Garbage Truck · Hot Dog Cart · Newsstand · Parking Meter ·
  Payphone Stand · Sidewalk Cellar Hatch

The extraction is a modification (per-tri flat-color vertex data,
re-centered, quantized) permitted by CC BY 4.0; this notice and the
per-asset `credit` fields are the required attribution.
