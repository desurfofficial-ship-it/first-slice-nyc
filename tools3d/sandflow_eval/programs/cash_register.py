"""Counter cash register — Alder Heights interiors (shared).

One file, two counters: ROSA'S bodega (front east, yaw +π/2) and Fade King
barber (front west, yaw −π/2). 400 wide × 350 deep × 300 tall counter-top
register: ink body, cream keypad grid, gold enter key, paper roll, drawer
slot. Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y. Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def cash_register():
    s3d.empty_scene()
    body = s3d.box("register_body", 400, 350, 150)
    s3d.material(body, "plastic", color=GAME["ink"], roughness=0.45)
    slot = s3d.at(s3d.box("drawer_slot", 360, 20, 10), y=-165, z=140)
    s3d.material(slot, "plastic", color=GAME["manhole"], roughness=0.4)
    keybed = s3d.at(s3d.box("keypad", 300, 220, 24), y=-60, z=150)
    s3d.material(keybed, "plastic", color=GAME["cream"], roughness=0.5)
    keys = []
    for r in range(3):
        for c in range(4):
            key = s3d.at(s3d.box(f"key_{r}_{c}", 44, 34, 18),
                         x=-105 + c * 70, y=-120 + r * 60, z=174)
            s3d.material(key, "glossy_plastic",
                         color=GAME["gold"] if r == 2 and c == 3 else GAME["stone"], roughness=0.3)
            keys.append(key)
    display = s3d.at(s3d.box("display", 280, 60, 130), x=-40, y=90, z=150)
    s3d.material(display, "glossy_plastic", color=GAME["window_dim"], roughness=0.3)
    roll = s3d.at(s3d.cylinder("paper_roll", 45, 110), rx=90, x=100, y=90, z=210)
    s3d.material(roll, "fabric", color=GAME["cream"], roughness=0.8)
    return s3d.assembly("cash_register", body, slot, keybed, *keys, display, roll)


if __name__ == "__main__":
    import sys
    s3d.export(cash_register(), sys.argv[1] if len(sys.argv) > 1 else "cash_register.glb")
