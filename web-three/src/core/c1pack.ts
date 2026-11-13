/**
 * The C1 content pack — narrative/14 §7 step 8 (doc 06 §C1 against the
 * machine the C0 pack fed): **The Warm Line**, Sept 16 – Dec 23, Y1.
 *
 * What this module is: the season's authored layer — the station days the
 * player lives (the real shift, the quiet weeks, the garden, the dryer
 * bank, the nor'easter's four days, Craig's renegotiation, the December
 * notice), the season compressions that consume the calendar between them
 * (R4's named transition, consuming days — never real time), the two
 * structural choices the register has held since step 2 (N1a the promise
 * to Eddie, N1b the blackout role — core/choiceNodes.ts), and the two
 * Lost-Year fragments C1 owns (F1 the ice machine, F6 Crowne — doc 02
 * §6.2's register, fired as RECALL diary ink, never as a scene).
 *
 * The station law — the one architectural decision this pack states:
 * **story day = sim day = calendar day, and the compressions move all
 * three together** (sim/epochMap's 1:1 law holds by construction). The
 * days between stations are CONSUMED, not played: the linger's own door
 * (`next-day` with a target) jumps the counters in one motion, so the
 * dateline, the sim clock and the rails all land on the station's canon
 * date with no mapping and no drift. The season is sparse the way a
 * season is lived: nobody remembers the Tuesdays.
 *
 * The canon law (the c0pack precedent, restated): doc 06's quoted lines
 * are quoted VERBATIM (Eddie's ladder, Eddie's flour, Yoli's 1994, the
 * fragment register's rows); where doc 06 names a beat's content but not
 * its prose, the prose is written here in doc 13 §3's C1 voice ("length
 * 1.05, jokes 1.1" — Stage I maturing: "I'm here to become somebody"
 * starts sounding like a plan) and cited as written-to-spec. Nothing
 * canonical is paraphrased into fake quotes. Recontextualizations are
 * noted at their triggers (doc 11's header law: retained, not rewritten).
 *
 * What this module is NOT: no DOM, no UI, no scene, no dice, no clock
 * reads — the content seam's own law. Pure data + pure functions; the
 * Game layer applies; tests pin; `validateC1Pack` checks the pack
 * against its machines before a save can carry any drift.
 */

import { calendarDayOf, dateOfCalendarDay, type GameDate } from './calendar';
import type { FieldDiaryEntry } from './fieldDiary';
import type { LedgerEntry } from './consequenceLedger';
import { FRAGMENTS } from './guardrails';
import { nodeById, resolveChoice } from './choiceNodes';
import type { WeekOrder } from './c0pack';

// ===========================================================================
// 1. The season's spine — the station map (doc 06 §C1's events → days)
// ===========================================================================

/** C1's first playable morning: Monday, Sept 16, Year 1 — the real shift
 *  (doc 06 §C1 event 1; doc 11 §7's cut hands the player to this Monday).
 *  Derived from the calendar module — no hand arithmetic anywhere near
 *  the spine (the rails' own law). */
export const C1_FIRST_DAY = calendarDayOf({ y: 1, m: 9, d: 16 });

/** C1's last playable day: Dec 23, Year 1 (doc 06 §C1's period end). The
 *  linger here plays the C1→C2 season cut; the holidays stay C1's by the
 *  window law (core/chapters.ts), and C2's window opens Jan 6, Y2. */
export const C1_LAST_DAY = calendarDayOf({ y: 1, m: 12, d: 23 });

/** The cut's montage is dated New Year's Day, Y2 (doc 06 §C1 handoff:
 *  "The season cut lands on New Year's Day"). */
export const C1_CUT_MONTAGE_DAY = calendarDayOf({ y: 2, m: 1, d: 1 });

/** The chapter advance lands on C2's window start (the machine's own
 *  door — advanceChapter's window law; the cut consumes Dec 24 → Jan 6). */
export const C1_CUT_ADVANCE_DAY = calendarDayOf({ y: 2, m: 1, d: 6 });

/** The Yoli petition's 1994 anchor (doc 06 §C1 conversations) — cited by
 *  the QUESTION entries; the year the Compact's ghost begins. */
export const C1_PETITION_YEAR = 1994;

/** One playable station of C1's season. The fields are the stabilized
 *  loop's own mouths (begin/wake/queue/rushDone/climb/golden), keyed by
 *  calendar day — the WK_* steps are the loop; the station is the day's
 *  voice. `storm` marks the nor'easter's four days: the golden beat stays
 *  dark, the morning notes carry the weather (the diary is the
 *  instrument — no scene machinery, no new world geometry). */
export interface C1Station {
  day: number;
  title: string;
  begin: string;
  wake: string;
  queue: readonly WeekOrder[];
  rushDone: string;
  climbNote: string;
  goldenNote: string;
  storm?: boolean;
}

// ------------------------------------------------------------- day 8 ----

/** Doc 06 §C1 event 1, verbatim line — the Slice Ladder's first rung,
 *  named out loud; the keys motif begins. */
export const C1_LADDER_LINE =
  'Counter now. Maybe the register by spring. Don\u2019t ask me for the keys.';

/** Doc 06 §C1 starting circumstances — the first renewal notice, framed
 *  "like a threat". Eddie's echo at the frame (authored to spec; doc 11
 *  §4's C0 line "Paper's just paper till it isn't" is the fuse this
 *  scene lights). */
export const C1_NOTICE_FRAME_LINE =
  'Eddie: \u201CFramed it so I stop pretending I haven\u2019t read it.\u201D';

/** The real shift's queue (doc 06 §C1 event 1: full-time). Four orders —
 *  the week's three was a cart habit; a counter shift is longer. Idris
 *  opens, like every day (the day-3/4 law). Pays honest. */
const SHIFT_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CMonday. Real shift, they\u2019re saying. The tea tastes the same. That\u2019s how you\u2019ll know it\u2019s real.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The early shift: \u201CYou work here now here here. The cart was practice. This is the job.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, comic-timing everything: \u201CFull-time. Congratulations on the benefits. The benefits are the block.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 EXTRA HOT',
    pay: 3,
    reaction: 'The extra-hot, hands around the cup: \u201CSaw Eddie smiling this morning. Didn\u2019t know the man had a setting for it.\u201D',
  },
];

const DAY8: C1Station = {
  day: 8,
  title: 'The Real Shift',
  begin: 'Day 8. Monday. Six a.m. came anyway. The corner isn\u2019t an errand anymore \u2014 it\u2019s the job Eddie said it was. Facts only: I\u2019m the counter now.',
  wake: 'Rosa: \u201CFull-time.\u201D She looks at the shop, not the cart. \u201CEddie got more than a counter help. He got somebody who sweeps like it\u2019s his. Don\u2019t tell him I said the S-word.\u201D',
  queue: SHIFT_QUEUE,
  rushDone: 'Four orders. A counter shift runs longer than a cart morning \u2014 that\u2019s not a complaint, that\u2019s the rung.',
  climbNote: 'Same stairs, new math: the week paid for the seat, the season pays for the stairs. I\u2019m here to become somebody. Huh. Written down, it stops sounding like a joke.',
  goldenNote: 'Four windows, lit on a work night. The block can set its clock by this corner now. Let it.',
};

// ------------------------------------------------------------ day 29 ----

/** Doc 06 §C1 events 2/3/6 — the quiet weeks: the Halcyon DOB wall (June
 *  routed to Priya's knowledge — the phrase verbatim), the petition slip
 *  that replaces the lost-cat slip, and Kev's delivery lanyard (F6's
 *  trigger, doc 02 §6.2). Recontextualization note: doc 06 stages June at
 *  the build-out wall; the playable block hosts her at the plaza bench —
 *  the corner is where the block tells its news. */
export const C1_JUNE_WALL_NOTE =
  'June, dropping onto the bench with a roll of drawings: \u201CThe Halcyon build-out hit a DOB wall. The inspector\u2019s schedule is a rumor with a desk.\u201D';

