# 57 — ABO furniture, curated and wired into the interiors

**Date:** 2026-11-05 · **Decree:** the curated ABO furniture pack is not a
standalone review scene — "I want it wired in the game." · **Scope:**
`assets/furniture/`, `tools3d/`, `web-three/src`, `web-three/public`,
`web-three/tests`, `web-three/scripts`.

---

## 1. What landed

The [Amazon Berkeley Objects GLB dataset](https://huggingface.co/datasets/codepawl/abo-glb)
(7,953 models, CC-BY-4.0, by codepawl — derived from Amazon.com's ABO
dataset) was curated down to a **141-model first-slice furniture pack**,
downloaded into the repo, and **wired into three of the game's interiors**:
Cecil's room (the bedroom), the community hall (living room + communal
table), and the diner (the counter). Twelve unique models wear **19
authored slots** through the docs/28 GLB seam's new furniture half.

Everything obeys the house laws: the seam is a *costume*, not a
dependency — a missing or malformed file keeps the procedural room (one
`console.info`, no retries); colliders are authored in the builders, never
imported; the room toggle, the anchors, the day machine: untouched.

## 2. Phase 1 — the curation (tools3d/abo_select.py)

Read `metadata.jsonl` (all 7,953 records; product-type distribution:

| type | n | type | n |
|---|---|---|---|
| chair | 1184 | lamp | 345 |
| sofa | 859 | stool seating | 340 |
| rug | 817 | ottoman | 288 |
| wall art | 599 | headboard | 206 |
| table | 584 | light fixture | 195 |
| home furniture & decor | 549 | desk | 145 |
| bed | 140 | cabinet | 137 |

) and scored every floor-standing piece against the first-slice priority
order (chairs → sofas → tables/desks → cabinets/dressers → beds → shelves
→ lamps → rugs → ottomans/stools → wall art). Selection laws:

- **Files:** every pick is the dataset's `lods/<ASIN>/<ASIN>_lod1.glb` —
  meshopt-compressed geometry, KTX2 (basis) textures at 1024 px, median
  ~300 KB. (The prompt's "KTX2 + LOD" preference, taken literally: lod1 is
  the hero quality; lod0 is the 34 MB source scan and nothing needs it.)
- **Tri caps:** 26 k chairs/sofas/beds · 16 k tables/storage · 9 k rugs ·
  4 k wall art. **Byte cap:** 700 KB–900 KB per piece.
- **Floor law:** `bounds_min[1] < 0.02` — the piece sits on Y=0 like the
  world's own furniture (wall art/mirrors exempt).
- **Skip list:** cables, chargers, mouse pads, drives, sleeves, shredders,
  printers — the small-electronics tail is filtered by name regex.
- **Diversity:** max 2 per brand; Modern/Contemporary/Mid-Century styles
  bonus-scored; scale sanity (0.25–3.2 m) enforced.

**Result: 141 models, 35.9 MB** — full list with id / name / type /
lod1 path / triangles / size / score in **`docs/data/abo-curated.json`**;
per-category counts in the JSON's buckets (chairs-dining 14, sofas 12,
rugs 10, cabinets-side 8, shelves 8, chairs-office 8, lamps 12, beds 10,
tables 22, desks 6, stools/ottomans 10, wall/mirror/pillow 13…).

## 3. Phase 2 — the fetch (tools3d/abo_fetch.py)

`python3 tools3d/abo_fetch.py` — `huggingface_hub.hf_hub_download`, 16-way
concurrent, idempotent (size-checked cache). Layout:

```
assets/furniture/<category>/<ASIN>.glb   the 141-model pack (lod1, unmodified)
assets/furniture/LICENSE-CC-BY-4.0.txt   the dataset license
assets/furniture/ATTRIBUTION.md          per-model credit (CC-BY-4.0's term)
web-three/public/models/furniture/<slot>.glb   the 13 files the game wears
web-three/public/vendor/basis/           basis_transcoder.js + .wasm (from three)
```

The game files are byte-identical pack copies renamed to the slot they
wear — pinned by test.

## 4. Phase 3 — the wiring

**The loader** (`World.configureGltfDecoders(renderer)`): the ABO GLBs
need two decoders the street seam never did — `MeshoptDecoder` (bundled
from three) and `KTX2Loader` (needs the renderer for the transcoder's
format probe, plus the vendored basis files). The Game calls it once,
right after the renderer exists; the street props keep their original
plain loader.

