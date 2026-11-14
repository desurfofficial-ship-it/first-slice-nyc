#!/usr/bin/env python3
"""
tools3d/polyfork/extract_polyfork.py — the Polyfork NYC Kit extractor.

Turns the curated CC BY 4.0 GLBs in assets/packs/polyfork/glb/ into the
committed build-time data module web-three/src/world/polyforkData.ts, so
the kit's props ride the world's district bake (the slop-newyork port's
own law: static street pieces fuse into their district tile — the bake
files them for free) instead of paying runtime loader + draw costs.

Per asset the extractor:
  1. parses the glTF 2.0 GLB (plain, no Draco/meshopt — Polyfork CDN law),
  2. walks the default scene composing node world matrices (both the TRS
     and the 'matrix' encodings — the kit's vehicle wheels use matrices),
  3. drops nodes whose names match the EXCLUDE law (steam/smoke puffs —
     the world already owns steam; a frozen wisp would read as broken),
  4. reads POSITION + COLOR_0 per primitive (float32/vec3 here),
  5. asserts the Polyfork invariants that let the data stay small:
       - every mesh is FACE-SPLIT (pos count == 3 * face count, no shared
         verts)  → normals are recomputed at load (flat, correct),
       - indices are SEQUENTIAL (0,1,2,3,...)             → dropped,
       - every face's three vertex colors agree (flat)   → kept per-vertex,
  6. re-centers each asset: XZ centered on its bounding box, feet at y 0
     (the world's placement law — a prop is placed by its footprint),
    ap("  7. quantizes: positions to uint16 (per-asset scale), colors to")
    ap("     uint8 — and packs them base64 into the generated TS module.")

Deterministic: sorted asset ids, fixed rounding, no wall clock — a
rebuild is byte-identical (the sandflow_eval determinism precedent).

Usage:
    python3 tools3d/polyfork/extract_polyfork.py
"""
import base64
import json
import math
import os
import re
import struct
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GLB_DIR = os.path.join(REPO, "assets", "packs", "polyfork", "glb")
META_DIR = os.path.join(REPO, "assets", "packs", "polyfork", "meta")
OUT_TS = os.path.join(REPO, "web-three", "src", "world", "polyforkData.ts")

# The exclusion law: animated atmosphere nodes never bake as frozen blobs.
EXCLUDE_RE = re.compile(r"steam|smoke|puff|vapor|mist", re.IGNORECASE)

# Per-face color agreement epsilon (flat-shade assertion).
FLAT_EPS = 1e-3
POS_ROUND = 3   # decimals (1 mm)
COL_ROUND = 3   # decimals


# ----------------------------------------------------------------- glTF ----

def glb_chunks(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:4] != b"glTF":
        raise ValueError(f"{path}: not a GLB")
    jlen, _ = struct.unpack_from("<II", data, 12)
    j = json.loads(data[20:20 + jlen])
    off = 20 + jlen
    clen, ctype = struct.unpack_from("<II", data, off)
    assert ctype == 0x004E4942, f"{path}: missing BIN chunk"
    return j, data[off + 8: off + 8 + clen]


COMP = {5126: ("f", 4), 5123: ("H", 2), 5125: ("I", 4), 5121: ("B", 1)}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def read_accessor(j, bin_, idx):
    """Reads one accessor as a flat list of tuples (componentType-aware,
    normalized integers scaled to float)."""
    a = j["accessors"][idx]
    bv = j["bufferViews"][a["bufferView"]]
    code, size = COMP[a["componentType"]]
    ncomp = NCOMP[a["type"]]
    norm = a.get("normalized", False)
    start = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    out = []
    scale = 1.0 / 255.0 if norm else 1.0
    for i in range(a["count"]):
        vals = []
        for c in range(ncomp):
            o = start + (i * ncomp + c) * size
            v = struct.unpack_from("<" + code, bin_, o)[0]
            vals.append(v * scale if norm else v)
        out.append(vals)
    return out


def trs_matrix(n):
    """Node local matrix: 'matrix' key (column-major) or composed TRS."""
    if "matrix" in n:
        m = n["matrix"]  # column-major 16
        return [
            [m[0], m[4], m[8], m[12]],
            [m[1], m[5], m[9], m[13]],
            [m[2], m[6], m[10], m[14]],
        ]
    t = n.get("translation", [0, 0, 0])
    r = n.get("rotation", [0, 0, 0, 1])  # xyzw quat
    s = n.get("scale", [1, 1, 1])
    x, y, z, w = r
    # rotation matrix (unit quat)
    rm = [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]
    return [
        [rm[0][0] * s[0], rm[0][1] * s[1], rm[0][2] * s[2], t[0]],
        [rm[1][0] * s[0], rm[1][1] * s[1], rm[1][2] * s[2], t[1]],
        [rm[2][0] * s[0], rm[2][1] * s[1], rm[2][2] * s[2], t[2]],
    ]