export const C1_PRIYA_ROUTE_LINE =
  'Two things: inspections are a schedule, not a mystery. Priya\u2019s cab \u2014 the uptown local \u2014 tell her I sent you.';

export const C1_JUNE_REPLY_LINE =
  'June: \u201CYou know the DOB people by NAME?\u201D A pause with a spark in it. \u201COkay, fixer. I\u2019m keeping you.\u201D';

/** The petition slip (doc 06 §C1 event 6: the rezoning rumor's first
 *  physical form — the lost-cat slip replaced). */
export const C1_PETITION_NOTE =
  'The flyer board\u2019s lost-cat slip is gone. In its place: a petition, half a signature deep. REZONING \u2014 the word is doing a lot of work for a piece of paper.';

/** Kev's lanyard (F6's trigger) — recontextualized to the shop counter:
 *  the lanyard hangs by the register where Kev\u2019s weekend shift starts
 *  (doc 06 §C1: "Kev, hired weekend counter" — C0's short-term
 *  consequence, now his delivery week). */
export const C1_KEV_LANYARD_NOTE =
  'Kev\u2019s new delivery lanyard hangs by the register, badge flipped backward. He\u2019s proud of it in the way you\u2019re proud of a thing that\u2019s working you.';

const QUIET_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201COctober. The cart wears the season better than I do.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The early shift, nodding at the petition board across the way: \u201CThat paper\u2019s got people talking. Talking\u2019s free. So far.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 3,
    reaction: 'The large black: \u201CYou\u2019ve got a fall routine now. The block notices these things before the weather does.\u201D',
  },
];

const DAY29: C1Station = {
  day: 29,
  title: 'The Quiet Weeks',
  begin: 'Day 29. October. The three weeks between didn\u2019t disappear \u2014 they stacked. The corner runs on rails now. Today the block\u2019s small news wants me: June\u2019s wall, Kev\u2019s lanyard, a petition where the lost cat used to be.',
  wake: 'Rosa: \u201CJune\u2019s been circling the plaza with a tube of drawings all morning. Whatever it is, she\u2019s rehearsed it. Be nice \u2014 or be useful. One of the two.\u201D',
  queue: QUIET_QUEUE,
  rushDone: 'Three orders, the urn warm, October holding the light differently every hour. The afternoon\u2019s news is the block\u2019s own.',
  climbNote: 'The back streets from up here: the garden\u2019s fence, the Halcyon\u2019s plywood, the Works\u2019 new lock catching the low sun. The Map grows back streets the way a notebook grows margins.',
  goldenNote: 'Four windows, lit. Somewhere below, a petition has four signatures. Two ladders moving at once \u2014 his and mine. Only one of them is paper.',
};

// ------------------------------------------------------------ day 30 ----

/** Doc 06 §C1 event 3 — the garden: Yoli's freezer drive, "genuinely;
 *  she thanks him like an auditor." Recontextualized to the flyer board
 *  (the drive's paper lives there — the garden itself has no playable
 *  spot in the shipped block; the board is where the block's drives are
 *  posted, noted per the c0pack law). */
export const C1_YOLI_FREEZER_NOTE =
  'Yoli, taping the freezer drive\u2019s last flyer to the board, doesn\u2019t look up: \u201CTwelve frozen trays, three coolers, zero waste. You tape a flyer like you measure it first.\u201D A beat. \u201CThat\u2019s a thank-you. It\u2019s also an audit.\u201D';

/** Doc 06 §C1 diary developments — PERSON cards v1, Yoli's card verbatim
 *  ("the player's own later cringe is a feature"). */
export const C1_YOLI_CARD_LINE =
  'Yoli. Community agitator, probably never worked a real job. Runs the garden like a payroll. Tape measure in her coat like a sidearm.';

/** Doc 06 §C1 diary developments — PERSON card v1, June. */
export const C1_JUNE_CARD_LINE =
  'June. Halcyon\u2019s build-out, a tube of drawings, a laugh that files things. Professional friendship. With a spark. That\u2019s the whole note. That\u2019s all I\u2019m writing.';

const GARDEN_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe garden\u2019s doing a freezer drive. I gave two trays. Don\u2019t tell Yoli \u2014 she\u2019ll count them.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The early shift: \u201CSigned the petition this morning. First thing I\u2019ve signed since the lease.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 3,
    reaction: 'The large black, cup up: \u201CTo the freezer drive. Twelve trays. The block eats in a crisis, apparently. Good to know.\u201D',
  },
];

const DAY30: C1Station = {
  day: 30,
  title: 'The Garden & The Dryer Bank',
  begin: 'Day 30. The garden\u2019s freezer drive is this morning\u2019s good work, and the laundromat\u2019s dryer bank is tonight\u2019s \u2014 end of day, when the machines do the talking. Two errands. One of them isn\u2019t mine. We\u2019ll see which.',
  wake: 'Rosa: \u201CYoli\u2019s collecting for the freezer by the garden at noon. Bring muscle or tape. And Leo \u2014 come back before dark. You\u2019ve got that look when October gets long.\u201D',
  queue: GARDEN_QUEUE,
  rushDone: 'Three orders. The morning\u2019s for the corner; the afternoon is Yoli\u2019s; the evening is the laundromat\u2019s. A full day in three sentences.',
  climbNote: 'The stairs tonight feel like they\u2019re asking something. I don\u2019t have the answer. The notebook doesn\u2019t either \u2014 I checked.',
  goldenNote: 'Four windows, lit. The dryer bank hums two doors down, doing its job in the dark. Some machines are just machines. Tonight I\u2019m glad of the difference.',
};

// --------------------------------------------------------- days 51–54 ----

/** Doc 06 §C1 event 5 — the nor'easter, Oct 29–Nov 1: four days without
 *  power; Corner Slice becomes the block's warming station; "the
 *  K-Globes dark for the first time in anyone's memory." */
export const C1_STORM_ARRIVE_NOTE =
  'Day 51. The nor\u2019easter made landfall overnight and the sky\u2019s the color of wet concrete. By noon the block\u2019s power was gone. The shop\u2019s oven is gas. Eddie looked at me and said one word: \u201COpen.\u201D';

/** The warming station's law (authored to spec — doc 06 names the items:
 *  gas oven, candle tables, soup). */
export const C1_STORM_OPEN_NOTE =
  'The warming station, then: the gas oven doing the work of a power grid, candle tables down the aisle, the big pot of soup Eddie made before dawn. The K-Globes are dark for the first time in anyone\u2019s memory. The block came anyway. The block always comes anyway.';

/** Doc 06 §C1 important conversations — the blackout table (intention:
 *  "the block at its best, and Leo learning that being seen feels like a
 *  drug"). */
export const C1_BLACKOUT_TABLE_NOTE =
  'The blackout table, candle hour: Mr. Idris teaching dominoes to the kid, June trading jokes for soup, Sal from the laundry telling the storm like a commercial for his machines. They keep looking at me. Not the shop \u2014 me. Being seen, it turns out, feels like a drug. I\u2019m not going to write what kind.';

/** Doc 06 §C1 event 5's close — the K-Globes line, in his hand. */
export const C1_STORM_LAST_NOTE =
  'Day 54, the last dark day. The K-Globes have been dark four days \u2014 the first time in anyone\u2019s memory \u2014 and the block keeps coming to the candles. The lights aren\u2019t the shop. I wrote that down twice. It stays.';

function stormQueue(label: string, extra: string): readonly WeekOrder[] {
  return [
    {
      who: 'idris',
      bubble: 'SOUP \u00B7 ONE',
      pay: 2,
      reaction: 'Mr. Idris, cup in both hands: \u201CThe tea\u2019s cold and the soup\u2019s not. Priorities, muchacho.\u201D',
    },
    {
      who: 'rush',
      bubble: 'SOUP \u00B7 TWO',
      pay: 3,
      reaction: label,
    },
    {
      who: 'rush',
      bubble: 'COFFEE \u00B7 THE LAST OF IT',
      pay: 3,
      reaction: extra,
    },
  ];
}

