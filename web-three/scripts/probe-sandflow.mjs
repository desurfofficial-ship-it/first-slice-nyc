/**
 * probe-sandflow.mjs — loads the dev-only sand3d showcase, measures the real
 * loaded scene, exercises the joint driver and the instancing toggle, and
 * screenshots it. Follows the repo probe pattern (window.__SANDFLOW_SHOWCASE).
 *
 * Usage: node scripts/probe-sandflow.mjs [baseURL]   (default http://localhost:5173)
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
const freeze = () => page.evaluate(() => { const s = window.__SANDFLOW_SHOWCASE; s.renderer.setAnimationLoop(null); s.renderer.render(s.scene, s.camera); });
page.on('console', (m) => {
  if (m.text().includes('[sandflow-showcase]')) console.log('PAGE:', m.text());
});

await page.goto(`${base}/?showcase=sandflow`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__SANDFLOW_SHOWCASE_READY, null, { timeout: 30000 });
await page.waitForFunction(
  () => window.__SANDFLOW_SHOWCASE.records.length >= 13,
  null,
  { timeout: 60000 },
);
await page.waitForTimeout(2500); // let HEAD bytes + fps settle

const measured = await page.evaluate(() => {
  const { records, renderer } = window.__SANDFLOW_SHOWCASE;
  const info = renderer.info;
  return {
    assets: records.map((r) => ({
      name: r.name, tris: r.tris, meshes: r.meshes, materials: r.materials,
      textures: r.textures, bytes: r.bytes,
      joints: r.joints.map((j) => ({ name: j.name, kind: j.kind, axis: j.axis.toArray(),
        lower: j.lower, upper: j.upper })),
      sizeM: [r.size.x, r.size.z, r.size.y].map((v) => Number(v.toFixed(2))),
    })),
    scene: {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    },
    dpr: window.devicePixelRatio,
  };
});

// FPS over ~2.5s
const fps = await page.evaluate(() => new Promise((resolve) => {
  let n = 0;
  const t0 = performance.now();
  const loop = () => {
    n += 1;
    if (performance.now() - t0 < 2500) requestAnimationFrame(loop);
    else resolve(Math.round((n * 1000) / (performance.now() - t0)));
  };
  requestAnimationFrame(loop);
}));
measured.fps_software_renderer = fps;

await freeze();
await page.screenshot({ path: 'shots/sandflow-showcase-grid.png' });

// click apartment_door (articulated) — door should pose open via extras
await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#sf-list div')];
  rows.find((r) => r.textContent.includes('apartment_door'))?.click();
});
await page.waitForTimeout(600);
const doorPose = await page.evaluate(() => {
  const rec = window.__SANDFLOW_SHOWCASE.records.find((r) => r.name === 'apartment_door');
  const jointNode = rec.joints[0].node;
  return { rotated: jointNode.quaternion.angleTo(jointNode.userData.__rest ?? { x: 0, y: 0, z: 0, w: 1 }) };
});
measured.door_joint_pose = doorPose;

await freeze();
await page.screenshot({ path: 'shots/sandflow-showcase-door.png' });

// instancing measurement: single explicit renders, loop frozen
const step = async (label, fn) => {
  process.stdout.write(`STEP ${label}… `);
  const r = await fn();
  console.log("ok");
  return r;
};
await step("lower-pixelratio", () => page.evaluate(() => window.__SANDFLOW_SHOWCASE.renderer.setPixelRatio(1)));
const before = await step("baseline-render", () => page.evaluate(() => {
  const s = window.__SANDFLOW_SHOWCASE;
  s.renderer.setAnimationLoop(null);
  s.renderer.render(s.scene, s.camera);
  return s.renderer.info.render.calls;
}));
const render = () => page.evaluate(() => {
  const s = window.__SANDFLOW_SHOWCASE;
  s.renderer.render(s.scene, s.camera);
  return { calls: s.renderer.info.render.calls, tris: s.renderer.info.render.triangles };
});
await step("clone-click", () => page.evaluate(() => document.querySelector('#sf-clone').click()));
const cloned = await step("clone-render", render);
try {
  await step("clone-shot", () => page.screenshot({ path: 'shots/sandflow-showcase-clones.png', timeout: 45000 }));
} catch (e) { console.log("clone-shot skipped:", e.message.split("\n")[0]); }
await step("clear", () => page.evaluate(() => document.querySelector('#sf-clear').click()));
await step("inst-click", () => page.evaluate(() => document.querySelector('#sf-inst').click()));
const instanced = await step("inst-render", render);
measured.instancing = { baseline_calls: before, cloned_100: cloned, instanced_100: instanced };
writeFileSync('shots/sandflow-measurements.json', JSON.stringify(measured, null, 2));
console.log('MEASURED', JSON.stringify(measured.scene), 'fps', fps);
console.log('INSTANCING', JSON.stringify(measured.instancing));
console.log('DOOR JOINT', JSON.stringify(measured.door_joint_pose));
try {
  await step("final-shot", () => page.screenshot({ path: 'shots/sandflow-showcase-instanced.png', timeout: 45000 }));
} catch (e) { console.log("final-shot skipped:", e.message.split("\n")[0]); }
await browser.close();
