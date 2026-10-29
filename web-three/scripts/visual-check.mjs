/**
 * Visual verification: captures real screenshots at the game's key beats,
 * validates the composed postcard PNG (signature, size), and checks the
 * mobile touch UI + vertical-first framing.
 * Outputs to web-three/shots/.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4575;
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- landscape pass ----------
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
await wait(1200);

const shot = (name) => page.screenshot({ path: join(OUT, name) });

// 1. spawn — golden hour, terminal, Rosa waving
await shot('01-spawn-golden-hour.png');

// 2. bodega interior (roof hides)
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -16; g.player.capsule.y = 0.11; g.player.capsule.z = 13;
  g.cam.snapBehind(g.player.capsule);
});
await wait(800);
await shot('02-bodega-interior.png');

// 3. the corner + ghost cart
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 1.5; g.player.capsule.y = 0.1; g.player.capsule.z = -4.6;
  g.cam.snapBehind(g.player.capsule);
});
await wait(800);
await shot('03-corner-ghost-cart.png');

// 4. name the cart (claim flow)
await page.evaluate(() => {
  const g = window.__game;
  g.state.setStep(5 /* CLAIM_CART */);
  g.player.capsule.x = 4; g.player.capsule.z = -5.2;
});
await page.evaluate(() => window.__game.input.injectInteract());
await wait(400);
await page.evaluate(() => window.__game.confirmName("Wade's Spot"));
await page.evaluate(() => {
  const g = window.__game;
  g.state.setStep(8 /* CLIMB */);
});
await wait(600);
await shot('04-cart-named.png');

// 5. dusk + gold window (debug G), from the top landing
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 13.4; g.player.capsule.y = 8.075; g.player.capsule.z = -7.2;
  g.cam.snapBehind(g.player.capsule);
  g.input.injectKey('KeyG', true);
});
await wait(100);
await page.evaluate(() => window.__game.input.injectKey('KeyG', false));
await wait(6500);
await shot('05-dusk-gold-window.png');

// 6. full postcard compose (reach top sequence)
await page.evaluate(() => {
  const g = window.__game;
  g.state.setStep(8 /* CLIMB */);
  g.player.frozen = false;
  g.player.capsule.x = 13.4; g.player.capsule.y = 8.075; g.player.capsule.z = -7.3;
});
await wait(9000);
await shot('06-postcard-composed.png');

// 7. validate the composed postcard PNG
const png = await page.evaluate(() => {
  const img = document.getElementById('postcard-img');
  if (!img || !img.src || img.hidden) return null;
  return img.src;
});
if (png && png.startsWith('data:image/png')) {
  const b64 = png.split(',')[1];
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(join(OUT, 'postcard-composed.png'), buf);
  const sig = buf.subarray(0, 8).toString('hex');
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  console.log(`POSTCARD PNG: sig=${sig === '89504e470d0a1a0a' ? 'VALID' : 'INVALID'} ${w}x${h} bytes=${buf.length}`);
} else {
  console.log('POSTCARD PNG: MISSING');
}

// mobile pass: touch UI + vertical-first
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
await mobile.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await mobile.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
await wait(1200);
const touchVisible = await mobile.evaluate(() => {
  const t = document.getElementById('touch-ui');
  return t !== null && !t.hidden;
});
console.log('TOUCH UI VISIBLE (mobile):', touchVisible);
await mobile.screenshot({ path: join(OUT, '07-mobile-portrait-spawn.png') });

await browser.close();
server.close();
console.log('VISUAL CHECK DONE');
