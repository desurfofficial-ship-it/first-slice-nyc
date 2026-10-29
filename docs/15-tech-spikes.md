# FIRST SLICE — Tech Spikes (Phase 0 / Early Phase 1)

**Purpose:** De-risk the two most important technical systems before full production begins.  
A spike is a short, time-boxed investigation that produces a working proof (or a clear “this is harder than expected” report). Spikes are not production code.

**Engine assumption:** Unity 6 LTS + URP (as decided in Doc 06).

---

## Spike Overview

| ID | Spike | Priority | Time Box | Owner suggestion |
|----|-------|----------|----------|------------------|
| TS-01 | Postcard Capture Pipeline | Critical | 3–4 days | Tools / Gameplay Engineer |
| TS-02 | Vertical-First Camera Rig | Critical | 2 days | Gameplay Engineer |
| TS-03 | Baked GI + Performance Budget | High | 2–3 days | Tech Artist |
| TS-04 | Yarn → Map Notes Pipeline | Medium | 1–2 days | Gameplay + Narrative |

---

## TS-01 — Postcard Capture Pipeline

### Goal
Prove we can go from a moment in the 3D world to a shareable image on a real device with minimal friction.

### Required Proof
1. Trigger a “postcard moment” in a test scene.
2. Camera moves to a pre-authored framing (or uses a dedicated postcard camera).
3. Render the view to a texture / PNG.
4. Composite a simple paper-style frame + caption text.
5. Save locally and open the native share sheet on both iOS and Android.
6. The shared image should look intentional (not a raw screenshot).

### Success Criteria
- [ ] Works on at least one iOS device and one Android device
- [ ] Total time from trigger to share sheet ≤ 1.5 seconds on mid-range hardware
- [ ] Output is vertical (or correctly letterboxed) and matches the postcard intention from Styleframe C
- [ ] Caption text is readable
- [ ] No major visual artifacts (bloom, UI, debug overlays leaking in)
- [ ] Clear notes on what will be needed for the full VS-F05 implementation

### Out of Scope for the Spike
- Final deckled border art
- Full album UI
- Cloud upload or deep links
- Multiple postcard templates

### Risks to Investigate
- Render texture cost and resolution choices
- UI vs world-space text for captions
- Platform differences in native share sheets
- HDR / post-processing interactions with the capture

### Results — greybox spike (played, Godot 4.7.2)

Proven on the Doc 19 greybox under Xvfb + Mesa llvmpipe. Not a device, not Unity — every conclusion below still transfers; device numbers stay open.

- **Pipeline works end to end:** play the real day to the gold-window moment → 2 s glide → 768×1160 offscreen render (HUD never in it) → pixel-variance check → paper frame + caption composite → 768×1344 PNG. Artifact: `assets/greybox-day1/postcard_day1.png`.
- **trigger→png measured 2.8 s on llvmpipe.** Device target 1.5 s `[TBD — owner: next spike on real hardware]`.
- **Three lessons the hard way:** (1) reparenting a live Camera3D into a SubViewport errors and grays the capture — the capture camera must be *born inside* the viewport; (2) `is_empty()` passes a uniform gray frame — check pixel variance on a fixed grid; (3) capture after the 6 s dusk tween, or the sky is still moving.
- Spike script: `greybox-godot/spikes/ts01_postcard.gd`. Raw log: `greybox-godot/spikes/logs/ts01_log.jsonl`.
- Still device-only: native share sheet, real cost, HDR interactions.

---

## TS-02 — Vertical-First Camera Rig

### Goal
Prove the game can feel good in vertical orientation and still support the cozy 3/4 gameplay view.

### Required Proof
1. A playable test scene that runs comfortably in 9:16.
2. Camera supports:
   - Default cozy 3/4 gameplay view
   - Smooth transition into Postcard Mode framing
   - Optional light player-controlled rotate / pinch (even if rough)
3. Clear decision on how we handle safe areas and UI in vertical.

### Success Criteria
- [ ] Gameplay camera feels stable and readable in 9:16 on a phone
- [ ] Postcard transition feels intentional (not a hard cut)
- [ ] No critical gameplay information is lost at the edges on common aspect ratios
- [ ] Written recommendation for the production camera system (single camera vs multiple, cinemachine usage, etc.)

