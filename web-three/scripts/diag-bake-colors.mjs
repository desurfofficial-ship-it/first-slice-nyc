/**
 * diag-bake-colors — WHAT does a palette-snap buy inside the bakes?
 * Boots the game, walks every StaticBake_* / ZoneBake_* mesh, groups them
 * by their bake group (tile / zone group), and clusters each group's
 * material colors under nearest-DOC04-palette snapping at several max
 * drift distances. Reports per group: meshes now → clusters after snap
 * (same emissive / cast / receive law per cluster). The honest estimate
 * for the palette-fusion lever before it is made.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

const data = await page.evaluate(() => {
  const PAL = {
    gold: 0xf7b32b, brick: 0xb23a48, teal: 0x2a9d8f, amber: 0xffb85c, stone: 0xe8e4dc,
    plum: 0x6d4c7d, coral: 0xff6b6b, cream: 0xfff8f0, ink: 0x3a3440, road: 0x4a4552,
    walk: 0xb9b1a6, bldg: 0x8e6f66, bldg2: 0xa3857a, interior: 0xd9c3a5, taxi: 0xf2c230,
    skyline: 0x9c8aa5, windowDim: 0x3b3346, manhole: 0x2b2730,
  };
  const palEntries = Object.entries(PAL).map(([k, v]) => {
    const c = new (window.__game.constructor.prototype.constructor === Object ? Object : Object)(); void c;
    return { name: k, r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  });
  const dist2 = (r1, g1, b1, r2, g2, b2) => (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
  const groups = {};
  const scene = window.__game.world.scene;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name || '';
    let gname = null;
    if (n.startsWith('StaticBake_')) gname = n.split('_')[1] + '_' + n.split('_')[2].replace(/\d+$/, '');
    else if (n.startsWith('ZoneBake_')) gname = 'Z:' + n.split('_')[1];
    else {
      for (let p = o.parent; p; p = p.parent) {
        if (p.name === 'SUB_Root') { gname = 'Z:SUB(anim)'; break; }
        if (p.name === 'TSS_Group') { gname = 'Z:TSS(anim)'; break; }
      }
    }
    if (!gname) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      const col = m.color;
      const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);
      const em = m.emissive ? [Math.round(m.emissive.r * 255), Math.round(m.emissive.g * 255), Math.round(m.emissive.b * 255), m.emissiveIntensity] : [0, 0, 0, 0];
      (groups[gname] ??= []).push({
        hex: col.getHexString(), r, g, b,
        em: em.join(','), cast: o.castShadow ? 1 : 0, recv: o.receiveShadow ? 1 : 0,
      });
    }
  });
  return { groups, palEntries };
});

const pal = data.palEntries;
const dist2 = (r1, g1, b1, r2, g2, b2) => (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
const snap = (r, g, b, maxD) => {
  let best = null, bd = Infinity;
  for (const p of pal) {
    const d = dist2(r, g, b, p.r, p.g, p.b);
    if (d < bd) { bd = d; best = p; }
  }
  return bd <= maxD * maxD ? best.name : null;
};

const THRESHOLDS = [0, 12, 24, 40];
let totalNow = 0, totals = {};
for (const t of THRESHOLDS) totals[t] = 0;
const rows = [];
for (const [gname, entries] of Object.entries(data.groups)) {
  totalNow += entries.length;
  const row = { group: gname, now: entries.length };
  for (const t of THRESHOLDS) {
    const clusters = new Set();
    for (const e of entries) {
      const s = t === 0 ? e.hex : (snap(e.r, e.g, e.b, t) ?? e.hex);
      clusters.add(`${s}|${e.em}|${e.cast}|${e.recv}`);
    }
    row[`t${t}`] = clusters.size;
    totals[t] += clusters.size;
  }
  rows.push(row);
}
rows.sort((a, b) => b.now - a.now);
console.log(JSON.stringify({ totalNow, totals, rows: rows.slice(0, 30) }, null, 1));
console.log('PAGEERRORS', errors.length, errors.slice(0, 2));
await browser.close();
server.close();
