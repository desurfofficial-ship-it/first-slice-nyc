/**
 * ABO first-slice furniture — the manifest (docs/57).
 *
 * The Amazon Berkeley Objects (ABO) dataset (CC-BY-4.0, via HF
 * codepawl/abo-glb) supplies real furniture models; this manifest says
 * which interior slot wears which file. Every entry is a SEAM SLOT, not a
 * dependency: the placeholder fixture ships and renders as always, and a
 * missing/malformed file keeps the procedural look (the docs/28 GLB seam
 * law — the game never depends on its generated assets).
 *
 * Files live at public/models/furniture/<id>.glb — the dataset's
 * lods/<ASIN>/<ASIN>_lod1.glb variant (meshopt + KTX2 textures), renamed
 * to the slot they wear. The full curated pack (141 models) sits in
 * assets/furniture/<category>/ with its ATTRIBUTION.md.
 *
 * Placement law (World.upgradeFurnitureWithGLB): the model is uniform-
 * scaled to the slot's authored height (or XZ footprint for flat pieces),
 * XZ-centered on the placeholder, feet on the placeholder's world min Y,
 * yawed by rotateY. Nothing gameplay-bearing changes: colliders are the
 * authored ones, the room group's visibility toggle is untouched, the
 * anchor registry is untouched.
 */

export interface FurnitureSlot {
  /** File stem under public/models/furniture/ — the slot the model wears. */
  readonly id: string;
  /** The interior whose INT_<room> group holds the placeholder. */
  readonly room: 'CECIL' | 'HALL' | 'DINER';
  /** The placeholder mesh's name inside that room group. */
  readonly fixture: string;
  /** Sibling fixtures hidden once the model lands (e.g. the mattress and
   *  pillow boxes under a real bed). Kept visible if the model fails. */
  readonly hide?: readonly string[];
  /** Authored target height (m) the model is scaled to. */
  readonly height: number;
  /** Yaw applied to the model (radians). Authored per slot from the
   *  review shots — the GLB's own facing is the dataset's, not ours. */
  readonly rotateY?: number;
  /** 'height' (default) scales to the slot's height; 'footprint' scales
   *  to cover the placeholder's XZ box (flat pieces — rugs). */
  readonly fitBy?: 'height' | 'footprint';
}

export const FURNITURE_SLOTS: readonly FurnitureSlot[] = [
  // ---- CECIL-ROOM — the bedroom archetype (docs/41's upstairs room) ----
  { id: 'bed', room: 'CECIL', fixture: 'Cecil_BedFrame',
    hide: ['Cecil_Mattress', 'Cecil_Pillow'], height: 0.62 },
  { id: 'dresser', room: 'CECIL', fixture: 'Cecil_Dresser', height: 0.95, rotateY: Math.PI / 2 },
  { id: 'side_table', room: 'CECIL', fixture: 'Cecil_Nightstand', height: 0.55 },
  { id: 'table_lamp', room: 'CECIL', fixture: 'Cecil_Lamp', height: 0.42 },
  { id: 'rug', room: 'CECIL', fixture: 'Cecil_Rug', height: 0.04, fitBy: 'footprint' },
  // ---- HALL — the living-room / communal archetype ----
  { id: 'dining_table', room: 'HALL', fixture: 'Hall_WorkTable',
    hide: ['Hall_WorkVise'], height: 0.9 },
  { id: 'bookcase', room: 'HALL', fixture: 'Hall_Bookcase', height: 1.8 },
  { id: 'sofa', room: 'HALL', fixture: 'Hall_Sofa', height: 0.88, rotateY: -Math.PI / 2 },
  { id: 'coffee_table', room: 'HALL', fixture: 'Hall_CoffeeTable', height: 0.45 },
  { id: 'dining_chair', room: 'HALL', fixture: 'Hall_Chair_A', height: 0.88 },
  { id: 'dining_chair', room: 'HALL', fixture: 'Hall_Chair_B', height: 0.88 },
  { id: 'sideboard', room: 'HALL', fixture: 'Hall_Sideboard', height: 1.02 },
  // ---- DINER — the dining-shop archetype (the counter stools) ----
  ...Array.from({ length: 8 }, (_, i): FurnitureSlot =>
    ({ id: 'counter_stool', room: 'DINER', fixture: `Diner_Stool_${i}`, height: 0.55 })),
];

/** The unique model files the manifest wears (probe + test convenience). */
export const FURNITURE_FILES: readonly string[] =
  [...new Set(FURNITURE_SLOTS.map((s) => s.id))].sort();

/** Provenance: slot id → the ABO ASIN the file was fetched from (the
 *  dataset's lods/<ASIN>/<ASIN>_lod1.glb). The unit test pins this against
 *  the curated pack (docs/data/abo-curated.json) and its attribution. */
export const FURNITURE_PROVENANCE: Readonly<Record<string, string>> = {
  bed: 'B07LC5Y95W',
  bookcase: 'B07DMHTGJD',
  coffee_table: 'B01LWVEZ1C',
  counter_stool: 'B07CZ6P7QP',
  dining_chair: 'B075YQ8Q2K',
  dining_table: 'B075YMXWZC',
  dresser: 'B079X4CP3F',
  rug: 'B0719STDHT',
  side_table: 'B01D3C7Z4A',
  sideboard: 'B075YQXQ5C',
  sofa: 'B072FVHS9G',
  table_lamp: 'B07374P6MR',
};
