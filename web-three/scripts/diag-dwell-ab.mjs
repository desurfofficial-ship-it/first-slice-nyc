/** The honest same-pose A/B for the PLATFORM_A rig correction + the
 *  underground economy: the corrected dwell rig measured with the street
 *  half (35, the pre-economy law) vs the underground half (18, shipped). */
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  const r = window.__game.renderer;
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
});

const RIG = { pos: [-41.6, 3.4, 5.6], at: [-44.6, -1.9, 9.0], feet: [-44.6, 9.0, -3.1] };
const measure = async (half) => {
  await page.evaluate(({ rig, half }) => {
    const g = window.__game;
    g.player.capsule.x = rig.feet[0]; g.player.capsule.z = rig.feet[1]; g.player.capsule.y = rig.feet[2];
    window.__rigCam = { pos: rig.pos, at: rig.at };
    const sm = g.world.sun.shadow;
    sm.camera.left = -half; sm.camera.right = half; sm.camera.top = half; sm.camera.bottom = -half;
    sm.camera.updateProjectionMatrix();
    g.renderer.shadowMap.needsUpdate = true;
  }, { rig: RIG, half });
  await page.waitForTimeout(800);
  const s = await page.evaluate(() => {
    const g = window.__game;
    return { calls: g.renderer.info.render.calls, under: g.world.subway.underground, half: +g.world.sun.shadow.camera.right.toFixed(1) };
  });
  console.log(`half ${half}:`, JSON.stringify(s));
  return s.calls;
};
const before = await measure(35);
const after = await measure(18);
const again = await measure(35);
console.log(`SAME-POSE A/B: ${before} → ${after} (−${(100 * (before - after) / before).toFixed(0)}%), restore check ${again}`);
await browser.close();
server.close();
