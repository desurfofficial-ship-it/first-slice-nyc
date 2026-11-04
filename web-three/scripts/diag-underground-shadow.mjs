/**
 * diag-underground-shadow — price the underground shadow pass (B13's
 * "SUB_Root depth" frontier, priced before coded, per the Anti-Slop gate).
 *
 * Two rigs:
 *   PLATFORM_A    — the census rig, verbatim from diag-perf-breakdown.mjs
 *                   (ledger continuity; the station zone is unlit here, so
 *                   this is the descent-transition view)
 *   PLATFORM_DWELL— the real underground dwell: player mid-platform inside
 *                   the lit stationA zone, boom behind like the real camera.
 *                   Ceiling hidden (`under`), sun pours into the open-top
 *                   box — the dollhouse look IS a sun look, so the shadow
 *                   map underground is NOT pure waste; the frontier is the
 *                   STREET world around the box paying casters the platform
 *                   never samples.
 *
 * Variants, in order of art risk:
 *   A  baseline               — today's law
 *   B  sun.castShadow = false — total kill (upper bound; loses the pillar/
 *                              rider/player shadows the dollhouse look is
 *                              built on — priced, expected art fail)
 *   C  SHADOW_HALF 35 → 18    — the box shrinks around the player; the
 *                              platform's own shadows all live within ~15 m
 *   D  mapSize 2048 → 1024    — fill-rate (SwiftShader wall clock) at the
 *                              same caster count; texel 0.039 → 0.078 m
 *   E  C + D together         — the compound candidate
 *
 * Evidence frames: shots/underground-<variant>.png on the DWELL rig for the
 * 1-Second Law eyeball (pillar + rider + player shadows must survive C/E).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4598;
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

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

// route every render through the rig camera so renderer.info reflects the
// RIG view (the same park-the-camera law diag-perf-breakdown uses)
await page.evaluate(() => {
  const r = window.__game.renderer;
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
});

// PLATFORM_A: the census rig, verbatim. PLATFORM_DWELL: the real dwell —
// player mid-platform (x −44, z 13 is inside stationA x −52.5..−35.5 /
// z 7.5..20.5), camera low behind, looking up-platform toward Priya.
const RIGS = {
  PLATFORM_A: { pos: [-40, -2.2, 10.5], at: [-47, -2.5, 15], feet: [-40, -3.2, -3.2] },
  PLATFORM_DWELL: { pos: [-39.5, -1.5, 9.0], at: [-46, -2.0, 14.5], feet: [-44, -3.2, 13] },
};

const out = {};
for (const [rigName, RIG] of Object.entries(RIGS)) {
  /** Park the rig, apply one variant's lever, read renderer.info. */
  const measure = async (label) => {
    await page.evaluate(({ rig, label }) => {
      const g = window.__game;
      g.player.capsule.x = rig.feet[0]; g.player.capsule.z = rig.feet[1]; g.player.capsule.y = rig.feet[2];
      window.__rigCam = { pos: rig.pos, at: rig.at };
      const sun = g.world.sun;
      const sm = sun.shadow;
      // restore law first — every variant starts from the shipped baseline
      sun.castShadow = true;
      sm.camera.left = -35; sm.camera.right = 35; sm.camera.top = 35; sm.camera.bottom = -35;
      if (sm.map && sm.mapSize.x !== sm.map.width) { sm.map.dispose(); sm.map = null; }
      sm.mapSize.set(2048, 2048);
      sm.camera.updateProjectionMatrix();
      if (label === 'sunOff') sun.castShadow = false;
      if (label === 'half18' || label === 'half18+map1024') {
        sm.camera.left = -18; sm.camera.right = 18; sm.camera.top = 18; sm.camera.bottom = -18;
        sm.camera.updateProjectionMatrix();
      }
      if (label === 'map1024' || label === 'half18+map1024') {
        sm.map.dispose(); sm.map = null;
        sm.mapSize.set(1024, 1024);
      }
      g.renderer.shadowMap.needsUpdate = true;
    }, { rig: RIG, label });
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => {
      const i = window.__game.renderer.info.render;
      return { calls: i.calls, tris: i.triangles };
    });
    if (label !== 'baseline' && rigName === 'PLATFORM_DWELL') {
      await page.screenshot({ path: `shots/underground-${label}.png` });
    }
    console.log(rigName.padEnd(15), label.padEnd(12), JSON.stringify(info));
    return info;
  };

  const base = await measure('baseline');
  const b = await measure('sunOff');
  const c = await measure('half18');
  const d = await measure('map1024');
  const e = await measure('half18+map1024');

  const pct = (x) => (100 * (base.calls - x) / base.calls).toFixed(0);
  out[rigName] = {
    baseline: base.calls, sunOff: b.calls, half18: c.calls, map1024: d.calls, compound: e.calls,
    deltas: {
      sunOff: `−${pct(b.calls)}%`, half18: `−${pct(c.calls)}%`,
      map1024: `−${pct(d.calls)}%`, compound: `−${pct(e.calls)}%`,
    },
  };
}
console.log('SUMMARY', JSON.stringify(out, null, 1));
if (errors.length) console.log('PAGEERRORS:', errors.slice(0, 3).join(' | '));
await browser.close();
server.close();
