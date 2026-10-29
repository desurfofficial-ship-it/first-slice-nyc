# Day 1 Greybox (Godot 4.7)

Doc 10's contract, built in Godot 4.7.2 instead of Unity 6. The whole level is
built in code (`scripts/main.gd`), so changes show up as readable diffs.

## Run it
1. Get Godot 4.7.x (standard, not .NET) from https://godotengine.org/download/
2. Open Godot → Import → pick this folder's `project.godot` → Run (F5).
   The window is 720×1280, vertical first.

## Controls
- WASD / arrows: walk. On a ladder, W/S climb and A/D step off.
- Space or E: interact (Rosa, shelf items, counter, cart).
- Z / C: turn the camera. R: restart the day.
- G: force dusk + gold window (debug). P: save the current view as a Postcard PNG.

## The path
Day 1: Terminal → Rosa → bodega (3 shelf items, 5-order rush) → crosswalk →
claim and name the cart → 3 serves (the third is Mr. Idris) → fire escape
(dusk starts) → top landing → gold window flickers, then holds → Postcard
composes and saves to `user://postcards/`.

Then the day ends like a day should: the postcard closes, you can linger at
the rail (Rosa's window says goodnight), and tomorrow is one press away.

Day 2 — [Doc 22](../docs/22-day2-greybox.md) — the neighborhood comes alive:
Idris comes back for the usual, Rosa asks a favor (the kid in the gold window),
the awning goes up ($15, real tips, the lunch rush follows), and at dusk a
second window lights. Save v1 (`scripts/save.gd`) persists the corner:
quit any time, resume exact; a kept day replays with rewards resting.

Map notes and captions are the exact text from Doc 08 (Day 1) and Doc 22 (Day 2).

## Headless check
    godot --headless --path greybox-godot -- --autotest
Walks the full Day 1 **and Day 2** with real physics and input — 46 checks,
including the three Doc 21 seams, the awning money math, the day-start money
arc, and the save file.
Also: `--autotest-load` (resume/replay from save), `--autotest-corrupt-boot`
(garbage save boots safe), and `PERSONA=<name> res://spikes/playtest.tscn -- --playtest`
for the five synthetic walkers.

Day 2 has been **seen** now too — [Doc 23](../docs/23-day2-render-notes.md),
frames in `../assets/greybox-day2/`, postcard pipeline proven on the second
day (`spikes/spectator_d2.tscn -- --spectator2`).

## Not in yet
- Subway spur (Doc 10 marks it optional).
- Audio stubs, the Times Square / water-tower Postcard rigs, touch controls.
- Day 3 (it is still being written).