const STORM_QUEUE_51 = stormQueue(
  'One of the candle-table regulars: \u201CYou\u2019re cooking on gas with the lights out. This is the most New York thing I\u2019ve ever eaten next to.\u201D',
  'The last of the coffee, handed over like contraband: \u201CHot. In THIS? You\u2019re a magician or a fool.\u201D',
);
const STORM_QUEUE_52 = stormQueue(
  'A neighbor wrapped in two coats: \u201CSoup\u2019s a verb today. You souped the whole block.\u201D',
  'She holds the cup like a heat source, which it is: \u201CFour days from now this is a story. Tonight it\u2019s soup. Both are good.\u201D',
);
const STORM_QUEUE_53 = stormQueue(
  'The kid\u2019s mother, candle-lit: \u201CHe asked if the shop sleeps. I said no. He said good. That\u2019s the review.\u201D',
  'The last of the coffee, day three: \u201CIce cubes in it. Still the best thing on Kestrel. Don\u2019t tell the soup.\u201D',
);
const STORM_QUEUE_54 = stormQueue(
  'Mr. Idris, last soup of the storm: \u201CFour days. Most people don\u2019t last four hours. You fed a block for four days.\u201D',
  'The storm\u2019s last cup: \u201CWhen the lights come back, the corner stays. That\u2019s the deal the dark made.\u201D',
);

const DAY51: C1Station = {
  day: 51,
  title: 'The Nor\u2019easter I',
  begin: C1_STORM_ARRIVE_NOTE,
  wake: 'Rosa, in a coat she clearly slept in: \u201CNo power on my street either. Eddie\u2019s oven is gas, my coffee is not, and you \u2014 you\u2019re about to be very popular. Open the rush. The block\u2019s coming.\u201D',
  queue: STORM_QUEUE_51,
  rushDone: 'The soup holds, the candles hold, the corner holds. The afternoon is for the room: more candles, more seats, more of whatever this is that the block does when the sky breaks.',
  climbNote: 'The stairs, by candlelight, holding a candle. The city is a wind sound. The corner is a lit square. Tonight that\u2019s the whole map.',
  goldenNote: 'The windows stay dark \u2014 the storm owns the glass. The light tonight is candles, and the candles are winning.',
  storm: true,
};
const DAY52: C1Station = {
  day: 52,
  title: 'The Nor\u2019easter II',
  begin: 'Day 52. The storm\u2019s middle day. The warming station has a rhythm now \u2014 soup at noon, candles at dusk, dominoes by eight. What it doesn\u2019t have is a role for me that isn\u2019t all of them at once. Eddie says I have to pick. Eddie\u2019s enjoying this.',
  wake: 'Rosa: \u201CSecond night of this. The block\u2019s calling the shop THE warming station \u2014 capital T, capital S. Pick your role before the room picks it for you. That\u2019s not advice. That\u2019s Rosa.\u201D',
  queue: STORM_QUEUE_52,
  rushDone: 'The pot\u2019s a third full and the room\u2019s a third louder. The afternoon asks its question in soup and candles.',
  climbNote: 'Up the stairs with a candle, the storm pressing the glass. The role I picked sits fine. Being seen sits like a stove \u2014 warm, and you don\u2019t move wrong near it.',
  goldenNote: 'Dark windows, candle tables, the room doing its best impression of a hearth. The K-Globes don\u2019t need power. They need the block. The block showed.',
  storm: true,
};
const DAY53: C1Station = {
  day: 53,
  title: 'The Nor\u2019easter III',
  begin: 'Day 53. The storm\u2019s third day. The block has stopped asking when the power comes back and started asking what\u2019s in the pot. That trade \u2014 from when to what \u2014 is the whole miracle. I\u2019m serving it one bowl at a time.',
  wake: 'Rosa, holding her own candle: \u201CMy block\u2019s dark, your block\u2019s lit. I\u2019m not jealous, I\u2019m strategic. The corner\u2019s the block\u2019s public face this week. Stand up straight.\u201D',
  queue: STORM_QUEUE_53,
  rushDone: 'The soup line goes out the door and comes back with gossip. The afternoon is candle maintenance and the quiet pride of a working pot.',
  climbNote: 'The stairs again. Three days of being the room\u2019s center of gravity. The notebook says: carefull. The notebook is tired. I fixed the typo by leaving it.',
  goldenNote: 'Third dark night. The candles have a system now \u2014 table by table, like the windows used to light. The block learned the shop by candlelight. That\u2019s going to matter.',
  storm: true,
};
const DAY54: C1Station = {
  day: 54,
  title: 'The Nor\u2019easter IV',
  begin: C1_STORM_LAST_NOTE,
  wake: 'Rosa: \u201CLast dark day, they\u2019re saying. The power\u2019s coming back and the story\u2019s staying. You fed a block, Leo. Blocks remember meals longer than blackouts.\u201D',
  queue: STORM_QUEUE_54,
  rushDone: 'The last soup of the storm, the last candles, the room one last time. Tomorrow the lights come back. The block will still be here.',
  climbNote: 'The stairs, the candle, the last dark hour. Four days the block saw me. I keep reaching for a joke and finding a plan instead. Growth, probably. Don\u2019t tell Rosa.',
  goldenNote: 'The windows stay dark one last night on purpose \u2014 Eddie\u2019s call: \u201CLet \u2019em see we don\u2019t need it.\u201D The candles agree.',
  storm: true,
};

// ------------------------------------------------------------ day 95 ----

/** Doc 06 §C1 event 7 — Craig's "renegotiation" visit: charm, apology, a
 *  number with a 7 in it, walked back. The scene at the counter (the
 *  antagonist as mirror — "broke, charming, certain"). */
export const C1_CRAIG_SCENE: readonly string[] = [
  'Craig, in a coat newer than his shoes, at the counter with two coffees he didn\u2019t pay for: \u201CLeo. The block\u2019s favorite son. Eddie.\u201D A nod that includes the whole shop. \u201CI\u2019ve been doing some numbers on this stretch, and honestly? My guy made a mistake. That notice \u2014 the framing, very funny, by the way \u2014 the number\u2019s wrong. It\u2019s more like seven-something. Per month. I know, I know.\u201D',
  'He apologizes like a man handing you change. \u201CI\u2019ll walk it back. Consider it walked. This block \u2014\u201D he means the room, the candles\u2019 afterimage, the four windows \u2014 \u201Cthis block matters to me.\u201D Then he\u2019s gone, and the number with the 7 in it stays, sitting on the counter like a debt.',
];

/** Doc 06 §C1 diary developments — PERSON card v1, Craig. */
export const C1_CRAIG_CARD_LINE =
  'Craig. Broke the way certain men are broke \u2014 loudly, charmingly, on purpose. Certain the way weather is certain. Scared of something I can\u2019t see yet. The coat was new. The shoes weren\u2019t. You can audit a man by his shoes.';

/** Doc 06 §C1 important conversations — Rosa's cigar box (intention: "the
 *  block's real economy is memory"). */
export const C1_CIGAR_BOX_SCENE =
  'Rosa, sliding the cigar box across the counter \u2014 IOUs in three inks, a button, a photograph curled with age: \u201CTwenty-two years. This box is the real ledger of this block. What people remember, what they owe, what they\u2019ll never ask me for again.\u201D She taps it once. \u201CCraig\u2019s people have spreadsheets. We have this. We\u2019ll see which one outlives the other.\u201D';

/** Doc 06 §C1 important conversations — Yoli on the Compact's history,
 *  verbatim, with the doc's own staging note. */
export const C1_YOLI_1994_LINE =
  'Last time this block trusted a petition, my uncle was holding the pen.';

