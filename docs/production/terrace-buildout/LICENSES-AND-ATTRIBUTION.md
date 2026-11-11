# LICENSES & ATTRIBUTION — the terrace build-out (W6, register v1.44.0)

## Source: mrdoob/slop-newyork

- Repository: https://github.com/mrdoob/slop-newyork
- Copyright (c) 2026 Mr.doob
- License: **MIT** (verbatim notice preserved in the repository root
  `THIRD-PARTY-NOTICES.md` since the city-fabric wave, v1.40.0 — that
  notice covers this wave too: `neighborhoodFabric.ts` is the same
  adaptation program's second pass).

### What was adapted (technique-level, this wave)

1. The fire-escape construction recipe (dims, per-story landings, raised
   drop ladders, gooseneck) from `js/fire-escapes.js` — re-expressed as
   our own Lambert vertex-color geometry; no source code copied verbatim.
2. Storefront/awning proportions and the five-color awning palette from
   `js/buildings.js` — re-expressed through the shipped `makeStorefront`.
3. The street-prop dims for the USPS collection box, fire hydrant, and
   ConEd steam stack (+ sawhorses) from `js/street-details.js` /
   `js/street-props.js` — re-expressed as merged vertex-color boxes.
4. The street-tree pit soil tone and line-placement discipline from
   `js/trees.js` / `js/tree-placements.js` — riding the shipped tree kit.

No source file from the upstream repository is included in this
repository; no upstream dataset (NYC Open Data, OSM, `.bin.gz` geodata)
enters the repo (the ODbL question never arises).

## FIRST SLICE's own assets used

- `makeStorefront`, `makeBrownstoneStoop`, `makeBench`, `makeGardenBed`,
  `makeShed`, `makeCompostBin`, `makeBulletinBoard`, `makeTreePit`,
  `buildSimpleTree`, the canopy instancing, `makePoleSign` — all shipped
  house builders (docs/3d-assets).
- The registry and every coordinate it carries (the no-invention law).

## Data license status

| Asset | License | Entry path |
|---|---|---|
| slop-newyork techniques | MIT | technique-level adaptation, notice preserved |
| NYC Open Data / OSM geodata | ODbL et al. | **not used** — the registry is authored |
| FIRST SLICE's own palette/kit | project-internal | the palette law (PAL ∪ WEAR ∪ FABRIC ∪ NEIGH) |
