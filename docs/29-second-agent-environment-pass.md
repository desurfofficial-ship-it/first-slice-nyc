# 29 — Second-Agent Environment Pass: the street finishes dressing

> Workstream: NYC environment, nature, and ambient life (second agent).
> Scope honored: everything here is additive and lives in the world layer
> (`src/world/`). The main entry, player controller, quest logic, Day 3
> story, UI, and shared configs were not touched. No behavior the E2E
> depends on changed — full battery passed after the work.

## Round two — bugs found by living with the street (2026-10-30)

Re-walking the block with the assignment's checklist found three real
defects in the ambience layer. All three are fixed at the root and pinned
by a new probe (`scripts/probe-leaves.mjs`), not by hope:

1. **Grounded leaves were buried under the sidewalk.** Every tree stands on
   a sidewalk slab whose top is y 0.1 — but `LeafDrift` parked every resting
   leaf at one global height (0.05), so all 48 rested *inside* the pavement:
   invisible on the slab, floating over asphalt. Leaves now ask what surface
   is beneath them when they land — tree-pit soil (0.05), sidewalk slab
   (0.1), or asphalt (0.02) — and rest on it. The probe samples the live
   instanced matrices twice, a second apart, so a leaf caught mid-fall
   between frames is not mistaken for a stuck one. First run after the fix:
   48 leaves, 35 grounded on the correct surface, 0 buried, 0 hovering.
2. **Leaves were born below short canopies and above tall ones.** Spawn
   height was a hardcoded 3.3 m while seeded canopy tops actually range
   ~2.9–4.5 m. `makeTree` now reports its real canopy top (`Tree.top`,
   additive — nothing else consumed the interface), and the drift spawns
   inside each tree's own canopy.
3. **Resting leaves crawled.** The old skitter applied a continuous
   forward drift for the whole rest — up to a metre of silent sliding.
   Now a leaf only skitters during gust *spikes* (gust > 0.45), a few
   centimetres each, the way a dry leaf actually behaves.
4. **A pigeon could freeze mid-bob.** The walk cycle stretched the head
   forward each stride; a bird that stopped mid-stride kept the stretched
   neck forever while idling or pecking. The head now unwinds to rest on
   idle/peck entries and resets on landing from a flush flight.

## Round three — the polish pass (2026-10-30)

"Keep polishing visuals" produced four changes, each chosen from looking at
the running block, not from a checklist:

1. **A traffic signal at the crosswalk.** The intersection was the only
   place on the block with no traffic control at all. Now the SE corner
   carries an ink mast pole, an arm reaching over the cab lane, and a
   three-lamp head facing the oncoming cab — coral / gold / teal, the
   palette's answer to red / amber / green, with the teal lamp lit. The
   game's sun never leaves golden hour and the cab always yields to
   whoever is crossing, so "go, carefully" is the one honest thing for
   the light to say. Deco only; the pole is a solid like every other pole.
2. **Granite curbs.** The road/sidewalk seam was a soft color edge; now a
   13 cm curb line runs both sides, with a curb-cut gap at the crosswalk
   (x −8..−1) because that is where people step across. Visual only —
   13 cm is a step, not a wall, and the player steps it freely.
3. **The birds finally obey the doc.** "Pigeons do not jaywalk" was the
   behavior engine's comment, but the wander radius let birds stand in
   the traffic lane (visible in the plaza probe). Flocks and the squirrel
   now take a sidewalk band and never leave it — verified live by the
   probe reading every bird's position, not just by eye.
4. **The manhole was a patio.** 1.2 m across; a real one is ~0.95. Same
   spot, same steam, believable size.

Steam and leaf drift re-shot and re-verified (`probe-polish.mjs`,
`shots/env5-*.png`). Perf, measured against the same tree with the round
stashed (the doc-29 table above predates the hydrant.glb, so the honest
baseline is a stash, not the old table): boot +10, mid-street +16,
plaza +10 draw calls — the signal (4 consolidated meshes), four curb
segments, nothing else. Triangles well under 1k more per view.

## What the block got

Seven missing pieces, chosen because the block asked for them — not
because a checklist did:

