# ASSET CHANGES — the Westgate & Eastgate rows (W7)

Wave: register v1.45.0 · The registry diff: +756 lines (24 building rows, 4 block rows, the W7 phase, the bounds' growth, the E–W streets' spanX) · Zero asset files added or removed; everything is code-built Lambert + vertex color.

## The registry (append-only; `scripts/design/w7-registry-patch.mjs` is the auditable patch)

| Change | Rows | Law |
|---|---|---|
| `bounds.playableCore` | x ±84 → **±100** (z ±64 stands) | the walls follow the registry's own bounds (the W6 law, owner authorization standing) |
| `bounds.world.xMax` | 96 → **136** | the Eastgate strip + the SKY-E fabric row's far faces live east of the old edge |
| `bounds.skylineCards` | SKY-W/E x ∓110 → **∓122** | the skyline fabric keeps ≥ 10 m from the new wall line (the strips took the old ground) |
| `STR-KESTREL` / `STR-GABLE` / `STR-MARLOW` | spanX → **[−100, 100]** | the E–W streets grow their ends; the road/walk/curb slabs butt-joint at the W1 levels |
| `BLK-W1`, `BLK-W2`, `BLK-E1`, `BLK-E2` | 4 new block rows | the strips read edge to edge (party walls at z ±20, ±32 — no yards) |
| `BLK-N2` / `BLK-S2` | bbox x → ±100, identity note | the terrace bands continue to the wall line |
| **24 new building rows** | GRB-08..11 (terrace N, h 12.5), GRB-12..15 (Gable S row, h 12.5), KTN-08..11 (Kestrel N walk-ups, h 15/16, shopfronts), KTS-05..10 (Carrow walk-ups + Kestrel S tenements, h 14–18), TEN-03/04 (Carrow terrace, h 16.5), MRW-01..04 (Marlow shop rows, h 15/17) | all `built (W7)`, class C, `collider: true`, entrance rows on their street faces |
| `constructionPhases` | +W7 | the phase row documents the last two sides |

## The built world (all pre-bake, all fused into the c0/c5 edge tiles)

- **24 gate masses** (`buildAlderHeightsW7Gates`): cornices, window rhythms,
  high stoops on the brownstone rows, low stoops + 8 shopfronts
  (WESTGATE BOOKS · GATE HARDWARE · EASTGATE NEWS · VERBENA BOOKS ·
  CORNELIUS & CO. · WESTGATE NEWS · LARKIN PROVISIONS · CARROW CHEESE) with
  the ported five-color awning discipline, and the east chalk-menu A-frame.
- **The street ends**: 2 Kestrel road slabs + 4 Gable/Marlow road slabs,
  8 walk slabs + 4 terrace walk slabs, 12 curb runs — all butt-jointed at
  the shipped y-levels.
- **The fabric** (`neighborhoodFabric.ts`): 21 new escape bays (49 total),
  3 sidewalk sheds (the port — deck, ply, rails, posts ×12 colliders,
  braces, 18 work-light bulbs in one instanced draw), 7 strip props.
- **16 strip street trees** riding the shipped `buildSimpleTree` grammar
  (pits registered, canopy instancing unchanged — 4 draw calls total).

## Interactions (the one-day-slot law: existing ground, no save fields)

- `west_stoop` — "Sit on the stoop" (GRB-08, the Larkin band's west house)
- `east_menu` — "Read the chalk menu" (MRW-03's LARKIN PROVISIONS front)

Both day-keyed via `WEST_STOOP_NOTES` / `EAST_MENU_NOTES`; anchors pinned in
validate-registry (23/23).
