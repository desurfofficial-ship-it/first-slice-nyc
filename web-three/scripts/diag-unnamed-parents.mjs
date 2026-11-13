/**
 * One-shot (docs/51 B13): who are the UNNAMED groups in the scene graph?
 * Walks the live scene and prints every unnamed Group with its parent chain,
 * child kinds and position — the companion to diag-unnamed-xray.mjs (which
 * lists the unnamed MESHES). Read-only diagnostic; serves dist/.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4591;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(existsSync(file) && !file.endsWith('/') ? readFileSync(file) : readFileSync(join(DIST, 'index.html')));
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(1500);
const rows = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const out = [];
  const walk = (o, path) => {
    for (const c of o.children) {
      if (!c.name && c.type === 'Group') {
        out.push({ path: path + '/Group#' + c.uuid.slice(0, 5), n: c.children.length,
          kinds: c.children.map((m) => m.type + (m.isInstancedMesh ? ':inst' : '')).join(','),
          pos: [c.position.x.toFixed(1), c.position.y.toFixed(1), c.position.z.toFixed(1)] });
      }
      walk(c, path + '/' + (c.name || c.type));
    }
  };
  walk(scene, '');
  return out.slice(0, 40);
});
for (const r of rows) console.log(`${r.n} kids  pos(${r.pos})  ${r.path}  [${r.kinds}]`);
await browser.close(); server.close();
