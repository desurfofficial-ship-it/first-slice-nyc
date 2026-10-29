/**
 * Authoritative gameplay state for Day 1 + Day 2 — ported 1:1 from
 * greybox-godot/scripts/main.gd (the behavior oracle). No rendering, no DOM:
 * the scene graph and the UI only ever *reflect* this state.
 */

import { MAX_DAY, type SaveData } from './Save';
import { OBJECTIVES, DEFAULT_CART_NAME, itemPickNote } from './content';

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
  DONE: 17,
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
  lingerStage = 0;            // 0 postcard up · 1 lingering · 2 Rosa said goodnight
  awningConfirm = false;
  rosaChatI = 0;
  cartName = '';
  itemsLeft = new Set<string>(['mango', 'coffee', 'bread']);
  rushServed = 0;
  soloServed = 0;
  elapsed = 0;                // day clock (pause when step >= POSTCARD-style DONE states)
  onDay2 = false;             // day >= 2 shorthand kept in sync by beginDay

  get isDay2(): boolean {
    return this.day >= 2;
  }

  objectiveText(): string {
    if (this.step === Step.DONE) return `Day ${this.day} is done.`;
    return OBJECTIVES[this.step] ?? '';
  }

  setStep(s: Step): Effect[] {
    this.step = s;
    return [{ kind: 'step', step: s }];
  }

  // ---------------- money (main.gd `_earn` / `_set_money`) ----------------

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

  // ---------------- interaction relevance (main.gd `_is_relevant`) ----------------

  isRelevant(id: string): boolean {
    switch (id) {
      case 'rosa':
        return this.step === Step.MEET_ROSA || (this.isDay2 && this.step <= Step.D2_CLIMB2);
      case 'counter':
        return this.step === Step.RUSH;
      case 'idris':
        return this.step === Step.D2_IDRIS && this.idrisArrived;
      case 'stoop':
        return this.step === Step.D2_DELIVER;
      case 'rail':
        return this.step === Step.POSTCARD || this.step === Step.D2_POSTCARD
          || (this.step === Step.DONE && this.lingerStage >= 1);
      case 'cart':
        if (this.step === Step.CLAIM_CART || this.step === Step.SOLO) return true;
        return this.isDay2 && this.step >= Step.D2_WAKE && this.step <= Step.D2_CLIMB2;
      default:
        return id.startsWith('item_') && this.step === Step.COLLECT;
    }
  }

  // ---------------- interactions (main.gd `_try_interact`) ----------------
  // Positions live with the orchestrator; this returns the resulting effects.

  tryRosa(): Effect[] {
    if (this.step === Step.MEET_ROSA) {
      return [
        { kind: 'note', text: 'Rosa: \u201CHoney, your Map is upside down. Come on, I\u2019ll show you.\u201D' },
        { kind: 'rosa-moved-behind-counter' },
        ...this.setStep(Step.ENTER_BODEGA),
      ];
    }
    return []; // Day 2 chat/favor is routed through rosaTask()
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
    const out: Effect[] = [
      { kind: 'note', text: atStrip
        ? 'The Shuffle: walk toward the gaps. Brushing someone is correct. They say \u201Cscuse me.\u201D That is the dance.'
        : 'You found your own way across. The crosswalk still likes you.' },
      { kind: 'crossed', atStrip, checkpoint: { x: 4, z: -4.5 } },
      ...this.setStep(Step.CLAIM_CART),
    ];
    return out;
  }

  claimCart(): Effect[] {
    if (this.step !== Step.CLAIM_CART) return [];
    return [{ kind: 'name-cart-open' }, ...this.setStep(Step.NAME_CART)];
  }

  /** main.gd `_confirm_name` — empty names fall back to "First Slice". */
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

  /** Who the current solo customer is: third one is Mr. Idris (spawn index 2). */
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

  /** Day 2 awning purchase at the cart (main.gd `_awning_offer`). */
  cartAwningInteraction(): Effect[] {
    if (!this.awningConfirm) {
      this.awningConfirm = true;
      return [{ kind: 'awning-offer' }];
    }
    this.awningConfirm = false;
    this.awningUp = true;
    return [{ kind: 'awning-up' }, ...this.spend(15), ...this.advanceDay2()];
  }

  // ---------------- day 2 flow (main.gd `_advance_day2`) ----------------

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
      const effects: Effect[] = [
        { kind: 'note', text: 'Rosa: \u201CThe kid in the gold window watches your corner all day. Take him a regular? Milk, two sugars \u2014 you know the words now.\u201D' },
        { kind: 'cup-given' },
        ...this.setStep(Step.D2_DELIVER),
      ];
      return { effects };
    }
    // Stateful chat lines
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

  // ---------------- save snapshots (main.gd `_persist` / `_begin_day`) ----------------

  /** Day 1 never writes (save.gd rule). */
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
    };
  }
}

function rosaChatLineOf(s: GameState): { text: string; nextChatIndex: number } {
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
