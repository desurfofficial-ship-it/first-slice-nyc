/**
 * GFX-input abuse probe (QA continuation, Job 523083) — the graphics wave's
 * NEW URL surface (?gfx= ?tod= ?fx= ?bloom=… ) attacked the way R1 attacks
 * the driver gate: hostile/malformed values against the REAL built output.
 *
 * What it proves:
 *   P1  malformed ?gfx= values      → detection governs, boot clean, no page errors
 *   P2  malformed ?tod= values      → day state stays finite/plausible, boot clean
 *   P3  ?fx=off beats gfx/flags     → composer off, pass flags honest
 *   P4  unknown ?fx= value          → ignored (only 'off' means anything)
 *   P5  flag spam + unknown params  → ignored, boot clean
 *   P6  __proto__/constructor keys  → no pollution path through the parser
 *   P7  worldclock × gfx × tod      → the hardened worldclock gate still holds
 *   P8  prototype-member ?gfx=      → detection governs; pixelRatioCap stays
 *                                     finite (the FS-QA2-004 fix in the field)
 *   P9  the REAL player save        → the key survives every hostile boot with
 *                                     its day intact (the R1 law; the game's own
 *                                     partial-seed normalization applies
 *                                     identically on the plain URL — byte-equality
 *                                     was never the contract)
 *   D1  ?gfx=high (positive)        → forced tier honored, composer on
 *   D2  ?tod= boundary pins         → 00:00/04:30/05:30/23:59 all finite & in band
 *
 * Usage: node scripts/probe-gfx-abuse.mjs   (build dist/ first: npm run build)
 * Exit 0 only when every check passes.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4612;
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

/** Boot a (optionally hostile) URL; seed a REAL player save unless asked not
 *  to; return the observables. */
