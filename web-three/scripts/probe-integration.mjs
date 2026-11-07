/**
 * probe-integration.mjs — production-integration probe for the Sandflow
 * asset evaluation branch. Boots the REAL game (no showcase hatch), walks
 * the player to each integrated prop's vantage point, and records:
 *   - the glbUpgrades map (which seams actually landed)
 *   - the [glb] console lines (which seams kept their procedural look)
 *   - renderer draw calls / triangles / fps
 *   - a screenshot per vantage point (shots/<tag>-<spot>.png)
 *
 * Usage: node scripts/probe-integration.mjs <tag>   (tag = "before" | "after")
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const TAG = process.argv[2] ?? 'before';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const glbLogs = [];
const errors = [];
page.on('console', (m) => {
  if (m.text().includes('[glb]')) glbLogs.push(m.text());
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(3500); // async GLB upgrades land + fetches settle

// ---- seam status straight from the runtime maps ----
const seams = await page.evaluate(() => {
  const w = window.__game.world;
  const up = w['glbUpgrades'] instanceof Map ? Object.fromEntries(w['glbUpgrades']) : {};
  const regs = w['glbProps'] instanceof Map ? [...w['glbProps'].keys()] : [];
  return { upgrades: up, registered: regs.sort() };
});

// ---- teleport with walkTo fallback (the diag pattern: camera-relative keys) ----
const teleport = async (x, z) => page.evaluate(([tx, tz]) => {
  const g = window.__game;
  g.player.capsule.x = tx;
  g.player.capsule.z = tz;
}, [x, z]);

const walkTo = async (x, z, timeout = 45000) => {
  // try a direct teleport first: fast, and the camera/gameplay loops settle it
  await teleport(x, z);
  await page.waitForTimeout(700);
  const landed = await page.evaluate(([tx, tz]) => {
    const p = window.__game.player.capsule;
    return Number.isFinite(p.y) && p.y > -0.5 && p.y < 3.5
      && Math.hypot(tx - p.x, tz - p.z) < 1.0;
  }, [x, z]);
  if (landed) return true;
  await page.evaluate(([tx, tz]) => { window.__diagTarget = [tx, tz]; }, [x, z]);
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > timeout) return false;
    const done = await page.evaluate(() => {
      const g = window.__game;
      const [tx, tz] = window.__diagTarget;
      const p = g.player.capsule;
      const dx = tx - p.x, dz = tz - p.z;
      if (Math.hypot(dx, dz) < 0.55) {
        for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) g.input.injectKey(k, false);
        return true;
      }
      const yaw = g.player.camYaw ?? 0;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const rx = -Math.cos(yaw), rz = Math.sin(yaw);
      const fwd = dx * fx + dz * fz;
      const right = dx * rx + dz * rz;
      g.input.injectKey('KeyW', fwd > 0.2);
      g.input.injectKey('KeyS', fwd < -0.2);
      g.input.injectKey('KeyD', right > 0.2);
      g.input.injectKey('KeyA', right < -0.2);
      return false;
    });
    if (done) break;
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(900); // camera settles
  return true;
};

mkdirSync('shots', { recursive: true });
const spots = [
  ['hydrant', 4.4, -3.1],
  ['recycle-station', 2.6, -5.2],
  ['streetlamp', 13.0, -4.2],
  ['stoop-door', 13.6, 5.6],
  ['bodega-interior', -14.6, 12.5],
  ['laundry-room', -5.3, 7.75],
  ['papers', -42.9, 4.6],
  ['plaza-bench', -38.9, 3.0],
];
const shots = {};
for (const [name, px, pz] of spots) {
  const ok = await walkTo(px, pz);
  await page.waitForTimeout(400);
  const file = `shots/${TAG}-${name}.png`;
  await page.screenshot({ path: file, timeout: 45000 });
  shots[name] = { walked: ok, file };
}

// ---- scene-graph assertions (interiors + bodega, no walk needed) ----
const scene = await page.evaluate(() => {
  const w = window.__game.world;
  const found = {};
  const visit = (o) => {
    if (o.name && /LW_slot|Bodega_BackShelf|_glb$|Fridge/.test(o.name)) {
      (found[o.name] ??= { meshes: 0 });
    }
    if (o.isMesh && o.parent && /LW_slot|Bodega_BackShelf|Fridge/.test(o.parent.name ?? '')) {
      // count below
    }
    for (const c of o.children) visit(c);
  };
  visit(w.scene);
  return found;
});

// ---- fps over 2.5 s ----
const fps = await page.evaluate(() => new Promise((resolve) => {
  let n = 0;
  const t0 = performance.now();
  const loop = () => { n += 1; if (performance.now() - t0 < 2500) requestAnimationFrame(loop); else resolve(Math.round(n * 1000 / (performance.now() - t0))); };
  requestAnimationFrame(loop);
}));

// ---- renderer.info straight off the game's own loop (renders every frame) ----
const perf = await page.evaluate(() => {
  const g = window.__game;
  const r = g['renderer'];
  if (!r || !r.info) return { calls: -1, tris: -1 };
  return { calls: r.info.render.calls, tris: r.info.render.triangles, programs: r.info.programs?.length ?? 0 };
});

const report = { tag: TAG, seams, glbLogs, errors, shots, scene, fps, perf };
writeFileSync(`shots/${TAG}-integration.json`, JSON.stringify(report, null, 2));
console.log('SEAMS', JSON.stringify(seams));
console.log('GLB LOGS', JSON.stringify(glbLogs));
console.log('ERRORS', errors.length, errors.slice(0, 5));
console.log('FPS', fps, 'RENDER', JSON.stringify(perf));
console.log('WALKS', JSON.stringify(Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, v.walked]))));
await browser.close();
server.close();
process.exit(0);
