"""Builders A: sofa, bed, dining_set. Each build_*(M) returns a list of part objects.

Conventions (from skill references):
- W along X, D along Y (front faces -Y), H along Z; base at z=0.
- One solid may penetrate another by >=5 mm (hidden intersection); flush coplanar
  faces are forbidden (Cycles z-fighting).
- Cushions get wide bevels (20-60 mm), hard parts micro-bevels (2-10 mm).
"""
from math import radians
import lowpoly_lib as lp
from mathutils import Matrix


def _tapered_legs(objs, name, pts, top_r, bot_r, h, mat, splay_deg=0.0):
    """Cone legs, bottom radius < top radius; optional splay tips tops toward center."""
    for i, (x, y) in enumerate(pts):
        rot = (0.0, 0.0, 0.0)
        if splay_deg:
            th = radians(splay_deg)
            rot = (th if y > 0 else -th, -th if x > 0 else th, 0.0)
        leg = lp.cone(f"{name}_{i:02d}", r1=bot_r, r2=top_r, depth=h,
                      loc=(x, y, 0.0), rot=rot, anchor="base")
        lp.assign(leg, mat)
        objs.append(leg)


# ---------------------------------------------------------------- sofa
def build_sofa(M):
    W, D = 2.10, 0.92
    fab = M("sage", 0.90)
    rose = M("dusty_rose", 0.90)
    cream = M("cream", 0.90)
    wood = M("walnut", 0.55)
    o = []

    _tapered_legs(o, "sofa_leg", [(sx * 0.95, sy * 0.36) for sx in (-1, 1) for sy in (-1, 1)],
                  top_r=0.028, bot_r=0.020, h=0.19, mat=wood, splay_deg=2.5)

    base = lp.box("sofa_base", (2.06, 0.88, 0.16), loc=(0, 0, 0.14))
    lp.assign(base, fab); lp.bevel(base, 0.006); o.append(base)

    arms = []
    for sx in (-1, 1):
        arm = lp.box(f"sofa_arm_{'l' if sx < 0 else 'r'}", (0.22, 0.92, 0.37),
                     loc=(sx * 0.94, 0, 0.25))
        lp.assign(arm, fab); lp.bevel(arm, 0.010); arms.append(arm); o.append(arm)

    back = lp.box("sofa_back", (1.70, 0.10, 0.55), loc=(0, 0.37, 0.25))
    lp.assign(back, fab); lp.bevel(back, 0.008); o.append(back)

    xs = (-0.555, 0.0, 0.555)
    for i, x in enumerate(xs):
        sc = lp.box(f"sofa_cushion_seat_{i+1:02d}", (0.53, 0.58, 0.16), loc=(x, -0.02, 0.28))
        lp.assign(sc, fab); lp.bevel(sc, 0.040, segments=2); o.append(sc)
        bc = lp.box(f"sofa_cushion_back_{i+1:02d}", (0.53, 0.16, 0.38),
                    loc=(x, 0.27, 0.42), rot=(radians(-1.5), 0, 0))
        lp.assign(bc, fab); lp.bevel(bc, 0.035, segments=2); o.append(bc)

    for sx, m in ((-1, rose), (1, cream)):
        pil = lp.box(f"sofa_pillow_{'l' if sx < 0 else 'r'}", (0.40, 0.14, 0.40),
                     loc=(sx * 0.60, -0.10, 0.40), rot=(0, radians(sx * 20), 0))
        lp.assign(pil, m); lp.bevel(pil, 0.045, segments=2); o.append(pil)
    return o


