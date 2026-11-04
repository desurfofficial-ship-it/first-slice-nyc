# Doc 58 — The Regulars' Ledger: arc design beyond Day 4

> **Status: design decree — this doc touches no code.** The build it
> describes is feature-sized work and stays un-smuggled (the B16 rule: a
> decree first, a build in its own wave). Numbered 58 because `docs/57-` is
> reserved for the first playtest results analysis (docs/55's correction,
> docs/56 §close).
>
> **Companion docs:** Doc 01 System 4.1 (the GDD's Regulars — law), Doc 33
> §4 (the living-block people law), Doc 30 (Day 4's permit, Day 5's
> inheritance), the living-world audit §7 (rec #1 Day 5, rec #4 the
> greeting ladder) and §9 (the Wait ruling). Filed as **B17** in docs/51.

---

## 1. The finding — the corner already runs two arcs

The gap list has carried "Regulars arcs beyond Day 4 (needs design)" since
the eight-orders audit. Reading main @ `d3c80a0` instead of re-deriving from
the GDD shows the honest shape of the gap: **the build already contains two
regulars' hooks and half their beats** — what's missing is the ladder
machinery and the days to deliver the rest.

Evidence, all on main, none of it new:

- **Mr. Idris has run a four-beat constancy arc without anyone calling it
  one.** D1: the order card ("Coffee. Regular. I'll be back tomorrow." —
  `IDRIS_SPAWN_NOTE`) → D2: the conversion ("Regular unlocked — Mr. Idris.
  Two sugars. Every day. You'll see him tomorrow." — `REGULAR_UNLOCKED`,
  the `idrisServed` latch) → D3: "Third day. Same cup. That's how you know
  a place is real." (`D3_ORDERS[0]`) → D4: "Fourth day." He doesn't explain
  further. The cup explains it. (`D4_ORDERS[0]`). Side branch: the kidKept
  favor reaction (`IDRIS_D3_FAVOR_REACTION`) — a beat that pays differently
  because of kindness on a previous day. That is an arc. It stops at the
  rail because Day 4 is where the days stop.
- **The early shift is a two-beat arc nobody owns.** D3: "Large, black, no
  sugar. I've been up since four." (`D3_ORDERS[2]`) → D4: "Large black.
  You're part of the commute now. The city decided. That's how it happens."
  (`D4_ORDERS[2]`). Two lines, escalating, by the same unnamed body on the
  same order. She is docs/33 §2.2's "familiar face" already speaking — the
  proof-of-concept the audit asked for, shipped by accident.
- **The lunch parent is the only count-ladder in the build.**
  `lunchServed` 1 → 2 → 3+ swaps her line each serve (GameState, the
  D2_LUNCH band). It works — and it is the pattern the rest of the corner
  is missing.
- **Rosa has day-keyed tables, not milestone-keyed ones.** `rosaChatI`
  walks per-day line tables (lines3, lines4) plus the window-count lines
  ("Two windows now." → "Three windows." → "Four windows now. FOUR."). The
  richest ladder on the block, still keyed to *which day it is* rather than
  *what the save can prove*.

So "the Regulars are missing" was never quite true. What's missing is the
**ledger**: one honest answer, per person, to *what does the save prove,
and what does the corner say back?*

## 2. What the GDD demands vs. what the audit ruled — this doc obeys both

| Source | Says | How this doc complies |
|---|---|---|
| Doc 01 System 4.1 | 12–16 Regulars, 6–10 beat arcs, one beat per session or two, each tied to neighborhood/food/sound/value | The **ledger** is that system's v0: same four components, scaled to the corner. The 12-cast form is phase 2 (PRD-4) and stays out of scope. |
| Living-world audit §9, Wait | "New Regulars (Samir, Priya, Mabel…): the existing cast needs counts and routines *before* the cast grows" | The roster in §4 is the people already on main. No new named body is designed here (§6). |
| Audit §7 rec #4 | Greeting ladder: per-character line tables indexed by *authored milestones*, counts derived from existing flags, not stored points | Adopted verbatim as the **Count Law** (§3). |
| Audit §7 rec #1 | Day 5 = the permit payoff; one `D5_*` step band, the exact Day-4 pattern | The ledger **rides** that band — beats need days to live on (§5). This doc does not re-spec Day 5; docs/30 + rec #1 own it. |
| docs/33 §4.3 | Routine shifts are authored, flagged, permanent — never random | Every beat in §4 names its flag. No dice. |

## 3. Definition — what a Regular is, in this build's own language

A Regular is a person the save can prove. Four components, all of which
already exist somewhere on main — the design is **assembly, not invention**:

1. **Provable history.** Save facts, v1-safe: `idris_served` (the latch),
   `kid_kept`, `lunch_served`, `stool`, `map_given`, `permit`, `day`,
   the living-block counters. A Regular's ladder may only reference facts
   like these — the save is the ledger.
2. **A greeting ladder.** Per-character line tables indexed by *authored
   milestones* (first hello → the usual → the small talk → the shorthand),
   where a milestone is a derived predicate over flags + day. Where a true
   morning count is needed and cannot be derived, it is **one** optional,
   clamped save counter per person (`idris_mornings?: number`), following
   the exact `lunch_served`/`stool` pattern: missing reads 0, clamp [0, 999],
   no key bump (Doc 37 §3F).
3. **Arc beats.** Authored shifts delivered across days — arrival changes,
   location changes, favor paybacks — each carrying its flag, each permanent
   once fired (docs/33 §4.3). A beat never fires twice; a replayed day
   re-greets warm and pays nothing (the existing replay law).
4. **A kept-mark.** The block's existing warmth language: a gold window, a
   Map note, a flyer, the stool, a window-count line from Rosa. Every arc
   ends by leaving one of these marks. No meter, no badge, no counter the
   player can open (audit's Never list).

**The Count Law (this doc's one new law):** *counts are derived from flags
and days where derivation is honest; a stored counter exists only when
derivation is impossible; the player never sees a number — they hear
"fourth day."* `lunchServed`'s 1 → 2 → 3+ line swaps are the precedent;
"Fourth day." is the tone.

## 4. The corner roster — six people, named by their proofs

No new bodies. These are the people main already renders and speaks.

| # | Regular | Proof on main today | Ladder missing | Beats beyond Day 4 (ride the D5 band) | Kept-mark payoff |
|---|---|---|---|---|---|
| 1 | **Mr. Idris** | 4-beat constancy run (D1 order → D2 unlock → D3/D4 "Third day."/"Fourth day."), `idris_served` latch, kidKept favor | A per-morning table; his D5+ lines still say nothing past "Fourth day." | **The sixth morning.** Idris orders "the usual" before the rush opens and the cup is already sugared — you knew (audit rec #4's exact example, delivered). Then, authored shift: one day he's late — he's at the laundry (docs/33 §4.3's example) | His window warms gold the morning the count hits six; Rosa's window-count line gains its "five" and "six" rungs |
| 2 | **Rosa** | `rosaChatI` day tables, window-count lines (2/3/4), the D4 inversion ("You looked like that once") | Milestone keys: her lines should key on *windows lit* and *permit filed*, not day number | Day 5: the permit receipt lands on her counter — she co-signs the corner the way she co-signed Day 4's on-the-house rule. Her chat shifts from teaching to teasing (the GDD's "look at you" payoff, v0) | The flyer board's "BEST CORNER COFFEE" slip gains her handwriting (docs/34's board, one redraw) |
| 3 | **The kid** | Gold window referent (`kid_kept`), stool (`stoolUp`), "F and M both work. Don't overthink it." (D4) | His arc is flags without days: nothing he says changes on Day 5 | Authored shift, docs/33 §4.3 verbatim: he stops coming to the window because **he's at the cart** — the stool is his, the corner absorbed him. His first unsolicited slang fact goes into the Map (`map_notes`) | The stool gains a second occupant line + the Map note; the gold window he came from stays lit — kept means kept |
| 4 | **Sal** | Sunrise Laundry, Day 4 afternoon; the wash beat | Nothing — one appearance, no re-greet | Idris-late beat (row 1) is *how* you learn Sal's story: the wash cycle as the block's clock. One authored chat, flagged off `idris_mornings ≥ 6` | A flyer on docs/34's board: SUNRISE LAUNDRY — SAME-DAY, and Sal's window joins the lit set |
| 5 | **The stranger** | D4 mirror ("You make her a regular"), carries the Map (`map_given`), watched the order not the hands | She exits the story at the crosswalk; nothing proves she stayed | **The inversion.** Day 5: her first Map note comes back through Rosa — it's about *you*. The taught became the teacher; the Hospitality Law closes its loop (the note's text is D4_STRANGER_WATCH_NOTE's "It still works," said by someone else) | Her postcard caption line (docs/33 §4.1's "Six mornings…" is the model, re-aimed: the corner answers to three names now) |
| 6 | **The early shift** | Two escalating rush lines (D3 → D4), same order, same body | Everything — she has no ladder, no flag, not even a `who:` of her own (`'rush'`) | Beat 3: she orders "**the usual**" as an authored beat — docs/33 §2.2's week-three proposal, arriving. `who: 'earlyshift'` joins the order union; her pay is her own | **Her name.** The Feelings-First Law: the name is the payoff, not the setup. Rosa says it once, in passing, and the Map keeps it as a slang-adjacent card. The name itself is deliberately NOT chosen in this doc (§10) |

Roster rule going forward: a body graduates to the roster only by *proof*
(a save fact + at least one authored re-greet). The lunch parent is the
next candidate (she has `lunchServed`); nobody else is drafted.

## 5. The arc shape — hook, shift, sixth morning, kept-mark (3+1)

The GDD's 6–10 beats are phase 2. The corner's arcs are **3+1**: a hook
(already shipped inside Days 1–4 for all six), a *shift* beat (someone is
somewhere they weren't, for a stated reason), a *constancy* beat (the
sixth morning / the usual / the note returned), and a *kept-mark* (§3.4).
Delivery:

- **Vehicle:** the Day 5 band from audit rec #1 — the permit payoff —
  as the step band (`D5_WAKE … D5_POSTCARD`), built with the exact Day-4
  pattern (one `beginDay` branch, one order queue, one climb, one postcard).
  The ledger does not re-spec Day 5; it specifies what the band must carry:
  at least one shift beat, one constancy beat, and both their kept-marks,
  reachable in one honest playthrough.
- **Counts:** `idris_mornings` is the only new counter §4 actually needs
  (the sixth morning predicate); every other beat derives from existing
  flags + the day. If implementation finds a second counter tempting, the
  bar is §3's Count Law — name the predicate first.
- **Replay law:** a replayed Day 5 re-greets warm ("Day 5, again. The
  receipt's still on the counter."), pays nothing, advances no count. The
  existing replay machinery (replayNoteShown, the "coffee's on the house"
  path) is the paved path.
- **Postcard:** the Day-5 card's caption reads the day's flags like every
  card — including the roster marks (windows lit, whose handwriting is on
  the flyer). No new caption system; the existing flag-read caption grows
  two lines.

## 6. Decisions written down (the Wait ruling, restated so it holds)

- **New named cast — WAITS.** Samir, Priya, Mabel, Mrs. Chen, Darnell,
  José, Fatima, Eddie, Lena & Odd, Big Mike: none are designed here, and no
  doc should design them until the Day-5 loop proves people return
  (audit §9; docs/06 PRD-4 owns the phase-2 arcs). This is the quality rule
  (docs/33): the existing cast needs counts and routines first.
- **The GDD's 6–10 beat arc form — phase 2.** The corner runs 3+1. The
  ledger is System 4.1's *v0 contract*, not its downgrade: hooks, shifts,
  constancy, kept-marks, save-provable.
- **The fluency ladder (Tourist → New Arrival → Regular → Neighbor →
  Local) — waits with the new cast.** Rosa's Day-5 teasing beat (§4 row 2)
  is its one approved v0 taste, keyed on the permit flag, not on a level.
- **No festival, no Block Party, no rooftop events.** The events system is
  OUT of the slice (docs/07 §3) and the audit's build-first list comes
  first. Rosa's 30th-anniversary festival (Doc 01) is phase-2 arc material,
  not a Day-5 beat.
- **No timers, no meters, no decay.** A day missed is a day the block kept
  gently going without you (docs/33 §5): the replay-greeting path covers
  absence; the Count Law counts mornings, never absences.

## 7. Laws check

| Law | How the ledger satisfies it |
|---|---|
| **Hospitality** ("when unsure, choose the one where someone gets kept") | Every arc ends in a kept-mark, and the stranger's beat inverts the loop — the player becomes the one remembered. The roster rule keeps the door open for the next body to graduate. |
| **Feelings-First** (names after feelings) | The early shift earns her name LAST; six beats precede it. The kid's slang fact is taught by his hands, at the cart. |
| **No-Quiz** | Ladders are counts of mornings, never questions. The sixth morning is a gift, not a check. |
| **No-FOMO** | Nothing decays, nothing expires, nothing is missable: every beat is reachable on any honest Day-5 playthrough; replays pay nothing and shame no one. |
| **Wonder-Beat** (one per milestone) | The kept-marks ARE the wonder beats: a window that turns gold at "sixth day", a flyer with Rosa's handwriting, a Map note written by the person you taught. |
| **1-Second / Vertical-First** | All marks use existing render paths (window emissives, the flyer board, Map notes) — nothing new to read at a glance, everything legible in a paused 9:16 scroll. |

## 8. Acceptance + permanent guards (issue → permanent guard)

The build wave that implements this decree inherits these gates, in the
house style (each a test that can fail, not a comment):

1. **Ladder pins (vitest, `content` or new `content-regulars.test.ts`):**
   per-regular line tables exist for the six; every milestone key resolves
   to non-empty text; the early-shift beat carries `who: 'earlyshift'` in
   the D5 queue; no table references a flag the save cannot prove.
2. **Count Law pin:** a test that walks the D5 band's beat predicates and
   asserts each is a pure function of `{day, flags, counters}` — no RNG in
   any arc decision (the determinism rule, AGENTS.md §1c.4). The
   `idris_mornings` field parses from old v1 JSON as absent→0 and clamps
   [0, 999] (extend the `save.test.ts` "old v1" case).
3. **Permanence pin:** firing a shift beat once latches its flag in Save;
   a second pass over the same band cannot re-fire it (the "beat never
   fires twice" law, testable from GameState alone).
4. **E2E:** one autotest节拍 walks Day 5 far enough to land the shift beat,
   the constancy beat, and both kept-marks — the Day-4 pattern (docs/29's
   E2E section is the template). The rail's "still being written" line moves
   to Day 6's rail or retires with the band; docs/29's honest-wall note gets
   its follow-up edit in the same commit.
5. **No-smuggling pin:** the roster graduation rule (§4) is one paragraph
   in this doc, enforced by review: a new `who:` in an order queue without
   a save fact + a re-greet is a review reject.

## 9. Close rule

B17 closes when all five §8 gates are green on main AND the Day-5 band
ships with the roster beats it must carry (§5). The gap-list line then
reads: "Regulars ledger v0 — shipped; new cast waits for the Day-5 loop's
return signal." Until then, docs/51 B17 is the queue entry and this doc is
the decree.

## 10. Open questions for the lead (genuine human calls)

1. **Sequencing:** ladders for the existing days first (pure `content.ts`,
   no Day 5), or one wave with the D5 band? This doc assumes one wave —
   beats need days to live on, and a ladder that peaks at "Fourth day." is
   a ladder to nowhere. If the lead wants the two-week content.ts-only
   version, §4 rows 1–2 survive unchanged.
2. **The early shift's name** — deliberately not picked. The Feelings-First
   call is when, not what: propose it after the first playtest round
   (docs/56's ledger), when a tester asks "does she have a name?" unprompted.
   If nobody asks, she isn't ready, and that is a finding, not a failure.
3. **The kid's kept-mark** — the stool seat and the Map note are both
   load-bearing (one is space, one is paper). This doc ships both as one
   beat (§4 row 3); if the wave must cut one, cut nothing — split the beat
   across two days instead. Flagged for the lead only because both props
   are already loved by testers.
