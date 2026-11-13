"""Bodega counter microwave — Alder Heights interiors.

Sits on ROSA'S counter near the reach-in fridge (new fixture, front east
into the store). 360 deep × 450 wide × 340 tall counter-top microwave,
authored in its final world orientation (depth along world X, width along
world Y, front EAST) so the unyawed placeholder passes the footprint guard
1:1. Cream body, dark door window with a cream frame, gold keypad strip.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +X (world east). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def microwave_oven():
    s3d.empty_scene()
    parts = []
    body = s3d.box("microwave_body", 360, 450, 340)
    s3d.material(body, "plastic", color=GAME["cream"], roughness=0.5)
    door = s3d.at(s3d.box("door_frame", 30, 320, 260), x=172, y=-40, z=40)
    s3d.material(door, "plastic", color=GAME["cream"], roughness=0.5)
    window = s3d.at(s3d.box("door_window", 20, 240, 190), x=186, y=-40, z=75)
    s3d.material(window, "plastic", color=GAME["window_dim"], roughness=0.3)
    handle = s3d.at(s3d.box("door_handle", 30, 30, 200), x=190, y=140, z=70)
    s3d.material(handle, "brushed_steel", roughness=0.3)
    panel = s3d.at(s3d.box("keypad_strip", 24, 120, 220), x=176, y=185, z=60)
    s3d.material(panel, "glossy_plastic", color=GAME["gold"], roughness=0.35)
    parts.extend([body, door, window, handle, panel])
    for px in (-130, 130):
        for py in (-160, 160):
            foot = s3d.at(s3d.cylinder(f"foot_{px}_{py}", 20, 30), x=px, y=py, z=0)
            s3d.material(foot, "rubber", color=GAME["ink"], roughness=0.7)
            parts.append(foot)
    return s3d.assembly("microwave_oven", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(microwave_oven(), sys.argv[1] if len(sys.argv) > 1 else "microwave_oven.glb")
