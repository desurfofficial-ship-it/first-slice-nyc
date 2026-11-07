/**
 * WP-7 — the MS-1 "Clock Street" demonstration probe: the milestone's
 * exit sentence, proven in one browser run of the real built game (dist/).
 *
 * MS-1 (the player-facing bar, NEXT-PHASE-EXECUTION-PLAN §0):
 *   "a roam afternoon where Idris appears at the platform at 07:40 and
 *    the deli closes at 22:00 — in-game time, zero story rewiring; the
 *    date and the field diary readable on screen; every dollar traceable
 *    to the ledger; the E2E's money assertions ($87→$112→$123) passing
 *    unchanged."
 *
 * This probe drives ONE roam afternoon at accelerated in-game time and
 * demonstrates each clause:
 *
 *   1. 07:40 platform occupancy — the in-page frame watcher samples the
 *      bound cast the first in-game minute the clock reaches 07:40: Idris
 *      stands his platform window (07:22–07:52), routed over the nav
 *      graph (WP-3v's commute), visible on the street. Screenshot.
 *   2. 22:00 deli close — the same watcher samples the deli's door route
 *      at 21:58 (open — ROS-01's canon hours 06:00–22:00) and again the
 *      first minute at/after 22:00 (refused: PLACE_INACCESSIBLE — a
 *      closed door is not an edge). Screenshot.
 *   3. the date readable on screen — the HUD dateline renders "September
 *      9 · Year 1" through `datelineOfStoryDay` ONLY (the one mapping);
 *      the Map's diary leaf mounts behind "my diary" and the leaf shares
 *      the dateline. Screenshot with the Map open.
 *   4. every dollar traceable — genesis $87.00 on BOTH sides of the
 *      sanctioned mirror, audit clean; after the whole roam afternoon the
 *      ledger is STILL $87.00 and audit-clean (roam invents no money and
 *      loses none); the story is untouched (day 1, wallet $87 — zero
 *      story rewiring). The $87→$112→$123 transactional math itself is
 *      the floor gates' evidence (probe-money-trace + the 4-day E2E),
 *      run green in the same WP-7 battery.
 *
 * The in-game waiters are a probe fixture (a rAF watcher writing marks to
 * window.__MS1__) — no product code is touched (the WS-F law). Exit 0 =
 * every clause demonstrated AND the console stayed clean.
 *
 * Usage: npm run build first, then `node scripts/probe-ms1-clock-street.mjs`.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const SHOTS = new URL('../shots', import.meta.url).pathname;
const PORT = 4627;
// 300 sim-min per real second: 07:15 → 22:01 is ~3 real minutes. The E2E's
// viewport law (software-GL dt clamp) — 900×700, fx off.
const TIME_SCALE = Number(process.env.MS1_CLOCK ?? 300);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

if (!existsSync(DIST)) {
  console.error('probe-ms1-clock-street: no dist/ — run `npm run build` first');
  process.exit(1);
}
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });

// ---- setup: the controlled roam afternoon --------------------------------
const setup = await page.evaluate((scale) => {
  const g = window.__game;
  const sim = g.worldSim;
  try { localStorage.removeItem(sim.debug().saveKey); } catch { /* fresh */ }
  const reload = sim.reloadFromSave();
  if (!g.roam.active) g.toggleRoam();
  sim.setActive(true);
  sim.brain.timeScale = scale;

  // the frame watcher — records each MS-1 mark exactly once, on the real
  // rAF loop, so accelerated time cannot skip a clause (probe fixture)
  const w = window;
  w.__MS1__ = {
    marks: {},          // name → capture payload (undefined until hit)
    simStart: sim.debug().time,
    genesis: null,
  };
  const routeTo = () => sim.nav.routeToPlace({ x: -16, z: 2 }, 'BODEGA-INT', sim.debug().clock.minuteOfDay);
  const idris = () => {
    const n = sim.debug().npcs.find((x) => x.npcId === 'npc:idris_warsame');
    return n ? { claim: n.claim, kind: n.kind, visible: n.visible, pos: n.pos, routed: n.routed ?? null, routesWalked: n.routesWalked ?? 0 } : null;
  };
  const d = sim.debug();
  w.__MS1__.genesis = {
    playerCents: d.ledger.playerCents, ledgerCents: d.ledger.ledgerCents,
    auditClean: d.ledger.auditClean, txnCount: d.ledger.txnCount,
    storyDay: g.state.day, storyMoney: g.state.money,
    bootTime: d.time,
  };
  const taken = {};
  const frame = () => {
    const dbg = sim.debug();
    const m = dbg.clock.minuteOfDay;
    const take = (name, fn) => {
      if (!taken[name]) { taken[name] = true; w.__MS1__.marks[name] = fn(dbg, m); }
    };
    if (m >= 460) take('platform0740', () => ({ simTime: dbg.time, idris: idris() }));
    if (m >= 1318) take('deliBefore2158', () => ({ simTime: dbg.time, ask: routeTo() }));
    if (m >= 1320) take('deliAfter2200', () => ({
      simTime: dbg.time, ask: routeTo(),
      rosa: (() => { const r = sim.debug().npcs.find((x) => x.npcId === 'npc:rosa_delgado');
        return r ? { claim: r.claim, bodyMode: r.bodyMode, visible: r.visible } : null; })(),
    }));
    if (dbg.day >= 2) take('dayRolled', () => ({ simTime: dbg.time, day: dbg.day }));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return { bootTime: w.__MS1__.genesis.bootTime, genesis: w.__MS1__.genesis, roam: g.roam.active, scale };
}, TIME_SCALE);

