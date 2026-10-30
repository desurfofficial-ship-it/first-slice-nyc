/**
 * The Day 1 block — built procedurally from the greybox oracle's exact
 * dimensions (greybox-godot/scripts/main.gd `_build_world`), which implement
 * Doc 10 (Day 1 greybox layout). Palette per Doc 04. Additions beyond the
 * greybox are limited to Doc 04's object canon (water towers, cart string
 * lights) — no new gameplay-bearing geometry.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PAL } from '../core/palette';
import { ITEM_LABELS } from '../core/content';
import { boxFromCenter, type AABB } from '../engine/collide';
import { approachSpeed, bodyConflictsWithCab, noseLimit, type TrafficBody } from '../engine/traffic';
import { buildArticulatedPerson } from './personRig';
import { MatBank, makeTree, makeTreePit, makeStreetlight, makeTrashCan, makeRecycleBin, makeHydrant,
  makeSubwayEntrance, makeBulletinBoard, makeBench, makeBusStop, makeNewspaperBoxes, makeBarrier,
  makeACUnit, makeBrownstoneStoop, makeStorefront, makeStool, makeVan } from './props';
import { PigeonFlock, Squirrel, seededRng } from './ambient';
import { makeUtilityPole, makeSpanWires, makePoleSign, makePlanter, makeFireEscapeDeco, makeTrafficSignal } from './streetAssets';
import { LeafDrift } from './leaves';
import { Pedestrians, type PedLook } from './peds';
import { ambientWindowPlan, barrierDiary, flyerSlipForDay } from './dressing';
import { D4_LAUNDRY_SIGN, D4_NOTICE_TITLE, D4_NOTICE_LINES, D4_RECEIPT_TEXT } from '../core/content';

export interface LadderInfo { area: AABB; top: number; }

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
  readonly fog: THREE.Fog;
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
  /** The Day-3 stool's body — parked underground until the purchase makes
   *  it real; synced in updateDynamics like the cast. */
  readonly stoolCollider: AABB;
  /** The water-main barrier's body — parked underground the day the city
   *  takes it (Day 4's diary); synced in updateDynamics like the cast. */
  readonly barrierCollider: AABB = boxFromCenter(-9.7, 0.45, 7.62, 1.7, 0.9, 0.56);
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
  /** The day the flyer board is currently dressed for (slips rotate by day). */
  private flyerDay = 1;
  private washerLoad: THREE.Mesh | null = null;
  private washerRunning = false;
  private readonly bank: MatBank;
  private readonly trees: Array<{ group: THREE.Group; canopy: THREE.Group; phase: number; mats: THREE.MeshLambertMaterial[]; fade: number }> = [];
  /** Canopy bounding spheres for the camera's sight-line guard. */
  private readonly canopySpheresCache: Array<{ x: number; y: number; z: number; r: number }> = [];
  private readonly pigeonFlock: PigeonFlock;
  private readonly pigeonFlockEast: PigeonFlock; // the east end gets its own small knot of birds
  private readonly squirrel: Squirrel;
  private leaves!: LeafDrift;
  private peds: Pedestrians;
  private ambientTime = 0;

  /** Read-only XZ of every ambient walker (diagnostics + probes). */
  pedBodies(): Array<{ x: number; z: number }> {
    return this.peds ? this.peds.bodies() : [];
  }

  private steamPoints: THREE.Points;
  private steamSeed: Float32Array;
  private steamLife: Float32Array;

  /** Decorative props a generated .glb (public/models/<id>.glb) may replace. */
  private glbProps = new Map<string, THREE.Object3D>();
  /** Null after a failed load — one broken loader shouldn't retry all game long. */
  private glbLoader: GLTFLoader | null = new GLTFLoader();
  /** Which props ended up wearing a generated .glb, and from which file. */
  readonly glbUpgrades = new Map<string, string>();

  constructor() {
    const scene = this.scene;
    scene.fog = this.fog = new THREE.Fog(PAL.amber, 40, 170);

    // ---------------- sky (ProceduralSkyMaterial counterpart) ----------------
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
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 groundColor;
        varying vec3 vDir;
        void main() {
          float h = vDir.y;
          vec3 col = h >= 0.0
            ? mix(horizonColor, topColor, pow(min(h, 1.0), 0.55))
            : mix(horizonColor, groundColor, pow(min(-h, 1.0), 0.5));
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 16), skyMat);
    sky.frustumCulled = false;
    scene.add(sky);

    // ---------------- lights (main.gd "--SETUP--") ----------------
    // three r155+ physical lights: intensities need the legacy π factor to
    // match the reference's Godot energies.
    this.hemi = new THREE.HemisphereLight(0xfff3dd, 0x8a7666, phys(1.0));
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(PAL.amber, phys(1.3));
    this.sun.position.set(-38, 23, 22);      // rotation (-28, -60) in the reference
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -60;
    this.sun.shadow.camera.right = 60;
    this.sun.shadow.camera.top = 60;
    this.sun.shadow.camera.bottom = -60;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.03; // large flat walls — kill shadow acne crawl
    scene.add(this.sun);
    scene.add(this.sun.target);

    // ---------------- ground & street (street runs along X) ----------------
    this.solid('Road', 0, -0.1, 0, 100, 0.2, 8, PAL.road, { receive: true, cast: false });
    this.solid('Sidewalk_N', 0, -0.05, 6, 100, 0.3, 4, PAL.walk, { receive: true, cast: false });
    this.solid('Sidewalk_S', 0, -0.05, -6, 100, 0.3, 4, PAL.walk, { receive: true, cast: false });
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
    this.solid('Bldg_N_West', -35.5, 7, 14, 29, 14, 12, PAL.bldg);
    this.solid('Bldg_N_East_A', -1, 9, 14, 20, 18, 12, PAL.bldg2);
    this.solid('Bldg_N_GoldWindow', 15, 5.5, 14, 12, 11, 12, PAL.brick);
    this.solid('Bldg_N_East_B', 35, 8, 14, 28, 16, 12, PAL.bldg);
    // Terminal door + sign (west building, faces the street). The sign gets a
    // real label — the block stopped being a maze of anonymous boxes.
    this.deco('Terminal_Door', -30, 1.4, 7.95, 3, 2.8, 0.15, PAL.teal);
    this.decoMesh(
      'Terminal_Sign',
      new THREE.BoxGeometry(5, 0.8, 0.15),
      this.signMaterials('BUS TERMINAL', 640, 96, PAL.stone, PAL.ink, 56),
      -30, 3.4, 7.95,
    );

    this.solid('Bldg_S_West', -25, 8, -14, 50, 16, 12, PAL.bldg2);
    this.solid('Bldg_S_FireEscape', 13, 7, -14, 26, 14, 12, PAL.brick);
    this.solid('Bldg_S_East', 38, 9, -14, 24, 18, 12, PAL.bldg);

    // Water towers — Doc 04 object canon ("the buildings wear wooden hats")
    this.waterTower(-30, 14, 12.5, 1.5);
    this.waterTower(-14, 16, -12.5, 1.7);
    this.waterTower(31, 16, 12.5, 1.4);

    // ---------------- bodega (Doc 10 §B, main.gd `_build_bodega`) ----------------
    const h = 4.5;
    this.solid('Bodega_Floor', -16, 0.06, 14, 10, 0.1, 12, PAL.interior, { receive: true, cast: false });
    this.solid('Bodega_Wall_W', -20.8, h / 2, 14, 0.4, h, 12, PAL.stone);
    this.solid('Bodega_Wall_E', -11.2, h / 2, 14, 0.4, h, 12, PAL.stone);
    this.solid('Bodega_Wall_Back', -16, h / 2, 19.8, 10, h, 0.4, PAL.stone);
    this.solid('Bodega_Front_L', -19.25, h / 2, 8.2, 3.5, h, 0.4, PAL.brick);
    this.solid('Bodega_Front_R', -12.75, h / 2, 8.2, 3.5, h, 0.4, PAL.brick);
    this.solid('Bodega_Front_Lintel', -16, 3.8, 8.2, 3, 1.4, 0.4, PAL.brick);
    // "ROSA'S / DELI & GROCERY" — the building has a name now, and it says it
    // three ways (playtest: nobody knew whose store it was, and the chase cam
    // crops a low facade sign when you stand at the door):
    //   1. this two-deck facade board over the awning,
    //   2. a blade sign projecting over the sidewalk (readable walking up,
    //      when the facade board is above the frame),
    //   3. a rooftop billboard (readable from anywhere on the block).
    this.decoMesh(
      'Bodega_Sign',
      new THREE.BoxGeometry(6.2, 1.35, 0.14),
      this.signMaterials("ROSA'S\nDELI & GROCERY", 832, 176, PAL.gold, PAL.ink, 62),
      -16, 4.0, 7.93,
    );
    // blade sign: perpendicular board over the door gap, text on the ±x faces
    this.decoMesh('Bodega_BladeBracket', new THREE.BoxGeometry(0.07, 0.5, 0.9), this.mat(PAL.ink), -14.9, 3.55, 7.55);
    this.decoMesh(
      'Bodega_BladeSign',
      new THREE.BoxGeometry(0.12, 0.95, 1.7),
      this.signMaterials("ROSA'S", 384, 192, PAL.gold, PAL.ink, 74, 'x'),
      -14.9, 2.95, 7.1,
    );
    // The warm window (emission 0.55 — main.gd comment: "the warm window, actually warm")
    this.rosaWindowMat = this.mat(PAL.amber, { emissive: PAL.amber, emissiveIntensity: 0.55 });
    this.decoMesh('Bodega_Window', new THREE.BoxGeometry(2.6, 1.6, 0.06), this.rosaWindowMat, -19.25, 1.8, 7.92);
    this.deco('Bodega_Awning', -16, 3.2, 7.6, 10, 0.15, 1.2, PAL.teal);
    this.roof = this.solid('Bodega_Roof', -16, h + 0.15, 14, 10, 0.3, 12, PAL.bldg);
    // Rooftop billboard — the store's name over the block, readable from the
    // chase cam anywhere on the street. Childed to the roof so it ducks out
    // of the way exactly when the roof does (player steps inside).
    const bb = new THREE.Group();
    bb.name = 'Bodega_RoofSign';
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(7.4, 1.4, 0.16),
      this.signMaterials("ROSA'S\nDELI & GROCERY", 896, 176, PAL.gold, PAL.ink, 62),
    );
    signBoard.position.y = 1.75;
    signBoard.castShadow = true;
    bb.add(signBoard);
    for (const px of [-3.1, 3.1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 6), this.mat(PAL.ink));
      pole.position.set(px, 0.55, 0);
      pole.castShadow = true;
      bb.add(pole);
    }
    bb.position.set(0, 0.15, -4.6); // roof-local: near the front edge, over the sidewalk
    this.roof.add(bb);
    this.solid('Bodega_Counter', -19.6, 0.55, 13.5, 1.2, 1.1, 6, PAL.teal);
    this.solid('Bodega_BackShelf', -16, 1.0, 19.3, 6, 2.0, 0.6, PAL.bldg2);

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
    this.taxiBase = this.buildCar('taxi');
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

    // The teal door (Day 2's delivery target — the objective says "the teal
    // door across the street"; now there is one, under the gold window).
    this.decoMesh('Stoop_Door', new THREE.BoxGeometry(1.4, 2.6, 0.12), this.mat(PAL.teal), 15, 1.3, 7.92);
    this.decoMesh('Stoop_Knob', new THREE.SphereGeometry(0.05, 8, 8), this.mat(PAL.gold), 15.45, 1.3, 7.84);
    // The stoop itself — "stoup = outdoor living room" deserves actual steps.
    // Two low risers (tops 0.19 / 0.28, both inside the 0.35 STEP_UP curb
    // tolerance, so the walker rolls up them without a hop).
    this.solid('Stoop_Step', 15, 0.095, 6.9, 1.7, 0.19, 0.55, PAL.stone);
    this.solid('Stoop_Landing', 15, 0.14, 7.55, 1.7, 0.28, 0.75, PAL.stone);

    // ---------------- fire escape (main.gd `_build_fire_escape`) ------------
    // Playtest 2026-10-29: "the stairs also looks weird" — the escape used to
    // be two floating planks and solid slab rails. Now: real ladders (stiles
    // + rungs + wall brackets), open guardrails (posts + bars), and diagonal
    // braces holding the landings. Colliders and trigger volumes untouched —
    // this is a pure visual rebuild of the same numbers.
    // Landings stay x 10..16 (the oracle's numbers): ladder 2's column (x 16.4)
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
    const dim = PAL.windowDim;
    const dimMat = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const p = [10.5 + col * 3, 3 + row * 3, 7.94] as const;
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
    this.goldGlow = this.makeGlow(3.2);
    this.goldGlow.position.set(13.5, 9, 7.6);
    this.scene.add(this.goldGlow);
    this.secondGlow = this.makeGlow(2.6);
    this.secondGlow.position.set(10.5, 9, 7.6);
    this.scene.add(this.secondGlow);
    this.thirdGlow = this.makeGlow(2.6);
    this.thirdGlow.position.set(16.5, 9, 7.6);
    this.scene.add(this.thirdGlow);
    this.fourthGlow = this.makeGlow(2.2);
    this.fourthGlow.position.set(19.5, 9, 7.6);
    this.scene.add(this.fourthGlow);

    // ---------------- skyline card (far north-east, above the low building) -
    const heights = [38, 62, 45, 80, 52, 70, 40, 58];
    for (let i = 0; i < heights.length; i++) {
      this.deco(`Tower_${i}`, -10 + i * 7, heights[i] / 2, 90, 6, heights[i], 6, PAL.skyline, { fog: false });
    }
    this.deco('Spire', 11, 92, 90, 0.6, 24, 0.6, PAL.skyline, { fog: false });

    // ---------------- invisible bounds (nobody leaves the block) ------------
    this.colliders.push(boxFromCenter(-48, 5, 0, 1, 20, 40));
    this.colliders.push(boxFromCenter(48, 5, 0, 1, 20, 40));
    this.colliders.push(boxFromCenter(0, 6, -22, 100, 24, 1)); // south wall behind S buildings
    this.colliders.push(boxFromCenter(0, 6, 22.5, 100, 24, 1)); // north wall behind N buildings

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
    this.rosaCollider = boxFromCenter(-27, 0.85, 6.8, 0.56, 1.7, 0.56);
    this.idrisCollider = boxFromCenter(-2, 0.85, -4.6, 0.56, 1.7, 0.56);
    this.kidCollider = boxFromCenter(15, 0.7, 6.35, 0.5, 1.4, 0.5);
    this.customerCollider = boxFromCenter(0, -999.5, 0, 0.56, 1.7, 0.56);
    this.colliders.push(this.rosaCollider, this.idrisCollider, this.kidCollider, this.customerCollider);

    // ---------------- cast (Rosa, Idris, the kid) ---------------------------
    this.rosa = this.spawnActor('Rosa', -27, 0.05, 6.8, { jacket: 0xff6b6b, pants: PAL.ink, skin: 0xe8b08e, hair: 0x9a938c, style: 'bun' });
    this.idris = this.spawnActor('Idris', -2, 0.05, -4.6, { jacket: PAL.plum, pants: PAL.ink, skin: 0x8a5a3b, hair: 0x241f1c, style: 'cap' });
    this.idris.visible = false;
    // The kid, at the glass — a small shape against the light. The web port
    // had him at the oracle's z (7.86), but the articulated kid is shallower
    // than the oracle capsule: his front face sat BEHIND the emissive window
    // box (front at 7.90), so the lit window rendered over him and he was
    // invisible from the street (playtest: "I didnt see any kid in day 2").
    // z=7.78 puts his silhouette in front of the glass, against the light.
    this.kidSil = this.spawnActor('TheKid', 13.5, 8.6, 7.78, { jacket: 0x514659, pants: 0x473e50, skin: 0x514659, hair: 0x453b4c, style: 'flat' });
    this.kidSil.scale.setScalar(0.5);
    this.kidSil.visible = false;

    // ---------------- the living street (docs/28 — workstreams A & B) ------
    // Shared materials + geometry through the bank; seeded tree placement so
    // every run of the block is the same block.
    this.bank = new MatBank((c) => this.mat(c));
    const rng = seededRng(20261029);

    // ---- brownstone row (south-west face): stoops, doors, windows, AC ----
    const stoopDoors = [PAL.teal, 0xff6b6b, 0x6d4c7d];
    const stoopX = [-40, -34, -28];
    for (let i = 0; i < stoopX.length; i++) {
      const stoop = makeBrownstoneStoop(this.bank, stoopDoors[i]);
      stoop.position.set(stoopX[i], 0, -7.4);
      this.scene.add(stoop);
    }
    // tall parlor windows between the stoops + a couple of AC units
    for (const wx of [-43, -37, -31, -25, -19, -13, -7, -1]) {
      for (const wy of [3.6, 6.6, 9.6]) {
        this.decoMesh(`BrownstoneWin_${wx}_${wy}`, new THREE.BoxGeometry(1.1, 1.9, 0.08), this.mat(0x3b3346), wx, wy, -7.94);
      }
    }
    for (const [ax, ay] of [[-37, 3.0], [-25, 3.0], [-13, 6.0]] as const) {
      const ac = makeACUnit(this.bank);
      ac.position.set(ax, ay, -7.75);
      this.scene.add(ac);
    }

    // ---- storefronts (north face): named shops with awnings ----
    // Sunrise Laundry is not a flat prop anymore — Day 4 opens the block
    // (docs/30): a real recessed bay, Sal behind the counter, two washers
    // (one spins when a wash is running), shirts on the sidewalk rack.
    this.buildLaundromat();
    const pizza = makeStorefront(this.bank, this.signMaterials.bind(this), 'CORNER SLICE PIZZA', PAL.coral, 6);
    pizza.position.set(27, 0.05, 8.02);
    this.scene.add(pizza);
    // AC units under the gold-window building's upper windows
    for (const ax of [10.5, 16.5]) {
      const ac = makeACUnit(this.bank);
      ac.position.set(ax, 5.9, 7.75);
      this.scene.add(ac);
    }

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
    subway.position.set(-42, 0.05, 6.2);
    this.scene.add(subway);
    this.colliders.push(boxFromCenter(-42, 0.4, 6.2, 2.6, 1.0, 3.5)); // nobody walks into the earth
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
    const papers = makeNewspaperBoxes(this.bank);
    papers.position.set(-44.6, 0.05, 6.6);
    this.scene.add(papers);
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

    // ---- street furniture: lights, cans, hydrant, one honest barrier ----
    // The lamp faces are lit: the sun never leaves golden hour here, and
    // city lamps switch on before sundown — four dead heads read as props,
    // not as a block people walk home under. One shared emissive material.
    const lampFace = this.mat(PAL.taxi, { emissive: PAL.taxi, emissiveIntensity: 0.35 });
    // x-spots clear of the tree canopies: a pole sharing its block-face with
    // a tree spears the crown, and the gold lamp head pokes out the far side
    // as a floating yellow chip (Doc 31 read exactly that in two frames).
    // Worst canopy reach is 1.85 m from the trunk; every lamp now clears a
    // tree by >= 3 m. Lamp 1 moved -34 -> -31 (tree 0 sat at the same x),
    // lamp 3 -18 -> -19.5 and lamp 4 30 -> 31.5 (a metre of margin is not
    // margin when a seeded canopy blob can grow another half-metre).
    const lights: Array<[number, number, number]> = [
      [-31, 7.42, Math.PI / 2], [8, 7.42, Math.PI / 2],
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
      [-45, 4.7], [-38.6, 4.5],                                            // plaza park trees
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
      const t = makeTree(this.bank, rng, autumnTrees.has(i));
      t.group.position.set(tx, 0.05, tz);
      t.group.rotation.y = rng() * Math.PI * 2;
      this.scene.add(t.group);
      this.trees.push({ group: t.group, canopy: t.canopy, phase: rng() * Math.PI * 2, mats: t.mats, fade: 1 });
      treeTops.push(t.top);
      // the trunk is wood — a thin box that matches it (canopy stays air;
      // only the trunk blocks). North STREET trees extend back to the
      // building face: the strip between a free-standing trunk and the wall
      // is 0.67 m — narrower than the walker — and a body sidestepped into
      // it could never leave (the E2E proved it). Merging trunk and wall
      // removes the pocket without moving any usable space: nobody fit
      // there before. Plaza trees and the south row keep plain boxes (their
      // backs are open or passable).
      const trunkHalf = 0.18;
      const zMax = tz > 6 ? 8.0 : tz + trunkHalf;
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
    const van = makeVan(this.bank);
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
      greenLamp: this.mat(PAL.teal, { emissive: PAL.teal, emissiveIntensity: 0.55 }),
    });
    signal.position.set(-1.8, 0.05, -7.55);
    this.scene.add(signal);
    this.colliders.push(boxFromCenter(-1.8, 2.75, -7.55, 0.3, 5.5, 0.3));

    // ---- planters (two, where someone actually carries water) -------------
    const planterEast = makePlanter(this.bank, rng);
    planterEast.position.set(37, 0.05, 7.6);
    this.scene.add(planterEast);
    const planterPlaza = makePlanter(this.bank, rng);
    planterPlaza.position.set(-46.6, 0.05, 4.4);
    planterPlaza.rotation.y = Math.PI / 2;
    this.scene.add(planterPlaza);
    // cedar is solid; the plaza one is yawed π/2 so its long axis runs z
    this.colliders.push(boxFromCenter(37, 0.25, 7.6, 1.1, 0.55, 0.55));
    this.colliders.push(boxFromCenter(-46.6, 0.25, 4.4, 0.55, 0.55, 1.1));
    // the bulletin board is furniture too (its flyer face is the Day-3 beat)
    this.colliders.push(boxFromCenter(-37.6, 0.975, 7.5, 1.75, 1.95, 0.3));

    // ---- one cast-iron fire-escape silhouette on the brownstone row ------
    // Decorative only — no colliders, no triggers. The climbable escape on
    // the fire-escape building stays the lead agent's greybox geometry.
    const escape = makeFireEscapeDeco(this.bank, 4.4, 8.2);
    escape.position.set(-21.5, 0, -7.98);
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
    this.leaves = new LeafDrift(this.scene, leafSpots, 4);

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
      jacket: 0x514659, pants: 0x473e50, skin: 0xd9a06b, hair: 0x453b4c, style: 'flat',
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
      jacket: PAL.teal, pants: PAL.ink, skin: 0x8a5a3b, hair: 0x9a938c, style: 'flat',
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

    this.bakeStatics();

    // ---- ambient pedestrians (Yuka steering) ----------------------------
    // Built AFTER the static bake so their rigs are never merge candidates;
    // bank-shared materials keep them material-free to add. Three walkers on
    // three loops: a crosswalk commuter (full block), a north-side window
    // shopper, and a south-side local. Obstacle circles: the parked van and
    // sedan, the mailbox, cans, barrier, bus stop, benches, papers, poles —
    // the player and the cart register as DYNAMIC circles each frame.
    const pedLooks: PedLook[] = [
      { jacket: 0x4a5568, pants: 0x3b3f4a, skin: 0xc98e5a, hair: 0x2b2730, style: 'cap' },
      { jacket: 0x7d5a62, pants: 0x47404b, skin: 0xe8b08e, hair: 0x6e3b2a, style: 'bun' },
      { jacket: 0x5d6b4a, pants: 0x39423a, skin: 0x8a5a3b, hair: 0x1f1b23, style: 'flat' },
    ];
    const pedPaths: Array<Array<[number, number]>> = [
      // the commuter: full block, crossing only at the crosswalk (x ≈ -6.5,
      // inside the cab's yield zone), two lanes per direction
      [[-6.5, 6.15], [38, 6.15], [38, 6.85], [-6.5, 6.85],
       [-6.5, -6.15], [26, -6.15], [26, -6.85], [-6.5, -6.85]],
      // the window shopper: north sidewalk out-and-back, past the bodega
      [[10, 6.1], [-28, 6.1], [-28, 6.75], [10, 6.75]],
      // the south-side local: laundry to the west end and back
      [[-34, -6.1], [18, -6.1], [18, -6.8], [-34, -6.8]],
    ];
    this.peds = new Pedestrians(
      this.scene, pedLooks, (c) => this.bank.get(c), 20261030, pedPaths,
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
        { x: 37, z: 7.6, r: 0.6 },     // planter east (missing)
        { x: -46.6, z: 4.4, r: 0.6 },  // planter plaza (missing)
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
        { x: -45, z: 4.7, r: 0.35 },
        { x: -38.6, z: 4.5, r: 0.35 },
      ],
    );
    // the walkers carry real bodies for the player's collision stack — the
    // audit's "NPCs walking through the player" (doc 35 §1): one synced AABB
    // each, registered once, moved by Pedestrians.update every frame
    for (const box of this.peds.walkColliders) this.colliders.push(box);
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
  private bakeStatics(): void {
    const skip = new Set<THREE.Object3D>([
      this.cartRoot, this.cartAwning, this.roof,
      this.rosa, this.idris, this.kidGround, this.kidSil, this.stranger, this.sal,
      this.familiar, this.barrier, this.asphaltPatch,
      this.stool, this.permitReceipt,
      this.pigeonFlock.group, this.pigeonFlockEast.group, this.squirrel.group,
      this.leaves.mesh,
      ...this.glbProps.values(),
      ...this.itemMeshes.values(),
      ...this.trees.map((t) => t.group),
    ]);
    // the windows whose MATERIALS are tweened (dusk, golden-hour beats) —
    // they share a signature with the plain dim windows and must not join
    // their batch, or one lit window would light the whole row. The three
    // ambient windows keep a day-keyed diary instead (dressing.ts) — same
    // exclusion, different author.
    const NAMED_SKIP = new Set(['GoldWindow', 'SecondWindow', 'ThirdWindow', 'FourthWindow', 'Bodega_Window',
      'AmbientWindow_Late', 'AmbientWindow_New', 'AmbientWindow_Riser']);
    const excluded = (o: THREE.Object3D): boolean => {
      for (let p: THREE.Object3D | null = o; p !== null; p = p.parent) {
        if (skip.has(p) || NAMED_SKIP.has(p.name)) return true;
      }
      return false;
    };

    interface BatchSrc { geo: THREE.BufferGeometry; mesh: THREE.Mesh; tile: number }
    interface Batch { srcs: BatchSrc[]; cast: boolean; receive: boolean; mat: THREE.MeshLambertMaterial }
    const batches = new Map<string, Batch>();

    this.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || excluded(o)) return;
      const mat = o.material;
      if (!(mat instanceof THREE.MeshLambertMaterial) || mat.map || mat.transparent) return;
      const geo = o.geometry;
      if (!geo.index || !geo.attributes.position || !geo.attributes.normal) return;
      const key = `${mat.color.getHexString()}|${mat.emissive.getHexString()}`
        + `|${mat.emissiveIntensity}|${mat.fog ? 1 : 0}`
        + `|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
      let b = batches.get(key);
      if (!b) batches.set(key, b = { srcs: [], cast: o.castShadow, receive: o.receiveShadow, mat });
      o.updateWorldMatrix(true, false);
      const g = geo.clone();
      g.applyMatrix4(o.matrixWorld);
      // keep every batch attribute-identical for mergeGeometries
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
      }
      // Region-split: a whole-block batch would defeat frustum culling (the
      // batch's bounding sphere spans the block, so nothing ever culls) —
      // on software GL that cost more in rasterized triangles than the draw
      // calls saved (playtest 2026-10-30: the e2e driver lost a third of its
      // fps and its timed beats started missing). Batching per 25 m tile
      // along the street keeps the draw-call win AND lets off-screen tiles
      // cull exactly like the individual meshes did.
      const tile = Math.max(0, Math.min(3, Math.floor((o.matrixWorld.elements[12] + 50) / 25)));
      b.srcs.push({ geo: g, mesh: o, tile });
    });

    // commits happen per (signature, tile); a tile group of 1 stays as-is —
    // merging it would save nothing
    const bySigTile = new Map<string, { batch: Batch; srcs: BatchSrc[] }>();
    for (const [key, b] of batches) {
      const byTile = new Map<number, BatchSrc[]>();
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
      mesh.name = `StaticBake_${batchIndex++}`;
      mesh.castShadow = g.batch.cast;
      mesh.receiveShadow = g.batch.receive;
      this.scene.add(mesh);
    }
  }

  // ------------------------------------------------------------------ helpers

  /** The three bodega shelf items (mango / coffee / bread) — non-colliding deco. */
  readonly itemMeshes = new Map<string, THREE.Group>();

  addItem(id: string, x: number, y: number, z: number, _color: number): THREE.Group {
    void _color; // shape + label now carry the identity; palette stays on the item itself
    const g = new THREE.Group();
    g.name = `Item_${id}`;
    g.position.set(x, y - 0.25, z); // anchor sits on the shelf top (y=2.0)
    const add = (m: THREE.Mesh) => { m.castShadow = true; g.add(m); };
    if (id === 'mango') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), this.mat(0xf7a83b, { emissive: 0xf7a83b, emissiveIntensity: 0.18 }));
      body.scale.y = 0.88;
      body.position.y = 0.24;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.08, 6), this.mat(0x4a3a30));
      stem.position.y = 0.5;
      add(body); add(stem);
    } else if (id === 'coffee') {
      const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 12), this.mat(PAL.teal, { emissive: PAL.teal, emissiveIntensity: 0.18 }));
      tin.position.y = 0.21;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.15, 12), this.mat(PAL.cream));
      band.position.y = 0.21;
      add(tin); add(band);
    } else {
      // bread
      const loaf = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.26), this.mat(0xd9a05b, { emissive: 0xd9a05b, emissiveIntensity: 0.14 }));
      loaf.position.y = 0.1;
      const crust = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.07, 0.28), this.mat(0xb3773f));
      crust.position.y = 0.21;
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

  private mat(color: number, opts: { emissive?: number; emissiveIntensity?: number } = {}): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ color });
    if (opts.emissive !== undefined) {
      m.emissive = new THREE.Color(opts.emissive);
      m.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
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

  async upgradePropWithGLB(id: string, file = `models/${id}.glb`): Promise<boolean> {
    const placeholder = this.glbProps.get(id);
    const loader = this.glbLoader;
    if (!placeholder || !loader) return false;
    const url = new URL(file, document.baseURI).href;
    try {
      const gltf = await loader.loadAsync(url);
      const gltfScene = gltf.scene;
      let hasMesh = false;
      const stray: THREE.Object3D[] = [];
      gltfScene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) hasMesh = true;
        if ((o as THREE.Light).isLight || (o as THREE.Camera).isCamera) stray.push(o);
      });
      if (!hasMesh) throw new Error('no meshes in file');
      for (const o of stray) o.parent?.remove(o);

      placeholder.updateWorldMatrix(true, false);
      const phBox = new THREE.Box3().setFromObject(placeholder);
      const phSize = phBox.getSize(new THREE.Vector3());
      const box = new THREE.Box3().setFromObject(gltfScene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      if (!(size.y > 0) || !Number.isFinite(size.y)) throw new Error('degenerate bounds');

      const worldPos = placeholder.getWorldPosition(new THREE.Vector3());
      const worldQuat = placeholder.getWorldQuaternion(new THREE.Quaternion());
      const worldScale = placeholder.getWorldScale(new THREE.Vector3());
      if (Math.abs(worldScale.x - worldScale.y) > 1e-3 || Math.abs(worldScale.y - worldScale.z) > 1e-3) {
        throw new Error('placeholder is non-uniformly scaled');
      }

      // Uniform scale so the generated mesh stands exactly as tall as the
      // placeholder it replaces, feet on the same ground, XZ centered on it.
      const s = phSize.y / size.y;
      // Footprint guard: a car scaled to the placeholder's height must also
      // occupy a similar street width, or its collider (sized for the
      // placeholder) stops matching what you see. 0.5×–1.9× is the sane band.
      const scaledX = size.x * s, scaledZ = size.z * s;
      if (scaledX < phSize.x * 0.5 || scaledX > phSize.x * 1.9
        || scaledZ < phSize.z * 0.5 || scaledZ > phSize.z * 1.9) {
        throw new Error(`footprint mismatch (${scaledX.toFixed(2)}×${scaledZ.toFixed(2)} vs ${phSize.x.toFixed(2)}×${phSize.z.toFixed(2)})`);
      }
      gltfScene.scale.setScalar(s);
      gltfScene.position.set(-center.x * s, -box.min.y * s, -center.z * s);

      const wrapper = new THREE.Group();
      wrapper.name = `${placeholder.name || id}_glb`;
      wrapper.position.copy(worldPos);
      wrapper.quaternion.copy(worldQuat);
      wrapper.scale.copy(worldScale);
      wrapper.add(gltfScene);
      gltfScene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });

      const parent = placeholder.parent;
      if (!parent) throw new Error('placeholder was removed from the scene');
      parent.add(wrapper);
      parent.remove(placeholder);
      this.disposeTree(placeholder);
      this.glbProps.set(id, wrapper); // re-register so the upgrade is re-runnable
      this.glbUpgrades.set(id, file);
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
    g.position.set(x, 0, z);
    this.registerGlbProp('mailbox', g);
    return g;
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
    g.position.set(x, 0, z);
    this.registerGlbProp('trashcan', g);
    return g;
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
    // two front-loaders, portholes to the street; the near drum spins on wash day
    for (const [i, wx] of [[0, CX - 0.9], [1, CX + 0.3]] as const) {
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
    // a folded stack rides the far washer — the laundromat is working, even now
    const stack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4), this.mat(PAL.cream));
    stack.position.set(CX + 0.3, 1.8, 7.75);
    stack.castShadow = true;
    this.scene.add(stack);
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
    this.decoMesh(
      'Laundry_Sign',
      new THREE.BoxGeometry(5.4, 0.8, 0.12),
      this.signMaterials(D4_LAUNDRY_SIGN, 768, 128, PAL.teal, PAL.cream, 56),
      CX, 3.42, 7.7,
    );
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
   * (DOM-free, unit-tested); World only supplies its material factory.
   */
  buildPerson(o: Parameters<typeof buildArticulatedPerson>[0]): THREE.Group {
    return buildArticulatedPerson(o, (color) => this.mat(color)).group;
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
  buildCar(kind: 'taxi' | 'sedan'): THREE.Group {
    const bodyCol = kind === 'taxi' ? PAL.taxi : PAL.teal;
    const g = new THREE.Group();
    const mk = (geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, this.mat(color));
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
    };
    mk(new THREE.BoxGeometry(4.15, 0.52, 1.86), bodyCol, 0, 0.56, 0);
    mk(new THREE.BoxGeometry(2.05, 0.52, 1.7), PAL.windowDim, -0.1, 1.08, 0);
    mk(new THREE.BoxGeometry(2.25, 0.09, 1.76), bodyCol, -0.1, 1.38, 0);
    for (const sx of [-1.32, 1.32]) {
      for (const sz of [-0.85, 0.85]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 14), this.mat(PAL.manhole));
        w.rotation.x = Math.PI / 2;
        w.position.set(sx, 0.33, sz);
        w.castShadow = true;
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 10), this.mat(PAL.stone));
        hub.rotation.x = Math.PI / 2;
        hub.position.set(sx, 0.33, sz);
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

  /** Wall-mounted sign: text on the two big faces, plain edges elsewhere
   *  (a bare box map mirrors the text across the top face).
   *  faces: 'z' = the ±z faces carry the text (wall sign), 'x' = the ±x faces
   *  (blade sign read while walking along the street). */
  private signMaterials(text: string, w: number, h: number, bg: number, fg: number, px: number, faces: 'z' | 'x' = 'z'): THREE.MeshLambertMaterial[] {
    const face = new THREE.MeshLambertMaterial({ map: this.textTexture(text, w, h, bg, fg, px) });
    const plain = new THREE.MeshLambertMaterial({ color: bg });
    return faces === 'z'
      ? [plain, plain, plain, plain, face, face] // +x, -x, +y, -y, +z, -z
      : [face, face, plain, plain, plain, plain];
  }

  /** Wall-mounted sign texture (block signs stopped being anonymous boxes).
   *  '\n' splits lines: line 1 renders at full size, following lines smaller
   *  beneath it — "ROSA'S / DELI & GROCERY", the classic two-deck bodega sign. */
  private textTexture(text: string, w: number, h: number, bg: number, fg: number, px: number): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
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
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
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
    // the barrier's last day is Day 3; the asphalt remembers
    const diary = barrierDiary(day);
    this.barrier.visible = diary.barrierVisible;
    this.asphaltPatch.visible = diary.patchVisible;
    // the board's slip rotates with the week
    this.flyerDay = day;
    const old = this.flyerMat.map;
    this.flyerMat.map = this.flyerTexture(this.currentFlyerName, day);
    this.flyerMat.needsUpdate = true;
    old?.dispose();
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
  updateDynamics(dt: number, player?: { x: number; y: number; z: number }, extra?: Array<{ x: number; z: number }>): void {
    // the persistent cast owns a body each — no more ghosting through Rosa,
    // Idris, or the kid (playtest 2026-10-30: "passed through the npc and rosa")
    this.syncPersonCollider(this.rosaCollider, this.rosa);
    this.syncPersonCollider(this.idrisCollider, this.idris);
    this.syncPersonCollider(this.kidCollider, this.kidGround, 0.25, 1.4);
    this.syncPersonCollider(this.stoolCollider, this.stool, 0.275, 0.6);
    // the barrier leaves on Day 4 — its body leaves with it (a box at y
    // -999 can't overlap anything: the cheapest "gone")
    this.syncPersonCollider(this.barrierCollider, this.barrier, 0.85, 0.9);
    this.updateTaxi(dt, player, extra);
  }

  /** Phase 2 of the frame (after the player's move): everything that only
   *  reads the world — pedestrian steering, birds, steam, leaves. */
  updateAmbient(dt: number, player?: { x: number; y: number; z: number }, dusk = false): void {
    // the walkers steer around you and the cart, mind the furniture, and
    // hold their ground against the cab's footprint
    this.peds.update(
      dt,
      player ? { x: player.x, z: player.z } : undefined,
      { x: this.cartRoot.position.x, z: this.cartRoot.position.z },
      { x: this.taxi.position.x, z: this.taxi.position.z },
      { x: this.rosa.position.x, z: this.rosa.position.z },
    );

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

    // trees breathe (a hair of canopy sway), the flock lives its small life
    this.ambientTime += dt;
    for (const t of this.trees) {
      t.canopy.rotation.z = Math.sin(this.ambientTime * 0.9 + t.phase) * 0.022;
      t.canopy.rotation.x = Math.cos(this.ambientTime * 0.7 + t.phase) * 0.016;
    }
    // fade-on-occlude — the camera reports which canopies stand between it
    // and the player (GameCamera.updateOcclusion); a canopy that swallows
    // the player dissolves toward gauze instead of hiding them. Fast fade
    // in (~8/s), so the lens never lingers behind full leaves.
    if (this.canopyOcclusion && this.canopyOcclusion.length === this.trees.length) {
      for (let i = 0; i < this.trees.length; i++) {
        const t = this.trees[i];
        const target = 1 - 0.78 * this.canopyOcclusion[i]; // floor 0.22 gauze
        t.fade += (target - t.fade) * Math.min(1, dt * 8);
        for (const m of t.mats) m.opacity = t.fade;
      }
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
  }

  /** Both phases, in order — kept for any caller that just wants "advance
   *  the world" (tests, probes). Game.frame calls the phases separately. */
  update(dt: number, player?: { x: number; y: number; z: number }, dusk = false, extra?: Array<{ x: number; z: number }>) {
    this.updateDynamics(dt, player, extra);
    this.updateAmbient(dt, player, dusk);
  }

  // ---- the cab: NYC rules on rails (doc 35 §1 "Vehicles") ---------------
  // Preserved from the playtest fixes: crosswalk-only courtesy hold, yield
  // to anyone in the path, wrap at ±46. Rebuilt on the traffic brain:
  //   - progressive braking (the old 9→0 hard cut snapped on screen),
  //   - lateral truth (a body 3 m clear on the curb no longer freezes the
  //     cab from 10 m away — the old |z|<4.2 gate),
  //   - bodies fully behind the tail never block (the old gap > -2.3 test
  //     stopped the cab for things it had already passed),
  //   - vehicle-vs-vehicle: the parked sedan and van are declared bodies,
  //     so a car ahead in the lane is braked for, not driven through,
  //   - a committed-move guard: the rail step is clamped by noseLimit()
  //     BEFORE it lands, so no frame can end with the cab inside anyone.
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

  /** Preallocated yield bodies — the scan runs every frame; nothing in it
   *  may allocate (perf rule: no per-frame garbage). */
  private readonly trafficPool: TrafficBody[] = Array.from({ length: 16 }, () => ({ x: 0, z: 0, r: 0 }));
  private readonly parkedSedanRect: AABB = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  private readonly parkedVanRect: AABB = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
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
    // vehicles: rects, so car-vs-car is footprint-to-footprint. The parked
    // pair sits off-lane (north curb) — declared anyway, so the day another
    // car shares the lane the braking is already real. (The cab never
    // yields to itself, and never to the invisible bounds — the wrap at
    // ±46 is authored.)
    const sedan = this.parkedSedanRect;
    sedan.minX = 24 - 2.2; sedan.maxX = 24 + 2.2;
    sedan.minZ = 3.05 - 0.975; sedan.maxZ = 3.05 + 0.975;
    const van = this.parkedVanRect;
    van.minX = -14 - 2.2; van.maxX = -14 + 2.2;
    van.minZ = 3.05 - 0.975; van.maxZ = 3.05 + 0.975;
    pool[n].x = 24; pool[n].z = 3.05; pool[n].r = 0; pool[n].rect = sedan; n++;
    pool[n].x = -14; pool[n].z = 3.05; pool[n].r = 0; pool[n].rect = van; n++;

    const cabRect = this.cabRectScratch;
    cabRect.minX = road.x - CAB.halfLen; cabRect.maxX = road.x + CAB.halfLen;
    cabRect.minZ = CAB.laneZ - CAB.halfWid; cabRect.maxZ = CAB.laneZ + CAB.halfWid;

    // ---- courtesy rule 1: the crosswalk (trigger unchanged, curve new) ----
    // Occupied = a body (never a parked car) stands inside the crosswalk
    // paint; the cab brakes toward the same authored hold point, but on the
    // curve now — a creep to the line instead of a 3 m/s lurch.
    let speed: number = CAB.cruise;
    let crosswalkOccupied = !!(player && player.x > -8.5 && player.x < -1.5 && player.z > -4.6 && player.z < 4.6);
    if (!crosswalkOccupied && extra) {
      crosswalkOccupied = extra.some((b) => b.x > -8.5 && b.x < -1.5 && b.z > -4.6 && b.z < 4.6);
    }
    for (let i = 0; i < n && !crosswalkOccupied; i++) {
      const b = pool[i];
      if (b.rect) continue;
      if (b.x > -8.5 && b.x < -1.5 && b.z > -4.6 && b.z < 4.6) crosswalkOccupied = true;
    }
    if (crosswalkOccupied && road.x < -4.2) {
      const gapToLine = CAB.holdCenterX - road.x; // center-based, as authored
      speed = Math.min(speed, approachSpeed(CAB.cruise, gapToLine, CAB.stopGap, CAB.gain));
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
        if (b.x + b.r <= road.x - CAB.halfLen) continue;   // fully behind
        if (!bodyConflictsWithCab(b, sweepRect)) continue; // not in the path
        const clearance = Math.max((b.x - b.r) - noseX, 0);
        speed = Math.min(speed, approachSpeed(CAB.cruise, clearance, CAB.stopGap, CAB.gain));
      }
    }

    // ---- committed-move guard: resolve BEFORE moving, never after ---------
    const limit = noseLimit(noseX, pool, n, CAB.laneZ, CAB.halfWid);
    const wantedNose = noseX + dt * speed;
    road.x += Math.min(wantedNose, limit) - noseX;
    if (road.x > 46) road.x = -46;
    this.taxiCollider.minX = road.x - CAB.halfLen;
    this.taxiCollider.maxX = road.x + CAB.halfLen;

    // post-move truth: a body the cab slid beside (never through) gets the
    // air it is owed — the pedestrian yields to the vehicle, pushed out
    // along the shortest exit, capped so nobody slingshots
    cabRect.minX = road.x - CAB.halfLen; cabRect.maxX = road.x + CAB.halfLen;
    this.peds.resolveAgainstCab(cabRect);
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

/** Godot-style light energy → three r155+ physical intensity. */
export function phys(energy: number): number {
  return energy * Math.PI;
}
