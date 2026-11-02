/**
 * A5 first-session probe — the docs/02 + docs/07 environments, walked.
 *
 * Proves, in-engine (headless, no human):
 *   1. the shaft at the subway plaza is a real descendable stairwell;
 *   2. Alder Station: the platform walks, the train is enterable end-to-end
 *      (both cars + the gangway), the tunnels are barriered;
 *   3. the signed passage runs to the Times Square headhouse and the exit
 *      stair surfaces into the plaza;
 *   4. the square walks: the ring, the bowtie, the red steps' tiers;
 *   5. the whole loop reverses (Times Square → home street) without wedges;
 *   6. the visibility gates: station dark at street level, lit below grade;
 *      square dark on Kestrel, lit south;
 *   7. key colliders exist (shaft walls, headhouse, coach, parapets).
 * Plus eye shots of every zone (the Anti-Slop gate: inspected, not assumed).
 *
 * Usage: node scripts/probe-a5-first-session.mjs   (build dist first)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4625;

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
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const fails = [];

// ---------- gate 6 first: the visibility gates at street level ----------
const gatesHome = await page.evaluate(() => {
  const g = window.__game;
  const c = g.player.capsule;
  c.x = 4; c.z = -6.6; c.y = 0.05;              // the cart corner
  g.world.update(1 / 60, c);
  return {
    stationAtStreet: g.world.firstSession.station.visible,
    squareAtStreet: g.world.firstSession.square.visible,
  };
});
if (gatesHome.stationAtStreet) fails.push('gate: station visible at street level');
if (gatesHome.squareAtStreet) fails.push('gate: square visible from the cart corner');
console.log(`gates@street station=${gatesHome.stationAtStreet} square=${gatesHome.squareAtStreet}`);

// ---------- walks: every first-session route, driven by the real walker ----
const walks = await page.evaluate(() => {
  const g = window.__game;
  const routes = {
    'arrival — the sidewalk past the coach to the terminal bay': {
      start: [-20, 5.0, 0.05],
      pts: [[-27, 5.0], [-30, 5.0]],
    },
    'descent — the interaction anchor into the shaft, down to the platform': {
      start: [-42, 4.55, 0.1],
      pts: [[-42, 5.6], [-42, 6.6], [-42, 7.6], [-42, 8.8]],
    },
    'platform — the full hall, west to east': {
      start: [-45.5, 5.0, -3.9],
      pts: [[-42, 4.6], [-38, 4.6], [-36.2, 4.6]],
    },
    'train — through car 1, the gangway, and car 2': {
      start: [-42.5, 3.0, -3.9],
      // A5: car 2's route goes east along the AISLE (z 0 — the pole band at
      // z 0.4..0.5 caught the old diagonal at (−38.6, 0.4)) then north
      // through door 1 (gap x −39.2..−38.2)
      pts: [[-43.1, 2.2], [-43.1, 0.0], [-41.9, 0.0], [-40.7, 0.0],
        [-39.5, 0.0], [-38.7, 0.0], [-38.7, 3.4]],
    },
    'passage — hall mouth to the west leg turn': {
      start: [-48.2, 5.0, -3.9],
      pts: [[-52, 5.0], [-58, 5.0], [-64, 5.0], [-70, 5.0], [-72, 3.0]],
    },
    'leg — south under the core wall to the exit stair': {
      start: [-72, 2.0, -3.9],
      pts: [[-72, -6], [-72, -20], [-72, -36], [-72, -47], [-72, -54.4]],
    },
    'square — out the headhouse, the ring, the bowtie': {
      start: [-72, -60.2, 0.05],
      // A5: the return leg swings SOUTH of cab 1 (its footprint z −60.45..
      // −58.55 caught the straight z −60.6 line) — around the cab's west
      // end, back to the start
      pts: [[-72, -60.5], [-76, -61.5], [-76, -66], [-76, -70], [-76, -72.3],
        [-62.8, -73.3], [-62.8, -66], [-62.8, -61.5], [-69, -61.8],
        [-73.5, -61.8], [-73.5, -60.7], [-72, -60.7]],
    },
    'steps — up the red tiers and back down': {
      start: [-69, -65.9, 0.05],
      pts: [[-69, -66.4], [-69, -67.4], [-69, -68.4], [-69, -67.4], [-69, -65.7]],
    },
    'return — down the exit stair, the leg, the passage, the hall': {
      start: [-72, -57.8, -0.2],
      pts: [[-72, -56.2], [-72, -55.2], [-72, -48], [-72, -36], [-72, -20],
        [-72, -2], [-70, 3], [-64, 5], [-56, 5], [-50, 5], [-47, 5]],
    },
    'ascent — the platform, up the shaft, back to the street': {
      // A5: the last waypoint stands ON the sidewalk (z 4.55) — the old
      // 3.4 walked off the curb onto the road and read as "never left"
      start: [-42.2, 8.8, -3.9],
      pts: [[-42.2, 7.6], [-42.2, 6.4], [-42.2, 5.2], [-42.2, 4.55]],
    },
  };
  const out = {};
  for (const [name, route] of Object.entries(routes)) {
    const p = g.player.capsule;
    p.x = route.start[0]; p.z = route.start[1]; p.y = route.start[2]; p.vy = 0;
    let minGround = 99, maxGround = -99; const log = [];
    for (const [tx, tz] of route.pts) {
      for (let i = 0; i < 420; i++) {
        const dx = tx - p.x, dz = tz - p.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.45) break;
        const fx = dx / d, fz = dz / d;
        g.player.update(1 / 60, { x: -fx, y: fz });
        g.world.update(1 / 60, p);
        minGround = Math.min(minGround, p.y);
        maxGround = Math.max(maxGround, p.y);
      }
      // settle: a waypoint can end mid-fall (the shaft's last step); run a
      // full second of standing still so every fall lands before the stuck
      // check reads the position
      for (let i = 0; i < 90; i++) {
        g.player.update(1 / 60, { x: 0, y: 0 });
        g.world.update(1 / 60, p);
        minGround = Math.min(minGround, p.y);
        maxGround = Math.max(maxGround, p.y);
      }
      const d = Math.hypot(tx - p.x, tz - p.z);
      if (d > 2.5) log.push(`stuck at (${p.x.toFixed(1)},${p.z.toFixed(1)},y ${p.y.toFixed(2)}) → ${tx},${tz} (d=${d.toFixed(1)})`);
    }
    out[name] = { end: [p.x, p.y, p.z].map((v) => +v.toFixed(2)), minGround: +minGround.toFixed(2), maxGround: +maxGround.toFixed(2), wedged: log.length > 0, log };
  }
  return out;
});
for (const [name, w] of Object.entries(walks)) {
  console.log(`${name}\n    end=(${w.end.join(',')}) minY=${w.minGround} maxY=${w.maxGround} wedged=${w.wedged}`);
  if (w.wedged) fails.push(`${name} wedged: ${w.log.join('; ')}`);
}
// honest expectations
if (walks['descent — the interaction anchor into the shaft, down to the platform'].minGround > -3.8)
  fails.push(`descent never reached the platform (min y ${walks['descent — the interaction anchor into the shaft, down to the platform'].minGround})`);
if (walks['leg — south under the core wall to the exit stair'].minGround < -4.2)
  fails.push('the leg walk fell through');
if (walks['ascent — the platform, up the shaft, back to the street'].maxGround < 0.05)
  fails.push('the shaft ascent never reached the street');
if (walks['square — out the headhouse, the ring, the bowtie'].minGround < -0.5)
  fails.push('the square walk fell through the ground');

// ---------- the plaza walkers live IN the plaza (the band law) ----------
const walkerZone = await page.evaluate(() => {
  const g = window.__game;
  const c = g.player.capsule;
  c.x = -69; c.z = -62; c.y = 0.05; c.vy = 0;
  for (let i = 0; i < 180; i++) { g.player.update(1 / 60, { x: 0, y: 0 }); g.world.update(1 / 60, c); }
  const boxes = g.world.firstSession['peds'].walkColliders.map((b) => [b.minX, b.minZ]);
  // every walker body inside the plaza band, well clear of the home street
  const inside = boxes.every(([x, z]) => x <= -56.8 && x >= -83.2 && z <= -49.6 && z >= -79.4);
  return { boxes: boxes.map(([x, z]) => [+x.toFixed(1), +z.toFixed(1)]), inside };
});
console.log(`walkerZone inside=${walkerZone.inside} at ${JSON.stringify(walkerZone.boxes)}`);
if (!walkerZone.inside) fails.push('plaza walkers left the plaza band (the home-band clamp bug)');

// ---------- gates below grade + in the square ----------
const gatesThere = await page.evaluate(() => {
  const g = window.__game;
  const c = g.player.capsule;
  const out = {};
  c.x = -42; c.z = 5.0; c.y = -3.9;
  g.world.update(1 / 60, c);
  out.stationBelow = g.world.firstSession.station.visible;
  c.x = -69; c.z = -62; c.y = 0.05;
  g.world.update(1 / 60, c);
  out.squareSouth = g.world.firstSession.square.visible;
  out.peds = g.world.firstSession['peds'] ? 2 : 0;
  return out;
});
if (!gatesThere.stationBelow) fails.push('gate: station NOT visible below grade');
if (!gatesThere.squareSouth) fails.push('gate: square NOT visible south of the core');
console.log(`gates@zones stationBelow=${gatesThere.stationBelow} squareSouth=${gatesThere.squareSouth}`);

// ---------- gate 7: the colliders that make it real ----------
const colliders = await page.evaluate(() => {
  const boxes = window.__game.world.colliders;
  const has = (label, x0, x1, z0, z1, y0, y1) => {
    const ok = boxes.some((b) =>
      Math.abs(b.minX - x0) < 0.07 && Math.abs(b.maxX - x1) < 0.07
      && Math.abs(b.minZ - z0) < 0.07 && Math.abs(b.maxZ - z1) < 0.07
      && Math.abs(b.minY - y0) < 0.07 && Math.abs(b.maxY - y1) < 0.07);
    return [label, ok];
  };
  return [
    has('shaft wall W', -43.5, -43.25, 5.0, 8.0, -4.0, 0.1),
    has('shaft wall E', -40.75, -40.5, 5.0, 8.0, -4.0, 0.1),
    has('hall floor', -49, -35, -3.0, 9.4, -4.3, -4.0),
    // car 1's floor spans the full 5.6 m car (the collider expectations
    // below were written against the first draft's 5.0 m car)
    has('car 1 floor', -47.3, -41.7, -1.2, 1.2, -4.15, -4.0),
    has('car 1 pier mid', -45.4, -43.6, 1.0, 1.2, -4.0, -1.45),
    // the gangway-junction end walls carry piers + a door gap now (the full
    // wall sealed the train — see endWall in firstSession.ts)
    has('car 1 end pier S', -41.7, -41.5, -1.2, -0.5, -4.0, -1.45),
    has('car 2 end pier N', -40.3, -40.1, 0.5, 1.2, -4.0, -1.45),
    // and the apron slab that closes the shaft mouth's south strip
    has('shaft apron', -43.5, -40.5, 4.0, 5.0, -0.2, 0.1),
    // and the side railings that fence the opening (the W1-ghost law)
    has('shaft railing W', -43.35, -43.25, 4.5, 7.9, 0.05, 1.0),
    has('shaft railing E', -40.75, -40.65, 4.5, 7.9, 0.05, 1.0),
    has('passage wall N', -75, -49, 7.0, 7.25, -3.9, -1.5),
    has('leg wall W', -75.25, -75.0, -55.0, 7.0, -3.9, -1.5),
    has('exit stair wall W', -74.75, -74.5, -58.25, -55.0, -4.0, 0.05),
    has('headhouse wall W', -75.25, -75.0, -59.375, -54.875, -4.0, 2.6),
    // the boundary collider (0.5 wide, y 0..2) — the parapet MESH is
    // decorative; the probe wants the box that stops the player
    has('TS west parapet', -83.45, -82.95, -79.0, -49.0, 0, 2),
    // N2's collider must clear the headhouse (the first draft's south face
    // at −56 sealed the exit stairs)
    has('TS tower N2', -75, -68, -55.0, -50.0, -0.45, 24.55),
    has('coach body', -36.25, -24.75, 1.775, 4.325, 0.0, 3.1),
    has('TS cab 1', -75.6, -71.4, -77.45, -75.55, 0.25, 1.35),
  ].reduce((acc, [k, v]) => ((acc[k] = v), acc), {});
});
for (const [label, ok] of Object.entries(colliders)) {
  console.log(`${label.padEnd(20)} ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) fails.push(`collider missing: ${label}`);
}

console.log('PAGEERRORS', errors.length);
if (errors.length) fails.push(`${errors.length} page errors: ${errors.slice(0, 3).join(' | ')}`);

// ---------- eye shots: every zone, inspected ----------
await page.evaluate(() => { window.__rig = true; });
const rigs = [
  // [name, camPos, lookAt, standAt(x,z,y)] — every line of sight checked
  // against the built geometry (no lens inside a body, taxi, awning or wall)
  ['a5-plaza-shaft', [-42, 7.5, -1.5], [-42, -2.5, 6.8], [-38.5, 0.1, 2.0]],
  ['a5-station-hall', [-48.2, -2.0, 8.7], [-37.5, -3.5, -1.0], [-42, -4.0, 5.0]],
  ['a5-station-train', [-43.15, -2.5, 5.4], [-43.6, -3.1, -1.0], [-45.8, -4.0, 4.2]],
  ['a5-station-tunnel', [-52, -2.9, 0.2], [-57, -3.3, -0.5], [-44, -4.0, 4.0]],
  ['a5-passage', [-70, -2.5, -1.0], [-72.5, -2.8, -26], [-62, -4.0, 5.0]],
  ['a5-headhouse-exit', [-72, 1.2, -56.0], [-72, 0.6, -62.0], [-72, 0.05, -61.5]],
  ['a5-times-square-south', [-62, 7.5, -59.5], [-76, 0.5, -70], [-69, 0.05, -64.5]],
  ['a5-times-square-canyon', [-66.5, 1.7, -67.5], [-72, 6.5, -55], [-69, 0.05, -64.5]],
  ['a5-times-square-steps', [-64.5, 3.0, -62.5], [-70, 1.2, -68.5], [-68.5, 0.05, -64.5]],
  ['a5-terminal-coach', [-20, 2.8, -0.5], [-31, 1.8, 3.6], [-26.5, 0.1, 4.6]],
];
for (const [name, pos, at, stand] of rigs) {
  await page.evaluate(([p, a, s]) => {
    const g = window.__game;
    const c = g.player.capsule;
    c.x = s[0]; c.z = s[2]; c.y = s[1];
    g.world.update(1 / 60, c);
    const r = g['renderer'];
    if (!window.__origRender) {
      window.__origRender = r.render.bind(r);
      r.render = (scene, camera) => {
        if (window.__rigCam) {
          camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
          camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
        }
        return window.__origRender(scene, camera);
      };
    }
    window.__rigCam = { pos: p, at: a };
  }, [pos, at, stand]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log('SHOT', name);
}

if (fails.length) {
  console.log('GATE FAILS:');
  for (const f of fails) console.log(' -', f);
  process.exitCode = 1;
} else {
  console.log('A5 FIRST-SESSION PROBE: PASS — the subway runs, the square stands, the loop returns');
}
writeFileSync(join(OUT, 'a5-first-session-report.json'),
  JSON.stringify({ fails, walks, gatesHome, gatesThere, colliders, errors }, null, 1));
await browser.close();
server.close();
