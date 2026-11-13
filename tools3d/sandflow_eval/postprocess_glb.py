#!/usr/bin/env python3
"""Post-process the sand3d evaluation GLBs for FIRST SLICE's render law.

Why (docs/production/sandflow/07 §optimization):
  - the game fuses every flat, untextured, UNMETALLIC part of a GLB prop
    into ONE vertex-colored draw (web-three/src/world/vertexFuse.ts, the
    B13 law). sand3d's `painted_metal` / `brass` / `aluminium` presets
    emit metallicFactor=1 and KHR_materials_clearcoat, which bail the
    fusion — a 12-part hydrant would draw 4 times forever.
  - this pass makes every material flat (metallicFactor 0, clearcoat
    stripped). Geometry, hierarchy, pivots and `s3d_joint` node extras
    are untouched — articulation metadata survives byte-for-byte.
  - apartment_door: the leaf slab recolors to the game's canon teal
    (#2a9d8f, PAL.teal) so the Day-2 "teal door across the street" reads.
    Frame/hardware keep their prewar colors.

Pure stdlib (json/struct) — no new dependencies. Usage:
  python3 postprocess_glb.py <in_dir> <out_dir>
"""
import json
import struct
import sys
from pathlib import Path

def srgb_to_linear(u8: int) -> float:
    c = u8 / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


# glTF baseColorFactor is LINEAR — compare and write in linear space.
TEAL = (*(srgb_to_linear(v) for v in (0x2A, 0x9D, 0x8F)), 1.0)
PREWAR_DOOR = (*(srgb_to_linear(v) for v in (0x7A, 0x3B, 0x2E)),)


def read_glb(data: bytes):
    magic, version, length = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67, "not a GLB"
    jlen, jtype = struct.unpack_from("<II", data, 12)
    gltf = json.loads(data[20:20 + jlen].decode("utf-8"))
    off = 20 + jlen
    blen, btype = struct.unpack_from("<II", data, off)
    # slice the BIN chunk PAYLOAD only (the 8-byte chunk header stays behind —
    # write_glb emits a fresh one; keeping it here shifts every bufferView +8
    # and silently corrupts all geometry)
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


def process(gltf: dict, name: str) -> dict:
    report = {"file": name, "materials": 0, "clearcoat_stripped": 0, "metallic_zeroed": 0, "recolored": None}
    for mat in gltf.get("materials", []):
        report["materials"] += 1
        exts = mat.get("extensions", {})
        if "KHR_materials_clearcoat" in exts:
            del exts["KHR_materials_clearcoat"]
            report["clearcoat_stripped"] += 1
            if not exts:
                del mat["extensions"]
        pbr = mat.setdefault("pbrMetallicRoughness", {})
        if pbr.get("metallicFactor", 1.0) != 0.0:
            pbr["metallicFactor"] = 0.0
            report["metallic_zeroed"] += 1
        # the fuse law refuses back-face materials (DoubleSide) — sand3d's
        # presets mark everything doubleSided; solid hard-surface props read
        # identically single-sided in the Lambert world
        if mat.get("doubleSided", False):
            mat["doubleSided"] = False
            report["single_sided"] = report.get("single_sided", 0) + 1
        if name == "apartment_door.glb":
            c = pbr.get("baseColorFactor", [1, 1, 1, 1])
            if all(abs(a - b) < 0.01 for a, b in zip(c[:3], PREWAR_DOOR)):
                pbr["baseColorFactor"] = list(TEAL)
                report["recolored"] = mat.get("name", "?")
    exts_used = gltf.get("extensionsUsed", [])
    gltf["extensionsUsed"] = [e for e in exts_used if e != "KHR_materials_clearcoat"]
    if not gltf["extensionsUsed"]:
        del gltf["extensionsUsed"]
    gltf.pop("extensionsRequired", None)
    return report


def main() -> None:
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for f in sorted(src.glob("*.glb")):
        if f.stem == "__baseline_hydrant":
            continue
        gltf, bin_chunk = read_glb(f.read_bytes())
        joints_before = json.dumps(
            [n.get("extras") for n in gltf.get("nodes", []) if n.get("extras")], sort_keys=True)
        rep = process(gltf, f.name)
        joints_after = json.dumps(
            [n.get("extras") for n in gltf.get("nodes", []) if n.get("extras")], sort_keys=True)
        assert joints_before == joints_after, f"{f.name}: node extras changed!"
        (dst / f.name).write_bytes(write_glb(gltf, bin_chunk))
        print(f"{f.name:<24} mats={rep['materials']:<3} clearcoat-{rep['clearcoat_stripped']} "
              f"metal0={rep['metallic_zeroed']:<3} recolor={rep['recolored']} extras=OK")


if __name__ == "__main__":
    main()
