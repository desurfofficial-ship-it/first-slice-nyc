"""Prewar apartment entrance door — Alder Heights asset 7/12 (building & storefront).

Reference: the classic NYC prewar lobby/stair door: ~900 × 2040 × 45 mm painted
hardwood slab with recessed panels (2 × 2 over 1 wide lower), brass hardware
(knob + rosettes, peephole), three barrel hinges on the left jamb. The door is
**articulated**: revolute joint `door_hinge` at the hinge edge, opening outward
(toward the street, -Y), range 0–105°.

Frame is static; only `door_leaf` moves. Millimetres.
"""
import sand3d as s3d
from _nyc import NYC, GAME


def apartment_door():
    s3d.empty_scene()
    frame = s3d.at(door_frame(), z=0)
    hinge = s3d.local(frame, -457, 0, 0)
    leaf = s3d.at(door_leaf(), on=hinge)
    s3d.joint("door_hinge", leaf, hinge, axis="-Z", range=(0, 105))
    return s3d.assembly("apartment_door", frame, leaf)


def door_frame(w_open=915, h_open=2050, jamb=40, depth=150):
    left = s3d.box("jamb_left", jamb, depth, h_open + jamb)
    left = s3d.at(left, x=-(w_open / 2 + jamb / 2), z=0)
    right = s3d.transform(s3d.copy(left), mirror="x")
    head = s3d.box("head", w_open + 2 * jamb, depth, jamb)
    head = s3d.at(head, z=h_open)
    sill = s3d.box("threshold", w_open + 2 * jamb, depth + 20, 24)
    sill = s3d.at(sill, z=0)
    wall = s3d.box("wall_band", w_open + 2 * jamb + 60, 30, h_open + jamb + 120)
    wall = s3d.at(wall, y=depth / 2 + 30, z=-60)
    s3d.material([left, right, head], "oak", color=NYC["prewar_frame"], roughness=0.5)
    s3d.material(sill, "aluminium", roughness=0.5)
    s3d.material(wall, "plastic", color=GAME["bldg"], roughness=0.8)
    return s3d.group("door_frame", left, right, head, sill, wall)


def door_leaf(w=890, t=45, h=2040):
    slab = s3d.box("leaf_slab", w, t, h)               # built centred; cuts first…
    face_front = slab.face("-Y")
    face_back = slab.face("+Y")
    for cx in (-195, 195):                            # panel columns, offset from slab centre
        s3d.pocket(slab, s3d.rect(290, 560), 10, on=face_front.move(x=cx, y=1560))
        s3d.pocket(slab, s3d.rect(290, 560), 10, on=face_back.move(x=cx, y=1560))
    for cx in (-195, 195):
        s3d.pocket(slab, s3d.rect(290, 480), 10, on=face_front.move(x=cx, y=930))
        s3d.pocket(slab, s3d.rect(290, 480), 10, on=face_back.move(x=cx, y=930))
    s3d.pocket(slab, s3d.rect(690, 760), 10, on=face_front.move(y=330))
    s3d.pocket(slab, s3d.rect(690, 760), 10, on=face_back.move(y=330))
    s3d.material(slab, "oak", color=NYC["prewar_door"], roughness=0.5)
    slab = s3d.at(slab, x=w / 2)                      # …then moved: origin on the hinge edge
    knob = knob_set(w)
    hinges = s3d.group("hinges",
                       s3d.at(hinge_barrel(), x=10, z=280),
                       s3d.at(hinge_barrel(), x=10, z=1020),
                       s3d.at(hinge_barrel(), x=10, z=1760))
    peep = s3d.at(peephole(), rx=90, x=w - 100, y=0, z=1680)
    s3d.material(hinges, "brass")
    return s3d.group("door_leaf", slab, knob, hinges, peep)


def knob_set(w, z=1020, x_off=None):
    x = (w - 100) if x_off is None else x_off
    rose_f = s3d.cylinder("rosette_front", 66, 8)
    rose_f = s3d.at(rose_f, rx=90, x=x, y=-26, z=z)
    knob_f = s3d.at(s3d.sphere("knob_front", 56), x=x, y=-40, z=z)
    rose_b = s3d.at(s3d.cylinder("rosette_back", 66, 8), rx=90, x=x, y=26, z=z)
    knob_b = s3d.at(s3d.sphere("knob_back", 56), x=x, y=40, z=z)
    spindle = s3d.at(s3d.cylinder("knob_spindle", 16, 70), rx=90, x=x, z=z)
    s3d.material([rose_f, rose_b, knob_f, knob_b, spindle], "brass")
    return s3d.group("knob_set", rose_f, knob_f, rose_b, knob_b, spindle)


def hinge_barrel(d=26, h=110):
    barrel = s3d.cylinder("hinge_barrel", d, h)
    s3d.material(barrel, "brass")
    return barrel


def peephole(d=20, t=54):
    peep = s3d.cylinder("peephole", d, t)
    s3d.material(peep, "brass")
    return peep


if __name__ == "__main__":
    import sys
    s3d.export(apartment_door(), sys.argv[1] if len(sys.argv) > 1 else "apartment_door.glb")
