# Sandflow / Sand3D — 03 Asset Pack (Alder Heights)

**Deliverable:** 12 original NYC-neighborhood assets authored as sand3d programs, exported to
GLB, validated, and rendered. Programs live in `tools3d/sandflow_eval/programs/` (one file per
asset + `_nyc.py` palette); GLBs in `web-three/public/models-experimental/sandflow/` (dev-only
directory, isolated from production `public/models/`); renders in `tools3d/sandflow_eval/renders/`.

**How to rebuild everything:** see `tools3d/sandflow_eval/README.md` — one venv, one command.

## 1. What was built

| # | asset (program file) | category | real-dim basis | W×D×H (m, measured) | tris | meshes | mats | joints | GLB |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `hydrant.py` | street | M&H/Mueller 3-way hydrant drawings | 0.42×0.37×0.78 | 5,168 | 7 | 4 | 0 | 134 KB |
| 2 | `dsny_basket.py` | street | DSNY wire basket (Ø460 rim, ~1 m) | 0.49×0.49×0.97 | 15,828 | 23 | 2 | 0 | 259 KB |
| 3 | `recycling_bin.py` | street | DSNY public recycling bin | 0.64×0.62×1.01 | 688 | 7 | 4 | 0 | 27 KB |
| 4 | `park_bench.py` | street | NYC Parks settee (~1.8 m, seat 0.45) | 1.71×0.59×0.79 | 9,064 | 14 | 3 | 0 | 160 KB |
| 5 | `streetlight.py` | street | NYC cobra-head mast-arm standard | 2.92×0.34×8.52 | 10,948 | 12 | 4 | 0 | 231 KB |
| 6 | `newsrack.py` | street | stainless sidewalk newsrack | 0.67×0.65×1.20 | 2,500 | 10 | 8 | 0 | 57 KB |
| 7 | `apartment_door.py` | building | prewar slab door 915×2050 + frame | 1.06×0.21×2.21 | 6,872 | 15 | 5 | **1** | 132 KB |
| 8 | `security_gate.py` | building | double-swing scissor grille 2.4×2.2 | 2.70×0.20×2.36 | 7,964 | 31 | 2 | **2** | 150 KB |
| 9 | `storefront.py` | building | bodega front 4.2 m + gooseneck lamp | 4.85×0.85×3.17 | 9,460 | 20 | 12 | **1** | 204 KB |
| 10 | `washing_machine.py` | interior | commercial front-loader 685×740×1130 | 0.71×0.86×1.13 | 2,002 | 9 | 8 | **1** | 69 KB |
| 11 | `refrigerator.py` | interior | glass-door reach-in ~2.0 m | 0.76×0.83×2.04 | 2,356 | 15 | 6 | **1** | 78 KB |
| 12 | `bodega_shelf.py` | interior | gondola bay 1.2 m, dressed with goods | 1.22×0.56×1.86 | 9,120 | 56 | 14 | 0 | 258 KB |
| | **Total** | | | | **82,462** | 219 | | **5** | **1.80 MB** |

All 12 requested categories were generated — none blocked. Every asset sits exactly on the
ground plane, origin at footprint center, metres in the GLB (program units are mm; export
converts), fronts facing glTF +Z.

## 2. Visual quality (see `renders/contact_sheet.png`)

Studio previews (Cycles CPU, identical rig for all 12) show a coherent, believable set: the
DSNY basket reads instantly, the hydrant has the right three-way silhouette with pentagon caps,
the bench has the Parks-green loop arm + oak slats, the washer/fridge read as laundromat
appliances, the bodega shelf ships "dressed" with stock, the storefront carries a raised gold
BODEGA sign under a gooseneck lamp. This is **not** primitive blockout quality; it is clean
low-poly-to-mid-poly prop quality with honest proportions.

Honest defects we accept (and how to fix them, in 05): the basket is the heaviest asset
(15.8k tris — the fixed 0.05 mm chord tolerance gives every Ø470 torus 64×24 segments; fewer,
wider straps would halve it), the fridge glass reads milky in Cycles (transmission + alpha
stack), and the storefront stucco tint is one hex away from warmer grey.

## 3. Real-world references

The spec asked for reference research before modeling. The image-search service was **unavailable
from this environment** (all queries timed out; recorded honestly). Dimensions and paint schemes
were instead taken from published/public knowledge of the objects (DSNY basket & bin programs,
NYC Parks settee, M&H/Mueller hydrant service drawings, mast-arm streetlight standards) and are
stated per-program in each file's docstring. Proportions were sanity-checked against those
sources, not eyeballed.

## 4. Articulation experiments (≥3 required, 5 delivered)

Five revolute joints across four assets: apartment door (`door_hinge`, 0–105°), both security
gate leaves (`gate_leaf_left` + auto-mirrored twin, 0–95°), washer door (`door_hinge`, 0–135°),
storefront door (`storefront_door_hinge`, 0–95°), fridge door (`fridge_door_hinge`, 0–110°).

