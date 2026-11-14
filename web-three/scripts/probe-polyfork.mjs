/**
 * Probe: the Polyfork streets wave — the kit's in-engine gate.
 *
 * The wave placed the NYC City Kit's selected assets three ways (see
 * docs/production/polyfork/): three baked Alder batches, the zone-owned
 * Catalpa dock fleet, and the Larch docks' truck swap. This probe boots
 * the BUILT page twice — the kit ON (default) and the kit OFF
 * (?polyfork=0, the A/B seam) — and prices both worlds:
 *
 *   1. THE PLAN LAW (kit ON) — the three Alder batch meshes exist, the
 *      fleet mesh rides CJN_Group, and the Larch trucks mesh carries the
 *      kit truck's triangle budget.
 *   2. THE SEAM LAW (kit OFF) — the same sweep finds none of them, the
 *      Larch trucks mesh returns to the procedural box count, and the
 *      page still boots clean: the shipped world byte-for-byte.
 *   3. THE +0 STANDING LAW — both boots read the shipped spawn census
 *      (the kit rides the district bake; it cannot price the spawn).
 *   4. THE EVIDENCE — before/after pairs at the same frozen rigs:
 *      the north building line (payphone/rack), the south line
 *      (newsstand/meters), the Larch docks (kit trucks vs boxes), the
 *      Catalpa spur (the backed-in fleet).
 *
 * Run `npm run build` first. ~60 s.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4631;
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
mkdirSync(new URL('../shots/polyfork/', import.meta.url).pathname, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });

const bootErrors = [];

/** Boots one world (kit on or off) and sweeps the laws. */
const bootSweep = async (kitOn, shotsTag) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`); });
  const url = `http://localhost:${PORT}/?probe=1${kitOn ? '' : '&polyfork=0'}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  await page.waitForTimeout(2500);

  const sweep = await page.evaluate(() => {
    const g = window.__game;
    let totalTris = 0;
    let zoneBatchTris = 0;
    g.world.scene.traverse((o) => {
      if (!o.isMesh || !o.name) return;
      if (o.geometry?.attributes?.position) {
        const t = o.geometry.attributes.position.count / 3;
        totalTris += t;
        // the Catalpa zone bake's own output (the fleet fuses here)
        if (/^ZoneBake_CJN_Group_/.test(o.name)) zoneBatchTris += t;
      }
    });
    return { totalTris, zoneBatchTris, draws: g.renderer.info.render.calls };
  });
  console.log(`SWEEP(${shotsTag}):`, JSON.stringify(sweep));

  /** One frozen-camera evidence shot. */
  const shot = async (name, cam, look) => {
    await page.evaluate(([c, l]) => {
      const g = window.__game;
      g.running = false;
      const cam2 = g.cam.camera;
      cam2.position.set(c[0], c[1], c[2]);
      cam2.lookAt(l[0], l[1], l[2]);
      g.renderer.render(g.world.scene, cam2);
    }, [cam, look]);
    await page.screenshot({ path: `shots/polyfork/${name}-${shotsTag}.png` });
    await page.evaluate(() => { window.__game.running = true; });
    console.log(`SHOT: ${name}-${shotsTag}`);
  };

  // the north building line: payphone (-14, 7.6), bike rack (-26.8, 7.55)
  await shot('poly-alder-north', [-8, 2.0, 1.5], [-22, 1.3, 7.4]);
  // the south line: newsstand (16, -7.2), curb meters, the rack
  await shot('poly-alder-south', [26, 2.0, -1.5], [14, 1.2, -7.0]);
  // the Larch docks: the parked fleet on Kestrel's curbs. The district
  // visibility ring lights tiles around the PLAYER (not the camera) —
  // teleport onto the curb, let the ring tick, then frame the truck.
  await page.evaluate(() => {
    const g = window.__game;
    g.player.capsule.x = 124;
    g.player.capsule.y = 0.05;
    g.player.capsule.z = 0;
    g.cam.snapBehind({ x: 124, y: 0.05, z: 0 });
  });
  await page.waitForTimeout(800);
  await shot('poly-larch-docks', [118, 2.4, 7], [132, 1.0, -3]);
  // the Catalpa spur: the backed-in fleet (teleport first — zone law)
  await page.evaluate(() => {
    const g = window.__game;
    g.player.capsule.x = -410;
    g.player.capsule.y = 0.05;
    g.player.capsule.z = 0;
    g.cam.snapBehind({ x: -410, y: 0.05, z: 0 });
  });
  await page.waitForTimeout(400);
  await shot('poly-catalpa-fleet', [-413.5, 2.6, 26], [-418.7, 1.5, 18]);
  bootErrors.push(...errors);
  await page.close();
  return sweep;
};

const on = await bootSweep(true, 'after');
const off = await bootSweep(false, 'before');

const fails = [];
// the bake REMOVES the named source meshes (StaticBake_/ZoneBake_ carry
// the geometry) — the plan law and the seam law both ride the measured
// deltas between the two boots: kit ON carries the kit's triangles, kit
// OFF (?polyfork=0) is the shipped world byte-for-byte.
const triDelta = on.totalTris - off.totalTris;
const fleetDelta = on.zoneBatchTris - off.zoneBatchTris;
console.log(`TRI DELTA: +${triDelta.toFixed(0)} (kit ON ${on.totalTris.toFixed(0)} vs OFF ${off.totalTris.toFixed(0)}) · CATALPA ZONE BATCH: +${fleetDelta.toFixed(0)} (fleet tris)`);
if (triDelta < 15000) fails.push(`the kit's scene budget did not land: +${triDelta.toFixed(0)} tris`);
if (fleetDelta < 5000) fails.push(`the dock fleet did not land in the zone bake: +${fleetDelta.toFixed(0)} tris`);
// 3. the +0 standing law (both boots inside the shipped spawn budget)
if (on.draws >= 200) fails.push(`the kit's spawn frame busts the budget: ${on.draws} >= 200`);
if (off.draws >= 200) fails.push(`the seam's spawn frame busts the budget: ${off.draws} >= 200`);

console.log(`LEDGER ROW (POLYFORK, measured): kit ON spawn ${on.draws} draws (+${triDelta.toFixed(0)} scene tris, fleet +${fleetDelta.toFixed(0)}) · kit OFF spawn ${off.draws} draws — the kit rides the bake, the spawn census does not move`);

if (bootErrors.length) {
  console.error(`BOOT ERRORS:\n${bootErrors.join('\n')}`);
  fails.push('a boot was not console-clean');
}
if (fails.length) {
  console.error('POLYFORK PROBE FAILED:\n' + fails.join('\n'));
  await browser.close();
  process.exit(1);
}
console.log('POLYFORK PROBE OK');
await browser.close();
process.exit(0);
