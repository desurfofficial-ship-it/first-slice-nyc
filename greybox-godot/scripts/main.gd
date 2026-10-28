extends Node3D
## FIRST SLICE — Day 1 greybox (Doc 10 contract), built in code so it diffs cleanly.
## Path: terminal → Rosa → bodega (3 items, 5-order rush) → crosswalk → corner + cart
##       → name the cart → 3 solo serves (last is Mr. Idris) → fire escape → dusk
##       → gold window → Postcard.
## Controls: WASD/arrows move · Space/E interact · Z/C turn camera
##           R restart day · G force gold window (debug) · P save Postcard view.

const PlayerScript := preload("res://scripts/player.gd")

enum Step { MEET_ROSA, ENTER_BODEGA, COLLECT, RUSH, CROSS, CLAIM_CART, NAME_CART, SOLO, CLIMB, POSTCARD, DONE }

# Palette from Doc 04.
const C_GOLD := Color("F7B32B")
const C_BRICK := Color("B23A48")
const C_TEAL := Color("2A9D8F")
const C_AMBER := Color("FFB85C")
const C_STONE := Color("E8E4DC")
const C_PLUM := Color("6D4C7D")
const C_CORAL := Color("FF6B6B")
const C_CREAM := Color("FFF8F0")
const C_ROAD := Color("4A4552")
const C_WALK := Color("B9B1A6")
const C_BLDG := Color("8E6F66")
const C_BLDG2 := Color("A3857A")
const C_INTERIOR := Color("D9C3A5")
const C_TAXI := Color("F2C230")

const START_POS := Vector3(-30, 0.05, 6.2)
const INTERACT_RANGE := 2.4

var step: int = Step.MEET_ROSA
var autotest := false
var elapsed := 0.0
var cart_name := ""

var player: CharacterBody3D
var cam: Camera3D
var cam_yaw := 0.0
var cam_turn := 0.0
var postcard_rig := false
var sun: DirectionalLight3D
var sky_mat: ProceduralSkyMaterial
var env: Environment
var bodega_roof: Node3D
var gold_window: MeshInstance3D
var gold_mat: StandardMaterial3D
var cart_root: Node3D
var cart_mat: StandardMaterial3D
var taxi: Node3D
var taxi_x := -45.0
var rosa: Node3D
var customer: Node3D
var items_left := {}
var rush_served := 0
var solo_served := 0
var dusk_started := false
var checkpoint := START_POS

# UI
var ui: CanvasLayer
var objective_lbl: Label
var note_lbl: Label
var prompt_lbl: Label
var timer_lbl: Label
var name_box: PanelContainer
var name_edit: LineEdit
var postcard_panel: PanelContainer
var postcard_lbl: Label

# interactables: Array of {node: Node3D, id: String}
var interactables: Array = []

func _ready() -> void:
	autotest = "--autotest" in OS.get_cmdline_user_args()
	_setup_input()
	_build_world()
	_build_ui()
	_spawn_player()
	_set_step(Step.MEET_ROSA)
	_show_note("You are here. That's enough.")
	if autotest:
		_run_autotest.call_deferred()

