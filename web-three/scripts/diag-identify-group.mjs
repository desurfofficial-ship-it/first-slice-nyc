/**
 * Identify the top-level scene children that still carry per-mesh draws:
 * every child printed with its mesh count, then a drill-down of any
 * anonymous 'Group' or BUS_M121 descendants (name, geo type, color, world
 * pos, cast/receive). For the B13 fusion round 2.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

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

const out = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const rows = [];
  for (const c of scene.children) {
    let n = 0;
    c.traverse((o) => { if (o.isMesh && o.visible !== false) n++; });
    if (n > 0) rows.push({ name: c.name || `(anon ${c.type})`, n, pos: c.position.toArray().map((v) => +v.toFixed(1)) });
  }
  rows.sort((a, b) => b.n - a.n);

  const drill = [];
  const drillInto = (root, label) => {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      drill.push({
        g: label, name: o.name || '(mesh)', parent: o.parent?.name || '?',
        geo: o.geometry?.type ?? '?',
        hex: mat?.color ? '#' + mat.color.getHexString() : '?',
        map: mat?.map ? 1 : 0, transp: mat?.transparent ? 1 : 0,
        cast: o.castShadow ? 1 : 0, recv: o.receiveShadow ? 1 : 0,
        p: o.position.toArray().map((v) => +v.toFixed(1)),
      });
    });
  };
  for (const c of scene.children) {
    const nm = c.name || '';
    if (nm === 'BUS_M121' || (c.type === 'Group' && !nm)) drillInto(c, nm || 'anon-Group');
  }
  return { rows: rows.slice(0, 30), drill };
});
console.log('TOP-LEVEL children (meshes):');
for (const r of out.rows) console.log(`  ${String(r.n).padStart(4)}  ${r.name}  @${JSON.stringify(r.pos)}`);
console.log(`\nDRILL (${out.drill.length} meshes):`);
for (const d of out.drill) {
  console.log(`  [${d.g}] ${d.name} (p:${d.parent}) ${d.geo} ${d.hex} map${d.map} t${d.transp} c${d.cast} r${d.recv} @${JSON.stringify(d.p)}`);
}
console.log('PAGEERRORS', errors.length);
await browser.close(); server.close();