def matmul(a, b):
    """a * b (both 3x4, acting on column vectors)."""
    out = [[0.0] * 4 for _ in range(3)]
    for i in range(3):
        for j in range(3):
            out[i][j] = sum(a[i][k] * b[k][j] for k in range(3))
        out[i][3] = sum(a[i][k] * b[k][3] for k in range(3)) + a[i][3]
    return out


def xform(m, p):
    return [
        m[0][0] * p[0] + m[0][1] * p[1] + m[0][2] * p[2] + m[0][3],
        m[1][0] * p[0] + m[1][1] * p[1] + m[1][2] * p[2] + m[1][3],
        m[2][0] * p[0] + m[2][1] * p[1] + m[2][2] * p[2] + m[2][3],
    ]


# -------------------------------------------------------------- extract ----

def extract_asset(glb_path):
    j, bin_ = glb_chunks(glb_path)
    scene = j["scenes"][j.get("scene", 0)]

    tris = []  # (ax,ay,az, bx,by,bz, cx,cy,cz, r,g,b) flat per-face color

    def visit(node_idx, parent):
        n = j["nodes"][node_idx]
        m = matmul(parent, trs_matrix(n))
        name = n.get("name", "")
        if EXCLUDE_RE.search(name):
            return  # the exclusion law
        if "mesh" in n:
            mesh = j["meshes"][n["mesh"]]
            for prim in mesh["primitives"]:
                assert "COLOR_0" in prim["attributes"], (
                    f"{glb_path}: primitive without COLOR_0")
                pos = read_accessor(j, bin_, prim["attributes"]["POSITION"])
                col = read_accessor(j, bin_, prim["attributes"]["COLOR_0"])
                # the invariants that keep the module small (asserted, not
                # assumed — a kit update that breaks them stops the build)
                idx_acc = prim.get("indices")
                if idx_acc is not None:
                    idxs = [v[0] for v in read_accessor(j, bin_, idx_acc)]
                    assert idxs == list(range(len(idxs))), (
                        f"{glb_path}: non-sequential indices")
                nface = len(pos) // 3
                assert len(pos) == nface * 3
                assert len(pos) == len(col), (
                    f"{glb_path}: COLOR_0 count mismatch")
                for f in range(nface):
                    i0, i1, i2 = f * 3, f * 3 + 1, f * 3 + 2
                    c0, c1, c2 = col[i0], col[i1], col[i2]
                    for k in range(3):
                        assert abs(c0[k] - c1[k]) < FLAT_EPS and \
                            abs(c0[k] - c2[k]) < FLAT_EPS, (
                            f"{glb_path}: non-flat face color at face {f}")
                    a = xform(m, pos[i0])
                    b = xform(m, pos[i1])
                    c = xform(m, pos[i2])
                    tris.append((*a, *b, *c, c0[0], c0[1], c0[2]))
        for ch in n.get("children", []):
            visit(ch, m)

    identity = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]]
    for root in scene["nodes"]:
        visit(root, identity)

    if not tris:
        raise ValueError(f"{glb_path}: no triangles extracted")

    # re-center: XZ bbox center → origin, feet (min y) → 0
    xs = [t[i] for t in tris for i in (0, 3, 6)]
    ys = [t[i] for t in tris for i in (1, 4, 7)]
    zs = [t[i] for t in tris for i in (2, 5, 8)]
    cx, cz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    y0 = min(ys)
    out = []
    for t in tris:
        rec = []
        for vi in range(3):
            rec.extend([
                round(t[vi * 3 + 0] - cx, POS_ROUND),
                round(t[vi * 3 + 1] - y0, POS_ROUND),
                round(t[vi * 3 + 2] - cz, POS_ROUND),
            ])
        # the face's ONE flat color (asserted above) — the loader expands
        # it to the three vertices when building the BufferGeometry
        rec.extend([round(t[9], COL_ROUND), round(t[10], COL_ROUND), round(t[11], COL_ROUND)])
        out.append(rec)

    bbox = {
        "x": round(max(xs) - min(xs), 3), "y": round(max(ys) - y0, 3),
        "z": round(max(zs) - min(zs), 3),
    }
    return out, bbox


def f32le_b64(floats):
    return base64.b64encode(struct.pack(f"<{len(floats)}f", *floats)).decode("ascii")


def u16le_b64(ints):
    return base64.b64encode(struct.pack(f"<{len(ints)}H", *ints)).decode("ascii")


def u8_b64(ints):
    return base64.b64encode(bytes(ints)).decode("ascii")


