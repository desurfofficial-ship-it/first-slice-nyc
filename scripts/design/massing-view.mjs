/**
 * Massing screenshot runner — serves the repo root statically, opens
 * scripts/design/massing.html (project's own three.js), switches the three
 * study views, and shoots PNGs into docs/assets/design/.
 * Usage: node scripts/design/massing-view.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 4599;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.mjs': 'text/javascript' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/scripts/design/massing.html';
  // node_modules lives under web-three/ — map it so the page can import the
  // project's own three.js (no new dependency, the same module the game runs)
  let file = join(ROOT, p);
  if (p.startsWith('/node_modules/')) file = join(ROOT, 'web-three', p);
  if (existsSync(file)) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(404); res.end('no ' + p); }
});
await new Promise((r) => server.listen(PORT, r));

const { chromium } = await import('playwright');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
await page.waitForTimeout(700);

const out = join(ROOT, 'docs', 'assets', 'design');
for (const name of ['overview', 'kestrel', 'plaza']) {
  await page.evaluate((n) => window.__setView(n), name);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `massing-${name}.png`) });
  console.log('SHOT massing-' + name);
}
await browser.close();
server.close();
console.log('MASSING DONE');
