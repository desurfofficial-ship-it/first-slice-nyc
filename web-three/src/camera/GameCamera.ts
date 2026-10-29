/**
 * Cozy 3/4 follow camera — port of main.gd `_update_camera` + TS-02
 * vertical-first framing (Camera3D KEEP_WIDTH counterpart).
 *
 * Manual orbit (Z/C, Q/E, touch) wins over street-side auto-yaw while held.
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

export type CameraPose = 'follow' | 'postcard';

export class GameCamera {
  readonly camera: THREE.PerspectiveCamera;
  pose: CameraPose = 'follow';
  camYaw = 0;
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
    rigPosition?: { x: number; y: number; z: number },
    rigLook?: { x: number; y: number; z: number },
  ): void {
    if (this.pose === 'postcard' && rigPosition && rigLook) {
      this.rigLook.set(rigLook.x, rigLook.y, rigLook.z);
      this.camera.position.set(rigPosition.x, rigPosition.y, rigPosition.z);
      this.camera.lookAt(this.rigLook);
      return;
    }

    if (playerPos.z < FLIP_SOUTH) this.yawSide = 1;
    else if (playerPos.z > FLIP_NORTH) this.yawSide = 0;
    const targetYaw = this.yawSide === 1 ? Math.PI : 0;
    // Manual orbit wins while turning — do not fight the player
    if (Math.abs(camTurn) > 0.01) {
      this.camYaw += camTurn * dt * TURN_SPEED;
    } else {
      this.camYaw = lerpAngle(this.camYaw, targetYaw, Math.min(1, dt * YAW_LERP));
    }

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
  }
}
