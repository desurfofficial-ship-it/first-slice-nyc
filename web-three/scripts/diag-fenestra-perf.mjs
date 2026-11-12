/** perf A/B — the fenestra cost at the street rig: avg frame time + draw
 *  calls with the windows ON vs OFF (?fenestra=0), same build, same rig. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4641;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) { res.writeHead(200, {'content-type': MIME[extname(file)] ?? 'application/octet-stream'}); res.end(readFileSync(file)); }
  else { res.writeHead(200, {'content-type': 'text/html'}); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

async function measure(enabled) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://localhost:${PORT}/?fx=off&tod=19:45${enabled ? '' : '&fenestra=0'}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const g = window.__game;
    const p = g.player.capsule; p.x = 4; p.z = -2; p.y = 0.05;
    g.cam.update = () => {};
    g.cam.camera.position.set(2, 4.2, -6);
    g.cam.camera.lookAt(14, 7, 14);
  });
  await page.waitForTimeout(600);
  const r = await page.evaluate(async () => {
    // sample the game's own rAF loop for ~6 s (the RAF delta IS the frame
    // time; the renderer.info census rides the last frame)
    const g = window.__game;
    const deltas = [];
    let last = performance.now();
    const t0 = last;
    while (performance.now() - t0 < 6000) {
      await new Promise((res) => requestAnimationFrame(res));
      const now = performance.now();
      if (now - last < 200) deltas.push(now - last);
      last = now;
    }
    deltas.sort((a, b) => a - b);
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    return { avg: +avg.toFixed(2), p95: +deltas[Math.floor(deltas.length * 0.95)].toFixed(2),
      fps: +(1000 / avg).toFixed(1),
      calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
  });
  await page.close();
  return r;
}
const on = await measure(true);
const off = await measure(false);
console.log(`fenestra ON : avg ${on.avg} ms | p95 ${on.p95} ms | ${on.calls} calls | ${on.tris} tris`);
console.log(`fenestra OFF: avg ${off.avg} ms | p95 ${off.p95} ms | ${off.calls} calls | ${off.tris} tris`);
console.log(`delta: ${(on.avg - off.avg).toFixed(2)} ms avg, ${on.calls - off.calls} draw calls, ${on.tris - off.tris} tris`);
await browser.close(); server.close();
