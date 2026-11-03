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
 * Staging law: the "ride" is a self-contained diorama parked ~300 m south
 * of the playable map (nothing else renders there), so the real world
 * never has to move and nothing here can leave a stray collider behind.
 * The dip-to-black cut lands you at the terminal bay, where the street's
 * own world takes over (the bay holds one bus — the M121's loop — so the
 * film's coach never parks there). Every mesh this module builds lives in
 * one group and is disposed on cleanup. The window frame + seat back are
 * parented to the CAMERA (parallax-free interior) — the camera is added
 * to the scene for them and stays there, childless, after cleanup.
 *
 * Parallax law (the second draft's lesson): far things slide slow, near
 * things slide fast. The skyline never slides at all — it is 17 m out and
 * 30 m tall, so it reads as "far off" and stays put while the near city
 * glides past. The strip carries countryside + city blocks at bus speed.
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
 */

import * as THREE from 'three';
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
  /** Game-side handover extras (Map note, checkpoint). */
  onHandover(): void;
}

/** The ride camera: a window seat, staged at (−150, 100) — empty world,
 *  inside the sky shell, and the shell's far side stays inside the camera's
 *  500 far plane (the first staging at z 300 clipped the sky to black).
 *  y 4.6 = seated eye height (the ground band stays in frame); the strip
 *  rides 10 m out the glass, relative to the camera's x — the second
 *  staging forgot that and slid past 150 m east of the lens. */
const RIDE_POS = { x: -150, y: 4.6, z: 100 };
const STRIP_Z = 90;
const STRIP_START_X = 20;
const STRIP_END_X = -14;
/** The bus creeps to the gate while you talk to the driver (m/s). */
const CREEP_SPEED = 0.15;
/** The skyline sits 40 m out: a 33 m tower tops out ~35° above the lens —
 *  a band across the upper frame, not the flat wall 17 m produced. */
const SKYLINE_Z = 60;
/** The window aperture (half-extents at the glass) — the desktop 16:9
 *  target. The interior shell owns everything outside it. */
const APERTURE = { x: 0.31, y: 0.2 };
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
      leafA: this.lambertFlat(0x6f9450),
      leafB: this.lambertFlat(0x5d7d4a),
      leafC: this.lambertFlat(0x9aa050),
      frame: this.lambert(0x241f28),
      panel: this.lambertEmissive(0x453e4a, 0.08),
      panelDark: this.lambertEmissive(0x36303e, 0.05),
      seat: this.lambert(0x39404e),
    };
    // lit windows — the dusk story: somebody is home out there
    const winGlow = this.lambertEmissive(0xffca7a, 0.9);
    const smokeMat = new THREE.MeshLambertMaterial({ color: 0x9a9aa8, transparent: true, opacity: 0.32 });
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
    const blob = (parent: THREE.Object3D, name: string, mat: THREE.Material,
      x: number, y: number, z: number, r: number, sy = 1) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
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

    // trees — tapered trunk + two flat-shaded lobes (the stacked-box tree
    // read as Minecraft; this reads as a tree at 60 mph)
    const tree = (x: number, z: number, s: number, leaf: THREE.Material) => {
      cyl(strip, 'RideTreeTrunk', mats.wood, x, 0.5 * s, z, 0.05 * s, 0.1 * s, 1.0 * s, 6);
      blob(strip, 'RideTreeLobeA', leaf, x, 1.25 * s, z, 0.62 * s, 0.85);
      blob(strip, 'RideTreeLobeB', leaf, x + 0.16 * s, 1.62 * s, z + 0.08 * s, 0.42 * s, 0.9);
    };
    tree(-12.5, -1.6, 1.05, mats.leafB);
    tree(-9.8, -1.1, 0.85, mats.leafC);
    tree(-6.2, -1.5, 1.2, mats.leafA);
    tree(-1.5, -1.0, 0.95, mats.leafB);
    tree(1.6, -1.6, 1.1, mats.leafC);
    tree(6.8, -1.2, 0.9, mats.leafA);
    tree(9.5, -1.7, 1.15, mats.leafB);
    tree(12.3, -1.1, 0.8, mats.leafC);

    // the farm cluster — gable roofs (a real prism, not a 4-sided cone),
    // lit windows, chimney smoke; this is what "someone lives out here"
    // looks like through the glass at golden hour
    const house = (x: number, z: number, w: number, h: number, d: number,
      wall: THREE.Material, roof: THREE.Material, wins: Array<[number, number]>) => {
      box(strip, 'RideHouseBody', wall, x, h / 2, z, w, h, d);
      const roofM = this.gableRoof(w + 0.35, h * 0.55, d + 0.35, roof);
      roofM.name = 'RideHouseRoof';
      roofM.position.set(x, h, z);
      strip.add(roofM);
      box(strip, 'RideHouseChimney', wall, x + w * 0.28, h + h * 0.42, z - d * 0.2, 0.22, 0.7, 0.22);
      for (const [wx, wy] of wins) {
        box(strip, 'RideHouseWindow', winGlow, x + wx, wy, z + d / 2 + 0.03, 0.28, 0.4, 0.05);
      }
      box(strip, 'RideHouseDoor', mats.frame, x, h * 0.24, z + d / 2 + 0.03, 0.5, h * 0.48, 0.05);
      // smoke: two settled puffs (no tween — the film is 10 s, the chimney
      // is 8 m out, stillness reads as distance)
      blob(strip, 'RideSmokeA', smokeMat, x + w * 0.28 + 0.12, h + h * 0.42 + 0.5, z - d * 0.2, 0.16, 1.4);
      blob(strip, 'RideSmokeB', smokeMat, x + w * 0.28 + 0.3, h + h * 0.42 + 0.9, z - d * 0.2, 0.23, 1.5);
    };
    house(-8.5, -2.4, 2.6, 2.0, 2.2, mats.wall, mats.roof, [[-0.6, 1.25], [0.6, 1.25]]);
    house(3.5, -2.2, 3.0, 2.8, 2.4, mats.cream, mats.roof, [[-0.95, 2.0], [0, 2.0], [0.95, 2.0], [-0.5, 0.95], [0.5, 0.95]]);

    // the barn + silo — the farm reads as a FARM, not a toy house
    box(strip, 'RideBarnBody', this.lambert(PAL.brick), -12.2, 1.1, -2.6, 3.0, 2.2, 2.6);
    const barnRoof = this.gableRoof(3.35, 1.3, 2.9, mats.roofDark);
    barnRoof.name = 'RideBarnRoof';
    barnRoof.position.set(-12.2, 2.2, -2.6);
    strip.add(barnRoof);
    box(strip, 'RideBarnDoor', mats.silo, -12.2, 0.55, -1.27, 0.7, 1.1, 0.06);
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
    // line, and the cheapest "distance" cue there is
    const poleXs = [-11, -5.5, 0, 5.5, 11];
    for (const px of poleXs) {
      cyl(strip, 'RidePole', mats.frame, px, 2.2, 1.6, 0.06, 0.09, 4.4, 6);
      box(strip, 'RidePoleArm', mats.frame, px, 4.05, 1.6, 0.95, 0.07, 0.07);
    }
    const wireMat = new THREE.LineBasicMaterial({ color: 0x241f28 });
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

    // the far seam of the countryside — two rows of flat-shaded canopy
    // blobs and soft mound caps (the old straight boxes terraced like a
    // quarry; canopies read as woods at 60 mph)
    for (let i = 0; i < 12; i++) {
      const x = -20 + i * 3.6 + ((i * 53) % 17) / 10;
      const r = 1.3 + ((i * 29) % 13) / 10; // 1.3 … 2.5
      blob(strip, 'RideWoodA', this.lambertFlat(0x42573e), x, 1.1, -7.4 - ((i * 31) % 10) / 10, r, 0.85);
    }
    for (let i = 0; i < 9; i++) {
      const x = -19 + i * 4.6 + ((i * 41) % 19) / 10;
      const r = 1.7 + ((i * 23) % 15) / 10; // 1.7 … 3.1
      blob(strip, 'RideWoodB', this.lambertFlat(0x3a5138), x, 1.0, -10.6 - ((i * 13) % 10) / 10, r, 0.9);
    }
    blob(strip, 'RideMoundA', mats.hill, -8, 1.25 - 6 * 0.24, -12, 6, 0.24);
    blob(strip, 'RideMoundB', mats.hill, 4, 1.25 - 7 * 0.24, -13, 7, 0.24);
    blob(strip, 'RideMoundC', mats.hill, 13, 1.25 - 5 * 0.24, -12.5, 5, 0.24);

    // the city rolls in ahead — blocks enter the window late in the ride
    // (the last block stopped at the dialogue freeze as a blank wall that
    // filled the window's right third — four blocks fill the frame kindly).
    // Each block now wears a painted tenement facade: brick, storefront,
    // cornice, a painted fire escape — New York in one texture.
    const blockDefs: Array<[number, number, number, number]> = [
      [4.5, 8, 3.2, 0], [7.5, 11.5, 3.4, 1], [10.5, 9, 3.0, 2], [13.5, 13, 3.6, 0],
    ];
    const blockSide = this.lambert(0x6d5344);
    const blockRoof = this.lambert(0x2f2a36);
    const facadeMats = this.getFacadeMats();
    for (const [x, h, w, v] of blockDefs) {
      const geo = new THREE.BoxGeometry(w, h, 2.6);
      const mesh = new THREE.Mesh(geo, [blockSide, blockSide, blockRoof, blockRoof, facadeMats[v], blockSide]);
      mesh.name = 'RideBlock';
      mesh.position.set(x, h / 2, -3.2);
      strip.add(mesh);
      this.disposables.push(geo);
      if (v === 1) this.waterTank(strip, x + w * 0.22, h, -3.2);
      box(strip, 'RideBlockAC', blockRoof, x - w * 0.2, h + 0.28, -3.2, 0.8, 0.55, 1.1);
    }

    // --- the skyline: STATIC (far off = no parallax), lights up at ~4 s ---
    // World space, added to the GROUP (never to the strip): 40 m out, the
    // towers read as a distant band and hold still while the near world glides.
    // Windows are BAKED into the towers' textures — the light-up beat tweens
    // the row materials' emissiveIntensity and the whole skyline wakes.
    const skyline = new THREE.Group();
    skyline.name = 'RideSkyline';
    skyline.position.set(RIDE_POS.x, 0, SKYLINE_Z);
    g.add(skyline);

    // the city's floor — a dusk asphalt apron so the skyline rises from a
    // city instead of the amber haze
    box(skyline, 'RideCityApron', this.lambert(0x4a4552), 0, -0.12, 4, 64, 0.3, 34);

    // far row — the hazier silhouette behind the headliners; depth without
    // a fog cheat (it simply stands further back and lights up dimmer)
    const farTex = this.towerBodyTexture(2);
    const farWin = this.towerWindowsTexture(2);
    const farMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: farTex,
      emissive: 0xffffff,
      emissiveMap: farWin,
      emissiveIntensity: 0.1,
    });
    this.disposables.push(farTex, farWin, farMat);
    const farTowers: Array<[number, number, number]> = [
      [-14, 14, 2.6], [-11, 18, 2.4], [-8.4, 12, 2.8], [-5.6, 20, 2.4], [-2.6, 15, 2.6],
      [0.4, 22, 2.4], [3.4, 13, 2.8], [6.2, 19, 2.4], [9.2, 15, 2.6], [12.4, 21, 2.4],
    ];
    for (const [x, h, w] of farTowers) {
      box(skyline, 'RideTowerFar', farMat, x, h / 2, 16, w, h, 2.0);
    }

    // near row — the silhouettes the trip is named for: setbacks, a spire
    // with its beacon, a lit crown. The 1-Second Law, out a bus window.
    const towerMats = [0, 1, 2].map((v) => {
      const body = this.towerBodyTexture(v);
      const win = this.towerWindowsTexture(v);
      const m = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        map: body,
        emissive: 0xffffff,
        emissiveMap: win, // black body, amber windows — only windows glow
        emissiveIntensity: 0.18, // dusk-dark until the city lights come on
      });
      this.disposables.push(body, win, m);
      return m;
    });
    const crownMat = this.lambertEmissive(0xffb85c, 0.25);
    const beaconMat = new THREE.MeshBasicMaterial({ color: PAL.coral });
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
      const mat = towerMats[t.v];
      let top = 0;
      let tw = t.w;
      t.tiers.forEach(([w, h], i) => {
        box(skyline, `RideTower${i}`, mat, t.x, top + h / 2, 0, w, h, 2.4);
        top += h;
        tw = w;
      });
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

    // street-level fabric — a low brick band in front of the towers, so
    // the skyline sits IN a city instead of floating over one
    for (let i = 0; i < 12; i++) {
      const x = -13 + i * 2.3;
      const h = 4.4 + ((i * 37) % 23) / 10; // 4.4 … 6.6, deterministic
      const geo = new THREE.BoxGeometry(2.1, h, 2.0);
      const low = new THREE.Mesh(geo, [blockSide, blockSide, blockRoof, blockRoof, facadeMats[i % 3], blockSide]);
      low.name = 'RideLowrise';
      low.position.set(x, h / 2, -7);
      skyline.add(low);
      this.disposables.push(geo);
      if (i % 3 === 0) box(skyline, 'RideLowriseParapet', blockRoof, x, h + 0.18, -7, 2.1, 0.36, 2.0);
      if (i % 4 === 1) this.waterTank(skyline, x + 0.5, h, -6.9);
    }

    // the light-up: the beat stays (3.6 s wait, 2.4 s rise) — the far row
    // trails the near one and the crown blooms last, the way real dusk lands
    this.host.tweens.sequence(
      this.host.tweens.wait(3.6),
      this.host.tweens.num(
        () => towerMats[0].emissiveIntensity,
        (v) => {
          for (const m of towerMats) m.emissiveIntensity = v;
          farMat.emissiveIntensity = 0.1 + Math.max(0, v - 0.18) * 0.6;
          crownMat.emissiveIntensity = 0.25 + Math.max(0, v - 0.18) * 1.1;
        },
        1.15, 2.4,
      ),
    );

    // --- atmosphere: one low sun, dusk clouds, birds heading home ---------
    const glowTex = this.glowTexture();
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({
        map: glowTex, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }),
    );
    glow.name = 'RideSunGlow';
    glow.position.set(-7, 2.6, 18); // behind the far row — towers silhouette against it
    skyline.add(glow);
    this.disposables.push(glowTex, glow.geometry as THREE.BufferGeometry);

    const cloudTex = this.cloudTexture();
    const cloudSpecs: Array<[number, number, number, number, number]> = [
      [-10, 19, 14, 13, 0.8], [4, 23, 12, 16, 0.7], [12, 16, 15, 10, 0.8], [-3, 12.5, 13, 20, 0.5],
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
      b.position.set(-19, y, z);
      g.add(b);
      this.host.tweens.sequence(
        this.host.tweens.wait(delay),
        this.host.tweens.parallel(
          this.host.tweens.num(() => b.position.x, (v) => { b.position.x = v; }, 19, 8.5, easeLinear),
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
    const part = (name: string, mat: THREE.Material,
      x: number, y: number, z: number, w: number, h: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.name = name;
      m.position.set(x, y, z);
      frame.add(m);
      this.disposables.push(m.geometry as THREE.BufferGeometry);
      return m;
    };
    const headTop = APERTURE.y + 0.038; // the header's outer face
    const sillBot = -APERTURE.y - 0.038;
    part('Shell_Ceiling', mats.panel, 0, (headTop + INTERIOR.y) / 2, GLASS_Z - 0.02,
      INTERIOR.x * 2, INTERIOR.y - headTop, 0.16);
    part('Shell_Floor', mats.frame, 0, (sillBot - INTERIOR.y) / 2, GLASS_Z - 0.02,
      INTERIOR.x * 2, sillBot + INTERIOR.y, 0.16);
    const wallX = APERTURE.x + 0.035; // the mullions' outer face
    part('Shell_WallL', mats.panel, -(wallX + INTERIOR.x) / 2, 0, GLASS_Z - 0.02,
      INTERIOR.x - wallX, INTERIOR.y * 2, 0.16);
    part('Shell_WallR', mats.panel, (wallX + INTERIOR.x) / 2, 0, GLASS_Z - 0.02,
      INTERIOR.x - wallX, INTERIOR.y * 2, 0.16);
    // ceiling dressing: the AC duct and three warm downlights
    part('Shell_Duct', mats.panelDark, 0, headTop + 0.09, GLASS_Z - 0.02, INTERIOR.x * 1.6, 0.1, 0.18);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe0b0 });
    this.disposables.push(lampMat);
    for (const lx of [-0.16, 0, 0.16]) {
      part('Shell_Lamp', lampMat, lx, headTop + 0.035, GLASS_Z + 0.08, 0.06, 0.015, 0.06);
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
    part('MullionL', mats.frame, -APERTURE.x, 0, GLASS_Z, 0.07, APERTURE.y * 2 + 0.16, 0.1);
    part('MullionR', mats.frame, APERTURE.x, 0, GLASS_Z, 0.07, APERTURE.y * 2 + 0.16, 0.1);
    part('Header', mats.frame, 0, APERTURE.y + 0.038, GLASS_Z, APERTURE.x * 2 + 0.07, 0.075, 0.1);
    part('Sill', mats.panelDark, 0, -APERTURE.y - 0.038, GLASS_Z + 0.01, APERTURE.x * 2 + 0.07, 0.075, 0.13);
    part('Sill_Lip', mats.panelDark, 0, -APERTURE.y - 0.015, GLASS_Z + 0.09, APERTURE.x * 2 + 0.12, 0.022, 0.05);
    // the AC unit — why the header has a hump
    part('Shell_AC', mats.panelDark, 0, APERTURE.y + 0.11, GLASS_Z, 0.52, 0.1, 0.16);
    // the glass: a whisper of tint, so the world sits BEHIND something
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(APERTURE.x * 2 - 0.02, APERTURE.y * 2 + 0.08),
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
    cyl(frame, 'Sill_Cup', this.lambert(PAL.cream), 0.21, -APERTURE.y + 0.03, GLASS_Z + 0.06, 0.018, 0.014, 0.055, 8);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 8), this.lambert(PAL.ink));
    lid.name = 'Sill_CupLid';
    lid.position.set(0.21, -APERTURE.y + 0.061, GLASS_Z + 0.06);
    frame.add(lid);
    this.disposables.push(lid.geometry as THREE.BufferGeometry);
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

  /** Tower bodies — three dusk faces (plum, brown-plum, slate) with a
   *  mullion rhythm, a roof shadow band and street grime at the feet. */
  private towerBodyTexture(variant: number): THREE.CanvasTexture {
    const bases = ['#6b5d76', '#75616e', '#605a72'];
    const darks = ['#5d5168', '#665462', '#544e64'];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bases[variant % 3];
    ctx.fillRect(0, 0, c.width, c.height);
    // the mullion rhythm: a darker column every 16 px, so the face reads
    // as construction, not paint
    ctx.fillStyle = darks[variant % 3];
    for (let x = 6; x < c.width; x += 16) ctx.fillRect(x, 10, 2, c.height - 10);
    // the roof shadow band
    ctx.fillRect(0, 0, c.width, 10);
    // street grime — the feet of every real tower
    const grad = ctx.createLinearGradient(0, c.height - 70, 0, c.height);
    grad.addColorStop(0, 'rgba(30,26,38,0)');
    grad.addColorStop(1, 'rgba(30,26,38,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, c.height - 70, c.width, 70);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Amber windows on black — the emissiveMap, so tweening one intensity
   *  lights every tower's windows and nothing else. A deterministic mix:
   *  mostly warm, some cooler paper-light, the rare late office still
   *  cyan, whole dark floors (the mechanical bands). */
  private towerWindowsTexture(variant: number): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, c.width, c.height);
    let seed = 13 + variant * 977;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const lit = 0.34 + variant * 0.06;
    for (let y = 24; y < c.height - 16; y += 18) {
      const floorDark = rand() < 0.14; // a mechanical floor, fully unlit
      for (let x = 8; x < c.width - 8; x += 16) {
        if (floorDark || rand() > lit) continue;
        const r = rand();
        ctx.fillStyle = r < 0.05 ? '#9fd8e8' : r < 0.25 ? '#ffd9a0' : '#ffb85c';
        ctx.fillRect(x, y, 7, 10);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Tenement facades — the street-level fabric: brick, three floors of
   *  windows with lintels, a cornice, a storefront with an awning, and a
   *  painted fire escape zigzag. Returns the diffuse + emissive pair. */
  private facadeTexture(variant: number): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
    const bricks = ['#9a5a48', '#8a6a54', '#a88a68'];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const ctx = c.getContext('2d')!;
    const glow = document.createElement('canvas');
    glow.width = 128; glow.height = 256;
    const gtx = glow.getContext('2d')!;
    gtx.fillStyle = '#000000';
    gtx.fillRect(0, 0, 128, 256);
    let seed = 7 + variant * 131;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    // the brick field, with a faint course line every 6 px
    ctx.fillStyle = bricks[variant % 3];
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let y = 4; y < 256; y += 6) ctx.fillRect(0, y, 128, 1);
    // the cornice + parapet
    ctx.fillStyle = '#3a3440';
    ctx.fillRect(0, 0, 128, 12);
    ctx.fillStyle = '#2f2a36';
    ctx.fillRect(0, 12, 128, 5);
    // upper windows: three floors, three bays, stone lintels
    for (let floor = 0; floor < 3; floor++) {
      const y = 34 + floor * 46;
      for (let bay = 0; bay < 3; bay++) {
        const x = 16 + bay * 38;
        ctx.fillStyle = '#4a4148'; // the dark glass of dusk
        ctx.fillRect(x, y, 18, 26);
        ctx.fillStyle = '#d8cdbd'; // the lintel
        ctx.fillRect(x - 2, y - 4, 22, 4);
        ctx.fillRect(x - 2, y + 26, 22, 3);
        if (rand() < 0.45) {
          gtx.fillStyle = rand() < 0.3 ? '#ffd9a0' : '#ffb85c';
          gtx.fillRect(x, y, 18, 26);
        }
      }
    }
    // the storefront: dark glass, an awning band, lit windows
    ctx.fillStyle = '#2f2a36';
    ctx.fillRect(0, 186, 128, 70);
    const awnings = ['#2a9d8f', '#b23a48', '#2a9d8f'];
    ctx.fillStyle = awnings[variant % 3];
    ctx.fillRect(0, 186, 128, 10);
    for (const x of [14, 62, 98]) {
      ctx.fillStyle = '#ffb85c';
      ctx.fillRect(x, 210, 26, 30);
      gtx.fillStyle = '#ffca7a';
      gtx.fillRect(x, 210, 26, 30);
    }
    // the fire escape: a zigzag of dark iron on the left bay
    ctx.strokeStyle = '#241f28';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let floor = 0; floor < 3; floor++) {
      const y = 34 + floor * 46;
      ctx.moveTo(6, y + 24);
      ctx.lineTo(6, y);
      ctx.lineTo(36, y);
      ctx.moveTo(6, y + 24);
      ctx.lineTo(36, y + 24);
    }
    ctx.stroke();
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    const glowTex = new THREE.CanvasTexture(glow);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    return { map, glow: glowTex };
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

  private lambert(color: number): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ color });
    this.disposables.push(m);
    return m;
  }

  /** Lambert with flat shading — the canopy lobes catch the dusk per-face. */
  private lambertFlat(color: number): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ color, flatShading: true });
    this.disposables.push(m);
    return m;
  }

  /** Lambert with a self-glow floor — faces turned from the sun keep their
   *  color instead of dying to black (the skyline's south faces). */
  private lambertEmissive(color: number, intensity: number): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: intensity });
    this.disposables.push(m);
    return m;
  }

  /** The tenement facade materials, built once, one per variant. */
  private facadeMatsCache: THREE.MeshLambertMaterial[] | null = null;
  private getFacadeMats(): THREE.MeshLambertMaterial[] {
    if (!this.facadeMatsCache) {
      this.facadeMatsCache = [0, 1, 2].map((v) => {
        const { map, glow } = this.facadeTexture(v);
        const m = new THREE.MeshLambertMaterial({
          color: 0xffffff,
          map,
          emissive: 0xffffff,
          emissiveMap: glow, // only the shopfronts and some homes glow
          emissiveIntensity: 0.55,
        });
        this.disposables.push(map, glow, m);
        return m;
      });
    }
    return this.facadeMatsCache;
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
   *  cornices. Base sits on the roof at y; wood-dark, coned cap. */
  private waterTank(parent: THREE.Object3D, x: number, y: number, z: number): void {
    const mat = this.lambert(0x5d4a3e);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.75, 8), mat);
    tank.name = 'RideWaterTank';
    tank.position.set(x, y + 0.45, z);
    parent.add(tank);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.42, 8), mat);
    cone.name = 'RideWaterTankCap';
    cone.position.set(x, y + 1.03, z);
    parent.add(cone);
    this.disposables.push(tank.geometry as THREE.BufferGeometry, cone.geometry as THREE.BufferGeometry);
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

    // push-in on the NEW YORK roll, the nose filling the frame
    this.host.rigPos.x = COACH.noseX + 4.2; this.host.rigPos.y = 2.2; this.host.rigPos.z = COACH.z - 3.1;
    this.host.rigLook.x = COACH.noseX + 0.05; this.host.rigLook.y = 2.45; this.host.rigLook.z = COACH.z;
    const t = this.host.tweens;
    t.sequence(
      t.wait(0.25),
      t.parallel(
        t.num(() => this.host.rigPos.x, (v) => { this.host.rigPos.x = v; }, COACH.noseX + 1.4, 2.0),
        t.num(() => this.host.rigPos.y, (v) => { this.host.rigPos.y = v; }, 2.55, 2.0),
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
    // seam so the coach never floats on grass (the old curb's job, wider)
    box('Coach_Apron', tarmac, COACH.cx, 0.0, COACH.z + 0.5, 26, 0.08, 12);
    box('Coach_GateLine', this.lambert(0xd9c98a), COACH.cx, 0.05, COACH.z - 2.4, 16, 0.05, 0.3);

    // the gate behind: a dim terminal face, one lit sign, two light poles —
    // the card lens was staring into empty sky
    box('Gate_Facade', this.lambertEmissive(0x35303e, 0.05), COACH.cx, 4.0, COACH.z + 4.2, 24, 8, 1.4);
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

    // body slab + roof cap (the M121's proportions, one bay over from the
    // house bus — a coach, not a city bus: higher roof, luggage bay)
    box('Coach_Body', body, COACH.cx, 1.45, COACH.z, 9.6, 2.2, 2.3);
    box('Coach_Roof', body, COACH.cx, 2.62, COACH.z, 9.6, 0.14, 2.3);
    box('Coach_Skirt', dark, COACH.cx, 0.5, COACH.z, 9.6, 0.5, 2.32);
    box('Coach_Stripe', teal, COACH.cx, 1.05, COACH.z, 9.64, 0.34, 2.32);
    // the roof AC pod — every interstate coach wears one
    box('Coach_AC', dark, COACH.cx, 2.76, COACH.z, 2.6, 0.16, 1.7);
    // window band: north face (the lens side) + the far face
    box('Coach_GlassN', glass, COACH.cx + 0.4, 2.05, COACH.z - 1.16, 8.2, 0.78, 0.04);
    box('Coach_GlassS', glass, COACH.cx + 0.4, 2.05, COACH.z + 1.16, 8.2, 0.78, 0.04);

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
