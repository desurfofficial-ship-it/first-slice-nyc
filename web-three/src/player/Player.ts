/**
 * Greybox walker — port of greybox-godot/scripts/player.gd.
 * Constants are the oracle's: SPEED 4.2, GRAVITY 18, CLIMB 2.6.
 * Origin sits at the feet. Camera-relative movement. Ladder climb with
 * sideways step-off (Seam 2 behavior: you can always get off and back on).
 */

import { moveAxisX, moveAxisZ, groundHeight, depenetrate, type AABB, type Capsule } from '../engine/collide';
import type { LadderInfo } from '../world/World';

const SPEED = 4.2;
const GRAVITY = 18.0;
const CLIMB_SPEED = 2.6;
const STEP_UP = 0.35;
const GROUND_SNAP = 0.45;

export class Player {
  readonly capsule: Capsule = { x: -30, y: 0.05, z: 6.2, radius: 0.35, height: 1.75 };
  rotationY = 0;
  frozen = false;
  ladder: LadderInfo | null = null;
  vy = 0;
  camYaw = 0;
  onGround = true;

  private boxes: AABB[];

  constructor(boxes: AABB[]) {
    this.boxes = boxes;
  }

  update(dt: number, move: { x: number; y: number }): void {
    const inputX = this.frozen ? 0 : move.x;
    const inputY = this.frozen ? 0 : move.y;

    if (this.ladder) {
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
      // Playtest 2026-10-30: "trying to get down from the stairs and he fell."
      // Descending past a trigger's bottom used to keep you grabbed until your
      // HEAD cleared the volume — below ladder 2's area (min y 4.2) you hung in
      // mid-air inside Landing 1, and any lateral step-off dropped you from
      // nowhere. Now a descent that CROSSES a solid top this frame dismounts
      // onto it: ladder 2 sets you down on the landing, ladder 1 on the street.
      // Two guards keep it honest: only below (top - 0.5) so the top rung can't
      // re-deposit you on the landing you just left, and prevY must be at/above
      // the top — groundHeight snaps UP within 0.45, and without that guard the
      // first steps past a slab would teleport you back up onto it.
      if (this.vy < 0 && this.capsule.y < this.ladder.top - 0.5) {
        const g = groundHeight(this.boxes, this.capsule, GROUND_SNAP);
        if (prevY >= g - 0.01 && this.capsule.y <= g + 0.02) {
          this.capsule.y = g;
          this.vy = 0;
          this.ladder = null;
          this.onGround = true;
          return;
        }
      }
      // Bottom of the ladder: step onto the ground instead of freefalling
      if (this.capsule.y <= 0.12 && this.vy < 0) {
        this.capsule.y = 0.05;
        this.vy = 0;
        this.ladder = null;
        this.onGround = true;
        return;
      }
      this.onGround = false;
      return;
    }

    const fwdX = Math.sin(this.camYaw);
    const fwdZ = Math.cos(this.camYaw);
    const rightX = -Math.cos(this.camYaw);
    const rightZ = Math.sin(this.camYaw);
    const dirX = fwdX * inputY + rightX * inputX;
    const dirZ = fwdZ * inputY + rightZ * inputX;

    moveAxisX(this.boxes, this.capsule, dirX * SPEED * dt, STEP_UP);
    moveAxisZ(this.boxes, this.capsule, dirZ * SPEED * dt, STEP_UP);
    depenetrate(this.boxes, this.capsule, STEP_UP);

    const ground = groundHeight(this.boxes, this.capsule, GROUND_SNAP);
    if (this.capsule.y <= ground + 0.01 && this.vy <= 0) {
      this.capsule.y = ground;
      this.vy = -0.5;
      this.onGround = true;
    } else {
      this.vy -= GRAVITY * dt;
      this.capsule.y += this.vy * dt;
      if (this.capsule.y < ground) {
        this.capsule.y = ground;
        this.vy = -0.5;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    }

    if (Math.hypot(inputX, inputY) > 0.1) {
      const target = Math.atan2(dirX, dirZ);
      this.rotationY = lerpAngle(this.rotationY, target, Math.min(1, dt * 10.0));
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
