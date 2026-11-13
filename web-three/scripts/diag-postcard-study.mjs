/**
 * diag-postcard-study — the postcard quality study (Task 11).
 * Boots the real game, stages dusk the way the game itself holds it, and
 * drives the game's OWN compose paths (composePostcard / composeMomentCard /
 * composeWowPostcard) so every authored card is captured through the exact
 * pipeline a player gets. Saves each full card PNG + the panel presentation
 * + the album shelf — the evidence the polish plan is judged against.
 * Usage: node scripts/diag-postcard-study.mjs   (npm run build first)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/postcard-study/', import.meta.url).pathname;
const PORT = 4599;
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
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 480, height: 800 } }); // phone-width panel study
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2000);

const saveCard = async (name) => page.evaluate((n) => {
  const src = window.__game.ui.postcardImg.src || '';
  window.__studyCard = src.startsWith('data:image/png') ? src : '';
  return !!window.__studyCard;
}, name).then(async (ok) => {
  if (!ok) { console.log('CARD MISS', name); return; }
  const dataUrl = await page.evaluate(() => window.__studyCard);
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('saved', `${name}.png`);
});

// ---- dusk, staged the game's own way (startDusk's 6 s tween settles) ----
await page.evaluate(() => { window.__game['startDusk'](); });
await page.waitForTimeout(7200);

// ---- the four day-end cards ----
// The real capture is born at the glide's END pose (the proven TS-01
// glide: mid-street up and back), with lightGoldWindow + the day's own
// golden beat fired mid-chain, capture 2.6 s later (day 1: after the
// full flicker-note run). Staged exactly so.
for (const day of [1, 2, 3, 4]) {
  await page.evaluate((d) => {
    const g = window.__game;
    const s = g.state;
    s.day = d;
    s.replayDay = false;
    s.cartName = "Wade's Spot";
    s.money = 87 + d * 11;
    s.dayStartMoney = 75 + d * 11;
    s.awningUp = d >= 2;
    g['rigPos'] = { x: 13.5, y: 9.5, z: -5.5 };
    g['rigLook'] = { x: 16.5, y: 12, z: 7.94 };
    g['wowPostcard'] = false;
    g['postcardRig'] = true;
    g['lightGoldWindow']();
    if (d === 4) g['goldenBeat4']();
    else if (d === 3) g['goldenBeat3']();
    else if (d === 2) g['kidDuskWave']();
  }, day);
  await page.waitForTimeout(3000); // the flicker settles before the capture
  await page.evaluate((d) => { window.__game['composePostcard'](); }, day);
  await saveCard(`day${day}`);
  await page.evaluate(() => {
    const g = window.__game;
    g.ui.hidePostcard();
    g.player.frozen = false;
    g['postcardRig'] = false;
  });
  await page.waitForTimeout(250);
}

// ---- the four Day-1 moment cards (straight to the album + sessionFull) ----
const momentKinds = ['rush', 'towers', 'fold', 'corner'];
await page.evaluate((kinds) => {
  const g = window.__game;
  const s = g.state;
  s.day = 1;
  s.cartName = "Wade's Spot";
  window.__momentBefore = new Set([...g['sessionFull'].keys()]);
  for (const k of kinds) g['composeMomentCard'](k);
}, momentKinds);
async function dumpMoments() {
  const entries = await page.evaluate(() => {
    const g = window.__game;
    const before = window.__momentBefore;
    return [...g['sessionFull'].entries()]
      .filter(([id]) => !before.has(id))
      .map(([id, url]) => ({ id, url }));
  });
  let i = 0;
  for (const { url } of entries) {
    writeFileSync(join(OUT, `moment-${momentKinds[i] ?? i}.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log('saved', `moment-${momentKinds[i] ?? i}.png`);
    i++;
  }
}
await dumpMoments();

// ---- the panel presentation, as the player sees a card ----
await page.evaluate(() => {
  const g = window.__game;
  g['rigPos'] = { x: 13.5, y: 5.5, z: -1.0 };
  g['rigLook'] = { x: 13.5, y: 9, z: 7.94 };
  g['postcardRig'] = true;
  g['composePostcard']();
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, 'panel-day4.png') });
console.log('saved panel-day4.png');
await page.evaluate(() => { window.__game.ui.hidePostcard(); });

// ---- the album shelf ----
await page.evaluate(() => {
  const g = window.__game;
  g.ui.albumBtn?.click?.() ?? g.ui.toggleAlbum?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, 'album-shelf.png') });
console.log('saved album-shelf.png');

await browser.close();
server.close();
console.log('STUDY COMPLETE');
