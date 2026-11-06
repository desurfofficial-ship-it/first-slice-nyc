/**
 * Navigation performance measurement — REAL numbers, no fabrication.
 * Measures (headless, node, this machine):
 *   1. graph + index build time (one-time cost at boot)
 *   2. A* route query — uncached and cached (per-query cost)
 *   3. nearest-node snap cost (the per-walk recalculation ingredient)
 *   4. route-follower step cost (the per-frame per-body cost)
 *   5. stress: 50 concurrent followers stepped per frame (frame budget)
 *   6. heap growth across a 500-query churn (allocation discipline)
 * Results print as a table; exit 0 always (this is a measurement, not a gate).
 */

import { loadRegistry } from '../src/sim/registry';
import { Navigation } from '../src/sim/nav';
import { RouteFollower } from '../src/sim/nav/follower';

const registry = loadRegistry();

// 1. build cost
let t0 = performance.now();
const nav = new Navigation(registry);
const buildMs = performance.now() - t0;
const stats = nav.stats();

// 2. route queries — a spread of realistic asks (uncached = fresh nav each time)
const asks: Array<[{ x: number; z: number }, { x: number; z: number }, number]> = [
  [{ x: -42, z: 6.2 }, { x: 4, z: -6.6 }, 8 * 60],
  [{ x: 4, z: -6.6 }, { x: 55, z: -14 }, 12 * 60],
  [{ x: -72, z: 6.5 }, { x: 39.05, z: -6.15 }, 12 * 60],
  [{ x: -16, z: 4 }, { x: -16, z: 14 }, 9 * 60],
  [{ x: -42, z: 6.2 }, { x: 18.5, z: 25.5 }, 10 * 60],
  [{ x: 55, z: -8 }, { x: -55, z: -8 }, 18 * 60],
  [{ x: -82.5, z: 35 }, { x: 82.5, z: -46.5 }, 14 * 60],
  [{ x: 0, z: 0 }, { x: 9.4, z: -7.3 }, 20 * 60],
];
t0 = performance.now();
let uncachedN = 0;
for (let rep = 0; rep < 20; rep++) {
  const fresh = new Navigation(registry); // cold caches each rep
  for (const [a, b, m] of asks) { fresh.routeTo(a, b, m); uncachedN++; }
}
const uncachedUs = (performance.now() - t0) * 1000 / uncachedN;

t0 = performance.now();
const cachedN = 20 * asks.length;
for (let rep = 0; rep < 20; rep++) {
  for (const [a, b, m] of asks) nav.routeTo(a, b, m);
}
const cachedUs = (performance.now() - t0) * 1000 / cachedN;

// 3. nearest-node snaps
t0 = performance.now();
const snapN = 5000;
for (let i = 0; i < snapN; i++) nav.nearestNode(-84 + (i % 168), -48 + (i % 96), 12);
const snapUs = (performance.now() - t0) * 1000 / snapN;

// 4. follower step cost (per-frame, per-body)
const long = nav.routeTo({ x: -42, z: 6.2 }, { x: 4, z: -6.6 }, 8 * 60)!;
t0 = performance.now();
const stepN = 200000;
const f = new RouteFollower(long.points);
let sink = 0;
for (let i = 0; i < stepN; i++) {
  if (f.done()) f.state.seg = 0, f.state.t = 0, f.state.traveled = 0;
  sink += f.step(0.053).pos.x;
}
const stepUs = (performance.now() - t0) * 1000 / stepN;
if (!Number.isFinite(sink)) console.log(sink);

// 5. stress — 50 concurrent followers, one "frame"
const crowd: RouteFollower[] = [];
for (let i = 0; i < 50; i++) crowd.push(new RouteFollower(long.points));
let frameMs = 0;
for (let rep = 0; rep < 200; rep++) {
  const t = performance.now();
  for (const g of crowd) {
    if (g.done()) g.state.seg = 0, g.state.t = 0, g.state.traveled = 0;
    g.step(0.053);
  }
  frameMs += performance.now() - t;
}
frameMs /= 200;

// 6. heap across a query churn
const before = process.memoryUsage().heapUsed;
for (let rep = 0; rep < 500; rep++) {
  const fresh = new Navigation(registry);
  fresh.routeTo({ x: -42, z: 6.2 }, { x: 4, z: -6.6 }, 8 * 60);
}
global.gc?.();
const growthKb = (process.memoryUsage().heapUsed - before) / 1024;

console.log('NAV PERFORMANCE — node', process.version, '(single run, this machine)');
console.log(`  graph+indices build:      ${buildMs.toFixed(1)} ms (once at boot)`);
console.log(`  graph:                    ${stats.nodes} nodes / ${stats.edges} edges / ${stats.components} component(s)`);
console.log(`  A* query, uncached:       ${uncachedUs.toFixed(0)} µs/query (n=${uncachedN})`);
console.log(`  A* query, cached:         ${cachedUs.toFixed(1)} µs/query (n=${cachedN})`);
console.log(`  nearest-node snap:        ${snapUs.toFixed(1)} µs/query (n=${snapN})`);
console.log(`  follower step:            ${stepUs.toFixed(3)} µs/step (n=${stepN})`);
console.log(`  stress, 50 followers:     ${ (frameMs * 1000).toFixed(1)} µs per frame (budget: 16000 µs @ 60 fps)`);
console.log(`  heap drift, 500 builds+queries: ${growthKb.toFixed(0)} KB (bounded caches; gc ${global.gc ? 'on' : 'off — drift includes fresh graphs'})`);
