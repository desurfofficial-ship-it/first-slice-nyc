# FULL-GAME 3D ASSET AUDIT — FIRST SLICE: A New York Story

Issued: 2026-11-10 · Auditor: Lead 3D Environment / Technical Artist agent (Z.ai)
Base tree: main @ `ebfb08a` · Wave: `feat/world-visual-quality` (register v1.36.0)
Method: the game booted from the production build and inspected at street level,
roof level and junction level (Playwright, `probe-world-visual-audit.mjs`, 22 fixed
vantages, `shots/world-audit2/`) — not from screenshots alone and never from
source only. Every finding below names the vantage that proved it.

---

## 1. What the world is

Alder Heights is a procedural Three.js block-and-avenue district built entirely
from `docs/data/world-registry.json` (50 building rows, 5 streets, crosswalks,
transit, landmarks). The Day-1 block ships from the greybox; phases W1–W5 added
the street grid, the Gable brownstone row, the avenue walls, the landmarks, the
interiors. Statics fuse into per-district tile batches at boot
(`World.bakeStatics`), trees are instanced canopies, signs ride one atlas sheet.
Baseline render cost at spawn: **154 draw calls / 258 k triangles** — the world
is already far inside budget for modest hardware.

## 2. The audit, asset class by asset class

Classification: KEEP (good, leave it) · IMPROVE (this wave) · REBUILD (none
needed) · CREATE (missing entirely) · OPTIMIZE (performance).

### Buildings & architecture

| Family | Rows | Verdict | Basis |
| --- | --- | --- | --- |
| Terminal, walk-ups, split-B halves (KTN-01/02/03/04/05) | 5 | **IMPROVE** | Rooflines ended in a straight edge (vantage `n-roofline`); upper-window rows wore no reveals; end walls blank |
| Brownstone row + Gable row (KTS-01, GRB-01..05) | 6 | **IMPROVE** | Stoops/doors/cornices good (W2 built them); windows read as flat stickers — no sill/lintel; zero AC units |
| The Cecil (KTS-02) | 1 | **IMPROVE** | Climbable fire escape intact (KEEP); east gable blank toward the court; roofline uncapped |
| Corner houses (KTN-00W, KTN-06) | 2 | **IMPROVE** | Crowns + water towers already there (KEEP); avenue-facing end walls blank (vantage `v-juniper-north`); windows unrevealed |
| Tenements + courts (TEN-01, SRC-01/02) | 3 | **IMPROVE** | Light-slot tell + cornices exist (KEEP); window rows unrevealed; west end wall blank |
| Marlow row (SMB-01/02/03, PWK-01/02/03) | 6 | **IMPROVE** | Shopfronts, signs, glass, awnings already real (KEEP — vantage `g-marlow-shops`); upper windows unrevealed; PWK↔SMB slot walls blank |
| Hall, studios, diner (KCM-01, KTN-07, SND-01) | 3 | **IMPROVE** | Marquees/neon/windows exist (KEEP); rooflines uncapped; east gables blank |
| Backdrop rows (VDN-DW1a..d, DE1a..d, DN1, DS1) | 10 | **IMPROVE** | Varied silhouettes + hint bands (KEEP); the avenue-facing long walls were flat colour for their full height (vantage `v-juniper-north` right wall) |
| Rooftops (all masses) | — | **IMPROVE** | Every unreachable roof was an empty slab; the three canon water towers stay exactly where Doc 04 put them |
| Interiors (9 W5 rooms + bodega + home) | — | **KEEP** | Polished by the previous wave (v1.35.0: per-room palettes, feet law, deli read) — re-verified this boot (`probe-polish-pass`, `probe-w5-interiors` PASS) |

### Streets & infrastructure

| Family | Verdict | Basis |
| --- | --- | --- |
| Road/sidewalk/curb slabs, all 5 streets | **KEEP** | W1 grid is butt-jointed, levelled, curb-cut where people cross |
| Crosswalks (XW-CANON + all junction legs) | **KEEP** | Zebra law already complete at every junction |
| Junction stop lines | **CREATE** (was missing) | No entering-lane bar anywhere — added 12 |
| Manhole covers | **IMPROVE** | One shipped steam manhole (KEEP); the rest of the district had none — added 13 |
| Storm drains | **CREATE** (was missing) | Curb gutters had no grates — added 8 |
| Road patches / oil stains | **CREATE** (was missing) | Streets were unnaturally clean — added 6 patches + 4 stains |
| Utility poles, span wires, traffic signal | **KEEP** | Avenues carry the wires; the canonical signal holds the mid-block crossing |
| Streetlights | **KEEP** | 14 W1 lamps + the shipped 4, all with colliders and nav clearance |

### Street furniture & objects

| Family | Verdict |
| --- | --- |
| Hydrants, trash + recycling, benches, newsracks, planters, bus stop, barriers, vendor carts, mailboxes | **KEEP** — present, placed on curb law, colliders honest |
| Subway entrances (SUB-01 stair shaft, SUB-02 control house) | **KEEP** — the shaft relocation (`ebfb08a`) is the truth the world reads |
| Gooseneck door lamps | **CREATE** (was missing) — added 5 over the Marlow doors, the vacant café door and the terminal door |

### Nature & wildlife

| Family | Verdict |
| --- | --- |
| Trees (canopy instancing, autumn law) + tree pits | **KEEP** — 96 pits, fade-on-occlude canopies |
| Grass in pits | **CREATE** (was missing) — 96 tuft groups, one per pit |
| Curb leaf piles | **CREATE** (was missing) — 10 static piles (LeafDrift owns the falling ones) |
| Pigeons (2 flocks), squirrel, LeafDrift, steam | **KEEP** — the living street already works |

### Sky & far world

| Family | Verdict |
| --- | --- |
| Skyline cards (SKY-N/W/E/S), dusk sky law | **KEEP** — fog-exempt silhouettes read at every vantage |
| Subway system + Times Square far world | **KEEP** — out of scope for a street-level pass; verified untouched (`SUB_Root`/`TSS_Group` bake exclusions intact) |

## 3. The one systematic defect, named

The audit's through-line: **the district's builders dressed faces that face the
story, and left the faces that face the player's long views blank.** End walls,
slot walls, backdrop long walls, rooflines, window reveals, roofs — every blank
surface was the *background of a lingering shot*, not the foreground of a beat.
That is the gap this wave closes (`ASSET-IMPLEMENTATION-REPORT.md` §1), and the
reason the classification has no REBUILD rows: nothing here was constructed
wrong; the construction was simply unfinished at the edges.

## 4. Performance classification

OPTIMIZE verdicts: none required. The bake law already fuses every static per
district tile; this wave's ~600 new pieces are all static Lambert non-mapped
(atlas faces excepted) and fused into the same tiles. Measured: 154 → 155 draw
calls at spawn (+1 call for the whole pass; tris 258 k → 263 k). New probe gate:
the pass may never exceed 200 calls (`probe-world-visual-quality`).

## 5. Evidence

`docs/3d-assets/evidence/` — before/after pairs (gable row, roofline, Juniper
avenue wall, alley) plus the Marlow after view. The full 22-vantage sweeps live
in `web-three/shots/world-audit2/` (before) and `web-three/shots/world-visual-quality/` (after).
