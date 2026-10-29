extends Node3D
## SPIKE: TS-02 — vertical-first camera rig (Doc 15).
## Standalone: one Camera3D, three poses (FOLLOW / LOOK / POSTCARD), 2 s sine
## blends. No cuts. Answers Doc 15's four proofs:
##   1. stable in 9:16 — player stays centered while orbiting +-1.4 rad and
##      dollying 5.6..11.5 (measured edge margin at 720x1280)
##   2. postcard transition is a move, not a cut (max per-frame jump vs the
##      straight-line cut distance)
##   3. nothing critical lost at the edges (the same margin number)
##   4. written recommendation -> Doc 15
## The postcard rig parks at z = -7.6 — OUTSIDE the south wall (z = -8) — and
## the player is intentionally OUT of the postcard frame (Doc 20, finding 2).
## Run: Xvfb :99 -screen 0 720x1280x24 &  then
##   DISPLAY=:99 godot --path greybox-godot res://spikes/ts02_vertical_camera.tscn \
##     --rendering-method gl_compatibility --rendering-driver opengl3 --audio-driver Dummy -- --ts02

const GOLD := Color("F7B32B")
const BRICK := Color("B23A48")
const ROAD := Color("4A4552")
const WALK := Color("B9B1A6")
const PLUM := Color("6D4C7D")

var cam: Camera3D
var player: Node3D
var logf: FileAccess
var prev_pos := Vector3.ZERO
var phase_jump := 0.0
var out_dir := "/tmp/spikes"

func _ready() -> void:
        if "--ts02" in OS.get_cmdline_user_args():
                _build_world()
                _spawn()
                _run.call_deferred()

func _physics_process(_d: float) -> void:
        if cam != null and prev_pos != Vector3.ZERO:
                phase_jump = maxf(phase_jump, cam.global_position.distance_to(prev_pos))
        if cam != null:
                prev_pos = cam.global_position

func _mat(c: Color) -> StandardMaterial3D:
        var m := StandardMaterial3D.new()
        m.albedo_color = c
        return m

func _box(name_: String, center: Vector3, size: Vector3, color: Color) -> void:
        var mi := MeshInstance3D.new()
        mi.name = name_
        var bm := BoxMesh.new()
        bm.size = size
        mi.mesh = bm
        mi.position = center
        mi.material_override = _mat(color)
        add_child(mi)

## A pocket of the real street: road, sidewalks, the south wall, the
## gold-window building across the street, a skyline card far north.
func _build_world() -> void:
        _box("Road", Vector3(0, -0.1, 0), Vector3(100, 0.2, 8), ROAD)
        _box("Walk_N", Vector3(0, -0.05, 6), Vector3(100, 0.3, 4), WALK)
        _box("Walk_S", Vector3(0, -0.05, -6), Vector3(100, 0.3, 4), WALK)
        _box("Wall_S", Vector3(13, 7, -14), Vector3(26, 14, 12), BRICK)          # the fire-escape block
        _box("Bldg_GoldWin", Vector3(15, 5.5, 14), Vector3(12, 11, 12), BRICK)   # across the street
        var dim := StandardMaterial3D.new()
        dim.albedo_color = Color("3B3346")
        for row in 3:
                for col in 4:
                        var mi := MeshInstance3D.new()
                        var bm := BoxMesh.new()
                        bm.size = Vector3(1.2, 1.6, 0.08)
                        mi.mesh = bm
                        mi.position = Vector3(10.5 + col * 3, 3 + row * 3, 7.94)
                        if row == 2 and col == 1:
                                var gm := StandardMaterial3D.new()
                                gm.albedo_color = Color("3B3346")
                                gm.emission_enabled = true
                                gm.emission = GOLD
                                gm.emission_energy_multiplier = 4.0
                                mi.material_override = gm
                                mi.name = "GoldWindow"
                        else:
                                mi.material_override = dim
                                mi.name = "Window_%d_%d" % [row, col]
                        add_child(mi)
        var sun := DirectionalLight3D.new()
        sun.rotation_degrees = Vector3(-28, -60, 0)
        sun.light_color = Color("FFB85C")
        add_child(sun)
        var env := Environment.new()
        env.background_mode = Environment.BG_SKY
        var sky := Sky.new()
        var sm := ProceduralSkyMaterial.new()
        sm.sky_top_color = Color("3E2F5B")
        sm.sky_horizon_color = PLUM
        sky.sky_material = sm
        env.sky = sky
        env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
        var we := WorldEnvironment.new()
        we.environment = env
        add_child(we)

func _spawn() -> void:
        player = Node3D.new()
        var mi := MeshInstance3D.new()
        var cm := CapsuleMesh.new()
        cm.radius = 0.35
        cm.height = 1.75
        mi.mesh = cm
        mi.position.y = 0.9
        mi.material_override = _mat(GOLD)
        player.add_child(mi)
        player.position = Vector3(4, 0.05, -6.6)   # the cart corner
        add_child(player)
        cam = Camera3D.new()
        cam.fov = 60
        cam.keep_aspect = Camera3D.KEEP_WIDTH      # vertical-first: width is fixed
        add_child(cam)
        cam.current = true

## The three poses. FOLLOW: the game's cozy 3/4 from the street side.
## LOOK: tighter, over the shoulder, orbitable. POSTCARD: parked across the
## street, framed on the window, you out of it.
func _pose(mode: String) -> Dictionary:
        var p := player.global_position + Vector3(0, 1.2, 0)
        match mode:
                "FOLLOW":
                        return {"pos": Vector3(p.x, p.y + 6.5, p.z + 9.0), "look": p}
                "LOOK":
                        return {"pos": Vector3(p.x, p.y + 2.4, p.z + 5.6), "look": p + Vector3(0, 0.4, -2.0)}
                _:
                        return {"pos": Vector3(13.5, 9.5, -7.6), "look": Vector3(13.5, 9.0, 7.94)}

