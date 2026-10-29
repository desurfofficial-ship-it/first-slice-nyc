/**
 * Cozy 3/4 follow camera — port of main.gd `_update_camera` + TS-02
 * vertical-first framing (Camera3D KEEP_WIDTH counterpart).
 *
 * Reference behavior:
 *   target yaw = PI when the player is south of the street (z < -2.5), else 0
 *   cam position = focus - fwd*9 + (0, 6.5, 0), lerped at 6/s
 *   cam looks at focus (player + 1.2 up)
 *   Z/C (or touch buttons) orbit via cam_turn * 1.5/s
 *   The postcard rig parks the camera and takes over look-at.
 */

import * as THREE from 'three';
import { lerpAngle } from '../player/Player';

const CAM_DIST = 9.0;
const CAM_HEIGHT_BASE = 6.5; // reference value (portrait is the primary orientation)
const FOCUS_UP = 1.2;
const YAW_LERP = 3.0;
const POS_LERP = 6.0;
const TURN_SPEED = 1.5;
const BASE_HFOV = (60 * Math.PI) / 180; // Godot fov 60 with KEEP_WIDTH

export type CameraPose = 'follow' | 'postcard';

export class GameCamera {
  readonly camera: THREE.PerspectiveCamera;
  pose: CameraPose = 'follow';
  camYaw = 0;
  private focusTarget = new THREE.Vector3();
  private rigLook = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    this.camera.position.set(-30, 7, -3);
    this.updateFov(aspect);
  }

  /** KEEP_WIDTH: horizontal FOV is the fixed side (vertical-first on portrait). */
  updateFov(aspect: number): void {
    this.camera.aspect = aspect;
    const vFov = 2 * Math.atan(Math.tan(BASE_HFOV / 2) / aspect);
    this.camera.fov = THREE.MathUtils.clamp((vFov * 180) / Math.PI, 30, 110);
    this.camera.updateProjectionMatrix();
  }

  /** Landscape raises the cozy cam slightly so near walls don't cut the view;
   *  portrait (the primary orientation) keeps the reference value exactly. */
  private heightFor(aspect: number): number {
    return CAM_HEIGHT_BASE + Math.max(0, (aspect - 1) * 1.1);
  }

  /**
   * @param postcardLook when the rig is active: the point to look at
   *   (the gold window, drifted toward the skyline — reference tween target).
   */
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

    const targetYaw = playerPos.z < -2.5 ? Math.PI : 0;
    this.camYaw = lerpAngle(this.camYaw, targetYaw, Math.min(1, dt * YAW_LERP)) + camTurn * dt * TURN_SPEED;

    const fwdX = Math.sin(this.camYaw);
    const fwdZ = Math.cos(this.camYaw);
    this.focusTarget.set(playerPos.x, playerPos.y + FOCUS_UP, playerPos.z);

    const camH = this.heightFor(this.camera.aspect);
    const desiredX = this.focusTarget.x - fwdX * CAM_DIST;
    const desiredY = this.focusTarget.y + camH;
    const desiredZ = this.focusTarget.z - fwdZ * CAM_DIST;

    const k = Math.min(1, dt * POS_LERP);
    this.camera.position.x += (desiredX - this.camera.position.x) * k;
    this.camera.position.y += (desiredY - this.camera.position.y) * k;
    this.camera.position.z += (desiredZ - this.camera.position.z) * k;
    this.camera.lookAt(this.focusTarget);
  }

  snapBehind(playerPos: { x: number; y: number; z: number }) {
    const fwdX = Math.sin(this.camYaw);
    const fwdZ = Math.cos(this.camYaw);
    this.camera.position.set(
      playerPos.x - fwdX * CAM_DIST,
      playerPos.y + FOCUS_UP + this.heightFor(this.camera.aspect),
      playerPos.z - fwdZ * CAM_DIST,
    );
    this.focusTarget.set(playerPos.x, playerPos.y + FOCUS_UP, playerPos.z);
    this.camera.lookAt(this.focusTarget);
  }
}
