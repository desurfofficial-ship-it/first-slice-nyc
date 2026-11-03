/**
 * Probe: the album's thumb path (the GDD's postcard ask — the shelf).
 * The Map sat click-dead behind a click-through HUD once (docs/51); the
 * album must never learn that trick. Boots the plain page, clicks the REAL
 * #btn-album, expects the REAL #album-panel, folds it again by click, and
 * confirms the share button stays honest where files cannot be shared.
 * ~25 s. Uses dist/ — run `npm run build` first.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4591;
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
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
const fails = [];
const ok = (c, w) => { console.log(`${c ? 'PASS' : 'FAIL'} ${w}`); if (!c) fails.push(w); };
page.on('pageerror', (e) => fails.push(`PAGEERROR: ${e.message}`));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
await page.click('#btn-album', { timeout: 5000 }).catch(() => fails.push('click #btn-album'));
ok(await page.isVisible('#album-panel'), 'the album opens by CLICK on the HUD button');
ok((await page.textContent('#album-empty'))?.includes('Nothing kept yet'), 'the honest empty shelf says so');
await page.click('#album-close', { timeout: 5000 }).catch(() => fails.push('click #album-close'));
ok(!(await page.isVisible('#album-panel')), 'the album folds again by click');
// the capability gate ran: headless Linux cannot share files, so the
// button keeps its hidden attribute instead of pretending
await page.waitForTimeout(300);
ok((await page.getAttribute('#postcard-share', 'hidden')) !== null, 'share stays hidden where files cannot be shared');
await page.screenshot({ path: 'probe-shots/probe-album.png' });
await browser.close();
server.close();
process.exit(fails.length === 0 ? 0 : 1);
