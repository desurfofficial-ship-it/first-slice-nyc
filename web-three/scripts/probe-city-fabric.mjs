/**
 * Probe: the city-fabric pass (docs/production/city-fabric — the
 * slop-newyork adaptation). Boots the built page, verifies the fabric
 * meshes exist (the skyline pair, the roof items, the sidewalk furniture),
 * reads the real draw-call number, and snaps street-level evidence: north
 * (the depth row behind the towers), west/east (the new vanishing-point
 * rows), south (the downtown cluster), a rooftop-tank close-up, and one
 * dusk frame where the fabric's panes share the towers' warmth.
 * Visual evidence + light census — the placement laws are unit-tested.
 * ~40 s. Run `npm run build` first.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
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
mkdirSync(new URL('../shots/city-fabric/', import.meta.url).pathname, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const fails = [];
page.on('pageerror', (e) => fails.push(`PAGEERROR: ${e.message}`));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
await page.waitForTimeout(2500); // the world settles, dressDay(1) runs

// ---- census: the fabric exists, the windows ride the shipped material ----
const census = await page.evaluate(() => {
  const g = window.__game;
  let skyline = null, windows = null, roofItems = 0, meters = 0, baskets = 0, blades = 0;
  const ledger = g.world.fabricLedger ?? [];
  for (const e of ledger) {
    if (/^Fabric_Tank_|^Fabric_Chimney_|^Fabric_RoofBox_|^Fabric_Antenna_/.test(e.name)) roofItems++;
    if (/^Fabric_Meter_/.test(e.name)) meters++;
    if (/^Fabric_Basket_/.test(e.name)) baskets++;
  }
  g.world.scene.traverse((o) => {
    if (o.name === 'SkylineFabric') {
      skyline = {
        visible: o.visible,
        fog: o.material.fog,
        verts: o.geometry.getAttribute('position').count,
      };
    }
    if (o.name === 'SkylineFabricWindows') windows = { count: o.count, mat: o.material === g.world.skylineWinMat };
    if (/^Fabric_Blade_/.test(o.name)) blades++;
  });
  return { skyline, windows, roofItems, meters, baskets, blades, draws: g.renderer.info.render.calls };
});
console.log('CENSUS:', JSON.stringify(census));
if (!census.skyline || !census.skyline.visible) fails.push('SkylineFabric missing or invisible');
if (!census.windows || !census.windows.mat) fails.push('SkylineFabricWindows missing or not sharing the skyline material');
if (census.windows && census.windows.count < 120) fails.push(`fabric windows too few: ${census.windows.count}`);
if (census.roofItems < 8) fails.push(`roof fabric too sparse: ${census.roofItems}`);
if (census.meters < 10) fails.push(`meters too sparse: ${census.meters}`);
if (census.blades < 4) fails.push(`blades missing: ${census.blades}`);

// the skyline pair must be OUTSIDE the district tiles (the NAMED_SKIP law)
const skipOk = await page.evaluate(() => {
  const g = window.__game;
  const baked = g.world.districtBatches ?? [];
  for (const b of baked) {
    if (/SkylineFabric/.test(b.name ?? '')) return false;
  }
  return true;
});
if (!skipOk) fails.push('the skyline pair joined a district tile (NAMED_SKIP violated)');

// ---- composed frames: the loop is paused and the camera is posed freely
// (evidence frames, not gameplay frames) — high above the rooflines, one
// manual render per shot, resume right after the screenshot ----
const frame = async (name, cx, cy, cz, lx, ly, lz) => {
  await page.evaluate(([ax, ay, az, lx, ly, lz]) => {
    const g = window.__game;
    g.running = false;
    const cam = g.cam.camera;
    cam.position.set(ax, ay, az);
    cam.lookAt(lx, ly, lz);
    g.renderer.render(g.world.scene, cam);
  }, [cx, cy, cz, lx, ly, lz]);
  await page.screenshot({ path: `shots/city-fabric/${name}.png` });
  await page.evaluate(() => { window.__game.running = true; });
  console.log(`SHOT: ${name}`);
};

await frame('north-depth-row', 2, 26, 26, 2, 12, 110);
await frame('west-vanishing-point', 26, 13, 0, -110, 10, 0);
await frame('east-vanishing-point', -26, 13, 0, 110, 10, 0);
await frame('south-downtown-cluster', 0, 22, -14, 10, 16, -88);

// rooftop tank close-up: from Kestrel's road, looking up-diagonal at the
// tank's own roofline — the block's front row can never block that line
const spot = await page.evaluate(() => {
  const g = window.__game;
  const e = (g.world.fabricLedger ?? []).find((l) => l.name.startsWith('Fabric_Tank_'));
  return e ? { x: e.x, z: e.z, roof: e.y } : null;
});
if (spot) {
  // from Kestrel's road, elevated to half the roof height: the facade sits
  // BELOW the sight line and the tank crowns the frame
  const camZ = spot.z > 0 ? -4 : 4;
  await frame('water-tank-close', spot.x, spot.roof * 0.55, camZ, spot.x, spot.roof + 1.6, spot.z);
}

// dusk: the fabric's panes must warm with the towers' own material
await page.evaluate(() => {
  const g = window.__game;
  g.cam.camYaw = 0;
  g.player.capsule.x = 2;
  g.player.capsule.z = 40;
  g.cam.snapBehind({ x: 2, y: 0.1, z: 40 });
  if (typeof g.startDusk === 'function') g.startDusk();
  else if (g.game && typeof g.game.startDusk === 'function') g.game.startDusk();
});
await page.waitForTimeout(2600);
const duskWarm = await page.evaluate(() => window.__game.world.skylineWinMat.emissiveIntensity);
console.log('DUSK WARMTH:', duskWarm);
await page.evaluate(() => {
  const g = window.__game;
  g.running = false;
  const cam = g.cam.camera;
  cam.position.set(2, 24, 32);
  cam.lookAt(2, 14, 110);
  g.renderer.render(g.world.scene, cam);
});
await page.screenshot({ path: 'shots/city-fabric/dusk-north.png' });
await page.evaluate(() => { window.__game.running = true; });

console.log('DRAWS:', census.draws);
if (duskWarm <= 0) fails.push(`the fabric panes did not warm at dusk (${duskWarm})`);
if (fails.length) {
  console.error('CITY-FABRIC PROBE FAILED:\n' + fails.join('\n'));
  await browser.close();
  process.exit(1);
}
console.log('CITY-FABRIC PROBE OK');
await browser.close();
process.exit(0);
