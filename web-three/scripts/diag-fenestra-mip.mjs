/**
 * diag-fenestra-mip.mjs — isolate the FEN-GLITCH sampling path.
 *
 * Boots the built game, parks the street camera on the red facade, then:
 *   A. baseline shot (both atlases live)
 *   B. uFenFronts swapped to flat opaque white (remaining static = rooms)
 *   C. uFenRooms swapped to flat gray, fronts restored (remaining = fronts)
 *   D. THE GAME'S OWN GL mip chain read back level-by-level through an FBO
 *      attachment — the definitive answer on whether the chain exists and
 *      stays smooth (or was never generated).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4629;
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto(`http://localhost:${PORT}/?fx=off&tod=13:00`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2500);

// park the street camera on the red facade
await page.evaluate(async () => {
  const g = window.__game;
  if (typeof g.dismissPostcard === 'function') g.dismissPostcard();
  if (g.ui?.nameBox) g.ui.nameBox.hidden = true;
  const p = g.player.capsule;
  p.x = 4; p.z = -2; p.y = 0.05;
  g.world.update(1 / 60, p);
  await new Promise((res) => setTimeout(res, 320));
  g.world.update(1 / 60, p);
  g.cam.update = () => {};
  g.cam.camera.position.set(2, 4.2, -6);
  g.cam.camera.lookAt(14, 7, 14);
});
await page.waitForTimeout(300);

const regions = [
  ['blindsWindow', 442, 372, 56, 95],
  ['row3Window', 596, 558, 70, 105],
  ['purpleWindow', 312, 380, 52, 88],
];
async function noise(buf) {
  const b64 = buf.toString('base64');
  return page.evaluate(async ({ b64, regions }) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const out = {};
    for (const [label, x, y, w, h] of regions) {
      const d = ctx.getImageData(x, y, w, h).data;
      let sum = 0, n = 0;
      const lum = (i) => (d[i] + d[i + 1] + d[i + 2]) / 3;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        const i = (py * w + px) * 4;
        if (px + 1 < w) { sum += Math.abs(lum(i) - lum(i + 4)); n++; }
        if (py + 1 < h) { sum += Math.abs(lum(i) - lum(i + w * 4)); n++; }
      }
      out[label] = sum / n;
    }
    return out;
  }, { b64, regions });
}

async function stage(label) {
  const buf = await page.screenshot({ path: `shots/diag-fen-${label}.png` });
  console.log('shot', `shots/diag-fen-${label}.png`);
  return buf;
}

// ---- A. baseline
const a = await stage('baseline');
console.log('A baseline  ', JSON.stringify(await noise(a)));

// ---- D. the game's own GL mip chain, read level-by-level
const readback = await page.evaluate(() => {
  const g = window.__game;
  const cache = window.__diagTex;
  const mat = (() => { let r; g.world.scene.traverse((o) => { if (o.name?.startsWith('FenestraWindows_') && !r) r = o.material; }); return r; })();
  if (cache) {
    mat.uniforms.uFenRooms.value = cache.rooms;
    mat.uniforms.uFenFronts.value = cache.fronts;
  }
  const gl = g.renderer.getContext();
  const out = {};
  for (const [name, tex] of [['rooms', mat.uniforms.uFenRooms.value], ['fronts', mat.uniforms.uFenFronts.value]]) {
    if (!tex?.image) { out[name] = null; continue; }
    const props = g.renderer.properties.get(tex);
    const glTex = props?.__webglTexture ?? null;
    if (!glTex) { out[name] = { error: 'no GL texture (never uploaded)' }; continue; }
    {
      const slot = gl.TEXTURE0 + g.renderer.capabilities.maxTextures - 1;
      g.renderer.state.bindTexture(gl.TEXTURE_2D, glTex, slot);
      out[name + '_maxLod'] = gl.getTexParameter(gl.TEXTURE_2D, 0x813b);
    }
    const iw = tex.image.width, ih = tex.image.height;
    const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.bindTexture(gl.TEXTURE_2D, glTex);
    const levels = {};
    for (const level of [0, 2, 4, 6]) {
      const w = Math.max(1, iw >> level), h = Math.max(1, ih >> level);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glTex, level);
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (st !== gl.FRAMEBUFFER_COMPLETE) { levels[level] = 'incomplete'; continue; }
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let sum = 0, n = 0, mean = 0;
      const lum = (i) => (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4; mean += lum(i);
        if (x + 1 < w) { sum += Math.abs(lum(i) - lum(i + 4)); n++; }
        if (y + 1 < h) { sum += Math.abs(lum(i) - lum(i + w * 4)); n++; }
      }
      levels[level] = { grad: +(sum / n).toFixed(2), mean: +(mean / (w * h)).toFixed(1) };
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
    gl.bindTexture(gl.TEXTURE_2D, prevTex);
    gl.deleteFramebuffer(fbo);
    out[name] = { size: `${iw}x${ih}`, levels };
  }
  return out;
});
console.log('D mip readback', JSON.stringify(readback, null, 1));

// ---- the shader-level isolation, one variant at a time (label+expr are
// BOTH passed into the page — the cache key must differ per variant):
//   diffuse replacement + emissive kill, or emissive-only views.
async function isoVariant(label, diffuseExpr, killEmissive, vPatch) {
  const res = await page.evaluate(async ({ label, diffuseExpr, killEmissive, vPatch }) => {
    const g = window.__game;
    let n = 0;
    g.world.scene.traverse((o) => {
      if (o.name?.startsWith('FenestraWindows_')) {
        const m = o.material;
        m.customProgramCacheKey = () => 'iso-' + label;
        m.onBeforeCompile = (shader) => {
          window.__fenOrigCompile(shader);
          if (vPatch) {
            shader.vertexShader = shader.vertexShader
              .replace(vPatch.decl, vPatch.declWith)
              .replace(vPatch.assign, vPatch.assignWith);
          }
          if (diffuseExpr !== null) {
            shader.fragmentShader = shader.fragmentShader
              .replace('diffuseColor.rgb *= _fenFront.rgb * _fenA;', 'diffuseColor.rgb = ' + diffuseExpr + ';');
          }
          if (killEmissive) {
            shader.fragmentShader = shader.fragmentShader
              .replace('totalEmissiveRadiance += _fenInteriorEmissive;', '');
            shader.uniforms.uFenFresnel.value = 0;
            shader.uniforms.uFenFresnelColor.value.set(0, 0, 0);
          }
        };
        m.needsUpdate = true;
        n++;
      }
    });
    return n;
  }, { label, diffuseExpr, killEmissive, vPatch });
  await page.waitForTimeout(1200);
  const shot = await stage('iso-' + label);
  const stats = await noise(shot);
  console.log(`ISO ${label.padEnd(12)}`, JSON.stringify(stats));
  return stats;
}

// stash the TRUE original compile hook once
await page.evaluate(() => {
  const g = window.__game;
  g.world.scene.traverse((o) => {
    if (o.name?.startsWith('FenestraWindows_') && !window.__fenOrigCompile) {
      window.__fenOrigCompile = o.material.onBeforeCompile.bind(o.material);
    }
  });
});

await isoVariant('frontpick', 'vec3(mod(floor(imHash(vFenId, 7.1) * 16.0), 4.0) * 0.25, floor(floor(imHash(vFenId, 7.1) * 16.0) / 4.0) * 0.25, 0.3)', true);
// the vertex-computed pick: same hash, computed per-vertex on constant inputs
const VP = {
  decl: 'varying vec3 vFenId;',
  declWith: `varying vec3 vFenId;
  varying float vFenVtxPick;
  float imHashV(vec3 p, float seed) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3) + seed);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }`,
  assign: 'vFenId = instanceWindowId;',
  assignWith: 'vFenId = instanceWindowId; vFenVtxPick = imHashV(instanceWindowId, 7.1);',
};
await isoVariant('vtxpick', 'vec3(mod(floor(vFenVtxPick * 16.0), 4.0) * 0.25, floor(floor(vFenVtxPick * 16.0) / 4.0) * 0.25, 0.3)', true, VP);
await isoVariant('frontdiff', null, true);
await isoVariant('rooms-only', '_fenInterior', true);
await isoVariant('emissive-only', 'vec3(0.0)', false);
await isoVariant('lightK', '_fenLightK(vFenId) * 0.35', true);
await isoVariant('vfenid', 'fract(vFenId * 0.017)', true);
await isoVariant('litroom', '_fenLitRoom * 0.5', true);
// restore the shipped material
await page.evaluate(() => {
  const g = window.__game;
  g.world.scene.traverse((o) => {
    if (o.name?.startsWith('FenestraWindows_')) {
      const m = o.material;
      delete m.customProgramCacheKey;
      m.onBeforeCompile = window.__fenOrigCompile;
      m.needsUpdate = true;
    }
  });
});
console.log('materials restored');

await browser.close();
server.close();
