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
import { buildArticulatedPerson, updatePersonAnim, type PersonLook } from './personRig';
import { seededRng } from './ambient';

/** Walkers wear the same look schema as the cast — scale/shoe included. */
export interface PedLook extends PersonLook {}

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

export class Pedestrians {
  readonly group = new THREE.Group();
  private manager = new EntityManager();
  private peds: Ped[] = [];
  private obstacles: GameEntity[] = [];
  private playerObstacle: GameEntity;
  private cartObstacle: GameEntity;
  private time = 0;

  constructor(
    scene: THREE.Scene,
    looks: PedLook[],
    mat: (color: number) => THREE.Material,
    seed: number,
    paths: Array<Array<[number, number]>>,
    staticObstacles: Array<{ x: number; z: number; r: number }>,
  ) {
    this.group.name = 'Pedestrians';
    const rng = seededRng(seed);

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
      const { group } = buildArticulatedPerson(look, mat);
      group.position.set(start[0], groundY(start[1]), start[1]);
      group.rotation.y = rng() * Math.PI * 2;
      this.group.add(group);
      this.peds.push({ vehicle, group, speed: vehicle.maxSpeed });
    });

    scene.add(this.group);
  }

  /** XZ bodies for World's taxi-yield list — a crossing walker holds the cab. */
  bodies(): Array<{ x: number; z: number }> {
    return this.peds.map((p) => ({ x: p.vehicle.position.x, z: p.vehicle.position.z }));
  }

  update(dt: number, player?: { x: number; z: number }, cart?: { x: number; z: number }): void {
    this.time += dt;
    if (player) this.playerObstacle.position.set(player.x, 0, player.z);
    if (cart) this.cartObstacle.position.set(cart.x, 0, cart.z);

    this.manager.update(Math.min(dt, MAX_DT));

    for (const p of this.peds) {
      const v = p.vehicle.position;
      p.group.position.set(v.x, groundY(v.z), v.z);
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
