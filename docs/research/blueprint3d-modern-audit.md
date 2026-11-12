# Blueprint3D-modern — source audit

> Study-before-build reference audit (AGENTS.md §1e law). Repo: https://github.com/charmlinn/blueprint3d-modern,
> local clone `/home/z/my-project/repos/blueprint3d-modern`, last commit `f56f0b2`
> **2026-05-22** ("docs: add buy me a coffee button"; 10 commits total, first 2026-03-25, two author identities).
> Companion docs: [blueprint3d-original-audit.md](blueprint3d-original-audit.md) ·
> [blueprint3d-first-slice-applications.md](blueprint3d-first-slice-applications.md) ·
> [blueprint3d-integration-blueprint.md](blueprint3d-integration-blueprint.md) ·
> [blueprint3d-performance-and-risk-assessment.md](blueprint3d-performance-and-risk-assessment.md).
> This audit was ordered to trust the README less than the source. The source agrees with the README
> less than the README agrees with itself. Details below.

## 0. Repo card

| | |
|---|---|
| What it is | A 2026 TypeScript port of classic Blueprint3D onto **three r181** (`BufferGeometry`-only, `outputColorSpace`, r181 raycast API), shipped with a Next.js demo app. |
| Source size | **src/ = 44 `.ts` files, 9,529 LOC** (741 of that is `src/constants.ts`, the furniture catalog). app/ = 5,142 LOC of `.ts/.tsx`. |
| Tests | **Exactly one** — `src/services/simplify-canvas-data.test.ts` (194 lines), and it contains **zero assertions**; it's a printed worked example. No test runner is configured in either package.json. |
| License | **MIT**, © 2026 blueprint3d-modern contributors (`/LICENSE`). |
| Asset reality | **No 3D models or textures are vendored anywhere in the repo.** All demo content loads from two third-party CDNs — `cdn-images.archybase.com` (74 furniture GLBs + cover images + floor/wall textures, `src/constants.ts`) and `cdn-images.lumenfeng.com` (default wall/floor textures, `walllightmap.png`, template GLBs in `src/templates/*.json`). Their licenses are **stated nowhere**. The MIT grant covers code only. |

## 1. The standalone-core question (verified, and the answer has an asterisk)

**Claim:** `src/` is a standalone core library; `app/` is just a Next.js demo.

**Verified at source level: true.** Complete inventory of non-relative imports across all 44 src files:

- `import * as THREE from 'three'` — 27 files (items/, model/, loaders/, three/).
- `three/examples/jsm/loaders/GLTFLoader.js` + `DRACOLoader.js` — `src/loaders/GLBLoader.ts:2–3` only.
- **`import { animate } from 'animejs'` — `src/three/main.ts:2`.** The core, not the app, uses animejs (for the 2D↔3D camera tween). The README does not mention this dependency. Anything lifting src/ needs `animejs@^4` (the named-export v4 API) — or one 20-line tween.
- `import DefaultFloorplan from '../templates/default.json'` — `src/config/modes.ts:3–4` (JSON imports; Vite handles them natively).

No file in src/ imports from `app/`, React, Next, or next-intl. The only ambient globals are `document`/`window`/`navigator` (e.g. `src/three/hud.ts:23` UA sniffing, guarded for SSR in `three/main.ts`).

