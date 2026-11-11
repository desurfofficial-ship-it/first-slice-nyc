# Rendering architecture audit — FIRST SLICE: A New York Story

Scope: `web-three/` at main (`ea74114`, register v1.43.0). This audit drives the
graphics wave (docs/rendering/02-technique-evaluation.md,
03-implementation-plan.md). All findings verified against source on the audited
tree; line numbers refer to that tree.

## 1. Stack and constraints

| Layer | State |
|---|---|
| Renderer | three ^0.186.1 (WebGL2), TypeScript, Vite 8 |
| Loop | one rAF loop (`Game.frame`, Game.ts:615), one world render call (Game.ts:869) |
| Extras | yuka (ped steering), Playwright probes, vitest (90 files / 1478 tests) |
| Hard laws | AGENTS.md §1c (hot path cold, budget honesty, headless proof), Doc 04 palette canon (`core/palette.ts`), shadow-box law (`world/shadowLaw.ts`, pinned by `tests/shadow-law.test.ts`), draw-call budget < 200 at boot (docs/3d-assets/ASSET-QUALITY-STANDARDS.md) |

## 2. Renderer initialization (Game.ts:270–292)

- `antialias: true`, `powerPreference: 'high-performance'`.
- `setPixelRatio(min(devicePixelRatio, 2))`.
- `shadowMap.enabled` unless `?fx=off` (SwiftShader affordance, probe-shadow-cost: 21→46 fps under software GL).
- `shadowMap.type = PCFSoftShadowMap`.
- `toneMapping = NeutralToneMapping`, `exposure 1.05` — already filmic-family.
- `outputColorSpace` **never set explicitly** (r152+ default SRGB holds it up, but the reliance is fragile — any future target juggling can silently flip it).
- No `logarithmicDepthBuffer` (not needed: near 0.1 / far 500 is a sane ratio).

Side renderers: Wardrobe (own canvas + renderer, fitting room), PostcardCapture
(reuses the main renderer into a 768×1160 SRGB target for postcard PNGs), the
dev-only sandflow showcase. **None of these share the post pipeline** — they are
out of scope for post-processing and stay bit-for-bit.

## 3. Scene, camera, lights

- Scene: no `scene.background`; the sky is a BackSide gradient-dome `ShaderMaterial`
  (radius 380, `World.ts:544–577`) with `topColor / horizonColor / groundColor` uniforms.
- Fog: `THREE.Fog(PAL.amber, 40, 170)` (`World.ts:538`) — linear, one color for
  every hour of the authored day. Far-world materials (skyline landmarks,
  subway, arrival film, Times Square) set `fog:false` to escape it, so the
  horizon reads as **hard-cut silhouettes** instead of aerial perspective.
- Camera: `PerspectiveCamera(60, aspect, 0.1, 500)` with a dynamic-FOV law
  (fixed 60° h-FOV, clamp 30–80° v-FOV, GameCamera.ts:184–197).
- **Lights: exactly two** — `HemisphereLight(0xfff3dd, 0x8a7666, phys(1.0))` and
  `DirectionalLight(PAL.amber, phys(1.3))` (`World.ts:582–584`). No ambient,
  point, spot or rect-area lights anywhere. All street-level "lighting" is
  fake: emissive Lambert materials + additive glow sprites.

## 4. Day/night — a binary flip, not a cycle

- Sim clock: `sim/clock.ts` `GameClock { day, minuteOfDay }`, `phaseOf()` bands:
  night <05:00, dawn 05–07, morning 07–11, midday 11–16, evening 16–19,
  dusk 19–21, night ≥21:00.
- Presentation only knows **two states**: `Game.startDusk()` (Game.ts:2067 — 6 s
  parallel tween to SKY.dusk) and `Game.toMorningLight()` (Game.ts:2083 — instant
  snap to SKY.morning). Triggers: story beats (fire-escape climb) and, in
  roam/scenario, `WorldRuntime.applySimPhase` (worldRuntime.ts:323–346) which
  maps `phase ∈ {dusk, night} → startDusk()` else `toMorningLight()`.
- Consumers of the dusk flag: `STREET_PLAN` flip + cab pace (`World.updateDynamics`
  World.ts:7215), court pickup pair, M121 night dwell, pigeons/squirrel calm.
  **These gameplay flips are out of scope for the graphics wave** — the flag law stays.
- Canon states (`core/palette.ts`): `SKY.day`, `SKY.dusk`, `SKY.morning` — dawn,
  evening and night do not exist visually, although the clock has had their
  bands since the clock shipped.

## 5. Materials

- **Everything gameplay-side is `MeshLambertMaterial`**, from one factory
  (`World.mat`, World.ts:4585). No `MeshStandardMaterial` anywhere in game code.
