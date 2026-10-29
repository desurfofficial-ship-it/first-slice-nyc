# Doc 27 — Field Bugs, Round Two: the six complaints, closed

> Playtest 2026-10-29, round three. Six complaints came back from the phone.
> Every one was reproduced first, then fixed at the root, then pinned by a
> regression check. Nothing here was fixed by guessing.

The six, verbatim: *"I didnt see any kid in day 2, the kid u was told to pick,
and the hand was still raised up after climbing the ladder, the are bugs in
climbing the ladder too, the player passed through a car, the camera view is
looking wierd, the control buttons look wierder."*

## FB-1 · P1 — The kid was invisible ("I didnt see any kid in day 2")

**Obs.** Day 2 plays to the end. The kid is never seen — not at the delivery,
not at the dusk wave. The save says `kid_kept: true`. The autotest said
`kidSil.visible === true`. Everyone was telling the truth.

**Root cause.** The oracle (main.gd `_build_day2_props`) parks the kid at
z 7.86 and the oracle's kid is a *capsule* (radius 0.32): its front pokes to
z 7.99, past the lit window box (front face z 7.90) — a silhouette against
the light, exactly as authored. The web port's kid is an *articulated person*
(body depth 0.15 at scale 0.5): same z, front at 7.935 — **behind** the
window's front face. The emissive window rendered over him. A visible kid,
drawn invisible by a quarter-glass overlap.

**Fix.** `World.ts`: the kid stands at z **7.78** — front at 7.855, clearly in
front of the glass, backlit by the window he watches you through.

