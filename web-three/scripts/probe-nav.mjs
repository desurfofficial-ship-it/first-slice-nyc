/**
 * Navigation browser probe — the Phase 3 A-1/A-2 playable proof, driven
 * end-to-end in the real built game (dist/) via ?scenario=nav: the
 * registry-seeded graph, Rosa's routed door entry, Idris's routed
 * crosswalk commute, the locked Cecil room, the recorded door
 * transitions, the door-corridor facade law, and a responsiveness
 * guard — all at accelerated sim time. Exit code 0 = every step passed.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
const URL_PARAMS = process.env.NAV_PARAMS ?? '?scenario=nav&worldclock=120&fx=off';

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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: Number(process.env.E2E_W ?? 1280), height: Number(process.env.E2E_H ?? 800) } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// R1 (FS-AUDIT-001): the driver gate in production builds requires the
// harness's own session handshake — a URL cannot authorize a driver
// (game/driverGate.ts). Same documented authorization as the fleet.
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));

await page.goto(`http://localhost:${PORT}/${URL_PARAMS}`, { waitUntil: 'load' });

let report = null;
try {
  await page.waitForFunction(() => window.__SCENARIO_REPORT__ !== undefined, null, { timeout: 240000 });
  report = await page.evaluate(() => window.__SCENARIO_REPORT__);
} catch { /* reported below */ }

// a frame of visual evidence: the routed block, mid-day
try {
  await page.screenshot({ path: 'shots/probe-nav-street.png' });
} catch { /* the evidence frame is best-effort */ }

await browser.close();
server.close();

if (errors.length) {
  console.log('PAGE ERRORS:');
  for (const e of errors) console.log('  ' + e);
}
if (!report) {
  console.log('NAV PROBE FAIL — no report (scenario crashed or timed out)');
  process.exit(1);
}
for (const s of report.steps) {
  console.log(`${s.ok ? 'PASS' : 'FAIL'}  ${s.name}`);
  if (!s.ok || process.env.VERBOSE) console.log(`      ${s.detail}`);
}
console.log(`\nscenario: ${report.scenario} — ${report.realSeconds.toFixed(1)}s real — steps ${report.steps.filter((s) => s.ok).length}/${report.steps.length}`);
const ok = report.ok && errors.length === 0;
console.log(ok ? 'NAV PROBE OK' : 'NAV PROBE FAIL');
process.exit(ok ? 0 : 1);
