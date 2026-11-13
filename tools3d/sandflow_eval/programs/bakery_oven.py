"""Marlow Bakery deck oven — Alder Heights interiors.

Wears the `Bakery_Oven` slot (BAKERY-INT rear wall, mouths south). 4400
wide × 2400 deep × 1800 tall body + hood, authored in its final world
orientation (width along world X, depth along world Z, front SOUTH) so the
unyawed placeholder passes the footprint guard 1:1. Three stone-linteled
decks on a brick base, gold dials — a working bakery's heart.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def bakery_oven():
    s3d.empty_scene()
    parts = []
    body = s3d.box("oven_body", 4400, 2400, 1800)
    s3d.material(body, "painted_metal", color="#9a938c", roughness=0.5)
    brick = s3d.at(s3d.box("brick_base", 4400, 2400, 280), z=0)
    s3d.material(brick, "concrete", color=GAME["brick"], roughness=0.75)
    parts.append(body)
    parts.append(brick)
    for i, lx in enumerate((-1400, 0, 1400)):
        mouth = s3d.at(s3d.box(f"deck_mouth_{i}", 760, 60, 480), x=lx, y=-1170, z=760)
        s3d.material(mouth, "plastic", color=GAME["window_dim"], roughness=0.3)
        lintel = s3d.at(s3d.box(f"deck_lintel_{i}", 840, 90, 120), x=lx, y=-1165, z=1240)
        s3d.material(lintel, "marble", color=GAME["stone"], roughness=0.4)
        parts.append(mouth)
        parts.append(lintel)
    for i, lx in enumerate((-1900, -1200, 1200, 1900)):
        dial = s3d.at(s3d.cylinder(f"dial_{i}", 55, 40), rx=90, x=lx, y=-1200, z=1460)
        s3d.material(dial, "glossy_plastic", color=GAME["gold"], roughness=0.3)
        parts.append(dial)
    hood = s3d.at(s3d.box("hood", 4440, 1000, 200), y=700, z=1800)
    s3d.material(hood, "brushed_steel", roughness=0.35)
    parts.append(hood)
    return s3d.assembly("bakery_oven", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(bakery_oven(), sys.argv[1] if len(sys.argv) > 1 else "bakery_oven.glb")
