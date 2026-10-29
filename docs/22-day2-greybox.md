# Day 2 — The Neighborhood Comes Alive

**What this is:** the second playable day of the greybox, built on top of Day 1 without touching what already worked. Day 1 is untouched end to end: same steps, same notes, same postcard. Day 2 begins when Day 1 ends.

**Status:** implemented and verified headless (Godot 4.7.2-stable). No display server in the build environment, so all evidence below is from real input-driven headless runs, not screenshots.

---

## 1. First, the seams (Doc 21's three findings, closed)

All three seams from [Doc 21](21-synthetic-playtest-01.md) were reproduced, fixed at the root, and re-tested with the same harness that found them:

| Seam | Fix (in `scripts/main.gd`) | Evidence |
|---|---|---|
| **1 · Crosswalk has one door** | The goal is now the far sidewalk, not one painted stripe: `CROSS` advances when the player reaches z < −4.1 anywhere across the street. Cross at the stripes and the Shuffle note plays; cross anywhere else and the game says *"You found your own way across. The crosswalk still likes you."* | corner_cutter persona: was **stuck**, now **completed_day in 32.5 s** — *"the city noticed and let it go"* |
| **2 · Leaving the ladder is one-way** | Two parts: stepping off a ladder mid-climb now triggers Rosa — *"Fire escape! Around the corner! You found it once!"* — and the objective re-points at the place, not the verb. Ladders also let you all the way down now (climb-speed descent with floor release). | autotest: `PASS stepped off ladder 1` → `PASS stepping off calls Rosa's hint` → `PASS re-grabbed ladder 1`. Wanderer stays `incomplete` by harness design — the script models a player who ignores hints; the game no longer ignores the player. |
| **3 · The end refuses to be lingered in** | The postcard now closes on interact. The player unfreezes, the camera comes back, the dusk stays lit, and the rail on the landing becomes a soft interaction: first press — Rosa's window warms across the street (*"Good night, coffee."*), second press — tomorrow. | gold_gazer persona: was **0/8 responses, frozen**, now **1/8 answered, `frozen:false` throughout** (its stand spot is out of rail range; the dismissal answers immediately — the main autotest verifies the full rail sequence). |

Harness honesty note: `spikes/playtest.gd` was updated where its hardcoded summaries would now lie (corner_cutter finishes the day after the game notices; gold_gazer reports a computed count). The personas' walking behavior was not changed.

---

## 2. The day itself

Day 2 is one complete loop, entered through the intended flow (finish Day 1, linger or not, press at the rail) or by loading a save. No introduction repeats. Nothing resets that should not.

**The beats:**

