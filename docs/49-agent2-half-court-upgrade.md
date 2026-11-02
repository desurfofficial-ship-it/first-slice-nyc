# Doc 49 — Agent 2: The Half-Court Upgrade (implementation report)

> The half-court went from a scripted cut-scene to a game: pick up, carry,
> dribble, hold-to-shoot against a visible release band, and a ball whose
> make-or-miss comes out of gravity, rim steel, backboard, ground and net —
> never from a table. Branch `agent2/half-court-upgrade`, off main `0d765ab`.
> The audit that scoped this work is docs/48.

---

## 1. What shipped

### The game loop (new, `web-three/src/court/CourtGame.ts`)
- **Pick up** — the `court` interaction is now "Pick up the ball" (its live
  position FOLLOWS the ball, so a rebound is a thing you chase).
- **Carry & dribble** — the ball rides at your hip; move and it bounces at
  stride pace with honest thuds.
- **Hold-to-shoot** — press and HOLD (Space/E or the touch USE button): the
  ball rises to your shot pocket while a charge meter fills and ping-pongs.
  Release inside the gold band. The band is the closed-form ballistic solve
  for where you stand and it RE-SOLVES every frame — move mid-charge and it
  moves with you. Closer shots get wider bands; deep balls ask for touch.
- **Flight & rebound** — the launch velocity maps from the charge curve;
  from that instant the ball is simulation-only (below). The ball stays
  where it comes down.
- **The block keeps score its way** — day-keyed make/miss notes, the
  3-streak line, the memory line at 5 cumulative makes (all reused from
  content.ts), the save's `hoopMakes` (v1 field, untouched), and a chalk
  tally board on the wall by the hoop that shows the cumulative count.

### The physics (new, `web-three/src/court/ballSim.ts` — pure, no THREE)
- Fixed 1/120 s steps, zero randomness. Same release → same flight, bit
  for bit, on every machine — for players AND probes.
- Contacts resolve push-out-then-reflect against: ground (restitution
  0.62 + rolling friction + spin), backboard face (e 0.55), rim torus
  (circle-of-rim closest-point, e 0.45), pole, and the chain-link walls.
- A score is a DOWNWARD crossing of the rim plane inside the aperture
  (`dist < RIM_R − BALL_R`), once per flight; a made shot drags dead under
  the rim (net drag). An upward pass never scores (tested).
- The gate is a real gap in the sim too: a ball that rolls out through it
  is detectably outside, and the court rolls it back to the free-throw
  line on a smoothstep — the court looks after its ball, honestly.

### The corner (visuals, `courtPaint.ts` + `courtDressing.ts` + World seam)
- One canvas-texture plane replaces the old six separate line meshes —
  and paints a REAL court: boundary, lane box + hash marks, restricted-area
  arc, full free-throw circle (half worn), three-point arc with corner
  stubs, half-court line + center circle, asphalt repairs, pebble, scuffs.
- The net: two rings + 12 zigzag strands in one LineSegments draw call,
  with a damped-spring sway that kicks on every make.
- Chain-link enclosure (west + south runs, gate gap south-east): diagonal-
  weave canvas texture on alpha-tested planes, posts with caps, top rails,
  tension wire. Posts bake into their district tile.
- Foam pole pad (ink + cream band), caged gooseneck light over the board
  (emissive disc warms with dusk via the existing glow pass), chalk tally.
- The ball: 16×12 sphere with a painted leather texture — pebble noise,
  four seam channels, the curved hem lines — spinning from the sim
  (backspin in flight, rolling on the ground).

### Sound (5 one-shot voices in `game/audio.ts`, house rules kept)
Dribble/bounce thud (strength-scaled), rim steel (two detuned partials),
backboard knock, and the swish. Synthesized at boot, gain-enveloped,
mute-respecting, nothing stacked.

### Controls & UI (mobile-first, one button)
- Same button, three meanings by context: tap = pick up · hold = charge ·
  release = shoot. Touch button already 44px+; no page scroll; no new
  gestures to learn.
- The charge meter is transient skill feedback, not HUD chrome: a pill
  above the prompt with the gold band painted in; the fill turns gold as
  it crosses the band. Touch prompt shortens to "Release!" so nothing
  clips behind the turn buttons.
- Desktop prompt reads "Hold to shoot" / "Release in the gold band".

## 2. The proof (all re-runnable)

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `vitest run` | **294/294** (243 before + 51 new court tests: determinism, the skill model from 4 spots, a no-penetration sweep over 11 charges × 3 spots, scoring honesty, containment/gate) |
| `bun run build` | clean (925 kB bundle, +4 kB) |
| `scripts/probe-court.mjs` (real game, desktop + mobile) | **29/29 PASS**, console clean |
| `scripts/probe-court-routes.mjs` (real game) | **8/8 PASS** — traversals, gate, interior, ped exclusion |
| Full 4-day E2E | **104/104 PASS, 0 failures, console clean** (`AUTOTEST OK: 0 failures, 317 s`, exit 0) — run on this sandbox at a 256×192 viewport, the harness's documented slow-machine mitigation for software GL (driver is viewport-agnostic; defaults unchanged at 900×700). See §5.1 for the attempt log. |

