"""Bodega gondola shelving unit — Alder Heights asset 12/12 (interior).

Reference: the standard NYC bodega grocery gondola: 1.2 m bay, ~0.55 m deep,
~1.77 m tall, cream/beige steel with gold price rails, loaded with generic
stock (cans, boxes, bottles) in FIRST SLICE palette accents. Static prop —
the goods are part of the program so the unit ships "dressed" like a real
bodega wall bay.

Front looks -Y. Millimetres.
"""
import sand3d as s3d
from _nyc import NYC, GAME

W, D = 1220, 550
LEVELS = (150, 530, 910, 1290, 1660)
GOODS = [
    ("plastic", GAME["gold"]), ("plastic", GAME["coral"]), ("plastic", GAME["teal"]),
    ("plastic", GAME["cream"]), ("plastic", GAME["plum"]), ("glossy_plastic", GAME["taxi"]),
]


def bodega_shelf():
    s3d.empty_scene()
    base = s3d.at(base_deck(), z=0)
    back = s3d.at(back_panel(), z=130)
    uprights = s3d.at(upright(), on=s3d.grid(2, 1, W - 80, 0), z=130)
    shelves = s3d.group("shelves",
                        *[s3d.at(shelf_board(f"shelf_{li}"), z=z + 12) for li, z in enumerate(LEVELS[1:])])
    rails = s3d.group("rails",
                      *[s3d.at(price_rail(f"price_rail_{li}"), y=-276, z=z + 8) for li, z in enumerate(LEVELS)])
    goods = stock()
    return s3d.assembly("bodega_shelf", base, back, uprights, shelves, rails, goods)


def base_deck(w=W, d=D, h=130):
    deck = s3d.box("base_deck", w, d, h)
    kick = s3d.at(s3d.box("kick_plinth", w - 60, d - 40, 90), y=10, z=0)
    s3d.material(deck, "painted_metal", color=NYC["dsny_green"], roughness=0.6)
    s3d.material(kick, "painted_metal", color=GAME["ink"], roughness=0.6)
    return s3d.group("base_deck", deck, kick)


def back_panel(w=W, t=20, h=1640):
    panel = s3d.box("back_panel", w, t, h)
    panel = s3d.at(panel, y=D / 2 - t / 2)
    s3d.material(panel, "painted_metal", color=NYC["dsny_green"], roughness=0.6)
    return panel


def upright(w=45, d=45, h=1640):
    post = s3d.box("upright", w, d, h)
    post = s3d.at(post, y=D / 2 - 60)
    s3d.material(post, "painted_metal", color=NYC["dsny_green"], roughness=0.6)
    return post


def shelf_board(name, w=W - 20, d=D - 30, t=25):
    board = s3d.box(name, w, d, t)
    s3d.material(board, "painted_metal", color="#e8e4dc", roughness=0.55)
    return board


def price_rail(name, w=W, t=14, h=55):
    rail = s3d.box(name, w, t, h)
    s3d.material(rail, "painted_metal", color=GAME["gold"], roughness=0.4)
    return rail


def stock():
    """Dressed goods: two rows per level — cans one way, boxes/bottles the other."""
    parts = []
    for li, z in enumerate(LEVELS):
        kind = GOODS[li % len(GOODS)]
        kind2 = GOODS[(li + 2) % len(GOODS)]
        cans = s3d.at(s3d.cylinder(f"can_row_{li}", 72, 118),
                      on=s3d.grid(5, 1, 200, 0), y=-110, z=z + 12)
        s3d.material(cans, kind[0], color=kind[1], roughness=0.45)
        parts.append(cans)
        if li % 2 == 0:
            boxes = s3d.at(s3d.box(f"box_row_{li}", 150, 110, 190),
                           on=s3d.grid(3, 1, 230, 0), y=90, z=z + 12)
            s3d.material(boxes, kind2[0], color=kind2[1], roughness=0.6)
            parts.append(boxes)
        else:
            bottle = s3d.cylinder(f"bottle_body_{li}", 64, 130)
            neck = s3d.at(s3d.cylinder(f"bottle_neck_{li}", 26, 80), z=124)
            s3d.join(bottle, neck)
            bottles = s3d.at(bottle, on=s3d.grid(4, 1, 250, 0), y=90, z=z + 12)
            s3d.material(bottles, "glossy_plastic", color=kind2[1], roughness=0.3)
            parts.append(bottles)
    return s3d.group("stock", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(bodega_shelf(), sys.argv[1] if len(sys.argv) > 1 else "bodega_shelf.glb")
