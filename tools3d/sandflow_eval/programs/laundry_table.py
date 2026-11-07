"""Laundromat folding table — Alder Heights interiors.

Wears the two `LT_*` slots in LAUNDRY-INT (mid-room). 2400 long × 900 deep
× 850 tall: cream plywood top with a steel edge, folding legs with cross
braces, a detergent basket parked on the end. Authored in its final world
orientation (length along world X, depth along world Z, front north) so the
unyawed placeholder passes the footprint guard 1:1.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y (world north). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def laundry_table():
    s3d.empty_scene()
    top = s3d.at(s3d.box("table_top", 2400, 900, 45), z=805)
    s3d.material(top, "painted_metal", color=GAME["cream"], roughness=0.5)
    edge_f = s3d.at(s3d.box("edge_front", 2400, 26, 60), y=-437, z=795)
    edge_b = s3d.at(s3d.box("edge_back", 2400, 26, 60), y=437, z=795)
    for e in (edge_f, edge_b):
        s3d.material(e, "brushed_steel", roughness=0.35)
    parts = [top, edge_f, edge_b]
    for lx in (-1080, 1080):
        for ly in (-370, 370):
            leg = s3d.at(s3d.box(f"leg_{lx}_{ly}", 50, 50, 810), x=lx, y=ly, z=0)
            s3d.material(leg, "painted_metal", color=GAME["bldg"], roughness=0.55)
            parts.append(leg)
    brace_a = s3d.at(s3d.box("brace_a", 2160, 36, 36), z=230)
    brace_b = s3d.at(s3d.box("brace_b", 36, 700, 36), x=-1080, z=230)
    brace_c = s3d.at(s3d.box("brace_c", 36, 700, 36), x=1080, z=230)
    for b in (brace_a, brace_b, brace_c):
        s3d.material(b, "painted_metal", color=GAME["bldg"], roughness=0.55)
        parts.append(b)
    basket = s3d.at(s3d.box("detergent_basket", 340, 240, 180), x=-820, z=850)
    s3d.material(basket, "plastic", color=GAME["teal"], roughness=0.5)
    parts.append(basket)
    return s3d.assembly("laundry_table", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(laundry_table(), sys.argv[1] if len(sys.argv) > 1 else "laundry_table.glb")
