/**
 * Browser E2E harness: loads the built game with ?autotest=1 in headless
 * Chromium, waits for the driver to finish, and prints the PASS/FAIL log.
 * The in-page driver (src/game/autotest.ts) plays the real Day 1 + Day 2.
 *
 * Usage: node scripts/e2e.mjs
 * Exit 0 only when the driver reports 0 failures AND the console is clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4573;
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

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
});
// Viewport override for slow/software-GL machines: at ~5 fps the loop's dt
// clamp (0.1 s) makes game-time run at half wall speed and the four-day
// driver outlives every timeout. A small viewport raises fps until dt stops
// clamping; the driver is viewport-agnostic. Defaults unchanged (900x700).
const VW = Number.parseInt(process.env.E2E_W ?? '900', 10);
const VH = Number.parseInt(process.env.E2E_H ?? '700', 10);
const page = await browser.newPage({ viewport: { width: VW, height: VH } });

const consoleErrors = [];
page.on('console', (msg) => {
  const text = msg.text();
  if (text.includes('PASS ') || text.includes('FAIL ') || text.includes('AUTOTEST')) {
    console.log('DRIVER:', text); // stream the driver log live
  } else if (text.includes('[walk]') || text.includes('[beat]') || text.includes('[press]') || text.includes('[crawl]')
    || text.includes('[aim]') || text.includes('[basis]') || text.includes('[drag]') || text.includes('[stuck]')) {
    console.log('TRACE :', text); // timeline traces for slow-machine forensics
  } else if (msg.type() === 'error') {
    consoleErrors.push(text);
  }
});
page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

// E2E_WALKLOG=1 turns on the driver's [walk]/[stuck] timeline traces
// (slow-machine forensics; off by default — a quiet log is a readable log).
const WALKLOG = process.env.E2E_WALKLOG === '1' ? '&walklog=1' : '';
await page.goto(`http://localhost:${PORT}/?autotest=1&fx=off${WALKLOG}`, { waitUntil: 'load' });

try {
  // The four-day journey is longer now (Day 4 afternoon included) and this
  // suite must survive a LOADED machine — the 340 s ceiling once cut Day 4
  // off mid-walk while Days 1-3 were still being honest. 600 s held until
  // the walks grew progress-extended deadlines (a walk still moving is not
  // a failed walk, 3x cap): slow sandboxes now spend the cap on the long
  // legs, so 900 s with a condition-based driver.
  await page.waitForFunction(() => window.__AUTOTEST__?.done === true, null, { timeout: 900000 });
} catch {
  console.error('TIMEOUT waiting for the autotest driver');
}

const result = await page.evaluate(() => ({
  summary: window.__AUTOTEST_SUMMARY__ ?? 'NO SUMMARY',
  failures: window.__AUTOTEST__?.failures ?? ['driver never reported'],
  lines: window.__AUTOTEST__?.lines ?? [],
}));

console.log('=== SUMMARY ===');
console.log(result.summary);
console.log('=== CONSOLE ERRORS ===');
console.log(consoleErrors.length === 0 ? '(none)' : consoleErrors.join('\n'));

await page.screenshot({ path: 'e2e-final-state.png' });

await browser.close();
server.close();
process.exit(result.failures.length === 0 && consoleErrors.length === 0 ? 0 : 1);
