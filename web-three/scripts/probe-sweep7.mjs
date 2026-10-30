/**
 * Env pass seven — visual sweep. One run, twelve frozen-camera frames across
 * the whole merged block (post lead-agent sync 40ba313), so the eye can audit
 * what the street actually looks like now: both sidewalks, both tree rows,
 * the plaza, the crosswalk, Rosa's block, the laundry, the east end, the
 * dusk state. No asserts — this is the finding tool, not the proving tool.
 * Zero console/page errors required.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4596;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(() => { window.__game.cam.update = () => {}; }); // probe-only freeze
await wait(3500); // birds settle, leaves drift into steady state

// Twelve vantage points. [cx, cy, cz, tx, ty, tz, name, dusk]
const frames = [
  // --- the street, walking-the-block eastward (player height 1.7) ---
  [-46, 1.7, 5.6, -30, 1.4, 5.0, 'sw-west-end', false],
  [-36, 1.7, 5.4, -18, 1.2, 5.2, 'sw-north-mid', false],
  [-20, 1.7, -5.4, -38, 1.2, -6.4, 'sw-south-west', false],
  [4, 1.7, -5.6, 24, 1.3, -6.6, 'sw-south-east', false],
  [18, 1.7, 5.4, 40, 1.4, 5.4, 'sw-north-east', false],
  [44, 1.7, 4.0, 30, 1.2, 6.0, 'east-end-lookback', false],
  // --- the crossings and the plaza ---
  [-10.5, 1.7, 2.0, -10.5, 1.2, -6.0, 'crosswalk-north', false],
  [-12.8, 1.7, -3.8, -16.3, 0.6, -7.05, 'pit-south-close', false],
  [-1.0, 1.7, 3.9, -4.3, 0.6, 7.05, 'pit-north-close', false],
  [-14, 2.4, 1.2, -8, 1.0, -3.5, 'plaza-overview', false],
  // --- the dressed row, close ---
  [-27, 1.6, 3.4, -27, 1.2, 7.2, 'rosa-front', false],
  [26, 1.6, -2.8, 26, 1.2, -7.2, 'laundry-front', false],
  // --- the long look: whole street silhouette ---
  [-49, 3.2, 0, 45, 2.0, 0, 'street-axis', false],
];

let i = 0;
for (const [cx, cy, cz, tx, ty, tz, name] of frames) {
  await page.evaluate(([cx, cy, cz, tx, ty, tz]) => {
    const c = window.__game.cam.camera;
    c.position.set(cx, cy, cz);
    c.lookAt(tx, ty, tz);
    c.updateMatrixWorld();
  }, [cx, cy, cz, tx, ty, tz]);
  await wait(900);
  await page.screenshot({ path: join(OUT, `sw7-${String(++i).padStart(2, '0')}-${name}.png`) });
  await wait(200);
}

console.log(`frames: ${i}`);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'zero console/page errors');
await browser.close();
server.close();
