/* one-off B13 census: where do the shadow-pass calls live at the PLAZA rig?
   Method: freeze the frame, count renderer.info.render.calls; then toggle
   castShadow=false per family, re-render, count again. Deltas = family cost. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) { res.writeHead(200, {'content-type': MIME[extname(file)] ?? 'application/octet-stream'}); res.end(readFileSync(file)); }
  else { res.writeHead(200, {'content-type': 'text/html'}); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(4598, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4598/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2000);
// stand at the PLAZA rig feet, park the rig camera like the breakdown does
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -42; g.player.capsule.z = 6.2; g.player.capsule.y = 0.05;
  const r = g.renderer; const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    window.__loopCam = camera;
    camera.position.set(-45.5, 2.6, 5.8); camera.lookAt(-18, 1.5, 2);
    return orig(scene, camera);
  };
});
await page.waitForTimeout(900);
const result = await page.evaluate(() => {
  const g = window.__game; const scene = g.world.scene;
  // the game's own active camera (whatever the loop renders with)
  const cam = window.__loopCam;
  const r = g.renderer;
  const measure = (label) => {
    r.info.reset();
    r.render(scene, cam);
    return { label, calls: r.info.render.calls, tris: r.info.render.triangles };
  };
  const base = measure('base');
  const families = {
    baked_statics: (o) => { let n = o; while (n) { if (n.name && n.name.startsWith('StaticBake')) return true; n = n.parent; } return false; },
    named_world: (o) => { let n = o; while (n) { if (n.name && n.name.length > 2 && !n.name.startsWith('StaticBake') && n.name !== 'Scene') return true; n = n.parent; } return false; },
  };
  const isChar = (o) => { let n = o; while (n) { const nm = n.name || ''; if (/^(Rosa|Sal|Player|Pedestrians|BUS_Driver|Idris|Priya|Kid|Usher|TSS_)/.test(nm)) return true; n = n.parent; } return false; };
  const out = [base];
  // family A: characters + peds
  const saved = [];
  scene.traverse((o) => { if (o.isMesh && o.castShadow && isChar(o)) { saved.push(o); o.castShadow = false; } });
  out.push(measure('no_char_shadow'));
  for (const o of saved) o.castShadow = true;
  // family B: named world (props, trees, streetlights — everything named, non-bake)
  const savedB = [];
  scene.traverse((o) => { if (o.isMesh && o.castShadow && families.named_world(o) && !isChar(o)) { savedB.push(o); o.castShadow = false; } });
  out.push(measure('no_named_world_shadow'));
  for (const o of savedB) o.castShadow = true;
  // family C: baked statics
  const savedC = [];
  scene.traverse((o) => { if (o.isMesh && o.castShadow && families.baked_statics(o)) { savedC.push(o); o.castShadow = false; } });
  out.push(measure('no_bake_shadow'));
  for (const o of savedC) o.castShadow = true;
  // family D: everything else unnamed
  const savedD = [];
  scene.traverse((o) => { if (o.isMesh && o.castShadow && !families.named_world(o) && !families.baked_statics(o) && !isChar(o)) { savedD.push(o); o.castShadow = false; } });
  out.push(measure('no_unnamed_shadow'));
  for (const o of savedD) o.castShadow = true;
  return { camFound: !!cam, camType: cam ? cam.type : '?', out };
});
console.log(JSON.stringify(result, null, 1));
await browser.close(); server.close(); process.exit(0);
