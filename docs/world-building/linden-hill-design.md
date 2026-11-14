# Linden Hill — the North Depth — the complete-world's second dimension

> **Status:** the 2026-11-14 master build directive's next major expansion
> ("a substantial new geographical area … a complete district or a
> substantial group of connected neighbourhoods"). The world after the West
> Reach (v1.84.0) is one walkable surface — but it is a STRIP: 702 m long,
> 128 m deep, two block-rows everywhere, invisible walls at z ±64 with the
> skyline cards pretending beyond. This wave gives the city its second
> dimension: the north band over Alder Heights and the Larch Yards
> (**x −100..+252, z 64..160** — +33,792 m² of playable geography, +38%),
> built as the district **Linden Hill** (`LNH-*` rows, append-only).

---

## 1. Why north (the highest-value contiguous expansion)

- **The avenues stop being dead ends.** Juniper, Sycamore, the Spur and
  Larch Street all end at the z +64 wall 60 m from the spine — every
  northbound walk in the world hits a stage-set edge. After this wave all
  four continue 96 m into a real neighborhood.
- **The grid becomes a grid.** Two new E-W streets (Hazel, Mulberry) cross
  the four avenues — the first intersections the world has off the spine.
- **The streamed-city law scales in z.** The district lattice grows from 3
  rows (z −48..48, clamped) to **10 rows (z −144..176)** — the
  infrastructure every future band (the south depth, the Willow north
  reach) reuses unchanged.
- **The east half completes the Larch Yards' story:** the freight industry
  thins north — a timber yard, the gas holder, storage rows, the elevated
  spur continuing overhead. The west half is the residential-civic north:
  tenements, the green, the school, the reading room.

## 2. Identity — why Linden Hill is not Alder with a new name

North of a working spine sits the neighborhood that raised it: walk-ups
with fire escapes and rear yards, a branch reading room, a public school
with a fenced yard, and the green where the two blocks never sold. The
east half keeps the yards' low iron and timber. Real-New-York inspiration:
the Harlem's west edge into Morningside — civic brick on a rise, then the
el continuing north.

- **Roofline:** tenements 12–15 m, the school 11 m, the reading room 9 m —
  the band reads LOW from the spine (the far rows hide it: §5), rising to
  the gas holder's 20 m frame in the east.
- **Signature:** the gas holder (LMK-17) — the north silhouette's beat;
  the school's date-stone + flagpole (LMK-16) — the civic beat.
- **The green:** PRK-LINDEN fills the central block (x −60..60) — the
  district's lungs, playground SW, park house NE.

## 3. Streets (registry rows)

| Street | Class | Geometry | Character |
|---|---|---|---|
| **STR-HAZEL** | secondary, E-W | road z 68..76, walks 64..68 / 76..80, spanX [−100, 252] | the band's south street — the school's front, the tenements' stoops |
| **STR-MULBERRY** | secondary, E-W | road z 116..124, walks 112..116 / 124..128, spanX [−100, 252] | the quiet north street — rear yards, the holder's fence |
| STR-JUNIPER (amended) | avenue, continued | spanZ −64..64 → **−64..160** | the local avenue's north reach |
| STR-SYCAMORE (amended) | avenue, continued | spanZ → **−64..160** | the commercial avenue's north reach |
| STR-SPUR (amended) | pedestrian bed, continued | spanZ → **−64..160** | the spur's north reach under the viaduct |
| STR-LARCH (amended) | secondary, continued | spanZ → **−64..160** | the east row's north reach |

Nav lanes (the LANES table): Hazel N/S z 77.6/66.4, Mulberry N/S
z 125.6/114.4 — inside the walk bands and OFF the 6 m grid (the junction
off-grid law: an on-grid lane offset lands the corner junctions on the
avenue chains' own base nodes and the dedup strands them as trap nodes —
the wave's own caught bug, the fix is the law). Z_SPAN grows −48..48 →
**−48..152** (the avenues' walker lanes extend north; the band's doors
have no interiors this wave — shells only, the W-C1 scope law).

## 4. Blocks and buildings (15 masses, `LNH-*`, all `regShell`)

Blocks: BLK-LNH-A..N (the fourteen block rows, bbox in the patch script)
+ BLK-LNH-PK (the green).

| ID | Name | Footprint (x, z, w, d) | H | Notes |
|---|---|---|---|---|
| LNH-01 | The Alder Walk-ups (west) | −92, 95, 12, 18 | 15 | fire escape, face E (Juniper) |
| LNH-02 | The Alder Walk-ups (north) | −92, 145, 12, 18 | 15 | fire escape, face E |
| LNH-03 | The Linden Reading Room | −48, 96, 20, 18 | 9 | arched windows, stone trim, face W (Juniper) |
| LNH-04 | **The Linden School** | 49, 96, 22, 20 | 11 | the date-stone (LMK-16), flagpole; face S (Hazel); fenced yard north |
| LNH-05 | The Sycamore Walk-ups | 92, 95, 14, 18 | 15 | fire escape, face W |
| LNH-06 | The Sycamore Walk-ups (north) | 92, 145, 14, 18 | 15 | fire escape, face W |
| LNH-07 | Osier Timber & Sash | 119, 96, 38, 20 | 8 | the timber yard — shed line + stacked stock (kit), face S |
| LNH-08 | The Linden Gas Works holder | 119, 145, 18, 18 | 20 | the frame tank (LMK-17) — ROOF_SKIP, the kit dresses it |
| LNH-09 | The Gas Works shed | 138, 146, 12, 16 | 9 | the works' low brick |
| LNH-10 | Mulberry Storage | 179, 96, 34, 20 | 12 | face S |
| LNH-11 | The Mulberry Loft | 209, 96, 14, 20 | 14 | face S |
| LNH-12 | North Storage | 181, 147, 36, 18 | 10 | face S |
| LNH-13 | The Holder Walk-ups | 209, 147, 14, 18 | 15 | fire escape, face S |
| LNH-14 | Larch North Walk-up | 244, 96, 12, 18 | 13 | face W (Larch) |
| LNH-15 | Larch North Storage | 244, 147, 12, 18 | 12 | face W |

**Scope law (the W-C1 docks precedent): shells only** — no interiors, no
businesses, no residents, no story content this wave. The Anti-Slop gate
holds: bay rhythm, window grids and cornices vary by per-row seeded PRNG;
the roof fabric dresses new rows automatically (LNH-08 ROOF_SKIP — the
holder frames itself).

## 5. The lattice reality — priced before building (the DEC-12 law)

**The row-grid growth is the wave's own infrastructure change:**

- `DIST_ROWS` 3 → **10**; the row formula `(z + 48) / 32` →
  `(z + 144) / 32` — row boundaries at z ≡ −16 (mod 32), so the Day-1
  spawn (z 0) sits in row 4 exactly as it sat in row 1.
- `ROW_RING` 1 → **2** (a five-row, 160 m window). The spawn-lit set stays
  byte-identical: rows 2..6 = z −80..112 = today's full content (the far
  strips, the spine, the inner blocks) + empty rows cost nothing.
- The band's rows (7..9) are dark at spawn. The far rows (z 48..64, h
  8–10) occlude every band mass from the spine's sightline (the angular
  check: the school 11 m at z 86 hides behind the 9 m far rows; the
  holder 20 m at z 136 — 0.135 < 0.140 — hides; the SKY-N cards keep the
  horizon).
