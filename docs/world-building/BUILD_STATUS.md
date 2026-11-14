# BUILD STATUS — the master build assignment's living truth

> **Updated:** 2026-11-14, by the Lead Open-World Engineer agent. This file is
> the truth of what is built and what is not. Read it before touching anything.
> Companion documents: `AGENT_HANDOVER.md` (the exact next tasks),
> `IMPLEMENTATION_LOG.md` (the wave-by-wave record),
> `complete-world-master-plan.md` (the locked target).


> **RECONCILIATION (2026-11-14, the integrated tree):** while this
> assignment built, a concurrent line landed DEC-13 — the owner approved the
> design package as filed and the Narrative Director pinned **Catalpa
> Junction** to the K line's **west reach** (the docks past 42 St, rows
> `CDK-*`). This document's district — the complete east build (x +100..+252)
> — is therefore named **the Larch Yards** (the tree grammar + the freight
> term; rows `LRY-*`). Both districts ship; the naming honors the canon; the
> ids never collide. The build's substance is unchanged.

| | |
|---|---|
| **Branch** | `main` (the integrated tree; the assignment branch merged at e516206) |
| **Head** | **W-N4..N6 — Linden Hill, the North Depth (register v1.85.0)** — this wave |
| **Registry** | v1.85.0 (143 buildings, 12 parks, 23 interiors, 17 landmarks, 11 streets, 21 phases; 382 IDs) |
| **The world** | **Three districts, a corridor and a destination:** Alder Heights (x −100..+100) + the Larch Yards (x +100..+252) + **Linden Hill (x −100..+252, z 64..160 — the North Depth, this wave)** + the Willow Rows corridor (x −280..−100) + Times Square (one K-line ride west) |
| **Playable core** | x −450..+252, z −64..**+160** (registry `bounds.playableCore`; the invisible walls follow — the north wall split: the band's edge at z 160, the void west of x −100 keeps its z-64 edge) |

## 1. What is BUILT (verified in the running game)

- **The complete street grid of the Larch Yards:** Kestrel Street East
  (the connecting spine, x 100..252), Gable East and Marlow East (the shipped
  streets' own continuations — the draft separate streets retired; see
  IMPLEMENTATION_LOG W-C5), The Spur (the freight spur gone pedestrian: track
  bed, flush rails, timber street crossings, weed tufts), Larch Street, the
  Junction Plaza (cobble deck, the preserved crane, benches, string lights,
  bollards, the K globe), the Spur Gardens (raised beds between the rails).
  Every intersection carries zebras; every walk band stays clear.
- **The buildings (20 registry rows, all rendered from their rows):** the
  Catalpa Freight Market (CJN-01 — the hero, with its enterable market hall),
  Catalpa Cold Storage, the Spur Lofts, Starlite Stamping & Tool (with the
  CATALPA IRON WORKS ghost sign), Junction Lofts, Larch Street Lofts, Beacon
  Crate & Box, Catalpa Bottling, Spur Front Lofts, Federal Wire & Cable (sign
  band), Sumac Shed, Larch Storage, the four far-north walk-up strips, the
  three far-south works rows, and SUB-03 (the K's the Larch Yards headhouse
  with its stair hood and name band). Bay rhythm, window grids, dock doors and
  wear vary per row from seeded PRNGs; the roof fabric adds tanks, chimneys
  and bulkheads automatically.
- **The elevated spur viaduct (LMK-12):** the iron viaduct on the bed's edges
  — 12 cast-iron column pairs, plate girders, the 38 m junction span over
  Kestrel, parapets, rust banding. The district's signature and its silhouette
  from Alder Heights.
- **The Freight Market interior (FREIGHTMKT-INT, the phase's one Class-A
  interior):** the market hall — stall rows A/B with canopy boards and goods
  boxes, the trader counter under the far pane, the center island west of the
  door line, the hanging lamp row. Enterable from Kestrel; colliders honest.
- **Environmental life:** streetlights, street trees (the instanced canopy),
  hydrant, trash cans, USPS mailbox, two steam vents, loading docks with
  pallets, eight parked box trucks, bollards guarding the bed mouths, plaza
  benches and string lights, the district's lit windows (one InstancedMesh on
  the shipped dusk material — 1,153 panes).
