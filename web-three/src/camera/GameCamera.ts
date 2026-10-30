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
 *
 * Playtest 2026-10-30 (second pass): "the street hid the player." Three
 * findings from living behind the lens:
 *   - On-axis framing means anything one metre off the walking line (a tree
 *     canopy, a subway rail) can swallow the player for whole seconds. The
 *     boom now STEPS ASIDE — a smoothed lateral offset (world x, up to
 *     ±3.5 m) whenever the camera→focus sight line would pass through a
 *     canopy sphere reported by the world. Zero offset when already clear:
 *     the classic framing is untouched; trees only move the camera when
 *     they would hide you.
 *   - The boom was REQUESTED 9 m behind the player even mid-street: the
 *     request landed inside the south brownstones and shortenBoom dragged
 *     it back out to the building face — exactly the belt where the south
 *     tree canopies hang (leaf blob filled half the frame). The desired
 *     position is now clamped to a street corridor (z −6…8.2) before any
 *     wall-shortening, so flips and crossings keep the lens over the
 *     roadway it belongs over.
 *   - Portrait phones: KEEP_WIDTH widened the vertical FOV to 91° — more
 *     than half the glass was flat wall and empty road, the player ~10% of
 *     frame height. Portrait now holds the boom closer (dist ×0.75,
 *     height ×0.82) and caps the vertical FOV at 80°: the player reads
 *     ~1.7× larger and the street fills the frame instead of the sky.
 * Landscape boom tightened one step (9→8 m, 6.5→6.0 m) for the same
 * reason: the player is the protagonist, not a pin in a diorama.
 */

import * as THREE from 'three';
import { lerpAngle } from '../player/Player';
import type { AABB } from '../engine/collide';

const CAM_DIST = 8.0;
const CAM_HEIGHT_BASE = 6.0;
/** Portrait phones hold the boom closer: the pull that frames a landscape
 *  street turns a phone-screen player into a 10%-height pin. */
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
/** The camera is a street-level eye, not a drone: the desired boom position
 *  is clamped to this z corridor before any wall-shortening. Mid-street
 *  flips used to request a camera inside the south row, whose building
 *  face + tree-pit belt is exactly where shortenBoom parked the lens. */
const CAM_Z_MIN = -4.8;
const CAM_Z_MAX = 4.9;
/** The corridor clamp shortens the boom when the player stands near the flip
 *  line mid-street; without a floor the lens ends up 3 m overhead at 65°.
 *  Pushing back out to this floor keeps the framing humane — the pushed
 *  position (z ≥ −6.4) still clears every leaf sphere in both aspects and
 *  never reaches the building faces at −7.6. */
const BOOM_FLOOR = 4.6;
/** Sight-line clearance outside every canopy sphere before the boom must
 *  step aside for a tree. */
const CANOPY_CLEAR = 0.45;
/** Lateral step ladder (world x, metres), tried smallest-first. */
const SIDE_LADDER = [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, 2.8, -2.8, 3.5, -3.5];
const SIDE_LERP = 2.5;
/** Fade-on-occlude: when the sight line still passes through a canopy after
 *  the sidestep (the player standing beside a plaza tree blocks every
 *  candidate), that canopy dissolves toward gauze instead of hiding the
 *  player. clearance = segment distance beyond sphere+r; fade rises as it
 *  closes inside FADE_SOFT metres of the sphere surface. */
const FADE_MARGIN = 0.15;
const FADE_SOFT = 0.8;
/** Only a misalignment larger than this (~92°) is worth an auto-flip while
 *  the player is walking — anything less keeps the stable street-side view. */
const FLIP_ANGLE = 1.6;
/** When idle, settle behind the player's last heading if it disagrees with
 *  the street-side yaw by more than this (~103°) — "I turned around". */
const TURNED_AROUND = 1.8;

/** One tree's canopy as a bounding sphere (world space) — coarse on
 *  purpose: the camera only needs to know "a blob of leaves lives here". */
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
  private canopies: CanopySphere[] | null = null;
  /** Applied lateral step (world x offset of the desired position). */
  private sideStep = 0;
  /** Per-canopy occlusion 0..1 (1 = the sight line runs through this
   *  canopy) — World reads this every frame and fades the leaves. Public:
   *  Game wires it to the world once at boot. */
  readonly occlusion: Float32Array;
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

  /** Squared distance from canopy centre c to segment a→b. */
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

  /** Smallest lateral step (world x) whose camera→focus sight line clears
   *  every canopy by CANOPY_CLEAR. Zero when already clear. Tries the
   *  ladder smallest-first; if nothing clears, takes the step with the best
   *  worst-case clearance. */
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

  /** Shared boom math for update() and snapBehind(): focus point,
   *  aspect-aware boom, street-corridor z clamp. Returns the RAW canopy
   *  sidestep (desired is left unshifted — callers apply it, smoothed or
   *  snapped). */
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
    this.desired.z = THREE.MathUtils.clamp(this.desired.z, CAM_Z_MIN, CAM_Z_MAX);
    // keep the boom humane when the clamp bites (see BOOM_FLOOR)
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

  /** Measure the ACTUAL camera→focus sight line against every canopy and
   *  write 0..1 occlusion into `occlusion` for the world's fade pass. Runs
   *  after the camera position settles, so it reflects what is truly on
   *  screen — the sidestep helps where it can, the fade covers the rest. */
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

    const rawDx = this.computeDesired(playerPos);
    this.sideStep += (rawDx - this.sideStep) * Math.min(1, dt * SIDE_LERP);
    if (Math.abs(rawDx - this.sideStep) < 0.02) this.sideStep = rawDx;
    this.desired.x += this.sideStep;

    const k = Math.min(1, dt * POS_LERP);
    const goal = this.shortenBoom(this.focusTarget, this.desired);
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
