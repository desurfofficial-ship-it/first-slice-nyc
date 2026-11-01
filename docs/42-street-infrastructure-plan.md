# Doc 42 — Street & Infrastructure Plan

> **Deliverable D.** Roads, walks, crossings, transit, traffic, furniture. All
> numbers live in `world-registry.json` (`streets[]`, `intersections[]`,
> `crosswalks[]`, `transit`, `routes`, `furnitureStandards`).

---

## 1. The street network

| Street | Axis | Centerline | Road | Walks | Character | Built |
|---|---|---|---|---|---|---|
| **Kestrel Street** | E-W | z = 0 | z ±4 (8 m) | z 4..8 / −8..−4 | The story street; mixed-use, awnings, the cart corner | **shipped** (x ±50) → W1 extends to ±84 with identical slabs/levels |
| **Juniper Avenue** | N-S | x = −72 | x −76..−68 (10 m) | 8 m each side | The local avenue: terminal, subway, hall, tenements | W1 |
| **Sycamore Avenue** | N-S | x = +72 | x 68..76 (10 m) | 8 m each side | The commercial avenue: diner, studios, fruit stand | W1 |
| **Gable Street** | E-W | z = +40 | z 36..44 | 4 m each side | The brownstone street | W1 |
| **Marlow Street** | E-W | z = −40 | z −44..−36 | 4 m each side | Bakery row + playground | W1 |

**Kestrel is two-way** (4 m lanes each way — evidence: the eastbound cab in the
south lane, the westbound-parked van on the north curb). Avenues are two-way with
one moving rail each in W4. **All streets carry the existing slab/curb grammar:**
PAL.road asphalt, PAL.walk walks, the granite curb line (0x8f8a82, 13 cm — a step,
not a wall), tree pits and plaza decks a hair proud of the slab.

## 2. Intersections and crosswalks

Six intersections (Kestrel/Juniper, Kestrel/Sycamore, Gable/Juniper, Gable/Sycamore,
Marlow/Juniper, Marlow/Sycamore). Crosswalk law:

- **XW-CANON is untouchable** — the signalized mid-block crossing at x = −5 with
  the mast-arm signal at (−1.8, −7.55) and the cab's courtesy hold. It is a
  shipped system and a story asset.
- Every intersection gets four legs (two per street), 3.4 m wide, zebra-built from
  the existing cream-strip pattern; every leg enters the cab's yield-pool logic in
  W4 (the existing `courtesy rule 1` zone list grows, the rule does not change).
- **XW-COURT (x = 35)** — the new mid-block crossing serving the half-court and
  Corner Park gate, W1, with its yield zone from day one of the rail extension.

## 3. Transit

### The K subway (under Juniper Avenue)
- **SUB-01** — the shipped entrance (−42, 6.2): cast-iron housing, twin green
  globes, the plaza around it. Untouched.
- **SUB-02** — the south **control house** (−57, −6.25, 6 × 3.5): the cream
  metal-and-glass pavilion type NYC puts on wide sidewalk corners. One station,
  two entrances — the NYC law; the registry notes the shared mezzanine.
- **MEZZ-INT** — optional below-grade slice (W5). The rumble-and-glow cue
  (Doc 33 §2.5) stays the honest "the subway is real" signal until then.
- Line identity: **the K**, bullet Taxi Yellow `#F7B32B`. Priya's line.

### The M121 bus
Loop: **terminal lay-over → Gable → Sycamore → Kestrel → Juniper → terminal**.
Stops: BUS-02 Terminal curb bay (x −30), **BUS-01 the shipped stop** (−24.5, 7.35,
bench and all), BUS-03 Sycamore/Diner (61.5, 2). The bus is a rail mover using the
cab's yield brain (same module, longer body); arrivals are day-keyed and
deterministic — never a schedule sim.

### The cab
Existing rail (z = −2, x −46..46, eastbound, braking curve + lateral truth +
committed-move guard) extends to **x ±84 in W4**, gaining the intersection legs
and XW-COURT as courtesy zones. Parked cars: the shipped van (−14, 3.05) and
sedan (24, 3.05) stay; W1/W4 add two Kestrel end cars and three avenue cars, every
one a 4.4 × 1.95 collider at z ±3.05 — outside both moving lanes.

## 4. Pedestrian routes

| Route | Path | Status |
|---|---|---|
| R-KESTREL-N / S | Sidewalk spines z 6.15/6.85 and −6.85/−6.15, x −84..84 | shipped lanes, extended W1 |
| R-CROSS-CANON | The x = −5 crosswalk + the x = 9.4 crossing | **shipped, load-bearing for the E2E** |
| R-ALLEY | Kestrel walk → ALY-01 → lane x 32.1 z 10.6..20 → Kestrel Green → Gable gate | W2 — the real shortcut |
| R-GARDEN | Slot x −3 between KTN-02/KTN-03 rears → Gable Garden gate | W2 |
| R-AVENUES | Juniper x −82.5/−61.5; Sycamore x 61.5/82.5 | W1/W3 |
| R-GABLE-MARLOW | Gable z 33.5/46.5; Marlow z −33.5/−46.5 | W2 |

**Buildings must not block these** — the validator enforces road clearance; the
sidewalk law (no solid below the walking lane line) carries from the shipped
block: north Kestrel keeps z 4–7.2 clear, and every new face obeys it.

## 5. Street furniture standards (carried from the shipped block)

- **Trees:** 10–14 m spacing in granite-rimmed pits (the shipped pit builder);
  never in front of a door; ≥ 3 m canopy-to-lamp-head clearance (the Doc 31 law).
  Kestrel rows continue the shipped positions; avenues get plane trees, Gable/
  Marlow honey locusts; the turning-tree palette rule (ginkgos gold, locusts
  green) spreads district-wide.
- **Lamps:** alternate sides ~40 m, lit faces (the shipped emissive head), canopy
  clearance as above. Existing four positions are canon.
- **Hydrants:** ~50 m at curbs (shipped pair is canon); bins pair with recycle
  bins at corners (the ONE-station lesson — two boxes, one collider).
- **Signage:** every sign, route badge, and mural goes through the existing
  canvas sign factory — no new text pipeline, ever.
- **Poles/wires:** the shipped utility-pole grammar (south-side poles, sagging
  spans, service drops) extends avenue-by-avenue in W3; poles collide, wires are air.

## 6. What this plan deliberately does NOT do

- **No traffic simulation.** Rails + yield brains only — the shipped architecture
  carries the whole vehicle layer (Doc 37 §3H verdict stands).
- **No pathfinding.** Yuka steering on authored loops + the Phase-4 routine
  system; every NPC route in the registry is a hand-placed loop that never
  crosses a story mark.
- **No new collider semantics.** AABBs, wall-slide, STEP_UP 0.35 — the shipped
  engine laws bound every street decision above.
