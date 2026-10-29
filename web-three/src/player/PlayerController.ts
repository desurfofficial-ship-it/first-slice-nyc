import * as THREE from "three";

import type { Day1World } from "../world/Day1World";
import type { Input } from "../input/Input";
// (AABB lives in Day1World; the controller consumes the world's collider list.)

/**
 * PlayerController — camera-relative WASD, gravity, ladders. Ported from the
 * oracle (greybox-godot/scripts/player.gd + main.gd's ladder logic): the
 * numbers first — SPEED 4.2, gravity 18, climb 2.6, capsule r 0.35 h 1.75.
 *
 * Movement basis comes from the camera yaw (oracle `_physics_process`):
 *   fwd = (sin yaw, 0, cos yaw) · right = (-cos yaw, 0, sin yaw)
 * Ladders: W climbs, S descends, A/D step off sideways; the top hands you
 * onto the landing (ground = landing height inside its footprint).
 */
export const PLAYER_TUNE = {
  speed: 4.2,
  gravity: 18,
  climb: 2.6,
  radius: 0.35,
  height: 1.75,
  start: { x: -30, y: 0.05, z: 6.2 },
  killY: -12,
} as const;

export class PlayerController {
  readonly root = new THREE.Group();
  readonly tune = PLAYER_TUNE;

  /** Oracle-parity state. */
  frozen = false; // cutscenes and the postcard freeze the walker, not the world
  yaw = 0; // camera yaw drives the movement basis; GameCamera owns it, we mirror it

  velY = 0;
  ladder: { x: number; z: number; top: number; id: string } | null = null;
  private checkpoint: { x: number; y: number; z: number } = { ...PLAYER_TUNE.start };

  constructor(private world: Day1World) {
    this.root.name = "Player";
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(PLAYER_TUNE.radius, PLAYER_TUNE.height - PLAYER_TUNE.radius * 2, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0xf7b32b, roughness: 0.85 }),
    );
    capsule.name = "PlayerCapsule";
    capsule.position.y = PLAYER_TUNE.height / 2;
    capsule.castShadow = true;
    this.root.add(capsule);
    // The nose shows facing (oracle spawns one too — it reads as direction).
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x6d4c7d }),
    );
    nose.name = "Nose";
    nose.position.set(0, PLAYER_TUNE.height / 2, 0.28);
    this.root.add(nose);
  }

  /** Spawn (or respawn at the checkpoint — oracle `_respawn`). */
  place(at = this.checkpoint): void {
    this.root.position.set(at.x, at.y, at.z);
    this.velY = 0;
    this.ladder = null;
  }

  setCheckpoint(x: number, y: number, z: number): void {
    this.checkpoint = { x, y, z };
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  /** One physics step. `dt` clamped by the caller. */
  update(dt: number, input: Input, camYaw: number): void {
    this.yaw = camYaw;
    if (this.frozen) return;

    if (this.ladder !== null) {
      this.updateLadder(dt, input);
      return;
    }

    // -- horizontal, camera-relative (oracle basis: fwd=(sin,cos), right=(-cos,sin))
    const sinY = Math.sin(camYaw);
    const cosY = Math.cos(camYaw);
    const rightX = -cosY;
    const rightZ = sinY;
    let mx = 0;
    let mz = 0;
    if (input.state.fwd) {
      mx += sinY;
      mz += cosY;
    }
    if (input.state.back) {
      mx -= sinY;
      mz -= cosY;
    }
    if (input.state.right) {
      mx += rightX;
      mz += rightZ;
    }
    if (input.state.left) {
      mx -= rightX;
      mz -= rightZ;
    }
    const len = Math.hypot(mx, mz);
    if (len > 0.001) {
      mx = (mx / len) * PLAYER_TUNE.speed * dt;
      mz = (mz / len) * PLAYER_TUNE.speed * dt;
      this.tryMove(mx, mz);
      // face the walk direction (the nose shows it)
      this.root.rotation.y = Math.atan2(mx, mz);
    }

    // -- gravity + ground ---------------------------------------------------
    const ground = this.world.groundAt(this.root.position.x, this.root.position.z, this.root.position.y);
    this.velY -= PLAYER_TUNE.gravity * dt;
    this.root.position.y += this.velY * dt;
    if (this.root.position.y <= ground) {
      this.root.position.y = ground;
      this.velY = 0;
    }

    // -- ladders: overlap grabs, like the oracle's Area3D -------------------
    const lad = this.world.ladderAt(this.root.position.x, this.root.position.z);
    if (lad !== null && input.state.fwd && this.root.position.y < lad.top - 0.2) {
      this.ladder = { ...lad };
      this.root.position.x = lad.x;
      this.root.position.z = lad.z;
      this.velY = 0;
    }

    if (this.root.position.y < PLAYER_TUNE.killY) this.place();
  }

  private updateLadder(dt: number, input: Input): void {
    const lad = this.ladder!;
    // Climb caps at the ladder top; A/D steps you onto (or past) the landing.
    if (input.state.fwd && this.root.position.y < lad.top) {
      this.root.position.y = Math.min(lad.top, this.root.position.y + PLAYER_TUNE.climb * dt);
    } else if (input.state.back) {
      this.root.position.y -= PLAYER_TUNE.climb * dt;
      if (this.root.position.y <= 0) {
        this.root.position.y = 0;
        this.ladder = null; // back at the street, off the ladder
        return;
      }
    }
    // A/D steps off sideways — the floor lets go, gravity catches (Doc 22's seam-2 rule).
    if (input.state.left || input.state.right) {
      const side = input.state.right ? 1 : -1;
      const sinY = Math.sin(this.yaw);
      const cosY = Math.cos(this.yaw);
      this.ladder = null;
      this.root.position.x += -cosY * side * 0.45;
      this.root.position.z += sinY * side * 0.45;
      this.velY = 0;
    }
  }

  /**
   * Move with capsule-vs-AABB resolution on the XZ plane. Minimum-penetration
   * push-out: hugging a wall (capsule straddling the face by an inch) pushes
   * you that inch OUT — never to the far side of the building. Lesson from
   * the first honest failure: direction-based push-out teleported the player
   * through the fire-escape building the moment they hugged its face.
   */
  private tryMove(dx: number, dz: number): void {
    const p = this.root.position;
    const r = PLAYER_TUNE.radius;
    p.x += dx;
    p.z += dz;
    for (const b of this.world.colliders) {
      if (!(p.x + r > b.minX && p.x - r < b.maxX && p.z + r > b.minZ && p.z - r < b.maxZ)) continue;
      const penXMin = p.x + r - b.minX; // push west
      const penXMax = b.maxX - (p.x - r); // push east
      const penZMin = p.z + r - b.minZ; // push north
      const penZMax = b.maxZ - (p.z - r); // push south
      const penX = Math.min(penXMin, penXMax);
      const penZ = Math.min(penZMin, penZMax);
      if (penX < penZ) {
        p.x += penXMin < penXMax ? -penXMin : penXMax;
      } else {
        p.z += penZMin < penZMax ? -penZMin : penZMax;
      }
    }
  }
}
