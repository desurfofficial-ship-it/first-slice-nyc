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
const STEP_UP = 0.35;      // curb/step tolerance (sidewalk 0.1, bodega floor 0.11)
const GROUND_SNAP = 0.45;  // how far below the feet a surface still counts

export class Player {
  readonly capsule: Capsule = { x: -30, y: 0.05, z: 6.2, radius: 0.35, height: 1.75 };
  rotationY = 0;
  frozen = false;
  ladder: LadderInfo | null = null;
  vy = 0;
  camYaw = 0;               // written by the camera each frame (movement is camera-relative)
  onGround = true;

  private boxes: AABB[];

  constructor(boxes: AABB[]) {
    this.boxes = boxes;
  }

  /** Return final feet position for the frame. */
  update(dt: number, move: { x: number; y: number }): void {
    const inputX = this.frozen ? 0 : move.x;
    const inputY = this.frozen ? 0 : move.y;

    if (this.ladder) {
      // Forward/back climb. Left/right steps off sideways (player.gd ladder branch).
      const rightX = -Math.cos(this.camYaw);
      const rightZ = Math.sin(this.camYaw);
      const lateral = inputX * SPEED * 0.8;
      this.vy = inputY * CLIMB_SPEED;
      if (inputY !== 0.0) {
        // pull toward the ladder center (main.gd comment: z + 0.55 face offset)
        const c = this.ladder === null ? { x: this.capsule.x, z: this.capsule.z } : ladderCenter(this.ladder);
        this.capsule.x = approach(this.capsule.x, c.x, dt * 2.0);
        this.capsule.z = approach(this.capsule.z, c.z + 0.55, dt * 2.0);
      }
      // lateral step-off moves in XZ and releases when outside the ladder volume
      this.capsule.x += rightX * lateral * dt;
      this.capsule.z += rightZ * lateral * dt;
      // face the wall (the fire escape hangs on the building's street face) —
      // a climber nose-first into the brick read as a glitch in playtesting
      this.rotationY = lerpAngle(this.rotationY, Math.PI, Math.min(1, dt * 10.0));
      // Still collide with the building while on the ladder — without this,
      // sideways step-off could embed the capsule in the fire-escape wall.
      depenetrate(this.boxes, this.capsule, STEP_UP);
      this.capsule.y += this.vy * dt;
      // HARD cap at the rail: the oracle zeroes velocity BEFORE move_and_slide,
      // so it never creeps past the top. This port moved first, capped after —
      // every frame holding W crept ~4cm past the top until the area edge let
      // go mid-air (playtest: "bugs in climbing the ladder"). Clamp the position.
      if (this.capsule.y > this.ladder.top) {
        this.capsule.y = this.ladder.top;
        if (this.vy > 0) this.vy = 0;
      }
      this.onGround = false;
      return;
    }

    // camera-relative walk (player.gd: fwd = (sin yaw, 0, cos yaw), right = (-cos yaw, 0, sin yaw))
    const fwdX = Math.sin(this.camYaw);
    const fwdZ = Math.cos(this.camYaw);
    const rightX = -Math.cos(this.camYaw);
    const rightZ = Math.sin(this.camYaw);
    const dirX = fwdX * inputY + rightX * inputX;
    const dirZ = fwdZ * inputY + rightZ * inputX;

    moveAxisX(this.boxes, this.capsule, dirX * SPEED * dt, STEP_UP);
    moveAxisZ(this.boxes, this.capsule, dirZ * SPEED * dt, STEP_UP);
    depenetrate(this.boxes, this.capsule, STEP_UP);

    // gravity + ground
    const ground = groundHeight(this.boxes, this.capsule, GROUND_SNAP);
    if (this.capsule.y <= ground + 0.01 && this.vy <= 0) {
      this.capsule.y = ground;
      this.vy = -0.5; // hug the floor (player.gd keeps a small downward bias)
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

    // face movement direction (player.gd lerp_angle, 10/s; dir length > 0.1)
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
