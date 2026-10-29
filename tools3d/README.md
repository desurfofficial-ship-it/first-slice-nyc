# tools3d — 3D generation pipeline for FIRST SLICE

Three ways to produce `.glb` meshes. On this GPU-less sandbox, **Track C is the only one that can run 3D neural networks** — it borrows the free hosted GPUs of Hugging Face Spaces instead of pretending we own one.

| Track | Script | Needs | What it makes |
|---|---|---|---|
| **A — TRELLIS (local)** | `setup_trellis.sh` → `generate_glb.py` | CUDA GPU (16 GB+ VRAM), ~30 GB disk, conda | organic meshes from **images or text prompts** (official microsoft/TRELLIS) |
| **B — Parametric** | `procedural_glb.py` | any CPU + `pip install trimesh numpy pillow` | the deterministic cast: people + cars, palette-locked, KB-sized |
| **C — HF Spaces (hosted)** | `spaces_glb.py` | any CPU + `pip install gradio_client` | organic meshes from **images or text prompts** via free hosted TRELLIS / Hunyuan3D Spaces |

## Track C — Hugging Face Spaces (image / text → GLB, no GPU needed)

`spaces_glb.py` drives the free public demos of the big open 3D models over
`gradio_client` — no local weights, no CUDA, no conda. Text mode paints a
concept image first (FLUX.1-schnell, also a free Space), then sends that image
to the 3D providers. It walks a fallback chain (`--space auto`) so one sleeping
Space never blocks a batch, verifies the glTF magic bytes of every download,
and writes a `meta.json` provenance record per asset.

```bash
pip install gradio_client                      # that's the whole dependency

# one prop from a prompt
python tools3d/spaces_glb.py --text "lowpoly yellow coffee cart, striped awning" --name cart

# one prop from a reference image
python tools3d/spaces_glb.py --image refs/hydrant.png --name hydrant

# the game's prop list (see tools3d/spaces_manifest.json)
python tools3d/spaces_glb.py --manifest tools3d/spaces_manifest.json

# inspect what the Spaces expose right now (no GPU used)
python tools3d/spaces_glb.py --probe
```

Providers, in auto order: `tencent/Hunyuan3D-2` → `tencent/Hunyuan3D-2.1` →
`tencent/Hunyuan3D-2mv` → `trellis-community/TRELLIS` (one-shot
`/generate_and_extract_glb`) → `microsoft/TRELLIS.2` (session:
`/start_session` → `/preprocess_image` → `/image_to_3d` → `/extract_glb`).
The classic `microsoft/TRELLIS` demo was CONFIG_ERROR when this track was
built, which is why the community + TRELLIS.2 mirrors sit in the chain.

- **Quota:** every provider is ZeroGPU — anonymous callers share a small
  per-IP budget; one mesh per run is realistic. Export `HF_TOKEN=<free token>`
  for your own (still free) quota and steadier queues.
- **Outputs** (default `--out-dir tools3d/out`): `<name>.glb`,
  `<name>.concept.png`, `<name>.preview.mp4` (when the Space returns one),
  `<name>.meta.json`. Feed reviewed meshes to the game via
  `--out-dir web-three/public/models` (same naming rule as Track B).
- **Honest status:** verified live against the Spaces on 2026-10-29 with
  gradio_client 2.0.3 (endpoint schemas probed anonymously; see
  `--probe`). Meshes are greybox candidates for art review — re-roll seeds
  and expect rejects.

## Track A — TRELLIS (image / text → GLB, local CUDA)

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
