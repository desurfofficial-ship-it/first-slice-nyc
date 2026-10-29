# Doc 28 — Day 3: "A Place at the Corner" + the Living Street

> Build 2026-10-29, web (`web-three/`), following the enormous-build directive.
> Rule Zero was honored: the repo was audited first (Doc 23/24/26/27), the six
> field-bug fixes were verified and pushed (997abeb), the baseline was recorded
> (typecheck clean · 56/56 unit · E2E 0 failures) — and only then was anything
> built. The Godot oracle is untouched.

---

## 1. The chapter

Day 3's theme is **belonging** — the block starts saying your name back.
The canon is respected: no new names except the neighborhood's own signage
(original, hand-authored), no retconned events, Idris/Rosa/the kid stay who
they are. Everything below is real game state.

| Beat | Step | What happens |
|------|------|--------------|
| Morning — the news | `D3_WAKE` | Rosa visits YOUR cart (the news travels to you). Talking to her opens the rush. |
| The morning rush | `D3_RUSH` | Four real orders (Idris first). Each cup is **brewed** (1.15 s), each customer carries an **order bubble**, each serve pays and speaks. $19 total. |
| The kid comes down | `D3_KIDDOWN` | The kid waits at the stoop — ground level, first time ever. Talk to him; he follows at your hip. Teleport-rescue only if the gap gets absurd. |
| A place at the corner | `D3_STOOL` | The stool — the Day 3 purchase ($10, confirm-gated exactly like the awning). He takes it. Buying it once can never double-spend: the step leaves the moment it's bought. |
| The flyer | `D3_POSTER` | A bulletin board by the subway stairs: *"BEST CORNER COFFEE — as voted by everyone who was asked."* The flyer learns your cart's name. |
| Golden-hour payoff | `D3_CLIMB3` | The fire-escape climb you know by heart. A **third window** flickers alive; the kid waves from his stool below; the corner reads as a place someone keeps. |
| Chapter close | `D3_POSTCARD` | Real composed postcard: *"Day 3. $X → $Y. Met: the block. The kid came down from the window. The corner keeps you now."* Linger at the rail; Day 4 is honestly still being written. |

**Money math (E2E-pinned):** $111 → rush $130 → stool $120. Save v1 gains
`stool: boolean`; old saves parse unchanged; day clamps to `MAX_DAY = 3`.

## 2. The living street (Workstreams A + B)

Built with shared geometry/materials (`props.ts` MatBank) and seeded placement
(`ambient.ts` mulberry32) so the block is the same block for everyone:

- **Brownstone row** (south-west): three stoops with real risers, iron
  railings, coral/teal/plum doors, cornices; parlor windows; AC units.
- **Storefronts** (north face): *SUNRISE LAUNDRY* (teal) and *CORNER SLICE
  PIZZA* (coral) — display glass, columns, angled awnings, readable signs.
- **Subway plaza** (north-west): entrance with railings + raised SUBWAY sign
  and bullet, plaza deck, bulletin board with the Day 3 flyer, benches,
  newspaper boxes, two park trees. Collides where it should (nobody walks
  into the earth).
- **Street furniture**: four cobra-head streetlights (arms over the street),
  trash cans + recycling bin, second hydrant, bus stop (M15 chip) with bench,
  one construction barrier, delivery van parked at the north curb (collides).
- **Trees**: twelve street trees in guard-ringed tree pits + two park trees.
  Varied height/canopy silhouette (seeded), subtle per-tree sway. None block
  doors, the crosswalk, or the fire escape.
- **Pigeons**: a flock of nine, seeded placement. Idle glances, head-bob
  walking, pecking, and a flush arc when you get inside their personal space
  (never at dusk — the flock roosts). Targets are clamped to the plaza;
  pigeons do not jaywalk.
- **One squirrel**: hops between rest spots, flicks its tail, flees a close
  player. Restrained on purpose.
