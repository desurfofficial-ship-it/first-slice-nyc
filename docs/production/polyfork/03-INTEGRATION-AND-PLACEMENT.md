# The Polyfork Streets Wave — 03: integration and placement

> The architecture question the directive posed: how do external assets
> enter a world whose laws are the registry, the bake, the palette and
> the budget — without paying a draw or breaking a seam. The answer: the
> kit enters as BUILD-TIME VERTEX DATA and rides the district bake at
> +0 standing draws.

## 1. The pipeline (tools3d/polyfork/extract_polyfork.py)

The sandflow_eval and fenestra precedents both chose build-time
generation over runtime loading for static world content. The extractor
follows them:

1. parses each curated GLB (`assets/packs/polyfork/glb/`),
2. walks the default scene composing node world matrices (both TRS and
   the `matrix` encodings — the kit's vehicle wheels use matrices),
3. EXCLUDES atmosphere nodes by name (`steam|smoke|puff|vapor|mist`) —
   the world already owns steam; a frozen wisp would read as broken
   (the kit's manhole carried exactly this),
4. asserts the kit's invariants — face-split meshes, sequential
   indices, flat per-face `COLOR_0` — the assertions that let the
   committed data stay small (normals recomputed flat at load, indices
   dropped, colors stored once per tri),
5. re-centers each asset (XZ bbox center at the origin, feet at y 0 —
   the world's placement law),
6. quantizes (positions uint16 at a per-asset scale ≈ 0.1 mm; colors
   uint8 — the glTF ubyte-norm convention) and emits
   `web-three/src/world/polyforkData.ts` (277 KB, 10 assets, 9,978
   tris; base64 fields + the per-asset credit/source/hasNight meta).

Deterministic: sorted ids, fixed rounding — a rebuild is byte-identical
(SHA-256 verified twice).

## 2. The runtime side (web-three/src/world/polyforkKit.ts)

- `polyforkAssetGeometry(id)` — decodes + caches the local geometry
  (feet-grounded, flat normals, flat colors).
- `PolyforkAcc` — a GeoPush-shaped accumulator (pos/col/idx, one flat
  color per tri, indexed out) with `place(id, x, z, rotY, yLift)`. Its
  `toGeometry()` is byte-shaped like the fabric kits' — so
  `bakeStatics` (and the zone bake) fuse it for free.
- `emitPolyfork` — the W-C1 re-centering emit law, verbatim (copy the
  bounding-sphere center BEFORE translating; a live alias reads back
  (0,0,0) — the law the Larch build paid a day for).
- The A/B seam: `?polyfork=0`, read at MODULE INIT (World builds in a
  field initializer — a boot-time read would be too late). Kit OFF = the
  shipped world byte-for-byte: the procedural trucks return, the kit
  batches and fleet vanish.

## 3. The three placements (every coordinate hand-set, law-checked)

### 3a. The Alder street kit (three baked batches)

- `Polyfork_Alder_Kit_N` (north building line): the payphone (−14, 7.6),
  the fire-alarm call box (38, 7.6), the bike rack (−26.8, 7.55), the
  cellar hatch (−12.5, 6.1, sunk 6 cm). **The lane law**: every north
  solid keeps minZ ≥ 7.28 — the north walking lane (z 4–7.2, the E2E
  hauls run it at z 6.8–6.9) stays open. The curb meter that first
  draft placed at (−6, 4.72) was REJECTED BY THE WAVE'S OWN GUARD TEST
  (minZ 4.57 < 7.28) and moved south — the guard now pins the law.
- `Polyfork_Alder_Kit_S` (south line): four curb meters on the shipped
  hydrant's line (−14/−6/20/40, z −4.72), the newsstand (16, −7.2), the
  bike rack (24, −7.35), the hot-dog cart (−26, −7.15), the cellar
  hatch (−24, −5.7). **The cart-corner apron law**: nothing inside
  x −3..14, z −4..−6.5 — the vendor cart's gameplay spot keeps its
  apron (guard test pins it).
- `Polyfork_Plaza_Rack`: the Junction Plaza's rack (143.5, 12.5), 4 m
  west of the shipped bench pair.
- **Solids** (8): payphone, call box, newsstand, hot-dog cart, the four
  meters — center-based specs World converts with boxFromCenter, all on
  the furniture lines, all clear of every walking lane. The bike racks
  stay porous (open frames, like the shipped wires); the hatches stay
  flush-walkable (no collider).

### 3b. The Catalpa dock fleet (one zone-owned mesh)

Five vehicles backed into the dock faces the W-C1 district built with
none (`buildCatalpaDockFleet` → one vertex-colored mesh inside
`CJN_Group`, so the spawn census reads +0 by the zone law):

- delivery truck at CJN-02 (Corbin & Sons, z 20) and CJN-04 (Starlawn,
  z −24): west rows' doors face EAST at x −422 → rear at −421.7, nose +x;
- delivery truck at CJN-08 (United Cotton Duck, z 8): east row's door
  faces WEST at x −400 → rear at −400.4, nose −x;
- garbage truck on the spur's south-east edge (−401.8, −51), clear of
  the bollard stations (z −46/−26/−6/14/34/54) and the footbridge;
- food truck at the headhouse's walk (−402.4, 30), clear of the slab
  and the kiosk.
- All five carry box colliders (they stand in the primary walk) —
  verified trap-neutral (04).

### 3c. The Larch docks' truck swap (the placeholder replaced)

`larchYardsKit.trucks()` branches on the seam: kit ON → the kit's real
delivery truck at the SAME ten spots (the same rng sleep roll consumed
in the same order — one spot sleeps, the district stays
deterministic); kit OFF → the procedural boxes, byte-for-byte. The
kit truck's footprint is 0.32 m wider than the placeholder's — the
curb clearance absorbs it inside the shipped lane law.

## 4. The one shared-file repair the wave made

The zone bake (World.ts's CJN edition) had never met a vertexColors
source: it flattened every non-emissive source's color to the
material's `color` — which would have baked the fleet WHITE. The main
bakeStatics already carries the law ("per-vertex palettes ARE the
product — captured from the SOURCE geo"); the zone edition now mirrors
it (a `vertexColors` source keeps its own color attribute; flat-color
sources behave exactly as before). The district's own batch count and
the shipped censuses were re-measured identical (04).
