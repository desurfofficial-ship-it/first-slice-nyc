/**
 * Authoritative gameplay state for Day 1 + Day 2 — ported 1:1 from the
 * original greybox (the migration record: docs/23–24). No rendering, no DOM:
 * the scene graph and the UI only ever *reflect* this state.
 */

import type { SaveData } from './Save';
import type { DiaryCounters, DiaryNoted } from './diary';
import { appendEntry, correctEntry, serializeFieldDiary, type FieldDiaryEntry, type Correction } from './fieldDiary';
import { DEFAULT_STARTER } from './starters';
import { DEFAULT_IDENTITY, sanitizeIdentity, type PlayerIdentity } from './identity';
import { freshFluency, fluencyAdvance, fluencyAtFloor, type FluencyState, type FluencyTier } from './fluency';
import { markSent } from './postcardDispatch';
import { RESOURCE_NOTE_TEXT, shouldOfferResourceNote } from './guardrails';
// ---- the narrative spine (narrative/14 R1/R2/R8 — the machines, now fed) ----
import {
  freshChapterState, touchDay, serializeChapterState, advanceChapter,
  type ChapterState,
} from './chapters';
import {
  freshRailStates, evaluateRails, serializeRails,
  type RailState, type RailFire, type RailId,
} from './chapterRails';
import {
  appendLedgerEntry, serializeLedger, type LedgerEntry,
} from './consequenceLedger';
import {
  mishearEntryDraft, C0_THEORY_ENTRY_ID_PREFIX, C0_QUESTION_ENTRY_ID_PREFIX,
  C0_QUESTION_FREE_ID,
} from './c0pack';
import {
  C0_BLOCK_IDS, DESHAUN_KIT_ECHO, DESHAUN_KIT_LINES, DESHAUN_SIT_LINE,
  EDDIE_LEASE_ECHO, EDDIE_LEASE_LINE, ODESSA_NOD, ROSA_MANGO_LINE,
  SAM_LAW_LINE, SAM_STILL_DOING_LINE, SURVEYOR_ECHO, SURVEYOR_LINE,
  deshaunEntry, leaseSeenEntry, odessaEntry, surveyorGuessEntry, wobbleEntry,
  C0_CUT_CITY_LINE, C0_CUT_EDDIE_LINE, C0_CUT_ID, C0_CUT_WALL,
  C0_WEEK_ORDERS, C0_WEEK_RUSH_DONE, C0_WEEK_WAKE,
  cutEntry, seasonCutMontage,
} from './c0pack';
// ---- the C1 content pack (narrative/14 §7 step 8 — doc 06 §C1) ----
import {
  C1_FIRST_DAY, C1_LAST_DAY, C1_CUT_ADVANCE_DAY, C1_CUT_ID, C1_CUT_WALL,
  C1_CUT_NOTICE_STAGE, c1CompressionFrom, c1RailFor,
  c1StationOf, c1CutEntry, applyC1Pick, f1Entries, f6Entry, C1_FRAGMENT_IDS,
  C1_IDS, C1_LADDER_LINE, C1_NOTICE_FRAME_LINE, C1_NOTICE_SECOND_LINE,
  C1_FLOUR_LINE, C1_JUNE_WALL_NOTE, C1_PRIYA_ROUTE_LINE, C1_JUNE_REPLY_LINE,
  C1_PETITION_NOTE, C1_KEV_LANYARD_NOTE, C1_YOLI_FREEZER_NOTE,
  C1_YOLI_1994_NOTE, C1_CRAIG_SCENE, C1_CIGAR_BOX_SCENE, C1_BLACKOUT_TABLE_NOTE,
  ladderEntry, noticeEvidenceEntry, petitionEntry, juneEntry,
  yoliEntry, craigEntry, questionCraigEntry, questionFenceEntry,
  cigarBoxEntry, blackoutTableEntry,
} from './c1pack';
// ---- the C2 content pack (narrative/14 §7 step 9 — doc 06 §C2) ----
import {
  C2_FIRST_DAY, C2_LAST_DAY, C2_CUT_DAY, C2_CUT_ID, C2_CUT_WALL,
  C2_CUT_STAGE, c2CompressionFrom, c2RailFor,
  c2StationOf, c2CutEntry, applyC2Pick, f3Entry, C2_FRAGMENT_IDS,
  C2_IDS, C2_NOTICE_ASK_NOTE, C2_MAP_NOTE, C2_COMPACT_SCENE,
  C2_MARISOL_LINE, C2_SESSION_ONE_NOTE, C2_SESSION_TWO_NOTE,
  C2_SESSION_FLAG, C2_PRIYA_INTEL_NOTE, C2_PRIYA_FAVOR_NOTE, C2_CRAIG_OFFER_NOTE,
  C2_EDDIE_RENEWAL_NOTE, C2_EDDIE_RENEWAL_AFTER, C2_KEV_APPEAL_NOTE,
  C2_RENT_WAVE_NOTE, C2_RENT_WAVE_LEDGER_ID, C2_RENT_WAVE_SILENCE_REFS,
  C2_OKTAYS_SCENE, C2_OKTAYS_MEHMET_NOTE, C2_ROSA_ANNIVERSARY_LINE,
  C2_ROSA_ELEANOR_LINE, C2_JUNE_LEASE_NOTE,
  C2_PRIYA_PROMPT_DEBT_REFS, C2_STRIKE_TARGETS, C2_K6_STRIKE,
  c2K1Correction, c2K6Correction, C2_K1_MARGIN, C2_K6_MARGIN,
  noticeEntry, mapEntry, compactEntry, coffeeEntry, sessionOneEntry,
  sessionTwoEntry, priyaEntry, squeezeEntry, ribbonEntry, kevEntry,
  rentEntry, oktaysEntry, anniversaryEntry, questionDorisEntry,
  k2Entry, leaseEntry,
} from './c2pack';
import { dateOfCalendarDay } from './calendar';
import { OBJECTIVES, DEFAULT_CART_NAME, itemPickNote, ITEM_STICKERS, D3_ORDERS, D4_ORDERS,
  D3_WAKE_NOTE, D3_KIDDOWN_NOTE, D3_KID_ARRIVED_NOTE, D3_POSTER_NOTE,
  D4_WAKE_NOTE, D4_STRANGER_GREET_NOTE, D4_RUSH_DONE_NOTE, D4_MAP_NOTE,
  D4_SAL_MEET_NOTE, D4_SAL_CHAT_NOTE, D4_PERMIT_OFFER_NOTE, D4_PERMIT_FILED_NOTE,
  D4_PERMIT_ALREADY_NOTE, IDRIS_D3_FAVOR_REACTION, ROSA_FOUR_MORNINGS_NOTE,
  RUSH_CARDS, SOLO_CARDS, RUSH_NOTE_5, USUAL_NOTE,
  IDRIS_NINE_YEARS_NOTE, IDRIS_UNLOCK_NOTE, ROSA_CART_HANDOVER_NOTE,
  ROSA_REGISTER_NOTES, type OrderCard } from './content';
import type { WeekOrder } from './c0pack';

export const Step = {
  MEET_ROSA: 0,
  ENTER_BODEGA: 1,
  COLLECT: 2,
  RUSH: 3,
  CROSS: 4,
  CLAIM_CART: 5,
  NAME_CART: 6,
  SOLO: 7,
  CLIMB: 8,
  POSTCARD: 9,
  D2_WAKE: 10,
  D2_IDRIS: 11,
  D2_TASK: 12,
  D2_DELIVER: 13,
  D2_LUNCH: 14,
  D2_CLIMB2: 15,
  D2_POSTCARD: 16,
  // ---- Day 3 — "A Place at the Corner" (docs/28) ----
  D3_WAKE: 17,
  D3_RUSH: 18,
  D3_KIDDOWN: 19,
  D3_STOOL: 20,
  D3_POSTER: 21,
  D3_CLIMB3: 22,
  D3_POSTCARD: 23,
  // ---- Day 4 — "Say Hi" (docs/29) + "The Block Opens Up" (docs/30) ----
  D4_WAKE: 24,
  D4_STRANGER: 25,
  D4_RUSH: 26,
  D4_MAP: 27,
  D4_LAUNDRY: 28,
  D4_PERMIT: 29,
  D4_CLIMB4: 30,
  D4_POSTCARD: 31,
  DONE: 32,
  // ---- Days 5–7 — the stabilized loop (doc 11 §2 beat 11 + §7:
  // open, rush, roam, wind-down, postcard; the C0 pack's tranche 3) ----
  WK_WAKE: 33,
  WK_RUSH: 34,
  WK_ROAM: 35,
  WK_CLIMB: 36,
  WK_POSTCARD: 37,
} as const;
export type Step = (typeof Step)[keyof typeof Step];

export const INTERACT_RANGE = 2.4;
export const START_MONEY = 87;

export type PlayerKind = 'rush' | 'solo' | 'idris' | 'lunch';

/** One interaction outcome — the orchestrator (Game.ts) applies the world/UI side. */
export type Effect =
  | { kind: 'step'; step: Step }
  | { kind: 'note'; text: string }
  | { kind: 'money' }
  | { kind: 'spend'; amount: number }
  | { kind: 'rosa-moved-behind-counter' }
  | { kind: 'collect'; id: string }
  | { kind: 'spawn-customer'; who: PlayerKind; x: number; z: number }
  | { kind: 'serve-customer' }
  | { kind: 'name-cart-open' }
  | { kind: 'name-cart-applied'; name: string }
  | { kind: 'crossed'; atStrip: boolean; checkpoint: { x: number; z: number } }
  | { kind: 'dusk-start' }
  | { kind: 'reach-top'; day2: boolean }
  | { kind: 'ladder-hint' }
  | { kind: 'rosa-window-warm' }
  | { kind: 'next-day'; to?: number }
  | { kind: 'story-flags'; flags: string[] }
  | { kind: 'idris-served' }
  | { kind: 'kid-delivered' }
  | { kind: 'awning-offer' }
  | { kind: 'awning-up' }
  | { kind: 'cup-given' }
  | { kind: 'cup-taken-back' }
  | { kind: 'brew-start' }
  | { kind: 'kid-down' }
  | { kind: 'kid-follow' }
  | { kind: 'kid-sits' }
  | { kind: 'stool-offer' }
  | { kind: 'stool-up' }
  | { kind: 'stranger-arrive' }
  | { kind: 'stranger-to-cart' }
  | { kind: 'stranger-departs' }
  | { kind: 'map-given' }
  | { kind: 'wash-start' }
  | { kind: 'apron-clean' }
  | { kind: 'permit-offer' }
  | { kind: 'permit-filed' }
  | { kind: 'persist' }
  | { kind: 'shelf-deplete'; id: string }
  | { kind: 'free-wash-start' }
  // ---- the serving conversation (docs/11 + docs/12, Doc 07 VS-F03) ----
  | { kind: 'order-open'; card: OrderCard }
  | { kind: 'order-respond'; text: string }
  | { kind: 'order-close' }
  // ---- the Map, as a notebook (docs/11 + docs/12 prototype 2) ----
  | { kind: 'map-note'; text: string }
  | { kind: 'map-slang'; id: string }
  // ---- the C0 pack's diary picks (doc 11 §3 — the overlay packs). The
  // Game turns this into the NotebookPrompt overlay; a driver boot never
  // sees it (the pick-card law: drivers keep the shipped flow). ----
  | { kind: 'diary-prompt'; pack: 'theory' | 'question' | 'choice'; node?: 'N1a' | 'N1b' | 'N2' | 'N2b' | 'TOAST' }
  // ---- the C0 block layer's diary ink (narrative/14 §7 step 6, tranche 2
  // — core/c0Pack.ts): the state has already appended the entry; the
  // effect only tells the UI to wiggle (the map-note precedent)
  | { kind: 'diary-ink' };

