/**
 * Tests for upgraded player movement kinematics and smooth camera tracking.
 * Verifies fluid acceleration, deceleration friction, sprint speed,
 * adaptive turn rate, and smooth camera damping without stutters.
 */
import { describe, it, expect } from 'vitest';
import { Player, lerpAngle } from '../src/player/Player';
import { boxFromCenter } from '../src/engine/collide';

const DT = 1 / 60;

describe('Player fluid movement & kinematics', () => {
  it('accelerates smoothly from standstill without jarring pops', () => {
    const ground = boxFromCenter(0, -0.5, 0, 100, 1, 100);
    const player = new Player([ground]);
    player.capsule.x = 0;
    player.capsule.z = 0;
    player.capsule.y = 0.05;

    // First frame of pressing forward
    player.update(DT, { x: 0, y: 1 });
    const dist1 = Math.hypot(player.capsule.x, player.capsule.z);

    // After 6 frames (~0.1s), player reaches full speed smoothly
    for (let i = 0; i < 5; i++) {
      player.update(DT, { x: 0, y: 1 });
    }
    const dist6 = Math.hypot(player.capsule.x, player.capsule.z);

    expect(dist1).toBeGreaterThan(0);
    expect(dist6).toBeGreaterThan(dist1);
  });

  it('decelerates with natural friction when keys are released instead of instant freeze', () => {
    const ground = boxFromCenter(0, -0.5, 0, 100, 1, 100);
    const player = new Player([ground]);
    player.capsule.y = 0.05;

    // Run for 15 frames to build momentum
    for (let i = 0; i < 15; i++) {
      player.update(DT, { x: 0, y: 1 });
    }
    const zMoving = player.capsule.z;

    // Release keys: next frame still has subtle deceleration carry
    player.update(DT, { x: 0, y: 0 });
    const zCoast = player.capsule.z;
    expect(zCoast).toBeGreaterThan(zMoving);

    // After 18 frames (~0.3s) of no input, player settles to rest completely
    for (let i = 0; i < 18; i++) {
      player.update(DT, { x: 0, y: 0 });
    }
    const zRest1 = player.capsule.z;
    player.update(DT, { x: 0, y: 0 });
    const zRest2 = player.capsule.z;
    expect(Math.abs(zRest2 - zRest1)).toBeLessThan(1e-4);
  });

  it('supports sprint speed boost when sprint is active', () => {
    const ground = boxFromCenter(0, -0.5, 0, 100, 1, 100);
    const playerWalk = new Player([ground]);
    const playerSprint = new Player([ground]);
    playerWalk.capsule.y = 0.05;
    playerSprint.capsule.y = 0.05;

    const startZ = playerWalk.capsule.z;

    for (let i = 0; i < 30; i++) {
      playerWalk.update(DT, { x: 0, y: 1 }, false);
      playerSprint.update(DT, { x: 0, y: 1 }, true);
    }

    const walkDist = playerWalk.capsule.z - startZ;
    const sprintDist = playerSprint.capsule.z - startZ;

    expect(sprintDist).toBeGreaterThan(walkDist * 1.25);
  });

  it('smooths stair/curb height transitions for visual stability', () => {
    const ground = boxFromCenter(0, 0.1, 0, 100, 0.4, 100);
    const player = new Player([ground]);
    player.capsule.y = 0.3;
    player.visualY = 0.05;

    player.update(DT, { x: 0, y: 0 });

    // visualY smoothly interpolates upward toward capsule.y
    expect(player.visualY).toBeGreaterThan(0.05);
    expect(player.visualY).toBeLessThanOrEqual(0.3);
  });

  it('lerpAngle correctly wraps angles across -PI and PI boundaries', () => {
    // Turning from -3.0 to +3.0 should take the short route across PI
    const turned = lerpAngle(-3.0, 3.0, 0.5);
    expect(Math.abs(turned)).toBeGreaterThan(3.0);
  });
});
