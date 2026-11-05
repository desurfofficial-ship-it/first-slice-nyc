/**
 * The Arrival — Doc 02's opening minutes (0:00–2:00) staged live.
 *
 * A fresh boot now opens on a bus window: countryside slides by, far off
 * the skyline lights up (wonder beat #0 — the promise Times Square cashes
 * in), the driver asks the first question, the doors open on the title,
 * and you step off the coach at the terminal bay where Rosa is waving.
 * One tap advances, a SKIP chip jumps the whole thing; the machine below
 * is the complete state machine (§1c: explicit transitions, nothing
 * patched mid-frame).
 *
 * Staging law: the "ride" is a self-contained diorama parked in the empty
 * far south-west (−190, 100 — see RIDE_POS for the cone math), so the real
 * world never has to move and nothing here can leave a stray collider
 * behind.
 * The dip-to-black cut lands you at the terminal bay, where the street's
 * own world takes over (the bay holds one bus — the M121's loop — so the
 * film's coach never parks there). Every mesh this module builds lives in
 * one group and is disposed on cleanup. The window frame + seat back are
 * parented to the CAMERA (parallax-free interior) — the camera is added
 * to the scene for them and stays there, childless, after cleanup.
 *
 * Parallax law (the second draft's lesson): far things slide slow, near
 * things slide fast. The skyline never slides at all — it stands 110 m
 * out (world z −10; the lens looks down −z from z 100, so smaller z =
 * farther) and paints its own aerial perspective, so it reads as "far
 * off" and stays put while the near city glides past. The strip carries
 * countryside + city blocks at bus speed.
 *
 * The 9:16 lesson (the field report that shamed this file into a rebuild):
 * the old staging framed a 16:9 window and hung it in the void. On a phone
 * (vfov clamps at 80°) the view climbed a full bus-height above the header
 * and the player saw the whole diorama floating in the sky — cardboard
 * towers, box trees and all. So the ride now composes VERTICAL-FIRST: a
 * full bus interior shell rides the camera (ceiling, floor, walls, rails,
 * downlights) and fills any aspect the film can meet, with the world seen
 * only through the window. The skyline became two depth rows with setbacks,
 * water towers and lit crowns; the near blocks wear painted tenement
 * facades; the countryside grew gable roofs, telephone wires and smoke.
 *
 * The origami-forest lesson (the third pass over the probe stills): the
 * trees were detail-0 icosahedra — five flat facets a lump — and the far
 * woods were single squashed ones, so the treeline read as origami rocks
 * and their facets lay across the fields as dark wedges. Every canopy and
 * mound is now a smooth sphere (the street trees' own shape language,
 * props.makeTree), crowns get two shoulder spheres so silhouettes lean,
 * and every tree was re-placed against its neighbours' volumes — nothing
 * splices through a barn, a silo, a house or a tenement any more.
 *
 * The stretched-canvas lesson (the second field report, two fingers and a
 * "still shitty"): a 128 px facade stretched over a 13 m block turns every
 * window into cathedral glass. So the painted faces are now drawn to
 * EXACT size — one canvas per building, 32–48 px per world metre, the
 * window count computed from the real floors — and the architecture is
 * real geometry: cornice ledges, parapet caps, fire escapes, stoops,
 * awnings, bulkheads. The haze row stands at 130 m, behind the headline
 * towers, and every material the ride builds carries fog:false — the
 * world's amber fog (near 40, far 170) would wash a 110 m skyline into
 * soup; the painted haze does that job on purpose instead.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { updatePersonAnim, type PersonLook } from '../world/personRig';
import { Tweens, easeLinear } from '../engine/tweens';
import { PAL } from '../core/palette';
import type { UI } from '../ui/UI';

// ---------------------------------------------------------------- machine --
// Pure — unit-tested in tests/arrival.test.ts.

export type ArrivalPhase = 'off' | 'ride' | 'choice' | 'reply' | 'card' | 'handover';

/** Doc 02: three one-tap responses, all kind, none penalized. */
export const ARRIVAL_CHOICES = ['How could you tell?', 'Is it that obvious?', '...Yeah.'] as const;
export const LINE_FIRST_TIME = 'First time?';
export const LINE_DRIVER_REPLY =
  'Everybody\u2019s got a look. Like they\u2019re memorizin\u2019 it already. ' +
  'Don\u2019t worry. It\u2019ll still be there when you get off.';
/** The speaker label — per Doc 02 the driver never gets a name. */
export const SPEAKER_DRIVER = 'DRIVER';
export const SPEAKER_YOU = 'YOU';

export const RIDE_SECONDS = 10.0; // countryside → skyline lights → city → dip
export const CARD_SECONDS = 2.8;  // title hold at the terminal face
/** Minimum phase dwell before a tap may advance it (the tease needs its
 *  two seconds; the driver needs to be heard). */
const RIDE_TAP_GATE = 1.2;
const REPLY_TAP_GATE = 3.2; // you-line 1.5 s + the driver's reply to land

export class ArrivalMachine {
  phase: ArrivalPhase = 'off';
  /** Which response was picked (Space picks the shy one: "...Yeah."). */
  choice = 2;
  /** Seconds spent inside the current phase. */
  elapsed = 0;

  get active(): boolean { return this.phase !== 'off'; }

  begin(): void {
    this.phase = 'ride';
    this.choice = 2;
    this.elapsed = 0;
  }

  tick(dt: number): void {
    if (!this.active) return;
    this.elapsed += dt;
    if (this.phase === 'ride' && this.elapsed >= RIDE_SECONDS) { this.phase = 'choice'; this.elapsed = 0; }
    if (this.phase === 'card' && this.elapsed >= CARD_SECONDS) this.phase = 'handover';
  }

  /** Space / tap on the overlay. During 'choice' the shy answer is picked
   *  for you — the chips are there for the personality pick. */
  tap(): boolean {
    switch (this.phase) {
      case 'ride':
        if (this.elapsed < RIDE_TAP_GATE) return false;
        this.phase = 'choice'; this.elapsed = 0; return true;
      case 'choice':
        this.phase = 'reply'; this.elapsed = 0; return true;
      case 'reply':
        if (this.elapsed < REPLY_TAP_GATE) return false;
        this.phase = 'card'; this.elapsed = 0; return true;
      case 'card':
        this.phase = 'handover'; return true;
      default:
        return false;
    }
  }

  pick(index: number): boolean {
    if (this.phase !== 'choice') return false;
    this.choice = Math.max(0, Math.min(ARRIVAL_CHOICES.length - 1, index));
    this.phase = 'reply';
    this.elapsed = 0;
    return true;
  }

  /** SKIP — from any active phase, land at the handover. */
  skip(): boolean {
    if (!this.active) return false;
    this.phase = 'handover';
    return true;
  }

  finish(): void {
    this.phase = 'off';
    this.elapsed = 0;
  }
}

// ------------------------------------------------------------------- view --

/** The pieces of Game the cinematic touches — declared, not globalled. */
export interface ArrivalHost {
  scene: THREE.Scene;
  tweens: Tweens;
  ui: UI;
  cam: {
    camera: THREE.PerspectiveCamera;
    pose: 'follow' | 'postcard';
    camYaw: number;
    snapBehind(pos: { x: number; y: number; z: number }): void;
  };
  /** The game's postcard-rig targets — driven live while active. */
  rigPos: { x: number; y: number; z: number };
  rigLook: { x: number; y: number; z: number };
  player: { capsule: { x: number; y: number; z: number }; rotationY: number };
  playerVisual: THREE.Object3D;
  rosa: THREE.Group;
  /** The World's person builder — the ride's sleeping neighbor is the real
   *  rig (personRig sit mode), not a slab stack. */
  buildPerson(o: PersonLook): THREE.Group;
  /** Game-side handover extras (Map note, checkpoint). */
  onHandover(): void;
}

/** The ride camera: a window seat, staged at (−190, 100) — the empty far
 *  south-west, out of every sight-line the map owns. The staging law's
 *  math, both ends: (a) the west map edge sits at x ≈ −60, and the window
 *  cone's right edge reaches x = RIDE_POS.x + 0.56·depth — at −150 it
 *  grazed −68 at 146 m and the map's west row leaked in as a fog-washed
 *  sliver; at −190 the cone stays west of −94 wherever the map lives.
 *  (b) The sky shell (r 380, origin-centred) must exit the view cone
 *  INSIDE the camera's 500 far plane — the worst top-corner ray leaves
 *  the dome at ~482 m here (the first staging at z 300 clipped the sky
 *  to black by missing this). y 4.6 = seated eye height (the ground band
 *  stays in frame); the strip rides 10 m out the glass, relative to the
 *  camera's x — the second staging forgot that and slid past 150 m east
 *  of the lens. */
const RIDE_POS = { x: -190, y: 4.6, z: 100 };
const STRIP_Z = 90;
const STRIP_START_X = 20;
const STRIP_END_X = -14;
/** The bus creeps to the gate while you talk to the driver (m/s). */
const CREEP_SPEED = 0.15;
/** The skyline sits 110 m out (world z −10: the lens looks down −z from
 *  z 100, so smaller z = farther). A 24 m tower tops out ~10° above the
 *  lens — a distant dusk band with sky above it, not the 40 m cardboard
 *  wall the first field report shamed. The near strip (10–24 m) carries
 *  the close-up duty; the lowrise band (98 m) bridges the two. */
const SKYLINE_Z = -10;
/** The window aperture (half-extents at the glass) — the desktop 16:9
 *  target. The interior shell owns everything outside it. Portrait boots
 *  widen y (the aperture is a per-boot choice: the frame reads the
 *  camera's aspect when the interior is built) — the 80° portrait vfov
 *  used to spend a quarter of the phone frame on ceiling; a 0.34 aperture
 *  gives the window ~74% of the frame and leaves the shell law intact
 *  (header 0.378 + face is still well inside INTERIOR.y 0.72). */
const APERTURE = { x: 0.31, y: 0.2 };
const APERTURE_PORTRAIT_Y = 0.34;
/** The glass plane ahead of the lens (the interior hangs around it). */
const GLASS_Z = -0.55;
/** Interior coverage, worst case the film can meet: vfov 80 (the camera's
 *  clamp) by aspect 2.6 (ultrawide). tan(40°)·0.55 ≈ 0.46 up/down and
 *  tan(30°)·2.6·0.55 ≈ 1.20 sideways — a mid-film rotate or resize can
 *  never look past the shell and catch the diorama naked. */
const INTERIOR = { x: 1.4, y: 0.72 };

/** The coach at the gate — the arrival card's set, parked in the ride's
 *  staging space (300 m south of the map, empty sky around it). The nose
 *  faces +x, the way the ride travelled; the door is on the north face
 *  (the lens side), by the nose. All numbers derive from RIDE_POS so the
 *  card lens always knows where its set stands. */
const COACH = {
  cx: RIDE_POS.x,
  z: RIDE_POS.z,
  get noseX(): number { return RIDE_POS.x + 4.8; },
  get doorX(): number { return RIDE_POS.x + 3.4; },
} as const;

export class ArrivalCinematic {
  readonly machine = new ArrivalMachine();
  private host: ArrivalHost;
  private group: THREE.Group | null = null;
  private strip: THREE.Group | null = null;
  /** The card's coach set — separate from the ride group so the strip can
   *  stay standing (out of the card's frame) until the handover cleans up. */
  private coachGroup: THREE.Group | null = null;
  private doorLeaf: THREE.Mesh | null = null;
  private doorGlass: THREE.Mesh | null = null;
  private lastPhase: ArrivalPhase = 'off';
  /** The window frame rides WITH the camera — parallax-free interior. */
  private windowFrame: THREE.Group | null = null;
  /** Doc 02's sleeping neighbor (netted trucker hat): the breath is the
   *  only motion — a slow rise you barely see, driven in frame(). */
  private neighborRig: { root: THREE.Group; body: THREE.Group; head: THREE.Group; mode: string } | null = null;
  private disposables: Array<{ dispose(): void }> = [];
  /** Guards the async arrival card against a skip landing mid-fade. */
  private runId = 0;

  constructor(host: ArrivalHost) {
    this.host = host;
  }

  get active(): boolean {
    return this.machine.active;
  }

  /** Fresh boots only — Game decides (skips for autotest/probe/saves). */
  begin(): void {
    this.runId++;
    this.machine.begin();
    this.lastPhase = 'off';
    this.host.cam.pose = 'postcard'; // the rig override takes the lens
    this.buildRide();
  }

  /** Advance one tap (Space / USE / overlay). Returns true if consumed. */
  tap(): boolean {
    return this.machine.tap();
  }

  pick(index: number): void {
    if (this.machine.pick(index)) this.enterPhase();
  }

  skip(): void {
    if (this.machine.skip()) this.enterPhase();
  }

  /** Per-frame (Game.frame calls this while active): machine clock, phase
   *  transitions, and the rig targets. */
  frame(dt: number): void {
    if (!this.active) return;
    this.machine.tick(dt);
    if (this.machine.phase !== this.lastPhase) this.enterPhase();
    if (this.machine.phase === 'ride' && this.strip) {
      const t = Math.min(1, this.machine.elapsed / RIDE_SECONDS);
      this.strip.position.x = RIDE_POS.x + STRIP_START_X
        + (STRIP_END_X - STRIP_START_X) * t;
    } else if ((this.machine.phase === 'choice' || this.machine.phase === 'reply') && this.strip) {
      // the bus creeps toward the gate while you talk
      this.strip.position.x -= CREEP_SPEED * dt;
    }
    // the neighbor's breath — 1.7 s cycle, ±6 mm, the only motion she has
    if (this.neighborRig) {
      const tS = this.machine.elapsed * 1.7;
      this.neighborRig.root.position.y = -0.34 + Math.sin(tS) * 0.006;
      this.neighborRig.head.rotation.x = -0.62 + Math.sin(tS) * 0.012;
    }
  }

