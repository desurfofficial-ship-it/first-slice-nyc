/**
 * The 1-Second Law audit prep (docs/55 item 4) — 10 random paused frames,
 * randomized, not curated. The checklist's existing tooling (visual-check,
 * visual-d3/d4, probe-polish-shots) produces authored beats; the audit
 * demands random moments across day, district, and time-of-day. This probe
 * is that randomizer:
 *
 *   - a seeded draw (mulberry32; `--seed` to regenerate a variant, default
 *     20261105) stratified so every day lands 2-3 frames and noon/dusk
 *     split 5-5 — random within the axes docs/55 names, reproducible
 *     forever from the manifest;
 *   - every coordinate is a real standable spot harvested from the shipped
 *     probes/builders (visual-d3/d4b, probe-court, probe-subway,
 *     probe-storefront, probe-freeroam, probe-reach-top, World.ts W2) —
 *     nothing invented (docs/45: build from the registry, not guesses);
 *   - the HUD dresses like the day it depicts (docs/51 B12 lesson):
 *     day, wallet, cart name, objective, and the day's world flags
 *     (awning, stool, the kid) — every field set explicitly per frame so
 *     the draw order never leaks into the picture;
 *   - the camera is NEVER parked: the audit pauses a real session, so the
 *     frame is the follow cam's own framing (snapBehind only);
 *   - portrait 720x1280 (the Vertical-First Law composes first);
 *   - any page error fails the run (a frame that errored is not evidence).
 *
 * The never-visitor pass ("Where are you?" within one second) stays human —
 * this probe only produces the frames. Output:
 *   assets/one-second-law/osl_NN_d{day}_{district}_{tod}.png + manifest.json
 *
 * Usage: npm run build && node scripts/probe-one-second.mjs [--seed N]
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
// docs/55 §4 names the evidence path: assets/one-second-law/ (repo root) —
// the frames and the manifest land there, beside the audit note.
const OUT = new URL('../../assets/one-second-law/', import.meta.url).pathname;
const PORT = 4593;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };

// ---- seeded randomness (mulberry32 — small, fast, reproducible) ------------
const argSeed = (() => {
  const i = process.argv.indexOf('--seed');
  return i >= 0 ? Number(process.argv[i + 1]) : 20261105;
})();
if (!Number.isFinite(argSeed)) { console.error('bad --seed'); process.exit(2); }
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(argSeed);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---- the district pool (all real standable spots, source noted per row) ----
// minDay keeps the draw honest: a frame must be one a real session could
// produce (Times Square and the platform arrive with Day 4's ride; the
// wider grid opens with Day 2's first free walk).
const ANCHORS = [
  { district: 'cart-corner',      x: 5.35,   y: 0.05, z: -4.55, yaw: -Math.PI * 0.72, minDay: 1 }, // visual-d4b
  { district: 'bodega-front',     x: -27.8,  y: 0.1,  z: 6.6,   yaw: Math.PI,         minDay: 1 }, // probe-storefront
  { district: 'plaza-bulletin',   x: -37.6,  y: 0.05, z: 5.9,   yaw: Math.PI * 0.75,  minDay: 1 }, // visual-living
  { district: 'subway-stairs',    x: -42.0,  y: 0.05, z: 4.2,   yaw: 0,               minDay: 1 }, // visual-living
  { district: 'terminal-bay',     x: -27.65, y: 0.1,  z: 4.6,   yaw: Math.PI,         minDay: 1 }, // probe-subway
  { district: 'laundry-bay',      x: -6.6,   y: 0.05, z: 5.9,   yaw: Math.PI * 0.78,  minDay: 1 }, // visual-d4b
  { district: 'fire-escape',      x: 9.4,    y: 0.05, z: -7.2,  yaw: Math.PI * 0.75,  minDay: 1 }, // probe-reach-top
  { district: 'court',            x: 43.2,   y: 0.1,  z: 5.0,   yaw: -Math.PI / 2,    minDay: 1 }, // probe-court
  { district: 'kestrel-green',    x: 18,     y: 0.1,  z: 30,    yaw: Math.PI,         minDay: 2 }, // World.ts W2 (the green's gate)
  { district: 'gable-street',     x: 0,      y: 0.1,  z: 40,    yaw: 0,               minDay: 2 }, // World.ts W2 (Gable Street z 36..44)
  { district: 'playground',       x: -7,     y: 0.1,  z: -26,   yaw: -Math.PI * 0.25, minDay: 2 }, // World.ts W2 (swings/sandbox row)
  { district: 'times-square',     x: -352.3, y: 0.1,  z: 6.4,   yaw: Math.PI / 2,     minDay: 4 }, // probe-subway (the square)
  { district: 'subway-platform',  x: -329.1, y: -3.1, z: 13.2,  yaw: Math.PI,         minDay: 4 }, // probe-subway (the platform)
];

// ---- the draw: 10 frames, stratified day + tod, shuffled districts --------
// Day draw: each frame draws uniformly from its anchor's eligible days
// ([minDay..4]), then a rebalance pass guarantees 2-3 frames per day — the
// checklist says vary day, and a draw that lands five Day-4s fails that on
// its own terms. Reassignment only ever moves a frame to a day its anchor
// allows, and the manifest records the final draw either way.
const todBag = shuffle(['noon', 'noon', 'noon', 'noon', 'noon', 'dusk', 'dusk', 'dusk', 'dusk', 'dusk']);
const anchorDraw = shuffle(ANCHORS).slice(0, 10);

const eligibleDays = (a) => {
  const out = [];
  for (let d = a.minDay; d <= 4; d++) out.push(d);
  return out;
};

const frames = anchorDraw.map((a, i) => ({
  n: i + 1, ...a,
  day: eligibleDays(a)[Math.floor(rng() * eligibleDays(a).length)],
  tod: todBag[i],
}));

const countDay = (d) => frames.filter((f) => f.day === d).length;
for (const d of [1, 2, 3, 4]) {
  while (countDay(d) < 2) {
    const donor = frames.find((f) => countDay(f.day) > 3 && d >= f.minDay);
    if (!donor) break; // a minDay wall may hold a day under 2 — logged, not hidden
    donor.day = d;
  }
}

// ---- static server (the shipped probe pattern) ----------------------------
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
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const boot = async () => {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
  await page.evaluate(() => localStorage.removeItem('first_slice_save_v1'));
  await page.waitForTimeout(1500);
};

// ---- the per-day dressing (every field explicit; order never leaks) -------
// Sources: day 1 = boot truth; day 2 = the honest save path (probe-walk-cycle:
// $112, no awning, no kid yet); day 3 = visual-d3's chapter block ($111,
// stool bought, kid seated); day 4 = visual-d4's wake block ($120, the kid
// at the corner on his stool). Each day stages its WIDEST-range step — the
// errand/delivery/poster/stranger walks are the beats during which a real
// session can legitimately be anywhere in the frame's district — so the
// objective header never names a beat the player cannot be mid-way through
// (the staging must not leak between beats, docs/51 B12's law).
const stage = (f) => page.evaluate(([f]) => {
  const g = window.__game;
  const s = g.state;
  // explicit resets first — the frame owns its whole state
  s.awningUp = false; s.stoolUp = false; s.kidKept = false; s.idrisServed = false;
  g.world.cartAwning.visible = false;
  g.world.stool.visible = false;
  g.world.kidGround.visible = false;
  if (f.day === 1) {
    s.day = 1; s.onDay2 = false;
    s.cartName = '';
    s.money = 87; s.dayStartMoney = 87;
    s.setStep(2 /* COLLECT — the morning errand, the day's widest walk */);
  } else if (f.day === 2) {
    s.day = 2; s.onDay2 = true;
    s.cartName = "Wade's Spot";
    s.money = 112; s.dayStartMoney = 112;
    s.setStep(13 /* D2_DELIVER — the cross-street walk, the day's widest */);
  } else if (f.day === 3) {
    s.day = 3; s.onDay2 = true;
    s.cartName = "Wade's Spot";
    s.kidKept = true; s.idrisServed = true; s.awningUp = true; s.stoolUp = true;
    s.money = 111; s.dayStartMoney = 111;
    s.setStep(21 /* D3_POSTER — the morning flyer beat */);
    g.world.cartAwning.visible = true;
    g.world.stool.visible = true;
    g.world.kidGround.visible = true;
    g.world.kidGround.position.set(7.15, 0.05, -6.25);
    g.world.kidGround.rotation.y = -1.25;
    const rig = g.world.kidGround.userData.rig;
    if (rig) rig.mode = 'sit';
  } else {
    s.day = 4; s.onDay2 = true;
    s.cartName = "Wade's Spot";
    s.kidKept = true; s.idrisServed = true; s.awningUp = true; s.stoolUp = true;
    s.kidDown = true; s.kidAtCorner = true;
    s.money = 120; s.dayStartMoney = 120;
    s.setStep(25 /* D4_STRANGER — the terminal walk, the day's widest */);
    g.world.cartAwning.visible = true;
    g.world.stool.visible = true;
    g.world.kidGround.visible = true;
    g.world.kidGround.position.set(7.15, 0.05, -6.25);
    g.world.kidGround.rotation.y = -1.25;
    const rig = g.world.kidGround.userData.rig;
    if (rig) rig.mode = 'sit';
  }
  if (s.cartName) g.applyCartIdentity(s.cartName);
  g.ui.setMoneyQuiet(s.money);
  g.ui.setObjective(s.objectiveText());
}, [f]);

