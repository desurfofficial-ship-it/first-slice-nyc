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
 * The dip-to-black cut swaps it for the parked coach at the BUS-02 bay,
 * which the player then steps off. Every mesh this module builds lives in
 * one group and is disposed on cleanup. The window frame + seat back are
 * parented to the CAMERA (parallax-free interior) — the camera is added
 * to the scene for them and stays there, childless, after cleanup.
 *
 * Parallax law (the second draft's lesson): far things slide slow, near
 * things slide fast. The skyline never slides at all — it is 17 m out and
 * 30 m tall, so it reads as "far off" and stays put while the near city
 * glides past. The strip carries countryside + city blocks at bus speed.
 */

import * as THREE from 'three';
import { Tweens } from '../engine/tweens';
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
  /** The Game's postcard-rig targets — driven live while active. */
  rigPos: { x: number; y: number; z: number };
  rigLook: { x: number; y: number; z: number };
  player: { capsule: { x: number; y: number; z: number }; rotationY: number };
  playerVisual: THREE.Object3D;
  rosa: THREE.Group;
  /** The parked coach door slides open for the step-off. */
  openCoachDoor(): void;
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

export class ArrivalCinematic {
  readonly machine = new ArrivalMachine();
  private host: ArrivalHost;
  private group: THREE.Group | null = null;
  private strip: THREE.Group | null = null;
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
    // and the parked coach hides while "we" are still riding it
    this.setCoachVisible(false);

    const mats = {
      grass: this.lambert(0x6a8f5a),
      grassDark: this.lambert(0x5d7d4a),
      wood: this.lambert(0x6d5344),
      hill: this.lambert(0x7d9a6a),
      wall: this.lambert(0xcbb9a2),
      roof: this.lambert(PAL.brick),
      tower: this.lambertEmissive(0x6b5d76, 0.3),
      road: this.lambert(0x8d8577),
      frame: this.lambert(PAL.ink),
      seat: this.lambert(0x4a5568),
    };

    const box = (parent: THREE.Object3D, name: string, mat: THREE.Material,
      x: number, y: number, z: number, w: number, h: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.name = name;
      m.position.set(x, y, z);
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
    // and reach back toward the skyline's feet
    box(strip, 'RideGround', mats.grass, 0, -0.2, -5, 44, 0.4, 18);
    box(strip, 'RideRoad', mats.road, 0, 0.02, 3.2, 44, 0.06, 2.4);

    // fence line on the near shoulder
    for (let i = 0; i < 10; i++) {
      box(strip, `RideFencePost${i}`, mats.wood, -12 + i * 2.1, 0.55, 2.7, 0.12, 1.1, 0.12);
    }
    box(strip, 'RideFenceRail', mats.wood, -2.5, 0.85, 2.7, 19, 0.09, 0.09);

    // trees — trunk + stacked canopy (the house style), varied heights
    const tree = (x: number, s: number) => {
      box(strip, 'RideTreeTrunk', mats.wood, x, 0.9 * s, -0.8, 0.22 * s, 1.8 * s, 0.22 * s);
      box(strip, 'RideTreeTop', mats.grassDark, x, 2.2 * s, -0.8, 1.5 * s, 1.2 * s, 1.5 * s);
      box(strip, 'RideTreeCrown', mats.grassDark, x, 3.0 * s, -0.8, 0.9 * s, 0.8 * s, 0.9 * s);
    };
    tree(-10, 0.9); tree(-6, 1.15); tree(-2, 0.8); tree(2, 1.05); tree(5.5, 0.85);

    // hills on the horizon band
    box(strip, 'RideHillA', mats.hill, -8, 1.4, -4.8, 14, 2.8, 2);
    box(strip, 'RideHillB', mats.hill, 3, 1.8, -4.8, 10, 3.6, 2);

    // two farmhouses with pitched roofs
    const house = (x: number, z: number, s: number) => {
      box(strip, 'RideHouse', mats.wall, x, 1.1 * s, z, 2.6 * s, 2.2 * s, 2.2 * s);
      const roofM = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.9 * s, 1.3 * s, 4), mats.roof);
      roofM.name = 'RideHouseRoof';
      roofM.rotation.y = Math.PI / 4;
      roofM.position.set(x, 2.85 * s, z);
      strip.add(roofM);
      this.disposables.push(roofM.geometry as THREE.BufferGeometry);
    };
    house(-8.5, -2.4, 0.9);
    house(3.5, -2.2, 1.1);

    // the city rolls in ahead — blocks enter the window late in the ride
    // (the last block stopped at the dialogue freeze as a blank wall that
    // filled the window's right third — four blocks fill the frame kindly)
    const blocks: Array<[number, number, number]> = [
      [4.5, 8, 3.2], [7.5, 11.5, 3.4], [10.5, 9, 3.0], [13.5, 13, 3.6],
    ];
    for (const [x, h, w] of blocks) {
      box(strip, 'RideBlock', mats.tower, x, h / 2, -3.2, w, h, 2.6);
    }

    // --- the skyline: STATIC (far off = no parallax), lights up at ~4 s ---
    // World space, added to the GROUP (never to the strip): 40 m out, the
    // towers read as a distant band and hold still while the near world glides.
    // Windows are BAKED into the towers' texture — the light-up beat tweens
    // one material's emissiveIntensity and the whole skyline wakes at once.
    const skyline = new THREE.Group();
    skyline.name = 'RideSkyline';
    skyline.position.set(RIDE_POS.x, 0, SKYLINE_Z);
    g.add(skyline);
    const towerTex = this.towerBodyTexture();
    const towerWin = this.towerWindowsTexture();
    const towerMat = new THREE.MeshLambertMaterial({
      map: towerTex,
      emissive: 0xffffff,
      emissiveMap: towerWin, // black body, amber windows — only windows glow
      emissiveIntensity: 0.18, // dusk-dark until the city lights come on
    });
    this.disposables.push(towerTex, towerWin, towerMat);
    this.host.tweens.sequence(
      this.host.tweens.wait(3.6),
      this.host.tweens.num(
        () => towerMat.emissiveIntensity,
        (v) => { towerMat.emissiveIntensity = v; },
        1.1, 2.4,
      ),
    );
    const towers: Array<[number, number, number]> = [
      [-11, 22, 3.4], [-7, 30, 3.0], [-3, 20, 3.2], [1, 26, 3.4],
      [5, 33, 3.2], [9, 21, 3.0], [12.5, 28, 3.4],
    ];
    for (const [x, h, w] of towers) {
      box(skyline, 'RideTower', towerMat, x, h / 2, 0, w, h, 2.4);
    }
    box(skyline, 'RideSpire', this.lambertEmissive(0x6b5d76, 0.3), 5, 38, 0, 0.7, 11, 0.7);
    box(skyline, 'RideSpireTip', this.lambertEmissive(0x6b5d76, 0.3), 5, 44.5, 0, 0.14, 3.4, 0.14);

    // --- the window frame + seat back ride WITH the camera ----------------
    // At 0.55 m out the pieces hug the screen edges in any aspect. The real
    // FOVs: ±30° horizontal, ±18° vertical at 16:9 — so mullions sit at
    // ±0.29, header/sill at ±0.17 (tan of the half-angles × 0.55).
    const frame = new THREE.Group();
    frame.name = 'RideWindowFrame';
    const framePart = (name: string, mat: THREE.Material,
      x: number, y: number, z: number, w: number, h: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.name = name;
      m.position.set(x, y, z);
      frame.add(m);
      this.disposables.push(m.geometry as THREE.BufferGeometry);
      return m;
    };
    framePart('MullionL', mats.frame, -0.29, 0, -0.55, 0.07, 1.2, 0.1);
    framePart('MullionR', mats.frame, 0.29, 0, -0.55, 0.07, 1.2, 0.1);
    framePart('Header', mats.frame, 0, 0.17, -0.55, 0.66, 0.08, 0.1);
    framePart('Sill', mats.frame, 0, -0.17, -0.55, 0.66, 0.08, 0.1);
    framePart('SeatBack', mats.seat, 0, -0.32, -0.34, 0.6, 0.3, 0.14);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8), mats.frame);
    rail.name = 'Rail';
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 0.13, -0.5);
    frame.add(rail);
    this.disposables.push(rail.geometry as THREE.BufferGeometry);
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

  /** Tower body — plain dusk face with a roof-shadow band. */
  private towerBodyTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#6b5d76';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#5d5168'; // roof shadow band
    ctx.fillRect(0, 0, c.width, 14);
    return new THREE.CanvasTexture(c);
  }

  /** Amber windows on black — the emissiveMap, so tweening one intensity
   *  lights every tower's windows and nothing else. Deterministic grid. */
  private towerWindowsTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, c.width, c.height);
    // deterministic window grid — the autotest law: no dice in the build
    let seed = 13;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    ctx.fillStyle = '#ffb85c';
    for (let y = 26; y < c.height - 10; y += 18) {
      for (let x = 10; x < c.width - 8; x += 16) {
        if (rand() < 0.5) ctx.fillRect(x, y, 7, 9);
      }
    }
    return new THREE.CanvasTexture(c);
  }

  private lambert(color: number): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ color });
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

  // ------------------------------------------------------- the arrival card --

  /** Dip to black → the parked coach at the bay, door sliding open → the
   *  destination-roll push-in → the title. */
  private async playArrivalCard(): Promise<void> {
    const run = this.runId;
    await this.host.ui.fadeOut(350);
    if (run !== this.runId || !this.active) return;
    this.teardownRide();
    this.setCoachVisible(true);
    this.host.ui.cineVisible(); // the bars stay — the frame is the terminal now

    // push-in on the NEW YORK roll, the nose filling the frame
    this.host.rigPos.x = -40.5; this.host.rigPos.y = 2.35; this.host.rigPos.z = 3.05;
    this.host.rigLook.x = -35.85; this.host.rigLook.y = 2.7; this.host.rigLook.z = 3.05;
    const t = this.host.tweens;
    t.sequence(
      t.wait(0.25),
      t.parallel(
        t.num(() => this.host.rigPos.x, (v) => { this.host.rigPos.x = v; }, -37.3, 2.0),
        t.num(() => this.host.rigPos.y, (v) => { this.host.rigPos.y = v; }, 2.75, 2.0),
      ),
      t.call(() => this.host.openCoachDoor()),
    );
    await this.host.ui.fadeIn(450);
    if (run !== this.runId || !this.active) return;
    this.host.ui.cineTitle();
  }

  // -------------------------------------------------------------- handover --

  /** Step off the coach: the player by the door, Rosa waving up the
   *  sidewalk, HUD + Map note, follow camera with clean air behind. */
  private handover(): void {
    this.runId++; // any in-flight arrival card is now stale
    this.teardownRide();
    this.setCoachVisible(true);
    this.host.ui.cineHide();
    this.host.ui.cineHideBox();

    const p = this.host.player.capsule;
    // (−34.2, 6.3): just north of the coach door, CLEAR of the luggage
    // cart's collider (x −35.95..−35.05, z 4.9..5.5) — the first spawn
    // (−34.6, 5.7) clipped its corner and the player stood ON the cart,
    // jamming the fresh follow camera into their own back.
    p.x = -34.2; p.y = 0.05; p.z = 6.3;
    // Facing 1.95 rad — east, down the sidewalk, Rosa just left of the nose.
    // This is a CAMERA law, not a staging whim: the street-side settle
    // (GameCamera: idle yaw → 0) puts the lens SOUTH of the player, and at
    // this spawn the coach stands between — its boom ray hits the coach and
    // collapses to ~2.3 m of neck-cam. A heading past TURNED_AROUND (1.8)
    // makes the settle keep the player's own heading, so the lens stays in
    // the clear air west of the bay.
    this.host.player.rotationY = 1.95;
    this.host.playerVisual.visible = true;
    this.host.playerVisual.position.set(p.x, p.y, p.z);
    this.host.playerVisual.rotation.y = this.host.player.rotationY;

    // Rosa takes up the wave until you meet her (the meet walk flips it off)
    const rig = this.host.rosa.userData.rig as { mode: string } | undefined;
    if (rig) rig.mode = 'wave';

    // follow camera from clean air — west of the door, looking east down
    // the sidewalk; the corridor clamp keeps the boom in the street band
    this.host.cam.pose = 'follow';
    this.host.cam.camYaw = Math.PI / 2;
    this.host.cam.snapBehind({ x: p.x, y: p.y, z: p.z });

    this.host.ui.showGame();
    this.host.onHandover();
    this.machine.finish();
    this.lastPhase = 'off';
  }

  // --------------------------------------------------------------- helpers --

  /** The coach group is named in firstSession.ts. */
  private setCoachVisible(visible: boolean): void {
    this.host.scene.traverse((o) => {
      if (o.name === 'ArrivalCoach') o.visible = visible;
    });
  }

  /** Remove + dispose everything this module built (idempotent). */
  private teardownRide(): void {
    if (this.windowFrame) {
      this.host.cam.camera.remove(this.windowFrame);
      this.windowFrame = null;
    }
    this.strip = null;
    if (this.group) {
      this.host.scene.remove(this.group);
      for (const d of this.disposables) d.dispose();
      this.disposables = [];
      this.group = null;
    }
  }
}
