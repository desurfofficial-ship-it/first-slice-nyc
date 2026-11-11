# SI — the slop-newyork source-reuse report

**Wave:** SI-1, the borough-character pass · **Date:** 2026-11-11 ·
**Source:** [mrdoob/slop-newyork](https://github.com/mrdoob/slop-newyork)
(commit `536a907` — "Improve pedestrian jump and landing animation") ·
**License:** MIT (Copyright (c) 2026 Mr.doob) — notices in
[`web-three/THIRD-PARTY-NOTICES.md`](../../web-three/THIRD-PARTY-NOTICES.md).

This report records what was taken from the reference repository, where each
part came from in its source, how it was adapted, and where it now lives in
FIRST SLICE. It exists because docs/57 already names slop-newyork as a
permanent engineering reference under the study-before-build law: inspect the
reference source first, then build the FIRST SLICE version inside the
existing architecture. That is exactly what this wave did.

## 1. What was studied (and what was deliberately not taken)

The full source was inspected: `js/buildings.js` (the streamed detail pools
and facade presets), `js/building-footprints.js` (the polygon-wall massing
builder), `js/building-details.js` (the roof/storefront placement rules),
`js/building-geodata.js` + `tools/build-buildings.py` (the NYC Open Data
survey pipeline and the NYB1 binary format), `js/fire-escapes.js` (the
escape geometry template), `js/street-details.js` + `js/street-props.js`
(signals, subway entrances, food carts, steam stacks, mailboxes, trees),
`js/city-grid.js`, `js/city-config.js`, `js/nyc-geodata.js`, `js/landmarks.js`
(the custom landmark builds), `js/tsl-materials.js` (the facade shaders),
`js/scene-culling.js`, `js/main.js`, and the test suite
(`tests/building-details.test.cjs`, `tests/building-footprints.test.cjs`,
`tests/fire-escapes.test.cjs`, `tests/facade-projection.test.cjs`,
`tests/building-geodata.test.cjs`).

**Not taken, on purpose:**

- **The geodata and its pipeline** — the 37,353-building Manhattan survey
  (`building-geodata.bin.gz`, NYB1), the MTA entrance sites, the NYC Parks
  70,680-tree survey, the OSM-derived street/block/coastline sets, and the
  tools that build them. Two independent reasons: (a) governance —
  AGENT-DEVELOPMENT-GOVERNANCE §2 standing prohibition: no OSM / NYC Open
  Data geodata ingestion, and docs/57 records the geodata as
  *reference-only, never ingest*; (b) world truth — FIRST SLICE's geometry
  authority is the DEC-4 registry flip: masses read
  `docs/data/world-registry.json` through `regShell()`; a second survey
  dataset would fork that truth.
- **The renderer and the materials** — `WebGPURenderer`, the TSL node
  materials (`tsl-materials.js`), the MRT/SSR post pipeline, and the
  clustered lighting. FIRST SLICE is a WebGLRenderer + MeshLambertMaterial
  world; the mission forbids the migration without explicit authorization,
  and none was given.
- **The application shell** — controllers, traffic, pedestrians, audio,
  boroughs, cameras. FIRST SLICE's sim, nav, and cast systems stay ours.

## 2. What was ported, part by part

Every port carries a provenance header in its module
(`web-three/src/world/nycKit.ts`, `web-three/src/world/skylineLandmarks.ts`)
and the pass that consumes them is `World.buildAlderHeightsSI()`.

| # | What was taken | Source location | Adaptation into FIRST SLICE | Now lives at |
|---|---|---|---|---|
| 1 | **Cedar water tower, 3-part construction** — 4 splayed steel legs with X-bracing, chime deck ring, feed riser, 12-sided staved barrel, hoop bands, conical cap | `js/buildings.js` 508–567 (trestle part list, barrel/cone geometry, the y+1.3/+4.2/+6.7 assembly) | Rebuilt as a static Lambert piece-builder (`makeWaterTowerNYC`) in the facadeKit convention: shared unit geometries, `MatBank` tones, hoop bands as geometry instead of the TSL stave shader, hatch-ladder rungs seeded by the caller. The existing shipped `waterTower()` (simple tank+cone+legs) stays untouched for the five canon roofs; the ported build dresses five MORE roofs (KTS-03, TEN-01, SRC-01, KTN-02, LMS-01) | `nycKit.ts` · `World.dressRooflines()` |
| 2 | **Rooftop chiller grammar** — the source's w/d 2.4–5.0 × h 2.4 (masonry) / 3.4 (modern) ranges and its 35%-of-roofs rule | `js/building-details.js` 85–88 + `js/buildings.js` 569–593 | `makeHVACUnitNYC`: box body, proud louver skirt, two dark fan wells on the top, pipe stub — the source draws louvers/fans in a shader; geometry reads the same from street distance and stays bakeable. Seeded 35% gate over ten eligible flat roofs → 6 units + the glass infill's roof line | `nycKit.ts` · `World.dressRooflines()` |
| 3 | **Projecting cornice band** — 0.55 × 0.65 stone band hung 0.33 under the roofline on per-edge placement | `js/building-details.js` 46–53 (+ the hang-offset rule at `js/buildings.js` 731–740) | `makeCorniceBand` — single-face band courses (the source caps per-edge; FIRST SLICE's full-perimeter `makeCornice` already caps whole masses). Applied as mid-band courses on LMS-01 (S+N), KTN-02, KTS-03, KTN-05 | `nycKit.ts` · `World.dressRooflines()` |
| 4 | **Roof-spot occupancy** — 8-try containment + occupancy-set placement so tanks/chillers never collide on one roof | `js/building-details.js` 63–80 (`roofSpot`, `containsBox`, the occupied list) | Simplified to FIRST SLICE's flat rectangular roofs: a per-building reserved-seat map with a 2.4 m clearance check for chillers and chimneys (the tanks claim their seats first) | `World.dressRooflines()` |
| 5 | **Storefront detail grammar** — 10 m edge segments, the ≤4-per-building cap, awning slab 1.8 × 0.75 at y 3.8, the 5-canvas palette | `js/building-details.js` 91–119 + `js/buildings.js` 598–613 | `makeAwningNYC` with the source's 5-color row re-anchored to Doc-04 darkenings (brick/teal/plum/gold/ink → `NYC.awn*`, pinned verbatim by `tests/nyc-integration.test.ts`). Used for the Mallow Court's lobby canvas; the gallery front rides the shipped `makeStorefront` grammar with the source's plum | `nycKit.ts` · `World.dressStorefrontRow()` |
| 6 | **Sidewalk scaffold shed** — the green shed slab, one per building at 6% | `js/building-details.js` 102–104 + `js/buildings.js` 649–654, 798–806 | `makeScaffoldShedNYC` built out honestly (ply deck at 3.3 m, valance, steel legs, braces) and placed in the GLS-01 yard per the registry's own exterior line; the deck joins the camera's canopy-sphere set (the shipped sidestep law) instead of adding colliders | `nycKit.ts` · `World.dressStorefrontRow()` |
| 7 | **Fire-escape template** — per-landing decks, alternating diagonal flights, drop ladder, gooseneck over the parapet; landings = min(floors−1, 7); the masonry + h ≤ 30 eligibility rule | `js/fire-escapes.js` 38–81 (the 6-plane template + tread quads), `js/buildings.js` 312–341 (placement law) | `makeFireEscapeStack`: the same silhouette rebuilt in opaque thin boxes (FIRST SLICE is untextured Lambert — the source's alpha-tested ironwork planes become real posts/rails/treads, fully bakeable). Five stacks on yard/flank faces (KTS-03 S, LMS-01 N, IND-01 N, SRC-01 E, PWK-02 N) chosen by the source's own rules — never a door, stoop, or storefront face. Silhouette-only deco, per the shipped fire-escape law (the Cecil's climbable escape stays the only gameplay one) | `nycKit.ts` · `World.dressFireEscapes()` |
| 8 | **Subway stair entrance** — steel housing, dark-green railings with two horizontal bands, painted-tread read, SUBWAY band on the lintel, green/cream globe pair | `js/street-props.js` 43–118 (`createSubwayEntranceParts`) | `makeSubwayStairNYC`: the same part list in FIRST SLICE materials; the source's 1024² canvas atlas planes became geometry bands (bakeable, no texture) plus one `makeSignBoard`-style band; the globes keep the source's half-sphere two-tone construction. Placed on the Times Square surface plaza south of the SUB-TS slot (joins `TSS_Group`, zone-owned like every TS mesh). The atlas-tread idea survives as proud step strips | `nycKit.ts` · `World.dressFarWorldSI()` |
| 9 | **Subway globes** (standalone) | `js/street-props.js` 108–112 | `makeSubwayGlobePost` — a pair flanks the shipped SUB-01 headhouse (the core's station read upgrades; two tiny colliders seated off the walk lane like the shipped planter) | `nycKit.ts` · `World.dressStreetLife()` |
| 10 | **ConEd steam vent stack** — 5-band orange/white cylinder + sawhorse barricades, authored sites | `js/street-details.js` 547–692 | `makeSteamVentNYC` — the stack shell + two sawhorses at the laundry's wall (Kestrel). The TSL smoke sprites were NOT ported: the world already owns a seeded steam system (`steamPoints`) | `nycKit.ts` · `World.dressStreetLife()` |
| 11 | **USPS relay box** — mid-block mailbox construction | `js/street-details.js` 776–813 | `makeMailboxNYC` — navy cabinet (a documented darkened-plum per the palette law), dispatch slot, drawer faces, at the bodega corner | `nycKit.ts` · `World.dressStreetLife()` |
| 12 | **NYC DOT street-name blades + ped-signal boxes** — the blade at y 4.65 on every signal mast | `js/street-details.js` 144–334 | The blade construction rides the shipped `makePoleSign` canvas grammar with the source's DOT-green read (darkened teal) — 'KESTREL ST' bolted to the shipped signal mast, 'JUNIPER AV' on a NEW full signal mast at the Juniper × Kestrel corner (the ported cantilever-mast grammar: pole, arm, brace, three-lamp head — via the shipped `makeTrafficSignal`) | `World.dressStreetLife()` |
| 13 | **Stepped-setback art-deco landmark construction** (podium → tiers → shaft → observation deck → mast → dome → spire → beacon) | `js/landmarks.js` 193–311 (Empire State build) | `buildSkylineLandmarks` 'Decow' silhouette on the far skyline band (z 90), re-scaled to the card's silhouette scale, fog:false, deco-only | `skylineLandmarks.ts` |
| 14 | **Terraced-crown construction** (stacked shrinking arcs + needle + corner nubs) | `js/landmarks.js` 316–399 (Chrysler build) | 'Crown' silhouette — the arcs read as stacked cylinders at skyline distance | `skylineLandmarks.ts` |
| 15 | **Wedge-tower construction** (the triangular extrusion) | `js/landmarks.js` 862–906 (Flatiron build) | 'Wedge' silhouette — squared prism + chamfered prow at card scale | `skylineLandmarks.ts` |
| 16 | **Curtain-wall facade preset** (glass tones, mullion grid read) | `js/buildings.js` facade presets 2–4 + `js/tsl-materials.js` `createCurtainWallMaterial` | GLS-01 "the Glass Infill": ink curtain body + proud mullion/slab grid over a stone base — the source's shader-drawn curtain wall told in FIRST SLICE's proud-geometry grammar (bakeable). Two glass sliver silhouettes on the skyline band carry the preset's tones | `World.buildMallowRow()` · `skylineLandmarks.ts` |
| 17 | **Pre-war limestone facade preset** (stone `0xd8cdb8`, trim, 2.6 m bays, 3.7 m floors, stone band courses) | `js/buildings.js` facade preset 0 + `js/tsl-materials.js` `createPreWarBuildingMaterial` | LMS-01 "the Mallow Court": limestone base + ashlar upper + tall parlor openings + band course + high stoop — FIRST SLICE's stoop/window grammar at the source's proportions | `World.buildMallowRow()` |
| 18 | **Typology eligibility rules** (masonry test, h ≥ 14 for tanks, year < 1945 for escapes, the 35%/25% seeded chances, typology-from-tone selection) | `js/building-details.js` + `js/buildings.js` 349–353 | Encoded as the pass's candidate tables + seeded gates (`seededRng(20261111)`), pinned by `tests/nyc-integration.test.ts` (tanks only on tall masonry non-canon roofs; escapes only on faces away from their building's door) | `World.dressRooflines()` · tests |

## 3. Techniques studied and applied (no code taken)

- **Deterministic per-building seeding** — the source seeds detail placement
  from the footprint centroid; FIRST SLICE's law is a single pass seed
  (`seededRng(20261111)`) so the same city builds every run. Same principle,
  the house seed discipline (docs/57 §3).
- **Streaming detail pools with fixed instanced capacity** — the source's
  MAX_CORNICES/…/MAX_SHEDS pools rewrite around the player. FIRST SLICE's
  equivalent is the district bake: all SI statics are pre-bake Lambert, so
  every piece fuses into its 28 × 32 m tile and costs ZERO extra draw calls
  (probe: 158 calls at boot, under the 200 budget — the pass added pieces,
  not calls).
- **The neighbor-clearance rule for storefront items** — the source checks
  the blocked box before placing a shed/awning; the SI pass applies the same
  idea by choosing faces explicitly away from doors/stoops/storefronts
  (pinned by test).
- **Landmark `fitToSite` discipline** — the source fits landmark models to
  real outline boxes; the SI silhouettes keep the skyline card's authored
  band (z 88–95) with clamped-district visibility, the FIRST SLICE
  equivalent of "the site is the truth".

## 4. What this deliberately does NOT claim

- No slop-newyork *data* ships in this repository (no NYB1, no surveyed
  trees, no MTA sites, no OSM street graph).
- No slop-newyork *rendering* ships here (no WebGPU/TSL, no SSR, no
  clustered lights).
- No *file* is copied verbatim: every part was rebuilt in the facadeKit /
  props conventions (shared unit geometries, MatBank tones, seeded
  callers, bake-safe statics). The port is recorded at this granularity so
  the MIT notice can ride it honestly.

## 5. Verification

- `tests/nyc-integration.test.ts` — 18 guards (registry containment, nav
  validity, palette anchors, part lists, eligibility laws, skyline deco).
- `scripts/probe-nyc-integration.mjs` — 30 boot checks pinning every SI
  ledger row by name + position, the lane-clearance law, the draw-call
  budget, and console cleanliness; evidence shots in
  `web-three/shots/nyc-integration/`.
- `scripts/probe-world-visual-quality.mjs` — OK (the VQ pins survive the
  pass). `scripts/probe-world-sim.mjs` — 15/15. Full vitest 1395/1395.
