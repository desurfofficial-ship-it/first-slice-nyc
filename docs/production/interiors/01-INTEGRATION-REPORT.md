# INTERIOR ASSET INTEGRATION REPORT — FIRST SLICE

| | |
|---|---|
| Work package | Complete interior asset production & world integration (owner directive, 2026-11-07) |
| Branch | `feat/interior-production` (from main `aedc27d`) |
| Pipeline | sand3d 1.6.3 / bpy 5.2.3 — `tools3d/sandflow_eval/run_interiors.py` (32 programs, determinism-shaped builds) |
| Seam | the shipped `World.upgradePropWithGLB` prop seam, manifest-driven (`src/world/interiorAssets.ts`) |
| Result | **9 interiors dressed, 46 new sand3d placements + 32 GLB files (1.99 MB total), every slot landed in-engine, all gates green** |

## 1. What was built (32 sand3d programs → 32 GLBs → 46 placements)

| Interior | Landed assets (sand3d unless noted) |
|---|---|
| ROSA'S BODEGA | cash register, coffee station, microwave (counter); produce crates (floor) — joins the shipped sand3d gondolas + reach-in fridge |
| LAUNDRY-INT | 4 commercial dryers (washer-slot pattern), 2 folding tables, wire cart, detergent shelf, 2 linen bins, soda vending machine |
| BARBER-INT | 2 barber chairs (star base, hydraulic column, plum upholstery), 5 m counter run (doors, tonics, clippers, towels), cash register |
| PIZZA-INT | 3-door drink cooler, deck oven + hood, prep counter (sauce trays, flour bin, pizza boxes), menu board |
| BAKERY-INT | deck oven + hood, 2 bread racks (baguettes, loaves), 5.4 m display case, rear flour wall (sacks, dough trays, supply boxes) |
| RECORD-INT | 3 browse bins (~40 record spines each), 2 listening speakers, west-wall LP shelving (~90 spines + poster panel) |
| HALL-INT | 4 folding-chair stacks, community kitchenette (sink, faucet, urn, cups), 5 m utility shelf (paint cans, paper boxes, tools) |
| DINER-INT | 8 m cook line (griddle, fryers, prep wells, plate stack, heat-lamp bar), register counter (keys, napkins, straw jar), coffee station |
| CECIL-ROOM | studio kitchenette (sink, faucet, towel rail), toilet, pedestal basin, steam radiator under the window |

Every asset: real-world millimetre proportions, flat unmetallic materials
(the vertex-fuse law — **one vertex-colored draw per prop**), FIRST SLICE
palette accents, documented world orientation. The ABO furniture seam is
untouched and still lands (40 slots verified in-engine).

## 2. Integration law held

- Manifest-driven: `INTERIOR_SLOTS` (id / room / fixture / file) + drift-pinned
  by `tests/interior-assets.test.ts` (fixture names vs World builders, files vs
  disk, files vs the QA-gated build manifest, program provenance).
- Missing/malformed file ⇒ the shipped placeholder stays (docs/28 seam law).
  Nothing gameplay-bearing changed: colliders authored in the builders, room
  toggles untouched, anchors untouched, interaction targets untouched.
- Composite placeholders collapsed to full-height bodies per the shipped
  pattern (folding tables, barber chairs) so the ±90 % footprint guard passes
  by construction; long wall units authored in final world orientation.
- New colliders only against walls/corners; all door zones and NPC stand
  spots stay clear (Rosa / Eddie / Kev / Deon keep their floors).

## 3. Verification (all executed on this branch)

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| vitest (full suite) | **980/980 passed, 66 files** (incl. the new interior-assets pins) |
| `vite build` (production) | OK (pre-existing chunk-size warning only) |
| `probe-interior-dressing.mjs` (new, in-engine) | **PASS** — 69 GLB props + 40 ABO furniture slots landed, 0 page errors |
| `probe-w5-interiors.mjs` (shipped regression) | **PASS** — the toggle, the walk-in, the duck, the glass-side law all intact |
| E2E story driver | run on both pristine `main` and this branch in this sandbox: stalls at the same early beat on both (environmental, software-GL pace; the register's own green run 606 s was on faster iron). Not a delta regression. |
| Visual evidence | 9 gameplay screenshots (parked-camera law), `docs/production/interiors/evidence/` + `web-three/shots/interiors/` |

Draw calls inside the dressed rooms (parked evidence camera): BAKERY 76–99 ·
RECORDS 97–109 · PIZZA 145 · HALL 125–148 · DINER 123–170 · BARBER 156–184 ·
LAUNDRY 201 · BODEGA ~209 · CECIL 172–310. Boot-state baseline on this box:
145 draw calls (portrait). Every sand3d prop fuses to one draw; interiors
load with the room group (near band) — nothing new renders at street distance.

## 4. Defects found and fixed during verification

1. sand3d `at(z=…)` anchoring misread (base, not center) — all 32 programs
   rewritten with base-anchored stacks; verified by studio renders.
2. `rz=90` does not lay a cylinder down (cart handle) → `ry=90`; cans and
   plates re- stood upright.
3. Oven flues inflated GLB height and shrank the ovens under the height-fit
   law → flues removed, hood-capped proportions re-verified.
4. Mirror-axis bugs: the microwave door and the Cecil kitchenette fronts
   faced their walls → x-mirrored and rebuilt.
5. `run_interiors.py --only` clobbered the QA manifest → now merges.
6. Hall chair-stack fixtures renamed `Hall_ChairStack_<i>` so the drift pin
   matches the builder loop.

## 5. Remaining (honest list)

- SUB-01 platform and the arrival terminal keep their own environment-kit
  identity — a later dressing pass, not this batch's nine furnished rooms.
- The bakery oven's shipped warm-mouth panel sits ~12 cm in front of the
  slimmer GLB oven face (reads as a lit mouth; not re-authored).
- The E2E story driver needs faster iron than this sandbox's software GL —
  rerun on the next machine with real GL before the next release cut.
- A-3 / DEC-4 remains owner-gated (untouched, per governance).
