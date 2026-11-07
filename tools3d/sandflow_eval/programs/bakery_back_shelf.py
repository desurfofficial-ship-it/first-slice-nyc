"""Marlow Bakery rear utility shelf — Alder Heights interiors (new fixture).

Fills the bare north wall behind the deck oven: the flour-and-supply wall a
working bakery needs. 7000 long × 500 deep × 2000 tall, authored in its
final world orientation (length along world X, depth along world Z, front
SOUTH). Steel shelving with flour sacks, dough trays, supply boxes.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

BOX_COLORS = (GAME["teal"], GAME["stone"], GAME["cream"], GAME["bldg2"], GAME["gold"])


def bakery_back_shelf():
    s3d.empty_scene()
    parts = []
    for lx in (-3350, -1120, 1120, 3350):
        post = s3d.at(s3d.box(f"upright_{lx}", 45, 45, 2000), x=lx, z=0)
        s3d.material(post, "painted_metal", color=GAME["bldg2"], roughness=0.5)
        parts.append(post)
    for li, z in enumerate((200, 680, 1160, 1640)):
        board = s3d.at(s3d.box(f"shelf_{li}", 6900, 470, 24), z=z)
        s3d.material(board, "painted_metal", color="#e8e4dc", roughness=0.55)
        parts.append(board)
        if li == 0:
            for k in range(4):
                sack = s3d.at(s3d.box(f"flour_sack_{k}", 480, 380, 300), x=-2700 + k * 900, y=20, z=z + 24)
                s3d.material(sack, "fabric", color=GAME["cream"] if k % 2 else GAME["stone"], roughness=0.85)
                parts.append(sack)
        elif li == 1:
            for k in range(5):
                tray = s3d.at(s3d.box(f"dough_tray_{k}", 520, 360, 130), x=-2400 + k * 1050, y=20, z=z + 24)
                s3d.material(tray, "plastic", color=GAME["stone"], roughness=0.6)
                parts.append(tray)
        else:
            for k in range(6):
                box = s3d.at(s3d.box(f"supply_box_{li}_{k}", 380, 300, 330),
                             x=-2850 + k * 1050, y=10, z=z + 24)
                s3d.material(box, "plastic", color=BOX_COLORS[(k + li) % len(BOX_COLORS)], roughness=0.55)
                parts.append(box)
    return s3d.assembly("bakery_back_shelf", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(bakery_back_shelf(), sys.argv[1] if len(sys.argv) > 1 else "bakery_back_shelf.glb")
