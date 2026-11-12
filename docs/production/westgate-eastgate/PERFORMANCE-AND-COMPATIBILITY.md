# PERFORMANCE AND COMPATIBILITY — the Westgate & Eastgate rows (W7)

## The measured frame (same sandbox, same build pipeline)

| Gate | Result |
|---|---|
| `validate-registry` | OK — 168 IDs, 81 buildings, 5 streets, 7 parks, 11 interiors; 24/24 W7 masses pinned verbatim; 23/23 anchors |
| `tsc --noEmit` | clean |
| `vitest run` | **1496/1496** (91 files; +7 W7 guards over the 1489 baseline) |
| `npm run build` | OK (683 ms) |
| `probe-w7-gates` (new) | OK — 3 sheds, 49 escape bays, 24 masses in the colliders, the wall line at x ±100, the Westgate rig at **116 draws**, 6 evidence shots, zero page errors |
| `probe-neighborhood` | OK — the W6 fabric survives on the grown tree (36 escape meshes, 36 props, 70 terrace panes, dusk warmth 1.3) |
| `probe-city-fabric` | OK — draws 168 (the sky rows moved ∓122 with the budget holding) |
| `probe-world-sim` | **15/15** (1,426 sim-min) |
| `probe-nav` | **9/9** (63.7 s) |
| `probe-a3-flip` | complete (shipped + W6 + W7 all flip from the registry) |
| `probe-chokepoints` | **5/5** — 0 legality hits under load |
| `probe-integration` | exit 0, ERRORS 0, 8/8 walks, calls 171, tris 401k |
| `probe-world-visual-quality` | OK — all nine VQ laws survive, **calls 168 < 200**, tris 399.6k |
| 4-day story E2E | **0 failures, 570 s, console clean** (the documented slow-machine knobs: E2E_SCALE 0.6, 600×440 — the sandbox was pace-capped ×4 that day; a ×1 run of the same tree passed day-1 and day-2's full sequences before the tool's own wall clock cut it) |

## What the strips cost

- **Draw calls: zero net.** The strips' geometry pre-bakes into the c0/c5
  edge tiles (the districtKey clamp law — the same law the W6 strips rode).
  The whole game stays at 168–171 calls.
- **Triangles: +~14k** (the 24 masses, the slabs, the sheds, the escapes,
  16 trees). The budget probe holds at 399.6k.
- **The ring law carries the strips**: the edge tiles light whenever any
  E–W street row lights (a street is ONE sight line — the strips are 16 m
  beyond the old walls and every vanishing point sees them). The edge
  tiles' vertex load grew; the frame budget held on every probe rig.

## The walker laws this wave grew (all unit-pinned)

1. **The band's core clamp follows the registry** — `bandOfLoop` clamped to
   the old x ±84 hard-coded; strip routes would have ground at the seam.
   Now x ±100 (the registry's own bounds), pinned by `tests/crowd.test.ts`.
2. **The spine grid anchors at multiples of GRID_STEP inside the span** —
   the X_SPAN growth would otherwise have shifted the whole lane chain and
   stranded the pinned −42/−36/… node set (`tests/sim-nav.test.ts`).
3. **The commute follower tracks tightly** (`nextWaypointDistance` 0.7 →
   0.3 on path swap) — the shipped 0.7 corner cut overshoots ~0.35 m at a
   curb-cut skirt whose road margin is 0.25 m.
4. **A pedestrian slows for a corner** — the seek force at a 90° corner
   (desired − current ≈ 1.56 m/s) rotates the velocity at ~1.4 rad/s; a
   cruise-speed turn overshoots ~0.8 m past the switch. The cap is the
   velocity-vs-target heading (the vehicle IS cornering), scaled to the
   shipped per-walker cruise.
5. **Nobody stands inside a building** — the resolve's 4th hard guarantee:
   the registry's solid footprints (minus the passable set) depenetrate a
   separation half-push back to the nearest face. The world passes its own
   walls to the walker resolve; the headless harness mirrors it.

## Compatibility

- No renderer migration, no new dependencies, no geodata, no ODbL data.
- The palette law holds: the sheds' two tones joined NEIGH
  (`shedGreen` — the source's own 0x214f37 — and `shedPly`); every vertex
  color stays inside PAL ∪ WEAR ∪ FABRIC ∪ NEIGH (pinned).
- Save compatibility: zero new save fields (the two interactions ride the
  one-day-slot law); a pre-W7 save boots unchanged.