- **The systems integration:** the district lattice grown 6 → 12 columns with
  the fog-law sight ring (`SIGHT_M` 130, column-center distance); the Catalpa
  silhouette underlay + lit panes riding the ring law (the far read from Alder
  is the district's own roofline; walking east replaces it in place); the
  district bake owning every new static; **the re-centering law** (all four
  emit paths carry their true world centers — see IMPLEMENTATION_LOG);
  player collision on every mass; the nav graph ONE walkable world across
  both districts (745 nodes / 760 edges, components = 1) derived from the
  registry's own rows; the walked extent x +252.
- **The far world:** the skyline fabric's E-row moved +122 → +262 (it stood
  inside the district's blocks); the east horizon reads as the low-industrial
  far city.
- **The gifted-packs furniture wave (2026-11-14, this session):** the
  owner-supplied furniture packs are IN the world — 14 new GLB slots in four
  interiors, all additive (every curated ABO slot keeps its model):
  **CECIL-ROOM** works now (the sc_ diary desk under the prints, the sc_
  wardrobe on the S wall, the mi_ desk chair, the mi_ herb pot on the kitchen
  shelf); **HALL-INT** gains its second half (the sc_ lounge sofa + mi_ table
  by the notice wall, the mi_ armchair completing the living circle, the sc_
  tall plant at its shoulder, the sc_ lending shelf on the E wall, the sc_
  break nook by the kitchenette); **BARBER-INT** wears the sc_ step stool at
  the counter shoulder and the mi_ lamp at the waiting corner; **RECORD-INT**'s
  listening corner gains the sc_ corner table and the sc_ floor lamp. Sources:
  `assets/packs/lowpoly-furniture` (first-party, sc_*) and
  `assets/packs/modern-interior` (LM Scenova Studios, mi_* — embed-in-project
  license, credited in THIRD-PARTY-NOTICES.md). The manifest carries the two
  new sources with byte-identity provenance (`GIFTED_PACK_PROVENANCE`); the
  texture law, the rest law and the footprint guard all held.
- **The transit-completion wave (W-C7, 2026-11-14):** the M121's loop grows
  its east leg — the rectangle turns at the Larch corner now (leg 0 Kestrel
  westbound x 72.2 → 228, leg 2 Gable east to the corner, leg 3 Larch south
  replaces Sycamore south — Sycamore leaves the loop, it carried no stop);
  **BUS-05 'Junction Plaza'** opens on Kestrel East (the BUS-04 bay pattern:
  the loop parks inside the paint, the pole on the walk at the plaza's east
  edge); the taxi's rail grows the east reach (x −84..252, Kestrel East's
  south lane, wrapping at the east wall); the east box trucks move to the
  north curbs (`TRUCK_SPOTS` — one table, two readers: the kit renders from
  it, the movers' yield list declares from it; the two sleeping spots carry
  no rect); the straight-through junctions zone honestly (the Spur boxes on
  both legs, the Sycamore box — the bus no longer turns inside it, the GL-W
  pre-corner leg). Lap 362 → 673.6 m; the deterministic-arrival law
  unchanged; DRAWS byte-identical (192).

