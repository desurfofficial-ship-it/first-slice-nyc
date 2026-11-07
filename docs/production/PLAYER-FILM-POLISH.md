# PLAYER & FIRST-SESSION FILM — POLISH TO FULLEST POTENTIAL

| | |
|---|---|
| Scope | The two things the owner named: the player (rig + feel + sound) and the first-session film (the Doc 02 arrival, 0:00–2:00) |
| Branch | `feat/player-film-polish` (from main `0eb3cca`) |
| Method | Read every law first (personRig, Player, GameCamera, arrival, audio, docs/30 audio rules, the pinned test suites) → upgrade inside the laws → condition-driven in-engine evidence probe (`scripts/probe-player-film-polish.mjs`) → full gate battery |
| Constraint honored | The ArrivalMachine is pinned by `tests/arrival.test.ts` (timings, gates, skip law) — **not one machine timing changed**; every upgrade lives in the view/audio/rig layers |

## What the player gained

1. **Head leads the turn (look-where-you-go)** — `personRig.ts` auto mode now
   converts the same measured yaw rate that banks the body into a smoothed
   head yaw offset (clamped ±0.38 rad, gated by effort): the eyes arrive at
   the corner before the shoulders do. The idle layered head scan is
   untouched (gated by `1 − s`), so nobody standing still changed.
2. **Sprint focus + arm pump** — above the 4.2 walk ceiling the head tips
   forward up to 0.12 rad (eyes on the block, not the shoes), the arm swing
   deepens up to +50 % and the arms tuck (a runner's elbows, ±0.055 rad).
   Driven by MEASURED speed, so walk paces never see it.
3. **Landing recovery (the whole cast's knees)** — the rig now accumulates
   fall distance while airborne (Σ|vy|·dt, teleport-guarded at ±14 m/s) and
   on touchdown converts it into a knee-bend dip (0.03–0.085 m, decaying at
   6.5/s) riding the root bob plus a body pitch. Stair steps (~0.2 m) never
   reach the 0.8 m threshold; a stoop hop, a curb jump or a ladder dismount
   does. Every mover inherits it — the player, Rosa's routes, the kid.
4. **Footsteps (the walker's own rhythm)** — `audio.step()` (one soft
   asphalt tap + low thud, gain-enveloped, docs/30 house rules: synthesized,
   mute-respecting, silent until the first gesture) fired by `Game.frame`
   on each stride half-cycle of the player's rig, grounded only, strength
   scaled with pace (0.35 stroll → 0.9 sprint).

## What the film gained

1. **The film sounds like a film** — the bus rumble loop runs from the ride
   through the driver conversation (the browsers' first-gesture policy
   decides when it becomes audible; the loop's single-owner guard makes
   every earlier call a cheap no-op), the rumble fades under the dip-to-black,
   the terminal PA bell (`announce()`) greets the coach while the screen is
   dark, and the two-note door chime rides the door slide — the same voice
   the M121 pairs with its own doors. Skip paths stop the loop at the handover.
2. **The ride became a shot** — a slow easeSine push toward the glass
   (z 100 → 99.35) with a gentle downward settle of the eye line
   (−0.7 → −0.95) across the whole ride, then a further inch of push while
   the coach creeps to the gate. Both motions are forward and downward only —
   the dome-exit margin (the staging note at RIDE_POS) keeps or shrinks every
   ray length — and the tween setters refuse to write once the film has left
   these phases, so a fast tap-through can never fight the card's push-in.
3. **The living bus** — the lens sways on its suspension (±2 cm rolling,
   ±9 mm idling, two incommensurate sines). The interior rides the camera,
   so the world is what wobbles past the glass — exactly what a bus window
   feels like. Nothing the staging cone (or the dome-exit math) can feel.
4. **Glass with presence** — a faint warm reflection of the ceiling lamps
   on the window (one additive plane, opacity 0.055, just proud of the tint
   so the rasterizer never ties them).
5. **The bay waits with you** — two honestly-scaled figures (1.55 m, 1.4 m;
   legs+torso+head, one merged geometry each) stand in the lamplight pool by
   the east bench. They live on the APRON because the gate doors sit behind
   the coach body from every shipped film lens — the first draft put them in
   the door panes and the evidence probe proved them occluded (dead geometry
   by the audit's own standard), so they moved to where the establishing
   frame actually sees.
6. **The coach breathes** — two settled exhaust wisps astern (the
   chimney-smoke trick: stillness reads as distance at film scale).

## Evidence (`evidence/before/` + `evidence/after/`, mirrored `web-three/shots/polish-*`)

Condition-driven probe — every step polls the live rig/phase, never wall-clock
(software-GL runs the film clock ~3× slow; a timed step would misfire):

| Shot | Before | After |
|---|---|---|
| Sprint close-up (follow cam) | plain jog, arms level | deep lean, arm tuck, eyes forward — `player-sprint.png` |
| Walk (follow cam) | — | speed-matched stride mid-frame — `player-walk.png` |
| Idle close-up | — | layered scan + breathe — `player-idle.png` |
| Landing | (feature absent — poll cannot fire) | dip fired then decayed — `player-landing.png` |
| Ride early / light-up | static viewport | push + sway + glass reflection — `film-ride-early.png`, `film-ride-lit.png` |
| Driver line / title / handover | — | same beats, now scored — `film-driver-line.png`, `film-title.png` |
| The bay waits | — | two figures in the lamplight — `film-gate-waiters.png` |

Rig metrics (probe reads, before → after): sprint arm z 0.090 → **0.134** ·
sprint head pitch 0 → **−0.083 rad** · landing dip null → **fired then decayed**
(poll `landDip > 0.01` succeeds; the read lands after the absorb) · idle scan
unchanged · walk stride unchanged (4.2 m/s, hip ±0.70 rad — the pinned laws).

## Gates (all green on the branch)

tsc clean · vitest **1020/1020** (69 files — the machine, rig, player,
camera suites untouched and passing) · production build OK ·
probe-interior-dressing PASS · probe-w5-interiors PASS · probe-ped-nav OK ·
probe-nav 9/9 · probe-world-sim 15/15 · probe-player-film-polish 0 page
errors on both passes.

## Performance

The rig upgrades are arithmetic (zero new geometry); the film additions are
~10 one-shot meshes + 2 canvas textures + 1 shared reflection texture inside
the film's own group, disposed at the handover. Nothing on the street changed:
the world census, per-room draws and the B13 ledger are untouched.

## Honest notes

- The evidence probe needed three framing passes: a parked lens keeps
  missing a moving subject, so the walk/sprint shots use the game's own
  follow camera (the honest gameplay view anyway), and the apron figures
  moved because the first placement was provably invisible.
- Under software-GL the film clock and tweens run ~3× slower than real time
  (the same pre-existing constraint the register records for the E2E); the
  probe drives by phase/condition, so the film itself is unaffected — on
  real iron the timing is the shipped timing.
- The machine's REPLY_TAP_GATE / RIDE_TAP_GATE / CARD_SECONDS are untouched;
  `tests/arrival.test.ts` passes byte-identical.
