"""DSNY public recycling bin — Alder Heights asset 3/12 (street infrastructure).

Reference: NYC's public-space metal recycling bins: a green steel cabinet on
legs, ~1100 mm tall, flat top with shaped apertures (round for bottles/cans,
a slot for paper), white identity band on the front.

Front looks -Y. Millimetres.
"""
import sand3d as s3d
from _nyc import NYC, GAME


def recycling_bin():
    s3d.empty_scene()
    body = s3d.at(cabinet(), z=100)
    lid_p = s3d.at(lid(), z=960)
    legs = s3d.at(leg(), on=s3d.grid(2, 2, 500, 480), z=0)
    band = s3d.at(id_band(), y=-300, z=420)
    return s3d.assembly("recycling_bin", body, lid_p, legs, band)


def cabinet(w=620, d=600, h=880, wall=14):
    cab = s3d.box("cabinet", w, d, h)
    cab = s3d.shell(cab, wall, open="top")
    door = s3d.pocket(cab, s3d.rect(w - 120, h - 200), 6,
                      on=cab.face("-Y").move(y=h / 2))     # service door relief
    s3d.material(cab, "painted_metal", color=NYC["dsny_green"], roughness=0.55)
    return cab


def lid(w=640, d=620, h=45):
    top = s3d.box("lid", w, d, h)
    top = s3d.fillet(top, 8, edges="top")
    s3d.pocket(top, s3d.circle(170), h + 20, on=top.face("top").move(x=-160))
    s3d.pocket(top, s3d.circle(170), h + 20, on=top.face("top").move(x=160))
    s3d.pocket(top, s3d.slot(300, 120), h + 20, on=top.face("top").move(y=60))
    s3d.material(top, "painted_metal", color=NYC["dsny_green"], roughness=0.5)
    return top


def leg(w=70, d=70, h=100):
    leg = s3d.box("leg", w, d, h)
    s3d.material(leg, "painted_metal", color=NYC["dsny_green"], roughness=0.6)
    return leg


def id_band(w=560, t=14, h=170):
    """White identity band, penetrating the front wall by 7 mm (no flush faces)."""
    band = s3d.box("id_band", w, t, h)
    s3d.material(band, "plastic", color=GAME["cream"], roughness=0.6)
    return band


if __name__ == "__main__":
    import sys
    s3d.export(recycling_bin(), sys.argv[1] if len(sys.argv) > 1 else "recycling_bin.glb")
