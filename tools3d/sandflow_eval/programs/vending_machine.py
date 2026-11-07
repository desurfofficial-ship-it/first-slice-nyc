"""Soda vending machine — Alder Heights interiors (LAUNDRY-INT east wall).

Fills the bare wall south of the dryers. 700 deep × 1000 wide × 1800 tall,
authored in its final world orientation (depth along world X, width along
world Z, front WEST into the room) so the unyawed placeholder passes the
footprint guard 1:1. Dark cabinet, gold coin door, three drink columns
behind a dark display pane, teal delivery flap.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -X (world west). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

DRINKS = (GAME["coral"], GAME["taxi"], GAME["teal"], GAME["plum"], GAME["gold"], GAME["cream"])


def vending_machine():
    s3d.empty_scene()
    parts = []
    cab = s3d.box("cabinet", 700, 1000, 1800)
    s3d.material(cab, "painted_metal", color=GAME["ink"], roughness=0.45)
    window = s3d.at(s3d.box("display_window", 60, 860, 1150), x=-320, z=430)
    s3d.material(window, "plastic", color=GAME["window_dim"], roughness=0.25)
    parts.extend([cab, window])
    for col in range(3):
        y = -270 + col * 270
        shelf = s3d.at(s3d.box(f"shelf_{col}", 50, 250, 14), x=-300, y=y, z=340)
        s3d.material(shelf, "brushed_steel", roughness=0.35)
        parts.append(shelf)
        for row in range(5):
            can = s3d.at(s3d.cylinder(f"can_{col}_{row}", 52, 120),
                         x=-290, y=y, z=352 + row * 130)
            s3d.material(can, "glossy_plastic", color=DRINKS[(col * 2 + row) % len(DRINKS)], roughness=0.3)
            parts.append(can)
    flap = s3d.at(s3d.box("delivery_flap", 40, 560, 300), x=-330, y=-40, z=300)
    s3d.material(flap, "glossy_plastic", color=GAME["teal"], roughness=0.4)
    coin = s3d.at(s3d.box("coin_door", 40, 220, 420), x=-335, y=330, z=420)
    s3d.material(coin, "glossy_plastic", color=GAME["gold"], roughness=0.35)
    panel = s3d.at(s3d.box("keypad", 40, 180, 260), x=-335, y=-290, z=1050)
    s3d.material(panel, "plastic", color=GAME["cream"], roughness=0.5)
    strip = s3d.at(s3d.box("brand_strip", 30, 880, 110), x=-345, z=1690)
    s3d.material(strip, "glossy_plastic", color=GAME["coral"], roughness=0.35)
    kick = s3d.at(s3d.box("kick_base", 680, 980, 80), z=0)
    s3d.material(kick, "painted_metal", color=GAME["window_dim"], roughness=0.5)
    parts.extend([flap, coin, panel, strip, kick])
    return s3d.assembly("vending_machine", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(vending_machine(), sys.argv[1] if len(sys.argv) > 1 else "vending_machine.glb")
