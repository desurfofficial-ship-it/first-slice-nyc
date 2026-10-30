# Doc 33 — The Living Neighborhood: audit, design, and the long road

*Status: second-agent design deliverable. Source-backed audit + proposals for the living block, the long narrative arc, character continuity, and postcard memory. **No shared code was written for this doc** — every proposal names its integration point and its owner. The lead agent decides what ships and when.*

*Companions: [Doc 29](29-second-agent-environment-pass.md) (the environment pass, rounds one–six, implemented) and [Doc 31](31-visual-audit.md) (the lead agent's frame audit). This doc is the thinking those builds serve.*

---

## Part one — the audit (what exists, honestly)

### The world (short version; Doc 29 carries the detail)

The block is one street segment (x −50..50) with sidewalks at y = 0.1, granite curbs, a crosswalk with a traffic signal, twelve street trees in granite-rimmed pits (four turning gold — it is October), a subway plaza with two stone deck slabs, bus terminal, Rosa's bodega, Sunrise Laundry, brownstone row with one cast-iron fire-escape silhouette, utility poles with sagging wires, and the east end. It is dressed with restraints: every prop is palette-anchored, geometry is shared, the fire escape is silhouette-only. Ambience runs in second-agent-owned modules: `leaves.ts` (48 instanced leaves, per-tree palettes), `ambient.ts` (two pigeon flocks with plumage morphs, wing-flap flight, dusk roost; one squirrel), plus canopy sway and lit lamp faces. Known limits: pedestrians exist only as story-cast spawns; the block's "crowd" is the morning rush, not a population.

### The characters

Four authored people live in the build today: **Rosa** (the co-signer, the Hospitality Law made flesh), **Mr. Idris** (the first Regular — two sugars, every day), **the kid** (gold window → stool → corner), and **the stranger** (Day 4's mirror of the player's own Day 1, now carrying the Map). Sal runs Sunrise Laundry (Day 4 afternoon). Continuity machinery already exists and works: narrative booleans (`kidKept`, `idrisServed`, `stoolUp`, `mapGiven`, `permitFiled`, `apronClean`…) persist in Save v1; Rosa's Day-2 chat is a stateful line table (`rosaChatI`); replay days re-greet you differently ("Day 3, again. The stool is still warm."). What does not exist yet: *counts* (how many mornings you've served someone), so greetings cannot deepen gradually — they jump at authored flags.

### The calendar

One in-game day ≈ 5–8 minutes, one sitting, ends on the Postcard. `GameState.step` is a linear beat machine (32 steps across Days 1–4); `MAX_DAY = 4`; a Day-4 rail holds the goodnight instead of writing Day 5. Saves are localStorage JSON with optional fields that parse clean from older saves (the stool/permit pattern). Replays are warm but reward-free. This architecture is *enough* for everything proposed below — no new calendar, clock, or save framework is needed, and none is wanted.

### The postcards

The TS-01 pipeline is real and good: authored dusk rig pose → offscreen render → paper frame + caption composite → PNG (panel + download). Captions are authored per day via `composeCaption` — money arc ("$87 → $123"), a "Met:" line, the cart's name as signature. Captions already read flags (replay days, day number). What they do not yet carry: the small things — who else you met, what the block looked like, what week of your New York it was.

---

## Part two — living-neighborhood design

**Principle: the block is inhabited, not populated.** Every addition answers: who does this, and when? Nothing spawns "to make it bigger." Cost budget: zero new draw calls at rest for everything below except where noted.

### 2.1 Pedestrian routines by time of day (proposal; integration: Game.ts spawn kinds)

The `PlayerKind` spawn system ('rush' | 'solo' | 'idris' | 'lunch') already routes people by story beat. Extend it with **ambient walkers** that belong to the clock the player can feel:

- **Morning (the rush):** commuters thread the crosswalk toward the subway plaza — brief, purposeful, no interaction. They are the reason the line at your cart exists.
- **Midday:** the slow kind. Someone reads the flyer board. Someone sits on the bench with a bag of crumbs — the pigeons notice (they already walk toward positioned "crumb" spots; the bench is one).
- **Dusk:** nobody hurries. The flock roosts (already true — the dusk law in `ambient.ts`). One walker stops at the crosswalk and looks up at the windows, because that is what dusk is for.

Implementation is one seeded walker with two or three authored paths per band — no pathfinding, no crowd sim, three to four bodies on screen at most. Each path is hand-placed to never cross the cart's service zone or the story-cast marks.

### 2.2 Familiar faces (proposal; integration: same spawn kinds + one flag check)

A walker who has passed you on five different days becomes a person. Concretely: one recurring ambient body — the same jacket, the same walk — whose greeting escalates on **existing narrative flag counts** (see §4). By week two she nods. By week three she orders "the usual" at your cart *as an authored beat*, not a system. She is the proof that the block watches you back.

