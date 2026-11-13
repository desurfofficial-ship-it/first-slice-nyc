#!/usr/bin/env python3
"""
rebuild_cars.py — the FULL-GAME ASSET AUDIT's car rebuild (CPU, deterministic).

Why: the shipped car_sedan/car_taxi GLBs (procedural_glb.py make_car) read as
four floating slabs — no hood/trunk step, no wheel arches, no door seams, no
grille. This rebuild keeps the SAME seam contract (nose +X, axle along Z,
Y-up, wheels bottom at y=0, footprint 4.15 m × 1.86 m inside the world's
4.4 × 1.95 collider) and the SAME fusion law (every material flat, metallic 0
— postprocess_glb.py strips the rest before the files reach public/models/).

Design language: the Crown-Vic cab-forward NYC street car, stylized to the
game's palette (PAL below mirrors _nyc.py GAME). Two families:
  sedan  — teal coupe-ish 3-box, stone bumpers, door seams, mirrors
  taxi   — gold, checker belt band, amber roof light, same body family

Usage:
    python3 tools3d/rebuild_cars.py --out-dir web-three/public/models
"""
import argparse
import os

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual import TextureVisuals

# _nyc.py GAME palette (hex ints)
PAL = {
    "teal": 0x2A9D8F, "taxi": 0xF2C230, "cream": 0xFFF8F0, "stone": 0xE8E4DC,
    "ink": 0x3A3440, "window_dim": 0x3B3346, "manhole": 0x2B2730,
    "coral": 0xFF6B6B, "amber": 0xFFB85C,
}


def mat(hex_color: int) -> PBRMaterial:
    r, g, b = ((hex_color >> 16) & 255) / 255, ((hex_color >> 8) & 255) / 255, (hex_color & 255) / 255
    return PBRMaterial(baseColorFactor=[r, g, b, 1.0], metallicFactor=0.0,
                       roughnessFactor=1.0, doubleSided=False)


def part(geo: trimesh.Trimesh, pos, color: int, rz=0.0, rx=0.0) -> trimesh.Trimesh:
    if rz:
        geo.apply_transform(trimesh.transformations.rotation_matrix(rz, [0, 0, 1]))
    if rx:
        geo.apply_transform(trimesh.transformations.rotation_matrix(rx, [1, 0, 0]))
    geo.apply_translation(pos)
    geo.visual = TextureVisuals(material=mat(color))
    return geo


def box(sx, sy, sz) -> trimesh.Trimesh:
    return trimesh.creation.box(extents=[sx, sy, sz])


def cyl(r, h, sections=16) -> trimesh.Trimesh:
    return trimesh.creation.cylinder(radius=r, height=h, sections=sections)


