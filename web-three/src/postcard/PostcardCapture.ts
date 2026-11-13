/**
 * Postcard capture — the TS-01 pipeline in browser form:
 *   authored rig pose → offscreen render target → pixels → paper frame +
 *   caption composite → PNG (download + display in the panel).
 * This is a real capture of the live scene, never a placeholder button.
 *
 * Lessons from the original capture spike, kept here:
 *   - capture happens AFTER the dusk tween settles (the sky must not be moving)
 *   - the frame must not be uniform — we check pixel variance before composing
 */

import * as THREE from 'three';
import { captureDofParams, renderDofPixels } from '../render/postcardDof';

export interface CaptureResult {
  dataUrl: string;
  width: number;
  height: number;
}

const CARD_W = 768;
const CARD_H = 1344;         // TS-01 output size (768×1344 vertical postcard)
export const POSTCARD_CARD_W = CARD_W;
export const POSTCARD_CARD_H = CARD_H;
const IMG_W = 768;
const IMG_H = 1160;          // TS-01 offscreen render size; caption strip below

/** The card's handwriting voice (docs/59): Caveat rides the bundle
 *  (main.ts), so the caption renders the same hand on every device — the
 *  old stack drew Bradley Hand on iPhone, Comic Sans on Windows and the
 *  platform's default serif/sans on Android/Linux. The day tag stays
 *  monospace on purpose: the post office prints, the owner writes. */
export const POSTCARD_HAND_FONT = "'Caveat', 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive";
/** Caption type: 30 px on a 40 px leading. Caveat runs a small x-height,
 *  so 30 px reads like the old 27 px Bradley Hand; the strip (starting
 *  y 1088) still holds six lines with bottom margin. */
export const CAPTION_FONT_PX = 30;
export const CAPTION_LINE_PX = 40;
export const CAPTION_STRIP_Y = 1088;

/** The grain seed (docs/59): the paper dots used Math.random(), so the
 *  same moment never composed the same card twice — fridge-test reprints
 *  differed, and no unit could pin the paper. FNV-1a over the card's own
 *  identity (day + caption + cart name) keeps it deterministic and pure. */