Probe highlights (in-engine, desktop AND mobile touch context):
- interact press picks the ball up; the ball rides the hands (0.42 m);
- W walks and the ball dribbles (y swing 0.30 → 0.78);
- hold starts the charge; the meter shows; keyboard OR pointer release
  shoots;
- the deterministic perfect release SCORES, `hoopMakes` 0 → 1 in the save;
- a short release never scores; the rebound stays in play;
- during flights: min ball y 0.230 (never under the slab), min rim-tube
  distance 0.233 (never inside the steel), 0 frames inside the backboard.

## 3. Before / after

- `shots/before-the-court.png` — main@0d765ab: a bare orange dot on plain
  sidewalk, a street tree growing through the "court", the hoop invisible
  behind it, prompt "Shoot around".
- `shots/before-the-shot.png` — the scripted tween mid-flight.
- `shots/court-0-the-court.png` — enclosure, hoop + net + pad, tally board,
  "Pick up the ball".
- `shots/court-1-pickup.png` / `court-2-the-make.png` (tally reads
  BUCKETS 1, note fires) / `court-3-the-miss.png` / `court-4-mobile-charge.png`
  (portrait: meter + "Release!" + USE button, fence faded, hoop framed) /
  `court-5-mobile-make.png`.

## 4. Performance & integration notes

- Net draw-call effect at the court: −6 (old line meshes) +13 new named
  meshes (paint plane, 2 weaves, net lines, tally, pad ×2, light ×3, gate
  posts ×2, ball) — all but the weaves/net/tally/light-glow bake into the
  district tiles per the W0 system. The weave fades point-blank (camera
  proximity) instead of walling the lens; the boom also skips the fence
  colliders (`seeThroughCamera` on the AABB — bodies stop, lenses don't).
- No new dependencies, no new asset files, everything canvas-generated.
- Save v1 untouched (`hoopMakes` keeps its meaning; the tally re-reads it
  at boot, so the board is right after a reload).

## 5. Honest limitations & the one design decision for Main Agent

1. **The full E2E debt is PAID (this session).** `AUTOTEST OK: 0 failures,
   317 s` — **104/104 PASS, exit 0, console clean**, including every
   day-4 leg. The earlier stalls were the sandbox, not the branch: two
   background runs were reaped by the environment's process reaper, one
   foreground run at 320×240 got 92/104 before the 600 s command cap cut
   it mid-goodnight-rail, and the original three stalled under
   concurrent build load. The green run uses the 256×192 viewport — the
   mitigation scripts/e2e.mjs itself documents for software-GL machines
   (small viewport raises fps until dt stops clamping; the driver is
   viewport-agnostic; defaults stay 900×700). No game or driver code was
   touched to make it pass.
2. **Design decision flagged for review:** the chain-link enclosure means
   through-traffic passes the court via the south lane edge + the gate —
   the fenced court owns its block of sidewalk, like the real ones. The
   E2E is unaffected (no authored leg goes near it), and both traverses
   are probe-proven. If Main Agent prefers a fully open through-lane, the
   one-line change is shortening the west run (z span) — the sim already
   honors whatever `COURT_BOUNDS` says.
3. **One coordinate fix outside the module, for review:** the W1 Kestrel
   fill planted a street tree at (44, 7.48) — inside the court, in front
   of the rim. Moved to (48.8, 7.48), same row, same law, marked in code.
4. A player can carry the ball anywhere on the block (no drop verb). The
   ball rides the hip; nothing breaks; a new morning snaps it home.
5. The release band's difficulty is tuned for 30 fps thumbs (one frame
   ≈ 0.028 charge vs band ≥ 0.03). At very low fps (software GL) timing
   is coarser — a probe harness uses the deterministic `testRelease`
   seam for exactly this reason.

## 6. Files

**New (basketball-owned):** `src/court/ballSim.ts`, `src/court/Basketball.ts`,
`src/court/courtPaint.ts`, `src/court/courtDressing.ts`,
`src/court/CourtGame.ts`, `tests/court.test.ts`,
`scripts/probe-court.mjs`, `scripts/probe-court-routes.mjs`,
`docs/48-agent2-half-court-audit.md`, `docs/49-agent2-half-court-upgrade.md`.

**Shared seams (documented, minimal):** `Game.ts` (scripted shot → court
hand-off, update hook, prompts, dusk glow), `interactionDefs.ts` (court def
+ live rest spot), `Input.ts` (+`interactHeld`), `UI.ts` (+meter),
`audio.ts` (+5 voices), `index.html`/`style.css` (+meter), `World.ts`
(`buildCourt` body, +tree move), `collide.ts` (+optional `seeThroughCamera`),
`GameCamera.ts` (+1 skip line), `content.ts` (one stale line made true),
`tests/interactions.test.ts` (court contract updated to pickup/holding).
