# Doc 34 — The Living Block: Doc 33 reviewed, and what shipped

*Status: implemented. The lead agent's response to [Doc 33](33-living-neighborhood-design.md) — the second agent's design deliverable. This doc records what already existed, what was integrated, and what stays a proposal, so the next agent doesn't have to re-audit.*

*The objective was never to make the game bigger. It was to make the existing block feel inhabited, and to make four played mornings feel like a street that remembers you.*

---

## Part one — the audit (what already existed)

Doc 33's audit was checked against the real checkout, line by line. The verdict:

| Doc 33 proposal | State in the build |
|---|---|
| Continuity machinery (flags, line tables, replay greetings) | **Already existed.** `kidKept`, `idrisServed`, `stoolUp`, `mapGiven`, `permitFiled` in Save v1; `rosaChatI` line tables per day; replay captions. |
| §2.1 Pedestrian routines by time of day | **Partially existed** — the Yuka ambient walkers (three loops, steering, cab yield) landed in the open-source integration pass. They are not yet time-of-day banded. |
| §2.3 Flyer rotation, window states, barrier diary, planters | **Did not exist.** → shipped, below. |
| §2.2 Familiar faces | **Did not exist.** → shipped, below. |
| §4.1–4.2 Greeting ladder, remembered favor | **Partially existed** (flag-keyed line tables). The favor and the shorthand rung did not. → shipped, below. |
| §5.1–5.2 Caption reads the day's small truths; season stamp | **Did not exist.** → shipped, below. |
| §2.4 Season drift, §2.5 subway rumble, §5.3 the shoebox, Part 3 calendar | **Still proposals.** Kept as proposals deliberately — see Part four. |

Doc 33's own integration notes said: *cheapest first steps are §2.3's flyer rotation and window states (pure World dresser, one file), then §4.1's greeting ladder (pure content).* That is the order that was followed.

---

## Part two — what shipped

### The block's diary (`src/world/dressing.ts` — new, pure data)

One file holds every day-keyed fact. Deterministic by day — the E2E driver and every player meet the same street. No save fields: everything derives from the day number and existing flags, so a save that predates this file parses and plays unchanged.

- **The flyer board rotates its paper** (Doc 03 §9, §7): a lost cat (Day 1), a stoop sale (Day 2), guitar lessons (Day 3), a street fair (Day 4), a found key (Day 5+ cycles). One canvas redraw on the *existing* board material — zero new geometry, zero new draw calls. The story flyer ("BEST CORNER COFFEE") is untouched; the slips live beside it, pinned at a slant.
- **Window lights vary which windows are awake**: someone got home late (Day 2, then away), someone new moved in above the lamp (Day 3, stays), the early riser (Day 4). Three panes the brownstone grid *already had* — they only left the shared dim material so their emissive could keep a diary. Cost, stated honestly: three one-box meshes out of the static bake, three draw calls, 36 triangles.
- **The construction barrier is gone by Day 4**, leaving fresh asphalt — one patch, one box, proud of the slab by the same trick the tree pits use. Net draw calls on Day 4: zero (one added, one removed). The block repairs itself the way blocks do.

`World.dressDay(day)` applies all three; `Game.beginDay` calls it every morning, and boot calls it for Day 1. The 1-Second Law holds: any paused frame still reads as the same street.

### The remembered favor (Doc 33 §4.2, the doc's own line)

Day 3's first cup — Idris, the regular, if you kept the kid on Day 2:

> "Third day. Same cup. You did right by the kid — that's the whole job, kid."

One note, no cutscene. Gated on `day === 3` at the step level (`D3_RUSH`), so a Day-4 replay of the morning rush cannot re-run it — the exact bug a unit test caught before ship. The money math doesn't move ($130 stands).

### Rosa's shorthand rung (Doc 33 §4.1)

The greeting ladder's top rung: the first chat after the Map changes hands, while Rosa is still within reach —

> "Four mornings. The urn remembers your hands. So do I."

Once per session, ever. The once-ness is one transient boolean (`fourMorningsSaid`, the `replayNoteShown` pattern) — **never written to the save**; the save schema is untouched and the unit tests prove the snapshot omits it.

### The familiar face (Doc 33 §2.2) — pass → nod → word

One recurring neighbor. Stone-gray cardigan, folded paper under her arm, 1.6 m/s, the same body every day — that is the entire design. No collider, no prompt, no flag stored; her schedule is one authored waypoint round per day, keyed on the day number:

