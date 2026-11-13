# 04 — Road and Location Layout (the street graph + key locations)

> **Status:** Design-lock deliverable (2026-11-13). The road and location
> layout is the registry's `streets` + `locations` tables, locked at registry
> v1.64.0. The shipped code in `web-three/src/world/World.ts` (the
> `_build_world` greybox + the W0–W12 additions) implements this layout
> exactly.

---

## 1. The street graph

```
                 (north, z = +64)
                        |
            ┌───────────┬───────────┐
            │                       │
       Juniper Ave              Sycamore Ave
       (x ≈ −90)               (x ≈ +90)
            │                       │
            │                       │
  ──────────┼──────────────────────┼──────────  (west, x = −450 → K tunnel → Times Square)
            │     Kestrel Street    │           (Kestrel runs E-W through both avenues)
  ──────────┼──────────────────────┼──────────  (east, x = +136 → SKY-E skyline)
            │                       │
            │   Gable St    Marlow St
            │   (x ≈ −30)   (x ≈ +30)
            │   (cross-streets, run N-S, east of Juniper)
            │                       │
            └───────────┴───────────┘
                        |
                 (south, z = −64)
```

**The grid:** Kestrel runs E-W (the commercial spine). Juniper and Sycamore run
N-S (the two avenues, parallel, on either side of Kestrel). Gable and Marlow
are cross-streets running N-S, east of Juniper. The K line runs under Juniper
to 42 St-Times Square, one ride west.

## 2. The main roads

| Road | Class | Width | Direction | Role |
|---|---|---|---|---|
| **Kestrel Street** | Main road (commercial spine) | ~14 m | E-W | The story street; the player spends most of their time here. Two lanes + two sidewalks; the sidewalk law (north Kestrel walking lane z 4–7.2, south walking lane z −7.2…−4.3) stays clear of solids. |
| **Juniper Avenue** | Main road (avenue) | ~18 m | N-S | The institutional row; the K runs beneath. Avenue > street ratio (30 m / 18 m) per the 1811 Commissioners' Plan reference. |
| **Sycamore Avenue** | Main road (avenue) | ~18 m | N-S | The big storefronts; the Diner Sign. Same avenue width as Juniper. |

## 3. The secondary streets

| Road | Class | Width | Direction | Role |
|---|---|---|---|---|
| **Gable Street** | Secondary (cross-street) | ~12 m | N-S | The stoop street; the brownstones. Cross-street width (18 m reference) compressed. |
| **Marlow Street** | Secondary (cross-street) | ~12 m | N-S | The bakery row; the playground. Same cross-street width as Gable. |

## 4. The sidewalks (the sidewalk law)

The registry `meta.law` carries the sidewalk law: "north Kestrel walking lane
z 4–7.2 stays clear of solids; south walking lane z −7.2…−4.3 likewise." The
law extends to the avenues and cross-streets — every street has a walking lane
that stays clear of colliders. The W10 walkability scanner
(`diag-pocket-scan.mjs`) is the standing gate: any wave that grows the world
re-runs it and the registered-space traps must read zero.

**The sidewalk carries through every cross-street opening** — the W10 park-gate
fix (the four terrace garden mouths at N x −30 / x 33, S x −19 / x 42) is the
shipped law. The gate is the iron grammar; the sidewalk is the right-of-way.

## 5. The K line subway (the ride)

| | |
|---|---|
| **Entrance** | The K station house on Juniper (SUB-01, the north house; Priya's bench is here). |
| **Stair descent** | The station's south-wall opening (the W11 stair-seal fix parameterized the slot so both stations' exits are open). |
| **Fare lane** | The fare lane walk (the E-press gate). |
| **Car door** | The board (the E-press). |
| **Ride** | 22 real seconds at any frame rate (the W11 ride-rate fix — `trueDt = Math.min(1.0, elapsed)` feeds the ride machine; healthy devices are bit-identical). |
| **Seam** | The `worldToLeg` / `legToWorld` swap at the tunnel midpoint (the `RIDE_SWAP_DX` parameter). |
| **Arrival** | 42 St-Times Square station (SUB-destination). |
| **Step-off** | The exit stair through the unsealed opening (the W11 fix). |
| **Surface** | Times Square canyon. |

## 6. The key locations (the registry's `locations` table)

### 6.1 Kestrel Street locations

| ID | Name | Role | Built in |
|---|---|---|---|
| ROS-01 | Rosa's Deli & Grocery | The deli; the postcard-quest hub | W0–W5 |
| KTN-04 | Corner Slice Pizza (Eddie) | The pizza spot; the Slice Ladder's food spot | W0–W5 |
| KTN-05 | Fade King barbershop (Deon) | The barbershop; the wire service | W0–W5 |
| KTN-06 | Halcyon / the café shell | The café Leo builds (C3); the Slice Ladder's café | W0–W5 + the C3 build-out |
| SMB-03 | Kestrel Hardware (the Oktays) | The hardware store; 31 years by story start | W0–W5 |
| — | B-side Records | The record store; the listening corner | W0–W5 |
| — | The DIRTY WATER DOGS cart | The cart; the Slice Ladder's cart | W0–W5 |
| — | Corner Park | Tito's dominoes table — the senate | W2 |
| — | Kestrel Green | The pergola (C3), the hundredth tree (C6) | W2 + C3 + C6 |

