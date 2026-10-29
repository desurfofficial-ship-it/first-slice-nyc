# Synthetic Playtest 01 — five walkers, one day

**What this is:** the Day 1 greybox played start to finish by five scripted personas, headless, each one a waypoint walker with a different temperament. **n = 5. Zero humans.** This is not a playtest — it is a harness that finds the seams a human playtest would find first. Raw telemetry: `greybox-godot/spikes/logs/<persona>.jsonl`.

**Harness honesty note:** these walkers follow scripted waypoints. They do not pathfind. "Lost" below means the script ran out of next waypoints — which models, deliberately, what a player with no guidance would feel. The clock (the game's own day timer) freezes at DONE, so the gold-gazer's linger attempts all share a timestamp.

| Persona | Result | Day length |
|---|---|---|
| sprinter | completed_day | 33.3 s |
| hesitant | completed_day | 55.5 s |
| corner_cutter | **stuck** | dead-ends at CROSS |
| wanderer | **incomplete** | budget out at CLIMB |
| gold_gazer | completed_day | 33.3 s + 8 ignored lingers |

The two straight-line walkers finished 1.7× apart. That spread is the design working. The three below are the design not.

---

## Seam 1 — The crosswalk has exactly one door

**Observed:** corner_cutter did everything right until the street. Then it crossed east of the stripes — the corner is right there — reached the south sidewalk at (1.9, -5.2), walked to the cart, and got nothing. No prompt (`prompt_visible: false`). The step counter stayed CROSS. It stood at its own corner for the 20-second stall window. The game never noticed the crossing.

**Interpretation:** the CROSS → CLAIM_CART transition hangs on one 3.4-unit-wide trigger zone. Miss it — and "miss it" means walking 2 units too far east, which is the natural line from the bodega door to the corner — and the flow is dead. No fallback, no timeout, no hint. The objective text keeps saying "use the crosswalk" while you stand where the crosswalk goes.

**Recommendation:** the goal should be "reach the south sidewalk", not "walk through the strip". Put the trigger across the whole street width (or a north-edge zone + south-edge zone pair), and let the crosswalk stripes be the *taught* way, not the only counted way. Cheapest version: a distance check on the south side that advances the step with a gentle note ("You found your own way across. The crosswalk still likes you.")

## Seam 2 — Leaving the ladder is a one-way door

**Observed:** wanderer grabbed ladder 1 at t = 84.0, climbed partway, stepped off sideways at t = 86.1 (y back to 0.88 — it fell, harmlessly, to the sidewalk). The objective still said "Climb." No waypoint, no ping, no arrow. The walker tried six nearby spots over the next half minute; none was the ladder; the budget ran out at CLIMB.

**Interpretation:** nothing pulls you back to the fire escape once you leave it. A real player doesn't walk a scripted route — they drift, they step off ladders to look at things. Every drift is a potential dead run with no recovery loop. The checkpoint system even *sets* a respawn point at the ladder when dusk starts (main.gd `_grab_ladder`), so the game half-knows where you should be — it just never says so.

**Recommendation:** one line is enough at greybox fidelity: re-show the objective with the place name ("The fire escape, around the corner") when the player was last seen on a ladder and has since touched the ground. Rosa can say it. Rosa saying it is better.

## Seam 3 — The end refuses to be lingered in

**Observed:** gold_gazer sprinted the day in 33.3 s, then tried to stay: three interact presses, both camera nudges, two long stands, one attempt to walk (the walker is frozen — the game says so by not moving). **Eight attempts, zero responses.** The postcard panel sits there; the gold window glows; the day is over whether you like it or not.

**Interpretation:** the freeze-UI-postcard stack is a valid *end*, but it is a poor *goodbye*. The player's only remaining verb is reading. This is the moment the whole game has been walking toward — the wonder beat — and it is the one moment nothing in the world can be touched.

**Recommendation:** two cheap moves, in order: (1) let the player close the postcard and keep standing on the landing — unfreeze, leave the dusk lit, allow one soft interaction ("Stay a while" → a line from Rosa's window); (2) if the player does nothing for N seconds, that *is* the linger, and the postcard composes around it. Either way the tableau should breathe, not harden.

---

## What held

- The whole day is completable by plain walking at two very different paces. No leg required precision.
- The rush, the cart claim, the name box, the three solo serves: zero harness friction across five runs.
- Dusk, the climb, and the gold window all fire on schedule in every run that reached them.

## Next

1. Fix Seam 1 in the greybox (one trigger change) and re-run corner_cutter — the harness now exists, so re-tests are free.
2. Seam 2 and 3 are design calls, not bug calls — take them to the next design review with this file.
3. First human playtest should watch for these three seams by name and everything else besides.

## Seam re-test (Day 2 build)

The three seams were fixed in the greybox and re-run through this same harness:

| Persona | Before | After |
|---|---|---|
| sprinter | completed_day, 33.3 s | completed_day, 33.3 s (unchanged) |
| hesitant | completed_day, 55.5 s | completed_day, 55.5 s (unchanged) |
| corner_cutter | **stuck** | **completed_day, 32.5 s** |
| wanderer | incomplete | incomplete (by script design — see below) |
| gold_gazer | completed_day, 8 ignores, frozen | completed_day, 1/8 answered, never frozen |

Wanderer note, kept honest: the harness models a player who never reads hints, so it still walks out its budget. The game-level fix — Rosa calling you back to the fire escape by name, and ladders that let you all the way down — is asserted in the headless autotest instead (`stepped off ladder 1` → `stepping off calls Rosa's hint` → `re-grabbed ladder 1`). Full detail and the Day 2 build: [Doc 22](22-day2-greybox.md).

---

*Provenance: harness = `greybox-godot/spikes/playtest.gd` (subclasses main.gd, zero game edits), Godot 4.7.2-stable headless, 2025 session. Five runs, five JSONL files, committed as-is.*
