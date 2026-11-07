/** Proper-distance car shots: broadside + three-quarter + taxi on the avenue. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/audit', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4663;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file) ?? ''] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(4000);
const park = async ({ px, pz, cam, at }, shot) => {
  await page.evaluate(async ({ px, pz, cam, at }) => {
    const g = window.__game;
    if (typeof g.dismissPostcard === 'function') g.dismissPostcard();
    const p = g.player.capsule;
    p.x = px; p.z = pz; p.y = 0.05;
    g.world.update(1 / 60, p);
    await new Promise((res) => setTimeout(res, 320));
    g.world.update(1 / 60, p);
    g.cam.update = () => {};
    g.cam.camera.position.set(cam[0], cam[1], cam[2]);
    g.cam.camera.lookAt(at[0], at[1], at[2]);
  }, { px, pz, cam, at });
  await page.waitForTimeout(240);
  await page.screenshot({ path: join(OUT, shot) });
  console.log(shot);
  await page.evaluate(() => { delete window.__game.cam.update; });
};
// sedan broadside (camera on the sidewalk, car 4 m away)
await park({ px: 24, pz: 4.2, cam: [24.0, 1.65, 6.6], at: [24.0, 0.7, 3.0] }, 'v3_sedan_broadside.png');
// sedan three-quarter front-left (nose faces west after yaw π)
await park({ px: 20.8, pz: 4.4, cam: [21.6, 1.7, 6.0], at: [24.3, 0.7, 2.9] }, 'v3_sedan_3q.png');
// sedan rear three-quarter
await park({ px: 27.4, pz: 4.6, cam: [27.0, 1.7, 6.4], at: [23.6, 0.7, 2.8] }, 'v3_sedan_rear3q.png');
// taxi hunting: shoot the avenue from the curb until a taxi passes (3 tries)
for (let i = 0; i < 3; i++) await park({ px: 12, pz: 4.0, cam: [13.0, 1.8, 5.2], at: [20.0, 0.8, 0.6] }, `v3_taxi_pass_${i}.png`);
await browser.close(); server.close();
