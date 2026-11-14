# Low-Poly Furniture Pack — Warm Pastel Scandinavian Starter Set (10 pieces)

Procedurally generated with headless Blender 4.2.23 (bpy), exported to glTF-Binary.
Flat pastel colors, no textures, real-world scale (1 unit = 1 meter), origin at
base-center, models built facing Blender −Y (correct glTF +Z forward after export).

## Contents

- `models/*.glb` — 10 game-ready meshes (one mesh per model, ≤6 Principled materials)
- `previews/*.png` — 1024 px Cycles CPU studio renders (3-point softbox, denoised)
- `lowpoly_furniture_grid_sheet.png` — labeled 5×2 overview of the full set
- `manifest.json` — per-piece triangle counts, bounding boxes (m), file sizes
- `src/` — the exact generator scripts (`gen_furniture.py`, builders, `lowpoly_lib.py`)

## Pieces

| # | Piece | Tris | W×D×H (m) |
|---|-------|------|-----------|
| 1 | sofa | 1280 | 2.10 × 0.92 × 0.84 |
| 2 | bed | 1040 | 1.66 × 2.11 × 0.95 |
| 3 | dining_set (table + chair) | 848 | 1.50 × 1.28 × 0.88 |
| 4 | bookshelf | 832 | 0.86 × 0.31 × 1.90 |
| 5 | desk | 628 | 1.30 × 0.65 × 0.84 |
| 6 | wardrobe | 340 | 1.26 × 0.66 × 2.03 |
| 7 | coffee_table | 476 | 1.00 × 0.60 × 0.54 |
| 8 | floor_lamp | 344 | 0.42 × 0.42 × 1.55 |
| 9 | stool | 488 | 0.35 × 0.35 × 0.46 |
| 10 | potted_plant | 940 | 0.74 × 0.74 × 1.41 |

(Heights include tabletop decor where present; see `manifest.json` for exact values.)

## Palette

Cream `#F5EFE6` · Off-white `#EDE7DC` · Sage `#9CAF88` · Terracotta `#C77B5A` ·
Walnut `#6E4B3A` · Warm gray `#C8BFB2` · Charcoal `#4B4A47` · Soft black `#2D2B28` ·
Dusty rose `#D9A69A` · Mustard `#D2A659` · Foliage `#7FA36F`/`#567C4E`

## Usage

Drop the `.glb` files straight into Unity / Godot / three.js / Unreal (glTF importer).
All meshes are static props: Y-up, meters, base-center origin sits on the floor plane.
Re-tint any part by editing its Principled base color — no textures to repaint.

Regenerate or restyle any piece: `blender -b -P src/gen_furniture.py -- --out OUT_DIR`
(requires the bundled `lowpoly_lib.py` next to it).
