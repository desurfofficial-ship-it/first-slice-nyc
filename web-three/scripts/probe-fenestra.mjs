/**
 * probe-fenestra.mjs — the interior-mapping windows' in-engine verification
 * (docs/production/fenestra/). The Anti-Slop gate: nothing is done because
 * it compiles — this probe boots the REAL game, drives the REAL clock
 * (?tod), parks the REAL player beside the block and shoots day / dusk /
 * night / close / far plus the ?fenestra=0 A/B, and asserts the wiring:
 * the two family InstancedMeshes, the collected counts, the loaded atlases,
 * the clock reaching the materials, console clean on every boot.
 *
 * Rendering note: shots ride the ?fx=off direct path (the sandbox's
 * swiftshader composer renders the intro letterbox black — the composer
 * path itself gets a separate error-census boot, no pixels).
 * Evidence lands in shots/fenestra-*.png.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4621;
mkdirSync(new URL('../shots', import.meta.url).pathname, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.glb': 'model/gltf-binary', '.png': 'image/png', '.webp': 'image/webp' };
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
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  if (!ok) fail++;
};

/** Boot a page, wait for the game, park the player, freeze the camera. */
async function session(tod, extraQuery = '') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + (e.stack ?? e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  const q = tod ? `&tod=${tod}` : '';
  await page.goto(`http://localhost:${PORT}/?fx=off${q}${extraQuery}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  return { page, errs };
}

/** The probe-final-shots park: teleport the capsule, tick the world twice,
 *  freeze the game camera and aim it (the rig reads the world, not the sim). */
async function park(page, px, pz, cam, at) {
  await page.evaluate(async ({ px, pz, cam, at }) => {
    const g = window.__game;
    if (typeof g.dismissPostcard === 'function') g.dismissPostcard();
    if (g.ui?.nameBox) g.ui.nameBox.hidden = true;
    const p = g.player.capsule;
    p.x = px; p.z = pz; p.y = 0.05;
    g.world.update(1 / 60, p);
    await new Promise((res) => setTimeout(res, 320));
    g.world.update(1 / 60, p);
    g.cam.update = () => {};
    g.cam.camera.position.set(cam[0], cam[1], cam[2]);
    g.cam.camera.lookAt(at[0], at[1], at[2]);
  }, { px, pz, cam, at });
  await page.waitForTimeout(300);
}

async function census(page) {
  return page.evaluate(() => {
    const g = window.__game;
    const meshes = [];
    const mats = [];
    let rooms = null, fronts = null;
    g.world.scene.traverse((o) => {
      if (o.name && o.name.startsWith('FenestraWindows_')) {
        meshes.push({ name: o.name, count: o.count });
        const m = o.material;
        // three's filter constants: LinearFilter=1006, LinearMipmapLinearFilter=1008
        mats.push({
          range: m.uniforms.uFenRange.value.toArray(),
          nightK: m.uniforms.uFenNightK.value,
          roomsTex: m.uniforms.uFenRooms.value?.image?.width ?? null,
          frontsTex: m.uniforms.uFenFronts.value?.image?.width ?? null,
          roomsMinFilter: m.uniforms.uFenRooms.value?.minFilter ?? null,
          roomsMips: m.uniforms.uFenRooms.value?.generateMipmaps ?? null,
          roomsAniso: m.uniforms.uFenRooms.value?.anisotropy ?? null,
        });
        if (m.uniforms.uFenRooms.value?.image) rooms = m.uniforms.uFenRooms.value.image.width;
        if (m.uniforms.uFenFronts.value?.image) fronts = m.uniforms.uFenFronts.value.image.width;
      }
    });
    return { meshes, mats, rooms, fronts, calls: g.renderer.info.render.calls,
      summary: g.world.fenestraSummary() };
  });
}

/** The FEN-GLITCH static detector: decode a screenshot PNG in-page, then
 *  measure the mean absolute neighbor delta over a region. Aliased atlas
 *  sampling reads ~40+ per pixel pair; clean texture reads < 8; the flat
 *  facade wall ~0.3. The wall canary guards the framing — if the camera
 *  composition ever moves, the region numbers are void and the check
 *  reports the canary, not a lie. */
async function regionNoise(page, pngBuf, regions) {
  const b64 = pngBuf.toString('base64');
  return page.evaluate(async ({ b64, regions }) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/png' });
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const out = {};
    for (const [label, x, y, w, h] of regions) {
      const d = ctx.getImageData(x, y, w, h).data;
      let sum = 0, n = 0;
      const lum = (i) => (d[i] + d[i + 1] + d[i + 2]) / 3;
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const i = (py * w + px) * 4;
          if (px + 1 < w) { sum += Math.abs(lum(i) - lum(i + 4)); n++; }
          if (py + 1 < h) { sum += Math.abs(lum(i) - lum(i + w * 4)); n++; }
        }
      }
      out[label] = sum / n;
    }
    return out;
  }, { b64, regions });
}

async function shoot(page, name) {
  const path = `shots/fenestra-${name}.png`;
  const buf = await page.screenshot({ path });
  console.log('shot', path);
  return buf;
}

// ---- 1. midday: census + street + A/B + close + far ------------------------
{
  const { page, errs } = await session('13:00');
  const c = await census(page);
  check('two family meshes present', c.meshes.length === 2,
    c.meshes.map((m) => `${m.name}:${m.count}`).join(' '));
  check('window plan collected', c.summary.total > 80, `${c.summary.total} windows`);
  check('families split the atlas range', c.mats.length === 2 &&
    c.mats.some((m) => m.range[0] === 0 && m.range[1] === 16) &&
    c.mats.some((m) => m.range[0] === 16 && m.range[1] === 32),
    JSON.stringify(c.mats.map((m) => m.range)));
  check('rooms atlas loaded (2048px)', c.rooms === 2048, `rooms=${c.rooms}`);
  check('fronts atlas loaded (1024px)', c.fronts === 1024, `fronts=${c.fronts}`);
  check('atlases carry the mip chain (the FEN-GLITCH law: v1.58.0)',
    c.mats.length > 0 && c.mats.every((m) => m.roomsMips === true && m.roomsMinFilter === 1008),
    `mips=${c.mats.map((m) => m.roomsMips).join(',')} minFilter=${c.mats.map((m) => m.roomsMinFilter).join(',')}`);
  check('midday nightK pinned at 0', c.mats.every((m) => m.nightK < 0.05));

  await park(page, 4, -2, [2, 4.2, -6], [14, 7, 14]);
  const dayBuf = await shoot(page, 'day-street');
  // the FEN-GLITCH static detector: the pre-fix tree read 38-48 mean
  // neighbor-delta on these windows (the per-pixel cell-pick scramble +
  // unclamped deep-mip sampling) against 0.3 on the plain wall. The
  // repaired tree (vertex-side hashes + explicit LOD) reads 4-8 — clean
  // texture class. Wall canary guards the framing.
  {
    const noise = await regionNoise(page, dayBuf, [
      ['wall', 700, 300, 120, 180],
      ['blindsWindow', 442, 372, 56, 95],
      ['row3Window', 596, 558, 70, 105],
      ['purpleWindow', 312, 380, 52, 88],
    ]);
    const wallOk = noise.wall < 2.5;
    check('static canary: framing held (plain wall stays flat)', wallOk, `wall=${noise.wall?.toFixed(2)}`);
    if (wallOk) {
      check('static detector: blinds window reads clean texture', noise.blindsWindow < 14,
        `grad=${noise.blindsWindow?.toFixed(2)} (broken build read 47.9)`);
      check('static detector: row3 window reads clean texture', noise.row3Window < 14,
        `grad=${noise.row3Window?.toFixed(2)} (broken build read 46.4)`);
      check('static detector: purple-curtain window reads clean', noise.purpleWindow < 14,
        `grad=${noise.purpleWindow?.toFixed(2)} (broken build read 8.8)`);
    }
  }
  const callsOn = (await census(page)).calls;
  await page.evaluate(() => window.__game.world.setFenestraEnabled(false));
  await page.waitForTimeout(300);
  const cOff = await census(page);
  await shoot(page, 'day-street-before');
  check('A/B toggle changes the draw count', cOff.calls !== callsOn, `on=${callsOn} off=${cOff.calls}`);
  await page.evaluate(() => window.__game.world.setFenestraEnabled(true));

  await park(page, 13.4, 11.6, [12.6, 5.6, 2.6], [13.2, 6.0, 7.9]);
  await shoot(page, 'day-close');
  await park(page, -30, -24, [-34, 14, -40], [14, 6, 10]);
  await shoot(page, 'day-far');
  check('midday console clean', errs.length === 0, errs[0] ?? '');
  await page.close();
}

// ---- 2. dusk: the tide ------------------------------------------------------
{
  const { page, errs } = await session('19:45');
  const c = await census(page);
  check('dusk nightK pinned mid-tide', c.mats.every((m) => m.nightK > 0.4 && m.nightK < 0.8),
    `nightK=${c.mats.map((m) => m.nightK.toFixed(2)).join(',')}`);
  await park(page, 4, -2, [2, 4.2, -6], [14, 7, 14]);
  await shoot(page, 'dusk-street');
  await park(page, -16, -40, [-20, 6, -38], [5, 6, -46]);
  await shoot(page, 'dusk-terrace');
  check('dusk console clean', errs.length === 0, errs[0] ?? '');
  await page.close();
}

// ---- 3. night --------------------------------------------------------------
{
  const { page, errs } = await session('22:30');
  const c = await census(page);
  check('night nightK pinned at 1', c.mats.every((m) => m.nightK > 0.95));
  await park(page, 4, -2, [2, 4.2, -6], [14, 7, 14]);
  await shoot(page, 'night-street');
  await park(page, 13.4, 11.6, [12.6, 5.6, 2.6], [13.2, 6.0, 7.9]);
  await shoot(page, 'night-close');
  await park(page, -30, -24, [-34, 14, -40], [14, 6, 10]);
  await shoot(page, 'night-far');
  check('night console clean', errs.length === 0, errs[0] ?? '');
  await page.close();
}

// ---- 4. the sim clock drives it (no ?tod — the free-running clock) ---------
{
  const { page, errs } = await session('');
  const c = await census(page);
  check('free-running clock reaches the materials', c.mats.every((m) => m.nightK >= 0),
    `nightK=${c.mats.map((m) => m.nightK.toFixed(2)).join(',')}`);
  check('free-boot console clean', errs.length === 0, errs[0] ?? '');
  await page.close();
}

// ---- 5. composer-path error census (swiftshader can't show its pixels) ----
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + (e.stack ?? e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto(`http://localhost:${PORT}/?gfx=high&tod=21:00`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
  await page.waitForTimeout(3500);
  const c = await page.evaluate(() => {
    const g = window.__game;
    let n = 0;
    g.world.scene.traverse((o) => { if (o.name?.startsWith('FenestraWindows_')) n += o.count; });
    return { n, nightK: g.world.scene.traverse((o) => {}) ?? 0 };
  });
  check('composer path boots with the windows live', c.n > 80, `${c.n} windows`);
  check('composer path console clean', errs.length === 0, errs[0] ?? '');
  await page.close();
}

// ---- 6. the phone condition (the FEN-GLITCH field report's class) ----------
// The field defect came in on a phone: coarse pointer + DPR >= 2 → the
// resolver's 'low' tier (pixelRatioCap 1.25, bands 10/24). This boot is its
// SwiftShader analog — narrow viewport, forced low tier — and the same
// street park. The mips are the fix at every tier; this shot is the proof
// the low tier did not quietly keep the aliased path.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + (e.stack ?? e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto(`http://localhost:${PORT}/?gfx=low&fx=off&tod=13:00`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const c = await page.evaluate(() => {
    const g = window.__game;
    const mats = [];
    g.world.scene.traverse((o) => {
      if (o.name && o.name.startsWith('FenestraWindows_')) {
        const m = o.material.uniforms.uFenRooms.value;
        mats.push({ mips: m?.generateMipmaps ?? null, minFilter: m?.minFilter ?? null });
      }
    });
    return { n: g.world.fenestraSummary().total, mats };
  });
  check('phone-condition boot keeps the window plan', c.n > 80, `${c.n} windows`);
  check('phone-condition atlases still ride the mip chain',
    c.mats.length > 0 && c.mats.every((m) => m.mips === true && m.minFilter === 1008),
    JSON.stringify(c.mats));
  await park(page, 4, -2, [2, 4.2, -6], [14, 7, 14]);
  await shoot(page, 'day-phone-lowtier');
  check('phone-condition console clean', errs.length === 0, errs[0] ?? '');
  await page.close();
}

console.log(fail === 0 ? 'FENESTRA PROBE: ALL PASS' : `FENESTRA PROBE: ${fail} FAILURES`);
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);
