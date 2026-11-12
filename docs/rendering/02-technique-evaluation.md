# Shader technique evaluation — the 3D Game Shaders for Beginners map

Reference: <https://github.com/lettier/3d-game-shaders-for-beginners>
(David Lettier). License check (repo README "License" section, verified
2026-11-12): *"The included license applies only to the software portion of
3D Game Shaders For Beginners—specifically the `.cxx`, `.vert`, and `.frag`
source code files. No other portion of 3D Game Shaders For Beginners has been
licensed for use."* (© 2019 David Lettier).

**Consequence for this wave:** we implement the *mathematics* independently.
No `.frag`/`.vert`/`.cxx` text is copied, no documentation text or images are
reused, and THIRD-PARTY-NOTICES.md gains no new entry for the reference. The
heavy lifting that IS third-party code comes from three.js's own
`examples/jsm` addons (MIT, already a dependency — no new notice required).

Each technique below: how it works (the math), how the reference demonstrates
it, and the wave verdict — **implement / adapt / defer** — for a Lambert +
vertex-bake, draw-call-budgeted WebGL2 city.

## Fundamentals used throughout

- **Render to texture**: FBOs → three's `WebGLRenderTarget`. EffectComposer
  chains them. Adopted (pipeline below), HalfFloatType (HDR) targets so
  emissive > 1.0 survives to the bloom threshold.
- **Gamma/tonemapping**: work linear; convert once at the end. three r152+
  does this natively (linear targets, `OutputPass` applies
  `renderer.toneMapping` + sRGB; tone mapping is canvas-only in
  `WebGLPrograms`, so RenderPass output stays linear-HDR). Adopted
  verbatim — `NeutralToneMapping` stays the curve.
- **LUT color grading**: sample a 3D LUT texture by color. **Adapted, not
  implemented as a LUT**: a per-time-of-day parameterized grade
  (shadow lift / gain tint / saturation / temperature) inside one shader
  costs nothing and needs no 3D-texture sampler; a real LUTPass is
  overkill for six keyframe states. The reference's *idea* (grade the
  frame in a final pass, in a controlled space) is kept.

## Texturing / lighting

- **Blinn-Phong**: N·L diffuse + (N·H)^shininess specular. three's Lambert
  (per-fragment since r155) already supplies the diffuse half; the sun gives
  a Phong-family highlight only where we opt in (ground slabs via
  MeshPhongMaterial with low shininess). **Adopt (targeted).**
- **Fresnel (Schlick)**: F = F0 + (1−F0)(1−cosθ)^5 — grazing-angle
  reflectance. Implementing it literally means custom shaders per material.
  **Adapted**: `MeshStandardMaterial`'s BRDF carries physically-based
  Fresnel for vehicles/glass; the sky dome gets a hand-rolled
  view-angle glow term with the same flavor. No standalone Fresnel pass.
- **Normal mapping**: tangent-space perturbation via a `normalMap` —
  `MeshLambertMaterial` supports it in r186 (verified in source). **Adopt
  (targeted)**: procedural asphalt/concrete detail normals on the ground
  slabs, which own their UVs after this wave. NOT applied to baked
  statics: the bake deletes uv by design and one world-wide tile would
  read as inconsistent texel soup.
- **Physically based workflows** (metal/roughness): `MeshStandardMaterial`
  for the hero vehicles (paint metalness/roughness) + `scene.environment`
  IBL. **Adopt (targeted)** — statics stay Lambert vertex-bake for the
  draw-call law.

## Atmospheric

- **Fog**: distance fog via depth. Reference shows linear; **Adapted** to
  `FogExp2` (squared-exponential) — better aerial perspective for a city,
  one uniform per state, no recompile. Skyline rows switch from `fog:false`
  to fogged so the horizon melts into the sky color.
- **Atmospheric perspective / sky model**: the dome gets a
  direction-dependent **sun halo + horizon haze** term (view·sun-dir
  falloff, day-phase tinted) — the reference's "sky/atmosphere" chapter's
  core insight (scattering is strongest toward the sun) implemented as a
  two-line additive term. **Adopt.**
- **God rays / volumetrics**: ray-marched screen-space light shafts.
  **Defer** — cost per frame is high, the city's streets rarely frame the
  sun, and the bloom-on-emissive look already sells streetlight atmosphere.

## Screen-space effects

- **SSAO**: depth/normal prepass → per-pixel hemisphere occlusion estimate.
  three r186 ships `GTAOPass` (ground-truth-based ambient occlusion with
  spatial denoise — the modern form of the reference's SSAO chapter).
  **Adopt on the high tier**, with the far world hidden during the normal
  prepass (the dome is auto-culled by its BackSide; sprites/points are
  excluded explicitly to avoid normal-write halos).
- **Bloom**: threshold → separable Gaussian blur pyramid → additive
  composite. three's `UnrealBloomPass` is precisely the reference's
  mip-chain bloom. **Adopt** at half resolution, threshold 1.0 in linear
  HDR, phase-keyed strength (day 0.3 → night 0.55). The night emissive
  boost registry makes lamps/signs/windows the ONLY things over threshold —
  "must not wash out the scene" is a property of the threshold + the
  day/night keyframes, not of the pass.
- **Motion blur**: camera/velocity buffers. **Defer** — gameplay camera is
  a follow boom; per-object velocity buffers cost a second GBuffer and the
  gameplay payoff is negative (readability law, §1b AGENTS).
- **Depth of field**: CoC from depth → blurred composite. **Defer** — the
  city is a wide-stage game; focus hunting fights gameplay readability.
  The postcard rig could adopt it later (authored poses only).
- **SSR**: ray-march the color+depth buffer against the depth buffer.
  **Defer for glass** — a full SSR pass is the most expensive effect in the
  reference for a scene that is 90 % matte masonry; the sky-PMREM
  environment gives glass/vehicles/facade fresnel at a fixed cost. Wet
  pavement stays a future decision tied to a rain system (there is none).
- **Film grain**: animated luminance-weighted noise. **Adopt** (subtle,
  0.05 max, keyed by time of day) inside the grade pass.
- **Chromatic aberration**: radial RGB channel offset. **Adopt** (edge-only,
  very subtle, high tier) inside the grade pass.
- **Sharpening**: unsharp mask (3×3 kernel / neighbor deltas). **Adopt** —
  bloom + AO soften the frame; a mild composite-pass sharpen restores
  crispness at zero extra passes.
- **Vignette**: not in the reference's list but the same family — **adopt**
  (very subtle) for nighttime readability framing.

## Explicitly evaluated and rejected

| Technique | Why not now |
|---|---|
| Full SSR | cost/benefit at 200+ draws; PMREM covers the reflective cases |
| Motion blur | velocity buffers vs. a follow-cam street game; readability |
| DOF | focus fights gameplay; keep for authored postcard rigs later |
| Volumetric light shafts | per-frame march cost; street canyon rarely frames the sun |
| TSL / WebGPU anything | AGENTS + mission: not authorized |
| A second post pipeline | forbidden by the mission; one EffectComposer chain only |
| Vertex-AO baking into statics | touches the bake law for a look GTAO already sells |
| Real LUT textures | six parameterized states don't justify a 3D sampler |