export class GameState {
  step: Step = Step.MEET_ROSA;
  day = 1;
  dayComplete = false;
  dayStartMoney = START_MONEY;
  money = START_MONEY;
  awningUp = false;
  kidKept = false;
  idrisServed = false;
  idrisArrived = false;
  lunchServed = 0;
  replayDay = false;
  replayNoteShown = false;
  lingerStage = 0;
  awningConfirm = false;
  rosaChatI = 0;
  cartName = '';
  /** Doc 02's starter pick — who got off the bus. Cosmetic only: it dresses
   *  the player rig. Persisted so the face survives the week. */
  starterId = DEFAULT_STARTER;
  itemsLeft = new Set<string>(['mango', 'coffee', 'bread']);
  rushServed = 0;
  soloServed = 0;
  elapsed = 0;
  onDay2 = false;
  // ---- Day 3 ----
  rushIndex = 0;        // which order in the morning queue is at the cart (Day 3 + 4)
  brewing = false;      // an order is being made — repeat presses do nothing
  kidDown = false;      // the kid has come down and joined you
  kidAtCorner = false;  // he reached the cart on his own two feet
  stoolUp = false;      // the Day 3 purchase
  stoolConfirm = false; // the awning-style confirm gate
  posterSeen = false;
  /** Transient (never saved): the interaction id whose offer is on the
   *  table — the awning/stool/permit confirm-gate pattern, generalized for
   *  the free-roam shelf (Doc 37 §3C). First press offers, second buys. */
  buyConfirm: string | null = null;
  /** Freshly cut at Fade King today (docs/38). TRANSIENT — never saved; a
   *  haircut is a morning, not a possession. The save-v1 shape is untouched
   *  by construction: this field is simply not serialized. */
  trimToday = false;
  /** Transient shelf units for the free-roam shop (never saved). One unit
   *  per SKU each morning; a successful purchase consumes one. */
  shelfStock: Record<string, number> = { mango: 1, coffee: 1, bread: 1 };
  // ---- Day 4 ----
  mapGiven = false;       // the Map changed hands
  strangerMet = false;    // you said the thing Rosa said
  strangerAtCart = false; // she finished walking your first walk
  // transient (never saved — the replayNoteShown pattern): Rosa's shorthand
  // rung is spoken once, at the handoff. A save that never heard of it
  // parses and plays unchanged.
  fourMorningsSaid = false;
  // transient (never saved): Eddie's covenant is received once per session
  // (the C0 block layer — rituals repeat across sessions; that is what
  // makes them rituals)
  eddieCovenantSaid = false;
  // ---- Day 4 afternoon — the block opens up (docs/30) ----
  apronWashing = false;   // the apron is in the machine
  apronClean = false;     // the wash finished on the Game's clock
  permitFiled = false;    // the application went in — permanent, like the stool
  permitConfirm = false;  // the awning-style confirm gate
  // ---- the block remembers (Doc 37 §3F) — cumulative free-roam choices ----
  // Persisted as OPTIONAL save fields (save stays v1 — old saves parse
  // unchanged, missing reads as 0; see Save.ts migration note). These are
  // the "choices outside the main story" the block surfaces as memories.
  shelfBuys = 0;
  dogBuys = 0;
  trims = 0;
  washes = 0;
  hoopMakes = 0;
  /** The diary's watermark (docs/architecture/05 M3, core/diary.ts): per
   *  family, the count already surfaced as a morning note. Lives in the
   *  save as `diary_noted`; absence reads as "owes no notes". */
  diaryNoted: DiaryNoted = {};
  /** The in-game calendar day (narrative/14 R4 — core/calendar.ts). Rides
   *  the save as `calendar_day`; absence reads as the story day, so the
   *  shipped Day 1–4 are September 9–12, Year 1 (the arrival epoch, doc 12
   *  §1; DEC-1, 2026-11-06 — the mood-lock is presentation, not a date). */
  calendarDay = 1;
  /** The field diary — Leo's own record (narrative/14 R3 + narrative/03 §2
   *  — core/fieldDiary.ts). Rides the save as `field_diary`; an old save
   *  reads as []. Append-only by construction: logDiaryEntry appends,
   *  correctDiaryEntry strikes a line, nothing removes. */
  fieldDiary: FieldDiaryEntry[] = [];
  // ---- the spine's state (narrative/14 R1/R2/R8 — the machines, now fed
  // by the C0 pack; Game materializes these from the save at boot/beginDay
  // and the snapshot rides them back). All three default fresh/empty — an
  // old save is a fresh arrival with an empty ledger (the v1-safe law). ----
  /** The chapter gate (R8 — core/chapters.ts). */
  chapter: ChapterState = freshChapterState();
  /** The rails' fire states (R1 — core/chapterRails.ts). */
  rails: Record<RailId, RailState> = freshRailStates();
  /** The consequence ledger (R2 — core/consequenceLedger.ts). */
  ledger: LedgerEntry[] = [];
  /** The spine walk's fires from the CURRENT day-begin/boot (the morning
   *  whisper reads this; transient — the fire states themselves are the
   *  durable truth). */
  spineFires: RailFire[] = [];
  // ---- narrative/14 §7 step 7 machines (R9–R12) — the state, v1-safe ----
  /** R11 — the chosen identity (core/identity.ts). Defaults to Leo Marsh
   *  (doc 02 §1); the pick-card name entry rewrites it; the save carries
   *  it as `player_name`. */
  playerIdentity: PlayerIdentity = { ...DEFAULT_IDENTITY };
  /** R10 — the fluency ladder (core/fluency.ts). Persists as `fluency`;
   *  an old save heals to its chapter's floor at boot. */
  fluency: FluencyState = freshFluency();
  /** R9 — the ONE send's day (core/postcardDispatch.ts). Null until C5's
   *  scene fires; the save carries `{ day }` — the recipient is the type. */
  sentPostcardDay: number | null = null;
  /** R12 — the resource note's once-latch (core/guardrails.ts). Rides the
   *  save as `resource_note_offered`. */
  resourceNoteOffered = false;
  // ---- the serving conversation (docs/11 + docs/12) ----
  /** The order card currently on the counter — null when nobody's ordering.
   *  TRANSIENT: a conversation is a moment, never a save. */
  pendingCard: OrderCard | null = null;
  /** The chosen reply has landed; the card shows its response until dismissed. */
  orderResponded = false;
  /** The kid was served his cold cup (Day 1) — the gold window's referent.
   *  TRANSIENT like every Day-1 flag: day 1 never writes. */
  kidDay1Served = false;
  // ---- the Map, as a notebook (docs/11 + docs/12 prototype 2) ----
  /** Notes the Map has written down, in the order earned. Capped, deduped,
  *  and persisted as an OPTIONAL v1-safe field (see Save.ts). Page 1's
  *  "You are here. That's enough." is the Map's own — never stored here. */
  mapNotes: string[] = [];
  /** Earned slang card ids for the margins (Doc 08's four). */
  mapSlang: string[] = [];
  /** Places Map has sketched on page 1, in the order you first walked to
  *  them (docs/12: Map copies the neighborhood badly, and only what it has
  *  seen). Persisted v1-safe as `map_places`. */
  visitedPlaces: string[] = [];
  /** Map copied Priya's two lines badly (docs/02 Subway University, docs/51
  *  B11) — the crooked copy lives on page 1 from the 'map-copies' beat on.
  *  A latch, not a counter: one teach, one doodle, kept. Persisted v1-safe
  *  as `map_priya_lines` (absent reads false — an old save is a page the
  *  teach hasn't reached yet). */
  priyaLinesCopied = false;
  /** The C1 season's two-beat linger: the compression's montage shows on
  *  one press, the roll to the next station consumes the days on the
  *  next. TRANSIENT (never saved): quitting mid-linger replays the
  *  montage — the counters only ever move through the roll itself, so a
  *  replayed montage can never move a date twice. */
  pendingCompressionTo: number | null = null;

  /** The 'map-copies' beat latches. Returns true when the doodle is new. */
  copyPriyaLines(): boolean {
    if (this.priyaLinesCopied) return false;
    this.priyaLinesCopied = true;
    return true;
  }

  /** A place goes onto the sketch. Deduped, order-earned. Returns true
  *  when the pencil mark is new. */
  revealPlace(id: string): boolean {
    if (this.visitedPlaces.includes(id)) return false;
    this.visitedPlaces.push(id);
    return true;
  }

  hasSeenPlace(id: string): boolean {
    return this.visitedPlaces.includes(id);
  }

  /** The Map writes it down (Doc 12: "Map wants to write this down.").
  *  Deduped — the same lesson is never written twice; a note list is a
  *  notebook, not a log. Returns true when the note is new. */
  collectNote(text: string): boolean {
    if (this.mapNotes.includes(text)) return false;
    if (this.mapNotes.length >= 24) this.mapNotes.shift();
    this.mapNotes.push(text);
    return true;
  }

  /** A slang card slides into the margins. Returns true when new. */
  collectSlang(id: string): boolean {
    if (this.mapSlang.includes(id)) return false;
    this.mapSlang.push(id);
    return true;
  }

  get isDay2(): boolean {
    return this.day >= 2;
  }

  get isDay3(): boolean {
    return this.day >= 3;
  }

  get isDay4(): boolean {
    return this.day >= 4;
  }

  /** The stabilized week (doc 11 §7): days 5–7 ride the WK_* loop. */
  get isWeek(): boolean {
    return this.day >= 5;
  }

  /** C1's season (narrative/14 §7 step 8 — doc 06 §C1): the station days
  *  ride the same WK_* loop with the C1 pack's voice. The chapter gate is
  *  the wide law (R8); the day range is the loop's own — the cut plays at
  *  C1_LAST_DAY's linger and the wall follows. */
  get isC1(): boolean {
    return this.day >= C1_FIRST_DAY && this.day <= C1_LAST_DAY;
  }

  /** C2's season (narrative/14 §7 step 9 — doc 06 §C2): the station days
   *  ride the same WK_* loop with the C2 pack's voice. Same law as C1's
   *  — the chapter gate is the wide law (R8); the day range is the
   *  loop's own — the cut plays at C2_LAST_DAY's linger and the wall
   *  follows. */
  get isC2(): boolean {
    return this.day >= C2_FIRST_DAY && this.day <= C2_LAST_DAY;
  }

  /** The season station for THIS morning, whichever season is on the
   *  clock (the C1 and C2 packs own disjoint day ranges; the loop reads
   *  one voice per day — the WK_* steps are the loop, the station is the
   *  day's mouth). */
  private seasonStation(day: number): { queue: readonly WeekOrder[]; wake: string; rushDone: string; storm?: boolean } | undefined {
    if (this.isC2) return c2StationOf(day);
    if (this.isC1) return c1StationOf(day);
    return undefined;
  }

  objectiveText(): string {
    if (this.step === Step.DONE) return `Day ${this.day} is done.`;
    return OBJECTIVES[this.step] ?? '';
  }

  /** M1 — beats as places, not pressure (docs/architecture/05): the story
   *  beat's spot on the Map's sketch, as a MAP_PLACES id, or null when the
   *  beat has no NAMED place (the fire escape, the teal door, the subway
   *  stairs, the crosswalk notice, the postcard rail). Data only — the
   *  objective line and the map marker both read this one helper, so they
   *  can never disagree (doc 05's M1 risk: the HUD may not lie). */
  private static readonly BEAT_PLACES: Record<number, string> = {
    [Step.MEET_ROSA]: 'terminal',
    [Step.ENTER_BODEGA]: 'bodega',
    [Step.COLLECT]: 'bodega',
    [Step.RUSH]: 'bodega',
    [Step.CROSS]: 'cart',
    [Step.CLAIM_CART]: 'cart',
    [Step.NAME_CART]: 'cart',
    [Step.SOLO]: 'cart',
    [Step.D2_WAKE]: 'cart',
    [Step.D2_IDRIS]: 'cart',
    [Step.D2_TASK]: 'bodega',
    [Step.D2_LUNCH]: 'cart',
    [Step.D3_WAKE]: 'cart',
    [Step.D3_RUSH]: 'cart',
    [Step.D3_KIDDOWN]: 'cart',
    [Step.D3_STOOL]: 'cart',
    [Step.D4_WAKE]: 'cart',
    [Step.D4_STRANGER]: 'terminal',
    [Step.D4_RUSH]: 'cart',
    [Step.D4_MAP]: 'cart',
    [Step.D4_LAUNDRY]: 'laundry',
    [Step.WK_RUSH]: 'cart',
  };

  beatPlaceId(): string | null {
    if (this.step === Step.DONE) return null;
    return GameState.BEAT_PLACES[this.step] ?? null;
  }

  setStep(s: Step): Effect[] {
    this.step = s;
    return [{ kind: 'step', step: s }];
  }

  earn(n: number): Effect[] {
    if (n <= 0) return [];
    if (this.replayDay) {
      if (!this.replayNoteShown) {
        this.replayNoteShown = true;
        return [{ kind: 'note', text: 'Replaying a day you kept. The coffee\u2019s on the house today.' }];
      }
      return [];
    }
    this.money = Math.max(0, this.money + n);
    return [{ kind: 'money' }];
  }

  spend(n: number): Effect[] {
    this.money = Math.max(0, this.money - n);
    return [{ kind: 'money' }];
  }

