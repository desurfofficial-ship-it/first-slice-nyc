import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4639;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.glb': 'model/gltf-binary', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://localhost:${PORT}/?fx=off&tod=13:00`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2500);
const report = await page.evaluate(() => {
  const g = window.__game;
  const gl = g.renderer.getContext();
  // also dump the CPU-side attribute data
  const cpu = [];
  g.world.scene.traverse((o) => {
    if (o.name?.startsWith('FenestraWindows_') && cpu.length < 2) {
      const a = o.geometry.getAttribute('instanceWindowId');
      const lod = o.geometry.getAttribute('instanceLod');
      cpu.push({
        mesh: o.name, count: o.count,
        isInstancedBufferAttribute: a?.isInstancedBufferAttribute,
        meshPerAttribute: a?.meshPerAttribute,
        itemSize: a?.itemSize, count_attr: a?.count,
        first8: a ? Array.from(a.array.slice(0, 9)).map((v) => +v.toFixed(2)) : null,
        lodFirst4: lod ? Array.from(lod.array.slice(0, 4)) : null,
      });
    }
  });
  // hook the instanced draws: on the first fenestra draw, dump live GL state
  const dump = { hooked: false, draws: [] };
  for (const name of ['drawElementsInstanced', 'drawArraysInstanced']) {
    const orig = gl[name].bind(gl);
    gl[name] = function (...args) {
      if (!dump.hooked) {
        const prog = gl.getParameter(gl.CURRENT_PROGRAM);
        if (prog) {
          const n = gl.getProgramParameter(prog, gl.ACTIVE_ATTRIBUTES);
          const attrs = [];
          for (let i = 0; i < n; i++) {
            const info = gl.getActiveAttrib(prog, i);
            const loc = gl.getAttribLocation(prog, info.name);
            const enabled = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
            const size = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_SIZE);
            const divisor = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_DIVISOR);
            attrs.push({ name: info.name, loc, enabled, size, divisor });
          }
          dump.draws.push({ draw: name, attrs });
          if (attrs.some((a) => a.name === 'instanceWindowId')) dump.hooked = true;
        }
      }
      return orig(...args);
    };
  }
  // render a few frames with the hook live
  return new Promise((resolve) => {
    let frames = 0;
    const tick = () => {
      frames++;
      if (dump.hooked || frames > 30) { resolve({ cpu, dump }); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
});
console.log(JSON.stringify(report, null, 1));
await browser.close(); server.close();
