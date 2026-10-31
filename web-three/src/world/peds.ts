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
 * SOLIDITY (agent-2 collision pass, doc 35): steering asks, physics resolves.
 * On top of Yuka's forces, every frame now ends with three hard guarantees —
 *   1. walkers never overlap each other (pairwise half-pushes, capped),
 *   2. a walker never overlaps YOU (you are king; the walker yields),
 *   3. a walker never overlaps the cab's footprint (shortest-exit push),
 * and every walker carries a real AABB in World.colliders, so the player's
 * capsule is stopped by them exactly like by Rosa or the cart. The band
 * clamp (x ±47.2, z ±7.5) is the block's invisible bounds for bodies that
 * have no wall collision of their own. None of this overrides Yuka's
 * authored routes: a pushed walker's FollowPathBehavior steers it back the
 * moment the obstacle clears — slow, wait, edge around, resume.
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
import {
  resolveCirclesXZ, pushCircleOutOfRectXZ, type AABB, type CirclePush,
} from '../engine/collide';

/** Walkers wear the same look schema as the cast — scale/shoe included. */
export interface PedLook extends PersonLook {}

/** Lane discipline: the sidewalk slabs top out at y = 0.1, the road at 0. */
function groundY(z: number): number {
  return Math.abs(z) > 4.15 ? 0.1 : 0;
}

/** The block's walkable band (inside the invisible bounds, walls assumed). */
const BAND = { minX: -47.2, maxX: 47.2, minZ: -7.5, maxZ: 7.5 };
const PED_R = 0.3;        // a walker's physical half-width
const PED_REACH = 0.28 * Math.SQRT2; // walk-collider CORNER reach — on the
// diagonal a box touches at center-distance halfDiag, not halfWidth; the
// player separation must clear the corner or depenetrate shoves the PLAYER
// as a walker weaves past (the E2E caught a +1 m shove up a sidewalk)
const PLAYER_R = 0.35;    // matches the player capsule exactly
const MAX_PUSH = 0.25;    // per-frame cap — nobody slingshots, ever

interface Ped {
  vehicle: Vehicle;
  group: THREE.Group;
  speed: number; // m/s — walk, never run; the block is not in a hurry
  box: AABB;     // the walker's real body, synced under them every frame
  holdTime: number;  // seconds spent held off a body (player/cab) this stand
  slideSide: number; // locked sidestep direction while yielding (-1 | +1)
}

const MAX_DT = 0.1; // matches the game loop's clamp — Yuka integrates with the same dt

export class Pedestrians {
  readonly group = new THREE.Group();
  private manager = new EntityManager();
  private peds: Ped[] = [];
  private obstacles: GameEntity[] = [];
  private playerObstacle: GameEntity;
  private cartObstacle: GameEntity;
  private taxiObstacle: GameEntity;
  private castObstacle: GameEntity;
  private time = 0;
  /** Real bodies for the player's collision stack (World registers these).
   *  Parked underground until the first update puts each under its walker. */
  readonly walkColliders: AABB[];

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
    // circles that move with the world: you, the cart, the cab, the cast —
    // Rosa stands on the shopper's lane, so she gets her own circle (the
    // audit caught walkers ghosting straight through her)
    this.playerObstacle = new GameEntity();
    this.playerObstacle.radius = 0.5;
    this.cartObstacle = new GameEntity();
    this.cartObstacle.radius = 1.35;
    this.taxiObstacle = new GameEntity();
    this.taxiObstacle.radius = 2.4; // the cab's half-length is the danger zone
    this.castObstacle = new GameEntity();
    this.castObstacle.radius = 0.5;
    this.obstacles.push(this.playerObstacle, this.cartObstacle, this.taxiObstacle, this.castObstacle);
    this.manager.add(this.playerObstacle);
    this.manager.add(this.cartObstacle);
    this.manager.add(this.taxiObstacle);
    this.manager.add(this.castObstacle);

