/**
 * Pedestrians probe — boots the game, samples each ambient walker's position
 * over time, and verifies: (1) they move, (2) they keep sidewalk discipline
 * (on the sidewalks, or crossing inside the crosswalk band), (3) nobody ends
 * up inside the cart. Captures one screenshot of street life.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4585;
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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

const sample = () => page.evaluate(() => {
  const g = window.__game;
  const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
  if (!grp) return null;
  return grp.children.map((c) => ({ x: +c.position.x.toFixed(2), y: +c.position.y.toFixed(2), z: +c.position.z.toFixed(2) }));
});

const t0 = await sample();
await page.waitForTimeout(9000);
const t1 = await sample();
await page.waitForTimeout(9000);
const t2 = await sample();

const cart = await page.evaluate(() => {
  const g = window.__game;
  return { x: +g.world.cartRoot.position.x.toFixed(2), z: +g.world.cartRoot.position.z.toFixed(2) };
});

console.log('cart at', JSON.stringify(cart));

// ---- district legality (WP-3v): the walkers COMMUTE now — they range the
// whole walked district, so the old home-street band (|z| 4..8) no longer
// describes the legal world. The law they answer to is the ONE nav graph's:
// never inside a footprint, and on the road only inside a zebra corridor.
const law = await page.evaluate(() => {
  const g = window.__game;
  const nav = g.worldSim.nav;
  const doc = g.worldSim.registry.doc;
  return {
    bands: nav.crosswalkBands(),
    fps: (doc.buildings ?? []).filter((b) => b.class !== 'D' && b.footprint).map((b) => b.footprint),
    roads: (doc.streets ?? []).map((s) => s.road).filter(Boolean),
  };
});
const legalSpot = (p) => {
  const { bands, fps, roads } = law;
  for (const fp of fps) {
    if (p.x > fp.x - fp.w / 2 + 0.05 && p.x < fp.x + fp.w / 2 - 0.05
      && p.z > fp.z - fp.d / 2 + 0.05 && p.z < fp.z + fp.d / 2 - 0.05) return 'footprint';
  }
  const onRoad = roads.some((r) => p.x > r.xMin + 0.05 && p.x < r.xMax - 0.05
    && p.z > r.zMin + 0.05 && p.z < r.zMax - 0.05);
  if (!onRoad) return 'ok';
  const inZebra = bands.some((b) => (Math.abs(p.x - b.x) <= b.half + 0.5 && Math.abs(p.z - b.z) <= 7.0)
    || (Math.abs(p.z - b.z) <= b.half + 0.5 && Math.abs(p.x - b.x) <= 7.0));
  return inZebra ? 'ok' : 'jaywalk';
};

let failures = 0;
for (let i = 0; i < 3; i++) {
  const a = t0?.[i]; const b = t1?.[i]; const c = t2?.[i];
  if (!a || !b || !c) { console.log(`ped ${i}: MISSING`); failures++; continue; }
  const moved = Math.hypot(b.x - a.x, b.z - a.z) + Math.hypot(c.x - b.x, c.z - b.z);
  const verdict = [b, c].map(legalSpot);
  const ok = verdict.every((v) => v === 'ok');
  const inCart = Math.hypot(c.x - cart.x, c.z - cart.z) < 1.2;
  console.log(`ped ${i}: t0(${a.x},${a.z}) t1(${b.x},${b.z}) t2(${c.x},${c.z}) moved=${moved.toFixed(1)}m district=${ok ? 'ok' : verdict.join('/')} cartClear=${inCart ? 'INSIDE CART' : 'ok'}`);
  if (moved < 1 || !ok || inCart) failures++;
}

// a street-life screenshot mid-block
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -2; g.player.capsule.z = 5.6;
  g.cam.snapBehind({ x: g.player.capsule.x, y: g.player.capsule.y, z: g.player.capsule.z });
});
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, 'peds-street.png') });
console.log(`screenshot: shots/peds-street.png`);

// ---- the street schedule (M4): the evening rush --------------------------
// G is the shipped debug lever (Game.update: "G forces dusk + the gold
// window") — the same dusk flag the schedule reads. The day assertions
// above already prove the day row (the shipped street, unchanged); this
// section proves the wiring and the dusk row: the rush on stage, the
// park's tender home, the cab pacing down, the floor still walking.
await page.keyboard.down('g');
await page.waitForTimeout(300);
await page.keyboard.up('g');
await page.waitForTimeout(2500);

const readStreet = () => page.evaluate(() => {
  const g = window.__game;
  const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
  const kids = grp ? grp.children : [];
  return {
    plan: { duskShift: g.world.streetPlanNow().duskShift, cabPace: g.world.streetPlanNow().cabPace },
    total: kids.length,
    visible: kids.filter((c) => c.visible).length,
    parkHidden: kids[7] ? !kids[7].visible : null,   // build order: 7 = the garden tender
    rush: kids.slice(9).map((c) => ({ x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2), visible: c.visible })),
    trio: kids.slice(0, 3).map((c) => ({ x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2), visible: c.visible })),
  };
});

const duskA = await readStreet();
await page.waitForTimeout(4000);
const duskB = await readStreet();

let duskFail = 0;
if (duskA.plan.cabPace !== 0.7 || duskA.plan.duskShift !== 3) { console.log(`dusk plan wiring WRONG: ${JSON.stringify(duskA.plan)}`); duskFail++; }
if (duskA.total !== 12) { console.log(`roster WRONG: ${duskA.total} (12 expected)`); duskFail++; }
if (duskA.visible !== 11 || duskA.parkHidden !== true) { console.log(`dusk stage WRONG: visible ${duskA.visible}/12, parkHidden ${duskA.parkHidden}`); duskFail++; }
for (let i = 0; i < 3; i++) {
  const a = duskA.rush[i]; const b = duskB.rush[i];
  const moved = Math.hypot(b.x - a.x, b.z - a.z);
  const onWalk = b.z >= 5.0 && b.z <= 8.2; // the north-walk band, yields included
  console.log(`rush ${i}: t0(${a.x},${a.z}) t1(${b.x},${b.z}) moved=${moved.toFixed(1)}m stage=${a.visible && b.visible ? 'ok' : 'HIDDEN'} band=${onWalk ? 'ok' : 'VIOLATION'}`);
  if (!a.visible || !b.visible || moved < 0.5 || !onWalk) duskFail++;
}
for (let i = 0; i < 3; i++) {
  const a = duskA.trio[i]; const b = duskB.trio[i];
  const moved = Math.hypot(b.x - a.x, b.z - a.z);
  if (!a.visible || !b.visible || moved < 0.2) { console.log(`floor ${i}: NOT WALKING AT DUSK (moved ${moved.toFixed(1)}m)`); duskFail++; }
}

// the dusk street — the player stands IN the rush stretch (the bodega→plaza
// walk, where the subway draw lands), so the thicker crowd reads at lens range
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -30; g.player.capsule.z = 6.4;
  g.cam.snapBehind({ x: g.player.capsule.x, y: g.player.capsule.y, z: g.player.capsule.z });
});
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, 'peds-dusk-rush.png') });
console.log(`screenshot: shots/peds-dusk-rush.png`);

const allFail = failures + duskFail;
console.log(allFail === 0 && errors.length === 0 ? 'PEDS OK' : `PEDS FAILURES: ${allFail}${errors.length ? '; pageerrors: ' + errors.join('|') : ''}`);
await browser.close();
server.close();
process.exit(allFail === 0 && errors.length === 0 ? 0 : 1);
