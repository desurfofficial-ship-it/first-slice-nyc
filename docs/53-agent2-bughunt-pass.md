# Doc 53 — Agent 2: the bug-hunt pass (the sweep that found five real bugs)

> **Status: built, probed, and green.** A continue-and-polish pass on
> `agent2/session-polish`, starting from a merge of main's zone-bake tip
> (`0a9ed2c`). The method was new for this branch: instead of auditing
> docs, drive the whole first-session journey in the running game and
> *look at it* — a sweep probe (`scripts/probe-bughunt.mjs`) teleports
> through every room with screenshots, camera diagnostics, and a clean-
> console gate. Five real bugs came out of it; each fix carries its
> permanent guard.

---

## 1. The sweep

`probe-bughunt.mjs` visits fifteen stops — terminal bay, M121 interior,
terminal front, the stair head, the fare bank, platform A, the train
interior, 42nd St platform, the square plaza, the red steps (on the
registry anchor), the Orpheum, the court, the bodega, the cart corner,
the home block — and at each stop records feet, camera position,
`interiorMode`/`underground` state, visible-mesh census, and a
screenshot. Console must stay clean at every stop. Two contract checks
ride along: the note lifecycle (a note shows, fades, and truly hides)
and the zone bake's keep-set (every by-reference mesh still IN THE
SCENE after boot).

## 2. The five bugs

### 1. The zone bake walled the cutaway shut — and killed the fare spin
**Found:** the sweep's below-grade stops rendered flat brown slabs where
the platform diorama should be; camera positions were correct, so the
*view* was blocked, not the camera.

**Root cause:** docs/47's zone bake merges a zone group's statics into
`ZoneBake_*` batches — which DETACHES the source meshes. `subway/index.ts`
holds two by-reference sets it mutates per-frame: the station ceilings
(`ceiling.visible = !under` — the dollhouse lid, docs/50 §5) and the
turnstile hubs/arms (the fare-pass spin, docs/52 §4.6). After the bake,
both writes landed on detached objects: from the elevated diorama camera
the ceiling slab stayed up and filled the frame, and the spin went
visually dead while its probe kept measuring the detached mesh's
rotation — a probe reading a ghost.

**Fix:** `stationKit.ts` exports `ZONE_KEEP_RE` (the by-reference set:
`SUB_Ceiling_`, `SUB_Turnstile*`); the bake never merges a name it
matches; the TSS banners (sway by reference) join the animated skip.
**Guards:** three `ZONE_KEEP_RE` laws in `tests/subway.test.ts`; the
sweep asserts all five keep-set names IN THE SCENE after boot; the
cutaway now renders pixel-matched to the pre-bake view (shots `bh-06`/
`bh-07` vs `shots-prebake/`). Cost of honesty: +28 visible meshes vs the
broken bake — still −173 vs pre-bake.

### 2. A note never left
**Found:** every sweep shot carried the boot greeting *and* every note
ever shown, minutes later.

**Root cause:** `showNote()` (~30 call sites) had no exit — the element
ships `hidden` + an entrance animation, but nothing ever hides it; and
`#note`'s `display` rule outranks the `[hidden]` attribute, so even the
attribute is a no-op. Every narration line stuck until the next replaced
it ("You are here. That's enough." lived for minutes).

**Fix:** `showNote(text, ttl = 6500)` — the line fades (`note-fade`)
after 6.5 s and then truly hides (`.gone { display: none }` + `hidden`
for a11y truth). **Guard:** the sweep lives the whole lifecycle — boot
note dismisses; a fresh note shows and re-clears.

### 3. `snapBehind` ignored `interiorMode` (latent, docs/50 class)
**Root cause:** `update()` skips `shortenBoom` below grade; `snapBehind`
— the instant path (boot today, any fast-travel tomorrow) — always
shortened. A snap under the terminal parks the lens on the invisible
yard slab. **Fix:** the interiorMode law in both paths. **Guard:** two
camera laws — above grade the snap still shortens; below grade the boom
reaches full desired length through where the wall would be.

### 4. The seam teleported platform-standers 288 m
**Found:** driving the ride by hand, `requestRide` fired while standing
on the *platform* (not aboard) — the machine ran, and at t=12 the swap
translated the player to 42nd St without a train. Reachable for real by
stepping back out during the 1.2 s closing phase (the door collider only
exists once the doors are shut).

**Fix:** `ride.ts` exports the car's aboard band (`aboardCar`, body z
14.7..17.2 + capsule margin); the swap applies only aboard. A left-
behind player keeps their ground while the machine runs its honest
timeline — the arrival's own doors-open event frees them, the platform
retire check ends the ride, the parked train reopens for the next
boarding. The real boarding is untouched (aboard at the seam, as
always). **Guards:** two `aboardCar` laws + four probe-subway laws
driven through the real machine (starts · keeps their x · the ride
continues · the arrival releases them to idle, doors open).

### 5. The curb car parked across the gate through-line
**Found:** `probe-court-routes` failed its two traverse checks — the
walker wedged at x 41.45. W4 part 2's `Parked_Kestrel_E` (first draft
x 44, north face z 4.02) sat exactly where the half-court's fence
(z 4.49, x 40.45..45.3) leaves the curb a **0.47 m squeeze** — no 0.7 m
body fits, so docs/49's pinned ped route ("swing south… come up through
the gate") was impassable and the gate unreachable from the west. Two
shipped features, one curb.

