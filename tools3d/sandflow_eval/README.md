# tools3d/sandflow_eval — Sandflow/sand3D evaluation workspace

Build-time-only evaluation of the sand3d procedural pipeline for FIRST SLICE
(see `docs/production/sandflow/` for the six evaluation documents).

## Reproduce everything

```bash
# 1. isolated venv (Python 3.13 → bpy 5.2 LTS; ~962 MB, CPU-only, no GPU needed)
uv venv --python 3.13 .venv-sand3d
uv pip install --python .venv-sand3d/bin/python -r tools3d/sandflow_eval/requirements-sand3d.txt
# (adds ~pygltflib for validation: uv pip install --python .venv-sand3d/bin/python pygltflib)

# 2. build all 12 assets → web-three/public/models-experimental/sandflow/*.glb
#    prints a REPORT line per asset and a DETERMINISM check (2 fresh processes, SHA-256)
.venv-sand3d/bin/python tools3d/sandflow_eval/run_all.py

# 3. validate the GLBs (structure, joints-in-extras, degenerate tris, UVs, dims)
.venv-sand3d/bin/python tools3d/sandflow_eval/validate_glb.py

# 4. studio previews (Cycles CPU) → tools3d/sandflow_eval/renders/
.venv-sand3d/bin/python tools3d/sandflow_eval/render_previews.py

# 5. in-engine showcase (dev-only, never part of the normal game)
cd web-three && npm install && npx vite            # then open:
#   http://localhost:5173/?showcase=sandflow

# 6. automated browser probe (measurements + screenshots → web-three/shots/)
cd web-three && npx playwright install chromium && node scripts/probe-sandflow.mjs
```

## Layout

```
programs/           12 asset programs + _nyc.py palette (the source of truth)
run_all.py          batch builder + QA gate + determinism check
validate_glb.py     GLB structural validator (pygltflib, pure python matrices)
render_previews.py  Cycles CPU studio renders
validation/         build-manifest.json · glb-validation.json · browser-measurements.json
renders/            contact_sheet.png + per-asset renders + in-engine screenshots
requirements-sand3d.txt   exact venv freeze (sand3d 1.6.3, bpy 5.2.3)
```

## Hard rules

* The GLBs under `web-three/public/models-experimental/` are **experimental staging** — never
  referenced by shipped scenes and never copied into `public/models/` without the approval
  gate in `docs/production/sandflow/05-production-workflow.md`.
* The game must keep working with this directory and the venv deleted.
* `washing_machine.py` is adapted from Sandflow's Apache-2.0 example — keep its notice.