  /** Morning (and post-errand) restock — one unit per shelf SKU. */
  restockShelfStock(): void {
    this.shelfStock = { mango: 1, coffee: 1, bread: 1 };
  }

  shelfUnits(id: string): number {
    return this.shelfStock[id] ?? 0;
  }

  /** Consume one shelf unit after money already checked. Returns true if now empty. */
  consumeShelfUnit(id: string): boolean {
    const n = this.shelfStock[id] ?? 0;
    if (n <= 0) return true;
    this.shelfStock[id] = n - 1;
    return this.shelfStock[id] <= 0;
  }

  /** A free-roam choice was made — the block keeps count (Doc 37 §3F).
   *  Counters are cumulative across days, persisted at the day-end save. */
  recordChoice(kind: 'shelf' | 'dog' | 'trim' | 'wash' | 'hoop'): void {
    switch (kind) {
      case 'shelf': this.shelfBuys += 1; break;
      case 'dog': this.dogBuys += 1; break;
      case 'trim': this.trims += 1; break;
      case 'wash': this.washes += 1; break;
      case 'hoop': this.hoopMakes += 1; break;
    }
  }

  /** Whether an interaction is currently offerable moved into the registry
   *  (Doc 37 §3B): each interaction owns its `enabled` gate. The old
   *  per-id switch lived here; game/interactionDefs.ts is its 1:1 port and
   *  the E2E driver is its specification. */

  tryRosa(): Effect[] {
    if (this.step === Step.MEET_ROSA) {
      return [
        { kind: 'note', text: 'Rosa: \u201CHoney, your Map is upside down. Come on, I\u2019ll show you.\u201D' },
        { kind: 'rosa-moved-behind-counter' },
        ...this.setStep(Step.ENTER_BODEGA),
      ];
    }
    return [];
  }

  enterBodega(): Effect[] {
    if (this.step === Step.ENTER_BODEGA) {
      // Rosa walks you behind the counter — the word for the kind of place
      // this is, written the moment you're standing in it (docs/08)
      const out = this.setStep(Step.COLLECT);
      this.slangEffect(out, 'bodega');
      return out;
    }
    return [];
  }

  collect(id: string): Effect[] {
    if (this.step !== Step.COLLECT || !this.itemsLeft.has(id)) return [];
    this.itemsLeft.delete(id);
    const out: Effect[] = [
      { kind: 'collect', id },
      // playtest 2026-10-29: picking used to be silent — say what was taken
      { kind: 'note', text: itemPickNote(id, this.itemsLeft.size) },
      // Beat 5 (doc 11, the block layer) — Rosa clocks him in one look,
      // sliding the mango across: the read that plants silently
      ...(id === 'mango' ? [{ kind: 'note' as const, text: ROSA_MANGO_LINE }] : []),
      // Doc 02 §2:00–5:00 — the fun-fact sticker rides the item; the note
      // queue reads it right after the pick line (the queue holds four)
      ...(ITEM_STICKERS[id] ? [{ kind: 'note' as const, text: ITEM_STICKERS[id] }] : []),
    ];
    if (this.itemsLeft.size === 0) {
      out.push(...this.setStep(Step.RUSH));
      out.push({ kind: 'spawn-customer', who: 'rush', x: -18.0, z: 11.0 });
      // the line forms behind the first order — the city's word for standing
      // in it, written while you're in one (docs/08)
      this.slangEffect(out, 'online');
    }
    return out;
  }

  // ------------------------------------------------- the serving conversation ----
  // Docs 11 + 12: an order is a conversation with choices, not a press.
  // Beat 1: the card opens (customer + order + the always-available replies).
  // Beat 2: a reply lands — everyone serves the cup, every choice is safe.
  // Beat 3: the response read, one more press (or Done) folds the card.
  // No timers anywhere. The counter waits as long as the player does.

  /** Take the order at Rosa's counter (Day-1 rush). Opens the card. */
  openCounterOrder(): Effect[] {
    if (this.step !== Step.RUSH || this.pendingCard) return [];
    const card = RUSH_CARDS[this.rushServed];
    if (!card) return [];
    this.pendingCard = card;
    this.orderResponded = false;
    return [{ kind: 'order-open', card }];
  }

  /** Take the order at your own cart (Day-1 solo rush). Opens the card. */
  openCartOrder(): Effect[] {
    if (this.step !== Step.SOLO || this.pendingCard) return [];
    const card = SOLO_CARDS[this.soloServed];
    if (!card) return [];
    this.pendingCard = card;
    this.orderResponded = false;
    return [{ kind: 'order-open', card }];
  }

  /** One beat of the open conversation. Before a reply: `reply` (clamped)
  *  picks the way the order goes — money and progress never depend on it.
  *  After: any call folds the card. -1 folds too (Escape / Done). */
  chooseReply(reply: number): Effect[] {
    const card = this.pendingCard;
    if (!card) return [];
    if (this.orderResponded) {
      this.pendingCard = null;
      return [{ kind: 'order-close' }];
    }
    this.orderResponded = true;
    const idx = Math.max(0, Math.min(reply, card.replies.length - 1));
    const chosen = card.replies[idx];
    const out: Effect[] = [{ kind: 'order-respond', text: chosen.response }];
    if (chosen.note) this.noteEffect(out, chosen.note);
    if (chosen.slang) this.slangEffect(out, chosen.slang);
    out.push(...(card.id === 'stroller' || card.id === 'kid' || card.id === 'idris_solo'
      ? this.soloServeEffects(card)
      : this.counterServeEffects(card)));
    return out;
  }

  /** The Map writes it down — the STATE keeps the page; the effect only
   *  tells the UI to say so (a repeat note is silence, not a second wiggle). */
  private noteEffect(out: Effect[], text: string): void {
    if (this.collectNote(text)) out.push({ kind: 'map-note', text });
  }

  private slangEffect(out: Effect[], id: string): void {
    if (this.collectSlang(id)) out.push({ kind: 'map-slang', id });
  }

  /** A rush cup changes hands at Rosa's counter: $5, honest (the $87 → $112
  *  math is the E2E's specification). Card 5's quiet line always lands —
  *  the Idris continuity beat is the payoff, not a branch. */
  private counterServeEffects(card: OrderCard): Effect[] {
    this.rushServed += 1;
    const out: Effect[] = [{ kind: 'serve-customer' }, ...this.earn(5)];
    if (card.id === 'idris') this.noteEffect(out, IDRIS_NINE_YEARS_NOTE);
    if (this.rushServed >= RUSH_CARDS.length) {
      out.push({ kind: 'note', text: RUSH_NOTE_5 });
      out.push(...this.setStep(Step.CROSS));
    } else {
      out.push({ kind: 'spawn-customer', who: 'rush', x: -18.0, z: 11.0 + this.rushServed * 0.3 });
    }
    return out;
  }

  /** A cup changes hands at YOUR cart. The solo rush pays nothing — Rosa
  *  counts your register at $112 exactly (Doc 02); these are your neighbors
  *  teaching your feet the counter. Idris converts to a Regular here. */
  private soloServeEffects(card: OrderCard): Effect[] {
    this.soloServed += 1;
    const out: Effect[] = [{ kind: 'serve-customer' }];
    if (card.id === 'kid') this.kidDay1Served = true;
    if (card.id === 'idris_solo') {
      out.push({ kind: 'note', text: IDRIS_UNLOCK_NOTE });
      this.noteEffect(out, USUAL_NOTE);
    }
    if (this.soloServed >= SOLO_CARDS.length) {
      // Doc 02 §20:00–26:00 — Rosa appears at your shoulder and counts the
      // register with you. The notes queue behind the unlock toast; the
      // corner walk (Game side) has her standing there while they read.
      for (const text of ROSA_REGISTER_NOTES) out.push({ kind: 'note', text });
      out.push(...this.setStep(Step.CLIMB));
    } else {
      out.push({ kind: 'spawn-customer', who: this.soloServed === 2 ? 'idris' : 'solo', x: 4, z: -4.6 });
    }
    return out;
  }

  cross(atStrip: boolean): Effect[] {
    if (this.step !== Step.CROSS) return [];
    return [
      { kind: 'note', text: atStrip
        ? 'The Shuffle: walk toward the gaps. Brushing someone is correct. They say \u201Cscuse me.\u201D That is the dance.'
        : 'You found your own way across. The crosswalk still likes you.' },
      { kind: 'crossed', atStrip, checkpoint: { x: 4, z: -4.5 } },
      ...this.setStep(Step.CLAIM_CART),
    ];
  }

  /** TBD-3 (Doc 07) — the Shuffle's soft skip lives as a module law below
   *  the class (cityWillWaitFires) — pure, unit-testable, state-free. */

  claimCart(): Effect[] {
    if (this.step !== Step.CLAIM_CART) return [];
    // The C0 pack's mishear (doc 11 §2 beat 8 + §3 entry 3; doc 03 §5.2's
    // K1 record, body verbatim, tagged FACT — his first over-tag). It lands
    // WITH the handover beat, same night as the shipped line; the id is
    // stable so the C1 wave's strike (correctEntry) can find it. Idempotent:
    // a replayed Day 1 appends nothing (duplicate-id rejection).
    this.logDiaryEntry(mishearEntryDraft(this.calendarDay));
    // Doc 02 §20:00–26:00 — the handover line lands as the box opens:
    // "What're you calling it?" is the question the name box answers.
    return [
      { kind: 'note', text: ROSA_CART_HANDOVER_NOTE },
      { kind: 'name-cart-open' },
      ...this.setStep(Step.NAME_CART),
    ];
  }

  confirmName(raw: string): Effect[] {
    if (this.step !== Step.NAME_CART) return [];
    const name = raw.trim() === '' ? DEFAULT_CART_NAME : raw.trim();
    this.cartName = name;
    return [
      { kind: 'name-cart-applied', name },
      { kind: 'note', text: 'Your corner. Your name. The city wrote it down with you.' },
      ...this.setStep(Step.SOLO),
      { kind: 'spawn-customer', who: 'solo', x: 4, z: -4.6 },
    ];
  }

  serveCart(): Effect[] {
    if (this.step === Step.D2_LUNCH) {
      this.lunchServed += 1;
      const out: Effect[] = [{ kind: 'serve-customer' }, ...this.earn(3)];
      if (this.lunchServed === 1) out.push({ kind: 'note', text: 'Lunch crowd: \u201COne regular. And whatever the awning is doing \u2014 keep doing it.\u201D' });
      if (this.lunchServed === 2) out.push({ kind: 'note', text: 'Lunch crowd: \u201CYou\u2019re the one lighting windows, right? My kid talks about your corner.\u201D' });
      if (this.lunchServed >= 3) {
        out.push({ kind: 'note', text: 'Three more orders. The corner is starting to know you back.' });
        out.push({ kind: 'persist' });
        out.push(...this.advanceDay2());
      } else {
        out.push({ kind: 'spawn-customer', who: 'lunch', x: 4, z: -4.6 });
      }
      return out;
    }
    return [];
  }

  cartAwningInteraction(): Effect[] {
    if (!this.awningConfirm) {
      this.awningConfirm = true;
      return [{ kind: 'awning-offer' }];
    }
    this.awningConfirm = false;
    this.awningUp = true;
    return [{ kind: 'awning-up' }, ...this.spend(15), ...this.advanceDay2()];
  }

  advanceDay2(): Effect[] {
    if (this.day < 2 || this.step >= Step.D2_POSTCARD) return [];
    if (!this.idrisServed) {
      return this.setStep(Step.D2_IDRIS);
    }
    if (!this.kidKept) {
      return this.setStep(Step.D2_TASK);
    }
    if (this.awningUp && this.lunchServed < 3) {
      const out = this.setStep(Step.D2_LUNCH);
      out.push({ kind: 'spawn-customer', who: 'lunch', x: 4, z: -4.6 });
      return out;
    }
    return this.setStep(Step.D2_CLIMB2);
  }

  // ---------------------------------------------------------------- Day 3 ----

  /** The rush queue for THIS morning (the day-3/4 law's data side): the
   *  C1 stations speak their own queues (doc 06 §C1's season — the real
   *  shift is longer, the storm days are soup); the C0 week keeps its
   *  three. The WK_* step gates remain the loop's — the station only
   *  re-voices it. */
  private rushQueue(): readonly WeekOrder[] {
    if (this.step === Step.WK_RUSH && (this.isC1 || this.isC2)) {
      return this.seasonStation(this.day)?.queue ?? C0_WEEK_ORDERS;
    }
    return this.step === Step.WK_RUSH ? C0_WEEK_ORDERS : (this.step === Step.D4_RUSH ? D4_ORDERS : D3_ORDERS);
  }

