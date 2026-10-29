/** Doc 04 — Art Direction Bible palette. Single source of truth for color. */
export const PAL = {
  gold: 0xf7b32b,   // Taxi Yellow — primary accent, your cart
  brick: 0xb23a48,  // Brick Red — building faces, the heart color
  teal: 0x2a9d8f,   // Fire-Escape Green — awnings, shutters, calm note
  amber: 0xffb85c,  // Golden-Hour Amber — the light (forever 5:45 PM)
  stone: 0xe8e4dc,  // Steam Grey — steam, receipts, morning haze
  plum: 0x6d4c7d,   // Dusk Plum — warm shadows, never pure black
  coral: 0xff6b6b,  // Bodega Neon — magic punctuation, used sparingly
  cream: 0xfff8f0,  // Pizza-Box White — paper, UI, postcards
  ink: 0x3a3440,    // rails, outlines, quiet darks
  road: 0x4a4552,
  walk: 0xb9b1a6,
  bldg: 0x8e6f66,
  bldg2: 0xa3857a,
  interior: 0xd9c3a5,
  taxi: 0xf2c230,
  skyline: 0x9c8aa5,
  windowDim: 0x3b3346,
  manhole: 0x2b2730,
} as const;

/** Sky states (greybox reference: main.gd `_start_dusk` / `_to_morning_light`). */
export const SKY = {
  day:     { top: 0x7fa7c9, horizon: PAL.amber,    sun: PAL.amber,   sunEnergy: 1.3,  ambient: 0.8  },
  dusk:    { top: 0x3e2f5b, horizon: PAL.plum,     sun: 0xc77d8e,    sunEnergy: 0.35, ambient: 0.45 },
  morning: { top: 0x8fb8cf, horizon: 0xffd9a0,     sun: PAL.amber,   sunEnergy: 1.25, ambient: 0.85 },
  morningGroundHorizon: 0xe8c9a0,
} as const;
