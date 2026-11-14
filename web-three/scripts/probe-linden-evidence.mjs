/**
 * Probe: the Linden Hill evidence set (docs/world-building/linden-hill-design.md).
 * ONE boot captures: the north band's frames (the school, the reading room,
 * the green both halves, the gas holder, Osier's yard, the viaduct's north
 * reach, the Hazel/Mulberry corners), the transition from the spine (the
 * far-read honesty — the band hides behind the far rows), the dusk frame,
 * and the draw census at seven standing positions (the pricing law's own
 * check — the band's rows light as the player arrives). The walk leg moves
 * the player Kestrel → Juniper north → Hazel → Mulberry → Sycamore south —
 * the second-dimension assertion, in the real game: the avenues are streets
 * now, not dead ends. Evidence frames, not gameplay assertions.
 * Run `npm run build` first. ~70 s.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4619;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const OUT = new URL('../shots/lindenhill/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2600);

await page.evaluate(() => {
  const hud = document.getElementById('hud');
  if (hud) hud.style.setProperty('display', 'none');
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const frame = async (name, cx, cy, cz, lx, ly, lz) => {
  await page.evaluate(([ax, ay, az, lx2, ly2, lz2]) => {
    const g = window.__game;
    g.running = false; // held through the screenshot — the RAF must not re-render the game camera between our render and the capture
    const cam = g.cam.camera;
    cam.up.set(0, 1, 0);
    cam.position.set(ax, ay, az);
    cam.lookAt(lx2, ly2, lz2);
    g.renderer.render(g.world.scene, cam);
  }, [cx, cy, cz, lx, ly, lz]);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await page.evaluate(() => { window.__game.running = true; });
  console.log(`SHOT: ${name}`);
};

/** The census at a standing position: the wc1 rig — teleport, snap the
 *  camera behind, let several REAL game frames settle, read the game's own
 *  render info (the shipped method probe-wc1-catalpa prices with). */
const censusAt = async (x, z) => {
  await page.evaluate(([cx, cz]) => {
    const g = window.__game;
    g.player.capsule.x = cx;
    g.player.capsule.y = 0.05;
    g.player.capsule.z = cz;
    g.cam.snapBehind({ x: cx, y: 0.05, z: cz });
  }, [x, z]);
  await page.waitForTimeout(350);
  return page.evaluate(() => window.__game.renderer.info.render.calls);
};

// ---- the transition (the honest far read): from the spine the band hides
// behind the far rows — the frame proves the roofline discipline
await frame('ln-far-read-from-kestrel', 0, 3.2, 6.5, 0, 8, 110);
await frame('ln-juniper-look-north', -72, 2.6, 4, -72, 6, 120);

// ---- walk the player north (the lattice's rows follow), then the frames
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -72; p.z = 96;
});
await page.waitForTimeout(500); // the lattice follows on the next game frame — the band's rows must light before the manual frames

// the overviews
await page.evaluate(([ax, ay, az]) => {
  const g = window.__game;
  g.running = false;
  const cam = g.cam.camera;
  cam.up.set(0, 0, 1);
  cam.position.set(ax, ay, az);
  cam.lookAt(76, 0, 112);
  g.renderer.render(g.world.scene, cam);
}, [40, 170, 112.1]);
await page.screenshot({ path: `${OUT}ln-aerial-top-down.png` });
await page.evaluate(() => { window.__game.running = true; });
console.log('SHOT: ln-aerial-top-down');

await frame('ln-isometric-overview', -40, 52, 30, 60, 6, 108);

// the band's frames
await frame('ln-hazel-juniper-corner', -66, 2.6, 66, -84, 3.5, 80);
await page.evaluate(() => { const p = window.__game.player.capsule; p.x = 40; p.z = 84; });
await page.waitForTimeout(450);
await frame('ln-school-front', 95, 2.6, 66, 118, 5, 88);
await frame('ln-reading-room', 122, 2.6, 66, 138, 4.5, 88);
await frame('ln-green-south-playground', -20, 2.6, 108, -46, 2.2, 94);
await page.evaluate(() => { const p = window.__game.player.capsule; p.x = 0; p.z = 120; });
await page.waitForTimeout(450);
await frame('ln-mulberry-look-west', 40, 2.6, 114.5, -90, 3.5, 116);
await frame('ln-green-north-parkhouse', 10, 2.6, 126, 42, 2.5, 146);
await page.evaluate(() => { const p = window.__game.player.capsule; p.x = 130; p.z = 120; });
await page.waitForTimeout(450);
await frame('ln-gas-holder', 124, 2.6, 128, 136, 12, 146);
await frame('ln-osier-yard', 108, 2.6, 130, 118, 4, 148);
await page.evaluate(() => { const p = window.__game.player.capsule; p.x = 152; p.z = 66; });
await page.waitForTimeout(450);
await frame('ln-viaduct-north-reach', 141, 2.6, 62, 152, 9, 100);
await page.evaluate(() => { const p = window.__game.player.capsule; p.x = 228; p.z = 96; });
await page.waitForTimeout(450);
await frame('ln-larch-north-end', 222, 2.6, 66, 228, 4, 130);
await frame('ln-mulberry-look-east', 180, 2.6, 114.5, 250, 4, 118);

