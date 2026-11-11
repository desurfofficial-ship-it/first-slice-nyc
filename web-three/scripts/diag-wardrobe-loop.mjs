import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(DIST, p === '/' ? 'index.html' : p);
  if (existsSync(file) && !file.endsWith('/')) { res.writeHead(200, {'content-type': MIME[extname(file)] ?? 'application/octet-stream'}); res.end(readFileSync(file)); }
  else { res.writeHead(200, {'content-type':'text/html'}); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise(r => server.listen(4236, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => undefined, configurable: true }));
await page.goto('http://localhost:4236/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const skip = page.locator('#cine-skip');
if (await skip.isVisible().catch(()=>false)) { await skip.click(); await page.waitForTimeout(2500); }
for (let i = 0; i < 14; i++) {
  const s = await page.evaluate(() => {
    const g = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return `${Math.round(r.width*10)/10}x${Math.round(r.height*10)/10}`; };
    const cv = document.querySelector('#wardrobe-canvas');
    return {
      card: g('#wardrobe-card'), stage: g('#wardrobe-stage'), side: g('#wardrobe-side'),
      canvas: g('#wardrobe-canvas'),
      buf: cv ? `${cv.width}x${cv.height}` : null,
      lineup: g('#wardrobe-lineup'), pick: g('#wardrobe-pick'), controls: g('#wardrobe-controls'),
      wearY: Math.round(document.querySelector('#wardrobe-wear')?.getBoundingClientRect().y ?? -1),
      spilled: !document.getElementById('error-banner')?.hidden,
    };
  });
  console.log(`t+${(i*0.4).toFixed(1)}s`, JSON.stringify(s));
  await page.waitForTimeout(400);
}
await browser.close(); server.close();
