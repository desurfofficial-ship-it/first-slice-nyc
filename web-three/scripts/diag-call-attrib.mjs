/**
 * diag-call-attrib — decompose the REAL per-rig draw calls empirically:
 * base, minus SUB_Root, minus TSS_Group, minus the sun's shadow pass.
 * (renderer.info.reads the LAST rendered frame; the rig override forces
 * the rig view; each toggle waits for fresh frames before reading.)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4596;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const r = window.__game['renderer'];
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
  ['PLAZA',      { pos: [-45.5, 2.6, 5.8],  at: [-18, 1.5, 2],  feet: [-42, 6.2, 0.05] }],
  ['TIMES_SQ',   { pos: [-340, 2.4, -8],    at: [-343, 2, 4],   feet: [-343, 0.1, 0.05] }],
  ['PLATFORM_A', { pos: [-40, -2.2, 10.5],  at: [-47, -2.5, 15], feet: [-40, -3.2, -3.2] }],
];

const out = {};
for (const [name, rig] of rigs) {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = d.feet[2] ?? 0.05;
    window.__rigCam = { pos: d.pos, at: d.at };
  }, rig);
  await page.waitForTimeout(700);
  out[name] = await page.evaluate(async () => {
    const g = window.__game;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const calls = () => g['renderer'].info.render.calls;
    const sub = g.world.scene.getObjectByName('SUB_Root');
    const tss = g.world.scene.getObjectByName('TSS_Group');
    let sun = null;
    g.world.scene.traverse((o) => { if (o.isDirectionalLight) sun = o; });
    const res = {};
    await sleep(250); res.base = calls();
    if (sub) { const v = sub.visible; sub.visible = false; await sleep(250); res.minusSUB = calls(); sub.visible = v; }
    if (tss) { const v = tss.visible; tss.visible = false; await sleep(250); res.minusTSS = calls(); tss.visible = v; }
    if (sun) { const v = sun.castShadow; sun.castShadow = false; await sleep(250); res.noShadow = calls(); sun.castShadow = v; }
    await sleep(250); res.restored = calls();
    res.lit = [...g.world.subway.lit];
    res.sunShadowCam = sun ? { l: sun.shadow.camera.left, r: sun.shadow.camera.right, t: sun.shadow.camera.top, b: sun.shadow.camera.bottom } : null;
    return res;
  });
}
await page.evaluate(() => { window.__rigCam = null; });
console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
