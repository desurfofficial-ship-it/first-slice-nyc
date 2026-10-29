/**
 * All game text — verbatim from the reference implementation (greybox-godot/scripts/main.gd)
 * and the design docs (Doc 02 first-session walkthrough, Doc 08 Day 1 content pack,
 * Doc 22 Day 2). Text is content: it does not get paraphrased during a migration.
 *
 * Recorded additions beyond the reference (playtest 2026-10-29, Doc 24 §5):
 * the shelf items are named on screen and in the objective, and picking one
 * says what you picked. The reference was silent on all three counts.
 */

import type { GameState } from './GameState';

/** Objective line per step (main.gd `_set_step`). */
export const OBJECTIVES: Record<number, string> = {
  0:  'Someone by the terminal is waving at you.',                       // MEET_ROSA
  1:  'Follow Rosa — she\u2019s heading for the bodega with the warm window.',  // ENTER_BODEGA
  2:  'Rosa needs three things from the back shelf: a mango, coffee, and bread.', // COLLECT
  3:  'The rush is here. Serve at the counter.',                         // RUSH
  4:  'Your corner is across the street. Use the crosswalk.',            // CROSS
  5:  'That empty corner is waiting. Walk up to it.',                    // CLAIM_CART
  6:  'Give your cart a name.',                                          // NAME_CART
  7:  'Your first customers. Serve at your cart.',                       // SOLO
  8:  'Rosa says the fire escape has the best seat. Climb.',             // CLIMB
  9:  '',                                                                // POSTCARD
  10: 'Morning. The regulars are waiting.',                              // D2_WAKE
  11: 'Mr. Idris is on his way. The usual.',                             // D2_IDRIS
  12: 'Rosa is out front with a favor to ask.',                          // D2_TASK
  13: 'Take the kid his regular. The teal door across the street.',      // D2_DELIVER
  14: 'Lunch. The shade is working — three at the cart.',                // D2_LUNCH
  15: 'Dusk soon. The awning kit leans against the cart if you want it — $15. Fire escape when ready.', // D2_CLIMB2 (RN-4: the objective points at the awning too)
  16: '',                                                                // D2_POSTCARD
  // ---- Day 3 — "A Place at the Corner" (docs/28) ----
  17: 'Rosa is at your cart with news.',                                 // D3_WAKE
  18: 'The morning rush. Serve at your cart.',                           // D3_RUSH
  19: 'The kid is coming down for the first time. Walk him to your corner.', // D3_KIDDOWN
  20: 'A stool leans against the cart. [Space] at the cart to put it up.', // D3_STOOL
  21: 'Rosa says a flyer went up by the subway stairs. Go see.',         // D3_POSTER
  22: 'Fire escape at dusk. The best seat is yours by habit now.',       // D3_CLIMB3
  23: '',                                                                // D3_POSTCARD
  // ---- Day 4 — "Say Hi" (docs/29) + "The Block Opens Up" (docs/30) ----
  24: 'Rosa is at your cart. She has that look again.',                  // D4_WAKE
  25: 'Someone new is standing by the terminal. You know that spot. Go say hi.', // D4_STRANGER
  26: 'The morning rush. Serve at your cart — she\u2019s watching from the sidewalk. That\u2019s how the city teaches.', // D4_RUSH
  27: 'She\u2019s walking your first walk \u2014 meet her at the cart. There\u2019s something you can give her that isn\u2019t coffee.', // D4_MAP
  28: 'The kid has a point. Sunrise Laundry is two doors from Rosa\u2019s — the open bay with the washers.', // D4_LAUNDRY
  29: 'The washers are going. There\u2019s a notice by the crosswalk — the city posts things where you\u2019ll read them.', // D4_PERMIT
  30: 'Fire escape at dusk. The best seat is yours by habit now.',       // D4_CLIMB4
  31: '',                                                                // D4_POSTCARD
};

export const MAP_NOTE_BOOT = 'You are here. That\u2019s enough.'; // Doc 08 note #1

