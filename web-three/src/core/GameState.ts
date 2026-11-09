/**
 * Authoritative gameplay state for Day 1 + Day 2 — ported 1:1 from the
 * original greybox (the migration record: docs/23–24). No rendering, no DOM:
 * the scene graph and the UI only ever *reflect* this state.
 */

import { MAX_DAY, type SaveData } from './Save';
import type { DiaryCounters, DiaryNoted } from './diary';
import { appendEntry, correctEntry, serializeFieldDiary, type FieldDiaryEntry } from './fieldDiary';
import { DEFAULT_STARTER } from './starters';
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
  C0_QUESTION_FREE_ID, seasonCutEntry, C0_CUT_ENTRY_ID_PREFIX,
} from './c0pack';
import {
  C0_BLOCK_IDS, DESHAUN_KIT_ECHO, DESHAUN_KIT_LINES, DESHAUN_SIT_LINE,
  EDDIE_LEASE_ECHO, EDDIE_LEASE_LINE, ODESSA_NOD, ROSA_MANGO_LINE,
  SAM_LAW_LINE, SAM_STILL_DOING_LINE, SURVEYOR_ECHO, SURVEYOR_LINE,
  deshaunEntry, leaseSeenEntry, odessaEntry, surveyorGuessEntry, wobbleEntry,
} from './c0pack';
import { OBJECTIVES, DEFAULT_CART_NAME, itemPickNote, ITEM_STICKERS, D3_ORDERS, D4_ORDERS,
  D3_WAKE_NOTE, D3_KIDDOWN_NOTE, D3_KID_ARRIVED_NOTE, D3_POSTER_NOTE,
  D4_WAKE_NOTE, D4_STRANGER_GREET_NOTE, D4_RUSH_DONE_NOTE, D4_MAP_NOTE,
  D4_SAL_MEET_NOTE, D4_SAL_CHAT_NOTE, D4_PERMIT_OFFER_NOTE, D4_PERMIT_FILED_NOTE,
  D4_PERMIT_ALREADY_NOTE, IDRIS_D3_FAVOR_REACTION, ROSA_FOUR_MORNINGS_NOTE,
  RUSH_CARDS, SOLO_CARDS, RUSH_NOTE_5, USUAL_NOTE,
  IDRIS_NINE_YEARS_NOTE, IDRIS_UNLOCK_NOTE, ROSA_CART_HANDOVER_NOTE,
  ROSA_REGISTER_NOTES, type OrderCard,
  // Days 5–7 (doc 11 §7) + the C0→C1 season cut
  D5_ORDERS, ROAM_WAKE_LINES, ROAM_RUSH_DONE_NOTE,
  C0_CUT_CITY_NOTE, C0_CUT_EDDIE_LINE, C0_CUT_MONTAGE_NOTE,
} from './content';

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
  // ---- Days 5–7 — the stabilized loop (doc 11 §2 beat 11 + §7) ----
  D5_WAKE: 33,
  D5_RUSH: 34,
  D5_ROAM: 35,
  D5_POSTCARD: 36,
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
  | { kind: 'next-day' }
  | { kind: 'day-beyond' }
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
  | { kind: 'diary-prompt'; pack: 'theory' | 'question' }
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

  /** Days 5–7 — the stabilized loop (doc 11 §7). The roam-day gates read
   *  this one flag so the wake/rush wiring can never half-apply. */
  get isDay5(): boolean {
    return this.day >= 5;
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
    [Step.D5_WAKE]: 'cart',
    [Step.D5_RUSH]: 'cart',
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

  /** A serve press at the cart during a morning rush. Starts a brew — no
   *  instant cups. Returns [] when nothing should happen (no order, or a
   *  brew already running: repeated input can never double-serve). */
  startBrew(): Effect[] {
    if (this.brewing) return [];
    if (this.step !== Step.D3_RUSH && this.step !== Step.D4_RUSH && this.step !== Step.D5_RUSH) return [];
    const queue = this.step === Step.D3_RUSH ? D3_ORDERS : this.step === Step.D4_RUSH ? D4_ORDERS : D5_ORDERS;
    const order = queue[this.rushIndex];
    if (!order) return [];
    this.brewing = true;
    return [{ kind: 'brew-start' }];
  }

  /** The brew timer ran out (Game owns the clock). Pays, reacts, queues the
   *  next order — or opens the day's next beat when done. */
  completeBrew(): Effect[] {
    if (!this.brewing) return [];
    this.brewing = false;
    const day4 = this.step === Step.D4_RUSH;
    const day5 = this.step === Step.D5_RUSH;
    const queue = day5 ? D5_ORDERS : day4 ? D4_ORDERS : D3_ORDERS;
    const order = queue[this.rushIndex];
    if (!order) return [];
    this.rushIndex += 1;
    const out: Effect[] = [{ kind: 'serve-customer' }, ...this.earn(order.pay)];
    if (this.rushIndex >= queue.length) {
      if (day5) {
        out.push({ kind: 'note', text: ROAM_RUSH_DONE_NOTE });
        out.push(...this.setStep(Step.D5_ROAM));
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
      const favor = !day4 && !day5 && order.who === 'idris' && this.kidKept;
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

  // ---------------------------------------------------- Days 5–7 (doc 11 §7) ----
  // "The loop stabilizes — open, rush, roam, wind-down, postcard." No new
  // scripted stranger, no new purchases: the day belongs to the block (the
  // laundry, the board, the fence, the counter — the block layer's hooks
  // live here), and the wind-down rides the shipped climb → postcard → rail
  // chain. Day 7's night runs the season cut (rail → seasonCut).

  /** Rosa's open, keyed to the day's own news; the rush opens behind it —
   *  Idris first, like every day (the stabilized loop's constant). */
  rosaD5Wake(): Effect[] {
    if (this.step !== Step.D5_WAKE) return [];
    const out: Effect[] = [
      { kind: 'note', text: ROAM_WAKE_LINES[Math.min(2, Math.max(0, this.day - 5))] },
      ...this.setStep(Step.D5_RUSH),
      // Idris opens the rush — the regulars are the news that matters
      { kind: 'spawn-customer', who: 'idris', x: 4, z: -4.6 },
    ];
    return out;
  }

  /** The season cut — doc 11 §7's interstitial, R4's named transition.
   *  The diary montage (the week's entries in his hand), the city's first
   *  morning-after note (verbatim), then Monday, 6 a.m., Eddie at the door
   *  (verbatim). The postcard is the day's own fire-escape dusk — already
   *  taken. The cut consumes one calendar day: the spine's chapter touches
   *  day 8 (Sept 16) and C1's window opens (the rails wait for their wave —
   *  R1's law: observable in the city diary, never a banner). The latch is
   *  the diary (the montage's stable id): a replayed Day 7 never cuts twice. */
  private seasonCut(): Effect[] {
    if (this.hasDiaryEntryWithPrefix(C0_CUT_ENTRY_ID_PREFIX)) return [{ kind: 'day-beyond' }];
    const out: Effect[] = [
      { kind: 'note', text: C0_CUT_MONTAGE_NOTE },
      { kind: 'note', text: `The city\u2019s first morning-after note: \u201C${C0_CUT_CITY_NOTE}\u201D` },
      { kind: 'note', text: `Monday, 6 a.m. Eddie, at the door: \u201C${C0_CUT_EDDIE_LINE}\u201D` },
    ];
    // the montage, in his hand — dated the cut's morning (day 8, Sept 16)
    this.c0Write(out, seasonCutEntry(this.calendarDay + 1));
    // the boundary itself: the chapter consumes the calendar day through
    // the machine's own door (advanceChapter). The cut IS the authored
    // trigger — the beat is playing as this code runs — and the window +
    // minimum-days laws still get their say (day 8 ≥ C1's start; C0 lived
    // its seven days). The rails re-evaluate at the next walk — C1's
    // content is the C1 wave's to bring.
    const adv = advanceChapter(this.chapter, 'C1', {
      day: this.calendarDay + 1,
      triggerHeld: true, // the cut itself is the beat (doc 11 §7's interstitial)
    });
    if (adv.ok) this.chapter = adv.state;
    else this.chapter = touchDay(this.chapter, this.calendarDay + 1);
    return out;
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
    if (this.day < MAX_DAY) return [{ kind: 'next-day' }];
    // Day 7's night is the C0→C1 season cut (doc 11 §7, R4's named
    // transition): the interstitial runs, the chapter consumes the calendar
    // day, and the latch keeps a replayed week from cutting twice. After
    // the cut, the wall holds honestly — day 8 is C1's, and C1 is the next
    // wave's to build.
    return this.seasonCut();
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
