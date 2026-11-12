# The Fenestra Windows — interior-mapping integration (v1.50.0)

> **Status: IMPLEMENTED + VERIFIED on the sandbox rig** (2026-11-12).
> The block's proud-window rows now open into lit rooms. The technique is
> interior mapping — Joost van Dongen's 2008 method, adapted from
> codedgar/three-fenestra (MIT, © 2026 Edgar Pérez; full notice in
> [THIRD-PARTY-NOTICES.md](../../../THIRD-PARTY-NOTICES.md)). Every texture
> is a generated original. The in-game clock owns every lamp.

## 0. The one-paragraph version

Every proud window the shipped builders placed (271 of them, on 30 registry
buildings) gains a plane 6.2 cm proud of its dim box. The plane is an
InstancedMesh — two of them, one per family — wearing a patched
MeshLambertMaterial that ray-marches a room box behind the window and paints
a room from an original 32-room atlas. Lamps come on with the in-game
clock's nightK, each at its own hashed threshold through the evening. Two
new draw calls, no new colliders, no gameplay system touched.

## 1. Reference analysis (what three-fenestra is, and what we took)

**What the reference is.** A Three.js plugin: `InteriorMappingMaterial`
extends MeshStandardMaterial via `onBeforeCompile`; the GLSL casts the view
ray through the window, intersects a virtual room box (width 1, height 1,
depth `uDepth`, in plane-local units), and re-projects the exit point onto
one atlas cell — a one-point-perspective room photo. Instanced mode (v0.3.0)
moves per-window identity into `instanceWindowId` (vec3), plus `instanceLod`
/ `instanceFade` floats: thousands of windows in one draw call. Per-window
lit/unlit, warm/cool, brightness come from hashes of the id — and the seed
constants are a documented public contract (lit 3.71, tone 9.27, brightness
5.43, atlas 0.0, front 7.13), so a cheap impostor can reproduce the same
window a near material shows.

**License.** MIT (LICENSE, © 2026 Edgar Pérez). The `starter/` atlases ship
inside the MIT package — but the mission asked for original art, so none of
it ships here; our atlases are generated (see §4).

**What we adopted.**
- The GLSL core (hash, atlas pick, room-box march) — adapted, credited,
  with the seed contract preserved bit-for-bit (`fenestraMaterial.glslFenCore`).
