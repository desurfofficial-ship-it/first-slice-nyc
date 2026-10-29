/**
 * Cozy 3/4 follow camera — port of main.gd `_update_camera` + TS-02
 * vertical-first framing (Camera3D KEEP_WIDTH counterpart).
 *
 * Manual orbit (Z/C, Q/E, touch) wins over street-side auto-yaw while held.
 *
 * Playtest 2026-10-30: "when you curving or wants to move to the opposite
 * direction on the other side, it's confusing — maybe make it rotate too."
 * The old auto-yaw lerped toward the street-side target EVEN while the
 * player held a movement key, so mid-walk the camera-relative input basis
 * rotated under their thumbs: crossing the street, "S" quietly became "W"
 * and the character veered or turned around. Now:
 *   - moving  → the yaw only auto-rotates for a real "get behind me" flip
 *     (> FLIP_ANGLE away), and the MOVEMENT reference (`moveYaw`) stays
 *     frozen while it swings — held keys keep meaning the same world
 *     direction; the camera rotates around you, not under you.
 *   - idle    → the yaw settles onto the street side (or behind where you
 *     last faced, if you had turned around), and the reference re-syncs.
 *     Settling while standing can't veer anything.
 *   - manual  → orbit rotates both (steering works exactly as before).
 */

import * as THREE from 'three';
import { lerpAngle } from '../player/Player';
import type { AABB } from '../engine/collide';

const CAM_DIST = 9.0;
const CAM_HEIGHT_BASE = 6.5;
const FOCUS_UP = 1.2;
const YAW_LERP = 3.0;
const POS_LERP = 6.0;
const TURN_SPEED = 2.4;
const BASE_HFOV = (60 * Math.PI) / 180;
const MAX_VFOV = 91;
const FLIP_SOUTH = -3.1;
const FLIP_NORTH = -1.9;
const BOOM_MARGIN = 0.35;
/** Only a misalignment larger than this (~92°) is worth an auto-flip while
 *  the player is walking — anything less keeps the stable street-side view. */
const FLIP_ANGLE = 1.6;
/** When idle, settle behind the player's last heading if it disagrees with
 *  the street-side yaw by more than this (~103°) — "I turned around". */
const TURNED_AROUND = 1.8;

export type CameraPose = 'follow' | 'postcard';

