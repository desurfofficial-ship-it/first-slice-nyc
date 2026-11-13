# SOURCE REUSE REPORT — the terrace build-out (W6)

Wave: **the W6 terrace build-out** (register v1.44.0) · Source: [mrdoob/slop-newyork](https://github.com/mrdoob/slop-newyork) (MIT, © 2026 Mr.doob) · Continues: `docs/production/city-fabric/SOURCE-REUSE-REPORT.md` (v1.40.0)

## 1. What this wave took from the source

The second adaptation pass, executing what the city-fabric report deliberately
left for later ("the two reds") plus the expansion the owner authorized
("expand the game map is not a problem here", 2026-11-11 — DEC-8 satisfied in
the register). What was ported is still TECHNIQUE, not renderer:

| Source module (js/) | What was taken | Where it landed |
|---|---|---|
| `fire-escapes.js` | the escape's canonical dims: deck ≈ 3.2 × 1.0 m, rail head 1.0 m, flight run ≈ 2.3 m per story, drop ladder raised to ~1.4 m with rungs ~0.38 m, the gooseneck over the parapet; one-to-two bays per facade, landings at every floor line | `web-three/src/world/neighborhoodFabric.ts` §1 (`pushEscape`/`escapeFabric`) — rebuilt as Lambert vertex-color ironwork (the alpha-tested TSL filigree became real thin-box rails, the makeFireEscapeDeco "visible brace" law kept) |
| `buildings.js` | storefront fascia/awning language (the five-color awning row), ground-floor band proportions, the brownstone/tenement style families' massing logic | terrace masses' storefronts (`World.ts` W6 builder, via the shipped `makeStorefront`) + the VDN terrace faces' shopfront bands |
| `building-footprints.js` | the "party walls stop windows where the neighbor's roof begins" read (segment-relative window grids on shared masses) | `Nbhd_TerraceFace_*` window grids derive per segment from `buildBackdrops`' own segment heights |
| `street-details.js` / `street-props.js` | USPS collection box (0.65 × 1.25 × 0.65 m, the blue), fire hydrant (tapered 8-seg, the red), ConEd steam stack (5 × 0.56 m bands, r 0.36 → 0.235, alternating orange/white + the sawhorse ring), tree pit soil tone | `neighborhoodFabric.ts` §3 — all merged indexed vc, all off the walking lanes |
| `trees.js` / `tree-placements.js` | the pit-soil read and the street-tree line placement discipline (snap to the walk edge, honest spacing) | the gardens' tree rows ride the shipped `buildSimpleTree` grammar (the house canopy instancing — 4 draw calls total, unchanged); pit soil tone joined the NEIGH palette |
| `city-config.js` | nothing new — the strip geometry stays registry-governed (the no-invention law) | — |

## 2. What was deliberately NOT taken (and why)

- **TSL/WebGPU materials, facade-shader decal systems, canvas-texture sign
  themes** — this game is MeshLambert + vertex-color bakes; the numbers were
  extracted, the shaders were not.
- **Their geodata and streaming** (building-geodata.bin.gz, tree-geodata,
  NYC Open Data) — the registry remains the single source of truth; no ODbL
  enters the repo.
- **Their traffic/pedestrian/camera systems** — the game's own nav graph,
  chokepoint law, and body systems are load-bearing and pinned.
- **Steam sprites, leaf-card wind, translucency** — transparent/shader work
  the bake law excludes.

## 3. The no-invention law, honored

Every new mass reads its row through `regShell` (`GRB-06`, `GRB-07`,
`TEN-02`, `KTS-04` — all `built (W6)`, pinned verbatim in
`scripts/design/validate-registry.mjs` §7-W6 and
`tests/a3-registry-flip.test.ts` HAND_TRUTH_W6). The pinned backdrop rows
(`VDN-DN1`/`VDN-DS1`) were NOT moved, resized, or re-classed — the fabric
dresses their exposed faces and the gardens sit behind them. The strips'
x ±68..76 stays avenue corridor (the registry's own roadway bands).

## 4. What the source did better (honest ledger for the next wave)

- CLOSED by W12 (2026-11-13): the escapes now carry the alpha-cutout picket
  filigree — the compliant CanvasTexture port of the source's TSL cut-out
  ironwork (the W8 shed-valance grammar): one instanced alpha-tested panel
  per landing (170 panels, one draw call), 19 pickets + scroll rings at the
  fine rhythm, 5 cm behind the rail frame, zero colliders. Evidence:
  `web-three/shots/w12-filigree/`.
- The source's trees are grown tubes with card canopies (~600–900 tris,
  3 species, LOD tiers); ours ride the shipped simple-row grammar — the
  canopy instancing is already excellent, the species variety is not.
  (Species variety shipped in W8 — the copper elm + the dark pine, the
  simple rows rolling species by a position hash.)
- The source's facade shaders carry per-window sills, lintels, band courses
  and soot; ours approximate with banded vc boxes. (The sills + lintels
  shipped in W8 on all 28 W6/W7 rows — 104 → 310 pairs; the band courses
  and soot remain approximated. → **CLOSED by W13 (2026-11-13)**: the band
  courses ship as real proud string-course ledges at every mid-floor line
  on every facade W8 dressed (131 ledges, `makeBandCourse`, PAL.stone), the
  soot as the carbon plume rising from every dressed window head (310 fans,
  `makeSoot`, the wear row's `soot` tone) plus the 28 cornice grime shelves
  under the W6/W7 rooflines — 469 pieces, zero colliders, +0 draw calls
  (the vertex-color fusion prices plain Lambert free; the census stays 190).
  The never-crossing law holds: a band never crosses a window on its own
  facade (the grammar's own pitch guarantees ≥ 1.3 m clearance). Evidence:
  `web-three/shots/world-visual-quality/vq-band-soot-grb.png` and
  `vq-band-soot-terrace.png`.)

## 5. Files

- New: `web-three/src/world/neighborhoodFabric.ts`, `tests/neighborhood-fabric.test.ts`, `scripts/probe-neighborhood.mjs`
- Changed: `web-three/src/world/World.ts` (walls ±64, the W6 builder, the fabric pass call), `web-three/src/world/cityFabric.ts` (GeoPush/hash01 exported — reuse, not duplication), `src/game/interactionDefs.ts`, `src/core/content.ts`, `src/sim/contentCatalogue.ts`, `docs/data/world-registry.json`, `scripts/design/validate-registry.mjs`, `tests/a3-registry-flip.test.ts`, `tests/city-fabric.test.ts`, `tests/sim-content-catalogue.test.ts`
