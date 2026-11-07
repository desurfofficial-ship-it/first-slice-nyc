"""Laundromat rolling linen bin — Alder Heights interiors.

Wears the two `LLinen_*` slots (LAUNDRY-INT back wall). 700 × 500 × 830:
steel frame, cream canvas bag, folded linens stacked on top, casters.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south, away from the wall). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def linen_bin():
    s3d.empty_scene()
    parts = []
    for px in (-300, 300):
        for py in (-190, 190):
            caster = s3d.at(s3d.cylinder(f"caster_{px}_{py}", 45, 50), x=px, y=py, z=0)
            s3d.material(caster, "plastic", color=GAME["ink"], roughness=0.5)
            post = s3d.at(s3d.cylinder(f"post_{px}_{py}", 18, 800), x=px, y=py, z=30)
            s3d.material(post, "brushed_steel", roughness=0.3)
            parts.extend([caster, post])
    bag = s3d.at(s3d.box("canvas_bag", 560, 340, 560), z=90)
    s3d.material(bag, "fabric", color=GAME["cream"], roughness=0.8)
    parts.append(bag)
    for i in range(3):
        piece = s3d.at(s3d.box(f"linen_{i}", 480 - i * 30, 280 - i * 20, 60),
                       y=10 + i * 12, z=620 + i * 60)
        s3d.material(piece, "fabric", color=GAME["stone"] if i % 2 else GAME["cream"], roughness=0.85)
        parts.append(piece)
    rim = s3d.at(s3d.box("rim", 640, 420, 30), z=780)
    s3d.material(rim, "brushed_steel", roughness=0.3)
    parts.append(rim)
    return s3d.assembly("linen_bin", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(linen_bin(), sys.argv[1] if len(sys.argv) > 1 else "linen_bin.glb")
