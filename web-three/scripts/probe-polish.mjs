/**
 * Polish-round probe — the traffic signal, the curbs, the manhole steam,
 * and the birds on the paving. Frozen camera (probe-only poke), the same
 * convention as probe-env3. Every shot here is evidence for docs/29.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4582;
mkdirSync(OUT, { recursive: true });

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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(() => { window.__game.cam.update = () => {}; }); // probe-only freeze

async function frame(name, cx, cy, cz, tx, ty, tz, ms = 350) {
  await page.evaluate(([cx, cy, cz, tx, ty, tz]) => {
    const c = window.__game.cam.camera;
    c.position.set(cx, cy, cz);
    c.lookAt(tx, ty, tz);
  }, [cx, cy, cz, tx, ty, tz]);
  await wait(ms);
  await page.screenshot({ path: join(OUT, `env5-${name}.png`) });
  console.log('shot env5-' + name + '.png');
}

// 1. the head from the cab's approach — driver's eye at the stop line,
//    looking +x: lamps overhead ahead, teal lit
await frame('signal-driver-eye', -9.5, 1.3, -2, -1.8, 4.45, -2.6);
// 2. the whole mast assembly from the street, three-quarter
await frame('signal-corner', -7.5, 2.4, -0.5, -1.8, 3.6, -6.4);
// 3. curb line at the crosswalk gap — curb reads against road + sidewalk
await frame('curb-crosswalk', 2.5, 2.2, 2.2, -6, 0.1, -4.2);
// 4. manhole steam, mid-road, backlit by the morning sun
await frame('steam-manhole', -6.5, 1.1, 2.8, -10, 1.2, 0.5);
// 5. plaza flock — every bird on the sidewalk band now
await frame('flock-sidewalk', -43.5, 2.6, 0.5, -39.5, 0.2, 5.2);

// programmatic: every pigeon + the squirrel stand inside their sidewalk band.
// (TS-private fields are runtime-visible; reading them from the probe is the
// established probe-only poke — nothing shipped changes.)
const bands = await page.evaluate(() => {
  const w = window.__game.world;
  const bad = [];
  const check = (label, pos, band) => {
    if (pos.z < band[0] - 1e-6 || pos.z > band[1] + 1e-6) {
      bad.push(`${label} at z=${pos.z.toFixed(2)} outside [${band[0]}, ${band[1]}]`);
    }
  };
  const plaza = w.pigeonFlock;
  const east = w.pigeonFlockEast;
  const sq = w.squirrel;
  for (let i = 0; i < plaza.birds.length; i++) check(`plaza#${i}`, plaza.birds[i].pos, [4.35, 7.2]);
  for (let i = 0; i < east.birds.length; i++) check(`east#${i}`, east.birds[i].pos, [4.35, 6.2]);
  check('squirrel', sq.s.pos, [4.2, 7.4]);
  return {
    plazaBirds: plaza.birds.length,
    eastBirds: east.birds.length,
    squirrelZ: sq.s.pos.z,
    violations: bad,
  };
});
console.log('band check:', JSON.stringify(bands));
if (bands.violations.length) {
  console.log('FAILS:\n' + bands.violations.join('\n'));
  await browser.close();
  server.close();
  process.exit(1);
}

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO console/page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
console.log('POLISH PROBE: PASS');
