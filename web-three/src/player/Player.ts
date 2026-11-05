/**
 * Upgraded Walker — fluid, responsive kinematic player controller.
 *
 * Polished for First Slice NYC:
 * - Fluid acceleration & deceleration friction curve (snappy onset in ~0.08s,
 *   coasting ease-out on release, eliminating robotic stops).
 * - Sprint mode (4.2 m/s leisurely walk -> 6.4 m/s brisk athletic run).
 * - Adaptive turn rate (skid pivot when reversing, smooth banking when curving).
 * - Visual height smoothing across curbs, stoops, and stairs (eliminating vertical jitter).
 * - Full backward-compatibility with A5 stair law, ladder climbing, and collision solidity.
 */

import { moveAxisX, moveAxisZ, groundHeight, depenetrate, type AABB, type Capsule } from '../engine/collide';
import type { LadderInfo } from '../world/World';

export const SPEED = 4.2;
export const SPEED_SPRINT = 6.4;
const GRAVITY = 18.0;
const CLIMB_SPEED = 2.6;
const STEP_UP = 0.35;
const GROUND_SNAP = 0.45;

/** Acceleration responsiveness: reaching target speed in ~0.08s */
const ACCEL_RATE = 18.0;
/** Deceleration friction when keys are released: settles in ~0.09s */
const FRICTION = 16.0;

export class Player {
  readonly capsule: Capsule = { x: -30, y: 0.05, z: 6.2, radius: 0.35, height: 1.75 };
  rotationY = 0;
  frozen = false;
  ladder: LadderInfo | null = null;
  vy = 0;
  camYaw = 0;
  onGround = true;

  /** Horizontal kinematic velocity */
  vx = 0;
  vz = 0;

  /** Smooth visual Y position for rendering (smooths stair & curb stepping) */
  visualY = 0.05;

  /** Active sprinting state */
  sprinting = false;

  private boxes: AABB[];

  constructor(boxes: AABB[]) {
    this.boxes = boxes;
  }

