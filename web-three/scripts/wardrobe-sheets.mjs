/**
 * Wardrobe contact sheets — stitch the before/after evidence into two
 * labeled comparison sheets (mobile + desktop) for the completion report.
 * Usage: node scripts/wardrobe-sheets.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from 'canvas';

const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, '..', 'shots', 'wardrobe');

async function sheet(rows, out, cellW) {
  // rows: [{ label, files: [path...] }] — every row same file count
  const imgs = [];
  let cellH = 0;
  for (const row of rows) {
    const loaded = [];
    for (const f of row.files) {
      const img = await loadImage(f);
      loaded.push(img);
    }
    cellH = Math.max(cellH, ...loaded.map((i) => Math.round(i.height * (cellW / i.width))));
    imgs.push(loaded);
  }
  const labelH = 34;
  const pad = 10;
  const cols = rows[0].files.length;
  const W = cols * (cellW + pad) + pad;
  const H = rows.length * (cellH + labelH + pad) + pad + labelH;
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(0, 0, W, H);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#f7b32b';
  ctx.fillText(out.title, pad, 26);
  for (let r = 0; r < rows.length; r++) {
    const y = pad + labelH + r * (cellH + labelH + pad);
    ctx.fillStyle = '#fff8f0';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(rows[r].label, pad, y + 18);
    for (let c = 0; c < imgs[r].length; c++) {
      const img = imgs[r][c];
      const h = Math.round(img.height * (cellW / img.width));
      const x = pad + c * (cellW + pad);
      ctx.drawImage(img, x, y + labelH, cellW, h);
    }
  }
  writeFileSync(out.path, cv.toBuffer('image/png'));
  console.log('wrote', out.path);
}

const has = (p) => existsSync(p);

// mobile sheet: before vs after, pick + wardrobe + landscape
const mobileRows = [
  {
    label: 'BEFORE — pick mode (390×844): chest-up crop',
    files: [join(shots, 'before/pick-mobile-portrait.png')],
  },
  {
    label: 'AFTER — pick mode: full figure, 3D-first',
    files: [join(shots, 'after/pick-mobile-portrait.png')],
  },
  {
    label: 'BEFORE — wardrobe (390×844): 42% stage, torso only',
    files: [join(shots, 'before/wardrobe-mobile-portrait.png')],
  },
  {
    label: 'AFTER — wardrobe: 66% stage, head to soles',
    files: [join(shots, 'after/wardrobe-mobile-portrait.png')],
  },
  {
    label: 'AFTER — landscape (844×390): side-by-side, full body',
    files: [join(shots, 'after/wardrobe-mobile-landscape.png')],
  },
];
for (const row of mobileRows) if (!row.files.every(has)) throw new Error('missing ' + row.files.find((f) => !has(f)));
await sheet(mobileRows, { title: 'FIRST SLICE wardrobe — mobile (before / after)', path: join(shots, 'mobile-before-after.png') }, 300);

// desktop sheet
const desktopRows = [
  {
    label: 'BEFORE — desktop wardrobe (1280×800): hair cropped at the top',
    files: [join(shots, 'before/wardrobe-desktop.png')],
  },
  {
    label: 'AFTER — desktop: full figure + pedestal, zoom cluster, name plate',
    files: [join(shots, 'after/wardrobe-desktop.png')],
  },
];
await sheet(desktopRows, { title: 'FIRST SLICE wardrobe — desktop (before / after)', path: join(shots, 'desktop-before-after.png') }, 560);