export const C1_YOLI_1994_NOTE =
  `Yoli, petitions in her fist, saying it lightly \u2014 it is not light: \u201C${C1_YOLI_1994_LINE}\u201D`;

/** Doc 06 §C1 diary developments — QUESTION entries, verbatim questions. */
export const C1_Q_CRAIG = 'Who is Craig scared of?';
export const C1_Q_FENCE = 'Why does the Works fence have a new lock?';

const DECEMBER_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe suit with the new coat came by. I served him last. Some orders you rate.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The early shift: \u201CHeard the landlord walked back the number. Walked it back like a man who\u2019ll un-walk it in January. December\u2019s just January with tinsel.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 3,
    reaction: 'The large black: \u201CHoliday hours. The corner in a wreath. The block\u2019s trying to be cozy before the paperwork.\u201D',
  },
];

const DAY95: C1Station = {
  day: 95,
  title: 'The Renegotiation',
  begin: 'Day 95. December. The candles are a memory with a shelf in the shop now, and the man who owns half the block\u2019s paper just walked in wearing a coat I\u2019ll be billing him for in my head all day. Charm, apology, a number with a 7 in it. Then Rosa\u2019s cigar box, and whatever Yoli\u2019s petition has grown into.',
  wake: 'Rosa: \u201CCraig\u2019s holding court at his own coffee like it\u2019s a ribbon-cutting. Let him talk. Then come see me \u2014 there\u2019s a box you should look at before you answer anybody anything.\u201D',
  queue: DECEMBER_QUEUE,
  rushDone: 'Three orders, the counter wiped, the visit replaying in my head like a receipt I didn\u2019t ask for. The afternoon\u2019s for the block\u2019s own paper trail: the cigar box, the petition, the fence.',
  climbNote: 'The stairs, December edition. A man with a spreadsheet wants this corner to be a number with a 7 in it. The block has a cigar box that says otherwise. Place your bets.',
  goldenNote: 'Four windows, lit against the early dark. Above them, mine. Below them, a box of IOUs worth more than the notice framed on the wall. The block\u2019s economy is memory. I\u2019m learning to bank.',
};

// ------------------------------------------------------------ day 106 ----

/** Doc 06 §C1 event 8 — the December notice WITHOUT the walk-back. */
export const C1_NOTICE_SECOND_LINE =
  'Eddie: \u201CNo walk-back this time. You read it. I watched you read it.\u201D';

/** Doc 06 §C1 event 8, verbatim — the flour line. */
export const C1_FLOUR_LINE = 'Promises are flour. Show me bread.';

/** The promise pick's prompt (doc 06 §C1 major decisions — the promise:
 *  how far Leo goes to "handle" it; N1a, core/choiceNodes.ts). */
export const C1_N1A_PROMPT =
  'Eddie is waiting for an answer he already heard twice. How far does the promise go this time?';

/** Doc 06 §C1 event 1's the-promise ledger due — the renewal window
 *  opens with C2 (doc 06 §C2's formal ask). The exact date is
 *  written-to-spec: Feb 1, Y2, deterministic, cited. */
export const C1_PROMISE_DUE: Readonly<GameDate> = { y: 2, m: 2, d: 1 };
export const C1_PROMISE_DUE_DAY = calendarDayOf(C1_PROMISE_DUE);

const PROMISE_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CDecembertide. The tea\u2019s the same. The block isn\u2019t. Grow slow, muchacho.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The early shift: \u201CNew notice behind the counter. Saw it framed. Saw your face. Take the long view, kid \u2014 the block\u2019s worth it.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 3,
    reaction: 'The large black, nodding at the framed paper: \u201CHoliday season. Time of year a man promises things. Show \u2019em bread, they say. Good advice in any economy.\u201D',
  },
];

const DAY106: C1Station = {
  day: 106,
  title: 'Promises Are Flour',
  begin: 'Day 106. December 23. The last shopping day of the year, and the notice is back \u2014 the real one this time, no walk-back, no charm, a frame that already has a spot picked out next to the first one. Eddie taped the corner before I even saw it. He does that when he\u2019s done being surprised.',
  wake: 'Rosa: \u201CSecond notice. I saw Eddie\u2019s face and I saw yours, and only one of you gets to decide what happens next. Careful what you promise a man who frames things.\u201D',
  queue: PROMISE_QUEUE,
  rushDone: 'Three orders, and the whole time the framed paper watching from the wall like it has a lap to check. The afternoon is for the answer.',
  climbNote: 'The stairs, year-end edition. I promised Eddie I\u2019d handle the landlord. I wrote it here first, which means the notebook gets to hold me to it. Great. Witnesses everywhere.',
  goldenNote: 'Four windows, lit for the last night of the year. The notice in its frame, the flour line in my ears. This year I learned the corner. Next year I learn what it costs. Bread, then.',
};

/** The station table — C1's playable days, keyed by calendar day. The
 *  keys ARE the doc 06 §C1 arc (validated below). */
export const C1_STATIONS: Readonly<Record<number, C1Station>> = Object.freeze({
  8: DAY8,
  29: DAY29,
  30: DAY30,
  51: DAY51,
  52: DAY52,
  53: DAY53,
  54: DAY54,
  95: DAY95,
  106: DAY106,
});

/** The station days, in order — beginDay and the linger machine read
 *  this (data, not scattered conditionals). */
export const C1_STATION_DAYS: readonly number[] = Object.freeze(
  Object.keys(C1_STATIONS).map(Number).sort((a, b) => a - b),
);

export function c1StationOf(day: number): C1Station | undefined {
  return C1_STATIONS[day];
}

// ------------------------------------------------------ the postcards ----

/** One station's postcard caption (the shipped capture pipeline's own
 *  mouth, the season's voice — the postcard says its own DATE, because
 *  in C1 the dates are the story). */
export interface C1Caption {
  date: string;
  body: string;
  replay: string;
}

/** The season's captions, keyed by calendar day (the stations). Authored
 *  in doc 13 §3's C1 voice; the dates ride the calendar module's own
 *  rendering (no hand formatting). */
const C1_CAPTIONS: Readonly<Record<number, C1Caption>> = Object.freeze({
  8: {
    date: 'September 16',
    body: 'The real shift. The counter, the ladder\u2019s first rung, the keys staying exactly where they are.',
    replay: 'The real shift, again. The rung holds.',
  },
  29: {
    date: 'October 7',
    body: 'The quiet weeks. June\u2019s wall, a petition where the lost cat used to be, Kev\u2019s lanyard by the register.',
    replay: 'The quiet weeks, again. The paper stays pinned.',
  },
  30: {
    date: 'October 8',
    body: 'The garden\u2019s freezer drive by daylight, the dryer bank after dark. Some errands are mine. One wasn\u2019t.',
    replay: 'Same day, different light. The dryers still hum.',
  },
  51: {
    date: 'October 29',
    body: 'The storm\u2019s first day. Gas oven, candle tables, soup. The K-Globes went dark and the block came anyway.',
    replay: 'The storm, again. The candles remember how.',
  },
  52: {
    date: 'October 30',
    body: 'Day two of the dark. I picked a role and the room let me keep it.',
    replay: 'The dark, again. The role still fits.',
  },
  53: {
    date: 'October 31',
    body: 'Day three. The block stopped asking when the lights come back and started asking what\u2019s in the pot.',
    replay: 'Day three, again. The pot\u2019s answer holds.',
  },
  54: {
    date: 'November 1',
    body: 'The last dark day. Four days the block saw me. The lights aren\u2019t the shop \u2014 I checked, twice, in ink.',
    replay: 'The last dark day, again. The dark kept its deal.',
  },
  95: {
    date: 'December 12',
    body: 'Craig brought a number with a 7 in it and left it sitting on the counter. Rosa\u2019s cigar box outlives it.',
    replay: 'The visit, again. The number still sits there.',
  },
  106: {
    date: 'December 23',
    body: 'The second notice, no walk-back. Promises are flour. This year I learned the corner.',
    replay: 'The year\u2019s last card. The flour line holds.',
  },
});