    // one real body per walker — parked at y −999 (the cast-collider trick:
    // a box under the world can't overlap anything) until the first update
    this.walkColliders = looks.map(() => ({
      minX: 0, maxX: 0, minY: -999, maxY: -998, minZ: 0, maxZ: 0,
    }));

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
      this.peds.push({
        vehicle, group, speed: vehicle.maxSpeed,
        box: this.walkColliders[i],
        holdTime: 0,
        slideSide: 0,
      });
    });

    scene.add(this.group);
  }

  /** XZ bodies for World's taxi-yield list — a crossing walker holds the cab. */
  bodies(): Array<{ x: number; z: number }> {
    return this.peds.map((p) => ({ x: p.vehicle.position.x, z: p.vehicle.position.z }));
  }

  /**
   * Push every walker out of the cab's footprint (shortest exit, capped).
   * Called by World AFTER the cab's committed move — the pedestrian yields
   * to the vehicle, never the reverse. Yuka's path steering resumes the
   * route the moment the footprint clears.
   */
  resolveAgainstCab(cabRect: AABB): void {
    const push: CirclePush = { x: 0, z: 0 };
    for (const p of this.peds) {
      if (pushCircleOutOfRectXZ(p.vehicle.position.x, p.vehicle.position.z, PED_R, cabRect, MAX_PUSH, push)) {
        p.vehicle.position.x += push.x;
        p.vehicle.position.z += push.z;
      }
    }
  }

  update(
    dt: number,
    player?: { x: number; z: number },
    cart?: { x: number; z: number },
    taxi?: { x: number; z: number },
    cast?: { x: number; z: number },
  ): void {
    this.time += dt;
    if (player) this.playerObstacle.position.set(player.x, 0, player.z);
    if (cart) this.cartObstacle.position.set(cart.x, 0, cart.z);
    if (taxi) this.taxiObstacle.position.set(taxi.x, 0, taxi.z);
    if (cast) this.castObstacle.position.set(cast.x, 0, cast.z);

    this.manager.update(Math.min(dt, MAX_DT));

    // ---- hard guarantees (steering asked; physics resolves) --------------
    // 1. walker ↔ walker: symmetric half-pushes. SeparationBehavior is a
    //    force and can be overcome at route corners; this cannot.
    // 2. walker ↔ player: the walker yields — you are never shoved.
    // 3. walker ↔ world: the band clamp keeps everybody on the block.
    const a: CirclePush = { x: 0, z: 0 };
    const b: CirclePush = { x: 0, z: 0 };
    for (let i = 0; i < this.peds.length; i++) {
      const pd = this.peds[i];
      const pi = pd.vehicle.position;
      for (let j = i + 1; j < this.peds.length; j++) {
        const pj = this.peds[j].vehicle.position;
        if (resolveCirclesXZ(pi.x, pi.z, pj.x, pj.z, PED_R, PED_R, MAX_PUSH * 0.5, a, b)) {
          pi.x += a.x; pi.z += a.z;
          pj.x += b.x; pj.z += b.z;
        }
      }
      if (player) {
        const held = resolveCirclesXZ(pi.x, pi.z, player.x, player.z, PED_REACH, PLAYER_R, MAX_PUSH, a, null);
        if (held) {
          pi.x += a.x; pi.z += a.z;
          // "pardon me": held off a body for a beat, a walker STEPS ASIDE
          // instead of leaning into the push forever — a slide perpendicular
          // to the player line, on the side they were already passing.
          // This is the head-on unlock: without it the pedestrian's forward
          // pull and the hold cancel and both parties stall mid-sidewalk.
          pd.holdTime += dt;
          if (pd.holdTime > 0.25) {
            if (pd.slideSide === 0) {
              const vx = pd.vehicle.velocity.x;
              const vz = pd.vehicle.velocity.z;
              // side = sign of the cross product(velocity, push-out) — the
              // direction their own motion is already carrying them past
              const cross = vx * a.z - vz * a.x;
              pd.slideSide = cross >= 0 ? 1 : -1;
              if (Math.abs(cross) < 1e-4) pd.slideSide = (i % 2 === 0) ? 1 : -1;
            }
            const plen = Math.hypot(a.x, a.z) || 1;
            const px2 = -a.z / plen;
            const pz2 = a.x / plen;
            pi.x += px2 * pd.slideSide * dt * 3.0;
            pi.z += pz2 * pd.slideSide * dt * 3.0;
          }
        } else {
          pd.holdTime = 0;
          pd.slideSide = 0;
        }
      }
      // the band clamp — the walkers have no wall collision of their own,
      // so the block's bounds are applied to their bodies directly
      pi.x = Math.max(BAND.minX, Math.min(BAND.maxX, pi.x));
      pi.z = Math.max(BAND.minZ, Math.min(BAND.maxZ, pi.z));
    }

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
      // the walker's real body follows (feet on their ground; a box at the
      // walker's feet height blocks the capsule exactly like the cast's)
      p.box.minX = v.x - 0.28;
      p.box.maxX = v.x + 0.28;
      p.box.minZ = v.z - 0.28;
      p.box.maxZ = v.z + 0.28;
      p.box.minY = 0;
      p.box.maxY = 1.7;
    }
  }
}
