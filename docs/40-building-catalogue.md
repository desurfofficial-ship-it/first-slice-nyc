# Doc 40 — Building Catalogue: every planned building, before construction

> **Deliverable B.** The complete building inventory of Alder Heights. Every entry
> exists in [`docs/data/world-registry.json`](data/world-registry.json) with its exact
> footprint; this document is the human-readable catalogue and the classification
> rationale. Validation is automated — `scripts/design/validate-registry.mjs`
> re-checks IDs, bounds, overlaps, block membership, road clearance, and shipped-world
> fidelity on every run.

---

## 1. The classification law

| Class | Meaning | Count | Rule |
|---|---|---|---|
| **A** | Fully enterable — interior required | 5 (+2 optional shells) | Rosa's (shipped), The Cecil's player room, the café shell (reserved), the Diner, Alder Works Hall |
| **B** | Ground-floor interior / service bay | 10 | Laundry (bay shipped → full interior), barber, pizza, bakery, records, hardware, terminal, both subway houses |
| **C** | Exterior-only — facade life, no interior promise | 16 | Brownstones, walk-ups, tenements, the court building |
| **D** | Backdrop mass / skyline street wall | 10 | Avenue outer faces + Gable/Marlow far rows; no interiors, no walkable depth behind |

**The brief's performance clause, honoured:** not every building is enterable.
5 A-class + 7 B-class interiors is the entire interior burden — every one of them
planned to the fixture level in [docs/41](41-interior-design-catalogue.md) before a
single wall is built. **Important gameplay buildings are never empty boxes**: every
location the story or a loop touches is Class A or B.

## 2. Existing buildings (12) — numbers copied from the shipped code, load-bearing

| ID | Name | Footprint (x, z, w×d) | H | Fl | Class | Entrance | Notes |
|---|---|---|---|---|---|---|---|
| KTN-01 | Alder Heights Terminal | −35.5, 14, 29×12 | 14 | 4 | B | door x −30, faces S | `Bldg_N_West`; Day-1 arrival; interior planned W5 |
| ROS-01 | Rosa's Deli & Grocery | −16, 14, 10×11.6 | 4.5 | 1 | **A** | gap x −17.5..−14.5 | full interior EXISTS (BODEGA-INT); walkable roof + billboard |
| KTN-02 | Sunrise Laundry bldg | −1, 14, 20×12 | 18 | 6 | B | open bay x −5 | `Bldg_N_East_A`; bay exists (washers, Sal); full interior W5 |
| KTN-03 | The Ginkgo Walk-up | 15, 14, 12×12 | 11 | 3 | C | teal door x 15 | `Bldg_N_GoldWindow`; the window diary lives here |
| KTN-04 | Corner Slice Pizza | 25.85, 14, 9.7×12 | 16 | 5 | B | x 27 | west half of split mass; interior W5 |
| ALY-01 | The Alley | 32.1, 9.3, 2.8×2.6 | 3 | — | C | z 8 | real slot between split masses; Station the cat |
| KTN-05 | Fade King bldg | 41.25, 14, 15.5×12 | 16 | 5 | B | x 36.6 | east half; barbershop + half-court face |
| KTS-01 | Brownstone Row (S) | −25, −14, 50×12 | 16 | 5 | C | stoops x −40/−34/−28 | `Bldg_S_West`; one mass reading as 4 houses |
| KTS-02 | **The Cecil** | 13, −14, 26×12 | 14 | 4 | **A** | fire-escape ladders x 9.4/16.4 | `Bldg_S_FireEscape`; **player's home** (CECIL-ROOM); roof = stage-5 Rooftop |
| KTS-03 | The East Tenement | 38, −14, 24×12 | 18 | 6 | C | x 38 | `Bldg_S_East`; mural gable (LMK-05) |
| SUB-01 | K station — north house | −42, 6.2, 2.6×3.5 | 3.2 | — | B | stair | shipped entrance + collider; on-plaza furniture |
| VND-01 | DIRTY WATER DOGS cart | 29.8, −4.55, 1.7×0.9 | 2.2 | — | C | — | shipped vendor; 2.55 m cab clearance |

## 3. Planned buildings (31) — grouped by face

### Kestrel N face infill + reserved shells
| ID | Name | Footprint | H | Cl | Purpose |
|---|---|---|---|---|---|
| KTN-00W | The Corner House | −55, 14, 10×12 | 16 | B | Chamfered corner store anchoring Kestrel×Juniper NE; dry-goods interior optional |
| KTN-06 | **6 Kestrel St East — café shell** | 55, 14, 10×12 | 16 | **A** | **RESERVED: Slice-Ladder stage 3.** Vacant/“FOR RENT” until the story opens it |

### Gable S face — the brownstone row
| ID | Name | Footprint | H | Cl | Purpose |
|---|---|---|---|---|---|
| GRB-01 | The Okafor house | −42.6, 26, 7.6×12 | 12.5 | C | Stoop-sale Saturday host |
| GRB-02 | Gable Row 2 | −35, 26, 7.6×12 | 12.5 | C | — |
| GRB-03 | **Fatima's** | −27.4, 26, 7.6×12 | 12.5 | C | Under restoration (scaffold dressing); GDD Regular hook |
| GRB-04 | Gable Row 4 | −19.8, 26, 7.6×12 | 12.5 | C | — |
| GRB-05 | Gable Row 5 | −12.2, 26, 7.6×12 | 12.5 | C | — |

*(7.6 m = the real 25 ft rowhouse lot; five houses + gardens + green + parking
fill the face without a dead metre.)*

