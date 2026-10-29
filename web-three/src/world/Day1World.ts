import * as THREE from "three";

import { PAL } from "./materials";

/**
 * Day1World — the Doc 10 block, ported number-for-number from the oracle
 * (greybox-godot/scripts/main.gd `_build_world()` and friends). Same layout,
 * same footprints, same palette. z+ is north (the bodega side), exactly like
 * the Godot build, so oracle coordinates paste in unmodified.
 *
 * M2 scope: the recognizable street — road, sidewalks, crosswalk, north and
 * south blocks, the bodega (interior + teal awning + warm window), props,
 * the fire escape, the window grid with the two story windows, the skyline
 * card, the kid's teal door, the ghost cart, the drifting taxi, the steam.
 * State (dusk, the kid, the claimed cart) arrives with M4/M5 — this file
 * only exposes handles.
 */

const RAIL = 0x3a3440;
const WINDOW_DIM = 0x3b3346;
const SKYLINE = 0x9c8aa5;
const DARK = 0x2b2730;

/** Oracle anchors the game systems need (M3–M5 read these, never re-type them). */
export const ANCHORS = {
  spawn: { x: -30, y: 0.05, z: 6.2 },
  cartSpot: { x: 4, y: 0.05, z: -6.6 },
  bodegaInside: { x: -16, y: 0, z: 14 },
  counter: { x: -18.5, y: 0.5, z: 13.5 },
  ladder1: { x: 9.4, y: 2.4, z: -7.75, top: 4.35 },
  ladder2: { x: 16.4, y: 6.6, z: -7.75, top: 8.35 },
  topLanding: { x: 12.5, y: 9.0, z: -7.3 },
  crosswalk: { x: -5, z: 0 },
  stoop: { x: 15, y: 0.05, z: 6.9 },
  rail: { x: 12.5, y: 8.0, z: -6.8 },
} as const;

function box(
  parent: THREE.Object3D,
  name: string,
  center: [number, number, number],
  size: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  m.name = name;
  m.position.set(center[0], center[1], center[2]);
  parent.add(m);
  return m;
}

function cyl(
  parent: THREE.Object3D,
  name: string,
  center: [number, number, number],
  r: number,
  h: number,
  material: THREE.Material,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), material);
  m.name = name;
  m.position.set(center[0], center[1], center[2]);
  parent.add(m);
  return m;
}

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface LadderZone extends AABB {
  x: number;
  z: number;
  top: number;
  id: string;
}

function pushBox(
  list: AABB[],
  center: [number, number],
  size: [number, number],
): void {
  list.push({
    minX: center[0] - size[0] / 2,
    maxX: center[0] + size[0] / 2,
    minZ: center[1] - size[1] / 2,
    maxZ: center[1] + size[1] / 2,
  });
}

export class Day1World {
  readonly group = new THREE.Group();

  readonly goldWindow!: THREE.Mesh;
  readonly secondWindow!: THREE.Mesh;
  readonly bodegaRoof: THREE.Mesh;
  readonly taxi: THREE.Mesh;
  readonly cartRoot: THREE.Group;

  private readonly sun: THREE.DirectionalLight;
  private readonly cartMat: THREE.MeshStandardMaterial;
  private readonly goldMat: THREE.MeshStandardMaterial;
  private readonly secondMat: THREE.MeshStandardMaterial;
  private readonly steam: THREE.Group;
  private readonly steamBits: THREE.Mesh[] = [];
  private taxiX = -45;
  private disposed = false;

  /** Static colliders (capsule-vs-AABB, XZ). Oracle walls, buildings, bodega. */
  readonly colliders: AABB[] = [];
  /** Ladder grab zones — oracle `_ladder` areas with their top heights. */
  readonly ladders: LadderZone[] = [];
  /** Platform tops the player can stand on (the two fire-escape landings). */
  private readonly landings: Array<{ box: AABB; top: number }> = [
    { box: { minX: 10, maxX: 16, minZ: -8.0, maxZ: -6.6 }, top: 4.075 },
    { box: { minX: 10, maxX: 16, minZ: -8.0, maxZ: -6.6 }, top: 8.075 },
  ];

