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
Terminal → Rosa → bodega (3 shelf items, 5-order rush) → crosswalk →
claim and name the cart → 3 serves (the third is Mr. Idris) → fire escape
(dusk starts) → top landing → gold window flickers, then holds → Postcard
composes and saves to `user://postcards/`.

Map notes and captions are the exact text from Doc 08.

## Headless check
    godot --headless --path greybox-godot -- --autotest
Walks the full path with real physics and input. It checks every beat,
including that typing W/A/S/D/Space in the cart name leaks nothing.

## Not in yet
- Subway spur (Doc 10 marks it optional).
- Audio stubs, the Times Square / water-tower Postcard rigs, touch controls.
