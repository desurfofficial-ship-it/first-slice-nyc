"""Bodega produce crates — Alder Heights interiors.

Stands on ROSA'S floor by the front window west of the door gap (new
fixture): two stacked wood crates of oranges and limes — the display every
bodega sets out on the sidewalk side. 600 × 400 × 495 total.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y (world north, into the store). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

WOOD = "#8e6f66"
WOOD_D = "#7a5c52"
ORANGE = "#d97a2b"
LIME = "#7aa23c"


def produce_crate():
    s3d.empty_scene()
    parts = []
    for i, zb in enumerate((0, 200)):
        wood = WOOD if i == 0 else WOOD_D
        wall_t = s3d.at(s3d.box(f"crate_wall_t_{i}", 600, 30, 90), y=-185, z=zb + 25)
        wall_b = s3d.at(s3d.box(f"crate_wall_b_{i}", 600, 30, 90), y=185, z=zb + 25)
        wall_l = s3d.at(s3d.box(f"crate_wall_l_{i}", 30, 400, 90), x=-285, y=0, z=zb + 25)
        wall_r = s3d.at(s3d.box(f"crate_wall_r_{i}", 30, 400, 90), x=285, y=0, z=zb + 25)
        floor = s3d.at(s3d.box(f"crate_floor_{i}", 570, 370, 25), z=zb)
        for w in (wall_t, wall_b, wall_l, wall_r):
            s3d.material(w, "plastic", color=wood, roughness=0.6)
        s3d.material(floor, "plastic", color=WOOD_D, roughness=0.65)
        parts.extend([wall_t, wall_b, wall_l, wall_r, floor])
        color = ORANGE if i == 0 else LIME
        for k in range(9):
            px = -180 + (k % 3) * 180
            py = -110 + (k // 3) * 110
            fruit = s3d.at(s3d.cylinder(f"fruit_{i}_{k}", 62, 75), x=px, y=py, z=zb + 25)
            s3d.material(fruit, "glossy_plastic", color=color, roughness=0.4)
            parts.append(fruit)
    return s3d.assembly("produce_crate", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(produce_crate(), sys.argv[1] if len(sys.argv) > 1 else "produce_crate.glb")