  constructor(scene: THREE.Scene) {
    this.group.name = "Day1World";
    scene.add(this.group);

    const std = (color: number): THREE.MeshStandardMaterial =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
    const m = {
      road: std(PAL.road),
      walk: std(PAL.walk),
      cream: std(PAL.cream),
      bldg: std(PAL.bldg),
      bldg2: std(PAL.bldg2),
      brick: std(PAL.brick),
      stone: std(PAL.stone),
      interior: std(PAL.interior),
      teal: std(PAL.teal),
      amber: std(PAL.amber),
      rail: std(RAIL),
      dim: std(WINDOW_DIM),
      skyline: std(SKYLINE),
      dark: std(DARK),
      coral: std(PAL.coral),
      taxi: std(PAL.taxi),
    };
    this.cartMat = new THREE.MeshStandardMaterial({
      color: PAL.gold,
      transparent: true,
      opacity: 0.35,
      roughness: 0.9,
    });
    this.goldMat = new THREE.MeshStandardMaterial({
      color: WINDOW_DIM,
      emissive: PAL.gold,
      emissiveIntensity: 0,
    });
    this.secondMat = this.goldMat.clone();

    // -- street ------------------------------------------------------------
    box(this.group, "Road", [0, -0.1, 0], [100, 0.2, 8], m.road).receiveShadow = true;
    box(this.group, "Sidewalk_N", [0, -0.05, 6], [100, 0.3, 4], m.walk).receiveShadow = true;
    box(this.group, "Sidewalk_S", [0, -0.05, -6], [100, 0.3, 4], m.walk).receiveShadow = true;
    for (let i = 0; i < 6; i++) {
      box(this.group, `Crosswalk_${i}`, [-5, 0.01, -3.3 + i * 1.3], [3, 0.02, 0.6], m.cream);
    }

    // -- north block (gap x[-21,-11] is the bodega) ------------------------
    box(this.group, "Bldg_N_West", [-35.5, 7, 14], [29, 14, 12], m.bldg);
    box(this.group, "Bldg_N_East_A", [-1, 9, 14], [20, 18, 12], m.bldg2);
    box(this.group, "Bldg_N_GoldWindow", [15, 5.5, 14], [12, 11, 12], m.brick);
    box(this.group, "Bldg_N_East_B", [35, 8, 14], [28, 16, 12], m.bldg);
    box(this.group, "Terminal_Door", [-30, 1.4, 7.95], [3, 2.8, 0.15], m.teal);
    box(this.group, "Terminal_Sign", [-30, 3.4, 7.95], [5, 0.8, 0.15], m.stone);

    // -- south block -------------------------------------------------------
    box(this.group, "Bldg_S_West", [-25, 8, -14], [50, 16, 12], m.bldg2);
    box(this.group, "Bldg_S_FireEscape", [13, 7, -14], [26, 14, 12], m.brick);
    box(this.group, "Bldg_S_East", [38, 9, -14], [24, 18, 12], m.bldg);

    // -- bodega ------------------------------------------------------------
    const b = new THREE.Group();
    b.name = "Bodega";
    this.group.add(b);
    box(b, "Floor", [-16, 0.06, 14], [10, 0.1, 12], m.interior);
    box(b, "Wall_W", [-20.8, 2.25, 14], [0.4, 4.5, 12], m.stone);
    box(b, "Wall_E", [-11.2, 2.25, 14], [0.4, 4.5, 12], m.stone);
    box(b, "Wall_Back", [-16, 2.25, 19.8], [10, 4.5, 0.4], m.stone);
    box(b, "Front_L", [-19.25, 2.25, 8.2], [3.5, 4.5, 0.4], m.brick);
    box(b, "Front_R", [-12.75, 2.25, 8.2], [3.5, 4.5, 0.4], m.brick);
    box(b, "Front_Lintel", [-16, 3.8, 8.2], [3, 1.4, 0.4], m.brick);
    const rosaWindow = box(b, "Window_Front", [-19.25, 1.8, 7.98], [2.6, 1.6, 0.05],
      new THREE.MeshStandardMaterial({ color: PAL.amber, emissive: PAL.amber, emissiveIntensity: 0.55 }));
    rosaWindow.name = "RosaWindow";
    box(b, "Awning", [-16, 3.2, 7.4], [10, 0.15, 1.4], m.teal);
    this.bodegaRoof = box(b, "Roof", [-16, 4.65, 14], [10, 0.3, 12], m.bldg);
    box(b, "Counter", [-19.6, 0.55, 13.5], [1.2, 1.1, 6], m.teal);
    box(b, "BackShelf", [-16, 1.0, 19.3], [6, 2.0, 0.6], m.bldg2);

    // -- props -------------------------------------------------------------
    cyl(this.group, "Manhole", [-10, 0.01, 0.5], 0.6, 0.02, m.dark);
    cyl(this.group, "Hydrant", [-0.6, 0.45, -5.6], 0.18, 0.9, m.coral);
    this.taxi = box(this.group, "Taxi", [this.taxiX, 0.7, -2], [4, 1.3, 1.9], m.taxi);
    box(this.group, "PlayerCorner", [4, 0.11, -6], [8, 0.02, 3.6], m.stone);

    // steam: a handful of translucent puffs over the manhole, ticked in update()
    this.steam = new THREE.Group();
    this.steam.name = "Steam";
    const puffMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false,
    });
    for (let i = 0; i < 7; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), puffMat);
      puff.position.set(-10 + (Math.random() - 0.5) * 0.8, 0.1 + Math.random() * 2.5, 0.5 + (Math.random() - 0.5) * 0.8);
      this.steam.add(puff);
      this.steamBits.push(puff);
    }
    this.group.add(this.steam);

    // -- fire escape -------------------------------------------------------
    const fe = new THREE.Group();
    fe.name = "FireEscape";
    this.group.add(fe);
    box(fe, "Landing_1", [13, 4.0, -7.3], [6, 0.15, 1.4], m.rail);
    box(fe, "Landing_2", [13, 8.0, -7.3], [6, 0.15, 1.4], m.rail);
    box(fe, "Rail_1", [13, 4.5, -6.62], [6, 0.9, 0.05], m.rail);
    box(fe, "Rail_2", [13, 8.5, -6.62], [6, 0.9, 0.05], m.rail);
    box(fe, "Ladder_1_Mesh", [9.4, 2.2, -7.75], [0.6, 4.4, 0.08], m.rail);
    box(fe, "Ladder_2_Mesh", [16.6, 6.2, -7.75], [0.6, 4.4, 0.08], m.rail);

    // -- windows on the gold-window building --------------------------------
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const p: [number, number, number] = [10.5 + col * 3, 3 + row * 3, 7.94];
        if (row === 2 && col === 1) {
          this.goldWindow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.08), this.goldMat);
          this.goldWindow.name = "GoldWindow";
          this.goldWindow.position.set(p[0], p[1], p[2]);
          this.group.add(this.goldWindow);
        } else if (row === 2 && col === 0) {
          this.secondWindow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.08), this.secondMat);
          this.secondWindow.name = "SecondWindow";
          this.secondWindow.position.set(p[0], p[1], p[2]);
          this.group.add(this.secondWindow);
        } else {
          box(this.group, `Window_${row}_${col}`, p, [1.2, 1.6, 0.08], m.dim);
        }
      }
    }

    // -- Day 2 props that are pure visuals from day one ----------------------
    const d2 = new THREE.Group();
    d2.name = "Day2";
    this.group.add(d2);
    box(d2, "KidDoor", [15, 1.4, 7.9], [1.6, 2.8, 0.12], m.teal);
    box(d2, "KidStoop", [15, 0.16, 7.35], [2.2, 0.28, 1.1], m.stone);

    // -- the ghost cart (solid gold once claimed — M5) -----------------------
    this.cartRoot = new THREE.Group();
    this.cartRoot.name = "CartPlaceholder";
    this.cartRoot.position.set(ANCHORS.cartSpot.x, ANCHORS.cartSpot.y, ANCHORS.cartSpot.z);
    const cartBits: Array<[THREE.Vector3, THREE.Vector3]> = [
      [new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(1.8, 1.0, 1.0)],
      [new THREE.Vector3(0, 2.0, 0), new THREE.Vector3(2.2, 0.12, 1.4)],
      [new THREE.Vector3(-0.9, 1.4, 0), new THREE.Vector3(0.08, 1.4, 0.08)],
      [new THREE.Vector3(0.9, 1.4, 0), new THREE.Vector3(0.08, 1.4, 0.08)],
    ];
    for (const [pos, size] of cartBits) {
      const part = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), this.cartMat);
      part.position.copy(pos);
      this.cartRoot.add(part);
    }
    this.group.add(this.cartRoot);

    // -- skyline card, far north, above the low gold-window building ---------
    const sky = new THREE.Group();
    sky.name = "SkylineCard";
    this.group.add(sky);
    const heights = [38, 62, 45, 80, 52, 70, 40, 58];
    heights.forEach((h, i) => {
      box(sky, `Tower_${i}`, [-10 + i * 7, h / 2, 90], [6, h, 6], m.skyline);
    });
    box(sky, "Spire", [11, 92, 90], [0.6, 24, 0.6], m.skyline);

    // -- light: golden hour, styleframe A ------------------------------------
    const hemi = new THREE.HemisphereLight(PAL.cream, PAL.stone, 0.85);
    this.group.add(hemi);
    this.sun = new THREE.DirectionalLight(PAL.amber, 1.3);
    // Oracle: rotation (-28, -60, 0) — sun in the west, shadows falling east.
    this.sun.position.set(-14, 17, 9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -55;
    this.sun.shadow.camera.right = 55;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -10;
    this.sun.shadow.camera.far = 80;
    this.group.add(this.sun);
    this.group.add(new THREE.AmbientLight(PAL.cream, 0.25));

    // -- colliders: what the capsule must respect (oracle statics) ----------
    const C = this.colliders;
    pushBox(C, [-48, 0], [1, 40]);   // west bound
    pushBox(C, [48, 0], [1, 40]);    // east bound
    // north block (bodega gap x[-21,-11] stays open)
    pushBox(C, [-35.5, 14], [29, 12]);
    pushBox(C, [-1, 14], [20, 12]);
    pushBox(C, [15, 14], [12, 12]);
    pushBox(C, [35, 14], [28, 12]);
    // south block
    pushBox(C, [-25, -14], [50, 12]);
    pushBox(C, [13, -14], [26, 12]);
    pushBox(C, [38, -14], [24, 12]);
    // bodega walls (door gap x[-17.5,-14.5] stays open)
    pushBox(C, [-20.8, 14], [0.4, 12]);
    pushBox(C, [-11.2, 14], [0.4, 12]);
    pushBox(C, [-16, 19.8], [10, 0.4]);
    pushBox(C, [-19.25, 8.2], [3.5, 0.4]);
    pushBox(C, [-12.75, 8.2], [3.5, 0.4]);
    pushBox(C, [-19.6, 13.5], [1.2, 6]);   // counter

    // -- ladders (oracle _ladder areas: width, depth 1.4, top heights) ------
    this.ladders.push({ minX: 8.9, maxX: 9.9, minZ: -8.45, maxZ: -7.05, x: 9.4, z: -7.75, top: 4.35, id: "Ladder_1" });
    this.ladders.push({ minX: 15.6, maxX: 17.2, minZ: -8.45, maxZ: -7.05, x: 16.4, z: -7.75, top: 8.35, id: "Ladder_2" });

    this.setShadows(true);
  }

  /**
   * Stepped ground: the highest platform top under the point that is at or
   * below `nearY + 0.5` (so the street stays the street while you climb past
   * a landing). Oracle ground is flat y=0 plus the two landings.
   */
  groundAt(x: number, z: number, nearY: number): number {
    let g = 0;
    for (const l of this.landings) {
      const b = l.box;
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && l.top <= nearY + 0.5) {
        g = Math.max(g, l.top);
      }
    }
    return g;
  }

  /** The ladder zone under this XZ spot, or null (oracle `_grab_ladder`). */
  ladderAt(x: number, z: number): LadderZone | null {
    for (const l of this.ladders) {
      if (x >= l.minX && x <= l.maxX && z >= l.minZ && z <= l.maxZ) return l;
    }
    return null;
  }

  /** Shadows on the big statics only — llvmpipe and low-RAM phones pay per caster. */
  private setShadows(on: boolean): void {
    for (const name of [
      "Road", "Sidewalk_N", "Sidewalk_S", "Bldg_N_West", "Bldg_N_East_A",
      "Bldg_N_GoldWindow", "Bldg_N_East_B", "Bldg_S_West", "Bldg_S_FireEscape",
      "Bldg_S_East", "Taxi",
    ]) {
      const mesh = this.group.getObjectByName(name);
      if (mesh) {
        mesh.castShadow = on;
        mesh.receiveShadow = on;
      }
    }
    this.cartRoot.traverse((o) => {
      o.castShadow = on;
    });
  }

  /** Taxi drift + steam rise. Pure motion, no state decisions. */
  tick(dt: number): void {
    if (this.disposed) return;
    this.taxiX += dt * 9.0;
    if (this.taxiX > 46.0) this.taxiX = -46.0;
    this.taxi.position.x = this.taxiX;
    for (const puff of this.steamBits) {
      puff.position.y += dt * 0.5;
      puff.scale.multiplyScalar(1 + dt * 0.1);
      if (puff.position.y > 2.6) {
        puff.position.set(-10 + (Math.random() - 0.5) * 0.8, 0.1, 0.5 + (Math.random() - 0.5) * 0.8);
        puff.scale.setScalar(1);
      }
    }
  }

  /** Dusk lighting (oracle `_start_dusk` / `_to_morning_light`). M4+ calls these. */
  toDusk(): void {
    this.sun.intensity = 0.55;
    this.sun.color.set(PAL.plum);
    this.group.traverse((o) => {
      if (o instanceof THREE.HemisphereLight) {
        o.color.set(PAL.plum);
        o.groundColor.set(PAL.road);
        o.intensity = 0.6;
      }
    });
  }

  toMorning(): void {
    this.sun.intensity = 1.3;
    this.sun.color.set(PAL.amber);
    this.group.traverse((o) => {
      if (o instanceof THREE.HemisphereLight) {
        o.color.set(PAL.cream);
        o.groundColor.set(PAL.stone);
        o.intensity = 0.85;
      }
    });
  }

  /** The cart claims its name (oracle `_apply_cart_identity`). M5 calls this. */
  claimCart(_name: string): void {
    this.cartMat.transparent = false;
    this.cartMat.opacity = 1;
    this.cartMat.needsUpdate = true;
    // M5: the name sign (a canvas-texture sprite) rides with the content pass.
  }

  dispose(scene: THREE.Scene): void {
    this.disposed = true;
    scene.remove(this.group);
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
      else if (mat) mat.dispose();
    });
  }
}
