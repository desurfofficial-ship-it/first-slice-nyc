/**
 * diag-e2e-window.mjs — runs the REAL 4-day autotest driver against the
 * built game for a bounded wall-clock window (this sandbox's per-command
 * ceiling is 600 s; the full e2e needs ~530–570 s on the reference machine
 * and does not fit here). Reports exactly how far the driver got, its
 * failure count so far, and console health. Honest partial evidence, not a
 * substitute claim: the full e2e.mjs remains the shipped gate.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4577;
const WINDOW_MS = Number(process.env.R3_E2E_WINDOW ?? 520_000);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(DIST, p === '/' ? 'index.html' : p);
  if (existsSync(file) && !file.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => {
  sessionStorage.setItem('fs_driver_authorized', '1'); // the documented fleet handshake (driverGate.ts)
});
await page.goto(`http://localhost:${PORT}/?autotest=1&fx=off`, { waitUntil: 'load' });
const t0 = Date.now();
let report = null;
while (Date.now() - t0 < WINDOW_MS) {
  await page.waitForTimeout(15_000);
  report = await page.evaluate(() => {
    const r = window.__AUTOTEST__;
    return r ? { done: r.done, day: r.day, step: r.step, failures: r.failures?.length ?? 0 } : null;
  }).catch(() => null);
  if (report?.done) break;
  console.log(`[t+${Math.round((Date.now() - t0) / 1000)}s]`, JSON.stringify(report));
}
const final = await page.evaluate(() => {
  const r = window.__AUTOTEST__;
  if (!r) return null;
  return { done: r.done, day: r.day, step: r.step, failures: r.failures, logTail: (r.log ?? []).slice(-6) };
}).catch(() => null);
console.log('FINAL:', JSON.stringify(final, null, 1));
const errClean = errors.filter((e) => !e.includes('SwiftShader'));
console.log('page errors (non-SwiftShader):', errClean.length, errClean.slice(0, 3));
await browser.close(); server.close();
if (final?.done) { console.log(final.failures?.length ? 'E2E DRIVER DONE — WITH FAILURES' : 'E2E DRIVER DONE — 0 FAILURES'); }
else console.log(`E2E DRIVER WINDOW ELAPSED (${Math.round((Date.now() - t0) / 1000)} s) — partial evidence only`);
