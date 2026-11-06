"""Commercial glass-door reach-in refrigerator — Alder Heights asset 11/12 (interior).

Reference: the standard bodega/deli reach-in: ~760 × 830 × ~2.0 m on casters,
brushed stainless body, single hinged glass door with vertical handle,
interior shelving visible through the glass, compressor deck with grille on
top. Articulated: revolute joint `fridge_door_hinge` (left-hand hinge, opens
outward toward -Y, 0–110°).

Front looks -Y. Millimetres.
"""
import sand3d as s3d
from _nyc import NYC, GAME

BODY_W, BODY_D, BODY_H = 760, 830, 1840


def refrigerator():
    s3d.empty_scene()
    body = s3d.at(body_shell(), z=60)
    interior = s3d.at(cavity(), z=110)
    shelves = s3d.group("shelves",
                        s3d.at(shelf_board("shelf_lo"), z=590),
                        s3d.at(shelf_board("shelf_mid"), z=1010),
                        s3d.at(shelf_board("shelf_hi"), z=1430))
    deck = s3d.at(compressor_deck(), z=1900)
    casters = s3d.at(caster(), on=s3d.grid(2, 2, 560, 620), z=0)
    floor = s3d.at(floor_plate(), z=70)
    hinge = s3d.local(floor, -355, 0, 60)
    door = s3d.at(glass_door(), on=hinge)
    s3d.joint("fridge_door_hinge", door, hinge, axis="-Z", range=(0, 110))
    return s3d.assembly("refrigerator", body, interior, shelves, deck, casters, floor, door)


def body_shell():
    back = s3d.box("back_wall", BODY_W, 60, BODY_H)
    back = s3d.at(back, y=BODY_D / 2 - 30)
    left = s3d.box("side_wall", 60, BODY_D, BODY_H)
    left = s3d.at(left, x=-BODY_W / 2 + 30)
    right = s3d.transform(s3d.copy(left), mirror="x")
    top = s3d.box("top_wall", BODY_W, BODY_D, 60)
    top = s3d.at(top, z=BODY_H - 60)
    s3d.join(back, [left, right, top])
    s3d.material(back, "brushed_steel", roughness=0.4)
    return back


def floor_plate(w=BODY_W, d=BODY_D, t=50):
    """Static floor of the cabinet; the door's hinge frame is read on it."""
    plate = s3d.box("floor_plate", w, d, t)
    s3d.material(plate, "brushed_steel", roughness=0.4)
    return plate


def cavity(w=620, d=700, h=1700):
    box = s3d.box("interior_cavity", w, d, h)
    s3d.material(box, "plastic", color=GAME["cream"], roughness=0.6)
    return box


def shelf_board(name="shelf", w=600, d=580, t=22):
    plate = s3d.box(name, w, d, t)
    s3d.material(plate, "brushed_steel", roughness=0.35)
    return plate


def compressor_deck(w=BODY_W, d=BODY_D, h=140):
    deck = s3d.box("compressor_deck", w, d, h)
    for k, x in enumerate((-240, -80, 80, 240)):
        s3d.pocket(deck, s3d.slot(120, 36), 30, on=deck.face("-Y").move(x=x, y=h / 2))
    s3d.material(deck, "brushed_steel", roughness=0.4)
    return deck


def caster(name="caster", d=90, h=60):
    wheel = s3d.cylinder(name, d, h)
    fork = s3d.at(s3d.box("caster_fork", 70, 70, 40), z=h - 20)
    s3d.join(wheel, fork)
    s3d.material(wheel, "rubber", color=GAME["ink"])
    return wheel


def glass_door(w=700, t=45, h=1740):
    slab = s3d.box("door_slab", w, t, h)              # built centred; cut first…
    s3d.pocket(slab, s3d.rect(560, 1540), t + 4, on=slab.face("-Y").move(y=h / 2))
    s3d.material(slab, "brushed_steel", roughness=0.4)
    slab = s3d.at(slab, x=w / 2)                      # …then moved: origin on the hinge edge
    pane = s3d.at(s3d.box("door_glass", 580, 20, 1560), x=w / 2, z=h / 2 - 780)
    gasket = s3d.at(s3d.box("door_gasket", w - 30, 30, h - 30), x=w / 2, y=20, z=0)
    handle = s3d.at(s3d.cylinder("door_handle", 36, 1150), x=w - 70, y=-38, z=h / 2 - 575)
    s3d.material(slab, "brushed_steel", roughness=0.4)
    s3d.material(pane, "glass", color="#e4ecec", opacity=0.3)
    s3d.material(gasket, "rubber", color=GAME["ink"])
    s3d.material(handle, "chrome", roughness=0.15)
    return s3d.group("glass_door", slab, pane, gasket, handle)


if __name__ == "__main__":
    import sys
    s3d.export(refrigerator(), sys.argv[1] if len(sys.argv) > 1 else "refrigerator.glb")
