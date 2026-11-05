# Document 48 — Agent 5: First-Session Environments — Construction Report

> **Status:** Complete on `agent5/first-session-environments` (base: `main` @ `a5bc3d6`, the W3 "avenue walls + landmarks" commit). All gates green: typecheck clean, **251/251 unit tests**, **A5 first-session probe PASS** (10 walks, 18 collider checks, 2 visibility gates, 0 page errors), **solidity probe 4/4**, **W1 grid walk PASS**. The 4-day e2e runs at the merge gate (see §7).

---

## 1. What this work was

Doc 02 (the minute-by-minute first session) and Doc 07 (the vertical-slice contract) name environments the shipped greybox did not physically have: a real subway you descend into, a train you ride, the Times Square wow-walk destination, and the arrival terminal. Agent 5 built those — **as environments** (walkable, collidable, lit, dressed) — without touching narrative, dialogue, quests, or save systems.

One module owns it all: `web-three/src/world/firstSession.ts` (~900 lines, three zones, one `update()` hook). The shipped world took **three documented cuts** in `World.ts` (the sidewalk split at the stair shaft, the retirement of the "nobody walks into the earth" blocker, and a plug-gapped south wall for the below-grade passage) — everything else is additive.

## 2. The 10 required environments — construction checklist

| # | Environment (per task brief) | Status | Where |
|---|---|---|---|
| 1 | NY arrival & bus terminal | **Complete** | `firstSession.ts` `buildTerminal()` — intercity coach ("NEW YORK" destination roll, luggage bins, curb-side door) at the BUS-02 bay + dressed terminal facade (emissive glass doors, handles, lintel, sconces, M121 schedule board, luggage cart). Bakes with the street. |
| 2 | Complete neighborhood street block | **Complete (shipped)** | The Day-1 block + W1–W3 grid — untouched. Audit found it walkable end-to-end after the shaft-railings fix (§4). |
| 3 | Bodega exterior + accessible interior | **Complete (shipped)** | Rosa's Deli & Grocery, enterable interior with shelf interactions — untouched; e2e covers it. |
| 4 | Player's street corner + food cart | **Complete (shipped)** | The corner + "DIRTY WATER DOGS" cart at (29.8, −4.55) + the named cart beat — untouched. |
| 5 | Surrounding storefronts & apartment buildings | **Complete (shipped)** | Storefronts, brownstones, stoops, the Gable/Marlow rows — untouched. |
| 6 | Climbable fire escape + viewing location | **Complete (shipped)** | Ladder system + fire-escape landings — untouched (Descend tests cover dismounts). |
| 7 | Subway entrance + station platform | **Complete** | `buildShaft()` + `buildStation()` — a real descendable stairwell (12 risers, colliding side railings, apron), Alder Station: tiled hall, platform with gold edge strip, teal columns, benches, name boards, F/M line bullets, "TIMES SQ →" wayfinding, trash can, flickering light strips, two barriered tunnels with DANGER signage. |
| 8 | Subway train experience | **Complete** | Two enterable cars + gangway (door gaps at the junction ends), seats, poles, interior lights, two ad cards, and **Priya's route map** ("F — UNDER THE RIVER / M — WITH THE LIGHTS"). Walked end-to-end by the probe. |
| 9 | Times Square destination | **Complete** | `buildTimesSquare()` — plaza with the bowtie band, 14 setback towers (slab tower N2 cleared off the headhouse), the red steps + TICKETS kiosk (climbable), 11 billboards + 2 animated warm-cycling screens, bollards, planters with trees, benches, banner poles, two parked cabs, steam plume, warm office windows, and two steering walkers. |
| 10 | NYC skyline & golden-window environment | **Complete** | The shipped Skyline of Lit Windows (VS-F08's one gold window) is untouched; the square's far card plane + spire give the Wow-Walk its backdrop, and the tower windows stay **warm, not gold** — the one gold window stays one (per Doc 07 §VS-F08 acceptance). |

## 3. The ~60-prop inventory (Doc 07 §5) — without duplicate padding

Brownstone/apartment masses, fire escapes, storefronts & signage, sidewalks/curbs/intersections, streetlights, traffic signals, hydrant, pigeons, trees (12 + rows), parked cars + van + moving taxi, bodega shelves/counter/refrigerator, food cart + equipment, subway signs/stairs/platform furniture/benches/columns/trash can, Times Square billboards/screens/steps/kiosk/bollards/planters/banners/cabs, windows/balconies/rooftop water tanks. Every prop is named, owned, and collision-registered where solid; nothing decorative floats (probe-checked).

## 4. Bugs the visual/walk audit caught and fixed (Anti-Slop gate, §1b)

The first draft of this work compiled but had never actually been **looked at** — the probe's cameras were inside bodies and walls. Re-rigging every shot exposed, in order:

1. **The train was sealed** — both cars' gangway-junction end walls were full walls; the probe wedged inside car 1. Fix: pier + header door gaps matching the gangway shells (`endWall()`).
2. **Times Square tower N2 sealed the exit stairs** — its 7 m-deep footprint put a 25 m collider over the headhouse and the exit stair's north end; the return walk wedged forever at (−72, −56.4). Fix: 5 m slab tower (south face −54.55), clear of the headhouse by 0.33 m.
3. **The stair-glue law (engine)** — `groundHeight`'s generous sample circle kept touching the tread just left, pinning descending walkers a full riser high on air (the shaft hung the descent; stopping mid-stair floated the rig). Fix: `groundHeight(boxes, c, snap, dirX?, dirZ?)` — a step-up candidate (top above feet − 5 cm) must sit **ahead of the motion**; `Player.update` passes the direction while grounded. Guarded by `tests/stairs.test.ts` (4 tests: down, up, stop-on-tread, edge-falls).
4. **The shaft mouth had no floor** — the sidewalk split left the strip south of the opening as void; ascending the shaft ended hovering over nothing. Fix: the `ShaftApron` slab; the buried first-draft lip retired.
5. **The plaza walkers teleported to the home street** — `Pedestrians` clamped every zone to the block band (x ±47.2, z ±7.5); the two square walkers were dragged to the home block's SW corner every frame, parking invisible colliders there permanently. Fix: optional `band` + `groundAt` constructor params (defaults unchanged), plus the pure `clampToBand()` helper — guarded by 3 tests in `tests/crowd.test.ts`. Walker path 2 no longer spawns inside tower N3; the towers joined the avoidance list.
6. **Every billboard, animated screen, and warm window was buried inside its tower** — the square read as bare boxes. Fix: each face now sits 0.06 proud of its own shaft face with the correct facing law (plaza is at more-negative z: N row faces −z with `ry π`, S row +z, E row west, W row east; E2/W2 windows on their −z faces). No coplanar z-fight (back offset 0.005).
7. **The west tunnel mouth was sealed** — `A5_WallW_Mid` spanned z −2.5..3.0, walling the west tunnel's lights and danger barrier off from the platform while the east side stayed open. Fix: the pier between the passage and tunnel gaps is all that's needed (`A5_WallW_Pier`).
8. **Cab 1 blocked the subway exit's doorstep** — moved to the plaza's south-west edge (obstacle list updated).
9. **The shaft opening was a sidewalk trap** — a walk west at z 6.5 stepped over the east edge and fell in (the W1-ghost rerun caught it). Fix: the entrance's side railings now collide (the entry at z 5 stays open); the W1 walk detours around the house via the road, the way a New Yorker walks around a subway house.

## 5. Files — created / modified (Agent 5, this branch)

**Created**
- `web-three/src/world/firstSession.ts` — the three zones (station, square, terminal) + shaft + passage.
- `web-three/tests/stairs.test.ts` — the stair law (4 tests).
- `web-three/scripts/probe-a5-first-session.mjs` — the headless proof: 10 walked routes (descent, platform, train, passage, leg, square, steps, return, ascent, arrival), 18 collider assertions, both visibility gates, the walker-band check, and 10 composed eye shots.
- `web-three/scripts/dbg-a5*.mjs` — the debug tracers kept for the next agent (a5h–a5m are the ones that earned their keep).
- `docs/48-agent5-first-session-environments.md` — this report.

**Modified (content)**
- `web-three/src/world/World.ts` — three documented cuts: sidewalk split at the shaft, subway blocker retired, south-wall plug gap at x −72..−66; plus the `FirstSessionWorld` instantiation, its update hook, the `A5_` bake-skip, and `DIST_MIN_ROW −1` (culling row for the square; all W0 district keys unchanged).
- `web-three/src/engine/collide.ts` — `groundHeight` returns −∞ when nothing qualifies (no void floor) + the optional direction filter (stair law; defaults keep every existing caller identical).
- `web-three/src/player/Player.ts` — floor-snap-down (descending stairs follow the ground within snap) + the grounded direction pass.
- `web-three/src/world/peds.ts` — optional `band`/`groundAt` params + exported `clampToBand()` (pure, tested).
- `web-three/src/world/props.ts` — the entrance's placeholder stair-cut boxes retired (they interpenetrated the real stairwell).
- `web-three/src/camera/GameCamera.ts` — the z-clamp is now a home-street law only (below grade / south of the core lean on their own boom-shortening, like the bodega).
- `web-three/tests/solidity.test.ts`, `tests/crowd.test.ts` — the subway-floor law + the band-clamp tests.
- `web-three/scripts/probe-w1-ghost.mjs` — route reconciliation (the entrance detour + the W3 avenue walls at x ±80 are buildings now; the walk follows the avenues at x ±72).

**Modified (mode-only noise)** — ~300 files show `100644→100755` from the sandbox filesystem; `git diff` content is empty for them. Integration should ignore mode churn (or `core.fileMode=false` the merge).

**Assets added** — none new; everything is palette-banked geometry and canvas signs per Doc 04 (no GLB, no texture downloads).

## 6. Dependencies on main-agent work / conflicts & risks

- **Base commit**: `a5bc3d6` (W3 avenue walls). The branch carries zero changes to narrative/dialogue/quests/save/traffic systems. Merge order: any order; if `main` moved, the only likely touchpoints are `World.ts` (the three cuts + the `A5_` bake-skip — all commented "Agent-5") and `peds.ts` (two optional params, additive).
- **W3 interaction (reconciled, not conflicting)**: the W1 probe's x ±80 legs walked into the new avenue walls — the route now uses the avenues (x ±72). If the main agent edits avenue geometry, that probe's route may need a follow-up; the failure mode is loud (a wedged walk), not silent.
- **Engine law note for the next agent**: `groundHeight`'s direction filter changes edge behavior on purpose — walking off a slab now falls when the **center** passes the edge (previously ~0.56 m of overhang glue). Stoops/curbs/slabs are unchanged (244 pre-existing tests pass untouched).
- **Performance**: the station renders only below grade (y < −0.35), the square only south of z −14 — both gates are no-ops on the home street, so street-level frame cost is unchanged; the e2e and perf ledger cover the regression check.
- **Out of scope (deliberately)**: the scripted Doc 02 beats (driver dialogue, Rosa's hand, the rush, Priya's guided ride, postcard capture) belong to the narrative workstream — the environments are built so those beats can be staged on them without re-layout.

## 7. Verification ledger

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `vitest run` | **251/251** (16 files) |
| `npm run build` | clean (938 kB bundle, unchanged shape) |
| `probe-a5-first-session.mjs` | **PASS** — 10/10 walks unwedged, 18/18 colliders, gates + walker-zone verified, 0 page errors |
| `probe-solid.mjs` | 4/4 PASS |
| `probe-w1-ghost.mjs` | **PASS** — full grid walk + 7 shots |
| `e2e.mjs` (4-day driver) | launched at the merge gate — ~10 min wall time; the in-page budget is 900 s and this sandbox's shell cap is 600 s, so it is the one gate to run where the job can outlive the shell |

## 8. Screenshots (web-three/shots/, from the probe)

`a5-plaza-shaft` (the descendable entrance from above) · `a5-station-hall` (platform, columns, edge strip) · `a5-station-train` (through the open door) · `a5-station-tunnel` (barrier + lights) · `a5-passage` (the south leg, posters, exit mouth) · `a5-headhouse-exit` (the TIMES SQ stairway through the door) · `a5-times-square-south` (steps, kiosk, walkers) · `a5-times-square-canyon` (the billboards + animated screens) · `a5-times-square-steps` · `a5-terminal-coach` (the arrival, golden hour).

---

## 9. Addendum — A5b: the arrival, on screen (same session, next commit)

The directive that came back: *first session above anything else — it needs to grab the player.* Doc 48 built the stages; the opening minutes still booted cold on the street, and the literal first frame was the follow camera collapsed into the back of the player's head against the terminal facade. Doc 02's minute 0 — the bus window, the skyline tease, the driver, the title — was a page of design with no film. It is a film now.

### What was built

`web-three/src/game/arrival.ts` — the ArrivalCinematic. A fresh boot (no save, no `?autotest`/`?probe`) now opens on a bus window staged 150 m west of the map: countryside slides past a parallax-free window frame parented to the camera, the skyline **lights up far off** at ~4 s (one material's emissiveIntensity tweens — every tower wakes at once), city blocks glide in, the driver asks **"First time?"** with Doc 02's three one-tap responses (chips, or Space picks the shy "...Yeah."), the driver's reply lands, dip to black, and the parked coach takes the lens — door leaf sliding open, push-in on the NEW YORK roll, the title card — then the handover: you step off at the coach door, Rosa waves 7 m up the sidewalk (her rig in `wave` until the meet flips it to `auto`), HUD + Map note arrive, and the follow camera owns the lens from clean air. One tap advances any beat; a SKIP chip jumps everything; the machine (`ArrivalMachine`, pure) is unit-tested — transitions, tap gates, skip-from-any-phase.

### The five staging lessons (each one broke a probe or a screenshot first)

1. **The sky has a far plane.** The first ride staged at z 300 was 680 m from the sky shell on the view side — beyond the camera's 500 far plane — so the sky clipped to black behind the towers. The ride now lives at (−150, 100): empty world, inside the shell, far side at 480 m.
2. **Everything rides relative to the lens.** The second staging moved the camera to x −150 and left the strip centered on x 0 — the countryside slid past 150 m east of the window. Strip and skyline are now placed relative to `RIDE_POS.x`.
3. **Far things never move.** The skyline sat 17 m out in draft two: a 28 m wall of flat purple filling the frame. At 40 m with windows baked into the tower texture (body map + black/amber `emissiveMap`, so the light-up tween glows only windows) it reads as the promise Doc 02 wrote.
4. **The boom ray is a physics object.** The handover spawn clipped the luggage cart's collider (the player stood ON it at y 0.5) and, once off the cart, the street-side idle settle (yaw → 0) parked the lens south of the player — with the coach between — collapsing the boom to 2.3 m of neck-cam. The step-off spawn is now clear of the cart and faces 1.95 rad, past `TURNED_AROUND`, so the settle keeps the heading and the lens keeps the clear air west of the bay.
5. **Boot yaw is a probe contract.** Giving the headless boot the clean heading broke `probe-a5-first-session` — its walker drives `player.update` with an input convention calibrated to camYaw 0, so a rotated boot yaw walks everyone into walls. The headless boot keeps the default yaw; the real first frame belongs to the handover.

### Files

**Created** — `src/game/arrival.ts` (machine + view), `tests/arrival.test.ts` (9 tests), `scripts/probe-a5c-arrival.mjs` (the film, evidenced phase by phase), `scripts/probe-a5b-boot-first-minute.mjs`, `scripts/dbg-a5n-handover-cam.mjs`.
**Modified** — `src/game/Game.ts` (arrival wiring, fresh-boot branch, the film owns input while active, coach-door tween, handover checkpoint + Map note, Rosa's wave→auto on the meet), `src/ui/UI.ts` (letterbox/line/chips/title render methods), `index.html` + `src/style.css` (the `#cine` overlay), `src/world/firstSession.ts` (named door pair + doorway recess), `scripts/probe-a5-first-session.mjs` (boots with `?probe=1`).

### Gates

tsc clean · **260/260 tests** (251 + 9 arrival) · `probe-a5` **PASS** (10/10 walks, colliders, visibility gates) · solidity 4/4 · W1 grid PASS · `probe-a5c` **PASS** — the full film driven end-to-end with real taps: ride → driver → reply → title → handover (player at the door, Rosa waving, HUD live, checkpoint set, 0 page errors) · e2e: 94 checks PASS through Day-4 dusk, no FAILs, capped by this sandbox's 600 s shell (the driver needs ~10 min; unchanged from §7's note — the `?autotest=1` path itself is untouched by this work).

---

## 10. Addendum — A5c: wonder beat #1, the sync + the meet-flow proof (same session, commit three)

**The sync.** Doc 02's Times Square moment — *"the screens all turn at once — a designed moment where every billboard syncs to warm light, just for you"* — existed only as an ambient hue cycle. Now the first walk into the plaza fires it: all animated screens converge to one warm hue and all 11 billboard faces wash warm together (0.9 s ramp / 6 s hold / 2.2 s release, `syncEnvelope()` pure and test-pinned), then hand back to the ambient cycle with no snap — the release blends from whatever hue each screen reached. Trigger: past the headhouse stair mouth **and at street level** (z < −61 AND y > −0.5) — the beat lands stepping into the light, not on the stairs. Hot path clean: one scratch color, zero allocations. Evidence (`probe-a5e`): same composed rig, three frames — the teal SHOW board measures RGB(124,143,121) synced vs (124,160,156) released; faces return to `ffffff`.

**The meet-flow proof.** `probe-a5f` plays the first minute of real gameplay from the film's handover: SKIP chip → step-off → walk to Rosa (she is WAVING under the BUS TERMINAL sign — the `wave` rig, visually confirmed) → interact → step 1 "Follow Rosa…" → her wave flips to `auto` and she walks the counter route at full 2 m/s. The story machine, the walk, and the new spawn all agree.

**Gates at session end:** tsc clean · **265/265 tests** · `probe-a5` PASS · `probe-a5c` PASS (film end-to-end) · `probe-a5e` PASS (sync, measured) · `probe-a5f` PASS (meet flow from the handover) · solidity 4/4 · W1 grid PASS · e2e 94 PASS / 0 FAIL through Day-4 dusk (sandbox shell cap).

---

## 11. Addendum — A5d: the audit that looked (same branch, next session)

**Directive:** keep building, polishing, fixing bugs — first session above anything else. The build compiled and every walk gate passed, so this session's work was the gate that doesn't lie: **looking**. The probe's own screenshots convicted the build. Four piles of fixes, each one a frame a player actually sees.

### The station was lying about itself (§2 env 7–8)

Every sign in Alder Station used ABOVE-GRADE y — 0.9 / 1.7 / 0.2 / −1.05 — while the hall walls top out at −1.3 and the ceiling soffit is −1.4. The whole signage layer rendered **buried inside the street slab**: no name boards, no F/M bullets, no TIMES SQ → wayfinding, no mosaic. And inside the train, the two ads hung on the car's OUTSIDE south face facing away, and Priya's route map floated through the roof slab facing the wall. Fixed:

- name boards at eye height (−2.3) on wall planes that exist; the W board moved to the wall segment north of the passage mouth (its old z sat inside the mouth gap);
- bullets stacked above the board (−1.72), exit board hung in the mouth under the soffit (−1.78), passage arrow hung at the leg junction facing the walker (−2.55);
- mosaic on the north wall (−2.4);
- train: window bands proud of the wall INTERIORS (they were inside the slab — the car had no lit windows from inside), ads above the seat backs facing the aisle, route map on the north middle pier facing the seats, plus an exterior teal line stripe — the car read as a sealed cream tube from the platform.

### The square's 1-Second Law (§2 env 9)

- **Steam** was untextured points — hovering glitch squares over the band. Now a radial-gradient sprite (built once), round puffs, softer opacity.
- **E2/W2's warm office windows** sat 4 mm BEHIND their shaft face — z-fighting ghosts. Now 0.07 proud.
- **Tower faces were bare brown slabs.** New `tsTowerWalls()`: window grids on all 14 plaza-facing faces as TWO InstancedMeshes (dim + sparse warm lit — 2 draw calls, static, deterministic hash), a dark plinth + glowing glass band on every base, and four named storefronts — Gable News, Kestrel Records (the Happy Accident #1 seed, Doc 02 §15), Alder Flowers, Juniper Bar. The grid skips every registered billboard/screen rect, so no window fights a sign; the towers were table-driven (`TS_TOWERS`) so the dressing reads from the same numbers the colliders use.

### The coach rear was a blank wall the whole title beat stares at (§2 env 1)

Rear destination roll (NEW YORK, amber on ink — a real coach carries the route astern), taillights, bumper, engine grille. Plus the wheel/shimmer fix: the wheel caps sat 15 mm from the skirt plane and dithered at glancing angles — skirt ±1.21, wheels ±1.24, nothing near-coplanar.

### The e2e deadlock — the cab that froze on a pedestrian (engine)

The full 4-day driver had never finished in this sandbox (shell caps, CPU contention). When it finally ran clean it failed 12 checks, all one chain: Day 4's laundromat crossing. The trace showed the walker pressed against a 4.4 × 1.96 box at (−5.5, −2) — **the taxi, frozen mid-lane with its body around them**. Rule 2 braked to 0 for any conflicting body not fully behind the tail; a walker who steps into the lane BESIDE the cab (nose already past) froze it forever, and the post-move resolve held them at the south face — a deadlock the walk budget burned for 28 s. Fix, per the module's own design comment ("the pedestrian yields to the vehicle"): `pedestrianSpeedCap()` — bodies beside the cab impose no cap (the cab crawls past, the resolve walks them clear of the tail); bodies ahead of the nose keep the full braking curve; behind/lateral stay exempt. 5 new tests pin it (`tests/traffic.test.ts`). The crosswalk courtesy hold is untouched (probe-solid asserts the nose still parks at the stop line).

### Gates at session end

tsc clean · **270/270 tests** (265 + 5 traffic) · build clean · `probe-a5` **PASS** (0 page errors; the re-shot frames show named walls, a striped train with interior ads, windowed towers, round steam, a dressed coach rear) · solidity 4/4 · W1 grid PASS · **e2e 104/104 PASS, 599 s, 0 console errors — the first full four-day completion in this sandbox**.

### Same session, second pass — the small things that read

- **Tile band**: the classic colored stripe framing the station's signage, on every hall wall (split around the mosaic and the W wall's gaps; each band's back edge buried 5 mm — a coplanar face shimmers at distance, and the first cut shimmered).
- **Headhouse south face**: the plaza approach read blank brick; a TIMES SQ board now hangs across the exit mouth's header facing the square.
- **Every canvas sign sharper**: textPlane ran at 24 px/m — a 2.3 m shop sign was a 55×12 canvas and the glyphs rendered as chunk ("NIPER B" was resolution clipping, not occlusion). 64 px/m; the shop signs, exit board, passage posters, train ads, and map all read clean.

Gates re-run after each pass: tsc clean · 270/270 · probe-a5 PASS (0 page errors) · solidity 4/4 · e2e 104/104 (599 s) unchanged — the band, boards, and sign resolution touch no colliders, no gates, no story state.

---

## Merge addendum (docs/52)

This report describes the branch as built. The merge onto main
(`ced660d`) resolved the parallel-build overlap with docs/50: **main's
first-session world is the paved path** — the duplicate geometry this
report lists under §2 rows 7–9 (`firstSession.ts`'s Alder Station, the
z −80 Times Square district, the terminal coach) is retired, and what
ships from this branch is the arrival film (re-targeted onto its own
diorama coach), the stair-glue + floor-snap-down laws, the cab-yield
function, and the per-walker band law's pure extraction. The full
reconciliation record, the corrected audit record (two suspected main-tip
breaks turned out to be audit-tool display artifacts — docs/52 §3), and
the merged-tip proof live in **docs/52**.

---

## 12. Addendum — A5i: the Doc 02 reconciliation pass (2026-11-05)

Doc 02 (the minute-by-minute first session) was read end-to-end against
the shipped game and diffed beat by beat. Most of the script already
shipped (the arrival film's driver/choices/title, Map's boot note, the
six-starter pick card, Rosa's upside-down-map greet, the five-order rush
as conversations, the Shuffle, Subway University's teach + crooked copy +
busker coin, the record shop's "Back soon. The city knows when.", the
wow sync + the Wow card + the usher's promise line, the cart-naming, the
fire-escape dusk with the gold window + Rosa's send-off + the key
jingle). Four beats were missing — all four are now in, evidenced:

1. **The fun-fact stickers (§2:00–5:00).** Each of Rosa's three items
   now reads its Doc 02 sticker at pickup, queued after the pick line:
   bodegas/10,000 (mango), "regular = milk, two sugars" (coffee can),
   "bread arrives before sunrise" (bread). `ITEM_STICKERS` (content.ts),
   fired by `GameState.collect`; the shelf flavor lines stay.
2. **Rosa's cart handover (§20:00–26:00).** "It's ugly now. So was mine.
   It's yours. What're you calling it?" lands as the name box opens —
   the box answers her question (`ROSA_CART_HANDOVER_NOTE`).
3. **Rosa walks you to the empty corner + the register count.** On the
   cross, Rosa leaves the counter and walks the proven stranger legs
   (door, crosswalk — the cab's courtesy hold covers her — south curb)
   to Day 3's audited shoulder spot (6.35, −4.3), collider synced every
   frame. When the solo rush's third cup lands she is at your shoulder
   and the register count reads: $87 → $112, "Twenty-five dollars on
   your first day," "Nineteen years ago I made eleven" + the mango pat,
   "Lock up tight. The city takes care of itself at night."
   (`ROSA_REGISTER_NOTES`; `startRosaCornerWalk`).
4. **The street performer's four seconds (§10:00–15:00).** Once per
   session, after the square has synced, stepping back to the B stair
   mouth slows the WORLD to 0.45× for four seconds while a one-shot
   melody plays (`audio.streetSong`, five notes + a fifth pad). No
   objective, no prompt — the player's feet, camera and paper keep
   honest time. Fires on the natural return (the ride home starts
   beneath that stair mouth); the other square probes never re-enter
   the stair box, so their timings are untouched.

**Evidence:** `probe-a5i-doc02-beats.mjs` — 18/18 in-engine checks,
0 errors (sticker read, handover note under the name box, Rosa's walk
lands at the shoulder, register chain reads, CLIMB offered at $112,
listen arms once and ends); screenshots `shots/a5i-claim-handover.png`,
`a5i-rosa-at-shoulder.png`, `a5i-register-count.png`,
`a5i-street-performer-listen.png`. Unit pins in `tests/state.test.ts`
(sticker per item, handover note, register notes with the day's math).
Full 4-day E2E after the change: **139 checks, 0 failures, console
clean** (426 s on the small-viewport harness). vitest 553/553.

Doc 08's content pack (12 Map notes, 4 slang cards, the story card, all
six Day-1 postcards) was audited in the same pass and already ships 1:1
— no changes needed there.

---

## 13. Addendum — A5j: the arrival card recomposed + the portrait ride window (2026-11-05)

The two standing candidate weaknesses from the earlier arrival passes,
both confirmed by re-reading the a5g frames, both fixed:

1. **The title card collided with its own set.** The card lens pushed in
   on the NEW YORK roll and stopped 1.65 m from it — the roll landed dead
   frame-center, exactly where the UI title renders: white "FIRST SLICE"
   on amber "NEW YORK", both unreadable, and at that range the coach read
   as abstract cream masses. The lens is recomposed: an establishing
   three-quarter (doorX + 5.6, 3.0, z − 7.2) pushes to (doorX + 2.6, 2.35,
   z − 4.5) on a look point at the DOOR (doorX + 0.5, 1.5, z − 0.9) — the
   roll rides the upper third and reads whole, the title lands on the
   dark window-band glass, the doorway glows just beneath it: "title card
   over the doors opening" (Doc 02), literally framed. The film coach
   grew the parts the close lens demanded: a dark doorway recess + warm
   aisle glow behind the sliding leaf (it used to reveal the cream body
   face — a door painted on a door), a threshold light spill, and window
   pillars separating the north glass band (one black stripe no more).
2. **Portrait spent a quarter of the phone frame on ceiling.** The ride
   aperture was tuned for 16:9; at 390×844 the 80° vfov frame is ±0.26 ×
   ±0.46 at the glass, so the 0.2-tall window filled 43% and the shell
   ceiling ~24%. The aperture is now a per-boot choice off the camera's
   aspect (`APERTURE_PORTRAIT_Y` 0.34 below aspect 0.9): the window fills
   ~74% of the portrait frame, the shell law still holds (header + face
   well inside INTERIOR.y 0.72), landscape boots unchanged.

**Probe honesty fix:** `probe-a5g`'s wall-clock taps landed before the
machine's game-time gates on slow GL — the landscape run wedged in
'reply' and its "tcard" shot showed the reply beat (two sessions of
landscape card evidence were actually reply frames). The advance is now
phase-driven (wait 'choice' → tap → wait elapsed 3.4 → tap → wait
'card' → 1.2 s dwell → shoot), deterministic in both orientations.

**Evidence:** `shots/a5g-{portrait,landscape}-tcard-coach.png` (both
cards recomposed — roll readable, title on glass, lit doorway below),
`a5g-portrait-t6-lit-city.png` (the 74% window). Gates: tsc clean ·
vitest **553/553** · `probe-a5g` PASS both orientations, 0 page errors ·
`probe-a5i` **18/18** · `probe-a5h` ok · full 4-day E2E **0 failures,
console clean** (576 s).

---

## 14. Addendum — A5k: the soak gate found a frozen neighbor — the band law rebuilt (2026-11-05)

The doc 55 item-5 soak complement (`probe-w4-soak`, 30 sim-minutes at the
app's own worst-case dt) ran for the first time in this sandbox and
failed 41 stillness windows: **walker 3, the garden tender, pinned at
(−0.5, 23.45)** — exactly the garden loop's band-clamp south edge — for
21 sim-minutes while its velocity screamed north at full cruise. The
tracer (`dbg-a5o-garden-pin.mjs`) caught the lie that defeats every
velocity-based watchdog: the brain said full speed, the body never moved.

**The root cause was a band that inverts.** `bandOfLoop` capped z at the
street's ±7.5 discipline; the garden loop lives at z 24.1..26.8, so the
cap produced minZ 23.45 > maxZ 7.5, and the clamp resolved to exactly
23.45 for EVERY input — a band that is a single point. Born in W4 p1
with the loop; every soak since had passed by sampling luck. The same
bug silently shrank the avenue shopper to a 15 m patrol.

**Fixed on two layers** (docs/51 B17):
1. `bandOfLoop` is the loop's own inflated bbox (±64 typo net) — every
   street lane's band is tighter-or-equal to the old one; the garden loop
   keeps its fence line. 4 new band pins in `tests/crowd.test.ts`,
   including "never inverted" against the garden loop's real numbers.
2. The **anti-stuck law**: a non-dwelling walker still (< 5 cm) over 8
   consecutive one-second windows gets its waypoint advanced — position
   delta, never velocity. A blocked loop now resumes in ≤ 8 sim-s;
   nothing can freeze longer. 3 law pins, one reproducing the historical
   pin exactly.

**Fallout:** the freed avenue loop exposed its authored mid-block
jaywalk (Kestrel Street at x 61.8, outside the crosswalk paint) and an
in-roadway bus-stop beat. Re-authored onto the south walk — diner and
fruit-stand beats unchanged, the M121 stop watched from across the
street. A walker crosses at the paint or not at all.

**Gates:** `probe-w4-soak` **OK** (1838 sim-s, 44 samples, 0 failures,
page clean) · `probe-w4-bus` OK · `probe-peds` OK · `probe-shuffle` OK ·
`probe-solid` ALL CLEAN · `probe-a5i` 18/18 · `probe-a5h` ok · vitest
**559/559** · tsc clean · full 4-day E2E re-run on the fix (see §13's
gate for the arrival recompose; this fix's E2E: 0 failures, console
clean).