async function hostileBoot(url, { seedSave = true } = {}) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  if (seedSave) {
    await page.addInitScript(([story]) => {
      localStorage.setItem('first_slice_save_v1', story);
    }, [STORY_SEED]);
  }
  await page.goto(`http://localhost:${PORT}/${url}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 60000 });
  await page.waitForTimeout(1800); // the day-state exp lerp settles; render loop runs
  const gfx = await page.evaluate(() => {
    const g = window.__game;
    return {
      tier: g.gfx.tier, forced: g.gfx.forced, composer: g.gfx.composer,
      bloom: g.gfx.bloom, ssao: g.gfx.ssao, grain: g.gfx.grain, ca: g.gfx.ca,
      sharpen: g.gfx.sharpen, envMap: g.gfx.envMap, bloomFullRes: g.gfx.bloomFullRes,
      pixelRatioCap: g.gfx.pixelRatioCap,
      exposure: g.world.dayState.exposure, nightK: g.world.dayState.nightK,
      fogDensity: g.world.dayState.fogDensity, sunEnergy: g.world.dayState.sunEnergy,
    };
  });
  const save = seedSave ? await page.evaluate((k) => localStorage.getItem(k), STORY_KEY) : null;
  await page.close();
  return { gfx, save, consoleErrors, pageErrors };
}

const TIER_KEYS = new Set(['low', 'medium', 'high', 'ultra']);
/** The save law is KEY SURVIVAL with its day intact (R1's convention) — the
 *  game normalizes a partial seed on boot (verified identical on the plain
 *  URL), so byte-equality was never the contract. */
const saveSurvives = (save) => {
  if (save === null) return false;
  try { return JSON.parse(save).day === 4; } catch { return false; }
};
/** Under SwiftShader every UNFORCED boot runs ~50–60 ms frames, so the
 *  auto-degrade watchdog legitimately fires within the settle window:
 *  applyGfxTier('low') re-resolves with a now-known tier and marks the
 *  config forced (the runtime knob's own semantics — the resolver-level
 *  contract `forced=false for garbage` is pinned by the unit tests). Here
 *  we assert the PLAYER-VISIBLE invariants only. */
const tierSane = (g) => TIER_KEYS.has(g.tier) && Number.isFinite(g.pixelRatioCap);
const finiteIn = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
const cleanBoot = (r) => r.pageErrors.length === 0 && r.consoleErrors.length === 0;
const daySane = (g) => finiteIn(g.exposure, 0.9, 1.25) && finiteIn(g.nightK, 0, 1)
  && finiteIn(g.fogDensity, 0.001, 0.02) && finiteIn(g.sunEnergy, 0, 2);

// ---- P1: malformed ?gfx= — detection must govern, boot must stay clean ----
const GFX_JUNK = ['<script>alert(1)</script>', 'ULTRA', '', 'high;alert(1)', '__proto__',
  'high%00', 'ultra extra', '0', '-1', 'high#', encodeURIComponent('high&bloom=1')];
for (const junk of GFX_JUNK) {
  const r = await hostileBoot(`?gfx=${encodeURIComponent(junk)}`);
  check(
    cleanBoot(r) && tierSane(r.gfx) && daySane(r.gfx) && saveSurvives(r.save),
    `P1 malformed ?gfx=${JSON.stringify(junk).slice(0, 28)} → detection governs, clean`,
    cleanBoot(r) ? `tier=${r.gfx.tier}` : `errors: ${[...r.pageErrors, ...r.consoleErrors].slice(0, 2).join(' | ')}`,
  );
}

// ---- P2: malformed ?tod= — the day state must stay finite and in band ----
const TOD_JUNK = ['99:99', 'abc:xy', '-5:30', '24:00', '::::', '1e999', '12.9.9', ':', '12:',
  '99999999999:59', '12:60', '-99:-99', '⁠12:30'];
for (const junk of TOD_JUNK) {
  const r = await hostileBoot(`?tod=${encodeURIComponent(junk)}`);
  check(
    cleanBoot(r) && daySane(r.gfx) && saveSurvives(r.save),
    `P2 malformed ?tod=${JSON.stringify(junk).slice(0, 16)} → day state finite, clean`,
    cleanBoot(r) ? `exp=${r.gfx.exposure.toFixed(3)} nightK=${r.gfx.nightK.toFixed(2)}` : `errors: ${[...r.pageErrors, ...r.consoleErrors].slice(0, 2).join(' | ')}`,
  );
}

// ---- P3: ?fx=off wins over everything; pass flags collapse honest ----
{
  const r = await hostileBoot('?fx=off&gfx=ultra&bloom=1&ssao=1&grain=1&ca=1&sharpen=1&envmap=1');
  check(
    cleanBoot(r) && r.gfx.forced && !r.gfx.composer && !r.gfx.bloom && !r.gfx.ssao
      && !r.gfx.grain && !r.gfx.ca && !r.gfx.sharpen && daySane(r.gfx),
    'P3 ?fx=off beats gfx=ultra + all flags → composer off, flags collapsed',
    `composer=${r.gfx.composer} bloom=${r.gfx.bloom}`,
  );
}

// ---- P4: an unknown ?fx= value means nothing ----
{
  const r = await hostileBoot('?fx=weird&gfx=high');
  check(
    cleanBoot(r) && r.gfx.forced && r.gfx.tier === 'high',
    'P4 ?fx=weird ignored; ?gfx=high still forced',
    `tier=${r.gfx.tier} forced=${r.gfx.forced}`,
  );
}

// ---- P5: flag spam + unknown params ignored ----
{
  const r = await hostileBoot('?bloom=x&ssao=&grain=false&ca=1&sharpen=0&envmap=1&bloomFullRes=1&foo=bar&gfx=high');
  check(
    cleanBoot(r) && r.gfx.tier === 'high' && daySane(r.gfx) && saveSurvives(r.save),
    'P5 flag spam + unknown params ignored, boot clean',
    `tier=${r.gfx.tier}`,
  );
}

// ---- P6: prototype-ish keys through the parser ----
{
  const r = await hostileBoot('?__proto__=x&constructor=1&prototype=1&gfx=medium');
  check(
    cleanBoot(r) && r.gfx.tier === 'medium' && saveSurvives(r.save),
    'P6 __proto__/constructor keys harmless',
    `tier=${r.gfx.tier}`,
  );
}

// ---- P7: worldclock combos — the hardened gate still holds ----
{
  const r = await hostileBoot('?worldclock=999999&gfx=ultra&tod=03:00');
  check(cleanBoot(r) && daySane(r.gfx) && saveSurvives(r.save),
    'P7 worldclock=999999 × gfx=ultra × tod=03:00 → clean', `tier=${r.gfx.tier}`);
  const r2 = await hostileBoot('?worldclock=abc&gfx=medium&tod=99:99');
  check(cleanBoot(r2) && daySane(r2.gfx) && saveSurvives(r2.save),
    'P7 worldclock=abc × gfx=medium × tod=99:99 → clean', `tier=${r2.gfx.tier}`);
}

// ---- P8: prototype-member ?gfx= values — detection governs, cap finite ----
for (const k of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
  const r = await hostileBoot(`?gfx=${k}`);
  check(
    cleanBoot(r) && tierSane(r.gfx) && daySane(r.gfx),
    `P8 ?gfx=${k} → detection governs, pixelRatioCap finite`,
    cleanBoot(r) ? `tier=${r.gfx.tier} cap=${r.gfx.pixelRatioCap}` : `errors: ${[...r.pageErrors, ...r.consoleErrors].slice(0, 2).join(' | ')}`,
  );
}

// ---- D1: positive control — a forced tier is honored ----
{
  const r = await hostileBoot('?gfx=high');
  check(cleanBoot(r) && r.gfx.forced && r.gfx.tier === 'high' && r.gfx.composer && r.gfx.bloom,
    'D1 ?gfx=high → forced, composer on', `composer=${r.gfx.composer} bloom=${r.gfx.bloom}`);
}

// ---- D2: ?tod= boundary pins — the URL contract actually pins now
// (FS-QA2-005: pre-fix the boot golden-hour pin gated sampling forever and
// ?tod was inert — every pin read nightK≈0.11). setClockMinute applies the
// target immediately (k=1), so the values below are the keyframe targets.
// FRESH boots (no seeded save): on a story page the AUTHORED beats own the
// cycle and legitimately re-pin after boot (startDusk/toMorningLight — the
// Doc 04 law); the rigs' use case is exactly the fresh boot, and a seeded
// story page overrides the URL pin by design. ----
const D2_CASES = [
  ['00:00', (g) => g.nightK > 0.6, 'night'],
  ['04:30', (g) => g.nightK > 0.6, 'night plateau'],
  ['05:30', (g) => g.nightK > 0.45 && g.nightK < 0.9, 'dawn'],
  ['12:00', (g) => g.nightK < 0.3, 'midday band'],
  ['23:59', (g) => g.nightK > 0.6, 'wrapping into night'],
];
for (const [tod, ok, name] of D2_CASES) {
  const r = await hostileBoot(`?tod=${tod}`, { seedSave: false });
  check(cleanBoot(r) && ok(r.gfx) && daySane(r.gfx),
    `D2 ?tod=${tod} → pinned (${name})`, `nightK=${r.gfx.nightK.toFixed(2)}`);
}

await browser.close();
server.close();

const failed = results.filter((x) => !x.ok);
console.log(`\n=== SUMMARY ===`);
console.log(failed.length === 0
  ? `GFX-ABUSE OK: ${results.length}/${results.length} checks passed`
  : `GFX-ABUSE FAILED: ${failed.length}/${results.length} checks failed`);
process.exit(failed.length === 0 ? 0 : 1);
