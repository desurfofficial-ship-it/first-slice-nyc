# INTERIOR ASSET INVENTORY — FIRST SLICE (the audit that drives the batch)

| | |
|---|---|
| Scope | Every enterable interior in the shipped world, discovered from the codebase |
| Method | Code audit of `web-three/src/world/World.ts` (W5 interior builders + the bodega), the furniture seam (`src/world/furniture.ts`), `tests/interiors.test.ts`, and the W5 probe (`scripts/probe-w5-interiors.mjs`) |
| Law | Each interior gets the assets its PURPOSE demands; colliders/interactions/nav are preserved; every replacement keeps its procedural fallback |

## The interior inventory (9 interiors)

| # | Interior | Registry shell | Where | Fit-out state | Accessible in play |
|---|---|---|---|---|---|
| 1 | ROSA'S BODEGA (BODEGA-INT) | ROS-01, x −20.8..−11.2, z 8.2..19.8 | `World.ts` bodega block | Sandflow shelves ×3 + reach-in fridge + teal counter; rest bare: no register, no coffee station, no produce, no microwave | YES — Rosa works 6:00–22:00, the `biz:rosas_deli` counter |
| 2 | LAUNDRY-INT | KTN-02, x −11..1, z 8.2..19 | `buildW5Laundry` | 6 washers wear the sand3d front-loader; 4 dryers are gray boxes; folding tables = floating top+leg boxes; cart/shelf/linen bins are plain boxes | YES — the shipped bay walk-in (probe §2) |
| 3 | BARBER-INT | KTN-05, x 34.2..39, z 8.2..19.6 | `buildW5Barber` | Two chairs are seat+back boxes; counter is a bare teal run; waiting bench + mirrors wear ABO models | YES — Deon's chair, Tue–Sat 9:00–19:00 |
| 4 | PIZZA-INT | KTN-04, x 24.1..29.9, z 8.2..19.6 | `buildW5Pizza` | Slice counter bare; deck oven is a gray box; drink fridge is a dark box; booth tables wear ABO drop-leaf | YES — Eddie/Kev, 11:00–23:00 |
| 5 | BAKERY-INT | SMB-01, x −37.8..−30.2, z −31.8..−20.2 | `buildW5Bakery` | Counter + case are slabs; oven is a gray box; racks are bare frames; two-tops wear ABO | YES — through the Marlow storefront door |
| 6 | RECORD-INT | SMB-02, x −27.8..−22.2, z −31.8..−20.2 | `buildW5Records` | Crate rows are bare boxes (no record spines); speakers are plain cabinets; listening corner + counter wear ABO | YES — the Week-3 "back soon" sign room |
| 7 | HALL-INT | KCM-01, x −59.8..−48.2, z 20.2..31.8 | `buildW5Hall` | Living half wears ABO (sofa/bookcase/lamp/ottoman…); folding-chair stacks, utility shelves, kitchenette are plain boxes | YES — both doors are open gaps |
| 8 | DINER-INT | SND-01, x 50.2..59.8, z −19.8..−8.2 | `buildW5Diner` | Stools + booth tables wear ABO; the 8 m cook line is one gray box; register/pie case is a slab | YES — corner diner, two doors |
| 9 | CECIL-ROOM | KTS-02, x 10.2..15.8, z −14.1..−9.1, y 8.35 | `buildW5CecilRoom` | Bed/dresser/nightstand/lamp/mirror/rug wear ABO; kitchenette/bath fixtures are boxes; no radiator, no clutter | YES — top fire-escape landing |

(SUB-01 platform and the arrival terminal are environment kits with their own
identity — in scope for a later pass; this batch covers the nine furnished rooms
and the store the story walks through every day.)

## Deficiency → asset map (what gets built, per interior)

**Bodega** — bare counter: `cash_register`, `coffee_machine`, `microwave_oven`; empty floor: `produce_crate`.
**Laundry** — gray dryers: `laundry_dryer`; floating tables: `laundry_table`; plain cart/bins/shelf: `laundry_cart`, `linen_bin`, `detergent_shelf`; bare east wall south of the dryers: `vending_machine`.
**Barber** — box chairs: `barber_chair`; bare counter: `barber_counter_unit` + `cash_register`.
**Pizza** — dark fridge box: `drink_cooler`; gray oven: `pizza_oven`; no prep zone: `pizza_prep_counter`; bare wall over the slice counter: `menu_board`.
**Bakery** — slab case: `bakery_display_case`; gray oven: `bakery_oven`; bare racks: `bread_rack`; empty rear wall: `bakery_back_shelf`.
**Records** — spine-less bins: `record_bin`; blank speakers: `record_speaker`; empty west wall: `record_wall_shelf`.
**Hall** — box chair stacks: `folding_chairs_stack`; slab kitchenette: `hall_kitchenette`; bare utility shelf: `hall_storage_shelf`.
**Diner** — gray cook line: `diner_kitchen_line`; slab register: `diner_register`; no coffee: `coffee_machine` (shared file).
**Cecil** — box kitchenette/toilet/sink: `cecil_kitchenette`, `apartment_toilet`, `apartment_sink`; no heat under the window: `apartment_radiator`.

32 sand3d programs total (2 shared across interiors). Every program: real-world
millimetre proportions, FIRST SLICE palette accents, flat unmetallic materials
(the vertex-fuse law — one draw call per prop), front documented in-world.

## Integration law

- The seam is the shipped `upgradePropWithGLB` one: placeholder fixture (correct
  footprint/height, casts/receives shadows) + `registerGlbProp` + GLB at
  `public/models/<id>.glb`. Missing/malformed file → the placeholder stays, one
  console line, nothing gameplay-bearing changes.
- Long wall units are authored in their final world orientation (no placeholder
  yaw) so the ±90 % footprint guard passes by construction; near-square machines
  use the shipped washer-slot pattern (group yaw ±π/2).
- New colliders only against walls/corners, never in a door zone, never on an
  NPC stand spot (Rosa/Deon/Eddie/Kev work spots keep their clear floor).
- Manifest: `web-three/src/world/interiorAssets.ts` (the furniture.ts grammar).
- Tests: `tests/interior-assets.test.ts` pins manifest ↔ files ↔ programs.
- Evidence: gameplay screenshots per interior in `web-three/shots/interiors/`,
  mirrored into `docs/production/interiors/evidence/`.
