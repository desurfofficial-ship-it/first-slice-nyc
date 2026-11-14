# Catalpa Junction Business Package — DRAFT: the first businesses with books (the DEC-13 program's next priced wave)

> **Filing status: DRAFT — the §8 gate's INPUT, not its exercise. This document authorizes nothing.** Zero registry rows, zero geometry, zero code, zero interactions exist for any Catalpa business, and none may begin without the owner's fresh §8 approval ON this package and its first priced wave (**CB1**), per the DEC-13 rules ([DEC-13-CATALPA-JUNCTION-PACKAGE-APPROVAL-DECISION.md](DEC-13-CATALPA-JUNCTION-PACKAGE-APPROVAL-DECISION.md) §2: the district's program depth — businesses, interiors, residents, story — each rides its own priced wave) and the approved borough package's own gates ([BOROUGH-DESIGN-PACKAGE-DRAFT.md](BOROUGH-DESIGN-PACKAGE-DRAFT.md) §5). The prices proposed in §4 become evidence only when the owner approves them (wc-12 rule 17: no invented prices — these are the program's first *designed* prices, which is exactly what a §8 approval is for).

| | |
|---|---|
| Author | Z.ai agent (the Catalpa/Junction line — the DEC-13 west reach) |
| Date | 2026-11-14 |
| Governs | Nothing yet. Proposes: the district's first four businesses, their placement, architecture, interiors, books (the Phase-6 ledger machinery), assets, pricing, and the coordination boundary with the K-line expansion. |
| Pricing method | Every number below is read from THIS project's shipped ledger (the probe censuses, the W14b restock row, the sim economy's shipped evidence). Where a cost is unknown, it is named unknown and tied to the probe leg that would price it. |
| The coordination frame | The owner's directive of 2026-11-14: the K-line expansion belongs to the other agent; this line builds the district's *content* — businesses with books — and coordinates through the shared repository, the registry's laws, and the boundary in §6. |

---

## 0. The assignment

The owner's directive (2026-11-14), in substance: prepare the priced construction package for **Catalpa Junction's first businesses with books** — the district must gradually become **a believable, functioning neighbourhood rather than an environmental showcase**. Investigate and propose the first businesses, their placement and building requirements, their architectural and interior requirements, their identities and purposes, the physical assets required, the assets reusable, how they will eventually support residents, activities and neighbourhood life, and the performance and draw-budget implications. Implementation waits for the §8 review.

What "books" means here (the repo's own vocabulary, verified in code): businesses that **open their books on the Phase-6 ledger machinery** — hours → open/close → ledger-evidence P&L (`src/sim/economy.ts` `EconomyLedger`, `src/sim/moneyBridge.ts` (wired to every earn/spend at `Game.ts:491–513`), `src/sim/businessOps.ts` `businessDayReport`/`monthRollDetail`, `src/sim/entities.ts` `BusinessState` + `businessIsOpen`). Three reference businesses already run this class (`biz:rosas_deli`, `biz:corner_slice`, `biz:fade_king` in `src/sim/reference.ts`); the borough package §2 scoped "5–7 places that open with books"; the other agent's BUILD_STATUS §3.2 names the gap plainly: *"The market and wholesalers are PLACES … not ledgers."* This package proposes Catalpa's first tranche of the fix.

## 1. The district as it stands (the integrated truth)

Catalpa Junction is the K line's **west reach** past 42 ST (DEC-13's canon; rows `CJN-01..09` + `CJN-SUB`, restored from the CDK-* rename by the registry-discipline repair, register v1.78.0). Nine dock shells stand on two rows facing the Junction spur (paved, dead rails, two iron footbridges); the station stub's stair opens at (−410, 8) mid-spur; the whole district is **zone-gated** (`catalpaSurface` x −450..−378 in `subway/index.ts`; shared-sky law) and ships at **+0 standing** (spawn frame 192 draws, district dark; spur lit 53; platform 23 — probe-wc1-catalpa on the integrated tree).

**The reachability fact, stated plainly:** the docks are **not reachable on foot or by ride today** — the west wall stands at x −100 (`World.ts:1541`, "Times Square stays one RIDE west, never a walk") and the K-line ride machine runs A↔B only. The district lights for a player only when the ride seam opens. Per the owner's partition, **the ride seam is the K-line agent's work** (their AGENT_HANDOVER §2 prices the eastbound leg; DEC-13 §2.4 keeps the seam machine gated). CB1 therefore builds the neighbourhood's interiors and books **zone-gated and dark**, exactly as W-C1 built the shells: +0 standing, lit only inside the district's zones, activated as reachable when the seam wave lands. No CB1 work blocks or depends on the seam's code — the dependency is one-way (seam → footfall), and §6 records the integration point.

The east district across the map — **the Larch Yards** (LRY-*, the other agent's build) — already carries the borough's first market hall (`FREIGHTMKT-INT`, dressed, not yet booked). CB1's businesses are chosen to **complement, not duplicate** it: the Larch Yards holds the wholesale/market floor; Catalpa's spur gets the daily-life floor a dock neighbourhood actually needs before residents can live there.

## 2. The proposal — four first businesses (tranche CB1)

Four doors, one rule: **purpose + interaction + books per place, at Alder Heights' own quality bar** (the borough package §5 gate 5). Five shells stay industry fronts this tranche (CJN-01 Terminal Warehouse, CJN-02 Corbin & Sons, CJN-03 Iron Works, CJN-06 Meridian Lumber, CJN-09 Junction Depot — their wholesale/freight books are a later tranche, §7).

### 2.1 The Duck's counter — provisions · CJN-08 United Cotton Duck (east row, z 8, door west onto the spur)

**Identity and purpose.** The neighbourhood store: the first door a rider sees coming up the station stair — directly opposite the stair mouth at (−410, 8). Shelves, a cooler, a coffee point, a register; the cotton-duck warehouse's ground floor letting its street front to a grocer. This is the Rosa's of the docks: the daily-goods spine the district's future residents will actually patronize, and the canvas for the bodega-class stock law (morning restock, shelf-deplete, sold-out lines) already shipped in `SHELF_GOODS`/`restockShelfStock`/`consumeShelfUnit`.

**Books.** `biz:cotton_duck_provisions` — hours 6:00–22:00 daily (dock hours wake early); proprietor **Odessa Brann** (schedule-only, unvoiced — no story beats this tranche, §7). Shelves stock 3 SKUs at the shipped price band (mango $2 / bread $3 / coffee-bag $5 class); the counter pours coffee at the $2 diner/bodega class; every sale a ledger transfer to `biz:cotton_duck_provisions`, the day report from ledger evidence, the month roll in the world journal.

**Architecture and interior.** The W9 strip-carve class on the ground band (mass + collider retire in the strip; duckBox above; blind walls 0.4/0.2; the **dock door becomes the shopfront** — the registry's own entrance row at (−400, 8) gains the door gap + clear glass run, the far pane read from the spur). Interior id `CJN-PROV-INT`, clearH 3.6. Fit-out from the shipped programs only: `bodega_shelf` gondola ×2 (the W14b millimetre board law), `drink_cooler`, `coffee_machine`, `cash_register`, `produce_crate` ×2, counter in the fascia's brick red (the W14b counter law), `menu_board`. Aisle: one clear-zone row west of the door line (the W14 island law — never on the door sight line).

### 2.2 Starlawn's supply floor — tools & supplies · CJN-04 Starlawn Fork & Tool (west row, z −24, door east onto the spur)

**Identity and purpose.** The firm's ground floor opens as the tool and supply merchant: the activity-economy anchor. The shipped game's spends are tool-and-fixing shaped (awning $15, stool $10, permit $10) — a supply counter gives those spends a *place* and gives future resident tasks (repairs, garden builds, stall fit-outs) somewhere to buy what they need. Across from the south reach, it anchors the walk's mid-point.

**Books.** `biz:starlawn_supply` — hours 7:00–18:00 Mon–Sat; proprietor **Verl Starlawn** (schedule-only). Counter sales in the shipped activity band: the supply item $4–10 (anchored to the stool/permit precedents), a day-rate tool loan $2 (the dryer/hotdog micro-charge class) — the loan posted as a sale line, the return unmonetized (the books stay honest: no deposits machinery this tranche).

**Architecture and interior.** Same strip-carve class; the dock door keeps its industrial character — glassless grille door gap (the far read is the lit interior itself, the `farParts: []` pattern the W9 rooms use). Interior id `CJN-SUPPLY-INT`, clearH 3.4. Fit-out: `hall_storage_shelf` ×2, `detergent_shelf`, `bodega_shelf` (stocked facings), `produce_crate` as crate stock ×3, `cash_register`, `workbench`-class counter from the hall program set, `folding_chairs_stack` (the counter's two stools).

### 2.3 Halstead's book floor — second-hand books · CJN-07 Halstead Lofts (east row, z 26, door west onto the spur)

**Identity and purpose.** The district's roofline (18 m) lets its ground floor to a second-hand bookshop — the loft-district trade, and the canon's texture: Catalpa is the open endgame's district (the continuation content's setting), and a reading place is how a neighbourhood sounds like itself at night. The interaction rides the **record-shop class already shipped** (browse the bin → buy → the reading beat), which keeps the wave's interaction machinery honest and proven.

**Books.** `biz:halstead_books` — hours 10:00–20:00 Tue–Sun; proprietor **Juno Parks** (schedule-only). The bin: books $3–4 (the record bin's $3 class, the bakery's $4 ceiling); one shelf SKU restocked each morning (the stock law), the "read first" interaction free (the record-listen class).

**Architecture and interior.** The strip carve with a glazed shopfront on the registry entrance (−400, 26); Interior id `CJN-BOOKS-INT`, clearH 3.4. Fit-out: ABO `bookcase` ×2 (the shipped furniture file), `bodega_shelf` boards carrying **canvas book-spine rows** (the TSS-PROD facade-texture craft — authored spines, seeded wear, no new files), `record_bin` as the browse bin (its third shipped wear), `cafe_table` + `counter_stool` as the reading table, `cash_register`, the `LightStrip` warm band.

> **AMENDED 2026-11-14 (rides the gifted-packs merge):** the owner's two gifted furniture packs shipped on the integrated tree (the K-line agent's additive wave — 14 slots; `bookshelf.glb`, the diary desk and the desk chair among them). They join the shipped library CB1 wears from: the book floor's fit-out may take the gifted `bookshelf` as a slot alongside the ABO bookcase, the zero-new-files law unchanged; the supply floor gains the gifted desk/chair class as counter-furniture options.

### 2.4 The Docksman's lunch room — the shift counter · CJN-05 The Docksman (west row, z −46, door east onto the spur)

**Identity and purpose.** The south end's anchor: the dockworkers' lunch room under the Docksman name — hot plates, coffee, the shift-trade chatter point. Not a tavern: the shipped asset library has no wet-bar programs (§5), and a working dock runs on lunch counters, not taps. The diner's machinery class (counter coffee, booth-adjacent sits) carried to the spur's own register of hours.

**Books.** `biz:docksman_counter` — hours 5:30–19:00 Mon–Sat (the shift day); proprietor **Manny Toledo** (schedule-only). Coffee $2 (the diner counter's exact shipped class), the hot plate $4–5 (the bakery/plate band), the tip-jar earn $1 (the busker-coin sink class, mirrored).

**Architecture and interior.** The strip carve, glazed door + serving hatch on the registry entrance (−422, −46); Interior id `CJN-DOCKSMAN-INT`, clearH 3.4. Fit-out: `diner_kitchen_line`, `diner_register`, `counter_stool` ×3, `cafe_table` ×2, `coffee_machine`, `menu_board`, `drink_cooler`, `folding_chairs_stack`.

## 3. What the wave rides on (no new machine is invented)

Registry-driven construction (the A-3 law — every mass reads its row; the carve retires the ground band's mass + collider per the W9 law) · the interior program (`registerInterior` near/far band, the glass-run law, `dressRoom`, the hysteresis margin) · the provenance-pinned GLB programs (`INTERIOR_SLOTS` + `INTERIOR_PROVENANCE` + the drift pins — **zero new GLB files**, the W14b law; every slot above exists in the shipped library — the 32 pinned interior programs (`INTERIOR_PROVENANCE`), the 24 pinned ABO files (`FURNITURE_PROVENANCE`), and the 14 gifted-pack slots (`GIFTED_PACK_PROVENANCE` — 52 interior + 54 furniture slot entries resolve to those 70 pinned files) *[count corrected 2026-11-14, the claims re-verification pass — this line read "the shipped 51 + 24 files", which matched no manifest]* · the interaction registry + `gatedBuy` + the stock law · the Phase-6 ledger machinery (§0) · the zone gates (`catalpaSurface` lights the group; the rooms band-gate their fit-outs) · the probe fleet (the teleport-census method; four new legs + portraits). **The books, the hours, the stock, the P&L — all existing machines; CB1 is their first Catalpa manifests.**

## 4. THE PRICING — read from the shipped ledger, measured never promised

**Standing (the street ledger):** **+0**. The rooms' fit-outs start `visible=false` and band-gate; the CJN group stays zone-gated; probe-city-fabric must read byte-identical (192 on the integrated tree) after CB1 — the W14b/W-C1 law, re-run as a gate.

**Inside-state censuses (the honest unknowns, tied to their probe legs):** each room's frame prices by its own teleport-in census (the probe-wc1/W14b method). The shipped classes bracket the expectation: stocked bodega inside **194**, records **109–110**, bakery **93–94**, diner family **239**; the Freight Market hall ships unmeasured. CB1's law: **each of the four rooms must read < 200 inside-state on its own probe leg**; any room pricing over 200 trims (drop a slot, merge a stock color — the one-mesh-per-color law) before the wave lands. The wave's ledger row IS the measured census — this package refuses to fake it.

**The other ledgers, named:**
- **Colliders:** four ground-band carves retire four door colliders and add interior walls/fixtures — the honest count (expected the W-C1 class: a couple of dozen, all at x ≤ −378, **outside the scanned extent**; the pocket scan's grid starts at x −99.75, so the scanned extent's census reads unchanged — re-run as a gate, traps 18 must stand).
- **Nav:** zero new lanes — the graph spans x −100..252 and does not reach the docks (§1); the door-approach legs for the four interiors ride the ride-seam wave's nav extension (the K-line agent's), and CB1's walkability evidence is the teleport-in probe frames + the aisle law + the collider honesty. Stated plainly so no one mistakes it for an omission.
- **Sim step:** four `BusinessState` rows, four `biz:*` accounts, hours transitions on the existing tick — no new walkers, no schedule growth; the world-sim battery re-runs (15/15 must stand).
- **Memory/assets:** zero new files; ~12 GLB slots re-worn from the shipped 75; four interior groups + the fit-outs' merged statics.
- **Reachability activation:** when the ride seam opens, the district's lit frame becomes the spur census (53) + whatever room is entered — the seam wave re-runs the census with the rooms live and owns that row.

## 5. The gates CB1 would run (the borough package §5's laws, bound)

1. The fresh **§8 approval on THIS package** — sought explicitly, before any construction. The price table in §2 becomes shipped evidence on approval.
2. **Registry append-only**: `CJN-*` ids only (the canon prefix, restored v1.78.0); four interiors rows + four entrances + the clear-zone/anchor rows append; canon rows never edited, renamed, or renumbered; the `business` field joins the four rows only (the LRY-01 field precedent).
3. **No geodata ingestion** — authored through the registry's coordinate system.
4. Per-wave batteries: the measured ledger row first · ghost gates ±0.1 m · the pocket scan re-run (traps 18 stands) · probe-city-fabric byte-identical (+0 standing) · one probe leg + portrait per room (< 200 each) · the world-sim battery re-run · the compliance red line (no TSL/WebGPU) throughout.
5. **Purpose + interaction + books per place** at Alder Heights' own bar (§2's tables are the contract the probe checks).
6. The **same-commit law**: register row + worklog § travel with the wave, as always.

## 6. The coordination boundary with the K-line expansion (the owner's partition, made concrete)

**Theirs (never touched by a Catalpa content wave):** `ride.ts` + the ride machine's routes; `stationKit` / station C / the SUB-03 platform; the subway zones' transit machinery; the third car; the Larch Yards' rows and geometry (`LRY-*`, `FREIGHTMKT-INT`); the LRY-03 ↔ SUB-03 KNOWN defect (register v1.78.0 — theirs to trim with build eyes on it).

**Mine (this line, this package):** the `CJN-*` rows' interiors, interactions, books, and surface content; `catalpaSurface`'s content growth; the sim manifests' `biz:*` Catalpa entries.

**The shared files' protocol** (both lines touch them; the laws already govern): `World.ts` grows by wiring only (R-NEW-3); `subway/index.ts`'s zone table appends per line's own zones; `contentCatalogue`/`reference.ts`/`interactionDefs.ts` append per prefix/`biz:*` (never rewrite another line's rows); the registry appends (the permanence law, v1.78.0's repair is the standing warning); the register/worklog ride the monotonic-ledger law (v1.76/v1.77/v1.78 are the renumber precedent — future collisions resolve the same way, the renumber annotation carries the story).

**The integration point recorded for the seam wave:** when the westbound ride lands, the stair mouth (−410, 8) meets the spur at CJN-SUB's own south face (the stub's stair row); CB1's rooms light on `catalpaSurface` with no seam-side change needed — the seam wave's only Catalpa duty is the ride route + the nav extension + the activation census (§4). No CB1 code waits on the seam, and no seam work waits on CB1.

## 7. What this document does not do

- It does **not** create any registry row, geometry, code, dependency, or branch — docs-only, the registry read never written.
- It does **not** open the residents' or story gates: the four proprietors are schedule-only names; dialogue, beats, ambient walker loops east or west, loft tenants above the shops — each its own later tranche under DEC-13 §2.4 (the path is mapped: CB1 doors + books → the next tranche ambience + the wholesale/freight books (CJN-01..03/06/09, the Freight Market's own ledgers) → the residents tranche).
- It does **not** build a tavern's wet-bar fit-out — the shipped library has no bar programs; if the Docksman is ever to pour, that conversation prices its own new-GLB wave.
- It does **not** touch the ride seam, the Passport, or the Larch Yards.
- It does **not** commit the game to any price until the §8 approval makes it evidence.

## 8. The decision frame handed back to the owner

Approve this package as filed (authorizing **CB1**: the four interiors, the four `biz:*` books, the price table as shipped evidence, the per-room probe law), amend it, or hold it. The tranche is priced to leave the standing budget untouched and to make the spur's four doors — the store, the supply floor, the bookshop, the lunch room — the first proof that Catalpa Junction is becoming a neighbourhood where things are *done*, not only seen.
