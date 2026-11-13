/**
 * Interior dressing — the sand3d manifest (docs/production/interiors/).
 *
 * The interiors batch (2026-11) dresses the nine shipped interiors — the
 * bodega, the eight W5 rooms — with sand3d-built equipment: the dryers the
 * laundromat's washers were waiting for, the barber chairs, the cook line,
 * the record bins, the flour wall. Every entry is a SEAM SLOT, not a
 * dependency: the placeholder fixture ships and renders as always, and a
 * missing/malformed file keeps the procedural look (the docs/28 GLB seam
 * law — the game never depends on its generated assets).
 *
 * Files live at public/models/<id>.glb, built by
 * tools3d/sandflow_eval/run_interiors.py from the programs named in
 * INTERIOR_PROVENANCE (one program may dress many slots — the dryers are
 * one file worn four times). Placement law is World.upgradePropWithGLB's:
 * the model is uniform-scaled to the placeholder's height, XZ-centered on
 * it, feet on its ground, wearing its yaw. Nothing gameplay-bearing
 * changes: colliders are the authored ones, the room group's visibility
 * toggle is untouched, the anchor registry is untouched.
 *
 * Long wall units (counters, cook line, shelving) are authored by their
 * programs in their final world orientation — no placeholder yaw, so the
 * footprint guard passes 1:1. Machines use the washer-slot pattern (group
 * yaw ±π/2) exactly like the shipped washers.
 */

export interface InteriorSlot {
  /** glbProps id — unique per placement. */
  readonly id: string;
  /** The interior whose INT_<room> group holds the placeholder; BODEGA's
   *  fixtures live at scene root (the store is always open). */
  readonly room: 'BODEGA' | 'LAUNDRY' | 'BARBER' | 'PIZZA' | 'BAKERY'
    | 'RECORDS' | 'HALL' | 'DINER' | 'CECIL' | 'CORNERHOUSE';
  /** The placeholder's name (deep-searched inside the room group). */
  readonly fixture: string;
  /** File under public/ — one program may dress many slots. */
  readonly file?: string;
}

