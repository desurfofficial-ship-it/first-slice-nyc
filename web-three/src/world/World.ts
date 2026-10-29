/**
 * The Day 1 block — built procedurally from the greybox oracle's exact
 * dimensions (greybox-godot/scripts/main.gd `_build_world`), which implement
 * Doc 10 (Day 1 greybox layout). Palette per Doc 04. Additions beyond the
 * greybox are limited to Doc 04's object canon (water towers, cart string
 * lights) — no new gameplay-bearing geometry.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PAL } from '../core/palette';
import { ITEM_LABELS } from '../core/content';
import { boxFromCenter, type AABB } from '../engine/collide';
import { buildArticulatedPerson } from './personRig';
import { MatBank, makeTree, makeTreePit, makeStreetlight, makeTrashCan, makeRecycleBin, makeHydrant,
  makeSubwayEntrance, makeBulletinBoard, makeBench, makeBusStop, makeNewspaperBoxes, makeBarrier,
  makeACUnit, makeBrownstoneStoop, makeStorefront, makeStool, makeVan } from './props';
import { PigeonFlock, Squirrel, seededRng } from './ambient';

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
  private taxiBase: THREE.Group;
  /** The cab's collider — boxFromCenter once, then moved every frame. */
  readonly taxiCollider: AABB;
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
  private readonly bank: MatBank;
  private readonly trees: Array<{ canopy: THREE.Group; phase: number }> = [];
  private readonly pigeonFlock: PigeonFlock;
  private readonly squirrel: Squirrel;
  private ambientTime = 0;

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
    this.deco('Manhole', -10, 0.025, 0.5, 1.2, 0.02, 1.2, PAL.manhole);
    const hydrant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.9, 10),
      this.mat(PAL.coral),
    );
    hydrant.position.set(-0.6, 0.45, -4.6);
    hydrant.castShadow = true;
    this.scene.add(hydrant);

    // Street life — the object canon's quiet furniture. Each is a procedural
    // placeholder that a generated .glb can replace at runtime: drop
    // <id>.glb into public/models/ and it wears the mesh on next boot
    // (tools3d/spaces_manifest.json generates exactly these ids). No
    // colliders, no triggers — decoration, not gameplay.
    this.scene.add(this.makeMailbox(-3.2, -5.7));
    this.scene.add(this.makeTrashcan(10.5, -5.6));
    this.scene.add(this.makeStreetlamp(13.5, -5.9));
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

    // A parked sedan on the south curb (street life; collides — it's a car).
    const sedan = this.buildCar('sedan');
    sedan.position.set(24, 0, -3.05);
    sedan.rotation.y = Math.PI;
    this.registerGlbProp('car_sedan', sedan); // same seam, parked car
    void this.upgradePropWithGLB('car_sedan');
    this.scene.add(sedan);
    this.colliders.push(boxFromCenter(24, 0.75, -3.05, 4.4, 1.5, 1.95));

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
    const laundry = makeStorefront(this.bank, this.signMaterials.bind(this), 'SUNRISE LAUNDRY', PAL.teal, 6);
    laundry.position.set(-5, 0.05, 8.02);
    this.scene.add(laundry);
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
    this.deco('Plaza_Deck', -41.5, 0.015, 5.9, 7, 0.03, 3.6, PAL.stone);
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
    const papers = makeNewspaperBoxes(this.bank);
    papers.position.set(-44.6, 0.05, 6.6);
    this.scene.add(papers);

    // ---- bus stop (north, west of the bodega) + bench ----
    const bus = makeBusStop(this.bank, this.signMaterials.bind(this));
    bus.position.set(-24.5, 0.05, 7.35);
    this.scene.add(bus);
    const busBench = makeBench(this.bank);
    busBench.position.set(-24.5, 0.05, 6.85);
    busBench.rotation.y = Math.PI;
    this.scene.add(busBench);

    // ---- street furniture: lights, cans, hydrant, one honest barrier ----
    const lights: Array<[number, number, number]> = [
      [-34, 7.35, Math.PI / 2], [8, 7.35, Math.PI / 2],
      [-18, -7.35, -Math.PI / 2], [30, -7.35, -Math.PI / 2],
    ];
    for (const [lx, lz, lyaw] of lights) {
      const lamp = makeStreetlight(this.bank);
      lamp.position.set(lx, 0.05, lz);
      lamp.rotation.y = lyaw; // arm reaches over the street
      this.scene.add(lamp);
    }
    const can1 = makeTrashCan(this.bank); can1.position.set(-19, 0.05, 7.45); this.scene.add(can1);
    const can2 = makeTrashCan(this.bank); can2.position.set(2, 0.05, -7.45); this.scene.add(can2);
    const recy = makeRecycleBin(this.bank); recy.position.set(2.85, 0.05, -7.45); this.scene.add(recy);
    const hyd2 = makeHydrant(this.bank); hyd2.position.set(34, 0.05, -4.75); this.scene.add(hyd2);
    const barrier = makeBarrier(this.bank); barrier.position.set(-9.7, 0.05, 7.5); barrier.rotation.y = 0.35; this.scene.add(barrier);

    // ---- street trees in tree pits (seeded; never in front of a door) ----
    const treeSpots: Array<[number, number]> = [
      [-34, 7.15], [-22, 7.15], [-4, 7.15], [20, 7.15], [32, 7.15],       // north
      [-44, -7.0], [-30, -7.0], [-16, -7.0], [28, -7.0], [38, -7.0],      // south
      [-45, 4.7], [-38.6, 4.5],                                            // plaza park trees
    ];
    for (let i = 0; i < treeSpots.length; i++) {
      const [tx, tz] = treeSpots[i];
      const pit = makeTreePit(this.bank);
      pit.position.set(tx, 0.03, tz);
      this.scene.add(pit);
      const t = makeTree(this.bank, rng);
      t.group.position.set(tx, 0.05, tz);
      t.group.rotation.y = rng() * Math.PI * 2;
      this.scene.add(t.group);
      this.trees.push({ canopy: t.canopy, phase: rng() * Math.PI * 2 });
    }

    // ---- one more parked vehicle: a delivery van, north curb ----
    const van = makeVan(this.bank);
    van.position.set(-14, 0, 3.05);
    van.rotation.y = Math.PI;
    this.scene.add(van);
    this.colliders.push(boxFromCenter(-14, 0.75, 3.05, 4.4, 1.5, 1.95));

    // ---- pigeons + squirrel (seeded; behaviors in ambient.ts) ----
    this.pigeonFlock = new PigeonFlock(
      this.scene,
      { body: this.bank.get(PAL.skyline), head: this.bank.get(PAL.ink), beak: this.bank.get(PAL.amber) },
      90210, { x: -40, z: 5 }, 2.4, 9,
    );
    this.squirrel = new Squirrel(
      this.scene,
      { fur: this.bank.get(0x8a6a4a), tail: this.bank.get(0x7a5c48) },
      7, { x: -36.4, z: 4.8 },
    );

    // ---- the stool (Day 3 purchase) + the kid at ground level ----
    this.stool = makeStool(this.bank);
    this.stool.position.set(5.25, 0.05, -5.7);
    this.stool.visible = false;
    this.scene.add(this.stool);
    this.kidGround = this.buildPerson({
      jacket: 0x514659, pants: 0x473e50, skin: 0xd9a06b, hair: 0x453b4c, style: 'flat',
    });
    this.kidGround.name = 'TheKidDown';
    this.kidGround.scale.setScalar(0.78);
    this.kidGround.position.set(15, 0.05, 6.35);
    this.kidGround.rotation.y = Math.PI; // faces the street
    this.kidGround.visible = false;
    this.scene.add(this.kidGround);

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

  /** Redraw the flyer face (cart name goes up the moment it's known). */
  setFlyerText(name: string) {
    const old = this.flyerMat.map;
    this.flyerMat.map = this.flyerTexture(name || 'YOUR CORNER');
    this.flyerMat.needsUpdate = true;
    old?.dispose();
  }

  private flyerTexture(name: string): THREE.CanvasTexture {
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
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
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

  update(dt: number, player?: { x: number; y: number; z: number }, dusk = false, extra?: Array<{ x: number; z: number }>) {
    // taxi loops the street (main.gd `_process`: x += 9*dt, wraps at ±46).
    // NYC rules after playtest — the cab never drives through you:
    //   1. crosswalk occupied → hold at the stop line (nose at x ≈ -10.7)
    //      until it's clear, creeping up if it's still far;
    //   2. anyone in the road ahead → brake to a stop ~4.5 m short.
    // "Anyone" includes the kid on his walk (Day 3) — a cab through a
    // child reads exactly as broken as a cab through you.
    const road = this.taxi.position;
    let speed = 9.0;
    const bodies: Array<{ x: number; z: number }> = [];
    if (player) bodies.push(player);
    if (extra) bodies.push(...extra);
    for (const b of bodies) {
      const onCrosswalk = b.x > -8.5 && b.x < -1.5 && b.z > -4.6 && b.z < 4.6;
      if (onCrosswalk && road.x < -4.2) {
        // cab nose = road.x + 2.2; hold it west of the crosswalk's west edge
        speed = road.x > -10.7 ? 0 : Math.min(speed, 3.0);
      } else {
        const inRoad = Math.abs(b.z) < 4.2;
        const gap = b.x - road.x; // cab travels +x; gap > 0 = body ahead
        if (inRoad && gap > -2.3 && gap < 10) {
          speed = gap < 4.5 ? 0 : Math.min(speed, 2.0);
        }
      }
    }
    road.x += dt * speed;
    if (road.x > 46) road.x = -46;
    this.taxiCollider.minX = road.x - 2.2;
    this.taxiCollider.maxX = road.x + 2.2;

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
    const pp = player ? { x: player.x, z: player.z } : undefined;
    this.pigeonFlock.update(dt, pp, dusk);
    this.squirrel.update(dt, pp, dusk);
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
