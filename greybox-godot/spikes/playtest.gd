extends "res://scripts/main.gd"
## SPIKE: synthetic playtest harness (Doc 21).
## Plays the real Day 1 greybox as one of five scripted personas, headless,
## logging JSONL telemetry. Zero edits to the game.
##   PERSONA=sprinter|hesitant|corner_cutter|wanderer|gold_gazer  (env)
##   SPIKE_OUT=/abs/dir   -> <dir>/<persona>.jsonl
## Run: godot --headless --path greybox-godot res://spikes/playtest.tscn -- --playtest
## Harness note, kept honest: these are waypoint walkers, not pathfinders.
## "Lost" means the script has no next waypoint — which is exactly what a
## player with no guidance would feel.

const BUDGET := 120.0
const STALL_LIMIT := 20.0

var pt_persona := "sprinter"
var pt_out := "/tmp/spikes"
var pt_log: FileAccess
var pt_last_step := -1
var pt_last_step_t := 0.0
var pt_done := false

func _ready() -> void:
        super._ready()
        if "--playtest" in OS.get_cmdline_user_args():
                _run_playtest.call_deferred()

func _physics_process(_d: float) -> void:
        if pt_log == null:
                return
        if step != pt_last_step:
                _log({"ev": "step_change", "from": Step.keys()[pt_last_step] if pt_last_step >= 0 else "-",
                        "to": Step.keys()[step]})
                pt_last_step = step
                pt_last_step_t = elapsed

func _run_playtest() -> void:
        var p := OS.get_environment("PERSONA")
        pt_persona = p if p != "" else "sprinter"
        var env := OS.get_environment("SPIKE_OUT")
        if env != "":
                pt_out = env
        DirAccess.make_dir_recursive_absolute(pt_out)
        pt_log = FileAccess.open(pt_out + "/%s.jsonl" % pt_persona, FileAccess.WRITE)
        await _frames(30)
        _log({"ev": "start", "persona": pt_persona, "budget_s": BUDGET})
        _log({"ev": "harness_note",
                "note": "scripted waypoint walker, no pathfinding; 'lost' models a player with no guidance"})
        pt_last_step = step
        match pt_persona:
                "sprinter":
                        await _persona_sprinter()
                "hesitant":
                        await _persona_hesitant()
                "corner_cutter":
                        await _persona_cutter()
                "wanderer":
                        await _persona_wanderer()
                "gold_gazer":
                        await _persona_gazer()
        if not pt_done:
                _finish("incomplete", "budget ran out at %s" % Step.keys()[step])

# ---------------------------------------------------------------- personas
## Optimal route, no dwell. The baseline.
func _persona_sprinter() -> void:
        await _route_to_cart()
        if pt_done:
                return
        for i in 3:
                _try_interact()
                await _frames(4)
        await _route_climb()
        if step == Step.DONE:
                _finish("completed_day", "day complete in %.1f s sim" % elapsed)

## Same route, but a person who thinks before moving and checks corners twice.
func _persona_hesitant() -> void:
        var pauses := [1.8, 2.4, 1.5, 2.2, 2.0, 1.6, 2.5, 1.9, 2.3, 1.7, 2.1]
        var pi := 0
        for leg in _route_legs():
                await _pause(pauses[pi % pauses.size()])
                pi += 1
                await _leg(leg)
                if pt_done:
                        return
        for i in 5:
                _try_interact()
                await _frames(4)
        await _type_name("Sunny Side")
        for i in 3:
                _try_interact()
                await _frames(4)
        await _route_climb()
        if step == Step.DONE:
                _finish("completed_day", "day complete in %.1f s sim (thought before every move)" % elapsed)

## Optimal until the street. Then cuts across NOT at the crosswalk — the corner
## is right there. Crosses east of the stripes (x around -1.7..0.3, the
## CrosswalkZone lives at x -6.7..-3.3). Watches whether the game notices.
func _persona_cutter() -> void:
        await _walk_to(Vector3(-27.8, 0, 6.6)); _try_interact()
        await _walk_to(Vector3(-16, 0, 7.0))
        await _walk_to(Vector3(-16, 0, 12.0))
        for x in [-18.0, -16.0, -14.0]:
                await _walk_to(Vector3(x, 0, 18.3)); _try_interact()
        await _walk_to(Vector3(-18.0, 0, 13.0))
        for i in 5:
                _try_interact()
                await _frames(2)
        await _walk_to(Vector3(-16, 0, 6.0))
        _log({"ev": "cut_start", "note": "heading east along the north walk, then straight across to the corner"})
        await _walk_to(Vector3(-2, 0, 5.0))
        await _walk_to(Vector3(2, 0, -5.5))
        var crossed := player.global_position.z < -4.0
        _log({"ev": "cut_done", "on_south_side": crossed, "step": Step.keys()[step],
                "pos": [snappedf(player.global_position.x, 0.1), snappedf(player.global_position.z, 0.1)]})
        if crossed and step == Step.CROSS:
                # Try the cart anyway. See if the game gives you anything.
                await _walk_to(Vector3(4, 0, -5.2))
                _try_interact()
                await _frames(10)
                _log({"ev": "cart_attempt", "step": Step.keys()[step], "prompt_visible": prompt_lbl.text != ""})
                var t0 := elapsed
                await _pause(STALL_LIMIT)
                if step == Step.CROSS:
                        _log({"ev": "stall", "s": snappedf(elapsed - t0, 0.01),
                                "note": "standing where the corner is; the flow never noticed the crossing"})
                        _finish("stuck", "crossed outside the crosswalk; step stayed CROSS with no prompt, no trigger, no way forward")

