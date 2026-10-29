import * as THREE from "three";

/**
 * GameCamera — one camera, three poses (M3): FOLLOW / LOOK / POSTCARD,
 * blended with ~2 s sine easing, per the TS-02 spike results (Doc 15) and
 * the oracle's `_update_camera()` + postcard rig (Doc 24 fixed the rig end
 * at (11.5, 10.0, -5.2) — port the FIXED numbers, not the old ones).
 * Placeholder until M3.
 */
export type CameraPose = "FOLLOW" | "LOOK" | "POSTCARD";

export class GameCamera {
  readonly camera: THREE.PerspectiveCamera;
  pose: CameraPose = "FOLLOW";

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 300);
  }

  /** M3: pose blends + the follow rig from the oracle. */
  update(_dt: number): void {
    /* M3 */
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