/** Postcard caption composer (main.gd `_compose_postcard`). */
export function composeCaption(s: {
  day: number; replay: boolean; dayStartMoney: number; money: number; cartName: string;
}): string {
  if (s.day >= 4) {
    if (s.replay) {
      return (
        'Day 4, again. The Map works better upside down. Ask anyone.\n' +
        'The receipt is still on the cart.\n\n' +
        `\u2014 ${s.cartName}, Day 4`
      );
    }
    return (
      `Day 4. $${s.dayStartMoney} \u2192 $${s.money}.\n` +
      'Met: her. The Map changed hands.\n' +
      'Filed: the permit. The corner is a business now.\n' +
      'The light stays.\n\n' +
      `\u2014 ${s.cartName}, Day 4`
    );
  }
  if (s.day >= 3) {
    if (s.replay) {
      return (
        'Day 3, again. The stool is still warm. That is the whole point of a stool.\n\n' +
        `\u2014 ${s.cartName}, Day 3`
      );
    }
    return (
      `Day 3. $${s.dayStartMoney} \u2192 $${s.money}.\n` +
      'Met: the block. The kid came down from the window.\n' +
      'The corner keeps you now.\n\n' +
      `\u2014 ${s.cartName}, Day 3`
    );
  }
  if (s.day <= 1) {
    return (
      `Day 1. $${s.dayStartMoney} \u2192 $${s.money}.\n` +
      'Met: Rosa. Idris. Learned: the usual is a tiny love letter.\n' +
      'The regulars are waiting.\n\n' +
      `\u2014 ${s.cartName}, Day 1`
    );
  }
  if (s.replay) {
    return (
      'Day 2, again. Some days you don\u2019t earn \u2014 you just get to keep.\n\n' +
      `\u2014 ${s.cartName}, Day 2`
    );
  }
  return (
    `Day 2. $${s.dayStartMoney} \u2192 $${s.money}.\n` +
    'Met: the kid. The corner knows you back now.\n' +
    'The regulars are waiting.\n\n' +
    `\u2014 ${s.cartName}, Day 2`
  );
}

/** Rosa's stateful Day 2 lines (main.gd `_rosa_chat`). */
export function rosaChatLine(s: {
  step: number; idrisServed: boolean; kidKept: boolean; awningUp: boolean;
  cartName: string; chatIndex: number;
}): { text: string; nextChatIndex: number } {
  if (s.step === 12 /* D2_TASK */) {
    return {
      text: 'Rosa: \u201CThe kid in the gold window watches your corner all day. Take him a regular? Milk, two sugars \u2014 you know the words now.\u201D',
      nextChatIndex: s.chatIndex,
    };
  }
  if (!s.idrisServed) {
    return {
      text: `Rosa: \u201C${s.cartName}. It\u2019s ugly. So was mine, once. Good.\u201D She means the cart. It\u2019s a compliment.`,
      nextChatIndex: s.chatIndex,
    };
  }
  if (!s.kidKept) {
    return {
      text: 'Rosa: \u201CHe\u2019s shy before noon. The regular\u2019s on me \u2014 carry it over when you get a minute.\u201D',
      nextChatIndex: s.chatIndex,
    };
  }
  if (!s.awningUp) {
    return {
      text: 'Rosa: \u201CAn awning. One summer in and you\u2019re already fancier than me.\u201D',
      nextChatIndex: s.chatIndex,
    };
  }
  const lines = [
    'Rosa: \u201CThe tomatoes are still salted wrong. Don\u2019t you dare change it.\u201D',
    'Rosa: \u201CTwo windows now. Two. I saw it from the counter.\u201D',
  ];
  return { text: lines[s.chatIndex % 2], nextChatIndex: (s.chatIndex + 1) % 2 };
}

/** Rush notes (main.gd `_try_interact`, counter branch) — Doc 08 notes #2 and #3. */
export const RUSH_NOTE_1 = 'Regular coffee = milk, two sugars. Nobody knows why. It\u2019s just true.';
export const RUSH_NOTE_3 = '\u201CRegular\u201D also means small. The city likes its words efficient.';
export const RUSH_NOTE_5 = 'Five orders. One apron that still smelled like mangoes. The city let me keep up.';

export const CROSS_NOTE_STRIP =
  'The Shuffle: walk toward the gaps. Brushing someone is correct. They say \u201Cscuse me.\u201D That is the dance.';
export const CROSS_NOTE_OWN_WAY = 'You found your own way across. The crosswalk still likes you.';

export const NAME_NOTE = 'Your corner. Your name. The city wrote it down with you.';   // Doc 08 note #11
export const USUAL_NOTE = 'The usual is a tiny love letter. It means: I come here, and you noticed.'; // Doc 08 note #10
export const IDRIS_SPAWN_NOTE = 'Mr. Idris: \u201CCoffee. Regular. I\u2019ll be back tomorrow.\u201D';

export const TOP_NOTE_DAY1 = 'Stoop = outdoor living room. You\u2019re invited. That\u2019s the important part.'; // Doc 08 note #9
export const TOP_NOTE_DAY2 = 'Same seat. The city kept it warm for you.';

