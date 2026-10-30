/**
 * Minimal ambient type surface for `yuka` (v0.7.8, MIT — Mugen87). The
 * package ships no TypeScript definitions; this declares ONLY the API this
 * game uses (steering for the ambient pedestrians in world/peds.ts), so the
 * dependency surface stays explicit and auditable.
 */

declare module 'yuka' {
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
  }

  export class GameEntity {
    position: Vector3;
    radius: number;
    active: boolean;
    constructor();
  }

  export class MovingEntity extends GameEntity {
    velocity: Vector3;
    maxSpeed: number;
  }

  export class Vehicle extends MovingEntity {
    maxForce: number;
    steering: SteeringManager;
    update(delta: number): this;
  }

  export class SteeringManager {
    add(behavior: SteeringBehavior): this;
  }

  export class SteeringBehavior {
    weight: number;
  }

  export class Path {
    loop: boolean;
    constructor();
    add(point: Vector3): this;
  }

  export class FollowPathBehavior extends SteeringBehavior {
    constructor(path: Path, nextWaypointDistance?: number, weight?: number);
  }

  export class ObstacleAvoidanceBehavior extends SteeringBehavior {
    constructor(obstacles: GameEntity[], weight?: number);
  }

  export class SeparationBehavior extends SteeringBehavior {
    constructor(weight?: number);
  }

  export class EntityManager {
    constructor();
    add(entity: GameEntity): this;
    update(delta: number): this;
  }
}
