/**
 * diag-postcard-poses — the moment-card reframe experiment (docs/59).
 * Renders pose CANDIDATES for the fold and towers moment cards through the
 * game's real day-card pipeline (rigPos/rigLook + composePostcard) so the
 * framing can be judged on true composed paper. Caption is staged Day 1 —
 * framing is what's judged here, not words.
 * Usage: node scripts/diag-postcard-poses.mjs   (npm run build first)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/postcard-poses/', import.meta.url).pathname;
const PORT = 4598;
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
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 480, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2000);

// dusk staged once (the moment cards fire at dusk)
await page.evaluate(() => { window.__game['startDusk'](); });
await page.waitForTimeout(7200);

// the candidates: [name, posX,posY,posZ, lookX,lookY,lookZ]
const towers = [
  ['towers-base', 7, 15.5, -3.5, -14, 17.5, -12.5],
  ['towers-right', 9, 15.8, -3.2, -14, 17.5, -12.5],
  ['towers-up', 7, 16.4, -3.5, -14, 17.2, -12.5],
  ['towers-yaw', 7, 15.5, -3.5, -12.2, 17.6, -10.8],
];
const fold = [
  ['fold-base', -16.0, 1.7, 14.2, -16.0, 1.45, 8.4],
  ['fold-left', -16.7, 1.7, 14.2, -17.0, 1.45, 8.4],
  ['fold-close', -16.0, 1.6, 13.0, -16.1, 1.5, 8.4],
  ['fold-aim', -16.2, 1.7, 14.2, -17.3, 1.55, 8.8],
];

for (const [name, px, py, pz, lx, ly, lz] of [...towers, ...fold]) {
  await page.evaluate(([n, px, py, pz, lx, ly, lz]) => {
    const g = window.__game;
    const s = g.state;
    s.day = 1;
    s.replayDay = false;
    s.cartName = "Wade's Spot";
    s.money = 98;
    s.dayStartMoney = 86;
    g['rigPos'] = { x: px, y: py, z: pz };
    g['rigLook'] = { x: lx, y: ly, z: lz };
    g['wowPostcard'] = false;
    g['postcardRig'] = true;
    g['composePostcard']();
  }, [name, px, py, pz, lx, ly, lz]);
  await page.waitForTimeout(220);
  const ok = await page.evaluate(() => {
    const src = window.__game.ui.postcardImg.src || '';
    window.__poseCard = src.startsWith('data:image/png') ? src : '';
    window.__game.ui.hidePostcard();
    window.__game['postcardRig'] = false;
    window.__game.player.frozen = false;
    return !!window.__poseCard;
  });
  if (!ok) { console.log('MISS', name); continue; }
  const dataUrl = await page.evaluate(() => window.__poseCard);
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('saved', name);
}

await browser.close();
server.close();
console.log('POSES COMPLETE');