const steps = [];
const check = (ok, label) => { steps.push(`${ok ? 'PASS' : 'FAIL'} ${label}`); return ok; };
let ok = true;

ok = check(setup.genesis.playerCents === 8700 && setup.genesis.ledgerCents === 8700,
  `genesis $87.00 on both sides of the mirror (mirror ${setup.genesis.playerCents}, ledger ${setup.genesis.ledgerCents})`) && ok;
ok = check(setup.genesis.auditClean && setup.genesis.txnCount === 0,
  'genesis ledger audits clean — the shipped start is genesis, not a transaction') && ok;
ok = check(setup.genesis.storyDay === 1 && setup.genesis.storyMoney === 87,
  `the story is untouched at boot (day ${setup.genesis.storyDay}, wallet $${setup.genesis.storyMoney})`) && ok;
ok = check(setup.roam, `roam active — the afternoon runs beside the story (clock ${setup.bootTime} → 22:00 at ${TIME_SCALE}×)`) && ok;

// ---- the date and the diary readable on screen (clause 3) ----------------
const dateline = await page.evaluate(() => {
  const el = document.getElementById('hud-dateline');
  return { text: el?.textContent ?? null, visible: !!el && el.offsetParent !== null };
});
ok = check(dateline.text === 'September 9 · Year 1',
  `the HUD dateline reads "September 9 · Year 1" — datelineOfStoryDay, the ONE mapping (got "${dateline.text}")`) && ok;
ok = check(dateline.visible, 'the dateline is on screen (the date readable)') && ok;

// the Map opens; the diary leaf mounts behind its tab (the ink is readable)
await page.evaluate(() => window.__game.toggleMap());
await page.waitForFunction(() => !!document.getElementById('diary-tab'), null, { timeout: 10000 });
const leaf = await page.evaluate(() => {
  const tab = document.getElementById('diary-tab');
  const dl = document.getElementById('map-diary-dateline');
  return {
    tabText: tab?.textContent ?? null, tabVisible: !!tab && tab.offsetParent !== null,
    leafDateline: dl?.textContent ?? null,
  };
});
ok = check(leaf.tabText === 'my diary' && leaf.tabVisible,
  `the Map sheet carries the diary tab in voice ("${leaf.tabText}")`) && ok;
await page.click('#diary-tab');
await page.waitForFunction(() => !!document.getElementById('map-diary-leaf'), null, { timeout: 10000 });
const leafOpen = await page.evaluate(() => {
  const l = document.getElementById('map-diary-leaf');
  const dl = document.getElementById('map-diary-dateline');
  const empty = document.getElementById('map-diary-empty');
  return { leafVisible: !!l && l.offsetParent !== null, leafDateline: dl?.textContent ?? null, emptyVoice: empty?.textContent ?? null };
});
ok = check(leafOpen.leafVisible, 'the diary leaf folds open over the Map (the diary readable)') && ok;
ok = check(leafOpen.leafDateline === 'September 9 · Year 1',
  `the leaf shares the HUD's dateline ("${leafOpen.leafDateline}")`) && ok;
await page.screenshot({ path: join(SHOTS, 'ms1-dateline-diary.png') });
await page.evaluate(() => window.__game.toggleMap()); // fold back; the afternoon keeps running

