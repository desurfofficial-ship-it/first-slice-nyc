/**
 * Which world object actually stands between the camera and the player while
 * walking the north sidewalk? Raycasts the LIVE scene along the exact
 * camera→focus sight line every half-second during a walk and logs every hit
 * closer than the player. No asserts — this names the occluder.
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
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const cast = () => page.evaluate(() => {
  const g = window.__game;
  const c = g.cam.camera;
  const p = g.player.capsule;
  const origin = c.position.clone();
  const focus = new (origin.constructor.prototype.constructor === Object ? Object : Object)();
  // three is module-scoped; use the camera's own lookAt target instead:
  // aim at the player focus point we know update() uses (y + 1.2).
  const dir = new (c.position.clone().constructor)(p.x - origin.x, p.y + 1.2 - origin.y, p.z - origin.z);
  const dist = dir.length();
  dir.normalize();
  const rc = g.world.raycaster ?? null;
  // build a raycaster via the scene's raycaster if exposed, else construct through THREE on window
  const RC = window.__game.THREE_Raycaster;
  const ray = new RC(origin, dir, 0.5, dist - 0.4);
  const hits = ray.intersectObjects(g.world.scene.children, true);
  const out = [];
  for (const h of hits.slice(0, 8)) {
    let o = h.object; let chain = [];
    while (o) { chain.push(o.name || o.type); o = o.parent; }
    out.push({
      d: +h.distance.toFixed(2),
      type: h.object.type,
      name: h.object.name || '(anon)',
      chain: chain.slice(0, 4).join('<'),
      at: [+h.point.x.toFixed(1), +h.point.y.toFixed(1), +h.point.z.toFixed(1)],
    });
  }
  return { player: [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)], cam: [+origin.x.toFixed(1), +origin.y.toFixed(1), +origin.z.toFixed(1)], dist: +dist.toFixed(2), hits: out };
});

// need THREE's Raycaster on window — check what the game exposes
const hasRC = await page.evaluate(() => {
  const g = window.__game;
  return { hasThreeRC: !!g.constructor, keys: Object.keys(g).slice(0, 40) };
});
console.log('game keys:', JSON.stringify(hasRC));

// If no Raycaster is reachable, fall back: sample points along the sight line
// and report which meshes' bounding spheres contain them.
const sampleCast = () => page.evaluate(() => {
  const g = window.__game;
  const c = g.cam.camera;
  const p = g.player.capsule;
  const o = c.position.clone();
  const target = { x: p.x, y: p.y + 1.2, z: p.z };
  const hits = [];
  const N = 60;
  const seen = new Set();
  for (let i = 1; i < N; i++) {
    const t = i / N;
    const x = o.x + (target.x - o.x) * t;
    const y = o.y + (target.y - o.y) * t;
    const z = o.z + (target.z - o.z) * t;
    const v = o.constructor;
    const pt = new v(x, y, z);
    g.world.scene.traverse((obj) => {
      if (!obj.isMesh || obj === g.player.group) return;
      if (!obj.geometry?.boundingSphere) obj.geometry.computeBoundingSphere();
      const wp = obj.getWorldPosition(new v());
      const bs = obj.geometry.boundingSphere;
      const scale = obj.getWorldScale(new v());
      const r = bs.radius * Math.max(scale.x, scale.y, scale.z);
      const dx = wp.x - pt.x, dy = wp.y - pt.y, dz = wp.z - pt.z;
      if (dx * dx + dy * dy + dz * dz < r * r) {
        const id = obj.uuid;
        if (seen.has(id)) return;
        seen.add(id);
        let par = obj, chain = [];
        while (par && chain.length < 3) { chain.push(par.name || par.type); par = par.parent; }
        hits.push({
          t: +t.toFixed(2), at: [+pt.x.toFixed(1), +pt.y.toFixed(1), +pt.z.toFixed(1)],
          mesh: obj.name || '(anon)', chain: chain.join('<'),
          center: [+wp.x.toFixed(1), +wp.y.toFixed(1), +wp.z.toFixed(1)], r: +r.toFixed(2),
        });
      }
    });
  }
  return { cam: [+o.x.toFixed(1), +o.y.toFixed(1), +o.z.toFixed(1)], player: [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)], hits };
});

// walk east and sample every ~0.7s
await page.keyboard.down('KeyD');
for (let i = 0; i < 6; i++) {
  await wait(700);
  const r = await sampleCast();
  console.log('t+' + (i * 0.7).toFixed(1) + 's', 'cam', r.cam, 'player', r.player, 'hits:', JSON.stringify(r.hits.slice(0, 5)));
}
await page.keyboard.up('KeyD');

await browser.close();
server.close();
