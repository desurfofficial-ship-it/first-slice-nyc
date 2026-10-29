#!/usr/bin/env python3
"""
generate_glb.py - text/image -> .glb 3D asset generator for FIRST SLICE: A NEW YORK STORY.

No local GPU needed: this script drives open-source 3D generation models hosted on
free Hugging Face Spaces through `gradio_client`, and saves the resulting .glb
meshes to disk programmatically.

Backends (tried in order when --backend auto):
  hunyuan3d   tencent/Hunyuan3D-2          /generation_all      text (caption) OR image -> textured GLB
  trellis     trellis-community/TRELLIS    /generate_and_extract_glb   image -> textured GLB (single call)
  trellis2    microsoft/TRELLIS.2          /preprocess_image + /image_to_3d + /extract_glb (3-step, session-based)

Text mode with image-only backends (trellis / trellis2): the prompt is first rendered
into a PNG with FLUX.1-schnell (black-forest-labs/FLUX.1-schnell, ZeroGPU) and that
image is fed to the 3D model. The intermediate PNG is kept next to the .glb.

Usage:
  python generate_glb.py --text "a yellow NYC taxi, game asset, white background"
  python generate_glb.py --image input/rosa.png --out rosa --backend trellis
  python generate_glb.py --text "..." --backend auto --seed 12 --texture-size 1024
  python generate_glb.py --probe          # check which Spaces are alive right now
  python generate_glb.py --list-backends  # show backend -> space mapping

Env:
  HF_TOKEN  optional Hugging Face token (raises ZeroGPU quota limits; free account works)

Exit codes: 0 ok | 1 all backends failed | 2 bad usage
"""
from __future__ import annotations

import argparse
import datetime as _dt
import inspect
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path
from typing import Any

try:
    from gradio_client import Client, handle_file
except ImportError:  # pragma: no cover
    sys.stderr.write("Missing dependency. Run:  pip install gradio_client>=1.5\n")
    sys.exit(2)

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUT_DIR = SCRIPT_DIR / "output"

FLUX_SPACE = "black-forest-labs/FLUX.1-schnell"

# ---------------------------------------------------------------------------
# Backend registry. `kind` selects the call sequence; `space` is the HF Space id.
# Mirrors die from time to time -- if one is down, pick another live copy of the
# same model (search https://huggingface.co/spaces?models=tencent/Hunyuan3D-2 etc.)
# and edit `space` here, or override per-run with --space backend=org/SpaceName.
# ---------------------------------------------------------------------------
BACKENDS: dict[str, dict[str, str]] = {
    # quota-free wrapper around TRELLIS.2: single-call text->3d AND image->3d,
    # runs on cpu-basic hardware (the Space does the GPU work with its own quota)
    "trellisapi": {"space": "jainarham/trellis-3d-api", "kind": "trellisapi"},
    "hunyuan3d": {"space": "tencent/Hunyuan3D-2", "kind": "hunyuan"},
    "trellis": {"space": "trellis-community/TRELLIS", "kind": "trellis1"},
    "trellis2": {"space": "microsoft/TRELLIS.2", "kind": "trellis2"},
}

TEXT_IMAGE_ORDER = ["trellisapi", "hunyuan3d", "trellis", "trellis2"]  # for --backend auto (text mode)
IMAGE_ORDER = ["trellisapi", "hunyuan3d", "trellis", "trellis2"]       # for --backend auto (image mode)


def log(msg: str) -> None:
    stamp = _dt.datetime.now().strftime("%H:%M:%S")
    print(f"[{stamp}] {msg}", flush=True)


# ---------------------------------------------------------------------------
# small helpers
# ---------------------------------------------------------------------------
def make_client(space: str, token: str | None) -> Client:
    """Create a gradio_client.Client, tolerating signature drift across versions."""
    kwargs: dict[str, Any] = {"verbose": False}
    if token:
        candidate_kwargs = ({"token": token}, {"hf_token": token})
        for kw in candidate_kwargs:
            try:
                inspect.signature(Client.__init__).bind(None, **kw)  # noqa: PLC2801
                kwargs.update(kw)
                break
            except TypeError:
                continue
    return Client(space, **kwargs)


