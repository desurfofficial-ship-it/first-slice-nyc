/** One-shot: name every unnamed-ancestor mesh visible from the PLAZA rig. */
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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3000);

await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -42; g.player.capsule.y = 6.2; g.player.capsule.z = 0.05;
  g.cam.update = () => {};
  const c = g.cam.camera;
  c.position.set(-45.5, 2.6, 5.8);
  c.lookAt(-18, 1.5, 2);
});
await page.waitForTimeout(800);

const rows = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const out = [];
  const chain = (o) => {
    const names = [];
    let n = o.parent;
    while (n && n.type !== 'Scene') { names.push(n.name || `#${n.type}${n.children.length}`); n = n.parent; }
    return names.reverse().join('/');
  };
  scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    const hidden = (() => { let p = o; while (p) { if (p.visible === false) return true; p = p.parent; } return false; })();
    if (hidden) return;
    // unnamed = no named ancestor
    let top = o; while (top.parent && top.parent.type !== 'Scene') top = top.parent;
    if (top.name) return;
    const g = o.geometry;
    const p = g.attributes.position;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    out.push({
      name: o.name || '(no name)',
      parent: chain(o),
      kind: o.type,
      matKinds: mats.map((m) => `${m?.type}${m?.transparent ? ':T' : ''}${m?.map ? ':map' : ''}${m?.emissive?.getHexString?.() !== '000000' ? ':emi' : ''}`).join('+'),
      indexed: !!g.index,
      vt: p?.count ?? 0,
      pos: [o.getWorldPosition(new (o.position.constructor)()).x.toFixed(1), o.getWorldPosition(new (o.position.constructor)()).y.toFixed(1), o.getWorldPosition(new (o.position.constructor)()).z.toFixed(1)],
      cast: o.castShadow,
    });
  });
  return out.slice(0, 60);
});
for (const r of rows) console.log(`${r.kind.padEnd(12)} vt=${String(r.vt).padStart(6)} idx=${r.indexed ? 1 : 0}  ${r.matKinds?.padEnd(30)} ${r.pos.join(',')}  cast=${r.cast ? 1 : 0}  ${r.parent || '(scene child)'}  :: ${r.name}`);
await browser.close(); server.close();