## Follows the route loosely, curious about side streets. Leaves the ladder
## halfway up. Nothing tells it how to come back.
func _persona_wanderer() -> void:
        var spots := [Vector3(-24, 0, 2.5), Vector3(-12, 0, 4.5), Vector3(-20, 0, 10.0),
                Vector3(-10, 0, 10.5), Vector3(-22, 0, 5.0), Vector3(-8, 0, 8.0)]
        await _walk_to(Vector3(-27.8, 0, 6.6)); _try_interact()
        await _excursion(spots[0])
        await _walk_to(Vector3(-16, 0, 7.0))
        await _walk_to(Vector3(-16, 0, 12.0))
        for x in [-18.0, -16.0, -14.0]:
                await _excursion(spots[1])
                await _walk_to(Vector3(x, 0, 18.3)); _try_interact()
        await _excursion(spots[3])
        await _walk_to(Vector3(-18, 0, 13.0))
        for i in 5:
                _try_interact()
                await _frames(2)
        await _excursion(spots[2])
        await _walk_to(Vector3(-16, 0, 6.0))
        await _walk_to(Vector3(-5, 0, 5.0))
        await _walk_to(Vector3(-5, 0, -5.0))
        await _excursion(Vector3(-1, 0, -6.0))
        await _walk_to(Vector3(4, 0, -5.2)); _try_interact()
        await _type_name("Meander")
        for i in 3:
                _try_interact()
                await _frames(2)
        if elapsed > BUDGET * 0.6:
                _log({"ev": "out_of_time_warning", "s": snappedf(elapsed, 0.01)})
        # The climb. Grabs the ladder. Leaves it halfway. Walks away.
        await _walk_to(Vector3(9.4, 0, -7.2))
        _log({"ev": "grab_ladder"})
        await _hold("move_fwd", 1.3)          # partway up
        await _hold("move_left", 0.8)         # steps off sideways
        _log({"ev": "left_ladder", "y": snappedf(player.global_position.y, 0.01),
                "objective": "still says CLIMB; no waypoint, no ping, no arrow"})
        # Tries a few nearby spots. None of them is the ladder. Nobody calls it back.
        var lost := [Vector3(13, 0, -4.5), Vector3(6.5, 0, -3.0), Vector3(16, 0, -3.5),
                Vector3(10, 0, -4.8), Vector3(14, 0, -3.0), Vector3(7.5, 0, -4.0)]
        var li := 0
        while elapsed < BUDGET - 5.0:
                await _excursion(lost[li % lost.size()])
                li += 1
                if player.ladder != null:
                        _log({"ev": "found_ladder_again"})
                        await _route_climb()
                        if step == Step.DONE:
                                _finish("completed_day", "found its own way back at %.1f s" % elapsed)
                        return

## Optimal to the end. Then tries to stay a while. The day ends without asking.
func _persona_gazer() -> void:
        await _route_to_cart()
        if pt_done:
                return
        for i in 3:
                _try_interact()
                await _frames(4)
        await _route_climb()
        if step != Step.DONE:
                _finish("incomplete", "never reached the top; gaze postponed")
                return
        await _pause(1.0)   # let the flicker settle; only real responses count
        for attempt in 8:
                var before := _gaze_state()
                match attempt:
                        0, 5, 7:
                                _try_interact()
                                await _frames(6)
                        1:
                                await _pulse_cam(-1.0)
                                await _frames(30)
                        2:
                                await _pulse_cam(1.0)
                                await _frames(30)
                        3, 6:
                                await _pause(3.0)
                        4:
                                await _hold("move_fwd", 1.0)   # frozen — the walker won't move
                var after := _gaze_state()
                _log({"ev": "linger_attempt", "n": attempt + 1, "what": _linger_name(attempt),
                        "responded": before != after, "frozen": player.frozen, "step": Step.keys()[step]})
        await _pause(2.0)
        _finish("completed_day", "reached the end; 8 linger attempts, 0 responses — the tableau is frozen")