  /** Rosa's morning-three news, at the cart. Opens the rush (Idris first). */
  rosaD3Wake(): Effect[] {
    if (this.step !== Step.D3_WAKE) return [];
    const out: Effect[] = [
      { kind: 'note', text: D3_WAKE_NOTE },
      ...this.setStep(Step.D3_RUSH),
      // Idris opens the rush — the regulars are the news that matters
      { kind: 'spawn-customer', who: 'idris', x: 4, z: -4.6 },
    ];
    return out;
  }

  /** Rosa's week wake (doc 11 §2 beat 11 + §7 — the stabilized loop's
   *  open). Same law as the D3/D4 wakes: the wake beat first, chat
   *  second; the rush opens behind it. C1's stations speak the C1 pack's
   *  wake (the same mouth — doc 06 §C1's season in Rosa's voice). */
  rosaWeekWake(): Effect[] {
    if (this.step !== Step.WK_WAKE) return [];
    const station = this.seasonStation(this.day);
    const wake = station ? station.wake : C0_WEEK_WAKE[Math.min(7, Math.max(5, this.day)) as 5 | 6 | 7];
    return [
      { kind: 'note', text: wake },
      ...this.setStep(Step.WK_RUSH),
      // Idris opens the rush — the regulars open every rush (the day-3/4 law)
      { kind: 'spawn-customer', who: 'idris', x: 4, z: -4.6 },
    ];
  }

  /** A serve press at the cart during a morning rush. Starts a brew — no
   *  instant cups. Returns [] when nothing should happen (no order, or a
   *  brew already running: repeated input can never double-serve). */
  startBrew(): Effect[] {
    if (this.brewing) return [];
    if (this.step !== Step.D3_RUSH && this.step !== Step.D4_RUSH && this.step !== Step.WK_RUSH) return [];
    const order = this.rushQueue()[this.rushIndex];
    if (!order) return [];
    this.brewing = true;
    return [{ kind: 'brew-start' }];
  }

  /** The brew timer ran out (Game owns the clock). Pays, reacts, queues
   *  the next order — or opens the roam when done. */
  completeBrew(): Effect[] {
    if (!this.brewing) return [];
    this.brewing = false;
    const week = this.step === Step.WK_RUSH;
    const day4 = this.step === Step.D4_RUSH;
    const queue = this.rushQueue();
    const order = queue[this.rushIndex];
    if (!order) return [];
    this.rushIndex += 1;
    const out: Effect[] = [{ kind: 'serve-customer' }, ...this.earn(order.pay)];
    if (this.rushIndex >= queue.length) {
      if (week) {
        // the rush-done note is the station's own (doc 06 §C1/§C2 re-voice
        // the loop; the C0 week keeps its three-order quiet)
        const station = this.seasonStation(this.day);
        out.push({ kind: 'note', text: station ? station.rushDone : C0_WEEK_RUSH_DONE });
        out.push(...this.setStep(Step.WK_ROAM));
      } else if (day4) {
        out.push({ kind: 'note', text: D4_RUSH_DONE_NOTE });
        out.push(...this.setStep(Step.D4_MAP));
      } else {
        out.push({ kind: 'note', text: 'Four orders. The urn is warm, the stool fund is real, and the corner is starting to say so back.' });
        out.push(...this.setStep(Step.D3_KIDDOWN));
        out.push({ kind: 'kid-down' });
      }
    } else {
      // Day 3's first cup carries the remembered favor (Doc 33 §4.2) when
      // the kid was kept on Day 2 — one line, spoken, never stored. The
      // Day-4 morning rush keeps its own line: the favor lands once.
      const favor = !day4 && order.who === 'idris' && this.kidKept;
      out.push({ kind: 'note', text: favor ? IDRIS_D3_FAVOR_REACTION : order.reaction });
      out.push({ kind: 'spawn-customer', who: order.who === 'idris' ? 'rush' : 'rush', x: 4, z: -4.6 });
    }
    return out;
  }

  /** Talking to the kid at the stoop — he joins you. */
  kidJoins(): Effect[] {
    if (this.step !== Step.D3_KIDDOWN || this.kidDown) return [];
    this.kidDown = true;
    return [
      { kind: 'note', text: D3_KIDDOWN_NOTE },
      { kind: 'kid-follow' },
    ];
  }

  /** The kid reached the cart corner on foot (Game measures the distance). */
  kidReachesCorner(): Effect[] {
    if (this.step !== Step.D3_KIDDOWN || !this.kidDown || this.kidAtCorner) return [];
    this.kidAtCorner = true;
    const out: Effect[] = [
      { kind: 'note', text: D3_KID_ARRIVED_NOTE },
    ];
    if (this.stoolUp) {
      // a replay, or a stool bought early — skip the purchase, sit him down
      out.push(...this.setStep(Step.D3_POSTER));
      out.push({ kind: 'kid-sits' });
    } else {
      out.push(...this.setStep(Step.D3_STOOL));
    }
    return out;
  }

  /** The stool — Day 3's one purchase (awnings are Day 2's). Confirm-gated
   *  exactly like the awning; $10; repeat input can never double-spend
   *  because the step leaves D3_STOOL the moment it's bought. */
  stoolInteraction(): Effect[] {
    if (this.step !== Step.D3_STOOL) return [];
    if (!this.stoolConfirm) {
      this.stoolConfirm = true;
      return [{ kind: 'stool-offer' }];
    }
    this.stoolConfirm = false;
    return this.confirmStool();
  }

  confirmStool(): Effect[] {
    if (this.step !== Step.D3_STOOL) return [];
    this.stoolUp = true;
    return [
      { kind: 'stool-up' },
      { kind: 'kid-sits' }, // he's at the corner by now — the stool is his
      ...this.spend(10),
      ...this.setStep(Step.D3_POSTER),
    ];
  }

  seePoster(): Effect[] {
    if (this.step !== Step.D3_POSTER || this.posterSeen) return [];
    this.posterSeen = true;
    return [
      { kind: 'note', text: D3_POSTER_NOTE },
      ...this.setStep(Step.D3_CLIMB3),
    ];
  }

  // ---------------------------------------------------------------- Day 4 ----

  /** Rosa's morning-four news, at the cart: someone new by the terminal.
   *  The stranger appears the moment she says it — the terminal beat comes
   *  FIRST (you can't serve coffee and greet a newcomer with the same hands);
   *  the rush opens when the greeting lands. */
  rosaD4Wake(): Effect[] {
    if (this.step !== Step.D4_WAKE) return [];
    return [
      { kind: 'note', text: D4_WAKE_NOTE },
      { kind: 'stranger-arrive' },
      ...this.setStep(Step.D4_STRANGER),
    ];
  }

  /** The terminal beat — the Day-1 mirror. You make her a regular, on the
   *  house. Rosa's rule keeps the money honest: she pays YOU back. The
   *  stranger then walks your first walk to the cart on her own feet, and
   *  the rush opens behind you (Idris first, like every day). The follow-up
   *  lines are staged by Game while she walks (one note at a time). */
  greetStranger(): Effect[] {
    if (this.step !== Step.D4_STRANGER || this.strangerMet) return [];
    this.strangerMet = true;
    return [
      { kind: 'note', text: D4_STRANGER_GREET_NOTE },
      ...this.earn(2), // Rosa's rule: on the house for HER is not free
      { kind: 'stranger-to-cart' },
      ...this.setStep(Step.D4_RUSH),
      { kind: 'spawn-customer', who: 'idris', x: 4, z: -4.6 },
    ];
  }

  /** The Map changes hands — the one thing you own that isn't the cart.
   *  She leaves with it, walking your first walk in reverse (Game stages
   *  the send-off line once she's under way). The afternoon then opens:
   *  the kid flags the apron, and the block opens up (docs/30). */
  giveMap(): Effect[] {
    if (this.step !== Step.D4_MAP || !this.strangerAtCart || this.mapGiven) return [];
    this.mapGiven = true;
    return [
      { kind: 'note', text: D4_MAP_NOTE },
      // Beat 10's closing exchange (doc 11, the block layer, verbatim):
      // the stranger's name is Sam — the Hospitality Law performed in
      // week one, so its echoes in C5 and C6 are earned, not quoted
      { kind: 'note', text: SAM_STILL_DOING_LINE },
      { kind: 'note', text: SAM_LAW_LINE },
      { kind: 'stranger-departs' },
      ...this.setStep(Step.D4_LAUNDRY),
      { kind: 'persist' },
    ];
  }

  // -------------------------------------------- Day 4 afternoon (docs/30) ----

  /** Sal takes the apron — the first wash is on the house. The wash runs
   *  on the Game's clock (the drum spins until completeWash). */
  handApron(): Effect[] {
    if (this.step !== Step.D4_LAUNDRY || this.apronWashing) return [];
    this.apronWashing = true;
    return [
      { kind: 'note', text: D4_SAL_MEET_NOTE },
      { kind: 'wash-start' },
      ...this.setStep(Step.D4_PERMIT),
    ];
  }

  /** Chat at the counter while the washers run. */
  laundryChat(): Effect[] {
    if (this.step !== Step.D4_PERMIT) return [];
    return [{ kind: 'note', text: D4_SAL_CHAT_NOTE }];
  }

  /** The A-frame by the crosswalk. First press reads; the second press
   *  files — $10, confirm-gated exactly like the awning and the stool.
   *  A replay of a kept day never pays twice. */
  readPermit(): Effect[] {
    if (this.step !== Step.D4_PERMIT) return [];
    if (!this.permitConfirm) {
      this.permitConfirm = true;
      return [{ kind: 'note', text: D4_PERMIT_OFFER_NOTE }];
    }
    this.permitConfirm = false;
    if (this.permitFiled) {
      return [
        { kind: 'note', text: D4_PERMIT_ALREADY_NOTE },
        ...this.setStep(Step.D4_CLIMB4),
      ];
    }
    this.permitFiled = true;
    return [
      { kind: 'note', text: D4_PERMIT_FILED_NOTE },
      { kind: 'permit-filed' },
      ...this.spend(10),
      ...this.setStep(Step.D4_CLIMB4),
      { kind: 'persist' },
    ];
  }

  /** The wash timer ran out (Game owns the clock). The drum stops. */
  completeWash(): Effect[] {
    if (!this.apronWashing) return [];
    this.apronWashing = false;
    this.apronClean = true;
    return [{ kind: 'apron-clean' }];
  }

  serveIdris(): Effect[] {
    if (this.step !== Step.D2_IDRIS || !this.idrisArrived) return [];
    this.idrisServed = true;
    const out: Effect[] = [{ kind: 'idris-served' }, ...this.earn(this.awningUp ? 3 : 2)];
    out.push({
      kind: 'note',
      text: this.awningUp
        ? 'Mr. Idris: \u201CTold you I\u2019d be back. The usual.\u201D He leaves a dollar extra under the cup. Shade is service.'
        : 'Mr. Idris: \u201CTold you I\u2019d be back. The usual.\u201D It tastes the same as yesterday. That\u2019s the point.',
    });
    out.push({ kind: 'persist' });
    // The C0 pack's running theory (doc 11 §3 entry 2, recontextualized:
    // the shipped beat that carries the corner's first give-back is the
    // USUAL — "I come here, and you noticed" — standing in for doc 11's
    // Eddie ritual until the C1 wave lands the slice shop's morning). One
    // running theory per save: the entry id prefix is the latch.
    if (!this.hasDiaryEntryWithPrefix(C0_THEORY_ENTRY_ID_PREFIX)) {
      out.push({ kind: 'diary-prompt', pack: 'theory' });
    }
    out.push(...this.advanceDay2());
    return out;
  }

  /** Whether the diary carries an entry whose id starts with `prefix` —
   *  the pack's one-per-save latches (a replayed day, a resumed week). */
  hasDiaryEntryWithPrefix(prefix: string): boolean {
    return this.fieldDiary.some((e) => e.id.startsWith(prefix));
  }

  // ------------------------------------------------ the §7-step-7 machines ----

  /** R11 — the name the block learns (doc 11 §5): the pick-card name
   *  entry lands here; sanitize owns the shape. */
  applyIdentity(raw: unknown): void {
    this.playerIdentity = sanitizeIdentity(raw);
  }

  /** R10 — the ladder's one advance door: content authors the beat, the
   *  machine owns the law. A refused advance leaves the tier unchanged. */
  advanceFluencyTo(tier: FluencyTier): boolean {
    const res = fluencyAdvance(this.fluency, tier, { chapter: this.chapter.chapter, day: this.calendarDay });
    if (!res.ok) return false;
    this.fluency = res.state;
    return true;
  }

