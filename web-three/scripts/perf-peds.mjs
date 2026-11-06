/**
 * WP-3v pedestrian performance measurement — REAL numbers, no fabrication.
 * Headless (node, this machine): the Pedestrians roster armed with the
 * REAL commute context (the shipped registry's nav graph), stepped at
 * 60 fps dt with the World's actual call shape. Measures:
 *   1. peds.update cost per frame (armed commuters, near/far tiers)
 *   2. route-build cost amortized (the budgeted A* swaps)
 *   3. heap growth over the run (allocation discipline)
 * Exit 0 always (a measurement, not a gate).
 */
import * as THREE from 'three';
import { loadRegistry } from '../src/sim/registry.ts';
import { Navigation } from '../src/sim/nav/index.ts';
import { Pedestrians } from '../src/world/peds.ts';

const nav = new Navigation(loadRegistry());
const scene = new THREE.Scene();
const looks = Array.from({ length: 12 }, (_, i) => ({
  jacket: 0x4a5568 + i, pants: 0x3b3f4a, skin: 0xc98e5a, hair: 0x2b2730, style: 'cap',
}));
const paths = [
  [[-6.5, 6.15], [38, 6.15], [38, 6.85], [-6.5, 6.85], [-6.5, -6.15], [26, -6.15], [26, -6.85], [-6.5, -6.85]],
  [[10, 6.1], [-42, 6.1], [-42, 6.75], [10, 6.75]],
  [[-43.5, -6.1], [44, -6.1], [44, -6.35], [-43.5, -6.35]],
];
const peds = new Pedestrians(scene, looks, 20261106, paths, [], [], []);
peds.setCommute({
  destinations: nav.streetDestinations(),
  nodePos: (id) => { const n = nav.graph.node(id); return n ? { x: n.x, z: n.z } : null; },
  routeTo: (x, z, destId) => { const r = nav.routeToStreet({ x, z }, destId); return r ? r.points : null; },
  epoch: () => nav.availabilityGen(9 * 60),
}, 20261106);

const player = { x: -2, z: 5.6 };
const cart = { x: 4, z: -6.6 }, taxi = { x: -80, z: 0 }, cast = { x: -16, z: 6.2 }, bus = { x: 70, z: 0 };
const DT = 1 / 30;
// warmup (first routes build, JIT settles)
for (let i = 0; i < 300; i++) peds.update(DT, player, cart, taxi, cast, bus);

let t = 0n;
const FRAMES = 9000; // 5 sim-minutes at 60 fps
globalThis.gc?.();
const heap0 = process.memoryUsage().heapUsed;
for (let i = 0; i < FRAMES; i++) {
  const a = process.hrtime.bigint();
  peds.update(DT, player, cart, taxi, cast, bus);
  t += process.hrtime.bigint() - a;
}
const heap1 = process.memoryUsage().heapUsed;
const perFrameUs = Number(t) / FRAMES / 1000;
console.log(`PED PERFORMANCE — node ${process.version} (this machine)`);
console.log(`  roster: 12 armed commuters, 60 fps dt, near-tier player`);
console.log(`  peds.update:            ${perFrameUs.toFixed(1)} µs/frame (budget 16600 µs → ${(perFrameUs / 166).toFixed(2)}%)`);
console.log(`  routes walked:          ${peds.commutesWalked()} in ${Math.round(FRAMES * DT)} s of street time`);
console.log(`  heap growth:            ${((heap1 - heap0) / 1024).toFixed(0)} KB over ${FRAMES} frames${globalThis.gc ? '' : ' (gc off)'}`);

// ---- the A/B: the same roster UNARMED (the shipped loop walkers) --------
const scene2 = new THREE.Scene();
const peds2 = new Pedestrians(scene2, looks, 20261106, paths, [], [], []);
for (let i = 0; i < 300; i++) peds2.update(DT, player, cart, taxi, cast, bus);
let t2 = 0n;
for (let i = 0; i < FRAMES; i++) {
  const a = process.hrtime.bigint();
  peds2.update(DT, player, cart, taxi, cast, bus);
  t2 += process.hrtime.bigint() - a;
}
const perFrameUs2 = Number(t2) / FRAMES / 1000;
console.log(`  loop walkers (unarmed): ${perFrameUs2.toFixed(1)} µs/frame — the commute adds ${(perFrameUs - perFrameUs2).toFixed(1)} µs/frame`);