# ---------------------------------------------------------------- routes
func _route_to_cart() -> void:
        for leg in _route_legs():
                await _leg(leg)
                if pt_done:
                        return
        for i in 5:
                _try_interact()
                await _frames(2)
        await _type_name("Wade's Spot")

## The full route as legs, each with its interact.
func _route_legs() -> Array:
        return [
                {"to": Vector3(-27.8, 0, 6.6), "interact": true, "what": "rosa"},
                {"to": Vector3(-16, 0, 7.0), "what": "bodega_door"},
                {"to": Vector3(-16, 0, 12.0), "what": "inside"},
                {"to": Vector3(-18, 0, 18.3), "interact": true, "what": "mango"},
                {"to": Vector3(-16, 0, 18.3), "interact": true, "what": "coffee"},
                {"to": Vector3(-14, 0, 18.3), "interact": true, "what": "bread"},
                {"to": Vector3(-18, 0, 13.0), "what": "counter"},
                {"to": Vector3(-16, 0, 6.0), "what": "exit_bodega"},
                {"to": Vector3(-5, 0, 5.0), "what": "crosswalk_n"},
                {"to": Vector3(-5, 0, -5.0), "what": "cross_street"},
                {"to": Vector3(4, 0, -5.2), "interact": true, "what": "cart"},
        ]

func _route_climb() -> void:
        await _leg({"to": Vector3(9.4, 0, -7.2), "what": "ladder_1"})
        await _hold("move_fwd", 2.2)
        await _hold("move_right", 0.6)
        await _frames(20)
        await _leg({"to": Vector3(15.8, player.global_position.y, -7.2), "what": "ladder_2"})
        await _hold("move_fwd", 2.2)
        await _hold("move_left", 0.9)
        await _frames(20)
        if step == Step.DONE or await _await_done():
                _log({"ev": "top_reached", "sim_t": snappedf(elapsed, 0.01)})

## The gold window takes its time after the top (rig swing, flicker, compose).
func _await_done(timeout := 15.0) -> bool:
        var t0 := elapsed
        while step != Step.DONE and elapsed - t0 < timeout:
                await get_tree().create_timer(0.25).timeout
        return step == Step.DONE

func _leg(leg: Dictionary) -> void:
        var t0 := elapsed
        await _walk_to(leg.to)
        if leg.has("interact"):
                _try_interact()
                await _frames(4)
        _log({"ev": "leg", "what": leg.what, "arrived": player.global_position.distance_to(leg.to) < 1.2,
                "s": snappedf(elapsed - t0, 0.01)})

func _excursion(to: Vector3) -> void:
        var t0 := elapsed
        await _walk_to(to)
        await _pulse_cam(0.5)
        await _frames(20)
        await _pulse_cam(-0.5)
        await _frames(10)
        _log({"ev": "excursion", "s": snappedf(elapsed - t0, 0.01), "step": Step.keys()[step]})

func _pause(secs: float) -> void:
        await get_tree().create_timer(secs).timeout

func _pulse_cam(dir: float) -> void:
        Input.action_press("cam_right" if dir > 0.0 else "cam_left")
        await get_tree().create_timer(0.4).timeout
        Input.action_release("cam_right" if dir > 0.0 else "cam_left")

func _type_name(text: String) -> void:
        for ch in text:
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

func _gaze_state() -> Array:
        return [step, postcard_panel.visible, snappedf(gold_mat.emission_energy_multiplier, 0.1),
                player.frozen, note_lbl.text]

func _linger_name(n: int) -> String:
        var names := ["interact", "cam_left", "cam_right", "stand_still", "try_to_walk",
                "interact_again", "stand_longer", "interact_last"]
        return names[n]

func _finish(result: String, reason: String) -> void:
        if pt_done:
                return
        pt_done = true
        _log({"ev": "result", "result": result, "reason": reason, "sim_t": snappedf(elapsed, 0.01),
                "final_step": Step.keys()[step]})
        pt_log.close()
        print("PLAYTEST RESULT [%s]: %s — %s" % [pt_persona, result, reason])
        get_tree().quit(0)

func _log(d: Dictionary) -> void:
        d["t"] = snappedf(elapsed, 0.01)
        d["persona"] = pt_persona
        print(JSON.stringify(d))
        if pt_log != null:
                pt_log.store_line(JSON.stringify(d))
                pt_log.flush()