/** The station's caption (the composeCaption seam — content.ts calls
 *  this before its C0 branches, the same precedence the stations
 *  themselves ride). */
export function c1CaptionOf(day: number): C1Caption | undefined {
  return C1_CAPTIONS[day];
}

// ===========================================================================
// 2. The season compressions — R4's named transition, consuming days
// ===========================================================================

/** One compression: the linger plays its two lines and the NEXT press
 *  rolls the counters `from → to` through the next-day door (the 1:1 law
 *  moves whole). `seasonCut` marks a compression that crosses a season
 *  boundary (crossedSeasonCut proves it — the autumn→winter cut). */
export interface C1Compression {
  from: number;
  to: number;
  intro: string;
  city: string;
  seasonCut?: boolean;
}

/** The four compressions (the gaps between stations). Compositions are
 *  authored in doc 13 §3's C1 voice; the city lines follow the C0 cut's
 *  pattern (the city says one thing, flat, and it lands). */
export const C1_COMPRESSIONS: readonly C1Compression[] = Object.freeze([
  {
    from: 8,
    to: 29,
    intro: 'The next three weeks pass the way a routine does \u2014 unnoticed, and then load-bearing. The cart keeps its hours, the counter keeps its shift, and the notebook keeps finding new margins.',
    city: 'The corner kept its hours. The block started keeping his.',
  },
  {
    from: 30,
    to: 51,
    intro: 'The quiet weeks harden into habit: the freezer drive empties, the petition fills a clipboard, Kev\u2019s lanyard stops being new. All the while the sky over Kestrel has been lowering, one grey shelf at a time.',
    city: 'The sky went grey-green over Kestrel and stayed. The block looked up. The corner looked back.',
  },
  {
    from: 54,
    to: 95,
    seasonCut: true,
    intro: 'The four dark days became the story the block tells \u2014 the warming station, the candles, the pot that didn\u2019t stop. Power came back on the second of November and nobody thanked it. The weeks since have been December pretending to be ordinary.',
    city: 'The corner fed the block through the dark. The city noticed, once, the morning after, and moved on.',
  },
  {
    from: 95,
    to: 106,
    intro: 'The walked-back number walked itself back into place. The petition grew pages. December shortened the days and lengthened the paperwork, and the frame on Eddie\u2019s wall has been holding space for a second notice like a set table.',
    city: 'December shortened the days and lengthened the leases. Kestrel kept count anyway.',
  },
]);

export function c1CompressionFrom(day: number): C1Compression | undefined {
  return C1_COMPRESSIONS.find((c) => c.from === day);
}

/** The linger machine's answer for a C1 day: 'next' = the ordinary
 *  tomorrow; a compression = the montage-then-roll; 'cut' = the season's
 *  last linger (the New Year's cut). Null for any day that isn't C1's —
 *  the machine above owns those. */
export function c1RailFor(day: number): 'next' | 'cut' | { compress: number } | null {
  if (!Number.isInteger(day) || day < C1_FIRST_DAY || day > C1_LAST_DAY) return null;
  if (day === C1_LAST_DAY) return 'cut';
  const comp = c1CompressionFrom(day);
  if (comp) return { compress: comp.to };
  return 'next';
}

// ===========================================================================
// 3. The C1→C2 season cut — the first chapter close (doc 06 §C1 handoff)
// ===========================================================================

/** The cut's diary latch (the block layer's law: the latch IS the
 *  entry; the cut plays once per save). */
export const C1_CUT_ID = 'c1-cut-newyear';

/** Doc 06 §C1 handoff, staged: the notice framed, Eddie taping the
 *  frame's corner (the staging line is written-to-spec; the facts are
 *  the doc's). */
export const C1_CUT_NOTICE_STAGE =
  'The notice goes back into its frame. Eddie tapes the corner where the glass never sat flush, and doesn\u2019t say anything, which from Eddie is a paragraph.';

/** Doc 06 §C1 handoff, verbatim — the over-tag. */
export const C1_CUT_OVER_TAG = 'this is the year I fix it';

/** The cut's wall (authored, doc 13 voice): the season kept; what the
 *  new year brings is the next wave's content — the hold says so in the
 *  world's own voice, never in project-speak. */
export const C1_CUT_WALL =
  'New Year\u2019s Day, the block sleeps in. The notice in its frame says what it says. Some promises are flour. This year, bread.';

/** The cut's marker entry — the latch, carrying the over-tag (the FACT
 *  tag IS the over-tag, the mishear's own mechanic; doc 06: "an
 *  over-tag if there ever was one"). Dated New Year's Day, Y2. */
