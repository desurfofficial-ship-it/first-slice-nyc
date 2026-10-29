/**
 * Probe: Rosa's walk + the shelf pick note (playtest 2026-10-29 fixes).
 * Captures: (1) Rosa mid-walk toward the bodega, (2) the pick note naming
 * the item, (3) the storefront from the street with both signs.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots');
mkdirSync(OUT, { recursive: true });
const URL = process.env.PROBE_URL || 'http://localhost:4173/';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: join(OUT, name) });

const g = () => page.evaluate(() => {
  const game = window.__game;
  return {
    step: game.state.step,
    rosa: { x: game.world.rosa.position.x, z: game.world.rosa.position.z },
    player: { x: game.player.capsule.x, z: game.player.capsule.z },
    walking: game.rosaWalking === undefined ? 'n/a' : game.rosaWalking,
  };
});

// steer with real keys toward a point
async function walkTo(x, z, timeout = 15) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout * 1000) {
    const p = await page.evaluate(() => {
      const game = window.__game;
      return { x: game.player.capsule.x, z: game.player.capsule.z, yaw: game.cam.camYaw };
    });
    const dx = x - p.x, dz = z - p.z;
    if (Math.hypot(dx, dz) < 0.4) break;
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    const rx = -Math.cos(p.yaw), rz = Math.sin(p.yaw);
    const len = Math.hypot(dx, dz) || 1;
    const f = (dx / len) * fx + (dz / len) * fz;
    const r = (dx / len) * rx + (dz / len) * rz;
    await page.evaluate(({ f, r }) => {
      const i = window.__game.input;
      i.injectKey('KeyW', f > 0.2); i.injectKey('KeyS', f < -0.2);
      i.injectKey('KeyD', r > 0.2); i.injectKey('KeyA', r < -0.2);
    }, { f, r });
    await wait(60);
  }
  await page.evaluate(() => {
    const i = window.__game.input;
    ['KeyW', 'KeyS', 'KeyA', 'KeyD'].forEach((k) => i.injectKey(k, false));
  });
  await wait(200);
}

// 1. greet Rosa
await walkTo(-27.8, 6.6);
await page.evaluate(() => window.__game.input.injectInteract());
await wait(700);
console.log('after greet:', JSON.stringify(await g()));

// 2. mid-walk — she should be between the terminal and the bodega door
await wait(2500);
const mid = await g();
console.log('mid-walk:', JSON.stringify(mid));
await shot('10-rosa-midwalk.png');

// 3. follow her in
await walkTo(-16, 7.2);
await walkTo(-16, 11.5);
await wait(400);
console.log('inside:', JSON.stringify(await g()));

// 4. pick the mango — the note must name it
await walkTo(-18, 18.4);
await page.evaluate(() => window.__game.input.injectInteract());
await wait(500);
const note = await page.evaluate(() => document.getElementById('note')?.textContent);
console.log('pick note:', JSON.stringify(note));
await shot('11-pick-note.png');

// 5. storefront from the street (both signs readable)
await walkTo(-16, 3.5);
await wait(600);
await shot('12-storefront.png');

await browser.close();
console.log('PROBE DONE');