// ---- wait for the 07:40 mark, shoot the platform -------------------------
const waitMark = async (name, timeoutMs) => {
  await page.waitForFunction((n) => {
    const ms = window.__MS1__;
    return !!ms && ms.marks[n] !== undefined;
  }, name, { timeout: timeoutMs, polling: 200 });
};
try {
  await waitMark('platform0740', 120000);
  const cap = await page.evaluate(() => window.__MS1__.marks.platform0740);
  ok = check(cap.idris !== null && cap.idris.claim === 'se-idris-platform' && cap.idris.visible,
    `07:40 platform occupancy: Idris stands his window (${cap.simTime}, claim=${cap.idris?.claim}, visible=${cap.idris?.visible}, routed=${cap.idris?.routed}, walks=${cap.idris?.routesWalked})`) && ok;
  await page.screenshot({ path: join(SHOTS, 'ms1-platform-0740.png') });
} catch {
  ok = check(false, '07:40 platform occupancy — the mark never fired in 120 s real');
}

// ---- wait for the 22:00 close, shoot the street --------------------------
try {
  await waitMark('deliAfter2200', 300000);
  const before = await page.evaluate(() => window.__MS1__.marks.deliBefore2158);
  const after = await page.evaluate(() => window.__MS1__.marks.deliAfter2200);
  ok = check(before.ask.route !== null,
    `21:58: the deli door is a routed corridor (open — ROS-01 06:00–22:00; ${before.simTime})`) && ok;
  ok = check(after.ask.route === null && after.ask.reason === 'PLACE_INACCESSIBLE',
    `22:00: the deli is CLOSED — a locked door is not an edge (${after.simTime}, reason=${after.ask.reason})`) && ok;
  await page.screenshot({ path: join(SHOTS, 'ms1-deli-close-2200.png') });
} catch {
  ok = check(false, '22:00 deli close — the mark never fired in 300 s real');
}

// ---- the ledger after the whole afternoon (clause 4) ---------------------
const after = await page.evaluate(() => {
  const d = window.__game.worldSim.debug();
  const g = window.__game;
  return {
    playerCents: d.ledger.playerCents, ledgerCents: d.ledger.ledgerCents,
    auditClean: d.ledger.auditClean, txnCount: d.ledger.txnCount,
    simTime: d.time, simDay: d.day,
    storyDay: g.state.day, storyMoney: g.state.money,
  };
});
ok = check(after.ledgerCents === 8700 && after.playerCents === after.ledgerCents,
  `after the roam afternoon the ledger still reads $87.00 — roam invents no money (mirror ${after.playerCents}, ledger ${after.ledgerCents}, txns ${after.txnCount})`) && ok;
ok = check(after.auditClean, 'the ledger audit is STILL clean — every dollar = genesis + Σ(transactions)') && ok;
ok = check(after.storyDay === 1 && after.storyMoney === 87,
  `zero story rewiring — the story day/wallet never moved (day ${after.storyDay}, $${after.storyMoney}) while the world lived to ${after.simTime} day ${after.simDay}`) && ok;

ok = check(errors.length === 0, `console clean (${errors.length} errors)`) && ok;
for (const e of errors) console.error(`CONSOLE: ${e}`);

await browser.close();
server.close();

console.log(`\n--- the Clock Street afternoon (boot ${setup.bootTime} → ${after.simTime}, sim day ${after.simDay}) ---`);
for (const s of steps) console.log(s);
console.log(`
--- MS-1 exit sentence, demonstrated ---
"a roam afternoon where Idris appears at the platform at 07:40 and the
 deli closes at 22:00 — in-game time, zero story rewiring; the date and
 the field diary readable on screen; every dollar traceable to the
 ledger; the E2E's money assertions (\$87→\$112→\$123) passing unchanged."
  · 07:40 platform occupancy ........ the platform0740 mark (screenshot)
  · 22:00 deli close ................ the deliAfter2200 mark (screenshot)
  · date + diary readable ........... dateline + leaf assertions (screenshot)
  · every dollar traceable .......... genesis audit + afternoon re-audit
  · \$87→\$112→\$123 unchanged ....... probe-money-trace + the 4-day E2E (floor gates)
  · artifacts ........................ web-three/shots/ms1-*.png`);
console.log(ok ? '\nprobe-ms1-clock-street: ALL CHECKS PASSED' : '\nprobe-ms1-clock-street: FAILURES PRESENT');
process.exit(ok ? 0 : 1);
