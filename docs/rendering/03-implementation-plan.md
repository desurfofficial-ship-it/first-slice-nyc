# Implementation plan — the graphics wave

Companion to 01 (audit) and 02 (technique evaluation). One branch
(`feat/graphics-wave`), merged to main with the register bump. Every step
below is either pure-additive or a seam swap at Game.ts:869.

## Architecture (new files, one folder)

```
web-three/src/render/
  daycycle.ts     pure keyframes + sampleDayCycle(minuteOfDay) + tests
  quality.ts      pure tier resolution + URL flags + capability probe
  envsky.ts       PMREM environment built from the current sky state
  postfx.ts       PostPipeline: EffectComposer assembly + CityGradePass
```

**Laws honored:** the bake law is untouched (bakeStatics keys, exclusions,
cast/receive fold); the shadow law is untouched (same 2048² PCFSoft box,
texel snap, person-proxy layer — `shadow-law.test.ts` must stay green
bit-for-bit); the palette canon states (`SKY.day/dusk/morning`) are reused
verbatim as keyframes; `?fx=off`, the E2E handshake, `__game`,
`applySimPhase(dusk)` and `worldDuskStarted` keep their contracts.

## Step ladder

1. **Day cycle (daycycle.ts)** — six keyframes (dawn 05:30, morning 08:00,
   midday 13:00, evening 17:00, dusk 19:30, night 22:30) wrapping at 04:00.
   Each keyframe: sky top/horizon/ground, fog color+density, sun
   color/energy, hemi energy + ground color, nightK (emissive boost),
   env intensity, bloom strength, grade (exposure, lift, gain, saturation,
   grain, vignette, CA). Canon day/dusk/morning reuse `SKY.*` exactly.
   `World.applyDayState(state, immediate)` lerps current→target (exp
   approach, preallocated Colors — hot path cold). Game pins: story
   `startDusk`/`toMorningLight` pin a state; roam/scenario
   `phaseChange` maps the band to a keyframe and unpins; `?tod=HH:MM`
   forces clock-driven sampling for probes and validation.
2. **Sky** — sun-halo + horizon-haze term added to the dome shader
   (uniforms: sunDir, haloColor, haloStrength); stars via hash noise gated
   by nightK (cheap, BackSide, fog:false, same one draw).
3. **Fog** — `THREE.Fog` → `FogExp2` (one recompile at boot, before first
   render); density keyed per state; skyline fabric + landmark rows ride
   fog (aerial perspective); Times Square screens keep fog:false (screens
   read through haze by design).
4. **Ground materials** — procedural CanvasTextures (asphalt, concrete)
   + metric UVs on Road/Sidewalk slabs (+ MeshPhongMaterial, low
   shininess, for the sun's grazing highlight); they leave the bake
   automatically (mapped Lambert skips) — measured draw delta, budget
   verified. Crosswalks/curbs keep flat color.
5. **Emissive night boost** — World registers lamp faces, traffic greens,
   storefront strips, room-warm glass with `{base, night}`; the state
   applier sets `intensity = base + (night − base)·nightK`. Named story
   windows stay Game-owned. Result: at night only these cross the bloom
   threshold.
6. **Post pipeline (postfx.ts)** — tiers: low = direct render (today's
   path); medium = bloom + grade; high = + GTAO + CA; ultra = + full-res
   bloom. Composer targets HalfFloat; chain RenderPass → [GTAO] →
   UnrealBloom → CityGradePass (grain/vignette/CA/sharpen/grade, own GLSL)
   → OutputPass. AO normal-prepass hides far world + sprites/points via an
   explicit exclusion list. Pipeline owns setSize/dispose; no per-frame
   allocations; uniforms mutated in place.
7. **Environment (envsky.ts)** — tiny PMREM from the live sky colors,
   rebuilt only when the target state changes; `scene.environment` +
   `environmentIntensity` keyed by state; hero vehicles become
   MeshStandardMaterial (metalness/roughness paint), storefront glass gets
   envMapIntensity. Statics stay Lambert (envMapIntensity ≈ 0.25 for a
   soft IBL fill).
8. **Quality (quality.ts)** — capability probe (WebGL2, max texture,
   cores, DPR, mobile/SwiftShader UA) → low/medium/high; `?gfx=` override,
   `?bloom/ssao/grain/…` granular overrides; auto-degrade one tier on
   sustained <30 fps (probe-visible via `__game.gfx`).
9. **Tests** — daycycle (canon preservation, wrap, monotonic nightK,
   densities), quality (tier/flag resolution matrix), grade (param
   clamps). All existing 1478 tests stay green.
10. **Evidence** — before/after screenshot rigs (day residential,
    day commercial, sunset, night, windows/interior glow, vehicles+pedestrians,
    distant city), draw-call + fps comparison at three rigs and three
    tiers, results into docs/rendering/04-results + assets frames.

## Rollback safety

Every renderer change sits behind: (a) the low tier / `?fx=off` direct path
which is today's code, (b) the canon keyframes which reproduce the shipped
day/dusk/morning numbers exactly, (c) tests pinning shadow law + palette.
Worst case `?gfx=low` returns any machine to the shipped look.