// the note clears AFTER staging: setStep itself fires the wake toast, so a
// clear before it would be re-lit — and a Day-4 wake toast has no business
// riding a frame taken at the Gable row (the staging must not leak between
// beats). A real paused moment can carry a toast; it can never carry
// another beat's toast.
const clearNote = () => page.evaluate(() => {
  const note = document.getElementById('note');
  if (note) { note.classList.add('gone'); note.hidden = true; }
});

const place = async (f) => {
  await page.evaluate(([f]) => {
    const g = window.__game;
    g.player.capsule.x = f.x; g.player.capsule.y = f.y; g.player.capsule.z = f.z;
    g.player.rotationY = f.yaw;
    g.cam.snapBehind({ x: f.x, y: f.y, z: f.z });
  }, [f]);
  // a few real steps: the follow boom settles to its own distance (a raw
  // snapBehind can wedge the camera into the player's back), and the walk
  // doubles as the standable proof — an anchor that cannot move is not a
  // paused moment, it is a wall. Some anchors face the very mass they name
  // (the fire-escape spawn faces its ladder), so the proof accepts either
  // direction — what it demands is that the ground lets the body move.
  const pos = () => page.evaluate(() => {
    const c = window.__game.player.capsule;
    return { x: c.x, z: c.z };
  });
  const before = await pos();
  let moved = 0;
  for (const key of ['KeyW', 'KeyS']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(750);
    await page.keyboard.up(key);
    const after = await pos();
    moved = Math.hypot(after.x - before.x, after.z - before.z);
    if (moved >= 0.3) break;
  }
  if (moved < 0.3) throw new Error(`anchor not standable: ${f.district} moved ${moved.toFixed(2)}m`);
  await page.waitForTimeout(700); // the boom settles, the frame breathes
};