func _set_pose(m: Dictionary) -> void:
        cam.global_position = m.pos
        cam.look_at(m.look, Vector3.UP)

func _blend(from: Dictionary, to: Dictionary, secs := 2.0) -> void:
        for i in int(secs * 60.0) + 1:
                var k := float(i) / (secs * 60.0)
                var e := 0.5 - 0.5 * cos(k * PI)
                cam.global_position = from.pos.lerp(to.pos, e)
                var look: Vector3 = from.look.lerp(to.look, e)
                if not cam.global_position.is_equal_approx(look):
                        cam.look_at(look, Vector3.UP)
                await get_tree().physics_frame

func _run() -> void:
        var env := OS.get_environment("SPIKE_OUT")
        if env != "":
                out_dir = env
        DirAccess.make_dir_recursive_absolute(out_dir)
        logf = FileAccess.open(out_dir + "/ts02_log.jsonl", FileAccess.WRITE)
        await _frames(10)

        # -- 1. FOLLOW: orbit +-1.4 rad, dolly 5.6..11.5, measure the player's
        # screen margin the whole way.
        var follow := _pose("FOLLOW")
        _set_pose(follow)
        var worst_margin := 99999.0
        for i in 121:
                var k := float(i) / 120.0
                var yaw := sin(k * TAU) * 1.4
                var dist := 9.0 + sin(k * TAU) * 2.95          # 6.05 .. 11.95 sweep
                var p := player.global_position + Vector3(0, 1.2, 0)
                cam.global_position = p + Vector3(sin(yaw) * dist, 6.5 - 1.6 * absf(sin(k * TAU)), cos(yaw) * dist)
                cam.look_at(p, Vector3.UP)
                worst_margin = minf(worst_margin, _edge_margin())
                await get_tree().physics_frame
        _shot("01_follow_orbit")
        _log({"ev": "follow_orbit", "worst_edge_margin_px": int(worst_margin), "viewport": "720x1280"})

        # -- 2. FOLLOW -> LOOK: 2 s, no cut.
        phase_jump = 0.0
        await _blend(follow, _pose("LOOK"))
        _log({"ev": "blend_follow_look", "max_jump": snappedf(phase_jump, 0.01)})
        _shot("02_look")

        # -- 3. LOOK: light player-controlled orbit, still centered.
        var look_pose := _pose("LOOK")
        _set_pose(look_pose)
        worst_margin = 99999.0
        for i in 91:
                var k := float(i) / 90.0
                var yaw := sin(k * TAU) * 1.4
                var p := player.global_position + Vector3(0, 1.2, 0)
                var base: Vector3 = look_pose.pos - p
                cam.global_position = p + base.rotated(Vector3.UP, yaw)
                cam.look_at(p + Vector3(0, 0.4, -2.0), Vector3.UP)
                worst_margin = minf(worst_margin, _edge_margin())
                await get_tree().physics_frame
        _log({"ev": "look_orbit", "worst_edge_margin_px": int(worst_margin)})

        # -- 4. LOOK -> POSTCARD: the money blend. Measure the cut it replaces.
        var cut_distance: float = _pose("LOOK").pos.distance_to(_pose("POSTCARD").pos)
        phase_jump = 0.0
        await _blend(look_pose, _pose("POSTCARD"))
        _log({"ev": "blend_look_postcard", "max_jump": snappedf(phase_jump, 0.01),
                "cut_distance_if_hard_cut": snappedf(cut_distance, 0.01)})
        _shot("03_blend_mid")

        # -- 5. POSTCARD hold: rig outside the wall, player out of frame.
        await _frames(30)
        _shot("04_postcard_final")
        var behind := cam.is_position_behind(player.global_position + Vector3(0, 1.0, 0))
        var in_frame := not behind and _in_frame(player.global_position + Vector3(0, 1.0, 0))
        var win_screen := cam.unproject_position(Vector3(13.5, 9.0, 7.94))
        _log({"ev": "postcard_check", "rig_z": -7.6, "wall_z": -8.0,
                "player_out_of_frame": not in_frame, "player_behind_cam": behind,
                "window_screen_px": [int(win_screen.x), int(win_screen.y)]})
        logf.close()
        print("TS02 DONE — frames in ", out_dir)
        get_tree().quit(0)

func _edge_margin() -> float:
        var p := player.global_position + Vector3(0, 1.2, 0)
        if cam.is_position_behind(p):
                return -1.0
        var s := cam.unproject_position(p)
        var sz := Vector2(cam.get_viewport().get_visible_rect().size)
        return minf(minf(s.x, sz.x - s.x), minf(s.y, sz.y - s.y))

func _in_frame(p: Vector3) -> bool:
        if cam.is_position_behind(p):
                return false
        var s := cam.unproject_position(p)
        var sz := Vector2(cam.get_viewport().get_visible_rect().size)
        return s.x >= 0 and s.x <= sz.x and s.y >= 0 and s.y <= sz.y

func _shot(tag: String) -> void:
        var img := get_viewport().get_texture().get_image()
        if img != null and not img.is_empty():
                img.save_png(out_dir + "/%s.png" % tag)

func _log(d: Dictionary) -> void:
        print(JSON.stringify(d))
        if logf != null:
                logf.store_line(JSON.stringify(d))
                logf.flush()

func _frames(n: int) -> void:
        for i in n:
                await get_tree().physics_frame
