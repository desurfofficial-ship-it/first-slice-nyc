# 02 — Complete World Design (the locked blueprint)

> **Status:** Design-lock deliverable (2026-11-13). This is the **visual
> blueprint's destination** the directive (§5) names: "the map blueprint must
> reflect the actual game design, not an unrealistic concept-art vision. Build
> towards the documented target."
>
> **The law this design serves** (AGENTS.md §0): "FIRST SLICE is **not an
> open-world game — it is a life sim on an open block**." The complete world is
> therefore **one neighborhood** (Alder Heights) + **one destination** (Times
> Square, one ride west). It is not five boroughs. It is not a huge map. It is
> a compact, rich, walkable block where every building has a purpose and every
> major interaction has a meaningful experience or consequence.

---

## 1. What the complete world looks like (one paragraph)

Alder Heights is a working upper-Manhattan neighborhood — the ridge between
Harlem and Washington Heights as the map would say, except the map doesn't
bother, which the residents consider a compliment. One commercial street
(Kestrel) stitched between two avenues (Juniper with the K under it, Sycamore
with the diner sign), brownstones stepping down the north slope, walk-ups and a
bakery row to the south, the old Alder Works hall holding the block's best ghost
sign, three wooden water towers keeping the skyline honest. The K line runs
under Juniper to 42 St-Times Square, one ride west — the destination, the
postcard moment, the city's other face. The block is the life; the ride is the
visit.

## 2. How large is it?

| Boundary | x range | z range | Area | Role |
|---|---|---|---|---|
| **world (scene graph)** | −450 → +136 | −64 → +64 | ~75,000 m² | The full scene: Alder Heights + the K tunnel + Times Square |
| **playableCore (walkable surface)** | −100 → +100 | −64 → +64 | ~25,600 m² | The walkable block — every meter is reachable |
| **Alder Heights block (the named buildings)** | ~−90 → +90 | ~−50 → +50 | ~9,000 m² | The 81 buildings, 7 parks, 21 interiors |
| **Times Square canyon (the destination)** | ~−420 → −380 | ~−30 → +30 | ~1,200 m² | The postcard moment, one ride west |

**The scale law** (registry `meta.researchBasis.grid`): the 1811 Commissioners'
Plan reference proportions (avenues 100 ft / 30 m, cross streets 60 ft / 18 m,
blocks 200 ft × 620–920 ft) compressed ~25% for game density. The ratio
avenue > street is preserved. **This is not a huge map.** It is a block you can
walk end-to-end in 90 seconds and know by name in a week.

## 3. The neighbourhoods the world contains

The world contains **one neighborhood** (Alder Heights) with **five street
identities** (the sub-areas the directive's §3D "neighbourhood visual targets"
mandate):

1. **Kestrel Street** — the commercial spine, the "story street". Rosa's, Corner
   Slice, Fade King, the café shell → Halcyon, Kestrel Hardware, B-side Records.
2. **Juniper Avenue** — institutional row; the K runs beneath. The Alder Works
   Hall, the K station houses, Masjid an-Nur, Juniper Mutual Aid.
3. **Sycamore Avenue** — big storefronts, the diner, the fruit stand. The
   Alder Heights Diner, Marlow Bakery, Sycamore Studios, the Ascension Church.
