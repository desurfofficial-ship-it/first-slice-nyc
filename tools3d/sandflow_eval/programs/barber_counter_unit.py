"""Fade King counter run — Alder Heights interiors.

Wears the `Barber_Counters` slot (BARBER-INT east wall under the mirrors).
500 deep × 5000 long × 900 tall, authored in its final world orientation
(depth along world X, length along world Z, front WEST into the room) so
the unyawed placeholder passes the footprint guard 1:1. Teal cabinet run
with a cream top: five door insets, clippers, tonics, a towel stack.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -X (world west). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

TONICS = (GAME["gold"], GAME["teal"], GAME["coral"], GAME["plum"], GAME["cream"], GAME["taxi"])


def barber_counter_unit():
    s3d.empty_scene()
    parts = []
    base = s3d.box("base_cabinet", 500, 5000, 780)
    s3d.material(base, "painted_metal", color=GAME["teal"], roughness=0.5)
    top = s3d.at(s3d.box("counter_top", 540, 5060, 60), x=-10, z=780)
    s3d.material(top, "marble", color=GAME["cream"], roughness=0.3)
    parts.extend([base, top])
    for i in range(5):
        y = -2100 + i * 1050
        door = s3d.at(s3d.box(f"door_inset_{i}", 24, 900, 620), x=-251, y=y, z=80)
        s3d.material(door, "painted_metal", color="#23877b", roughness=0.45)
        knob = s3d.at(s3d.cylinder(f"door_knob_{i}", 22, 26), rx=90, x=-270, y=y - 330, z=390)
        s3d.material(knob, "brass", roughness=0.25)
        parts.extend([door, knob])
    for i in range(6):
        y = -2200 + i * 850
        bottle = s3d.at(s3d.cylinder(f"tonic_{i}", 42, 150), x=-160, y=y, z=840)
        s3d.material(bottle, "glossy_plastic", color=TONICS[i % len(TONICS)], roughness=0.3)
        parts.append(bottle)
    clipper = s3d.at(s3d.box("clipper", 70, 160, 90), x=-180, y=1300, z=840)
    s3d.material(clipper, "plastic", color=GAME["ink"], roughness=0.4)
    blade = s3d.at(s3d.box("clipper_blade", 60, 40, 40), x=-180, y=1190, z=860)
    s3d.material(blade, "brushed_steel", roughness=0.3)
    parts.extend([clipper, blade])
    for i in range(3):
        towel = s3d.at(s3d.box(f"towel_{i}", 220, 200, 55), x=-130, y=2000, z=840 + i * 52)
        s3d.material(towel, "fabric", color=GAME["cream"] if i % 2 else GAME["stone"], roughness=0.85)
        parts.append(towel)
    return s3d.assembly("barber_counter_unit", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(barber_counter_unit(), sys.argv[1] if len(sys.argv) > 1 else "barber_counter_unit.glb")