# ---------------------------------------------------------------- input
func _setup_input() -> void:
	var map := {
		"move_fwd": [KEY_W, KEY_UP], "move_back": [KEY_S, KEY_DOWN],
		"move_left": [KEY_A, KEY_LEFT], "move_right": [KEY_D, KEY_RIGHT],
		"interact": [KEY_SPACE, KEY_E], "cam_left": [KEY_Z], "cam_right": [KEY_C],
		"restart": [KEY_R], "debug_gold": [KEY_G], "postcard_snap": [KEY_P],
	}
	for action in map:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for k in map[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = k
			InputMap.action_add_event(action, ev)

func _unhandled_input(event: InputEvent) -> void:
	# _unhandled_input: a focused LineEdit eats its keys first, so typing a cart
	# name never triggers movement or interact (lesson from Last One Laughing).
	if name_box.visible:
		return
	if event.is_action_pressed("interact"):
		_try_interact()
	elif event.is_action_pressed("restart"):
		get_tree().reload_current_scene()
	elif event.is_action_pressed("debug_gold"):
		_start_dusk()
		_light_gold_window()
	elif event.is_action_pressed("postcard_snap"):
		_save_postcard()

# ---------------------------------------------------------------- world
func _mat(c: Color, emissive := false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.9
	if emissive:
		m.emission_enabled = true
		m.emission = c
		m.emission_energy_multiplier = 1.5
	return m

func _box(parent: Node, name_: String, center: Vector3, size: Vector3, color: Color, collide := true) -> Node3D:
	var root: Node3D
	if collide:
		var body := StaticBody3D.new()
		var cs := CollisionShape3D.new()
		var sh := BoxShape3D.new()
		sh.size = size
		cs.shape = sh
		body.add_child(cs)
		root = body
	else:
		root = Node3D.new()
	root.name = name_
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = _mat(color)
	root.add_child(mi)
	root.position = center
	parent.add_child(root)
	return root

func _cyl(parent: Node, name_: String, center: Vector3, r: float, h: float, color: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = name_
	var cm := CylinderMesh.new()
	cm.top_radius = r
	cm.bottom_radius = r
	cm.height = h
	mi.mesh = cm
	mi.material_override = _mat(color)
	mi.position = center
	parent.add_child(mi)
	return mi

func _group(name_: String) -> Node3D:
	var n := Node3D.new()
	n.name = name_
	add_child(n)
	return n

func _area(parent: Node, name_: String, center: Vector3, size: Vector3, on_enter: Callable, on_exit := Callable()) -> Area3D:
	var a := Area3D.new()
	a.name = name_
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = size
	cs.shape = sh
	a.add_child(cs)
	a.position = center
	parent.add_child(a)
	a.body_entered.connect(_on_area_body.bind(a, on_enter))
	if on_exit.is_valid():
		a.body_exited.connect(_on_area_body.bind(a, on_exit))
	return a

func _on_area_body(b: Node, a: Area3D, cb: Callable) -> void:
	if b == player:
		cb.call(a)

func _npc(parent: Node, name_: String, pos: Vector3, color: Color) -> Node3D:
	var root := Node3D.new()
	root.name = name_
	var mi := MeshInstance3D.new()
	var cap := CapsuleMesh.new()
	cap.radius = 0.32
	cap.height = 1.7
	mi.mesh = cap
	mi.position.y = 0.85
	mi.material_override = _mat(color)
	root.add_child(mi)
	root.position = pos
	parent.add_child(root)
	return root

func _build_world() -> void:
	# --SETUP-- light + sky (golden hour, styleframe A)
	var setup := _group("--SETUP--")
	sun = DirectionalLight3D.new()
	sun.name = "Sun"
	sun.light_color = C_AMBER
	sun.light_energy = 1.3
	sun.shadow_enabled = true
	sun.rotation_degrees = Vector3(-28, -60, 0)
	setup.add_child(sun)
	sky_mat = ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color("7FA7C9")
	sky_mat.sky_horizon_color = C_AMBER
	sky_mat.ground_horizon_color = C_AMBER
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.8
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.glow_enabled = true
	var we := WorldEnvironment.new()
	we.environment = env
	setup.add_child(we)

	var lvl := _group("--LEVEL--")
	# Street runs along X. Road z[-4,4], north walk z[4,8], south walk z[-8,-4].
	_box(lvl, "Road", Vector3(0, -0.1, 0), Vector3(100, 0.2, 8), C_ROAD)
	_box(lvl, "Sidewalk_N", Vector3(0, -0.05, 6), Vector3(100, 0.3, 4), C_WALK)
	_box(lvl, "Sidewalk_S", Vector3(0, -0.05, -6), Vector3(100, 0.3, 4), C_WALK)
	for i in 6:  # crosswalk stripes at x = -5
		_box(lvl, "Crosswalk_%d" % i, Vector3(-5, 0.01, -3.3 + i * 1.3), Vector3(3, 0.02, 0.6), C_CREAM, false)

	# North block, with a gap for Rosa's bodega x[-21,-11].
	_box(lvl, "Bldg_N_West", Vector3(-35.5, 7, 14), Vector3(29, 14, 12), C_BLDG)
	_box(lvl, "Bldg_N_East_A", Vector3(-1, 9, 14), Vector3(20, 18, 12), C_BLDG2)
	_box(lvl, "Bldg_N_GoldWindow", Vector3(15, 5.5, 14), Vector3(12, 11, 12), C_BRICK)  # low, so skyline shows over it
	_box(lvl, "Bldg_N_East_B", Vector3(35, 8, 14), Vector3(28, 16, 12), C_BLDG)
	# Terminal door on the west building.
	_box(lvl, "Terminal_Door", Vector3(-30, 1.4, 7.95), Vector3(3, 2.8, 0.15), C_TEAL, false)
	_box(lvl, "Terminal_Sign", Vector3(-30, 3.4, 7.95), Vector3(5, 0.8, 0.15), C_STONE, false)

	# South block. Fire escape lives on Bldg_S_FireEscape at z = -8.
	_box(lvl, "Bldg_S_West", Vector3(-25, 8, -14), Vector3(50, 16, 12), C_BLDG2)
	_box(lvl, "Bldg_S_FireEscape", Vector3(13, 7, -14), Vector3(26, 14, 12), C_BRICK)
	_box(lvl, "Bldg_S_East", Vector3(38, 9, -14), Vector3(24, 18, 12), C_BLDG)

	_build_bodega(lvl)

	# Props: manhole + steam, hydrant, taxi.
	_cyl(lvl, "Manhole", Vector3(-10, 0.01, 0.5), 0.6, 0.02, Color("2B2730"))
	var steam := CPUParticles3D.new()
	steam.name = "Steam"
	steam.position = Vector3(-10, 0.1, 0.5)
	steam.amount = 24
	steam.lifetime = 2.5
	steam.direction = Vector3.UP
	steam.spread = 15
	steam.initial_velocity_min = 0.6
	steam.initial_velocity_max = 1.0
	steam.gravity = Vector3(0, 0.2, 0)
	var sm := SphereMesh.new()
	sm.radius = 0.25
	sm.height = 0.5
	sm.material = _mat(Color(1, 1, 1, 0.5))
	(sm.material as StandardMaterial3D).transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	steam.mesh = sm
	lvl.add_child(steam)
	_cyl(lvl, "Hydrant", Vector3(-0.6, 0.45, -4.6), 0.18, 0.9, C_CORAL)
	taxi = _box(lvl, "Taxi", Vector3(taxi_x, 0.7, -2), Vector3(4, 1.3, 1.9), C_TAXI, false)

	# Player corner: a waiting rectangle of different paving.
	_box(lvl, "PlayerCorner", Vector3(4, 0.11, -6), Vector3(8, 0.02, 3.6), C_STONE, false)

	_build_fire_escape(lvl)
	_build_windows(lvl)

	# Skyline card far north-east, above the low gold-window building.
	var sky_grp := _group("SkylineCard")
	var heights := [38, 62, 45, 80, 52, 70, 40, 58]
	for i in heights.size():
		_box(sky_grp, "Tower_%d" % i, Vector3(-10 + i * 7, heights[i] / 2.0, 90), Vector3(6, heights[i], 6), Color("9C8AA5"), false)
	_box(sky_grp, "Spire", Vector3(11, 92, 90), Vector3(0.6, 24, 0.6), Color("9C8AA5"), false)

	# Invisible walls + a kill floor so nobody leaves the block.
	var bounds := _group("--BOUNDS--")
	_inv_wall(bounds, Vector3(-48, 5, 0), Vector3(1, 20, 40))
	_inv_wall(bounds, Vector3(48, 5, 0), Vector3(1, 20, 40))
	_area(bounds, "KillFloor", Vector3(0, -12, 0), Vector3(200, 2, 200), func(_a): _respawn())

	_build_interactables()

func _inv_wall(parent: Node, center: Vector3, size: Vector3) -> void:
	var body := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = size
	cs.shape = sh
	body.add_child(cs)
	body.position = center
	parent.add_child(body)

func _build_bodega(lvl: Node3D) -> void:
	var b := Node3D.new()
	b.name = "Bodega"
	lvl.add_child(b)
	var h := 4.5
	_box(b, "Floor", Vector3(-16, 0.06, 14), Vector3(10, 0.1, 12), C_INTERIOR)
	_box(b, "Wall_W", Vector3(-20.8, h / 2, 14), Vector3(0.4, h, 12), C_STONE)
	_box(b, "Wall_E", Vector3(-11.2, h / 2, 14), Vector3(0.4, h, 12), C_STONE)
	_box(b, "Wall_Back", Vector3(-16, h / 2, 19.8), Vector3(10, h, 0.4), C_STONE)
	_box(b, "Front_L", Vector3(-19.25, h / 2, 8.2), Vector3(3.5, h, 0.4), C_BRICK)   # holds the window
	_box(b, "Front_R", Vector3(-12.75, h / 2, 8.2), Vector3(3.5, h, 0.4), C_BRICK)
	_box(b, "Front_Lintel", Vector3(-16, 3.8, 8.2), Vector3(3, 1.4, 0.4), C_BRICK)
	_box(b, "Window_Front", Vector3(-19.25, 1.8, 7.98), Vector3(2.6, 1.6, 0.05), C_AMBER, false)
	_box(b, "Awning", Vector3(-16, 3.2, 7.4), Vector3(10, 0.15, 1.4), C_TEAL, false)
	bodega_roof = _box(b, "Roof", Vector3(-16, h + 0.15, 14), Vector3(10, 0.3, 12), C_BLDG)
	_box(b, "Counter", Vector3(-19.6, 0.55, 13.5), Vector3(1.2, 1.1, 6), C_TEAL)
	_box(b, "BackShelf", Vector3(-16, 1.0, 19.3), Vector3(6, 2.0, 0.6), C_BLDG2)
	# Hide the roof while you're inside so the cozy camera can see you.
	_area(b, "InsideZone", Vector3(-16, 2, 14), Vector3(9.4, 4, 11.4), _enter_bodega, _exit_bodega)

func _enter_bodega(_a: Area3D) -> void:
	bodega_roof.visible = false
	if step == Step.ENTER_BODEGA:
		_set_step(Step.COLLECT)

func _exit_bodega(_a: Area3D) -> void:
	bodega_roof.visible = true

func _build_fire_escape(lvl: Node3D) -> void:
	var fe := Node3D.new()
	fe.name = "FireEscape"
	lvl.add_child(fe)
	var rail := Color("3A3440")
	_box(fe, "Landing_1", Vector3(13, 4.0, -7.3), Vector3(6, 0.15, 1.4), rail)
	_box(fe, "Landing_2", Vector3(13, 8.0, -7.3), Vector3(6, 0.15, 1.4), rail)
	_box(fe, "Rail_1", Vector3(13, 4.5, -6.62), Vector3(6, 0.9, 0.05), rail, false)
	_box(fe, "Rail_2", Vector3(13, 8.5, -6.62), Vector3(6, 0.9, 0.05), rail, false)
	_box(fe, "Ladder_1_Mesh", Vector3(9.4, 2.2, -7.75), Vector3(0.6, 4.4, 0.08), rail, false)
	_box(fe, "Ladder_2_Mesh", Vector3(16.6, 6.2, -7.75), Vector3(0.6, 4.4, 0.08), rail, false)
	_ladder(fe, "Ladder_1", Vector3(9.4, 2.4, -7.75), 4.8, 4.35)
	_ladder(fe, "Ladder_2", Vector3(16.4, 6.6, -7.75), 4.8, 8.35, 1.6)
	_area(fe, "TopLanding", Vector3(12.5, 9.0, -7.3), Vector3(4.5, 1.8, 1.4), func(_a): _reach_top())

func _ladder(parent: Node3D, name_: String, center: Vector3, height: float, top_y: float, width := 1.0) -> void:
	var a := _area(parent, name_, center, Vector3(width, height, 1.4), _grab_ladder, _leave_ladder)
	a.set_meta("top", top_y)

func _grab_ladder(area: Area3D) -> void:
	player.ladder = area
	player.ladder_top = area.get_meta("top")
	if step >= Step.CLIMB:
		checkpoint = Vector3(9.4, 0.05, -5.5)
		_start_dusk()

func _leave_ladder(area: Area3D) -> void:
	if player.ladder == area:
		player.ladder = null

func _build_windows(lvl: Node3D) -> void:
	# Dark windows on the gold-window building's street face; one of them is the one.
	var dim := Color("3B3346")
	for row in 3:
		for col in 4:
			var p := Vector3(10.5 + col * 3, 3 + row * 3, 7.94)
			if row == 2 and col == 1:
				gold_window = MeshInstance3D.new()
				gold_window.name = "GoldWindow"
				var bm := BoxMesh.new()
				bm.size = Vector3(1.2, 1.6, 0.08)
				gold_window.mesh = bm
				gold_mat = _mat(dim)
				gold_mat.emission_enabled = true
				gold_mat.emission = C_GOLD
				gold_mat.emission_energy_multiplier = 0.0
				gold_window.material_override = gold_mat
				gold_window.position = p
				lvl.add_child(gold_window)
			else:
				_box(lvl, "Window_%d_%d" % [row, col], p, Vector3(1.2, 1.6, 0.08), dim, false)

func _build_interactables() -> void:
	var it := _group("--INTERACTABLES--")
	rosa = _npc(it, "Rosa", Vector3(-27, 0.05, 6.8), C_CORAL)
	interactables.append({"node": rosa, "id": "rosa"})
	var names := {"mango": C_AMBER, "coffee": C_TEAL, "bread": C_CREAM}
	var x := -18.0
	for id in names:
		var n := _box(it, "Item_" + id, Vector3(x, 2.25, 19.2), Vector3(0.5, 0.5, 0.5), names[id], false)
		items_left[id] = n
		interactables.append({"node": n, "id": "item_" + id})
		x += 2.0
	var counter_pt := Node3D.new()
	counter_pt.name = "ServePoint_Counter"
	counter_pt.position = Vector3(-18.5, 0.5, 13.5)
	it.add_child(counter_pt)
	interactables.append({"node": counter_pt, "id": "counter"})
	_area(it, "CrosswalkZone", Vector3(-5, 1, 0), Vector3(3.4, 2, 7.5), _cross_zone)

	cart_root = Node3D.new()
	cart_root.name = "CartPlaceholder"
	cart_root.position = Vector3(4, 0.05, -6.6)
	it.add_child(cart_root)
	cart_mat = _mat(Color(C_GOLD, 0.35))
	cart_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	for part in [[Vector3(0, 0.6, 0), Vector3(1.8, 1.0, 1.0)], [Vector3(0, 2.0, 0), Vector3(2.2, 0.12, 1.4)],
			[Vector3(-0.9, 1.4, 0), Vector3(0.08, 1.4, 0.08)], [Vector3(0.9, 1.4, 0), Vector3(0.08, 1.4, 0.08)]]:
		var mi := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = part[1]
		mi.mesh = bm
		mi.position = part[0]
		mi.material_override = cart_mat
		cart_root.add_child(mi)
	interactables.append({"node": cart_root, "id": "cart"})

# ---------------------------------------------------------------- player + camera
func _spawn_player() -> void:
	var grp := _group("--PLAYER--")
	player = CharacterBody3D.new()
	player.name = "Player"
	player.set_script(PlayerScript)
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.35
	cap.height = 1.75
	cs.shape = cap
	cs.position.y = 0.9
	player.add_child(cs)
	var mi := MeshInstance3D.new()
	var cm := CapsuleMesh.new()
	cm.radius = 0.35
	cm.height = 1.75
	mi.mesh = cm
	mi.position.y = 0.9
	mi.material_override = _mat(C_GOLD)
	player.add_child(mi)
	var nose := MeshInstance3D.new()   # shows facing
	var nb := BoxMesh.new()
	nb.size = Vector3(0.2, 0.2, 0.3)
	nose.mesh = nb
	nose.position = Vector3(0, 1.4, 0.35)
	nose.material_override = _mat(C_PLUM)
	player.add_child(nose)
	player.position = START_POS
	grp.add_child(player)
	cam = Camera3D.new()
	cam.name = "CozyCam"
	cam.fov = 60
	cam.keep_aspect = Camera3D.KEEP_WIDTH   # vertical-first: width is the fixed side
	grp.add_child(cam)
	cam.current = true
	_update_camera(1.0)

func _process(delta: float) -> void:
	if step < Step.DONE:
		elapsed += delta
	timer_lbl.text = "%d:%02d" % [int(elapsed) / 60, int(elapsed) % 60]
	taxi_x += delta * 9.0
	if taxi_x > 46.0:
		taxi_x = -46.0
	taxi.position.x = taxi_x
	cam_turn = Input.get_axis("cam_left", "cam_right") if not name_box.visible else 0.0
	_update_camera(delta)
	_update_prompt()

func _update_camera(delta: float) -> void:
	if postcard_rig:
		return
	# Cozy 3/4: look from the street side toward whatever wall you're near.
	var target_yaw := PI if player.global_position.z < -2.5 else 0.0
	cam_yaw = lerp_angle(cam_yaw, target_yaw, clamp(delta * 3.0, 0, 1)) + cam_turn * delta * 1.5
	player.cam_yaw = cam_yaw
	var fwd := Vector3(sin(cam_yaw), 0, cos(cam_yaw))
	var focus := player.global_position + Vector3(0, 1.2, 0)
	cam.global_position = cam.global_position.lerp(focus - fwd * 9.0 + Vector3(0, 6.5, 0), clamp(delta * 6.0, 0, 1))
	cam.look_at(focus, Vector3.UP)

# ---------------------------------------------------------------- flow
func _set_step(s: int) -> void:
	step = s
	var text := {
		Step.MEET_ROSA: "Someone by the terminal is waving at you.",
		Step.ENTER_BODEGA: "Follow Rosa into the bodega with the warm window.",
		Step.COLLECT: "Rosa needs three things from the back shelf.",
		Step.RUSH: "The rush is here. Serve at the counter.",
		Step.CROSS: "Your corner is across the street. Use the crosswalk.",
		Step.CLAIM_CART: "That empty corner is waiting. Walk up to it.",
		Step.NAME_CART: "Give your cart a name.",
		Step.SOLO: "Your first customers. Serve at your cart.",
		Step.CLIMB: "Rosa says the fire escape has the best seat. Climb.",
		Step.POSTCARD: "",
		Step.DONE: "Day 1 is done. R to begin again.",
	}
	objective_lbl.text = text.get(s, "")

func _try_interact() -> void:
	var best = _nearest_interactable()
	if best == null:
		return
	match best.id:
		"rosa":
			if step == Step.MEET_ROSA:
				_show_note("Rosa: \"Honey, your Map is upside down. Come on, I'll show you.\"")
				rosa.position = Vector3(-20.4, 0.1, 13.5)  # behind the counter now
				_set_step(Step.ENTER_BODEGA)
		"counter":
			if step == Step.RUSH and customer:
				rush_served += 1
				customer.queue_free()
				customer = null
				if rush_served == 1:
					_show_note("Regular coffee = milk, two sugars. Nobody knows why. It's just true.")
				elif rush_served == 3:
					_show_note("\"Regular\" also means small. The city likes its words efficient.")
				if rush_served >= 5:
					_show_note("Five orders. One apron that still smelled like mangoes. The city let me keep up.")
					_set_step(Step.CROSS)
				else:
					_spawn_customer(Vector3(-18.0, 0.1, 11.0 + rush_served * 0.3))
		"cart":
			if step == Step.CLAIM_CART:
				_open_name_box()
			elif step == Step.SOLO and customer:
				solo_served += 1
				customer.queue_free()
				customer = null
				if solo_served >= 3:
					_show_note("The usual is a tiny love letter. It means: I come here, and you noticed.")
					_set_step(Step.CLIMB)
				else:
					_spawn_solo_customer()
		_:
			if best.id.begins_with("item_") and step == Step.COLLECT:
				var id: String = best.id.substr(5)
				if items_left.has(id):
					items_left[id].queue_free()
					items_left.erase(id)
					_remove_interactable(best.node)
					if items_left.is_empty():
						_set_step(Step.RUSH)
						_spawn_customer(Vector3(-18.0, 0.1, 11.0))

func _nearest_interactable():
	var best = null
	var best_d := INTERACT_RANGE
	for e in interactables:
		var n: Node3D = e.node
		if not is_instance_valid(n):
			continue
		var d := Vector2(n.global_position.x - player.global_position.x, n.global_position.z - player.global_position.z).length()
		if abs(n.global_position.y - player.global_position.y) > 3.0:
			continue
		if d < best_d and _is_relevant(e.id):
			best_d = d
			best = e
	return best

func _is_relevant(id: String) -> bool:
	match id:
		"rosa": return step == Step.MEET_ROSA
		"counter": return step == Step.RUSH
		"cart": return step == Step.CLAIM_CART or step == Step.SOLO
	return id.begins_with("item_") and step == Step.COLLECT

func _remove_interactable(n: Node) -> void:
	interactables = interactables.filter(func(e): return e.node != n)

func _update_prompt() -> void:
	var best = _nearest_interactable()
	if best == null or name_box.visible:
		prompt_lbl.text = ""
		return
	var verbs := {"rosa": "Say hi", "counter": "Serve", "cart": "Claim corner" if step == Step.CLAIM_CART else "Serve"}
	prompt_lbl.text = "[Space] " + verbs.get(best.id, "Take")

func _spawn_customer(pos: Vector3) -> void:
	customer = _npc(self, "Customer", pos, C_TEAL.lightened(randf() * 0.3))

func _spawn_solo_customer() -> void:
	_spawn_customer(Vector3(4, 0.05, -4.6))
	if solo_served == 2:
		customer.name = "MrIdris"
		(customer.get_child(0) as MeshInstance3D).material_override = _mat(C_PLUM)
		_show_note("Mr. Idris: \"Coffee. Regular. I'll be back tomorrow.\"")

func _cross_zone(_a: Area3D) -> void:
	if step == Step.CROSS:
		_crossed()

func _crossed() -> void:
	_show_note("The Shuffle: walk toward the gaps. Brushing someone is correct. They say \"scuse me.\" That is the dance.")
	checkpoint = Vector3(4, 0.05, -4.5)
	_set_step(Step.CLAIM_CART)

func _open_name_box() -> void:
	_set_step(Step.NAME_CART)
	player.frozen = true
	name_box.visible = true
	name_edit.text = ""
	name_edit.grab_focus()

func _confirm_name(text: String) -> void:
	cart_name = text.strip_edges()
	if cart_name.is_empty():
		cart_name = "First Slice"
	name_box.visible = false
	player.frozen = false
	cart_mat.albedo_color = C_GOLD
	cart_mat.transparency = BaseMaterial3D.TRANSPARENCY_DISABLED
	var sign := Label3D.new()
	sign.name = "CartSign"
	sign.text = cart_name
	sign.font_size = 64
	sign.position = Vector3(0, 2.3, 0)
	sign.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	cart_root.add_child(sign)
	_show_note("Your corner. Your name. The city wrote it down with you.")
	_set_step(Step.SOLO)
	_spawn_solo_customer()

func _start_dusk() -> void:
	if dusk_started:
		return
	dusk_started = true
	var tw := create_tween().set_parallel(true)
	tw.tween_property(sky_mat, "sky_top_color", Color("3E2F5B"), 6.0)
	tw.tween_property(sky_mat, "sky_horizon_color", C_PLUM, 6.0)
	tw.tween_property(sky_mat, "ground_horizon_color", C_PLUM, 6.0)
	tw.tween_property(sun, "light_color", Color("C77D8E"), 6.0)
	tw.tween_property(sun, "light_energy", 0.35, 6.0)
	tw.tween_property(env, "ambient_light_energy", 0.45, 6.0)

func _reach_top() -> void:
	if step != Step.CLIMB:
		return
	_set_step(Step.POSTCARD)
	_start_dusk()
	player.frozen = true
	_show_note("Stoop = outdoor living room. You're invited. That's the important part.")
	# Authored rig: over your shoulder, across the street, at the one window.
	postcard_rig = true
	var tw := create_tween()
	tw.tween_property(cam, "global_position", Vector3(15.0, 10.0, -9.2), 2.0).set_trans(Tween.TRANS_SINE)
	tw.parallel().tween_method(func(t): cam.look_at(gold_window.global_position.lerp(Vector3(12, 30, 90), 0.08 * t), Vector3.UP), 0.0, 1.0, 2.0)
	tw.tween_interval(1.0)
	tw.tween_callback(_light_gold_window)
	tw.tween_interval(2.6)
	tw.tween_callback(_compose_postcard)

func _light_gold_window() -> void:
	# Flicker, then hold.
	var tw := create_tween()
	for e in [2.0, 0.2, 3.0, 0.0, 1.2, 0.3]:
		tw.tween_property(gold_mat, "emission_energy_multiplier", e, 0.12)
	tw.tween_property(gold_mat, "emission_energy_multiplier", 4.0, 0.6)

func _compose_postcard() -> void:
	postcard_lbl.text = "Met: Rosa. Idris. Learned: the usual is a tiny love letter.\nThe regulars are waiting.\n\n— %s, Day 1" % cart_name
	postcard_panel.visible = true
	_save_postcard()
	_set_step(Step.DONE)

func _save_postcard() -> void:
	var img: Image = null
	if DisplayServer.get_name() != "headless":
		img = get_viewport().get_texture().get_image()
	if img == null or img.is_empty():
		print("Postcard: no framebuffer (headless). Skipped image save.")
		return
	DirAccess.make_dir_recursive_absolute("user://postcards")
	var path := "user://postcards/day1_%d.png" % Time.get_unix_time_from_system()
	img.save_png(path)
	print("Postcard saved: ", ProjectSettings.globalize_path(path))

func _respawn() -> void:
	player.velocity = Vector3.ZERO
	player.ladder = null
	player.global_position = checkpoint

func _show_note(t: String) -> void:
	note_lbl.text = t
	print("MAP NOTE: ", t)

# ---------------------------------------------------------------- UI
func _build_ui() -> void:
	ui = CanvasLayer.new()
	add_child(ui)
	var top := VBoxContainer.new()
	top.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top.offset_left = 24
	top.offset_right = -24
	top.offset_top = 24
	ui.add_child(top)
	timer_lbl = _label(top, 22, C_CREAM)
	timer_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	objective_lbl = _label(top, 30, C_CREAM)
	note_lbl = _label(top, 24, C_GOLD)
	prompt_lbl = Label.new()
	prompt_lbl.add_theme_font_size_override("font_size", 32)
	prompt_lbl.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	prompt_lbl.offset_top = -160
	prompt_lbl.offset_left = -200
	prompt_lbl.offset_right = 200
	prompt_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ui.add_child(prompt_lbl)

	name_box = PanelContainer.new()
	name_box.set_anchors_preset(Control.PRESET_CENTER)
	name_box.offset_left = -260
	name_box.offset_right = 260
	name_box.offset_top = -80
	name_box.offset_bottom = 80
	var v := VBoxContainer.new()
	name_box.add_child(v)
	_label(v, 26, C_CREAM).text = "Name your cart, then press Enter."
	name_edit = LineEdit.new()
	name_edit.max_length = 24
	name_edit.placeholder_text = "First Slice"
	name_edit.add_theme_font_size_override("font_size", 30)
	name_edit.text_submitted.connect(_confirm_name)
	v.add_child(name_edit)
	name_box.visible = false
	ui.add_child(name_box)

	postcard_panel = PanelContainer.new()
	postcard_panel.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	postcard_panel.offset_left = -300
	postcard_panel.offset_right = 300
	postcard_panel.offset_top = -340
	postcard_panel.offset_bottom = -200
	var sb := StyleBoxFlat.new()
	sb.bg_color = C_CREAM
	sb.border_color = C_BRICK
	sb.set_border_width_all(6)
	sb.set_content_margin_all(18)
	postcard_panel.add_theme_stylebox_override("panel", sb)
	postcard_lbl = _label(postcard_panel, 26, Color("3A3440"))
	postcard_panel.visible = false
	ui.add_child(postcard_panel)

func _label(parent: Node, size: int, color: Color) -> Label:
	var l := Label.new()
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.6))
	l.add_theme_constant_override("outline_size", 6)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	parent.add_child(l)
	return l

# ---------------------------------------------------------------- headless autotest
## Run: godot --headless --path greybox-godot -- --autotest
## Walks the real path with physics: moves the player, presses interact, climbs.
func _run_autotest() -> void:
	var fails := []
	var check := func(ok: bool, what: String):
		print(("PASS " if ok else "FAIL ") + what)
		if not ok: fails.append(what)
	await _frames(30)
	check.call(player.is_on_floor(), "player stands on the sidewalk")
	await _walk_to(Vector3(-27.8, 0, 6.6))
	_try_interact()
	check.call(step == Step.ENTER_BODEGA, "Rosa greeting advances flow")
	await _walk_to(Vector3(-16, 0, 7.0))
	await _walk_to(Vector3(-16, 0, 12.0))
	check.call(step == Step.COLLECT and not bodega_roof.visible, "enter bodega: roof hides, collect step")
	for x in [-18.0, -16.0, -14.0]:
		await _walk_to(Vector3(x, 0, 18.3))
		_try_interact()
	check.call(step == Step.RUSH, "3 shelf items collected")
	await _walk_to(Vector3(-18.0, 0, 13.0))
	for i in 5:
		_try_interact()
		await _frames(2)
	check.call(step == Step.CROSS and rush_served == 5, "5-order rush served")
	await _walk_to(Vector3(-16, 0, 6.0))
	await _walk_to(Vector3(-5, 0, 5.0))
	await _walk_to(Vector3(-5, 0, -5.0))
	check.call(step == Step.CLAIM_CART, "crosswalk trigger fires")
	await _walk_to(Vector3(4, 0, -5.2))
	_try_interact()
	check.call(name_box.visible and player.frozen, "cart claim opens name box and freezes walker")
	# Type with movement + interact keys in the name; none should leak to the walker.
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
	check.call(name_edit.text == "Wade's Spot", "name box keeps every letter (got '%s')" % name_edit.text)
	check.call(player.global_position.distance_to(before) < 0.05, "typing WASD/Space doesn't move the walker")
	_confirm_name(name_edit.text)
	check.call(step == Step.SOLO and cart_name == "Wade's Spot", "cart named")
	for i in 3:
		_try_interact()
		await _frames(2)
	check.call(step == Step.CLIMB and solo_served == 3, "3 solo serves incl. Mr. Idris")
	await _walk_to(Vector3(9.4, 0, -7.2))
	check.call(player.ladder != null, "grabbed ladder 1")
	check.call(dusk_started, "dusk starts at the fire escape")
	await _hold("move_fwd", 2.2)
	await _hold("move_right", 0.6)   # camera faces south here, so right = +x
	await _frames(20)
	check.call(player.global_position.y > 3.9 and player.is_on_floor(), "standing on landing 1 (y=%.2f)" % player.global_position.y)
	await _walk_to(Vector3(15.8, player.global_position.y, -7.2))
	check.call(player.ladder != null, "grabbed ladder 2 (pos=%s)" % player.global_position)
	await _hold("move_fwd", 2.2)
	await _hold("move_left", 0.9)
	await _frames(20)
	check.call(player.global_position.y > 7.9, "reached landing 2 (y=%.2f)" % player.global_position.y)
	await get_tree().create_timer(6.5).timeout
	check.call(step == Step.DONE and postcard_panel.visible, "gold window + Postcard compose")
	check.call(gold_mat.emission_energy_multiplier > 3.0, "gold window holds lit")
	print("AUTOTEST %s: %d failures, sim time %.1fs" % ["OK" if fails.is_empty() else "FAILED", fails.size(), elapsed])
	get_tree().quit(0 if fails.is_empty() else 1)

func _frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame

func _hold(action: String, secs: float) -> void:
	Input.action_press(action)
	await get_tree().create_timer(secs).timeout
	Input.action_release(action)

## Steer with real input actions toward a point (camera-relative), up to 12 s.
func _walk_to(target: Vector3) -> void:
	var t := 0.0
	while t < 12.0:
		var to := Vector2(target.x - player.global_position.x, target.z - player.global_position.z)
		if to.length() < 0.35:
			break
		var fwd := Vector2(sin(cam_yaw), cos(cam_yaw))
		var right := Vector2(-cos(cam_yaw), sin(cam_yaw))
		var d := to.normalized()
		var f := d.dot(fwd)
		var r := d.dot(right)
		for a in ["move_fwd", "move_back", "move_left", "move_right"]:
			Input.action_release(a)
		if f > 0.2: Input.action_press("move_fwd", f)
		elif f < -0.2: Input.action_press("move_back", -f)
		if r > 0.2: Input.action_press("move_right", r)
		elif r < -0.2: Input.action_press("move_left", -r)
		await get_tree().physics_frame
		t += get_physics_process_delta_time()
	for a in ["move_fwd", "move_back", "move_left", "move_right"]:
		Input.action_release(a)
	await _frames(3)
