"""DSNY litter basket — Alder Heights asset 2/12 (street infrastructure).

Reference: the classic NYC Department of Sanitation wire-mesh street basket:
Ø ~460 mm at the rolled rim, tapering to ~400 mm at the base, ~1000 mm tall,
dark DSNY green, flat vertical straps and three hoop bands (the modern
package-basket design).

Front looks -Y. Millimetres.
"""
import sand3d as s3d
from _nyc import NYC

STRAPS = 18


def basket():
    s3d.empty_scene()
    rim = s3d.at(rim_ring(), z=955)
    straps = s3d.at(strap(), on=s3d.ring(STRAPS, 208), z=30)
    hoops = s3d.at(hoop(), z=250)
    hoops2 = s3d.at(hoop(), z=560)
    hoops3 = s3d.at(hoop(), z=110)
    floor = s3d.at(floor_plate(), z=8)
    return s3d.assembly("dsny_basket", rim, straps, hoops, hoops2, hoops3, floor)


def rim_ring(d=470, wire=22):
    rim = s3d.torus("rim", d, wire)
    s3d.material(rim, "painted_metal", color=NYC["dsny_green"], roughness=0.6)
    return rim


def strap(w_tangent=26, t_radial=7, h=930):
    """One flat strap: frame X is radial, so thickness runs radially (x=7)."""
    strap = s3d.box("strap", t_radial, w_tangent, h)
    s3d.material(strap, "painted_metal", color=NYC["dsny_green"], roughness=0.6)
    return strap


def hoop(d=428, wire=14):
    hoop = s3d.torus("hoop", d, wire)
    s3d.material(hoop, "painted_metal", color=NYC["dsny_green"], roughness=0.6)
    return hoop


def floor_plate(d=380, h=26):
    plate = s3d.cylinder("floor", d, h)
    plate = s3d.fillet(plate, 4, edges="top")
    s3d.material(plate, "painted_metal", color=NYC["dsny_green"], roughness=0.7)
    return plate


if __name__ == "__main__":
    import sys
    s3d.export(basket(), sys.argv[1] if len(sys.argv) > 1 else "dsny_basket.glb")
