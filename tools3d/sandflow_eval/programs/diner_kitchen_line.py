"""Alder Heights Diner cook line — Alder Heights interiors.

Wears the `Diner_Kitchen` slot (DINER-INT east wall behind the counter bar).
1600 deep × 8000 long × 910 tall + splash/heat lamps, authored in its final
world orientation (depth along world X, length along world Z, front WEST
toward the stools) so the unyawed placeholder passes the footprint guard
1:1. A real line: griddle, two fryers, prep wells, plate stack, heat-lamp
bar on stems. Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -X (world west). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def diner_kitchen_line():
    s3d.empty_scene()
    parts = []
    base = s3d.box("line_base", 1600, 8000, 850)
    s3d.material(base, "painted_metal", color="#9a938c", roughness=0.5)
    top = s3d.at(s3d.box("line_top", 1660, 8060, 60), x=-10, z=850)
    s3d.material(top, "brushed_steel", roughness=0.35)
    splash = s3d.at(s3d.box("splash_back", 60, 8000, 500), x=740, z=910)
    s3d.material(splash, "brushed_steel", roughness=0.4)
    parts.extend([base, top, splash])
    griddle = s3d.at(s3d.box("griddle_slab", 1200, 2200, 70), x=-190, y=-1300, z=915)
    s3d.material(griddle, "plastic", color=GAME["manhole"], roughness=0.55)
    patty_a = s3d.at(s3d.cylinder("patty_a", 110, 45), x=-320, y=-1750, z=930)
    patty_b = s3d.at(s3d.cylinder("patty_b", 110, 45), x=-90, y=-950, z=930)
    for b in (patty_a, patty_b):
        s3d.material(b, "plastic", color="#6b4433", roughness=0.6)
    parts.extend([griddle, patty_a, patty_b])
    for i, y in enumerate((-2900, -3700)):
        fryer = s3d.at(s3d.box(f"fryer_bay_{i}", 1100, 700, 220), x=-180, y=y, z=915)
        s3d.material(fryer, "plastic", color=GAME["window_dim"], roughness=0.45)
        basket = s3d.at(s3d.box(f"fry_basket_{i}", 500, 400, 180), x=-260, y=y - 60, z=955)
        s3d.material(basket, "brushed_steel", roughness=0.4)
        parts.extend([fryer, basket])
    for i, y in enumerate((-5200, -4600)):
        well = s3d.at(s3d.box(f"prep_well_{i}", 700, 500, 120), x=-300, y=y, z=915)
        s3d.material(well, "brushed_steel", roughness=0.35)
        fill = s3d.at(s3d.box(f"well_fill_{i}", 600, 400, 90), x=-300, y=y, z=925)
        s3d.material(fill, "plastic", color=GAME["cream"] if i else GAME["stone"], roughness=0.6)
        parts.extend([well, fill])
    for k in range(4):
        plate = s3d.at(s3d.cylinder(f"plate_{k}", 130, 30), x=-350, y=900, z=915 + k * 30)
        s3d.material(plate, "ceramic", color=GAME["cream"], roughness=0.3)
        parts.append(plate)
    lamp_bar = s3d.at(s3d.box("heat_lamp_bar", 160, 5200, 90), x=600, y=-1200, z=1310)
    s3d.material(lamp_bar, "glossy_plastic", color=GAME["amber"], roughness=0.35)
    parts.append(lamp_bar)
    for y in (-2600, -1200, 200):
        stem = s3d.at(s3d.cylinder(f"lamp_stem_{y}", 40, 490), x=600, y=y, z=910)
        s3d.material(stem, "brushed_steel", roughness=0.35)
        parts.append(stem)
    return s3d.assembly("diner_kitchen_line", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(diner_kitchen_line(), sys.argv[1] if len(sys.argv) > 1 else "diner_kitchen_line.glb")
