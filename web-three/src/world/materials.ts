/**
 * PAL — the street's palette, hex-for-hex from greybox-godot/scripts/main.gd
 * (the working reference of Doc 04's art bible). Names match the oracle's
 * C_* constants so a diff against the Godot source reads like a translation.
 */
export const PAL = {
  gold: 0xf7b32b, // C_GOLD   — the cart, the player, the lit windows
  brick: 0xb23a48, // C_BRICK  — buildings, postcard stamp
  teal: 0x2a9d8f, // C_TEAL   — Rosa's awning, the kid's door, the cart's
  amber: 0xffb85c, // C_AMBER  — streetlight warmth, golden hour
  stone: 0xe8e4dc, // C_STONE  — sidewalk stoops, light stone
  plum: 0x6d4c7d, // C_PLUM   — Idris, dusk depth
  coral: 0xff6b6b, // C_CORAL  — Rosa, the hydrant
  cream: 0xfff8f0, // C_CREAM  — paper, sky horizon, breathing room
  road: 0x4a4552, // C_ROAD   — asphalt
  walk: 0xb9b1a6, // C_WALK   — crosswalk paint
  bldg: 0x8e6f66, // C_BLDG   — building faces
  bldg2: 0xa3857a, // C_BLDG2  — building faces, second tone
  interior: 0xd9c3a5, // C_INTERIOR — bodega shelves warmth
  taxi: 0xf2c230, // C_TAXI   — the yellow that means New York
} as const;

export type PalKey = keyof typeof PAL;

export function hex(key: PalKey): number {
  return PAL[key];
}

/** Hex string for CSS/DOM UI (HUD, postcard paper) — keeps one source of truth. */
export function css(key: PalKey): string {
  return `#${PAL[key].toString(16).padStart(6, "0")}`;
}