export const LINGER_NOTE = 'Stay a while. The window is in no rush.';
export const LINGER_OBJECTIVE = 'Stay as long as you like. The rail is a good spot. [Space] there when you\u2019re ready for tomorrow.';
export const RAIL_GOODNIGHT_NOTE =
  'Across the street, Rosa\u2019s window warms. \u201CGood night, coffee,\u201D she says \u2014 to you or the city, hard to tell.';

export const LADDER_HINT_OBJECTIVE = 'The fire escape, around the corner. Rosa will not let this go.';
export const LADDER_HINT_NOTE =
  'Rosa, from somewhere behind you: \u201CFire escape! Around the corner! You found it once!\u201D';

export const REPLAY_NOTE = 'Replaying a day you kept. The coffee\u2019s on the house today.';
export const AWNING_OFFER_NOTE = 'An awning kit leans against the cart, teal like Rosa\u2019s. $15, cash. [Space] again to put it up.';
export const AWNING_UP_NOTE = 'The awning goes up with a sound like a sail. Shade. People linger. Lingering people order a second cup.';
export const DAY_BEGIN_NOTE = (n: number) => `Day ${n}. The cart is still yours. That part never resets.`;
export const DAY_DONE_OBJECTIVE = (day: number) => `Day ${day} is done.`;

export const LUNCH_NOTE_1 = 'Lunch crowd: \u201COne regular. And whatever the awning is doing \u2014 keep doing it.\u201D';
export const LUNCH_NOTE_2 = 'Lunch crowd: \u201CYou\u2019re the one lighting windows, right? My kid talks about your corner.\u201D';
export const LUNCH_NOTE_3 = 'Three more orders. The corner is starting to know you back.';

export const IDRIS_SERVE_NOTE_NO_AWNING =
  'Mr. Idris: \u201CTold you I\u2019d be back. The usual.\u201D It tastes the same as yesterday. That\u2019s the point.';
export const IDRIS_SERVE_NOTE_AWNING =
  'Mr. Idris: \u201CTold you I\u2019d be back. The usual.\u201D He leaves a dollar extra under the cup. Shade is service.';
export const KID_DELIVER_NOTE =
  'The kid: \u201CYou\u2019re the cart. I watch the cart.\u201D Exact change, and one fact about the trains. The kid pays in both.';
export const KID_WAVE_NOTE =
  'The kid waves from the window you lit. The lamp next door flickers, thinks about it, and stays on too.';
export const DAY_BEYOND_NOTE = (n: number) =>
  `Day ${n} is still being written. The light stays a little longer.`;
export const ROSA_GREET_NOTE =
  'Rosa: \u201CHoney, your Map is upside down. Come on, I\u2019ll show you.\u201D';

/** Shelf items, named — the shelf stopped being three anonymous cubes. */
export const ITEM_LABELS: Record<string, string> = {
  mango: 'Mango',
  coffee: 'Coffee',
  bread: 'Bread',
};

/** One flavor line per item, order-independent (the shelf is picked in any order). */
const ITEM_FLAVOR: Record<string, string> = {
  mango: 'Heavy for its size — that\'s how you know it\'s a good one.',
  coffee: 'The tin with the faded label — the one the regulars ask for.',
  bread: 'Still warm from the morning tray.',
};

/** What picking something says out loud — nobody wonders what they just took. */
export function itemPickNote(id: string, leftAfter: number): string {
  const label = (ITEM_LABELS[id] ?? id).toLowerCase();
  const flavor = ITEM_FLAVOR[id] ?? '';
  if (leftAfter === 2) return `The ${label}. ${flavor} Two more to find.`;
  if (leftAfter === 1) return `The ${label}. ${flavor} One more.`;
  return `The ${label}. ${flavor} That's three — “Perfect,” Rosa says, and the bell over the door rings.`;
}

