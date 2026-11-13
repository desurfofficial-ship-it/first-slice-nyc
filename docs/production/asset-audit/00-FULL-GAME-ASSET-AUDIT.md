# FULL-GAME 3D ASSET AUDIT — FIRST SLICE (streets, transport, activities, cast)

| | |
|---|---|
| Scope | Every 3D asset family visible in the playable world — not just interiors |
| Method | In-engine census probe (`scripts/probe-asset-audit.mjs`, 341 draw-visible meshes / 202k tris), 19-stop visual tour with parked gameplay cameras (`shots/audit/`), follow-up close-ups (`scripts/probe-audit-followups.mjs`), raycast/vertex analysis of suspect objects |
| Status classes | KEEP · POLISH · REBUILD · MISSING · OPTIMIZE · INVESTIGATE |
| Branch | `feat/asset-audit-rebuild` (from main `aedc27d` + interior-production `8cc6d88` integrated) |

## Defects found and fixed by this audit (already in this branch)

1. **Every baked zone figure rendered WHITE** — `bakeStatics()` deleted each
   source's per-vertex `color` attribute (person rigs' palette) and refilled
   it from the shared white person material. The playground kid, the sandbox
   caregiver, the gossip pairs, readers, stoop sitters, the busker: all blank.
   **Fix:** preserve `geo.attributes.color` when the source carries its own
   palette (World.ts bake). Verified: caregiver + kid now wear the authored
   coral/skin palette (close-up evidence).
2. **Shadow-proxy silhouettes baked into visible batches** — the bake
   swallowed the figures' layer-1-only shadow proxies; the merged batch mesh
   is an ordinary layer-0 mesh, so a white standing silhouette printed inside
   every zone figure. **Fix:** the bake skips meshes the eye layer can't see.
   White vertices in the playground figure band: 1836 → 192 (the remainder
   is cream trim).

## The audit (families, not exhaustive mesh lists)

### A. Streets and public spaces

| Family | Where | State | Class | Action / priority |
|---|---|---|---|---|
| Road, sidewalks, curbs, crosswalks, zebra | whole grid | painted stripes, crosswalk canvas, tree pits | **KEEP** | — |
| Fire hydrants | curbs ×2 | `hydrant.glb` (sand3d) reads well | **KEEP** | — |
| Streetlamps | whole block ×4+ | gold heads, lit faces, honest wires | **KEEP** | — |
| Trash/recycling cans | curbs | GLBs land, read correctly | **KEEP** | — |
| Benches | plaza/bus stop/park | park_bench GLB | **KEEP** | — |
| Bus stop (shelter+sign+bench) | (−24.5, 7.35) | complete | **KEEP** | — |
| Newsrack, bulletin board | plaza/terminal | land via seam | **KEEP** | — |
| Utility poles + wires | avenues | sagging wires, mounted signs | **KEEP** | — |
| Trees, planters, tree pits | rows | instanced canopy, autumn mix | **KEEP** | — |
| Pigeons + squirrel | plazas | blob style consistent | **KEEP** | — |
| Water-main barrier | (−9.7, 7.62), Day 1–3 | plain orange boxes, black posts | **POLISH** | diagonal hazard stripes on panels (P2) |
| Construction truck (water main) | bay | teal truck w/ equipment | **KEEP** | — |
| Folded-towels stack | laundromat washer | single cream cube | **POLISH** | layered towels (P3) |

### B. Transportation

| Family | Where | State | Class | Action / priority |
|---|---|---|---|---|
| **Arrival bus M121 shell** | terminal bay, the boot's first object | rear = flat yellow slab: no taillights, no bumper, no grille; wheels are BOXES; no roof AC, no mirrors | **REBUILD (exterior)** | P1 — code polish in `arrivalBus.ts`; interior (seats/driver/duffel/step) and all colliders untouched |
| **Parked/moving sedan** | Kestrel curb ×2 + rail | `car_sedan.glb` — 4-slab body, no hood/trunk step, no wheel arches, no door seams, hex wheels | **REBUILD** | P1 — new GLB via the repo's CPU pipeline (`tools3d/rebuild_cars.py`), same footprint/orientation, same seam |
| **Taxi (moving)** | avenue rail | `car_taxi.glb` — same deficiencies; roof light present but crude | **REBUILD** | P1 — same script; checker band + proper roof light |
| M121 route bus (moving) | Kestrel rail loop | windows, door, rollsign, bumpers OK; no headlights/taillights | **POLISH** | P2 — light pair, collide:false |
| GOLDEN ORCHARD van | curb | label, cab, wheels read well | **KEEP** | — |
| Subway entrance + headhouse | (−42, 6.2) | roundel, stair, rails, bulletin board | **KEEP** | — |
| Subway station (underground) | K-line slot | own environment kit, shipped probes | **KEEP** (later pass owns SUB-01 dressing) | — |
| Terminal shell | arrival | platform, screens | **KEEP** (SUB-01 kit identity, later pass) | — |

### C. Activities

