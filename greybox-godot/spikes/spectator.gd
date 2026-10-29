extends "res://scripts/main.gd"
## SPIKE: spectator — plays the whole Day 1 greybox with real input on a real
## framebuffer, saving evidence frames, timing nav legs, and probing the camera
## while it works. Zero edits to the game; this script only watches.
## Run (displayed):  Xvfb :99 -screen 0 720x1280x24 &  then
##   DISPLAY=:99 godot --path greybox-godot res://spikes/spectator.tscn \
##     --rendering-method gl_compatibility --rendering-driver opengl3 -- --spectator
## Landscape pass: add --resolution 1280x720 (and match the Xvfb screen).
## Output: SPIKE_OUT env dir (default /tmp/spikes) — NN_beat.png frames +
## spectator_log.jsonl telemetry.

var sp_out := "/tmp/spikes"
var sp_log: FileAccess
var sp_prev_cam := Vector3.ZERO
var sp_max_cam_jump := 0.0

func _ready() -> void:
	super._ready()
	if "--spectator" in OS.get_cmdline_user_args():
		_run_spectator.call_deferred()

func _physics_process(_d: float) -> void:
	# Continuous camera-motion probe; reset per leg via _leg().
	if cam != null and sp_prev_cam != Vector3.ZERO:
		sp_max_cam_jump = maxf(sp_max_cam_jump, cam.global_position.distance_to(sp_prev_cam))
	if cam != null:
		sp_prev_cam = cam.global_position

func _run_spectator() -> void:
	var env := OS.get_environment("SPIKE_OUT")
	if env != "":
		sp_out = env
	DirAccess.make_dir_recursive_absolute(sp_out)
	sp_log = FileAccess.open(sp_out + "/spectator_log.jsonl", FileAccess.WRITE)
	var t0 := Time.get_ticks_msec()
	await _frames(30)

	_shot("01_spawn")
	_probe("01_spawn")
	await _leg("spawn_to_rosa", Vector3(-27.8, 0, 6.6))
	_shot("02_rosa_waving")
	_try_interact()
	await _frames(10)
	_shot("03_rosa_greeted")
	_probe("03_rosa_greeted")

	await _leg("rosa_to_bodega_door", Vector3(-16, 0, 7.0))
	_shot("04_bodega_front")
	await _leg("door_to_inside", Vector3(-16, 0, 12.0))
	_shot("05_bodega_inside")
	_probe("05_bodega_inside")
	_probe_roof_up()  # does the hidden roof still collide?

	await _leg("shelf_mango", Vector3(-18, 0, 18.3)); _try_interact(); _shot("06_shelf_mango")
	await _leg("shelf_coffee", Vector3(-16, 0, 18.3)); _try_interact()
	await _leg("shelf_bread", Vector3(-14, 0, 18.3)); _try_interact()
	_shot("07_shelf_all")
	await _leg("back_to_counter", Vector3(-18, 0, 13.0))
	_shot("08_rush_counter")
	_probe("08_rush_counter")
	for i in 5:
		_try_interact()
		await _frames(4)
	_shot("09_rush_served")

	await _leg("exit_bodega", Vector3(-16, 0, 6.0))
	_shot("10_exit_bodega")
	var yaw_before := cam_yaw
	sp_max_cam_jump = 0.0
	await _leg("crosswalk_north", Vector3(-5, 0, 5.0))
	_shot("11_crosswalk_n")
	_shot("12_crosswalk_mid")
	await _leg("cross_street", Vector3(-5, 0, -5.0))
	_shot("13_crossed_south")
	_probe("13_crossed_south")
	_log({"ev": "crosswalk_flip", "yaw_before": yaw_before, "yaw_after": cam_yaw,
		"deg": snappedf(absf(rad_to_deg(angle_difference(yaw_before, cam_yaw))), 1),
		"max_cam_jump_crossing": snappedf(sp_max_cam_jump, 0.01)})

	await _leg("walk_to_cart", Vector3(4, 0, -5.2))
	_try_interact()
	await _frames(10)
	_shot("14_cart_claim")
	_shot("15_name_box")
	var before := player.global_position
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
	_log({"ev": "cart_named", "name": cart_name, "drift": snappedf(player.global_position.distance_to(before), 0.01)})
	_shot("16_cart_named")

	for i in 3:
		_try_interact()
		await _frames(6)
	_shot("17_solo_serve_%d" % solo_served)
	_probe("17_solo_serve")
	await _leg("to_ladder_1", Vector3(9.4, 0, -7.2))
	_shot("18_ladder1_grab")
	_log({"ev": "dusk_started", "at_step": Step.keys()[step]})
	await _hold("move_fwd", 2.2)
	await _hold("move_right", 0.6)
	await _frames(20)
	_shot("19_landing1_y%s" % snappedf(player.global_position.y, 0.1))
	await _leg("roof_to_ladder_2", Vector3(15.8, player.global_position.y, -7.2))
	await _hold("move_fwd", 2.2)
	await _hold("move_left", 0.9)
	await _frames(20)
	_shot("20_landing2_y%s" % snappedf(player.global_position.y, 0.1))
	_log({"ev": "rig_reached", "step": Step.keys()[step], "player_frozen": player.frozen})

	# Postcard rig probe: sample the authored swing while it plays.
	await _probe_rig_swing()
	await get_tree().create_timer(6.5).timeout
	_shot("21_gold_window_lit")
	_probe("21_gold_window_lit")
	_shot("22_postcard_panel")
	_log({"ev": "done", "step": Step.keys()[step], "gold_energy": snappedf(gold_mat.emission_energy_multiplier, 0.1),
		"wall_total_s": snappedf((Time.get_ticks_msec() - t0) / 1000.0, 0.1)})
	sp_log.close()
	print("SPECTATOR DONE — frames in ", sp_out)
	get_tree().quit(0)

