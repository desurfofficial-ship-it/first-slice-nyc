/**
 * Rig x-ray — real per-rig draw attribution (docs/51 B13 diagnostic).
 *
 * For each Kestrel gate rig: measure the LAST FRAME's renderer.info.render
 * calls over a settled window (same conditions as probe-w0-census), then
 * attribute those draws with REAL frustum tests (Gribb-Hartmann planes ×
 * geometry bounding spheres):
 *   - main camera frustum   → what the eye pass draws
 *   - sun shadow frustum    → what the shadow pass draws (castShadow only)
 * Everything is grouped by top-level owner so a perf move targets real
 * objects, not guesses. Read-only diagnostic.
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
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
  }
  res.end(existsSync(file) && !file.endsWith('/') ? readFileSync(file) : readFileSync(join(DIST, 'index.html')));
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

// same override hook the census uses — the measured frame IS the census frame
await page.evaluate(() => {
  const g = window.__game;
  const r = g['renderer'];
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    const out = orig(scene, camera);
    const w = (window.__frameLog = window.__frameLog || []);
    w.push(r.info.render.calls);
    if (w.length > 240) w.shift();
    return out;
  };
});

// ---- the attribution kernel (plain math, no three import in page) ----
// Frustum planes from proj*view (column-major .elements), Gribb-Hartmann.
const KERNEL = `
window.__xray = () => {
  const g = window.__game;
  const cam = g.cam.camera;
  const scene = g.world.scene;
  const mul = (a, b) => { // column-major 4x4
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
    }
    return o;
  };
  const planesOf = (proj, view) => {
    const m = mul(proj.elements, view.elements);
    const row = (j) => [m[j], m[4+j], m[8+j], m[12+j]];
    const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);
    const add = (a, b, s) => [a[0]+s*b[0], a[1]+s*b[1], a[2]+s*b[2], a[3]+s*b[3]];
    return [add(r3,r0,1), add(r3,r0,-1), add(r3,r1,1), add(r3,r1,-1), add(r3,r2,1), add(r3,r2,-1)];
  };
  const inside = (planes, x, y, z, rad) => {
    for (let i = 0; i < 6; i++) {
      const p = planes[i];
      if (p[0]*x + p[1]*y + p[2]*z + p[3] < -rad) return false;
    }
    return true;
  };
  const hidden = (o) => { let p = o; while (p) { if (p.visible === false) return true; p = p.parent; } return false; };
  const owner = (o) => { let n = o; while (n) { if (n.name && n.name !== 'Scene' && n.name.length > 2) return n.name; n = n.parent; } return '(unnamed)'; };
  const sub = (o) => { let n = o.parent; while (n) { if (n.name && n.name.length > 2) return n.name; n = n.parent; } return '(root)'; };

  // sun shadow frustum (DirectionalLightShadow updates its ortho cam in render)
  let sunPlanes = null, sunFound = false;
  scene.traverse((o) => { if (!sunFound && o.isDirectionalLight && o.castShadow && o.shadow) {
    sunFound = true;
    const sc = o.shadow.camera;
    sunPlanes = planesOf(sc.projectionMatrix, sc.matrixWorldInverse);
  }});

  const main = planesOf(cam.projectionMatrix, cam.matrixWorldInverse);
  const groups = new Map();
  let mainTotal = 0, shadowTotal = 0, sprites = 0;
  scene.traverse((o) => {
    if (o.isSprite || o.isLine || o.isPoints) { if (!hidden(o)) sprites++; return; }
    if (!o.isMesh || hidden(o)) return;
    const geo = o.geometry;
    if (!geo) return;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const bs = geo.boundingSphere;
    const e = o.matrixWorld.elements;
    const sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10]);
    const rad = bs.radius * Math.max(sx, sy, sz);
    const cx = bs.center.x*e[0] + bs.center.y*e[4] + bs.center.z*e[8] + e[12];
    const cy = bs.center.x*e[1] + bs.center.y*e[5] + bs.center.z*e[9] + e[13];
    const cz = bs.center.x*e[2] + bs.center.y*e[6] + bs.center.z*e[10] + e[14];
    const inMain = inside(main, cx, cy, cz, rad);
    const inSun = sunPlanes && o.castShadow ? inside(sunPlanes, cx, cy, cz, rad) : false;
    if (!inMain && !inSun) return;
    const k = owner(o);
    const gr = groups.get(k) ?? { main: 0, shadow: 0, names: new Map(), subs: new Map() };
    if (inMain) { gr.main++; mainTotal++; }
    if (inSun) { gr.shadow++; shadowTotal++; }
    const nm = o.name || o.type;
    gr.names.set(nm, (gr.names.get(nm) ?? 0) + 1);
    if (k === '(unnamed)' || gr.main + gr.shadow > 12) gr.subs.set(sub(o), (gr.subs.get(sub(o)) ?? 0) + 1);
    groups.set(k, gr);
  });
  const rows = [...groups.entries()].map(([k, v]) => ({
    k, main: v.main, shadow: v.shadow,
    names: [...v.names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n, x]) => n + 'x' + x),
    subs: [...v.subs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, x]) => n + 'x' + x),
  })).sort((a, b) => (b.main + b.shadow) - (a.main + a.shadow)).slice(0, 200);
  // ped distance histogram + unnamed identity (one-shot diagnostics)
  const camPos = cam.matrixWorld ? cam.matrixWorld.elements : null;
  const pedDists = [], unnamed = [];
  scene.traverse((o) => {
    if (!o.isMesh || hidden(o)) return;
    const e = o.matrixWorld.elements;
    const px = e[12], py = e[13], pz = e[14];
    if (owner(o) === 'Pedestrians' && camPos) {
      const dx = px - camPos[12], dy = py - camPos[13], dz = pz - camPos[14];
      pedDists.push(Math.round(Math.hypot(dx, dy, dz)));
    }
    if (owner(o) === '(unnamed)') {
      const s = o.geometry ? (o.geometry.parameters ? JSON.stringify(o.geometry.parameters).slice(0, 40) : o.geometry.type) : '?';
      unnamed.push(o.name + '|' + o.type + '|' + s + '|pos(' + px.toFixed(0) + ',' + py.toFixed(0) + ',' + pz.toFixed(0) + ')');
    }
  });
  pedDists.sort((a, b) => a - b);
  return { calls: g['renderer'].info.render.calls, mainTotal, shadowTotal, sprites, rows,
           pedDists, unnamed: unnamed.slice(0, 16) };
};
`;

await page.addScriptTag({ content: KERNEL });

const rigs = [
  ['PLAZA', { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2], feet: [-42, 6.2] }],
  ['CART_CORNER', { pos: [10, 2.6, -5.2], at: [-24, 1.5, -0.5], feet: [4, -6.2] }],
];

for (const [name, rig] of rigs) {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = 0.05;
    window.__rigCam = { pos: d.pos, at: d.at };
    window.__frameLog = [];
  }, rig);
  await page.waitForTimeout(700);
  const x = await page.evaluate(() => window.__xray());
  const log = await page.evaluate(() => {
    const w = window.__frameLog;
    const s = [...w].sort((a, b) => a - b);
    return { n: w.length, min: s[0], med: s[Math.floor(s.length / 2)], max: s[s.length - 1] };
  });
  console.log(`\n=== ${name} — last-frame calls=${x.calls} | frames min/med/max ${log.min}/${log.med}/${log.max} (n=${log.n})`);
  console.log(`    frustum attribution: main=${x.mainTotal} shadow=${x.shadowTotal} sprites=${x.sprites}`);
  if (x.pedDists) console.log('    ped dists from cam:', JSON.stringify(x.pedDists));
  if (x.unnamed && x.unnamed.length) console.log('    unnamed:', x.unnamed.slice(0, 8).join('  '));
  for (const r of x.rows) {
    const subs = r.subs.length && (r.main + r.shadow) > 12 ? `  {${r.subs.join(' ')}}` : '';
    console.log(`  ${String(r.main).padStart(3)} main ${String(r.shadow).padStart(3)} shad  ${r.k.padEnd(16)} ${r.names.join(' ').slice(0, 60)}${subs}`);
  }
}
console.log(errors.length ? '\nPAGEERRORS: ' + errors.join(' | ') : '\nZERO page errors');
await browser.close();
server.close();
