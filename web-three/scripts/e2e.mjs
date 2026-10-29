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
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

const consoleErrors = [];
page.on('console', (msg) => {
  const text = msg.text();
  if (text.includes('PASS ') || text.includes('FAIL ') || text.includes('AUTOTEST')) {
    console.log('DRIVER:', text); // stream the driver log live
  } else if (msg.type() === 'error') {
    consoleErrors.push(text);
  }
});
page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

await page.goto(`http://localhost:${PORT}/?autotest=1`, { waitUntil: 'load' });

try {
  await page.waitForFunction(() => window.__AUTOTEST__?.done === true, null, { timeout: 340000 });
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
