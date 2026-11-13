# Implementation results — the graphics wave

Companion to 01 (audit) · 02 (technique evaluation) · 03 (plan). The curated
before/after evidence pairs ship in `docs/rendering/evidence/` (JPG); the
full-resolution capture sets live in `web-three/shots/before/` (main
`ea74114`) and `web-three/shots/after/` (this wave, gitignored like all
probe shots), captured by `web-three/scripts/visual-graphics.mjs` against
the production build on software GL (SwiftShader) — hardware-independent
draw/triangle counters are the honest comparison; fps on a software
rasterizer is not a hardware number.

## 1. What shipped (all ten deliverable categories)

| # | Deliverable | Where |
|---|---|---|
| 1 | Rendering architecture audit | docs/rendering/01 |
| 2 | Shader technique evaluation (license-checked) | docs/rendering/02 |
| 3 | Implementation plan | docs/rendering/03 |
| 4 | Rendering improvements | day cycle, sky, fog, ground, materials, emissives — see §2 |
| 5 | New shader modules / post systems | `src/render/daycycle.ts` `quality.ts` `envsky.ts` `postfx.ts` (CityGradePass GLSL is our own), `src/world/groundTex.ts` |
| 6 | Graphics quality configuration | `src/render/quality.ts` — 4 tiers, capability probe, `?gfx=` + per-effect URL flags, auto-degrade |
| 7 | Before/after screenshots | web-three/shots/before · shots/after (16 after frames across dawn/midday/evening/dusk/night) |
| 8 | Performance comparisons | §4 |
| 9 | Browser compatibility results | §5 |
| 10 | Tests, typecheck, build results | §6 |

## 2. The improvements, view by view

- **Residential street, day** (`before-1-residential-day` →
  `after-midday-1-residential`): asphalt/concrete grain + expansion joints,
  GTAO contact shading under trees and stoops, sun-halo in the sky, aerial
  perspective on the cross-street masses.
- **Commercial street, day** (`before-2-commercial-day` →
  `after-midday-2-commercial`): same ground treatment plus the storefront
  strips' night registry (no visual change at noon — by design), cleaner
  crosswalks (the bloom-threshold tuning, §3), deeper far-street haze.
- **Sunset / golden hour** (`before-*-sunset` → `after-dusk-*`): the canon
  SKY.dusk numbers ride verbatim; the new halo term warms the sky toward
  the sun; fog density is state-keyed so the dusk haze thickens; first
  stars gate in past nightK 0.5.
- **Night (new capability)** (`after-night-4-street-night`): the clock
  always had a night band; the render never did. Streetlamp heads and
  traffic signals bloom (emissive 2.4/2.2 over threshold 1.8), storefront
  strips and warm interiors glow, apartment windows carry the skyline,
  the shadow-lift grade keeps the street readable, animated film grain
  covers the dark, stars + moonlit sky finish it.
- **Illuminated windows / interiors** (`after-dusk-5-windows-dusk`,
  `after-night-5-windows-dusk`): room-glass and warm-room materials ride
  the night registry (0.05–0.42 base → 0.35–2.0 night); the story windows
  stay Game-owned (their tweens unchanged).
- **Vehicles + pedestrians** (`after-midday-6-vehicles-peds`): the taxi and
  the M121 wear MeshStandardMaterial paint with the sky-PMREM environment —
  real Fresnel-weighted reflections; parked cars keep their vertex-bake
  economy (a documented trade, §4).
- **Distant city** (`before-7-distant-city` → `after-midday-7-distant-city`):
  the skyline fabric switched from fog-exempt to fogged — the far rows melt
  into the horizon color instead of hard-cutting (atmospheric perspective).
- **Dawn (new capability)** (`after-dawn-*`): peach horizon, cool masses,
  lamps still partially lit (nightK 0.7 → 0.1 across the band).

## 3. The visual defects the evidence caught and the fixes

| Defect | Evidence | Fix |
|---|---|---|
| Crosswalk/sidewalk bloom wash at midday (cream ~1.7 linear under sun+hemi > threshold 1.0, then 1.35) | after-midday-2-commercial (first two captures) | UnrealBloom threshold → **1.8**; night registry lifted above it (lamps 2.4, traffic 2.2, strips/rooms 2.0, rosa window 1.9); midday sun 1.45 → 1.3 |
| Paper-white midday horizon | same | midday FogExp2 density 0.0045 → 0.0040 |
| Night grain too loud on dark asphalt | after-night capture | night grade grain 0.05 → 0.04 |
| Composer path dead (every frame `Cannot set properties of undefined`) | diag-gfx-pipeline | the grade uniform is `uCA` — the render wrote `u.uCa` (case bug); fixed + the diag kept (`scripts/diag-gfx-pipeline.mjs`) |

