/**
 * Wardrobe verify — the acceptance criteria, driven in the real browser.
 * Usage: node scripts/wardrobe-verify.mjs
 *
 * Produces wardrobe-verify-report.json: one row per check, pass/fail plus
 * the measured numbers, and two contact sheets (mobile + desktop interaction
 * strips) under shots/wardrobe/verify/ for the visual read.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots', 'wardrobe', 'verify');
mkdirSync(OUT, { recursive: true });
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4631;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png' };
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

const report = [];
const check = (name, ok, detail) => {
  report.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail)}`);
};
const settle = (page, ms = 1200) => page.waitForTimeout(ms);
/** Wait for the damped camera to actually converge — the software GL runs
 *  the loop at a fraction of real speed, so fixed sleeps lie. */
const converge = (page, tol = 0.02, timeout = 30000) => page.waitForFunction(
  (t) => {
    const w = window.__game?.wardrobe;
    return !!w && Math.abs(w.dist - w.distTarget) < t
      && Math.abs(w.yaw - w.yawTarget) < t
      && Math.abs(w.pitch - w.pitchTarget) < t;
  },
  tol,
  { timeout },
);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });

// ------------------------------------------------------------ mobile pass --
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => check('page error (mobile)', false, e.message));
  await page.goto(`http://localhost:${PORT}/?starter=classic&probe=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game?.playerVisual, null, { timeout: 45000 });

  // 1. open the wardrobe on a small mobile viewport
  await page.evaluate(() => window.__game.toggleWardrobe());
  await settle(page, 1600);
  const open = await page.evaluate(() => {
    const w = window.__game.wardrobe;
    const stage = document.getElementById('wardrobe-stage').getBoundingClientRect();
    const card = document.getElementById('wardrobe-card').getBoundingClientRect();
    return {
      isOpen: w.isOpen, homeDist: w.homeDist, dist: w.dist, min: w.minDist, max: w.maxDist,
      centerY: w.boundsCenter.y, stageH: Math.round(stage.height), cardH: Math.round(card.height),
      share: Math.round((stage.height / card.height) * 100),
      buffer: `${document.getElementById('wardrobe-canvas').width}x${document.getElementById('wardrobe-canvas').height}`,
    };
  });
  check('mobile: wardrobe opens', open.isOpen, open);
  check('mobile: full-body fit is live (dist == homeDist, corridor sane)',
    Math.abs(open.dist - open.homeDist) < 0.05 && open.min < open.homeDist && open.homeDist < open.max,
    { dist: open.dist, home: open.homeDist, min: open.min, max: open.max });
  check('mobile: stage share 60–70%', open.share >= 60 && open.share <= 70, open.share);
  check('mobile: target is the BODY (y ≈ 0.78), not the ground or the world origin',
    open.centerY > 0.5 && open.centerY < 1.1, open.centerY);
  await page.screenshot({ path: join(OUT, 'm1-open.png') });

  // 2/3. zoom in → close-up; zoom out → full silhouette; fit restores
  for (let i = 0; i < 3; i++) await page.click('#wardrobe-zoom-in');
  await settle(page, 900);
  const zin = await page.evaluate(() => window.__game.wardrobe.dist);
  await page.screenshot({ path: join(OUT, 'm2-zoom-in.png') });
  for (let i = 0; i < 8; i++) await page.click('#wardrobe-zoom-out');
  await settle(page, 900);
  const zout = await page.evaluate(() => ({ dist: window.__game.wardrobe.dist, max: window.__game.wardrobe.maxDist }));
  await page.screenshot({ path: join(OUT, 'm3-zoom-out.png') });
  check('mobile: zoom-in reaches the close-up third', zin < open.homeDist * 0.75, { afterIn: zin, home: open.homeDist });
  check('mobile: zoom-out clamps at the corridor ceiling', Math.abs(zout.dist - zout.max) < 0.05, zout);
  await page.click('#wardrobe-zoom-fit');
  await converge(page);
  const zfit = await page.evaluate(() => window.__game.wardrobe.dist);
  check('mobile: Fit restores the default full-body framing', Math.abs(zfit - open.homeDist) < 0.05, { afterFit: zfit, home: open.homeDist });

  // 4. wheel zoom (desktop-grade input on the same stage)
  const wheelDistBefore = await page.evaluate(() => window.__game.wardrobe.distTarget);
  await page.mouse.move(195, 300);
  await page.mouse.wheel(0, 480);
  await settle(page, 700);
  const wheelDistAfter = await page.evaluate(() => window.__game.wardrobe.distTarget);
  check('mobile: mouse-wheel zoom works and is clamped', wheelDistAfter > wheelDistBefore && wheelDistAfter <= open.max + 1e-6, { before: wheelDistBefore, after: wheelDistAfter });
  await page.click('#wardrobe-zoom-fit');
  await converge(page);

  // 5. drag rotation — one full-width swipe right ≈ 320px × 0.012 ≈ 3.8 rad
  const yawBefore = await page.evaluate(() => window.__game.wardrobe.yawTarget);
  await page.mouse.move(40, 300);
  await page.mouse.down();
  await page.mouse.move(360, 300, { steps: 12 });
  await page.mouse.up();
  await converge(page);
  const yawAfter = await page.evaluate(() => window.__game.wardrobe.yawTarget);
  const swept = yawAfter - yawBefore;
  check('mobile: horizontal drag rotates the character (full-width sweep)', swept > 2.5, { swept: Math.round(swept * 100) / 100 });
  await page.screenshot({ path: join(OUT, 'm4-dragged.png') });

  // 6. presets: Back and Front take the shortest arc and reset the framing
  await page.click('#wardrobe-zoom-in');
  await converge(page);
  await page.click('#wardrobe-back');
  await converge(page);
  const backState = await page.evaluate(() => {
    const w = window.__game.wardrobe;
    const norm = ((w.yawTarget % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return { norm, dist: w.dist, home: w.homeDist };
  });
  check('mobile: Back chip lands on π with the full-body framing',
    Math.abs(backState.norm - Math.PI) < 0.05 && Math.abs(backState.dist - backState.home) < 0.05, backState);
  await page.screenshot({ path: join(OUT, 'm5-back.png') });
  await page.click('#wardrobe-front');
  await converge(page);
  const frontState = await page.evaluate(() => {
    const w = window.__game.wardrobe;
    const norm = ((w.yawTarget % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return { norm, dist: w.dist };
  });
  check('mobile: Front chip returns to 0 the short way', frontState.norm < 0.05, frontState);
  await page.click('#wardrobe-quarter');
  await converge(page);
  const quarterState = await page.evaluate(() => {
    const w = window.__game.wardrobe;
    const norm = ((w.yawTarget % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return { norm };
  });
  check('mobile: 3/4 chip lands on the greeting angle', Math.abs(quarterState.norm - 0.35) < 0.05, quarterState);

  // pinch zoom: spread = zoom IN, close = pull back (the touch law)
  const pinchBefore = await page.evaluate(() => window.__game.wardrobe.distTarget);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 160, y: 300 }, { x: 230, y: 300 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 110, y: 300 }, { x: 280, y: 300 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle(page, 700);
  const pinchIn = await page.evaluate(() => window.__game.wardrobe.distTarget);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 110, y: 300 }, { x: 280, y: 300 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 170, y: 300 }, { x: 220, y: 300 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle(page, 700);
  const pinchOut = await page.evaluate(() => window.__game.wardrobe.distTarget);
  check('mobile: pinch spread zooms in, pinch closes pull back',
    pinchIn < pinchBefore * 0.8 && pinchOut > pinchIn && pinchOut <= open.max + 1e-6,
    { before: pinchBefore, afterIn: pinchIn, afterOut: pinchOut });
  await page.click('#wardrobe-zoom-fit');

  // 7. spin: the turntable advances (rate honest for the software GL's
  //    frame pace — real 60 fps hardware runs the designed 0.5 rad/s)
  await page.click('#wardrobe-spin');
  const spinA = await page.evaluate(() => window.__game.wardrobe.yawTarget);
  await settle(page, 1500);
  const spinB = await page.evaluate(() => window.__game.wardrobe.yawTarget);
  await settle(page, 1500);
  const spinC = await page.evaluate(() => window.__game.wardrobe.yawTarget);
  check('mobile: Spin advances the turntable, steadily',
    spinB - spinA > 0.04 && spinC - spinB > 0.04, { delta1: Math.round((spinB - spinA) * 1000) / 1000, delta2: Math.round((spinC - spinB) * 1000) / 1000 });
  await page.click('#wardrobe-spin'); // off → back to the greeting
  await converge(page);

  // 8. all six characters switch + re-frame; preview ring; meta updates
  const ids = await page.evaluate(() => [...document.querySelectorAll('.wardrobe-tile')].map((t) => t.dataset.starter));
  const wearing = await page.evaluate(() => window.__game.wardrobe.wearingId);
  const homes = {};
  let allOk = true;
  const switchNotes = {};
  for (const id of ids) {
    await page.click(`.wardrobe-tile[data-starter="${id}"]`);
    await converge(page);
    const s = await page.evaluate((sid) => {
      const w = window.__game.wardrobe;
      const tile = document.querySelector(`.wardrobe-tile[data-starter="${sid}"]`);
      return {
        home: Math.round(w.homeDist * 1000) / 1000,
        dist: Math.round(w.dist * 1000) / 1000,
        previewing: tile.classList.contains('previewing'),
        meta: document.getElementById('wardrobe-meta-name').textContent,
        confirmShown: !document.getElementById('wardrobe-confirm').hidden,
      };
    }, id);
    homes[id] = s.home;
    // the lock law asks only when the look DIFFERS from the worn one — the
    // worn tile answers "that's already you" with no strip (its confirmShown
    // is false BY LAW, not by failure)
    const ok = s.previewing && Math.abs(s.dist - s.home) < 0.02 && s.meta.length > 0
      && (s.confirmShown || id === wearing);
    switchNotes[id] = { ok, confirm: s.confirmShown };
    if (!ok) allOk = false;
    // stand the confirm strip down for the next tile
    if (s.confirmShown) {
      await page.click('#wardrobe-keep');
      await settle(page, 300);
    }
  }
  const distinctFits = new Set(Object.values(homes)).size;
  check('mobile: all six characters switch, re-frame to full body, keep the lock law',
    allOk && ids.length === 6, { homes, count: ids.length, notes: switchNotes });
  check('mobile: framing adapts per body (distinct fits for distinct scales)', distinctFits >= 3, { distinctFits, homes });
  await page.click(`.wardrobe-tile[data-starter="classic"]`);
  await settle(page, 700);

  // 9. pick-mode / landscape: rotate the viewport — the fit must re-run
  await page.setViewportSize({ width: 844, height: 390 });
  await settle(page, 900);
  const landscape = await page.evaluate(() => {
    const stage = document.getElementById('wardrobe-stage').getBoundingClientRect();
    const card = document.getElementById('wardrobe-card').getBoundingClientRect();
    const w = window.__game.wardrobe;
    return { share: Math.round((stage.height / card.height) * 100), dist: Math.round(w.dist * 100) / 100, home: Math.round(w.homeDist * 100) / 100, rowLayout: card.width > card.height };
  });
  check('mobile: landscape re-fits (row layout, full body still framed)',
    landscape.rowLayout && Math.abs(landscape.dist - landscape.home) < 0.06, landscape);
  await page.screenshot({ path: join(OUT, 'm6-landscape.png') });

  // 11. close: the loop rests, the street keeps working
  await page.setViewportSize({ width: 390, height: 844 });
  await settle(page, 500);
  await page.evaluate(() => window.__game.toggleWardrobe());
  const rafAfterClose = await page.evaluate(() => window.__game.wardrobe.rafId);
  check('mobile: the render loop rests when the room folds', rafAfterClose === 0, { rafId: rafAfterClose });
  const pos0 = await page.evaluate(() => ({ ...window.__game.player.capsule }));
  await page.keyboard.down('KeyW');
  await settle(page, 900);
  await page.keyboard.up('KeyW');
  const pos1 = await page.evaluate(() => ({ ...window.__game.player.capsule }));
  const moved = Math.hypot(pos1.x - pos0.x, pos1.z - pos0.z);
  check('mobile: gameplay walks after the wardrobe closes', moved > 0.2, { moved: Math.round(moved * 100) / 100 });

  // 12. save survives a reload, wearing intact
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game?.playerVisual, null, { timeout: 45000 });
  const afterReload = await page.evaluate(() => window.__game.state.starterId);
  check('mobile: save survives reload — same face', afterReload === 'classic', { starter: afterReload });
  await page.close();
}

// ----------------------------------------------------- no-WebGL fallback --
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`http://localhost:${PORT}/?starter=classic&probe=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game?.playerVisual, null, { timeout: 45000 });
  // a context that can't give GL: force the seam-law path by clobbering getContext
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
    window.__game.toggleWardrobe();
  });
  await settle(page, 500);
  const seam = await page.evaluate(() => ({
    open: window.__game.wardrobe.isOpen,
    canvasHidden: document.getElementById('wardrobe-canvas').hidden,
    hint: document.getElementById('wardrobe-hint').textContent,
    tiles: document.querySelectorAll('.wardrobe-tile').length,
  }));
  check('seam law: no WebGL degrades to the paper lineup, laws intact',
    seam.open && seam.canvasHidden && seam.tiles === 6, seam);
  await page.close();
}

await browser.close();
server.close();
writeFileSync(join(OUT, 'wardrobe-verify-report.json'), JSON.stringify(report, null, 2));
const failed = report.filter((r) => !r.ok);
console.log(`\n${report.length - failed.length}/${report.length} checks passed`);
if (failed.length) process.exitCode = 1;
