

> **RECONCILIATION (2026-11-14, the integrated tree):** while this
> assignment built, a concurrent line landed DEC-13 — the owner approved the
> design package as filed and the Narrative Director pinned **Catalpa
> Junction** to the K line's **west reach** (the docks past 42 St, rows
> `CDK-*`). This document's district — the complete east build (x +100..+252)
> — is therefore named **the Larch Yards** (the tree grammar + the freight
> term; rows `LRY-*`). Both districts ship; the naming honors the canon; the
> ids never collide. The build's substance is unchanged.
# IMPLEMENTATION LOG — the master build assignment, wave by wave

> The record of what was done, in order, with the numbers read from the
> project's own probes. Companion: `BUILD_STATUS.md` (the truth),
> `AGENT_HANDOVER.md` (the next tasks). The registry's `constructionPhases`
> rows W-C0..W-C5 carry the same waves from the data side.

---

## Session 0 — audit and verification (M0)

- Cloned at `de9777c` (main, registry v1.75.0-era). `npm install`; **tsc
  clean; vitest 1,733/1,733 (104 files); build OK**.
- Captured all 12 world-map evidence frames from the built game
  (`probe-world-map-evidence.mjs`): zero page errors, boot draws 193. The
  prior sessions' "the map is complete for the vertical slice" claim is
  **visually verified** — the audit reads the running game, not the docs.
- Read the whole governance stack: AGENTS.md (the Laws, the gates), the
  world contract, the DEC-12 borough ruling, the borough design package
  (the Larch Yards, priced), the five-reference study (doc 09), the W14
  handover. The master build assignment (2026-11-14) is the owner's fresh
  construction authorization that the design package's §8 gate asked for.
- Deliverables: `docs/world-building/current-world-audit.md` (M0),
  `reference-repository-analysis.md` (M1), `complete-world-master-plan.md`
  (M2 — the geography locked before construction).

## W-C0 — the data wave (commit `6ef88df`)

- Registry (append-only): bounds grown east (world +268, playableCore +252,
  SKY-E cards +262); Kestrel spanX → +252; streets STR-SPUR/STR-LARCH/
  STR-ROWAN/STR-SUMAC; 6 intersections + 6 crosswalks; 4 blocks; buildings
  CJN-01..19 + SUB-03 (planned); parks PRK-JUNCTION/PRK-SPURGARDEN
  (planned); landmarks LMK-10..13; npcZones NZ-CJN-*; 8 pedestrian routes;
  interior FREIGHTMKT-INT (planned); phase row W-C0.
- One shipped-law pin grew with the map (`neighborhood-fabric.test.ts`'s
  core-bounds bookkeeping — the wave it records).
- **Battery:** tsc clean · vitest 1,733/1,733.

## W-C1..W-C3 — the construction waves (commit `f917334`)

- **Foundation:** the paving as TWO merged mapped meshes
  (`World.groundMerged` — the +2-draw pricing law), the bed at walk level,
  curbs, yards (vc, bake-free), the plaza deck, zebras, streetlights, street
  trees, the plaza furniture + the K globe.
- **The kit** (`world/larchYardsKit.ts`, ~700 lines): the masses (per-row seeded
  bay/window/dock grammar — the Metropolis lot-band discipline on the house
  GeoPush law), the viaduct, the crane, the gardens, the trucks, the
  bollards, the ghost signs (through `World.signBoard`), the lit panes (one
  InstancedMesh on the shipped skyline material — the HK3 window discipline),
  the plaza lights.
- **The ring:** the district lattice 6 → 12 columns; the fog-law sight
  window (the gen-city-auto residency discipline adapted).
