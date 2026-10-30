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

## Round four — autumn arrives on the block (2026-10-30)

"Keep polishing visuals", round two. Four changes, plus one real bug the
new work exposed:

1. **Four of the twelve trees are turning.** The two plaza park trees
   (the first thing you meet off the subway stairs) plus one tree each
   side of the street wear an autumn gradient: honey-gold crown
   (`PAL.gold`), lighter amber mid-blob (`PAL.amber`), lowest blob still
   green — the tree holds on from the bottom, the way real street trees
   do. Read as species, not weather: the honey locusts stay October-green.
   The first draft rolled dice per blob and kept collapsing into a
   uniform gold lollipop (both golds adjacent, the green blob buried
   between them) — a turning tree must show its turning, so the gradient
   is deterministic now.
2. **The leaf drift sheds its tree's own palette.** `LeafSpot` carries
   tints; turning trees drop gold/amber (+one green), green trees drop
   greens. A gold leaf under a green canopy read as a props mistake.
3. **The flock is not twelve clones.** Pigeons now take one of three
   plumage morphs (skyline grey / ink dark / warm rufous — all bank stock,
   zero new materials), tails match their own body, and roughly a quarter
   wear a cream nape blaze. Verified live: 3 distinct morphs and 4 blazed
   birds in the plaza flock.
4. **The lamp faces are lit.** The sun never leaves golden hour here, and
   city lamps switch on before sundown; four dead heads read as props, not
   as a block people walk home under. One shared emissive material, owned
   by World, handed to `makeStreetlight`.
5. **Tree pits wear granite rims — and the rims exposed a buried bug.**
   Each pit gained a low rim in the round-three curb grey (four bars
   merged into ONE geometry per pit; a 12-pit block must not spend 48
   draw calls on edges). The first screenshot caught the truth: the rim
   framed TAN PAVING — the pit soil (top y 0.065) had been buried inside
   the sidewalk slab (top y 0.1) since the first env pass. Every "tree
   pit" on the block was a phantom under the pavement. The pit now rides
   the slab (group y 0.07): soil top 0.105, rim lip 0.155, and
   `LeafDrift`'s `PIT_Y` moved 0.05 → 0.11 to rest on visible dirt.

Perf, same stash method as round three (baseline 382/523/742 =
round-three HEAD incl. hydrant.glb): boot +2, mid-street +5, plaza +4
draw calls — rims and blazes are mostly frustum-culled out of these
views, and plumage variety costs nothing (shared materials).

Verified: `probe-autumn.mjs` (new) — 9 amber + 39 green leaves, 3 plumage
morphs, 4 blazes, zero console errors (`shots/env6-*.png`);
`probe-leaves.mjs` re-run against the raised pit — 48 leaves, 37 grounded
on the correct surface, 0 buried, 0 hovering; full battery 0 failures
(193 s); tsc clean, vitest 79/79, build clean.

## Round five — the audit's findings, cross-checked and owned (2026-10-30)

Round four landed; then the lead agent's Doc 31 audited every evidence
frame. Two of its findings turned out to live in env-pass code, so this
round is the doc-31 cross-check: diagnose in geometry, fix in the owned
blocks, verify live. (The other Doc-31 findings belong to AGENT-A's own
files — see "For the lead agent" below.)

1. **The birds stood knee-deep in the sidewalk.** `Sidewalk_N` tops out at
   y = 0.1, and both pigeon flocks plus the squirrel were rooted at y = 0
   — a tenth of a metre into the paving. At the curb seam the birds read
   half-buried, exactly as Doc 31 flagged in `d3_plaza_pigeons_portrait`.
   `PigeonFlock` and `Squirrel` now take a `groundY` (default 0, so no
   other callsite changes behavior) and every grounding uses it: rest,
   the walk-bob, the hop parabola, the flush arc, the landing. Both flocks
   and the squirrel stand at 0.1; their zBands stay inside the slab
   (z 4..8), so one height covers every spot they can reach.
2. **Three lamps were spearing tree canopies.** Lamp 1 shared its x with
   tree 0 (−34): the pole vanished into the crown and the gold lamp head
   poked out the far side — that is Doc 31's "small dark rectangle above
   the canopy" and "small yellow object in the tree reads unattached" in
   two frames, one object. Lamps 3/4 sat 2.0 m from trunks whose worst
   seeded canopy reach is 1.85 m — legal by luck, not by margin. Lamps
   moved −34 → −31, −18 → −19.5, 30 → 31.5; every pole now clears a
   trunk by ≥ 3.0 m, asserted live. No tree, pit, or leaf spot moved.
