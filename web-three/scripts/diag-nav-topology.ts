/** Dump the nav graph's Kestrel N/S lane chains node-by-node. */
import { buildNavGraph } from '../src/sim/nav/build.ts';
import { loadRegistry } from '../src/sim/registry.ts';

const registry = loadRegistry();
const { graph, notes } = buildNavGraph(registry);

console.log('--- notes (' + notes.length + ') ---');
for (const n of notes) console.log('  NOTE:', n);
console.log('--- nodes:', graph.nodes.size, 'edges:', graph.edges.size);

const nodes = [...graph.nodes.values()];
for (const [label, lo, hi] of [['Kestrel N', 5.5, 7.5], ['Kestrel S', -7.5, -5.5]]) {
  const lane = nodes.filter((n) => n.z > lo && n.z < hi).sort((a, b) => a.x - b.x);
  console.log(`--- ${label}: ${lane.length} nodes`);
  console.log('   ' + lane.map((n) => `${n.x}`).join(', '));
}
// BFS from spawn-side node to the far west on Kestrel N
const adj = graph.adj;
const laneN = nodes.filter((n) => n.z > 5.5 && n.z < 7.5).sort((a, b) => a.x - b.x);
const eastSeed = laneN.find((n) => n.x > -30);
const westTarget = [...laneN].reverse().find((n) => n.x < -80);
if (eastSeed && westTarget) {
  const seen = new Set([eastSeed.id]);
  const q = [eastSeed.id];
  while (q.length) {
    const cur = q.shift()!;
    for (const nb of adj.get(cur) ?? []) if (!seen.has(nb)) { seen.add(nb); q.push(nb); }
  }
  console.log(`--- BFS east(${eastSeed.x}) → west(${westTarget.x}): reachable=${seen.size} nodes; west reached=${seen.has(westTarget.id)}`);
}
// same west→east on Kestrel S
const laneS = nodes.filter((n) => n.z < -5.5 && n.z > -7.5).sort((a, b) => a.x - b.x);
const eastSeedS = laneS.find((n) => n.x > -30);
const westTargetS = [...laneS].reverse().find((n) => n.x < -80);
if (eastSeedS && westTargetS) {
  const seen = new Set([eastSeedS.id]);
  const q = [eastSeedS.id];
  while (q.length) {
    const cur = q.shift()!;
    for (const nb of adj.get(cur) ?? []) if (!seen.has(nb)) { seen.add(nb); q.push(nb); }
  }
  console.log(`--- BFS east(${eastSeedS.x}) → west(${westTargetS.x}): reachable=${seen.size} nodes; west reached=${seen.has(westTargetS.id)}`);
}
// the full-graph reachability from the spawn node: how much of the city is
// pedestrian-reachable at all?
const all = nodes.find((n) => Math.abs(n.x - (-30)) < 3 && Math.abs(n.z - 6.5) < 1);
if (all) {
  const seen = new Set([all.id]);
  const q = [all.id];
  while (q.length) {
    const cur = q.shift()!;
    for (const nb of adj.get(cur) ?? []) if (!seen.has(nb)) { seen.add(nb); q.push(nb); }
  }
  console.log(`--- reachability from spawn: ${seen.size}/${graph.nodes.size} nodes`);
  const unreached = nodes.filter((n) => !seen.has(n.id));
  const kinds = new Map<string, number>();
  for (const n of unreached) kinds.set(n.kind, (kinds.get(n.kind) ?? 0) + 1);
  console.log('--- unreached by kind:', JSON.stringify([...kinds]));
  const sample = unreached.filter((n) => n.kind === 'sidewalk').slice(0, 12).map((n) => `${n.id}@(${n.x},${n.z})`);
  console.log('--- unreached sidewalk sample:', sample.join(' '));
}
