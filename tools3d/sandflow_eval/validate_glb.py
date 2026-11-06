"""Validate the exported GLBs: structure, joints-in-extras, materials, UVs, geometry.

Reads web-three/public/models-experimental/sandflow/*.glb (plus the game's own
production hydrant.glb as a comparison baseline) with pygltflib and writes
validation/glb-validation.json + a markdown table.

Checks per file:
  - scene/node tree depth, mesh count, primitive count
  - triangle/vertex counts, degenerate triangle count (zero-area)
  - material count, alpha mode, extensions used
  - TEXCOORD/COLOR/TANGENT attribute coverage (sand3d claims: none)
  - animation clip count (sand3d exports none; joints are node extras)
  - `s3d_joint` extras payload per node (name/type/axis/lower/upper/value)
  - Y-up metres: bbox extents and that min Y ≈ 0 (assets sit on the ground)
"""
import json
import os
import struct
import sys

from pygltflib import GLTF2

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))
GEN = os.path.join(REPO, "web-three", "public", "models-experimental", "sandflow")
BASELINE = os.path.join(REPO, "web-three", "public", "models", "hydrant.glb")

ASSETS = ["hydrant", "dsny_basket", "recycling_bin", "park_bench", "streetlight",
          "newsrack", "apartment_door", "security_gate", "storefront",
          "washing_machine", "refrigerator", "bodega_shelf"]


def read_position_minmax(gltf, prim):
    acc = gltf.accessors[prim.attributes.POSITION]
    return acc.min, acc.max


def count_prims(gltf):
    tris = verts = 0
    for mesh in gltf.meshes:
        for prim in mesh.primitives:
            if prim.mode is not None and prim.mode != 4:
                continue
            pos_acc = gltf.accessors[prim.attributes.POSITION]
            verts += pos_acc.count
            if prim.indices is not None:
                tris += gltf.accessors[prim.indices].count // 3
            else:
                tris += pos_acc.count // 3
    return tris, verts


def degenerate_tris(gltf):
    """Zero-area triangles, computed from the POSITION buffers directly."""
    total = 0
    import math
    for mesh in gltf.meshes:
        for prim in mesh.primitives:
            if prim.indices is None:
                continue
            pos_acc = gltf.accessors[prim.attributes.POSITION]
            buf_view = gltf.bufferViews[pos_acc.bufferView]
            buf = gltf.bufferViews[0].byteOffset or 0  # we only rely on relative reads below
            data = gltf.binary_blob()
            offset = buf_view.byteOffset + pos_acc.byteOffset
            stride = pos_acc.bufferView and gltf.bufferViews[pos_acc.bufferView].byteStride or 12
            idx_acc = gltf.accessors[prim.indices]
            idx_view = gltf.bufferViews[idx_acc.bufferView]
            idx_off = idx_view.byteOffset + idx_acc.byteOffset
            comp = {5121: "B", 5123: "H", 5125: "I"}[idx_acc.componentType]
            isize = struct.calcsize(comp)
            idxs = [struct.unpack_from(f"<{comp}", data, idx_off + i * isize)[0]
                    for i in range(idx_acc.count)]

            def pos(i):
                return struct.unpack_from("<3f", data, offset + i * stride)

            for t in range(0, len(idxs) - 2, 3):
                a, b, c = pos(idxs[t]), pos(idxs[t + 1]), pos(idxs[t + 2])
                ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
                vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
                cx, cy, cz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
                if 0.5 * math.sqrt(cx * cx + cy * cy + cz * cz) < 1e-7:
                    total += 1
    return total


def node_report(gltf):
    joints = []
    depth_max = 0

    def walk(node, depth):
        nonlocal depth_max
        depth_max = max(depth_max, depth)
        if node.extras and "s3d_joint" in node.extras:
            joints.append({"node": node.name, **node.extras["s3d_joint"]})
        for child in node.children or []:
            walk(gltf.nodes[child], depth + 1)

    for scene in gltf.scenes:
        for root_idx in scene.nodes:
            walk(gltf.nodes[root_idx], 0)
    return joints, depth_max


