import * as THREE from 'three';

/**
 * The sign atlas — docs/51 B13's named main-pass frontier ("sign atlas (a
 * program)"). Every static sign face used to own its own CanvasTexture and
 * Lambert material: one draw call each, ~20 of them inside the Kestrel gate
 * rigs alone. The atlas parks each face's pixels on ONE shared sheet and
 * the face's geometry rides a UV rect into it, so World.bakeStatics can key
 * an ATLAS batch on the shared map and fuse the block's static faces into a
 * single draw. The letters are the exact ops World.textTexture has always
 * run, translated into their shelf slot — bit-identical pixels, one texture
 * upload instead of a few dozen.
 *
 * The packer is a shelf packer with an 8 px bleed guard per slot (mipmap
 * sampling stops reaching a neighbor long before 8 px folds into it, and
 * the slot's padding is pre-filled with the sign's own background so the
 * bleed is the sign's own edge color). A face that does not fit returns
 * null — the caller keeps its own canvas, so a future giant sign can never
 * break the boot.
 *
 * Canvas work is lazy (created on the first allocation) so importing this
 * module stays safe in the node test environment; the pure packer and the
 * UV remap are exported for tests.
 */

const ATLAS_W = 2048;
const ATLAS_H = 1024;
export const ATLAS_PAD = 8;

export interface AtlasRect { u0: number; v0: number; u1: number; v1: number; }
export interface ShelfCursor { x: number; y: number; rowH: number; }

/** Pure shelf packing: the next slot for a w×h face, or null when it does
 *  not fit (right-edge wrap, then sheet overflow). The returned `next`
 *  cursor reserves the slot's full padded cell. */
export function planSlot(
  cur: ShelfCursor, w: number, h: number,
): { x: number; y: number; next: ShelfCursor } | null {
  const sw = w + ATLAS_PAD * 2;
  const sh = h + ATLAS_PAD * 2;
  if (sw > ATLAS_W || sh > ATLAS_H) return null;
  let { x, y, rowH } = cur;
  if (x + sw > ATLAS_W) { x = 0; y += rowH; rowH = 0; } // rowH is the padded cell — shelves touch like cells do
  if (y + sh > ATLAS_H) return null;
  return {
    x, y,
    next: { x: x + sw, y, rowH: Math.max(rowH, sh) },
  };
}

let ctx: CanvasRenderingContext2D | null = null;
let tex: THREE.CanvasTexture | null = null;
let mat: THREE.MeshLambertMaterial | null = null;
const cursor: ShelfCursor = { x: 0, y: 0, rowH: 0 };

function ensure(): boolean {
  if (ctx) return true;
  if (typeof document === 'undefined') return false;
  const c = document.createElement('canvas');
  c.width = ATLAS_W;
  c.height = ATLAS_H;
  ctx = c.getContext('2d');
  if (!ctx) return false;
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  mat = new THREE.MeshLambertMaterial({ map: tex });
  return true;
}

/** The shared sheet's texture (null until the first allocation — the bake
 *  compares candidate maps against it to key the ATLAS batch). */
export const atlasTexture = (): THREE.CanvasTexture | null => tex;

/** The ONE material every atlas face wears. */
export const atlasMaterial = (): THREE.MeshLambertMaterial | null => mat;

const slots: Array<{ u: number; v: number; w: number; h: number }> = [];
export const atlasSlots = (): ReadonlyArray<{ u: number; v: number; w: number; h: number }> => slots;

/** Draw one sign into the sheet. `draw` receives a context already
 *  translated to the slot's drawing origin and the face's w×h. `bleed`
 *  pre-fills the padded cell (the sign's own bg color) so mipmaps bleed the
 *  sign's edge color, never the sheet's void. Null when the sheet is full. */
export function drawIntoAtlas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w: number, h: number, bleed: string,
): AtlasRect | null {
  if (!ensure()) return null;
  const slot = planSlot(cursor, w, h);
  if (!slot) return null;
  cursor.x = slot.next.x;
  cursor.y = slot.next.y;
  cursor.rowH = slot.next.rowH;
  const px = slot.x + ATLAS_PAD;
  const py = slot.y + ATLAS_PAD;
  ctx!.fillStyle = bleed;
  ctx!.fillRect(slot.x, slot.y, w + ATLAS_PAD * 2, h + ATLAS_PAD * 2);
  ctx!.save();
  ctx!.translate(px, py);
  draw(ctx!, w, h);
  ctx!.restore();
  tex!.needsUpdate = true;
  slots.push({ u: px, v: py, w, h });
  // CanvasTexture flips Y: canvas row 0 is v = 1 — the uv rect maps the
  // DRAW area (the padded margin stays bleed, never sampled at mip 0)
  return {
    u0: px / ATLAS_W,
    v0: 1 - (py + h) / ATLAS_H,
    u1: (px + w) / ATLAS_W,
    v1: 1 - py / ATLAS_H,
  };
}

/** Remap a geometry's uv tiles (0..1) into an atlas rect, in place. */
export function remapUVs(geo: THREE.BufferGeometry, r: AtlasRect): void {
  const uv = geo.attributes.uv as THREE.BufferAttribute | undefined;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(
      i,
      r.u0 + uv.getX(i) * (r.u1 - r.u0),
      r.v0 + uv.getY(i) * (r.v1 - r.v0),
    );
  }
  uv.needsUpdate = true;
}
