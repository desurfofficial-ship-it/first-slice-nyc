/** Straight-on storefront shot + Rosa-at-counter check (evidence for the sign fix). */
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

// greet Rosa so she walks, then stand back in the street and watch the storefront
await page.evaluate(() => {
  const game = window.__game;
  game.player.capsule.x = -27.8; game.player.capsule.z = 6.6;
});
await wait(300);
await page.evaluate(() => window.__game.input.injectInteract());
await wait(1500);
// pull the camera to a clean 3/4 storefront view mid-street
await page.evaluate(() => {
  const game = window.__game;
  game.player.capsule.x = -22; game.player.capsule.z = 1.5;
  game.cam.camYaw = 0.35;
});
await wait(2500);
await page.screenshot({ path: join(OUT, '13-storefront-wide.png') });
// Rosa arrived behind the counter?
const rosa = await page.evaluate(() => {
  const g = window.__game;
  return { x: g.world.rosa.position.x.toFixed(1), z: g.world.rosa.position.z.toFixed(1), walking: g.rosaWalking };
});
console.log('rosa:', JSON.stringify(rosa));
await browser.close();
console.log('STOREFRONT SHOT DONE');
