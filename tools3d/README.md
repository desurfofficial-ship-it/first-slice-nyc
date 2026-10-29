# tools3d — local 3D generation pipeline (no cloud APIs)

Two ways to produce `.glb` meshes for FIRST SLICE, both fully local:

| Track | Script | Needs | What it makes |
|---|---|---|---|
| **A — TRELLIS** | `setup_trellis.sh` → `generate_glb.py` | CUDA GPU (16 GB+ VRAM), ~30 GB disk, conda | organic meshes from **images or text prompts** (official microsoft/TRELLIS) |
| **B — Parametric** | `procedural_glb.py` | any CPU + `pip install trimesh numpy pillow` | the deterministic cast: people + cars, palette-locked, KB-sized |

## Track A — TRELLIS (image / text → GLB)

```bash
bash tools3d/setup_trellis.sh        # guards on GPU, clones official repo, conda env, extensions
conda activate trellis
python tools3d/generate_glb.py --text "lowpoly yellow coffee cart, cozy diorama" --out models/cart.glb
python tools3d/generate_glb.py --image sketch.png --out models/prop.glb --seed 3
```

- Clones the **official** `microsoft/TRELLIS` into `tools3d/TRELLIS/` (gitignored; the setup
  script re-creates it anywhere). Text mode runs a **local** SDXL first — no cloud calls.
- Weights download on first run into the HF cache (`microsoft/TRELLIS-image-large`,
  `stabilityai/stable-diffusion-xl-base-1.0`).
- **Honest status:** this sandbox has **no NVIDIA GPU / 4 GB RAM**, so Track A was cloned +
  scripted + reviewed here but **could not execute inference** — flash-attn/xformers/spconv are
  CUDA-only and the box has no CUDA. The script fails loudly (`require_gpu()`) instead of
  pretending. On any CUDA machine, `setup_trellis.sh` takes it from zero to generating.

## Track B — parametric generator (runs anywhere, ran here)

```bash
python tools3d/procedural_glb.py --out-dir web-three/public/models   # all cast + cars
python tools3d/procedural_glb.py --kind person_rosa --out rosa.glb   # one model
```

Built the meshes the game actually ships (2026-10-29): `rosa/idris/kid/player/customer_a/
customer_b` (~1.72 m walkers, feet-origin, +Z-facing, proper heads/hair/limbs — replacing the
capsule "Plankton" era) and `car_taxi/car_sedan` (chassis, window band, wheels+hubs, bumpers,
lights). Geometry mirrors `World.ts`'s builders number-for-number, so the loaded GLB and the
in-code fallback are interchangeable; the game harmonizes materials to its Lambert palette.

## Using outputs in the game

`web-three/public/models/*.glb` → loaded at runtime by `World.loadInto()` (GLTFLoader) with the
built-in geometry as fallback. Regenerate any time; keep names identical.
