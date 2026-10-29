/** Prove the .glb upgrade seam both ways: real file swaps the prop, missing
 *  file keeps the procedural placeholder. Uses the existing car_taxi.glb as a
 *  stand-in mesh (the pipeline will ship real ones later). */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots');
const URL = process.env.PROBE_URL || 'http://localhost:4173/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 1) fallback path: a missing file must keep the procedural mailbox
const miss = await page.evaluate(() =>
  window.__game.world.upgradePropWithGLB('mailbox', 'models/__missing__.glb'));
console.log('MISSING-FILE RESULT (want false):', miss);

// 2) upgrade path: an existing .glb must replace the placeholder's visual
const ok = await page.evaluate(() =>
  window.__game.world.upgradePropWithGLB('trashcan', 'models/car_taxi.glb'));
console.log('GLB-SWAP RESULT (want true):', ok);

// scene-graph assertions
const state = await page.evaluate(() => {
  const w = window.__game.world;
  const find = (name) => !!w.scene.getObjectByName(name);
  return {
    upgrades: [...w.glbUpgrades.entries()],
    taxiMeshInTrashcanSlot: find('Trashcan_glb'),
    mailboxStillProcedural: find('Mailbox'),
  };
});
console.log('SCENE:', JSON.stringify(state));

// 3) look at it: stand near the upgraded trashcan slot
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 9.2; g.player.capsule.z = -3.4; g.player.capsule.yaw = Math.PI * 0.75;
  g.cam.camYaw = -2.4;
});
await wait(1200);
await page.screenshot({ path: join(OUT, '14-glb-seam.png') });

if (miss !== false || ok !== true || !state.taxiMeshInTrashcanSlot || !state.mailboxStillProcedural) {
  console.error('GLB SEAM PROBE FAILED');
  process.exitCode = 1;
} else {
  console.log('GLB SEAM PROBE OK');
}
await browser.close();
