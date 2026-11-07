"""Sidewalk newspaper distribution box — Alder Heights asset 6/12 (street infrastructure).

Reference: the stainless two-window sidewalk newsrack: ~560 × 580 × 1200 mm,
big front display window with the paper stack visible behind glass, coin
mechanism on the front right, side lift handle, overhanging lid with the
masthead plaque.

Front looks -Y. Millimetres.
"""
import sand3d as s3d
from _nyc import NYC, GAME


def newsrack():
    s3d.empty_scene()
    body = s3d.at(cabinet(), z=40)
    lid_p = s3d.at(lid(), z=1200)
    plaque = s3d.at(masthead(), y=-296, z=1060)
    glass = s3d.at(window_glass(), y=-283, z=400)
    papers = s3d.at(paper_stack(), z=70)
    coin = s3d.at(coin_mech(), x=150, y=-300, z=470)
    handle = s3d.at(side_handle(), x=296, z=0)
    return s3d.assembly("newsrack", body, lid_p, plaque, glass, papers, coin, handle)


def cabinet(w=560, d=580, h=1200, wall=12):
    box = s3d.box("cabinet", w, d, h)
    s3d.pocket(box, s3d.rect(w - 90, 620), d, on=box.face("-Y").move(y=400))
    s3d.material(box, "brushed_steel", roughness=0.35)
    return box


def lid(w=600, d=620, h=40):
    top = s3d.box("lid", w, d, h)
    top = s3d.fillet(top, 6, edges="top")
    s3d.material(top, "brushed_steel", roughness=0.3)
    return top


def masthead(w=380, t=18, h=100):
    plaque = s3d.box("masthead", w, t, h)
    s3d.material(plaque, "glossy_plastic", color=GAME["coral"], roughness=0.25)
    return plaque


def window_glass(w=470, t=12, h=620):
    pane = s3d.box("window_glass", w, t, h)
    s3d.material(pane, "glass", color="#dfe9ea", opacity=0.35)
    return pane


def paper_stack(w=450, d=550):
    stack = s3d.box("paper_stack", w, d, 64)
    top = s3d.at(s3d.box("top_sheet", w - 14, d - 14, 8), z=36)
    strip = s3d.at(s3d.box("masthead_strip", w - 40, 110, 10), y=-120, z=46)
    s3d.material(stack, "plastic", color=GAME["cream"], roughness=0.8)
    s3d.material(top, "plastic", color=GAME["stone"], roughness=0.8)
    s3d.material(strip, "glossy_plastic", color=GAME["coral"], roughness=0.3)
    return s3d.group("paper_stack", stack, top, strip)


def coin_mech(w=150, d=60, h=300):
    mech = s3d.box("coin_mech", w, d, h)
    s3d.pocket(mech, s3d.rect(w - 50, h - 80), 20, on=mech.face("-Y").move(y=h / 2))
    slot = s3d.at(s3d.box("coin_slot", 70, 24, 26), y=-28, z=h / 2 + 80)
    s3d.material(mech, "brushed_steel", roughness=0.3)
    s3d.material(slot, "plastic", color=GAME["ink"], roughness=0.6)
    return s3d.group("coin_mech", mech, slot)


def side_handle(d=26):
    bar = s3d.wire("side_handle",
                   [(0, -120, 520), (64, -120, 520), (64, -120, 780), (0, -120, 780)],
                   d, fillet=30)
    s3d.material(bar, "brushed_steel", roughness=0.3)
    return bar


if __name__ == "__main__":
    import sys
    s3d.export(newsrack(), sys.argv[1] if len(sys.argv) > 1 else "newsrack.glb")