def validate(path):
    gltf = GLTF2().load(path)
    tris, verts = count_prims(gltf)
    joints, depth = node_report(gltf)
    mats = []
    for m in gltf.materials:
        pbr = m.pbrMetallicRoughness
        mats.append({
            "name": m.name,
            "alphaMode": m.alphaMode,
            "extensions": sorted((m.extensions or {}).keys()),
        })
    exts = sorted((gltf.extensionsUsed or []))
    def attr_names(p):
        a = p.attributes
        return {k for k in ("TEXCOORD_0", "COLOR_0", "TANGENT", "NORMAL")
                if getattr(a, k, None) is not None}

    all_attrs = set()
    for mesh in gltf.meshes:
        for p in mesh.primitives:
            all_attrs |= attr_names(p)
    uv = "TEXCOORD_0" in all_attrs
    color = "COLOR_0" in all_attrs
    # global bbox in metres (Y-up), from accessor min/max (local) — good enough
    # because sand3d bakes placements into the node tree; use scene-level instead:
    import math
    gmin = [1e9] * 3
    gmax = [-1e9] * 3

    def walk(node, mat):
        if node.mesh is not None:
            for prim in gltf.meshes[node.mesh].primitives:
                mn, mx = read_position_minmax(gltf, prim)
                for a in range(3):
                    gmin[a] = min(gmin[a], mn[a])
                    gmax[a] = max(gmax[a], mx[a])
        for c in node.children or []:
            walk(gltf.nodes[c], mat)

    # compose node transforms (pure python 4x4)
    def mat_mul(a, b):
        return [[sum(a[r][k] * b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]

    def xform(m, p):
        return [m[r][0] * p[0] + m[r][1] * p[1] + m[r][2] * p[2] + m[r][3] for r in range(3)]

    def node_mat(node):
        if node.matrix:
            return [list(row) for row in node.matrix]
        t = node.translation or [0.0, 0.0, 0.0]
        q = node.rotation or [0.0, 0.0, 0.0, 1.0]
        s = node.scale or [1.0, 1.0, 1.0]
        x, y, z, w = q
        rot = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
               [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
               [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]
        m = [[rot[r][c] * s[c] for c in range(3)] + [0.0] for r in range(3)]
        m = [m[0] + [t[0]], m[1] + [t[1]], m[2] + [t[2]], [0.0, 0.0, 0.0, 1.0]]
        return m

    def compose(node, parent):
        m = mat_mul(parent, node_mat(node))
        if node.mesh is not None:
            for prim in gltf.meshes[node.mesh].primitives:
                mn, mx = read_position_minmax(gltf, prim)
                for corner in range(8):
                    p = [mn[a] if (corner >> a) & 1 == 0 else mx[a] for a in range(3)]
                    w = xform(m, p)
                    for a in range(3):
                        gmin[a] = min(gmin[a], w[a])
                        gmax[a] = max(gmax[a], w[a])
        for c in node.children or []:
            compose(gltf.nodes[c], m)

    for scene in gltf.scenes:
        for root_idx in scene.nodes:
            compose(gltf.nodes[root_idx], [[1 if i == j else 0 for j in range(4)] for i in range(4)])

    size = [round(gmax[a] - gmin[a], 3) for a in range(3)]
    return {
        "file": os.path.basename(path),
        "bytes": os.path.getsize(path),
        "nodes": len(gltf.nodes), "meshes": len(gltf.meshes),
        "tris": tris, "verts": verts,
        "degenerate_tris": degenerate_tris(gltf),
        "materials": mats, "material_count": len(mats),
        "extensionsUsed": exts,
        "has_TEXCOORD_0": uv, "has_COLOR_0": color,
        "animations": len(gltf.animations),
        "node_depth": depth,
        "joints_in_extras": joints,
        "bbox_m_Yup": {"min": [round(v, 3) for v in gmin],
                        "max": [round(v, 3) for v in gmax], "size": size},
        "sits_on_ground": abs(gmin[1]) < 0.005,
    }


def main():
    results = {}
    for name in ASSETS + (["__baseline_hydrant"] if os.path.exists(BASELINE) else []):
        path = os.path.join(GEN, f"{name}.glb") if not name.startswith("__") else BASELINE
        if not os.path.exists(path):
            results[name] = {"error": f"missing {path}"}
            continue
        results[name] = validate(path)
        r = results[name]
        print(f"VALIDATE {name}: tris={r['tris']} meshes={r['meshes']} mats={r['material_count']} "
              f"uv={r['has_TEXCOORD_0']} anims={r['animations']} joints={len(r['joints_in_extras'])} "
              f"degenerate={r['degenerate_tris']} size_m={r['bbox_m_Yup']['size']} ground={r['sits_on_ground']}")
    out = os.path.join(HERE, "validation", "glb-validation.json")
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    print(f"WROTE {out}")


if __name__ == "__main__":
    main()
