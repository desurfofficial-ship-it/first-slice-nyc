/**
 * PostcardCapture — render target → canvas → PNG (M6). The product moment.
 * Oracle: the TS-01 spike (Doc 15) and spectator_d2's Day 2 capture (Doc 24):
 * own camera born inside the offscreen viewport, glide, pixel-variance blank
 * check (is_empty passes gray frames — count the range on a grid), paper
 * frame + caption composite, 768×1344 output. Placeholder until M6.
 */
export const POSTCARD_SIZE = { w: 768, h: 1344 } as const;
export const POSTCARD_RENDER = { w: 768, h: 1160 } as const;

export interface CapturedPostcard {
  dataUrl: string;
  varianceOk: boolean;
}

export function luminanceRange(
  pixels: Uint8ClampedArray,
  stride = 24 * 4,
): { lo: number; hi: number } {
  let lo = 1;
  let hi = 0;
  for (let i = 0; i < pixels.length; i += stride) {
    const r = pixels[i]! / 255;
    const g = pixels[i + 1]! / 255;
    const b = pixels[i + 2]! / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lo = Math.min(lo, lum);
    hi = Math.max(hi, lum);
  }
  return { lo, hi };
}