**Reconciliation:** the car parks at x 51 — east of the gate posts,
still the registry's "Kestrel N curb east end", clear of every traverse
leg. The move is made in the one place twice declared (World's `car()`
+ `busRoute`'s `PARKED_CAR_RECTS` — both movers' yield pools read that
one list) and the bus test's lane law follows (`[51, −44]`). The route
probe now waits for the M121 to clear the walking band before each leg —
it measures *walkability*, not traffic; a mid-leg walker and a yielding
bus deadlock until the budget expires, which had read as two failures
that weren't route failures. The registry plan note records the move.

## 3. What the sweep cleared (no bug found)

The M121 interior is cramped at 90° to the aisle — that is the
established interior language (the bodega reads the same); boarding
walks the aisle. The red steps from directly above read as a tan slab —
that is the canopy roof; from gameplay angles the staircase reads red
(`diag-steps-follow.png`). The 42nd St platform, the busker, the court,
the terminal bay, the square's crowd all render and behave.

## 4. The proof (all re-run on this branch's tip)

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `vitest run` | **387/387** (380 shipped + 2 snapBehind laws + 3 ZONE_KEEP_RE laws + 2 aboardCar laws) |
| `bun run build` | clean |
| `scripts/probe-bughunt.mjs` (new) | CLEAN — 15 stops, console 0 errors, note lifecycle PASS, keep-set IN SCENE |
| `scripts/probe-subway.mjs` | **ALL PASS** (26 checks incl. the 4 left-behind laws) |
| `scripts/probe-court-routes.mjs` | **ALL PASS 8/8** |
| `scripts/probe-w4-bus.mjs` | OK 13/13 (weave takes the new curb slot) |
| `scripts/probe-court.mjs` / `probe-solid.mjs` / `probe-peds.mjs` | ALL PASS / ALL CLEAN / OK |
| `scripts/probe-subway-mobile.mjs` | ALL PASS |
| `scripts/probe-polish-shots.mjs` | clean (arms live and spinning) |
| **Full 4-day E2E** (`?autotest=1`, 256×192) | **AUTOTEST OK: 0 failures, 329 s, console clean** |

Visual evidence: `shots/bh-01..15` (the sweep), `shots/bh-06/bh-07`
vs `shots-prebake/` (the cutaway, before/after the keep-set fix),
`shots/diag-steps-follow.png` (the steps at gameplay angle).

## 5. Honest limitations

1. **No physical device touched this build** — every number is
   SwiftShader software-GL; mobile is the documented 256×192 harness
   mitigation plus `probe-subway-mobile` in portrait.
2. **The sweep teleports; players walk.** Each stop was sanity-matched
   against the real flows (the E2E walks the journey; the probes board
   and descend for real), but a teleport cannot prove the *transition*
   into a view — the full-E2E green is what covers transitions.
3. **docs/50 §4.1/§4.2 remain Main Agent's** (the authored opening
   inside the bus; the sync beat as a Postcard). The hand-off pieces
   stay exported and waiting.
4. The interior close-follow (bus at 90°, bodega) is the shipped
   language; if it ever reads as a bug, the fix is an interior boom
   law — a design call, not a defect.

## 6. Files

**New:** `scripts/probe-bughunt.mjs`, `docs/53-agent2-bughunt-pass.md`.

**Modified:** `src/world/subway/stationKit.ts` (ZONE_KEEP_RE),
`src/world/subway/index.ts` (keep-set re-export + the aboard-guarded
swap), `src/world/subway/ride.ts` (aboardCar band), `src/world/World.ts`
(bake keeps the by-reference set; the east curb car to x 51),
`src/engine/busRoute.ts` (the declared rect follows the car),
`src/camera/GameCamera.ts` (snapBehind obeys interiorMode),
`src/ui/UI.ts` + `src/style.css` + `index.html` (the note's exit),
`tests/subway.test.ts` (+5), `tests/camera.test.ts` (+2),
`tests/bus.test.ts` (the lane law follows the car),
`scripts/probe-subway.mjs` (+4 left-behind laws),
`scripts/probe-court-routes.mjs` (bus-clear waits),
`docs/data/world-registry.json` (the plan note records the move).

## 7. For Main Agent

1. Take the branch whole or cherry-pick; nothing here touches the step
   machine, Save v1, or the interaction registry's public shape.
2. **If you move parked cars again, move them in BOTH declared places**
   (World's `car()` calls and `busRoute`'s `PARKED_CAR_RECTS`) — the
   movers' yield pools read the second list; the world renders the
   first. The curb edge in front of any fence line needs ≥ 1.2 m of
   walk band or the route wedges.
3. **The zone bake's keep-set is the contract to remember:** any mesh a
   system holds by reference and mutates (visibility, rotation,
   position) must match `ZONE_KEEP_RE` (stationKit) or the bake
   detaches it and the writes go to a ghost. New zone content with
   per-frame behavior: add its name pattern there.
4. docs/51's ledger: still nothing open owned by Agent 2. The next
   full-E2E re-run belongs to whoever merges next.
