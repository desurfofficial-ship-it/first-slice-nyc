/**
 * All game text — verbatim from the original greybox implementation (docs/23–24)
 * and the design docs (Doc 02 first-session walkthrough, Doc 08 Day 1 content pack,
 * Doc 22 Day 2). Text is content: it does not get paraphrased during a migration.
 *
 * Recorded additions beyond the reference (playtest 2026-10-29, Doc 24 §5):
 * the shelf items are named on screen and in the objective, and picking one
 * says what you picked. The reference was silent on all three counts.
 */

import type { DiaryFamily } from './diary';

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

/** Postcard caption composer (main.gd `_compose_postcard`).
 *  `awningUp` is optional: calls that omit it compose byte-identically to
 *  the pre-living-block text. Day 2 without an awning gets one kind line —
 *  the corner doesn't guilt you about shade (Doc 33 §5.1). */
export function composeCaption(s: {
  day: number; replay: boolean; dayStartMoney: number; money: number; cartName: string;
  awningUp?: boolean;
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
      'Met: Rosa. Idris. Learned: the usual is a tiny love letter. The regulars are waiting.\n' +
      `\n\u2014 ${s.cartName}, Day 1`
    );
  }
  if (s.replay) {
    return (
      'Day 2, again. Some days you don\u2019t earn \u2014 you just get to keep.\n\n' +
      `\u2014 ${s.cartName}, Day 2`
    );
  }
  const noAwning = s.awningUp === false
    ? 'No awning yet. The corner didn\u2019t mind.\n'
    : '';
  return (
    `Day 2. $${s.dayStartMoney} \u2192 $${s.money}.\n` +
    'Met: the kid. The corner knows you back now.\n' +
    noAwning +
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

/** TBD-3 (Doc 07) — the Shuffle's soft skip. Stand still long enough on the
 *  walk and the city says its one patient line; nothing is ever lost by it. */
export const CITY_WILL_WAIT_NOTE = 'The city will wait.';

/** Doc 08 note #5 — Map's own page for the window lesson. The ride carries
 *  Priya's spoken teach; THIS is what Map writes down (patient handwriting,
 *  a little crooked, allowed to be). */
export const MAP_COPIED_NOTE =
  'Two lines. One goes under the river. One stays with the lights. (I copied them a little crooked. Priya said that\u2019s fine.)';

/** Doc 08 note #6 — the end of the subway ride's small reassurance. */
export const RIDE_END_NOTE =
  'Trains are stubborn in a loyal way. If you miss it, stay on. It comes back.';

export const NAME_NOTE = 'Your corner. Your name. The city wrote it down with you.';   // Doc 08 note #11
export const USUAL_NOTE = 'The usual is a tiny love letter. It means: I come here, and you noticed.'; // Doc 08 note #10
export const IDRIS_SPAWN_NOTE = 'Mr. Idris: \u201CCoffee. Regular. I\u2019ll be back tomorrow.\u201D';

/** Doc 02 §20:00–26:00 — the cart handover, Rosa's own words at the claim.
 *  The name box opens under this line: "What're you calling it?" is the
 *  question the box answers. */
export const ROSA_CART_HANDOVER_NOTE =
  'Rosa: \u201CIt\u2019s ugly now. So was mine. It\u2019s yours. What\u2019re you calling it?\u201D';

/** Doc 02 §20:00–26:00 — the register count, the ownership beat's payoff.
 *  Rosa at your shoulder, the day's math said out loud, the mango pat.
 *  Day-1 canonical numbers ($87 → $112 is the E2E's specification too). */
export const ROSA_REGISTER_NOTES: string[] = [
  'Rosa counts your register with you: $87 \u2192 $112. \u201CTwenty-five dollars on your first day.\u201D',
  'Rosa, quieter: \u201CNineteen years ago I made eleven.\u201D She pats the cart twice \u2014 the same way she patted the mangoes.',
  'Rosa: \u201CLock up tight. The city takes care of itself at night. That part took me a while to learn.\u201D',
];

export const TOP_NOTE_DAY1 = 'Stoop = outdoor living room. You\u2019re invited. That\u2019s the important part.'; // Doc 08 note #9
export const TOP_NOTE_DAY2 = 'Same seat. The city kept it warm for you.';

// ------------------------------------------------------------ the order cards ----
// The serving conversation (docs/11 + docs/12 — the paper prototypes, and
// Doc 07 VS-F03): an order is a CONVERSATION, not a press. Every card keeps
// the paper kit's contract —
//   · the always-available replies: just make it / repeat it back / ask / chef's welcome
//   · teaching happens only when the player asks (never a lecture otherwise)
//   · one piece explained at a time, never all at once
//   · wrong guesses can never offend — the kid answers "I don't know either!"
//   · no timers, no fail states, no score: every choice serves the cup.
// Money math is sacred (E2E): a serve is a serve regardless of the choice.
// Map notes inside responses are EXACT Doc 08 note text (collected in the Map).

/** One way an order can go. `note`/`slang` are written into the Map when
 *  the choice teaches something. */
export interface OrderReply {
  /** The button — what you say or do. Short, plain, first person. */
  label: string;
  /** What happens / what comes back. The card's response line. */
  response: string;
  /** A Doc 08 Map note this choice earns (collected in the Map margins). */
  note?: string;
  /** A slang card for the Map margins (Doc 08's four). */
  slang?: string;
}

/** One customer, one order, one conversation. `bubble` is the short
 *  world-space order text; `line` is what the customer actually says. */
export interface OrderCard {
  id: string;
  bubble: string;
  line: string;
  replies: OrderReply[];
  /** Reply index used by Space/Enter — "just make it" whenever it exists. */
  defaultReply: number;
}

// The bodega counter — Rosa's first rush, five cards straight from the
// paper kit (Doc 12 §2 cards 1–5, Doc 02 §5:00–10:00).
export const RUSH_CARDS: OrderCard[] = [
  {
    id: 'regular',
    bubble: 'REGULAR COFFEE',
    line: '\u201CRegular coffee.\u201D',
    defaultReply: 0,
    replies: [
      {
        label: 'Say nothing. Just make it.',
        response: 'You pour, two sugars, milk. She takes the cup: \u201CYou\u2019re new. Rosa trains \u2019em right though. You\u2019ll do fine.\u201D',
        note: RUSH_NOTE_1,
      },
      {
        label: 'Repeat the order back.',
        response: '\u201CRegular coffee,\u201D you say, like you\u2019ve said it before. She grins. \u201CQuick ear. You\u2019ll do fine.\u201D',
        note: RUSH_NOTE_1,
      },
      {
        label: 'Ask what \u201Cregular\u201D means.',
        response: 'Rosa, from the griddle: \u201CMilk and two sugars. That\u2019s what regular means here.\u201D No hurry in her voice at all.',
        note: RUSH_NOTE_1,
        slang: 'regular',
      },
      {
        label: '\u201CChef\u2019s welcome.\u201D',
        response: 'The cook picks. Rosa slides you the regular \u2014 milk, two sugars. \u201CGood call. That\u2019s the house.\u201D',
        note: RUSH_NOTE_1,
      },
    ],
  },
  {
    id: 'bec',
    bubble: 'BACON EGG & CHEESE',
    line: '\u201CBacon egg and cheese. Salt, pepper, ketchup.\u201D',
    defaultReply: 0,
    replies: [
      {
        label: 'Say nothing. Just make it.',
        response: 'Salt, pepper, ketchup. The roll hits the griddle and the counter smells like Saturday. \u201CThat whole sentence is a complete order,\u201D Rosa says. \u201CYou speak New York now.\u201D',
        note: 'That whole sentence is a complete order. Salt, pepper, ketchup. You speak New York now.',
      },
      {
        label: 'Repeat the order back.',
        response: '\u201CBacon egg and cheese \u2014 salt, pepper, ketchup.\u201D He nods, slow, like a man heard. \u201CFirst try. You\u2019re speaking New York now.\u201D',
        note: 'That whole sentence is a complete order. Salt, pepper, ketchup. You speak New York now.',
      },
      {
        label: 'Ask about the ketchup.',
        response: '\u201CKetchup?\u201D He says it kindly, like it\u2019s obvious. \u201CIt\u2019s breakfast, not a funeral.\u201D The whole sentence is a complete order. You speak New York now.',
        note: 'That whole sentence is a complete order. Salt, pepper, ketchup. You speak New York now.',
      },
      {
        label: '\u201CChef\u2019s welcome.\u201D',
        response: 'You build it the way the griddle wants: salt, pepper, ketchup. He bites, nods, holds up one finger \u2014 that good. You speak New York now.',
        note: 'That whole sentence is a complete order. Salt, pepper, ketchup. You speak New York now.',
      },
    ],
  },
  {
    id: 'bagel',
    bubble: 'EVERYTHING BAGEL',
    line: '\u201CEverything bagel, scallion cream cheese, toasted.\u201D',
    defaultReply: 0,
    replies: [
      {
        label: 'Say nothing. Just make it.',
        response: 'The bagel is genuinely enormous. Nobody comments on this. New York does not explain itself.',
        note: 'Folding it is part of the recipe.',
      },
      {
        label: 'Repeat the order back.',
        response: '\u201CEverything, scallion, toasted.\u201D She nods. \u201CSee? Easy. Everything but the explaining.\u201D',
        note: 'Folding it is part of the recipe.',
      },
      {
        label: 'Ask what \u201Ceverything\u201D is.',
        response: '\u201CSesame, poppy, garlic, salt,\u201D she says. \u201CEverything. Hence, you know.\u201D She doesn\u2019t finish. She doesn\u2019t have to.',
        note: 'Folding it is part of the recipe.',
      },
      {
        label: '\u201CChef\u2019s welcome.\u201D',
        response: 'You toast it, schmear it, hand over something the size of a frisbee. She carries it off two-handed, delighted.',
        note: 'Folding it is part of the recipe.',
      },
    ],
  },
  {
    id: 'chopped',
    bubble: 'CHOPPED CHEESE',
    line: '\u201CChopped cheese on a hero, letta, tomahta, hots.\u201D',
    defaultReply: 0,
    replies: [
      {
        label: 'Say nothing. Just make it.',
        response: 'You do not ask about the hots. You chop, you pile, you roll. He takes it like it\u2019s a normal Tuesday, which it is.',
      },
      {
        label: 'Repeat the order back.',
        response: '\u201CChopped cheese on a hero \u2014 letta, tomahta, hots.\u201D He grins. \u201CAccent\u2019s already coming in. That\u2019s fast.\u201D',
        slang: 'hero',
      },
      {
        label: 'Ask what a hero is.',
        response: 'He holds his hands a foot apart. \u201CA big sub roll. A hero.\u201D One piece explained. The rest you\u2019ll learn by eating.',
        slang: 'hero',
      },
      {
        label: '\u201CChef\u2019s welcome.\u201D',
        response: 'You make it the way the man behind him mouths it: letta, tomahta, hots. The line knows. The line always knows.',
        slang: 'hero',
      },
    ],
  },
  {
    id: 'idris',
    bubble: 'THE USUAL',
    line: 'A quiet older man. Just: \u201CThe usual, please.\u201D',
    defaultReply: 0,
    replies: [
      {
        label: 'Two sugars. Just make it.',
        response: 'Two sugars. You didn\u2019t ask. It felt like the answer to a question you hadn\u2019t heard yet.',
      },
      {
        label: 'Repeat the order back.',
        response: '\u201CThe usual,\u201D you say. He looks up for the first time. Something in his face settles.',
      },
      {
        label: 'Ask what the usual is.',
        response: 'Rosa answers before he can, quietly. Mr. Idris takes his cup like the nine years were the point.',
      },
      {
        label: '\u201CChef\u2019s welcome.\u201D',
        response: 'Rosa is already sliding the cup to you \u2014 two sugars. \u201CSome orders you learn by heart before you learn by asking.\u201D',
      },
    ],
  },
];

/** Rosa's line after the rush's last cup — Doc 12 card 3's continuity beat.
 *  It lands on EVERY card-5 choice (it is the payoff, not a branch). */
export const IDRIS_NINE_YEARS_NOTE =
  'Rosa, quietly: \u201CThat\u2019s Mr. Idris. Two sugars. Every day for nine years. You\u2019ll see him tomorrow.\u201D';

// Your own cart — the first solo rush (Doc 02 §20:00–26:00): the stroller,
// the kid, and Mr. Idris, who said he'd be back and meant it.
export const SOLO_CARDS: OrderCard[] = [
  {
    id: 'stroller',
    bubble: 'REGULAR',
    line: '\u201COh, finally, SOMETHING on this corner.\u201D A stroller, a diaper bag, a look of earned relief.',
    defaultReply: 0,
    replies: [
      {
        label: 'Make her a regular.',
        response: 'Milk, two sugars. She takes a sip and closes her eyes. \u201CCorner coffee. The city\u2019s mine again.\u201D',
        note: RUSH_NOTE_3,
      },
      {
        label: 'Repeat the order back.',
        response: '\u201CRegular \u2014 milk, two sugars.\u201D She raises the cup to you. \u201CSomebody was listening.\u201D',
        note: RUSH_NOTE_3,
      },
      {
        label: 'Ask what she meant.',
        response: '\u201CYou\u2019ve been here one day and you\u2019re asking ME?\u201D She laughs. \u201COne regular, hon. It\u2019s the whole city in a cup.\u201D',
        note: RUSH_NOTE_3,
        slang: 'regular',
      },
      {
        label: '\u201CChef\u2019s welcome.\u201D',
        response: 'You make the only thing this corner serves so far. \u201CBold strategy,\u201D she says, drinking it anyway.',
        note: RUSH_NOTE_3,
      },
    ],
  },
  {
    id: 'kid',
    bubble: 'WHATEVER\u2019S COLD',
    line: 'A teenager, hood up: \u201CWhatever\u2019s cold\u2026 I don\u2019t really know.\u201D',
    defaultReply: 0,
    replies: [
      {
        label: 'Just make something cold.',
        response: 'You hand over something cold. He looks at it, then at you. \u201COh. Okay. Thanks.\u201D He holds it with both hands, like it might leave.',
      },
      {
        label: 'Ask what he usually likes.',
        response: '\u201CI don\u2019t know either!\u201D He shrugs, honest. You both stand there a second \u2014 two people new to this block. \u201CSurprise me?\u201D You do. It\u2019s cold. It\u2019s good.',
      },
      {
        label: '\u201CChef\u2019s welcome \u2014 I\u2019ll pick for you.\u201D',
        response: 'He shrugs, agreeable. You pick something cold. \u201CIt\u2019s good,\u201D he says, surprised, like the corner did it on purpose.',
      },
    ],
  },
  {
    id: 'idris_solo',
    bubble: 'THE USUAL',
    line: 'Mr. Idris. He looks at the cart, looks at you, nods once.',
    defaultReply: 0,
    replies: [
      {
        label: 'Two sugars. Just make it.',
        response: 'He takes the cup. \u201CRosa said you\u2019d be here. She\u2019s usually right. It\u2019s annoying.\u201D',
      },
      {
        label: 'Repeat the order back.',
        response: '\u201CThe usual,\u201D you say. He nods once, almost a smile. \u201CRosa said you\u2019d be here. She\u2019s usually right. It\u2019s annoying.\u201D',
      },
      {
        label: 'Ask: \u201CTwo sugars?\u201D',
        response: '\u201CThat\u2019s the usual,\u201D he says. \u201CRosa told you, right?\u201D She did. It shows. \u201CRosa said you\u2019d be here. She\u2019s usually right. It\u2019s annoying.\u201D',
      },
      {
        label: '\u201CChef\u2019s welcome.\u201D',
        response: 'He watches your hand take the sugar \u2014 two \u2014 and nods once. \u201CRosa said you\u2019d be here. She\u2019s usually right. It\u2019s annoying.\u201D',
      },
    ],
  },
];

/** The REGULAR UNLOCKED line — Idris converts from stranger to promise
 *  (Doc 02 §20:00–26:00). Fires on every choice of his card, once. */
export const IDRIS_UNLOCK_NOTE =
  'Regular unlocked \u2014 Mr. Idris. Two sugars. Every day. You\u2019ll see him tomorrow.';

/** The gold window's payoff (Doc 02 §26:00–30:00). Rosa's quiet line lands
 *  while the window holds, and the send-off closes the session's open loop. */
export const GOLD_WINDOW_NOTE =
  'Rosa, quieter, following your eyes: \u201CThat one\u2019s the kid who ordered \u2018whatever\u2019s cold.\u2019\u201D A beat. \u201CYou were their first warm thing today.\u201D';
export const LIGHTS_OUT_NOTE =
  'Rosa, from below, calling up: \u201CLights out, rookie! Big day tomorrow. They\u2019re gonna want the usual.\u201D';

/** The water towers, from the fire escape (Doc 08 note #7 — first clear
 *  view of the wooden hats). */
export const WATER_TOWERS_NOTE =
  'The buildings wear wooden hats. I don\u2019t know why yet. I like them.';

// ------------------------------------------------------- the Map margins ----
// Slang cards (Doc 08 §1 — the four). Earned by asking; the margins hold
// them. Feelings first, ordinary words, never a dictionary entry.
export interface SlangCard {
  id: string;
  word: string;
  meaning: string;
}

export const SLANG_CARDS: Record<string, SlangCard> = {
  regular: {
    id: 'regular',
    word: 'regular',
    meaning: 'A small coffee with milk and two sugars. Also: the person who orders it.',
  },
  bodega: {
    id: 'bodega',
    word: 'bodega',
    meaning: 'The corner shop that knows your order before you do. The cat may outrank the owner.',
  },
  hero: {
    id: 'hero',
    word: 'hero',
    meaning: 'A big sub roll. Not a sandwich. A hero.',
  },
  online: {
    id: 'online',
    word: 'on line',
    meaning: 'How New Yorkers stand. Not \u201Cin line.\u201D',
  },
};

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
/** The remembered favor (Doc 33 §4.2): Day 3's first cup, spoken to the
 *  favor YOU did on Day 2. Memory is content — one line, no cutscene, and
 *  only on Day 3 (a Day-4 replay of the rush must not re-run it). */
export const IDRIS_D3_FAVOR_REACTION =
  'Mr. Idris: \u201CThird day. Same cup. You did right by the kid \u2014 that\u2019s the whole job, kid.\u201D';
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

/** Doc 02 §2:00–5:00 — "three items inside the bodega, each with a
 *  fun-fact sticker." The sticker's text is canon; the flavor line is the
 *  2026-10-29 playtest addition (the shelf stopped being anonymous cubes).
 *  Both read at the pickup: the pick line first, the sticker queued after. */
export const ITEM_STICKERS: Record<string, string> = {
  mango: 'The sticker on the tray: \u201CBodegas: NYC\u2019s cornerstones. There are over 10,000. You now know the most important one.\u201D',
  coffee: 'The sticker on the tin: \u201CA \u2018regular coffee\u2019 means milk and two sugars. Nobody knows why. It\u2019s just true.\u201D',
  bread: 'The sticker on the rack: \u201CBread arrives before sunrise, every day, rain or shine. The city eats early.\u201D',
};

/** What picking something says out loud — nobody wonders what they just took. */
export function itemPickNote(id: string, leftAfter: number): string {
  const label = (ITEM_LABELS[id] ?? id).toLowerCase();
  const flavor = ITEM_FLAVOR[id] ?? '';
  if (leftAfter === 2) return `The ${label}. ${flavor} Two more to find.`;
  if (leftAfter === 1) return `The ${label}. ${flavor} One more.`;
  return `The ${label}. ${flavor} That's three — “Perfect,” Rosa says, and the bell over the door rings.`;
}

/** Prompt verbs for the authored interactions moved INTO their interaction
 *  definitions (game/interactionDefs.ts) by the Doc 37 §3B registry refactor.
 *  content.ts keeps the TEXT; the interaction owns the choice of line. */
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
// ---------------------------------------------------------------- the living block ----
// Small day-keyed warmth (Doc 33 §4) — all of it derived from the day
// number and existing flags. Nothing here is stored; a save that predates
// these lines plays them like it always knew.

/** Rosa, the first chat of a Day-4 morning after the Map changed hands:
 *  the greeting ladder's "shorthand" rung — four mornings deep. */
export const ROSA_FOUR_MORNINGS_NOTE =
  'Rosa: \u201CFour mornings. The urn remembers your hands. So do I.\u201D';

/** The familiar face, Day 3 — the nod (Doc 33 §2.2). */
export const FAMILIAR_NOD_NOTE =
  'A woman in a stone-gray cardigan passes the cart, folded paper under her arm. She nods — at you, at the cart, hard to tell. It feels the same.';
/** The familiar face, Day 4 — she crosses back during the wash and spends
 *  one word. On this block, that's a handshake. */
export const FAMILIAR_WORD_NOTE =
  'She\u2019s crossing back at this hour. \u201CMorning,\u201D she says. One word. On this block, that\u2019s a handshake.';

export const D4_RECEIPT_TEXT = 'FILED';

// -------------------------------------------------- free-roam (Doc 37 §3C) ----
// The block answers before the story does. Every line here is available
// OUTSIDE the authored beats: the bodega sells every morning, the bench
// holds whoever sits, the board and the newsboxes rotate by day. None of
// it is stored in the save — day-keyed like the living block, so a save
// that predates these lines plays them like it always knew.

/** The bodega's shelf, as a shop. The three quest goods double as stock:
 *  during Day-1 COLLECT they are "Take" (Rosa's errand, free); every other
 *  moment they are "Buy" — with a real deduction, the awning/stool pattern
 *  of a second press to confirm. */
export interface ShelfGood {
  id: string;
  label: string;
  price: number;
  /** First press — the offer (the confirm gate). */
  offer: string;
  /** The buy line. */
  buy: string;
  /** Not enough money. */
  broke: string;
  /** Shelf unit already sold today. */
  soldOut: string;
}

export const SHELF_GOODS: ShelfGood[] = [
  {
    id: 'mango', label: 'Mango', price: 2,
    offer: 'A mango, heavy for its size \u2014 $2. [Space] again to buy it.',
    buy: 'You buy the mango. Rosa waves from the counter without looking up.',
    broke: 'The mango is $2. The wallet says another day.',
    soldOut: 'The mango tray is empty. Rosa restocks in the morning.',
  },
  {
    id: 'coffee', label: 'Coffee', price: 5,
    offer: 'The tin with the faded label \u2014 $5. [Space] again to buy it.',
    buy: 'You buy the tin. It\u2019s the one the regulars ask for by its dent.',
    broke: 'The tin is $5. The wallet says another day.',
    soldOut: 'The coffee tin is gone for today. Morning brings another.',
  },
  {
    id: 'bread', label: 'Bread', price: 3,
    offer: 'Bread, still warm from the morning tray \u2014 $3. [Space] again to buy it.',
    buy: 'You buy the bread. The bag is warm all the way home.',
    broke: 'The bread is $3. The wallet says another day.',
    soldOut: 'The bread board is bare. Tomorrow\u2019s tray is already spoken for.',
  },
];

/** The bulletin board by the subway stairs — the slip rotates by day
 *  (Doc 33 §2.3's flyer diary, now readable). Day 3's beat is the poster
 *  itself; the board steps aside for it. */
export const BULLETIN_NOTES: string[] = [
  'STOOP SALE SATURDAY \u2014 the Rivera stoop, everything must go. Someone has underlined \u201Ceverything\u201D twice.',
  'LOST: one gray cat. Answers to Station, or faster to a can of tuna. The reward is described as \u201Cdeep affection.\u201D',
  'A flyer, still wet at the corners: your cart, someone\u2019s photo, \u201CBEST CORNER COFFEE \u2014 as voted by everyone who was asked.\u201D',
  'PARADE SUNDAY, 9 AM, this block. Bring a chair. Someone has crossed out \u201Croad closures\u201D and written \u201Cgood delays.\u201D',
];

/** The newspaper boxes at the plaza — a headline a day. The city talks to
 *  itself; you are allowed to listen. */
export const NEWSPAPER_NOTES: string[] = [
  'THE DAILY: \u201CCITY WAKES EARLY; COFFEE BLAMED.\u201D Below the fold, a letter to the editor defends the bean.',
  'THE DAILY: \u201CMAYOR VISITS LAUNDROMAT, CALLS IT \u2018THE TOWN SQUARE.\u2019\u201D Sal is not quoted. Sal does not need quotes.',
  'THE DAILY: \u201CLOCAL CORNER VOTED BEST CORNER.\u201D The poll had one respondent. She knows who she is.',
  'THE DAILY: \u201CPARADE TOMORROW.\u201D The route is a straight line past a certain coffee cart.',
];

/** The bus bench — sitting is an interaction now (Doc 37 §3B: using
 *  environmental objects). One line a day; the bench keeps no save. */
export const BENCH_SIT_NOTES: string[] = [
  'The bench is warm from the morning. The street does its work in front of you. It is enough.',
  'From here the whole block minds its business. It minds it well.',
  'A pigeon lands, considers you, and decides you are furniture. The highest compliment it gives.',
  'The bench again. It is starting to be your bench. The paint has not noticed yet.',
];

/** The subway stairs — a glance down. The kid had it right on Day 3. */
export const SUBWAY_NOTE =
  'The stairs go down for real now. The K runs local \u2014 the city keeps its promises underground.';

// ---------------------------------------------------- the expanded block ----
// docs/38 §4 — the free-roam loops east of the crosswalk. Same law as the
// living block's diary: day-keyed, deterministic, no save fields. Prices are
// honest numbers the wallet actually pays.

/** FADE KING BARBERSHOP — the chair is $12. One cut per day: the second
 *  visit gets the "you're fresh" line (transient `trimToday`, not saved —
 *  a haircut is not a possession, it's a morning). */
export const BARBER_PRICE = 12;
export const BARBER_OFFER =
  'The chair by the window is open \u2014 a trim, $12, cash. [Space] again to take it.';
export const BARBER_BROKE =
  'The trim is $12. The wallet says grow it out another week.';
export const BARBER_FRESH =
  'Fresh this morning \u2014 the pole is still spinning for you, but the chair says come back tomorrow.';
export const BARBER_LINES: string[] = [
  'The clippers hum. The mirror talks. You leave lighter by twelve dollars and one eyebrow\u2019s worth of doubt.',
  'Outside, a man nods at your line-up. Inside, the pole never stopped. Fade King earned the name.',
  'The barber asks what you do. You say coffee cart. He says the block already knows. Twelve dollars well spent.',
  'A trim and fifteen minutes of the radio. You walk out squinting at how sharp the afternoon got.',
];

// -------------------------------------------------------------- W5: the rooms ----
// docs/41 planned every interior to fixture level before a wall went up;
// these lines are the loops' voices. All additive — the shipped constants
// above are the contract, these are the rooms speaking.

/** SUNRISE LAUNDRY — the wash's second beat (docs/41 §2.2): dry-and-fold at
 *  the dryer wall. $2, the same wash-day rhythm, no new state — the drum
 *  hum carries it. */
export const DRYER_PRICE = 2;
export const DRYER_OFFER =
  'The dryer wall takes quarters and patience \u2014 dry & fold, $2. [Space] again to run it.';
export const DRYER_BROKE =
  'Dry & fold is $2. The basket can air out one more day.';
export const DRYER_LINES: string[] = [
  'Warm cotton, the smell of someone else\u2019s detergent. The folding tables wait. Two dollars, well tumbled.',
  'You fold at the far table. A stranger\u2019s sock rides your basket home. The laundromat keeps its secrets.',
  'The dryer door sticks, then gives. Everything comes out softer than it went in, including you.',
  'Sal nods at the folding tables. The dryers tick like a clock that only counts clean things.',
];

/** CORNER SLICE — the dollar slice, a standing order (docs/41 §2.4, the GDD
 *  §4.5 starter trinity). The sign says a dollar; the fold-in says two —
 *  the honest NYC arithmetic, said out loud in the offer line. */
export const PIZZA_PRICE = 2;
export const PIZZA_OFFER =
  'The sign says a dollar. The sign is from 2019 \u2014 it\u2019s two now, folded, ready. [Space] again to take it.';
export const PIZZA_BROKE =
  'Two bucks for the fold. The wallet says the slice waits.';
export const PIZZA_LINES: string[] = [
  'Grease through the paper, the crust holding its one long note. You eat it in four steps and look for more.',
  'The man behind the counter folds the box without being asked. Regulars don\u2019t order; they nod.',
  'The deck oven hums at a temperature the block respects. Two dollars, one napkin, zero regrets.',
  'A dollar\u2019s slice would have fed the doubt. Two dollars\u2019 feeds the walk home.',
];

/** ALDER HEIGHTS DINER — the counter seat, the booth, and the pie case
 *  (docs/41 §2.6). Coffee is $2; the booth is free; the pie case teaches. */
export const DINER_COFFEE_PRICE = 2;
export const DINER_COFFEE_OFFER =
  'A stool with a view of the griddle \u2014 bottomless cup, $2. [Space] again to sit in.';
export const DINER_COFFEE_BROKE =
  'The cup is $2. The counter will keep your stool shape until tomorrow.';
export const DINER_COFFEE_LINES: string[] = [
  'The cup refills before you ask. The regulars\u2019 section is three stools down and they\u2019ve noticed your cart.',
  'Big Mike\u2019s shift ends at four. The counter says the block runs on this griddle and the K train.',
  'You learn the waitress\u2019s name the same way she learned yours: the third cup, unprompted.',
  'The coffee is diner coffee \u2014 which is to say, a promise the morning keeps.',
];
export const DINER_BOOTH_NOTES: string[] = [
  'Vinyl that remembers a thousand waits. The window booth watches Kestrel go by.',
  'The booth by the window: where the block\u2019s arguments end up, at breakfast, with forks.',
  'Someone carved a tiny map into the table edge. It\u2019s this block. It\u2019s accurate.',
  'You sit long enough to see the lunch shift take over like a tide.',
];
export const PIE_CASE_NOTES: string[] = [
  'The pie case glows like a jukebox. Cherry today. The rule at the counter: order like a local \u2014 pie first, arguments after.',
  'The case rotates the way the day does: fruit in the morning, cream by the afternoon. The locals know which.',
];

/** ALDER WORKS HALL — the notice wall and the workshop table (docs/41 §2.7).
 *  The notice wall rides the shipped day-keyed dressing; these lines are
 *  the workshop\u2019s. */
export const HALL_WORKSHOP_NOTES: string[] = [
  'Sawdust and PVC glue. The table holds half a birdhouse and all of somebody\u2019s weekend.',
  'The workshop keeps two rules on the wall: measure twice, and sweep after \u2014 not tomorrow.',
  'A crate of donated tools with a sign: TAKE WHAT YOU NEED, LEAVE WHAT YOU FIXED.',
  'The folding chairs stack themselves by 9 sharp. The hall always knows what day it is.',
];

/** THE CECIL, ROOM 3 — the window-gaze beat (docs/41 §2.5, the reserved
 *  note adopted in W5): one quiet look out the north window, the gold one
 *  across the street answering. Day-keyed, free, no state. NOT adopted:
 *  any sleep mechanic — days end at the rail, the way the story wrote it. */
export const CECIL_GAZE_NOTES: string[] = [
  'The gold window across the street is lit. From here, on your side of the road, it looks like the block is keeping a light on for you.',
  'The street below does its evening arithmetic \u2014 cabs, headlights, the crosswalk\u2019s white bars. Yours is the only window that counts them.',
  'The skyline wears its dusk gauze. You stand a minute longer than the coffee needed.',
  'From here the street reads like the postcard it is. You\u2019ll take that with you tomorrow.',
];

/** MARLOW BAKERY — the morning anchor (docs/41 §2.8): the bagel silhouette
 *  in the window, the counter just inside. $4 does it honestly. */
export const BAKERY_PRICE = 4;
export const BAKERY_OFFER =
  'The morning anchor \u2014 bagel, coffee, the paper\u2019s crossword page, $4. [Space] again to make it yours.';
export const BAKERY_BROKE =
  'The anchor is $4. Tomorrow it\u2019s still the morning, somehow.';
export const BAKERY_LINES: string[] = [
  'The bagel is warm through the bag. The line behind you already knows what they\u2019re having.',
  'Deck-oven heat rolls out the door like the shop is breathing. Four dollars, the whole morning in paper.',
  'The racks behind the counter click as they cool. The crossword page came out good today.',
  'You take it to the two-top by the window and eat like the block isn\u2019t watching. It is. It approves.',
];

/** B-SIDE RECORDS — the Happy-Accident shop (docs/41 §2.9, GDD §4.3): the
 *  listening corner is free; the used bin is $3. */
export const RECORD_BIN_PRICE = 3;
/** Doc 02 §15:00–20:00: the door's hand-written sign, the one you read the
 *  day you exit one stop early. It matters at Week 3. Everything matters at
 *  Week 3. */
export const RECORD_SIGN_TOP = 'Back soon.';
export const RECORD_SIGN_SUB = 'The city knows when.';
export const RECORD_BIN_OFFER =
  'The used bin knows things \u2014 three dollars and it\u2019s yours. [Space] again to flip through.';
export const RECORD_BIN_BROKE =
  'The bin is $3 a record. The bin has patience; so does the crate of doubts.';
export const RECORD_BIN_LINES: string[] = [
  'The bin coughs up a record with someone else\u2019s initials on the sleeve. It plays like it was waiting for you.',
  'Three dollars. The B-side is better. That\u2019s the whole shop\u2019s philosophy in one purchase.',
  'The needle drops on a song the radio forgot on purpose. The listening corner sways.',
  'You leave with a record you\u2019d never have searched for. Getting lost is finding somewhere.',
];
export const RECORD_LISTEN_NOTES: string[] = [
  'The shop plays whatever the owner is arguing with. Today it wins.',
  'Crate three, second row: the corner where the good covers hide. The headphones hang like a dare.',
  'One street from the subway and you\u2019d never find it twice by accident. That\u2019s the point.',
  'The listening corner\u2019s chair knows every record in the shop by weight.',
];


/** CORNER PARK — the sittable bench by the lawn. The bus bench notes live
 *  on the bus bench; these belong to the lawn. */
export const PARK_SIT_NOTES: string[] = [
  'The lawn is two shades of green and one shade of honest. The hydrant keeps watch like it was hired to.',
  'A pigeon walks the path like it pays rent. From this bench, the whole block breathes out.',
  'Somebody\u2019s radio three benches down plays something from 1971. Nobody minds. The park approves.',
  'Your bench now too, apparently. The paint on this one hasn\u2019t noticed either.',
];

/** DIRTY WATER DOGS — $2, from the cart by the park gate. The city\u2019s
 *  oldest food group. */
export const HOT_DOG_PRICE = 2;
export const HOT_DOG_OFFER =
  'A hot dog off the cart \u2014 $2, mustard\u2019s free, opinions extra. [Space] again to buy.';
export const HOT_DOG_BROKE =
  'The dog is $2. The cart man has seen thinner wallets keep walking. No shame in it.';
export const HOT_DOG_LINES: string[] = [
  'You eat it standing up, because that\u2019s the rule nobody wrote down. The mustard wins.',
  'The cart man nods like you passed something. You have eaten a dirty-water dog. The city files the paperwork.',
  'Sauerkraut, because the man insisted. He was right. He usually is.',
  'Lunch from a cart, eaten on a bench you sit on every day. That\u2019s the whole city in one sentence.',
];

/** THE ALLEY — the hidden corner between the pizza joint and Fade King.
 *  Some days the cat is in. (Station: the bulletin board\u2019s lost gray,
 *  \u201Canswers to Station or faster to a can of tuna.\u201D) */
export const ALLEY_NOTES: string[] = [
  'A dead bulb, a trash bag, a quiet brick canyon. The block\u2019s off hours live back here.',
  'Two green eyes at the back wall \u2014 gray, unbothered, gone before you can check the collar. Station, maybe. Do not chase.',
  'Someone chalked a hopscotch grid back here, half faded. The alley has younger tenants than it lets on.',
  'The steam grate is warm and the cat-sized hollow beside it is empty, recently. You miss her by minutes, again.',
];

/** THE HALF-COURT — free, repeatable, deterministic. The hoop keeps score
 *  in notes, not UI. */
export const COURT_MAKE: string[] = [
  'Off the glass and through \u2014 the net snaps like it meant it.',
  'Clean. The rim doesn\u2019t move. Somewhere a man on a bench nods without looking up.',
  'It rolls the rim\u2019s whole diameter and drops. The crowd is three pigeons and they go wild.',
  'One more. The court starts keeping your secret: you might be okay at this.',
];
export const COURT_MISS: string[] = [
  'Front iron. The ball bounces out like it has somewhere else to be.',
  'Short. The free-throw line judges you in silence. Next one\u2019s yours.',
];
export const COURT_STREAK_NOTE =
  'That\u2019s three in a row. The hoop has nothing to say, but the pole heard it.';

/** DO A LOAD — the laundromat\u2019s near washer, $3, when the story isn\u2019t
 *  using the bay. Same machine Sal runs on wash day. */
export const FREE_WASH_PRICE = 3;
export const FREE_WASH_OFFER =
  'The near washer\u2019s mouth is open \u2014 one load, $3. [Space] again to feed it.';
export const FREE_WASH_BROKE =
  'A load is $3. The basket keeps its opinions to itself.';
export const FREE_WASH_RUNNING =
  'The drum\u2019s already turning. Sal says a watched washer never spins \u2014 come back in a minute.';
export const FREE_WASH_NOTES: string[] = [
  'The drum stops. Warm towels, folded badly, carried home like treasure. Three dollars, honestly spent.',
  'Spin\u2019s done. The socks came back with opinions about the dryer but everything\u2019s clean. The block smells like a laundromat in a good way.',
  'Done. You fold the load on your knees right there by the machine, because that\u2019s how it\u2019s done.',
];

// ------------------------------------------------------ the walkers speak ----
// Phase 4 (Doc 37 §3E): optional conversations with the block's ambient
// walkers, through the same registry as everything else. One line a day per
// neighbor (the byDay rotation), anonymous-neighbor voices per Doc 04 —
// no names, no backstories, just people on their own schedules. A player
// can play all four days without pressing a single one of these.

export const WALKER_CHAT: string[][] = [
  [ // the commuter — four loops a day, the 7:42 waits for nobody
    '\u201CMorning.\u201D He tips a cap he isn\u2019t wearing. The crosswalk takes him.',
    '\u201CStill got the corner. Good.\u201D He\u2019s already three steps gone.',
    '\u201CRush hour\u2019s a state of mind. Mine is caffeinated.\u201D He means your cart.',
    '\u201CSee you tomorrow. Same sidewalk. It\u2019s a good system.\u201D',
  ],
  [ // the window shopper — she knows every pane on the block
    '\u201CRosa restocked the mangoes. I\u2019m just looking. I\u2019m always just looking.\u201D',
    '\u201CThat barber pole\u2019s been spinning since the seventies. The block\u2019s metronome.\u201D',
    '\u201CWindow shopping is free. The window knows me by now.\u201D',
    '\u201CBest corner in the city, right here. The poll had one respondent. It was me.\u201D',
  ],
  [ // the south-side local — laundry Tuesdays, opinions daily
    '\u201CSal\u2019s machine hums in B-flat. Been meaning to tell him for a year.\u201D',
    '\u201CThe cart man waves with the tongs. Health code says no. Friendship says yes.\u201D',
    '\u201CTwelve trees on this block. I counted. Somebody had to.\u201D',
    '\u201CYou think the pigeons are random? Nothing out here is random.\u201D',
  ],
];

// ----------------------------------------------------- the block remembers ----
// Phase 5 (Doc 37 §3F): choices outside the story leave a mark. Each memory
// has a threshold (`at` — cumulative, persisted, Save-v1-safe); once a
// counter reaches it, the repeat interaction's line changes to show the
// block noticed. Pure data — `withMemory` in interactionDefs picks.

export interface MemoryLine {
  /** Cumulative count at which the memory starts surfacing. */
  at: number;
  /** What gets said once the block has noticed. */
  line: string;
}

export const MEMORY_LINES: Record<'shelf' | 'dog' | 'trim' | 'wash' | 'hoop', MemoryLine> = {
  shelf: {
    at: 3,
    line: 'Rosa has your bag packed before the door chime settles. \u201CThe usual,\u201D she says, and it\u2019s not a question.',
  },
  dog: {
    at: 3,
    line: '\u201CThe usual?\u201D He\u2019s already reaching. The block has learned your order.',
  },
  trim: {
    at: 2,
    line: 'He sees you coming and spins the chair with his foot. Regular rules now \u2014 no words needed.',
  },
  wash: {
    at: 2,
    line: 'Your machine, by popular demand of nobody in particular. It just knows you now.',
  },
  hoop: {
    at: 5,
    line: 'The pole has stopped counting your makes out loud. That\u2019s how you know it respects you.',
  },
};

// ---------------------------------------------------- the diary (M3) ----
// docs/architecture/05 M3 — the block remembers you TOMORROW: the morning
// after a family crosses its diary threshold (core/diary.ts picks which;
// Game applies it through the note queue), the city says one line about
// yesterday's rounds. One line per family, ever — the watermark in the
// save (`diary_noted`) keeps the morning from repeating itself. Keys must
// match core/diary.ts's DiaryFamily. No-FOMO check: no line asks for
// another round; being known is the whole reward.
export const DIARY_NOTE_TEXT: Record<DiaryFamily, string> = {
  shelf: 'Rosa front-stocked \u201Cyour row\u201D before the door chime settled this morning. Nobody asked her to.',
  dog: 'The cart man started your order while you were still crossing the street. You hadn\u2019t decided yet.',
  trim: 'The barber\u2019s chair is turned to face the door. Yours is the next cut he expects.',
  wash: 'Sunrise kept the first machine open this morning. The block notices who comes back.',
  hoop: 'Someone chalked a small tally under the court\u2019s score. It\u2019s your makes, kept.',
};

// ---------------------------------------------------- docs/50 far world ----
// The K line, Times Square, the M121 — the first-session world's missing
// rooms (Agent 2). Same diary law: day-keyed where it rotates, fixed where
// it's a lesson, no save fields anywhere.

/** The ride's teach beats, in order (ride.ts pins the times). Priya's
 *  lesson rides the tunnel; Map's crooked copy rides right behind it. */
export const RIDE_BEAT_TEXT: Record<string, string> = {
  'priya-uptown':
    'Priya: "Rules of the road. Trains go two ways \u2014 uptown and downtown. Downtown is where everything new happens."',
  'priya-lines':
    'Priya draws two lines on the window with one swipe of her glove. "One goes under the river. One stays with the lights."',
  'map-copies':
    'Map copies her lines badly. She taps the crooked copy anyway: "See? You already can read it."',
  'announce':
    'The speaker crackles: "42nd Street\u2013Times Square." The doors open on a saxophone.',
};

/** The sync beat — Doc 02's wonder beat #1, word for word where it counts. */
export const TS_SYNC_NOTE =
  'The screens all turn at once \u2014 warm light, just for you. Times Square. 300,000 people cross here every day. Today, so did you.';

/** The Wow card's caption (docs/51 B10; Doc 08 §2 postcard 1 — the exact
 *  final-voice lines, fridge-tested). The paper still signs itself: the
 *  stamp block carries the cart name and day (capturePostcard's args),
 *  the caption is the square's own two lines. */
export function tsWowCaption(_s: { day: number; cartName: string }): string {
  return 'Times Square \u2014 300,000 people cross here every day.\nToday, so did you.';
}

// ------------------- Doc 08 §2 — the Day-1 moment cards -------------------
// Four more keepsakes the first day composes (P2 First Rush, P3 Water
// Towers, P4 The Fold, P5 Your Corner). REAL captures at their moments,
// filed straight to the album \u2014 no panel, no freeze, no story move: the
// first postcard (the square) stays the one that simply happens to you
// (Doc 02 design goal 5), and these are the paper the day leaves behind.
// Captions are Doc 08's exact lines, one wonder beat each.
export const MOMENT_RUSH_CAPTION =
  'Five orders. One apron that still smelled like mangoes.\nThe city let me keep up.';
export const MOMENT_TOWERS_CAPTION =
  'The buildings wear wooden hats.\nI don\u2019t know why yet. I like them.';
export const MOMENT_FOLD_CAPTION =
  'Folding it is part of the recipe.\nGrease on the napkin is proof you were here.';
export function momentCornerCaption(cartName: string): string {
  return `${cartName} \u2014 Day 1.\nIt was ugly. So was Rosa\u2019s, once. It\u2019s mine now.`;
}
/** The album shelf tag per moment card (the square's card says THE SQUARE). */
export const MOMENT_TAGS = {
  rush: 'THE RUSH',
  towers: 'THE HATS',
  fold: 'THE FOLD',
  corner: 'YOUR CORNER',
} as const;
export type MomentCardKind = keyof typeof MOMENT_TAGS;

export const BUSKER_LINES = [
  'The sax does the thing saxophones do to a tile room. You stay for the whole phrase.',
  'The busker nods at your tapping foot. "You got it, rookie. The city dances first, explains later."',
  'Same corner, new verse. He plays like the station asked him to.',
];
export const BUSKER_COIN_OFFER = 'Leave a dollar in the cup?';
export const BUSKER_COIN_BROKE = 'The cup gets a nod instead. The nod is accepted.';
export const BUSKER_COIN_NOTE =
  'The coin rings the cup. The sax doesn\u2019t stop, but the nod says heard.';

export const USHER_LINES = [
  'The usher takes the coffee, looks at you exactly like Rosa did. "First day? Come back when you\u2019re somebody. They all come back when they\u2019re somebody."',
  '"House opens at eight," the usher says. "The show\u2019s fine. The lobby\u2019s better."',
  '"You\u2019re back," the usher says, like a promise being kept. "Somebody\u2019s getting closer."',
];

export const DRIVER_LINES = [
  'The driver glances in the big mirror. "First time? Everybody\u2019s got a look. Like they\u2019re memorizin\u2019 it already. Don\u2019t worry \u2014 it\u2019ll still be there when you get off."',
  '"Ball game\u2019s on," the driver says, nodding at the radio. "Ninth inning. Nobody on this bus is going anywhere till it\u2019s over."',
  '"M121," the driver says. "Terminal to terminal. Same as everybody\u2019s story, if you think about it."',
];

export const DUFFEL_NOTE =
  'A duffel on the seat, packed the way you pack your first day. You leave it exactly where it is.';

// ---------------- the sketch — Map's own map of the neighborhood -----------
// docs/12 prototype 2, upgraded with the GDD's blessing: "Map is allowed to
// be wrong or messy. It copies the subway lines badly." Page 1 keeps its
// arrival line; the body below it is Map's pencil copy of the block —
// streets drawn from the start (badly), places added only when YOU walk to
// them, and the gold star is where you're standing when you open the fold.

export interface MapPlace {
  /** Stable id — persisted in the save's `map_places`. */
  id: string;
  /** The label in Map's handwriting, on the sketch. */
  label: string;
  /** World position of the spot (the reveal radius reads this). */
  x: number;
  z: number;
  /** The doodle that marks it: bus, store, globe, cart, slice, tree,
   *  pole, court, wash. */
  kind: 'bus' | 'store' | 'globe' | 'cart' | 'slice' | 'tree' | 'pole' | 'court' | 'wash';
  /** True when the first session guarantees you've stood there — the
   *  terminal you woke up on, the corner you work. Those marks exist the
   *  first time the fold opens; everything else is earned by walking. */
  born?: boolean;
  /** A fixed hand-wobble (degrees) so the copy is badly-drawn the SAME way
   *  every boot — determinism where the player can feel it. */
  tilt: number;
}

export const MAP_PLACES: readonly MapPlace[] = [
  { id: 'terminal', label: 'the terminal', x: -24.5, z: 7.4, kind: 'bus', born: true, tilt: -2.5 },
  { id: 'bodega', label: "Rosa's", x: -16, z: 9.4, kind: 'store', born: true, tilt: 1.8 },
  { id: 'globe', label: 'the globe', x: -42, z: 6.2, kind: 'globe', tilt: 3 },
  { id: 'cart', label: 'your corner', x: 4, z: -6.6, kind: 'cart', born: true, tilt: -1.5 },
  { id: 'laundry', label: 'the laundry', x: -2.25, z: 12.6, kind: 'wash', tilt: 2 },
  { id: 'slice', label: 'the slice shop', x: 25.85, z: 12.6, kind: 'slice', tilt: -2 },
  { id: 'park', label: 'the little park', x: 39.3, z: -6.15, kind: 'tree', tilt: 1.2 },
  { id: 'barber', label: 'the barbershop', x: 41.25, z: 12.6, kind: 'pole', tilt: -3 },
  { id: 'court', label: 'the court', x: 43.2, z: 3.6, kind: 'court', tilt: 2.4 },
] as const;

/** The walk band the sketch frames (world units): Kestrel street and the
 *  sidewalks you actually walk in the first session. */
export const SKETCH_BOUNDS = { xMin: -46, xMax: 48, zMin: -10, zMax: 16 } as const;

/** How close you must walk for Map to notice a place (meters). */
export const MAP_PLACE_NOTICE_R = 5;

/** M1 — beats as places (docs/architecture/05): the beat marker's caption
 *  on the Map's sketch. Rosa circles the story's spot and writes her one
 *  patient line beside it. Defer reads as handwriting on the fold, never
 *  as HUD pressure — the objective line stays the HUD's business. */
export const BEAT_READY_CAPTION = 'whenever you\u2019re ready';
