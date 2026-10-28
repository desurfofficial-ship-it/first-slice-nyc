# FIRST SLICE — Greybox First-Build Guide

**Goal of this document:** Get a minimum playable Day 1 greybox standing as quickly as possible.  
This is the practical companion to [Doc 17 – Greybox Tasks](17-greybox-tasks.md).

**Target for first working session:** Player can walk from a start point → into a bodega space → out to a corner → up a fire escape → trigger a gold window.

---

## 1. Project Setup (30–45 min)

1. Create or open a **Unity 6 LTS** project using **URP**.
2. Create this folder structure under `Assets/`:

```
Assets/
├── _Project/
│   ├── Scenes/
│   ├── Art/
│   │   └── Greybox/
│   ├── Prefabs/
│   ├── Scripts/
│   └── Materials/
└── ...
```

3. Create a new scene: `Assets/_Project/Scenes/Day1_Greybox.unity`
4. Save the scene.

### Recommended starting objects
- Directional Light (warm tint, roughly matching golden-hour)
- Plane or stretched cube as ground
- Basic player (Capsule + simple controller is fine)

---

## 2. Suggested Hierarchy

Keep the hierarchy clean from the start:

```
Day1_Greybox
├── --SETUP--
│   ├── Directional Light
│   ├── Global Volume (optional)
│   └── Post Processing (optional)
├── --PLAYER--
│   └── Player
├── --LEVEL--
│   ├── Street
│   ├── Buildings_Left
│   ├── Buildings_Right
│   ├── Bodega
│   ├── PlayerCorner
│   ├── FireEscape
│   └── SkylineCard
├── --INTERACTABLES--
│   ├── CartPlaceholder
│   ├── GoldWindow
│   └── ServePoints
└── --SYSTEMS--
    ├── GameFlow
    └── PostcardTrigger (later)
```

---

## 3. First Build Sequence (do in order)

### Step A — Ground and Street (quick)
- Create a wide ground plane.
- Mark a simple road + two sidewalks with differently scaled cubes or colored materials.
- Leave a clear open rectangle on one sidewalk for the player corner.

### Step B — Building Masses
- Block left and right sides of the street with simple scaled cubes.
- Don’t detail anything. Only massing matters.
- Leave a gap / opening for the bodega entrance.

### Step C — Bodega Volume
- Create a rectangular interior space.
- Add a counter (long cube).
- Add a back wall zone for the three tutorial items.
- Make sure the player can walk in and out easily.

### Step D — Player Corner + Cart
- Place a clearly marked empty area.
- Drop a simple cart placeholder (cube + thinner cube for awning is enough).
- Position it so the player can walk up to it naturally after leaving the bodega.

### Step E — Fire Escape
- Build a simple climbable structure against one building:
  - Vertical ladder pieces or stepped platforms
  - At least one landing the player can stand on
- Make sure the player can reach the top without falling through geometry.

### Step F — Gold Window
- On the building opposite the fire escape, mark one window.
- Give it a distinct emissive or brightly colored material so it can later “turn on.”
- Confirm it is clearly visible from the top of the fire escape.

---

## 4. Minimum Playable Path (First Milestone)

Get this working before adding more systems:

1. Player starts near a simple “terminal” or start marker.
2. Player walks into the bodega.
3. Player walks out to the corner and stands by the cart.
4. Player climbs the fire escape.
5. From the top, the gold window is visible.
6. (Optional for first session) Press a key to toggle the gold window on.

If this path works and feels readable, the foundation is good.

---

## 5. Temporary Controls (suggested)

For the very first greybox you only need:

- WASD / Left stick movement
- Mouse / right stick look (or a fixed cozy camera)
- Space / button to interact (can be a simple debug trigger at first)
- One debug key to force the gold window on

Do not build a full input system yet.

---

## 6. Materials (keep extremely simple)

Create only 4–5 temporary materials:

- `M_Greybox_Ground`
- `M_Greybox_Building`
- `M_Greybox_Accent` (for cart / important objects)
- `M_Greybox_Emissive` (for the gold window)
- `M_Greybox_Volume` (slightly different tone for interior)

Color them so spaces are readable. Final palette comes later.

---

## 7. What “First Session Done” Looks Like

At the end of your first real build session you should be able to say:

> “I can walk the core emotional path of Day 1 in greybox, and I can see where the gold window will land.”

That is enough progress for day one of greybox.

---

## 8. Next Sessions (after the first path works)

1. Add the three serve / interact points in the bodega.
2. Add cart naming (even a debug input field).
3. Add dusk lighting transition.
4. Add a crude postcard trigger (screenshot or render-to-texture later).
5. Bring in one other person for a flow test.

---

## 9. Rules While Greyboxing

- No final art.
- No complex systems.
- No new locations.
- If something is not required for the emotional path, defer it.
- Prefer “ugly but clear” over “pretty but incomplete.”

---

*Open Unity. Build the path. Make the window turn gold. Everything else can wait.*
