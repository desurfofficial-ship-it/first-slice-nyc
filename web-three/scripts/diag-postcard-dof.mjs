/**
 * Diag: the authored postcard capture's depth of field (v1.50.0,
 * docs/rendering/05) — drives the REAL Wow Walk beat on the built dist
 * twice (the resolver default: DOF on; then ?dof=0: today's direct render)
 * and saves both composed cards for the evidence pair. Zero page errors is
 * the gate on both boots; the two cards must differ pixel-for-pixel (the
 * DOF path really rendered) and both must be valid PNG postcards.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });

async function driveAndCapture(suffix, shotPath) {
  const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${PORT}/${suffix}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const run = await page.evaluate(async () => {
    const g = window.__game;
    const p = g.player.capsule;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    out.dofFlag = g.gfx.postcardDof;
    out.tier = g.gfx.tier;
    // walk into the square the honest way: teleport to the exit stair top and step east
    p.x = -330; p.y = 0.25; p.z = 6.0; p.radius = 0.35; p.height = 1.75;
    g.player.vy = 0; g.player.ladder = null;
    for (let t = 0; t <= 6000; t += 400) {
      if (!g.ui.postcardPanel.hidden) break; // the wow card beat fired
      await sleep(400);
    }
    out.panelOpen = !g.ui.postcardPanel.hidden;
    out.imgSet = !!g.ui.postcardImg.src && g.ui.postcardImg.src.startsWith('data:image/png');
    out.frozenWhileUp = g.player.frozen; // the paper holds the hands (B7)
    out.step = g.state.step;
    return out;
  });
  // the composed card (the DOF output the player actually receives)
  const card = await page.evaluate(() => window.__game.ui.postcardImg.src || '');
  let cardBytes = 0;
  if (card.startsWith('data:image/png')) {
    const buf = Buffer.from(card.split(',')[1], 'base64');
    writeFileSync(shotPath, buf);
    cardBytes = buf.length;
  }
  console.log(`MODE ${suffix || '(default)'}:`, JSON.stringify(run), `card ${cardBytes} bytes -> ${shotPath}`);
  console.log(`MODE ${suffix || '(default)'} ERRORS:`, errors.length ? errors.slice(0, 3).join(' | ') : 'none');
  await page.close();
  return { run, errors, cardBytes };
}

const after = await driveAndCapture('', 'shots/postcard-dof-after.png');
const before = await driveAndCapture('?dof=0', 'shots/postcard-dof-before.png');

// the two cards must differ — the DOF path really rendered
let differ = false;
if (after.cardBytes > 0 && before.cardBytes > 0) {
  const a = readFileSync('shots/postcard-dof-after.png');
  const b = readFileSync('shots/postcard-dof-before.png');
  differ = !a.equals(b);
}
console.log('DIFFER:', differ ? 'YES (the DOF capture rendered its own frame)' : 'NO — CHECK THE PATH');
console.log('GATE:', after.run.panelOpen && after.run.imgSet && before.run.panelOpen && before.run.imgSet
  && after.errors.length === 0 && before.errors.length === 0 && differ ? 'PASS' : 'FAIL');

await browser.close(); server.close();
