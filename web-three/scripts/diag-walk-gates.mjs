/** Dump every movement gate's state at boot and after settle. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4664;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });

const snap = () => page.evaluate(() => {
  const g = window.__game;
  const u = g.ui;
  return {
    nameBoxHidden: u.nameBox.hidden,
    starterHidden: u.starterCard?.hidden,
    orderHidden: u.orderCard?.hidden,
    wardrobeOpen: g.wardrobe?.isOpen,
    mapOpen: g.mapOpen,
    arrivalActive: g.arrival?.active,
    dayFading: g.dayFading,
    frozen: g.player.frozen,
    roam: g.roam.active,
    step: g.state.step,
    day: g.state.day,
    noteHidden: document.getElementById('note')?.hidden,
    noteText: document.getElementById('note')?.textContent?.slice(0, 60),
    starterVisibleStyle: document.getElementById('starter-card')
      ? getComputedStyle(document.getElementById('starter-card')).display : null,
    objective: document.getElementById('objective')?.textContent?.slice(0, 60),
  };
});

await page.waitForTimeout(1500);
console.log('t+1.5s :', JSON.stringify(await snap()));
await page.waitForTimeout(4000);
console.log('t+5.5s :', JSON.stringify(await snap()));
// try an interact press to see if anything dismisses
await page.evaluate(() => window.__game.input.injectInteract());
await page.waitForTimeout(1200);
console.log('after E:', JSON.stringify(await snap()));
await page.evaluate(() => window.__game.input.injectInteract());
await page.waitForTimeout(1200);
console.log('after E2:', JSON.stringify(await snap()));
await browser.close();
server.close();
process.exit(0);
