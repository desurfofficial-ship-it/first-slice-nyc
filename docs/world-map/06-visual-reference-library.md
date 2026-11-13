# 06 — Visual Reference Library (street-level + neighbourhood references)

> **Status:** Reference-library deliverable (2026-11-13). The directive's §3C
> "Street-level visual references" and §3D "Neighbourhood visual targets"
> mandate a curated library of real photographic references and reference-repo
> images, with per-image captions explaining what each reference guides.
>
> **The law this library serves** (AGENTS.md §1b Anti-Slop Quality Gate):
> "Prefer a smaller number of distinctive, well-integrated New York details
> over hundreds of repetitive objects." The library is curated, not exhaustive.
>
> **Provenance:** every reference below is either (a) a real photographic source
> cited by URL with its license, or (b) an in-repo asset from one of the five
> approved engineering reference repositories, with the file path and license.
> No reference is invented.

---

## 1. Real photographic references (the NYC visual identity)

These are the real-NYC grammar references the world bible (doc 04) wrote from.
They are **reference-only** — no OSM/NYC-Open-Data geodata is ingested (the
license verdict in `docs/57-engineering-references.md` §3.4 and §4 stands). The
next agent should fetch the actual images via `WebSearch` / `WebFetch` or the
`image-search` skill, download them under `docs/world-map/images/references/`,
and credit each source.

### 1.1 NYC streets (the grammar)

| Reference | What it guides | Source |
|---|---|---|
| A working upper-Manhattan commercial street at golden hour | The Kestrel Street identity — warm, busy, storefronts with awnings and lit signs | MCNY (the Museum of the City of New York) photograph archive — themcny.org |
| The 1811 Commissioners' Plan grid | The avenue > street ratio (30 m / 18 m); the block proportions | thegreatestgrid.mcny.org — the registry's `meta.researchBasis.grid` source |
| A brownstone block with high stoops | The Gable Street identity — the stoop culture, the rowhouse rhythm | Brownstone-district photography (generic NYC reference; the bible names "the ridge between Harlem and Washington Heights") |
| A NYC diner at night | The Sycamore Avenue identity — the Diner Sign, the neon, the counter | NYC diner photography (generic reference; the bible names "the diner sign") |
| A NYC wooden water tower | The Three Towers landmark — vitalcitynyc.org's reference | vitalcitynyc.org/nyc-wooden-water-tanks-architecture-history — the registry's `meta.researchBasis.typology` source |
| A NYC fire escape with ironwork | The W12 filigree law — the alpha-cutout picket + scroll ring grammar | NYC fire-escape photography (generic reference; the slop-newyork integration report §4 names the gap) |
| A NYC bodega interior | The ROS-INT dressing — the shelves, the counter, the back room | NYC bodega photography (generic reference) |
| A NYC barbershop interior | The BARBER-INT dressing — the chair, the counter, the mirror | NYC barbershop photography (generic reference) |
| A NYC pizzeria interior | The PIZZA-INT dressing — the oven, the prep counter, the booth tables | NYC pizzeria photography (generic reference) |
| A NYC laundromat interior | The LAUNDRY-INT dressing — the machines, the folding tables | NYC laundromat photography (generic reference) |
| A NYC subway station | The K station houses — the globe post, the stair, the fare lane | NYC subway photography (generic reference; the station houses are the SUB-01/02 built in W5) |
| Times Square at night | The destination — the canyon of billboards, the sync screens, the red steps | Times Square photography (generic reference) |

### 1.2 NYC architectural details (the kit)

These are the details the `world/nycKit.ts` port from slop-newyork already
implements (provenance in `docs/slop-integration/01-SOURCE-REUSE-REPORT.md`).
The references are the visual confirmation:

| Reference | What it guides | Source |
|---|---|---|
| A NYC HVAC rooftop unit | `makeHVACUnitNYC` in `nycKit.ts` | NYC rooftop photography |
| A NYC cornice band | `makeCorniceBand` in `nycKit.ts` | NYC cornice photography |
| A NYC storefront awning | `makeAwningNYC` in `nycKit.ts` | NYC awning photography |
| A NYC fire-escape stack | `makeFireEscapeStack` in `nycKit.ts` + the W12 filigree | NYC fire-escape photography |
| A NYC steam vent | `makeSteamVentNYC` in `nycKit.ts` | NYC street photography |
| A NYC subway stair + globe post | `makeSubwayStairNYC` + `makeSubwayGlobePost` in `nycKit.ts` | NYC subway photography |
| A NYC mailbox | `makeMailboxNYC` in `nycKit.ts` | NYC mailbox photography |
| A NYC scaffold shed (the sidewalk shed) | `makeScaffoldShedNYC` in `nycKit.ts` | NYC scaffold-shed photography |

