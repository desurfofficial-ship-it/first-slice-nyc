# Walk-Cycle & Fire-Escape Notes — the cast finally moves like people

**What this is:** the second playtest round (2026-10-29, browser build) came back with two physical complaints — *"the characters doesn't walk, they move"* and *"the stairs also looks weird"* — plus a standing order to *search for bugs yourself*. This doc records what was actually broken, what was rebuilt, and the evidence that each fix is real. Everything here is the `web-three/` browser implementation; the Godot oracle is untouched.

**The one-paragraph diagnosis.** Every person in the game was rigid. The built-in `buildPerson()` was a single flat group of boxes — no pivots, nothing to animate — and the runtime swap to the tools3d-generated GLBs made it worse, not better: those exports are static meshes (**0 animations, 0 skins** — verified by parsing the GLB JSON of all eight files), so when they loaded, the cast became mannequins that translated across the ground. Walking is a rotation problem, and nothing in the scene graph could rotate. The fire escape had the same disease one level up: two floating planks (0.6 × 4.4 × 0.08 slabs) standing in for ladders, two solid 0.9 m slabs standing in for guardrails — geometry with no story.

---

## 1. The rig — `personRig.ts`

The cast is now built as an articulated hierarchy and animated by one engine, `src/world/personRig.ts`:

| Part | Pivot | What hangs from it |
|---|---|---|
| `root` | group origin | everything; carries stride bob + forward lean |
| `hipL` / `hipR` | y = 0.72 | leg box (−0.31) + boot (−0.67) |
| `armL` / `armR` | shoulder, y = 1.28 abs | arm box (−0.22) + hand (−0.5) |
| `body` | y = 0.72 | torso, both arms, head — carries the idle breathe |
| `head` | y = 1.50 abs | head, hair, bun/cap — idle glances |

Design rules, and why they hold:

- **One writer.** `updatePersonAnim()` is the only code that touches those rotations. Tweens that need a limb (the kid's wave) take ownership by mode, never by racing the animator frame-to-frame.
- **Speed is measured, not declared.** Each frame the rig diffs the group's own XZ position and smooths it (`smoothSpeed += (speed − smoothSpeed) · min(1, dt·10)`). Consequence: *any* mover gets a walk cycle for free — the capsule-driven player, Rosa's tween route to the counter, Idris's walk-in. A teleport (respawn) reads as one huge delta but the smoothing caps the pose, so nobody whip-snaps into a stride (unit-tested).
- **Effort, not binary.** Swing amplitude scales with normalized effort `s = smoothSpeed / 3.6`, stride frequency scales with `s`; below full speed everything blends, and the phase clock stops when parked so feet land flat.
- **Idle is alive.** Standing cast breathe (body pitch ±0.02 at 2.1 Hz), arms micro-sway, heads glance at 0.6 Hz — each cast member's clock is desynced at build time so the block doesn't breathe in unison.
- **Modes.** `auto` (walk/idle), `climb` (arms up the rails, legs pedal, no lean — the ladder pose), `sweep` (Rosa's broom arm; feet planted, lean into the work), `wave` (animator hands the right arm to a tween).

The DOM-free builder `buildArticulatedPerson()` lives in the module so vitest can build people without a canvas; `World.buildPerson()` is a two-line wrapper supplying its material factory. Limb dimensions are byte-identical to the old rigid build and to `tools3d/procedural_glb.py` — the hierarchy only added pivots, it never moved a box.

## 2. Where the rig is wired

- **Player** — `cast` registry, climb mode forced while `player.ladder !== null`, plus two ladder-feel fixes: the visual hugs the ladder (visual-only −0.42 Z offset; the capsule stays authoritative so step-offs behave exactly as before) and `Player.update()` now eases `rotationY` to π on a ladder, so you face the wall instead of climbing nose-first into the brick.
- **Rosa** — her authored walk to the counter (Doc 24 §5.1 fix) now *looks* like walking: same tween, same route, same 2 m/s — plus hips. On Day 2 the old whole-body ±0.05 rad "sweep" tilt (a metronome) is replaced by a real broom (`World.makeBroom()`, childed to her right hand) + sweep mode.
- **Idris** — walk-in unchanged, but he now faces his direction of travel (π/2) instead of sliding sideways while staring south.
- **The kid** — the dusk wave is an arm now: raise −2.6 rad, wag ±, home. The old version rolled the whole body ±0.55 rad like a bowling pin.
- **Customers** — spawn/remove joins/leaves the `cast` registry; they idle-breathe at the cart.

## 3. The GLB decision (honest bookkeeping)

The local generation pipeline stays (`tools3d/` — TRELLIS clone + `generate_glb.py` for CUDA boxes, `procedural_glb.py` for CPU), and the eight GLBs stay in `public/models/` as artifacts. But the game **no longer fetches them for the cast**: a static GLB over an animated rig is a downgrade, and the swap had a second bug — `applyGlb()`'s `target.clear()` **orphaned the coffee cup prop** (probe evidence: `cupParent: "DETACHED"`), so the Day-2 "cup in hand" beat flipped a visibility flag on an object that was no longer in the scene graph. The cup now stays attached for life (E2E regression check added). Side effect of dropping the GLTFLoader import: the main bundle fell 681 → 610 kB (−71 kB raw). A future *rigged* exporter can re-enter through the loader — that path is documented in the exporter's docstring rather than half-built here.

## 4. The fire escape — "the stairs look weird"

Same colliders, same trigger volumes, same climb feel (E2E depends on all three) — a pure visual rebuild:

- **Ladders:** two stiles (0.06 × H) + rungs every 0.35 m + brackets tying the tops into the brick. Ladder 2's visual moved from x = 16.6 to **16.4** — it had been drifting 0.2 m off its own trigger column.
- **Guardrails:** the solid 0.9 m slabs (they read as walls you could lean on) → open posts at 1.4 m spacing + top bar + mid bar.
- **Braces:** four diagonal struts per pair of landings, wall (z = −8) to landing nose (z = −6.7), leaning into the building like real ironwork.
- **Bonus coherence:** the teal door finally has its **stoop** — two stone risers (tops 0.19 / 0.28, both inside the 0.35 `STEP_UP` curb tolerance so the walker rolls up without a hop). "Stoop = outdoor living room" now has steps to sit on.

## 5. Evidence

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| Unit tests | **56 passed** (44 prior + 12 rig tests: structure, counter-phase walk, arms vs legs, bob/lean, ramp, idle breathe, climb/sweep/wave modes, teleport cap) |
| `npm run build` | clean, 610 kB (−71 kB) |
| Browser E2E (full Day 1 + Day 2, real keys) | **0 failures**, no console errors — incl. two new checks: *"walk cycle swings the hips while moving (max \|hipL\| = 0.552)"* and *"cup prop is still childed to the player visual"* |
| `visual-check.mjs` | postcard PNG VALID 768×1344; touch UI visible at 390×844; new frames: `01b-player-midwalk` (mid-stride, arms counter-swinging), `01c-fire-escape` (rungs + rails + braces), `01d-stoop` (steps under the teal door) |
| Probe `probe-walk-cycle.mjs` | Rosa mid-walk in stride; Day-2 state `{mode:"sweep", armR:-0.2, broom:true}` |

**Known limit, unchanged:** the software-GL probes (SwiftShader/ANGLE) skew perspective at frame edges — a tilted-looking Rosa in a probe frame with a rotation dump of exactly `(0, 1.571, 0)` is the renderer, not the game.
