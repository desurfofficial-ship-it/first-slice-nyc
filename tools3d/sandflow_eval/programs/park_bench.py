"""NYC Parks settee bench — Alder Heights asset 4/12 (street infrastructure).

Reference: the standard NYC Parks "settee" — World's Fair / Central Park style:
~1.8 m long, seat ~450 mm, painted green tubular/strap frame with oak slats,
the arm rail sweeping down into the legs in one loop.

Front looks -Y (a sitter faces -Y). Millimetres.
"""
import sand3d as s3d
from _nyc import NYC

SLAT_PITCH = 105


def bench():
    s3d.empty_scene()
    end_l = s3d.at(end_frame(), x=-821)
    end_r = s3d.transform(s3d.copy(end_l), mirror="x")
    seat = s3d.at(seat_slats(), z=455)
    back = s3d.at(back_slats(), z=0)
    return s3d.assembly("park_bench", end_l, end_r, seat, back)


def end_frame(arm_d=40):
    """One end: a continuous arm-to-leg loop plus a leaning back post, round bar."""
    loop = s3d.wire("arm_loop",
                    [(0, -255, 0), (0, -248, 200), (0, -240, 430), (0, -205, 560),
                     (0, -130, 612), (0, 110, 612), (0, 175, 570), (0, 228, 430),
                     (0, 240, 200), (0, 240, 0)],
                    arm_d, fillet=80)
    post = s3d.wire("back_post", [(0, 150, 0), (0, 235, 790)], arm_d)
    feet = s3d.at(s3d.box("foot_pad", 70, 90, 16), on=s3d.grid(1, 2, 0, 495), z=0)
    s3d.join(loop, post)
    s3d.material(loop, "painted_metal", color=NYC["parks_green"], roughness=0.5)
    s3d.material(feet, "painted_metal", color=NYC["parks_green"], roughness=0.6)
    return s3d.group("end_frame", loop, feet)


def seat_slats(n=5, w=1640, slat_w=95, t=30):
    slats = s3d.at(s3d.box("seat_slat", w, slat_w, t),
                   on=s3d.grid(1, n, 0, SLAT_PITCH))
    s3d.material(slats, "oak", color="#b48a5a", roughness=0.55)
    return s3d.group("seat_slats", slats)


def back_slats(n=3, w=1640, slat_w=115, t=26, lean=-7.0):
    """Back slats on the leaning posts (top of the back drifts toward +Y)."""
    out = []
    for k, z in enumerate((560, 650, 740)):
        slat = s3d.box(f"back_slat_{k}", w, slat_w, t)
        slat = s3d.at(slat, y=150 + 0.115 * z, z=z, rx=lean)
        out.append(slat)
    s3d.material(out, "oak", color="#b48a5a", roughness=0.55)
    return s3d.group("back_slats", *out)


if __name__ == "__main__":
    import sys
    s3d.export(bench(), sys.argv[1] if len(sys.argv) > 1 else "park_bench.glb")
