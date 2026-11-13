# Complete World Master Plan — the whole playable map, locked before construction

> **Status:** M2 deliverable of the 2026-11-14 master build assignment
> ("establish the entire world layout before building"). This plan is the
> geographical and visual target for the complete world. The design lock of
> `docs/world-map/02-complete-world-design.md` (2026-11-13 — "the block is
> the world") is **succeeded by this plan** on the owner's explicit 2026-11-14
> direction: the world grows by **one additional district** — the DEC-12
> ruling the borough design package (`BOROUGH-DESIGN-PACKAGE-DRAFT.md`)
> already scoped, priced, and named — and this document is that district's
> complete specification, integrated with everything that ships.
>
> **What this plan does not do:** it does not re-open Alder Heights' layout
> (its five streets, 81 buildings, 22 interiors and 7 parks are the locked
> foundation, touched only where a boundary field must grow); it does not
> invent boroughs, rivers, or a second subway line; it does not schedule
> the Passport program (DEC-12 §1.5).

---

## 1. The complete world in one paragraph

FIRST SLICE's complete playable world is **two districts and a destination,
connected by street and by transit**: **Alder Heights** — the shipped
residential-commercial neighborhood, the story's heart (x −100..+100);
**Catalpa Junction** — the new working district one road-continuation east
(x +100..+252), where the old freight industry lives as loft conversions,
a pedestrian spur, and an elevated rail viaduct; and **Times Square** — the
postcard destination, one K-line ride west (x ~−400). Kestrel Street runs
unbroken from the Westgate row to the Larch end — 352 meters of continuous
commercial frontage — and the K line's station houses stand in both
districts. Every meter of the planned area is built, walkable, and
registry-truthed.

## 2. World boundaries (registry `bounds`, after the build)

| Boundary | Before | After | Why |
|---|---|---|---|
| `world` (scene graph) | x −450..+136, z ±64 | x **−450..+268**, z ±64 | xMax grows for the Catalpa fabric row + the moved SKY-E skyline cards (x +262) |
| `playableCore` | x −100..+100, z ±64 | x **−100..+252**, z ±64 | the walkable surface grows east to Larch Street's east walk |
| invisible walls | x ±100, z ±64 | x −100, **x +252**, z ±64 | the east wall moves to the new core edge; the N/S walls re-span x −100..+252 (center x +76, length 352) |

**Area:** the playable core grows from ~25,600 m² to ~**44,800 m²** (+75%).
Catalpa Junction itself is 152 m × 128 m ≈ 19,500 m² — deliberately **half
the linear scale of a sprawl district**: the design package's "compact
district, never a sprawl" law.

## 3. The complete street network

### 3.1 Alder Heights (locked, unchanged)
Kestrel Street (E-W spine), Juniper & Sycamore Avenues (N-S), Gable &
Marlow Streets (N-S). The K line under Juniper, west to 42 St–Times Square.

### 3.2 Catalpa Junction (new, 5 ways)

| Street | Class | Geometry (registry row) | Character |
|---|---|---|---|
| **Kestrel Street (East)** | Main road, continued | road z −4..4, walks ±4..8, x 100..252 (spanX grows; butt-jointed slabs, same levels) | the commercial continuation; storefronts give way to wholesalers and the market hall |
| **The Spur** (STR-SPUR) | Freight spur gone pedestrian | bed x 146..158 (12 m), centerline x 152; disused track (rails at x 151.25/152.75, vc strips ≤ 3 cm proud, walkable) | the district's spine — weeds in the rail bed, timber crossings at each street, bollards, the gardens at its south end |
| **Larch Street** (STR-LARCH) | Secondary street | road x 224..232, walks ±4 m, x-span z −64..+64 | the east row — walk-ups, storage, the street that ends at the world's edge |
| **Rowan Street** (STR-ROWAN) | Secondary street | road z 38..46, walks 34..38 / 46..50, x 100..252 | the north cross street; the viaduct's shadow |
| **Sumac Street** (STR-SUMAC) | Secondary street | road z −46..−38, walks −38..−34 / −50..−46, x 100..252 | the south cross street; the gardens' gate |

**The elevated spur (the viaduct):** the active freight line runs **above
the disused one** — an iron viaduct on the bed's edges (deck x 146..158 at
y ≈ 8.5–9.8, cast-iron columns x 147.6 / 156.4 on 0.8 m footprints), crossing
Kestrel, Rowan and Sumac on iron spans. This is the district's landmark
("the rattle of the elevated spur") and its silhouette from Alder Heights.
Columns are colliders; they stand clear of every walk lane and crossing.

**Connectivity law:** no disconnected roads, no dead ends. Every new street
intersects at least two others; Kestrel East carries both districts' traffic;
the spur is continuous z −64..+64. Crosswalks register at all six new
intersections (Kestrel×Spur, Kestrel×Larch, Rowan×Spur, Rowan×Larch,
Sumac×Spur, Sumac×Larch).

### 3.3 Intersections & crosswalks (new registry rows)
`IX-CJN-KS/KL/RS/RL/SS/SL` + `XW-CJN-*` at the same six corners, zebra
geometry per the shipped pattern (3.4 m bands).

