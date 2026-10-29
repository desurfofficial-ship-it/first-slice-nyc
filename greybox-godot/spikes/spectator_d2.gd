extends "res://spikes/spectator.gd"
## SPIKE: spectator_d2 — the Day 2 pass. Day 1 was SEEN in Doc 20; Day 2 (Doc 22)
## was only ever asserted. This plays through Day 1's end into Day 2 with real
## input on a real framebuffer and captures the beats the ledger couldn't show:
## the title card, the morning light, Idris's walk back, Rosa sweeping, the cup
## in hand, the teal door, the kid at the glass, the awning before/after, the
## lunch rush, the dusk climb, the second window — and then it composes the
## Day 2 postcard for real, with the TS-01 pipeline (own camera born inside the
## SubViewport, pixel-variance blank check, paper frame + caption).
## Run: spikes/README.md recipe, flag is --spectator2. Output: $SPIKE_OUT.

func _ready() -> void:
	super._ready()
	if "--spectator2" in OS.get_cmdline_user_args():
		_run_spectator2.call_deferred()

func _run_spectator2() -> void:
	var env := OS.get_environment("SPIKE_OUT")
	if env != "":
		sp_out = env
	DirAccess.make_dir_recursive_absolute(sp_out)
	sp_log = FileAccess.open(sp_out + "/spectator_d2_log.jsonl", FileAccess.WRITE)
	var t0 := Time.get_ticks_msec()
	await _frames(30)

	# --- Day 1, honest feet, frames not kept (Doc 20 already saw this day) ---
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
	await get_tree().create_timer(6.5).timeout
	_log({"ev": "day1_end", "postcard": postcard_panel.visible})
	_shot("d2_00_day1_postcard")

	# --- the end breathes: dismiss, linger at the rail, Rosa's goodnight ---
	_try_interact()
	await _frames(10)
	_log({"ev": "dismissed", "frozen": player.frozen})
	await _walk_to(Vector3(12.5, 8.0, -6.8))
	_shot("d2_01_linger_rail")
	_try_interact()
	await get_tree().create_timer(1.4).timeout
	_shot("d2_02_rosa_window_warm")
	_log({"ev": "goodnight", "rosa_energy": snappedf(rosa_window_mat.emission_energy_multiplier, 1)})
	sp_max_cam_jump = 0.0
	_try_interact()
	await get_tree().create_timer(0.8).timeout
	_shot("d2_03_title_card")
	await get_tree().create_timer(0.8).timeout
	_shot("d2_03b_title_card")
	await _fade_settled()
	_log({"ev": "day_transition", "max_cam_jump": snappedf(sp_max_cam_jump, 0.01), "day": day})
	await _frames(30)
	_shot("d2_04_morning_corner")
	_probe("d2_04_morning_corner")
	# RN-6 census: who exactly is on the street at morning? (Doc 23)
	var census := []
	for n in get_tree().current_scene.find_children("*", "Node3D", true, false):
		var n3 := n as Node3D
		if n3 == null or not n3.is_visible_in_tree():
			continue
		var p := n3.global_position
		if p.x > -14 and p.x < 6 and p.z > -8 and p.z < 8 and p.y < 3:
			if n3.find_children("*", "MeshInstance3D", true, false).size() > 0:
				census.append("%s@(%.1f,%.1f,%.1f)" % [n.name, p.x, p.y, p.z])
	_log({"ev": "census", "street": census})

	# --- Idris: on his way, then the usual ---
	var tw0 := Time.get_ticks_msec()
	while not idris_walk_started and Time.get_ticks_msec() - tw0 < 9000:
		await get_tree().process_frame
	await get_tree().create_timer(2.4).timeout
	_shot("d2_05_idris_walking")
	var ta0 := Time.get_ticks_msec()
	while not idris_arrived and Time.get_ticks_msec() - ta0 < 9000:
		await get_tree().process_frame
	await _walk_to(Vector3(4.4, 0, -4.6))
	_try_interact()
	await _frames(10)
	_shot("d2_06_idris_served")
	_probe("d2_06_idris_served")
	_log({"ev": "idris", "served": idris_served, "money": money})

	# --- Rosa out front, sweeping; the favor; the cup rides along ---
	await _walk_to(Vector3(-16, 0, 6.6))
	await _frames(12)
	_shot("d2_07_rosa_sweeping")
	_try_interact()
	await _frames(10)
	_shot("d2_08_cup_in_hand")
	_log({"ev": "favor", "cup": cup_prop.visible, "step": Step.keys()[step]})

	# --- the teal door and the stoop; the kid kept ---
	await _walk_to(Vector3(15, 0, 6.9))
	await _frames(12)
	_shot("d2_09_teal_door_stoop")
	_try_interact()
	await _frames(14)
	_shot("d2_10_kid_at_glass")
	_probe("d2_10_kid_at_glass")
	_log({"ev": "delivered", "kid": kid_sil.visible, "money": money})

	# --- the awning: before/after from the same spot ---
	await _walk_to(Vector3(4, 0, -5.2))
	_try_interact()
	await _frames(10)
	_shot("d2_11_awning_offer")
	_try_interact()
	await _frames(10)
	_shot("d2_12_awning_up")
	_log({"ev": "awning", "up": awning_mesh.visible, "money": money})

	# --- lunch: three who came for the shade ---
	for i in 3:
		await _walk_to(Vector3(4, 0, -5.2))
		_try_interact()
		await _frames(6)
		if i == 0:
			_shot("d2_13_lunch_rush")
	_log({"ev": "lunch", "served": lunch_served, "money": money})

	# --- dusk, same seat; the kid waves; the lamp next door thinks about it ---
	await _walk_to(Vector3(9.4, 0, -7.2))
	await _hold("move_fwd", 2.2)
	_shot("d2_14_dusk_climb")
	await _hold("move_right", 0.6)
	await _frames(20)
	await _walk_to(Vector3(15.8, player.global_position.y, -7.2))
	await _hold("move_fwd", 2.2)
	await _hold("move_left", 0.9)
	await get_tree().create_timer(4.5).timeout
	_shot("d2_15_second_window")
	_probe("d2_15_second_window")
	_log({"ev": "second_window", "energy": snappedf(second_mat.emission_energy_multiplier, 1), "kid": kid_sil.visible})
	await get_tree().create_timer(2.5).timeout
	_shot("d2_16_day2_postcard")
	_log({"ev": "postcard_text", "text": postcard_lbl.text})

	# --- the Day 2 postcard, composed for real (TS-01 pipeline) ---
	await _compose_day2_postcard()
	_log({"ev": "done", "wall_total_s": snappedf((Time.get_ticks_msec() - t0) / 1000.0, 0.1)})
	sp_log.close()
	print("SPECTATOR D2 DONE — frames in ", sp_out)
	get_tree().quit(0)

