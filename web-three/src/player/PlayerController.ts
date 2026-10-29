import type * as THREE from "three";

/**
 * PlayerController — camera-relative WASD + touch, gravity, ladders (M3).
 * The oracle is greybox-godot/scripts/player.gd; port the numbers first
 * (docs/23 §7): SPEED 4.2, gravity 18, climb 2.6, capsule r 0.35 h 1.75.
 * Movement is authored in the XZ plane; climbing is W/S on a ladder; A/D
 * steps off sideways. Placeholder until M3.
 */
export const PLAYER_TUNE = {
  speed: 4.2,
  gravity: 18,
  climb: 2.6,
  radius: 0.35,
  height: 1.75,
  start: { x: -30, y: 0.05, z: 6.2 }, // oracle START_POS
} as const;

export class PlayerController {
  /** Oracle-parity tuning, exported for tests before the controller exists. */
  readonly tune = PLAYER_TUNE;

  /** M3: real movement. `frozen` mirrors player.frozen (cutscenes, the postcard). */
  frozen = false;

  // M3 placeholder signature — the real controller owns a THREE.Object3D.
  attach(_root: import("three").Object3D): void {
    /* M3 */
  }

  /** Ground + AABB probe stub. M3 replaces with the real ray/capsule pass. */
  grounded(_at: THREE.Vector3): boolean {
    return true;
  }
}
