# The authored postcard's depth of field — the v1.54.0 wave

Companion to 01 (audit) · 02 (technique evaluation) · 03 (plan) · 04 (the
graphics wave's results). This wave pays the evaluation's own carve-out:
DOF was deferred for the gameplay frame ("focus hunting fights gameplay
readability") with exactly one exception — *"The postcard rig could adopt
it later (authored poses only)."* Later arrived.

## 1. What shipped

| # | Deliverable | Where |
|---|---|---|
| 1 | The DOF capture chain (`RenderPass → CaptureDofPass → OutputPass`), one-shot at capture time | `src/render/postcardDof.ts` |
| 2 | The resolver contract: `?dof=0|1`, every tier defaults on, `?fx=off` wins | `src/render/quality.ts` (+6 pins in `tests/render-postcard-dof.test.ts`) |
| 3 | The authored focus law: focus = capture camera → the pose's look-at target | `focusDistance` + the three `Game.ts` call sites |
| 4 | The exclusion law on the depth bake (the AO prepass's, shared list) | `CaptureDofPass` (a `BokehPass` subclass, the `CityAOPass` shape) |
| 5 | The wow-card pose fix (§6 — a real defect the evidence caught) | `Game.ts` wow capture |
| 6 | Evidence pairs | `docs/rendering/evidence/postcard-*.png` |
| 7 | The capture probe (zero page errors, cards differ, gate) | `scripts/diag-postcard-dof.mjs` |

## 2. The math (independent implementation; no reference code copied)

The DOF chapter's idea, on three's MIT-licensed `BokehPass` (the same
dependency law as the wave's bloom/AO):

- one depth prepass — the scene through `MeshDepthMaterial`
  (RGBA-packed), hidden-list applied around it;
- circle of confusion per pixel: `factor = focus + viewZ` (viewZ ≤ 0),
  blur radius `clamp(factor · aperture, −maxblur, +maxblur)` in UV units;
- the composite gathers by that radius.

`aperture` converts world-units-off-focus into UV blur; `maxblur` caps the
far field at a haze, never a mush. Tuned on the captures
(`CAPTURE_DOF_TUNING`): a subject ~6 world units off the focal plane blurs
near the cap (6 · 0.0011 ≈ 0.0062); the tests pin that ratio and the clamp
band, so a wild authored distance or constant cannot nuke a card.

## 3. The authored focus law

Every capture rig already names its subject: the pose's `lookAt` point.
The focal plane rides it — `focus = |capCam.position − look|` (`Math.hypot`,
pure, test-pinned against the day-end glide pose). No new authoring burden;
a rig that can compose a shot has already focused it.

## 4. The chain, and the tonemap delta (intended, documented)

The capture is one shot at 768×1160 on a story beat — never a frame pass;
the gameplay loop is untouched on every tier (low tier included: the
capture cost is ~2 scene renders + 2 fullscreen quads, once per card).

The direct RT render never tone-mapped (r186 applies tone mapping to the
canvas only — `WebGLPrograms.js:179–184`, verified in the graphics wave).
The DOF chain ends in `OutputPass`, which applies the renderer's own
`NeutralToneMapping` + sRGB once — **the cards gain the game's graded look
and lose the washed flatness the direct path baked in.** The evidence pair
(`postcard-wow-pose-after.png` → `postcard-dof-after.png`) isolates it:
same pose, same lights, the after reads richer and the background falls
soft. Read-back rides a raw blit into a `LinearSRGBColorSpace` byte target
(`OutputPass` already encoded; no double conversion), then the same Y-flip
and variance guard as the direct path. A DOF capture that fails for any
reason falls back **silently** to the direct render — the card must exist;
the effect must never wedge the beat (the wow card's own law).

## 5. The URL contract (additive)

- `?dof=0` — the card renders today's direct path (per-effect independence,
  same shape as `?bloom=`/`?ssao=`).
- `?dof=1` — explicit on (the default everywhere).
- `?fx=off` wins over everything — the shipped slow-machine affordance
  keeps the bit-for-bit card. The FS-QA2-004 own-key law holds: `?dof=`
  parses through the same `flagOf`, and `__proto__`-class keys cannot reach
  the flag (pinned in `tests/render-postcard-dof.test.ts`).

## 6. The defect the evidence caught: the wow card's pose

The first probe run exposed it: the square's card — Doc 02's beat #1, the
UGC flywheel's anchor — rendered as a **flat facade close-up**: two screens
on a blank wall, no plaza, no sky. Root cause, pure geometry: the shipped
pose (camera (−326, 1.9, 10.5) → look (−326, 13.5, −7.9)) tilted up 32.2°,
so the frame's bottom edge ray stayed 4.7° **above** the horizon — the
"warm plaza below" the pose's own comment promises was mathematically out
of frame. Pre-existing on main (reproduced on a clean `7be6373` build), not
a graphics-wave regression.

The fix was judged in-engine, not on paper (`scripts/diag-wow-pose.mjs`
renders candidates through the live rig; the zone-visibility law means the
square only exists for a player inside it — the probe walks in first):

| Candidate | Pose | Verdict |
|---|---|---|
| A | (−326, 3.4, 24) → (−326, 10.5, −7.9) | vista, but the tower reads small |
| **B/D (shipped)** | **(−326, 2.4, 20) → (−326, 8.0, −7.9)** | **tower fills the frame, screens top-two-thirds, plaza + stair + walkers below** |
| C | shipped spot, lower look | plaza still out of frame |

The shipped card now matches its authored sentence word for word, and the
DOF sells it: the screens sit on the focal plane (crisp), the foreground
stair and walkers fall soft, the tower's base reads depth. Evidence:
`postcard-wow-pose-before.png` → `postcard-wow-pose-after.png` (same direct
render both sides — the pose is the only variable), then
`postcard-dof-after.png` (the chain's delta on top).

## 7. Gates

- `npx tsc --noEmit` — clean.
- `npx vitest run` — 1,536/1,536 across 96 files (+4: render-postcard-dof;
  the existing quality/postcard pins ride green).
- `npx vite build` — OK (~0.7 s; the chain adds ~3 kB minified).
- `scripts/diag-postcard-dof.mjs` — both boots zero page errors; both cards
  valid PNGs; `DIFFER: YES`; **GATE: PASS** (run on SwiftShader, low tier —
  the capture-time cost law in action).
- 4-day story E2E — 0 failures, console clean (the day-end card exercises
  the DOF chain four times; the wow card once via the square).

## 8. Licensing

No `.frag`/`.vert`/`.cxx` text from the reference repository is copied —
the CoC mathematics are implemented independently; the blur gather is
three.js's own MIT-licensed `BokehPass`, already in the dependency tree
(same law as the wave's bloom/AO). THIRD-PARTY-NOTICES.md needs no new
entry.
