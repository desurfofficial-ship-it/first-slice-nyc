# FIRST SLICE — Day 1 Greybox Layout Spec

**Purpose:** Define the single playable block required for Phase 0 / Vertical Slice so greybox work can begin immediately.  
**Target:** A 12–15 minute loop that already delivers the first postcard and the first gold window.

---

## 1. Block Overview

One continuous, self-contained New York block that supports the entire Day 1 script from Doc 02.

```
[Bus Terminal Exit] → [Sidewalk] → [Rosa’s Bodega] → [Street Crossing] → [Player Corner + Cart] → [Fire Escape Access] → [Skyline Viewpoint]
```

Optional short spur for the Subway University moment (can be a simple underground corridor + platform that returns to the same block).

---

## 2. Required Spaces

### A. Arrival Sidewalk / Terminal Edge
- Simple exterior wall + door (bus terminal).
- Enough sidewalk for the upside-down Map beat with Rosa.
- Clear sightline to the bodega entrance.

### B. Rosa’s Bodega (Interior)
- Narrow, deep rectangular interior.
- Counter on the long side.
- Back area with shelves (mangos, coffee can, bread — the three tutorial items).
- Front window that can catch golden light.
- Door that leads back to the street.
- Enough space for 5 customers during the first rush without feeling empty or cramped.

### C. The Street
- Two-lane street with sidewalks on both sides.
- Crosswalk (for The Shuffle teaching moment).
- One yellow taxi path (can be a simple looping or triggered drive-by).
- Manhole with steam.
- Fire hydrant near the player corner.
- Simple lowpoly building facades on both sides (brick language from styleframe A).

### D. Player Corner
- Distinct rectangle of sidewalk that feels “empty but waiting.”
- Space for the cart (named later).
- Clear view of the skyline or at least one tall building crown.
- Adjacent building with accessible fire escape.

### E. Fire Escape + Viewpoint
- Climbable fire escape (simple ladder + 1–2 landings).
- Top landing large enough for the player to stand with a cup and look out.
- Clear view of at least one building facade that can show the single gold window.
- Distant skyline silhouette (can be a simple card or low-poly set dressing).

### F. Subway Spur (Minimal)
- Stair entrance on the block.
- Short corridor → small platform.
- One train car or simple door that “arrives.”
- Ability to return to the street after the Priya teaching moment.
- Does not need full station complexity for greybox.

---

## 3. Playable Path (Greybox Acceptance)

The greybox must support this exact sequence without loading screens between major beats:

1. Exit terminal → meet Rosa → enter bodega
2. Collect 3 items in back → first rush (3–5 simple serve interactions)
3. Leave bodega → street walk / Shuffle across crosswalk
4. (Optional spur) Subway stairs → short ride beat → return
5. Arrive at empty corner → place/name cart
6. Short solo serve (2–3 customers) including Mr. Idris
7. Climb fire escape → dusk lighting change → gold window triggers → postcard composes

**Time target:** 12–15 minutes for a first-time player in pure greybox.

---

## 4. Camera & Framing Notes

- Default gameplay camera: cozy 3/4, slightly low, vertical-friendly.
- Postcard trigger points must have pre-authored camera rigs:
  - Times Square / Wow moment (can be a temporary vista or billboard wall for greybox)
  - Water towers / looking-up moment
  - Final fire-escape dusk shot (this is the most important)
- Fire-escape landing must allow a stable, beautiful framed view of the gold window.

---

## 5. Lighting States Required

| State | When | Notes |
|-------|------|-------|
| Late afternoon / golden hour | Most of Day 1 | Default. Match styleframe A warmth. |
| Dusk transition | After cart naming / during fire-escape climb | Sky shifts toward plum. |
| Single gold window | Final moment | One emissive window turns on with flicker-then-hold. |

---

## 6. Greybox Prop Checklist (Minimum)

- Cart (placeholder)
- Bodega counter + 3 interactable shelf items
- Yellow taxi (simple moving or static)
- Manhole + steam emitter
- Fire hydrant
- Crosswalk markings
- Fire escape (climbable)
- One window that can become the gold window
- Simple skyline card or block-in
- Map object (can be UI only for greybox)

---

## 7. What “Done” Looks Like for P0-2

- [ ] Player can walk the full path above without falling through the world
- [ ] 3 serve interactions work at the bodega (even if just button prompts)
- [ ] Cart can be placed and named
- [ ] Fire escape is climbable
- [ ] Dusk lighting + single gold window can be triggered
- [ ] A postcard capture point exists and can be screenshot
- [ ] 5 internal people play it and at least 4 of them smile or react positively at the final postcard / gold window moment

---

## 8. Out of Scope for Greybox

- Final art or materials
- Full character models (capsules or simple lowpoly mannequins are fine)
- Real dialogue system (placeholder text is acceptable)
- Multiple districts or open exploration
- Any systems beyond the single Day 1 path

---

*This document is the contract for the greybox. Build only what is listed. If the postcard lands here, the game works.*