- **The forensic chain this wave earned (recorded so nobody re-pays it):**
  1. The aerial "black blob" — the ring's raw-metre window left c6 (the
     shipped district's own east strip) dark at boot (the spawn sits at
     x −30, col 1) → the column-distance law, tuned to cover the spawn.
  2. The masses filed into the ORIGIN's tile — the kit's GeoPush meshes
     carried world coords in geometry and (0,0,0) in translation; the bake
     files by translation → the re-centering law (kit emit).
  3. STILL misfiled — the two SHIPPED fabric passes had the same disease;
     their emits re-centered too (the law's real name: every emit path).
  4. STILL (0,0) at runtime — **the aliasing bug:** `translate()`
     recomputes the bounding sphere in place; the captured `center` alias
     read back (0,0,0). Copy the values first. Four emit paths fixed.
- **The skyline:** the fabric's E-row moved +122 → +262 (it stood inside the
  district's blocks — the registry's own W-C0 ruling led, the code followed).
- **The far read:** the Catalpa silhouette underlay + the lit panes ride the
  ring law (visible-from-Alder / visible-in-district, in place).
- **Statuses flipped:** CJN-01..19 + SUB-03 → built (W-C2); the parks →
  built (W-C3).
- **Battery:** tsc clean · vitest 1,733/1,733 · **DRAWS 192** · the evidence
  frames show the district rendering whole.

## W-C4 — the Freight Market (commit `3788097`, first half)

- The hall carve (the kit's hall-ground variant: four walls with the
  registry's own door gap, the floor, the ceiling + tower above) + the
  fit-out from the row's own plan list (stall rows, the counter, the island
  WEST of the door line, the far pane) + the lamp row (one emissive draw).
- **The mass colliders** (the wave's correctness fix): every kit mass pushes
  its registry footprint; the hall pushes its four walls + door gap — the
  capsule stops at Catalpa exactly as at Alder.
- FREIGHTMKT-INT → built (W-C4); phase row added.

## W-C5 — Catalpa is walked (commit `3788097`, second half)

- The nav builder: LANES for the spur's bed walks + Larch; NAV_BOUNDS →
  x +252; the EW spines walk each street's OWN spanX (`assembleLane` gains
  the span param — Rowan/Sumac spines had dragged to x −100.55); the
  junctions only where both lanes' spans actually reach; the blocked-span
  clipping to the lane's own extent.
- **The geometry amendment:** the draft STR-ROWAN/STR-SUMAC streets RETIRED —
  their corridors duplicated Gable's and Marlow's own (two parallel E-W
  streets 2 m apart). Gable and Marlow CONTINUE EAST (spanX +252) — the
  honest city geometry. All CJN cross-street geometry shifted to the true
  centerlines (z 40/−40); five footprints pulled clear of Larch's walk.
- **The nav forensics (each is a law in AGENT_HANDOVER §3):** junctions must
  sit off the 6 m grid on BOTH axes (a grid-multiple junction collides with
  the chain point — the corner never connects); road-mouth zebras sit at the
  gap landings (±0.5 — a center row's landings hang 6 m out, past the 4.5 m
  curb-apron law); duplicate rows at the same coordinates dedupe each other's
  endpoints into orphans.
- **The gates on the grown map:** vitest 1,733/1,733 · **probe-nav 9/9**
  (the E2E's own `E2E_SCALE` valve added to the browser probes — the
  documented machine-mercy pattern) · **the pocket scan on the grown grid:
  ONE walkable component x −98..250, traps 18 — unchanged** · **DRAWS 192** ·
  probe-subway 45/46 with the one failure REPRODUCED ON THE BASE COMMIT ·
  the E2E at 0.2 scale: 108 driver passes reaching Day 4's opening.
- The evidence set re-captured (9 Catalpa frames) and landed in
  `docs/world-building/images/`.

## The draw-budget ledger for the whole assignment

| Wave | Price | Law |
|---|---|---|
| Baseline (shipped) | 193 | probe-city-fabric |
| W-C1 paving merged | +0 net (2 draws for all Catalpa paving) | the two-draw ground law |
| W-C1..C3 district statics | +0 standing at spawn (the tiles sit beyond the sight window; the silhouette +1) | the fog-law ring |
| W-C2 masses/kit | inside the tiles (the bake owns them) | the VC law |
| W-C4 interior | +1 emissive (the lamps; the fit-out bakes) | priced in its phase row |
| **Final standing census** | **192** | **budget 200** |

## Session — the gifted furniture packs (2026-11-14)

