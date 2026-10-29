#!/usr/bin/env python3
"""
generate_glb.py — programmatic .glb generation via Microsoft TRELLIS
(official repo, cloned by setup_trellis.sh into tools3d/TRELLIS).

Image mode:
    python tools3d/generate_glb.py --image photo.png --out models/prop.glb

Text mode (no cloud APIs — uses a LOCAL diffusers text-to-image model as the
first stage, then TRELLIS image-to-3D):
    python tools3d/generate_glb.py --text "lowpoly yellow coffee cart, cozy diorama" --out models/cart.glb

Requirements: CUDA GPU (>=16 GB VRAM recommended), env set up by
tools3d/setup_trellis.sh. On a machine without a GPU this script exits with
a clear error — use tools3d/procedural_glb.py there instead.
"""

import argparse
import os
import sys

def require_gpu() -> None:
    try:
        import torch
    except ImportError:
        sys.exit("torch is not installed. Run tools3d/setup_trellis.sh first.")
    if not torch.cuda.is_available():
        sys.exit(
            "No CUDA GPU available.\n"
            "  TRELLIS needs CUDA (flash-attn / xformers / spconv are CUDA-only).\n"
            "  On GPU-less machines use: python tools3d/procedural_glb.py\n"
            "  (parametric generator, CPU, no weights required)."
        )

def text_to_image(prompt: str, out_path: str, seed: int):
    """Local text-to-image stage for --text mode (diffusers SDXL-base)."""
    from diffusers import StableDiffusionXLPipeline
    import torch

    pipe = StableDiffusionXLPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, variant="fp16",
    )
    pipe.to("cuda")
    img = pipe(
        prompt + ", centered object, plain light-grey background, product shot, soft studio light",
        num_inference_steps=30, guidance_scale=7.0, generator=torch.Generator("cuda").manual_seed(seed),
    ).images[0]
    img.save(out_path)
    print(f"[t2i] wrote {out_path}")
    return out_path

def main() -> None:
    ap = argparse.ArgumentParser(description="Generate a .glb with TRELLIS (local, no cloud APIs).")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--image", help="input image (RGBA or RGB; background will be removed)")
    src.add_argument("--text", help="text prompt (runs local SDXL first, then image-to-3D)")
    ap.add_argument("--out", required=True, help="output .glb path")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--simplify", type=float, default=0.92, help="0..1 decimation ratio")
    ap.add_argument("--texture-size", type=int, default=1024)
    ap.add_argument("--cond-size", type=int, default=518, help="TRELLIS conditioning resolution")
    ap.add_argument("--t2i-cache", default="tools3d/out/t2i.png", help="where the text-mode image lands")
    args = ap.parse_args()

    require_gpu()

    # TRELLIS env vars must be set before trellis imports (see TRELLIS/example.py).
    os.environ.setdefault("SPCONV_ALGO", "native")
    os.environ.setdefault("ATTN_BACKEND", "xformers")

    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "TRELLIS"))

    from PIL import Image
    from trellis.pipelines import TrellisImageTo3DPipeline
    from trellis.utils import postprocessing_utils

    if args.text:
        image_path = text_to_image(args.text, args.t2i_cache, args.seed)
    else:
        image_path = args.image

    pipeline = TrellisImageTo3DPipeline.from_pretrained("microsoft/TRELLIS-image-large")
    pipeline.cuda()

    image = Image.open(image_path).convert("RGBA")
    outputs = pipeline.run(
        image,
        seed=args.seed,
        sparse_structure_sampler_params={"steps": 12, "cfg_strength": 7.5},
        slat_sampler_params={"steps": 12, "cfg_strength": 3.0},
        preprocess=True,
        cond_size=args.cond_size,
    )

    glb = postprocessing_utils.to_glb(
        outputs["gaussian"][0], outputs["mesh"][0],
        simplify=args.simplify, texture_size=args.texture_size,
    )
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    glb.export(args.out)
    print(f"[glb] wrote {args.out} ({os.path.getsize(args.out) / 1e6:.1f} MB)")

if __name__ == "__main__":
    main()
