"""Marlow Bakery display case — Alder Heights interiors.

Wears the `Bakery_Case` slot ON the service counter (BAKERY-INT, front
south). 5400 long × 700 deep × 350 tall — exactly the shipped case slab's
height, so the procedural counter below and the bun row above keep their
authored positions. Cream base/top rails, dark "glass" front with cream
frames, pastry rows inside on a shelf.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

PASTRY = ("#d9a05b", "#c96a4b", "#e8c48a", "#b5713a")


def bakery_display_case():
    s3d.empty_scene()
    parts = []
    base = s3d.box("case_base", 5400, 700, 70)
    s3d.material(base, "painted_metal", color=GAME["cream"], roughness=0.5)
    top = s3d.at(s3d.box("case_top", 5400, 700, 60), z=290)
    s3d.material(top, "painted_metal", color=GAME["cream"], roughness=0.5)
    back = s3d.at(s3d.box("case_back", 5400, 60, 350), y=320, z=0)
    s3d.material(back, "painted_metal", color=GAME["cream"], roughness=0.5)
    parts.extend([base, top, back])
    for i in range(4):
        px = -2140 + i * 1430
        pane = s3d.at(s3d.box(f"glass_pane_{i}", 1360, 40, 230), y=-330, z=60)
        s3d.material(pane, "plastic", color=GAME["window_dim"], roughness=0.25)
        post = s3d.at(s3d.box(f"frame_post_{i}", 50, 50, 290), x=px + 680, y=-330, z=30)
        s3d.material(post, "painted_metal", color=GAME["cream"], roughness=0.4)
        parts.extend([pane, post])
    shelf = s3d.at(s3d.box("pastry_shelf", 5200, 560, 24), z=170)
    s3d.material(shelf, "brushed_steel", roughness=0.35)
    parts.append(shelf)
    for k in range(16):
        px = -2450 + (k % 8) * 660
        pz = 194 + (k // 8) * 90
        kind = "glossy_plastic" if k % 3 else "plastic"
        bun = s3d.at(s3d.cylinder(f"pastry_{k}", 62, 70), x=px, y=40, z=pz)
        s3d.material(bun, kind, color=PASTRY[k % len(PASTRY)], roughness=0.5)
        parts.append(bun)
    return s3d.assembly("bakery_display_case", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(bakery_display_case(), sys.argv[1] if len(sys.argv) > 1 else "bakery_display_case.glb")