  /** R10 — the boot-time floor: a save below its chapter's floor heals
   *  forward (doc 13's rows are the truth the bytes must match). */
  healFluencyFloor(): void {
    this.fluency = fluencyAtFloor(this.fluency, this.chapter.chapter);
  }

  /** R9 — the sealed send, through the dispatch's own law. Only C5's
   *  scene key may pass; anything else is refused and nothing moves. */
  sendPostcardFromC5(sceneKey: string): boolean {
    if (this.sentPostcardDay !== null) return false;
    const res = markSent(sceneKey, this.calendarDay, false);
    if (!res.ok || res.action !== 'sent') return false;
    this.sentPostcardDay = res.record.day;
    return true;
  }

  /** R12 — the resource note's once-latch, machine side: returns the
   *  note's text when this firing is the first of the three triggers,
   *  null otherwise (and the latch spends only when the note is offered). */
  resourceNoteFor(sceneId: string): string | null {
    if (!shouldOfferResourceNote(this.resourceNoteOffered, sceneId)) return null;
    this.resourceNoteOffered = true;
    return RESOURCE_NOTE_TEXT;
  }

  rosaTask(): { effects: Effect[]; chat?: string } {
    if (this.step === Step.D2_TASK) {
      return {
        effects: [
          { kind: 'note', text: 'Rosa: \u201CThe kid in the gold window watches your corner all day. Take him a regular? Milk, two sugars \u2014 you know the words now.\u201D' },
          { kind: 'cup-given' },
          ...this.setStep(Step.D2_DELIVER),
        ],
      };
    }
    const { text, nextChatIndex } = rosaChatLineOf(this);
    this.rosaChatI = nextChatIndex;
    return { effects: [{ kind: 'note', text }], chat: text };
  }

  deliverToKid(): Effect[] {
    if (this.step !== Step.D2_DELIVER) return [];
    this.kidKept = true;
    return [
      { kind: 'kid-delivered' },
      { kind: 'cup-taken-back' },
      ...this.earn(3),
      { kind: 'note', text: 'The kid: \u201CYou\u2019re the cart. I watch the cart.\u201D Exact change, and one fact about the trains. The kid pays in both.' },
      ...this.advanceDay2(),
    ];
  }

  rail(): Effect[] {
    if (this.lingerStage <= 1) {
      this.lingerStage = 2;
      return [
        { kind: 'rosa-window-warm' },
        { kind: 'note', text: 'Across the street, Rosa\u2019s window warms. \u201CGood night, coffee,\u201D she says \u2014 to you or the city, hard to tell.' },
      ];
    }
    // the season compressions' second beat (the C1 pack's two-press
    // linger): the montage showed on the last press; THIS press rolls the
    // counters to the next station through the next-day door (the 1:1 law
    // moves whole — story day, sim day and calendar day together).
    if (this.pendingCompressionTo !== null) {
      const to = this.pendingCompressionTo;
      this.pendingCompressionTo = null;
      return [{ kind: 'next-day', to }];
    }
    if (this.day === 7) return this.seasonCut();
    if (this.isC1) {
      const rail = c1RailFor(this.day);
      if (rail === 'cut') return this.c1SeasonCut();
      if (rail && typeof rail === 'object') return this.c1Compression(rail.compress);
    }
    if (this.isC2) {
      const rail = c2RailFor(this.day);
      if (rail === 'cut') return this.c2SeasonCut();
      if (rail && typeof rail === 'object') return this.c2Compression(rail.compress);
    }
    return [{ kind: 'next-day' }];
  }

  /** The season cut (doc 11 §7, the C0→C1 boundary, Sept 15→16): the
   *  first interstitial, composed from the week's OWN diary — the
   *  montage is his hand, not a canon list. Plays once per save (the
   *  latch is the cut's diary entry — the block layer's law). **The
   *  boundary itself: the chapter consumes the calendar day through the
   *  machine's own door** (advanceChapter — the parallel days-5-7 line's
   *  judgment, adopted at the integration): the cut IS the authored
   *  trigger — the beat is playing as this code runs — and the window +
   *  minimum-days laws still get their say (day 8 ≥ C1's window start;
   *  C0 lived its seven days).
   *
   *  The roll (the C1 wave's law — §7 step 8 brought the days it opens):
   *  the cut's notes play on this press and HOLD; the next linger press
   *  finds the latch set and rolls into C1's first station (Monday, Sept
   *  16 — the real shift, doc 06 §C1 event 1) — unless this is a replayed
   *  kept Day 7, which gets the wall and holds, never a second cut and
   *  never a roll out of a replay. */
  seasonCut(): Effect[] {
    if (this.c0Has(C0_CUT_ID)) {
      // the cut has played (this linger's next press, or a replayed kept
      // day from a reload): the wall answers; the FIRST play rolls on
      const wall: Effect[] = [{ kind: 'note', text: C0_CUT_WALL }];
      if (this.replayDay) return wall;
      return [...wall, { kind: 'next-day', to: C1_FIRST_DAY }];
    }
    const out: Effect[] = [];
    for (const line of seasonCutMontage(this.fieldDiary)) {
      out.push({ kind: 'note', text: line });
    }
    out.push({ kind: 'note', text: `The city, the next morning: \u201C${C0_CUT_CITY_LINE}\u201D` });
    out.push({ kind: 'note', text: `Eddie: \u201C${C0_CUT_EDDIE_LINE}\u201D` });
    out.push({ kind: 'note', text: C0_CUT_WALL });
    // the montage, in his hand — dated the cut's morning (day 8, Sept 16)
    this.c0Write(out, cutEntry(this.calendarDay + 1));
    // C1's window opens — the machine's own door, the boundary date
    const adv = advanceChapter(this.chapter, 'C1', {
      day: this.calendarDay + 1,
      triggerHeld: true, // the cut itself is the beat (doc 11 §7's interstitial)
    });
    if (adv.ok) this.chapter = adv.state;
    else this.chapter = touchDay(this.chapter, this.calendarDay + 1);
    out.push({ kind: 'persist' }); // the cut's latch rides the save (the block layer's law)
    return out;
  }

  /** The C1 season compression (narrative/14 R4's named transition, the
   *  C1 pack's own days-between): the linger plays the compression's two
   *  lines and HOLDS; the next press rolls the counters `from → to`
   *  through the next-day door. The days between stations are CONSUMED,
   *  never played (the pack's station law) — no diary latch: the
   *  montage is composed from the diary, and a quit mid-linger replays
   *  it harmlessly because only the roll moves a date. The marked
   *  compression is the autumn→winter season cut (crossedSeasonCut
   *  proves it; the city-diary whisper rides the compression's line —
   *  the nor'easter's "noted once, the morning after" is its 54→95
   *  city line). */
  c1Compression(to: number): Effect[] {
    const comp = c1CompressionFrom(this.day);
    if (!comp || comp.to !== to) return [{ kind: 'next-day', to }];
    this.pendingCompressionTo = to;
    return [
      { kind: 'note', text: comp.intro },
      { kind: 'note', text: `The city: \u201C${comp.city}\u201D` },
      { kind: 'note', text: 'One more press, and the days pass.' },
    ];
  }

  /** The C1→C2 season cut (doc 06 §C1 handoff, New Year's Day): the
   *  season's montage in his hand, the notice staged back into its
   *  frame, the over-tag entry dated Jan 1, Y2 — and the chapter through
   *  advanceChapter's own door at C2's window start (Jan 6, Y2; the cut
   *  consumes Dec 24 → Jan 6, the window law keeping the holidays C1's).
   *  Plays once per save (the latch is the entry); a replayed kept
   *  Dec 23 gets the wall. C2's content is the next wave's — the wall
   *  holds. */
  c1SeasonCut(): Effect[] {
    if (this.c0Has(C1_CUT_ID)) {
      // the cut has played: the wall answers — and the C2 wave's own law
      // (§7 step 9 brought the days the cut opens): the FIRST press after
      // the latch rolls into C2's first station (Tuesday, Jan 6, Y2 — the
      // paper year, doc 06 §C2's period start) — unless this is a replayed
      // kept Dec 23, which gets the wall and holds, never a roll out of a
      // replay.
      const wall: Effect[] = [{ kind: 'note', text: C1_CUT_WALL }];
      if (this.replayDay) return wall;
      return [...wall, { kind: 'next-day', to: C2_FIRST_DAY }];
    }
    const out: Effect[] = [];
    for (const line of seasonCutMontage(this.fieldDiary)) {
      out.push({ kind: 'note', text: line });
    }
    out.push({ kind: 'note', text: C1_CUT_NOTICE_STAGE });
    out.push({ kind: 'note', text: C1_CUT_WALL });
    this.c0Write(out, c1CutEntry());
    // C2's window opens — the machine's own door, the window-start law
    const adv = advanceChapter(this.chapter, 'C2', {
      day: C1_CUT_ADVANCE_DAY,
      triggerHeld: true, // the cut itself is the beat (doc 06 §C1's handoff)
    });
    if (adv.ok) this.chapter = adv.state;
    else this.chapter = touchDay(this.chapter, C1_CUT_ADVANCE_DAY);
    out.push({ kind: 'persist' });
    return out;
  }

  // ------------------------------------------ the C1 season's beats (narrative/14 §7 step 8) ----
  // The season's interaction ink: each beat rides a SHIPPED interaction
  // (the c0pack's recontextualization law — retained, not rewritten),
  // latches by its diary entry (the block layer's law — a replayed day
  // replays nothing), and writes through the same two doors (the field
  // diary, the consequence ledger). No new save shape.

  /** Doc 06 §C1 event 1 — the ladder rung, named out loud at the shop
   *  (the eddie interaction, day 8). */
  c1Ladder(): Effect[] {
    if (this.day !== 8 || this.c0Has(C1_IDS.ladder)) return [];
    const out: Effect[] = [
      { kind: 'note', text: `Eddie: \u201C${C1_LADDER_LINE}\u201D` },
      { kind: 'note', text: 'He goes back to the dough like the sentence was a receipt. The keys stay on his belt. Rung one is real.' },
    ];
    this.c0Write(out, ladderEntry(this.day));
    return out;
  }

  /** Doc 06 §C1 starting circumstances + event 8 — the framed notice
   *  (the lease_notice interaction). Wave 1: day 8, the framing. Wave 2:
   *  day 106, the notice without the walk-back. Each is its own latch. */
  c1Notice(): Effect[] {
    const wave = this.day === 8 ? 1 : (this.day === 106 ? 2 : null);
    if (wave === null) return [];
    const id = wave === 1 ? C1_IDS.notice1 : C1_IDS.notice2;
    if (this.c0Has(id)) return [];
    const out: Effect[] = [{ kind: 'note', text: wave === 1 ? C1_NOTICE_FRAME_LINE : C1_NOTICE_SECOND_LINE }];
    if (wave === 1) {
      out.push({ kind: 'note', text: 'The glass over the paper catches the morning. A renewal notice, framed like a diploma. Photographed it when he wasn\u2019t looking.' });
    } else {
      out.push({ kind: 'note', text: `Eddie looks at the frame a long time. \u201C${C1_FLOUR_LINE}\u201D` });
      out.push({ kind: 'note', text: 'The flour line lands like a verdict and a job offer in the same breath.' });
    }
    this.c0Write(out, noticeEvidenceEntry(this.day, wave));
    return out;
  }

  /** Whether the day's notice beat has fired (the N1a trigger reads
   *  this — the pick opens after the flour line has landed). */
  get c1NoticeSaid(): boolean {
    return this.c0Has(C1_IDS.notice2);
  }

  /** Doc 06 §C1 event 6 — the petition slip replaces the lost-cat slip
   *  (the flyer board, day 29). */
  c1Petition(): Effect[] {
    if (this.day !== 29 || this.c0Has(C1_IDS.petition)) return [];
    const out: Effect[] = [{ kind: 'note', text: C1_PETITION_NOTE }];
    this.c0Write(out, petitionEntry(this.day));
    return out;
  }

  /** Doc 06 §C1 event 2 — June and the DOB wall (the plaza bench, day
   *  29): the build-out's wall, Priya's knowledge (the phrase verbatim),
   *  and the card. */
  c1June(): Effect[] {
    if (this.day !== 29 || this.c0Has(C1_IDS.june)) return [];
    const out: Effect[] = [
      { kind: 'note', text: C1_JUNE_WALL_NOTE },
      { kind: 'note', text: `Leo: \u201C${C1_PRIYA_ROUTE_LINE}\u201D` },
      { kind: 'note', text: C1_JUNE_REPLY_LINE },
    ];
    this.c0Write(out, juneEntry(this.day));
    return out;
  }

