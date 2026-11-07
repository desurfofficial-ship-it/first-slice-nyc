"""Storefront security gate (double-swing scissor grille) — asset 8/12.

Reference: NYC storefront security: either a roll-down accordion or a hinged
scissor grille. We model the **double-swing scissor grille** (~2.4 × 2.2 m
opening): crossing diagonal straps forming diamonds between vertical U-channels,
top and bottom track, pull posts with hasp. Articulated: two revolute joints
(`gate_leaf_left` on the original leaf, mirrored onto the twin automatically by
`transform(copy, mirror="x")`), opening outward (toward -Y), 0–95°.

Millimetres.
"""
import sand3d as s3d
from _nyc import NYC

LEAF_W = 1170
LEAF_H = 2160


def security_gate():
    s3d.empty_scene()
    jamb_l = s3d.at(jamb(), x=-1260, z=0)
    jamb_r = s3d.transform(s3d.copy(jamb_l), mirror="x")
    track_t = s3d.at(track(), z=2160)
    track_b = s3d.at(track(60), z=0)
    wall = s3d.at(wall_band(), y=120, z=0)
    hinge = s3d.local(jamb_l, 60, 0, 30)
    leaf = s3d.at(gate_leaf(), on=hinge)
    s3d.joint("gate_leaf_left", leaf, hinge, axis="-Z", range=(0, 95))
    twin = s3d.transform(s3d.copy(leaf), mirror="x")
    return s3d.assembly("security_gate", jamb_l, jamb_r, track_t, track_b, wall, leaf, twin)


def jamb(w=120, d=140, h=2300):
    post = s3d.box("jamb", w, d, h)
    s3d.material(post, "painted_metal", color=NYC["grille_grey"], roughness=0.55)
    return post


def track(h=100, d=140):
    rail = s3d.box("track", 2 * LEAF_W + 2 * 60, d, h)
    s3d.material(rail, "painted_metal", color=NYC["grille_grey"], roughness=0.55)
    return rail


def wall_band(t=26, h=2360):
    band = s3d.box("wall_band", 2 * LEAF_W + 2 * 120 + 120, t, h)
    s3d.material(band, "plastic", color=NYC["stucco"], roughness=0.85)
    return band


def zigzag(name, phase=0, w=LEAF_W, rise=300, t=10, top=None):
    """One diagonal strap band: full-width diagonals bouncing between the jambs,
    drawn as a stroke in (x=width, y=height) and extruded thin. `phase` flips
    which corner a diagonal starts from, so two bands cross into diamonds."""
    top = (LEAF_H - 90) if top is None else top
    n = int(top // rise) + 1
    pts = []
    for k in range(n + 1):
        y = min(k * rise, top)
        x = 0.0 if (k + phase) % 2 == 0 else float(w)
        pts.append((x, y))
    return s3d.extrude(name, s3d.stroke(pts, t), 8)


def gate_leaf(channels=7, pitch=180):
    chan = s3d.at(s3d.box("channel", 50, 26, LEAF_H - 30),
                  on=s3d.grid(channels, 1, pitch, 0), x=LEAF_W / 2, z=30)
    rail_t = s3d.at(s3d.box("rail_top", LEAF_W, 26, 70), x=LEAF_W / 2, z=LEAF_H - 80)
    rail_b = s3d.at(s3d.box("rail_bottom", LEAF_W, 26, 70), x=LEAF_W / 2, z=40)
    lat_a = s3d.at(zigzag("lattice_a", phase=0), rx=90, y=4, z=90)
    lat_b = s3d.at(zigzag("lattice_b", phase=1), rx=90, y=6, z=90)
    post = s3d.at(s3d.box("pull_post", 64, 60, 1700), x=LEAF_W - 70, y=-6, z=250)
    hasp = s3d.at(s3d.torus("hasp", 90, 16), x=LEAF_W - 70, z=1100)
    s3d.material([chan, rail_t, rail_b, lat_a, lat_b, post, hasp],
                 "painted_metal", color=NYC["grille_grey"], roughness=0.55)
    return s3d.group("gate_leaf", chan, rail_t, rail_b, lat_a, lat_b, post, hasp)


if __name__ == "__main__":
    import sys
    s3d.export(security_gate(), sys.argv[1] if len(sys.argv) > 1 else "security_gate.glb")
