import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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
const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);
const run = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  window.__warns = [];
  const origWarn = console.warn.bind(console);
  console.warn = (...a) => { window.__warns.push(a.join(' ')); origWarn(...a); };
  // walk into the square the honest way: teleport to the exit stair top and step east
  p.x = -330; p.y = 0.25; p.z = 6.0; p.radius = 0.35; p.height = 1.75; // the north walk, clear of the exit shaft
  g.player.vy = 0; g.player.ladder = null;
  const timeline = [];
  for (let t = 0; t <= 4000; t += 400) {
    timeline.push({
      t,
      beats: g.world.tsBeats.length,
      panel: !g.ui.postcardPanel.hidden,
      note: (document.getElementById('note')?.textContent || '').slice(0, 30),
      underground: g.world.subway.underground,
      lit: g.world.subway.lit.has('tsSurface'),
      feet: (+p.x.toFixed(1)) + ',' + (+p.y.toFixed(2)) + ',' + (+p.z.toFixed(1)),
    });
    await sleep(400);
  }
  out.timeline = timeline;
  out.panelOpen = !g.ui.postcardPanel.hidden;
  out.stayLabel = g.ui.postcardStay.textContent;
  out.frozenWhileUp = g.player.frozen; // the paper holds the hands (B7 contract)
  out.caption = g.ui.postcardCaption.textContent.split('\n').slice(0, 2).join(' / ');
  out.imgSet = !!g.ui.postcardImg.src && g.ui.postcardImg.src.startsWith('data:image/png');
  out.warns = (window.__warns || []).slice(0, 3);
  out.cardData = (g.ui.postcardImg.src || '').slice(0, 30);
  out.step = g.state.step;
  await new Promise((r) => setTimeout(r, 200)); // let the img paint
  return out;
});
console.log('OUT:', JSON.stringify(run, null, 1));
console.log('ERRORS:', errors.length ? errors.slice(0, 3).join(' | ') : 'none');
if (run.panelOpen) await page.screenshot({ path: 'shots/wow-card-open.png' });
const after = await page.evaluate(async () => {
  const g = window.__game;
  const out = {};
  // the story machine must be untouched: dismiss and keep walking
  g.ui.postcardStay.click();
  await new Promise((r) => setTimeout(r, 300));
  out.panelClosed = g.ui.postcardPanel.hidden;
  out.frozenAfter = g.player.frozen;
  out.stepAfter = g.state.step;
  out.dayAfter = g.state.day;
  return out;
});
console.log('AFTER:', JSON.stringify(after));
await page.screenshot({ path: 'shots/wow-card-check.png' });

// extract the full card for inspection
const card = await page.evaluate(() => window.__game.ui.postcardImg.src || '');
if (card.startsWith('data:image/png')) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync('shots/wow-card-full.png', Buffer.from(card.split(',')[1], 'base64'));
  console.log('CARD saved: shots/wow-card-full.png');
}

await browser.close(); server.close();