### Juniper E face
| ID | Name | Footprint | H | Cl | Purpose |
|---|---|---|---|---|---|
| KCM-01 | **Alder Works Hall** | −54, 26, 12×12 | 15 | **A** | Community hall (HALL-INT); landmark LMK-07; block party rain plan |
| TEN-01 | Juniper Tenements | −55, −14, 10×12 | 17 | C | Old-Law pair with the 1 m light-slot; laundry-line dressing W4 |
| SRC-02 | Juniper Court | −55, −26, 10×12 | 15 | C | Pre-war walk-up |

### Sycamore W face
| ID | Name | Footprint | H | Cl | Purpose |
|---|---|---|---|---|---|
| KTN-07 | Sycamore Studios | 54, 26, 12×12 | 15 | C | Artist ground floor; Lena & Odd world edge |
| SND-01 | **Alder Heights Diner** | 55, −14, 10×12 | 13 | **A** | Corner anchor (DINER-INT); LMK-04; Doc 37 §3A's "small diner" |
| SRC-01 | Sycamore Court | 55, −26, 10×12 | 17 | C | Corner walk-up (Sycamore×Marlow) |

### Marlow N face — the row
| ID | Name | Footprint | H | Cl | Purpose |
|---|---|---|---|---|---|
| PWK-01 | Marlow West Walk-up | −44, −26, 8×12 | 15 | C | — |
| SMB-01 | **Marlow Bakery** | −34, −26, 8×12 | 12 | B | BAKERY-INT; the bagel silhouette in the window (object canon #8) |
| SMB-02 | **B-side Records** | −25, −26, 6×12 | 12 | B | RECORD-INT; **the Happy-Accident shop** (GDD §4.3) |
| SMB-03 | Kestrel Hardware | −17, −26, 6×12 | 12 | B | Errand logic; interior can stay dressed-only |
| PWK-02 | Marlow Mid A | 5, −26, 10×12 | 15 | C | — |
| PWK-03 | Marlow Mid B | 17, −26, 10×12 | 15 | C | — |
| *(x 22..50)* | rear yards + parking | — | — | — | Honest gap: dressed yards, PRK-02 strip; no fake storefronts |

### Station + street commerce
| ID | Name | Footprint | H | Cl | Purpose |
|---|---|---|---|---|---|
| SUB-02 | K station — south control house | −57, −6.25, 6×3.5 | 3.4 | B | Cream metal-and-glass pavilion ON the SW corner sidewalk (real NYC type); twin globes |
| VND-02 | Fruit stand (Sycamore) | 62.5, −18, 2.2×1.2 | 2.2 | C | GOLDEN ORCHARD PRODUCE CO. stand — brand continuity with the shipped van |

### Class D street walls (avenue backdrops + far rows)
| ID | Footprint | H | Notes |
|---|---|---|---|
| VDN-DW1a/b/c/d | x −82..−74, segments z 8..32 / 48.5..58.5 / −32..−8 / −58.5..−48.5 | 14–17 (one 21) | Juniper W side; segmented at intersections like real blocks |
| VDN-DE1a/b/c/d | x 76..84, same segment pattern | 14–17 (one **22**) | Sycamore E side; the tall slab is the avenue's skyline note |
| VDN-DN1 | x −60..60, z 48.5..58.5 | 13 | Rowhouse roofline strip; existing SKY-N card behind |
| VDN-DS1 | x −60..60, z −58.5..−48.5 | 14 | Mirror; SKY-S card behind |

## 4. Typology and architectural character (per face)

- **Brownstones (GRB row, KTS-01 fronts):** 3–5 floors, 7.6 m lots, high stoops
  (6 risers + landing, matching the shipped stoop builders), tall parlor windows,
  cornices; door colours drawn from the existing palette set (teal / coral / plum —
  the shipped `stoopDoors` array).
- **Pre-war walk-ups (PWK/SRC/KTN-00W/06/07):** 5–6 floors, brick (PAL.bldg /
  bldg2 family), cornice + water-tank caps, storefront base on commercial faces.
- **Tenements (TEN-01, KTS-02/03 grammar):** 4–6 floors, narrower slots and light
  wells, fire-escape silhouettes (the shipped `makeFireEscapeDeco` builder).
- **Civic/commercial (KTN-01 terminal, KCM-01 hall, SND-01 diner):** limestone-ish
  bases (PAL.stone), signage through the existing canvas sign factory only.
- **Heights profile:** 11–18 m across the core, one 22 m avenue exception —
  under the real heights' mid-block grain, and the skyline cards carry everything
  above.

## 5. Relationship rules (the anti-"scattered boxes" law)

1. Party walls touch; the only gaps are **intentional and typological** (the alley,
   the tenement light-slot, the rear-yard mid-block).
2. Every planned entrance faces a sidewalk of the street its `face` names —
   validated (validator §5–6).
3. Corner buildings get **chamfers or corner doors** on avenue corners
   (KTN-00W, SND-01, SRC-01, KTN-06) — the NYC corner-store cut.
4. Building masses never enter a roadway (validated); the only street-zone
   occupant is SUB-02, a legal sidewalk control house.
5. Every face's ground floor is either a door, a window display, or planted —
   no blank walls longer than ~8 m anywhere a camera lands.

## 6. Machine-readable source

The registry's `buildings[]` is the authority — this catalogue is its projection.
If a number disagrees, **the validator fails and the registry is wrong or the code
moved**: fix the data, never the doc by hand.