What survives the GLB export (verified by re-parsing the GLBs and in three.js):

* the **kinematic node nesting** — a node per joint at its pivot, child part under it;
* per-joint **`s3d_joint` extras**: `{name, type (URDF word), value (current pose), axis
  (already converted to glTF Y-up), lower, upper (radians/metres)}` — three.js surfaces these
  as `Object3D.userData.s3d_joint`;
* correct **pivots** (the door swings about its hinge edge, the gate leaves about the jambs).

What does **not** survive: **animation**. There are no glTF animation clips, no skinning. The
GLB is a posed mechanism *specification*, not motion. Runtime motion must be implemented in
three.js — in our showcase it took ~15 lines (`poseJoint`: rotate the joint node about
`extras.axis`, clamped to `lower/upper`). This matches how FIRST SLICE already drives
interactions (`interactionDefs.ts`), so it is a workable shape, but teams expecting
AnimationClips will be surprised. **Do not claim runtime animation support from source
joints alone** — the claim we can make is narrower and verified: *pivots, hierarchy, axis and
limits survive; the motion is ours to write.*

## 5. Geometry quality notes

* **0 degenerate triangles** across all 12 GLBs (validator counts zero-area tris from the
  buffers) — unusual for boolean-heavy output and a credit to the mm-snapped determinism layer.
* Booleans leave **n-gons and fan triangulation** around cut regions (normal Blender boolean
  result). three.js does not care; a future Blender "artistic correction" pass (05) can clean
  and reduce if an asset ever needs edits.
* Curve tessellation is **global and fixed** (0.05 mm chord, 24–64 segments/turn): you budget
  polygons by design (fewer/leaner parts), not by tolerance. The basket and shelf are the
  expensive lessons; the bin proves the floor (688 tris).
* **No UVs, no textures** (validator: `TEXCOORD_0` absent everywhere) — flat PBR factors only.
  Matches FIRST SLICE's untextured Lambert art direction; a blocker for grime/signage detail
  without a downstream bake pass.

## 6. Build cost (the "modeling speed" measurement)

Headless, 2 CPU cores, no GPU: **0.10–1.22 s per asset** including scene build + GLB export
(`validation/build-manifest.json`). Cycles preview render ≈ 15–25 s per 640 px frame. Editing an
asset = edit three numbers, re-run — the fastest edit loop we have ever had for this class of
prop. The cost is concentrated in *writing the program correctly*, not in running it.

## 7. Determinism (our environment, not just sand3d's CI)

`hydrant` and `washing_machine` were rebuilt twice in fresh interpreters and exported GLBs
compared by SHA-256: **byte-identical** (`DETERMINISM OK` in `build-manifest.json`). Same
program + same sand3d/bpy versions ⇒ same asset, bit for bit.

## 8. Provenance & licensing of the pack

* All 12 programs are original work for this evaluation, except `washing_machine.py`, which is
  **adapted from Sandflow's Apache-2.0 example `programs/washing_machine.py`** (same joint
  vocabulary; dimensions, materials, proportions and orientation reworked; credit in the file
  header). Apache-2.0 requires retaining the license notice — done; if these assets ship,
  mirror the notice into `docs/production/sandflow/ASSET-LICENSES.md`.
* No HF dataset content was used. sand3d the tool is Apache-2.0 and imposes no obligation on
  the GLBs we author with it.
* The pack contains no scanned/copyrighted geometry.

## 9. Iteration log (what the authoring loop actually felt like)

Six build/fix cycles to 12/12, driven by sand3d's excellent error messages. Recurring lessons
that the workflow (05) now encodes as conventions:

1. `pocket`/`hole` on a part must happen **before** the part is `at`-placed (frames read on
   placed parts operate in the part's own space).
2. A face frame's origin sits at the **foot** (the object origin's projection): vertical
   positions on `face("-Y")` use `move(y=height)`, never `z`.
3. `grid()` is **centred** on its plane — never add your own centering offset on top of it.
4. `box()` starts at z=0 (not z-centred) — children of a group placed "centred" must subtract
   their own half-height.
5. `assembly(name, *children, **anchors)`: **anchors are frames/numbers, not parts** — a
   jointed part passed as `door=leaf` silently drops out of the exported tree; pass parts
   positionally (the joint hangs them kinematically regardless).
6. Helper functions that make parts must take the node `name` explicitly (makers do).
7. Python shadowing (`lid = s3d.at(lid(), …)`) is the #1 silly crash — sand3d's `_guard`
   catches the worse mistakes but not this one.

None of these are tool defects; all are learnable conventions that an LLM (or a human) writes
correctly once the program skeleton from `programs/` is used as the template.
