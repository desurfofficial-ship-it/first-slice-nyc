/**
 * Wardrobe BEFORE/AFTER evidence — the full-body viewer redesign.
 * Usage: node scripts/wardrobe-shots.mjs <tag> [outdir]
 *
 * Captures at three viewports (mobile portrait 390x844, mobile landscape
 * 844x390, desktop 1280x800):
 *   - pick mode  (?film=1&pickcard=1) — the first-run "who got off the bus?"
 *   - wardrobe mode (?starter=classic&probe=1 + toggleWardrobe) — the
 *     fitting room over a live save
 * PNGs land in shots/wardrobe/<tag>-<name>.png; a summary JSON prints the
 * measured stage/card geometry so the before/after numbers are checkable.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = process.argv[2] ?? 'before';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots', 'wardrobe', TAG);
mkdirSync(OUT, { recursive: true });
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4617;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png' };
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
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });

const VIEWPORTS = [
  { name: 'mobile-portrait', width: 390, height: 844, mobile: true },
  { name: 'mobile-landscape', width: 844, height: 390, mobile: true },
  { name: 'desktop', width: 1280, height: 800, mobile: false },
];

const summary = [];

async function capturePick(vp) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    hasTouch: vp.mobile,
    isMobile: vp.mobile,
  });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(`http://localhost:${PORT}/?starter=classic&probe=1`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => !!window.__game?.playerVisual, null, { timeout: 45000 });
  } catch { console.log(`[${vp.name}] game never booted`); }
  // pick mode opened deterministically (the film-driven path needs the
  // whole arrival beat under SwiftShader — the direct call is the same UI)
  await page.evaluate(() => window.__game?.wardrobe?.openPick?.('classic'));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, `pick-${vp.name}.png`) });
  const geo = await page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height), y: Math.round(b.y) };
    };
    const cv = document.querySelector('#wardrobe-canvas');
    return {
      viewport: `${innerWidth}x${innerHeight}`,
      card: r('#wardrobe-card'), stage: r('#wardrobe-stage'), side: r('#wardrobe-side'),
      buffer: cv ? `${cv.width}x${cv.height}` : null,
      stageShare: (() => {
        const s = document.querySelector('#wardrobe-stage')?.getBoundingClientRect();
        const c = document.querySelector('#wardrobe-card')?.getBoundingClientRect();
        return s && c && c.height > 0 ? Math.round((s.height / c.height) * 100) + '%' : null;
      })(),
    };
  });
  summary.push({ shot: `pick-${vp.name}`, ...geo });
  await page.close();
}

async function captureWardrobe(vp) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    hasTouch: vp.mobile,
    isMobile: vp.mobile,
  });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(`http://localhost:${PORT}/?starter=classic&probe=1`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => !!window.__game?.playerVisual, null, { timeout: 45000 });
  } catch { console.log(`[${vp.name}] game never booted`); }
  await page.evaluate(() => window.__game?.toggleWardrobe?.());
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, `wardrobe-${vp.name}.png`) });
  const geo = await page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height), y: Math.round(b.y) };
    };
    return {
      viewport: `${innerWidth}x${innerHeight}`,
      card: r('#wardrobe-card'), stage: r('#wardrobe-stage'), side: r('#wardrobe-side'),
      stageShare: (() => {
        const s = document.querySelector('#wardrobe-stage')?.getBoundingClientRect();
        const c = document.querySelector('#wardrobe-card')?.getBoundingClientRect();
        return s && c && c.height > 0 ? Math.round((s.height / c.height) * 100) + '%' : null;
      })(),
    };
  });
  summary.push({ shot: `wardrobe-${vp.name}`, ...geo });
  await page.close();
}

for (const vp of VIEWPORTS) {
  await capturePick(vp);
  await captureWardrobe(vp);
}
console.log(JSON.stringify(summary, null, 2));
await browser.close();
server.close();
