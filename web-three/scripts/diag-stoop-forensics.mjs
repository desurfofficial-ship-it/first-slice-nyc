/**
 * THE STOOP/DOOR/YARD FORENSICS — follows the pocket scan's findings.
 * For each suspect area: sample a fine grid, classify free/blocked, and
 * name the sealing box (coordinates → the builder call that owns it).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4668;
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
await page.waitForTimeout(1200);

const out = await page.evaluate(() => {
  const w = window.__game.world;
  const R = 0.35, STEP = 0.36, YHI = 1.7;
  const hit = (x, z) => {
    for (const b of w.colliders) {
      if (b.maxY <= STEP || b.minY >= YHI) continue;
      const nx = Math.max(b.minX, Math.min(x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
      if ((x - nx) ** 2 + (z - nz) ** 2 < R * R) return b;
    }
    return null;
  };
  const fmt = (b) => `x[${b.minX.toFixed(2)},${b.maxX.toFixed(2)}]y[${b.minY.toFixed(2)},${b.maxY.toFixed(2)}]z[${b.minZ.toFixed(2)},${b.maxZ.toFixed(2)}]`;

  // 1. the backdrop band segments (gate placement)
  const bandN = w.colliders.filter((b) => b.maxY > 5 && b.minZ > 48 && b.maxZ < 59 && b.minY < 0.5).map((b) => `${b.minX.toFixed(1)}..${b.maxX.toFixed(1)} h=${b.maxY.toFixed(0)}`).sort();
  const bandS = w.colliders.filter((b) => b.maxY > 5 && b.minZ > -59 && b.maxZ < -48 && b.minY < 0.5).map((b) => `${b.minX.toFixed(1)}..${b.maxX.toFixed(1)} h=${b.maxY.toFixed(0)}`).sort();

  // 2. stoop approaches: road → stoop mouth, sampled
  const approaches = {};
  const runs = [
    ['GRB-06 stoop', [-66.2, 46.0], [-66.2, 48.3]],
    ['GRB-07 stoop', [61.8, 46.0], [61.8, 48.3]],
    ['TEN-02 door', [-66.2, -46.0], [-66.2, -48.6]],
    ['KTS-04 door', [61.8, -46.0], [61.8, -48.6]],
  ];
  for (const [name, [x, z0], [, z1]] of runs) {
    const steps = [];
    let ok = true;
    for (let z = z0; (z0 < z1 ? z <= z1 : z >= z1); z += (z0 < z1 ? 0.25 : -0.25)) {
      const b = hit(x, z);
      if (b) { ok = false; steps.push(`z=${z.toFixed(2)} SEALED ${fmt(b)}`); if (steps.length > 2) break; }
    }
    approaches[name] = ok ? 'CLEAR' : steps;
  }

  // 3. FRUIT-INT room map (TEN-02 interior): x -68..-60, z -64..-48
  const roomRows = [];
  for (let z = -63.6; z <= -48.6; z += 0.7) {
    let row = '';
    for (let x = -67.9; x <= -60.1; x += 0.5) row += hit(x, z) ? '#' : '.';
    roomRows.push(`z=${z.toFixed(1)} ${row}`);
  }

  // 4. the yard traps' contents: every collider intersecting each bbox
  const yards = {};
  const yardBoxes = {
    yard_W_mid: [-58.8, -49.3, 21.3, 30.3],   // TRAP 19
    yard_N_mid: [-7.3, 2.8, 21.3, 28.8],      // TRAP 20
    yard_E_south: [51.3, 58.8, -18.8, -9.3],  // TRAP 10
    garden_N_gate_scan: [-34, -26, 48.5, 58.5], // north band around planned gate x=-30
    garden_S_gate_scan: [-24, -16, -58.5, -48.5], // south band around planned gate x=-20
  };
  for (const [name, [x0, x1, z0, z1]] of Object.entries(yardBoxes)) {
    const list = [];
    for (const b of w.colliders) {
      if (b.maxX < x0 || b.minX > x1 || b.maxZ < z0 || b.minZ > z1) continue;
      if (b.maxY <= STEP) continue;
      list.push(fmt(b));
    }
    yards[name] = list.slice(0, 14);
  }

  // 5. walk lines through planned gates: road z46.5 → garden z60
  const gateLines = {};
  for (const gx of [-30, 30]) {
    let ok = true; const log = [];
    for (let z = 46.5; z <= 60.5; z += 0.25) {
      const b = hit(gx, z);
      if (b) { ok = false; log.push(`x=${gx} z=${z.toFixed(1)} ${fmt(b)}`); if (log.length > 3) break; }
    }
    gateLines[`N_gate_x${gx}`] = ok ? 'CLEAR' : log;
  }
  for (const gx of [-20, 36]) {
    let ok = true; const log = [];
    for (let z = -46.5; z >= -60.5; z -= 0.25) {
      const b = hit(gx, z);
      if (b) { ok = false; log.push(`x=${gx} z=${z.toFixed(1)} ${fmt(b)}`); if (log.length > 3) break; }
    }
    gateLines[`S_gate_x${gx}`] = ok ? 'CLEAR' : log;
  }

  return { bandN, bandS, approaches, roomRows, yards, gateLines };
});

console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
process.exit(0);
