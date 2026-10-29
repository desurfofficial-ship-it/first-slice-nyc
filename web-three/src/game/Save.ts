/**
 * Save v1 — the localStorage mirror of greybox-godot/scripts/save.gd (oracle).
 * Same rules, same defaults, so a web player and a Godot player get the same
 * courtesy:
 *   * a corrupt or unreadable save is a fresh start, never a crash
 *   * money is a day-start or verified mid-day snapshot — no duplicate rewards
 *   * day 1 never writes: the intro replays fresh by design
 *   * replay marks a kept final day: rewards rest, warmth doesn't
 *
 * Pure logic — no renderer, no DOM. Headless-testable as-is (M7 wires the
 * regression suite).
 */

export const SAVE_KEY = "first-slice-save-v1";
export const MAX_DAY = 2; // Day 3 is still being written (docs/22, docs/24).

export interface SaveData {
  day: number;
  day_complete: boolean;
  replay: boolean;
  cart_name: string;
  money: number;
  day_start_money: number;
  awning: boolean;
  kid_kept: boolean;
  idris_served: boolean;
  lunch_served: number;
}

export function defaultSave(): SaveData {
  return {
    day: 1,
    day_complete: false,
    replay: false,
    cart_name: "",
    money: 87,
    day_start_money: 87,
    awning: false,
    kid_kept: false,
    idris_served: false,
    lunch_served: 0,
  };
}

function fromUnknown(raw: unknown): SaveData {
  const d = defaultSave();
  if (typeof raw !== "object" || raw === null) return d;
  const o = raw as Record<string, unknown>;
  const num = (k: string, fallback: number): number => {
    const v = o[k];
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  };
  const bool = (k: string, fallback: boolean): boolean => {
    const v = o[k];
    return typeof v === "boolean" ? v : fallback;
  };
  return {
    day: Math.min(Math.max(Math.trunc(num("day", d.day)), 1), MAX_DAY),
    day_complete: bool("day_complete", d.day_complete),
    replay: bool("replay", d.replay),
    cart_name: typeof o.cart_name === "string" ? o.cart_name.slice(0, 24) : d.cart_name,
    money: Math.max(Math.trunc(num("money", d.money)), 0),
    day_start_money: Math.max(Math.trunc(num("day_start_money", num("money", d.money))), 0),
    awning: bool("awning", d.awning),
    kid_kept: bool("kid_kept", d.kid_kept),
    idris_served: bool("idris_served", d.idris_served),
    lunch_served: Math.min(Math.max(Math.trunc(num("lunch_served", d.lunch_served)), 0), 3),
  };
}

/** Load-or-default, corrupt-safe. Mirrors save.gd's load_or_default(). */
export function loadOrDefault(storage: Storage | null = safeStorage()): SaveData {
  if (storage === null) return defaultSave();
  try {
    const text = storage.getItem(SAVE_KEY);
    if (text === null) return defaultSave();
    return fromUnknown(JSON.parse(text));
  } catch {
    return defaultSave(); // garbage JSON: a fresh start, never a crash
  }
}

/** Day-1 never writes; nothing else about the rules changes here. */
export function persist(data: SaveData, storage: Storage | null = safeStorage()): boolean {
  if (data.day < 2) return false; // the intro replays fresh by design
  if (storage === null) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function wipe(storage: Storage | null = safeStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    /* a locked-down profile keeps its silence; so do we */
  }
}

/** True when this boot was rescued from a corrupt save (the HUD says it warmly, at M4). */
export function saveBootNote(data: SaveData, storage: Storage | null = safeStorage()): boolean {
  if (storage === null) return false;
  try {
    return storage.getItem(SAVE_KEY) !== null && data.day === 1 && !data.day_complete;
  } catch {
    return false;
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // private-mode / blocked storage: play, don't persist
  }
}
