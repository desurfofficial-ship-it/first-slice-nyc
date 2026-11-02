/**
 * Agent-5 — FIRST-SESSION ENVIRONMENTS (docs/02 + docs/07).
 *
 * One module, three zones, one owner:
 *
 *   1. ALDER STATION — the below-grade platform under the subway plaza.
 *      The shipped entrance stair (props.ts `makeSubwayEntrance`) becomes a
 *      real descendable stairwell: twelve risers, a tiled hall, track,
 *      tunnels with a danger barrier, a two-car train you can walk into,
 *      and a signed west passage.
 *   2. THE TIMES SQUARE DISTRICT — the Doc 02 Wow-Walk destination, south
 *      of the playable core (z −80..−48). Reached the way Doc 02 routes
 *      it: down the stairs, through the passage, up into the square.
 *      Towers, billboards, the red steps, bollards, cabs, two walkers.
 *   3. THE TERMINAL ARRIVAL — the Doc 02 opening beat at the west end:
 *      the intercity coach parked at the BUS-02 curb bay and a dressed
 *      terminal facade. (The M121 city bus that also serves this bay is
 *      W4's — an intercity coach and a city bus sharing a 100 m curb is
 *      just a terminal.)
 *
 * Coordination law (AGENTS.md §1d, docs/45): the shipped world is untouched
 * except three documented cuts in World.ts (sidewalk split, blocker retire,
 * south-wall gap). Every mesh here is named — the station and the square
 * carry the `A5_` prefix so bakeStatics skips them (they own their
 * visibility gate: the bodega-interior pattern), while the shaft and the
 * terminal bake into their districts like any other street geometry.
 *
 * Performance: the station renders only while the player is below grade
 * (y < −0.35); the square only south of z −14. Both gates are no-ops for
 * the home street, so every ledger rig and the whole E2E run are unchanged.
 * No realtime lights were added — emissive Lambert and unlit Basic
 * materials only (Doc 07 §4 light budget). No new colors: everything is
 * PAL or an existing documented scene signature.
 */

import * as THREE from 'three';
import { boxFromCenter, type AABB } from '../engine/collide';
import { PAL } from '../core/palette';
import { MatBank, makeBench, type SignPairFactory, type SignPair } from './props';
import { Pedestrians, type PedLook } from './peds';

export interface FirstSessionCtx {
  bank: MatBank;
  colliders: AABB[];
  sign: SignPairFactory;
}

// ------------------------------------------------------------- constants ----
// The stair shaft: opening in Sidewalk_N at x −43.5..−40.5, z 5.0..8.0.
const SHAFT_W = -43.5, SHAFT_E = -40.5;     // opening x
const SHAFT_S = 5.0;                        // opening z (north edge is 8.0)
const STAIR_W = 2.5;                        // clear width between shaft walls
const STEP_RUN = 0.25, STEP_RISE = 0.335;   // 12 risers: 0.1 → −3.735, hall −4.0
const STEPS = 12;
const GRADE = 0.05;                          // station floor top (sidewalk 0.1)
const TRACK_TOP = -4.35;                     // track bed (0.35 step from platform)
const PLAT_TOP = -4.0;                       // platform / car floor
const CEIL = -1.4;                           // hall ceiling soffit
// Spans are literals at the builders (hall x −49..−35 / z −3..9.4; passage
// x −75..−49 z 3..7; leg x −75..−69 to z −55; square x −83..−57 z −79..−49)
// so each wall reads next to its own gap — the constants above are the ones
// two builders share.

/** Warm screen cycle (the Doc 02 "screens turn warm" grammar, ambient). */
const SCREEN_HUES = [0.09, 0.075, 0.02, 0.48]; // gold → amber → coral → teal

export class FirstSessionWorld {
  /** Below-grade station: gated on player y. */
  readonly station = new THREE.Group();
  /** Times Square district: gated on player z. */
  readonly square = new THREE.Group();
  /** The at-grade subway headhouse: street furniture, always visible (A5). */
  readonly headhouse = new THREE.Group();
  /** The always-visible shaft + the terminal bake with the street. */
  private flickers: THREE.MeshBasicMaterial[] = [];
  private screens: THREE.MeshBasicMaterial[] = [];
  private steam: THREE.Points | null = null;
  private steamSeed: number[] = [];
  private time = 0;
  private mats = new Map<number, THREE.MeshLambertMaterial>();
  private bank: MatBank;
  private sign: SignPairFactory;
  private peds: Pedestrians | null = null;

  constructor(scene: THREE.Scene, ctx: FirstSessionCtx) {
    this.bank = ctx.bank;
    this.sign = ctx.sign;
    // the module's colliders join the world's single collision stack — the
    // same array the player, the camera boom, and the probes all read
    this.ctxColliders = ctx.colliders;
    this.station.name = 'A5_AlderStation';
    this.square.name = 'A5_TimesSquare';
    // gated off until the first update() — no boot flash from below grade
    this.station.visible = false;
    this.square.visible = false;

    this.buildShaft();          // bakes with the street (no A5_ prefix)
    this.buildStation();        // A5_ — gated below grade
    this.buildPassageAndHead(); // passage gated below grade; headhouse always
    this.buildTimesSquare();    // A5_ — gated south of the core
    this.buildTerminal(scene);  // bakes with the street (no A5_ prefix)

    scene.add(this.station);
    scene.add(this.square);
    scene.add(this.headhouse);
  }

