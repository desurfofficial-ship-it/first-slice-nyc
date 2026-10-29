# gen3d — programmatic .glb generation for FIRST SLICE (no local GPU)

`generate_glb.py` turns **text prompts or reference images into textured `.glb` 3D
assets** by driving open-source 3D models hosted on **free Hugging Face Spaces**
through `gradio_client`. Nothing runs locally — the script uploads the input,
waits for the Space's GPU queue, downloads the resulting mesh, validates the
glTF magic bytes, and saves it (plus a provenance `.json`) to `output/`.

This is the asset pipeline for replacing the procedural placeholder geometry in
`web-three/` (characters, cars, props) with real generated meshes.

## Setup

```bash
pip install -r tools/gen3d/requirements.txt   # just gradio_client
```

Optional but strongly recommended: create a **free** Hugging Face token and
export it — this switches ZeroGPU billing from your shared IP to your own
account quota:

```bash
export HF_TOKEN=hf_xxx        # https://huggingface.co/settings/tokens (role: read)
```

## Usage

```bash
cd tools/gen3d

# text -> 3D (TRELLIS.2 wrapper; auto-falls back to Hunyuan3D then TRELLIS mirrors)
python generate_glb.py --text "a friendly middle-aged deli shop owner, cartoon style, T-pose" --out rosa

# image -> 3D (photo, AI-generated render, anything with a clear subject)
python generate_glb.py --image input/rosa.png --out rosa

# pick a backend explicitly, control quality knobs
python generate_glb.py --image input/taxi.png --backend hunyuan3d --octree-resolution 320 --seed 7
python generate_glb.py --image input/taxi.png --backend trellis --mesh-simplify 0.9 --texture-size 1024

# untextured (white) shape only, e.g. for collision prototyping
python generate_glb.py --text "a sandwich board sign" --no-texture

# diagnostics
python generate_glb.py --list-backends
python generate_glb.py --probe
```

Outputs land in `output/`: `<name>.glb`, `<name>.json` (prompt/seed/backend/
params for reproducibility), and for text runs that use the FLUX chain,
`<name>.png` (the intermediate concept image — reuse it with `--image` for
regenerating the same asset with a different backend).

## Backends

| backend | HF Space | modes | notes |
|---|---|---|---|
| `trellisapi` | `jainarham/trellis-3d-api` | text **and** image → GLB | TRELLIS.2 wrapper, single call; 3rd-party Space, can be flaky ("Expired ZeroGPU proxy token" = just retry) |
| `hunyuan3d` | `tencent/Hunyuan3D-2` | text (caption) **and** image → textured GLB | official Tencent Space, two output files, script picks the textured one |
| `trellis` | `trellis-community/TRELLIS` | image → GLB | official-style TRELLIS, one call, `--mesh-simplify` / `--texture-size` |
| `trellis2` | `microsoft/TRELLIS.2` | image → GLB | official Microsoft Space, 3-step session flow |
| (text→image) | `black-forest-labs/FLUX.1-schnell` | prompt → PNG | used automatically before image-only backends in text mode |

`--backend auto` (default) walks the list in order and stops at the first
success. All 3D Spaces above are ZeroGPU-hosted community/official mirrors and
die or hibernate from time to time — if one vanishes, find a live mirror
(<https://huggingface.co/spaces?sort=trending&search=trellis>) and either edit
`BACKENDS` in the script or pass `--space trellis=org/MirrorName`.

## ZeroGPU quota — what to expect

Every 3D Space listed runs on **ZeroGPU**: calls are free but quota-metered.

- **Anonymous** (no `HF_TOKEN`): a small daily allowance tied to your IP. When
  exhausted you'll see `You have exceeded your ZeroGPU quota (Ns requested vs.
  Ns left). Try again in H:MM:SS` — the script surfaces this with a hint.
- **Free account token**: a larger daily allowance per account; enough for a
  handful of assets per day. Set `HF_TOKEN` or pass `--token`.
- The `trellisapi` wrapper runs on `cpu-basic` hardware, so *your* quota is
  untouched when it works; its internal proxy token occasionally expires —
  retrying usually fixes it.
- Quota windows reset on their own (typically within a day).

## Getting game-ready results

1. **Characters**: text mode with a T-pose/standing prompt, or better: generate
   a clean concept image first (white background, single character, full body)
   and feed it with `--image`.
2. **Cars/props**: three-quarter view, plain background, "game asset" in the
   prompt works well.
3. `--no-texture` gives a white mesh useful for checking silhouette/geometry.
4. If a mesh is too heavy for the web build, lower `--octree-resolution`
   (Hunyuan), raise `--mesh-simplify` (TRELLIS), or lower `--decimation-target`
   (TRELLIS.2).
5. Copy finished GLBs into `web-three/public/models/` named after a prop id —
   `hydrant.glb`, `mailbox.glb`, `trashcan.glb`, `streetlamp.glb` (see
   `docs/28-glb-asset-seam.md`). The game swaps them in automatically at boot;
   missing files just keep the procedural placeholder.

## Relation to `tools3d/`

`tools3d/` holds the *local* pipeline: a setup script that installs the official
microsoft/TRELLIS on a CUDA machine (Track A) and a parametric generator for the
deterministic cast (Track B). This folder (`tools/gen3d/`) is the GPU-less
alternative: same inputs, same `.glb` outputs, but generation happens on free
Hugging Face Spaces. Use `tools3d/` Track A when you have a big GPU, this folder
when you don't.
