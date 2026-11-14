/**
 * The gifted-packs ISO verification (2026-11-14) — one pause-pose-render
 * isometric frame per furnished room (the probe-world-map evidence law):
 * teleport the player inside, let the interior toggle show the room, pause,
 * pose the free camera overhead, manual render, shoot. Yaw review for the
 * 14 gifted slots happens here — orientation is unambiguous from above.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4645;
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
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
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 160)));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForFunction(() => {
  const w = window.__game?.world;
  return w && w.furnitureUpgrades && w.furnitureUpgrades.size >= 54;
}, null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(2000);

// teleport the player to the room's walk center; the next world.update
// shows the room (the interior toggle), then pause + pose + render
const ROOMS = [
  { out: 'gifted-iso-cecil.png', px: 12.6, py: 8.5, pz: -11.0, cx: 13.0, cy: 8.6, cz: -11.6, ex: 17.0, ey: 15.0, ez: -15.6 },
  { out: 'gifted-iso-hall.png', px: -54.0, py: 0.2, pz: 26.0, cx: -54.0, cy: 0.3, cz: 26.0, ex: -46.5, ey: 9.5, ez: 18.5 },
  { out: 'gifted-iso-barber.png', px: 36.6, py: 0.2, pz: 13.0, cx: 36.6, cy: 0.3, cz: 13.9, ex: 40.5, ey: 13.0, ez: 9.8 },
  { out: 'gifted-iso-records.png', px: -25.0, py: 0.2, pz: -26.0, cx: -25.0, cy: 0.3, cz: -26.0, ex: -21.2, ey: 13.5, ez: -29.6 },
];
for (const r of ROOMS) {
  await page.evaluate(({ px, py, pz }) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = px; p.z = pz; p.y = py;
    g.world.update(1 / 60, p);
  }, r);
  // the interior toggle + the duck ease ride the game's own rAF loop —
  // give them the settle window, then pause + pose + render
  await page.waitForTimeout(1200);
  await page.evaluate(({ cx, cy, cz, ex, ey, ez, out }) => {
    const g = window.__game;
    g.running = false;
    const hud = document.getElementById('hud');
    if (hud) hud.style.setProperty('display', 'none');
    // the cutaway law: every interior's duck mass hides for the render
    // (the room's own toggle already showed the target room)
    const hidden = [];
    for (const h of (g.world.interiorHandles ?? [])) {
      for (const d of (h.duck ?? [])) { if (d.visible) { d.visible = false; hidden.push(d); } }
    }
    const cam = g.cam.camera;
    cam.up.set(0, 1, 0);
    cam.position.set(ex, ey, ez);
    cam.lookAt(cx, cy, cz);
    g.renderer.render(g.world.scene, cam);
    for (const d of hidden) d.visible = true;
    window.__shot = out;
  }, r);
  await page.screenshot({ path: join(OUT, r.out) });
  await page.evaluate(() => {
    window.__game.running = true;
    const hud = document.getElementById('hud');
    if (hud) hud.style.setProperty('display', '');
  });
  console.log('SHOT:', r.out);
}
await browser.close();
server.close();

const { execSync } = await import('node:child_process');
execSync(`python3 - <<'PY'
from PIL import Image, ImageDraw
shots = ["gifted-iso-cecil.png", "gifted-iso-hall.png", "gifted-iso-barber.png", "gifted-iso-records.png"]
labels = ["CECIL (N up-ish, E right)", "HALL", "BARBER", "RECORDS"]
W, H = 560, 436
grid = Image.new("RGB", (W*2, H*2+40), (24, 22, 28))
d = ImageDraw.Draw(grid)
for i, (s, lab) in enumerate(zip(shots, labels)):
    im = Image.open("shots/" + s).resize((W, H-20))
    x, y = (i % 2)*W, (i // 2)*H
    grid.paste(im, (x, y+20))
    d.text((x+8, y+4), lab, fill=(240, 230, 210))
grid.save("shots/gifted-iso-grid.png")
print("iso grid ok")
PY`, { cwd: DIST + '/..' });
console.log('grid: shots/gifted-iso-grid.png');
