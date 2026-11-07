# Sandflow / Sand3D — 06 Final Adoption Recommendation

**Recommendation: ADOPT FOR SELECTED ASSET CATEGORIES — as a build-time tool, guarded by the
workflow in 05, with an explicit do-not-adopt list.** Not "adopt immediately" (no production
integration is warranted yet), not "reject" (the evidence is strongly positive for a specific,
useful class of assets).

Confidence: **high** for hard-surface props — this is not a reading of the docs; 12 assets were
built, exported, validated, loaded into the game's engine, posed, measured, and screenshotted
in this evaluation. Lower confidence for everything we did not exercise (large-scale variation,
dataset mining, texture baking) — flagged below.

## The eight questions

**1. Is Sand3D genuinely useful for FIRST SLICE?**
Yes, in a narrow and well-defined way. It is a deterministic, CPU-only, headless procedural
modeling DSL that produces clean GLB with real-world scale, named hierarchy, and machine-readable
joint metadata. It cost ~6 build/fix cycles to reach 12/12 categories at 0.1–1.2 s build time
per asset. It is *not* a content generator (no AI, no datasets of game-ready assets) — usefulness
comes from programs we write and own.

**2. Which asset categories benefit most?**
Hard-surface, mechanical, dimension-driven props: street furniture (hydrants, baskets, bins,
benches, poles, newsracks), building hardware (doors, gates, grilles, storefront assemblies),
interior appliances and shelving. Especially: **variants and repeats** — the bodega needs 40
shelves and the avenue needs 60 hydrants; one program yields all of them, each rebuildable
bit-identically. Articulated props are a bonus: pivot+limits metadata out of the box.

**3. Which asset categories should remain manually modeled?**
Characters (Rosa, Idris, the player) — organic topology and rigging are outside the tool's
model. Anything texture-driven (bricks, posters, grime, signage art) beyond flat colors — no
UVs are generated. Foliage, food, debris, rubble. Stylized hero set pieces whose charm is
hand-crafted silhouette. The existing 141-GLB furniture pack (CC-BY-4.0, already licensed and
integrated) — do not churn it.

**4. Can it produce production-quality NYC environmental assets?**
Production-*adjacent*: yes for believable mid-poly props in FIRST SLICE's flat-color style —
the pack proves it (contact sheet; in-engine screenshots). Production-*final* as shipped
assets: with two caveats — draw-call economy requires the existing `mergeGltfParts` seam
(measured: 18 meshes/asset raw), and any texture ambition requires the optional Blender bake
pass. For this game's untextured Lambert look the first caveat is a one-line merge and the
second rarely applies.

**5. Can its output integrate reliably with our Three.js pipeline?**
Yes — measured, not assumed. Plain `GLTFLoader`, metres, Y-up, correct fronts (+Z), names
preserved, `s3d_joint` extras readable as `userData` and drivable in ~15 lines. `tsc --noEmit`
and 889/889 vitest tests stayed green. The only reliability caveat: joints are metadata, not
animation — motion code is ours (fits `interactionDefs.ts` patterns).

**6. What is the actual performance cost?**
Per pack: 82,462 tris / 1.8 MB / **zero textures** for 12 detailed assets. In-engine scene
with all 13 roots: 247,702 rendered tris, 701 draw calls raw (≈18 meshes per asset; ~4–8
after the repo's merge seam). Instanced reuse measured: 100 hydrants in **+21 draw calls**
(vs +402 cloned). Texture memory zero. These are comfortable numbers for the game's target
hardware; the only weak device metric is draw calls, with two known in-repo mitigations.

**7. Is it worth investing in a permanent asset-production workflow?**
Yes — at the scale of `tools3d/sandflow_eval/` promoted to `tools3d/sandflow/` with the 05
conventions (validation gate, approval gate, license records, determinism checks). The
investment is small (a venv, 12 template programs, one QA script) and the payoff —
proportion-accurate NYC variants on demand with reproducible provenance — is exactly what
Alder Heights needs as it densifies. Do **not** wire it into runtime or CI beyond the optional
asset-validation job; do not add it to `package.json`.

**8. What should we do next?**
1. Owner decision on this recommendation (this evaluation changed nothing in production).
2. If adopted: promote the eval tree to `tools3d/sandflow/`, ratify 05, and pick the first
   production target — suggested: a 10-variant hydrant/basket/bin "street kit" plus the
   apartment door, wired through the existing `upgradePropWithGLB` seam with AABB proxies.
3. Track two follow-up experiments before scaling: (a) `mergeGltfParts` pass on sand3d output
   (draw-call measurement), (b) one UV+bake pass in Blender for a single sign/grime asset.
4. Re-run the determinism check on any sand3d/bpy version bump.
5. Revisit dataset mining only as a separate, licensing-reviewed effort.

## Ranked decision

| rank | decision | scope |
|---|---|---|
| 1 | **Adopt for selected categories** | hard-surface street/building/interior props, build-time only, per 05 |
| 2 | Continue experimenting | merge seam, bake pass, variant kits, interaction wiring for joint extras |
| 3 | Do not adopt | characters/organics; texture-driven assets; HF dataset content (licensing + variance); any runtime dependency; replacing existing shipped assets |

## Acceptance gates (assignment §11) — final status

- [x] Actual source-code investigation completed (01; every claim classed implemented/demonstrated/claimed/unverified)
- [x] Isolated environment documented (02; uv venv, py3.13/bpy 5.2.3, 962 MB, CPU-only)
- [x] 12/12 representative assets generated — none blocked (03)
- [x] 5 articulation experiments across 4 assets (03 §4)
- [x] GLB exports tested (validator + re-parse; 0 degenerate tris, schema intact)
- [x] Models loaded inside the existing Three.js environment (`?showcase=sandflow`)
- [x] Geometry/material/texture integrity checked (`validation/glb-validation.json`)
- [x] Asset dimensions and performance recorded (`build-manifest.json`, `browser-measurements.json`)
- [x] Visual showcase created (dev-only, param-gated, seam-law-compliant; `tsc`+889 tests green)
- [x] Licensing risks documented (01 §4/Appendix A; 03 §8; 05 §3)
- [x] Reproducible workflow documented (02 §4; `tools3d/sandflow_eval/README.md`; 05)
- [x] Final adoption decision supported by evidence (this document)

**Final authority note honored:** nothing was merged; `main` is untouched. The evaluation
lives on branch `feat/sandflow-evaluation` as: six docs, 13 program files, 12 GLBs in
`public/models-experimental/`, one dev-only showcase module + `main.ts` hatch, one probe
script, and validation/renders. Deleting those paths reverts the game to its exact prior state.

**Status update 2026-11-07 (owner-authorized):** the branch is **pushed to the remote**
(`feat/sandflow-evaluation`, no force-push, no merge), and the owner-approved production
integration has landed on the same branch — 9 of 12 asset categories now wear their
counterparts in the world (13 swaps + 1 add), 3 deliberately retained; see
[07-production-integration.md](07-production-integration.md) for the replacement table,
measured performance and the verification gates (tsc clean · 889/889 · build OK ·
E2E 0 failures). Merging to `main` remains a separate, owner-gated decision.