3. **Named nodes.** The flocks, squirrel, and streetlights now carry
   scene-graph names (`Flock_Plaza`, `Flock_East`, `Squirrel`,
   `Streetlight_0..3`) so probes assert on identity, not geometry
   shape-matching. Zero runtime cost, no behavior change.

Verified: `probe-env5.mjs` (new) — 9/9 plaza + 4/4 east birds resting at
y ≈ 0.1 (0 sunk), squirrel at y = 0.100, all four lamps ≥ 3.01 m from the
nearest trunk, zero console errors; five eyeball frames (`shots/env5-
plaza-birds / -lamp-north / -lamp-south / -east-birds / -squirrel.png`)
confirm the reads: bodies sit ON the slab at the curb seam, lamp poles
own their own silhouettes, the turning ginkgo keeps its gold to itself.
Regression: `probe-leaves.mjs` 48/37/0/0 unchanged; tsc clean, vitest
112/112 (the lead agent's Day 4 suite grew it), build clean, full E2E
battery 0 failures (315 s, Day 1–4 route), zero console errors.

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
- Round three: `probe-polish.mjs` — signal / curb / steam / flock shots +
  live sidewalk-band check (`shots/env5-*.png`). Battery after: 0 failures
  (196 s).
- Round four: `probe-autumn.mjs` — turning-tree / plumage / lamp / pit-rim
  shots + data checks read from the live scene: 9 amber + 39 green leaf
  tints, 3 plumage morphs, 4 blaze birds (`shots/env6-*.png`).
  `probe-leaves.mjs` re-run against the raised pit (PIT_Y 0.05 → 0.11):
  37 grounded / 0 buried / 0 hovering. Battery after: 0 failures (193 s).
  Perf (stash method): boot +2, mid-street +5, plaza +4 draw calls.
- Round five: `probe-env5.mjs` — named-node live asserts (both flocks +
  squirrel at groundY, lamp-to-trunk clearance) + five frozen-camera
  frames (`shots/env5-plaza-birds.png`, `env5-lamp-north.png`,
  `env5-lamp-south.png`, `env5-east-birds.png`, `env5-squirrel.png`).
  Battery after: 0 failures (315 s, Day 1–4).
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
  `makeTree` (round two); round four: `makeTree(bank, rng, autumn)`
  gradient turning, `makeTreePit` granite rim (one merged geometry),
  `makeStreetlight` optional lit lamp face
- `web-three/src/world/ambient.ts` — round two: pigeon head unwinds after
  a walk, never freezes mid-bob; round four: plumage morphs + cream blaze;
  round five: `groundY` for flocks + squirrel (rest, walk-bob, hop,
  flush arc, landing all honor it)
- `web-three/src/world/leaves.ts` — round four: per-spot tints (a turning
  tree sheds gold), PIT_Y 0.11 on the raised pit
- `web-three/public/models/hydrant.glb` — new: Blender-generated
- `web-three/scripts/probe-env.mjs`, `probe-env2.mjs`, `probe-env3.mjs`,
  `probe-perf.mjs`, `probe-glb-hydrant.mjs` — probes
- `web-three/scripts/probe-leaves.mjs` — new (round two): live-sampled
  grounded-leaf assertions + pit close-ups (`shots/env4-*.png`)
- `web-three/scripts/probe-polish.mjs` — new (round three): signal /
  curb / steam / flock shots + live sidewalk-band check
- `web-three/scripts/probe-autumn.mjs` — new (round four): turning tree /
  plumage / lamp / pit-rim evidence + leaf-tint & plumage data checks
- `web-three/scripts/probe-env5.mjs` — new (round five): named-node
  asserts + the five ground/clearance frames
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

## Round six — the plaza owns its paving, the birds own their wings (2026-10-30)

Visual-polish round, from living with the round-five block. Three finds,
each verified live by the new `probe-env6.mjs`:

1. **`Plaza_Deck` rendered nowhere — fixed in place, not handed off.**
   Round five diagnosed the buried deck and left it to the lead agent;
   with "keep polishing visuals" the standing order, the one-line class
   of fix belongs to the env pass. The deck (a 7 × 3.6 pad, top y = 0.03)
   sat fully inside `Sidewalk_N` (top y = 0.1) and never drew. It is now
   **two stone slabs** (`Plaza_Deck_W`, `Plaza_Deck_E`) flanking the
   subway stair cut, tops at **y = 0.105** — half a centimetre proud, the
   same proud edge as the tree-pit soil, which reads cleanly in frame.
   The split is not cosmetic: both plaza tree pits' soil tops are also
   0.105, and coplanar tops shimmer — the slabs dodge the pits in x/z and
   leave a walk-coloured apron around the stair cut. `receiveShadow: true`
   so bird shadows land on the stone. Birds' groundY (0.1) sinks half a
   centimetre into the slab — invisible at bird scale, verified.
2. **Pigeons flew on invisible wings.** The flush arc had tail beats and
   no wings — a bird arcing over the plaza read as a thrown prop. Each
   bird now carries a **wing pair** (two plumage slabs, one shared unit
   box, hinged at the body, swept back a hair) that is `visible = false`
   on the ground — the folded wing IS the body silhouette, and a hidden
   mesh skips its draw, so the steady-state cost is zero — and spreads
   mid-flight, beating at the tail's cadence (`sin(flyAge * 26) * 0.55`),
   folding again on touchdown. Named node `Wings` per bird; probes assert
   identity, not shape.
3. **The fire escape's braces were hidden under its own platforms.** The
   straight wall brackets (z 0.1, tucked beneath the deck) could not be
   seen from the street, so the landings floated in every close-up —
   Doc 31's `d4_receipt_on_cart_portrait` finding, on the deco asset
   this pass owns. Braces are now **diagonal struts** from the wall face
   (z ≈ 0, y − 0.35) up to the platform's street edge (z ≈ 0.84, deck
   underside), rotated to read as ironwork from any low angle. Same
   material, same merged geometry — zero draw-call change.

