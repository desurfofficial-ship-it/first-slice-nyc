/**
 * B7 verification (docs/51): paper owns the screen on phones.
 *
 * Boots the built dist under touch emulation (phone viewport, coarse
 * pointer) and walks every paper surface — Map notebook, order card,
 * postcard, name box — asserting:
 *   1. the touch controls are live while NO panel is open (the joy zone
 *      actually receives a tap — the stick is not dead),
 *   2. `#touch-ui` carries `hidden-when-panel` and computes display:none
 *      while a panel is open, so the stick can neither spawn nor eat
 *      gestures meant for the paper,
 *   3. the controls come back the moment the paper closes,
 *   4. a tap in the joy zone's corner while the order card is open never
 *      reaches the stick (the "steals taps" regression),
 *   5. zero console/page errors.
 *
 * Screenshots land in ../shots for the visual pass.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4620;
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
const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, // iPhone-ish
  hasTouch: true,
  isMobile: true,
});
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// boot: showGame() unhides #touch-ui on touch devices (webdriver boots skip the film)
await page.waitForSelector('#touch-ui:not([hidden])', { timeout: 30000 });
await wait(1200); // first frames settle under SwiftShader

const touchState = () => page.evaluate(() => {
  const t = document.getElementById('touch-ui');
  return {
    hiddenAttr: t.hidden,
    whenPanelClass: t.classList.contains('hidden-when-panel'),
    display: getComputedStyle(t).display,
  };
});

let failed = 0;
const expect = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
  if (!cond) failed++;
};

// --- 1. no panel open: touch controls live, joy zone receives taps ---
{
  const s = await touchState();
  expect(!s.hiddenAttr && !s.whenPanelClass && s.display !== 'none',
    `no panel → touch UI live (${JSON.stringify(s)})`);
  await page.evaluate(() => {
    window.__joyHit = false;
    document.getElementById('joy-zone')
      .addEventListener('pointerdown', () => { window.__joyHit = true; }, { once: true });
  });
  await page.touchscreen.tap(40, 800); // lower-left corner = joy zone
  await wait(150);
  const hit = await page.evaluate(() => window.__joyHit);
  expect(hit === true, 'tap in the corner reaches the joy zone (stick not dead)');
  await page.screenshot({ path: join(OUT, 'touchui-1-open-street.png') });
}

// --- 2. Map notebook open → touch UI hidden; closed → back ---
// (the Map button lives in the pocket dropdown now — open the pocket first;
//  the pocket itself is deliberately not a surface, so the tap still lands)
{
  const pocket = await page.locator('#btn-pocket').boundingBox();
  await page.touchscreen.tap(pocket.x + pocket.width / 2, pocket.y + pocket.height / 2);
  await wait(250);
  const btn = await page.locator('#btn-map').boundingBox();
  await page.touchscreen.tap(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await wait(400);
  let s = await touchState();
  expect(s.whenPanelClass && s.display === 'none',
    `map open → touch UI suppressed (${JSON.stringify(s)})`);
  await page.screenshot({ path: join(OUT, 'touchui-2-map-open.png') });

  const close = await page.locator('#map-close').boundingBox();
  await page.touchscreen.tap(close.x + close.width / 2, close.y + close.height / 2);
  await wait(300);
  s = await touchState();
  expect(!s.whenPanelClass && s.display !== 'none',
    `map closed → touch UI restored (${JSON.stringify(s)})`);
}

// --- 3. order card open → touch UI hidden; corner tap never spawns the stick ---
{
  await page.evaluate(() => {
    window.__game.ui.showOrderCard({
      bubble: 'PROBE', line: 'One slice, wrapped tight?', replies: [{ label: 'Wrap it' }, { label: 'Not now' }],
    });
    window.__joyHit = false;
    document.getElementById('joy-zone')
      .addEventListener('pointerdown', () => { window.__joyHit = true; }, { once: true });
  });
  await wait(300);
  const s = await touchState();
  expect(s.whenPanelClass && s.display === 'none',
    `order card open → touch UI suppressed (${JSON.stringify(s)})`);
  await page.touchscreen.tap(40, 800); // the resting-thumb spot beside the paper
  await wait(150);
  const hit = await page.evaluate(() => window.__joyHit);
  const baseHidden = await page.evaluate(() => document.getElementById('joy-base').hidden);
  expect(hit === false && baseHidden === true,
    `corner tap while card open: joy zone never touched, stick never spawned (hit=${hit}, baseHidden=${baseHidden})`);
  await page.screenshot({ path: join(OUT, 'touchui-3-order-card.png') });
  await page.evaluate(() => window.__game.ui.hideOrderCard());
  await wait(200);
  const s2 = await touchState();
  expect(!s2.whenPanelClass && s2.display !== 'none',
    `order card closed → touch UI restored (${JSON.stringify(s2)})`);
}

// --- 4. postcard + name box: same law ---
{
  await page.evaluate(() => window.__game.ui.showPostcard('', 'probe postcard'));
  await wait(200);
  let s = await touchState();
  expect(s.whenPanelClass && s.display === 'none',
    `postcard open → touch UI suppressed (${JSON.stringify(s)})`);
  await page.screenshot({ path: join(OUT, 'touchui-4-postcard.png') });
  await page.evaluate(() => window.__game.ui.hidePostcard());
  await wait(200);
  s = await touchState();
  expect(!s.whenPanelClass && s.display !== 'none',
    `postcard closed → touch UI restored (${JSON.stringify(s)})`);

  await page.evaluate(() => window.__game.ui.openNameBox());
  await wait(200);
  s = await touchState();
  expect(s.whenPanelClass && s.display === 'none',
    `name box open → touch UI suppressed (${JSON.stringify(s)})`);
  await page.evaluate(() => window.__game.ui.closeNameBox());
  await wait(200);
  s = await touchState();
  expect(!s.whenPanelClass && s.display !== 'none',
    `name box closed → touch UI restored (${JSON.stringify(s)})`);
}

// --- 5. album: same law (the pocket dropdown is deliberately NOT a surface —
//     it closes on outside-tap; the tap that dismisses it belongs to the world)
{
  await page.evaluate(() => window.__game.ui.showAlbum([]));
  await wait(200);
  let s = await touchState();
  expect(s.whenPanelClass && s.display === 'none',
    `album open → touch UI suppressed (${JSON.stringify(s)})`);
  await page.screenshot({ path: join(OUT, 'touchui-5-album.png') });
  await page.evaluate(() => window.__game.ui.hideAlbum());
  await wait(200);
  s = await touchState();
  expect(!s.whenPanelClass && s.display !== 'none',
    `album closed → touch UI restored (${JSON.stringify(s)})`);
}

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'zero console/page errors');
console.log(failed === 0 ? 'PROBE GREEN' : `PROBE RED — ${failed} failed`);
await browser.close();
server.close();
process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
