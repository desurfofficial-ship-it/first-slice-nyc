"""gen_furniture.py — rebuild the 10-piece warm-pastel Scandinavian starter set.

Run:  blender -b -P gen_furniture.py -- --out BUILD_DIR [--res 1024] [--samples 96]
Produces: models/*.glb, previews/*.png, manifest.json, REPORT lines per piece.
"""
import sys, os, json, argparse, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lowpoly_lib as lp
from furn_builders_a import build_sofa, build_bed, build_dining_set
from furn_builders_b import build_bookshelf, build_desk, build_wardrobe
from furn_builders_c import build_coffee_table, build_floor_lamp, build_stool, build_potted_plant

PALETTE = {
    "cream":         {"hex": "#F5EFE6", "rough": 0.90},
    "off_white":     {"hex": "#EDE7DC", "rough": 0.50},
    "sage":          {"hex": "#9CAF88", "rough": 0.90},
    "terracotta":    {"hex": "#C77B5A", "rough": 0.70},
    "walnut":        {"hex": "#6E4B3A", "rough": 0.55},
    "warm_gray":     {"hex": "#C8BFB2", "rough": 0.60},
    "charcoal":      {"hex": "#4B4A47", "rough": 0.40},
    "soft_black":    {"hex": "#2D2B28", "rough": 0.40},
    "dusty_rose":    {"hex": "#D9A69A", "rough": 0.90},
    "mustard":       {"hex": "#D2A659", "rough": 0.90},
    "foliage_light": {"hex": "#7FA36F", "rough": 0.80},
    "foliage_dark":  {"hex": "#567C4E", "rough": 0.80},
    "warm_white":    {"hex": "#FFF4E0", "rough": 0.40},
}


def M(key, rough=None):
    """Palette material factory; roughness override creates a distinct cached material."""
    p = PALETTE[key]
    r = round(p["rough"] if rough is None else rough, 2)
    return lp.make_material(f"mat_{key}_{int(round(r * 100)):02d}", p["hex"], r)


# name, builder, tri budget, expected bbox (W, D, H), max materials
PIECES = [
    ("sofa",         build_sofa,         (700, 1500), (2.10, 0.92, 0.80), 6),
    ("bed",          build_bed,          (600, 1200), (1.66, 2.10, 0.95), 6),
    ("dining_set",   build_dining_set,   (450, 1500), (1.50, 1.27, 0.88), 6),
    ("bookshelf",    build_bookshelf,    (700, 1500), (0.86, 0.31, 1.90), 6),
    ("desk",         build_desk,         (350, 800),  (1.30, 0.65, 0.84), 6),
    ("wardrobe",     build_wardrobe,     (280, 700),  (1.26, 0.64, 2.03), 6),
    ("coffee_table", build_coffee_table, (350, 750),  (1.00, 0.60, 0.54), 6),
    ("floor_lamp",   build_floor_lamp,   (200, 600),  (0.42, 0.42, 1.55), 4),
    ("stool",        build_stool,        (250, 600),  (0.36, 0.36, 0.47), 4),
    ("potted_plant", build_potted_plant, (500, 1200), (0.79, 0.79, 1.45), 6),
]


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--res", type=int, default=1024)
    ap.add_argument("--samples", type=int, default=96)
    ap.add_argument("--pieces", default="", help="comma list; empty = all")
    args = ap.parse_args(argv)
    only = [s.strip() for s in args.pieces.split(",") if s.strip()]

    out = os.path.abspath(args.out)
    os.makedirs(os.path.join(out, "models"), exist_ok=True)
    os.makedirs(os.path.join(out, "previews"), exist_ok=True)

    manifest, failures = [], []
    t0 = time.time()
    for name, fn, budget, dims, maxmats in PIECES:
        if only and name not in only:
            continue
        lp.reset_scene()
        lp._MAT_CACHE.clear()
        try:
            parts = fn(M)
            obj = lp.finalize(parts, name, smooth_angle=40)
            rep = lp.validate(obj, tri_budget=budget, expect_dims=dims,
                              max_materials=maxmats)
            glb = os.path.join(out, "models", f"{name}.glb")
            size = lp.export_glb(obj, glb)
            lp.setup_studio()
            lp.setup_camera([obj], lens=65, direction=(1.0, -1.0, 0.55),
                            res=(args.res, args.res))
            png = os.path.join(out, "previews", f"{name}.png")
            lp.render(png, res=(args.res, args.res), samples=args.samples,
                      exposure=-1.3)
            lp.report(name, rep["tris"], rep["dims"], glb)
            manifest.append({
                "name": name, "tris": rep["tris"], "dims_m": rep["dims"],
                "file": os.path.relpath(glb, out), "bytes": size,
                "preview": os.path.relpath(png, out),
            })
        except Exception as exc:  # keep the batch alive, report loud
            failures.append(name)
            print(f"REPORT FAIL piece={name} error={exc}", flush=True)
    dt = time.time() - t0
    mpath = os.path.join(out, "manifest.json")
    merged = {}
    if os.path.exists(mpath):  # per-piece reruns must not clobber other entries
        try:
            with open(mpath) as f:
                for e in json.load(f).get("pieces", []):
                    merged[e["name"]] = e
        except Exception:
            pass
    for e in manifest:
        merged[e["name"]] = e
    for name, fn, budget, dims, maxmats in PIECES:
        if name in merged:
            continue
        merged[name] = {"name": name, "tris": None, "dims_m": None,
                        "file": f"models/{name}.glb", "bytes": None,
                        "preview": f"previews/{name}.png", "missing": True}
    entries = [merged[p[0]] for p in PIECES if p[0] in merged]
    with open(mpath, "w") as f:
        json.dump({"set": "warm-pastel-scandinavian-starter-10",
                   "unit": "meter", "format": "glb", "pieces": entries,
                   "generated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                   "build_seconds": round(dt, 1)}, f, indent=2)
    print(f"SUMMARY ok={len(manifest)} failed={len(failures)} "
          f"failed_names={failures} seconds={dt:.1f}", flush=True)


if __name__ == "__main__":
    main()
