"""Corner Slice drink cooler — Alder Heights interiors.

Wears the `Pizza_Fridge` slot (PIZZA-INT east wall, doors west). 500 deep ×
3000 long × 1740 tall, authored in its final world orientation (depth along
world X, length along world Z, front WEST) so the unyawed placeholder
passes the footprint guard 1:1. Three cream-framed dark doors with steel
handles and brand stripes, three can shelves visible as stock strips.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -X (world west). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

STRIPES = (GAME["coral"], GAME["teal"], GAME["gold"])


def drink_cooler():
    s3d.empty_scene()
    parts = []
    body = s3d.box("cooler_body", 500, 3000, 1740)
    s3d.material(body, "painted_metal", color=GAME["ink"], roughness=0.45)
    parts.append(body)
    for i in range(3):
        y = -960 + i * 960
        frame = s3d.at(s3d.box(f"door_frame_{i}", 30, 900, 1300), x=-245, y=y, z=240)
        s3d.material(frame, "painted_metal", color=GAME["cream"], roughness=0.4)
        pane = s3d.at(s3d.box(f"door_pane_{i}", 24, 830, 1230), x=-258, y=y, z=275)
        s3d.material(pane, "plastic", color=GAME["window_dim"], roughness=0.25)
        handle = s3d.at(s3d.box(f"door_handle_{i}", 40, 34, 260), x=-285, y=y - 380, z=760)
        s3d.material(handle, "brushed_steel", roughness=0.3)
        stripe = s3d.at(s3d.box(f"brand_stripe_{i}", 20, 830, 120), x=-262, y=y, z=1610)
        s3d.material(stripe, "glossy_plastic", color=STRIPES[i % len(STRIPES)], roughness=0.3)
        parts.extend([frame, pane, handle, stripe])
        for row in range(3):
            shelf = s3d.at(s3d.box(f"shelf_{i}_{row}", 40, 820, 12), x=-230, y=y, z=350 + row * 330)
            s3d.material(shelf, "brushed_steel", roughness=0.35)
            parts.append(shelf)
            for k in range(6):
                can = s3d.at(s3d.cylinder(f"can_{i}_{row}_{k}", 48, 110),
                            x=-230, y=y - 330 + k * 130, z=362 + row * 330)
                s3d.material(can, "glossy_plastic", color=STRIPES[(i + row + k) % len(STRIPES)], roughness=0.3)
                parts.append(can)
    kick = s3d.at(s3d.box("kick_base", 480, 2980, 70), z=0)
    s3d.material(kick, "painted_metal", color=GAME["window_dim"], roughness=0.5)
    topper = s3d.at(s3d.box("top_sign", 40, 2960, 130), x=-235, z=1610)
    s3d.material(topper, "glossy_plastic", color=GAME["coral"], roughness=0.35)
    parts.extend([kick, topper])
    return s3d.assembly("drink_cooler", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(drink_cooler(), sys.argv[1] if len(sys.argv) > 1 else "drink_cooler.glb")
