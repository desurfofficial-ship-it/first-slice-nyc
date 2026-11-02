/**
 * The half-court's physics — the upgrade's law (docs/48 §3): make or miss
 * EMERGES from the simulation, and the simulation is deterministic and
 * penetration-free. These tests are the contract:
 *
 *   §1  determinism     same charge, same spot → the same flight, twice
 *   §2  the skill model the perfect release scores from any court spot;
 *                       bad releases miss (and the misses differ by charge)
 *   §3  no penetration  ground, backboard, rim steel, pole, fence — the
 *                       ball never ends up inside any of them
 *   §4  scoring honesty only a DOWNWARD pass through the aperture scores;
 *                       an upward pass never does
 *   §5  containment     walls reflect; the gate is a real gap; a rolled-out
 *                       ball is detectably outside (the court rolls it back)
 */

import { describe, it, expect } from 'vitest';
import {
  BallSim, solveLaunch, speedFor, COURT_BOUNDS, RIM, RIM_R, RIM_TUBE, BOARD,
  GROUND_Y, BALL_R, POLE, inRimColumn, isInsideCourt, type Vec3,
} from '../src/court/ballSim';

const FT_SPOT: Vec3 = { x: 43.4, y: 1.5, z: 5.4 };   // the free-throw-ish spot
const DEEP_SPOT: Vec3 = { x: 44.25, y: 1.5, z: 4.9 }; // deep, straight on

/** Fly a shot to rest; returns the sim + every sampled state (120 Hz). */
function flyShot(from: Vec3, q: number, maxSeconds = 9): { sim: BallSim; samples: SimStateSample[] } {
  const sim = new BallSim();
  const plan = solveLaunch(from);
  const s = speedFor(q);
  const perfect = Math.hypot(plan.vel.x, plan.vel.y, plan.vel.z);
  const scale = s / perfect;
  sim.launch(from, { x: plan.vel.x * scale, y: plan.vel.y * scale, z: plan.vel.z * scale });
  const samples: SimStateSample[] = [];
  const dt = 1 / 60;
  for (let t = 0; t < maxSeconds && !sim.resting; t += dt) {
    sim.advance(dt);
    const st = sim.state;
    samples.push({ x: st.pos.x, y: st.pos.y, z: st.pos.z, scored: st.scored });
  }
  return { sim, samples };
}

interface SimStateSample { x: number; y: number; z: number; scored: boolean }

describe('§1 — determinism: same charge, same flight, always', () => {
  it('two identical shots land at the identical spot', () => {
    const a = flyShot(FT_SPOT, 0.5);
    const b = flyShot(FT_SPOT, 0.5);
    const ea = a.sim.state.pos, eb = b.sim.state.pos;
    expect(ea.x).toBeCloseTo(eb.x, 10);
    expect(ea.y).toBeCloseTo(eb.y, 10);
    expect(ea.z).toBeCloseTo(eb.z, 10);
    expect(a.sim.state.scored).toBe(b.sim.state.scored);
  });

  it('solveLaunch is a pure function of the hand position', () => {
    const p1 = solveLaunch(FT_SPOT);
    const p2 = solveLaunch(FT_SPOT);
    expect(p1.vel).toEqual(p2.vel);
    expect(p1.idealCharge).toBe(p2.idealCharge);
  });

  it('different charges leave at different speeds (the meter means something)', () => {
    expect(speedFor(0)).toBeLessThan(speedFor(0.5));
    expect(speedFor(0.5)).toBeLessThan(speedFor(1));
  });
});