def file_path_of(obj: Any) -> str | None:
    """Extract a local file path from whatever gradio_client returned."""
    if obj is None:
        return None
    p = getattr(obj, "path", None)
    if p:
        return str(p)
    if isinstance(obj, dict):
        p = obj.get("path") or obj.get("value")
        if p:
            return str(p)
    if isinstance(obj, (list, tuple)):
        for item in obj:
            got = file_path_of(item)
            if got:
                return got
    if isinstance(obj, str) and obj and not obj.startswith("<") and Path(obj).exists():
        return obj
    return None


def is_glb(path: str | None) -> bool:
    if not path or not Path(path).exists():
        return False
    try:
        with open(path, "rb") as f:
            return f.read(4) == b"glTF"
    except OSError:
        return False


def slugify(text: str, max_len: int = 40) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return (s[:max_len].rstrip("-") or "asset")


def save_bytes(dst: Path, src: str | None) -> Path | None:
    if not src or not Path(src).exists():
        return None
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    return dst


# ---------------------------------------------------------------------------
# text -> image (FLUX.1-schnell) for image-only backends
# ---------------------------------------------------------------------------
def text_to_image(prompt: str, token: str | None, seed: int, width: int, height: int,
                  steps: int, save_as: Path | None) -> str:
    log(f"FLUX.1-schnell: rendering prompt -> {width}x{height} png ...")
    client = make_client(FLUX_SPACE, token)
    result = client.predict(
        prompt=prompt,
        seed=max(0, seed) if seed >= 0 else 0,
        randomize_seed=seed < 0,
        width=float(width),
        height=float(height),
        num_inference_steps=float(steps),
        api_name="/infer",
    )
    path = file_path_of(result[0] if isinstance(result, (list, tuple)) else result)
    if not path or not Path(path).exists():
        raise RuntimeError("FLUX returned no image")
    if save_as:
        save_bytes(save_as, path)
        log(f"intermediate image saved -> {save_as}")
    return path


# ---------------------------------------------------------------------------
# backend: Hunyuan3D-2 (tencent/Hunyuan3D-2)  -- caption OR image -> textured glb
# ---------------------------------------------------------------------------
def run_hunyuan(client: Client, args: argparse.Namespace, image_path: str | None,
                prompt: str | None, seed: int) -> str:
    kwargs: dict[str, Any] = {
        "steps": float(args.steps),
        "guidance_scale": float(args.guidance_scale),
        "octree_resolution": float(args.octree_resolution),
        "check_box_rembg": True,
        "seed": float(max(0, seed)),
        "randomize_seed": seed < 0,
        "api_name": "/generation_all",
    }
    if image_path:
        kwargs["image"] = handle_file(image_path)
    elif prompt:
        kwargs["caption"] = prompt
    else:
        raise RuntimeError("hunyuan3d needs --image or --text")

    result = client.predict(**kwargs)
    files = [file_path_of(x) for x in (result if isinstance(result, (list, tuple)) else [result])]
    glbs = [p for p in files if p and p.lower().endswith(".glb") and Path(p).exists()]
    if not glbs:
        raise RuntimeError(f"no .glb in output (got: {files})")
    # two glbs come back: shape-only (white) + textured. Prefer the textured one.
    glbs.sort(key=lambda p: Path(p).stat().st_size, reverse=True)
    chosen = glbs[0] if args.texture else glbs[-1]
    for extra in glbs:
        if extra != chosen:
            log(f"secondary output (kept in temp): {Path(extra).name} "
                f"{Path(extra).stat().st_size // 1024} KB")
    return chosen