- **The gift:** two owner-supplied furniture packs landed in upload: the
  warm-pastel Scandinavian starter set (10 GLB pieces, first-party, generated
  with headless Blender — `assets/packs/lowpoly-furniture/`, full pack with
  manifest + generator sources) and the Modern Interior Low-Poly FREE SAMPLE
  v1.0 by LM Scenova Studios (8 GLB pieces, embed-in-project license —
  `assets/packs/modern-interior/` carries the LICENSE.txt and only the five
  GLBs the game wears; the FBX/OBJ sources stay out per the no-redistribution
  term; credited in THIRD-PARTY-NOTICES.md).
- **The placement law decision:** ADDITIVE only. The ABO slots keep their
  curated models — pack-one files carry no texture maps, so the probe's
  texture law (bed/sofa/stool wrappers carry `mat.map`) forbids swaps, and
  the shipped room identities hold anyway. Every gifted piece whose
  corresponding place was FREE wears a NEW placeholder; the pieces whose
  place was already occupied (a second bed, a second three-seat sofa, the
  modular floor/wall kit) stay in the packs for future rooms — the ABO pack's
  own 141-model precedent.
- **The 14 slots** (manifest: `src/world/furniture.ts`, ids namespaced by
  source: `sc_` scandi, `mi_` modern-interior; provenance in the new
  `GIFTED_PACK_PROVENANCE`, byte-identity tested against the pack copies):
  CECIL `Cecil_Desk` + `Cecil_Wardrobe` (the S wall works now — the diary
  desk under the prints) + `Cecil_DeskChair` (the mi_ dining chair, rotated
  to face the desk) + `Cecil_HerbPot` (the mi_ pot on the kitchen shelf's
  top); HALL `Hall_LoungeSofa` (back to the notice wall) + `Hall_LoungeTable`
  (at the seat side — the yaw-review pass moved it from the first authoring
  spot behind the backrest) + `Hall_Armchair` (completing the living circle,
  facing the coffee table) + `Hall_Plant` (the circle's NW shoulder, no
  collider) + `Hall_LendShelf` (E wall south of the sofa) + `Hall_NookSet`
  (backs the E wall by the kitchenette, chair pulled out facing the table);
  BARBER `Barber_StepStool` (counter's south shoulder, solid) +
  `Barber_Lamp` (SW waiting corner, pole decor); RECORDS `Records_CornerTable`
  (the listening chair's shoulder, solid) + `Records_Lamp` (deep SW corner,
  pole decor). Colliders authored at the placeholders; Cecil's floor cushion
  moved off the S wall to the bed's foot corner (the desk + wardrobe own the
  wall now).
- **The verification chain built for the wave:** `probe-furniture-gifted.mjs`
  (census, rest law, 10 aimed walk-in shots, wrapper geometry), plus two
  review probes — `probe-furniture-gifted-iso.mjs` (the pause-pose-render
  isometric per room, ducks hidden per the cutaway law) and
  `probe-furniture-gifted-top.mjs` (the straight-down north-up renders). The
  iso/top-down passes caught and fixed the one authoring error (the lounge
  table's side) and verified every yaw against the anchor walls.
- **The battery (final tree):** tsc clean · **vitest 1,751/1,751 (105
  files)** — the furniture suite grew two provenance rows (source
  partition + gifted byte-identity) · build OK · DRAWS 192 (the gifted
  furniture draws only inside its rooms — zero at rest) · probe-furniture
  census settles **54/54** (zero procedural fallbacks; its wait updated to
  the settle-poll — the 54-file census outgrew the fixed 19-slot threshold,
  a probe-timing fix only) · probe-integration 0 errors 8/8 walks (the seam
  registry untouched) · probe-nav class unchanged · diag-pocket-scan: one
  component, **traps 19** — the HALL's documented door-alias pocket (the W5
  1.2 m doors zero on the 0.5 grid — the known alias class) split in two by
  the new furniture's colliders; BARBER/RECORDS pockets unchanged; zero
  real-walkability change (the walk-in probe passes all four rooms).

