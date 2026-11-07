"""Fade King barber chair — Alder Heights interiors.

Wears the two `Barber_Chair_*` slots (BARBER-INT, facing the mirror wall
east). Slot pattern: placeholder group yaw +π/2 (front glTF +Z → world +X
east). 700 × 700 × 1190: chrome star base, hydraulic column, plum
upholstery with cream piping, headrest, footrest. Real proportion — a
barber chair is a throne, not an office chair.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y (becomes world east). Millimetres.
"""
import math
import sand3d as s3d
from _nyc import GAME

UPH = "#6d4c7d"   # plum — the Fade King chair color
UPH_D = "#5a3f68"


def barber_chair():
    s3d.empty_scene()
    parts = []
    for a in range(5):
        ang = a * 72
        px, py = 190 * math.cos(math.radians(ang)), 190 * math.sin(math.radians(ang))
        leg = s3d.at(s3d.box(f"star_leg_{a}", 330, 60, 45), x=px, y=py, z=0, rz=ang)
        s3d.material(leg, "brushed_steel", roughness=0.3)
        caster = s3d.at(s3d.cylinder(f"caster_{a}", 40, 40), x=px * 1.25, y=py * 1.25, z=0)
        s3d.material(caster, "plastic", color=GAME["ink"], roughness=0.5)
        parts.extend([leg, caster])
    column = s3d.at(s3d.cylinder("hydraulic_column", 55, 380), z=40)
    s3d.material(column, "chrome", roughness=0.15)
    seat = s3d.at(s3d.box("seat", 560, 540, 130), z=420)
    s3d.material(seat, "leather", color=UPH, roughness=0.45)
    seat_front = s3d.at(s3d.box("seat_front_roll", 560, 90, 90), y=-250, z=470)
    s3d.material(seat_front, "leather", color=UPH_D, roughness=0.45)
    back = s3d.at(s3d.box("backrest", 540, 120, 480), y=210, z=550)
    s3d.material(back, "leather", color=UPH, roughness=0.45)
    head = s3d.at(s3d.box("headrest", 300, 100, 160), y=210, z=1030)
    s3d.material(head, "leather", color=UPH_D, roughness=0.45)
    piping = s3d.at(s3d.box("piping", 545, 125, 20), y=210, z=530)
    s3d.material(piping, "plastic", color=GAME["cream"], roughness=0.5)
    parts.extend([column, seat, seat_front, back, head, piping])
    for sy in (-230, 230):
        arm = s3d.at(s3d.box(f"armrest_{sy}", 80, 460, 70), x=0, y=sy * 0.62, z=560)
        s3d.material(arm, "leather", color=UPH_D, roughness=0.45)
        post = s3d.at(s3d.cylinder(f"arm_post_{sy}", 26, 120), x=0, y=sy * 0.85, z=430)
        s3d.material(post, "brushed_steel", roughness=0.3)
        parts.extend([arm, post])
    foot = s3d.at(s3d.box("footrest", 420, 160, 60), y=-330, z=140)
    s3d.material(foot, "leather", color=UPH_D, roughness=0.45)
    lever = s3d.at(s3d.cylinder("pump_lever", 22, 240), rx=60, x=300, y=60, z=300)
    s3d.material(lever, "chrome", roughness=0.15)
    parts.extend([foot, lever])
    return s3d.assembly("barber_chair", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(barber_chair(), sys.argv[1] if len(sys.argv) > 1 else "barber_chair.glb")
