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
// houses 18 + Marlow walk-ups 36 = 104 windows, one sill + one lintel each
check('sills: 104 stone sills on the proud-window rows', n('VQ_Sill') === 104, `${n('VQ_Sill')}`);
check('lintels: 104 stone lintels', n('VQ_Lintel') === 104, `${n('VQ_Lintel')}`);

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
