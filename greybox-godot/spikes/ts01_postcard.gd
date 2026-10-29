extends "res://scripts/main.gd"
## SPIKE: TS-01 — Postcard capture pipeline (Doc 15).
## Plays the real day to the gold-window moment, then: glide -> offscreen
## 768x1160 render (HUD-free) -> paper frame + caption composite -> 768x1344 PNG.
## Lessons from the first honest failure are baked in:
##   * the capture camera is BORN inside the SubViewport (never reparented —
##     reparenting a live Camera3D into a viewport errored and grayed the frame)
##   * the blank check is pixel VARIANCE, not is_empty() — a uniform gray
##     frame once passed the naive check
##   * capture happens after the 6 s dusk tween so the sky is done moving
## Run: Xvfb :99 -screen 0 720x1280x24 &  then
##   DISPLAY=:99 godot --path greybox-godot res://spikes/ts01_postcard.tscn \
##     --rendering-method gl_compatibility --rendering-driver opengl3 --audio-driver Dummy \
##     -- --ts01   (env SPIKE_OUT=/abs/dir for output, default /tmp/spikes)

var sp_out := "/tmp/spikes"
var sp_log: FileAccess

func _ready() -> void:
        super._ready()
        if "--ts01" in OS.get_cmdline_user_args():
                _run_ts01.call_deferred()

