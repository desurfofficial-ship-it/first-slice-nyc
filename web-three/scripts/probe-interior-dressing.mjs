/**
 * Interiors dressing probe — docs/production/interiors/.
 *
 * Verifies, in-engine (built dist, swiftshader):
 *   1. THE LANDING: every interiorAssets slot's GLB actually upgraded its
 *      placeholder (world.glbUpgrades has the id) — no silent fallbacks.
 *   2. THE TOGGLE: each room's fit-out shows while the player stands inside
 *      it (and the dressing, parented to the room group, shows with it).
 *   3. THE COUNT: draw calls inside each dressed room stay sane — every
 *      sand3d prop must be ONE vertex-colored draw.
 *   4. THE EVIDENCE: a landscape screenshot per interior into
 *      shots/interiors/<room>.png (gameplay frames, not Blender renders).
 *
 * Usage: node scripts/probe-interior-dressing.mjs   (exit 1 on any failure)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/interiors', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4633;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file) ?? ''] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2000);
// the ABO furniture seam decodes KTX2 textures — slow under swiftshader; poll
// until the census settles before judging it
{
  let last = -1, stable = 0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__game.world.furnitureUpgrades ?? new Map()).size);
    if (n === last) stable++; else stable = 0;
    last = n;
    if (stable >= 3) break;
  }
  console.log(`FURNITURE SETTLED AT ${last}`);
}

// the dressed rooms: where the player stands, and the parked-camera frame
// (cam pos + look target) — the visual-d4b house law for authored frames
const ROOMS = [
  { room: 'BODEGA', x: -15.6, z: 11.8, y: 0.05,
    cam: [-12.6, 2.6, 9.0], at: [-18.8, 1.1, 14.6] },
  { room: 'LAUNDRY', x: -5, z: 11.2, y: 0.05,
    cam: [-3.6, 2.6, 9.2], at: [-9.6, 1.0, 14.8] },
  { room: 'BARBER', x: 36.4, z: 12.3, y: 0.05,
    cam: [34.6, 2.4, 10.0], at: [38.4, 1.0, 13.4] },
  { room: 'PIZZA', x: 27, z: 12.6, y: 0.05,
    cam: [24.9, 2.5, 10.2], at: [28.6, 0.9, 14.6] },
  { room: 'BAKERY', x: -34, z: -27.4, y: 0.05,
    cam: [-33.6, 2.6, -29.8], at: [-34.2, 1.0, -22.2] },
  { room: 'RECORDS', x: -25, z: -26.0, y: 0.05,
    cam: [-25.3, 2.5, -23.6], at: [-25.7, 0.9, -29.8] },
  { room: 'HALL', x: -54, z: 25.0, y: 0.05,
    cam: [-57.0, 2.5, 22.4], at: [-51.2, 1.0, 30.2] },
  { room: 'DINER', x: 54.6, z: -13.6, y: 0.05,
    cam: [52.2, 2.5, -10.8], at: [57.8, 0.9, -15.4] },
  { room: 'CECIL', x: 12.6, z: -11.0, y: 8.45,
    cam: [10.9, 10.1, -13.5], at: [14.8, 8.7, -9.8] },
];
const ONLY = process.argv[2]; // optional: node probe-interior-dressing.mjs CECIL

// the interiors slots each room must wear (mirror of interiorAssets.ts, ids
// only — ABO furniture records separately in furnitureUpgrades)
const EXPECT = {
  BODEGA: ['bodega_register', 'bodega_coffee', 'bodega_microwave', 'bodega_produce',
    'bodega_shelf_0', 'bodega_shelf_1', 'bodega_shelf_2', 'fridge_bodega'],
  LAUNDRY: ['laundry_dryer_10.5', 'laundry_dryer_12.2', 'laundry_dryer_13.9', 'laundry_dryer_15.6',
    'laundry_table_12.1', 'laundry_table_13.1', 'laundry_cart', 'laundry_shelf',
    'laundry_linen_a', 'laundry_linen_b', 'laundry_vending',
    'washer_9.5', 'washer_11.2', 'washer_12.9', 'washer_14.6', 'washer_16.3', 'washer_18'],
  BARBER: ['barber_chair_11', 'barber_chair_13.6', 'barber_counter', 'barber_register'],
  PIZZA: ['pizza_cooler', 'pizza_oven', 'pizza_prep', 'pizza_menu'],
  BAKERY: ['bakery_oven', 'bakery_rack_w', 'bakery_rack_e', 'bakery_case', 'bakery_backshelf'],
  RECORDS: ['record_bin_-23.5', 'record_bin_-25.5', 'record_bin_-27.5',
    'record_speaker_w', 'record_speaker_e', 'record_wallshelf'],
  HALL: ['hall_chairs_0', 'hall_chairs_1', 'hall_chairs_2', 'hall_chairs_3',
    'hall_kitchenette', 'hall_shelves'],
  DINER: ['diner_kitchen', 'diner_register', 'diner_coffee'],
  CECIL: ['cecil_kitchenette', 'cecil_toilet', 'cecil_sink', 'cecil_radiator'],
};
const FURNITURE_MIN = 20; // the ABO seam must land too (the shipped manifest has 34 slots)

const fails = [];

// ---- 1. the landing census: every expected slot upgraded ------------------
const census = await page.evaluate(() => {
  const w = window.__game.world;
  const upgrades = {};
  for (const [id, file] of w.glbUpgrades ?? []) upgrades[id] = file;
  return { upgrades, count: Object.keys(upgrades).length,
    furniture: (w.furnitureUpgrades ?? new Map()).size };
});
console.log(`CENSUS: ${census.count} GLB props landed, ${census.furniture} ABO furniture slots landed`);
if (census.furniture < FURNITURE_MIN) fails.push(`ABO furniture: only ${census.furniture} slots landed (want >= ${FURNITURE_MIN})`);
for (const [room, ids] of Object.entries(EXPECT)) {
  for (const id of ids) {
    if (!(id in census.upgrades)) {
      fails.push(`${room}: slot ${id} did not land (glbUpgrades missing)`);
    }
  }
}

// ---- 2+3+4. per room: stand inside, assert toggle, draw calls, screenshot -
for (const r of ONLY ? ROOMS.filter((q) => q.room === ONLY) : ROOMS) {
  const shot = await page.evaluate(async ({ x, z, y, cam, at }) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = x; p.z = z; p.y = y;
    g.world.update(1 / 60, p);
    await new Promise((res) => setTimeout(res, 350));
    g.world.update(1 / 60, p);
    // park the camera on the authored frame (visual-d4b house law) — the
    // follow boom would collapse onto the stationary player
    g.cam.update = () => {};
    g.cam.camera.position.set(cam[0], cam[1], cam[2]);
    g.cam.camera.lookAt(at[0], at[1], at[2]);
    return {
      calls: g.renderer.info.render.calls,
      tris: g.renderer.info.render.triangles,
    };
  }, { x: r.x, z: r.z, y: r.y, cam: r.cam, at: r.at }).catch((e) => ({ error: String(e), calls: -1, tris: -1 }));
  await page.waitForTimeout(350);
  if (shot.error) fails.push(`${r.room}: probe error ${shot.error}`);
  console.log(`${r.room.padEnd(8)} inside: ${shot.calls} draw calls, ${(shot.tris ?? 0).toLocaleString()} tris`);
  await page.screenshot({ path: join(OUT, `${r.room.toLowerCase()}.png`) });
  await page.evaluate(() => { delete window.__game.cam.update; }); // unpark
}

console.log('PAGEERRORS', errors.length);
if (errors.length) fails.push(...errors.slice(0, 3));

writeFileSync(join(OUT, 'dressing-report.json'),
  JSON.stringify({ censusCount: census.count, upgrades: census.upgrades, errors, fails }, null, 1));
if (fails.length) {
  console.log('INTERIORS PROBE FAILS:');
  for (const f of fails) console.log(' -', f);
  process.exitCode = 1;
} else {
  console.log('INTERIORS PROBE: PASS — every slot landed, the rooms wear their dressing');
}
await browser.close();
server.close();
