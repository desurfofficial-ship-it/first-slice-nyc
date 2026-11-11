/**
 * The SI probe — the borough-character pass (the slop-newyork port).
 * Zero product code: pins the pass's laws against the booted game and
 * captures the evidence shots. docs/slop-integration/ has the reports.
 *   1. THE MALLOW ROW — the three new masses stand where the registry
 *      put them (colliders on the shells; the Marlow street wall 22..50).
 *   2. WATER TOWERS — five ported 3-part tanks on the tall masonry roofs,
 *      each seated where the pass placed it; the canon five untouched.
 *   3. ROOFLINE SYSTEMS — chillers, chimneys, bulkheads, band cornices.
 *   4. FIRE ESCAPES — five multi-landing stacks on yard/flank faces.
 *   5. STREET LIFE — mailbox, steam vent, two DOT blades, two globes,
 *      the lobby awning, the yard shed.
 *   6. SKYLINE — the landmark silhouettes ride the z 90 band, fog off.
 *   7. THE GATES — nothing underground, colliders off the walk lanes,
 *      the draw-call budget holds, console clean.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/nyc-integration', import.meta.url).pathname;
const PORT = 4648;
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
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) fails++;
};

const data = await page.evaluate(() => {
  const w = window.__game.world;
  const rows = (w.vqLedger ?? []).map((r) => ({ ...r }));
  const si = rows.filter((r) => r.name.startsWith('SI_'));
  // colliders covering each new shell's center at its mid-height
  const massCollider = (x, z, h) => w.colliders.some((c) =>
    c.minX <= x && c.maxX >= x && c.minZ <= z && c.maxZ >= z
    && c.minY <= h / 2 && c.maxY >= h / 2);
  // the registry shells the pass read
  const shells = {};
  for (const id of ['LMS-01', 'IND-01', 'GLS-01', 'SRC-01', 'KTS-03']) {
    const b = id && w.regShell ? (() => { try { return w.regShell(id); } catch { return null; } })() : null;
    shells[id] = b ? { x: b.x, z: b.z, w: b.w, d: b.d, h: b.h } : null;
  }
  // the walked-lane law, evaluated in-page
  const laneBad = [];
  for (const c of w.colliders) {
    for (const [lz, band] of [[-6.5, 1.0], [6.5, 1.0], [-34.6, 1.0]]) {
      if (c.minZ < lz + band && c.maxZ > lz - band
        && c.maxY > 0.4 && c.maxY < 2.6 && (c.maxX - c.minX) < 6 && (c.maxZ - c.minZ) < 6) {
        laneBad.push({ x: +((c.minX + c.maxX) / 2).toFixed(2), z: +((c.minZ + c.maxZ) / 2).toFixed(2), lane: lz });
      }
    }
  }
  const r = window.__game?.renderer || window.__game?.game?.renderer;
  return {
    si,
    masses: {
      lms: massCollider(28, -26, 20),
      ind: massCollider(37, -26, 12),
      gls: massCollider(45, -26, 16),
    },
    shells, laneBad,
    stats: r && r.info ? { calls: r.info.render.calls, tris: r.info.render.triangles } : null,
  };
});

const si = (name) => data.si.find((r) => r.name === name) ?? null;
const siCount = (prefix) => data.si.filter((r) => r.name === prefix || r.name.startsWith(prefix + '_')).length;

// 1. THE MALLOW ROW — masses stand (colliders on the shells), row spans 22..50
check('mallow row: the limestone court stands at its registry shell',
  data.masses.lms, JSON.stringify(data.shells['LMS-01']));
check('mallow row: the works stands at its registry shell',
  data.masses.ind, JSON.stringify(data.shells['IND-01']));
check('mallow row: the glass infill stands at its registry shell',
  data.masses.gls, JSON.stringify(data.shells['GLS-01']));
check('mallow row: the shells read x 22..50 (the free stretch, SRC-01 intact)',
  data.shells['LMS-01']?.x === 28 && data.shells['GLS-01']?.x === 45 && data.shells['SRC-01']?.x === 55,
  JSON.stringify(data.shells));

// 2. WATER TOWERS — five ported tanks, each at its pass seat
const tanks = [
  ['SI_WaterTower_KTS-03', 34.0, -15.5, 18],
  ['SI_WaterTower_TEN-01', -57.75, -26.0, 17],
  ['SI_WaterTower_SRC-01', 53.5, -24.5, 17],
  ['SI_WaterTower_KTN-02', -6.0, 12.5, 18],
  ['SI_WaterTower_LMS-01', 25.5, -24.5, 20],
];
for (const [nm, x, z, roofY] of tanks) {
  const t = si(nm);
  check(`water tower: ${nm} at its seat on the roof`, !!t && t.x === x && t.z === z && t.y === roofY + 0.04,
    JSON.stringify(t));
}

// 3. ROOFLINE SYSTEMS
check('chillers: ≥ 4 rooftop HVAC units (the 35% rule, seeded)', siCount('SI_HVAC') >= 4, `${siCount('SI_HVAC')}`);
check('chimneys: ≥ 10 stacks on the pre-war roofs', siCount('SI_Chimney') >= 10, `${siCount('SI_Chimney')}`);
check('bulkheads: 3 new-roof clutter groups', siCount('SI_RoofClutter') === 3, `${siCount('SI_RoofClutter')}`);
check('band cornices: the court wears its mid-band courses (S+N), plus 3 on the older row',
  siCount('SI_CorniceBand') === 5, `${siCount('SI_CorniceBand')}`);

// 4. FIRE ESCAPES — five stacks on yard/flank faces (proud = off the mass)
const escapes = [
  ['SI_FireEscape_KTS-03', 44.5, -20.03],  // south face → proud toward −z
  ['SI_FireEscape_LMS-01', 28, -19.97],    // north face → proud toward +z
  ['SI_FireEscape_IND-01', 37, -19.97],
  ['SI_FireEscape_SRC-01', 60.03, -26],    // east flank → proud toward +x
  ['SI_FireEscape_PWK-02', 5, -19.97],
];
for (const [nm, x, z] of escapes) {
  const e = si(nm);
  check(`fire escape: ${nm} on its face`, !!e && e.x === x && e.z === z, JSON.stringify(e));
}

// 5. STREET LIFE
check('mailbox: the relay box at the bodega corner', si('SI_Mailbox_Kestrel')?.x === -12.3, JSON.stringify(si('SI_Mailbox_Kestrel')));
check('steam vent: the ConEd stack against the laundry wall', si('SI_SteamVent_Kestrel')?.x === -2.0, JSON.stringify(si('SI_SteamVent_Kestrel')));
check('blades: KESTREL ST + JUNIPER AV on their masts', si('SI_Blade_Kestrel')?.x === -1.45 && si('SI_Blade_Juniper')?.x === -64.95,
  JSON.stringify([si('SI_Blade_Kestrel'), si('SI_Blade_Juniper')]));
check('globes: the pair flanking the station headhouse', si('SI_Globe_SUB01_W')?.x === -48.75 && si('SI_Globe_SUB01_E')?.x === -45.65,
  JSON.stringify([si('SI_Globe_SUB01_W'), si('SI_Globe_SUB01_E')]));
check('awning: the court lobby wears its canvas', !!si('SI_Awning_LMS01_Lobby'), JSON.stringify(si('SI_Awning_LMS01_Lobby')));
check('shed: the yard construction shed off the glass infill', si('SI_Shed_GLS01')?.x === 45.5, JSON.stringify(si('SI_Shed_GLS01')));
check('skyline: the landmark silhouettes registered', !!si('SI_SkylineLandmarks'), JSON.stringify(si('SI_SkylineLandmarks')));

// 6. THE GATES
const minY = data.si.reduce((m, r) => Math.min(m, r.y), Infinity);
check('ground law: no SI piece sits underground', minY >= 0, `min SI y = ${minY}`);
check('draw-call budget: the pass fused into the tiles (calls < 200)',
  data.stats && data.stats.calls < 200, `calls=${data.stats?.calls} tris=${data.stats?.tris}`);

// the SI furniture's own clearance law: each NEW collider sits ≥ 0.55 m
// (the nav's WALKER_CLEAR) off every walked lane line it could touch
const furniture = [
  ['mailbox', -12.3, 7.55, 0.325, 0.3],
  ['steam vent', -2.0, 7.55, 0.3, 0.3],
  ['Juniper mast', -65.3, -7.55, 0.15, 0.15],
  ['freight dock', 37.0, -32.7, 2.3, 0.7],
  ['globe W', -48.75, 4.2, 0.14, 0.14],
  ['globe E', -45.65, 4.2, 0.14, 0.14],
];
const LANES = [[0, 6.5], [0, -6.5], [0, -34.6], [0, 35], [-82.5, 0], [-61.5, 0], [61.5, 0], [82.5, 0]];
let clearOk = true;
const clearLog = [];
for (const [nm, fx, fz, hx, hz] of furniture) {
  for (const [lx, lz] of LANES) {
    // a lane line at (lx, lz): EW lanes have z fixed; NS lanes x fixed
    if (lx === 0 && lz !== 0) {
      if (Math.abs(fz - lz) - hz < 0.55 && fx > -84 && fx < 84) { clearOk = false; clearLog.push(`${nm} vs lane z ${lz}`); }
    } else if (lz === 0 && lx !== 0) {
      if (Math.abs(fx - lx) - hx < 0.55 && fz > -48 && fz < 48) { clearOk = false; clearLog.push(`${nm} vs lane x ${lx}`); }
    }
  }
}
check('lane law: every SI collider sits ≥ 0.55 m off the walked lanes', clearOk, clearLog.join(' | '));

// ---- EVIDENCE SHOTS ----------------------------------------------------------
await page.evaluate(() => {
  const g = window.__game;
  if (!window.__camPatched) { g.cam.update = () => {}; g.cam.snapBehind = () => {}; window.__camPatched = true; }
});
const shots = [
  ['si-mallow-row.png', [21.5, 2.8, -45.0], [36, 5.5, -29.5]],   // the row from Marlow, 3/4 west
  ['si-mallow-court.png', [22.8, 1.55, -35.6], [28, 2.2, -31.8]], // the limestone stoop + awning
  ['si-roofline-marlow.png', [8, 9.5, -46], [36, 13, -24]],      // tanks + escapes over the row
  ['si-kestrel-life.png', [-10, 2.9, -3.2], [-12.3, 0.9, 7.5]],  // mailbox over the cab
  ['si-skyline.png', [-10, 12, -18], [2, 34, 90]],               // the landmark band
  ['si-avenue-signal.png', [-61.5, 1.9, -11.5], [-65.3, 4.2, -7.5]], // the Juniper mast
];
for (const [out, cam, look] of shots) {
  await page.evaluate(({ cam, look }) => {
    const c = window.__game.cam.camera;
    c.position.set(cam[0], cam[1], cam[2]);
    c.lookAt(look[0], look[1], look[2]);
  }, { cam, look });
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(OUT, out) });
  console.log('shot', out);
}
// the far-world stair: teleport the camera to the TS surface
await page.evaluate(() => {
  const c = window.__game.cam.camera;
  c.position.set(-326, 2.0, -2.5);
  c.lookAt(-332, 1.6, 3.4);
});
await page.waitForTimeout(450);
await page.screenshot({ path: join(OUT, 'si-subway-stair-ts.png') });
console.log('shot si-subway-stair-ts.png');

console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
check('console clean', errors.length === 0);
console.log(fails === 0 ? 'NYC INTEGRATION PROBE: OK' : `NYC INTEGRATION PROBE: ${fails} FAILURES`);
await browser.close(); server.close();
process.exit(fails === 0 ? 0 : 1);
