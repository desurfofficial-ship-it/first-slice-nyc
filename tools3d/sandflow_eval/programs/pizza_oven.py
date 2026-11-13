"""Corner Slice deck oven — Alder Heights interiors.

Wears the `Pizza_Oven` slot (PIZZA-INT NE corner, mouth south). 1800 wide ×
2200 deep × 1800 tall body with a hood above, authored in its final world
orientation (width along world X, depth along world Z, front SOUTH) so the
unyawed placeholder passes the footprint guard 1:1. Two steel decks with
dark mouths and stone lintels, a brick base band, gold dials.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def pizza_oven():
    s3d.empty_scene()
    parts = []
    body = s3d.box("oven_body", 1800, 2200, 1800)
    s3d.material(body, "painted_metal", color="#9a938c", roughness=0.5)
    brick = s3d.at(s3d.box("brick_base", 1800, 2200, 260), z=0)
    s3d.material(brick, "concrete", color=GAME["brick"], roughness=0.75)
    parts.extend([body, brick])
    for i, lx in enumerate((-430, 430)):
        mouth = s3d.at(s3d.box(f"deck_mouth_{i}", 620, 60, 420), x=lx, y=-1080, z=760)
        s3d.material(mouth, "plastic", color=GAME["window_dim"], roughness=0.3)
        lintel = s3d.at(s3d.box(f"deck_lintel_{i}", 700, 90, 110), x=lx, y=-1075, z=1180)
        s3d.material(lintel, "marble", color=GAME["stone"], roughness=0.4)
        ledge = s3d.at(s3d.box(f"deck_ledge_{i}", 700, 180, 60), x=lx, y=-1010, z=560)
        s3d.material(ledge, "brushed_steel", roughness=0.35)
        parts.extend([mouth, lintel, ledge])
    for i, lx in enumerate((-560, -280, 280, 560)):
        dial = s3d.at(s3d.cylinder(f"dial_{i}", 60, 40), rx=90, x=lx, y=-1110, z=1400)
        s3d.material(dial, "glossy_plastic", color=GAME["gold"], roughness=0.3)
        parts.append(dial)
    hood = s3d.at(s3d.box("hood", 1840, 900, 180), y=650, z=1800)
    s3d.material(hood, "brushed_steel", roughness=0.35)
    parts.extend([hood])
    return s3d.assembly("pizza_oven", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(pizza_oven(), sys.argv[1] if len(sys.argv) > 1 else "pizza_oven.glb")