**Plus one found by chasing a stray pixel.** An unexplained white oval
hovered near the plaza tree canopy in the round-six plaza frame. A new
one-off tool, `probe-identify.mjs` (project every mesh's bounding sphere
onto a pixel's ray, report hit/color), named it: the subway entrance's
cream **"F" bullet disc**, parked 0.25 m west of its post — attached to
nothing, reading as a floating oval from oblique angles. It now rides the
west post (back face embedded 15 mm into the post: bolted, not glued to
its silhouette).

Verified: `probe-env6.mjs` — deck tops 0.105 (+0.5 cm over the slab),
stair-cut and pit clearance asserted in x/z; 13/13 birds with wings folded
at rest, driven flush shows wings VISIBLE mid-arc (tilt −0.486) and folded
on landing (y back to 0.1); brace span wall→deck edge derived and
asserted; four eyeball frames (`shots/env6-plaza-deck.png`,
`-plaza-deck-low.png`, `-fire-escape.png`, `-wings.png`) confirm: stone
plaza with pigeons ON it, pits and apron reading clean, platforms visibly
held, wings spread mid-flap. Regression: tsc clean, vitest 112/112, build
clean, `probe-leaves.mjs` 48 leaves / 38 grounded / 0 buried / 0 hovering,
full E2E battery **0 failures (318 s, Day 1–4)**, zero console errors.

The design deliverables the brief asks for — living-neighborhood design,
the long road (days/weeks/months/years), character continuity, postcard
memory — are now written up, source-backed and proposal-form, in
[Doc 33](33-living-neighborhood-design.md). No shared code was written
for them.

## For the lead agent

Nothing in this pass needs your systems to change. The only interfaces
touched: `World.update` (already called every frame), `World.colliders`
(three pole AABBs pushed like every other solid), and the docs/28 seam
(one more file in `public/models/`). If you would rather the poles not
collide, delete the three `boxFromCenter` lines in the utility-pole block
and the E2E stays green.

**Doc-31 cross-check handoff (round five).** The env-owned findings are
fixed and verified above (birds at groundY; lamps clear of canopies —
that resolves Doc 31's "dark rectangle above the canopy", "yellow object
in the tree", and "half-submerged pigeons" reads). Two audit findings
live in YOUR files; diagnosed from here, not touched:

- **`d4_four_windows_dusk_portrait`: the detached white line above the
  tallest backdrop tower is the `Spire` deco.** It stands at x = 11,
  y 80..104 (World.ts skyline card, commit e0a6d60); tower 3 at x = 11
  is 80 tall, so the spire's base exactly kisses the roof with zero
  overlap — any camera off dead-center reads it as floating. One-line
  fix in your block: drop the spire's center to overlap the tower (e.g.
  center y 92 → 88), or parent it to the tower.
- **`Plaza_Deck` is buried.** ~~The stone plaza pad (top y = 0.03,
  x −45..−38, z 4.1..7.7) sits fully inside `Sidewalk_N` (top y = 0.1,
  z 4..8) — it renders nowhere.~~ **Fixed in round six, this side:** the
  deck is now two stone slabs flanking the stair cut, tops 0.105, dodging
  both plaza tree pits' coplanar soil tops. No action needed — noted here
  so the round-five diagnosis reads resolved, not open.

Everything else Doc 31 raises is composition and evidence hygiene in
your probe scripts and frames — not touched from this side.
## Round seven — the cab owns its lane, the sedan owns the curb (2026-10-30)

User's standing order: keep polishing visuals. Synced onto origin/main
40ba313 (the lead's Day-4 camera/wall-slide/person-collider push — my four
modules untouched by it). Method: a thirteen-frame frozen-camera sweep of
the whole merged block (`probe-sweep7.mjs`), every anomaly either identified
in code or ray-identified live (`probe-identify7.mjs`), then the one real
defect fixed and proven.

**Found and fixed (env-owned): the taxi drove through the parked sedan.**
The sedan sat on the south curb at z = −3.05 while the cab lane runs at
z = −2 — a curb-parked car and the cab overlap ~0.8 m of visible body
there, so the taxi interpenetrated the sedan every ~10 s loop (sweep frame
`sw7-04` caught them mid-bite). Fix: the sedan now parks on the NORTH curb
(24, 3.05), outside the cab's lane for the entire loop — same side and
nose-west rotation as the van, parked with westbound traffic. Collider
moved with it. `probe-env7.mjs` asserts the new home, the π yaw (via the
GLB wrapper's quaternion — `Quaternion.copy()` leaves the euler mirror
stale, a known three.js gotcha worth knowing when probing), and sweeps the
cab across its whole loop: **min lateral gap 3.1 m, 0 AABB overlaps in
369 samples**. Eyeball frame `env7-cab-passes-sedan.png`.

**Identified, not bugs** (so the next audit doesn't re-chase them): the
red diagonal on the east-end building is the CORNER SLICE PIZZA awning
edge seen at a glancing angle; the "brown panel with posts" is that
storefront's glass face and piers (`makeStorefront`, props.ts); the salmon
chunk on the x=28 south tree is a goldB crown blob on a turning tree; the
soft white blobs near the crosswalk are the shared manhole steam, anchored
and correct at distance; Rosa standing in front of a blank wall at x=−27
is authored staging (she tweens to the bodega door at x=−16 during beats).
probe-cars.mjs's GLB wrapper lookups were stale ('Sedan_glb' → the real
'car_sedan_glb') and its sedan portrait framing followed the car north.

**Handoff — the lead's lane: the E2E battery is red on 40ba313, and it
is not the environment's fault.** 16 failures, first "three orders brewed
and served"; bisected by stash → rebuild → rerun: the pristine tree fails
IDENTICALLY (same 16 checks; only random rush-tip money differs). Root
cause, with telemetry from a `?walklog` run:

1. `placeDay4Cast()` calls `placeDay3Cast()` — "Rosa at the cart" is
   authored: she stands at (2.1, 0.05, −4.9) all Day-3 AND Day-4 morning,
   on the cart's service approach.
2. The person-collider push ("bodies have weight") gives Rosa a solid
   0.56 × 1.7 box there (synced every frame by `syncPersonCollider`).
3. The driver's rush route comes off the crosswalk heading east along
   z ≈ −5.2 and welds on her box's SW corner: `[stuck] pos=(1.469,−5.12)
   near=[box 1.82..2.38, −5.18..−4.62] rosa=(2.10,−4.90)` — x 1.469 is
   exactly box minX 1.82 − capsule radius 0.35. Three walkTo budgets
   expire ~2.5 m short of the serve spot; the interacts press air; no
   brew starts; step never leaves D4_RUSH (26); every later Day-4 beat,
   the postcard, and the save check cascade.
4. The mechanism itself is healthy: a teleport-based white-box
   (`probe-rushdiag.mjs`, committed for you) boots Day 4 from a faithful
   save and shows interact → startBrew → completeBrew advancing
   rushIndex cleanly when the player stands at (4, −5.2). It's the WALK,
   not the brew. (Note for re-runs: seed the save with
   `day_complete: false`, or `earn()` silently pays nothing — replay
   days are on the house.)

Fix options, all yours — the call is a design one: move Rosa's morning
spot off the approach line (e.g. z −4.9 → −4.3, north of the walk path —
she still faces the cart), or widen the driver's sidestep budget, or
except the persistent cast from the player's collision list during rush
steps. Before this lands, the battery stays red for reasons that have
nothing to do with Days 1–3 or the environment.

Verification this round: tsc clean; vitest 125/125 (your new
camera/descend/wall-slide suites included); build clean; probe-env7 PASS
(0 console errors); probe-leaves 48/37/0/0 unchanged; probe-env5 +
probe-env6 PASS unchanged; E2E 16 failures — **pre-existing on 40ba313,
evidence above**. My tree adds zero new failures.