- **RN-4 closed**: the Day-2 dusk objective now points at the awning too
  ("Dusk soon. The awning kit leans against the cart if you want it — $15.

## 3. Coffee-cart depth (Workstream D)

- **Order states**: bubble up → brewing (urn hisses; prompt says *Brewing…*)
  → served (reaction line + money). Repeated presses during a brew are
  absorbed by the state machine — no double-serve is possible.
- **Interrupted orders**: brews complete on their own clock; walking away
  costs nothing and refunds nothing.
- **Persistent progression**: money, awning, stool, kid — all in save v1.
- **Currency honesty**: every payment goes through `earn()`/`spend()` with
  the replay rest rule intact.

## 4. Interactions & UI (Workstreams E + F)

- The shared interact system gained two members: the **kid** (`Walk with
  him`) and the **flyer board** (`Read the flyer`). No scattered code —
  `isRelevant` + `promptVerb` + one switch.
- Day 3 objectives are written for a first-time visitor; the LINGER rail
  flow works on Day 3 exactly as on Days 1–2.
- The taxi now brakes for the kid too, not just the player.

## 5. Performance & technical quality (Workstream G)

- Shared unit geometries (`props.ts`) + `MatBank` material cache: ~200 new
  props cost a handful of materials, not two hundred.
- Pigeons/squirrel: no shadow casters, seeded, frame-rate independent.
- Trees: 2 materials total, sway is a rotation, not a shader.
- Customer order bubbles + flyer textures are disposed on removal/redraw.
- Build: **636 KB (165 KB gzip)**, one chunk + the autotest chunk.

## 6. QA — what was run, what was found, what was fixed (Workstream H)

**Final battery:** typecheck clean · **79/79 unit tests** (was 56; +22 Day-3
state machine, +1 save round-trip) · `npm run build` clean · **E2E
`AUTOTEST OK: 0 failures, 184 s`** — the full real-input journey Day 1 →
Day 2 → Day 3, console clean.

Defects found by the battery and fixed at the root:

1. **The harness under-climbed.** The block is full now; software-rendered
   sim time runs slower, and the old fixed real-time key-holds stopped
   reaching the rail. The driver now climbs by condition (`holdUntil`),
   not by stopwatch — a regression guard that can't be outgrown.
2. **Rosa swallowed the morning.** `tryInteract`'s rosa branch checked
   `isDay2` (true for day ≥ 2), so Day 3's wake beat became idle chat. The
   wake branch now comes first. Caught by the E2E, fixed, re-run.
3. **The stool didn't seat the kid.** `confirmStool` forgot the `kid-sits`
   effect. Caught in unit tests during writing.
4. **Order bubbles leaked.** `removeCustomer` disposed meshes but not
   sprites; the bubble's texture went to GPU heaven every serve. Fixed.
5. **Pigeons jaywalked.** Wander/flush targets drifted the flock into the
   road over minutes. Targets now clamp to the plaza radius.
6. **Walk budgets.** The E2E's default walk timeout was tuned for the
   lighter world; long cross-street walks (which may wait for a cab to
   yield) now get honest budgets, and the kid-arrival check polls.

Regression protection added: Day-3 segment in the E2E driver (order bubble
up, brew gate, rush money math, kid walks + arrives, stool purchase once,
flyer read, third window, Day-4 wall, save holds `stool: true`), plus the
Day-3 unit suite and the stool save round-trip.

## 7. Files changed

- `web-three/src/core/Save.ts` — MAX_DAY 3, `stool` field (back-compat)
- `web-three/src/core/content.ts` — Day 3 text: objectives, notes, orders,
  captions, prompt verbs, RN-4 objective
- `web-three/src/core/GameState.ts` — D3 steps 17–23, brew gate, kid flow,
  stool purchase, poster, save snapshot
- `web-three/src/world/props.ts` — **new**: street-furniture builders
- `web-three/src/world/ambient.ts` — **new**: seeded pigeon flock + squirrel
- `web-three/src/world/personRig.ts` — the `sit` mode
- `web-three/src/world/World.ts` — the living street, third window, stool,
  ground kid, flyer, order bubbles, taxi brakes for the kid
- `web-three/src/game/Game.ts` — Day 3 orchestration, brewing, kid follow,
  golden beat 3, day-aware `beginDay`, cast placement
- `web-three/src/game/autotest.ts` — Day 3 segment + condition-based climbs
- `web-three/scripts/e2e.mjs` — timeout for three days
- `web-three/scripts/probe-kidfollow.mjs`, `visual-d3.mjs` — **new**: probes
- `web-three/tests/state-day3.test.ts` — **new**: 22 tests
- `web-three/tests/save.test.ts` — stool round-trip
- `web-three/assets/web-three/frames/d3_*.png` — evidence frames
- `README.md` — status, Day 3 path, captures, doc index

## 8. Honest limits / next actions

- The **Godot oracle has no Day 3** — the web build is the leading
  implementation (as Doc 24 intended once verified; it now is, by E2E).
- Day 4+ remains "still being written" by design (the rail says so).
- Pigeons/squirrel are ambience only — no gameplay handles, by choice.
- The E2E runs on software WebGL; real-device GPU framing should be re-
  verified on a phone before marketing screenshots (Doc 05 §7).
- The pitch site (`site/`) still tells a two-day story; syncing it is the
  next agent's kind act.

*The block is alive. The kid has a stool. The light stays.*
