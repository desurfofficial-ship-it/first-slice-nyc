/**
 * Scene census — walks the live scene graph and aggregates draw-call
 * contributors so the perf pass can target the real offenders.
 * Prints: top meshes by material+geometry signature, and per-subtree counts.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4581;

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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3000);

const census = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const byMat = new Map();   // material name/uuid → {count, tris, name}
  const byKind = new Map();  // top-level subtree name → mesh count
  let total = 0, tris = 0, visible = 0;

  const rootName = (o) => {
    let top = o;
    while (top.parent && top.parent.type !== 'Scene') top = top.parent;
    return top.name || top.type || '(unnamed)';
  };

  scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) return;
    total++;
    if (o.visible === false) return;
    visible++;
    const g = o.geometry;
    const tri = g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3;
    tris += tri;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      const key = (m.name || m.type) + '#' + (m.uuid?.slice(0, 8) ?? '?');
      const e = byMat.get(key) ?? { count: 0, tris: 0, label: m.name || m.type };
      e.count++; e.tris += tri;
      byMat.set(key, e);
    }
    const kind = rootName(o);
    byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
  });

  const mats = [...byMat.entries()].map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.count - a.count).slice(0, 30);
  const kinds = [...byKind.entries()].map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 25);
  // per scene-child breakdown + geo signatures inside the biggest ones
  const children = [];
  const geoSig = (g) => {
    const p = g.attributes.position;
    return `${g.type ?? 'Geo'} vt=${p?.count ?? 0} idx=${g.index?.count ?? 0}`;
  };
  for (const c of scene.children) {
    let count = 0; const sigs = new Map(); const names = new Map();
    c.traverse((o) => {
      if (o.isMesh && o.visible !== false) {
        count++;
        const s = geoSig(o.geometry);
        sigs.set(s, (sigs.get(s) ?? 0) + 1);
        const n = (o.name || c.name || '?') + '|' + s;
        names.set(n, (names.get(n) ?? 0) + 1);
      }
    });
    if (count > 0) children.push({ name: c.name || c.type || '(child)', count,
      top: [...names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6) });
  }
  children.sort((a, b) => b.count - a.count);
  return { total, visible, tris: Math.round(tris), mats, kinds, children: children.slice(0, 14) };
});

console.log(`scene meshes: total=${census.total} visible=${census.visible} tris=${census.tris}`);
console.log('\nTOP MATERIALS (draw-call contributors):');
for (const m of census.mats) console.log(`  ${String(m.count).padStart(4)} draws  ${String(m.tris).padStart(7)} tris  ${m.label}  (${m.key})`);
console.log('\nTOP SUBTREES:');
for (const k of census.kinds) console.log(`  ${String(k.count).padStart(4)} meshes  ${k.name}`);
console.log('\nSCENE CHILDREN (meshes | shared geometry signatures):');
for (const c of census.children) {
  console.log(`  ${String(c.count).padStart(4)}  ${c.name}`);
  for (const [sig, n] of c.top) console.log(`          x${n}  ${sig}`);
}
console.log(errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'ZERO page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
