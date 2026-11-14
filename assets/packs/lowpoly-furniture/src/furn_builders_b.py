"""Builders B: bookshelf, desk, wardrobe. Same conventions as builders A."""
from math import radians
import lowpoly_lib as lp


# ---------------------------------------------------------------- bookshelf
def build_bookshelf(M):
    wg = M("warm_gray", 0.60)
    spines = [M("mustard", 0.85), M("terracotta", 0.85),
              M("sage", 0.85), M("dusty_rose", 0.85)]
    ceramic = M("off_white", 0.45)
    o = []

    for sx in (-1, 1):
        side = lp.box(f"bookshelf_side_{'l' if sx < 0 else 'r'}", (0.025, 0.30, 1.90),
                      loc=(sx * 0.4125, 0, 0.0))
        lp.assign(side, wg); lp.bevel(side, 0.003); o.append(side)

    top = lp.box("bookshelf_top", (0.86, 0.31, 0.025), loc=(0, 0, 1.875))
    lp.assign(top, wg); lp.bevel(top, 0.003); o.append(top)
    bottom = lp.box("bookshelf_bottom", (0.82, 0.28, 0.025), loc=(0, 0, 0.10))
    lp.assign(bottom, wg); lp.bevel(bottom, 0.003); o.append(bottom)

    for i, z in enumerate((0.475, 0.825, 1.175, 1.525)):
        sh = lp.box(f"bookshelf_shelf_{i+1:02d}", (0.82, 0.28, 0.025), loc=(0, 0, z))
        lp.assign(sh, wg); lp.bevel(sh, 0.003); o.append(sh)

    back = lp.box("bookshelf_back", (0.81, 0.015, 1.79), loc=(0, 0.126, 0.105))
    lp.assign(back, wg); o.append(back)

    # --- shelf contents (books are plain boxes: 12 tris each) ---
    def run(tag, z_top, x0, n, lean_last=True):
        x = x0
        for i in range(n):
            w = 0.030 + 0.02 * ((i * 7 + 3) % 4) / 3.0
            h = 0.20 + 0.06 * ((i * 5 + 1) % 3) / 2.0
            b = lp.box(f"bookshelf_book_{tag}_{i+1:02d}", (w, 0.20, h),
                       loc=(x, 0.02, z_top), anchor="base",
                       rot=(0, radians(-9.0) if (lean_last and i == n - 1) else 0, 0))
            lp.assign(b, spines[i % 4]); o.append(b)
            x += w + 0.004
        return x

    def stack(tag, z_top, x, y):
        z = z_top
        for i, (w, d) in enumerate(((0.22, 0.17), (0.20, 0.16), (0.17, 0.14))):
            b = lp.box(f"bookshelf_book_{tag}_{i+1:02d}", (w, d, 0.028),
                       loc=(x, y, z), anchor="base", rot=(0, 0, radians(-4 + 4 * i)))
            lp.assign(b, spines[(i + 1) % 4]); o.append(b)
            z += 0.028

    run("s1", 0.50, -0.36, 8)
    stack("s2", 0.85, -0.30, 0.02)
    run("s2", 0.85, 0.02, 5, lean_last=False)
    run("s3", 1.20, -0.35, 7)
    vase = lp.cone("bookshelf_vase", r1=0.05, r2=0.032, depth=0.16,
                   loc=(0.28, 0.02, 1.20), anchor="base")
    lp.assign(vase, ceramic); o.append(vase)
    run("s4", 1.55, -0.30, 6, lean_last=False)
    bowl = lp.cone("bookshelf_bowl", r1=0.07, r2=0.095, depth=0.055,
                   loc=(0.22, 0.02, 1.55), anchor="base")
    lp.assign(bowl, spines[0]); o.append(bowl)
    return o


# ---------------------------------------------------------------- desk
def build_desk(M):
    walnut = M("walnut", 0.55)
    blk = M("soft_black", 0.40)
    front = M("off_white", 0.60)
    ceramic = M("off_white", 0.45)
    mus = M("mustard", 0.90)
    o = []

    top = lp.box("desk_top", (1.30, 0.65, 0.04), loc=(0, 0, 0.70))
    lp.assign(top, walnut); lp.bevel(top, 0.008, segments=2); o.append(top)

    for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        leg = lp.box(f"desk_leg_{i+1:02d}", (0.07, 0.07, 0.72),
                     loc=(sx * 0.59, sy * 0.26, 0.0))
        lp.assign(leg, blk); lp.bevel(leg, 0.003); o.append(leg)

    plinth = lp.box("desk_pedestal_plinth", (0.36, 0.46, 0.06), loc=(0.42, 0, 0.0))
    lp.assign(plinth, blk); lp.bevel(plinth, 0.003); o.append(plinth)
    ped = lp.box("desk_pedestal", (0.40, 0.50, 0.655), loc=(0.42, 0, 0.05))
    lp.assign(ped, walnut); lp.bevel(ped, 0.004); o.append(ped)
    for i, z in enumerate((0.495, 0.31)):
        f = lp.box(f"desk_drawer_front_{i+1:02d}", (0.34, 0.018, 0.135),
                   loc=(0.42, -0.264, z))
        lp.assign(f, front); lp.bevel(f, 0.003); o.append(f)

    pad = lp.box("desk_pad", (0.45, 0.30, 0.015), loc=(-0.28, -0.05, 0.735))
    lp.assign(pad, mus); lp.bevel(pad, 0.006, segments=2); o.append(pad)
    mug = lp.cylinder("desk_mug", r=0.04, depth=0.10, loc=(0.12, -0.12, 0.735),
                      anchor="base")
    lp.assign(mug, ceramic); o.append(mug)
    return o


# ---------------------------------------------------------------- wardrobe
def build_wardrobe(M):
    walnut = M("walnut", 0.55)
    cream = M("cream", 0.90)
    blk = M("soft_black", 0.40)
    terra = M("terracotta", 0.70)
    o = []

    plinth = lp.box("wardrobe_plinth", (1.14, 0.54, 0.13), loc=(0, 0, 0.0))
    lp.assign(plinth, blk); lp.bevel(plinth, 0.004); o.append(plinth)

    body = lp.box("wardrobe_body", (1.20, 0.60, 1.92), loc=(0, 0, 0.08))
    lp.assign(body, walnut); lp.bevel(body, 0.004); o.append(body)

    ledge = lp.box("wardrobe_cornice", (1.26, 0.64, 0.05), loc=(0, 0, 1.98))
    lp.assign(ledge, walnut); lp.bevel(ledge, 0.004); o.append(ledge)

    for i, sx in enumerate((-1, 1)):
        door = lp.box(f"wardrobe_door_{'l' if sx < 0 else 'r'}", (0.575, 0.02, 1.80),
                      loc=(sx * 0.2925, -0.315, 0.10))
        lp.assign(door, cream); lp.bevel(door, 0.004); o.append(door)
        pull = lp.cylinder(f"wardrobe_pull_{'l' if sx < 0 else 'r'}", r=0.012, depth=0.16,
                           loc=(sx * 0.045, -0.332, 0.95), anchor="base")
        lp.assign(pull, terra); o.append(pull)
    return o
