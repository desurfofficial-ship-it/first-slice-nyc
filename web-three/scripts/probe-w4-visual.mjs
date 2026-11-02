/**
 * W4 visual evidence — four shots: the bus halted at BUS-01 (door at the
 * pole), the bus mid-lap on Gable, the NZ-COURT dusk pair on the half-court,
 * and the TEN-01 laundry lines. Runs at 480×360 for readable pixels.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4603;
mkdirSync(OUT, { recursive: true });
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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

const busState = () => page.evaluate(() => {
  const d = window.__game.world.busDebug();
  return { leg: d.legName, x: d.x, z: d.z, dwell: d.dwell, laps: d.laps };
});
const place = async (x, z, lookX, lookZ) => {
  await page.evaluate(({ x, z, lookX, lookZ }) => {
    const g = window.__game;
    g.player.capsule.x = x; g.player.capsule.z = z; g.player.capsule.y = 0.05;
    g.player.frozen = true; g.player.vy = 0;
    g.ui.nameBox.hidden = true; g.ui.dialogText && (g.ui.dialogText.textContent = '');
    g.cam.snapBehind({ x: g.player.capsule.x, y: g.player.capsule.y, z: g.player.capsule.z });
  }, { x, z, lookX, lookZ });
};
const shot = (name) => page.screenshot({ path: join(OUT, name) });

// clear the boot wave-dialog queue from anchor-free ground (the terminal
// wave greets the spawn; three lines, so three advances)
await place(3, -6.5);
for (let i = 0; i < 3; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(450); }

// 1. the bus at BUS-01: the halt is only 4 s and the near road projects
// below the frame at sidewalk placements — so poll from anchor-free ground
// and ON the halt teleport to the road's south edge, putting the halted
// bus ~3 m BEYOND the focus (the projection-verified spot: px 229 → in
// frame when the camera stands at z ≈ −8.5)
let hit = false;
for (let i = 0; i < 120; i++) {
  const s = await busState();
  if (s.leg === 'Kestrel west' && s.dwell > 0.6 && s.x < -19 && s.x > -25) { hit = true; break; }
  await page.waitForTimeout(1500);
}
console.log('BUS-01 halt seen:', hit);
if (hit) {
  await place(-21.5, -0.5);
  await shot('w4-bus-stop01.png');
  console.log('shot: w4-bus-stop01.png');
}

// 2. the bus mid-lap on Gable (eastbound, z 38): catch it crossing x 0
for (let i = 0; i < 90; i++) {
  const s = await busState();
  if (s.leg === 'Gable east' && Math.abs(s.x) < 6) break;
  await page.waitForTimeout(1500);
}
await place(3, 33.5); // the bus at z 38 lands ~4.5 m beyond the focus
await page.waitForTimeout(400);
await shot('w4-bus-gable.png');
console.log('shot: w4-bus-gable.png');

// 3. the NZ-COURT dusk pair (toggle dusk on)
await page.evaluate(() => { window.__game.duskStarted = true; });
await page.waitForTimeout(800);
await place(41, 3.5); // the pair at (42, 6.3) sits ~3 m beyond the focus, in frame
await page.waitForTimeout(1200);
await shot('w4-court-dusk-pair.png');
console.log('shot: w4-court-dusk-pair.png');

// 4. the TEN-01 laundry (the Juniper walk at the Old-Law pair)
await place(-66, -10); // looking south: the laundry at z −14 is 4 m beyond the focus
await page.waitForTimeout(1200);
await shot('w4-ten01-laundry.png');
console.log('shot: w4-ten01-laundry.png');

await browser.close();
server.close();
process.exit(0);
