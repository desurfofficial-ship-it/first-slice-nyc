# Sandflow / Sand3D — 02 Environment & Installation

**Verdict up front:** sand3d installed cleanly, in isolation, on the evaluation machine, and runs
headless with no GPU. Total setup ≈ 3 minutes. The only real trap is Python version selection
(`bpy` has **no wheel for Python 3.12**), documented below with the failure we actually hit.

## 1. The evaluation machine (documented as the build environment)

| Item | Value |
|---|---|
| OS | Debian GNU/Linux 13 (trixie), x86_64 |
| CPU | 2 cores |
| RAM | 4.1 GiB total |
| Disk | 9.9 GB rootfs, ~8.6 GB free at start |
| GPU | **none** (no VGA/3D device present) |
| Preinstalled Python | 3.12.16 (sandbox default venv) — **unusable for sand3d** |

A game-content machine is not required: sand3d is build-time tooling. Everything below ran in
this sandbox; nothing touched `web-three/` or its dependencies.

## 2. What we installed

```bash
# isolated venv, pinned CPython 3.13 (bpy 5.2 LTS line)
uv venv --python 3.13 /home/z/my-project/work/venv-sand3d
uv pip install --python /home/z/my-project/work/venv-sand3d/bin/python sand3d
```

Resulting environment (frozen copy at `tools3d/sandflow_eval/requirements-sand3d.txt`):

```
sand3d==1.6.3    bpy==5.2.3    numpy==2.5.4    (plus requests/certifi/… support libs)
```

* **Disk cost:** 962 MB (dominated by the `bpy` wheel, ~330 MB download / ~700 MB installed).
  No system Blender is installed — the `bpy` wheel *is* Blender.
* **Import cost:** `import bpy` ≈ 1.2 s; a sand3d program + GLB export runs in ~2–10 s per asset
  on 2 cores; Cycles CPU preview renders ≈ 20–60 s per 720 px frame (see 03-asset-pack.md §6).
* **RAM:** headless bpy peaks under ~1 GB for our asset sizes. 4 GiB machines are fine; CI
  containers need nothing special.
* **No GPU anywhere.** Cycles CPU renders previews; EEVEE/Workbench are unavailable headless
  without a GL context (this matches our own Blender experience and is why Phase 3 previews are
  Cycles).

## 3. The Python-version trap (hit for real, recorded so nobody retries it)

1. First attempt ran `uv pip install sand3d` with the sandbox's default Python **3.12** active.
   It "succeeded" — resolving `sand3d==1.6.3` with **no bpy** (the dependency markers in
   `pyproject.toml` only request bpy on 3.11/3.13), producing a sand3d that cannot build anything.
2. Fix: create the venv with `uv venv --python 3.13` and pass
   `--python …/venv-sand3d/bin/python` explicitly to `uv pip install` (uv ignores a half-set
   `VIRTUAL_ENV` in scripted contexts; the explicit interpreter flag is the reliable form).

Rules of thumb for any build machine:

* Python **3.13** → bpy 5.2 LTS (recommended, what we and sand3d's CI use) · Python **3.11** → bpy 4.5 LTS.
* Python 3.12: **do not attempt** — there is no wheel and sand3d will silently install without bpy.
* `uv` venvs ship without `pip`; use `uv pip install --python <venv>/bin/python` or
  `python -m ensurepip` if you need in-venv pip.
* Per sand3d's README, bpy 5.2 has no Intel-Mac wheels either; Windows x86_64 / Linux x86_64 /
  Apple Silicon are the supported targets (we verified Linux x86_64 only).

## 4. Isolation guarantees (against our non-negotiables)

| Constraint | Status |
|---|---|
| No pollution of game runtime deps | ✅ everything lives in `work/venv-sand3d`; `web-three/package.json` untouched; no npm changes of any kind |
| sand3d not a runtime dependency | ✅ game code never imports sand3d; the only product is `.glb` files under `web-three/public/models-experimental/sandflow/` (dev-only dir, not referenced by any shipped scene) |
| Blender deps isolated | ✅ none installed system-wide; the venv is disposable (`rm -rf` = uninstall) |
| Runs in a separate build environment | ✅ demonstrated: headless, 2 cores, 4 GiB, no GPU. A CI runner (GitHub Actions ubuntu-latest) can run the identical commands |
| Reproducible | ✅ `requirements-sand3d.txt` + `s3d.fingerprint()` per program + SHA-256 determinism check (03 §7) |

Rebuild-from-scratch recipe (any machine):

```bash
uv venv --python 3.13 .venv-sand3d
uv pip install --python .venv-sand3d/bin/python -r tools3d/sandflow_eval/requirements-sand3d.txt
.venv-sand3d/bin/python tools3d/sandflow_eval/programs/hydrant.py out/hydrant.glb
```

## 5. Where things live (evaluation layout)

```
tools3d/sandflow_eval/
├── programs/                 # 12 sand3d source programs (one file per asset) + _nyc.py palette
├── validation/               # validator script + JSON results + determinism hashes
├── requirements-sand3d.txt   # exact venv freeze
├── run_all.py                # builds every program → web-three/public/models-experimental/sandflow/*.glb
└── README.md                 # reproduction instructions
web-three/public/models-experimental/sandflow/   # generated GLBs (dev-only, isolated from production /public/models/)
```

Generated assets are **not** in `web-three/public/models/` (production) and the showcase that
loads them is URL-param-gated (see 04). Deleting `tools3d/sandflow_eval/` and
`public/models-experimental/` removes the experiment from the game entirely.
