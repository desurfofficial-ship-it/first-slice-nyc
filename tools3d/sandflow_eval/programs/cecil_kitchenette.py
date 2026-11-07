"""Cecil-room kitchenette — Alder Heights interiors.

Wears the `Cecil_Kitchenette` slot (CECIL-ROOM west wall, front east into
the room). 600 deep × 2000 long × 840 tall + faucet/towel rail, authored in
its final world orientation (depth along world X, length along world Z,
front EAST) so the unyawed placeholder passes the footprint guard 1:1. A
working-class studio kitchenette: teal base, cream top, small sink,
cabinet fronts, a towel rail. The shipped black hotplate keeps its spot on
top. Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +X (world east). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def cecil_kitchenette():
    s3d.empty_scene()
    parts = []
    base = s3d.box("base_cabinet", 600, 2000, 780)
    s3d.material(base, "painted_metal", color=GAME["teal"], roughness=0.5)
    top = s3d.at(s3d.box("counter_top", 640, 2040, 60), x=-10, z=780)
    s3d.material(top, "marble", color=GAME["cream"], roughness=0.3)
    parts.extend([base, top])
    basin = s3d.at(s3d.box("sink_basin", 380, 460, 130), x=60, y=500, z=790)
    s3d.material(basin, "brushed_steel", roughness=0.35)
    basin_dark = s3d.at(s3d.box("sink_dark", 300, 380, 90), x=60, y=500, z=810)
    s3d.material(basin_dark, "plastic", color=GAME["window_dim"], roughness=0.4)
    tap_v = s3d.at(s3d.cylinder("faucet_column", 26, 190), x=60, y=660, z=840)
    tap_h = s3d.at(s3d.cylinder("faucet_bar", 20, 190), rx=90, x=60, y=580, z=980)
    for t in (tap_v, tap_h):
        s3d.material(t, "brushed_steel", roughness=0.3)
    parts.extend([basin, basin_dark, tap_v, tap_h])
    for i in range(2):
        door = s3d.at(s3d.box(f"door_inset_{i}", 22, 800, 560), x=295, y=-400 + i * 850, z=110)
        s3d.material(door, "painted_metal", color="#23877b", roughness=0.45)
        knob = s3d.at(s3d.cylinder(f"door_knob_{i}", 20, 24), rx=90, x=315, y=-720 + i * 850, z=390)
        s3d.material(knob, "brass", roughness=0.25)
        parts.extend([door, knob])
    rail = s3d.at(s3d.cylinder("towel_rail", 18, 700), rx=90, x=210, y=350, z=990)
    s3d.material(rail, "brushed_steel", roughness=0.3)
    towel = s3d.at(s3d.box("hanging_towel", 40, 260, 300), x=230, y=280, z=690)
    s3d.material(towel, "fabric", color=GAME["cream"], roughness=0.85)
    parts.extend([rail, towel])
    return s3d.assembly("cecil_kitchenette", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(cecil_kitchenette(), sys.argv[1] if len(sys.argv) > 1 else "cecil_kitchenette.glb")