- The statics bake (`World.bakeStatics`, World.ts:4156–4401) merges the whole
  street into per-district-tile vertex-color batches keyed
  `VC|fog|cast|receive` (non-emissive → shared white `vertexColors` materials
  `vcMatFog`/`vcMatNoFog`), `ATLAS|…` (sign faces on the shared sheet), and
  color-keyed emissive batches. The bake **deletes uv** from fused geometry and
  requires non-transparent Lambert with no map (atlas excepted) — this is the
  draw-call economy (154 draws / 258k tris at boot, measured
  docs/qa-security/evidence/RESULTS-perf-qa.txt).
- Textures: **the only runtime texture is the sign atlas** (one shared
  CanvasTexture, `signAtlas.ts`) plus ad-hoc canvases (murals, notice boards,
  subway signage, Times Square screens). The furniture GLBs carry KTX2 textures.
- **No normal maps, no roughness, no AO maps, no env maps.** Roads, sidewalks,
  brick, concrete, glass and vehicles are all flat untextured colors; the street
  reads clean but flat — the audit's biggest single visual weakness.
- Glass = dark Lambert + amber emissive (World.ts:2708–2714). Vehicles =
  flat-color boxes fused into vc batches (bake folds cast-only batches,
  World.ts:4318–4335); the taxi is a live merged draw, not baked.

## 6. Shadows

- Only the sun casts. 2048² PCFSoft, ortho half-extent `SHADOW_HALF = 35`
  (street) / 18 (underground dollhouse), bias −0.0002 / normalBias 0.03,
  texel-snapped follow (`updateSunFollow`, World.ts:480–497) so edges never
  shimmer; the sun **never rotates** (basis computed once, World.ts:604–610 —
  note `toMorningLight`'s `sun.position.set` is immediately overwritten by the
  follow, so direction is in fact constant already).
- People cast through one merged silhouette proxy per figure on
  `PERSON_SHADOW_LAYER` (personRig.ts) — an elegant, cheap law to preserve.
- `?fx=off` kills the shadow pass entirely (E2E contract — must not change).

## 7. Post-processing

- **None.** No EffectComposer, no passes, no `three/examples/jsm/postprocessing`
  imports anywhere. Glow is faked with emissive + sprites. This is the wave's
  greenfield: adding ONE pipeline (not two — AGENTS-consistent) changes nothing
  existing if the direct-render path stays for `?fx=off`.

## 8. Emissive inventory (who can bloom)

Story windows (gold/second/third/fourth, intensities up to 4.0, Game tweens),
Rosa's bodega window (0.55), ambient diary windows, storefront light strips
(0.75), room glass (0.05–0.42), streetlamp faces (0.35), traffic green lamps
(0.55), subway globes/strips (0.9–1.4), Times Square screens (animated
0.5–0.62+), bakery props, court dressing, the arrival film's emissiveMaps.
**At night most of these sit below any sane bloom threshold** — the night city
relies on sprites, not light.

## 9. Performance posture

- Measured (software GL, docs evidence): 154 draws / 258k tris at boot,
  222 mid-street, 296 plaza; e2e budget gates in CI; probe fleet in
  `web-three/scripts/` (probe-perf, fps-sample, diag-perf-breakdown).
- District-tile culling (ring), zone visibility (subway/TS), dusk-shift peds
  hidden at rest, underground shadow-box shrink — the systems are strong.
- Weak spots for this wave: pixel-ratio cap 2 unconditionally (no tiering),
  no device capability detection at all, no quality settings, no auto-degrade.

## 10. Capability/quality systems

Three knobs total: `?fx=off`, `E2E_SCALE` (harness deviceScaleFactor), the
pixel-ratio clamp. No GPU probing (`renderer.capabilities` unused), no quality
menu, no per-effect toggles. **The wave must add these without disturbing the
E2E/probe contracts** (`?fx=off`, driver handshake, `__game` handle).

## 11. Weakness summary → opportunities

| # | Weakness | Opportunity (this wave) |
|---|---|---|
| W1 | Flat untextured ground planes | procedural asphalt/concrete albedo + metric UVs on the road/sidewalk slabs (they exit the bake cleanly — the bake already skips mapped Lambert) |
| W2 | Binary day⇄dusk | continuous clock-driven day cycle (dawn/morning/midday/evening/dusk/night keyframes), canon states preserved exactly, story pins preserved |
| W3 | No post pipeline | one EffectComposer chain: RenderPass → (GTAO) → UnrealBloom → CityGrade → OutputPass; direct render preserved for low/`?fx=off` |
| W4 | Hard-cut horizon | FogExp2 + aerial perspective; sky sun-halo; skyline rows blend to horizon |
| W5 | No ambient occlusion | GTAOPass on high tier, far-world excluded from its normal pass |
| W6 | Emissive never blooms | night emissive boost registry → threshold bloom picks lamps/windows/signs naturally |
| W7 | No reflections | scene.environment PMREM from the sky (rebuilt per state change), vehicle + glass upgrades |
| W8 | No quality tiers | capability detection + `?gfx=` + per-effect overrides + auto-degrade |
| W9 | `outputColorSpace` implicit | set explicitly at init |
| W10 | Grade flatness | film grain / vignette / chromatic aberration / sharpen / saturation in ONE pass (reference-adapted, own GLSL) |