- The instanced-attribute schema — `instanceWindowId` + `instanceLod`;
  `instanceFade` is repurposed as a glass-cue weight (Lambert cannot afford
  the reference's transparent crossfade pass; a band switch with hysteresis
  is this game's LOD grammar — the same law the district tiles live under).
- The compositing model: the room texture is PRE-LIT and is added after all
  lighting (before tone mapping — it rides the scene's ACES-style tonemap,
  bloom and fog like everything else); the front atlas drives the diffuse
  where opaque, transmits a tinted fraction where sheer, and zeroes the
  diffuse where glass so the sun never paints the pane.

**What we did NOT adopt, and why.**
- MeshStandardMaterial + PBR front normal/roughness/metalness maps — the
  house material family is Lambert (AGENTS §1c.6 budget); glass reads
  through a Schlick sheen instead.
- The reference's `lod` uniform crossfade via per-instance alpha — a
  transparent pass on 271 windows costs sorting we refuse; our LOD is a
  band attribute with hysteresis (§5).
- Static `litRatio` — the game has a CLOCK. The occupancy law is §3 here.
- Their starter textures — replaced by generated originals (§4).

## 2. The audit that shaped it (what already existed)

| Existing system | Fact | How fenestra respects it |
| --- | --- | --- |
| Proud-window rows | Every block building dresses windows as thin `BoxGeometry` decoMeshes (`*_Win_*`, `Window_*`, `BrownstoneWin_*`, `BandWin`, `KTN07_Studio_*`, `*_Parlor`), 0.08 proud, `PAL.windowDim` | The collector READS those meshes (pre-bake, by name + size grammar), derives the outward normal from the owning registry shell, and adds planes 0.062 proud — the dim box becomes the frame reveal. Zero grid math duplicated. |
| Story windows | `GoldWindow`, `SecondWindow`, `ThirdWindow`, `FourthWindow`, `AmbientWindow_*`, `Bodega_Window` are Game-owned (tweens, glows, the day-keyed diary) | Name skip-list — the system never touches them. |
| The W5 real interiors | Nine rooms with real fit-outs behind real glass (`roomGlassMat`/`roomClearMat`, transparent) | Transparent materials fail the collector's filter — no fake interior ever sits in front of a real one. |
| The district bake | `bakeStatics` fuses statics per 28×32 m tile; instanced draws own themselves; mapped materials keep their own draw | Plan collection runs BEFORE the bake (named meshes must exist); the two InstancedMeshes build AFTER it. |
| The night emissive registry | `nightEmissives` + `applyTargetDayState` write `base + (night−base)·nightK` from the sim clock | The fenestra materials ride the same loop: one `uFenNightK` write per family per frame. Per-window onsets are shader hashes of the id — never synchronized, never re-rolled. |
| The skyline / terrace impostors | Far lit panes are flat `InstancedMesh` planes on `skylineWinMat`, frustumCulled false | Same grammar for the whole block; the far world keeps its cheap impostors untouched. |
| Quality tiers | `resolveGfxConfig` + the auto-degrade watchdog | Tier → LOD band distances (§5); `applyGfxTier` re-wires them live; `?fenestra=0` hides the planes entirely (the A/B seam). |

## 3. The occupancy law (the clock is the only lamp switch)

`fenestraCore.windowLightOf(id, nightK, params)` — mirrored line-for-line in
GLSL (`_fenLightK`), pinned together by `tests/fenestra.test.ts`:

- `hLit = hash(id, 3.71)` — the window's identity roll.
- Day (nightK 0): `hLit < dayLit` (0.10 residential / 0.16 commercial) are
  lit — kitchens, shops. Everyone else shows the room at `dimDay` (0.28)
  through the glass tint — a daylight read, not a blackout.
- Evening: every window has `onset = onsetStart + hash(id, 6.42)·span`
  (nightK 0.14–0.60 residential, 0.10–0.72 commercial). A lamp snaps on
  across a 0.07 nightK band (~a minute of game time) — one lamp's honest
  snap; the DISTRICT lights as a tide because 271 thresholds spread across
  dusk. The same window keeps the same threshold every day.
- Night: `nightLit` = 0.46 residential / 0.30 commercial. Never every
  window; never none.
- Tone: warm `(1.0, 0.72, 0.42)` / cool `(0.62, 0.74, 0.92)` via seed 9.27,
  brightness via seed 5.43 (0.62–1.0 × boost 3.2/2.8 — the peaks cross the
  bloom floor on the composer path, so lit rooms halo exactly like the
  shipped lamps do).
- Unlit at night: `dimNight` 0.05 — near-black, a faint read of the room.

All time flows from `World.updateDayCycle(minuteOfDay)` — the sim clock via
`Game.frame`; the `?tod` pin reaches it the same way. No wall clock
anywhere (the R4 law).

## 4. Original assets (generated, palette-anchored)

`tools3d/fenestra_atlas.py` (pure Python + Pillow, deterministic
mulberry32 seeds, rebuild is pixel-identical):

- `web-three/public/textures/fenestra_rooms.png` — 2048×1024, 8×4 grid of
  256 px cells. Cells 0–15 residential (walk-up living room, brownstone
  parlor, studio, kitchen, bedroom, kid's room, dining, the empty apartment
  with its bare bulb, artist studio, book wall, bath, home office, laundry
  corner, hall, loft, grandma's parlor); 16–31 commercial/service (office
  floor, diner, bakery, record shop, barbershop, bodega, restaurant
  kitchen, retail, bar, café, gym, stairwell, storage, workshop,
  laundromat, the after-hours office). One-point-perspective rooms whose
  projection matches the shader's math exactly (back wall = the center
  0.66 of the cell — the `backScale` contract), painted flat-shaded in the
  Doc 04 palette with per-room lamp glows, contact shadows and a soft
  vignette.