function wrapPi(a: number): number {
  let d = a % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class GameCamera {
  readonly camera: THREE.PerspectiveCamera;
  /** Camera pose. Switching poses re-syncs the movement reference, so a
   *  postcard never leaves a stale basis behind. */
  get pose(): CameraPose { return this._pose; }
  set pose(p: CameraPose) {
    if (p !== this._pose) {
      this._pose = p;
      this.resyncRef = true;
    }
  }
  private _pose: CameraPose = 'follow';
  camYaw = 0;
  /** The yaw the PLAYER's keys are relative to. Tracks camYaw except while
   *  an auto-flip swings the camera mid-walk — Game feeds this to the
   *  walker (player.camYaw), which is why crossing the street no longer
   *  turns "hold S" into "walk back north". */
  moveYaw = 0;
  private wasMoving = false;
  /** A get-behind-me flip, once started, runs to completion — the FLIP_ANGLE
   *  gate only ARMS it (starting a swing for every 100° stray would jitter);
   *  without this the swing dies at ~92° and the camera never gets behind you. */
  private flipping = false;
  private resyncRef = true;
  private yawSide: 0 | 1 = 0;
  private boxes: AABB[] | null = null;
  private focusTarget = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private probe = new THREE.Vector3();
  private rigLook = new THREE.Vector3();

  constructor(aspect: number, colliders?: AABB[]) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    this.camera.position.set(-30, 7, -3);
    this.boxes = colliders ?? null;
    this.updateFov(aspect);
  }

  updateFov(aspect: number): void {
    this.camera.aspect = aspect;
    const vFov = 2 * Math.atan(Math.tan(BASE_HFOV / 2) / aspect);
    this.camera.fov = THREE.MathUtils.clamp((vFov * 180) / Math.PI, 30, MAX_VFOV);
    this.camera.updateProjectionMatrix();
  }

  private heightFor(aspect: number): number {
    return CAM_HEIGHT_BASE + Math.max(0, (aspect - 1) * 1.1);
  }

  private shortenBoom(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
    if (!this.boxes || this.boxes.length === 0) return to;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.001) return to;
    let bestT = 1;
    for (const b of this.boxes) {
      if (b.maxY <= from.y + 0.2) continue;
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

    if (playerPos.z < FLIP_SOUTH) this.yawSide = 1;
    else if (playerPos.z > FLIP_NORTH) this.yawSide = 0;
    const targetYaw = this.yawSide === 1 ? Math.PI : 0;
    const moving = Math.hypot(move.x, move.y) > 0.1;
    const manual = Math.abs(camTurn) > 0.01;

    if (manual) {
      // Manual orbit wins while turning — do not fight the player.
      const dth = camTurn * dt * TURN_SPEED;
      this.camYaw += dth;
      this.moveYaw += dth;
      this.flipping = false;
    } else if (!moving) {
      // Settle while standing still — a flip can't veer anything mid-stride.
      // If the player had turned to walk back the way they came, get behind
      // THAT heading instead of the street default (playtest: the camera sat
      // in their face after every about-face).
      this.flipping = false;
      const settle = Math.abs(wrapPi(heading - targetYaw)) > TURNED_AROUND ? heading : targetYaw;
      this.camYaw = lerpAngle(this.camYaw, settle, Math.min(1, dt * YAW_LERP));
      this.moveYaw = this.camYaw;
    } else {
      // Fresh press → keys mean where the camera looks right now.
      if (!this.wasMoving) this.moveYaw = this.camYaw;
      // While walking, only swing for a real get-behind-me flip — and keep
      // the movement reference frozen so held keys keep their meaning.
      if (Math.abs(wrapPi(targetYaw - this.camYaw)) > FLIP_ANGLE) this.flipping = true;
      if (this.flipping) {
        this.camYaw = lerpAngle(this.camYaw, targetYaw, Math.min(1, dt * YAW_LERP));
        if (Math.abs(wrapPi(targetYaw - this.camYaw)) < 0.05) this.flipping = false;
      }
    }
    this.wasMoving = moving;

    const fwdX = Math.sin(this.camYaw);
    const fwdZ = Math.cos(this.camYaw);
    this.focusTarget.set(playerPos.x, playerPos.y + FOCUS_UP, playerPos.z);

    const camH = this.heightFor(this.camera.aspect);
    this.desired.set(
      this.focusTarget.x - fwdX * CAM_DIST,
      this.focusTarget.y + camH,
      this.focusTarget.z - fwdZ * CAM_DIST,
    );

    const k = Math.min(1, dt * POS_LERP);
    const goal = this.shortenBoom(this.focusTarget, this.desired);
    this.camera.position.x += (goal.x - this.camera.position.x) * k;
    this.camera.position.y += (goal.y - this.camera.position.y) * k;
    this.camera.position.z += (goal.z - this.camera.position.z) * k;
    this.camera.lookAt(this.focusTarget);
  }

  snapBehind(playerPos: { x: number; y: number; z: number }) {
    const fwdX = Math.sin(this.camYaw);
    const fwdZ = Math.cos(this.camYaw);
    this.focusTarget.set(playerPos.x, playerPos.y + FOCUS_UP, playerPos.z);
    const camH = this.heightFor(this.camera.aspect);
    this.desired.set(
      playerPos.x - fwdX * CAM_DIST,
      playerPos.y + FOCUS_UP + camH,
      playerPos.z - fwdZ * CAM_DIST,
    );
    const goal = this.shortenBoom(this.focusTarget, this.desired);
    this.camera.position.copy(goal);
    this.camera.lookAt(this.focusTarget);
    this.moveYaw = this.camYaw;
  }
}
