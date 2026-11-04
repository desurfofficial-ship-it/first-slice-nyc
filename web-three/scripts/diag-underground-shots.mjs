/**
 * diag-underground-shots — the REAL-lens evidence for the underground
 * shadow economy (docs/51 B13). Descends the stairwell the way the game
 * does (probe-subway's law), lets the boom camera settle into interiorMode,
 * then shoots the same framed moment three ways:
 *
 *   base      — today's law (SHADOW_HALF 35)
 *   half18    — the underground economy (SHADOW_HALF 18)
 *   restored  — back to 35 (the restore law must be bit-for-bit)
 *
 * The 1-Second Law read: pillar / rider / player shadows on the platform
 * must survive half18 (the platform's own casters sit within ~15 m); only
 * far-street shadow casters drop out of the map.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4601;
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

const sleep = (ms) => page.waitForTimeout(ms);

/** Walk down the stairs like the probe does, end mid-platform. */
const descend = async () => {
  await page.evaluate(() => {
    const g = window.__game;
    g.player.capsule.x = -47.2; g.player.capsule.z = 5.6; g.player.capsule.y = 0.1;
    // face the stairs (south → north is +z); the camera settles behind
    g.cam.camYaw = Math.PI; // look north
    g.cam.snapBehind(g.player.capsule);
  });
  await sleep(400);
  // walk north (toward +z): W with the camera facing north
  await page.evaluate(() => window.__game.input.injectKey('KeyW', true));
  await sleep(2600);
  await page.evaluate(() => window.__game.input.injectKey('KeyW', false));
  await sleep(600);
  // settle on the fare pocket, mid-platform
  await page.evaluate(() => {
    const g = window.__game;
    if (g.player.capsule.y > -0.6) { g.player.capsule.x = -44.6; g.player.capsule.z = 9.0; g.player.capsule.y = -3.1; }
  });
  await sleep(2500); // the boom settles into interiorMode
};

/** Apply/restore the lever and read the state. */
const setHalf = (half) => page.evaluate((h) => {
  const g = window.__game;
  const sm = g.world.sun.shadow;
  sm.camera.left = -h; sm.camera.right = h; sm.camera.top = h; sm.camera.bottom = -h;
  sm.camera.updateProjectionMatrix();
  g.renderer.shadowMap.needsUpdate = true;
  return { playerY: g.player.capsule.y, under: g.world.subway.underground, camY: +g.cam.camera.position.y.toFixed(2) };
}, half);

await descend();
const st = await setHalf(35);
console.log('staged:', JSON.stringify(st));
await sleep(400);
await page.screenshot({ path: 'shots/underground-lens-base.png' });
let calls = await page.evaluate(() => window.__game.renderer.info.render.calls);
console.log('base calls:', calls);

await setHalf(18);
await sleep(400);
await page.screenshot({ path: 'shots/underground-lens-half18.png' });
calls = await page.evaluate(() => window.__game.renderer.info.render.calls);
console.log('half18 calls:', calls);

await setHalf(35);
await sleep(400);
await page.screenshot({ path: 'shots/underground-lens-restored.png' });
calls = await page.evaluate(() => window.__game.renderer.info.render.calls);
console.log('restored calls:', calls);

await browser.close();
server.close();