- **Day 1:** absent. The street hasn't met her yet.
- **Day 2:** a dusk pass below the fire escape while you climb. No note. You may not even notice her. That's allowed.
- **Day 3:** the nod — she pauses by the cart while you walk the kid ("A woman in a stone-gray cardigan passes the cart… She nods — at you, at the cart, hard to tell. It feels the same."), then walks to the plaza bench and sits through dusk.
- **Day 4:** she wakes at her bench (she was sitting there when yesterday ended — the block doesn't teleport its neighbors), and during the wash she crosses back — the cab yields to her, because she's a pedestrian and that's the rule — pauses by the cart, and spends one word: "Morning." One word. On this block that's a handshake.

She is built from the same articulated person rig as the cast, joins the same one-pass animator, and joins the taxi's yield list only while visible. Replays re-run the day's beat — warm, unrewarded, like the replay greetings. No crowd sim, no pathfinding, one body.

### The postcard's two new memories (Doc 33 §5.1–5.2)

- **The caption learns the day:** Day 2 without an awning gains one kind line — *"No awning yet. The corner didn't mind."* The `awningUp` argument is optional: calls that omit it compose byte-identically to the previous text (the unit tests pin the old strings).
- **The season stamp:** the stamp corner carries one gold ginkgo leaf — October, the same palette the turning trees wear. One authored glyph, keyed on the same day data as the caption. No pipeline change; the capture already shoots the live scene, so as the diary lands (barrier gone, slips rotated), the postcards quietly become a before/after of your street — Doc 33 §5.4 comes free.

---

## Part three — what changed besides

- `beginDay` dresses the world each morning, before the fade-in. No spawn, no teardown — material and visibility writes only.
- The static bake's exclusion list grew by the three ambient windows, the barrier, the patch, and the familiar face — everything that must stay able to change its mind about existing.

### Two corner defects the integration surfaced (fixed at root)

The familiar face's choreography and the E2E forensics re-measured the cart corner — and found it had been slowly closing:

1. **Rosa's Day-3/4 wake spot (2.1, −4.9) stood in the cart's west walk lane.** Her collider left a sub-meter gate against the cart's west face; a walker approaching from the crosswalk grounded against her (the walklog probe measured the player pinned at x ≈ 1.5 for half a minute, twice). She moved to the corner's south-east edge (6.35, −4.3), angled toward her cart. Same person, same beat, one open lane.
2. **The kid's stool + seat sealed the last pocket.** At (5.25, −5.7) his collider closed the 27-centimetre gap beside the cart's east face — a walker on Day 4 had literally nowhere to stand. The stool and the seated kid moved east-south (6.95, −6.55 / 7.15, −6.25), still watching the cart, and the corner now has one clear serving pocket and one clear walk lane.

Neither move changes a beat, a line, or a dollar. Both were verified the honest way: the four-day driver, real input, twice.

### The E2E driver caught up with the street

The block has been growing faster than the walker's budgets. Three root fixes, assertions untouched in strictness:

- **Progress-extended walk deadlines** — a walk still closing on its target keeps going (3× cap); one that stops closing ends at once, like the old budget expiry. Slow machines finish; stuck walks don't burn the cap.
- **Every road crossing routed like a person** — the last unprotected diagonals (Day 2's favor leg, the kid's walk home, the Day-4 dusk climb) now use the crosswalk or the proven x=9.4 crossing. The south-sidewalk variants all found furniture (the A-frame diagonal clipped Rosa's corner; the south lane wedged between the cart and the trashcan — a 60 cm gap a 70 cm walker does not fit through).
- **The reach-top trigger walk** — after every ladder-2 dismount the driver walks INTO the trigger zone (x 10.25..14.75) before polling; the dismount parks at x ≈ 15.2, outside it, and on a slow machine the drift starved every dusk beat behind it.

---

## Part four — what stays a proposal (on purpose)

Kept out of the build, recorded here so the decision is visible:

1. **Time-of-day pedestrian bands (§2.1).** The three Yuka walkers already give the sidewalks a pulse. Banding them by clock means choreographing around every story beat; the payoff did not justify the risk to the morning rush choreography this round.
2. **Season drift (§2.4) and any calendar architecture (Part 3).** Doc 33's own audit rejects a new calendar for the Days 1–4 build: "this architecture is enough… and none is wanted." Days 5+ are still being written; the leaf stamp carries October's week honestly.
3. **Subway rumble-and-glow and the busker (§2.5).** Belongs with the audio ledger's next pass (Doc 32).
4. **The shoebox (§5.3).** Touches storage. The postcards are already kept as PNGs; a drawer in the pause menu waits until there's a pause menu. No save schema changes this round — that was the red line.

The planters' blooms-to-branches turn is noted but not shipped for the same reason as the calendar: four days is one week of October; nothing has had time to turn yet.

---

## Verification

- **Unit:** 154/154 (`tests/living-block.test.ts` adds 29: slip determinism, window plans, barrier states, the favor's Day-3 gating, the shorthand's once-ness and save-schema innocence, caption byte-compat).
- **Typecheck:** clean. **Production build:** clean.
- **E2E:** the full Day 1 → Day 4 afternoon driver, real input — **0 failures twice on this sandbox** (393 s first run; the second's time is in the README), the first greens this environment has produced (the untouched baseline could not finish here: sampled budgets blow at its ~0.4× sim speed — the driver fixes above are why it can now).
- **Visual:** `scripts/visual-living.mjs` — the board's slip rotating (D1/D4), the barrier diary, the Day-4 window plan, the familiar face at her bench, the nod, the D2 pass. Frames in `assets/web-three/frames/living_*.png`.

## Honest limits

- Verified on software GL (llvmpipe/SwiftShader) in this sandbox — no physical phone this round. The three window panes and one patch are the only added draw calls, measured by scene census, not vibes.
- The familiar face is authored choreography, verified in-suite and by frames — she does not steer around the player the way the Yuka walkers do; she keeps to her marks instead.
- The taxi yields to her crossing (same rule as the kid and the stranger); the crosswalk is the only place she ever touches the road.
- Rosa's corner move and the kid's seat move are gameplay-neutral but visible: anyone resuming a Day-3/4 save finds them in their new spots. The world is allowed to tidy itself between mornings.

*The block keeps a diary now. It doesn't say much. It doesn't have to.*