## Walk a leg with the real input driver, time it, log arrival truth.
func _leg(what: String, target: Vector3) -> void:
	var t0 := elapsed
	var d0 := player.global_position.distance_to(target)
	sp_max_cam_jump = 0.0
	await _walk_to(target)
	var arrived := player.global_position.distance_to(target) < 1.2
	_log({"ev": "leg", "what": what, "s": snappedf(elapsed - t0, 0.01), "from_d": snappedf(d0, 0.1),
		"end_d": snappedf(player.global_position.distance_to(target), 0.01), "arrived": arrived,
		"max_cam_jump": snappedf(sp_max_cam_jump, 0.01)})

## Camera→player occlusion probe, straight geometry, every beat.
func _probe(beat: String) -> void:
	var space := get_world_3d().direct_space_state
	var from := cam.global_position
	var to := player.global_position + Vector3(0, 0.9, 0)
	var q := PhysicsRayQueryParameters3D.create(from, to)
	q.exclude = [player.get_rid()]
	var hit := space.intersect_ray(q)
	var d := from.distance_to(to)
	var occl := ""
	var occl_at := -1.0
	if not hit.is_empty():
		occl = String(hit.collider.name)
		occl_at = snappedf(from.distance_to(hit.position), 0.01)
	_log({"ev": "probe", "beat": beat, "cam_to_player": snappedf(d, 0.01),
		"occluder": occl, "occl_at": occl_at})

## The roof hides when you step inside. Does its collider hide too?
func _probe_roof_up() -> void:
	var space := get_world_3d().direct_space_state
	var from := player.global_position + Vector3(0, 1.8, 0)
	var q := PhysicsRayQueryParameters3D.create(from, from + Vector3(0, 10, 0))
	q.exclude = [player.get_rid()]
	var hit := space.intersect_ray(q)
	_log({"ev": "roof_probe", "roof_visible": bodega_roof.visible,
		"up_hit": "" if hit.is_empty() else String(hit.collider.name)})

## While the authored postcard swing plays: how close does the rig pass to the
## player, and does the capsule ever block the shot of the gold window?
func _probe_rig_swing() -> void:
	var min_d := 999.0
	var blocked_at := []
	for i in 40:
		await get_tree().create_timer(0.05).timeout
		var chest := player.global_position + Vector3(0, 1.0, 0)
		min_d = minf(min_d, cam.global_position.distance_to(chest))
		if gold_window != null:
			var space := get_world_3d().direct_space_state
			var q := PhysicsRayQueryParameters3D.create(cam.global_position, gold_window.global_position)
			var hit := space.intersect_ray(q)
			if not hit.is_empty() and hit.collider == player:
				blocked_at.append(snappedf(cam.global_position.distance_to(hit.position), 0.01))
		if postcard_panel.visible:
			break
	_log({"ev": "rig_swing", "min_cam_to_player": snappedf(min_d, 0.01),
		"capsule_blocks_window_at": blocked_at, "blocked": blocked_at.size() > 0})

func _shot(tag: String) -> void:
	var img := get_viewport().get_texture().get_image()
	if img == null or img.is_empty():
		_log({"ev": "shot", "tag": tag, "ok": false, "why": "no framebuffer"})
		return
	img.save_png(sp_out + "/%s.png" % tag)
	_log({"ev": "shot", "tag": tag, "ok": true, "size": [img.get_width(), img.get_height()]})

func _log(d: Dictionary) -> void:
	d["t"] = snappedf(elapsed, 0.01)
	d["step"] = Step.keys()[step]
	print(JSON.stringify(d))
	if sp_log != null:
		sp_log.store_line(JSON.stringify(d))
		sp_log.flush()