**Verified at package level: false.** Root `package.json` has `"main": "src/index.ts"` pointing at **raw TypeScript** — no `exports` map, no build script, no dist. The demo consumes the library as source via tsconfig paths + a webpack alias (`app/next.config.ts:26–27`: `'@blueprint3d': path.resolve(__dirname, '../src')`, plus manual aliases so the app's `three`/`animejs` resolve, and `externals: ['three']` server-side). `src/index.ts` (48 lines) re-exports the intended public surface — Model, Floorplan, Corner, Wall, Room, HalfEdge, Scene, the seven item classes, Factory, the three/ layer, Blueprint3d — **but omits** `Metadata`, `CornerItem`, both loaders, `core/events`, `types/room_types`, `config/modes`, the indexdb module, and `simplify-canvas-data`; the demo bypasses the entry and deep-imports several of those anyway.

**Verdict for us:** src/ can be lifted into a plain TS + three + Vite project with no framework residue — but as an *unbuilt, unpackaged, dependency-undocumented* source tree, and with `@ts-ignore` reach-arounds in its own hot paths. It is a reference implementation, not a library. (Consistent with the integration rules: we take patterns, not packages.)

`src/blueprint3d.ts:27–49` is the composition root and worth quoting because it shows the intended API shape:

```ts
export class Blueprint3d {
  public model: Model; public three: Main; public floorplanner?: Floorplanner
  constructor(options: Options) {
    this.model = new Model(options.textureDir || '')
    this.three = new Main(this.model, options.threeElement || document.body, undefined, {...})
    if (!options.widget) this.floorplanner = new Floorplanner(options.floorplannerElement || '', this.model.floorplan)
    else this.three.getController().enabled = false
  }
}
```

Note `options.textureDir` is **silently ignored** — `Scene`'s constructor `@ts-ignore`s it. The demo passes it (`Blueprint3DAppBase.tsx:111`). Nobody noticed because every asset URL is an absolute CDN path.

## 2. Event architecture — typed-ish emitters, per-object, not a bus

`src/core/events.ts` (63 lines) replaces jQuery `$.Callbacks` with a like-for-like class — **not** a string-keyed event bus:

```ts
export class EventEmitter<T = any> {
  private callbacks: CallbackFunction<T>[] = []
  add(cb)    { if (!this.callbacks.includes(cb)) this.callbacks.push(cb) }
  remove(cb) { /* swap-remove */ }
  fire(...args: T[]) { this.callbacks.forEach((cb) => cb(...args)) }
  empty(); has()
}
```

Each named emitter field is typed at its declaration site (`private updated_rooms = new EventEmitter<void>()`, `public roomLoadedCallbacks = new EventEmitter<void>()` — floorplan.ts:41–53). Full emitter inventory: `Model` (roomLoading/Loaded/Saved/dead-Saved/dead-Deleted), `Floorplan` (new_wall, new_corner, redraw-dead, updated_rooms, roomLoaded), `Corner` (moved/deleted/action-dead), `Wall` (moved/action-dead/deleted), `HalfEdge` (redraw), `Room` (floorChange), `Scene` (itemLoading/itemLoaded/itemRemoved/**itemLoadError — new**), `Main` (itemSelected/itemUnselected/wallClicked/floorClicked/nothingClicked), `Controls` (cameraMoved).

Assessment: the *typing* is better than the original (payloads carry their object type), the *architecture* is identical — per-object multicast, no central bus, no once/wildcard, and the same dead-emitter accumulation as 2016 (`roomSavedCallbacks` still declared and never fired). Naming is inconsistent (`snake_case_callbacks` vs `camelCaseCallbacks` in the same class). For FIRST SLICE this confirms the house judgment: our `Effect[]` orchestrator needs no bus; a future interior module that wants one should make emitters **structurally typed and inventory-checked**, not inherit this file.

## 3. Data model — a faithful DCEL port, plus app-flavored extras

`model/` is a line-for-line architectural port of the classic design: `Model` composes `Floorplan` (corners/walls/rooms graph) + `Scene` (items + THREE.Scene). The machinery survives intact:

- `Room.updateWalls()` (room.ts:127–168) — same ring construction, same `edgePointer`.
- `HalfEdge.halfAngleVector()` (half_edge.ts:275–342) — same miter math, **same divide-by-zero at 180°**.
- `Floorplan.findRooms()` (floorplan.ts:388–516) — same tightest-cycle DFS, same CCW filter, same `// TODO: optimize this` still waiting.
- `assignOrphanEdges()` (floorplan.ts:365–380) — same "kinda hacky" orphan walls.
- Tolerances: pick 10 cm, corner-merge 20 cm, 2D axis snap 25 cm, CornerItem corner-snap 100 cm, wall-snap release 30 cm — five unrelated constants, still scattered as module literals.

**Verified hardening fix** (the one place the modern repo genuinely improves the graph): `Wall.remove()` clears its item arrays after firing (wall.ts:151–159), and `WallItem` unsubscribes wall deletion via a **stored bound handler** (`this.boundRemoveFromScene = this.removeFromScene.bind(this)`, wall_item.ts:65) — the classic `bind()`-leak (original audit §11.3) is fixed at both ends. `Corner.detachWall` still self-removes isolated corners (corner.ts:216–218), and this time the Floorplan actually listens.

**What's still missing:** no curved walls, no per-wall elevation, no wall types, **no room area computation** (the classic `getArea()` was dropped entirely; labels show only edge lengths). `src/types/room_types.ts` sounds geometric and isn't — it's a five-value `RoomType` enum (`BEDROOM`, `LIVING_ROOM`, `KITCHEN`, `BATHROOM`, `OFFICE`) feeding a Feng Shui mode system (`config/modes.ts`, `MODE_CONFIGS_MAP`, `SpecialMode.GENERATOR`/`WEALTH_CORNER`), each mode pointing at a default template. `core/dimensioning.ts` handles units: internal unit is always cm; `cmToMeasure()` renders inches/feet/mm/m.

One quiet externalization worth noting: `Wall`'s default texture is now `https://cdn-images.lumenfeng.com/models-cover/wallmap.png` (wall.ts:10) — the core library ships with a hardcoded third-party CDN URL. For us: every default texture reference would be replaced by our `MatBank`/atlas pipeline on day one.

## 4. Items — the good part got better

The six-type factory survives, plus **type 10: `CornerItem`** (`src/items/corner_item.ts`, new) — furniture that snaps only to room corners whose turn angle passes `minCornerAngle = π/6` (`isValidCorner`), within 100 cm, oriented along one wall and offset by `halfSize.x`/`halfSize.z` so both edges touch the walls (corner wardrobes, corner sinks). `FloorItem.snapToCorner` mirrors the same algorithm for floor items.

**The biggest genuine gameplay upgrade lives in `FloorItem` (`src/items/floor_item.ts:44–104`): a sticky wall-snap state machine.**

- `snappedWallEdge` is held across frames with a `releaseThreshold = 30` cm — furniture stays glued to a wall while you slide it along, and only lets go when pulled past 30 cm off the wall.
- Snap gating uses `surfaceDistance = distance − halfSize.z ≤ snapThreshold` — the *furniture's* half-depth, not its center, so a bookcase flush against a wall is "snapped", and a floating one is not.
- `snapToWall()` (lines 179–233) projects onto the wall line with a 1 cm clamp margin, offsets by `halfSize.z` along the wall normal, and **rotates the item to face away from the wall**.
- `findPerpendicularWall()` (lines 242–302, perpendicular test `|dot| < 0.3`) and `findWallIntersection()` (endpoint proximity within 0.1 cm) implement corner docking — sofa into a corner, flush both ways.

This is the piece worth adapting first: it's plain math over the same interior transforms the original used, and it produces "feels right" placement with zero physics.

**Still disabled:** item-vs-item collision — the overlap block in `isValidPosition` (lines 134–147) is commented out, same as 2016 (and the original had it live at least in intent). Furniture interpenetrates freely in both repos. For a game that shops and lives in these rooms, we'd have to write this ourselves (see the applications doc §4).

`WallItem.updateWallEdgeReference()` (wall_item.ts:212–223) is new: after a floorplan edit recreates HalfEdges, items re-resolve their stale edge — a partial mitigation of the TODO that has survived both repos ("HalfEdges get destroyed/created every time floorplan is edited"). Partial, because it only runs on explicit calls, not on the edit itself.

## 5. Loaders — the real reason to read this repo

README says "OBJ/MTL". The source says otherwise. Two loaders, dispatched by extension in `Scene.addItem` (scene.ts:173–175):

**`src/loaders/GLBLoader.ts`** — wraps `GLTFLoader` + `DRACOLoader`, matches the old JSONLoader callback signature, and does the interesting part manually:
- traverses the glTF scene, clones each mesh geometry, **bakes `matrixWorld` into vertices**, remaps material indices;
- hand-rolls a geometry merge (lines 188–267 — positions/normals/uvs/indices/groups concatenation; **drops vertex colors and tangents**, so any KHR_materials_vertexcolor asset silently loses its colors);
- scales **m → cm ×100** (the library's internal unit is cm);
- **downgrades `MeshStandardMaterial` → `MeshPhongMaterial`** (lines 131–156) "for compatibility with the existing lighting setup (no environment map)" and forces `DoubleSide`.
- `setDecoderPath('/draco/')` is hardcoded (line 19) and the repo contains no `/draco/` — Draco assets 404 unless the host serves the decoder.

**`src/loaders/JSONLoader.ts`** — a from-scratch parser for **legacy three.js r69 JSON models** (`vertices`/`faces` bitmask flags, quad conversion, material groups, `mapDiffuse` texture resolution relative to the model URL). This exists purely to keep the 2016 example assets loadable — a compatibility bridge we do not need (we have GLB + KTX2 + meshopt already wired through `configureGltfDecoders`).

**Caching: there is none.** `Scene.addItem` re-fetches and re-parses the GLB on **every placement** (scene.ts:173–192). No `Map<url, geometry>`, no `LoadingManager` reuse, no `THREE.Cache.enabled`. With a 74-item CDN catalog, dragging ten chairs is ten downloads. The improvement we'd bring is the one they didn't: geometry/material cache keyed by URL with clone-on-instantiate — which our `registerGlbProp` upgrade path effectively already does at boot.

**`services/simplify-canvas-data.ts`** — misnamed by its own test; it is an **LLM-prompt compactor**: corners → `[x,y]` index arrays rounded to 2dp, walls → `[i,j]` index pairs, areas reconstructed from `newFloorTextures` keys (`area_0`…), items reduced to `pos/rot/scale/description` with names and URLs stripped "not relevant for Feng Shui analysis". Plus `estimateTokenSavings()`. Nothing in app/ imports it; the demo feature is dormant. The *idea* — a deterministic plan-to-compact-JSON projector for LLM context — is a genuinely interesting pattern for our diary/debug tooling; note it and move on.

## 6. Placement interaction — the mobile work is real

`three/controller.ts` keeps the classic FSM (`UNSELECTED/SELECTED/DRAGGING/ROTATING/ROTATING_FREE`, `PANNING` still dead) and adds **full touch support** (lines 42–46, 487–694): `touchMoveThreshold = 10` px discriminates tap vs drag; single-finger manipulates objects (with `preventDefault` so the camera doesn't fight), multi-finger cedes to the camera; `itemLoaded` marks new items `position_set = true` instead of the original's auto-drag (the original's stale-mouse grab bug, fixed by not doing the thing).

`three/controls.ts` is a **vendored, heavily modified OrbitControls** (not the three addon): one-finger **vertical-page-scroll heuristic** (`total > 15px && y > x*1.5` → page scrolls instead of orbiting — lines 551–555), two-finger pinch, three-finger pan, an `enableWheelZoom` gate so a host page can reserve scroll, and `prefers-reduced-motion` respect. It also carries ancient vendored bugs: `onMouseUp` removes listeners with `this.onMouseMove.bind(this)` (lines 398–407) — a fresh bind, so **removal is a no-op and listeners accumulate per mousedown** — plus `mousewheel`/`DOMMouseScroll`/`event.keyCode` relics.

The 2D floorplanner (`floorplanner.ts` + `floorplanner_view.ts`) is a faithful port with **no touch handlers at all** — 2D editing is mouse-only; the app compensates with a touch-help overlay. `FloorplannerView.destroy()` and a mode-reset compat shim are new.

## 7. Rendering — same architecture, r181 accents, same hole in the bucket

- **`three/edge.ts` (408 LOC)** keeps the star: wall interior faces as `ShapeGeometry` with **genuine rectangular holes** punched per embedded item (lines 259–277) — real door/window openings, AABB-based, rotation-blind, inherited unchanged. Adds: URL-diffed texture reload (`if (url !== this.currentTextureUrl)`), proper stored-handler unsubscription in `remove()`, `MeshLambertMaterial` with `emissiveIntensity 0.3`. And one absurdity: `this.lightMap = textureLoader.load('https://cdn-images.lumenfeng.com/models-cover/walllightmap.png')` (line 37) is **fetched per Edge construction and never used** — every wall rebuild costs a CDN request for nothing.
- **`three/floor.ts`** keeps the divide-then-rescale ShapeGeometry UV trick, `SRGBColorSpace`, anisotropy, near-zero specular "to avoid moiré", `receiveShadow`.
- **`three/main.ts`** — dirty-flag loop (`shouldRender()` ORs four flags), two-pass scene+HUD render, `preserveDrawingBuffer` for thumbnails, and a **new animated `setViewMode('2d'|'3d')`** (lines 382–464): saves the 3D camera, tweens camera + target with animejs (800 ms, `inOut(2)`), toggles top-down polar clamps. Idle spin returns unless clicked.
- **Lights**: hemisphere 3.0 + directional 0.5 (comment: intensity 0 "was causing items to be invisible" — the classic's intensity-0 shadow-only trick doesn't survive r181's lighting), 1024² shadows, ortho frustum re-fit per room update.
- **Skybox**: gradient shader dome; `Main.getSkyboxColors()` **reads the host page's `--muted` CSS variable** (main.ts:155–196) — the core library now reaches into host CSS. Mild layering violation, noted for the record.
- **Disposal: essentially absent.** The only `dispose()` in src/ is `GLBLoader.dispose()` (lines 272–274) — **never called**. No geometry/material/texture disposal anywhere; `FloorplanThree.redraw` (49 lines) destroys and rebuilds every Floor/Edge per room update, exactly like 2016; `Main` never removes window listeners; `Blueprint3d` has no `destroy()`. The patterns to copy instead are the two they did right: stored-bound-handler unsubscription (`Edge.remove`, `WallItem.boundRemoveFromScene`) and the centralized dirty-flag.

## 8. Serialization & persistence

**Save format** — same shape as the original, with the omissions fixed selectively:

```ts
// src/model/model.ts:66-95 + floorplan.ts:11-22
{ floorplan: {
    corners: Record<uuid, {x, y}>,
    walls: [{ corner1, corner2, frontTexture?, backTexture? }],
    newFloorTextures?: Record<roomUuid, {url, scale}>,
    // legacy wallTextures?/floorTextures? accepted on load, ignored
  },
  items: [{ item_name, item_type, model_url, xpos, ypos, zpos, rotation,
            scale_x, scale_y, scale_z, fixed, resizable?, description? }] }
```

`resizable` and the new AI/i18n metadata (`description`, `itemKey`) **are** persisted now. Wall `height`/`thickness` **still are not**. There is **still no version field** — the leftover TODO in model.ts:56–57 says "a much better serialization format". Loading is same-order (corners → walls → textures → update → async items), tolerant of `null` floorplans.

**Persistence is app-layer and manual-only:** `app/services/storage.ts` (164 lines) — IndexedDB `blueprint3d_floorplans`, store `floorplans` (keyPath `id`, indexes `roomType`/`updatedAt`/`name`), list results stripped of heavy `layoutData`; contract in `app/types/blueprint.ts` (`BlueprintListItem`/`Detail`/`Payload`). **No autosave exists anywhere** — no interval, no `beforeunload`. Save = a button (`handleSave` → `exportSerialized()` + a top-down webp thumbnail rendered by temporarily resizing the renderer to 1800×1200 and restoring in a `finally`). Separately, `src/indexdb/blueprint-template.ts` is a second, unrelated DB (`blueprint3d_templates`, single-record store) used for cross-page template/bed-size handoff for the Feng Shui generator — not project storage.

For us: the thumbnail-in-a-`finally` trick and the IndexedDB list/detail split are fine patterns; the missing version field and the absent autosave are exactly the gaps our `WORLD_SCHEMA_VERSION` + whitelist-parse + autosave discipline (sim/state.ts) already solve better. Adopt nothing wholesale here; document the deltas.

## 9. New vs ported — the honest ledger

**Genuinely new:** (1) `CornerItem` + corner-docking math; (2) sticky wall-snap with release threshold and surface-distance gating (`FloorItem`); (3) GLB pipeline with world-transform bake + hand-rolled merge + PBR→Phong downgrade; (4) the r69-JSON reviver loader; (5) `itemLoadErrorCallbacks`; (6) touch support in the 3D controller + page-scroll/pinch/wheel-gate/reduced-motion in controls; (7) animated 2D↔3D view toggle; (8) stored-bound-handler unsubscription fixing the classic leak; (9) `Wall.remove()` stale-item clearing; (10) `updateWallEdgeReference()`; (11) the LLM-compaction projector; (12) mode/template system + two IndexedDB stores; (13) r181 migration throughout.

**Straight ports with renamed types:** `core/utils.ts` (including the `isClockwise` bug — the second loop's minimum still maps `p.x` twice), `dimensioning`, `configuration`, `log`, `version`, all of `model/` (including both inherited NaN paths), `floorplanner/*`, `three/{floor,skybox,hud,lights,edge-core,floorplan}.ts`, the item class skeleton. The event layer is a like-for-like `$.Callbacks` replacement, not a redesign.

## 10. Verified weaknesses (all cited)

1. **No model/texture cache** — per-placement fetch (scene.ts:173–192); heavy with a 74-item CDN catalog.
2. **Zero GPU disposal** — one uncalled `dispose()` in the whole tree; per-edit rebuild leaks; no `destroy()` anywhere.
3. **Listener-removal no-op** in vendored controls (`bind()` unsubscribe, controls.ts:398–407) — handlers accumulate per interaction.
4. **Item-vs-item collision disabled** — floor_item.ts:134–147.
5. **Hardcoded externals** — `/draco/` decoder path with no decoder shipped (GLBLoader.ts:19); three CDN hostnames baked into src (`constants.ts`, wall.ts:10, room.ts:17, edge.ts:37) with no fallback; `textureDir` option silently ignored (scene.ts `@ts-ignore`).
6. **Debug logging in production paths** — `console.log('JSONLoader parsed geometry:', …)` on every parse (JSONLoader.ts:284–295).
7. **Private-API reach-arounds** — `(this.model.floorplan as any).floorPlanes()` (controller.ts:146); `(this.plane as any).edge = this` monkey patches (half_edge.ts:142, room.ts:93).
8. **Merge drops attributes** — the hand-rolled geometry merge discards vertex colors/tangents (GLBLoader.ts:188–267).
9. **Inherited math bugs** — `isClockwise` p.x/p.y (utils.ts), `halfAngleVector` ÷0 (half_edge.ts:285), `findRooms` exponential (floorplan.ts:501 TODO).
10. **Mobile gaps** — 2D floorplanner mouse-only; HUD mobile sizing via UA regex (hud.ts:23); stale `mousewheel`/`keyCode` events.
11. **Dead code** — `ControllerState.PANNING`, `roomSaved/DeletedCallbacks`, `Wall.oppositeCorner`, `HalfEdge.getOppositeEdge`, `WallItem.updateEdgeVisibility`, `Floor.buildRoof`, `Floorplan.floorPlanes` (all `@ts-ignore`-marked unused); unused per-wall lightmap fetch.
12. **The test that tests nothing** — simplify-canvas-data.test.ts has zero assertions; no CI, no runner.

## 11. Verdict

The modern repo's value to us is narrow and real: **a working example of the classic architecture running on r181 APIs**, plus four adaptable upgrades (sticky wall-snap, CornerItem, touch discrimination, URL-diffed texture reload) and one instructive failure mode (everything it kept from 2016 that it should have fixed — disposal, item collision, serialization versioning). It is not a library, it is not tested, and its demo assets are unlicensed CDN content — we lift **patterns** (as with Gen City Auto), and we write our own serialization, our own disposal, and our own collision from day one.

One-line summary for the next agent: **the modern repo proves the architecture survives r181 — and proves that nobody ever ships the boring parts (dispose, versioning, collision) unless the repo is forced to. We are the ones being forced to.**
