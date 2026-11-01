/**
 * Ambient pedestrians — the block's background life, walking their own
 * errands. Playtest evidence (2026-10-30): the street had pigeons, a
 * squirrel, and zero people on the sidewalks — a New York block where nobody
 * walks reads as dead, and that is an NPC-believability problem (Doc 33
 * "living neighborhood"), not a missions problem.
 *
 * Yuka (MIT, zero-dependency, engine-agnostic) supplies the steering stack:
 * FollowPathBehavior keeps each walker on their sidewalk loop,
 * ObstacleAvoidanceBehavior weaves them around the cart, the parked cars,
 * the street furniture AND the player, and SeparationBehavior keeps them
 * from stacking. The library is scoped strictly to ambient walkers — the
 * named cast (Rosa, Idris, the kid, Sal, the stranger) stays authored
 * tween choreography, because their moves are story beats, not emergent
 * behaviour.
 *
 * Solidity (Agent-2 audit Q2/Q3): steering alone never made a walker a
 * BODY — the player could ghost straight through them, and a walker whose
 * avoidance lost the race could end a frame inside the furniture. Two
 * safety nets, both cheap and both subordinate to the steering:
 *   1. every walker owns an AABB in World's collider list (synced here each
 *      frame, the same contract as the cast's person colliders), so the
 *      PLAYER resolves against them;
 *   2. after Yuka integrates, each walker is pushed out of any furniture
 *      circle or fellow walker they are still intersecting — positionally,
 *      capped per frame so a deep overlap unwinds over a few frames instead
 *      of teleporting anyone.
 * Behaviours, paths and speeds are untouched: when steering succeeds the
 * resolve finds no penetration and does nothing.
 *
 * Identity rules (Doc 04): the walkers are built from the same articulated
 * person rig as the cast — shared palette bank materials, no new assets,
 * nothing procedurally "generated". They keep to the sidewalk paving and
 * cross only at the crosswalk (the pigeons' rule — nobody jaywalks into the
 * cab's lane; the cab already brakes for bodies in its path via World's
 * yield logic, so a crossing walker holds the cab at the stop line, exactly
 * like a real block).
 *
 * Determinism: seeded placement (same seed → same three walkers, same
 * starts) so the E2E driver and every player meet the same street life.
 * All motion is frame-rate independent (dt in seconds, clamped upstream).
 */

import * as THREE from 'three';
import {
  EntityManager, Vehicle, Path, FollowPathBehavior,
  ObstacleAvoidanceBehavior, SeparationBehavior, GameEntity, Vector3,
} from 'yuka';
import { buildArticulatedPerson, updatePersonAnim } from './personRig';
import { seededRng } from './ambient';
import type { AABB } from '../engine/collide';

export interface PedLook {
  jacket: number; pants: number; skin: number; hair: number;
  style?: 'bun' | 'cap' | 'flat';
}

/** Lane discipline: the sidewalk slabs top out at y = 0.1, the road at 0. */
function groundY(z: number): number {
  return Math.abs(z) > 4.15 ? 0.1 : 0;
}

interface Ped {
  vehicle: Vehicle;
  group: THREE.Group;
  speed: number; // m/s — walk, never run; the block is not in a hurry
}

const MAX_DT = 0.1; // matches the game loop's clamp — Yuka integrates with the same dt

/** Walker body radius — matches the cast's person-collider half width. */
const PED_R = 0.28;
/** Max distance the safety net may shove a walker per frame. A deep overlap
 *  (spawn-in, a cut corner) unwinds over a few frames — never a snap. */
const MAX_PUSH = 0.12;

export class Pedestrians {
  readonly group = new THREE.Group();
  private manager = new EntityManager();
  private peds: Ped[] = [];
  private obstacles: GameEntity[] = [];
  private playerObstacle: GameEntity;
  private cartObstacle: GameEntity;
  private time = 0;
  /** Tight resolve circles (x, z, r) — the VISIBLE footprint of each piece
   *  of furniture plus the player and the cart. Deliberately tighter than
   *  the steering circles above: the net corrects real overlaps, it does
   *  not re-weave the lane. */
  private readonly resolveCircles: Array<[number, number, number]> = [];
  /** One body per walker, synced into World's collider list each frame. */
  readonly colliders: AABB[] = [];

