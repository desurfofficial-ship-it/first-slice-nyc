/**
 * Probe: the free-roam loop (Doc 37 §3B/§3C) — the block answering BEFORE
 * the story does. Runs the real game loop with real input injection
 * (injectInteract / injectKey); positions are teleported capsule moves, the
 * same concession every probe here makes.
 *
 * Covered, at 720x1280 portrait (the mobile must-test):
 *   1. the registry answers on MEET_ROSA (story untouched): board, newsbox,
 *      subway glance — notes only, no step changes
 *   2. the bus bench: sit (capsule parks on the seat, sit pose, prompt
 *      flips) → stand (exact spot restored)
 *   3. the bodega shop: offer → confirm buys — REAL deduction, money HUD
 *      reads it, and a broke wallet buys nothing
 *   4. a Day-2 v1 save boots, the shelf is restocked and purchasable
 *      (Save v1 compat, live)
 *   5. the expanded block (docs/38): alley read, park bench sit/stand, one
 *      shot (court disables mid-flight, resets after), the $2 hot dog, the
 *      $12 trim (once a day — the fresh-cut line is free), and the $3 load
 *      (drum spins, stops, day line lands) — every deduction real
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4593;
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

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));

// ---------------------------------------------------------------- pass 1: fresh Day 1
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

// teleport helper: capsule move + settle (camera/ground snap run in the loop)
const teleport = async (x, z) => {
  await page.evaluate(([tx, tz]) => {
    const g = window.__game;
    if (g.sitting) g.standUp();
    g.player.capsule.x = tx;
    g.player.capsule.z = tz;
    g.player.capsule.y = 0.05;
  }, [x, z]);
  await sleep(450);
};

const press = async () => {
  await page.evaluate(() => window.__game.input.injectInteract());
  await sleep(350);
};

const snap = () => page.evaluate(() => {
  const g = window.__game;
  return {
    step: g.state.step,
    day: g.state.day,
    money: g.state.money,
    sitting: g.sitting,
    capsule: { x: g.player.capsule.x, y: g.player.capsule.y, z: g.player.capsule.z },
    prompt: document.getElementById('prompt') && !document.getElementById('prompt').hidden
      ? (document.getElementById('prompt').textContent ?? '').replace(/^Space/, '') : null,
    note: document.getElementById('note') && !document.getElementById('note').hidden
      ? document.getElementById('note').textContent : null,
    moneyLabel: document.getElementById('money')?.textContent ?? null,
  };
});

// 1 — the registry answers before the story does
await teleport(-37.6, 5.9); // the bulletin board, street side
let st = await snap();
check(st.prompt === 'Read the board', `board prompt at MEET_ROSA (got ${JSON.stringify(st.prompt)})`);
check(st.step === 0, 'story step untouched by free-roam presence');
await press();
st = await snap();
check(st.note?.includes('STOOP SALE') === true, `board note reads the day's slip (got ${JSON.stringify(st.note)})`);
check(st.step === 0, 'board note does not advance the story');

await teleport(-44.6, 5.4); // the newsboxes
st = await snap();
check(st.prompt === 'Read the headlines', `newsbox prompt (got ${JSON.stringify(st.prompt)})`);
await press();
st = await snap();
check(st.note?.startsWith('THE DAILY') === true, `newsbox headline (got ${JSON.stringify(st.note)})`);

await teleport(-42.0, 4.2); // the subway stairs
st = await snap();
check(st.prompt === 'Peek at the stairs', `subway prompt (got ${JSON.stringify(st.prompt)})`);
await press();
st = await snap();
check(st.note?.includes('F and M') === true, `subway note (got ${JSON.stringify(st.note)})`);
check(st.step === 0 && st.money === 87, 'still Day 1, still $87 — the block is open but the story is intact');

// 2 — the bench: sit → stand
await teleport(-23.3, 5.7); // street side of the bus bench
st = await snap();
check(st.prompt === 'Sit a while', `bench prompt (got ${JSON.stringify(st.prompt)})`);
const before = { x: st.capsule.x, z: st.capsule.z };
await press();
st = await snap();
check(st.sitting === true, 'sitting on the bench');
check(st.prompt === 'Stand up', `prompt flips while seated (got ${JSON.stringify(st.prompt)})`);
check(Math.hypot(st.capsule.x - (-23.3), st.capsule.z - 7.62) < 0.3,
  `capsule parked on the seat (got ${st.capsule.x.toFixed(2)}, ${st.capsule.z.toFixed(2)})`);
check(st.note?.length > 0, 'the bench says something');
await press();
st = await snap();
check(st.sitting === false, 'standing up works');
check(Math.hypot(st.capsule.x - before.x, st.capsule.z - before.z) < 0.05,
  `stand restores the exact spot (got ${st.capsule.x.toFixed(2)}, ${st.capsule.z.toFixed(2)})`);

// 3 — the shop: offer → confirm → REAL deduction
await teleport(-16, 7.0);
await teleport(-16, 12.0);
await teleport(-18, 18.3); // at the mango
st = await snap();
check(st.prompt === 'Mango \u2014 $2', `shop prompt carries the price (got ${JSON.stringify(st.prompt)})`);
await press();
st = await snap();
check(st.money === 87 && st.note?.includes('$2') === true, `first press only offers (got ${JSON.stringify(st.note)}, $${st.money})`);
await press();
st = await snap();
check(st.money === 85, `the mango costs $2 — real deduction ($${st.money})`);
check(st.moneyLabel === '$85', `money HUD reads the deduction (got ${JSON.stringify(st.moneyLabel)})`);
check(st.note?.includes('You buy the mango') === true, `buy line (got ${JSON.stringify(st.note)})`);
check(st.step === 0, 'buying does not advance the story');

// 4 — a broke wallet
await page.evaluate(() => { window.__game.state.spend(84); }); // $1 left
await teleport(-14, 18.3); // the bread, $3
await press();
await press();
st = await snap();
check(st.money === 1, `a broke wallet stays broke ($${st.money})`);
check(st.note?.includes('another day') === true, `the broke line (got ${JSON.stringify(st.note)})`);

// ---------------------------------------------------------------- pass 2: a Day-2 v1 save
await page.evaluate(() => {
  localStorage.setItem('first_slice_save_v1', JSON.stringify({
    day: 2, day_complete: true, replay: false, cart_name: "Wade's Spot",
    money: 112, awning: false, kid_kept: true, idris_served: true, lunch_served: 3,
    // no stool / map_given / permit / day_start_money — the OLD shape, on purpose
  }));
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2200); // the fade + day dressing
st = await snap();
check(st.day === 2, `Day-2 v1 save boots (day=${st.day})`);
await teleport(-18, 18.3);
st = await snap();
check(st.prompt === 'Mango \u2014 $2', `the shelf restocked on Day 2 (prompt ${JSON.stringify(st.prompt)})`);
await press();
await press();
st = await snap();
check(st.money === 110, `purchasing works on a loaded old save ($112 - $2 = $${st.money})`);

// ---------------------------------------------------------------- pass 3: the expanded block (docs/38)
// Day 2, wallet at $110. The east end now answers: alley, park bench, a
// shot, the hot dog cart, Fade King, and the laundromat's $3 load — every
// deduction real, every loop story-free.

// the alley — a read, any day (the step may be wherever Day-2 boot put it;
// what matters is the note changes nothing about it)
await teleport(32.1, 6.4);
st = await snap();
const stepBeforeAlley = st.step;
check(st.prompt === 'Peek into the alley', `alley prompt (got ${JSON.stringify(st.prompt)})`);
await press();
st = await snap();
check(st.note?.includes('green eyes') === true && st.step === stepBeforeAlley,
  `alley note reads, story untouched (note ${JSON.stringify(st.note?.slice(0, 40))}, step ${st.step} -> ${stepBeforeAlley})`);

// the park bench — sit on the seat, stand back to the street spot
await teleport(41.2, -4.2);
st = await snap();
check(st.prompt === 'Sit in the park', `park bench prompt (got ${JSON.stringify(st.prompt)})`);
const parkBefore = { x: st.capsule.x, z: st.capsule.z };
await press();
st = await snap();
check(st.sitting === true, 'sitting in the park');
check(Math.hypot(st.capsule.x - 41.5, st.capsule.z - (-5.05)) < 0.3,
  `capsule parked on the park bench (got ${st.capsule.x.toFixed(2)}, ${st.capsule.z.toFixed(2)})`);
await press();
st = await snap();
check(st.sitting === false, 'standing from the park bench works');
check(Math.hypot(st.capsule.x - parkBefore.x, st.capsule.z - parkBefore.z) < 0.05, 'park stand restores the spot');

// the half-court — one shot flies, lands, and the court resets
await teleport(43.2, 5.2);
st = await snap();
check(st.prompt === 'Shoot around', `court prompt (got ${JSON.stringify(st.prompt)})`);
await press();
await page.waitForTimeout(400);
st = await snap();
check(st.prompt === null, `the court goes quiet while the ball flies (got ${JSON.stringify(st.prompt)})`);
await page.waitForTimeout(4400); // flight + landing + reset, at software-GL half-speed
st = await snap();
check(st.prompt === 'Shoot around', 'the ball is back — the court resets itself');
const ballRest = await page.evaluate(() => {
  const b = window.__game.world.ball;
  return { x: b.position.x, y: b.position.y, z: b.position.z };
});
check(Math.hypot(ballRest.x - 43.2, ballRest.z - 5.2) < 0.05, `ball rests by the key again (got ${ballRest.x.toFixed(2)}, ${ballRest.z.toFixed(2)})`);

// the hot dog cart — $2, real
await teleport(29.8, -2.9);
st = await snap();
check(st.prompt === 'Hot dog \u2014 $2', `hot dog prompt (got ${JSON.stringify(st.prompt)})`);
await press();
st = await snap();
check(st.money === 110 && st.note?.includes('$2') === true, `first press only offers ($${st.money})`);
await press();
st = await snap();
check(st.money === 108, `the dog costs $2 — real deduction ($${st.money})`);

// Fade King — $12, once a day; the second visit is free small talk
await teleport(36.6, 6.2);
st = await snap();
check(st.prompt === 'Get a trim \u2014 $12', `barber prompt (got ${JSON.stringify(st.prompt)})`);
await press();
await press();
st = await snap();
check(st.money === 96, `the trim costs $12 ($${st.money})`);
st = await snap();
check(st.prompt === 'Fresh cut \u2014 walk on', `the fresh-cut prompt (got ${JSON.stringify(st.prompt)})`);
await press();
st = await snap();
check(st.money === 96, `a fresh head spends nothing more ($${st.money})`);

// the laundromat's $3 load — the story isn't using the bay today
await teleport(-5.9, 6.0);
st = await snap();
check(st.prompt === 'Do a load \u2014 $3', `washer prompt (got ${JSON.stringify(st.prompt)})`);
await press();
await press();
st = await snap();
check(st.money === 93, `a load costs $3 ($${st.money})`);
const spinning = await page.evaluate(() => window.__game.world.isWasherRunning());
check(spinning === true, 'the drum is turning for the $3 load');
await page.waitForTimeout(14000); // six game-seconds, at software-GL half-speed
st = await snap();
const stillSpinning = await page.evaluate(() => window.__game.world.isWasherRunning());
check(stillSpinning === false, 'the drum stops when the load is done');
check(st.note?.includes('fold') === true || st.note?.includes('done') === true || st.note?.includes('Warm') === true,
  `the load finishes with its day line (got ${JSON.stringify(st.note?.slice(0, 40))})`);

check(consoleErrors.length === 0, `console clean (${consoleErrors.length} errors${consoleErrors.length ? ': ' + consoleErrors[0] : ''})`);

await browser.close();
server.close();
console.log(failures.length === 0 ? 'FREE-ROAM PROBE OK: 0 failures' : `FREE-ROAM PROBE: ${failures.length} failures`);
process.exit(failures.length === 0 ? 0 : 1);
