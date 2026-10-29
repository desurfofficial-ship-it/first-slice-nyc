# greybox spikes — runbook

Throwaway scripts that answer questions the docs asked. They subclass `scripts/main.gd` and never edit the game. Every run writes JSONL telemetry; keep the logs, they are the evidence.

## The display-less rendering recipe

This machine has no display server and no GPU. Real frames still work:

```bash
# One shell invocation — Xvfb and Godot must share it (background
# processes do not survive between tool calls on this sandbox).
Xvfb :99 -screen 0 720x1280x24 & sleep 2
DISPLAY=:99 godot --path . res://spikes/spectator.tscn \
  --rendering-method gl_compatibility --rendering-driver opengl3 \
  --audio-driver Dummy -- --spectator
kill %1
```

- `gl_compatibility` + `opengl3` is required: the project's `mobile` renderer wants Vulkan, and there is no Vulkan here. llvmpipe (Mesa) gives OpenGL 4.5 — enough for everything below.
- Portrait is the project default (720×1280). For landscape add `--resolution 1280x720` and match the Xvfb screen size.
- Outputs go to `$SPIKE_OUT` (default `/tmp/spikes`).

## spectator — play the day, watch the camera

`res://spikes/spectator.tscn -- --spectator`

Plays the full day with real input. Saves 22 evidence frames per pass, times 13 nav legs, raycasts camera→player at every beat, probes the postcard rig swing while it plays. Run it portrait AND landscape (two passes, two log files).

Results: [Doc 20](../docs/20-day1-greybox-render-notes.md).

## spectator_d2 — play Day 2, watch it finally be seen

`res://spikes/spectator_d2.tscn -- --spectator2`

Subclasses the spectator. Plays Day 1's end into Day 2 with real input: title card, morning, Idris's walk back, Rosa sweeping, the cup, the teal door, the kid at the glass, the awning before/after, lunch, the dusk climb, the second window — then composes the Day 2 postcard with the TS-01 pipeline (re-aimed at both windows). Logs a street census at morning. **Wipe `user://save.json` first** — a kept-Day-2 save boots a replay, which is correct behavior for the game and wrong input for this rig.

Results: [Doc 24](../docs/25-day2-render-notes.md). Artifact: `../assets/greybox-day2/postcard_day2.png`.

## ts01_postcard — the capture pipeline

`res://spikes/ts01_postcard.tscn -- --ts01`

Plays the real day to the gold window, then: glide → 768×1160 offscreen render (own camera, born inside the SubViewport) → pixel-variance blank check → paper frame + caption composite → 768×1344 PNG. Prints per-stage ms.

Three lessons baked in: never reparent a live camera into a viewport (errors + gray frames); `is_empty()` passes gray frames (count pixel range on a grid); capture after the 6 s dusk tween or the sky smears.

Results: [Doc 15](../docs/15-tech-spikes.md). Artifact: `../assets/greybox-day1/postcard_day1.png`.

## ts02_vertical_camera — one camera, three poses

`res://spikes/ts02_vertical_camera.tscn -- --ts02`

Standalone pocket street. FOLLOW / LOOK / POSTCARD poses, 2 s sine blends, orbit ±1.4 rad, dolly sweep. Measures the player's worst screen-edge margin, the max per-frame camera jump per blend vs the hard cut it replaces, and whether the player stays out of the postcard frame.

Results: [Doc 15](../docs/15-tech-spikes.md).

## playtest — five scripted walkers

```bash
for P in sprinter hesitant corner_cutter wanderer gold_gazer; do
  PERSONA=$P godot --headless --path . res://spikes/playtest.tscn -- --playtest
done
```

Headless (no Xvfb needed). Each persona writes `<persona>.jsonl`. Budget 120 s sim each; a run ends in `completed_day`, `stuck`, or `incomplete` with a reason.

Harness honesty: waypoint walkers, no pathfinding. "Lost" models a player with no guidance — deliberately.

Results: [Doc 21](../docs/21-synthetic-playtest-01.md).

## autotest (the game's own check)

```bash
godot --headless --path . -- --autotest
```

Re-run after any spike session. Spikes subclass the game; the autotest proves the game itself never moved.

---

*Logs live in `logs/` and are committed as-is. Numbers in the docs come from these files, not from memory.*
