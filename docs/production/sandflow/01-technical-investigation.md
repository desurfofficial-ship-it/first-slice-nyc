# Sandflow / Sand3D — 01 Technical Investigation

**Project:** FIRST SLICE: A New York Story (`web-three`, Three.js + Vite + TypeScript)
**Evaluated:** `Sandflow-ai/sand3d` v1.6.3, repo commit `84c980a` (2026-11-06, "chore: release 1.6.3 (#16)"), PyPI package `sand3d==1.6.3`
**Method:** source-code inspection (all modules in `src/sand3d/`, ~6,800 LOC), the bundled examples (`docs/examples/`, `programs/`), the test suite (`tests/`, incl. determinism and export-joint tests and the `tests/golden/bpy-5.2.json` golden digests), the PyPI build (`pip install sand3d`), and live execution under `bpy 5.2.3 LTS` on Python 3.13.5. Marketing claims were only accepted where the source demonstrates them; everything we could not verify is listed as unverified in §5.

---

## 1. What sand3d is

sand3d is **not a generative AI model and not an asset library**. It is a small, deterministic,
procedural *modeling DSL* in Python, written over Blender's `bpy` module (in-process, no Blender
GUI, no Blender install — the wheel carries it). A "sand3d asset" is a **Python program** that
constructs geometry part by part through ~81 flat verbs (`s3d.box`, `s3d.revolve`, `s3d.joint`, …).
The same program run twice produces a bit-identical mesh; that is the library's core promise and
its tests enforce it (`tests/test_determinism.py` runs every public verb twice in fresh interpreters
with different `PYTHONHASHSEED`s and compares digests; golden digests ship in `tests/golden/bpy-5.2.json`).

Execution model (verified in `_core.py`, `_guard.py`):

* One Blender scene, mutated in place, verbs executed immediately (no build DAG, no lazy graph).
* No verb reads `bpy.context.active_object` or selection (`_core.py` header) — programs are
  context-free and therefore headless-safe and reproducible.
* Units: millimetres by default (`_core.UNITS = {"mm":1, "cm":10, "m":1000}`); `s3d.units("m")`
  is available but must be set before the first verb. **Export always converts to metres.**
* Geometry is emitted through `bmesh` with a **fixed chord tolerance of 0.05 mm** and segment
  counts clamped to 24–64 per turn, purely as a function of radius in mm (`_core.segments`,
  `_core.CHORD/TURN_MIN/TURN_MAX`). This is what makes `circle(600)` yield identical meshes on
  any machine, and it also means curve tessellation is *not tunable per asset* — a design
  consequence we measured in Phase 3 (§3.1 below).
* Transforms are snapped so entries within 1e-6 of a whole number become exact (`_core.snapped`),
  killing single-precision drift before booleans.
* Provenance is carried as *named* tags on faces/edges (`s3d_face:*`, `s3d_edge:*` in mesh
  attributes) and *named* custom properties on objects (`s3d_name`), so joins/booleans keep
  identity by name rather than by index.
* `_guard.py` turns common program mistakes into precise, human-readable errors at the *next*
  verb call (consumed tools of `cut`/`join`/`intersect`, an unused `at(...)` result, objects
  passed twice, removed-API keywords with migration hints). This is unusually good ergonomics
  for an LLM-facing API and it worked as advertised in our runs.

The repo is explicit about scope: **"No category verbs (`chair()`, `table()`): a category is a
program written *in* sand3d"** (README). There is no AI inference anywhere in the codebase, no
GPU requirement, and no runtime component. Everything it produces is *build-time* tooling —
which is exactly the deployment shape our constraints demand (§7).

## 2. Source architecture map

| Module | LOC | Role (verified by read) |
|---|---|---|
| `profile.py` | 947 | 2D profiles/paths: `rect, circle, slot, polygon, poly, arc, spline, superellipse, station, text, offset, stroke, wrap, mirror` |
| `solids.py` | 1,118 | `extrude, revolve, sweep, loft, body, wire, helix, box, cylinder, tube, cone, sphere, wedge, torus, dome` |
| `edit.py` | 1,387 | booleans and edits: `cut, join, intersect, split, hole, pocket, fillet, chamfer, soften, shell, dent, merge, scale, copy, delete` |
| `frames.py` | 851 | placement algebra: `Frame, face, edge, bbox, local, at, transform, grid, ring, along, snap` |
| `joints.py` | 723 | articulation: `joint, pose, seat`; kinematic tree kept **separate from the scene tree** |
| `materials.py` | 190 | 25 named PBR presets + overrides; resolves to one Principled BSDF per distinct look |
| `assembly.py` | 189 | `group, assembly, attach, Handle, export, empty_scene, units, fingerprint` |
| `urdf.py` | 456 | URDF writer **and** the GLB kinematic nesting (`glb_tree`) |
| `usd.py` | 274 | OpenUSD `.usda` text writer (UsdGeom + UsdPhysics) |
| `meshfile.py` | 72 | OBJ/STL writers |
| `_core.py` | 319 | bmesh builder, determinism primitives, naming |
| `_guard.py` | 181 | error diagnostics for LLM-written programs |

