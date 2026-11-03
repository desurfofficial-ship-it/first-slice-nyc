/**
 * Cozy 3/4 follow camera — port of main.gd `_update_camera` + TS-02
 * vertical-first framing (Camera3D KEEP_WIDTH counterpart).
 *
 * Manual orbit (Z/C, Q/E, touch) wins over street-side auto-yaw while held.
 *
 * See full history in git; this file was restored after an accidental
 * PLACEHOLDER write. Includes setCanopies() for docs/51 B6.
 */

import * as THREE from 'three';
import { lerpAngle } from '../player/Player';
import type { AABB } from '../engine/collide';

const CAM_DIST = 8.0;
const CAM_HEIGHT_BASE = 6.0;
const PORTRAIT_DIST_K = 0.75;
const PORTRAIT_HEIGHT_K = 0.82;
const FOCUS_UP = 1.2;
const YAW_LERP = 3.0;
const POS_LERP = 6.0;
const TURN_SPEED = 2.4;
const BASE_HFOV = (60 * Math.PI) / 180;
const MAX_VFOV = 80;
const FLIP_SOUTH = -3.1;
const FLIP_NORTH = -1.9;
const BOOM_MARGIN = 0.35;
const CAM_Z_REL_MIN = -5.5;
const CAM_Z_REL_MAX = 5.5;
const STREET_BAND = 12;
const BOOM_FLOOR = 4.6;
const CANOPY_CLEAR = 0.45;
const SIDE_LADDER = [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, 2.8, -2.8, 3.5, -3.5];
const SIDE_LERP = 2.5;
const FADE_MARGIN = 0.15;
const FADE_SOFT = 0.8;
const FLIP_ANGLE = 1.6;
const TURNED_AROUND = 1.8;

export interface CanopySphere { x: number; y: number; z: number; r: number; }
export type CameraPose = 'follow' | 'postcard';