**Proof.** E2E now asserts `kidSil.position.z < 7.9` ("kid silhouette stands
IN FRONT of the window glass"). Portrait frame: the small dark shape in the
lit gold window. Before/after behavior identical to the oracle's.

## FB-2 · P1 — The hand stayed raised ("the hand was still raised up after climbing the ladder")

**Obs.** One ladder ride, and the player walks the rest of the day with both
arms overhead — the climb pose, forever.

**Root cause.** `Game.frame` passed `{ mode: 'climb' }` to the animator while
on a ladder and `undefined` otherwise — and `updatePersonAnim` only overwrites
`rig.mode` when a mode is *given*. 'climb' was a one-way door. Measured live:
`rigMode: "climb", armR: -2.62 rad, climbing: false`.

**Fix.** `Game.ts`: the player's mode is explicit every frame — `climb` on the
ladder, `auto` off it. The cast keeps owning their own modes (Rosa sweeps,
the kid's wave is tween-flipped back).

**Proof.** E2E: "climb pose released after stepping off (hands down)".

## FB-3 · P1 — Climbing bugs ("the are bugs in climbing the ladder too")

Three, all real:

1. **The rail couldn't hold you.** The oracle zeroes climb velocity *before*
   `move_and_slide`, so it stops at the rail. The port moved *first* and
   capped *after* — every frame holding W crept ~4 cm past the top, until the
   trigger volume's edge let go mid-air (ladder 1: drop from 4.84 onto the
   landing; you fell off the top you had just climbed). Fix: hard position
   clamp at `ladder.top` (`Player.ts`). E2E: "ladder caps at the rail — no
   overshoot (y=8.35)".
2. **Rosa scolded success.** Step off at the top onto the landing — which is
   the *correct* move — and she'd call you back: "Fire escape! Around the
   corner!" The stumble-hint fired for any ladder leave + touchdown. Fix: the
   hint only fires when you're back on the *ground* (`capsule.y < 1.0`).
3. **The grab jolt.** The climb visual leaned the body 0.42 m into the wall
   with a hard snap on grab and release. Now lerped at 10/s (`Game.ts`).

## FB-4 · P1 — The car was a ghost ("the player passed through a car")

**Obs.** The cab drove through you, mid-street, any day, any time.

**Root cause.** The taxi shipped as "a moving lantern, not a wall" — no
collider — and the old yield rule only watched a 7 m window of street, so a
cab still 20 m west barreled through the crosswalk at 9 m/s.

**Fix.** `World.ts`: the cab carries a real collider (a moving AABB, updated
every frame) and behaves like a city cab: it holds at the crosswalk stop line
while the crosswalk is occupied, and brakes for anyone in the road ahead —
creep from 10 m, stop 4.5 m short. Walk into a held cab and it is a wall.

**Proof.** Live: player walks into the cab's nose, clamps exactly at
`maxX + 0.35` (`blockedByCab: true`). E2E waits for the cab to clear the
crossing before crossing — like you would.

## FB-5 · P1 — The camera ("the camera view is looking wierd")

Three compounding findings:

1. **Portrait fisheye.** KEEP_WIDTH at phone aspects produced a **102.7°
   vertical fov** (390×844): crosswalk stripes fanned, buildings sheared into
   diagonal wedges. Fix: the vertical fov caps at **91°** — the reference's
   own 720×1280 value. Horizontal stays 60° for every aspect at or above
   reference portrait.
2. **The camera went inside buildings.** Nothing stopped the boom from
   ending inside a south building or a fire-escape landing — walls render
   one-sided, so the building silently vanished, and the landing's ink top
   face filled the whole frame at street level (the flat-brown screen).
   First fix (a 14-step ray march) *missed thin slabs*; final fix: an exact
   ray-vs-AABB slab test, pull-in 0.35 m before the hit (`GameCamera.ts`).
3. **The flip-flop.** The street-side yaw flip sat exactly on the crossing
   line (z = -2.5); loiter there and the target yaw flips every frame.
   Fix: a 1.2 m dead band — flip south at z < -3.1, back north only past
   z > -1.9.

**Proof.** Live: the formerly-brown mid-street view renders the street, the
teal door, the stoop. `fov: 91.0` in portrait, buildings straight. Yaw
oscillation at the old flip line: 0.000 over 1.5 s.

## FB-6 · P1 — The controls ("the control buttons look wierder")

**Obs.** On a phone, touching the left half showed *nothing at all*, the
interact button was a bare "●" on a gold disc, and the turn arrows had no
pressed state.

**Root cause (the big one).** The joystick base was positioned with *viewport*
coordinates inside `#joy-zone` — an element whose top edge sits at 56% of the
screen. A touch at y 700 wrote `top: 700px` *inside the zone* → the joystick
rendered at viewport y 1123 on an 852-tall phone: **271 px below the glass**.
You touched, and nothing appeared.

**Fix.** `Input.ts` converts client coords into the zone's local space. The
set is redesigned (`index.html`, `style.css`): a labeled **USE** button with
an in-range glow (the `.occupied` CSS hook existed; nothing ever wired it —
now `UI.setPrompt` does), turn buttons with real pressed/held states, a
joystick with a rim, knob shadow, and a home that is always under your thumb.

**Proof.** Live: touch at (90, 700) → base at (34, 644) → centered exactly
under the thumb, on screen.

## Harness honesty

- The E2E driver grew four regression checks (rail cap, pose release, kid at
  the glass, cab-clear wait) and three poll-based waits — software rendering
  runs sim time slower than real time, and a fixed sleep can sample the
  *middle* of a designed flicker.
- One harness race fixed for real: on boot with an existing save, `beginDay`
  holds `s.day` at its default until its 700 ms fade ends; the driver's
  fresh-start check read `s.day`, skipped the reload, and ran the whole suite
  against a Day-2 replay (every interaction "dead", money $111). It now reads
  `bootedFromDay` — the save as it was at boot.

## Verdict

Full battery after the fixes: **E2E 0 failures, 98 s** (Day 1 + Day 2, real
input, real physics) · unit tests 56/56 · typecheck clean. The kid watches
the corner from his window. Your hands come back down after the ladder. The
cab waits. The camera keeps its head outside the walls. The buttons answer
your thumb.
