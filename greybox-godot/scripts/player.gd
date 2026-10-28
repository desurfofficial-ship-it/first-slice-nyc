extends CharacterBody3D
## Greybox walker. Origin sits at the feet.

const SPEED := 4.2
const GRAVITY := 18.0
const CLIMB_SPEED := 2.6

var cam_yaw := 0.0          # set by main; movement is camera-relative
var frozen := false         # true while typing a cart name or in the Postcard
var ladder: Area3D = null   # the ladder we are holding, if any
var ladder_top := 0.0

func _physics_process(delta: float) -> void:
	var input := Vector2.ZERO
	if not frozen:
		input = Input.get_vector("move_left", "move_right", "move_back", "move_fwd")
	var fwd := Vector3(sin(cam_yaw), 0, cos(cam_yaw))      # camera looks along +z at yaw 0
	var right := Vector3(-cos(cam_yaw), 0, sin(cam_yaw))
	if ladder:
		# Forward/back climb. Left/right steps off sideways.
		velocity = right * input.x * SPEED * 0.8
		velocity.y = input.y * CLIMB_SPEED
		if input.y != 0.0:
			var c := ladder.global_position
			global_position.x = move_toward(global_position.x, c.x, delta * 2.0)
			global_position.z = move_toward(global_position.z, c.z + 0.55, delta * 2.0)
		if global_position.y >= ladder_top and velocity.y > 0.0:
			velocity.y = 0.0
	else:
		var dir := (fwd * input.y + right * input.x)
		velocity.x = dir.x * SPEED
		velocity.z = dir.z * SPEED
		if not is_on_floor():
			velocity.y -= GRAVITY * delta
		else:
			velocity.y = -0.5
		if dir.length() > 0.1:
			rotation.y = lerp_angle(rotation.y, atan2(dir.x, dir.z), delta * 10.0)
	move_and_slide()
