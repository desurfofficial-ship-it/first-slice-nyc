/**
 * Round seven diagnostic — the Day 4 rush stall (LEAD AGENT'S HANDOFF DATA).
 *
 * The full E2E battery is red on 40ba313 (16 failures, pre-existing —
 * bisected: identical failure set with and without the round-seven sedan
 * change). First failure: "three orders brewed and served" — the three brew
 * interacts at the cart never advance step D4_RUSH → D4_MAP, and every later
 * Day-4 beat cascades. This probe reproduces Day 4 from a faithful save and
 * DUMPS the interact path's internals at each press, so the lead gets facts,
 * not theories:
 *   - step / rushIndex / brewing / money / rushServed
 *   - player capsule, nameBox + prompt visibility (the freeze gate), prompt verb
 *   - customer presence, stranger/kid positions (zone competitors)
 * No shared code touched — read-only over the running game.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4600;
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

// a faithful "end of Day 3" save — exactly what the E2E writes before Day 4
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('first_slice_save_v1', JSON.stringify({
    day: 4, day_complete: true, replay: false, cart_name: 'FIRST SLICE',
    money: 120, awning: true, kid_kept: true, idris_served: true, lunch_served: 2,
    stool: true, map_given: false, permit: false, day_start_money: 111,
  }));
});
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(4000); // beginDay fade + morning beats settle
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const dump = (label) => page.evaluate((l) => {
  const g = window.__game;
  const s = g.state;
  const c = g.player.capsule;
  const stranger = g.world.stranger;
  const kid = g.world.kidGround;
  return {
    label: l,
    step: s.step, day: s.day, brewing: s.brewing, rushIndex: s.rushIndex,
    money: s.money, rushServed: s.rushServed,
    pos: [c.x, c.y, c.z].map((v) => +v.toFixed(2)),
    nameBoxHidden: g.ui.nameBox.hidden,
    promptHidden: g.ui.prompt.hidden,
    promptText: (g.ui.prompt.innerText || '').replace(/\s+/g, ' ').slice(0, 40),
    customer: g.customer ? g.customer.visible : null,
    stranger: stranger.visible ? [+stranger.position.x.toFixed(1), +stranger.position.z.toFixed(1)] : 'hidden',
    kid: kid.visible ? [+kid.position.x.toFixed(1), +kid.position.z.toFixed(1)] : 'hidden',
    frozen: g.player.frozen,
  };
}, label);

console.log('BOOT', JSON.stringify(await dump('after-boot')));

// ---- Day 4 begins: the rail's two presses (the E2E does the same) ----------
await page.evaluate(() => window.__game.input.injectInteract());
await wait(2400);
console.log('DAY4-BEGINS', JSON.stringify(await dump('after-rail-1')));
await page.evaluate(() => window.__game.input.injectInteract());
await wait(1200);
console.log('STRANGER-UP', JSON.stringify(await dump('after-rail-2')));

// ---- the greeting: teleport to the terminal, press interact ----------------
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -35.0; g.player.capsule.y = 0.05; g.player.capsule.z = 4.2;
});
await wait(800);
console.log('AT-TERMINAL', JSON.stringify(await dump('at-terminal')));
await page.evaluate(() => window.__game.input.injectInteract());
await wait(1200);
console.log('GREETED', JSON.stringify(await dump('after-greeting')));

// ---- the rush: three serves from the E2E's exact spot ----------------------
for (let i = 1; i <= 3; i++) {
  await page.evaluate(() => {
    const g = window.__game;
    g.player.capsule.x = 4; g.player.capsule.y = 0.05; g.player.capsule.z = -5.2;
  });
  await wait(600);
  const before = await dump(`rush-${i}-before`);
  await page.evaluate(() => window.__game.input.injectInteract());
  await wait(2200); // brew is 1.15 s; 2.2 s covers it if it starts
  const after = await dump(`rush-${i}-after`);
  console.log('RUSH', JSON.stringify({ before, after }));
}

console.log('ERRORS', errors.length ? errors.join(' | ') : 'none');
await browser.close();
server.close();