1. **Utility poles + overhead wires.** Three creosote-brown poles on the
   south sidewalk (x −8.5, 20, 44.5), crossarms with cream ceramic
   insulators, three sagging span wires per gap (quadratic sag, the way
   wire actually hangs), and a service drop to the wall behind each pole.
   Poles collide; wires are air. Each pole casts a long morning shadow.
2. **Pole signs.** `ONE WAY` with a stamped (geometry, not font) arrow
   pointing the way the cab actually travels, mounted on the crosswalk
   pole, facing oncoming traffic. `NO STANDING` in coral on the east pole.
   Signs bolt to poles — the city never gives a sign its own post.
3. **Two cedar planters.** East sidewalk and subway plaza, seeded blooms
   (coral / gold / amber — Doc 04 anchors), leaf tufts, slatted boxes.
   Where someone actually carries water: by the bus stop plaza and the
   pizza corner, not scattered.
4. **One cast-iron fire-escape silhouette** on the brownstone row
   (x −24..−19): two platforms with open railings, a zigzag stair with a
   half landing, a roof ladder and the gooseneck over the parapet. This is
   silhouette only — no colliders, no triggers. The climbable escape on
   the fire-escape building remains the greybox's, untouched.
5. **Leaf drift.** Early-autumn ambience: 48 leaves across the 12 street
   trees, one InstancedMesh, one draw call, per-leaf tint from the tree
   palette. Leaves tumble out of canopies, sway down, rest on the pavement
   through a few gusts, and return to their tree. Never a storm — you
   notice one or two, which is how an October block behaves.
6. **An east-end pigeon flock.** Four birds by the pizza corner (seeded,
   same behavior engine as the plaza flock). The plaza flock no longer
   owns all the birds on the block; the east end breathes too.
7. **A real hydrant, born in Blender.** `tools3d/blender_hydrant.py`
   (headless Blender 4.2) builds the classic three-nozzle hydrant —
   tapered barrel, domed bonnet, operating nut, side nozzles with caps,
   steamer nozzle to the street — flat-shaded, palette-anchored, and
   exports `public/models/hydrant.glb`. The docs/28 seam picks it up at
   boot: `glbUpgrades: {hydrant: "models/hydrant.glb"}`, wrapper
   `hydrant_glb` at the placeholder's exact spot, feet on the same ground.
   The old bare cylinder placeholder stays as the fallback if the file is
   ever missing. Provenance: generated by our own script, no external
   assets, no license obligations.

## Anti-Slop Gate — feature by feature

| Feature | Owner | Defined behavior | Visual style | Verification |
|---|---|---|---|---|
| Poles + wires | env module (`streetAssets.ts`), placed by `World` | static; poles collide (0.3×6.8 AABB), wires don't | bark-brown wood, ink iron, cream ceramic | probe shots env3-*; E2E golden path unaffected |
| Pole signs | same | static plates, text via the shared `signMaterials` canvas | ink-on-cream / cream-on-coral | close-up shot `env3-oneway-face`, `env3-nostanding-face` |
| Planters | same | static deco | cedar + palette blooms | shot `env3-planter-east` |
| Fire-escape silhouette | same | static, zero gameplay geometry | ink, open railings (no slabs) | shots `env3-escape-front` / `escape-34`; colliders unchanged |
| Leaf drift | `leaves.ts`, updated by `World.update` | fall → rest → respawn; wind gusts; never synchronized | greens + one amber anchor | visible in wide shots as single chips, not confetti |
| East flock | `ambient.ts` (existing behavior engine) | seeded wander/peck/flush; dusk law respected | same pigeon build as plaza flock | visible in `env-east-end`; no new behavior code to trust |
| Blender hydrant | `tools3d/blender_hydrant.py` → docs/28 seam | boot-time visual swap only, deco-only prop | coral + ink, flat-shaded | `probe-glb-hydrant.mjs` asserts upgrade + wrapper; screenshot |

## Performance (measured, not guessed)

Same view, before → after this pass (headless SwiftShader; software GL fps
is meaningless, the counters are not):

| View | Draw calls | Triangles |
|---|---|---|
| Boot/spawn | 309 → 346 (+37) | 10.2k → 13.6k |
| Mid-street east | 397 → 477 (+80) | 13.1k → 19.0k |
| Plaza | 599 → 672 (+73) | 18.1k → 23.9k |