## TS-01 pipeline, re-aimed: the Day 2 wonder beat is TWO windows, so the glide
## frames the gold window and the SecondWindow together. Same lessons baked in:
## the capture camera is born inside the viewport, the blank check is variance.
func _compose_day2_postcard() -> void:
	var sv := SubViewport.new()
	sv.size = Vector2i(768, 1160)
	sv.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(sv)
	var pc := Camera3D.new()
	sv.add_child(pc)
	pc.current = true
	pc.fov = 55.0
	var gw: Vector3 = gold_window.global_position
	var w2n := get_tree().current_scene.find_child("SecondWindow", true, false)
	var mid := gw
	if w2n != null:
		mid = (gw + (w2n as Node3D).global_position) / 2.0
	_log({"ev": "aim", "gold": [snappedf(gw.x, 1), snappedf(gw.y, 1), snappedf(gw.z, 1)],
		"second_found": w2n != null, "mid": [snappedf(mid.x, 1), snappedf(mid.y, 1), snappedf(mid.z, 1)]})
	var p0 := Vector3(mid.x - 1.0, mid.y - 3.5, mid.z - 7.0)
	var p1 := Vector3(mid.x - 1.0, mid.y + 1.5, mid.z - 11.0)
	var tc := Time.get_ticks_msec()
	for i in 61:
		var k := float(i) / 60.0
		var e := 0.5 - 0.5 * cos(k * PI)
		pc.global_position = p0.lerp(p1, e)
		pc.look_at(mid.lerp(mid + Vector3(0, 3.0, 0), e), Vector3.UP)
		if i % 10 == 0:
			await get_tree().process_frame
	var glide_ms := Time.get_ticks_msec() - tc
	await RenderingServer.frame_post_draw
	var img := sv.get_texture().get_image()
	var lo := 1.0
	var hi := 0.0
	for y in range(0, img.get_height(), 24):
		for x in range(0, img.get_width(), 24):
			var lum := img.get_pixel(x, y).get_luminance()
			lo = minf(lo, lum)
			hi = maxf(hi, lum)
	var variance_ok := (hi - lo) > 0.1 and not img.is_empty()
	img.save_png(sp_out + "/d2_raw_render.png")
	_log({"ev": "d2_render", "ok": variance_ok, "lum_lo": snappedf(lo, 0.001),
		"lum_hi": snappedf(hi, 0.001), "glide_ms": glide_ms})
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
	var framed := img.duplicate()
	framed.resize(688, 1040, Image.INTERPOLATE_LANCZOS)
	var tex := ImageTexture.create_from_image(framed)
	var tr := TextureRect.new()
	tr.texture = tex
	tr.position = Vector2(40, 40)
	root.add_child(tr)
	var cap := Label.new()
	cap.text = postcard_lbl.text
	cap.position = Vector2(48, 1104)
	cap.size = Vector2(672, 220)
	cap.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	cap.add_theme_font_size_override("font_size", 24)
	cap.add_theme_color_override("font_color", Color("3B3346"))
	root.add_child(cap)
	var stamp := Label.new()
	stamp.text = "FIRST SLICE · DAY 2"
	stamp.position = Vector2(48, 44)
	stamp.add_theme_font_size_override("font_size", 20)
	stamp.add_theme_color_override("font_color", Color("B23A48"))
	root.add_child(stamp)
	await RenderingServer.frame_post_draw
	var out := paper.get_texture().get_image()
	out.save_png(sp_out + "/postcard_day2.png")
	_log({"ev": "d2_composite", "out": [out.get_width(), out.get_height()]})