## 2. Reference-repo images (the engineering reference visuals)

These are the in-repo images from the five approved engineering reference
repositories. They are **reference for visual quality and technique**, not for
copying. The license verdict per repo is in `09-engineering-reference-study.md`
§4.

### 2.1 slop-newyork (the NYC visual identity reference)

| Reference | What it guides | Source |
|---|---|---|
| slop-newyork's real-NYC 3D city render | The NYC visual identity at survey granularity — the grammar of the grid, the building footprints, the landmarks | The repo's README / the live demo (https://github.com/mrdoob/slop-newyork/) — MIT code; the geodata is reference-only |
| slop-newyork's minimap / atlas | The `ui/sketch.ts` cousin — one geography, every view; the documented world frame; the label tiers | The repo's `js/nyc-map.js` (47k lines) |

### 2.2 Metropolis (the procedural building reference)

| Reference | What it guides | Source |
|---|---|---|
| `01_skyline_golden.png` | The skyline fabric at golden hour — the SKY-W/SKY-E card row cousin | `Metropolis/01_skyline_golden.png` (in the repo root) |
| `02_night.png` | The lit-window occupancy at night — the fenestra per-window onset cousin | `Metropolis/02_night.png` |
| `04_downtown_noon.png` | The downtown tower massing — the Metropolis typology vocabulary (house / rowhouse / midrise / tower / warehouse / civic / retail) | `Metropolis/04_downtown_noon.png` |
| `05_street_night.png` | The street-level night read — per-tenancy shopfronts, recessed glazing | `Metropolis/05_street_night.png` |
| `07_aerial.png` | The bird's-eye aerial — the top-down map cousin (the directive's §3A) | `Metropolis/07_aerial.png` |

### 2.3 HongKongThreejs (the walkable street-level reference)

