# The Polyfork Streets Wave — 02: selection and evaluation

> The directive's own gates: "Inspect the existing game world before
> selecting assets… Do not blindly import the entire catalogue… Reuse
> existing game assets whenever they are already suitable." This is the
> audit trail: the 82-part inventory, what was selected, what was
> rejected, and the reasons.

## 1. The method

1. **The world audit first** (the directive's step 1): the shipped
   streets already carry — via `props.ts`, `streetAssets.ts`, `nycKit.ts`
   (the slop-newyork port), `cityFabric.ts` and the district kits —
   trees + tree pits, benches, streetlights, trash cans + recycle bins,
   hydrants, the subway entrance, bulletin boards, bus stops,
   newspaper boxes, barriers, AC units, brownstone stoops, storefronts,
   vendor carts, control house, pergola, garden beds, utility poles +
   span wires, traffic signals, fire-escape dressing, water tanks,
   chimneys, bulkheads, HVAC chillers, cornices, awnings, the ConEd
   steam vent, the USPS relay box, manholes + storm drains (ground
   furniture), parked box trucks (the Larch docks), and a cab + sedan +
   arrival bus fleet. **The gaps were: sidewalk infrastructure (meters,
   payphones, call boxes, racks, hatches, newsstands, food carts), dock
   vehicles with real silhouettes, and the Catalpa docks' total
   emptiness of vehicles.**
2. **The kit inventory** (all 82 parts read from the API): 20 buildings,
   10 characters, ~40 street props, 8 vehicles, 4 ground tiles — every
   candidate's triangles, real-world `size_m`, palette, `has_night`.
3. **The GLB-level inspection** (16 candidates downloaded and parsed):
   face-split meshes, sequential indices, flat per-face `COLOR_0`
   (linear), no textures — the exact shape the world's vertex-color
   bake wants.

## 2. SELECTED — ten parts (the table lives in the pack's ATTRIBUTION.md)

| Part | Where | Why it earns a slot |
|---|---|---|
| Parking Meter ×4 | Alder S curb line | The avenue had NO parking furniture; the kit's meter is 386 tris at true 1.3 m scale |
| Payphone Stand | Alder N building line | The missing NYC sidewalk archetype; hooded alcove reads at a glance |
| Fire-Alarm Call Box | Alder N east end | The block's emergency furniture was absent; closes the furniture row |
| Bike Rack ×3 | Alder N + S + the Junction Plaza | Open-frame, porous (no collider), the genuine article at 480 tris |
| Newsstand | Alder S shops' line | The MTA-green kiosk with magazine racks — a landmark-class prop |
| Hot-Dog Cart | Alder S building line | Distinct from the shipped vendor cart (umbrella cart vs coffee cart) |
| Cellar Hatch ×2 | Alder pavement | Flush sidewalk furniture the world lacked; sunk 6 cm to read 8 cm proud |
| Delivery Truck | the Larch docks swap + 2 Catalpa docks | Replaces the procedural box-truck PLACEHOLDER at the same spots (the directive's "replace appropriate placeholders") |
| Garbage Truck | Catalpa spur SE edge | The docks' municipal life; 8 m at true scale |
| Food Truck | Catalpa headhouse walk | The station's lunch trade — the docks' one amenity |

## 3. REJECTED — with reasons (the audit's honest half)

- **street-tree-0d33f3** — the shipped `makeTree` owns the block's trees
  (species reads, autumn set, tree pits, canopy instancing). Reuse law.
- **manhole-cover-137569** — `makeManhole`/`makeStormDrain` ship (and
  the kit's version carried animated steam puffs this wave would freeze).
- **yellow-cab-8df4a0** — the shipped cab fleet exists (`car_taxi.glb`,
  the traffic brain, the cab's own physics interplay). Reuse law.
- **police-cruiser-a2d25e, fire-engine-7d476b, city-bus-49fd97,
  compact-hatchback-386417, town-car-56eeb6** — no owner lane: the
  traffic fleet is a closed system (the M121/taxi routes east are a
  documented separate wave), the arrival bus ships, and emergency
  vehicles without gameplay read as set dressing the streets don't need
  (the anti-slop gate's "randomly scattered objects").
- **the 20 kit BUILDINGS** — importing masses would bypass the registry
  (the A-3 law), the canvas facade craft, the collision/validator
  pipeline, and the palette law in one stroke. The world builds
  buildings the world's way.
- **the 10 kit CHARACTERS** — the simulation boundary: characters are
  the sim's domain (out of scope by the mission's own constraint), and
  GLB people beside the shipped personRig casts would split the
  pedestrian look.
- **scaffolding-section, construction-dumpster, hoarding, barricade,
  curb-strip, doorman-canopy, area-railing, projecting-shop-sign,
  globe-lamp, theatre-vertical-sign, painted-wall-ad, rooftop-billboard,
  water-tower, roof-bulkhead, rooftop-AC, fire-escape-section,
  steam-stack, traffic-light, wire/metal trash, bus shelter, awning,
  shop awning, plaza/sidewalk/street tiles, newspaper box, bollard** —
  the shipped kits already own every one of these classes (the audit's
  list above); the kit's versions were evaluated and passed over
  (reuse law). They stay in the catalogue for future districts that
  lack the class.

## 4. The evaluation that kept them honest

Every selected part was checked against the world before placement:
**scale** (real meters — the cab-length truck backs into a registry
dock face with centimeters to spare), **proportions** (the kit's
vehicles at 1.9-3.8 m wide sit on the shipped lanes), **materials**
(flat `COLOR_0` only — they ride the world's shared vertex-color
Lambert with zero new materials), **triangle counts** (386-2,566 per
part — the whole wave adds ~27k scene tris, less than one shipped
building row), and **the palette** (the kit's muted NYC tones vs the
Doc-04 anchors — adjacent, no new hue family). The `has_night` flags
(truck markers, the newsstand) are recorded in the data module for the
district lighting waves — not wired this wave (honest carry, 04).
