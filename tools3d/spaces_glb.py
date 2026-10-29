#!/usr/bin/env python3
"""
spaces_glb.py — text/image → .glb via FREE Hugging Face Spaces (no local GPU).

This sandbox (and most laptops) has no CUDA GPU, so we never run 3D neural
networks here. Instead this script drives the free, open-source demos of the
big open models — Microsoft TRELLIS and Tencent Hunyuan3D — hosted on
Hugging Face Spaces, using `gradio_client`. You send it the game's text
prompts and/or reference images; it queues the job on the hosted GPU, watches
it, and saves the resulting .glb mesh next to nothing else but your input.

Providers (tried in this order with --space auto):

    hunyuan3d          tencent/Hunyuan3D-2            /shape_generation (or /generation_all)
    hunyuan3d-21       tencent/Hunyuan3D-2.1          same
    hunyuan3d-mv       tencent/Hunyuan3D-2mv          same
    trellis-community  trellis-community/TRELLIS      /generate_and_extract_glb (one-shot)
    trellis-2          microsoft/TRELLIS.2            start_session → preprocess → image_to_3d → extract_glb

Text mode first paints a concept image with FLUX.1-schnell
(black-forest-labs/FLUX.1-schnell, /infer), then feeds that image to the
image→3D providers above.

Usage (from the repo root):

    # one prop, from a text prompt (concept image auto-generated first)
    python tools3d/spaces_glb.py --text "lowpoly yellow coffee cart with striped awning" --name cart

    # one prop, from a reference image (background is removed server-side)
    python tools3d/spaces_glb.py --image refs/hydrant.png --name hydrant

    # the whole game manifest (tools3d/spaces_manifest.json)
    python tools3d/spaces_glb.py --manifest tools3d/spaces_manifest.json

    # see what the Spaces actually expose right now (no GPU used)
    python tools3d/spaces_glb.py --probe

Every ZeroGPU Space above is free but shares a public GPU pool: anonymous
callers get a small per-IP quota. To get your own (still free) quota, export
HF_TOKEN=<a free token from huggingface.co/settings/tokens>.

Outputs (under --out-dir, default tools3d/out):

    <name>.glb            binary glTF — magic bytes verified before we call it done
    <name>.concept.png    the image actually fed to the 3D model
    <name>.preview.mp4    turntable preview, when the Space returns one
    <name>.meta.json      provenance: provider, endpoint, params, seed, timings, sizes

Honest note: meshes come from public research demos — expect to re-roll seeds,
and treat outputs as greybox-mesh candidates for art review, not final props.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    from gradio_client import Client, handle_file
except ImportError:  # pragma: no cover
    sys.exit("gradio_client is missing — run: pip install gradio_client")

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None


# ---------------------------------------------------------------- constants

TEXT2IMG_SPACE = "black-forest-labs/FLUX.1-schnell"

# (key, space id, human label) — image→3D, tried top-down in auto mode.
PROVIDERS = [
    ("hunyuan3d", "tencent/Hunyuan3D-2", "Hunyuan3D-2 (Tencent)"),
    ("hunyuan3d-21", "tencent/Hunyuan3D-2.1", "Hunyuan3D-2.1 (Tencent)"),
    ("hunyuan3d-mv", "tencent/Hunyuan3D-2mv", "Hunyuan3D-2mv (Tencent)"),
    ("trellis-community", "trellis-community/TRELLIS", "TRELLIS (community)"),
    ("trellis-2", "microsoft/TRELLIS.2", "TRELLIS.2 (Microsoft)"),
]
PROVIDER_IDS = {k: sid for k, sid, _ in PROVIDERS}

MODEL_EXTS = (".glb", ".gltf", ".obj", ".ply")
VIDEO_EXTS = (".mp4", ".webm")
IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp")

DEFAULT_OUT_DIR = "tools3d/out"
DEFAULT_MANIFEST = "tools3d/spaces_manifest.json"


# ---------------------------------------------------------------- small utils

def log(msg: str) -> None:
    stamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{stamp}] [spaces_glb] {msg}", flush=True)


def slugify(text: str, limit: int = 40) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return s[:limit] or "asset"


class SpaceError(RuntimeError):
    """A provider failed for a fixable-but-not-now reason."""


class QuotaError(SpaceError):
    """Anonymous/ZeroGPU quota exhausted — a token would help."""


def classify_error(exc: Exception) -> SpaceError:
    msg = str(exc)
    low = msg.lower()
    quota_markers = (
        "gpu quota", "exceeded your gpu", "quota exceeded", "reduce your usage",
        "too many requests", "429", "rate limit",
    )
    if any(m in low for m in quota_markers):
        return QuotaError(msg[:400])
    return SpaceError(msg[:400])


# ---------------------------------------------------------------- client glue

_CLIENTS: dict[str, Client] = {}
_API_INFO: dict[str, dict] = {}


def get_client(space_id: str, token: str | None) -> Client:
    if space_id in _CLIENTS:
        return _CLIENTS[space_id]
    tok = token or os.environ.get("HF_TOKEN") or None
    # download_files=False: keep raw FileData (with CDN .url) and download it
    # ourselves. Some server versions (e.g. gradio 4.44 Space backends) come
    # back with an empty/local-only file handle when the client auto-downloads.
    last_exc: Exception | None = None
    for attempt in range(2):  # one clean retry — Spaces restart
        try:
            c = Client(space_id, token=tok, verbose=False, analytics_enabled=False,
                       download_files=False)
            _CLIENTS[space_id] = c
            return c
        except TypeError:
            # older/newer gradio_client without one of those kwargs — retry plainer
            for kw in ({"token": tok, "verbose": False, "download_files": False},
                       {"token": tok, "verbose": False}):
                try:
                    c = Client(space_id, **kw)
                    _CLIENTS[space_id] = c
                    return c
                except TypeError:
                    continue
                except Exception as e:  # noqa: BLE001
                    last_exc = e
                    break
            if _CLIENTS.get(space_id):
                return _CLIENTS[space_id]
        except Exception as e:  # noqa: BLE001
            last_exc = e
            if attempt == 0:
                time.sleep(5)
    raise SpaceError(f"cannot connect to {space_id}: {last_exc}")


def api_info(client: Client) -> dict:
    sid = client.space_id if hasattr(client, "space_id") else id(client)
    if sid not in _API_INFO:
        _API_INFO[sid] = client.view_api(
            all_endpoints=True, print_info=False, return_format="dict"
        )
    return _API_INFO[sid]


def call_api(client: Client, api_name: str, wanted: dict,
             image_path: str | None, timeout: int) -> object:
    """Call api_name with only the params that endpoint actually accepts.

    If a required param (no default) is a file-like component we did not name,
    inject our image into it — that covers renames across Space versions.
    Raises SpaceError listing anything genuinely unfillable.
    """
    eps = api_info(client).get("named_endpoints", {})
    ep = eps.get(api_name)
    if ep is None:
        raise SpaceError(f"endpoint {api_name} not found; has {sorted(eps)}")
    params = ep.get("parameters", [])

    kw: dict = {}
    for p in params:
        name = p.get("parameter_name")
        if name in wanted:
            kw[name] = wanted[name]

    unfillable = []
    for p in params:
        name = p.get("parameter_name")
        if name in kw or p.get("parameter_has_default"):
            continue
        comp = p.get("component", "")
        if image_path and comp in ("Image", "File"):
            kw[name] = handle_file(image_path)
        elif image_path and comp == "Gallery":
            kw[name] = [handle_file(image_path)]
        else:
            unfillable.append(f"{name}({comp})")
    if unfillable:
        raise SpaceError(f"{api_name}: required params with no candidate value: {', '.join(unfillable)}")

    shown = {k: (type(v).__name__ if k == "image" else v) for k, v in kw.items()}
    log(f"  → {api_name}({shown})")

    t0 = time.time()
    job = client.submit(**kw, api_name=api_name)
    last_desc = None
    while True:
        st = job.status()
        state = getattr(st, "state", st)
        state_name = getattr(state, "name", str(state))
        pos = getattr(st, "queue_position", None)
        desc = state_name if pos is None else f"{state_name} (position {pos})"
        if desc != last_desc:
            log(f"    status: {desc} [{time.time() - t0:.0f}s]")
            last_desc = desc
        if time.time() - t0 > timeout:
            try:
                job.cancel()
            except Exception:  # noqa: BLE001
                pass
            raise SpaceError(f"{api_name} timed out after {timeout}s")
        if job.done():
            break
        time.sleep(3)
    res = job.result()
    log(f"    raw result: {type(res).__name__}: {repr(res)[:240]}")
    return res


# ---------------------------------------------------------------- harvesting

def _download(url: str) -> str | None:
    if requests is None:
        return None
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    out = Path("/tmp/spaces_glb_dl") / slugify(Path(url).name, 60)
    out.parent.mkdir(parents=True, exist_ok=True)
    suffix = Path(url.split("?")[0]).suffix or ".bin"
    out = out.with_suffix(suffix)
    out.write_bytes(r.content)
    return str(out)


def harvest_files(result: object) -> list[str]:
    """Walk an arbitrary gradio result; return local paths of every file-like leaf."""
    found: list[str] = []

    def visit(v: object) -> None:
        if v is None:
            return
        if isinstance(v, str):
            if v.startswith(("http://", "https://")):
                try:
                    p = _download(v)
                    if p:
                        found.append(p)
                except Exception as e:  # noqa: BLE001
                    log(f"    ! download failed for {v[:80]}: {e}")
            elif Path(v).suffix.lower() in (MODEL_EXTS + VIDEO_EXTS + IMAGE_EXTS) and os.path.exists(v):
                found.append(v)
        elif isinstance(v, (list, tuple)):
            for x in v:
                visit(x)
        elif isinstance(v, dict):
            visit(v.get("path"))
            visit(v.get("url"))
        else:
            visit(getattr(v, "path", None))
            visit(getattr(v, "url", None))

    visit(result)
    seen, uniq = set(), []
    for p in found:
        rp = os.path.realpath(p)
        if rp not in seen:
            seen.add(rp)
            uniq.append(p)
    return uniq


def pick_model(paths: list[str]) -> str | None:
    models = [p for p in paths if Path(p).suffix.lower() in MODEL_EXTS]
    if not models:
        return None
    models.sort(
        key=lambda p: (
            Path(p).suffix.lower() != ".glb",  # glb first
            Path(p).stat().st_size,            # then biggest (textured > untextured)
        ),
        reverse=True,
    )
    # stable: glb-first sort with reverse puts non-glb first — redo explicitly
    glbs = [p for p in models if Path(p).suffix.lower() == ".glb"]
    if glbs:
        return max(glbs, key=lambda p: Path(p).stat().st_size)
    return max(models, key=lambda p: Path(p).stat().st_size)


def pick_video(paths: list[str]) -> str | None:
    vids = [p for p in paths if Path(p).suffix.lower() in VIDEO_EXTS]
    return max(vids, key=lambda p: Path(p).stat().st_size) if vids else None


def verify_glb(path: Path) -> bool:
    try:
        with path.open("rb") as f:
            return f.read(4) == b"glTF"
    except OSError:
        return False


# ---------------------------------------------------------------- providers

def run_hunyuan(key: str, image_path: str, text: str | None, seed, textured: bool,
                steps: int, octree: int, timeout: int, token: str | None):
    space = PROVIDER_IDS[key]
    client = get_client(space, token)
    wanted: dict = {
        "image": handle_file(image_path),
        "steps": steps,
        "octree_resolution": octree,
        "check_box_rembg": True,
        "num_chunks": 8000,
    }
    if seed is not None:
        wanted["seed"] = int(seed)
        wanted["randomize_seed"] = False
    if text:
        wanted["caption"] = text
    api_name = "/generation_all" if textured else "/shape_generation"
    t0 = time.time()
    res = call_api(client, api_name, wanted, image_path=image_path, timeout=timeout)
    files = harvest_files(res)
    model = pick_model(files)
    if not model:
        raise SpaceError(f"{space} {api_name} returned no mesh file "
                         f"(raw result: {repr(res)[:200]}) (got {files})")
    return model, files, {"space": space, "endpoint": api_name,
                          "wall_seconds": round(time.time() - t0, 1)}


def run_trellis_community(key: str, image_path: str, seed, texture_size: int,
                          timeout: int, token: str | None):
    space = PROVIDER_IDS[key]
    client = get_client(space, token)
    wanted: dict = {
        "image": handle_file(image_path),
        "multiimages": [],
        "texture_size": texture_size,
        "mesh_simplify": 0.95,
    }
    if seed is not None:
        wanted["seed"] = int(seed)
    api_name = "/generate_and_extract_glb"
    t0 = time.time()
    try:
        res = call_api(client, api_name, wanted, image_path=image_path, timeout=timeout)
    except SpaceError as e:
        if "required params" in str(e):  # preproc/seed naming drift — try bare minimum
            res = call_api(client, api_name, {"image": handle_file(image_path)},
                           image_path=image_path, timeout=timeout)
        else:
            raise
    files = harvest_files(res)
    model = pick_model(files)
    if not model:
        raise SpaceError(f"{space} {api_name} returned no mesh file "
                         f"(raw result: {repr(res)[:200]}) (got {files})")
    return model, files, {"space": space, "endpoint": api_name,
                          "wall_seconds": round(time.time() - t0, 1)}


def run_trellis2(key: str, image_path: str, seed, texture_size: int, decimation: int,
                 timeout: int, token: str | None):
    space = PROVIDER_IDS[key]
    client = get_client(space, token)
    t0 = time.time()
    call_api(client, "/start_session", {}, image_path=None, timeout=60)
    # optional preprocess (background removal) — tolerate absence
    fed = image_path
    try:
        pre = call_api(client, "/preprocess_image", {"input": handle_file(image_path)},
                       image_path=image_path, timeout=timeout)
        pre_files = harvest_files(pre)
        imgs = [p for p in pre_files if Path(p).suffix.lower() in IMAGE_EXTS]
        if imgs:
            fed = max(imgs, key=lambda p: Path(p).stat().st_size)
    except SpaceError as e:
        log(f"    preprocess unavailable ({str(e)[:120]}) — feeding original image")
    wanted: dict = {"image": handle_file(fed)}
    if seed is not None:
        wanted["seed"] = int(seed)
    call_api(client, "/image_to_3d", wanted, image_path=fed, timeout=timeout)
    res = call_api(client, "/extract_glb",
                   {"texture_size": texture_size, "decimation_target": decimation},
                   image_path=fed, timeout=timeout)
    files = harvest_files(res)
    model = pick_model(files)
    if not model:
        raise SpaceError(f"{space} /extract_glb returned no mesh file "
                         f"(raw result: {repr(res)[:200]}) (got {files})")
    return model, files, {"space": space, "endpoint": "/image_to_3d+/extract_glb",
                          "preprocessed": fed != image_path,
                          "wall_seconds": round(time.time() - t0, 1)}


def run_provider(key: str, image_path: str, text: str | None, args) -> tuple[str, list, dict]:
    if key.startswith("hunyuan3d"):
        return run_hunyuan(key, image_path, text, args.seed, args.textured,
                           args.steps, args.octree, args.timeout, args.hf_token)
    if key == "trellis-community":
        return run_trellis_community(key, image_path, args.seed,
                                     args.texture_size, args.timeout, args.hf_token)
    if key == "trellis-2":
        return run_trellis2(key, image_path, args.seed, args.texture_size,
                            args.decimation, args.timeout, args.hf_token)
    raise SpaceError(f"unknown provider key: {key}")


# ---------------------------------------------------------------- text → image

def text_to_image(prompt: str, seed, timeout: int, token: str | None) -> tuple[str, object]:
    client = get_client(TEXT2IMG_SPACE, token)
    wanted: dict = {"prompt": prompt}
    if seed is not None:
        wanted["seed"] = int(seed)
        wanted["randomize_seed"] = False
    res = call_api(client, "/infer", wanted, image_path=None, timeout=timeout)
    files = harvest_files(res)
    imgs = [p for p in files if Path(p).suffix.lower() in IMAGE_EXTS]
    if not imgs:
        raise SpaceError(f"{TEXT2IMG_SPACE} returned no image (got {files})")
    img = max(imgs, key=lambda p: Path(p).stat().st_size)
    seed_used = None
    if isinstance(res, (list, tuple)) and len(res) > 1:
        s = res[1]
        if isinstance(s, (int, float)):
            seed_used = int(s)
    return img, seed_used


# ---------------------------------------------------------------- generation

def generate_one(entry: dict, args) -> dict:
    name = entry.get("name") or slugify(entry.get("text") or Path(entry.get("image", "asset")).stem)
    name = slugify(name)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    text = entry.get("text")
    image_src = entry.get("image")

    # 1. resolve the concept image that the 3D model will eat
    concept_path: str | None = None
    seed_used = None
    if image_src:
        concept_path = image_src
        if not Path(concept_path).exists():
            raise SpaceError(f"input image not found: {concept_path}")
    elif text:
        log(f"[{name}] text→image: {TEXT2IMG_SPACE} /infer")
        concept_path, seed_used = text_to_image(text, args.seed, args.timeout, args.hf_token)
        log(f"[{name}] concept image ready (seed_used={seed_used})")
    else:
        raise SpaceError("entry needs 'text' or 'image'")

    # 2. image → 3D, walking the provider chain
    chain = [entry["space"]] if entry.get("space") else (
        [args.space] if args.space != "auto" else [k for k, _, _ in PROVIDERS]
    )
    errors: list[str] = []
    for key in chain:
        label = dict((k, lbl) for k, _, lbl in PROVIDERS).get(key, key)
        log(f"[{name}] image→3D via {label} …")
        try:
            model_path, files, meta = run_provider(key, concept_path, text, args)
            break
        except QuotaError as e:
            errors.append(f"{key}: QUOTA: {e}")
            log(f"    quota/limit — moving on ({str(e)[:160]})")
        except SpaceError as e:
            errors.append(f"{key}: {e}")
            log(f"    failed — moving on ({str(e)[:160]})")
        except Exception as e:  # noqa: BLE001
            errors.append(f"{key}: {type(e).__name__}: {e}")
            log(f"    failed — moving on ({type(e).__name__}: {str(e)[:160]})")
    else:
        raise SpaceError("all providers failed → " + " | ".join(errors))

    # 3. save + verify
    ext = Path(model_path).suffix.lower()
    if ext not in MODEL_EXTS:
        raise SpaceError(f"provider produced {ext}, not a mesh: {model_path}")
    dst_glb = out_dir / f"{name}{ext}"
    shutil.copy(model_path, dst_glb)
    magic_ok = verify_glb(dst_glb) if ext == ".glb" else False

    concept_dst = out_dir / f"{name}.concept{Path(concept_path).suffix.lower()}"
    shutil.copy(concept_path, concept_dst)

    preview_dst = None
    video = pick_video(files)
    if video:
        preview_dst = out_dir / f"{name}.preview{Path(video).suffix.lower()}"
        shutil.copy(video, preview_dst)

    meta_out = {
        "name": name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": {"text": text, "image": image_src},
        "concept_image": str(concept_dst),
        "model": {"path": str(dst_glb), "bytes": dst_glb.stat().st_size,
                  "glTF_magic_ok": magic_ok if ext == ".glb" else None,
                  "ext": ext},
        "preview": str(preview_dst) if preview_dst else None,
        "provider": meta,
        "seed_requested": args.seed,
        "seed_used": seed_used,
        "hf_token_used": bool(args.hf_token or os.environ.get("HF_TOKEN")),
        "gradio_client": __import__("gradio_client").__version__,
        "provider_errors_before_success": errors,
        "all_returned_files": files,
    }
    meta_path = out_dir / f"{name}.meta.json"
    meta_path.write_text(json.dumps(meta_out, indent=2))

    size_mb = dst_glb.stat().st_size / 1e6
    ok_txt = "glTF magic OK" if (ext == ".glb" and magic_ok) else (f"{ext} (non-glb)" if ext != ".glb" else "MAGIC MISMATCH")
    log(f"[{name}] DONE  {dst_glb}  ({size_mb:.2f} MB, {ok_txt})  via {meta['provider']['space']}")
    return meta_out


# ---------------------------------------------------------------- probe

def cmd_probe(args) -> None:
    print(f"gradio_client {__import__('gradio_client').__version__} — probing Spaces (no GPU calls)\n")
    for key, space, label in PROVIDERS:
        print(f"== {key} — {space} ({label})")
        try:
            c = get_client(space, args.hf_token)
            eps = api_info(c).get("named_endpoints", {})
            interesting = [n for n in eps if any(
                w in n for w in ("generat", "shape", "texture", "preprocess", "extract", "image_to", "infer", "session"))]
            for n in sorted(interesting) or sorted(eps):
                ps = eps[n].get("parameters", [])
                parts = []
                for p in ps:
                    req = "" if p.get("parameter_has_default") else " REQUIRED"
                    dflt = (f" = {p.get('parameter_default')!r}"
                            if (p.get("parameter_has_default") and p.get("parameter_default") is not None) else "")
                    parts.append(f"{p.get('parameter_name')}:{p.get('component')}{dflt}{req}")
                rets = ",".join(r.get("component", "?") for r in eps[n].get("returns", []))
                print(f"   {n}({', '.join(parts)}) -> [{rets}]")
        except Exception as e:  # noqa: BLE001
            print(f"   UNAVAILABLE: {classify_error(e)}")
        print()
    print(f"== text→image — {TEXT2IMG_SPACE}")
    try:
        c = get_client(TEXT2IMG_SPACE, args.hf_token)
        eps = api_info(c).get("named_endpoints", {})
        for n, ep in sorted(eps.items()):
            parts = [f"{p.get('parameter_name')}:{p.get('component')}"
                     f"{'' if p.get('parameter_has_default') else ' REQUIRED'}" for p in ep.get("parameters", [])]
            print(f"   {n}({', '.join(parts)})")
    except Exception as e:  # noqa: BLE001
        print(f"   UNAVAILABLE: {classify_error(e)}")


# ---------------------------------------------------------------- main

def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description="Text/image → .glb via free Hugging Face Spaces (TRELLIS / Hunyuan3D). No local GPU.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("Usage (from the repo root):")[-1],
    )
    src = ap.add_mutually_exclusive_group()
    src.add_argument("--text", help="text prompt → concept image → 3D mesh")
    src.add_argument("--image", help="reference image → 3D mesh")
    src.add_argument("--manifest", help=f"batch JSON: {{\"entries\":[{{name,text,image,space}}...]}} (default {DEFAULT_MANIFEST})")
    ap.add_argument("--name", help="output basename (default: slug of prompt or image stem)")
    ap.add_argument("--out-dir", default=DEFAULT_OUT_DIR, help=f"output directory (default {DEFAULT_OUT_DIR})")
    ap.add_argument("--space", default="auto", choices=["auto"] + list(PROVIDER_IDS),
                    help="image→3D provider; auto walks the chain until one succeeds")
    ap.add_argument("--textured", action="store_true",
                    help="Hunyuan: use /generation_all (shape+texture) instead of /shape_generation")
    ap.add_argument("--steps", type=int, default=30, help="Hunyuan inference steps (5 ≈ turbo, default 30)")
    ap.add_argument("--octree", type=int, default=256, help="Hunyuan octree resolution (default 256)")
    ap.add_argument("--texture-size", type=int, default=1024, help="TRELLIS texture size (default 1024)")
    ap.add_argument("--decimation", type=int, default=300000, help="TRELLIS.2 decimation target (default 300000)")
    ap.add_argument("--seed", type=int, default=None, help="seed (default: provider default / randomized)")
    ap.add_argument("--hf-token", default=None, help="HF token (or export HF_TOKEN) — raises ZeroGPU quota")
    ap.add_argument("--timeout", type=int, default=900, help="per-call timeout seconds (default 900)")
    ap.add_argument("--probe", action="store_true", help="list Space endpoints + params, then exit (no GPU)")
    ap.add_argument("--verbose", action="store_true", help="no-op (logging is already verbose)")
    args = ap.parse_args(argv)

    if args.probe:
        cmd_probe(args)
        return 0

    entries: list[dict] = []
    if args.manifest or not (args.text or args.image):
        mpath = Path(args.manifest or DEFAULT_MANIFEST)
        if not mpath.exists():
            ap.error(f"--manifest {mpath} not found (or pass --text/--image)")
        data = json.loads(mpath.read_text())
        entries = data.get("entries", [])
        if not entries:
            ap.error(f"{mpath} has no entries")
    else:
        entries = [{"text": args.text, "image": args.image, "name": args.name,
                    "space": None if args.space == "auto" else args.space}]

    results, failures = [], []
    t0 = time.time()
    for i, entry in enumerate(entries, 1):
        e = dict(entry)
        e.setdefault("name", args.name)
        log(f"=== entry {i}/{len(entries)}: {e.get('name') or e.get('text', '')[:40]}")
        try:
            results.append(generate_one(e, args))
        except SpaceError as exc:
            failures.append((e.get("name", f"entry{i}"), str(exc)))
            log(f"!!! entry {e.get('name', i)} FAILED: {str(exc)[:300]}")
        except Exception as exc:  # noqa: BLE001
            failures.append((e.get("name", f"entry{i}"), f"{type(exc).__name__}: {exc}"))
            log(f"!!! entry {e.get('name', i)} FAILED: {type(exc).__name__}: {str(exc)[:300]}")

    dt = time.time() - t0
    log(f"finished in {dt:.0f}s — {len(results)} ok, {len(failures)} failed")
    for n, err in failures:
        log(f"  failed[{n}]: {err[:200]}")
    return 0 if not failures else 2


if __name__ == "__main__":
    sys.exit(main())
