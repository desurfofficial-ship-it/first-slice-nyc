# Day 1 Greybox — Render Notes (first played pass)

**What this is:** the greybox was actually played, on a real framebuffer, start to finish. These are the notes from watching it. Not theory. Every claim below has a frame or a log line behind it.

**How it was played:** the spectator spike (`greybox-godot/spikes/spectator.gd`) drives the real game with real input — walk, interact, type, climb — under Xvfb with Mesa llvmpipe (OpenGL compatibility). Two passes: 720×1280 portrait and 1280×720 landscape. 22 evidence frames per pass, 13 timed nav legs, camera probes at every beat. Raw telemetry: `greybox-godot/spikes/logs/spectator_portrait.jsonl` and `spectator_landscape.jsonl`. Selected frames: `assets/greybox-day1/frames/`.

**Score:** 13/13 nav legs arrived, both orientations, zero hard cases. The level holds together. The problems are all in how the camera tells the story.

---

## Finding 1 — The authored postcard rig ends inside a building

The rig's final position in `_reach_top()` is `Vector3(15, 10, -9.2)`. The south fire-escape building (`Bldg_S_FireEscape`) spans x [0, 26], y [0, 14], z [-20, -8]. That point is inside all three ranges. The camera parks inside solid geometry and looks north.

It still works, by luck: with default backface culling, a camera inside a box sees through the wall it faces away from. The shot renders. But nothing guards it. Change the cull mode, add a south window, thicken a wall — and the signature shot clips or blacks out.

**Do:** park the rig outside the wall face (z > -8) and frame the window from the street side. TS-02 tested exactly this; see Doc 15.

## Finding 2 — Your own head is the foreground of the wonder beat

During the authored 2-second swing, the camera passes within **2.0 u of the player capsule** (measured in both orientations; the follow camera starts ~9 u away, swings past you, ends hovering over your shoulder). In the final frame (`portrait_21_gold_window_lit.png`) the lit gold window is there, the dusk is there, the skyline is there — and the biggest object in the middle of it is your own capsule.

The moment is supposed to be about the window. Right now it is partly about the back of your head.

**Do:** the postcard frame should leave the player out of it on purpose. The street, the window, the sky. You are behind the camera for once.

## Finding 3 — The hidden roof still collides

Step inside the bodega and the roof mesh hides so the camera can see you. Its collider does not hide. A probe ray straight up from the player hits `"Roof"` while `roof_visible = false` (both passes). During the rush, the camera→player ray also snags the invisible roof at ~4 u out.

Nothing visual breaks today — hidden means not drawn. But any raycast that means "can I see / can I touch" now lies. Interaction prompts, future NPCs, photo logic: all would read a ceiling that isn't there.

**Do:** hide the collider with the mesh (set the CollisionShape disabled, or toggle a physics layer).

## Finding 4 — The crosswalk camera does a 180 mid-street

The cozy camera flips its target yaw (0 ↔ π) when the player crosses z = -2.5. Cross the street and you cross that line mid-crossing. Measured: yaw swings **166°** while lerp catches up, and the worst single-frame camera jump in the whole day is **7.89 u/frame portrait, 9.11 u/frame landscape** — against a normal-day range of 0.54–0.75. That is a hard snap smuggled into a smooth system, and it happens at the exact moment the player is doing the level's one brave thing.

**Do:** move the yaw flip off the street centerline (flip at the curbs), or blend yaw over the crossing, or pick a crossing-aligned camera for those few meters.

## Finding 5 — The bodega interior fights the camera, worst in landscape

The camera stays outside and looks in over the front wall. In portrait this is fine: interior fills the top ~60%, the front wall and awning hold the bottom band. In landscape the proportions collapse — roughly the lower **60% of the frame is the bodega's own front wall and awning** (`landscape_05_bodega_inside.png`). The interior becomes a letterbox at the top.

This is the strongest argument yet for the portrait-first decision. The cozy 3/4 view and this building were shaped for a tall frame.

**Do:** keep landscape unofficially playable at best; or when the roof hides, hide the front wall top half with it.

## Finding 6 — Two blank faces carry the big beats

The money shots lean on two building faces that are, today, plain colored boxes: the north block behind the gold window, and the west mass flanking the skyline card. In `portrait_21` the dusk, the glow, and the skyline carry it anyway — the greybox earns the moment. But the frame has visible room for signage, fire escapes, water tanks, anything with a silhouette.

**Do (later, not greybox):** the art pass already knows. Noting it here because the frames prove where the eye lands.

---

## What did not break

- All 13 legs walkable with plain input; no stuck spots for a cooperative walker.
- Physics steady at 60 Hz through every beat; no tunneling on ladders or the crosswalk.
- Name box eats its keys (WASD/Space leak check passed, drift 0.00 u while typing).
- Dusk tween and gold window flicker read clearly in both orientations; glow blooms without banding on llvmpipe, so the style survives a weak renderer.

## Next moves

1. TS-02 result feeds the camera fix list above (single camera, parked rig, 2 s sine blends — Doc 15).
2. TS-01 proves the capture pipeline that Finding 2's fixed framing will feed.
3. Re-run the spectator after camera changes; this document's numbers are the before.

---

*Provenance: played pass by the spectator spike, Godot 4.7.2-stable, Mesa llvmpipe under Xvfb, 2025 session. Frames and JSONL committed alongside. Numbers are from the runs logged in `greybox-godot/spikes/logs/`.*