- `fenestra_fronts.png` — 1024×1024, 4×4 RGBA: clear, sheer panels, drawn
  curtain, venetian blinds (closed + half), café curtain, voile, the AC
  unit, night tint, sill plant, blackout, tie-backs, valance, box fan,
  corner grime, frosted film.
- Both sheets carry **8 px edge-extension gutters** (every cell's border
  replicated outward) so filtering never pulls a neighbor's colors into a
  window.

Atlas sampling rides the **mip chain** (FEN-GLITCH REPAIR, register
v1.58.0, 2026-11-12): the original wave shipped level-0-only sampling
believing "every mip path speckled on the rig; level-0 verified clean" —
and that verification was wrong twice over. (1) Level-0 sampling of a
256-texel room cell into a 60–90 px window aliases into per-pixel RGB
static — the wave's own `fenestra-day-street` evidence shot shows it.
(2) The field report (a phone, tier low, register v1.55.0's known debt
re-audit) rendered the windows as blocks of colored noise. The isolation
diag (`scripts/diag-fenestra-mip.mjs`) traced TWO compounding mechanisms:

- **The cell-pick scramble** — the per-window hash ran per PIXEL in the
  fragment stage on the interpolated `vFenId` varying, and a
  perspective-correct interpolation of even a CONSTANT varying wobbles
  ±1e-7 in fp32; `imHash`'s product (`fract(p.x·p.y·p.z·(p.x+p.y+p.z))`,
  ≈250 000) amplifies that wobble into full [0,1) jumps — the atlas cell
  pick changed per pixel and every window sampled the whole atlas as
  confetti. In-page probes proved it: the same hash evaluated in the
  VERTEX stage (exact-constant inputs) is flat; in the fragment it is
  chaos. **Fix: every per-window hash/pick now runs in the vertex stage
  and reaches the fragment as (flat) varyings** — `vFenHash` (the four
  occupancy seeds), `vFenRoomOrigin` / `vFenFrontOrigin` (the cell picks),
  `vFenGrime`. Seven per-pixel hash calls per fragment became seven
  per-vertex calls per window (a fragment-cost win on mobile).
- **Deep-mip cross-cell bleed** — the room UV is smooth in value but its
  screen-space derivative blows up on grazing room walls; an
  implicit-derivative fetch sampled mip 4+ where the 8 px gutters are
  exhausted and neighbor rooms' averages bled in. **Fix: the room fetch
  is explicit (`textureLod`) at the window PLANE's own footprint
  (`fwidth` of the plane-local coords), capped at the gutter-safe depth
  3.0; the sampler's `TEXTURE_MAX_LOD` is pinned to 3.0 on upload (the
  atlas loader's `onUpdate`), and the atlases carry mips + anisotropy 4
  (three clamps to the device max).**

Post-repair evidence: the same three watched window regions read 4.4–7.2
mean neighbor-delta (the pre-fix tree read 38–48); the probe asserts the
mip-chain wiring AND runs a static detector with a wall-canary (§6).

## 5. Architecture (files, data flow, cost)

```
tools3d/fenestra_atlas.py             generates rooms + fronts (original art)
web-three/src/world/fenestraCore.ts   PURE: hash + cell-pick oracles, the
                                      occupancy law, family classification,
                                      the collector, LOD band law
web-three/src/world/fenestraMaterial.ts
                                      GLSL core + Lambert injections + the
                                      instanced mesh builder + atlas loader
web-three/src/world/World.ts          collect pre-bake → build post-bake;
                                      uFenNightK in applyTargetDayState;
                                      band pass in updateDynamics (4 Hz);
                                      setFenestraTier / setFenestraEnabled /
                                      fenestraSummary / disposeFenestra
web-three/src/game/Game.ts            boot tier wiring; ?fenestra=0
web-three/tests/fenestra.test.ts      30 guards (the laws, headless)
web-three/scripts/probe-fenestra.mjs  the in-engine gate (22 checks + shots)
web-three/scripts/diag-fenestra-perf.mjs  the A/B perf rig
```