  /** F6 — Kev's delivery lanyard (the shop counter, day 29; the trigger
   *  recontextualized to the weekend-counter seam, noted in the pack). */
  c1KevLanyard(): Effect[] {
    if (this.day !== 29 || this.c0Has(C1_FRAGMENT_IDS.f6)) return [];
    const out: Effect[] = [{ kind: 'note', text: C1_KEV_LANYARD_NOTE }];
    this.c0Write(out, f6Entry(this.day));
    out.push({ kind: 'note', text: 'A lanyard. Shrink-wrap. A scanner gun\u2019s beep \u2014 three things I have never touched, arriving anyway. It passes. It always passes. I keep the entry anyway.' });
    return out;
  }

  /** Doc 06 §C1 event 3 — Yoli's freezer drive (the garden, day 30). */
  c1Yoli(): Effect[] {
    if (this.day !== 30 || this.c0Has(C1_IDS.yoli)) return [];
    const out: Effect[] = [
      { kind: 'note', text: C1_YOLI_FREEZER_NOTE },
      { kind: 'note', text: 'Twelve trays taped, three coolers loaded, the garden\u2019s freezer honest for another week. Her handshake is a receipt. I kind of love it.' },
    ];
    this.c0Write(out, yoliEntry(this.day));
    return out;
  }

  /** F1 — the dryer bank (the laundromat seam, day 30's end of day):
   *  three short RECALL entries, once, told to no one (doc 06 §C1 event
   *  4). The C0 wobble's own proximity law, keyed to F1's canon day AND
   *  the loop's afternoon steps (the machines talk after the rush). */
  c1F1AtLaundry(x: number, z: number, laundryX: number, laundryZ: number): Effect[] {
    if (this.day !== 30) return [];
    if (this.step !== Step.WK_ROAM && this.step !== Step.WK_CLIMB) return [];
    if (Math.hypot(x - laundryX, z - laundryZ) >= 4.5) return [];
    if (this.c0Has(`${C1_FRAGMENT_IDS.f1}-1`)) return [];
    const out: Effect[] = [];
    for (const e of f1Entries(this.day)) this.c0Write(out, e);
    return out;
  }

  /** Doc 06 §C1 event 5, the blackout table (the eddie interaction,
   *  day 52) — and behind it, N1b: the warming station needs a role
   *  (the register's node, the pick overlay's seam). */
  c1BlackoutTable(): Effect[] {
    if (this.day !== 52) return [];
    if (!this.c0Has(C1_IDS.blackoutTable)) {
      const out: Effect[] = [{ kind: 'note', text: C1_BLACKOUT_TABLE_NOTE }];
      this.c0Write(out, blackoutTableEntry(this.day));
      out.push({ kind: 'note', text: 'Eddie, from the oven, not turning around: \u201CYou\u2019re gonna have to pick a lane, kid. The room can\u2019t have three of you.\u201D' });
      return out;
    }
    // the table has been said: the pick opens (once — the pick's own ink
    // is the latch; the overlay re-opens only until the pick lands)
    if (!this.c1PickHeld('N1b')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N1b' }];
    }
    return [];
  }

  /** Doc 06 §C1 event 7 + conversations — Craig's visit, the cigar box,
   *  Yoli's 1994 (day 95, three interactions). */
  c1Craig(): Effect[] {
    if (this.day !== 95 || this.c0Has(C1_IDS.craig)) return [];
    const out: Effect[] = C1_CRAIG_SCENE.map((text) => ({ kind: 'note', text }) as Effect);
    this.c0Write(out, craigEntry(this.day));
    this.c0Write(out, questionCraigEntry(this.day));
    out.push({ kind: 'note', text: 'The counter where he stood needs a wipe. It usually does, after.' });
    return out;
  }

  c1CigarBox(): Effect[] {
    if (this.day !== 95 || this.c0Has(C1_IDS.cigarBox)) return [];
    const out: Effect[] = [{ kind: 'note', text: C1_CIGAR_BOX_SCENE }];
    this.c0Write(out, cigarBoxEntry(this.day));
    return out;
  }

  c1Yoli1994(): Effect[] {
    if (this.day !== 95 || this.c0Has(C1_IDS.qFence)) return [];
    const out: Effect[] = [
      { kind: 'note', text: C1_YOLI_1994_NOTE },
      { kind: 'note', text: 'She goes back to the petitions like she didn\u2019t just hand me thirty years of weather in one sentence.' },
    ];
    this.c0Write(out, questionFenceEntry(this.day));
    return out;
  }

  /** Whether the pick has landed (the pick's own ink is the latch — the
   *  entry rides `node` and the c1- prefix; a refused pick writes
   *  nothing and the overlay re-opens). */
  private c1PickHeld(nodeId: 'N1a' | 'N1b'): boolean {
    return this.fieldDiary.some((e) => e.node === nodeId && e.id.startsWith(`c1-${nodeId.toLowerCase()}-`));
  }

  /** N1a — the promise (day 106, after the flour line): the pick opens
   *  from the eddie interaction. The overlay carries the register's
   *  options; applyChoicePick does the writes. */
  c1PromisePick(): Effect[] {
    if (this.day !== 106) return [];
    if (!this.c1NoticeSaid) return [];
    if (this.c1PickHeld('N1a')) return [];
    return [{ kind: 'diary-prompt', pack: 'choice', node: 'N1a' }];
  }

  /** The pick's landing: resolve through the register's own machine,
   *  write the ledger (the cascade's coin), write the ink, hand the
   *  flags to the world store, persist. A refused pick changes nothing.
   *  C2's nodes ride the same seam (`held` is the world's flag store —
   *  N2's Form C expires without Yoli's session, doc 10 §4); the toast
   *  is a local pick (ink and two seconds, no ledger). */
  applyChoicePick(
    nodeId: 'N1a' | 'N1b' | 'N2' | 'N2b' | 'TOAST',
    optionId: string,
    held?: ReadonlySet<string>,
  ): Effect[] {
    const out: Effect[] = [];
    if (nodeId === 'N2' || nodeId === 'N2b' || nodeId === 'TOAST') {
      const apply = applyC2Pick(nodeId, optionId, this.calendarDay, held);
      if (!apply.ok) return [];
      if (apply.note) out.push({ kind: 'note', text: apply.note });
      for (const draft of apply.ledger) {
        this.logLedgerEntry(draft);
      }
      if (apply.diary) this.c0Write(out, apply.diary);
      // the anniversary's toast night writes K2 — the chapter's bigger
      // contradiction, seeded for its C5 strike (doc 06 §C2 long-term
      // consequences; the player can feel it)
      if (nodeId === 'TOAST' && !this.c0Has(C2_IDS.k2)) {
        this.c0Write(out, k2Entry(this.calendarDay));
      }
      if (apply.flags.length > 0) out.push({ kind: 'story-flags', flags: apply.flags });
      out.push({ kind: 'persist' });
      return out;
    }
    const apply = applyC1Pick(nodeId, optionId, this.calendarDay);
    if (!apply.ok) return [];
    if (apply.note) out.push({ kind: 'note', text: apply.note });
    for (const draft of apply.ledger) {
      this.logLedgerEntry(draft);
    }
    if (apply.diary) this.c0Write(out, apply.diary);
    out.push({ kind: 'story-flags', flags: apply.flags });
    out.push({ kind: 'persist' });
    return out;
  }

  // ------------------------------------------ the C2 season's beats (narrative/14 §7 step 9) ----
  // The chapter's interaction ink: each beat rides a SHIPPED interaction
  // (the c0pack's recontextualization law — retained, not rewritten),
  // latches by its diary entry (the block layer's law), and writes
  // through the same two doors (the field diary, the consequence ledger).
  // The chapter ALSO introduces the contradiction ledger's first strikes
  // (K1 the cart, K6 the surveyor's GUESS — doc 03 §5, doc 15): the
  // strikethrough mechanic taught early, before K2 is even written.

  /** The diary's strike seam: append a correction to an existing entry
   *  (the append-only law — the body's bytes never move; the offending
   *  line gains its strikethrough and a marginal note). Silent when the
   *  target is missing (a save that somehow skipped the C0 entry keeps
   *  walking — correctEntry never throws). */
  private applyStrike(target: string, correction: Correction): void {
    const res = correctEntry(this.fieldDiary, target, correction);
    if (res.ok) this.fieldDiary = res.entries;
  }

  /** Whether a C2 pick has landed (the pick's own ink is the latch —
   *  the entry rides `node` and the c2- prefix; the toast's entry is
   *  `c2-toast-*`; a refused pick writes nothing and the overlay
   *  re-opens). */
  private c2PickHeld(nodeId: 'N2' | 'N2b' | 'TOAST'): boolean {
    if (nodeId === 'TOAST') {
      return this.fieldDiary.some((e) => e.id.startsWith('c2-toast-'));
    }
    return this.fieldDiary.some((e) => e.node === nodeId && e.id.startsWith(`c2-${nodeId.toLowerCase()}-`));
  }

  /** The C2 season compression (R4's named transition, the C2 pack's
   *  own days-between): the linger plays the compression's two lines and
   *  HOLDS; the next press rolls the counters `from → to` through the
   *  next-day door. The days between stations are CONSUMED, never played
   *  (the station law). The marked compression is the winter→spring
   *  season cut (crossedSeasonCut proves it). */
  c2Compression(to: number): Effect[] {
    const comp = c2CompressionFrom(this.day);
    if (!comp || comp.to !== to) return [{ kind: 'next-day', to }];
    this.pendingCompressionTo = to;
    return [
      { kind: 'note', text: comp.intro },
      { kind: 'note', text: `The city: \u201C${comp.city}\u201D` },
      { kind: 'note', text: 'One more press, and the days pass.' },
    ];
  }

  /** The C2→C3 season cut (doc 06 §C2 handoff): the season's montage in
   *  his hand, the handoff staged (July heat, the Fourth, Eddie's hand
   *  on the counter), the cut's entry dated Jul 1, Y2 — and the chapter
   *  through advanceChapter's own door at C3's window start. Plays once
   *  per save (the latch is the entry); a replayed kept Jun 30 gets the
   *  wall. C3's content is the next wave's — the wall holds (the roll
   *  into C3's first station is the C3 wave's law, exactly as this wave
   *  brought the C1 cut's roll). */
  c2SeasonCut(): Effect[] {
    if (this.c0Has(C2_CUT_ID)) return [{ kind: 'note', text: C2_CUT_WALL }];
    const out: Effect[] = [];
    for (const line of seasonCutMontage(this.fieldDiary)) {
      out.push({ kind: 'note', text: line });
    }
    out.push({ kind: 'note', text: C2_CUT_STAGE });
    out.push({ kind: 'note', text: C2_CUT_WALL });
    this.c0Write(out, c2CutEntry());
    // C3's window opens — the machine's own door, the window-start law
    const adv = advanceChapter(this.chapter, 'C3', {
      day: C2_CUT_DAY,
      triggerHeld: true, // the cut itself is the beat (doc 06 §C2's handoff)
    });
    if (adv.ok) this.chapter = adv.state;
    else this.chapter = touchDay(this.chapter, C2_CUT_DAY);
    out.push({ kind: 'persist' });
    return out;
  }

  /** Doc 06 §C2 starting circumstances — the formal ask (the
   *  lease-notice interaction, day 120). */
  c2Notice(): Effect[] {
    if (this.day !== 120 || this.c0Has(C2_IDS.notice)) return [];
    const out: Effect[] = [{ kind: 'note', text: C2_NOTICE_ASK_NOTE }];
    this.c0Write(out, noticeEntry(this.day));
    return out;
  }

  /** Doc 06 §C2 starting circumstances + diary/map developments — the
   *  assemblage map reaches the mailboxes (the board, day 120); the
   *  render poster transcribed with a GUESS tag; and the K6 strike (doc
   *  15: the surveyor's GUESS, struck C2 — sunlight and square feet). */
  c2BoardMap(): Effect[] {
    if (this.day !== 120 || this.c0Has(C2_IDS.map)) return [];
    const out: Effect[] = [{ kind: 'note', text: C2_MAP_NOTE }];
    this.c0Write(out, mapEntry(this.day));
    this.applyStrike(C2_STRIKE_TARGETS.k6, c2K6Correction(this.calendarDay));
    out.push({ kind: 'note', text: `The notebook strikes a line while nobody's looking \u2014 \u201C${C2_K6_STRIKE}\u201D now has a margin: \u201C${C2_K6_MARGIN}\u201D` });
    return out;
  }