**The manifest** (`src/world/furniture.ts`): 19 slots, each naming the
room, the placeholder fixture, the target height, an optional yaw and
`hide` list. **The swap** (`World.upgradeFurnitureWithGLB`): uniform-scale
to the authored height (footprint-fit for the flat rug), XZ-centered on
the placeholder, feet on its ground, yaw baked into the vertices *before*
the bounds are measured (the footprint guard — the street seam's 0.5–1.9×
band — judges the piece as placed); one draw per material; siblings
(mattress, pillow, vise) hide only once the model is in.

| Room | Slot → model (ASIN) |
|---|---|
| CECIL | bed `B07LC5Y95W` · dresser `B079X4CP3F` · side_table→nightstand `B01D3C7Z4A` · table_lamp `B07374P6MR` · rug `B0719STDHT` |
| HALL | dining_table→work table `B075YMXWZC` · dining_chair ×2 `B075YQ8Q2K` · bookcase `B07DMHTGJD` · sofa `B072FVHS9G` · coffee_table `B01LWVEZ1C` · sideboard `B075YQXQ5C` |
| DINER | counter_stool ×8 `B07CZ6P7QP` |

New fixtures (dresser, nightstand, lamp, sofa, coffee table, bookcase, two
chairs, sideboard) carry authored colliders inside rooms the driver never
walks; existing colliders (bed frame) unchanged; zero new ped bodies; the
census law holds.

**The diner re-lay.** The probe caught a shipped W5 quirk: the cook line
sat *between* the aisle and the counter bar, and the eight stool slots
lived in the 0.15 m slot between them — buried (the shipped cylinders were
equally invisible). Same pieces, positions only: the line now reads
aisle → stools → bar → cook line → E wall (bar 58.9→57.6, kitchen
57.6→58.9, stools 58.35→56.95; collider boxes' sizes unchanged, positions
moved with their fixtures).

## 5. Evidence

- `scripts/probe-furniture.mjs` — **FURNITURE OK**: all 19 upgrades landed
  (`world.furnitureUpgrades`), wrappers carry textured meshes (bed 6,587
  tris decoded from meshopt), mattress/pillow/vise hide under the real
  pieces, **all three rooms hidden at the boot spawn (zero furniture draws
  at rest)**, each room shows and draws real geometry around the player,
  console clean. Eight aimed shots + the review grid:
  `docs/assets/furniture/furniture-review-grid.png`.
- `tests/furniture.test.ts` (6) — manifest well-formedness, fixture-name
  uniqueness, the World-builder drift pin (a renamed fixture fails here,
  not at runtime), files-on-disk, byte-identity with the pack + recorded
  lod1 sizes, total provenance, and the pack's CC-BY-4.0 attribution
  coverage.
- Perf ledger (probe-perf, HEAD vs HEAD+furniture): boot-spawn 119→119 ·
  mid-street-east 184→184 · plaza-life 260→256 — **zero at-rest
  regression**.
- vitest **571/571** (37 files) · tsc clean · build 472 ms ·
  probe-w5-interiors **PASS** (glass law + toggles + ducks over the re-lay)
  · probe-peds OK · probe-shuffle OK (the B16 rails untouched) ·
  **e2e AUTOTEST OK: 0 failures, 558 s, console clean**.

## 6. Works / issues (honest notes)

- **Works:** the mid-century oak table + grey chairs in the hall read
  *great* against the flat-color world — real silhouettes, muted textures;
  the cream Rivet sofa, the ladder bookcase, the zebra rug and the full
  diner counter line all land. KTX2 + meshopt decode clean under
  SwiftShader.
- **Art-direction tension (accepted):** ABO pieces are photoreal-textured
  inside flat-Lambert rooms. Curating for muted/neutral fabrics keeps it
  coherent; anything loud (beyond the rug's grey zebra) stayed in the pack,
  not the game.
- **Bundle/boot:** +12 model fetches (~3.1 MB) at boot, parallel, behind
  the intro; the basis transcoder (~570 KB) vendored; meshopt decoder rides
  the bundle (~35 KB gzip). First GitHub Pages load pays once, then cache.
- **The diner quirk** (§4) is *fixed by the re-lay* — documented because it
  predates this pass.
- **Not wired (in the pack, ready):** desk_chair + the 128 other pack
  pieces — the barber/pizza/bakery/records rooms and the bodega take the
  next slots; the manifest is the only file to extend.
- **Probe note for the next author:** the camera's street-side auto-yaw
  eases `camYaw` away during settles — an interior probe must re-assert
  yaw (see `probe-furniture.mjs`'s aim lock) or every shot drifts.
- **KTX2, not webp, in the lods:** the dataset's lod files ship
  `KHR_texture_basisu` textures (the metadata's `texture_vram_mib_webp`
  refers to the source GLBs). The transcoder handles it; no path change
  was needed.
