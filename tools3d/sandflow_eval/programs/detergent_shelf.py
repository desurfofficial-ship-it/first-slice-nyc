"""Laundromat detergent shelf — Alder Heights interiors.

Wears the `LShelf` slot (LAUNDRY-INT north wall, goods face south). 4000
long × 450 deep × 1800 tall steel utility shelving dressed with detergent
jugs and boxes. Authored in its final world orientation (length along world
X, depth along world Z, front south) so the unyawed placeholder passes the
footprint guard 1:1.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +Y (world south). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

LEVELS = (180, 560, 940, 1320)
GOODS = (GAME["teal"], GAME["coral"], GAME["gold"], GAME["plum"], GAME["taxi"], GAME["cream"])


def detergent_shelf():
    s3d.empty_scene()
    parts = []
    for lx in (-1950, 1950):
        for ly in (60, 390):
            post = s3d.at(s3d.box(f"upright_{lx}_{ly}", 45, 45, 1800), x=lx, y=ly, z=0)
            s3d.material(post, "painted_metal", color=GAME["bldg2"], roughness=0.5)
            parts.append(post)
    for li, z in enumerate(LEVELS):
        board = s3d.at(s3d.box(f"shelf_{li}", 3950, 430, 22), z=z)
        s3d.material(board, "painted_metal", color="#e8e4dc", roughness=0.55)
        parts.append(board)
        for k in range(7):
            kind = "plastic" if (li + k) % 2 else "glossy_plastic"
            bx = -1650 + k * 550
            if (li + k) % 3 == 0:
                item = s3d.at(s3d.box(f"jug_{li}_{k}", 150, 150, 280), x=bx, y=245, z=z + 22)
            else:
                item = s3d.at(s3d.box(f"box_{li}_{k}", 200, 130, 240), x=bx, y=245, z=z + 22)
            s3d.material(item, kind, color=GOODS[(li * 2 + k) % len(GOODS)], roughness=0.5)
            parts.append(item)
    rail = s3d.at(s3d.box("price_rail", 3950, 20, 55), y=205, z=1745)
    s3d.material(rail, "glossy_plastic", color=GAME["gold"], roughness=0.4)
    parts.append(rail)
    return s3d.assembly("detergent_shelf", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(detergent_shelf(), sys.argv[1] if len(sys.argv) > 1 else "detergent_shelf.glb")