Dependency surface is minimal and pinned by markers (`pyproject.toml`): `bpy>=4.5,<4.6` on
Python 3.11, `bpy>=5.2,<5.3` on Python 3.13, **nothing else**. No wheel exists for Python 3.12
or for Intel Macs (5.2+). CI runs bpy 5.2.

## 3. Capability findings

### 3.1 Geometry and topology

Implemented and demonstrated: prisms, revolves, sweeps, lofts (via `station` sections), wires,
helices, gears/knurls/threads, booleans (`cut`/`join`/`intersect`), holes/pockets from named
faces, fillet/chamfer on *named* edge sets, `shell`, `dent` (impression-based dents),
`superellipse`/`loft` bodies (`body()` builds a solid from plan+side views — the closest thing
to organic shapes it offers).

Topology quality: booleans go through Blender's solver, so results are manifold and
export-safe, but n-gons and fan triangulation appear around cut regions (normal boolean
behavior, verified in our GLBs — with zero degenerate triangles). Curve tessellation is
globally fixed (0.05 mm chord): a Ø600 mm washer drum gets 64 segments/turn (the cap), while
a Ø40 mm knob gets 24 — reasonable for CAD-style props, generous for a game. Our measurements:
the 12 Phase-3 assets landed at 688–15,828 tris each (table in 03-asset-pack.md); the heavy
ones were wire/strap-heavy street furniture, not curve-heavy parts. There is **no
decimation/LOD tool** — poly budgeting must happen by design (simpler profiles, fewer
repeats) or downstream in Blender.

What it will not do: organic/sculpted shapes (no subdivision, no sculpting, no mesh editing
below the named-edge level). `docs/guidelines.md` admits this directly: *"Free forms still
resist: until sand3d has their verbs, a table may match a target better."* For FIRST SLICE's
street-furniture/building-hardware list (§6) this is a non-issue; it would matter for
characters, foliage, rubble, food.

### 3.2 Materials, UVs, textures — the biggest functional gap

`materials.py` implements exactly 25 presets (`oak walnut pine birch steel brushed_steel chrome
aluminium brass copper painted_metal plastic glossy_plastic rubber glass ceramic fabric velvet
leather marble concrete light`) with overrides for `color (sRGB hex), roughness, metallic,
opacity, emission`. `resolve()` assigns one Principled BSDF per distinct look; GLB export maps
them to baseColorFactor/metallicFactor/roughnessFactor/alpha, `KHR_materials_transmission` (glass),
`KHR_materials_clearcoat`, `KHR_materials_sheen`, `KHR_materials_emissive` where used.

**There are no textures and no UV generation.** Verbs never create UV layers; the API has no
texture verb; export carries no `TEXCOORD_0` (verified on our exported GLBs in Phase 3). Consequences:

1. Anything that needs maps — grime, brick, posters, signage art, decals, baked AO — must be
   produced *downstream* in Blender (bake/UV-unwrap) or in the game engine. sand3d output is
   flat-PBR only.
2. Fine material variation (the visual texture of a real NYC street) has to come from geometry
   or from the downstream pipeline. This is the single most important quality ceiling of the tool
   for our use case.
3. It also keeps GLBs tiny and texture-memory-free — which happens to match FIRST SLICE's
   current art direction (flat untextured `MeshLambertMaterial` vertex colors, per
   `web-three/src/core/palette.ts` and `World.ts`). For *this* project the gap is smaller than
   it would be for a PBR-heavy project.

### 3.3 Object hierarchy and naming

`group`/`assembly`/`attach` build a scene tree; program names survive to the GLB (`s3d_name`
custom property protects them from Blender's `.001` suffixing, and export renames objects
temporarily so nodes keep program names — `urdf.glb_tree`). Mesh objects are named after their
maker call. Node names in the exported GLB matched our program names exactly (verified by
re-parsing our GLBs). One caveat: materials get generated names like
`painted_metal color="#2b4a3e" roughness=0.4` — functional but ugly in the three.js material
list; we normalized names in the showcase.

### 3.4 Articulation — implemented, exported as metadata, **not as animation**

