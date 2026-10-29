# Doc 29 — Day 4: "Say Hi"

*The Hospitality Law chapter. The endgame is not wealth or even belonging —
it's keeping the light on for the next stranger. Day 4 continues in
[Doc 30](30-day4-the-block-opens-up.md) — the afternoon opens the block.*

---

## 1. What Day 4 is

Three days built a corner. Day 4 asks what the corner is **for**.

A new stranger — a duffel bag, twelve dollars, a paper Map she holds like it
might change its mind — is standing by the bus terminal. The exact spot where
Rosa waved at you on Day 1. Rosa sees it first, because Rosa always sees it
first: *"You looked like that once. Go say hi. You know the words now."*

You make her a regular. On the house. Rosa's rule keeps the money honest —
*"On the house means YOU don't charge. It doesn't mean it's free"* — and two
dollars slide down your counter when nobody's looking. You give her the one
thing you own that isn't the cart: your Map. It's upside down. That part is
true. The kid, from his stool, teaches her the trains. She walks your first
walk — crosswalk, gaps, the other side — and the street takes over.

At dusk, from the fire escape, the **lamp next door** finally stays on. Day 2
planted it: *"The lamp next door flickers, thinks about it, and stays on
too."* Day 4 keeps the promise. Four windows. The Skyline of Lit Windows is
now a skyline of people someone kept.

| Beat | Step | What happens |
|---|---|---|
| Chapter open | `D4_WAKE` | Rosa at the cart: *"She has that look again."* The kid is already on his stool at sunrise — he lives at the corner now. |
| The terminal | `D4_STRANGER` | The Day-1 mirror walk, west, habitual. She stands where the story started, facing the street like you did. |
| The greeting | → `D4_RUSH` | The free regular; Rosa's $2; *"You say the thing Rosa said. It works. It still works."* The rush opens behind you — Idris first, like every day. |
| The morning rush | `D4_RUSH` | Three real orders (brew gate, bubbles, honest money): Idris *"Fourth day."*, her question from the sidewalk, the early shift: *"You're part of the commute now."* She watches the ORDER, not your hands — *"It was never Rosa's trick. It's the watching."* |
| The Map | `D4_MAP` | Gated on her **arrival** — she walks your first walk on her own feet (~48 m, crosswalk, the cab yields). Then the handoff, the kid's train fact, and she's gone west. Gone means gone: the corner does not own her. |
| Dusk | `D4_CLIMB4` | Same stairs, same seat, by habit. |
| Golden beat | `D4_POSTCARD` | The lamp next door flickers — *thinks about it* — and stays on. The kid waves from the stool. |
| Postcard | — | *"Day 4. $120 → $123. Met: her. The Map changed hands. Filed: the permit. The light stays."* |
| The wall | rail, 2nd press | Honest: *"Day 5 is still being written. The light stays a little longer."* |

**Money math (all honest, replay-resting):** $120 + Rosa's $2 + $11 rush
($3 + $4 + $4) = **$133 earned**. The afternoon (docs/30) then files the
vending-permit application — $10, confirm-gated, spent once — so the day
banks **$123**. The morning gives; the city takes its cut; both are true.

## 2. Continuity repair (found while building)

- **The kid was in two places at once.** Day 3's `beginDay` showed the window
  silhouette, and `kid-down` never darkened it — from the kid-down beat on,
  the kid stood at the stoop AND haunted the glass. Fixed: `showKidGround`
  turns the window silhouette off; on Day 4 he is simply on his stool at
  sunrise, never in the window.
- **The rail un-bought furniture.** `beginDay(sd = null)` — the rail's
  "Tomorrow" path — reset `stoolUp`. Harmless while only Day 3 followed a
  rail (the stool got bought later that day), a continuity bug the moment
  Day 4 began expecting its furniture. Fixed: permanent purchases carry
  forward; only a parsed save may set them.

## 3. Files

- `web-three/src/core/content.ts` — objectives 24–29, the chapter's notes,
  `D4_ORDERS` (3 orders), Day-4 captions (normal + replay), prompt verbs
- `web-three/src/core/GameState.ts` — steps 24–29 (`DONE` moves to 30),
  `mapGiven/strangerMet/strangerAtCart`, `rosaD4Wake/greetStranger/giveMap`,
  brew queue generalized (`rushIndex/brewing` serve both mornings),
  Rosa's Day-4 chat ladder, relevance map, snapshot + `map_given`
- `web-three/src/core/Save.ts` — `MAX_DAY = 4`, optional `map_given`
  (back-compat: pre-Day-4 saves parse unchanged, key unchanged)
- `web-three/src/world/World.ts` — the stranger (articulated, duffel bag,
  teal jacket), the fourth window + glow (the lamp next door, facade col 3)
- `web-three/src/game/Game.ts` — cast + interactable + routing,
  `showStranger`, the shared `walkActor` (Rosa-walk pattern, now reusable),
  her two real walks (arrival ~48 m, departure ~46 m, the cab yields to her),
  `goldenBeat4`, `placeDay4Cast`, beginDay Day-4 branch, customer bubbles
  read the right queue, `fourthIntensity` debug handle
- `web-three/tests/state-day4.test.ts` — **new**: 22 tests
- `web-three/tests/state-day3.test.ts`, `tests/save.test.ts` — MAX_DAY
  updates, round-trip + `map_given`
- `web-three/src/game/autotest.ts` — the full Day-4 E2E segment (below)
- `web-three/scripts/visual-d4.mjs` — **new**: evidence frames
- `web-three/assets/web-three/frames/d4_*.png` — 4 captures
- `README.md`, `site/index.html` — status says four days; the pitch site
  tells the three-day story with a live Play button

## 4. QA

The morning chapter's gates are pinned by unit tests and the full E2E;
current totals live in Doc 30 §QA (the afternoon shares the same suite).
The E2E caught two real defects before they shipped: the skipped
`D4_STRANGER` step (the wake leapfrogged the terminal beat — she stood
there while you served coffee, and the Map beat was unreachable), and the
stool reset above. Both fixed at the root, both now pinned by tests.

## 5. Honest limits

- The stranger's walks are tween-driven on sim time; under llvmpipe they lag
  real time (the E2E polls her arrival flag, never a timer — 60 s budget).
- She is ambience-grade once gone: no return visit yet. Rosa's chat promises
  *"They always come back Tuesday"* — that's a promise to a future day, not
  a current system (Doc 28's honest limits pattern).
- The Godot oracle has no Day 3 and no Day 4 — the web build is the leading
  implementation for both.
- Real-device GPU framing still pending (Doc 24 §6); all verification is
  SwiftShader + headless Chromium at 900×700 / 720×1280.
- Day 5+ remains "still being written" by design — the wall says so, and now
  it says so from Day 4.
- The four morning evidence frames were staged by the chapter's original
  build and wear Day-1's HUD ($87, the Day-1 objective); the afternoon
  frames (Doc 30) stage the real HUD. Re-staging the morning set is owed
  (Doc 31, fix #1).

*You say the thing Rosa said. It works. It still works.*
