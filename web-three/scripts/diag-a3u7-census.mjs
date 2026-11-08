/**
 * diag-a3u7-census — one-off: identify WHICH band rows differ between two
 * census snaps 1.5 s apart (the u7 pre/post pair showed census instability
 * under the new shipped-street regions; this names the movers).
 * Usage: node scripts/diag-a3u7-census.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4598;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));

const DYNAMIC_RE = /BUS_|BUS0|car_taxi|Pigeon|Squirrel|LeafDrift|Steam|Pedestrians|Rosa|Idris|TheKid|TheStranger|TheFamiliar|Sal|SUB_Root/i;
const REGIONS = [
  ['ss-north', -49, 49.5, 4, 19.5],
  ['ss-south', -49, 46, -19.5, -4],
];

const CENSUS_FN = async ([dynRe, regions]) => {
  const scene = window.__game.world.scene;
  const DYN = new RegExp(dynRe[0], dynRe[1]);
  const dynamicAncestor = (o) => {
    for (let p = o.parent; p !== null; p = p.parent) if (p.name && DYN.test(p.name)) return true;
    return false;
  };
  const rows = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isInstancedMesh) return;
    if (o.name && DYN.test(o.name)) return;
    if (dynamicAncestor(o)) return;
    const g = o.geometry;
    if (!g || !g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox;
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const cxl = (bb.min.x + bb.max.x) / 2, cyl = (bb.min.y + bb.max.y) / 2, czl = (bb.min.z + bb.max.z) / 2;
    const hx = ((bb.max.x - bb.min.x) / 2) * o.scale.x + 0.001;
    const hy = ((bb.max.y - bb.min.y) / 2) * o.scale.y + 0.001;
    const hz = ((bb.max.z - bb.min.z) / 2) * o.scale.z + 0.001;
    const wx = e[12] + cxl * o.scale.x, wy = e[13] + cyl * o.scale.y, wz = e[14] + czl * o.scale.z;
    let band = null;
    for (const [nm, x0, x1, z0, z1] of regions) {
      if (wx + hx >= x0 && wx - hx <= x1 && wz + hz >= z0 && wz - hz <= z1) { band = nm; break; }
    }
    if (!band) return;
    const chain = [];
    for (let p = o.parent; p !== null; p = p.parent) chain.unshift(p.name || '(anon)');
    rows.push({
      band, name: o.name || '(unnamed)',
      chain: chain.join('>'),
      pos: [+wx.toFixed(4), +wy.toFixed(4), +wz.toFixed(4)],
      dims: [+(bb.max.x - bb.min.x).toFixed(4), +(bb.max.y - bb.min.y).toFixed(4), +(bb.max.z - bb.min.z).toFixed(4)],
      verts: g.attributes.position ? g.attributes.position.count : 0,
    });
  });
  rows.sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
  return rows;
};

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(8000);

const ARGS = [[DYNAMIC_RE.source, DYNAMIC_RE.flags], REGIONS];
const a = await page.evaluate(CENSUS_FN, ARGS);
await page.waitForTimeout(1500);
const b = await page.evaluate(CENSUS_FN, ARGS);
await page.waitForTimeout(1500);
const c = await page.evaluate(CENSUS_FN, ARGS);

const keyOf = (r) => JSON.stringify(r);
const setA = new Map(a.map((r) => [keyOf(r), 1]));
const setB = new Map(b.map((r) => [keyOf(r), 1]));
const setC = new Map(c.map((r) => [keyOf(r), 1]));
const all = new Map([...setA, ...setB, ...setC]);
const volatile = [];
for (const k of all.keys()) {
  if (!(setA.has(k) && setB.has(k) && setC.has(k))) volatile.push(JSON.parse(k));
}
console.log(`rows: a=${a.length} b=${b.length} c=${c.length}; stable=${a.length - volatile.length} VOLATILE=${volatile.length}`);
const byName = new Map();
for (const r of volatile) {
  const k = `${r.band} :: ${r.name} :: ${r.chain}`;
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(JSON.stringify(r));
}
for (const [k, vs] of byName) console.log('VOLATILE', k, '(' + vs.length + ' variants)\n  ', vs.slice(0, 3).join('\n  '));

await browser.close();
server.close();
if (errors.length) console.error('PAGE ERRORS:', errors.slice(0, 5));
process.exit(0);