> **CORRECTION (2026-11-14, the registry-discipline repair — from the Catalpa/Junction line):** the west-reach rows restore their canon prefix `CDK-* → CJN-*` (DEC-13 accepted the CJN prefix as canon; the registry's own law says IDs are permanent; on the integrated tree the east rows are LRY-*, so the 2026-11-13 collision that forced the CDK rename no longer exists). Code, tests, the validator's pin block and the probes re-pointed in the same repair; zero geometry moved. Schema completion rides with it: the four BLK-LRY-* blocks gain the bbox fields the validator's block-membership check reads (computed from their own contained buildings); SUB-03's dangling `BLK-CJN-N` re-points to the appended `BLK-LRY-STN` block row; `STR-SPUR` carries the `pedestrianized` flag the park-on-road check now reads (the Yards Plaza and the Spur Gardens stand on the track bed by design — the control-house-exempt precedent). **ONE KNOWN DEFECT recorded for this district's next session: OVERLAP LRY-03 <-> SUB-03 (5.00 x 1.00 m — the Spur Lofts' southwest corner over the station house's northeast corner).** The validator prints it as KNOWN and does not fail; the fix (a 1 m footprint trim on one row) is yours when you next build here — note your handover §2 step 1 already touches SUB-03. The repair record: the registry's meta corrections + register row v1.78.0.

## W-C6 — the K line eastbound (the handover's exact next priced wave)

**Register v1.78.0.** The ride machine grew its route law (W/E — tests
first, 16 pins watched failing before implementation); the transfer car at
Alder Heights hangs both ride doors (the east door westbound, the west door
eastbound — 6.2 m apart inside one car, the bench split around both);
station C = the parameterized station translated to SUB-03's own axis (the
cx reads the row, the A-3 pin holds); the tunnel grew its east reach
(registry SUB-TRACK's span amendment); the surface opened SUB-03's housing
around the shaft (the SUB-01 law) and split the yard around the open cut's
L-shape (LRY-03's ground stays — the station's east half runs under the
loft). The nav learned that the underground is not a wall (footprintsOf
skips h-0 rows); the dollhouse learned to lift by identity (the shipped
two-boxFromCenter bug) and by name east of the river (LarchYards_Sub03
joins NAMED_SKIP). The registry repairs: SUB-03-PLAT appended (the SUB-TS
pattern), the four BLK-LRY-* bboxes, the dangling BLK-CJN-N claim nulled,
STR-SPUR's pedestrian flag, LMK-12's street anchor, the h-0 overlap
exemption.

Found and fixed on the way: the east walk slab roofed the shaft (the exit
walk oscillated at tread 4 — the diag's trace caught the limit cycle; the
W8 slot-split fixed it); the dollhouse lift never fired (two boxFromCenter
calls, the splice found nothing); the tile-batch fusion defeated the
by-reference hide.

**The battery:** validate-registry OK (257 IDs, 112 buildings, 23/23
anchors) · tsc clean · vitest 1,764/1,764 (105 files, the merged tree) · build OK ·
probe-subway the eastbound leg's 17 checks ALL PASS (the only FAIL is the
documented baseline Wow-card carry) · probe-wc1-catalpa OK (spawn 192 +0
standing) · probe-city-fabric DRAWS 192 · probe-w14 PASS ·
probe-interior-dressing PASS · probe-integration 0 errors 8/8 walks ·
probe-tss-road-clear LAW HOLDS · probe-nav 9/9 · diag-pocket-scan
deterministic (one component x −98..250, traps 18 unchanged, colliders
1018 → 1233 the honest +215 below grade).