# ---------------------------------------------------------------------------
# backend: TRELLIS community (trellis-community/TRELLIS) -- image -> glb, 1 call
# ---------------------------------------------------------------------------
def run_trellis1(client: Client, args: argparse.Namespace, image_path: str | None,
                 prompt: str | None, seed: int) -> str:
    if not image_path:
        raise RuntimeError("this backend is image-only (text mode should have routed via FLUX)")
    result = client.predict(
        image=handle_file(image_path),
        seed=float(max(0, seed)),
        ss_guidance_strength=7.5,
        ss_sampling_steps=12.0,
        slat_guidance_strength=3.0,
        slat_sampling_steps=12.0,
        multiimage_algo="stochastic",
        mesh_simplify=float(args.mesh_simplify),
        texture_size=float(args.texture_size),
        api_name="/generate_and_extract_glb",
    )
    files = [file_path_of(x) for x in (result if isinstance(result, (list, tuple)) else [result])]
    glbs = [p for p in files if p and p.lower().endswith(".glb") and Path(p).exists()]
    if not glbs:
        raise RuntimeError(f"no .glb in output (got: {files})")
    glbs.sort(key=lambda p: Path(p).stat().st_size, reverse=True)
    return glbs[0]


# ---------------------------------------------------------------------------
# backend: TRELLIS.2 (microsoft/TRELLIS.2) -- 3-step session flow
# ---------------------------------------------------------------------------
def run_trellis2(client: Client, args: argparse.Namespace, image_path: str | None,
                 prompt: str | None, seed: int) -> str:
    if not image_path:
        raise RuntimeError("this backend is image-only (text mode should have routed via FLUX)")
    try:  # establishes a server-side session slot; optional in practice
        client.predict(api_name="/start_session")
    except Exception as exc:  # noqa: BLE001
        log(f"  start_session skipped: {type(exc).__name__}")

    pre = client.predict(handle_file(image_path), api_name="/preprocess_image")
    pre_path = file_path_of(pre) or image_path

    resolution = str(args.resolution)
    client.predict(
        image=handle_file(pre_path),
        seed=float(max(0, seed)),
        resolution=resolution,
        api_name="/image_to_3d",
    )
    result = client.predict(
        decimation_target=float(args.decimation_target),
        texture_size=float(args.texture_size),
        api_name="/extract_glb",
    )
    files = [file_path_of(x) for x in (result if isinstance(result, (list, tuple)) else [result])]
    glbs = [p for p in files if p and p.lower().endswith(".glb") and Path(p).exists()]
    if not glbs:
        raise RuntimeError(f"no .glb in output (got: {files})")
    glbs.sort(key=lambda p: Path(p).stat().st_size, reverse=True)
    return glbs[0]


# ---------------------------------------------------------------------------
# backend: TRELLIS.2 API wrapper (jainarham/trellis-3d-api) -- text OR image -> glb
# ---------------------------------------------------------------------------
def run_trellisapi(client: Client, args: argparse.Namespace, image_path: str | None,
                   prompt: str | None, seed: int) -> str:
    common: dict[str, Any] = {
        "seed": max(0, seed),
        "randomize_seed": seed < 0,
        "resolution": args.resolution,
        "ss_guidance_strength": 7.5,
        "ss_sampling_steps": 12.0,
        "shape_slat_guidance_strength": 7.5,
        "shape_slat_sampling_steps": 12.0,
        "tex_slat_guidance_strength": 1.0,
        "tex_slat_sampling_steps": 12.0,
        "decimation_target": float(args.decimation_target),
        "texture_size": float(args.texture_size),
    }
    if image_path:
        result = client.predict(image=handle_file(image_path),
                                api_name="/handle_image_to_3d", **common)
    elif prompt:
        result = client.predict(prompt=prompt,
                                api_name="/handle_text_to_3d", **common)
    else:
        raise RuntimeError("trellisapi needs --image or --text")

    files = [file_path_of(x) for x in (result if isinstance(result, (list, tuple)) else [result])]
    glbs = [p for p in files if p and p.lower().endswith(".glb") and Path(p).exists()]
    if not glbs:
        raise RuntimeError(f"no .glb in output (got: {files})")
    glbs.sort(key=lambda p: Path(p).stat().st_size, reverse=True)
    return glbs[0]


