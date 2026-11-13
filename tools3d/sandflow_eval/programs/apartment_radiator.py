"""Cecil-room steam radiator — Alder Heights interiors (new fixture).

The heat every New York rental is ruled by: a cast-iron fin radiator under
the street window (CECIL-ROOM north wall, front south into the room).
900 wide × 180 deep × 560 tall, authored in its final world orientation
(width along world X, depth along world Z, front SOUTH). Nine fins, pipe
stubs, a brass valve. Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

IRON = "#3a3a40"


def apartment_radiator():
    s3d.empty_scene()
    parts = []
    for i in range(9):
        px = -380 + i * 95
        fin = s3d.at(s3d.box(f"fin_{i}", 55, 150, 520), x=px, z=80)
        s3d.fillet(fin, 12, edges="side")
        s3d.material(fin, "painted_metal", color=IRON, roughness=0.55)
        neck = s3d.at(s3d.box(f"fin_neck_{i}", 40, 120, 40), x=px, z=520)
        s3d.material(neck, "painted_metal", color=IRON, roughness=0.55)
        parts.extend([fin, neck])
    rail_top = s3d.at(s3d.box("rail_top", 880, 140, 45), z=0)
    rail_bot = s3d.at(s3d.box("rail_bottom", 880, 140, 45), z=515)
    for r in (rail_top, rail_bot):
        s3d.material(r, "painted_metal", color=IRON, roughness=0.55)
    pipe = s3d.at(s3d.cylinder("supply_pipe", 26, 300), x=-430, y=0, z=100)
    s3d.material(pipe, "brushed_steel", roughness=0.35)
    valve = s3d.at(s3d.cylinder("valve_body", 45, 60), x=-430, y=40, z=260)
    s3d.material(valve, "brass", roughness=0.25)
    bleed = s3d.at(s3d.cylinder("bleed_valve", 22, 40), x=420, y=-40, z=430)
    s3d.material(bleed, "brass", roughness=0.25)
    parts.extend([rail_top, rail_bot, pipe, valve, bleed])
    return s3d.assembly("apartment_radiator", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(apartment_radiator(), sys.argv[1] if len(sys.argv) > 1 else "apartment_radiator.glb")
