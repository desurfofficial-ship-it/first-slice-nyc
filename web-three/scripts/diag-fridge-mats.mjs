/** What did the fridge GLB upgrade actually land? (materials + meshes) */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4603;
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
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(4000);
const info = await page.evaluate(async () => {
  const g = window.__game;
  await new Promise((r) => setTimeout(r, 1500)); // the async upgrade
  const w = g.world;
  const out = { upgraded: w.glbUpgrades?.get?.('fridge_bodega') ?? null, meshes: [] };
  const wrapper = w.scene.getObjectByName('Fridge_Bodega_glb') || w.scene.getObjectByName('Fridge_Bodega');
  if (wrapper) {
    wrapper.traverse((o) => {
      if (o.isMesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        out.meshes.push({
          name: o.name || '(anon)',
          kids: undefined,
          mats: mats.map((m) => ({
            type: m.type,
            color: m.color ? '#' + m.color.getHexString() : null,
            transparent: m.transparent,
            opacity: m.opacity,
            vertexColors: !!m.vertexColors,
            map: !!m.map,
          })),
        });
      }
    });
  }
  out.wrapperName = wrapper ? wrapper.name : null;
  return out;
});
console.log(JSON.stringify(info, null, 1));
await browser.close(); server.close();