  constructor(
    scene: THREE.Scene,
    looks: PedLook[],
    mat: (color: number) => THREE.Material,
    seed: number,
    paths: Array<Array<[number, number]>>,
    staticObstacles: Array<{ x: number; z: number; r: number }>,
    resolveCircles: Array<[number, number, number]> = [],
  ) {
    this.group.name = 'Pedestrians';
    const rng = seededRng(seed);
    this.resolveCircles.push(...resolveCircles);

    // invisible avoidance circles — the city's fixed furniture
    for (const o of staticObstacles) {
      const e = new GameEntity();
      e.position.set(o.x, 0, o.z);
      e.radius = o.r;
      this.obstacles.push(e);
      this.manager.add(e);
    }
    // two circles that move with the world: you, and the cart
    this.playerObstacle = new GameEntity();
    this.playerObstacle.radius = 0.5;
    this.cartObstacle = new GameEntity();
    this.cartObstacle.radius = 1.35;
    this.obstacles.push(this.playerObstacle, this.cartObstacle);
    this.manager.add(this.playerObstacle);
    this.manager.add(this.cartObstacle);

    looks.forEach((look, i) => {
      const pts = paths[i % paths.length];
      const path = new Path();
      path.loop = true;
      for (const [x, z] of pts) path.add(new Vector3(x, 0, z));

      const vehicle = new Vehicle();
      // seed-spaced starts: each walker joins their loop at a different leg
      const start = pts[Math.floor(rng() * pts.length)];
      vehicle.position.set(start[0], 0, start[1]);
      vehicle.maxSpeed = 0.95 + rng() * 0.35;
      vehicle.maxForce = 6;
      vehicle.steering.add(new FollowPathBehavior(path, 0.7));
      vehicle.steering.add(new ObstacleAvoidanceBehavior(this.obstacles, 2.2));
      vehicle.steering.add(new SeparationBehavior());
      this.manager.add(vehicle);

      // the same handcrafted rig the cast wears — bank-shared materials,
      // so three more neighbors cost three rigs, zero new materials
      const { group } = buildArticulatedPerson(
        { jacket: look.jacket, pants: look.pants, skin: look.skin, hair: look.hair, style: look.style },
        mat,
      );
      group.position.set(start[0], groundY(start[1]), start[1]);
      group.rotation.y = rng() * Math.PI * 2;
      this.group.add(group);
      this.peds.push({ vehicle, group, speed: vehicle.maxSpeed });
      // a parked-at-spawn body; update() syncs it under the walker forever
      this.colliders.push({
        minX: start[0] - PED_R, maxX: start[0] + PED_R,
        minY: groundY(start[1]), maxY: groundY(start[1]) + 1.7,
        minZ: start[1] - PED_R, maxZ: start[1] + PED_R,
        kind: 'person',
      });
    });

    scene.add(this.group);
  }

  /** XZ bodies for World's taxi-yield list — a crossing walker holds the cab. */
  bodies(): Array<{ x: number; z: number }> {
    return this.peds.map((p) => ({ x: p.vehicle.position.x, z: p.vehicle.position.z }));
  }

  /** Push a walker out of one circle (radial, capped). Mutates vx/vz. */
  private pushOutOfCircle(vx: number, vz: number, cx: number, cz: number, r: number): [number, number] {
    const dx = vx - cx;
    const dz = vz - cz;
    const min = r + PED_R;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min || d2 < 1e-9) return [vx, vz];
    const d = Math.sqrt(d2);
    const push = Math.min(min - d, MAX_PUSH);
    return [vx + (dx / d) * push, vz + (dz / d) * push];
  }

  update(dt: number, player?: { x: number; z: number }, cart?: { x: number; z: number }): void {
    this.time += dt;
    if (player) this.playerObstacle.position.set(player.x, 0, player.z);
    if (cart) this.cartObstacle.position.set(cart.x, 0, cart.z);

    this.manager.update(Math.min(dt, MAX_DT));

    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      const v = p.vehicle.position;
      // safety net: unwinding any overlap steering failed to prevent. The
      // walker yields to the world — furniture and the player never get
      // shoved by a pedestrian.
      for (const [cx, cz, r] of this.resolveCircles) {
        const [nx, nz] = this.pushOutOfCircle(v.x, v.z, cx, cz, r);
        v.x = nx; v.z = nz;
      }
      if (player) {
        const [nx, nz] = this.pushOutOfCircle(v.x, v.z, player.x, player.z, 0.35);
        v.x = nx; v.z = nz;
      }
      if (cart) {
        const [nx, nz] = this.pushOutOfCircle(v.x, v.z, cart.x, cart.z, 1.1);
        v.x = nx; v.z = nz;
      }
      // walker-vs-walker: SeparationBehavior handles the steering; this only
      // breaks the rare dead stop where two bodies still touch.
      for (let j = i + 1; j < this.peds.length; j++) {
        const o = this.peds[j].vehicle.position;
        const dx = v.x - o.x;
        const dz = v.z - o.z;
        const d2 = dx * dx + dz * dz;
        const min = PED_R * 2;
        if (d2 < min * min && d2 > 1e-9) {
          const d = Math.sqrt(d2);
          const push = Math.min((min - d) / 2, MAX_PUSH);
          v.x += (dx / d) * push; v.z += (dz / d) * push;
          o.x -= (dx / d) * push; o.z -= (dz / d) * push;
        }
      }
      // sync the visual rig AND the body — one walker, one truth
      p.group.position.set(v.x, groundY(v.z), v.z);
      const box = this.colliders[i];
      box.minX = v.x - PED_R; box.maxX = v.x + PED_R;
      box.minY = groundY(v.z); box.maxY = groundY(v.z) + 1.7;
      box.minZ = v.z - PED_R; box.maxZ = v.z + PED_R;
      // face the walking direction (velocity, not the steering force) —
      // and hold the last heading at waypoints so nobody snap-turns
      const vx = p.vehicle.velocity.x;
      const vz = p.vehicle.velocity.z;
      if (vx * vx + vz * vz > 0.01) p.group.rotation.y = Math.atan2(vx, vz);
      // the rig measures its own position delta → the walk cycle is free
      updatePersonAnim(p.group, dt);
    }
  }
}
