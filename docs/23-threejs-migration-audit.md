# FIRST SLICE — Three.js Migration Audit & Plan

**Date:** 2026-10-29  
**Status:** Phase 1 complete — audit only. No Three.js implementation started.  
**Source of truth for intended behavior:** Godot greybox (`greybox-godot/`) + design docs 01–22.

---

## 1. Repository Snapshot

| Area | State |
|------|--------|
| Design docs | Complete through Doc 22 (Day 2 greybox) |
| Styleframes | Locked (Doc 14) |
| Godot greybox | Playable Day 1 + Day 2 |
| Tech spikes | TS-01 (postcard) and TS-02 (vertical camera) proven |
| Synthetic playtests | 5 personas, seams found and partially fixed |
| Save system | v1 local JSON working |
| Three.js / web game | **Does not exist yet** |
| GitHub Pages site | Present under `/site` (marketing only) |

**Important:** There is no existing Three.js gameplay code. Migration means building a new implementation that matches the Godot reference and the design docs.

---

## 2. Godot Greybox — What Actually Works

Inspected: `greybox-godot/scripts/main.gd` (~56 KB), `player.gd`, `save.gd`, spikes, logs, README.

### Working (reference behavior)

| System | Evidence |
|--------|----------|
| Full Day 1 path | Terminal → Rosa → bodega (3 items + 5-order rush) → crosswalk → claim/name cart → 3 solo serves (Idris) → fire escape → dusk → gold window → postcard |
| Day 2 path | Idris return, Rosa favor, awning purchase, lunch rush, second window |
| Procedural world | Code-built street, sidewalks, buildings, bodega interior, fire escape, skyline card, bounds |
| Player controller | Camera-relative WASD, gravity, ladder climb (W/S), step-off sideways |
| Interaction | Range-based, Space/E, shelf items, counter, cart, Rosa |
| Progression state | Explicit `Step` enum; objectives update; no-fail design |
| Postcard pipeline | Real offscreen capture → paper frame + caption → PNG (`user://postcards/` and committed artifact) |
| Vertical camera | One Camera3D, pose blends (FOLLOW / LOOK / POSTCARD), 720×1280 |
| Save / load | Local JSON, corrupt-safe, day/money/awning/flags |
| Headless autotest | `--autotest` walks Day 1 + Day 2 (44 checks) |
| Synthetic playtest | 5 personas; seams 1–3 identified and partially mitigated |

### Incomplete / not in greybox

- Subway spur (explicitly optional in Doc 10)
- Touch / mobile controls
- Audio
- Final art / materials (greybox primitives only)
- Times Square / water-tower dedicated postcard rigs
- Full Map UI paper surface (notes exist as content, not full Map companion UI)
- Native mobile share sheet (spike was desktop/headless)

### Known seams (from Doc 21, later mitigated)

1. **Crosswalk trigger** — originally too narrow; fixed toward “reach south sidewalk”.
2. **Ladder leave** — no pull-back; mitigated with Rosa hint + re-grab support.
3. **End linger** — postcard used to hard-freeze; improved to allow linger / goodnight.

These must be preserved as *intended behavior* in the Three.js port.

---

## 3. Design Systems That Must Survive Migration

From GDD + Vertical Slice + Content Pack + Styleframe Lock:

**Non-negotiable fantasy**
- Player is a never-visitor.
- City teaches by kindness, not quizzes.
- Three verbs: Open · Notice · Sit (and the Day 1 path is the proof).
- Postcard is the product moment.
- Skyline of Lit Windows (one gold window on Day 1).

**Day 1 sequence (acceptance spine)**
1. Arrive at terminal  
2. Meet Rosa / enter bodega  
3. Collect 3 items + first rush  
4. Cross to corner, claim + name cart  
5. Serve including Mr. Idris  
6. Climb fire escape at dusk  
7. Gold window moment  
8. Receive first postcard (real composed PNG)

**Visual targets**
- Styleframe A = daytime + cart language  
- Styleframe B = dusk + gold window  
- Styleframe C = postcard framing / border  
- Palette from Doc 04 (taxi yellow, brick, teal, amber, cream, plum)

---

## 4. Reusable Assets

| Asset | Reusable in Three.js? | Notes |
|-------|------------------------|-------|
| Styleframe images | Yes (reference + marketing) | Not runtime meshes |
| Greybox capture frames | Yes (reference) | |
| `postcard_day1.png` | Yes (reference of output quality) | |
| Doc 08 Map notes + captions | Yes (copy as content data) | |
| Godot meshes / materials | **No** — procedural boxes only | Rebuild as Three.js primitives or glTF |
| Godot scripts | **Logic reference only** | Port behavior, not syntax |
| Audio | None present | |
| Character models | Capsule placeholders only | |

**Conclusion:** Almost everything visual must be rebuilt. Almost everything *behavioral* is specified by working Godot code + docs.

---

## 5. Environment & Delivery Constraints (this machine)

| Item | Value |
|------|--------|
| OS | Linux x86_64 |
| RAM | **1.2 GB** (very tight) |
| Display | Headless |
| Node | v24.15.0 |
| npm | 11.12.1 |
| Godot on this machine | Not installed (use other env / reference only) |