  update(dt: number, move: { x: number; y: number }, sprint: boolean = false): void {
    const inputX = this.frozen ? 0 : move.x;
    const inputY = this.frozen ? 0 : move.y;
    this.sprinting = sprint;

    if (this.ladder) {
      this.vx = 0;
      this.vz = 0;
      const rightX = -Math.cos(this.camYaw);
      const rightZ = Math.sin(this.camYaw);
      const lateral = inputX * SPEED * 0.8;
      this.vy = inputY * CLIMB_SPEED;
      if (inputY !== 0.0) {
        const c = this.ladder === null ? { x: this.capsule.x, z: this.capsule.z } : ladderCenter(this.ladder);
        this.capsule.x = approach(this.capsule.x, c.x, dt * 2.0);
        this.capsule.z = approach(this.capsule.z, c.z + 0.55, dt * 2.0);
      }
      this.capsule.x += rightX * lateral * dt;
      this.capsule.z += rightZ * lateral * dt;
      this.rotationY = lerpAngle(this.rotationY, Math.PI, Math.min(1, dt * 10.0));
      depenetrate(this.boxes, this.capsule, STEP_UP);
      const prevY = this.capsule.y;
      this.capsule.y += this.vy * dt;
      if (this.capsule.y > this.ladder.top) {
        this.capsule.y = this.ladder.top;
        if (this.vy > 0) this.vy = 0;
      }
      if (this.vy < 0 && this.capsule.y < this.ladder.top - 0.5) {
        const g = groundHeight(this.boxes, this.capsule, GROUND_SNAP);
        if (prevY >= g - 0.01 && this.capsule.y <= g + 0.02) {
          this.capsule.y = g;
          this.vy = 0;
          this.ladder = null;
          this.onGround = true;
          this.visualY = g;
          return;
        }
      }
      if (this.capsule.y <= 0.12 && this.vy < 0) {
        this.capsule.y = 0.05;
        this.vy = 0;
        this.ladder = null;
        this.onGround = true;
        this.visualY = 0.05;
        return;
      }
      this.onGround = false;
      this.visualY = this.capsule.y;
      return;
    }

    const fwdX = Math.sin(this.camYaw);
    const fwdZ = Math.cos(this.camYaw);
    const rightX = -Math.cos(this.camYaw);
    const rightZ = Math.sin(this.camYaw);
    const dirX = fwdX * inputY + rightX * inputX;
    const dirZ = fwdZ * inputY + rightZ * inputX;

    const inputLen = Math.hypot(inputX, inputY);
    const targetSpeed = (sprint || this.sprinting) ? SPEED_SPRINT : SPEED;

    // Fluid acceleration & deceleration friction
    if (inputLen > 0.05) {
      const targetVx = dirX * targetSpeed;
      const targetVz = dirZ * targetSpeed;
      const accelFactor = Math.min(1, dt * ACCEL_RATE);
      this.vx += (targetVx - this.vx) * accelFactor;
      this.vz += (targetVz - this.vz) * accelFactor;
    } else {
      const frictionFactor = Math.min(1, dt * FRICTION);
      this.vx += (0 - this.vx) * frictionFactor;
      this.vz += (0 - this.vz) * frictionFactor;
      if (Math.hypot(this.vx, this.vz) < 0.04) {
        this.vx = 0;
        this.vz = 0;
      }
    }

    // Kinematic motion through AABB collision sweep
    moveAxisX(this.boxes, this.capsule, this.vx * dt, STEP_UP);
    moveAxisZ(this.boxes, this.capsule, this.vz * dt, STEP_UP);
    depenetrate(this.boxes, this.capsule, STEP_UP);

    // A5 stair law & floor snap
    const ground = this.onGround
      ? groundHeight(this.boxes, this.capsule, GROUND_SNAP, dirX, dirZ)
      : groundHeight(this.boxes, this.capsule, GROUND_SNAP);

    if (this.capsule.y <= ground + 0.01 && this.vy <= 0) {
      this.capsule.y = ground;
      this.vy = -0.5;
      this.onGround = true;
    } else if (
      this.onGround && this.vy <= 0
      && ground > Number.NEGATIVE_INFINITY
      && this.capsule.y - ground <= GROUND_SNAP
    ) {
      this.capsule.y = ground;
      this.vy = -0.5;
      this.onGround = true;
    } else {
      this.vy -= GRAVITY * dt;
      const fall = this.vy * dt;
      const steps = Math.max(1, Math.ceil(Math.abs(fall) / 0.12));
      const dy = fall / steps;
      for (let i = 0; i < steps; i++) {
        this.capsule.y += dy;
        const g = groundHeight(this.boxes, this.capsule, GROUND_SNAP);
        if (this.capsule.y < g) {
          this.capsule.y = g;
          this.vy = -0.5;
          this.onGround = true;
          break;
        }
        this.onGround = false;
      }
    }

    // Smooth visual height interpolation for camera & mesh rendering
    const yRate = this.onGround ? 22.0 : 35.0;
    this.visualY += (this.capsule.y - this.visualY) * Math.min(1, dt * yRate);

    // Adaptive facing rotation
    const currentSpeed = Math.hypot(this.vx, this.vz);
    if (inputLen > 0.1 || currentSpeed > 0.4) {
      const headingDirX = inputLen > 0.1 ? dirX : this.vx;
      const headingDirZ = inputLen > 0.1 ? dirZ : this.vz;
      const targetAngle = Math.atan2(headingDirX, headingDirZ);

      // Boost turn rate during 180-degree quick turnarounds
      let angleDiff = (targetAngle - this.rotationY) % (Math.PI * 2);
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const turnBoost = Math.abs(angleDiff) > 2.0 ? 1.8 : 1.0;
      const turnRate = Math.min(1, dt * 14.0 * turnBoost);
      this.rotationY = lerpAngle(this.rotationY, targetAngle, turnRate);
    }
  }
}

export function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function approach(from: number, to: number, delta: number): number {
  if (from < to) return Math.min(from + delta, to);
  return Math.max(from - delta, to);
}

function ladderCenter(l: LadderInfo): { x: number; z: number } {
  return { x: (l.area.minX + l.area.maxX) / 2, z: (l.area.minZ + l.area.maxZ) / 2 };
}
