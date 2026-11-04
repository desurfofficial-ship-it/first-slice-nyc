/**
 * W5 probe — the interiors batch (docs/45 §1 W5, docs/47 W5).
 *
 * Verifies, in-engine:
 *   1. THE TOGGLE: every interior fit-out hides when the player is far and
 *      shows near the shell (the docs/45 W5 visibility-toggle exit line).
 *   2. THE SWAP: a room's far pane (the shipped lit glass) hides while the
 *      fit-out shows — the camera "sees through the glass".
 *   3. THE DUCK: the tower above a room hides while the player is INSIDE
 *      it (the bodega-roof grammar) and returns when they leave.
 *   4. THE WALK-IN: the capsule enters the laundry through the shipped bay
 *      and stands in the room (the hollow is real, floors read).
 *   5. The census + a portrait shot of the bakery interior (docs/45 §4).
 *   6. THE GLASS-SIDE LAW (docs/51 B13 — interiors' window visibility):
 *      the near band shows the fit-out only through the room's own glass —
 *      the hall's blind east yard stays hidden, the window sides show.
 *
 * Usage: node scripts/probe-w5-interiors.mjs   (exit 1 on any failure)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4617;

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
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } }); // portrait — the docs/45 §4 pass
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

const fails = [];

// ---- 1. the boot state: every room hidden, every far pane visible --------
const boot = await page.evaluate(() => {
  const w = window.__game.world;
  const named = (n) => w.scene.getObjectByName(n);
  const out = {};
  for (const id of ['LAUNDRY', 'BARBER', 'PIZZA', 'BAKERY', 'RECORDS', 'HALL', 'DINER', 'CECIL']) {
    const g = named(`INT_${id}`);
    out[id] = { present: !!g, visible: g ? g.visible : null };
  }
  // the shipped glass faces live at scene root after the W5 extraction
  for (const n of ['Barber_Glass', 'Pizza_Glass', 'Bakery_Glass', 'Records_Glass', 'Laundry_Back']) {
    const o = named(n);
    out[n] = o ? o.visible : 'MISSING';
  }
  out.calls = window.__game.renderer.info.render.calls;
  return out;
});
for (const id of ['LAUNDRY', 'BARBER', 'PIZZA', 'BAKERY', 'RECORDS', 'HALL', 'DINER', 'CECIL']) {
  if (!boot[id].present) fails.push(`${id}: fit-out group missing`);
  else if (boot[id].visible) fails.push(`${id}: fit-out visible at boot (far state broken)`);
}
for (const n of ['Barber_Glass', 'Pizza_Glass', 'Bakery_Glass', 'Records_Glass', 'Laundry_Back']) {
  if (boot[n] !== true) fails.push(`${n}: far pane state ${boot[n]} (want visible)`);
}
console.log('BOOT rooms hidden, far panes visible —', boot.calls, 'draw calls (portrait)');

// ---- 2+3. near the laundry: the room shows, the bay curtain hides; ------
//          inside it, the tower ducks. Then out, and everything returns.
const laundry = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  const named = (n) => g.world.scene.getObjectByName(n);
  const room = () => named('INT_LAUNDRY').visible;
  const curtain = () => named('Laundry_Back').visible;
  const upper = () => named('KTN02_Upper_W').visible;
  const out = { steps: 0 };
  // stand in the bay mouth (the shipped alcove) — the room must be on and
  // the bay curtain OFF (near state: the fit-out replaces the far look)
  p.x = -5; p.z = 7.3; p.y = 0.05;
  g.world.update(1 / 60, p);
  out.nearRoom = room();
  out.nearCurtain = !curtain(); // hidden while near — the far look stepped aside
  // walk in: through the bay opening into the room's middle (clear of the
  // folding tables at z 12.1+)
  const legs = [[-5, 8.6], [-5, 10.0]];
  for (const [tx, tz] of legs) {
    for (let i = 0; i < 240; i++) {
      const dx = tx - p.x, dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) break;
      const fx = dx / d, fz = dz / d;
      g.player.update(1 / 60, { x: -fx * 3.2, y: fz * 3.2 });
      g.world.update(1 / 60, p);
      out.steps++;
    }
  }
  out.px = p.x; out.pz = p.z; out.py = p.y;
  out.inRoom = room();
  out.inCurtain = curtain();
  out.upperDucked = !upper(); // inside → the tower hides
  out.groundY = p.y;
  out.insideRect = inRectShell();
  function inRectShell() {
    return p.x >= -11 && p.x <= 1 && p.z >= 8.2 && p.z <= 19;
  }
  // walk back out: straight south through the doorway onto the walk, then
  // west along it (no diagonals — the bay piers sit at z 7.4..8)
  for (const [tx, tz, budget] of [[-5, 6.8, 400], [-16, 6.2, 600]]) {
    for (let i = 0; i < budget; i++) {
      const dx = tx - p.x, dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) break;
      const fx = dx / d, fz = dz / d;
      g.player.update(1 / 60, { x: -fx * 3.2, y: fz * 3.2 });
      g.world.update(1 / 60, p);
      out.steps++;
    }
  }
  out.farAgain = !room();
  out.curtainBack = curtain();
  out.upperBack = upper();
  out.exitX = p.x; out.exitZ = p.z;
  return out;
});
if (!laundry.nearRoom) fails.push('laundry: room not visible at the bay mouth');
if (!laundry.nearCurtain) fails.push('laundry: bay curtain still showing while near (far state stuck)');
if (laundry.groundY < 0.0 || laundry.groundY > 0.4) fails.push(`laundry: walked in but ground y ${laundry.groundY.toFixed(2)} reads wrong`);
if (!laundry.inRoom) fails.push('laundry: room hidden INSIDE the room');
if (!laundry.upperDucked) fails.push('laundry: tower did not duck while inside');
if (!laundry.farAgain) fails.push('laundry: room did not hide after leaving');
if (!laundry.curtainBack) fails.push('laundry: bay curtain did not return');
if (!laundry.upperBack) fails.push('laundry: tower did not return after leaving');
console.log(`LAUNDRY walk-in: px=${laundry.px.toFixed(1)} pz=${laundry.pz.toFixed(1)} y=${laundry.groundY.toFixed(2)} steps=${laundry.steps} near=${laundry.nearRoom} duck=${laundry.upperDucked} restore=${laundry.farAgain}/${laundry.curtainBack}/${laundry.upperBack} exit=(${laundry.exitX.toFixed(1)},${laundry.exitZ.toFixed(1)})`);

// ---- 4. the second floor: the Cecil room at the landing ------------------
const cecil = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  const named = (n) => g.world.scene.getObjectByName(n);
  // stand on the top landing (the shipped trigger volumes' level) — the
  // room shows from the rail (the handle's padZ1 covers the landing)
  p.x = 12.9; p.z = -7.3; p.y = 8.2;
  g.world.update(1 / 60, p);
  const roomOn = named('INT_CECIL').visible;
  // step through the door onto the room floor, THEN the tower ducks
  for (let i = 0; i < 240; i++) {
    const dx = 12.9 - p.x, dz = -10.8 - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) break;
    const fx = dx / d, fz = dz / d;
    g.player.update(1 / 60, { x: -fx * 3.2, y: fz * 3.2 });
    g.world.update(1 / 60, p);
  }
  return { roomOn, towerDucked: !named('KTS02_Above_Room').visible, y: p.y, x: p.x, z: p.z };
});
if (!cecil.roomOn) fails.push('cecil: room not visible from the top landing');
if (!cecil.towerDucked) fails.push('cecil: the tower piece did not duck inside the room');
if (cecil.y < 8.0 || cecil.y > 9.2) fails.push(`cecil: floor y ${cecil.y.toFixed(2)} (want ~8.4) — the room floor does not read`);
console.log(`CECIL: landing-visible=${cecil.roomOn} duck=${cecil.towerDucked} floor y=${cecil.y.toFixed(2)} at (${cecil.x.toFixed(1)},${cecil.z.toFixed(1)})`);

// ---- 5. the portrait evidence: the bakery fit-out from inside ------------
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -34; p.z = -28.2; p.y = 0.05;
  g.world.update(1 / 60, p);
});
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, 'w5-bakery-interior-portrait.png') });
const bakery = await page.evaluate(() => {
  const g = window.__game;
  const named = (n) => g.world.scene.getObjectByName(n);
  return {
    room: named('INT_BAKERY').visible,
    glass: named('Bakery_Glass').visible,
    upper: named('SMB01_Upper').visible,
    calls: g.renderer.info.render.calls,
  };
});
if (!bakery.room) fails.push('bakery: fit-out hidden while the player stands inside');
if (bakery.glass) fails.push('bakery: the shipped glass face did not swap out inside');
if (bakery.upper) fails.push('bakery: the tower did not duck inside');
console.log(`BAKERY inside: room=${bakery.room} glassSwapped=${!bakery.glass} duck=${!bakery.upper} calls=${bakery.calls}`);

// ---- 6. the glass-side law (docs/51 B13 — interiors' window visibility) --
// The near band shows the fit-out only THROUGH the room's own glass. The
// hall's east yard is the clean wrong-side floor (in the old band, behind
// the blind east wall — the fit-out conjured there before the law); the
// diner's Kestrel band window and the hall's west window are the glass
// controls; the laundry bay mouth is section 2's own walk-in.
const glassLaw = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const named = (n) => g.world.scene.getObjectByName(n);
  const out = {};
  const stance = async (x, z, y = 0.05) => {
    p.x = x; p.z = z; p.y = y;
    g.world.update(1 / 60, p);
    await new Promise((res) => setTimeout(res, 350));
    return { hall: named('INT_HALL').visible, diner: named('INT_DINER').visible, calls: g.renderer.info.render.calls };
  };
  // the wrong side: the hall's east yard — blind wall, no window run faces it
  out.wrongSide = await stance(-47.5, 26);
  // the glass controls
  out.dinerGlass = await stance(52.5, -7.0);
  out.hallGlass = await stance(-60.5, 22.8);
  return out;
});
if (glassLaw.wrongSide.hall) fails.push('glass law: hall fit-out visible from the blind east yard (wrong side conjures)');
if (!glassLaw.dinerGlass.diner) fails.push('glass law: diner fit-out hidden at the Kestrel band window (glass side broken)');
if (!glassLaw.hallGlass.hall) fails.push('glass law: hall fit-out hidden at the west window (glass side broken)');
console.log(`GLASS LAW: wrongSide hall=${glassLaw.wrongSide.hall} (${glassLaw.wrongSide.calls} calls) · diner glass=${glassLaw.dinerGlass.diner} · hall glass=${glassLaw.hallGlass.hall}`);

console.log('PAGEERRORS', errors.length);
if (errors.length) fails.push(...errors.slice(0, 3));

writeFileSync(join(OUT, 'w5-interiors-report.json'), JSON.stringify({ boot, laundry, cecil, bakery, glassLaw, errors, fails }, null, 1));
if (fails.length) {
  console.log('W5 PROBE FAILS:');
  for (const f of fails) console.log(' -', f);
  process.exitCode = 1;
} else {
  console.log('W5 PROBE: PASS — the rooms toggle, the hollows walk, the towers duck');
}
await browser.close();
server.close();
