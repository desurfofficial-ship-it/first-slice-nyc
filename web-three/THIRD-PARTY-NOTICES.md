# Third-party notices

This file lists the third-party sources whose code or designs were adapted
into this repository, with the licenses that permit the reuse. It exists so
the required copyright and license notices ship with the code they cover.

## mrdoob/slop-newyork (MIT)

Portions of this repository's world modules are adapted from
**[mrdoob/slop-newyork](https://github.com/mrdoob/slop-newyork)**
(building-detail systems, fire-escape template, street props, landmark
construction techniques), used under the MIT License. The adapted modules
carry a provenance header naming the source parts; the mapping is recorded
in `docs/slop-integration/01-SOURCE-REUSE-REPORT.md`.

The adapted material is redistributed under this project's licensing
together with the following notice, as the license requires:

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

**Scope of the reuse.** Code *techniques and construction recipes* only. No
binary data, no surveyed datasets, no textures, and no models were copied
from the source repository. The source project's NYC geodata pipeline
(NYC OTI Building Footprints `5zhs-2jue`, MTA subway entrances, NYC Parks
tree surveys — NYC Open Data / OpenStreetMap-derived) was deliberately NOT
ingested; see `docs/slop-integration/02-LICENSING-AND-ATTRIBUTION.md` for
the licensing analysis and the standing prohibition that governs that
decision (docs/production/AGENT-DEVELOPMENT-GOVERNANCE.md §2).

## Other dependencies

- `three` — MIT License (Copyright © 2010-2024 three.js authors).
- `yuka` — MIT License.
- `playwright`, `vite`, `vitest`, `typescript`, `@types/*` — dev-only, MIT /
  Apache-2.0 per their packages.

No other third-party assets ship in this repository. All art in
`web-three/src/world/` is procedural (flat-color Lambert geometry,
canvas-generated sign textures) or generated in-repo (`tools3d/`), per the
content contract (docs/architecture/world-contract/11).
