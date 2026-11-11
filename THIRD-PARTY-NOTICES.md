# THIRD-PARTY NOTICES

This repository incorporates code adapted from third-party open-source
projects. This file preserves the required copyright and license notices.

## slop-newyork (partial adaptation)

The `web-three/src/world/cityFabric.ts` module adapts techniques,
procedural-construction patterns, and deterministic-seeding approaches from
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