def main():
    ids = sorted(fn[:-4] for fn in os.listdir(GLB_DIR) if fn.endswith(".glb"))
    assets = {}
    total_tris = 0
    for aid in ids:
        meta_path = os.path.join(META_DIR, f"meta-{aid}.json")
        with open(meta_path) as f:
            meta = json.load(f)
        tris, bbox = extract_asset(os.path.join(GLB_DIR, f"{aid}.glb"))
        flat = []
        for t in tris:
            flat.extend(t)
        assert meta["id"] == aid, f"{aid}: meta id mismatch"
        # per-tri split FIRST (each record is 9 pos floats then 3 col
        # floats — a flat slice would interleave colors into positions),
        # then pos: 9/tri, col: 3/tri (the face's flat color; the loader
        # expands it per vertex)
        posf: list[float] = []
        colf: list[float] = []
        for rec in tris:
            posf.extend(rec[:9])
            colf.extend(rec[9:12])
        assert len(posf) == len(tris) * 9 and len(colf) == len(tris) * 3
        # the payload law (AGENTS §1c.6): quantize before committing —
        # positions to uint16 (per-asset scale, ~0.1 mm at the kit's 8 m
        # span), colors to uint8 (the glTF ubyte-norm convention; the flat
        # fills lose nothing at 1/255). ~2.3× smaller than float32.
        mx = max(abs(v) for v in posf) or 1.0
        scale = round(mx / 32767.0, 8)
        posq = [max(0, min(65535, round(v / scale) + 32768)) for v in posf]
        colq = [max(0, min(255, round(v * 255.0))) for v in colf]
        assets[aid] = {
            "nTri": len(tris),
            "scale": scale,
            "pos": u16le_b64(posq),
            "col": u8_b64(colq),
            "bbox": bbox,
            "title": meta["title"],
            "credit": meta["credit"],
            "source": "https://polyfork.dev/kit/nyc-city-kit-fbca88",
            "hasNight": bool(meta.get("has_night", False)),
        }
        total_tris += len(tris)
        print(f"  {aid:36s} {len(tris):5d} tris  bbox {bbox['x']:5.2f} x {bbox['y']:5.2f} x {bbox['z']:5.2f}")

    lines = []
    ap = lines.append
    ap("/**")
    ap(" * GENERATED FILE — tools3d/polyfork/extract_polyfork.py — do not edit.")
    ap(" *")
    ap(" * The Polyfork NYC City Kit (https://polyfork.dev/kit/nyc-city-kit-fbca88),")
    ap(" * extracted from the curated CC BY 4.0 GLBs in assets/packs/polyfork/glb/")
    ap(" * into per-tri flat-color vertex data the district bake fuses for free.")
    ap(" *")
    ap(" * Extraction laws (asserted per asset at extraction time):")
    ap(" *  - face-split meshes, sequential indices dropped, per-vertex COLOR_0")
    ap(" *    kept (flat per face) — normals are recomputed flat at load,")
    ap(" *  - atmosphere nodes (steam/smoke puffs) excluded — the world owns steam,")
    ap(" *  - each asset re-centered: XZ bbox center at the origin, feet at y 0,")
    ap(" *  - positions quantized uint16 (per-asset scale ~0.1 mm), colors uint8 —")
    ap(" *")
    ap(" * Licence: each part's mesh is CC BY 4.0 (Polyfork) — the `credit` field")
    ap(" * travels in the data below and THIRD-PARTY-NOTICES.md carries the notice.")
    ap(" */")
    ap("")
    ap("export interface PolyforkAsset {")
    ap("  readonly nTri: number;")
    ap("  /** position decode scale: v = (u16 - 32768) * scale. */")
    ap("  readonly scale: number;")
    ap("  /** base64 little-endian uint16: 9 per tri (3 verts × xyz). */")
    ap("  readonly pos: string;")
    ap("  /** base64 uint8: 3 per tri (the face's flat rgb, 0-255). */")
    ap("  readonly col: string;")
    ap("  readonly bbox: { x: number; y: number; z: number };")
    ap("  readonly title: string;")
    ap("  readonly credit: string;")
    ap("  readonly source: string;")
    ap("  readonly hasNight: boolean;")
    ap("}")
    ap("")
    ap("export const POLYFORK_DATA: Readonly<Record<string, PolyforkAsset>> = {")
    for aid, a in assets.items():
        ap(f"  '{aid}': {{")
        ap(f"    nTri: {a['nTri']},")
        ap(f"    scale: {a['scale']},")
        ap(f"    pos: '{a['pos']}',")
        ap(f"    col: '{a['col']}',")
        ap(f"    bbox: {{ x: {a['bbox']['x']}, y: {a['bbox']['y']}, z: {a['bbox']['z']} }},")
        ap(f"    title: {json.dumps(a['title'])},")
        ap(f"    credit: {json.dumps(a['credit'])},")
        ap(f"    source: '{a['source']}',")
        ap(f"    hasNight: {str(a['hasNight']).lower()},")
        ap("  },")
    ap("};")
    ap("")
    ap("/** The kit's asset ids, sorted (probe + test convenience). */")
    ap("export const POLYFORK_IDS: readonly string[] =")
    ap("  Object.keys(POLYFORK_DATA).sort();")
    ap("")

    os.makedirs(os.path.dirname(OUT_TS), exist_ok=True)
    with open(OUT_TS, "w") as f:
        f.write("\n".join(lines))
    kb = os.path.getsize(OUT_TS) // 1024
    print(f"wrote {OUT_TS} ({kb} KB, {len(assets)} assets, {total_tris} tris)")


if __name__ == "__main__":
    sys.exit(main())
