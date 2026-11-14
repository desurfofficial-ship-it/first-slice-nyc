/**
 * The gifted-packs probe (2026-11-14) — boots the game and verifies the 14
 * new furniture slots end to end:
 *   1. THE UPGRADES — every gifted slot landed in world.furnitureUpgrades,
 *   2. THE REST LAW — the boot spawn keeps every room hidden (draw census
 *      unchanged at rest),
 *   3. THE WALK-IN — aimed screenshots of every new placement (yaw review:
 *      the sc_/mi_ models' own facing is verified per slot from these).
 * Shots: shots/gifted-*.png + a composed review grid.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4644;
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
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

const GIFTED = [
  'CECIL:Cecil_Desk', 'CECIL:Cecil_Wardrobe', 'CECIL:Cecil_DeskChair', 'CECIL:Cecil_HerbPot',
  'HALL:Hall_LoungeSofa', 'HALL:Hall_LoungeTable', 'HALL:Hall_Armchair', 'HALL:Hall_Plant',
  'HALL:Hall_LendShelf', 'HALL:Hall_NookSet',
  'BARBER:Barber_StepStool', 'BARBER:Barber_Lamp',
  'RECORDS:Records_CornerTable', 'RECORDS:Records_Lamp',
];

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (/gifted|sc_|mi_|keeps its procedural/i.test(m.text())) console.log('CONSOLE:', m.text().slice(0, 170));
  if (m.type() === 'error') errors.push(m.text());
});

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
// the furniture fetches ride boot — poll until the census settles
await page.waitForFunction(() => {
  const w = window.__game?.world;
  return w && w.furnitureUpgrades && w.furnitureUpgrades.size >= 54;
}, null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(2500);

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) fails++;
};

// ---- 1. every gifted slot landed -------------------------------------------
const upgrades = await page.evaluate(() => Object.fromEntries(window.__game.world.furnitureUpgrades));
const missing = GIFTED.filter((k) => !(k in upgrades));
check('all 14 gifted slots landed', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : '14/14');
const giftedFiles = GIFTED.map((k) => upgrades[k]).filter(Boolean);
check('the gifted slots wear sc_/mi_ files', giftedFiles.length === 14 && giftedFiles.every((f) => /^models\/furniture\/(sc_|mi_)/.test(f)),
  `${new Set(giftedFiles).size} unique files`);

// ---- 2. the rest law --------------------------------------------------------
const rest = await page.evaluate(() => {
  const w = window.__game.world;
  const named = (n) => w.scene.getObjectByName(n);
  return {
    cecil: named('INT_CECIL').visible,
    hall: named('INT_HALL').visible,
    barber: named('INT_BARBER').visible,
    records: named('INT_RECORDS').visible,
    calls: window.__game.renderer?.info?.render?.calls ?? -1,
  };
});
check('no room shows at the boot spawn (zero gifted draws at rest)',
  !rest.cecil && !rest.hall && !rest.barber && !rest.records, `calls=${rest.calls}`);

// ---- 3. the walk-ins --------------------------------------------------------
const rooms = [
  { id: 'CECIL', out: 'gifted-cecil-desk.png', x: 13.4, y: 8.5, z: -10.3, tx: 12.2, tz: -13.7, label: 'CECIL - desk + wardrobe (the S wall)' },
  { id: 'CECIL', out: 'gifted-cecil-shelf.png', x: 13.4, y: 9.4, z: -10.2, tx: 10.6, tz: -11.8, label: 'CECIL - herb pot on the kitchen shelf' },
  { id: 'HALL', out: 'gifted-hall-lounge.png', x: -56.2, y: 0.2, z: 25.6, tx: -54.4, tz: 21.9, label: 'HALL - lounge sofa + table (the notice wall)' },
  { id: 'HALL', out: 'gifted-hall-circle.png', x: -54.0, y: 0.2, z: 23.2, tx: -50.6, tz: 26.9, label: 'HALL - armchair + plant completing the circle' },
  { id: 'HALL', out: 'gifted-hall-nook.png', x: -51.6, y: 0.2, z: 30.2, tx: -48.8, tz: 28.5, label: 'HALL - the break nook by the kitchenette' },
  { id: 'HALL', out: 'gifted-hall-shelf.png', x: -52.0, y: 0.2, z: 25.4, tx: -48.4, tz: 22.7, label: 'HALL - the lending shelf on the E wall' },
  { id: 'BARBER', out: 'gifted-barber.png', x: 37.2, y: 0.2, z: 16.9, tx: 38.3, tz: 15.5, label: 'BARBER - the step stool at the counter shoulder' },
  { id: 'BARBER', out: 'gifted-barber-lamp.png', x: 36.8, y: 0.2, z: 12.4, tx: 34.7, tz: 9.6, label: 'BARBER - the lamp at the waiting corner' },
  { id: 'RECORDS', out: 'gifted-records.png', x: -23.6, y: 0.2, z: -27.2, tx: -25.9, tz: -29.9, label: 'RECORDS - the listening corner + corner table' },
  { id: 'RECORDS', out: 'gifted-records-lamp.png', x: -24.4, y: 0.2, z: -29.0, tx: -27.4, tz: -31.3, label: 'RECORDS - the floor lamp in the deep corner' },
];
const walkIn = async (r) => {
  await page.evaluate(({ x, z, y, tx, tz }) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = x; p.z = z; p.y = y;
    const yaw = Math.atan2(tx - x, tz - z);
    clearInterval(window.__aimLock);
    window.__aimLock = setInterval(() => {
      g.cam.camYaw = yaw;
      g.cam.snapBehind({ x: p.x, y: p.y, z: p.z });
    }, 16);
    g.cam.camYaw = yaw;
    g.cam.snapBehind({ x, y, z });
    g.world.update(1 / 60, p);
  }, { x: r.x, z: r.z, y: r.y, tx: r.tx, tz: r.tz });
  await page.waitForTimeout(700);
  const after = await page.evaluate((room) => {
    const info = window.__game.renderer.info.render;
    return {
      calls: info.calls,
      roomVisible: window.__game.world.scene.getObjectByName(`INT_${room}`)?.visible === true,
    };
  }, r.id);
  await page.screenshot({ path: join(OUT, r.out) });
  await page.evaluate(() => clearInterval(window.__aimLock));
  return after;
};
for (const r of rooms) {
  const after = await walkIn(r);
  check(`${r.id}: the room shows and draws`, after.roomVisible, `${r.out} visible=${after.roomVisible} calls=${after.calls}`);
}

// the wrapper realness: meshes under the gifted wrappers, pack-one flat
// colors (no map) vs pack-two palette texture — both legal, the probe's
// texture law binds only the ABO slots
const real = await page.evaluate(() => {
  const w = window.__game.world;
  const named = (n) => w.scene.getObjectByName(n);
  const probe = (name) => {
    const g = named(name);
    if (!g) return { found: false };
    let meshes = 0, textured = 0, tris = 0;
    g.traverse((o) => {
      const m = o;
      if (m.isMesh) {
        meshes++;
        const mat = Array.isArray(m.material) ? m.material[0] : m.material;
        if (mat?.map) textured++;
        tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
      }
    });
    return { found: true, meshes, textured, tris: Math.round(tris) };
  };
  return {
    desk: probe('Cecil_Desk_glb'),
    armchair: probe('Hall_Armchair_glb'),
    nook: probe('Hall_NookSet_glb'),
    plant: probe('Hall_Plant_glb'),
  };
});
for (const [k, v] of Object.entries(real)) {
  check(`${k} wrapper carries real geometry`, v.found && v.meshes >= 1 && v.tris > 100,
    `meshes=${v.meshes} textured=${v.textured} tris=${v.tris}`);
}

check('console clean', errors.length === 0, errors.slice(0, 2).join(' | '));
writeFileSync(join(OUT, 'gifted-report.json'), JSON.stringify({ upgrades: Object.fromEntries(GIFTED.map((k) => [k, upgrades[k]])), real, rest, errors }, null, 1));
await browser.close();
server.close();

// compose the review grid
const { execSync } = await import('node:child_process');
try {
  execSync(`python3 - <<'PY'
from PIL import Image, ImageDraw
shots = ["gifted-cecil-desk.png", "gifted-cecil-shelf.png", "gifted-hall-lounge.png",
         "gifted-hall-circle.png", "gifted-hall-nook.png", "gifted-hall-shelf.png",
         "gifted-barber.png", "gifted-barber-lamp.png", "gifted-records.png",
         "gifted-records-lamp.png"]
labels = ["CECIL desk+wardrobe", "CECIL herb pot", "HALL lounge", "HALL circle",
          "HALL nook", "HALL lend shelf", "BARBER stool", "BARBER lamp",
          "RECORDS table", "RECORDS lamp"]
W, H = 450, 350
cols, rows = 2, 5
grid = Image.new("RGB", (cols*W, rows*H), (24, 22, 28))
d = ImageDraw.Draw(grid)
for i, (s, lab) in enumerate(zip(shots, labels)):
    im = Image.open("shots/" + s).resize((W, H-24))
    x, y = (i % cols)*W, (i // cols)*H
    grid.paste(im, (x, y+24))
    d.text((x+8, y+5), lab, fill=(240, 230, 210))
grid.save("shots/gifted-review-grid.png")
print("grid ok")
PY`, { cwd: DIST + '/..' });
  console.log('review grid: shots/gifted-review-grid.png');
} catch (e) {
  console.log('grid compose failed (shots still saved)', e.message.slice(0, 80));
}
process.exit(fails === 0 ? 0 : 1);
