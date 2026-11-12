/**
 * Probe: the W7 gate rows (docs/production/westgate-eastgate — the map's
 * last two sides). Boots the built page, verifies the strips exist (the 24
 * gate masses, the sidewalk sheds, the strip fabric, the moved wall line),
 * reads the real draw-call number on the Westgate rig, and snaps
 * street-level evidence: the Westgate rows from Kestrel's west end, the
 * sidewalk shed close-up, the Eastgate mirror, the terrace bands' west and
 * east continuations, and one dusk frame where the shed work lights warm
 * with the skyline's. Visual evidence + light census — the placement laws
 * are unit-tested. ~40 s. Run `npm run build` first.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/westgate-eastgate/', import.meta.url).pathname;
const PORT = 4649;
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
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const fails = [];
page.on('pageerror', (e) => fails.push(`PAGEERROR: ${e.message}`));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
await page.waitForTimeout(2500);

const shot = async (name, cam, lookAt) => {
  await page.evaluate(([c, l]) => {
    const g = window.__game;
    g.running = false; // hold the loop — the camera controller owns the lens otherwise
    const cam3 = g.cam.camera;
    cam3.position.set(c[0], c[1], c[2]);
    cam3.lookAt(l[0], l[1], l[2]);
    g.renderer.render(g.world.scene, cam3);
  }, [cam, lookAt]);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  await page.evaluate(() => { window.__game.running = true; });
  console.log(`SHOT: ${name}`);
};

// ---- the census (the bake fuses named slabs — the ledger + the wall line
//      + the fabric's own names are the ground truth) -------------------------
const census = await page.evaluate(() => {
  const w = window.__game.world;
  // the bake fuses the fabric's bare meshes by design — their truth lives
  // in the ledger (the W6 probe's own law); the masses live in the colliders
  let sheds = 0, escapes = 0, lights = 0;
  for (const e of (w.nbhdLedger ?? [])) {
    if (/^Nbhd_Shed_/.test(e.name)) sheds++;
    if (/^Nbhd_Escape_/.test(e.name)) escapes++;
  }
  w.scene.traverse((o) => {
    if (o.name === 'Nbhd_ShedLights') lights = o.count ?? 0;
  });
  const hasBox = (x, z, tol = 1.2) => w.colliders.some((b) =>
    x >= b.minX - tol && x <= b.maxX + tol && z >= b.minZ - tol && z <= b.maxZ + tol && b.minY < 2);
  const terraceMasses = [[-88, 56.2], [-96, 56.2], [88, 56.2], [96, 56.2],
    [-88, -56.2], [-96, -56.2], [88, -56.2], [96, -56.2]].map(([x, z]) => hasBox(x, z)).filter(Boolean).length;
  const rowMasses = [[-88, 26], [-96, 26], [88, 26], [96, 26],
    [-88, 14], [-96, 14], [88, 14], [96, 14],
    [-88, -14], [-96, -14], [88, -14], [96, -14],
    [-88, -26], [-96, -26], [88, -26], [96, -26]].map(([x, z]) => hasBox(x, z)).filter(Boolean).length;
  // the wall line: the boundary collider's extreme x
  let wallX = 0;
  for (const c of w.colliders) wallX = Math.max(wallX, c.maxX ?? 0);
  return { sheds, escapes, terraceMasses, rowMasses, lights, wallX,
    ledger: (w.nbhdLedger ?? []).length };
});
console.log('CENSUS:', JSON.stringify(census));

let ok = true;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'ok' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!cond) ok = false;
};
check('three sidewalk sheds built', census.sheds === 3, `${census.sheds}`);
check('the shed work-light string hangs (18 bulbs, one instanced draw)', census.lights === 18, `${census.lights}`);
check('strip escape ironwork built', census.escapes >= 20, `${census.escapes} bay meshes`);
check('the eight terrace-band masses stand', census.terraceMasses === 8, `${census.terraceMasses}`);
check('the sixteen mid-row masses stand', census.rowMasses === 16, `${census.rowMasses}`);
check('the wall line reads x ±100', census.wallX >= 100, `maxX ${census.wallX}`);
check('zero page errors', fails.length === 0, fails.join(' | '));

// ---- the rig draw census at the Westgate front -------------------------------
const draws = await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -92;
  g.player.capsule.z = 6.5;
  g.cam.snapBehind({ x: -92, y: 0.1, z: 6.5 });
  g.world.updateDistricts(-92, 6.5);
  g.renderer.render(g.world.scene, g.cam.camera);
  return g.renderer.info.render.calls;
});
console.log('WESTGATE RIG DRAWS:', draws);
check('the Westgate rig holds the draw budget', draws < 220, `${draws} calls`);

// ---- the evidence shots ------------------------------------------------------
await shot('westgate-from-kestrel', [-70, 2.4, 6.5], [-97, 5.5, 6.5]);
await shot('westgate-shed', [-84.2, 1.6, 7.0], [-90.5, 2.4, 6.3]);
await shot('eastgate-from-kestrel', [70, 2.4, -6.5], [97, 5.5, -6.5]);
await shot('larkin-band-west-from-gable', [-70, 2.2, 40], [-95, 5, 50]);
await shot('carrow-band-east-from-marlow', [70, 2.2, -40], [95, 5, -50]);
// dusk: start the tween, let it run, then hold and shoot — the shed's
// work-light string rides the skyline material, so the bulbs warm with it
await page.evaluate(() => {
  const g = window.__game;
  if (typeof g.startDusk === 'function') g.startDusk();
  else if (g.game && typeof g.game.startDusk === 'function') g.game.startDusk();
});
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const g = window.__game;
  g.running = false;
  g.world.skylineWinMat.emissiveIntensity = 1.3;
  const cam3 = g.cam.camera;
  cam3.position.set(-87.5, 1.7, 4.9);
  cam3.lookAt(-90.2, 3.35, 7.4); // up at the deck's street edge — the bulb line
  g.renderer.render(g.world.scene, cam3);
});
await page.screenshot({ path: join(OUT, 'dusk-westgate-shed.png') });
await page.evaluate(() => { window.__game.running = true; });
console.log('SHOT: dusk-westgate-shed');

await browser.close();
server.close();
if (!ok) { console.error('WESTGATE-EASTGATE PROBE: FAIL'); process.exit(1); }
console.log('WESTGATE-EASTGATE PROBE OK');