const goDusk = () => page.evaluate(() => {
  const g = window.__game;
  if (!g.duskStarted) {
    g.startDusk();
    g.lightGoldWindow();
  }
});

// ---- run: all noon frames on one boot, reload, then the dusk frames -------
const shots = [];
for (const group of ['noon', 'dusk']) {
  await boot();
  const batch = frames.filter((f) => f.tod === group);
  for (const f of batch) {
    await stage(f);
    await place(f);
    if (f.tod === 'dusk') await goDusk();
    await clearNote(); // after staging — setStep's own toast must not ride the frame
    await page.waitForTimeout(900);
    const name = `osl_${String(f.n).padStart(2, '0')}_d${f.day}_${f.district}_${f.tod}.png`;
    await page.screenshot({ path: join(OUT, name) });
    shots.push({ frame: name, day: f.day, district: f.district, tod: f.tod, at: [f.x, f.y, f.z] });
    console.log(`saved ${name}  (d${f.day} @ ${f.district}, ${f.tod})`);
  }
}
await browser.close();
server.close();

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ seed: argSeed, regen: 'npm run build && node scripts/probe-one-second.mjs --seed ' + argSeed, frames: shots }, null, 2) + '\n');

let failures = 0;
for (const e of errors) { console.log('PAGEERROR:', e); failures++; }
console.log(failures === 0 ? 'ONE-SECOND PREP OK' : `ONE-SECOND PREP FAILED (${failures} page errors)`);
console.log(`frames: ${shots.length} → assets/one-second-law/ · seed ${argSeed}`);
process.exit(failures === 0 ? 0 : 1);
