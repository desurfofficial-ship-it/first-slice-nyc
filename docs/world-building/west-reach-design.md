# The West Reach — the Willow Rows — the complete-world corridor design

> **Status:** the owner's 2026-11-14 master continuation directive
> ("COMPLETE THE OPEN WORLD — FULL GEOGRAPHICAL EXPANSION AND INTEGRATION")
> names the standing incompleteness this district closes: Times Square and
> Alder Heights share a subway seam but no surface — x −280..−100 is void.
> The directive: "A player should be able to travel from one neighbourhood
> to another naturally without encountering artificial geographical gaps."
> This document is the district's specification, integrated with everything
> that ships (registry v1.82.0, draw census 192/200).

---

## 1. The geography this closes

The playable world, west to east, after this build:

| Band | x span | Today | After |
|---|---|---|---|
| Catalpa Junction (the docks) | −450..−378 | built, zone-gated, walk-unreachable | built; **reachable on foot** (the Junction Mews, §6) |
| Times Square | −380..−280 | built, zone-gated, ride-only | built; **the east mouth opens to the corridor** |
| **the Willow Rows (NEW)** | **−280..−100** | **void** | **built: streets, blocks, garden, 17 masses** |
| Alder Heights | −100..+100 | shipped | unchanged |
| the Larch Yards | +100..+252 | built | unchanged |

Kestrel Street runs unbroken Willow→Larch: **532 m** of continuous
commercial frontage. Gable and Marlow continue west the same way (the
continuation law, west edition). The K line's ride remains — transit
alongside the walk, the way a city works.

## 2. Identity — why the Willow Rows are not Alder with a new name

Between a residential block and the postcard square sits the working
corridor: printers, supply houses, two small theaters, walk-ups with fire
escapes, and a community garden where the last lots never sold. Real-New-York
inspiration: the Clinton/Hell's-Kitchen transition into the Theater District
— tenement brick, painted tin cornices, narrow sidewalk, then the lights.

- **Roofline:** walk-ups 8–16 m — tighter than the Larch Yards' low
  industrial sky, lower than Times Square's towers.
- **Ground floor:** storefronts and stage doors, not loading docks.
- **Signature:** the Willow Theater's marquee (LMK-14) and the Ansel &
  Sons ghost sign (LMK-15) — the district's own wonder beat.
- **The garden:** PRK-CHESTNUT fills the east half-block — the breath
  between the rows and Alder Heights (and the cheap column band, §5).

## 3. Streets (registry rows)

| Street | Class | Geometry | Character |
|---|---|---|---|
| STR-KESTREL (amended) | spine, continued | spanX west end −100 → **−280** | storefronts give way to the square's east mouth |
| STR-GABLE (amended) | cross, continued | spanX → −280 | the brownstone street's west reach |
| STR-MARLOW (amended) | cross, continued | spanX → −280 | the quiet south reach |
| **STR-WILLOW** | secondary, N-S | road x −236..−228, walks ±4, spanZ ±64 | the tenement avenue; the theater's corner |
| **STR-CHESTNUT** | secondary, N-S | road x −152..−144, walks ±4, spanZ ±64 | the garden's street |

Lane offsets (nav LANES table): Willow W/E −238/−226, Chestnut W/E
−154/−142 — all off the 6 m grid (the junction off-grid law).

## 4. Blocks and buildings (17 masses, `WLR-*`, all `regShell`)

Blocks: BLK-WLR-A/D (x −278..−244, N/S), BLK-WLR-B/E (x −224..−160),
BLK-WLR-C/F (x −136..−104), BLK-WLR-FARN/FARS (z 48..64 / −64..−48).

| ID | Name | Footprint (x,z,w,d) | H | Notes |
|---|---|---|---|---|
| WLR-01 | Ansel & Sons Print Works | −265, 20, 22, 20 | 13 | the ghost sign's west gable |
| WLR-02 | The Ivy Walk-ups | −248, 20, 8, 18 | 16 | fire-escape bay |
| WLR-03 | **The Willow Theater** | −212, 20, 24, 20 | 14 | the marquee (LMK-14), forecourt benches |
| WLR-04 | Hawthorne & Varn Supply | −186, 20, 20, 18 | 11 | painted fascia |
| WLR-05 | The Chestnut Lofts | −170, 20, 12, 18 | 15 | party wall to WLR-04 |
| WLR-06 | The Kestrel Diner (shell) | −266, −20, 20, 20 | 10 | low commercial row |
| WLR-07 | Willow Court Walk-ups | −249, −20, 10, 18 | 15 | |
| WLR-08 | The Bijou | −213, −20, 22, 20 | 12 | stage door, small house |
| WLR-09 | Pell & Sons Cabinet Works | −187, −20, 22, 18 | 12 | |
| WLR-10 | The Column Yard | −170, −20, 12, 18 | 14 | storage loft |
| WLR-11 | The Chestnut Shed | −120, −20, 24, 16 | 6 | the garden's low shed row |
| WLR-12..14 | far-north walk-ups | z 57, d 10 | 8–9 | face S to Gable |
| WLR-15..17 | far-south works rows | z −57, d 10 | 8–9 | face N to Marlow |