  /** Doc 06 §C2 event 1 — the Compact's founding meeting at the garden
   *  (the garden interaction, day 124): the pledge, the sign-in sheet
   *  (doc 08 §3's EVIDENCE), and the K1 strike — the cart truth, the
   *  ledger's first strikethrough, earned at the sheet (doc 03 §5.1's
   *  sample margin verbatim). */
  c2Compact(): Effect[] {
    if (this.day !== 124 || this.c0Has(C2_IDS.compact)) return [];
    const out: Effect[] = C2_COMPACT_SCENE.map((text) => ({ kind: 'note', text }) as Effect);
    this.c0Write(out, compactEntry(this.day));
    this.applyStrike(C2_STRIKE_TARGETS.k1, c2K1Correction(this.calendarDay));
    out.push({ kind: 'note', text: `The notebook strikes its first line \u2014 the day-one sentence loses a word and keeps a margin: \u201C${C2_K1_MARGIN}\u201D` });
    return out;
  }

  /** Doc 06 §C2 event 2 — Marisol's coffee (the diner booth, day 129):
   *  the verbatim line, the card, no ask. */
  c2Coffee(): Effect[] {
    if (this.day !== 129 || this.c0Has(C2_IDS.coffee)) return [];
    const out: Effect[] = [
      { kind: 'note', text: `Marisol, sliding the cup across before you've ordered: \u201C${C2_MARISOL_LINE}\u201D` },
    ];
    this.c0Write(out, coffeeEntry(this.day));
    return out;
  }

  /** Doc 10 §4's window — Yoli's C2 strategy session (the garden, days
   *  146/147, two evenings): the schedule that N2's Form C would trade.
   *  The flag sets ONCE, on either evening; each evening is its own
   *  latch. Miss both and the window closes — her trust path's best
   *  offer expires, the doc's own law. */
  c2Session(): Effect[] {
    if (this.day !== 146 && this.day !== 147) return [];
    const out: Effect[] = [];
    if (this.day === 146 && !this.c0Has(C2_IDS.session1)) {
      out.push({ kind: 'note', text: C2_SESSION_ONE_NOTE });
      this.c0Write(out, sessionOneEntry(this.day));
    }
    if (this.day === 147 && !this.c0Has(C2_IDS.session2)) {
      out.push({ kind: 'note', text: C2_SESSION_TWO_NOTE });
      this.c0Write(out, sessionTwoEntry(this.day));
    }
    if (out.length > 0) {
      out.push({ kind: 'story-flags', flags: [C2_SESSION_FLAG] });
    }
    return out;
  }

  /** F3 — the M121 at dusk (doc 06 §C2 diary developments): riding the
   *  loop home after the second evening, the wobble style, once, told to
   *  no one. Keyed to day 147's climb step (the dusk IS the climb). */
  c2F3AtDusk(): Effect[] {
    if (this.day !== 147) return [];
    if (this.step !== Step.WK_CLIMB) return [];
    if (this.c0Has(C2_FRAGMENT_IDS.f3)) return [];
    const out: Effect[] = [];
    this.c0Write(out, f3Entry(this.day));
    out.push({ kind: 'note', text: 'It passes. It always passes. The entry stays anyway \u2014 the wobble\u2019s own arithmetic.' });
    return out;
  }

  /** Doc 06 §C2 event 3 — Priya's intel, traded for a favor (the priya
   *  interaction, day 160): the three doc-verbatim facts, and the debt
   *  that rides the ledger open (a promise, no due — the favor's name
   *  comes later). */
  c2Priya(): Effect[] {
    if (this.day !== 160 || this.c0Has(C2_IDS.priya)) return [];
    const out: Effect[] = [
      { kind: 'note', text: C2_PRIYA_INTEL_NOTE },
      { kind: 'note', text: C2_PRIYA_FAVOR_NOTE },
    ];
    this.c0Write(out, priyaEntry(this.day));
    // the debt rides the ledger as a recorded act (kind 'choice' — a
    // promise without a due is schema-invalid, and the favor's name
    // comes later; the ledger keeps the owing visible either way)
    this.logLedgerEntry({
      id: 'led-c2-priya-favor',
      kind: 'choice',
      date: dateOfCalendarDay(this.calendarDay),
      refs: [...C2_PRIYA_PROMPT_DEBT_REFS],
      weight: 1,
      visibility: 'secret',
    });
    return out;
  }

  /** Doc 06 §C2 events 4+5 — the squeeze (the diner booth, day 174):
   *  Craig's private offer, and behind it N2 — the break needs a form
   *  (the register's node, the pick overlay's seam; Form C offered only
   *  when Yoli's session was attended, doc 10 §4). */
  c2Squeeze(): Effect[] {
    if (this.day !== 174) return [];
    if (!this.c0Has(C2_IDS.squeeze)) {
      const out: Effect[] = [{ kind: 'note', text: C2_CRAIG_OFFER_NOTE }];
      this.c0Write(out, squeezeEntry(this.day));
      out.push({ kind: 'note', text: 'The booth goes quiet the way a scale goes still. Four shapes, one signature, and the pen is in my hand either way.' });
      return out;
    }
    if (!this.c2PickHeld('N2')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N2' }];
    }
    return [];
  }

  /** Doc 06 §C2 short-term consequences + important conversations — the
   *  ribbon and Eddie's question (the eddie interaction, day 188). */
  c2Ribbon(): Effect[] {
    if (this.day !== 188 || this.c0Has(C2_IDS.ribbon)) return [];
    const out: Effect[] = [
      { kind: 'note', text: C2_EDDIE_RENEWAL_NOTE },
      { kind: 'note', text: C2_EDDIE_RENEWAL_AFTER },
    ];
    this.c0Write(out, ribbonEntry(this.day));
    return out;
  }

  /** Doc 06 §C2 event 8 — Kev's appeal denied (the board, day 188; an
   *  independent event — the spine's own floor). */
  c2Kev(): Effect[] {
    if (this.day !== 188 || this.c0Has(C2_IDS.kev)) return [];
    const out: Effect[] = [{ kind: 'note', text: C2_KEV_APPEAL_NOTE }];
    this.c0Write(out, kevEntry(this.day));
    return out;
  }

  /** Doc 06 §C2 event 9 — the rent wave (the newsbox, day 230): the room
   *  re-rated, paid in silence; the diary records generosity, the ledger
   *  records silence purchased (the Silent class, authored outside the
   *  register — doc 10 §1). */
  c2RentWave(): Effect[] {
    if (this.day !== 230 || this.c0Has(C2_IDS.rent)) return [];
    const out: Effect[] = [{ kind: 'note', text: C2_RENT_WAVE_NOTE }];
    this.c0Write(out, rentEntry(this.day));
    this.logLedgerEntry({
      id: C2_RENT_WAVE_LEDGER_ID,
      kind: 'omission',
      date: dateOfCalendarDay(this.calendarDay),
      refs: [...C2_RENT_WAVE_SILENCE_REFS],
      weight: 1,
      visibility: 'secret',
    });
    return out;
  }

  /** Doc 06 §C2 event 6 — the Oktays' leaving (the garden-gate
   *  interaction, day 243): the boxes, the NO SALE, the photograph —
   *  and behind it N2b (the Oktay moment, the register's node). The
   *  photograph's ink reads the sheet honestly: the founding was
   *  missable, so the sheet may or may not carry the corner's name, and
   *  the withdrawal line tells the truth either way. */
  c2Oktays(): Effect[] {
    if (this.day !== 243) return [];
    if (!this.c0Has(C2_IDS.oktays)) {
      const out: Effect[] = C2_OKTAYS_SCENE.map((text) => ({ kind: 'note', text }) as Effect);
      // the photograph's honest variant: the founding was missable
      if (this.c0Has(C2_IDS.compact)) {
        out.push({ kind: 'note', text: 'The sheet from the garden is in the photographs now \u2014 eleven lines, and the withdrawal line where the corner\u2019s name sits in my own handwriting. Deniz doesn\u2019t zoom. She doesn\u2019t have to.' });
      } else {
        out.push({ kind: 'note', text: 'The sheet from the garden is in the photographs now \u2014 eleven lines, and the withdrawal line\u2019s blank where a name might have been. Deniz doesn\u2019t zoom. She doesn\u2019t have to.' });
      }
      out.push({ kind: 'note', text: C2_OKTAYS_MEHMET_NOTE });
      this.c0Write(out, oktaysEntry(this.day));
      return out;
    }
    if (!this.c2PickHeld('N2b')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N2b' }];
    }
    return [];
  }

