#!/usr/bin/env python3
"""Strip the sparse token stock from bodega_shelf.glb — the in-engine restock.

Why (2026-11 bodega quality pass):
  The gondola program dressed its own bay with ~4 items per level (one color
  per level, big gaps) — in the store the three/four units read as shelves of
  scattered stubs, and the wall behind carried a legacy grid of loose boxes to
  compensate. The store now stocks the gondolas procedurally in World.ts
  (shelf-aware runs, facings, per-color merged draws), so the file keeps only
  the FRAME: base deck, kick, back panel, uprights, four boards, five rails.

What is removed:
  - the `stock` group node and every node under it (can_row_* / box_row_* /
    bottle_*), the meshes only those nodes carry, and any material left
    unreferenced by the kept nodes.
  - accessors/bufferViews/binary stay (unused ranges are legal glTF; the BIN
    chunk is left untouched so every kept accessor keeps its byte offset).

Pure stdlib (json/struct) — the postprocess_glb.py pattern. Idempotent: a
file with no `stock` group passes through unchanged. Usage:
  python3 strip_bodega_stock.py <path-to-bodega_shelf.glb>
"""
import json
import struct
import sys
from pathlib import Path


def read_glb(data: bytes):
    magic, version, length = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67, "not a GLB"
    jlen, jtype = struct.unpack_from("<II", data, 12)
    gltf = json.loads(data[20:20 + jlen].decode("utf-8"))
    off = 20 + jlen
    blen, btype = struct.unpack_from("<II", data, off)
    bin_chunk = data[off + 8:off + 8 + blen]
    return gltf, bin_chunk


def write_glb(gltf: dict, bin_chunk: bytes) -> bytes:
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    if len(js) % 4:
        js += b" " * (4 - len(js) % 4)
    if bin_chunk:
        if len(bin_chunk) % 4:
            bin_chunk += b"\x00" * (4 - len(bin_chunk) % 4)
        total = 12 + 8 + len(js) + 8 + len(bin_chunk)
        return (struct.pack("<III", 0x46546C67, 2, total)
                + struct.pack("<II", len(js), 0x4E4F534A) + js
                + struct.pack("<II", len(bin_chunk), 0x004E4942) + bin_chunk)
    total = 12 + 8 + len(js)
    return struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(js), 0x4E4F534A) + js


def strip(gltf: dict) -> dict:
    nodes = gltf.get("nodes", [])
    names = [n.get("name", "") for n in nodes]
    stock_group = next((i for i, nm in enumerate(names) if nm == "stock"), None)
    if stock_group is None:
        print("no `stock` group — already stripped, nothing to do")
        return {"removed_nodes": 0, "removed_meshes": 0, "removed_materials": 0}

    # collect the stock subtree (the group is flat: its children are the
    # 42 item leaves; walk defensively anyway)
    doomed = set()
    stack = [stock_group]
    while stack:
        idx = stack.pop()
        if idx in doomed:
            continue
        doomed.add(idx)
        stack.extend(nodes[idx].get("children", []))

    # meshes only the doomed nodes carry
    doomed_meshes = set()
    for i in doomed:
        m = nodes[i].get("mesh")
        if m is not None:
            doomed_meshes.add(m)
    kept_mesh_users = set()
    for i, n in enumerate(nodes):
        if i in doomed or i == stock_group:
            continue
        if n.get("mesh") is not None:
            kept_mesh_users.add(n["mesh"])
    doomed_meshes -= kept_mesh_users

    # materials unreferenced by the kept meshes
    kept_meshes = [m for mi, m in enumerate(gltf.get("meshes", [])) if mi not in doomed_meshes]
    used_mats = set()
    for m in kept_meshes:
        for p in m.get("primitives", []):
            if p.get("material") is not None:
                used_mats.add(p["material"])
    all_mats = set(range(len(gltf.get("materials", []))))
    doomed_mats = sorted(all_mats - used_mats)

    # index remaps for nodes and meshes (kept entries keep relative order)
    keep_nodes = [i for i in range(len(nodes)) if i not in doomed]
    node_map = {old: new for new, old in enumerate(keep_nodes)}
    keep_meshes = [i for i in range(len(gltf.get("meshes", []))) if i not in doomed_meshes]
    mesh_map = {old: new for new, old in enumerate(keep_meshes)}

    new_nodes = []
    for old in keep_nodes:
        n = dict(nodes[old])
        if "children" in n:
            kids = [c for c in n["children"] if c in node_map]
            if kids:
                n["children"] = [node_map[c] for c in kids]
            else:
                del n["children"]
        if "mesh" in n:
            n["mesh"] = mesh_map[n["mesh"]]
        new_nodes.append(n)
    gltf["nodes"] = new_nodes
    gltf["meshes"] = [gltf["meshes"][old] for old in keep_meshes]
    gltf["materials"] = [m for mi, m in enumerate(gltf.get("materials", [])) if mi not in set(doomed_mats)]
    for sc in gltf.get("scenes", []):
        sc["nodes"] = [node_map[r] for r in sc.get("nodes", []) if r in node_map]
    return {"removed_nodes": len(doomed), "removed_meshes": len(doomed_meshes),
            "removed_materials": len(doomed_mats)}


def main() -> None:
    path = Path(sys.argv[1])
    gltf, bin_chunk = read_glb(path.read_bytes())
    rep = strip(gltf)
    out = path.with_suffix(".stripped.glb")
    out.write_bytes(write_glb(gltf, bin_chunk))
    # validate the rewrite before it replaces the shipped file: reparse and
    # confirm the scene still walks and no node references a dead index
    check, _ = read_glb(out.read_bytes())
    assert len(check["nodes"]) == len(gltf["nodes"])
    root = check["scenes"][0]["nodes"]
    assert all(0 <= r < len(check["nodes"]) for r in root)
    names = [n.get("name", "") for n in check["nodes"]]
    assert not any(nm.startswith(("can_row", "box_row", "bottle")) or nm == "stock" for nm in names)
    print(f"report: removed {rep['removed_nodes']} nodes, {rep['removed_meshes']} meshes, "
          f"{rep['removed_materials']} materials → kept {len(check['nodes'])} nodes, "
          f"{len(check['meshes'])} meshes, {len(check['materials'])} materials")
    out.replace(path)
    print(f"OK {path}")


if __name__ == "__main__":
    main()
