/** Who is who in the frame: project player visual / stranger / familiar
 *  through the live camera at the settled underground pose. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4618;
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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -46.95; p.y = -3.1; p.z = 9.7;
  g.cam.camYaw = 0; g.cam.moveYaw = 0;
  g.cam.snapBehind(p);
});
await page.waitForTimeout(2500);

const out = await page.evaluate(() => {
  const g = window.__game;
  const cam = g.cam.camera;
  const v = new (Object.getPrototypeOf(cam.position).constructor)();
  const proj = (name, o) => {
    if (!o) return `${name}: (none)`;
    v.setFromMatrixPosition(o.matrixWorld ? o.matrixWorld : o.matrix);
    const p = v.clone().project(cam);
    const vis = o.visible !== false;
    return `${name}: world=(${v.x.toFixed(1)},${v.y.toFixed(2)},${v.z.toFixed(1)}) ndc=(${p.x.toFixed(2)},${p.y.toFixed(2)}) visible=${vis}`;
  };
  const lines = [
    proj('playerVisual', g.world && g.playerVisual ? g.playerVisual : g.playerVisualRef ?? null),
  ];
  // find by traversal: the player rig, the stranger, the familiar
  let player = null, stranger = null, familiar = null;
  g.world.scene.traverse((o) => {
    if (o.name === 'Player' || o.name === 'PlayerVisual') player = o;
    if (o.name === 'Stranger') stranger = o;
    if (o.name === 'Familiar') familiar = o;
  });
  lines.push(proj('player(traverse)', player));
  lines.push(proj('stranger', stranger));
  lines.push(proj('familiar', familiar));
  lines.push(`capsule=(${g.player.capsule.x.toFixed(2)},${g.player.capsule.y.toFixed(2)},${g.player.capsule.z.toFixed(2)})`);
  const c = cam.position;
  lines.push(`cam=(${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)}) camYaw=${g.cam.camYaw.toFixed(2)}`);
  // the game's own visual sync object
  const pv = g.playerVisual ?? (g.world ? null : null);
  if (pv) lines.push(proj('g.playerVisual', pv));
  return lines.join('\n');
});
console.log(out);
await page.screenshot({ path: 'shots/who-is-who-portrait.png' });
await browser.close();
server.close();
