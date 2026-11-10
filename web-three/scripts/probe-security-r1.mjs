/**
 * R1 security probe (FS-AUDIT-001) — the production debug-driver boundary,
 * verified against the REAL built output (dist/) through the REAL entry
 * points (crafted URLs), not a duplicated helper.
 *
 * What it proves:
 *   P1  production + ?autotest=1          → driver never starts, player save untouched
 *   P2  production + ?scenario=x          → driver never starts, world save untouched
 *   P2b production + ?scenario=schedules  → the REAL scenario value is gated too
 *   P3  production + both params          → gated
 *   P4  production + junk/hostile params  → no destructive op, no page errors
 *   N1  production + plain URL            → ordinary gameplay boots clean (unchanged)
 *   D1  authorized + ?autotest=1          → driver starts AND runs sandboxed:
 *                                             real save key survives, driver key used
 *   D2  authorized + ?scenario=schedules  → scenario runs on the driver world key;
 *                                             real world save untouched
 *
 * Usage: node scripts/probe-security-r1.mjs   (build dist/ first: npm run build)
 * Exit 0 only when every check passes.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4595;
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

const results = [];
const check = (ok, what, detail = '') => {
  results.push({ ok, what, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? ` — ${detail}` : ''}`);
  return ok;
};

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'],
});

const STORY_SEED = JSON.stringify({
  day: 4, day_complete: true, replay: false, cart_name: 'The Regular', money: 240,
  awning: true, kid_kept: true, idris_served: true, lunch_served: 2,
  day_start_money: 240, stool: true, map_given: true, permit: true,
});
const STORY_KEY = 'first_slice_save_v1';
const WORLD_KEY = 'first_slice_world_v1';
const DRIVER_STORY_KEY = 'first_slice_save_v1_driver';
const DRIVER_WORLD_KEY = 'first_slice_world_v1_driver';

/** A page that seeds a REAL player save and (optionally) the driver handshake. */
async function newSeededPage({ authorized, url, seedWorld = null }) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const consoleLines = [];
  const errors = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([story, world, auth]) => {
    if (story !== null) localStorage.setItem('first_slice_save_v1', story);
    if (world !== null) localStorage.setItem('first_slice_world_v1', world);
    if (auth) sessionStorage.setItem('fs_driver_authorized', '1');
  }, [STORY_SEED, seedWorld, authorized]);
  await page.goto(`http://localhost:${PORT}/${url}`, { waitUntil: 'load' });
  return { page, consoleLines, errors };
}

// ---------------------------------------------------------------------------
// N0: capture a VALID world save document (the game's own writer, on a clean
// profile) — the tamper target for the scenario probes.
// ---------------------------------------------------------------------------
let validWorldDoc = null;
{
  const { page } = await newSeededPage({ authorized: false, url: '' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 60000 });
  await page.evaluate(() => window.__game.worldSim.flushWorldSave());
  validWorldDoc = await page.evaluate(() => localStorage.getItem('first_slice_world_v1'));
  await page.close();
  check(typeof validWorldDoc === 'string' && validWorldDoc.includes('first-slice-world'),
    'N0: a valid world save document captured from the game itself');
}

// ---------------------------------------------------------------------------
// P1: production + ?autotest=1 — the driver must never start; the seeded
// day-4/$240 story save must survive byte-for-byte.
// ---------------------------------------------------------------------------
{
  const { page, consoleLines, errors } = await newSeededPage({ authorized: false, url: '?autotest=1' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 60000 });
  await page.waitForTimeout(4000); // an ungated driver would have wiped and started by now
  const story = await page.evaluate(() => localStorage.getItem('first_slice_save_v1'));
  const driverStory = await page.evaluate(() => localStorage.getItem('first_slice_save_v1_driver'));
  const started = await page.evaluate(() => window.__AUTOTEST__ !== undefined);
  // NOTE: ordinary gameplay legitimately persists its own day-start snapshot
  // on boot (the save law, unchanged by R1) — the regression that matters is
  // the WIPE: the seeded day-4/$240 progress must SURVIVE.
  const parsed = JSON.parse(story ?? '{}');
  check(parsed.day === 4 && parsed.money === 240 && parsed.cart_name === 'The Regular',
    'P1: ?autotest=1 (production, no handshake) leaves the player story save intact (day 4, $240)',
    `day=${parsed.day} money=${parsed.money}`);
  check(!started, 'P1: the autotest driver never starts');
  check(driverStory === null, 'P1: no driver sandbox key was created');
  check(consoleLines.some((t) => t.includes('[driver] ?autotest ignored')),
    'P1: the boundary says so honestly in the console', consoleLines.find((t) => t.includes('[driver]'))?.slice(0, 90) ?? '');
  check(errors.length === 0, 'P1: no page errors', errors.join(' | '));
  await page.close();
}

