"""NYC cobra-head streetlight — Alder Heights asset 5/12 (street infrastructure).

Reference: NYC's post-1950s major-street standard — a tapered steel pole
(~8.5 m to the luminaire) with a rising mast arm and a flat cobra-head
luminaire; graphite/dark bronze paint, base collar with bolt cover and
hand-hole. The lens is emissive so the showcase can light it at dusk.

Arm extends +X. Millimetres.
"""
import sand3d as s3d
from _nyc import NYC, GAME


def streetlight():
    s3d.empty_scene()
    base_p = s3d.at(base(), z=0)
    pole_p = s3d.at(pole(), z=170)
    handhole_p = s3d.at(handhole(), y=-72, z=620)
    arm = s3d.at(mast_arm(), z=0)
    head = s3d.at(luminaire(), on=s3d.local(pole_p, 2280, 0, 8010, ry=90))
    return s3d.assembly("streetlight", base_p, pole_p, handhole_p, arm, head)


def base(pad_d=340, pad_h=90):
    pad = s3d.cylinder("base_pad", pad_d, pad_h)
    pad = s3d.fillet(pad, 8, edges="top")
    collar = s3d.at(s3d.cone("base_collar", 280, 130, d2=190), z=pad_h - 6)
    bolts = s3d.at(s3d.cylinder("base_bolt", 32, 18), on=s3d.ring(4, 138), z=pad_h - 2)
    s3d.material(pad, "painted_metal", color=NYC["graphite"], roughness=0.55)
    s3d.material(collar, "painted_metal", color=NYC["graphite"], roughness=0.55)
    s3d.material(bolts, "painted_metal", color=NYC["graphite"], roughness=0.5)
    return s3d.group("base", pad, collar, bolts)


def pole(h=7800):
    shaft = s3d.loft("pole_shaft",
                     s3d.station(z=0, w=150, d=150, n=2),
                     s3d.station(z=h / 2, w=131, d=131, n=2),
                     s3d.station(z=h, w=112, d=112, n=2))
    s3d.material(shaft, "painted_metal", color=NYC["graphite"], roughness=0.5)
    return shaft


def handhole(w=56, t=18, h=190):
    plate = s3d.box("handhole", w, t, h)
    s3d.material(plate, "painted_metal", color=NYC["graphite"], roughness=0.6)
    return plate


def mast_arm(d=100):
    arm = s3d.wire("mast_arm",
                   [(0, 0, 7640), (200, 0, 7910), (650, 0, 8100),
                    (1450, 0, 8200), (2300, 0, 8220)],
                   d, fillet=350)
    s3d.material(arm, "painted_metal", color=NYC["graphite"], roughness=0.5)
    return arm


def luminaire(l=430):
    """Cobra head: a tapered superellipse loft + emissive lens on its underside.
    Built along +Z (0..l); the head frame in the head turns it along +X."""
    shell = s3d.loft("luminaire_shell",
                     s3d.station(z=0, w=680, d=180, n=3),
                     s3d.station(z=l * 0.4, w=600, d=165, n=3),
                     s3d.station(z=l * 0.77, w=420, d=140, n=3),
                     s3d.station(z=l, w=220, d=110, n=3))
    lens = s3d.at(s3d.extrude("lens", s3d.superellipse(600, 130, n=3), 16), z=-14)
    nub = s3d.at(s3d.cylinder("photocell", 62, 52), z=l - 10)
    s3d.material(shell, "painted_metal", color=NYC["graphite"], roughness=0.5)
    s3d.material(lens, "light", color=GAME["cream"])
    s3d.material(nub, "painted_metal", color=NYC["graphite"], roughness=0.5)
    return s3d.group("luminaire", shell, lens, nub)


if __name__ == "__main__":
    import sys
    s3d.export(streetlight(), sys.argv[1] if len(sys.argv) > 1 else "streetlight.glb")
