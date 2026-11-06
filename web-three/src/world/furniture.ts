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
  readonly room: 'CECIL' | 'HALL' | 'DINER'
    | 'LAUNDRY' | 'BARBER' | 'PIZZA' | 'BAKERY' | 'RECORDS';
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
  // the mirror hangs above the dresser (S wall; wall decor, no collider)
  { id: 'mirror', room: 'CECIL', fixture: 'Cecil_Mirror', height: 0.75 },
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
  // the home pass (2026-11): a floor lamp at the sofa's north shoulder and
  // an ottoman off the coffee table — the living room reads furnished now
  { id: 'floor_lamp', room: 'HALL', fixture: 'Hall_FloorLamp', height: 1.47 },
  { id: 'ottoman', room: 'HALL', fixture: 'Hall_Ottoman', height: 0.46 },
  // ---- DINER — the dining-shop archetype (the counter stools) ----
  ...Array.from({ length: 8 }, (_, i): FurnitureSlot =>
    ({ id: 'counter_stool', room: 'DINER', fixture: `Diner_Stool_${i}`, height: 0.55 })),
  // ---- THE SHOPS (2026-11 interior pass) — every room wears its own
  //  corresponding furniture, per the docs/57 seam: waiting chairs + a
  //  framed print in the laundromat, the waiting bench + two mirrors in
  //  the barbershop, drop-leaf tables in the pizza booths, cafe two-tops
  //  in the bakery, the booth tables in the diner, and the listening
  //  corner (armchair, counter, rug) in the record store. The machines
  //  (washers, ovens, fridges) and the shipped identities (the coral
  //  booth benches, the record crates) stay procedural — they are
  //  equipment, not furniture.
  // ---- LAUNDRY — the wait: two real chairs by the cart, a framed print
  //  over the washers
  { id: 'waiting_chair', room: 'LAUNDRY', fixture: 'LC_9.3', height: 0.9, rotateY: -Math.PI / 2 },
  { id: 'waiting_chair', room: 'LAUNDRY', fixture: 'LC_9.9', height: 0.9, rotateY: -Math.PI / 2 },
  { id: 'laundry_print', room: 'LAUNDRY', fixture: 'LWall_Art', height: 0.55, rotateY: Math.PI / 2 },
  // ---- BARBER — the waiting bench (E-facing, W wall) + two mirrors
  //  above the counter, one per chair
  { id: 'waiting_bench', room: 'BARBER', fixture: 'Barber_Bench', height: 0.44, rotateY: Math.PI / 2 },
  { id: 'shop_mirror', room: 'BARBER', fixture: 'Barber_Mirror_A', height: 0.78, rotateY: -Math.PI / 2 },
  { id: 'shop_mirror', room: 'BARBER', fixture: 'Barber_Mirror_B', height: 0.78, rotateY: -Math.PI / 2 },
  // ---- PIZZA — the two booth tables (drop-leaf, fits the 0.8 m gap
  //  between the benches); the coral benches stay the room's identity
  { id: 'booth_table', room: 'PIZZA', fixture: 'Pizza_BoothT_12.5', height: 0.72 },
  { id: 'booth_table', room: 'PIZZA', fixture: 'Pizza_BoothT_15.5', height: 0.72 },
  // ---- BAKERY — the two cafe two-tops
  { id: 'cafe_table', room: 'BAKERY', fixture: 'Bakery_Table_-36.2', height: 0.72 },
  { id: 'cafe_table', room: 'BAKERY', fixture: 'Bakery_Table_-31.8', height: 0.72 },
  // ---- DINER — the four booth tables wear the same drop-leaf as pizza
  ...[-11.5, -14, -16.5, -18.5].map((bz): FurnitureSlot =>
    ({ id: 'booth_table', room: 'DINER', fixture: `Diner_BoothT_${bz}`, height: 0.72 })),
  // ---- RECORDS — the listening corner: the armchair, the counter
  //  cabinet, the corner rug
  { id: 'listening_chair', room: 'RECORDS', fixture: 'Records_Chair', height: 0.97, rotateY: Math.PI },
  { id: 'shop_counter', room: 'RECORDS', fixture: 'Records_Counter', height: 1.1 },
  { id: 'corner_rug', room: 'RECORDS', fixture: 'Records_Rug', height: 0.02, fitBy: 'footprint' },
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
  floor_lamp: 'B073751DMK',
  mirror: 'B073WGGXFT',
  ottoman: 'B07D4FS7GY',
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
  // the shops pass (2026-11)
  booth_table: 'B07B82PXCW',
  cafe_table: 'B075YQXRJM',
  corner_rug: 'B0719FLQP3',
  laundry_print: 'B073NZGLLS',
  listening_chair: 'B0714QGLSD',
  shop_counter: 'B0154WJZH2',
  shop_mirror: 'B073WHZKBF',
  waiting_bench: 'B07C8DHX43',
  waiting_chair: 'B075ZZYH4B',
};