export function grainSeed(day: number, caption: string, cartName: string): number {
  const src = `${day}\u0000${caption}\u0000${cartName}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — the seeded PRNG the grain rides (32-bit, dependency-free). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The stamp's name wraps to two lines instead of ellipsizing at 14 chars —
 *  a cart named by its owner deserves its whole name. Greedy: break at the
 *  last space that keeps line 1 ≤ max; an over-max tail ellipsizes. */
export function wrapStampName(name: string, max = 14): string[] {
  const clean = name.trim();
  if (clean.length <= max) return [clean];
  const cut = clean.lastIndexOf(' ', max);
  if (cut <= 0) return [clean.slice(0, max - 1) + '…'];
  const head = clean.slice(0, cut);
  const tail = clean.slice(cut + 1);
  if (tail.length <= max) return [head, tail];
  return [head, tail.slice(0, max - 1) + '…'];
}

/** Fire the font preload once at import: the canvas can only draw a face
 *  the document has loaded, and the first card must not wait on a cold
 *  font swap. Idempotent, guarded for non-DOM test environments. */
if (typeof document !== 'undefined' && typeof document.fonts?.load === 'function') {
  void document.fonts.load('700 26px Caveat').catch(() => {});
  void document.fonts.load(`${CAPTION_FONT_PX}px Caveat`).catch(() => {});
}

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
export type PostcardSeason = 'october';

export function composePostcard(
  img: ImageData,
  caption: string,
  cartName: string,
  day: number,
  season?: PostcardSeason,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // paper
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  // subtle paper grain: sparse warm dots, SEEDED by the card's identity —
  // the same moment composes the same paper twice (docs/59)
  ctx.fillStyle = 'rgba(178, 58, 72, 0.05)';
  {
    const rnd = mulberry32(grainSeed(day, caption, cartName));
    for (let i = 0; i < 420; i++) {
      const x = rnd() * CARD_W;
      const y = rnd() * CARD_H;
      ctx.fillRect(x, y, 2, 2);
    }
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
  // the season stamp (Doc 33 §5.2): the stamp corner carries the week. One
  // small authored glyph keyed on the same day data as the caption — no
  // pipeline change, the 1-Second Law untouched. October: one ginkgo leaf,
  // gold like the trees that turned.
  if (season === 'october') {
    ctx.save();
    ctx.translate(-stampW / 2 + 20, -stampH / 2 + 20);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#C9822B';
    ctx.beginPath();
    ctx.moveTo(0, 8);            // stem end
    ctx.quadraticCurveTo(-7, 2, -5, -5);  // one shoulder
    ctx.quadraticCurveTo(-2, -9, 0, -10); // the point
    ctx.quadraticCurveTo(2, -9, 5, -5);   // the other shoulder
    ctx.quadraticCurveTo(7, 2, 0, 8);
    ctx.fill();
    ctx.strokeStyle = '#8a5a1f';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(0, -8);
    ctx.stroke();
    ctx.restore();
  }
  // the cart's name in the owner's hand — wrapped, never ellipsized mid-name
  ctx.fillStyle = '#3A3440';
  ctx.font = `700 24px ${POSTCARD_HAND_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const nameLines = wrapStampName(cartName);
  nameLines.forEach((line, i) => {
    ctx.fillText(line, 0, 14 + i * 24, stampW - 20);
  });
  ctx.restore();

  // caption strip (handwriting, Doc 08 exact text, left-aligned like the reference)
  ctx.fillStyle = '#3A3440';
  ctx.font = `${CAPTION_FONT_PX}px ${POSTCARD_HAND_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = caption.split('\n');
  let y = CAPTION_STRIP_Y;
  for (const line of lines) {
    ctx.fillText(line, mx + 8, y, CARD_W - mx * 2 - 16);
    y += CAPTION_LINE_PX;
  }

  return canvas.toDataURL('image/png');
}

/** Full pipeline: scene → pixels → variance check → composed postcard data URL.
 *
 *  `opts.dof` — the authored capture's depth of field (v1.54.0):
 *  `{ focus }` in world units (camera → the pose's look-at target). The
 *  caller gates it on the gfx config (?fx=off / ?dof=0 never pass it).
 *  A DOF capture that fails for any reason falls back SILENTLY to today's
 *  direct render — the card must exist; the effect must never wedge the
 *  beat (the wow card's law). */
export interface CaptureOptions {
  /** Authored focus distance (camera → look-at target); aperture/maxblur
   *  are the module's tuned constants, clamped by captureDofParams. */
  dof?: { focus: number };
  /** The AO prepass's exclusion list (glow sprites, steam, leaves, birds,
   *  far-world silhouettes, movers) — hidden around the DOF depth bake. */
  exclude?: readonly THREE.Object3D[];
}
export function capturePostcard(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  caption: string,
  cartName: string,
  day: number,
  season?: PostcardSeason,
  opts?: CaptureOptions,
): CaptureResult {
  let img: ImageData;
  const dofParams = opts?.dof ? captureDofParams(opts.dof.focus) : null;
  if (dofParams) {
    try {
      img = renderDofPixels(renderer, scene, camera, dofParams, opts?.exclude ?? [], IMG_W, IMG_H);
    } catch {
      img = renderPixels(renderer, scene, camera); // the card must exist
    }
  } else {
    img = renderPixels(renderer, scene, camera);
  }
  if (!hasVariance(img)) {
    throw new Error('postcard capture came back uniform (render target empty)');
  }
  return { dataUrl: composePostcard(img, caption, cartName, day, season), width: CARD_W, height: CARD_H };
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

// ------------------------------------------------------- the share sheet ----
// The GDD's UGC flywheel wants a REAL share: the platform's own sheet, the
// card handed over as a file. The honest gate is capability, not feature
// detection theater — a share button that exists only where the Web Share
// API can actually take a file, and the download as the fallback path.

/** True only where `share` can carry files. Injected nav keeps tests honest. */
export function canShareFiles(nav: Navigator = navigator): boolean {
  try {
    return typeof nav.share === 'function' && typeof nav.canShare === 'function';
  } catch {
    return false;
  }
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return null;
    const meta = dataUrl.slice(0, comma);
    const b64 = dataUrl.slice(comma + 1);
    const mime = /data:([^;]+)/.exec(meta)?.[1] ?? 'image/png';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}

/** Share the postcard through the platform sheet when it can take the file;
 *  download is the fallback (and the only path on desktop browsers without
 *  the API). The user closing the sheet is 'shared', not a failure — the
 *  card was offered, which is all a postcard ever asks. */
export async function sharePostcard(
  dataUrl: string,
  filename: string,
  nav: Navigator = navigator,
): Promise<'shared' | 'downloaded'> {
  const file = dataUrlToFile(dataUrl, filename);
  if (file && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    try {
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: 'FIRST SLICE', text: filename.replace(/\.png$/, '').replace(/_/g, ' ') });
        return 'shared';
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return 'shared';
      // anything else falls through to the download — the card lands somewhere
    }
  }
  downloadPostcard(dataUrl, filename);
  return 'downloaded';
}
