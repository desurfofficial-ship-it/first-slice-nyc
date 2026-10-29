# Day 2 Render Notes — the day, finally seen

**What this is:** Doc 22 §4 said it plainly: *"No display server is available, so nothing here was **seen**."* This pass closes that. `spikes/spectator_d2.gd` (subclass of the Doc 20 spectator, zero edits to the game) plays Day 1's end into Day 2 with real input under Xvfb + llvmpipe, captures 18 frames at the Day 2 beats, and composes the Day 2 postcard with the TS-01 pipeline. Portrait 720×1280, one pass, log committed at `greybox-godot/spikes/logs/spectator_d2_portrait.jsonl`.

**Run:** `SPIKE_OUT=… Xvfb :99 -screen 0 720x1280x24 & sleep 2; DISPLAY=:99 godot --path greybox-godot res://spikes/spectator_d2.tscn --rendering-method gl_compatibility --rendering-driver opengl3 --audio-driver Dummy --resolution 720x1280 -- --spectator2` — wall 103.8 s, `d2_render ok:true` (luminance 0.017–0.99).

**A method note before the findings.** The first pass of this spike ran on a contaminated boot: the autotest had left a kept-Day-2 save, so the game correctly booted a **replay** (money frozen at $111, "Day 2, again" postcard). That was the save system working as designed — on the wrong input. The spike now assumes a clean `user://save.json`; the save was wiped and the pass re-run. Lesson recorded: a verification rig must control its own boot state.

---

## 1. What the frames confirm (the ledger was true)

| Beat | Frame | Verdict |
|---|---|---|
| Morning corner: named cart, warm light, HUD $112 | `d2_04_morning_corner` | reads exactly as Doc 22 §2.1 describes |
| Idris walks back for the usual | `d2_05_idris_walking` | visible approach, plum against the wall |
| Rosa out front, sweeping | `d2_07_rosa_sweeping` | her teal awning + lit window behind; Idris visible walking home west (continuity, free of charge) |
| The favor: cup in hand | `d2_08_cup_in_hand` | the cup rides at the player's hand; objective re-points to the teal door |
| The teal door and stoop | `d2_09_teal_door_stoop` | door sits directly under the kid's lit window — deliver and be seen |
| The kid at the glass | `d2_10_kid_at_glass` | small dark shape inside the lit window, $117, works |
| The awning, before/after | `d2_12_awning_up` | teal canopy + scallop edge, clearly the same cart upgraded |
| Lunch rush | `d2_13_lunch_rush` | customer at the cart, $3 a serve |
| Dusk: two windows | `d2_15_second_window` | both windows lit, kid silhouette in his, purple sky, skyline behind |
| Day 2 postcard panel | `d2_16_day2_postcard` | text exactly Doc 22's arc (after the §2 fix below) |
| TS-01 composite, Day 2 | `postcard_day2.png` | two windows, kid, skyline, paper frame, stamp. **Passes the fridge test.** |

Money math seen live: $112 → $114 (Idris) → $117 (kid) → $102 (awning) → $111 (lunch 3 × $3). The state assertions were true; now they have faces.

---

## 2. What the frames caught (five findings — four fixed, one identified, one deferred by design)

**RN-1 · P2 — the title card was broken, and only a frame could say so.** `d2_03_title_card` shows "DAY 2" rendered as one stacked letter per line at the left screen edge, mostly cut off. Root cause: `title_lbl.set_anchors_preset(Control.PRESET_FULL_RECT)` sets anchors but not offsets, so the label's rect stayed at its minimum width — autowrap then stacked the word vertically. The autotest asserts `title_lbl.visible`, never its geometry; headless could never see it. **Fixed:** `set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)`. Re-shot clean: `d2_03_title_card` (second pass).

**RN-2 · P2 — at the wonder beat, the player's own capsule blocks the view.** The authored postcard rig tweens the camera to (15.0, 10.0, −9.2) — inside the south building (Doc 20 finding 1, never applied to the game) — and its swing passes 2.26 u from the player's chest (probe, `d2_15_second_window`): the capsule fills the bottom half of the frame at the exact moment the second window flickers. The composed panel and the TS-01 capture are clean; the *live* moment is not. This is Doc 20 finding 2 recurring on Day 2 through the shared rig. **Fixed:** rig end moved to (11.5, 10.0, −5.2) — over the south sidewalk's air, outside every AABB, ≥4.5 u from the player, window still dead-center. Improves Day 1's beat too. Re-shot: `d2_15_second_window` (second pass).

**RN-3 · P2 — the Day 2 postcard told the wrong money arc.** First pass: the panel read *"Day 2. $87 → $111."* Doc 22 says **$112 → $111**. Root cause: `day_start_money` was set once (Day 1 boot = $87) and never advanced — a mid-day resume would mislabel the arc the same way. **Fixed:** the day-start money now rides in the save (`save.gd` field `day_start_money`, restored on boot, written with the day-start snapshot), `_begin_day` sets it from the save or from the day's opening wallet. Autotest grew three checks (postcard arc text, save-file field, restore-on-load). Verified: panel now reads *"Day 2. $112 → $111."* — `d2_16_day2_postcard`.

**RN-4 · P3 — the objective points away from the awning.** After the delivery, the objective jumps straight to "Fire escape at dusk" while the awning + lunch rush sit unpointed at the cart. The prompt is honest ("[Space] Awning — $15" from the morning — the kit leans there all day, which is RN-5's design question), but an objective-follower will miss the purchase and the lunch crowd entirely. No soft-lock — the dusk proceeds either way. Decision: address with the Day 3 objective pass (same table), not a hurried patch.

**RN-5 · P3 — the player spawns hidden behind their own cart.** Day 2 spawn (3, 0.05, −5.4) sits directly behind the cart (4, −5.2) from the camera's south-facing angle; the morning frame shows the cart wearing the player. **Fixed:** spawn moved to (2.4, 0.05, −5.4), a step west of the cart's edge.

**RN-6 · P3 — the "unidentified small red pedestrian" was a fire hydrant all along.** The morning frames show a small coral shape near Idris's walk that the code's four NPCs (Rosa coral, Idris plum, the kid, teal customers) couldn't explain. A census probe (all visible meshes in the street box) plus a 4× pixel zoom settled it: it is the **C_CORAL fire hydrant** at (−0.6, 0.45, −4.6) — legitimate street furniture that never moved; the "drift" was camera parallax. The only real wart: the hydrant sits exactly on Idris's walking line (same z), so he clips through it on his way in. **Fixed:** hydrant nudged to (−0.6, 0.45, −5.6) — still on the curb, off the walk line. Harness footnote: the census's "has mesh children" filter skipped leaf meshes; the hydrant is a leaf `_cyl` — the zoom is what actually closed this.

---

## 3. Verdict

Day 2 was true headless and is true rendered. The three P2s the frames caught (title card, rig close-pass, money arc) are fixed with re-shot evidence; the P3s are written down where the next build will trip over them on purpose. The Day 2 postcard passes the fridge test.

*Provenance: spectator_d2.gd subclasses the Doc 20 spectator and TS-01 pipeline; run under Xvfb + llvmpipe per greybox-godot/spikes/README.md; log committed as-is.*