### 2.3 Small changes between days (proposal; integration: World dresser keyed on `state.day`)

The block should keep a diary a player can read at a glance:

- The **flyer board** rotates its paper every few days (off-the-street notices: a stoop sale, a lost cat, a parade permit — Doc 03 §9, §7). One texture swap, authored set, deterministic by day.
- **Window lights** vary which windows are lit — someone is away, someone got home late. Already partially true (the gold window, Rosa's warm sill); widen the set from three to six authored states, keyed on day, never random-flicker.
- **The planters** (round four's cedar boxes) hold blooms through October, then go to soil-and-branch — the first visible "week" change a player notices without being told.
- **The construction barrier** (one, water-main) is gone by week two, leaving fresh asphalt — the block repairs itself the way blocks do.

Each is a material or visibility toggle on existing geometry. No new props. The 1-Second Law holds: any paused frame still reads as the same street.

### 2.4 Weather and seasons (proposal; only what the architecture supports)

October is locked by design ("the game's sun never leaves golden hour" — the lamps are already on). The honest proposal: **season drift by week, not weather sim.** Leaves drop a little more each week (`LeafDrift` already counts; the REST cadence and tint mix are two parameters). First snow belongs to the GDD's calendar (Doc 01 meta loop #6) and to the lead agent — when it comes, it lands on a world that already knows how to change quietly.

### 2.5 Subway activity (proposal; integration: World plaza block)

The subway entrance is a prop today. Two authored touches make it a system: a **rumble-and-glow** cue (the grate breathes warm light for two seconds every few in-game hours — one emissive pulse, zero geometry) and, rarely, a busker's horn note from below (Doc 03 §8) if the audio ledger (Doc 32) opens for it. Both are dusk-law-compliant: the plaza settles at night like everything else.

---

## Part three — the long road (days, weeks, months, years)

*These are narrative pacing guides, not timers. The GDD's stage weeks (~Week 3 bodega, ~Month 2 café) are how the story paces when played naturally — never a gate that holds a good beat hostage. If the player earns the moment early, the moment comes.*

### Days 1–4 — the first four mornings *(shipped — the lead agent's)*

You learn the corner: Rosa's counter, Idris's two sugars, the kid's window, the stranger's Map, the permit. The block learns you.

### Days 5–10 — "the regulars" (the week of hello)

- **You:** your first full week alone at the cart. The rush gets easy in the middle; the endings get interesting.
- **The block:** the flyer board starts carrying your cart's name in other people's notices ("coffee, the good kind, by the terminal"). The bench-sitter from §2.1 becomes the familiar face of §2.2.
- **Beats:** Idris brings a friend once ("she orders something cold. Don't ask"). The kid does homework on the stool — a silent beat, no dialogue. Rosa checks the permit's post office box *with* you.
- **Postcard:** the week's last card caption gains a line no system writes: *"Six mornings. The corner answers to two names now — yours and Rosa's."*

### Weeks 2–3 — "a door of your own" (the bodega, when it's earned)

- **You:** the GDD's Slice Ladder stage two. Rosa co-signs the lease — the designed tearjerker, and the first *year-one* milestone that changes the street physically (the corner rebuilds; every postcard after shows it).
- **The block:** the barrier's fresh asphalt (§2.3) is a week old. Stoop-sale Saturday (Doc 03 §9) fills the sidewalk — the chipped mug that becomes "the mug Idris refuses to replace" is bought here, on camera, from a neighbor.
- **Save:** the bodega stage is one permanent field (the stool/permit pattern) plus the corner-rebuild hook.

### Weeks 4–8 — "people choose to stay" (the café)

- **You:** stage three. The emphasis shifts from serving to keeping — seating, music, the cup that comes back. The gameplay change is how you *host*, not what you earn.
- **The block:** the familiar face now brings someone. The kid — who has been doing homework on your stool for weeks — leaves a drawing on the counter. It stays up forever (one flag, one texture).
- **The city:** Manhattanhenge (Doc 03 §3) lands here — the whole cast looks west, and the postcard writes itself.

### Months 2–4 — "the line is out the door — and it's YOUR door"

- **You:** stage four, hiring Regulars (the GDD's staff system). Idris trains your first hire — two sugars, every day, and now he teaches it.
- **The block:** parade day (Doc 03 §7) closes the street; the block party tradition starts small — folding chairs, the stoop, someone's radio.
- **Years:** the Rooftop (stage five, ~Month 4) is not an ending — it's the room where the game's Hospitality Law completes: you host the next stranger's first morning. The Map changes hands again. The GDD's Block Party (Day 365 postcard: *"You came here knowing nobody. Look around."*) is the capstone, whenever the player's own story arrives there.

**Across all of it:** no energy, no waiting, no counters to feed. A day missed is a day the block kept gently going without you — the replay-greeting system already knows how to say that kindly.

---

## Part four — character continuity proposal

**Rule: memory is content, not mechanics.** No friendship bars, no dialogue trees, no affection points. The existing flag + line-table architecture carries everything:

1. **The greeting ladder** (generalize `rosaChatI`). Each character gets a line table indexed by *authored milestones*, not a counter: first hello → the usual → the small talk → the shorthand. Where a count is truly needed (the familiar face's nod), derive it from existing flags (`idrisServed`, `mapGiven`, day number) rather than storing points. *Integration: `content.ts` line tables; zero new systems.*
2. **The remembered favor.** The architecture already stores what matters (`kidKept`, `stoolUp`, `apronClean`). The proposal is only to *speak* it: a character's line table reads the flag and changes one sentence. Idris, three days after you kept the kid's order warm: *"You did right by the kid. That's the whole job, kid."* One line, no cutscene.
3. **Routines that change for believable reasons.** Idris arrives late one day — he's at the laundry (you learn Sal's story because Idris did). The kid stops coming to the window because he's *at the cart*. Each shift is authored, flagged, and permanent — never random.
4. **Trust-gated stories.** Each core character has one story that only unlocks after two specific prior flags — not after N days. Rosa's anniversary (Doc 03 §20) needs the bodega stage and the permit; the payoff is her handing you the ledger pen.
5. **The early kindness that echoes.** The cup given on Day 2 comes back on the bodega's first morning, washed, with a plant in it. The Map comes back on the Rooftop's first night, in someone else's hands. The architecture is one boolean per echo, saved forever.

**Anti-goals (explicit):** no sudden intimacy, no dialogue dumps, no "friendship level up" toasts, no affection economy. Warmth is authored, sparse, and permanent once given.

---

## Part five — postcard memory proposal

The pipeline stays. The postcard stays a single 768×1344 frame, dusk-lit, paper-framed, captioned, kept as a PNG. Proposals, in order of value-per-cost:

1. **The caption learns the day** (integration: `composeCaption` args + existing flags). The "Met:" line already varies by day; widen it to read the day's flags — who sat down, what was filed, who was kept. Cost: a dozen authored lines and one args extension. This alone makes each card a diary entry.
2. **The season stamp** (integration: caption compositor corner). The postcard's stamp corner carries the week: a leaf for October, a snowflake when the calendar finally says so, the cart's name after the bodega opens. One small authored texture swap keyed on the same day/field data — no pipeline change, visual style untouched.
3. **The shoebox** (proposal; lead agent's call — it touches storage). The kept postcards become a keepsake: captions plus a 192×336 thumbnail (~20 KB JPEG) per card, capped at the last eight, in a corner of the existing save. Not a gallery UI — a drawer in the pause menu that looks like a drawer. The GDD's Postcard Album (meta loop #2) is the full version; the shoebox is its honest slice for the web build, sized so a save never grows past a kilobyte-scale footer.
4. **The block in the frame.** As §2.3's block changes land (barrier gone, planters turned), they appear *in the captured frame itself* — the postcard quietly becomes a before/after of your street. No code beyond the changes in §2.3; the capture already shoots the live scene.

**What is explicitly rejected:** an unrelated gallery app, share-wall meta-systems, or anything that makes the postcard a chore. The postcard is the reason to finish a day, not a task inside it.

---

## Part six — integration notes for the lead agent

- **This doc touches no code.** The implemented companions are in Doc 29, rounds one–six: `leaves.ts`, `ambient.ts`, `props.ts`, `streetAssets.ts`, plus World's tree/pigeon/leaf/plaza-deck placement blocks — all second-agent-owned, all additive.
- **Round six (this push), verified:** `Plaza_Deck_W/_E` now render proud of the slab (the first draft deck was buried and invisible); pigeons carry a wing pair that appears only mid-flight (zero steady-state draw calls — `visible=false` skips the draw); the fire-escape deco's braces are diagonal wall→deck struts that read from the street; the subway F-bullet rides its post instead of floating beside it. Probe `probe-env6.mjs` asserts all four live; `probe-identify.mjs` is the pixel-identification tool that found the bullet.
- **Cheapest first steps** if the lead wants the living block soon: §2.3's flyer rotation and window states (pure World dresser, one file), then §4.1's greeting ladder (pure `content.ts`). Both are day-keyed and save-clean.
- **Everything else waits for the lead's architecture decisions** (pedestrian routing, seasons, the shoebox). The proposals are written so each can land independently, behind the existing save-parse laws, without touching the Step machine or the core loop.

*The block is already alive. This doc is how it stays that way on a street the player keeps coming back to — the corner remembers, the pigeons fold their wings, and the light stays on.*
