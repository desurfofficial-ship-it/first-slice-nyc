# Doc 44 — World Coordinate & Location Registry

> **Deliverable F.** The authoritative machine-readable world plan:
> **[`docs/data/world-registry.json`](data/world-registry.json)** — one file that
> the maps, the floor plans, the massing tool, and (after approval) the
> construction agents all read. This document explains its schema, ID grammar,
> and the tooling contract.

---

## 1. Why a JSON registry

The milestone's core demand: *"future agents can construct buildings and systems
using stable IDs and coordinates"* and *"the map must be technically implementable,
not just an attractive drawing."* A markdown table drifts; a JSON file **runs**.
Everything in docs/39–43 is generated or cross-checked from this file:

| Consumer | How it reads the registry |
|---|---|
| `scripts/design/validate-registry.mjs` | structural + world-law checks (below) |
| `scripts/design/render-world.mjs` | draws master map, story-block sheet, floor plans |
| `scripts/design/massing.html` | extrudes every footprint in the game's own three.js |
| future construction agents | the build contract: positions, footprints, heights, entrances |

## 2. Coordinate law (same as the shipped world)

- Units: meters. +x east, +z north, y up. **The origin does not move.**
- Footprints: `{x, z, w, d}` — center + full width/depth, exactly
  `boxFromCenter()` in `engine/collide.ts`.
- Heights are roof-line y above grade.
- Entrances carry `{x, z, faces}` — `faces` names the street side (S/N/E/W),
  matching the sun/camera grammar of the shipped block.

## 3. ID grammar (permanent — append, never renumber)

| Prefix | Meaning | Examples |
|---|---|---|
| `STR-*` | streets | STR-KESTREL, STR-JUNIPER |
| `IX-*` | intersections | IX-KJ (Kestrel×Juniper) |
| `XW-*` | crosswalks | XW-CANON (the shipped signalized one), XW-COURT |
| `BLK-*` | blocks | BLK-N, BLK-S |
| `KTN-*` / `KTS-*` | Kestrel North / South face buildings | KTN-01, KTS-02 |
| `GRB-*` `PWK-*` `SRC-*` `SMB-*` `TEN-*` `KCM-*` `SND-*` | Gable Row / pre-war walk-ups / Sycamore Court / Marlow shops / tenements / community hall / diner | GRB-03, SMB-02 |
| `SUB-*` `VND-*` | transit structures, street vendors | SUB-02, VND-01 |
| `VDN-D*` | Class-D backdrop masses | VDN-DW1a |
| `PRK-*` `GRD-*` `PLY-*` | parks / gardens / playgrounds | PRK-GREEN, PLY-MARLOW |
| `LMK-*` | landmarks | LMK-05 (the mural) |
| `NZ-*` | NPC activity zones | NZ-GARDEN |
| `R-*` `V-*` | pedestrian / vehicle routes | R-ALLEY, V-CAB |
| `*-INT` | interiors | BODEGA-INT, CECIL-ROOM |
| `BUS-*` `SKY-*` | bus stops, skyline cards | BUS-01, SKY-N |

## 4. Schema (per top-level key)

```
meta          version, coordSystem, law[], researchBasis{grid,typology,sources[]}
bounds        world, playableCore, currentShippedWalls, skylineCards[]
neighbourhood name, identity, canon (the naming-authority note), cityContext
streets[]     id, name, axis, centerline, road{...}, walks, totalWidth, ways, character
intersections[]  id, streets, x, z, cornerBuildings[]
crosswalks[]  id, x, z, w, axis?, note
blocks[]      id, name, bbox, identity
buildings[]   id, name, status(existing|planned), class(A|B|C|D), face, block,
              footprint{x,z,w,d}, height, floors, style, exterior, entrance[],
              interior (ref or null), storyRole, collider, sitsOn?
parks[]       id, name, status, bbox, layout{gates,benches,trees,fixtures}, identity, npcZones[]
landmarks[]   id, name, anchor, reason
transit       subway{line,bulletColor,entrances[]}, bus{route,loop,stops[]},
              taxi{rail,phaseW4}, parkedCars[]
npcZones[]    id, place, who, when, status
routes        pedestrian[], vehicle[]
interiors[]   id, building, status, shell{xMin,xMax,zMin,zMax,level?,clearH,belowGrade?}, plan[{item,x,z,w,d,type?}]
furnitureStandards  trees, lamps, bins, signs
performance   measuredBaseline{commit,calls,tris}, doc07Budget, strategy[]
constructionPhases[]  W0..W5 with content + unlocks
openDecisions[]      the explicit unresolved list
```

## 5. The validator contract (what "green" means)

`node scripts/design/validate-registry.mjs` exits 0 only when **all** hold:

1. Every ID is unique across all entity types (currently 116).
2. Every footprint is inside the world bounds.
3. Every block-tagged building is inside its block's bbox.
4. No two non-D buildings overlap (party-wall touching allowed).
5. No building mass enters a roadway (the legal sidewalk exception: `sitsOn`).
6. Every interior shell sits inside its building (below-grade rooms exempt).
7. **Shipped-world fidelity** — 12 masses byte-checked against the code values
   transcribed from `World.ts`/docs 38 §1; 18 shipped interaction anchors must
   land on or beside a registry entity (the "orphaned anchor" check).
8. Parks stay off roadways; landmarks/zones/transit references resolve.

Current output: `REGISTRY VALIDATION OK — 116 IDs, 43 buildings (12 existing),
5 streets, 5 parks, 10 interiors. Shipped-world fidelity: 12/12 masses, 18/18
anchors.`

## 6. Change protocol (for future agents)

1. **Never edit an `existing` entry.** If the shipped world changed, the registry
   is wrong AND the validator's shipped-fidelity table must be updated with the
   new code values in the same commit — both, or neither.
2. New content = new entries with new IDs (append; the grammar above is the rule).
3. Any position change to a planned entry re-runs the validator and re-renders
   the maps (one command each; the docs embed the PNGs).
4. `openDecisions[]` is the honest list — resolve items by *removing them with a
   dated note in the decision's entry*, never silently.
5. The registry is data, not code: it ships in `docs/data/` until construction
   begins; when W1 starts, construction agents may copy it to
   `web-three/src/world/masterplan/` as the build source (a docs→code promotion,
   recorded in the W1 report).
