import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4621;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 300)));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
await page.waitForTimeout(2000);
const dump = await page.evaluate(() => {
  const g = window.__game;
  const outer = g.world.scene.getObjectByName('CJN_Group');
  const inner = g.world.catalpa.group;
  const names = [];
  inner.traverse((o) => { if (o.isMesh) names.push(`${o.name} [${o.geometry?.type ?? '?'}]`); });
  return {
    outerName: outer?.name, outerKids: outer?.children.length,
    innerName: inner.name, innerVisible: inner.visible, outerVisible: outer?.visible,
    innerMeshCount: names.length,
    sample: names.slice(0, 30),
    massCount: names.filter((n) => /_Mass/.test(n)).length,
    batchCount: names.filter((n) => /Batch|bake/i.test(n)).length,
  };
});
console.log(JSON.stringify(dump, null, 1));
await browser.close(); process.exit(0);