4. **Gable Street** — Gable Row, the stoop street. Brownstone Row, the Cecil
   (Leo's room), the Okafor house, Fatima's, the Gable Garden.
5. **Marlow Street** — bakery row, the playground. Marlow Bakery, Marlow
   Playground (the 1970s fire lot), the Alley and the Garden Slot.

**Plus the destination:** Times Square (one ride west on the K line).

See `03-neighbourhood-breakdown.md` for the per-street visual identity, density,
height, and landmark roster.

## 4. The main roads and secondary streets

| Road | Class | Width | Role |
|---|---|---|---|
| **Kestrel Street** | Main road (commercial spine) | ~14 m (2 lanes + 2 sidewalks) | The story street; the player spends most of their time here |
| **Juniper Avenue** | Main road (avenue) | ~18 m (avenue > street ratio) | The institutional row; the K runs beneath |
| **Sycamore Avenue** | Main road (avenue) | ~18 m | The big storefronts; the diner sign |
| **Gable Street** | Secondary street (cross-street) | ~12 m | The stoop street; the brownstones |
| **Marlow Street** | Secondary street (cross-street) | ~12 m | The bakery row; the playground |
| **The K line** | Subway (the ride) | tunnel | Juniper → 42 St-Times Square, 22 s ride |

See `04-road-and-location-layout.md` for the full road graph, intersections, and
sidewalk law.

## 5. Where the residential, commercial, and public areas are

- **Commercial:** Kestrel Street (Rosa's, Corner Slice, Fade King, Halcyon,
  Kestrel Hardware, B-side Records, the DIRTY WATER DOGS cart) + Sycamore Avenue
  (the Diner, Marlow Bakery, Sycamore Studios, the fruit stand).
- **Residential:** Gable Street (Brownstone Row, the Cecil, Gable Row 1–5, the
  Okafor house, Fatima's) + Marlow Street (the walk-ups, the East Tenement) +
  the upper floors of the Kestrel commercial buildings (the Ginkgo Walk-up).
- **Public spaces:** 7 parks — Corner Park (Tito's dominoes table), Kestrel
  Green (the pergola, the hundredth tree), Gable Garden (the Okafor slot),
  Marlow Playground (the swing set, the spray basin), PRK-LARKIN and PRK-CARROW
  (the W6 terrace gardens), Subway Plaza (the K station's plaza).
- **Institutional:** Juniper Avenue (the Alder Works Hall, the K station
  houses, Masjid an-Nur, Juniper Mutual Aid) + Sycamore (the Ascension Church).

## 6. The major landmarks (the registry's `landmarks` table, all built)

- The K-Globes (the K station's globes),
- Rosa's rooftop billboard,
- the Three Towers (the wooden water towers),
- the Diner Sign (Sycamore's landmark),
- the Garden Mural (Lena and Odd, painting across the weeks),
- the Ghost Sign ("ALDER WORKS — KITCHENS · CABINETS · FIXTURES · EST. 1921"),
- the Works marquee,
- the terminal's sync screens,
- the red steps.

## 7. How each neighbourhood connects to the others

The five streets are a **grid**, not a hub:

- Kestrel runs E-W, the commercial spine.
- Juniper and Sycamore run N-S, the two avenues, parallel, on either side of
  Kestrel.
- Gable and Marlow are the cross-streets, running N-S, east of the avenues.

**Connections:**

- Kestrel intersects Juniper (west end) and Sycamore (east end) — the two avenue
  corners are the block's main gates.
- Gable intersects Kestrel (mid-block) and runs north to the Gable Row stoops.
- Marlow intersects Kestrel (east end, near Sycamore) and runs south to the
  bakery row and the playground.
- The K line subway entrance is on Juniper (the SUB-01 station house); the ride
  terminates at 42 St-Times Square (the destination).
- The four terrace garden gates (W10): N x −30 / x 33, S x −19 / x 42 — open
  the backdrop rows' garden strips to the sidewalk.

## 8. Which buildings require complete interiors

**21 interiors, all shipped** (W5/W8 + the W11 registry-truth repair). The
story-bearing Class A rooms:

- ROS-01 (Rosa's Deli & Grocery),
- KTN-02 (Sunrise Laundry),
- KTN-04 (Corner Slice Pizza),
- KTN-05 (Fade King barbershop),
- KTN-06 (Halcyon / the café shell),
- KTS-02 (the Cecil — Leo's room, top floor),
- SMB-03 (Kestrel Hardware),
- SND-01 (the Alder Heights Diner),
- KCM-01 (the Alder Works Hall),
- SUB-01/02 (the K station houses),
- the Marlow Bakery,
- B-side Records.

Plus the Class B service bays (the bodega, the fruit stand, the barbershop's
service side, the laundromat's machine bay) and the W8 strip-row interiors. See
`05-building-and-interior-plan.md` for the full interior plan.

## 9. How the existing map fits into the final design

**The existing map IS the final design.** This is the design lock: the shipped
code at commit `44534bb` (registry v1.64.0) is the blueprint's destination. The
world-map package does not propose a new map — it documents the map that ships
and locks it as the target.

The only proposed work (not new construction, but documentation and evidence):

1. The live screenshot set (§6 of `01-existing-world-audit.md`).
2. The top-down map render (the directive's §3A).
3. The 3D overview render (the directive's §3B).
4. The neighbourhood visual targets (the directive's §3D).
5. The street-level reference library (the directive's §3C and
   `06-visual-reference-library.md`).

No new neighbourhoods. No new streets. No new boroughs. The block is the world.

## 10. The design lock

> **Design lock (2026-11-13):** the world-map blueprint is the shipped code at
> commit `44534bb`, registry v1.64.0. The five streets, the 81 buildings, the
> 21 interiors, the 7 parks, the 23 anchors, the K line ride, the Times Square
> canyon — this is the destination. The implementation is the deliverable.
>
> If technical limitations or discoveries require changes:
> 1. Explain the reason.
> 2. Update the blueprint (this document + `01-existing-world-audit.md` +
>    `07-map-completion-checklist.md`).
> 3. Update the registry (`docs/data/world-registry.json`).
> 4. Preserve consistency across the map.
>
> Do not repeatedly redesign the city during construction. The block is locked.

— Z.ai agent, 2026-11-13
