/**
 * All game text — verbatim from the reference implementation (greybox-godot/scripts/main.gd)
 * and the design docs (Doc 02 first-session walkthrough, Doc 08 Day 1 content pack,
 * Doc 22 Day 2). Text is content: it does not get paraphrased during a migration.
 */

import type { GameState } from './GameState';

/** Objective line per step (main.gd `_set_step`). */
export const OBJECTIVES: Record<number, string> = {
  0:  'Someone by the terminal is waving at you.',                       // MEET_ROSA
  1:  'Follow Rosa into the bodega with the warm window.',               // ENTER_BODEGA
  2:  'Rosa needs three things from the back shelf.',                    // COLLECT
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
  15: 'Fire escape at dusk. You know the way now.',                      // D2_CLIMB2
  16: '',                                                                // D2_POSTCARD
};

export const MAP_NOTE_BOOT = 'You are here. That\u2019s enough.'; // Doc 08 note #1

/** Postcard caption composer (main.gd `_compose_postcard`). */
export function composeCaption(s: {
  day: number; replay: boolean; dayStartMoney: number; money: number; cartName: string;
}): string {
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

/** Prompt verbs (main.gd `_update_prompt`). */
export function promptVerb(id: string, s: GameState): string {
  switch (id) {
    case 'rosa': return 'Say hi';
    case 'counter': return 'Serve';
    case 'idris': return 'Serve the usual';
    case 'stoop': return 'Deliver';
    case 'rail': return s.lingerStage <= 1 ? 'Stay a while' : 'Tomorrow';
    case 'cart':
      if (s.step === 5 /* CLAIM_CART */) return 'Claim corner';
      if (s.step === 7 /* SOLO */ || s.step === 14 /* D2_LUNCH */) return 'Serve';
      if (s.day >= 2 && !s.awningUp && s.money >= 15) return 'Awning \u2014 $15';
      return 'Serve';
    default: return 'Take'; // shelf items
  }
}

export const DEFAULT_CART_NAME = 'First Slice';
