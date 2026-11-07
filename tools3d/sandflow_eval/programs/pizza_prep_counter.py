"""Corner Slice prep counter — Alder Heights interiors (new fixture).

Fills the bare north wall between the door side and the deck oven: where
Eddie and Kev actually work. 2000 wide × 700 deep × 970 tall, authored in
its final world orientation (width along world X, depth along world Z,
front SOUTH) so the unyawed placeholder passes the footprint guard 1:1.
Stainless top, cream base, sauce trays, a flour bin, pizza boxes.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def pizza_prep_counter():
    s3d.empty_scene()
    parts = []
    base = s3d.box("base_cabinet", 2000, 700, 820)
    s3d.material(base, "painted_metal", color=GAME["cream"], roughness=0.5)
    top = s3d.at(s3d.box("counter_top", 2040, 740, 60), z=820)
    s3d.material(top, "brushed_steel", roughness=0.35)
    rail = s3d.at(s3d.box("rail_back", 2000, 60, 160), y=320, z=880)
    s3d.material(rail, "brushed_steel", roughness=0.35)
    parts.extend([base, top, rail])
    for i, lx in enumerate((-700, -420, -140)):
        tray = s3d.at(s3d.box(f"sauce_tray_{i}", 240, 240, 110), x=lx, z=880)
        s3d.material(tray, "brushed_steel", roughness=0.35)
        sauce = s3d.at(s3d.cylinder(f"sauce_{i}", 95, 90), x=lx, z=895)
        s3d.material(sauce, "plastic", color=GAME["brick"] if i != 1 else GAME["cream"], roughness=0.45)
        parts.extend([tray, sauce])
    bin_box = s3d.at(s3d.box("flour_bin", 300, 400, 220), x=430, z=880)
    s3d.material(bin_box, "plastic", color=GAME["stone"], roughness=0.6)
    parts.append(bin_box)
    for i in range(3):
        box = s3d.at(s3d.box(f"pizza_box_{i}", 420, 420, 55), x=720, y=40 - i * 6, z=880 + i * 52)
        s3d.material(box, "fabric", color=GAME["cream"] if i % 2 else GAME["stone"], roughness=0.75)
        parts.append(box)
    return s3d.assembly("pizza_prep_counter", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(pizza_prep_counter(), sys.argv[1] if len(sys.argv) > 1 else "pizza_prep_counter.glb")