  /** Enter the current machine phase exactly once. */
  private enterPhase(): void {
    const p = this.machine.phase;
    this.lastPhase = p;
    switch (p) {
      case 'choice':
        this.host.ui.cineLine(SPEAKER_DRIVER, LINE_FIRST_TIME);
        this.host.ui.cineChoices([...ARRIVAL_CHOICES], (i) => this.pick(i));
        break;
      case 'reply': {
        const you = ARRIVAL_CHOICES[this.machine.choice];
        this.host.ui.cineLine(SPEAKER_YOU, you);
        this.host.tweens.sequence(
          this.host.tweens.wait(1.5),
          this.host.tweens.call(() => {
            if (this.machine.phase === 'reply') {
              this.host.ui.cineLine(SPEAKER_DRIVER, LINE_DRIVER_REPLY);
            }
          }),
        );
        break;
      }
      case 'card':
        this.host.ui.cineHideBox();
        void this.playArrivalCard();
        break;
      case 'handover':
        this.handover();
        break;
      case 'off':
      case 'ride':
      default:
        break;
    }
  }

  // ------------------------------------------------------------- the ride --

  /** The bus window: countryside slides by, the skyline lights up far off,
   *  the city blocks glide past, the bus arrives. */
  private buildRide(): void {
    const g = new THREE.Group();
    g.name = 'ArrivalRide';
    this.group = g;
    this.host.scene.add(g);
    this.host.scene.add(this.host.cam.camera); // camera children need the scene

    // the player is on the bus — their body stays off screen
    this.host.playerVisual.visible = false;

    const mats = {
      grass: this.lambert(0x6a8f5a),
      grassDark: this.lambert(0x5d7d4a),
      wood: this.lambert(0x6d5344),
      hill: this.lambert(0x7d9a6a),
      wall: this.lambert(0xd8c9a8),
      cream: this.lambert(0xe0d2b0),
      roof: this.lambert(PAL.brick),
      roofDark: this.lambert(0x5d4a3e),
      road: this.lambert(0x56505c),
      roadLine: this.lambert(0xd9c98a),
      path: this.lambert(0x9a8a72),
      gold: this.lambert(0xc9a44a),
      silo: this.lambert(0xcfc8bd),
      // canopies are smooth-shaded: flat shading on a sphere still draws
      // a facet seam per quad band — the origami look, half-size
      leafA: this.lambert(0x6f9450),
      leafB: this.lambert(0x5d7d4a),
      leafC: this.lambert(0x9aa050),
      frame: this.lambert(0x241f28),
      panel: this.lambertEmissive(0x453e4a, 0.08),
      panelDark: this.lambertEmissive(0x36303e, 0.05),
      seat: this.lambert(0x39404e),
    };
    // lit windows — the dusk story: somebody is home out there
    const winGlow = this.lambertEmissive(0xffca7a, 0.9);
    const smokeMat = new THREE.MeshLambertMaterial({ color: 0x9a9aa8, transparent: true, opacity: 0.32, fog: false });
    this.disposables.push(smokeMat);

    const box = (parent: THREE.Object3D, name: string, mat: THREE.Material,
      x: number, y: number, z: number, w: number, h: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.name = name;
      m.position.set(x, y, z);
      parent.add(m);
      this.disposables.push(m.geometry as THREE.BufferGeometry);
      return m;
    };
    const cyl = (parent: THREE.Object3D, name: string, mat: THREE.Material,
      x: number, y: number, z: number, rTop: number, rBot: number, h: number, seg = 8) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
      m.name = name;
      m.position.set(x, y, z);
      parent.add(m);
      this.disposables.push(m.geometry as THREE.BufferGeometry);
      return m;
    };
    /** A smooth canopy/hill sphere — the street trees' own shape language
     *  (props.makeTree uses SphereGeometry(1, 9, 7)): one soft dusk gradient
     *  instead of five flat facets. Everything organic uses this now. */
    const puff = (parent: THREE.Object3D, name: string, mat: THREE.Material,
      x: number, y: number, z: number, r: number, sy = 1) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat);
      m.name = name;
      m.position.set(x, y, z);
      m.scale.set(1, sy, 1);
      parent.add(m);
      this.disposables.push(m.geometry as THREE.BufferGeometry);
      return m;
    };

    // --- the sliding strip: the near world at bus speed --------------------
    // Everything rides RELATIVE to the camera's x (see the staging note).
    const strip = new THREE.Group();
    strip.name = 'RideStrip';
    strip.position.set(RIDE_POS.x + STRIP_START_X, 0, STRIP_Z);
    this.strip = strip;
    g.add(strip);

    // the far ground — one wide dusk-meadow slab under EVERYTHING from the
    // strip's far edge out past the skyline. The old staging let naked sky
    // show between the countryside and the city floor; this plane is the
    // floor no seam can open in (and it rides in the GROUP: far things
    // don't slide). Its top face sits y −0.01, under the strip's grass and
    // the city apron both. The mounds give the horizon a pulse.
    box(g, 'RideFarGround', this.lambert(0x5a6b4d), RIDE_POS.x, -0.16, 20, 200, 0.3, 200);
    const farMoundMat = this.lambert(0x4a5f44);
    puff(g, 'RideFarMoundA', farMoundMat, RIDE_POS.x - 34, 0.85, 46, 9, 0.18);
    puff(g, 'RideFarMoundB', farMoundMat, RIDE_POS.x + 20, 0.75, 52, 8, 0.16);
    puff(g, 'RideFarMoundC', farMoundMat, RIDE_POS.x - 6, 0.65, 60, 11, 0.13);

    // ground ribbon — deep enough to stay under the window the whole ride
    // and reach back toward the skyline's feet. The mowing stripes and road
    // dashes glide past: a cheap, honest speed cue (the old ribbon was one
    // flat slab of green that read as a painted backdrop).
    box(strip, 'RideGround', mats.grass, 0, -0.2, -5, 44, 0.4, 18);
    for (let i = 0; i < 4; i++) {
      box(strip, `RideStripe${i}`, mats.grassDark, 0, 0.012, -2.2 - i * 2.2, 44, 0.02, 1.3);
    }
    box(strip, 'RideRoad', mats.road, 0, 0.02, 3.2, 44, 0.06, 2.4);
    for (let i = 0; i < 5; i++) {
      box(strip, `RideRoadDash${i}`, mats.roadLine, -13 + i * 6.5, 0.056, 3.2, 1.5, 0.012, 0.13);
    }
    box(strip, 'RidePath', mats.path, 3.5, 0.014, 1.4, 1.1, 0.02, 3.4);

    // fence line on the near shoulder — two rails now, it was one floating
    for (let i = 0; i < 10; i++) {
      box(strip, `RideFencePost${i}`, mats.wood, -12 + i * 2.1, 0.55, 2.7, 0.12, 1.1, 0.12);
    }
    box(strip, 'RideFenceRailA', mats.wood, -2.5, 0.9, 2.7, 19, 0.09, 0.09);
    box(strip, 'RideFenceRailB', mats.wood, -2.5, 0.5, 2.7, 19, 0.09, 0.09);

    // trees — the street's own silhouette language (props.makeTree):
    // tapered trunk into a root flare, one crown + two shoulder spheres,
    // smooth-shaded so the dusk rolls across the canopy instead of
    // facet-jumping (the detail-0 icosahedra read as origami rocks).
    // Every x/z below is placed against its neighbours' volumes — the old
    // row had a trunk inside the farmhouse and canopies splicing the barn
    // and the first tenement.
    const tree = (x: number, z: number, s: number, leaf: THREE.Material) => {
      cyl(strip, 'RideTreeTrunk', mats.wood, x, 0.5 * s, z, 0.05 * s, 0.1 * s, 1.0 * s, 6);
      const flare = new THREE.Mesh(new THREE.ConeGeometry(0.24 * s, 0.22 * s, 8), mats.wood);
      flare.name = 'RideTreeFlare';
      flare.position.set(x, 0.11 * s, z);
      strip.add(flare);
      this.disposables.push(flare.geometry as THREE.BufferGeometry);
      puff(strip, 'RideTreeCrown', leaf, x, 1.32 * s, z, 0.58 * s, 0.92);
      puff(strip, 'RideTreeShoulderA', leaf, x + 0.36 * s, 1.02 * s, z + 0.1 * s, 0.38 * s, 0.9);
      puff(strip, 'RideTreeShoulderB', leaf, x - 0.34 * s, 1.12 * s, z - 0.12 * s, 0.34 * s, 0.9);
    };
    tree(-16.8, -1.5, 1.05, mats.leafB);  // west of the barn (was inside its wall)
    tree(-10.35, -0.5, 0.7, mats.leafC);  // between silo and house, clear of both
    tree(-6.2, -1.5, 1.2, mats.leafA);
    tree(-1.5, -1.0, 0.95, mats.leafB);
    tree(2.9, -1.3, 1.0, mats.leafC);     // east of the farmhouse (was inside it)
    tree(6.8, -1.2, 0.9, mats.leafA);
    tree(9.5, -0.9, 1.0, mats.leafB);     // north of the tenement fronts
    tree(12.3, -0.9, 0.8, mats.leafC);

    // the farm cluster — gable roofs (a real prism, not a 4-sided cone),
    // lit windows in pale frames, a stone foundation, chimney smoke; this
    // is what "someone lives out here" looks like through the glass at
    // golden hour
    const trimMat = this.lambert(0xe6dcc4);
    const stoneMat = this.lambert(0x8a8178);
    const house = (x: number, z: number, w: number, h: number, d: number,
      wall: THREE.Material, roof: THREE.Material, wins: Array<[number, number]>,
      porch = false) => {
      box(strip, 'RideHouseBody', wall, x, h / 2, z, w, h, d);
      box(strip, 'RideHouseBase', stoneMat, x, 0.16, z, w + 0.1, 0.32, d + 0.1);
      const roofM = this.gableRoof(w + 0.35, h * 0.55, d + 0.35, roof);
      roofM.name = 'RideHouseRoof';
      roofM.position.set(x, h, z);
      strip.add(roofM);
      box(strip, 'RideHouseChimney', wall, x + w * 0.28, h + h * 0.42, z - d * 0.2, 0.22, 0.7, 0.22);
      box(strip, 'RideHouseChimneyCap', mats.roofDark, x + w * 0.28, h + h * 0.42 + 0.38, z - d * 0.2, 0.3, 0.08, 0.3);
      for (const [wx, wy] of wins) {
        box(strip, 'RideHouseWindowFrame', trimMat, x + wx, wy, z + d / 2 + 0.03, 0.36, 0.5, 0.04);
        box(strip, 'RideHouseWindow', winGlow, x + wx, wy, z + d / 2 + 0.055, 0.27, 0.4, 0.03);
      }
      box(strip, 'RideHouseDoorFrame', trimMat, x, h * 0.26, z + d / 2 + 0.03, 0.62, h * 0.52, 0.04);
      box(strip, 'RideHouseDoor', mats.frame, x, h * 0.24, z + d / 2 + 0.055, 0.5, h * 0.48, 0.04);
      if (porch) {
        // a stoop roof on two posts — the farmhouse's handshake
        box(strip, 'RideHousePorchRoof', mats.roofDark, x, h * 0.78, z + d / 2 + 0.42, w * 0.6, 0.07, 0.85);
        box(strip, 'RideHousePorchPostA', trimMat, x - w * 0.26, h * 0.39, z + d / 2 + 0.72, 0.09, h * 0.78, 0.09);
        box(strip, 'RideHousePorchPostB', trimMat, x + w * 0.26, h * 0.39, z + d / 2 + 0.72, 0.09, h * 0.78, 0.09);
        box(strip, 'RideHousePorchStep', stoneMat, x, 0.08, z + d / 2 + 0.5, 1.2, 0.16, 0.5);
      }
      // smoke: two settled puffs (no tween — the film is 10 s, the chimney
      // is 8 m out, stillness reads as distance)
      puff(strip, 'RideSmokeA', smokeMat, x + w * 0.28 + 0.12, h + h * 0.42 + 0.5, z - d * 0.2, 0.16, 1.4);
      puff(strip, 'RideSmokeB', smokeMat, x + w * 0.28 + 0.3, h + h * 0.42 + 0.9, z - d * 0.2, 0.23, 1.5);
    };
    house(-8.5, -2.4, 2.6, 2.0, 2.2, mats.wall, mats.roof, [[-0.6, 1.25], [0.6, 1.25]]);
    house(0.4, -2.6, 3.0, 2.8, 2.4, mats.cream, mats.roof, [[-0.95, 2.0], [0, 2.0], [0.95, 2.0], [-0.5, 0.95], [0.5, 0.95]], true);

    // the barn + silo — the farm reads as a FARM, not a toy house:
    // white door trim with the X-brace, a hayloft, a capped silo
    const barnTrim = this.lambert(0xe6dcc4);
    box(strip, 'RideBarnBody', this.lambert(PAL.brick), -12.2, 1.1, -2.6, 3.0, 2.2, 2.6);
    const barnRoof = this.gableRoof(3.35, 1.3, 2.9, mats.roofDark);
    barnRoof.name = 'RideBarnRoof';
    barnRoof.position.set(-12.2, 2.2, -2.6);
    strip.add(barnRoof);
    box(strip, 'RideBarnDoor', barnTrim, -12.2, 0.55, -1.27, 0.86, 1.26, 0.05);
    box(strip, 'RideBarnDoorLeaf', mats.roofDark, -12.2, 0.55, -1.245, 0.7, 1.1, 0.04);
    const braceA = box(strip, 'RideBarnBraceA', barnTrim, -12.2, 0.55, -1.225, 0.82, 0.07, 0.03);
    braceA.rotation.z = 0.72;
    const braceB = box(strip, 'RideBarnBraceB', barnTrim, -12.2, 0.55, -1.225, 0.82, 0.07, 0.03);
    braceB.rotation.z = -0.72;
    box(strip, 'RideBarnLoft', barnTrim, -12.2, 1.72, -1.27, 0.5, 0.4, 0.05);
    box(strip, 'RideBarnCornerA', barnTrim, -13.68, 1.1, -1.32, 0.14, 2.2, 0.14);
    box(strip, 'RideBarnCornerB', barnTrim, -10.72, 1.1, -1.32, 0.14, 2.2, 0.14);
    cyl(strip, 'RideSilo', mats.silo, -10.2, 1.6, -2.9, 0.7, 0.7, 3.2, 10);
    const siloCap = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), mats.silo);
    siloCap.name = 'RideSiloCap';
    siloCap.position.set(-10.2, 3.2, -2.9);
    strip.add(siloCap);
    this.disposables.push(siloCap.geometry as THREE.BufferGeometry);
    const bale = (x: number, z: number) => {
      const b = cyl(strip, 'RideHayBale', mats.gold, x, 0.5, z, 0.5, 0.5, 0.9, 10);
      b.rotation.z = Math.PI / 2; // lying on its side, the way bales lie
    };
    bale(-11.0, 1.1);
    bale(-11.9, 0.3);

    // telephone poles with sagging wires — the countryside's own rhythm
    // line, and the cheapest "distance" cue there is; the line runs on
    // INTO the city (poles among the tenements, the way it really goes)
    const poleXs = [-11, -5.5, 0, 5.5, 11, 16];
    for (const px of poleXs) {
      cyl(strip, 'RidePole', mats.frame, px, 2.2, 1.6, 0.06, 0.09, 4.4, 6);
      box(strip, 'RidePoleArm', mats.frame, px, 4.05, 1.6, 0.95, 0.07, 0.07);
    }
    const wireMat = new THREE.LineBasicMaterial({ color: 0x241f28, fog: false });
    this.disposables.push(wireMat);
    for (let i = 0; i < poleXs.length - 1; i++) {
      for (const wz of [1.38, 1.82]) {
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 4; k++) {
          const t = k / 4;
          pts.push(new THREE.Vector3(
            poleXs[i] + (poleXs[i + 1] - poleXs[i]) * t,
            4.02 - 0.38 * Math.sin(Math.PI * t),
            wz,
          ));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        strip.add(new THREE.Line(geo, wireMat));
        this.disposables.push(geo);
      }
    }

    // the far seam of the countryside — two depth rows of smooth crowns,
    // each with a lower shoulder sphere so the treeline leans and undulates
    // instead of sitting as one row of equal lumps (and no facets: the old
    // squashed icosahedra threw their edges across the fields as dark
    // wedges — the streaks the field report caught)
    const woodA = this.lambert(0x42573e);
    const woodA2 = this.lambert(0x4a5f44);
    const woodB = this.lambert(0x3a5138);
    const woodB2 = this.lambert(0x42573e);
    for (let i = 0; i < 12; i++) {
      const x = -20 + i * 3.6 + ((i * 53) % 17) / 10;
      const z = -7.4 - ((i * 31) % 10) / 10;
      const r = 1.1 + ((i * 29) % 13) / 12; // 1.1 … 2.1
      puff(strip, 'RideWoodA', woodA, x, 1.0, z, r, 0.8);
      puff(strip, 'RideWoodA2', woodA2, x + r * 0.45, 0.62, z + r * 0.3, r * 0.62, 0.85);
    }
    for (let i = 0; i < 9; i++) {
      const x = -19 + i * 4.6 + ((i * 41) % 19) / 10;
      const z = -10.6 - ((i * 13) % 10) / 10;
      const r = 1.4 + ((i * 23) % 15) / 12; // 1.4 … 2.6
      puff(strip, 'RideWoodB', woodB, x, 1.05, z, r, 0.85);
      puff(strip, 'RideWoodB2', woodB2, x - r * 0.4, 0.6, z + r * 0.25, r * 0.58, 0.9);
    }
    puff(strip, 'RideMoundA', mats.hill, -8, 1.25 - 6 * 0.24, -12, 6, 0.24);
    puff(strip, 'RideMoundB', mats.hill, 4, 1.25 - 7 * 0.24, -13, 7, 0.24);
    puff(strip, 'RideMoundC', mats.hill, 13, 1.25 - 5 * 0.24, -12.5, 5, 0.24);

    // the city rolls in ahead — blocks enter the window late in the ride
    // (the last block stopped at the dialogue freeze as a blank wall that
    // filled the window's right third — the last, tallest face now owns
    // that third, detailed enough to be worth staring at).
    //
    // The builder: exact-fit painted face + brick returns + cornice ledge +
    // parapet cap + 3D fire escape + awning + roof clutter. Every window a
    // window; every roofline a silhouette.
    const corniceMat = this.lambert(0x38313e);
    const capMat = this.lambert(0x2f2a36);
    const ironMat = this.lambert(0x2b2630);
    const awnMats = [this.lambertFlat(0x2a9d8f), this.lambertFlat(0xb23a48)];
    const stoopMat = this.lambert(0x9a94a0);
    const brickSideMat = (v: number, wM: number, hM: number): THREE.MeshLambertMaterial => {
      const t = this.brickTexture(v).clone();
      t.needsUpdate = true;
      t.repeat.set(Math.max(1, Math.round(wM / 1.4)), Math.max(1, Math.round(hM / 1.4)));
      const m = new THREE.MeshLambertMaterial({ map: t, fog: false });
      this.disposables.push(t, m);
      return m;
    };
    const tenement = (
      x: number, z: number, w: number, h: number, depth: number, v: number,
      seed: number,
      o: {
        storefront?: boolean; door?: boolean; stoop?: boolean; parapet?: number;
        floors?: number; fire?: boolean; water?: boolean; antenna?: boolean;
        awning?: boolean; bulk?: boolean; ppm?: number;
      } = {},
    ): void => {
      const { map, glow } = this.tenementFace(w, h, v, seed, {
        storefront: !!o.storefront, door: !!o.door, parapet: o.parapet,
        floors: o.floors, ppm: o.ppm,
      });
      const face = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        map,
        emissive: 0xffffff,
        emissiveMap: glow,
        emissiveIntensity: 0.5,
        fog: false,
      });
      this.disposables.push(map, glow, face);
      const side = brickSideMat(v, depth, h);
      const geo = new THREE.BoxGeometry(w, h, depth);
      const mesh = new THREE.Mesh(geo, [side, side, capMat, capMat, face, side]);
      mesh.name = 'RideTenement';
      mesh.position.set(x, h / 2, z);
      strip.add(mesh);
      this.disposables.push(geo);
      // the roofline: a cornice that throws a shadow + the cap above it
      box(strip, 'RideCornice', corniceMat, x, h - 0.2, z, w + 0.26, 0.16, depth + 0.26);
      box(strip, 'RideCap', capMat, x, h + 0.04, z, w + 0.08, 0.12, depth + 0.08);
      if (o.bulk) {
        box(strip, 'RideBulkhead', brickSideMat(v, 1.2, 0.9), x - w * 0.22, h + 0.45, z + depth * 0.1, 1.0, 0.7, depth * 0.45);
      }
      if (o.water) this.waterTank(strip, x + w * 0.24, h, z + 0.25);
      if (o.antenna) {
        cyl(strip, 'RideAntennaMast', ironMat, x + w * 0.3, h + 1.35, z - depth * 0.15, 0.025, 0.04, 2.3, 5);
        box(strip, 'RideAntennaBar', ironMat, x + w * 0.3, h + 1.9, z - depth * 0.15, 0.8, 0.035, 0.035);
        box(strip, 'RideAntennaBar', ironMat, x + w * 0.3, h + 1.55, z - depth * 0.15, 0.6, 0.035, 0.035);
      }
      if (o.awning && o.storefront) {
        const aw = box(strip, 'RideAwning', awnMats[v % 2], x - w * 0.16, 2.72, z + depth / 2 + 0.3, w * 0.52, 0.06, 0.72);
        // +0.62: Rx drops the front edge (0,0,1)→(0,−sin,cos) — an awning
        // slopes DOWN out of the wall. The old −0.62 ramped it up like a
        // ski jump, back edge floating off the brick.
        aw.rotation.x = 0.62;
      }
      if (o.stoop) {
        // three stone steps down to the sidewalk, iron rails to hold
        const sz = z + depth / 2;
        for (let s = 0; s < 3; s++) {
          const hh = 0.42 - s * 0.14;
          box(strip, 'RideStoopStep', stoopMat, x, hh / 2, sz + 0.16 + s * 0.25, 1.05, hh, 0.27);
        }
        box(strip, 'RideStoopRailA', ironMat, x - 0.52, 0.55, sz + 0.45, 0.04, 0.85, 0.04);
        box(strip, 'RideStoopRailB', ironMat, x + 0.52, 0.55, sz + 0.45, 0.04, 0.85, 0.04);
        box(strip, 'RideStoopRailTop', ironMat, x, 0.95, sz + 0.45, 1.06, 0.035, 0.035);
      }
      if (o.fire) {
        // a real zigzag, merged to ONE mesh per building — the previous
        // pass fixed the stair length but the terminal zoom still caught
        // three tells: rails floated with nothing holding them, a lone
        // stringer ran through the treads like a stick, and five treads
        // over a 2.9 m rise was a ship ladder. Now: posts carry the
        // rails, a stringer PAIR frames each flight, nine treads land on
        // the stringer line (steep, like the real ones), a wall arm +
        // diagonal brace triangle carries every platform, and a sidewalk
        // ladder climbs to the bottom deck. All of it one draw call.
        const parts: THREE.BufferGeometry[] = [];
        const part = (gx: number, gy: number, gz: number,
          gw: number, gh: number, gd: number, rz = 0, rx = 0): void => {
          const geo = new THREE.BoxGeometry(gw, gh, gd);
          if (rz) geo.rotateZ(rz);
          if (rx) geo.rotateX(rx);
          geo.translate(gx, gy, gz);
          parts.push(geo);
        };
        const floors = Math.max(1, Math.floor((h - 3.5) / 2.9));
        const bx = x + w * 0.26;
        const wallZ = z + depth / 2;
        const fz = wallZ + 0.2;
        const run = 1.0; // platform edge to platform edge (half-width 0.525)
        const rise = 2.9;
        const sLen = Math.hypot(run, rise);
        const sAng = Math.atan2(rise, run);
        for (let f = 0; f <= floors; f++) {
          // the bottom deck sits just ABOVE the sign band (3.5 m grade,
          // fascia to 3.36) — the escape never crosses the shop's letters,
          // the way a real one starts at the second floor over a store
          const py = 3.55 + f * 2.9;
          if (py > h - 1) break;
          part(bx, py, fz, 1.05, 0.05, 0.34); // the deck
          // rails ride on posts — no more floating dashes
          for (const ex of [-0.5, 0.5]) {
            part(bx + ex, py + 0.28, fz + 0.15, 0.035, 0.56, 0.035);
          }
          part(bx, py + 0.54, fz + 0.15, 1.05, 0.04, 0.04);
          part(bx, py + 0.3, fz + 0.15, 1.05, 0.03, 0.03);
          // the bracket triangle: a wall arm out to the deck edge plus a
          // diagonal up to its tip — how a real escape hangs off brick
          for (const ex of [-0.38, 0.38]) {
            part(bx + ex, py - 0.07, wallZ + 0.2, 0.04, 0.04, 0.36);
            const bDy = 0.27; const bDz = 0.3;
            part(bx + ex, py - 0.07 - bDy / 2, wallZ + 0.02 + bDz / 2,
              0.04, Math.hypot(bDy, bDz), 0.04, 0, -Math.atan2(bDz, bDy));
          }
          if (f < floors) {
            const dir = f % 2 === 0 ? 1 : -1; // the zigzag
            for (const sz of [fz - 0.1, fz + 0.1]) { // the stringer pair
              part(bx, py + rise / 2, sz, sLen, 0.05, 0.06, dir * sAng);
            }
            for (let s = 0; s < 9; s++) {
              const t = (s + 0.5) / 9;
              part(bx + dir * (t - 0.5) * run, py + rise * t, fz, 0.26, 0.03, 0.24);
            }
          }
        }
        const ironGeo = mergeGeometries(parts, false);
        for (const p of parts) p.dispose();
        const iron = new THREE.Mesh(ironGeo, ironMat);
        iron.name = 'RideFireEscape';
        strip.add(iron);
        this.disposables.push(ironGeo);
      }
    };

    // stoop row — the outer boroughs saying goodbye to the fields
    tenement(3.0, -2.9, 2.4, 6.4, 2.2, 1, 11, { parapet: 0.8, stoop: true, door: true, floors: 2 });
    tenement(4.7, -3.1, 2.8, 7.0, 2.4, 0, 23, { parapet: 0.8, stoop: true, door: true, floors: 2, bulk: true });
    tenement(6.4, -3.0, 2.3, 6.2, 2.2, 2, 37, { parapet: 0.8, stoop: true, door: true, floors: 2 });
    // the tenements proper — taller as midtown nears, each its own face
    tenement(8.8, -3.1, 3.0, 9.0, 2.8, 0, 51, { storefront: true, awning: true, fire: true });
    tenement(11.3, -3.4, 3.2, 13.0, 3.0, 1, 67, { storefront: true, water: true, fire: true, bulk: true });
    tenement(13.9, -3.1, 3.0, 11.0, 2.8, 2, 83, { storefront: true, awning: true, bulk: true });
    tenement(16.5, -3.5, 3.4, 15.0, 3.2, 0, 97, { storefront: true, water: true, antenna: true, fire: true, ppm: 48 });

    // the city's own pavement — concrete replaces grass for the last stretch
    box(strip, 'RideSidewalk', this.lambert(0x8f8994), 9.7, 0.045, 0.3, 16, 0.05, 4.0);
    box(strip, 'RideCurb', this.lambert(0xa8a2ac), 9.7, 0.075, 2.2, 16, 0.09, 0.16);
    // street furniture the window can count: two lamps and a hydrant
    const lampPost = (x: number) => {
      cyl(strip, 'RideLampPole', mats.frame, x, 2.15, 1.85, 0.045, 0.07, 4.3, 6);
      box(strip, 'RideLampArm', mats.frame, x, 4.22, 1.85, 0.72, 0.06, 0.06);
      box(strip, 'RideLampHead', this.lambertEmissive(0xffe0b0, 0.85), x - 0.3, 4.14, 1.85, 0.3, 0.09, 0.16);
    };
    lampPost(9.9);
    lampPost(16.4);
    cyl(strip, 'RideHydrant', this.lambert(PAL.coral), 12.7, 0.26, 1.7, 0.09, 0.11, 0.42, 8);
    cyl(strip, 'RideHydrantCap', this.lambert(PAL.coral), 12.7, 0.5, 1.7, 0.07, 0.09, 0.08, 8);

    // --- the skyline: STATIC (far off = no parallax), lights up at ~4 s ---
    // World space, added to the GROUP (never to the strip): 110 m out, the
    // towers read as a distant dusk band and hold still while the near
    // world glides past.
    // Windows are BAKED into the towers' textures — the light-up beat tweens
    // the row materials' emissiveIntensity and the whole skyline wakes.
    const skyline = new THREE.Group();
    skyline.name = 'RideSkyline';
    skyline.position.set(RIDE_POS.x, 0, SKYLINE_Z);
    g.add(skyline);

    // the city's floor — a dusk asphalt apron so the skyline rises from a
    // city instead of the amber haze. Wide and deep enough to own the
    // ground from 86 m out to the far row's feet (the far plane beneath
    // shows only beyond its edges).
    box(skyline, 'RideCityApron', this.lambert(0x4a4552), 0, -0.12, -6, 130, 0.3, 60);

    // far row — the hazier silhouette 20 m behind the headliners (130 m
    // out): depth without a fog cheat (it stands further back, haze-mixed
    // toward the sky, and lights up dimmer). Each face exact-fit.
    const farMats: THREE.MeshLambertMaterial[] = [];
    const farTowers: Array<[number, number, number]> = [
      [-14, 14, 2.6], [-11, 18, 2.4], [-8.4, 12, 2.8], [-5.6, 20, 2.4], [-2.6, 15, 2.6],
      [0.4, 22, 2.4], [3.4, 13, 2.8], [6.2, 19, 2.4], [9.2, 15, 2.6], [12.4, 21, 2.4],
    ];
    for (const [x, h, w] of farTowers) {
      const { map, glow } = this.towerFace(w, h, (Math.round(x * 10) + 200) % 3, x * 13 + 5, true);
      const m = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        map,
        emissive: 0xffffff,
        emissiveMap: glow,
        emissiveIntensity: 0.08,
        fog: false,
      });
      this.disposables.push(map, glow, m);
      farMats.push(m);
      box(skyline, 'RideTowerFar', m, x, h / 2, -20, w, h, 2.0);
    }

    // near row — the silhouettes the trip is named for: setbacks, a spire
    // with its beacon, a lit crown. The 1-Second Law, out a bus window.
    // Every tier gets its own exact-fit face: no stretched towers.
    const tierMats: THREE.MeshLambertMaterial[] = [];
    const crownMat = this.lambertEmissive(0xffb85c, 0.25);
    const beaconMat = new THREE.MeshBasicMaterial({ color: PAL.coral, fog: false });
    const bulkMat = this.lambert(0x4f4758);
    this.disposables.push(beaconMat);
    const towerDefs: Array<{
      x: number; w: number; tiers: Array<[number, number]>; v: number;
      spire?: number; antenna?: boolean; water?: boolean; crown?: boolean;
    }> = [
      { x: -12, w: 3.2, tiers: [[3.2, 13], [2.5, 7], [1.8, 6]], v: 0, spire: 4.5 },
      { x: -7.6, w: 3.4, tiers: [[3.4, 21]], v: 1, water: true },
      { x: -3.4, w: 2.8, tiers: [[2.8, 15], [2.2, 7]], v: 2, antenna: true },
      { x: 1.2, w: 3.2, tiers: [[3.2, 24]], v: 0, crown: true, water: true },
      { x: 5.4, w: 3.0, tiers: [[3.0, 17], [2.4, 5]], v: 1 },
      { x: 9.6, w: 2.6, tiers: [[2.6, 20]], v: 2, antenna: true, water: true },
      { x: 13.2, w: 3.4, tiers: [[3.4, 12], [2.7, 6], [2.0, 4]], v: 0, spire: 2.5 },
    ];
    for (const t of towerDefs) {
      let top = 0;
      let tw = t.w;
      t.tiers.forEach(([w, h], i) => {
        const { map, glow } = this.towerFace(w, h, t.v, 31 + t.x * 7 + i * 17, false);
        const m = new THREE.MeshLambertMaterial({
          color: 0xffffff,
          map,
          emissive: 0xffffff,
          emissiveMap: glow, // black body, amber windows — only windows glow
          emissiveIntensity: 0.15, // dusk-dark until the city lights come on
          fog: false,
        });
        this.disposables.push(map, glow, m);
        tierMats.push(m);
        box(skyline, `RideTower${t.x}_${i}`, m, t.x, top + h / 2, 0, w, h, 2.4);
        top += h;
        tw = w;
      });
      // a cornice ledge under every roofline, even out here
      box(skyline, 'RideTowerCornice', bulkMat, t.x, top - 0.16, 0, tw + 0.18, 0.13, 2.56);
      box(skyline, 'RideTowerBulk', bulkMat, t.x, top + 0.28, 0, tw * 0.42, 0.56, 1.4);
      if (t.water) this.waterTank(skyline, t.x + tw * 0.24, top, 0.35);
      if (t.crown) box(skyline, 'RideTowerCrown', crownMat, t.x, top + 0.5, 0, tw + 0.12, 1.0, 2.5);
      if (t.spire) {
        cyl(skyline, 'RideTowerSpire', bulkMat, t.x, top + t.spire / 2, 0, 0.05, 0.13, t.spire, 6);
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), beaconMat);
        beacon.name = 'RideTowerBeacon';
        beacon.position.set(t.x, top + t.spire + 0.06, 0);
        skyline.add(beacon);
        this.disposables.push(beacon.geometry as THREE.BufferGeometry);
      }
      if (t.antenna) {
        cyl(skyline, 'RideTowerMast', bulkMat, t.x, top + 1.2, 0, 0.035, 0.05, 2.4, 5);
        const beacon2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), beaconMat);
        beacon2.name = 'RideTowerBeacon';
        beacon2.position.set(t.x, top + 2.42, 0);
        skyline.add(beacon2);
        this.disposables.push(beacon2.geometry as THREE.BufferGeometry);
      }
    }

    // street-level fabric — a low brick band IN FRONT of the towers (98 m
    // out, 12 m this side of them), so the skyline sits IN a city instead
    // of floating over one. Mini-tenements, exact-fit faces, alternate
    // storefronts; the strip's tenements carry the close-up duty, these
    // carry the middle distance — a lit shopfront strip at the horizon.
    const lowZ = 12;
    for (let i = 0; i < 20; i++) {
      const x = -46 + i * 4.85;
      const h = 5.0 + ((i * 37) % 23) / 10; // 5.0 … 7.2, deterministic
      const w = 3.4;
      const { map, glow } = this.tenementFace(w, h, i % 3, i * 29 + 3, {
        storefront: i % 2 === 0, floors: 2, parapet: 0.5, ppm: 28,
      });
      const face = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        map,
        emissive: 0xffffff,
        emissiveMap: glow,
        emissiveIntensity: 0.55,
        fog: false,
      });
      this.disposables.push(map, glow, face);
      const side = brickSideMat(i % 3, 2.0, h);
      const geo = new THREE.BoxGeometry(w, h, 2.0);
      const low = new THREE.Mesh(geo, [side, side, capMat, capMat, face, side]);
      low.name = 'RideLowrise';
      low.position.set(x, h / 2, lowZ);
      skyline.add(low);
      this.disposables.push(geo);
      box(skyline, 'RideLowriseCornice', corniceMat, x, h - 0.14, lowZ, w + 0.18, 0.12, 2.18);
      if (i % 3 === 0) box(skyline, 'RideLowriseCap', capMat, x, h + 0.1, lowZ, w + 0.06, 0.2, 2.06);
      if (i % 4 === 1) this.waterTank(skyline, x + 0.5, h, lowZ + 0.2);
    }

    // the light-up: the beat stays (3.6 s wait, 2.4 s rise) — the far row
    // trails the near one and the crown blooms last, the way real dusk lands
    this.host.tweens.sequence(
      this.host.tweens.wait(3.6),
      this.host.tweens.num(
        () => tierMats[0].emissiveIntensity,
        (v) => {
          for (const m of tierMats) m.emissiveIntensity = v;
          for (const m of farMats) m.emissiveIntensity = 0.08 + Math.max(0, v - 0.15) * 0.6;
          crownMat.emissiveIntensity = 0.25 + Math.max(0, v - 0.15) * 1.1;
        },
        1.15, 2.4,
      ),
    );

    // --- atmosphere: one low sun, dusk clouds, birds heading home ---------
    const glowTex = this.glowTexture();
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34),
      new THREE.MeshBasicMaterial({
        map: glowTex, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }),
    );
    glow.name = 'RideSunGlow';
    glow.position.set(-6, 2.8, -40); // 150 m out, behind the far row — towers silhouette against it
    skyline.add(glow);
    this.disposables.push(glowTex, glow.geometry as THREE.BufferGeometry);

    const cloudTex = this.cloudTexture();
    const cloudSpecs: Array<[number, number, number, number, number]> = [
      // x, y, z(skyline-local; − = farther), width, opacity — all BEHIND
      // the towers, 138–165 m out. The old specs sat at 26 m: two giant
      // white smears parked on the lens.
      [-38, 24, -28, 22, 0.75], [8, 30, -44, 26, 0.65],
      [30, 20, -30, 24, 0.75], [-12, 34, -52, 30, 0.5], [46, 27, -38, 20, 0.6],
    ];
    for (const [x, y, z, w, op] of cloudSpecs) {
      const cm = new THREE.MeshBasicMaterial({
        map: cloudTex, transparent: true, opacity: op,
        color: 0x9a8aa0, depthWrite: false, fog: false,
      });
      this.disposables.push(cm);
      const c = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.32), cm);
      c.name = 'RideCloud';
      c.position.set(x, y, z);
      skyline.add(c);
      this.disposables.push(c.geometry as THREE.BufferGeometry);
      // a slow drift — far things barely move (the parallax law, politely)
      this.host.tweens.num(() => c.position.x, (v) => { c.position.x = v; }, x + 2.4, 9.5, easeLinear);
    }

    const birdMat = this.lambert(PAL.ink);
    const bird = (y: number, z: number, delay: number) => {
      const b = new THREE.Group();
      b.name = 'RideBird';
      const wingGeo = new THREE.BoxGeometry(0.55, 0.04, 0.1);
      this.disposables.push(wingGeo);
      const wl = new THREE.Mesh(wingGeo, birdMat);
      wl.rotation.y = 0.45;
      const wr = new THREE.Mesh(wingGeo, birdMat);
      wr.rotation.y = -0.45;
      b.add(wl, wr);
      b.position.set(RIDE_POS.x - 19, y, z); // group space — ride with the staging
      g.add(b);
      this.host.tweens.sequence(
        this.host.tweens.wait(delay),
        this.host.tweens.parallel(
          this.host.tweens.num(() => b.position.x, (v) => { b.position.x = v; }, RIDE_POS.x + 19, 8.5, easeLinear),
          this.host.tweens.num(() => b.position.y, (v) => { b.position.y = v; }, y + 1.6, 8.5, easeLinear),
        ),
      );
    };
    bird(9.5, 56, 0.8);
    bird(12, 58, 2.2);
    bird(10.8, 57, 4.1);

    // --- the interior: a real bus around the lens (the 9:16 lesson) -------
    // The old staging hung five frame bars at 16:9 angles; on a phone the
    // 80° vfov climbed straight past them and the diorama floated naked in
    // the sky. Now the shell — ceiling, floor, walls — is sized to the
    // worst case the film can meet (INTERIOR's comment has the math), so
    // every aspect sees: interior, window, world. Nothing else. Ever.
    const frame = new THREE.Group();
    frame.name = 'RideInterior';
    // the aperture is chosen once, at build, from the booting aspect — a
    // mid-film resize degrades gracefully (the shell owns everything
    // outside either aperture; INTERIOR's math still holds for both)
    const AP = this.host.cam.camera.aspect < 0.9
      ? { x: APERTURE.x, y: APERTURE_PORTRAIT_Y }
      : APERTURE;
    const part = (name: string, mat: THREE.Material,
      x: number, y: number, z: number, w: number, h: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.name = name;
      m.position.set(x, y, z);
      frame.add(m);
      this.disposables.push(m.geometry as THREE.BufferGeometry);
      return m;
    };
    const headTop = AP.y + 0.038; // the header's outer face
    const sillBot = -AP.y - 0.038;
    part('Shell_Ceiling', mats.panel, 0, (headTop + INTERIOR.y) / 2, GLASS_Z - 0.02,
      INTERIOR.x * 2, INTERIOR.y - headTop, 0.16);
    part('Shell_Floor', mats.frame, 0, (sillBot - INTERIOR.y) / 2, GLASS_Z - 0.02,
      INTERIOR.x * 2, sillBot + INTERIOR.y, 0.16);
    const wallX = AP.x + 0.035; // the mullions' outer face
    part('Shell_WallL', mats.panel, -(wallX + INTERIOR.x) / 2, 0, GLASS_Z - 0.02,
      INTERIOR.x - wallX, INTERIOR.y * 2, 0.16);
    part('Shell_WallR', mats.panel, (wallX + INTERIOR.x) / 2, 0, GLASS_Z - 0.02,
      INTERIOR.x - wallX, INTERIOR.y * 2, 0.16);
    // ceiling dressing: the AC duct and three warm downlights
    part('Shell_Duct', mats.panelDark, 0, headTop + 0.09, GLASS_Z - 0.02, INTERIOR.x * 1.6, 0.1, 0.18);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xd9b98c });
    this.disposables.push(lampMat);
    // a dark valance over the strip — the lamps read as recessed fittings,
    // not three bright slabs glued to the void (the portrait report)
    part('Shell_LampValance', mats.panelDark, 0, headTop + 0.062, GLASS_Z + 0.01, 0.54, 0.03, 0.035);
    for (const lx of [-0.16, 0, 0.16]) {
      part('Shell_Lamp', lampMat, lx, headTop + 0.038, GLASS_Z + 0.02, 0.042, 0.012, 0.05);
    }
    // the grab rail, hung where buses hang them, with two straps
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.66, 6), mats.frame);
    rail.name = 'Shell_Rail';
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, headTop + 0.055, GLASS_Z + 0.06);
    frame.add(rail);
    this.disposables.push(rail.geometry as THREE.BufferGeometry);
    for (const sx of [-0.13, 0.13]) {
      part('Shell_Strap', mats.frame, sx, headTop + 0.015, GLASS_Z + 0.06, 0.014, 0.05, 0.006);
    }
    // the aperture: mullions, header, deep sill with a lip
    part('MullionL', mats.frame, -AP.x, 0, GLASS_Z, 0.07, AP.y * 2 + 0.16, 0.1);
    part('MullionR', mats.frame, AP.x, 0, GLASS_Z, 0.07, AP.y * 2 + 0.16, 0.1);
    part('Header', mats.frame, 0, AP.y + 0.038, GLASS_Z, AP.x * 2 + 0.07, 0.075, 0.1);
    part('Sill', mats.panelDark, 0, -AP.y - 0.038, GLASS_Z + 0.01, AP.x * 2 + 0.07, 0.075, 0.13);
    part('Sill_Lip', mats.panelDark, 0, -AP.y - 0.015, GLASS_Z + 0.09, AP.x * 2 + 0.12, 0.022, 0.05);
    // the AC unit — why the header has a hump
    part('Shell_AC', mats.panelDark, 0, AP.y + 0.11, GLASS_Z, 0.52, 0.1, 0.16);
    // the glass: a whisper of tint, so the world sits BEHIND something
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(AP.x * 2 - 0.02, AP.y * 2 + 0.08),
      new THREE.MeshBasicMaterial({ color: 0xd8e2ea, transparent: true, opacity: 0.05, depthWrite: false }),
    );
    glass.name = 'Shell_Glass';
    glass.position.set(0, 0, GLASS_Z + 0.02);
    frame.add(glass);
    this.disposables.push(glass.geometry as THREE.BufferGeometry);
    // the seats — yours, and the row ahead's shoulder at the frame bottom
    part('SeatBack', mats.seat, 0, -0.33, -0.34, 0.7, 0.32, 0.14);
    part('SeatBackFar', mats.seat, 0, -0.36, -0.14, 0.66, 0.26, 0.1);
    // somebody's coffee rode here first
    cyl(frame, 'Sill_Cup', this.lambert(PAL.cream), 0.21, -AP.y + 0.03, GLASS_Z + 0.06, 0.018, 0.014, 0.055, 8);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 8), this.lambert(PAL.ink));
    lid.name = 'Sill_CupLid';
    lid.position.set(0.21, -AP.y + 0.061, GLASS_Z + 0.06);
    frame.add(lid);
    this.disposables.push(lid.geometry as THREE.BufferGeometry);

    // --- the neighbor: asleep against the glass since Yonkers -------------
    // Doc 02's opening line, present from frame one. The REAL person rig
    // (personRig, sit mode) — real shoulders and a bowed head read as a
    // sleeper where stacked slabs read as cargo. She sits the row ahead at
    // the window side, back to us: netted trucker hat (the mesh panel is
    // what you see from behind), head tipped to the glass, a breath you
    // can barely see. Half-cropped by the mullion, the way a neighbor is.
    const doze = this.host.buildPerson({
      jacket: 0xb59a72, pants: 0x5a544e, skin: 0xd9a06b, hair: 0xece5d8, style: 'cap',
    });  // hair colors the cap — cream, the trucker-hat foam front
    doze.name = 'Shell_Neighbor';
    doze.scale.setScalar(0.095); // the shell is a dollhouse bus under a 36°
                                 // cine lens — the sleeper rides the same scale
    doze.position.set(0.23, -0.1, -0.42); // half-cropped by the mullion, cap and
                                          // shoulder over the row-ahead seat back
    doze.rotation.y = Math.PI; // faces the glass; the camera sees her back
    const dozeRig = doze.userData.rig as {
      root: THREE.Group; body: THREE.Group; head: THREE.Group; mode: string;
    } | undefined;
    if (dozeRig) {
      dozeRig.mode = 'sit';
      updatePersonAnim(doze, 1 / 60, { mode: 'sit' }); // one call bakes the pose
      dozeRig.head.rotation.x = -0.62; // the bow: crown tipped to the glass
      dozeRig.body.rotation.x = 0.14;  // the lean into the window
      // the net back + foam-front patch ride the cap (the cap's own crown
      // is merged in the head mesh; these two boxes are the tell)
      const netPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.075, 0.055),
        new THREE.MeshLambertMaterial({ color: 0x8a8378, fog: false }),
      );
      netPanel.name = 'Neighbor_HatNet';
      netPanel.position.set(0, 0.185, -0.15);
      dozeRig.head.add(netPanel);
      this.disposables.push(netPanel.geometry as THREE.BufferGeometry);
      const patch = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.055, 0.012),
        this.lambert(0x2a9d8f),
      );
      patch.name = 'Neighbor_HatPatch';
      patch.position.set(0, 0.185, 0.15); // teal logo, foam front
      dozeRig.head.add(patch);
      this.disposables.push(patch.geometry as THREE.BufferGeometry);
      this.neighborRig = dozeRig;
    }
    frame.add(doze);

    this.windowFrame = frame;
    this.host.cam.camera.add(frame);

    // camera: at the window seat, pitched down a touch — ground, city,
    // skyline and sky all share the frame
    this.host.rigPos.x = RIDE_POS.x;
    this.host.rigPos.y = RIDE_POS.y;
    this.host.rigPos.z = RIDE_POS.z;
    this.host.rigLook.x = RIDE_POS.x;
    this.host.rigLook.y = RIDE_POS.y - 0.7;
    this.host.rigLook.z = RIDE_POS.z - 10;
    // letterbox on, HUD off — the film starts
    this.host.ui.showCine();
  }

  /** A tiny deterministic PRNG — the same seed must paint the same city
   *  (the world must be a place, not a dice roll). Seeds are folded
   *  positive first: a negative seed used to flow through `%` and every
   *  roll came out ≤ 0 — the left half of the skyline never lit up. */
  private seeded(seed: number): () => number {
    let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /** One painted TENEMENT face, drawn to exact size — px = metres × ppm —
   *  so a window is a window at any height (the stretched-canvas lesson).
   *  Brick coursing, linteled sash windows with mullions, stone sills,
   *  mechanical floors, a parapet + cornice band, a storefront with a lit
   *  sign or a stoop-grade base, soot stripes and street grime. The glow
   *  canvas shares every coordinate: lit windows, glass and sign letters
   *  only. */
  private tenementFace(w: number, h: number, variant: number, seed: number,
    opts: { storefront?: boolean; door?: boolean; floors?: number; parapet?: number; ppm?: number } = {},
  ): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
    const ppm = opts.ppm ?? 40;
    const pw = Math.min(1024, Math.max(40, Math.round(w * ppm)));
    const ph = Math.min(2048, Math.max(60, Math.round(h * ppm)));
    const px = (m: number) => Math.round(m * ppm);
    const c = document.createElement('canvas');
    c.width = pw; c.height = ph;
    const ctx = c.getContext('2d')!;
    const glow = document.createElement('canvas');
    glow.width = pw; glow.height = ph;
    const gtx = glow.getContext('2d')!;
    gtx.fillStyle = '#000000';
    gtx.fillRect(0, 0, pw, ph);
    const rand = this.seeded(seed);

    // the brick field — running-bond course lines, soot weathering
    const brick = ['#9a5a48', '#8a6a54', '#a88a68'][variant % 3];
    ctx.fillStyle = brick;
    ctx.fillRect(0, 0, pw, ph);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = px(0.07); y < ph; y += px(0.2)) ctx.fillRect(0, y, pw, 1);
    ctx.fillStyle = 'rgba(22,17,26,0.06)';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(px(0.3) + Math.floor(rand() * pw * 0.8), 0, px(0.45), ph);
    }

    // the roofline: parapet, cornice band, shadow — drawn; ledged in 3D too
    const corniceH = 0.45;
    const parapetH = opts.parapet ?? 0.55;
    const gradeH = opts.storefront ? 3.5 : 0.4;
    const floors = opts.floors ??
      Math.max(1, Math.round((h - gradeH - corniceH - parapetH) / 2.9));
    const floorH = (h - gradeH - corniceH - parapetH) / floors;
    ctx.fillStyle = '#4a4148';
    ctx.fillRect(0, 0, pw, px(parapetH));
    ctx.fillStyle = '#2a2530';
    ctx.fillRect(0, 0, pw, px(0.13));
    ctx.fillStyle = '#5a5260';
    ctx.fillRect(0, px(parapetH), pw, px(corniceH * 0.42));
    ctx.fillStyle = '#241f28';
    ctx.fillRect(0, px(parapetH + corniceH * 0.42), pw, px(0.09));

    // the window floors — real tenement bays, stone lintels and sills,
    // six-over-six sash drawn with mullions, lit rooms behind half-drawn
    // shades, the occasional window AC
    const winW = px(0.85);
    const winH = px(1.45);
    const topY = px(parapetH + corniceH);
    for (let f = 0; f < floors; f++) {
      const fy = topY + px(floorH * f);
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      ctx.fillRect(0, fy + px(floorH) - px(0.14), pw, px(0.14));
      const bays = Math.max(1, Math.round(w / 1.7));
      for (let b = 0; b < bays; b++) {
        const wx = Math.round((pw / bays) * (b + 0.5) - winW / 2);
        const wy = fy + px((floorH - 1.45 - 0.45) / 2 + 0.45);
        ctx.fillStyle = '#d8cdbd';
        ctx.fillRect(wx - px(0.06), wy - px(0.13), winW + px(0.12), px(0.13));
        ctx.fillRect(wx - px(0.06), wy + winH, winW + px(0.12), px(0.1));
        ctx.fillStyle = '#423a44';
        ctx.fillRect(wx, wy, winW, winH);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(wx, wy, winW, px(0.5));
        ctx.fillStyle = '#2c262e';
        ctx.fillRect(wx + winW / 2 - 1, wy, 2, winH);
        ctx.fillRect(wx, wy + winH / 2 - 1, winW, 2);
        if (rand() < 0.42) {
          gtx.fillStyle = rand() < 0.3 ? '#ffd9a0' : '#ffb85c';
          gtx.fillRect(wx, wy, winW, winH);
          if (rand() < 0.35) {
            gtx.fillStyle = '#000000';
            gtx.fillRect(wx, wy, winW, Math.round(winH * 0.42));
          }
        }
        if (rand() < 0.14) {
          ctx.fillStyle = '#c9c2b4';
          ctx.fillRect(wx + px(0.18), wy + winH - px(0.26), px(0.5), px(0.28));
        }
      }
    }

    // the grade: a storefront with a lit sign, or the stoop base
    if (opts.storefront) {
      const gy = ph - px(gradeH);
      // cast-iron shopfront backing, painted near-black
      ctx.fillStyle = '#2f2a36';
      ctx.fillRect(0, gy, pw, px(gradeH));
      ctx.fillStyle = '#443c48';
      ctx.fillRect(0, gy, px(0.28), px(gradeH));
      ctx.fillRect(pw - px(0.28), gy, px(0.28), px(gradeH));
      // the sign fascia + its shadow line
      ctx.fillStyle = ['#1f6f66', '#8f3040', '#1f6f66'][variant % 3];
      ctx.fillRect(px(0.32), gy + px(0.14), pw - px(0.64), px(0.64));
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(px(0.32), gy + px(0.73), pw - px(0.64), px(0.05));
      const name = ['DELI', 'BAR', 'PIZZA'][variant % 3];
      const fs = px(0.42);
      ctx.fillStyle = '#ffe0b0';
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(name, pw / 2, gy + px(0.44));

      // the shopfront itself — kickplate, mullioned display bays, a
      // transom band, a glazed door. The old grade was ONE flat glowing
      // rectangle and a blank slab; at the terminal zoom it read as a
      // cream cardboard band taped to the brick.
      const doorW = px(0.95);
      const glassL = px(0.4);
      const glassR = pw - px(0.4) - doorW - px(0.12);
      const glassY = gy + px(0.92);
      const glassH = px(1.75);
      const kickH = px(0.3);
      const transomH = px(0.34);
      const mainY = glassY + transomH;
      const mainH = glassH - transomH - kickH;
      const bayW = px(1.15);
      const bays = Math.max(1, Math.round((glassR - glassL) / bayW));
      const bw = (glassR - glassL) / bays;
      for (let b = 0; b < bays; b++) {
        const bx0 = glassL + b * bw;
        const paneW = bw - px(0.06);
        // transom: small panes, kept dim — the ceiling strip does the glow
        ctx.fillStyle = '#2f2a36';
        ctx.fillRect(bx0, glassY, bw - px(0.06), transomH);
        ctx.fillStyle = '#4a4050';
        ctx.fillRect(bx0 + px(0.05), glassY + px(0.06), bw - px(0.16), transomH - px(0.12));
        // the display pane (the px(0.06) remainder is the dark mullion)
        ctx.fillStyle = '#3a3242';
        ctx.fillRect(bx0, mainY, paneW, mainH);
        // the room behind the glass, painted on the glow canvas: warm air
        // pooling low, side returns falling to shadow — a BOX with depth,
        // not a sticker (the terminal zoom read the old flat fill as
        // cardboard taped to the brick)
        gtx.fillStyle = b % 2 === 0 ? '#ffca7a' : '#f2b05e';
        gtx.fillRect(bx0, mainY, paneW, mainH);
        // ceiling shadow + floor shadow: the lamplight pools mid-pane
        let grad = gtx.createLinearGradient(0, mainY, 0, mainY + mainH);
        grad.addColorStop(0, 'rgba(58,32,12,0.55)');
        grad.addColorStop(0.3, 'rgba(58,32,12,0)');
        grad.addColorStop(0.78, 'rgba(58,32,12,0)');
        grad.addColorStop(1, 'rgba(58,32,12,0.6)');
        gtx.fillStyle = grad;
        gtx.fillRect(bx0, mainY, paneW, mainH);
        // the recess returns — the side walls of the box fall to shadow
        grad = gtx.createLinearGradient(bx0, 0, bx0 + px(0.22), 0);
        grad.addColorStop(0, 'rgba(40,22,8,0.5)');
        grad.addColorStop(1, 'rgba(40,22,8,0)');
        gtx.fillStyle = grad;
        gtx.fillRect(bx0, mainY, px(0.22), mainH);
        grad = gtx.createLinearGradient(bx0 + paneW, 0, bx0 + paneW - px(0.22), 0);
        grad.addColorStop(0, 'rgba(40,22,8,0.5)');
        grad.addColorStop(1, 'rgba(40,22,8,0)');
        gtx.fillStyle = grad;
        gtx.fillRect(bx0 + paneW - px(0.22), mainY, px(0.22), mainH);
        // the shelves: a dark line, then stock silhouettes sitting on it
        // against the light — cans, boxes, whatever the shop sells
        for (const sy of [mainY + mainH * 0.34, mainY + mainH * 0.62]) {
          gtx.fillStyle = 'rgba(62,34,14,0.72)';
          gtx.fillRect(bx0 + px(0.08), sy, paneW - px(0.16), px(0.05));
          let sx = bx0 + px(0.14);
          while (sx < bx0 + paneW - px(0.2)) {
            const iw = px(0.07) + Math.round(rand() * px(0.09));
            const ih = px(0.1) + Math.round(rand() * px(0.14));
            gtx.fillStyle = rand() < 0.25 ? 'rgba(92,50,20,0.85)' : 'rgba(56,30,12,0.82)';
            gtx.fillRect(sx, sy - ih, iw, ih);
            sx += iw + px(0.04);
          }
        }
        // pendant lamps: two bright drops hanging from the ceiling strip
        for (const lx of [bx0 + paneW * 0.3, bx0 + paneW * 0.7]) {
          gtx.fillStyle = '#ffe9c0';
          gtx.fillRect(lx - px(0.012), mainY + px(0.02), px(0.024), px(0.16));
          gtx.fillRect(lx - px(0.05), mainY + px(0.17), px(0.1), px(0.06));
        }
        // the ceiling strip bleeding into the transom
        gtx.fillStyle = '#ffe9c0';
        gtx.fillRect(bx0 + px(0.05), mainY - px(0.07), bw - px(0.16), px(0.1));
        // a dusk reflection streak on the glass, cool so it survives the
        // glow pass — glass over a lit room, not a hole
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(bx0 + bw * 0.18, mainY + px(0.08), px(0.14), mainH - px(0.24));
        gtx.fillStyle = 'rgba(255,240,220,0.28)';
        gtx.fillRect(bx0 + bw * 0.18, mainY + px(0.08), px(0.14), mainH - px(0.24));
      }
      // kickplate under the whole run
      ctx.fillStyle = '#1a161e';
      ctx.fillRect(glassL, glassY + glassH - kickH, glassR - glassL, kickH);
      // the door: glazed, lit from inside, a push bar
      const dx = glassR + px(0.12);
      ctx.fillStyle = '#443c48';
      ctx.fillRect(dx, glassY, doorW, glassH);
      ctx.fillStyle = '#2c262e';
      ctx.fillRect(dx + px(0.12), glassY + px(0.12), doorW - px(0.24), glassH - px(0.24));
      gtx.fillStyle = '#e8a95c';
      gtx.fillRect(dx + px(0.18), glassY + px(0.2), doorW - px(0.36), glassH * 0.42);
      ctx.fillStyle = '#9aa0ae';
      ctx.fillRect(dx + px(0.18), glassY + px(0.95), doorW - px(0.36), px(0.07));
      // the sign letters glow too
      gtx.fillStyle = '#ffd9a0';
      gtx.font = `bold ${fs}px sans-serif`;
      gtx.textAlign = 'center'; gtx.textBaseline = 'middle';
      gtx.fillText(name, pw / 2, gy + px(0.44));
    } else if (opts.door) {
      // the stoop grade: a tall door under a lit transom, stone enframement
      ctx.fillStyle = '#57505c';
      ctx.fillRect(0, ph - px(0.4), pw, px(0.4));
      const dx = Math.round(pw / 2 - px(0.5));
      const dh = px(2.3);
      ctx.fillStyle = '#d8cdbd';
      ctx.fillRect(dx - px(0.09), ph - dh - px(0.09), px(1.18), dh + px(0.09));
      ctx.fillStyle = '#3a3038';
      ctx.fillRect(dx, ph - dh, px(1.0), dh);
      ctx.fillStyle = '#241f28';
      ctx.fillRect(dx + px(0.12), ph - dh + px(0.12), px(0.76), dh - px(0.12));
      gtx.fillStyle = '#ffb85c';
      gtx.fillRect(dx, ph - dh, px(1.0), px(0.34));
    } else {
      ctx.fillStyle = '#57505c';
      ctx.fillRect(0, ph - px(0.4), pw, px(0.4));
    }

    // street grime — the feet of every real building
    const grime = ctx.createLinearGradient(0, ph - px(1.6), 0, ph);
    grime.addColorStop(0, 'rgba(24,20,30,0)');
    grime.addColorStop(1, 'rgba(24,20,30,0.4)');
    ctx.fillStyle = grime;
    ctx.fillRect(0, ph - px(1.6), pw, px(1.6));

    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    const glowTex = new THREE.CanvasTexture(glow);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    return { map, glow: glowTex };
  }

  /** One painted TOWER face for the skyline — dusk charcoal-plum with a
   *  mullion rhythm and a mechanical top band; `haze` mixes the color
   *  toward the sky, drops the mullions and thins the windows: the "far
   *  off" row at 130 m. Exact size, like the tenements. */
  private towerFace(w: number, h: number, variant: number, seed: number,
    haze: boolean,
  ): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
    const ppm = haze ? 20 : 28;
    const pw = Math.min(512, Math.max(24, Math.round(w * ppm)));
    const ph = Math.min(1024, Math.max(48, Math.round(h * ppm)));
    const px = (m: number) => Math.round(m * ppm);
    const c = document.createElement('canvas');
    c.width = pw; c.height = ph;
    const ctx = c.getContext('2d')!;
    const glow = document.createElement('canvas');
    glow.width = pw; glow.height = ph;
    const gtx = glow.getContext('2d')!;
    gtx.fillStyle = '#000000';
    gtx.fillRect(0, 0, pw, ph);
    const rand = this.seeded(seed);

    const mix = (a: string, b: string, t: number): string => {
      const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
      const [r1, g1, b1] = p(a); const [r2, g2, b2] = p(b);
      const q = (x: number, y: number) => Math.round(x + (y - x) * t);
      return `rgb(${q(r1, r2)},${q(g1, g2)},${q(b1, b2)})`;
    };
    const bases = ['#574d66', '#5d5163', '#4f4963'];
    const mull = ['#4c4358', '#52455a', '#433e56'];
    const hazeC = '#a08cab';
    const base = haze ? mix(bases[variant % 3], hazeC, 0.42) : bases[variant % 3];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, pw, ph);
    // the mullion rhythm — real construction up close, mush at 48 m
    if (!haze) {
      ctx.fillStyle = mull[variant % 3];
      for (let x = px(0.55); x < pw; x += px(1.1)) ctx.fillRect(x, 0, Math.max(1, px(0.16)), ph);
    }
    // the mechanical crown band + shadow
    ctx.fillStyle = haze ? mix('#453d50', hazeC, 0.4) : '#453d50';
    ctx.fillRect(0, 0, pw, px(1.1));
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, px(1.1), pw, px(0.12));

    // windows — floors of 3.5 m, most dark at dusk, a scatter of rooms lit
    const floors = Math.max(2, Math.floor((h - 1.1) / 3.5));
    const floorH = (h - 1.1) / floors;
    const winW = px(0.75);
    const winH = px(1.15);
    const lit = haze ? 0.16 : 0.3;
    for (let f = 0; f < floors; f++) {
      const fy = px(1.1) + px(floorH * f + (floorH - 1.15) / 2);
      const floorDark = rand() < 0.12;
      const cols = Math.max(2, Math.round(w / 0.95));
      for (let b = 0; b < cols; b++) {
        const wx = Math.round((pw / cols) * (b + 0.5) - winW / 2);
        ctx.fillStyle = haze ? 'rgba(40,34,48,0.55)' : '#463e4a';
        ctx.fillRect(wx, fy, winW, winH);
        if (floorDark || rand() > lit) continue;
        const r = rand();
        gtx.fillStyle = haze
          ? (r < 0.2 ? '#d99e63' : '#c9884e')
          : (r < 0.05 ? '#9fd8e8' : r < 0.25 ? '#ffd9a0' : '#ffb85c');
        gtx.fillRect(wx, fy, winW, winH);
      }
    }
    // the side shading — a dark column on each edge so a tower's neighbors
    // never fuse it into one continuous slab (the flat-wall lesson)
    for (const ex of [0, 1]) {
      const eg = ctx.createLinearGradient(ex ? pw : 0, 0, ex ? pw * 0.91 : pw * 0.09, 0);
      eg.addColorStop(0, 'rgba(20,16,28,0.34)');
      eg.addColorStop(1, 'rgba(20,16,28,0)');
      ctx.fillStyle = eg;
      ctx.fillRect(ex ? pw * 0.91 : 0, 0, pw * 0.09, ph);
    }

    // the feet, darkened by the street canyon
    const grime = ctx.createLinearGradient(0, ph - px(3), 0, ph);
    grime.addColorStop(0, 'rgba(26,22,34,0)');
    grime.addColorStop(1, 'rgba(26,22,34,0.5)');
    ctx.fillStyle = grime;
    ctx.fillRect(0, ph - px(3), pw, px(3));

    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    const glowTex = new THREE.CanvasTexture(glow);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    return { map, glow: glowTex };
  }

  /** Plain running-bond brick for building SIDES (the faces carry the
   *  painted facades; the returns just need honest masonry). Tiled. */
  private brickTexture(variant: number): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d')!;
    const rand = this.seeded(41 + variant * 17);
    ctx.fillStyle = ['#7d5a4c', '#6e5a50', '#7d6a58'][variant % 3];
    ctx.fillRect(0, 0, 64, 64);
    for (let row = 0; row < 16; row++) {
      const y = row * 4;
      const off = (row % 2) * 4;
      for (let x = -8; x < 64; x += 8) {
        const l = rand();
        ctx.fillStyle = l < 0.5
          ? ['#9a5a48', '#8a6a54', '#a88a68'][variant % 3]
          : 'rgba(0,0,0,0.18)';
        ctx.fillRect(x + off + 1, y + 1, 6, 2);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /** A low sun: a hot core falling off to nothing, for the additive plane
   *  that burns behind the far towers. */
  private glowTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,224,170,0.95)');
    g.addColorStop(0.35, 'rgba(255,180,110,0.42)');
    g.addColorStop(0.7, 'rgba(255,140,90,0.12)');
    g.addColorStop(1, 'rgba(255,140,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** A flat-bottomed dusk cloud — white paint, tinted by the material. */
  private cloudTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 48;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    // one deterministic heap of lobes, flat along the bottom
    const lobes: Array<[number, number, number]> = [
      [20, 36, 14], [42, 30, 18], [68, 33, 15], [92, 36, 13], [108, 39, 10], [55, 40, 12],
    ];
    for (const [x, y, r] of lobes) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(14, 36, 102, 12); // the flat base
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Every ride material carries fog:false — the diorama paints its own
  // aerial perspective, and the world's amber fog would eat the 110 m
  // skyline the light-up beat depends on.
  private lambert(color: number): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ color, fog: false });
    this.disposables.push(m);
    return m;
  }

  /** Lambert with flat shading — the canopy lobes catch the dusk per-face. */
  private lambertFlat(color: number): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ color, flatShading: true, fog: false });
    this.disposables.push(m);
    return m;
  }

  /** Lambert with a self-glow floor — faces turned from the sun keep their
   *  color instead of dying to black (the skyline's south faces). */
  private lambertEmissive(color: number, intensity: number): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: intensity, fog: false });
    this.disposables.push(m);
    return m;
  }

  /** A pitched gable roof — one triangular prism, the farmhouse silhouette
   *  the 1-Second Law expects out a country window (the old 4-sided cone
   *  read as a circus tent). Centered on x/z, rising from y = 0. */
  private gableRoof(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    geo.translate(0, 0, -d / 2);
    const m = new THREE.Mesh(geo, mat);
    this.disposables.push(geo);
    return m;
  }

  /** A rooftop water tank — the silhouette New York wears above its
   *  cornices. Base sits on the roof at y; wood-dark, coned cap, hoops. */
  private waterTank(parent: THREE.Object3D, x: number, y: number, z: number): void {
    const mat = this.lambert(0x5d4a3e);
    const band = this.lambert(0x43352c);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.75, 8), mat);
    tank.name = 'RideWaterTank';
    tank.position.set(x, y + 0.38, z);
    parent.add(tank);
    const hoopA = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.018, 5, 10), band);
    hoopA.name = 'RideWaterTankHoop';
    hoopA.rotation.x = Math.PI / 2;
    hoopA.position.set(x, y + 0.16, z);
    parent.add(hoopA);
    const hoopB = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.018, 5, 10), band);
    hoopB.name = 'RideWaterTankHoop';
    hoopB.rotation.x = Math.PI / 2;
    hoopB.position.set(x, y + 0.6, z);
    parent.add(hoopB);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.42, 8), mat);
    cone.name = 'RideWaterTankCap';
    cone.position.set(x, y + 0.96, z);
    parent.add(cone);
    this.disposables.push(
      tank.geometry as THREE.BufferGeometry,
      hoopA.geometry as THREE.BufferGeometry,
      hoopB.geometry as THREE.BufferGeometry,
      cone.geometry as THREE.BufferGeometry,
    );
  }

  // ------------------------------------------------------- the arrival card --

  /** Dip to black → the coach at the gate, door sliding open → the
   *  destination-roll push-in → the title. The coach is the film's OWN
   *  diorama prop (built here, disposed at the handover): the street's
   *  BUS-02 bay holds one bus and one bus only (the M121's loop — docs/47
   *  "the terminal bay, made honest"), so nothing of ours parks there.
   *  The step-off itself is a cut: dip to black, and the player stands at
   *  the bay on the street the world built. */
  private async playArrivalCard(): Promise<void> {
    const run = this.runId;
    await this.host.ui.fadeOut(350);
    if (run !== this.runId || !this.active) return;
    // the window frame rides the CAMERA — it must go before the lens moves
    if (this.windowFrame) {
      this.host.cam.camera.remove(this.windowFrame);
      this.windowFrame = null;
    }
    this.buildCoach();
    this.host.ui.cineVisible(); // the bars stay — the frame is the gate now

    // Establishing three-quarter on the coach at the gate → a slow push-in
    // on the OPENING doorway. The look point is the door, not the roll: the
    // NEW YORK roll rides the upper third (in portrait the title block sat
    // dead on it — white on amber, both unreadable), the title lands on the
    // dark window-band glass, and the lit doorway glows just beneath it —
    // "title card over the doors opening" (Doc 02), literally framed.
    this.host.rigPos.x = COACH.doorX + 5.6; this.host.rigPos.y = 3.0; this.host.rigPos.z = COACH.z - 7.2;
    this.host.rigLook.x = COACH.doorX + 0.5; this.host.rigLook.y = 1.5; this.host.rigLook.z = COACH.z - 0.9;
    const t = this.host.tweens;
    t.sequence(
      t.wait(0.25),
      t.parallel(
        t.num(() => this.host.rigPos.x, (v) => { this.host.rigPos.x = v; }, COACH.doorX + 2.6, 2.0),
        t.num(() => this.host.rigPos.y, (v) => { this.host.rigPos.y = v; }, 2.35, 2.0),
        t.num(() => this.host.rigPos.z, (v) => { this.host.rigPos.z = v; }, COACH.z - 4.5, 2.0),
      ),
      t.call(() => this.openFilmDoor()),
    );
    await this.host.ui.fadeIn(450);
    if (run !== this.runId || !this.active) return;
    this.host.ui.cineTitle();
  }

  // -------------------------------------------------------------- handover --

  /** Step off the coach: the player at the bay, Rosa waving up the
   *  sidewalk, HUD + Map note, follow camera with clean air behind. */
  private handover(): void {
    this.runId++; // any in-flight arrival card is now stale
    this.teardownRide();
    this.host.ui.cineHide();
    this.host.ui.cineHideBox();

    const p = this.host.player.capsule;
    // (−34.2, 6.3): the north walk beside the BUS-02 bay (paint x −36..−24)
    // — a step off the door lands here, clear of the M121 flag pole at
    // (−30, 7.35), the bulletin board at (−37.6, 7.5) and the parked bus
    // body's curb edge (z ≤ 5.85 when the loop is in). The first spawn
    // draft (−34.6, 5.7) sat where the loop body sweeps — it would stand
    // the fresh player INSIDE the arriving bus.
    p.x = -34.2; p.y = 0.05; p.z = 6.3;
    // Facing 1.95 rad — east, down the sidewalk, Rosa's bodega up the walk.
    // This is a CAMERA law, not a staging whim: the street-side settle
    // (GameCamera: idle yaw → 0) puts the lens SOUTH of the player, where
    // the bay's traffic lane runs — a heading past TURNED_AROUND (1.8)
    // makes the settle keep the player's own heading, so the lens stays in
    // the clear air of the walk instead of staring into the bus lane.
    this.host.player.rotationY = 1.95;
    this.host.playerVisual.visible = true;
    this.host.playerVisual.position.set(p.x, p.y, p.z);
    this.host.playerVisual.rotation.y = this.host.player.rotationY;

    // Rosa takes up the wave until you meet her (the meet walk flips it off)
    const rig = this.host.rosa.userData.rig as { mode: string } | undefined;
    if (rig) rig.mode = 'wave';

    // follow camera from clean air — west of the door, looking east down
    // the sidewalk; the street-band clamp keeps the boom in the walk
    this.host.cam.pose = 'follow';
    this.host.cam.camYaw = Math.PI / 2;
    this.host.cam.snapBehind({ x: p.x, y: p.y, z: p.z });

    this.host.ui.showGame();
    this.host.onHandover();
    this.machine.finish();
    this.lastPhase = 'off';
  }

  // --------------------------------------------------------------- helpers --

  /** The film's own coach at the gate — the arrival-card set. Parked 300 m
   *  south of the playable map in the ride's empty staging space, so the
   *  real bay stays honest (one bay, one bus). Built at the card, disposed
   *  with the diorama at the handover; owns nothing gameplay-bearing. */
  private buildCoach(): void {
    if (this.coachGroup) return; // already standing
    const g = this.coachGroup = new THREE.Group();
    g.name = 'ArrivalCoachDiorama';
    this.host.scene.add(g);

    const body = this.lambert(PAL.cream);
    const dark = this.lambert(PAL.ink);
    const glass = this.lambert(PAL.windowDim);
    const teal = this.lambert(PAL.teal);
    const tarmac = this.lambert(0x3f3a44);
    const glowDot = new THREE.MeshBasicMaterial({ color: 0xffe0b0 });
    const tailDot = new THREE.MeshBasicMaterial({ color: PAL.coral });
    this.disposables.push(glowDot, tailDot);

    const box = (name: string, mat: THREE.Material, x: number, y: number, z: number,
      w: number, h: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.name = name;
      m.position.set(x, y, z);
      g.add(m);
      this.disposables.push(m.geometry as THREE.BufferGeometry);
      return m;
    };
    const wheel = (x: number, z: number) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 10), dark);
      w.name = 'Coach_Wheel';
      w.rotation.x = Math.PI / 2; // axle along z — the faces look outward
      w.position.set(x, 0.42, z);
      g.add(w);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.26, 8), this.lambert(0xb9b1a6));
      hub.name = 'Coach_Hub';
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.42, z);
      g.add(hub);
      this.disposables.push(w.geometry as THREE.BufferGeometry, hub.geometry as THREE.BufferGeometry);
    };

    // the tarmac apron — the gate's own floor, covers the ride ribbon's
    // seam so the coach never floats on grass (the old curb's job, wider
    // still: the dusk grass used to peek past the facade's east end)
    box('Coach_Apron', tarmac, COACH.cx, 0.0, COACH.z + 0.5, 32, 0.08, 12);
    box('Coach_GateLine', this.lambert(0xd9c98a), COACH.cx, 0.05, COACH.z - 2.4, 16, 0.05, 0.3);

    // the gate behind: a real terminal face, not a slab. The old build was
    // one dim box and a floating sign — the card lens spent its whole
    // push-in staring at a void. Now: precast bays with panel reveals and
    // pilasters, a head house with a coping and a rooftop water tower, a
    // lit centre entrance under a hood, a departure board, light pools
    // under the poles — and past the parapet, the skyline you watched
    // light up from the bus window, standing there when you arrive.
    const facade = this.lambertEmissive(0x3a3442, 0.06);
    box('Gate_Facade', facade, COACH.cx, 4.0, COACH.z + 4.2, 24, 8, 1.4);
    const deep = this.lambertEmissive(0x2c2733, 0.04);
    for (const ry of [1.4, 6.2]) {
      box('Gate_Reveal', deep, COACH.cx, ry, COACH.z + 3.44, 24, 0.07, 0.08);
    }
    for (const px of [-10.5, -4.5, 4.5, 10.5]) {
      box('Gate_Pilaster', this.lambertEmissive(0x46404e, 0.06), COACH.cx + px, 4.0, COACH.z + 3.44, 0.55, 8, 0.2);
    }
    box('Gate_HeadHouse', facade, COACH.cx, 9.0, COACH.z + 4.2, 12, 2.4, 1.5);
    box('Gate_CopingTop', this.lambertEmissive(0x54495a, 0.05), COACH.cx, 10.28, COACH.z + 4.2, 12.7, 0.24, 1.9);
    box('Gate_Coping', this.lambertEmissive(0x4a4352, 0.05), COACH.cx, 8.1, COACH.z + 4.2, 24.4, 0.2, 1.6);
    // the water tower — the skyline's own punctuation, silhouette on the roof
    for (const [lx, lz] of [[-0.5, -0.45], [0.5, -0.45], [-0.5, 0.45], [0.5, 0.45]]) {
      box('Tower_Leg', deep, COACH.cx + 3.8 + lx, 10.85, COACH.z + 4.2 + lz, 0.09, 1.2, 0.09);
    }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.02, 1.6, 10), deep);
    tank.name = 'Tower_Tank';
    tank.position.set(COACH.cx + 3.8, 12.25, COACH.z + 4.2);
    g.add(tank);
    const tRoof = new THREE.Mesh(new THREE.ConeGeometry(1.06, 0.55, 10), deep);
    tRoof.name = 'Tower_Roof';
    tRoof.position.set(COACH.cx + 3.8, 13.33, COACH.z + 4.2);
    g.add(tRoof);
    this.disposables.push(tank.geometry as THREE.BufferGeometry, tRoof.geometry as THREE.BufferGeometry);

    // beyond the depot: the lit city out there — the ride's last promise,
    // kept. Dark towers rising out of the dusk haze, sparse amber windows.
    const farTower = this.lambertEmissive(0x35303e, 0.04);
    const farWin = this.lambertEmissive(0xffca7a, 0.5);
    // x-offset, height, z-depth, width, window count — seeded jitter, no rands
    const skyline: Array<[number, number, number, number, number]> = [
      [-17, 15, 30, 5, 4], [-11.5, 18, 34, 4, 5], [-3, 14, 28, 6, 4],
      [7.5, 20, 36, 5, 6], [15.5, 13, 30, 6, 3], [21, 16, 38, 4, 4],
    ];
    for (const [ox, h, zo, w, wins] of skyline) {
      box('Far_Tower', farTower, COACH.cx + ox, h / 2, COACH.z + zo, w, h, 3);
      for (let wi = 0; wi < wins; wi++) {
        box('Far_Window', farWin,
          COACH.cx + ox + (((wi * 37) % 100) / 100 - 0.5) * (w - 1.2),
          1.5 + ((wi * 53) % 100) / 100 * (h - 3),
          COACH.z + zo - 1.56, 0.4, 0.55, 0.05);
      }
    }

    // the lit centre entrance — somebody is waiting inside. The frame is a
    // deep reveal projecting from the wall; every lit face keeps ≥0.03 of
    // real air in front of what backs it (the software rasterizer resolves
    // thin gaps and exact coplanar ties toward the darker, later-drawn
    // face — learned the hard way), and the assembly stays north of the
    // facade front (z+3.5)
    box('Gate_Hood', dark, COACH.cx, 3.12, COACH.z + 3.3, 4.6, 0.14, 1.3);
    box('Gate_HoodGlow', this.lambertEmissive(0xffca7a, 0.4), COACH.cx, 3.03, COACH.z + 3.32, 4.4, 0.05, 1.1);
    box('Gate_DoorFrame', dark, COACH.cx, 1.55, COACH.z + 3.14, 2.7, 3.1, 0.3);
    for (const dx of [-0.56, 0.56]) {
      box('Gate_DoorPane', this.lambertEmissive(0xffca7a, 0.5), COACH.cx + dx, 1.62, COACH.z + 3.36, 1.06, 2.2, 0.06);
      box('Gate_PushBar', dark, COACH.cx + dx, 1.12, COACH.z + 3.45, 0.9, 0.06, 0.06);
    }
    box('Gate_DoorStile', dark, COACH.cx, 1.62, COACH.z + 3.38, 0.1, 2.3, 0.06);
    box('Gate_Kick', deep, COACH.cx, 0.32, COACH.z + 3.33, 2.5, 0.6, 0.06);
    // ticket window, east of the door
    box('Gate_TicketFrame', dark, COACH.cx + 2.75, 2.3, COACH.z + 3.38, 1.1, 1.0, 0.06);
    box('Gate_Ticket', this.lambertEmissive(0xffca7a, 0.35), COACH.cx + 2.75, 2.3, COACH.z + 3.47, 0.95, 0.85, 0.05);

    // the departure board — amber rows over ink, unreadable on purpose,
    // honest up close; hung high so the push-in lens sees it over the roof
    const depC = document.createElement('canvas');
    depC.width = 256; depC.height = 128;
    const dctx = depC.getContext('2d')!;
    dctx.fillStyle = '#15131c';
    dctx.fillRect(0, 0, depC.width, depC.height);
    dctx.fillStyle = '#ffb85c';
    dctx.fillRect(20, 14, 216, 10);
    for (let r = 0; r < 4; r++) {
      dctx.fillStyle = r % 2 ? '#8a6a3a' : '#c9963f';
      dctx.fillRect(20, 40 + r * 20, 90 + ((r * 37) % 90), 7);
      dctx.fillRect(130 + ((r * 23) % 60), 40 + r * 20, 40, 7);
    }
    const depTex = new THREE.CanvasTexture(depC);
    depTex.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(depTex);
    const dep = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.75),
      new THREE.MeshLambertMaterial({ map: depTex, emissive: 0xffffff, emissiveMap: depTex, emissiveIntensity: 0.5 }),
    );
    dep.name = 'Gate_Departures';
    dep.rotation.y = Math.PI; // faces the lens (the facade front is its -z face)
    dep.position.set(COACH.cx + 3.4, 3.7, COACH.z + 3.44);
    g.add(dep);
    this.disposables.push(dep.geometry as THREE.BufferGeometry);
    // no casing board behind it — a backing box's face lands a depth-tie
    // away from the plane and the software rasterizer hands the tie to the
    // dark box; 0.06 of open air north of the facade front is the proven
    // config (the original GATE sign flew with exactly this)

    // lane props by the east gap — the bay waits with you
    box('Gate_BenchSeat', this.lambert(0x4a3c2e), COACH.cx + 5.4, 0.46, COACH.z + 2.6, 1.8, 0.07, 0.45);
    box('Gate_BenchBack', this.lambert(0x4a3c2e), COACH.cx + 5.4, 0.78, COACH.z + 2.82, 1.8, 0.36, 0.05);
    for (const bx of [-0.75, 0.75]) {
      box('Gate_BenchLeg', dark, COACH.cx + 5.4 + bx, 0.21, COACH.z + 2.6, 0.07, 0.42, 0.4);
    }
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.72, 8), deep);
    bin.name = 'Gate_Bin';
    bin.position.set(COACH.cx + 4.4, 0.36, COACH.z + 2.1);
    g.add(bin);
    this.disposables.push(bin.geometry as THREE.BufferGeometry);
    const signC = document.createElement('canvas');
    signC.width = 256; signC.height = 64;
    const sctx = signC.getContext('2d')!;
    sctx.fillStyle = '#1a1a22';
    sctx.fillRect(0, 0, signC.width, signC.height);
    sctx.fillStyle = '#ffb85c';
    sctx.font = 'bold 40px monospace';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText('GATE 12', signC.width / 2, signC.height / 2 + 2);
    const signTex = new THREE.CanvasTexture(signC);
    signTex.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(signTex);
    // the GATE 12 sign — a lit plane 0.06 north of the facade front, the
    // proven config; no backing board (depth ties, see the departure board)
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshLambertMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.6 }),
    );
    sign.name = 'Gate_Sign';
    sign.rotation.y = Math.PI; // faces the lens (the facade front is its -z face)
    sign.position.set(COACH.cx, 5.2, COACH.z + 3.44);
    g.add(sign);
    this.disposables.push(sign.geometry as THREE.BufferGeometry);
    for (const px of [COACH.cx - 6, COACH.cx + 6]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.2, 6), dark);
      pole.name = 'Gate_LightPole';
      pole.position.set(px, 2.6, COACH.z + 1.6);
      g.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), dark);
      head.name = 'Gate_LightHead';
      head.position.set(px, 5.2, COACH.z + 1.6);
      g.add(head);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.16), glowDot);
      lamp.name = 'Gate_LightLamp';
      lamp.position.set(px, 5.13, COACH.z + 1.6);
      g.add(lamp);
      this.disposables.push(
        pole.geometry as THREE.BufferGeometry,
        head.geometry as THREE.BufferGeometry,
        lamp.geometry as THREE.BufferGeometry,
      );
    }

    // the poles and the door actually light the tarmac — painted pools,
    // the street's own language for "a lamp is on here"
    const poolMat = this.lambertEmissive(0xffd9a0, 0.14);
    const polePoolGeo = new THREE.CircleGeometry(1.7, 14);
    const doorPoolGeo = new THREE.CircleGeometry(2.3, 14);
    this.disposables.push(polePoolGeo, doorPoolGeo);
    for (const px of [COACH.cx - 6, COACH.cx + 6]) {
      const pool = new THREE.Mesh(polePoolGeo, poolMat);
      pool.name = 'Gate_Pool';
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(px, 0.07, COACH.z + 1.6);
      g.add(pool);
    }
    const doorPool = new THREE.Mesh(doorPoolGeo, poolMat);
    doorPool.name = 'Gate_DoorPool';
    doorPool.rotation.x = -Math.PI / 2;
    doorPool.position.set(COACH.cx, 0.07, COACH.z + 2.6);
    g.add(doorPool);

    // body slab + roof cap (the M121's proportions, one bay over from the
    // house bus — a coach, not a city bus: higher roof, luggage bay)
    box('Coach_Body', body, COACH.cx, 1.45, COACH.z, 9.6, 2.2, 2.3);
    box('Coach_Roof', body, COACH.cx, 2.62, COACH.z, 9.6, 0.14, 2.3);
    box('Coach_Skirt', dark, COACH.cx, 0.5, COACH.z, 9.6, 0.5, 2.32);
    box('Coach_Stripe', teal, COACH.cx, 1.05, COACH.z, 9.64, 0.34, 2.32);
    // the roof AC pod — every interstate coach wears one
    box('Coach_AC', dark, COACH.cx, 2.76, COACH.z, 2.6, 0.16, 1.7);
    // window band: north face (the lens side) + the far face — with pillar
    // separators, or the band reads as one black stripe (the card lens sits
    // close enough to see the difference)
    box('Coach_GlassN', glass, COACH.cx + 0.4, 2.05, COACH.z - 1.16, 8.2, 0.78, 0.04);
    box('Coach_GlassS', glass, COACH.cx + 0.4, 2.05, COACH.z + 1.16, 8.2, 0.78, 0.04);
    for (let wi = 0; wi < 5; wi++) {
      box('Coach_WindowPillar', body, COACH.cx - 3.6 + wi * 2.0, 2.05, COACH.z - 1.185, 0.12, 0.78, 0.05);
    }

    // the nose (+x, the way the ride travelled): windshield + bumper
    box('Coach_Windshield', glass, COACH.noseX + 0.02, 2.0, COACH.z, 0.06, 0.9, 1.9);
    box('Coach_Bumper', dark, COACH.noseX + 0.08, 0.55, COACH.z, 0.14, 0.5, 2.2);
    // mirrors on the windshield corners, marker lights up top, tails astern
    for (const mz of [COACH.z - 1.2, COACH.z + 1.2]) {
      box('Coach_MirrorStalk', dark, COACH.noseX - 0.05, 2.45, mz, 0.03, 0.26, 0.03);
      box('Coach_Mirror', dark, COACH.noseX - 0.12, 2.5, mz + Math.sign(mz - COACH.z) * 0.1, 0.05, 0.3, 0.14);
    }
    for (const lz of [COACH.z - 0.78, COACH.z + 0.78]) {
      box('Coach_Marker', glowDot, COACH.noseX + 0.1, 2.52, lz, 0.09, 0.05, 0.05);
    }
    for (const tz of [COACH.z - 0.95, COACH.z + 0.95]) {
      box('Coach_Tail', tailDot, COACH.cx - 4.82, 1.9, tz, 0.06, 0.09, 0.05);
    }
    // wheels + hubs — the coach stood on painted air before
    wheel(COACH.cx + 3.1, COACH.z - 1.02);
    wheel(COACH.cx + 3.1, COACH.z + 1.02);
    wheel(COACH.cx - 3.1, COACH.z - 1.02);
    wheel(COACH.cx - 3.1, COACH.z + 1.02);

    // the destination roll — amber on ink, one canvas face
    const rollC = document.createElement('canvas');
    rollC.width = 256; rollC.height = 64;
    const rctx = rollC.getContext('2d')!;
    rctx.fillStyle = '#1a1a22';
    rctx.fillRect(0, 0, rollC.width, rollC.height);
    rctx.fillStyle = '#ffb85c';
    rctx.font = 'bold 44px monospace';
    rctx.textAlign = 'center';
    rctx.textBaseline = 'middle';
    rctx.fillText('NEW YORK', rollC.width / 2, rollC.height / 2 + 2);
    const rollTex = new THREE.CanvasTexture(rollC);
    rollTex.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(rollTex);
    const roll = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.42),
      new THREE.MeshLambertMaterial({ map: rollTex, emissive: 0xffffff, emissiveMap: rollTex, emissiveIntensity: 0.55 }),
    );
    roll.name = 'Coach_Roll';
    roll.rotation.y = Math.PI / 2; // faces +x, down the road we came in on
    roll.position.set(COACH.noseX + 0.07, 2.6, COACH.z);
    g.add(roll);
    this.disposables.push(roll.geometry as THREE.BufferGeometry);

    // the curb-side door leaf (north face, by the nose) — openFilmDoor slides it
    const leaf = box('Film_CoachDoor', body, COACH.doorX, 1.12, COACH.z - 1.17, 1.0, 1.9, 0.06);
    const leafGlass = box('Film_CoachDoorGlass', glass, COACH.doorX, 1.55, COACH.z - 1.2, 0.8, 0.85, 0.05);
    // the doorway the slide reveals — the old build slid the leaf to show
    // the cream BODY FACE behind it (a door painted on a door). The recess
    // sits between leaf and body: north face 0.01 proud of the body face
    // (z −1.15), 0.04 behind the leaf plane — no depth tie either way.
    // A warm strip at its top reads as the lit aisle inside; the threshold
    // spill puts the light on the tarmac where a spill belongs.
    box('Film_CoachDoorRecess', dark, COACH.doorX, 1.12, COACH.z - 1.16, 1.04, 1.94, 0.03);
    box('Film_CoachDoorGlow', this.lambertEmissive(0xffca7a, 0.4), COACH.doorX, 1.72, COACH.z - 1.155, 0.86, 0.3, 0.02);
    box('Film_CoachDoorSpill', this.lambertEmissive(0xffd9a0, 0.22), COACH.doorX, 0.055, COACH.z - 1.75, 1.15, 0.02, 0.85);
    this.doorLeaf = leaf;
    this.doorGlass = leafGlass;
  }

  /** The door leaf slides into the body — the film's own prop, so the
   *  tween lives here and the host interface stays clean. */
  private openFilmDoor(): void {
    const t = this.host.tweens;
    if (this.doorLeaf) t.num(() => this.doorLeaf!.position.x, (v) => { if (this.doorLeaf) this.doorLeaf.position.x = v; }, this.doorLeaf.position.x + 0.92, 0.9);
    if (this.doorGlass) t.num(() => this.doorGlass!.position.x, (v) => { if (this.doorGlass) this.doorGlass.position.x = v; }, this.doorGlass.position.x + 0.92, 0.9);
  }

  /** Remove + dispose everything this module built (idempotent). */
  private teardownRide(): void {
    if (this.windowFrame) {
      this.host.cam.camera.remove(this.windowFrame);
      this.windowFrame = null;
    }
    this.strip = null;
    this.doorLeaf = null;
    this.doorGlass = null;
    const hadProps = this.group !== null || this.coachGroup !== null;
    if (this.group) this.host.scene.remove(this.group);
    if (this.coachGroup) this.host.scene.remove(this.coachGroup);
    this.group = null;
    this.coachGroup = null;
    if (hadProps) {
      for (const d of this.disposables) d.dispose();
      this.disposables = [];
    }
  }
}
