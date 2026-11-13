/** Pinpoint the GRD-GABLE gate corridor seal + the yard/courtyard seals. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4669;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 480, height: 320 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1000);
const out = await page.evaluate(() => {
  const w = window.__game.world;
  const STEP = 0.36, YHI = 1.7, R = 0.35;
  const fmt = (b) => `x[${b.minX.toFixed(2)},${b.maxX.toFixed(2)}]y[${b.minY.toFixed(2)},${b.maxY.toFixed(2)}]z[${b.minZ.toFixed(2)},${b.maxZ.toFixed(2)}]`;
  const inRect = (b, x0, x1, z0, z1) => !(b.maxX < x0 || b.minX > x1 || b.maxZ < z0 || b.minZ > z1) && b.maxY > STEP && b.minY < YHI;
  return {
    gableGateCorridor: w.colliders.filter((b) => inRect(b, 1.5, 5.5, 20.5, 28.5)).map(fmt),
    gableGateLine: (() => {
      const line = [];
      for (let x = 2.5; x <= 5.5; x += 0.25) {
        const hits = [];
        for (const b of w.colliders) {
          if (b.maxY <= STEP || b.minY >= YHI) continue;
          const nx = Math.max(b.minX, Math.min(x, b.maxX));
          const nz = Math.max(b.minZ, Math.min(24.25, b.maxZ));
          if ((x - nx) ** 2 + (24.25 - nz) ** 2 < R * R) hits.push(`${b.minX.toFixed(2)}..${b.maxX.toFixed(2)}`);
        }
        line.push(`${x.toFixed(2)}:${hits.length ? hits.join('|') : 'free'}`);
      }
      return line;
    })(),
    playgroundSeal: w.colliders.filter((b) => inRect(b, -9.5, -4.5, -27, -22)).map(fmt),
    courtW: w.colliders.filter((b) => inRect(b, -60.5, -47.5, 19.5, 32.5)).map(fmt),
    courtE: w.colliders.filter((b) => inRect(b, 49.5, 61, -21, -8)).map(fmt),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
process.exit(0);
