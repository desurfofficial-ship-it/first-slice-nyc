"""Counter drip coffee station — Alder Heights interiors (shared).

One file, two counters: the diner's register end (front north, yaw 0) and
Rosa's bodega counter (front east, yaw +π/2). 450 wide × 350 deep × 420
tall + cup stack: ink brewer with a gold trim band, two carafes on warm
plates, a cream cup stack, drip tray.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y. Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

BREW = "#4a3020"


def coffee_machine():
    s3d.empty_scene()
    parts = []
    body = s3d.box("brewer_body", 450, 350, 420)
    s3d.material(body, "plastic", color=GAME["ink"], roughness=0.45)
    band = s3d.at(s3d.box("trim_band", 456, 356, 60), z=300)
    s3d.material(band, "glossy_plastic", color=GAME["gold"], roughness=0.35)
    head = s3d.at(s3d.box("brew_head", 300, 200, 90), y=-70, z=420)
    s3d.material(head, "plastic", color=GAME["window_dim"], roughness=0.4)
    tray = s3d.at(s3d.box("drip_tray", 380, 240, 40), y=-60, z=20)
    s3d.material(tray, "brushed_steel", roughness=0.4)
    parts.extend([body, band, head, tray])
    for i, px in enumerate((-120, 40)):
        carafe = s3d.at(s3d.cylinder(f"carafe_{i}", 95, 200), x=px, y=-60, z=60)
        s3d.material(carafe, "glossy_plastic", color=GAME["window_dim"], roughness=0.3)
        coffee = s3d.at(s3d.cylinder(f"coffee_{i}", 78, 110), x=px, y=-60, z=70)
        s3d.material(coffee, "plastic", color=BREW, roughness=0.55)
        handle = s3d.at(s3d.box(f"carafe_handle_{i}", 30, 40, 140), x=px + 108, y=-60, z=90)
        s3d.material(handle, "plastic", color=GAME["ink"], roughness=0.45)
        parts.extend([carafe, coffee, handle])
    for k in range(4):
        cup = s3d.at(s3d.cylinder(f"cup_{k}", 38, 70), x=-140 + (k % 2) * 90,
                     y=120 + (k // 2) * 90, z=420)
        s3d.material(cup, "ceramic", color=GAME["cream"], roughness=0.3)
        parts.append(cup)
    switch = s3d.at(s3d.box("rocker_switch", 60, 30, 40), x=170, y=-160, z=330)
    s3d.material(switch, "glossy_plastic", color=GAME["coral"], roughness=0.35)
    parts.append(switch)
    return s3d.assembly("coffee_machine", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(coffee_machine(), sys.argv[1] if len(sys.argv) > 1 else "coffee_machine.glb")
