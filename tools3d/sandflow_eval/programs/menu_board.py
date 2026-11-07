"""Corner Slice menu board — Alder Heights interiors (wall decor).

Fills the bare wall above the slice counter. 2200 wide × 60 thick × 1100
tall, front NORTH into the room (glTF +Z), no collider — wall decor, the
counter owns the floor. Ink board with cream menu rows (thin boxes, not
texture), gold header, coral price dots.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y (world north). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

ITEMS = (GAME["cream"], GAME["stone"], GAME["cream"], GAME["stone"], GAME["cream"])


def menu_board():
    s3d.empty_scene()
    parts = []
    board = s3d.box("board", 2200, 60, 1100)
    s3d.material(board, "painted_metal", color=GAME["ink"], roughness=0.5)
    header = s3d.at(s3d.box("header", 2000, 20, 160), z=820)
    s3d.material(header, "glossy_plastic", color=GAME["gold"], roughness=0.35)
    parts.extend([board, header])
    for i, color in enumerate(ITEMS):
        row_z = 620 - i * 120
        name = s3d.at(s3d.box(f"item_name_{i}", 620, 18, 52), x=-520, y=-32, z=row_z)
        s3d.material(name, "plastic", color=color, roughness=0.6)
        price = s3d.at(s3d.box(f"item_price_{i}", 150, 18, 52), x=830, y=-32, z=row_z)
        s3d.material(price, "glossy_plastic", color=GAME["coral"], roughness=0.35)
        parts.extend([name, price])
    frame_t = s3d.at(s3d.box("frame_top", 2240, 70, 40), z=1060)
    frame_b = s3d.at(s3d.box("frame_bottom", 2240, 70, 40), z=0)
    for f in (frame_t, frame_b):
        s3d.material(f, "brushed_steel", roughness=0.35)
    parts.extend([frame_t, frame_b])
    return s3d.assembly("menu_board", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(menu_board(), sys.argv[1] if len(sys.argv) > 1 else "menu_board.glb")
