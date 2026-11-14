/**
 * Probe: the West Reach evidence set (docs/world-building/west-reach-design.md
 * §the visual deliverables). ONE boot captures: the corridor's street frames
 * (the theater marquee, the garden, Kestrel West both ways), the canyon east
 * mouth, the Junction Mews (the docks' new surface door), the far read from
 * Alder, the aerial + isometric overviews of the grown west, and the draw
 * census at six standing positions (the pricing law's own check). The walk
 * leg moves the player Alder → corridor → canyon → mews → docks one step at
 * a time — the one-coherent-world assertion, in the real game. Evidence
 * frames, not gameplay assertions. Run `npm run build` first. ~60 s.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4617;
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
const OUT = new URL('../shots/westreach/', import.meta.url).pathname;
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

console.log('BOOT:', await page.evaluate(() => {
  const g = window.__game;
  return JSON.stringify({ draws: g.renderer.info.render.calls });
}));


// ---- the far read: the west silhouette from Alder (the honest boot state)
await frame('wr-far-read-from-alder', -60, 3.2, 2.2, -140, 6, 2);

// ---- walk the player west (the district lattice follows), then the frames
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -190; p.z = 0;
});
await page.waitForTimeout(450); // the lattice follows on the next game frame — the batches must light for the new column before the manual frames

// the overviews (captured at the honest boot state — the dusk fog deepens with the clock)
// the overviews
await page.evaluate(([ax, ay, az]) => {
  const g = window.__game;
  g.running = false;
  const cam = g.cam.camera;
  cam.up.set(0, 0, 1);
  cam.position.set(ax, ay, az);
  cam.lookAt(-190, 0, 0);
  g.renderer.render(g.world.scene, cam);
}, [-190, 150, 0.1]);
await page.screenshot({ path: `${OUT}wr-aerial-top-down.png` });
await page.evaluate(() => { window.__game.running = true; });
console.log('SHOT: wr-aerial-top-down');

await frame('wr-isometric-overview', -160, 46, 66, -230, 4, -6);

// the corridor's frames
await frame('wr-theater-marquee', -212, 2.0, -7.5, -212, 4.8, 10);
await frame('wr-garden-gate', -128, 2.6, 6.6, -120, 2.2, 12);
await frame('wr-kestrel-west-look-west', -150, 2.6, 6.5, -262, 3.5, 2);
await frame('wr-kestrel-west-look-east', -240, 2.6, 6.5, -140, 3.5, 2);
await frame('wr-willow-street', -232, 2.6, -14, -232, 4, 14);
await frame('wr-canyon-east-mouth', -262, 2.6, 6.5, -310, 8, 0);

// the canyon + the mews (zone-gated content lights as the player arrives)
await page.evaluate(() => { const p = window.__game.player.capsule; p.x = -330; p.z = -6; });
await page.waitForTimeout(450);
await frame('wr-canyon-square', -320, 2.6, -6.5, -368, 9, 0);
await page.evaluate(() => { const p = window.__game.player.capsule; p.x = -379; p.z = -6; });
await page.waitForTimeout(450);
await frame('wr-mews-entrance', -378, 2.6, -8.5, -388, 2.5, -22);
await page.evaluate(() => { const p = window.__game.player.capsule; p.x = -384; p.z = -30; });
await page.waitForTimeout(450);
await frame('wr-mews-to-docks', -384, 2.6, -30, -404, 2.5, -50);
await page.evaluate(() => { const p = window.__game.player.capsule; p.x = -405; p.z = -44; });
await page.waitForTimeout(450);
await frame('wr-docks-from-mews', -400, 2.6, -44, -420, 4, -10);


// ---- the censuses (the pricing law: every standing position < 200) -------
const census = {};
for (const [name, x, z] of [
  ['spawn', -30, 0], ['corridor_mid', -190, 0], ['garden', -120, 20],
  ['canyon', -330, 0], ['mews', -384, -30], ['docks_spur', -410, 0],
]) {
  census[name] = await censusAt(x, z);
  console.log(`CENSUS ${name}: ${census[name]}`);
}

// ---- the walk leg: Alder → corridor → canyon → mews → docks, one real ----
// step at a time. The player's capsule moves 2 m west per step; the world
// settles each step; the assertion reads back position + ground (the walk
// must ADVANCE and never fall through or stall against a wall).
const walk = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -90; p.z = 0; p.y = 0.05;
  const steps = [];
  let stalled = 0;
  for (let x = -90; x >= -420; x -= 2) {
    p.x = x;
    // three settle frames — the collider push-out + ground snap
    for (let i = 0; i < 3; i++) g.world.update(0.016);
    const gy = g.world.groundHeightAt ? g.world.groundHeightAt(p.x, p.z) : null;
    steps.push({ x, px: +p.x.toFixed(2), py: +p.y.toFixed(2), gy: gy === null ? null : +gy.toFixed(2) });
    if (Math.abs(p.x - x) > 1.5) stalled++;
  }
  return { steps: steps.length, stalled, lastX: +p.x.toFixed(2), lastY: +p.y.toFixed(2),
    minY: Math.min(...steps.map((s) => s.py)), drifted: steps.filter((s) => Math.abs(s.px - s.x) > 0.35).length };
});
console.log('WALK:', JSON.stringify(walk));

console.log('ERRORS:', errors.length, errors.slice(0, 4));
const fails = [];
if (errors.length) fails.push(`page errors: ${errors.length}`);
for (const [k, v] of Object.entries(census)) if (v >= 200) fails.push(`census ${k} = ${v} (budget < 200)`);
if (walk.stalled > 2) fails.push(`walk stalled ${walk.stalled} times`);
if (walk.lastX > -400) fails.push(`walk did not reach the docks (last x ${walk.lastX})`);
if (walk.minY < -0.5) fails.push(`the walk fell below grade (min y ${walk.minY})`);
if (fails.length) {
  console.log('WESTREACH PROBE FAIL:');
  for (const f of fails) console.log('  -', f);
  process.exit(1);
}
console.log('WESTREACH PROBE OK');
await browser.close();
await new Promise((r) => server.close(r));
process.exit(0);
