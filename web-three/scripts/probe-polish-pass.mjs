/**
 * The polish pass probe (2026-11 — "is the environment enough to convince
 * someone to play?"). Pins the pass's five laws against the booted game:
 *   1. THE FEET LAW — no prop floats: every interior GLB wrapper's feet sit
 *      on its placeholder's ground (the upgradePropWithGLB AABB-min law).
 *      Named spot-checks for the rows the baseline caught floating (the
 *      washers, the dryers, the bodega counter trio + produce crate, the
 *      barber chairs, the record crates, the home's fixtures).
 *   2. THE PICK FLOW — the wardrobe's pick mode is the film's handover:
 *      the panel carries the pick row, six tiles, the wear button.
 *   3. THE ROOMS' PALETTE — every W5 room wears its light strip + wainscot
 *      bands, and the nine floors are nine different colors.
 *   4. THE DELI READ — the bodega wears its menu board, product rows, chip
 *      bags and door mat.
 *   5. EVIDENCE — polish-pass2 shots for the before/after report.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/polish-pass2', import.meta.url).pathname;
const PORT = 4645;
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
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForFunction(() => window.__game?.world?.furnitureUpgrades?.size >= 40, null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(1500);

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) fails++;
};

// ---- 1. THE FEET LAW --------------------------------------------------------
const feet = await page.evaluate(() => {
  const bboxOf = (name) => {
    const g = window.__game.world.scene.getObjectByName(name);
    if (!g) return null;
    g.updateWorldMatrix(true, true);
    let mny = Infinity;
    g.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox; const e = o.matrixWorld.elements;
      for (let i = 0; i < 8; i++) {
        const x = (i & 1) ? bb.max.x : bb.min.x; const y = (i & 2) ? bb.max.y : bb.min.y; const z = (i & 4) ? bb.max.z : bb.min.z;
        mny = Math.min(mny, e[1] * x + e[5] * y + e[9] * z + e[13]);
      }
    });
    return mny === Infinity ? null : +mny.toFixed(3);
  };
  const out = {};
  window.__game.world.scene.traverse((o) => {
    if (o.name?.endsWith('_glb') && !out[o.name]) out[o.name] = bboxOf(o.name);
  });
  return out;
});
// the spot-checks: name → [expected feet, tolerance]. These were the rows
// the 2026-11 baseline caught hanging (washers rode 0.9 up, the crate 0.25).
const SPOTS = [
  ['LW_slot_9.5_glb', 0.16, 0.06],    // washers: floor skin
  ['LW_slot_18_glb', 0.16, 0.06],
  ['LD_slot_10.5_glb', 0.16, 0.06],   // dryers
  ['Bodega_Produce_glb', 0.11, 0.06], // the crate sat 0.25 up
  ['Bodega_Register_glb', 1.1, 0.06], // the counter trio rode 0.15-0.22 up
  ['Bodega_Coffee_glb', 1.1, 0.06],
  ['Bodega_Microwave_glb', 1.1, 0.06],
  ['Bodega_BackShelf_0_glb', 0.0, 0.1], // the gondolas rode 0.82 up
  ['Fridge_Bodega_glb', 0.0, 0.1],
  ['Barber_Chair_11.0_glb', 0.16, 0.06],
  ['Pizza_Oven_glb', 0.0, 0.2],       // oven base rides the slab (min 0)
  ['Bakery_Oven_glb', 0.0, 0.2],
  ['Records_Crate_-23.5_glb', 0.16, 0.06],
  ['Hall_Kitchenette_glb', 0.0, 0.2],
  ['Diner_Kitchen_glb', 0.0, 0.2],
  ['Cecil_Kitchenette_glb', 8.41, 0.1],
  ['Cecil_Toilet_glb', 8.41, 0.1],
  ['hydrant_glb', 0.0, 0.1],          // the street float the audit caught
];
for (const [n, want, tol] of SPOTS) {
  const f = feet[n];
  check(`feet law: ${n} on its ground`, f !== null && Math.abs(f - want) <= tol,
    f === null ? 'MISSING' : `feet=${f} want≈${want}`);
}

// ---- 2. THE PICK FLOW -------------------------------------------------------
// open the fitting room's pick mode directly (the film-path integration is
// a5h's beat — here the DOM contract is the law)
await page.evaluate(() => (window.__game).wardrobe.openPick('classic'));
await page.waitForTimeout(800);
const pick = await page.evaluate(() => {
  const panel = document.getElementById('wardrobe-panel');
  const pickRow = document.getElementById('wardrobe-pick');
  const wear = document.getElementById('wardrobe-wear');
  const nameRow = document.getElementById('wardrobe-pick-name');
  const title = document.getElementById('wardrobe-title');
  return {
    open: panel && !panel.hidden,
    dom: !!pickRow && !!wear && !!nameRow && !pickRow.hidden,
    title: title?.textContent ?? '',
    tiles: panel ? panel.querySelectorAll('.wardrobe-tile').length : 0,
    wearLabel: wear?.textContent ?? '',
    nameInputs: nameRow ? nameRow.querySelectorAll('input').length : 0,
    closeHidden: document.getElementById('wardrobe-close')?.hidden === true,
  };
});
check('pick flow: openPick greets "Who got off the bus?" with the name row', pick.open && pick.dom
  && pick.title === 'Who got off the bus?' && pick.tiles === 6 && pick.nameInputs === 3
  && pick.closeHidden,
  `title=${pick.title} tiles=${pick.tiles} inputs=${pick.nameInputs} closeHidden=${pick.closeHidden}`);
check('pick flow: the wear button invites the first wear', /wear/i.test(pick.wearLabel), pick.wearLabel);
// a tile tap previews without any confirm strip; the wear applies
await page.evaluate(() => {
  const tile = document.querySelector('#wardrobe-lineup .starter-tile[data-starter="dee"]');
  tile?.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await page.waitForTimeout(400);
const confirmHidden = await page.evaluate(() => document.getElementById('wardrobe-confirm')?.hidden === true);
check('pick flow: previewing never shows the wipe-confirm strip', confirmHidden);
await page.evaluate(() => (window.__game).wardrobe.close());

// ---- 3. THE ROOMS' PALETTE --------------------------------------------------
const palette = await page.evaluate(() => {
  // the handle ids ride '-INT' / '-ROOM'; the groups are INT_<room stem>.
  // One wrinkle: the record handle is RECORD-INT, its group is INT_RECORDS.
  const GROUP = { 'RECORD-INT': 'INT_RECORDS' };
  const room = (id) => window.__game.world.scene.getObjectByName(GROUP[id] ?? `INT_${id.split('-')[0]}`);
  const strip = (id) => !!room(id)?.children.some((o) => o.name.endsWith('_LightStrip'));
  const bands = (id) => {
    let n = 0;
    room(id)?.traverse((o) => { if (/_(band|trim)$/.test(o.name)) n++; });
    return n;
  };
  const floorColor = (name) => {
    const f = window.__game.world.scene.getObjectByName(name);
    const mat = f?.material;
    return mat?.color ? '#' + mat.color.getHexString() : null;
  };
  return {
    strips: {
      'LAUNDRY-INT': strip('LAUNDRY-INT'), 'BARBER-INT': strip('BARBER-INT'),
      'PIZZA-INT': strip('PIZZA-INT'), 'BAKERY-INT': strip('BAKERY-INT'),
      'RECORD-INT': strip('RECORD-INT'), 'HALL-INT': strip('HALL-INT'),
      'DINER-INT': strip('DINER-INT'), 'CECIL-ROOM': strip('CECIL-ROOM'),
    },
    bandCounts: {
      'LAUNDRY-INT': bands('LAUNDRY-INT'), 'BARBER-INT': bands('BARBER-INT'),
      'PIZZA-INT': bands('PIZZA-INT'), 'BAKERY-INT': bands('BAKERY-INT'),
      'RECORD-INT': bands('RECORD-INT'), 'HALL-INT': bands('HALL-INT'),
      'DINER-INT': bands('DINER-INT'), 'CECIL-ROOM': bands('CECIL-ROOM'),
    },
    floors: {
      BODEGA: floorColor('Bodega_Floor'), LAUNDRY: floorColor('LaundryRoom_Floor'),
      BARBER: floorColor('Barber_Floor'), PIZZA: floorColor('Pizza_Floor'),
      BAKERY: floorColor('Bakery_Floor'), RECORDS: floorColor('Records_Floor'),
      HALL: floorColor('Hall_Floor'), DINER: floorColor('Diner_Floor'),
      CECIL: floorColor('Cecil_Floor'),
    },
  };
});
check('palette: all eight rooms wear their light strip',
  Object.values(palette.strips).every(Boolean), JSON.stringify(palette.strips));
check('palette: every room wears wainscot bands + trim (≥6 pieces)',
  Object.values(palette.bandCounts).every((n) => n >= 6), JSON.stringify(palette.bandCounts));
const floorValues = Object.values(palette.floors);
check('palette: nine rooms, distinct floor colors',
  floorValues.every(Boolean) && new Set(floorValues).size === floorValues.length,
  JSON.stringify(palette.floors));

// ---- 4. THE DELI READ -------------------------------------------------------
const deli = await page.evaluate(() => {
  const byName = (n) => !!window.__game.world.scene.getObjectByName(n);
  let productRows = 0;
  window.__game.world.scene.traverse((o) => { if (o.name === 'Bodega_ProductRow') productRows++; });
  return {
    menu: byName('Bodega_Menu'),
    productRows,
    bags: byName('Bodega_ChipBags'),
    mat: byName('Bodega_DoorMat'),
  };
});
check('deli: the menu board hangs over the counter', deli.menu);
check('deli: product rows color the back wall (≥3 merged draws)', deli.productRows >= 3, `rows=${deli.productRows}`);
check('deli: chip bags hang by the produce', deli.bags);
check('deli: the welcome mat meets the door', deli.mat);

// ---- 5. EVIDENCE SHOTS ------------------------------------------------------
const shots = [
  ['polish2-bodega.png', [-16.2, 2.6, 12.0], [-19.6, 1.2, 13.6], [-17.6, 0.1, 11.6]],
  ['polish2-cecil.png', [15.2, 9.9, -9.2], [11.6, 8.5, -13.2], [13.0, 8.45, -11.6]],
  ['polish2-laundry.png', [0.6, 2.4, 18.2], -7.5, [-7.5, 1.0, 11.5], [-3.0, 0.1, 14.0]],
];
// (shots are best-effort evidence; the assertions above are the contract)
for (const [out, cam, look, pl] of [[
  'polish2-bodega.png', [-16.2, 2.6, 12.0], [-19.6, 1.2, 13.6], [-17.6, 0.1, 11.6],
], [
  'polish2-cecil.png', [15.2, 9.9, -9.2], [11.6, 8.5, -13.2], [13.0, 8.45, -11.6],
], [
  'polish2-laundry.png', [0.6, 2.4, 18.2], [-7.5, 1.0, 11.5], [-3.0, 0.1, 14.0],
], [
  'polish2-barber.png', [34.4, 2.4, 5.8], [37.2, 1.0, 12.8], [36.6, 0.1, 8.0],
]]) {
  await page.evaluate(({ cam, look, pl }) => {
    const g = window.__game;
    if (!window.__camPatched) { g.cam.update = () => {}; g.cam.snapBehind = () => {}; window.__camPatched = true; }
    const p = g.player.capsule; p.x = pl[0]; p.z = pl[2]; p.y = pl[1];
    const c = g.cam.camera; c.position.set(cam[0], cam[1], cam[2]); c.lookAt(look[0], look[1], look[2]);
  }, { cam, look, pl });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, out) });
  console.log('shot', out);
}

console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
check('console clean', errors.length === 0);
console.log(fails === 0 ? 'POLISH PASS PROBE: OK' : `POLISH PASS PROBE: ${fails} FAILURES`);
await browser.close(); server.close();
process.exit(fails === 0 ? 0 : 1);
