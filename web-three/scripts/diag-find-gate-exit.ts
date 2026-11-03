/**
 * Find a deterministic (stand spot, charge q) pair whose REAL release path
 * (solveLaunch → speedFor scale → BallSim flight) sends the ball out through
 * the open gate — the geometry that puts CourtGame into the 'return' phase.
 * Pure ballSim math — the same code CourtGame.release runs.
 * Run: bun scripts/diag-find-gate-exit.ts
 */
import { solveLaunch, speedFor, BallSim, isInsideCourt } from '../src/court/ballSim.ts';

const HAND_AHEAD = 0.5; // HAND_AHEAD + 0.08 — matches CourtGame.handPos
const POCKET_Y = 1.42; // CourtGame pocket base
const RIM = { x: 44.25, z: 7.64 };

const spots: Array<[number, number]> = [];
for (let x = 45.0; x <= 46.6; x += 0.2) for (let z = 4.8; z <= 6.6; z += 0.2) spots.push([x, z]);

let found = 0;
for (const [sx, sz] of spots) {
  const rotY = Math.atan2(RIM.x - sx, RIM.z - sz);
  for (let q = 0; q <= 1.0001; q += 0.05) {
    // testRelease seeds the solve from the pocket hand at THIS charge
    const hand = { x: sx + Math.sin(rotY) * HAND_AHEAD, y: POCKET_Y + q * 0.22, z: sz + Math.cos(rotY) * HAND_AHEAD };
    const plan = solveLaunch(hand);
    const s = speedFor(q);
    const perfect = Math.hypot(plan.vel.x, plan.vel.y, plan.vel.z);
    const scale = s / perfect;
    const sim = new BallSim();
    sim.launch(hand, { x: plan.vel.x * scale, y: plan.vel.y * scale, z: plan.vel.z * scale });
    for (let t = 0; t < 9 && !sim.resting; t += 1 / 60) sim.advance(1 / 60);
    const p = sim.state.pos;
    if (!isInsideCourt(p.x, p.z)) {
      console.log(`GATE EXIT: stand=(${sx.toFixed(1)},${sz.toFixed(1)}) q=${q.toFixed(2)}`
        + ` → rest=(${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}) scored=${sim.state.scored}`);
      found++;
      if (found >= 12) process.exit(0);
    }
  }
}
console.log(`done — ${found} gate-exit pairs`);