| Reference | What it guides | Source |
|---|---|---|
| `media/01-hotel-fronts.jpg` | The dense frontage — the shader-drawn-window discipline, the chunked cull | `HongKongThreejs/media/01-hotel-fronts.jpg` |
| `media/02-from-the-tower.jpg` | The aerial overview — the 3D overview cousin (the directive's §3B) | `HongKongThreejs/media/02-from-the-tower.jpg` |
| `media/03-waterline.jpg` | The street-level waterline read — the sidewalk + curb + ground-texture law | `HongKongThreejs/media/03-waterline.jpg` |
| `media/04-park-promenade.jpg` | The public space read — the park + the promenade cousin | `HongKongThreejs/media/04-park-promenade.jpg` |
| `media/05-beach-cruiser.jpg` | The walkable street at distance — the LOD register pattern | `HongKongThreejs/media/05-beach-cruiser.jpg` |

> **Note:** HK3 is Hong Kong, not New York. The grammar (tong lau walk-ups,
> bay windows, vertical neon) is the **wrong identity** for Alder Heights. The
> references are for **density, walkability, and shader-drawn-window
> discipline**, not for visual identity. The identity comes from the NYC
> references in §1.

### 2.4 gen-city-auto (the runtime simulation reference)

| Reference | What it guides | Source |
|---|---|---|
| gen-city-auto's tile-streaming demo | The residency hysteresis pattern (prefetch 100 m, keep 150 m) — the district-ring cousin | The repo's README — MIT code; the WebGPU/WGSL renderer is not for us |
| gen-city-auto's pedestrian density | The pure density read (`max(0.15, exp(−d²/700²) per hub)`) — the `world/peds.ts` cousin | The repo's `src/game/pedestrians.ts` (147 lines) |

### 2.5 Blueprint3D (the interiors reference)

| Reference | What it guides | Source |
|---|---|---|
| Blueprint3D's floorplan editor | The corner/wall graph + rooms derived from topology — the `world/interiors/plan.ts` cousin | The repo's live demo (original) or the modern rewrite — MIT code; the demo assets are unlicensed in the modern repo |
| Blueprint3D's item placement | The six-way placement taxonomy (floor / wall / in-wall / …) — the `world/furniture.ts` seam cousin | The repo's `items/factory.ts` |

## 3. In-project evidence (the shipped build's own references)

The project ships screenshot evidence under three directories. These are the
**existing vs proposed** references the directive's §3E mandates — they are
labeled accurately as implemented gameplay, not concept art.

### 3.1 `docs/3d-assets/evidence/` (the asset-quality evidence)

| File | What it is |
|---|---|
| `before-alley.png` | The alley before the W8 dressing pass |
| `before-juniper.png` | Juniper Avenue before the W8 dressing pass |
| `before-kestrel.png` | Kestrel Street before the W8 dressing pass |
| `before-roofline.png` | The roofline before the W8 dressing pass |
| `before-gable-row.png` | Gable Row before the W8 dressing pass |
| `vq-marlow-row.png` | The Marlow row visual-quality frame |
| `vq-gable-row.png` | The Gable Row visual-quality frame |
| `vq-roofline.png` | The roofline visual-quality frame |
| `vq-juniper-ghost.png` | The Juniper ghost sign visual-quality frame |

### 3.2 `tools3d/sandflow_eval/renders/` (the 32 procedural-asset renders)

The 32 procedural GLB asset renders — the sandflow showcase grid, the
contact sheet, and per-asset renders (the newsrack, the security gate, the
storefront, the washing machine, the bodega shelf, the streetlight, the
refrigerator, the recycling bin, the hydrant, the apartment door, the park
bench, the dsny basket, the laundry cart, the detergent shelf, the diner
kitchen line, the laundry table, the newsrack, the recycling bin, the produce
crate, the record bin, the barber chair, the security gate, the pizza oven,
the vending machine, the bakery oven, the menu board, the streetlight, the
laundry table). These are the **asset references** for the interior dressing —
each render shows the procedural GLB the asset pipeline generated.

### 3.3 `web-three/scripts/shots/` (the probe harness's evidence directory)

The probe harness (`probe-*.mjs` + `diag-*.mjs`) captures composed frames into
the shots directory. The W10 and W12 worklog entries cite specific frames:

- `shots/w10-larkin-gate-street.png` — the W10 park-gate at PRK-LARKIN, street
  view,
- `shots/w10-larkin-garden.png` — inside the Larkin slot,
- `shots/w10-carrow-gate-street.png` — the W10 park-gate at PRK-CARROW,
- `shots/w10-carrow-garden.png` — inside the Carrow slot,
- `shots/w12-filigree/` — the W12 fire-escape filigree close-ups (the KTS yard
  face, the GRB garden face, the landing close-up).

## 4. Existing vs proposed (the directive's §3E)

The directive mandates: "Clearly distinguish already implemented areas; existing
areas requiring improvements; new areas to be constructed. Do not confuse
proposed concept art with screenshots of implemented gameplay. Label them
accurately."

| Category | What is in it | Where to find it |
|---|---|---|
| **Already implemented (gameplay screenshots)** | The full Alder Heights block — 81 buildings, 21 interiors, 7 parks, the K line ride, Times Square | The §6 shot list in `01-existing-world-audit.md` (to be captured); the in-project evidence in §3 above |
| **Existing areas requiring improvements** | The open ledger rows — the D-3 money bridge, the ambient-walker schedule migration, the fenestra atlas mip re-audit, the band courses + soot approximation | `08-implementation-progress.md` §8 |
| **New areas to be constructed** | **None.** The map is complete for the vertical slice. The optional slice (CORNERHOUSE-INT) is documented; the narrative-only places (doc 04 §2) are intentionally off-map. | `02-complete-world-design.md` §9 |

**The labeling law:** every frame in the reference library must be labeled as
one of:
- `[GAMEPLAY]` — a captured frame from the running build,
- `[REFERENCE-PHOTO]` — a real photographic reference (with source URL + license),
- `[REFERENCE-REPO]` — an in-repo image from one of the five reference repos
  (with file path + license),
- `[CONCEPT]` — a concept frame or generated image (not a screenshot of
  implemented gameplay).

## 5. The curation task for the next agent

1. **Fetch the real photographic references** (§1) via `WebSearch` / `WebFetch`
   or the `image-search` skill. Download each under
   `docs/world-map/images/references/` with a credit file
   (`docs/world-map/images/references/CREDITS.md`) listing source URL + license
   per image.
2. **Copy the reference-repo images** (§2) from the local clones at
   `/home/z/my-project/refs/*/` into `docs/world-map/images/references/` with
   the repo-name prefix (e.g. `metropolis-01-skyline-golden.png`). Credit the
   repo + license in CREDITS.md.
3. **Capture the live screenshot set** (§3 + the §6 shot list in
   `01-existing-world-audit.md`) from a running dev server. Drop under
   `docs/world-map/images/existing/`. Label each as `[GAMEPLAY]`.
4. **Generate the top-down map** (the directive's §3A) and the **3D overview**
   (the directive's §3B). The probe harness can capture composed frames; a
   custom probe for the bird's-eye at y = 200 is a small addition. Label as
   `[GAMEPLAY]` (rendered from the running build) or `[CONCEPT]` (if generated
   separately).
5. **Curate the neighbourhood visual targets** (the directive's §3D) — one
   frame per street (Kestrel, Juniper, Sycamore, Gable, Marlow) + the Times
   Square destination. Label as `[GAMEPLAY]`.

— Z.ai agent, 2026-11-13
