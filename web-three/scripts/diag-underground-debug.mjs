/** Debug the underground staging: what does the world actually do when the
 *  capsule lands mid-platform, and what does the REAL camera see? */
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
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

const state = await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -44; g.player.capsule.z = 13; g.player.capsule.y = -3.1;
  return null;
});
await page.waitForTimeout(1200);
const dbg = await page.evaluate(() => {
  const g = window.__game;
  const c = g.cam.camera;
  return {
    player: { x: g.player.capsule.x, y: g.player.capsule.y, z: g.player.capsule.z },
    underground: g.world.subway.underground,
    stationLit: g.world.subway.groups.stationA.visible,
    terminalHidden: (() => { let v = null; g.world.scene.traverse((o) => { if (o.name === 'Bldg_N_West') v = o.visible; }); return v; })(),
    cam: { x: +c.position.x.toFixed(2), y: +c.position.y.toFixed(2), z: +c.position.z.toFixed(2) },
    interiorMode: g.cam.interiorMode,
    calls: g.renderer.info.render.calls,
    dollhouseOn: g.world.dollhouseOn,
    shellHasBldg: (() => { let n = 0; for (const m of g.world.terminalShell) if (m.name === 'Bldg_N_West') n++; return n; })(),
    shellSize: g.world.terminalShell.length,
    shellVisibleCount: g.world.terminalShell.filter((m) => m.visible).length,
  };
});
console.log(JSON.stringify(dbg, null, 1));
await page.screenshot({ path: 'shots/underground-debug-realcamera.png' });
await browser.close();
server.close();