### 6.2 Juniper Avenue locations

| ID | Name | Role | Built in |
|---|---|---|---|
| KCM-01 | Alder Works Hall | The conflict's prize; the Ghost Sign; the food hall site (C6) | W0–W5 |
| SUB-01 | The K north station house | Priya's bench; the K entrance | W0–W5 |
| SUB-02 | The K south station house | The K entrance | W0–W5 |
| — | Masjid an-Nur | Imam Dawan; Idris's five-a.m. crowd | exterior-only |
| — | Juniper Mutual Aid | Yoli's coalition; the papered window | exterior-only (narrative-only per doc 15) |

### 6.3 Sycamore Avenue locations

| ID | Name | Role | Built in |
|---|---|---|---|
| SND-01 | The Alder Heights Diner (Big Mike) | The diner; the wire service; the Diner Sign | W0–W5 |
| — | Marlow Bakery (Sycamore frontage) | The bakery; the warm window | W0–W5 |
| — | Sycamore Studios | The market-rate newcomers' tenancy | W0–W5 |
| — | The fruit stand | The fruit stand; the produce crates | W0–W5 |
| — | The Ascension Church | Father Mike; the parish's boiler fund | exterior-only (narrative-only per doc 15) |

### 6.4 Gable Street locations

| ID | Name | Role | Built in |
|---|---|---|---|
| KTS-01 | Brownstone Row | The brownstones | W0–W5 |
| KTS-02 | The Cecil | Leo's room (top floor); Eli's teal door (ground floor) | W0–W5 + the W5 interior |
| GRB-06/07 | Gable Row 6/7 | The terrace build-out (W6) | W6 |
| — | Gable Row 1–5 | The Okafor house; Fatima's | W0–W5 |
| — | The Gable Garden | The Okafor slot; the W10 gate from the Green | W6 + W10 gate |
| — | The East Tenement | El Vann's paper walls | W0–W5 |

### 6.5 Marlow Street locations

| ID | Name | Role | Built in |
|---|---|---|---|
| — | Marlow Bakery (Marlow frontage) | The bakery row | W0–W5 |
| TEN-02 | The Marlow tenement | The terrace build-out (W6) | W6 |
| PLY-MARLOW | Marlow Playground | The swing set, the spray basin; built on a 1970s fire lot | W2 + the C3 earmark |
| ALY-01/02 | The Alley and the Garden Slot | The alley; the garden slot | W0–W5 |

### 6.6 The destination (Times Square)

| ID | Name | Role | Built in |
|---|---|---|---|
| — | The 42 St-Times Square station | The K line's destination station | W0–W5 + the W11 stair-seal fix |
| — | The Times Square canyon | The postcard moment; the sync screens; the red steps | W0–W5 |

## 7. The traffic and transit

- **The M121 bus** (`world/arrivalBus.ts` + `engine/busRoute.ts`): the player's
  Day 1 arrival vehicle; the courtesy zones (KESTREL_COURTESY_ZONES); the bus
  bay (BUS_BAY_ID); the parked cars (PARKED_CAR_RECTS).
- **Traffic** (`engine/traffic.ts`): IDM car-following; the spawn law (target =
  240 in a 360 m ring, weighted kind pools — car 6, taxi 3, van 1.4, truck 1.0,
  bus 0.7); the approach speed and nose limit laws.
- **The K line subway** (`world/subway/`): the ride (22 s), the seam, the
  arrival, the exit stair.

## 8. The sidewalks and street furniture

The street furniture is in `world/props.ts` (958 lines) + `world/streetAssets.ts`
(408 lines) + `world/nycKit.ts` (the slop-newyork port). The roster:

- **Hydrants, streetlights, newsracks, benches, recycling bins, trash cans** —
  `props.ts` makers; the merged, vertex-coloured law.
- **Utility poles + span wires + pole signs** — `streetAssets.ts`.
- **Fire escapes** — `streetAssets.ts` (the deco) + `neighborhoodFabric.ts`
  (the W12 filigree — 170 alpha-cutout ironwork panels, one InstancedMesh).
- **Subway entrances** — `props.ts` (`makeSubwayEntrance`) + `nycKit.ts`
  (`makeSubwayStairNYC`, `makeSubwayGlobePost`).
- **Mailboxes, scaffold sheds, steam vents, HVAC units, awnings, cornice bands** —
  `nycKit.ts` (the slop-newyork port, provenance in `docs/slop-integration/`).
- **The M121 bus, the parked cars, the taxi** — `world/arrivalBus.ts` +
  `tools3d/rebuild_cars.py` + `public/models-experimental/cars-v2/`.
- **Trees, tree pits, leaf piles** — `props.ts` (`makeTree`, `makeTreePit`) +
  `world/leaves.ts` (the LeafDrift).

— Z.ai agent, 2026-11-13