The pass first shipped at +130..+209 draw calls, then `streetAssets.ts`
learned `consolidate()`: every prop's unit-box parts merge into one mesh
per material at build-of-prop time (the 60-part fire escape costs one
call). Sign plates keep their 6-material canvas faces. Triangles are
nothing on any phone; draw calls are the currency, and the pass now pays
in small bills. The leaf system is one instanced draw call for all 48.

## Verification record

- `tsc --noEmit` clean · `vitest` 79/79 · `vite build` clean
- Full E2E battery (real input, real physics, Day 1+2+3): **0 failures,
  ~185 s**, zero console/page errors — three green runs (after the env
  pass, after the hydrant.glb landed, and on the final rebased tree).
  One early run right after rebasing onto the lead agent's new commits
  reported 6 failures, then the identical tree went green twice in a row
  with nothing changed between runs — a cold SwiftShader timing flake in
  the poll-based waits, not a deterministic break. The failing run's log
  was not captured; if it reproduces, capture `e2e.mjs` output and match
  the failing check before touching game code.
- Visual probes (committed): `probe-env.mjs`, `probe-env2.mjs`,
  `probe-env3.mjs` (frozen-camera close-ups), `probe-perf.mjs`,
  `probe-glb-hydrant.mjs`. Shots in `web-three/shots/env*.png`.
- Round two: `probe-leaves.mjs` — 48 leaves live-sampled, 35 grounded on
  the correct surface, 0 buried, 0 hovering, zero console errors
  (`shots/env4-pit-north.png`, `env4-pit-south.png`). Pre-fix baseline
  battery was green (0 failures, 193 s); the post-fix battery result is
  recorded in the round-two commit message.
- Disposal: `World.dispose()` traverses and disposes everything the pass
  added (InstancedMesh included — it is a Mesh); LeafDrift allocates one
  geometry + one material, both reachable from the scene graph.
- Probe-only pokes (never shipped): `cam.update` freeze + private
  `yawSide` in the probes, because the follow camera's street-side yaw
  flip correctly fights static framing.

## Files

- `web-three/src/world/streetAssets.ts` — new: poles, wires, signs,
  planters, fire-escape silhouette, `consolidate()`
- `web-three/src/world/leaves.ts` — new: LeafDrift (round two: per-surface
  rest heights, canopy-true spawns, gust-spike skitter)
- `web-three/src/world/World.ts` — additive only: imports, one placement
  block, east flock, leaf field + update calls (round two: real canopy
  tops handed to the drift)
- `web-three/src/world/props.ts` — additive only: `Tree.top` reported by
  `makeTree` (round two)
- `web-three/src/world/ambient.ts` — round two: pigeon head unwinds after
  a walk, never freezes mid-bob
- `web-three/public/models/hydrant.glb` — new: Blender-generated
- `web-three/scripts/probe-env.mjs`, `probe-env2.mjs`, `probe-env3.mjs`,
  `probe-perf.mjs`, `probe-glb-hydrant.mjs` — probes
- `web-three/scripts/probe-leaves.mjs` — new (round two): live-sampled
  grounded-leaf assertions + pit close-ups (`shots/env4-*.png`)
- `web-three/scripts/probe-polish.mjs` — new (round three): signal /
  curb / steam / flock shots + live sidewalk-band check
- `tools3d/blender_hydrant.py` — new: the hydrant generator

## Known limitations

- Wires don't cast shadows (deliberate — thin tubes shadow poorly and cost
  a shadow pass each); their poles and crossarms do, which is what reads.
- The hydrant texture is unlit Principled flat color; under the game's
  warm sun it reads slightly lighter than `PAL.coral`. Accepted — it reads
  as sun-worn paint, and the seam's fallback path still works.
- Leaf respawn pops at the canopy (no per-vertex fade without a custom
  shader); it hides against the canopy blobs by design.
- Software-GL fps here is ~6; that is the headless rasterizer, not the
  game. Judge the counters, not the fps.

## For the lead agent

Nothing in this pass needs your systems to change. The only interfaces
touched: `World.update` (already called every frame), `World.colliders`
(three pole AABBs pushed like every other solid), and the docs/28 seam
(one more file in `public/models/`). If you would rather the poles not
collide, delete the three `boxFromCenter` lines in the utility-pole block
and the E2E stays green.
