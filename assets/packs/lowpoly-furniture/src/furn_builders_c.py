"""Builders C: coffee_table, floor_lamp, stool, potted_plant."""
from math import radians, sin, cos, pi
import lowpoly_lib as lp
from mathutils import Matrix


# ---------------------------------------------------------------- coffee table
def build_coffee_table(M):
    walnut = M("walnut", 0.55)
    wg = M("warm_gray", 0.60)
    sage = M("sage", 0.85)
    mus = M("mustard", 0.85)
    terra = M("terracotta", 0.70)
    o = []

    top = lp.box("coffee_table_top", (1.00, 0.60, 0.035), loc=(0, 0, 0.385))
    lp.assign(top, walnut); lp.bevel(top, 0.010, segments=2); o.append(top)
    shelf = lp.box("coffee_table_shelf", (0.85, 0.48, 0.025), loc=(0, 0, 0.13))
    lp.assign(shelf, wg); lp.bevel(shelf, 0.004); o.append(shelf)
    for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        leg = lp.box(f"coffee_table_leg_{i+1:02d}", (0.055, 0.055, 0.40),
                     loc=(sx * 0.42, sy * 0.26, 0.0))
        lp.assign(leg, wg); lp.bevel(leg, 0.003); o.append(leg)

    b1 = lp.box("coffee_table_book_01", (0.30, 0.22, 0.025), loc=(-0.20, 0.02, 0.415),
                anchor="base", rot=(0, 0, radians(8)))
    lp.assign(b1, sage); lp.bevel(b1, 0.004); o.append(b1)
    b2 = lp.box("coffee_table_book_02", (0.26, 0.19, 0.025), loc=(-0.20, 0.02, 0.438),
                anchor="base", rot=(0, 0, radians(-3)))
    lp.assign(b2, mus); lp.bevel(b2, 0.004); o.append(b2)
    vase = lp.cone("coffee_table_vase", r1=0.048, r2=0.030, depth=0.12,
                   loc=(0.25, 0.0, 0.415), anchor="base")
    lp.assign(vase, terra); o.append(vase)
    return o


# ---------------------------------------------------------------- floor lamp
def build_floor_lamp(M):
    blk = M("soft_black", 0.40)
    cream = M("cream", 0.90)
    o = []

    base = lp.cylinder("lamp_base", r=0.15, depth=0.025, loc=(0, 0, 0.0), anchor="base")
    lp.assign(base, blk); lp.bevel(base, 0.004); o.append(base)

    pole = lp.cylinder("lamp_pole", r=0.0125, depth=1.28, loc=(0, 0, 0.02), anchor="base")
    lp.assign(pole, blk); o.append(pole)

    shade = lp.cone("lamp_shade", r1=0.21, r2=0.16, depth=0.27, loc=(0, 0, 1.28),
                    anchor="base")
    lp.assign(shade, cream); o.append(shade)

    bulb_mat = M("warm_white", 0.40)
    try:  # mild emissive: the only glow in the set
        bsdf = next(n for n in bulb_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Emission Strength"].default_value = 2.0
    except Exception:
        pass
    bulb = lp.sphere("lamp_bulb", r=0.05, loc=(0, 0, 1.26), segments=10, rings=6)
    lp.assign(bulb, bulb_mat); o.append(bulb)
    return o


# ---------------------------------------------------------------- stool
def build_stool(M):
    wood = M("walnut", 0.55)
    sage = M("sage", 0.90)
    o = []

    seat = lp.cylinder("stool_seat", r=0.175, depth=0.045, loc=(0, 0, 0.405), anchor="base")
    lp.assign(seat, wood); o.append(seat)
    pad = lp.cylinder("stool_seat_pad", r=0.165, depth=0.025, loc=(0, 0, 0.44), anchor="base")
    lp.assign(pad, sage); lp.bevel(pad, 0.008, segments=2); o.append(pad)

    rad, splay = 0.13, 8.0
    for i in range(4):
        a = pi / 4 + i * pi / 2
        x, y = rad * cos(a), rad * sin(a)
        th = radians(splay)
        rot = (th if y > 0 else -th, -th if x > 0 else th, 0.0)
        leg = lp.cone(f"stool_leg_{i+1:02d}", r1=0.016, r2=0.023, depth=0.44,
                      loc=(x, y, 0.0), rot=rot, anchor="base")
        lp.assign(leg, wood); o.append(leg)
    return o


# ---------------------------------------------------------------- potted plant
def build_potted_plant(M):
    terra = M("terracotta", 0.70)
    charc = M("charcoal", 0.55)
    wood = M("walnut", 0.55)
    leaf_l = M("foliage_light", 0.80)
    leaf_d = M("foliage_dark", 0.80)
    o = []

    saucer = lp.cylinder("plant_saucer", r=0.17, depth=0.02, loc=(0, 0, 0.0), anchor="base")
    lp.assign(saucer, charc); o.append(saucer)
    pot = lp.cone("plant_pot", r1=0.13, r2=0.15, depth=0.30, loc=(0, 0, 0.01), anchor="base")
    lp.assign(pot, terra); o.append(pot)
    soil = lp.cylinder("plant_soil", r=0.135, depth=0.02, loc=(0, 0, 0.295), anchor="base")
    lp.assign(soil, charc); o.append(soil)
    trunk = lp.cone("plant_trunk", r1=0.025, r2=0.016, depth=1.00, loc=(0, 0, 0.30),
                    anchor="base")
    lp.assign(trunk, wood); o.append(trunk)

    # 7 ellipsoid leaves: baked scale/rotation/translation into mesh data
    # (identity object transforms -> gotcha-12 safe), alternating two-tone greens
    layout = [
        (0.00,  0.00, 1.33, 0.140, 0.110, 0.080,  0.0, 0.00, leaf_l),
        (0.14,  0.00, 1.16, 0.290, 0.070, 0.055, 0.0, 0.38, leaf_d),
        (-0.10, 0.08, 1.08, 0.280, 0.070, 0.055, 141.0, 0.46, leaf_l),
        (-0.06, -0.17, 0.99, 0.280, 0.070, 0.055, 252.0, 0.42, leaf_d),
        (0.12, -0.05, 1.06, 0.270, 0.065, 0.055, 337.0, 0.50, leaf_l),
        (0.08, 0.14, 0.93, 0.260, 0.065, 0.050, 58.0, 0.56, leaf_d),
        (-0.14, -0.06, 0.88, 0.260, 0.065, 0.050, 205.0, 0.60, leaf_l),
    ]
    for i, (x, y, z, a, b, c, azim_deg, tilt, mat) in enumerate(layout):
        leaf = lp.sphere(f"plant_leaf_{i+1:02d}", r=1.0, loc=(0, 0, 0),
                         segments=10, rings=6)
        # pole -> +X first so the scaled tip reaches exactly `a` along the long axis
        leaf.data.transform(Matrix.Rotation(radians(90), 4, "Y"))
        leaf.data.transform(Matrix.Diagonal((a, b, c, 1.0)))
        leaf.data.transform(Matrix.Rotation(tilt, 4, "Y"))
        leaf.data.transform(Matrix.Rotation(radians(azim_deg), 4, "Z"))
        leaf.data.transform(Matrix.Translation((x, y, z)))
        lp.assign(leaf, mat); o.append(leaf)
    return o
