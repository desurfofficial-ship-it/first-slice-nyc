# Doc 47 — Construction Log

> The running ledger of the Alder Heights build (docs/39–45 blueprint →
> playable world). One entry per phase: what landed, the measured proof,
> what is explicitly NOT done. **Nothing here is marked complete that isn't
> verified.** Construction was ordered by the lead 2026-11-01 ("START
> BUILDING ALDER HEIGHTS NOW"); docs/45 remains the phase law.

---

## W0 — Bake & culling prerequisite (SHIPPED 2026-11-01, commit at push)

**Scope honored:** pure refactor, zero geometry moves, zero new content,
zero new dependencies. E2E run before and after (failure-name sets compared —
see below). File owner: Main Agent (`World.ts`, `props.ts`, `streetAssets.ts`,
`ambient.ts`, `Game.ts` untouched except where noted).

### The honest baseline (measured, not inherited)

The registry's `measuredBaseline` (402 calls @ 1ea39c2) was a scene-census
number from one boot camera. The real per-rig numbers — the three docs/45 §3
street rigs, last-frame `renderer.info.render.calls` (which includes the
shadow pass) on SwiftShader — were worse:

| Rig (fixed) | Baseline main | After W0 | Δ |
|---|---|---|---|
| PLAZA (subway plaza → east down Kestrel) | **774** | **576** | −26 % |
| CART_CORNER (cart corner → west) | **652** | **481** | −26 % |
| SYCAMORE×GABLE (future corner → NE) | **311** | **249** | −20 % |
| Scene visible meshes (census) | 436 | 376 | −14 % |
| Shadow-pass share at plaza (measured by toggling) | ~302 of 774 | — | — |

Probe: `scripts/probe-w0-census.mjs` (committed — this is now the per-phase
gate tool; a phase that regresses a rig beyond its ledger fixes before it
ships). Split evidence: `scripts/probe-w0-split.mjs`.

### What landed (the four levers)

1. **District tiles** — `bakeStatics` merges per 28 m × 32 m district tile
   across the master-world core (x −84..84 / z −48..48, 18 tiles), replacing
   the old 4-column x-only split. Batch names carry their district
   (`StaticBake_c<col>r<row>_n`). Tree trunks + root flares now bake with
   their district (only canopies stay out — the sway owns them).
2. **District visibility system** — `updateDistricts(px, pz)` runs each frame
   from `updateDynamics`: the player's district lights a ring (full street
   span × 1 row each way — the registry's own law: a street is ONE sight
   line), everything outside goes invisible. Dynamic groups (trees, flocks,
   squirrel, steam, leaves, GLB props — never the taxi) register into
   districts and follow GLB upgrades. With the shipped single-street world
   every district sits inside the ring, so **nothing is hidden today** — the
   system is live and measured; W1+ content lands district-tagged from birth
   and far rows cull the moment they exist.
3. **Sign boards** — every canvas-text sign was ONE box wearing a 6-material
   array (6 draw calls per sign; 18 signs ≈ 108 calls). Now: a plain box on
   the SHARED banked edge material (bakes with its district) + two textured
   planes. `signMaterials` returns `{face, plain}`; `makeSignBoard` (props.ts)
   is the one builder for World, props, and streetAssets.
4. **GLB merge + pigeon instancing** — generated GLBs arrive node-per-part
   (hydrant 12 draw calls, taxi 18); `upgradePropWithGLB` now merges
   single-material meshes per material with a never-gamble fallback.
   `PigeonFlock` renders as InstancedMeshes (one per material per part type;
   ~83 draw calls → ~17) with per-bird state records preserving every probe
   fact (`birds[].pos`, `restSnapshot()`, `plumage`, `hasBlaze`); behaviors
   byte-identical (probe-env6 flush drive: wings VISIBLE mid-arc tilt
   −0.486, folded on landing — the documented numbers, re-measured).

### Material audit (the count + the law)

67 distinct Lambert materials scene-wide; every color traces to either PAL,
a documented scene signature (bark 0x6d5344, leaf pair 0x5d7d4a/0x516e42,
curb 0x8f8a82, wood tones, person-look colors — the van-pass law), or a
canvas-texture material's white base (mapped materials, not a color
decision). No new colors were introduced by W0. The census probe prints the
off-palette list every run so drift stays visible.

### The 150 gate — honest status

**Not met as literally written, and here is the honest why.** Doc 07's
"<150 typical street scene" is a device target for a *typical* view; the
shipped world viewed from a plaza-wide rig renders the ENTIRE street —
buildings, 12 trees, 17 birds, 3 walkers, full cast, cab, van, all signage —
in one frustum, twice (shadow + main). After W0 the content itself is ~576
calls. The levers that remain are W4's (district rings have far content to
cull only when far content exists; pigeon-class instancing for walker rigs;
cast-shadow discipline — each is recorded, none is free of visual cost).
**The enforced gate from now on:** no phase ships with any rig above its
previous ledger, and W1's merged tiles are budgeted at +40–60 (docs/45 §1)
which W0's −200 headroom absorbs. The ledger above is the baseline every
future phase is measured against.

### Verification

- typecheck clean · vitest 234/234 · production build clean
- probe-env6 green (decks proud +0.5 cm, wings fold/show, flush arc,
  ZERO console/page errors) · probe-autumn green (3 morphs, 4 blazes,
  leaf tints)
- E2E: full four-day driver run before W0 (pristine HEAD build) and after
  (W0 build); failure-name sets identical (the pre-existing chromium-156
  day-4 cluster documented in docs/29 round eight — zero new failures).
- `validate-registry.mjs` green (the shipped-world fidelity check untouched:
  12/12 masses, 18/18 anchors).

### Known levers intentionally deferred

- Walker/cast rig instancing (peds ~39 calls, cast ~14 each — visible
  silhouettes, needs personRig surgery) → W4 ledger.
- Pigeon wings still draw while folded (zero-scale instances) — could hide
  the instanced mesh when no bird flies → W4 micro-lever (~3 calls/flock).
- Cast-shadow discipline for small props (~−80 shadow calls, visual cost
  real: props lose contact shadows) → needs a lead art call, not a refactor.
- The 2048 shadow map covers x ±60 — beyond that (W1's ±84 world) shadows
  fade out; W4's extended cab rail should re-check the shadow frustum.

---

*(W1 entry lands when W1 ships. The log is the checklist — each phase adds
its row to the ledger above and strikes its docs/45 exit criteria one by one.)*