describe('§2 — the skill model: perfect release scores, bad release misses', () => {
  const SPOTS: Array<[string, Vec3]> = [
    ['free-throw spot', FT_SPOT],
    ['deep, straight on', DEEP_SPOT],
    ['left wing', { x: 42.2, y: 1.5, z: 5.6 }],
    ['right elbow', { x: 45.6, y: 1.5, z: 6.2 }],
  ];

  for (const [name, spot] of SPOTS) {
    it(`the perfect release from the ${name} drops through`, () => {
      const plan = solveLaunch(spot);
      const { sim } = flyShot(spot, plan.idealCharge);
      expect(sim.state.scored).toBe(true);
    });

    it(`a badly short release from the ${name} does not score`, () => {
      const plan = solveLaunch(spot);
      const q = Math.max(0, plan.idealCharge - plan.band * 4);
      const { sim } = flyShot(spot, q);
      expect(sim.state.scored).toBe(false);
      // and it stays in play — the court keeps its ball
      expect(isInsideCourt(sim.state.pos.x, sim.state.pos.z)).toBe(true);
    });
  }

  it('over-charging sprays long, under-charging sprays short (real reads)', () => {
    const plan = solveLaunch(FT_SPOT);
    const long = flyShot(FT_SPOT, Math.min(1, plan.idealCharge + 0.14));
    const short = flyShot(FT_SPOT, Math.max(0, plan.idealCharge - 0.14));
    const farFromRim = (p: Vec3) => Math.hypot(p.x - RIM.x, p.z - RIM.z);
    expect(farFromRim(long.sim.state.pos)).toBeGreaterThan(0.55);
    expect(farFromRim(short.sim.state.pos)).toBeGreaterThan(0.55);
  });

  it('the release band narrows with distance (deep shots ask for touch)', () => {
    const near = solveLaunch({ x: 44.0, y: 1.5, z: 6.9 });
    const far = solveLaunch(DEEP_SPOT);
    expect(far.dist).toBeGreaterThan(near.dist);
    expect(far.band).toBeLessThan(near.band);
  });
});

describe('§3 — no penetration: the ball occupies honest space', () => {
  const charges = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const eps = 0.004;

  const SPOTS3: Array<[string, Vec3]> = [['FT', FT_SPOT], ['DEEP', DEEP_SPOT], ['WING', { x: 42.3, y: 1.5, z: 5.8 }]];
  for (const [name, spot] of SPOTS3) {
    for (const q of charges) {
      it(`${name} @ q=${q.toFixed(1)} never enters ground, board, rim steel, pole or fence`, () => {
        const { sim, samples } = flyShot(spot, q);
        for (const s of samples) {
          // ground
          expect(s.y).toBeGreaterThanOrEqual(GROUND_Y + BALL_R - eps);
          // backboard box (front face at BOARD.z, depth 0.06)
          const inBoardXY = s.x > BOARD.minX - BALL_R + eps && s.x < BOARD.maxX + BALL_R - eps
            && s.y > BOARD.minY - BALL_R + eps && s.y < BOARD.maxY + BALL_R - eps;
          if (inBoardXY) expect(s.z).toBeLessThan(BOARD.z - BALL_R + eps);
          // rim steel: distance from the tube's surface
          const hx = s.x - RIM.x, hz = s.z - RIM.z;
          const hl = Math.hypot(hx, hz);
          const qx = RIM.x + (hl > 1e-6 ? (hx / hl) * RIM_R : RIM_R);
          const qz = RIM.z + (hl > 1e-6 ? (hz / hl) * RIM_R : 0);
          const dr = Math.hypot(s.x - qx, s.y - RIM.y, s.z - qz);
          expect(dr).toBeGreaterThanOrEqual(BALL_R + RIM_TUBE - eps);
          // pole
          if (s.y < POLE.top) {
            const pd = Math.hypot(s.x - POLE.x, s.z - POLE.z);
            expect(pd).toBeGreaterThanOrEqual(POLE.r + BALL_R - eps);
          }
          // the fence line (with the gate gap honored)
          const inGate = s.x > (COURT_BOUNDS.gateX0 ?? 0) && s.x < (COURT_BOUNDS.gateX1 ?? 0);
          expect(s.x).toBeGreaterThanOrEqual(COURT_BOUNDS.minX + BALL_R - eps);
          expect(s.x).toBeLessThanOrEqual(COURT_BOUNDS.maxX - BALL_R + eps);
          if (!inGate) expect(s.z).toBeGreaterThanOrEqual(COURT_BOUNDS.minZ + BALL_R - eps);
          expect(s.z).toBeLessThanOrEqual(COURT_BOUNDS.maxZ - BALL_R + eps);
        }
        expect(sim.state.phase).toBe('rest');
      });
    }
  }

  it('the ball comes to rest inside the enclosure (or detectably out the gate)', () => {
    for (const q of [0.2, 0.45, 0.7, 0.95]) {
      const { sim } = flyShot(FT_SPOT, q);
      const inside = isInsideCourt(sim.state.pos.x, sim.state.pos.z);
      if (!inside) {
        // only the gate may let it out, and only to the south-east
        expect(sim.state.pos.z).toBeLessThan(COURT_BOUNDS.minZ);
        expect(sim.state.pos.x).toBeGreaterThan(COURT_BOUNDS.gateX0!);
      }
    }
  });
});

