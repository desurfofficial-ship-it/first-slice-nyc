"""Alder Heights Diner register counter — Alder Heights interiors.

Wears the `Diner_Register` slot (DINER-INT south end by the pie case, front
north toward the dining room). 1800 wide × 600 deep × 960 tall + register,
standard authoring. Cream base cabinet, the ink register with gold keys,
napkin dispenser, straw jar — the seat where you pay. The procedural pie
case and pies keep their authored spots.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y (world north). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def diner_register():
    s3d.empty_scene()
    parts = []
    base = s3d.box("base_cabinet", 1800, 600, 900)
    s3d.material(base, "painted_metal", color=GAME["cream"], roughness=0.5)
    top = s3d.at(s3d.box("counter_top", 1840, 640, 60), z=900)
    s3d.material(top, "marble", color=GAME["stone"], roughness=0.3)
    parts.extend([base, top])
    reg = s3d.at(s3d.box("register_body", 520, 460, 280), x=-450, y=-40, z=960)
    s3d.material(reg, "plastic", color=GAME["ink"], roughness=0.45)
    keys = []
    for r in range(2):
        for c in range(4):
            key = s3d.at(s3d.box(f"reg_key_{r}_{c}", 60, 50, 24),
                         x=-620 + c * 82, y=-160 + r * 60, z=1240)
            s3d.material(key, "glossy_plastic",
                         color=GAME["gold"] if (r == 1 and c == 3) else GAME["cream"], roughness=0.3)
            keys.append(key)
    parts.extend([reg, *keys])
    napkin = s3d.at(s3d.box("napkin_dispenser", 240, 180, 220), x=250, y=-60, z=960)
    s3d.material(napkin, "glossy_plastic", color=GAME["cream"], roughness=0.4)
    straws = s3d.at(s3d.cylinder("straw_jar", 90, 200), x=600, y=-60, z=960)
    s3d.material(straws, "glossy_plastic", color=GAME["teal"], roughness=0.35)
    parts.extend([napkin, straws])
    for i in range(4):
        stick = s3d.at(s3d.cylinder(f"straw_{i}", 14, 150), x=600 + (i % 2) * 30 - 15,
                       y=-60 + (i // 2) * 30 - 15, z=1000)
        s3d.material(stick, "plastic", color=GAME["coral"], roughness=0.4)
        parts.append(stick)
    kick = s3d.at(s3d.box("kick_base", 1760, 580, 80), z=0)
    s3d.material(kick, "painted_metal", color=GAME["window_dim"], roughness=0.5)
    parts.append(kick)
    return s3d.assembly("diner_register", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(diner_register(), sys.argv[1] if len(sys.argv) > 1 else "diner_register.glb")
