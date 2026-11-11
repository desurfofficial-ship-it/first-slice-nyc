# SOURCE-REUSE REPORT — the city-fabric pass

Assignment: study [mrdoob/slop-newyork](https://github.com/mrdoob/slop-newyork)
(checkout HEAD `536a907`), extract what is genuinely useful, and adapt it into
FIRST SLICE's own TypeScript + three.js (WebGLRenderer) + Vite architecture
without importing its application, its WebGPURenderer/TSL stack, or its
datasets. This report records what was taken, where it came from, and what was
deliberately NOT taken. Companion files: [LICENSES-AND-ATTRIBUTION.md](LICENSES-AND-ATTRIBUTION.md),
[ASSET-CHANGES.md](ASSET-CHANGES.md), [PERFORMANCE-AND-COMPATIBILITY.md](PERFORMANCE-AND-COMPATIBILITY.md).

## 1. What the study covered

All 47 modules under `slop-newyork/js/` were read, plus `tests/*.test.cjs`
(API contracts) and `tools/` (the data pipeline: `build-buildings.py`,
`build-geodata.mjs`, `geo-base.mjs`). The two highest-value findings for THIS
game:

- **`building-footprints.js` + `buildings.js`**: footprint → merged indexed
  chunk geometry with whole-window-bay facade math, per-building `mulberry32`
  seeding (`seed = cx*31 + cz*17`, ASCII-XOR secondary streams), fixed-capacity
  InstancedMesh pools with quadtree streaming, and reserve-based anti-overlap
  placement for rooftop/street details (`building-details.js`).
- **`scene-culling.js` / `city-grid.js`'s `batchStaticGroupMeshes`**: draw-call
  economy by chunking + distance culling + per-material merging — the same
  conclusions FIRST SLICE's district bake already implements.

## 2. What was adapted into FIRST SLICE (`web-three/src/world/cityFabric.ts`)

| Technique (source module) | Adaptation |
|---|---|
| `mulberry32` seeded PRNG + spatial-hash per-building seeds (`buildings.js:43-52`, `:346`) | The fabric's every variation is seeded (`mulberry32` re-used from our own `dressing.ts`, which already shipped the same PRNG); per-id FNV-1a hash (`hash01`) for eligibility rolls; **no `Math.random` anywhere** |
| Rooftop water tank: barrel + cone cap + splayed 4-leg trestle + deck ring + riser (`buildings.js:508-567`) | `pushWaterTank()` — rebuilt as one merged indexed vertex-colored geometry (Lambert pipeline, no TSL stave shader) |
| Cornice lip / parapet caps on every mass break (`tsl-materials.js` pre-war facade + `landmarks.js` box-stacking) | `pushSkyBuilding()` caps each mass tier with a projecting lip — the "a mass is a building, not a wall" read |
| Setback massing for tall buildings (`landmarks.js` tier stacking) | 1–2 upper setbacks on h > 26 m skyline masses |
| Detail placement guarded by neighbor reserves (`building-details.js` `blocked(...)`) | Roof items inset ≥ 2.1 m from roof edges; the fabric skips VQ-cluttered roofs' rear slots (front-face placement) and never touches gameplay roofs (`ROOF_SKIP`) |
| Style families by construction year + hashed tone (`buildings.js:349-351`: pre-war masonry / warm brick / teal glass / bronze glass / silver glass) | Skyline styles: masonry, limestone, commercial loft, industrial, glass — picked by per-building hash with per-row glass bias (downtown south = more glass) |
| Storefront/awning/sign instanced pools (`buildings.js:494-654`) | NOT ported — our near block's storefronts are authored (W1–W5); pooled instancing is unnecessary at our scale |
| Fire-escape instanced ironwork (`fire-escapes.js`) | NOT ported — alpha-tested TSL ironwork has no Lambert equivalent worth building at our distances; Cecil's ladders + `makeFireEscapeDeco` already carry the gameplay/story escapes |
| Geographic datasets (`building-geodata.bin.gz`, `nyc-geodata.js`, tree/subway data) | NOT taken — our world is authored and registry-governed (the no-invention law); no NYC Open Data / OSM geometry enters the repo, so no ODbL obligations attach |
| WebGPURenderer / TSL / clustered lighting / MRT / SSR | NOT taken — the game stays WebGLRenderer + MeshLambertMaterial; facades are vertex-colored geometry, windows are one InstancedMesh sharing the shipped dusk-lit skyline material |

## 3. The integration seam

`World.buildCityFabricPass()` (World.ts) wires the module to the game's own
seams: `regShell` (the no-invention law — every roof item sits on a registry
row), the shared `vcMaterial` bake materials, `skylineWinMat` (the fabric's
142 panes ride the shipped dusk tween with the towers'), and `makePoleSign`
(the shared sign atlas) for the cross-street blades. The pass runs pre-bake;
the skyline pair is `NAMED_SKIP` (always visible, never district-owned).

## 4. What was considered and deliberately skipped (with reasons)

- **Enclosed bus shelter** — glass/transparent panels cannot ride the
  vertex-color bake (transparent materials are bake-excluded); the shipped
  pole+bench stops already read correctly.
- **Street-name text on new poles** — delivered via the EXISTING
  `makePoleSign` atlas seam instead of new text plumbing (4 blades shipped).
- **Procedural window AC units / parallax interiors** — shader-only in the
  source (TSL); the VQ pass already ships real AC-unit geometry.
- **Traffic lights, food carts, subway entrances** — already shipped in FIRST
  SLICE (`makeTrafficSignal`, `makeVendorCart`, `makeSubwayEntrance`); the
  brief's "reuse what exists" law beats porting duplicates.