# ---------------------------------------------------------------- bed
def build_bed(M):
    cream = M("cream", 0.90)
    offw = M("off_white", 0.60)
    hg = M("warm_gray", 0.60)
    blk = M("soft_black", 0.40)
    rose = M("dusty_rose", 0.90)
    mus = M("mustard", 0.90)
    o = []

    _tapered_legs(o, "bed_leg", [(sx * 0.68, sy * 0.89) for sx in (-1, 1) for sy in (-1, 1)],
                  top_r=0.030, bot_r=0.022, h=0.19, mat=blk, splay_deg=2.0)

    frame = lp.box("bed_frame", (1.56, 2.02, 0.16), loc=(0, 0, 0.14))
    lp.assign(frame, blk); lp.bevel(frame, 0.005); o.append(frame)

    hb = lp.box("bed_headboard", (1.60, 0.10, 0.70), loc=(0, 1.00, 0.25))
    lp.assign(hb, hg); lp.bevel(hb, 0.008, segments=2); o.append(hb)

    mat = lp.box("bed_mattress", (1.50, 1.90, 0.24), loc=(0, -0.02, 0.28))
    lp.assign(mat, cream); lp.bevel(mat, 0.030, segments=2); o.append(mat)

    duv = lp.box("bed_duvet", (1.66, 1.50, 0.34), loc=(0, -0.305, 0.28))
    lp.assign(duv, cream); lp.bevel(duv, 0.050, segments=2); o.append(duv)

    fold = lp.box("bed_duvet_fold", (1.66, 0.12, 0.05), loc=(0, 0.40, 0.615))
    lp.assign(fold, offw); lp.bevel(fold, 0.015, segments=2); o.append(fold)

    for i, (sx, m) in enumerate(((-1, rose), (1, rose))):
        pil = lp.box(f"bed_pillow_{i+1:02d}", (0.60, 0.35, 0.12),
                     loc=(sx * 0.38, 0.68, 0.50), rot=(radians(-7), 0, 0))
        lp.assign(pil, m); lp.bevel(pil, 0.035, segments=2); o.append(pil)

    throw = lp.box("bed_throw", (1.50, 0.40, 0.045), loc=(0, -0.70, 0.60),
                   rot=(0, 0, radians(1.5)))
    lp.assign(throw, mus); lp.bevel(throw, 0.012, segments=2); o.append(throw)
    return o


# ---------------------------------------------------------------- dining set
def build_dining_set(M):
    walnut = M("walnut", 0.55)
    charc = M("charcoal", 0.40)
    terra = M("terracotta", 0.70)
    cream = M("cream", 0.90)
    sage = M("sage", 0.90)
    o = []

    top = lp.box("table_top", (1.50, 0.90, 0.04), loc=(0, 0, 0.70))
    lp.assign(top, walnut); lp.bevel(top, 0.008, segments=2); o.append(top)
    apron = lp.box("table_apron", (1.34, 0.72, 0.08), loc=(0, 0, 0.62))
    lp.assign(apron, walnut); lp.bevel(apron, 0.004); o.append(apron)
    pts = [(sx * 0.65, sy * 0.35) for sx in (-1, 1) for sy in (-1, 1)]
    for i, (x, y) in enumerate(pts):
        leg = lp.box(f"table_leg_{i:02d}", (0.07, 0.07, 0.635), loc=(x, y, 0.0))
        lp.assign(leg, charc); lp.bevel(leg, 0.003); o.append(leg)

    bowl = lp.cone("table_bowl", r1=0.10, r2=0.135, depth=0.07, loc=(0.12, 0.05, 0.735),
                   anchor="base")
    lp.assign(bowl, terra); o.append(bowl)

    # chair faces +Y (toward the table); backrest on the -Y side
    cx, cy = 0.0, -0.62
    seat = lp.box("chair_seat", (0.44, 0.42, 0.045), loc=(cx, cy, 0.415))
    lp.assign(seat, cream); lp.bevel(seat, 0.005); o.append(seat)
    pad = lp.box("chair_seat_pad", (0.40, 0.38, 0.03), loc=(cx, cy, 0.44))
    lp.assign(pad, sage); lp.bevel(pad, 0.015, segments=2); o.append(pad)
    for i, (dx, dy) in enumerate(((-0.18, -0.17), (0.18, -0.17), (-0.18, 0.17), (0.18, 0.17))):
        leg = lp.box(f"chair_leg_{i:02d}", (0.045, 0.045, 0.44),
                     loc=(cx + dx, cy + dy, 0.0))
        lp.assign(leg, charc); lp.bevel(leg, 0.002); o.append(leg)
    for i, sx in enumerate((-1, 1)):
        post = lp.box(f"chair_back_post_{i+1:02d}", (0.045, 0.045, 0.44),
                      loc=(cx + sx * 0.18, cy - 0.18, 0.44))
        lp.assign(post, cream); lp.bevel(post, 0.002); o.append(post)
    panel = lp.box("chair_back_panel", (0.40, 0.035, 0.26), loc=(cx, cy - 0.18, 0.60))
    lp.assign(panel, cream); lp.bevel(panel, 0.003); o.append(panel)
    return o
