/**
 * Bug hunt — visual sweep of the whole first-session journey (Agent 2).
 * Boots the real game, teleports through every key room, screenshots each,
 * and counts draw calls + console errors per stop. A shot that errors is
 * not evidence; the console must stay clean at every stop.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4598;
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

mkdirSync(new URL('../shots', import.meta.url).pathname, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 520 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2600);

// ---- 0. the note's exit (the bug-hunt fix): the boot note must fade
// and truly hide — never wallpaper. Boot fires MAP_NOTE_BOOT at t≈0;
// by t≈2.6 s it is up. TTL 6.5 s + 0.45 s fade → gone by ~9.6 s.
await page.waitForTimeout(7400);
const noteGone = await page.evaluate(() => {
  const n = document.getElementById('note');
  return { gone: n?.classList.contains('gone') ?? false, hidden: n?.hidden ?? false, text: (n?.textContent ?? '').slice(0, 40) };
});
console.log(`note lifecycle: gone=${noteGone.gone} hidden=${noteGone.hidden} (last text: "${noteGone.text}")`);
if (!noteGone.gone) { console.log('FAIL the boot note never dismissed'); process.exit(1); }
// a fresh note shows and clears again
await page.evaluate(() => window.__game.ui.showNote('probe: this line must leave'));
await page.waitForTimeout(300);
const noteUp = await page.evaluate(() => {
  const n = document.getElementById('note');
  return { visible: !n?.classList.contains('gone'), text: n?.textContent ?? '' };
});
await page.waitForTimeout(7000);
const noteCleared = await page.evaluate(() => document.getElementById('note')?.classList.contains('gone') ?? false);
console.log(`note show: visible=${noteUp.visible} text="${noteUp.text}" | re-clear=${noteCleared}`);
if (!noteUp.visible || !noteCleared) { console.log('FAIL the fresh note lifecycle'); process.exit(1); }

// ---- 0b. the zone bake's keep-set: meshes systems hold by reference
// must survive the bake IN THE SCENE (the bug-hunt found the dollhouse
// ceiling and the turnstile arms merged into dead batches).
const keep = await page.evaluate(() => {
  const live = new Map();
  window.__game.world.scene.traverse((o) => { if (o.name && !live.has(o.name)) live.set(o.name, o); });
  const has = (n) => live.has(n);
  return {
    ceilingA: has('SUB_Ceiling_A'), ceilingB: has('SUB_Ceiling_B'),
    hubA: [...live.keys()].some((n) => n.startsWith('SUB_TurnstileHub_A')),
    armA: [...live.keys()].some((n) => n.startsWith('SUB_TurnstileArm_A')),
    banner: [...live.keys()].some((n) => n.startsWith('TSS_Banner_')),
  };
});
console.log(`bake keep-set: ceilingA=${keep.ceilingA} ceilingB=${keep.ceilingB} hubA=${keep.hubA} armA=${keep.armA} banner=${keep.banner}`);
if (!keep.ceilingA || !keep.ceilingB || !keep.hubA || !keep.armA || !keep.banner) {
  console.log('FAIL the zone bake merged a by-reference mesh');
  process.exit(1);
}

const shot = (name) => page.screenshot({ path: new URL(`../shots/${name}.png`, import.meta.url).pathname });

const tp = (x, y, z, yaw) => page.evaluate(([tx, ty, tz, tyaw]) => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = tx; p.y = ty; p.z = tz; p.radius = 0.35; p.height = 1.75;
  g.player.vy = 0; g.player.ladder = null;
  g.player.camYaw = tyaw; g.player.rotationY = tyaw;
  if (g.cam) { g.cam.camYaw = tyaw; g.cam.moveYaw = tyaw; g.cam.snapBehind({ x: tx, y: ty, z: tz }); }
}, [x, y, z, yaw]);

const probe = () => page.evaluate(() => {
  const g = window.__game;
  let calls = 0;
  if (g.world?.scene) g.world.scene.traverse((o) => { if (o.isMesh && o.visible) calls++; });
  const c = g.cam?.camera?.position;
  return {
    calls,
    feet: { x: +g.player.capsule.x.toFixed(1), y: +g.player.capsule.y.toFixed(2), z: +g.player.capsule.z.toFixed(1) },
    cam: c ? { x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(1) } : null,
    interior: !!g.cam?.interiorMode,
    underground: !!g.world?.subway?.underground,
    prompt: g.ui?.currentPrompt ?? g.currentPrompt ?? null,
  };
});

const stops = [
  // [name, x, y, z, yaw]
  ['bh-01-terminal-bay', -28, 0.1, 5.5, Math.PI / 2],       // M121 bay from the curb
  ['bh-02-bus-interior', -31.5, 0.55, 2, Math.PI],          // inside the M121
  ['bh-03-terminal-front', -36, 0.1, 6.5, 0],               // terminal door
  ['bh-04-station-a-stairs', -47.2, 0.1, 8.2, Math.PI],     // head of the stairs
  ['bh-05-station-a-fare', -44, -3.1, 9.8, Math.PI],        // fare bank, platform A
  ['bh-06-station-a-platform', -50, -3.1, 11.5, -Math.PI / 2], // platform A west end, facing train
  ['bh-07-train-interior', -44.2, -3.1, 15.95, -Math.PI / 2],  // inside car A
  ['bh-08-station-b', -332.3, -3.1, 11, -Math.PI / 2],      // 42 St platform
  ['bh-09-square-plaza', -348, 0.1, 2, Math.PI / 2],        // the square, facing the canyon
  ['bh-10-square-steps', -343, 1.75, 2.2, Math.PI],         // ON the red steps (registry anchor)
  ['bh-11-square-orpheum', -350, 0.1, 8.5, Math.PI],        // the Orpheum marquee
  ['bh-12-court', 12, 0.1, -6.8, Math.PI],                  // the half court
  ['bh-13-bodega-in', 3.5, 0.1, 5.2, Math.PI],              // the bodega interior
  ['bh-14-corner-cart', -12, 0.1, 6.2, Math.PI / 2],        // the cart corner
  ['bh-15-stoop-dusk', 12, 0.1, -6.8, 0],                   // home block, day light check
];

for (const [name, x, y, z, yaw] of stops) {
  await tp(x, y, z, yaw);
  await page.waitForTimeout(3200); // full camera settle (POS_LERP done)
  const info = await probe();
  await shot(name);
  console.log(`${name}: feet=(${info.feet.x},${info.feet.y},${info.feet.z}) cam=(${info.cam?.x},${info.cam?.y},${info.cam?.z}) int=${info.interior} und=${info.underground} calls=${info.calls} prompt=${JSON.stringify(info.prompt)}`);
}

console.log('console errors:', errors.length);
if (errors.length) console.log(errors.slice(0, 8).join('\n'));
console.log(errors.length === 0 ? 'BUGHUNT SWEEP: CLEAN' : 'BUGHUNT SWEEP: ERRORS FOUND');

await browser.close();
server.close();
