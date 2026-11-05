# 04 — Dependency & Module Map (web-three/src)

*The map an agent should hold in their head before touching anything. Arrows read "imports from".*

## 1. The graph (post-M0)

```
main.ts
  └─ Game (game/Game.ts) ───────────── the one orchestrator
       ├─ GameState (core/GameState.ts) ──── PURE state, no THREE/DOM
       │    ├─ Save (core/Save.ts)          types + parse/write
       │    ├─ content (core/content.ts)    all authored text/cards/places
       │    └─ starters (core/starters.ts)
       ├─ World (world/World.ts) ─────────── scene graph + colliders + dressing
       │    ├─ dressing.ts (pure day plans) ├─ peds.ts ├─ ambient.ts
       │    ├─ props.ts ├─ streetAssets.ts ├─ timesSquare.ts ├─ subway/
       │    └─ personRig.ts ├─ leaves.ts ├─ signAtlas.ts ├─ vertexFuse.ts
       ├─ Player (player/Player.ts) ──────── collide.ts only
       ├─ GameCamera (camera/GameCamera.ts)─ collide.ts + THREE
       ├─ Input (engine/Input.ts) ────────── no gameplay imports
       ├─ InteractionRegistry (game/interactions.ts)
       │    └─ defs (game/interactionDefs.ts) ── needs GameState + ctx
       ├─ FreeRoam (game/freeroam.ts) ────── imports NOTHING (pure text+flag)
       ├─ ArrivalCinematic (game/arrival.ts) ── self-contained diorama
       ├─ CourtGame (court/) ├─ Postcard (postcard/) ├─ UI (ui/UI.ts) ├─ audio
       └─ autotest.ts (game/) ────────────── dynamic import, ?autotest only
```

## 2. Communication patterns (the only three)

1. **Effects out of state.** `GameState` methods return `Effect[]` (a closed union in `core/GameState.ts`); `Game.applyEffect` is the single interpreter that touches world/UI/audio. Nothing else applies gameplay changes.
2. **The registry + ctx.** Interactions are declarative records; they receive `{ state, game }` (`InteractionCtx`, type-only import of Game — no runtime cycle) and return Effects. `Game.nearest()` polls per frame for the HUD prompt.
3. **Module callbacks in.** UI/Audio/Camera expose nullable callback fields (`onMapToggle`, `onRoamToggle`, …); Game assigns them once in its constructor. The world talks back through beat queues (`subwayBeats`, `tsBeats`) drained by `Game.drainFarWorld`.

## 3. The dependency laws (enforced by review + tests)

- **`core/` imports nothing from `game/`, `world/`, `ui/`.** (GameState imports Save/starters/content only.)
- **`freeroam.ts` imports nothing at all.** It is text + a flag; if it grows an import, it grows an owner and a reason.
- **`interactions.ts` imports Game as `type` only** — the comment in the file is the law (no runtime cycle).
- **`engine/` never imports `core/` gameplay** (physics/input stay simulation-free; `traffic.ts`/`busRoute.ts` are ambient choreography).
- **World dressing functions (`world/dressing.ts`) are pure** day→plan functions — testable without THREE.
- **Nothing gameplay-bearing lives in the scene graph** (Game.ts header law); probes may read `world.barrier.visible` but the truth is in state/flags.

## 4. Where new modules go

| You are adding… | It lives in… | Pattern to copy |
|---|---|---|
| A mode/contract (pure law + text) | `game/<name>.ts` | `freeroam.ts` |
| A world system (visual + collider) | `world/<name>.ts` | `timesSquare.ts`, `arrivalBus.ts` |
| An interaction | a record in `game/interactionDefs.ts` | the `bench` record |
| A story beat | `GameState` method + `content.ts` text + a def record | `rosaD3Wake` |
| A save field | optional trailing field + conditional-spread parse | `starter`, `roam` |
| A probe | `scripts/probe-<feature>.mjs` | `probe-roam.mjs` |
| A test | `tests/<feature>.test.ts` | `freeroam.test.ts` |

Circular imports are banned; the two intentional near-cycles (registry→Game type, Game→autotest dynamic) are documented at their import sites and must stay that way.