### Out of Scope
- Final polish and feeling of every transition
- Full photo mode
- Complex cinematic timelines

### Results — greybox spike (played, Godot 4.7.2)

One Camera3D, three poses (FOLLOW / LOOK / POSTCARD), 2 s sine blends between all of them. Measured at 720×1280:

- **Vertical-first holds.** FOLLOW with orbit ±1.4 rad and a dolly sweep keeps the player inside frame with a worst-case edge margin of **359 px**. LOOK (tight, orbitable) drops that to **170 px** — closer framing costs margin; fine, but watch it.
- **The postcard transition is a move, not a cut.** LOOK→POSTCARD blend peaks at **0.17 u/frame**; the hard cut it replaces is **12.96 u**. Same story FOLLOW→LOOK (0.07 u/frame).
- **The rig can park outside the wall.** POSTCARD pose sits at z = −7.6, in front of the south wall face (z = −8) — the fix for Doc 20's finding 1. Player is out of the frame on purpose; the lit window lands dead-center (360, 640).
- **Recommendation:** one camera, pose-blended, 2 s sine. No second camera, no cuts, no cinemachine-style rig stack. Park postcard rigs in open air and keep the player behind the lens. Fix the crosswalk yaw flip before production (Doc 20, finding 4) — it is the only place the game still hard-snaps.
- Spike script: `greybox-godot/spikes/ts02_vertical_camera.gd`.

---

## TS-03 — Baked GI + Performance Budget

### Goal
Confirm we can hit the visual targets from the styleframes while staying inside the performance budgets defined in Doc 07.

### Required Proof
1. A small greybox or early art scene using:
   - 1 realtime key light
   - Baked GI
   - Emissive windows / signs
2. Run on a representative mid-low device (or profiled equivalent).
3. Measure against the budgets in Doc 07 (frame rate, draw calls, memory, thermal).

### Success Criteria
- [ ] Scene holds 60 fps (or 30 fps floor on low end) with the target lighting approach
- [ ] Draw calls and visible tris are in a comfortable range
- [ ] Clear list of what is cheap vs expensive in our art style
- [ ] Recommendation for lighting & baking workflow going forward

### Key Budgets (from Doc 07)
- 60 fps on iPhone 11 / SE 3 class
- 30 fps floor on Galaxy A14 class
- < 120k visible tris typical street
- < 150 draw calls typical
- < 1.2 GB peak memory

---

## TS-04 — Yarn → Map Notes Pipeline

### Goal
Prove that narrative content (especially Map notes) can be authored by a writer and appear in-game without engineer intervention for every line.

### Required Proof
1. A Yarn (or equivalent) file containing several Map notes and simple triggers.
2. Runtime system that can:
   - Listen for simple game events (e.g. “taught_regular_coffee”)
   - Unlock and display the corresponding note on the Map paper surface
3. At least one note appears with a simple “writing” feel (even if just fade or typewriter).

### Success Criteria
- [ ] Writer can add a new note by editing content only
- [ ] Notes unlock from game events
- [ ] Map surface can show at least 3–4 notes without breaking layout
- [ ] Clear handoff process documented between Narrative and Engineering

### Out of Scope
- Final handwriting font and animation
- Full collection / margin system
- Localization

---

## Spike Process Rules

1. Time-box strictly. When the time is up, stop and write the report.
2. The deliverable is a short written report + a playable proof (or a clear failure report).
3. Prefer the simplest thing that answers the risk question.
4. Spike code may be throwaway. Do not over-engineer.
5. Update this document (or the worklog) with results and decisions.

---

## Recommended Order

1. **TS-02** (Camera) — unblocks how we even look at the world
2. **TS-01** (Postcard Capture) — the product’s signature system
3. **TS-03** (Performance) — can run in parallel with early greybox
4. **TS-04** (Yarn → Map) — can follow once basic gameplay events exist

---

*Spikes exist to buy certainty. Run them before the cost of being wrong gets high.*