function wrapPi(a: number): number {
  let d = a % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class GameCamera {
  readonly camera: THREE.PerspectiveCamera;
  get pose(): CameraPose { return this._pose; }
  set pose(p: CameraPose) {
    if (p !== this._pose) {
      this._pose = p;
      this.resyncRef = true;
    }
  }
  private _pose: CameraPose = 'follow';
  camYaw = 0;
  moveYaw = 0;
  private wasMoving = false;
  private flipping = false;
  private resyncRef = true;
  private yawSide: 0 | 1 = 0;
  private boxes: AABB[] | null = null;
  private canopies: CanopySphere[] | null = null;
  private sideStep = 0;
  /** Per-canopy occlusion 0..1. Call setCanopies() if World adds trees later (B6). */
  occlusion: Float32Array;
  private focusTarget = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private probe = new THREE.Vector3();
  private rigLook = new THREE.Vector3();

  constructor(aspect: number, colliders?: AABB[], canopies?: CanopySphere[]) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    this.camera.position.set(-30, 7, -3);
    this.boxes = colliders ?? null;
    this.canopies = canopies ?? null;
    this.occlusion = new Float32Array(this.canopies?.length ?? 0);
    this.updateFov(aspect);
  }

  /**
   * Refresh canopy list after World grows more trees. Grows the occlusion
   * buffer when needed; returns the buffer so caller can re-bind
   * world.canopyOcclusion (docs/51 B6).
   */
  setCanopies(canopies: CanopySphere[] | null): Float32Array {
    this.canopies = canopies;
    const n = canopies?.length ?? 0;
    if (n > this.occlusion.length) {
      this.occlusion = new Float32Array(n);
    } else if (n < this.occlusion.length) {
      this.occlusion.fill(0, n);
    }
    return this.occlusion;
  }

  updateFov(aspect: number): void {
    this.camera.aspect = aspect;
    const vFov = 2 * Math.atan(Math.tan(BASE_HFOV / 2) / aspect);
    this.camera.fov = THREE.MathUtils.clamp((vFov * 180) / Math.PI, 30, MAX_VFOV);
    this.camera.updateProjectionMatrix();
  }

  private heightFor(aspect: number): number {
    const h = CAM_HEIGHT_BASE + Math.max(0, (aspect - 1) * 1.1);
    return aspect < 1 ? h * PORTRAIT_HEIGHT_K : h;
  }

  private distFor(aspect: number): number {
    return aspect < 1 ? CAM_DIST * PORTRAIT_DIST_K : CAM_DIST;
  }

  private segSphereDist2(
    ax: number, ay: number, az: number, bx: number, by: number, bz: number,
    c: CanopySphere,
  ): number {
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = c.x - ax, acy = c.y - ay, acz = c.z - az;
    const len2 = abx * abx + aby * aby + abz * abz;
    let t = len2 > 1e-6 ? (acx * abx + acy * aby + acz * abz) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const dx = abx * t - acx, dy = aby * t - acy, dz = abz * t - acz;
    return dx * dx + dy * dy + dz * dz;
  }

  private pickSideStep(focus: THREE.Vector3, desired: THREE.Vector3): number {
    if (!this.canopies || this.canopies.length === 0) return 0;
    const clears = (dx: number): boolean => {
      const ax = desired.x + dx;
      for (const c of this.canopies!) {
        const rr = c.r + CANOPY_CLEAR;
        if (this.segSphereDist2(ax, desired.y, desired.z, focus.x, focus.y, focus.z, c) < rr * rr) return false;
      }
      return true;
    };
    for (const dx of SIDE_LADDER) if (clears(dx)) return dx;
    let best = 0, bestD = -1;
    for (const dx of SIDE_LADDER) {
      let worst = Infinity;
      const ax = desired.x + dx;
      for (const c of this.canopies!) {
        const d2 = this.segSphereDist2(ax, desired.y, desired.z, focus.x, focus.y, focus.z, c);
        if (d2 < worst) worst = d2;
      }
      if (worst > bestD) { bestD = worst; best = dx; }
    }
    return best;
  }

  private computeDesired(playerPos: { x: number; y: number; z: number }): number {
    const fwdX = Math.sin(this.camYaw);
    const fwdZ = Math.cos(this.camYaw);
    this.focusTarget.set(playerPos.x, playerPos.y + FOCUS_UP, playerPos.z);
    const dist = this.distFor(this.camera.aspect);
    const camH = this.heightFor(this.camera.aspect);
    this.desired.set(
      this.focusTarget.x - fwdX * dist,
      this.focusTarget.y + camH,
      this.focusTarget.z - fwdZ * dist,
    );
    if (Math.abs(playerPos.z) < STREET_BAND) {
      const relZ = this.desired.z - playerPos.z;
      this.desired.z = playerPos.z + THREE.MathUtils.clamp(relZ, CAM_Z_REL_MIN, CAM_Z_REL_MAX);
    }
    const hdx = this.desired.x - this.focusTarget.x;
    const hdz = this.desired.z - this.focusTarget.z;
    const hd = Math.hypot(hdx, hdz);
    if (hd < BOOM_FLOOR && hd > 1e-4) {
      const s = BOOM_FLOOR / hd;
      this.desired.x = this.focusTarget.x + hdx * s;
      this.desired.z = this.focusTarget.z + hdz * s;
    }
    return this.pickSideStep(this.focusTarget, this.desired);
  }

  private updateOcclusion(): void {
    const n = this.occlusion.length;
    if (n === 0 || !this.canopies) return;
    const c = this.camera.position;
    for (let i = 0; i < n; i++) {
      const d2 = this.segSphereDist2(c.x, c.y, c.z, this.focusTarget.x, this.focusTarget.y, this.focusTarget.z, this.canopies[i]);
      const clear = Math.sqrt(d2) - this.canopies[i].r - FADE_MARGIN;
      this.occlusion[i] = THREE.MathUtils.clamp(1 - clear / FADE_SOFT, 0, 1);
    }
  }

  private shortenBoom(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
    if (!this.boxes || this.boxes.length === 0) return to;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.001) return to;
    let bestT = 1;
    for (const b of this.boxes) {
      if (b.maxY <= from.y + 0.2) continue;
      if (b.seeThroughCamera) continue;
      let tmin = 0, tmax = 1;
      let miss = false;
      const axes: Array<[number, number, number, number]> = [
        [from.x, dx, b.minX, b.maxX],
        [from.y, dy, b.minY, b.maxY],
        [from.z, dz, b.minZ, b.maxZ],
      ];
      for (const [o, d, mn, mx] of axes) {
        if (Math.abs(d) < 1e-9) {
          if (o < mn || o > mx) { miss = true; break; }
          continue;
        }
        let t1 = (mn - o) / d, t2 = (mx - o) / d;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) { miss = true; break; }
      }
      if (miss || tmax < 0) continue;
      const t = Math.max(tmin, 0);
      if (t < bestT) bestT = t;
    }
    if (bestT >= 1) return to;
    const pull = Math.max(0.12, bestT - BOOM_MARGIN / len);
    return this.probe.set(from.x + dx * pull, from.y + dy * pull, from.z + dz * pull).clone();
  }

  interiorMode = false;

  update(
    dt: number,
    playerPos: { x: number; y: number; z: number },
    camTurn: number,
    move: { x: number; y: number },
    heading: number,
    rigPosition?: { x: number; y: number; z: number },
    rigLook?: { x: number; y: number; z: number },
  ): void {
    if (this.resyncRef) {
      this.moveYaw = this.camYaw;
      this.wasMoving = false;
      this.resyncRef = false;
    }

    if (this.pose === 'postcard' && rigPosition && rigLook) {
      this.rigLook.set(rigLook.x, rigLook.y, rigLook.z);
      this.camera.position.set(rigPosition.x, rigPosition.y, rigPosition.z);
      this.camera.lookAt(this.rigLook);
      return;
    }

    const onStreet = Math.abs(playerPos.z) < STREET_BAND;
    if (onStreet) {
      if (playerPos.z < FLIP_SOUTH) this.yawSide = 1;
      else if (playerPos.z > FLIP_NORTH) this.yawSide = 0;
    }
    const streetYaw = this.yawSide === 1 ? Math.PI : 0;
    const targetYaw = onStreet ? streetYaw : heading;
    const moving = Math.hypot(move.x, move.y) > 0.1;
    const manual = Math.abs(camTurn) > 0.01;

    if (manual) {
      const dth = camTurn * dt * TURN_SPEED;
      this.camYaw += dth;
      this.moveYaw += dth;
      this.flipping = false;
    } else if (!moving) {
      this.flipping = false;
      const settle = onStreet
        ? (Math.abs(wrapPi(heading - streetYaw)) > TURNED_AROUND ? heading : streetYaw)
        : heading;
      this.camYaw = lerpAngle(this.camYaw, settle, Math.min(1, dt * YAW_LERP));
      this.moveYaw = this.camYaw;
    } else {
      if (!this.wasMoving) this.moveYaw = this.camYaw;
      if (onStreet) {
        if (Math.abs(wrapPi(targetYaw - this.camYaw)) > FLIP_ANGLE) this.flipping = true;
        if (this.flipping) {
          this.camYaw = lerpAngle(this.camYaw, targetYaw, Math.min(1, dt * YAW_LERP));
          if (Math.abs(wrapPi(targetYaw - this.camYaw)) < 0.05) this.flipping = false;
        }
      } else {
        this.flipping = false;
      }
    }
    this.wasMoving = moving;

    const rawDx = this.computeDesired(playerPos);
    this.sideStep += (rawDx - this.sideStep) * Math.min(1, dt * SIDE_LERP);
    if (Math.abs(rawDx - this.sideStep) < 0.02) this.sideStep = rawDx;
    this.desired.x += this.sideStep;

    const k = Math.min(1, dt * POS_LERP);
    const goal = this.interiorMode ? this.desired : this.shortenBoom(this.focusTarget, this.desired);
    this.camera.position.x += (goal.x - this.camera.position.x) * k;
    this.camera.position.y += (goal.y - this.camera.position.y) * k;
    this.camera.position.z += (goal.z - this.camera.position.z) * k;
    this.camera.lookAt(this.focusTarget);
    this.updateOcclusion();
  }

  snapBehind(playerPos: { x: number; y: number; z: number }) {
    this.sideStep = this.computeDesired(playerPos);
    this.desired.x += this.sideStep;
    const goal = this.shortenBoom(this.focusTarget, this.desired);
    this.camera.position.copy(goal);
    this.camera.lookAt(this.focusTarget);
    this.updateOcclusion();
    this.moveYaw = this.camYaw;
  }
}