`joints.py` implements `revolute`, `continuous`, `prismatic`, `free` kinds, multi-joint
composition, `follows`/`ratio` (mimic joints, e.g. a screw), range enforcement, and `pose()`.
Joints are stored as custom properties (`s3d~joints`, `s3d~parent`, `s3d~rest`) — the kinematic
tree is deliberately kept apart from the scene tree.

On GLB export (`urdf.glb_tree`, read in full):

* A **node per joint** is inserted at its pivot, under the part the joint hangs on, and the
  child part hangs under that node — i.e. the GLB carries a real kinematic node hierarchy.
* Each joint node carries **`extras`** (`s3d_joint` custom prop → glTF extras → three.js
  `Object3D.userData.s3d_joint`): `{name, type (URDF word), value (current pose, SI), axis
  (already converted to glTF Y-up as [x, z, −y]), lower, upper (SI), mimic?}`.
* The GLB is written **at the current pose** ("Build at rest" is the documented program rule).
* **There are no glTF animations, no skinning, no AnimationClips.** Motion data is metadata a
  runtime must interpret.

Verified end-to-end in Phase 3/4: our apartment door, security gate leaves, washer door and
storefront door exported with correct pivots/hierarchy, and three.js read `userData.s3d_joint`
and drove the doors with ~20 lines of runtime code (04-integration doc, `joint-driver` section).
So the honest statement is: **sand3d preserves pivots, hierarchy, axis and limits — the
*mechanism spec* — but runtime motion must be implemented in Three.js regardless.** That is
acceptable for our interaction system (we already drive doors/props in `interactionDefs.ts`),
but teams expecting animations out of the box will be surprised.

### 3.5 GLB/GLTF export

One call: `s3d.export(root, "x.glb")` (`assembly.py`, read in full). Verified behavior:

* Writes **only the root's tree** (a temp collection is exported, not the scene — CHANGELOG
  1.6.3 fixed "the rest of the scene comes along").
* Program units → metres (root scale), Z-up → Y-up via Blender's glTF exporter.
* Materials exported only if the program set any (`export_materials="EXPORT" if dressed`).
* `export_extras=True` — this is what carries the joint metadata.
* Meshes are re-wrapped through `bmesh` copies before export (`_lend_meshes`) to survive the
  exporter's `validate()` — an unusual but sound hygiene step; names are preserved.
* Also writes URDF (link per moving body, at rest, limits), USDA (UsdGeom+UsdPhysics), OBJ, STL.
  URDF/USD exist for robotics/sim consumers; not needed by FIRST SLICE but relevant if the
  owner later wants physics-engine validation of the same source.

### 3.6 Metadata preservation

Joint metadata (§3.4) is the one first-class extras payload. There is no API for arbitrary
per-object extras beyond what Blender custom properties would carry informally — we did not
need more, but if FIRST SLICE later wants per-asset licensing or gameplay tags embedded in the
GLB, that would have to be post-processed (or patched at export time in our wrapper).

### 3.7 Determinism and reproducibility

Mechanism (§1) plus: `s3d.fingerprint()` returns a digest of program state; golden digests are
committed for bpy 5.2; the determinism test drives every public verb in two hash-seeded
processes. Our own Phase 3 check: running the hydrant program twice in fresh interpreters
produced byte-identical GLBs (SHA-256 match) — recorded in `tools3d/sandflow_eval/validation/`.

## 4. The datasets — programs, not assets

Verified against the HF API, per-dataset READMEs, `datasets-server` row samples, and upstream
sources (agent report, 2026-11-07; URLs in Appendix A):

| dataset | rows | storage | what a row is |
|---|---|---|---|
| sand3d-objaverse | 66,887 | 182.6 GB | a sand3d program + render + `.usda` rebuilt from an Objaverse object |
| sand3d-cad | 24,495 | 3.5 GB | program from public CAD (Zero-To-CAD, CADFS); rigid, 0 joints |
| sand3d-articraft | 9,209 | 8.3 GB | articulated objects (9,139 articulated, 33,444 joints) |
| sand3d-simready | 2,334 | 4.7 GB | NVIDIA SimReady assets rebuilt as programs (434 articulated) |
| sand3d-automate | 3,169 | 1.2 GB | mechanical assemblies (869 articulated) + 2,297 parts |