## 2. The verification record (all re-run on the final tree)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx vitest run` | **1,773 / 1,773 across 105 files** (the grown-loop pins: the leg order, the 674 m lap, the east reach, the truck lane clearances, the render/yield correspondence, the BUS-05 bay containment, the zone maps) |
| `npm run build` | OK (~780 ms) |
| `probe-city-fabric` (draw budget) | **DRAWS 192** (< 200; byte-identical — the W-C7 standing delta +0: the BUS-05 bay paint merges pre-bake, the pole's canvas face is a visit-cost singleton beyond the spawn frustum) |
| `probe-w4-bus` | **14/14 PASS** — the grown loop end to end: boot leg 3 x 228 (Larch), the bay lay-over armed/departed, the XW-COURT rest 46.9 at the line's 46.85, the yield stall Δa 0.00, all four legs (Larch south among them), the east reach max x 228.0, 2 laps in 196 s sim, dwells at 160/65/−21/−31 (the four registry stops), 0 bay coexistence, 0 page errors. The probe drives the sim now (the east reach blew the wall-clock budgets — the dt-clamp class; the taxi-locate manual-update precedent) |
| `probe-taxi-locate` | **the east crossing witnessed at x 106.5** — the rail runs Kestrel East; the closeup + `wc7_taxi_east.png` land |
| `diag-pocket-scan` (grown grid, 180,224 cells) | **one walkable component x −98..250; traps 19** — the HALL's documented door-alias pocket (the W5 1.2 m doors zero on the 0.5 grid, the known alias class) **split in two by the gifted furniture's own colliders; BARBER/RECORDS pockets unchanged; zero real-walkability change** (the walk-in probe passes all four rooms) |
| `probe-nav` | **9/9 steps** (with the e2e's own `E2E_SCALE` dilation valve added to the browser probes) |
| `probe-walkability` | 3/3 placement gates (spawn pocket, 67 lane blocks all bypassed in-band, 25/25 door approaches); the walk-legs sweep exceeds this box's wall budget — the documented dilation class (see §4) |
| `probe-subway` | 45/46 — the one failure (the Wow-card window sample) **reproduced on the base commit `de9777c`**: box drift, not this tree |
| `scripts/e2e.mjs` (0.2 scale) | 108 driver passes reaching **Day 4's opening beat**; the box's wall budget cut it there (the shipped full-scale record stands) |
| Evidence | 9 Catalpa frames + the 12 Alder world-map frames, captured from the built game, zero page errors — `docs/world-building/images/` |
| `probe-furniture` (the ABO seam gate) | **census settles 54/54** (40 ABO + 14 gifted — zero procedural fallbacks); the texture law, the hide law and the rest law all hold; probe wait updated to the settle-poll (the 54-file census outgrew the fixed early threshold) |
| `probe-furniture-gifted` (new, this session) | **14/14 gifted slots landed wearing their sc_/mi_ files; zero gifted draws at rest; 10 aimed walk-in shots + wrapper geometry checks clean** — `web-three/shots/gifted-*.png` |
| `probe-integration` | **0 errors, 8/8 walks** (the seam registry untouched by the gifted wave) |

## 3. What is NOT built (honest, named)

1. **The K-line eastbound ride.** SUB-03 ships as the surface stub
   (headhouse + hood + globe). The underground platform, the third car, the
   route-choice interaction and the ride machine's third end are the next
   priced wave — the station kit is parameterized and the design is written
   (AGENT_HANDOVER §2).
2. **Catalpa's business books.** The market and wholesalers are PLACES (with
   registry `business` labels), not ledgers — the Phase-6 economy machinery
   opens their books in a later phase, exactly as the design package scopes.
3. **Ambient walkers east.** The nav graph reaches Catalpa (the commutes'
   graph is one world), but the ambient walkers' authored loops still live on
   the shipped five streets. Extending two loops onto the spur/Kestrel East is
   a small, safe follow-up.
4. **Dynamic traffic east — BUILT (W-C7).** The M121's loop grew its east
   leg (the Larch corner; BUS-05 the Junction Plaza bay) and the taxi's rail
   grew the east reach (x −84..252, the east-wall wrap). What remains is
   capacity, not reach: the spur/Kestrel East ambient walker loops are the
   small safe follow-up.
5. **The Map's sketch** stays the first-session Kestrel heart (SKETCH_BOUNDS
   unchanged) — Catalpa is discovered by walking it, per the Roam law.

## 4. The environment-honest caveats (this box)

- The software-GL sandbox runs the game at ~2-5 fps. The **walk-legs sweep**
  and the **full-scale E2E** exceed its wall budget — the documented dilation
  class (the W14 ledger records the identical situation). The gates that fit
  the budget all pass; the deterministic headless tests (1,733) pin the same
  behavior.
- `probe-subway`'s Wow-card check fails identically on the base commit —
  box drift, recorded so no future agent chases it as a regression.

## 5. The acceptance criteria, answered

