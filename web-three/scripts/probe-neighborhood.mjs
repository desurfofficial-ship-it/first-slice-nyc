/**
 * Probe: the neighborhood fabric pass (docs/production/terrace-buildout —
 * the W6 terrace build-out's slop-newyork continuation). Boots the built
 * page, verifies the fabric exists (the escape ironwork, the terrace faces,
 * the lit panes, the street props, the terrace masses + gardens), reads the
 * real draw-call number at the terrace rigs, and snaps street-level
 * evidence: the Larkin terrace from Gable, the Carrow terrace from Marlow,
 * the garden pocket, a fire-escape close-up, the steam stack, and one dusk
 * frame where the terrace panes warm with the skyline's.
 * Visual evidence + light census — the placement laws are unit-tested.
 * ~40 s. Run `npm run build` first.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
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
mkdirSync(new URL('../shots/neighborhood/', import.meta.url).pathname, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const fails = [];
page.on('pageerror', (e) => fails.push(`PAGEERROR: ${e.message}`));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
await page.waitForTimeout(2500); // the world settles, dressDay(1) runs

// ---- census: the fabric exists, the panes ride the shipped material ----
const census = await page.evaluate(() => {
  const g = window.__game;
  let escapes = 0, terraceFaces = 0, props = 0;
  let panes = null, paneMat = false;
  const ledger = g.world.nbhdLedger ?? [];
  for (const e of ledger) {
    if (/^Nbhd_Escape_/.test(e.name)) escapes++;
    if (/^Nbhd_TerraceFace_/.test(e.name)) terraceFaces++;
    if (/^Nbhd_(Mailbox|Bike|Hydrant|Steam|Sawhorse|Payphone)/.test(e.name)) props++;
  }
  g.world.scene.traverse((o) => {
    if (o.name === 'Nbhd_TerraceWindows') { panes = { count: o.count }; paneMat = o.material === g.world.skylineWinMat; }
  });
  // the terrace masses / walk slabs / benches are IN-TILE statics — the
  // bake fuses them away by design, so their truth lives in the colliders
  const hasBox = (x, z, tol = 1.2) => g.world.colliders.some((b) =>
    x >= b.minX - tol && x <= b.maxX + tol && z >= b.minZ - tol && z <= b.maxZ + tol && b.minY < 2);
  const masses = [-64, 64].flatMap((x) => [56.2, -56.2].map((z) => hasBox(x, z)));
  const walks = [56, -56].map((z) => hasBox(0, z, 3));
  const benches = [[-24, 62.1], [28, 62.1], [-30, -62.1], [22, -62.1]].map(([x, z]) => hasBox(x, z));
  return { escapes, terraceFaces, props, masses, walks, benches, panes, paneMat, ledger: ledger.length };
});
console.log('CENSUS:', JSON.stringify(census));
if (census.escapes < 24) fails.push(`escape fabric too sparse: ${census.escapes}`);
if (census.terraceFaces !== 2) fails.push(`terrace faces missing: ${census.terraceFaces}`);
if (census.props < 20) fails.push(`street props too sparse: ${census.props}`);
if (!census.masses.every(Boolean)) fails.push(`terrace mass colliders missing: ${JSON.stringify(census.masses)}`);
if (!census.walks.every(Boolean)) fails.push(`terrace walk slabs missing: ${JSON.stringify(census.walks)}`);
if (!census.benches.every(Boolean)) fails.push(`garden benches missing: ${JSON.stringify(census.benches)}`);
if (!census.panes || census.panes.count < 20) fails.push(`terrace panes missing: ${JSON.stringify(census.panes)}`);
if (!census.paneMat) fails.push('terrace panes do not share the skyline material');

// the z walls moved to ±64 (the W6 boundary law)
const walls = await page.evaluate(() => {
  const g = window.__game;
  let north = false, south = false;
  for (const b of g.world.colliders) {
    if (Math.abs(b.minZ - 63.5) < 0.6 && Math.abs(b.maxZ - 64.5) < 0.6) north = true;
    if (Math.abs(b.minZ + 64.5) < 0.6 && Math.abs(b.maxZ + 63.5) < 0.6) south = true;
  }
  return { north, south };
});
if (!walls.north || !walls.south) fails.push(`the z walls did not move to ±64: ${JSON.stringify(walls)}`);

// ---- composed frames (evidence, not gameplay) ----
const frame = async (name, cx, cy, cz, lx, ly, lz) => {
  await page.evaluate(([ax, ay, az, lx2, ly2, lz2]) => {
    const g = window.__game;
    g.running = false;
    const cam = g.cam.camera;
    cam.position.set(ax, ay, az);
    cam.lookAt(lx2, ly2, lz2);
    g.renderer.render(g.world.scene, cam);
  }, [cx, cy, cz, lx, ly, lz]);
  await page.screenshot({ path: `shots/neighborhood/${name}.png` });
  await page.evaluate(() => { window.__game.running = true; });
  console.log(`SHOT: ${name}`);
};

// the Larkin terrace from Gable's north walk — the brownstone pair, the
// escapes, the dressed backdrop face behind them
await frame('larkin-terrace-from-gable', -30, 3.2, 44, -64, 6, 58);
// the Carrow terrace from Marlow's south walk — the shopfronts
await frame('carrow-terrace-from-marlow', 30, 3.2, -44, 64, 5, -58);
// the Larkin garden pocket (over the backdrop roofline)
await frame('larkin-garden-pocket', 0, 3.4, 52, 0, 2, 62);
// a fire-escape close-up on the KTS-01 rear face (from Corner Park side)
await frame('fire-escape-close', -20, 2.6, -16.5, -25, 7, -20.6);
// the ConEd steam stack on the Kestrel walk
await frame('steam-stack', -63.4, 1.7, 2.5, -66.5, 1.6, 7.6);
// draw calls at the two terrace rigs (the honest pricing)
const rigDraws = await page.evaluate(() => {
  const g = window.__game;
  const out = {};
  for (const [name, x, z] of [['PLAZA', -45.5, 5.8], ['LARKIN_TERRACE', -64, 46], ['GARDEN', 0, 60]]) {
    g.player.capsule.x = x;
    g.player.capsule.z = z;
    g.cam.snapBehind({ x, y: 0.1, z });
    g.world.updateDistricts(x, z);
    g.renderer.render(g.world.scene, g.cam.camera);
    out[name] = g.renderer.info.render.calls;
  }
  return out;
});
console.log('RIG DRAWS:', JSON.stringify(rigDraws));

// dusk: the terrace panes warm with the towers' own material
await page.evaluate(() => {
  const g = window.__game;
  g.cam.camYaw = 0;
  g.player.capsule.x = -20;
  g.player.capsule.z = 40;
  g.cam.snapBehind({ x: -20, y: 0.1, z: 40 });
  if (typeof g.startDusk === 'function') g.startDusk();
  else if (g.game && typeof g.game.startDusk === 'function') g.game.startDusk();
});
await page.waitForTimeout(2600);
const duskWarm = await page.evaluate(() => window.__game.world.skylineWinMat.emissiveIntensity);
console.log('DUSK WARMTH:', duskWarm);
await frame('dusk-larkin-terrace', -30, 9, 40, -64, 7, 58);

if (duskWarm <= 0) fails.push(`the terrace panes did not warm at dusk (${duskWarm})`);
if (fails.length) {
  console.error('NEIGHBORHOOD PROBE FAILED:\n' + fails.join('\n'));
  await browser.close();
  process.exit(1);
}
console.log('NEIGHBORHOOD PROBE OK');
await browser.close();
process.exit(0);
