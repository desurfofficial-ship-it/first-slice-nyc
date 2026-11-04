/**
 * Flat dump — every frustum-visible, actually-shown mesh at the two Kestrel
 * rigs with its full ancestor chain, so an unnamed family can be identified.
 * Read-only. node scripts/diag-flat-dump.mjs [RIG]
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4591;
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
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

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

const rigs = {
  PLAZA: { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2], feet: [-42, 6.2] },
  CART_CORNER: { pos: [10, 2.6, -5.2], at: [-24, 1.5, -0.5], feet: [4, -6.2] },
};
const which = process.argv[2] ?? 'CART_CORNER';
const rig = rigs[which];

await page.evaluate((d) => {
  const g = window.__game;
  g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = 0.05;
  window.__rigCam = { pos: d.pos, at: d.at };
}, rig);
await page.waitForTimeout(700);

const rows = await page.evaluate(() => {
  return new Promise((resolve) => {
    const g = window.__game;
    const r = g['renderer'];
    const orig = r.render.bind(r);
    r.render = (scene, camera) => {
      r.render = orig;
      const out = orig(scene, camera);
      camera.updateMatrixWorld();
      const e = camera.projectionMatrix.elements;
      const mv = camera.matrixWorldInverse.elements;
      const m = new Float32Array(16);
      for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += e[row + k * 4] * mv[k + col * 4];
        m[col * 4 + row] = s;
      }
      const planes = [
        [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]],
        [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]],
        [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]],
        [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]],
        [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]],
        [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]],
      ];
      for (const p of planes) {
        const len = Math.hypot(p[0], p[1], p[2]) || 1;
        p[0] /= len; p[1] /= len; p[2] /= len; p[3] /= len;
      }
      const hidden = (o) => { let p = o; while (p) { if (p.visible === false) return true; p = p.parent; } return false; };
      const chain = (o) => {
        const parts = [];
        let n = o.parent;
        while (n && n.type !== 'Scene') { parts.unshift(n.name || n.type.slice(0, 4)); n = n.parent; }
        return parts.join('/');
      };
      const colLen = (el, c) => Math.hypot(el[c], el[c + 4], el[c + 8]);
      const list = [];
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
          if (p[0] * cx + p[1] * cy + p[2] * cz + p[3] + rad < 0) return;
        }
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        list.push({
          name: o.name || '(noname)',
          ch: chain(o),
          cast: o.castShadow ? 1 : 0,
          trans: mats.some((mm) => mm && mm.transparent) ? 1 : 0,
          map: mats.some((mm) => mm && mm.map) ? 1 : 0,
          inst: o.isInstancedMesh ? o.count : 0,
        });
      });
      list.sort((a, b) => a.ch.localeCompare(b.ch) || a.name.localeCompare(b.name));
      resolve(list);
    };
    setTimeout(() => resolve(null), 1500);
  });
});

console.log(`=== ${which}: ${rows ? rows.length : '?'} frustum-visible objects ===`);
for (const r of rows ?? []) {
  console.log(`${String(r.cast)}${r.trans ? 'T' : ' '}${r.map ? 'M' : ' '}${r.inst ? 'I' + r.inst : '  '} ${r.name.padEnd(26)} ${r.ch}`);
}
await browser.close();
server.close();
