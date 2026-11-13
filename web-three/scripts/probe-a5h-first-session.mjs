/** A5h — the first-session Doc 02 additions, evidenced:
 *   1. ?starter=dee — the walker wears the pick: teal jacket, cap, cream
 *      shoes, the board on the back (assert Starter_Board on the rig).
 *   2. ?film=1&pickcard=1 — the wardrobe's PICK MODE at the handover (the
 *      3D fitting room asks "who got off the bus?"): the panel opens with
 *      the name row visible, tap Dee's tile, tap WEAR — the board appears
 *      and the room folds. (2026-11: the paper starter card retired; the
 *      fitting room IS the pick card.)
 *   3. B-Side Records — the hand-written "Back soon. The city knows when."
 *      sign taped to the closed door glass.
 *
 *  Timing note: the sandbox's software GL runs the loop at a fraction of
 *  real speed, so every wait POLLS state instead of assuming wall-clock.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4598;
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
const errors = [];
const sleep = (ms) => page.waitForTimeout(ms);
let page;

// ---------------------------------------------------------------- 1. dee --
page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${PORT}/?starter=dee&probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game?.playerVisual, null, { timeout: 30000 });
const dee = await page.evaluate(() => {
  const g = window.__game;
  const board = g.playerVisual.children.some((c) => c.name === 'Starter_Board');
  const p = g.player.capsule;
  p.x = -34.2; p.y = 0.05; p.z = 6.3;
  g.playerVisual.position.set(p.x, p.y, p.z);
  g.playerVisual.rotation.y = 1.95;
  g.cam.pose = 'follow';
  g.cam.camYaw = Math.PI / 2;
  g.cam.snapBehind({ x: p.x, y: p.y, z: p.z });
  return { board, note: document.getElementById('note')?.textContent ?? '' };
});
console.log('dee board on back:', dee.board, '| boot note:', JSON.stringify(dee.note));
for (let i = 0; i < 30; i++) await sleep(100); // let the follow cam settle
await page.screenshot({ path: 'shots/a5h-starter-dee.png' });

// ------------------------------------------------------- 2. the pick card --
page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${PORT}/?film=1&pickcard=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game?.arrival, null, { timeout: 30000 });
const tap = () => page.evaluate(() => document.getElementById('cine').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
const phase = () => page.evaluate(() => window.__game?.arrival?.machine.phase ?? 'none');
// the handover finishes to 'off' inside the same frame — poll for either
const landed = () => page.evaluate(async () => {
  for (let i = 0; i < 150; i++) {
    const p = window.__game?.arrival?.machine.phase ?? 'none';
    if (p === 'handover' || p === 'off') return p;
    await new Promise((r) => setTimeout(r, 200));
  }
  return 'timeout';
});
async function waitPhase(target, budgetMs) {
  const t0 = Date.now();
  for (;;) {
    const p = await phase();
    if (p === target) return true;
    if (Date.now() - t0 > budgetMs) return false;
    await sleep(400);
  }
}
await sleep(2500);
// tap-and-poll: machine time runs slow under software GL, so taps that land
// inside a phase's gate are refused — keep asking until the target shows
async function tapUntil(target, budgetMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < budgetMs) {
    if ((await phase()) === target) return true;
    await tap();
    await sleep(3500);
  }
  return (await phase()) === target;
}
console.log('card reached:', await tapUntil('card', 60000));
console.log('handover landed:', await landed());
const cardShown = await page.evaluate(async () => {
  for (let i = 0; i < 50; i++) {
    if (!document.getElementById('wardrobe-panel').hidden
      && !document.getElementById('wardrobe-pick').hidden
      && document.getElementById('wardrobe-title').textContent === 'Who got off the bus?') return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
});
console.log('pick room shown at handover (pick mode + name row):', cardShown);
await sleep(400);
await page.screenshot({ path: 'shots/a5h-pick-card.png' });
// tap Dee's tile, then WEAR — the board must appear and the room must fold
const picked = await page.evaluate(() => {
  const tile = document.querySelector('#wardrobe-lineup .starter-tile[data-starter="dee"]');
  if (!tile) return 'no tile';
  tile.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  return 'tapped';
});
await sleep(600);
await page.screenshot({ path: 'shots/a5h-pick-preview.png' });
const worn = await page.evaluate(() => {
  const wear = document.getElementById('wardrobe-wear');
  if (!wear || wear.hidden) return 'no wear button';
  wear.click();
  return 'worn';
});
await sleep(600);
const after = await page.evaluate(() => ({
  hidden: document.getElementById('wardrobe-panel').hidden,
  board: window.__game.playerVisual.children.some((c) => c.name === 'Starter_Board'),
  note: document.getElementById('note')?.textContent ?? '',
  wearing: window.__game.state.starterId,
}));
console.log('pick:', picked, worn, '| room folded:', after.hidden, '| board:', after.board, '| wearing:', after.wearing, '| note:', JSON.stringify(after.note));
await page.screenshot({ path: 'shots/a5h-after-pick.png' });

// ----------------------------------------------------- 3. the B-Side sign --
// same page (dee worn): a postcard-rig free camera aimed at the facade —
// the follow boom clamps against the buildings south of the walk here
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -25; p.y = 0.05; p.z = -15.5;
  g.playerVisual.position.set(p.x, p.y, p.z);
  g.playerVisual.rotation.y = Math.PI; // faces the shop (-z)
  g.cam.pose = 'postcard';
  g.postcardRig = true; // the rig targets only drive the lens while this flag is up
  g.rigPos.x = -25; g.rigPos.y = 1.9; g.rigPos.z = -36.6;
  g.rigLook.x = -25; g.rigLook.y = 1.7; g.rigLook.z = -31.9;
  g.world.update(1 / 60, p);
});
for (let i = 0; i < 40; i++) await sleep(100);
await page.screenshot({ path: 'shots/a5h-b-side-sign.png' });

console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
server.close();
console.log('a5h ok');
