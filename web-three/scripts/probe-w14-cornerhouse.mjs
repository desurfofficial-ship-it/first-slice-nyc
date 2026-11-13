/**
 * W14 probe — the Corner House interior (CORNERHOUSE-INT, KTN-00W).
 *
 * The registry's last openDecision, built on the owner's confirmation. The
 * probe verifies, in-engine (the probe-w5-interiors law, applied to the
 * corner store):
 *   1. THE TOGGLE: the fit-out hides at boot (far state) and shows near the
 *      shell — through the room's own glass (the docs/51 B13 glass-side law).
 *   2. THE SWAP: the shipped CORNER HOUSE storefront glass (the far pane,
 *      named at the W1 build for this exact seam) hides while the player is
 *      near and returns when they leave.
 *   3. THE DUCK: the mass tower (KTN00W_Upper) hides while the player is
 *      INSIDE the room and returns when they leave.
 *   4. THE WALK-IN: the capsule crosses the door gap on the registry
 *      entrance's own x (−55) and stands on the room floor (the hollow is
 *      real; the fixtures keep their aisles).
 *   5. THE DRESSING: the five GLB slots landed (the register, the detergent
 *      shelf, the soda cooler, the two seasonal crates).
 *   6. THE EXIT: the capsule walks back out south onto the Kestrel walk and
 *      every far state restores.
 *
 * Usage: node scripts/probe-w14-cornerhouse.mjs   (exit 1 on any failure)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/world-map', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4671;

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
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } }); // portrait — the W5 pass
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

const fails = [];

// ---- 1. the boot state: the room hidden, the far pane visible ------------
const boot = await page.evaluate(() => {
  const w = window.__game.world;
  const named = (n) => w.scene.getObjectByName(n);
  const g = named('INT_CORNERHOUSE');
  return {
    present: !!g,
    visible: g ? g.visible : null,
    glass: named('CornerHouse_Glass') ? named('CornerHouse_Glass').visible : 'MISSING',
    upper: named('KTN00W_Upper') ? named('KTN00W_Upper').visible : 'MISSING',
    handle: w.interiorHandles.some((h) => h.id === 'CORNERHOUSE-INT'),
    calls: window.__game.renderer.info.render.calls,
  };
});
if (!boot.present) fails.push('CORNERHOUSE: fit-out group INT_CORNERHOUSE missing');
else if (boot.visible) fails.push('CORNERHOUSE: fit-out visible at boot (far state broken)');
if (boot.glass !== true) fails.push(`CornerHouse_Glass: far pane state ${boot.glass} (want visible)`);
if (boot.upper !== true) fails.push(`KTN00W_Upper: duck state ${boot.upper} (want visible)`);
if (!boot.handle) fails.push('CORNERHOUSE-INT: no interior handle registered');
console.log(`BOOT: room hidden=${!boot.visible} glass=${boot.glass} duck=${boot.upper} handle=${boot.handle} — ${boot.calls} draw calls (portrait)`);

// ---- 2+3+4. the walk-in: door gap → room floor → duck → out --------------
const walk = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  const named = (n) => g.world.scene.getObjectByName(n);
  const room = () => named('INT_CORNERHOUSE').visible;
  const glass = () => named('CornerHouse_Glass').visible;
  const upper = () => named('KTN00W_Upper').visible;
  const out = { steps: 0 };

  // stand at the door on the Kestrel walk (the registry entrance's own x)
  p.x = -55; p.z = 6.9; p.y = 0.05;
  g.world.update(1 / 60, p);
  out.doorNear = room();        // the glass-side band shows the fit-out
  out.doorGlassOff = !glass();  // the far pane stepped aside

  // walk in: north through the door gap (x −55.7..−54.3) to the room floor
  const legs = [[-55, 8.6], [-55, 10.2]];
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
  out.px = p.x; out.pz = p.z; out.groundY = p.y;
  out.inRoom = room();
  out.inGlassOff = !glass();
  out.upperDucked = !upper(); // inside → the tower hides
  // walk back out: south through the doorway onto the walk, then WEST along
  // it (no diagonals — the LAUNDRY leg's exit law; the near band holds to
  // 2.4 m past the glass span, so the far assert needs the walk past it)
  const exits = [[-55, 6.8, 400], [-58, 6.4, 400], [-63, 6.2, 600]];
  for (const [tx, tz, budget] of exits) {
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
  out.glassBack = glass();
  out.upperBack = upper();
  out.exitX = p.x; out.exitZ = p.z;
  return out;
});
if (!walk.doorNear) fails.push('cornerhouse: room not visible at the door (glass-side law broke)');
if (!walk.doorGlassOff) fails.push('cornerhouse: far pane still showing at the door (swap stuck)');
if (walk.groundY < 0.0 || walk.groundY > 0.4) fails.push(`cornerhouse: walked in but ground y ${walk.groundY.toFixed(2)} reads wrong`);
if (!walk.inRoom) fails.push('cornerhouse: room hidden INSIDE the room');
if (!walk.upperDucked) fails.push('cornerhouse: tower did not duck while inside');
if (!walk.farAgain) fails.push('cornerhouse: room did not hide after leaving');
if (!walk.glassBack) fails.push('cornerhouse: far pane did not return');
if (!walk.upperBack) fails.push('cornerhouse: tower did not return after leaving');
console.log(`WALK-IN: px=${walk.px.toFixed(1)} pz=${walk.pz.toFixed(1)} y=${walk.groundY.toFixed(2)} steps=${walk.steps} near=${walk.doorNear} duck=${walk.upperDucked} restore=${walk.farAgain}/${walk.glassBack}/${walk.upperBack} exit=(${walk.exitX.toFixed(1)},${walk.exitZ.toFixed(1)})`);

// ---- 5. the dressing: the five GLB slots landed (the W14b restock pass
// rebuilds the island and the walls procedurally — the slots are the
// shipped batch) ------------------------------------------------------------
const dressing = await page.evaluate(() => {
  const w = window.__game.world;
  const upgrades = {};
  for (const [id, file] of w.glbUpgrades ?? []) upgrades[id] = file;
  const want = ['cornerhouse_register', 'cornerhouse_backshelf', 'cornerhouse_cooler',
    'cornerhouse_crate_a', 'cornerhouse_crate_b'];
  return { upgrades, want, calls: window.__game.renderer.info.render.calls };
});
for (const id of dressing.want) {
  if (!(id in dressing.upgrades)) fails.push(`cornerhouse: slot ${id} did not land (glbUpgrades missing)`);
}
console.log(`DRESSING: ${dressing.want.filter((id) => id in dressing.upgrades).length}/${dressing.want.length} slots landed — ${dressing.calls} draw calls`);

// ---- 6. the portrait evidence: the dry-goods floor from inside -----------
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -55; p.z = 11.5; p.y = 0.05;
  g.world.update(1 / 60, p);
});
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, 'w14-cornerhouse-interior-portrait.png') });
const inside = await page.evaluate(() => {
  const g = window.__game;
  const named = (n) => g.world.scene.getObjectByName(n);
  return {
    room: named('INT_CORNERHOUSE').visible,
    glass: named('CornerHouse_Glass') ? named('CornerHouse_Glass').visible : null,
    upper: named('KTN00W_Upper').visible,
    floor: !!named('CornerHouse_Floor'),
    calls: g.renderer.info.render.calls,
  };
});
if (!inside.room) fails.push('cornerhouse: fit-out hidden while the player stands inside');
if (inside.glass) fails.push('cornerhouse: the far pane did not swap out inside');
if (inside.upper) fails.push('cornerhouse: the tower did not duck inside');
if (!inside.floor) fails.push('cornerhouse: the room floor is missing');
console.log(`INSIDE: room=${inside.room} glassSwapped=${!inside.glass} duck=${!inside.upper} floor=${inside.floor} calls=${inside.calls}`);

// ---- 7. the window read: the fit-out shows through the glass from the walk
await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -57.3; p.z = 6.6; p.y = 0.05; // before window W
  g.world.update(1 / 60, p);
  await new Promise((res) => setTimeout(res, 350));
});
const glassRead = await page.evaluate(() => window.__game.world.scene.getObjectByName('INT_CORNERHOUSE').visible);
if (!glassRead) fails.push('cornerhouse: the fit-out does not show through window W from the walk');
console.log(`GLASS READ (window W): room=${glassRead}`);

if (errors.length) fails.push(`page errors: ${errors.length} — ${errors[0]}`);

if (fails.length) {
  console.log(`W14 CORNERHOUSE PROBE — ${fails.length} FAIL(URES):`);
  for (const f of fails) console.log('  ✗ ' + f);
  await browser.close();
  process.exit(1);
} else {
  console.log('W14 CORNERHOUSE PROBE: PASS — the corner store is a real room');
}
await browser.close();
process.exit(0);
