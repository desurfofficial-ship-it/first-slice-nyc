/**
 * Rig x-ray — for the two Kestrel gate rigs, split main vs shadow pass and
 * list the frustum-visible meshes per owner with names, so a perf pass can
 * target real objects instead of guessing. Read-only diagnostic.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4587;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3000);

// capture the real render calls: count main-pass vs shadow-pass via render-info delta trick:
// renderer.info.render resets each render call... use info.autoReset false + manual? Simpler:
// hook renderer.render to snapshot info right after each internal render.
await page.evaluate(() => {
  const g = window.__game;
  const r = g['renderer'];
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    const isShadow = scene.isScene === true && camera.isPerspectiveCamera === false && camera.isOrthographicCamera === true;
    const out = orig(scene, camera);
    const w = (window.__passLog = window.__passLog || { main: 0, shadow: 0 });
    if (camera.isOrthographicCamera) w.shadow = Math.max(w.shadow, r.info.render.calls);
    else w.main = Math.max(w.main, r.info.render.calls);
    return out;
  };
});

const rigs = [
  ['PLAZA', { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2], feet: [-42, 6.2, 0.05] }],
  ['CART_CORNER', { pos: [10, 2.6, -5.2], at: [-24, 1.5, -0.5], feet: [4, -6.2, 0.05] }],
];

for (const [name, rig] of rigs) {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = d.feet[2] ?? 0.05;
    const c = g.cam.camera;
    c.position.set(d.pos[0], d.pos[1], d.pos[2]);
    c.lookAt(d.at[0], d.at[1], d.at[2]);
    window.__passLog = { main: 0, shadow: 0 };
  }, rig);
  await page.waitForTimeout(900);
  const pass = await page.evaluate(() => ({ log: window.__passLog, info: window.__game['renderer'].info.render.calls }));
  console.log(`${name}: main-pass=${pass.log.main} shadow-pass=${pass.log.shadow} (last-frame info=${pass.info})`);

  // x-ray: visible meshes grouped by owner with actual mesh names
  const rows = await page.evaluate(() => {
    const g = window.__game;
    const cam = g.cam.camera;
    const scene = g.world.scene;
    const hidden = (o) => { let p = o; while (p) { if (p.visible === false) return true; p = p.parent; } return false; };
    const owner = (o) => { let n = o; while (n) { if (n.name && n.name !== 'Scene' && n.name.length > 2) return n.name; n = n.parent; } return '(unnamed)'; };
    const groups = new Map();
    scene.traverse((o) => {
      if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) return;
      if (!o.visible || hidden(o)) return;
      const k = owner(o);
      const e = groups.get(k) ?? { meshes: 0, names: new Map(), casts: 0 };
      e.meshes++;
      if (o.castShadow) e.casts++;
      const nm = o.name || o.geometry?.type || o.type;
      e.names.set(nm, (e.names.get(nm) ?? 0) + 1);
      groups.set(k, e);
    });
    return [...groups.entries()].map(([k, v]) => ({ k, m: v.meshes, c: v.casts, names: [...v.names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) }))
      .sort((a, b) => b.m - a.m).slice(0, 24);
  });
  for (const r of rows) {
    console.log(`  ${String(r.m).padStart(3)} meshes (${String(r.c).padStart(3)} cast)  ${r.k}  e.g. ${r.names.map(([n, x]) => `${n}x${x}`).join(', ').slice(0, 110)}`);
  }
}
console.log(errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'ZERO page errors');
await browser.close();
server.close();
