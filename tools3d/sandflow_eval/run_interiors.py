"""Build the interiors asset pack (docs/production/interiors/) into GLBs.

Usage:
    venv-sand3d/bin/python tools3d/sandflow_eval/run_interiors.py [--only name1,name2]

Writes GLBs to web-three/public/models-experimental/interiors/, prints one
REPORT line per asset, and writes validation/interiors-manifest.json.
Every material ships flat (the postprocess pass strips metallic before the
files reach public/models/ — see postprocess_glb.py), so each prop fuses to
ONE vertex-colored draw in the engine.
"""
import hashlib
import importlib
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PROG = os.path.join(HERE, "programs")
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "web-three", "public", "models-experimental", "interiors")
sys.path.insert(0, PROG)

ASSETS = [
    # laundry
    "laundry_dryer", "laundry_cart", "laundry_table", "detergent_shelf",
    "linen_bin", "vending_machine",
    # barber
    "barber_chair", "barber_counter_unit", "cash_register",
    # pizza
    "drink_cooler", "pizza_oven", "pizza_prep_counter", "menu_board",
    # bakery
    "bakery_oven", "bread_rack", "bakery_display_case", "bakery_back_shelf",
    # records
    "record_bin", "record_speaker", "record_wall_shelf",
    # hall
    "folding_chairs_stack", "hall_kitchenette", "hall_storage_shelf",
    # diner
    "diner_kitchen_line", "diner_register",
    # shared + bodega
    "coffee_machine", "produce_crate", "microwave_oven",
    # cecil
    "cecil_kitchenette", "apartment_toilet", "apartment_sink",
    "apartment_radiator",
]


def scene_stats(root):
    """Walk the root's tree: meshes, tris, materials, bbox (mm)."""
    import bpy
    from sand3d import _core
    meshes, tris, mats = [], 0, set()
    stack, seen = [root], set()
    mins = [1e18] * 3
    maxs = [-1e18] * 3
    while stack:
        ob = stack.pop()
        if ob.as_pointer() in seen:
            continue
        seen.add(ob.as_pointer())
        stack.extend(ob.children)
        if ob.type != "MESH":
            continue
        me = ob.data
        me.calc_loop_triangles()
        meshes.append(_core.given_name(ob))
        tris += len(me.loop_triangles)
        for m in me.materials:
            if m is not None:
                mats.add(m.name)
        mw = _core.world(ob)
        for v in me.vertices:
            co = mw @ v.co
            for a in range(3):
                mins[a] = min(mins[a], co[a])
                maxs[a] = max(maxs[a], co[a])
    dims = [round(maxs[a] - mins[a], 1) for a in range(3)]
    return {"meshes": len(meshes), "tris": tris, "materials": sorted(mats), "bbox_mm": dims}


def build_one(name):
    import sand3d as s3d
    mod = importlib.import_module(name)
    head = getattr(mod, name)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{name}.glb")
    t0 = time.time()
    root = head()
    s3d.export(root, path)
    dt = time.time() - t0
    root_ob = root.root if hasattr(root, "root") else root
    stats = scene_stats(root_ob)
    sha = hashlib.sha256(open(path, "rb").read()).hexdigest()
    rec = {"name": name, "file": os.path.relpath(path, REPO), "bytes": os.path.getsize(path),
           "build_s": round(dt, 2), "sha256": sha[:16], **stats}
    print(f"REPORT OK asset={name} tris={rec['tris']} meshes={rec['meshes']} "
          f"mats={len(rec['materials'])} dims_mm={rec['bbox_mm']} bytes={rec['bytes']} "
          f"t={rec['build_s']}s sha={rec['sha256']}")
    return rec


def main():
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1].split(",")
    names = [n for n in ASSETS if only is None or n in only]
    records = []
    for name in names:
        records.append(build_one(name))
    manifest_path = os.path.join(HERE, "validation", "interiors-manifest.json")
    # an --only run MERGES into the existing manifest — a partial rebuild
    # must never erase the records of the assets it did not touch
    merged = []
    if only:
        old_path = manifest_path
        if os.path.exists(old_path):
            with open(old_path) as f:
                old = {a["name"]: a for a in json.load(f).get("assets", [])}
            rebuilt = {r["name"] for r in records}
            merged = [old[n] for n in old if n not in rebuilt]
    data = {"sand3d_version": importlib.import_module("sand3d").__version__,
            "bpy": __import__("bpy").app.version_string,
            "assets": merged + records}
    with open(manifest_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"MANIFEST {manifest_path} ({len(data['assets'])} assets)")


if __name__ == "__main__":
    main()
