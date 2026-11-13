# Blueprint3D (original) — source audit

> Study-before-build reference audit (AGENTS.md §1e law). Repo: https://github.com/furnishup/blueprint3d,
> local clone `/home/z/my-project/repos/blueprint3d`, branch `master`, last commit
> `cac8b62` **2016-07-10** ("Fix bug with removing corners, and some minor cleanup").
> Companion docs: [blueprint3d-modern-audit.md](blueprint3d-modern-audit.md) (the 2026 TS rewrite),
> [blueprint3d-first-slice-applications.md](blueprint3d-first-slice-applications.md) (what we'd use it for),
> [blueprint3d-integration-blueprint.md](blueprint3d-integration-blueprint.md) (how),
> [blueprint3d-performance-and-risk-assessment.md](blueprint3d-performance-and-risk-assessment.md) (what it costs).

## 0. Repo card

| | |
|---|---|
| What it is | The classic browser floor planner: draw walls in 2D, walk through them in 3D, drop furniture. |
| Stack | TypeScript-era source (ambient `module BP3D.*` namespaces, no imports/exports), grunt + `grunt-typescript`, **three r69** (`THREE.Geometry`, `Face3`, `MeshFaceMaterial`, `ImageUtils.loadTexture`), **jQuery 2.x** (`$.Callbacks` is the event bus), typings r73 in `lib/`. |
| Source size | **33 files, 5,716 LOC** under `src/`. Biggest: `three/controls.ts` (517), `model/floorplan.ts` (496), `three/controller.ts` (448), `core/utils.ts` (366), `items/item.ts` (357), `model/corner.ts` (344). |
| Demo | `example/` — Bootstrap 3 UI, `js/items.js` catalog (20 items), `models/js/*.js` (25 three.js JSON formatVersion 3.1 models from the Blender 2.65 exporter), `rooms/textures/` (6). Build outputs (`three.min.js`, `blueprint3d.js`) are **not** committed; fresh clone needs `grunt`. |
| License | **MIT**, © 2015 FurnishUp Inc. (`LICENSE.txt`; `package.json` claims "(MIT OR Apache-2.0)" but no Apache text exists — operative license is MIT only). Demo furniture models are retailer-catalog assets of unclear provenance — code is MIT, the example assets are not something we ship. |
| Verdict in one line | Ten-year-old, r69-era, jQuery-coupled — the **code** is not liftable, but the **architecture** (corner/wall graph → half-edge rooms → item-type registry → serialize plan as JSON) is exactly the engineering we'd otherwise reinvent, and most of its bugs are instructive. |

## 1. Architecture at a glance

Three layers, one data flow. The model layer owns truth; the 3D layer only listens.

```
                    ┌────────────────────────────────────────────────┐
                    │ Model (src/model/model.ts, 108 LOC)            │
                    │   floorplan: Floorplan   ← the planar graph    │
                    │   scene:     Scene       ← items + THREE.Scene │
                    │   loadSerialized() / exportSerialized()        │
                    └──────────────┬─────────────────────────────────┘
                                   │ owns
              ┌────────────────────┴───────────────────────┐
              │ Floorplan (model/floorplan.ts, 496 LOC)    │
              │  walls: Wall[]  corners: Corner[]          │
              │  rooms: Room[]  (DERIVED, rebuilt wholesale)│
              │  floorTextures: {roomUuid: {url,scale}}    │
              │  update() → findRooms() → updated_rooms.fire()
              └───────┬───────────────────────┬────────────┘
       Wall{start,end}│                       │Room{corners}
       HalfEdge front/back                    │floorPlane (invisible raycast mesh)
              │                               │
┌─────────────▼──────────────┐   ┌────────────▼──────────────────┐
│ three/ (function-style ES5)│   │ floorplanner/ (Canvas2D)      │
│  Main → Skybox, Controls,  │   │  Floorplanner (modes: MOVE/   │
│  HUD, Controller, Lights,  │   │   DRAW/DELETE)                │
│  Floorplan(3D), Floor, Edge│   │  FloorplannerView (grid, dim  │
│  rebuilds on updated_rooms │   │   labels, rubber-band walls)  │
└────────────────────────────┘   └───────────────────────────────┘

Events: per-object $.Callbacks() buses, ~20 declared, ~9 with real subscribers.
Sync contract: 2D edits mutate the model; every Floorplan.update() fires
updated_rooms; the 3D layer throws away ALL floors/edges and rebuilds them.
No diffing, no per-frame reconciliation. Commit-on-demand, not live.
```

The 2D/3D split is the load-bearing idea: **one data model, two views, events as the only wire**. That idea transfers to us wholesale; every concrete implementation detail does not (r69 three, jQuery, ES5 function classes, no disposal).

## 2. The floorplan data model

`Model` is a thin composition root: `new Floorplan()` + `new Scene(this, textureDir)` (model.ts:33–36), plus save/load. The real model is `Floorplan`:

- Containers are **plain private arrays** — `walls: Wall[]`, `corners: Corner[]`, `rooms: Room[]` (floorplan.ts:19–25). Every lookup is a linear scan. Fine at floor-plan scale; never copy this into anything city-sized.
- Identity is **GUID strings** (`Core.Utils.guid()`, utils.ts:135 — an 8-4-4-4-12 hex v4-ish string). A wall's `getUuid()` is `[start.id, end.id].join()` (wall.ts:75–77), so wall "identity" mutates when its endpoints move, and is never persisted.
- Rooms are **derived, never canonical**. Every structural change funnels into `Floorplan.update()` (floorplan.ts:295):

```ts
this.walls.forEach((wall) => { wall.resetFrontBack(); });  // clear HalfEdges
var roomCorners = this.findRooms(this.corners);            // graph cycles (§4)
this.rooms = [];  roomCorners.forEach(... new Room(scope, corners));
this.assignOrphanEdges();                                  // §3
this.updateFloorTextures();                                // purge stale room textures
this.updated_rooms.fire();                                 // the ONE event the 3D view hears
```

- `Room` objects (and their `HalfEdge`s) are **destroyed and recreated wholesale on every update**. The comment at floorplan.ts:48 says it outright: *"Floor textures are owned by the floorplan, because room objects are destroyed and created each time we change the floorplan."* Room UUID = sorted corner-id list joined by `","` (room.ts:52–58), so a floor texture survives an update only if the room's corner set is topologically identical.

That "derived rooms + textures owned by the plan" split is a genuinely good call — it is the same instinct as our registry law ("a building's numbers are copied from the registry, never invented"). The fragile part is the UUID: it's positional, not stable. If we adapt this, room identity gets a real persisted ID.

## 3. The wall & corner graph

`Corner` (corner.ts, 344 LOC) is strictly 2D — `x`, `y` in **centimeters**, no elevation field; the world mapping is `(x, 0, y)`. Private `wallStarts`/`wallEnds` lists, three `$.Callbacks` buses. Key mechanics:

- **Self-destructing orphans**: `detachWall` removes the wall and, if both lists empty, calls `remove()` (corner.ts:209–215). But `Floorplan.newCorner` registers the delete handler as `corner.fireOnDelete(() => { this.removeCorner; })` (floorplan.ts:141–143) — the arrow *references* the method without calling it. The final commit of the repo (cac8b62, "fix bug with removing corners") **introduced this no-op**; orphaned corners linger forever in `Floorplan.corners`, get picked by `overlappedCorner`, counted in dimension labels, and — worst — **get serialized into saves**. Lesson: the last commit of a dead repo is not a patch, it's a data point.
- **Self-healing graph** — the best algorithm in the repo. `Corner.mergeWithIntersected()` (corner.ts:285–313, tolerance `cornerTolerance = 20` cm) runs after every move:
  1. **Corner-corner merge**: another corner within 20 cm → copy its position, re-point all its walls via `wall.setStart(this)`/`setEnd(this)`, `corner.removeAll()`, `removeDuplicateWalls()` (deletes zero-length walls and duplicates to the same neighbor), `floorplan.update()`.
  2. **Corner-into-wall split**: corner lands within 20 cm of a wall it isn't connected to → project onto the wall line (`Utils.closestPointOnLine`, which clamps to the segment), move there, then `newWall(this, wall.getEnd()); wall.setEnd(this)` — a T-junction is born.

  This is what makes hand-drawn plans converge instead of fraying. We get the algorithm, minus the global tolerance constants.
- **Snapping is relative**: `Corner.snapToAxis(tolerance)` (corner.ts:80–100) snaps only against *adjacent* corners' x/y — nothing global, no grid.
- `Wall` (wall.ts, 193 LOC): `start`/`end` corners, `frontEdge`/`backEdge: HalfEdge`, `orphan` flag, `items` (in-wall items that cut holes) and `onItems` (wall-attached decor), `frontTexture`/`backTexture` (default `rooms/textures/wallmap.png`), `thickness = 10` cm and `height = 250` cm from global `Configuration` defaults. There is **no wallType and no per-wall elevation** anywhere, despite what older docs claim. Wall removal correctly removes attached items via `wall.fireOnDelete(item.remove)` registered by each `WallItem` (wall_item.ts:165).
- `assignOrphanEdges()` (floorplan.ts:351–367, self-described "kinda hacky"): walls in no room get `wall.orphan = true` plus two roomless `HalfEdge`s so freestanding walls still render and host wall items.

## 4. Rooms via half-edges (the DCEL)

`HalfEdge` (half_edge.ts, 295 LOC) — one per visible wall side per room, linked into a ring: `next`/`prev` pointers, `offset = wall.thickness/2`, plus world→wall-plane matrices (`interiorTransform`/`invInteriorTransform`) used by all wall-item math. An **invisible raycast quad** (`generatePlane()`, half_edge.ts:95–127) is monkey-patched with `this.plane.edge = this` — that patch is how a ray hit becomes a HalfEdge again.

- **Room discovery** — `Floorplan.findRooms()` (floorplan.ts:375–494): rooms are the *smallest cycles*. For every corner and every adjacent corner, `_findTightestCycle` runs an explicit-stack DFS whose frontier is **sorted by turning angle so the tightest turn is explored first** (floorplan.ts:451–456), dedupes cycles by trying all rotations into a hash (`_removeDuplicateRooms`), and keeps only **CCW** loops (`Utils.removeIf(loops, Utils.isClockwise)`). There's a `TODO: optimize this, only check corners with > 2 adjacents` (line 479) — the author knew it was worst-case exponential. It works, at floor scale, because floors have a dozen corners.
- **Miter math** — `HalfEdge.halfAngleVector()` (half_edge.ts:239–294) is the interior/exterior inset that makes wall faces meet correctly at convex/concave corners:

```ts
var theta = Core.Utils.angle2pi(v1startX - v1endX, v1startY - v1endY,
                                v2endX - v1endX,  v2endY - v1endY);
var cs = Math.cos(theta / 2.0), sn = Math.sin(theta / 2.0);
// rotate v2's direction by the half angle, then:
var desiredMag = (this.offset) / sn;   // ← divides by zero when sn == 0 (180° junctions)
```

  Collinear-opposite wall junctions produce `Infinity`/`NaN` vectors. (Both rewrites inherit this.) The general shape — bisect the corner angle, scale the bisector by `offset / sin(halfAngle)` — is the correct, keepable core.
- `Room.updateWalls()` (room.ts:122–160) walks consecutive corner pairs, finds each wall via `corner.wallTo(other)`/`wallFrom(other)`, and builds the ring. If a pair is **not** connected it logs `"corners arent connected by a wall, uh oh"` and leaves `edge === undefined` — the next line throws. Degenerate input crashes the model layer.
- Room area: **never computed**. Dimension labels (2D only) show edge lengths; there is no `getArea()` in the original.

## 5. Items and the factory

`src/items/factory.ts` is the entire registry — 25 LOC:

```ts
const item_types = {
  1: Items.FloorItem,       // furniture on the floor
  2: Items.WallItem,        // wall-attached (posters)
  3: Items.InWallItem,      // embedded IN the wall — windows
  7: Items.InWallFloorItem, // embedded + floor-bound — doors
  8: Items.OnFloorItem,     // floor, non-blocking — rugs
  9: Items.WallFloorItem    // wall-attached + floor-bound — baseboards
};
export class Factory { public static getClass(itemType) { return item_types[itemType] } }
```

Numbers 4–6 are unassigned legacy gaps. The taxonomy itself — *where an object lives relative to a wall* — is the reusable idea: six placement semantics, one integer each, and every behavioral rule (y-constraints, wall glue, hole-cutting, wall-removal fallout) keyed off that.

The factory does **not** build geometry. Every item is `THREE.JSONLoader` loading `metadata.modelUrl` (caller-supplied URL; `Scene.addItem`, scene.ts:118–138, wraps materials in `MeshFaceMaterial`). Metadata (`items/metadata.ts`) is `{itemName, itemType, modelUrl, resizable}` — and note for later: **`resizable` is read on load but never written on save** (§9).

`Item` (item.ts, 357 LOC) extends `THREE.Mesh` — items ARE scene meshes. On construction the geometry is **recentered into its own bounding box** (translate vertices by `-0.5*(min+max)`, recompute `halfSize`), which makes every placement formula below center-based. The rest of the base class: `resize`/`setScale` (recomputes `halfSize`, fires `resized()`), rotation with snap `π/16` around `π/2` multiples, `getCorners()` (the 4 rotated footprint corners — the basis of all collision math), emissive highlight, and `showError()` — a red additive-blended glow clone of the geometry when an item lands somewhere invalid. That last one is cheap UX worth stealing: rejection feedback that costs one clone mesh.

## 6. Placement, dragging, collision

**The 3D controller** (`three/controller.ts`, 448 LOC) is an FSM: `UNSELECTED → SELECTED → DRAGGING / ROTATING / ROTATING_FREE` (`PANNING` is declared, never entered). Mousedown on an item enters DRAGGING (unless `item.fixed`); orbit is disabled while dragging; `clickPressed` records `dragOffset = hit.point − position` so drags don't snap the object to the cursor.

**Raycast targets are proxies, not furniture.** `itemIntersection()` prefers `item.customIntersectionPlanes()` — for wall items that's `floorplan.wallEdgePlanes()`, the invisible HalfEdge quads — and falls back to one invisible 10000×10000 ground plane. Furniture is never raycast directly during drags. `getIntersections()` supports `filterByNormals` (drop back-facing hits — a cheap occlusion for wall picking) and `onlyVisible` (this is the second half of the wall-item occlusion trick, §10). One real bug: `normalizeVector2` divides by `window.innerWidth/innerHeight` instead of the canvas element's size (controller.ts:329–334), so picking drifts whenever the canvas is embedded.

**Wall items stay glued because the drag plane IS the wall.** `WallItem` (wall_item.ts, 221 LOC) keeps `currentWallEdge: HalfEdge`, and `moveToPosition(vec3, intersection)` simply calls `changeWallEdge(intersection.object.edge)` — the ray hit the wall's invisible plane, so the wall is chosen for you; no re-projection needed. Then `boundMove()` clamps in wall-local space:

```ts
vec3.applyMatrix4(edge.interiorTransform);
if (vec3.x < this.sizeX / 2.0 + tolerance) { ... }                       // clamp along wall
else if (vec3.x > edge.interiorDistance() - this.sizeX/2 - tolerance) { ... }
if (this.boundToFloor) vec3.y = 0.5 * bbH * this.scale.y + 0.01;         // feet on floor
else if (vec3.y < sizeY/2 + tol || vec3.y > edge.height - sizeY/2 - tol) { ... }
vec3.z = this.getWallOffset();                                           // glue to wall plane
vec3.applyMatrix4(edge.invInteriorTransform);
```

Facing is computed once per wall change — the edge plane's normal projected to 2D, `rotation.y = Utils.angle(refVec, normal2)` — and user rotation is disabled (`allowRotate = false`). Wall items always face the room.

**Collision is one function, and it's disabled.** `FloorItem.isValidPosition()` (floor_item.ts:44–78) checks room containment only:

```ts
if (pointInPolygon(vec3.x, vec3.z, room.interiorCorners) &&
    !polygonPolygonIntersect(corners, room.interiorCorners)) isInARoom = true;
```

— and the entire item-vs-item overlap loop below it (`obstructFloorMoves` branch, lines 62–75) is **commented out**. Two sofas interpenetrate freely. Also note the logic bug: `isInARoom` is set per-room, not ANDed, so a footprint straddling two rooms passes. Wall deletion removes attached wall items (the `fireOnDelete` chain), but floor items are never re-validated — one wall removal later, furniture can sit outside any room until the next drag.

The worth-stealing summary: drag-plane-as-snap-target, center-based bounding math, per-type y-constraint layering, visible rejection feedback. The not-stealing: no item-item collision, per-room-containment misclassification, the window-relative picking bug.

## 7. The 2D floorplanner

`floorplanner.ts` (297 LOC) + `floorplanner_view.ts` (311 LOC), pure Canvas2D. Modes `{ MOVE: 0, DRAW: 1, DELETE: 2 }`. Scale is fixed (`cmPerFoot 30.48 / pixelsPerFoot 15`). Mechanics:

- Hover picks via `floorplan.overlappedCorner/overlappedWall` at `defaultFloorPlanTolerance = 10` cm, corners taking precedence over walls.
- Drawing chains corners: click → `newCorner(targetX, targetY)` → `newWall(lastNode, corner)` → `corner.mergeWithIntersected()`; if the merge closed a loop, drawing mode auto-exits to MOVE. Escape returns to MOVE. Rubber-band target line while DRAW.
- Snapping: `snapTolerance = 25` cm — axis snap while dragging (`activeCorner.snapToAxis(25)`), and while drawing, the pending corner snaps to `lastNode.x/y` for axis-aligned walls.
- The view is **pull-based**: reads the model directly each draw (`drawGrid`, `drawRoom` fills `#f9f9f9` polygons, `drawWall` 5px/7px hover, `drawEdge` draws the half-edge footprint outline, `drawWallLabels` renders `Dimensioning.cmToMeasure(length)` with a white stroke halo, skipping edges < 60 cm).
- 2D edits **never** rebuild the 3D view live — the example app calls `model.floorplan.update()` manually when leaving the floorplan tab (example/js/example.js:299–301). Sync is commit-on-demand.

## 8. Events

The bus is **jQuery `$.Callbacks()`** — fire-and-forget multicast, no names, no priorities, positional payloads per fire site. Full inventory with subscribers:

| Bus | Fired by | Actually listened to by |
|---|---|---|
| `Floorplan.updated_rooms` | `update()` | `Three.Floorplan.redraw`, `Lights.updateShadowCamera`, `Main.centerCamera` |
| `Floorplan.roomLoadedCallbacks` | `loadFloorplan()` | `Floorplanner.reset` |
| `Wall.deleted_callbacks` | `Wall.remove()` | `Floorplan.removeWall`, each `WallItem` |
| `HalfEdge.redrawCallbacks` | `setTexture()`, `Wall.fireRedraw()` | `Three.Edge.redraw` |
| `Room.floorChangeCallbacks` | `Room.setTexture()` | `Three.Floor.redraw` |
| `Scene.itemLoading/itemLoaded/itemRemoved` | `addItem`/`removeItem` | Controller (auto-drag/deselect), example modals |
| `Main.itemSelected/itemUnselected/wallClicked/floorClicked/nothingClicked` | Controller | HUD rotate handle, example context menu |
| `Controls.cameraMovedCallbacks` | `Controls.update()` | `Three.Edge.updateVisibility` per edge |
| `Floorplan.new_wall/new_corner/redraw`, `Wall.moved/action`, `Corner.moved/deleted/action`, `Model.roomSaved/roomDeleted` | various / never | **zero or broken subscribers — dead API** |

At least nine declared buses have no working subscribers (`fireOnMove`, `fireOnAction`, `fireOnRedraw`, `roomSavedCallbacks`…). The design lesson is double-edged: the *granularity* is right (per-object buses, payloads = the object), but nothing marks a bus dead when nobody listens — dead API accumulates silently. A typed bus with an exhaustiveness-checked listener inventory fixes that; the modern rewrite tries (see the modern audit, §2) and only half-succeeds.

2D/3D sync in one sentence: **2D edits mutate the model; `updated_rooms` triggers a full teardown-and-rebuild of the 3D floor/edge layer; the 3D layer never writes to the model.**

## 9. Serialization

`Model.exportSerialized()` (model.ts:52–78) + `Floorplan.saveFloorplan()` (floorplan.ts:192–218). The whole format:

```json
{
  "floorplan": {
    "corners": { "<guid>": { "x": 0, "y": 0 } },
    "walls": [ { "corner1": "<guid>", "corner2": "<guid>",
                 "frontTexture": { "url": "...", "stretch": true, "scale": 0 },
                 "backTexture":  { "url": "...", "stretch": true, "scale": 0 } } ],
    "wallTextures": [],
    "floorTextures": {},
    "newFloorTextures": { "<roomUuid>": { "url": "...", "scale": 0 } }
  },
  "items": [ { "item_name": "...", "item_type": 1, "model_url": "...",
               "xpos": 0, "ypos": 0, "zpos": 0, "rotation": 0,
               "scale_x": 1, "scale_y": 1, "scale_z": 1, "fixed": false } ]
}
```

What the format gets right: rooms are **not serialized** (derived, remembered); corners are a dict keyed by re-hydrated GUID so walls re-link by reference; item type + model URL + transform is enough to reconstruct.

What it gets wrong — a checklist of exactly what not to repeat:

1. **No version field.** Nothing can migrate.
2. **`resizable` is read on load (`newRoom`, model.ts:80–96) but never written by `exportSerialized`** — silently lost every save.
3. **Wall `height`/`thickness` are not persisted** — every wall reverts to config defaults on load.
4. Room UUIDs are positional (sorted corner ids) — any topology change reshuffles texture keys; `updateFloorTextures()` exists to purge the orphans this creates.
5. Textures persist as **relative URLs** — saves are only portable with the same asset tree.
6. Load order is corners → walls → textures → `update()` → items, but items load **async** and `roomLoadedCallbacks` fires before any item exists (the example works around it by counting `itemLoading/itemLoaded`).
7. Dead legacy fields (`wallTextures`, `floorTextures`) ride along forever.

## 10. Rendering

**Walls — `three/edge.ts` (318 LOC), one `Edge` per HalfEdge.** The star of the design:

- **Real holes.** The interior wall face is a `THREE.Shape` in wall-plane coordinates with a rectangular `shape.holes` entry per embedded item (door/window `halfSize` boxes), triangulated by `ShapeGeometry`, then vertices transformed back to world (edge.ts:181–259). Doors and windows are genuinely cut, not faked — correct for the baked axis-aligned models it ships, wrong for anything rotated off-axis (holes are AABBs; `halfSize` never updates with rotation).
- **Hand-rolled UVs**: `u = dist(v1, vertex)/totalDistance`, `v = vertex.y/height`, assigned per-face into `faceVertexUvs`. Non-stretch tiling is done on the texture (`repeat.set(width/scale, height/scale)`).
- **Dollhouse via back-face culling by hand**: `updateVisibility()` (edge.ts:67–97) dots the wall's interior normal with (camera − wall center); `visible = dot >= 0` — you always see interiors, never exteriors between you and a room. It also toggles attached wall items (`updateObjectVisibility` → `item.updateEdgeVisibility(front/back)`), so a poster on the far side of a wall is neither seen nor pickable (the `onlyVisible` raycast filter completes the trick).
- **Five meshes per half-edge**: interior face, exterior face (`fillerMaterial`, flat `#dddddd`), top filler, bottom filler, two side fillers closing the miter gap. All `MeshBasicMaterial` except floors. A lightmap texture is loaded and never used (`// lightMap: lightMap TODO_Ekki`).

**Floors — `three/floor.ts` (103 LOC).** `THREE.Shape` from `room.interiorCorners` **divided by textureScale**, `ShapeGeometry`, then `floor.scale.set(s, s, s)` — the classic trick that makes ShapeGeometry's position-UVs tile the texture every `s` cm (the SO link is right there in the comment). `MeshPhongMaterial`, `DoubleSide`, `receiveShadow`. Roofs exist (`buildRoof`) and are **commented out**: "roofs look weird".

**Frame loop — `three/main.ts` (266 LOC).** A deliberate ~20 fps throttle (`setTimeout(delay=50)` wrapping `requestAnimationFrame`) with a **dirty-flag render**: `shouldRender()` ORs `controls.needsUpdate || controller.needsUpdate || needsUpdate || scene.needsUpdate` and consumes them. Two-pass render: scene → `clearDepth()` → HUD scene (the rotate gizmo lives in its own always-on-top `THREE.Scene`, hud.ts). Idle auto-spin until first pointer enter. `preserveDrawingBuffer: true` for snapshot export. Lights: hemisphere 1.1 + an intensity-0 directional whose only job is shadows (1024², PCFSoft, bias −0.0001); the shadow frustum re-fits to floorplan bounds on every `updated_rooms` (lights.ts:41–65). Skybox: inline-GLSL gradient sphere, r 4000.

**The absence that matters: `dispose()` appears nowhere.** Every `updated_rooms` recreates every `Floor` and `Edge`; old `Geometry`s, materials, and textures are left for GC with GPU resources leaked; textures re-download through `ImageUtils.loadTexture` per rebuild (HTTP cache is the only mitigation); in-wall items force full `ShapeGeometry` re-triangulation of their wall face on **every drag frame** (`redrawWall` in `moveToPosition`). At floor-plan scale nobody noticed. In a game, this is the first thing that kills you.

## 11. Verified bugs & weaknesses (all cited, all reproducible from source)

1. **Corner removal is a silent no-op** — floorplan.ts:141–143 (`this.removeCorner` referenced, never called). Orphaned corners accumulate, pollute picking, and serialize into saves. Introduced by the repo's final commit.
2. **`resizable` lost on save/load** — written never, read always (model.ts:57–96).
3. **WallItem delete-listener leak** — wall_item.ts:162–165: `dontFireOnDelete(this.remove.bind(this))`; `bind` returns a fresh function, so unsubscription never matches registration. Every re-parenting accumulates stale handlers — deleting a *formerly touched* wall later deletes items living elsewhere.
4. **No item-item collision** — commented out, floor_item.ts:62–75; `model.items` referenced by the dead code doesn't even exist anymore.
5. **Room-containment misclassification** — `isInARoom` set per-room (not requiring one consistent containing room), floor_item.ts:44–78.
6. **Zero disposal, whole-layer rebuilds, per-drag re-triangulation** — §10 above.
7. **`halfAngleVector` divides by zero at 180° junctions** — half_edge.ts:285.
8. **`pointInPolygon` dead-code fallback** — utils.ts:214–250: the `startX === undefined` branch is coerced to 0 two lines earlier, so the ray origin is fixed at (0,0); a room containing the origin can misclassify containment.
9. **`Utils.isClockwise` copy-paste bug** — utils.ts:104–106 computes `tSubY` from `p.x` (harmless only because translation preserves winding).
10. **Picking precision** — controller.ts:329–334 normalizes against the window, not the element; `clickPressed(vec2?)` ignores its parameter and always uses the live `mouse` (lines 69–75), so programmatic grabs use a stale position.
11. **Model layer crashes on degenerate input** — room.ts:142–154 ("uh oh" then `edge.prev = prevEdge` throws); `findRooms` is worst-case exponential.
12. **Dead code everywhere** — `PANNING` state, `fireOnMove`/`fireOnAction`/`fireOnRedraw`, `Model.roomSaved/roomDeleted`, legacy save fields, roofs commented out, lightmap unused, `Room`'s header TODO cites npm deps (`vec2`, `segseg`, `polygon`) still in package.json but never imported.
13. **Global mutable config** — `Configuration` is static; `Wall.thickness` reads defaults at class-field init, so config changes after first construction do nothing. Texture paths hardcoded relative to app root.

## 12. Verdict — steal the ideas, not the files

| Area | Reuse conceptually | Adapt | Avoid |
|---|---|---|---|
| Corner/wall graph, self-merge + T-split | ✔ the algorithm (§3) | tolerances as per-caller params | GUID-by-`Math.random` without persistence guarantees |
| Half-edge room derivation, tightest-cycle DFS | ✔ the DCEL shape and CCW filter | planar face-walk instead of exponential DFS | "rebuild every Room object on every edit" |
| Item-type taxonomy (6 placement semantics) | ✔ wholesale — this is the good part | our own factory, our own geometry sources | numeric magic constants without a versioned enum |
| Drag-plane-as-snap, boundMove clamping | ✔ the math (§6) | typed matrix helpers, our planes | monkey-patched `.edge` back-references |
| Wall-hole `Shape` geometry | ✔ the concept (cut real openings) | rotated-hole support, disposal | re-triangulate per drag frame |
| Save format | ✔ derived-rooms-not-serialized, corner dict | version field, stable IDs, full field coverage | every concrete field omission (§9) |
| Dollhouse visibility (normal · camera dot) | ✔ as a cheap trick | already related to our roof hysteresis | none |
| Everything r69/jQuery/ES5 | | | literally all of it — three r69 `Geometry`, `$.Callbacks`, `Face3`, no modules, no dispose |

One-line summary for the next agent: **the original is an architecture diagram drawn in 2016 TypeScript — copy the diagram, redraft every line.**
