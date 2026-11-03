# Doc 50 — Agent 2: The First-Session World (the K line, Times Square, the M121)

> **Status: built, probed, and green.** The first-session journey's missing
> rooms — the Times Square–42nd Street subway station, the ride, the square,
> and the arrival bus — are real, explorable content in the running game,
> built on the docs/02 script and the docs/39–45 construction law. Branch
> `agent2/first-session-world`, off main `b80760c` (W4 part 1). Nothing
> shipped was moved except where the dig required it, and every dig is
> listed in §5.

---

## 1. The audit that scoped it (docs/02 vs the shipped world)

| Doc 02 beat | Shipped state before this branch | Verdict |
|---|---|---|
| The arrival (bus, skyline reveal, terminal) | Spawn on the sidewalk by the terminal door; the M121 existed only as a bay paint + a stop flag | **missing room** |
| Rosa's bodega | BODEGA-INT, the 5-order rush, the collect step | ✅ shipped |
| The first rush | The bodega brew loop | ✅ shipped |
| **The subway station** | `SUB-01`: a headhouse shell with a "Peek at the stairs" note. No descent, no platform, no train, no Priya | **missing — priority** |
| **Times Square above ground** | Nothing anywhere in the world | **missing** |
| The Wow Walk / the sync beat | Nothing | **missing** |
| Subway University (Priya, the two lines, Map copies badly) | Nothing | **missing** |
| The busker, the usher, "come back when you're somebody" | The registry listed `NZ-BUSKER` as a name only | **missing** |
| Your corner (cart, naming, the solo rush) | Shipped, playable | ✅ shipped |
| The fire-escape dusk, the gold window | Shipped (ladders, four windows) | ✅ shipped |
| The surrounding skyline | SKY-N/E/W/S cards + the W3 backdrop rows | ✅ shipped (enriched at the square, §2D) |

## 2. What was built

### A. Alder Heights station (the K, under the terminal)
- **A real descent.** The surface stair slot (x −48.5..−45.9, z 4.45..7.95)
  opens the walking lane just west of the existing headhouse, railed on
  three sides, green globe post, low "SUBWAY" head sign. Ten solid treads
  (rise 0.33 ≤ the STEP_UP law 0.35) carry the walk down to the platform
  at y −3.2 and back up.
