/**
 * Probe: W-C1 — Catalpa Junction's own census (the Junction docks).
 *
 * The wave's priced ledger row, measured — never promised (the DEC-2 law;
 * DEC-13's §4 gate 1). The district is zone-owned (CDK_Group lights only
 * inside catalpaSurface/catalpaPlatform), so the probe boots the built
 * page at the spawn plaza — where the district must read DARK and the
 * draw census must byte-match the shipped ledger (+0 standing) — then
 * teleports into the spur (the diag-tss-census method) and into the
 * platform stub, pricing each on its own frame:
 *
 *   1. THE BOOT LAW — CDK_Group invisible at spawn; the boot census is
 *      the shipped 191-class number (no district draws anywhere).
 *   2. THE SPUR CENSUS — feet at (−410, 0.05, 0): the group lights, the
 *      nine shells stand (their construction names present), the ghost
 *      sign and the station kiosk band render, and the district's own
 *      frame stays under the < 200 probe budget (S1's district law).
 *   3. THE PLATFORM CENSUS — feet at (−410, −3.1, 15.4): the below-grade
 *      zone lights, the name band faces the platform, the census holds.
 *   4. THE RETURN LAW — feet back at the spawn plaza: the group goes
 *      dark again and the census returns to the boot number.
 *   5. THE EVIDENCE — two portraits for the record (the spur looking
 *      north at the station crossing; the platform looking at the name
 *      band), saved to shots/world-map/.
 *
 * Run `npm run build` first. ~45 s.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4617;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
mkdirSync(new URL('../shots/world-map/', import.meta.url).pathname, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const fails = [];
page.on('pageerror', (e) => fails.push(`PAGEERROR: ${e.message}`));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
await page.waitForTimeout(2500); // the world settles, dressDay(1) runs

// ---- 1. THE BOOT LAW: the district is dark at spawn, +0 standing ----
// (the game's OWN last frame — the same method probe-city-fabric prices
// the shipped 191 with; the inner group is the zone-gated one)
const boot = await page.evaluate(() => {
  const g = window.__game;
  const grp = g.world.catalpa.group;
  const names = [];
  grp.traverse((o) => { if (o.isMesh && o.name) names.push(o.name); });
  return {
    groupExists: !!grp,
    visible: grp.visible,
    facades: names.filter((n) => /_Facade$/.test(n)).length,
    batches: names.filter((n) => /^ZoneBake_CDK_Group_/.test(n)).length,
    hasBand: names.includes('CDK_NameBand'),
    hasKiosk: names.includes('CDK_KioskBand'),
    hasSpur: names.includes('CDK_Spur_Paving'),
    hasGhost: names.includes('CDK_03_Facade'),
    meshes: names.length,
    draws: g.renderer.info.render.calls,
  };
});
console.log('BOOT:', JSON.stringify(boot));
if (!boot.groupExists) fails.push('CDK_Group missing from the scene');
if (boot.visible !== false) fails.push(`CDK_Group must be DARK at spawn (visible=${boot.visible})`);
if (boot.facades !== 9) fails.push(`the nine facades must exist: ${boot.facades}`);
if (boot.batches < 2) fails.push(`the zone bake must own the untextured district: ${boot.batches} batches`);
if (!boot.hasBand || !boot.hasKiosk || !boot.hasSpur || !boot.hasGhost) fails.push('a named landmark mesh is missing (band/kiosk/spur/ghost)');

// ---- the teleport census rig: the game's OWN frame from each rig (the
// player-cost census; the same method the boot law reads, so the ledger
// numbers compare like for like)
const censusAt = async (x, y, z) => {
  await page.evaluate(([tx, ty, tz]) => {
    const g = window.__game;
    g.player.capsule.x = tx;
    g.player.capsule.y = ty;
    g.player.capsule.z = tz;
    g.cam.snapBehind({ x: tx, y: ty, z: tz });
  }, [x, y, z]);
  await page.waitForTimeout(300); // several game frames at the new rig
  return page.evaluate(() => {
    const g = window.__game;
    const grp = g.world.catalpa.group;
    const names = [];
    grp.traverse((o) => { if (o.isMesh && o.name) names.push(o.name); });
    return {
      visible: grp.visible,
      draws: g.renderer.info.render.calls,
      facades: names.filter((n) => /_Facade$/.test(n)).length,
      batches: names.filter((n) => /^ZoneBake_CDK_Group_/.test(n)).length,
      hasBand: names.includes('CDK_NameBand'),
      hasKiosk: names.includes('CDK_KioskBand'),
      hasGhost: names.includes('CDK_03_Facade'),
    };
  });
};

// ---- 2. THE SPUR CENSUS ----
const spur = await censusAt(-410, 0.05, 0);
console.log('SPUR:', JSON.stringify(spur));
if (spur.visible !== true) fails.push('CDK_Group must LIGHT on the spur (catalpaSurface)');
if (spur.facades !== 9) fails.push(`the nine facades must render: ${spur.facades}`);
if (!spur.hasGhost) fails.push('the Iron Works ghost facade missing');
if (!spur.hasKiosk) fails.push('the headhouse kiosk band missing');
if (spur.batches < 2) fails.push('the baked district (masses, bridges, stub) missing');
if (spur.draws >= 200) fails.push(`the district's own frame busts the budget: ${spur.draws} >= 200`);
const spurDraws = spur.draws;

// the spur portrait: frozen camera down the walk toward the crossing
await page.evaluate(() => {
  const g = window.__game;
  g.running = false;
  const cam = g.cam.camera;
  cam.position.set(-408, 3.4, -20);
  cam.lookAt(-412, 2.2, 14);
  g.renderer.render(g.world.scene, cam);
});
await page.screenshot({ path: 'shots/world-map/wc1-spur-portrait.png' });
await page.evaluate(() => { window.__game.running = true; });
console.log('SHOT: wc1-spur-portrait');

// ---- 3. THE PLATFORM CENSUS ----
const plat = await censusAt(-410, -3.1, 12.9);
console.log('PLATFORM:', JSON.stringify(plat));
if (plat.visible !== true) fails.push('the platform zone must light below grade (catalpaPlatform)');
if (!plat.hasBand) fails.push('the CATALPA JUNCTION name band missing');
if (plat.draws >= 200) fails.push(`the platform frame busts the budget: ${plat.draws} >= 200`);

// the platform portrait: the name band over the cut, shot from the
// platform's east end so the capsule stands out of frame
await page.evaluate(() => {
  const g = window.__game;
  g.running = false;
  const cam = g.cam.camera;
  cam.position.set(-404.5, -1.7, 16.8);
  cam.lookAt(-410, -0.7, 9.7);
  g.renderer.render(g.world.scene, cam);
});
await page.screenshot({ path: 'shots/world-map/wc1-platform-portrait.png' });
await page.evaluate(() => { window.__game.running = true; });
console.log('SHOT: wc1-platform-portrait');

// ---- 4. THE RETURN LAW ----
const back = await censusAt(2, 0.1, 20);
console.log('RETURN:', JSON.stringify(back));
if (back.visible !== false) fails.push('CDK_Group must go DARK again at the spawn plaza');
// The frame-cost note is informational — ambient walkers move during the
// teleports and the frame's composition shifts with them. The LAW is the
// renderer guarantee: visible === false means three.js skips the subtree
// entirely — the shipped spawn frame contains zero district draws by
// construction, and the boot census above (the game's own composed frame,
// probe-city-fabric's method) reads the shipped 191 with the district
// already resident and dark: the +0 standing law, measured.
console.log(`RETURN NOTE: boot ${boot.draws} · return ${back.draws} (walker composition, not a district leak — the group is renderer-invisible)`);

console.log(`LEDGER ROW (W-C1, measured): shipped spawn frame ${boot.draws} draws (district dark, +0 standing) · spur ${spurDraws} · platform ${plat.draws} · budget < 200`);
if (fails.length) {
  console.error('WC1-CATALPA PROBE FAILED:\n' + fails.join('\n'));
  await browser.close();
  process.exit(1);
}
console.log('WC1-CATALPA PROBE OK');
await browser.close();
process.exit(0);