Key correction to any marketing-shaped reading: **"66,887 assets" ≠ 66,887 game-ready assets.**
Every row is a *program* (plus a self-reported pipeline F-score, explicitly "not an independent
judge"). To use one you execute it with sand3d+bpy and export; quality/fidelity per row varies
by construction, and the datasets contain no textures, no game LODs, no collision proxies.
The explorer Space (FastAPI, CPU) shows pre-built GLBs only for "a varied sample" held in a
separate repo (`sand3d-explorer-assets`).

For FIRST SLICE the datasets are **search/reference corpora** (e.g. mine a fire-hydrant-like
program as a starting point) — not a source of shippable models. We did not ship any dataset
content in the evaluation pack; our 12 assets are original programs (one washer derives from
the repo's Apache-2.0 example program, credited in 03-asset-pack.md).

## 5. Evidence classes

| Claim | Class | Evidence |
|---|---|---|
| 81-verb API, profiles/solids/edits/frames/joints | Implemented in source | `src/sand3d/*` read; our programs exercised ~30 verbs |
| Determinism (bit-identical rebuilds) | Implemented + verified | repo test suite + our SHA-256 check |
| GLB export w/ joints in extras, metres, Y-up | Implemented + verified | `urdf.py` + our GLB re-parse + three.js load |
| 25 material presets, flat PBR, no textures/UVs | Implemented + verified | `materials.py` + GLB inspection |
| Datasets: 106k programs, CC-BY-4.0 w/ per-row attribution | Verified via API/READMEs | agent report, Appendix A |
| "2–6× fewer tokens than Blender Python/CadQuery" | Claimed (methodology published, not re-measured) | README + sand3d.sandflow.ai/tokens.html |
| Dataset F-scores (0.70/0.90 floors) | Claimed — self-reported by pipeline | dataset READMEs |
| GUI, texturing, sculpting, LOD, animation export | **Not features** | absent from source by design |
| Windows/macOS bpy wheel availability for 5.2 | Partially unverified | README states no Intel-Mac wheels; we ran Linux x86_64 only |

## 6. Fit against FIRST SLICE's asset needs

Strength match: mechanical/architectural props built from profiles, revolves and booleans —
hydrants, bins, benches, poles, boxes, doors, gates, appliances, shelving. Our 12-asset pack
(03-asset-pack.md) succeeded for **12/12 categories**, with 5 revolute joints across 4 assets.

Weak match: anything organic, sculpted, texture-driven, or character work; anything needing
baked lighting; high-fidelity hero assets that live on per-pixel detail. Also weak: *fast
variation* (e.g. 50 unique storefronts) is strong in code but each variant still costs a
program write.

## 7. Runtime/dependency fit (why the build-time-only shape works for us)

* sand3d is **not** added to the game: the game keeps its existing GLTF/GLB loading (three
  `GLTFLoader` seam, `World.upgradePropWithGLB` / `upgradeFurnitureWithGLB`). sand3d runs in an
  isolated Python venv at authoring time; its only output is a `.glb` file. Removing sand3d
  removes nothing from the game.
* The joint-extras convention is the only integration surface: three.js reads
  `userData.s3d_joint` (no schema lock-in — worst case we stop reading it).
* Hardware: CPU-only. `bpy` import ~1.2 s, ~1 GB RAM headroom needed (we ran in 4 GB).
  No GPU anywhere in the pipeline.

## 8. Open questions carried into Phase 3 (all answered there)

1. Real tri counts per asset class at the fixed chord tolerance → 03 §5.
2. Do fillet/chamfer survive boolean-heavy NYC prop shapes? → 03 §4 (two failures, worked around).
3. Does the joint extras schema survive three.js import untouched? → 04 §3.
4. Are exported meshes clean (normals, degenerates, scale) for the game's collision/merge
   pipelines (`mergeGltfParts`, `vertexFuse`)? → 04 §5–6.
5. Determinism in *our* environment (not just the repo's CI) → 03 §7.

---

### Appendix A — sources verified for §4

* https://huggingface.co/datasets/Sandflow/sand3d-objaverse (+`/api/datasets/…`, `datasets-server` first-rows)
* https://huggingface.co/datasets/Sandflow/sand3d-cad · sand3d-articraft · sand3d-simready · sand3d-automate (same endpoints)
* Upstream: allenai/objaverse (ODC-BY upstream, per-object licenses), ADSKAILab/Zero-To-CAD-1m (Apache-2.0), VladPyatov/CADFS (CC-BY-4.0, Onshape-derived caveat), Articraft data (CC-BY-4.0), nvidia/simready-assets (CC-BY-4.0), AutoMate (CC0 via Dryad DOI 10.5061/dryad.2547d7wvw)
* Explorer space: https://huggingface.co/spaces/Sandflow/sand3d-explorer (Docker SDK, FastAPI `app/main.py`, torch CPU + open_clip for "search by look")