> **ADDENDUM (2026-11-14, the Catalpa/Junction line — the §8 gate's input verified):** the Catalpa Junction **business package is FILED** ([CATALPA-JUNCTION-BUSINESS-PACKAGE-DRAFT.md](../production/CATALPA-JUNCTION-BUSINESS-PACKAGE-DRAFT.md), register v1.79.0 — docs-only, authorizes nothing) and **awaits the owner's §8 ruling**: four first businesses with books (the provisions store CJN-08, the supply floor CJN-04, the book floor CJN-07, the lunch counter CJN-05), each priced, each riding shipped machinery. **Nothing of CB1 exists** — no registry rows, no geometry, no code — and none may begin until the owner opens the gate. The package's factual claims were re-verified against the integrated code line by line: the ten CJN rows exact (names, heights, door coordinates and faces), the Phase-6 ledger machinery at its cited lines, `catalpaSurface` x −450..−378, the west wall x −100, the nav graph's `NAV_BOUNDS` x −100..+252 (the docks sit outside it), the pocket scan's x −99.75 origin, LRY-01's `business` field, the census numbers (bodega 194, records 109–110, bakery 93–94, diner 239), and both quoted sources — **one number corrected** (§3's slot-library count; the true manifest counts are 32 interior programs + 24 ABO + 14 gifted). The battery re-certified fresh on the integrated tree at `1717a59`: validate-registry OK (256 IDs, 111 buildings, 23/23 anchors; 1 KNOWN — the recorded LRY-03 ↔ SUB-03 overlap) · tsc clean · vitest 1,751/1,751 (105 files) · build OK · probe-city-fabric DRAWS 192 · probe-wc1-catalpa OK (spawn 192 +0 standing, spur 53, platform 23). Reading note for §1 above: its body was written pre-repair — "20 building rows (CJN-*)" for this district's masses reads as **LRY-***; the canon map after the repair is **Alder Heights' canon rows + the Larch Yards LRY-* + Catalpa Junction CJN-*** (the west-reach docks among them). The owner's two gifted furniture packs wear 14 new interior slots additively (the K-line's wave, merged): the book floor may take the gifted bookshelf (`sc_bookshelf`) under the package's dated amendment. Coordination: no new work upstream — the remote's `feat/catalpa-junction-world` is the old master-assignment pointer (tip `d166ba3`), already an ancestor of `main`.

---

## 2026-11-14 — the West Reach (W-N0..N3) — the corridor, the mews, the transit east

**The task:** the master continuation directive ("COMPLETE THE OPEN WORLD —
FULL GEOGRAPHICAL EXPANSION AND INTEGRATION"). The audit (M0) read the
integrated tree first: registry v1.82.0, draw census 192/200, the battery
1,783/1,783 — and named the standing incompleteness: Times Square and
Alder Heights shared a subway seam but no surface; the Catalpa docks were
zone-gated and walk-unreachable; the handover's next priced wave (the
transit east) was documented but unbuilt.

**How it built:**

1. **W-N0 (the data wave)** — `scripts/world_building/wn0_registry.py`
   (self-verifying: overlaps, NS-road clearance, block membership, and
   the bake-center pricing rule all check before the file writes; it
   refuses to double-apply). Two failed self-checks caught real design
   errors BEFORE the registry saw them (four masses baking into the
   spawn-lit column 5; one intersection row referencing a park as a
   corner building). One validator pass caught the intersection repair.
   The crosswalk axis law was learned the hard way: the first battery
   read the nav graph at NINE components — the NS-leg rows carried no
   `axis: 'NS'`, the crossing derivation bridged the wrong lanes, and
   the graph split at Willow and Chestnut. The fix rode the same patch
   script; the graph reads ONE component x −276..+252.
2. **W-N1 (the build)** — `westReachKit.ts` copies the larchYardsKit
   discipline (the re-centering law verbatim, GeoPush vertex colors, the
   per-row seeded streams); World.ts grows the lattice (20 columns,
   origin −308), re-spans the walls, builds the ground pair, the zebras,
   the furniture, the far-read pair. The first evidence frames caught
   TWO bugs the compile could never: the probe's screenshot raced the
   game's RAF (the frames captured the game camera mid-teleport — the
   "fog wash" and the black blob were the chase cam's own views), and
   **the sky was genuinely broken west of x −60** — the camera far (500)
   clipped the 560-radius dome; the shipped evidence had never pointed a
   camera west at the dome since W-C1 grew it. Far 500 → 1200. The
   marquee's name board read edge-on until the sign dims were re-axed
   (width along x — the Terminal_Sign convention).
3. **The pricing loop** — the first transit-wave census read 202 (over
   budget). The hide-test attribution (reset-per-render, hide-one-
   object) found: the bus's boot pose had re-indexed onto the new west
   return leg (the bus stood in the Larch Yards at boot — +7 draws and
   its shadow), the canvas signs drew un-gated at 480 m, the dome cost
   its honest +1. The fixes: the boot leg re-index (the shipped frame
   byte-identical), the signs registered to their lattice columns, the
   garden's furniture folded into the garden's own vc mesh, the spawn-
   lit band's yard slabs and east curbs dropped (the apron read), the
   ground-merge experiment measured +2 and REVERTED (the per-district
   pairs let frustum culling drop the far district's ground for free).
   Final: **194.**
4. **W-N2** — the Junction Mews in catalpaJunction.ts (additive export;
   the zone law untouched); the fence closures at the docks walk band's
   zone edges.
5. **W-N3** — `wn3_transit.py` (BUS-05 + the loop sentence + V-CAB +
   the WN3 phase row), the two east legs in busRoute.ts (the door law's
   own nose marks; the Juniper box pins no zone on the east leg — the
   shipped l0 convention), the taxi's east rail, the courtesy boxes.

**The verification:** the battery table in BUILD_STATUS §the West Reach.
The walk leg is the wave's own acceptance test: the player walks Alder →
corridor → canyon → mews → docks in the real game, 166 steps, zero
stalls, zero page errors.

## W-C7 — the M121/taxi routes east (the handover's exact next priced wave, register v1.83.0 — renumbered from v1.81.0 on the integration merge; the concurrent line's Polyfork v1.81.0 and WP-EAST v1.82.0 took their slots)

AGENT_HANDOVER §2's task executed verbatim, its own priced estimate riding
first (the DEC-2 law), built tests-first: 9 net new/rewritten pins watched
FAILING before a line of implementation — the leg order, the 674 m lap, the
east reach, the truck lane clearances, the render/yield correspondence, the
BUS-05 bay containment, the Spur zebra clearance, the zone maps.

**The loop grows east.** The M121's rectangle turns at the Larch corner now:
leg 0 Kestrel westbound extends x 72.2 → 228 (the east origin is one exported
constant, `LANE_X_KESTREL_WEST_END`; World's BUS-04 hold line derives from it
— no second 72.2 anywhere), leg 2 Gable eastbound extends to the corner, leg
3 Larch southbound replaces Sycamore south (the avenue-centerline law — both
ends turn corners, no stops, no zones). Sycamore Ave leaves the loop — it
carried no stop, and the bus now rides Kestrel STRAIGHT through the Sycamore
junction, so its box courtesy zone joins leg 0 (the shipped loop turned
inside it and could not honor it). The straight-through junctions zone
honestly: the Spur boxes on both legs, the GL-W pre-corner leg (the shipped
pre-corner law). Lap 362 → 673.6 m; all four shipped stops keep serving.

**BUS-05 'Junction Plaza'** appends to transit.bus.stops — the BUS-04 bay
pattern east: park-in-the-paint (lateral 1.2, the body inside the curb
strip), the tail clear of the Spur zebra AND the junction zone (the mark
halts the nose 1 m east of the zone line; a walker in the paint holds the bus
short of the bay, then it noses in), the pole at (157, 7.35) at the plaza's
east edge, the door law's 2 m. Paint + pole pre-bake — the merge swallows
them; the pole's canvas face is the visit-cost singleton.

**The taxi** grows the east reach: x −84..252, Kestrel East's own south lane,
wrapping at the east wall; the courtesy list grows the Spur and Kestrel×Larch
boxes; the cab passes the parked bay body 1.875 m clear.

**The debt paid.** The kit's parked-here comment ("the taxi's lane ends at
x 46 so the east curbs carry no yield debt") was a debt against this exact
wave: the east box trucks move to the north curbs — TRUCK_SPOTS exported,
one table two readers (the kit renders from it, the movers' yield list
declares from it; the test pairs the lists); the two south-curb trucks move
north (the south curb is the cab's road), the north trucks step to z 3.25
(the bus lane's 15 cm of air), the Gable south truck moves north; the two
Larch spots sleep exactly as shipped (the PRNG's draw count untouched) and
carry NO rect — no ghost braking, pinned. parkedCarRect generalizes (trucks
7.0 × 2.3); the yield pools grow 32/30 → 48/48.

**The probes, re-timed.** The east reach blew the wall-clock budgets (the lap
× the dt clamp ≈ 16 min, past this box's shell cap): probe-w4-bus now drives
the sim (the taxi-locate manual-update precedent — deterministic, no
machine-mercy budgets) and grows the east checks; probe-taxi-locate grows the
east witness (x > 100 + the frame) and drives the sim too (the 1280×720 wall
window was the dt-clamp's casualty — the max-x 84.0 artifact diagnosed by
trace: wrapper ≡ collider, the rail honest).

**The battery:** validate-registry OK (258 IDs, 112 buildings, 23/23
anchors) · tsc clean · vitest 1,773/1,773 (105 files, +9 net) · build OK ·
probe-city-fabric DRAWS 192 (byte-identical — the standing delta +0) ·
probe-w4-bus 14/14 (the east reach max x 228, the plaza dwell at 160, 2 laps
in 196 s sim, 0 coexistence) · probe-taxi-locate the east crossing witnessed
at x 106.5 · probe-subway 45/46 (the documented baseline Wow-card carry) ·
probe-nav 9/9 · probe-integration 0 errors 8/8 · probe-interior-dressing
PASS · probe-w14 PASS · probe-wc1-catalpa OK (spawn 192 +0) ·
probe-tss-road-clear LAW HOLDS · probe-catalpa-evidence 0 errors ·
diag-pocket-scan one component x −98..250, traps 19 unchanged (colliders
1233 → 1243: the gifted furniture's own +10, this wave 0). The honest
carries: probe-world-sim's "no report" FAIL reproduced identically on the
base commit `3ded020` (the box class); the partial E2E's ladder-grab fails
reproduce on the base commit — the full-scale E2E stays the faster-box
follow-up.

**The merge amendment (the polyfork base):** their trucks() polyfork branch reads this
wave's TRUCK_SPOTS — one table, two readers holds through the third integration; the curb
line rides z 3.4 and the declared envelopes widen to 2.7 because the polyfork delivery
truck's 2.62 beam wears the same spots when the kit is ON (both renders keep the bus
lane's air AND the yield rects' truth — a 2.3 rect under a 2.62 body would leave 0.16 m
undeclared). Their WP-EAST walker loops joined the same tree.

## W-N4..N6 — Linden Hill, the North Depth (register v1.85.0)

The master build directive's next major expansion: **the city's second
dimension**. The audit's own words named the gap ("one district is not an
open world"); the West Reach closed the x gap; the north band closes the z
gap — the strip became a piece of grid city. Design:
`docs/world-building/linden-hill-design.md`.

**W-N4 — the data wave.** `scripts/world_building/wn4_registry.py` (the
wn0 discipline, self-verifying): two EW streets (Hazel, Mulberry), four NS
span amendments (the continuation law, north edition), twelve blocks, fourteen
LNH-* masses (shells only), the green in two halves, LMK-16/17, eight
intersections, thirty-two crosswalks, bounds grown north. The self-checks
caught and fixed three real defects before the file was written: three
masses poking above the far rows' roofline from the spine (trimmed h 15/14
→ 13 — the massing now steps UP going north), a park bbox crossing Mulberry
(the green split into two halves — the street crosses it, the paths splice
at the crossings), and two intersection ids colliding with the Marlow
corners (the HZJ/MBJ tags). The validator: OK (382 IDs, 143 buildings,
23/23 anchors).

**W-N5 — the lattice.** DIST_ROWS 3 → 10 (ROW_ORIGIN −144: the spawn keeps
its middle row — the byte-identical standing law), ROW_RING 1 → 2, the W6
strips' clamp restored (the fusion the first 10-row keying split — the
census caught the +6), the walls (the north wall split; the west/east walls
re-spanned z −64..160), NAV_BOUNDS zMax 152, the skyline re-seats
(SkylineNorth z 230; the fabric N row z 250; the landmark silhouettes
z 226..232 — each caught standing inside the band by the evidence probe
before the move).

**W-N6 — the kit.** `lindenHillKit.ts` — the masses (per-row seeded bay
grammar), the green, the civic pair, the holder, Osier's yard, the viaduct's
north reach, the bed's north reach, the lit panes. The ground pair split
WEST/EAST registered to their own row-7 tiles. The seam dressing. The
fire-escape jobs (five S-face bays, the shipped bay law). ROOF_SKIP grew
LNH-08 (the holder frames itself).

**The bugs the battery caught, and the laws they became:**

1. **The graph split 27 ways** — the crossings formed islands and the
   Willow/Chestnut lanes grew phantom segments z 64..152. Two root causes:
   (a) the Hazel/Mulberry lane offsets sat ON the 6 m grid — the corner
   junction nodes deduped out of the avenue chains (the junction off-grid
   law, the Willow lanes' own precedent); (b) Z_SPAN grew globally — each
   NS lane now walks ITS OWN street's spanZ (the laneSpanZ map, the W-C5
   laneSpanX twin), and the junction law requires BOTH lanes' spans to
   reach the corner (the W-C5 both-spans law, completed).
2. **An edge through GRB-06** — the grown Juniper lane met the shipped
   terrace's blocked span, whose skirt search fails; the old chain JUMPED
   it. The no-skirt chain-break law: a blocked span with no passable skirt
   breaks the chain (the walkers route around; the graph stays one
   component).
3. **DRAWS 200** — the re-keyed far strips split their per-column fusions
   (+6). The W6 strips' clamp law restored on the new grid (z ±48..64 bake
   into the inner rows' tiles) → 196.
4. **The band's rows 7-9 drew at spawn** — three single-source batch
   groups (LNH-04, the viaduct, the bed — each the lone signature in its
   tile) were never registered, always visible. The singles law: unmerged
   singles join their tile's district (the streamed-city law is total).
5. **The purple wall over the playground** — the skyline landmark
   silhouettes (the ESB/Crown/Glass/Wedge/Midband groups) still seated at
   z 88..95, INSIDE the green. Moved z 226..232 and merged into one
   fog-exempt mesh ('SkylineNorthLandmarks', the SkylineNorth law — baked,
   the ring would blink the north's own landmarks out exactly when the
   band is unlit).

**The evidence (probe-linden-evidence, this wave's own probe):** 15 frames
(the aerial, the isometric with the far skyline properly seated, the school
front with its flag, the reading room, the green both halves, the holder's
iron, Osier's yard, the viaduct's north reach over the timber crossing, the
Larch north end, the transition, the dusk frame) + 7 censuses (spawn 198;
hazel_juniper 79; green 56; mulberry 57; the holder 45; larch_north 45;
the north wall 47 — the band costs less than half the budget anywhere
inside it) + the walk leg (Kestrel → Juniper north to z 148 → Mulberry east
to x 72 → Sycamore south to z 0: 209 steps, 0 stalls, minY 0.05 — the
avenues are streets now, not dead ends).

**The battery (the final tree):** validate-registry OK (382 IDs, 143
buildings, 11 streets, 12 parks, 17 landmarks, 23/23 anchors) · tsc clean ·
vitest **1,792/1,792** (106 files — the bounds pins and the nav validation
bounds grew with the map, the W-C0 bookkeeping precedent) · build OK ·
probe-city-fabric **DRAWS 196** (< 200; +2 the wave's own re-seat
accounting) · probe-nav 9/9 · probe-subway 45/46 (the documented baseline
Wow-card carry) · probe-wc1-catalpa OK (boot 196, +0 standing) ·
probe-w4-bus 14/14 · probe-taxi-locate OK · probe-fenestra ALL PASS ·
diag-pocket-scan the spawn component x −448..+250, z −62..+159.75 (460,066
cells), traps 19 unchanged, cramped clusters identical to the base tree.
