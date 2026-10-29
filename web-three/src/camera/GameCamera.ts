import * as THREE from "three";

/**
 * GameCamera — one camera, three poses (TS-02 / Doc 15). Ported from the
 * oracle's `_update_camera()`:
 *   FOLLOW: yaw settles to PI on the south side, 0 on the north; camera rides
 *           focus − fwd·9 + (0, 6.5, 0), position lerped at delta·6.
 *   LOOK:   Z/C add cam_turn (yaw drifts at turn·1.5·delta).
 *   POSTCARD: M6 — port the FIXED rig end (11.5, 10.0, −5.2) from Doc 24,
 *           never the old inside-the-wall one.
 */
export type CameraPose = "FOLLOW" | "LOOK" | "POSTCARD";

export class GameCamera {
  readonly camera: THREE.PerspectiveCamera;
  pose: CameraPose = "FOLLOW";
  yaw = 0;
  turn = 0; // −1..1 from the Z/C keys

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 300);
  }

  /** Oracle pose logic. focus = the player's chest. */
  update(dt: number, playerPos: THREE.Vector3): void {
    if (this.pose === "POSTCARD") return; // M6: the authored rig owns the camera
    const targetYaw = playerPos.z < -2.5 ? Math.PI : 0;
    this.yaw = lerpAngle(this.yaw, targetYaw, clamp(dt * 3, 0, 1)) + this.turn * dt * 1.5;
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const focus = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const want = focus.clone().sub(fwd.multiplyScalar(9)).add(new THREE.Vector3(0, 6.5, 0));
    this.camera.position.lerp(want, clamp(dt * 6, 0, 1));
    this.camera.lookAt(focus);
  }

  snapBehind(playerPos: THREE.Vector3): void {
    this.yaw = playerPos.z < -2.5 ? Math.PI : 0;
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const focus = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
    this.camera.position.copy(focus.sub(fwd.multiplyScalar(9)).add(new THREE.Vector3(0, 6.5, 0)));
    this.camera.lookAt(focus);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
