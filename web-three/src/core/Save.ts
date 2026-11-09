/**
 * FIRST SLICE save v1 — web mirror of the original greybox save (docs/23–24).
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

import type { DiaryNoted } from './diary';
import type { FieldDiaryEntry } from './fieldDiary';
import { parseFieldDiary } from './fieldDiary';
import type { LedgerEntry } from './consequenceLedger';
import { parseLedger } from './consequenceLedger';
import type { SavedChapter } from './chapters';
import { freshChapterState, parseChapterState } from './chapters';
import type { SavedRails } from './chapterRails';
import { freshRailStates, parseRails } from './chapterRails';
import { clampCalendarDay } from './calendar';

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
  // ---- the Map's notebook (docs/11 + docs/12 prototype 2) — optional v1-safe ----
  /** Notes the Map has written down, order earned. Optional so pre-Map saves
   *  parse unchanged; missing reads as []. Capped at 24 by the collector. */
  map_notes?: string[];
  /** Earned slang card ids for the margins (Doc 08's four). */
  map_slang?: string[];
  /** Place ids Map has sketched on page 1, order first-walked. v1-safe:
  *  missing reads as []. */
  map_places?: string[];
  /** Map copied Priya's two lines badly (docs/51 B11) — the crooked copy
  *  is on page 1. v1-safe: missing reads false. */
  map_priya_lines?: boolean;
  /** Doc 02's starter pick — who got off the bus. One of core/starters' ids;
  *  absent/unknown reads as 'classic' (the shipped look). v1-safe. */
  starter?: string;
  /** The Roam layer's mode rides the save (docs/architecture/03): present
  *  only when Roam was active at the last write, so a pre-roam v1 save
  *  parses byte-identically (the starter's schema-freeze law: absence
  *  reads as story mode at the read site, not as a new key). Day 1 never
  *  writes anyway (save.gd law), so a fresh player always boots into the
  *  story. */
  roam?: boolean;
  /** The diary's watermark (docs/architecture/05 M3) — per family, the
  *  cumulative count already surfaced as a morning note. Present only
  *  once a note has been said, so a pre-diary save parses
  *  byte-identically (the roam/starter law: absence reads as "owes no
  *  notes" at the read site). Clamped per family in parseSave. */
  diary_noted?: DiaryNoted;
  /** The in-game calendar day (narrative/14 R4 — core/calendar.ts): 1-based
   *  from Day 1 = Tuesday, September 9, Year 1 — the arrival (doc 12 §1;
   *  DEC-1, 2026-11-06). Optional trailing v1-safe field: absent reads as
   *  the story day (the shipped Day 1–4 are September 9–12, Year 1).
   *  Clamped to [1, 36500]. */
  calendar_day?: number;
  /** The field diary — Leo's own record (narrative/14 R3 + narrative/03 §2
   *  — core/fieldDiary.ts). Optional trailing v1-safe field: absent reads
   *  as [] (an old save is an empty diary, the map-notebook migration law).
   *  Parsed entries are quarantine-cleaned; corrupt entries are dropped and
   *  counted, never a crash. */
  field_diary?: FieldDiaryEntry[];
  /** The consequence ledger (narrative/14 R2 + narrative/10 §1 —
   *  core/consequenceLedger.ts): choices, promises (with due dates),
   *  omissions, amends. Optional trailing v1-safe field: absent reads as
   *  [] (an old save is an empty ledger — the world remembers nothing
   *  yet, and nothing retroactively becomes a debt). Parsed entries are
   *  quarantine-cleaned like the diary; a promise whose due date is
   *  corrupt quarantines whole (a promise that could mature on an
   *  invented day would lie to the C5 cascade). Doc 14 §3's `promises`
   *  layer is realized INSIDE this array — a promise is a LedgerEntry
   *  (R2's own schema carries the due date); a second duplicated array
   *  would create a mirror to keep honest (the WP-4 mirror lesson). */
  ledger?: LedgerEntry[];
  /** The chapter gate (narrative/14 R8 — core/chapters.ts): the current
   *  chapter, the day it opened, the day last written. Optional trailing
   *  v1-safe field: absent reads as C0, opened on day 1 (an old save is
   *  a fresh arrival — the spine has not moved). Corrupt parses
   *  quarantine to the same fresh state, never a crash. */
  chapter?: SavedChapter;
  /** The rails' fire states (narrative/14 R1 — core/chapterRails.ts):
   *  six rails, fired + firedOnDay. Optional trailing v1-safe field:
   *  absent reads as all-unfired (the spine has not fired yet). A fired
   *  rail whose day is unreadable re-seeds — a rail that cannot say
   *  when it fired cannot claim it fired. */
  rails?: SavedRails;
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
    map_notes: [],
    map_priya_lines: false,
    map_slang: [],
    map_places: [],
    calendar_day: 1,
    field_diary: [],
    ledger: [],
    chapter: freshChapterState(),
    rails: freshRailStates(),
  };
}

