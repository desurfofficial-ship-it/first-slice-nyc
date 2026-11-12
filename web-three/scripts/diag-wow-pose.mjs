/**
 * Diag: wow-card pose candidates (v1.50.0). Renders the LIVE game camera
 * from three authored-pose candidates through the game's own postcard rig
 * path and saves canvas screenshots, so the composition is judged in-engine
 * (the anti-slop gate) instead of on paper.
 *   A: pulled back + raised, shallow tilt  (−326, 3.4, 24) → (−326, 10.5, −7.9)
 *   B: moderate pull-back                  (−326, 2.6, 18) → (−326, 9.5, −7.9)
 *   C: shipped spot, lower look (control)  (−326, 1.9, 10.5) → (−326, 9, −7.9)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4603;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm' };
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
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 768, height: 1160 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);
// bring the player into the square first — the zone-visibility law lights
// TSS_Group only for a player inside the zone (the wow beat's own walk)
await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -330; p.y = 0.25; p.z = 6.0; p.radius = 0.35; p.height = 1.75;
  g.player.vy = 0; g.player.ladder = null;
  // walk east across the square to cross the beat/zone triggers honestly
  for (let t = 0; t < 3000; t += 400) await new Promise((r) => setTimeout(r, 400));
});
await page.waitForTimeout(1500);

const candidates = [
  { name: 'A', pos: [-326, 3.4, 24], look: [-326, 10.5, -7.9] },
  { name: 'B', pos: [-326, 2.6, 18], look: [-326, 9.5, -7.9] },
  { name: 'C', pos: [-326, 1.9, 10.5], look: [-326, 9, -7.9] },
];
// the zone walk above may have fired the wow beat — dismiss its panel so the
// composition reads clean (the card's own photo area = the full canvas here)
await page.evaluate(async () => {
  const g = window.__game;
  if (!g.ui.postcardPanel.hidden) g.ui.postcardStay.click();
  await new Promise((r) => setTimeout(r, 400));
});
for (const c of candidates) {
  await page.evaluate((cand) => {
    const g = window.__game;
    g.player.frozen = true;
    g.postcardRig = true;
    g.cam.pose = 'postcard';
    g.rigPos = { x: cand.pos[0], y: cand.pos[1], z: cand.pos[2] };
    g.rigLook = { x: cand.look[0], y: cand.look[1], z: cand.look[2] };
  }, c);
  await page.waitForTimeout(1200); // a few frames from the rig pose
  await page.screenshot({ path: `shots/wow-pose-${c.name}.png` });
  console.log(`saved shots/wow-pose-${c.name}.png`);
}
console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none');
await browser.close(); server.close();
