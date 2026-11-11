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
  freshRailStates, evaluateRails, serializeRails, villainQuestionInputs,
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
// ---- the C3 content pack (narrative/14 §7 step 10 — doc 06 §C3) ----
import {
  C3_FIRST_DAY, C3_LAST_DAY, C3_CUT_DAY, C3_CUT_ID, C3_CUT_STAGE, C3_CUT_WALL,
  C3_IDS, C3_FRAGMENT_IDS, C3_EDDIE_KEYS_LINE, C3_ELVANN_LINE, C3_GINO_LINE,
  C3_WATER_FIX_FLAG, C3_WATER_FIX_MISSED_FLAG,
  C3_GINO_FAVOR_LEDGER_ID, C3_GINO_FAVOR_REFS,
  c3StationOf, c3RailFor, c3CompressionFrom, c3CutEntry,
  collapseEntry, keysEntry, waterFixEntry, waterFixMissedEntry, elvannEntry,
  summitEntry, wexlerEntry, halcyonEntry, examEntry, clubEntry, adaEntry,
  pantryEntry, soundEntry, questionCraigEntry as c3QuestionCraigEntry,
  senateEntry, clubCloseEntry, lunchEntry, ginoCardEntry, violationEntry,
  offerEntry, marisolCardEntry, f2Entry as c3F2Entry, applyC3Pick,
} from './c3pack';
// ---- the C4 content pack (narrative/14 §7 step 10 continued — doc 06 §C4) ----
import {
  C4_FIRST_DAY, C4_LAST_DAY, C4_CUT_DAY, C4_CUT_ID, C4_CUT_STAGE, C4_CUT_WALL,
  C4_IDS, C4_EDDIE_PEN_LINE, C4_JUNE_FIGHT_LINE, C4_RACHEL_LINE,
  C4_ERNIE_LINE, C4_TITO_SIT_LINE,
  C4_AUDIT_LINE, C4_MEME_LINE, C4_CAMILLE_LINE,
  C4_K3_STRIKE, C4_ODESSA_LEDGER_ID, C4_ODESSA_REFS,
  c4StationOf, c4RailFor, c4CompressionFrom, c4CutEntry, applyC4Pick,
  signingEntry, k4Entry, jobsFairEntry, kevFallEntry, camilleEntry,
  discoveryEntry, k3Entry, rachelEntry, papersEntry, titoEntry, feldEntry,
  villainEntry, questionEntry, missedEntry, f4Entry as c4F4Entry,
  f7Entry as c4F7Entry,
} from './c4pack';
// ---- the C5 content pack (narrative/14 §7 step 10 continued — doc 06 §C5) ----
import {
  C5_FIRST_DAY, C5_LAST_DAY, C5_CUT_DAY, C5_CUT_ID, C5_CUT_STAGE, C5_CUT_WALL,
  C5_IDS, C5_POST_TITLE, C5_DENIZ_LINE, C5_PRIYA_LINE, C5_RACHEL_LINE,
  C5_EDDIE_LINE, C5_ROSA_TERMINAL_LINE, C5_DAY1_LINE, C5_ADA_NOTE,
  c5StationOf, c5RailFor, c5CompressionFrom, c5CutEntry, applyC5Pick,
  funeralEntry, receiptsEntry, runEntry, lastNightEntry, handoverEntry,
  dealEntry, exitsEntry, callHomeEntry, adaSendEntry, terminalEntry,
  k5Entry as c5K5Record, f5Entry as c5F5Entry,
  c5K2Correction, c5K5Correction, C5_FRAGMENT_IDS,
} from './c5pack';
// ---- the C6 content pack (narrative/14 §7 step 10's last content wave — doc 06 §C6) ----
import {
  C6_FIRST_DAY, C6_LAST_DAY, C6_OPEN_DAY, C6_HEARING_DAY,
  C6_IDS, C6_CLOSE_ID, C6_CLOSE_STAGE, C6_CLOSE_WALL, C6_SELF_PORTRAIT_PREFIX,
  C6_MARISOL_LINE, C6_FELD_LINE, C6_CRAIG_NOTE, C6_ADA_FIRST_LINE,
  C6_DEBTS_COMPLETE_LINE, C6_DEBTS_OPEN_LINE, C6_REFUSAL_CITY_LINE,
  C6_KEV_TAKES_LINE, C6_KEV_BAR_LINE,
  c6StationOf, c6RailFor, c6CompressionFrom, c6CloseEntry,
  firstDollarEntry, lightsEntry, kevForkEntry, kevBarEntry, depositionEntry,
  hearingEntry, hallOpensEntry, lateOfferEntry, treeEntry, floorEntry,
  hospitalityEntry,
  f8Entry as c6F8Entry, applyC6Pick,
  composeSelfPortrait, selfPortraitEntry, kevTakesLetter, debtsComplete,
  type SelfPortraitInput,
} from './c6pack';
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
  | { kind: 'diary-prompt'; pack: 'theory' | 'question' | 'choice'; node?: 'N1a' | 'N1b' | 'N2' | 'N2b' | 'TOAST' | 'N3a' | 'N3b' | 'N3c' | 'N4a' | 'N4b' | 'N4c' | 'N4d' | 'N5a' | 'N5b' | 'N5c' | 'N6' | 'N7' }
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
  /** The story flags' state-side mirror (the world's flag store is the
   *  source of truth — this memo exists so the Silent class's latch can
   *  be read by the state's own beat guards: N3c's not-tell writes
   *  NOTHING, so its flag is the only witness). Synced from the world's
   *  held set on every spine walk; written eagerly by the C3 picks. */
  private readonly storyFlagMemo = new Set<string>();

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

  /** C4's season (narrative/14 §7 step 10 continued — doc 06 §C4): the
   *  station days ride the same WK_* loop with the C4 pack's voice. Same
   *  law as C1/C2/C3's — the chapter gate is the wide law (R8); the day
   *  range is the loop's own — the cut plays at C4_LAST_DAY's linger and
   *  the wall follows (the roll into C5's stations is the C5 wave's
   *  law). */
  get isC4(): boolean {
    return this.day >= C4_FIRST_DAY && this.day <= C4_LAST_DAY;
  }

  /** C5's season (narrative/14 §7 step 10 continued — doc 06 §C5): the
   *  station days ride the same WK_* loop with the C5 pack's voice. Same
   *  law as C1–C4's — the chapter gate is the wide law (R8); the day
   *  range is the loop's own — the cut plays at C5_LAST_DAY's linger and
   *  the wall follows (the roll into C6's stations is the C6 wave's
   *  law). */
  get isC5(): boolean {
    return this.day >= C5_FIRST_DAY && this.day <= C5_LAST_DAY;
  }

  /** C6's season (narrative/14 §7 step 10's last content wave — doc 06
   *  §C6): the station days ride the same WK_* loop with the C6 pack's
   *  voice. Same law as C1–C5's — the chapter gate is the wide law (R8);
   *  the day range is the loop's own — the formal close plays at
   *  C6_LAST_DAY's linger and OPEN follows (the terminal continuation;
   *  the roll into C6's stations was this wave's law, brought home at
   *  the c5SeasonCut's wall). */
  get isC6(): boolean {
    return this.day >= C6_FIRST_DAY && this.day <= C6_LAST_DAY;
  }

  /** The open endgame (doc 14 §2's terminal continuation id, doc 09
   *  §8): after the formal close the simulation simply continues — no
   *  endscreen (R15), the ordinary loop's own mornings, the ledger
   *  never forgotten on chapter change. The self-portrait stays
   *  writable here; nothing else is authored, by design (doc 15 §3's
   *  intended openness). */
  get isOpen(): boolean {
    return this.chapter.chapter === 'OPEN';
  }

  /** C3's season (narrative/14 §7 step 10 — doc 06 §C3): the station days
   *  ride the same WK_* loop with the C3 pack's voice. Same law as C1/C2's
   *  — the chapter gate is the wide law (R8); the day range is the loop's
   *  own — the cut plays at C3_LAST_DAY's linger and the wall follows
   *  (the roll into C4's stations is the C4 wave's law, exactly as this
   *  wave brought the C2 cut's roll). */
  get isC3(): boolean {
    return this.day >= C3_FIRST_DAY && this.day <= C3_LAST_DAY;
  }

  /** The season station for THIS morning, whichever season is on the
   *  clock (the C1/C2/C3 packs own disjoint day ranges; the loop reads
   *  one voice per day — the WK_* steps are the loop, the station is the
   *  day's mouth). */
  private seasonStation(day: number): { queue: readonly WeekOrder[]; wake: string; rushDone: string; storm?: boolean } | undefined {
    if (this.isC6) return c6StationOf(day);
    if (this.isC5) return c5StationOf(day);
    if (this.isC4) return c4StationOf(day);
    if (this.isC3) return c3StationOf(day);
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
    if (this.isC4) {
      const rail = c4RailFor(this.day);
      if (rail === 'cut') return this.c4SeasonCut();
      if (rail && typeof rail === 'object') return this.c4Compression(rail.compress);
    }
    if (this.isC3) {
      const rail = c3RailFor(this.day);
      if (rail === 'cut') return this.c3SeasonCut();
      if (rail && typeof rail === 'object') return this.c3Compression(rail.compress);
    }
    if (this.isC5) {
      const rail = c5RailFor(this.day);
      if (rail === 'cut') return this.c5SeasonCut();
      if (rail && typeof rail === 'object') return this.c5Compression(rail.compress);
    }
    if (this.isC6) {
      const rail = c6RailFor(this.day);
      if (rail === 'open') return this.c6FormalClose();
      if (rail && typeof rail === 'object') return this.c6Compression(rail.compress);
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
   *  is a local pick (ink and two seconds, no ledger). C3's nodes ride
   *  the same seam (N3a the offer, N3b the investor list, N3c the
   *  tell-or-not — the not-tell posts NOTHING, the Silent class; its
   *  flag is the only witness, mirrored eagerly here and by the spine
   *  walk). */
  applyChoicePick(
    nodeId: 'N1a' | 'N1b' | 'N2' | 'N2b' | 'TOAST' | 'N3a' | 'N3b' | 'N3c' | 'N4a' | 'N4b' | 'N4c' | 'N4d' | 'N5a' | 'N5b' | 'N5c' | 'N6' | 'N7',
    optionId: string,
    held?: ReadonlySet<string>,
  ): Effect[] {
    const out: Effect[] = [];
    if (nodeId === 'N6' || nodeId === 'N7') {
      const apply = applyC6Pick(nodeId, optionId, this.calendarDay);
      if (!apply.ok) return [];
      if (apply.note) out.push({ kind: 'note', text: apply.note });
      for (const draft of apply.ledger) {
        this.logLedgerEntry(draft);
      }
      if (apply.diary) this.c0Write(out, apply.diary);
      if (apply.flags.length > 0) {
        for (const f of apply.flags) this.storyFlagMemo.add(f);
        out.push({ kind: 'story-flags', flags: apply.flags });
      }
      out.push({ kind: 'persist' });
      return out;
    }
    if (nodeId === 'N5a' || nodeId === 'N5b' || nodeId === 'N5c') {
      const apply = applyC5Pick(nodeId, optionId, this.calendarDay);
      if (!apply.ok) return [];
      if (apply.note) out.push({ kind: 'note', text: apply.note });
      for (const draft of apply.ledger) {
        this.logLedgerEntry(draft);
      }
      if (apply.diary) this.c0Write(out, apply.diary);
      if (apply.flags.length > 0) {
        for (const f of apply.flags) this.storyFlagMemo.add(f);
        out.push({ kind: 'story-flags', flags: apply.flags });
      }
      out.push({ kind: 'persist' });
      return out;
    }
    if (nodeId === 'N4a' || nodeId === 'N4b' || nodeId === 'N4c' || nodeId === 'N4d') {
      const apply = applyC4Pick(nodeId, optionId, this.calendarDay);
      if (!apply.ok) return [];
      if (apply.note) out.push({ kind: 'note', text: apply.note });
      for (const draft of apply.ledger) {
        this.logLedgerEntry(draft);
      }
      if (apply.diary) this.c0Write(out, apply.diary);
      if (apply.flags.length > 0) {
        for (const f of apply.flags) this.storyFlagMemo.add(f);
        out.push({ kind: 'story-flags', flags: apply.flags });
      }
      out.push({ kind: 'persist' });
      return out;
    }
    if (nodeId === 'N3a' || nodeId === 'N3b' || nodeId === 'N3c') {
      const apply = applyC3Pick(nodeId, optionId, this.calendarDay);
      if (!apply.ok) return [];
      if (apply.note) out.push({ kind: 'note', text: apply.note });
      for (const draft of apply.ledger) {
        this.logLedgerEntry(draft);
      }
      if (apply.diary) this.c0Write(out, apply.diary);
      if (apply.flags.length > 0) {
        for (const f of apply.flags) this.storyFlagMemo.add(f);
        out.push({ kind: 'story-flags', flags: apply.flags });
      }
      out.push({ kind: 'persist' });
      return out;
    }
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
    if (this.c0Has(C2_CUT_ID)) {
      // the cut has played: the wall answers — and the C3 wave's own law
      // (§7 step 10 brought the days the cut opens): the FIRST press after
      // the latch rolls into C3's first station (Wednesday, Jul 1, Y2 —
      // July opens, doc 06 §C3's period start) — unless this is a replayed
      // kept Jun 30, which gets the wall and holds, never a roll out of a
      // replay.
      const wall: Effect[] = [{ kind: 'note', text: C2_CUT_WALL }];
      if (this.replayDay) return wall;
      return [...wall, { kind: 'next-day', to: C3_FIRST_DAY }];
    }
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

  // ------------------------------------------ the C3 season's beats (narrative/14 §7 step 10) ----
  // The chapter's interaction ink: each beat rides a SHIPPED interaction
  // (the c0pack's recontextualization law — retained, not rewritten) or
  // one of two new one-day slots on existing ground (El Vann's community
  // room, Deshaun's court edge — no new meshes, the census untouched),
  // latches by its diary entry (the block layer's law), and writes
  // through the same two doors (the field diary, the consequence ledger).
  // The chapter's own machines: the water-fix window's two sides (doc 10
  // §4's specimen), the ledger's first SECRET favor (Gino's — the C2
  // Priya precedent), and the game's first entry that REFUSES to be
  // written (N3c's not-tell — the Silent class).

  /** Whether a C3 pick has landed (the pick's own ink is the latch —
   *  the entry rides `node` and the c3- prefix). N3c's not-tell writes
   *  NOTHING (the Silent class, doc 10 §1 — the omission exists by
   *  absence), so its flag is the only witness, mirrored from the
   *  world's flag store on every spine walk. */
  private c3PickHeld(nodeId: 'N3a' | 'N3b' | 'N3c'): boolean {
    if (nodeId === 'N3c') {
      if (this.storyFlagMemo.has('trigger-4=absent') || this.storyFlagMemo.has('trigger-4=exists')) return true;
      return this.fieldDiary.some((e) => e.node === nodeId && e.id.startsWith(`c3-${nodeId.toLowerCase()}-`));
    }
    return this.fieldDiary.some((e) => e.node === nodeId && e.id.startsWith(`c3-${nodeId.toLowerCase()}-`));
  }

  /** The C3 season compression (R4's named transition, the C3 pack's
   *  own days-between): the linger plays the compression's two lines and
   *  HOLDS; the next press rolls the counters `from → to` through the
   *  next-day door. The days between stations are CONSUMED, never played
   *  (the station law). The marked compressions are the calendar's own
   *  crossings (summer→fall 349→369, fall→winter 432→457 —
   *  crossedSeasonCut proves both). Doc 10 §4's specimen window closes
   *  with the 328→349 dispatch: the water-fix week's help was the
   *  garden's own beat (day 328); a window crossed unhelped writes its
   *  miss ONCE here (the No-FOMO law — the miss is visible,
   *  in-character, and latched by its own ink). */
  c3Compression(to: number): Effect[] {
    const comp = c3CompressionFrom(this.day);
    if (!comp || comp.to !== to) return [{ kind: 'next-day', to }];
    this.pendingCompressionTo = to;
    const out: Effect[] = [
      { kind: 'note', text: comp.intro },
      { kind: 'note', text: `The city: \u201C${comp.city}\u201D` },
      { kind: 'note', text: 'One more press, and the days pass.' },
    ];
    if (comp.from === 328 && !this.c0Has(C3_IDS.waterFix) && !this.c0Has(C3_IDS.waterFixMissed)) {
      this.c0Write(out, waterFixMissedEntry(this.calendarDay));
      out.push({ kind: 'story-flags', flags: [C3_WATER_FIX_MISSED_FLAG] });
    }
    return out;
  }

  /** The C3→C4 season cut (doc 06 §C3 handoff): the season's montage in
   *  his hand, the handoff staged door-neutral (New Year's at the shop;
   *  the offer re-runs with January's weather whatever door N3a took),
   *  the cut's entry dated Jan 6, Y3 — and the chapter through
   *  advanceChapter's own door at C4's window start. Plays once per save
   *  (the latch is the entry); a replayed kept Dec 20 gets the wall.
   *  C4's content is the next wave's — the wall holds (the honest
   *  pattern; the roll into C4's stations is the C4 wave's law, exactly
   *  as this wave brought the C2 cut's roll). */
  c3SeasonCut(): Effect[] {
    if (this.c0Has(C3_CUT_ID)) {
      // the cut has played: the wall answers — and the C4 wave's own law
      // (§7 step 10 continued brought the days the cut opens): the FIRST
      // press after the latch rolls into C4's first station (Wednesday,
      // Jan 6, Y3 — the face's winter opens, doc 06 §C4's period start) —
      // unless this is a replayed kept Dec 20, which gets the wall and
      // holds, never a roll out of a replay.
      const wall: Effect[] = [{ kind: 'note', text: C3_CUT_WALL }];
      if (this.replayDay) return wall;
      return [...wall, { kind: 'next-day', to: C4_FIRST_DAY }];
    }
    const out: Effect[] = [];
    for (const line of seasonCutMontage(this.fieldDiary)) {
      out.push({ kind: 'note', text: line });
    }
    out.push({ kind: 'note', text: C3_CUT_STAGE });
    out.push({ kind: 'note', text: C3_CUT_WALL });
    this.c0Write(out, c3CutEntry());
    // C4's window opens — the machine's own door, the window-start law
    const adv = advanceChapter(this.chapter, 'C4', {
      day: C3_CUT_DAY,
      triggerHeld: true, // the cut itself is the beat (doc 06 §C3's handoff)
    });
    if (adv.ok) this.chapter = adv.state;
    else this.chapter = touchDay(this.chapter, C3_CUT_DAY);
    out.push({ kind: 'persist' });
    return out;
  }

  /** Doc 06 §C3 starting circumstances + doc 12 §2's fixed event — the
   *  collapse (the eddie interaction, day 301): the omen lived, the
   *  counter running on Leo from this morning forward. */
  c3Collapse(): Effect[] {
    if (this.day !== 301 || this.c0Has(C3_IDS.collapse)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The counter, mid-rush: Eddie\u2019s hand is flat on the stainless \u2014 and it doesn\u2019t move. Then it slides. \u201CKid,\u201D he says, quiet, like an apology. \u201CCall somebody.\u201D' },
      { kind: 'note', text: 'The ambulance takes nine minutes. Rosa holds the block\u2019s attention at her window so nobody follows the gurney. They say heart. They say caught it early. They say the word lucky like a diagnosis.' },
    ];
    this.c0Write(out, collapseEntry(this.day));
    return out;
  }

  /** Doc 06 §C3 event 1 — the keys, from the hospital bed (the eddie
   *  interaction, day 309): trust as burden transfer, verbatim. */
  c3Keys(): Effect[] {
    if (this.day !== 309 || this.c0Has(C3_IDS.keys)) return [];
    const out: Effect[] = [
      { kind: 'note', text: `Eddie puts the keys in my hand \u2014 the shop\u2019s, the back door\u2019s, the safe\u2019s \u2014 and says it like a schedule: \u201C${C3_EDDIE_KEYS_LINE}\u201D` },
      { kind: 'note', text: 'I say something about the dough schedule. He says dough schedules are the easy part. He\u2019s right, and we both pretend the other thing wasn\u2019t said, which is how Eddie says the biggest things.' },
    ];
    this.c0Write(out, keysEntry(this.day));
    return out;
  }

  /** F2 — the visiting-room window (doc 06 §C3 event 1: "F2 fires at
   *  the visiting-room window", doc 02 §6.2). The recontextualization is
   *  noted at the trigger (doc 11's header law): the shipped block hosts
   *  the visiting room in prose, and the fragment's ink lands at the
   *  loop's dusk — the shop's window from the fire escape, Leo's own
   *  palm flat on the glass, hours later, still shaped (the station's
   *  own climbNote carries the image's staging). Keyed to day 309's
   *  climb step (the dusk IS the afterglow), once, the wobble style. */
  c3F2AtGlass(): Effect[] {
    if (this.day !== 309) return [];
    if (this.step !== Step.WK_CLIMB) return [];
    if (this.c0Has(C3_FRAGMENT_IDS.f2)) return [];
    const out: Effect[] = [];
    this.c0Write(out, c3F2Entry(this.day));
    out.push({ kind: 'note', text: 'It passes. It always passes. The entry stays anyway \u2014 the wobble\u2019s own arithmetic, and the most he\u2019s written all year.' });
    return out;
  }

  /** Doc 10 §4's specimen window — the garden's water-fix week, the
   *  HELPED side (the garden interaction, day 328, the window's tail):
   *  the buckets carried, the beds held, Yoli's margin kept. The flag
   *  sets once (the C2 session precedent); the window's MISSED side
   *  rides the 328→349 compression (c3Compression). */
  c3WaterFix(): Effect[] {
    if (this.day !== 328 || this.c0Has(C3_IDS.waterFix)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The beds\u2019 south row, day eleven of the dry week: buckets from the spigot, the kid\u2019s toy pail, Yoli\u2019s own two hands. The last of the water goes on the tomatoes like it\u2019s rationed, because it is.' },
      { kind: 'note', text: 'Yoli counts the surviving plants twice and says nothing, which is how she says thank-you-with-interest. The south row holds.' },
    ];
    this.c0Write(out, waterFixEntry(this.day));
    out.push({ kind: 'story-flags', flags: [C3_WATER_FIX_FLAG] });
    return out;
  }

  /** Doc 06 §C3 event 2 — El Vann's paper wall (the East Tenement's
   *  community room — the chapter's first new one-day slot, day 328):
   *  the borrowing that becomes the first look; her line verbatim. */
  c3Elvann(): Effect[] {
    if (this.day !== 328 || this.c0Has(C3_IDS.elvann)) return [];
    const out: Effect[] = [
      { kind: 'note', text: `The East Tenement\u2019s community room: folding tables, a radiator with opinions, and the paper wall \u2014 origami stacks floor to ceiling. El Vann, eighty-one, sharp as ever: \u201C${C3_ELVANN_LINE}\u201D` },
      { kind: 'note', text: 'She didn\u2019t show everything. She showed that everything exists. Knowledge is a loaded object now, and I\u2019m the one carrying it home.' },
    ];
    this.c0Write(out, elvannEntry(this.day));
    return out;
  }

  /** Doc 06 §C3 event 3 — the Slice Summit (the eddie interaction, day
   *  349, the shop after hours): merchants, Corvus, the board; Wexler's
   *  first meeting; the blog's title. Two latches: the Summit's entry
   *  and Wexler's PERSON card. */
  c3Summit(): Effect[] {
    if (this.day !== 349 || this.c0Has(C3_IDS.summit)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'After hours, Corner Slice hosts it: merchants, Corvus, and the board in one room, the Accord\u2019s eleven protections on the register\u2019s lid. Dane Wexler remembers my name, my cart\u2019s name, and the kid\u2019s birthday unprompted \u2014 never lies; selects.' },
      { kind: 'note', text: 'By eleven the local blog has the photo up \u2014 me mid-pitch, the room lit like a hearing \u2014 titled The Man Who Feeds Alder Heights. I laughed. Then I read it twice more. Titles are tolls too.' },
    ];
    this.c0Write(out, summitEntry(this.day));
    this.c0Write(out, wexlerEntry(this.day));
    return out;
  }

  /** Doc 06 §C3 event 8 + doc 07 §2.x — Halcyon opens (the june
   *  interaction, day 369): the opening night, her line verbatim, the
   *  voice named kindly, close. */
  c3Halcyon(): Effect[] {
    if (this.day !== 369 || this.c0Has(C3_IDS.halcyon)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Halcyon opens \u2014 the caf\u00E9 shell at 6 Kestrel East with its lights on and June\u2019s name over the door. I make a toast in the performance voice, and she catches it, kindly, close: \u201CYou do a voice when you\u2019re scared. It\u2019s a good voice. It\u2019s not yours.\u201D' },
      { kind: 'note', text: 'I say thanks, I\u2019ll keep it safe. She laughs. Neither of us writes it down. Somebody did.' },
    ];
    this.c0Write(out, halcyonEntry(this.day));
    return out;
  }

  /** Doc 12 §2's fixed event — Deshaun's exam fail (the court-edge
   *  slot's own day, 376): his own chapter, the block's verdict
   *  delivered in layups. */
  c3Exam(): Effect[] {
    if (this.day !== 376 || this.c0Has(C3_IDS.exam)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Deshaun, mid-layup, gallows-flat: \u201CSix weeks of study group and the man failed me on AIRWAY. You know what I do all day? I CARRY AIR.\u201D' },
      { kind: 'note', text: 'He shoots again. \u201CSam says the union has a retake path. Sam\u2019s being kind, which Sam is.\u201D The block\u2019s youngest man teaches how the block takes a hit: out loud, at the rim, before dinner.' },
    ];
    this.c0Write(out, examEntry(this.day));
    return out;
  }

  /** Doc 06 §C3 event 5 — the Club's founding pitch (the garden
   *  interaction, day 383): decks honest, risk pages thin, the raise
   *  opens at $30,000. */
  c3Club(): Effect[] {
    if (this.day !== 383 || this.c0Has(C3_IDS.club)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The garden, Saturday, folding chairs: the Juniper Club\u2019s first pitch, the render on a clothesline. Eleven said yes into the folding hat. Four said later.' },
      { kind: 'note', text: 'Yoli sat in the back row and wrote on a legal pad the whole time and did not ask a question, which from Yoli is a paragraph. The Club is real. The Club is $30,000. The carrying has started.' },
    ];
    this.c0Write(out, clubEntry(this.day));
    return out;
  }

  /** Doc 06 §C3 event 5's envelope — Ada's $8,000 (the bus bench, day
   *  390, fixed date Oct 3): the envelope + the phone call that asks
   *  zero questions. */
  c3Ada(): Effect[] {
    if (this.day !== 390 || this.c0Has(C3_IDS.ada)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The envelope is in the shop\u2019s mail slot with my name in my mother\u2019s handwriting and no return address. Eight thousand dollars. The phone rings eleven minutes later \u2014 her timing is a sixth sense with a phone plan \u2014 and the call asks zero questions.' },
      { kind: 'note', text: 'I stand on the bench with the phone against my ear and the envelope under my arm and say thank you in the voice that isn\u2019t the performance, and she says, \u201CI know. That\u2019s why I didn\u2019t ask.\u201D' },
    ];
    this.c0Write(out, adaEntry(this.day));
    return out;
  }

  /** Doc 06 §C3 event 8 — Camille's pantry drive (the garden
   *  interaction, day 404): the alternative life enters the frame; the
   *  PERSON card rides the entry. */
  c3Pantry(): Effect[] {
    if (this.day !== 404 || this.c0Has(C3_IDS.pantry)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Camille Odom runs the pantry drive out of the garden\u2019s south table \u2014 P.S. 218\u2019s lists, the library\u2019s boxes, a Tuesday that repeats. \u201CYou\u2019re the coffee man,\u201D she says, not looking up. \u201CTuesday\u2019s hot. Donations get cold.\u201D' },
      { kind: 'note', text: 'The alternative life is standing right there in a cardigan: no render, no raise, no blog title \u2014 a classroom, a list, a Tuesday. I pour the Tuesday\u2019s coffee. The notebook writes COULD in the margin, where the coulds live.' },
    ];
    this.c0Write(out, pantryEntry(this.day));
    return out;
  }

  /** Doc 06 §C3 event 7 + doc 07 §2.x — the sound (the rosa
   *  interaction, day 414): Doris finds Craig's version of the books;
   *  the fight is off-screen, its sound on-screen; her warning verbatim
   *  at the door; and the chapter's QUESTION writes itself. Two
   *  latches: the sound's entry and the QUESTION's. */
  c3Sound(): Effect[] {
    if (this.day !== 414 || this.c0Has(C3_IDS.sound)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The sound comes over the back fences at dusk \u2014 a door, a porch, silence. Doris, out of the hospital three weeks, found Craig\u2019s version of the books, and the fight is off-screen the way the doc writes it: no voices, just the door\u2019s slam and the kind of silence that has a shape.' },
      { kind: 'note', text: 'Doris finds me at the corner taking the safety glass off the shop\u2019s door, and delivers the chapter\u2019s one mercy at the door, true-thing-last: \u201CYou\u2019re a good boy the way Craig\u2019s a good boy. Watch it.\u201D Then she goes in.' },
      { kind: 'note', text: 'The QUESTION writes itself before I can stop it: What is Craig\u2019s paper?' },
    ];
    this.c0Write(out, soundEntry(this.day));
    this.c0Write(out, c3QuestionCraigEntry(this.day));
    return out;
  }

  /** Doc 07 §4's senate scene (the park bench, day 420): the dominoes
   *  table adopts Leo, Tito's question lands, and Yoli's observation
   *  arrives without asking. */
  c3Senate(): Effect[] {
    if (this.day !== 420 || this.c0Has(C3_IDS.senate)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Corner Park, the dominoes table: the senate convenes and I\u2019m seated without a vote. Eddie\u2019s chair sits empty out of respect. Tito plays the first hand in silence, then, unprompted: \u201CWhose block is the render on, muchacho? That\u2019s today\u2019s agenda. You brought the agenda. You just don\u2019t know you\u2019re carrying it.\u201D' },
      { kind: 'note', text: 'The tiles click. Nobody answers him, which means everybody did. And on the walk back: Yoli\u2019s noticed the Club\u2019s pitch meetings look like the Compact\u2019s, mirrored. Not an accusation. An observation with a legal pad behind it.' },
    ];
    this.c0Write(out, senateEntry(this.day));
    return out;
  }

  /** Doc 06 §C3 event 5's closing pitch (the garden interaction, day
   *  425) — the latch BEFORE the ask; the re-press opens N3b (the
   *  register's node, the pick overlay's seam, nineteen named faces). */
  c3Close(): Effect[] {
    if (this.day !== 425) return [];
    if (!this.c0Has(C3_IDS.close)) {
      const out: Effect[] = [
        { kind: 'note', text: 'The garden, Thursday evening, the last folding chairs: the Club\u2019s closing pitch. The deck\u2019s been through four drafts and the risk pages are thin on purpose \u2014 honesty as a strategy, Rosa\u2019s advice, taken.' },
        { kind: 'note', text: 'The raise stands at $54,000 with eighteen faces; one ask left, and the room knows it the way rooms know things. Miss Odessa sits front row with her purse on her knees like the envelope\u2019s already decided. Who I ask is who I can hurt.' },
      ];
      this.c0Write(out, clubCloseEntry(this.day));
      return out;
    }
    // the pitch has been said: the ask is the pick (once — the pick's own
    // ink is the latch; the overlay re-opens only until the pick lands)
    if (!this.c3PickHeld('N3b')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N3b' }];
    }
    return [];
  }

  /** Doc 06 §C3 event 6 — Gino's first lunch (the diner booth, day 432,
   *  fixed date Nov 14): the NETWORKING entry — the body is the refusal,
   *  shaped; the PERSON card rides separately; the ledger's first SECRET
   *  favor (the C2 Priya precedent); and behind the scene, N3c — tell
   *  Eddie or not (the Silent class, the re-press's pick). */
  c3Lunch(): Effect[] {
    if (this.day !== 432) return [];
    if (!this.c0Has(C3_IDS.lunch)) {
      const out: Effect[] = [
        { kind: 'note', text: `Gino Trabucco buys lunch at his own deli\u2019s corner table \u2014 no agenda, he says, which is the first true thing and the first false thing. Deli sandwiches, olives arranged around the plates like punctuation, naval history where I can see the cover. Somewhere between the pickles and the coffee: \u201C${C3_GINO_LINE}\u201D` },
        { kind: 'note', text: 'And later, quieter, the favor already done by the time it\u2019s described: the old DOB violation on Corner Slice \u2014 Eddie\u2019s paperwork ghost, years stale \u2014 has been looked into. It disappears. The lunch is recorded as networking. The violation is not recorded at all. That\u2019s the first entry I can feel refusing to be written.' },
      ];
      this.c0Write(out, lunchEntry(this.day));
      this.c0Write(out, ginoCardEntry(this.day));
      // the favor rides the ledger as a recorded act (the C2 Priya-
      // favor precedent: a promise without a due is schema-invalid, and
      // the favor's name comes later — the ledger keeps the owing
      // visible either way, SECRET from the surfaces that name them)
      this.logLedgerEntry({
        id: C3_GINO_FAVOR_LEDGER_ID,
        kind: 'choice',
        date: dateOfCalendarDay(this.calendarDay),
        refs: [...C3_GINO_FAVOR_REFS],
        weight: 1,
        visibility: 'secret',
      });
      return out;
    }
    // the lunch has been said: the tell-or-not is the pick (once — the
    // not-tell's flag is the latch, mirrored from the world's flag store)
    if (!this.c3PickHeld('N3c')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N3c' }];
    }
    return [];
  }

  /** The wall's missing slip (the lease-notice interaction, day 432):
   *  an OBSERVATION the entry shapes around the gap — the notebook
   *  knows what the wall lost even if the lunch entry doesn't say the
   *  word. */
  c3Violation(): Effect[] {
    if (this.day !== 432 || this.c0Has(C3_IDS.violation)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The wall behind Eddie\u2019s framed notice has one less paper on it \u2014 the oldest slip, the DOB violation that hung there like a ghost the whole first year, is gone. Nobody moved it. Paper doesn\u2019t move itself.' },
    ];
    this.c0Write(out, violationEntry(this.day));
    return out;
  }

  /** Doc 06 §C3 event 4 — the offer (the Works fence, day 457, fixed
   *  date Dec 9, riding the surveyor's own spot at the fence): the
   *  EVIDENCE entry (photographed, unsigned) + Marisol's PERSON card
   *  v1; and behind the scene, N3a — the offer's three doors (the
   *  re-press's pick). */
  c3Offer(): Effect[] {
    if (this.day !== 457) return [];
    if (!this.c0Has(C3_IDS.offer)) {
      const out: Effect[] = [
        { kind: 'note', text: 'The fence door at the Works is propped open and Marisol is standing in the render\u2019s actual footprint holding one page like it\u2019s warm. Provisions Hall, the food hall: \u201Cyour vendors, your block, our kitchen.\u201D Run it.' },
        { kind: 'note', text: 'The pitch is perfect because it is true \u2014 and because it makes me the project\u2019s face. I photograph the page unsigned and put the phone away. Nineteen debts. One signature pending. A fixer\u2019s favor outstanding. And a page.' },
      ];
      this.c0Write(out, offerEntry(this.day));
      this.c0Write(out, marisolCardEntry(this.day));
      return out;
    }
    // the offer has been made: the answer is the pick (once — the pick's
    // own ink is the latch; the overlay re-opens only until the pick lands)
    if (!this.c3PickHeld('N3a')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N3a' }];
    }
    return [];
  }

  // --------------------------------------- the C4 season's beats (narrative/14 §7 step 10 continued) ----
  // The Face: the performance winning while the ledger bleeds. Each beat
  // rides a SHIPPED interaction (the c0pack's recontextualization law —
  // retained, not rewritten), latches by its own diary entry (the block
  // layer's law), and writes through the same two doors (the field
  // diary, the consequence ledger). The chapter lands the ledger's
  // heaviest entries (K3 struck the same scene; K4 written honestly as
  // GUESS and KEPT), the Lost Year's F4 and F7 (the railing spends R12's
  // opt-in resource note — the first trigger in canon order), and the
  // register's four C4 nodes behind the scene.

  /** Whether a C4 pick has landed. The ink is the usual latch (the
   *  entry rides `node` and the c4- prefix); the ledger-only doors
   *  (N4d's defer) latch on their ledger act, and the Silent-class door
   *  (N4d's never) latches on its flag — the only witness, mirrored
   *  eagerly at the pick and by the spine walk (the C3 not-tell
   *  precedent). */
  private c4PickHeld(nodeId: 'N4a' | 'N4b' | 'N4c' | 'N4d'): boolean {
    if (this.fieldDiary.some((e) => e.node === nodeId && e.id.startsWith(`c4-${nodeId.toLowerCase()}-`))) return true;
    if (this.ledger.some((e) => e.node === nodeId)) return true;
    if (nodeId === 'N4d' && this.storyFlagMemo.has('c6-condition-handle=never')) return true;
    return false;
  }

  /** The C4 season compression (R4's named transition, the C4 pack's
   *  own days-between): the linger plays the compression's two lines and
   *  HOLDS; the next press rolls the counters `from → to` through the
   *  next-day door. The days between stations are CONSUMED, never played
   *  (the station law). The marked compressions are the season cuts
   *  (winter→spring at 493→546, spring→summer at 629→633 — the pack
   *  proves both crossings). */
  c4Compression(to: number): Effect[] {
    const comp = c4CompressionFrom(this.day);
    if (!comp || comp.to !== to) return [{ kind: 'next-day', to }];
    this.pendingCompressionTo = to;
    return [
      { kind: 'note', text: comp.intro },
      { kind: 'note', text: `The city: \u201C${comp.city}\u201D` },
      { kind: 'note', text: 'One more press, and the days pass.' },
    ];
  }

  /** The C4→C5 season cut (doc 06 §C4 handoff): the season's montage in
   *  his hand, the handoff staged (July heat, Craig drunk at the
   *  laundromat — "as good as sold", the fence's another lock), the
   *  cut's entry dated Jul 3, Y3 — and the chapter through
   *  advanceChapter's own door at C5's window start. Plays once per save
   *  (the latch is the entry); a replayed kept Jun 28 gets the wall.
   *  C5's content is the next wave's — the wall holds (the honest
   *  pattern; the roll into C5's stations is the C5 wave's law). */
  c4SeasonCut(): Effect[] {
    if (this.c0Has(C4_CUT_ID)) {
      // the cut has played: the wall answers — and the C5 wave's own law
      // (§7 step 10 continued brought the days the cut opens): the FIRST
      // press after the latch rolls into C5's first station (day 663,
      // July 3, Y3 — the loaded machine opens, doc 06 §C5's period
      // start) — unless this is a replayed kept Jun 28, which gets the
      // wall and holds, never a roll out of a replay.
      const wall: Effect[] = [{ kind: 'note', text: C4_CUT_WALL }];
      if (this.replayDay) return wall;
      return [...wall, { kind: 'next-day', to: C5_FIRST_DAY }];
    }
    const out: Effect[] = [];
    for (const line of seasonCutMontage(this.fieldDiary)) {
      out.push({ kind: 'note', text: line });
    }
    out.push({ kind: 'note', text: C4_CUT_STAGE });
    out.push({ kind: 'note', text: C4_CUT_WALL });
    this.c0Write(out, c4CutEntry());
    // C5's window opens — the machine's own door, the window-start law
    const adv = advanceChapter(this.chapter, 'C5', {
      day: C4_CUT_DAY,
      triggerHeld: true, // the cut itself is the beat (doc 06 §C4's handoff)
    });
    if (adv.ok) this.chapter = adv.state;
    else this.chapter = touchDay(this.chapter, C4_CUT_DAY);
    out.push({ kind: 'persist' });
    return out;
  }

  /** Doc 12 §2's fixed event — the signing (the eddie interaction, day
   *  493): the pen's sentence verbatim, the letter signed, and K4
   *  written honestly as GUESS and KEPT (doc 03 §5 — the ledger's
   *  cruelest entry is the one he leaves standing). The Map gains the
   *  render room (doc 06 §C4 diary developments). */
  c4Signing(): Effect[] {
    if (this.day !== 493 || this.c0Has(C4_IDS.signing)) return [];
    const out: Effect[] = [
      { kind: 'note', text: `The letter is on the counter and Eddie\u2019s pen is in my hand. He says it like a benediction and a dare: \u201C${C4_EDDIE_PEN_LINE}\u201D` },
      { kind: 'note', text: 'I sign. The deck\u2019s three hundred forty becomes the video\u2019s five hundred on the same page, because round numbers fund. Eddie nods the way you nod at weather, and we both pretend the nod is agreement.' },
    ];
    this.c0Write(out, signingEntry(this.day));
    this.c0Write(out, k4Entry(this.day));
    this.collectNote('The render room \u2014 Marisol\u2019s table, the pledge\u2019s paper.');
    return out;
  }

  /** Doc 06 §C4 event 2 — the jobs-fair op (the kev_pledge interaction,
   *  day 546): the banner, the clip, the thesis-in-falsehood verbatim;
   *  F4 surfaces in the op's own garage (doc 02 §6.2's trigger); and
   *  behind the scene, N4a — the jobs number's three doors. */
  c4JobsFair(): Effect[] {
    if (this.day !== 546) return [];
    if (!this.c0Has(C4_IDS.jobsFair)) {
      const out: Effect[] = [
        { kind: 'note', text: 'The stage is built against our own fence. Kev fronts the hiring pledge \u2014 his face on the banner, his voice on the clip, my numbers in his mouth. THE FUTURE HIRES HERE, and the number he says is the round one.' },
        { kind: 'note', text: `Big numbers protect the little guys \u2014 that\u2019s the sentence I gave him, and the cameras took it, and the deck in my bag says what the deck says. After the cameras: the garage under the render site, fluorescent light, a hood still warm, crying with no reason attached.` },
      ];
      this.c0Write(out, jobsFairEntry(this.day));
      this.c0Write(out, c4F4Entry(this.day));
      return out;
    }
    // the op has played: the answer is the pick (once — the pick's own
    // ink is the latch; the overlay re-opens only until the pick lands)
    if (!this.c4PickHeld('N4a')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N4a' }];
    }
    return [];
  }

  /** Doc 06 §C4 event 2's April — Kev's fall (the newsbox, day 580):
   *  the audit's finding verbatim, the meme, the coalition's gain. */
  c4KevFall(): Effect[] {
    if (this.day !== 580 || this.c0Has(C4_IDS.kevFall)) return [];
    const out: Effect[] = [
      { kind: 'note', text: `The borough paper\u2019s box carries the audit\u2019s language like an obituary: the jobs are \u201C${C4_AUDIT_LINE}.\u201D Beside it, taped by somebody\u2019s hand, the clip \u2014 ${C4_MEME_LINE}, three laughing faces under it.` },
      { kind: 'note', text: 'Kev found JMA\u2019s hard line. Yoli took him in \u2014 the coalition gains its angriest researcher, and his first case file is going to have my name on the spine. His face did it; my math did it.' },
    ];
    this.c0Write(out, kevFallEntry(this.day));
    return out;
  }

  /** Doc 06 §C4 event 4 — Camille's exit (the garden, day 595): her
   *  line verbatim, the staging door-neutral — the C3 pantry latch
   *  decides which exit the player lived (the warm one remembers the
   *  Tuesdays; the cold one is the notice standing alone). */
  c4Camille(): Effect[] {
    if (this.day !== 595 || this.c0Has(C4_IDS.camille)) return [];
    const pursued = this.c0Has(C3_IDS.pantry);
    const out: Effect[] = [];
    out.push({ kind: 'note', text: pursued
      ? 'The garden\u2019s south table is labeled in her own handwriting. She sees me see it. \u201CYou came to a Tuesday once,\u201D she says. \u201CThat\u2019s why the notice isn\u2019t the only thing I\u2019m leaving you.\u201D'
      : 'The garden\u2019s south table is labeled in her own handwriting, and the transfer notice is dated like an apology that isn\u2019t one. We never shared a Tuesday. The notice is the whole conversation.' });
    out.push({ kind: 'note', text: `Her exit line, quiet, the way exits land when they\u2019re earned: \u201C${C4_CAMILLE_LINE}\u201D` });
    this.c0Write(out, camilleEntry(this.day));
    return out;
  }

  /** Doc 06 §C4 event 5 — June finds the diary (the june interaction,
   *  day 608): the fight's sentence verbatim, K3 written SECRET and
   *  struck the same scene (doc 03 §5's table — the lie wears the
   *  honest tag, the correction is doc's own), and behind the scene,
   *  N4b — June after discovery's three doors. */
  c4Discovery(): Effect[] {
    if (this.day !== 608) return [];
    if (!this.c0Has(C4_IDS.discovery)) {
      const out: Effect[] = [
        { kind: 'note', text: 'She was dusting. The notebook was under the bed because the notebook lives under the bed. She read the condition, and K2, and the lunch that wouldn\u2019t say the word, and the room in my head she never knew existed.' },
        { kind: 'note', text: `The fight is quiet, which is how her fights work. Her sentence is the one I can\u2019t renew: \u201C${C4_JUNE_FIGHT_LINE}\u201D The conditions are issued once, non-negotiable, take-it-or-leave: the year at Dr. Feld\u2019s; the condition named out loud to her, not to the notebook; the Club\u2019s books shown before she asks.` },
        { kind: 'note', text: 'The notebook writes K3 the way I\u2019ve been writing all year \u2014 the lie first, the tag honest \u2014 and then strikes it the same evening. Both lines stay. That\u2019s the ledger\u2019s law, and today it\u2019s a mirror.' },
      ];
      this.c0Write(out, discoveryEntry(this.day));
      this.c0Write(out, k3Entry(this.day));
      this.correctDiaryEntry(C4_IDS.k3, this.calendarDay, C4_K3_STRIKE.strike, C4_K3_STRIKE.margin);
      return out;
    }
    // the fight has played: the answer is the pick (once)
    if (!this.c4PickHeld('N4b')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N4b' }];
    }
    return [];
  }

  /** Doc 06 §C4 event 6 — Rachel (the rachel_gallery interaction, day
   *  615): the un-impressible mirror, her surgical question verbatim.
   *  The Map gains the gallery (doc 06 §C4 diary developments). */
  c4Rachel(): Effect[] {
    if (this.day !== 615 || this.c0Has(C4_IDS.rachel)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Fitz\u2019s gallery, the velvet corner, the room where the Face is an exhibit. Rachel recognizes me instantly. I perform. She declines the performance \u2014 declines it the way you decline a flyer.' },
      { kind: 'note', text: `Her questions are surgical, and the sharpest one stays: \u201C${C4_RACHEL_LINE}\u201D She mentions the payphone once, flatly, and refuses to elaborate. The payphone. The circuit has its own archivist.` },
    ];
    this.c0Write(out, rachelEntry(this.day));
    this.collectNote('The gallery \u2014 Fitz\u2019s velvet, the room that declines to flatter.');
    return out;
  }

  /** Doc 06 §C4 + doc 07 §2.x — the El Vann papers and the bridge story
   *  (the elvann interaction, day 622): the papers' inventory, the
   *  railing surfacing (F7, the register's row verbatim), R12's opt-in
   *  resource note spending at its firing (the first trigger in canon
   *  order — core/guardrails' own once-latch), and behind the scene,
   *  N4c — what he does with the papers. */
  c4Papers(): Effect[] {
    if (this.day !== 622) return [];
    if (!this.c0Has(C4_IDS.papers)) {
      const out: Effect[] = [
        { kind: 'note', text: 'The community room, the paper wall\u2019s room, and today the papers are mine to hold: the letter, the option, fifty years of the block\u2019s paper spine. El Vann, over the radiator\u2019s opinions: \u201CDevelopments fail, dear. Documents don\u2019t. They wait.\u201D' },
        { kind: 'note', text: 'Then the bridge story, unprompted \u2014 the one from before my time, about a man on a railing over dark water, and how the story ends exactly where it ends. No conclusion attached. Cold metal. River dark. Full stop.' },
      ];
      this.c0Write(out, papersEntry(this.day));
      this.c0Write(out, c4F7Entry(this.day));
      // R12's opt-in note — once, at the first firing of F7 (the therapy
      // session only plays if taken, Jun 15 at the earliest; the C5
      // investigation is later). The note is an OFFER, never a lecture.
      if (shouldOfferResourceNote(this.resourceNoteOffered, 'F7-railing')) {
        this.resourceNoteOffered = true;
        out.push({ kind: 'note', text: RESOURCE_NOTE_TEXT });
      }
      return out;
    }
    // the papers have played: the answer is the pick (once)
    if (!this.c4PickHeld('N4c')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N4c' }];
    }
    return [];
  }

  /** Doc 06 §C4 event 7 — Tito's story (the tito_table interaction, day
   *  629): the mirror at full length, Ernie's sentence verbatim, Tito's
   *  thirty years verbatim. The bible forbids any character drawing the
   *  equation — the player assembles it. */
  c4Tito(): Effect[] {
    if (this.day !== 629 || this.c0Has(C4_IDS.tito)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The dominoes table, late, the cheap wine Tito saves for stories with weight. He tells the \u201994 story unprompted: Ernie, the two hundred fourteen signatures, the consulting position, the rain that came inside.' },
      { kind: 'note', text: `\u201C${C4_ERNIE_LINE}\u201D Then Tito looks at his tiles. \u201C${C4_TITO_SIT_LINE}\u201D Nobody draws the line from him to me. The bible forbids it. The player draws it, and the pen shakes.` },
    ];
    this.c0Write(out, titoEntry(this.day));
    return out;
  }

  /** Doc 12 §2's "therapy starts (Jun 3)" — the booking (the feld_room
   *  interaction, day 633): the thread's opening, the Map's pin (doc 06
   *  §C4 diary developments — Dr. Feld's block). The first session
   *  itself plays the villain-question's morning when N4d takes
   *  therapy. */
  c4FeldBooking(): Effect[] {
    if (this.day !== 633 || this.c0Has(C4_IDS.feld)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Dr. Feld\u2019s block, two avenues east. The booking is made: cash-only, quiet clients, the room a room and the door a door. The Map gains its third new pin this season \u2014 the render room, the gallery, this block.' },
      { kind: 'note', text: 'The appointment is circled twice on the Map \u2014 twice, because the first circle didn\u2019t take. The fifteenth is circled. The notebook doesn\u2019t ask what the room is for. The notebook was there for the whole diagnosis.' },
    ];
    this.c0Write(out, feldEntry(this.day));
    this.collectNote('Dr. Feld\u2019s block \u2014 two avenues east, the door is a door.');
    return out;
  }

  /** Doc 08 §6 — the villain-question scene (the late_window
   *  interaction, day 645): 2 a.m., the shop dark, the K-Globes amber
   *  through the gate. K2 and K4 read side by side. R4's machine reports
   *  what the ledger remembers (machine facts only — the scene turns
   *  them into the question; the machine never editorializes). The only
   *  line, written, not spoken. The QUESTION rides its own entry. Behind
   *  the scene, N4d — the morning's three doors. */
  c4VillainQuestion(): Effect[] {
    if (this.day !== 645) return [];
    if (!this.c0Has(C4_IDS.villain)) {
      const inputs = villainQuestionInputs(this.ledger, dateOfCalendarDay(this.calendarDay));
      const out: Effect[] = [
        { kind: 'note', text: '2 a.m., the shop dark, the K-Globes amber through the gate. I open the notebook to K2 \u2014 net good \u2014 and find my own handwriting unfamiliar. I check the date. I check the ink. I check the corner where I sign. It is mine.' },
        { kind: 'note', text: 'K4 beside it \u2014 the GUESS I labeled honestly and kept. One page of reading my own record like evidence. No speech. The only line, written, not spoken: \u201CThe diary doesn\u2019t lie. The writer did.\u201D' },
        { kind: 'note', text: `The ledger remembers what the world remembers: ${inputs.actors.length} actors, ${inputs.nodes.length} nodes that wrote entries, ${inputs.omissionCount} promises matured into omissions, ${inputs.openPromiseIds.length} promises still open, weight ${inputs.weightSum}. The machine reports. The question is the player\u2019s.` },
      ];
      this.c0Write(out, villainEntry(this.day));
      this.c0Write(out, questionEntry(this.day));
      return out;
    }
    // the scene has played: the morning's answer is the pick (once)
    if (!this.c4PickHeld('N4d')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N4d' }];
    }
    return [];
  }

  /** Doc 06 §C4 event 10 — the first missed repayment (the odessa
   *  interaction, day 654): the withdrawal that doesn't clear, Miss
   *  Odessa's $140 covered personally in cash and told to no one, the
   *  EVIDENCE's deletion logged. The off-books act rides the ledger as
   *  a recorded, SECRET amends (the C3 Gino-favor precedent). */
  c4Missed(): Effect[] {
    if (this.day !== 654 || this.c0Has(C4_IDS.missed)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Quiet, administrative, terrible: a withdrawal that doesn\u2019t clear. The Club\u2019s first repayment window and the machine says insufficient, politely, twice. I cover Miss Odessa\u2019s hundred forty in cash, personally, and tell no one.' },
      { kind: 'note', text: 'The envelope is in her purse by lunch and the ledger never sees my hand. The slip photographed, then deleted \u2014 and the deletion is itself logged, because nothing in this system truly deletes. The diary tells on me anyway. The diary tells on me always.' },
    ];
    this.c0Write(out, missedEntry(this.day));
    this.logLedgerEntry({
      id: C4_ODESSA_LEDGER_ID,
      kind: 'amends',
      date: dateOfCalendarDay(this.calendarDay),
      refs: [...C4_ODESSA_REFS],
      weight: 1,
      visibility: 'secret',
    });
    return out;
  }

  // ---- the C5 season's station methods (doc 06 §C5 / doc 12 §2) ----

  /** Whether the pick has landed (the c4PickHeld's own shape — the
   *  pick's ink rides `node` and the c5- prefix; the ledger act is the
   *  second witness; silence's flag is the third). */
  private c5PickHeld(nodeId: 'N5a' | 'N5b' | 'N5c'): boolean {
    if (this.fieldDiary.some((e) => e.node === nodeId && e.id.startsWith(`c5-${nodeId.toLowerCase()}-`))) return true;
    if (this.ledger.some((e) => e.node === nodeId)) return true;
    if (nodeId === 'N5c' && this.storyFlagMemo.has('c6-standing=silence')) return true;
    return false;
  }

  /** Doc 06 §C5 event 1 — Doris (the funeral porch, day 736): the
   *  chair, the ledger on her lap, the last time the block is one
   *  thing, Craig inheriting the pen. */
  c5Funeral(): Effect[] {
    if (this.day !== 736 || this.c0Has(C5_IDS.funeral)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The porch is full and the block is one thing \u2014 the last time, and everybody feels it without saying it. Doris\u2019s chair is empty and her ledger went with her, kept to the last page.' },
      { kind: 'note', text: 'The lawyer\u2019s arithmetic is small and final: the estate needs liquidity. Craig wears the suit like a costume he\u2019s already measured for resale and says \u201Ccontinued\u201D about the shop like a man reading his own footnote. The pen is his now. The row goes where pens go.' },
    ];
    this.c0Write(out, funeralEntry(this.day));
    return out;
  }

  /** Doc 06 §C5 event 3 — the receipts (the newsbox, day 743): the
   *  post's title verbatim, the annotations, the city's diary going
   *  quiet. K2's strike rides the same scene (doc 03 §5.2's correction
   *  verbatim — the ledger's C2 lie meets the block's arithmetic). */
  c5Receipts(): Effect[] {
    if (this.day !== 743 || this.c0Has(C5_IDS.receipts)) return [];
    const out: Effect[] = [
      { kind: 'note', text: `The stoops read before the bread comes out. The post is titled \u201C${C5_POST_TITLE}\u201D \u2014 the block\u2019s own irony, printed \u2014 and the annotations are Deniz\u2019s: the sign-in sheet with my withdrawal line, the stall-the-Oktays text, the 500-jobs math beside the deck\u2019s 340.` },
      { kind: 'note', text: 'Kev kept the folder in case. The case arrived. The city\u2019s diary, for the first time, speaks about me to the block \u2014 and goes quiet to me.' },
      { kind: 'note', text: 'Deniz finds me at the cart after \u2014 not gloating; bookkeeping: \u201C' + C5_DENIZ_LINE + '\u201D The notebook opens to K2 and the strikethrough is the day\u2019s only honest sentence.' },
    ];
    this.c0Write(out, receiptsEntry(this.day));
    const k2 = c5K2Correction(this.calendarDay);
    this.correctDiaryEntry('c2-k2-net-good', k2.day, k2.strike, k2.margin);
    return out;
  }

  /** Doc 06 §C5 events 4 + 7's first half — the run and the sale (the
   *  board, day 752): the crowd, the books in daylight, Craig closing
   *  the row. */
  c5Run(): Effect[] {
    if (this.day !== 752 || this.c0Has(C5_IDS.run)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The corkboard carries the Club\u2019s books this morning \u2014 somebody photographed the ledger and pinned it like weather. The books do not survive daylight. They never did. They just never had any.' },
      { kind: 'note', text: 'Nineteen investors became a crowd, the crowd became a phone tree, and Craig closed the row\u2019s sale at nine sharp \u2014 the paper matured, the offer was suddenly fair, and my own room\u2019s landlord is now, technically, Corvus-adjacent. Facts, times, amounts.' },
    ];
    this.c0Write(out, runEntry(this.day));
    return out;
  }

  /** Doc 06 §C5 event 7's second half — the shop's last night (the
   *  shop's window, day 756): the last slice for nobody, the four
   *  seconds. */
  c5LastNight(): Effect[] {
    if (this.day !== 756 || this.c0Has(C5_IDS.lastNight)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The shop\u2019s last night. I close alone \u2014 Eddie\u2019s in Charlotte with a heart that finally outranked the ovens, and the lease died with Doris\u2019s handshake economy.' },
      { kind: 'note', text: 'The last slice of the last pie goes on the counter for nobody. The lights go off. I stand in the dark four seconds longer than the scene needs. Facts, times, amounts: one slice, one counter, four seconds.' },
    ];
    this.c0Write(out, lastNightEntry(this.day));
    return out;
  }

  /** Doc 06 §C5 event 5 — Priya's handover (the platform, day 760): her
   *  pricing, owned, verbatim; the ledger changes desks. */
  c5Handover(): Effect[] {
    if (this.day !== 760 || this.c0Has(C5_IDS.handover)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Kayla Fournier asked Priya what she knows about the Marsh situation. Priya gave them the Club ledger \u2014 the one she\u2019s been sitting on since spring, neutral the whole time. Her neutrality, priced at last.' },
      { kind: 'note', text: `The 7:40 came and went with a woman on it who was not looking at me. On the platform, hers, owned: \u201C${C5_PRIYA_LINE}\u201D She\u2019s right twice.` },
    ];
    this.c0Write(out, handoverEntry(this.day));
    return out;
  }

  /** Doc 06 §C5 event 6 — the deal (the lawyer's office, day 784): the
   *  shape verbatim, the arithmetic, the system's mercy. K5's record is
   *  written here (tagged FACT — the last lie the ledger carries).
   *  R12's third trigger (the C5 investigation scenes) offers its note
   *  here through the once-latch. Behind the scene: N5a. */
  c5Deal(): Effect[] {
    if (this.day !== 784) return [];
    if (!this.c0Has(C5_IDS.deal)) {
      const out: Effect[] = [
        { kind: 'note', text: 'The lawyer is decent and priced. The agreement on her desk reads like a receipt for everything: misrepresentations in a private offering, books kept informally, Gino\u2019s favors surfaced as questions I can\u2019t answer well.' },
        { kind: 'note', text: `The outcome is a deferred-prosecution-style agreement: restitution of $47,300 after settlements, and a bar from operating the hall\u2019s concession. No prison. The system\u2019s mercy, not the story\u2019s. The pen is the same weight it was in January.` },
        { kind: 'note', text: 'The notebook writes the line I already know is a lie: I did what had to be done. The ledger takes it. The ledger takes everything. That\u2019s its job.' },
      ];
      this.c0Write(out, dealEntry(this.day));
      this.c0Write(out, c5K5Record(this.day));
      // R12's opt-in note — the C5 investigation scenes are the
      // register's third trigger; a save that spent at F7 or the
      // therapy session never sees it twice (the once-latch's law).
      if (shouldOfferResourceNote(this.resourceNoteOffered, 'C5-investigation')) {
        this.resourceNoteOffered = true;
        out.push({ kind: 'note', text: RESOURCE_NOTE_TEXT });
      }
      return out;
    }
    // the deal has played: the answer is the pick (once — the pick's own
    // ink is the latch; the overlay re-opens only until the pick lands)
    if (!this.c5PickHeld('N5a')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N5a' }];
    }
    return [];
  }

  /** Doc 06 §C5 event 8 — the exits (the 1 a.m. call, day 795): Rachel's
   *  sentence verbatim, Eddie's two truths verbatim, June's conditions
   *  resolved door-neutral from the machine's own flags. Behind the
   *  scene: N5b — the plan's shape. */
  c5Exits(): Effect[] {
    if (this.day !== 795) return [];
    if (!this.c0Has(C5_IDS.exits)) {
      const met = this.storyFlagMemo.has('june-conditions=full-disclosure')
        && this.storyFlagMemo.has('c6-condition-handle=therapy');
      const out: Effect[] = [
        { kind: 'note', text: met
          ? 'June\u2019s conditions were met \u2014 the year at Dr. Feld\u2019s, the condition named, the books shown \u2014 and she is gone from the daily map anyway, which is what conditions are: a floor to stand on, not a reason to stay. The window\u2019s light went dark at the hours it used to argue with me about.'
          : 'June\u2019s conditions went unmet \u2014 the year at Dr. Feld\u2019s unstarted, the books unshown \u2014 and she is gone from the daily map, which is what unmet conditions are: a door closing at the speed of a window\u2019s light going dark at the hours it used to argue with me about.' },
        { kind: 'note', text: `Rachel took his one 1 a.m. call \u2014 no preamble, no mercy, the sentence he never takes back: \u201C${C5_RACHEL_LINE}\u201D The dial tone after is a cousin of the payphone\u2019s.` },
        { kind: 'note', text: `Eddie called from Charlotte, love without absolution: \u201C${C5_EDDIE_LINE}\u201D The floor is real. Real is the worst kind of offer.` },
      ];
      this.c0Write(out, exitsEntry(this.day));
      return out;
    }
    // the exits have played: the answer is the pick (once)
    if (!this.c5PickHeld('N5b')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N5b' }];
    }
    return [];
  }

  /** Doc 06 §C5 event 9 — the call home (the payphone, day 802): Ada,
   *  the $8,000, zero questions; the R9 send through the dispatch's
   *  sealed seam ('C5-ada' — the ONE send, once per save); F5 fires the
   *  same week (the wobble style); K5's correction is struck here (doc
   *  03 §5.2 — the settlements; Ada's $8,000 call). */
  c5CallHome(): Effect[] {
    if (this.day !== 802 || this.c0Has(C5_IDS.callHome)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Ada, $8,000, zero questions \u2014 the money moves before the hello finishes, and this time I answer the question she doesn\u2019t ask. It is the shortest scene in the game and the only one the whole cast would applaud.' },
      { kind: 'note', text: `The payphone eats its coins; the dial tone after is the longest sound there is. Bea\u2019s envelope finds the record: the schedule\u2019s first dollar, and Ada\u2019s note in a hand I\u2019d know anywhere \u2014 ${C5_ADA_NOTE}` },
      { kind: 'note', text: 'The card keeps its stamp. One card, one address, one send \u2014 the only paper the whole story mails.' },
      { kind: 'note', text: 'The notebook strikes K5 this morning \u2014 had to be done struck through, the margin signed. The ledger\u2019s last correction is the truest sentence in the book, and I signed it.' },
    ];
    this.c0Write(out, callHomeEntry(this.day));
    // R9 — the ONE send, through the dispatch's own law (the sealed
    // seam refuses any other scene key; once per save)
    if (this.sendPostcardFromC5('C5-ada')) {
      this.c0Write(out, adaSendEntry(this.day));
    }
    // F5 — the coins leaving, the dial tone after (the wobble style,
    // once per save: the entry IS the latch)
    if (!this.c0Has(C5_FRAGMENT_IDS.f5)) {
      this.c0Write(out, c5F5Entry(this.day));
    }
    // K5's correction — the strike seam (doc 03 §5.2's row verbatim)
    const k5c = c5K5Correction(this.calendarDay);
    this.correctDiaryEntry(C5_IDS.k5, k5c.day, k5c.strike, k5c.margin);
    return out;
  }

  /** N5c's venue (the garden, day 802's week): the reckoning's staging
   *  — the pick rides the garden's own ground (doc 06 §C5: "a public
   *  reckoning at the garden — available, brutal, the only path that
   *  keeps Yoli's door ajar"). */
  c5GardenReckoning(): Effect[] {
    if (this.day !== 802) return [];
    if (!this.c5PickHeld('N5c')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N5c' }];
    }
    return [];
  }

  /** Doc 06 §C5 events 10 + 11 — the terminal (the subway stairs, day
   *  809): Rosa's line verbatim, the Inwood end state, the Map's new
   *  borough-color pin, the Corvus-side pins going gray. */
  c5Terminal(): Effect[] {
    if (this.day !== 809 || this.c0Has(C5_IDS.terminal)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Thanksgiving eve. The city eats; the diner glows; I come up the subway stairs with a duffel bag. From the bodega doorway, Rosa \u2014 to no one, and to everyone: \u201C' + C5_ROSA_TERMINAL_LINE + '\u201D' },
      { kind: 'note', text: 'The Inwood basement: $1,212 in the account, stairs that announce guests, $1,150 a month. The diner job in Long Island City runs through Deshaun\u2019s cousin. The main story\u2019s end state fits on a phone card.' },
      { kind: 'note', text: 'The Map: the Corvus-side pins go gray \u2014 his access, not the buildings \u2014 and a new pin sits alone in a borough-color the map has never used. The chapter\u2019s last diary line writes itself: ' + C5_DAY1_LINE },
    ];
    this.c0Write(out, terminalEntry(this.day));
    this.collectNote('Inwood \u2014 the basement\u2019s pin, alone in a new borough-color');
    this.collectNote('The Corvus-side pins go gray \u2014 his access, not the buildings');
    return out;
  }

  /** The C5→C6 season cut (doc 06 §C5 handoff): the season's montage in
   *  his hand, the handoff staged (snow on the Works' hoarding; the
   *  hall's lights real; JMA's winter drive; the lost cat, still lost),
   *  the cut's entry dated Dec 1, Y3 — and the chapter through
   *  advanceChapter's own door at C6's window start. Plays once per save
   *  (the latch is the entry); a replayed kept Nov 26 gets the wall.
   *  C6's content is the next wave's — the wall holds (the honest
   *  pattern; the roll into C6's stations is the C6 wave's law). */
  c5SeasonCut(): Effect[] {
    if (this.c0Has(C5_CUT_ID)) {
      // the cut has played: the wall answers — and the C6 wave's own
      // law (§7 step 10's last content wave brought the days the cut
      // opens): the FIRST press after the latch rolls into C6's first
      // station (day 814, Dec 1, Y3 — the first dollar, doc 06 §C6's
      // period start) — unless this is a replayed kept Nov 26, which
      // gets the wall and holds, never a roll out of a replay.
      const wall: Effect[] = [{ kind: 'note', text: C5_CUT_WALL }];
      if (this.replayDay) return wall;
      return [...wall, { kind: 'next-day', to: C6_FIRST_DAY }];
    }
    const out: Effect[] = [];
    for (const line of seasonCutMontage(this.fieldDiary)) {
      out.push({ kind: 'note', text: line });
    }
    out.push({ kind: 'note', text: C5_CUT_STAGE });
    out.push({ kind: 'note', text: C5_CUT_WALL });
    this.c0Write(out, c5CutEntry());
    // C6's window opens — the machine's own door, the window-start law
    const adv = advanceChapter(this.chapter, 'C6', {
      day: C5_CUT_DAY,
      triggerHeld: true, // the cut itself is the beat (doc 06 §C5's handoff)
    });
    if (adv.ok) this.chapter = adv.state;
    else this.chapter = touchDay(this.chapter, C5_CUT_DAY);
    out.push({ kind: 'persist' });
    return out;
  }

  /** The C5 compressions (the c4Compression's own shape — the montage
   *  arms, the next press rolls). */
  c5Compression(to: number): Effect[] {
    const comp = c5CompressionFrom(this.day);
    if (!comp || comp.to !== to) return [];
    this.pendingCompressionTo = to;
    return [
      { kind: 'note', text: comp.intro },
      { kind: 'note', text: comp.city },
      { kind: 'note', text: 'One more press, and the days pass.' },
    ];
  }

  // ---- the C6 season's station methods (doc 06 §C6 / doc 12 §2) ----

  /** Whether the pick has landed (the c5PickHeld's own shape — the
   *  pick's ink rides `node` and the c6- prefix; the ledger act is the
   *  second witness; both C6 nodes post, so no flag-only door). */
  private c6PickHeld(nodeId: 'N6' | 'N7'): boolean {
    if (this.fieldDiary.some((e) => e.node === nodeId && e.id.startsWith(`c6-${nodeId.toLowerCase()}-`))) return true;
    if (this.ledger.some((e) => e.node === nodeId)) return true;
    return false;
  }

  /** The ledger's amends column — the machine's own witness that Kev's
   *  fork and the close's verdict read (doc 09 §4's schedule; the C4
   *  Odessa precedent for the act's shape). The stations' rows land
   *  through the canon door each gives: the first dollar (Ada), the
   *  letter (Grace's row, routed), the boiler-watch (Father Mike), the
   *  booth (Verna), the last envelope (Miss Odessa). */
  c6AmendsActs(): number {
    return this.ledger.filter((e) => e.kind === 'amends').length;
  }

  /** One amends row, logged (the C4 act's own shape). */
  private c6Amend(id: string, refs: string[]): void {
    this.logLedgerEntry({
      id,
      kind: 'amends',
      date: dateOfCalendarDay(this.calendarDay),
      refs: [...refs],
      weight: 1,
      visibility: 'private',
    });
  }

  /** Doc 06 §C6 event 1 — the amends ledger's first payment (day 814,
   *  the roll's landing): the schedule's first dollar leaves through
   *  Bea, in the order Ada's note commanded; her three-line answer
   *  arrives on the letter she never opened. The ledger's C6 column
   *  opens with a face on it. */
  c6FirstDollar(): Effect[] {
    if (this.day !== C6_FIRST_DAY || this.c0Has(C6_IDS.firstDollar)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The first payment leaves this morning \u2014 the schedule\u2019s first dollar, through Bea, in the order her note commanded: pay your debts in order. The envelope rides inside pocket, where the cold can\u2019t make it nervous. Rows, not numbers \u2014 that was always the method she was teaching.' },
      { kind: 'note', text: `And the letter came back \u2014 the one from two years ago, the one I never knew she\u2019d kept. Answered in three lines. The first: \u201C${C6_ADA_FIRST_LINE}\u201D The other two lines are hers. They stay hers.` },
      { kind: 'note', text: 'The block\u2019s winter shapes hold their windows: the chain slice\u2019s perpetual noon, the Cecil\u2019s nursing student and her highlighter, the hall\u2019s fit-out glittering behind the fence. Nobody watches me do this. That\u2019s the condition the notebook was built for.' },
    ];
    this.c0Write(out, firstDollarEntry(this.day));
    this.c6Amend('led-c6-first-dollar', ['ada', 'restitution', 'first-dollar']);
    return out;
  }

  /** Doc 12 §4's winter lights + doc 04's "the block keeps a light on"
   *  (day 835): the tin\u2019s ones on the park\u2019s tree, Yoli\u2019s
   *  garden work-weeks on her terms, Eddie\u2019s weekly call and its
   *  diegetic meter. */
  c6Lights(): Effect[] {
    if (this.day !== 835 || this.c0Has(C6_IDS.lights)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'The little park\u2019s tree wears the tin\u2019s strand tonight \u2014 ones, counted at the gold window, strung by the block\u2019s own hands. The chain window burns its corporate noon beside it. Both lights are honest. Only one of them knows what dusk is for.' },
      { kind: 'note', text: 'Yoli\u2019s winter beds go down on her terms, her list, my name second \u2014 mulch, burlap, the rose canes tipped and pegged, no narration. The garden work-weeks are the rebuild\u2019s own church, and her terms are the only liturgy on offer. They\u2019re good terms.' },
      { kind: 'note', text: 'Eddie\u2019s Sunday call ran eleven minutes \u2014 the cousin timed it, the man measures everything now. The meter is diegetic. The meter is kind, which is new.' },
    ];
    this.c0Write(out, lightsEntry(this.day));
    return out;
  }

  /** Doc 07 §2.4 — Kev's fork (day 870): the reference letter to the
   *  union apprenticeship, signed in person, no camera. The machine
   *  reads the ledger\u2019s movement (kevTakesLetter); Grace\u2019s row
   *  is routed through the amends, not cash. Both shelves canon-clean
   *  (doc 09 §5: neither is graded). */
  c6KevFork(): Effect[] {
    if (this.day !== 870 || this.c0Has(C6_IDS.kevFork) || this.c0Has(C6_IDS.kevForkBar)) return [];
    const takes = kevTakesLetter(this.c6AmendsActs());
    const out: Effect[] = [
      { kind: 'note', text: 'The hardest amends is a piece of paper: the reference letter to the union apprenticeship, signed in person, no camera \u2014 worthless on camera, and we both know it. Grace\u2019s fifteen hundred rides routed, not paid: her choice, the right one, the coldest kindest arithmetic of the winter.' },
    ];
    if (takes) {
      out.push({ kind: 'note', text: `The ledger\u2019s movement is the machine\u2019s own witness \u2014 the schedule\u2019s first dollar, the rows that closed before this one. Kev reads the letter twice, and the shelf tips: \u201C${C6_KEV_TAKES_LINE}\u201D` });
      this.c0Write(out, kevForkEntry(this.day));
      this.c6Amend('led-c6-grace-letter', ['grace', 'kev-reference-letter']);
    } else {
      out.push({ kind: 'note', text: `The ledger\u2019s column is empty and the machine reads it honestly \u2014 the letter stays signed, in my jacket, unhandled. Across the street: \u201C${C6_KEV_BAR_LINE}\u201D` });
      this.c0Write(out, kevBarEntry(this.day));
    }
    return out;
  }

  /** Deniz's deposition + Father Mike's boiler-watch close (day 898):
   *  the sworn statement of the C2 meeting, on the record, forever
   *  (doc 07's dial table); four months of nights, the forum apology
   *  read with the number included (doc 09 §4's penance design). */
  c6Deposition(): Effect[] {
    if (this.day !== 898 || this.c0Has(C6_IDS.deposition)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Halcyon\u2019s back office, the good chairs, the recorder\u2019s red dot \u2014 the only audience. The C2 meeting, sworn, for the coalition\u2019s record: the forms, the break, the hand. Deniz runs it like a ledger, no drama, all column. Not money \u2014 what she accepts is the sentence I said out loud when I thought the room was mine.' },
      { kind: 'note', text: 'Father Mike\u2019s four months of boiler-watch end this week \u2014 the parish boiler fund\u2019s arithmetic in radiator heat \u2014 and the apology got read at the Ascension\u2019s forum Wednesday, out loud, the number included, the minutes keeping it forever. The hardest restitution, doc-designed and done.' },
      { kind: 'note', text: 'The coalition\u2019s record gets its affidavit before the hearing\u2019s docket. That\u2019s why the date is the date. Deniz circles her exam\u2019s spring morning on the way out \u2014 the column between us closed, the column in her own life just opening.' },
    ];
    this.c0Write(out, depositionEntry(this.day));
    this.c6Amend('led-c6-boiler-watch', ['father-mike', 'boiler-watch', 'forum-apology']);
    return out;
  }

  /** Doc 12 §2's fixed event — the concessions hearing (day 920): the
   *  Compact papers enter the record, Corvus concedes 220\u2192280 and
   *  the CLT option. Yoli's win \u2014 hers; the testimony optional
   *  (doc 09 §8). Behind the scene: N7. */
  c6Hearing(): Effect[] {
    if (this.day !== C6_HEARING_DAY) return [];
    if (!this.c0Has(C6_IDS.hearing)) {
      const out: Effect[] = [
        { kind: 'note', text: 'The civic row\u2019s room fills with the block\u2019s Sunday clothes, and Yoli runs the Compact papers into the record \u2014 the 1994 files and the new arithmetic, the ghost\u2019s own paperwork testifying for her. Corvus\u2019s side concedes before the vote: two hundred twenty becomes two hundred eighty, and the garden slot takes the land trust option. Her win. Hers. Thirty-eight to sixty-two notwithstanding.' },
        { kind: 'note', text: 'The chair with my name-card is the day\u2019s only open question. The papers don\u2019t need me \u2014 that was always her point. What I do with the chair, the machine reports, and the block notices without texting me about it.' },
      ];
      this.c0Write(out, hearingEntry(this.day));
      return out;
    }
    // the hearing has played: the answer is the pick (once)
    if (!this.c6PickHeld('N7')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N7' }];
    }
    return [];
  }

  /** Doc 12 §2's fixed event — the hall opens (day 948): Juniper
   *  Commons, without him; his stall layout, her lobby, his name in no
   *  brochure. Father Mike tears the parking-lot lease the same morning
   *  (doc 05's load-bearing edge, resolved). */
  c6HallOpens(): Effect[] {
    if (this.day !== 948 || this.c0Has(C6_IDS.hallOpens)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Juniper Commons opens \u2014 the ribbon, the crowd, the real sun, which sets when it sets. My stall layout in the floor plan: the water stations where I drew them, the sight lines where I argued. Her lobby in the light she fought the budget for. My name in no brochure, which is the correct amount of my name.' },
      { kind: 'note', text: 'Father Mike tears the parking-lot lease on the church steps \u2014 one sheet, two steady hands, paper confetti, the parish\u2019s applause, the block\u2019s one compromised edge gone. The sexton sweeps it before lunch, because churches know confetti.' },
      { kind: 'note', text: 'The thing opens, it works, the layout holds the crowd the way I drew it to. The only eulogy the fall needed, and nobody reads it aloud. The sim continues. The light\u2019s on.' },
    ];
    this.c0Write(out, hallOpensEntry(this.day));
    return out;
  }

  /** Doc 09 §7 / doc 10 §3 — Marisol's late offer (day 969): the test.
   *  Behind the scene: N6. Both doors supported, neither graded. */
  c6LateOffer(): Effect[] {
    if (this.day !== 969) return [];
    if (!this.c0Has(C6_IDS.lateOffer)) {
      const out: Effect[] = [
        { kind: 'note', text: 'The plaza, the hall\u2019s shadow, and Marisol with the offer in her bag and no apology in her mouth \u2014 her syntax exact, learned from watching us build: \u201C' + C6_MARISOL_LINE + '\u201D' },
        { kind: 'note', text: 'The chair is real. The salary is real. The exam is the same exam; the production values are better. The register prices all three doors and grades none of them \u2014 that\u2019s the machine\u2019s honesty, and mine.' },
      ];
      this.c0Write(out, lateOfferEntry(this.day));
      return out;
    }
    // the offer has played: the answer is the pick (once)
    if (!this.c6PickHeld('N6')) {
      return [{ kind: 'diary-prompt', pack: 'choice', node: 'N6' }];
    }
    return [];
  }

  /** Doc 12 §2's fixed event — Kestrel Green's hundredth tree (day
   *  990): planted by whoever the player has become; the city\u2019s
   *  diary\u2019s closing note for the arc. El Vann\u2019s album to Eli;
   *  Verna\u2019s row paid at the booth on the walk over. */
  c6HundredthTree(): Effect[] {
    if (this.day !== 990 || this.c0Has(C6_IDS.tree)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'Kestrel Green\u2019s hundredth tree goes in \u2014 a serviceberry, useful and pretty and early to flower \u2014 planted by whoever showed up, second row, no narration. The city\u2019s diary\u2019s closing note for the arc, and the note is a hole in the ground with a young tree over it.' },
      { kind: 'note', text: `El Vann hands Eli the station-stamp album on the walk over \u2014 a hundred-odd stations, the last page a station that never existed \u2014 and says it once: \u201C${'Start late. Finish anyway.'}\u201D Her only sentimental act. She\u2019ll deny it by Thursday.` },
      { kind: 'note', text: 'Verna\u2019s booth took the envelope on the way \u2014 two-three hundred, the row closed, the whistle nod, never once made to feel it. Deon\u2019s haircut landed last week, the arc\u2019s best cut. Sal\u2019s quarters found their jar. The block keeps its own books.' },
    ];
    this.c0Write(out, treeEntry(this.day));
    this.c6Amend('led-c6-verna-booth', ['verna', 'crossing-guard-booth']);
    return out;
  }

  /** Doc 09 §5/§7 — Eddie's floor, the second offer (day 1002): the
   *  exit that is also a home, the persistent option, not an ending.
   *  June\u2019s two shelves and Camille\u2019s letter ride the month\u2019s
   *  prose, each reading the machine\u2019s own flags. */
  c6Floor(): Effect[] {
    if (this.day !== 1002 || this.c0Has(C6_IDS.floor)) return [];
    const juneRestart = this.storyFlagMemo.has('june-conditions=full-disclosure')
      && this.storyFlagMemo.has('c6-condition-handle=therapy');
    const out: Effect[] = [
      { kind: 'note', text: 'Eddie\u2019s floor in Charlotte, offered a second time \u2014 the same floor, kept made, the Sunday call at fourteen minutes, the cousin done timing it, which is its own graduation. The exit that is also a home. A persistent option, not an ending: he can visit, he can stay a season, the city will hold his place the way cities do \u2014 not at all, and completely. Taking it changes the map, not the person.' },
      { kind: 'note', text: juneRestart
        ? 'June\u2019s window burns at the hours the conditions\u2019 arithmetic kept, and the Friday shift at the velvet bar is hers to give \u2014 one shift a week, which in her language is a betrothal. No translation provided.'
        : 'June\u2019s window burns according to its own arithmetic, and the light is the one I know not to look at. Her shelf is the block\u2019s success story. Both outcomes canon-clean; neither a reward.' },
      { kind: 'note', text: 'The pantry\u2019s letter sits on my table in Camille\u2019s handwriting \u2014 logistics volunteer, exact skills, the whole ordinary year the flags witnessed behind it. Not a reconciliation. A reference. Showing up is my entire relationship with her thereafter, and the showing is mine.' },
    ];
    this.c0Write(out, floorEntry(this.day));
    return out;
  }

  /** Doc 09 §8 — the formal close (day 1016's linger, the nine-month
   *  mark): Miss Odessa\u2019s envelope last (the schedule\u2019s final
   *  row, in cash, unopened), The Debts\u2019 verdict, the
   *  self-portrait written or refused (the refusal commented on once,
   *  gently), and the chapter through advanceChapter\u2019s own door into
   *  OPEN \u2014 the terminal continuation the game does not end at
   *  (R15: no endscreen; the ledger rides unchanged). Plays once per
   *  save (the latch is the entry); a replayed kept Jun 21 gets the
   *  wall. The open chapter\u2019s own law: the FIRST press after the
   *  latch rolls into the open sim\u2019s first ordinary morning
   *  (day 1017) \u2014 never a roll out of a replay. */
  c6FormalClose(): Effect[] {
    if (this.c0Has(C6_CLOSE_ID)) {
      const wall: Effect[] = [{ kind: 'note', text: C6_CLOSE_WALL }];
      if (this.replayDay) return wall;
      return [...wall, { kind: 'next-day', to: C6_OPEN_DAY }];
    }
    const out: Effect[] = [];
    // Miss Odessa's envelope — the schedule's last row (doc 09 §4), in
    // cash, unopened; she uses it for the block's winter tree lights,
    // and the city's diary notes the lights, not the debt. The close
    // logs it and reads the verdict after.
    const actsBefore = this.c6AmendsActs();
    this.c6Amend('led-c6-odessa-envelope', ['odessa', 'winter-tree-lights', 'cigar-box']);
    out.push({ kind: 'note', text: 'The cigar box\u2019s last page: Miss Odessa\u2019s envelope, the schedule\u2019s final row, in cash, unopened \u2014 she uses it for the block\u2019s winter tree lights, and the morning note records the lights, not the debt. Rosa\u2019s mail carries Craig\u2019s sticky note from Fort Lauderdale: \u201C' + C6_CRAIG_NOTE + '\u201D No signature needed.' });
    const complete = debtsComplete(actsBefore + 1);
    out.push({ kind: 'note', text: complete ? C6_DEBTS_COMPLETE_LINE : C6_DEBTS_OPEN_LINE });
    // the self-portrait's state: written or refused (both canon-valid)
    const portraits = this.fieldDiary.filter((e) => e.id.startsWith(C6_SELF_PORTRAIT_PREFIX));
    if (portraits.length > 0) {
      out.push({ kind: 'note', text: `The self-portrait stands \u2014 ${portraits.length} version${portraits.length === 1 ? '' : 's'} in the book, append-only, the last one current. The diary\u2019s last main-arc line is the player\u2019s. That was always the design.` });
    } else {
      out.push({ kind: 'note', text: C6_REFUSAL_CITY_LINE + ' The refusal is a canon-valid state, and the notebook\u2019s last main-arc line stays unwritten on purpose.' });
    }
    // the therapy year's close: Feld's registered line surfaces when
    // the year was attended (the C6 canon line, doc 15's register)
    if (this.storyFlagMemo.has('c6-condition-handle=therapy')) {
      out.push({ kind: 'note', text: `The therapy notes close their year, and Feld\u2019s sentence sits where it earned its place: \u201C${C6_FELD_LINE}\u201D` });
    } else {
      out.push({ kind: 'note', text: 'The therapy chair waits, which is its own honest state, and the notes say so without scoring it.' });
    }
    out.push({ kind: 'note', text: C6_CLOSE_STAGE });
    out.push({ kind: 'note', text: C6_CLOSE_WALL });
    this.c0Write(out, c6CloseEntry());
    // OPEN — the terminal continuation, through the machine's own door
    // (doc 14 §2: reachable only from C6; the beat IS the trigger).
    // R15's law: no ending screen; the ledger is never forgotten.
    const adv = advanceChapter(this.chapter, 'OPEN', {
      day: C6_OPEN_DAY,
      triggerHeld: true, // the close itself is the beat (doc 09 §8)
    });
    if (adv.ok) this.chapter = adv.state;
    else this.chapter = touchDay(this.chapter, C6_OPEN_DAY);
    out.push({ kind: 'persist' });
    return out;
  }

  /** The self-portrait (doc 03 §7 — the arc's decision form): composed
   *  from the machine\u2019s own facts \u2014 standing, the amends ledger,
   *  the relationships that repaired or didn\u2019t, the fragments
   *  recovered, the therapy attendance, the contradictions still
   *  standing unstruck (K4 may stand; that is allowed and means
   *  something). Written in his voice, honest to the state it
   *  describes, never grading him. Append-only: each version kept;
   *  once per day (the notebook writes once a day); F8 fires inside
   *  the first one and only there (doc 02 §6.2). */
  writeSelfPortrait(): Effect[] {
    if (!this.isC6 && !this.isOpen) return [];
    const today = dateOfCalendarDay(this.calendarDay);
    if (this.fieldDiary.some((e) => e.id.startsWith(C6_SELF_PORTRAIT_PREFIX)
      && e.date.y === today.y && e.date.m === today.m && e.date.d === today.d)) return [];
    const prior = this.fieldDiary.filter((e) => e.id.startsWith(C6_SELF_PORTRAIT_PREFIX));
    const n = prior.length + 1;
    const restitutionSize = this.storyFlagMemo.has('restitution-size=settle') ? 'settle' as const
      : this.storyFlagMemo.has('restitution-size=fight-and-lose-more') ? 'fight-and-lose-more' as const
      : null;
    const firstChapter = this.storyFlagMemo.has('c6-first-chapter=ledger-pace') ? 'ledger-pace' as const
      : this.storyFlagMemo.has('c6-first-chapter=diner-plus-ledger') ? 'diner-plus-ledger' as const
      : this.storyFlagMemo.has('c6-first-chapter=charlotte-floor') ? 'charlotte-floor' as const
      : null;
    const standing = this.storyFlagMemo.has('c6-standing=garden-reckoning') ? 'garden-reckoning' as const
      : this.storyFlagMemo.has('c6-standing=statement') ? 'statement' as const
      : this.storyFlagMemo.has('c6-standing=silence') ? 'silence' as const
      : null;
    const testimony = this.storyFlagMemo.has('epilogue-taste=testify') ? 'testify' as const
      : this.storyFlagMemo.has('epilogue-taste=refuse') ? 'refuse' as const
      : this.storyFlagMemo.has('epilogue-taste=the-wexler-file') ? 'the-wexler-file' as const
      : null;
    const marisol = this.storyFlagMemo.has('self-portrait-raw-material=accept') ? 'accept' as const
      : this.storyFlagMemo.has('self-portrait-raw-material=decline-and-warn') ? 'decline-and-warn' as const
      : this.storyFlagMemo.has('self-portrait-raw-material=decline') ? 'decline' as const
      : null;
    const input: SelfPortraitInput = {
      day: this.calendarDay,
      money: this.money,
      amendsActs: this.c6AmendsActs(),
      restitutionSize,
      firstChapter,
      standing,
      juneConditions: this.storyFlagMemo.has('june-conditions=full-disclosure'),
      therapy: this.storyFlagMemo.has('c6-condition-handle=therapy'),
      kevTakes: this.c0Has(C6_IDS.kevFork),
      testimony,
      marisol,
      fragmentsRecovered: this.fieldDiary.filter((e) => e.kind === 'RECALL').length,
      k4Unstruck: this.fieldDiary.some((e) => e.id === 'c4-k4-corvus-partner' && e.corrections.length === 0),
      hallOpen: this.day >= 948,
      hearingWon: this.day >= C6_HEARING_DAY,
    };
    const { body } = composeSelfPortrait(input);
    const out: Effect[] = [
      { kind: 'note', text: 'The notebook opens to the last question \u2014 the one the whole system was built for. Nobody assigned it. Nobody will read it. That\u2019s the point of it.' },
    ];
    for (const para of body.split('\n\n')) {
      out.push({ kind: 'note', text: para });
    }
    this.c0Write(out, selfPortraitEntry(n, this.calendarDay, body));
    // F8 — the diary's own birth, its final reveal (doc 02 §6.2): only
    // ever inside the FIRST self-portrait, once per save
    if (n === 1 && !this.c0Has('c6-f8-day1')) {
      this.c0Write(out, c6F8Entry(this.calendarDay));
      out.push({ kind: 'note', text: 'And behind the ink, the notebook\u2019s own birth surfaces once \u2014 a green notebook, a nurse\u2019s handwriting, the words Day 1 dated thirteen months after the year began. The diary remembers itself.' });
    }
    if (prior.length > 0) {
      out.push({ kind: 'note', text: `Version ${n} of the portrait. The old ones stay \u2014 append-only is the law; a man changes, and the book keeps the record of him changing.` });
    }
    return out;
  }

  /** Doc 09 §8's hospitality close (day 1016's slot, the beat before
   *  the linger's formal close): the stranger with the duffel at the
   *  terminal, and a slice on the counter at whatever shop now exists
   *  \u2014 because someone \u2014 Eli, or the new tenants, or a man
   *  named Leo \u2014 kept the ritual. */
  c6Hospitality(): Effect[] {
    if (this.day !== C6_LAST_DAY || this.c0Has(C6_IDS.hospitality)) return [];
    const out: Effect[] = [
      { kind: 'note', text: 'A stranger comes up the subway stairs with a duffel \u2014 the walk, the bag, the squint at the street signs, all of it nine months ago and a whole person ago. Rosa looks at him the way she looked at me, from the bodega doorway, to no one and to everyone.' },
      { kind: 'note', text: 'The chain window has a slice on the counter at open \u2014 free, nobody\u2019s ordering, nobody\u2019s paying, the kid behind the register shrugs like the counter\u2019s always done this. Somebody kept the ritual. Eli, or the new tenants, or a man named Leo. The block knows which names it would pick. The block\u2019s not saying.' },
    ];
    this.c0Write(out, hospitalityEntry(this.day));
    return out;
  }

  /** The C6 compressions (the c5Compression's own shape — the montage
   *  arms, the next press rolls). */
  c6Compression(to: number): Effect[] {
    const comp = c6CompressionFrom(this.day);
    if (!comp || comp.to !== to) return [];
    this.pendingCompressionTo = to;
    return [
      { kind: 'note', text: comp.intro },
      { kind: 'note', text: comp.city },
      { kind: 'note', text: 'One more press, and the days pass.' },
    ];
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
    for (const f of heldFlags) this.storyFlagMemo.add(f);
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
