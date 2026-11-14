

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


> **ADDENDUM (2026-11-14, the Catalpa/Junction line — the §8 gate's input verified):** the Catalpa Junction **business package is FILED** ([CATALPA-JUNCTION-BUSINESS-PACKAGE-DRAFT.md](../production/CATALPA-JUNCTION-BUSINESS-PACKAGE-DRAFT.md), register v1.79.0 — docs-only, authorizes nothing) and **awaits the owner's §8 ruling**: four first businesses with books (the provisions store CJN-08, the supply floor CJN-04, the book floor CJN-07, the lunch counter CJN-05), each priced, each riding shipped machinery. **Nothing of CB1 exists** — no registry rows, no geometry, no code — and none may begin until the owner opens the gate. The package's factual claims were re-verified against the integrated code line by line: the ten CJN rows exact (names, heights, door coordinates and faces), the Phase-6 ledger machinery at its cited lines, `catalpaSurface` x −450..−378, the west wall x −100, the nav graph's `NAV_BOUNDS` x −100..+252 (the docks sit outside it), the pocket scan's x −99.75 origin, LRY-01's `business` field, the census numbers (bodega 194, records 109–110, bakery 93–94, diner 239), and both quoted sources — **one number corrected** (§3's slot-library count; the true manifest counts are 32 interior programs + 24 ABO + 14 gifted). The battery re-certified fresh on the integrated tree at `1717a59`: validate-registry OK (256 IDs, 111 buildings, 23/23 anchors; 1 KNOWN — the recorded LRY-03 ↔ SUB-03 overlap) · tsc clean · vitest 1,751/1,751 (105 files) · build OK · probe-city-fabric DRAWS 192 · probe-wc1-catalpa OK (spawn 192 +0 standing, spur 53, platform 23). Reading note for §1 above: its body was written pre-repair — "20 building rows (CJN-*)" for this district's masses reads as **LRY-***; the canon map after the repair is **Alder Heights' canon rows + the Larch Yards LRY-* + Catalpa Junction CJN-*** (the west-reach docks among them). The owner's two gifted furniture packs wear 14 new interior slots additively (the K-line's wave, merged): the book floor may take the gifted bookshelf (`sc_bookshelf`) under the package's dated amendment. Coordination: no new work upstream — the remote's `feat/catalpa-junction-world` is the old master-assignment pointer (tip `d166ba3`), already an ancestor of `main`.