**Implications**
- Three.js + Vite is appropriate and lightweight.
- Prefer minimal dependencies.
- Visual editor work happens on a better machine; this environment is good for install, build, unit tests, and headless checks where possible.
- Do not attempt heavy Godot runs here.

---

## 6. Target Architecture (Three.js)

```
web-three/                    # separate from greybox-godot/
  package.json
  vite.config.ts
  index.html
  src/
    main.ts                   # boot
    game/
      Game.ts                 # loop, state machine owner
      Step.ts                 # Day 1 (and later Day 2) steps
      Save.ts                 # localStorage mirror of save.gd rules
    player/
      PlayerController.ts
    camera/
      GameCamera.ts           # FOLLOW / LOOK / POSTCARD poses
    world/
      Day1World.ts            # procedural block matching Doc 10
      materials.ts            # Doc 04 palette
    interact/
      InteractSystem.ts
    ui/
      HUD.ts, Dialogue.ts, PostcardUI.ts, NameCartUI.ts
    postcard/
      PostcardCapture.ts      # render target → canvas → PNG
    content/
      day1Notes.ts            # from Doc 08
      day1Captions.ts
    input/
      Input.ts                # keyboard + touch
  public/
    (optional static assets later)
```

**Stack**
- Three.js (r17x current stable)
- TypeScript
- Vite
- No full physics engine unless proven necessary (start with simple AABB / ray ground + capsule)
- HTML/CSS overlay UI (not Three.js UI kits)

**State rule:** Authoritative game state lives outside the scene graph. Renderer and UI only reflect it.

---

## 7. Risks Specific to Migration

| Risk | Mitigation |
|------|------------|
| Rebuilding a “pretty city” instead of Day 1 | Acceptance = complete Day 1 sequence only |
| Postcard becomes a fake button | Must render from live camera / RT like Godot spike |
| Movement feels floaty or clips | Port player.gd numbers first (speed 4.2, gravity 18, climb 2.6) |
| Scope creep into Day 2/3 | Day 1 complete + tested before Day 2 |
| RAM / perf on low devices | Low-poly primitives, few lights, dispose resources |
| Losing Godot reference mid-port | Keep `greybox-godot/` untouched until Three.js passes acceptance |
| Crosswalk / ladder / linger regressions | Encode Doc 21 seams as explicit tests |

---

## 8. Acceptance Criteria (Day 1 Three.js)

Must all pass before calling migration of Day 1 “done”:

1. Boot in browser with no critical console errors  
2. Player can complete the full Day 1 path listed in §3  
3. Interactions change real state (items, rush count, cart name, serves)  
4. Fire escape is climbable; dusk + gold window trigger  
5. Postcard export produces a **valid PNG** from the composed view  
6. Reload does not corrupt save (or Day 1 intentionally fresh, matching Godot rules)  
7. Keyboard controls work; touch controls present and usable  
8. Runs at acceptable framerate on a mid-range laptop browser  
9. Original Godot project still present and unmodified by the migration work  
10. Automated tests cover step transitions + save load/corrupt boot  

---

## 9. Implementation Stages (do in order)

| Stage | Deliverable | Exit check |
|-------|-------------|------------|
| **M0** | This audit (done) | Plan reviewed |
| **M1** | `web-three/` Vite + Three.js + TS boot, empty scene, resize — **DONE 2026-10-29**: `npm run build` clean (131 KB gzip), dev server browser-verified desktop + 390×844, zero console errors/page errors; boot-beacon render in both viewports | `npm run dev` works |
| **M2** | Day 1 world blockout + lights + palette | Recognizable street / bodega / corner / fire escape |
| **M3** | Player movement + camera + collision | Walk block without falling through; vertical framing |
| **M4** | Interact system + step machine (no full content) | Can trigger sequence of steps with debug UI |
| **M5** | Full Day 1 content path (Rosa → rush → cart → Idris → climb → gold) | Complete path playable |
| **M6** | Postcard capture PNG + basic HUD / name cart UI | Real PNG download/save |
| **M7** | Save rules, touch controls, regression tests, polish | Acceptance list §8 green |

Godot remains the behavior oracle until M7.

---

## 10. What Will Not Be Done in Early Stages

- Replacing or deleting `greybox-godot/`
- Day 2 port before Day 1 acceptance
- Full Map companion paper UI
- Final character art
- Audio
- Native mobile share sheet
- Multiplayer, accounts, or backend

---

## 11. Baseline (pre-migration)

- Godot headless autotest: reported **0 failures** on full Day 1+2 path (per project README / spike docs).
- Synthetic playtest seams documented and largely addressed in Godot.
- No Three.js tests exist yet (baseline = N/A).

---

## 12. Recommendation

Proceed to **M1** (project scaffolding only) after this audit is accepted.

Do not begin world or gameplay code until:
1. `web-three/` boots cleanly with Vite + Three.js + TypeScript  
2. Folder layout above is in place  
3. Godot tree remains untouched  

---

*Audit complete. Implementation has not started. Godot remains the reference implementation.*