- Ring-edge pops sit at ≥ 80 m behind the walking player — the columns'
  own fog-law class (the shipped boundary pops at 130 m at half fog), and
  the street canyons occlude most of it. The far rows stay lit from the
  band's south edge (row 6 in-ring through row 8).
- **The band's ground pair** (the two-draw ground law, north edition)
  registers to row 7 — it lights with the band's first row, never at
  spawn.

## 6. The connections (the directive's acceptance core)

- **Hazel/Mulberry butt-joint the avenues** at all eight intersections
  (IX-HJ/HS/HP/HL, IX-MJ/MS/MP/ML) — 32 crosswalk rows (4 per corner, the
  GJ/GS pattern: 2 across the E-W street, 2 across the avenue), zebras
  rendered by the shipped helper.
- **The avenues re-span north**: their ground slabs, walks and lane
  splices continue z 64..160; the far blocks' rear strips (z 48..64) keep
  their fences — the yards read through.
- **The viaduct's north reach**: deck + parapets + girders continue
  z 64..160 on column pairs at z 84/110/134/156 (clear of Hazel,
  Mulberry and every mass); the bed's north reach carries rails, sleepers,
  weeds and timber crossings at both streets.
- **Walls:** the north wall SPLITS — the x −450..−100 segment stays at
  z +64 (the void west of the band keeps its edge); the band's own north
  wall moves to z +160 (x −100..+252). The west/east walls re-span
  z −64..160 (depth 224). The south wall unchanged.
- **Skyline:** SKY-N moves z 90 → **170** (10 m clear of the new wall);
  the north horizon keeps its closure.

## 7. Nav, sim, performance

- `NAV_BOUNDS.zMax` 48 → 152 (the graph's validation bounds follow the
  registry; the walkers' loops stay south this wave — the band's walker
  loops price as the next wave, the WP-EAST pattern).
- The four avenues' lanes extend north (Z_SPAN −48..152); the new E-W
  lanes ride their own spanX; the crossing derivation reads the 32 new
  crosswalk rows (the axis law — the EW rows carry axis EW, the NS rows
  axis NS).
- Sim fence: no new NPC intelligence, no new loops, no transit changes
  (the M121's rectangle loop and the taxi rail are untouched — the band's
  transit integration prices as a later wave, the W-N3/W-C7 pattern).
- Draw budget: spawn census must stay < 200 (expected byte-identical —
  the same lit set re-keyed); the band's own lit census reads ≤ 200
  standing anywhere inside it (the probe's north rigs measure).
- No new async assets: everything is palette geometry + canvas textures
  (the budget-honesty law).

## 8. Waves

| Wave | Content | Gate |
|---|---|---|
| W-N4 | the registry patch (2 streets, 4 span amendments, 15 blocks, 15 masses, the green, LMK-16/17, 8 intersections, 32 crosswalks, bounds, phase row v1.85.0) | validator green |
| W-N5 | the lattice growth (rows/ring/formula), the walls split, NAV_BOUNDS, SKY-N, the ground pair registered to row 7 | battery + spawn census byte-identical |
| W-N6 | lindenHillKit.ts (masses, the green, the school, the reading room, the holder, the viaduct north reach, the bed, furniture, signs, fire escapes) + the evidence probe | battery + frames + walk leg |
