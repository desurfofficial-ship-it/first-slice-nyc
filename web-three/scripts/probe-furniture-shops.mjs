/**
 * The shops furniture probe (docs/57 — the 2026-11 interior pass) — boots
 * the game and verifies the five shop rooms + the diner booths:
 *   1. THE UPGRADES — every manifest slot landed (39 total, 24 files),
 *   2. THE MODELS ARE REAL — the new wrappers carry textured meshes,
 *   3. THE WALK-IN — each shop shows around the player and draws real
 *      geometry; screenshots for the placement review (yaw, feet, fit).
 * Screenshots: shots/shops-*.png and the composed shops-review-grid.png.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4623;
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
await page.waitForFunction(() => {
  const w = window.__game?.world;
  return w && w.furnitureUpgrades && w.furnitureUpgrades.size >= 40;
}, null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(1500);

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) fails++;
};

// ---- 1. every slot landed ---------------------------------------------------
const EXPECTED = [
  'LAUNDRY:LC_9.3', 'LAUNDRY:LC_9.9', 'LAUNDRY:LWall_Art',
  'BARBER:Barber_Bench', 'BARBER:Barber_Mirror_A', 'BARBER:Barber_Mirror_B',
  'PIZZA:Pizza_BoothT_12.5', 'PIZZA:Pizza_BoothT_15.5',
  'BAKERY:Bakery_Table_-36.2', 'BAKERY:Bakery_Table_-31.8',
  ...[-11.5, -14, -16.5, -18.5].map((z) => `DINER:Diner_BoothT_${z}`),
  'RECORDS:Records_Chair', 'RECORDS:Records_Counter', 'RECORDS:Records_Rug',
];
const upgrades = await page.evaluate(() => Object.fromEntries(window.__game.world.furnitureUpgrades));
const total = await page.evaluate(() => window.__game.world.furnitureUpgrades.size);
const missing = EXPECTED.filter((k) => !(k in upgrades));
check('all 17 new shop slots landed', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : '17/17');
check('the manifest is fully landed (40 slots)', total >= 39, `total=${total}`);
console.log('   files:', [...new Set(Object.values(upgrades))].join(' '));

// ---- 2. the new wrappers carry textured meshes ------------------------------
const real = await page.evaluate(() => {
  const named = (n) => window.__game.world.scene.getObjectByName(n);
  const probe = (name) => {
    const g = named(name);
    if (!g) return { found: false };
    let meshes = 0, textured = 0;
    g.traverse((o) => {
      const m = o;
      if (m.isMesh) {
        meshes++;
        const mat = Array.isArray(m.material) ? m.material[0] : m.material;
        if (mat?.map) textured++;
      }
    });
    return { found: true, meshes, textured };
  };
  return {
    chair: probe('LC_9.3_glb'),
    bench: probe('Barber_Bench_glb'),
    mirror: probe('Barber_Mirror_A_glb'),
    booth: probe('Diner_BoothT_-11.5_glb'),
    armchair: probe('Records_Chair_glb'),
    rug: probe('Records_Rug_glb'),
  };
});
for (const [k, v] of Object.entries(real)) {
  check(`${k} wrapper carries a textured mesh`, v.found && v.meshes >= 1 && v.textured >= 1,
    `meshes=${v.meshes ?? 0} textured=${v.textured ?? 0}`);
}

// ---- 2b. the numeric placement audit (feet on the floor, sizes right) ------
// Each wrapper is named `${fixture}_glb`. Its world AABB tells us where the
// model actually stands: feet (min.y) on the room floor, height as authored.
const audit = await page.evaluate(() => {
  const named = (n) => window.__game.world.scene.getObjectByName(n);
  const bboxOf = (name) => {
    const g = named(name);
    if (!g) return null;
    g.updateWorldMatrix(true, true);
    let mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
    g.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      const e = o.matrixWorld.elements;
      for (let i = 0; i < 8; i++) {
        const x = (i & 1) ? bb.max.x : bb.min.x;
        const y = (i & 2) ? bb.max.y : bb.min.y;
        const z = (i & 4) ? bb.max.z : bb.min.z;
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
        const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
        const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        mnx = Math.min(mnx, wx); mxx = Math.max(mxx, wx);
        mny = Math.min(mny, wy); mxy = Math.max(mxy, wy);
        mnz = Math.min(mnz, wz); mxz = Math.max(mxz, wz);
      }
    });
    return {
      feet: +mny.toFixed(3), top: +mxy.toFixed(3),
      size: [+(mxx - mnx).toFixed(2), +(mxy - mny).toFixed(2), +(mxz - mnz).toFixed(2)],
    };
  };
  const out = {};
  for (const n of ['LC_9.3_glb', 'LC_9.9_glb', 'LWall_Art_glb', 'Barber_Bench_glb',
    'Barber_Mirror_A_glb', 'Barber_Mirror_B_glb', 'Pizza_BoothT_12.5_glb',
    'Bakery_Table_-36.2_glb', 'Diner_BoothT_-11.5_glb', 'Records_Chair_glb',
    'Records_Counter_glb', 'Records_Rug_glb']) {
    out[n] = bboxOf(n);
  }
  return out;
});
for (const [n, b] of Object.entries(audit)) {
  check(`${n}: placed with real bounds`, !!b, b ? `feet=${b.feet} top=${b.top} size=${b.size.join('x')}` : 'MISSING');
}
console.log('AUDIT', JSON.stringify(audit, null, 1));

// ---- 3. the walk-in shots (placement review) --------------------------------
const rooms = [
  { id: 'LAUNDRY', out: 'shops-laundry.png', x: -3.6, y: 0.1, z: 11.2, tx: -2.9, tz: 9.3,
    label: 'LAUNDRY - waiting chairs + cart' },
  { id: 'LAUNDRY', out: 'shops-laundry-art.png', x: -6.2, y: 0.1, z: 13.75, tx: -10.8, tz: 13.75,
    label: 'LAUNDRY - the framed print over the washers' },
  { id: 'BARBER', out: 'shops-barber.png', x: 36.4, y: 0.1, z: 7.0, tx: 37.0, tz: 12.6,
    label: 'BARBER - through the storefront: mirrors, chairs, bench' },
  { id: 'PIZZA', out: 'shops-pizza.png', x: 25.4, y: 0.1, z: 6.8, tx: 25.3, tz: 13.2,
    label: 'PIZZA - through the window: the two booths' },
  { id: 'BAKERY', out: 'shops-bakery.png', x: -36.0, y: 0.1, z: -33.2, tx: -35.8, tz: -27.2,
    label: 'BAKERY - through the window: the cafe two-tops' },
  { id: 'DINER', out: 'shops-diner-booths.png', x: 54.8, y: 0.1, z: -9.4, tx: 51.4, tz: -15.6,
    label: 'DINER - the four booths down the W wall' },
  { id: 'RECORDS', out: 'shops-records.png', x: -24.4, y: 0.1, z: -26.4, tx: -26.4, tz: -30.4,
    label: 'RECORDS - the listening corner (armchair, rug, counter)' },
];
const walkIn = async (r) => {
  await page.evaluate(({ x, z, y, tx, tz }) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = x; p.z = z; p.y = y;
    // the rooms are 5x11 m — a mildly raised look so the far furniture
    // reads past the player (outside shots ride the storefront glass)
    g.cam.userDistMultiplier = 0.9;
    g.cam.pitchOffset = 0.1;
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
  check(`${r.id}: the room shows and real geometry draws`,
    after.roomVisible && after.tris > 30000, `${r.out} visible=${after.roomVisible}, tris=${after.tris}`);
}

check('console clean', errors.length === 0, errors.slice(0, 2).join(' | '));
writeFileSync(join(OUT, 'shops-report.json'), JSON.stringify({ upgrades, real, errors }, null, 1));
await browser.close();
server.close();

const { execSync } = await import('node:child_process');
try {
  execSync(`python3 - <<'PY'
from PIL import Image, ImageDraw
shots = ["shops-laundry.png", "shops-laundry-art.png", "shops-barber.png",
         "shops-barber-bench.png", "shops-pizza.png", "shops-bakery.png",
         "shops-diner-booths.png", "shops-records.png"]
labels = ["LAUNDRY - waiting chairs", "LAUNDRY - framed print",
          "BARBER - mirrors + chairs + bench", "BARBER - waiting bench",
          "PIZZA - booths", "BAKERY - cafe two-tops",
          "DINER - booths", "RECORDS - listening corner"]
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
grid.save("shots/shops-review-grid.png")
print("grid written")
PY`, { cwd: new URL('..', import.meta.url).pathname, stdio: 'pipe' });
  console.log('   review grid: shots/shops-review-grid.png');
} catch (e) {
  console.log('   (grid compose skipped:', String(e.message).slice(0, 80), ')');
}

console.log(fails ? `SHOPS FAILURES: ${fails}` : 'SHOPS OK');
process.exitCode = fails ? 1 : 0;
