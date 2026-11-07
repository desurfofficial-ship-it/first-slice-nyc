"""Community hall kitchenette — Alder Heights interiors.

Wears the `Hall_Kitchenette` slot (HALL-INT NE corner, front south). 2400
wide × 1600 deep × 840 tall + faucet/kettle, authored in its final world
orientation (width along world X, depth along world Z, front SOUTH) so the
unyawed placeholder passes the footprint guard 1:1. Teal base with a cream
top: sink basin, faucet, the urn kettle, cup rows — the block's coffee
corner. Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def hall_kitchenette():
    s3d.empty_scene()
    parts = []
    base = s3d.box("base_cabinet", 2400, 1600, 780)
    s3d.material(base, "painted_metal", color=GAME["teal"], roughness=0.5)
    top = s3d.at(s3d.box("counter_top", 2440, 1640, 60), z=780)
    s3d.material(top, "marble", color=GAME["cream"], roughness=0.3)
    parts.extend([base, top])
    basin = s3d.at(s3d.box("sink_basin", 520, 420, 140), x=-600, y=120, z=780)
    s3d.material(basin, "brushed_steel", roughness=0.35)
    basin_dark = s3d.at(s3d.box("sink_dark", 440, 340, 100), x=-600, y=120, z=800)
    s3d.material(basin_dark, "plastic", color=GAME["window_dim"], roughness=0.4)
    tap_v = s3d.at(s3d.cylinder("faucet_column", 30, 220), x=-600, y=290, z=840)
    tap_h = s3d.at(s3d.cylinder("faucet_bar", 24, 240), rx=90, x=-600, y=200, z=990)
    for t in (tap_v, tap_h):
        s3d.material(t, "brushed_steel", roughness=0.3)
    parts.extend([basin, basin_dark, tap_v, tap_h])
    kettle = s3d.at(s3d.cylinder("urn_kettle", 140, 260), x=500, y=100, z=840)
    s3d.material(kettle, "brushed_steel", roughness=0.35)
    kettle_lid = s3d.at(s3d.cylinder("kettle_lid", 100, 60), x=500, y=100, z=1100)
    s3d.material(kettle_lid, "plastic", color=GAME["ink"], roughness=0.4)
    handle = s3d.at(s3d.box("kettle_handle", 40, 24, 130), x=660, y=100, z=930)
    s3d.material(handle, "plastic", color=GAME["ink"], roughness=0.4)
    parts.extend([kettle, kettle_lid, handle])
    for k in range(6):
        cup = s3d.at(s3d.cylinder(f"cup_{k}", 42, 90), x=-1100 + (k % 3) * 130, y=420, z=840)
        s3d.material(cup, "ceramic", color=GAME["cream"] if k % 2 else GAME["coral"], roughness=0.3)
        parts.append(cup)
    for i in range(3):
        door = s3d.at(s3d.box(f"door_inset_{i}", 620, 24, 560), x=-800 + i * 800, y=-790, z=110)
        s3d.material(door, "painted_metal", color="#23877b", roughness=0.45)
        parts.append(door)
    return s3d.assembly("hall_kitchenette", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(hall_kitchenette(), sys.argv[1] if len(sys.argv) > 1 else "hall_kitchenette.glb")