// the transition back: the band's south edge reads the spine behind it
await page.evaluate(() => { const p = window.__game.player.capsule; p.x = 0; p.z = 82; });
await page.waitForTimeout(450);
await frame('ln-transition-look-south', 0, 2.6, 84, 0, 4, 20);

// ---- dusk (the shipped clock beat — the band's panes must warm) ----------
await page.evaluate(() => {
  const g = window.__game;
  if (typeof g.startDusk === 'function') g.startDusk();
  else if (g.game && typeof g.game.startDusk === 'function') g.game.startDusk();
});
await sleep(3200);
await frame('ln-dusk-green', -20, 2.6, 108, 10, 5, 90);
const duskWarm = await page.evaluate(() => window.__game.world.skylineWinMat.emissiveIntensity);
console.log('DUSK WARMTH:', duskWarm);

// ---- the censuses (the pricing law: every standing position < 200) -------
const census = {};
for (const [name, x, z] of [
  ['spawn', -30, 0], ['hazel_juniper', -72, 72], ['green_south', 0, 96],
  ['mulberry_sycamore', 72, 120], ['the_holder', 130, 138], ['larch_north', 228, 96],
  ['north_wall', 76, 152],
]) {
  census[name] = await censusAt(x, z);
  console.log(`CENSUS ${name}: ${census[name]}`);
}

// ---- the walk leg: Kestrel → Juniper north → Hazel → Mulberry → Sycamore
// south, one real step at a time. The player's capsule moves 2 m per step;
// the world settles each step; the assertion reads back position + ground
// (the walk must ADVANCE and never fall through or stall against a wall).
const walk = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -72; p.z = 0; p.y = 0.05;
  const steps = [];
  const legs = [
    ['n', (t) => { p.z = 0 + t * 2; }],                       // Juniper north: z 0 → 150
    ['e', (t) => { p.x = -72 + t * 2; }],                     // Mulberry east: x −72 → 72
    ['s', (t) => { p.z = 120 - t * 2; }],                     // Sycamore south: z 120 → 0
  ];
  for (const [dir, move] of legs) {
    for (let t = 0; t <= 74; t++) {
      move(t);
      // three settle frames — the collider push-out + ground snap
      for (let i = 0; i < 3; i++) g.world.update(0.016);
      steps.push({ dir, x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2) });
      if (dir === 'n' && p.z >= 149) break;
      if (dir === 'e' && p.x >= 71) break;
      if (dir === 's' && p.z <= 1) break;
    }
  }
  // stall detection: a leg that ends far short of its target
  const endN = steps.filter((s) => s.dir === 'n').pop();
  const endE = steps.filter((s) => s.dir === 'e').pop();
  const endS = steps.filter((s) => s.dir === 's').pop();
  const stalled = (!endN || endN.z < 140 ? 1 : 0) + (!endE || endE.x < 60 ? 1 : 0) + (!endS || endS.z > 10 ? 1 : 0);
  return { steps: steps.length, stalled,
    endN: endN ? endN.z : null, endE: endE ? endE.x : null, endS: endS ? endS.z : null,
    minY: Math.min(...steps.map((s) => s.y)) };
});
console.log('WALK:', JSON.stringify(walk));

console.log('ERRORS:', errors.length, errors.slice(0, 4));
const fails = [];
if (errors.length) fails.push(`page errors: ${errors.length}`);
for (const [k, v] of Object.entries(census)) if (v >= 200) fails.push(`census ${k} = ${v} (budget < 200)`);
if (walk.stalled > 0) fails.push(`walk stalled on ${walk.stalled} leg(s)`);
if (walk.minY < -0.5) fails.push(`the walk fell below grade (min y ${walk.minY})`);
if (duskWarm <= 0) fails.push(`the band panes did not warm at dusk (${duskWarm})`);
if (fails.length) {
  console.log('LINDENHILL PROBE FAIL:');
  for (const f of fails) console.log('  -', f);
  process.exit(1);
}
console.log('LINDENHILL PROBE OK');
await browser.close();
await new Promise((r) => server.close(r));
process.exit(0);
