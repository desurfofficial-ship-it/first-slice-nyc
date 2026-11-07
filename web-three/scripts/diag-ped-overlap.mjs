/**
 * diag-ped-overlap.mjs — DEF-14 / R-NEW-17 evidence capture (WS-B window).
 *
 * The risk row's law: "decide from a slow-motion capture of the overlap
 * moment; do NOT tune blind." This diagnostic dense-samples the live
 * street (300 ms) and, for every visible pair under 1.0 m, records the
 * full context: distance, both walkers' dwell/arrive state (dwellLeft
 * > 0 = standing at a beat right now), speeds (finite-difference), and
 * headings. Purpose: discriminate the two hypotheses —
 *   H1  a steering corner-case (two walkers grinding while moving), vs
 *   H2  by-design dwelling/chatting pairs (CHAT_RANGE = 1.7 m) parked
 *       inside the probe's 0.6 m contact threshold — a measurement-law
 *       gap, not a shipped-behavior defect.
 * Exits 0 either way; writes shots/ped-overlap-dump.json for the verdict.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4599;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${PORT}/?scenario=peds`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#hud', { timeout: 60000 });
await page.waitForTimeout(5000); // let the walkers arm

const sample = () => page.evaluate(() => {
  const g = window.__game;
  const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
  if (!grp) return null;
  const peds = g.world.peds.peds;
  return {
    commutes: g.world.pedCommutesWalked(),
    states: grp.children.map((c, i) => ({
      i, visible: c.visible,
      x: +c.position.x.toFixed(3), z: +c.position.z.toFixed(3),
      dwellLeft: +(peds[i]?.dwellLeft ?? 0),
      arrived: g.world.peds.commuteStateOf(i)?.arrived ?? false,
      destId: g.world.peds.commuteStateOf(i)?.destId ?? null,
      armed: g.world.peds.commuteStateOf(i)?.armed ?? false,
    })),
  };
});

const t0 = Date.now();
let prev = await sample();
const frames = [{ t: 0, ...prev }];
const closeEvents = [];
while (Date.now() - t0 < 75000) {
  await page.waitForTimeout(300);
  const s = await sample();
  if (!s) continue;
  const dt = 0.3;
  const speed = new Map();
  for (const w of s.states) {
    const p = prev.states.find((q) => q.i === w.i);
    speed.set(w.i, p ? Math.hypot(w.x - p.x, w.z - p.z) / dt : 0);
  }
  const vis = s.states.filter((w) => w.visible);
  for (let i = 0; i < vis.length; i++) {
    for (let j = i + 1; j < vis.length; j++) {
      const d = Math.hypot(vis[i].x - vis[j].x, vis[i].z - vis[j].z);
      if (d < 1.0) {
        closeEvents.push({
          t: +((Date.now() - t0) / 1000).toFixed(1), d: +d.toFixed(3), pair: `${vis[i].i}|${vis[j].i}`,
          a: { x: vis[i].x, z: vis[i].z, dwell: vis[i].dwellLeft, arrived: vis[i].arrived, dest: vis[i].destId, v: +speed.get(vis[i].i).toFixed(2) },
          b: { x: vis[j].x, z: vis[j].z, dwell: vis[j].dwellLeft, arrived: vis[j].arrived, dest: vis[j].destId, v: +speed.get(vis[j].i).toFixed(2) },
        });
      }
    }
  }
  frames.push({ t: +((Date.now() - t0) / 1000).toFixed(1), commutes: s.commutes, states: s.states });
  prev = s;
}
writeFileSync(join(OUT, 'ped-overlap-dump.json'), JSON.stringify({ closeEvents, frames: frames.length }, null, 1));
const under06 = closeEvents.filter((e) => e.d < 0.6);
const bothStanding = under06.filter((e) => e.a.dwell > 0 && e.b.dwell > 0);
const pairs = [...new Set(under06.map((e) => e.pair))];
console.log('CLOSE (<1.0m) events:', closeEvents.length, ' UNDER-0.6 events:', under06.length);
console.log('under-0.6 pairs:', pairs.join(' ') || '(none)');
console.log('under-0.6 with BOTH dwelling:', bothStanding.length);
console.log('under-0.6 with BOTH moving (v>0.2 each):', under06.filter((e) => e.a.v > 0.2 && e.b.v > 0.2).length);
for (const p of pairs.slice(0, 4)) {
  const evs = under06.filter((e) => e.pair === p);
  console.log(`pair ${p}: n=${evs.length} d=[${Math.min(...evs.map((e) => e.d))}..${Math.max(...evs.map((e) => e.d))}] dwell a=${evs[0].a.dwell.toFixed(1)} b=${evs[0].b.dwell.toFixed(1)} v a=${evs[0].a.v} b=${evs[0].b.v}`);
}
console.log('commutes walked:', frames.at(-1)?.commutes ?? 'n/a');
await browser.close();
process.exit(0);
