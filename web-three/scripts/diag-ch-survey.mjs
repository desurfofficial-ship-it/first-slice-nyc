/**
 * CH survey — the Corner House interior seen from every reading distance:
 * the doorway first-read, the four compass views from mid-floor, the three
 * fixture close-ups, and the far-state street read. The bodega's dressed
 * floor is shot with the same rig as the quality bar. Evidence frames
 * (loop paused, the camera posed by hand), not gameplay frames.
 *
 * Usage: node scripts/diag-ch-survey.mjs   (shots to shots/world-map/ch-survey-*.png)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/world-map', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4673;

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
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

/** Stand the player somewhere, one world.update so the interior state
 *  settles, then shoot the list of poses with the loop paused. */
let shotN = 0;
const stand = async (px, pz) => {
  await page.evaluate(([x, z]) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = x; p.z = z; p.y = 0.05;
    g.world.update(1 / 60, p);
    g.running = false;
  }, [px, pz]);
};
const shot = async (name, cx, cy, cz, lx, ly, lz) => {
  await page.evaluate(([ax, ay, az, lx2, ly2, lz2]) => {
    const g = window.__game;
    const cam = g.cam.camera;
    cam.position.set(ax, ay, az);
    cam.lookAt(lx2, ly2, lz2);
    g.renderer.render(g.world.scene, cam);
  }, [cx, cy, cz, lx, ly, lz]);
  shotN++;
  await page.screenshot({ path: join(OUT, `ch-survey-${name}.png`) });
  console.log(`SHOT ${shotN}: ${name}`);
};
const resume = async () => { await page.evaluate(() => { window.__game.running = true; }); };

// ---- the far-state street read (the room hides, the lit glass shows) ------
await stand(-55, 4.6);
await shot('01-street-far', -55, 1.65, 2.5, -55, 1.5, 14);
await shot('02-window-W', -59.5, 1.65, 4.0, -57.3, 1.4, 10);

// ---- the doorway first-read (the near band shows the fit-out) -------------
await stand(-55, 7.0);
await shot('03-door-read', -55, 1.65, 5.6, -55.4, 1.5, 16);

// ---- inside: the four compass views from mid-floor ------------------------
await stand(-55.0, 13.0);
await shot('04-in-north', -55.0, 1.65, 12.0, -55.0, 1.4, 20.0);
await shot('05-in-south', -55.0, 1.65, 13.0, -55.0, 1.4, 7.0);
await shot('06-in-east', -55.0, 1.65, 13.0, -51.0, 1.4, 13.0);
await shot('07-in-west', -55.0, 1.65, 13.0, -59.6, 1.4, 13.0);

// ---- the three fixture close-ups ------------------------------------------
await stand(-54.8, 14.4);
await shot('08-gondola-east-face', -54.5, 1.5, 14.4, -56.0, 1.0, 14.4);
await stand(-52.6, 10.6);
await shot('09-counter', -52.3, 1.55, 10.6, -52.4, 0.9, 8.7);
await stand(-55.0, 16.6);
await shot('10-back-wall', -55.0, 1.55, 16.4, -55.0, 1.2, 19.6);
await stand(-58.0, 9.6);
await shot('11-corner-pier', -58.2, 1.5, 9.4, -58.7, 0.8, 8.9);

// ---- the quality bar: the bodega's dressed floor, same rig ----------------
await stand(-16.0, 13.0);
await shot('12-bodega-north', -16.0, 1.65, 12.0, -16.0, 1.4, 19.5);
await shot('13-bodega-west', -16.0, 1.65, 13.0, -20.5, 1.4, 13.0);

await resume();
console.log(`page errors: ${errors.length}${errors.length ? ' — ' + errors[0] : ''}`);
await browser.close();
process.exit(errors.length ? 1 : 0);