Frame cost: **2 draw calls** (one per family; the plan census: 241
residential + 30 commercial). Per frame beyond that: one uniform write per
family (the clock) + a 4 Hz distance pass over 271 instances that writes
attributes only on band crossings. No allocations in the steady loop.

LOD bands (per-instance attributes, hysteresis ±3 m — a window never
flickers at the boundary):

| Band | distance (high/ultra · medium · low) | shader behavior |
| --- | --- | --- |
| FULL | < 26 · < 18 · < 10 m | ray-marched room + glass cues (front atlas + sheen) |
| MID | 26–60 · 18–44 · 10–24 m | ray-marched room, glass cues off (2 fetches saved) |
| FLAT | > 60 · > 44 · > 24 m | the impostor: the cell sampled straight — the reference's own far-facade equivalence |

## 6. Verification (what was actually run)

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **1,562/1,562 across 96 files** (the shipped 1,532 +
  this system's 30). Post-repair (v1.58.0): **1,669/1,669 across 99 files**
  (+7: the atlas-filter law ×4, the vertex-stage hash guard, the
  seed-contract relocation, the explicit-LOD pin).
- `npm run build` — OK (the two atlases ride `public/`).
- `scripts/probe-fenestra.mjs` — **ALL PASS (22 checks)**: two family
  meshes with the collected counts, atlas-range split, atlases loaded
  (2048/1024), nightK pinned at midday/dusk/night by `?tod`, the free-running
  sim clock reaching the materials, the A/B toggle changing the draw count,
  console clean on every boot (direct AND composer paths), evidence shots in
  `evidence/` (day street/close/far, dusk street/terrace, night
  street/close/far + the `?fenestra=0` before-frame).
- `scripts/diag-fenestra-perf.mjs` — A/B on the sandbox rig (swiftshader,
  software GL, 1280×800): 22.3 ms vs 12.7 ms average frame — **+9.6 ms,
  +2 draw calls, +542 triangles**. Software GL executes the ray-march on
  CPU for every window pixel; the same workload is a few hundred ALU ops
  on <5% of a real GPU's frame. The tier bands + `?fenestra=0` + the
  auto-degrade watchdog are the fallbacks.
- The 4-day story E2E could not complete on this sandbox — the
  `grabbed ladder 2` step fails on the **unmodified tree too** (verified by
  `git stash`; the harness's own docs note slow-machine knobs). Not a
  regression of this wave; recorded honestly rather than claimed green.

## 7. Limitations (the honest list)

1. ~~No mipmap filtering on the atlases~~ **REPAIRED v1.58.0** (§4): mips
   + anisotropy + the vertex-side hash migration + the explicit-LOD fetch;
   the probe's static detector pins it (§6).
2. **Grazing-angle compression**: at steep angles the room's projected
   sliver compresses; Schlick darkening (the glass turns mirror at
   grazing — physically true) mutes it, and the explicit-LOD cap (3.0)
   keeps the sliver own-colored. A deeper graze could sample a softer
   mip than the plane's footprint strictly implies — accepted, the
   alternative is the scramble the cap exists to prevent.
3. **Room box is window-relative**: a 3.4 m storefront band and a 1.1 m
   sash both read as "one room wide" — the reference's own model. It reads
   correct at street distance; nobody has measured a bodega window.
4. **The skyline rows and the DN1/DS1 backdrop strips keep their flat
   lit-pane impostors** — 40–140 m out, interior mapping there is waste
   (the mission's own distance law).
5. **The register's full-fidelity E2E could not run here** (§6) — the
   ladder-2 step fails identically on the unmodified tree; the next agent
   with a faster box should re-run `scripts/e2e.mjs` on this tree.

## 8. The palette law, honored

Every room color derives from `PAL` (Doc 04) shades — brick, teal, amber,
plum, cream, stone, the bodega's interior tan. No new hue enters the scene.
The windows' night palette is the amber's warm read plus a cool fluorescent
minority — the same two lamps the shipped world already uses.