func _run_ts01() -> void:
        var env := OS.get_environment("SPIKE_OUT")
        if env != "":
                sp_out = env
        DirAccess.make_dir_recursive_absolute(sp_out)
        sp_log = FileAccess.open(sp_out + "/ts01_log.jsonl", FileAccess.WRITE)
        await _frames(30)

        # --- 1. Play the real day, honest feet, to the fire-escape top.
        await _walk_to(Vector3(-27.8, 0, 6.6)); _try_interact()
        await _walk_to(Vector3(-16, 0, 7.0))
        await _walk_to(Vector3(-16, 0, 12.0))
        for x in [-18.0, -16.0, -14.0]:
                await _walk_to(Vector3(x, 0, 18.3)); _try_interact()
        await _walk_to(Vector3(-18.0, 0, 13.0))
        for i in 5:
                _try_interact(); await _frames(2)
        await _walk_to(Vector3(-16, 0, 6.0))
        await _walk_to(Vector3(-5, 0, 5.0))
        await _walk_to(Vector3(-5, 0, -5.0))
        await _walk_to(Vector3(4, 0, -5.2)); _try_interact()
        for ch in "Wade's Spot":
                var ev := InputEventKey.new()
                ev.pressed = true
                ev.unicode = ch.unicode_at(0)
                var up := ch.to_upper()
                ev.keycode = KEY_SPACE if ch == " " else (OS.find_keycode_from_string(up) if up != "'" else KEY_APOSTROPHE)
                ev.physical_keycode = ev.keycode
                Input.parse_input_event(ev)
                await _frames(2)
                var rel := ev.duplicate()
                rel.pressed = false
                Input.parse_input_event(rel)
                await _frames(2)
        _confirm_name(name_edit.text)
        for i in 3:
                _try_interact(); await _frames(2)
        await _walk_to(Vector3(9.4, 0, -7.2))
        await _hold("move_fwd", 2.2); await _hold("move_right", 0.6)
        await _walk_to(Vector3(15.8, player.global_position.y, -7.2))
        await _hold("move_fwd", 2.2); await _hold("move_left", 0.9)
        await _frames(20)
        _log({"ev": "at_rig", "step": Step.keys()[step]})

        # --- 2. Let the authored moment land: rig swing, flicker, dusk (6 s tween).
        await get_tree().create_timer(6.5).timeout
        var t_trigger := Time.get_ticks_msec()
        _log({"ev": "trigger", "step": Step.keys()[step],
                "gold": snappedf(gold_mat.emission_energy_multiplier, 1)})

        # --- 3. Offscreen render: own camera born inside the viewport.
        var sv := SubViewport.new()
        sv.size = Vector2i(768, 1160)
        sv.render_target_update_mode = SubViewport.UPDATE_ALWAYS
        add_child(sv)
        var pc := Camera3D.new()   # born inside — never moved in from another viewport
        sv.add_child(pc)
        pc.current = true
        pc.fov = 55.0
        # Glide: from mid-street up and back to the south sidewalk, window to sky.
        var p0 := Vector3(13.5, 5.5, -1.0)
        var p1 := Vector3(13.5, 9.5, -5.5)
        var w := gold_window.global_position
        var t0 := w                       # look at the window...
        var t1 := w + Vector3(0, 3.0, 0)  # ...then breathe up to take the skyline in
        var glide_ms := Time.get_ticks_msec() - t_trigger
        for i in 61:
                var k := float(i) / 60.0
                var e := 0.5 - 0.5 * cos(k * PI)   # sine ease
                pc.global_position = p0.lerp(p1, e)
                pc.look_at(t0.lerp(t1, e), Vector3.UP)
                if i % 10 == 0:
                        await get_tree().process_frame
        glide_ms = Time.get_ticks_msec() - t_trigger - glide_ms
        await RenderingServer.frame_post_draw
        var img := sv.get_texture().get_image()
        var render_ms := Time.get_ticks_msec() - t_trigger - glide_ms
        _log({"ev": "render", "size": [img.get_width(), img.get_height()], "ms": render_ms})

        # --- 4. Honest blank check: deterministic grid, count the range.
        # (A random-sample check once argued with the file it had just written;
        # a grid plus format stats doesn't leave room for that.)
        var lo := 1.0
        var hi := 0.0
        for y in range(0, img.get_height(), 24):
                for x in range(0, img.get_width(), 24):
                        var lum := img.get_pixel(x, y).get_luminance()
                        lo = minf(lo, lum)
                        hi = maxf(hi, lum)
        var variance_ok := (hi - lo) > 0.1 and not img.is_empty()
        _log({"ev": "blank_check", "format": img.get_format(), "empty": img.is_empty(),
                "lum_lo": snappedf(lo, 0.001), "lum_hi": snappedf(hi, 0.001), "ok": variance_ok})
        img.save_png(sp_out + "/ts01_raw_render.png")

        # --- 5. Paper frame + caption, composited in a second offscreen pass.
        var paper := SubViewport.new()
        paper.size = Vector2i(768, 1344)
        paper.render_target_update_mode = SubViewport.UPDATE_ALWAYS
        add_child(paper)
        var root := Control.new()
        root.set_anchors_preset(Control.PRESET_FULL_RECT)
        paper.add_child(root)
        var bg := ColorRect.new()
        bg.color = Color("FFF8F0")
        bg.set_anchors_preset(Control.PRESET_FULL_RECT)
        root.add_child(bg)
        # Resize BEFORE the texture so the paper frame can't be argued with.
        var framed := img.duplicate()
        framed.resize(688, 1040, Image.INTERPOLATE_LANCZOS)
        var tex := ImageTexture.create_from_image(framed)
        var tr := TextureRect.new()
        tr.texture = tex
        tr.position = Vector2(40, 40)
        root.add_child(tr)
        var cap := Label.new()
        cap.text = "Met: Rosa. Idris. Learned: the usual is a tiny love letter.\nThe regulars are waiting.\n\n— %s, Day 1" % cart_name
        cap.position = Vector2(48, 1104)
        cap.size = Vector2(672, 220)
        cap.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
        cap.add_theme_font_size_override("font_size", 24)
        cap.add_theme_color_override("font_color", Color("3B3346"))
        root.add_child(cap)
        var stamp := Label.new()
        stamp.text = "FIRST SLICE · DAY 1"
        stamp.position = Vector2(48, 44)
        stamp.add_theme_font_size_override("font_size", 20)
        stamp.add_theme_color_override("font_color", Color("B23A48"))
        root.add_child(stamp)
        await RenderingServer.frame_post_draw
        var out := paper.get_texture().get_image()
        var compose_ms := Time.get_ticks_msec() - t_trigger - glide_ms - render_ms
        out.save_png(sp_out + "/postcard_day1.png")
        var total_ms := Time.get_ticks_msec() - t_trigger
        _log({"ev": "composite", "ms": compose_ms, "out": [out.get_width(), out.get_height()]})
        _log({"ev": "done", "trigger_to_png_ms": total_ms, "glide_ms": glide_ms,
                "target_ms": 1500, "target_note": "device target; llvmpipe is not a device [TBD: owner spiking, date open]"})
        sp_log.close()
        print("TS01 %s — postcard at %s (trigger->png %d ms)" % ["OK" if variance_ok else "SUSPECT", sp_out, total_ms])
        get_tree().quit(0 if variance_ok else 1)

func _log(d: Dictionary) -> void:
        d["t"] = snappedf(elapsed, 0.01)
        d["step"] = Step.keys()[step]
        print(JSON.stringify(d))
        if sp_log != null:
                sp_log.store_line(JSON.stringify(d))
                sp_log.flush()