/** Prompt verbs (main.gd `_update_prompt`). */
export function promptVerb(id: string, s: GameState): string {
  switch (id) {
    case 'rosa': return 'Say hi';
    case 'counter': return 'Serve';
    case 'idris': return 'Serve the usual';
    case 'stoop': return 'Deliver';
    case 'kid': return 'Walk with him';
    case 'poster': return 'Read the flyer';
    case 'stranger': return 'Say hi';
    case 'laundry':
      return s.step === 28 /* D4_LAUNDRY */ ? 'Hand the apron'
        : s.step === 29 /* D4_PERMIT */ ? 'Ask Sal'
        : 'Say hi';
    case 'permit':
      return s.permitConfirm ? 'File \u2014 $10' : 'Read the notice';
    case 'rail': return s.lingerStage <= 1 ? 'Stay a while' : 'Tomorrow';
    case 'cart':
      if (s.step === 5 /* CLAIM_CART */) return 'Claim corner';
      if (s.step === 7 /* SOLO */ || s.step === 14 /* D2_LUNCH */) return 'Serve';
      if (s.step === 18 /* D3_RUSH */ || s.step === 26 /* D4_RUSH */) return s.brewing ? BREWING_PROMPT : 'Serve';
      if (s.step === 20 /* D3_STOOL */) return 'Stool \u2014 $10';
      if (s.day >= 2 && !s.awningUp && s.money >= 15) return 'Awning \u2014 $15';
      return 'Serve';
    case 'item_mango': return 'Take the mango';
    case 'item_coffee': return 'Take the coffee';
    case 'item_bread': return 'Take the bread';
    default: return 'Take'; // anything else on a shelf
  }
}

export const DEFAULT_CART_NAME = 'First Slice';

// ---------------------------------------------------------------- Day 3 ----

export const D3_WAKE_NOTE =
  'Rosa: \u201CThree windows light up when you work. The block noticed.\u201D She taps the counter. \u201CToday the block says thanks. And \u2014 he\u2019s coming down. The kid. First time since you got here.\u201D';
export const D3_WAKE_ACCEPTED_NOTE =
  'Morning three. The corner has a shape now \u2014 yours.';

export const D3_KIDDOWN_NOTE =
  'The kid, at the bottom of the stoop: \u201CYou\u2019re taller down here.\u201D He falls in beside you like it\u2019s a thing they do.';
export const D3_KID_ARRIVED_NOTE =
  'The kid: \u201CSo this is the corner from the ground. It\u2019s better. You can smell it.\u201D';

export const STOOL_OFFER_NOTE =
  'A stool leans against the cart \u2014 the good kind, painted teal. $10, cash. [Space] again to set it up.';
export const STOOL_UP_NOTE =
  'The stool sits down at the corner of the counter. The kid sits down on the stool. Two things that were always going to happen.';

export const D3_POSTER_NOTE =
  'A flyer, still wet at the corners: your cart, someone\u2019s photo, and \u201CBEST CORNER COFFEE \u2014 as voted by everyone who was asked.\u201D You were asked by nobody. It went up anyway.';

export const D3_CLIMB_NOTE =
  'Same stairs. Your legs know the count now.';
export const D3_GOLDEN_NOTE =
  'From up here, the corner looks kept. The stool is small and exactly the right size. The kid waves up without looking away from the cart.';

export const DAY3_BEGIN_NOTE = 'Day 3. The cart is still yours. The corner is starting to say so back.';

/** The morning-rush order queue — who, what the bubble says, what serving pays,
 *  and the note when their cup changes hands. Idris opens; canon names only. */
export interface D3Order {
  who: 'idris' | 'rush';
  bubble: string;      // world-space order bubble (short, readable)
  pay: number;
  reaction: string;    // note on serve
}
export const D3_ORDERS: D3Order[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThird day. Same cup. That\u2019s how you know a place is real.\u201D',
  },
  {
    who: 'rush',
    bubble: '2\u00D7 REGULAR',
    pay: 8,
    reaction: 'The lunch parent: \u201COne\u2019s for the kid at the window. He talks about your corner.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The early shift: \u201CLarge, black, no sugar. I\u2019ve been up since four.\u201D The cup says thank you anyway.',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'She counts out coins and leaves one extra: \u201CFor the stool fund. I heard there\u2019s a stool fund.\u201D There is now.',
  },
];

export const BREWING_NOTE = 'The urn hisses. Steam does the talking.';
export const BREWING_PROMPT = 'Brewing\u2026';

// ---------------------------------------------------------------- Day 4 ----
// "Say Hi" (docs/29) — the Hospitality Law chapter. A new stranger with a
// duffel bag stands where Rosa waved on Day 1. Today you are Rosa.

export const DAY4_BEGIN_NOTE = 'Day 4. The cart is still yours. That part stopped needing to be said.';

export const D4_WAKE_NOTE =
  'Rosa: \u201CSomeone\u2019s by the terminal. Been there since early. Duffel bag, paper Map, that look.\u201D She taps the counter twice. \u201CYou looked like that once. Go say hi. You know the words now.\u201D';
export const D4_WAKE_ACCEPTED_NOTE =
  'Morning four. You know the way from here. You\u2019ve walked it twice \u2014 once as you, once as her.';