1. **Morning.** Fade through a title card. The sky is a different morning, not Day 1's replayed dusk. The cart stands where you named it, sign and all. Objective: *Morning. The regulars are waiting.*
2. **Idris comes back.** He said he would. He walks up to the cart, orders the usual, and pays. If the awning is already up, he leaves a dollar extra under the cup.
3. **Rosa, out front,** sweeping (she sways; the street is never still). Her lines change with your state: your cart's name, the kid, the awning — she has one for each. The favor: the kid in the gold window watches your corner all day; take him a regular. You carry it — a small cup rides in the player's hand until delivered.
4. **The delivery.** A teal door and stoop on the gold-window building (new, but from the street's own palette). The kid pays in exact change and one fact about the trains. A small shape appears at the glass and stays.
5. **The awning — the cart progression.** Teal, like Rosa's, $15 cash, confirm-press purchase at the cart. Real effects: it visibly changes the cart (awning + scallop edge), it pays $1 tip per serve for the rest of the day, and it unlocks the lunch rush (three extra customers who came for the shade). Money math the autotest checks exactly: $112 → serve Idris $114 → deliver $117 → awning $102 → lunch 3 × ($2 + $1) = **$111**.
6. **Dusk, the same seat.** The fire escape knows you now. At the top: the kid waves from the window you lit, and the lamp next door flickers, thinks about it, and stays on too. Two windows. Rosa saw it from the counter.
7. **The postcard.** *"Day 2. $112 → $111. Met: the kid. The corner knows you back now."* It closes. You can stay.

**Wonder beat:** the second window. The Skyline of Lit Windows rule is kept: nobody asks how many windows there are. One kid got kept, and his neighbor noticed.

---

## 3. Save v1 (`scripts/save.gd`)

Local JSON at `user://save.json` (Doc 07 §6 names local JSON). Pure logic, no scene dependencies. Rules:

- **Day 1 never writes.** The intro replays fresh by design; R during Day 1 restarts Day 1, as it always did.
- **A day-start snapshot is written when a day begins.** Mid-day, every durable change (serve, delivery, purchase) persists immediately: quit any time, resume exactly — money exact, no re-serves, no duplicate rewards, undone work is not pre-done.
- **A kept final day replays safely.** Finish Day 2 and come back: the day replays with rewards resting (*"Replaying a day you kept. The coffee's on the house today."*). Zero duplicate money.
- **A corrupt save is a fresh start,** never a crash: `--autotest-corrupt` + `--autotest-corrupt-boot` verify garbage JSON boots a safe fresh Day 1.

---

## 4. Test ledger (commands actually run, results as printed)

| Command | Result |
|---|---|
| `godot --headless --path greybox-godot -- --autotest` | `AUTOTEST OK: 0 failures, sim time 36.9s` — 44 checks: full Day 1 (money $87 → $112 per Doc 08), all three seam regressions, full Day 2 (Idris +$2, delivery +$3, awning −$15, lunch 3 × $3, kid at the glass, second window, Day-2 postcard), save file parsed and verified |
| `godot --headless --path greybox-godot -- --autotest-load` (kept day) | `AUTOTEST-LOAD OK: 0 failures` — day/cart/money/awning/kid restored; replay earns nothing |
| `AUTOTEST_STOP=idris … -- --autotest` then `-- --autotest-load` | `AUTOTEST OK: 0 failures, stopped at idris` + `AUTOTEST-LOAD OK: 0 failures` — mid-day resume: money exact ($114), Idris not re-served, flow routed to the pending step, idle resume pays nothing |
| `-- --autotest-corrupt` then `-- --autotest-corrupt-boot` | `AUTOTEST-CORRUPT-BOOT OK: 0 failures` — garbage save boots a safe fresh Day 1 |
| `PERSONA=sprinter … playtest.tscn -- --playtest` | `completed_day — 33.3 s` (identical to the Doc 21 baseline) |
| `PERSONA=hesitant …` | `completed_day — 55.5 s` (identical to baseline) |
| `PERSONA=corner_cutter …` | **was `stuck`; now `completed_day — 32.5 s`** |
| `PERSONA=wanderer …` | `incomplete` — by harness design (script never returns to the ladder); the game-level recovery is proven in the autotest |
| `PERSONA=gold_gazer …` | `completed_day — 1/8 linger attempts answered`, `frozen:false` in every attempt |

**Not verified in this environment (stated plainly, not hidden):**

- No display server is available, so nothing here was *seen*. The Day 2 visuals (awning, stoop, kid silhouette, morning light, the wave) are verified by state assertions and palette reuse, not by eyes. The spectator/TS-01 rigs exist for exactly this and need a framebuffer.
- Touch controls remain not-in-yet (they were not in Day 1 either — see the greybox README). Day 2 adds only labels and prompts inside the existing UI patterns; no new input scheme.
- The Day-2 dialogue variants (Rosa's stateful lines) are exercised by state in the autotest but their *text* is verified by reading, not by assertion.

---

## 5. Files

- `greybox-godot/scripts/main.gd` — seam fixes, day state machine, Day 2 world beats, autotest extensions
- `greybox-godot/scripts/save.gd` — new: save v1 (pure logic)
- `greybox-godot/scripts/player.gd` — unchanged
- `greybox-godot/spikes/playtest.gd` — harness honesty updates only (see §1)
- `docs/21-synthetic-playtest-01.md` — re-test addendum
- `greybox-godot/README.md`, `README.md` — reality sync

*Provenance: built on the Day 1 greybox (Doc 10 contract, Doc 08 content voice), seams from Doc 21, economy anchored to Doc 08's "$87 → $112". Godot 4.7.2-stable headless, 2025 session.*