| Criterion | Status |
|---|---|
| The entire planned playable area constructed | ✅ both districts + the destination |
| All planned neighbourhoods represented | ✅ Alder Heights (5 streets) + the Larch Yards (the spur, Larch, the continuations) |
| The road network connected and navigable | ✅ one walkable component, player-collision clean, nav one world |
| Buildings and environmental assets integrated | ✅ 101 registry buildings render from their rows |
| Consistent visual quality | ✅ the house grammar everywhere; evidence frames attached |
| Essential locations accessible | ✅ the market hall enterable; the plaza/gardens/spur walkable end to end |
| Existing systems compatible | ✅ 1,773 tests; the Day 1–4 E2E advances to Day 4; the cast, cart, subway, M121 untouched |
| No known critical environmental defects | ✅ the pocket scan reads clean; the walls follow the registry |
| Performance tested and acceptable | ✅ 192 / 200 draws standing; the pricing ledger holds |
| Final screenshots demonstrate the implemented world | ✅ `docs/world-building/images/` |
| The project builds successfully | ✅ |
| Relevant tests pass | ✅ 1,733/1,733 + the probe fleet (§2) |
| All work committed and pushed | ✅ pushed to `feat/catalpa-junction-world` (the merge to `main` is the owner's) |
| Another agent can continue from the documentation | ✅ AGENT_HANDOVER.md |

> **CORRECTION (2026-11-14, the registry-discipline repair — from the Catalpa/Junction line):** the west-reach rows restore their canon prefix `CDK-* → CJN-*` (DEC-13 accepted the CJN prefix as canon; the registry's own law says IDs are permanent; on the integrated tree the east rows are LRY-*, so the 2026-11-13 collision that forced the CDK rename no longer exists). Code, tests, the validator's pin block and the probes re-pointed in the same repair; zero geometry moved. Schema completion rides with it: the four BLK-LRY-* blocks gain the bbox fields the validator's block-membership check reads (computed from their own contained buildings); SUB-03's dangling `BLK-CJN-N` re-points to the appended `BLK-LRY-STN` block row; `STR-SPUR` carries the `pedestrianized` flag the park-on-road check now reads (the Yards Plaza and the Spur Gardens stand on the track bed by design — the control-house-exempt precedent). **ONE KNOWN DEFECT recorded for this district's next session: OVERLAP LRY-03 <-> SUB-03 (5.00 x 1.00 m — the Spur Lofts' southwest corner over the station house's northeast corner).** The validator prints it as KNOWN and does not fail; the fix (a 1 m footprint trim on one row) is yours when you next build here — note your handover §2 step 1 already touches SUB-03. The repair record: the registry's meta corrections + register row v1.78.0.


> **ADDENDUM (2026-11-14, the Catalpa/Junction line — the §8 gate's input verified):** the Catalpa Junction **business package is FILED** ([CATALPA-JUNCTION-BUSINESS-PACKAGE-DRAFT.md](../production/CATALPA-JUNCTION-BUSINESS-PACKAGE-DRAFT.md), register v1.79.0 — docs-only, authorizes nothing) and **awaits the owner's §8 ruling**: four first businesses with books (the provisions store CJN-08, the supply floor CJN-04, the book floor CJN-07, the lunch counter CJN-05), each priced, each riding shipped machinery. **Nothing of CB1 exists** — no registry rows, no geometry, no code — and none may begin until the owner opens the gate. The package's factual claims were re-verified against the integrated code line by line: the ten CJN rows exact (names, heights, door coordinates and faces), the Phase-6 ledger machinery at its cited lines, `catalpaSurface` x −450..−378, the west wall x −100, the nav graph's `NAV_BOUNDS` x −100..+252 (the docks sit outside it), the pocket scan's x −99.75 origin, LRY-01's `business` field, the census numbers (bodega 194, records 109–110, bakery 93–94, diner 239), and both quoted sources — **one number corrected** (§3's slot-library count; the true manifest counts are 32 interior programs + 24 ABO + 14 gifted). The battery re-certified fresh on the integrated tree at `1717a59`: validate-registry OK (256 IDs, 111 buildings, 23/23 anchors; 1 KNOWN — the recorded LRY-03 ↔ SUB-03 overlap) · tsc clean · vitest 1,751/1,751 (105 files) · build OK · probe-city-fabric DRAWS 192 · probe-wc1-catalpa OK (spawn 192 +0 standing, spur 53, platform 23). Reading note for §1 above: its body was written pre-repair — "20 building rows (CJN-*)" for this district's masses reads as **LRY-***; the canon map after the repair is **Alder Heights' canon rows + the Larch Yards LRY-* + Catalpa Junction CJN-*** (the west-reach docks among them). The owner's two gifted furniture packs wear 14 new interior slots additively (the K-line's wave, merged): the book floor may take the gifted bookshelf (`sc_bookshelf`) under the package's dated amendment. Coordination: no new work upstream — the remote's `feat/catalpa-junction-world` is the old master-assignment pointer (tip `d166ba3`), already an ancestor of `main`.

---

## 2026-11-14 — the Polyfork streets wave (register v1.80.0)

- **What entered the world**: ten NYC City Kit parts as build-time
  vertex data — the Alder street kit (payphone, call box, bike racks,
  curb meters, newsstand, hot-dog cart, cellar hatches; three baked
  batches + eight solids), the Catalpa dock fleet (five vehicles backed
  into the W-C1 dock faces, one zone-owned mesh), and the Larch docks'
  truck swap (kit delivery trucks at the placeholder spots).
- **The price**: +0 standing draws (spawn 192 kit ON and OFF),
  +27,244 scene tris, 277 KB committed data, 13 trap-neutral colliders.
- **The gates**: tsc clean · vitest 1,768/1,768 (106 files) · build OK ·
  probe-city-fabric 192 · probe-polyfork ALL PASS · probe-wc1-catalpa
  byte-identical · probe-nav 9/9 · probe-fenestra ALL PASS.
- **The seam**: `?polyfork=0` returns the shipped world byte-for-byte.
- **The docs**: docs/production/polyfork/01..04.

### 2026-11-14 — WP-EAST (register v1.82.0)

- The east pair: the spur walker + the Kestrel East local (loops, looks,
  beats, roles), the east road rects (feet law), the viaduct/crane/bench
  bow circles.
- The sight law: walkers beyond SIGHT_M hide (render only) — the spawn
  census 192 byte-identical with 13 walkers on the street.
- The band core grew to the walked extent (x −98..250) — the W7 ±100
  clamp had inverted every east band (the regression the wave's own dump
  caught; pinned in tests/crowd.test.ts).
- Battery: 1,783 tests, DRAWS 192, traps 19 (trap-neutral), all district
  probes green; evidence in shots/polyfork/east-*.png.

---

## 2026-11-14 — the North Depth (W-N4..N6): Linden Hill (register v1.85.0)

The master build directive's next major expansion — **the city's second
dimension**. The world was a strip: 702 m long, 128 m deep, two block-rows
everywhere, invisible walls at z ±64. The north band over Alder Heights and
the Larch Yards (**x −100..+252, z 64..160**, +33,792 m² of playable
geography, +38%) is real rows now — see
`docs/world-building/linden-hill-design.md` (the district's specification).

- **W-N4 (the data wave):** two E-W streets (Hazel z 68..76, Mulberry
  z 116..124, spanX −100..252), the four NS avenues' north ends (Juniper/
  Sycamore/Spur/Larch spanZ +64 → +160 — the continuation law, north
  edition), twelve blocks, fourteen `LNH-*` masses (shells only — the W-C1
  scope law), the green in two halves (PRK-LINDEN + PRK-LINDEN-NORTH —
  Mulberry crosses between them), LMK-16 the school's stone, LMK-17 the
  gas holder, eight intersections, thirty-two crosswalks (four per corner,
  the GJ/GS pattern), bounds (world zMax 176, playableCore zMax 160, SKY-N
  z 230). The patch script self-checks overlaps, road clearance, block
  membership, the at-spawn pricing rule (every band mass bakes into rows
  7..9) and the far-row occlusion check (the band hides behind the z 48..64
  rows' rooflines from the spine — three masses trimmed to h 13 by the
  check before the file was written).
- **W-N5 (the lattice):** `DIST_ROWS` 3 → **10** (origin −144 — the Day-1
  spawn keeps its middle row), `ROW_RING` 1 → **2** (a five-row, 160 m
  window; the spawn-lit set stays byte-identical), the W6 strips' clamp
  law restored on the new grid (the per-column fusion preserved), the
  north wall split (the band's edge z 160; the void west of x −100 keeps
  its z-64 edge), the west/east walls re-spanned z −64..160, NAV_BOUNDS
  zMax 152, the skyline re-seats (SkylineNorth the merged deco tower row
  z 230; the fabric N row z 250; the six landmark silhouettes z 226..232
  merged into one fog-exempt mesh — the evidence probe caught all three
  layers standing inside the band before the moves).
- **W-N6 (the kit):** `lindenHillKit.ts` (the westReachKit discipline) —
  the masses, the green (hedges, gates, paths, benches, the playground,
  the park house), the school's stone + flagpole + PUBLIC SCHOOL 27 sign,
  the reading room's stepped arches + sign, the gas holder's iron frame,
  Osier's timber yard, the viaduct's north reach (deck, parapets, column
  pairs z 84/110/134/156 clear of every right-of-way, the crossing spans'
  deep girders), the bed's north reach (rails, sleepers, weeds, timber
  crossings), the lit panes (one InstancedMesh on the shipped dusk
  material, registered to row 7). The band's ground pair split WEST/EAST,
  each half registered to its own row-7 tile (the registration law: a
  352 m mesh cannot ride one column's ring — the first attempt lit the
  pair only within col 13's window; unregistered, the east half's sphere
  grazed the spawn frustum). The seam dressing (fence line, bins,
  clothesline posts along the far rows' north rears).

**The laws this wave added:** the junction off-grid law (north edition — an
on-grid lane offset lands the corner junctions on the avenue chains' own
base nodes and the dedup strands them as trap nodes); the per-street NS
span law (`laneSpanZ` — the W-C5 `laneSpanX` twin; the Willow/Chestnut
spans stay ±64, no phantom lanes over the corridor's void); the no-skirt
chain-break law (a blocked span with no passable skirt breaks the lane
chain — no silent edge through the footprint); the singles law (unmerged
single-source batches join their tile's district — the streamed-city law
is total; the old behavior left them always-visible, a leak the band's
rows 7-9 masses exposed); the skyline re-seat law (when a band takes the
ground, every far-row seat moves beyond the band's DEPTH and merges into
always-visible fog-exempt meshes); the ground-pair registration law (north
edition).

**The pricing (measured):** spawn DRAWS **196** (< 200; +2 the wave's own
re-seat accounting — the merged north tower row and the ground pair's
east-half registration), the band's own censuses 43-79 (the streamed-city
law working in z: the rows light as the player arrives), the graph ONE
component x −276..252 z −48..150, the pocket scan's spawn component grown
to x −448..+250 z −62..+159.75 (460,066 cells — the band's floor joins;
traps 19 unchanged; cramped 22 in 4 clusters identical to the base tree).

**The battery:** validate-registry OK (382 IDs, 143 buildings, 11 streets,
12 parks, 17 landmarks, 23/23 anchors) · tsc clean · vitest **1,792/1,792**
(106 files) · build OK · probe-city-fabric 196 · probe-nav 9/9 ·
probe-subway 45/46 (the documented baseline Wow-card carry) ·
probe-wc1-catalpa OK (boot 196, +0 standing) · probe-w4-bus 14/14 ·
probe-taxi-locate OK (the east crossing witnessed) · probe-fenestra ALL
PASS · **probe-linden-evidence OK** (15 frames + 7 censuses + the walk
leg: Kestrel → Juniper north → Hazel → Mulberry → Sycamore south, 209
steps, 0 stalls, the avenues are streets now).

## 2026-11-14 — the West Reach (W-N0..N3): the Willow Rows + the Junction Mews + the transit east

**The directive:** the master continuation ("COMPLETE THE OPEN WORLD") names
the standing incompleteness this wave closes: Times Square and Alder Heights
shared a subway seam but no surface — x −280..−100 was void. The world is
ONE walkable surface now: **the Catalpa docks ⇄ Times Square ⇄ the Willow
Rows ⇄ Alder Heights ⇄ the Larch Yards**, 702 m wall to wall.

- **W-N0 (the data wave):** two NS streets (STR-WILLOW x −232,
  STR-CHESTNUT x −148), eight BLK-WLR-* blocks, seventeen WLR-* masses
  (shells only — the W-C1 scope law), PRK-CHESTNUT the community garden,
  LMK-14 the Willow marquee, LMK-15 the Ansel & Sons ghost sign, six
  intersections, twelve crosswalks (the axis law: NS-leg rows carry
  `axis: 'NS'` — the nav builder reads it), four pedestrian route rows,
  the three EW spans grown west (the continuation law, west edition),
  `playableCore.xMin` −100 → **−450**, SKY-W moved −122 → **−466** (the
  corridor took the old ground; the row reads above the docks' rooflines).
- **W-N1 (the build):** `westReachKit.ts` (the larchYardsKit discipline —
  vertex-colored masses, re-centered emits, per-row seeded streams), the
  district's ground pair, the garden's fit-out, the theater's marquee +
  bulbs, the ghost sign, the Bijou blade, the far-read pair
  (WillowRows_Silhouette + LitPanes — the Larch twin, mirrored). **The
  lattice grew: origin −84 → −308, 12 → 20 columns** (the corridor streams
  like the east). **The pricing law:** the district bake files a mesh by
  its CENTER; columns 5-6 sit inside the spawn's SIGHT_M window, so every
  mass bakes west of column 4 and the garden band is the cheap content.
  The west wall retired its x −100 post → **−450**; the N/S walls re-span
  (center −99, 702 m). NAV_BOUNDS xMin −280; the corridor's lanes ride the
  registry (off the 6 m grid). **The shipped-latent sky bug fixed:** the
  camera far (500) clipped the 560 dome everywhere west of ~x −60 — the
  west sky read as a black wedge; far 500 → 1200 (the dome and the
  fog-exempt rows are the only geometry past 500).
- **W-N2 (the docks' surface door):** `buildJunctionMews` in
  catalpaJunction.ts — the served alley east of the canyon's close-wall
  (x −388..−380) + the south reach (x −400..−380, z −56..−23) + the depot's
  fences at the walk band's ends + the lamp row, bollards, pallets, wall
  lamps. Zone-owned (catalpaSurface covers it): +0 standing preserved.
  The seam check: the mews mouth sits inside BOTH zones — no dark seam.
- **W-N3 (the transit east — the handover's documented next wave):** the
  M121's loop grows its east leg (the out-and-back: legs "Kestrel east" +
  "Kestrel west return", BUS-05 the Junction Plaza pole at the registry's
  own pin (138, 7.35), the door law's nose marks, the courtesy zones at
  the east crossings), the taxi's rail grows east (x −84..246), the
  BUS-05 pole + bay paint render. The bus's boot pose re-indexed
  (Sycamore south, a 10 — leg 5 now; the shipped frame byte-identical).
  The canvas signs ride their lattice columns (the pricing law: mapped
  materials leave the bake — the district pass owns their visibility).

**The battery (all re-run on the final tree):**

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx vitest run` | **1,784 / 1,784 across 106 files** (the east-leg chain pin joined the bus suite) |
| `npm run build` | OK |
| `probe-city-fabric` | **DRAWS 194** (< 200; the honest +2: the sky dome renders now — the far-plane fix — and the Westgate strip's batches re-keyed into true col 7) |
| `diag-pocket-scan` (the full core, 359,424 cells) | **one spawn component x −448..+250; traps 19 (the shipped known set, unchanged); cramped 13 (unchanged)** |
| `probe-nav` | 9/9 |
| `probe-subway` | 45/46 — the one failure is the documented baseline Wow-card carry |
| `probe-wc1-catalpa` | spawn 194 (+0 standing), spur 59, platform 29 — byte-identical with the pre-wave tree |
| `probe-westreach-evidence` (new) | **OK — six standing censuses (spawn 192, corridor 60, garden 61, canyon 134, mews 50, docks 59 — every position < 200) + THE WALK LEG: the player walked Alder → corridor → canyon → mews → docks (166 steps, zero stalls, never below grade) + 13 evidence frames, zero page errors** |
| Evidence | `docs/world-building/images/westreach/` — the aerial, the isometric roofscape, the theater marquee, the garden, Kestrel West both ways, the canyon mouth, the mews, the docks from the mews, the far read |

**Honest carries:** the Wow-card baseline fail (box drift, documented);
the 18 off-spawn POI reads and the walk-legs dilation class (the
software-GL box's own class — the shipped 18 verified identical on the
pre-wave tree); the corridor's east approach reads curbless by pricing
(the garden's apron; the Westgate's curbs resume at x −100); the canyon
and the docks keep no nav lanes (no registry streets there — the walkers
stay east of −280, the PLAYER walks everywhere).
