/**
 * Authoritative gameplay state for Day 1 + Day 2 — ported 1:1 from
 * greybox-godot/scripts/main.gd (the behavior oracle). No rendering, no DOM:
 * the scene graph and the UI only ever *reflect* this state.
 */

import { MAX_DAY, type SaveData } from './Save';
import { OBJECTIVES, DEFAULT_CART_NAME, itemPickNote, D3_ORDERS, D4_ORDERS,
  D3_WAKE_NOTE, D3_KIDDOWN_NOTE, D3_KID_ARRIVED_NOTE, D3_POSTER_NOTE,
  D4_WAKE_NOTE, D4_STRANGER_GREET_NOTE, D4_RUSH_DONE_NOTE, D4_MAP_NOTE } from './content';

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
  // ---- Day 4 — "Say Hi" (docs/29) ----
  D4_WAKE: 24,
  D4_STRANGER: 25,
  D4_RUSH: 26,
  D4_MAP: 27,
  D4_CLIMB4: 28,
  D4_POSTCARD: 29,
  DONE: 30,
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
  | { kind: 'persist' };

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
  // ---- Day 4 ----
  mapGiven = false;       // the Map changed hands
  strangerMet = false;    // you said the thing Rosa said
  strangerAtCart = false; // she finished walking your first walk

  get isDay2(): boolean {
    return this.day >= 2;
  }

  get isDay3(): boolean {
    return this.day >= 3;
  }

  get isDay4(): boolean {
    return this.day >= 4;
  }

  objectiveText(): string {
    if (this.step === Step.DONE) return `Day ${this.day} is done.`;
    return OBJECTIVES[this.step] ?? '';
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

  isRelevant(id: string): boolean {
    switch (id) {
      case 'rosa':
        return this.step === Step.MEET_ROSA || (this.isDay2 && this.step <= Step.D2_CLIMB2)
          || (this.isDay3 && this.step >= Step.D3_WAKE && this.step <= Step.D3_CLIMB3)
          || (this.isDay4 && this.step >= Step.D4_WAKE && this.step <= Step.D4_MAP);
      case 'kid':
        return this.step === Step.D3_KIDDOWN && !this.kidDown;
      case 'poster':
        return this.step === Step.D3_POSTER;
      case 'stranger':
        return this.step === Step.D4_STRANGER
          || (this.step === Step.D4_MAP && this.strangerAtCart);
      case 'counter':
        return this.step === Step.RUSH;
      case 'idris':
        return this.step === Step.D2_IDRIS && this.idrisArrived;
      case 'stoop':
        return this.step === Step.D2_DELIVER;
      case 'rail':
        return this.step === Step.POSTCARD || this.step === Step.D2_POSTCARD || this.step === Step.D3_POSTCARD
          || this.step === Step.D4_POSTCARD
          || (this.step === Step.DONE && this.lingerStage >= 1);
      case 'cart':
        if (this.step === Step.CLAIM_CART || this.step === Step.SOLO || this.step === Step.D2_LUNCH
          || this.step === Step.D3_RUSH || this.step === Step.D3_STOOL
          || this.step === Step.D4_RUSH) return true;
        return (this.isDay2 && this.step >= Step.D2_WAKE && this.step < Step.D2_POSTCARD)
          || (this.isDay3 && this.step >= Step.D3_WAKE && this.step < Step.D3_POSTCARD)
          || (this.isDay4 && this.step >= Step.D4_WAKE && this.step < Step.D4_POSTCARD);
      default:
        return id.startsWith('item_') && this.step === Step.COLLECT;
    }
  }

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
    if (this.step === Step.ENTER_BODEGA) return this.setStep(Step.COLLECT);
    return [];
  }

  collect(id: string): Effect[] {
    if (this.step !== Step.COLLECT || !this.itemsLeft.has(id)) return [];
    this.itemsLeft.delete(id);
    const out: Effect[] = [
      { kind: 'collect', id },
      // playtest 2026-10-29: picking used to be silent — say what was taken
      { kind: 'note', text: itemPickNote(id, this.itemsLeft.size) },
    ];
    if (this.itemsLeft.size === 0) {
      out.push(...this.setStep(Step.RUSH));
      out.push({ kind: 'spawn-customer', who: 'rush', x: -18.0, z: 11.0 });
    }
    return out;
  }

  serveCounter(): Effect[] {
    if (this.step !== Step.RUSH) return [];
    this.rushServed += 1;
    const out: Effect[] = [{ kind: 'serve-customer' }, ...this.earn(5)];
    if (this.rushServed === 1) out.push({ kind: 'note', text: 'Regular coffee = milk, two sugars. Nobody knows why. It\u2019s just true.' });
    if (this.rushServed === 3) out.push({ kind: 'note', text: '\u201CRegular\u201D also means small. The city likes its words efficient.' });
    if (this.rushServed >= 5) {
      out.push({ kind: 'note', text: 'Five orders. One apron that still smelled like mangoes. The city let me keep up.' });
      out.push(...this.setStep(Step.CROSS));
    } else {
      out.push({ kind: 'spawn-customer', who: 'rush', x: -18.0, z: 11.0 + this.rushServed * 0.3 });
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

  claimCart(): Effect[] {
    if (this.step !== Step.CLAIM_CART) return [];
    return [{ kind: 'name-cart-open' }, ...this.setStep(Step.NAME_CART)];
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

  spawnSoloCustomer(): Effect[] {
    const isIdris = this.soloServed === 2;
    const out: Effect[] = [{ kind: 'spawn-customer', who: isIdris ? 'idris' : 'solo', x: 4, z: -4.6 }];
    if (isIdris) out.push({ kind: 'note', text: 'Mr. Idris: \u201CCoffee. Regular. I\u2019ll be back tomorrow.\u201D' });
    return out;
  }

  serveCart(): Effect[] {
    if (this.step === Step.SOLO) {
      this.soloServed += 1;
      const out: Effect[] = [{ kind: 'serve-customer' }];
      if (this.soloServed >= 3) {
        out.push({ kind: 'note', text: 'The usual is a tiny love letter. It means: I come here, and you noticed.' });
        out.push(...this.setStep(Step.CLIMB));
      } else {
        out.push(...this.spawnSoloCustomer());
      }
      return out;
    }
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
    if (this.step !== Step.D3_RUSH && this.step !== Step.D4_RUSH) return [];
    const queue = this.step === Step.D3_RUSH ? D3_ORDERS : D4_ORDERS;
    const order = queue[this.rushIndex];
    if (!order) return [];
    this.brewing = true;
    return [{ kind: 'brew-start' }];
  }

  /** The brew timer ran out (Game owns the clock). Pays, reacts, queues the
   *  next order — or sends the kid down / opens the Map beat when done. */
  completeBrew(): Effect[] {
    if (!this.brewing) return [];
    this.brewing = false;
    const day4 = this.step === Step.D4_RUSH;
    const queue = day4 ? D4_ORDERS : D3_ORDERS;
    const order = queue[this.rushIndex];
    if (!order) return [];
    this.rushIndex += 1;
    const out: Effect[] = [{ kind: 'serve-customer' }, ...this.earn(order.pay)];
    if (this.rushIndex >= queue.length) {
      if (day4) {
        out.push({ kind: 'note', text: D4_RUSH_DONE_NOTE });
        out.push(...this.setStep(Step.D4_MAP));
      } else {
        out.push({ kind: 'note', text: 'Four orders. The urn is warm, the stool fund is real, and the corner is starting to say so back.' });
        out.push(...this.setStep(Step.D3_KIDDOWN));
        out.push({ kind: 'kid-down' });
      }
    } else {
      out.push({ kind: 'note', text: order.reaction });
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
   *  the send-off line once she's under way). */
  giveMap(): Effect[] {
    if (this.step !== Step.D4_MAP || !this.strangerAtCart || this.mapGiven) return [];
    this.mapGiven = true;
    return [
      { kind: 'note', text: D4_MAP_NOTE },
      { kind: 'stranger-departs' },
      ...this.setStep(Step.D4_CLIMB4),
      { kind: 'persist' },
    ];
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
    out.push(...this.advanceDay2());
    return out;
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
    return [{ kind: 'day-beyond' }];
  }

  dismissPostcard(): Effect[] {
    this.lingerStage = 1;
    return [{ kind: 'note', text: 'Stay a while. The window is in no rush.' }];
  }

  snapshotForSave(): SaveData | null {
    if (this.day < 2) return null;
    return {
      day: this.day,
      day_complete: this.dayComplete,
      replay: this.replayDay,
      cart_name: this.cartName,
      money: this.money,
      awning: this.awningUp,
      kid_kept: this.kidKept,
      idris_served: this.idrisServed,
      lunch_served: this.lunchServed,
      day_start_money: this.dayStartMoney,
      stool: this.stoolUp,
      map_given: this.mapGiven,
    };
  }
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
    ];
    return { text: lines4[s.rosaChatI % 2], nextChatIndex: (s.rosaChatI + 1) % 2 };
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