  // ----------------------------------------------------------- materials ----
  private mat(color: number, emissive = 0, intensity = 0): THREE.MeshLambertMaterial {
    const key = color * 7 + emissive * 131 + intensity * 9973;
    let m = this.mats.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: intensity });
      this.mats.set(key, m);
    }
    return m;
  }

  /** Axis-aligned box mesh at a CENTER position (the world's own grammar). */
  private box(
    parent: THREE.Object3D, name: string, mat: THREE.Material,
    cx: number, cy: number, cz: number, w: number, h: number, d: number,
    collide = false,
  ): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.name = name;
    m.position.set(cx, cy, cz);
    m.castShadow = false;
    m.receiveShadow = false;
    parent.add(m);
    if (collide) this.pushCollider(cx, cy, cz, w, h, d);
    return m;
  }

  private pushCollider(cx: number, cy: number, cz: number, w: number, h: number, d: number): void {
    this.ctxColliders.push(boxFromCenter(cx, cy, cz, w, h, d));
  }

  private ctxColliders: AABB[] = [];

  /** Canvas text plane, unlit (self-lit signs read at any hour). */
  private textPlane(
    parent: THREE.Object3D, name: string, text: string,
    w: number, h: number, bg: number, fg: number,
    cx: number, cy: number, cz: number, ry = 0,
  ): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(32, Math.round(w * 24));
    canvas.height = Math.max(24, Math.round(h * 24));
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#' + bg.toString(16).padStart(6, '0');
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#' + fg.toString(16).padStart(6, '0');
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const lines = text.split('\n');
    g.font = `bold ${Math.round((canvas.height / lines.length) * 0.62)}px sans-serif`;
    lines.forEach((ln, i) => {
      g.fillText(ln, canvas.width / 2, canvas.height * (i + 0.5) / lines.length);
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 2;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    m.name = name;
    m.position.set(cx, cy, cz);
    m.rotation.y = ry;
    parent.add(m);
    return m;
  }

  // ------------------------------------------------------------- 1. shaft ----
  /** The real stairwell in the sidewalk opening. Bakes with the street. */
  private buildShaft(): void {
    const g = new THREE.Group();
    g.name = 'ShaftStair'; // bakes with the street: 14 meshes in a 3 m hole,
    // merged into the c1r1 batches they belong to. The station below keeps
    // its own gate, so nothing here is ever hidden that should show.
    const wallMat = this.mat(PAL.stone);
    const stepMat = this.mat(PAL.windowDim);
    // shaft walls (0.25 thick, inner faces at −43.25 / −40.75)
    this.box(g, 'ShaftWallW', wallMat, SHAFT_W + 0.125, -1.95, 6.5, 0.25, 4.1, 3.0, true);
    this.box(g, 'ShaftWallE', wallMat, SHAFT_E - 0.125, -1.95, 6.5, 0.25, 4.1, 3.0, true);
    // twelve solid risers, northward descent, tops −0.05 → −3.735
    for (let i = 0; i < STEPS; i++) {
      const top = -0.05 - i * STEP_RISE;
      const h = top - PLAT_TOP;
      this.box(g, `ShaftStep${i}`, stepMat,
        (SHAFT_W + SHAFT_E) / 2, top - h / 2, SHAFT_S + 0.125 + i * STEP_RUN + STEP_RUN / 2,
        STAIR_W, h, STEP_RUN, true);
    }
    // A5: the first draft's south "lip" (top 0.03 — always buried under the
    // sidewalk) is RETIRED, and what the mouth actually needed is added: the
    // sidewalk split left the strip south of the opening (x −43.5..−40.5,
    // z 4..5) as VOID — ascending the shaft ended hovering over nothing and
    // the walk fell back inside. The apron slab (sidewalk top 0.1, the
    // walk-coloured apron the plaza comments describe) closes it; the ascent
    // now lands on real street.
    this.box(g, 'ShaftApron', wallMat, (SHAFT_W + SHAFT_E) / 2, -0.05, 4.5, 3.0, 0.3, 1.0, true);
    // A5 (the W1-ghost probe caught it): the opening's side ironwork was
    // visual-only — a sidewalk walk west at z 6.5 stepped over the east edge
    // and fell into the shaft. The railings now collide (same span as the
    // prop's ironwork); the ENTRY at z 5 stays open — that is the stairs.
    this.box(g, 'ShaftRailW', this.mat(PAL.ink), -43.3, 0.53, 6.2, 0.1, 0.95, 3.4, true);
    this.box(g, 'ShaftRailE', this.mat(PAL.ink), -40.7, 0.53, 6.2, 0.1, 0.95, 3.4, true);
  }

  // ---------------------------------------------------------- 2. station -----
  private buildStation(): void {
    const g = this.station;
    const tile = this.mat(PAL.cream);
    const dark = this.mat(PAL.manhole);
    const steel = this.mat(0x8f8a82);          // the documented curb signature
    const teal = this.mat(PAL.teal);

    // floor (top −4.0) and the three ceiling slabs around the shaft hole
    // (ceilings collide — the camera boom shortens against them, bodega-roof law)
    this.box(g, 'A5_HallFloor', tile, -42, PLAT_TOP - 0.15, 3.2, 14, 0.3, 12.4, true);
    this.box(g, 'A5_CeilW', dark, -46.25, CEIL - 0.1, 3.2, 5.5, 0.2, 12.4, true);
    this.box(g, 'A5_CeilE', dark, -37.75, CEIL - 0.1, 3.2, 5.5, 0.2, 12.4, true);
    this.box(g, 'A5_CeilS', dark, -42, CEIL - 0.1, 1.0, 14, 0.2, 8.0, true);

    // hall walls: W (passage gap z 3..7, tunnel gap z −2.5..1.5 — the first
    // draft's WallW_Mid spanned z −2.5..3.0 and SEALED the west tunnel mouth,
    // walling its lights and danger barrier off from the platform while the
    // east side stayed open; the pier between the two gaps is all that's
    // needed), E (tunnel gap), N, S
    this.box(g, 'A5_WallW_Pier', tile, -49.125, -2.65, 2.25, 0.25, 2.7, 1.5, true);
    this.box(g, 'A5_WallW_N', tile, -49.125, -2.65, 8.2, 0.25, 2.7, 2.4, true);
    this.box(g, 'A5_WallE_S', tile, -34.875, -2.65, -2.75, 0.25, 2.7, 0.5, true);
    this.box(g, 'A5_WallE_N', tile, -34.875, -2.65, 5.45, 0.25, 2.7, 7.9, true);
    this.box(g, 'A5_WallN', tile, -42, -2.65, 9.525, 14, 2.7, 0.25, true);
    this.box(g, 'A5_WallS', tile, -42, -2.65, -3.125, 14, 2.7, 0.25, true);

    // track bed (top −4.35), rails, third rail — through both tunnels
    this.box(g, 'A5_TrackBed', dark, -42, TRACK_TOP - 0.15, -0.5, 32, 0.3, 4.0, true);
    this.box(g, 'A5_RailW', steel, -42, TRACK_TOP + 0.04, -1.22, 32, 0.08, 0.09);
    this.box(g, 'A5_RailE', steel, -42, TRACK_TOP + 0.04, 0.22, 32, 0.08, 0.09);
    this.box(g, 'A5_ThirdRail', dark, -42, TRACK_TOP + 0.02, 1.05, 32, 0.06, 0.12);

    // platform edge: gold warning strip + the 0.35 drop to the bed
    this.box(g, 'A5_EdgeStrip', this.mat(PAL.gold), -42, PLAT_TOP + 0.021, 1.62, 14, 0.04, 0.24);

    // columns along the platform (they hold the ceiling in the fiction)
    for (const cx of [-46.5, -42.5, -38.5]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.7, 12), teal);
      c.name = `A5_Column${cx}`;
      c.position.set(cx, PLAT_TOP + 1.35, 3.2);
      g.add(c);
      this.pushCollider(cx, PLAT_TOP + 1.35, 3.2, 0.56, 2.7, 0.56);
    }

    // benches (the shipped builder) face the track
    for (const bx of [-45.2, -38.8]) {
      const b = makeBench(this.bank);
      b.name = `A5_Bench${bx}`;
      b.position.set(bx, PLAT_TOP, 6.6);
      b.rotation.y = Math.PI;
      g.add(b);
      this.pushCollider(bx, PLAT_TOP + 0.3, 6.6, 1.85, 0.7, 0.62);
    }

    // name boards + line bullets + the exit board over the passage mouth
    this.stationSign(g, 'ALDER ST', -48.98, 0.9, 5.4, Math.PI / 2);
    this.stationSign(g, 'ALDER ST', -35.02, 0.9, 5.4, -Math.PI / 2);
    this.bulletPair(g, -48.98, 1.7, 8.3, Math.PI / 2);
    this.textPlane(g, 'A5_ExitBoard', 'TIMES SQ →', 2.6, 0.62, PAL.ink, PAL.cream, -48.98, 0.2, 5.0, Math.PI / 2);
    this.textPlane(g, 'A5_PassageArrow', '→ TIMES SQ', 2.2, 0.5, PAL.teal, PAL.cream, -49.2, -1.05, 5.0, Math.PI / 2);

    // big mosaic name over the landing (what you see climbing out)
    this.stationSign(g, 'ALDER ST', -42, -1.05, 9.38, Math.PI, 3.4, 0.9, 96);

    // trash can by the benches (the shipped can silhouette, simple)
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.85, 10), dark);
    can.name = 'A5_TrashCan';
    can.position.set(-36.2, PLAT_TOP + 0.425, 6.6);
    g.add(can);
    this.pushCollider(-36.2, PLAT_TOP + 0.425, 6.6, 0.64, 0.85, 0.64);

    // ceiling light strips over the platform (the middle one flickers)
    this.lightStrip(g, -46.5, 5.2, 3.4);
    this.lightStrip(g, -42.0, 5.2, 3.4, true);
    this.lightStrip(g, -38.0, 5.2, 3.4);

    // tunnels + danger barriers
    this.tunnel(g, -1, dark, steel);
    this.tunnel(g, 1, dark, steel);

    // the train — two enterable cars, pulled apart so the end walls never
    // seal the gangway (the first draft left 0.2 m between them); the
    // junction ends carry door gaps (see endWall — the second draft sealed
    // them with full end walls and the through-car route wedged at x −42.1)
    this.trainCar(g, -44.5, dark, steel, false, true);
    this.trainCar(g, -37.3, dark, steel, true, false);
    // gangway between the cars — floor plates + shell sides with a door gap
    this.box(g, 'A5_GangwayFloor', dark, -40.7, PLAT_TOP - 0.075, 0, 1.4, 0.15, 2.4, true);
    this.box(g, 'A5_GangwayShellN', dark, -40.7, -2.7, 0.825, 1.2, 2.3, 0.65, true);
    this.box(g, 'A5_GangwayShellS', dark, -40.7, -2.7, -0.825, 1.2, 2.3, 0.65, true);
    this.box(g, 'A5_GangwayHeader', dark, -40.7, -1.775, 0, 1.2, 0.45, 1.0);
  }

  /** One lit ceiling strip; flicker strips ride the update loop. */
  private lightStrip(parent: THREE.Object3D, x: number, z: number, len: number, flicker = false): void {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.06, len),
      new THREE.MeshBasicMaterial({ color: 0xffe9c4 }),
    );
    m.name = flicker ? 'A5_FlickerStrip' : 'A5_LightStrip';
    m.position.set(x, CEIL - 0.14, z);
    parent.add(m);
    if (flicker) this.flickers.push(m.material as THREE.MeshBasicMaterial);
  }

  /** Station-name board on a wall (Lambert canvas — reads in ambient light). */
  private stationSign(
    parent: THREE.Object3D, text: string, x: number, y: number, z: number,
    ry: number, w = 2.2, h = 0.66, px = 64,
  ): void {
    const pair: SignPair = this.sign(text, Math.max(96, Math.round(w * px)), Math.max(32, Math.round(h * px)), PAL.ink, PAL.cream, Math.round(h * px * 0.55));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pair.face);
    board.name = 'A5_NameBoard';
    board.position.set(x, y, z);
    board.rotation.y = ry;
    parent.add(board);
  }

  /** The F and M bullets beside a board — the line the kid taught you. */
  private bulletPair(parent: THREE.Object3D, x: number, y: number, z: number, ry: number): void {
    // offset along the wall (z here — the pair rides the west wall)
    for (const [line, color, dz] of [['F', PAL.teal, -0.45], ['M', PAL.coral, 0.45]] as const) {
      const pair = this.sign(line, 96, 96, color, PAL.cream, 56);
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), pair.face);
      b.name = 'A5_Bullet';
      b.position.set(x, y, z + dz);
      b.rotation.y = ry;
      parent.add(b);
    }
  }

  /** A dead-ended tunnel with its danger barrier. dir: −1 west, +1 east. */
  private tunnel(g: THREE.Group, dir: number, dark: THREE.Material, steel: THREE.Material): void {
    const cx = dir < 0 ? -53.5 : -30.5;       // tunnel span x −58..−49 / −35..−26
    this.box(g, `A5_TunWallN${dir}`, dark, cx, -3.15, 1.625, 9, 2.4, 0.25);
    this.box(g, `A5_TunWallS${dir}`, dark, cx, -3.15, -2.625, 9, 2.4, 0.25);
    this.box(g, `A5_TunCeil${dir}`, dark, cx, -2.05, -0.5, 9, 0.2, 4.5, true);
    this.box(g, `A5_TunEnd${dir}`, dark, cx + dir * 4.375, -3.15, -0.5, 0.25, 2.4, 4.5);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 1.6), new THREE.MeshBasicMaterial({ color: 0xffdf9e }));
      m.name = `A5_TunLight${dir}`;
      m.position.set(cx - dir * 2.8 + dir * i * 2.6, -2.18, -0.5);
      g.add(m);
      if (i === 1) this.flickers.push(m.material as THREE.MeshBasicMaterial);
    }
    // danger barrier at the far mouth — posts + two rails + a sign
    const bx = cx + dir * 3.9;
    this.box(g, `A5_BarPostN${dir}`, steel, bx, PLAT_TOP + 0.55, 1.3, 0.08, 1.1, 0.08);
    this.box(g, `A5_BarPostS${dir}`, steel, bx, PLAT_TOP + 0.55, -1.3, 0.08, 1.1, 0.08);
    this.box(g, `A5_BarRailN${dir}`, this.mat(PAL.coral), bx, PLAT_TOP + 0.95, 0, 0.06, 0.07, 2.7);
    this.box(g, `A5_BarRailS${dir}`, this.mat(PAL.coral), bx, PLAT_TOP + 0.4, 0, 0.06, 0.07, 2.7);
    this.textPlane(g, `A5_BarSign${dir}`, 'DANGER\nDO NOT ENTER', 1.3, 0.6, PAL.coral, PAL.cream,
      bx, PLAT_TOP + 1.32, 0, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    this.pushCollider(bx, PLAT_TOP + 0.55, 0, 0.2, 1.2, 2.8);
  }

  /**
   * One enterable subway car, doors open to the platform. cx = center x.
   * gapW/gapE: the end wall facing the gangway is built as two side piers +
   * a header (door gap z −0.5..0.5, header y −2.0..−1.45 — the gangway
   * shells' own gap) instead of a full wall: the first draft sealed both
   * cars' junction ends, so the probe walked into a wall at x −42.1 and the
   * "through both cars" route wedged. The far ends stay full.
   */
  private trainCar(g: THREE.Group, cx: number, dark: THREE.Material, steel: THREE.Material, gapW = false, gapE = false): void {
    const body = this.mat(PAL.cream);
    const band = this.mat(PAL.windowDim, PAL.amber, 0.25); // lit windows from inside
    const seat = this.mat(PAL.teal);
    const teal = this.mat(PAL.teal);
    const L = 5.6, W = 2.4;                    // car length / width
    // floor + roof
    this.box(g, `A5_CarFloor${cx}`, dark, cx, PLAT_TOP - 0.075, 0, L, 0.15, W, true);
    this.box(g, `A5_CarRoof${cx}`, body, cx, -1.525, 0, L, 0.15, W);
    this.box(g, `A5_CarVent${cx}`, steel, cx, -1.42, 0, 1.4, 0.1, 1.0);
    // south wall (full) + its window band
    this.box(g, `A5_CarWallS${cx}`, body, cx, -2.725, -1.1, L, 2.55, 0.2, true);
    this.box(g, `A5_CarWinS${cx}`, band, cx, -2.3, -1.19, L - 1.2, 0.8, 0.04);
    // north wall: three piers + header, two door gaps on the platform side
    const doors = [cx - 1.4, cx + 1.4];        // door gap centers, 1.0 wide
    const pierSpans: Array<[number, number]> = [
      [cx - L / 2, doors[0] - 0.5], [doors[0] + 0.5, doors[1] - 0.5], [doors[1] + 0.5, cx + L / 2],
    ];
    for (let i = 0; i < pierSpans.length; i++) {
      const [a, b] = pierSpans[i];
      if (b - a < 0.05) continue;
      this.box(g, `A5_CarPier${cx}_${i}`, body, (a + b) / 2, -2.725, 1.1, b - a, 2.55, 0.2, true);
      this.box(g, `A5_CarWinN${cx}_${i}`, band, (a + b) / 2, -2.3, 1.19, Math.max(0.1, b - a - 0.7), 0.8, 0.04);
    }
    this.box(g, `A5_CarHeader${cx}`, body, cx, -1.775, 1.1, L, 0.5, 0.2);
    // open door leaves, slid into the piers
    for (const dx of doors) {
      this.box(g, `A5_CarDoor${dx}`, teal, dx - 0.62, -2.725, 1.08, 0.24, 2.55, 0.1);
    }
    // end walls — full, or piers + header where the gangway joins
    this.endWall(g, cx, dark, body, gapW, gapE);
    // seats along the south wall (two bays) + poles — the aisle keeps a
    // 0.95 m clear band: the first draft (seat face −0.445, poles 0.25) left
    // 0.645 m and the 0.7 m capsule wedged between its own car's furniture
    for (const sx of [cx - 1.4, cx + 1.4]) {
      this.box(g, `A5_CarSeat${sx}`, seat, sx, -3.72, -0.775, 2.2, 0.5, 0.45, true);
    }
    for (const px of [cx - 1.9, cx, cx + 1.9]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8), steel);
      p.name = `A5_CarPole${px}`;
      p.position.set(px, -2.55, 0.45);
      g.add(p);
      this.pushCollider(px, -2.55, 0.45, 0.1, 1.7, 0.1);
    }
    // interior light + two ads + the two-line route map (Priya's beat)
    this.lightStrip(g, cx, 0, L - 0.8);
    this.textPlane(g, `A5_CarAdA${cx}`, 'THE MAP\nKNOWS', 0.9, 0.6, PAL.coral, PAL.cream, cx - 1.1, -2.2, -1.21, Math.PI);
    this.textPlane(g, `A5_CarAdB${cx}`, 'REGULAR\nMILK · TWO SUGARS', 1.2, 0.6, PAL.teal, PAL.cream, cx + 1.2, -2.2, -1.21, Math.PI);
    if (cx < -41) {
      this.textPlane(g, 'A5_RouteMap', 'F — UNDER THE RIVER\nM — WITH THE LIGHTS', 1.7, 0.7, PAL.cream, PAL.ink,
        cx - 1.5, -1.65, 0.98);
    }
  }

  /** One car end wall: full body, or — facing the gangway — side piers and a
   *  header around the door gap (z −0.5..0.5, y −4.0..−2.0), which lines up
   *  with the gangway shells' gap so the two cars are walkable end to end. */
  private endWall(
    g: THREE.Group, cx: number, dark: THREE.Material, body: THREE.Material,
    gapW: boolean, gapE: boolean,
  ): void {
    const L = 5.6, W = 2.4;
    for (const [west, gap] of [[true, gapW], [false, gapE]] as const) {
      const ex = west ? cx - L / 2 - 0.1 : cx + L / 2 + 0.1;
      if (!gap) {
        this.box(g, `A5_CarEnd${west ? 'W' : 'E'}${cx}`, body, ex, -2.725, 0, 0.2, 2.55, W, true);
        continue;
      }
      // side piers (z −1.2..−0.5 and 0.5..1.2) + header over the gap
      this.box(g, `A5_CarEnd${west ? 'W' : 'E'}${cx}_S`, body, ex, -2.725, -0.85, 0.2, 2.55, 0.7, true);
      this.box(g, `A5_CarEnd${west ? 'W' : 'E'}${cx}_N`, body, ex, -2.725, 0.85, 0.2, 2.55, 0.7, true);
      this.box(g, `A5_CarEnd${west ? 'W' : 'E'}${cx}_Header`, dark, ex, -1.725, 0, 0.2, 0.55, 1.0);
    }
  }

  // ------------------------------------------- 3. passage + TS headhouse ----
  private buildPassageAndHead(): void {
    const g = this.station;
    // A5 gate fix: the headhouse is AT-GRADE street furniture — living in the
    // station group (hidden whenever the player is above grade) made the
    // whole structure INVISIBLE from the plaza and from the home street (the
    // square-walk eye shot proved it: an empty gap where the house should
    // stand). It gets its own always-visible group; the exit stairs below
    // stay with the station's gate. A5_ prefix keeps it out of the bake.
    const head = this.headhouse;
    const tile = this.mat(PAL.stone);
    const dark = this.mat(PAL.manhole);
    const brick = this.mat(PAL.brick);

    // E–W leg: floor, ceiling, N wall; the S wall stops at x −69 — south of
    // that the south leg opens off (the corner x −75..−69 stays a passage)
    this.box(g, 'A5_PsgFloor', tile, -62, PLAT_TOP - 0.15, 5.0, 26, 0.3, 4.0, true);
    this.box(g, 'A5_PsgCeil', dark, -62, CEIL - 0.2, 5.0, 26, 0.2, 4.0, true);
    this.box(g, 'A5_PsgWallN', tile, -62, -2.7, 7.125, 26, 2.4, 0.25, true);
    this.box(g, 'A5_PsgWallS', tile, -59, -2.7, 2.875, 20, 2.4, 0.25, true);
    this.box(g, 'A5_PsgEndW', tile, -75.125, -2.7, 5.0, 0.25, 2.4, 4.0, true);

    // south leg: floor, ceiling, W/E walls (down to the headhouse mouth)
    this.box(g, 'A5_LegFloor', tile, -72, PLAT_TOP - 0.15, -26, 6, 0.3, 58, true);
    this.box(g, 'A5_LegCeil', dark, -72, CEIL - 0.2, -26, 6, 0.2, 58, true);
    this.box(g, 'A5_LegWallW', tile, -75.125, -2.7, -24, 0.25, 2.4, 62, true);
    this.box(g, 'A5_LegWallE', tile, -68.875, -2.7, -25.875, 0.25, 2.4, 58.25, true);

    // passage lights + three honest posters
    for (const lx of [-52, -58, -64, -70]) this.lightStrip(g, lx, 5.0, 2.6);
    for (const lz of [-6, -22, -38]) this.lightStrip(g, -72, lz, 2.6);
    this.textPlane(g, 'A5_PsgAd1', 'BACK SOON\nTHE CITY KNOWS WHEN', 2.0, 1.1, PAL.cream, PAL.ink, -68.7, -2.2, -10, -Math.PI / 2);
    this.textPlane(g, 'A5_PsgAd2', 'ON LINE\nNOT IN LINE', 2.0, 1.1, PAL.teal, PAL.cream, -68.7, -2.2, -26, -Math.PI / 2);
    this.textPlane(g, 'A5_PsgAd3', 'THE REGULARS\nARE WAITING', 2.0, 1.1, PAL.coral, PAL.cream, -74.98, -2.2, -34, Math.PI / 2);

    // the exit stair: twelve risers rising south, then the headhouse landing.
    // Side walls keep a mid-climb sidestep inside the stairwell (no void below).
    this.box(g, 'A5_ExitWallW', tile, -74.625, -1.975, -56.625, 0.25, 4.05, 3.25, true);
    this.box(g, 'A5_ExitWallE', tile, -69.375, -1.975, -56.625, 0.25, 4.05, 3.25, true);
    for (let i = 0; i < STEPS; i++) {
      const top = PLAT_TOP + (i + 1) * 0.3375;
      const h = top - (PLAT_TOP - 0.15);
      this.box(g, `A5_ExitStep${i}`, this.mat(PAL.windowDim),
        -72, top - h / 2, -55.125 - i * STEP_RUN - STEP_RUN / 2, 5.0, h, STEP_RUN, true);
    }
    // headhouse shell: the stair rises out of the passage's south end, so the
    // north side is open into the leg; walls run y −4..2.6, roof on top.
    // Everything here lives in the ALWAYS-VISIBLE headhouse group (see the
    // gate note above).
    this.box(head, 'A5_HeadFloor', tile, -72, GRADE - 0.15, -58.75, 6, 0.3, 1.0, true);
    this.box(head, 'A5_HeadWallW', brick, -75.125, -0.7, -57.125, 0.25, 6.6, 4.5, true);
    this.box(head, 'A5_HeadWallE', brick, -68.875, -0.7, -57.125, 0.25, 6.6, 4.5, true);
    this.box(head, 'A5_HeadWallS_W', brick, -74.5, -0.7, -59.125, 1.25, 6.6, 0.25, true);
    this.box(head, 'A5_HeadWallS_E', brick, -69.5, -0.7, -59.125, 1.25, 6.6, 0.25, true);
    this.box(head, 'A5_HeadWallS_Top', brick, -72, 2.4, -59.125, 3.75, 0.4, 0.25);
    this.box(head, 'A5_HeadRoof', brick, -72, 2.75, -57.125, 6.5, 0.3, 4.7, true);
    // globes + name board + wayfinding inside
    for (const gx of [-73.6, -70.4]) {
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0x9fe0d8 }));
      globe.name = 'A5_HeadGlobe';
      globe.position.set(gx, 2.35, -59.0);
      head.add(globe);
    }
    this.textPlane(head, 'A5_HeadSign', 'TIMES SQ', 3.2, 0.8, PAL.ink, PAL.gold, -72, 2.15, -59.02);
    this.textPlane(head, 'A5_HeadDir', '↑ UPTOWN LOCAL', 1.9, 0.5, PAL.teal, PAL.cream, -72, -1.0, -55.6);
  }

  // ------------------------------------------------------ 4. Times Square ---
  private buildTimesSquare(): void {
    const g = this.square;
    const walk = this.mat(PAL.walk);
    const stone = this.mat(PAL.stone);
    const road = this.mat(PAL.road);
    const ink = this.mat(PAL.ink);
    const bldg = this.mat(PAL.bldg);
    const bldg2 = this.mat(PAL.bldg2);
    const brick = this.mat(PAL.brick);
    const skyline = this.mat(PAL.skyline);

    // ground: plaza slab — split around the headhouse footprint (x −75.25..−68.75,
    // z −59.25..−55) so its interior stairwell is NOT roofed by the plaza: the
    // slab's 0.05 top sat inside the descending player's ground-snap range and
    // teleported them out of the stair. The headhouse's own roof closes the
    // hole; the bowtie band runs through the two big slabs.
    this.box(g, 'A5_TSPlazaW', walk, -79.125, GRADE - 0.15, -64, 7.75, 0.3, 30, true);
    this.box(g, 'A5_TSPlazaE', walk, -62.875, GRADE - 0.15, -64, 11.75, 0.3, 30, true);
    this.box(g, 'A5_TSPlazaS', walk, -72, GRADE - 0.15, -69.125, 6.5, 0.3, 19.75, true);
    this.box(g, 'A5_TSPlazaN', walk, -72, GRADE - 0.15, -52, 6.5, 0.3, 6, true);
    this.box(g, 'A5_TSBandN', road, -69, GRADE - 0.135, -52, 6, 0.27, 6);
    this.box(g, 'A5_TSBandS', road, -69, GRADE - 0.135, -69.125, 6, 0.27, 19.75);
    this.box(g, 'A5_TSCurbW_N', stone, -72.06, GRADE - 0.02, -52, 0.13, 0.16, 6);
    this.box(g, 'A5_TSCurbW_S', stone, -72.06, GRADE - 0.02, -69.125, 0.13, 0.16, 19.75);
    this.box(g, 'A5_TSCurbE_N', stone, -65.94, GRADE - 0.02, -52, 0.13, 0.16, 6);
    this.box(g, 'A5_TSCurbE_S', stone, -65.94, GRADE - 0.02, -69.125, 0.13, 0.16, 19.75);

    // boundary colliders + the parapets that justify them
    this.pushCollider(-70, 1, -49.6, 26, 2, 0.5);
    this.pushCollider(-70, 1, -79.4, 26, 2, 0.5);
    this.pushCollider(-83.2, 1, -64, 0.5, 2, 30);
    this.pushCollider(-56.8, 1, -64, 0.5, 2, 30);
    for (const fz of [-49.6, -79.4]) {
      this.box(g, `A5_TSParapetN${fz}`, ink, -70, GRADE + 0.45, fz, 26, 0.9, 0.3);
    }
    for (const fx of [-83.2, -56.8]) {
      this.box(g, `A5_TSParapetE${fx}`, ink, fx, GRADE + 0.45, -64, 0.3, 0.9, 30);
    }

    // towers: north row (the canyon wall), east + west rows, south row
    this.tsTower(g, -79, -52.5, 18, bldg, 6.2, 'N1');
    this.tsTower(g, -71.5, -52.5, 24, bldg2, 7.0, 'N2', false, 5.0);
    this.tsTower(g, -63, -52.5, 20, brick, 6.4, 'N3');
    this.tsTower(g, -58.9, -56, 22, bldg, 5.2, 'E1');
    this.tsTower(g, -58.9, -64, 30, bldg2, 5.2, 'E2', true);
    this.tsTower(g, -58.9, -72, 26, bldg, 5.2, 'E3');
    this.tsTower(g, -81.4, -56, 24, bldg2, 5.2, 'W1');
    this.tsTower(g, -81.4, -64, 34, bldg, 5.2, 'W2', true);
    this.tsTower(g, -81.4, -72, 28, brick, 5.2, 'W3');
    this.tsTower(g, -79.5, -77.6, 38, bldg2, 6.4, 'S1');
    this.tsTower(g, -74.5, -77.6, 44, bldg, 7.0, 'S2', true);
    this.tsTower(g, -69, -77.6, 40, bldg2, 6.4, 'S3');
    this.tsTower(g, -63.5, -77.6, 34, brick, 6.4, 'S4');
    this.tsTower(g, -59.5, -77.6, 30, bldg, 5.0, 'S5');
    // the far card plane (SKY-S grammar lives behind us; these are mid-ground)
    for (const [i, [fx, fh]] of [[-88, 52], [-78, 64], [-64, 58]].entries()) {
      this.box(g, `A5_TSFar${i}`, skyline, fx as number, (fh as number) / 2, -88, 9, fh as number, 8);
    }
    const spire = this.box(g, 'A5_TSSpire', skyline, -95, 30, -88, 3, 60, 3);
    this.box(g, 'A5_TSSpireTop', skyline, -95, 62, -88, 0.7, 6, 0.7);
    void spire;

    // billboards: the show (bold palette art, two screens animate warm).
    // A5 anti-slop fix: the first draft hung every face INSIDE its tower's
    // shaft (e.g. 'EAT' at z −50.6 vs N1's shaft face −49.83) — the whole
    // billboard layer rendered buried and the square read as bare towers.
    // Facing law: the plaza is at MORE NEGATIVE z, so the N row's plaza face
    // is its −z face (ry π — the first redo hung them on the +z faces,
    // facing the core); the S row's is its +z face (ry 0); the E row faces
    // west (−x, ry −π/2), the W row east (+x, ry π/2). Every face sits 0.06
    // proud of its own shaft face.
    this.billboard(g, -79, 11, -55.23, Math.PI, 7.5, 5.0, 'EAT', PAL.coral, PAL.cream);
    this.billboard(g, -63.4, 9, -55.31, Math.PI, 6.5, 4.5, 'THE SHOW\n8 EVERY NIGHT', PAL.teal, PAL.cream);
    this.billboard(g, -61.2, 14, -56, -Math.PI / 2, 5.5, 5.5, 'POSTCARDS\n5¢', PAL.gold, PAL.ink);
    this.billboard(g, -61.2, 20, -64, -Math.PI / 2, 5.5, 6.5, 'MUSIC\nEVERY CORNER', PAL.brick, PAL.cream);
    this.billboard(g, -61.2, 15, -72, -Math.PI / 2, 5.0, 5.0, 'READ\nTHE MAP', PAL.ink, PAL.gold);
    this.billboard(g, -79.1, 15, -56, Math.PI / 2, 5.5, 5.5, 'COFFEE\nREGULAR', PAL.teal, PAL.cream);
    this.billboard(g, -79.1, 22, -64, Math.PI / 2, 5.5, 6.0, 'TAXI!', PAL.gold, PAL.ink);
    this.billboard(g, -79.1, 17, -72, Math.PI / 2, 5.0, 5.0, 'ALDER\nHEIGHTS\n3 MI', PAL.cream, PAL.ink);
    this.billboard(g, -79.5, 24, -74.79, 0, 6.5, 5.5, 'DANCE\nLIKE NOBODY\nWAITS', PAL.coral, PAL.cream);
    this.billboard(g, -63.5, 21, -74.79, 0, 6.0, 5.0, 'THE\nREGULARS', PAL.ink, PAL.cream);
    this.billboard(g, -59.5, 18, -75.39, 0, 5.0, 4.5, 'ON LINE\nSINCE ALWAYS', PAL.gold, PAL.ink);
    // two animated screens — the "screens all turn warm" grammar
    this.screen(g, -71.5, 15, -54.71, Math.PI, 9.0, 6.5);
    this.screen(g, -74.5, 28, -74.53, 0, 9.0, 6.5);

    // the red steps (tiered south, climbable, the plaza's living room)
    const red = this.mat(PAL.brick);
    this.box(g, 'A5_TSSteps1', red, -69, GRADE + 0.175, -65.5, 10, 0.35, 1.0, true);
    this.box(g, 'A5_TSSteps2', red, -69, GRADE + 0.35, -66.5, 10, 0.7, 1.0, true);
    this.box(g, 'A5_TSSteps3', red, -69, GRADE + 0.525, -67.5, 10, 1.05, 1.0, true);
    this.box(g, 'A5_TSSteps4', red, -69, GRADE + 0.7, -68.5, 10, 1.4, 1.0, true);
    this.box(g, 'A5_TSKiosk', red, -69, GRADE + 1.05, -69.4, 7.0, 2.1, 0.5, true);
    this.textPlane(g, 'A5_TSKioskSign', 'TICKETS', 3.0, 0.7, PAL.coral, PAL.cream, -69, GRADE + 1.75, -69.14);

    // furniture: bollards, planters + trees, benches, banner poles, cabs
    for (const [bx, bz] of [[-72.8, -56], [-65.2, -56], [-72.8, -74], [-65.2, -74],
      [-74.5, -61], [-63.5, -61], [-74.5, -70], [-63.5, -70]] as const) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.9, 10), ink);
      b.name = 'A5_TSBollard';
      b.position.set(bx, GRADE + 0.45, bz);
      g.add(b);
      this.pushCollider(bx, GRADE + 0.45, bz, 0.34, 0.9, 0.34);
    }
    for (const [px, pz] of [[-76.5, -55], [-61.5, -55], [-76.5, -75], [-61.5, -75]] as const) {
      this.box(g, `A5_TSPlanter${px}_${pz}`, stone, px, GRADE + 0.3, pz, 1.4, 0.6, 1.4, true);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.6, 8), this.mat(0x6d5344));
      trunk.name = 'A5_TSTreeTrunk';
      trunk.position.set(px, GRADE + 1.4, pz);
      g.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), this.mat(0x5d7d4a));
      crown.name = 'A5_TSTreeCrown';
      crown.position.set(px, GRADE + 2.5, pz);
      g.add(crown);
    }
    for (const [bx, bz, ry] of [[-73.5, -63.5, 0], [-64.5, -63.5, 0], [-69, -72.5, Math.PI]] as const) {
      const b = makeBench(this.bank);
      b.name = 'A5_TSBench';
      b.position.set(bx, GRADE, bz);
      b.rotation.y = ry;
      g.add(b);
      this.pushCollider(bx, GRADE + 0.3, bz, 1.85, 0.7, 0.62);
    }
    for (const px of [-75.8, -62.2]) {
      this.box(g, `A5_TSPole${px}`, ink, px, GRADE + 2.6, -58, 0.14, 5.2, 0.14);
      this.box(g, `A5_TSPoleArm${px}`, ink, px, GRADE + 4.6, -58, 0.1, 0.1, 2.2);
      this.textPlane(g, `A5_TSBanner${px}`, 'TIMES\nSQ', 0.8, 1.5, PAL.gold, PAL.ink, px, GRADE + 3.9, -58);
      this.pushCollider(px, GRADE + 2.6, -58, 0.24, 5.2, 0.24);
    }
    // A5: cab 1 first sat at (−70.5, −59.5) — 1.3 m off the headhouse door,
    // where it blocked the exit's sight line and photobombed every view of
    // the stairway. Moved to the plaza's south-west edge (still on the band:
    // the band's x −75..−69 floor runs under its west wheels via TSPlazaW).
    this.tsCab(g, -73.5, -76.5);
    this.tsCab(g, -67.5, -71.5);

    // one steam plume on the band (the Rule of Steam, underground cousin)
    this.buildSteam(g, -69, GRADE, -62);

    // sparse warm office windows on the two tallest towers (NOT gold — the
    // Skyline of Lit Windows stays ONE window, the kid's; VS-F08). A5: on
    // E2/W2's −z faces (facing down the canyon toward the south plaza; the
    // first draft's x put them inside the W/E boxes)
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
      if ((r * 4 + c) % 3 !== 0) continue;
      this.box(g, `A5_TSWinW${r}${c}`, this.mat(PAL.amber, PAL.amber, 0.5),
        -83.1 + c * 1.1, 9.5 + r * 3.4, -66.29, 0.9, 0.9, 0.1);
      this.box(g, `A5_TSWinE${r}${c}`, this.mat(PAL.amber, PAL.amber, 0.5),
        -60.6 + c * 1.1, 9 + r * 3.4, -66.29, 0.9, 0.9, 0.1);
    }

    // two plaza walkers — the square is never empty
    const looks: PedLook[] = [
      { jacket: 0x4a5568, pants: 0x3b3f4a, skin: 0xe8b08e, hair: 0x6e3b2a, style: 'cap', shoe: 0x4a3428, scale: 1.02 },
      { jacket: 0x7d5a62, pants: 0x47404b, skin: 0xc98e5a, hair: 0x2b2730, style: 'bun', scale: 0.97 },
    ];
    const paths: Array<Array<[number, number]>> = [
      // around the red steps, both directions on the ring — z −63.5 keeps
      // the loop 6.4 m clear of the headhouse obstacle circle (a closer lap
      // let the steering bow the walker into the stairwell hole)
      [[-75.5, -63.5], [-62.5, -63.5], [-62.5, -73.5], [-75.5, -73.5]],
      // a north–south bowtie crossing — EAST of the headhouse hole (the
      // first draft crossed it at x −69: the walker fell into the stairwell
      // and its body wedged the player mid-descent) and west of the towers.
      // The north end stops at z −57: the first draft ran to −54.5, INSIDE
      // tower N3's footprint (z −55.7..−49.3 at x −66.2..−59.8) — the walker
      // spawned inside the tower and clipped through its face every lap.
      [[-62.6, -57], [-62.6, -63], [-62.6, -63.4], [-62.6, -76.5]],
    ];
    const obstacles = [
      { x: -72, z: -57.1, r: 4.6 },   // the headhouse + its stairwell hole
      { x: -69, z: -67.2, r: 5.6 },   // the steps block
      { x: -73.5, z: -76.5, r: 1.2 }, // cab 1
      { x: -67.5, z: -71.5, r: 1.2 }, // cab 2
      { x: -76.5, z: -55, r: 0.9 }, { x: -61.5, z: -55, r: 0.9 },
      { x: -76.5, z: -75, r: 0.9 }, { x: -61.5, z: -75, r: 0.9 },
      { x: -75.8, z: -58, r: 0.3 }, { x: -62.2, z: -58, r: 0.3 },
      // the towers (A5): the walkers' loops pass beside the north and south
      // rows — without avoidance circles the steering cut corners THROUGH
      // the tower faces (N3, S2)
      { x: -79, z: -52.5, r: 4.2 },   // N1
      { x: -71.5, z: -52.5, r: 4.4 }, // N2
      { x: -63, z: -52.5, r: 4.2 },   // N3
      { x: -79.5, z: -77.6, r: 4.2 }, // S1
      { x: -74.5, z: -77.6, r: 4.4 }, // S2
      { x: -69, z: -77.6, r: 4.2 },   // S3
      { x: -63.5, z: -77.6, r: 4.0 }, // S4
      { x: -59.5, z: -77.6, r: 3.4 }, // S5
    ];
    // The class only ever calls scene.add(group) on its first argument; the
    // square group plays that role so the walkers inherit the zone's gate.
    // Band + ground (A5): the plaza is its own zone — the block band clamped
    // these walkers to the home street's SW corner every frame and parked
    // their invisible colliders there as permanent ghosts; the plaza floor
    // sits at 0.05, not the block's 0/0.1 sidewalk split.
    this.peds = new Pedestrians(
      g as unknown as THREE.Scene, looks, (c) => this.mat(c), 20261102, paths, obstacles,
      [], { minX: -83.2, maxX: -56.8, minZ: -79.4, maxZ: -49.6 }, () => 0.05,
    );
    // their bodies join the world's collision stack (the audit's law: no ghosts)
    for (const b of this.peds.walkColliders) this.ctxColliders.push(b);
  }

  /**
   * One tower: base, shaft, setback, cap, optional water tank. dz defaults to
   * w (square footprint). N2 uses dz 5.0: its 7 m depth put the tower's south
   * face at z −56, ON TOP of the headhouse (z −59.25..−55) and the exit
   * stair's north end (walls to −55.0) — the 25 m collider turned the exit
   * into a dead end and wedged the return walk at (−72, −56.4). A 5 m slab
   * tower (south face −54.55) clears the headhouse walls by 0.33 m and
   * reads as the real thing — Times Square towers are slabs.
   */
  private tsTower(
    g: THREE.Group, cx: number, cz: number, h: number,
    mat: THREE.Material, w: number, id: string, tank = false, dz = w,
  ): void {
    this.box(g, `A5_TSTower${id}Base`, mat, cx, GRADE + h * 0.12, cz, w, h * 0.24, dz);
    this.box(g, `A5_TSTower${id}Shaft`, mat, cx, GRADE + h * 0.56, cz, w * 0.86, h * 0.88, dz * 0.86);
    if (tank) {
      this.box(g, `A5_TSTower${id}Tank`, this.mat(0x6d5344), cx, GRADE + h + 0.9, cz, 1.6, 1.8, 1.6);
      this.box(g, `A5_TSTower${id}TankLegs`, this.mat(PAL.ink), cx, GRADE + h + 0.25, cz, 1.3, 0.5, 1.3);
    } else {
      this.box(g, `A5_TSTower${id}Cap`, mat, cx, GRADE + h + 0.35, cz, w * 0.92, 0.7, dz * 0.92);
    }
    this.pushCollider(cx, GRADE + h / 2, cz, w, h + 1, dz);
  }

  /** One billboard: backing box + unlit canvas face. The back sits 0.005
   *  behind the face (no coplanar z-fight) and embeds into its tower. */
  private billboard(
    g: THREE.Group, x: number, y: number, z: number, ry: number,
    w: number, h: number, text: string, bg: number, fg: number,
  ): void {
    const back = this.box(g, 'A5_TSBillBack', this.mat(PAL.ink),
      x - Math.sin(ry) * 0.125, y, z - Math.cos(ry) * 0.125, w + 0.5, h + 0.5, 0.24);
    back.rotation.y = ry;
    this.textPlane(g, 'A5_TSBill', text, w, h, bg, fg, x, y, z, ry);
  }

  /** One animated screen — hue cycles warm in update(). */
  private screen(g: THREE.Group, x: number, y: number, z: number, ry: number, w: number, h: number): void {
    const back = this.box(g, 'A5_TSScreenBack', this.mat(PAL.ink),
      x - Math.sin(ry) * 0.155, y, z - Math.cos(ry) * 0.155, w + 0.6, h + 0.6, 0.3);
    back.rotation.y = ry;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: 0xffb85c }));
    m.name = 'A5_TSScreen';
    m.position.set(x, y, z);
    m.rotation.y = ry;
    g.add(m);
    this.screens.push(m.material as THREE.MeshBasicMaterial);
  }

  /** A parked checkered cab on the bowtie band. */
  private tsCab(g: THREE.Group, x: number, z: number): void {
    const body = this.mat(PAL.taxi);
    const dark = this.mat(PAL.manhole);
    this.box(g, 'A5_TSCabBody', body, x, GRADE + 0.75, z, 4.2, 1.1, 1.9, true);
    this.box(g, 'A5_TSCabCabin', body, x - 0.2, GRADE + 1.55, z, 2.4, 0.7, 1.8);
    this.box(g, 'A5_TSCabGlass', dark, x - 0.2, GRADE + 1.57, z, 2.2, 0.45, 1.86);
    this.box(g, 'A5_TSCabChecker', dark, x, GRADE + 0.75, z + 0.96, 4.2, 0.4, 0.03);
    this.box(g, 'A5_TSCabSign', this.mat(PAL.cream), x - 0.2, GRADE + 2.0, z, 0.8, 0.28, 0.5);
    for (const [wx, wz] of [[x - 1.4, z + 0.95], [x + 1.4, z + 0.95], [x - 1.4, z - 0.95], [x + 1.4, z - 0.95]] as const) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12), dark);
      w.name = 'A5_TSCabWheel';
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, GRADE + 0.34, wz);
      g.add(w);
    }
  }

  /** A small steam plume (the shipped one is inline in World; this one is ours). */
  private buildSteam(g: THREE.Group, x: number, y: number, z: number): void {
    const n = 10;
    const pos = new Float32Array(n * 3);
    this.steamSeed = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x + (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = y + 0.1 + Math.random() * 0.4;
      pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.5;
      this.steamSeed.push(Math.random() * Math.PI * 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: PAL.stone, size: 0.55, transparent: true, opacity: 0.5, depthWrite: false });
    this.steam = new THREE.Points(geo, mat);
    this.steam.name = 'A5_TSSteam';
    g.add(this.steam);
  }

  // --------------------------------------------------------- 5. terminal ----
  /** The Doc 02 arrival: coach at the BUS-02 bay + a dressed terminal face.
   *  No A5_ prefix — this zone is always-visible street content and bakes. */
  private buildTerminal(scene: THREE.Scene): void {
    const g = new THREE.Group();
    g.name = 'TerminalArrival';
    const body = this.mat(PAL.cream);
    const dark = this.mat(PAL.manhole);
    const teal = this.mat(PAL.teal);
    const glass = this.mat(PAL.windowDim, PAL.amber, 0.3);

    // the intercity coach — nose east, parked in the bay like the van
    const coach = new THREE.Group();
    coach.name = 'ArrivalCoach';
    coach.position.set(-30.5, 0, 3.05);
    coach.rotation.y = Math.PI;
    const add = (m: THREE.Mesh) => coach.add(m);
    const mk = (mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.name = 'CoachPart';
      m.position.set(x, y, z);
      m.castShadow = true;
      return m;
    };
    add(mk(body, 0, 1.55, 0, 11.4, 1.7, 2.55));            // body
    add(mk(body, 0, 2.62, 0, 11.0, 0.5, 2.45));           // roof
    add(mk(dark, 0.6, 2.2, 0, 9.6, 0.85, 2.58));          // window band
    add(mk(dark, 5.35, 2.1, 0, 0.7, 1.1, 2.4));           // windshield
    add(mk(teal, 0, 0.62, 0, 11.4, 0.5, 2.57));           // skirt stripe
    add(mk(this.mat(PAL.gold), 0, 1.0, 0, 11.42, 0.07, 2.59)); // trim line
    add(mk(dark, -3.6, 0.75, 0, 1.7, 0.8, 2.3));          // luggage bin
    // wheels (front axle near the windshield, rear pair aft)
    for (const [wx, wz] of [[3.6, 1.15], [3.6, -1.15], [-3.3, 1.15], [-3.3, -1.15], [-4.6, 1.15], [-4.6, -1.15]] as const) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.3, 14), dark);
      w.name = 'CoachWheel';
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, 0.52, wz);
      w.castShadow = true;
      add(w);
    }
    // door (curb side = north = +z in coach space… rotation π flips it south;
    // the bay's boarding side is the sidewalk, so door on the coach's −z)
    add(mk(teal, 4.35, 1.5, -1.2, 1.05, 1.9, 0.06));
    add(mk(glass, 4.35, 1.5, -1.24, 0.85, 1.5, 0.03));
    // destination roll over the windshield — the Doc 02 arrival, named
    const dest = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.34),
      new THREE.MeshBasicMaterial({ map: this.destTexture('NEW YORK') }));
    dest.name = 'CoachDestination';
    dest.position.set(5.35, 2.82, 0);
    dest.rotation.y = Math.PI / 2;
    add(dest);
    g.add(coach);
    scene.add(g);
    this.pushCollider(-30.5, 1.55, 3.05, 11.5, 3.1, 2.55);

    // terminal facade: warm glass doors (emissive glass = the lobby glow),
    // handles, lintel, sconces, and the M121 schedule from the registry loop
    const fg = new THREE.Group();
    fg.name = 'TerminalFacade';
    this.box(fg, 'TerminalGlassL', this.mat(PAL.windowDim, PAL.amber, 0.45), -30.9, 1.4, 7.99, 1.3, 2.7, 0.1);
    this.box(fg, 'TerminalGlassR', this.mat(PAL.windowDim, PAL.amber, 0.45), -29.1, 1.4, 7.99, 1.3, 2.7, 0.1);
    this.box(fg, 'TerminalHandleL', this.mat(PAL.ink), -30.45, 1.3, 7.9, 0.06, 0.7, 0.06);
    this.box(fg, 'TerminalHandleR', this.mat(PAL.ink), -29.55, 1.3, 7.9, 0.06, 0.7, 0.06);
    this.box(fg, 'TerminalLintel', this.mat(PAL.stone), -30, 3.05, 7.97, 3.6, 0.5, 0.2);
    for (const sx of [-31.4, -28.6]) {
      this.box(fg, 'TerminalSconce', this.mat(PAL.amber, PAL.amber, 0.7), sx, 2.9, 7.9, 0.18, 0.3, 0.12);
    }
    const sched = this.sign('M121 — GABLE · SYCAMORE · KESTREL · JUNIPER', 512, 64, PAL.ink, PAL.cream, 36);
    const schedBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.42), sched.face);
    schedBoard.name = 'TerminalSchedule';
    schedBoard.position.set(-27.2, 2.1, 7.94);
    fg.add(schedBoard);
    // luggage cart beside the coach's rear door
    this.box(fg, 'LuggageCart', this.mat(0x6d5344), -35.5, 0.35, 5.2, 0.9, 0.3, 0.6, true);
    this.box(fg, 'LuggageCase1', teal, -35.6, 0.75, 5.2, 0.55, 0.5, 0.4);
    this.box(fg, 'LuggageCase2', this.mat(PAL.brick), -35.3, 1.15, 5.2, 0.45, 0.35, 0.35);
    this.box(fg, 'LuggageHandle', this.mat(PAL.ink), -35.0, 0.75, 4.95, 0.05, 0.5, 0.05);
    scene.add(fg);
  }

  private destTexture(text: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 56;
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#1c181f';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#ffb85c';
    g.font = 'bold 40px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    return new THREE.CanvasTexture(canvas);
  }

  // ------------------------------------------------------------- update -----
  /** Called from World.updateAmbient. Gates + animations. No allocations. */
  update(dt: number, player?: { x: number; y: number; z: number }): void {
    if (!player) return;
    this.time += dt;
    this.station.visible = player.y < -0.35;
    this.square.visible = player.z < -14;

    if (this.station.visible) {
      // tunnel-light flicker: a soft sine with an occasional dropout
      for (let i = 0; i < this.flickers.length; i++) {
        const f = this.flickers[i];
        const n = Math.sin(this.time * (11 + i * 3.7) + i * 2.1);
        const drop = Math.sin(this.time * 0.7 + i * 5) > 0.995 ? 0.15 : 1;
        f.color.setRGB(1, 0.91, 0.77);
        f.color.multiplyScalar(0.75 + 0.25 * n * drop);
      }
    }
    if (this.square.visible) {
      // the screens turn warm — a slow cycle through the documented hues
      for (let i = 0; i < this.screens.length; i++) {
        const t = (this.time * 0.05 + i * 0.5) % SCREEN_HUES.length;
        const a = Math.floor(t), b = (a + 1) % SCREEN_HUES.length;
        const k = t - a;
        const h = SCREEN_HUES[a] + (SCREEN_HUES[b] - SCREEN_HUES[a]) * k;
        this.screens[i].color.setHSL(h, 0.62, 0.6);
      }
      // the steam plume rises and wobbles
      if (this.steam) {
        const attr = this.steam.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < this.steamSeed.length; i++) {
          let y = attr.getY(i) + dt * (0.55 + 0.35 * Math.sin(this.steamSeed[i]));
          let x = attr.getX(i) + Math.sin(y * 1.6 + this.steamSeed[i]) * dt * 0.15;
          if (y > GRADE + 2.6) {
            y = GRADE + 0.1;
            x = -69 + (i % 5) * 0.12 - 0.24;
          }
          attr.setY(i, y);
          attr.setX(i, x);
        }
        attr.needsUpdate = true;
      }
      this.peds?.update(dt, { x: player.x, z: player.z });
    }
  }
}