export const INTERIOR_SLOTS: readonly InteriorSlot[] = [
  // ---- ROSA'S BODEGA — the counter a real deli works from ----
  { id: 'bodega_register', room: 'BODEGA', fixture: 'Bodega_Register',
    file: 'models/cash_register.glb' },
  { id: 'bodega_coffee', room: 'BODEGA', fixture: 'Bodega_Coffee',
    file: 'models/coffee_machine.glb' },
  { id: 'bodega_microwave', room: 'BODEGA', fixture: 'Bodega_Microwave',
    file: 'models/microwave_oven.glb' },
  { id: 'bodega_produce', room: 'BODEGA', fixture: 'Bodega_Produce',
    file: 'models/produce_crate.glb' },
  // ---- LAUNDRY-INT — the working floor ----
  ...[10.5, 12.2, 13.9, 15.6].map((dz) => ({
    id: `laundry_dryer_${dz}`, room: 'LAUNDRY' as const,
    fixture: `LD_slot_${dz}`, file: 'models/laundry_dryer.glb',
  })),
  { id: 'laundry_table_12.1', room: 'LAUNDRY', fixture: 'LT_12.1',
    file: 'models/laundry_table.glb' },
  { id: 'laundry_table_13.1', room: 'LAUNDRY', fixture: 'LT_13.1',
    file: 'models/laundry_table.glb' },
  { id: 'laundry_cart', room: 'LAUNDRY', fixture: 'LCart' },
  { id: 'laundry_shelf', room: 'LAUNDRY', fixture: 'LShelf',
    file: 'models/detergent_shelf.glb' },
  { id: 'laundry_linen_a', room: 'LAUNDRY', fixture: 'LLinen_a',
    file: 'models/linen_bin.glb' },
  { id: 'laundry_linen_b', room: 'LAUNDRY', fixture: 'LLinen_b',
    file: 'models/linen_bin.glb' },
  { id: 'laundry_vending', room: 'LAUNDRY', fixture: 'LD_Vending',
    file: 'models/vending_machine.glb' },
  // ---- BARBER-INT — the chairs and the counter ----
  { id: 'barber_chair_11', room: 'BARBER', fixture: 'Barber_Chair_11.0',
    file: 'models/barber_chair.glb' },
  { id: 'barber_chair_13.6', room: 'BARBER', fixture: 'Barber_Chair_13.6',
    file: 'models/barber_chair.glb' },
  { id: 'barber_counter', room: 'BARBER', fixture: 'Barber_Counters',
    file: 'models/barber_counter_unit.glb' },
  { id: 'barber_register', room: 'BARBER', fixture: 'Barber_Register',
    file: 'models/cash_register.glb' },
  // ---- PIZZA-INT — the slice shop's equipment wall ----
  { id: 'pizza_cooler', room: 'PIZZA', fixture: 'Pizza_Fridge',
    file: 'models/drink_cooler.glb' },
  { id: 'pizza_oven', room: 'PIZZA', fixture: 'Pizza_Oven' },
  { id: 'pizza_prep', room: 'PIZZA', fixture: 'Pizza_Prep',
    file: 'models/pizza_prep_counter.glb' },
  { id: 'pizza_menu', room: 'PIZZA', fixture: 'Pizza_Menu',
    file: 'models/menu_board.glb' },
  // ---- BAKERY-INT — the oven wall and the case ----
  { id: 'bakery_oven', room: 'BAKERY', fixture: 'Bakery_Oven' },
  { id: 'bakery_rack_w', room: 'BAKERY', fixture: 'Bakery_Rack_W',
    file: 'models/bread_rack.glb' },
  { id: 'bakery_rack_e', room: 'BAKERY', fixture: 'Bakery_Rack_E',
    file: 'models/bread_rack.glb' },
  { id: 'bakery_case', room: 'BAKERY', fixture: 'Bakery_Case',
    file: 'models/bakery_display_case.glb' },
  { id: 'bakery_backshelf', room: 'BAKERY', fixture: 'Bakery_BackShelf',
    file: 'models/bakery_back_shelf.glb' },
  // ---- RECORD-INT — the bins, the wall, the corner ----
  ...[-23.5, -25.5, -27.5].map((rz) => ({
    id: `record_bin_${rz}`, room: 'RECORDS' as const,
    fixture: `Records_Crate_${rz}`, file: 'models/record_bin.glb',
  })),
  { id: 'record_speaker_w', room: 'RECORDS', fixture: 'Records_Spk_W',
    file: 'models/record_speaker.glb' },
  { id: 'record_speaker_e', room: 'RECORDS', fixture: 'Records_Spk_E',
    file: 'models/record_speaker.glb' },
  { id: 'record_wallshelf', room: 'RECORDS', fixture: 'Records_WallShelf',
    file: 'models/record_wall_shelf.glb' },
  // ---- HALL-INT — the work half ----
  { id: 'hall_chairs_0', room: 'HALL', fixture: 'Hall_ChairStack_0',
    file: 'models/folding_chairs_stack.glb' },
  { id: 'hall_chairs_1', room: 'HALL', fixture: 'Hall_ChairStack_1',
    file: 'models/folding_chairs_stack.glb' },
  { id: 'hall_chairs_2', room: 'HALL', fixture: 'Hall_ChairStack_2',
    file: 'models/folding_chairs_stack.glb' },
  { id: 'hall_chairs_3', room: 'HALL', fixture: 'Hall_ChairStack_3',
    file: 'models/folding_chairs_stack.glb' },
  { id: 'hall_kitchenette', room: 'HALL', fixture: 'Hall_Kitchenette' },
  { id: 'hall_shelves', room: 'HALL', fixture: 'Hall_Shelves',
    file: 'models/hall_storage_shelf.glb' },
  // ---- DINER-INT — the line and the register end ----
  { id: 'diner_kitchen', room: 'DINER', fixture: 'Diner_Kitchen',
    file: 'models/diner_kitchen_line.glb' },
  { id: 'diner_register', room: 'DINER', fixture: 'Diner_Register' },
  { id: 'diner_coffee', room: 'DINER', fixture: 'Diner_Coffee',
    file: 'models/coffee_machine.glb' },
  // ---- CECIL-ROOM — the studio's honest fixtures ----
  { id: 'cecil_kitchenette', room: 'CECIL', fixture: 'Cecil_Kitchenette' },
  { id: 'cecil_toilet', room: 'CECIL', fixture: 'Cecil_Toilet',
    file: 'models/apartment_toilet.glb' },
  { id: 'cecil_sink', room: 'CECIL', fixture: 'Cecil_Sink',
    file: 'models/apartment_sink.glb' },
  { id: 'cecil_radiator', room: 'CECIL', fixture: 'Cecil_Radiator',
    file: 'models/apartment_radiator.glb' },
  // ---- CORNERHOUSE-INT — the dry-goods floor (W14) ----
  // The store reuses the batch's own files: the register rides the
  // counter's west shoulder (the barber register's slot shape), the
  // detergent shelf IS the household-goods wall (soap is dry goods), the
  // soda cooler takes the NE corner, and the stacked crates at the corner
  // pier are the seasonal table the canon dresses — one file worn twice.
  { id: 'cornerhouse_register', room: 'CORNERHOUSE', fixture: 'CH_Register',
    file: 'models/cash_register.glb' },
  { id: 'cornerhouse_backshelf', room: 'CORNERHOUSE', fixture: 'CH_BackShelf',
    file: 'models/detergent_shelf.glb' },
  { id: 'cornerhouse_cooler', room: 'CORNERHOUSE', fixture: 'CH_Cooler',
    file: 'models/vending_machine.glb' },
  { id: 'cornerhouse_crate_a', room: 'CORNERHOUSE', fixture: 'CH_Crate_A',
    file: 'models/produce_crate.glb' },
  { id: 'cornerhouse_crate_b', room: 'CORNERHOUSE', fixture: 'CH_Crate_B',
    file: 'models/produce_crate.glb' },
];