// ---------------------------------------------------------------------------
// P2/P2b/P4: production + scenario params — never destructive.
// ---------------------------------------------------------------------------
for (const [label, url] of [
  ['P2: ?scenario=x (arbitrary value)', '?scenario=x'],
  ['P2b: ?scenario=schedules (the real driver value)', '?scenario=schedules'],
  ['P3: ?autotest=1&scenario=schedules (both at once)', '?autotest=1&scenario=schedules'],
  ['P4: ?scenario=%3Cscript%3Ealert(1)%3C%2Fscript%3E (hostile value)', '?scenario=%3Cscript%3Ealert(1)%3C%2Fscript%3E'],
]) {
  const { page, errors } = await newSeededPage({ authorized: false, url, seedWorld: validWorldDoc });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 60000 });
  await page.waitForTimeout(3500);
  const world = await page.evaluate(() => localStorage.getItem('first_slice_world_v1'));
  const report = await page.evaluate(() => window.__SCENARIO_REPORT__ !== undefined);
  const at = await page.evaluate(() => window.__AUTOTEST__ !== undefined);
  check(world === validWorldDoc, `${label}: the world save is byte-identical`);
  check(!report && !at, `${label}: neither driver starts`);
  check(errors.length === 0, `${label}: no page errors`, errors.join(' | '));
  await page.close();
}

// ---------------------------------------------------------------------------
// N1: plain production URL — ordinary gameplay is unchanged (no gate side
// effects, no sandbox keys, story boots from the seeded save).
// ---------------------------------------------------------------------------
{
  const { page, errors } = await newSeededPage({ authorized: false, url: '' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  const story = await page.evaluate(() => localStorage.getItem('first_slice_save_v1'));
  const day = await page.evaluate(() => window.__game.bootedFromDay);
  const parsed = JSON.parse(story ?? '{}');
  check(parsed.day === 4 && parsed.money === 240, 'N1: a plain load keeps the player save intact (day 4, $240)', `day=${parsed.day} money=${parsed.money}`);
  check(day === 4, 'N1: ordinary gameplay resumed the day-4 save (unchanged boot law)');
  check(errors.length === 0, 'N1: no page errors', errors.join(' | '));
  await page.close();
}

// ---------------------------------------------------------------------------
// D1: AUTHORIZED ?autotest=1 — the driver starts, and the seeded REAL save
// is still there afterwards because the driver runs on the sandbox keys.
// (The driver itself is exercised end-to-end by scripts/e2e.mjs.)
// ---------------------------------------------------------------------------
{
  const { page, consoleLines, errors } = await newSeededPage({ authorized: true, url: '?autotest=1' });
  let started = false;
  try {
    await page.waitForFunction(() => window.__AUTOTEST__ !== undefined, null, { timeout: 45000 });
    started = true;
  } catch { /* reported below */ }
  await page.waitForTimeout(3000); // let the driver's own wipeSave() land
  const story = await page.evaluate(() => localStorage.getItem('first_slice_save_v1'));
  const bootDay = await page.evaluate(() => window.__game.bootedFromDay);
  const parsed = JSON.parse(story ?? '{}');
  check(started, 'D1: authorized ?autotest=1 starts the driver (dev workflow preserved)');
  // THE sandbox proof: the seeded save says day 4 — if the session had read
  // the player key, bootedFromDay would be 4. It booted the DRIVER key
  // (empty → day 1), so the driver's whole world is the sandbox.
  check(bootDay === 1, 'D1: the session booted from the DRIVER key, not the player save (sandbox active)', `bootedFromDay=${bootDay}`);
  check(parsed.day === 4 && parsed.money === 240, 'D1: the REAL player story save survives the running driver (day 4, $240 intact)', `day=${parsed.day} money=${parsed.money}`);
  check(consoleLines.some((t) => t.includes('[driver] authorized')), 'D1: the authorization is announced honestly');
  check(errors.length === 0, 'D1: no page errors', errors.join(' | '));
  await page.close();
}

// ---------------------------------------------------------------------------
// D2: AUTHORIZED ?scenario=schedules — the scenario starts on the driver
// world key; the real world save is untouched. (Full 15-step proof:
// scripts/probe-world-sim.mjs.)
// ---------------------------------------------------------------------------
{
  const { page, consoleLines, errors } = await newSeededPage({ authorized: true, url: '?scenario=schedules', seedWorld: validWorldDoc });
  // the scenario streams to the console as it goes; the full report lands
  // only after several accelerated minutes (probe-world-sim runs it to the end)
  try {
    await page.waitForFunction(() => window.__SCENARIO_REPORT__ !== undefined, null, { timeout: 30000 });
  } catch { /* the console/stream check below still proves the run started */ }
  await page.waitForTimeout(1500);
  const world = await page.evaluate(() => localStorage.getItem('first_slice_world_v1'));
  const driverWorld = await page.evaluate(() => localStorage.getItem('first_slice_world_v1_driver'));
  const bootedDriverWorld = await page.evaluate(() => window.__game.worldSim.bootedFresh);
  const scenarioLogged = consoleLines.some((t) => t.includes('[scenario]'));
  const authorizedLogged = consoleLines.some((t) => t.includes('[driver] authorized'));
  check(authorizedLogged, 'D2: the session is authorized (handshake accepted)');
  check(scenarioLogged || driverWorld !== null, 'D2: authorized ?scenario=schedules runs the scenario',
    scenarioLogged ? '[scenario] lines streaming' : 'driver world key present');
  check(world === validWorldDoc, 'D2: the REAL player world save is byte-identical while the scenario runs');
  check(driverWorld !== null || bootedDriverWorld === true,
    'D2: the scenario rides the driver sandbox key', driverWorld ? DRIVER_WORLD_KEY : '(fresh world booted on the driver key)');
  check(errors.length === 0, 'D2: no page errors', errors.join(' | '));
  await page.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\nR1 PROBE: ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  - ${f.what}`);
  process.exit(1);
}
console.log('R1 PROBE OK — production URLs cannot trigger destructive debug operations; authorized drivers run sandboxed');
