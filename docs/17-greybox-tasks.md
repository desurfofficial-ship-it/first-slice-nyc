# FIRST SLICE — Greybox Task Breakdown

**Goal:** Produce a playable 12–15 minute Day 1 loop in pure greybox that already delivers the first postcard and the first gold window.

**Reference docs:**
- Layout: [Doc 10](10-day1-greybox-layout.md)
- Day 1 script: [Doc 02](02-first-session-walkthrough.md)
- Content: [Doc 08](08-day1-content-pack.md)
- Style targets: [Doc 14](14-styleframe-lock.md)

---

## Sprint Goal

A first-time player can complete this path without hand-holding:

Arrival → Rosa’s Bodega → First Rush → Street → Corner + Cart → Fire Escape → Gold Window → Postcard

---

## Task List

### 1. Project & Scene Setup
- [ ] Create Unity project (Unity 6 LTS + URP) or open existing
- [ ] Create scene: `Day1_Greybox`
- [ ] Set up basic vertical-friendly camera (even if rough)
- [ ] Add simple player controller (walk + look / rotate)
- [ ] Basic lighting (single directional light, warm tint)

### 2. Blockout – Street & Buildings
- [ ] Lay out the main street (two sidewalks + road)
- [ ] Block left and right building facades (simple scaled cubes are fine)
- [ ] Add crosswalk marking
- [ ] Place manhole + temporary steam (particle or scaled primitive)
- [ ] Place fire hydrant near player corner
- [ ] Leave a clear “empty corner” rectangle for the cart

### 3. Rosa’s Bodega
- [ ] Extrude or place a narrow interior space
- [ ] Counter along one long wall
- [ ] Back shelf / interactable zone for 3 items
- [ ] Front door connection to street
- [ ] Simple window that can receive light

### 4. Player Corner & Cart
- [ ] Define cart spawn / placement point
- [ ] Placeholder cart mesh (box + awning primitive is enough)
- [ ] Simple interaction to “place / claim” the cart
- [ ] Temporary naming input (even a debug text field is fine)

### 5. Fire Escape & Viewpoint
- [ ] Build climbable fire escape (ladder + 1–2 landings)
- [ ] Top landing large enough for the player to stand
- [ ] Opposite building facade with one special window
- [ ] Simple skyline card or distant blocks for depth

### 6. Subway Spur (Minimal)
- [ ] Stair entrance on the block
- [ ] Short corridor + small platform
- [ ] Ability to go down and come back up
- [ ] (Optional for first greybox) skip full train; just the space is enough

### 7. Core Interactions (Greybox Level)
- [ ] 3 serve interactions at the bodega (button or trigger based)
- [ ] Ability to pick up / “deliver” the three tutorial items
- [ ] Cart naming moment
- [ ] 2–3 solo serve interactions at the player cart
- [ ] Trigger for dusk lighting change
- [ ] Trigger for single gold window (emissive or material swap)
- [ ] At least one postcard capture point (even if it just screenshots or saves a view)

### 8. Flow & Polish for Playtest
- [ ] Invisible walls / kill volume so players can’t fall out of the world
- [ ] Simple checkpoints or soft guidance (arrows, lights, or Rosa voice lines as placeholders)
- [ ] Ability to restart the day quickly
- [ ] Basic audio placeholders (footsteps, one ambient loop, key jingle stub)

### 9. Internal Playtest
- [ ] 5 people play the full path
- [ ] Record whether they smile or react at the gold window / postcard moment
- [ ] Note any confusion points in the flow
- [ ] Decide go / iterate

---

## Definition of Done (Greybox)

- [ ] Full path is completable in ≤ 15 minutes by a new player
- [ ] No softlocks or falls out of world
- [ ] Gold window moment triggers reliably
- [ ] A postcard (or clear stand-in) is produced at the end
- [ ] At least 4 out of 5 internal testers have a positive emotional reaction at the end

---

## What Not to Do in Greybox

- Final materials or textures
- Final character models (capsules are fine)
- Full dialogue system
- Real Map UI (placeholder text is enough)
- Multiple districts or extra content
- Optimization passes beyond “it runs”

---

## Suggested Order of Work

1. Scene + player controller + camera
2. Street + corner + cart placeholder
3. Bodega interior
4. Fire escape + gold window
5. Basic interactions
6. Flow test with one other person
7. Iterate, then wider internal playtest

---

*Build only what is on this list. When the postcard moment lands, the greybox has done its job.*
