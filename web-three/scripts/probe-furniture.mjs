/**
 * The furniture probe (docs/57 — ABO first-slice interiors) — boots the
 * game and verifies the wiring end to end:
 *   1. THE UPGRADES — every manifest slot landed: world.furnitureUpgrades
 *      carries all 19 slots (bed/dresser/nightstand/lamp/rug in Cecil's
 *      room; table/bookcase/sofa/coffee table/2 chairs/sideboard in the
 *      hall; 8 counter stools in the diner),
 *   2. THE MODELS ARE REAL — the GLB wrappers carry textured meshes
 *      (KTX2 maps decoded, not black placeholder boxes),
 *   3. THE REST LAW — at the boot spawn all three rooms stay hidden:
 *      zero furniture draws at rest (the perf ledger holds),
 *   4. THE WALK-IN — each room shows around the player and the renderer's
 *      draw calls jump while it does (real geometry, drawing).
 * Screenshots: shots/furniture-cecil.png, furniture-hall.png,
 * furniture-diner.png, and the composed review grid
 * shots/furniture-review-grid.png.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4621;
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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
// the furniture fetches ride boot — give them a wall-time window (software
// GL runs the clock slow; poll, never assume)
await page.waitForFunction(() => {
  const w = window.__game?.world;
  return w && w.furnitureUpgrades && w.furnitureUpgrades.size >= 19;
}, null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500);

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) fails++;
};

// ---- 1. every slot landed ---------------------------------------------------
const EXPECTED = [
  'CECIL:Cecil_BedFrame', 'CECIL:Cecil_Dresser', 'CECIL:Cecil_Nightstand',
  'CECIL:Cecil_Lamp', 'CECIL:Cecil_Rug',
  'HALL:Hall_WorkTable', 'HALL:Hall_Bookcase', 'HALL:Hall_Sofa',
  'HALL:Hall_CoffeeTable', 'HALL:Hall_Chair_A', 'HALL:Hall_Chair_B',
  'HALL:Hall_Sideboard',
  ...Array.from({ length: 8 }, (_, i) => `DINER:Diner_Stool_${i}`),
];
const upgrades = await page.evaluate(() => Object.fromEntries(window.__game.world.furnitureUpgrades));
const missing = EXPECTED.filter((k) => !(k in upgrades));
check('all 19 furniture slots landed', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : '19/19');
console.log('   files:', [...new Set(Object.values(upgrades))].join(' '));

// ---- 2. the models are real (textured meshes under the wrappers) ------------
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
    bed: probe('Cecil_BedFrame_glb'),
    sofa: probe('Hall_Sofa_glb'),
    stool: probe('Diner_Stool_0_glb'),
    mattressHidden: !named('Cecil_Mattress')?.visible,
    pillowHidden: !named('Cecil_Pillow')?.visible,
    viseHidden: !named('Hall_WorkVise')?.visible,
  };
});
check('the bed wrapper carries a textured mesh', real.bed.found && real.bed.meshes >= 1 && real.bed.textured >= 1,
  `meshes=${real.bed.meshes} textured=${real.bed.textured} tris=${real.bed.tris}`);
check('the sofa wrapper carries a textured mesh', real.sofa.found && real.sofa.textured >= 1,
  `meshes=${real.sofa.meshes} textured=${real.sofa.textured}`);
check('a counter stool wrapper carries a textured mesh', real.stool.found && real.stool.textured >= 1,
  `meshes=${real.stool.meshes} textured=${real.stool.textured}`);
check('the procedural mattress+pillow hide under the real bed', real.mattressHidden && real.pillowHidden);
check('the work-table vise hides under the real table', real.viseHidden);

// ---- 3. the rest law: all rooms hidden at the boot spawn --------------------
const rest = await page.evaluate(() => {
  const w = window.__game.world;
  const named = (n) => w.scene.getObjectByName(n);
  return {
    cecil: named('INT_CECIL').visible,
    hall: named('INT_HALL').visible,
    diner: named('INT_DINER').visible,
    calls: window.__game.renderer?.info?.render?.calls ?? -1,
  };
});
check('no room shows at the boot spawn (zero furniture draws at rest)',
  !rest.cecil && !rest.hall && !rest.diner, `calls=${rest.calls}`);

// ---- 4. the walk-in: each room shows + real geometry draws -----------------
// The camera is aimed directly (cam.yaw → atan2 of the view vector) — no
// walking, no collider fights: teleport, aim, settle, shoot.
const rooms = [
  { id: 'CECIL', out: 'furniture-cecil.png', x: 11.6, y: 8.5, z: -12.9, tx: 15.0, tz: -10.2,
    label: 'CECIL ROOM - bed + nightstand (the bedroom)' },
  { id: 'CECIL', out: 'furniture-cecil-dresser.png', x: 13.6, y: 8.5, z: -10.0, tx: 10.6, tz: -13.3,
    label: 'CECIL ROOM - dresser + lamp (the W wall)' },
  { id: 'HALL', out: 'furniture-hall.png', x: -55.0, y: 0.1, z: 22.2, tx: -48.9, tz: 26.3,
    label: 'HALL - sofa + coffee table + the communal table' },
  { id: 'HALL', out: 'furniture-hall-north.png', x: -56.5, y: 0.1, z: 27.5, tx: -51.2, tz: 31.0,
    label: 'HALL - bookcase + shelves (the workshop half)' },
  { id: 'HALL', out: 'furniture-hall-south.png', x: -52.6, y: 0.1, z: 25.9, tx: -51.3, tz: 20.6,
    label: 'HALL - sideboard at the notice wall' },
  { id: 'DINER', out: 'furniture-diner.png', x: 54.6, y: 0.1, z: -12.6, tx: 57.2, tz: -14.6,
    label: 'DINER - the counter from the north end' },
  { id: 'DINER', out: 'furniture-diner-wide.png', x: 52.8, y: 0.1, z: -9.6, tx: 57.8, tz: -17.5,
    label: 'DINER - the room wide' },
  { id: 'CECIL', out: 'furniture-bed-close.png', x: 13.0, y: 8.5, z: -12.6, tx: 14.7, tz: -10.4,
    label: 'Cecil bed close-up' },
];
const walkIn = async (r) => {
  // teleport + aim with the yaw LOCKED through the settle AND the shutter
  // (the camera's street-side auto-yaw eases camYaw away the moment the
  // rAF loop resumes — the interval re-asserts yaw + boom every tick)
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
      calls: info.calls, tris: info.triangles,
      roomVisible: window.__game.world.scene.getObjectByName(`INT_${room}`)?.visible === true,
    };
  }, r.id);
  await page.screenshot({ path: join(OUT, r.out) });
  await page.evaluate(() => clearInterval(window.__aimLock));
  return after;
};
for (const r of rooms) {
  const after = await walkIn(r);
  check(`${r.id}: the room shows around the player and real geometry draws`,
    after.roomVisible && after.tris > 30000,
    `${r.out} visible=${after.roomVisible}, tris=${after.tris}`);
}

// ---- the composed review grid (3×? — every wired model visible somewhere) ----
check('console clean', errors.length === 0, errors.slice(0, 2).join(' | '));
writeFileSync(join(OUT, 'furniture-report.json'), JSON.stringify({ upgrades, real, rest, errors }, null, 1));
await browser.close();
server.close();

// compose the review grid from the eight aimed shots
const { execSync } = await import('node:child_process');
try {
  execSync(`python3 - <<'PY'
from PIL import Image, ImageDraw
shots = ["furniture-cecil.png", "furniture-cecil-dresser.png", "furniture-hall.png",
         "furniture-hall-north.png", "furniture-hall-south.png", "furniture-diner.png",
         "furniture-diner-wide.png", "furniture-bed-close.png"]
labels = ["CECIL ROOM - bed + nightstand", "CECIL ROOM - dresser + lamp",
          "HALL - sofa + coffee table + table", "HALL - bookcase + shelves",
          "HALL - sideboard at the notice wall", "DINER - the counter stools",
          "DINER - the room wide", "Cecil bed close-up"]
W, H, CAP = 560, 440, 30
cols = 2
rows = (len(shots) + cols - 1) // cols
grid = Image.new("RGB", (W * cols, (H + CAP) * rows), (24, 22, 28))
d = ImageDraw.Draw(grid)
for i, (s, lab) in enumerate(zip(shots, labels)):
    im = Image.open(f"shots/{s}").resize((W, H))
    x, y = (i % cols) * W, (i // cols) * (H + CAP)
    grid.paste(im, (x, y + CAP))
    d.text((x + 10, y + 8), lab, fill=(240, 230, 210))
grid.save("shots/furniture-review-grid.png")
print("grid written")
PY`, { cwd: new URL('..', import.meta.url).pathname, stdio: 'pipe' });
  console.log('   review grid: shots/furniture-review-grid.png');
} catch (e) {
  console.log('   (grid compose skipped:', String(e.message).slice(0, 80), ')');
}

console.log(fails ? `FURNITURE FAILURES: ${fails}` : 'FURNITURE OK');
process.exitCode = fails ? 1 : 0;
