/**
 * FIRST SLICE save v1 — web mirror of greybox-godot/scripts/save.gd.
 * Storage: localStorage (Doc 07 §6 names local JSON; the browser equivalent).
 * Rules (save.gd header — kept exactly):
 *   * a corrupt or unreadable save is a fresh start, never a crash
 *   * money is always a day-start or verified mid-day snapshot — no duplicate rewards
 *   * day 1 never writes: the intro replays fresh by design (R = restart day)
 *   * replay=true marks a kept final day being replayed: rewards rest, warmth doesn't
 *
 * Migration strategy (Doc 37 §3F — save stays v1):
 *   The living-block counters (shelf_buys / dog_buys / trims / washes /
 *   hoop_makes) are OPTIONAL trailing fields. A pre-milestone save has none
 *   of them and parses unchanged (missing reads as 0); a post-milestone save
 *   loaded by older code is ignored field-by-field (every reader names its
 *   fields). No key bump, no transform, no version branch — the compat proof
 *   is automated in tests/save.test.ts ("old v1 JSON" case).
 */

export const SAVE_KEY = 'first_slice_save_v1';
// Day 4 "Say Hi" is live (docs/29-day4-say-hi.md): a new stranger with a
// duffel bag, and the lamp next door. Day 5+ is still being written —
// the rail's goodnight holds the light instead.
export const MAX_DAY = 4;

export interface SaveData {
  day: number;
  day_complete: boolean;
  replay: boolean;
  cart_name: string;
  money: number;
  awning: boolean;
  kid_kept: boolean;
  idris_served: boolean;
  lunch_served: number;
  /** Day-start money snapshot for the postcard caption (web save v1 extension,
   *  fixes the reference's "$87 → $111" Day 2 caption bug — Doc 22 says $112 → $111). */
  day_start_money?: number;
  /** Day 3 purchase — the stool by the cart (the kid's seat). Optional so a
   *  pre-Day-3 save parses unchanged; missing reads as false. */
  stool?: boolean;
  /** Day 4 beat — the Map changed hands (the stranger carries it now).
   *  Optional so a pre-Day-4 save parses unchanged; missing reads as false. */
  map_given?: boolean;
  /** Day 4 afternoon — the vending-permit application is FILED (docs/30).
   *  Permanent progression, like the stool: once true it stays true.
   *  Optional so pre-existing saves parse unchanged; missing reads as false. */
  permit?: boolean;
  // ---- the block remembers (Doc 37 §3F) — optional v1-safe counters ----
  /** Cumulative free-roam choices, persisted so the block can surface them
   *  as memories on later days. Optional so pre-milestone saves parse
   *  unchanged; missing reads as 0. Clamped to [0, 999]. */
  shelf_buys?: number;
  dog_buys?: number;
  trims?: number;
  washes?: number;
  hoop_makes?: number;
}

export function defaultSave(): SaveData {
  return {
    day: 1,
    day_complete: false,
    replay: false,
    cart_name: '',
    money: 87,
    awning: false,
    kid_kept: false,
    idris_served: false,
    lunch_served: 0,
    stool: false,
    map_given: false,
    permit: false,
    shelf_buys: 0,
    dog_buys: 0,
    trims: 0,
    washes: 0,
    hoop_makes: 0,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Parse arbitrary stored text into a SaveData; corrupt => defaults (never a crash). */
export function parseSave(raw: string | null): SaveData {
  if (raw === null || raw === undefined || raw === '') return defaultSave();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaultSave();
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return defaultSave();
  const d = data as Record<string, unknown>;
  const num = (k: string, def: number): number => {
    const v = d[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
    return def;
  };
  const bool = (k: string, def: boolean): boolean => {
    const v = d[k];
    if (typeof v === 'boolean') return v;
    if (v === 'true') return true;
    if (v === 'false') return false;
    return def;
  };
  return {
    day: clamp(Math.trunc(num('day', 1)), 1, MAX_DAY),
    day_complete: bool('day_complete', false),
    replay: bool('replay', false),
    cart_name: typeof d.cart_name === 'string' ? d.cart_name : '',
    money: Math.max(0, Math.trunc(num('money', 87))),
    awning: bool('awning', false),
    stool: bool('stool', false),
    map_given: bool('map_given', false),
    permit: bool('permit', false),
    kid_kept: bool('kid_kept', false),
    idris_served: bool('idris_served', false),
    lunch_served: clamp(Math.trunc(num('lunch_served', 0)), 0, 3),
    day_start_money: Math.max(0, Math.trunc(num('day_start_money', Math.max(0, Math.trunc(num('money', 87)))))),
    // the block remembers (Doc 37 §3F) — absent in old saves, reads as 0
    shelf_buys: clamp(Math.trunc(num('shelf_buys', 0)), 0, 999),
    dog_buys: clamp(Math.trunc(num('dog_buys', 0)), 0, 999),
    trims: clamp(Math.trunc(num('trims', 0)), 0, 999),
    washes: clamp(Math.trunc(num('washes', 0)), 0, 999),
    hoop_makes: clamp(Math.trunc(num('hoop_makes', 0)), 0, 999),
  };
}

/** Load from localStorage. `store` injectable for tests. */
export function loadSave(store: Pick<Storage, 'getItem'> = localStorage): SaveData {
  let raw: string | null = null;
  try {
    raw = store.getItem(SAVE_KEY);
  } catch {
    return defaultSave(); // storage unavailable (private mode etc.) — fresh start
  }
  return parseSave(raw);
}

/** Write. Mirrors save.gd `write()`. Returns false if storage refused. */
export function writeSave(data: SaveData, store: Pick<Storage, 'setItem'> = localStorage): boolean {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function wipeSave(store: Pick<Storage, 'removeItem'> = localStorage): void {
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    /* nothing to wipe */
  }
}