def car_common(kind: str):
    """The shared body family. Returns (parts, palette). Nose +X."""
    body = PAL["taxi"] if kind == "taxi" else PAL["teal"]
    glass, stone, ink = PAL["window_dim"], PAL["stone"], PAL["ink"]
    parts = []

    # ---- three-box silhouette (lower body 4.15 m, hood/trunk steps) ----
    parts.append(part(box(4.15, 0.46, 1.80), (0, 0.55, 0), body))            # main rocker-to-belt slab
    parts.append(part(box(1.05, 0.20, 1.74), (1.52, 0.86, 0), body))          # hood step (front)
    parts.append(part(box(0.85, 0.20, 1.74), (-1.62, 0.86, 0), body))         # trunk step (rear)
    # cabin: belt shelf + ONE dark glass band (inset 0.08 from the body) with
    # body-color pillars breaking it into windshield / door / rear lights
    parts.append(part(box(2.15, 0.14, 1.78), (-0.12, 0.99, 0), body))         # belt shelf under glass
    parts.append(part(box(2.05, 0.34, 1.70), (-0.12, 1.20, 0), glass))        # the glass band
    for px in (0.86, -0.18, -1.10):                                           # A/B/C pillars, both sides
        for sgn in (1, -1):
            parts.append(part(box(0.16, 0.52, 0.06), (px, 1.23, sgn * 0.865), body))
    parts.append(part(box(2.17, 0.10, 1.78), (-0.12, 1.45, 0), body))         # roof cap

    # ---- wheel arches + wheels ----
    for sx in (-1.32, 1.32):
        for sz in (-0.80, 0.80):
            # arch: a short slab hugging the wheel top, hugging the body face
            parts.append(part(box(0.92, 0.16, 0.26), (sx, 0.62, sz), body))
            # trimesh cylinders are axis-Z already — the axle direction; no rotation
            parts.append(part(cyl(0.35, 0.20, 16), (sx, 0.35, sz), PAL["manhole"]))
            parts.append(part(cyl(0.14, 0.14, 12), (sx, 0.35, sz), PAL["stone"]))
    # rocker shadow band
    parts.append(part(box(3.30, 0.10, 1.84), (0, 0.245, 0), ink))

    # ---- ends: bumpers, grille, plates, lights ----
    for sx in (2.10, -2.10):
        parts.append(part(box(0.14, 0.20, 1.86), (sx, 0.42, 0), stone))       # bumper beam
        parts.append(part(box(0.10, 0.16, 0.42), (sx, 0.28, 0), stone))       # bumper lower lip
    parts.append(part(box(0.06, 0.16, 0.70), (2.16, 0.72, 0), ink))           # grille bar
    parts.append(part(box(0.05, 0.14, 0.30), (2.19, 0.44, 0), PAL["cream"]))  # front plate
    parts.append(part(box(0.05, 0.14, 0.30), (-2.19, 0.44, 0), PAL["amber"]))  # rear plate
    for sz in (-0.62, 0.62):
        parts.append(part(box(0.10, 0.14, 0.30), (2.14, 0.72, sz), PAL["cream"]))             # headlights
        parts.append(part(box(0.08, 0.13, 0.26), (-2.14, 0.72, sz), PAL["coral"]))            # taillights

    # ---- mirrors (A-pillar, both sides) ----
    for sgn in (1, -1):
        parts.append(part(box(0.05, 0.03, 0.12), (1.12, 1.02, sgn * 0.94), body))
        parts.append(part(box(0.07, 0.10, 0.05), (1.10, 1.10, sgn * 0.99), body))
    return parts


def make_sedan() -> trimesh.Scene:
    return _scene(car_common("sedan"))


def make_taxi() -> trimesh.Scene:
    parts = car_common("taxi")
    # checker belt band (the NYC cab signature): alternating ink/cream squares
    x = -1.55
    i = 0
    while x < 1.55:
        parts.append(part(box(0.24, 0.10, 0.03), (x, 0.90, 0.925), PAL["ink"] if i % 2 == 0 else PAL["cream"]))
        parts.append(part(box(0.24, 0.10, 0.03), (x, 0.90, -0.925), PAL["cream"] if i % 2 == 0 else PAL["ink"]))
        x += 0.26
        i += 1
    # roof light: dark base + amber T-A-X-I box
    parts.append(part(box(0.60, 0.06, 0.28), (-0.12, 1.51, 0), PAL["ink"]))
    parts.append(part(box(0.54, 0.14, 0.24), (-0.12, 1.60, 0), PAL["amber"]))
    parts.append(part(box(0.46, 0.07, 0.02), (-0.12, 1.60, 0.125), PAL["ink"]))    # letters band
    return _scene(parts)


def _scene(parts) -> trimesh.Scene:
    sc = trimesh.Scene()
    for i, m in enumerate(parts):
        sc.add_geometry(m, node_name=f"p{i}", geom_name=f"p{i}")
    return sc


BUILDERS = {"car_sedan": make_sedan, "car_taxi": make_taxi}


def main() -> None:
    ap = argparse.ArgumentParser(description="Audit car rebuild (CPU, deterministic).")
    ap.add_argument("--out-dir", default="web-three/public/models")
    args = ap.parse_args()
    for name, builder in BUILDERS.items():
        out = os.path.join(args.out_dir, f"{name}.glb")
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        builder().export(out)
        check = trimesh.load(out)
        ext = check.bounds[1] - check.bounds[0]
        tris = sum(int(len(f)) for f in check.faces) if hasattr(check, "faces") else 0
        print(f"[glb] {name:10s} -> {out} ({os.path.getsize(out)/1024:.0f} KB, "
              f"extents {ext[0]:.2f} x {ext[1]:.2f} x {ext[2]:.2f})")


if __name__ == "__main__":
    main()
