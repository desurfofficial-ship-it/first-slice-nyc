/**
 * scripts/diag-walk-race.mjs — the stage-9 diagnostic for the nav
 * scenario's commute race: boot ?scenario=nav in dist/ and sample the
 * commuter's pos/claim + the world clock every 2 s. Prints the wall-time
 * series so the walker-vs-clock pace is visible. Harness-only.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4651;
const PARAMS = process.env.DIAG_PARAMS ?? '?scenario=nav&worldclock=120&fx=off';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGEERR', m.text()); });
await page.goto(`http://localhost:${PORT}/${PARAMS}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(4000);

const samples = await page.evaluate(async () => {
  const g = window.__game;
  const IDRIS = 'npc:idris_warsame';
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const out = [];
  const t0 = performance.now();
  for (let i = 0; i < 60; i += 1) {
    const d = g.worldSim.debug();
    const n = (d.npcs ?? []).find((x) => x.npcId === IDRIS) ?? null;
    const clock = d.clock ? d.clock.minuteOfDay : (d.time ?? -1);
    let pos = null, claim = '?', routed = null, speed = null;
    if (n) { pos = n.pos; claim = n.claim; routed = n.routed; speed = n.speed ?? null; }
    let directive = null;
    try {
      const br = g.worldSim.brain;
      const dv = br.directives.get('npc:idris_warsame');
      directive = dv ? { mode: dv.body.mode, target: dv.body.target, claim: dv.claim?.activityId, kind: dv.claim?.kind, placeId: dv.claim?.placeId } : 'none';
    } catch (e) { directive = 'err:' + e.message; }
    out.push({ t: Math.round((performance.now() - t0) / 100) / 10, clock: Math.round(clock * 10) / 10, claim, pos: pos ? `${pos.x.toFixed(1)},${pos.z.toFixed(1)}` : 'null', routed,
      bodyMode: (d.npcs ?? []).find((x) => x.npcId === IDRIS)?.bodyMode ?? '?',
      routeLeft: (d.npcs ?? []).find((x) => x.npcId === IDRIS)?.routeLeft ?? -1,
      capacity: (d.capacity?.occupied ?? []).filter((c) => c.holders.length > 0 || c.waiting.length > 0).map((c) => `${c.id}:h=${c.holders.join('|')}:w=${c.waiting.join('|')}`),
      directive });
    for (let k = 0; k < 12; k++) await nextFrame();
  }
  return out;
});
for (const s of samples) console.log(JSON.stringify(s));
await browser.close();
server.close();
