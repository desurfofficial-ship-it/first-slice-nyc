/** Does the census PLATFORM_A staging hold the underground state, or does
 *  physics eject the capsule? Reads state 700 ms after the teleport. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4602;
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

const probe = async (label, feet) => {
  await page.evaluate((f) => {
    const g = window.__game;
    g.player.capsule.x = f[0]; g.player.capsule.z = f[1]; g.player.capsule.y = f[2];
  }, feet);
  await page.waitForTimeout(700);
  const s = await page.evaluate(() => {
    const g = window.__game;
    const smc = g.world.sun.shadow.camera;
    return {
      y: +g.player.capsule.y.toFixed(2),
      under: g.world.subway.underground,
      half: +smc.right.toFixed(2),
      calls: g.renderer.info.render.calls,
    };
  });
  console.log(label.padEnd(14), JSON.stringify(s));
};

await probe('census-feet', [-40, -3.2, -3.2]);   // the diag's staging (z=-3.2, y=-3.2)
await probe('fare-pocket', [-44.6, 9.0, -3.1]);  // a real platform floor spot
await probe('census-again', [-40, -3.2, -3.2]);
await browser.close();
server.close();
