"""Bodega storefront entrance assembly — Alder Heights asset 9/12.

Reference: the classic NYC bodega front: stucco header with a recessed sign
band and raised gold lettering, gooseneck lamp over the sign, teal bulkheads,
aluminium stiles, big fixed glass, and a hinged glass door with push bar and
kick plate. Articulated: revolute joint `storefront_door_hinge` (right-hand
hinge, opens outward toward -Y, 0–95°).

Millimetres. Overall: 4.2 m wide × ~3.1 m high (with lamp) × 0.3 m wall.
"""
import sand3d as s3d
from _nyc import NYC, GAME

W = 4200
WALL_T = 300


def storefront():
    s3d.empty_scene()
    wall = s3d.at(back_wall(), y=150, z=0)
    header_p = s3d.at(header(), y=150, z=2000)
    panel = s3d.at(sign_panel(), y=28, z=2130)
    letters = s3d.at(sign_letters(), rx=90, y=30, z=2350)
    lamp = s3d.at(gooseneck_lamp(), z=0)
    bulk_l = s3d.at(bulkhead(), x=-1885, z=0)
    bulk_r = s3d.transform(s3d.copy(bulk_l), mirror="x")
    glass_l = s3d.at(sidelight(), x=1015, z=0)
    glass_r = s3d.transform(s3d.copy(glass_l), mirror="x")
    pier_l = s3d.at(pier(), x=-1827, z=0)
    pier_r = s3d.transform(s3d.copy(pier_l), mirror="x")
    sill = s3d.at(threshold(), z=0)
    hinge = s3d.local(wall, 460, -150, 0)
    door = s3d.at(storefront_door(), on=hinge)
    s3d.joint("storefront_door_hinge", door, hinge, axis="+Z", range=(0, 95))
    return s3d.assembly("storefront", wall, header_p, panel, letters, lamp, bulk_l, bulk_r,
                        glass_l, glass_r, pier_l, pier_r, sill, door)


def back_wall(w=W, t=WALL_T, h=2000):
    band = s3d.box("back_wall", w, t, h)
    s3d.material(band, "plastic", color=GAME["bldg"], roughness=0.85)
    return band


def header(w=W, t=WALL_T, h=900):
    head = s3d.box("header", w, t, h)
    s3d.pocket(head, s3d.rect(3100, 500), 42, on=head.face("-Y").move(y=350))
    s3d.material(head, "plastic", color=NYC["stucco"], roughness=0.85)
    return head


def sign_panel(w=3020, t=26, h=440):
    panel = s3d.box("sign_panel", w, t, h)
    s3d.material(panel, "painted_metal", color=GAME["manhole"], roughness=0.6)
    return panel


def sign_letters(size=300, t=25):
    letters = s3d.extrude("sign_letters", s3d.text("BODEGA", size), t)
    s3d.material(letters, "painted_metal", color=GAME["gold"], roughness=0.35)
    return letters


def gooseneck_lamp():
    neck = s3d.wire("gooseneck",
                    [(0, 110, 2880), (0, 150, 3090), (0, 330, 3150), (0, 470, 3105)],
                    55, fillet=120)
    shade = s3d.at(s3d.dome("lamp_shade", 430, 190), rx=180, y=470, z=3100)
    bulb = s3d.at(s3d.sphere("lamp_bulb", 100), y=470, z=3010)
    s3d.material(neck, "painted_metal", color=GAME["ink"], roughness=0.5)
    s3d.material(shade, "painted_metal", color=GAME["ink"], roughness=0.5)
    s3d.material(bulb, "light", color=GAME["amber"])
    return s3d.group("gooseneck_lamp", neck, shade, bulb)


def bulkhead(w=1080, t=280, h=520):
    box = s3d.box("bulkhead", w, t, h)
    box = s3d.fillet(box, 10, edges="top")
    s3d.material(box, "painted_metal", color=GAME["teal"], roughness=0.45)
    return box


def sidelight(w=1080, t=24, h=1380):
    stile = s3d.box("sidelight_frame", w, 60, h)
    s3d.pocket(stile, s3d.rect(w - 150, h - 130), 70, on=stile.face("-Y").move(y=h / 2))
    pane = s3d.box("sidelight_glass", w - 140, 20, h - 120)
    s3d.material(stile, "aluminium", roughness=0.4)
    s3d.material(pane, "glass", color="#dfe9ea", opacity=0.35)
    return s3d.group("sidelight", stile, pane)


def pier(w=545, t=280, h=2000):
    box = s3d.box("pier", w, t, h)
    s3d.material(box, "plastic", color=NYC["stucco"], roughness=0.85)
    return box


def threshold(w=2100, d=320, h=26):
    sill = s3d.box("threshold", w, d, h)
    s3d.material(sill, "aluminium", roughness=0.5)
    return sill


def storefront_door(w=920, t=50, h=2060):
    slab = s3d.box("door_slab", w, t, h)             # built centred; cut first…
    s3d.pocket(slab, s3d.rect(640, 1560), t + 4,
               on=slab.face("-Y").move(y=1150))
    s3d.material(slab, "aluminium", roughness=0.4)
    slab = s3d.at(slab, x=-w / 2)                    # …then moved: origin on the right-hand hinge edge
    pane = s3d.at(s3d.box("door_glass", 660, 20, 1580), z=1150 - 790)
    bar = s3d.at(s3d.box("push_bar", 700, 60, 60), y=-45, z=970)
    kick = s3d.at(s3d.box("kick_plate", 880, 14, 300), y=-40, z=180)
    s3d.material(slab, "aluminium", roughness=0.4)
    s3d.material(pane, "glass", color="#dfe9ea", opacity=0.35)
    s3d.material(bar, "aluminium", roughness=0.35)
    s3d.material(kick, "painted_metal", color=GAME["teal"], roughness=0.5)
    return s3d.group("storefront_door", slab, pane, bar, kick)


if __name__ == "__main__":
    import sys
    s3d.export(storefront(), sys.argv[1] if len(sys.argv) > 1 else "storefront.glb")
