# ASSET CHANGES — the terrace build-out (W6, register v1.44.0)

Every change is deterministic (seeded PRNGs only — a rebuild is
byte-identical, pinned by `tests/neighborhood-fabric.test.ts`).

## Registry (`docs/data/world-registry.json`)

| Change | Detail |
|---|---|
| `bounds.playableCore` | z ±48 → **z ±64** (x unchanged ±84) — the owner's 2026-11-11 expansion authorization, DEC-8 satisfied in the register |
| Buildings | **4 rows appended** (never renumbered): `GRB-06` (−64, 56.2, 8×15.4, h 12.5, 3 floors), `GRB-07` (64, 56.2, 8×15.4, h 12.5), `TEN-02` (−64, −56.2, 8×15.4, h 16.5, 5 floors), `KTS-04` (64, −56.2, 8×15.4, h 18) — all `built (W6)`, class C, entrances pinned, colliders on |
| Parks | **2 rows appended**: `PRK-LARKIN` (x −58..58, z 58.5..64) and `PRK-CARROW` (z −64..−58.5) — the gardens behind the pinned backdrop masses |
| Blocks | `BLK-N2`, `BLK-S2` appended |
| Park status repair | `PRK-GREEN`, `GRD-GABLE`, `PLY-MARLOW`: `planned` → `existing` (built in W2, read planned — the E-1-era defect pattern; geometry untouched) |
| `constructionPhases` | **W6** appended |
| `meta.corrections` | the W6 row appended |

## Geometry

| Asset | Count | Notes |
|---|---|---|
| Terrace masses | 4 | cornice-capped, window rhythms, high stoops (Larkin) / shopfronts + stoops (Carrow); colliders on; regShell-sourced |
| Terrace walk slabs | 2 | z ±48..±64, x −84..84, walk tone, top 0.1 |
| Garden lawns + paths | 4 | lawn strips + gravel paths behind the backdrop rows |
| Garden benches | 4 | colliders on |
| Garden trees | 12 | the shipped simple-row grammar (canopy instancing, pits, leaf spots) |
| Community-garden kit | 4 | 2 garden beds, the shed (collider), the compost bin |
| **Fire-escape bays** | **30** | 28 buildings' worth of ironwork (deck, rails, flights, braces, drop ladder, gooseneck); zero colliders, ≥ 1.3 m over the walk, ≥ 2.0 m clear of every same-face door |
| Terrace face fabric | 2 | VDN-DN1 south / VDN-DS1 north: 50 segment-window grids + 10 segment cornices + shopfront bands, windows proud 5 cm |
| Terrace lit panes | 70 | ONE InstancedMesh sharing `skylineWinMat` (the dusk tween dresses them — probe-verified 1.3) |
| USPS mailboxes | 6 | walk hug lines |
| Bike hoops | 8 | |
| Fire hydrants | 6 | |
| ConEd steam stacks | 2 | + 4 sawhorses (the ring's N/S pair omitted — it would cross the Kestrel lane) |
| Terrace payphone | 1 | the W6 interaction anchor |
| Flyer board | 1 | the shipped `makeBulletinBoard` at the Carrow garden's corner |

## Interactions (3 new, the one-day-slot law — no save fields)

| id | anchor | prompt |
|---|---|---|
| `terrace_stoop` | (−66.2, 47.4) | "Sit on the stoop" |
| `terrace_payphone` | (66.6, 47.6) | "Lift the receiver" |
| `terrace_flyer` | (−58.9, −47.5) | "Read the flyer board" |

## Colliders / nav

- New colliders: 4 masses, 2 terrace slabs (walkable tops), 4 benches, 12 tree trunks, the shed — all inside the grown core.
- Walls: z ±48 → **z ±64** (x walls re-spanned).
- **Zero** changes to `NAV_BOUNDS`, `Z_SPAN`, `X_SPAN`, `LANES`, the lane law, or any shipped node — the new door nodes hang off the Gable/Marlow lanes inside the existing bounds (entrances pinned at z ±47.7).
- Registry grew 50 → 54 buildings, 5 → 7 parks; validator: 137 IDs, 17/17 masses, 21/21 anchors, exit 0.
