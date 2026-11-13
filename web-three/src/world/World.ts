/**
 * The Day 1 block — built procedurally to the original greybox's exact
 * dimensions (its `_build_world`; the migration record is docs/23–24), which implement
 * Doc 10 (Day 1 greybox layout). Palette per Doc 04. Additions beyond the
 * greybox are limited to Doc 04's object canon (water towers, cart string
 * lights) — no new gameplay-bearing geometry.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PAL } from '../core/palette';
import { ITEM_LABELS } from '../core/content';
import { boxFromCenter, type AABB, type RectXZ } from '../engine/collide';
import { approachSpeed, bodyConflictsWithCab, noseLimit, pedestrianSpeedCap, type TrafficBody } from '../engine/traffic';
import {
  buildM121, travelYaw, worldToLeg, legToWorld, aabbToLeg,
  PARKED_CAR_RECTS, parkedCarRect, BUS_BODY, BUS_BAY_ID, KESTREL_COURTESY_ZONES,
  type BusZone, type LegCoords,
} from '../engine/busRoute';
import { buildArticulatedPerson, updatePersonAnim, PERSON_SHADOW_LAYER } from './personRig';
import { SHADOW_HALF, shadowHalfFor } from './shadowLaw';
import { glassSideVisible, type GlassFace } from './interiorGlass';
import { MatBank, makeTree, makeTreePit, makeStreetlight, makeTrashCan, makeRecycleBin, makeHydrant,
  makeSubwayEntrance, makeBulletinBoard, makeBench, makeBusStop, makeNewspaperBoxes, makeBarrier,
  makeACUnit, makeBrownstoneStoop, makeStorefront, makeStool, makeVan,
  makeBarberPole, makeHoop, makeFence, makeParksSign, makeVendorCart,
  makeSignBoard, makeControlHouse, makePergola, makeGardenBed, makeShed,
  makeCompostBin, makeWaterBarrel, makeParkGate, makeSwingSet, makeSandbox,
  makeSprayBasin, SHARED_GEOS, type SignPair } from './props';
import { drawIntoAtlas, atlasMaterial, atlasTexture } from './signAtlas';
import { PigeonFlock, Squirrel, seededRng } from './ambient';
import { fuseFlatParts } from './vertexFuse';
import { FURNITURE_SLOTS, type FurnitureSlot } from './furniture';
import { INTERIOR_SLOTS } from './interiorAssets';
import { makeUtilityPole, makeSpanWires, makePoleSign, makePlanter, makeFireEscapeDeco, makeTrafficSignal } from './streetAssets';
import { makeCornice, makeBrickover, makeDownspout, makeRoofClutter, makeGrassTufts,
  makeLeafPile, makeManhole, makeStormDrain, makePatch, makeStopLine, makeSill,
  makeLintel, makeBandCourse, makeSoot, makeGooseneck, WEAR } from './facadeKit';
// SI (2026-11-11): the borough-character kit — architectural and street
// details PORTED from mrdoob/slop-newyork (MIT) and rebuilt in the
// facadeKit convention. Provenance and part-by-part mapping:
// docs/slop-integration/01-SOURCE-REUSE-REPORT.md; licensing:
// THIRD-PARTY-NOTICES.md (repo root, the merged tree's notice file). The
// World SI pass is the only consumer; the city-fabric pass (main's own
// slop-newyork roofscape) owns tanks/chimneys/bulkheads — this kit keeps
// the chillers, escapes and street pieces.
import { makeHVACUnitNYC, makeCorniceBand,
  makeAwningNYC, makeFireEscapeStack, makeSteamVentNYC, makeSubwayStairNYC,
  makeSubwayGlobePost, makeMailboxNYC, makeScaffoldShedNYC, NYC } from './nycKit';
import { buildSkylineLandmarks } from './skylineLandmarks';
import { LeafDrift } from './leaves';
import { SEASON_DRESSING, seasonForCalendarDay, type Season } from './seasonDressing';
import { Pedestrians, type PedLook, type RoadRect, type RoutineStop } from './peds';
import { buildSubwaySystem, STATION, ZONE_KEEP_RE, type SubwaySystem, type ColliderSpec } from './subway';
import { buildTimesSquare, type TimesSquare } from './timesSquare';
import { buildArrivalBus, BUS04_RECT, playerOccupiesBus04, type ArrivalBus } from './arrivalBus';
import { buildCityFabric } from './cityFabric';
import { groundMaterial, metricBoxUVs } from './groundTex';
// the fenestra windows (docs/production/fenestra/): interior-mapping after
// J. van Dongen 2008, adapted from codedgar/three-fenestra (MIT) — the
// technique study lives in docs/57 §3.8. Core = the pure laws + collector;
// Material = the Lambert injections + instanced mesh builder.
import { collectWindowPlan, FEN_BANDS_BY_TIER, fenBandOf, bandValues,
  type FenestraInstance } from './fenestraCore';
import { FenestraMaterial, fenestraMeshFromPlan, loadFenestraAtlas,
  applyAtlasMaxLod, type FenestraMesh } from './fenestraMaterial';
import { EnvSky } from '../render/envsky';
import { sampleDayCycle, keyframeState, freshDayState, CANON_MINUTES, type DayState, type DayPin } from '../render/daycycle';
import { buildNeighborhoodFabric, NEIGH, TERRACE_GATES } from './neighborhoodFabric';
import { ambientWindowPlan, barrierDiary, flyerSlipForDay, hallNoticeForDay,
  skylineWindowMask, skylineDiaryIndices, skylineDiaryWarmth, SKYLINE_WARMTH,
  STREET_PLAN, PEDESTRIAN_ROLES, type StreetPlan } from './dressing';
import { D4_LAUNDRY_SIGN, D4_NOTICE_TITLE, D4_NOTICE_LINES, D4_RECEIPT_TEXT,
  RECORD_SIGN_TOP, RECORD_SIGN_SUB } from '../core/content';
// the half-court upgrade (docs/48/49) — basketball-owned module, the one
// sanctioned import seam between the world and the court
import { paintCourtCanvas, makeCourtSurface } from '../court/courtPaint';
import { makeNet, makePolePad, makeCourtLight, makeTallyBoard, buildBackstop,
  type CourtNet, type TallyBoard } from '../court/courtDressing';
import { makeBasketball } from '../court/Basketball';
import { COURT_BALL_REST } from '../game/interactionDefs';
// A-3 (DEC-4, 2026-11-07): the registry geometry flip — a flipped building's
// placement and dimensions read the construction truth (world-registry.json)
// at runtime; the per-style builder code stays. The registry already drives
// the nav graph, the doors and the capacity gates; this extends the same
// single truth to the render coordinates.
import { loadRegistry } from '../sim/registry';
import { PASSABLE_FOOTPRINTS } from '../sim/nav/build';

export interface LadderInfo { area: AABB; top: number; }

/** A W5 interior's toggle handle (docs/47 W5): the room's fit-out group,
 *  its shell rect, the near/far pane parts, and the tower pieces that duck
 *  while the player is inside. Declared at module level — classes can't
 *  host interfaces. */
interface InteriorHandle {
  id: string;
  x0: number; x1: number; z0: number; z1: number; // the registry shell
  /** The inside test's y-band (CECIL-ROOM rides y 8.35; shops ride y 0). */
  yBand?: [number, number];
  /** Extra near-band margin on the z1 side — the Cecil's top landing sits
   *  2.5 m past the shell (the room shows while you stand at the rail). */
  padZ1?: number;
  /** The room's glass runs (docs/51 B13 — interiors' window visibility):
   *  the near band shows the fit-out only through these. Every W5 room
   *  registers the runs its builder cut; a room that ever skips the
   *  registration falls back to the shipped band-only law. */
  glass?: GlassFace[];
  group: THREE.Group;                 // the fit-out (near only)
  nearParts: THREE.Object3D[];        // clear panes (near only)
  farParts: THREE.Object3D[];         // shipped glass faces (far only)
  duck: THREE.Object3D[];             // the tower above, hidden while inside
  near?: boolean;
  inside?: boolean;
}

export class World {
  readonly scene = new THREE.Scene();
  readonly colliders: AABB[] = [];

  // zones (main.gd areas)
  readonly crosswalkZone: AABB;
  readonly insideBodegaZone: AABB;
  readonly topLandingZone: AABB;
  readonly ladder1: LadderInfo;
  readonly ladder2: LadderInfo;
  readonly killY = -12;

  // dynamic visual handles
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly skyUniforms: { topColor: THREE.Color; horizonColor: THREE.Color; groundColor: THREE.Color };
  readonly fog: THREE.FogExp2;
  readonly roof: THREE.Mesh;
  readonly goldWindowMat!: THREE.MeshLambertMaterial;
  readonly secondWindowMat!: THREE.MeshLambertMaterial;
  readonly rosaWindowMat!: THREE.MeshLambertMaterial;
  readonly cartRoot: THREE.Group;
  readonly cartMat: THREE.MeshLambertMaterial;
  readonly cartSign: THREE.Sprite;
  readonly cartAwning: THREE.Group;
  readonly stringLights: THREE.Group;
  /** The street cab. After a successful car_taxi.glb upgrade this getter
   *  returns the WRAPPER that now wears the generated mesh — so update()'s
   *  lane logic keeps moving the visible car, never a detached ghost. */
  get taxi(): THREE.Group {
    return (this.glbProps.get('car_taxi') as THREE.Group | undefined) ?? this.taxiBase;
  }
  /** World-space canopy spheres for the camera's sight-line guard
   *  (GameCamera.pickSideStep) — the trees report themselves. */
  canopySpheres(): Array<{ x: number; y: number; z: number; r: number }> {
    return this.canopySpheresCache;
  }
  /** Per-canopy occlusion written by the camera each frame (1 = the sight
   *  line runs through that canopy). Game wires this once at boot; the
   *  update pass dissolves occluded canopies toward gauze so the street
   *  never hides the player behind its own leaves. */
  canopyOcclusion: Float32Array | null = null;
  private taxiBase: THREE.Group;
  /** The cab's collider — boxFromCenter once, then moved every frame. */
  readonly taxiCollider: AABB;
  // ---- W4 part 2: the M121 (registry transit.bus, routes V-BUS) ----------
  /** The route law, built once (engine/busRoute). */
  private readonly M121_LEGS = buildM121();
  /** The district's bus — the dedicated low-poly body (the open §7 decision:
   *  a scaled car reads as a stretched car; a long box with a window band,
   *  a curb-side door and the M121 rollsign reads as a bus). NOT glb-
   *  upgradable — the seam is the cab's experiment, not the fleet's. */
  private busGroup!: THREE.Group;   // built in buildAlderHeightsW4Traffic (constructor)
  /** The bus's collider — the yaw-aligned body's AABB superset, synced
   *  every frame like the cab's (a body you can ghost through reads broken). */
  busCollider!: AABB;
  /** The rail state: which leg, the CENTER's advance, the lateral offset
   *  (0 = drive lane, + = the curb pull-out), the stop dwell left, laps
   *  done, the eased yaw, and the night flag (the bay dwells through the
   *  night — the dusk law). Deterministic: authored dwells, no randomness.
   *  BOOT: leg 3 a 10 — the bus wakes mid-lap on Sycamore Ave, ~26 game-s
   *  from its first bay visit. It does NOT boot in the bay: the bay holds
   *  the registry's enterable BUS-04 (the bus that delivered you), and
   *  probe-subway's fixed-time boarding must always find it standing —
   *  the old boot-in-bay parked the loop body on top of BUS-04 (docs/47
   *  "the terminal bay, made honest"). */
  private readonly busState = {
    leg: 3, a: 10, lat: 0,
    dwell: 0, laps: 0, yaw: Math.PI / 2, night: false, servedStop: null as string | null,
    baySkipped: false,
  };
  /** BUS-04's colliders, captured at boot — retired while the loop body
   *  occupies the bay, re-pushed when the bay is its own again. */
  private readonly arrivalBoxes: AABB[] = [];
  private arrivalHidden = false;
  /** The cart is furniture now: it has a collider, so "he passed through the
   *  cart" is over (playtest 2026-10-30). Static — it never moves. */
  readonly cartCollider: AABB;
  /** Person colliders for the cast, synced under them every frame (the taxi
   *  precedent: a body you can ghost through reads as broken). Disabled by
   *  parking the box underground while the actor is hidden. */
  readonly rosaCollider: AABB;
  readonly idrisCollider: AABB;
  readonly kidCollider: AABB;
  /** The transient customer at the cart — Game syncs this one (it owns
   *  spawning/removal); World.update handles the persistent cast. */
  readonly customerCollider: AABB;
  // Agent-2 solidity (doc 35 Q2): the rest of the walking cast gets bodies
  // too — the stranger, Sal and the familiar face were ghosts in the audit.
  readonly strangerCollider: AABB;
  readonly salCollider: AABB;
  readonly familiarCollider: AABB;
  /** The Day-3 stool's body — parked underground until the purchase makes
   *  it real; synced in updateDynamics like the cast. */
  readonly stoolCollider: AABB;
  /** The water-main barrier's body — parked underground the day the city
   *  takes it (Day 4's diary); synced in updateDynamics like the cast. */
  readonly barrierCollider: AABB = boxFromCenter(-9.7, 0.45, 7.62, 1.7, 0.9, 0.56);
  /** Roam law (freeroam.ts): the barrier stands down while Roam is active,
   *  so the whole built block is walkable from the first minute. dressDay
   *  respects the override; leaving Roam restores the authored diary (the
   *  barrier's last day is Day 3). */
  barrierOpen = false;
  readonly rosa: THREE.Group;
  readonly idris: THREE.Group;
  readonly kidSil: THREE.Group;
  readonly goldGlow: THREE.Sprite;
  readonly secondGlow: THREE.Sprite;
  // ---- Day 3 + the living street (docs/28, workstreams A/B) ----
  readonly thirdWindowMat!: THREE.MeshLambertMaterial;
  readonly thirdGlow: THREE.Sprite;
  readonly kidGround: THREE.Group;   // the kid at ground level (Day 3)
  readonly stool: THREE.Group;       // the Day 3 purchase, hidden until bought
  readonly flyerMat: THREE.MeshLambertMaterial;
  // ---- Day 4 — "Say Hi" (docs/29) ----
  readonly stranger: THREE.Group;    // the new arrival — the player's Day-1 mirror
  readonly fourthWindowMat!: THREE.MeshLambertMaterial; // the lamp next door
  readonly fourthGlow: THREE.Sprite;
  // ---- Day 4 afternoon — the block opens up (docs/30) ----
  readonly sal: THREE.Group;         // Sunrise Laundry, thirty years at the counter
  readonly permitReceipt: THREE.Group; // propped on the cart once the permit is filed
  // ---- the living block (Doc 33 §2.2/§2.3, dressing.ts) ----
  readonly familiar: THREE.Group;    // the familiar face — one recurring neighbor
  readonly barrier: THREE.Group;     // the water-main barrier (gone by Day 4)
  readonly asphaltPatch: THREE.Mesh; // fresh asphalt where the barrier stood
  readonly ambientWindowMatLate!: THREE.MeshLambertMaterial;   // got home late → away
  readonly ambientWindowMatNew!: THREE.MeshLambertMaterial;    // someone new, Day 3
  readonly ambientWindowMatRiser!: THREE.MeshLambertMaterial;  // the early riser, Day 4
  readonly skylineWinMat!: THREE.MeshLambertMaterial;          // the far city, always on at dusk
  readonly skylineWinDiaryMat!: THREE.MeshLambertMaterial;     // two windows across the avenue, day-keyed

  // ---- fenestra: the interior-mapping windows (docs/production/fenestra) --
  // The plan collects BEFORE the bake (the named proud-window rows must
  // exist); the planes build AFTER it (instanced draws own themselves, but
  // the collector needs the source boxes alive). Two instanced meshes —
  // one per family — ride the whole block (the shipped skyline-pane
  // precedent: frustumCulled false, depth-tested, fogged).
  private fenestraPlan: FenestraInstance[] = [];
  private fenestraMeshes: FenestraMesh[] = [];
  private fenestraMats: FenestraMaterial[] = [];
  private fenestraBands: Uint8Array = new Uint8Array(0);
  private fenestraBandDist: { full: number; far: number } = FEN_BANDS_BY_TIER.high;
  private fenestraEnabled = true;
  private fenestraBandTimer = 0;
  /** The half-court ball (docs/38): rests by the key, flies when shot.
   *  Excluded from the static bake — it moves. (Assigned by buildCourt.) */
  ball!: THREE.Mesh;
  // ---- the far world (docs/50): the K line, Times Square, the M121 ----
  readonly subwayRoot = new THREE.Group();
  subway!: SubwaySystem;
  timesSquare!: TimesSquare;
  arrivalBus!: ArrivalBus;
  /** The named street-dressing groups (the vendor cart, the fruit stand)
   *  the curb bake may merge WITHIN — never across groups. They are
   *  scene-level statics that must not join a district tile (they sit off
   *  the tile grid's assumptions), so the zone-bake law applies one level
   *  down instead (docs/51 B13, the curb bake). */
  private readonly zoneDressing: THREE.Group[] = [];
  /** The subway cast rigs (Priya, the busker, riders) — one breathe tick. */
  private readonly subwayCast: THREE.Group[] = [];
  /** Beat buffers Game drains each frame (ride notes, the sync beat). */
  readonly subwayBeats: string[] = [];
  readonly tsBeats: string[] = [];
  /** The day the far world was last told about (the sync is day-keyed). */
  private worldDay = 1;
  /** Terminal meshes the dollhouse lifts when the player is underground —
   *  collected by position at build time, so Main Agent's dressing needs
   *  no naming cooperation. */
  private readonly terminalShell: THREE.Mesh[] = [];
  private dollhouseOn = false;
  /** The terminal mass's collider — lifted with the dollhouse (the boom
   *  ray-cast must see the cutaway the lens sees, and the player below
   *  grade never needs a building's collision anyway). */
  private terminalCollider: AABB | null = null;
  /** Door colliders by spec, so a re-open can find and splice them out. */
  private readonly subwayColliderBySpec = new Map<ColliderSpec, AABB>();
  // ---- the half-court upgrade (docs/48/49) ----
  courtNet!: CourtNet;      // swishes on a make
  courtTally!: TallyBoard;  // the chalk score on the wall
  courtGlow!: THREE.Mesh;   // the gooseneck's warm disc (dusk)
  courtWeaves: THREE.Mesh[] = []; // camera fades these point-blank
  /** The day the flyer board is currently dressed for (slips rotate by day). */
  private flyerDay = 1;
  private washerLoad: THREE.Mesh | null = null;
  private washerRunning = false;
  private readonly bank: MatBank;
  private readonly trees: Array<{
    group: THREE.Group; phase: number; fade: number;
    /** canopy pivot + placement — the instanced tick composes
     *  T(x, baseY+h, z)·R_y(yaw)·R_sway·T(blob)·S(r) per blob */
    x: number; z: number; baseY: number; h: number; yaw: number;
    /** this tree's sphere in canopySpheresCache — the fade reads ITS
     *  occlusion entry (the old loop assumed shipped-first cache order;
     *  the W1 rows' spheres actually interleave, so the fills faded from
     *  the wrong spheres — fixed by naming the index explicitly) */
    sphereIndex: number; top: number;
    blobs: Array<{ ox: number; oy: number; oz: number; r: number; key: 0 | 1 | 2 | 3; idx: number }>;
  }> = [];
  /** Canopy bounding spheres for the camera's sight-line guard. */
  private readonly canopySpheresCache: Array<{ x: number; y: number; z: number; r: number }> = [];
  /** Every tree pit the world laid (the quality pass grows grass in each —
   *  recorded at placement so the pass never re-derives coordinates). */
  private readonly treePits: Array<{ x: number; z: number }> = [];
  /** The visual-quality pass's ledger (docs/3d-assets): what it built and
   *  where, recorded BEFORE bakeStatics merges the bare meshes into their
   *  district tiles — the named groups survive the bake, the bare meshes
   *  become tile vertices, and this list is the probe's ground truth. */
  readonly vqLedger: Array<{ name: string; x: number; y: number; z: number }> = [];
  private readonly pigeonFlock: PigeonFlock;
  private readonly pigeonFlockEast: PigeonFlock; // the east end gets its own small knot of birds
  private readonly squirrel: Squirrel;
  private leaves!: LeafDrift;
  private peds: Pedestrians;
  private ambientTime = 0;
  // ---- the street schedule (M4, world/dressing STREET_PLAN) ----
  /** The dusk flag this World last saw — null until the first update, so
   *  the day plan applies exactly once at boot. The lever stays Game's
   *  (the dusk flag); the schedule table stays dressing's; World only
   *  applies the row on the edge. */
  private streetPhaseDusk: boolean | null = null;
  /** The applied plan's cab multiplier — updateTaxi reads it every frame
   *  (one multiply, hot-path cold). */
  private cabPaceNow = 1;
  /** The applied plan — probes read this (the schedule's wiring, provable
   *  without sampling). */
  streetPlanNow(): StreetPlan {
    return STREET_PLAN[this.streetPhaseDusk ? 'dusk' : 'day'];
  }

  /** Read-only XZ of every ambient walker (diagnostics + probes). */
  pedBodies(): Array<{ x: number; z: number }> {
    return this.peds ? this.peds.bodies() : [];
  }

  /** The frame's Shuffle brushes (docs/51 B16) and clears the batch. The
   *  walkers already said their "'Scuse me." in-world (the bubble rides
   *  peds.update); the orchestrator drains so the queue never grows —
   *  brushing is a correct interaction, nothing to count, nothing to lose. */
  drainBrushes(): Array<{ i: number; x: number; z: number }> {
    return this.peds ? this.peds.drainBrushes() : [];
  }

  /** Live position of ambient walker `i` — the interaction registry's walker
   *  conversations read this every frame (Doc 37 §3B: moving NPCs stay live).
   *  Out of range → parked below the world (the y-band excludes it). */
  walkerPos(i: number): { x: number; y: number; z: number } {
    return this.peds ? this.peds.bodyAt(i) : { x: 0, y: -100, z: 0 };
  }

  /** How many ambient walkers exist — the shuffle's brush slots ride this
   *  (docs/51 B16: one cooldown per walker, sized once per frame). */
  walkerCount(): number {
    return this.peds ? this.peds.walkColliders.length : 0;
  }

  /** Arm navigation-aware commuting (WP-3v): the game layer hands the
   *  walkers its view of the ONE navigation graph (destinations, street
   *  routing, the availability epoch) and a seed base. The walkers keep
   *  Yuka's steering stack and every shipped hard guarantee — they gain
   *  destination movement over the graph. Pure pass-through; safe before
   *  the roster exists (a no-op), safe to call once at boot. */
  setPedCommute(ctx: import('./pedCommute').CommuteContext, seed: number): void {
    if (this.peds) this.peds.setCommute(ctx, seed);
  }

  /** Ambient commute diagnostics for probes/tests. */
  pedCommutesWalked(): number {
    return this.peds ? this.peds.commutesWalked() : 0;
  }

  private steamPoints: THREE.Points;
  private steamSeed: Float32Array;
  private steamLife: Float32Array;

  // ---- district system (docs/45 W0 — the culling prerequisite) ----------
  // The master world grew with the registry's playableCore (W6 z ±64, W7
  // x ±100); the TILE GRID keeps its shipped 28 m × 32 m lattice over the
  // W0 core — content beyond it (the terrace strips, the Westgate/Eastgate
  // rows) CLAMPS into the edge tiles (districtKey's own law), so the edge
  // tiles carry the new strips and nothing ever goes unlit or unculled.
  // Static geometry bakes per DISTRICT TILE — 28 m columns × 32 m rows — and
  // every tile plus registered dynamic groups belongs to a district. Each
  // frame the player's district lights a RING of districts and everything
  // outside it goes invisible (frustum culling then does the rest). The
  // ring rule follows the registry's own law: a street is ONE sight line,
  // so the ring spans every column along it (STREET_RING = all) and 1 row
  // of depth each way (ROW_RING = 1 = the block behind each sidewalk).
  private static readonly DIST_COL_W = 28;   // x: −84..84 in 6 columns (W7 strips clamp into c0/c5)
  private static readonly DIST_ROW_H = 32;   // z: −48..48 in 3 rows (W6 strips clamp into r0/r2)
  private static readonly DIST_COLS = 6;
  private static readonly DIST_ROWS = 3;
  private static readonly STREET_RING = World.DIST_COLS; // one sight line, for now
  private static readonly ROW_RING = 1;
  /** Baked meshes keyed by district (c<col>r<row>). */
  private readonly districtBatches = new Map<string, THREE.Mesh[]>();
  /** Dynamic groups registered to a district (trees, flocks, glb props). */
  private readonly districtProps = new Map<string, THREE.Object3D[]>();
  /** Object → its district key (so a re-registration can move it). */
  private readonly districtOf = new Map<THREE.Object3D, string>();
  /** The district the visibility pass last applied (skip redundant writes). */
  private lastDistrict = '';

  // ---- the shadow follow (docs/47 lever 1 — Doc 07's reaching lever) ----
  // The sun's shadow camera was a FIXED ±60 m box over the whole street:
  // every caster inside it re-rendered into the shadow map every frame,
  // view-independent — a corner rig paid ~430 calls for a map it never
  // sampled, and the shadow pass measured 44–84% of every census rig.
  // The box now follows the player at SHADOW_HALF (the recorded ±35–40
  // range's tighter end — the recorded est). Near-field shadows,
  // the ones the player actually stands in, keep their exact texels; casters
  // beyond the box edge no longer render into the map, which is the recorded
  // art trade (long dusk shadows fade out ~SHADOW_HALF m from the player).
  // Below grade the box shrinks to the underground economy's half (see
  // shadowLaw.ts) — setUndergroundShadow applies it on the dollhouse flip.
  private static readonly SHADOW_HALF = SHADOW_HALF;
  /** The authored light offset (position − target): the reference's rotation
   *  (-28, -60). The follow moves BOTH poles by the same snapped delta, so
   *  the light direction never changes by a thousandth of a degree. */
  private readonly sunOffset = new THREE.Vector3(-38, 23, 22);
  /** The shadow camera's own basis (Matrix4.lookAt, world-up), precomputed
   *  once — the follow snaps the target onto this lattice so the map's texel
   *  grid stays world-aligned while the box moves (no edge shimmer as the
   *  player walks). At 2048 px / 80 m the light-space texel is 0.039 m; the
   *  ground projection at the sun's ~28° elevation stretches it to ~0.084 m
   *  along the shadow direction — snapping in LIGHT SPACE handles both. */
  private readonly sunBasis = {
    back: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    texel: 0,
  };
  /** The lattice coords the shadow box last snapped to (skip redundant writes). */
  private sunU = Number.NaN;
  private sunV = Number.NaN;
  /** The underground economy's current state (skip redundant shadow writes). */
  private undergroundShadow = false;

  /** A baked mesh's district from its world position (mesh center). */
  private static districtKey(x: number, z: number): string {
    const col = Math.max(0, Math.min(World.DIST_COLS - 1, Math.floor((x + 84) / World.DIST_COL_W)));
    const row = Math.max(0, Math.min(World.DIST_ROWS - 1, Math.floor((z + 48) / World.DIST_ROW_H)));
    return `c${col}r${row}`;
  }

  /** Register a dynamic group so the district pass owns its visibility.
   *  Only ever-visible world content goes here — anything Game toggles
   *  (cart wearables, cast, barrier diary) stays unregistered. Safe to call
   *  again for the same object (moves it between districts). */
  private registerDistrictObject(obj: THREE.Object3D, x: number, z: number): void {
    const prev = this.districtOf.get(obj);
    if (prev) {
      const list = this.districtProps.get(prev);
      if (list) {
        const i = list.indexOf(obj);
        if (i >= 0) list.splice(i, 1);
      }
    }
    const key = World.districtKey(x, z);
    this.districtOf.set(obj, key);
    let list = this.districtProps.get(key);
    if (!list) this.districtProps.set(key, list = []);
    list.push(obj);
  }

  /** Light the ring of districts around the player, dark the rest.
   *  Called from updateDynamics with the live player position. */
  private updateDistricts(px: number, pz: number): void {
    const col = Math.max(0, Math.min(World.DIST_COLS - 1, Math.floor((px + 84) / World.DIST_COL_W)));
    const row = Math.max(0, Math.min(World.DIST_ROWS - 1, Math.floor((pz + 48) / World.DIST_ROW_H)));
    const key = `c${col}r${row}`;
    if (key === this.lastDistrict) return;
    this.lastDistrict = key;
    for (let c = 0; c < World.DIST_COLS; c++) {
      const colIn = Math.abs(c - col) <= World.STREET_RING;
      for (let r = 0; r < World.DIST_ROWS; r++) {
        const inRing = colIn && Math.abs(r - row) <= World.ROW_RING;
        const dk = `c${c}r${r}`;
        for (const m of this.districtBatches.get(dk) ?? []) m.visible = inRing;
        for (const o of this.districtProps.get(dk) ?? []) o.visible = inRing;
      }
    }
  }

  /** Move the sun's shadow box to the player, snapped onto the shadow map's
   *  texel lattice (docs/47 lever 1). Snapping in LIGHT SPACE — round the
   *  target's (u, v) on the shadow camera's own basis to whole texels —
   *  keeps the map's texel grid world-aligned while the box moves, so shadow
   *  edges never shimmer as the player walks. The light direction is the
   *  authored offset vector, bit-for-bit, on every frame. */
  private updateSunFollow(px: number, pz: number): void {
    const b = this.sunBasis;
    // light-space coords of the desired target (y folded into the basis dots)
    const u = px * b.right.x + pz * b.right.z;
    const v = px * b.up.x + pz * b.up.z;
    const us = Math.round(u / b.texel) * b.texel;
    const vs = Math.round(v / b.texel) * b.texel;
    if (us === this.sunU && vs === this.sunV) return; // same texel cell — skip
    this.sunU = us;
    this.sunV = vs;
    const w = px * b.back.x + pz * b.back.z; // depth along the light (unsnapped)
    this.sun.target.position.set(
      b.right.x * us + b.up.x * vs + b.back.x * w,
      b.right.y * us + b.up.y * vs + b.back.y * w,
      b.right.z * us + b.up.z * vs + b.back.z * w,
    );
    this.sun.position.copy(this.sun.target.position).add(this.sunOffset);
  }

  /** The underground shadow economy (docs/51 B13): on the dollhouse flip the
   *  sun's box shrinks to SHADOW_HALF_UNDERGROUND — the open-top cutaway's
   *  own casters live within ~15 m, so only the street beyond the box edge
   *  stops paying the shadow pass (measured: PLATFORM_A 166 → 130, the real
   *  lens 254 → 211, the platform's own shadows bit-identical on the evidence
   *  frames). Surfacing restores the street half bit-for-bit; the texel
   *  lattice recomputes (it rides the box size) and the snap coords reset so
   *  the next follow re-snaps onto the new lattice. */
  private setUndergroundShadow(under: boolean): void {
    if (under === this.undergroundShadow) return;
    this.undergroundShadow = under;
    const half = shadowHalfFor(under);
    const cam = this.sun.shadow.camera;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.updateProjectionMatrix();
    this.sunBasis.texel = (2 * half) / this.sun.shadow.mapSize.x;
    this.sunU = Number.NaN;
    this.sunV = Number.NaN;
  }

  /** Decorative props a generated .glb (public/models/<id>.glb) may replace. */
  private glbProps = new Map<string, THREE.Object3D>();
  /** Null after a failed load — one broken loader shouldn't retry all game long. */
  private glbLoader: GLTFLoader | null = new GLTFLoader();
  /** Which props ended up wearing a generated .glb, and from which file. */
  readonly glbUpgrades = new Map<string, string>();
  /** ABO furniture (docs/57): which slots ended up wearing a real model,
   *  and from which file — the probe's evidence map. */
  readonly furnitureUpgrades = new Map<string, string>();
  /** The renderer-backed loader (KTX2 transcoder + meshopt decoder) is
   *  configured once the Game owns its renderer; furniture upgrades fire
   *  from that call. Until then the street-seam loader loads plain GLBs. */
  private furnitureWired = false;
  /** The renderer handle (Game hands it over once, with the GLB decoders);
   *  the fenestra atlas LOD clamp needs the GL context at upload time. */
  private rendererRef: THREE.WebGLRenderer | null = null;

  // ---------------- the graphics wave (docs/rendering/) ----------------
  /** The sky dome's material (the applier writes its halo/nightK uniforms). */
  private skyMat!: THREE.ShaderMaterial;
  private skyDome!: THREE.Mesh;
  /** The CURRENT interpolated day state — Game reads bloom/grade/exposure
   *  from it each frame and feeds the post pipeline. */
  readonly dayState: DayState = freshDayState();
  /** The sampling scratch (the target state the current lerps toward). */
  private dayScratch: DayState = freshDayState();
  /** null = clock-driven (roam/scenario); a keyframe name = a story pin. */
  private dayPin: DayPin | null = 'evening';
  private dayMinute = -1;
  /** The night emissive registry (docs/rendering/03 §5): streetlights,
   *  traffic greens, storefront strips, warm interiors — base → night
   *  intensity, driven by nightK. Story windows stay Game-owned. */
  private nightEmissives: Array<{ mat: THREE.MeshLambertMaterial; base: number; night: number }> = [];
  /** The PMREM sky environment (built when Game wires the renderer). */
  private envSky: EnvSky | null = null;
  private envDirty = true;
  /** The sim-minute of the last environment rebuild — the clock-driven
   *  rebuild throttle (the stage-9 wave's repair of the graphics wave's
   *  env-churn defect): under a continuously advancing clock the settle
   *  gate alone re-armed the PMREM rebuild every few frames, and each
   *  rebuild's cost on software GL collapsed the frame wall-throughput
   *  the validation scenarios' wall-clock budgets assume. The sky's own
   *  lerp carries the between-rebuild look; the env map (the PBR heroes'
   *  reflections) may lag the clock by up to this granularity — the six
   *  keyframe bands are ~240 sim-min wide, so a 20 sim-min floor keeps
   *  the reflections honest while the rebuilds stay "a few per in-game
   *  day", which is what this throttle's own comment always promised.
   *  The explicit pins (?tod, the story beats' pinDayState) bypass the
   *  floor — a rig's rebuild is a statement, not a clock tick. */
  private lastEnvRebuildMinute = -1;
  private static readonly ENV_REBUILD_MIN_SIM_MIN = 20;
  /** Glow sprites (billboards) — excluded from the AO normal prepass. */
  private glowSprites: THREE.Sprite[] = [];
  /** The AO prepass exclusion list (far world + movers + billboards). */
  private aoExcludeList: THREE.Object3D[] = [];
  /** Public read for the Game's PostPipeline (CityAOPass hides these). */
  get aoExclude(): readonly THREE.Object3D[] { return this.aoExcludeList; }
  /** The day-state scalar keys, computed once (no per-frame Object.keys). */
  private static readonly DAY_KEYS = Object.keys(freshDayState()) as Array<keyof DayState>;

  constructor() {
    const scene = this.scene;
    // FogExp2 (the graphics wave): squared-exponential aerial perspective —
    // the far skyline melts into the horizon color instead of hard-cutting
    // at the old linear near/far. Density is keyed per day state
    // (applyDayState); ~0.0055 ≈ the shipped (40,170) linear feel at street
    // ranges with a far tail the skyline rows now ride.
    scene.fog = this.fog = new THREE.FogExp2(PAL.amber, 0.0055);
    // the material bank exists before anything is built — signs need its
    // shared plain materials (W0: sign edges bake-merge per district)
    this.bank = new MatBank((c) => this.mat(c));

    // ---------------- sky (the wave: sun halo + night stars) ----------------
    this.skyUniforms = {
      topColor: new THREE.Color(PAL.amber).setHex(0x7fa7c9),
      horizonColor: new THREE.Color(PAL.amber),
      groundColor: new THREE.Color(PAL.amber),
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: this.skyUniforms.topColor },
        horizonColor: { value: this.skyUniforms.horizonColor },
        groundColor: { value: this.skyUniforms.groundColor },
        sunDir: { value: this.sunOffset.clone().normalize() },
        haloColor: { value: new THREE.Color(PAL.amber) },
        haloStrength: { value: 0.65 },
        nightK: { value: 0 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 groundColor;
        uniform vec3 sunDir; uniform vec3 haloColor; uniform float haloStrength;
        uniform float nightK;
        varying vec3 vDir;
        float hash13(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.zyx + 31.32);
          return fract((p.x + p.y) * p.z);
        }
        void main() {
          float h = vDir.y;
          vec3 col = h >= 0.0
            ? mix(horizonColor, topColor, pow(min(h, 1.0), 0.55))
            : mix(horizonColor, groundColor, pow(min(-h, 1.0), 0.5));
          // the sun's halo — atmosphere scatters most toward the sun
          // (docs/rendering/02, the sky chapter's core insight, adapted)
          float sd = max(dot(normalize(vDir), sunDir), 0.0);
          col += haloColor * (pow(sd, 14.0) * 0.45 + pow(sd, 60.0) * 0.7) * haloStrength;
          // night stars — hash sparkle above the roofline, gated by nightK
          if (nightK > 0.02 && h > 0.04) {
            float star = step(0.9986, hash13(floor(vDir * 300.0)));
            col += vec3(star) * nightK * 0.7 * smoothstep(0.04, 0.3, h);
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.skyMat = skyMat;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 16), skyMat);
    sky.frustumCulled = false;
    sky.name = 'SkyDome';
    scene.add(sky);
    this.skyDome = sky;

    // ---------------- lights (main.gd "--SETUP--") ----------------
    // three r155+ physical lights: intensities need the legacy π factor to
    // match the original greybox's light energies.
    this.hemi = new THREE.HemisphereLight(0xfff3dd, 0x8a7666, phys(1.0));
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(PAL.amber, phys(1.3));
    this.sun.position.copy(this.sunOffset);  // rotation (-28, -60) in the reference
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -World.SHADOW_HALF;
    this.sun.shadow.camera.right = World.SHADOW_HALF;
    this.sun.shadow.camera.top = World.SHADOW_HALF;
    this.sun.shadow.camera.bottom = -World.SHADOW_HALF;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.03; // large flat walls — kill shadow acne crawl
    // the shadow economy's second half (docs/51 B13): the sun's pass also
    // sees the person shadow-proxy layer, where every figure's ONE merged
    // silhouette lives (personRig). Without this the proxies would be
    // invisible to the shadow camera and every human would lose their shadow.
    this.sun.shadow.camera.layers.enable(PERSON_SHADOW_LAYER);
    scene.add(this.sun);
    scene.add(this.sun.target);
    // the follow lattice (the basis Object3D.lookAt builds: back = toward the
    // light, right = up × back, up = back × right) — computed once, the sun
    // never rotates
    this.sunBasis.back.copy(this.sunOffset).normalize();
    this.sunBasis.right.set(0, 1, 0).cross(this.sunBasis.back).normalize();
    this.sunBasis.up.crossVectors(this.sunBasis.back, this.sunBasis.right);
    this.sunBasis.texel = (2 * World.SHADOW_HALF) / this.sun.shadow.mapSize.x;

    // ---------------- ground & street (street runs along X) ----------------
    // The graphics wave: the road and walks wear procedural asphalt/concrete
    // (groundTex) with metric UVs — they leave the vertex bake automatically
    // (the bake skips mapped materials) and gain grain, joints and wear.
    this.groundSolid('Road', 0, -0.1, 0, 100, 0.2, 8, 'asphalt');
    // Sidewalk_N is split around the subway stairwell slot (x -45.9..-43.3,
    // docs/50): same material, same top, two slabs — the descent opens the
    // walking lane exactly where the headhouse always stood beside it.
    this.groundSolid('Sidewalk_N_W', -49.25, -0.05, 6, 1.5, 0.3, 4, 'concrete');
    this.groundSolid('Sidewalk_N_E', 2.05, -0.05, 6, 95.9, 0.3, 4, 'concrete');
    this.groundSolid('Sidewalk_S', 0, -0.05, -6, 100, 0.3, 4, 'concrete');
    for (let i = 0; i < 6; i++) {
      // lifted clear of the road top (coplanar bottoms shimmered at grazing angles)
      this.deco('Crosswalk', -5, 0.03, -3.3 + i * 1.3, 3, 0.02, 0.6, PAL.cream);
    }
    // granite curbs along both road edges — the line that separates "road"
    // from "sidewalk" in every NYC paused frame. Curb-cut gap at the crosswalk
    // (x -8..-1), because that is where people actually step across. Stepped
    // on everywhere anyway (13 cm is a step, not a wall) — visual only.
    const CURB = 0x8f8a82;
    this.solid('Curb_N_W', -29, 0.065, 4.08, 42, 0.13, 0.5, CURB, { collide: false });
    this.solid('Curb_N_E', 24.5, 0.065, 4.08, 51, 0.13, 0.5, CURB, { collide: false });
    this.solid('Curb_S_W', -29, 0.065, -4.08, 42, 0.13, 0.5, CURB, { collide: false });
    this.solid('Curb_S_E', 24.5, 0.065, -4.08, 51, 0.13, 0.5, CURB, { collide: false });

    // ---------------- buildings ----------------
    // A-3 UNITS 8+9 (the shipped street's class B/A bands, DEC-4 Option B
    // standing ruling — the continuation series COMPLETED): every shipped-
    // street mass READS its registry row through regShell — KTN-01 the
    // terminal, KTN-03 the ginkgo walk-up, KTN-04/KTN-05 the alley-split
    // halves, KTS-01/KTS-03 the south row, ROS-01 the deli (the bodega
    // block below), SUB-01 the station-house placement. KTN-02 the laundry
    // builds in buildGardenSlot (the slot row cut it in W2). The proud
    // dressing (doors, signs, windows, glows, stoops) derives against the
    // shells; the rhythms, palettes and dressing are the style.
    const ktn1 = this.regShell('KTN-01');
    const ktn3 = this.regShell('KTN-03');
    const ktn4 = this.regShell('KTN-04');
    const ktn5 = this.regShell('KTN-05');
    const kts1 = this.regShell('KTS-01');
    const kts3 = this.regShell('KTS-03');
    this.solid('Bldg_N_West', ktn1.x, ktn1.h / 2, ktn1.z, ktn1.w, ktn1.h, ktn1.d, PAL.bldg);
    this.solid('Bldg_N_GoldWindow', ktn3.x, ktn3.h / 2, ktn3.z, ktn3.w, ktn3.h, ktn3.d, PAL.brick);
    // Bldg_N_East_B is split in two so the alley (buildAlley) can be a REAL
    // cut — a 2.8 m slot with open sky above — instead of a false front.
    // The halves ARE the registry rows KTN-04 (west) and KTN-05 (east);
    // ALY-01's own row fills the gap between them.
    this.solid('Bldg_N_East_B_W', ktn4.x, ktn4.h / 2, ktn4.z, ktn4.w, ktn4.h, ktn4.d, PAL.bldg);
    this.solid('Bldg_N_East_B_E', ktn5.x, ktn5.h / 2, ktn5.z, ktn5.w, ktn5.h, ktn5.d, PAL.bldg);
    // Terminal door + sign (faces the street). The sign gets a real label —
    // the block stopped being a maze of anonymous boxes. The face z derives
    // off the terminal's shell; the door/sign x is the facade's own style.
    const termFaceZ = ktn1.z - ktn1.d / 2 - 0.05;
    this.deco('Terminal_Door', -30, 1.4, termFaceZ, 3, 2.8, 0.15, PAL.teal);
    // The sign gets a real label — the block stopped being a maze of
    // anonymous boxes. (signBoard: plain box + two textured faces — W0.)
    this.signBoard('Terminal_Sign', 'BUS TERMINAL', 5, 0.8, 0.15, 640, 96, PAL.stone, PAL.ink, 56)
      .position.set(-30, 3.4, termFaceZ);

    this.solid('Bldg_S_West', kts1.x, kts1.h / 2, kts1.z, kts1.w, kts1.h, kts1.d, PAL.bldg2);
    this.solid('Bldg_S_FireEscape', 13, 7, -14, 26, 14, 12, PAL.brick);
    this.solid('Bldg_S_East', kts3.x, kts3.h / 2, kts3.z, kts3.w, kts3.h, kts3.d, PAL.bldg);

    // Water towers — Doc 04 object canon ("the buildings wear wooden hats")
    this.waterTower(-30, ktn1.h, 12.5, 1.5); // unit 8: the terminal's own roof height
    this.waterTower(-14, kts1.h, -12.5, 1.7); // unit 7: the row's own roof height
    this.waterTower(31, ktn5.h, 12.5, 1.4); // unit 8: the fade king's own roof height

    // ---------------- bodega (Doc 10 §B, main.gd `_build_bodega`) ----------------
    // A-3 UNIT 9 (the shipped street's class A band — THE HEROES): Rosa's
    // deli READS its registry row (ROS-01) through regShell. The walls'
    // centers sit ON the row's edges (the 0.4 m thickness straddles them),
    // the floor/roof/walls run the row's depth plus the wall thickness, the
    // front opening splits 3.5/3/3.5 across the row's width, and every
    // proud face (sign, blade, window, awning) rides the derived front
    // face. The warm window's emission and the sign texts are the style.
    const rosa = this.regShell('ROS-01');
    const h = rosa.h;
    const rosaFace = rosa.z - rosa.d / 2 - 0.2; // the front walls' outer face
    this.solid('Bodega_Floor', rosa.x, 0.06, rosa.z, rosa.w, 0.1, rosa.d + 0.4, PAL.interior, { receive: true, cast: false });
    this.solid('Bodega_Wall_W', rosa.x - rosa.w / 2 + 0.2, h / 2, rosa.z, 0.4, h, rosa.d + 0.4, PAL.stone);
    this.solid('Bodega_Wall_E', rosa.x + rosa.w / 2 - 0.2, h / 2, rosa.z, 0.4, h, rosa.d + 0.4, PAL.stone);
    this.solid('Bodega_Wall_Back', rosa.x, h / 2, rosa.z + rosa.d / 2, rosa.w, h, 0.4, PAL.stone);
    this.solid('Bodega_Front_L', rosa.x - rosa.w / 2 + 1.75, h / 2, rosa.z - rosa.d / 2, 3.5, h, 0.4, PAL.brick);
    this.solid('Bodega_Front_R', rosa.x + rosa.w / 2 - 1.75, h / 2, rosa.z - rosa.d / 2, 3.5, h, 0.4, PAL.brick);
    this.solid('Bodega_Front_Lintel', rosa.x, h - 0.7, rosa.z - rosa.d / 2, 3, 1.4, 0.4, PAL.brick);
    // "ROSA'S / DELI & GROCERY" — the building has a name now, and it says it
    // three ways (playtest: nobody knew whose store it was, and the chase cam
    // crops a low facade sign when you stand at the door):
    //   1. this two-deck facade board over the awning,
    //   2. a blade sign projecting over the sidewalk (readable walking up,
    //      when the facade board is above the frame),
    //   3. a rooftop billboard (readable from anywhere on the block).
    this.signBoard('Bodega_Sign', "ROSA'S\nDELI & GROCERY", 6.2, 1.35, 0.14, 832, 176, PAL.gold, PAL.ink, 62)
      .position.set(rosa.x, h - 0.5, rosaFace - 0.07);
    // blade sign: perpendicular board over the door gap, text on the ±x faces
    this.decoMesh('Bodega_BladeBracket', new THREE.BoxGeometry(0.07, 0.5, 0.9), this.mat(PAL.ink), rosa.x + 1.1, h - 0.95, rosaFace - 0.45);
    this.signBoard('Bodega_BladeSign', "ROSA'S", 0.12, 0.95, 1.7, 384, 192, PAL.gold, PAL.ink, 74, 'x')
      .position.set(rosa.x + 1.1, 2.95, rosaFace - 0.9);
    // The warm window (emission 0.55 — main.gd comment: "the warm window, actually warm").
    // Story-owned: the dusk beat TWEENS this intensity (Game goldenBeat —
    // the E2E pins >1.5), so it stays OUT of the night registry — the
    // applier would clobber the tween every frame (the E2E caught exactly that).
    this.rosaWindowMat = this.mat(PAL.amber, { emissive: PAL.amber, emissiveIntensity: 0.55 });
    this.decoMesh('Bodega_Window', new THREE.BoxGeometry(2.6, 1.6, 0.06), this.rosaWindowMat, rosa.x - rosa.w / 2 + 1.75, 1.8, rosaFace - 0.08);
    this.deco('Bodega_Awning', rosa.x, h - 1.3, rosaFace - 0.4, rosa.w, 0.15, 1.2, PAL.teal);
    this.roof = this.solid('Bodega_Roof', rosa.x, h + 0.15, rosa.z, rosa.w, 0.3, rosa.d + 0.4, PAL.bldg);
    // Rooftop billboard — the store's name over the block, readable from the
    // chase cam anywhere on the street. Childed to the roof so it ducks out
    // of the way exactly when the roof does (player steps inside).
    const bb = new THREE.Group();
    bb.name = 'Bodega_RoofSign';
    const billboard = makeSignBoard(7.4, 1.4, 0.16, this.signMaterials("ROSA'S\nDELI & GROCERY", 896, 176, PAL.gold, PAL.ink, 62));
    billboard.position.y = 1.75;
    billboard.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
    bb.add(billboard);
    for (const px of [-3.1, 3.1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 6), this.mat(PAL.ink));
      pole.position.set(px, 0.55, 0);
      pole.castShadow = true;
      bb.add(pole);
    }
    bb.position.set(0, 0.15, -4.6); // roof-local: near the front edge, over the sidewalk
    this.roof.add(bb);
    this.solid('Bodega_Counter', -19.6, 0.55, 13.5, 1.2, 1.1, 6, PAL.teal);
    // Back-bar shelving: FOUR sand3d gondola units wear the old blank box's
    // span (one visual-only collider below — the shelf never carried
    // gameplay). Feet ride the floor top (0.11 — the placeholder center is
    // half-height over it), so the GLB's kick plinth shows instead of
    // sinking into the tiles. Fallback boxes keep the bldg2 look if the
    // files ever go missing.
    for (let si = 0; si < 4; si++) {
      const shelfPh = this.decoMesh(`Bodega_BackShelf_${si}`, new THREE.BoxGeometry(1.3, 1.64, 0.55), this.mat(PAL.bldg2), -17.5 + si * 1.5, 0.93, 19.3);
      shelfPh.rotation.y = Math.PI; // goods face south, into the store
      shelfPh.castShadow = true;
      shelfPh.receiveShadow = true;
      this.registerGlbProp(`bodega_shelf_${si}`, shelfPh);
      void this.upgradePropWithGLB(`bodega_shelf_${si}`, 'models/bodega_shelf.glb');
    }
    // one collider covers the run plus the west backstock pile (below)
    this.colliders.push(boxFromCenter(-16.35, 1.0, 19.3, 8.3, 2.0, 0.6));
    // Commercial reach-in cooler on the bodega's east wall — the SAME
    // stocked sand3d asset the pizza shop's slot wears
    // (models/drink_cooler.glb: glass front, can rows on three shelves,
    // brand stripes in the house palette). The 2026-11-12 round-two audit
    // retired the two-door refrigerator.glb here: its door GLB buries its
    // glass pane inside an opaque slab, so the "glass-front cooler" read as
    // a blank white door on a bare wall — the owner's "still not production
    // ready". The drink cooler's cans ARE the stock; no extra dressing.
    // Orientation: the door faces local −x → rotation 0 points it west, into
    // the room; the 3 m run lies along world z on the east wall.
    const fridgePh = new THREE.Group();
    fridgePh.name = 'Fridge_Bodega';
    fridgePh.position.set(-11.75, 1.03, 16.0); // feet on the floor top (0.11)
    const fridgeBox = new THREE.Mesh(new THREE.BoxGeometry(0.59, 1.84, 3.17), this.bank.get(0x2b2730));
    fridgeBox.castShadow = true;
    fridgeBox.receiveShadow = true;
    fridgePh.add(fridgeBox);
    this.scene.add(fridgePh);
    this.registerGlbProp('fridge_bodega', fridgePh);
    void this.upgradePropWithGLB('fridge_bodega', 'models/drink_cooler.glb');
    // the collider matches the upgrade's scaled footprint (h ratio 1.84/1.74
    // scales the GLB's 0.555 × 3.0 m body to 0.587 × 3.17)
    this.colliders.push(boxFromCenter(-11.75, 1.03, 16.0, 0.59, 1.84, 3.17));
    // the counter a real deli works from: register, coffee, microwave, and
    // the produce crates by the window (sand3d ADDs — the register and
    // coffee wear the washer-slot pattern, front east into the store; the
    // counter items sit inside the counter's own collider)
    const bodegaDressing = new THREE.Group();
    bodegaDressing.name = 'Bodega_Dressing';
    this.scene.add(bodegaDressing);
    const mkCounterSlot = (name: string, z: number, bw: number, bh: number, bd: number): void => {
      const slot = new THREE.Group();
      slot.name = name;
      slot.position.set(-19.6, 1.1 + bh / 2, z);
      slot.rotation.y = Math.PI / 2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), this.bank.get(0x2b2730));
      body.castShadow = true;
      body.receiveShadow = true;
      slot.add(body);
      bodegaDressing.add(slot);
    };
    mkCounterSlot('Bodega_Register', 14.4, 0.4, 0.3, 0.36);
    mkCounterSlot('Bodega_Coffee', 11.6, 0.42, 0.45, 0.38);
    this.fixture(bodegaDressing, 'Bodega_Microwave', -19.6, 1.27, 15.8, 0.385, 0.34, 0.47, PAL.cream);
    // the produce stand (2026-11-12 production pass, round two): the story
    // crate used to float alone on the floor by the window — two boxes in a
    // bare corner read as litter, not produce. It now rides a real deli
    // table with two stocked crates flanking it (oranges, limes — one merged
    // draw per fruit). The GLB crate seats feet-on-table via the seam's own
    // AABB-min law (fixture center = table top + half height).
    const produceTop = 0.66;
    const produceTable = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.85), this.bank.get(0x9c7a4a));
    produceTable.name = 'Bodega_ProduceTable';
    produceTable.position.set(-18.35, 0.11 + 0.275, 9.3);
    produceTable.castShadow = true;
    produceTable.receiveShadow = true;
    bodegaDressing.add(produceTable);
    this.fixture(bodegaDressing, 'Bodega_Produce', -18.5, produceTop + 0.1575, 9.3, 0.6, 0.315, 0.4, PAL.bldg);
    this.colliders.push(boxFromCenter(-18.35, 0.385, 9.3, 2.2, 0.55, 0.85));
    const fruitGeos = new Map<number, THREE.BufferGeometry[]>();
    const pushFruit = (c: number, g: THREE.BufferGeometry): void => {
      const arr = fruitGeos.get(c);
      if (arr) arr.push(g); else fruitGeos.set(c, [g]);
    };
    const fruitCrate = (cx: number, fruit: number): void => {
      const shell = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.42), this.bank.get(0xb08d57));
      shell.name = 'Bodega_ProduceCrate';
      shell.position.set(cx, produceTop + 0.14, 9.3);
      shell.castShadow = true;
      shell.receiveShadow = true;
      bodegaDressing.add(shell);
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 4; i++) {
          pushFruit(fruit, new THREE.CylinderGeometry(0.06, 0.06, 0.09, 10)
            .translate(cx - 0.165 + i * 0.11, produceTop + 0.26, 9.19 + r * 0.22));
        }
      }
    };
    fruitCrate(-19.15, 0xe8964a); // oranges, west crate
    fruitCrate(-17.85, 0x8fbf4d); // limes, east crate
    for (const [color, geos] of fruitGeos) {
      const m = new THREE.Mesh(mergeGeometries(geos, false)!, this.bank.get(color));
      m.name = 'Bodega_ProduceFruit';
      m.castShadow = true;
      bodegaDressing.add(m);
    }

    // ---------------- the deli's own colors (2026-11 identity pass) --------
    // Cream walls are the shipped stone masses seen from inside; the room's
    // identity lands ADDITIVELY: teal wainscot + gold trim on every inner
    // face (split around the door gap), the floor wears warm checker cream,
    // the counter wall wears a real menu board, the back wall wears stacked
    // product rows beside the three gondolas, the east wall hangs chip bags
    // by the produce. The store reads as a deli from the doorway now.
    const bodegaFloorY = 0.11, bodegaBandH = 0.55;
    const bandW = this.bank.get(0x1f7a70), trimW = this.bank.get(0xf7b32b);
    const bodegaBand = (name: string, alongX: boolean, at: number, a: number, b: number): void => {
      const len = b - a, c = (a + b) / 2;
      const band = new THREE.Mesh(
        alongX ? new THREE.BoxGeometry(len, bodegaBandH, 0.05) : new THREE.BoxGeometry(0.05, bodegaBandH, len), bandW);
      band.name = `${name}_Band`;
      band.position.set(alongX ? c : at, bodegaFloorY + bodegaBandH / 2, alongX ? at : c);
      bodegaDressing.add(band);
      const trim = new THREE.Mesh(
        alongX ? new THREE.BoxGeometry(len, 0.05, 0.07) : new THREE.BoxGeometry(0.07, 0.05, len), trimW);
      trim.name = `${name}_Trim`;
      trim.position.set(alongX ? c : at, bodegaFloorY + bodegaBandH + 0.025, alongX ? at : c);
      bodegaDressing.add(trim);
    };
    bodegaBand('Bodega_W', true, -20.57, 8.4, 19.4);   // behind the counter
    bodegaBand('Bodega_E', true, -11.43, 8.4, 19.4);   // the fridge wall
    bodegaBand('Bodega_N', true, 19.37, -20.6, -11.4); // behind the gondolas
    bodegaBand('Bodega_FrontW', true, 8.43, -20.6, -17.5); // the door gap splits
    bodegaBand('Bodega_FrontE', true, 8.43, -14.5, -11.4); // ...the front band
    // floor tint: warm checker cream (the shipped PAL.interior tan retires)
    const bodegaFloorMesh = this.scene.children.find((o) => o.name === 'Bodega_Floor') as THREE.Mesh | undefined;
    if (bodegaFloorMesh) bodegaFloorMesh.material = this.bank.get(0xd9c9a8);
    // the menu board over the counter (west wall, faces east into the
    // store) — re-parented into the dressing group so the bake keeps it
    const menu = this.signBoard('Bodega_Menu', 'COFFEE 1.50 — CAFE CON LECHE 2.25\nBACON EGG & CHEESE 4.50 — COLD BEER · LOTTO',
      0.06, 0.9, 4.6, 640, 112, PAL.cream, PAL.ink, 30, 'x');
    menu.position.set(-20.53, 2.0, 13.0);
    bodegaDressing.add(menu);
    // ---------------- the gondolas' stock (2026-11 restock pass) ----------
    // The legacy loose-box wall grid (Bodega_ProductRow) is retired: its
    // three floating rows ran straight THROUGH the gondola volumes and read
    // as unfinished noise. The store stocks the four gondola units instead —
    // shelf-aware runs seated on the boards' real tops (the GLB's millimetre
    // levels × the upgrade's uniform scale 1.64/1.770, feet on the floor
    // top 0.11), facings laid as color blocks like a real bodega wall. One
    // merged mesh per color across all four units (the props law: the row
    // is ONE draw). The three Day-1 stock spots (mango/coffee/bread) own
    // their gaps on the middle shelves — sized/seeded to match.
    const gondolaXs = [-17.5, -16, -14.5, -13];
    const gondolaS = 1.64 / 1.770; // upgradePropWithGLB's scale for this file
    const shelfTop = (mm: number): number => 0.11 + (mm / 1000) * gondolaS;
    // base deck, then boards 1-4 (shelf_0..shelf_3)
    const SHELF = [shelfTop(130), shelfTop(567), shelfTop(947), shelfTop(1327), shelfTop(1697)];
    const stockGeos = new Map<number, THREE.BufferGeometry[]>();
    const pushStock = (c: number, g: THREE.BufferGeometry): void => {
      const arr = stockGeos.get(c);
      if (arr) arr.push(g); else stockGeos.set(c, [g]);
    };
    const stockCan = (x: number, y: number, z: number, c: number): void =>
      pushStock(c, new THREE.CylinderGeometry(0.032, 0.032, 0.105, 10).translate(x, y + 0.0525, z));
    const stockBox = (x: number, y: number, z: number, w: number, h: number, d: number, c: number): void =>
      pushStock(c, new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z));
    const stockBottle = (x: number, y: number, z: number, c: number): void => {
      pushStock(c, new THREE.CylinderGeometry(0.03, 0.034, 0.16, 10).translate(x, y + 0.08, z));
      pushStock(c, new THREE.CylinderGeometry(0.014, 0.018, 0.06, 8).translate(x, y + 0.19, z));
    };
    const stockJar = (x: number, y: number, z: number, c: number): void =>
      pushStock(c, new THREE.CylinderGeometry(0.044, 0.04, 0.115, 10).translate(x, y + 0.0575, z));
    const KRAFT = [0xb08d57, 0xc49a6c, 0x9c7a4a];
    const stockCase = (x: number, y: number, z: number, w: number, h: number, d: number, c: number): void =>
      stockBox(x, y, z, w, h, d, c);
    const canCols = [PAL.coral, PAL.plum, PAL.teal, PAL.taxi];
    for (let si = 0; si < gondolaXs.length; si++) {
      const gx = gondolaXs[si];
      // base deck: kraft cases, one stacked — backstock reads at sight line
      stockCase(gx - 0.34, SHELF[0], 19.33, 0.30, 0.22, 0.26, KRAFT[0]);
      stockCase(gx + 0.02, SHELF[0], 19.33, 0.32, 0.24, 0.28, KRAFT[1]);
      stockCase(gx + 0.36, SHELF[0], 19.33, 0.28, 0.20, 0.26, KRAFT[2]);
      stockCase(gx + 0.02, SHELF[0] + 0.24, 19.35, 0.26, 0.16, 0.22, KRAFT[0]);
      // board 1: two can facings, front + back rows
      for (let i = 0; i < 12; i++) {
        const cx = gx - 0.45 + i * 0.082;
        stockCan(cx, SHELF[1], 19.20, canCols[si % 4]);
        stockCan(cx + 0.041, SHELF[1], 19.42, canCols[(si + 1) % 4]);
      }
      // board 2: snack boxes — unit 0 leaves the bread's spot open (+0.02..+0.32)
      const boxXs = si === 0 ? [-0.44, -0.30, -0.16, 0.36, 0.47] : [-0.375, -0.225, -0.075, 0.075, 0.225, 0.375];
      for (let i = 0; i < boxXs.length; i++) {
        stockBox(gx + boxXs[i], SHELF[2], 19.22, 0.11, i % 2 === 0 ? 0.16 : 0.23, 0.07, i % 2 === 0 ? PAL.teal : PAL.gold);
      }
      // board 3: jars front, bottles back — units 1/2 keep the coffee and
      // mango spots open (local ±0.12)
      const midTaken = si === 1 || si === 2;
      const jarXs = midTaken ? [-0.45, -0.32, -0.19, 0.19, 0.32, 0.45] : [-0.45, -0.32, -0.19, -0.06, 0.07, 0.2, 0.33];
      for (const jx of jarXs) stockJar(gx + jx, SHELF[3], 19.20, 0x6a8a5a);
      const botXs = midTaken ? [-0.36, -0.22, 0.22, 0.36] : [-0.32, -0.16, 0, 0.16, 0.32];
      for (const bx of botXs) stockBottle(gx + bx, SHELF[3], 19.42, 0xb3552f);
      // board 4 (top): a can row over the rail line + three kraft cartons back
      for (let i = 0; i < 9; i++) stockCan(gx - 0.40 + i * 0.10, SHELF[4], 19.20, canCols[(si + 2) % 4]);
      for (const bx of [-0.38, -0.24, 0.30]) stockBox(gx + bx, SHELF[4], 19.42, 0.11, 0.14, 0.07, KRAFT[1]);
    }
    // the west wall's backstock pile — the run's leftover never reads bare
    stockCase(-20.25, 0.11, 19.38, 0.30, 0.26, 0.34, KRAFT[0]);
    stockCase(-19.78, 0.11, 19.38, 0.34, 0.24, 0.32, KRAFT[1]);
    stockCase(-19.78, 0.35, 19.40, 0.30, 0.20, 0.28, KRAFT[2]);
    stockCase(-19.30, 0.11, 19.38, 0.32, 0.26, 0.32, KRAFT[0]);
    for (const [color, geos] of stockGeos) {
      if (!geos.length) continue;
      const m = new THREE.Mesh(mergeGeometries(geos, false)!, this.bank.get(color));
      m.name = 'Bodega_ShelfStock';
      m.receiveShadow = true;
      bodegaDressing.add(m);
    }
    // chip bags hanging by the produce (east wall) — the classic deli door
    // strip, bright foil colors, one merged draw; a rail bar to hang from
    // (they used to float off the bare wall)
    const bagColors = [0xd94f3d, 0xf7b32b, 0x3d8bd9, 0x4a9d5a];
    const bagGeos: Array<THREE.BufferGeometry[]> = Array.from({ length: bagColors.length }, () => []);
    for (let i = 0; i < 8; i++) {
      const z = 9.1 + i * 0.24, y = 1.55 + (i % 2) * 0.18;
      const g2 = new THREE.BoxGeometry(0.05, 0.34, 0.22).translate(-11.46, y, z);
      bagGeos[i % bagColors.length].push(g2);
    }
    for (let ci = 0; ci < bagColors.length; ci++) {
      if (!bagGeos[ci].length) continue;
      const m = new THREE.Mesh(mergeGeometries(bagGeos[ci], false)!, this.bank.get(bagColors[ci]));
      m.name = 'Bodega_ChipBags';
      bodegaDressing.add(m);
    }
    const bagRail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.9, 8), this.bank.get(PAL.ink));
    bagRail.name = 'Bodega_ChipBagRail';
    bagRail.rotation.x = Math.PI / 2;
    bagRail.position.set(-11.475, 1.96, 9.94);
    bodegaDressing.add(bagRail);
    // the east wall's posters (2026-11-12 production pass, round two): the
    // wall around the cooler read as a bare plaster field. Two framed
    // house-voice ads — the beverage cry beside the chip strip, the flat-top
    // promise north of it — the same signBoard seam the menu rides.
    const posterCold = this.signBoard('Bodega_Poster_Cold', 'ICE COLD\nsoda · seltzer · water — always',
      0.05, 1.55, 1.15, 256, 384, 0xf7b32b, PAL.ink, 34, 'x');
    posterCold.rotation.y = Math.PI; // the face reads west, into the store
    posterCold.position.set(-11.42, 1.95, 11.8); // south of the cooler run
    bodegaDressing.add(posterCold);
    const posterFlat = this.signBoard('Bodega_Poster_FlatTop', 'BREAKFAST ALL DAY\nthe flat top never lies',
      0.05, 1.55, 1.15, 256, 384, PAL.cream, PAL.ink, 34, 'x');
    posterFlat.rotation.y = Math.PI;
    posterFlat.position.set(-11.42, 1.95, 13.2);
    bodegaDressing.add(posterFlat);
    // the welcome mat inside the door gap (teal — the awning's color)
    const mat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 0.9), this.bank.get(PAL.teal));
    mat.name = 'Bodega_DoorMat';
    mat.position.set(-16, bodegaFloorY + 0.01, 8.95);
    mat.receiveShadow = true;
    bodegaDressing.add(mat);

    // ---------------- the room's finish (2026-11 production pass) ---------
    // The store used to show its construction masses: raw red brick inner
    // faces on the front piers, open sky where a ceiling should be, a bare
    // teal counter slab. Paint + ceiling + trim — additive dressing, no
    // wall box moves, no collider changes.
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.05, 11.2), this.bank.get(PAL.cream));
    ceil.name = 'Bodega_Ceiling';
    ceil.position.set(-16, 4.47, 14);
    ceil.receiveShadow = true;
    bodegaDressing.add(ceil);
    const paintW = this.bank.get(PAL.stone);
    const frontPanel = (name: string, cx: number): void => {
      // full-height: pier top to ceiling — no raw brick line survives inside
      const p = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.73, 0.03), paintW);
      p.name = name;
      p.position.set(cx, 2.585, 8.415);
      p.receiveShadow = true;
      bodegaDressing.add(p);
    };
    frontPanel('Bodega_FrontPaint_W', -19.05); // Front_L's inner face
    frontPanel('Bodega_FrontPaint_E', -12.95); // Front_R's inner face
    // the lintel's inner face — above the door it read as a raw red slab
    // from across the store
    const lintelPaint = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.42, 0.03), paintW);
    lintelPaint.name = 'Bodega_LintelPaint';
    lintelPaint.position.set(-16, 3.81, 8.415);
    bodegaDressing.add(lintelPaint);
    const jambLiner = (name: string, x: number): void => {
      const j = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.99, 0.46), paintW);
      j.name = name;
      j.position.set(x, 1.605, 8.2);
      bodegaDressing.add(j);
    };
    jambLiner('Bodega_DoorJamb_W', -17.485); // the door reveal stops reading raw brick
    jambLiner('Bodega_DoorJamb_E', -14.515);
    // counter finish: a dark kick and a gold top edge on the aisle face
    const counterKick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 6.0), this.bank.get(PAL.manhole));
    counterKick.name = 'Bodega_CounterKick';
    counterKick.position.set(-18.985, 0.17, 13.5);
    bodegaDressing.add(counterKick);
    const counterTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 6.0), this.bank.get(PAL.gold));
    counterTrim.name = 'Bodega_CounterTrim';
    counterTrim.position.set(-18.985, 1.05, 13.5);
    bodegaDressing.add(counterTrim);
    // a wall clock over the gondola run — the deli's quiet heartbeat
    // (y 2.8: clear of the Coffee label pill that rides the item below)
    const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 20), this.bank.get(PAL.ink));
    clockRim.name = 'Bodega_Clock';
    clockRim.rotation.x = Math.PI / 2;
    clockRim.position.set(-16, 2.8, 19.578);
    bodegaDressing.add(clockRim);
    const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.037, 20), this.bank.get(PAL.cream));
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(-16, 2.8, 19.579);
    bodegaDressing.add(clockFace);
    const clockHand = (len: number, angle: number): void => {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.018, len, 0.01), this.bank.get(PAL.ink));
      hand.geometry.translate(0, len / 2 - 0.02, 0);
      hand.rotation.z = angle;
      hand.position.set(-16, 2.8, 19.556);
      bodegaDressing.add(hand);
    };
    clockHand(0.09, -Math.PI / 3);
    clockHand(0.13, Math.PI / 5);

    // ---------------- props (Rule of Steam: something is always moving) ----
    this.deco('Manhole', -10, 0.025, 0.5, 0.95, 0.02, 0.95, PAL.manhole); // 0.95 m — a real manhole, not a patio
    const hydrant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.9, 10),
      this.mat(PAL.coral),
    );
    hydrant.position.set(5.7, 0.45, -4.55);
    hydrant.castShadow = true;
    this.scene.add(hydrant);
    // solid — a hydrant is cast iron (agent 2 collision audit, doc 35 §2).
    // It stood at (-0.6, -4.6): dead center of the swept corridor between
    // the crosswalk and the cart (the E2E parked on its west face for whole
    // budgets). East of the cart at the curb line it is out of every
    // authored leg and every drift zone the E2E actually walks.
    this.colliders.push(boxFromCenter(5.7, 0.425, -4.55, 0.45, 0.85, 0.45));

    // Street life — the object canon's quiet furniture. Each is a procedural
    // placeholder that a generated .glb can replace at runtime: drop
    // <id>.glb into public/models/ and it wears the mesh on next boot
    // (tools3d/spaces_manifest.json generates exactly these ids). Colliders
    // are registered just above — solid furniture, decoration only for the
    // GLB visuals themselves.
    this.scene.add(this.makeMailbox(-3.2, -5.7));
    this.scene.add(this.makeTrashcan(10.5, -5.6));
    this.scene.add(this.makeStreetlamp(13.5, -5.9));
    // solid street furniture — the audit found the whole family collider-free
    // (doc 35 §2): the player ghosted through mailbox, can and lamp post.
    // Footprints match the visuals; the GLB-upgrade guard (±90 %) keeps any
    // generated mesh inside these boxes.
    this.colliders.push(boxFromCenter(-3.2, 0.48, -6.1, 0.6, 0.95, 0.5));    // mailbox (off the cart corridor)
    this.colliders.push(boxFromCenter(10.5, 0.5, -5.6, 0.68, 1.0, 0.68));    // trashcan
    this.colliders.push(boxFromCenter(13.5, 2.2, -5.9, 0.24, 4.4, 0.24));    // lamp post
    this.registerGlbProp('hydrant', hydrant);
    void this.upgradePropWithGLB('hydrant');
    void this.upgradePropWithGLB('mailbox');
    void this.upgradePropWithGLB('trashcan');
    void this.upgradePropWithGLB('streetlamp');

    // Taxi (rebuilt from the car builder). It used to be a collider-free
    // lantern, and it DRACULA'D straight through the player (playtest: "the
    // player passed through a car"). Now it carries its own collider — moved
    // every frame — and a city-cab yield: it holds at the crosswalk stop line
    // while the crosswalk is occupied, and brakes for anyone in the road
    // ahead of it. A cab you can ghost through read as broken.
    this.taxiBase = this.buildCar('taxi', true); // the hero cab wears PBR paint
    this.registerGlbProp('car_taxi', this.taxiBase); // generated mesh may wear it (public/models/car_taxi.glb)
    void this.upgradePropWithGLB('car_taxi');
    this.taxi.position.set(-45, 0, -2);
    this.scene.add(this.taxi);
    this.taxiCollider = boxFromCenter(-45, 0.75, -2, 4.4, 1.5, 1.95);
    this.colliders.push(this.taxiCollider);

    // A parked sedan on the north curb (street life; collides — it's a car).
    // It used to sit on the SOUTH curb at z=-3.05: a curb-parked car and the
    // cab lane (z=-2) overlap ~0.8 m of visible body there, so the taxi
    // drove straight THROUGH the sedan every ~10 s loop (probe-sweep7 frame
    // 04 caught them mid-interpenetration). The north curb is outside the
    // cab's lane for the entire loop; the van already parks this side, same
    // rotation.y = π — nose west, parked with westbound traffic.
    const sedan = this.buildCar('sedan');
    sedan.position.set(24, 0, 3.05);
    sedan.rotation.y = Math.PI;
    this.registerGlbProp('car_sedan', sedan); // same seam, parked car
    void this.upgradePropWithGLB('car_sedan');
    this.scene.add(sedan);
    this.colliders.push(boxFromCenter(24, 0.75, 3.05, 4.4, 1.5, 1.95));

    // Player corner — "a waiting rectangle of different paving"
    this.deco('PlayerCorner', 4, 0.12, -6, 8, 0.02, 3.6, PAL.stone);

    // A-3 UNIT 7: the ginkgo building's south-face constants — face z and
    // the window-grid origin derive against the KTN-03 shell (used by the
    // teal door below and the window grid further down); the 3 m rhythm is
    // the style.
    const goldFaceZ = ktn3.z - ktn3.d / 2 - 0.06;
    const goldGridX = ktn3.x - ktn3.w / 2 + 1.5;

    // The teal door (Day 2's delivery target — the objective says "the teal
    // door across the street"; now there is one, under the gold window).
    // Unit 7: the door owns the shell's center bay (x IS the row center);
    // the knob offset and the face insets are the style.
    const stoopDoorX = ktn3.x;
    const stoopDoor = this.decoMesh('Stoop_Door', new THREE.BoxGeometry(1.4, 2.6, 0.15), this.mat(PAL.teal), stoopDoorX, 1.3, goldFaceZ - 0.02);
    stoopDoor.rotation.y = Math.PI; // GLB fronts face +Z — the leaf must face the street (south)
    const stoopKnob = this.decoMesh('Stoop_Knob', new THREE.SphereGeometry(0.05, 8, 8), this.mat(PAL.gold), stoopDoorX + 0.45, 1.3, goldFaceZ - 0.10);
    // Sandflow prewar door wears the Day-2 target — its leaf slab is baked
    // in the canon teal (PAL.teal, tools3d/sandflow_eval/postprocess_glb.py),
    // so "the teal door across the street" reads on the model, not just the
    // fallback box. The brass knob is a fallback-only sibling: it hides when
    // the model lands (the GLB carries its own knob, hinges and peephole).
    this.registerGlbProp('stoop_door', stoopDoor);
    void this.upgradePropWithGLB('stoop_door', 'models/apartment_door.glb')
      .then((ok) => { if (ok) stoopKnob.visible = false; });
    // The stoop itself — "stoup = outdoor living room" deserves actual steps.
    // Two low risers (tops 0.19 / 0.28, both inside the 0.35 STEP_UP curb
    // tolerance, so the walker rolls up them without a hop).
    this.solid('Stoop_Step', stoopDoorX, 0.095, 6.9, 1.7, 0.19, 0.55, PAL.stone);
    this.solid('Stoop_Landing', stoopDoorX, 0.14, 7.55, 1.7, 0.28, 0.75, PAL.stone);

    // ---------------- fire escape (main.gd `_build_fire_escape`) ------------
    // Playtest 2026-10-29: "the stairs also looks weird" — the escape used to
    // be two floating planks and solid slab rails. Now: real ladders (stiles
    // + rungs + wall brackets), open guardrails (posts + bars), and diagonal
    // braces holding the landings. Colliders and trigger volumes untouched —
    // this is a pure visual rebuild of the same numbers.
    // Landings stay x 10..16 (the greybox's numbers): ladder 2's column (x 16.4)
    // sits 0.4 OFF the slab edge — groundHeight's padded reach (r + r*0.6 =
    // 0.56) still finds the slab there, so the descent dismount (player.ts) can
    // set you down on it, while depenetrate's UNpadded test (r = 0.35 < 0.4)
    // never shoves you sideways mid-descent. Extending the slab instead would
    // squeeze the descender off the column — do not "fix" that gap.
    const railCol = PAL.ink;
    this.solid('Landing_1', 13, 4.0, -7.3, 6, 0.15, 1.4, railCol);
    this.solid('Landing_2', 13, 8.0, -7.3, 6, 0.15, 1.4, railCol);
    this.fireRail('Rail_1', 4.0);
    this.fireRail('Rail_2', 8.0);
    // trigger volumes (Area3D counterparts) — unchanged, E2E depends on them
    this.ladder1 = { area: boxFromCenter(9.4, 2.4, -7.75, 1.0, 4.8, 1.4), top: 4.35 };
    this.ladder2 = { area: boxFromCenter(16.4, 6.6, -7.75, 1.6, 4.8, 1.4), top: 8.35 };
    this.topLandingZone = boxFromCenter(12.5, 9.0, -7.3, 4.5, 1.8, 1.4);
    // ladder visuals sit exactly on their trigger columns (ladder 2's old
    // plank drifted to x=16.6 while the trigger lives at 16.4)
    this.fireLadder('Ladder_1_Mesh', 9.4, 0.1, 4.35);
    this.fireLadder('Ladder_2_Mesh', 16.4, 4.075, 8.35);
    // diagonal braces: wall (z=-8) down to the landing noses (z=-6.7)
    this.fireBrace(11, 4.0);
    this.fireBrace(15, 4.0);
    this.fireBrace(11, 8.0);
    this.fireBrace(15, 8.0);

    // ---------------- windows + the gold one (main.gd `_build_windows`) -----
    // A-3 UNIT 7: the grid rides the ginkgo building's south face — the face
    // constants (goldFaceZ/goldGridX) were derived against the KTN-03 shell
    // above; the 3 m window rhythm and the 3 m floor pitch are the style.
    const dim = PAL.windowDim;
    const dimMat = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const p = [goldGridX + col * 3, 3 + row * 3, goldFaceZ] as const;
        if (row === 2 && col === 1) {
          this.goldWindowMat = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
          this.decoMesh('GoldWindow', new THREE.BoxGeometry(1.2, 1.6, 0.08), this.goldWindowMat, p[0], p[1], p[2]);
        } else if (row === 2 && col === 0) {
          this.secondWindowMat = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
          this.decoMesh('SecondWindow', new THREE.BoxGeometry(1.2, 1.6, 0.08), this.secondWindowMat, p[0], p[1], p[2]);
        } else if (row === 2 && col === 2) {
          // the third window — Day 3's golden-hour payoff (docs/28 §E)
          this.thirdWindowMat = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
          this.decoMesh('ThirdWindow', new THREE.BoxGeometry(1.2, 1.6, 0.08), this.thirdWindowMat, p[0], p[1], p[2]);
        } else if (row === 2 && col === 3) {
          // the lamp next door — Day 2's wave note promised it ("flickers,
          // thinks about it, and stays on too"). Day 4 keeps that promise.
          this.fourthWindowMat = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
          this.decoMesh('FourthWindow', new THREE.BoxGeometry(1.2, 1.6, 0.08), this.fourthWindowMat, p[0], p[1], p[2]);
        } else if (row === 1 && col === 0) {
          // ambient window — "got home late" (Day 2), then away. Same pane
          // the grid always had; it only leaves the shared dim material so
          // its emissive can keep a day-keyed diary (dressing.ts).
          this.ambientWindowMatLate = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
          this.decoMesh('AmbientWindow_Late', new THREE.BoxGeometry(1.2, 1.6, 0.08), this.ambientWindowMatLate, p[0], p[1], p[2]);
        } else if (row === 1 && col === 3) {
          // ambient window — someone new moves in on Day 3 (above the lamp
          // that promised to stay on)
          this.ambientWindowMatNew = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
          this.decoMesh('AmbientWindow_New', new THREE.BoxGeometry(1.2, 1.6, 0.08), this.ambientWindowMatNew, p[0], p[1], p[2]);
        } else if (row === 0 && col === 2) {
          // ambient window — the early riser, awake before the rush by Day 4
          this.ambientWindowMatRiser = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
          this.decoMesh('AmbientWindow_Riser', new THREE.BoxGeometry(1.2, 1.6, 0.08), this.ambientWindowMatRiser, p[0], p[1], p[2]);
        } else {
          this.decoMesh(`Window_${row}_${col}`, new THREE.BoxGeometry(1.2, 1.6, 0.08), dimMat, p[0], p[1], p[2]);
        }
      }
    }
    // the glows ride 0.34 proud of the window plane (unit 7: off the shell)
    this.goldGlow = this.makeGlow(3.2);
    this.goldGlow.position.set(goldGridX + 3, 9, goldFaceZ - 0.34);
    this.scene.add(this.goldGlow);
    this.secondGlow = this.makeGlow(2.6);
    this.secondGlow.position.set(goldGridX, 9, goldFaceZ - 0.34);
    this.scene.add(this.secondGlow);
    this.thirdGlow = this.makeGlow(2.6);
    this.thirdGlow.position.set(goldGridX + 6, 9, goldFaceZ - 0.34);
    this.scene.add(this.thirdGlow);
    this.fourthGlow = this.makeGlow(2.2);
    this.fourthGlow.position.set(goldGridX + 9, 9, goldFaceZ - 0.34);
    this.scene.add(this.fourthGlow);

    // ---------------- skyline card (far north-east, above the low building) -
    const heights = [38, 62, 45, 80, 52, 70, 40, 58];
    for (let i = 0; i < heights.length; i++) {
      this.deco(`Tower_${i}`, -10 + i * 7, heights[i] / 2, 90, 6, heights[i], 6, PAL.skyline, { fog: false });
    }
    this.deco('Spire', 11, 92, 90, 0.6, 24, 0.6, PAL.skyline, { fog: false });

    // ---- the skyline's lit windows (GDD: beyond the single gold one) ------
    // One InstancedMesh of tiny warm panes on the towers' south faces, one
    // draw call, ~two hundred lights. The mask is SEEDED (dressing.ts): the
    // same tower shows the same lit windows every run — tenants keep their
    // lamps — and the far diary wakes two dark windows with the week.
    {
      const winGeo = new THREE.PlaneGeometry(0.55, 0.8);
      const winMat = new THREE.MeshLambertMaterial({
        color: PAL.windowDim, emissive: PAL.gold, emissiveIntensity: 0, fog: false,
      });
      const diaryMat = new THREE.MeshLambertMaterial({
        color: PAL.windowDim, emissive: PAL.gold, emissiveIntensity: 0, fog: false,
      });
      this.skylineWinMat = winMat;
      this.skylineWinDiaryMat = diaryMat;
      const cells: Array<[number, number]> = [];   // [x, y] world positions
      const diaryCells: Array<[number, number]> = [];
      for (let i = 0; i < heights.length; i++) {
        const h = heights[i];
        const cols = 4;
        const rows = Math.max(3, Math.floor((h - 6) / 3.2));
        const mask = skylineWindowMask(i + 1, cols, rows);
        const cx = -10 + i * 7;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (!mask[r * cols + c]) continue;
            cells.push([cx - 1.95 + c * 1.3, 4 + r * 3.2]);
          }
        }
        // the diary lives on two towers only — a city is big, a diary is small
        if (i === 2 || i === 5) {
          const diary = skylineDiaryIndices(i + 1, cols, rows);
          for (const idx of [diary.newcomer, diary.riser]) {
            if (idx < 0) continue;
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            diaryCells.push([cx - 1.95 + c * 1.3, 4 + r * 3.2]);
          }
        }
      }
      const place = (mesh: THREE.InstancedMesh, list: Array<[number, number]>) => {
        // the panes face the street (the player looks north from −z)
        const m = new THREE.Matrix4().makeRotationY(Math.PI);
        for (let k = 0; k < list.length; k++) {
          m.setPosition(list[k][0], list[k][1], 90 - 3.06); // just off the south face (z 87)
          mesh.setMatrixAt(k, m);
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.frustumCulled = false; // one plane's bounding sphere must not cull the grid
      };
      const steady = new THREE.InstancedMesh(winGeo, winMat, Math.max(1, cells.length));
      place(steady, cells);
      steady.count = cells.length;
      steady.name = 'SkylineWindows';
      this.scene.add(steady);
      const diaryMesh = new THREE.InstancedMesh(winGeo, diaryMat, Math.max(1, diaryCells.length));
      place(diaryMesh, diaryCells);
      diaryMesh.count = diaryCells.length;
      diaryMesh.name = 'SkylineWindowsDiary';
      this.scene.add(diaryMesh);
    }

    // ---------------- invisible bounds (the master-world core) -------------
    // W1: the shipped x ±48 / z ∓22/22.5 walls are RETIRED (docs/45 W1 —
    // "retire the x ±48 walls"; the grid is walkable now, Gable and Marlow
    // sit outside the old z walls). The boundary moved to the registry's
    // playable core: x ±84, z ±48. W6 (the terrace build-out, the owner's
    // 2026-11-11 expansion authorization — DEC-8 satisfied in the register):
    // the core grows to z ±64 and the strips behind Gable and Marlow become
    // real rows — the z walls follow the registry's own bounds. W7 (the
    // Westgate & Eastgate rows, same standing authorization): the core grows
    // to x ±100 — the E–W streets grow their west and east ends, the strips
    // beyond the avenues become real rows, and the x walls follow.
    this.colliders.push(boxFromCenter(-100, 5, 0, 1, 20, 128));
    this.colliders.push(boxFromCenter(100, 5, 0, 1, 20, 128));
    this.colliders.push(boxFromCenter(0, 6, -64, 200, 24, 1)); // south wall behind the Carrow terrace
    this.colliders.push(boxFromCenter(0, 6, 64, 200, 24, 1));  // north wall behind the Larkin terrace

    // zones
    this.crosswalkZone = boxFromCenter(-5, 1, 0, 3.4, 2, 7.5);
    this.insideBodegaZone = boxFromCenter(-16, 2, 14, 9.4, 4, 11.4);

    // ---------------- cart placeholder (ghost gold until named) -------------
    this.cartRoot = new THREE.Group();
    this.cartRoot.name = 'CartPlaceholder';
    this.cartRoot.position.set(4, 0.05, -6.6);
    this.cartMat = new THREE.MeshLambertMaterial({
      color: PAL.gold, transparent: true, opacity: 0.35, emissive: PAL.gold, emissiveIntensity: 0.12,
    });
    const cartParts: Array<[number, number, number, number, number, number]> = [
      [0, 0.6, 0, 1.8, 1.0, 1.0],
      [0, 2.0, 0, 2.2, 0.12, 1.4],
      [-0.9, 1.4, 0, 0.08, 1.4, 0.08],
      [0.9, 1.4, 0, 0.08, 1.4, 0.08],
    ];
    for (const [x, y, z, sx, sy, sz] of cartParts) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), this.cartMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.cartRoot.add(m);
    }
    // the cart's own awning is a Day 2 purchase; string lights arrive with the name
    this.stringLights = new THREE.Group();
    this.stringLights.visible = false;
    const bulbMat = new THREE.MeshBasicMaterial({ color: PAL.amber });
    for (let i = 0; i < 6; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), bulbMat);
      const t = i / 5;
      bulb.position.set(-0.8 + t * 1.6, 2.06 - Math.sin(t * Math.PI) * 0.12, 0.62);
      this.stringLights.add(bulb);
    }
    this.cartRoot.add(this.stringLights);
    this.cartSign = this.makeSign('');
    this.cartSign.position.set(0, 2.62, 0);
    this.cartSign.visible = false;
    this.cartRoot.add(this.cartSign);
    this.scene.add(this.cartRoot);

    this.cartAwning = new THREE.Group();
    this.cartAwning.position.set(4, 0.05 + 2.35, -6.6);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 1.7), this.mat(PAL.teal));
    canopy.position.set(0, 0, 0.1);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 0.24), this.mat(PAL.teal));
    skirt.position.set(0, -0.15, 0.98);
    this.cartAwning.add(canopy, skirt);
    this.cartAwning.visible = false;
    this.scene.add(this.cartAwning);
    // the cart's body blocks — you lean on the counter, you don't stand in it
    this.cartCollider = boxFromCenter(4, 1.0, -6.6, 2.2, 2.0, 1.4);
    this.colliders.push(this.cartCollider);
    // Every person collider rides the chain-link lens law (seeThroughCamera):
    // bodies stop bodies, lenses don't stop on bodies (docs/51 B18 — the
    // step-off spawn sits inside the Shuffle lanes; a walker loitering
    // behind it pulled the handover snap to the truncation floor, ~1.3 m,
    // burying the lens in the player's own hair at the game's first
    // playable frame). The same read protects every cast beat: a body
    // crossing the boom sweeps a foreground silhouette instead of yanking
    // the camera. syncPersonCollider mutates only the bounds — the flag
    // rides the same object forever.
    const person = (b: AABB): AABB => { b.seeThroughCamera = true; return b; };
    this.rosaCollider = person(boxFromCenter(-27, 0.85, 6.8, 0.56, 1.7, 0.56));
    this.idrisCollider = person(boxFromCenter(-2, 0.85, -4.6, 0.56, 1.7, 0.56));
    this.kidCollider = person(boxFromCenter(15, 0.7, 6.35, 0.5, 1.4, 0.5));
    this.customerCollider = person(boxFromCenter(0, -999.5, 0, 0.56, 1.7, 0.56));
    // stranger/Sal/familiar — parked underground until their beats make them
    // visible (the customer's trick); updateDynamics syncs them with the cast
    this.strangerCollider = person(boxFromCenter(0, -999.5, 0, 0.56, 1.7, 0.56));
    this.salCollider = person(boxFromCenter(-7, 0.85, 7.85, 0.56, 1.7, 0.56));
    this.familiarCollider = person(boxFromCenter(0, -999.5, 0, 0.56, 1.7, 0.56));
    this.colliders.push(this.rosaCollider, this.idrisCollider, this.kidCollider, this.customerCollider,
      this.strangerCollider, this.salCollider, this.familiarCollider);

    // ---------------- cast (Rosa, Idris, the kid) ---------------------------
    this.rosa = this.spawnActor('Rosa', -27, 0.05, 6.8, { jacket: 0xff6b6b, pants: PAL.ink, skin: 0xe8b08e, hair: 0x9a938c, style: 'bun', shawl: 0x7a5c68 });
    this.idris = this.spawnActor('Idris', -2, 0.05, -4.6, { jacket: PAL.plum, pants: PAL.ink, skin: 0x8a5a3b, hair: 0x241f1c, style: 'cap', glasses: true });
    this.idris.visible = false;
    // The kid, at the glass — a small shape against the light. The web port
    // had him at the greybox's z (7.86), but the articulated kid is shallower
    // than the greybox capsule: his front face sat BEHIND the emissive window
    // box (front at 7.90), so the lit window rendered over him and he was
    // invisible from the street (playtest: "I didnt see any kid in day 2").
    // z=7.78 puts his silhouette in front of the glass, against the light.
    this.kidSil = this.spawnActor('TheKid', 13.5, 8.6, 7.78, { jacket: 0x514659, pants: 0x473e50, skin: 0x514659, hair: 0x453b4c, style: 'flat' });
    this.kidSil.scale.setScalar(0.5);
    this.kidSil.visible = false;

    // ---------------- the living street (docs/28 — workstreams A & B) ------
    // Shared materials + geometry through the bank (created at the top of
    // the constructor — signs need it first); seeded tree placement so
    // every run of the block is the same block.
    const rng = seededRng(20261029);

    // ---- brownstone row (south-west face): stoops, doors, windows, AC ----
    // A-3 UNIT 7: the stoop/window/AC z's derive against the KTS-01 shell
    // (face +0.6/0.06/0.25 proud respectively); the stoop and window x
    // rhythms are the row's own style (the registry row names them).
    const brownsFace = kts1.z + kts1.d / 2;
    const stoopDoors = [PAL.teal, 0xff6b6b, 0x6d4c7d];
    const stoopX = [-40, -34, -28];
    for (let i = 0; i < stoopX.length; i++) {
      const stoop = makeBrownstoneStoop(this.bank, stoopDoors[i]);
      stoop.position.set(stoopX[i], 0, brownsFace + 0.6);
      this.scene.add(stoop);
    }
    // tall parlor windows between the stoops + a couple of AC units
    for (const wx of [-43, -37, -31, -25, -19, -13, -7, -1]) {
      for (const wy of [3.6, 6.6, 9.6]) {
        this.decoMesh(`BrownstoneWin_${wx}_${wy}`, new THREE.BoxGeometry(1.1, 1.9, 0.08), this.mat(0x3b3346), wx, wy, brownsFace + 0.06);
      }
    }
    for (const [ax, ay] of [[-37, 3.0], [-25, 3.0], [-13, 6.0]] as const) {
      const ac = makeACUnit(this.bank);
      ac.position.set(ax, ay, brownsFace + 0.25);
      this.scene.add(ac);
    }

    // ---- storefronts (north face): named shops with awnings ----
    // Sunrise Laundry is not a flat prop anymore — Day 4 opens the block
    // (docs/30): a real recessed bay, Sal behind the counter, two washers
    // (one spins when a wash is running), shirts on the sidewalk rack.
    this.buildLaundromat();
    // rotation π: the storefront builder leans its awning and sign toward
    // local +z; the street is on the −z side of the north-face row. (This
    // also fixes the recorded "pizza-awning diagonal" — the shipped copies
    // leaned INTO their building faces; the awning now hangs over the walk.)
    const pizza = makeStorefront(this.bank, this.signMaterials.bind(this), 'CORNER SLICE PIZZA', PAL.coral, 6, 'Pizza_Glass');
    pizza.position.set(27, 0.05, 8.02);
    pizza.rotation.y = Math.PI;
    this.scene.add(pizza);
    // AC units under the gold-window building's upper windows (unit 7: the
    // cols' x and the proud face z derive off the KTN-03 shell)
    for (const ax of [goldGridX, goldGridX + 6]) {
      const ac = makeACUnit(this.bank);
      ac.position.set(ax, 5.9, goldFaceZ - 0.19);
      this.scene.add(ac);
    }

    // ---- the expanded block (Doc 37 §3A, built in docs/38 §3) ------------
    // Everything new lives east of x = 29, on land no authored beat, ped
    // route, or E2E path uses. Compact, rich, zero new dependencies.
    this.buildAlley();
    this.buildBarbershop();
    this.buildCourt();
    this.buildPark();
    this.buildVendorCart();

    // ---- subway plaza (north-west end): entrance, flyer board, benches ----
    // The plaza owns its paving: two stone slabs flanking the subway stair
    // cut, sitting a half-centimetre proud of the sidewalk (the same proud
    // edge as the tree-pit soil, which reads cleanly in frame). The first
    // draft deck (top 0.03) was buried INSIDE the sidewalk (top 0.1) and
    // rendered nowhere — a plaza you can't see is not a plaza. The slabs
    // dodge both plaza tree pits (soil tops also 0.105 — coplanar tops
    // shimmer) and leave a walk-coloured apron around the stair; birds'
    // groundY (0.1) sinks half a centimetre into the stone, which is
    // invisible at bird scale. receive:true so shadows land on the stone.
    this.solid('Plaza_Deck_W', -44.3, 0.09, 6.55, 1.4, 0.03, 2.3, PAL.stone, { collide: false, cast: false, receive: true });
    this.solid('Plaza_Deck_E', -39.3, 0.09, 6.45, 2.6, 0.03, 2.5, PAL.stone, { collide: false, cast: false, receive: true });
    const subway = makeSubwayEntrance(this.bank, this.signMaterials.bind(this));
    // A-3 UNIT 9 + consumer fix (2026-11): SUB-01 sits on the K-line
    // STAIR_SLOT center (−47.2, 6.2). The SUBWAY sign and railings frame
    // the real hole. The old (−42, 6.2) headhouse stood on continuous
    // sidewalk while the descendable shaft lived five metres west — players
    // only saw a sign board and railings with no way down. Prop has no
    // collider (paved-path law); the kit's slot walls own the grade change.
    const sub1 = this.regShell('SUB-01');
    subway.position.set(sub1.x, 0.05, sub1.z);
    this.scene.add(subway);
    this.flyerMat = new THREE.MeshLambertMaterial({ map: this.flyerTexture('YOUR CORNER') });
    const board = makeBulletinBoard(this.bank, this.flyerMat);
    board.position.set(-37.6, 0.05, 7.5);
    board.rotation.y = Math.PI; // faces the street, readable from the sidewalk
    this.scene.add(board);
    const plazaBench = makeBench(this.bank);
    plazaBench.position.set(-40.5, 0.05, 4.55);
    plazaBench.rotation.y = Math.PI;
    this.scene.add(plazaBench);
    this.colliders.push(boxFromCenter(-40.5, 0.35, 4.55, 1.85, 0.7, 0.62)); // bench blocks
    this.registerGlbProp('bench_plaza', plazaBench);
    void this.upgradePropWithGLB('bench_plaza', 'models/park_bench.glb');
    const papers = makeNewspaperBoxes(this.bank);
    papers.position.set(-44.6, 0.05, 6.6);
    this.scene.add(papers);
    // one real sand3d newsrack wears the red box; its cream label chip is a
    // fallback-only sibling and hides when the model lands
    const newsrackPh = papers.children[0];
    const newsrackChip = papers.children[2];
    this.registerGlbProp('newsrack', newsrackPh);
    void this.upgradePropWithGLB('newsrack', 'models/newsrack.glb')
      .then((ok) => { if (ok) newsrackChip.visible = false; });
    this.colliders.push(boxFromCenter(-44.29, 0.425, 6.62, 1.3, 0.85, 0.6)); // newsboxes block

    // ---- bus stop (north, west of the bodega) + bench ----
    // The bench sits against the building line (z 7.55), east of the sign
    // pole — real NYC placement keeps the walking lane (z ≈ 4–7.2) open.
    // The first draft had the bench mid-sidewalk at z 6.85 WITH a pole
    // collider at 7.35: the E2E walker hit the bench face head-on, the
    // sidestep shoved it into the 0.575 m pocket between pole and building,
    // and it was wedged there for the rest of the run — the exact
    // "trapped in geometry" failure this pass exists to prevent. Now the
    // lane is open, the bench still blocks (it is a bench), and the sign
    // pole is air like the wires (nothing can force you into its corner).
    const bus = makeBusStop(this.bank, this.signMaterials.bind(this));
    bus.position.set(-24.5, 0.05, 7.35);
    this.scene.add(bus);
    const busBench = makeBench(this.bank);
    busBench.position.set(-23.3, 0.05, 7.62);
    busBench.rotation.y = Math.PI;
    this.scene.add(busBench);
    this.colliders.push(boxFromCenter(-23.3, 0.35, 7.62, 1.85, 0.7, 0.62)); // bench blocks
    this.registerGlbProp('bench_bus', busBench);
    void this.upgradePropWithGLB('bench_bus', 'models/park_bench.glb');

    // ---- street furniture: lights, cans, hydrant, one honest barrier ----
    // The lamp faces are lit: the sun never leaves golden hour here, and
    // city lamps switch on before sundown — four dead heads read as props,
    // not as a block people walk home under. One shared emissive material.
    const lampFace = this.nightGlow(PAL.taxi, 0.35, 2.4);
    // x-spots clear of the tree canopies: a pole sharing its block-face with
    // a tree spears the crown, and the gold lamp head pokes out the far side
    // as a floating yellow chip (Doc 31 read exactly that in two frames).
    // Worst canopy reach is 1.85 m from the trunk; every lamp now clears a
    // tree by >= 3 m. Lamp 1 moved -34 -> -31 (tree 0 sat at the same x),
    // lamp 3 -18 -> -19.5 and lamp 4 30 -> 31.5 (a metre of margin is not
    // margin when a seeded canopy blob can grow another half-metre).
    const lights: Array<[number, number, number]> = [
      // lamp 2 sat at (8, 7.42) from M2 until W2 — the garden slot's mouth
      // (ALY-02, x 6.5..9) opens exactly there, and a lamp post standing in
      // a doorway is a wall with a light on it. Moved 2.1 m west, clear of
      // the mouth and of every door and bay (registry canon list updated).
      [-31, 7.42, Math.PI / 2], [5.9, 7.42, Math.PI / 2],
      [-19.5, -7.35, -Math.PI / 2], [31.5, -7.35, -Math.PI / 2],
    ];
    for (let li = 0; li < lights.length; li++) {
      const [lx, lz, lyaw] = lights[li];
      const lamp = makeStreetlight(this.bank, lampFace);
      lamp.position.set(lx, 0.05, lz);
      lamp.rotation.y = lyaw; // arm reaches over the street
      lamp.name = `Streetlight_${li}`; // probes assert on these
      this.scene.add(lamp);
    }
    const can1 = makeTrashCan(this.bank); can1.position.set(-19, 0.05, 7.66); this.scene.add(can1);
    const can2 = makeTrashCan(this.bank); can2.position.set(2, 0.05, -7.45); this.scene.add(can2);
    const recy = makeRecycleBin(this.bank); recy.position.set(2.85, 0.05, -7.45); this.scene.add(recy);
    const hyd2 = makeHydrant(this.bank); hyd2.position.set(34, 0.05, -4.75); this.scene.add(hyd2);
    // DSNY baskets wear all three cans (one street, one look); the corner
    // can + recycle bin stay one recycling station (shared collider below,
    // unchanged). The east hydrant wears the same model as the west one.
    this.registerGlbProp('trashcan_north', can1);
    this.registerGlbProp('trashcan_east', can2);
    this.registerGlbProp('recycle_bin_east', recy);
    this.registerGlbProp('hydrant_east', hyd2);
    void this.upgradePropWithGLB('trashcan_north', 'models/trashcan.glb');
    void this.upgradePropWithGLB('trashcan_east', 'models/trashcan.glb');
    void this.upgradePropWithGLB('recycle_bin_east', 'models/recycling_bin.glb');
    void this.upgradePropWithGLB('hydrant_east', 'models/hydrant.glb');
    // the barrier is a diary entry now (Doc 33 §2.3): Days 1–3 it guards a
    // (theatrically) open water main; Day 4 it's gone and the patch it left
    // reads as fresh asphalt. Kept OUT of the static bake — a merged mesh
    // can't change its mind about existing. It sits at the building line
    // (z 7.62): the north walking lane (z 4–7.2) stays open, and its
    // collider is DYNAMIC — parked underground the day the city takes it.
    const barrier = makeBarrier(this.bank); barrier.position.set(-9.7, 0.05, 7.62); barrier.rotation.y = 0.35; this.scene.add(barrier);
    this.barrier = barrier;
    // fresh asphalt, one hair proud of the slab (top 0.102 vs slab 0.1 —
    // the same proud-edge trick the tree pits and plaza decks use). A
    // patch you can't see is not a patch.
    this.asphaltPatch = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.012, 0.95),
      this.mat(0x3e3a46),
    );
    this.asphaltPatch.name = 'AsphaltPatch';
    this.asphaltPatch.position.set(-9.7, 0.096, 7.62);
    this.asphaltPatch.receiveShadow = true;
    this.asphaltPatch.visible = false;
    this.scene.add(this.asphaltPatch);
    // solids, sized to the visuals. The can + recycle bin are ONE recycling
    // station — a single box spanning both: as two boxes they left a 0.14 m
    // slot between them (sub-capsule) that wedged a walker solid (E2E).
    // All north-side boxes keep minZ >= 7.28: the walking lane (z 4–7.2)
    // stays open.
    this.colliders.push(boxFromCenter(-19, 0.5, 7.66, 0.74, 1.0, 0.74));        // can (north)
    this.colliders.push(boxFromCenter(2.41, 0.5, -7.45, 1.56, 1.0, 0.74));      // can + recycle station
    this.colliders.push(boxFromCenter(34, 0.425, -4.75, 0.45, 0.85, 0.45));     // hydrant
    for (const [lx, lz] of lights) {
      this.colliders.push(boxFromCenter(lx, 2.6, lz, 0.24, 5.2, 0.24));         // lamp posts
    }

    // ---- street trees in tree pits (seeded; never in front of a door) ----
    // (-4, 7.15) moved to (-1.2, 7.15): the laundromat bay is there now, and
    // a tree growing through the washers read exactly as broken.
    const treeSpots: Array<[number, number]> = [
      [-34, 7.48], [-22, 7.48], [-1.2, 7.48], [20, 7.48], [32, 7.48],     // north —
      // ↑ the whole north row sits at the building line. The block's own
      // "sidewalk law" (buildLaundromat) keeps the north walking lane open
      // at z ≈ 4–7.2, and the authored E2E hauls run it at z 6.8–6.9 — any
      // solid reaching below z 7.28 grazes that lane and stalls the driver
      // on a wall it cannot round in one sidestep window (5 fps).
      [-44, -7.0], [-30, -7.0], [-16, -7.0], [28, -7.0], [38, -7.0],      // south
      // W8 (2026-11-12): the west plaza park tree slides (−45 → −43.9) —
      // its trunk stood in the new station corridor's east exit (z 4.52..4.88
      // inside the z 4..5.55 through-path; the walk-ability probe's own
      // forensics). The plaza keeps its tree; the corridor keeps its width.
      [-43.9, 4.7], [-38.6, 4.5],                                          // plaza park trees
    ];
    // Four of the twelve are turning — the two plaza park trees (you meet
    // them first, off the subway stairs) plus one tree each side of the
    // street. Read as species, not as weather: honey locusts hold green,
    // the ginkgos went gold. The rest of the block stays October-green.
    const autumnTrees = new Set([2, 8, 10, 11]);
    const treeTops: number[] = []; // real canopy tops — leaf drift spawns under them
    for (let i = 0; i < treeSpots.length; i++) {
      const [tx, tz] = treeSpots[i];
      // y=0.07: the pit rides ON the slab — soil top (0.105) and rim lip
      // (0.155) both stand proud of the sidewalk (0.1). The first draft sat
      // at 0.03 and the slab swallowed the soil whole: the "pit" showed tan
      // paving inside a tan frame. A pit you can't see is not a pit.
      const pit = makeTreePit(this.bank);
      pit.position.set(tx, 0.07, tz);
      this.scene.add(pit);
      this.treePits.push({ x: tx, z: tz });
      const t = makeTree(this.bank, rng, autumnTrees.has(i));
      t.group.position.set(tx, 0.05, tz);
      t.group.rotation.y = rng() * Math.PI * 2;
      this.scene.add(t.group);
      // sphereIndex: i — the shipped spheres land in the follow-up loop
      // below, one per tree in the same order.
      this.trees.push({ group: t.group, x: tx, z: tz, baseY: 0.05, h: t.h,
        yaw: t.group.rotation.y, phase: rng() * Math.PI * 2, fade: 1,
        sphereIndex: i, top: t.top, blobs: t.blobs.map((b) => ({ ...b, idx: -1 })) });
      treeTops.push(t.top);
      // the trunk is wood — a thin box that matches it (canopy stays air;
      // only the trunk blocks). North STREET trees extend back to the
      // building face: the strip between a free-standing trunk and the wall
      // is 0.67 m — narrower than the walker — and a body sidestepped into
      // it could never leave (the E2E proved it). Merging trunk and wall
      // removes the pocket without moving any usable space: nobody fit
      // there before. Plaza trees and the south row keep plain boxes (their
      // backs are open or passable). W2 exception (docs/47): the alley-mouth
      // tree (x 32) stops at the VISUAL trunk — the face line there opens
      // into the R-ALLEY lane, and the old reach-to-the-wall box walled the
      // shortcut's own door; the pocket it leaves is open on the lane side,
      // a sidestep, not a trap.
      const trunkHalf = 0.18;
      const zMax = tz > 6 ? (Math.abs(tx - 32) < 0.01 ? tz + trunkHalf : 8.0) : tz + trunkHalf;
      const zSpan = (zMax - (tz - trunkHalf));
      this.colliders.push(boxFromCenter(tx, 1.1, (tz - trunkHalf + zMax) / 2, 0.36, 2.2, zSpan));
    }
    // Canopy spheres for GameCamera's sidestep (see pickSideStep). One sphere
    // per tree, centred a blob-radius under the measured top. The widest
    // cluster the factory can roll: blob r ≤ 1.4, x AND z jitter ±0.45
    // combine diagonally (±0.64) and the group spins — so the true horizontal
    // reach is ~2.04 m, and r 1.9 let a real canopy graze the sight line by
    // three centimetres while still swallowing the player on screen. r 2.15
    // covers the worst roll with margin. Coarse on purpose — the camera only
    // needs "a blob of leaves lives here", not the exact silhouette.
    for (let i = 0; i < treeSpots.length; i++) {
      this.canopySpheresCache.push({ x: treeSpots[i][0], y: treeTops[i] - 0.9, z: treeSpots[i][1], r: 2.15 });
    }

    // ---- one more parked vehicle: a delivery van, north curb ----
    // "GOLDEN ORCHARD PRODUCE CO." — rebuilt as a proper box truck (Doc 04
    // law, banked materials, signage via the same canvas factory as every
    // other block sign). Its body now fills the collider below: the old
    // 3.7 m visual inside a 4.4 m box meant 0.7 m of invisible wall east of
    // the tailgate.
    const van = makeVan(this.bank, this.signMaterials.bind(this));
    van.position.set(-14, 0, 3.05);
    van.rotation.y = Math.PI;
    this.scene.add(van);
    this.colliders.push(boxFromCenter(-14, 0.75, 3.05, 4.4, 1.5, 1.95));

    // ---- utility poles + overhead wires (second-agent env pass) ----------
    // Three wooden poles on the south sidewalk, wires sagging between them
    // and a service drop to the wall behind each one. Signs bolt to the
    // poles — the city never gives a sign its own post if a pole is there.
    // Poles collide (they are wood); wires do not (they are air).
    const poleSpots = [-8.5, 20, 44.5];
    for (const px of poleSpots) {
      const pole = makeUtilityPole(this.bank);
      pole.position.set(px, 0.05, -7.35);
      this.scene.add(pole);
      this.colliders.push(boxFromCenter(px, 3.4, -7.35, 0.3, 6.8, 0.3));
    }
    const wireMat = this.mat(PAL.ink);
    const armZ = -7.35 + 0.62; // the crossarm reaches toward the street
    for (let i = 0; i < poleSpots.length - 1; i++) {
      this.scene.add(makeSpanWires(wireMat,
        { x: poleSpots[i], y: 6.2, z: armZ },
        { x: poleSpots[i + 1], y: 6.2, z: armZ },
        { sag: 0.5, offsets: [-0.7, 0, 0.7] },
      ));
    }
    for (const px of poleSpots) {
      this.scene.add(makeSpanWires(wireMat,
        { x: px, y: 6.05, z: armZ },
        { x: px, y: 6.05, z: armZ },
        { offsets: [], dropTo: { x: px, y: 4.3, z: -7.93 } }, // service drop only
      ));
    }
    const oneWay = makePoleSign(this.bank, this.signMaterials.bind(this), 'ONE WAY',
      { y: 3.0, facing: 'traffic', arrow: true });
    oneWay.position.set(-8.5, 0.05, -7.35);
    this.scene.add(oneWay);
    const noStanding = makePoleSign(this.bank, this.signMaterials.bind(this), 'NO STANDING',
      { w: 1.05, h: 0.4, y: 3.0, bg: PAL.coral, fg: PAL.cream, facing: 'street' });
    noStanding.position.set(20, 0.05, -7.35);
    this.scene.add(noStanding);

    // ---- traffic signal at the crosswalk (SE corner) ----------------------
    // Mast arm reaches over the road so the head hangs above the cab lane,
    // lamps facing the oncoming cab. Deco only; the pole is a solid like
    // every other pole on the block.
    const signal = makeTrafficSignal(this.bank, {
      greenLamp: this.nightGlow(PAL.teal, 0.55, 2.2),
    });
    signal.position.set(-1.8, 0.05, -7.55);
    this.scene.add(signal);
    this.colliders.push(boxFromCenter(-1.8, 2.75, -7.55, 0.3, 5.5, 0.3));

    // ---- planters (the plaza one; the east planter moved to the park,
    // docs/38 — the barbershop needed its storefront, and the planter's
    // PED bow-around entry moved with it, doc 35 §3's ghost-prop lesson).
    // W8 (2026-11-12): the plaza planter slides east (−46.6 → −44.9) —
    // its old spot stood IN the new station corridor (z 4..5.55, the walk-
    // ability probe's forensics: a 0.55 m pinch between planter and slot
    // face that no capsule fits through) and sealed the through-path.
    const planterPlaza = makePlanter(this.bank, rng);
    planterPlaza.position.set(-44.3, 0.05, 4.4);
    planterPlaza.rotation.y = Math.PI / 2;
    this.scene.add(planterPlaza);
    // the plaza one is yawed π/2 so its long axis runs z
    this.colliders.push(boxFromCenter(-44.3, 0.25, 4.4, 0.55, 0.55, 1.1));
    // the bulletin board is furniture too (its flyer face is the Day-3 beat)
    this.colliders.push(boxFromCenter(-37.6, 0.975, 7.5, 1.75, 1.95, 0.3));

    // ---- one cast-iron fire-escape silhouette on the brownstone row ------
    // Decorative only — no colliders, no triggers. The climbable escape on
    // the fire-escape building stays the lead agent's greybox geometry.
    // Unit 7: the z rides the row face (the x is the row's own style —
    // the registry row's style text names the silhouette at x −21.5).
    const escape = makeFireEscapeDeco(this.bank, 4.4, 8.2);
    escape.position.set(-21.5, 0, kts1.z + kts1.d / 2 + 0.02);
    this.scene.add(escape);

    // ---- pigeons + squirrel (seeded; behaviors in ambient.ts) ----
    // zBand keeps every bird and the squirrel on the sidewalk paving —
    // the road is for the cab, not for standing in.
    // Plumage morphs: a real sidewalk flock is three greys, not twelve
    // clones (skyline / ink / warm rufous), and some birds wear a cream
    // nape blaze. All bank stock — variety costs zero extra materials.
    const pigeonMats = {
      body: this.bank.get(PAL.skyline), head: this.bank.get(PAL.ink), beak: this.bank.get(PAL.amber),
      bodies: [this.bank.get(PAL.skyline), this.bank.get(PAL.ink), this.bank.get(PAL.bldg2)],
      patch: this.bank.get(PAL.cream),
    };
    // groundY = 0.1: the north sidewalk slab tops out there, and a flock
    // rooted at y = 0 stands knee-deep in the paving — at the curb seam the
    // birds read half-buried (Doc 31, d3_plaza_pigeons_portrait). Every
    // zBand below stays within the slab (z 4..8), so one height covers all.
    this.pigeonFlock = new PigeonFlock(
      this.scene,
      pigeonMats,
      90210, { x: -40, z: 5 }, 2.4, 9, { min: 4.35, max: 7.2 }, 0.1,
    );
    this.pigeonFlock.group.name = 'Flock_Plaza'; // probes assert on these
    this.squirrel = new Squirrel(
      this.scene,
      { fur: this.bank.get(0x8a6a4a), tail: this.bank.get(0x7a5c48) },
      7, { x: -36.4, z: 4.8 }, { min: 4.2, max: 7.4 }, 0.1,
    );
    this.squirrel.group.name = 'Squirrel';
    // a small east-end flock — the plaza flock shouldn't own all the birds
    this.pigeonFlockEast = new PigeonFlock(
      this.scene,
      pigeonMats,
      2718, { x: 30, z: 5 }, 1.8, 4, { min: 4.35, max: 6.2 }, 0.1,
    );
    this.pigeonFlockEast.group.name = 'Flock_East';

    // ---- leaf drift (early autumn; one instanced mesh, one draw call) ----
    // tops come from the trees we just grew (2.9..4.5 m), so leaves are born
    // inside a canopy, not mid-air below it; ground heights are derived per
    // leaf inside LeafDrift (pit soil / sidewalk slab / asphalt). Each tree
    // sheds its OWN palette — the turning trees drop gold, the green ones
    // green — a gold leaf under a green canopy reads as a mistake.
    const GREEN_TINTS = [0x5d7d4a, 0x516e42, 0x516e42];
    const TURNING_TINTS = [0xffb85c, 0xf7b32b, 0x516e42];
    const leafSpots = treeSpots.map(([lx, lz], i) => ({
      x: lx, z: lz, r: 1.3, top: treeTops[i],
      tints: autumnTrees.has(i) ? TURNING_TINTS : GREEN_TINTS,
    }));
    // LeafDrift is constructed AFTER buildAlderHeightsW1() so the new tree
    // rows shed leaves too (see the call site below the W1 build).

    // ---- the stool (Day 3 purchase) + the kid at ground level ----
    this.stool = makeStool(this.bank);
    this.stool.position.set(6.95, 0.05, -6.55); // east-south of the cart — OUT of the serving pocket (the old spot sealed the D4 corner shut: cart | 27 cm | kid)
    this.stool.visible = false;
    this.scene.add(this.stool);
    // furniture is furniture once it exists: the stool carries a collider
    // that is parked underground while it is hidden and lands with it when
    // bought (synced in updateDynamics). The cart's side is clear of it, so
    // buying never spawns a box under your feet.
    this.stoolCollider = boxFromCenter(5.25, 0.3, -5.7, 0.55, 0.6, 0.55);
    this.colliders.push(this.stoolCollider);
    this.colliders.push(this.barrierCollider);
    this.kidGround = this.buildPerson({
      jacket: 0x514659, pants: 0x473e50, skin: 0xd9a06b, hair: 0x453b4c, style: 'flat', shoe: 0xc0392b,
    });
    this.kidGround.name = 'TheKidDown';
    this.kidGround.scale.setScalar(0.78);
    this.kidGround.position.set(15, 0.05, 6.35);
    this.kidGround.rotation.y = Math.PI; // faces the street
    this.kidGround.visible = false;
    this.scene.add(this.kidGround);

    // ---- the stranger (Day 4): the player's Day-1 mirror. Duffel bag,
    // paper Map, that look. She stands where the story started. ----
    this.stranger = this.spawnActor('TheStranger', -36.4, 0.05, 4.8, {
      jacket: 0x4a6b5a, pants: 0x3d4a55, skin: 0xe8b08e, hair: 0x2b2730, style: 'bun',
    });
    this.stranger.rotation.y = Math.PI; // faces the street, like you did
    this.stranger.visible = false;
    // the duffel — a soft slab slung on her back, the whole biography
    const duffel = new THREE.Group();
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.2), this.mat(0x8a3b32));
    bag.castShadow = true;
    bag.position.set(0, 0.15, 0);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.02), this.mat(0x6e2f28));
    strap.position.set(0, 0.32, 0);
    duffel.add(bag, strap);
    duffel.position.set(0.05, 1.15, -0.24); // between the shoulders, on the back (model faces local +Z)
    this.stranger.add(duffel);

    // ---- the familiar face (Doc 33 §2.2, dressing.ts): ONE recurring
    // neighbor. Stone-gray cardigan, folded newspaper under her arm, a walk
    // that never hurries. Same body every day — that's the entire design:
    // a walker who has passed you on enough days becomes a person. Her
    // schedule is a Game-side waypoint walk keyed on the day number; no
    // collider, no prompt, no flag stored. ----
    this.familiar = this.spawnActor('TheFamiliar', -40.5, 0.12, 4.7, {
      jacket: 0x8a8378, pants: 0x47404b, skin: 0xe8b08e, hair: 0x9a938c, style: 'bun',
    });
    this.familiar.rotation.y = Math.PI; // built sitting the plaza bench, watching the street
    this.familiar.visible = false;
    // the folded paper — a slab tucked against her left side, at rest
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.19), this.mat(PAL.cream));
    paper.castShadow = true;
    paper.position.set(-0.06, -0.42, 0.03); // against the arm, below the hand
    paper.rotation.z = 0.12;
    this.familiar.userData.rig.armL.add(paper);

    // ---------------- Sal + Sunrise Laundry + the permit (docs/30) ---------
    this.sal = this.spawnActor('Sal', -7.0, 0.05, 7.85, {
      jacket: PAL.teal, pants: PAL.ink, skin: 0x8a5a3b, hair: 0x9a938c, style: 'flat', glasses: true,
    });
    this.sal.rotation.y = Math.PI; // faces the street, chest-up behind his counter
    this.permitReceipt = this.buildPermitReceipt();
    this.permitReceipt.visible = false;
    this.scene.add(this.permitReceipt);

    // ---------------- steam (manhole, animating) ----------------------------
    const steamCount = 24;
    const pos = new Float32Array(steamCount * 3);
    this.steamSeed = new Float32Array(steamCount);
    this.steamLife = new Float32Array(steamCount);
    for (let i = 0; i < steamCount; i++) {
      this.steamSeed[i] = Math.random() * Math.PI * 2;
      this.steamLife[i] = Math.random() * 2.5;
      pos[i * 3] = -10 + (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = 0.1 + Math.random() * 2;
      pos[i * 3 + 2] = 0.5 + (Math.random() - 0.5) * 0.5;
    }
    const steamGeo = new THREE.BufferGeometry();
    steamGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.steamPoints = new THREE.Points(steamGeo, this.steamMaterial());
    this.steamPoints.frustumCulled = false;
    this.scene.add(this.steamPoints);

    // ---------------- ALDER HEIGHTS — the master world (docs/39–45) --------
    // W1: the street grid, the skeleton, the Marlow row. Built BEFORE the
    // bake so every static slab/curb/shell merges into its district tile.
    this.buildAlderHeightsW1();
    // W2: the Gable brownstone row, both interior parks, the two shortcuts.
    // Also before the bake — and before LeafDrift (the playground trees
    // join the leaf spots).
    this.buildAlderHeightsW2();
    // W3: the avenue walls, the landmarks, the painted gables. Also pre-bake.
    this.buildAlderHeightsW3();
    // W6: the terrace build-out (docs/production/terrace-buildout — the
    // owner's expansion authorization): the core grows z ±48 → ±64, the
    // strips behind Gable and Marlow gain eight real rows (every mass via
    // regShell — the no-invention law), the gardens behind the pinned
    // backdrop rows get lawn, benches and trees. All pre-bake. The
    // neighborhood fabric (ironwork, terrace faces, street props) runs in
    // its own pass just before the bake.
    this.buildAlderHeightsW6Terrace();
    // W7: the Westgate & Eastgate rows (docs/production/westgate-eastgate —
    // the map's LAST two sides): the core grows x ±84 → ±100, the E–W
    // streets grow their west and east ends (butt-jointed slabs, same
    // levels), and 24 real masses continue the Gable / Kestrel / Marlow
    // rows and both terrace bands into the strips (every mass via regShell
    // — the no-invention law). All pre-bake.
    this.buildAlderHeightsW7Gates();
    // W4 part 1: the district's static life — zone figures, parked cars,
    // the BUS-03 stop — all pre-bake so the W0 merge swallows them (the
    // perf law: the zones cost merges, not draw calls).
    this.buildAlderHeightsW4Life();
    // W4 part 2: the M121's body (dynamic, never baked), the half-court's
    // dusk pickup pair (dusk-toggled, merged by material), the TEN-01
    // laundry (static, bakes free) and the hall's notice board (the face
    // carries a canvas texture, so it stays out of the bake by itself).
    this.buildAlderHeightsW4Traffic();
    // W5: the interiors batch (docs/45 §1 W5) — the rooms hollow their
    // masses' ground floors, furnish to the registry's fixture level, and
    // every room carries the visibility toggle (near = fit-out + clear
    // glass; far = the shipped lit-glass face; inside = the tower ducks).
    this.buildAlderHeightsW5();
    this.upgradeInteriorPropsWithGLB();
    // the rooms' palette (after the handles exist; dressRoom reads them)
    this.dressW5Rooms();
    // the W8 strip-row room rides the same identity pass (its handle
    // exists by now — the dress law reads handles, not build order)
    this.dressRoom('FRUIT-INT', { wainscot: 0x4a7a52, trim: 0xf3e2c2, light: 0xfff2d8, clear: 3.2,
      skips: { z1: [[-66.8, -65.6]] } });
    // the W9 strip rooms ride the same identity pass (their handles exist
    // by now — the dress law reads handles, not build order)
    this.dressRoom('WINE-INT', { wainscot: 0x5a2a2e, trim: 0xf3e2c2, light: 0xffe2c8, clear: 3.2,
      skips: { z1: [[61.2, 62.4]] } });
    this.dressRoom('BOOKS-INT', { wainscot: 0x6a5a3a, trim: 0xf3e2c2, light: 0xfff2d8, clear: 3.2,
      skips: { z0: [[-88.6, -87.4]] } });
    this.dressRoom('HARDWARE-INT', { wainscot: 0x6a6a72, trim: 0xf3e2c2, light: 0xfff2d8, clear: 3.2,
      skips: { z0: [[-96.6, -95.4]] } });
    this.dressRoom('NEWS-INT', { wainscot: 0x5a4a52, trim: 0xf3e2c2, light: 0xfff2d8, clear: 3.2,
      skips: { z0: [[87.4, 88.6]] } });
    this.dressRoom('VERBENA-INT', { wainscot: 0x3f5a44, trim: 0xf3e2c2, light: 0xfff2d8, clear: 3.2,
      skips: { z0: [[95.4, 96.6]] } });
    this.dressRoom('CORNELIUS-INT', { wainscot: 0x5f4a3a, trim: 0xf3e2c2, light: 0xffe8cc, clear: 3.2,
      skips: { z0: [[-88.6, -87.4]] } });
    this.dressRoom('WESTGATE-INT', { wainscot: 0x54454e, trim: 0xf3e2c2, light: 0xfff2d8, clear: 3.2,
      skips: { z0: [[-96.6, -95.4]] } });
    this.dressRoom('PROVISIONS-INT', { wainscot: 0x6a5a3a, trim: 0xf3e2c2, light: 0xffe8cc, clear: 3.2,
      skips: { z0: [[87.4, 88.6]] } });
    this.dressRoom('CHEESE-INT', { wainscot: 0x8a6a3a, trim: 0xf3e2c2, light: 0xffe2c8, clear: 3.2,
      skips: { z0: [[95.4, 96.6]] } });

    // the world-visual-quality pass (docs/3d-assets): crowns, gable walls,
    // sills, AC units, roof clutter, street-floor life — ALL pre-bake so
    // the district tiles fuse every piece; zero colliders, zero nav changes
    this.buildWorldVisualQualityPass();

    // the city-fabric pass (docs/production/city-fabric — the slop-newyork
    // adaptation): rooftop water tanks + chimneys + bulkheads on the registry
    // roofscape, the four documented-but-never-built skyline rows (SKY-W/E/S
    // + the north depth row) as real varied buildings, and the sidewalk
    // furniture (meters, DSNY baskets, cross-street name blades). All
    // pre-bake so the tiles fuse the fabric; the skyline pair is NAMED_SKIP
    // (always visible, never district-owned). Zero colliders, zero nav
    // changes, deterministic (pinned by tests/city-fabric.test.ts).
    this.buildCityFabricPass();

    // the neighborhood fabric pass (the W6 continuation — same bake law)
    this.buildNeighborhoodFabricPass();

    // SI (2026-11-11): the borough-character pass — the slop-newyork port's
    // other half. The three Mallow-row buildings (registry LMS-01/IND-01/
    // GLS-01) and their styles, the multi-landing fire escapes, the cornice
    // bands, the rooftop chillers (the fabric pass owns tanks/chimneys/
    // bulkheads — this pass keeps only what the fabric lacks), and the
    // street life (mailbox, steam vent, the Kestrel blade, the Juniper
    // mast, the station globes, the TS subway stair). Pre-bake like every
    // static wave; its five colliders are street furniture seated off the
    // walk lanes exactly like the shipped bulletin board / planter set.
    // The union ruling (2026-11-11, both waves landed in parallel): the
    // fabric's roofscape owns tanks/chimneys/bulkheads, so this pass ships
    // without them — docs/slop-integration/01 §2 records the retirement.
    this.buildAlderHeightsSI();

    // leaf drift, now over every tree on the block (shipped 12 + W1 rows)
    this.leaves = new LeafDrift(this.scene, [...leafSpots, ...this.extraLeafSpots], 4);

    // the fenestra plan: every proud window the builders shipped, matched
    // to its registry shell (the no-invention law) — collected BEFORE the
    // bake so the named source meshes are alive
    this.fenestraPlan = collectWindowPlan({
      scene: this.scene,
      regShell: (id) => this.regShell(id),
      buildings: loadRegistry().allBuildings(),
    });

    this.bakeStatics();

    // the planes build after the bake (an InstancedMesh is its own draw;
    // the bake never touches it — the skyline-pane law)
    this.buildFenestra();

    // instanced canopies for the new tree rows go up AFTER the bake — an
    // InstancedMesh is a Mesh, and the bake must never swallow it
    this.buildInstancedTreeRows();

    // ---- the far world (docs/50): the K line, Times Square, the M121 ----
    // All zone-owned, all bake-excluded by root name, all far from any
    // authored beat. The subway's static colliders land here once; the
    // door colliders the ride toggles come and go by identity.
    this.subwayRoot.name = 'SUB_Root';
    this.scene.add(this.subwayRoot);
    this.subway = buildSubwaySystem(
      this.subwayRoot,
      (c, opts) => this.mat(c, opts),
      (c) => {
        const b = boxFromCenter(c.x, c.y, c.z, c.w, c.h, c.d);
        this.subwayColliderBySpec.set(c, b);
        this.colliders.push(b);
      },
      (c) => {
        const b = this.subwayColliderBySpec.get(c);
        if (!b) return;
        const i = this.colliders.indexOf(b);
        if (i >= 0) this.colliders.splice(i, 1);
        this.subwayColliderBySpec.delete(c);
      },
    );
    const tsRoot = new THREE.Group();
    tsRoot.name = 'TSS_Group';
    this.scene.add(tsRoot);
    this.timesSquare = buildTimesSquare(tsRoot, (c, opts) => this.mat(c, opts), {
      // A-3 UNIT 10 (the far world, DEC-4 Option B standing ruling): the
      // Times Square masses READ their registry rows — the shells travel to
      // the builder; the base/tower splits, crowns, screens and dressing
      // are the rows' own style laws, derived inside.
      'TSS-01': this.regShell('TSS-01'),
      'TSS-02': this.regShell('TSS-02'),
      'TSS-03': this.regShell('TSS-03'),
      'TSS-04': this.regShell('TSS-04'),
      'TSS-05': this.regShell('TSS-05'),
    });
    for (const c of this.timesSquare.colliders) {
      this.colliders.push(boxFromCenter(c.x, c.y, c.z, c.w, c.h, c.d));
    }
    // SI: the far-world piece of the borough-character pass — the ported
    // subway stair on the TS surface. It joins TSS_Group so the zone bake
    // fuses it like every other TS mesh (zone visibility owns the far world;
    // the district tiles never reach here).
    this.dressFarWorldSI(tsRoot);
    this.arrivalBus = buildArrivalBus((c, opts) => this.mat(c, opts));
    this.scene.add(this.arrivalBus.group);
    for (const c of this.arrivalBus.colliders) {
      const box = boxFromCenter(c.x, c.y, c.z, c.w, c.h, c.d);
      this.colliders.push(box);
      this.arrivalBoxes.push(box);
    }
    this.collectTerminalShell();
    this.buildSubwayCast();
    // the far world's statics merge per zone group (docs/47 "the zone
    // bake"): SUB_Root + TSS_Group booted as ~600 single-mesh draw calls
    // because their content must never join a DISTRICT tile — zone
    // visibility is the law down there. The zone bake keeps the law:
    // merge WITHIN each zone group, re-parent into it.
    this.bakeZoneStatics();
    // the curb bake (docs/51 B13): the same law one group later — the
    // M121's shell and the street dressing are boot-built by now, so
    // their statics fuse within their own groups.
    this.bakeZoneStatics([this.arrivalBus.group, ...this.zoneDressing]);

    // ---- ambient pedestrians (Yuka steering) ----------------------------
    // Built AFTER the static bake so their rigs are never merge candidates;
    // bank-shared materials keep them material-free to add. Three walkers on
    // three loops: a crosswalk commuter (full block), a north-side window
    // shopper, and a south-side local. Obstacle circles: the parked van and
    // sedan, the mailbox, cans, barrier, bus stop, benches, papers, poles —
    // the player and the cart register as DYNAMIC circles each frame.
    const pedLooks: PedLook[] = [
      // height + shoe variety so the three never read as clones (Doc 04:
      // deliberate identity, bank-shared materials — scale is free)
      { jacket: 0x4a5568, pants: 0x3b3f4a, skin: 0xc98e5a, hair: 0x2b2730, style: 'cap', shoe: 0x4a3428, scale: 1.05 },
      { jacket: 0x7d5a62, pants: 0x47404b, skin: 0xe8b08e, hair: 0x6e3b2a, style: 'bun', scale: 0.95 },
      { jacket: 0x5d6b4a, pants: 0x39423a, skin: 0x8a5a3b, hair: 0x1f1b23, style: 'flat', scale: 1.09 },
      // THE SHUFFLE CROWD (docs/51 B16): the walk to the subway carries a
      // crowd the player weaves through — Doc 02's teach lives on the
      // bodega→plaza stretch, where a subway entrance always draws bodies.
      // Four more neighbors, west-end loops, brush-able and yielding.
      { jacket: 0x946a4f, pants: 0x33383f, skin: 0xd9a06b, hair: 0x1f1b23, style: 'bun', shoe: 0x2e2a33, scale: 1.02 },
      { jacket: 0x3f5e5a, pants: 0x443f4a, skin: 0xc98e5a, hair: 0x3a2c22, style: 'cap', shoe: 0x4a3428, scale: 0.98 },
      { jacket: 0x6b4a63, pants: 0x3a3f45, skin: 0x8a5a3b, hair: 0x14141c, style: 'flat', shoe: 0x33291f, scale: 1.07 },
      { jacket: 0x54628f, pants: 0x2f333b, skin: 0xe8b08e, hair: 0x5a4632, style: 'bun', shoe: 0x3a3028, scale: 0.93 },
      { jacket: 0x8a5a48, pants: 0x3a3540, skin: 0xc98e5a, hair: 0x241f28, style: 'flat', shoe: 0x2e2a33, scale: 1.0 },
      { jacket: 0x4f6b5e, pants: 0x33383f, skin: 0xe8b08e, hair: 0x1a1a22, style: 'bun', shoe: 0x4a3428, scale: 0.96 },
      // M4 — THE DUSK SHIFT (world/dressing STREET_PLAN): three more
      // neighbors whose shift is the evening rush — home while the sun is
      // up (hidden: zero draw calls at rest, the dressing cost law), out
      // when the subway draws. Same articulated rig, bank-shared materials,
      // loops on the shipped north-walk band — the rush thickens the crowd
      // the Shuffle teach already owns, it does not pave new lanes.
      { jacket: 0x6e4f3a, pants: 0x32363e, skin: 0xd9a06b, hair: 0x2b2730, style: 'cap', shoe: 0x3a3028, scale: 1.04 },
      { jacket: 0x715671, pants: 0x3b3f4a, skin: 0x8a5a3b, hair: 0x14141c, style: 'bun', shoe: 0x33291f, scale: 0.94 },
      { jacket: 0x4a5a6e, pants: 0x443f4a, skin: 0xe8b08e, hair: 0x3a2c22, style: 'flat', shoe: 0x2e2a33, scale: 1.06 },
    ];
    const pedPaths: Array<Array<[number, number]>> = [
      // the commuter: full block, crossing only at the crosswalk (x ≈ -6.5,
      // inside the cab's yield zone), two lanes per direction. LAW (probe-peds
      // caught it): Yuka spawns each walker targeting pts[0] — so pts[0] must
      // be reachable LEGALLY from every point. The crossing's north mouth is
      // that point; the west district reach belongs to the shopper's loop.
      [[-6.5, 6.15], [38, 6.15], [38, 6.85], [-6.5, 6.85],
       [-6.5, -6.15], [26, -6.15], [26, -6.85], [-6.5, -6.85]],
      // the window shopper: north walk out-and-back — W4: extended west to
      // the plaza/terminal end (NZ-TERMINAL's bay, NZ-PLAZA's stair beats).
      // The turnaround parks at x −42, not the wall: the −44 curb car's
      // avoidance circle squeezed the U-turn into the building-line trunks
      // (probe-solid's 0.35 m trunk approach — the gate is 0.42).
      [[10, 6.1], [-42, 6.1], [-42, 6.75], [10, 6.75]],
      // the south-side local: the Shuffle stretch (docs/51 B16 — the walk to
      // the Alder Heights stairs) to the district's east end and back. The
      // west reach stops at −43.5: the SUB-02 control house (−57) and the
      // south trunks (−44/−30/−16, r 0.35 on the building line) leave the
      // −6.1/−6.35 lanes a clean 0.65 m clear, and the turnaround sits east
      // of the −44 trunk's circle. W4: the return lane rides −6.35, not the
      // old −6.8 — the east-end trunks (28/38, −7.0) held the extended loop
      // at their circle radius (0.35 m, probe-solid's gate is 0.42); 0.65 m
      // lateral clears them.
      [[-43.5, -6.1], [44, -6.1], [44, -6.35], [-43.5, -6.35]],
      // W4 — the garden tender (NZ-GARDEN): the gate to the beds and back,
      // inside GRD-GABLE's fence line (x −8.4..4, z 20..30)
      [[4.4, 24.1], [-0.5, 24.4], [-6.5, 24.4], [-6.9, 26],
       [-4, 26.8], [0, 26.2], [2.8, 25], [4.4, 24.1]],
      // W4 — the avenue shopper (NZ-AVENUE): the Sycamore Ave west walk's
      // south block, past the diner window and the Golden Orchard's crates
      // (x 61.5/62.2 lanes). The old loop spanned z −18..18 and crossed
      // Kestrel Street MID-BLOCK at x 61.8 — a jaywalk the old inverted
      // band hid (docs/51 B17): the ±7.5 clamp shrank the patrol but the
      // street still sat inside it. A walker crosses at the paint or not
      // at all; the bus-stop beat watches the M121 from the south walk.
      [[61.5, -18], [61.5, -6.85], [62.2, -6.85], [62.2, -18]],
      // THE SHUFFLE CROWD's loops (docs/51 B16): all four stay on the north
      // walk (z 6.08–6.76) between the bodega (x −20) and the plaza (x −41),
      // lanes offset so the stretch reads as a crowd with gaps to walk
      // toward — never a wall. No street crossings, so the crosswalk law is
      // untouched; west ends stop at x −41 (east of the headhouse railings,
      // whose opening the shopper's own turnaround already owns).
      [[-31, 6.12], [-41, 6.12], [-41, 6.7], [-31, 6.7]],   // the plaza weaver
      [[-26, 6.14], [-36.5, 6.14], [-36.5, 6.68], [-26, 6.68]], // the stair local
      [[-22.5, 6.08], [-39.5, 6.08], [-39.5, 6.76], [-22.5, 6.76]], // the west commuter
      [[-20, 6.16], [-28.5, 6.16], [-28.5, 6.66], [-20, 6.66]], // the bodega local
      // M4 — the dusk shift's lanes (out only for the evening rush): three
      // more rectangles on the SAME proven north-walk band (z 6.05–6.8, the
      // bodega→plaza stretch, no street crossings, so the spawn law —
      // pts[0] reachable legally from every point — holds trivially). Lanes
      // offset from the four shipped ones so seven bodies interleave with
      // gaps to walk toward, never a wall.
      [[-21.5, 6.28], [-40, 6.28], [-40, 6.6], [-21.5, 6.6]],    // the rush weaver
      [[-23.5, 6.24], [-36, 6.24], [-36, 6.72], [-23.5, 6.72]],  // the bench local
      [[-27, 6.3], [-38.5, 6.3], [-38.5, 6.58], [-27, 6.58]],    // the stair weaver
    ];
    // ---- their routines (Phase 4, Doc 37 §3E): the day's small beats ------
    // Every trigger sits OFF the walk lanes (at the building line or the
    // curb edge), so a pause never plugs both lanes; the beat is taken
    // wherever the walker happens to be when the spot comes within reach.
    // Round-robin per lap, so a commuter glances at the barber's pole one
    // lap and reads the mail the next — a block, not a loop recording.
    // The bench gossip pair (shopper + commuter) stops sit ~1.2 m apart on
    // the north line: when both dwell at once they face each other — the
    // block's occasional two-person conversation.
    const pedRoutines: RoutineStop[][] = [
      // the commuter: the barber's pole on the way east, the mailbox on the
      // way west, a chance word by the bus bench (its ring is unchanged —
      // the spawn law above keeps the crossing legal from every seed)
      [
        { x: 34.5, z: 7.0, faceTo: [36.6, 7.9], dwell: 3.0 },
        { x: -3.4, z: -6.9, faceTo: [-3.2, -6.1], dwell: 2.5 },
        { x: -24.9, z: 7.0, faceTo: [-23.3, 7.62], dwell: 5.0 },
      ],
      // the window shopper: the bodega window, the bench — and W4's west
      // beats: the terminal curb bay (NZ-TERMINAL), the plaza stair (NZ-PLAZA)
      [
        { x: -17.0, z: 7.0, faceTo: [-18.5, 13.5], dwell: 4.0 },
        { x: -26.1, z: 7.0, faceTo: [-23.3, 7.62], dwell: 5.0 },
        { x: -30.6, z: 6.9, faceTo: [-30, 3.4], dwell: 3.0 },
        { x: -41.2, z: 6.9, faceTo: [-42, 6.2], dwell: 3.5 },
      ],
      // the south-side local: watches the cart corner (opinions daily),
      // reads the stoops at the quiet west end, pauses on the Shuffle
      // stretch to look across at the terminal (docs/51 B16 — a body that
      // stands in the walk is a body you shuffle past) — and W4: pauses at
      // the Corner Park gate (NZ-DOG), where the pigeons scatter-recover
      [
        { x: 5.4, z: -6.9, faceTo: [4.0, -6.6], dwell: 3.0 },
        { x: -30.5, z: -6.9, faceTo: [-30.5, -9.0], dwell: 2.5 },
        { x: -41.5, z: -6.9, faceTo: [-36.4, 4.8], dwell: 3.5 },
        { x: 31.5, z: -6.5, faceTo: [34, -6.3], dwell: 5.0 },
      ],
      // W4 — the garden tender (NZ-GARDEN): watering the beds, a word to
      // the bench, back to the gate
      [
        { x: -6.2, z: 24.6, faceTo: [-7.6, 23], dwell: 6.0 },
        { x: -1.8, z: 25.8, faceTo: [-4, 27], dwell: 5.0 },
        { x: 2.4, z: 24.6, faceTo: [1, 22.5], dwell: 3.0 },
      ],
      // W4 — the avenue shopper (NZ-AVENUE): the diner window, the Golden
      // Orchard's crates, the M121 stop watched from the south walk —
      // BUS-03 serves the north curb; nobody waits for it standing in the
      // roadway (docs/51 B17: the old beat stood at z 2.2, inside the
      // street rect, and the final soak sample caught it there)
      [
        { x: 61.6, z: -12, faceTo: [60.1, -12], dwell: 5.0 },
        { x: 61.7, z: -16.5, faceTo: [63.3, -18], dwell: 4.0 },
        { x: 61.6, z: -6.9, faceTo: [61.5, 2], dwell: 2.0 },
      ],
      // the Shuffle crowd's beats (docs/51 B16): small plaza pauses — the
      // bulletin board, the bench, the bodega window — off the walk lanes,
      // so a pause never plugs both directions
      [
        { x: -33.2, z: 7.0, faceTo: [-37.6, 7.5], dwell: 3.0 }, // the bulletin board
        { x: -39.8, z: 6.9, faceTo: [-40.5, 4.55], dwell: 2.5 }, // a glance at the plaza bench
      ],
      [
        { x: -34.8, z: 6.95, faceTo: [-37.6, 7.5], dwell: 2.5 }, // the board, from the east
      ],
      [
        { x: -25.8, z: 6.9, faceTo: [-23.3, 7.62], dwell: 2.5 }, // waits near the bus bench
      ],
      [
        { x: -18.8, z: 6.9, faceTo: [-18.5, 7.55], dwell: 3.0 }, // the bodega's warm window
      ],
      // M4 — the dusk shift's beats: the evening errands (the bus bench,
      // the bulletin board, the bodega window), all off the walk lanes at
      // the building line, same law as every routine above.
      [
        { x: -24.2, z: 7.0, faceTo: [-23.3, 7.62], dwell: 4.0 }, // waits by the bus stop
      ],
      [
        { x: -33.4, z: 6.95, faceTo: [-37.6, 7.5], dwell: 3.0 }, // the bulletin board, from the west
      ],
      [
        { x: -19.1, z: 6.95, faceTo: [-18.5, 7.55], dwell: 3.5 }, // one more glance at the bodega
      ],
    ];
    this.peds = new Pedestrians(
      this.scene, pedLooks, 20261030, pedPaths,
      [
        { x: -14, z: 3.05, r: 1.9 },   // delivery van, north curb
        { x: 24, z: 3.05, r: 1.9 },    // parked sedan — north curb (was -3.05:
                                       // the curb move in 1bc2dac never reached
                                       // this list, so walkers bowed around a
                                       // ghost car in the cab lane — doc 35 §3)
        { x: -3.2, z: -6.1, r: 0.45 }, // mailbox
        { x: 10.5, z: -5.6, r: 0.4 },  // trashcan (glb-wearable)
        { x: 2, z: -7.45, r: 0.4 },    // trashcan
        { x: 2.85, z: -7.45, r: 0.4 }, // recycle bin
        { x: -19, z: 7.66, r: 0.4 },   // trashcan north
        { x: -9.7, z: 7.62, r: 0.7 },  // barrier
        { x: 34, z: -4.75, r: 0.35 },  // hydrant east
        { x: 5.7, z: -4.55, r: 0.35 }, // hydrant west (east of the cart, at the curb)
        { x: -24.5, z: 7.35, r: 0.4 }, // bus stop sign pole (air — collider removed:
                                       // its corner pocket could wedge a body)
        { x: -23.3, z: 7.62, r: 1.1 }, // bus bench (at the building line)
        { x: -40.5, z: 4.55, r: 1.0 }, // plaza bench
        { x: -44.6, z: 6.6, r: 0.9 },  // newspaper boxes
        { x: -8.5, z: -7.35, r: 0.3 }, // utility poles
        { x: 20, z: -7.35, r: 0.3 },
        { x: 44.5, z: -7.35, r: 0.3 },
        { x: 13.5, z: -5.9, r: 0.3 },  // streetlamp
        { x: 29.8, z: -4.55, r: 0.9 }, // dirty-water dog cart (docs/38)
        { x: -44.3, z: 4.4, r: 0.6 },  // planter plaza (W8: slid east of the station corridor)
        { x: -8.55, z: 7.55, r: 0.5 }, // shirt rack (missing)
        { x: -4.0, z: 5.8, r: 0.5 },   // permit A-frame — it stands IN the
                                       // north walk lane; walkers bow around it
        { x: -34, z: 7.48, r: 0.35 },  // tree trunks — all twelve, so nobody
        { x: -22, z: 7.48, r: 0.35 },  // brushes a trunk they could see coming
        { x: -1.2, z: 7.48, r: 0.35 },
        { x: 20, z: 7.48, r: 0.35 },
        { x: 32, z: 7.48, r: 0.35 },
        { x: -44, z: -7.0, r: 0.35 },
        { x: -30, z: -7.0, r: 0.35 },
        { x: -16, z: -7.0, r: 0.35 },
        { x: 28, z: -7.0, r: 0.35 },
        { x: 38, z: -7.0, r: 0.35 },
        { x: -43.9, z: 4.7, r: 0.35 },
        { x: -38.6, z: 4.5, r: 0.35 },
        // W1: the Kestrel fill trees + the south control house + the new
        // south lamp — everything the ambient walkers can meet on the lane
        ...this.extraKestrelPedBodies.map(([x, z]) => ({ x, z, r: 0.35 })),
        { x: -57, z: -6.25, r: 1.9 },  // SUB-02 control house
        { x: 12, z: -7.35, r: 0.3 },   // new south lamp (walker band east end)
        // W4: the parked cars (built in buildAlderHeightsW4Life, below) and
        // the park/garden furniture the new district walkers can meet
        ...this.w4ParkedCarBodies.map(([x, z]) => ({ x, z, r: 1.9 })),
        { x: 10, z: 28.5, r: 0.4 }, { x: 16, z: 29, r: 0.4 },   // Kestrel Green trees
        { x: 23, z: 28.8, r: 0.4 }, { x: 28.5, z: 27, r: 0.4 },
        { x: 17.55, z: 26.3, r: 0.3 }, { x: 21.45, z: 26.3, r: 0.3 }, // pergola posts
        { x: 17.55, z: 28.7, r: 0.3 }, { x: 21.45, z: 28.7, r: 0.3 },
        { x: 12, z: 22.5, r: 0.95 }, { x: 24, z: 25.5, r: 0.95 }, { x: 18, z: 21.5, r: 0.95 }, // green benches
        { x: 9, z: 23, r: 0.3 }, { x: 20, z: 21, r: 0.3 }, { x: 29, z: 23, r: 0.3 },  // green lamps
        { x: 11, z: 25.2, r: 0.45 }, { x: 27.5, z: 22, r: 0.45 },  // green bins
        { x: 16.98, z: 31, r: 0.3 }, { x: 19.02, z: 31, r: 0.3 },  // green gate posts
        { x: -7.6, z: 23, r: 0.9 }, { x: -4, z: 23, r: 0.9 },      // garden beds
        { x: -7.6, z: 27, r: 0.9 }, { x: -4, z: 27, r: 0.9 },
        { x: 2, z: 28.5, r: 1.4 }, { x: 1, z: 22.5, r: 0.9 },      // shed, garden bench
        { x: -10, z: -28.5, r: 1.2 }, { x: -4.5, z: -27.5, r: 1.6 }, // swings, sandbox
      ],
      pedRoutines,
      // W4: the district's five road rectangles — ground truth for every
      // walker's feet (registry streets, verbatim)
      [
        { xMin: -100, xMax: 100, zMin: -4, zMax: 4 },    // Kestrel Street (W7: the ends grew ±84 → ±100)
        { xMin: -100, xMax: 100, zMin: 36, zMax: 44 },   // Gable Street (W7)
        { xMin: -100, xMax: 100, zMin: -44, zMax: -36 }, // Marlow Street (W7)
        { xMin: -76, xMax: -68, zMin: -64, zMax: 64 },   // Juniper Avenue
        { xMin: 68, xMax: 76, zMin: -64, zMax: 64 },     // Sycamore Avenue
      ] as RoadRect[],
      // M4: each walker's shift on the street schedule — the dusk shift
      // boots home (the game boots into the day phase)
      PEDESTRIAN_ROLES,
      // W7: the registry's solid footprints (minus the passable set) — the
      // walker↔facade depenetration law's ground truth. The blocks' own
      // walls answer to the resolve now: a separation half-push at a
      // curb-cut skirt depenetrates off the face instead of through it.
      loadRegistry().allBuildings()
        .filter((b) => b.footprint && !PASSABLE_FOOTPRINTS.has(b.id))
        .map((b) => ({
          minX: b.footprint!.x - b.footprint!.w / 2,
          maxX: b.footprint!.x + b.footprint!.w / 2,
          minZ: b.footprint!.z - b.footprint!.d / 2,
          maxZ: b.footprint!.z + b.footprint!.d / 2,
        })),
    );
    // the walkers carry real bodies for the player's collision stack — the
    // audit's "NPCs walking through the player" (doc 35 §1): one synced AABB
    // each, registered once, moved by Pedestrians.update every frame
    for (const box of this.peds.walkColliders) this.colliders.push(box);

    // ---- the graphics wave: boot final --------------------------------
    // Day state: the boot look IS the shipped golden hour (SKY.day = the
    // 'evening' keyframe, canon verbatim) — written immediately, no lerp
    // across black on frame one.
    this.pinDayState('evening', true);
    this.assembleAoExclude();
  }

  // ------------------------------------------------- static-geometry bake
  // Perf evidence (probe-perf + scene census, 2026-10-30): the block rendered
  // 700+ draw calls for only ~23k triangles — the scene was draw-call-bound,
  // not geometry-bound. Everything below merges never-animated decoration
  // meshes into one mesh per (material signature, shadow flags), using
  // three's own BufferGeometryUtils — no new dependency, no visual change:
  // world transforms are baked, so every vertex lands exactly where it did.
  //
  // NOT merged (each would either move, toggle, or have its material
  // tweened after construction):
  //   cart + wearables, cast members, the bodega roof (ducks when you step
  //   inside), GLB-upgradable props (their children are swapped at boot),
  //   trees (canopy sway), birds, leaves, steam, shelf items (removed on
  //   pickup), and the five story windows whose emissive is tweened.
  // Signs stay out automatically (their materials carry canvas textures),
  // as do anything transparent or non-Lambert. Batches under 2 meshes are
  // left alone — merging them would save nothing.
  /** W4, part 1 — the district's STATIC life (docs/45 §1 W4; every zone
   *  from the registry's npcZones). Perf law: dwellers are posed figures on
   *  bank-shared materials added BEFORE the bake, so the W0 merge swallows
   *  them — the zones cost merges, not draw calls. Walking zones ride the
   *  existing Yuka system (the Pedestrians roster, below). The two registry
   *  readings this phase makes are recorded in docs/47: the parking-strip
   *  stalls take their W4 cars (the W2 pad was built ready for them), and
   *  NZ-BUSKER's horn note ships with the M121 in W4 part 2. */
  private buildAlderHeightsW4Life(): void {
    // ---- static zone figures (posed once; merged into district tiles) ----
    const figure = (
      name: string, look: PedLook, x: number, y: number, z: number, yaw: number, sit = false,
    ): void => {
      const { group, rig } = buildArticulatedPerson(look);
      // batch discipline (the census caught it): each novel (color, cast,
      // receive) signature opens a new baked batch per district tile — so a
      // tile's figures SHARE one palette and receive shadows like the
      // world's own solids, and the district's static life costs a handful
      // of batches, not a handful per figure
      group.traverse((o) => { if (o instanceof THREE.Mesh) o.receiveShadow = true; });
      if (sit) {
        // seated: thighs folded forward (the rig faces +z at yaw 0), arms
        // resting — the low-poly sit, hips ~0.17 above the seat
        rig.hipL.rotation.x = -Math.PI / 2 + 0.18;
        rig.hipR.rotation.x = -Math.PI / 2 + 0.12;
        rig.armL.rotation.x = -0.45;
        rig.armR.rotation.x = -0.45;
        y -= 0.55 * (look.scale ?? 1);
      }
      group.name = name;
      group.position.set(x, y, z);
      group.rotation.y = yaw;
      this.scene.add(group);
    };
    // NZ-GOSSIP-G + NZ-READERS — four figures, ONE shared palette (the
    // Kestrel Green tile merges them into a handful of batches); identity
    // comes from silhouette (style/scale), never new colors
    const greenLook = (style: 'bun' | 'flat' | 'cap', scale: number): PedLook =>
      ({ jacket: 0x7d5a62, pants: 0x47404b, skin: 0xe8b08e, hair: 0x6e3b2a, style, scale });
    figure('NZGossip_A', greenLook('bun', 0.95),
      18.3, 0.15, 27.2, Math.atan2(20.7 - 18.3, 27.5 - 27.2));
    figure('NZGossip_B', greenLook('flat', 1.02),
      20.7, 0.15, 27.5, Math.atan2(18.3 - 20.7, 27.2 - 27.5));
    figure('NZReader', greenLook('bun', 0.93), 12, 0.15, 21.4, 0);
    figure('NZLunch', greenLook('cap', 1.06), 24, 0.15, 26.4, Math.PI);
    // NZ-STOOPS — the row's pair, one shared palette (their own tile)
    const stoopLook = (style: 'bun' | 'flat', scale: number): PedLook =>
      ({ jacket: 0x5d6b4a, pants: 0x39423a, skin: 0x8a5a3b, hair: 0x6e3b2a, style, scale });
    figure('NZStoop_A', stoopLook('bun', 0.98), -41.5, 0.2, 32.3, 0.3, true);
    figure('NZStoop_B', stoopLook('flat', 1.04), -18.7, 0.2, 32.3, -0.25, true);
    // NZ-PLAYGROUND — kid + caregiver, one shared palette (Marlow tile);
    // the kid keeps the row's coral and ambient scale
    figure('NZKid_Sandbox', { jacket: 0xff6b6b, pants: 0x47404b, skin: 0xe8b08e, hair: 0x6e3b2a, style: 'cap', scale: 0.78 },
      -4.2, 0.2, -27.2, -1.8);
    figure('NZCaregiver', { jacket: 0xff6b6b, pants: 0x47404b, skin: 0xc98e5a, hair: 0x1f1b23, style: 'bun', scale: 0.99 },
      -7.2, 0.12, -29.8, -1.13);
    // NZ-BUSKER — the horn man at the SUB-02 corner, case open at his feet
    figure('NZBusker', { jacket: 0x3a3440, pants: 0x1f1b23, skin: 0x8a5a3b, hair: 0x2b2730, style: 'cap', scale: 1.01 },
      -52.6, 0.1, -5.5, 0);
    const buskerCase = this.decoMesh('Busker_Case', new THREE.BoxGeometry(0.65, 0.12, 0.42),
      this.bank.get(0x8a6a4a), -52.6, 0.16, -4.95);
    buskerCase.castShadow = true;   // the fold: cast+receive like the world's solids
    buskerCase.receiveShadow = true;

    // ---- the parked cars (registry transit.parkedCars + the W2 strip) ----
    const car = (name: string, x: number, z: number, yaw: number, alongZ = false): void => {
      const c = this.buildCar('sedan');
      c.name = name;
      c.position.set(x, 0, z);
      c.rotation.y = yaw;
      this.scene.add(c);
      this.colliders.push(alongZ
        ? boxFromCenter(x, 0.75, z, 1.95, 1.5, 4.4)
        : boxFromCenter(x, 0.75, z, 4.4, 1.5, 1.95));
      this.w4ParkedCarBodies.push([x, z]);
    };
    // Kestrel N curb ends (registry: z ±3.05, outside both moving lanes).
    // The east car parks PAST the court (x 51): the half-court's fence owns
    // the sidewalk from x 40.45..45.3 (docs/49 — the gate at 46.3 is the
    // through-line), which leaves the curb edge there a 0.47 m squeeze
    // between the car's north face (z 4.02) and the fence (z 4.49) — no
    // body fits. The bug-hunt's route sweep wedged the walker at the car's
    // west flank; the curb car now clears the gate approach.
    car('Parked_Kestrel_E', 51, 3.05, Math.PI);
    car('Parked_Kestrel_W', -44, 3.05, Math.PI);
    // avenue curbs — hugging the road edge, clear of the x ±70/±74 rails.
    // The north Sycamore car rides z 24, mid-block: its first draft sat at
    // z 34, inside the Gable S walk's crossing desire line (z 32..36) — the
    // W5 ghost gate walked the junction and wedged the capsule against its
    // west flank. NYC parks mid-block, not in the crosswalk. (docs/47 W5)
    car('Parked_Sycamore_S', 68.98, 10, -Math.PI / 2, true);
    car('Parked_Sycamore_N', 68.98, 24, -Math.PI / 2, true);
    car('Parked_Juniper', -68.98, 14, -Math.PI / 2, true);
    // the W2 strip's stalls (the pad was built ready for them)
    car('Parked_Strip_E', 38, 25, 0);
    car('Parked_Strip_W', 43, 25, Math.PI);

    // ---- BUS-03, Sycamore/Diner (registry transit.bus.stops) -------------
    // The flag rides the west walk at the pinned corner; the bay paint
    // mirrors BUS-02's curb pattern on the Kestrel north curb it serves.
    this.deco('BUS03_Bay', 61.5, 0.02, 3.4, 12, 0.02, 0.5, PAL.taxi, {});
    const m121b = makePoleSign(this.bank, this.signMaterials.bind(this), 'M121', { w: 0.8, h: 0.3, y: 3.0 });
    m121b.position.set(61.5, 0.05, 2);
    this.scene.add(m121b);
  }

  // ------------------------------------------------------- W4, part 2 -----
  // The traffic + dusk layer: the M121's body, the half-court's dusk pickup
  // pair, the TEN-01 laundry and the hall's day-keyed notice. Build order is
  // the perf law: everything static goes in BEFORE bakeStatics (the merge
  // swallows it); the bus and the dusk pair are dynamic and carry their own
  // skip entries below.

  /** The M121's body — the dedicated low-poly bus (doc 45 §7 open decision
   *  closed: a scaled car reads as a stretched car; a long cream box with a
   *  window band, a teal stripe, a curb-side door and the M121 rollsign
   *  reads as a bus). Six draw calls when visible, all bank-shared but the
   *  rollsign's canvas face. Geometry faces +x (the car-builder convention,
   *  travelYaw() maps legs onto it). receiveShadow ON — the W4 p2 batch
   *  fold starts here: the cars and the bus share the world's cast+receive
   *  signatures instead of opening cast-only batches in every tile. */
  private buildBus(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'M121_Bus';
    const merged = (geos: THREE.BufferGeometry[], color: number, useMat?: THREE.Material): THREE.Mesh => {
      const m = new THREE.Mesh(mergeGeometries(geos, false)!, useMat ?? this.bank.get(color));
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    // body slab + roof cap (one paint batch — the graphics wave: the M121
    // wears PBR paint like the taxi, the sky reflects in its flank)
    merged([
      new THREE.BoxGeometry(9.6, 2.2, 2.3).translate(0, 1.45, 0),
      new THREE.BoxGeometry(9.6, 0.14, 2.3).translate(0, 2.62, 0),
    ], PAL.cream, this.vehicleMat(PAL.cream, 0.35, 0.4));
    // the livery stripe
    merged([new THREE.BoxGeometry(9.64, 0.34, 2.32).translate(0, 1.05, 0)], PAL.teal);
    // window band + the curb-side door (the door rides local −z: the right
    // of travel — check it with the westbound leg: yaw π maps −z to +z, the
    // north curb every Kestrel stop pulls toward)
    merged([
      new THREE.BoxGeometry(9.0, 0.78, 2.34).translate(-0.1, 2.05, 0),
      new THREE.BoxGeometry(0.06, 1.75, 0.95).translate(2.9, 1.12, -1.14),
    ], PAL.windowDim);
    // wheels, then hubs + bumpers (two stone/manhole batches)
    const wheelGeos: THREE.BufferGeometry[] = [];
    const hubGeos: THREE.BufferGeometry[] = [];
    for (const wx of [-3.4, 3.4]) {
      for (const wz of [-0.98, 0.98]) {
        wheelGeos.push(new THREE.CylinderGeometry(0.4, 0.4, 0.24, 12)
          .rotateX(Math.PI / 2).translate(wx, 0.4, wz));
        hubGeos.push(new THREE.CylinderGeometry(0.18, 0.18, 0.26, 10)
          .rotateX(Math.PI / 2).translate(wx, 0.4, wz));
      }
    }
    hubGeos.push(new THREE.BoxGeometry(0.12, 0.2, 2.2).translate(4.78, 0.55, 0));
    hubGeos.push(new THREE.BoxGeometry(0.12, 0.2, 2.2).translate(-4.78, 0.55, 0));
    merged(wheelGeos, PAL.manhole);
    merged(hubGeos, PAL.stone);
    // the audit pass: a running bus carries its lights (nose +X; the westbound
    // leg yaws π, so the pair reads right both ways)
    merged([
      new THREE.BoxGeometry(0.08, 0.18, 0.30).translate(4.83, 0.85, -0.7),
      new THREE.BoxGeometry(0.08, 0.18, 0.30).translate(4.83, 0.85, 0.7),
    ], PAL.cream);
    merged([
      new THREE.BoxGeometry(0.08, 0.16, 0.26).translate(-4.83, 0.85, -0.7),
      new THREE.BoxGeometry(0.08, 0.16, 0.26).translate(-4.83, 0.85, 0.7),
    ], PAL.coral);
    // the rollsign — the one canvas face, above the windshield
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.36),
      new THREE.MeshLambertMaterial({ map: this.textTexture('M121', 128, 42, PAL.taxi, PAL.ink, 30) }),
    );
    sign.rotation.y = Math.PI / 2;
    sign.position.set(4.81, 2.42, 0);
    g.add(sign);
    return g;
  }

  /** The half-court's dusk pickup pair (registry npcZones NZ-COURT, "when:
   *  dusk"). Two posed rigs MERGED BY MATERIAL into five meshes — a
   *  dusk-toggled figure would otherwise ride ~10 rig parts each. Visible
   *  only while dusk lasts (updateAmbient); hidden at boot. */
  private buildCourtDuskPair(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'NZCourt_Dusk';
    // one shared palette for the whole pair — identity by silhouette
    const looks: Array<[PedLook, number, number, number, (rig: { armL: THREE.Group; armR: THREE.Group; hipL: THREE.Group; hipR: THREE.Group }) => void]> = [
      [{ jacket: 0x7d5a62, pants: 0x47404b, skin: 0xc98e5a, hair: 0x2b2730, style: 'cap', scale: 0.99 },
        42.0, 6.3, Math.atan2(44.25 - 42.0, 7.9 - 6.3),
        (r) => { r.armL.rotation.x = -2.55; r.armR.rotation.x = -2.4; }], // the shooter, hands up
      [{ jacket: 0x5d6b4a, pants: 0x39423a, skin: 0x8a5a3b, hair: 0x6e3b2a, style: 'flat', scale: 1.04 },
        43.5, 5.4, Math.atan2(42.0 - 43.5, 6.3 - 5.4),
        (r) => { r.armL.rotation.z = 0.85; r.armR.rotation.z = -0.85; }], // the defender, arms out
    ];
    const byMat = new Map<THREE.MeshLambertMaterial, THREE.BufferGeometry[]>();
    for (const [look, x, z, yaw, pose] of looks) {
      const { group, rig } = buildArticulatedPerson(look);
      pose(rig);
      group.position.set(x, 0.1, z);
      group.rotation.y = yaw;
      group.updateWorldMatrix(true, true);
      group.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const mat = o.material as THREE.MeshLambertMaterial;
        const geo = o.geometry.clone();
        geo.applyMatrix4(o.matrixWorld);
        for (const name of Object.keys(geo.attributes)) {
          if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
        }
        let list = byMat.get(mat);
        if (!list) byMat.set(mat, list = []);
        list.push(geo);
      });
    }
    for (const [mat, geos] of byMat) {
      const m = new THREE.Mesh(mergeGeometries(geos, false)!, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
    g.visible = false;
    return g;
  }

  /** TEN-01's laundry (docs/47 W3 "explicitly NOT done"): lines strung from
   *  the Old-Law pair's fire-escape rails over the Juniper walk, garments
   *  in the world's own palette. Static — the bake swallows every box, so
   *  the dressing costs zero draw calls. */
  private buildTen01Laundry(): void {
    // the escape hangs on the west face: wall x −60.02, rail at x −60.82,
    // platforms y 4.4 / 8.2 (rail tops +0.97), spanning z −16.5..−11.5
    const line = (y: number): void => {
      const l = this.decoMesh(`TEN01_Line_${y}`, new THREE.BoxGeometry(0.025, 0.025, 4.7),
        this.bank.get(PAL.ink), -60.8, y, -14);
      l.castShadow = true;
      l.receiveShadow = true;
    };
    line(9.17);
    line(5.37);
    // wall anchors (the little pulley knobs the lines tie to)
    for (const y of [9.17, 5.37]) {
      for (const z of [-16.3, -11.7]) {
        const knob = this.decoMesh(`TEN01_Pulley_${y}_${z}`, new THREE.BoxGeometry(0.07, 0.07, 0.07),
          this.bank.get(PAL.ink), -60.02, y, z);
        knob.castShadow = true;
        knob.receiveShadow = true;
      }
    }
    // the wash — thin boxes read as cloth from the walk; cream/stone/teal
    // keep every signature inside the batches the tile already runs
    const wash: Array<[number, number, number, number]> = [
      // [z, y-line, color, tilt]
      [-15.6, 9.17, PAL.cream, 0.05],
      [-14.5, 9.17, PAL.stone, -0.07],
      [-13.3, 9.17, PAL.teal, 0.04],
      [-12.4, 9.17, PAL.cream, -0.05],
      [-14.9, 5.37, PAL.amber, 0.06],
      [-13.0, 5.37, PAL.stone, -0.04],
    ];
    for (const [z, y, color, tilt] of wash) {
      const piece = this.decoMesh(`TEN01_Wash_${z}_${y}`, new THREE.BoxGeometry(0.035, 0.62, 0.44),
        this.bank.get(color), -60.78, y - 0.34, z);
      piece.rotation.x = tilt;
      piece.castShadow = true;
      piece.receiveShadow = true;
    }
  }

  /** The Alder Works Hall's notice board (LMK-07's dressing): a small ink
   *  board under the marquee whose canvas face dressDay() re-letters. The
   *  plain box joins the bake; the face stays out by itself (map). */
  private buildHallNotice(): void {
    const box = this.decoMesh('LMK07_Notice', new THREE.BoxGeometry(0.12, 0.62, 2.2),
      this.bank.get(PAL.ink), -60.07, 5.15, 26);
    box.castShadow = true;
    box.receiveShadow = true;
    const c = document.createElement('canvas');
    c.width = 512; c.height = 112;
    this.noticeCanvas = c;
    this.noticeTex = new THREE.CanvasTexture(c);
    this.noticeTex.colorSpace = THREE.SRGBColorSpace;
    this.noticeMat = new THREE.MeshLambertMaterial({ map: this.noticeTex });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 0.5), this.noticeMat);
    face.name = 'LMK07_Notice_Face';
    face.rotation.y = -Math.PI / 2; // faces west, at the Juniper walk
    face.position.set(-60.14, 5.15, 26);
    this.scene.add(face);
    this.dressHallNotice(1); // Game calls dressDay(1) at boot — this is the pre-bake default
  }

  /** Redraw the hall's notice for a day (called from dressDay). One canvas
   *  fill on the day roll — no geometry, no draw-call churn. */
  private dressHallNotice(day: number): void {
    const c = this.noticeCanvas;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || !this.noticeTex) return;
    ctx.fillStyle = '#' + PAL.ink.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#' + PAL.cream.toString(16).padStart(6, '0');
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
    ctx.fillStyle = '#' + PAL.cream.toString(16).padStart(6, '0');
    ctx.font = '800 40px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hallNoticeForDay(day), c.width / 2, c.height / 2 + 2, c.width - 48);
    this.noticeTex.needsUpdate = true;
  }

  private noticeCanvas: HTMLCanvasElement | null = null;
  private noticeTex: THREE.CanvasTexture | null = null;
  private noticeMat: THREE.MeshLambertMaterial | null = null;

  /** The court's dusk pair — visible only while dusk lasts. */
  private courtDusk!: THREE.Group;

  /** W4 part 2 assembly (see the block comment above buildBus). */
  private buildAlderHeightsW4Traffic(): void {
    this.busGroup = this.buildBus();
    // the boot pose = the boot state (leg 3 a 10 lat 0): mid-lap on
    // Sycamore Ave, ~26 game-s from the first bay visit — the bay itself
    // holds BUS-04 (the registry's enterable M121) until the loop arrives.
    this.busGroup.position.set(72.2, 0, 28);
    this.busGroup.rotation.y = Math.PI / 2; // travelYaw(0, −1), leg 3 south
    this.scene.add(this.busGroup);
    this.busCollider = boxFromCenter(72.2, 1.3, 28, 9.6, 2.6, 2.3);
    this.colliders.push(this.busCollider);

    this.courtDusk = this.buildCourtDuskPair();
    this.scene.add(this.courtDusk);

    this.buildTen01Laundry();
    this.buildHallNotice();
  }

  // ------------------------------------------------------- W5: the rooms ----
  // docs/45 §1 W5 + docs/41: eight interiors, planned to fixture level in
  // the registry, built here. The law each room obeys:
  //
  //   1. The shell matches the exterior. Hollowing decomposes the shipped
  //      mass into wall boxes with the SAME outer envelope (footprint,
  //      height, silhouette identical — the ghost probes still pass).
  //   2. The door matches the shipped entrance (docs/41 §1 law 2).
  //   3. Interior groups carry a visibility TOGGLE (docs/45 W5 exit): far,
  //      the room hides and the facade keeps its lit-glass look (zero
  //      draw-call cost at street scale); near (the shell + ~1.5 m), the
  //      fit-out shows and the clear panes swap in — the camera "sees
  //      through the glass" without raycasts. While the player is INSIDE,
  //      the tower above the room ducks (the shipped bodega-roof grammar).
  //   3a. The glass-side law (docs/51 B13 — interiors' window visibility,
  //      the named program): "near" shows the fit-out only THROUGH the
  //      room's own glass — the player stands on the outward side of one
  //      of the room's window runs (src/world/interiorGlass.ts, the pure
  //      law; each room registers the runs its builder cut). Behind a
  //      blind wall the fit-out stays hidden — no window, no room. The
  //      hysteresis margins (enter 1.6 / exit 0.8) drive band and glass
  //      alike, so window-edge loitering never flickers.
  //   4. Toggleables stay OUT of the W0 bake (skip set below) — a baked
  //      batch cannot be hidden per-room.
  //
  // Palette law: signature colors only; the two new glass materials reuse
  // the storefront glass signature (0x3b3346 + the warm emissive), one
  // translucent, one clear.

  private readonly interiorHandles: InteriorHandle[] = [];
  /** Warm translucent facade glass — the single-pane look for openings with
   *  no shipped glass face (the hall's windows, the diner band, the Cecil's
   *  room window). Lit from the street, see-through up close. */
  private roomGlassMat!: THREE.MeshLambertMaterial;
  /** Clear glass for the near state behind a shipped opaque face. */
  private roomClearMat!: THREE.MeshLambertMaterial;
  /** The warm interior wall band (the shipped Laundry_Back grammar). */
  private roomWarmMat!: THREE.MeshLambertMaterial;

  /** Remove a shipped mass mesh by name (the W2 garden-slot precedent:
   *  find → remove → dispose; the collider is the caller's business). */
  private retireMass(name: string): void {
    const old = this.scene.children.find((c) => c.name === name);
    if (old) {
      this.scene.remove(old);
      this.disposeTree(old);
    }
  }

  /** Splice the shipped mass's collider (matched by its x/z bounds, the
   *  buildGardenSlot pattern) — the decomposition below pushes its own.
   *  ALL matches: the W2 slot cut mutated the original box in place AND
   *  pushed the replacement solid's, so KTN-02 carries two identical
   *  envelopes — leave one behind and the room's doorway stays walled. */
  private retireCollider(x0: number, x1: number, z0: number, z1: number): void {
    for (let ci = this.colliders.length - 1; ci >= 0; ci--) {
      const b = this.colliders[ci];
      if (Math.abs(b.minX - x0) < 0.01 && Math.abs(b.maxX - x1) < 0.01
        && Math.abs(b.minZ - z0) < 0.01 && Math.abs(b.maxZ - z1) < 0.01) {
        this.colliders.splice(ci, 1);
      }
    }
  }

  /** A solid box from BOUNDS — the decomposition reads in extents, not
   *  center/size math. Collides by default (bakes like any solid). */
  private roomBox(name: string, x0: number, x1: number, y0: number, y1: number,
    z0: number, z1: number, color: number, collide = true): THREE.Mesh {
    return this.solid(name, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2,
      x1 - x0, y1 - y0, z1 - z0, color, collide ? {} : { collide: false });
  }

  /** The DUCK piece — the tower above a room. Same box as roomBox, but it
   *  never joins the bake: the bake removes its source meshes, and a duck
   *  has to stay hideable per-room (the bodega roof is the shipped
   *  precedent — it sits in the skip set too). Collider stays on: a hidden
   *  box 3 m over your head never stops anyone. */
  private duckBox(name: string, x0: number, x1: number, y0: number, y1: number,
    z0: number, z1: number, color: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), this.mat(color));
    m.name = name;
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    this.colliders.push(boxFromCenter(m.position.x, m.position.y, m.position.z, x1 - x0, y1 - y0, z1 - z0));
    return m;
  }

  /** One wall run with rectangular openings (piers, sills, lintels).
   *  axis 'x': the wall runs along X at z = `at` (thickness t in z);
   *  axis 'z': runs along Z at x = `at`. Piers and sills collide; lintels
   *  ride above the capsule and don't. Everything pre-bake (bake merges). */
  private wallRun(name: string, axis: 'x' | 'z', at: number,
    a0: number, a1: number, y0: number, y1: number, t: number,
    color: number,
    openings: Array<{ from: number; to: number; y0?: number; y1?: number }> = []): void {
    const ops = [...openings].sort((p, q) => p.from - q.from);
    let cur = a0;
    const piece = (nm: string, from: number, to: number, py0: number, py1: number, collide: boolean): void => {
      if (to - from < 0.01 || py1 - py0 < 0.01) return;
      const mid = (from + to) / 2;
      const yMid = (py0 + py1) / 2;
      if (axis === 'x') this.solid(nm, mid, yMid, at, to - from, py1 - py0, t, color, collide ? {} : { collide: false });
      else this.solid(nm, at, yMid, mid, t, py1 - py0, to - from, color, collide ? {} : { collide: false });
    };
    ops.forEach((op, i) => {
      piece(`${name}_pier_${i}`, cur, op.from, y0, y1, true);
      piece(`${name}_sill_${i}`, op.from, op.to, y0, op.y0 ?? y0, true);
      piece(`${name}_lintel_${i}`, op.from, op.to, op.y1 ?? y1, y1, false);
      cur = op.to;
    });
    piece(`${name}_pier_${ops.length}`, cur, a1, y0, y1, true);
  }

  /** A thin translucent pane on a facade plane (axis 'z' faces ±z). */
  private facadePane(name: string, axis: 'x' | 'z', at: number,
    a0: number, a1: number, y0: number, y1: number, mat: THREE.MeshLambertMaterial): THREE.Mesh {
    const geo = axis === 'x'
      ? new THREE.BoxGeometry(a1 - a0, y1 - y0, 0.06)
      : new THREE.BoxGeometry(0.06, y1 - y0, a1 - a0);
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    if (axis === 'x') m.position.set((a0 + a1) / 2, (y0 + y1) / 2, at);
    else m.position.set(at, (y0 + y1) / 2, (a0 + a1) / 2);
    return m;
  }

  /** A simple fixture box inside a room group (cast+receive, no bake). */
  private fixture(g: THREE.Group, name: string, x: number, y: number, z: number,
    sx: number, sy: number, sz: number, color: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), this.bank.get(color));
    m.name = name;
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }

  private roomKit(id: string): THREE.Group {
    const g = new THREE.Group();
    g.name = `INT_${id}`;
    g.visible = false; // far state until the first updateInteriors
    this.scene.add(g);
    return g;
  }

  /** A room's OWN COLORS (2026-11 interior identity pass — "is the
   *  environment enough to convince someone to play?"). Every room wears:
   *  a wainscot band + gold-line trim on its four inner faces (split around
   *  the door gaps so a threshold never gets wallpapered), and one hanging
   *  light strip under the clear height. Additive dressing — no wall box
   *  moves, no collider changes, the band toggles with the room's group.
   *  The band rides 0.55 m: every storefront window starts at 0.5+, so the
   *  band can only ever meet a DOOR gap — those are the skips. */
  private dressRoom(
    id: string,
    style: { wainscot: number; trim: number; light: number; clear: number;
      skips?: Partial<Record<'x0' | 'x1' | 'z0' | 'z1', Array<[number, number]>>> },
  ): void {
    const h = this.interiorHandles.find((x) => x.id === id);
    if (!h) return;
    const g = h.group;
    const floorY = h.yBand ? h.yBand[0] + 0.61 : 0.16; // the walkable skin
    const bandH = 0.55, d = 0.05, inset = 0.03;
    // subtract the door gaps from a face's span — the band runs in segments
    const segs = (a: number, b: number, skips: Array<[number, number]> | undefined): Array<[number, number]> => {
      let out: Array<[number, number]> = [[a, b]];
      for (const [f, t] of skips ?? []) {
        const next: Array<[number, number]> = [];
        for (const [s0, s1] of out) {
          if (t <= s0 || f >= s1) { next.push([s0, s1]); continue; }
          if (f > s0) next.push([s0, Math.min(f, s1)]);
          if (t < s1) next.push([Math.max(t, s0), s1]);
        }
        out = next;
      }
      return out.filter(([s0, s1]) => s1 - s0 > 0.08);
    };
    const bandMesh = (len: number, alongX: boolean, cx: number, cz: number, y: number, mat: THREE.Material, face: Face, kind: 'band' | 'trim'): void => {
      const m = new THREE.Mesh(
        alongX ? new THREE.BoxGeometry(len, kind === 'band' ? bandH : 0.05, kind === 'band' ? d : d + 0.02)
          : new THREE.BoxGeometry(kind === 'band' ? d : d + 0.02, kind === 'band' ? bandH : 0.05, len), mat);
      m.name = `${id}_${face}_${kind}`;
      m.position.set(cx, y, cz);
      g.add(m);
    };
    const wainsMat = this.bank.get(style.wainscot);
    const trimMat = this.bank.get(style.trim);
    const y0 = floorY + bandH / 2, yT = floorY + bandH + 0.025;
    type Face = 'x0' | 'x1' | 'z0' | 'z1';
    const faces: Array<{ face: Face; alongX: boolean; at: number }> = [
      { face: 'z0', alongX: true, at: h.z0 + inset },
      { face: 'z1', alongX: true, at: h.z1 - inset },
      { face: 'x0', alongX: false, at: h.x0 + inset },
      { face: 'x1', alongX: false, at: h.x1 - inset },
    ];
    for (const { face, alongX, at } of faces) {
      const skips = style.skips?.[face];
      const span = alongX ? [h.x0, h.x1] : [h.z0, h.z1];
      for (const [s0, s1] of segs(span[0], span[1], skips)) {
        const c = (s0 + s1) / 2, len = s1 - s0;
        const cx = alongX ? c : at;
        const cz = alongX ? at : c;
        bandMesh(len, alongX, cx, cz, y0, wainsMat, face, 'band');
        bandMesh(len, alongX, cx, cz, yT, trimMat, face, 'trim');
      }
    }
    // the light strip: a warm emissive bar under the clear height — the
    // room reads as lit from its own ceiling, not by the street. The name
    // rides the GROUP's stem (INT_RECORDS → RECORDS_LightStrip), one law
    // for probe and code — the handle ids and group names disagree.
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min((h.x1 - h.x0) * 0.42, 4.2), 0.07, 0.4),
      this.nightGlow(style.light, 0.75, 1.6),
    );
    lamp.name = `${h.group.name.slice(4)}_LightStrip`;
    lamp.position.set((h.x0 + h.x1) / 2, floorY + style.clear - 0.22, (h.z0 + h.z1) / 2);
    g.add(lamp);
  }

  private registerInterior(h: InteriorHandle): void {
    for (const o of h.nearParts) o.visible = false;
    h.near = false;
    h.inside = false;
    this.interiorHandles.push(h as InteriorHandle & { near: boolean; inside: boolean });
  }

  /** The W5 room visibility toggle — docs/45 W5's exit criterion, plus the
   *  glass-side law (docs/51 B13, interiors' window visibility): the near
   *  band shows the fit-out only THROUGH the room's own glass — the player
   *  stands on the outward side of a window run — or inside the room.
   *  Hysteresis on both (enter 1.6 m, hold to 2.4 m — the exit rides 0.8 m
   *  past the enter line; the old 0.8 exit INVERTED the hysteresis and the
   *  0.8–1.6 m annulus flickered the room every frame — caught by the
   *  shops furniture probe's sidewalk shots, 2026-11-06). Behind a blind
   *  wall the fit-out stays hidden — no window, no room; the facade keeps
   *  its far look. */
  private updateInteriors(px: number, py: number, pz: number): void {
    const inRect = (x0: number, x1: number, z0: number, z1: number): boolean =>
      px >= x0 && px <= x1 && pz >= z0 && pz <= z1;
    for (const h of this.interiorHandles) {
      const m = h.near ? 2.4 : 1.6;
      const z1e = h.z1 + m + (h.padZ1 ?? 0);
      const [y0, y1] = h.yBand ?? [-1, 5];
      const inside = inRect(h.x0, h.x1, h.z0, h.z1) && py >= y0 && py <= y1;
      const near = inside || (inRect(h.x0 - m, h.x1 + m, h.z0 - m, z1e)
        && glassSideVisible(h.glass, px, pz, m));
      if (near !== h.near) {
        h.near = near;
        h.group.visible = near;
        for (const o of h.nearParts) o.visible = near;
        for (const o of h.farParts) o.visible = !near;
      }
      if (inside !== h.inside) {
        h.inside = inside;
        for (const o of h.duck) o.visible = !inside;
      }
    }
  }

  /** W5 assembly — the eight rooms. Wall decompositions carry the shipped
   *  masses' outer envelopes exactly (the ghost gate re-verifies them). */
  private buildAlderHeightsW5(): void {
    this.roomGlassMat = this.nightGlow(0x3b3346, 0.22, 0.85, 0xffb85c);
    this.roomGlassMat.transparent = true;
    this.roomGlassMat.opacity = 0.42;
    this.roomClearMat = this.nightGlow(0x3b3346, 0.05, 0.35, 0xffb85c);
    this.roomClearMat.transparent = true;
    this.roomClearMat.opacity = 0.16;
    this.roomWarmMat = this.nightGlow(PAL.interior, 0.42, 1.6, PAL.amber);

    this.buildW5Laundry();
    this.buildW5Barber();
    this.buildW5Pizza();
    this.buildW5Bakery();
    this.buildW5Records();
    this.buildW5Hall();
    this.buildW5Diner();
    this.buildW5CecilRoom();
    this.buildW5Fruit();
    // W9 (2026-11-12): the strip rows' interiors complete — the W6 Carrow
    // pair's second shop and the eight W7 Westgate/Eastgate shopfronts join
    // FRUIT-INT. Every carved row keeps its registry footprint (the door
    // nodes, the lanes and the bake law untouched); the mass decomposes
    // into duck + walls + an opened facade, and the fit-out rides the
    // near/far interior law.
    this.buildW5Wine();
    this.buildW5Books();
    this.buildW5Hardware();
    this.buildW5NewsEast();
    this.buildW5Verbena();
    this.buildW5Cornelius();
    this.buildW5NewsWest();
    this.buildW5Provisions();
    this.buildW5Cheese();
  }

  /** The W9 strip-row carve — the shared decomposition behind FRUIT-INT
   *  (buildW5Fruit) applied to the remaining shopfront rows. Retires the
   *  W6/W7 mass + its collider (exact bounds match), stands the duck tower
   *  above the 3.2 clear height, walls the three blind sides, and opens
   *  the street facade with the registry door gap (centered on the
   *  entrance's own x) plus the room's windows. Footprints never move —
   *  the nav lanes, door nodes and bake districts read them unchanged. */
  private carveStripRow(o: {
    id: string;                 // the mesh stem ('KTS04')
    regId: string;              // the registry row ('KTS-04')
    massColor: number;
    h: number;                  // the mass's registry height (the duck's top)
    x0: number; x1: number; z0: number; z1: number;  // the full footprint
    face: 'min' | 'max';        // which z side the street door faces
    door: { from: number; to: number };
    windows: Array<{ from: number; to: number; y0?: number; y1?: number }>;
  }): THREE.Mesh {
    this.retireMass(o.regId.replace('-', '_'));
    this.retireCollider(o.x0, o.x1, o.z0, o.z1);
    const duck = this.duckBox(`${o.id}_Upper`, o.x0, o.x1, 3.2, o.h, o.z0, o.z1, o.massColor);
    // the blind sides: W/E skins run the full depth, the back wall caps
    // the far end (the 0.4 / 0.2 thickness law FRUIT-INT shipped)
    this.roomBox(`${o.id}_Wall_W`, o.x0, o.x0 + 0.4, 0, 3.2, o.z0, o.z1, o.massColor);
    this.roomBox(`${o.id}_Wall_E`, o.x1 - 0.4, o.x1, 0, 3.2, o.z0, o.z1, o.massColor);
    if (o.face === 'max') {
      this.roomBox(`${o.id}_Wall_S`, o.x0, o.x1, 0, 3.2, o.z0, o.z0 + 0.2, o.massColor);
      this.wallRun(`${o.id}_Facade`, 'x', o.z1 - 0.1, o.x0 + 0.4, o.x1 - 0.4, 0, 3.2, 0.2, o.massColor,
        [...o.windows, { from: o.door.from, to: o.door.to, y1: 2.8 }]);
    } else {
      this.roomBox(`${o.id}_Wall_N`, o.x0, o.x1, 0, 3.2, o.z1 - 0.2, o.z1, o.massColor);
      this.wallRun(`${o.id}_Facade`, 'x', o.z0 + 0.1, o.x0 + 0.4, o.x1 - 0.4, 0, 3.2, 0.2, o.massColor,
        [...o.windows, { from: o.door.from, to: o.door.to, y1: 2.8 }]);
    }
    return duck;
  }

  /** The W9 strip-room finisher — glass runs + clear panes + the interior
   *  registration for a carved row's windows (the FRUIT-INT convention:
   *  glass sits 0.07 inside the wall's room-side face, panes ride 0.55..2.55
   *  inside the 0.5..2.6 openings, spans inset 0.05). */
  private finishStripRoom(o: {
    id: string;                 // the interior handle id ('WINE-INT')
    shell: { x0: number; x1: number; z0: number; z1: number };
    face: 'min' | 'max';
    duck: THREE.Object3D;
    group: THREE.Group;
    windows: Array<{ from: number; to: number }>;
  }): void {
    const at = o.face === 'max' ? o.shell.z1 + 0.07 : o.shell.z0 - 0.07;
    const glass: GlassFace[] = [];
    const nearParts: THREE.Object3D[] = [];
    for (const w of o.windows) {
      glass.push({ axis: 'z', side: o.face, at, a0: w.from + 0.05, a1: w.to - 0.05 });
      const pane = this.facadePane(`${o.id}_Clear_${w.from}`, 'x', at, w.from + 0.05, w.to - 0.05, 0.55, 2.55, this.roomClearMat);
      nearParts.push(pane);
    }
    this.registerInterior({
      id: o.id, x0: o.shell.x0, x1: o.shell.x1, z0: o.shell.z0, z1: o.shell.z1,
      glass, group: o.group, nearParts, farParts: [], duck: [o.duck],
    });
    for (const p of this.interiorHandles[this.interiorHandles.length - 1].nearParts) this.scene.add(p);
  }

  /** A strip room's fascia — the wide board over the windows (the W6
   *  storefront's identity, kept). Faces 'z', long axis x, proud of the
   *  face plane. (W9 also repairs FRUIT-INT's own fascia, which shipped
   *  with the x/z dims swapped — a 0.14 m text sliver buried in the wall.) */
  private stripFascia(name: string, text: string, cx: number, faceZ: number, face: 'min' | 'max',
    bg: number, fg: number): void {
    const fascia = this.signBoard(name, text, 5.2, 0.7, 0.14, 5.2 * 72, 0.7 * 72, bg, fg, 44);
    fascia.position.set(cx, 3.05, face === 'max' ? faceZ + 0.08 : faceZ - 0.08);
  }

  /** WINE-INT (KTS-04: full-width cavity, x 60.4..67.6, z −63.7..−48.7,
   *  clear 3.2). The W6 Carrow pair's east shop becomes a real ground
   *  floor (W9, 2026-11-12): the TERRACE WINE front keeps its deep-red
   *  identity — the bottle wall on the west skin, the cold case and the
   *  tasting table mid-room, the barrel stacks against the back wall. */
  private buildW5Wine(): void {
    const duck = this.carveStripRow({
      id: 'KTS04', regId: 'KTS-04', massColor: PAL.brick, h: 18,
      x0: 60, x1: 68, z0: -63.9, z1: -48.5, face: 'max',
      door: { from: 61.2, to: 62.4 },
      windows: [{ from: 62.9, to: 65.3 }, { from: 65.9, to: 67.1 }],
    });
    const g = this.roomKit('WINE');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 15.0), this.bank.get(0x6b4636));
    floor.name = 'Wine_Floor';
    floor.position.set(64, 0.13, -56.2);
    floor.receiveShadow = true;
    g.add(floor);
    // counter + register (east skin, just inside the door line)
    this.fixture(g, 'Wine_Counter', 66.85, 0.55, -51.3, 0.7, 1.1, 2.6, 0x4a3a52);
    this.fixture(g, 'Wine_Register', 66.85, 1.25, -50.6, 0.3, 0.3, 0.4, 0x2b2730);
    this.colliders.push(boxFromCenter(66.85, 0.55, -51.3, 0.7, 1.1, 2.6));
    // the bottle wall (west skin) + the cold case behind it
    this.fixture(g, 'Wine_BottleWall', 60.85, 1.1, -52.8, 0.5, 2.2, 5.2, 0x5a3a2e);
    this.colliders.push(boxFromCenter(60.85, 1.1, -52.8, 0.5, 2.2, 5.2));
    this.fixture(g, 'Wine_ColdCase', 60.85, 0.9, -57.6, 0.5, 1.8, 2.2, 0x3b3346);
    this.colliders.push(boxFromCenter(60.85, 0.9, -57.6, 0.5, 1.8, 2.2));
    // the tasting table (mid-room, aisle keeps both sides)
    this.fixture(g, 'Wine_Tasting', 64.2, 0.55, -53.4, 2.2, 1.1, 0.9, 0x6b4636);
    this.colliders.push(boxFromCenter(64.2, 0.55, -53.4, 2.2, 1.1, 0.9));
    // the barrel stacks (back wall)
    this.fixture(g, 'Wine_Barrels', 64, 0.75, -62.8, 4.2, 1.5, 1.2, 0x7a5a3a);
    this.colliders.push(boxFromCenter(64, 0.75, -62.8, 4.2, 1.5, 1.2));
    this.stripFascia('Wine_Fascia', 'TERRACE WINE', 64, -48.5, 'max', 0x9e222e, PAL.cream);
    this.finishStripRoom({
      id: 'WINE-INT', shell: { x0: 60.4, x1: 67.6, z0: -63.7, z1: -48.7 }, face: 'max',
      duck, group: g, windows: [{ from: 62.9, to: 65.3 }, { from: 65.9, to: 67.1 }],
    });
  }

  /** BOOKS-INT (KTN-08 "WESTGATE BOOKS": x −91.6..−84.4, z 8.2..19.8,
   *  clear 3.2). The Westgate row's west bookshop — shelf runs down both
   *  skins, two center islands, the counter by the door and the reading
   *  table at the back wall. */
  private buildW5Books(): void {
    const duck = this.carveStripRow({
      id: 'KTN08', regId: 'KTN-08', massColor: PAL.bldg, h: 15,
      x0: -92, x1: -84, z0: 8, z1: 20, face: 'min',
      door: { from: -88.6, to: -87.4 },
      windows: [{ from: -91.0, to: -89.2 }, { from: -87.0, to: -85.2 }],
    });
    const g = this.roomKit('BOOKS');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 11.6), this.bank.get(0x9a7a54));
    floor.name = 'Books_Floor';
    floor.position.set(-88, 0.13, 14);
    floor.receiveShadow = true;
    g.add(floor);
    this.fixture(g, 'Books_Shelf_W', -91.25, 1.1, 13.9, 0.5, 2.2, 9.0, 0x5a4a3a);
    this.colliders.push(boxFromCenter(-91.25, 1.1, 13.9, 0.5, 2.2, 9.0));
    this.fixture(g, 'Books_Shelf_E', -84.75, 1.1, 13.9, 0.5, 2.2, 9.0, 0x5a4a3a);
    this.colliders.push(boxFromCenter(-84.75, 1.1, 13.9, 0.5, 2.2, 9.0));
    this.fixture(g, 'Books_Island_A', -88.9, 1.05, 12.2, 2.6, 2.1, 0.45, 0x5a4a3a);
    this.colliders.push(boxFromCenter(-88.9, 1.05, 12.2, 2.6, 2.1, 0.45));
    this.fixture(g, 'Books_Island_B', -87.1, 1.05, 15.6, 2.6, 2.1, 0.45, 0x5a4a3a);
    this.colliders.push(boxFromCenter(-87.1, 1.05, 15.6, 2.6, 2.1, 0.45));
    this.fixture(g, 'Books_Counter', -85.6, 0.55, 9.6, 1.6, 1.1, 0.8, 0x8e6f66);
    this.colliders.push(boxFromCenter(-85.6, 0.55, 9.6, 1.6, 1.1, 0.8));
    this.fixture(g, 'Books_Table', -88.3, 0.5, 18.6, 1.4, 1.0, 0.9, 0x8e6f66);
    this.colliders.push(boxFromCenter(-88.3, 0.5, 18.6, 1.4, 1.0, 0.9));
    this.stripFascia('Books_Fascia', 'WESTGATE BOOKS', -88, 8, 'min', 0x2a5a3a, PAL.cream);
    this.finishStripRoom({
      id: 'BOOKS-INT', shell: { x0: -91.6, x1: -84.4, z0: 8.2, z1: 19.8 }, face: 'min',
      duck, group: g, windows: [{ from: -91.0, to: -89.2 }, { from: -87.0, to: -85.2 }],
    });
  }

  /** HARDWARE-INT (KTN-09 "GATE HARDWARE": x −99.6..−92.4, z 8.2..19.8,
   *  clear 3.2). The west corner hardware store — the tool wall at the
   *  back, the workbench under it, shelf runs down both skins and the
   *  paint-drum row by the door. */
  private buildW5Hardware(): void {
    const duck = this.carveStripRow({
      id: 'KTN09', regId: 'KTN-09', massColor: PAL.bldg, h: 16,
      x0: -100, x1: -92, z0: 8, z1: 20, face: 'min',
      door: { from: -96.6, to: -95.4 },
      windows: [{ from: -99.2, to: -97.4 }, { from: -95.0, to: -93.2 }],
    });
    const g = this.roomKit('HARDWARE');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 11.6), this.bank.get(0x8a8276));
    floor.name = 'Hardware_Floor';
    floor.position.set(-96, 0.13, 14);
    floor.receiveShadow = true;
    g.add(floor);
    // the tool wall (back wall, hung — no collider) + the workbench
    this.fixture(g, 'Hardware_ToolWall', -96, 1.4, 19.55, 6.0, 2.2, 0.1, 0x6a5a3a);
    this.fixture(g, 'Hardware_Bench', -96, 0.55, 17.6, 3.2, 1.1, 1.0, 0x5a4a3a);
    this.colliders.push(boxFromCenter(-96, 0.55, 17.6, 3.2, 1.1, 1.0));
    this.fixture(g, 'Hardware_Shelf_W', -99.15, 1.1, 13.0, 0.5, 2.2, 6.0, 0x8e6f66);
    this.colliders.push(boxFromCenter(-99.15, 1.1, 13.0, 0.5, 2.2, 6.0));
    this.fixture(g, 'Hardware_Shelf_E', -92.85, 1.1, 13.0, 0.5, 2.2, 6.0, 0x8e6f66);
    this.colliders.push(boxFromCenter(-92.85, 1.1, 13.0, 0.5, 2.2, 6.0));
    this.fixture(g, 'Hardware_Drums', -93.6, 0.55, 9.6, 1.4, 1.1, 1.4, 0x3b3346);
    this.colliders.push(boxFromCenter(-93.6, 0.55, 9.6, 1.4, 1.1, 1.4));
    this.fixture(g, 'Hardware_Counter', -95.0, 0.55, 10.0, 1.6, 1.1, 0.8, 0x5a4a3a);
    this.colliders.push(boxFromCenter(-95.0, 0.55, 10.0, 1.6, 1.1, 0.8));
    this.stripFascia('Hardware_Fascia', 'GATE HARDWARE', -96, 8, 'min', 0xb23a48, PAL.cream);
    this.finishStripRoom({
      id: 'HARDWARE-INT', shell: { x0: -99.6, x1: -92.4, z0: 8.2, z1: 19.8 }, face: 'min',
      duck, group: g, windows: [{ from: -99.2, to: -97.4 }, { from: -95.0, to: -93.2 }],
    });
  }

  /** NEWS-INT (KTN-10 "EASTGATE NEWS": x 84.4..91.6, z 8.2..19.8,
   *  clear 3.2). The east corner newsstand — the magazine wall at the
   *  back, the counter west of the door, the paper stacks and the center
   *  rack. */
  private buildW5NewsEast(): void {
    const duck = this.carveStripRow({
      id: 'KTN10', regId: 'KTN-10', massColor: PAL.bldg, h: 15,
      x0: 84, x1: 92, z0: 8, z1: 20, face: 'min',
      door: { from: 87.4, to: 88.6 },
      windows: [{ from: 85.2, to: 87.0 }, { from: 89.0, to: 90.8 }],
    });
    const g = this.roomKit('EASTNEWS');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 11.6), this.bank.get(0xc9c2b4));
    floor.name = 'EastNews_Floor';
    floor.position.set(88, 0.13, 14);
    floor.receiveShadow = true;
    g.add(floor);
    this.fixture(g, 'EastNews_MagWall', 88, 1.1, 19.5, 5.6, 2.2, 0.35, 0x8e6f66);
    this.colliders.push(boxFromCenter(88, 1.1, 19.5, 5.6, 2.2, 0.35));
    this.fixture(g, 'EastNews_Papers', 90.6, 0.55, 10.4, 1.4, 1.1, 1.2, 0xe8e4dc);
    this.colliders.push(boxFromCenter(90.6, 0.55, 10.4, 1.4, 1.1, 1.2));
    this.fixture(g, 'EastNews_Counter', 85.8, 0.55, 9.8, 1.8, 1.1, 0.8, 0x4a3a52);
    this.colliders.push(boxFromCenter(85.8, 0.55, 9.8, 1.8, 1.1, 0.8));
    this.fixture(g, 'EastNews_Rack', 88.4, 1.05, 13.2, 2.4, 2.1, 0.5, 0x5a4a3a);
    this.colliders.push(boxFromCenter(88.4, 1.05, 13.2, 2.4, 2.1, 0.5));
    this.stripFascia('EastNews_Fascia', 'EASTGATE NEWS', 88, 8, 'min', 0xb98a2e, PAL.cream);
    this.finishStripRoom({
      id: 'NEWS-INT', shell: { x0: 84.4, x1: 91.6, z0: 8.2, z1: 19.8 }, face: 'min',
      duck, group: g, windows: [{ from: 85.2, to: 87.0 }, { from: 89.0, to: 90.8 }],
    });
  }

  /** VERBENA-INT (KTN-11 "VERBENA BOOKS": x 92.4..99.6, z 8.2..19.8,
   *  clear 3.2). The east corner bookshop with the herbalist's corner —
   *  shelf runs down both skins, the planter pair at the back wall, the
   *  counter by the door. */
  private buildW5Verbena(): void {
    const duck = this.carveStripRow({
      id: 'KTN11', regId: 'KTN-11', massColor: PAL.bldg, h: 16,
      x0: 92, x1: 100, z0: 8, z1: 20, face: 'min',
      door: { from: 95.4, to: 96.6 },
      windows: [{ from: 93.2, to: 95.0 }, { from: 97.0, to: 98.8 }],
    });
    const g = this.roomKit('VERBENA');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 11.6), this.bank.get(0x9a7a54));
    floor.name = 'Verbena_Floor';
    floor.position.set(96, 0.13, 14);
    floor.receiveShadow = true;
    g.add(floor);
    this.fixture(g, 'Verbena_Shelf_W', 92.85, 1.1, 13.9, 0.5, 2.2, 9.0, 0x5a4a3a);
    this.colliders.push(boxFromCenter(92.85, 1.1, 13.9, 0.5, 2.2, 9.0));
    this.fixture(g, 'Verbena_Shelf_E', 99.15, 1.1, 13.9, 0.5, 2.2, 9.0, 0x5a4a3a);
    this.colliders.push(boxFromCenter(99.15, 1.1, 13.9, 0.5, 2.2, 9.0));
    this.fixture(g, 'Verbena_Planter_A', 94.0, 0.45, 19.0, 1.2, 0.9, 0.9, 0x4a7a52);
    this.colliders.push(boxFromCenter(94.0, 0.45, 19.0, 1.2, 0.9, 0.9));
    this.fixture(g, 'Verbena_Planter_B', 98.0, 0.45, 19.0, 1.2, 0.9, 0.9, 0x4a7a52);
    this.colliders.push(boxFromCenter(98.0, 0.45, 19.0, 1.2, 0.9, 0.9));
    this.fixture(g, 'Verbena_Counter', 93.6, 0.55, 10.2, 1.6, 1.1, 0.8, 0x8e6f66);
    this.colliders.push(boxFromCenter(93.6, 0.55, 10.2, 1.6, 1.1, 0.8));
    this.stripFascia('Verbena_Fascia', 'VERBENA BOOKS', 96, 8, 'min', 0x2f4858, PAL.cream);
    this.finishStripRoom({
      id: 'VERBENA-INT', shell: { x0: 92.4, x1: 99.6, z0: 8.2, z1: 19.8 }, face: 'min',
      duck, group: g, windows: [{ from: 93.2, to: 95.0 }, { from: 97.0, to: 98.8 }],
    });
  }

  /** CORNELIUS-INT (MRW-01 "CORNELIUS & CO.": x −91.6..−84.4,
   *  z −31.8..−20.2, clear 3.2). Marlow's west general store — the crate
   *  stacks down the west skin, the shelf run at the back, the counter
   *  east of the door and the barrel pair at the front corner. */
  private buildW5Cornelius(): void {
    const duck = this.carveStripRow({
      id: 'MRW01', regId: 'MRW-01', massColor: PAL.bldg2, h: 15,
      x0: -92, x1: -84, z0: -32, z1: -20, face: 'min',
      door: { from: -88.6, to: -87.4 },
      windows: [{ from: -91.0, to: -89.2 }, { from: -87.0, to: -85.2 }],
    });
    const g = this.roomKit('CORNELIUS');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 11.6), this.bank.get(0xa08a6a));
    floor.name = 'Cornelius_Floor';
    floor.position.set(-88, 0.13, -26);
    floor.receiveShadow = true;
    g.add(floor);
    this.fixture(g, 'Cornelius_Crates', -91.1, 0.75, -24.0, 0.9, 1.5, 3.6, 0x8e6f66);
    this.colliders.push(boxFromCenter(-91.1, 0.75, -24.0, 0.9, 1.5, 3.6));
    this.fixture(g, 'Cornelius_Shelf', -88, 1.1, -20.85, 5.6, 2.2, 0.5, 0x5a4a3a);
    this.colliders.push(boxFromCenter(-88, 1.1, -20.85, 5.6, 2.2, 0.5));
    this.fixture(g, 'Cornelius_Counter', -85.4, 0.55, -22.6, 1.8, 1.1, 0.8, 0x5a4a3a);
    this.colliders.push(boxFromCenter(-85.4, 0.55, -22.6, 1.8, 1.1, 0.8));
    this.fixture(g, 'Cornelius_Barrels', -90.6, 0.7, -29.6, 1.3, 1.4, 1.3, 0x7a5a3a);
    this.colliders.push(boxFromCenter(-90.6, 0.7, -29.6, 1.3, 1.4, 1.3));
    this.stripFascia('Cornelius_Fascia', 'CORNELIUS & CO.', -88, -32, 'min', 0x2f4858, PAL.cream);
    this.finishStripRoom({
      id: 'CORNELIUS-INT', shell: { x0: -91.6, x1: -84.4, z0: -31.8, z1: -20.2 }, face: 'min',
      duck, group: g, windows: [{ from: -91.0, to: -89.2 }, { from: -87.0, to: -85.2 }],
    });
  }

  /** WESTGATE-INT (MRW-02 "WESTGATE NEWS": x −99.6..−92.4,
   *  z −31.8..−20.2, clear 3.2). The west corner newsstand — the magazine
   *  wall at the back, the counter east of the door, the paper stacks and
   *  the center rack. */
  private buildW5NewsWest(): void {
    const duck = this.carveStripRow({
      id: 'MRW02', regId: 'MRW-02', massColor: PAL.bldg2, h: 17,
      x0: -100, x1: -92, z0: -32, z1: -20, face: 'min',
      door: { from: -96.6, to: -95.4 },
      windows: [{ from: -99.2, to: -97.4 }, { from: -95.0, to: -93.2 }],
    });
    const g = this.roomKit('WESTNEWS');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 11.6), this.bank.get(0xc9c2b4));
    floor.name = 'WestNews_Floor';
    floor.position.set(-96, 0.13, -26);
    floor.receiveShadow = true;
    g.add(floor);
    this.fixture(g, 'WestNews_MagWall', -96, 1.1, -20.85, 5.6, 2.2, 0.35, 0x8e6f66);
    this.colliders.push(boxFromCenter(-96, 1.1, -20.85, 5.6, 2.2, 0.35));
    this.fixture(g, 'WestNews_Counter', -93.4, 0.55, -23.0, 1.8, 1.1, 0.8, 0x4a3a52);
    this.colliders.push(boxFromCenter(-93.4, 0.55, -23.0, 1.8, 1.1, 0.8));
    this.fixture(g, 'WestNews_Papers', -98.4, 0.55, -22.2, 1.4, 1.1, 1.2, 0xe8e4dc);
    this.colliders.push(boxFromCenter(-98.4, 0.55, -22.2, 1.4, 1.1, 1.2));
    this.fixture(g, 'WestNews_Rack', -96.4, 1.05, -27.4, 2.4, 2.1, 0.5, 0x5a4a3a);
    this.colliders.push(boxFromCenter(-96.4, 1.05, -27.4, 2.4, 2.1, 0.5));
    this.stripFascia('WestNews_Fascia', 'WESTGATE NEWS', -96, -32, 'min', 0x9e222e, PAL.cream);
    this.finishStripRoom({
      id: 'WESTGATE-INT', shell: { x0: -99.6, x1: -92.4, z0: -31.8, z1: -20.2 }, face: 'min',
      duck, group: g, windows: [{ from: -99.2, to: -97.4 }, { from: -95.0, to: -93.2 }],
    });
  }

  /** PROVISIONS-INT (MRW-03 "LARKIN PROVISIONS": x 84.4..91.6,
   *  z −31.8..−20.2, clear 3.2). The east general store — the counter
   *  west of the door, the sack-and-barrel row down the east skin, the
   *  back shelf run and the crate stack by the cold corner. */
  private buildW5Provisions(): void {
    const duck = this.carveStripRow({
      id: 'MRW03', regId: 'MRW-03', massColor: PAL.bldg2, h: 17,
      x0: 84, x1: 92, z0: -32, z1: -20, face: 'min',
      door: { from: 87.4, to: 88.6 },
      windows: [{ from: 85.2, to: 87.0 }, { from: 89.0, to: 90.8 }],
    });
    const g = this.roomKit('PROVISIONS');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 11.6), this.bank.get(0xa08a6a));
    floor.name = 'Provisions_Floor';
    floor.position.set(88, 0.13, -26);
    floor.receiveShadow = true;
    g.add(floor);
    this.fixture(g, 'Provisions_Counter', 85.6, 0.55, -23.0, 1.8, 1.1, 0.8, 0x5a4a3a);
    this.colliders.push(boxFromCenter(85.6, 0.55, -23.0, 1.8, 1.1, 0.8));
    this.fixture(g, 'Provisions_Sacks', 90.7, 0.75, -25.0, 0.9, 1.5, 4.0, 0x8e6f66);
    this.colliders.push(boxFromCenter(90.7, 0.75, -25.0, 0.9, 1.5, 4.0));
    this.fixture(g, 'Provisions_Shelf', 88, 1.1, -20.85, 5.6, 2.2, 0.5, 0x5a4a3a);
    this.colliders.push(boxFromCenter(88, 1.1, -20.85, 5.6, 2.2, 0.5));
    this.fixture(g, 'Provisions_Crates', 90.4, 0.6, -30.2, 2.0, 1.2, 1.0, 0x8e6f66);
    this.colliders.push(boxFromCenter(90.4, 0.6, -30.2, 2.0, 1.2, 1.0));
    this.stripFascia('Provisions_Fascia', 'LARKIN PROVISIONS', 88, -32, 'min', 0xb98a2e, PAL.cream);
    this.finishStripRoom({
      id: 'PROVISIONS-INT', shell: { x0: 84.4, x1: 91.6, z0: -31.8, z1: -20.2 }, face: 'min',
      duck, group: g, windows: [{ from: 85.2, to: 87.0 }, { from: 89.0, to: 90.8 }],
    });
  }

  /** CHEESE-INT (MRW-04 "CARROW CHEESE": x 92.4..99.6, z −31.8..−20.2,
   *  clear 3.2). The east corner cheese shop — the wheel shelf at the
   *  back, the counter west of the door, the cold case down the east
   *  skin and the crate at the cold corner. */
  private buildW5Cheese(): void {
    const duck = this.carveStripRow({
      id: 'MRW04', regId: 'MRW-04', massColor: PAL.bldg2, h: 15,
      x0: 92, x1: 100, z0: -32, z1: -20, face: 'min',
      door: { from: 95.4, to: 96.6 },
      windows: [{ from: 93.2, to: 95.0 }, { from: 97.0, to: 98.8 }],
    });
    const g = this.roomKit('CHEESE');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 11.6), this.bank.get(0xd8cbb2));
    floor.name = 'Cheese_Floor';
    floor.position.set(96, 0.13, -26);
    floor.receiveShadow = true;
    g.add(floor);
    this.fixture(g, 'Cheese_WheelShelf', 96, 1.1, -20.85, 5.6, 2.2, 0.5, 0x5a4a3a);
    this.colliders.push(boxFromCenter(96, 1.1, -20.85, 5.6, 2.2, 0.5));
    this.fixture(g, 'Cheese_Counter', 93.6, 0.55, -23.0, 1.8, 1.1, 0.8, 0x4a3a52);
    this.colliders.push(boxFromCenter(93.6, 0.55, -23.0, 1.8, 1.1, 0.8));
    this.fixture(g, 'Cheese_ColdCase', 99.15, 0.9, -25.4, 0.5, 1.8, 3.0, 0x3b3346);
    this.colliders.push(boxFromCenter(99.15, 0.9, -25.4, 0.5, 1.8, 3.0));
    this.fixture(g, 'Cheese_Crate', 98.2, 0.6, -30.0, 1.4, 1.2, 1.0, 0x8e6f66);
    this.colliders.push(boxFromCenter(98.2, 0.6, -30.0, 1.4, 1.2, 1.0));
    this.stripFascia('Cheese_Fascia', 'CARROW CHEESE', 96, -32, 'min', 0x2a5a3a, PAL.cream);
    this.finishStripRoom({
      id: 'CHEESE-INT', shell: { x0: 92.4, x1: 99.6, z0: -31.8, z1: -20.2 }, face: 'min',
      duck, group: g, windows: [{ from: 93.2, to: 95.0 }, { from: 97.0, to: 98.8 }],
    });
  }

  /** FRUIT-INT (TEN-02: full-width cavity, x −67.6..−60.4, z −63.7..−48.7,
   *  clear 3.2). The W5 pattern's first strip-row room (W8, 2026-11-12):
   *  the Carrow row's working shopfront becomes a real ground floor — the
   *  mass ducks above y 3.2, the terrace-walk facade carries the door gap
   *  (the registry entrance's own x, −66.2) plus two windows, the fruit
   *  crates read through the glass from the walk, and the counter + scale
   *  and the cold case line the west wall. */
  private buildW5Fruit(): void {
    this.retireMass('TEN_02');
    this.retireCollider(-68, -60, -63.9, -48.5);
    this.duckBox('TEN02_Upper', -68, -60, 3.2, 16.5, -63.9, -48.5, PAL.brick);
    const duckUpper = this.scene.children[this.scene.children.length - 1];
    this.roomBox('TEN02_Wall_S', -68, -60, 0, 3.2, -63.9, -63.7, PAL.brick);
    this.roomBox('TEN02_Wall_W', -68, -67.6, 0, 3.2, -63.9, -48.5, PAL.brick);
    this.roomBox('TEN02_Wall_E', -60.4, -60, 0, 3.2, -63.9, -48.5, PAL.brick);
    this.wallRun('TEN02_Facade', 'x', -48.6, -67.6, -60.4, 0, 3.2, 0.2, PAL.brick, [
      { from: -66.8, to: -65.6, y1: 2.8 },           // the door (the registry's own entrance x)
      { from: -64.9, to: -62.5, y0: 0.5, y1: 2.6 },  // the shop window
      { from: -61.9, to: -60.7, y0: 0.5, y1: 2.6 },  // window E
    ]);

    const g = this.roomKit('FRUIT');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 15.0), this.bank.get(0xd8cbb2));
    floor.name = 'Fruit_Floor';
    floor.position.set(-64, 0.13, -56.2);
    floor.receiveShadow = true;
    g.add(floor);
    // counter + scale (west wall, just inside the door line)
    this.fixture(g, 'Fruit_Counter', -66.9, 0.55, -51.5, 0.8, 1.1, 2.6, 0x4a7a52);
    this.fixture(g, 'Fruit_Scale', -66.8, 1.25, -50.9, 0.3, 0.3, 0.3, 0x8e6f66);
    this.colliders.push(boxFromCenter(-66.9, 0.55, -51.5, 0.8, 1.1, 2.6));
    // the cold case (west wall, rear)
    this.fixture(g, 'Fruit_ColdCase', -66.9, 0.9, -55.2, 0.8, 1.8, 2.2, 0x3b3346);
    this.colliders.push(boxFromCenter(-66.9, 0.9, -55.2, 0.8, 1.8, 2.2));
    // the fruit crates — three rows under the shop window, the glass read
    const crateRows: Array<[number, number, number]> = [[-63.7, -50.2, 0xd9772f], [-63.7, -51.4, 0xb23a48], [-63.7, -52.6, 0x2a9d8f]];
    for (const [cx, cz, cc] of crateRows) {
      this.fixture(g, `Fruit_Crate_${cz}`, cx, 0.35, cz, 2.2, 0.5, 0.9, cc);
      this.colliders.push(boxFromCenter(cx, 0.35, cz, 2.2, 0.7, 0.9));
    }
    // the crate stacks (rear, south wall)
    this.fixture(g, 'Fruit_Stacks', -64, 0.75, -62.9, 4.6, 1.3, 1.1, 0x8e6f66);
    this.colliders.push(boxFromCenter(-64, 0.75, -62.9, 4.6, 1.5, 1.1));

    // the facade's own sign — the W6 storefront's identity, kept (canvas
    // materials stay out of the bake by themselves). W9: the dims were
    // shipped swapped (0.14 wide × 5.2 deep — the text planes buried in
    // the wall); the wide board faces the walk now, via stripFascia.
    this.stripFascia('Fruit_Fascia', 'CARROW FRUITS', -64, -48.5, 'max', 0x2a9d8f, PAL.cream);

    const farParts: THREE.Object3D[] = [];
    this.registerInterior({
      id: 'FRUIT-INT', x0: -67.6, x1: -60.4, z0: -63.7, z1: -48.7,
      glass: [
        { axis: 'z', side: 'max', at: -48.63, a0: -64.85, a1: -62.55 },
        { axis: 'z', side: 'max', at: -48.63, a0: -61.85, a1: -60.75 },
      ],
      group: g,
      nearParts: [
        this.facadePane('Fruit_Clear_W', 'x', -48.63, -64.85, -62.55, 0.55, 2.55, this.roomClearMat),
        this.facadePane('Fruit_Clear_E', 'x', -48.63, -61.85, -60.75, 0.55, 2.55, this.roomClearMat),
      ],
      farParts, duck: [duckUpper],
    });
    for (const p of (this.interiorHandles[this.interiorHandles.length - 1].nearParts)) this.scene.add(p);
  }

  /** LAUNDRY-INT (registry: KTN-02, x −11..1, z 8.2..19, clear 3.2). The
   *  shipped bay (washers, Sal, the alcove) stays byte-identical — the room
   *  hollows behind it, the bay's warm back wall becomes the far state's
   *  curtain (it hides while the room shows). The Bldg_N_East_A_West mass
   *  (W2's x −11..6.5 cut) decomposes around the cavity. */
  private buildW5Laundry(): void {
    this.retireMass('Bldg_N_East_A_West');
    this.retireCollider(-11, 6.5, 8, 20);
    // the mass: upper tower (splits at the cavity's east wall x 0.85), the
    // ground solid east of the room, the west skin, the north wall, and the
    // south facade with the shipped bay opening (x −7.925..−2.075, y 0..2.8)
    this.duckBox('KTN02_Upper_W', -11, 0.85, 3.2, 18, 8, 20, PAL.bldg2);
    const duckUpper = this.scene.children[this.scene.children.length - 1] as THREE.Mesh;
    this.roomBox('KTN02_Upper_E', 0.85, 6.5, 3.2, 18, 8, 20, PAL.bldg2);
    this.roomBox('KTN02_Gnd_E', 0.85, 6.5, 0, 3.2, 8, 20, PAL.bldg2);
    this.roomBox('KTN02_Wall_W', -11, -10.85, 0, 3.2, 8, 20, PAL.bldg2);
    this.roomBox('KTN02_Wall_N', -11, 0.85, 0, 3.2, 18.85, 20, PAL.bldg2);
    this.wallRun('KTN02_Facade', 'x', 8.15, -11, 0.85, 0, 3.2, 0.3, PAL.bldg2,
      [{ from: -7.925, to: -2.075, y1: 2.8 }]);

    const g = this.roomKit('LAUNDRY');
    // floor: from the facade line back, warm plaster — continuous with the
    // shipped bay floor's neighbor — the room's own tile blue-gray (the
    // identity pass: every room wears its own floor, not one shared tan)
    const floor = new THREE.Mesh(new THREE.BoxGeometry(11.7, 0.06, 10.8), this.bank.get(0xc3cdd2));
    floor.name = 'LaundryRoom_Floor';
    floor.position.set(-5.15, 0.13, 13.45);
    floor.receiveShadow = true;
    g.add(floor);
    // warm band on the north wall (the room's light source, Laundry_Back's
    // grammar carried inward)
    const warm = new THREE.Mesh(new THREE.BoxGeometry(11.5, 2.4, 0.06), this.roomWarmMat);
    warm.name = 'LaundryRoom_Warm';
    warm.position.set(-5.15, 1.7, 18.82);
    g.add(warm);
    // the registry's machines: 6 washers west wall, 4 dryers east
    for (const wz of [9.5, 11.2, 12.9, 14.6, 16.3, 18]) {
      // yawed slot: the fallback box keeps today's footprint (0.95 along the
      // wall, 0.75 deep) while the sand3d front-loader rides the slot's yaw
      // (door east, into the room). The porthole disc is a slot CHILD, so a
      // landed model takes it away with the box instead of floating in
      // front of the GLB's own glass.
      const slot = new THREE.Group();
      slot.name = `LW_slot_${wz}`;
      slot.position.set(-10.35, 0.9, wz);
      slot.rotation.y = Math.PI / 2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.5, 0.95), this.bank.get(0x9a938c));
      body.castShadow = true;
      body.receiveShadow = true;
      slot.add(body);
      const porthole = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 14), this.bank.get(0x2b2730));
      porthole.rotation.x = Math.PI / 2;
      porthole.position.set(0, -0.05, 0.49);
      slot.add(porthole);
      g.add(slot);
      this.registerGlbProp(`washer_${wz}`, slot);
      void this.upgradePropWithGLB(`washer_${wz}`, 'models/washing_machine.glb');
      this.colliders.push(boxFromCenter(-10.35, 0.9, wz, 0.95, 1.5, 0.75));
    }
    // dryers east wall — the washer-slot pattern (group yaw −π/2, door west
    // into the room; the GLB takes the whole slot, control band included)
    for (const dz of [10.5, 12.2, 13.9, 15.6]) {
      const slot = new THREE.Group();
      slot.name = `LD_slot_${dz}`;
      slot.position.set(0.35, 0.8, dz);
      slot.rotation.y = -Math.PI / 2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.35, 0.95), this.bank.get(0x9a938c));
      body.castShadow = true;
      body.receiveShadow = true;
      slot.add(body);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.79, 0.08, 0.99), this.bank.get(PAL.teal));
      band.position.y = 0.72;
      slot.add(band);
      g.add(slot);
      this.colliders.push(boxFromCenter(0.35, 0.8, dz, 0.95, 1.35, 0.75));
    }
    // folding tables (2): full-height bodies (the GLB stands on its own
    // feet), seating (2 chairs + cart), back room (shelf+carts)
    for (const tz of [12.1, 13.1]) {
      this.fixture(g, `LT_${tz}`, -5, 0.585, tz, 2.4, 0.85, 0.9, PAL.cream);
      this.colliders.push(boxFromCenter(-5, 0.5, tz, 2.4, 1.0, 0.9));
    }
    // the waiting chairs (ABO slot — full-height body, the Hall_Chair_A
    // pattern; the old seat+back pair read floating under a real model)
    for (const cz of [9.3, 9.9]) {
      this.fixture(g, `LC_${cz}`, -2.9, 0.44, cz, 0.5, 0.88, 0.5, 0x2b2730);
    }
    // a framed print over the washers (ABO slot — wall decor, no collider)
    this.fixture(g, 'LWall_Art', -10.81, 2.2, 13.75, 0.05, 0.55, 0.45, 0x8e6f66);
    this.fixture(g, 'LCart', -2.1, 0.45, 9.6, 0.6, 0.9, 0.45, PAL.teal);
    this.colliders.push(boxFromCenter(-2.6, 0.5, 9.6, 1.6, 1.0, 1.0));
    this.fixture(g, 'LShelf', -5, 1.0, 18.5, 4, 1.8, 0.45, PAL.bldg2);
    this.fixture(g, 'LLinen_a', -6.4, 0.5, 17.9, 0.7, 1.0, 0.5, PAL.cream);
    this.fixture(g, 'LLinen_b', -3.6, 0.5, 17.9, 0.7, 1.0, 0.5, PAL.cream);
    this.colliders.push(boxFromCenter(-5, 1.0, 18.5, 4, 2.0, 0.5));
    // the soda machine on the east wall, south of the dryers — every
    // laundromat has one (sand3d ADD; collider matches its box)
    this.fixture(g, 'LD_Vending', 0.5, 1.06, 17.8, 0.6, 1.8, 1.0, 0x2b2730);
    this.colliders.push(boxFromCenter(0.5, 0.9, 17.8, 0.6, 1.8, 1.0));

    // the far state: the shipped bay back wall (extracted — it was baked)
    const back = this.scene.children.find((c) => c.name === 'Laundry_Back');
    const farParts: THREE.Object3D[] = [];
    if (back) {
      this.scene.attach(back);
      farParts.push(back);
    }
    this.registerInterior({
      id: 'LAUNDRY-INT', x0: -11, x1: 1, z0: 8.2, z1: 19,
      // glass: the shipped bay's opening on the south facade (the wallRun
      // cut above) — the one window the street knows this room by
      glass: [{ axis: 'z', side: 'min', at: 8.15, a0: -7.925, a1: -2.075 }],
      group: g, nearParts: [], farParts, duck: [duckUpper],
    });
  }

  /** BARBER-INT (KTN-05: x 34.2..39, z 8.2..19.6, clear 3.4). Two chairs
   *  face the mirror wall; the trim's anchor lives at the chair now. The
   *  shipped FADE KING glass face is the far pane. */
  private buildW5Barber(): void {
    this.retireMass('Bldg_N_East_B_E');
    this.retireCollider(33.5, 49, 8, 20);
    this.duckBox('KTN05_Upper_W', 33.5, 39, 3.4, 16, 8, 20, PAL.bldg);
    const duckUpper = this.scene.children[this.scene.children.length - 1];
    this.roomBox('KTN05_Upper_E', 39, 49, 3.4, 16, 8, 20, PAL.bldg);
    this.roomBox('KTN05_Gnd_E', 39, 49, 0, 3.4, 8, 20, PAL.bldg);
    this.roomBox('KTN05_Wall_W', 33.5, 34.4, 0, 3.4, 8, 20, PAL.bldg);
    this.roomBox('KTN05_Wall_N', 34.4, 38.8, 0, 3.4, 19.4, 20, PAL.bldg);
    this.wallRun('KTN05_Facade', 'x', 8.1, 34.4, 38.8, 0, 3.4, 0.2, PAL.bldg, [
      { from: 34.4, to: 35.9, y0: 0.5, y1: 2.6 },  // window W
      { from: 36.1, to: 37.1, y1: 2.8 },           // the door
      { from: 37.2, to: 38.8, y0: 0.5, y1: 2.6 },  // window E
    ]);

    const g = this.roomKit('BARBER');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 11.0), this.bank.get(0xd9cfc2));
    floor.name = 'Barber_Floor';
    floor.position.set(36.6, 0.13, 13.9);
    floor.receiveShadow = true;
    g.add(floor);
    // mirror wall + counter (E), the room's light
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 5.0), this.roomWarmMat);
    mirror.name = 'Barber_Mirror';
    mirror.position.set(38.74, 1.55, 12.3);
    g.add(mirror);
    this.fixture(g, 'Barber_Counters', 38.45, 0.45, 12.3, 0.5, 0.9, 5.0, PAL.teal);
    this.colliders.push(boxFromCenter(38.45, 0.45, 12.3, 0.5, 0.9, 5.0));
    // the register on the counter's south shoulder (sand3d ADD) — the
    // washer-slot pattern, front west into the room
    const regSlot = new THREE.Group();
    regSlot.name = 'Barber_Register';
    regSlot.position.set(38.3, 1.03, 14.4);
    regSlot.rotation.y = -Math.PI / 2;
    const regBody = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.36), this.bank.get(0x2b2730));
    regBody.castShadow = true;
    regBody.receiveShadow = true;
    regSlot.add(regBody);
    g.add(regSlot);
    // the two chairs (the registry's 35.9 / z 11 & 13.6), facing the mirror
    // wall east — the washer-slot pattern (group yaw +π/2); the GLB is the
    // whole chair, star base to headrest
    for (const cz of [11.0, 13.6]) {
      const slot = new THREE.Group();
      slot.name = `Barber_Chair_${cz.toFixed(1)}`;
      slot.position.set(35.9, 0.76, cz);
      slot.rotation.y = Math.PI / 2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.7), this.bank.get(0x2b2730));
      body.castShadow = true;
      body.receiveShadow = true;
      slot.add(body);
      g.add(slot);
      this.colliders.push(boxFromCenter(35.9, 0.45, cz, 0.75, 0.9, 0.75));
    }
    // framed mirrors over the counter, one per chair (ABO slot — wall
    // decor on the mirror wall's west face, no collider)
    this.fixture(g, 'Barber_Mirror_A', 38.66, 1.35, 11.0, 0.06, 0.78, 0.68, 0x8e6f66);
    this.fixture(g, 'Barber_Mirror_B', 38.66, 1.35, 13.6, 0.06, 0.78, 0.68, 0x8e6f66);
    // waiting bench (W wall)
    this.fixture(g, 'Barber_Bench', 34.75, 0.25, 12.3, 0.45, 0.5, 2.0, PAL.teal);
    this.colliders.push(boxFromCenter(34.75, 0.3, 12.3, 0.5, 0.6, 2.0));
    // powder room (NE): two stall walls with a gap
    this.fixture(g, 'Barber_Pow_W', 37.3, 1.2, 18.4, 0.1, 2.4, 2.0, PAL.stone);
    this.fixture(g, 'Barber_Pow_S_a', 37.65, 1.2, 17.4, 0.8, 2.4, 0.1, PAL.stone);
    this.fixture(g, 'Barber_Pow_S_b', 38.45, 1.2, 17.4, 0.8, 2.4, 0.1, PAL.stone);
    this.colliders.push(boxFromCenter(37.3, 1.2, 18.4, 0.12, 2.4, 2.0));
    this.colliders.push(boxFromCenter(38.05, 1.2, 17.4, 1.6, 2.4, 0.12));

    const farParts: THREE.Object3D[] = [];
    const glass = this.scene.getObjectByName('Barber_Glass');
    if (glass) {
      this.scene.attach(glass);
      farParts.push(glass);
    }
    this.registerInterior({
      id: 'BARBER-INT', x0: 34.2, x1: 39, z0: 8.2, z1: 19.6,
      // glass: the two south windows (the clear panes ride their runs)
      glass: [
        { axis: 'z', side: 'min', at: 8.1, a0: 34.45, a1: 35.85 },
        { axis: 'z', side: 'min', at: 8.1, a0: 37.25, a1: 38.75 },
      ],
      group: g,
      nearParts: [
        this.facadePane('Barber_Clear_W', 'x', 8.1, 34.45, 35.85, 0.55, 2.55, this.roomClearMat),
        this.facadePane('Barber_Clear_E', 'x', 8.1, 37.25, 38.75, 0.55, 2.55, this.roomClearMat),
      ],
      farParts, duck: [duckUpper],
    });
    for (const p of (this.interiorHandles[this.interiorHandles.length - 1].nearParts)) this.scene.add(p);
  }

  /** PIZZA-INT (KTN-04: x 24.1..29.9, z 8.2..19.6, clear 3.4). The slice
   *  counter at the S window, the deck oven NE, two booths W. */
  private buildW5Pizza(): void {
    this.retireMass('Bldg_N_East_B_W');
    this.retireCollider(21, 30.7, 8, 20);
    this.roomBox('KTN04_Upper_W', 21, 24.3, 3.4, 16, 8, 20, PAL.bldg);
    this.duckBox('KTN04_Upper_C', 24.3, 29.7, 3.4, 16, 8, 20, PAL.bldg);
    const duckUpper = this.scene.children[this.scene.children.length - 1];
    this.roomBox('KTN04_Upper_E', 29.7, 30.7, 3.4, 16, 8, 20, PAL.bldg);
    this.roomBox('KTN04_Gnd_W', 21, 24.3, 0, 3.4, 8, 20, PAL.bldg);
    this.roomBox('KTN04_Gnd_E', 29.7, 30.7, 0, 3.4, 8, 20, PAL.bldg);
    this.roomBox('KTN04_Wall_N', 24.3, 29.7, 0, 3.4, 19.4, 20, PAL.bldg);
    this.wallRun('KTN04_Facade', 'x', 8.1, 24.3, 29.7, 0, 3.4, 0.2, PAL.bldg, [
      { from: 24.5, to: 26.4, y0: 0.5, y1: 2.6 },  // window W
      { from: 26.6, to: 27.6, y1: 2.8 },           // the door
      { from: 27.8, to: 29.5, y0: 0.5, y1: 2.6 },  // the slice window (E)
    ]);

    const g = this.roomKit('PIZZA');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.06, 11.0), this.bank.get(0xd8c39c));
    floor.name = 'Pizza_Floor';
    floor.position.set(27, 0.13, 13.9);
    floor.receiveShadow = true;
    g.add(floor);
    // slice counter (S window line)
    this.fixture(g, 'Pizza_SliceCounter', 27, 0.55, 9.0, 4.6, 1.1, 0.7, PAL.teal);
    this.fixture(g, 'Pizza_SliceTop', 27, 1.12, 9.0, 4.7, 0.06, 0.8, PAL.stone);
    this.colliders.push(boxFromCenter(27, 0.55, 9.0, 4.6, 1.1, 0.7));
    // deck oven (NE) + the warm mouth
    this.fixture(g, 'Pizza_Oven', 28.8, 0.9, 17.8, 1.8, 1.8, 2.2, 0x9a938c);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.06), this.roomWarmMat);
    mouth.position.set(28.8, 1.1, 16.68);
    g.add(mouth);
    this.colliders.push(boxFromCenter(28.8, 0.9, 17.8, 1.8, 1.8, 2.2));
    // booths (2, W wall): table + two benches each. The table placeholder
    // is a full-height body (the ABO swap stands on its own feet; the old
    // thin top floated a real model 0.7 m over the floor)
    for (const bz of [12.5, 15.5]) {
      this.fixture(g, `Pizza_BoothT_${bz}`, 25.2, 0.36, bz, 0.8, 0.72, 1.1, PAL.cream);
      this.fixture(g, `Pizza_BoothB1_${bz}`, 24.55, 0.3, bz, 0.5, 0.6, 2.0, PAL.coral);
      this.fixture(g, `Pizza_BoothB2_${bz}`, 25.85, 0.3, bz, 0.5, 0.6, 2.0, PAL.coral);
      this.colliders.push(boxFromCenter(25.2, 0.5, bz, 1.7, 1.0, 2.0));
    }
    // drink fridge (E wall)
    this.fixture(g, 'Pizza_Fridge', 29.45, 0.9, 13.5, 0.5, 1.8, 3.0, 0x2b2730);
    this.colliders.push(boxFromCenter(29.45, 0.9, 13.5, 0.5, 1.8, 3.0));
    // prep counter on the north wall, west of the deck oven (sand3d ADD —
    // Eddie and Kev's actual work surface; collider hugs the wall)
    this.fixture(g, 'Pizza_Prep', 26.8, 0.66, 18.9, 2.0, 1.0, 0.7, PAL.cream);
    this.colliders.push(boxFromCenter(26.8, 0.5, 18.9, 2.0, 1.0, 0.7));
    // the menu board over the slice counter (wall decor — no collider)
    this.fixture(g, 'Pizza_Menu', 27, 2.3, 8.35, 2.2, 1.1, 0.06, 0x3a3440);

    const farParts: THREE.Object3D[] = [];
    const glass = this.scene.getObjectByName('Pizza_Glass');
    if (glass) {
      this.scene.attach(glass);
      farParts.push(glass);
    }
    this.registerInterior({
      id: 'PIZZA-INT', x0: 24.1, x1: 29.9, z0: 8.2, z1: 19.6,
      // glass: the two south windows
      glass: [
        { axis: 'z', side: 'min', at: 8.1, a0: 24.55, a1: 26.35 },
        { axis: 'z', side: 'min', at: 8.1, a0: 27.85, a1: 29.45 },
      ],
      group: g,
      nearParts: [
        this.facadePane('Pizza_Clear_W', 'x', 8.1, 24.55, 26.35, 0.55, 2.55, this.roomClearMat),
        this.facadePane('Pizza_Clear_E', 'x', 8.1, 27.85, 29.45, 0.55, 2.55, this.roomClearMat),
      ],
      farParts, duck: [duckUpper],
    });
    for (const p of (this.interiorHandles[this.interiorHandles.length - 1].nearParts)) this.scene.add(p);
  }

  /** BAKERY-INT (SMB-01: full-width cavity, x −37.8..−30.2, z −31.8..−20.2,
   *  clear 3.2). Counter just inside the S storefront (the W5 orientation
   *  fix), deck oven + racks at the rear. */
  private buildW5Bakery(): void {
    this.retireMass('SMB_01');
    this.retireCollider(-38, -30, -32, -20);
    this.duckBox('SMB01_Upper', -38, -30, 3.2, 12, -32, -20, PAL.bldg2);
    const duckUpper = this.scene.children[this.scene.children.length - 1];
    this.roomBox('SMB01_Wall_N', -38, -30, 0, 3.2, -20.2, -20, PAL.bldg2);
    this.roomBox('SMB01_Wall_W', -38, -37.8, 0, 3.2, -32, -20, PAL.bldg2);
    this.roomBox('SMB01_Wall_E', -30.2, -30, 0, 3.2, -32, -20, PAL.bldg2);
    this.wallRun('SMB01_Facade', 'x', -31.9, -37.8, -30.2, 0, 3.2, 0.2, PAL.bldg2, [
      { from: -37.2, to: -34.9, y0: 0.5, y1: 2.6 },  // window W
      { from: -34.6, to: -33.4, y1: 2.8 },           // the door
      { from: -33.1, to: -30.8, y0: 0.5, y1: 2.6 },  // window E (the bagel window)
    ]);

    const g = this.roomKit('BAKERY');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.06, 11.6), this.bank.get(0xe6d7b4));
    floor.name = 'Bakery_Floor';
    floor.position.set(-34, 0.13, -26);
    floor.receiveShadow = true;
    g.add(floor);
    // service counter + case (just inside)
    this.fixture(g, 'Bakery_Counter', -34, 0.55, -30.4, 5.4, 1.1, 0.8, PAL.teal);
    this.fixture(g, 'Bakery_Case', -34, 1.22, -30.4, 5.4, 0.35, 0.7, 0x3b3346);
    for (const bx of [-35.6, -34.8, -34, -33.2]) {
      const bun = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 10), this.bank.get(0xd9a05b));
      bun.position.set(bx, 1.44, -30.4);
      g.add(bun);
    }
    this.colliders.push(boxFromCenter(-34, 0.55, -30.4, 5.4, 1.1, 0.8));
    // deck oven + racks (rear, z −22.2)
    this.fixture(g, 'Bakery_Oven', -34, 0.9, -22.2, 4.4, 1.8, 2.4, 0x9a938c);
    const ovenMouth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.06), this.roomWarmMat);
    ovenMouth.position.set(-34, 1.0, -23.42);
    g.add(ovenMouth);
    this.colliders.push(boxFromCenter(-34, 0.9, -22.2, 4.4, 1.8, 2.4));
    this.fixture(g, 'Bakery_Rack_W', -36.9, 0.9, -22.2, 0.7, 1.8, 1.4, 0x8e6f66);
    this.fixture(g, 'Bakery_Rack_E', -31.1, 0.9, -22.2, 0.7, 1.8, 1.4, 0x8e6f66);
    this.colliders.push(boxFromCenter(-36.9, 0.9, -22.2, 0.7, 1.8, 1.4));
    this.colliders.push(boxFromCenter(-31.1, 0.9, -22.2, 0.7, 1.8, 1.4));
    // two two-top tables (the ABO swap stands on its own feet — the old
    // thin top + leg pair floated a real model)
    for (const tx of [-36.2, -31.8]) {
      this.fixture(g, `Bakery_Table_${tx}`, tx, 0.36, -27.4, 1.1, 0.72, 1.1, PAL.cream);
      this.colliders.push(boxFromCenter(tx, 0.4, -27.4, 1.1, 0.8, 1.1));
    }
    // rear utility wall behind the oven (sand3d ADD — the flour wall)
    this.fixture(g, 'Bakery_BackShelf', -34, 1.16, -20.5, 7.0, 2.0, 0.5, PAL.bldg2);
    this.colliders.push(boxFromCenter(-34, 1.0, -20.5, 7.0, 2.0, 0.5));

    const farParts: THREE.Object3D[] = [];
    const glass = this.scene.getObjectByName('Bakery_Glass');
    if (glass) {
      this.scene.attach(glass);
      farParts.push(glass);
    }
    this.registerInterior({
      id: 'BAKERY-INT', x0: -37.8, x1: -30.2, z0: -31.8, z1: -20.2,
      // glass: the two south windows of the Marlow storefront (the shipped
      // sign and the bagel-silhouette window face SOUTH, docs/47 W5)
      glass: [
        { axis: 'z', side: 'min', at: -31.9, a0: -37.15, a1: -34.95 },
        { axis: 'z', side: 'min', at: -31.9, a0: -33.05, a1: -30.85 },
      ],
      group: g,
      nearParts: [
        this.facadePane('Bakery_Clear_W', 'x', -31.9, -37.15, -34.95, 0.55, 2.55, this.roomClearMat),
        this.facadePane('Bakery_Clear_E', 'x', -31.9, -33.05, -30.85, 0.55, 2.55, this.roomClearMat),
      ],
      farParts, duck: [duckUpper],
    });
    for (const p of (this.interiorHandles[this.interiorHandles.length - 1].nearParts)) this.scene.add(p);
  }

  /** RECORD-INT (SMB-02: full-width cavity). Three crate rows, the
   *  listening corner, the counter at the south end. */
  private buildW5Records(): void {
    this.retireMass('SMB_02');
    this.retireCollider(-28, -22, -32, -20);
    this.duckBox('SMB02_Upper', -28, -22, 3.2, 12, -32, -20, PAL.brick);
    const duckUpper = this.scene.children[this.scene.children.length - 1];
    this.roomBox('SMB02_Wall_N', -28, -22, 0, 3.2, -20.2, -20, PAL.brick);
    this.roomBox('SMB02_Wall_W', -28, -27.8, 0, 3.2, -32, -20, PAL.brick);
    this.roomBox('SMB02_Wall_E', -22.2, -22, 0, 3.2, -32, -20, PAL.brick);
    this.wallRun('SMB02_Facade', 'x', -31.9, -27.8, -22.2, 0, 3.2, 0.2, PAL.brick, [
      { from: -27.2, to: -25.9, y0: 0.5, y1: 2.6 },  // window W
      { from: -25.6, to: -24.4, y1: 2.8 },           // the door
      { from: -24.1, to: -22.8, y0: 0.5, y1: 2.6 },  // window E
    ]);

    const g = this.roomKit('RECORDS');
    // Doc 02's hand-written sign — taped inside the door glass, read the
    // day you exit one stop early. It matters at Week 3.
    const signC = document.createElement('canvas');
    signC.width = 256; signC.height = 224;
    const sctx = signC.getContext('2d')!;
    sctx.fillStyle = '#FFF8F0';
    sctx.fillRect(0, 0, 256, 224);
    sctx.strokeStyle = 'rgba(58,52,64,0.35)';
    sctx.lineWidth = 3;
    sctx.strokeRect(10, 10, 236, 204);
    sctx.fillStyle = '#3A3440';
    sctx.textAlign = 'center';
    sctx.font = 'italic 800 44px "Trebuchet MS", sans-serif';
    sctx.fillText(RECORD_SIGN_TOP, 128, 96, 220);
    sctx.font = 'italic 500 26px "Trebuchet MS", sans-serif';
    sctx.fillText(RECORD_SIGN_SUB, 128, 148, 220);
    sctx.strokeStyle = '#3A3440';
    sctx.lineWidth = 4;
    sctx.beginPath(); // the hand-drawn underline, slightly uneven
    sctx.moveTo(52, 168);
    sctx.quadraticCurveTo(128, 176, 204, 166);
    sctx.stroke();
    // two tape strips, hand-hung
    sctx.fillStyle = 'rgba(214,200,166,0.85)';
    sctx.save(); sctx.translate(40, 8); sctx.rotate(-0.5); sctx.fillRect(-14, -10, 28, 30); sctx.restore();
    sctx.save(); sctx.translate(216, 8); sctx.rotate(0.5); sctx.fillRect(-14, -10, 28, 30); sctx.restore();
    const signTex = new THREE.CanvasTexture(signC);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.46, 0.02),
      new THREE.MeshLambertMaterial({ map: signTex }),
    );
    sign.name = 'Records_BackSoonSign';
    sign.position.set(-25, 1.52, -32.05); // taped inside the door glass, street side (south face)
    sign.rotation.set(0, Math.PI, -0.04); // faces the street (-z), hand-hung tilt
    g.add(sign);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.06, 11.6), this.bank.get(0x5b4e66));
    floor.name = 'Records_Floor';
    floor.position.set(-25, 0.13, -26);
    floor.receiveShadow = true;
    g.add(floor);
    // crate rows (3) — the bin body is 0.85 tall (the real gondola bin the
    // spines stand in); the collider keeps the row's 1.1 envelope
    for (const rz of [-23.5, -25.5, -27.5]) {
      this.fixture(g, `Records_Crate_${rz}`, -25, 0.585, rz, 4.4, 0.85, 0.6, 0x8e6f66);
      this.fixture(g, `Records_CrateTop_${rz}`, -25, 1.12, rz, 4.4, 0.06, 0.62, 0x2b2730);
      this.colliders.push(boxFromCenter(-25, 0.55, rz, 4.4, 1.1, 0.6));
    }
    // the listening corner: chair, speaker stacks, the player's spot. The
    // corner rug (ABO slot — flat, no collider) warms the spot
    this.fixture(g, 'Records_Rug', -26.4, 0.17, -30.1, 2.2, 0.02, 1.6, PAL.teal);
    this.fixture(g, 'Records_Chair', -26.4, 0.42, -30.2, 0.7, 0.85, 0.7, 0x2b2730);
    this.fixture(g, 'Records_Spk_W', -27.4, 0.6, -30.9, 0.5, 1.2, 0.5, 0x2b2730);
    this.fixture(g, 'Records_Spk_E', -25.4, 0.6, -30.9, 0.5, 1.2, 0.5, 0x2b2730);
    this.colliders.push(boxFromCenter(-26.4, 0.5, -30.4, 0.9, 1.0, 0.9));
    this.colliders.push(boxFromCenter(-27.4, 0.6, -30.9, 0.5, 1.2, 0.5));
    this.colliders.push(boxFromCenter(-25.4, 0.6, -30.9, 0.5, 1.2, 0.5));
    // the counter
    this.fixture(g, 'Records_Counter', -23.4, 0.55, -30.6, 1.6, 1.1, 0.7, PAL.teal);
    this.colliders.push(boxFromCenter(-23.4, 0.55, -30.6, 1.6, 1.1, 0.7));
    // west-wall LP shelving (sand3d ADD — the browse wall the crates face)
    this.fixture(g, 'Records_WallShelf', -27.6, 1.26, -26.5, 0.4, 2.2, 4.0, PAL.bldg2);
    this.colliders.push(boxFromCenter(-27.6, 1.1, -26.5, 0.4, 2.2, 4.0));

    const farParts: THREE.Object3D[] = [];
    const glass = this.scene.getObjectByName('Records_Glass');
    if (glass) {
      this.scene.attach(glass);
      farParts.push(glass);
    }
    this.registerInterior({
      id: 'RECORD-INT', x0: -27.8, x1: -22.2, z0: -31.8, z1: -20.2,
      // glass: the two south windows of the shipped storefront
      glass: [
        { axis: 'z', side: 'min', at: -31.9, a0: -27.15, a1: -25.95 },
        { axis: 'z', side: 'min', at: -31.9, a0: -24.05, a1: -22.85 },
      ],
      group: g,
      nearParts: [
        this.facadePane('Records_Clear_W', 'x', -31.9, -27.15, -25.95, 0.55, 2.55, this.roomClearMat),
        this.facadePane('Records_Clear_E', 'x', -31.9, -24.05, -22.85, 0.55, 2.55, this.roomClearMat),
      ],
      farParts, duck: [duckUpper],
    });
    for (const p of (this.interiorHandles[this.interiorHandles.length - 1].nearParts)) this.scene.add(p);
  }

  /** HALL-INT (KCM-01: full footprint, x −59.8..−48.2, z 20.2..31.8,
   *  clear 3.8). Main hall + folding chairs, workshop N, kitchenette NE,
   *  the notice wall by the entrance. Both shipped doors become real
   *  gaps (open doorways, the bodega grammar). */
  private buildW5Hall(): void {
    this.retireMass('KCM_01_base');
    this.retireMass('KCM_01_upper');
    this.retireMass('KCM01_Door_Main');
    this.retireMass('KCM01_Door_N');
    this.retireCollider(-60.05, -47.95, 19.95, 32.05);
    this.retireCollider(-60, -48, 20, 32);
    this.duckBox('KCM01_Upper', -60, -48, 3.8, 15, 20, 32, PAL.brick);
    const duckUpper = this.scene.children[this.scene.children.length - 1];
    // ground walls y 0..3.8 (the base's own 12.1 envelope): E/S walls, the
    // N wall with the Gable door, the W wall with door + two tall windows
    this.roomBox('KCM01_Wall_E', -48.2, -47.95, 0, 3.8, 20, 32, PAL.stone);
    this.roomBox('KCM01_Wall_S', -60.05, -48.2, 0, 3.8, 19.95, 20.2, PAL.stone);
    this.wallRun('KCM01_Wall_N', 'x', 31.925, -60.05, -48.2, 0, 3.8, 0.25, PAL.stone,
      [{ from: -54.5, to: -53.5, y1: 2.8 }]);
    this.wallRun('KCM01_Wall_W', 'z', -59.9, 20.2, 31.8, 0, 3.8, 0.3, PAL.stone, [
      { from: 22.0, to: 23.6, y0: 0.9, y1: 2.9 },  // window S
      { from: 25.2, to: 26.8, y1: 2.8 },           // the main door (Juniper)
      { from: 28.4, to: 30.0, y0: 0.9, y1: 2.9 },  // window N
    ]);

    const g = this.roomKit('HALL');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(11.3, 0.06, 11.3), this.bank.get(0xd0c2aa));
    floor.name = 'Hall_Floor';
    floor.position.set(-54.1, 0.13, 26.1);
    floor.receiveShadow = true;
    g.add(floor);
    // warm band on the S wall (faces the entrance)
    const warm = new THREE.Mesh(new THREE.BoxGeometry(10.8, 2.2, 0.06), this.roomWarmMat);
    warm.name = 'Hall_Warm';
    warm.position.set(-54.1, 1.8, 20.42);
    g.add(warm);
    // the notice wall (S, faces the door)
    this.fixture(g, 'Hall_NoticeWall', -55, 1.5, 20.55, 6, 1.9, 0.12, 0x8e6f66);
    for (let i = 0; i < 5; i++) {
      this.fixture(g, `Hall_Note_${i}`, -57.4 + i * 1.2, 1.5 + (i % 2) * 0.25, 20.48, 0.55, 0.7, 0.02, PAL.cream);
    }
    this.colliders.push(boxFromCenter(-55, 1.5, 20.55, 6, 1.9, 0.14));
    // folding-chair stacks around the hall's clear zone (numbered — the
    // interiorAssets drift pin matches the loop stem)
    const hallStacks: ReadonlyArray<readonly [number, number]> =
      [[-58.6, 22.2], [-58.6, 29.6], [-50.6, 22.2], [-50.6, 29.6]];
    for (const [i, [cx, cz]] of hallStacks.entries()) {
      this.fixture(g, `Hall_ChairStack_${i}`, cx, 0.45, cz, 0.55, 0.9, 0.55, PAL.teal);
      this.colliders.push(boxFromCenter(cx, 0.45, cz, 0.6, 0.9, 0.6));
    }
    // workshop (N half): table + shelves
    this.fixture(g, 'Hall_WorkTable', -54, 0.45, 29.5, 2.2, 0.9, 1.0, 0x8e6f66);
    this.fixture(g, 'Hall_WorkVise', -53.4, 0.98, 29.5, 0.3, 0.16, 0.3, 0x2b2730);
    this.colliders.push(boxFromCenter(-54, 0.45, 29.5, 2.2, 0.9, 1.0));
    this.fixture(g, 'Hall_Shelves', -54, 1.0, 31.5, 5, 1.8, 0.4, PAL.bldg2);
    this.colliders.push(boxFromCenter(-54, 1.0, 31.5, 5, 1.8, 0.4));
    // kitchenette (NE corner)
    this.fixture(g, 'Hall_Kitchenette', -49.4, 0.45, 30.6, 2.4, 0.9, 1.6, PAL.teal);
    this.colliders.push(boxFromCenter(-49.4, 0.45, 30.6, 2.4, 0.9, 1.6));
    // ABO furniture slots (docs/57) — the living-room half: sofa + coffee
    // table on the E wall's clear zone, a real bookcase beside the shelves,
    // two real chairs at the work table. Colliders authored here; the GLB
    // swap is visual-only (the rooms never depend on the files).
    this.fixture(g, 'Hall_Sofa', -48.75, 0.44, 26.0, 0.9, 0.88, 1.9, PAL.teal);
    this.colliders.push(boxFromCenter(-48.75, 0.44, 26.0, 0.9, 0.88, 1.9));
    this.fixture(g, 'Hall_CoffeeTable', -50.2, 0.225, 26.0, 1.1, 0.45, 0.6, 0x8e6f66);
    this.colliders.push(boxFromCenter(-50.2, 0.225, 26.0, 1.1, 0.45, 0.6));
    this.fixture(g, 'Hall_Bookcase', -50.9, 0.9, 31.3, 1.0, 1.8, 0.35, PAL.bldg2);
    this.colliders.push(boxFromCenter(-50.9, 0.9, 31.3, 1.0, 1.8, 0.35));
    this.fixture(g, 'Hall_Chair_A', -53.1, 0.44, 28.5, 0.5, 0.88, 0.5, 0x2b2730);
    this.colliders.push(boxFromCenter(-53.1, 0.44, 28.5, 0.5, 0.88, 0.5));
    this.fixture(g, 'Hall_Chair_B', -54.9, 0.44, 28.5, 0.5, 0.88, 0.5, 0x2b2730);
    this.colliders.push(boxFromCenter(-54.9, 0.44, 28.5, 0.5, 0.88, 0.5));
    // the sideboard against the S wall, east of the notice wall
    this.fixture(g, 'Hall_Sideboard', -51.2, 0.51, 20.75, 1.4, 1.02, 0.5, 0x8e6f66);
    this.colliders.push(boxFromCenter(-51.2, 0.51, 20.75, 1.4, 1.02, 0.5));
    // more ABO slots (docs/57 home pass): a floor lamp at the sofa's north
    // shoulder and an ottoman off the coffee table's south face. The lamp
    // carries no collider (a thin pole decor; the sofa owns that corner);
    // the ottoman is solid — a seat-height box you can brush against.
    this.fixture(g, 'Hall_FloorLamp', -48.75, 0.735, 24.75, 0.35, 1.47, 0.35, 0x8e6f66);
    this.fixture(g, 'Hall_Ottoman', -50.2, 0.23, 27.1, 0.7, 0.46, 0.5, PAL.teal);
    this.colliders.push(boxFromCenter(-50.2, 0.23, 27.1, 0.7, 0.46, 0.5));
    // the hall's tall windows: single warm translucent panes, always on —
    // lit from the street, see-through up close (the swap-free pane)
    for (const wz of [22.8, 29.2]) {
      this.scene.add(this.facadePane(`Hall_Glass_${wz}`, 'z', -60.04, wz - 0.8, wz + 0.8, 0.9, 2.9, this.roomGlassMat));
    }
    this.registerInterior({
      id: 'HALL-INT', x0: -59.8, x1: -48.2, z0: 20.2, z1: 31.8,
      // glass: the two west windows (the wallRun cuts above; the panes sit
      // on the face at x −60.04) — the Juniper side is the window side
      glass: [
        { axis: 'x', side: 'min', at: -60.04, a0: 22.0, a1: 23.6 },
        { axis: 'x', side: 'min', at: -60.04, a0: 28.4, a1: 30.0 },
      ],
      group: g, nearParts: [], farParts: [], duck: [duckUpper],
    });
  }

  /** DINER-INT (SND-01: x 50.2..59.8, z −19.8..−8.2, clear 3.6). Counter
   *  bar + 8 stools down the E wall, kitchen line, 4 booths W, register +
   *  pie case S. The band windows become real openings with warm panes. */
  private buildW5Diner(): void {
    this.retireMass('SND_01_band');
    this.retireMass('SND_01_upper');
    this.retireMass('SND01_Chamfer');
    this.retireMass('SND01_BandWin_52.4');
    this.retireMass('SND01_BandWin_57.6');
    this.retireCollider(49.95, 60.05, -20.05, -7.95);
    this.retireCollider(50, 60, -20, -8);
    this.duckBox('SND01_Upper', 50, 60, 3.6, 13, -20, -8, PAL.brick);
    const duckUpper = this.scene.children[this.scene.children.length - 1];
    this.roomBox('SND01_Wall_W', 49.95, 50.2, 0, 3.6, -20, -8, PAL.cream);
    this.roomBox('SND01_Wall_S', 50.2, 59.8, 0, 3.6, -20.05, -19.8, PAL.cream);
    this.wallRun('SND01_Facade_N', 'x', -8.075, 50.2, 59.8, 0, 3.6, 0.25, PAL.cream, [
      { from: 50.7, to: 54.1, y0: 0.95, y1: 2.45 },  // band window W
      { from: 54.3, to: 55.7, y1: 2.8 },             // the Kestrel-walk door
      { from: 55.9, to: 59.3, y0: 0.95, y1: 2.45 },  // band window E
    ]);
    this.wallRun('SND01_Wall_E', 'z', 59.925, -20, -8, 0, 3.6, 0.25, PAL.cream, [
      { from: -18.3, to: -16.5, y0: 0.95, y1: 2.45 },  // avenue window
      { from: -14.7, to: -13.3, y1: 2.8 },             // the Sycamore-walk door
    ]);

    const g = this.roomKit('DINER');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.06, 11.6), this.bank.get(0xdcd4c6));
    floor.name = 'Diner_Floor';
    floor.position.set(55, 0.13, -14);
    floor.receiveShadow = true;
    g.add(floor);
    // counter bar (E wall) + 8 stools. docs/57 re-lay: the W5 build put the
    // cook line BETWEEN the aisle and the bar (x 57.6) with the stools in
    // the 0.15 m slot at 58.35 — buried, first as cylinders and then as the
    // ABO stool models (docs/57's probe caught it). The line now reads
    // aisle → stools → bar → cook line → E wall; same pieces, same
    // colliders' sizes, positions only.
    this.fixture(g, 'Diner_CounterBar', 57.6, 0.55, -14.5, 0.7, 1.1, 8, PAL.teal);
    this.fixture(g, 'Diner_CounterTop', 57.6, 1.12, -14.5, 0.8, 0.06, 8.1, PAL.stone);
    this.colliders.push(boxFromCenter(57.6, 0.55, -14.5, 0.7, 1.1, 8));
    for (let i = 0; i < 8; i++) {
      const sz = -10.9 - i * 1.03;
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 8), this.bank.get(PAL.cream));
      stool.name = `Diner_Stool_${i}`; // ABO furniture slot (docs/57)
      stool.position.set(56.95, 0.28, sz);
      stool.castShadow = true;
      g.add(stool);
    }
    // kitchen line behind the counter (east of the bar, facing it)
    this.fixture(g, 'Diner_Kitchen', 58.9, 0.5, -14.5, 1.6, 1.0, 8, 0x9a938c);
    const griddle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 2.2), this.roomWarmMat);
    griddle.position.set(58.9, 1.04, -13.2);
    g.add(griddle);
    this.colliders.push(boxFromCenter(58.9, 0.5, -14.5, 1.6, 1.0, 8));
    // booths (4, W wall) — the table placeholder is a full-height body
    // (the ABO swap stands on its own feet)
    for (const bz of [-11.5, -14, -16.5, -18.5]) {
      this.fixture(g, `Diner_BoothT_${bz}`, 51.6, 0.36, bz, 0.8, 0.72, 1.1, PAL.cream);
      this.fixture(g, `Diner_BoothB1_${bz}`, 50.95, 0.3, bz, 0.5, 0.6, 1.8, PAL.coral);
      this.fixture(g, `Diner_BoothB2_${bz}`, 52.25, 0.3, bz, 0.5, 0.6, 1.8, PAL.coral);
      this.colliders.push(boxFromCenter(51.6, 0.5, bz, 2.0, 1.0, 1.8));
    }
    // register + pie case (S end)
    this.fixture(g, 'Diner_Register', 57, 0.55, -18.9, 1.8, 1.1, 0.6, PAL.teal);
    const pieGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.45), this.roomClearMat);
    pieGlass.position.set(57, 1.33, -18.9);
    g.add(pieGlass);
    for (const px of [56.7, 57, 57.3]) {
      const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 10), this.bank.get(0xd9a05b));
      pie.position.set(px, 1.2, -18.9);
      g.add(pie);
    }
    this.colliders.push(boxFromCenter(57, 0.55, -18.9, 1.8, 1.1, 0.6));
    // coffee at the bar's south end (sand3d ADD — the diner's bottomless cup)
    this.fixture(g, 'Diner_Coffee', 57.6, 1.36, -18.05, 0.45, 0.42, 0.35, 0x2b2730);

    // warm translucent panes in the three real openings (always visible)
    this.scene.add(this.facadePane('Diner_Glass_NW', 'x', -8.075, 50.75, 54.05, 0.98, 2.42, this.roomGlassMat));
    this.scene.add(this.facadePane('Diner_Glass_NE', 'x', -8.075, 55.95, 59.25, 0.98, 2.42, this.roomGlassMat));
    this.scene.add(this.facadePane('Diner_Glass_E', 'z', 59.925, -18.25, -16.55, 0.98, 2.42, this.roomGlassMat));
    this.registerInterior({
      id: 'DINER-INT', x0: 50.2, x1: 59.8, z0: -19.8, z1: -8.2,
      // glass: the two Kestrel band windows on the north face + the avenue
      // window on the east face (the corner diner — glass on two facades)
      glass: [
        { axis: 'z', side: 'max', at: -8.075, a0: 50.75, a1: 54.05 },
        { axis: 'z', side: 'max', at: -8.075, a0: 55.95, a1: 59.25 },
        { axis: 'x', side: 'max', at: 59.925, a0: -18.25, a1: -16.55 },
      ],
      group: g, nearParts: [], farParts: [], duck: [duckUpper],
    });
  }

  /** CECIL-ROOM (KTS-02: x 10.2..15.8, z −14.1..−9.1, y 8.35, clear 2.9).
   *  The W5 re-lay: the room abuts the top fire-escape landing (the
   *  registry note holds the docs/41 §1 door-law reasoning). Bed by the
   *  window wall — the gold-window sight-line from the pillow. */
  private buildW5CecilRoom(): void {
    this.retireMass('Bldg_S_FireEscape');
    this.retireCollider(0, 26, -20, -8);
    // below the room: solid
    this.roomBox('KTS02_Lower', 0, 26, 0, 8.35, -20, -8, PAL.brick);
    // the room's band (y 8.35..11.25): S slab, W slab, E slab, the N wall
    // with the fire-escape door and the street window
    this.roomBox('KTS02_Band_S', 0, 26, 8.35, 11.25, -20, -14.1, PAL.brick);
    this.roomBox('KTS02_Band_W', 0, 10.2, 8.35, 11.25, -14.1, -8, PAL.brick);
    this.roomBox('KTS02_Band_E', 15.8, 26, 8.35, 11.25, -14.1, -8, PAL.brick);
    this.wallRun('KTS02_Band_N', 'x', -8.55, 0, 26, 8.35, 11.25, 1.1, PAL.brick, [
      { from: 12.55, to: 13.45, y1: 10.55 },          // the fire-escape door
      { from: 14.3, to: 15.5, y0: 9.35, y1: 10.75 },  // the window (the sight-line)
    ]);
    // above the room: the duck piece + the rest of the tower
    this.duckBox('KTS02_Above_Room', 10.2, 15.8, 11.25, 14, -14.1, -9.1, PAL.brick);
    const duckAbove = this.scene.children[this.scene.children.length - 1];
    this.roomBox('KTS02_Above_S', 0, 26, 11.25, 14, -20, -14.1, PAL.brick);
    this.roomBox('KTS02_Above_W', 0, 10.2, 11.25, 14, -14.1, -8, PAL.brick);
    this.roomBox('KTS02_Above_E', 15.8, 26, 11.25, 14, -14.1, -8, PAL.brick);
    this.roomBox('KTS02_Above_N', 10.2, 15.8, 11.25, 14, -9.1, -8, PAL.brick);

    const g = this.roomKit('CECIL');
    // the floor (through the door zone — a 0.2 step up from the landing);
    // the home pass wears warm parquet cream — his place, not a shop
    const floor = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.12, 6.1), this.bank.get(0xe0cfab));
    floor.name = 'Cecil_Floor';
    floor.position.set(13, 8.34, -11.05);
    floor.receiveShadow = true;
    g.add(floor);
    this.colliders.push(boxFromCenter(13, 8.34, -11.05, 5.6, 0.12, 6.1));
    // warm band on the room's S wall (opposite the window — the lamp wall)
    const warm = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.2, 0.06), this.roomWarmMat);
    warm.name = 'Cecil_Warm';
    warm.position.set(13, 9.8, -14.07);
    g.add(warm);
    // the bed (NW, head at the window wall — the sight-line from the pillow)
    this.fixture(g, 'Cecil_BedFrame', 14.6, 8.55, -10.6, 1.4, 0.35, 2.0, 0x6e554e);
    this.fixture(g, 'Cecil_Mattress', 14.6, 8.82, -10.6, 1.3, 0.18, 1.9, PAL.cream);
    this.fixture(g, 'Cecil_Pillow', 14.6, 8.95, -9.75, 0.5, 0.12, 0.35, PAL.cream);
    this.colliders.push(boxFromCenter(14.6, 8.7, -10.6, 1.4, 0.7, 2.0));
    // kitchenette (W wall)
    this.fixture(g, 'Cecil_Kitchenette', 10.5, 8.8, -11.5, 0.6, 0.9, 2.0, PAL.teal);
    this.fixture(g, 'Cecil_Hotplate', 10.5, 9.28, -11.1, 0.4, 0.05, 0.4, 0x2b2730);
    this.fixture(g, 'Cecil_KShelf', 10.5, 10.1, -11.5, 0.5, 0.7, 1.6, 0x8e6f66);
    this.colliders.push(boxFromCenter(10.5, 8.8, -11.5, 0.6, 0.9, 2.0));
    // bath (SE, 1.6×2): two stall walls with a gap
    this.fixture(g, 'Cecil_Bath_W', 14.25, 9.4, -13.1, 0.1, 2.0, 2.0, PAL.stone);
    this.fixture(g, 'Cecil_Bath_S_a', 14.6, 9.4, -12.15, 0.75, 2.0, 0.1, PAL.stone);
    this.fixture(g, 'Cecil_Bath_S_b', 15.45, 9.4, -12.15, 0.65, 2.0, 0.1, PAL.stone);
    this.fixture(g, 'Cecil_Toilet', 15.5, 8.81, -13.6, 0.4, 0.82, 0.6, PAL.cream);
    this.fixture(g, 'Cecil_Sink', 14.55, 8.905, -13.75, 0.45, 1.01, 0.4, PAL.cream);
    // the steam radiator under the street window (sand3d ADD — the heat
    // every New York rental is ruled by)
    this.fixture(g, 'Cecil_Radiator', 14.9, 8.675, -9.35, 0.9, 0.55, 0.18, 0x3a3a40);
    this.colliders.push(boxFromCenter(14.9, 8.675, -9.35, 0.9, 0.55, 0.2));
    this.colliders.push(boxFromCenter(14.25, 9.4, -13.1, 0.12, 2.0, 2.0));
    this.colliders.push(boxFromCenter(15.0, 9.4, -12.15, 1.6, 2.0, 0.12));
    // the roof hatch (reserved, stage-5 Rooftop — registry (12.2, −12.0))
    this.fixture(g, 'Cecil_Hatch', 12.2, 8.43, -12.0, 0.9, 0.06, 0.9, 0x2b2730);
    // the Map's corkboard (by the door)
    this.fixture(g, 'Cecil_Corkboard', 11.2, 9.5, -9.42, 1.1, 0.8, 0.06, 0x8e6f66);
    this.fixture(g, 'Cecil_CorkNote', 11.2, 9.5, -9.38, 0.5, 0.6, 0.02, PAL.cream);
    // ABO furniture slots (docs/57) — the authored placeholders the real
    // models wear at boot (manifest: src/world/furniture.ts). Colliders are
    // authored here; the swap is visual-only, the room never depends on
    // the files.
    this.fixture(g, 'Cecil_Dresser', 10.55, 8.875, -13.2, 0.55, 0.95, 1.1, 0x8e6f66);
    this.colliders.push(boxFromCenter(10.55, 8.875, -13.2, 0.55, 0.95, 1.1));
    this.fixture(g, 'Cecil_Nightstand', 15.55, 8.675, -10.6, 0.4, 0.55, 0.45, 0x8e6f66);
    this.colliders.push(boxFromCenter(15.55, 8.675, -10.6, 0.4, 0.55, 0.45));
    // the lamp rides the dresser's top — its placeholder stands on it
    this.fixture(g, 'Cecil_Lamp', 10.62, 9.46, -13.35, 0.16, 0.22, 0.16, 0x2b2730);
    // the mirror hangs on the S wall above the dresser (ABO slot — no
    // collider: it is wall decor, the dresser below owns the footprint)
    this.fixture(g, 'Cecil_Mirror', 10.55, 9.72, -14.0, 0.55, 0.75, 0.05, 0x8e6f66);
    // rug
    const rug = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.02, 1.4), this.bank.get(PAL.teal));
    rug.name = 'Cecil_Rug';
    rug.position.set(12.6, 8.41, -11.0);
    rug.receiveShadow = true;
    rug.castShadow = true;
    g.add(rug);
    // the window's warm translucent pane (always visible — lit from inside)
    this.scene.add(this.facadePane('Cecil_Glass', 'x', -8.03, 14.32, 15.48, 9.37, 10.73, this.roomGlassMat));
    // ---------------- the home pass (2026-11 — lived-in, not staged) --------
    // Two framed prints over the bed (terracotta + teal, the room's band
    // colors), a monstera by the window (the pot rides the floor, no
    // collider — the window sill corner is out of the walk line), three
    // books leaning on the dresser top, a floor cushion by the bed. The
    // room should read as SOMEONE's, not a showroom's.
    const homeArt = (name: string, x: number, z: number, w: number, h: number, color: number, matte: number): void => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), this.bank.get(0x2b2730));
      frame.name = `${name}_Frame`;
      frame.position.set(x, 10.15, z);
      g.add(frame);
      const print = new THREE.Mesh(new THREE.BoxGeometry(w - 0.09, h - 0.09, 0.045), this.bank.get(matte));
      print.name = name;
      print.position.set(x, 10.15, z);
      g.add(print);
      const accent = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, h - 0.3, 0.052), this.bank.get(color));
      accent.name = `${name}_Accent`;
      accent.position.set(x, 10.15, z);
      g.add(accent);
    };
    homeArt('Cecil_Art_W', 11.35, -13.98, 0.62, 0.8, 0xc27a4a, 0xf3e2c2);
    homeArt('Cecil_Art_E', 12.35, -13.98, 0.52, 0.66, 0x2a9d8f, 0xf3e2c2);
    // the monstera by the window (NE corner, off the walk line)
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.26, 10), this.bank.get(0xb3552f));
    pot.name = 'Cecil_PlantPot';
    pot.position.set(15.2, 8.54, -9.7);
    pot.castShadow = true;
    g.add(pot);
    const leavesGeos = [
      new THREE.SphereGeometry(0.17, 7, 6).translate(0, 0.44, 0),
      new THREE.SphereGeometry(0.13, 7, 6).translate(0.1, 0.58, 0.06),
      new THREE.SphereGeometry(0.11, 7, 6).translate(-0.09, 0.52, -0.05),
    ];
    const plant = new THREE.Mesh(mergeGeometries(leavesGeos, false)!, this.bank.get(0x4a7a4a));
    plant.name = 'Cecil_PlantLeaves';
    plant.position.set(15.2, 8.67, -9.7);
    plant.castShadow = true;
    g.add(plant);
    // three books leaning on the dresser (the dresser top rides 9.35) —
    // one mesh each, three colors, the shelf's tiny pop
    for (const [i, c] of [0xb23a48, 0x2a9d8f, 0xf7b32b].entries()) {
      const h2 = 0.19 + i * 0.02;
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.03, h2, 0.14), this.bank.get(c));
      book.name = `Cecil_DresserBook_${i}`;
      book.position.set(10.4 + i * 0.045, 9.35 + h2 / 2, -13.05);
      book.castShadow = true;
      g.add(book);
    }
    // a floor cushion by the bed (the honest student-nightchair)
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), this.bank.get(0x6a8a5a));
    cushion.name = 'Cecil_FloorCushion';
    cushion.position.set(13.5, 8.48, -13.55);
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    g.add(cushion);
    this.registerInterior({
      id: 'CECIL-ROOM', x0: 10.2, x1: 15.8, z0: -14.1, z1: -9.1,
      yBand: [7.8, 12.0],
      padZ1: 2.7, // the top landing (z −8..−6.6) is outside the shell — the room shows from the rail
      // glass: the street window on the north face (the sight-line — the
      // gold window reads across Kestrel from the bed, docs/47 W5)
      glass: [{ axis: 'z', side: 'max', at: -8.03, a0: 14.32, a1: 15.48 }],
      group: g, nearParts: [], farParts: [], duck: [duckAbove],
    });
  }

  /** THE ROOMS' PALETTE (2026-11 identity pass). One block, eight voices —
   *  the block's shops stop reading as one beige interior with different
   *  props. Skips are the door gaps from the facade wallRuns above; the
   *  wainscot rides 0.55 m so windows (0.5+) never meet the band. */
  private dressW5Rooms(): void {
    // laundromat: cool tile floor, teal wainscot — the dryer band's color
    this.dressRoom('LAUNDRY-INT', { wainscot: 0x2a9d8f, trim: 0xf7b32b, light: 0xfff2d8, clear: 3.2,
      skips: { z0: [[-7.925, -2.075]] } });
    // barbershop: deep teal wainscot with a crimson pole stripe of trim
    this.dressRoom('BARBER-INT', { wainscot: 0x1f6f6a, trim: 0xb23a48, light: 0xfff2d8, clear: 3.4,
      skips: { z0: [[36.1, 37.1]] } });
    // pizza: terracotta — the oven's warmth carries to the walls
    this.dressRoom('PIZZA-INT', { wainscot: 0xb3552f, trim: 0xf3e2c2, light: 0xffe9c4, clear: 3.4,
      skips: { z0: [[26.6, 27.6]] } });
    // bakery: honey and butter — the case's warmth carries to the walls
    this.dressRoom('BAKERY-INT', { wainscot: 0xc98a3d, trim: 0xf8ecd2, light: 0xffe9c4, clear: 3.2,
      skips: { z0: [[-34.6, -33.4]] } });
    // record store: deep plum, amber trim — the bins glow in a dark room
    this.dressRoom('RECORD-INT', { wainscot: 0x3a3044, trim: 0xd99a2b, light: 0xffd98a, clear: 3.2,
      skips: { z0: [[-25.6, -24.4]] } });
    // the hall: sage walls, wood trim — the communal room is the calm one
    this.dressRoom('HALL-INT', { wainscot: 0x8a6b4a, trim: 0xf1e6d0, light: 0xfff2d8, clear: 3.8,
      skips: { x0: [[25.2, 26.8]] } });
    // the diner: cherry band, silver trim — the classic lunch-counter read
    this.dressRoom('DINER-INT', { wainscot: 0xa63c46, trim: 0xc0c4cc, light: 0xfff2d8, clear: 3.6,
      skips: { z1: [[54.3, 55.7]], x1: [[-14.7, -13.3]] } });
    // his room: terracotta band, cream trim — home, not a shop
    this.dressRoom('CECIL-ROOM', { wainscot: 0xc27a4a, trim: 0xf6e8d2, light: 0xffd98a, clear: 2.9 });
  }


  // ================================================================
  // WORLD VISUAL QUALITY PASS (docs/3d-assets) — the environment-artist
  // wave. Every piece is static Lambert, non-transparent, non-mapped
  // (or atlas) → bakeStatics fuses it into its district tile. NOTHING
  // here adds a collider, moves a registry row, or touches the nav
  // graph: decoration rides existing faces, stands on unreachable
  // roofs, or lies flat on the road at ≤ 5 cm proud. All names wear
  // the VQ_ prefix so the bake's skip sets and the probe never collide.
  // ================================================================
  /** The city-fabric placement ledger (the vqLedger pattern): the bake
   *  fuses the in-tile fabric meshes away, so probes read this. */
  readonly fabricLedger: Array<{ name: string; x: number; y: number; z: number }> = [];
  /** The neighborhood fabric's placement ledger (the W6 wave — the probe's
   *  ground truth, same law as fabricLedger). */
  readonly nbhdLedger: Array<{ name: string; x: number; y: number; z: number }> = [];
  /** The city-fabric pass (docs/production/city-fabric — the slop-newyork
   *  adaptation, MIT-attributed in THIRD-PARTY-NOTICES.md): the module owns
   *  the geometry; World owns the seams — the registry shells (the
   *  no-invention law), the shared vc materials, the shipped skyline window
   *  material (the fabric's panes ride the dusk tween with the towers'), and
   *  the pole-sign atlas for the cross-street blades. Called pre-bake so the
   *  in-tile fabric fuses into the district batches; the skyline pair is
   *  NAMED_SKIP. Zero colliders, zero nav changes, deterministic. */
  private buildCityFabricPass(): void {
    buildCityFabric({
      ledger: this.fabricLedger,
      scene: this.scene,
      mat: (c, o) => this.mat(c, o),
      vc: (fog) => this.vcMaterial(fog),
      regShell: (id) => this.regShell(id),
      buildings: loadRegistry().allBuildings(),
      skylineWinMat: this.skylineWinMat,
      poleSign: (text, x, z, ry) => {
        const p = makePoleSign(this.bank, this.signMaterials.bind(this), text, { y: 4.9 });
        p.position.set(x, 0, z);
        p.rotation.y = ry;
        p.name = `Fabric_Blade_${text.replace(/\s+/g, '_')}`;
        this.scene.add(p);
        this.vqLedger.push({ name: p.name, x, y: 0, z });
      },
    });
  }

  /** The neighborhood fabric pass (docs/production/terrace-buildout — the
   *  W6 continuation of the slop-newyork adaptation): fire-escape ironwork
   *  across the facades, the exposed street faces of the pinned backdrop
   *  rows (windows, cornices, lit panes riding the dusk material), and the
   *  missing sidewalk furniture (mailboxes, bike hoops, hydrants, the ConEd
   *  steam stacks, the terrace payphone). All pre-bake so the tiles fuse
   *  it; zero colliders, zero nav changes, deterministic. */
  private buildNeighborhoodFabricPass(): void {
    buildNeighborhoodFabric({
      ledger: this.nbhdLedger,
      scene: this.scene,
      mat: (c, o) => this.mat(c, o),
      vc: (fog) => this.vcMaterial(fog),
      regShell: (id) => this.regShell(id),
      buildings: loadRegistry().allBuildings(),
      skylineWinMat: this.skylineWinMat,
      collider: (x, y, z, w, h, d) => this.colliders.push(boxFromCenter(x, y, z, w, h, d)),
    });
  }

  private buildWorldVisualQualityPass(): void {
    const rng = seededRng(20261110); // the pass's own seed — never re-tunes a shipped row
    /** Add + record: the name and world position land in the ledger before
     *  the bake fuses the mesh away — the probe reads this, not the scene. */
    const vqAdd = (obj: THREE.Object3D, name: string): void => {
      obj.name = name;
      this.vqLedger.push({ name, x: +obj.position.x.toFixed(2), y: +obj.position.y.toFixed(2), z: +obj.position.z.toFixed(2) });
      this.scene.add(obj);
    };

    // ---- 1. CROWN COMPLETION --------------------------------------------
    // GRB/TEN/SRC-01/02/KTN-07/KTN-00W already carry cornices from their
    // own builders; these are every OTHER mass the phases built without
    // one. The stone band caps the roofline — the single strongest read
    // that a mass is a building and not a wall.
    // VDN backdrop rows are NOT crowned: their masses are per-segment
    // heights (some taller than the registry row), so a footprint crown
    // band would slice through them — the varied silhouettes are the look.
    const CROWNS = ['KTN-01', 'KTN-02', 'KTN-03', 'KTN-04', 'KTN-05', 'KTS-01', 'KTS-02', 'KTS-03',
      'KTN-06', 'PWK-01', 'PWK-02', 'PWK-03', 'SMB-01', 'SMB-02', 'SMB-03',
      'KCM-01', 'SND-01'];
    for (const id of CROWNS) {
      const s = this.regShell(id);
      const crown = makeCornice(this.bank, s.w, s.d, s.x, s.h - 0.25, s.z);
      vqAdd(crown, `VQ_Crown_${id}`);
    }

    // ---- 2. PARTY-WALL LIFE — bricked-over windows + downspouts ---------
    // The blank gables the audit caught (shots/world-audit g/m/t): every
    // end or slot wall the streets actually see gets its sealed openings,
    // the corner pipe, and where it earns it, a painted ghost sign.
    const brickover = (id: string, wall: 'w' | 'e' | 'n' | 's', rel: Array<[number, number, number, number]>, wallColor: number): void => {
      const s = this.regShell(id);
      const rotY = wall === 'w' ? -Math.PI / 2 : wall === 'e' ? Math.PI / 2 : wall === 's' ? Math.PI : 0;
      const off = 0.02;
      for (const [a, y, w, h] of rel) {
        const m = wall === 'w' ? makeBrickover(this.bank, wallColor, w, h, s.x - s.w / 2 - off, y, s.z + a, rotY)
          : wall === 'e' ? makeBrickover(this.bank, wallColor, w, h, s.x + s.w / 2 + off, y, s.z + a, rotY)
          : wall === 's' ? makeBrickover(this.bank, wallColor, w, h, s.x + a, y, s.z - s.d / 2 - off, rotY)
          : makeBrickover(this.bank, wallColor, w, h, s.x + a, y, s.z + s.d / 2 + off, rotY);
        vqAdd(m, `VQ_Brickover_${id}_${a}_${y}`);
      }
    };
    // the alley slot's two walls (ALY-01, x 30.7 / 33.5) — seen walking through
    brickover('KTN-04', 'e', [[-3, 5.2, 1.3, 1.9], [1.5, 8.4, 1.3, 1.9], [-2.8, 10.6, 1.1, 1.5]], PAL.bldg);
    brickover('KTN-05', 'w', [[-2.6, 5.6, 1.3, 1.9], [2.2, 9.2, 1.3, 1.9]], PAL.bldg);
    // the garden slot's two walls (ALY-02, x 6.5 / 9)
    brickover('KTN-02', 'e', [[-2.5, 4.8, 1.3, 1.9], [1.8, 9.6, 1.3, 1.9]], PAL.bldg2);
    brickover('KTN-03', 'w', [[-2.8, 5.2, 1.3, 1.9], [2, 9.6, 1.3, 1.9]], PAL.brick);
    // the Cecil's east gable — the court looks straight at it
    brickover('KTS-02', 'e', [[-3.4, 5.2, 1.4, 2.0], [0.6, 8.6, 1.4, 2.0], [-1.2, 11.4, 1.2, 1.6]], PAL.brick);
    // the Juniper/Sycamore corner end walls — the avenue approach walls
    brickover('KTN-00W', 'w', [[-3.4, 5.4, 1.3, 1.9], [-0.4, 8.6, 1.3, 1.9], [2.6, 11.4, 1.2, 1.6]], PAL.bldg2);
    brickover('KTN-06', 'e', [[-3.4, 5.4, 1.3, 1.9], [-0.4, 8.6, 1.3, 1.9], [2.6, 11.4, 1.2, 1.6]], PAL.brick);
    brickover('KTN-05', 'e', [[-3.6, 5.6, 1.3, 1.9], [0.4, 8.8, 1.3, 1.9]], PAL.bldg);
    brickover('TEN-01', 'w', [[-2.6, 5.2, 1.2, 1.8], [-2.6, 9.4, 1.2, 1.8]], PAL.brick);
    brickover('KTS-03', 'e', [[-4.2, 5.4, 1.4, 2.0], [0.6, 8.8, 1.4, 2.0], [4.6, 12.4, 1.2, 1.6]], PAL.bldg);
    // the two big south-row end walls the green and the court face
    brickover('KTS-01', 'w', [[-3.8, 5.6, 1.4, 2.0], [0.4, 9.0, 1.4, 2.0]], PAL.bldg2);
    // the Marlow slot walls (PWK-01 ↔ SMB-01)
    brickover('PWK-01', 'e', [[-2.6, 5.0, 1.2, 1.7], [1, 9.2, 1.2, 1.7]], PAL.bldg);
    brickover('SMB-01', 'w', [[-2.6, 5.0, 1.2, 1.7], [1, 9.2, 1.2, 1.7]], PAL.bldg2);
    // the backdrop rows' avenue-facing walls — the long walls Juniper and
    // Sycamore see all the way up. Sealed openings above the hint bands
    // (y ≤ 11: every segment top in every row clears them).
    brickover('VDN-DW1a', 'e', [[-6, 5.4, 1.5, 2.1], [-2, 8.4, 1.5, 2.1], [5, 6.2, 1.4, 1.9]], PAL.bldg);
    brickover('VDN-DW1b', 'e', [[-4, 5.8, 1.5, 2.1], [2, 8.8, 1.5, 2.1]], PAL.bldg2);
    brickover('VDN-DW1c', 'e', [[-6, 5.2, 1.5, 2.1], [-1, 8.2, 1.5, 2.1], [4.4, 6.4, 1.4, 1.9]], PAL.bldg);
    brickover('VDN-DW1d', 'e', [[-3.6, 5.8, 1.5, 2.1], [2.8, 8.6, 1.5, 2.1]], PAL.bldg2);
    brickover('VDN-DE1a', 'w', [[-6, 5.4, 1.5, 2.1], [-2, 8.4, 1.5, 2.1], [5, 6.2, 1.4, 1.9]], PAL.bldg);
    brickover('VDN-DE1b', 'w', [[-4, 5.8, 1.5, 2.1], [2, 8.8, 1.5, 2.1]], PAL.bldg2);
    brickover('VDN-DE1c', 'w', [[-6, 5.2, 1.5, 2.1], [-1, 8.2, 1.5, 2.1], [4.4, 6.4, 1.4, 1.9]], PAL.bldg);
    brickover('VDN-DE1d', 'w', [[-3.6, 5.8, 1.5, 2.1], [2.8, 8.6, 1.5, 2.1]], PAL.bldg2);
    // downspouts — the corner pipes (wall-face coords, brackets point INTO
    // the wall: east face → +π/2, west → -π/2, south → π, north → 0)
    for (const [dx, dy, dz, ry, dh] of [
      [-49.62, 0, 8.6, -Math.PI / 2, 13.4],  // terminal SW corner (west face)
      [21.02, 0, 8.6, Math.PI / 2, 10.4],    // KTN-03 east face (alley-adjacent corner)
      [-50.02, 0, -8.6, -Math.PI / 2, 15.4], // KTS-01 west end, Kestrel side
      [25.62, 0, -7.62, Math.PI, 13.4],      // the Cecil's SE corner (court view)
      [59.62, 0, -8.6, Math.PI / 2, 12.4],   // the diner's east corner
      [-59.62, 0, 8.6, -Math.PI / 2, 15.4],  // the Corner House west corner
    ] as const) {
      const spout = makeDownspout(this.bank, dh, dx, dy, dz, ry);
      vqAdd(spout, 'VQ_Downspout');
    }

    // ---- 3. GHOST SIGNS — the painted panels commerce left behind --------
    // Atlas faces on painted panels: the panel tone differs from the wall
    // on purpose (a ghost sign is a painted AREA, not a decal), the letter
    // tone is the wall-worn cream. The board is a thin box lying IN the
    // wall plane (x-thin, z-wide) with faces 'x' — the ±x faces measure
    // depth × height, so the width rides depth (makeSignBoard's own law).
    const ghosts: Array<[string, number, number, number, number, number]> = [
      // [text, x, y, z, w(along z), h]
      ['FADE KING\nBARBER SUPPLY', 49.08, 6.4, 14, 4.6, 2.6],
      ['STAR BAKERY CO.', 50.08, 5.8, -14, 4.6, 2.2],
      ['MEADOWBROOK\nDAIRY CO.', -60.08, 6.2, 14, 4.6, 2.8],
      ['CAPITAL COFFEE\n& SPICE', -60.08, 6.8, -14, 4.2, 2.6],
      ['ZIMMERMAN\n& SONS', 60.08, 6.6, -26, 3.8, 2.6],
    ];
    for (const [text, gx, gy, gz, gw, gh] of ghosts) {
      const board = this.signBoard(`VQ_GhostSign_${text.slice(0, 8)}`, text, 0.1, gh, gw, gw * 96, gh * 96, PAL.bldg2, PAL.cream, 44, 'x');
      board.position.set(gx, gy, gz); // no yaw: the 'x' faces already read from both sides
      vqAdd(board, `VQ_GhostSign_${text.slice(0, 8)}`);
    }

    // ---- 4. SILL + LINTEL DRESSING on the proud-window rows -------------
    // GRB row + TEN pair + KTN-00W/06 + the Marlow walk-ups: every window
    // gets its stone sill (under) and lintel (over) — the reveal that stops
    // windows reading as stickers. Formulas mirror the owning builders.
    for (const regId of ['GRB-01', 'GRB-02', 'GRB-03', 'GRB-04', 'GRB-05']) {
      const reg = this.regShell(regId);
      const faceZ = reg.z + reg.d / 2 + 0.14;
      const sootZ = reg.z + reg.d / 2 + 0.09;
      for (const wx of [reg.x - 1.7, reg.x + 1.7]) {
        vqAdd(makeSill(this.bank, 1.3, wx, 4.6 - 1.1 - 0.05, faceZ), 'VQ_Sill');
        vqAdd(makeLintel(this.bank, 1.3, wx, 4.6 + 1.1 + 0.07, faceZ), 'VQ_Lintel');
        vqAdd(makeSoot(this.bank, 1.2, 0.65, wx, 5.7 + 0.32, sootZ), 'VQ_Soot');
        for (const wy of [7.4, 10.2]) {
          vqAdd(makeSill(this.bank, 1.1, wx, wy - 0.8 - 0.05, faceZ), 'VQ_Sill');
          vqAdd(makeLintel(this.bank, 1.1, wx, wy + 0.8 + 0.07, faceZ), 'VQ_Lintel');
          vqAdd(makeSoot(this.bank, 1.1, 0.65, wx, wy + 0.8 + 0.32, sootZ), 'VQ_Soot');
        }
      }
    }
    const ten = this.regShell('TEN-01');
    const tenLotW = (ten.w - 1) / 2;
    for (const x0 of [ten.x - ten.w / 2, ten.x + 0.5]) {
      const cx = x0 + tenLotW / 2;
      for (let f = 0; f < 5; f++) {
        for (const wx of [cx - tenLotW / 4, cx + tenLotW / 4]) {
          const wy = 3.4 + f * 2.6;
          vqAdd(makeSill(this.bank, 1.1, wx, wy - 0.8 - 0.05, ten.z + ten.d / 2 + 0.16), 'VQ_Sill');
          vqAdd(makeLintel(this.bank, 1.1, wx, wy + 0.8 + 0.07, ten.z + ten.d / 2 + 0.16), 'VQ_Lintel');
          vqAdd(makeSoot(this.bank, 1.1, 0.65, wx, wy + 0.8 + 0.32, ten.z + ten.d / 2 + 0.11), 'VQ_Soot');
        }
      }
    }
    for (const regId of ['KTN-00W', 'KTN-06']) {
      const s = this.regShell(regId);
      const faceZ = s.z - s.d / 2 - 0.16;
      for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) {
        const wx = s.x - s.w / 2 + 1.6 + c * 3.4, wy = 7.2 + f * 2.9;
        vqAdd(makeSill(this.bank, 1.2, wx, wy - 0.8 - 0.05, faceZ), 'VQ_Sill');
        vqAdd(makeLintel(this.bank, 1.2, wx, wy + 0.8 + 0.07, faceZ), 'VQ_Lintel');
        vqAdd(makeSoot(this.bank, 1.2, 0.65, wx, wy + 0.8 + 0.32, s.z - s.d / 2 - 0.11), 'VQ_Soot');
      }
    }
    for (const regId of ['PWK-01', 'PWK-02', 'PWK-03']) {
      const s = this.regShell(regId);
      const faceZ = s.z - s.d / 2 + 0.14;
      for (let f = 0; f < 4; f++) for (let c = 0; c < 3; c++) {
        const wx = s.x - s.w / 2 + 1.5 + c * ((s.w - 3) / 2), wy = 3.4 + f * 2.9;
        vqAdd(makeSill(this.bank, 1.1, wx, wy - 0.85 - 0.05, faceZ), 'VQ_Sill');
        vqAdd(makeLintel(this.bank, 1.1, wx, wy + 0.85 + 0.07, faceZ), 'VQ_Lintel');
        vqAdd(makeSoot(this.bank, 1.1, 0.65, wx, wy + 0.85 + 0.32, s.z - s.d / 2 + 0.09), 'VQ_Soot');
      }
    }

    // W8 (2026-11-12): the W6 terrace rows and the W7 gate rows join the
    // sill+lintel law — the honest ledger's variety item. Their window
    // grammar is the shared one (floors = max(2, round(h/3.3)), cols =
    // w>=7?2:1, wy = 3.4 + f*((h-1.2)/floors), skip wy > h-1), mirrored
    // from the owning builders; every shipped window gets its stone sill
    // (under) and lintel (over), seated 0.14 proud of the row's own face
    // (the entrance's `faces` value is the face law).
    const W6W7_ROWS = [
      'GRB-06', 'GRB-07', 'TEN-02', 'KTS-04',
      'GRB-08', 'GRB-09', 'GRB-10', 'GRB-11', 'GRB-12', 'GRB-13', 'GRB-14', 'GRB-15',
      'KTN-08', 'KTN-09', 'KTN-10', 'KTN-11',
      'KTS-05', 'KTS-06', 'KTS-07', 'KTS-08', 'KTS-09', 'KTS-10',
      'TEN-03', 'TEN-04', 'MRW-01', 'MRW-02', 'MRW-03', 'MRW-04',
    ] as const;
    for (const regId of W6W7_ROWS) {
      const reg = this.regShell(regId);
      const row = loadRegistry().building(regId);
      const ent = row?.entrance?.[0];
      const faceSign = ent?.faces === 'N' ? 1 : -1;
      const wallZ = ent?.faces === 'N' ? reg.z + reg.d / 2 : reg.z - reg.d / 2;
      const faceZ = wallZ + faceSign * 0.14;
      const sootZ = wallZ + faceSign * 0.09;
      const floors = Math.max(2, Math.round(reg.h / 3.3));
      const cols = reg.w >= 7 ? 2 : 1;
      const pitch = (reg.h - 1.2) / floors;
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          const wx = reg.x - reg.w / 2 + (reg.w / (cols + 1)) * (c + 1);
          const wy = 3.4 + f * pitch;
          if (wy > reg.h - 1.0) continue;
          vqAdd(makeSill(this.bank, 1.15, wx, wy - 0.8 - 0.05, faceZ), 'VQ_Sill');
          vqAdd(makeLintel(this.bank, 1.15, wx, wy + 0.8 + 0.07, faceZ), 'VQ_Lintel');
          vqAdd(makeSoot(this.bank, 1.15, 0.65, wx, wy + 0.8 + 0.32, sootZ), 'VQ_Soot');
        }
      }
      // the cornice grime line — the soot shelf the rain never washes
      if (reg.h >= 5) {
        vqAdd(makeSoot(this.bank, reg.w - 0.6, 0.22, reg.x, reg.h - 0.7, sootZ), 'VQ_Soot_CorniceLine');
      }
    }

    // ---- 4b. W13 (2026-11-13): BAND COURSES — the string-course ledges --
    // The honest ledger's last approximation closes: the source's facade
    // shaders draw band courses per facade; ours now carry the real proud
    // ledge at every mid-floor line on every facade W8 dressed with sills
    // (a band between each pair of window rows — never crossing a window:
    // the mid-floor line clears the lintel zone by ≥ 0.2 m at the grammar's
    // own pitch). Same seat law as the sills (wall plane + 0.14, the box's
    // 0.09 depth the projection), PAL.stone — the cornice anchor. The GRB
    // parlor's own mid-floor line (6.0) doubles as the classic base string.
    const bandSeat = (z: number, sign: number): number => z + sign * 0.14;
    for (const regId of ['GRB-01', 'GRB-02', 'GRB-03', 'GRB-04', 'GRB-05']) {
      const reg = this.regShell(regId);
      for (const by of [6.0, 8.8]) {
        vqAdd(makeBandCourse(this.bank, reg.w - 1.0, reg.x, by, bandSeat(reg.z + reg.d / 2, 1)), 'VQ_BandCourse');
      }
    }
    for (const x0 of [ten.x - ten.w / 2, ten.x + 0.5]) {
      const cx = x0 + tenLotW / 2;
      for (let f = 0; f < 4; f++) {
        vqAdd(makeBandCourse(this.bank, tenLotW - 0.4, cx, 3.4 + 1.3 + f * 2.6, bandSeat(ten.z + ten.d / 2, 1)), 'VQ_BandCourse');
      }
    }
    for (const regId of ['KTN-00W', 'KTN-06']) {
      const s = this.regShell(regId);
      for (const by of [8.65, 11.55]) {
        vqAdd(makeBandCourse(this.bank, s.w - 1.0, s.x, by, bandSeat(s.z - s.d / 2, -1)), 'VQ_BandCourse');
      }
    }
    for (const regId of ['PWK-01', 'PWK-02', 'PWK-03']) {
      const s = this.regShell(regId);
      for (let f = 0; f < 3; f++) {
        vqAdd(makeBandCourse(this.bank, s.w - 1.0, s.x, 3.4 + 1.45 + f * 2.9, bandSeat(s.z - s.d / 2, -1)), 'VQ_BandCourse');
      }
    }
    for (const regId of W6W7_ROWS) {
      const reg = this.regShell(regId);
      const row = loadRegistry().building(regId);
      const ent = row?.entrance?.[0];
      const faceSign = ent?.faces === 'N' ? 1 : -1;
      const wallZ = ent?.faces === 'N' ? reg.z + reg.d / 2 : reg.z - reg.d / 2;
      const floors = Math.max(2, Math.round(reg.h / 3.3));
      const pitch = (reg.h - 1.2) / floors;
      for (let f = 0; f < floors - 1; f++) {
        vqAdd(makeBandCourse(this.bank, reg.w - 1.0, reg.x, 3.4 + (f + 0.5) * pitch, bandSeat(wallZ, faceSign)), 'VQ_BandCourse');
      }
    }

    // ---- 5. WINDOW AC UNITS — the summer-now tell ------------------------
    // Hung under verified sills (window bottom − 0.26): GRB upper floors,
    // the TEN pair's avenue face, the corner houses, the walk-ups. The
    // unit is props.makeACUnit (the shipped builder — shared geometry).
    let acIdx = 0;
    const ac = (x: number, y: number, z: number): void => {
      const unit = makeACUnit(this.bank);
      unit.position.set(x, y, z);
      vqAdd(unit, `VQ_AC_${acIdx++}`);
    };
    for (const regId of ['GRB-01', 'GRB-02', 'GRB-03', 'GRB-04', 'GRB-05']) {
      const reg = this.regShell(regId);
      const faceZ = reg.z + reg.d / 2 + 0.26;
      const side = ((acIdx % 2) === 0) ? -1.7 : 1.7;
      ac(reg.x + side, 7.4 - 0.8 - 0.26, faceZ);
      ac(reg.x - side, 10.2 - 0.8 - 0.26, faceZ);
    }
    for (const x0 of [ten.x - ten.w / 2, ten.x + 0.5]) {
      const cx = x0 + tenLotW / 2;
      for (let f = 0; f < 3; f++) ac(cx + (f % 2 === 0 ? -tenLotW / 4 : tenLotW / 4), 3.4 + f * 2.6 - 0.8 - 0.26, ten.z + ten.d / 2 + 0.28);
    }
    for (const regId of ['KTN-00W', 'KTN-06']) {
      const s = this.regShell(regId);
      ac(s.x + 3.4, 7.2 + 2.9 - 0.8 - 0.26, s.z - s.d / 2 - 0.28);
      ac(s.x - 3.4, 7.2 + 5.8 - 0.8 - 0.26, s.z - s.d / 2 - 0.28);
    }
    for (const regId of ['PWK-01', 'PWK-02', 'PWK-03']) {
      const s = this.regShell(regId);
      ac(s.x + (s.w - 3) / 2, 3.4 + 2.9 - 0.85 - 0.26, s.z - s.d / 2 + 0.28);
      ac(s.x - (s.w - 3) / 2, 3.4 + 5.8 - 0.85 - 0.26, s.z - s.d / 2 + 0.28);
    }

    // ---- 6. ROOF CLUTTER — the hats' hats --------------------------------
    // Bulkhead + vents + antenna on roofs the player can never stand on
    // (the bodega roof keeps its billboard, the Cecil's climb keeps its
    // top clean, the terminal carries its water tower).
    const roofClutter: Array<[string, number, number, number]> = [
      // [registry id, tone, ox toward the rear, oz toward the rear]
      ['KTN-02', PAL.bldg2, 0, 2.6], ['KTN-03', PAL.brick, 0, 2.6],
      ['KTN-04', PAL.bldg, 0, 2.6], ['KTN-05', PAL.bldg, 0, 2.6],
      ['KTS-01', PAL.bldg2, 0, -2.6], ['KTS-03', PAL.bldg, 0, -2.6],
      ['KTN-06', PAL.brick, 0, 2.6],
      ['PWK-01', PAL.bldg, 0, -2.4], ['PWK-02', PAL.bldg2, 0, -2.4], ['PWK-03', PAL.bldg, 0, -2.4],
      ['SMB-01', PAL.bldg2, 0, -2.4], ['SMB-02', PAL.brick, 0, -2.4], ['SMB-03', PAL.bldg, 0, -2.4],
      ['KCM-01', PAL.brick, 0, -2.6], ['KTN-07', PAL.bldg2, 0, -2.6],
      ['SND-01', PAL.stone, 0, -2.6],
      ['TEN-01', PAL.brick, -1.6, -2.6], ['SRC-01', PAL.brick, 0, -2.6], ['SRC-02', PAL.brick, 0, -2.6],
    ];
    for (const [id, tone, ox, oz] of roofClutter) {
      const s = this.regShell(id);
      const cl = makeRoofClutter(this.bank, tone, rng);
      cl.position.set(s.x + ox, s.h, s.z + oz);
      vqAdd(cl, `VQ_RoofClutter_${id}`);
    }

    // ---- 7. STREET FLOOR — manholes, drains, patches, stop lines ---------
    for (const [mx, mz] of [[-32, 1.5], [-44, -1.5], [18, -1.2], [30, 1.8], [52, -1.5],
      [-72, 12], [-72, -14], [72, 10], [72, -18], [-20, 40], [24, 40], [-40, -42], [10, -38]] as const) {
      vqAdd(makeManhole(this.bank, mx, mz), 'VQ_Manhole');
    }
    for (const [dx, dz, ry] of [[-44, 3.82, 0], [28, -3.82, 0], [58, 3.82, 0], [-62, -3.82, 0],
      [-68.2, 10, Math.PI / 2], [-75.8, -16, Math.PI / 2], [68.2, 14, Math.PI / 2], [75.8, -22, Math.PI / 2]] as const) {
      vqAdd(makeStormDrain(this.bank, dx, dz, ry), 'VQ_StormDrain');
    }
    for (const [px, pz, w, d] of [[-24, 2.2, 3, 1.6], [12, -2, 2.6, 1.4], [44, 1.5, 3.2, 1.8],
      [-72, 24, 2.4, 3.2], [72, -12, 2.4, 3], [-40, 40, 3, 1.6]] as const) {
      vqAdd(makePatch(this.bank, w, d, px, pz, WEAR.patchDark), 'VQ_Patch');
    }
    for (const [sx, sz, w, d] of [[-33, -1.8, 1.2, 0.9], [20, 1.2, 1, 0.8], [70, 8, 1.4, 1], [-18, -41.8, 1.2, 0.9]] as const) {
      vqAdd(makePatch(this.bank, w, d, sx, sz, WEAR.stain), 'VQ_Stain');
    }
    // stop lines: the entering lane's bar at each avenue↔street junction
    // (right-hand traffic: NB lane east of the center line, SB west; the
    // bar sits 1.3 m before the junction's crosswalk)
    for (const ax of [-72, 72]) {
      const nb = ax + 2, sb = ax - 2;
      vqAdd(makeStopLine(this.bank, nb, -5.8, false, 4.4), 'VQ_StopLine');   // NB → Kestrel
      vqAdd(makeStopLine(this.bank, sb, 5.8, false, 4.4), 'VQ_StopLine');    // SB → Kestrel
      vqAdd(makeStopLine(this.bank, nb, 34.6, false, 4.4), 'VQ_StopLine');   // NB → Gable
      vqAdd(makeStopLine(this.bank, sb, 45.8, false, 4.4), 'VQ_StopLine');
      vqAdd(makeStopLine(this.bank, nb, -45.8, false, 4.4), 'VQ_StopLine');  // NB → Marlow
      vqAdd(makeStopLine(this.bank, sb, -34.6, false, 4.4), 'VQ_StopLine');
    }

    // ---- 8. GROUND LIFE — pit grass + curb leaf piles --------------------
    for (const pit of this.treePits) {
      const tufts = makeGrassTufts(this.bank, rng);
      tufts.position.set(pit.x, 0.08, pit.z);
      vqAdd(tufts, `VQ_GrassTufts_${pit.x}_${pit.z}`);
    }
    for (const [lx, lz, gold, r] of [[-38, 4.6, true, 0.42], [-6, -4.6, false, 0.36], [24, 4.6, true, 0.5],
      [52, -4.6, true, 0.4], [-72, 8.2, false, 0.44], [72, -8.2, true, 0.4], [-20, 36.4, true, 0.46],
      [34, 43.6, true, 0.38], [-44, -36.4, true, 0.42], [14, -43.6, false, 0.36]] as const) {
      const pile = makeLeafPile(this.bank, gold, r, lx, 0.05, lz);
      vqAdd(pile, 'VQ_LeafPile');
      this.leafPiles.push(pile); // W16: the season applier shows/hides these
    }

    // ---- 9. DOOR LAMPS — the goosenecks over five doors ------------------
    const lampWarm = this.bank.get(PAL.amber).clone();
    lampWarm.emissive = new THREE.Color(PAL.amber);
    lampWarm.emissiveIntensity = 0.5;
    for (const [lx, ly, lz, ry] of [
      [-34, 3.42, -32.06, Math.PI], [-25, 3.42, -32.06, Math.PI], [-17, 3.42, -32.06, Math.PI],
      [55, 3.35, 7.86, 0], [-30, 3.05, 7.9, 0],
    ] as const) {
      const lamp = makeGooseneck(this.bank, lx, ly, lz, ry, lampWarm);
      vqAdd(lamp, 'VQ_Gooseneck');
    }
  }

  // ================================================================
  // ALDER HEIGHTS — SI: the borough-character pass (2026-11-11)
  // The slop-newyork port (docs/slop-integration/): the three Mallow-row
  // buildings the registry gained, the ported roofline systems, the
  // multi-landing fire escapes, and the street life. Everything static is
  // built PRE-BAKE (the district tiles fuse it); the five colliders it
  // adds are street furniture seated off the walk lanes exactly like the
  // shipped bulletin board / planter set; zero nav-footprint changes.
  // Variation is seeded (seededRng(20261111)) — the same city every run.
  // ================================================================

  /** SI evidence line — the probe pins these by name + position. */
  private siAdd(obj: THREE.Object3D, name: string): void {
    obj.name = name;
    this.vqLedger.push({ name, x: +obj.position.x.toFixed(2), y: +obj.position.y.toFixed(2), z: +obj.position.z.toFixed(2) });
    this.scene.add(obj);
  }

  /** SI, section A — THE MALLOW ROW: LMS-01 (the pre-war limestone court),
   *  IND-01 (the old works), GLS-01 (the glass infill). The masses, heights
   *  and door seats READ the registry rows (DEC-4 law); the styles are the
   *  ported facade grammars: limestone base/ashlar upper + band course +
   *  high stoop (the source's pre-war preset), brick shell + freight dock
   *  + small industrials (the loft grammar), and the curtain grid over a
   *  stone base (the source's curtain-wall preset, flattened to Lambert). */
  private buildMallowRow(): void {
    // ---- LMS-01 the Mallow Court (29, −26, 14×12, h 20) -----------------
    const lms = this.regShell('LMS-01');
    const LMS_BASE_H = 3.4;
    this.solid('LMS_01_base', lms.x, LMS_BASE_H / 2, lms.z, lms.w + 0.12, LMS_BASE_H, lms.d + 0.12, PAL.stone);
    this.solid('LMS_01_upper', lms.x, LMS_BASE_H + (lms.h - LMS_BASE_H) / 2, lms.z, lms.w, lms.h - LMS_BASE_H, lms.d, 0xd9c3a5);
    this.deco(`LMS_01_Cornice`, lms.x, lms.h - 0.25, lms.z, lms.w + 0.2, 0.5, lms.d + 0.2, PAL.stone, {});
    // base openings (the lobby's flanking windows)
    for (const wx of [lms.x - 4.6, lms.x + 4.6]) {
      this.decoMesh(`LMS01_BaseWin_${wx}`, new THREE.BoxGeometry(1.0, 1.5, 0.08), this.bank.get(PAL.windowDim), wx, 1.9, lms.z - lms.d / 2 - 0.08);
    }
    // parlor (tall, y 4.6) + four upper rows on a 2.9 pitch
    for (const wx of [lms.x - 4.2, lms.x, lms.x + 4.2]) {
      this.decoMesh(`LMS01_Parlor_${wx}`, new THREE.BoxGeometry(1.3, 2.2, 0.08), this.bank.get(PAL.windowDim), wx, 4.6, lms.z - lms.d / 2 + 0.06);
      for (let f = 0; f < 4; f++) {
        const wy = 7.4 + f * 2.9;
        if (wy > lms.h - 1.4) continue;
        this.decoMesh(`LMS01_Win_${wx}_${wy}`, new THREE.BoxGeometry(1.1, 1.7, 0.08), this.bank.get(PAL.windowDim), wx, wy, lms.z - lms.d / 2 + 0.06);
      }
    }
    // the court's yard face gets its own window rows (north)
    for (const wx of [lms.x - 4.2, lms.x + 4.2]) {
      for (let f = 0; f < 4; f++) {
        const wy = 4.6 + f * 2.9;
        if (wy > lms.h - 1.4) continue;
        this.decoMesh(`LMS01_WinN_${wx}_${wy}`, new THREE.BoxGeometry(1.1, 1.7, 0.08), this.bank.get(PAL.windowDim), wx, wy, lms.z + lms.d / 2 + 0.06);
      }
    }
    // the lobby: high stoop + door (the GRB stoop grammar, plum door)
    const lmsStoop = makeBrownstoneStoop(this.bank, PAL.plum, true);
    lmsStoop.position.set(lms.x, 0, lms.z - lms.d / 2 - 0.6);
    lmsStoop.rotation.y = Math.PI;
    this.scene.add(lmsStoop);
    this.deco('LMS01_Door_Light', lms.x, 2.6, lms.z - lms.d / 2 - 0.1, 1.1, 0.5, 0.3, PAL.stone, {});
    // both flanks are true party walls (PWK-03 at x 22, IND-01 at x 34) —
    // nothing shows on them, exactly like the shipped rowhouse lots

    // ---- IND-01 the Mallow Works (37, −26, 6×12, h 12) ------------------
    const ind = this.regShell('IND-01');
    this.solid('IND_01', ind.x, ind.h / 2, ind.z, ind.w, ind.h, ind.d, PAL.brick);
    this.deco(`IND_01_Cornice`, ind.x, ind.h - 0.25, ind.z, ind.w + 0.2, 0.5, ind.d + 0.2, PAL.stone, {});
    // the freight dock: steppable platform (0.3 ≤ the walker's 0.35 step)
    this.solid('IND01_Dock', ind.x, 0.15, ind.z - ind.d / 2 - 0.7, ind.w - 1.4, 0.3, 1.4, 0x9a938c);
    // the freight door + its lintel (the loading-face grammar) + the side door
    this.decoMesh('IND01_Freight', new THREE.BoxGeometry(2.8, 3.2, 0.1), this.bank.get(0x6e554e), ind.x, 1.9, ind.z - ind.d / 2 - 0.06);
    const lintel = makeLintel(this.bank, 3.0, ind.x, 3.62, ind.z - ind.d / 2 - 0.1);
    this.siAdd(lintel, 'SI_Lintel_IND01_Freight');
    this.decoMesh('IND01_SideDoor', new THREE.BoxGeometry(1.0, 2.4, 0.1), this.bank.get(0x6e554e), ind.x + ind.w / 2 - 0.85, 1.5, ind.z - ind.d / 2 - 0.06);
    // small industrial windows on the walk face + the yard face
    for (let f = 0; f < 3; f++) {
      const wy = 4.5 + f * 2.9;
      if (wy > ind.h - 1.4) continue;
      for (const wx of [ind.x - 1.6, ind.x + 1.6]) {
        this.decoMesh(`IND01_Win_${wx}_${wy}`, new THREE.BoxGeometry(1.0, 1.2, 0.08), this.bank.get(PAL.windowDim), wx, wy, ind.z - ind.d / 2 + 0.06);
        this.decoMesh(`IND01_WinN_${wx}_${wy}`, new THREE.BoxGeometry(1.0, 1.2, 0.08), this.bank.get(PAL.windowDim), wx, wy, ind.z + ind.d / 2 + 0.06);
      }
    }

    // ---- GLS-01 the Glass Infill (53.5, −26, 12×12, h 16) ---------------
    const gls = this.regShell('GLS-01');
    const GLS_BASE_H = 3.0;
    this.solid('GLS_01_base', gls.x, GLS_BASE_H / 2, gls.z, gls.w + 0.12, GLS_BASE_H, gls.d + 0.12, PAL.stone);
    this.solid('GLS_01_tower', gls.x, GLS_BASE_H + (gls.h - GLS_BASE_H) / 2, gls.z, gls.w, gls.h - GLS_BASE_H, gls.d, NYC.awnInk);
    // the curtain grid: vertical mullions + floor slab bands (the ported
    // curtain-wall read, told in proud geometry so the bake takes it).
    // The grid starts ABOVE the storefront head (3.36) — no coplanar fight.
    const mullBase = 3.36;
    for (let mx = -gls.w / 2 + 1.5; mx < gls.w / 2 - 0.4; mx += 1.5) {
      this.decoMesh(`GLS01_Mull_${mx.toFixed(1)}`, new THREE.BoxGeometry(0.09, gls.h - mullBase - 0.4, 0.07), this.bank.get(0x8a8378), gls.x + mx, mullBase + (gls.h - mullBase - 0.4) / 2, gls.z - gls.d / 2 - 0.05);
    }
    for (let f = 1; f <= 4; f++) {
      const fy = GLS_BASE_H + f * 2.6;
      if (fy > gls.h - 0.3) continue;
      this.decoMesh(`GLS01_Slab_${f}`, new THREE.BoxGeometry(gls.w, 0.14, 0.08), this.bank.get(0x8a8378), gls.x, fy, gls.z - gls.d / 2 - 0.05);
    }
    // the modern parapet cap (ink, not stone — the mass reads new)
    this.deco('GLS01_Cap', gls.x, gls.h - 0.18, gls.z, gls.w + 0.16, 0.36, gls.d + 0.16, PAL.ink, {});
  }

  /** SI, section B — the roofline systems this pass owns: rooftop chillers
   *  and the band-course cornices. THE UNION RULING (2026-11-11): the
   *  city-fabric pass (main's own slop-newyork roofscape, seeded per-row)
   *  already owns water tanks, chimney stacks, roof bulkheads and antennae
   *  over every registry roof INCLUDING the Mallow row — so this pass
   *  retired its own tank/chimney/bulkhead rows rather than double-place
   *  them (docs/slop-integration/01 §2 records the retirement). What the
   *  fabric lacks and this pass keeps: the chillers (the fabric has none)
   *  and the band-course ledges (the fabric has none). */
  private dressRooflines(): void {
    const rng = seededRng(20261111);
    // ---- rooftop chillers (the source's 35% rule; LMS/IND/GLS always) ---
    // the fabric never placed a chiller — this is the one roof system that
    // stays ours; seats are jitters within the roof, clear of the fabric's
    // own center-biased items by the roofs' spare depth
    const hvacRoofs: Array<[string, string]> = [
      ['KTN-03', 'bldg'], ['KTN-04', 'bldg2'], ['KTS-02', 'brick'], ['SMB-02', 'brick'],
      ['PWK-01', 'bldg'], ['KCM-01', 'brick'], ['KTN-07', 'bldg2'], ['IND-01', 'brick'],
      ['GLS-01', 'ink'], ['LMS-01', 'tan'],
    ];
    for (const [id, tone] of hvacRoofs) {
      if (rng() > 0.62) continue;
      const s = this.regShell(id);
      const w = 2.6 + rng() * 1.8;
      const d = 2.2 + rng() * 1.6;
      const h = tone === 'ink' ? 3.0 : 2.4;
      const ox = (rng() - 0.5) * (s.w - w - 1.6);
      const oz = (rng() - 0.5) * (s.d - d - 1.6);
      const unit = makeHVACUnitNYC(this.bank, w, d, h, rng);
      unit.position.set(s.x + ox, s.h, s.z + oz);
      this.siAdd(unit, `SI_HVAC_${id}`);
    }
    // GLS-01's roof line: a second chiller in a row (the modern roof)
    {
      const s = this.regShell('GLS-01');
      const unit = makeHVACUnitNYC(this.bank, 2.4, 2.2, 2.6, rng);
      unit.position.set(s.x + 3.2, s.h, s.z + 2.4);
      this.siAdd(unit, 'SI_HVAC_GLS-01_B');
    }
    // ---- band-course cornices (the source's mid-band ledges) -------------
    const bands: Array<[string, number]> = [
      ['LMS-01', 13.2], ['KTN-02', 11.2], ['KTS-03', 11.2], ['KTN-05', 9.6],
    ];
    for (const [id, y] of bands) {
      const s = this.regShell(id);
      const bandS = makeCorniceBand(this.bank, s.w + 0.3, y, s.x, s.z - s.d / 2 - 0.12, Math.PI);
      this.siAdd(bandS, `SI_CorniceBand_${id}_S`);
      if (id === 'LMS-01') {
        const bandN = makeCorniceBand(this.bank, s.w + 0.3, y, s.x, s.z + s.d / 2 + 0.12, 0);
        this.siAdd(bandN, `SI_CorniceBand_${id}_N`);
      }
    }
  }

  /** SI, section C — the multi-landing FIRE ESCAPES (the source's escape
   *  template). Silhouette-only deco (the climbable escape stays the Cecil's
   *  — the shipped law); each stack takes a yard or flank face so no door,
   *  stoop or storefront is touched: KTS-03 + LMS-01 + IND-01 on their yard
   *  faces, SRC-01 on its Sycamore flank, PWK-02 in the Marlow yard. */
  private dressFireEscapes(): void {
    const escapes: Array<[string, number, 'n' | 's' | 'e', number]> = [
      ['KTS-03', 44.5, 's', 18],
      ['LMS-01', 28, 'n', 20],
      ['IND-01', 37, 'n', 12],
      ['SRC-01', -26, 'e', 17],
      ['PWK-02', 5, 'n', 15],
    ];
    for (const [id, at, face, h] of escapes) {
      const s = this.regShell(id);
      const landings: number[] = [];
      for (let ly = 3.3; ly < h - 1.6; ly += 2.9) landings.push(+ly.toFixed(2));
      const esc = makeFireEscapeStack(this.bank, landings, 3.6, h);
      if (face === 'n') esc.position.set(at, 0, s.z + s.d / 2 + 0.03);
      else if (face === 's') esc.position.set(at, 0, s.z - s.d / 2 - 0.03);
      else esc.position.set(s.x + s.w / 2 + 0.03, 0, at);
      esc.rotation.y = face === 'n' ? 0 : face === 's' ? Math.PI : Math.PI / 2;
      this.siAdd(esc, `SI_FireEscape_${id}`);
    }
  }

  /** SI, section D — storefront + ground-floor dressing: the gallery's
   *  front (the shipped storefront grammar, plum canvas), the court's lobby
   *  awning, and the construction shed the registry's own exterior line
   *  promises in the GLS-01 yard. The shed's deck joins the camera's
   *  canopy-sphere set (the same sidestep law the tree crowns ride). */
  private dressStorefrontRow(): void {
    const gls = this.regShell('GLS-01');
    const shop = makeStorefront(this.bank, this.signMaterials.bind(this), 'MERIDIAN GALLERY', NYC.awnPlum, 5);
    shop.position.set(gls.x, 0.05, gls.z - gls.d / 2 - 0.02);
    shop.rotation.y = Math.PI;
    this.scene.add(shop);
    const lms = this.regShell('LMS-01');
    const lobbyAwn = makeAwningNYC(this.bank, 1, 2.6, lms.x, 3.95, lms.z - lms.d / 2 - 0.1, Math.PI);
    this.siAdd(lobbyAwn, 'SI_Awning_LMS01_Lobby');
    // the yard shed (deco only — the deck is overhead; legs hug the wall)
    const shed = makeScaffoldShedNYC(this.bank, 4.2, 2.2, 45.5, -18.4, Math.PI / 2);
    this.siAdd(shed, 'SI_Shed_GLS01');
    this.canopySpheresCache.push({ x: 45.5, y: 3.45, z: -18.4, r: 2.4 });
  }

  /** SI, section E — street life: the USPS relay box at the bodega corner,
   *  the ConEd steam vent against the laundry's wall, the DOT street-name
   *  blades on the shipped signal mast and a second mast at the Juniper
   *  corner, and the globe lamps flanking the station headhouse. Colliders
   *  exactly where the shipped street furniture's sit (wall-side, off the
   *  walk lanes). */
  private dressStreetLife(): void {
    const mailbox = makeMailboxNYC(this.bank, -12.3, 0.05, 7.55, Math.PI);
    this.siAdd(mailbox, 'SI_Mailbox_Kestrel');
    this.colliders.push(boxFromCenter(-12.3, 0.65, 7.55, 0.65, 1.3, 0.6));
    const vent = makeSteamVentNYC(this.bank, -2.0, 7.55);
    this.siAdd(vent, 'SI_SteamVent_Kestrel');
    this.colliders.push(boxFromCenter(-2.0, 0.62, 7.55, 0.6, 1.3, 0.6));
    // the Kestrel blade on the shipped signal mast (bolted beside the arm;
    // the fabric pass owns the cross-street blades at the four corners —
    // its JUNIPER AVE blade already reads that corner, so this pass adds
    // only the Kestrel one and the mast itself)
    const blade = makePoleSign(this.bank, this.signMaterials.bind(this), 'KESTREL ST',
      { w: 1.5, h: 0.38, y: 3.55, bg: NYC.shedGreen, fg: PAL.cream, facing: 'street' });
    blade.position.set(-1.45, 0.05, -7.55);
    this.siAdd(blade, 'SI_Blade_Kestrel');
    // the second mast: the Juniper corner reads as an intersection now
    const signal = makeTrafficSignal(this.bank, {
      greenLamp: this.nightGlow(PAL.teal, 0.55, 2.2),
    });
    signal.position.set(-65.3, 0.05, -7.55);
    signal.rotation.y = -Math.PI / 2; // the arm reaches over Juniper's road
    this.scene.add(signal);
    this.colliders.push(boxFromCenter(-65.3, 2.75, -7.55, 0.3, 5.5, 0.3));
    // the globes flank the station headhouse (both stair corners). W8:
    // they ride the slot's shrink — z 4.2 stood IN the new curb-side
    // corridor (the walk-ability probe's own forensics); z 5.85 puts the
    // pair beside the entrance rim again, clear of the corridor.
    const globeW = makeSubwayGlobePost(this.bank, -48.75, 5.85);
    this.siAdd(globeW, 'SI_Globe_SUB01_W');
    this.colliders.push(boxFromCenter(-48.75, 0.95, 5.85, 0.28, 1.9, 0.28));
    const globeE = makeSubwayGlobePost(this.bank, -45.65, 5.85);
    this.siAdd(globeE, 'SI_Globe_SUB01_E');
    this.colliders.push(boxFromCenter(-45.65, 0.95, 5.85, 0.28, 1.9, 0.28));
  }

  /** SI, section F — the far-skyline landmark silhouettes: the ported
   *  stepped-setback, terraced-crown, wedge and glass-sliver techniques
   *  (skylineLandmarks.ts) on the z 90 band, fog:false, deco-only — the
   *  clamped district rows keep the band lit exactly like the shipped
   *  tower row. */
  private buildSkylineBand(): void {
    const mStone = new THREE.MeshLambertMaterial({ color: PAL.skyline });
    mStone.fog = false;
    const mGlass = new THREE.MeshLambertMaterial({ color: 0x7a7086 });
    mGlass.fog = false;
    const mTrim = new THREE.MeshLambertMaterial({ color: 0xb8a8c0 });
    mTrim.fog = false;
    buildSkylineLandmarks(this.scene, mStone, mGlass, mTrim);
    this.vqLedger.push({ name: 'SI_SkylineLandmarks', x: 0, y: 0, z: 90 });
  }

  /** SI — the pass (sections A–F), pre-bake. */
  private buildAlderHeightsSI(): void {
    this.buildMallowRow();
    this.dressRooflines();
    this.dressFireEscapes();
    this.dressStorefrontRow();
    this.dressStreetLife();
    this.buildSkylineBand();
  }

  /** SI, far world — the ported subway stair on the TS surface plaza,
   *  just south of the SUB-TS station slot: the classic green-railing
   *  open stair with its SUBWAY band and globe pair. It joins TSS_Group so
   *  the zone bake fuses it (zone visibility owns the far world); one
   *  honest collider for the railing line. */
  private dressFarWorldSI(root: THREE.Group): void {
    const stair = makeSubwayStairNYC(this.bank, this.signMaterials.bind(this));
    stair.position.set(-332, 0.12, 3.2);
    stair.rotation.y = Math.PI; // the entries face the plaza's south walk
    root.add(stair);
    this.colliders.push(boxFromCenter(-332, 0.7, 3.2, 2.0, 1.4, 5.4));
  }

  private bakeStatics(): void {
    const skip = new Set<THREE.Object3D>([
      this.cartRoot, this.cartAwning, this.roof,
      // W5: the interior fit-outs toggle per-room — a baked batch can't be
      // hidden. The extracted far faces (the shipped glass panels) toggle
      // with them, and the duck towers must stay hideable while inside.
      // The WALLS bake normally.
      ...this.interiorHandles.map((h) => h.group),
      ...this.interiorHandles.flatMap((h) => h.farParts),
      ...this.interiorHandles.flatMap((h) => h.nearParts),
      ...this.interiorHandles.flatMap((h) => h.duck),
      this.busGroup,   // the M121 runs its rail every frame (W4 p2)
      this.courtDusk,  // the pickup pair toggles at dusk (W4 p2)
      // the deli's own dressing (2026-11 identity pass) keeps its names —
      // the probe pins the menu board, the product rows, the chip bags and
      // the door mat by name, and the counter slots are re-parented by the
      // GLB upgrades after this bake. ~20 live draws, the store's the hero.
      this.scene.children.find((o) => o.name === 'Bodega_Dressing') ?? new THREE.Group(),
      this.rosa, this.idris, this.kidGround, this.kidSil, this.stranger, this.sal,
      this.familiar, this.barrier, this.asphaltPatch,
      this.stool, this.permitReceipt,
      this.ball, // the half-court ball flies (docs/38)
      this.pigeonFlock.group, this.pigeonFlockEast.group, this.squirrel.group,
      this.leaves.mesh,
      ...this.glbProps.values(),
      ...this.itemMeshes.values(),
      // W0: the tree CANOPY is gone from the scene graph — makeTree now
      // returns blob records and the instanced canopy owns the draw (built
      // after this bake: an InstancedMesh is a Mesh, the bake must never
      // swallow it). The trunk and root flare are static wood: they merge
      // into their district tile like any other wall.
    ]);
    // the windows whose MATERIALS are tweened (dusk, golden-hour beats) —
    // they share a signature with the plain dim windows and must not join
    // their batch, or one lit window would light the whole row. The three
    // ambient windows keep a day-keyed diary instead (dressing.ts) — same
    // exclusion, different author.
    const NAMED_SKIP = new Set(['GoldWindow', 'SecondWindow', 'ThirdWindow', 'FourthWindow', 'Bodega_Window',
      'AmbientWindow_Late', 'AmbientWindow_New', 'AmbientWindow_Riser',
      // the plaza decks stay named: probe-env6 verifies their proudness and
      // clearances by name (the "plaza owns its paving" regression) — two
      // receive-only slabs are a fair price for that identity
      'Plaza_Deck_W', 'Plaza_Deck_E',
      // the deli's floor keeps its name for the palette probe (one live
      // slab, the room-color law's ninth voice)
      'Bodega_Floor',
      // docs/50 far world: the terminal lifts off when the player is
      // underground (the dollhouse), and the zone groups manage their own
      // visibility — none of it may join a district tile (the street ring
      // would light the tunnel forever)
      // + the north yard slab: it ROOFS the station box (x −60..60,
      //   z 8..32), and collectTerminalShell lifts it BY NAME with the
      //   dollhouse. Baked (found 2026-11-12, the entering-the-subway
      //   fix), the name lookup found nothing, the lawn stayed up below
      //   grade, and every above-grade sight line into the cutaway hit
      //   grass — aboard the car the frame was solid lawn green, on the
      //   platform the interior showed through a ~2° slit. One live draw
      //   above grade is the fair price for the cutaway being cut.
      // + the city-fabric skyline pair (docs/production/city-fabric): the
      // rows live OUTSIDE every district tile (x ±110 / z −88 / z +104) —
      // a tile ring that drops them would blink the horizon out of view
      'Bldg_N_West', 'SUB_Root', 'TSS_Group', 'BUS_M121', 'Yard_N',
      'SkylineFabric', 'SkylineFabricWindows']);
    const excluded = (o: THREE.Object3D): boolean => {
      for (let p: THREE.Object3D | null = o; p !== null; p = p.parent) {
        if (skip.has(p) || NAMED_SKIP.has(p.name)) return true;
      }
      return false;
    };

    interface BatchSrc { geo: THREE.BufferGeometry; mesh: THREE.Mesh; tile: string }
    interface Batch { srcs: BatchSrc[]; cast: boolean; receive: boolean; mat: THREE.MeshLambertMaterial }
    const batches = new Map<string, Batch>();
    const EYE_LAYER = new THREE.Layers(); // layer 0 — the main camera's layer

    this.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || excluded(o)) return;
      // Shadow proxies (personRig docs/51 B13) live ONLY on the shadow layer:
      // a batch mesh is an ordinary layer-0 mesh, so baking a proxy would
      // print its white silhouette standing inside every zone figure. The
      // proxies stay individual casters — that IS the shipped shadow law.
      if (!o.layers.test(EYE_LAYER)) return;
      // An InstancedMesh IS a Mesh, but its geometry is one instance's —
      // baking it merges a single phantom quad at the origin and STRIPS the
      // real instanced draw from the scene (the canopy dodged this by being
      // built after the bake; the skyline's panes live before it). Instanced
      // draws own themselves — the bake never touches them.
      if ((o as THREE.InstancedMesh).isInstancedMesh) return;
      const mat = o.material;
      // The ATLAS faces (docs/51 B13 frontier, signAtlas) ride the shared
      // sign sheet — mapped, but mergeable with their uv rects. Every OTHER
      // mapped material keeps its own draw: the atlas is the only sheet.
      const onAtlas = !!mat.map && mat.map === atlasTexture();
      if (!(mat instanceof THREE.MeshLambertMaterial) || mat.transparent) return;
      if (mat.map && !onAtlas) return;
      const geo = o.geometry;
      if (!geo.index || !geo.attributes.position || !geo.attributes.normal) return;
      o.updateWorldMatrix(true, false);
      if (onAtlas) {
        // signs over the station box lift with the terminal dollhouse
        // (collectTerminalShell, same rect) — they ride the sheet but keep
        // their own meshes, or the cutaway would strand them in the air
        const e = o.matrixWorld.elements;
        if (e[12] > -50.5 && e[12] < -20.5 && e[14] > 7.7 && e[14] < 20.2 && e[13] > -0.2) return;
      }
      // The vertex-color fusion (docs/47, the recorded "next figure cut"
      // lever applied where it is safe — statics): a NON-EMISSIVE flat-color
      // source rides the shared white vertexColors material — its color
      // becomes a per-vertex attribute, so the signature no longer contains
      // the color and every (fog, cast, receive) combo in the tile fuses
      // into ONE draw regardless of how many distinct prop colors it holds.
      // Emissive sources keep the color-keyed path (emissive is
      // material-wide and cannot ride vertices). Atlas sources keep uv —
      // their color IS the sheet — and key on the shared map instead.
      const emissive = mat.emissive.getHexString() !== '000000';
      const key = onAtlas
        ? `ATLAS|${mat.fog ? 1 : 0}`
          + `|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`
        : emissive
        ? `${mat.color.getHexString()}|${mat.emissive.getHexString()}`
          + `|${mat.emissiveIntensity}|${mat.fog ? 1 : 0}`
          + `|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`
        : `VC|${mat.fog ? 1 : 0}`
          + `|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
      let b = batches.get(key);
      if (!b) batches.set(key, b = { srcs: [], cast: o.castShadow, receive: o.receiveShadow, mat: onAtlas ? atlasMaterial()! : emissive ? mat : this.vcMaterial(mat.fog) });
      const g = geo.clone();
      g.applyMatrix4(o.matrixWorld);
      // keep every batch attribute-identical for mergeGeometries
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
      }
      if (!emissive && !onAtlas) {
        // vertex-color batches carry no uv (no map) and one color attribute
        // filled with the source's exact material color — Lambert's diffuse
        // was color × 1, now white × color: bit-for-bit the same shade, and
        // dropping uv lets uv-less and uv-ful sources fuse into one batch
        g.deleteAttribute('uv');
        // per-vertex palettes (person rigs) ARE the product — captured from
        // the SOURCE geo, because the clone loop above already stripped the
        // clone's non-pos/normal/uv attributes
        const srcColor = geo.attributes.color;
        if (srcColor) {
          g.setAttribute('color', srcColor.clone());
        } else {
          const pos = g.attributes.position;
          const arr = new Float32Array(pos.count * 3);
          const c = mat.color;
          for (let i = 0; i < pos.count; i++) {
            arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
          }
          g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        }
      }
      // Region-split (W0: now 2D district tiles): a whole-world batch would
      // defeat frustum culling (the batch's bounding sphere spans the world,
      // so nothing ever culls) — on software GL that cost more in rasterized
      // triangles than the draw calls saved (playtest 2026-10-30: the e2e
      // driver lost a third of its fps and its timed beats started missing).
      // Batching per 28 m × 32 m district tile keeps the draw-call win AND
      // lets off-screen tiles cull exactly like the individual meshes did —
      // and gives the district visibility pass its unit of work.
      // EXCEPTION — the atlas: sign faces are a few square meters TOTAL, so
      // the rasterization worry never applies; one world-wide batch beats
      // 4–8 per-tile ones at every rig. The batch still registers under a
      // key no district owns ('ATLAS'), so district visibility never hides it.
      const tile = onAtlas ? 'ATLAS' : World.districtKey(o.matrixWorld.elements[12], o.matrixWorld.elements[14]);
      b.srcs.push({ geo: g, mesh: o, tile });
    });

    // ---- the W4 p2 consolidation lever: fold CAST-ONLY batches -------------
    // A (color, cast=1, receive=0) batch sitting next to the same
    // (color, cast=1, receive=1) batch in the same tile is two draw calls
    // for one material — the W4 p1 parked cars opened five of these per
    // tile (buildCar never set receiveShadow). The fold sends the cast-only
    // sources into the cast+receive batch: they start RECEIVING shadows,
    // which is the look every world solid already has. Deliberately narrow:
    // receive-only (0,1) and flat (0,0) batches stay put — their flags were
    // chosen (ground slabs must not cast).
    for (const [key, b] of [...batches]) {
      if (!(b.cast && !b.receive)) continue;
      const foldKey = `${key.slice(0, key.lastIndexOf('|'))}|1`;
      const target = batches.get(foldKey);
      if (target && target !== b) {
        target.srcs.push(...b.srcs);
        batches.delete(key);
      }
    }

    // commits happen per (signature, district); a district group of 1 stays
    // as-is — merging it would save nothing
    const bySigTile = new Map<string, { batch: Batch; srcs: BatchSrc[] }>();
    for (const [key, b] of batches) {
      const byTile = new Map<string, BatchSrc[]>();
      for (const s of b.srcs) {
        let list = byTile.get(s.tile);
        if (!list) byTile.set(s.tile, list = []);
        list.push(s);
      }
      for (const [tile, srcs] of byTile) {
        if (srcs.length >= 2) bySigTile.set(`${key}#${tile}`, { batch: b, srcs });
        else for (const s of srcs) s.geo.dispose();
      }
    }

    // geometries referenced by any mesh we are NOT merging must survive
    const merging = new Set<THREE.Mesh>();
    for (const g of bySigTile.values()) for (const s of g.srcs) merging.add(s.mesh);
    const keepGeoms = new Set<THREE.BufferGeometry>();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && !merging.has(o)) keepGeoms.add(o.geometry);
    });

    let batchIndex = 0;
    for (const g of bySigTile.values()) {
      const merged = mergeGeometries(g.srcs.map((s) => s.geo), false);
      if (!merged) {
        for (const s of g.srcs) s.geo.dispose();
        continue;
      }
      for (const s of g.srcs) {
        s.mesh.parent?.remove(s.mesh);
        if (!keepGeoms.has(s.mesh.geometry)) s.mesh.geometry.dispose();
      }
      for (const s of g.srcs) s.geo.dispose();
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, g.batch.mat);
      mesh.name = `StaticBake_${g.srcs[0].tile}_${batchIndex++}`;
      mesh.castShadow = g.batch.cast;
      mesh.receiveShadow = g.batch.receive;
      this.scene.add(mesh);
      const dk = g.srcs[0].tile;
      let list = this.districtBatches.get(dk);
      if (!list) this.districtBatches.set(dk, list = []);
      list.push(mesh);
    }

    // dynamic groups join their districts (the batch meshes above are
    // already registered) — W0's ring covers the whole shipped street, so
    // this changes nothing visible; it makes the system real and measured.
    for (const t of this.trees) this.registerDistrictObject(t.group, t.group.position.x, t.group.position.z);
    this.registerDistrictObject(this.pigeonFlock.group, this.pigeonFlock.group.position.x, this.pigeonFlock.group.position.z);
    this.registerDistrictObject(this.pigeonFlockEast.group, this.pigeonFlockEast.group.position.x, this.pigeonFlockEast.group.position.z);
    this.registerDistrictObject(this.squirrel.group, this.squirrel.group.position.x, this.squirrel.group.position.z);
    this.registerDistrictObject(this.steamPoints, this.steamPoints.position.x, this.steamPoints.position.z);
    this.registerDistrictObject(this.leaves.mesh, 0, 0);
    // glb props join their district — EXCEPT the taxi: a rail vehicle spans
    // every column on the street, so no district may own its visibility.
    for (const [id, o] of this.glbProps) {
      if (id === 'car_taxi') continue;
      this.registerDistrictObject(o, o.position.x, o.position.z);
    }
    this.updateDistricts(-30, 6.2); // boot at the spawn — the E2E's first frame
  }

  /** The zone bake — the far world's statics, merged per zone group.
   *
   *  SUB_Root and TSS_Group boot as ~600 single-mesh draw calls (the
   *  census's top debtors) because their content must never join a
   *  DISTRICT tile: zone visibility is the law down there, and a district
   *  batch is lit by the street ring forever (stationKit's own header
   *  states it). So the merge happens one level down, INSIDE each zone
   *  group — same signature key as bakeStatics (color | emissive |
   *  emissiveIntensity | fog | cast | receive), same material rules (no
   *  map, no transparent, indexed geometry), and the merged mesh is
   *  re-parented INTO its group so every law above survives untouched:
   *  the zone lit-set, the dollhouse skip (collectTerminalShell walks
   *  root names), the ride's scenery stream, the screens' per-screen
   *  sync tick, and the subway cast's breathe.
   *
   *  Animated subtrees stay out by name: the cast rigs (Priya, the
   *  busker, the usher, the square's crowd, riders, waiters) breathe;
   *  TSS_Screen_N tick per screen (each screen owns its material
   *  instance — merging them would fuse the sync beat); TSS_Banner_N
   *  sway by reference. ZONE_KEEP_RE is the by-reference set the subway
   *  holds (the dollhouse ceiling, the turnstile arms) — merging those
   *  DETACHES the mesh and the system's writes land on a dead object
   *  (the bug-hunt sweep caught exactly that: the cutaway walled shut
   *  from above, the fare spin gone quiet). Singleton signature groups
   *  stay as-is, exactly like bakeStatics.
   *
   *  The CURB BAKE (docs/51 B13) extends the same law to the arrival
   *  bus's shell and the named dressing groups, passed explicitly by the
   *  boot sequence (they are built after the first call): the shell boxes
   *  are static dressing the arrivalBus header itself cedes ("the shell
   *  could bake"), the one-bay swap is a GROUP-level visibility write and
   *  the door gap is wall geometry — both survive the merge. The driver
   *  rig breathes, so it rides the animated exclusion by name. */
  private bakeZoneStatics(groups: THREE.Group[] = [
    this.subway.groups.stationA, this.subway.groups.stationB,
    this.subway.groups.tunnel, this.subway.groups.scenery,
    this.timesSquare.group,
  ]): void {
    const ANIMATED = /priya|busker|usher|crowd|mover|rider|sub_wait|sub_sax|tss_screen_\d+$|tss_banner|bus_driver/i;
    const animated = (o: THREE.Object3D, g: THREE.Group): boolean => {
      for (let p: THREE.Object3D | null = o; p && p !== g; p = p.parent) {
        if (p.name && (ANIMATED.test(p.name) || ZONE_KEEP_RE.test(p.name))) return true;
      }
      return false;
    };

    interface ZSrc { geo: THREE.BufferGeometry; mesh: THREE.Mesh }
    const allRemoved: THREE.Mesh[] = [];
    for (const g of groups) {
      g.updateWorldMatrix(true, false);
      const gInv = new THREE.Matrix4().copy(g.matrixWorld).invert();
      const batches = new Map<string, { srcs: ZSrc[]; cast: boolean; receive: boolean; mat: THREE.MeshLambertMaterial }>();
      g.traverse((o) => {
        if (!(o instanceof THREE.Mesh) || animated(o, g)) return;
        const mat = o.material;
        if (!(mat instanceof THREE.MeshLambertMaterial) || mat.map || mat.transparent) return;
        const geo = o.geometry;
        if (!geo.index || !geo.attributes.position || !geo.attributes.normal) return;
        o.updateWorldMatrix(true, false);
        const c = geo.clone();
        c.applyMatrix4(new THREE.Matrix4().multiplyMatrices(gInv, o.matrixWorld));
        // attribute-identical sources only, so mergeGeometries accepts them
        for (const name of Object.keys(c.attributes)) {
          if (name !== 'position' && name !== 'normal' && name !== 'uv') c.deleteAttribute(name);
        }
        // the vertex-color fusion, zone edition (docs/47): same law as
        // bakeStatics — non-emissive flat colors ride the shared white
        // vertexColors material; emissive sources keep the color key
        const emissive = mat.emissive.getHexString() !== '000000';
        const key = emissive
          ? `${mat.color.getHexString()}|${mat.emissive.getHexString()}`
            + `|${mat.emissiveIntensity}|${mat.fog ? 1 : 0}`
            + `|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`
          : `VC|${mat.fog ? 1 : 0}`
            + `|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
        let b = batches.get(key);
        if (!b) batches.set(key, b = { srcs: [], cast: o.castShadow, receive: o.receiveShadow, mat: emissive ? mat : this.vcMaterial(mat.fog) });
        if (!emissive) {
          c.deleteAttribute('uv');
          const pos = c.attributes.position;
          const arr = new Float32Array(pos.count * 3);
          const col = mat.color;
          for (let i = 0; i < pos.count; i++) {
            arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b;
          }
          c.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        }
        b.srcs.push({ geo: c, mesh: o });
      });
      let i = 0;
      for (const b of batches.values()) {
        if (b.srcs.length < 2) { for (const s of b.srcs) s.geo.dispose(); continue; }
        const merged = mergeGeometries(b.srcs.map((s) => s.geo), false);
        for (const s of b.srcs) s.geo.dispose();
        if (!merged) continue;
        for (const s of b.srcs) {
          s.mesh.parent?.remove(s.mesh);
          allRemoved.push(s.mesh);
        }
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, b.mat);
        mesh.name = `ZoneBake_${g.name}_${i++}`;
        mesh.castShadow = b.cast;
        mesh.receiveShadow = b.receive;
        g.add(mesh);
      }
    }
    // geometries referenced by any survivor must not die with the sources
    const keepGeoms = new Set<THREE.BufferGeometry>();
    this.scene.traverse((o) => { if (o instanceof THREE.Mesh) keepGeoms.add(o.geometry); });
    for (const m of allRemoved) {
      if (!keepGeoms.has(m.geometry)) m.geometry.dispose();
    }
  }

  // ------------------------------------------------------------------ helpers

  /** The three bodega shelf items (mango / coffee / bread) — non-colliding
   *  deco. Built feet-at-zero; y IS the shelf board top they stand on
   *  (board 3 of the gondola run — see the restock pass's SHELF levels). */
  readonly itemMeshes = new Map<string, THREE.Group>();

  addItem(id: string, x: number, y: number, z: number, _color: number): THREE.Group {
    void _color; // shape + label now carry the identity; palette stays on the item itself
    const g = new THREE.Group();
    g.name = `Item_${id}`;
    g.position.set(x, y, z); // feet on the named surface (a gondola board top)
    const add = (m: THREE.Mesh) => { m.castShadow = true; g.add(m); };
    if (id === 'mango') {
      // shelf-scale fruit: the old half-kilo mango was bigger than the bay
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), this.mat(0xf7a83b, { emissive: 0xf7a83b, emissiveIntensity: 0.18 }));
      body.scale.y = 0.9;
      body.position.y = 0.077;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.04, 6), this.mat(0x4a3a30));
      stem.position.y = 0.155;
      add(body); add(stem);
    } else if (id === 'coffee') {
      const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.26, 12), this.mat(PAL.teal, { emissive: PAL.teal, emissiveIntensity: 0.18 }));
      tin.position.y = 0.13;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.09, 12), this.mat(PAL.cream));
      band.position.y = 0.13;
      add(tin); add(band);
    } else {
      // bread
      const loaf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.13, 0.17), this.mat(0xd9a05b, { emissive: 0xd9a05b, emissiveIntensity: 0.14 }));
      loaf.position.y = 0.065;
      const crust = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.19), this.mat(0xb3773f));
      crust.position.y = 0.135;
      add(loaf); add(crust);
    }
    // the name floats above the shelf — nobody picks a mystery box
    const label = this.makeLabel(ITEM_LABELS[id] ?? id);
    label.position.y = 0.95;
    g.add(label);
    this.scene.add(g);
    this.itemMeshes.set(id, g);
    return g;
  }

  removeItem(id: string): boolean {
    const g = this.itemMeshes.get(id);
    if (!g) return false;
    this.scene.remove(g);
    g.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
        (o as THREE.Mesh).geometry?.dispose?.();
        const m = o.material as THREE.Material;
        m?.dispose?.();
      }
    });
    this.itemMeshes.delete(id);
    return true;
  }

  /** The shared vertex-color bake materials (docs/47): one white Lambert
   *  with vertexColors per fog law. Every fused static batch draws with one
   *  of these two materials; the color variety lives in the geometry, where
   *  the census audit now reads it. */
  private vcMatFog: THREE.MeshLambertMaterial | null = null;
  private vcMatNoFog: THREE.MeshLambertMaterial | null = null;
  private vcMaterial(fog: boolean): THREE.MeshLambertMaterial {
    if (fog) return (this.vcMatFog ??= new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, envMapIntensity: 0.18 }));
    return (this.vcMatNoFog ??= new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, fog: false, envMapIntensity: 0.18 }));
  }

  /** Hero-vehicle paint (the graphics wave): physically-based metal/rough
   *  so the taxi and the M121 carry the sky's reflection (scene.environment)
   *  and a real specular. Cached per color — one program, few materials. */
  private vehBodyMat = new Map<number, THREE.MeshStandardMaterial>();
  private vehicleMat(color: number, metalness = 0.45, roughness = 0.35): THREE.MeshStandardMaterial {
    let m = this.vehBodyMat.get(color);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
      m.envMapIntensity = 0.9;
      this.vehBodyMat.set(color, m);
    }
    return m;
  }

  /** A ground slab wearing the procedural street textures (the graphics
   *  wave) — same collider/receive law as solid(), mapped material so the
   *  bake leaves it alone, metric UVs so texel density is right at any size. */
  private groundSolid(name: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, kind: 'asphalt' | 'concrete'): THREE.Mesh {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    metricBoxUVs(geo, sx, sy, sz);
    const m = new THREE.Mesh(geo, groundMaterial(kind));
    m.name = name;
    m.position.set(cx, cy, cz);
    m.castShadow = false;
    m.receiveShadow = true;
    this.scene.add(m);
    this.colliders.push(boxFromCenter(cx, cy, cz, sx, sy, sz));
    return m;
  }

  // ------------------------------------------------ the day cycle (graphics wave)
  // docs/rendering/03 §1 — the clock-driven lighting canon. Story beats PIN
  // (startDusk/toMorningLight keep their contracts); roam/scenario follow
  // the sim clock continuously; the approach is an exp lerp — the shipped
  // 6 s dusk tween's feel, without per-frame tween allocations.

  /** Pin a keyframe (story beats) or unpin (null — clock-driven). */
  pinDayState(pin: DayPin | null, immediate = false): void {
    this.dayPin = pin;
    if (pin !== null) {
      keyframeState(pin, this.dayScratch);
    } else {
      sampleDayCycle(this.dayMinute < 0 ? CANON_MINUTES.morning : this.dayMinute, this.dayScratch);
    }
    this.envDirty = true;
    if (immediate) this.applyTargetDayState(1);
  }

  /** Per-frame drive (Game.frame, before the render): sample the clock when
   *  unpinned, then approach the target. No allocations. */
  updateDayCycle(minuteOfDay: number, dt: number): void {
    const minute = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
    if (this.dayPin === null && minute !== this.dayMinute) {
      this.dayMinute = minute;
      sampleDayCycle(minute, this.dayScratch);
      this.envDirty = true;
    }
    this.applyTargetDayState(Math.min(1, dt * 1.4));
  }

  /** Force a clock time (the probe/validation affordance — ?tod and the
   *  visual rigs). Freezes the clock-driven sample there. */
  setClockMinute(minute: number): void {
    this.dayMinute = ((Math.round(minute) % 1440) + 1440) % 1440;
    this.dayPin = null;
    sampleDayCycle(this.dayMinute, this.dayScratch);
    this.envDirty = true;
    this.applyTargetDayState(1);
  }

  /** The settle test: the current state may be considered at its target
   *  (the exp lerp's convergence band — where the env map may rebuild). */
  private daySettled(): boolean {
    return Math.abs(this.dayState.exposure - this.dayScratch.exposure) < 1e-3
      && Math.abs(this.dayState.nightK - this.dayScratch.nightK) < 1e-3;
  }

  /** Lerp current → target and write the whole lighting stack: sky uniforms,
   *  FogExp2, sun, hemisphere, night emissives, scene.environment. */
  private applyTargetDayState(k: number): void {
    const cur = this.dayState, tgt = this.dayScratch;
    for (const key of World.DAY_KEYS) {
      cur[key] = cur[key] + (tgt[key] - cur[key]) * k;
    }
    // sky dome
    (this.skyUniforms.topColor as THREE.Color).setRGB(cur.skyTopR, cur.skyTopG, cur.skyTopB);
    (this.skyUniforms.horizonColor as THREE.Color).setRGB(cur.skyHorizonR, cur.skyHorizonG, cur.skyHorizonB);
    (this.skyUniforms.groundColor as THREE.Color).setRGB(cur.skyGroundR, cur.skyGroundG, cur.skyGroundB);
    this.skyMat.uniforms.haloColor.value.setRGB(cur.haloR, cur.haloG, cur.haloB);
    this.skyMat.uniforms.haloStrength.value = cur.haloStrength;
    this.skyMat.uniforms.nightK.value = cur.nightK;
    // fog
    this.fog.color.setRGB(cur.fogR, cur.fogG, cur.fogB);
    this.fog.density = cur.fogDensity;
    // lights (sun energy rides the same legacy π factor the boot used)
    this.sun.color.setRGB(cur.sunR, cur.sunG, cur.sunB);
    this.sun.intensity = phys(cur.sunEnergy);
    this.hemi.intensity = phys(cur.hemiEnergy);
    (this.hemi.color as THREE.Color).setRGB(cur.hemiSkyR, cur.hemiSkyG, cur.hemiSkyB);
    (this.hemi.groundColor as THREE.Color).setRGB(cur.hemiGroundR, cur.hemiGroundG, cur.hemiGroundB);
    // night emissives — lamps, traffic greens, storefront strips, warm rooms
    for (const e of this.nightEmissives) {
      e.mat.emissiveIntensity = e.base + (e.night - e.base) * cur.nightK;
    }
    // the fenestra windows ride the same clock: one uniform write per
    // family material — per-window onsets live in the shader's hashes
    for (const m of this.fenestraMats) m.setNightK(cur.nightK);
    this.timesSquare.setNightBoost(cur.nightK);
    // the sky-PMREM environment — rebuilt only when the target changed and
    // the lerp has settled (a few rebuilds per in-game day, never per frame)
    if (this.envSky) {
      const pinned = this.dayPin !== null
        || Math.abs(this.dayMinute - this.lastEnvRebuildMinute) >= World.ENV_REBUILD_MIN_SIM_MIN;
      if (this.envDirty && this.daySettled() && pinned) {
        this.scene.environment = this.envSky.rebuild({
          top: this.skyUniforms.topColor,
          horizon: this.skyUniforms.horizonColor,
          ground: this.skyUniforms.groundColor,
          halo: this.skyMat.uniforms.haloColor.value,
          haloStrength: cur.haloStrength,
        });
        this.envDirty = false;
        this.lastEnvRebuildMinute = this.dayMinute;
      }
      this.scene.environmentIntensity = cur.envIntensity;
    }
  }

  /** The AO prepass exclusion list (docs/rendering/03 §6): the far-world
   *  silhouettes the AO lens never sees (sky dome, skyline rows, landmarks,
   *  Times Square, the movers) + billboards/points whose override-material
   *  depth would print halos into the occlusion (glow sprites, steam,
   *  leaves, birds). The dome itself is BackSide and auto-culled — it rides
   *  along for belt-and-braces. */
  private assembleAoExclude(): void {
    const list = this.aoExcludeList;
    list.length = 0;
    list.push(this.skyDome, this.steamPoints, this.leaves.mesh,
      this.pigeonFlock.group, this.pigeonFlockEast.group, this.squirrel.group,
      this.busGroup, this.taxi, this.arrivalBus.group);
    for (const s of this.glowSprites) list.push(s);
    for (const name of ['SkylineFabric', 'SkylineFabricWindows', 'TSS_Group']) {
      const o = this.scene.getObjectByName(name);
      if (o) list.push(o);
    }
  }

  // ------------------------------------------------------------------ fenestra
  // The interior-mapping windows (docs/production/fenestra/). Build once;
  // per-frame work is one uniform write per family (the clock) + a throttled
  // distance-band pass (hot path cold, AGENTS §1c.3).

  /** Build the two family instanced meshes + load the atlases (the seam
   *  law: a missing file degrades to the dim-room fallback, never breaks). */
  private buildFenestra(): void {
    for (const family of ['residential', 'commercial'] as const) {
      const mat = new FenestraMaterial({ family });
      this.fenestraMats.push(mat);
      const fm = fenestraMeshFromPlan(this.fenestraPlan, family, mat);
      if (fm) {
        this.fenestraMeshes.push(fm);
        this.scene.add(fm.mesh);
      }
    }
    this.fenestraBands = new Uint8Array(this.fenestraPlan.length);
    // aniso 4 — grazing-angle facades are the common street view; three
    // clamps the value to the device max (WebGLTextures.texParameterf).
    void Promise.all([
      loadFenestraAtlas('textures/fenestra_rooms.png', 'rooms', 4),
      loadFenestraAtlas('textures/fenestra_fronts.png', 'fronts', 4),
    ]).then(([rooms, fronts]) => {
      // the FEN-GLITCH deep-mip clamp: TEXTURE_MAX_LOD 3 pins sampling
      // inside the gutters' safe range — set once, right after the upload
      // (onUpdate fires inside WebGLTextures.uploadTexture; the renderer
      // handle may land later than this promise — it is read at fire time)
      for (const t of [rooms, fronts]) {
        t.onUpdate = () => {
          if (this.rendererRef) applyAtlasMaxLod(this.rendererRef, t);
        };
      }
      for (const m of this.fenestraMats) m.setAtlases(rooms, fronts);
    });
  }

  /** The distance-band pass (throttled 4 Hz): each window's LOD attribute
 *  demotes with hysteresis — FULL near, MID (glass off), FLAT (the
 *  impostor) far. Writes only changed instances. */
  private updateFenestraBands(dt: number, px: number, py: number, pz: number): void {
    if (!this.fenestraEnabled || this.fenestraMeshes.length === 0) return;
    this.fenestraBandTimer += dt;
    if (this.fenestraBandTimer < 0.25) return;
    this.fenestraBandTimer = 0;
    const { full, far } = this.fenestraBandDist;
    for (const fm of this.fenestraMeshes) {
      let lodDirty = false;
      let glassDirty = false;
      for (let i = 0; i < fm.planIdx.length; i++) {
        const inst = this.fenestraPlan[fm.planIdx[i]];
        const dx = inst.x - px, dy = inst.y - py, dz = inst.z - pz;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const band = fenBandOf(d, full, far, this.fenestraBands[fm.planIdx[i]] as 0 | 1 | 2);
        if (band !== this.fenestraBands[fm.planIdx[i]]) {
          this.fenestraBands[fm.planIdx[i]] = band;
          const v = bandValues(band);
          if (fm.lodArray[i] !== v.lod) { fm.lodArray[i] = v.lod; lodDirty = true; }
          if (fm.glassArray[i] !== v.glass) { fm.glassArray[i] = v.glass; glassDirty = true; }
        }
      }
      if (lodDirty) fm.lod.needsUpdate = true;
      if (glassDirty) fm.glass.needsUpdate = true;
    }
  }

  /** The quality tier's band distances (Game.applyGfxTier wires it; low
   *  hardware flattens sooner — the mission's distance ladder). */
  setFenestraTier(tier: string): void {
    this.fenestraBandDist = FEN_BANDS_BY_TIER[tier] ?? FEN_BANDS_BY_TIER.high;
  }

  /** The ?fenestra=0 affordance (and the probe's A/B seam): the planes
   *  hide and the system goes inert — the shipped dim-box look returns. */
  setFenestraEnabled(on: boolean): void {
    this.fenestraEnabled = on;
    for (const fm of this.fenestraMeshes) fm.mesh.visible = on;
  }

  /** Probe/diagnostics: the plan summary (windows per building). */
  fenestraSummary(): { total: number; byBldg: Record<string, number> } {
    const byBldg: Record<string, number> = {};
    for (const inst of this.fenestraPlan) {
      byBldg[inst.buildingId] = (byBldg[inst.buildingId] ?? 0) + 1;
    }
    return { total: this.fenestraPlan.length, byBldg };
  }

  /** Full resource release (probes/rebuilds; the page owns the usual
   *  lifetime). Textures ride the module cache (the groundTex pattern). */
  disposeFenestra(): void {
    for (const fm of this.fenestraMeshes) {
      this.scene.remove(fm.mesh);
      fm.dispose();
    }
    this.fenestraMeshes.length = 0;
    for (const m of this.fenestraMats) m.dispose();
    this.fenestraMats.length = 0;
    this.fenestraBands = new Uint8Array(0);
  }

  private mat(color: number, opts: { emissive?: number; emissiveIntensity?: number } = {}): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ color });
    if (opts.emissive !== undefined) {
      m.emissive = new THREE.Color(opts.emissive);
      m.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    // the sky-PMREM IBL fill (the graphics wave) — a soft ambient tint, not
    // a mirror; scene.environment supplies the texture per day state
    m.envMapIntensity = 0.22;
    return m;
  }

  /** The night emissive registry's intake (docs/rendering/03 §5): creates
   *  the material AND registers its base → night intensity (nightK-driven
   *  by applyTargetDayState). The night numbers sit above the bloom
   *  threshold (1.0 linear) so lamps/signs/interiors — and only those —
   *  glow through UnrealBloom after dark. */
  private nightGlow(color: number, base: number, night: number, emissive = color): THREE.MeshLambertMaterial {
    const m = this.mat(color, { emissive, emissiveIntensity: base });
    this.nightEmissives.push({ mat: m, base, night });
    return m;
  }

  private solid(
    name: string, cx: number, cy: number, cz: number,
    sx: number, sy: number, sz: number, color: number,
    opts: { collide?: boolean; cast?: boolean; receive?: boolean; fog?: boolean } = {},
  ): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), this.mat(color));
    m.name = name;
    m.position.set(cx, cy, cz);
    m.castShadow = opts.cast ?? true;
    m.receiveShadow = opts.receive ?? true;
    if (opts.fog === false) (m.material as unknown as { fog?: boolean }).fog = false;
    this.scene.add(m);
    if (opts.collide !== false) this.colliders.push(boxFromCenter(cx, cy, cz, sx, sy, sz));
    return m;
  }

  private deco(name: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: number, opts: { fog?: boolean } = {}): THREE.Mesh {
    const m = this.solid(name, cx, cy, cz, sx, sy, sz, color, { collide: false, cast: false, receive: false, fog: opts.fog });
    return m;
  }

  private decoMesh(name: string, geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }

  // ------------------------------------------------- generated .glb upgrades
  // The Spaces pipeline (tools/gen3d, tools3d/spaces_glb.py) writes textured
  // .glb files into public/models/. This seam lets a generated mesh replace a
  // placeholder's visuals at boot — and silently keeps the placeholder when
  // the file is missing or malformed, so the game never depends on it.

  registerGlbProp(id: string, obj: THREE.Object3D): void {
    this.glbProps.set(id, obj);
  }

  /** The interiors dressing seam (docs/production/interiors/): wear each
   *  manifest slot's sand3d GLB onto its placeholder — the dryers the
   *  laundromat's washers were waiting for, the barber chairs, the cook
   *  line, the record bins, the flour wall. The upgrade is the shipped
   *  prop seam: missing files keep the procedural rooms whole. */
  private upgradeInteriorPropsWithGLB(): void {
    for (const slot of INTERIOR_SLOTS) {
      const placeholder = this.scene.getObjectByName(slot.fixture);
      if (!placeholder) {
        console.info(`[interiors] ${slot.id}: fixture ${slot.fixture} not found — kept procedural`);
        continue;
      }
      this.registerGlbProp(slot.id, placeholder);
      void this.upgradePropWithGLB(slot.id, slot.file ?? `models/${slot.id}.glb`);
    }
  }

  async upgradePropWithGLB(id: string, file = `models/${id}.glb`): Promise<boolean> {
    const placeholder = this.glbProps.get(id);
    const loader = this.glbLoader;
    if (!placeholder || !loader) return false;
    const url = new URL(file, document.baseURI).href;
    try {
      const gltf = await loader.loadAsync(url);
      let visual: THREE.Object3D = gltf.scene;
      let hasMesh = false;
      const stray: THREE.Object3D[] = [];
      visual.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) hasMesh = true;
        if ((o as THREE.Light).isLight || (o as THREE.Camera).isCamera) stray.push(o);
      });
      if (!hasMesh) throw new Error('no meshes in file');
      for (const o of stray) o.parent?.remove(o);
      // W0: generated GLBs arrive node-per-part (the exporter writes one node
      // per primitive) — a hydrant wore 12 draw calls, a car 18. Merge the
      // scene's single-material meshes into one mesh per material; the world
      // transforms are baked into the merged vertices, so the visual is
      // bit-identical. Any mesh we can't merge (multi-material groups,
      // mismatched attributes) keeps the original scene untouched.
      visual = this.mergeGltfParts(visual);
      // B13 (docs/51): the wrapper the bake must never swallow fuses ITSELF
      // — the shipped vehicles are flat untextured unmetallic colors, so the
      // per-material meshes become ONE vertex-colored draw on the shared vc
      // material (the statics' own color-ride law). Anything that would not
      // survive with its look intact bails whole, per mergeGltfParts' law.
      visual = fuseFlatParts(visual, this.vcMaterial(true)).root;

      placeholder.updateWorldMatrix(true, false);
      const phBox = new THREE.Box3().setFromObject(placeholder);
      const phSize = phBox.getSize(new THREE.Vector3());
      const box = new THREE.Box3().setFromObject(visual);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      if (!(size.y > 0) || !Number.isFinite(size.y)) throw new Error('degenerate bounds');

      const worldQuat = placeholder.getWorldQuaternion(new THREE.Quaternion());
      const worldScale = placeholder.getWorldScale(new THREE.Vector3());
      if (Math.abs(worldScale.x - worldScale.y) > 1e-3 || Math.abs(worldScale.y - worldScale.z) > 1e-3) {
        throw new Error('placeholder is non-uniformly scaled');
      }

      // Uniform scale so the generated mesh stands exactly as tall as the
      // placeholder it replaces, feet on the same ground, XZ centered on it.
      // THE GROUND IS THE AABB's MIN — not the placeholder's origin. Most
      // placeholders (the washer slots, the fixture() boxes, the hydrant
      // cylinder) are CENTERED meshes whose origin rides mid-height; feet on
      // the origin hung the model half a slot above its own footprint (the
      // washers read as a wall-mounted row, the bodega produce crate floated
      // a hand-span over the tiles). The furniture seam always used the box
      // min (upgradeFurnitureWithGLB's law); the prop seam now matches it.
      const s = phSize.y / size.y;
      // Footprint guard: a car scaled to the placeholder's height must also
      // occupy a similar street width, or its collider (sized for the
      // placeholder) stops matching what you see. 0.5×–1.9× is the sane band.
      const scaledX = size.x * s, scaledZ = size.z * s;
      if (scaledX < phSize.x * 0.5 || scaledX > phSize.x * 1.9
        || scaledZ < phSize.z * 0.5 || scaledZ > phSize.z * 1.9) {
        throw new Error(`footprint mismatch (${scaledX.toFixed(2)}×${scaledZ.toFixed(2)} vs ${phSize.x.toFixed(2)}×${phSize.z.toFixed(2)})`);
      }
      visual.scale.setScalar(s);
      visual.position.set(-center.x * s, -box.min.y * s, -center.z * s);

      const wrapper = new THREE.Group();
      wrapper.name = `${placeholder.name || id}_glb`;
      // feet on the placeholder's GROUND (world AABB min), XZ centered on
      // the occupied box — the furniture seam's placement law, one source.
      const phCenter = phBox.getCenter(new THREE.Vector3());
      wrapper.position.set(phCenter.x, phBox.min.y, phCenter.z);
      wrapper.quaternion.copy(worldQuat);
      wrapper.scale.copy(worldScale);
      wrapper.add(visual);
      visual.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });

      const parent = placeholder.parent;
      if (!parent) throw new Error('placeholder was removed from the scene');
      parent.add(wrapper);
      parent.remove(placeholder);
      this.disposeTree(placeholder);
      this.glbProps.set(id, wrapper); // re-register so the upgrade is re-runnable
      this.glbUpgrades.set(id, file);
      // the GLB wrapper inherits the placeholder's district seat (the bake
      // registered the placeholder before the async upgrade swapped it)
      if (this.districtOf.has(placeholder)) {
        this.registerDistrictObject(wrapper, wrapper.position.x, wrapper.position.z);
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.info(`[glb] ${id} keeps its procedural look (${msg})`);
      if (/404|fetch|network|Failed to load/i.test(msg)) {
        this.glbLoader = null; // no models shipped — stop asking for the rest
      }
      return false;
    }
  }

  /** Merge a loaded GLB scene's single-material meshes into one mesh per
   *  material (world transforms baked in). Returns the ORIGINAL scene when
   *  anything is not safely mergeable — the upgrade path never gambles. */
  private mergeGltfParts(root: THREE.Object3D): THREE.Object3D {
    const parts: THREE.Mesh[] = [];
    root.updateMatrixWorld(true);
    root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) parts.push(m); });
    if (parts.length < 2) return root;
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
    let mergeable = 0;
    for (const m of parts) {
      const multi = Array.isArray(m.material)
        || (m.geometry.groups && m.geometry.groups.length > 1);
      if (multi || !m.geometry.index) return root; // keep the original scene
      mergeable++;
      const g = m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
      }
      const mat = m.material as THREE.Material;
      let list = byMat.get(mat);
      if (!list) byMat.set(mat, list = []);
      list.push(g);
    }
    if (mergeable < 2 || parts.length <= byMat.size) return root;
    const mergedRoot = new THREE.Group();
    mergedRoot.name = root.name;
    for (const [mat, geos] of byMat) {
      const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (!merged) return root;
      merged.computeBoundingSphere();
      mergedRoot.add(new THREE.Mesh(merged, mat));
      for (const g of geos) if (g !== merged) g.dispose();
    }
    return mergedRoot;
  }

  private disposeTree(root: THREE.Object3D): void {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) m?.dispose();
      }
    });
  }

  // ------------------------------------------------- ABO furniture seam
  // docs/57: the curated Amazon Berkeley Objects pack (CC-BY-4.0) wears the
  // interiors. The models are the dataset's lod1 GLBs — meshopt-compressed
  // geometry with KTX2 (basis) textures — so the loader needs the renderer
  // for the transcoder's format probe; the Game wires it once the renderer
  // exists. The seam law is the docs/28 one: a missing or malformed file
  // keeps the authored placeholder, one console.info line, no retry loop,
  // and NOTHING gameplay-bearing changes (colliders, toggles, anchors).

  /** Called once by the Game after the renderer exists: re-arms the GLB
   *  loader with the meshopt + KTX2 decoders and fires the furniture
   *  upgrades. Street-prop upgrades keep their earlier plain loader. */
  configureGltfDecoders(renderer: THREE.WebGLRenderer): void {
    if (this.furnitureWired) return;
    this.furnitureWired = true;
    this.rendererRef = renderer;
    // the graphics wave: the sky-PMREM environment builds here (Game hands
    // the renderer over exactly once); the applier rebuilds it on state change
    this.envSky = new EnvSky(renderer);
    this.envDirty = true;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const ktx2 = new KTX2Loader()
      .setTranscoderPath('vendor/basis/')
      .detectSupport(renderer);
    loader.setKTX2Loader(ktx2);
    this.glbLoader = loader;
    for (const slot of FURNITURE_SLOTS) void this.upgradeFurnitureWithGLB(slot);
  }

  /** One furniture slot: swap the named placeholder inside its room group
   *  for the real model, scaled to the slot's authored height (or footprint
   *  for flat pieces), XZ-centered on the placeholder, feet on its ground.
   *  Siblings in `hide` lose visibility ONLY once the model is in — the
   *  procedural room stays whole when the file is missing. */
  async upgradeFurnitureWithGLB(slot: FurnitureSlot): Promise<boolean> {
    const loader = this.glbLoader;
    if (!loader) return false;
    const room = this.scene.children.find((c) => c.name === `INT_${slot.room}`);
    const placeholder = room?.children.find((c) => c.name === slot.fixture);
    if (!room || !placeholder) {
      console.info(`[furniture] ${slot.id}: placeholder ${slot.fixture} not found — kept procedural`);
      return false;
    }
    const file = `models/furniture/${slot.id}.glb`;
    const url = new URL(file, document.baseURI).href;
    try {
      const gltf = await loader.loadAsync(url);
      let visual: THREE.Object3D = gltf.scene;
      let hasMesh = false;
      const stray: THREE.Object3D[] = [];
      visual.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) hasMesh = true;
        if ((o as THREE.Light).isLight || (o as THREE.Camera).isCamera) stray.push(o);
      });
      if (!hasMesh) throw new Error('no meshes in file');
      for (const o of stray) o.parent?.remove(o);
      // the slot's yaw goes on FIRST and the merge bakes it into the
      // vertices — the bounds below are the occupied ones, so the footprint
      // guard judges the piece as placed, not as authored
      visual.rotation.y = slot.rotateY ?? 0;
      visual.updateWorldMatrix(true, true);
      // one draw per material (the street seam's merge; furniture files are
      // single-mesh so this usually returns the scene untouched)
      visual = this.mergeGltfParts(visual);

      placeholder.updateWorldMatrix(true, false);
      const phBox = new THREE.Box3().setFromObject(placeholder);
      const phSize = phBox.getSize(new THREE.Vector3());
      const box = new THREE.Box3().setFromObject(visual);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      if (!(size.y > 0) || !Number.isFinite(size.y)) throw new Error('degenerate bounds');
      const worldPos = placeholder.getWorldPosition(new THREE.Vector3());

      // fit law: 'height' scales the model to the slot's authored height;
      // 'footprint' (flat pieces) covers the placeholder's XZ box. The
      // footprint guard is the street seam's band (0.5–1.9×) — a mislabeled
      // model (a lamp wearing the bed slot) bails whole, room keeps its box.
      const s = slot.fitBy === 'footprint'
        ? Math.min(phSize.x / size.x, phSize.z / size.z)
        : slot.height / size.y;
      const scaledX = size.x * s, scaledZ = size.z * s;
      if (scaledX < phSize.x * 0.5 || scaledX > phSize.x * 1.9
        || scaledZ < phSize.z * 0.5 || scaledZ > phSize.z * 1.9) {
        throw new Error(`footprint mismatch (${scaledX.toFixed(2)}×${scaledZ.toFixed(2)} vs ${phSize.x.toFixed(2)}×${phSize.z.toFixed(2)})`);
      }
      if (slot.fitBy === 'footprint' && !(Math.abs(size.y * s - slot.height) < slot.height * 4 + 0.15)) {
        throw new Error(`flat piece reads ${(size.y * s).toFixed(2)} m thick`);
      }

      const wrapper = new THREE.Group();
      wrapper.name = `${slot.fixture}_glb`;
      wrapper.position.set(worldPos.x, phBox.min.y, worldPos.z);
      visual.position.set(-center.x, -box.min.y, -center.z);
      visual.scale.setScalar(s);
      wrapper.add(visual);
      wrapper.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });

      const parent = placeholder.parent;
      if (!parent) throw new Error('placeholder was removed from the scene');
      parent.add(wrapper);
      parent.remove(placeholder);
      this.disposeTree(placeholder);
      for (const name of slot.hide ?? []) {
        const sibling = parent.children.find((c) => c.name === name);
        if (sibling) sibling.visible = false;
      }
      this.furnitureUpgrades.set(`${slot.room}:${slot.fixture}`, file);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.info(`[furniture] ${slot.id} keeps its procedural look (${msg})`);
      return false;
    }
  }

  private makeMailbox(x: number, z: number): THREE.Group {
    const g = new THREE.Group();
    g.name = 'Mailbox';
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.5), this.mat(PAL.teal));
    body.position.y = 0.55;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.55, 12, 1, false, 0, Math.PI), this.mat(PAL.teal));
    top.rotation.z = Math.PI / 2;
    top.rotation.y = Math.PI / 2;
    top.position.y = 0.86;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.36), this.mat(PAL.ink));
    leg.position.y = 0.13;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.03), this.mat(PAL.ink));
    slot.position.set(0, 0.74, 0.26);
    for (const m of [body, top, leg, slot]) { m.castShadow = true; g.add(m); }
    // B13: no mailbox.glb ships, so this placeholder's upgrade can never
    // land — it is a FINAL static that the bake will never take (glbProps
    // law). Fuse it here, pre-position, on the shared vc material: 4 → 1.
    const out = fuseFlatParts(g, this.vcMaterial(true)).root as THREE.Group;
    out.position.set(x, 0, z);
    this.registerGlbProp('mailbox', out);
    return out;
  }

  private makeTrashcan(x: number, z: number): THREE.Group {
    const g = new THREE.Group();
    g.name = 'Trashcan';
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.82, 10), this.mat(PAL.bldg2));
    can.position.y = 0.41;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 14), this.mat(PAL.ink));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.82;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 6, 14), this.mat(PAL.ink));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.5;
    for (const m of [can, rim, band]) { m.castShadow = true; g.add(m); }
    // B13: same law as the mailbox — no trashcan.glb ships, so fuse the
    // final static here: 3 → 1.
    const out = fuseFlatParts(g, this.vcMaterial(true)).root as THREE.Group;
    out.position.set(x, 0, z);
    this.registerGlbProp('trashcan', out);
    return out;
  }

  private makeStreetlamp(x: number, z: number): THREE.Group {
    const g = new THREE.Group();
    g.name = 'Streetlamp';
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 4.4, 8), this.mat(PAL.ink));
    pole.position.y = 2.2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.07), this.mat(PAL.ink));
    arm.position.set(0.33, 4.36, 0);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      this.mat(PAL.amber, { emissive: PAL.amber, emissiveIntensity: 0.9 }),
    );
    bulb.position.set(0.66, 4.28, 0);
    const glow = this.makeGlow(1.6);
    glow.material.opacity = 0.4;
    glow.position.copy(bulb.position);
    for (const m of [pole, arm, bulb, glow]) g.add(m);
    pole.castShadow = true;
    g.position.set(x, 0, z);
    this.registerGlbProp('streetlamp', g);
    return g;
  }

  // ------------------------------------------------- Sunrise Laundry (docs/30)

  /** Sunrise Laundry, opened up. A recessed open-front bay against the
   *  building face: side piers, warm interior, two washers (the near one
   *  spins while a wash runs), Sal's service counter, a teal awning and a
   *  real sign. Colliders on everything solid — an open storefront you can
   *  still walk into reads as broken, so the bay is furnished, not hollow. */
  private buildLaundromat(): void {
    const CX = -5; // bay center — same bay the flat prop occupied
    // SIDEWALK LAW: the north walking lane (z ≈ 4–7.2) stays open. The bay
    // lives between z=7.4 and the building face (z=8.0) — a recess one step
    // deep, piers flush with the face. The first bay sat 0.4 m too proud and
    // shoulder-checked everyone walking to the stoop; the E2E caught it.
    // side piers (embedded into the building face at z=8.0)
    this.solid('Laundry_Wall_W', CX - 2.925, 1.4, 7.7, 0.15, 2.8, 0.6, PAL.brick);
    this.solid('Laundry_Wall_E', CX + 2.925, 1.4, 7.7, 0.15, 2.8, 0.6, PAL.brick);
    this.deco('Laundry_Lintel', CX, 2.9, 7.7, 6.0, 0.5, 0.6, PAL.brick);
    // the interior — a warm back wall just proud of the building face
    const backMat = this.mat(PAL.interior, { emissive: PAL.amber, emissiveIntensity: 0.42 });
    this.decoMesh('Laundry_Back', new THREE.BoxGeometry(5.85, 2.8, 0.06), backMat, CX, 1.4, 7.93);
    this.deco('Laundry_Floor', CX, 0.12, 7.7, 5.85, 0.05, 0.6, 0xb9b1a6);
    // two front-loaders, portholes to the street; the near drum spins on
    // wash day. W5 (docs/47): the pair flanks the bay's east side — the
    // first draft straddled x −5, and the full room behind the bay (the
    // registry's "entrance (open bay), w 5.85") had no walk-in: the gap
    // between the two machines was 0.25 m. The center now reads as the
    // doorway it always claimed to be; the spinning near washer keeps its
    // role (the drum the E2E watches rides washer 0 wherever it stands).
    for (const [i, wx] of [[0, CX + 1.1], [1, CX + 2.3]] as const) {
      const body = this.deco(`Laundry_Washer_${i}`, wx, 0.9, 7.75, 0.95, 1.5, 0.5, 0x9a938c);
      body.castShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 8, 18), this.mat(PAL.ink));
      ring.position.set(wx, 0.85, 7.485);
      this.scene.add(ring);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 16), this.mat(0x2b2730));
      glass.rotation.x = Math.PI / 2;
      glass.position.set(wx, 0.85, 7.485);
      this.scene.add(glass);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 14), this.mat(PAL.cream));
      drum.rotation.x = Math.PI / 2;
      drum.position.set(wx, 0.85, 7.51);
      this.scene.add(drum);
      const load = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.05), this.mat(i === 0 ? PAL.coral : PAL.teal));
      load.position.set(0.15, 0, 0.03); // rides the drum's radius — orbits when it spins
      drum.add(load);
      if (i === 0) this.washerLoad = drum;
      this.colliders.push(boxFromCenter(wx, 0.9, 7.75, 0.95, 1.5, 0.5));
    }
    // a folded stack rides the far washer — the laundromat is working, even
    // now. The audit pass: three laid towels (corners askew, the top one the
    // teal of the service counter) instead of one cream cube.
    const towelLayers: Array<[number, number, number, number, number]> = [
      [0.52, 0.10, 0.42, 0.0, PAL.cream],
      [0.47, 0.09, 0.38, 0.14, 0xb9b1a6],
      [0.42, 0.09, 0.34, -0.08, PAL.teal],
    ];
    let towelY = 1.70;
    for (const [tw, th, td, rot, tcol] of towelLayers) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(tw, th, td), this.mat(tcol));
      t.position.set(CX + 0.3, towelY, 7.75);
      t.rotation.y = rot;
      t.castShadow = true;
      this.scene.add(t);
      towelY += th;
    }
    // Sal's service counter — waist-high (a real service counter), at the
    // bay's mouth; Sal reads chest-up behind it. The first counter was
    // chest-high and from the street it swallowed him whole — a head on a
    // box is not a person. (Probe: sight-line over a 1.35 m counter hides
    // everything below his chin at his depth.)
    this.solid('Laundry_Counter', CX - 2.0, 0.525, 7.55, 1.5, 1.05, 0.4, PAL.teal);
    // teal awning + real sign
    const awn = this.deco('Laundry_Awning', CX, 2.5, 7.1, 6.0, 0.09, 1.3, PAL.teal);
    awn.rotation.x = 0.3;
    awn.castShadow = true;
    this.signBoard('Laundry_Sign', D4_LAUNDRY_SIGN, 5.4, 0.8, 0.12, 768, 128, PAL.teal, PAL.cream, 56)
      .position.set(CX, 3.42, 7.7);
    // shirts on the sidewalk rack — west of the bay, tucked by the barrier
    const rack = this.makeShirtRack();
    rack.position.set(-8.55, 0.05, 7.55);
    this.scene.add(rack);
    this.colliders.push(boxFromCenter(-8.55, 0.6, 7.55, 0.6, 1.2, 0.3));
    // the city's A-frame by the crosswalk — where you'll read it, clear of
    // the crossing line (x=-5) by more than a shoulder
    const notice = this.makePermitNotice();
    notice.position.set(-4.0, 0.05, 5.8);
    notice.rotation.y = 0.12;
    this.scene.add(notice);
    this.colliders.push(boxFromCenter(-4.0, 0.5, 5.8, 0.65, 1.0, 0.3));
  }

  // ------------------------------------------------- the expanded block (docs/38)
  // Doc 37 §3A: bodega (shipped), laundromat (shipped), and now — a
  // barbershop, a real alley, a pocket park, a half-court, a street vendor.
  // "A compact, rich block beats a vast empty one": every addition is east
  // of x = 29, on land nothing authored uses.

  /** THE ALLEY — a real cut between the split halves of Bldg_N_East_B:
   *  side walls, a back wall, a lintel, gravel underfoot, open sky above.
   *  The hidden corner the bulletin board's lost cat comes back to. */
  private buildAlley(): void {
    // A-3 UNIT 7 (the shipped street's class C band, DEC-4 Option B): the
    // slot READS its registry row (ALY-01) through regShell — the footprint
    // and the 3 m open-sky law are the row's own truth; the walls sit half
    // a thickness inside the row's side faces, the back wall 0.1 shy of the
    // row's north face, the lintel caps the slot (top at the halves' first-
    // floor line), and the approach strip / bag / wire dressing is style.
    const aly = this.regShell('ALY-01');
    // gravel floor — flush with the sidewalk, no lip to trip a capsule.
    // W2 (docs/47): raised proud of the W1 yard slab, which had buried
    // these strips whole (top 0.1 over a floor that topped out at 0.06).
    this.deco('Alley_Floor', aly.x, 0.125, aly.z, aly.w, 0.05, aly.d, 0x4a4552, {});
    this.deco('Alley_Floor_2', aly.x, 0.125, 7.4, aly.w, 0.05, 1.2, 0x4a4552, {});
    // side walls (y 0–3) + back wall; the slot above y = 3 stays open — a
    // slice of sky between two sixteen-metre masses, exactly like a real
    // alley gives you
    this.solid('Alley_Wall_W', aly.x - aly.w / 2 + 0.15, aly.h / 2, aly.z, 0.3, aly.h, aly.d + 0.1, PAL.brick);
    this.solid('Alley_Wall_E', aly.x + aly.w / 2 - 0.15, aly.h / 2, aly.z, 0.3, aly.h, aly.d + 0.1, PAL.brick);
    this.solid('Alley_Back', aly.x, aly.h / 2, aly.z + aly.d / 2 - 0.1, aly.w, aly.h, 0.3, 0x6e554e);
    // the lintel ties the two building halves together over the mouth
    this.solid('Alley_Lintel', aly.x, aly.h + 0.45, aly.z, aly.w + 0.4, 1.1, aly.d + 0.8, PAL.bldg);
    // one honest trash bag — the alley is somebody's Tuesday
    this.decoMesh('Alley_Bag', new THREE.SphereGeometry(0.28, 8, 6), this.mat(PAL.ink), 31.6, 0.28, 9.9);
    // a string of dead bulbs across the mouth (unlit: the city fixes these
    // eventually) — one thin ink wire, two glass nubs
    const wire = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.015, 0.015), this.mat(PAL.ink));
    wire.position.set(aly.x, 2.82, aly.z - aly.d / 2 + 0.1);
    this.scene.add(wire);
    for (const bx of [31.4, 32.8]) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), this.mat(PAL.cream));
      bulb.position.set(bx, 2.74, aly.z - aly.d / 2 + 0.1);
      this.scene.add(bulb);
    }
  }

  /** FADE KING BARBERSHOP — a storefront on the north face (same builder as
   *  the pizza joint), striped pole on the wall west of the glass. Air pole:
   *  signs and poles stay non-solid, like every other pole on the block. */
  private buildBarbershop(): void {
    const shop = makeStorefront(this.bank, this.signMaterials.bind(this), 'FADE KING BARBERSHOP', PAL.brick, 5, 'Barber_Glass');
    shop.position.set(36.6, 0.05, 8.02);
    shop.rotation.y = Math.PI; // same lean-out fix as the pizza (W1)
    this.scene.add(shop);
    const pole = makeBarberPole(this.bank);
    pole.position.set(33.85, 1.55, 7.93);
    this.scene.add(pole);
    // two folding chairs wait against the wall between pole and glass —
    // the walk-in queue is furniture with a story
    for (const cx of [35.0, 35.8]) {
      const seat = this.deco('Barber_Chand_' + cx, cx, 0.42, 7.72, 0.5, 0.06, 0.5, 0x2b2730);
      seat.castShadow = true;
      const back = this.deco('Barber_Back_' + cx, cx, 0.72, 7.92, 0.5, 0.6, 0.06, 0x2b2730);
      back.castShadow = true;
    }
    this.colliders.push(boxFromCenter(35.4, 0.5, 7.8, 1.3, 1.0, 0.5)); // the chair pair blocks
  }

  /** THE HALF-COURT — painted key and arc on the north-east sidewalk, hoop
   *  against the building face. The commuter ped turns around at x = 38;
   *  everything here is east of the turn and ped-free.
   *  Docs/49 upgrade: the six separate paint meshes became ONE canvas-texture
   *  plane (a real court: key, FT circle, three-point arc, hash marks, wear);
   *  the hoop gained a net (it swishes), a pole pad, a caged light and the
   *  chalk tally board; chain-link encloses west + south (gate gap on the
   *  south-east — the ball can roll out of it, and the court rolls it back);
   *  the ball wears its leather and seams now. */
  private buildCourt(): void {
    // one textured plane instead of six meshes — fewer draw calls, more court
    const courtTex = new THREE.CanvasTexture(paintCourtCanvas());
    courtTex.anisotropy = 4;
    const courtMat = new THREE.MeshLambertMaterial({ map: courtTex, fog: true });
    this.scene.add(makeCourtSurface(courtMat));

    // the hoop, against the face; the rim reads from the whole sidewalk
    const hoop = makeHoop(this.bank);
    hoop.position.set(44.25, 0.05, 7.9);
    this.scene.add(hoop);
    this.colliders.push(boxFromCenter(44.25, 1.65, 7.9, 0.24, 3.3, 0.24)); // the pole blocks
    // the net hangs from the rim (rim center per interactionDefs: z 7.64)
    this.courtNet = makeNet(this.bank);
    this.courtNet.group.position.set(44.25, 2.6, 7.64);
    this.scene.add(this.courtNet.group);
    // the foam pad and the caged gooseneck — the corner dresses like itself
    const pad = makePolePad(this.bank);
    pad.position.set(44.25, 0.05, 7.9);
    this.scene.add(pad);
    const light = makeCourtLight(this.bank);
    light.group.position.set(44.25, 3.42, 7.93);
    this.scene.add(light.group);
    this.courtGlow = light.glow;
    // the chalk tally — the block keeps score on the wall by the hoop
    this.courtTally = makeTallyBoard({ makes: 0 });
    this.courtTally.mesh.position.set(45.55, 2.3, 7.92);
    this.courtTally.mesh.rotation.y = Math.PI;
    this.scene.add(this.courtTally.mesh);

    // the chain-link: west run + south run, with the open gate on the
    // south-east (the ball can escape there; CourtGame rolls it back home)
    const backstop = buildBackstop(this.scene, this.bank, {
      wx: 40.45, wz0: 4.55, wz1: 7.8,
      sx0: 40.45, sx1: 45.3, sz: 4.55,
      h: 3.0,
    });
    this.courtWeaves = backstop.weaves;
    // the fence lines are solid to bodies, transparent to the camera boom
    // (chain-link — the lens looks through the diamonds, docs/49)
    this.colliders.push({ ...boxFromCenter(40.45, 1.5, 6.175, 0.12, 3.0, 3.25), seeThroughCamera: true });
    this.colliders.push({ ...boxFromCenter(42.875, 1.5, 4.55, 4.85, 3.0, 0.12), seeThroughCamera: true });
    // the gate posts stand free (air between them — the way in)
    for (const gx of [45.3, 47.3]) {
      const gp = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 3.12, 8), this.bank.get(PAL.ink));
      gp.position.set(gx, 1.56, 4.55);
      gp.castShadow = true;
      this.scene.add(gp);
    }

    // the ball — leather and seams now, resting properly ON the slab
    // (ground 0.1 + radius 0.13). It moves when shot, so it is excluded
    // from the static bake (see bakeStatics).
    const ball = makeBasketball();
    ball.position.set(COURT_BALL_REST.x, COURT_BALL_REST.y, COURT_BALL_REST.z);
    this.scene.add(ball);
    this.ball = ball;
  }

  /** CORNER PARK — the south-east pocket: iron fence with a gate, lawn, a
   *  gravel path, two benches (the south one is sittable), the Parks sign,
   *  a trash can, and the planter that used to stand at (37, 7.6) — it
   *  moved here (the barbershop needed its storefront), so its PED
   *  bow-around entry moved with it (doc 35 §3's ghost-prop lesson). The
   *  existing hydrant (34, −4.75) and tree (38, −7) stay: the park keeps
   *  what the block already had. */
  private buildPark(): void {
    // lawn + path, receive-only, no collide (flush with the walk)
    this.deco('Park_Lawn', 39.3, 0.04, -6.15, 17.0, 0.05, 3.5, 0x3a7355, {});
    this.deco('Park_Path', 31.9, 0.045, -6.0, 2.4, 0.04, 1.1, PAL.stone, {});
    // fence: west line at x = 30.6 with a 1.6 m gate at z −6.7…−5.1
    const fenceW1 = makeFence(this.bank, 1.3);
    fenceW1.position.set(30.6, 0.05, -7.35);
    fenceW1.rotation.y = Math.PI / 2;
    this.scene.add(fenceW1);
    const fenceW2 = makeFence(this.bank, 0.8);
    fenceW2.position.set(30.6, 0.05, -4.7);
    fenceW2.rotation.y = Math.PI / 2;
    this.scene.add(fenceW2);
    this.colliders.push(boxFromCenter(30.6, 0.4, -7.35, 0.15, 0.8, 1.3));
    this.colliders.push(boxFromCenter(30.6, 0.4, -4.7, 0.15, 0.8, 0.8));
    // south fence closing the pocket at the curb line? No — the curb is the
    // park's north edge; parks open to their street. A low fence runs the
    // west line only; the lawn's ends fade into the walk.
    // benches: the street one (sittable, faces the street) + a quiet one
    const parkBench = makeBench(this.bank);
    parkBench.position.set(41.5, 0.05, -5.05);
    parkBench.rotation.y = Math.PI; // back to the lawn, face to the street
    this.scene.add(parkBench);
    this.colliders.push(boxFromCenter(41.5, 0.35, -5.05, 1.85, 0.7, 0.62));
    const quietBench = makeBench(this.bank);
    quietBench.position.set(33.7, 0.05, -7.15);
    quietBench.rotation.y = Math.PI;
    this.scene.add(quietBench);
    this.colliders.push(boxFromCenter(33.7, 0.35, -7.15, 1.85, 0.7, 0.62));
    // the Parks sign at the gate, facing the street (west)
    const sign = makeParksSign(this.bank, this.signMaterials.bind(this), 'CORNER PARK');
    sign.position.set(31.5, 0.05, -4.55);
    sign.rotation.y = Math.PI / 2;
    this.scene.add(sign);
    this.colliders.push(boxFromCenter(31.5, 0.7, -4.55, 0.4, 1.5, 0.2));
    // trash can + the relocated planter
    const can = makeTrashCan(this.bank);
    can.position.set(36.8, 0.05, -7.4);
    this.scene.add(can);
    this.colliders.push(boxFromCenter(36.8, 0.5, -7.4, 0.68, 1.0, 0.68));
    const rngPark = seededRng(20261031);
    const planterEast = makePlanter(this.bank, rngPark);
    planterEast.position.set(45.0, 0.05, -7.4);
    this.scene.add(planterEast);
    this.colliders.push(boxFromCenter(45.0, 0.25, -7.4, 1.1, 0.55, 0.55));
  }

  /** The dirty-water dog cart — south curb by the park gate, amber
   *  umbrella, gold sign. Lateral clearance to the cab's rail (z = −2) is
   *  2.55 m: the cab's half-width plus the cart's cannot reach contact. */
  private buildVendorCart(): void {
    // A-3 UNIT 7: the cart's placement AND collider read the registry row
    // (VND-01) through regShell — the cart builder's own body is the style.
    const vnd = this.regShell('VND-01');
    const cart = makeVendorCart(this.bank, this.signMaterials.bind(this), 'DIRTY WATER DOGS');
    cart.position.set(vnd.x, 0.05, vnd.z);
    cart.name = 'Dressing_VendorCart';
    this.zoneDressing.push(cart);
    this.scene.add(cart);
    this.colliders.push(boxFromCenter(vnd.x, 0.6, vnd.z, vnd.w, 1.2, vnd.d));
  }

  // ================================================================
  // ALDER HEIGHTS — W1: streets + skeleton + the Marlow row
  // (docs/45 §1 W1; every coordinate from world-registry.json — no
  // invented positions. Built before the bake: everything static here
  // merges into its district tile.)
  // ================================================================

  /** New street trees (Gable/Marlow rows + both avenues) render as
   *  instanced canopy blobs with per-tree sway and per-tree blob data —
   *  same slots as the shipped trees' canopies since the one-canosystem
   *  merge. New trees do NOT join the fade pass (their camera guard is the
   *  sidestep + z-clamp; docs/47 W1 records the tradeoff). */
  private simpleTrees: Array<{ x: number; z: number; h: number; phase: number; top: number;
    blobs: Array<{ ox: number; oy: number; oz: number; r: number; mat: 0 | 1 | 4 | 5 }> }> = [];
  private extraLeafSpots: Array<{ x: number; z: number; r: number; top: number; tints: number[] }> = [];
  /** The instanced canopy: ONE system for every tree on the block. Slots:
   *  0 leafA (0x5d7d4a) · 1 leafB (0x516e42) · 2 goldA (0xf7b32b) ·
   *  3 goldB (0xffb85c). The W1 simple rows fill slots 0/1 as before; the
   *  shipped/full/fill trees (makeTree records) join the same meshes, and
   *  the autumn golds land in 2/3. Four draw calls for every canopy on the
   *  block, main pass and shadow pass alike — the recorded Doc 07 lever
   *  (docs/47: 63 blob meshes × 2 passes → 4 × 2). */
  private canopyMeshes: Array<THREE.InstancedMesh | null> = [null, null, null, null, null, null];
  /** W16 — the curb leaf piles (build-time registry; the season applier
   *  toggles visibility — hidden is fewer draws, never more). */
  private readonly leafPiles: THREE.Mesh[] = [];
  /** W16 — the season currently applied to the dressing (idempotence
   *  law: the same season twice re-applies nothing). */
  private seasonApplied: Season | null = null;
  /** Per-instance fade alpha (the fade-on-occlude law: ONE tree dissolves,
   *  never the street). Simple rows stay at 1 forever (docs/47 W1 tradeoff). */
  private canopyFade: Array<THREE.InstancedBufferAttribute | null> = [null, null, null, null, null, null];
  private canopyBuilt = false;
  private readonly mSway = new THREE.Matrix4();
  private readonly mBlob = new THREE.Matrix4();
  private readonly mCanopy = new THREE.Matrix4();
  private readonly tV = new THREE.Vector3();
  private readonly tQ = new THREE.Quaternion();
  private readonly tE = new THREE.Euler();
  private readonly tS = new THREE.Vector3();
  private readonly tOne = new THREE.Vector3(1, 1, 1);
  private readonly qYaw = new THREE.Quaternion();
  private readonly yAxis = new THREE.Vector3(0, 1, 0);

  /** One zebra crossing: `acrossEW` crosses an E–W road (ped walks N–S,
   *  bars long in X marching in Z); `acrossNS` crosses a N–S avenue. */
  private zebra(name: string, cx: number, cz: number, dir: 'acrossEW' | 'acrossNS'): void {
    const bars = dir === 'acrossEW' ? 6 : 8; // the avenues are 10 m wide
    for (let i = 0; i < bars; i++) {
      const t = -((bars - 1) / 2) * 1.32 + i * 1.32;
      if (dir === 'acrossEW') this.deco(`${name}_${i}`, cx, 0.03, cz + t, 3.4, 0.02, 0.6, PAL.cream, {});
      else this.deco(`${name}_${i}`, cx + t, 0.03, cz, 0.6, 0.02, 3.4, PAL.cream, {});
    }
  }

  /** One new street tree: bark trunk + root flare (bake candidates) and a
   *  seeded blob record for the instanced canopy. Same shapes and rng
   *  grammar as makeTree — the silhouette is identical, the draw cost is
   *  shared. */
  private buildSimpleTree(x: number, z: number, rng: () => number): void {
    const bark = this.bank.get(0x6d5344);
    const h = 2.1 + rng() * 1.3;
    const trunk = new THREE.Mesh(SHARED_GEOS.trunk, bark);
    trunk.scale.set(1, h, 1);
    trunk.position.set(x, 0.05 + h / 2, z);
    trunk.castShadow = true;
    this.scene.add(trunk);
    const flare = new THREE.Mesh(SHARED_GEOS.cone, bark);
    flare.scale.set(0.62, 0.18, 0.62);
    flare.position.set(x, 0.05 + 0.09, z);
    this.scene.add(flare);
    const pit = makeTreePit(this.bank);
    pit.position.set(x, 0.07, z);
    this.scene.add(pit);
    this.treePits.push({ x, z });
    // the species roll (W8): a position hash picks the tone — locust green
    // (0/1, the shipped pair), a copper elm (4, ~1 in 7 trees), a dark pine
    // (5, ~1 in 11). NO rng draws: the seeded rows' shapes stay identical.
    const roll = Math.abs(Math.round(x * 13.7 + z * 7.3)) % 18;
    const species: 0 | 1 | 4 | 5 = roll < 12 ? 0 : roll < 14 ? 1 : roll < 16 ? 4 : 5;
    const blobs: Array<{ ox: number; oy: number; oz: number; r: number; mat: 0 | 1 | 4 | 5 }> = [];
    let top = h;
    for (let i = 0; i < 3; i++) {
      const r = 0.85 + rng() * 0.55;
      const cy = r * 0.45 + rng() * 0.5;
      const ox = (rng() - 0.5) * 0.9;
      const oz = (rng() - 0.5) * 0.9;
      blobs.push({ ox, oy: cy, oz, r, mat: i === 0 ? species : (rng() < 0.5 ? species : (species === 0 ? 1 : species)) });
      top = Math.max(top, h + cy + r * 0.9);
    }
    this.simpleTrees.push({ x, z, h, phase: rng() * Math.PI * 2, top, blobs });
    this.extraLeafSpots.push({ x, z, r: 1.3, top, tints: [0x5d7d4a, 0x516e42, 0x516e42] });
    // the trunk is wood — same collider grammar as the shipped row
    this.colliders.push(boxFromCenter(x, 1.15, z, 0.36, 2.2, 0.36));
    // the camera's sight-line guard sees every canopy
    this.canopySpheresCache.push({ x, y: top - 0.9, z, r: 2.15 });
  }

  // ---- A-3: the registry geometry flip (DEC-4 Option B, ruled 2026-11-07)
  // A flipped building's PLACEMENT and DIMENSIONS come from its registry
  // row at runtime (footprint x/z/w/d + height); the look stays the
  // authored builder code (the style builders are code, not the thing
  // being flipped). Fallback law: a registry row without footprint+height
  // throws LOUDLY — the flip never invents geometry to fill a gap
  // (wc-07's no-coordinates law, extended to rendering).
  private regShells: Map<string, { x: number; z: number; w: number; d: number; h: number }> | null = null;
  private regStatuses: Map<string, string | undefined> | null = null;
  private ensureRegShells(): void {
    if (!this.regShells) {
      this.regShells = new Map();
      this.regStatuses = new Map();
      for (const b of loadRegistry().allBuildings()) {
        const fp = b.footprint;
        if (fp && b.height !== undefined && b.height > 0) {
          this.regShells.set(b.id, { x: fp.x, z: fp.z, w: fp.w, d: fp.d, h: b.height });
          this.regStatuses.set(b.id, b.status);
        }
      }
    }
  }
  /** The registry shell of a flipped building — throws when the row is
   *  missing or lacks footprint/height, so a data gap can never render,
   *  and when the row still reads 'planned' (A-3 unit 4, 2026-11-08: the
   *  status column was repaired the same day — a flipped band's row must
   *  never be able to regress to unbuilt without failing loudly here). */
  private regShell(registryId: string): { x: number; z: number; w: number; d: number; h: number } {
    this.ensureRegShells();
    const s = this.regShells?.get(registryId);
    if (!s) throw new Error(`[A-3] registry building "${registryId}" has no footprint+height — the flip never invents geometry`);
    if (this.regStatuses!.get(registryId) === 'planned') {
      throw new Error(`[A-3] registry building "${registryId}" is still 'planned' — the flip never renders an unbuilt row (DEC-4 §5)`);
    }
    return s;
  }

  /** The registry footprint of a flipped SLOT row (h 0 — a cut or a station
   *  anchor, not a mass: ALY-02 the garden slot, SUB-TS the far station).
   *  Same refusals as regShell minus the height requirement — the row's
   *  footprint is the truth even where no mass stands. */
  private regFootprint(registryId: string): { x: number; z: number; w: number; d: number } {
    this.ensureRegShells();
    const s = this.regShells?.get(registryId);
    if (s) return s;
    const b = loadRegistry().allBuildings().find((x) => x.id === registryId);
    if (!b || !b.footprint) throw new Error(`[A-3] registry building "${registryId}" has no footprint — the flip never invents geometry`);
    if (b.status === 'planned') {
      throw new Error(`[A-3] registry building "${registryId}" is still 'planned' — the flip never renders an unbuilt row (DEC-4 §5)`);
    }
    return { x: b.footprint.x, z: b.footprint.z, w: b.footprint.w, d: b.footprint.d };
  }

  private buildAlderHeightsW1(): void {
    const CURB = 0x8f8a82;
    const rng = seededRng(20261101);

    // ---- A. Kestrel slabs → ±84 (butt-jointed extensions, same levels) --
    this.solid('Road_W', -67, -0.1, 0, 34, 0.2, 8, PAL.road, { receive: true, cast: false });
    this.solid('Road_E', 67, -0.1, 0, 34, 0.2, 8, PAL.road, { receive: true, cast: false });
    // sidewalks: the avenue road mouths (x −76..−68 / 68..76) cut the walks
    for (const [sz, nm] of [[6, 'Sidewalk_N_ext'], [-6, 'Sidewalk_S_ext']] as const) {
      this.solid(`${nm}_W1`, -80, -0.05, sz, 8, 0.3, 4, PAL.walk, { receive: true, cast: false });
      this.solid(`${nm}_W2`, -59, -0.05, sz, 18, 0.3, 4, PAL.walk, { receive: true, cast: false });
      this.solid(`${nm}_E1`, 80, -0.05, sz, 8, 0.3, 4, PAL.walk, { receive: true, cast: false });
      this.solid(`${nm}_E2`, 59, -0.05, sz, 18, 0.3, 4, PAL.walk, { receive: true, cast: false });
    }
    // curbs: XW-COURT gap splits the shipped east run — the shipped curb
    // solids are REPLACED by this full layout (same color/size/y grammar)
    const deadCurbs: THREE.Object3D[] = [];
    for (const c of this.scene.children) {
      if (c.name.startsWith('Curb_')) deadCurbs.push(c);
    }
    for (const c of deadCurbs) {
      this.scene.remove(c);
      this.disposeTree(c);
    }
    const curbRuns: Array<[string, number, number, number]> = [
      ['K_N_a', -80.6, 4.08, 6.8], ['K_N_b', -37.4, 4.08, 58.8],
      ['K_N_c', 16.15, 4.08, 34.3], ['K_N_d', 51.75, 4.08, 30.1], ['K_N_e', 80.6, 4.08, 6.8],
      ['K_S_a', -80.6, -4.08, 6.8], ['K_S_b', -37.4, -4.08, 58.8],
      ['K_S_c', 16.15, -4.08, 34.3], ['K_S_d', 51.75, -4.08, 30.1], ['K_S_e', 80.6, -4.08, 6.8],
    ];
    for (const [nm, cx, cz, len] of curbRuns) {
      this.solid(`Curb_${nm}`, cx, 0.065, cz, len, 0.13, 0.5, CURB, { collide: false });
    }

    // ---- B+C. the four new streets (roads dip 5 mm under the E–W roads
    // at junctions — invisible, kills the coplanar shimmer) ----------------
    for (const cx of [-72, 72]) {
      const cn = cx < 0 ? 'J' : 'S';
      this.solid(`Road_${cn}`, cx, -0.105, 0, 10, 0.19, 96, PAL.road, { receive: true, cast: false });
      for (const side of [-1, 1] as const) {
        const wx = cx + side * 8;
        const wn = side < 0 ? 'W' : 'E';
        // avenue walks live BETWEEN the E–W streets; the corners belong to
        // Kestrel's/Gable's/Marlow's own walks
        this.solid(`Walk_${cn}${wn}_a`, wx, -0.05, 22, 8, 0.3, 28, PAL.walk, { receive: true, cast: false });
        this.solid(`Walk_${cn}${wn}_b`, wx, -0.05, -22, 8, 0.3, 28, PAL.walk, { receive: true, cast: false });
        // avenue curbs: segments between the street mouths (roads ±4, 36..44, −44..−36)
        for (const [z0, z1] of [[8, 35.83], [44.17, 48], [-35.83, -4], [-48, -44.17]] as const) {
          this.solid(`Curb_${cn}${wn}_${z0}`, cx + side * 7.92, 0.065, (z0 + z1) / 2, 0.5, 0.13, z1 - z0, CURB, { collide: false });
        }
      }
    }
    for (const [cz, nm] of [[40, 'G'], [-40, 'M']] as const) {
      this.solid(`Road_${nm}`, 0, -0.105, cz, 168, 0.19, 8, PAL.road, { receive: true, cast: false });
      for (const [wz, side] of [[cz + 6, 'N'], [cz - 6, 'S']] as const) {
        this.solid(`Walk_${nm}${side}_a`, -80, -0.05, wz, 8, 0.3, 4, PAL.walk, { receive: true, cast: false });
        this.solid(`Walk_${nm}${side}_b`, 0, -0.05, wz, 136, 0.3, 4, PAL.walk, { receive: true, cast: false });
        this.solid(`Walk_${nm}${side}_c`, 80, -0.05, wz, 8, 0.3, 4, PAL.walk, { receive: true, cast: false });
      }
      for (const [x0, x1] of [[-84, -77.2], [-66.8, 66.8], [77.2, 84]] as const) {
        this.solid(`Curb_${nm}_N_${x0}`, (x0 + x1) / 2, 0.065, cz + 3.92, x1 - x0, 0.13, 0.5, CURB, { collide: false });
        this.solid(`Curb_${nm}_S_${x0}`, (x0 + x1) / 2, 0.065, cz - 3.92, x1 - x0, 0.13, 0.5, CURB, { collide: false });
      }
    }

    // ---- D. crosswalks (registry crosswalks[]; XW-CANON untouched) ------
    for (const ix of [-72, 72] as const) {
      this.zebra(`XW_K${ix < 0 ? 'J' : 'S'}_E`, ix + 3.5, 0, 'acrossEW');
      this.zebra(`XW_K${ix < 0 ? 'J' : 'S'}_W`, ix - 3.5, 0, 'acrossEW');
      this.zebra(`XW_K${ix < 0 ? 'J' : 'S'}_N`, ix, 4.5, 'acrossNS');
      this.zebra(`XW_K${ix < 0 ? 'J' : 'S'}_S`, ix, -4.5, 'acrossNS');
    }
    for (const [ix, iz, tag] of [[-72, 40, 'GJ'], [72, 40, 'GS'], [-72, -40, 'MJ'], [72, -40, 'MS']] as const) {
      this.zebra(`XW_${tag}_E`, ix + 3.5, iz, 'acrossEW');
      this.zebra(`XW_${tag}_W`, ix - 3.5, iz, 'acrossEW');
      this.zebra(`XW_${tag}_N`, ix, iz + 4.5, 'acrossNS');
      this.zebra(`XW_${tag}_S`, ix, iz - 4.5, 'acrossNS');
    }
    this.zebra('XW_COURT', 35, 0, 'acrossEW');

    // ---- E. block interior yards (W2 furnishes them; the ground reads now)
    this.solid('Yard_N', 0, 0.0, 20, 120, 0.2, 24, 0x3a7355, { receive: true, cast: false });
    this.solid('Yard_S', 0, 0.0, -20, 120, 0.2, 24, 0x3a7355, { receive: true, cast: false });

    // ---- G. SUB-02 — the south control house (props.makeControlHouse) ----
    // A-3 flipped (2026-11-08): the placement and the collider box READ the
    // registry (SUB-02 — fp + height); the authored pavilion geometry (the
    // style builder) stays.
    const sub2reg = this.regShell('SUB-02');
    const sub2 = makeControlHouse(this.bank, this.signMaterials.bind(this));
    sub2.position.set(sub2reg.x, 0.05, sub2reg.z);
    this.scene.add(sub2);
    this.colliders.push(boxFromCenter(sub2reg.x, sub2reg.h / 2, sub2reg.z, sub2reg.w, sub2reg.h, sub2reg.d));

    // ---- H. the shells: corner infills + the Marlow row ------------------
    // KTN-00W — the Corner House (chamfer pier toward the KJ intersection)
    // A-3 flipped (2026-11-08): the mass, storefront anchor, window grid,
    // crown, chamfer pier and water tower READ the registry (KTN-00W);
    // the style constants (window rhythm, insets, the 45° cut) stay code.
    const ktw = this.regShell('KTN-00W');
    this.solid('KTN_00W', ktw.x, ktw.h / 2, ktw.z, ktw.w, ktw.h, ktw.d, PAL.bldg2);
    const ch = makeStorefront(this.bank, this.signMaterials.bind(this), 'CORNER HOUSE', PAL.brick, 8);
    ch.position.set(ktw.x, 0.05, ktw.z - ktw.d / 2 + 0.02);
    ch.rotation.y = Math.PI;
    this.scene.add(ch);
    for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) {
      this.decoMesh(`KTN00W_Win_${f}_${c}`, new THREE.BoxGeometry(1.2, 1.6, 0.08), this.bank.get(PAL.windowDim), ktw.x - ktw.w / 2 + 1.6 + c * 3.4, 7.2 + f * 2.9, ktw.z - ktw.d / 2 - 0.08);
    }
    this.deco('KTN00W_Crown', ktw.x, ktw.h - 0.6, ktw.z, ktw.w + 0.2, 0.8, ktw.d + 0.2, PAL.stone, {});
    // the corner-store cut: a 45° pier flush with the SW corner faces
    const chamfer = this.deco('KTN00W_Chamfer', ktw.x - ktw.w / 2 + 0.32, 1.9, ktw.z - ktw.d / 2 + 0.32, 0.55, 3.8, 0.55, PAL.brick, {});
    chamfer.rotation.y = Math.PI / 4;
    this.waterTower(ktw.x, ktw.h, ktw.z - 1.5, 1.4); // LMK-03: the corners carry tanks too (the tank anchors 1.5 m south of the footprint center)

    // KTN-06 — 6 Kestrel St East, the café shell (papered, FOR RENT)
    // A-3 flipped (2026-11-08): the mass, window grid, papers, sign, door
    // and water tower READ the registry (KTN-06); the style constants
    // (paper insets, sign/door offsets, the tower's center-anchored 1.5 m
    // south offset) stay code.
    const kt6 = this.regShell('KTN-06');
    this.solid('KTN_06', kt6.x, kt6.h / 2, kt6.z, kt6.w, kt6.h, kt6.d, PAL.brick);
    for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) {
      this.decoMesh(`KTN06_Win_${f}_${c}`, new THREE.BoxGeometry(1.2, 1.6, 0.08), this.bank.get(PAL.windowDim), kt6.x - kt6.w / 2 + 1.6 + c * 3.4, 7.2 + f * 2.9, kt6.z - kt6.d / 2 - 0.08);
    }
    // the vacant ground floor: cream paper over the glass, day-keyed to lit
    // when the café opens (dressing hooks ride the registry, W5)
    this.deco('KTN06_Paper_L', kt6.x - kt6.w / 2 + 2.2, 1.6, kt6.z - kt6.d / 2 - 0.1, 2.6, 3.2, 0.06, PAL.cream, {});
    this.deco('KTN06_Paper_R', kt6.x + kt6.w / 2 - 2.2, 1.6, kt6.z - kt6.d / 2 - 0.1, 2.6, 3.2, 0.06, PAL.cream, {});
    this.signBoard('KTN06_ForRent', 'FOR RENT', 1.5, 1.0, 0.06, 256, 160, PAL.cream, PAL.ink, 42)
      .position.set(kt6.x, 1.9, kt6.z - kt6.d / 2 - 0.14);
    this.deco('KTN06_Door', kt6.x, 1.4, kt6.z - kt6.d / 2 - 0.05, 1.4, 2.8, 0.12, 0x6e554e, {});
    this.waterTower(kt6.x, kt6.h, kt6.z - 1.5, 1.4);

    // the Marlow row: three shopfronts (doors and windows face Marlow —
    // the registry's entrance rows are corrected to z −32)
    // A-3 flipped (2026-11-08): the three shop masses, storefront anchors,
    // window rows and the bakery's bagel READ the registry (SMB-01/02/03);
    // the style constants (sign widths, window rhythm) stay code.
    const marlowShops: Array<[string, string, number, string]> = [
      ['SMB_01', 'MARLOW BAKERY', PAL.bldg2, 'Bakery_Glass'],
      ['SMB_02', 'B-SIDE RECORDS', PAL.brick, 'Records_Glass'],
      ['SMB_03', 'KESTREL HARDWARE', PAL.bldg, ''],
    ];
    for (const [id, label, col, glassName] of marlowShops) {
      const reg = this.regShell(id.replace('_', '-'));
      this.solid(id, reg.x, reg.h / 2, reg.z, reg.w, reg.h, reg.d, col);
      const shop = makeStorefront(this.bank, this.signMaterials.bind(this), label, PAL.teal, reg.w - 1, glassName || undefined);
      shop.position.set(reg.x, 0.05, reg.z - reg.d / 2 - 0.02);
      shop.rotation.y = Math.PI; // the street is SOUTH of the row
      this.scene.add(shop);
      for (let c = 0; c < 2; c++) {
        this.decoMesh(`${id}_Win_${c}`, new THREE.BoxGeometry(1.2, 1.6, 0.08), this.bank.get(PAL.windowDim), reg.x - reg.w / 2 + 1.6 + c * (reg.w - 3.2), 8.6, reg.z - reg.d / 2 + 0.06);
      }
    }
    // the bakery's bagel silhouette in the window (Doc 04 object canon #8)
    const smb1 = this.regShell('SMB-01');
    const bagel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.13, 8, 18), this.bank.get(0xd9a05b));
    bagel.position.set(smb1.x, 1.7, smb1.z - smb1.d / 2 - 0.3);
    this.scene.add(bagel);

    // the Marlow walk-ups — A-3 flipped (2026-11-07): placement and
    // dimensions READ the registry (PWK-01/02/03); the hand constants
    // retired. The window rows and the stoops derive from the same
    // registry numbers (the look stays the authored builder code).
    const marlowWalkups: Array<[string, string, number]> = [
      ['PWK_01', 'PWK-01', PAL.bldg], ['PWK_02', 'PWK-02', PAL.bldg2], ['PWK_03', 'PWK-03', PAL.bldg],
    ];
    const pwkDoors = [PAL.teal, PAL.coral, 0x6d4c7d];
    let pwkDoorIdx = 0;
    for (const [id, regId, col] of marlowWalkups) {
      const reg = this.regShell(regId);
      this.solid(id, reg.x, reg.h / 2, reg.z, reg.w, reg.h, reg.d, col);
      for (let f = 0; f < 4; f++) for (let c = 0; c < 3; c++) {
        this.decoMesh(`${id}_Win_${f}_${c}`, new THREE.BoxGeometry(1.1, 1.7, 0.08), this.bank.get(PAL.windowDim), reg.x - reg.w / 2 + 1.5 + c * ((reg.w - 3) / 2), 3.4 + f * 2.9, reg.z - reg.d / 2 + 0.06);
      }
      const stoop = makeBrownstoneStoop(this.bank, pwkDoors[pwkDoorIdx++ % 3]);
      stoop.position.set(reg.x, 0, reg.z - reg.d / 2 - 0.6);
      this.scene.add(stoop);
    }

    // ---- I. trees — the registry's Kestrel fills (full fade-capable trees)
    // (44, 7.48) → (48.8, 7.48): the fill landed INSIDE the half-court
    // (docs/49) — a street tree growing through the key, in front of the
    // rim. Same row, same law, just east of the court's east fence line.
    // One-line coordinate move for Main Agent review (docs/49 §6).
    const kestrelFillN: Array<[number, number]> = [[-58, 7.48], [-46, 7.48], [48.8, 7.48], [56, 7.48]];
    const kestrelFillS: Array<[number, number]> = [[-56, -7.0], [8, -7.0], [48, -7.0]];
    for (const [tx, tz] of [...kestrelFillN, ...kestrelFillS]) {
      const pit = makeTreePit(this.bank);
      pit.position.set(tx, 0.07, tz);
      this.scene.add(pit);
      this.treePits.push({ x: tx, z: tz });
      const t = makeTree(this.bank, rng, false);
      t.group.position.set(tx, 0.05, tz);
      t.group.rotation.y = rng() * Math.PI * 2;
      this.scene.add(t.group);
      // this tree's canopy sphere lands right below — its cache index is
      // the length BEFORE the push
      this.trees.push({ group: t.group, x: tx, z: tz, baseY: 0.05, h: t.h,
        yaw: t.group.rotation.y, phase: rng() * Math.PI * 2, fade: 1,
        sphereIndex: this.canopySpheresCache.length, top: t.top,
        blobs: t.blobs.map((b) => ({ ...b, idx: -1 })) });
      const trunkHalf = 0.18;
      const zMax = tz > 6 ? 8.0 : tz + trunkHalf;
      const zSpan = zMax - (tz - trunkHalf);
      this.colliders.push(boxFromCenter(tx, 1.1, (tz - trunkHalf + zMax) / 2, 0.36, 2.2, zSpan));
      this.canopySpheresCache.push({ x: tx, y: t.top - 0.9, z: tz, r: 2.15 });
      this.extraKestrelPedBodies.push([tx, tz]);
    }
    // the rows: honey locusts on Gable/Marlow, plane trees on the avenues
    const gableS = [-70, -58, -46, -38, -31, -23.5, -16, -4, 8, 20, 32, 44, 56, 64];
    const gableN = [-70, -58, -46, -34, -22, -10, 6, 18, 30, 42, 54, 66];
    const marlowN = [-70, -58, -44, -40, -29, -21, -12, 0, 11, 23, 35, 47, 59];
    const marlowS = [-70, -58, -46, -34, -22, -10, 6, 18, 30, 42, 54, 66];
    for (const tx of gableS) this.buildSimpleTree(tx, 32.6, rng);
    for (const tx of gableN) this.buildSimpleTree(tx, 47.4, rng);
    for (const tx of marlowN) this.buildSimpleTree(tx, -32.6, rng);
    for (const tx of marlowS) this.buildSimpleTree(tx, -47.4, rng);
    for (const ax of [-77.5, -66.5]) for (const tz of [-30, -18, 10, 22, 30]) this.buildSimpleTree(ax, tz, rng);
    for (const ax of [66.5, 77.5]) for (const tz of [-30, -18, 10, 22, 30]) this.buildSimpleTree(ax, tz, rng);

    // ---- J. lamps, hydrants, bins, the terminal curb bay -----------------
    const lampFace = this.bank.get(PAL.taxi).clone();
    lampFace.emissive = new THREE.Color(PAL.taxi);
    lampFace.emissiveIntensity = 0.35;
    const newLamps: Array<[number, number, number]> = [
      [-66, 7.42, Math.PI / 2], [48, 7.42, Math.PI / 2], [78, 7.42, Math.PI / 2],
      [-66, -7.35, -Math.PI / 2], [12, -7.35, -Math.PI / 2], [62, -7.35, -Math.PI / 2],
      [-77.5, 28, 0], [-66.5, -28, Math.PI], [77.5, 28, Math.PI], [66.5, -28, 0],
      [-24, 47.42, Math.PI / 2], [36, 32.58, -Math.PI / 2],
      [-8, -32.58, Math.PI / 2], [28, -47.42, -Math.PI / 2],
    ];
    newLamps.forEach(([lx, lz, lyaw], li) => {
      const lamp = makeStreetlight(this.bank, lampFace);
      lamp.position.set(lx, 0.05, lz);
      lamp.rotation.y = lyaw;
      lamp.name = `Streetlight_${8 + li}`; // shipped 0..3 stay canonical
      this.scene.add(lamp);
      this.colliders.push(boxFromCenter(lx, 2.6, lz, 0.24, 5.2, 0.24));
    });
    // W8 (2026-11-12): the west hydrant slides (−60 → −61.6) — its old
    // curb spot pinched the new station corridor's west exit against the
    // control house face (0.63 m — no capsule fits; the walk-ability
    // probe's corridor sweep caught it). Still a curb hydrant, off the
    // through-path.
    for (const [hx, hz] of [[-61.6, -4.55], [-10, 43.45], [10, -35.25], [-30, 4.55]] as const) {
      const hyd = makeHydrant(this.bank);
      hyd.position.set(hx, 0.05, hz);
      this.scene.add(hyd);
      this.colliders.push(boxFromCenter(hx, 0.425, hz, 0.45, 0.85, 0.45));
    }
    for (const [bx, bz] of [[-69.5, 7.55], [69.5, -7.55]] as const) {
      const can = makeTrashCan(this.bank); can.position.set(bx, 0.05, bz); this.scene.add(can);
      const rec = makeRecycleBin(this.bank); rec.position.set(bx + 0.85, 0.05, bz); this.scene.add(rec);
      this.colliders.push(boxFromCenter(bx + 0.42, 0.5, bz, 1.56, 1.0, 0.74));
    }
    // BUS-02 — the terminal curb bay: paint + the M121 flag (the bus is W4)
    this.deco('BUS02_Bay', -30, 0.02, 3.4, 12, 0.02, 0.5, PAL.taxi, {});
    const m121 = makePoleSign(this.bank, this.signMaterials.bind(this), 'M121', { w: 0.8, h: 0.3, y: 3.0 });
    m121.position.set(-30, 0.05, 7.35);
    this.scene.add(m121);
  }

  // ================================================================
  // ALDER HEIGHTS — W2: the Gable row + the interior parks + shortcuts
  // (docs/45 §1 W2; every footprint from world-registry.json. The two
  // registry-vs-shipped conflicts this phase resolved are recorded in
  // docs/47 W2 and corrected in the registry, same as W1's entrance law.)
  // ================================================================

  /** W2, section A — THE GARDEN SLOT (the real cut, x 6.5..9, z 8..20).
   *  The registry planned this slot at x −3, which is inside the laundry
   *  building: it would have sliced the shipped bay (Sal, the washers, the
   *  permit beat) and the planned LAUNDRY-INT shell with it. The docs' own
   *  words — "between the laundry and ginkgo buildings" — point at their
   *  shared seam, so the cut lands at x 6.5..9: east of the bay (8.5 m
   *  clear), west of the ginkgo building's windows, LAUNDRY-INT untouched.
   *  Same grammar as the shipped alley: a party-wall slot with open sky
   *  above, gravel underfoot, a lintel over the mouth. */
  private buildGardenSlot(): void {
    // A-3 UNIT 8 (the shipped street's class B band, DEC-4 Option B): the
    // laundry mass READS its registry row (KTN-02) through regShell and the
    // slot READS its row (ALY-02) through regFootprint — the cut lands
    // between the row's east face and the ginkgo building's west face (the
    // registry's own street plan: KTN-02 west, ALY-02 the slot, KTN-03
    // east), LAUNDRY-INT untouched. The constructor's old dead mass
    // (Bldg_N_East_A, retired here since the W2 decomposition) is gone —
    // the west half builds ONCE, from the row; the gravel/lintel dressing
    // rides the slot row, the open-sky gap is the slot row's own truth.
    const ktn2 = this.regShell('KTN-02');
    const aly2 = this.regFootprint('ALY-02');
    this.solid('Bldg_N_East_A_West', ktn2.x, ktn2.h / 2, ktn2.z, ktn2.w, ktn2.h, ktn2.d, PAL.bldg2);
    // gravel floor, a hair PROUD of the yard slab (top 0.1 — the W1 yard
    // buried the first draft at 0.085; the parks' proud-slab grammar applies)
    this.deco('GardenSlot_Floor_a', aly2.x, 0.125, aly2.z - aly2.d / 4, aly2.w, 0.05, aly2.d / 2, 0x4a4552, {});
    this.deco('GardenSlot_Floor_b', aly2.x, 0.125, aly2.z + aly2.d / 4, aly2.w, 0.05, aly2.d / 2, 0x4a4552, {});
    // the lintel ties the two masses together over the mouth (its rise and
    // depth are the mouth's own style; its x/w ride the slot row)
    this.solid('GardenSlot_Lintel', aly2.x, 3.55, aly2.z - aly2.d / 2 + 0.4, aly2.w + 0.6, 1.1, 1.6, PAL.bldg2);
  }

  /** W2, section B — R-ALLEY: the shipped slot opens north. The back wall
   *  (the alley's dead end since docs/38) retires and the lane runs between
   *  the two split-mass faces to the yard, with the registry's iron gate at
   *  z 14.5 pinned open. The cat corner keeps its bag and its dead bulbs. */
  private buildAlleyLane(): void {
    const back = this.scene.children.find((c) => c.name === 'Alley_Back');
    if (back) {
      this.scene.remove(back);
      (back as THREE.Mesh).geometry.dispose();
      const ci = this.colliders.findIndex((b) =>
        Math.abs(b.minX - 30.7) < 0.01 && Math.abs(b.maxX - 33.5) < 0.01
        && Math.abs(b.minZ - 10.35) < 0.01 && Math.abs(b.maxZ - 10.65) < 0.01);
      if (ci >= 0) this.colliders.splice(ci, 1);
    }
    // the service lane: gravel, the buildings' own faces for walls (raised
    // proud of the yard slab — same W1-burial fix as the slot floor)
    this.deco('Alley_Lane_a', 32.1, 0.125, 13, 2.8, 0.05, 5, 0x4a4552, {});
    this.deco('Alley_Lane_b', 32.1, 0.125, 18, 2.8, 0.05, 4, 0x4a4552, {});
    // the alley gate (registry: 32.1, 14.5) — posts collide, wings pinned.
    // NO rotation: the gate spans X (across the lane); rotating it π/2 put
    // its posts mid-lane and the walk shot caught the jumble.
    const gate = makeParkGate(this.bank, 1.8);
    gate.position.set(32.1, 0.15, 14.5);
    this.scene.add(gate);
    for (const px of [31.08, 33.12]) {
      this.colliders.push(boxFromCenter(px, 1.0, 14.5, 0.2, 2.0, 0.2));
    }
  }

  /** W2, section C — KESTREL GREEN (PRK-GREEN): the reading park. Registry
   *  layout verbatim: lawn, gravel path, three benches, four trees, the
   *  pergola, three lights, two bins. Entries: the alley lane (SE), the
   *  garden slot (W), and the Gable gate at (18, 31). */
  private buildKestrelGreen(): void {
    const rng = seededRng(20261102);
    // tended lawn + path, a hair proud of the yard slab (top 0.1)
    this.deco('Green_Lawn', 18.5, 0.125, 25.5, 25, 0.05, 11, 0x3a7355, { });
    this.deco('Green_Path', 18.5, 0.155, 24, 21, 0.05, 1.4, PAL.stone, {});
    // the Gable gate + the Parks sign facing the street
    const gGate = makeParkGate(this.bank, 1.8);
    gGate.position.set(18, 0.15, 31);
    this.scene.add(gGate);
    for (const px of [16.98, 19.02]) {
      this.colliders.push(boxFromCenter(px, 1.0, 31, 0.2, 2.0, 0.2));
    }
    const sign = makeParksSign(this.bank, this.signMaterials.bind(this), 'KESTREL GREEN');
    sign.position.set(19.9, 0.15, 31.2);
    this.scene.add(sign);
    this.colliders.push(boxFromCenter(19.9, 0.7, 31.2, 0.4, 1.5, 0.2));
    // benches: (12, 22.5) faces the path; (24, 25.5) faces the lawn south;
    // (18, 21.5) faces south (registry layout)
    for (const [bx, bz, byaw] of [[12, 22.5, 0], [24, 25.5, Math.PI], [18, 21.5, Math.PI]] as const) {
      const b = makeBench(this.bank);
      b.position.set(bx, 0.15, bz);
      b.rotation.y = byaw;
      this.scene.add(b);
      this.colliders.push(boxFromCenter(bx, 0.45, bz, 1.85, 0.7, 0.62));
    }
    // four full trees — fade-capable like the shipped 12, green like the row
    const GREEN_TINTS = [0x5d7d4a, 0x516e42, 0x516e42];
    for (const [tx, tz] of [[10, 28.5], [16, 29], [23, 28.8], [28.5, 27]] as const) {
      const pit = makeTreePit(this.bank);
      pit.position.set(tx, 0.16, tz);
      this.scene.add(pit);
      this.treePits.push({ x: tx, z: tz });
      const t = makeTree(this.bank, rng, false);
      t.group.position.set(tx, 0.15, tz);
      t.group.rotation.y = rng() * Math.PI * 2;
      this.scene.add(t.group);
      this.trees.push({ group: t.group, x: tx, z: tz, baseY: 0.15, h: t.h,
        yaw: t.group.rotation.y, phase: rng() * Math.PI * 2, fade: 1,
        sphereIndex: this.canopySpheresCache.length, top: t.top,
        blobs: t.blobs.map((b) => ({ ...b, idx: -1 })) });
      this.colliders.push(boxFromCenter(tx, 1.2, tz, 0.36, 2.2, 0.36));
      this.canopySpheresCache.push({ x: tx, y: t.top - 0.75, z: tz, r: 2.15 });
      this.extraLeafSpots.push({ x: tx, z: tz, r: 1.5, top: t.top, tints: GREEN_TINTS });
    }
    // the pergola (19.5, 27.5, 4.5 × 3, h 2.6) — posts block, shade doesn't
    const per = makePergola(this.bank);
    per.position.set(19.5, 0.15, 27.5);
    this.scene.add(per);
    for (const px of [-1.95, 1.95]) for (const pz of [-1.2, 1.2]) {
      this.colliders.push(boxFromCenter(19.5 + px, 1.3, 27.5 + pz, 0.24, 2.6, 0.24));
    }
    // three park lights + two bins (registry layout)
    const lampFace = this.bank.get(PAL.taxi).clone();
    lampFace.emissive = new THREE.Color(PAL.taxi);
    lampFace.emissiveIntensity = 0.35;
    for (const [lx, lz] of [[9, 23], [20, 21], [29, 23]] as const) {
      const lamp = makeStreetlight(this.bank, lampFace);
      lamp.position.set(lx, 0.15, lz);
      this.scene.add(lamp);
      this.colliders.push(boxFromCenter(lx, 2.65, lz, 0.24, 5.2, 0.24));
    }
    for (const [bx, bz] of [[11, 25.2], [27.5, 22]] as const) {
      const can = makeTrashCan(this.bank);
      can.position.set(bx, 0.15, bz);
      this.scene.add(can);
      this.colliders.push(boxFromCenter(bx, 0.55, bz, 0.68, 1.0, 0.68));
    }
  }

  /** W2, section D — THE GABLE GARDEN (GRD-GABLE). Registry layout, with
   *  two build corrections recorded in docs/47: the west fence sits at
   *  x −8.4 (flush with GRB-05's face — the registry bbox x −10 overlapped
   *  the row by 1.6 m), and the gate faces EAST at (4, 24) onto the strip
   *  between the garden and Kestrel Green (the planned south gate at x −3
   *  opened into the laundry building's rear wall). */
  private buildGableGarden(): void {
    const rng = seededRng(20261103);
    // garden ground + the path from the gate to the beds
    this.deco('Garden_Ground', -2.2, 0.125, 25, 12.4, 0.05, 10, 0x3a7355, {});
    this.deco('Garden_Path', -2.2, 0.155, 24.4, 12, 0.05, 1.0, PAL.stone, {});
    // the strip between garden and green: two parks, one step across
    this.deco('Garden_Strip', 5, 0.135, 24, 2, 0.05, 6, PAL.stone, {});
    // fences: north run + east run with the gate gap (W wall is GRB-05,
    // S wall is the laundry building's rear)
    const fN = makeFence(this.bank, 12.4);
    fN.position.set(-2.2, 0.15, 30);
    this.scene.add(fN);
    this.colliders.push(boxFromCenter(-2.2, 0.55, 30, 12.4, 0.8, 0.15));
    for (const [cz, len] of [[21.55, 3.1], [27.45, 5.1]] as const) {
      const fE = makeFence(this.bank, len);
      fE.position.set(4, 0.15, cz);
      fE.rotation.y = Math.PI / 2;
      this.scene.add(fE);
      this.colliders.push(boxFromCenter(4, 0.55, cz, 0.15, 0.8, len));
    }
    const gGate = makeParkGate(this.bank, 1.6);
    gGate.position.set(4, 0.15, 24);
    gGate.rotation.y = Math.PI / 2;
    this.scene.add(gGate);
    for (const pz of [23.08, 24.92]) {
      this.colliders.push(boxFromCenter(4, 1.0, pz, 0.2, 2.0, 0.2));
    }
    // the garden's own board (sign factory, mounted on the east fence)
    const board = this.signBoard('Garden_Sign', 'GABLE GARDEN', 1.5, 0.42, 0.06, 320, 96, 0x1f6f5e, PAL.cream, 40);
    board.position.set(4.05, 1.45, 25.6);
    board.rotation.y = Math.PI / 2; // faces the strip / the green
    this.scene.add(board);
    // four raised beds (west pair at x −7.6: 0.8 m clear of GRB-05's face)
    for (const [bx, bz] of [[-7.6, 23], [-4, 23], [-7.6, 27], [-4, 27]] as const) {
      const bed = makeGardenBed(this.bank, rng);
      bed.position.set(bx, 0.15, bz);
      this.scene.add(bed);
      this.colliders.push(boxFromCenter(bx, 0.4, bz, 1.2, 0.55, 1.6));
    }
    // shed, bench (faces the beds), compost, rain barrel
    const shed = makeShed(this.bank);
    shed.position.set(2, 0.15, 28.5);
    this.scene.add(shed);
    this.colliders.push(boxFromCenter(2, 1.05, 28.5, 2, 2.1, 2.4));
    const bench = makeBench(this.bank);
    bench.position.set(1, 0.15, 22.5);
    bench.rotation.y = -Math.PI / 2; // the sitter faces the beds
    this.scene.add(bench);
    this.colliders.push(boxFromCenter(1, 0.45, 22.5, 0.62, 0.7, 1.85));
    const compost = makeCompostBin(this.bank);
    compost.position.set(-7.8, 0.15, 29);
    this.scene.add(compost);
    this.colliders.push(boxFromCenter(-7.8, 0.4, 29, 0.9, 0.56, 0.9));
    const barrel = makeWaterBarrel(this.bank);
    barrel.position.set(-6.8, 0.15, 29.2);
    this.scene.add(barrel);
    this.colliders.push(boxFromCenter(-6.8, 0.6, 29.2, 0.9, 0.95, 0.9));
  }

  /** W2, section E — THE MARLOW PLAYGROUND (PLY-MARLOW): swings, sandbox,
   *  spray basin, benches, the 1.1 m iron fence and its gate. Registry
   *  correction recorded in docs/47: the gate stands on the SOUTH fence at
   *  (−7, −31) — the planned z −21 is the yard side, and the registry's own
   *  law ("visible from Marlow for eyes-on safety") puts the gate where the
   *  walk is. The spray basin sits 0.2 m north of the registry point to
   *  clear the sandbox corner (a 0.05 m kiss on paper). */
  private buildMarlowPlayground(): void {
    // safety surface — poured-rubber dark, one honest pad
    this.deco('Play_Pad', -7, 0.125, -26, 10, 0.05, 10, 0x4a4552, {});
    // the fence: four runs, 1.1 m, gate gap at x −7±0.8 on the south line
    // (the south run is TWO segments — the first draft ran one 8.4 m bar
    // straight across its own gate and the walk probe caught it)
    for (const [fx, fz, len, ew] of [
      [-9.9, -31, 4.2, false], [-4.1, -31, 4.2, false], [-7, -21, 10, false],
      [-12, -26, 10, true], [-2, -26, 10, true],
    ] as const) {
      const f = makeFence(this.bank, len, 1.1);
      f.position.set(fx, 0.15, fz);
      if (ew) f.rotation.y = Math.PI / 2;
      this.scene.add(f);
      this.colliders.push(boxFromCenter(fx, 0.65, fz, ew ? 0.15 : len, 1.1, ew ? len : 0.15));
    }
    const gate = makeParkGate(this.bank, 1.6);
    gate.position.set(-7, 0.15, -31);
    this.scene.add(gate);
    for (const px of [-7.92, -6.08]) {
      this.colliders.push(boxFromCenter(px, 1.0, -31, 0.2, 2.0, 0.2));
    }
    // the kit
    const swings = makeSwingSet(this.bank);
    swings.position.set(-10, 0.15, -28.5);
    this.scene.add(swings);
    for (const sx of [-1.1, 1.1]) {
      this.colliders.push(boxFromCenter(-10 + sx, 1.1, -28.5, 0.7, 2.2, 0.5));
    }
    const sandbox = makeSandbox(this.bank);
    sandbox.position.set(-4.5, 0.15, -27.5);
    this.scene.add(sandbox);
    for (const [rx, rz, sx, sz] of [
      [-4.5, -29, 4, 0.14], [-4.5, -26, 4, 0.14],
      [-6.5, -27.5, 0.14, 3], [-2.5, -27.5, 0.14, 3],
    ] as const) {
      this.colliders.push(boxFromCenter(rx, 0.3, rz, sx, 0.3, sz));
    }
    const basin = makeSprayBasin(this.bank);
    basin.position.set(-7, 0.15, -24.3);
    this.scene.add(basin);
    this.colliders.push(boxFromCenter(-7, 0.3, -24.3, 3.1, 0.6, 3.1));
    // caregivers' benches, facing the kids (south)
    for (const [bx, bz] of [[-3, -22.5], [-11, -22.5]] as const) {
      const b = makeBench(this.bank);
      b.position.set(bx, 0.15, bz);
      b.rotation.y = Math.PI;
      this.scene.add(b);
      this.colliders.push(boxFromCenter(bx, 0.45, bz, 1.85, 0.7, 0.62));
    }
    // two yard trees (simple row trees; trunks bake, canopies instance)
    const rng = seededRng(20261104);
    for (const [tx, tz] of [[-2.8, -29.5], [-11.2, -24]] as const) {
      this.buildSimpleTree(tx, tz, rng);
    }
  }

  /** W2, section F — THE GABLE ROW (GRB-01..05): five brownstones, 7.6 m
   *  lots, 12.5 m, high stoops (six risers + landing), tall parlor windows,
   *  cornices, door colours from the shipped stoopDoors set. GRB-03 is
   *  Fatima's — under restoration, scaffold hint now, studio never (the
   *  registry's exterior-only promise). */
  private buildGableRow(): void {
    const grb: Array<[string, number, boolean]> = [
      // [solid id, door color, scaffold] — A-3 UNIT 4 (W2-C, DEC-4 Option B
      // approved 2026-11-08): the mass, cornice, parlor/upper window rows
      // and the high stoop READ the registry's own rows (GRB-01..05, keyed
      // by the REGISTRY id; the solid name derives by the shipped -→_ law)
      // through regShell — the hand-transcribed tuples retire for the band.
      // The stoop doors, the window rhythm, the scaffold hint are the style
      // and stay code, expressed against the registry box (brief §5: the
      // flip moves coordinates, not looks).
      ['GRB_01', 0xff6b6b, false],          // the Okafor house — stoop-sale host
      ['GRB_02', 0x6d4c7d, false],          // plum door
      ['GRB_03', 0x6e554e, true],           // Fatima's — restoration scaffold
      ['GRB_04', PAL.teal, false],          // teal door
      ['GRB_05', PAL.coral, false],         // coral door
    ];
    for (const [id, door, scaffold] of grb) {
      const reg = this.regShell(id.replace('_', '-'));
      const faceZ = reg.z + reg.d / 2; // the row's street face (the Gable walk side, z 34)
      this.solid(id, reg.x, reg.h / 2, reg.z, reg.w, reg.h, reg.d, PAL.bldg2);
      // the cornice caps the row (KTN00W crown grammar): h − 0.25 over w/d + 0.2
      this.deco(`${id}_Cornice`, reg.x, reg.h - 0.25, reg.z, reg.w + 0.2, 0.5, reg.d + 0.2, PAL.stone, {});
      // tall parlor windows (y 4.6) + two upper floors (7.4 / 10.2)
      for (const wx of [reg.x - 1.7, reg.x + 1.7]) {
        this.decoMesh(`${id}_Parlor_${wx}`, new THREE.BoxGeometry(1.3, 2.2, 0.08),
          this.bank.get(PAL.windowDim), wx, 4.6, faceZ + 0.05); // floats proud of the street face (W1 grammar)
        for (const wy of [7.4, 10.2]) {
          this.decoMesh(`${id}_Win_${wx}_${wy}`, new THREE.BoxGeometry(1.1, 1.6, 0.08),
            this.bank.get(PAL.windowDim), wx, wy, faceZ + 0.05);
        }
      }
      // the high stoop — the door base at y 0.72, every riser ≤ 0.35
      const stoop = makeBrownstoneStoop(this.bank, door, true);
      stoop.position.set(reg.x, 0, faceZ + 0.6);
      this.scene.add(stoop);
      if (scaffold) {
        // restoration scaffold: two poles, a deck, a guard rail — the hint
        // the GDD Regular hook needs, nothing more
        for (const px of [reg.x - 1.8, reg.x + 1.8]) {
          this.decoMesh(`GRB03_Pole_${px}`, new THREE.BoxGeometry(0.16, 5.0, 0.16),
            this.bank.get(0x8a6a4a), px, 2.5, faceZ + 0.3);
          this.colliders.push(boxFromCenter(px, 2.5, faceZ + 0.3, 0.18, 5.0, 0.18));
        }
        this.decoMesh('GRB03_Deck', new THREE.BoxGeometry(3.8, 0.1, 0.9),
          this.bank.get(0x8a6a4a), reg.x, 3.3, faceZ + 0.35);
        this.decoMesh('GRB03_Rail', new THREE.BoxGeometry(3.8, 0.06, 0.06),
          this.bank.get(0x3a3440), reg.x, 4.15, faceZ + 0.7);
      }
    }
  }

  /** W2, section G — the BLK-N parking strip (docs/39: "plus one parking
   *  strip"; docs/40: the x 22..50 rear yard). Asphalt pad off the service
   *  lane's mouth, stall lines painted, wheel stops down. The cars are
   *  W4's — the strip is ready for them. */
  private buildParkingStrip(): void {
    this.deco('Parking_Pad', 41.25, 0.125, 25, 15.5, 0.05, 6, 0x4a4552, {});
    for (const lx of [36.5, 39.5, 42.5, 45.5]) {
      this.deco(`Parking_Line_${lx}`, lx, 0.155, 23.75, 0.1, 0.02, 3.5, PAL.cream, {});
    }
    for (const wx of [35, 38, 41, 44, 47]) {
      this.deco(`Parking_Stop_${wx}`, wx, 0.16, 22.35, 1.6, 0.12, 0.2, 0x8f8a82, {});
    }
  }

  /** W2 — the phase build: slot + lane + both parks + the row + the strip. */
  private buildAlderHeightsW2(): void {
    this.buildGardenSlot();
    this.buildAlleyLane();
    this.buildKestrelGreen();
    this.buildGableGarden();
    this.buildMarlowPlayground();
    this.buildGableRow();
    this.buildParkingStrip();
  }

  // ================================================================
  // ALDER HEIGHTS — W3: the avenue walls + the landmarks
  // (docs/45 §1 W3. Every footprint from world-registry.json. The two
  // entrance-line flips and the ghost-sign correction are in docs/47.)
  // ================================================================

  /** W3, section A — the Juniper E faces: TEN-01 (the Old-Law pair with its
   *  1 m light-slot), SRC-02, and KCM-01 the Alder Works Hall (LMK-07). */
  private buildJuniperFaces(): void {
    // TEN-01 — two 4.5 m tenements with the light-slot between (registry
    // footprint is the pair's 10 m bounding; the slot is the airshaft tell)
    // A-3 UNIT 6 (W3-C, DEC-4 Option B): the pair's bounding box READS the
    // registry row (TEN-01) through regShell; the lot split and the slot
    // are the style, derived against the registry box. Hand tuples retired.
    const ten = this.regShell('TEN-01');
    const lotW = (ten.w - 1) / 2; // the 1 m light-slot owns the middle
    for (const [id, x0] of [['TEN_01a', ten.x - ten.w / 2], ['TEN_01b', ten.x + 0.5]] as const) {
      const cx = x0 + lotW / 2, w = lotW;
      this.solid(id, cx, ten.h / 2, ten.z, w, ten.h, ten.d, PAL.brick);
      this.deco(`${id}_Cornice`, cx, ten.h - 0.25, ten.z, w + 0.2, 0.5, ten.d + 0.2, PAL.stone, {});
      for (let f = 0; f < 5; f++) {
        for (const wx of [cx - w / 4, cx + w / 4]) {
          this.decoMesh(`${id}_Win_${f}_${wx}`, new THREE.BoxGeometry(1.1, 1.6, 0.08),
            this.bank.get(PAL.windowDim), wx, 3.4 + f * 2.6, ten.z + ten.d / 2 + 0.08);
        }
      }
      // west-face windows — only the avenue lot reads the walk (the east
      // lot's west face IS the light-slot)
      if (id === 'TEN_01a') {
        for (let f = 0; f < 5; f++) {
          for (const wz of [-16.5, -11.5]) { // the style rhythm off the row center
            this.decoMesh(`${id}_WinW_${f}_${wz}`, new THREE.BoxGeometry(0.08, 1.6, 1.1),
              this.bank.get(PAL.windowDim), ten.x - ten.w / 2 - 0.04, 3.4 + f * 2.6, wz);
          }
        }
      }
    }
    // the two Kestrel-side doors (registry: (−57, −8) and (−51, −8), faces N)
    for (const dx of [-57, -51]) { // the rows' own entrance offsets (the style law)
      this.deco(`TEN01_Door_${dx}`, dx, 1.4, ten.z + ten.d / 2 + 0.06, 1.2, 2.8, 0.12, 0x6e554e, {});
    }
    // the light-slot: 1 m of open sky between the lots, grilles at both
    // mouths so nobody wedges in an airshaft (the doc 35 lesson)
    for (const gz of [ten.z + ten.d / 2 + 0.05, ten.z - ten.d / 2 - 0.05]) {
      const grille = makeFence(this.bank, 1.0, 1.3);
      grille.position.set(ten.x, 0.05, gz);
      this.scene.add(grille);
      this.colliders.push(boxFromCenter(ten.x, 0.65, gz, 1.1, 1.3, 0.15));
    }
    // fire escapes on both west faces (the silhouette builder, rotated to
    // face the avenue)
    for (const ez of [ten.z]) {
      const esc = makeFireEscapeDeco(this.bank, 4.4, 8.2);
      esc.position.set(ten.x - ten.w / 2 - 0.02, 0, ez);
      esc.rotation.y = -Math.PI / 2;
      this.scene.add(esc);
    }

    // SRC-02 Juniper Court (−55, −26, 10×12, h15) — pre-war walk-up
    // A-3 UNIT 6: the mass READS the registry row (SRC-02); the window
    // rhythm and the corrected Marlow-face door are the style.
    const src2 = this.regShell('SRC-02');
    this.solid('SRC_02', src2.x, src2.h / 2, src2.z, src2.w, src2.h, src2.d, PAL.bldg2);
    this.deco('SRC02_Cornice', src2.x, src2.h - 0.25, src2.z, src2.w + 0.2, 0.5, src2.d + 0.2, PAL.stone, {});
    for (let f = 0; f < 4; f++) {
      for (const wx of [src2.x - 2.4, src2.x + 2.4]) { // the style rhythm
        this.decoMesh(`SRC02_Win_${f}_${wx}`, new THREE.BoxGeometry(1.1, 1.6, 0.08),
          this.bank.get(PAL.windowDim), wx, 3.6 + f * 2.7, src2.z - src2.d / 2 + 0.08); // south face (Marlow)
      }
    }
    // the registry's north entrance pointed into TEN-01; corrected to the
    // Marlow face it actually fronts (docs/47)
    this.deco('SRC02_Door', src2.x, 1.4, src2.z - src2.d / 2 - 0.06, 1.2, 2.8, 0.12, PAL.teal, {});
    const src02Stoop = makeBrownstoneStoop(this.bank, PAL.teal);
    src02Stoop.position.set(src2.x, 0, src2.z - src2.d / 2 - 0.6);
    src02Stoop.rotation.y = Math.PI;
    this.scene.add(src02Stoop);

    // KCM-01 Alder Works Hall (−54, 26, 12×12, h15) — limestone base,
    // brick upper, painted band, the marquee (LMK-07)
    // A-3 UNIT 6: the mass READS the registry row (KCM-01); the base/upper
    // split, the painted band, the marquee (LMK-07) and the address tile
    // are the style, derived against the registry box.
    const kcm = this.regShell('KCM-01');
    const HALL_BASE_H = 3.2; // the limestone base's height (the style law)
    this.solid('KCM_01_upper', kcm.x, HALL_BASE_H + (kcm.h - HALL_BASE_H) / 2, kcm.z, kcm.w, kcm.h - HALL_BASE_H, kcm.d, PAL.brick);
    this.solid('KCM_01_base', kcm.x, HALL_BASE_H / 2, kcm.z, kcm.w + 0.1, HALL_BASE_H, kcm.d + 0.1, PAL.stone);
    this.deco('KCM01_Band_W', kcm.x - kcm.w / 2 - 0.06, 3.55, kcm.z, 0.12, 0.7, kcm.d + 0.1, PAL.teal, {});
    this.deco('KCM01_Band_N', kcm.x, 3.55, kcm.z + kcm.d / 2 + 0.06, kcm.w + 0.1, 0.7, 0.12, PAL.teal, {});
    // main entrance on the Juniper walk + the Gable-side door
    this.deco('KCM01_Door_Main', kcm.x - kcm.w / 2 - 0.06, 1.5, kcm.z, 0.14, 3.0, 1.8, 0x6e554e, {});
    this.deco('KCM01_Door_N', kcm.x, 1.5, kcm.z + kcm.d / 2 + 0.06, 1.4, 3.0, 0.14, 0x6e554e, {});
    // the marquee: a projecting board over the main door (LMK-07) — 'x'
    // boards run thickness-in-x, width-in-z (the bodega blade's convention)
    const marquee = this.signBoard('LMK07_Marquee', 'ALDER WORKS', 0.22, 0.85, 3.0, 512, 128, PAL.ink, PAL.cream, 56, 'x');
    marquee.position.set(kcm.x - kcm.w / 2 - 0.5, 4.1, kcm.z);
    this.scene.add(marquee);
    for (const rz of [kcm.z - 0.9, kcm.z + 0.9]) {
      this.decoMesh(`LMK07_Rod_${rz}`, new THREE.BoxGeometry(0.9, 0.06, 0.06),
        this.bank.get(PAL.ink), kcm.x - kcm.w / 2 + 0.15, 4.35, rz);
    }
    // the painted-tile address under the marquee line
    const addr = this.signBoard('KCM01_Address', 'EST. 1927', 0.08, 0.5, 1.6, 256, 80, PAL.stone, PAL.ink, 40, 'x');
    addr.position.set(kcm.x - kcm.w / 2 - 0.1, 2.7, kcm.z);
    this.scene.add(addr);
    // hall windows (upper floors, west + north)
    for (let f = 0; f < 3; f++) {
      for (const wz of [kcm.z - 3.5, kcm.z + 3.5]) { // the style rhythm
        this.decoMesh(`KCM01_WinW_${f}_${wz}`, new THREE.BoxGeometry(0.08, 1.7, 1.3),
          this.bank.get(PAL.windowDim), kcm.x - kcm.w / 2 - 0.04, 5.4 + f * 2.8, wz);
      }
      for (const wx of [kcm.x - 3.5, kcm.x + 3.5]) { // the style rhythm
        this.decoMesh(`KCM01_WinN_${f}_${wx}`, new THREE.BoxGeometry(1.3, 1.7, 0.08),
          this.bank.get(PAL.windowDim), wx, 5.4 + f * 2.8, kcm.z + kcm.d / 2 + 0.04);
      }
    }
  }

  /** W3, section B — the Sycamore W faces: KTN-07 the studios, SND-01 the
   *  diner (LMK-04), SRC-01 the corner court, VND-02 the fruit stand. */
  private buildSycamoreFaces(): void {
    // KTN-07 Sycamore Studios (54, 26, 12×12, h15)
    // A-3 UNIT 6 (W3-C, DEC-4 Option B): the mass READS the registry row
    // (KTN-07); the studio windows and the walk-up doors are the style,
    // derived against the registry box. Hand tuples retired.
    const k7 = this.regShell('KTN-07');
    this.solid('KTN_07', k7.x, k7.h / 2, k7.z, k7.w, k7.h, k7.d, PAL.bldg);
    this.deco('KTN07_Cornice', k7.x, k7.h - 0.25, k7.z, k7.w + 0.2, 0.5, k7.d + 0.2, PAL.stone, {});
    // the artist ground floor: big north studio windows
    for (const wx of [k7.x - 2.8, k7.x, k7.x + 2.8]) { // the style rhythm
      this.decoMesh(`KTN07_Studio_${wx}`, new THREE.BoxGeometry(2.2, 1.9, 0.08),
        this.bank.get(0x3b3346), wx, 1.9, k7.z + k7.d / 2 + 0.05);
    }
    for (let f = 0; f < 3; f++) {
      for (const wx of [k7.x - 2.5, k7.x + 2.5]) { // the style rhythm
        this.decoMesh(`KTN07_Win_${f}_${wx}`, new THREE.BoxGeometry(1.1, 1.6, 0.08),
          this.bank.get(PAL.windowDim), wx, 5.4 + f * 2.7, k7.z + k7.d / 2 + 0.04);
      }
    }
    // doors: the registry's studio door off the yard (55, 20, S) + the
    // Sycamore-walk entrance the walk-up needs (added to the registry)
    this.deco('KTN07_Door_S', 55, 1.4, k7.z - k7.d / 2 - 0.06, 1.2, 2.8, 0.12, 0x6e554e, {});
    this.deco('KTN07_Door_E', k7.x + k7.w / 2 + 0.06, 1.5, 24, 0.14, 3.0, 1.4, PAL.teal, {});

    // SND-01 the Alder Heights Diner (55, −14, 10×12, h13)
    // A-3 UNIT 6: the mass READS the registry row (SND-01); the porcelain
    // band, the corner chamfer, the neon (LMK-04), the rooftop sign and
    // the doors are the style, derived against the registry box.
    const snd = this.regShell('SND-01');
    const DINER_BAND_H = 3.2; // the porcelain band's height (the style law)
    this.solid('SND_01_upper', snd.x, DINER_BAND_H + (snd.h - DINER_BAND_H) / 2, snd.z, snd.w, snd.h - DINER_BAND_H, snd.d, PAL.brick);
    this.solid('SND_01_band', snd.x, DINER_BAND_H / 2, snd.z, snd.w + 0.1, DINER_BAND_H, snd.d + 0.1, PAL.cream);
    // band windows — the porcelain ribbon
    for (const bx of [snd.x - 2.6, snd.x + 2.6]) { // the style rhythm
      this.decoMesh(`SND01_BandWin_${bx}`, new THREE.BoxGeometry(3.4, 1.5, 0.08),
        this.bank.get(0x3b3346), bx, 1.7, snd.z + snd.d / 2 + 0.05);
    }
    // the corner chamfer at Sycamore×Kestrel (NE), with the coral neon blade
    const chamfer = this.deco('SND01_Chamfer', snd.x + snd.w / 2 - 0.55, 1.7, snd.z + snd.d / 2 - 0.55, 0.9, 3.4, 0.9, PAL.cream, {});
    chamfer.rotation.y = Math.PI / 4;
    // the coral neon: flush on the Sycamore face by the corner — an inset
    // chamfer sign hides from both streets, a wall sign reads up and down
    // the avenue (the first draft sat in the chamfer and the shots caught it)
    const neon = this.signBoard('LMK04_Neon', 'DINER', 0.14, 2.6, 0.75, 128, 512, PAL.coral, PAL.cream, 84, 'x');
    neon.position.set(snd.x + snd.w / 2 + 0.12, 2.5, snd.z + 4.6);
    this.scene.add(neon);
    const neonGlow = this.makeGlow(2.4);
    neonGlow.position.set(snd.x + snd.w / 2 + 0.5, 2.5, snd.z + 4.6);
    this.scene.add(neonGlow);
    // doors: Kestrel walk (N) + Sycamore walk (E)
    this.deco('SND01_Door_N', snd.x, 1.5, snd.z + snd.d / 2 + 0.06, 1.4, 3.0, 0.12, 0x6e554e, {});
    this.deco('SND01_Door_E', snd.x + snd.w / 2 + 0.06, 1.5, snd.z, 0.14, 3.0, 1.4, 0x6e554e, {});
    // the rooftop DINER sign, readable down Kestrel (faces west) — 'x'
    // board: thickness in x, the 7.6 m width running z, legs under it
    for (const lz of [snd.z + 0.8, snd.z + 6.4]) { // the sign's leg pads (the style)
      this.decoMesh(`LMK04_Leg_${lz}`, new THREE.BoxGeometry(0.14, 1.6, 0.14),
        this.bank.get(PAL.ink), snd.x, 13.8, lz);
    }
    const roofSign = this.signBoard('LMK04_Roof', 'DINER', 0.2, 1.9, 7.6, 640, 160, PAL.coral, PAL.cream, 96, 'x');
    roofSign.position.set(snd.x, 15.2, snd.z + 3.6);
    this.scene.add(roofSign);
    // upper windows on the Sycamore face
    for (let f = 0; f < 3; f++) {
      for (const wz of [snd.z - 2.5, snd.z + 2.5]) { // the style rhythm
        this.decoMesh(`SND01_Win_${f}_${wz}`, new THREE.BoxGeometry(0.08, 1.5, 1.3),
          this.bank.get(PAL.windowDim), snd.x + snd.w / 2 + 0.04, 5.2 + f * 2.6, wz);
      }
    }

    // SRC-01 Sycamore Court (55, −26, 10×12, h17) — the SW corner
    // A-3 UNIT 6: the mass READS the registry row (SRC-01); the window
    // rows and the corrected Marlow-face door are the style.
    const src1 = this.regShell('SRC-01');
    this.solid('SRC_01', src1.x, src1.h / 2, src1.z, src1.w, src1.h, src1.d, PAL.bldg2);
    this.deco('SRC01_Cornice', src1.x, src1.h - 0.25, src1.z, src1.w + 0.2, 0.5, src1.d + 0.2, PAL.stone, {});
    for (let f = 0; f < 5; f++) {
      for (const wz of [src1.z - 2.6, src1.z + 2.6]) { // the style rhythm
        this.decoMesh(`SRC01_Win_${f}_${wz}`, new THREE.BoxGeometry(0.08, 1.6, 1.1),
          this.bank.get(PAL.windowDim), src1.x + src1.w / 2 + 0.04, 3.4 + f * 2.6, wz);
      }
      for (const wx of [src1.x - 2.4, src1.x + 2.4]) { // the style rhythm
        this.decoMesh(`SRC01_WinS_${f}_${wx}`, new THREE.BoxGeometry(1.1, 1.6, 0.08),
          this.bank.get(PAL.windowDim), wx, 3.4 + f * 2.6, src1.z - src1.d / 2 - 0.08);
      }
    }
    // registry entrance flipped to the Marlow face it fronts (docs/47)
    this.deco('SRC01_Door', src1.x, 1.4, src1.z - src1.d / 2 - 0.06, 1.2, 2.8, 0.12, 0x6d4c7d, {});
    const src01Stoop = makeBrownstoneStoop(this.bank, 0x6d4c7d);
    src01Stoop.position.set(src1.x, 0, src1.z - src1.d / 2 - 0.6);
    src01Stoop.rotation.y = Math.PI;
    this.scene.add(src01Stoop);

    // VND-02 — the GOLDEN ORCHARD fruit stand (63.3, −18): crate stack +
    // tarp canopy, the van's brand on the avenue. W3 correction (docs/47):
    // the registry's x 62.5 straddled the avenue spine at x 61.5.
    // A-3 UNIT 6: the stand's placement AND its collider READ the row
    // (VND-02); the crates, tarp and sign are the prop factory (the style).
    const vnd = this.regShell('VND-02');
    const stand = new THREE.Group();
    stand.name = 'Dressing_FruitStand';
    const crateWood = this.bank.get(0x8a6a4a);
    const crateGeo = new THREE.BoxGeometry(1, 1, 1);
    for (const [cxx, cyy, cs] of [[-0.5, 0.3, 0.6], [0.35, 0.3, 0.6], [-0.1, 0.9, 0.55]] as const) {
      const crate = new THREE.Mesh(crateGeo, crateWood);
      crate.scale.set(cs, 0.55, cs);
      crate.position.set(cxx, cyy, 0);
      crate.castShadow = true;
      stand.add(crate);
    }
    const tarp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.4), this.bank.get(PAL.teal));
    tarp.position.set(0, 2.05, 0);
    tarp.rotation.z = 0.06;
    tarp.castShadow = true;
    stand.add(tarp);
    for (const px of [-1.05, 1.05]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.1, 0.07), this.bank.get(PAL.ink));
      post.position.set(px, 1.05, -0.55);
      stand.add(post);
    }
    const fruit = this.signBoard('VND02_Sign', 'GOLDEN ORCHARD', 1.7, 0.34, 0.06, 384, 80, PAL.gold, PAL.ink, 34);
    fruit.position.set(0, 1.55, 0.62);
    stand.add(fruit);
    stand.position.set(vnd.x, 0.05, vnd.z);
    this.zoneDressing.push(stand);
    this.scene.add(stand);
    this.colliders.push(boxFromCenter(vnd.x, 0.6, vnd.z, vnd.w, 1.2, vnd.d));
  }

  /** W3, section C — the class-D backdrop walls: eight avenue segments and
   *  two roofline strips (docs/40 §3). Simplified masses, storefront hint
   *  band, no interiors — the skyline-card honesty, one step closer.
   *  A-3 UNIT 5 (W3-D, DEC-4 Option B): each row's segmentation derives
   *  from the REGISTRY footprint (center/width/depth → equal slabs); the
   *  VARIED per-segment heights are the authored style and stay code (the
   *  registry's height column is the row's canonical height — the pin:
   *  footprint verbatim, height inside the segment span). */
  private buildBackdrops(): void {
    const hint = (name: string, cx: number, cz: number, sx: number, sz: number): void => {
      const h = this.deco(name, cx, 1.7, cz, sx, 3.4, sz, PAL.windowDim, {});
      h.castShadow = false; // far hint bands: their shadows are noise (W3 perf)
    };
    // Juniper W/E (x ±78 ±4): N slabs per row, split evenly across the
    // registry depth
    const seg = (
      regId: string, heights: number[],
    ): void => {
      const reg = this.regShell(regId);
      const id = regId.replace(/-/g, '_'); // the solid's scene name — the shipped naming law
      const n = heights.length;
      const d = reg.d / n;
      for (let i = 0; i < n; i++) {
        const h = heights[i];
        const cz = reg.z - reg.d / 2 + d * (i + 0.5);
        this.solid(`${id}_${i}`, reg.x, h / 2, cz, reg.w, h, d, i % 2 ? PAL.bldg : PAL.bldg2);
        hint(`${id}_hint_${i}`, reg.x, cz, reg.w + 0.02, Math.min(d - 0.4, 7));
      }
    };
    seg('VDN-DW1a', [14, 19, 16]);
    seg('VDN-DW1b', [15, 13]);
    seg('VDN-DW1c', [14, 21, 16]);
    seg('VDN-DW1d', [14, 12]);
    seg('VDN-DE1a', [17, 14, 16]);
    seg('VDN-DE1b', [15, 13]);
    seg('VDN-DE1c', [16, 22, 14]);
    seg('VDN-DE1d', [12, 14]);
    // the Gable / Marlow roofline strips: rowhouse silhouettes, varied —
    // each strip splits the registry width evenly
    const heightsN = [11, 13, 15, 12, 14, 13, 11, 15, 12, 14];
    const heightsS = [14, 12, 15, 13, 11, 14, 12, 15, 13, 11];
    const strip = (regId: string, hs: number[]): void => {
      const reg = this.regShell(regId);
      const id = regId.replace(/-/g, '_');
      const w = reg.w / hs.length;
      // The park-gate law (W10, 2026-11-13): these rows sealed the registered
      // parks behind them — the pocket scan (diag-pocket-scan.mjs) found
      // PRK-LARKIN / PRK-CARROW as unreachable free-space components while
      // the owner stood at the band blocked. A gated segment builds two
      // jambs + a lintel (head 2.6 m); the 3.2 m mouth is the park walk-in.
      // terraceFaceFabric reads the same TERRACE_GATES table and skips its
      // ground band across the mouth — mass and facade stay in lockstep.
      const gates = TERRACE_GATES[regId];
      for (let i = 0; i < hs.length; i++) {
        const cx = reg.x - reg.w / 2 + w * (i + 0.5);
        const x0 = cx - w / 2, x1 = cx + w / 2;
        const tone = i % 2 ? PAL.bldg2 : PAL.bldg;
        const gate = gates?.find((g) => g.x0 < x1 - 0.05 && g.x1 > x0 + 0.05);
        if (!gate) {
          this.solid(`${id}_${i}`, cx, hs[i] / 2, reg.z, w, hs[i], reg.d, tone);
          continue;
        }
        const gL = Math.max(x0, gate.x0), gR = Math.min(x1, gate.x1);
        if (gL - x0 > 0.3) this.solid(`${id}_${i}a`, (x0 + gL) / 2, hs[i] / 2, reg.z, gL - x0, hs[i], reg.d, tone);
        if (x1 - gR > 0.3) this.solid(`${id}_${i}b`, (gR + x1) / 2, hs[i] / 2, reg.z, x1 - gR, hs[i], reg.d, tone);
        const lintelH = hs[i] - 2.6;
        if (lintelH > 0.2) this.solid(`${id}_${i}L`, (gL + gR) / 2, 2.6 + lintelH / 2, reg.z, gR - gL, lintelH, reg.d, tone);
      }
    };
    strip('VDN-DN1', heightsN);
    strip('VDN-DS1', heightsS);
  }

  /** W3, section D — the two painted landmarks: the Garden Mural (LMK-05,
   *  authored canvas, riding the exposed gable strip above the diner's
   *  roofline) and the Ghost Sign (LMK-06, faded paint on the KTS-02 north
   *  face by the west seam — the registry's x 0 plane is buried under the
   *  16 m KTS-01 mass; docs/47). */
  private buildPaintedLandmarks(): void {
    // LMK-05 — the mural: a flat poster garden in the scene's own palette,
    // painted on KTS-03's SOUTH face (z −20 plane). The registry's east
    // gable is walled in — SND-01 (h 13) in front of it, the DE1c backdrop
    // behind the viewer — no street sight line reaches it (measured, docs/47).
    // The south face looks down the open yard at the playground: the
    // painting belongs to the kids' side of the block.
    // 6 m wide (z −19..−13): south of the rooftop DINER sign's letters so
    // both landmarks read down the same Kestrel sight line (docs/47)
    const muralCanvas = document.createElement('canvas');
    muralCanvas.width = 768; muralCanvas.height = 512;
    const c = muralCanvas.getContext('2d')!;
    c.fillStyle = '#e8e4dc'; c.fillRect(0, 0, 768, 512); // plaster ground
    c.fillStyle = '#ffb85c'; c.fillRect(20, 20, 728, 280);  // amber sky band
    c.fillStyle = '#5d7d4a';                                 // the hill line
    c.beginPath(); c.moveTo(20, 304);
    for (let i = 0; i <= 8; i++) {
      c.quadraticCurveTo(20 + 91 * i - 45, 240 + (i % 2) * 36, 20 + 91 * i, 304);
    }
    c.lineTo(748, 304); c.lineTo(748, 488); c.lineTo(20, 488); c.closePath(); c.fill();
    c.fillStyle = '#3a7355'; c.fillRect(20, 360, 728, 128);  // the beds
    // blooms: five coral, five teal, two gold — a planted row, never a pattern
    const bloom = (bx: number, by: number, r: number, col: string): void => {
      c.fillStyle = col;
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        c.beginPath(); c.arc(bx + Math.cos(a) * r, by + Math.sin(a) * r, r * 0.62, 0, 7); c.fill();
      }
      c.fillStyle = '#fff8f0'; c.beginPath(); c.arc(bx, by, r * 0.5, 0, 7); c.fill();
    };
    for (let i = 0; i < 4; i++) bloom(110 + i * 150, 408, 16, '#ff6b6b');
    for (let i = 0; i < 3; i++) bloom(180 + i * 170, 372, 12, '#2a9d8f');
    bloom(384, 336, 10, '#f7b32b');
    c.fillStyle = '#6d4c7d'; c.font = 'bold 56px sans-serif'; c.textAlign = 'center';
    c.fillText('THE GARDEN GROWS', 384, 92);
    c.font = 'bold 34px sans-serif'; c.fillStyle = '#3a3440';
    c.fillText('ALDER HEIGHTS', 384, 148);
    const muralTex = new THREE.CanvasTexture(muralCanvas);
    muralTex.colorSpace = THREE.SRGBColorSpace;
    const mural = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 4.6),
      new THREE.MeshLambertMaterial({ map: muralTex }),
    );
    mural.name = 'LMK05_Mural';
    mural.rotation.y = Math.PI; // faces −z — the Marlow yard
    mural.position.set(38, 10.5, -20.06);
    this.scene.add(mural);

    // LMK-06 — the ghost sign: HOLLIS & DAUGHTERS, faded paint the dusk
    // camera finds (KTS-02 north face by the west seam)
    const ghostCanvas = document.createElement('canvas');
    ghostCanvas.width = 512; ghostCanvas.height = 256;
    const g2 = ghostCanvas.getContext('2d')!;
    g2.fillStyle = 'rgba(217,195,165,0.82)'; g2.fillRect(0, 0, 512, 256); // the aged patch
    g2.fillStyle = 'rgba(58,52,64,0.55)';
    g2.font = 'bold 44px sans-serif'; g2.textAlign = 'center';
    g2.fillText('HOLLIS & DAUGHTERS', 256, 92);
    g2.font = '30px sans-serif';
    g2.fillText('FINE TEAS', 256, 148);
    g2.fillText('EST. 1911', 256, 196);
    const ghostTex = new THREE.CanvasTexture(ghostCanvas);
    ghostTex.colorSpace = THREE.SRGBColorSpace;
    const ghost = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 3),
      new THREE.MeshLambertMaterial({ map: ghostTex, transparent: true }),
    );
    ghost.name = 'LMK06_GhostSign';
    ghost.position.set(4, 6.2, -7.94);
    this.scene.add(ghost);
  }

  /** W3, section E — utility poles + sagging spans on both avenues (the
   *  shipped grammar; poles collide, wires are air). */
  private buildAvenuePoles(): void {
    const wireMat = this.mat(PAL.ink);
    for (const px of [-83.4, 83.4]) {
      let prev: { x: number; y: number; z: number } | null = null;
      for (const pz of [-30, -6, 18, 42]) {
        const pole = makeUtilityPole(this.bank);
        pole.position.set(px, 0.05, pz);
        this.scene.add(pole);
        this.colliders.push(boxFromCenter(px, 3.4, pz, 0.3, 6.8, 0.3));
        // service drop to the backdrop wall behind each pole; wires are air
        // AND cast nothing — a 15 mm wire shadow is rasterizer noise (W3)
        const drop = makeSpanWires(wireMat,
          { x: px, y: 6.05, z: pz },
          { x: px, y: 6.05, z: pz },
          { offsets: [], dropTo: { x: px + (px < 0 ? 1.4 : -1.4), y: 4.3, z: pz } },
        );
        drop.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = false; });
        this.scene.add(drop);
        if (prev) {
          const span = makeSpanWires(wireMat, prev,
            { x: px, y: 6.2, z: pz },
            { sag: 0.5, offsets: [-0.7, 0, 0.7] },
          );
          span.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = false; });
          this.scene.add(span);
        }
        prev = { x: px, y: 6.2, z: pz };
      }
    }
  }

  /** W3 — the phase build: faces + backdrops + painted landmarks + poles. */
  private buildAlderHeightsW3(): void {
    this.buildJuniperFaces();
    this.buildSycamoreFaces();
    this.buildBackdrops();
    this.buildPaintedLandmarks();
    this.buildAvenuePoles();
  }

  /** The instanced canopy for every tree on the block: four draw calls
   *  total (leafA/leafB/goldA/goldB), main pass and shadow pass alike.
   *  Materials are bank clones carrying a per-instance `aFade` attribute
   *  via onBeforeCompile — the fade-on-occlude law (ONE tree dissolves,
   *  never the street) moves from per-tree material opacity to per-blob
   *  alpha. The W1 simple rows' instances stay at aFade = 1 forever.
   *  Runs AFTER the bake — an InstancedMesh is a Mesh, and the bake must
   *  never swallow it. */
  /** W6 — THE TERRACE BUILD-OUT (docs/production/terrace-buildout): the
   *  playable core grows z ±48 → ±64 (the walls follow the registry's own
   *  bounds) and the strips become real neighborhood. Eight new masses —
   *  four brownstones continuing Gable's row north, four walk-ups/shops
   *  continuing Marlow south — every one reading its registry row through
   *  regShell (the no-invention law; the rows are status 'built (W6)').
   *  Behind the pinned backdrop rows (VDN-DN1/DS1, footprints untouched)
   *  the Larkin and Carrow gardens: lawn, gravel path, benches, street
   *  trees riding the shipped simple-row grammar. The district bake's
   *  clamp law puts the strips in the edge rows' tiles — same law the
   *  backdrop rows have always lived under; zero grid surgery. */
  private buildAlderHeightsW6Terrace(): void {
    const rng = seededRng(20261111); // the wave's own seed — never re-tunes a shipped row

    // ---- the terrace walk slabs (the walk plane continues to the walls) --
    this.solid('Terrace_N_Walk', 0, -0.05, 56, 168, 0.3, 16, PAL.walk, { receive: true, cast: false });
    this.solid('Terrace_S_Walk', 0, -0.05, -56, 168, 0.3, 16, PAL.walk, { receive: true, cast: false });

    // ---- the eight terrace masses (A-3 law: every row via regShell) ------
    interface TerraceStyle { mass: number; door: number; storefront?: string; awning?: number }
    const terraceRows: Array<[string, TerraceStyle]> = [
      // the Larkin terrace — Gable's brownstone row continues north (the
      // strip's clean land is x −68..−60 / 60..68: the avenue roadways keep
      // their corridors and the backdrop rows keep their footprints)
      ['GRB_06', { mass: PAL.bldg2, door: PAL.teal }],
      ['GRB_07', { mass: PAL.bldg2, door: 0x6d4c7d }],
      // the Carrow terrace — Marlow's shop-and-walk-up row continues south
      ['TEN_02', { mass: PAL.brick, door: 0x6d4c7d, storefront: 'CARROW FRUITS', awning: PAL.teal }],
      ['KTS_04', { mass: PAL.brick, door: PAL.coral, storefront: 'TERRACE WINE', awning: 0x9e222e }],
    ];
    for (const [id, style] of terraceRows) {
      const regId = id.replace('_', '-');
      const reg = this.regShell(regId);
      const row = loadRegistry().building(regId);
      const isNorthRow = reg.z > 0;              // the Larkin terrace faces south (−z)
      const faceZ = isNorthRow ? reg.z - reg.d / 2 : reg.z + reg.d / 2; // ±48.5
      this.solid(id, reg.x, reg.h / 2, reg.z, reg.w, reg.h, reg.d, style.mass);
      // the cornice caps the mass (the crown grammar)
      this.deco(`${id}_Cornice`, reg.x, reg.h - 0.25, reg.z, reg.w + 0.2, 0.5, reg.d + 0.2, PAL.stone, {});
      // the window rhythm against the registry box
      const floors = Math.max(2, Math.round(reg.h / 3.3));
      const cols = reg.w >= 7 ? 2 : 1;
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          const wx = reg.x - reg.w / 2 + (reg.w / (cols + 1)) * (c + 1);
          const wy = 3.4 + f * ((reg.h - 1.2) / floors);
          if (wy > reg.h - 1.0) continue;
          this.decoMesh(`${id}_Win_${f}_${c}`, new THREE.BoxGeometry(1.1, 1.6, 0.08),
            this.bank.get(PAL.windowDim), wx, wy, faceZ + (isNorthRow ? -0.05 : 0.05));
        }
      }
      // the entrance craft — the registry's own row says which
      const ent = row?.entrance?.[0];
      const entX = ent?.x ?? reg.x;
      if (regId === 'TEN-02' || regId === 'KTS-04') {
        // W8 (2026-11-12): FRUIT-INT owns TEN-02's ground floor; W9
        // (2026-11-12) gives KTS-04 the same carve (WINE-INT) — the W5
        // pattern's facade decomposition retires these masses and carries
        // the door gap + windows + fascia themselves; the W6 storefront
        // deco and stoops would double the front.
      } else if (style.storefront) {
        // the shopfront faces the walk (north, +z, for the Carrow rows)
        const shop = makeStorefront(this.bank, this.signMaterials.bind(this),
          style.storefront, style.awning ?? PAL.teal, reg.w - 1);
        shop.position.set(reg.x, 0.05, faceZ + 0.04);
        this.scene.add(shop);
        const door = makeBrownstoneStoop(this.bank, style.door, false);
        door.position.set(entX, 0, faceZ + 0.6);
        this.scene.add(door);
      } else if (isNorthRow) {
        // the Larkin high stoops — the row faces south, so the stoop turns
        // (door recessed at the face plane, steps descend onto the walk)
        const stoop = makeBrownstoneStoop(this.bank, style.door, true);
        stoop.position.set(entX, 0, faceZ - 0.6);
        stoop.rotation.y = Math.PI;
        this.scene.add(stoop);
      } else {
        const stoop = makeBrownstoneStoop(this.bank, style.door, false);
        stoop.position.set(entX, 0, faceZ + 0.6);
        this.scene.add(stoop);
      }
    }

    // ---- the gardens behind the pinned backdrop rows (footprints never
    // move — the Larkin and Carrow gardens ARE the strip behind them) ----
    this.deco('Terrace_N_Lawn', 0, 0.125, 61.2, 116, 0.05, 5, 0x3a7355, {});
    this.deco('Terrace_N_Path', 0, 0.155, 60.2, 100, 0.05, 1.3, PAL.stone, {});
    this.deco('Terrace_S_Lawn', 0, 0.125, -61.2, 116, 0.05, 5, 0x3a7355, {});
    this.deco('Terrace_S_Path', 0, 0.155, -60.2, 100, 0.05, 1.3, PAL.stone, {});
    for (const [bx, bz, byaw] of [
      [-24, 62.1, Math.PI], [28, 62.1, Math.PI], [-30, -62.1, 0], [22, -62.1, 0],
    ] as const) {
      const b = makeBench(this.bank);
      b.position.set(bx, 0.15, bz);
      b.rotation.y = byaw;
      this.scene.add(b);
      this.colliders.push(boxFromCenter(bx, 0.45, bz, 1.85, 0.7, 0.62));
    }
    for (const tx of [-52, -36, -8, 12, 36, 52]) this.buildSimpleTree(tx, 61.6, rng);
    for (const tx of [-56, -40, -16, 4, 32, 48]) this.buildSimpleTree(tx, -61.6, rng);
    // the community-garden corner of the Larkin garden (the W2 parks kit:
    // two beds, the shed, the compost bin — the residents' strip)
    const bedA = makeGardenBed(this.bank, rng);
    bedA.position.set(-2, 0.15, 62.4);
    this.scene.add(bedA);
    const bedB = makeGardenBed(this.bank, rng);
    bedB.position.set(20, 0.15, 62.4);
    this.scene.add(bedB);
    const shed = makeShed(this.bank);
    shed.position.set(-44, 0.15, 62.6);
    this.scene.add(shed);
    this.colliders.push(boxFromCenter(-44, 1.1, 62.6, 2.0, 2.2, 1.4));
    const compost = makeCompostBin(this.bank);
    compost.position.set(-40.5, 0.15, 62.7);
    this.scene.add(compost);

    // the terrace flyer board (the W6 anchors — the interactions read these)
    const board = makeBulletinBoard(this.bank, this.flyerMat);
    board.position.set(-58.9, 0.15, -47.55);
    this.scene.add(board);
  }

  /** W7 — the Westgate & Eastgate rows (docs/production/westgate-eastgate):
   *  the map's LAST two sides. The E–W streets grow their west and east
   *  ends (butt-jointed slabs at the W1 levels — the W1 law), and 24 real
   *  masses continue the Gable / Kestrel / Marlow rows and both terrace
   *  bands into the strips beyond the avenues. A-3 law: every mass reads
   *  its registry row through regShell; the style constants stay code.
   *  All pre-bake — the strip content clamps into the c0/c5 edge tiles
   *  (the districtKey law, same as the W6 strips). */
  private buildAlderHeightsW7Gates(): void {
    const rng = seededRng(20261112); // the wave's own seed — never re-tunes a shipped row
    const CURB = 0x8f8a82;

    // ---- A. the E–W street slabs grow their ends (x ±84 → ±100) ----------
    // Kestrel: the W1 runs (Road_W/E, 34 wide) end at ±84 — the strips
    // butt-joint at the same levels (road top y 0.0, walks top 0.1).
    this.solid('Road_W7_W', -92, -0.1, 0, 16, 0.2, 8, PAL.road, { receive: true, cast: false });
    this.solid('Road_W7_E', 92, -0.1, 0, 16, 0.2, 8, PAL.road, { receive: true, cast: false });
    for (const [sz, nm] of [[6, 'N'], [-6, 'S']] as const) {
      this.solid(`Sidewalk_W7_${nm}_W`, -92, -0.05, sz, 16, 0.3, 4, PAL.walk, { receive: true, cast: false });
      this.solid(`Sidewalk_W7_${nm}_E`, 92, -0.05, sz, 16, 0.3, 4, PAL.walk, { receive: true, cast: false });
      for (const sgn of [-1, 1] as const) {
        this.solid(`Curb_W7_${nm}_${sgn < 0 ? 'W' : 'E'}`, sgn * 92, 0.065, sz === 6 ? 4.08 : -4.08,
          16, 0.13, 0.5, CURB, { collide: false });
      }
    }
    // Gable / Marlow: the W1 runs (168 wide) end at ±84 — same butt-joint
    for (const [cz, nm] of [[40, 'G'], [-40, 'M']] as const) {
      this.solid(`Road_W7_${nm}_W`, -92, -0.105, cz, 16, 0.19, 8, PAL.road, { receive: true, cast: false });
      this.solid(`Road_W7_${nm}_E`, 92, -0.105, cz, 16, 0.19, 8, PAL.road, { receive: true, cast: false });
      for (const [wz, side] of [[cz + 6, 'N'], [cz - 6, 'S']] as const) {
        this.solid(`Walk_W7_${nm}${side}_W`, -92, -0.05, wz, 16, 0.3, 4, PAL.walk, { receive: true, cast: false });
        this.solid(`Walk_W7_${nm}${side}_E`, 92, -0.05, wz, 16, 0.3, 4, PAL.walk, { receive: true, cast: false });
      }
      for (const sgn of [-1, 1] as const) {
        this.solid(`Curb_W7_${nm}_${sgn < 0 ? 'W' : 'E'}_N`, sgn * 92, 0.065, cz + 3.92, 16, 0.13, 0.5, CURB, { collide: false });
        this.solid(`Curb_W7_${nm}_${sgn < 0 ? 'W' : 'E'}_S`, sgn * 92, 0.065, cz - 3.92, 16, 0.13, 0.5, CURB, { collide: false });
      }
    }
    // the terrace walk slabs follow the bands to the wall line (the W6 law)
    this.solid('Terrace_W7_N_Walk_W', -92, -0.05, 56, 16, 0.3, 16, PAL.walk, { receive: true, cast: false });
    this.solid('Terrace_W7_N_Walk_E', 92, -0.05, 56, 16, 0.3, 16, PAL.walk, { receive: true, cast: false });
    this.solid('Terrace_W7_S_Walk_W', -92, -0.05, -56, 16, 0.3, 16, PAL.walk, { receive: true, cast: false });
    this.solid('Terrace_W7_S_Walk_E', 92, -0.05, -56, 16, 0.3, 16, PAL.walk, { receive: true, cast: false });

    // ---- B. the 24 strip masses (A-3 law: every row via regShell) --------
    // The registry's own entrance rows say which way each door faces: 'S'
    // doors sit on the mass's south face (z − d/2), 'N' doors on its north
    // face (z + d/2). Everything on the street side hangs at
    // faceZ + faceSign * dist — the W6 terrace builder's law, generalized.
    // W9 (2026-11-12): the eight shopfront rows carve into W5 rooms —
    // their storefront/stoop deco retires with the mass (the rooms' own
    // facades carry the front).
    const CARVED_STRIP_ROWS = new Set(['KTN-08', 'KTN-09', 'KTN-10', 'KTN-11', 'MRW-01', 'MRW-02', 'MRW-03', 'MRW-04']);
    interface GateStyle { mass: number; door: number; shop?: string; awning?: number; tallStoop?: boolean }
    const gateRows: Array<[string, GateStyle]> = [
      // the Larkin terrace band — west then east (high stoops face S)
      ['GRB_08', { mass: PAL.bldg2, door: PAL.teal, tallStoop: true }],
      ['GRB_09', { mass: PAL.bldg2, door: 0x6d4c7d, tallStoop: true }],
      ['GRB_10', { mass: PAL.bldg2, door: 0x9e222e, tallStoop: true }],
      ['GRB_11', { mass: PAL.bldg2, door: PAL.coral, tallStoop: true }],
      // the Carrow band — west then east (stoops face N, shopfront ends)
      ['TEN_03', { mass: PAL.brick, door: 0x6d4c7d }],
      ['KTS_05', { mass: PAL.brick, door: PAL.teal }],
      ['TEN_04', { mass: PAL.brick, door: 0x6d4c7d }],
      ['KTS_06', { mass: PAL.brick, door: PAL.coral }],
      // Gable's south brownstone row — west then east (high stoops face N)
      ['GRB_12', { mass: PAL.bldg, door: PAL.teal, tallStoop: true }],
      ['GRB_13', { mass: PAL.bldg, door: 0x6d4c7d, tallStoop: true }],
      ['GRB_14', { mass: PAL.bldg, door: 0x9e222e, tallStoop: true }],
      ['GRB_15', { mass: PAL.bldg, door: PAL.coral, tallStoop: true }],
      // Kestrel's walk-up row — west then east (shopfronts face S)
      ['KTN_08', { mass: PAL.bldg, door: PAL.teal, shop: 'WESTGATE BOOKS', awning: NEIGH.awningGreen }],
      ['KTN_09', { mass: PAL.bldg, door: PAL.coral, shop: 'GATE HARDWARE', awning: NEIGH.awningRed }],
      ['KTN_10', { mass: PAL.bldg, door: PAL.teal, shop: 'EASTGATE NEWS', awning: NEIGH.awningGold }],
      ['KTN_11', { mass: PAL.bldg, door: PAL.coral, shop: 'VERBENA BOOKS', awning: NEIGH.awningNavy }],
      // Kestrel's tenement row — west then east (doors face N)
      ['KTS_07', { mass: PAL.brick, door: 0x6d4c7d }],
      ['KTS_08', { mass: PAL.brick, door: PAL.teal }],
      ['KTS_09', { mass: PAL.brick, door: PAL.coral }],
      ['KTS_10', { mass: PAL.brick, door: 0x6d4c7d }],
      // Marlow's shop-and-walk-up row — west then east (shopfronts face S)
      ['MRW_01', { mass: PAL.bldg2, door: PAL.teal, shop: 'CORNELIUS & CO.', awning: NEIGH.awningNavy }],
      ['MRW_02', { mass: PAL.bldg2, door: PAL.coral, shop: 'WESTGATE NEWS', awning: NEIGH.awningRed }],
      ['MRW_03', { mass: PAL.bldg2, door: PAL.teal, shop: 'LARKIN PROVISIONS', awning: NEIGH.awningGold }],
      ['MRW_04', { mass: PAL.bldg2, door: 0x6d4c7d, shop: 'CARROW CHEESE', awning: NEIGH.awningGreen }],
    ];
    for (const [id, style] of gateRows) {
      const regId = id.replace('_', '-');
      const reg = this.regShell(regId);
      const row = loadRegistry().building(regId);
      const ent = row?.entrance?.[0];
      const faceSign = ent?.faces === 'N' ? 1 : -1;
      const faceZ = faceSign > 0 ? reg.z + reg.d / 2 : reg.z - reg.d / 2;
      this.solid(id, reg.x, reg.h / 2, reg.z, reg.w, reg.h, reg.d, style.mass);
      this.deco(`${id}_Cornice`, reg.x, reg.h - 0.25, reg.z, reg.w + 0.2, 0.5, reg.d + 0.2, PAL.stone, {});
      // the window rhythm against the registry box (the W6 grammar)
      const floors = Math.max(2, Math.round(reg.h / 3.3));
      const cols = reg.w >= 7 ? 2 : 1;
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          const wx = reg.x - reg.w / 2 + (reg.w / (cols + 1)) * (c + 1);
          const wy = 3.4 + f * ((reg.h - 1.2) / floors);
          if (wy > reg.h - 1.0) continue;
          this.decoMesh(`${id}_Win_${f}_${c}`, new THREE.BoxGeometry(1.1, 1.6, 0.08),
            this.bank.get(PAL.windowDim), wx, wy, faceZ + faceSign * 0.05);
        }
      }
      // the entrance craft — the registry's own row says which. The
      // carved rows' fronts are the rooms' own facades (door gap + windows
      // + fascia, buildW5Books et al) — NO storefront, NO stoop.
      const entX = ent?.x ?? reg.x;
      if (!CARVED_STRIP_ROWS.has(regId)) {
        if (style.shop) {
          const shop = makeStorefront(this.bank, this.signMaterials.bind(this),
            style.shop, style.awning ?? NEIGH.awningGreen, reg.w - 1);
          shop.position.set(reg.x, 0.05, faceZ + faceSign * 0.04);
          if (faceSign < 0) shop.rotation.y = Math.PI;
          this.scene.add(shop);
          const door = makeBrownstoneStoop(this.bank, style.door, false);
          door.position.set(entX, 0, faceZ + faceSign * 0.6);
          if (faceSign < 0) door.rotation.y = Math.PI;
          this.scene.add(door);
        } else {
          const stoop = makeBrownstoneStoop(this.bank, style.door, style.tallStoop ?? false);
          stoop.position.set(entX, 0, faceZ + faceSign * 0.6);
          if (faceSign < 0) stoop.rotation.y = Math.PI;
          this.scene.add(stoop);
        }
      }
    }

    // ---- C. the strip street trees (the shipped rows' own z law) ---------
    // Kestrel fills at z ±7.48/-7.0, Gable/Marlow rows at 32.6/47.4/-32.6;
    // every x chosen ≥ 1.4 m clear of the new stoops (the honest spacing).
    for (const tx of [-93.5, -98.5]) this.buildSimpleTree(tx, 7.48, rng);
    for (const tx of [93.5, 98.5]) this.buildSimpleTree(tx, 7.48, rng);
    for (const tx of [-93.5, -98.5]) this.buildSimpleTree(tx, -7.0, rng);
    for (const tx of [93.5, 98.5]) this.buildSimpleTree(tx, -7.0, rng);
    for (const tx of [-92.5, -99.5]) this.buildSimpleTree(tx, 32.6, rng);
    for (const tx of [92.5, 99.5]) this.buildSimpleTree(tx, 32.6, rng);
    for (const tx of [-85.5, -94.5]) this.buildSimpleTree(tx, 47.4, rng);
    for (const tx of [89.5, 98.5]) this.buildSimpleTree(tx, 47.4, rng);
    for (const tx of [-92.5, -99.5]) this.buildSimpleTree(tx, -32.6, rng);
    for (const tx of [92.5, 99.5]) this.buildSimpleTree(tx, -32.6, rng);
    for (const tx of [-86.5, -94.5]) this.buildSimpleTree(tx, -47.4, rng);
    for (const tx of [89.5, 98.5]) this.buildSimpleTree(tx, -47.4, rng);

    // ---- D. the east chalk-menu A-frame (the east_menu anchor's prop) ----
    // MRW-03's LARKIN PROVISIONS front — the classic sandwich-board on the
    // walk, 0.8 m off the face plane, clear of the shed (x 84.4..91.6) and
    // the walk lane (z −34.6). Two leaning chalk slabs + the hinge bar.
    const chalk = this.bank.get(0x2f2f33);
    const boardMat = this.bank.get(0x3a3a40);
    const aFrame = new THREE.Group();
    for (const s of [-1, 1] as const) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.05, 0.05), s < 0 ? boardMat : chalk);
      slab.position.set(0, 0.56, s * 0.14);
      slab.rotation.x = s * 0.16;
      slab.castShadow = true;
      aFrame.add(slab);
    }
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 0.05), this.bank.get(PAL.ink));
    hinge.position.set(0, 1.1, 0);
    aFrame.add(hinge);
    aFrame.position.set(88, 0.1, -32.8);
    aFrame.rotation.y = Math.PI; // the chalk face looks south, up the walk
    this.scene.add(aFrame);
  }

  private buildInstancedTreeRows(): void {
    if (this.canopyBuilt) return;
    const count = [0, 0, 0, 0, 0, 0];
    for (const t of this.simpleTrees) for (const b of t.blobs) count[b.mat]++;
    for (const t of this.trees) for (const b of t.blobs) count[b.key]++;
    if (!count.some((c) => c > 0)) return;
    // W8 tree-species variety (2026-11-12): the honest ledger's variety
    // item. The four shipped tones (two honey-locust greens, two ginkgo
    // golds) gain a copper elm (0xb06038) and a dark pine (0x3e5d3e); the
    // simple rows roll species per tree by a position hash (deterministic,
    // NO rng-stream draws — the seeded rows' shapes stay byte-identical).
    const HEXES = [0x5d7d4a, 0x516e42, 0xf7b32b, 0xffb85c, 0xb06038, 0x3e5d3e] as const;
    for (let k = 0; k < HEXES.length; k++) {
      if (!count[k]) continue;
      const m = this.bank.get(HEXES[k]).clone();
      m.transparent = true; // fade-on-occlude ready; aFade 1 renders as opaque
      m.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vFade;')
          .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vFade;');
      };
      // per-mesh geometry: the aFade attribute is per-geometry, and the
      // shared unit sphere must stay shareable with other content
      const geo = SHARED_GEOS.sphere.clone();
      const fade = new THREE.InstancedBufferAttribute(new Float32Array(count[k]).fill(1), 1);
      fade.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aFade', fade);
      const im = new THREE.InstancedMesh(geo, m, count[k]);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = true;
      im.name = ['TreeCanopy_LeafA', 'TreeCanopy_LeafB', 'TreeCanopy_GoldA', 'TreeCanopy_GoldB', 'TreeCanopy_Copper', 'TreeCanopy_Pine'][k];
      this.canopyMeshes[k] = im;
      this.canopyFade[k] = fade;
      this.scene.add(im);
    }
    // instance slots: the W1 simple rows own the first countSimple slots of
    // meshes 0/1 (updateTreeRows writes them positionally, same order every
    // frame); the makeTree trees claim the slots after, stored per blob.
    const cursor = [0, 1, 2, 3, 4, 5].map((k) =>
      this.simpleTrees.reduce((n, t) => n + t.blobs.filter((b) => b.mat === k).length, 0));
    for (const t of this.trees) {
      for (const b of t.blobs) b.idx = cursor[b.key]++;
    }
    this.canopyBuilt = true;
    this.updateTreeRows(0);
  }

  /** W16 — the DEC-6 minimal seasonal pass (register v1.69.0): the
   *  existing dressing/leaf systems read the R4 calendar's season for
   *  this `calendar_day` (core/calendar.ts — the one authority; see
   *  seasonDressing.ts). Idempotent per season, +0 draw calls at every
   *  season: the six instanced canopy materials recolor in place (the
   *  W8 species slots), the LeafDrift recolors/thins (one instanced mesh,
   *  one draw call), the leaf piles show/hide (hidden is fewer draws,
   *  never more). The shipped days are September → autumn → the shipped
   *  look byte-identical. Snow/rain stay the priced wave the ruling
   *  gated; the seasonCut montage stays the chapter machinery's — this
   *  is the world's own visual consumer of the calendar. Game calls
   *  this from beginDay (the one seam every boot/day-transition passes). */
  applySeason(calendarDay: number): Season {
    const season = seasonForCalendarDay(calendarDay);
    if (this.seasonApplied === season) return season;
    this.seasonApplied = season;
    const d = SEASON_DRESSING[season];
    for (let k = 0; k < this.canopyMeshes.length; k++) {
      const m = this.canopyMeshes[k]?.material as THREE.MeshLambertMaterial | undefined;
      if (m) m.color.setHex(d.canopy[k]);
    }
    this.leaves.setSeason(d.driftTints, d.driftFraction);
    for (const p of this.leafPiles) p.visible = d.pilesVisible;
    return season;
  }

  /** Sway + place every instanced canopy blob (called from updateAmbient).
   *  Two grammars, one matrix law per system:
   *  - simple rows: sway about the trunk top, no yaw (their build rolls no
   *    spin) — T(x, 0.05+h, z)·R_sway·T(blob)·S(r), written positionally;
   *  - makeTree trees: same sway + the tree's authored yaw —
   *    T(x, baseY+h, z)·R_y·R_sway·T(blob)·S(r), written to stored slots.
   *  Both reproduce the old scene-graph chain exactly (group → canopy →
   *  blob), so the silhouette and the sway are pixel-identical. */
  private updateTreeRows(time: number): void {
    if (!this.canopyBuilt) return;
    const cursors = [0, 0, 0, 0, 0, 0];
    for (const t of this.simpleTrees) {
      const sz = Math.sin(time * 0.9 + t.phase) * 0.022;
      const sx = Math.cos(time * 0.7 + t.phase) * 0.016;
      this.tE.set(sx, 0, sz);
      this.tQ.setFromEuler(this.tE);
      this.tV.set(t.x, 0.05 + t.h, t.z);
      this.mSway.compose(this.tV, this.tQ, this.tOne);
      for (const b of t.blobs) {
        this.mBlob.compose(this.tV.set(b.ox, b.oy, b.oz), this.tQ.identity(), this.tS.setScalar(b.r));
        this.mCanopy.multiplyMatrices(this.mSway, this.mBlob);
        this.canopyMeshes[b.mat]!.setMatrixAt(cursors[b.mat]++, this.mCanopy);
      }
    }
    for (const t of this.trees) {
      const sz = Math.sin(time * 0.9 + t.phase) * 0.022;
      const sx = Math.cos(time * 0.7 + t.phase) * 0.016;
      this.tE.set(sx, 0, sz);
      this.tQ.setFromEuler(this.tE);
      this.qYaw.setFromAxisAngle(this.yAxis, t.yaw).multiply(this.tQ);
      this.tV.set(t.x, t.baseY + t.h, t.z);
      this.mSway.compose(this.tV, this.qYaw, this.tOne);
      for (const b of t.blobs) {
        this.mBlob.compose(this.tV.set(b.ox, b.oy, b.oz), this.tQ.identity(), this.tS.setScalar(b.r));
        this.mCanopy.multiplyMatrices(this.mSway, this.mBlob);
        this.canopyMeshes[b.key]!.setMatrixAt(b.idx, this.mCanopy);
      }
    }
    for (const m of this.canopyMeshes) if (m) m.instanceMatrix.needsUpdate = true;
  }

  /** Kestrel-row trees inside the ambient walkers' band — Pedestrians reads
   *  this after construction (filled by buildAlderHeightsW1). */
  private readonly extraKestrelPedBodies: Array<[number, number]> = [];
  /** W4: the parked cars' centers, fed to the walkers as avoidance circles. */
  private readonly w4ParkedCarBodies: Array<[number, number]> = [];

  /** Rolling shirt rack — two uprights, a bar, four honest shirts. The
   *  frame is chunky on purpose: hairline posts read as floating shirts
   *  from an oblique angle (the visual audit caught it). */
  private makeShirtRack(): THREE.Group {
    const iron = this.mat(PAL.ink);
    const g = new THREE.Group();
    for (const sx of [-0.26, 0.26]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.5, 8), iron);
      post.position.set(sx, 0.75, 0);
      post.castShadow = true;
      g.add(post);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.6), iron);
      foot.position.set(sx, 0.035, 0);
      foot.castShadow = true;
      g.add(foot);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 8), iron);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = 1.48;
    g.add(bar);
    // a lower rail — rolling racks have one, and it keeps the silhouette
    // grounded from any angle
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 8), iron);
    rail.rotation.z = Math.PI / 2;
    rail.position.y = 0.42;
    g.add(rail);
    for (const rz of [-0.24, 0.24]) {
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6), iron);
      brace.position.set(0, 0.95, rz);
      g.add(brace);
    }
    const shirts = [PAL.cream, PAL.coral, 0x9a938c, PAL.gold];
    for (let i = 0; i < shirts.length; i++) {
      const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.52, 0.06), this.mat(shirts[i]));
      shirt.position.set(-0.19 + i * 0.127, 1.2, 0);
      shirt.castShadow = true;
      g.add(shirt);
    }
    return g;
  }

  /** The A-frame permit notice — a white city card where the crosswalk
   *  drops you. The sign is small on purpose; the note carries the words. */
  private makePermitNotice(): THREE.Group {
    const g = new THREE.Group();
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.92, 0.04),
      this.noticeTexture(),
    );
    face.position.set(0, 0.62, 0.1);
    face.rotation.x = -0.18;
    face.castShadow = true;
    g.add(face);
    const backBoard = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 0.04), this.mat(0x9a938c));
    backBoard.position.set(0, 0.62, -0.12);
    backBoard.rotation.x = 0.18;
    g.add(backBoard);
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.3), this.mat(PAL.ink));
    hinge.position.y = 0.03;
    g.add(hinge);
    return g;
  }

  private noticeTexture(): THREE.MeshLambertMaterial {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 384;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = '#3A3440';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 240, 368);
    ctx.fillStyle = '#3A3440';
    ctx.fillRect(8, 8, 240, 56);
    ctx.fillStyle = '#FFF8F0';
    ctx.font = '800 26px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(D4_NOTICE_TITLE, 128, 45, 220);
    ctx.fillStyle = '#3A3440';
    ctx.font = '800 22px "Trebuchet MS", sans-serif';
    let y = 110;
    for (const line of D4_NOTICE_LINES) {
      ctx.fillText(line, 128, y, 220);
      y += 40;
    }
    ctx.font = '400 15px "Trebuchet MS", sans-serif';
    ctx.fillText('Room 102 — bring exact change', 128, 330, 220);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshLambertMaterial({ map: tex });
  }

  /** The receipt — propped against the urn the moment the permit files.
   *  "The whole future, on a card." */
  private buildPermitReceipt(): THREE.Group {
    const g = new THREE.Group();
    const c = document.createElement('canvas');
    c.width = 128; c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, 128, 160);
    ctx.strokeStyle = '#3A3440';
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 120, 152);
    ctx.fillStyle = '#3A3440';
    ctx.font = '800 22px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(D4_RECEIPT_TEXT, 64, 40, 108);
    for (const ly of [70, 88, 106]) {
      ctx.fillRect(20, ly, 88, 4);
    }
    ctx.font = '400 13px "Trebuchet MS", sans-serif';
    ctx.fillText('keep this card', 64, 138, 104);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.4, 0.02),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    card.castShadow = true;
    g.add(card);
    // taped to the cart's street-side face — the way the city makes you
    // display your papers. (The counter top sits under the awning's
    // overhang: from the street the first spot was invisible, and the
    // second read as a tan box in shade. This one faces you at the window.)
    g.position.set(4.5, 0.8, -6.04);
    g.rotation.set(0.05, Math.PI, 0);
    return g;
  }

  /** Wash-day state — the near drum spins while the apron is in the machine. */
  setWasherRunning(run: boolean): void {
    this.washerRunning = run;
  }

  isWasherRunning(): boolean {
    return this.washerRunning;
  }

  setPermitReceiptVisible(v: boolean): void {
    this.permitReceipt.visible = v;
  }

  private waterTower(x: number, roofY: number, z: number, r: number) {
    const g = new THREE.Group();
    roofY += 0.04; // sit a hair proud of the roof plane — coplanar rims shimmered
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, r * 1.6, 10), this.mat(0x7a5c48));
    tank.position.y = r * 0.8;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 1.15, r * 0.7, 10), this.mat(0x5d4536));
    cone.position.y = r * 1.6 + r * 0.35;
    g.add(tank, cone);
    for (const [lx, lz] of [[-r * 0.6, -r * 0.6], [r * 0.6, -r * 0.6], [-r * 0.6, r * 0.6], [r * 0.6, r * 0.6]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, r * 0.7, 6), this.mat(0x4a3a30));
      leg.position.set(lx, r * 0.35, lz);
      g.add(leg);
    }
    g.position.set(x, roofY, z);
    g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; } });
    this.scene.add(g);
  }

  /**
   * A person who reads as a person AND WALKS. Playtest 2026-10-29: "the
   * characters doesn't walk, they move." The old build was one rigid group
   * (and the runtime GLB swap was a static mannequin with zero animations),
   * so everyone skated around. The articulated build lives in personRig.ts
   * (DOM-free, unit-tested); the cast shares one vertex-colored material.
   */
  buildPerson(o: Parameters<typeof buildArticulatedPerson>[0]): THREE.Group {
    return buildArticulatedPerson(o).group;
  }

  /** Persistent cast member: the articulated person (rig included). */
  private spawnActor(name: string, x: number, y: number, z: number, look: Parameters<World['buildPerson']>[0]): THREE.Group {
    const g = this.buildPerson(look);
    g.name = name;
    g.position.set(x, y, z);
    this.scene.add(g);
    return g;
  }

  // ------------------------------------------------ fire-escape part builders

  /** Open guardrail: posts + top bar + mid bar (the old solid slab read as a wall). */
  private fireRail(name: string, y: number): void {
    const col = PAL.ink;
    for (const x of [10.3, 11.7, 13.1, 14.5, 15.7]) {
      this.deco(`${name}_Post_${x}`, x, y + 0.5, -6.62, 0.055, 1.0, 0.055, col);
    }
    this.deco(`${name}_TopBar`, 13, y + 0.98, -6.62, 6, 0.06, 0.06, col);
    this.deco(`${name}_MidBar`, 13, y + 0.52, -6.62, 6, 0.05, 0.05, col);
  }

  /** A real ladder: two stiles, rungs every ~0.35 m, brackets into the wall. */
  private fireLadder(name: string, x: number, yBase: number, yTop: number): void {
    const col = PAL.ink;
    const h = yTop - yBase;
    const mid = (yBase + yTop) / 2;
    this.deco(`${name}_Stile_W`, x - 0.26, mid, -7.72, 0.06, h, 0.06, col);
    this.deco(`${name}_Stile_E`, x + 0.26, mid, -7.72, 0.06, h, 0.06, col);
    for (let y = yBase + 0.25; y < yTop - 0.1; y += 0.35) {
      this.deco(`${name}_Rung_${y.toFixed(2)}`, x, y, -7.72, 0.5, 0.055, 0.055, col);
    }
    // brackets tie the stiles back to the brick (wall face at z=-8.0)
    for (const sx of [-0.26, 0.26]) {
      this.deco(`${name}_Bracket_${sx}`, x + sx, yTop - 0.25, -7.9, 0.06, 0.4, 0.22, col);
    }
  }

  /** Diagonal strut from the wall to a landing's nose (pure deco). */
  private fireBrace(x: number, y: number): void {
    const col = PAL.ink;
    const from = { y: y - 0.55, z: -7.85 }; // on the wall
    const to = { y: y - 0.1, z: -6.7 };     // under the landing nose
    const dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dy, dz);
    const m = this.deco(`Brace_${x}_${y}`, x, (from.y + to.y) / 2, (from.z + to.z) / 2, 0.07, len, 0.07, col);
    // lean the +Y axis back toward the wall: rotation about X by -atan2(|dz|, dy)
    m.rotation.x = -Math.atan2(Math.abs(dz), dy);
  }

  /** Rosa's Day-2 broom — childed to her right arm by the caller. */
  makeBroom(): THREE.Group {
    const broom = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.25, 6), this.mat(0x8a6a4a));
    stick.position.y = -0.25;
    stick.castShadow = true;
    const brush = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.13, 0.1), this.mat(0xd9b26b));
    brush.position.set(0, -0.92, 0);
    brush.castShadow = true;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.11), this.mat(PAL.coral));
    band.position.set(0, -0.83, 0);
    broom.add(stick, brush, band);
    return broom;
  }

  /** Shared customer builder (transient — no GLB fetch per spawn). */
  makeCustomerVisual(color: number, skin: number, hair: number): THREE.Group {
    return this.buildPerson({ jacket: color, pants: 0x54495e, skin, hair, style: Math.random() < 0.5 ? 'bun' : 'flat' });
  }

  /** Lowpoly car — nose at +X, axle along Z. Mirrors tools3d/procedural_glb.py. */
  buildCar(kind: 'taxi' | 'sedan', standard = false): THREE.Group {
    const bodyCol = kind === 'taxi' ? PAL.taxi : PAL.teal;
    // the graphics wave: hero vehicles wear MeshStandardMaterial paint (the
    // sky environment reflects in them); the parked fleet stays flat Lambert
    // and keeps its vertex-bake economy. The windowDim glass switches to a
    // metal/rough pane so cab windows read as glass, not as dark paint.
    const body = standard ? this.vehicleMat(bodyCol, 0.45, 0.32) : this.mat(bodyCol);
    const glass = standard ? this.vehicleMat(PAL.windowDim, 0.75, 0.14) : this.mat(PAL.windowDim);
    const g = new THREE.Group();
    const mk = (geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, useMat?: THREE.Material) => {
      const m = new THREE.Mesh(geo, useMat ?? this.mat(color));
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true; // W4 p2 batch fold: cast+receive like the world's
      // own solids — the parked cars stopped opening cast-only batches in
      // every district tile they touch
      g.add(m);
      return m;
    };
    mk(new THREE.BoxGeometry(4.15, 0.52, 1.86), bodyCol, 0, 0.56, 0, body);
    mk(new THREE.BoxGeometry(2.05, 0.52, 1.7), PAL.windowDim, -0.1, 1.08, 0, glass);
    mk(new THREE.BoxGeometry(2.25, 0.09, 1.76), bodyCol, -0.1, 1.38, 0, body);
    for (const sx of [-1.32, 1.32]) {
      for (const sz of [-0.85, 0.85]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 14), this.mat(PAL.manhole));
        w.rotation.x = Math.PI / 2;
        w.position.set(sx, 0.33, sz);
        w.castShadow = true;
        w.receiveShadow = true; // the fold (see mk above)
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 10), this.mat(PAL.stone));
        hub.rotation.x = Math.PI / 2;
        hub.position.set(sx, 0.33, sz);
        hub.receiveShadow = true;
        g.add(w, hub);
      }
    }
    for (const sx of [-2.13, 2.13]) mk(new THREE.BoxGeometry(0.12, 0.16, 1.88), PAL.stone, sx, 0.42, 0);
    for (const sz of [-0.55, 0.55]) {
      mk(new THREE.BoxGeometry(0.07, 0.14, 0.28), PAL.cream, 2.09, 0.62, sz);
      mk(new THREE.BoxGeometry(0.07, 0.12, 0.24), PAL.coral, -2.09, 0.62, sz);
    }
    if (kind === 'taxi') mk(new THREE.BoxGeometry(0.52, 0.17, 0.24), PAL.amber, -0.1, 1.51, 0);
    return g;
  }

  /** Wall/blade sign FACTORY: the shared atlas face material (uv rect on
   *  the sheet — docs/51 B13 frontier) + the SHARED plain edge material
   *  (banked — every sign's edges bake-merge with its district). W0: the
   *  old 6-material-array box cost 6 draw calls per sign; a board (box +
   *  two face planes) costs 2; the atlas bake fuses the planes to ~1. */
  private signMaterials(text: string, w: number, h: number, bg: number, fg: number, px: number, _faces: 'z' | 'x' = 'z'): SignPair {
    void _faces; // the board helper decides orientation; the pair is orientation-free
    // the atlas shelf first (docs/51 B13 frontier): one sheet, one material,
    // the statics bake fuses every face into one draw. Overflow (a giant
    // future sign) falls back to its own canvas — the seam never breaks.
    const rect = drawIntoAtlas(
      (ctx) => this.signFaceOps(text, w, h, bg, fg, px)(ctx, w, h),
      w, h,
      '#' + bg.toString(16).padStart(6, '0'),
    );
    if (rect) return { face: atlasMaterial()!, plain: this.bank.get(bg), rect };
    return {
      face: new THREE.MeshLambertMaterial({ map: this.textTexture(text, w, h, bg, fg, px) }),
      plain: this.bank.get(bg),
    };
  }

  /** A placed sign board — plain shared-material box + two textured faces,
   *  added to the scene. Returns the group so callers can position it. */
  private signBoard(
    name: string, text: string, sx: number, sy: number, sz: number,
    w: number, h: number, bg: number, fg: number, px: number,
    faces: 'z' | 'x' = 'z',
  ): THREE.Group {
    const g = makeSignBoard(sx, sy, sz, this.signMaterials(text, w, h, bg, fg, px), faces);
    g.name = name;
    this.scene.add(g);
    return g;
  }

  /** Wall-mounted sign texture (block signs stopped being anonymous boxes).
   *  '\n' splits lines: line 1 renders at full size, following lines smaller
   *  beneath it — "ROSA'S / DELI & GROCERY", the classic two-deck bodega sign.
   *  The lettering OPS live in signFaceOps so the atlas shelf (signMaterials)
   *  can draw the exact same face into its sheet. */
  private textTexture(text: string, w: number, h: number, bg: number, fg: number, px: number): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    this.signFaceOps(text, w, h, bg, fg, px)(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** The sign-face lettering ops, shared by the standalone canvas path
   *  (textTexture) and the atlas shelf (signAtlas) — one look, two carriers. */
  private signFaceOps(text: string, w: number, h: number, bg: number, fg: number, px: number):
      (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void {
    return (ctx) => {
    ctx.fillStyle = '#' + bg.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#' + fg.toString(16).padStart(6, '0');
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#' + fg.toString(16).padStart(6, '0');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('\n');
    if (lines.length === 1) {
      ctx.font = `800 ${px}px "Trebuchet MS", sans-serif`;
      ctx.fillText(text, w / 2, h / 2 + 2, w - 40);
    } else {
      ctx.font = `800 ${px}px "Trebuchet MS", sans-serif`;
      ctx.fillText(lines[0], w / 2, h * 0.32, w - 40);
      ctx.font = `700 ${Math.round(px * 0.58)}px "Trebuchet MS", sans-serif`;
      ctx.fillText(lines.slice(1).join(' '), w / 2, h * 0.70, w - 40);
    }
    };
  }

  private makeLabel(text: string): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 80;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(58, 52, 64, 0.92)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 72, 16);
    ctx.fill();
    ctx.fillStyle = '#FFF8F0';
    ctx.font = '700 40px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 42, 230);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(1.15, 0.36, 1);
    return sp;
  }

  private makeGlow(size: number): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255, 200, 90, 0.85)');
    grad.addColorStop(0.4, 'rgba(255, 184, 92, 0.35)');
    grad.addColorStop(1, 'rgba(255, 184, 92, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sp.scale.setScalar(size);
    this.glowSprites.push(sp); // the AO prepass never sees billboards
    return sp;
  }

  /** Gold waypoint chevron — the "follow me" marker floating over whoever the
   *  objective says to tail (Rosa to the bodega, Idris to the corner). Playtest:
   *  "the prompt said follow her and she vanish." A guide you can lose behind
   *  a wall is not a guide, so the sprite draws through everything
   *  (depthTest off) and the Game loop bobs it over the walker's head. */
  makeWaypoint(): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 96; c.height = 96;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#F7B32B';
    ctx.strokeStyle = '#3A3440';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(48, 84);
    ctx.lineTo(15, 26);
    ctx.lineTo(81, 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false, depthTest: false,
    }));
    sp.scale.set(0.55, 0.55, 1);
    sp.renderOrder = 20;
    return sp;
  }

  private makeSign(text: string): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#F7B32B';
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 116, 22);
    ctx.fill();
    ctx.strokeStyle = '#3A3440';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#3A3440';
    ctx.font = '700 58px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text || ' ', 256, 68, 470);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(2.4, 0.6, 1);
    return sp;
  }

  setCartSignText(text: string) {
    const old = this.cartSign.material.map;
    this.cartSign.material = new THREE.SpriteMaterial({ map: this.redrawSign(text), transparent: true, depthWrite: false });
    old?.dispose();
  }

  private redrawSign(text: string): THREE.CanvasTexture {
    // redraw on a fresh canvas (sign is set once per day; disposal handled by caller)
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#F7B32B';
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 116, 22);
    ctx.fill();
    ctx.strokeStyle = '#3A3440';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#3A3440';
    ctx.font = '700 58px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68, 470);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private steamMaterial(): THREE.PointsMaterial {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,0.65)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(c), size: 0.55, transparent: true, opacity: 0.5,
      depthWrite: false, sizeAttenuation: true,
    });
  }

  // ------------------------------------------------------------------ update

  setRoofHidden(hidden: boolean) {
    this.roof.visible = !hidden;
  }

  /** Redraw the flyer face (cart name goes up the moment it's known). The
   *  day's slip rides along — the board keeps a diary (dressing.ts). */
  setFlyerText(name: string) {
    const old = this.flyerMat.map;
    const clean = name || 'YOUR CORNER';
    this.currentFlyerName = clean;
    this.flyerMat.map = this.flyerTexture(clean, this.flyerDay);
    this.flyerMat.needsUpdate = true;
    old?.dispose();
  }

  private flyerTexture(name: string, day: number = 1): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 192;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = '#3A3440';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 244, 180);
    ctx.fillStyle = '#F7B32B';
    ctx.fillRect(18, 18, 220, 44);
    ctx.fillStyle = '#3A3440';
    ctx.font = '800 22px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BEST CORNER COFFEE', 128, 47, 210);
    ctx.font = '700 26px "Trebuchet MS", sans-serif';
    ctx.fillText(name.toUpperCase().slice(0, 18), 128, 105, 216);
    ctx.font = '400 15px "Trebuchet MS", sans-serif';
    ctx.fillText('as voted by everyone', 128, 138, 216);
    ctx.fillText('who was asked', 128, 158, 216);
    ctx.font = '400 12px "Trebuchet MS", sans-serif';
    ctx.fillText('— photo: somebody\u2019s cousin —', 128, 180, 216);
    // the neighbor notice — a small slip, pinned at a slant, day-keyed
    // (deterministic; the board rotates its paper the way real corkboards do)
    const slip = flyerSlipForDay(day);
    ctx.save();
    ctx.translate(40, 96);
    ctx.rotate(-0.07);
    ctx.fillStyle = '#FDF3E3';
    ctx.fillRect(-34, -42, 68, 84);
    ctx.strokeStyle = '#B23A48';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-34, -42, 68, 84);
    // the pin
    ctx.fillStyle = '#B23A48';
    ctx.beginPath();
    ctx.arc(0, -34, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3A3440';
    ctx.font = '800 11px "Trebuchet MS", sans-serif';
    ctx.fillText(slip.title, 0, -20, 62);
    ctx.font = '400 9px "Trebuchet MS", sans-serif';
    slip.lines.forEach((line, i) => {
      ctx.fillText(line, 0, -4 + i * 13, 62);
    });
    ctx.restore();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** The Roam layer's one world-side lever (freeroam.ts): the water-main
   *  barrier stands down so the whole built block is walkable from the
   *  first minute. Visibility is the collider's source of truth — the
   *  same sync dressDay/updateDynamics use parks the body underground
   *  when the prop is hidden, so roaming never argues with a physics box
   *  the eye can't see. Leaving Roam restores the day's authored diary
   *  (the barrier's last authored day is Day 3). */
  setBarrierOpen(open: boolean) {
    this.barrierOpen = open;
    const diary = barrierDiary(this.flyerDay);
    this.barrier.visible = open ? false : diary.barrierVisible;
    this.syncPersonCollider(this.barrierCollider, this.barrier, 0.85, 0.9);
  }

  /**
   * Dress the block for a day (Doc 33 §2.3 — the diary a player reads at a
   * glance). Called by Game.beginDay before the fade-in. Pure material and
   * visibility writes on existing geometry: no spawn, no teardown, no
   * draw-call churn.
   */
  dressDay(day: number) {
    // window lights: someone home late, someone new, someone up early
    const plan = ambientWindowPlan(day);
    this.ambientWindowMatLate.emissiveIntensity = plan.lateHome;
    this.ambientWindowMatNew.emissiveIntensity = plan.newFace;
    this.ambientWindowMatRiser.emissiveIntensity = plan.earlyRiser;
    // the far city keeps its lamps on — the same warm fact every day; the
    // diary across the avenue wakes with the week (Day 3, then Day 4)
    this.skylineWinMat.emissiveIntensity = SKYLINE_WARMTH.steady;
    this.skylineWinDiaryMat.emissiveIntensity = skylineDiaryWarmth(day);
    // the barrier's last day is Day 3; the asphalt remembers. The Roam
    // override wins (freeroam.ts): while roam is active the barrier is
    // down regardless of the day's diary — the whole block stays walkable.
    const diary = barrierDiary(day);
    this.barrier.visible = this.barrierOpen ? false : diary.barrierVisible;
    this.asphaltPatch.visible = diary.patchVisible;
    // the board's slip rotates with the week
    this.flyerDay = day;
    const old = this.flyerMat.map;
    this.flyerMat.map = this.flyerTexture(this.currentFlyerName, day);
    this.flyerMat.needsUpdate = true;
    old?.dispose();
    // the hall re-letters its notice (W4 p2: the marquee's day-keyed dressing)
    this.dressHallNotice(day);
  }

  /** The cart name currently on the flyer (kept so dressDay can redraw). */
  private currentFlyerName = 'YOUR CORNER';
  /** The day the block is currently dressed for (probes read this). */
  get dressedDay(): number {
    return this.flyerDay;
  }

  /** The order bubble — what the customer at the cart is waiting for. */
  makeOrderBubble(text: string): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 80;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(255, 248, 240, 0.96)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 62, 18);
    ctx.fill();
    ctx.strokeStyle = '#3A3440';
    ctx.lineWidth = 5;
    ctx.stroke();
    // the little tail pointing down at the customer
    ctx.beginPath();
    ctx.moveTo(112, 64); ctx.lineTo(128, 78); ctx.lineTo(144, 64);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 248, 240, 0.96)';
    ctx.fill();
    ctx.fillStyle = '#3A3440';
    ctx.font = '800 30px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 34, 226);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(1.7, 0.53, 1);
    return sp;
  }

  /** Keep a person's collider under them; park it underground while hidden —
   *  a box at y -999 can't overlap any capsule, which is the cheapest "off". */
  syncPersonCollider(box: AABB, actor: THREE.Object3D | null, halfW = 0.28, height = 1.7): void {
    if (!actor || !actor.visible) {
      box.minY = -999;
      box.maxY = -998;
      return;
    }
    box.minX = actor.position.x - halfW;
    box.maxX = actor.position.x + halfW;
    box.minY = actor.position.y;
    box.maxY = actor.position.y + height;
    box.minZ = actor.position.z - halfW;
    box.maxZ = actor.position.z + halfW;
  }

  /**
   * Phase 1 of the frame (Game calls this BEFORE the player's move): sync
   * every dynamic collider to this frame's transforms, then advance the cab.
   * The audit (doc 35 §1) found the old single update() ran AFTER
   * player.update — the walker resolved against last frame's cab box, up to
   * 0.9 m stale at the dt clamp, and visibly sank into a passing taxi.
   * Dynamics-before-player fixes the ordering with no gameplay change.
   */
  updateDynamics(dt: number, player?: { x: number; y: number; z: number }, extra?: Array<{ x: number; z: number }>, dusk = false): void {
    // the street schedule's edge (M4): apply the phase's row once per flip —
    // the dusk shift comes on, the park's tender heads home, the cab's pace
    // follows the table. Ambient reads no story state: the dusk flag is the
    // same lever the M121's night park and the court pair already use.
    if (dusk !== this.streetPhaseDusk) {
      this.streetPhaseDusk = dusk;
      const plan = STREET_PLAN[dusk ? 'dusk' : 'day'];
      this.peds.applyStreetPlan(plan);
      this.cabPaceNow = plan.cabPace;
    }
    // the persistent cast owns a body each — no more ghosting through Rosa,
    // Idris, or the kid (playtest 2026-10-30: "passed through the npc and rosa")
    this.syncPersonCollider(this.rosaCollider, this.rosa);
    this.syncPersonCollider(this.idrisCollider, this.idris);
    this.syncPersonCollider(this.kidCollider, this.kidGround, 0.25, 1.4);
    this.syncPersonCollider(this.stoolCollider, this.stool, 0.275, 0.6);
    // the barrier leaves on Day 4 — its body leaves with it (a box at y
    // -999 can't overlap anything: the cheapest "gone")
    this.syncPersonCollider(this.barrierCollider, this.barrier, 0.85, 0.9);
    // the rest of the walking cast (Agent-2): no ghosts on the block
    this.syncPersonCollider(this.strangerCollider, this.stranger);
    this.syncPersonCollider(this.salCollider, this.sal);
    this.syncPersonCollider(this.familiarCollider, this.familiar);
    if (player) {
      this.updateDistricts(player.x, player.z);
      this.updateInteriors(player.x, player.y, player.z);
      this.updateSunFollow(player.x, player.z);
      this.updateFenestraBands(dt, player.x, player.y, player.z);
    }
    this.updateTaxi(dt, player, extra);
    // the M121 runs AFTER the cab: its pool reads the cab's fresh rect, and
    // the cab's next pool reads the bus's (each mover yields to the other
    // one frame stale — the stopGap absorbs a frame of closing at these
    // speeds). dusk = the night flag: the bay dwell never expires after
    // dark, so the last bus goes home and the district settles.
    this.updateBus(dt, player, extra, dusk);
  }

  /** Phase 2 of the frame (after the player's move): everything that only
   *  reads the world — pedestrian steering, birds, steam, leaves. */
  updateAmbient(dt: number, player?: { x: number; y: number; z: number }, dusk = false,
    /** TRUE frame delta (capped 1 s) — feeds the subway ride machine only.
     *  The ride is a wall-clock experience (22 s doors-closed); the render
     *  clamp would starve it on low-fps devices (the field report "ride to
     *  Times Square doesn't work"). Everything here keeps the clamped dt. */
    trueDt?: number,
  ): void {
    // the walkers steer around you and the cart, mind the furniture, and
    // hold their ground against the cab's — and now the M121's — footprint
    this.peds.update(
      dt,
      player ? { x: player.x, z: player.z } : undefined,
      { x: this.cartRoot.position.x, z: this.cartRoot.position.z },
      { x: this.taxi.position.x, z: this.taxi.position.z },
      { x: this.rosa.position.x, z: this.rosa.position.z },
      { x: this.busGroup.position.x, z: this.busGroup.position.z },
    );
    // NZ-COURT's pickup pair takes the court while dusk lasts (registry:
    // "when: dusk" — the plaza settles at night, so does the game)
    this.courtDusk.visible = dusk;

    // steam rises and wobbles — the Rule of Steam
    const posAttr = this.steamPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.steamSeed.length; i++) {
      let y = posAttr.getY(i) + dt * (0.6 + 0.4 * Math.sin(this.steamSeed[i]));
      let x = posAttr.getX(i) + Math.sin(y * 1.7 + this.steamSeed[i]) * dt * 0.18;
      if (y > 2.8) { y = 0.1; x = -10 + (Math.random() - 0.5) * 0.5; }
      posAttr.setY(i, y);
      posAttr.setX(i, x);
    }
    posAttr.needsUpdate = true;

    this.ambientTime += dt;
    // trees breathe — the instanced canopy sways in updateTreeRows below
    // (one tick owns every blob: the shipped/full/fill trees and the W1
    // rows alike). The old per-canopy-group rotation is gone with the
    // canopy groups themselves.
    // fade-on-occlude — the camera reports which canopies stand between it
    // and the player (GameCamera.updateOcclusion); a canopy that swallows
    // the player dissolves toward gauze instead of hiding them. Fast fade
    // in (~8/s), so the lens never lingers behind full leaves. Each tree
    // names its own sphere in the cache (sphereIndex), so the mapping is
    // explicit — the W1 rows' spheres interleave the cache and never faded.
    // The fade now writes per-instance alpha (aFade) instead of per-tree
    // material opacity: the law is unchanged (ONE tree dissolves), the
    // mechanism follows the instanced canopy.
    if (this.canopyOcclusion) {
      for (const t of this.trees) {
        if (t.sphereIndex >= this.canopyOcclusion.length) continue;
        const target = 1 - 0.78 * this.canopyOcclusion[t.sphereIndex]; // floor 0.22 gauze
        t.fade += (target - t.fade) * Math.min(1, dt * 8);
        for (const b of t.blobs) this.canopyFade[b.key]?.setX(b.idx, t.fade);
      }
      for (const f of this.canopyFade) if (f) f.needsUpdate = true;
    }
    // the near washer spins while the apron is in the machine (Rule of Steam)
    if (this.washerRunning && this.washerLoad) {
      this.washerLoad.rotation.y += dt * 5.2;
    }
    const pp = player ? { x: player.x, z: player.z } : undefined;
    this.pigeonFlock.update(dt, pp, dusk);
    this.pigeonFlockEast.update(dt, pp, dusk);
    this.squirrel.update(dt, pp, dusk);
    this.leaves.update(dt, this.ambientTime);
    this.updateTreeRows(this.ambientTime); // the W1 rows sway with the block

    // ---- the far world: zones, the dollhouse, the square, the bus ----
    if (player && this.subway) {
      const feet = player as { x: number; y: number; z: number };
      this.subway.update(trueDt ?? dt, feet, (key) => this.subwayBeats.push(key));
      if (this.subway.underground !== this.dollhouseOn) {
        this.dollhouseOn = this.subway.underground;
        this.setUndergroundShadow(this.dollhouseOn);
        for (const m of this.terminalShell) m.visible = !this.dollhouseOn;
        // the mass collider rides with the shell: the camera's boom ray-cast
        // sees the cutaway the lens sees, or shortenBoom parks the lens on
        // the (invisible) wall and the player fills the frame
        if (this.dollhouseOn && this.terminalCollider) {
          const i = this.colliders.indexOf(this.terminalCollider);
          if (i >= 0) this.colliders.splice(i, 1);
        } else if (!this.dollhouseOn && this.terminalCollider && !this.colliders.includes(this.terminalCollider)) {
          this.colliders.push(this.terminalCollider);
        }
      }
      this.timesSquare.group.visible = this.subway.lit.has('tsSurface');
      const tsBeat = this.timesSquare.update(dt, feet, this.worldDay);
      if (tsBeat) this.tsBeats.push(tsBeat);
      this.arrivalBus.update(dt);
      for (const person of this.subwayCast) {
        updatePersonAnim(person, dt); // the idle breathe
      }
    }
  }

  /** Game calls this when the day changes — the sync beat is day-keyed. */
  setWorldDay(day: number): void {
    this.worldDay = day;
  }

  /** The K line's cast: Priya at the fare bank, the busker on the 42nd St
   *  platform, and the riders who make a train a train. All ride their
   *  zone groups' visibility; one breathe tick each from updateDynamics. */
  private buildSubwayCast(): void {
    const S = this.subway;
    const place = (name: string, look: Parameters<typeof buildArticulatedPerson>[0],
      g: THREE.Group, x: number, y: number, z: number, yaw: number): THREE.Group => {
      const person = this.buildPerson(look);
      person.name = name;
      person.position.set(x, y, z);
      person.rotation.y = yaw;
      g.add(person);
      this.subwayCast.push(person);
      this.colliders.push(boxFromCenter(x, y + 0.9, z, 0.85, 1.8, 0.85));
      return person;
    };
    // Priya — the conductor who waves you through (Doc 02: "Go on. It's
    // one stop. You're with me.") — by the fare bank, facing the stairs
    place('Priya', { jacket: 0x2A9D8F, pants: 0x3a3a42, skin: 0xe8b08e, hair: 0x2b2730, style: 'cap' },
      S.groups.stationA, S.anchors.priya.x, S.anchors.priya.y, S.anchors.priya.z, Math.PI);
    // the busker — 42nd St platform, sax up, coin cup out
    const busker = place('TheBusker', { jacket: 0x6D4C7D, pants: 0x3a3a42, skin: 0xd9a06b, hair: 0x1a1a22, style: 'flat' },
      S.groups.stationB, S.anchors.busker.x, S.anchors.busker.y, S.anchors.busker.z, Math.PI * 0.9);
    const brass = (c: number) => this.mat(c);
    const sax = new THREE.Group();
    sax.name = 'SUB_Sax';
    const pipe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), brass(0xB08D3C));
    pipe.position.set(0.18, 1.05, 0.22);
    const bell = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.2), brass(0xB08D3C));
    bell.position.set(0.3, 0.72, 0.28);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.22), brass(0x2b2430));
    mouth.position.set(0.08, 1.32, 0.14);
    sax.add(pipe, bell, mouth);
    busker.add(sax);
    // riders: two in the aligned car (the ride reads through the windows),
    // one waiting on the 42nd St platform
    const riderLook = { jacket: 0xB23A48, pants: 0x3a3a42, skin: 0xe8b08e, hair: 0x453b4c, style: 'bun' } as const;
    place('SUB_Rider_A1', riderLook, S.groups.trainA, -46.2, STATION.floorTop, 16.5, Math.PI / 2);
    place('SUB_Rider_A2', { jacket: 0x514659, pants: 0x473e50, skin: 0x8a5a3a, hair: 0x2b2730, style: 'cap' },
      S.groups.trainA, -39.6, STATION.floorTop, 16.5, -Math.PI / 2);
    place('SUB_Wait_B1', { jacket: 0x2A9D8F, pants: 0x473e50, skin: 0xd9a06b, hair: 0x1a1a22, style: 'flat' },
      S.groups.stationB, -327.2, STATION.floorTop, 11.6, Math.PI);
  }

  /** Terminal-dressing collection for the dollhouse: every mesh whose
   *  position sits over the station box (x -50.5..-20.5, z 7.7..20.2,
   *  above grade) lifts off with the terminal mass. Zone groups manage
   *  their own visibility and are skipped outright. */
  private collectTerminalShell(): void {
    const SKIP = new Set(['SUB_Root', 'TSS_Group', 'BUS_M121']);
    const inZone = (o: THREE.Object3D): boolean => {
      for (let p: THREE.Object3D | null = o; p; p = p.parent) {
        if (SKIP.has(p.name)) return false;
      }
      return true;
    };
    this.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !inZone(o)) return;
      const p = o.position;
      if (p.x > -50.5 && p.x < -20.5 && p.z > 7.7 && p.z < 20.2 && p.y > -0.2) {
        this.terminalShell.push(o);
      }
      // the north yard slab roofs the whole block (x −60..60, z 8..32) —
      // without it in the shell, the cutaway looks at 120 m of lawn
      if (o.name === 'Yard_N') this.terminalShell.push(o);
    });
    // the terminal mass's own collider, by its geometry (one 29×14×12 box)
    for (const b of this.colliders) {
      if (b.minX === -50 && b.maxX === -21 && b.maxY === 14 && b.minZ === 8) {
        this.terminalCollider = b;
        break;
      }
    }
  }

  /** Both phases, in order — kept for any caller that just wants "advance
   *  the world" (tests, probes). Game.frame calls the phases separately. */
  update(dt: number, player?: { x: number; y: number; z: number }, dusk = false, extra?: Array<{ x: number; z: number }>) {
    this.updateDynamics(dt, player, extra);
    this.updateAmbient(dt, player, dusk);
  }

  // ---- the cab: NYC rules on rails (doc 35 §1 "Vehicles") ---------------
  // Preserved from the playtest fixes: crosswalk-only courtesy hold, yield
  // to anyone in the path, wrap at the district's edge. Rebuilt on the
  // traffic brain:
  //   - progressive braking (the old 9→0 hard cut snapped on screen),
  //   - lateral truth (a body 3 m clear on the curb no longer freezes the
  //     cab from 10 m away — the old |z|<4.2 gate),
  //   - bodies fully behind the tail never block (the old gap > -2.3 test
  //     stopped the cab for things it had already passed),
  //   - vehicle-vs-vehicle: the parked cars are declared bodies (one list,
  //     busRoute.PARKED_CAR_RECTS — the bus reads the same), so a car ahead
  //     in the lane is braked for, not driven through,
  //   - a committed-move guard: the rail step is clamped by noseLimit()
  //     BEFORE it lands, so no frame can end with the cab inside anyone.
  // W4 part 2: the rail runs the FULL district, x ±84 (registry taxi.
  // phaseW4: "rail extends to ±84 through both intersections"), and the
  // courtesy zones grow XW-COURT and both junction boxes (busRoute.
  // KESTREL_COURTESY_ZONES — the M121's leg 0 yields at the same paint).
  private static readonly CAB = {
    cruise: 9.0,       // main.gd: x += 9*dt
    halfLen: 2.2,      // collider 4.4 × 1.95
    halfWid: 0.975,
    laneZ: -2,
    stopGap: 2.5,      // air held between the nose and whatever it yields to —
                       // generous on purpose: a nose-to-nose cab wall is
                       // unnavigable for a diagonal-crossing pedestrian
    gain: 2.2,         // braking curve (1/s) — decel ≈ gain × speed
    pedRadius: 0.45,   // how much coat a body wears beyond its center
    holdCenterX: -10.7 // crosswalk hold: nose at the crosswalk's west edge
  } as const;
  /** The courtesy hold's occupied z-band — the roadway plus a stride. */
  private static readonly COURTESY_Z = { zMin: -4.6, zMax: 4.6 } as const;

  /** Preallocated yield bodies — the scan runs every frame; nothing in it
   *  may allocate (perf rule: no per-frame garbage). Each slot owns its rect
   *  object so the bus's leg-space pool can reuse the same pattern. */
  private readonly trafficPool: TrafficBody[] = Array.from({ length: 30 }, () => ({ x: 0, z: 0, r: 0, rect: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 } }));
  private readonly cabRectScratch: AABB = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  private readonly sweepRectScratch: AABB = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };

  private updateTaxi(dt: number, player?: { x: number; y: number; z: number }, extra?: Array<{ x: number; z: number }>): void {
    const CAB = World.CAB;
    const road = this.taxi.position;
    const noseX = road.x + CAB.halfLen;

    // ---- gather today's street into the yield pool (preallocated) --------
    let n = 0;
    const pool = this.trafficPool;
    const addBody = (x: number, z: number, r: number) => {
      if (n >= pool.length) return;
      pool[n].x = x; pool[n].z = z; pool[n].r = r; pool[n].rect = undefined;
      n++;
    };
    if (player) addBody(player.x, player.z, CAB.pedRadius);
    if (extra) for (const b of extra) addBody(b.x, b.z, CAB.pedRadius);
    for (const b of this.peds.bodies()) addBody(b.x, b.z, 0.4);
    // vehicles: rects, so car-vs-car is footprint-to-footprint. One declared
    // list (busRoute.PARKED_CAR_RECTS — the M121's pool reads the same), and
    // the M121 itself: the cab brakes for the bus exactly like for a parked
    // car. (The cab never yields to itself, and never to the invisible
    // bounds — the wrap at ±84 is authored.)
    for (const c of PARKED_CAR_RECTS) {
      if (n >= pool.length) break;
      const r = parkedCarRect(c);
      const slot = pool[n];
      slot.x = c.x; slot.z = c.z; slot.r = 0;
      slot.rect = slot.rect ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
      slot.rect.minX = r.minX; slot.rect.maxX = r.maxX;
      slot.rect.minZ = r.minZ; slot.rect.maxZ = r.maxZ;
      n++;
    }
    if (n < pool.length) {
      const slot = pool[n];
      slot.x = this.busGroup.position.x; slot.z = this.busGroup.position.z; slot.r = 0;
      slot.rect = slot.rect ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
      slot.rect.minX = this.busCollider.minX; slot.rect.maxX = this.busCollider.maxX;
      slot.rect.minZ = this.busCollider.minZ; slot.rect.maxZ = this.busCollider.maxZ;
      n++;
    }

    const cabRect = this.cabRectScratch;
    cabRect.minX = road.x - CAB.halfLen; cabRect.maxX = road.x + CAB.halfLen;
    cabRect.minZ = CAB.laneZ - CAB.halfWid; cabRect.maxZ = CAB.laneZ + CAB.halfWid;

    // ---- courtesy rule 1: the crosswalks and junction boxes ---------------
    // Occupied = a body (never a parked car) stands inside the zone's paint
    // band; the cab brakes toward the zone's west edge on the curve — a
    // creep to the line. The shipped XW-CANON numbers are preserved exactly
    // (holdCenterX −10.7 = zone xMin −8.5 minus the halfLen); W4 p2 adds
    // XW-COURT and both junction boxes from the one shared list. Commit law
    // unchanged: once the nose has reached the zone's line the cab goes —
    // a lurch stop inside the paint is its own hazard.
    let speed: number = CAB.cruise * this.cabPaceNow; // the schedule's pace — rush crawls
    for (const zone of KESTREL_COURTESY_ZONES) {
      let occupied = !!(player && player.x > zone.xMin && player.x < zone.xMax
        && player.z > World.COURTESY_Z.zMin && player.z < World.COURTESY_Z.zMax);
      if (!occupied && extra) {
        occupied = extra.some((b) => b.x > zone.xMin && b.x < zone.xMax
          && b.z > World.COURTESY_Z.zMin && b.z < World.COURTESY_Z.zMax);
      }
      for (let i = 0; i < n && !occupied; i++) {
        const b = pool[i];
        if (b.rect) continue;
        if (b.x > zone.xMin && b.x < zone.xMax
          && b.z > World.COURTESY_Z.zMin && b.z < World.COURTESY_Z.zMax) occupied = true;
      }
      if (occupied && road.x < zone.xMin) {
        const gapToLine = (zone.xMin - CAB.halfLen) - road.x; // nose holds at xMin
        speed = Math.min(speed, approachSpeed(CAB.cruise, gapToLine, CAB.stopGap, CAB.gain));
      }
    }

    // ---- rule 2: anything actually in the path (lateral truth) ------------
    // The sweep window covers the FULL braking distance (stopGap + the
    // curve's stopping span), so the cab enters the curve already braking —
    // a window sized to the nose alone would drop 9→2 m/s in one frame,
    // which is exactly the snap this rewrite removes.
    const sweepRect = this.sweepRectScratch;
    sweepRect.minX = cabRect.minX;
    sweepRect.maxX = noseX + CAB.stopGap + CAB.cruise / CAB.gain + 0.5;
    sweepRect.minZ = cabRect.minZ;
    sweepRect.maxZ = cabRect.maxZ;
    for (let i = 0; i < n; i++) {
      const b = pool[i];
      if (b.rect) {
        if (!bodyConflictsWithCab(b, cabRect)) continue; // laterally clear
        const clearance = Math.max(b.rect.minX - noseX, 0);
        if (b.rect.maxX <= road.x - CAB.halfLen) continue; // fully behind
        speed = Math.min(speed, approachSpeed(CAB.cruise, clearance, CAB.stopGap, CAB.gain));
      } else {
        speed = Math.min(speed, pedestrianSpeedCap(
          CAB.cruise, CAB.stopGap, CAB.gain,
          b.x, b.r, road.x - CAB.halfLen, noseX,
          bodyConflictsWithCab(b, sweepRect),
        ));
      }
    }

    // ---- committed-move guard: resolve BEFORE moving, never after ---------
    const limit = noseLimit(noseX, pool, n, CAB.laneZ, CAB.halfWid);
    const wantedNose = noseX + dt * speed;
    road.x += Math.min(wantedNose, limit) - noseX;
    if (road.x > 84) road.x = -84; // the district's edge: the rail wraps (W4 p2: was ±46)
    this.taxiCollider.minX = road.x - CAB.halfLen;
    this.taxiCollider.maxX = road.x + CAB.halfLen;

    // post-move truth: a body the cab slid beside (never through) gets the
    // air it is owed — the pedestrian yields to the vehicle, pushed out
    // along the shortest exit, capped so nobody slingshots
    cabRect.minX = road.x - CAB.halfLen; cabRect.maxX = road.x + CAB.halfLen;
    this.peds.resolveAgainstCab(cabRect);
  }

  // ---- the M121: the district's bus on the cab's own yield brain ---------
  // Registry transit.bus: loop "terminal lay-over → Gable St → Sycamore Ave
  // → Kestrel St → Juniper Ave → terminal", "a rail mover like the cab with
  // a longer body and the same yield brain", arrivals deterministic. The
  // route law (engine/busRoute) folds the loop into four axis-aligned legs
  // so approachSpeed / noseLimit / bodyConflictsWithCab run UNCHANGED in leg
  // space; this step adds only what a bus is and a cab is not: stop dwells,
  // the curb pull-out, and the night park (the bay dwells through the dusk —
  // the district settles, the last bus goes home). No randomness anywhere:
  // same seed, same arrivals, the E2E meets the same bus every run.
  private static readonly BUS = {
    cruise: 7.0,    // the bus is not in a hurry either
    stopGap: 2.8,   // longer body, longer air
    gain: 1.8,      // heavier — a lazier braking curve
    pedRadius: 0.45,
    latRate: 1.4,   // the curb pull-out speed (m/s)
    turnRate: 4.0,  // the corner yaw ease (rad/s)
    haltGap: 0.4,   // "at the mark" — begin the dwell when this close
    // The Zeno guard (probe-w4-bus + the 180 s stall trace found it): the
    // braking curve is v = gain·air, so the closing speed decays with the
    // air — the nose approaches the halt line GEOMETRICALLY, never quite
    // reaching it, and once the per-frame creep sinks under the float ULP
    // the bus stands a hair above `haltGap` forever (observed: 110+ s at
    // 4 mm... 4e-13 m short of BUS-01). The dwell therefore arms within
    // haltEps of the line too, and the serve snaps the last whisker — the
    // halt lands exactly on the mark, deterministically, every lap.
    haltEps: 0.02,
  } as const;

  private readonly busPool: TrafficBody[] = Array.from({ length: 32 }, () => ({ x: 0, z: 0, r: 0, rect: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 } }));
  private readonly busFootScratch: RectXZ = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  private readonly busSweepScratch: RectXZ = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  private readonly busWorldRectScratch: AABB = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  private readonly busZoneScratch: BusZone = { a0: 0, a1: 0, l0: 0, l1: 0 };
  private readonly busCoordScratch: LegCoords = { a: 0, l: 0 };
  private readonly busPointScratch: { x: number; z: number } = { x: 0, z: 0 };

  private updateBus(dt: number, player?: { x: number; y: number; z: number }, extra?: Array<{ x: number; z: number }>, night = false): void {
    const BUS = World.BUS;
    const legs = this.M121_LEGS;
    const st = this.busState;
    const leg = legs[st.leg];
    const f = leg.frame;
    st.night = night;

    // ---- the yield pool, in LEG SPACE (x = advance, z = lateral) ----------
    // player + peds as circles; the parked cars AND the cab as rects. The
    // bus never yields to itself — each mover's pool is built per call,
    // exactly like the cab's.
    let n = 0;
    const pool = this.busPool;
    const addCircle = (x: number, z: number, r: number) => {
      if (n >= pool.length) return;
      worldToLeg(x, z, f, this.busCoordScratch);
      pool[n].x = this.busCoordScratch.a; pool[n].z = this.busCoordScratch.l;
      pool[n].r = r; pool[n].rect = undefined;
      n++;
    };
    if (player) addCircle(player.x, player.z, BUS.pedRadius);
    if (extra) for (const b of extra) addCircle(b.x, b.z, BUS.pedRadius);
    for (const b of this.peds.bodies()) addCircle(b.x, b.z, 0.4);
    const addWorldRect = (minX: number, maxX: number, minZ: number, maxZ: number) => {
      if (n >= pool.length) return;
      aabbToLeg(minX, maxX, minZ, maxZ, f, this.busZoneScratch);
      const slot = pool[n];
      slot.x = (this.busZoneScratch.a0 + this.busZoneScratch.a1) / 2;
      slot.z = (this.busZoneScratch.l0 + this.busZoneScratch.l1) / 2;
      slot.r = 0;
      slot.rect = slot.rect ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
      slot.rect.minX = this.busZoneScratch.a0; slot.rect.maxX = this.busZoneScratch.a1;
      slot.rect.minZ = this.busZoneScratch.l0; slot.rect.maxZ = this.busZoneScratch.l1;
      n++;
    };
    for (const c of PARKED_CAR_RECTS) {
      const r = parkedCarRect(c);
      addWorldRect(r.minX, r.maxX, r.minZ, r.maxZ);
    }
    addWorldRect(this.taxiCollider.minX, this.taxiCollider.maxX, this.taxiCollider.minZ, this.taxiCollider.maxZ);

    const foot = this.busFootScratch;
    foot.minX = st.a - BUS_BODY.halfLen;
    foot.maxX = st.a + BUS_BODY.halfLen;
    foot.minZ = st.lat - BUS_BODY.halfWid;
    foot.maxZ = st.lat + BUS_BODY.halfWid;
    const noseA = foot.maxX;

    // ---- the next stop: the mark the nose is approaching or parked at -----
    let stopIdx = -1;
    for (let i = 0; i < leg.stops.length; i++) {
      if (leg.stops[i].a >= noseA - BUS.haltGap) { stopIdx = i; break; }
    }
    const stop = stopIdx >= 0 ? leg.stops[stopIdx] : null;

    // ---- the dwell: parked at the mark; the bay dwells through the night --
    if (st.dwell > 0) {
      const atBay = stop !== null && stop.id === BUS_BAY_ID;
      if (!atBay || !night) st.dwell -= dt;
      if (st.dwell > 0) {
        // parked: no advance this frame — place the body and leave
        legToWorld(st.a, st.lat, f, this.busPointScratch);
        this.busGroup.position.set(this.busPointScratch.x, 0, this.busPointScratch.z);
        this.busGroup.rotation.y = st.yaw;
        this.syncBusCollider();
        this.syncBayOccupancy(player);
        this.peds.resolveAgainstCab(this.busWorldRectScratch);
        return;
      }
    }

    // ---- speed: the stop line, the courtesy zones, then the yield scan ----
    let speed: number = BUS.cruise;

    if (stop && st.servedStop !== stop.id) {
      // ONE BAY, ONE BUS (docs/47 "the terminal bay, made honest"): while
      // the player stands inside the registry's enterable BUS-04, the bay
      // is occupied. Before first contact (nose advance < 98.85 ↔ the nose
      // east of BUS-04's tail −26.65) the arriving bus HOLDS in place —
      // the same stall the yield brain gives any body in the lane — and
      // serves the moment the player steps out. Past that line the
      // approach is committed: roll through and try again next lap
      // (baySkipped also keeps the pull-out from driving through the paint).
      if (stop.id === BUS_BAY_ID && player && this.playerInsideArrival(player)) {
        if (noseA < 72.2 + BUS04_RECT.maxX) {
          speed = 0;
        } else {
          st.servedStop = stop.id;
          st.baySkipped = true;
          speed = BUS.cruise;
        }
      } else {
        const clearance = Math.max(stop.a - noseA, 0);
        speed = Math.min(speed, approachSpeed(BUS.cruise, clearance, BUS.haltGap, BUS.gain));
        if (clearance <= BUS.haltGap + BUS.haltEps) {
          // snap the last whisker so the halt is ON the mark (the Zeno guard)
          st.a += Math.max(clearance - BUS.haltGap, 0);
          st.dwell = stop.dwell;
          st.servedStop = stop.id;
          if (stop.id === BUS_BAY_ID) st.baySkipped = false;
          speed = 0;
        }
      }
    }

    // courtesy rule: occupied paint holds the nose at the zone's line (a0)
    for (const z of leg.zones) {
      let occupied = false;
      for (let i = 0; i < n && !occupied; i++) {
        const b = pool[i];
        if (b.rect) continue;
        if (b.x > z.a0 - 0.3 && b.x < z.a1 + 0.3 && b.z > z.l0 && b.z < z.l1) occupied = true;
      }
      if (!occupied || noseA >= z.a0) continue; // empty, or committed past the line
      speed = Math.min(speed, approachSpeed(BUS.cruise, z.a0 - noseA, BUS.stopGap, BUS.gain));
    }

    // rule 2: anything actually in the path (lateral truth, the cab's own
    // sweep shape — full braking distance, not the nose alone)
    const sweep = this.busSweepScratch;
    sweep.minX = foot.minX;
    sweep.maxX = noseA + BUS.stopGap + BUS.cruise / BUS.gain + 0.5;
    sweep.minZ = foot.minZ;
    sweep.maxZ = foot.maxZ;
    for (let i = 0; i < n; i++) {
      const b = pool[i];
      if (b.rect) {
        if (!bodyConflictsWithCab(b, foot)) continue;      // laterally clear
        if (b.rect.maxX <= foot.minX) continue;            // fully behind
        const clearance = Math.max(b.rect.minX - noseA, 0);
        speed = Math.min(speed, approachSpeed(BUS.cruise, clearance, BUS.stopGap, BUS.gain));
      } else {
        if (b.x + b.r <= foot.minX) continue;              // fully behind
        if (!bodyConflictsWithCab(b, sweep)) continue;     // not in the path
        const clearance = Math.max((b.x - b.r) - noseA, 0);
        speed = Math.min(speed, approachSpeed(BUS.cruise, clearance, BUS.stopGap, BUS.gain));
      }
    }

    // ---- the committed-move guard, then the pull-out, then the wrap -------
    const limit = noseLimit(noseA, pool, n, st.lat, BUS_BODY.halfWid);
    const move = Math.max(Math.min(dt * speed, limit - noseA), 0);
    st.a += move;

    // the curb pull-out: ease toward the bay from 9 m before the mark, hold
    // it through the dwell, and ease back to the lane from the mark itself
    // (the terminal bay's partner car is only 8 m west — a late merge would
    // kiss it; the probe caught the exact stutter).
    let latTarget = 0;
    if (stop && !(st.baySkipped && stop.id === BUS_BAY_ID)) {
      const dist = stop.a - noseA;
      if (dist < 9 && dist > -2) latTarget = stop.lateral;
    }
    const maxLat = dt * BUS.latRate;
    let latNext = st.lat + Math.max(-maxLat, Math.min(maxLat, latTarget - st.lat));
    // THE PULL-OUT GATE (probe-w4-bus found the deadlock): the bus never
    // DEEPENS its pull while the body at the would-be offset would overlap
    // a vehicle rect — at BUS-01 the van sits abeam when the pull window
    // opens, and a vehicle yields to no vehicle, so an ungated pull wedges
    // forever. The gate holds the offset; the pull completes the moment the
    // tail clears — exactly a real bus's move. Returning to the lane is
    // never gated (the lane is the bus's own road).
    if (latNext > st.lat) {
      foot.minX = st.a - BUS_BODY.halfLen; foot.maxX = st.a + BUS_BODY.halfLen;
      foot.minZ = latNext - BUS_BODY.halfWid; foot.maxZ = latNext + BUS_BODY.halfWid;
      for (let i = 0; i < n && latNext > st.lat; i++) {
        const b = pool[i];
        if (b.rect && bodyConflictsWithCab(b, foot)) latNext = st.lat; // hold
      }
    }
    st.lat = latNext;

    if (st.a >= f.len) {
      // the center rounds the corner: carry the overshoot into the next leg
      st.a -= f.len;
      st.leg = (st.leg + 1) % legs.length;
      st.servedStop = null;
      st.baySkipped = false;
      if (st.leg === 0) st.laps++;
    }

    // face the leg (the yaw eases at corners — a pivot, not a snap), then place
    const targetYaw = travelYaw(f.ax, f.az);
    let dy = targetYaw - st.yaw;
    while (dy > Math.PI) dy -= 2 * Math.PI;
    while (dy < -Math.PI) dy += 2 * Math.PI;
    st.yaw += Math.max(-BUS.turnRate * dt, Math.min(BUS.turnRate * dt, dy));
    legToWorld(st.a, st.lat, legs[st.leg].frame, this.busPointScratch);
    this.busGroup.position.set(this.busPointScratch.x, 0, this.busPointScratch.z);
    this.busGroup.rotation.y = st.yaw;
    this.syncBusCollider();
    this.syncBayOccupancy(player);
    // post-move truth: walkers get the air they are owed (the cab's law)
    this.peds.resolveAgainstCab(this.busWorldRectScratch);
  }

  /** ONE BAY, ONE BUS (docs/47 "the terminal bay, made honest"). The bay
   *  holds the registry's enterable M121 (BUS-04, arrivalBus.ts) AND is the
   *  loop's lay-over — the two bodies must never stand there together (the
   *  merge had them fused, the door walled shut). The rule, evaluated from
   *  the body's just-synced collider: while the loop's rect intersects
   *  BUS-04's footprint and the player is NOT standing inside, BUS-04
   *  yields (hidden, colliders retired); the moment the rects part again
   *  — ~1.5 s after the loop pulls out — the shell is restored. The
   *  player-inside guard is what keeps the floor under your feet through
   *  the skip pass (the bus rolls past the standing shell it may not have). */
  private syncBayOccupancy(player?: { x: number; y: number; z: number }): void {
    const b = this.busCollider;
    const hit = b.maxX > BUS04_RECT.minX && b.minX < BUS04_RECT.maxX
      && b.maxZ > BUS04_RECT.minZ && b.minZ < BUS04_RECT.maxZ;
    const wantHidden = hit && !this.playerInsideArrival(player);
    if (wantHidden !== this.arrivalHidden) this.setArrivalHidden(wantHidden);
  }

  /** Is the player standing inside BUS-04's registry interior — or mid-board
   *  on its curb-side step? The law is pure and tested (arrivalBus.ts). The
   *  y band keeps the street out; the step branch keeps the shell under a
   *  BOARDING player's feet (docs/51 B2): without it the loop M121 could
   *  park on the bay mid-board and retire the step + floor out from under
   *  them, its own body walling the door behind that. */
  private playerInsideArrival(player?: { x: number; y: number; z: number }): boolean {
    if (!player) return false;
    return playerOccupiesBus04(player.x, player.y, player.z);
  }

  /** Swap BUS-04's shell + its colliders as one unit. The AABB objects are
   *  the same instances the player's collision list holds, so the splice
   *  is the whole truth (the player reads this.colliders by reference). */
  private setArrivalHidden(hidden: boolean): void {
    this.arrivalHidden = hidden;
    this.arrivalBus.group.visible = !hidden;
    if (hidden) {
      for (const b of this.arrivalBoxes) {
        const i = this.colliders.indexOf(b);
        if (i >= 0) this.colliders.splice(i, 1);
      }
    } else {
      for (const b of this.arrivalBoxes) {
        if (!this.colliders.includes(b)) this.colliders.push(b);
      }
    }
  }

  /** Sync the bus's collider + world rect from the group's current pose —
   *  the yaw-aligned body's AABB superset (|cos|·hl + |sin|·hw per axis). */
  private syncBusCollider(): void {
    const c = Math.abs(Math.cos(this.busGroup.rotation.y));
    const s = Math.abs(Math.sin(this.busGroup.rotation.y));
    const ex = c * BUS_BODY.halfLen + s * BUS_BODY.halfWid;
    const ez = s * BUS_BODY.halfLen + c * BUS_BODY.halfWid;
    const px = this.busGroup.position.x, pz = this.busGroup.position.z;
    this.busCollider.minX = px - ex; this.busCollider.maxX = px + ex;
    this.busCollider.minZ = pz - ez; this.busCollider.maxZ = pz + ez;
    const w = this.busWorldRectScratch;
    w.minX = this.busCollider.minX; w.maxX = this.busCollider.maxX;
    w.minZ = this.busCollider.minZ; w.maxZ = this.busCollider.maxZ;
  }

  /** Probe/driver handle: the bus's rail state in one object. */
  busDebug(): { leg: number; legName: string; a: number; x: number; z: number; yaw: number; dwell: number; laps: number; night: boolean } {
    const st = this.busState;
    return {
      leg: st.leg, legName: this.M121_LEGS[st.leg].name, a: st.a,
      x: this.busGroup.position.x, z: this.busGroup.position.z, yaw: st.yaw,
      dwell: st.dwell, laps: st.laps, night: st.night,
    };
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
        o.geometry?.dispose?.();
        const m = o.material as THREE.Material | THREE.Material[];
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else m?.dispose?.();
      }
    });
  }
}

/** Greybox-style light energy → three r155+ physical intensity. */
export function phys(energy: number): number {
  return energy * Math.PI;
}
