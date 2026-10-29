/**
 * Postcard capture — the TS-01 pipeline in browser form:
 *   authored rig pose → offscreen render target → pixels → paper frame +
 *   caption composite → PNG (download + display in the panel).
 * This is a real capture of the live scene, never a placeholder button.
 *
 * Lessons from the Godot spike, kept here:
 *   - capture happens AFTER the dusk tween settles (the sky must not be moving)
 *   - the frame must not be uniform — we check pixel variance before composing
 */

import * as THREE from 'three';

export interface CaptureResult {
  dataUrl: string;
  width: number;
  height: number;
}

const CARD_W = 768;
const CARD_H = 1344;         // TS-01 output size (768×1344 vertical postcard)
const IMG_W = 768;
const IMG_H = 1160;          // TS-01 offscreen render size; caption strip below

/** Render the scene from `camera` into an offscreen target and return pixels. */
function renderPixels(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): ImageData {
  const rt = new THREE.WebGLRenderTarget(IMG_W, IMG_H, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace,
  });
  const prevTarget = renderer.getRenderTarget();
  const prevSize = new THREE.Vector2();
  renderer.getSize(prevSize);
  const prevPixelRatio = renderer.getPixelRatio();

  try {
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    const buf = new Uint8Array(IMG_W * IMG_H * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, IMG_W, IMG_H, buf);
    // flip Y (GL origin is bottom-left)
    const imageData = new ImageData(IMG_W, IMG_H);
    const row = IMG_W * 4;
    for (let y = 0; y < IMG_H; y++) {
      const src = (IMG_H - 1 - y) * row;
      imageData.data.set(buf.subarray(src, src + row), y * row);
    }
    return imageData;
  } finally {
    renderer.setRenderTarget(prevTarget);
    renderer.setPixelRatio(prevPixelRatio);
    renderer.setSize(prevSize.x, prevSize.y, false);
    rt.dispose();
  }
}

/** Uniform-frame guard: a real capture has variance (the spike's lesson #2). */
export function hasVariance(img: ImageData): boolean {
  const grid = 8;
  let min = 255, max = 0;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const x = Math.floor((gx + 0.5) * (IMG_W / grid));
      const y = Math.floor((gy + 0.5) * (IMG_H / grid));
      const i = (y * IMG_W + x) * 4;
      const l = (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
      if (l < min) min = l;
      if (l > max) max = l;
    }
  }
  return max - min > 8;
}

/**
 * Compose the postcard: deckle-edged cream paper, the capture, a stamp corner
 * with the cart name, and the handwritten caption (Styleframe C framing,
 * caption strip laid out like the TS-01 reference artifact).
 */
export function composePostcard(
  img: ImageData,
  caption: string,
  cartName: string,
  day: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // paper
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  // subtle paper grain: sparse warm dots
  ctx.fillStyle = 'rgba(178, 58, 72, 0.05)';
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * CARD_W;
    const y = Math.random() * CARD_H;
    ctx.fillRect(x, y, 2, 2);
  }

  // photo with a small margin (postcard print border)
  const mx = 40;
  const my = 40;
  const photoW = CARD_W - mx * 2;
  const photoH = 1024;

  // photo backing shadow
  ctx.save();
  ctx.shadowColor = 'rgba(58, 52, 64, 0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#E8E4DC';
  ctx.fillRect(mx - 6, my - 6, photoW + 12, photoH + 12);
  ctx.restore();

  // draw the captured pixels, fit-height and centered
  const tmp = document.createElement('canvas');
  tmp.width = IMG_W;
  tmp.height = IMG_H;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  const scale = photoH / IMG_H;
  const drawW = IMG_W * scale;
  ctx.drawImage(tmp, mx + (photoW - drawW) / 2, my, drawW, photoH);

  // thin brick rule under the photo
  ctx.strokeStyle = '#B23A48';
  ctx.lineWidth = 3;
  ctx.strokeRect(mx - 1.5, my - 1.5, photoW + 3, photoH + 3);

  // day tag, top-left over the photo (reference layout)
  ctx.font = '600 24px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 184, 92, 0.95)';
  ctx.shadowColor = 'rgba(26, 20, 32, 0.6)';
  ctx.shadowBlur = 6;
  ctx.fillText(`FIRST SLICE \u00B7 DAY ${day}`, mx + 18, my + 18);
  ctx.shadowBlur = 0;

  // stamp corner (top-right over the photo) with the cart name
  const stampW = 148;
  const stampH = 96;
  const stampX = CARD_W - stampW - 58;
  const stampY = my + 22;
  ctx.save();
  ctx.translate(stampX + stampW / 2, stampY + stampH / 2);
  ctx.rotate((8 * Math.PI) / 180);
  ctx.fillStyle = '#FFF8F0';
  ctx.strokeStyle = '#B23A48';
  ctx.lineWidth = 4;
  ctx.setLineDash([2, 6]);
  ctx.fillRect(-stampW / 2, -stampH / 2, stampW, stampH);
  ctx.strokeRect(-stampW / 2, -stampH / 2, stampW, stampH);
  ctx.setLineDash([]);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#2A9D8F';
  ctx.font = '700 26px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NYC', 0, -16);
  ctx.fillStyle = '#3A3440';
  ctx.font = '22px "Bradley Hand", "Segoe Print", cursive';
  const name = cartName.length > 14 ? cartName.slice(0, 13) + '\u2026' : cartName;
  ctx.fillText(name, 0, 18, stampW - 20);
  ctx.restore();

  // caption strip (handwriting, Doc 08 exact text, left-aligned like the reference)
  ctx.fillStyle = '#3A3440';
  ctx.font = '27px "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = caption.split('\n');
  let y = photoH + my + 28;
  for (const line of lines) {
    ctx.fillText(line, mx + 8, y, CARD_W - mx * 2 - 16);
    y += 38;
  }

  return canvas.toDataURL('image/png');
}

/** Full pipeline: scene → pixels → variance check → composed postcard data URL. */
export function capturePostcard(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  caption: string,
  cartName: string,
  day: number,
): CaptureResult {
  const img = renderPixels(renderer, scene, camera);
  if (!hasVariance(img)) {
    throw new Error('postcard capture came back uniform (render target empty)');
  }
  return { dataUrl: composePostcard(img, caption, cartName, day), width: CARD_W, height: CARD_H };
}

/** Trigger a PNG download for the composed postcard. */
export function downloadPostcard(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
