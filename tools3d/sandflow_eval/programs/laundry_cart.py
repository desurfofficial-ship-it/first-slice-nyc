"""Laundromat rolling wire cart with a canvas bag — Alder Heights interiors.

Wears the `LCart` slot in LAUNDRY-INT. 600 × 450 × 880 with casters: chrome
tube frame, cream canvas bag full of folded towels, cross push handle.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y. Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def laundry_cart():
    s3d.empty_scene()
    parts = []
    for px in (-250, 250):
        for py in (-160, 160):
            caster = s3d.at(s3d.cylinder(f"caster_{px}_{py}", 55, 60), x=px, y=py, z=0)
            s3d.material(caster, "plastic", color=GAME["ink"], roughness=0.5)
            post = s3d.at(s3d.cylinder(f"post_{px}_{py}", 16, 780), x=px, y=py, z=60)
            s3d.material(post, "brushed_steel", roughness=0.3)
            parts.extend([caster, post])
    for name, py in (("rail_low_a", -160), ("rail_low_b", 160)):
        rail = s3d.at(s3d.box(name, 520, 20, 20), y=py, z=300)
        s3d.material(rail, "brushed_steel", roughness=0.3)
        parts.append(rail)
    for name, py in (("rail_side_a", -160), ("rail_side_b", 160)):
        rail = s3d.at(s3d.box(name, 24, 24, 60), y=py, z=780)
        s3d.material(rail, "brushed_steel", roughness=0.3)
        parts.append(rail)
    rail_w = s3d.at(s3d.box("rail_top_w", 540, 24, 24), y=-160, z=840)
    rail_e = s3d.at(s3d.box("rail_top_e", 540, 24, 24), y=160, z=840)
    for r in (rail_w, rail_e):
        s3d.material(r, "brushed_steel", roughness=0.3)
        parts.append(r)
    bag = s3d.at(s3d.box("canvas_bag", 470, 380, 480), z=130)
    s3d.material(bag, "fabric", color=GAME["cream"], roughness=0.8)
    fold_a = s3d.at(s3d.box("folds_a", 420, 330, 90), y=-10, z=560)
    fold_b = s3d.at(s3d.box("folds_b", 400, 310, 60), y=30, z=620)
    for f in (fold_a, fold_b):
        s3d.material(f, "fabric", color=GAME["stone"], roughness=0.85)
    handle = s3d.at(s3d.cylinder("push_handle", 20, 560), ry=90, z=850)
    s3d.material(handle, "brushed_steel", roughness=0.3)
    parts.extend([bag, fold_a, fold_b, handle])
    return s3d.assembly("laundry_cart", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(laundry_cart(), sys.argv[1] if len(sys.argv) > 1 else "laundry_cart.glb")