export function c1CutEntry(): FieldDiaryEntry {
  return {
    id: C1_CUT_ID,
    kind: 'OBSERVATION',
    date: dateOfCalendarDay(C1_CUT_MONTAGE_DAY),
    epistemic: 'FACT',
    body: `New Year\u2019s Day. The notice is framed, the glass is taped, Eddie\u2019s corner-tape is straighter than the year feels. ${C1_CUT_OVER_TAG}.`,
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

// ===========================================================================
// 4. The Lost Year's C1 fragments — F1 and F6 (doc 02 §6.2, as RECALL ink)
// ===========================================================================

/** The pack's fragment ids (namespaced; the entry id is the latch). */
export const C1_FRAGMENT_IDS = {
  f1: 'c1-f1-dryer-bank',
  f6: 'c1-f6-lanyard',
} as const;

function fragmentRow(id: 'F1' | 'F6') {
  const row = FRAGMENTS.find((f) => f.id === id);
  if (!row) throw new Error(`c1pack: fragment ${id} missing from the register`);
  return row;
}

/** F1 — doc 06 §C1 event 4: "F1 fires (Sunrise Laundry, the dryer bank,
 *  end of day — doc 02 §6.2); three short entries; he tells no one."
 *  The register row's three sensory clauses become three RECALL entries,
 *  one line each, the wobble style (the C0 wobble's own vehicle). The
 *  words are the register's verbatim; only the punctuation is the
 *  diary's. */
export function f1Entries(calendarDay: number): FieldDiaryEntry[] {
  const row = fragmentRow('F1');
  const lines = row.content.split(';').map((s) => s.trim());
  return lines.map((line, i) => ({
    id: `${C1_FRAGMENT_IDS.f1}-${i + 1}`,
    kind: 'RECALL' as const,
    date: dateOfCalendarDay(calendarDay),
    epistemic: 'RECALL' as const,
    body: `${line.charAt(0).toUpperCase()}${line.slice(1)}.`,
    links: ['laundry'],
    visibility: 'private' as const,
    corrections: [],
  }));
}

/** F6 — same week (doc 06 §C1 event 4): Kev's delivery lanyard. One
 *  RECALL entry; the register row's content, the wobble style. */
export function f6Entry(calendarDay: number): FieldDiaryEntry {
  const row = fragmentRow('F6');
  const body = row.content
    .split(';')
    .map((s) => s.trim())
    .map((s) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`)
    .join('. ');
  return {
    id: C1_FRAGMENT_IDS.f6,
    kind: 'RECALL',
    date: dateOfCalendarDay(calendarDay),
    epistemic: 'RECALL',
    body: `${body}.`,
    links: ['corner-slice'],
    visibility: 'private',
    corrections: [],
  };
}

// ===========================================================================
// 5. The diary ink — the season's PERSON cards, EVIDENCE, QUESTIONs, TALKs
// ===========================================================================

/** The pack's entry ids (namespaced c1-*; the id is the latch). */
export const C1_IDS = {
  ladder: 'c1-e1-ladder',
  notice1: 'c1-h1-notice-evidence',
  notice2: 'c1-e8-notice-evidence',
  petition: 'c1-e6-petition',
  june: 'c1-p-june',
  yoli: 'c1-p-yoli',
  craig: 'c1-p-craig',
  qCraig: 'c1-q-craig-scared',
  qFence: 'c1-q-fence-lock',
  cigarBox: 'c1-t-cigar-box',
  blackoutTable: 'c1-t-blackout-table',
} as const;

function entry(
  id: string,
  kind: FieldDiaryEntry['kind'],
  day: number,
  epistemic: FieldDiaryEntry['epistemic'],
  body: string,
  links: string[] = [],
): FieldDiaryEntry {
  return {
    id,
    kind,
    date: dateOfCalendarDay(day),
    epistemic,
    body,
    links,
    visibility: 'private',
    corrections: [],
  };
}

/** Event 1's diary line — the ladder rung, Eddie's words verbatim in the
 *  entry (the keys motif begins). */
export function ladderEntry(day: number): FieldDiaryEntry {
  return entry(
    C1_IDS.ladder, 'EVENT', day, 'FACT',
    `Eddie named the first rung out loud this morning, like he was reading it off a ladder only he can see: \u201C${C1_LADDER_LINE}\u201D The keys stay his. Noted. Rung one is real.`,
    ['corner-slice'],
  );
}

/** The framed notice's EVIDENCE (doc 06 §C1 diary developments: "EVIDENCE:
 *  the renewal notice photographed"). Wave 1 = the framing day (day 8);
 *  wave 2 = the notice without the walk-back (day 106). */
export function noticeEvidenceEntry(day: number, wave: 1 | 2): FieldDiaryEntry {
  const body = wave === 1
    ? 'The renewal notice, framed. Photographed it when Eddie wasn\u2019t looking, which is a sentence I\u2019d have laughed at in September. The paper is ordinary. The frame is not. Framed paper is a promise somebody else made.'
    : 'The second notice, photographed next to the first. No walk-back, no charm, no Craig in a good coat \u2014 just the number with the 7 in it, in print, where charm can\u2019t reach. Two frames now. Eddie taped the corner of both.';
  return entry(
    wave === 1 ? C1_IDS.notice1 : C1_IDS.notice2, 'EVIDENCE', day, 'FACT', body,
    ['corner-slice'],
  );
}

/** Event 6's diary line — the petition's first physical form. */
export function petitionEntry(day: number): FieldDiaryEntry {
  return entry(
    C1_IDS.petition, 'EVENT', day, 'FACT',
    'The lost-cat slip is gone off the flyer board. A petition took its spot \u2014 rezoning, half a signature deep. The cat got found or the block found something bigger to look for. I know which one I\u2019d bet the cart on.',
    ['flyer-board'],
  );
}

/** PERSON card v1 — June (doc 06 §C1: "a professional friendship with a
 *  spark"). */
export function juneEntry(day: number): FieldDiaryEntry {
  return entry(C1_IDS.june, 'PERSON', day, 'FACT', C1_JUNE_CARD_LINE, ['halcyon']);
}

/** PERSON card v1 — Yoli, the dismissive card verbatim. */
export function yoliEntry(day: number): FieldDiaryEntry {
  return entry(C1_IDS.yoli, 'PERSON', day, 'FACT', C1_YOLI_CARD_LINE, ['flyer-board']);
}

/** PERSON card v1 — Craig. */
export function craigEntry(day: number): FieldDiaryEntry {
  return entry(C1_IDS.craig, 'PERSON', day, 'FACT', C1_CRAIG_CARD_LINE, ['corner-slice']);
}

/** The QUESTION entries — doc 06 §C1's two, verbatim, in his hand. */
export function questionCraigEntry(day: number): FieldDiaryEntry {
  return entry(
    C1_IDS.qCraig, 'QUESTION', day, 'GUESS',
    `${C1_Q_CRAIG} The coat was new. The shoes weren\u2019t. Somebody is squeezing HIM. Write that down and leave it where the notebook can\u2019t answer it.`,
    ['notebook'],
  );
}

export function questionFenceEntry(day: number): FieldDiaryEntry {
  return entry(
    C1_IDS.qFence, 'QUESTION', day, 'GUESS',
    `${C1_Q_FENCE} Still new brass, still no answer. Petitions make people maintain things. Or scare them into it.`,
    ['notebook'],
  );
}

/** The cigar box TALK (day 95). */
export function cigarBoxEntry(day: number): FieldDiaryEntry {
  return entry(
    C1_IDS.cigarBox, 'TALK', day, 'FACT',
    `${C1_CIGAR_BOX_SCENE} I looked at the box a long time. The block's real economy is memory. I have a notebook. Maybe that makes me a bank.`,
    ['rosas-deli'],
  );
}

/** The blackout table TALK (day 52). */
export function blackoutTableEntry(day: number): FieldDiaryEntry {
  return entry(
    C1_IDS.blackoutTable, 'TALK', day, 'FACT',
    `${C1_BLACKOUT_TABLE_NOTE} The soup helped. The being seen helped more, and I don\u2019t know what to do with that sentence yet.`,
    ['corner-slice'],
  );
}

// ===========================================================================
// 6. The structural choices — N1a and N1b, fired through the register
// ===========================================================================

/** The pick packs — the NotebookPrompt overlay's content for the two C1
 *  nodes. Option ids are the REGISTER's (resolveChoice consumes them);
 *  labels and blurbs are the overlay's in-world voice (doc 10 §3's
 *  labels are the register's own). */
export interface C1ChoicePack {
  nodeId: 'N1a' | 'N1b';
  prompt: string;
  options: readonly { optionId: string; label: string; blurb: string }[];
}

export const C1_N1A_PACK: C1ChoicePack = {
  nodeId: 'N1a',
  prompt: C1_N1A_PROMPT,
  options: Object.freeze([
    {
      optionId: 'honest-odds',
      label: 'Tell Eddie the odds straight',
      blurb: 'No shine, no swagger. The real arithmetic, out loud, to the man who framed it. It costs a little hope. It buys the truth.',
    },
    {
      optionId: 'quiet-research',
      label: 'Research it quiet',
      blurb: 'The records, the comp sales, the paperwork nobody reads until it\u2019s load-bearing. Handle it by knowing first.',
    },
    {
      optionId: 'direct-approach',
      label: 'Walk into Craig\u2019s office',
      blurb: 'The direct approach. The number with the 7 in it, met with a person instead of a petition. Bold is a kind of bread.',
    },
  ]),
};

export const C1_N1B_PACK: C1ChoicePack = {
  nodeId: 'N1b',
  prompt: 'The warming station needs a role before the night needs a hero. What does Leo take?',
  options: Object.freeze([
    {
      optionId: 'cook',
      label: 'Take the pot',
      blurb: 'The gas oven, the soup, the line that never empties. The role you can measure in bowls.',
    },
    {
      optionId: 'run-the-room',
      label: 'Run the room',
      blurb: 'Candle tables, dominoes, the seating chart of a block that\u2019s cold and staying. The role you can measure in nights that hold.',
    },
    {
      optionId: 'hide-and-rest',
      label: 'Hide and rest',
      blurb: 'The stairs, the dark, the notebook. Even the corner\u2019s face is a man who needs a wall sometimes. The block won\u2019t starve for one night of you.',
    },
  ]),
};

export function c1ChoicePackOf(nodeId: string): C1ChoicePack | undefined {
  if (nodeId === 'N1a') return C1_N1A_PACK;
  if (nodeId === 'N1b') return C1_N1B_PACK;
  return undefined;
}

/** What one taken option WRITES — the resolve machine's output, dressed
 *  for the seam: the flags ride the world's flag store (the pivot first),
 *  the ledger drafts are complete entries (id, date, weight, node — the
 *  machinery the register leaves to content), the diary lands the pick
 *  in his hand, the note is the room's reaction. */
export interface C1PickApply {
  ok: boolean;
  reason?: 'bad-node' | 'bad-option' | 'locked';
  flags: string[];
  ledger: LedgerEntry[];
  diary: FieldDiaryEntry | null;
  note: string | null;
}

/** The option's diary entry, in his hand (doc 13 §3 C1 voice). One per
 *  option — the pick is remembered in ink, not in a flag. */
const N1A_DIARY: Readonly<Record<string, string>> = Object.freeze({
  'honest-odds': 'I told Eddie the odds straight. The real arithmetic, out loud, no shine. He listened the way he bakes \u2014 without rushing \u2014 and said, \u201CSo it\u2019s hard. Say that part first next time.\u201D First rung of a different ladder.',
  'quiet-research': 'I started the quiet research. Comp sales, records, the paperwork nobody reads until it\u2019s load-bearing. The notebook has a new section and the section has a tab system. Don\u2019t judge me. Knowledge is the first bread.',
  'direct-approach': 'I\u2019m taking it to Craig\u2019s office. The direct approach. The number with the 7 in it, met in person. Somewhere a ladder only I can see has a rung made of nerve. I\u2019m putting my foot on it.',
});

const N1B_DIARY: Readonly<Record<string, string>> = Object.freeze({
  'cook': 'I took the pot. Soup is the role you can measure in bowls, and the bowls didn\u2019t stop. The block saw the steam before it saw me. That\u2019s the right order.',
  'run-the-room': 'I ran the room. Candles, tables, dominoes, the seating chart of a cold night. The room held because somebody kept score of the small things. Tonight that somebody was me.',
  'hide-and-rest': 'I hid and I rested. Up the stairs, lights out, the storm doing the loud part. The block didn\u2019t starve for one night of me. Writing that down without a joke attached. Growth.',
});

/** The room's reaction line, per option (spoken once, never stored). */
const N1A_NOTE: Readonly<Record<string, string>> = Object.freeze({
  'honest-odds': 'Eddie: \u201CHard\u2019s a flavor. I\u2019ve baked with worse.\u201D',
  'quiet-research': 'Eddie: \u201CKnowing first. That\u2019s the whole trade, kid. Nobody teaches it \u2014 you did.\u201D',
  'direct-approach': 'Eddie: \u201CCraig\u2019s office. In person.\u201D He almost smiles. \u201CFlour\u2019s rising.\u201D',
});

const N1B_NOTE: Readonly<Record<string, string>> = Object.freeze({
  'cook': 'Eddie hands over the ladle like a tool, not a trophy. \u201CPot\u2019s yours. Don\u2019t burn the block\u2019s dinner.\u201D',
  'run-the-room': 'Eddie: \u201CThe room\u2019s yours. You were running it since yesterday \u2014 now it\u2019s official.\u201D',
  'hide-and-rest': 'Eddie looks at him a second longer than needed. \u201CStairs are that way. The pot won\u2019t miss you. Might.\u201D',
});

/** The promise's weight (the register leaves coin to content): the
 *  second promise to Eddie weighs 2 — heavier than a choice's 1, lighter
 *  than the fall it feeds. Written-to-spec (doc 10 §1's "smaller coin,
 *  same currency"). */
const C1_PROMISE_WEIGHT = 2;
const C1_CHOICE_WEIGHT = 1;

/** Resolve one pick through the register's own machine and dress the
 *  writes. Pure; the caller applies (logLedgerEntry, logDiaryEntry,
 *  setStoryFlags). Refused picks change nothing. */
export function applyC1Pick(nodeId: 'N1a' | 'N1b', optionId: string, calendarDay: number): C1PickApply {
  const node = nodeById(nodeId);
  if (!node) return { ok: false, reason: 'bad-node', flags: [], ledger: [], diary: null, note: null };
  const res = resolveChoice(node, optionId);
  if (!res.ok || !res.flagWrites || !res.ledgerWrites) {
    return { ok: false, reason: res.reason === 'locked' ? 'locked' : 'bad-option', flags: [], ledger: [], diary: null, note: null };
  }
  const date = dateOfCalendarDay(calendarDay);
  const isPromise = nodeId === 'N1a';
  const ledger: LedgerEntry[] = res.ledgerWrites.map((w, i) => ({
    id: `led-${nodeId}-${optionId}-${i + 1}`,
    kind: w.kind,
    date,
    refs: [...w.refs],
    weight: isPromise ? C1_PROMISE_WEIGHT : C1_CHOICE_WEIGHT,
    visibility: w.visibility,
    ...(isPromise ? { due: { ...C1_PROMISE_DUE } } : {}),
    node: nodeId,
  }));
  const diaries = isPromise ? N1A_DIARY : N1B_DIARY;
  const notes = isPromise ? N1A_NOTE : N1B_NOTE;
  const body = diaries[optionId];
  const note = notes[optionId] ?? null;
  const diary: FieldDiaryEntry | null = body
    ? {
        id: `c1-${nodeId.toLowerCase()}-${optionId}`,
        kind: isPromise ? 'EVENT' : 'OBSERVATION',
        date,
        node: nodeId,
        epistemic: 'FACT',
        body,
        links: ['notebook'],
        visibility: 'private',
        corrections: [],
      }
    : null;
  return { ok: true, flags: [...res.flagWrites], ledger, diary, note };
}

// ===========================================================================
// 7. The pack's self-check — the no-dead-content law, checked once
// ===========================================================================

export interface C1PackReport {
  ok: boolean;
  problems: string[];
}

/** The pack checks itself against the machines it feeds: the station
 *  keys are exactly the season's canon days (each landing on its doc 06
 *  date through the calendar module); every compression's `to` is a
 *  station; every queue opens with Idris and pays honest; the canon
 *  lines are verbatim; the fragments' rows match the register; every
 *  choice option resolves with a unique signature; and no authored prose
 *  carries a real-world date (the R4 law — the year 1994 is canon, doc
 *  06's own citation, and is the ONE number this pack is allowed to
 *  quote as a year). */
export function validateC1Pack(): C1PackReport {
  const problems: string[] = [];
  // the stations: the exact keys, each on its canon date
  const expectedKeys = C1_STATION_DAYS.join(',');
  if (expectedKeys !== '8,29,30,51,52,53,54,95,106') {
    problems.push(`station keys are ${expectedKeys} (law: 8,29,30,51,52,53,54,95,106)`);
  }
  const canonDates: Readonly<Record<number, GameDate>> = {
    8: { y: 1, m: 9, d: 16 },
    29: { y: 1, m: 10, d: 7 },
    30: { y: 1, m: 10, d: 8 },
    51: { y: 1, m: 10, d: 29 },
    52: { y: 1, m: 10, d: 30 },
    53: { y: 1, m: 10, d: 31 },
    54: { y: 1, m: 11, d: 1 },
    95: { y: 1, m: 12, d: 12 },
    106: { y: 1, m: 12, d: 23 },
  };
  for (const day of C1_STATION_DAYS) {
    if (calendarDayOf(canonDates[day]!) !== day) {
      problems.push(`station ${day} does not land on its canon date through the calendar module`);
    }
  }
  // the compressions: from a station, to a station, ordered, the cuts marked
  for (const c of C1_COMPRESSIONS) {
    if (!C1_STATIONS[c.from]) problems.push(`compression from ${c.from} is not a station`);
    if (!C1_STATIONS[c.to]) problems.push(`compression to ${c.to} is not a station`);
    if (c.to <= c.from) problems.push(`compression ${c.from}\u2192${c.to} does not move forward`);
    if (c.seasonCut && !(c.from === 54 && c.to === 95)) {
      problems.push(`the season-cut flag belongs to 54\u219295 only (autumn\u2192winter)`);
    }
  }
  // the queues: Idris opens, honest pays, soup on the storm days
  for (const day of C1_STATION_DAYS) {
    const st = C1_STATIONS[day]!;
    if (st.queue.length < 2) problems.push(`station ${day}: a queue this thin is not a rush`);
    if (st.queue[0]!.who !== 'idris') problems.push(`station ${day}: the rush opens without Idris (the day-3/4 law)`);
    for (const o of st.queue) {
      if (o.pay < 1) problems.push(`station ${day}: an order pays nothing (the honest-pays law)`);
      if (o.bubble.length === 0 || o.reaction.length === 0) {
        problems.push(`station ${day}: an order is missing its voice`);
      }
    }
    if (st.storm && !st.queue.every((o) => o.bubble.startsWith('SOUP') || o.bubble.startsWith('COFFEE'))) {
      problems.push(`station ${day}: a storm day's queue must be soup-shaped`);
    }
    if (st.begin.length === 0 || st.wake.length === 0 || st.rushDone.length === 0
      || st.climbNote.length === 0 || st.goldenNote.length === 0) {
      problems.push(`station ${day}: a station is missing one of its five mouths`);
    }
  }
  // the canon lines, verbatim (doc 06 §C1)
  if (C1_LADDER_LINE !== 'Counter now. Maybe the register by spring. Don\u2019t ask me for the keys.') {
    problems.push('C1_LADDER_LINE drifted from doc 06 §C1 event 1 (verbatim law)');
  }
  if (C1_FLOUR_LINE !== 'Promises are flour. Show me bread.') {
    problems.push('C1_FLOUR_LINE drifted from doc 06 §C1 event 8 (verbatim law)');
  }
  if (C1_YOLI_1994_LINE !== 'Last time this block trusted a petition, my uncle was holding the pen.') {
    problems.push('C1_YOLI_1994_LINE drifted from doc 06 §C1 conversations (verbatim law)');
  }
  if (C1_CUT_OVER_TAG !== 'this is the year I fix it') {
    problems.push('C1_CUT_OVER_TAG drifted from doc 06 §C1 handoff (verbatim law)');
  }
  if (C1_Q_CRAIG !== 'Who is Craig scared of?' || C1_Q_FENCE !== 'Why does the Works fence have a new lock?') {
    problems.push('the C1 QUESTION lines drifted from doc 06 §C1 diary developments (verbatim law)');
  }
  if (!C1_YOLI_CARD_LINE.includes('Community agitator, probably never worked a real job')) {
    problems.push('Yoli\u2019s PERSON card drifted from doc 06 §C1 diary developments (verbatim law)');
  }
  // the fragments: the pack reads the register (one source), the rows are C1's
  try {
    const f1 = fragmentRow('F1');
    if (f1.chapter !== 'C1' || f1.trigger !== 'Sunrise Laundry\u2019s dryer bank, end of day') {
      problems.push('F1\u2019s register row is not C1\u2019s dryer bank');
    }
    const f6 = fragmentRow('F6');
    if (f6.chapter !== 'C1' || f6.trigger !== 'Kev\u2019s delivery-job lanyard') {
      problems.push('F6\u2019s register row is not Kev\u2019s lanyard');
    }
    const f1Drafts = f1Entries(8);
    if (f1Drafts.length !== 3) problems.push('F1 must render three short entries (doc 06 §C1 event 4)');
    for (const d of f1Drafts) {
      if (d.kind !== 'RECALL' || d.epistemic !== 'RECALL') {
        problems.push(`F1 entry ${d.id} is not the wobble style (RECALL kind AND tag)`);
      }
    }
    const f6Draft = f6Entry(29);
    if (f6Draft.kind !== 'RECALL' || f6Draft.epistemic !== 'RECALL') {
      problems.push('F6\u2019s entry is not the wobble style');
    }
  } catch (e) {
    problems.push(`the fragment register read failed: ${(e as Error).message}`);
  }
  // the picks: every option resolves; signatures pairwise unique; the
  // promise's due is deterministic and cites C2's window
  for (const pack of [C1_N1A_PACK, C1_N1B_PACK]) {
    const node = nodeById(pack.nodeId);
    if (!node) {
      problems.push(`${pack.nodeId}: not in the register`);
      continue;
    }
    const sigs = new Set<string>();
    for (const o of pack.options) {
      const res = resolveChoice(node, o.optionId);
      if (!res.ok || !res.flagWrites) {
        problems.push(`${pack.nodeId}/${o.optionId}: does not resolve`);
        continue;
      }
      const sig = res.flagWrites.join(',');
      if (sigs.has(sig)) problems.push(`${pack.nodeId}/${o.optionId}: reuses a flag signature`);
      sigs.add(sig);
      const apply = applyC1Pick(pack.nodeId, o.optionId, 8);
      if (!apply.ok) problems.push(`${pack.nodeId}/${o.optionId}: does not apply`);
      if (!apply.diary) problems.push(`${pack.nodeId}/${o.optionId}: the pick writes no diary ink`);
      // every C1 register option posts exactly one ledger act (neither
      // node uses the Silent class — both diverge by their write)
      if (apply.ledger.length !== 1) {
        problems.push(`${pack.nodeId}/${o.optionId}: unexpected ledger count`);
      }
      if (nodeIdIsPromise(pack.nodeId) && !apply.ledger[0]?.due) {
        problems.push(`${pack.nodeId}/${o.optionId}: the promise carries no due date`);
      }
    }
  }
  if (C1_PROMISE_DUE_DAY !== calendarDayOf({ y: 2, m: 2, d: 1 })) {
    problems.push('the promise\u2019s due date drifted from Feb 1, Y2 (written-to-spec cite)');
  }
  // the R4 law: no real-world years in the prose (1994 is canon's own
  // citation — doc 06 §C1 quotes it; it is the ONE allowed year and the
  // scan excludes it deliberately)
  const prose = [
    ...C1_STATION_DAYS.map((d) => [C1_STATIONS[d]!.begin, C1_STATIONS[d]!.wake, C1_STATIONS[d]!.rushDone, C1_STATIONS[d]!.climbNote, C1_STATIONS[d]!.goldenNote]).flat(),
    ...C1_COMPRESSIONS.map((c) => [c.intro, c.city]).flat(),
    C1_STORM_ARRIVE_NOTE, C1_STORM_OPEN_NOTE, C1_BLACKOUT_TABLE_NOTE, C1_STORM_LAST_NOTE,
    C1_CRAIG_SCENE.join(' '), C1_CIGAR_BOX_SCENE, C1_YOLI_1994_NOTE,
    C1_JUNE_WALL_NOTE, C1_PRIYA_ROUTE_LINE, C1_JUNE_REPLY_LINE,
    C1_PETITION_NOTE, C1_KEV_LANYARD_NOTE, C1_YOLI_FREEZER_NOTE,
    C1_YOLI_CARD_LINE, C1_JUNE_CARD_LINE, C1_CRAIG_CARD_LINE,
    C1_NOTICE_FRAME_LINE, C1_NOTICE_SECOND_LINE, C1_CUT_NOTICE_STAGE,
    C1_CUT_WALL, ...C1_N1A_PACK.options.map((o) => o.blurb),
    ...C1_N1B_PACK.options.map((o) => o.blurb),
    ...Object.values(N1A_DIARY), ...Object.values(N1B_DIARY),
  ].join(' ');
  for (const match of prose.matchAll(/\b(1[89]\d\d|20\d\d)\b/g)) {
    if (match[0] !== String(C1_PETITION_YEAR)) {
      problems.push(`a real-world year leaked into the prose: ${match[0]}`);
    }
  }
  // the cut: the latch entry carries the over-tag verbatim
  const cut = c1CutEntry();
  if (!cut.body.includes(C1_CUT_OVER_TAG)) problems.push('the cut\u2019s entry lost the over-tag');
  if (cut.date.y !== 2 || cut.date.m !== 1 || cut.date.d !== 1) {
    problems.push('the cut\u2019s entry is not dated New Year\u2019s Day, Y2');
  }
  return { ok: problems.length === 0, problems };
}

function nodeIdIsPromise(nodeId: string): boolean {
  return nodeId === 'N1a';
}
