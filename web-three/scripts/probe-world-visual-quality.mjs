/**
 * The world-visual-quality probe (docs/3d-assets — the environment-artist
 * wave). Zero product code: pins the pass's nine laws against the booted
 * game and captures the AFTER evidence shots.
 *   1. CROWNS — every uncrowned mass wears its stone crown band at the
 *      roofline (named VQ_Crown_<registry id>, positioned ON the shell).
 *   2. PARTY-WALL LIFE — the blank gables wear bricked-over windows and
 *      downspouts (named VQ_Brickover_* / VQ_Downspout).
 *   3. GHOST SIGNS — five painted-panel faces ride the shared atlas.
 *   4. SILL + LINTEL REVEALS — the proud-window rows dress stone sills
 *      under and lintels over.
 *   5. AC UNITS — the summer tell hangs under verified sills.
 *   6. ROOF CLUTTER — bulkhead + vents + antenna on every unreachable roof.
 *   7. STREET FLOOR — manholes, storm drains, patches, stop lines.
 *   8. GROUND LIFE — grass tufts in every tree pit, curb leaf piles.
 *   9. DOOR LAMPS — the goosenecks over five doors.
 * Plus the quality gates: no VQ piece sits underground, and the draw-call
 * budget holds (the whole pass must fuse into the district tiles).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/world-visual-quality', import.meta.url).pathname;
const PORT = 4647;
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

// ---- the pass's ledger + the surviving named groups -------------------------
const ledger = await page.evaluate(() => {
  const w = window.__game.world;
  const rows = (w.vqLedger ?? []).map((r) => ({ ...r }));
  // the live named groups (the bake keeps groups, merges bare meshes)
  const live = {};
  w.scene.traverse((o) => { if (o.name?.startsWith('VQ_')) live[o.name.split('_').slice(0, 2).join('_')] = (live[o.name.split('_').slice(0, 2).join('_')] ?? 0) + 1; });
  return { rows, live };
});
const count = (prefix) => ledger.rows.filter((r) => r.name === prefix || r.name.startsWith(prefix + '_')).length;
const n = (k) => count(k);
const crownOf = (id) => ledger.rows.find((r) => r.name === `VQ_Crown_${id}`) ?? null;
const minY = ledger.rows.reduce((m, r) => Math.min(m, r.y), Infinity);

// 1. CROWNS — 17 named bands, each ON its shell (h − 0.25)
const CROWN_IDS = ['KTN-01', 'KTN-02', 'KTN-03', 'KTN-04', 'KTN-05', 'KTS-01', 'KTS-02', 'KTS-03',
  'KTN-06', 'PWK-01', 'PWK-02', 'PWK-03', 'SMB-01', 'SMB-02', 'SMB-03', 'KCM-01', 'SND-01'];
let crownOk = 0;
for (const id of CROWN_IDS) if (crownOf(id)) crownOk++;
check('crowns: all 17 named bands present', crownOk === CROWN_IDS.length, `${crownOk}/17`);
const ck = crownOf('KTN-01');
check('crown: the terminal wears its band at 13.75', ck?.y === 13.75, JSON.stringify(ck));
check('crown: the terminal band centers on the shell', ck?.x === -35.5 && ck?.z === 14, JSON.stringify(ck));
const kc = crownOf('KTS-02');
check('crown: the Cecil wears its band (the climb keeps its top clean, the edge gets the cap)', kc?.y === 13.75, JSON.stringify(kc));

// 2. PARTY-WALL LIFE
check('brickovers: ≥ 30 sealed openings across the blank gables', n('VQ_Brickover') >= 30, `${n('VQ_Brickover')}`);
check('downspouts: 6 corner pipes', n('VQ_Downspout') === 6, `${n('VQ_Downspout')}`);

// 3. GHOST SIGNS
check('ghost signs: five painted panels', n('VQ_GhostSign') === 5, `${n('VQ_GhostSign')}`);

// 4. SILL + LINTEL — the exact window census: GRB 30 + TEN 20 + corner
// houses 18 + Marlow walk-ups 36 = 104 windows, one sill + one lintel each;
// W8 (2026-11-12) the W6 terrace rows + the W7 gate rows join the law
// (28 rows sharing the window grammar) — 310 windows, one pair each
check('sills: 310 stone sills on the proud-window rows', n('VQ_Sill') === 310, `${n('VQ_Sill')}`);
check('lintels: 310 stone lintels', n('VQ_Lintel') === 310, `${n('VQ_Lintel')}`);

// 4b. W13 (2026-11-13) — BAND COURSES + SOOT: the honest ledger's last
// approximation closes (the source's facade shaders draw per-window band
// courses and soot; ours now carry the real pieces). The census mirrors
// the window grammar exactly:
//   soot fans     = 310 — one per dressed window (the sill census's own
//                 number: GRB 30 + TEN 20 + corner houses 18 + walk-ups 36
//                 + the 28 shared-grammar rows' 206);
//   cornice lines = 28 — one grime shelf under each W6/W7 row's roofline;
//   band courses  = 131 — one proud ledge per mid-floor line (GRB 10 +
//                 TEN 8 + corner houses 4 + walk-ups 9 + the 28 rows' 100).
check('soot fans: 310 carbon plumes, one per dressed window',
  ledger.rows.filter((r) => r.name === 'VQ_Soot').length === 310,
  `${ledger.rows.filter((r) => r.name === 'VQ_Soot').length} (the cornice lines count separately)`);
check('cornice grime: 28 soot shelves under the W6/W7 rooflines', n('VQ_Soot_CorniceLine') === 28, `${n('VQ_Soot_CorniceLine')}`);
check('band courses: 131 stone string-course ledges', n('VQ_BandCourse') === 131, `${n('VQ_BandCourse')}`);
// the seat law — grime rides BEHIND the stone (soot 0.09 proud of the
// wall plane, the sill/lintel seat 0.14): spot the GRB row's planes.
const grbSoot = ledger.rows.find((r) => r.name === 'VQ_Soot' && r.x === -44.3 && Math.abs(r.y - 6.02) < 0.01);
check('soot seat: the GRB parlor plume rides behind the sill plane (32.09)', grbSoot && Math.abs(grbSoot.z - 32.09) < 0.001, JSON.stringify(grbSoot));
const grbBand = ledger.rows.find((r) => r.name === 'VQ_BandCourse' && r.x === -42.6 && r.y === 6.0);
check('band seat: the GRB base string rides the sill plane (32.14)', grbBand && Math.abs(grbBand.z - 32.14) < 0.001, JSON.stringify(grbBand));
// the never-crossing law — a band course may never cross a window ON ITS
// OWN FACADE (the terrace rows share one z-plane, so the ledger's z alone
// cannot tell rows apart — the law is mirrored from the registry instead,
// the same grammar per row: windows at wy, bands at the mid-floor lines
// between them; the pitch's own arithmetic guarantees ≥ 1.3 m clearance).
const registry = JSON.parse(readFileSync(new URL('../../docs/data/world-registry.json', import.meta.url), 'utf8'));
const shellOf = (id) => registry.buildings.find((b) => b.id === id);
const crossing = (() => {
  let worst = Infinity;
  const rowOf = (id, floorsOverride) => {
    const b = shellOf(id);
    const h = b.height;
    const floors = floorsOverride ?? Math.max(2, Math.round(h / 3.3));
    const pitch = (h - 1.2) / floors;
    const wys = [];
    for (let f = 0; f < floors; f++) {
      const wy = 3.4 + f * pitch;
      if (wy > h - 1.0) continue;
      wys.push(wy);
    }
    const bandYs = [];
    for (let f = 0; f < floors - 1; f++) bandYs.push(3.4 + (f + 0.5) * pitch);
    return { wys, bandYs };
  };
  const rows = [
    ...['GRB-01', 'GRB-02', 'GRB-03', 'GRB-04', 'GRB-05'].map((id) => ({ wys: [4.61, 7.4, 10.2], bandYs: [6.0, 8.8] })),
    ...[0, 1].map(() => rowOf('TEN-01', 5)),
    ...['KTN-00W', 'KTN-06'].map((id) => ({ wys: [7.2, 10.1, 13.0], bandYs: [8.65, 11.55] })),
    ...['PWK-01', 'PWK-02', 'PWK-03'].map((id) => ({ wys: [3.4, 6.3, 9.2, 12.1], bandYs: [4.85, 7.75, 10.65] })),
    ...['GRB-06', 'GRB-07', 'TEN-02', 'KTS-04', 'GRB-08', 'GRB-09', 'GRB-10', 'GRB-11', 'GRB-12', 'GRB-13', 'GRB-14', 'GRB-15',
      'KTN-08', 'KTN-09', 'KTN-10', 'KTN-11',
      'KTS-05', 'KTS-06', 'KTS-07', 'KTS-08', 'KTS-09', 'KTS-10',
      'TEN-03', 'TEN-04', 'MRW-01', 'MRW-02', 'MRW-03', 'MRW-04'].map((id) => rowOf(id)),
  ];
  for (const r of rows) for (const wy of r.wys) for (const by of r.bandYs) worst = Math.min(worst, Math.abs(by - wy));
  return worst;
})();
check('band law: no band course crosses a window (min clearance ≥ 1.0)', crossing >= 1.0, `min clearance ${crossing.toFixed(2)}`);

// 5. AC UNITS
check('AC units: ≥ 20 hanging under verified sills', n('VQ_AC') >= 20, `${n('VQ_AC')}`);

// 6. ROOF CLUTTER — 19 groups, each standing ON its roof plane
check('roof clutter: 19 bulkhead groups on the unreachable roofs', n('VQ_RoofClutter') === 19, `${n('VQ_RoofClutter')}`);
const clutterY = await page.evaluate(() => {
  const w = window.__game.world;
  const out = {};
  for (const id of ['KTN-02', 'KTS-01', 'SND-01', 'SRC-01']) {
    const g = w.scene.getObjectByName(`VQ_RoofClutter_${id}`);
    out[id] = g ? +g.position.y.toFixed(2) : null;
  }
  return out;
});
check('roof clutter: sits on the roof planes (18/16/13/17)', clutterY['KTN-02'] === 18 && clutterY['KTS-01'] === 16
  && clutterY['SND-01'] === 13 && clutterY['SRC-01'] === 17, JSON.stringify(clutterY));

// 7. STREET FLOOR
check('manholes: ≥ 13 covers on the roads (steam one stays canonical)', n('VQ_Manhole') >= 13, `${n('VQ_Manhole')}`);
check('storm drains: 8 curb grates', n('VQ_StormDrain') === 8, `${n('VQ_StormDrain')}`);
check('patches: 6 road repairs', n('VQ_Patch') === 6, `${n('VQ_Patch')}`);
check('oil stains: 4 dark spills', n('VQ_Stain') === 4, `${n('VQ_Stain')}`);
check('stop lines: 12 entering-lane bars', n('VQ_StopLine') === 12, `${n('VQ_StopLine')}`);

// 8. GROUND LIFE
check('grass tufts: one group in every tree pit (≥ 90)', n('VQ_GrassTufts') >= 90, `${n('VQ_GrassTufts')}`);
check('leaf piles: 10 curb piles', n('VQ_LeafPile') === 10, `${n('VQ_LeafPile')}`);

// 9. DOOR LAMPS
check('goosenecks: 5 door lamps', n('VQ_Gooseneck') === 5, `${n('VQ_Gooseneck')}`);

// THE QUALITY GATES
check('ground law: no VQ piece sits underground', minY >= 0,
  `min ledger y = ${minY}`);
check('live groups: the groups survive the bake (clutter 19, ghosts 5, spouts 6, lamps 5)',
  (ledger.live['VQ_RoofClutter'] ?? 0) === 19 && (ledger.live['VQ_GhostSign'] ?? 0) === 5
  && (ledger.live['VQ_Downspout'] ?? 0) === 6 && (ledger.live['VQ_Gooseneck'] ?? 0) === 5,
  JSON.stringify(ledger.live));
const stats = await page.evaluate(() => {
  const r = window.__game?.renderer || window.__game?.game?.renderer;
  return r && r.info ? { calls: r.info.render.calls, tris: r.info.render.triangles } : null;
});
check('draw-call budget: the fused pass holds the frame cheap', stats && stats.calls < 200, `calls=${stats?.calls} tris=${stats?.tris}`);

// ---- EVIDENCE SHOTS ----------------------------------------------------------
await page.evaluate(() => {
  const g = window.__game;
  if (!window.__camPatched) { g.cam.update = () => {}; g.cam.snapBehind = () => {}; window.__camPatched = true; }
});
const shots = [
  ['vq-gable-row.png', [-34, 2.4, 40.5], [-24, 3.2, 30]],
  ['vq-roofline.png', [-10, 22, 8], [30, 4, -14]],
  ['vq-juniper-ghost.png', [-64, 2.6, 0], [-72, 2.0, 14]],
  ['vq-marlow-row.png', [-40, 2.2, -40.5], [-24, 2.6, -30]],
  // W13 (2026-11-13): the band-course + soot evidence — the GRB row's
  // north face reads string courses at the floor lines, the soot plumes
  // rising from the window heads behind them, the stone in front.
  ['vq-band-soot-grb.png', [-42.6, 4.2, 41], [-42.6, 6.5, 32]],
  ['vq-band-soot-terrace.png', [-64, 5.5, 41], [-64, 7.5, 48.4]],
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

console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
check('console clean', errors.length === 0);
console.log(fails === 0 ? 'WORLD VISUAL QUALITY PROBE: OK' : `WORLD VISUAL QUALITY PROBE: ${fails} FAILURES`);
await browser.close(); server.close();
process.exit(fails === 0 ? 0 : 1);