**Scope law (the W-C1 docks precedent): shells only** — no interiors, no
businesses, no residents, no story content this wave. The Anti-Slop gate
still holds: every mass reads its row; bay rhythm, window grids and
cornices vary by per-row seeded PRNG; the roof fabric dresses new rows
automatically (no ROOF_SKIP entries — lattice-baked rows join the bake).

## 5. The lattice reality — priced before building (DEC-12's own law)

The district ring lights columns whose centers sit within SIGHT_M 130 of
the player. Growing the lattice west (origin −84 → **−308**, 12 → **20**
columns) keeps the spawn census bounded EXCEPT columns 5–6 (centers −154 /
−126: 124 m / 96 m from the Day-1 spawn at x ≈ −30 — inside the window).
Priced answer: **columns 5–6 carry the cheap content** — the Chestnut
Garden (lawn, beds, fence, gate, instanced trees ≈ 6–9 merged draws) and
nothing else. Every building mass sits west of x −176 (column 4's band,
152 m — hidden at spawn). `probe-city-fabric` re-reads the census the same
day; the pricing law decides.

West silhouette: `WillowRows_Silhouette` + lit panes (the Larch pattern,
mirrored) — the far read from east Alder while the west columns are
unlit; walking west replaces it in place.

Skyline: **SKY-W moves x −122 → −466** (the cards would stand inside the
built corridor; −466 sits behind the docks' west faces, 10 m east of the
SKY-TS-W rim — the west horizon keeps its closure).

## 6. The connections (the directive's acceptance core)

- **Corridor → Times Square (east mouth):** the corridor's Kestrel road
  (z −4..4, top y 0.0) and walks (z ±4..8, top 0.1) butt-joint the
  canyon's TSS_Road / TSS_Walk at x −280 exactly (the canyon road widens
  z −8..8 — the avenue opens into the square, top levels identical).
  Blocks A/D sit 4 m back from the mouth.
- **Corridor → Alder Heights:** Kestrel/Gable/Marlow spanX continue to
  the Westgate rows; ground slabs butt-joint at x −100 (same levels).
- **Times Square → the docks (the Junction Mews):** the canyon's west
  close-wall keeps its vista; the served alley east of it (x −388..−380,
  z −23..8) and the south reach (x −400..−380, z −23..−56) gain paving,
  a lamp row and bollards — the player walks the canyon's SW corner
  south, around CJN-09, onto the spur walk. Zone-owned (catalpaSurface
  already covers x −450..−378): +0 standing preserved.
- **Walls:** west wall x −100 → **−450**; N/S walls re-span x −450..+252
  (center −99, length 702). `playableCore.xMin` −100 → −450.

## 7. Nav, sim, performance

- NAV_BOUNDS xMin −100 → −280; X_SPAN grows; two new lane pairs; 12 new
  crosswalk rows feed the crossing derivation; door nodes from the 17
  entrances. The canyon and the docks keep no lanes (no registry streets
  there — walkers stay east of −280; the PLAYER walks everywhere).
- Sim fence (§9 of the assignment): no new NPC intelligence; two ambient
  walker loops may extend west in a later priced wave.
- Draw budget: spawn census must stay < 200 (§5's pricing); the
  corridor's own lit census reads ≤ ~200 standing anywhere inside it.
- No new async assets: everything is palette geometry + canvas textures
  (the budget-honesty law).

## 8. Waves

| Wave | Content | Gate |
|---|---|---|
| W-N0 | registry rows (streets/blocks/buildings/park/landmarks/intersections/crosswalks/routes/bounds), validator pins | validator green |
| W-N1 | westReach.ts builder + lattice growth + walls + ground + silhouette + marquee + ghost sign + garden | battery + census < 200 |
| W-N2 | the Junction Mews + the canyon mouths + evidence frames | battery + screenshots |
| W-N3 | (priced) M121/taxi east leg — the handover's documented next wave | probe-bus/probe-taxi legs |
