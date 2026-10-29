extends RefCounted
## FIRST SLICE save v1 — local JSON at user://save.json (Doc 07 §6 names local JSON).
## Pure logic, no scene dependencies, so headless autotests can hammer it.
## Rules:
##   * a corrupt or unreadable save is a fresh start, never a crash
##   * money is always a day-start or verified mid-day snapshot — no duplicate rewards
##   * day 1 never writes: the intro replays fresh by design (R = restart day)
##   * replay=true marks a kept final day being replayed: rewards rest, warmth doesn't

const PATH := "user://save.json"
const MAX_DAY := 2   # Day 3 is still being written (see docs/22-day2-greybox.md)

var day := 1
var day_complete := false
var replay := false
var cart_name := ""
var money := 87
var awning := false
var kid_kept := false
var idris_served := false
var lunch_served := 0

static func load_or_default() -> RefCounted:
	var s := RefCounted.new()
	s.set_script(load("res://scripts/save.gd"))
	if not FileAccess.file_exists(PATH):
		return s
	var f := FileAccess.open(PATH, FileAccess.READ)
	if f == null:
		return s
	var data: Variant = JSON.parse_string(f.get_as_text())
	if typeof(data) != TYPE_DICTIONARY:
		return s   # corrupt save: defaults, game still boots
	s.day = clampi(int(data.get("day", 1)), 1, MAX_DAY)
	s.day_complete = bool(data.get("day_complete", false))
	s.replay = bool(data.get("replay", false))
	s.cart_name = str(data.get("cart_name", ""))
	s.money = maxi(int(data.get("money", 87)), 0)
	s.awning = bool(data.get("awning", false))
	s.kid_kept = bool(data.get("kid_kept", false))
	s.idris_served = bool(data.get("idris_served", false))
	s.lunch_served = clampi(int(data.get("lunch_served", 0)), 0, 3)
	return s

func write() -> bool:
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f == null:
		return false
	f.store_line(JSON.stringify({
		"day": day,
		"day_complete": day_complete,
		"replay": replay,
		"cart_name": cart_name,
		"money": money,
		"awning": awning,
		"kid_kept": kid_kept,
		"idris_served": idris_served,
		"lunch_served": lunch_served,
	}))
	return true

static func wipe() -> void:
	if FileAccess.file_exists(PATH):
		DirAccess.remove_absolute(PATH)