export const D4_STRANGER_GREET_NOTE =
  'She just got here. Twelve dollars, a duffel bag, and a Map she holds like it might change its mind. You make her a regular \u2014 milk, two sugars \u2014 and hand it over. On the house.';
export const D4_STRANGER_ONHOUSE_NOTE =
  'Rosa, from across the street, calls it the rule: \u201COn the house means YOU don\u2019t charge. It doesn\u2019t mean it\u2019s free.\u201D She slides two dollars down your counter when nobody\u2019s looking.';
export const D4_STRANGER_WATCH_NOTE =
  'You say the thing Rosa said. It works. It still works.';

export const D4_RUSH_DONE_NOTE =
  'Three orders. The stranger never took her eyes off the counter \u2014 not your hands, the order. That\u2019s how the city teaches. It was never Rosa\u2019s trick. It\u2019s the watching.';

export const D4_MAP_NOTE =
  'You give her the Map. It\u2019s upside down. \u201CIt works better that way,\u201D you tell her. That part is true. The kid, from his stool: \u201CF and M both work. Don\u2019t overthink it.\u201D She writes it down.';
export const D4_STRANGER_DEPART_NOTE =
  'She walks your first walk \u2014 crosswalk, gaps, the other side \u2014 and the street takes over. You watch until the corner of your eye gives up. The Map knows the way. Upside down and all.';

export const D4_CLIMB_NOTE = 'Same stairs. Same seat. Today the whole day climbs with you.';
export const D4_GOLDEN_NOTE =
  'Somewhere out there, someone new is reading a Map upside down and laughing at it. The lamp next door flickers \u2014 thinks about it \u2014 and stays on. The light stays. That\u2019s the whole job.';

/** The Day-4 morning rush — Idris opens, like every day. Three orders,
 *  $11 honest. The stranger watches from the sidewalk between serves. */
export const D4_ORDERS: D3Order[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CFourth day.\u201D He doesn\u2019t explain further. The cup explains it.',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The stranger, from the sidewalk: \u201CIs it always like this?\u201D It is not. You say: \u201CYes.\u201D She keeps the answer.',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The early shift: \u201CLarge black. You\u2019re part of the commute now.\u201D The city decided. That\u2019s how it happens.',
  },
];

// ------------------------------------------- Day 4 afternoon (docs/30) ----
// "The Block Opens Up" — the block was always this big. You just hadn't
// walked it. Sal, Sunrise Laundry, and the first page of the paperwork
// that turns a cart into a corner.

export const D4_KID_APRON_NOTE =
  'The kid, from his stool: \u201CYour apron has a MANGO on it. I can see the mango from here.\u201D He points. He\u2019s right. Four days is four days.';
export const D4_SAL_MEET_NOTE =
  'Sal, from behind the counter: \u201CRosa\u2019s cart. The window-lighter. I heard about you twice before I ever saw you once.\u201D He takes the apron like it\u2019s evidence. \u201CFirst wash is on the house. The aprons are advertising.\u201D';
export const D4_SAL_CHAT_NOTE =
  'Sal: \u201CThirty years at this counter. The permits change. The socks don\u2019t.\u201D';
export const D4_PERMIT_OFFER_NOTE =
  'A white card in an A-frame, city letters: MOBILE FOOD VENDING PERMIT \u2014 APPLICATION. One page. $10 to file. The window opens Monday. [Space] again to file it.';
export const D4_PERMIT_FILED_NOTE =
  'You sign. Sal witnesses, because that\u2019s a thing he does now. \u201CFiled,\u201D he says. \u201CThe receipt goes on the cart. Don\u2019t lose it \u2014 it\u2019s the whole future, on a card.\u201D';
export const D4_PERMIT_ALREADY_NOTE =
  'The permit\u2019s already filed. Sal laminated the receipt. \u201CFor a card, that\u2019s living right.\u201D';
export const D4_APRON_CLEAN_NOTE =
  'Warm from the dryer: the apron, clean. The mango had a good run.';
export const D4_LAUNDRY_BEGIN_NOTE =
  'The block was always this big. You just hadn\u2019t walked it.';

/** Canvas-sign text for the Sunrise Laundry build (World). */
export const D4_LAUNDRY_SIGN = 'SUNRISE LAUNDRY';
export const D4_NOTICE_TITLE = 'CITY NOTICE';
export const D4_NOTICE_LINES: string[] = [
  'MOBILE FOOD',
  'VENDING PERMIT',
  'APPLICATION',
  '$10 to file',
  'Window opens Monday',
];
export const D4_RECEIPT_TEXT = 'FILED';