RUNNERS = {"hunyuan": run_hunyuan, "trellis1": run_trellis1, "trellis2": run_trellis2,
           "trellisapi": run_trellisapi}


# ---------------------------------------------------------------------------
# orchestration
# ---------------------------------------------------------------------------
def generate(args: argparse.Namespace, backend: str, prompt: str | None,
             image_in: str | None) -> tuple[Path, dict[str, Any]]:
    cfg = BACKENDS[backend]
    space = cfg["space"]
    kind = cfg["kind"]
    seed = args.seed

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    name = args.out or slugify(prompt or Path(image_in).stem)
    glb_dst = out_dir / f"{name}.glb"

    work_image = image_in
    flux_png: str | None = None
    t0 = time.time()

    # text mode needs the FLUX chain only for backends that are image-only
    if prompt and not work_image and kind in ("trellis1", "trellis2"):
        flux_png = str(out_dir / f"{name}.png")
        work_image = text_to_image(prompt, args.token, seed, args.flux_width,
                                   args.flux_height, args.flux_steps, Path(flux_png))

    log(f"{backend} ({space}): generating {kind}{' w/ texture' if args.texture else ''} ...")
    client = make_client(space, args.token)
    src_glb = RUNNERS[kind](client, args, work_image, prompt, seed)

    if not is_glb(src_glb):
        raise RuntimeError(f"downloaded file failed glTF validation: {src_glb}")
    save_bytes(glb_dst, src_glb)
    size = glb_dst.stat().st_size
    log(f"OK {glb_dst}  ({size // 1024} KB, {time.time() - t0:.0f}s)")

    meta = {
        "asset": glb_dst.name,
        "bytes": size,
        "backend": backend,
        "space": space,
        "prompt": prompt,
        "image": image_in,
        "intermediate_image": flux_png,
        "seed": seed,
        "params": {
            "steps": args.steps,
            "guidance_scale": args.guidance_scale,
            "octree_resolution": args.octree_resolution,
            "mesh_simplify": args.mesh_simplify,
            "texture_size": args.texture_size,
            "resolution": args.resolution,
            "decimation_target": args.decimation_target,
        },
        "generated_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
    }
    (out_dir / f"{name}.json").write_text(json.dumps(meta, indent=2))
    return glb_dst, meta


def try_generate(args: argparse.Namespace, order: list[str], prompt: str | None,
                 image_in: str | None) -> list[tuple[str, str]]:
    """Run backends in order; returns list of (backend, error) for the failures."""
    errors: list[tuple[str, str]] = []
    for backend in order:
        cfg = BACKENDS[backend]
        if args.space_override.get(backend):
            cfg = dict(cfg, space=args.space_override[backend])
        try:
            glb, _meta = generate(args, backend, prompt, image_in)
            print(f"\nSUCCESS: {glb}\n")
            return errors
        except Exception as exc:  # noqa: BLE001
            msg = str(exc)
            short = msg[:400].replace("\n", " ")
            log(f"! {backend} failed: {type(exc).__name__}: {short}")
            if any(k in msg.lower() for k in ("quota", "gpu", "zerogpu", "payment")):
                log("  -> hint: ZeroGPU quota hit. Set HF_TOKEN (free account) and retry.")
            errors.append((backend, short))
    return errors