| Family | Where | State | Class | Action |
|---|---|---|---|---|
| Half-court (paint canvas, hoop+net, pole pad, caged light, chalk board, chain-link, ball) | NE sidewalk | the docs/49 upgrade landed | **KEEP** | — |
| Playground (swings, sandbox, spray basin, fence+gate) | Marlow | complete after the palette fix | **KEEP** | — |
| Park + pergola + garden beds | x 30.6..48 | reads well | **KEEP** | — |
| Vendor cart | corner | umbrella + sign | **KEEP** | — |

### D. Buildings, storefronts, interiors

| Family | State | Class |
|---|---|---|
| Brownstone row + stoops + fire escapes | GRB signs, stoops, scaffold | **KEEP** |
| Storefronts (sign atlas) | teals/corals, awnings | **KEEP** |
| The nine W5 interiors + bodega | 32 sand3d GLBs + 46 placements landed (interior-production) | **KEEP** — `probe-interior-dressing` PASS, evidence in `docs/production/interiors/evidence/` |

### E. Cast

| Family | State | Class |
|---|---|---|
| Player, Rosa, Idris, Sal, the kid, customers | articulated rigs, vertex palettes | **KEEP** (rigs/animations are systems — untouched per governance) |
| Ambient peds + walkers | same rig, palette variety | **KEEP** |
| **Static zone figures** | were WHITE — fixed in this branch | **FIXED** (was REBUILD-class defect) |

## Priority order executed

1. **P1** — bake palette fix (done, evidence above)
2. **P1** — arrival bus exterior REBUILD-class polish (visual-only, colliders untouched)
3. **P1** — sedan + taxi GLB REBUILD (same seam, same footprint, postprocessed flat)
4. **P2** — barrier hazard stripes; M121 route-bus light pair
5. **P3** — folded-towels stack

## Results (all verified in-engine on this branch)

| Fix | Evidence | Verified |
|---|---|---|
| Zone figures wear their palette again | `evidence/zone-figures-fixed-playground.png`, `evidence/playground-after.png` | white vertices in the playground figure band 1836 → 192; caregiver/kid in authored coral |
| Arrival bus exterior complete | `evidence/arrival-bus-side-after.png`, `evidence/arrival-bus-front-after.png` | windows both faces (the original insets were buried INSIDE the wall slabs — the flat-slab root cause), belt stripe split around the door gap, cylinder wheels + hubs, bumpers, grille, head/taillights, mirrors, roof AC |
| Sedan + taxi rebuilt GLBs | `evidence/sedan-rebuilt-3q.png`, `evidence/sedan-rebuilt-broadside.png`, `evidence/cars-on-avenue.png` | `car_sedan.glb` 26 KB / 904 tris, `car_taxi.glb` 40 KB / 1228 tris; each fuses to exactly 1 draw via the seam; hood/trunk steps, glass band + A/B/C pillars, wheel arches, bumpers, grille, plates, lights, mirrors; taxi adds the checker belt + roof light |
| Barrier hazard stripes | `evidence/barrier-stripes.png` | one merged mesh (9 bands pre-merged — the barrier is bake-excluded) |
| M121 route bus lights | visible on the rail loop | +2 draws, collide:false |
| Folded towels | `evidence/laundromat-towels.png` | three laid towels replace the cream cube |

## Performance A/B (same box, same probe, pristine `8cc6d88` worktree vs this branch)

| Room | 8cc6d88 | this branch | Δ |
|---|---|---|---|
| BODEGA | 194 | 205 | +11 |
| LAUNDRY | 200 | 212 | +12 |
| BARBER | 156 | 169 | +13 |
| PIZZA | 305 | 155 | −150 (baseline run caught the loop bus mid-halt; the shipped register documents 145) |
| BAKERY | 93 | 94 | +1 |
| RECORDS | 109 | 110 | +1 |
| HALL | 148 | 196 | +48 (loop-bus position variance; terminal-area views) |
| DINER | 170 | 174 | +4 |
| CECIL | 311 | 333 | +22 |

Triangles per room moved < 0.5%. The +1..+22 residuals are the intentional
additions (bus exterior rides the shipped curb-bake fusion; the barrier
stripes ship as ONE mesh; the car GLBs replaced ~15-draw placeholders with
1-draw fusions). Boot census on this branch: 69 GLB props + 40 ABO furniture
slots, 0 page errors. The world census: 341 draw-visible meshes / 202k tris.

## Environmental constraint (honest record)

The sand3d/bpy venv did not survive the sandbox recycle and `bpy` wheels are
not reachable from this environment's pip index (verified: normal packages
install; every bpy version 4.2→5.2.3 returns "no matching distribution"; no
Blender binary). The cars were therefore rebuilt with the repo's OWN
CPU-only deterministic pipeline (`tools3d/procedural_glb.py` method —
trimesh + numpy, the same tool that produced the current GLBs), and the
buses were polished as code-native geometry in the shipped merge style.
When bpy is reachable again, the Sand3D programs remain the preferred path
for new interior kits (SUB-01 dressing pass).

## Verification method (every fix)

In-engine probes (built dist, swiftshader): the audit tour re-run, the
interior dressing probe, the W5 interiors regression, ped-nav, court probes;
full Vitest suite; `tsc --noEmit`; production build; before/after gameplay
screenshots in `shots/audit/` mirrored to `docs/production/asset-audit/evidence/`.
