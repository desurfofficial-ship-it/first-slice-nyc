/**
 * Shadow-frontier pricing (docs/51 B13 — "next honest frontier").
 *
 * Measures, at the two Kestrel rigs, the shadow pass's response to:
 *   1. SHADOW_HALF 35 -> 30 and -> 26 (the box shrinks; the dusk fade
 *      distance trade)
 *   2. shadow.camera.far 160 -> 120 (tighter light frustum)
 *   3. the figure-shadow ceiling: every person rig's casts off (an upper
 *      bound for ANY figure-shadow lever, e.g. a 2-draw shadow proxy)
 * Each step restores before the next. Main pass is measured once per rig
 * (sun off) as the reference; shadow price = total - main.
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
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  const g = window.__game;
  const r = g['renderer'];
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
});

const rigs = [
  ['PLAZA',       { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2],    feet: [-42, 6.2] }],
  ['CART_CORNER', { pos: [10, 2.6, -5.2],   at: [-24, 1.5, -0.5], feet: [4, -6.2] }],
];

const calls = async () => {
  await new Promise((r) => setTimeout(r, 150));
  return page.evaluate(() => window.__game['renderer'].info.render.calls);
};

for (const [name, rig] of rigs) {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = 0.05;
    window.__rigCam = { pos: d.pos, at: d.at };
  }, rig);
  await page.waitForTimeout(700);

  const base = await calls();

  const sunOff = await page.evaluate(async () => {
    const g = window.__game;
    g.world.sun.castShadow = false;
    await new Promise((r) => setTimeout(r, 150));
    const v = g['renderer'].info.render.calls;
    g.world.sun.castShadow = true;
    return v;
  });

  const withHalf = async (h) => page.evaluate(async (half) => {
    const g = window.__game;
    const sc = g.world.sun.shadow.camera;
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
    sc.updateProjectionMatrix();
    await new Promise((r) => setTimeout(r, 150));
    const v = g['renderer'].info.render.calls;
    sc.left = -35; sc.right = 35; sc.top = 35; sc.bottom = -35;
    sc.updateProjectionMatrix();
    return v;
  }, h);

  const h30 = await withHalf(30);
  const h26 = await withHalf(26);

  const far120 = await page.evaluate(async () => {
    const g = window.__game;
    const sc = g.world.sun.shadow.camera;
    const old = sc.far;
    sc.far = 120; sc.updateProjectionMatrix();
    await new Promise((r) => setTimeout(r, 150));
    const v = g['renderer'].info.render.calls;
    sc.far = old; sc.updateProjectionMatrix();
    return v;
  });

  const figureCeil = await page.evaluate(async () => {
    const g = window.__game;
    const RE = /^(Pedestrians|Rosa|Sal|Player|TheStranger|TheFamiliar|BUS_Driver|Idris|TheKid|TheKidDown)$/;
    const touched = [];
    g.world.scene.traverse((o) => {
      if ((o).isMesh && o.castShadow) {
        for (let p = o; p; p = p.parent) {
          if (RE.test(p.name || '')) { touched.push(o); o.castShadow = false; break; }
        }
      }
    });
    await new Promise((r) => setTimeout(r, 150));
    const v = g['renderer'].info.render.calls;
    for (const o of touched) o.castShadow = true;
    return { calls: v, n: touched.length };
  });

  const shadow = base - sunOff;
  console.log(`${name}: total=${base} main=${sunOff} shadow=${shadow} | HALF30 ${h30 - sunOff}  HALF26 ${h26 - sunOff}  far120 ${far120 - sunOff}  figures-off ${figureCeil.calls - sunOff} (${figureCeil.n} casts)`);
}

console.log('PAGEERRORS', errors.length);
await browser.close(); server.close();
