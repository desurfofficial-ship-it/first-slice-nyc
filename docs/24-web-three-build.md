# FIRST SLICE — Three.js Build Notes (web-three/)

**Date:** 2026-10-29
**Status:** Day 1 + Day 2 playable in the browser. Audit → port → verified.
**Companion to:** [Doc 23 — migration audit & plan](23-threejs-migration-audit.md)

---

## 1. What this is

`web-three/` is the browser implementation of the greybox — same Day 1 path,
same Day 2, same seams closed, same text, same money. The Godot greybox is
untouched and stays the behavior oracle. Where the two disagree, the docs and
the oracle win — except for two recorded fixes (§5).

**History note (2026-10-29):** an independent partial M1–M3 port was pushed to
`main` in parallel with this one (different file layout, no tests). The merge
commit `18bfb09` kept the verified implementation for every overlapping path
and dropped the draft's orphaned sources — they remain recoverable in git
history under `origin/main`.

## 2. Stack

| Choice | Why |
|---|---|
| Three.js r186 + TypeScript + Vite 8 | Doc 23 §6 target. No engine on top. |
| No physics library | The greybox world is axis-aligned boxes; a capsule-vs-AABB solver (substepped, with depenetration) is smaller and testable. |
| HTML/CSS overlay UI | Doc 04 §6 — bodega-shelf UI, not in-world text. |
| localStorage save | save.gd's rules, same JSON fields. |

## 3. Evidence (commands actually run)

| Command | Result |
|---|---|
| `npm run typecheck` | clean (strict TS) |
| `npm test` (vitest) | **44 passed** — save rules, full state-machine journey, relevance matrix, captions, collision contract |
| `npm run build` | clean; 154 KB gzipped total |
| `node scripts/e2e.mjs` | **AUTOTEST OK: 0 failures, ~110 s, no console errors** — headless Chromium plays the real Day 1 + Day 2 with real physics and input: 44 checks mirroring the Godot headless autotest, including the three Doc 21 seams, the money math ($87→$112; Idris +$2; delivery +$3; awning −$15; lunch 3×$3 = $111), and the save file |
| `node scripts/visual-check.mjs` | screenshots at spawn / bodega / cart-named / dusk / postcard; **postcard PNG valid (768×1344, real PNG signature)**; touch UI present on a 390×844 mobile viewport |

Run them yourself:

```bash
cd web-three
npm install
npm run dev            # play at http://localhost:5173
npm run build          # production build to dist/
npm test               # unit tests
npm run build && node scripts/e2e.mjs          # full in-browser autotest
npm run build && node scripts/visual-check.mjs # screenshot evidence
```

`?autotest=1` on any running build drives the whole two days by itself.

## 4. What was reused from Godot

Everything behavioral; nothing binary.

| From | Into |
|---|---|
| `main.gd` dimensions, positions, timings | `World.ts`, `Game.ts` — the world is the oracle's exact numbers |
| `player.gd` constants | `Player.ts` (speed 4.2, gravity 18, climb 2.6) |
| `save.gd` rules + fields | `Save.ts` (localStorage instead of `user://`) |
| Doc 02 / Doc 08 / Doc 22 text | `content.ts` verbatim |
| Doc 04 palette | `palette.ts` |
| TS-01 capture rig (fov 55, 768×1160, glide, born-inside camera, variance check) | `PostcardCapture.ts` + the reach-top sequence |
| TS-02 vertical camera (one camera, pose blends) | `GameCamera.ts` (KEEP_WIDTH counterpart) |
| Doc 21 seams | encoded as autotest checks |

Styleframes (Doc 14) remain the visual north star; the greybox frames and
`postcard_day1.png` were used as composition references during the visual pass.

## 5. Two recorded fixes (documented, deliberate)

1. **Day 2 postcard money.** The reference never updates `day_start_money`
   when Day 2 begins, so its Day 2 postcard would read "$87 → $111". Doc 22
   states the intended math: "$112 → $111". The web save adds
   `day_start_money` (backward-compatible) and the port uses Doc 22's math.
2. **Wall scrape.** The first collision solver could trap the walker against a
   long wall face (circle touching a box it spans along the move axis). Fixed
   with entry-snapshot pre-overlap detection + a depenetration pass; locked by
   a regression test ("walking parallel to a long wall never sticks").

## 6. Honest limits (not verified here)

- **Touch was checked in a 390×844 emulated viewport only.** No physical
  device was available in this environment. Frame pacing on real phones is
  unverified — the doc 07 device targets (60 fps mid-tier) remain open.
- **Audio:** none (matches the greybox; nothing to migrate).
- **Fonts:** postcard captions fall back to system handwriting fonts; the
  licensed font from Doc 07's TBD-4 would replace them.
- **Godot autotest baseline** is quoted from the repo records (0 failures /
  44 checks); Godot is not installed on the machine that built web-three.
- Frame rate was measured only in SwiftShader (software GL); a real GPU run
  is trivially lighter than this and unmeasured.

## 7. Controls

| Desktop | Action |
|---|---|
| WASD / arrows | walk (camera-relative) |
| W/S on a ladder | climb · A/D step off sideways |
| Space / E | interact (Rosa, shelf, counter, cart, rail) |
| Z / C | turn camera |
| R | restart the day (save rules decide what resumes) |
| G | debug: force dusk + gold window |

Touch: left-half virtual joystick, ● interact button, ⟲/⟳ camera turn.

## 8. Files

```
web-three/
├── index.html                  # overlay UI shell
├── src/
│   ├── core/                   # palette · content · GameState · Save
│   ├── engine/                 # Input · collide · tweens
│   ├── world/                  # World.ts (the block)
│   ├── player/ · camera/       # walker + cozy 3/4 rig
│   ├── game/                   # Game.ts orchestrator · autotest.ts
│   ├── ui/ · postcard/         # HUD panels · capture pipeline
│   └── main.ts · style.css
├── tests/                      # vitest unit suites
└── scripts/                    # e2e.mjs · visual-check.mjs
```

## 9. Deployment — GitHub Pages

The browser build ships as the repo's GitHub Pages site:

**https://desurfofficial-ship-it.github.io/first-slice-nyc/**

| Piece | Choice |
|---|---|
| Trigger | push to `main` (plus manual `workflow_dispatch`) |
| Workflow | [.github/workflows/deploy-pages.yml](../.github/workflows/deploy-pages.yml) |
| Gate | typecheck + 44 unit tests must pass before the build |
| Artifact | `web-three/dist` → `actions/upload-pages-artifact` → `actions/deploy-pages@v4` |
| Subpath | Vite `base: './'` (relative) — the game is procedural geometry with no runtime asset fetches, so it sits cleanly under `/first-slice-nyc/` |
| Pages mode | `build_type: workflow` (switched from the legacy root build, which served an empty index) |

CI runs unit tests only; the full browser E2E (`scripts/e2e.mjs`, ~110 s of
real Day 1 + Day 2 play) stays a local pre-push gate because it needs
headless Chromium. The vite build uses relative asset URLs, so the same
`dist/` works from any subpath.

*Godot remains the reference implementation. `greybox-godot/` is unmodified
by this migration.*
