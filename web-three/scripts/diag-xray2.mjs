/**
 * Rig x-ray 2 — the honest per-owner cost of the two Kestrel gate rigs.
 *
 * Fixes vs diag-rig-xray:
 *  - the rig camera is applied through the same render-hook the gate probe
 *    uses, so the frustum listing matches the measured view EXACTLY;
 *  - ancestor visibility is respected (a mesh under a hidden group costs
 *    nothing — the old TOP list counted phantoms);
 *  - frustum culling is the real Gribb-Hartmann sphere test off the live
 *    camera matrices (no THREE import needed — plain math on .elements);
 *  - per rig: total calls, main-only calls (shadow map off), then the
 *    frustum-visible mesh list grouped by owner with names, casts, mats.
 *
 * Read-only diagnostic. node scripts/diag-xray2.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4589;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

// the gate probe's camera override — every frame, before the real render
await page.evaluate(() => {
  const g = window.__game;
  const r = g['renderer'];
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
});

const rigs = [
  ['PLAZA',       { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2],   feet: [-42, 6.2] }],
  ['CART_CORNER', { pos: [10, 2.6, -5.2],   at: [-24, 1.5, -0.5], feet: [4, -6.2] }],
];

for (const [name, rig] of rigs) {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = 0.05;
    window.__rigCam = { pos: d.pos, at: d.at };
  }, rig);
  await page.waitForTimeout(700);
  const calls = await page.evaluate(() => window.__game['renderer'].info.render.calls);

  // main-only: silence every shadow-casting light, let a frame settle
  const mainOnly = await page.evaluate(async () => {
    const g = window.__game;
    const lights = [];
    g.world.scene.traverse((o) => { if (o.isLight && o.castShadow) lights.push(o); });
    const saved = lights.map((l) => l.castShadow);
    for (const l of lights) l.castShadow = false;
    await new Promise((res) => setTimeout(res, 350));
    const calls = g['renderer'].info.render.calls;
    for (let i = 0; i < lights.length; i++) lights[i].castShadow = saved[i];
    await new Promise((res) => setTimeout(res, 120));
    return calls;
  });

  // the honest listing: right after a rendered frame with the rig camera
  const rows = await page.evaluate(() => {
    return new Promise((resolve) => {
      const g = window.__game;
      const r = g['renderer'];
      const orig = r.render.bind(r);
      r.render = (scene, camera) => {
        r.render = orig; // unhook after one shot
        const out = orig(scene, camera);
        // Gribb-Hartmann planes off the live camera (column-major elements)
        camera.updateMatrixWorld();
        const e = camera.projectionMatrix.elements;
        const mv = camera.matrixWorldInverse.elements;
        // m = P * V, column-major: m[col*4+row] = sum_k P[row+k*4] * V[k+col*4]
        const m = new Float32Array(16);
        for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) {
          let s = 0;
          for (let k = 0; k < 4; k++) s += e[row + k * 4] * mv[k + col * 4];
          m[col * 4 + row] = s;
        }
        const planes = [
          [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]],   // left
          [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]],   // right
          [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]],   // bottom
          [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]],   // top
          [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]],  // near
          [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]],  // far
        ];
        for (const p of planes) {
          const len = Math.hypot(p[0], p[1], p[2]) || 1;
          p[0] /= len; p[1] /= len; p[2] /= len; p[3] /= len;
        }
        const hidden = (o) => { let p = o; while (p) { if (p.visible === false) return true; p = p.parent; } return false; };
        // a mesh's cost family: the nearest named ancestor group; a direct
        // scene child reports its own name with trailing index digits stripped
        const owner = (o) => {
          let n = o.parent;
          while (n && (!n.name || n.name.length < 3)) n = n.parent;
          if (n && n.name !== 'Scene') return n.name;
          return (o.name || o.geometry?.type || o.type).replace(/[_]?\d+$/, '').slice(0, 22);
        };
        // column norms of matrixWorld for the radius scale
        const colLen = (e, c) => Math.hypot(e[c], e[c + 4], e[c + 8]);
        const groups = new Map();
        scene.traverse((o) => {
          if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) return;
          if (!o.visible || hidden(o)) return;
          const geo = o.geometry;
          if (!geo || !geo.attributes || !geo.attributes.position) return;
          if (!geo.boundingSphere) geo.computeBoundingSphere();
          const bs = geo.boundingSphere;
          const me = o.matrixWorld.elements;
          const cx = me[0] * bs.center.x + me[4] * bs.center.y + me[8] * bs.center.z + me[12];
          const cy = me[1] * bs.center.x + me[5] * bs.center.y + me[9] * bs.center.z + me[13];
          const cz = me[2] * bs.center.x + me[6] * bs.center.y + me[10] * bs.center.z + me[14];
          const rad = bs.radius * Math.max(colLen(me, 0), colLen(me, 1), colLen(me, 2));
          for (const p of planes) {
            if (p[0] * cx + p[1] * cy + p[2] * cz + p[3] + rad < 0) return; // culled
          }
          const k = owner(o);
          const ent = groups.get(k) ?? { m: 0, casts: 0, mats: new Set(), names: new Map() };
          ent.m++;
          if (o.castShadow) ent.casts++;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const mm of mats) if (mm) ent.mats.add(mm.uuid);
          const nm = o.name || o.geometry?.type || o.type;
          ent.names.set(nm, (ent.names.get(nm) ?? 0) + 1);
          groups.set(k, ent);
        });
        resolve([...groups.entries()].map(([k, v]) => ({ k, m: v.m, c: v.casts, mats: v.mats.size, names: [...v.names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6) }))
          .sort((a, b) => b.m - a.m).slice(0, 26));
      };
      requestAnimationFrame(() => requestAnimationFrame(() => {}));
      setTimeout(() => resolve(null), 1500); // safety
    });
  });

  console.log(`\n=== ${name}: total=${calls}  main-only=${mainOnly}  shadow≈${calls - mainOnly} ===`);
  if (rows) {
    let tot = 0;
    for (const r of rows) {
      tot += r.m;
      console.log(`  ${String(r.m).padStart(3)} m (${String(r.c).padStart(3)} cast, ${String(r.mats).padStart(2)} mat)  ${r.k}`);
      console.log(`        ${r.names.map(([n, x]) => `${n}x${x}`).join(', ').slice(0, 118)}`);
    }
    console.log(`  (${tot} frustum-visible meshes listed)`);
  } else console.log('  listing timed out');
}
console.log(errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'ZERO page errors');
await browser.close();
server.close();
