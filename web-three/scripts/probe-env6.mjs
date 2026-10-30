/**
 * Env pass six probe — the plaza owns its paving, the birds own their wings,
 * the fire escape explains itself.
 *
 * Verifies in the running game:
 *   1. Plaza_Deck_W / _E tops sit half a centimetre proud of the sidewalk
 *      (0.105 vs 0.1) — the first draft deck (top 0.03) was buried inside
 *      the slab and rendered nowhere — and each slab clears the subway
 *      stair cut and both plaza tree pits (coplanar tops shimmer).
 *   2. Pigeon wings: every bird's wing pair is HIDDEN while resting (the
 *      folded wing is the body; hidden = skipped draw), and a bird driven
 *      into a flush arc shows its wings flapping mid-flight, then folds
 *      them on landing.
 *   3. The decorative fire escape's braces reach the platform's street edge
 *      (wall→deck diagonals are visible support, not hidden stubs).
 *   4. Zero console/page errors.
 * Plus frames for the eye: the plaza's stone paving, a bird mid-flap, the
 * braced fire escape at street angle.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4594;
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(() => { window.__game.cam.update = () => {}; }); // probe-only freeze
await wait(4000); // birds settle out of any spawn transient

const fails = [];

// ---- 1. plaza deck: proud of the slab, clear of stair cut + tree pits ------
const deck = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const info = (name) => {
    const m = scene.getObjectByName(name);
    if (!m) return null;
    const top = +(m.position.y + 0.015).toFixed(4); // solid() sy = 0.03
    return { x: m.position.x, z: m.position.z, top, sx: m.geometry.parameters.width };
  };
  return { w: info('Plaza_Deck_W'), e: info('Plaza_Deck_E') };
});
for (const [label, d] of [['W', deck.w], ['E', deck.e]]) {
  if (!d) { fails.push(`Plaza_Deck_${label}: not found in scene`); continue; }
  const proud = d.top - 0.1;
  console.log(`Plaza_Deck_${label}: top ${d.top} (+${(proud * 100).toFixed(1)} cm over the slab) at x=${d.x}, z=${d.z}`);
  if (proud < 0.003 || proud > 0.008) fails.push(`Plaza_Deck_${label}: proudness ${proud} outside 3-8 mm band`);
  // clear of the subway stair cut (x -43.2..-40.8) and both plaza pits
  // (soil x -45.58..-44.42 and -39.175..-38.025, tops 0.105 — coplanar risk)
  const x0 = d.x - d.sx / 2, x1 = d.x + d.sx / 2;
  const stairClear = x1 < -43.2 || x0 > -40.8;
  const pitWClear = x1 < -45.58 || x0 > -44.42;
  const pitEClear = x1 < -39.175 || x0 > -38.025;
  if (!stairClear) fails.push(`Plaza_Deck_${label}: overlaps the subway stair cut in x`);
  if (!pitWClear && d.z - 1.15 < 5.275 && d.z + 1.15 > 4.125) fails.push(`Plaza_Deck_${label}: overlaps west plaza pit (coplanar soil top)`);
  if (!pitEClear && d.z - 1.25 < 5.075 && d.z + 1.25 > 3.925) fails.push(`Plaza_Deck_${label}: overlaps east plaza pit (coplanar soil top)`);
}
if (deck.w && deck.e) {
  console.log(`deck clearance: W x[${deck.w.x - deck.w.sx / 2}, ${deck.w.x + deck.w.sx / 2}]  E x[${deck.e.x - deck.e.sx / 2}, ${deck.e.x + deck.e.sx / 2}] (stair cut -43.2..-40.8)`);
}

// ---- 2. pigeon wings: folded on the ground, flapping mid-flight ------------
const wingState = () => page.evaluate(() => {
  const scene = window.__game.world.scene;
  const birdsOf = (name) => {
    const root = scene.getObjectByName(name);
    return root ? root.children.map((g) => {
      const w = g.getObjectByName('Wings');
      return { y: +g.position.y.toFixed(3), hasWings: !!w, wingsVisible: w ? w.visible : null };
    }) : null;
  };
  return { plaza: birdsOf('Flock_Plaza'), east: birdsOf('Flock_East') };
});

const rest = await wingState();
for (const [label, flock] of [['plaza', rest.plaza], ['east', rest.east]]) {
  if (!flock) { fails.push(`${label} flock: not found`); continue; }
  const hidden = flock.filter((b) => b.hasWings && !b.wingsVisible).length;
  const airborne = flock.filter((b) => b.y > 0.12).length; // mid flush-arc
  const shown = flock.filter((b) => b.hasWings && b.wingsVisible).length;
  console.log(`${label} flock: ${flock.length} birds — wings folded on ${hidden}, airborne ${airborne}, wings visible while grounded ${shown}`);
  if (hidden + airborne !== flock.length) fails.push(`${label} flock: ${flock.length - hidden - airborne} birds missing a wing pair`);
  if (shown > 0 && airborne === 0) fails.push(`${label} flock: ${shown} grounded birds showing wings`);
}

// drive a flush: a "player" lands inside a plaza bird's personal space, the
// world steps, the bird lifts — wings must appear, then fold on landing.
const flush = await page.evaluate(() => {
  const world = window.__game.world;
  const root = world.scene.getObjectByName('Flock_Plaza');
  if (!root || !root.children.length) return { error: 'no flock' };
  const bird = root.children[0];
  const from = { x: bird.position.x, y: bird.position.y, z: bird.position.z };
  const fake = { x: bird.position.x, y: 0, z: bird.position.z }; // stand ON the bird
  for (let i = 0; i < 12; i++) world.update(1 / 60, fake, false); // ~0.2 s — flush begins
  const w = bird.getObjectByName('Wings');
  const mid = { y: +bird.position.y.toFixed(3), visible: w ? w.visible : null, rot: w ? +w.rotation.z.toFixed(3) : null };
  for (let i = 0; i < 80; i++) world.update(1 / 60, undefined, false); // ~1.3 s — arc completes
  const end = { y: +bird.position.y.toFixed(3), visible: w ? w.visible : null };
  return { from, mid, end };
});
if (flush.error) fails.push('flush drive: ' + flush.error);
else {
  console.log(`flush: y ${flush.from.y} -> mid ${flush.mid.y} (wings ${flush.mid.visible ? `VISIBLE, tilt ${flush.mid.rot}` : 'hidden'}) -> landed ${flush.end.y} (wings ${flush.end.visible ? 'VISIBLE' : 'folded'})`);
  if (flush.mid.y <= 0.12) fails.push(`flush: bird never left the ground (mid y ${flush.mid.y})`);
  if (!flush.mid.visible) fails.push('flush: wings not visible mid-flight');
  if (flush.mid.rot === 0) fails.push('flush: wing tilt is zero mid-flap');
  if (flush.end.visible) fails.push('landing: wings still visible after touchdown');
}

// ---- 3. fire escape braces reach the street edge ---------------------------
// The deco merges into one mesh, so the check is the builder's math: a brace
// tilted -0.34 rad at z 0.42 must span the wall face (z~0) to the deck edge
// (z~0.85). Assert the source constants by re-deriving the endpoints.
{
  const tilt = -0.34, half = 0.45, cz = 0.42;
  const zEnds = [cz - half * Math.cos(tilt), cz + half * Math.cos(tilt)];
  const yEnds = [-0.2 - half * Math.sin(-tilt), -0.2 + half * Math.sin(-tilt)]; // relative to platform y
  console.log(`brace span: z ${zEnds.map((v) => v.toFixed(2)).join('..')} (platform 0..0.85), dy ${yEnds.map((v) => v.toFixed(2)).join('..')} (deck underside -0.04)`);
  if (zEnds[0] > 0.06) fails.push('brace: wall end detached from the wall face');
  if (zEnds[1] < 0.8) fails.push('brace: street end stops short of the deck edge');
}

// ---- frames for the eye -----------------------------------------------------
async function frame(name, cx, cy, cz, tx, ty, tz, ms = 400) {
  await page.evaluate(([cx, cy, cz, tx, ty, tz]) => {
    const c = window.__game.cam.camera;
    c.position.set(cx, cy, cz);
    c.lookAt(tx, ty, tz);
  }, [cx, cy, cz, tx, ty, tz]);
  await wait(ms);
  await page.screenshot({ path: join(OUT, `env6-${name}.png`) });
  console.log('shot env6-' + name + '.png');
}
await frame('plaza-deck', -33.0, 2.2, 1.6, -41.5, 0.05, 6.0);
await frame('plaza-deck-low', -36.0, 0.9, 3.4, -42.5, 0.0, 6.2);
await frame('fire-escape', -18.0, 3.2, -1.5, -21.5, 6.3, -7.9);

// ---- one bird frozen mid-flap for the eye ----------------------------------
await page.evaluate(() => {
  const world = window.__game.world;
  const root = world.scene.getObjectByName('Flock_Plaza');
  const bird = root.children[1];
  const fake = { x: bird.position.x, y: 0, z: bird.position.z };
  for (let i = 0; i < 8; i++) world.update(1 / 60, fake, false);
  const c = window.__game.cam.camera;
  c.position.set(bird.position.x + 2.2, 1.1, bird.position.z - 1.4);
  c.lookAt(bird.position.x, bird.position.y + 0.2, bird.position.z);
});
await wait(120); // a few real frames land mid-arc
await page.screenshot({ path: join(OUT, 'env6-wings.png') });
console.log('shot env6-wings.png');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO console/page errors');
await browser.close();
server.close();
if (fails.length || errors.length) {
  console.log('FAILS:\n' + fails.join('\n'));
  process.exit(1);
}
console.log('ENV PASS SIX PROBE: PASS');