# ---------------------------------------------------------------------------
# cli
# ---------------------------------------------------------------------------
def parse_args(argv: list[str]) -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        description="Generate .glb 3D assets from text or images using free Hugging Face Spaces "
                    "(Hunyuan3D-2 / TRELLIS) -- no local GPU required.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--text", help="text prompt (direct for Hunyuan3D; via FLUX.1-schnell image for TRELLIS)")
    src.add_argument("--image", help="path to a reference image (png/jpg/webp); background will be removed by the Space")
    src.add_argument("--probe", action="store_true", help="check which backend Spaces are alive and exit")
    src.add_argument("--list-backends", action="store_true", help="print backend -> space mapping and exit")

    ap.add_argument("--backend", default="auto", help="auto | hunyuan3d | trellis | trellis2")
    ap.add_argument("--space", action="append", default=[], metavar="BACKEND=ORG/SPACE",
                    help="override the Space id for a backend, repeatable")
    ap.add_argument("--out", help="output asset name (without extension); default: slugified prompt")
    ap.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="output directory")
    ap.add_argument("--no-texture", dest="texture", action="store_false", default=True,
                    help="Hunyuan3D only: keep the untextured (white) shape instead of the textured mesh")
    ap.add_argument("--seed", type=int, default=-1, help="seed; -1 = randomize")
    ap.add_argument("--token", default=os.environ.get("HF_TOKEN"), help="HF token (default: $HF_TOKEN)")

    g_hy = ap.add_argument_group("hunyuan3d options")
    g_hy.add_argument("--steps", type=float, default=30, help="diffusion steps")
    g_hy.add_argument("--guidance-scale", type=float, default=5.0)
    g_hy.add_argument("--octree-resolution", type=float, default=256, help="16..512, higher = denser mesh")

    g_tr = ap.add_argument_group("trellis options")
    g_tr.add_argument("--mesh-simplify", type=float, default=0.95)
    g_tr.add_argument("--texture-size", type=float, default=1024, help="texture map resolution")

    g_t2 = ap.add_argument_group("trellis2 options")
    g_t2.add_argument("--resolution", choices=["512", "1024", "1536"], default="1024")
    g_t2.add_argument("--decimation-target", type=float, default=300000)

    g_fx = ap.add_argument_group("text->image options (FLUX.1-schnell chain)")
    g_fx.add_argument("--flux-width", type=int, default=1024)
    g_fx.add_argument("--flux-height", type=int, default=1024)
    g_fx.add_argument("--flux-steps", type=float, default=4)

    ns = ap.parse_args(argv)
    ns.space_override = {}
    for item in ns.space:
        if "=" not in item:
            ap.error(f"--space expects BACKEND=ORG/SPACE, got: {item}")
        k, v = item.split("=", 1)
        if k not in BACKENDS:
            ap.error(f"unknown backend '{k}' (choose from {', '.join(BACKENDS)})")
        ns.space_override[k] = v
    return ns


def probe() -> int:
    alive = 0
    spaces = sorted({*(b["space"] for b in BACKENDS.values()), FLUX_SPACE})
    for space in spaces:
        try:
            make_client(space, None)
            log(f"ALIVE  {space}")
            alive += 1
        except Exception as exc:  # noqa: BLE001
            log(f"DOWN   {space}  ({type(exc).__name__}: {str(exc)[:120]})")
    log(f"{alive}/{len(spaces)} spaces reachable")
    return 0 if alive else 1


def main(argv: list[str]) -> int:
    ns = parse_args(argv)

    if ns.list_backends:
        for name, cfg in BACKENDS.items():
            print(f"{name:<11} {cfg['space']:<32} ({cfg['kind']})")
        print(f"{'(text2img)':<11} {FLUX_SPACE:<32} (flux)")
        return 0

    if ns.probe:
        return probe()

    prompt = ns.text
    image_in = os.path.abspath(ns.image) if ns.image else None
    if image_in and not Path(image_in).exists():
        log(f"input image not found: {image_in}")
        return 2

    if ns.backend == "auto":
        order = TEXT_IMAGE_ORDER if prompt else IMAGE_ORDER
    else:
        order = [ns.backend]

    errors = try_generate(ns, order, prompt, image_in)
    if len(errors) == len(order):
        log("ALL BACKENDS FAILED:")
        for b, e in errors:
            log(f"  {b}: {e[:200]}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
