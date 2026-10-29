#!/usr/bin/env python3
"""
procedural_glb.py — parametric lowpoly .glb generator (CPU, no GPU, no cloud).

This is the works-everywhere half of the tools3d pipeline. TRELLIS
(generate_glb.py) makes organic meshes from images/prompts on a CUDA box;
this script makes the DETERMINISTIC cast: the block's people and cars,
exported as real .glb files the game loads at runtime (with built-in
geometry as fallback if a file is missing).

Geometry mirrors web-three's TS person/car builders number-for-number so the
GLB and the fallback are interchangeable. Y-up, feet at origin, facing +Z.

Usage:
    python tools3d/procedural_glb.py --out-dir web-three/public/models
    python tools3d/procedural_glb.py --kind person --variant rosa --out rosa.glb
"""

import argparse
import os
import sys

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual import TextureVisuals


def mat(hex_color: int) -> PBRMaterial:
    """Palette color -> GLTF PBR material (matte, Lambert-adjacent)."""
    r, g, b = ((hex_color >> 16) & 255) / 255, ((hex_color >> 8) & 255) / 255, (hex_color & 255) / 255
    return PBRMaterial(
        baseColorFactor=[r, g, b, 1.0], metallicFactor=0.0, roughnessFactor=1.0,
        doubleSided=False,
    )


def part(geo: trimesh.Trimesh, pos, color: int, rot_z=0.0, rot_x=0.0) -> trimesh.Trimesh:
    if rot_z:
        geo.apply_transform(trimesh.transformations.rotation_matrix(rot_z, [0, 0, 1]))
    if rot_x:
        geo.apply_transform(trimesh.transformations.rotation_matrix(rot_x, [1, 0, 0]))
    geo.apply_translation(pos)
    geo.visual = TextureVisuals(material=mat(color))
    return geo


def box(sx, sy, sz) -> trimesh.Trimesh:
    return trimesh.creation.box(extents=[sx, sy, sz])


def cyl(r, h, sections=12) -> trimesh.Trimesh:
    """Cylinder with axis along Z (wheel axle convention)."""
    return trimesh.creation.cylinder(radius=r, height=h, sections=sections)


# Doc 04 palette — keep in sync with web-three/src/core/palette.ts
PAL = dict(
    gold=0xF7B32B, brick=0xB23A48, teal=0x2A9D8F, amber=0xFFB85C, stone=0xE8E4DC,
    plum=0x6D4C7D, coral=0xFF6B6B, cream=0xFFF8F0, ink=0x3A3440, taxi=0xF2C230,
    windowDim=0x3B3346, manhole=0x2B2730,
)

# ---------------------------------------------------------------- people

PERSON_VARIANTS = {
    #            jacket, pants, skin,     hair,     style
    "rosa":        dict(jacket=PAL["coral"], pants=PAL["ink"], skin=0xE8B08E, hair=0x9A938C, style="bun"),
    "idris":       dict(jacket=PAL["plum"],  pants=PAL["ink"], skin=0x8A5A3B, hair=0x241F1C, style="cap"),
    "player":      dict(jacket=PAL["gold"],  pants=PAL["ink"], skin=0xD9A06B, hair=0x3A3440, style="flat"),
    "customer_a":  dict(jacket=PAL["teal"],  pants=0x54495E,   skin=0xC98D68, hair=0x4A3A30, style="flat"),
    "customer_b":  dict(jacket=0xC97BA8,     pants=PAL["ink"], skin=0xE8B08E, hair=0x2B2730, style="bun"),
    "kid":         dict(jacket=0x514659,     pants=0x473E50,   skin=0x514659, hair=0x453B4C, style="flat"),
}


