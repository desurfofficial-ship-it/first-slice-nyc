"""Community hall utility shelf — Alder Heights interiors.

Wears the `Hall_Shelves` slot (HALL-INT north wall behind the workshop).
5000 long × 400 deep × 1800 tall, authored in its final world orientation
(length along world X, depth along world Z, front SOUTH) so the unyawed
placeholder passes the footprint guard 1:1. Steel shelving: paint cans,
copy-paper boxes, a tool tray — a hall that gets used.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

LIDS = (GAME["teal"], GAME["coral"], GAME["gold"], GAME["plum"], GAME["cream"], GAME["taxi"])


def hall_storage_shelf():
    s3d.empty_scene()
    parts = []
    for lx in (-2400, 0, 2400):
        post = s3d.at(s3d.box(f"upright_{lx}", 45, 45, 1800), x=lx, z=0)
        s3d.material(post, "painted_metal", color=GAME["bldg2"], roughness=0.5)
        parts.append(post)
    for li, z in enumerate((150, 620, 1090, 1560)):
        board = s3d.at(s3d.box(f"shelf_{li}", 4950, 420, 24), z=z)
        s3d.material(board, "painted_metal", color="#e8e4dc", roughness=0.55)
        parts.append(board)
        if li == 0:
            for k in range(6):
                can = s3d.at(s3d.cylinder(f"paint_can_{k}", 95, 240), x=-2100 + k * 850, y=20, z=z + 24)
                s3d.material(can, "brushed_steel", roughness=0.35)
                lid = s3d.at(s3d.cylinder(f"can_lid_{k}", 80, 30), x=-2100 + k * 850, y=20, z=z + 244)
                s3d.material(lid, "glossy_plastic", color=LIDS[k % len(LIDS)], roughness=0.4)
                parts.extend([can, lid])
        elif li == 1:
            for k in range(4):
                box = s3d.at(s3d.box(f"paper_box_{k}", 500, 360, 280), x=-1800 + k * 1150, y=10, z=z + 24)
                s3d.material(box, "fabric", color=GAME["cream"] if k % 2 else GAME["stone"], roughness=0.75)
                stripe = s3d.at(s3d.box(f"box_stripe_{k}", 500, 20, 80), x=-1800 + k * 1150, y=-170, z=z + 130)
                s3d.material(stripe, "glossy_plastic", color=LIDS[(k + 2) % len(LIDS)], roughness=0.4)
                parts.extend([box, stripe])
        else:
            tray = s3d.at(s3d.box("tool_tray", 900, 340, 120), x=1500, y=20, z=z + 24)
            s3d.material(tray, "plastic", color=GAME["ink"], roughness=0.5)
            hammer = s3d.at(s3d.box("tool_handle", 60, 260, 50), x=1300, y=20, z=z + 24)
            s3d.material(hammer, "plastic", color=GAME["bldg"], roughness=0.55)
            head = s3d.at(s3d.box("tool_head", 60, 90, 110), x=1300, y=110, z=z + 40)
            s3d.material(head, "brushed_steel", roughness=0.35)
            parts.extend([tray, hammer, head])
    return s3d.assembly("hall_storage_shelf", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(hall_storage_shelf(), sys.argv[1] if len(sys.argv) > 1 else "hall_storage_shelf.glb")
