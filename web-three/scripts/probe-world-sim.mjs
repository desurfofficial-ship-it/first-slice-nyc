/**
 * World-sim runtime probe — the Phase-1 integration's playable proof,
 * driven end-to-end in the real built game (dist/): the D-1 valve, the
 * clock-keyed schedules, the R6 interruption, save/load (including
 * interrupted and invalid saves), and the dusk flip — all at accelerated
 * time, via ?scenario=schedules. Exit code 0 = every step passed.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4593;
const URL_PARAMS = process.env.WORLD_SIM_PARAMS ?? '?scenario=schedules&worldclock=120&fx=off';

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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: Number(process.env.E2E_W ?? 1280), height: Number(process.env.E2E_H ?? 800) } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/${URL_PARAMS}`, { waitUntil: 'load' });

// the scenario clears its own storage on boot; give it up to 4 minutes of
// accelerated day (worldclock=120) to walk Idris across the block twice
let report = null;
try {
  await page.waitForFunction(() => window.__SCENARIO_REPORT__ !== undefined, null, { timeout: 240000 });
  report = await page.evaluate(() => window.__SCENARIO_REPORT__);
} catch { /* reported below */ }

await browser.close();
server.close();

if (errors.length) {
  console.log('PAGE ERRORS:');
  for (const e of errors) console.log('  ' + e);
}
if (!report) {
  console.log('WORLD-SIM PROBE FAIL — no report (scenario crashed or timed out)');
  process.exit(1);
}
for (const s of report.steps) {
  console.log(`${s.ok ? 'PASS' : 'FAIL'}  ${s.name}`);
  if (!s.ok || process.env.VERBOSE) console.log(`      ${s.detail}`);
}
console.log(`\nsim-minutes run: ${report.simMinutesRun} in ${report.realSeconds.toFixed(1)}s real — steps ${report.steps.filter((s) => s.ok).length}/${report.steps.length}`);
const ok = report.ok && errors.length === 0;
console.log(ok ? 'WORLD-SIM PROBE OK' : 'WORLD-SIM PROBE FAIL');
process.exit(ok ? 0 : 1);