## 4. Performance

Draw calls / triangles, whole frame (`renderer.info.autoReset = false`,
reset per frame — identical accounting across paths), software GL
@ 1280×800:

| Rig | Before (main) | After, low | After, medium | After, high |
|---|---|---|---|---|
| mid-street commercial | 236 / 364k | 240 / 364k | 255 / 364k | ~470–495 / ~714–728k |
| plaza | 309 / 404k | — | — | — |
| vehicles | 259 / 374k | — | — | — |

- **low** = today's direct path + the wave's world changes: **+4 draws**
  (the textured road/sidewalk slabs leave the bake — the bake skips mapped
  materials by its own law). Budget <200 at boot unaffected (the boot
  spawn sits inside the mid-street rig's ring).
- **medium** = + bloom mip chain + grade + output quads (≈ +15 cheap
  fullscreen draws, no geometry re-render).
- **high** = + the GTAO normal/depth prepass (≈ +240 draws / +350k tris —
  the scene rendered once more with an override material). This is the
  tier the capability probe gates hardest: not mobile, not software GL,
  ≥8 cores, WebGL2, maxTexture ≥8192.
- **Auto-degrade**: a sustained >42 ms average frame drops one tier, once,
  and never when a URL tier was forced (probe-visible via `__game.gfx`).
- The taxi/M121 Standard-material swap: +0 batch count (the taxi is a live
  merged draw; the bus keeps 5 batches) — hero vehicles only, the parked
  fleet stays baked (documented trade: full-fleet PBR would cost ~+40
  draws for background props).

## 5. Browser compatibility

| Environment | Result |
|---|---|
| Chromium 156 (Playwright, SwiftShader software WebGL2) | full day cycle + composer path ZERO page errors across all 5 states × 8 rigs (16 after frames); `?fx=off` and low tier ride the direct path — the E2E/probe contract intact |
| WebGL1 / maxTexture < 4096 | resolver → low tier (direct path, no composer — the shipped renderer unchanged) |
| Coarse-pointer high-DPR (phone-class) | low tier default; medium reachable via `?gfx=medium` |
| HalfFloat render targets | required only on medium+ (composer); universal in WebGL2 targets this stack supports; low tier never touches it |
| The 4-day E2E (`?fx=off`) | see §6 — the driver reads STATE, not pixels; the graphics wave's `?fx=off` path is today's code path |

Notes: three r186 applies tone mapping to the canvas only (verified in
`WebGLPrograms.js`), so RenderPass targets stay linear-HDR and OutputPass
applies NeutralToneMapping once — both render paths tonemap identically.
`scene.environment` + `envMapIntensity` verified for MeshLambertMaterial in
the r186 source before use (r156+ per-fragment Lambert).

## 6. Gates

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **93 files / 1506 tests pass** (the shipped 1478 across
  90 files + 28 new: render-daycycle 10, render-quality 12, render-grounduv 3
  + the PASS_CHAIN pin; zero existing assertions weakened — the two
  dusk/morning tween pins ride the same canon numbers through the new
  keyframes, machine-checked in render-daycycle).
- `npx vite build` — OK (~0.7 s; the pipeline adds ~14 kB minified).
- 4-day E2E — 0 failures, console clean (see the register row for the run
  time; the driver gates unchanged).
- The shadow law (`tests/shadow-law.test.ts`), the palette law, the bake
  law, the driver-gate security probes — all green untouched.

## 7. Licensing

The reference repository licenses ONLY its `.cxx`/`.vert`/`.frag` software
files ("No other portion of 3D Game Shaders For Beginners has been licensed
for use", © 2019 David Lettier). This wave copies **nothing** from it: the
CityGradePass GLSL, the day-cycle mathematics, the ground textures and the
sky model are independent implementations of the published techniques;
bloom/AO come from three.js's own MIT-licensed `examples/jsm` addons already
in the dependency tree. THIRD-PARTY-NOTICES.md needs no new entry (verified
against the repo's License section 2026-11-12).
