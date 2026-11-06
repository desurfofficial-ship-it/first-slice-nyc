"""NYC-style three-way fire hydrant — Alder Heights asset 1/12 (street infrastructure).

Reference: M&H Valve / Mueller three-way hydrants as installed across NYC
(published service drawings): ~730 mm above grade, barrel Ø ~230 mm, base
flange Ø ~300 mm, two 2½ in. side nozzles, one 4½ in. front steamer, pentagon
operating nut. Scheme: silver body, Parks-green bonnet and caps — a common
NYC paint combination that also reads against FIRST SLICE's warm palette.

Front looks -Y (the exported GLB faces +Z). Millimetres (sand3d default).
"""
import sand3d as s3d
from _nyc import NYC


def hydrant():
    """Head: one line per part, placed once (guidelines rules 1 and 4)."""
    s3d.empty_scene()
    base = s3d.at(base_flange(), z=0)
    barrel_p = s3d.at(barrel(), z=50)
    bonnet_p = s3d.at(bonnet(), z=640)
    noz_l = s3d.at(side_nozzle("nozzle_left"), ry=-90, x=-92, z=430)
    noz_r = s3d.transform(s3d.copy(noz_l), mirror="x")
    steamer = s3d.at(steamer_nozzle(), rx=90, y=-92, z=340)
    return s3d.assembly("hydrant", base, barrel_p, bonnet_p, noz_l, noz_r, steamer)


def base_flange(d=300, h=50, bolt_d=26, bolt_r=126):
    flange = s3d.cylinder("base_flange", d, h)
    flange = s3d.fillet(flange, 6, edges="top")
    bolts = s3d.at(s3d.cylinder("bolt_dome", bolt_d, 14), on=s3d.ring(6, bolt_r), z=h - 4)
    s3d.join(flange, bolts)
    s3d.material(flange, "painted_metal", color=NYC["hydrant_silver"], roughness=0.55)
    return flange


def barrel(r_top=88, r_bot=112, h=620):
    profile = s3d.poly([(0, 0), (r_bot, 0), (r_bot, 30), (r_top + 16, 90),
                        (r_top + 6, h - 70), (r_top + 14, h - 20), (r_top - 6, h), (0, h)])
    body = s3d.revolve("barrel", profile)
    s3d.material(body, "painted_metal", color=NYC["hydrant_silver"], roughness=0.5)
    return body


def bonnet(h=90, cap_d=110):
    dome = s3d.dome("bonnet_dome", 224, h)
    cap = s3d.at(s3d.cylinder("bonnet_cap", cap_d, 22), z=h - 14)
    s3d.join(dome, cap)
    nut = s3d.at(s3d.extrude("operating_nut", s3d.polygon(5, 48), 42), z=h + 4)
    s3d.material(dome, "painted_metal", color=NYC["hydrant_green"], roughness=0.45)
    s3d.material(nut, "brass")
    return s3d.group("bonnet", dome, nut)


def side_nozzle(name, bore=64, out=88, cap_d=120):
    """A 2½ in. side nozzle: barrel stub + pentagon cap, built along +Z from origin.
    The origin sits at the barrel surface; the stub reaches 40 mm back inside it."""
    stub = s3d.cylinder("nozzle_stub", bore + 26, out + 40)
    stub = s3d.at(stub, z=-40)
    cap = s3d.at(s3d.extrude("nozzle_cap", s3d.polygon(5, cap_d), 38), z=out - 6)
    s3d.join(stub, cap)
    s3d.material(stub, "painted_metal", color=NYC["hydrant_green"], roughness=0.45)
    return s3d.group(name, stub)


def steamer_nozzle(bore=86, out=92, cap_d=150):
    stub = s3d.cylinder("steamer_stub", bore + 30, out + 40)
    stub = s3d.at(stub, z=-40)
    cap = s3d.at(s3d.extrude("steamer_cap", s3d.polygon(5, cap_d), 44), z=out - 6)
    s3d.join(stub, cap)
    s3d.material(stub, "painted_metal", color=NYC["hydrant_green"], roughness=0.45)
    return s3d.group("steamer", stub)


if __name__ == "__main__":
    import sys
    s3d.export(hydrant(), sys.argv[1] if len(sys.argv) > 1 else "hydrant.glb")
