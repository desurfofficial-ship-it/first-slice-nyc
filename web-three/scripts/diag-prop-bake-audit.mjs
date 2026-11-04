// B13 diagnostic — why do the small props escape the static bake?
// Boots the built game, waits for the GLB upgrades to settle, then reports
// for every candidate prop mesh: indexed geometry? material class? flags?
// parent chain? — the exact law that keeps each out of the district tiles.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(3500); // GLB fetches settle

const report = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const want = /^(Streetlight_|Mailbox|Trashcan|TrashCan|Streetlamp|car_taxi|car_sedan|Hydrant_|Hydrant|RecycleBin|Squirrel)/;
  const targets = [];
  scene.traverse((o) => {
    if (!o.name || !want.test(o.name) || targets.some((t) => t.name === o.name)) return;
    const entry = { name: o.name, type: o.type, nChildren: o.children.length, meshes: [] };
    o.traverse((m) => {
      if (!m.isMesh || m === o) return;
      entry.meshes.push({
        mat: m.material ? m.material.type : '?',
        mapped: !!(m.material && m.material.map),
        emissive: m.material && m.material.emissive ? m.material.emissive.getHexString() : '-',
        cast: m.castShadow, recv: m.receiveShadow,
        idx: !!(m.geometry && m.geometry.index),
        parent: m.parent ? (m.parent.name || m.parent.type) : '?',
      });
    });
    targets.push(entry);
  });
  let bakeBatches = 0;
  scene.traverse((o) => { if (o.isMesh && /^StaticBake_/.test(o.name)) bakeBatches++; });
  return { targets, bakeBatches };
});

console.log(JSON.stringify(report, null, 1));
if (errors.length) console.log('PAGE_ERRORS:', errors);
await browser.close();
server.close();