- **A real local station**: fare bank (waist-high walls, two three-arm
  turnstiles, the open lane capsule-wide), token booth, green pillars,
  benches, trash bin, mosaic name band (**ALDER HTS**), ad panels, the
  two-line route map (Priya's diagram), a hanging clock, fluorescent
  strips. Tiled walls, yellow platform edge, track trench, tunnel portals
  with lintels that clear the parked train's roof (−1.0 vs −0.9, pinned).
- **The cutaway (the dollhouse)**: below grade the terminal mass, its
  dressing, the yard slab that roofs the block, and the station lid lift
  away — the bodega's roof-hide pattern, generalized. The terminal's
  collider rides with it (the boom must see the cutaway the lens sees).
- **Priya** stands her post at the fare bank (the shared person rig, teal,
  cap), one breathe tick, day-keyed platform lines.

### B. The ride (one deterministic seam, the ballSim law)
- Two parked two-car trains (identical by law: the swap is invisible
  because the cars are pixel-identical around the player), doors that
  slide and collider-toggle by identity, level boarding, benches, poles,
  handrails, route-map strips, bogies, the K stripe.
- The machine (`src/world/subway/ride.ts`, pure): idle → closing → riding
  → arrived → departing → idle. Tunnel scenery scrolls past the north
  windows (12 m/s), the car sways, the offset folds back into one period
  at rest (strips every 7 m, ribs every 14 — the fold is invisible).
  **The seam crosses once at t = 12 s**, doors shut: the player
  translates −288 m to the identical car at 42nd St, local offset
  preserved. Beats fire at 3 / 8.5 / 13.5 / 19 s: Priya's uptown law, the
  two lines on the window, Map's crooked copy, the arrival announcement.
- Voices: door chime, PA chime, the rumble loop (single owner), the
  turnstile click. The parked train reopens its doors at rest — the next
  train on the loop, honestly.

### C. 42 St–Times Square station + the square above
- Station B is the SAME parameterized station translated (mosaic:
  **42 ST-TIMES SQ**, plum accent, its own ads), with **the busker** (sax
  up, coin cup out, a synthesized two-note phrase on a timer while you're
  near) and a rider waiting.
- The square: the canyon along x, **nine screens** on four towers (all
  facing the plaza), the Orpheum (marquee: *THE USUAL — A PLAY*, blade
  sign, the usher's door), **the red steps** (five climbable risers under
  a glass-canopy hint), tables, banner poles with swaying cloth, a hot
  dog cart, ten crowd figures (the shared rig, two of them walking their
  own stretch), and the west rim skyline card with a spire (also the
  reveal through the M121's windshield).
- **The sync beat** (Doc 02 word for word): day-keyed, once per day on
  first entry, one shared timeline breathes every screen's emissive to
  warm amber and back (1.2 in / 2.6 hold / 1.6 out), note included. Idle
  screens shimmer (the Rule of Steam). The register reads it through the
  `usher` interaction: *"Come back when you're somebody."*

### D. The M121 (the arrival's missing room)
- Enterable bus body at the BUS-02 terminal bay: curb-side steps (the
  0.35 law), door gap in the north wall, four seat benches, cab wall,
  poles, rail, route roll (**M121 TERMINAL**), the **driver** rig behind
  the gap (Doc 02's "First time?" lines, day-keyed), and **the duffel**
  on a seat — somebody's whole biography, left exactly where it is.
- The windshield looks west down the avenue: the skyline reveal is the
  shipped SKY-W card, seen through a window that finally exists.

### E. Wiring (the paved path only)
- 8 new free-roam interactions (`trainA/B`, `priya`, `busker`,
  `busker_coin` via the gated-buy helper, `usher`, `driver`, `duffel`) —
  registry-declared, stub-tolerant (`farSubway()` returns null in tests,
  the walker-conversation pattern), zero authored-beat edits.
- Content: `RIDE_BEAT_TEXT`, `TS_SYNC_NOTE`, the busker/usher/driver
  day-lines, `DUFFEL_NOTE`, and one stale line made true (`SUBWAY_NOTE`:
  the stairs go down **for real now**; the K is the registry canon).
- Audio: 5 new voices (turnstile, door chime, PA, rumble loop, sax loop)
  under the house rules — synthesized, gain-enveloped, mute-respecting,
  single-owner loops.
- The camera grew one documented seam: `interiorMode` (below grade the
  station is a cutaway; the boom must not bounce off the yard slab that
  roofs it — the bodega dodges the same class of hit only by its height
  guard). Game flips it from the subway's underground state.

## 3. The proof (all re-runnable, all run)

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `vitest run` | **259/259** (243 shipped + 16 new: zone edges/links/y-gates, the ride's beat order, the once-only seam, door law end-to-end, swap math, bit-for-bit repeatability; +4 below-grade `groundHeight` laws) |
| `bun run build` | clean (956.6 kB bundle, +31 kB — all procedural, no assets) |
| `scripts/probe-subway.mjs` (real game, desktop) | **22/22 PASS**, console clean: descent, dollhouse, platform floor, Priya, board, seam to 42nd St, doors, busker, retire, climb out, sync fired, usher, bus floor, ride home |
| `scripts/probe-subway-mobile.mjs` (portrait 390×844, touch) | **10/10 PASS**, console clean — the same beats on the shipped touch contract |
| Full 4-day E2E (`?autotest=1`) | **104/104 PASS, 0 failures, exit 0, console clean** (`AUTOTEST OK: 0 failures, 298 s`, 256×192 viewport — the harness's documented slow-machine mitigation; no game or driver code touched) |
| probe-solid / probe-peds / probe-env6 | ALL CLEAN / OK / PASS — the home block is untouched where it matters |
| Registry validator | **OK — 129 IDs**, 18 existing buildings, shipped-fidelity 12/12 masses, 18/18 anchors |
| Census ledger (probe-w0-census, same rigs) | main `b80760c`: 977 / 821 / 490 calls → this branch: **1043 / 888 / 504** (+66 / +67 / +14 — the M121 in westward views and the station's stair-mouth dressing; everything else is zone-hidden at zero home cost; tris 115.3k stays under Doc 07's 120k line) |

## 4. Honest limitations

1. **The authored opening still starts on the sidewalk.** The bus, the
   driver's "First time?", and the skyline reveal exist and are playable —
   but the Day-1 step machine (Main Agent's sacred state machine, docs/45
   red line) was not rewired to OPEN inside the bus. Integration is a
   hand-off: spawn the capsule at `BUS_SPOTS.door`, walk in, fire
   `DRIVER_LINES[0]`, then the existing greeting. The pieces are on the
   board; the authored order is Main Agent's call.
2. **The sync beat is a note, not a Postcard.** Doc 02's moment deserves
   the capture pipeline; the postcard ritual is Main Agent's system. The
   beat fires `tsBeats` (Game drains it) — a one-line swap to
   `composePostcard()` when the square's vista is authored.
3. **The TS crowd is static + two movers.** The real Pedestrians system
   could carry a TS loop, but adding a path re-distributes every existing
   walker (the `i % paths.length` assignment) and would have moved Main
   Agent's chat-walker indices. Documented for W4 part 2 instead.
   **PAID on `agent2/session-polish`** (zone-contained, home walkers
   untouched): the static crowd got the idle breathe/head-scan tick, a
   crosser takes the east crosswalk, a gawker walks-and-stops on the west
   stretch — and the two shipped movers were caught walking SIDEWAYS
   (yaw 0/π for x-travel; the rig's forward is +z) and now face their
   travel (yaw ±π/2). Evidence: `scripts/probe-polish-shots.mjs`.
4. **The M121 does not drive.** It is the arrival's room, not the W4
   part-2 bus loop (which owns the driving bus). They will meet.
5. **The subway exists to ride, not to simulate.** The train never moves
   (the tunnel does). That is the documented trick, deterministic and
   probe-pinned — but a player who stares out the FRONT windshield during
   the ride will notice the platform staying put. The doors close before
   the seam; the front car's cab is dressed; the illusion holds at the
   windows the design reads. **ADDITIONALLY ADDRESSED on
   `agent2/session-polish`:** the car ends now read as the operator's cab
   (door + dark tinted glass inset, both ends — married pairs drive from
   both ends), so the "stare down the front" question closes at the glass
   instead of opening at a blank wall.
6. **The turnstiles do not spin.** The arms are dressed, the pass clicks,
   the open lane does the gating (the capsule law). A spin pass is a
   small polish item. **PAID on `agent2/session-polish`:** a pass through
   a gate's z-line spins that hub a third-turn over 0.5 s and fires the
   (previously dead) turnstile voice; the open lane still crosses free.
   Pure detector `turnstileHubAt` + six laws in `tests/subway.test.ts`;
   in-engine evidence in `probe-polish-shots.mjs`.

## 5. Every touch on the shipped world (the dig list)

| Where | What and why |
|---|---|
| `Sidewalk_N` → `_W` + `_E` | Split around the stairwell slot (x −48.5..−45.9). Same material, same top; the descent opens the walking lane. |
| The stair slot sits at x −48.5..−45.9 | Clear of the kiosk (−43.3..−40.7), the plaza tree pit (−45.55..−44.45 — a pit box over the slot mouth depenetration-shoves walkers; the probe caught it), the ped loop's west terminus (x −42), and the familiar-face bench. |
| `groundHeight` (engine/collide.ts) | The below-grade law: the highest box top under the capsule qualifies even below y 0; the implicit zero only rules when nothing is in reach. Shipped above-grade behavior unchanged (tested: 4 new laws). |
| `interiorMode` (GameCamera) + one Game line | Below grade the boom skips shortenBoom (the yard-roof class of hit). Flipped from the subway's underground state. |
| The dollhouse set | `Bldg_N_West` + its dressing (collected by position), `Yard_N`, the station lids, the terminal mass collider — hidden/removed ONLY while the player is below grade. Zero effect on any surface frame. |
| `SUBWAY_NOTE` (content.ts) | One stale line made true (the F/M line → the K, the registry canon). |
| Bake skip names | `Bldg_N_West`, `SUB_Root`, `TSS_Group`, `BUS_M121` join `NAMED_SKIP` — zone content must never join a district tile. |

## 6. Files

**New:** `src/world/subway/{zone,ride,stationKit,trainKit,index}.ts`,
`src/world/timesSquare.ts`, `src/world/arrivalBus.ts`,
`tests/subway.test.ts` (+4 collide.test laws),
`scripts/probe-subway.mjs`, `scripts/probe-subway-mobile.mjs`,
`docs/50-agent2-first-session-world.md`.

**Modified (seams, documented above):** `src/world/World.ts` (far-world
build + dollhouse + zone/dolly wiring + the sidewalk split),
`src/game/Game.ts` (beat drain, audio cues, `setWorldDay`,
`interiorMode` line), `src/game/interactionDefs.ts` (8 interactions),
`src/game/audio.ts` (5 voices), `src/core/content.ts` (far-world text),
`src/camera/GameCamera.ts` (interiorMode), `src/engine/collide.ts`
(below-grade ground law),
`docs/data/world-registry.json` (12 new IDs, MEZZ-INT → existing, bounds
xMin −450).

## 7. Integration notes for Main Agent

1. **The opening hand-off** (§4.1) — everything needed is exported:
   `BUS_SPOTS` (world/arrivalBus), `DRIVER_LINES` (content).
2. **The postcard hook** (§4.2) — `tsBeats` drains in
   `Game.drainFarWorld`; swap the note for `composePostcard()` there.
3. **The TS ped loop** (§4.3) — one path append in `peds.ts`, best done
   with the chat-index audit in the same PR.
4. **Nothing else needs action.** The E2E, the probes, and the registry
   are green on this branch as it stands.
