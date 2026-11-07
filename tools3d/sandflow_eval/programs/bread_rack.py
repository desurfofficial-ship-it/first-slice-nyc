"""Marlow Bakery bread rack — Alder Heights interiors.

Wears the two `Bakery_Rack_*` slots (BAKERY-INT rear wall, flanking the
oven). 700 wide × 1400 deep × 1790 tall, authored in its final world
orientation (width along world X, depth along world Z, front SOUTH) so the
unyawed placeholder passes the footprint guard 1:1. Steel frame, four trays
of baguettes and round loaves in warm crust colors.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

CRUST = ("#c98a4b", "#b5713a", "#d9a05b")


def bread_rack():
    s3d.empty_scene()
    parts = []
    for lx in (-300, 300):
        for ly in (-640, 640):
            post = s3d.at(s3d.box(f"post_{lx}_{ly}", 50, 50, 1800), x=lx, y=ly, z=0)
            s3d.material(post, "painted_metal", color=GAME["bldg2"], roughness=0.5)
            parts.append(post)
    for li, z in enumerate((350, 750, 1150, 1550)):
        tray = s3d.at(s3d.box(f"tray_{li}", 640, 1300, 30), z=z)
        s3d.material(tray, "brushed_steel", roughness=0.35)
        parts.append(tray)
        for k in range(3):
            baguette = s3d.at(s3d.cylinder(f"baguette_{li}_{k}", 52, 900), rx=90,
                             x=-180 + k * 180, y=90 - (k % 2) * 180, z=z + 85)
            s3d.material(baguette, "plastic", color=CRUST[(li + k) % len(CRUST)], roughness=0.55)
            parts.append(baguette)
        if li % 2 == 0:
            for k in range(2):
                loaf = s3d.at(s3d.cylinder(f"loaf_{li}_{k}", 110, 90), rx=90,
                             x=0 if k == 0 else 40, y=-380 + k * 100, z=z + 85)
                s3d.material(loaf, "plastic", color=CRUST[(li + 2) % len(CRUST)], roughness=0.55)
                parts.append(loaf)
    top = s3d.at(s3d.box("top_shelf", 680, 1340, 30), z=1760)
    s3d.material(top, "brushed_steel", roughness=0.35)
    parts.append(top)
    return s3d.assembly("bread_rack", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(bread_rack(), sys.argv[1] if len(sys.argv) > 1 else "bread_rack.glb")