/** The unique model files the manifest wears (probe + test convenience). */
export const INTERIOR_FILES: readonly string[] =
  [...new Set(INTERIOR_SLOTS.map((s) => s.file ?? `models/${s.id}.glb`))].sort();

/** Provenance: file stem → the sand3d program that builds it
 *  (tools3d/sandflow_eval/programs/<program>.py). The unit test pins this
 *  against the programs directory. */
export const INTERIOR_PROVENANCE: Readonly<Record<string, string>> = {
  apartment_radiator: 'apartment_radiator',
  apartment_sink: 'apartment_sink',
  apartment_toilet: 'apartment_toilet',
  bakery_back_shelf: 'bakery_back_shelf',
  bakery_display_case: 'bakery_display_case',
  bakery_oven: 'bakery_oven',
  bread_rack: 'bread_rack',
  barber_chair: 'barber_chair',
  barber_counter_unit: 'barber_counter_unit',
  cash_register: 'cash_register',
  cecil_kitchenette: 'cecil_kitchenette',
  coffee_machine: 'coffee_machine',
  detergent_shelf: 'detergent_shelf',
  diner_kitchen_line: 'diner_kitchen_line',
  diner_register: 'diner_register',
  drink_cooler: 'drink_cooler',
  folding_chairs_stack: 'folding_chairs_stack',
  hall_kitchenette: 'hall_kitchenette',
  hall_storage_shelf: 'hall_storage_shelf',
  laundry_cart: 'laundry_cart',
  laundry_dryer: 'laundry_dryer',
  laundry_table: 'laundry_table',
  linen_bin: 'linen_bin',
  menu_board: 'menu_board',
  microwave_oven: 'microwave_oven',
  pizza_oven: 'pizza_oven',
  pizza_prep_counter: 'pizza_prep_counter',
  produce_crate: 'produce_crate',
  record_bin: 'record_bin',
  record_speaker: 'record_speaker',
  record_wall_shelf: 'record_wall_shelf',
  vending_machine: 'vending_machine',
};