def make_person(v: str) -> trimesh.Scene:
    """~1.72 m lowpoly walker: shoes, legs, torso, arms, hands, head, hair.
    Feet at y=0, faces +Z. Same numbers as the TS builder in World.ts."""
    p = PERSON_VARIANTS[v]
    parts = []
    for sx in (-0.11, 0.11):
        parts.append(part(box(0.16, 0.10, 0.28), (sx, 0.05, 0.03), PAL["ink"]))        # shoe
        parts.append(part(box(0.13, 0.62, 0.16), (sx, 0.41, 0.0), p["pants"]))         # leg
    parts.append(part(box(0.50, 0.62, 0.30), (0, 1.03, 0), p["jacket"]))               # torso
    for sx, rz in ((-0.325, 0.09), (0.325, -0.09)):
        parts.append(part(box(0.11, 0.52, 0.13), (sx, 1.06, 0), p["jacket"], rot_z=rz))  # arm
        parts.append(part(box(0.09, 0.09, 0.09), (sx * 1.06, 0.78, 0.01), p["skin"]))    # hand
    parts.append(part(box(0.30, 0.32, 0.28), (0, 1.50, 0.01), p["skin"]))              # head
    parts.append(part(box(0.32, 0.13, 0.30), (0, 1.70, -0.015), p["hair"]))            # hair top
    parts.append(part(box(0.32, 0.20, 0.07), (0, 1.58, -0.135), p["hair"]))            # hair back
    if p["style"] == "bun":
        bun = trimesh.creation.icosphere(radius=0.085, subdivisions=1)
        parts.append(part(bun, (0, 1.76, -0.14), p["hair"]))
    elif p["style"] == "cap":
        parts.append(part(box(0.30, 0.03, 0.16), (0, 1.635, 0.15), p["hair"]))         # brim
        parts.append(part(box(0.32, 0.10, 0.31), (0, 1.695, -0.01), p["hair"]))        # crown
    sc = trimesh.Scene()
    for i, m in enumerate(parts):
        sc.add_geometry(m, node_name=f"p{i}", geom_name=f"p{i}")
    return sc


# ---------------------------------------------------------------- cars

def make_car(kind: str) -> trimesh.Scene:
    """Lowpoly car, nose at +X, axle along Z. 'taxi' = yellow cab with a roof
    light; 'sedan' = parked street car."""
    body = PAL["taxi"] if kind == "taxi" else PAL["teal"]
    glass = PAL["windowDim"]
    parts = []
    parts.append(part(box(4.15, 0.52, 1.86), (0, 0.56, 0), body))            # chassis
    parts.append(part(box(2.05, 0.52, 1.70), (-0.10, 1.08, 0), glass))       # window band
    parts.append(part(box(2.25, 0.09, 1.76), (-0.10, 1.38, 0), body))        # roof
    for sx in (-1.32, 1.32):
        for sz in (-0.85, 0.85):
            parts.append(part(cyl(0.33, 0.22, 14), (sx, 0.33, sz), PAL["manhole"]))   # wheel
            parts.append(part(cyl(0.15, 0.24, 10), (sx, 0.33, sz), PAL["stone"]))     # hub
    for sx in (-2.13, 2.13):
        parts.append(part(box(0.12, 0.16, 1.88), (sx, 0.42, 0), PAL["stone"]))       # bumper
    for sz in (-0.55, 0.55):
        parts.append(part(box(0.07, 0.14, 0.28), (2.09, 0.62, sz), PAL["cream"]))    # headlights
        parts.append(part(box(0.07, 0.12, 0.24), (-2.09, 0.62, sz), PAL["coral"]))   # taillights
    if kind == "taxi":
        parts.append(part(box(0.52, 0.17, 0.24), (-0.10, 1.51, 0), PAL["amber"]))    # roof light
    sc = trimesh.Scene()
    for i, m in enumerate(parts):
        sc.add_geometry(m, node_name=f"c{i}", geom_name=f"c{i}")
    return sc


BUILDERS = {
    **{f"person_{v}": (lambda v=v: make_person(v)) for v in PERSON_VARIANTS},
    "car_taxi": lambda: make_car("taxi"),
    "car_sedan": lambda: make_car("sedan"),
}


def main() -> None:
    ap = argparse.ArgumentParser(description="Parametric lowpoly .glb generator (CPU).")
    ap.add_argument("--kind", choices=sorted(BUILDERS), help="single model to build")
    ap.add_argument("--out", help="output .glb for --kind")
    ap.add_argument("--out-dir", help="build every model into this directory")
    args = ap.parse_args()

    if args.kind:
        if not args.out:
            ap.error("--out is required with --kind")
        jobs = {args.kind: args.out}
    elif args.out_dir:
        jobs = {k: os.path.join(args.out_dir, f"{k.replace('person_', '')}.glb") for k in BUILDERS}
    else:
        ap.error("use --kind/--out or --out-dir")

    for name, out in jobs.items():
        scene = BUILDERS[name]()
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        scene.export(out)
        check = trimesh.load(out)
        ext = check.bounds[1] - check.bounds[0]
        print(f"[glb] {name:14s} -> {out}  ({os.path.getsize(out)/1024:.0f} KB, extents "
              f"{ext[0]:.2f} x {ext[1]:.2f} x {ext[2]:.2f})")


if __name__ == "__main__":
    main()