## 4. Blocks and building placement (all registry rows, `CJN-*`)

### 4.1 The blocks
`BLK-CJN-N` (z 8..34, north of Kestrel), `BLK-CJN-S` (z −34..−8),
`BLK-CJN-FARN` (z 50..64), `BLK-CJN-FARS` (z −64..−50).

### 4.2 The building program (20 rows + the station house)

**North of Kestrel** (doors face S unless noted; footprints are registry truth):

| ID | Name | Footprint (x, z, w, d) | H | Fl | Style |
|---|---|---|---|---|---|
| CJN-01 | **The Catalpa Freight Market** | 116, 20, 24, 20 | 16 | 5 | the hero — loft above, market hall below (interior W-C4) |
| CJN-02 | Catalpa Cold Storage | 137, 20, 14, 20 | 13 | 4 | loft; ghost sign candidate |
| CJN-03 | The Spur Lofts | 174, 20, 22, 20 | 12 | 4 | doors W (spur) + S |
| CJN-04 | Starlite Stamping & Tool | 201, 19, 22, 18 | 8.5 | 1–2 | the ironworks shell — **Catalpa Iron Works ghost sign**, sawtooth roof read |
| CJN-05 | Junction Lofts | 220, 20, 8, 20 | 14 | 4 | corner; doors S + E (Larch) |
| CJN-06 | Larch Street Lofts | 243, 20, 14, 20 | 15 | 5 | door W (Larch) |

**South of Kestrel** (doors face N unless noted):

| ID | Name | Footprint | H | Style |
|---|---|---|---|---|
| CJN-07 | Beacon Crate & Box | 112, −20, 16, 20 | 12 | wholesaler |
| CJN-08 | Catalpa Bottling | 134, −20, 20, 20 | 15 | loft; painted-brick read |
| CJN-09 | Spur Front Lofts | 171, −24, 18, 20 | 11 | doors N + W (spur) |
| CJN-10 | Federal Wire & Cable | 194, −20, 20, 20 | 14 | wholesaler sign |
| CJN-11 | Sumac Shed | 216, −19, 16, 18 | 8.5 | low industrial |
| CJN-12 | Larch Storage | 243, −20, 14, 20 | 13 | door W (Larch) |

**Far north strip** (facing S onto Rowan; low masses — the wider sky):

| CJN-13 Rowan Walk-ups | 115, 57, 22, 10 | 9 |
| CJN-14 Viaduct Block W | 137, 57, 14, 10 | 8 |
| CJN-15 Viaduct Block E | 176, 57, 28, 10 | 10 |
| CJN-16 Rowan Works | 209, 57, 30, 10 | 8 |

**Far south strip** (facing N onto Sumac):

| CJN-17 Sumac Works 1 | 119, −57, 30, 10 | 8 |
| CJN-18 Sumac Works 2 | 179, −57, 34, 10 | 9 |
| CJN-19 Sumac Works 3 | 212, −57, 24, 10 | 8 |