  /** Doc 06 §C2 event 7 — Rosa's twenty-five (the rosa interaction, day
   *  269): the verbatim toast line, Eleanor's pointer, the QUESTION in
   *  the tray — and behind it the toast itself (the local pick; doc 06
   *  §C2 major decisions; one of the two makes Rosa stop smiling for
   *  exactly two seconds). */
  c2Anniversary(): Effect[] {
    if (this.day !== 269) return [];
    if (!this.c0Has(C2_IDS.anniversary)) {
      const out: Effect[] = [
        { kind: 'note', text: `Rosa, glass up, the long table holding its breath: \u201C${C2_ROSA_ANNIVERSARY_LINE}\u201D` },
        { kind: 'note', text: `She finds me across the table — across, not beside, the seating chart's own verdict \u2014 and softens by a degree: \u201C${C2_ROSA_ELEANOR_LINE}\u201D` },
      ];
      this.c0Write(out, anniversaryEntry(this.day));
      this.c0Write(out, questionDorisEntry(this.day));
      return out;
    }
    if (!this.c2PickHeld('TOAST')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'TOAST' }];
    }
    return [];
  }

  /** Doc 06 §C2 handoff — June's lease, the same paperstock (the june
   *  interaction, day 295; her spot exists for the day and fades when
   *  the ink has landed). */
  c2LeaseJune(): Effect[] {
    if (this.day !== 295 || this.c0Has(C2_IDS.lease)) return [];
    const out: Effect[] = [{ kind: 'note', text: C2_JUNE_LEASE_NOTE }];
    this.c0Write(out, leaseEntry(this.day));
    return out;
  }

  dismissPostcard(): Effect[] {
    this.lingerStage = 1;
    // The C0 pack's first question (doc 11 §3 entry 4 — Day 3 night,
    // "the player picks one of three authored curiosities ... or writes
    // their own"). The shipped beat that IS Day 3 night is the fire-escape
    // linger — "Stay a while" is the moment the notebook opens. One
    // question per save; Days 2/4 and the replay path never ask.
    if (this.day === 3 && !this.hasDiaryEntryWithPrefix(C0_QUESTION_ENTRY_ID_PREFIX)
      && !this.hasDiaryEntryWithPrefix(C0_QUESTION_FREE_ID)) {
      return [
        { kind: 'note', text: 'Stay a while. The window is in no rush.' },
        { kind: 'diary-prompt', pack: 'question' },
      ];
    }
    return [{ kind: 'note', text: 'Stay a while. The window is in no rush.' }];
  }

  snapshotForSave(): SaveData | null {
    if (this.day < 2) return null;
    return {
      day: this.day,
      day_complete: this.dayComplete,
      replay: this.replayDay,
      cart_name: this.cartName,
      starter: this.starterId,
      money: this.money,
      awning: this.awningUp,
      kid_kept: this.kidKept,
      idris_served: this.idrisServed,
      lunch_served: this.lunchServed,
      day_start_money: this.dayStartMoney,
      stool: this.stoolUp,
      map_given: this.mapGiven,
      permit: this.permitFiled,
      shelf_buys: this.shelfBuys,
      dog_buys: this.dogBuys,
      trims: this.trims,
      washes: this.washes,
      hoop_makes: this.hoopMakes,
      // the Map's notebook pages (optional v1-safe fields — an old save
      // parses unchanged; see Save.ts migration note)
      map_notes: [...this.mapNotes],
      map_slang: [...this.mapSlang],
      map_places: [...this.visitedPlaces],
      map_priya_lines: this.priyaLinesCopied,
      // the diary watermark — present only once a note has been said, so
      // a pre-diary save parses byte-identically (the roam/starter law)
      ...(Object.keys(this.diaryNoted).length > 0
        ? { diary_noted: { ...this.diaryNoted } }
        : {}),
      // the in-game calendar + the field diary (narrative/14 R3+R4) —
      // optional v1-safe fields: an old save parses unchanged (see the
      // migration note in Save.ts), a new save writes both
      calendar_day: this.calendarDay,
      field_diary: serializeFieldDiary(this.fieldDiary),
      // the spine's state (R1/R2/R8) rides the same v1-safe law — the
      // fields exist in SaveData, parse quarantined, and were seeded by
      // defaultSave() since the machines landed; the snapshot now carries
      // them so the fire-once law survives the reload
      ledger: serializeLedger(this.ledger),
      chapter: serializeChapterState(this.chapter),
      rails: serializeRails(this.rails),
      // the §7-step-7 machines ride the same v1-safe law (R9–R12)
      player_name: { ...this.playerIdentity },
      fluency: { tier: this.fluency.tier, since_day: this.fluency.sinceDay },
      ...(this.sentPostcardDay !== null ? { sent_postcard: { day: this.sentPostcardDay } } : {}),
      resource_note_offered: this.resourceNoteOffered,
    };
  }

  /** The roam counters, keyed for the diary machine (core/diary.ts) — the
   *  one mapping from the state's named fields to the five families. */
  diaryCounters(): DiaryCounters {
    return {
      shelf: this.shelfBuys,
      dog: this.dogBuys,
      trim: this.trims,
      wash: this.washes,
      hoop: this.hoopMakes,
    };
  }

  /** The field diary's append seam (narrative/14 R3): the one door content
   *  will write through (the C0 pack, narrative/14 §7 step 6). Returns true
   *  when the entry landed; a rejected draft leaves the diary untouched. */
  logDiaryEntry(draft: FieldDiaryEntry): boolean {
    const res = appendEntry(this.fieldDiary, draft);
    this.fieldDiary = res.entries;
    return res.ok;
  }

  /** The ledger's append door (narrative/14 R2): the one seam the choice
   *  nodes' ledger writes land through. Append-only; duplicate ids are
   *  rejected (idempotent replays append nothing). */
  logLedgerEntry(entry: LedgerEntry): boolean {
    const res = appendLedgerEntry(this.ledger, entry);
    this.ledger = res.entries;
    return res.ok;
  }

  /** The spine walk (R1 + R8, the day bookkeeping): touch the chapter to
   *  the calendar day, then evaluate the rails — fire every rail whose
   *  minimum day has arrived and whose trigger is satisfied. Fire-once
   *  (evaluateRails' own law); the fires return for the city diary's
   *  morning whisper. Pure inputs, stored results. */
  walkSpine(calendarDay: number, heldFlags: ReadonlySet<string>): RailFire[] {
    this.chapter = touchDay(this.chapter, calendarDay);
    const res = evaluateRails(this.rails, calendarDay, heldFlags);
    this.rails = res.rails;
    this.spineFires = res.fired;
    return res.fired;
  }

  /** Strike a line in an entry (doc 03 §5.1): appends the correction —
   *  margin note in current-tense Leo — and the body bytes stay frozen.
   *  Returns true when the strike landed. */
  correctDiaryEntry(id: string, day: number, strike: string, margin: string): boolean {
    const res = correctEntry(this.fieldDiary, id, { day, strike, margin });
    this.fieldDiary = res.entries;
    return res.ok;
  }

  // ===================== the C0 block layer (narrative/14 §7 step 6, ======
  // tranche 2 — core/c0Pack.ts): the five neighbors + the Day-7 wobble.
  // The spine tranche (core/c0pack.ts) owns the beats that ride the
  // shipped flow; these own the block around them. Every method is
  // LATCHED BY THE DIARY ITSELF (the entry's id is the latch — the
  // notebook remembers, so no new save shape), rides the one seam
  // (logDiaryEntry), and dates from the calendar (never real time).

  /** The one write door: append + report. A rejected draft leaves the
   *  diary untouched and says nothing. */
  private c0Write(out: Effect[], draft: FieldDiaryEntry): void {
    if (this.logDiaryEntry(draft)) out.push({ kind: 'diary-ink' });
  }

  private c0Has(id: string): boolean {
    return this.fieldDiary.some((e) => e.id === id);
  }

  /** Hook 1 — the lease notice (doc 11 §4): one line from Eddie, once;
   *  the notice itself never changes. The latch is a private marker
   *  entry — the fuse, noted in his hand (C1 strikes its own path). */
  c0Lease(): Effect[] {
    if (!this.c0Has(C0_BLOCK_IDS.lease)) {
      const out: Effect[] = [{ kind: 'note', text: `Eddie: \u201C${EDDIE_LEASE_LINE}\u201D` }];
      this.c0Write(out, leaseSeenEntry(this.calendarDay));
      return out;
    }
    return [{ kind: 'note', text: EDDIE_LEASE_ECHO }];
  }

  /** Hook 2 — the surveyor at the Works fence (doc 11 §4): the line, and
   *  the diary's GUESS written once (C2 strikes it — the pack writes,
   *  the story corrects). */
  c0Surveyor(): Effect[] {
    if (!this.c0Has(C0_BLOCK_IDS.surveyor)) {
      const out: Effect[] = [{ kind: 'note', text: SURVEYOR_LINE }];
      this.c0Write(out, surveyorGuessEntry(this.calendarDay));
      return out;
    }
    return [{ kind: 'note', text: SURVEYOR_ECHO }];
  }

  /** Hook 3 — Miss Odessa's nod: one word, the handshake (doc 11 §4).
   *  Nobody comments. The game never explains. */
  c0Odessa(): Effect[] {
    if (!this.c0Has(C0_BLOCK_IDS.odessa)) {
      const out: Effect[] = [{ kind: 'note', text: ODESSA_NOD }];
      this.c0Write(out, odessaEntry(this.calendarDay));
      return out;
    }
    return [{ kind: 'note', text: ODESSA_NOD }];
  }

  /** Beat 7 — Deshaun's grounding kit (doc 11 §2): the sit line, the
   *  count, the TALK entry — once; after that the kit is an echo. */
  c0Deshaun(): Effect[] {
    if (!this.c0Has(C0_BLOCK_IDS.deshaun)) {
      const out: Effect[] = [
        { kind: 'note', text: DESHAUN_SIT_LINE },
        ...DESHAUN_KIT_LINES.map((text) => ({ kind: 'note' as const, text })),
      ];
      this.c0Write(out, deshaunEntry(this.calendarDay));
      return out;
    }
    return [{ kind: 'note', text: DESHAUN_KIT_ECHO }];
  }

  /** Entry 5 — the RECALL wobble (doc 11 §3): written when the player
   *  passes the laundromat on/after Day 7. Faint, unexplained. */
  c0Wobble(): Effect[] {
    if (this.c0Has(C0_BLOCK_IDS.wobble) || this.calendarDay < 7) return [];
    const out: Effect[] = [];
    this.c0Write(out, wobbleEntry(this.calendarDay));
    out.push({ kind: 'persist' }); // F1's fuse is canon — the diary remembers
    return out;
  }
}

/** TBD-3 (Doc 07) — the Shuffle's soft skip: how long you must stand still
 *  on the walk before the city offers its patience. Pure so the law is
 *  unit-testable (tests/shuffle.test.ts). */
export const CITY_WILL_WAIT_S = 20;
export function cityWillWaitFires(stillFor: number): boolean {
  return stillFor >= CITY_WILL_WAIT_S;
}

/** The Shuffle stretch (docs/51 B16): the bodega→plaza stretch of the north
 *  walk where the crowd lives and the soft skip watches. Outside it, the
 *  player's standing still is theirs — sightseeing is a right, not a stall. */
export const SHUFFLE_STRETCH = { xMin: -42, xMax: -14, zMin: 3.5, zMax: 9.5 } as const;
export function inShuffleStretch(x: number, z: number): boolean {
  return x >= SHUFFLE_STRETCH.xMin && x <= SHUFFLE_STRETCH.xMax
    && z >= SHUFFLE_STRETCH.zMin && z <= SHUFFLE_STRETCH.zMax;
}

function rosaChatLineOf(s: GameState): { text: string; nextChatIndex: number } {
  if (s.isC1) {
    // The season's chat (doc 06 §C1 re-voices the loop's mouths): the
    // station's own line first, then the block's running count.
    const lines = [
      'Rosa: \u201CThe block\u2019s still counting windows. Now it counts your hours too. Full-time looks good on the corner.\u201D',
      'Rosa: \u201CWhatever Craig\u2019s selling, we\u2019re not buying. The box says so. The box is always right.\u201D',
      'Rosa: \u201CYou fed the block in the dark. You know what that makes you? Mine. The corner\u2019s mine, and you\u2019re the corner.\u201D',
    ];
    return { text: lines[s.rosaChatI % 3], nextChatIndex: (s.rosaChatI + 1) % 3 };
  }
  if (s.isWeek) {
    // The stabilized week's chat (doc 11 §2 beat 11 + §7): the wake beat
    // owns the morning; after that she is the block's running count.
    const lines = [
      'Rosa: \u201CFour windows now. I stopped counting. The block didn\u2019t.\u201D',
      'Rosa: \u201CSal laminated your permit receipt. For a card, that\u2019s living right.\u201D',
      'Rosa: \u201CMiss Odessa said morning to you. That\u2019s the whole ceremony. Don\u2019t spend it all in one place.\u201D',
    ];
    return { text: lines[s.rosaChatI % 3], nextChatIndex: (s.rosaChatI + 1) % 3 };
  }
  if (s.isDay4) {
    if (!s.strangerMet) {
      return { text: 'Rosa: \u201CTerminal. Duffel bag. That look. You know the words now \u2014 go use them.\u201D', nextChatIndex: s.rosaChatI };
    }
    if (!s.mapGiven) {
      return { text: 'Rosa: \u201CYour old Map\u2019s behind the counter. It always pointed home, even upside down.\u201D', nextChatIndex: s.rosaChatI };
    }
    const lines4 = [
      'Rosa: \u201CFour windows now. FOUR. I counted twice.\u201D',
      'Rosa: \u201CShe\u2019ll be back Tuesday. They always come back Tuesday.\u201D',
      'Rosa: \u201CSal washed your apron? First one\u2019s always free. His soap is a rumor.\u201D',
    ];
    // the shorthand rung (Doc 33 §4.1): spoken at the handoff itself — the
    // Map just changed hands, and Rosa is still within reach. Once per
    // session, like replayNoteShown: a transient marker, never saved.
    if (s.mapGiven && !s.fourMorningsSaid) {
      s.fourMorningsSaid = true;
      return { text: ROSA_FOUR_MORNINGS_NOTE, nextChatIndex: s.rosaChatI };
    }
    return { text: lines4[s.rosaChatI % 3], nextChatIndex: (s.rosaChatI + 1) % 3 };
  }
  if (s.isDay3) {
    if (!s.kidAtCorner) {
      return { text: 'Rosa: \u201CHe\u2019s at the stoop. Take your time \u2014 first times are slow on purpose.\u201D', nextChatIndex: s.rosaChatI };
    }
    if (!s.stoolUp) {
      return { text: 'Rosa: \u201CA stool. Then your regulars can sit. One summer in and you\u2019re running a living room.\u201D', nextChatIndex: s.rosaChatI };
    }
    if (!s.posterSeen) {
      return { text: 'Rosa: \u201CSomebody put a flyer up by the subway. Something about your coffee. I don\u2019t gossip, so go look.\u201D', nextChatIndex: s.rosaChatI };
    }
    const lines3 = [
      'Rosa: \u201CThree windows. Three. The block is getting lit because of you.\u201D',
      'Rosa: \u201CTomatoes are still salted wrong. You\u2019re a good influence on nothing.\u201D',
    ];
    return { text: lines3[s.rosaChatI % 2], nextChatIndex: (s.rosaChatI + 1) % 2 };
  }
  if (!s.idrisServed) {
    return {
      text: `Rosa: \u201C${s.cartName}. It\u2019s ugly. So was mine, once. Good.\u201D She means the cart. It\u2019s a compliment.`,
      nextChatIndex: s.rosaChatI,
    };
  }
  if (!s.kidKept) {
    return {
      text: 'Rosa: \u201CHe\u2019s shy before noon. The regular\u2019s on me \u2014 carry it over when you get a minute.\u201D',
      nextChatIndex: s.rosaChatI,
    };
  }
  if (!s.awningUp) {
    return { text: 'Rosa: \u201CAn awning. One summer in and you\u2019re already fancier than me.\u201D', nextChatIndex: s.rosaChatI };
  }
  const lines = [
    'Rosa: \u201CThe tomatoes are still salted wrong. Don\u2019t you dare change it.\u201D',
    'Rosa: \u201CTwo windows now. Two. I saw it from the counter.\u201D',
  ];
  return { text: lines[s.rosaChatI % 2], nextChatIndex: (s.rosaChatI + 1) % 2 };
}
