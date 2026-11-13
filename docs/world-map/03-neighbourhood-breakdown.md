# 03 — Neighbourhood Breakdown (the five street identities)

> **Status:** Design-lock deliverable (2026-11-13). The directive's §3D
> "Neighbourhood visual targets" mandate: "For every major neighbourhood,
> produce a visual reference or concept showing its intended identity.
> Different neighbourhoods must not all look identical."
>
> The five streets of Alder Heights each carry a distinct identity — written in
> the world bible (doc 04 §2), built in the shipped code, and locked here. The
> "neighbourhood visual target" for each street is the identity the shipped
> code already expresses; the next agent's job is to capture the frame, not to
> invent a new one.

---

## 1. Kestrel Street — the commercial spine, the "story street"

| | |
|---|---|
| **Identity** | The street the player spends most of their time on. The story spine's first movement (Day 1–4) lives here. |
| **Density** | High — ground-floor storefronts on both sides, residential above. |
| **Building heights** | 3–5 stories (low-rise commercial + walk-up). |
| **Key buildings** | Rosa's Deli & Grocery (ROS-01), Corner Slice Pizza (KTN-04, Eddie), Fade King barbershop (KTN-05, Deon), the café shell at 6 Kestrel East (KTN-06 → becomes Halcyon), Kestrel Hardware (SMB-03, the Oktays), B-side Records. |
| **Street furniture** | Hydrants, streetlights, newsracks, benches, the DIRTY WATER DOGS cart, the M121 bus stop, utility poles + span wires. |
| **Public spaces** | Corner Park (Tito's dominoes table — the senate), Kestrel Green (the pergola finished C3, the hundredth tree C6). |
| **Landmarks** | Rosa's rooftop billboard; the Ginkgo Walk-up's proud windows. |
| **Visual target** | A warm, busy, golden-hour commercial street. Storefronts with awnings and lit signs; the bodega's grate half-up; the pizza oven's glow through the window; the barbershop's pole turning. The kind of street where a stranger asks directions and gets a slice recommendation instead. |
| **Shot to capture** | `existing-kestrel-looking-east.png` — Kestrel looking east from x = −60, z = 0, golden hour. |

## 2. Juniper Avenue — institutional row; the K runs beneath

| | |
|---|---|
| **Identity** | The avenue with the institutional weight: the Alder Works Hall (the conflict's prize), the K station houses, the mosque. Quieter than Kestrel; the sidewalk is wider; the K rumble is underfoot. |
| **Density** | Medium — civic and institutional buildings, wider setbacks, the station houses. |
| **Building heights** | 2–4 stories (the Works Hall is the mass; the station houses are low). |
| **Key buildings** | Alder Works Hall (KCM-01 — the conflict's prize, the Ghost Sign), the K station houses (SUB-01/02 — Priya's bench is at the north house), Masjid an-Nur, Juniper Mutual Aid (papered window, folding tables). |
| **Street furniture** | The subway entrances (the K-Globe posts), the station's sync screens, benches, the bus stop. |
| **Public spaces** | Subway Plaza (the K station's plaza). |
| **Landmarks** | The K-Globes; the Ghost Sign ("ALDER WORKS — KITCHENS · CABINETS · FIXTURES · EST. 1921"); the Works marquee. |
| **Visual target** | A wider, more institutional avenue. The Works Hall's brick mass and ghost sign on one side; the K station's globe post and stair on the other. The sidewalk reads as a place you wait for the train, not a place you shop. |
| **Shot to capture** | `existing-juniper-looking-north.png` — Juniper looking north from x = −90, z = 0. |

## 3. Sycamore Avenue — big storefronts, the diner, the fruit stand

| | |
|---|---|
| **Identity** | The avenue of the big storefronts — the diner, the bakery, the fruit stand. The Diner Sign is the landmark. Busier than Juniper, less story-dense than Kestrel. |
| **Density** | High — big ground-floor storefronts, residential above. |
| **Building heights** | 3–5 stories (commercial + walk-up). |
| **Key buildings** | The Alder Heights Diner (SND-01, Big Mike), Marlow Bakery, Sycamore Studios, the fruit stand, the Ascension Church (Father Mike — the parish's boiler fund will matter, doc 09). |
| **Street furniture** | The Diner Sign (the landmark), hydrants, the fruit stand's crates, the diner's neon. |
| **Public spaces** | The Diner's counter (the wire service — see doc 04 §4 gossip physics), the Ascension Church's steps. |
| **Landmarks** | The Diner Sign (Sycamore's landmark); the bakery's bread racks. |
| **Visual target** | A bright, neon-lit avenue. The Diner Sign as the anchor; the fruit stand's crates on the sidewalk; the bakery's warm window. The avenue reads as the place you eat, not the place you live. |
| **Shot to capture** | `existing-sycamore-looking-south.png` — Sycamore looking south from x = +90, z = 0. |

## 4. Gable Street — Gable Row, the stoop street

| | |
|---|---|
| **Identity** | The stoop street. Brownstones stepping down the north slope, the Cecil (Leo's room) at the top, the Okafor house and Fatima's on the row. The Gable Garden behind the row. |
| **Density** | Low-medium — rowhouses with stoops, front gardens, the back garden slot. |
| **Building heights** | 3–4 stories (brownstones with high stoops). |
| **Key buildings** | Brownstone Row and the Cecil (KTS-01/02 — Leo's room is the Cecil's top floor; the kid Eli is the teal door on its ground floor), Gable Row 1–5 (the Okafor house; Fatima's), the East Tenement (El Vann's paper walls). |
| **Street furniture** | Stoops (the high-stoop law — 0.12 riser), the gated garden mouths (W10 — the Gable Garden's full gate chain from the Green through the (4,24) gate to the beds), the fire escapes (W12 filigree — 170 alpha-cutout ironwork panels). |
| **Public spaces** | Gable Garden (the Okafor house's garden slot, the W10 gate from the Green). |
| **Landmarks** | The Cecil's proud windows (the Skyline of Lit Windows — Leo's room); the brownstone stoops. |
| **Visual target** | A residential street of brownstones with high stoops. The stoop culture reads in one frame — neighbors on the steps, the garden gate, the fire escape's ironwork. The street reads as a place you live, not a place you shop. |
| **Shot to capture** | `existing-gable-row-stoops.png` — Gable Street, the stoop row, ground level. |

## 5. Marlow Street — bakery row, the playground

| | |
|---|---|
| **Identity** | The bakery row and the playground. Built on a 1970s fire lot (the playground is the surplus). The Alley and the Garden Slot are here. |
| **Density** | Low — the bakery, the walk-ups, the playground, the alley. |
| **Building heights** | 2–4 stories (walk-ups + the bakery). |
| **Key buildings** | Marlow Bakery, the walk-ups (the Old Law tenements on 25 ft lots — registry `meta.researchBasis.typology`), the PLY-MARLOW playground equipment (the swing set, the spray basin). |
| **Street furniture** | The bakery's bread racks, the playground's swing set and spray basin, the alley's gate. |
| **Public spaces** | Marlow Playground (built on a 1970s fire lot, the swing set, the spray basin, Alma Reyes's earmark rescues the swings C3), the Alley and the Garden Slot (ALY-01/02). |
| **Landmarks** | The bakery's ovens (the warm window); the playground's swing set (the C3 earmark story). |
| **Visual target** | A quieter residential street. The bakery's warm window on one corner; the playground's swing set on the other; the alley's gate between them. The street reads as the place where the block's kids grow up and where the block's bread comes from. |
| **Shot to capture** | `existing-marlow-bakery-row.png` — Marlow Street, the bakery row + the playground. |

## 6. The destination — Times Square (one ride west)

| | |
|---|---|
| **Identity** | The postcard moment, the city's other face. The K line ride (22 s) is the transition; the canyon is the arrival. |
| **Density** | Extreme — the canyon of billboards, the synced screens, the red steps. |
| **Building heights** | Tall — the canyon walls. |
| **Key buildings** | The 42 St-Times Square station (SUB-destination), the canyon billboards, the red steps. |
| **Street furniture** | The sync screens, the red steps, the canyon's lit facades. |
| **Landmarks** | The sync screens; the red steps; the canyon's billboards. |
| **Visual target** | A vertical canyon of light. The contrast with Alder Heights is the point — the block is the life, the ride is the visit, the canyon is the postcard. |
| **Shot to capture** | `existing-times-square-arrival.png` — the canyon on step-off from the K station. |

## 7. The identity contrast (the design law)

The five streets must not look identical. The contrast is the design:

- **Kestrel** = warm, busy, commercial, golden-hour.
- **Juniper** = wide, institutional, the K rumble, the Works Hall's mass.
- **Sycamore** = bright, neon, the diner, the avenue of eating.
- **Gable** = residential, stoops, brownstones, the garden gate.
- **Marlow** = quiet, the bakery, the playground, the alley.
- **Times Square** = the canyon of light, the postcard moment.

The contrast is what makes the block read as a neighborhood and not a set. The
1-Second Law (AGENTS.md §1) applies to each street individually: a paused frame
on any of the five must be identifiable as that street, not just "New York".

— Z.ai agent, 2026-11-13