describe('§4 — scoring honesty: only a downward pass through the aperture', () => {
  it('a rising ball passing up through the aperture does NOT score', () => {
    const sim = new BallSim();
    // seed from below the rim, aimed straight up through it
    sim.launch({ x: RIM.x, y: 1.2, z: RIM.z }, { x: 0, y: 7.5, z: 0 });
    let scoredDuringRise = false;
    for (let t = 0; t < 0.5 && !sim.resting; t += 1 / 120) {
      const wasScored = sim.state.scored;
      sim.advance(1 / 120);
      if (sim.state.scored && !wasScored) scoredDuringRise = true;
      if (sim.state.pos.y > RIM.y + 0.5) break;
    }
    expect(scoredDuringRise).toBe(false);
    expect(sim.state.scored).toBe(false);
  });

  it('the aperture check agrees with the rim geometry', () => {
    expect(inRimColumn(RIM.x, RIM.z)).toBe(true);
    expect(inRimColumn(RIM.x + RIM_R, RIM.z)).toBe(false); // dead on the iron
  });

  it('a swish drags the ball dead under the rim (the net is real)', () => {
    const plan = solveLaunch(FT_SPOT);
    const { sim } = flyShot(FT_SPOT, plan.idealCharge);
    expect(sim.state.scored).toBe(true);
    // after the swish, the ball drops close under the rim — not launched away
    expect(Math.hypot(sim.state.pos.x - RIM.x, sim.state.pos.z - RIM.z)).toBeLessThan(0.75);
  });
});

describe('§5 — containment and the gate', () => {
  it('a shot aimed at the west fence reflects back into the court', () => {
    const sim = new BallSim();
    sim.launch({ x: 41.4, y: 1.4, z: 5.8 }, { x: -8, y: 2.2, z: 0 });
    let bounced = false;
    for (let t = 0; t < 6 && !sim.resting; t += 1 / 60) {
      const vx = sim.state.vel.x;
      sim.advance(1 / 60);
      if (sim.state.pos.x > COURT_BOUNDS.minX && vx < 0) bounced = true;
    }
    expect(bounced).toBe(true);
    expect(sim.state.pos.x).toBeGreaterThanOrEqual(COURT_BOUNDS.minX + BALL_R - 0.01);
  });

  it('a ball rolled through the open gate is honestly outside', () => {
    const sim = new BallSim();
    sim.launch({ x: 46.2, y: 1.4, z: 5.6 }, { x: 0, y: 1.5, z: -4.5 });
    for (let t = 0; t < 8 && !sim.resting; t += 1 / 60) sim.advance(1 / 60);
    expect(sim.state.phase).toBe('rest');
    expect(isInsideCourt(sim.state.pos.x, sim.state.pos.z)).toBe(false);
  });
});