/** newGameSave — the wardrobe lock law's one honest reset (ui/Wardrobe.ts):
 *  a chosen face is bound to the save, and the ONLY way to wear another is
 *  to start over. This is what "start over" writes: a factory-fresh schema
 *  with the new starter pinned, so the reboot dresses the new face and the
 *  pick card never re-asks (the save.starter boot law). */
export function newGameSave(starterId: string): SaveData {
  return { ...defaultSave(), starter: starterId };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** An optional string-list field, normalized to pages: present arrays pass
 *  through (clamped, string-coerced); anything else — absent, corrupt, a
 *  number — is an empty page. The Map never crashes a parse. */
function strList(d: Record<string, unknown>, k: string, cap: number): string[] {
  const arr = d[k];
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((v): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200)
    .slice(0, cap);
}

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
  // the diary watermark — present only when at least one family has been
  // noted; unknown/corrupt keys are dropped, never a crash (save.gd law)
  const diaryNoted = diaryNotedOf(d);
  const storyDay = clamp(Math.trunc(num('day', 1)), 1, MAX_DAY);
  return {
    day: storyDay,
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
    // the Map's notebook — absent in old saves, reads as empty pages.
    // A corrupted list is an empty page, never a crash (save.gd law).
    map_notes: strList(d, 'map_notes', 24),
    map_slang: strList(d, 'map_slang', 8),
    map_places: strList(d, 'map_places', 12),
    map_priya_lines: bool('map_priya_lines', false),
    // Doc 02's starter pick — present only when a face was chosen, so a
    // pre-registry v1 save still parses byte-identically (the schema-freeze
    // law: absence reads as 'classic' at the read site, not as a new key)
    ...(typeof d.starter === 'string' && d.starter.length > 0 && d.starter.length <= 40
      ? { starter: d.starter }
      : {}),
    // the Roam layer's mode — present only when roam was active at the
    // last write; absence reads as story mode (freeroam.ts's contract)
    ...(d.roam === true ? { roam: true } : {}),
    ...(diaryNoted ? { diary_noted: diaryNoted } : {}),
    // the in-game calendar (narrative/14 R4) — absent in old saves reads
    // as the story day, so the shipped Day 1–4 land on September 9–12,
    // Year 1 (the arrival epoch, DEC-1) without a migration step
    calendar_day: clampCalendarDay(d['calendar_day'] ?? storyDay),
    // the field diary (narrative/14 R3) — absent in old saves reads as an
    // empty diary; corrupt entries are quarantined, never a crash
    field_diary: parseFieldDiary(d['field_diary']).entries,
    // the consequence ledger (narrative/14 R2) — absent in old saves reads
    // as an empty ledger; corrupt entries are quarantined, never a crash
    ledger: parseLedger(d['ledger']).entries,
    // the chapter gate (narrative/14 R8) — absent in old saves reads as a
    // fresh arrival (C0, day 1); corrupt parses quarantine to the same
    // fresh state, never a crash
    chapter: parseChapterState(d['chapter']).state,
    // the rails (narrative/14 R1) — absent in old saves reads as an
    // unfired spine; a fired rail with an unreadable day re-seeds
    rails: parseRails(d['rails']).rails,
  };
}

const DIARY_PARSE_KEYS = ['shelf', 'dog', 'trim', 'wash', 'hoop'] as const;

/** The saved diary watermark, or undefined when there is none. Only
 *  positive finite numbers land; a value of 0 means "nothing noted" and
 *  stays absent so saves stay minimal. Unknown families are ignored —
 *  the read site names its families (the migration law). */
function diaryNotedOf(d: Record<string, unknown>): DiaryNoted | undefined {
  const raw = d['diary_noted'];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: DiaryNoted = {};
  let any = false;
  for (const k of DIARY_PARSE_KEYS) {
    const v = src[k];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[k] = clamp(Math.trunc(v), 0, 999);
      any = true;
    }
  }
  return any ? out : undefined;
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
