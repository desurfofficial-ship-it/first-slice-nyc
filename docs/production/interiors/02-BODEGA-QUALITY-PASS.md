# BODEGA QUALITY PASS — the store reads production-ready (2026-11-12)

| | |
|---|---|
| Scope | ROSA'S BODEGA (BODEGA-INT, ROS-01) — the interior the story walks through every day |
| Trigger | Playtest verdict: the shelves carried "only boxes", the mango/coffee/bread stock floated from a past layout, and the room showed its construction masses (raw brick inner faces, open sky where a ceiling should be) |
| Method | Screenshot audit rig (`web-three/scripts/audit-bodega.mjs`) at 9 vantages → fixes → re-audit ×3 → the 4-day in-game E2E as the integration gate |
| Law held | No gameplay system touched: colliders adjusted only where the shelf run grew, interactions/restock/save/E2E contracts unchanged, the GLB seam's fallback law intact |

## What was wrong (the audit's findings)

1. **The wall of loose boxes.** `Bodega_ProductRow` — three floating rows of
   30 colored boxes running the full back wall at fixed heights — predated the
   gondola GLBs and ran straight THROUGH their volumes (the gondolas span
   z 19.06..19.54; the rows sat at z 19.15..19.29). It read as unfinished noise
   behind half-buried shelves.
2. **The gondolas were sunk and starving.** The GLB units' feet landed at the
   placeholder's AABB min (y 0) while the store floor top is y 0.11 — the kick
   plinth and base deck were buried, the bottom stock row sat at ankle height.
   Their token dressing (4 items a level, one color per level) read as
   scattered stubs; the top shelves looked bare.
3. **The Day-1 stock floated.** Mango/coffee/bread spawned at y 2.0 (the
   pre-GLB shelf's "anchor" law, minus 0.25) — half a metre ABOVE the gondola
   tops (1.64), x-offset from the units (−18/−16/−14 vs −17.5/−16/−14.5),
   z inside the shelf depth. The mango was bigger than the bay it hung in.
4. **The room showed its construction.** The front piers', door reveals' and
   lintel's inner faces were raw PAL.brick; there was no ceiling (the hidden
   roof opened onto the neighbor's fire escapes); the counter was a bare teal
   slab; the chip bags hung off nothing; the fridge sank the same 0.11.

## What changed

- **The stock strip (asset side).** `tools3d/sandflow_eval/strip_bodega_stock.py`
  (pure stdlib, the `postprocess_glb.py` pattern) removes the GLB's 43-node
  `stock` group — 42 meshes, 10 orphaned materials — leaving the frame
  (base, kick, back panel, uprights, 4 boards, 5 rails; 18 nodes, 14 meshes,
  4 materials). Idempotent, self-validating, BIN chunk untouched. The
  frame-only file changes the upgrade's uniform scale to **1.64/1.770**; every
  seated height below derives from it.
- **The restock pass (engine side, `World.ts`).** FOUR gondola units now
  (−17.5/−16/−14.5/−13 — one more than before, same 1.5 m rhythm), feet on the
  floor top (placeholder center y 0.93), under one visual-only collider. The
  stock is procedural, shelf-aware and merged one draw per color across all
  four units (the props law): kraft cases + a stacked case on every base deck;
  two 12-can facings per unit on board 2; snack boxes on board 3; jars (front)
  and bottles (back) on board 4; a top can row + kraft cartons on board 5.
  A west-wall backstock pile fills the run's leftover, inside the same
  collider. ~10 live draws for ~240 items.
- **The Day-1 stock, seated.** `SHELF_STOCK` rides the real board tops —
  mango (−14.5, 1.34), coffee (−16, 1.34) on board 4 of units 2/1, bread
  (−17.35, 0.987) on board 3 of unit 0 — each in a gap the restock reserves,
  z 19.18, all within the E2E's walk targets' horizontal reach (2.4 m) and
  y-band. `addItem` now builds feet-at-zero at shelf scale (mango ⌀0.17,
  coffee tin h 0.26, loaf 0.34) — the y parameter IS the surface.
- **The room's finish (additive dressing).** Cream ceiling slab (9.2 × 11.2 at
  y 4.47 — under the roof's 4.5 underside, no z-fight, visible only inside);
  stone-paint panels on both front piers' inner faces (full height) and the
  lintel above the door; cream door-jamb liners; a dark kick + gold top edge
  on the counter's aisle face; a hanging rail for the chip bags; a wall clock
  over the gondola run (y 2.8, clear of the Coffee label pill). The fridge's
  feet rose the same 0.11 as the gondolas'.

## Provenance & tests

- `bodega_shelf.glb` stays a generated asset: the program
  (`programs/bodega_shelf.py`) remains its source of truth for the FRAME; the
  strip is a post-generation pass exactly like the metallic strip, documented
  here. No third-party material touched.
- `tests/living-memory.test.ts` / `tests/interactions.test.ts` stub spots
  synced to the seated coordinates (stubs — not pins).
- **Fidelity gate, all green on the final tree:** tsc clean · vitest
  1,528/1,528 (95 files) · build OK · **4-day story E2E 0 failures** (667 s
  here with the harness's slow-machine viewport knobs; 139 PASS lines,
  console clean — evidence `docs/qa-security/evidence/RESULTS-e2e-4day-bodega-pass.txt`,
  incl. "enter bodega: roof hides, collect step" and "3 shelf items collected").

## Evidence (`evidence/`, the audit rig's screenshots on the shipping build)

`bodega-restock-wide.png` (the store from the door) ·
`bodega-restock-shelves.png` (the stocked gondolas close) ·
`bodega-restock-stock-items.png` (the seated stock + labels) ·
`bodega-restock-counter.png` (menu, counter trim, no red slab) ·
`bodega-restock-door-inside.png` (painted jambs, the street beyond) ·
`bodega-restock-bread.png` (the bread's reserved bay).