**Transit:** `SUB-03` — the **Catalpa Junction station house**, the K line's
eastbound stop (x 164, z 5, w 8, d 6, h 3.8; door S to the junction). Ships
this phase as the surface stub (headhouse + globe lamp + stair hood); the
underground platform and the eastbound ride machine are the next priced
wave (the design package's own W-C1 scope line — priced honestly, not faked).

**Anti-repetition law:** every mass renders from its registry row
(`regShell` — the A-3 no-invention law); bay rhythm, window grids, cornices,
dock doors and wear vary by per-row seeded PRNG; the roof fabric
(`cityFabric.roofFabric`, automatic on new rows ≥ 7 m) adds tanks,
chimneys and bulkheads; three rows carry fire-escape fabric
(`ESCAPE_JOBS` +3); no two adjacent faces repeat a window grid.

## 5. Neighbourhood identity — why Catalpa does not look like Alder Heights

| Dimension | Alder Heights | Catalpa Junction |
|---|---|---|
| Roofline | row houses 12–16 m, stoops, cornices | **low industrial 8–10 m** on the strips, lofts 12–16 m — **wider sky** |
| Ground floor | retail awnings, storefront glass | loading docks, freight doors, wholesaler signage, the market hall |
| Pavement | sidewalks + tree pits | the track bed: gravel-toned concrete, timber crossings, rail strips |
| Signature | brownstone stoops, the Ghost Sign, water towers | the viaduct overhead, the preserved crane, brick ghost signs |
| Sound-world (future) | pigeons, the K under Juniper | the spur's rattle, steam grates |
| Light | the same forever-5:45-PM first-week-of-October light (the identity guide holds — **a new place under the same light, not a new game**) | |

## 6. Parks and public spaces (new registry rows)

| Park | Where | What |
|---|---|---|
| **PRK-JUNCTION — Junction Plaza** | the spur×Kestrel junction square (bed x 146..158, z −6..+6) | cobble deck, the **preserved freight crane** (LMK-10), benches, string lights, bollards — the district's front porch |
| **PRK-SPURGARDEN — the Spur Gardens** | the bed's south end (x 146..158, z −62..−40) | raised beds between the rails, sunflowers, the track still reading through — the community claiming the freight line |

(The seven Alder Heights parks stand unchanged; the world total becomes 9.)

## 7. Landmarks (new registry rows)

- **LMK-10** — the Junction Crane (preserved, Junction Plaza)
- **LMK-11** — the Catalpa Iron Works ghost sign ("CATALPA IRON WORKS —
  STRUCTURAL · ORNAMENTAL — EST. 1911", CJN-04's east gable)
- **LMK-12** — the Elevated Spur (the viaduct)
- **LMK-13** — the Catalpa Junction globe (the K station's globe lamp)

## 8. Interiors (essential only, per assignment §6.5)

**FREIGHTMKT-INT** (CJN-01 ground floor, built W-C4): the market hall —
the C6 winter-lights venue the design package assigns this district. Carve
by the shipped W5 full-cavity pattern; fit-out: market stall rows, the
trader counter, the named far pane, the mezzanine stair hint. The registry
row's `plan` list is the room's truth (the Blueprint3D discipline). **No
other building opens this phase** — their architecture is built so future
interiors carve without rebuilding the street (the assignment's
forward-compatibility law).

## 9. Transportation corridors

- **By road:** Kestrel Street is continuous Westgate→Larch (352 m). The
  M121 bus and the taxi keep their authored routes this phase (pinned
  systems; the route's eastward extension is a documented next wave).
  Parked box trucks and vans dress the loading docks.
- **By rail:** the K line — 42 St ⇄ Alder Heights ⇄ Catalpa Junction.
  The Catalpa station house ships; the eastbound ride is the next priced
  wave (station kit is parameterized — `buildStation` already builds B
  from a registry row; C needs a third car, zones, and a route choice in
  the ride machine, each test-pinned).
- **The viaduct:** freight-only, environmental (the rattle is a future
  audio beat; the structure is this phase's).

## 10. Population, sim, and the assignment's §9 fence

No new NPC intelligence, routines, economies or social systems this phase.
The nav graph **does** grow (lanes, bounds, routes — registry-derived, the
shipped law), so future walkers, commuters and schedules reach Catalpa
without re-plumbing. Ambient life this phase: the pigeons' east knot may
roam the spur (existing flock, existing law); the district's windows ride
the shipped dusk-lamp law via the fabric's instanced panes.

## 11. Performance budget (the priced shape, from the shipped ledger)

| Lever | Price | Law |
|---|---|---|
| Fog-law district ring | **0 standing** (bounded vs. today's 6-column always-lit law) | columns within `SIGHT_M ≈ 100 m` of the player light; fog covers the switch; the skyline fabric keeps the horizon |
| Catalpa paving | **+2 draws** (one merged asphalt mesh, one merged concrete mesh — metric UVs preserved) | ground does not cost a draw per slab |
| Catalpa district tiles | **+2..8 draws at any standing position** (the ring lights ≤ 8 columns from anywhere) | all statics bake into tiles (the VC law) |
| Skyline growth | **+0..2 draws** (the fabric is one merged fog-exempt mesh + one instanced pane mesh — the rows join them) | the far world stays free |
| Interior | +2..3 draws when visited (the W5 carve precedent, priced in its own ledger row) | probe-priced |
| **Total standing census** | **≤ 200 target, expected 195–199** | `probe-city-fabric` re-read every wave |

Memory/nav: the nav graph grows by the new lanes (priced in W-C5's ledger
row); the pocket scan's grid grows to x +252 (its own gate re-run).
Load time: no new async assets — everything is palette geometry (the
budget-honesty law).

## 12. Visual deliverables (assignment §5D)

Captured from the real built game by the evidence probe, under
`docs/world-building/images/`: the top-down master map (labelled), the
aerial overview, street-level frames per street identity (Spur, Larch,
Rowan, Kestrel East), the viaduct frame, the Junction Plaza frame, the
Spur Gardens frame, the Freight Market interior frame, and the
Alder-Heights-eastward comparison frame (the existing edge vs. the built
continuation). No internet images — evidence is the build's own render.

## 13. The wave plan

| Wave | Content | Gate |
|---|---|---|
| W-C0 | registry rows (all districts' data, `planned` where geometry pends), bounds, meta version | validator green |
| W-C1 | foundation: paving, spur bed, plaza deck, walls, lattice growth, fog-law ring | battery + census |
| W-C2 | the 20 masses + station house + facades + escapes + roof fabric | battery + screenshots |
| W-C3 | parks fit-out, street furniture, parked vehicles, viaduct, skyline | battery + screenshots |
| W-C4 | the Freight Market interior | battery + walkability leg |
| W-C5 | nav lanes + routes + walked extent + pocket-scan growth + final evidence + docs | full battery + evidence set |

**The design lock:** this document + `BUILD_STATUS.md` are the truth. If a
wave discovers a technical wall, the change lands here first, with the
reason, then the code — never silently.

— Lead Open-World Engineer agent, 2026-11-14
