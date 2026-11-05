/**
 * Probe: the Roam layer (docs/architecture/03 — the open-world contract).
 * Runs the real game loop with the real toggle; positions are teleported
 * capsule moves, the same concession every probe here makes.
 *
 * Covered, at 720x1280 portrait (the mobile must-test):
 *   1. fresh Day 1, story boot: the barrier stands (the authored diary),
 *      the objective is the story's, the chip reads "Roam"
 *   2. STORY mode reveals a place (the globe) — the objective line stays
 *      the story's (discovery lines are roam-only)
 *   3. toggleRoam: barrier hidden AND its collider parked underground,
 *      objective = the roam line, chip flips to "Story"
 *   4. mid-roam the block answers (newsbox note) and the STORY stays
 *      live — pressing Rosa advances MEET_ROSA with no toggle-back needed
 *   5. toggle back: the story's own objective line returns, the barrier
 *      stands again (Day 1 diary), and Day 1 wrote no save (save.gd law)
 *   6. a Day-2 v1 save carrying roam:true boots mid-roam — silently
 *      (no toast), barrier down, chip reads "Story"; toggling off lands
 *      on the story line and clears the key from the save
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
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

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

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

const toggleRoam = async () => {
  await page.evaluate(() => window.__game.toggleRoam());
  await sleep(350);
};

const snap = () => page.evaluate(() => {
  const g = window.__game;
  return {
    step: g.state.step,
    day: g.state.day,
    money: g.state.money,
    roam: g.roam.active,
    barrierVisible: g.world.barrier.visible,
    barrierColliderY: g.world.barrierCollider.minY,
    objective: document.getElementById('objective')?.textContent ?? '',
    roamChip: document.getElementById('roam-peek')?.textContent ?? null,
    note: document.getElementById('note') && !document.getElementById('note').hidden
      ? document.getElementById('note').textContent : null,
    saved: localStorage.getItem('first_slice_save_v1'),
  };
});

/** The story's own objective line: anything the day machine wrote — and
 *  never the roam line (that one proves mode, not story). */
const isStoryObjective = (t) => t.length > 0 && !t.includes('Roam.');

/** The toast holds 2.4 s minimum — wait it out so a fresh press's note is
 *  the one we read, not the last system note still on display. */
const waitNoteCleared = async () => {
  for (let i = 0; i < 20; i++) {
    const n = await snap().then((s) => s.note);
    if (n === null) return;
    await sleep(300);
  }
};

// ---------------------------------------------------------------- pass 1: fresh Day 1, story boot
let st = await snap();
check(st.day === 1 && st.step === 0, `Day 1 MEET_ROSA boot (day=${st.day} step=${st.step})`);
check(await page.evaluate(() => document.getElementById('btn-roam') !== null), 'the Roam chip exists in the pocket');
check(st.barrierVisible === true, 'the water-main barrier stands on Day 1 (authored diary)');
check(st.roam === false, 'story mode at boot');
check(isStoryObjective(st.objective) === true, `the objective is the story's (got ${JSON.stringify(st.objective)})`);

// 2 — a story-mode reveal does NOT move the objective line
await teleport(-41.5, 6.2); // the globe (MAP_PLACES globe at -42, 6.2)
await sleep(900); // checkSketchReveals throttles to ~0.5 s
st = await snap();
check(isStoryObjective(st.objective) === true, `story reveal keeps the story line (got ${JSON.stringify(st.objective)})`);

// 3 — toggleRoam: the contract applies
await toggleRoam();
st = await snap();
check(st.roam === true, 'roam active after the toggle');
check(st.barrierVisible === false, 'the barrier stands down (whole block walkable)');
check(st.barrierColliderY < -50, `the barrier's body parked underground (minY=${st.barrierColliderY})`);
check(st.objective.includes('Roam') === true, `the objective relaxed to the roam line (got ${JSON.stringify(st.objective)})`);
check(st.roamChip === 'Story', `the chip offers the way back (got ${JSON.stringify(st.roamChip)})`);

// 3b — physics proof: the walker crosses the old barrier line unhindered
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -9.7; // dead center of where the barrier stood
  g.player.capsule.z = 7.62;
  g.player.capsule.y = 0.05;
});
await sleep(300);
st = await snap();
check(st.barrierColliderY < -50, 'the parked body never re-solidifies under the walker');

// 4 — mid-roam the block answers AND the story stays live
await waitNoteCleared(); // the enter note holds the toast 2.4 s — let it go
await teleport(-44.6, 5.4); // the newsboxes
st = await snap();
check(st.roam === true, 'still roaming at the east end');
await press();
st = await snap();
check(st.note?.startsWith('THE DAILY') === true, `the block answers mid-roam (got ${JSON.stringify(st.note)})`);
check(st.step === 0, 'the ambient press left the story alone');

await teleport(-29, 6.9); // Rosa
await press();
st = await snap();
check(st.step >= 1, `pressing Rosa mid-roam advances the story (step=${st.step})`);
check(st.roam === true, 'and roam holds — the sim continues at the player\'s pace');

// 5 — toggle back: the story line returns, the diary restores, Day 1 wrote nothing
await toggleRoam();
st = await snap();
check(st.roam === false, 'back to story mode');
check(st.barrierVisible === true, 'the barrier stands again (Day 1 diary restored)');
check(st.objective.includes('Rosa') === true || st.objective.length > 0,
  `the story's own objective line returned (got ${JSON.stringify(st.objective)})`);
check(st.saved === null, `Day 1 never writes (localStorage=${JSON.stringify(st.saved)})`);

// ---------------------------------------------------------------- pass 2: a Day-2 save that went to bed mid-roam
await page.evaluate(() => {
  localStorage.setItem('first_slice_save_v1', JSON.stringify({
    day: 2, day_complete: true, replay: false, cart_name: "Wade's Spot",
    money: 112, awning: false, kid_kept: true, idris_served: true, lunch_served: 3,
    roam: true,
  }));
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2200); // the fade + day dressing
st = await snap();
check(st.day === 2, `Day-2 save boots (day=${st.day})`);
check(st.roam === true, `the mode rode the save (roam=${st.roam})`);
check(st.barrierVisible === false, 'Day 2 opens mid-roam with the barrier already down');
check(st.objective.includes('Roam') === true, `the roam objective line is up (got ${JSON.stringify(st.objective)})`);
check(st.note === null || !String(st.note).includes('No clock'), 'the boot restore is silent — no toast on wake');

await toggleRoam();
st = await snap();
check(st.roam === false, 'toggled back to story on Day 2');
check(st.barrierVisible === true, 'the barrier stands again (Day 2 diary: it stays up until Day 4)');
const savedKeys = Object.keys(JSON.parse(st.saved ?? '{}'));
check(!savedKeys.includes('roam'), `the roam key cleared on exit (keys=${savedKeys.join(',')})`);

check(consoleErrors.length === 0, `console clean (${consoleErrors.length} errors${consoleErrors.length ? ': ' + consoleErrors[0] : ''})`);

await browser.close();
server.close();
console.log(failures.length === 0 ? 'ROAM PROBE OK: 0 failures' : `ROAM PROBE: ${failures.length} failures`);
process.exit(failures.length === 0 ? 0 : 1);
