#!/usr/bin/env bash
# setup_trellis.sh — one-shot environment setup for tools3d/generate_glb.py
# on a CUDA machine. Run from the repo root:  bash tools3d/setup_trellis.sh
#
# What it does:
#   1. Guards on a real NVIDIA GPU + ~30 GB free disk + conda.
#   2. Clones the OFFICIAL microsoft/TRELLIS repository (if not present).
#   3. Creates the conda env `trellis` (python 3.10 + torch 2.4.0 cu118).
#   4. Runs TRELLIS's own setup.sh with every extension the demo needs.
#   5. Installs the local text-to-image stage (diffusers) for --text mode.
#
# Weights download on first run (HF cache, ~5-10 GB):
#   microsoft/TRELLIS-image-large  +  stabilityai/stable-diffusion-xl-base-1.0

set -euo pipefail
cd "$(dirname "$0")"

fail() { echo "SETUP BLOCKED: $*" >&2; exit 1; }

# 1. hardware guard — fail honestly, no half-set-up env
command -v nvidia-smi >/dev/null 2>&1 || fail "no nvidia-smi — TRELLIS requires a CUDA GPU (16 GB+ VRAM recommended)."
nvidia-smi >/dev/null 2>&1 || fail "nvidia-smi present but GPU not usable."
command -v conda >/dev/null 2>&1 || fail "conda not found — install miniconda first (TRELLIS pin python=3.10)."
FREE_GB=$(df -BG . | awk 'NR==2 {print int($4)}')
[ "$FREE_GB" -ge 30 ] || fail "only ${FREE_GB} GB free — need ~30 GB (weights + torch + env)."

echo "[1/5] GPU OK: $(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader)"

# 2. official repo
if [ ! -d TRELLIS ]; then
  echo "[2/5] cloning official microsoft/TRELLIS ..."
  git clone --depth 1 https://github.com/microsoft/TRELLIS.git
fi

# 3-4. env + extensions via TRELLIS's own setup.sh (the supported path)
echo "[3/5] creating conda env 'trellis' (torch 2.4.0 + cu118) ..."
source "$(conda info --base)/etc/profile.d/conda.sh"
conda env list | grep -q "^trellis " || conda create -n trellis python=3.10 -y
conda activate trellis
conda install -y pytorch==2.4.0 torchvision==0.19.0 pytorch-cuda=11.8 -c pytorch -c nvidia
echo "[4/5] installing TRELLIS extensions (basic, xformers, flash-attn, spconv, kaolin, nvdiffrast, ...) ..."
(cd TRELLIS && bash setup.sh --basic --xformers --flash-attn --spconv --mipgaussian --diffoctreerast --kaolin --nvdiffrast)

# 5. local text-to-image for --text mode
echo "[5/5] installing diffusers (local SDXL for --text mode) ..."
pip install "diffusers>=0.31" "transformers>=4.44" accelerate sentencepiece protobuf

echo
echo "Done. Generate a mesh:"
echo "  conda activate trellis"
echo "  python tools3d/generate_glb.py --text 'lowpoly new york coffee cart, cozy diorama' --out web-three/public/models/cart.glb"
