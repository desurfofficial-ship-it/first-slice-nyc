"""Build every Alder Heights sand3d program into a GLB and QA-gate it.

Usage:
    venv-sand3d/bin/python tools3d/sandflow_eval/run_all.py [--only name1,name2]

Writes GLBs to web-three/public/models-experimental/sandflow/, prints one
REPORT line per asset, and writes validation/build-manifest.json.
Also runs the determinism check: two fresh-interpreter rebuilds of the
hydrant + washing_machine programs must be byte-identical (SHA-256).
"""
import hashlib
import importlib
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PROG = os.path.join(HERE, "programs")
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "web-three", "public", "models-experimental", "sandflow")
sys.path.insert(0, PROG)

ASSETS = [
    "hydrant", "dsny_basket", "recycling_bin", "park_bench", "streetlight",
    "newsrack", "apartment_door", "security_gate", "storefront",
    "washing_machine", "refrigerator", "bodega_shelf",
]
HEADS = {"dsny_basket": "basket", "park_bench": "bench"}


def scene_stats(root):
    """Walk the root's tree: meshes, tris, materials, joints, bbox (mm)."""
    import bpy
    from sand3d import _core, joints as J
    meshes, tris, mats = [], 0, set()
    nodes = 0
    stack, seen = [root], set()
    mins = [1e18] * 3
    maxs = [-1e18] * 3
    joints = []
    while stack:
        ob = stack.pop()
        if ob.as_pointer() in seen:
            continue
        seen.add(ob.as_pointer())
        nodes += 1
        stack.extend(ob.children)
        j = ob.get("s3d~joints")
        if j:
            for jv in json.loads(j):
                joints.append({"name": jv["name"], "kind": jv["kind"], "range": jv.get("range")})
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
    return {"nodes": nodes, "meshes": len(meshes), "mesh_names": sorted(meshes)[:24],
            "tris": tris, "materials": sorted(mats), "joints": joints, "bbox_mm": dims}


def build_one(name):
    import sand3d as s3d
    mod = importlib.import_module(name)
    head = getattr(mod, HEADS.get(name, name))
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
    print(f"REPORT OK asset={name} tris={rec['tris']} meshes={rec['meshes']} nodes={rec['nodes']} "
          f"mats={len(rec['materials'])} joints={len(rec['joints'])} "
          f"dims_mm={rec['bbox_mm']} bytes={rec['bytes']} t={rec['build_s']}s sha={rec['sha256']}")
    return rec


def determinism_check(names):
    """Two fresh interpreters rebuild the same program; digests must match."""
    results = {}
    for name in names:
        hashes = []
        for run in (1, 2):
            out = os.path.join(HERE, "validation", f"_determinism_{name}_{run}.glb")
            env = {**os.environ, "PYTHONPATH": PROG}
            done = subprocess.run([sys.executable, os.path.join(PROG, f"{name}.py"), out],
                                  env=env, capture_output=True, text=True, timeout=600)
            if done.returncode != 0:
                raise RuntimeError(f"{name} rebuild {run} failed:\n{done.stderr[-2000:]}")
            hashes.append(hashlib.sha256(open(out, "rb").read()).hexdigest())
            os.remove(out)
        results[name] = {"match": hashes[0] == hashes[1], "sha256": hashes[0][:16]}
        print(f"DETERMINISM {'OK' if results[name]['match'] else 'FAIL'} asset={name} sha={hashes[0][:16]}")
    return results


def main():
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1].split(",")
    names = [n for n in ASSETS if only is None or n in only]
    records = []
    for name in names:
        records.append(build_one(name))
    manifest_path = os.path.join(HERE, "validation", "build-manifest.json")
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    old = {}
    if os.path.exists(manifest_path) and only is None:
        old = {}
    data = {"sand3d_version": importlib.import_module("sand3d").__version__,
            "bpy": __import__("bpy").app.version_string, "assets": records}
    if not only:
        data["determinism"] = determinism_check(["hydrant", "washing_machine"])
    with open(manifest_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"MANIFEST {manifest_path}")


if __name__ == "__main__":
    main()
